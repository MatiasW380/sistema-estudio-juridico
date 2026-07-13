// Ruta: app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Leemos la variable unificada que ya tienes en Vercel
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/sheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ID de la planilla que tenemos en contexto
    const SPREADSHEET_ID = '17YFhMlCPE8AkXJG4Pw6'; 
    const RANGE = 'Clientes_y_Expedientes!A2:G100'; 

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const clientes = rows.map((row) => ({
      id: row[0],
      nombre: row[1],
      telefono: row[2],
      nro_sac: row[3],
      caratula: row[4],
      fuero: row[5],
      folderId: row[6],
    }));

    return NextResponse.json({ data: clientes });
  } catch (error) {
    console.error("Error crítico en Sheets:", error);
    return NextResponse.json({ 
        error: "Error al conectar", 
        detalle: error.message 
    }, { status: 500 });
  }
}
