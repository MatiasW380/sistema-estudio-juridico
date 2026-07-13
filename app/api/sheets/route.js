// Ruta: app/api/sheets/route.js
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    // 1. Leer el archivo de credenciales de forma segura
    const filePath = path.join(process.cwd(), 'google-key.json');
    const keyFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 2. Usar GoogleAuth para inicializar la autenticación
    const auth = GoogleAuth.fromJSON(keyFile);
    auth.scopes = ['https://www.googleapis.com/auth/sheets.readonly'];

    const sheets = google.sheets({ version: 'v4', auth });
    
    // 3. Consultar la API
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error crítico de autenticación:", error);
    return NextResponse.json({ 
        error: "Fallo en autenticación", 
        detalle: error.message 
    }, { status: 500 });
  }
}
