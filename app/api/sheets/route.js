import { google } from 'googleapis';
import { NextResponse } from 'next/server';
// Esta ruta le dice: sal de 'app/api/sheets', sube 3 niveles hasta llegar a la raíz y entra en 'lib'
import credentials from '../../../lib/google-service-account'; 

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes!A1:E100',
    });

    return NextResponse.json({ data: response.data.values });
  } catch (error) {
    console.error("Error en conexión:", error);
    return NextResponse.json({ error: "Fallo en autenticación", detalle: error.message }, { status: 500 });
  }
}
