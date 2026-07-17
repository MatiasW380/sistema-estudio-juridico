// pages/api/actuaciones.js
// API para listar, agregar, editar y eliminar actuaciones

import { getActuaciones, agregarActuacion, getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  console.log('🚀 API /api/actuaciones ejecutándose...');
  
  // GET: Listar actuaciones
  if (req.method === 'GET') {
    try {
      const { numeroSAC } = req.query;
      if (!numeroSAC) {
        return res.status(400).json({ error: 'numeroSAC es obligatorio' });
      }
      const actuaciones = await getActuaciones(numeroSAC);
      return res.status(200).json({ actuaciones });
    } catch (error) {
      console.error('❌ Error al listar actuaciones:', error);
      return res.status(500).json({ error: 'Error al listar actuaciones' });
    }
  }

  // POST: Agregar actuación
  if (req.method === 'POST') {
    try {
      const { 
        numeroSAC, 
        fecha, 
        tipo, 
        tipoOtro,
        origen, 
        contenido, 
        presentado, 
        tienePDF, 
        idPDFDrive, 
        esBorrador, 
        creadoPor, 
        compartidoCon 
      } = req.body;
      
      if (!numeroSAC || !fecha || !contenido) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      let tipoFinal = tipo;
      if (tipo === 'Otro' && tipoOtro && tipoOtro.trim() !== '') {
        tipoFinal = tipoOtro.trim();
      }

      const resultado = await agregarActuacion(
        numeroSAC,
        fecha,
        tipoFinal,
        origen || 'Yo',
        contenido,
        presentado || false,
        tienePDF || false,
        idPDFDrive || '',
        esBorrador || true,
        creadoPor || 'sistema',
        compartidoCon || ''
      );

      if (resultado) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al guardar en la hoja de cálculo' });
      }
    } catch (error) {
      console.error('❌ Error al agregar actuación:', error);
      return res.status(500).json({ error: error.message || 'Error al agregar actuación' });
    }
  }

  // PUT: Editar actuación (solo si es borrador)
  if (req.method === 'PUT') {
    try {
      const { id, numeroSAC, fecha, tipo, origen, contenido, esBorrador } = req.body;
      
      if (!id || !numeroSAC) {
        return res.status(400).json({ error: 'ID y numeroSAC son obligatorios' });
      }

      const token = await getAccessToken();
      if (!token) {
        return res.status(500).json({ error: 'Error al obtener token de acceso' });
      }

      // Leer todas las actuaciones
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Actuaciones`;
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
      const sacIndex = headers.indexOf('Numero_SAC');
      const fechaIndex = headers.indexOf('Fecha');
      const tipoIndex = headers.indexOf('Tipo');
      const origenIndex = headers.indexOf('Origen');
      const contenidoIndex = headers.indexOf('Contenido');
      const esBorradorIndex = headers.indexOf('Es_Borrador');

      if (idIndex === -1 || sacIndex === -1) {
        return res.status(500).json({ error: 'Estructura de hoja incorrecta' });
      }

      // Encontrar la fila
      let rowIndex = -1;
      let rowData = null;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === id && rows[i][sacIndex] === numeroSAC) {
          rowIndex = i;
          rowData = rows[i];
          break;
        }
      }

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }

      // Verificar que sea borrador
      if (rowData[esBorradorIndex]?.toUpperCase() !== 'SI') {
        return res.status(403).json({ error: 'No se puede editar una actuación presentada' });
      }

      // Actualizar datos
      const updatedRow = [...rowData];
      if (fechaIndex !== -1 && fecha) updatedRow[fechaIndex] = fecha;
      if (tipoIndex !== -1 && tipo) updatedRow[tipoIndex] = tipo;
      if (origenIndex !== -1 && origen) updatedRow[origenIndex] = origen;
      if (contenidoIndex !== -1 && contenido) updatedRow[contenidoIndex] = contenido;
      if (esBorradorIndex !== -1) updatedRow[esBorradorIndex] = esBorrador ? 'SI' : 'NO';

      // Escribir la fila actualizada
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Actuaciones!A${rowIndex + 1}:L${rowIndex + 1}?valueInputOption=USER_ENTERED`;
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
        return res.status(500).json({ error: 'Error al actualizar la actuación' });
      }
    } catch (error) {
      console.error('❌ Error al editar actuación:', error);
      return res.status(500).json({ error: error.message || 'Error al editar actuación' });
    }
  }

  // DELETE: Eliminar actuación (solo si es borrador)
  if (req.method === 'DELETE') {
    try {
      const { id, numeroSAC } = req.query;
      
      if (!id || !numeroSAC) {
        return res.status(400).json({ error: 'ID y numeroSAC son obligatorios' });
      }

      const token = await getAccessToken();
      if (!token) {
        return res.status(500).json({ error: 'Error al obtener token de acceso' });
      }

      // Leer todas las actuaciones
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Actuaciones`;
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
      const sacIndex = headers.indexOf('Numero_SAC');
      const esBorradorIndex = headers.indexOf('Es_Borrador');

      if (idIndex === -1 || sacIndex === -1) {
        return res.status(500).json({ error: 'Estructura de hoja incorrecta' });
      }

      // Encontrar la fila
      let rowIndex = -1;
      let rowData = null;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === id && rows[i][sacIndex] === numeroSAC) {
          rowIndex = i;
          rowData = rows[i];
          break;
        }
      }

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Actuación no encontrada' });
      }

      // Verificar que sea borrador
      if (rowData[esBorradorIndex]?.toUpperCase() !== 'SI') {
        return res.status(403).json({ error: 'No se puede eliminar una actuación presentada' });
      }

      // Eliminar la fila (vaciar celdas)
      const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Actuaciones!A${rowIndex + 1}:L${rowIndex + 1}?valueInputOption=USER_ENTERED`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [Array(12).fill('')] })
      });

      if (deleteResponse.ok) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al eliminar la actuación' });
      }
    } catch (error) {
      console.error('❌ Error al eliminar actuación:', error);
      return res.status(500).json({ error: error.message || 'Error al eliminar actuación' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
