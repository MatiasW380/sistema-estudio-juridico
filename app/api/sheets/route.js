import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Validar que la variable exista
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({ error: "Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON" }, { status: 500 });
    }

    // 2. Parsear de forma segura
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      return NextResponse.json({ error: "El formato de la variable JSON es inválido. Asegúrate de pegar el bloque completo { ... } sin texto adicional." }, { status: 500 });
    }

    // 3. Autenticación
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 4. Lectura de la planilla (Ejemplo: pestaña Clientes)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes!A1:E100', // Ajusta el rango según tu necesidad
    });

    return NextResponse.json({ data: response.data.values });

  } catch (error) {
    console.error("Error en API:", error);
    return NextResponse.json({ error: "Fallo en la conexión a Sheets", detalle: error.message }, { status: 500 });
  }
}
