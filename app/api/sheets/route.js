// Ruta: app/api/sheets/route.js
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const spreadsheetId = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
    const apiKey = process.env.GOOGLE_API_KEY;
    // Nombre corregido: Clientes_y_Expedientes
    const range = 'Clientes_y_Expedientes!A2:H100'; 
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    
    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    if (!datos.values) return NextResponse.json([]);

    // Mapeo corregido según las columnas de tu Excel
    const clientes = datos.values.map((fila, index) => ({
      id: index + 1,
      nombre: fila[1] || "Sin nombre", // Columna B: Nombre
      dni: fila[2] || "-",            // Columna C: DNI
      telefono: fila[3] || "-",       // Columna D: Teléfono
      email: fila[4] || "-",          // Columna E: Email
      causa: fila[5] || "Sin causa",  // Columna F: Causa
      estado: fila[6] || "En Trámite" // Columna G: Estado
    }));

    return NextResponse.json(clientes);

  } catch (error) {
    return NextResponse.json({ error: "Error al leer" }, { status: 500 });
  }
}
