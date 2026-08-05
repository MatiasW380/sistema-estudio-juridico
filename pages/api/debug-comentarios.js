// pages/api/debug-comentarios.js
// Endpoint TEMPORAL para debuggear los comentarios

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;

export default async function handler(req, res) {
  try {
    const { numeroSAC } = req.query;

    console.log('🔍 DEBUG: Leyendo hoja Comentarios_Expediente');
    
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Comentarios_Expediente!A:E`;
    const accessToken = await getAccessToken();

    const response = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return res.status(200).json({ 
        debug: 'Hoja vacía',
        rows: []
      });
    }

    const headers = rows[0];
    
    // Buscar columnas de forma flexible (case-insensitive)
    const normalize = (str) => (str || '').trim().toLowerCase();
    const findColumnIndex = (headerName) => {
      return headers.findIndex(h => normalize(h) === normalize(headerName));
    };

    const idxNumeroSAC = findColumnIndex('Numero_SAC');
    const idxAutor = findColumnIndex('Autor');
    const idxFecha = findColumnIndex('Fecha');
    const idxComentario = findColumnIndex('Comentario');

    const resultado = {
      totalRows: rows.length,
      headers: headers,
      columnIndices: { idxNumeroSAC, idxAutor, idxFecha, idxComentario },
      allRows: rows.slice(1),
      rowsForSAC: numeroSAC && idxNumeroSAC !== -1
        ? rows.slice(1).filter(row => row[idxNumeroSAC] === numeroSAC) 
        : null,
      comentariosProcessados: numeroSAC && idxNumeroSAC !== -1
        ? rows.slice(1)
            .filter(row => row[idxNumeroSAC] === numeroSAC)
            .map(row => ({
              autor: row[idxAutor],
              fecha: row[idxFecha],
              comentario: row[idxComentario]
            }))
        : null
    };

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
