// pages/api/finanzas.js
// API para gestionar finanzas

import { getFinanzas, agregarFinanza, getResumenFinanzas } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/finanzas ejecutándose...');
  
  if (req.method === 'GET') {
    try {
      const { numeroSAC, categoria, estado, fechaInicio, fechaFin, resumen } = req.query;

      if (resumen === 'true') {
        const resultado = await getResumenFinanzas(categoria, fechaInicio, fechaFin);
        return res.status(200).json({ resumen: resultado });
      }

      const finanzas = await getFinanzas(numeroSAC, categoria, estado, fechaInicio, fechaFin);
      return res.status(200).json({ finanzas });
    } catch (error) {
      console.error('❌ Error al listar finanzas:', error);
      return res.status(500).json({ error: 'Error al listar finanzas' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { numeroSAC, tipo, referencia, fecha, fechaVencimiento, concepto, montoTotal, montoPagado, estado, categoria } = req.body;
      
      if (!numeroSAC || !fecha || !tipo || !categoria) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const resultado = await agregarFinanza(
        numeroSAC,
        tipo,
        referencia || '',
        fecha,
        fechaVencimiento || '',
        concepto || '',
        montoTotal || '',
        montoPagado || '',
        estado || 'Pendiente',
        categoria
      );

      if (resultado) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al agregar movimiento' });
      }
    } catch (error) {
      console.error('❌ Error al agregar movimiento:', error);
      return res.status(500).json({ error: 'Error al agregar movimiento' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
