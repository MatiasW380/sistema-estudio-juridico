// Ruta: app/api/drive/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  if (!folderId) {
    return NextResponse.json({ error: "Falta el ID de la carpeta" }, { status: 400 });
  }

  try {
    // Manejo de la variable de entorno: si es un JSON string o objeto
    const credentials = typeof process.env.GOOGLE_SERVICE_ACCOUNT_JSON === 'string' 
      ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) 
      : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Busca los archivos dentro de la carpeta específica del cliente
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink)',
      orderBy: 'createdTime desc', // Ordenamos por fecha de creación (los más nuevos primero)
    });

    return NextResponse.json(res.data.files);
  } catch (error) {
    console.error("Error en Drive API:", error);
    return NextResponse.json({ error: "No se pudo conectar a Drive: " + error.message }, { status: 500 });
  }
}
