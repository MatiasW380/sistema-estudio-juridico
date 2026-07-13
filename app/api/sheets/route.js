// app/api/sheets/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import credentials from '../../../lib/google-service-account.js';

const SPREADSHEET_ID = '17YFhMlCPE8AkXJG4Pw6';

export async function GET(request) {
  try {
    // Obtener el parámetro range de la URL
    const { searchParams } = new URL(request.url);
    let range = searchParams.get('range');
    
    // Si no hay range, usar valor por defecto
    if (!range) {
      range = 'Clientes_y_Expedientes!A1:G100';
    }

    // Autenticación con Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Obtener datos de la hoja
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [], 
        message: 'No hay datos en esta hoja' 
      });
    }

    // Transformar datos según el nombre de la hoja
    const sheetName = range.split('!')[0];
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return NextResponse.json({ 
      success: true, 
      data: data,
      sheetName: sheetName,
      total: data.length
    });

  } catch (error) {
    console.error('Error en la API de Sheets:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener datos', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}
