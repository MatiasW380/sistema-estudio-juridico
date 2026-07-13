// Ruta: app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // 1. Verificación rápida de variables de entorno
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ error: "Faltan variables: Verifica GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY en Vercel" }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/sheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ID de la planilla
    const SPREADSHEET_ID = '17YFhMlCPE8AkXJG4Pw6'; 
    
    // Intentamos obtener solo el título para probar la conexión
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    return NextResponse.json({ 
        message: "Conexión exitosa", 
        title: response.data.properties.title 
    });

  } catch (error) {
    // Esto nos dirá el error real en el navegador
    return NextResponse.json({ 
        error: "Error de conexión", 
        detalle: error.message 
    }, { status: 500 });
  }
}
