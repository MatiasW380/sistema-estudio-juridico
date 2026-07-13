// Ruta exacta en GitHub: app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Configurar la autenticación con las variables que ya cargaste en Vercel
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    // El ID de tu planilla BD_SISTEMA_GESTION
    const spreadsheetId = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc'; 

    // 2. Intentar leer la pestaña 'Clientes'
    const respuesta = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Clientes!A2:G100', // Lee desde la fila 2 para saltar los encabezados
    });

    const filas = respuesta.data.values;

    if (!filas || filas.length === 0) {
      return NextResponse.json([]);
    }

    // 3. Transformar las celdas de la planilla en datos organizados
    const clientes = filas.map((fila, indice) => ({
      id: fila[0] || String(indice + 1),
      nombre: fila[1] || 'Sin nombre',
      dni: fila[2] || '-',
      telefono: fila[3] || '-',
      email: fila[4] || '-',
      causa: fila[5] || 'Sin causa asignada',
      estado: fila[6] || 'En Trámite',
    }));

    return NextResponse.json(clientes);

  } catch (error) {
    console.error('Error leyendo Google Sheets:', error);
    // Si falla la conexión con Google por credenciales, devolvemos un estado vacío controlado
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
