// pages/api/debug-sheets.js
// Listar todas las hojas disponibles en el spreadsheet

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  try {
    console.log('🔍 DEBUG: Leyendo estructura del spreadsheet');
    console.log('📋 SHEETS_ID:', SHEETS_ID);

    const accessToken = await getAccessToken();
    
    // Obtener metadata del spreadsheet
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}`;
    
    const response = await fetch(metadataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Error al leer spreadsheet',
        details: data,
        SHEETS_ID
      });
    }

    // Listar todas las hojas
    const sheets = data.sheets || [];
    const sheetsList = sheets.map(sheet => ({
      title: sheet.properties.title,
      sheetId: sheet.properties.sheetId,
      gridProperties: sheet.properties.gridProperties
    }));

    console.log('📊 Hojas encontradas:', sheetsList);

    // Intentar leer cada hoja que contenga "Comentario"
    const comentarioSheets = [];
    for (const sheet of sheetsList) {
      if (sheet.title.toLowerCase().includes('comentario')) {
        console.log(`\n📥 Intentando leer: ${sheet.title}`);
        
        const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(sheet.title)}`;
        const sheetResponse = await fetch(readUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        const sheetData = await sheetResponse.json();
        const rows = sheetData.values || [];
        
        comentarioSheets.push({
          title: sheet.title,
          rowCount: rows.length,
          headers: rows[0] || [],
          preview: rows.slice(0, 3)
        });
      }
    }

    return res.status(200).json({
      SHEETS_ID,
      allSheets: sheetsList,
      comentarioSheets,
      mensaje: 'Ver allSheets para lista completa. Ver comentarioSheets para hojas con "Comentario" en el nombre.'
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
