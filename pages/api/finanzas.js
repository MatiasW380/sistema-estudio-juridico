// pages/api/finanzas.js
// API para gestionar finanzas

import { getFinanzas, agregarFinanza, getResumenFinanzas } from '../../lib/googleSheets';

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    return data?.email ? data : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { numeroSAC, categoria, estado, fechaInicio, fechaFin, resumen, cliente } = req.query;
      const userData = parseUserFromCookie(req.headers.cookie || '');

      // Obtener usuario desde cookie y usarlo para filtrar finanzas
      const usuarioEmail = userData?.email || null;

      if (!usuarioEmail) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      if (resumen === 'true') {
        const resultado = await getResumenFinanzas(
          categoria || null,
          fechaInicio || null,
          fechaFin || null,
          usuarioEmail,
          estado || null,
          cliente || null,
        );
        return res.status(200).json({ resumen: resultado });
      }

      let finanzas = await getFinanzas(
        numeroSAC || null,
        categoria || null,
        estado || null,
        fechaInicio || null,
        fechaFin || null,
        usuarioEmail, // Pasar usuario para filtrar acceso
      );

      // Filtro por cliente en API (además del front)
      if (cliente && cliente.trim() !== '') {
        const q = cliente.toLowerCase().trim();
        finanzas = (finanzas || []).filter((f) =>
          (f.Cliente || f.Nombre_Cliente || '').toLowerCase().includes(q),
        );
      }

      return res.status(200).json({ finanzas: finanzas || [] });
    } catch (error) {
      console.error('Error al listar finanzas:', error);
      return res.status(500).json({ error: 'Error al listar finanzas' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        numeroSAC,
        tipo,
        referencia,
        fecha,
        fechaVencimiento,
        concepto,
        montoTotal,
        montoPagado,
        estado,
        categoria,
      } = req.body || {};

      if (!numeroSAC || !fecha || !tipo || !categoria) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: numeroSAC, fecha, tipo, categoria' });
      }

      const ok = await agregarFinanza(
        numeroSAC,
        tipo,
        referencia || '',
        fecha,
        fechaVencimiento || '',
        concepto || '',
        montoTotal || '',
        montoPagado || '',
        estado || 'Pendiente',
        categoria,
      );

      if (!ok) {
        return res.status(500).json({ error: 'Error al agregar movimiento' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ Error al agregar movimiento:', error);
      return res.status(500).json({ error: 'Error al agregar movimiento' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
