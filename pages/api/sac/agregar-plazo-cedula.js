// pages/api/sac/agregar-plazo-cedula.js
// Agrega un plazo a la Agenda a partir de una cédula del dashboard. La
// fecha de vencimiento la indica el usuario a mano — sin cálculo de días
// hábiles automático, para no arriesgar errores.

import { agregarPlazo, parsearFechaArgentina } from '../../../lib/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { numeroSAC, descripcion, fechaVencimiento, creadoPor } = req.body || {};
  if (!numeroSAC || !fechaVencimiento) {
    return res.status(400).json({ success: false, error: 'numeroSAC y fechaVencimiento son obligatorios' });
  }

  try {
    const fechaNormalizada = parsearFechaArgentina(fechaVencimiento);
    const ok = await agregarPlazo(numeroSAC, '', descripcion || 'Plazo (desde cédula SAC)', fechaNormalizada, creadoPor || '');

    if (!ok) {
      return res.status(500).json({ success: false, error: 'No se pudo guardar el plazo' });
    }

    return res.status(200).json({ success: true, mensaje: 'Plazo agregado a la Agenda' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
