// pages/api/agenda.js
// API para gestionar eventos de agenda (CRUD)

import {
  getAgenda,
  agregarEvento,
  getTareasPendientes,
  getAccessToken,
  getClientes,
} from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

const AGENDA_HEADERS = [
  'ID',
  'Numero_SAC',
  'Cliente',
  'Tipo',
  'Titulo',
  'Descripción',
  'Fecha',
  'Hora',
  'Hora_Fin',
  'Lugar',
  'Recordatorio',
  'Dias_Antes',
  'Estado',
  'Creado_Por',
  'Compartido_Con',
  'Notificacion_Enviada',
  'Google_Calendar_ID',
];

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    if (!data?.email) return null;
    return data;
  } catch {
    return null;
  }
}

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

function normalizeRowTo17(row = []) {
  const out = Array(17).fill('');
  for (let i = 0; i < 17; i += 1) {
    out[i] = row[i] || '';
  }
  return out;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] || '';
  });
  return obj;
}

function objectToRow17(eventObj) {
  return normalizeRowTo17([
    eventObj.ID || '',
    eventObj.Numero_SAC || '',
    eventObj.Cliente || '',
    eventObj.Tipo || 'Otro',
    eventObj.Titulo || '',
    eventObj['Descripción'] || eventObj.Descripción || '',
    eventObj.Fecha || '',
    eventObj.Hora || '',
    eventObj.Hora_Fin || '',
    eventObj.Lugar || '',
    eventObj.Recordatorio || 'SI',
    eventObj.Dias_Antes || '1',
    eventObj.Estado || 'Pendiente',
    eventObj.Creado_Por || '',
    eventObj.Compartido_Con || '',
    eventObj.Notificacion_Enviada || 'NO',
    eventObj.Google_Calendar_ID || '',
  ]);
}

async function buildSacMap(usuario) {
  const clientes = await getClientes(usuario);
  const sacMap = new Map();

  (clientes || []).forEach((c) => {
    (c.expedientes || []).forEach((exp) => {
      if (exp?.Numero_SAC) {
        sacMap.set(exp.Numero_SAC, {
          id: c.ID_Cliente,
          nombre: c.Nombre_Cliente || '',
        });
      }
    });
  });

  return sacMap;
}

