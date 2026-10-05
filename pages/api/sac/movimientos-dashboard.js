// pages/api/sac/movimientos-dashboard.js
// Para la tarjeta del dashboard: movimientos de hasta 3 días de
// antigüedad, SOLO de expedientes que ya existen en LexHub. No escribe
// nada — es de solo lectura, pensado para consultarse cada vez que se
// entra al dashboard.

import { loginSAC, obtenerExpedientesConNovedades, obtenerOperaciones, obtenerCedulas, resolverCredencialesSAC } from '../../../lib/sac';
import { readSheet } from '../../../lib/googleSheets';

export const config = { maxDuration: 45 };

// "23/09/2026" -> Date (medianoche, hora local)
function parsearFechaSAC(fechaStr) {
  if (!fechaStr) return null;
  const partes = fechaStr.split('/');
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes.map((p) => parseInt(p, 10));
  if (!dia || !mes || !anio) return null;
  const d = new Date(anio, mes - 1, dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasYColor(fecha, hoy) {
  const f = parsearFechaSAC(fecha);
  if (!f) return null;
  const dias = Math.round((hoy - f) / 86400000);
  if (dias < 0 || dias > 3) return null; // más de 3 días: no interesa en el dashboard
  const color = dias <= 1 ? 'rojo' : dias === 2 ? 'amarillo' : 'verde';
  return { dias, color };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña, error: errorCred } = await resolverCredencialesSAC(req.body);
  if (errorCred) {
    return res.status(200).json({ success: false, mensaje: errorCred, movimientos: [], cedulas: [] });
  }

  try {
    // Si el SAC no devuelve JSON válido (sesión caída / límite), se reintenta
    // una vez con un login nuevo antes de rendirse, en vez de mostrar "sin datos".
    let expedientesSAC = [];
    let cedulasSAC = [];
    let filasClientes = [];
    let diag = null;
    let cookieJarFinal = null;
    for (let intento = 1; intento <= 2; intento += 1) {
      const login = await loginSAC(usuario, contraseña);
      if (!login.exito) {
        return res.status(200).json({ success: false, mensaje: 'No se pudo conectar al SAC', movimientos: [], cedulas: [] });
      }
      const [rExp, rCed, filas] = await Promise.all([
        obtenerExpedientesConNovedades(login.cookieJar, 200),
        obtenerCedulas(login.cookieJar, 100),
        readSheet('Clientes_y_Expedientes'),
      ]);
      expedientesSAC = rExp.expedientes;
      cedulasSAC = rCed.cedulas;
      filasClientes = filas;
      diag = { expedientes: rExp.diagnostico, cedulas: { status: rCed.diagnostico.status, esJSON: rCed.diagnostico.esJSON } };
      cookieJarFinal = login.cookieJar;
      if (diag.expedientes.esJSON && diag.cedulas.esJSON) break;
      if (intento === 2) {
        return res.status(200).json({
          success: false,
          mensaje: `El SAC no devolvió datos válidos (expedientes: ${diag.expedientes.status}, cédulas: ${diag.cedulas.status}). Probá de nuevo en un momento.`,
          movimientos: [],
          cedulas: [],
        });
      }
    }

    if (!filasClientes || filasClientes.length < 2) {
      return res.status(200).json({
        success: false,
        mensaje: 'No se pudo leer la hoja de expedientes de Google Sheets (error temporal). Recargá en un minuto.',
        movimientos: [],
        cedulas: [],
      });
    }

    const locales = new Map(); // numeroSAC -> caratula
    for (let i = 1; i < filasClientes.length; i++) {
      const numeroSAC = filasClientes[i][5];
      if (numeroSAC) locales.set(String(numeroSAC).trim(), filasClientes[i][6] || '');
    }

    const coincidencias = expedientesSAC.filter((e) => locales.has(String(e.numeroExpediente).trim()));

    const operacionesPorExpediente = await Promise.all(
      coincidencias.map((exp) => obtenerOperaciones(cookieJarFinal, exp.idExpediente).catch(() => ({ operaciones: [] }))),
    );

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const movimientos = [];
    coincidencias.forEach((exp, i) => {
      const numeroSAC = String(exp.numeroExpediente).trim();
      const operaciones = operacionesPorExpediente[i].operaciones || [];
      if (operaciones.length === 0) return;

      // La más reciente (el SAC las devuelve en algún orden; no lo
      // asumimos, buscamos la fecha máxima).
      let masReciente = null;
      let fechaMasReciente = null;
      for (const op of operaciones) {
        const f = parsearFechaSAC(op.fecha);
        if (f && (!fechaMasReciente || f > fechaMasReciente)) {
          fechaMasReciente = f;
          masReciente = op;
        }
      }
      if (!fechaMasReciente) return;

      const r = diasYColor(masReciente.fecha, hoy);
      if (!r) return;

      movimientos.push({
        numeroSAC,
        caratula: locales.get(numeroSAC) || exp.caratula,
        tipoOperacion: masReciente.tipoOperacion || 'Movimiento',
        fecha: masReciente.fecha,
        dias: r.dias,
        color: r.color,
      });
    });

    movimientos.sort((a, b) => a.dias - b.dias);

    // Cédulas: ya vienen como lista plana (no hace falta pedir por
    // expediente), solo filtramos por las que ya existen en LexHub.
    const cedulas = [];
    (cedulasSAC || []).forEach((ced) => {
      const numeroSAC = String(ced.numeroExpediente || '').trim();
      if (!numeroSAC || !locales.has(numeroSAC)) return;
      const r = diasYColor(ced.fecha, hoy);
      if (!r) return;

      cedulas.push({
        numeroSAC,
        caratula: locales.get(numeroSAC) || ced.caratula,
        tipoOperacion: ced.tipoOperacion || 'Cédula',
        fecha: ced.fecha,
        dias: r.dias,
        color: r.color,
      });
    });
    cedulas.sort((a, b) => a.dias - b.dias);

    // Expedientes con novedades en el SAC que todavía no están cargados en LexHub
    const noCargados = expedientesSAC.filter((e) => !locales.has(String(e.numeroExpediente).trim())).length;
    // Cédulas de los últimos 3 días de expedientes que no están en LexHub
    const cedulasNoCargadas = (cedulasSAC || []).filter((ced) => {
      const numeroSAC = String(ced.numeroExpediente || '').trim();
      return numeroSAC && !locales.has(numeroSAC) && diasYColor(ced.fecha, hoy);
    }).length;

    return res.status(200).json({ success: true, movimientos, cedulas, noCargados, cedulasNoCargadas });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, movimientos: [], cedulas: [] });
  }
}
