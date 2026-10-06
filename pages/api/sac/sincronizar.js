// pages/api/sac/sincronizar.js
// Compara los expedientes del SAC con los que ya existen en LexHub (por
// Número de expediente = Numero_SAC) y agrega a "Actuaciones" los
// movimientos nuevos que tengan texto real (se descartan los que no
// trajeron texto: son operaciones administrativas sin contenido útil).
// Si hay datos de notificación (cédulas), se incluyen en el contenido.

import {
  loginSAC,
  obtenerExpedientesConNovedades,
  obtenerOperaciones,
  obtenerTextoDeOperacion,
  obtenerMasDatosOperacion,
  limpiarHtmlOperacion,
  resolverCredencialesSAC,
} from '../../../lib/sac';
import { readSheet, appendToSheet, actualizarCeldas } from '../../../lib/googleSheets';

export const config = { maxDuration: 60 };

function marcarContenido(idOperacion, texto) {
  return `[SAC:${idOperacion}] ${texto}`;
}

// Los escritos (presentados por una parte) guardan "Presentado por: NOMBRE"
// al comienzo del texto; sirve para saber de quién es cada uno. Los decretos,
// autos y demás emitidos por el juzgado no llevan esa línea.
function lineaPresentante(op) {
  if (!op?.esEscrito) return '';
  const nombre = String(op.presentadoPor || '').replace(/^\s*presentado por:\s*/i, '').trim();
  return nombre ? `Presentado por: ${nombre}\n` : '';
}

function letraColumna(indice) {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function extraerIdOperacion(contenido) {
  const m = /^\[SAC:([^\]]+)\]/.exec(contenido || '');
  return m ? m[1] : null;
}

