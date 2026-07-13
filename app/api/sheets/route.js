// Ruta: app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(request) {
  try {
    // Leemos el archivo desde la raíz del proyecto
    const filePath = path.join(process.cwd(), 'google-key.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const credentials = JSON.parse(fileContent);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/sheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ID de tu planilla
    const SPREADSHEET_ID = '17YFhMlCPE8AkXJG4Pw6'; 
    const RANGE = 'Clientes_y_Expedientes!A2:G100'; 

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error crítico:", error);
    return NextResponse.json({ 
        error: "Error al leer credenciales", 
        detalle: error.message 
    }, { status: 500 });
  }
}
