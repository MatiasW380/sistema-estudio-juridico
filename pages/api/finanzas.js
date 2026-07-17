// pages/api/finanzas.js
// API para gestionar movimientos financieros

import { getMovimientos, agregarMovimiento, getSaldo } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/finanzas ejecutándose...');
  
  // GET: Listar movimientos
  if (req.method === 'GET') {
    try {
      const { numeroSAC, fechaInicio, fechaFin, tipo } = req.query;
      
      if (!numeroSAC) {
        return res.status(400).json({ error: 'numeroSAC es obligatorio' });
      }

      // Si se pide saldo
      if (req.query.saldo === 'true') {
        const saldo = await getSaldo(numeroSAC);
        return res.status(200).json({ saldo });
      }

      const movimientos = await getMovimientos(numeroSAC, fechaInicio, fechaFin, tipo);
      return res.status(200).json({ movimientos });
    } catch (error) {
      console.error('❌ Error al listar movimientos:', error);
      return res.status(500).json({ error: 'Error al listar movimientos' });
    }
  }

  // POST: Agregar movimiento
  if (req.method === 'POST') {
    try {
      const { numeroSAC, fechaRegistro, fechaVencimiento, tipo, detalle, montoDebe, montoHaber } = req.body;
      
      if (!numeroSAC || !fechaRegistro || !tipo) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const resultado = await agregarMovimiento(
        numeroSAC,
        fechaRegistro,
        fechaVencimiento || '',
        tipo,
        detalle || '',
        montoDebe || '',
        montoHaber || ''
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
