import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

    const auth = new google.auth.JWT(
      creds.client_email,
      null,
      creds.private_key,
      ['https://www.googleapis.com/auth/sheets.readonly']
    );

    // FIX: Intentamos forzar la autenticación antes de llamar a Sheets
    await auth.authorize();

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Fallo en autenticación", detalle: error.message }, { status: 500 });
  }
}
