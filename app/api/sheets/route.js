// Ruta: app/api/drive/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId'); // El ID que viene de tu BD

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Busca los archivos dentro de la carpeta específica del cliente
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink)',
    });

    return NextResponse.json(res.data.files);
  } catch (error) {
    return NextResponse.json({ error: "No se pudo conectar a Drive" }, { status: 500 });
  }
}
