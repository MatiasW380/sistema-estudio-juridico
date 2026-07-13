// Ruta: app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    // 1. Leer el archivo local
    const filePath = path.join(process.cwd(), 'google-key.json');
    const keyFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 2. Autenticación manual usando el objeto de credenciales
    const auth = new google.auth.JWT(
      keyFile.client_email,
      null,
      keyFile.private_key,
      ['https://www.googleapis.com/auth/sheets.readonly']
    );

    // 3. Inicializar Sheets
    const sheets = google.sheets({ version: 'v4', auth });
    
    // 4. Leer datos
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error definitivo:", error);
    return NextResponse.json({ 
        error: "Fallo en autenticación", 
        detalle: error.message 
    }, { status: 500 });
  }
}