async function readAgendaRows(token) {
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Agenda`;
  const readResponse = await fetch(readUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!readResponse.ok) {
    const txt = await readResponse.text();
    throw new Error(`Error al leer Agenda: ${readResponse.status} - ${txt}`);
  }

  const data = await readResponse.json();
  const rows = data.values || [];
  if (rows.length === 0) {
    return { headers: AGENDA_HEADERS, rows: [] };
  }

  const headers = rows[0];
  const bodyRows = rows.slice(1).map((r) => normalizeRowTo17(r));
  return { headers, rows: bodyRows };
}

export default async function handler(req, res) {
  try {
    const userFromCookie = parseUserFromCookie(req.headers.cookie || '');
    const usuarioCookie = userFromCookie?.email || '';
    const usuarioQuery = req.query?.usuario || '';
    const usuarioFinal = usuarioQuery || usuarioCookie;

    // GET: Listar eventos / pendientes
    if (req.method === 'GET') {
      const { numeroSAC, cliente, tipo, estado, fechaInicio, fechaFin, pendientes } = req.query;

      if (pendientes === 'true') {
        const tareas = await getTareasPendientes(usuarioFinal);
        const sacMap = await buildSacMap(usuarioFinal);

        const tareasEnriquecidas = (tareas || []).map((t) => {
          const fromSac = t.Numero_SAC ? sacMap.get(t.Numero_SAC) : null;
          return {
            ...t,
            Cliente: t.Cliente || fromSac?.nombre || '',
            Cliente_ID: fromSac?.id || null,
          };
        });

        return res.status(200).json({ eventos: tareasEnriquecidas });
      }

      const eventos = await getAgenda({
        numeroSAC: numeroSAC || null,
        cliente: cliente || null,
        tipo: tipo || null,
        estado: estado || null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        usuario: usuarioFinal || null,
      });

      const sacMap = await buildSacMap(usuarioFinal);
      const eventosEnriquecidos = (eventos || []).map((e) => {
        const fromSac = e.Numero_SAC ? sacMap.get(e.Numero_SAC) : null;
        return {
          ...e,
          Cliente: e.Cliente || fromSac?.nombre || '',
          Cliente_ID: fromSac?.id || null,
        };
      });

      return res.status(200).json({ eventos: eventosEnriquecidos });
    }

    // POST: Agregar evento
    if (req.method === 'POST') {
      const {
        numeroSAC,
        cliente,
        tipo,
        titulo,
        descripcion,
        fecha,
        hora,
        horaFin,
        lugar,
        recordatorio,
        diasAntes,
        estado,
        creadoPor,
        compartidoCon,
      } = req.body || {};

      if (!fecha || !titulo) {
        return res.status(400).json({ error: 'Fecha y Título son obligatorios' });
      }

      const creador = creadoPor || usuarioCookie || 'sistema';

      const ok = await agregarEvento(
        numeroSAC || '',
        cliente || '',
        tipo || 'Otro',
        titulo || '',
        descripcion || '',
        fecha || '',
        hora || '',
        horaFin || '',
        lugar || '',
        recordatorio || 'SI',
        diasAntes || '1',
        estado || 'Pendiente',
        creador,
        compartidoCon || '',
      );

      if (!ok) {
        return res.status(500).json({ error: 'Error al agregar evento' });
      }

      return res.status(200).json({ success: true });
    }

    // PUT: Actualizar evento (17 columnas A:Q)
    if (req.method === 'PUT') {
      const {
        id,
        numeroSAC,
        cliente,
        tipo,
        titulo,
        descripcion,
        fecha,
        hora,
        horaFin,
        lugar,
        recordatorio,
        diasAntes,
        estado,
        compartidoCon,
      } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'ID es obligatorio' });
      }

      const token = await getAccessToken();
      if (!token) {
        return res.status(500).json({ error: 'Error al obtener token de acceso' });
      }

      const { headers, rows } = await readAgendaRows(token);
      const idIndex = headers.indexOf('ID');
      if (idIndex === -1) {
        return res.status(500).json({ error: 'Estructura de hoja incorrecta (falta columna ID)' });
      }

      const rowIndex = rows.findIndex((r) => (r[idIndex] || '') === String(id));
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      const existingObj = rowToObject(headers, rows[rowIndex]);

      const updatedObj = {
        ...existingObj,
        Numero_SAC: numeroSAC !== undefined ? (numeroSAC || '') : existingObj.Numero_SAC,
        Cliente: cliente !== undefined ? (cliente || '') : existingObj.Cliente,
        Tipo: tipo !== undefined ? (tipo || 'Otro') : existingObj.Tipo,
        Titulo: titulo !== undefined ? (titulo || '') : existingObj.Titulo,
        'Descripción':
          descripcion !== undefined
            ? (descripcion || '')
            : (existingObj['Descripción'] || existingObj.Descripción || ''),
        Fecha: fecha !== undefined ? (fecha || '') : existingObj.Fecha,
        Hora: hora !== undefined ? (hora || '') : existingObj.Hora,
        Hora_Fin: horaFin !== undefined ? (horaFin || '') : existingObj.Hora_Fin,
        Lugar: lugar !== undefined ? (lugar || '') : existingObj.Lugar,
        Recordatorio: recordatorio !== undefined ? (recordatorio || 'SI') : existingObj.Recordatorio,
        Dias_Antes: diasAntes !== undefined ? (diasAntes || '1') : existingObj.Dias_Antes,
        Estado: estado !== undefined ? (estado || 'Pendiente') : existingObj.Estado,
        Compartido_Con: compartidoCon !== undefined ? (compartidoCon || '') : existingObj.Compartido_Con,
      };

      const filaNormalizada = objectToRow17(updatedObj);

      // +2 porque rowIndex está sobre bodyRows (sin headers) y A1 es 1-based
      const targetSheetRow = rowIndex + 2;
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Agenda!A${targetSheetRow}:Q${targetSheetRow}?valueInputOption=USER_ENTERED`;

      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [filaNormalizada] }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Error al actualizar evento:', errorText);
        return res.status(500).json({ error: 'Error al actualizar evento' });
      }

      return res.status(200).json({ success: true });
    }

    // DELETE: "eliminar" limpiando fila A:Q
    if (req.method === 'DELETE') {
      const { id } = req.query || {};
      if (!id) {
        return res.status(400).json({ error: 'ID es obligatorio' });
      }

      const token = await getAccessToken();
      if (!token) {
        return res.status(500).json({ error: 'Error al obtener token de acceso' });
      }

      const { headers, rows } = await readAgendaRows(token);
      const idIndex = headers.indexOf('ID');
      if (idIndex === -1) {
        return res.status(500).json({ error: 'Estructura de hoja incorrecta (falta columna ID)' });
      }

      const rowIndex = rows.findIndex((r) => (r[idIndex] || '') === String(id));
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      const filaVacia = Array(17).fill('');
      const targetSheetRow = rowIndex + 2;
      const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Agenda!A${targetSheetRow}:Q${targetSheetRow}?valueInputOption=USER_ENTERED`;

      const deleteResponse = await fetch(deleteUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [filaVacia] }),
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('❌ Error al eliminar evento:', errorText);
        return res.status(500).json({ error: 'Error al eliminar evento' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('❌ Error en /api/agenda:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
