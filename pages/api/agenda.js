// pages/api/agenda.js
// API para gestionar eventos de agenda

import { getAgenda, agregarEvento, getTareasPendientes } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/agenda ejecutándose...');

  // GET: Listar eventos
  if (req.method === 'GET') {
    try {
      const { numeroSAC, cliente, tipo, estado, fechaInicio, fechaFin, usuario, pendientes } = req.query;

      if (pendientes === 'true') {
        const tareas = await getTareasPendientes(usuario);
        return res.status(200).json({ eventos: tareas });
      }

      const eventos = await getAgenda({
        numeroSAC,
        cliente,
        tipo,
        estado,
        fechaInicio,
        fechaFin,
        usuario,
      });
      return res.status(200).json({ eventos });
    } catch (error) {
      console.error('❌ Error al listar agenda:', error);
      return res.status(500).json({ error: 'Error al listar agenda' });
    }
  }

  // POST: Agregar evento
  if (req.method === 'POST') {
    try {
      const { 
        numeroSAC, cliente, tipo, titulo, descripcion, 
        fecha, hora, horaFin, lugar, recordatorio, 
        diasAntes, estado, creadoPor, compartidoCon 
      } = req.body;
      
      if (!fecha || !titulo) {
        return res.status(400).json({ error: 'Fecha y Título son obligatorios' });
      }

      const resultado = await agregarEvento(
        numeroSAC,
        cliente,
        tipo || 'Otro',
        titulo,
        descripcion || '',
        fecha,
        hora || '',
        horaFin || '',
        lugar || '',
        recordatorio || 'SI',
        diasAntes || '1',
        estado || 'Pendiente',
        creadoPor || '',
        compartidoCon || ''
      );

      if (resultado) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al agregar evento' });
      }
    } catch (error) {
      console.error('❌ Error al agregar evento:', error);
      return res.status(500).json({ error: 'Error al agregar evento' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
