// Ruta: app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/sheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // ID de tu planilla (lo extraje de tu contexto)
    const SPREADSHEET_ID = '17YFhMlCPE8AkXJG4Pw6'; 
    const RANGE = 'Clientes_y_Expedientes!A2:G100'; // Ajustado al nombre de tu pestaña

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Mapeamos las filas a un formato de objeto para usar en el frontend
    const clientes = rows.map((row) => ({
      id: row[0],
      nombre: row[1],
      telefono: row[2],
      nro_sac: row[3],
      caratula: row[4],
      fuero: row[5],
      folderId: row[6], // Este es el ID crítico para conectar con Drive
    }));

    return NextResponse.json({ data: clientes });
  } catch (error) {
    console.error("Error al leer Sheets:", error);
    return NextResponse.json({ error: "Error al conectar con la base de datos" }, { status: 500 });
  }
}
