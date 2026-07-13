import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Pegamos el JSON directamente como objeto de JavaScript
    const creds = {
      "type": "service_account",
      "project_id": "sistema-gestion-estudio-502310",
      "private_key_id": "53e1e7949356a82c92e1a61074d56429e9b372c7",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDB6siuqNA8uTTi\n3EZ0RkAfIJBYcEhbORAFgOREvvE+GidfRF8vtq1zFDGdrzfZnwRYks1Z7B9zfu5E\nmEMO4JwZ8jI+mA7SZhGrsLNKxuOsSAqzmNlg8Xn/N7DLb2QOdxhaU+rVf5UdCQMX\nYg28LZqg2HCtqrlQE07eDtXnY1YvfKWCoXJjam2KGGa/m8yTyUEZaXyckN7K3trn\nFts9zUIctTvj5L9e8+V7rNUiDcEj93kbJg6Cij70ChwEIXk/w0r6CJHfnUoUJxQq\nZCioseUjGEcU1LD83sNTEQUAGpktNDpF0EtTLUAonAr6DY1lz2GFxuQRFq+iOrQk\n5jJ/le5DAgMBAAECggEBAJd3mXQ6V6aL/ZqJgY/6fK6f8+mPq/X7Vn/o/53fR\n[...REEMPLAZA TODO ESTO CON LA CLAVE COMPLETA DE TU ARCHIVO...]\n-----END PRIVATE KEY-----\n",
      "client_email": "tu-email-de-servicio@sistema-gestion-estudio-502310.iam.gserviceaccount.com",
      // ... copia el resto de los campos de tu archivo .json original ...
    };

    const auth = new google.auth.JWT(
      creds.client_email,
      null,
      creds.private_key,
      ['https://www.googleapis.com/auth/sheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    return NextResponse.json({ error: "Fallo directo", detalle: error.message }, { status: 500 });
  }
}