function formatearNotificacion(masDatos) {
  const cedulas = masDatos?.datos?.detalleOperacion?.listadoCedulas || [];
  if (cedulas.length === 0) return '';
  const lineas = cedulas.map((c) => {
    const otros = c.otrosDestinatarios ? ` · también: ${c.otrosDestinatarios}` : '';
    return `${c.nombre || ''} (${c.rol || ''}) — ${c.fecha || ''}${otros}`;
  });
  return `\n\nNotificado a:\n${lineas.join('\n')}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña, error: errorCred } = await resolverCredencialesSAC(req.body);
  if (errorCred) {
    return res.status(200).json({ success: false, mensaje: errorCred });
  }

  try {
    const login = await loginSAC(usuario, contraseña);
    if (!login.exito) {
      return res.status(200).json({
        success: false,
        mensaje:
          'No se pudo iniciar sesión en el SAC. Puede que Cloudflare haya pedido el captcha esta vez (no siempre lo pide).',
        diagnostico: login.diagnostico,
      });
    }

    // 1) Expedientes con novedades recientes, expedientes ya cargados en
    //    LexHub, y Actuaciones ya guardadas, en paralelo.
    const [{ expedientes: expedientesSAC }, filasClientes, filasActuaciones] = await Promise.all([
      obtenerExpedientesConNovedades(login.cookieJar),
      readSheet('Clientes_y_Expedientes'),
      readSheet('Actuaciones'),
    ]);

    const locales = new Map(); // numeroSAC -> { caratula }
    for (let i = 1; i < filasClientes.length; i++) {
      const numeroSAC = filasClientes[i][5]; // columna F
      if (numeroSAC) {
        locales.set(String(numeroSAC).trim(), { caratula: filasClientes[i][6] || '' });
      }
    }

    const headersAct = filasActuaciones[0] || [];
    const idxNumeroSAC = headersAct.indexOf('Numero_SAC');
    const idxContenido = headersAct.indexOf('Contenido');
    const idxID = headersAct.indexOf('ID');

    let maxId = 0;
    const idsExistentesPorExpediente = new Map();
    for (let i = 1; i < filasActuaciones.length; i++) {
      const fila = filasActuaciones[i];
      const idNum = parseInt(fila[idxID], 10);
      if (!Number.isNaN(idNum) && idNum > maxId) maxId = idNum;

      const numeroSAC = String(fila[idxNumeroSAC] || '').trim();
      const idOp = extraerIdOperacion(fila[idxContenido]);
      if (numeroSAC && idOp) {
        if (!idsExistentesPorExpediente.has(numeroSAC)) idsExistentesPorExpediente.set(numeroSAC, new Set());
        idsExistentesPorExpediente.get(numeroSAC).add(idOp);
      }
    }

    // 2) Solo expedientes que YA existen en LexHub.
    const coincidencias = expedientesSAC.filter((e) => locales.has(String(e.numeroExpediente).trim()));

    // 3) Movimientos de cada expediente coincidente, en paralelo.
    const operacionesPorExpediente = await Promise.all(
      coincidencias.map((exp) => obtenerOperaciones(login.cookieJar, exp.idExpediente)),
    );

    const porExpediente = coincidencias.map((exp, i) => {
      const numeroSAC = String(exp.numeroExpediente).trim();
      const operaciones = operacionesPorExpediente[i].operaciones;
      const idsExistentes = idsExistentesPorExpediente.get(numeroSAC) || new Set();
      const nuevas = operaciones.filter((op) => !idsExistentes.has(op.idOperacion));
      return { exp, numeroSAC, operaciones, nuevas };
    });

    // 4) Texto real y datos de notificación de cada movimiento nuevo, en
    //    paralelo, con un límite prudente.
    const LIMITE_PARALELO = 30;
    const todasLasNuevas = porExpediente.flatMap((p) => p.nuevas.map((op) => ({ numeroSAC: p.numeroSAC, op })));
    const aBuscar = todasLasNuevas.slice(0, LIMITE_PARALELO);
    const idExpedientePorNumero = new Map(coincidencias.map((e) => [String(e.numeroExpediente).trim(), e.idExpediente]));

    const [textos, masDatosLista] = await Promise.all([
      Promise.all(aBuscar.map(({ op }) => obtenerTextoDeOperacion(login.cookieJar, op).catch(() => ({ contenido: '' })))),
      Promise.all(
        aBuscar.map(({ numeroSAC, op }) =>
          obtenerMasDatosOperacion(login.cookieJar, idExpedientePorNumero.get(numeroSAC), op.idOperacion, op.esEscrito).catch(
            () => ({ datos: null }),
          ),
        ),
      ),
    ]);

    const textoPorIdOperacion = new Map();
    const masDatosPorIdOperacion = new Map();
    aBuscar.forEach(({ op }, i) => {
      textoPorIdOperacion.set(op.idOperacion, limpiarHtmlOperacion(textos[i].contenido));
      masDatosPorIdOperacion.set(op.idOperacion, masDatosLista[i]);
    });

    // 5) Solo nos quedamos con los movimientos que SÍ tienen texto real.
    //    Los que no (operaciones administrativas sin contenido) se
    //    descartan: no aportan nada y no hace falta elegir uno por uno.
    const filasNuevas = [];
    const agregados = [];
    const omitidosSinTexto = { total: 0, porExpediente: {} };
    let siguienteId = maxId + 1;
    let noRevisados = 0; // superaron el límite en paralelo, quedan para la próxima corrida

    for (const { exp, numeroSAC, nuevas } of porExpediente) {
      for (const op of nuevas) {
        if (!textoPorIdOperacion.has(op.idOperacion)) {
          noRevisados++;
          continue; // no llegamos a pedir su texto esta vez, queda para la próxima
        }
        const textoReal = textoPorIdOperacion.get(op.idOperacion);
        if (!textoReal) {
          omitidosSinTexto.total++;
          omitidosSinTexto.porExpediente[numeroSAC] = (omitidosSinTexto.porExpediente[numeroSAC] || 0) + 1;
          continue;
        }

        const notificacion = formatearNotificacion(masDatosPorIdOperacion.get(op.idOperacion));
        const contenido = marcarContenido(op.idOperacion, lineaPresentante(op) + textoReal + notificacion);

        filasNuevas.push([
          String(siguienteId++),
          numeroSAC,
          op.fecha || '',
          op.tipoOperacion || 'Movimiento SAC',
          'SAC',
          contenido,
          'NO',
          'NO',
          'NO',
          '',
          'NO',
          'Sync SAC',
          '',
        ]);

        agregados.push({
          numeroSAC,
          caratula: locales.get(numeroSAC).caratula || exp.caratula,
          tipoOperacion: op.tipoOperacion || 'Movimiento SAC',
          fecha: op.fecha || '',
          resumen: textoReal.slice(0, 180) + (textoReal.length > 180 ? '...' : ''),
        });
      }
    }

    // 6) Completar "Presentado por" en escritos que ya estaban cargados sin esa línea.
    const opPorId = new Map();
    porExpediente.forEach((p) => p.operaciones.forEach((op) => opPorId.set(op.idOperacion, op)));
    const actualizaciones = [];
    for (let i = 1; i < filasActuaciones.length; i++) {
      const contenidoActual = filasActuaciones[i][idxContenido] || '';
      const idOp = extraerIdOperacion(contenidoActual);
      const op = idOp ? opPorId.get(idOp) : null;
      if (!op) continue;
      const linea = lineaPresentante(op);
      if (!linea) continue;
      const resto = contenidoActual.replace(/^\[SAC:[^\]]+\]\s*/, '');
      if (/^\s*presentado por:/i.test(resto)) continue;
      actualizaciones.push({
        rango: `Actuaciones!${letraColumna(idxContenido)}${i + 1}`,
        valor: marcarContenido(idOp, linea + resto),
      });
    }
    const presentantesCompletados = (await actualizarCeldas(actualizaciones)) ? actualizaciones.length : 0;

    if (filasNuevas.length > 0) {
      await appendToSheet('Actuaciones', filasNuevas);
    }

    const partesMensaje = [`Se agregaron ${filasNuevas.length} movimiento(s) nuevo(s) a LexHub.`];
    if (presentantesCompletados > 0) {
      partesMensaje.push(`Se completó quién presentó en ${presentantesCompletados} escrito(s) ya cargados.`);
    }
    if (omitidosSinTexto.total > 0) {
      partesMensaje.push(`${omitidosSinTexto.total} se omitieron por no tener texto (operaciones administrativas).`);
    }
    if (noRevisados > 0) {
      partesMensaje.push(`${noRevisados} quedaron sin revisar por el límite de esta corrida — volvé a sincronizar para completarlos.`);
    }

    return res.status(200).json({
      success: true,
      mensaje: partesMensaje.join(' '),
      totalExpedientesSAC: expedientesSAC.length,
      totalCoincidencias: coincidencias.length,
      agregados,
      omitidosSinTexto,
      noRevisados,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
}
