// pages/api/sac/movimientos-dashboard.js
// Para la tarjeta del dashboard: movimientos de hasta 3 días de
// antigüedad, SOLO de expedientes que ya existen en LexHub. No escribe
// nada — es de solo lectura, pensado para consultarse cada vez que se
// entra al dashboard.

import { loginSAC, obtenerExpedientesConNovedades, obtenerOperaciones, resolverCredencialesSAC } from '../../../lib/sac';
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña, error: errorCred } = await resolverCredencialesSAC(req.body);
  if (errorCred) {
    return res.status(200).json({ success: false, mensaje: errorCred, movimientos: [] });
  }

  try {
    const login = await loginSAC(usuario, contraseña);
    if (!login.exito) {
      return res.status(200).json({ success: false, mensaje: 'No se pudo conectar al SAC', movimientos: [] });
    }

    const [{ expedientes: expedientesSAC }, filasClientes] = await Promise.all([
      obtenerExpedientesConNovedades(login.cookieJar),
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

      const dias = Math.round((hoy - fechaMasReciente) / 86400000);
      if (dias < 0 || dias > 3) return; // más de 3 días: no nos interesa acá

      const color = dias <= 1 ? 'rojo' : dias === 2 ? 'amarillo' : 'verde';

      movimientos.push({
        numeroSAC,
        caratula: locales.get(numeroSAC) || exp.caratula,
        tipoOperacion: masReciente.tipoOperacion || 'Movimiento',
        fecha: masReciente.fecha,
        dias,
        color,
      });
    });

    movimientos.sort((a, b) => a.dias - b.dias);

    return res.status(200).json({ success: true, movimientos });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, movimientos: [] });
  }
}
