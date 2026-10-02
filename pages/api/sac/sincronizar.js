// pages/api/sac/sincronizar.js
// Compara los expedientes del SAC con los que ya existen en LexHub
// (por Número de expediente = Numero_SAC, que es único) y agrega en la
// hoja "Actuaciones" solo los movimientos que todavía no estaban.
//
// Optimizado para no pasarse del límite de tiempo de las funciones de
// Vercel: lee la hoja "Actuaciones" UNA sola vez, pide los movimientos de
// todos los expedientes en paralelo, y hace UNA sola escritura final con
// todas las filas nuevas (en vez de una llamada a Sheets por cada
// movimiento, que es lo que hacía que esto tardara demasiado).

import {
  loginSAC,
  obtenerExpedientesConNovedades,
  obtenerOperaciones,
  obtenerTextoOperacion,
  limpiarHtmlOperacion,
  resolverCredencialesSAC,
} from '../../../lib/sac';
import { readSheet, appendToSheet } from '../../../lib/googleSheets';

export const config = { maxDuration: 60 };

// Cada movimiento se guarda con un marcador [SAC:idOperacion] al inicio del
// contenido. Así sabemos, en la próxima sincronización, cuáles ya están
// cargados sin necesitar una columna nueva en la hoja.
function marcarContenido(idOperacion, texto) {
  return `[SAC:${idOperacion}] ${texto}`;
}

function extraerIdOperacion(contenido) {
  const m = /^\[SAC:([^\]]+)\]/.exec(contenido || '');
  return m ? m[1] : null;
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

    // 1) Expedientes con novedades recientes, según el SAC, y expedientes
    //    ya cargados en LexHub, en paralelo (son fuentes independientes).
    const [{ expedientes: expedientesSAC, diagnostico: diagExp }, filasClientes, filasActuaciones] =
      await Promise.all([
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

    // Encabezados reales de la hoja Actuaciones (por si cambia el orden).
    const headersAct = filasActuaciones[0] || [];
    const idxNumeroSAC = headersAct.indexOf('Numero_SAC');
    const idxContenido = headersAct.indexOf('Contenido');
    const idxID = headersAct.indexOf('ID');

    let maxId = 0;
    const idsExistentesPorExpediente = new Map(); // numeroSAC -> Set(idOperacion)
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

    // 3) Traer los movimientos de todos los expedientes coincidentes en
    //    paralelo (no uno por uno) para no acumular tiempos de espera.
    const operacionesPorExpediente = await Promise.all(
      coincidencias.map((exp) => obtenerOperaciones(login.cookieJar, exp.idExpediente)),
    );

    // Armamos, por cada expediente, la lista de movimientos realmente
    // nuevos (los que no están todavía en Actuaciones).
    const porExpediente = coincidencias.map((exp, i) => {
      const numeroSAC = String(exp.numeroExpediente).trim();
      const operaciones = operacionesPorExpediente[i].operaciones;
      const idsExistentes = idsExistentesPorExpediente.get(numeroSAC) || new Set();
      const nuevas = operaciones.filter((op) => !idsExistentes.has(op.idOperacion));
      return { exp, numeroSAC, operaciones, nuevas };
    });

    // Traemos el TEXTO REAL de todos los movimientos nuevos (de todos los
    // expedientes), en paralelo, con un límite prudente para no saturar al
    // SAC ni pasarnos del tiempo máximo de la función.
    const LIMITE_TEXTOS_PARALELOS = 25;
    const todasLasNuevas = porExpediente.flatMap((p) => p.nuevas.map((op) => ({ numeroSAC: p.numeroSAC, op })));
    const aBuscar = todasLasNuevas.slice(0, LIMITE_TEXTOS_PARALELOS);
    const textos = await Promise.all(
      aBuscar.map(({ op }) =>
        obtenerTextoOperacion(login.cookieJar, op.idOperacion).catch(() => ({ contenido: '' })),
      ),
    );
    const textoPorIdOperacion = new Map();
    aBuscar.forEach(({ op }, i) => {
      textoPorIdOperacion.set(op.idOperacion, limpiarHtmlOperacion(textos[i].contenido));
    });

    const filasNuevas = [];
    const resultados = [];
    let siguienteId = maxId + 1;

    for (const { exp, numeroSAC, operaciones, nuevas } of porExpediente) {
      for (const op of nuevas) {
        const textoReal = textoPorIdOperacion.get(op.idOperacion);
        let cuerpo;
        if (textoReal) {
          cuerpo = textoReal;
        } else {
          // No se pudo traer el texto (superó el límite en paralelo, o el
          // SAC no devolvió nada): guardamos al menos estos datos.
          const detalles = [];
          if (op.estado) detalles.push(`Estado: ${op.estado}`);
          if (op.ubicacion) detalles.push(`Ubicación: ${op.ubicacion}`);
          if (op.presentadoPor) detalles.push(`Presentado por: ${op.presentadoPor}`);
          if (op.firmada) detalles.push('Firmada');
          if (op.adjunto) detalles.push('Tiene documento adjunto');
          cuerpo = detalles.length > 0 ? detalles.join('\n') : '(sin detalle disponible)';
        }
        const contenido = marcarContenido(op.idOperacion, cuerpo);
        filasNuevas.push([
          String(siguienteId++),
          numeroSAC,
          op.fecha || '',
          op.tipoOperacion || 'Movimiento SAC',
          'SAC',
          contenido,
          'NO', // presentado
          'NO', // enviado
          'NO', // tienePDF
          '', // idPDFDrive
          'NO', // esBorrador
          'Sync SAC', // creadoPor
          '', // compartidoCon
        ]);
      }

      resultados.push({
        numeroSAC,
        caratula: locales.get(numeroSAC).caratula || exp.caratula,
        totalOperacionesSAC: operaciones.length,
        movimientosNuevos: nuevas.length,
      });
    }

    if (filasNuevas.length > 0) {
      await appendToSheet('Actuaciones', filasNuevas);
    }

    return res.status(200).json({
      success: true,
      mensaje: `Se revisaron ${coincidencias.length} expediente(s) que coinciden con LexHub. Se agregaron ${filasNuevas.length} movimiento(s) nuevo(s).`,
      totalExpedientesSAC: expedientesSAC.length,
      totalCoincidencias: coincidencias.length,
      resultados,
      diagnosticoListaSAC: diagExp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
}
