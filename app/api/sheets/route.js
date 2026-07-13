import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // 1. Datos hardcoded (asegúrate de pegar la clave tal cual, 
    // sin intentar escapar los saltos de línea manualmente).
    const client_email = "tu-email-de-servicio@sistema-gestion-estudio-502310.iam.gserviceaccount.com";
    const private_key = `-----BEGIN PRIVATE KEY-----
AQUÍ_PEGA_TU_CLAVE_ENTERA_CON_SALTOS_DE_LÍNEA_ORIGINALES
-----END PRIVATE KEY-----`;

    // 2. Auth usando JWT clásico
    const auth = new google.auth.JWT(
      client_email,
      null,
      private_key.replace(/\\n/g, '\n'), // Limpieza técnica necesaria
      ['https://www.googleapis.com/auth/sheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error crítico:", error);
    return NextResponse.json({ 
        error: "Fallo en autenticación", 
        detalle: error.message 
    }, { status: 500 });
  }
}
