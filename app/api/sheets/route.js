// Ruta: app/api/sheets/route.js
import { JWT } from 'google-auth-library';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const filePath = path.join(process.cwd(), 'google-key.json');
    const keyFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Usamos JWT directamente de la librería google-auth-library
    const auth = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/sheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error crítico:", error);
    return NextResponse.json({ 
        error: "Fallo en autenticación", 
        detalle: error.message 
    }, { status: 500 });
  }
}
