import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // 1. Obtenemos el JSON completo desde la variable de entorno
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    // 2. Autenticamos usando las credenciales parseadas
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/sheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    // 3. Consultamos la hoja
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error detallado:", error);
    return NextResponse.json({ 
      error: "Fallo en autenticación", 
      detalle: error.message 
    }, { status: 500 });
  }
}
