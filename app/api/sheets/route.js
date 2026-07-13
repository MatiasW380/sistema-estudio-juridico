import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Leemos las variables individuales
    const client_email = process.env.GOOGLE_CLIENT_EMAIL;
    const private_key = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;
    const project_id = process.env.GOOGLE_PROJECT_ID;

    if (!client_email || !private_key || !project_id) {
      return NextResponse.json({ 
        error: "Faltan variables de entorno", 
        debug: { hasEmail: !!client_email, hasKey: !!private_key, hasProject: !!project_id } 
      }, { status: 500 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email,
        private_key,
        project_id,
      },
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
