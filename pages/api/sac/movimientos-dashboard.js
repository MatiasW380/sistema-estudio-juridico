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
    const login = await loginSAC(usuario, contraseña);
    if (!login.exito) {
      return res.status(200).json({ success: false, mensaje: 'No se pudo conectar al SAC', movimientos: [], cedulas: [] });
    }

    const [{ expedientes: expedientesSAC }, { cedulas: cedulasSAC }, filasClientes] = await Promise.all([
      obtenerExpedientesConNovedades(login.cookieJar),
      obtenerCedulas(login.cookieJar, 50),
      readSheet('Clientes_y_Expedientes'),
    ]);

    const locales = new Map(); // numeroSAC -> caratula
    for (let i = 1; i < filasClientes.length; i++) {
      const numeroSAC = filasClientes[i][5];
      if (numeroSAC) locales.set(String(numeroSAC).trim(), filasClientes[i][6] || '');
    }

    const coincidencias = expedientesSAC.filter((e) => locales.has(String(e.numeroExpediente).trim()));

    const operacionesPorExpediente = await Promise.all(
      coincidencias.map((exp) => obtenerOperaciones(login.cookieJar, exp.idExpediente).catch(() => ({ operaciones: [] }))),
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

    return res.status(200).json({ success: true, movimientos, cedulas });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, movimientos: [], cedulas: [] });
  }
}
