// pages/api/debug-comentarios.js
// Endpoint TEMPORAL para debuggear los comentarios

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;

export default async function handler(req, res) {
  try {
    const { numeroSAC } = req.query;

    console.log('🔍 DEBUG: Leyendo hoja Comentarios_Expediente');
    
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Comentarios_Expediente`;
    const accessToken = await getAccessToken();

    const response = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    const rows = data.values || [];

    console.log('Total rows:', rows.length);
    console.log('All rows:', JSON.stringify(rows, null, 2));

    if (rows.length === 0) {
      return res.status(200).json({ 
        debug: 'Hoja vacía',
        rows: []
      });
    }

    const headers = rows[0];
    console.log('Headers:', headers);

    const resultado = {
      totalRows: rows.length,
      headers: headers,
      headerIndices: {
        'Numero_SAC': headers.indexOf('Numero_SAC'),
        'Autor': headers.indexOf('Autor'),
        'Fecha': headers.indexOf('Fecha'),
        'Comentario': headers.indexOf('Comentario'),
      },
      allRows: rows.slice(1),
      rowsForSAC: numeroSAC ? rows.slice(1).filter(row => row[headers.indexOf('Numero_SAC')] === numeroSAC) : null
    };

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
