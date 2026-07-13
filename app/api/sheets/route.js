// Ruta: app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Leemos la variable directamente
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/sheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ID de tu hoja de cálculo
    const SPREADSHEET_ID = '17YFhMlCPE8AkXJG4Pw6'; 
    const RANGE = 'Clientes_y_Expedientes!A2:G100'; 

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error en Sheets:", error);
    return NextResponse.json({ error: "Error en el backend: " + error.message }, { status: 500 });
  }
}
