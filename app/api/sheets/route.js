import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pestana = searchParams.get('range') || 'Clientes_y_Expedientes';
  
  try {
    const spreadsheetId = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${pestana}!A1:Z100?key=${apiKey}`;
    
    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    return NextResponse.json(datos.values || []);
  } catch (error) {
    return NextResponse.json({ error: "Error al leer datos" }, { status: 500 });
  }
}
