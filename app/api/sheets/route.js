import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import credentials from '../../../google-service-account'; // Ajusta la ruta si es necesario

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
    return NextResponse.json({ error: "Fallo en autenticación", detalle: error.message }, { status: 500 });
  }
}
