// pages/api/sac/sincronizar.js
// PREVISUALIZACIÓN: compara los expedientes del SAC con los que ya existen
// en LexHub (por Número de expediente = Numero_SAC) y devuelve los
// movimientos nuevos para que la persona elija cuáles agregar. NO escribe
// nada en Sheets — eso lo hace /api/sac/confirmar-movimientos con lo que
// el usuario seleccione.

import {
  loginSAC,
  obtenerExpedientesConNovedades,
  obtenerOperaciones,
  obtenerTextoDeOperacion,
  limpiarHtmlOperacion,
  resolverCredencialesSAC,
} from '../../../lib/sac';
import { readSheet } from '../../../lib/googleSheets';

export const config = { maxDuration: 60 };

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

    const idsExistentesPorExpediente = new Map(); // numeroSAC -> Set(idOperacion)
    for (let i = 1; i < filasActuaciones.length; i++) {
      const fila = filasActuaciones[i];
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

    const porExpediente = coincidencias.map((exp, i) => {
      const numeroSAC = String(exp.numeroExpediente).trim();
      const operaciones = operacionesPorExpediente[i].operaciones;
      const idsExistentes = idsExistentesPorExpediente.get(numeroSAC) || new Set();
      const nuevas = operaciones.filter((op) => !idsExistentes.has(op.idOperacion));
      return { exp, numeroSAC, operaciones, nuevas };
    });

    // Traemos el TEXTO REAL de todos los movimientos nuevos, en paralelo,
    // con un límite prudente para no saturar al SAC ni pasarnos del tiempo
    // máximo de la función.
    const LIMITE_TEXTOS_PARALELOS = 25;
    const todasLasNuevas = porExpediente.flatMap((p) => p.nuevas.map((op) => ({ numeroSAC: p.numeroSAC, op })));
    const aBuscar = todasLasNuevas.slice(0, LIMITE_TEXTOS_PARALELOS);
    const textos = await Promise.all(
      aBuscar.map(({ op }) => obtenerTextoDeOperacion(login.cookieJar, op).catch(() => ({ contenido: '' }))),
    );
    const textoPorIdOperacion = new Map();
    aBuscar.forEach(({ op }, i) => {
      textoPorIdOperacion.set(op.idOperacion, limpiarHtmlOperacion(textos[i].contenido));
    });

    // Armamos la lista de candidatos (sin escribir nada todavía).
    const candidatos = [];
    const resultados = [];

    for (const { exp, numeroSAC, operaciones, nuevas } of porExpediente) {
      for (const op of nuevas) {
        const textoReal = textoPorIdOperacion.get(op.idOperacion);
        let contenido;
        if (textoReal) {
          contenido = textoReal;
        } else {
          const detalles = [];
          if (op.estado) detalles.push(`Estado: ${op.estado}`);
          if (op.ubicacion) detalles.push(`Ubicación: ${op.ubicacion}`);
          if (op.presentadoPor) detalles.push(`Presentado por: ${op.presentadoPor}`);
          if (op.firmada) detalles.push('Firmada');
          if (op.adjunto) detalles.push('Tiene documento adjunto');
          contenido = detalles.length > 0 ? detalles.join('\n') : '(sin detalle disponible)';
        }

        candidatos.push({
          clave: `${numeroSAC}::${op.idOperacion}`,
          numeroSAC,
          caratula: locales.get(numeroSAC).caratula || exp.caratula,
          idOperacion: op.idOperacion,
          fecha: op.fecha || '',
          tipoOperacion: op.tipoOperacion || 'Movimiento SAC',
          contenido,
          tieneTextoReal: !!textoReal,
        });
      }

      resultados.push({
        numeroSAC,
        caratula: locales.get(numeroSAC).caratula || exp.caratula,
        totalOperacionesSAC: operaciones.length,
        movimientosNuevos: nuevas.length,
      });
    }

    return res.status(200).json({
      success: true,
      mensaje: `Se revisaron ${coincidencias.length} expediente(s) que coinciden con LexHub. Hay ${candidatos.length} movimiento(s) nuevo(s) para revisar.`,
      totalExpedientesSAC: expedientesSAC.length,
      totalCoincidencias: coincidencias.length,
      resultados,
      candidatos,
      diagnosticoListaSAC: diagExp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
}
