// app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Lectura directa desde el process.env para asegurar que se tome el valor
    const credentialsString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentialsString) {
      return NextResponse.json({ error: "No se encuentra GOOGLE_SERVICE_ACCOUNT_JSON" }, { status: 500 });
    }

    const credentials = JSON.parse(credentialsString);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/sheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ID extraído de tu contexto
    const SPREADSHEET_ID = '17YFhMlCPE8AkXJG4Pw6'; 
    const RANGE = 'Clientes_y_Expedientes!A2:G100'; 

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
