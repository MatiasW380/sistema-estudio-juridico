// pages/api/agenda.js
// API para gestionar eventos de agenda (CRUD completo)

import { getAgenda, agregarEvento, getTareasPendientes, appendToSheet, getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  console.log('🚀 ====== API /api/agenda INICIADA ======');
  console.log('📤 Método:', req.method);

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

  // PUT: Actualizar evento
  if (req.method === 'PUT') {
    try {
      const { id, numeroSAC, cliente, tipo, titulo, descripcion, fecha, hora, horaFin, lugar, recordatorio, diasAntes, estado, compartidoCon } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID es obligatorio' });
      }

      const token = await getAccessToken();
      if (!token) {
        return res.status(500).json({ error: 'Error al obtener token de acceso' });
      }

      // Leer todos los eventos
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Agenda`;
      const readResponse = await fetch(readUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!readResponse.ok) {
        return res.status(500).json({ error: 'Error al leer los datos' });
      }

      const data = await readResponse.json();
      const rows = data.values || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No se encontraron datos' });
      }

      const headers = rows[0];
      const idIndex = headers.indexOf('ID');
      if (idIndex === -1) {
        return res.status(500).json({ error: 'Estructura de hoja incorrecta' });
      }

      // Encontrar la fila
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === id) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      // Actualizar datos
      const updatedRow = [...rows[rowIndex]];
      const colMap = {
        'Numero_SAC': 1, 'Cliente': 2, 'Tipo': 3, 'Titulo': 4, 'Descripción': 5,
        'Fecha': 6, 'Hora': 7, 'Hora_Fin': 8, 'Lugar': 9, 'Recordatorio': 10,
        'Dias_Antes': 11, 'Estado': 12, 'Compartido_Con': 14
      };

      if (numeroSAC !== undefined) updatedRow[colMap.Numero_SAC] = numeroSAC || '';
      if (cliente !== undefined) updatedRow[colMap.Cliente] = cliente || '';
      if (tipo !== undefined) updatedRow[colMap.Tipo] = tipo || 'Otro';
      if (titulo !== undefined) updatedRow[colMap.Titulo] = titulo || '';
      if (descripcion !== undefined) updatedRow[colMap['Descripción']] = descripcion || '';
      if (fecha !== undefined) updatedRow[colMap.Fecha] = fecha || '';
      if (hora !== undefined) updatedRow[colMap.Hora] = hora || '';
      if (horaFin !== undefined) updatedRow[colMap.Hora_Fin] = horaFin || '';
      if (lugar !== undefined) updatedRow[colMap.Lugar] = lugar || '';
      if (recordatorio !== undefined) updatedRow[colMap.Recordatorio] = recordatorio || 'SI';
      if (diasAntes !== undefined) updatedRow[colMap.Dias_Antes] = diasAntes || '1';
      if (estado !== undefined) updatedRow[colMap.Estado] = estado || 'Pendiente';
      if (compartidoCon !== undefined) updatedRow[colMap.Compartido_Con] = compartidoCon || '';

      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Agenda!A${rowIndex + 1}:Q${rowIndex + 1}?valueInputOption=USER_ENTERED`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [updatedRow] })
      });

      if (updateResponse.ok) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al actualizar evento' });
      }
    } catch (error) {
      console.error('❌ Error al actualizar evento:', error);
      return res.status(500).json({ error: 'Error al actualizar evento' });
    }
  }

  // DELETE: Eliminar evento
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID es obligatorio' });
      }

      const token = await getAccessToken();
      if (!token) {
        return res.status(500).json({ error: 'Error al obtener token de acceso' });
      }

      // Leer todos los eventos
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Agenda`;
      const readResponse = await fetch(readUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!readResponse.ok) {
        return res.status(500).json({ error: 'Error al leer los datos' });
      }

      const data = await readResponse.json();
      const rows = data.values || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No se encontraron datos' });
      }

      const headers = rows[0];
      const idIndex = headers.indexOf('ID');
      if (idIndex === -1) {
        return res.status(500).json({ error: 'Estructura de hoja incorrecta' });
      }

      // Encontrar la fila
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === id) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      // Eliminar la fila (vaciar celdas)
      const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Agenda!A${rowIndex + 1}:Q${rowIndex + 1}?valueInputOption=USER_ENTERED`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [Array(17).fill('')] })
      });

      if (deleteResponse.ok) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al eliminar evento' });
      }
    } catch (error) {
      console.error('❌ Error al eliminar evento:', error);
      return res.status(500).json({ error: 'Error al eliminar evento' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
