// pages/api/actualizar-expediente.js
// API para actualizar los datos de un expediente (compartir)

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  console.log('🚀 API /api/actualizar-expediente ejecutándose...');

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { numeroSAC, usuariosCompartidos } = req.body;

    if (!numeroSAC) {
      return res.status(400).json({ error: 'numeroSAC es obligatorio' });
    }

    const token = await getAccessToken();
    if (!token) {
      return res.status(500).json({ error: 'Error al obtener token de acceso' });
    }

    // Leer la hoja
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Clientes_y_Expedientes`;
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
    const sacIndex = headers.indexOf('Numero_SAC');
    const compartidosIndex = headers.indexOf('Usuarios_Compartidos');

    if (sacIndex === -1) {
      return res.status(500).json({ error: 'Estructura de hoja incorrecta' });
    }

    // Encontrar la fila del expediente
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][sacIndex] === numeroSAC) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    // Actualizar la fila
    const updatedRow = [...rows[rowIndex]];
    if (compartidosIndex !== -1) {
      updatedRow[compartidosIndex] = usuariosCompartidos;
    }

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Clientes_y_Expedientes!A${rowIndex + 1}:J${rowIndex + 1}?valueInputOption=USER_ENTERED`;
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
      return res.status(500).json({ error: 'Error al actualizar el expediente' });
    }
  } catch (error) {
    console.error('❌ Error en la API:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
