import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const base64Data = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
    if (!base64Data) {
        return NextResponse.json({ error: "Falta la variable GOOGLE_SERVICE_ACCOUNT_BASE64" }, { status: 500 });
    }

    // Decodifica de Base64 a JSON
    const credentials = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf-8'));

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
