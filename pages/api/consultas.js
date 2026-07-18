// pages/api/consultas.js
// API para gestionar consultas

import { getConsultas, agregarConsulta } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/consultas ejecutándose...');

  // GET: Listar consultas
  if (req.method === 'GET') {
    try {
      const { numeroSAC, clienteId } = req.query;
      const consultas = await getConsultas(numeroSAC, clienteId);
      return res.status(200).json({ consultas });
    } catch (error) {
      console.error('❌ Error al listar consultas:', error);
      return res.status(500).json({ error: 'Error al listar consultas' });
    }
  }

  // POST: Agregar consulta
  if (req.method === 'POST') {
    try {
      const { numeroSAC, fecha, abogado, notas } = req.body;
      
      if (!notas || notas.trim() === '') {
        return res.status(400).json({ error: 'Las notas son obligatorias' });
      }

      const resultado = await agregarConsulta(
        numeroSAC || '',
        fecha || new Date().toISOString().split('T')[0],
        abogado || '',
        notas
      );

      if (resultado) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al agregar consulta' });
      }
    } catch (error) {
      console.error('❌ Error al agregar consulta:', error);
      return res.status(500).json({ error: 'Error al agregar consulta' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
