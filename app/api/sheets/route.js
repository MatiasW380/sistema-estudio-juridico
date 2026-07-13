import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const base64Credentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    
    if (!base64Credentials) {
      return NextResponse.json({ error: "Falta la variable GOOGLE_SERVICE_ACCOUNT_JSON" }, { status: 500 });
    }

    // Decodificar Base64 a JSON real
    const credentials = JSON.parse(Buffer.from(base64Credentials, 'base64').toString('utf-8'));

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
    console.error("Error de autenticación:", error);
    return NextResponse.json({ error: "Fallo en autenticación", detalle: error.message }, { status: 500 });
  }
}
