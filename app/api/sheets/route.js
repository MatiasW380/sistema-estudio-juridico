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
    // Usamos directamente las variables de entorno configuradas en Vercel
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink)',
      orderBy: 'createdTime desc',
    });

    return NextResponse.json(res.data.files);
  } catch (error) {
    console.error("Error en Drive API:", error);
    return NextResponse.json({ error: "Error al conectar con Drive" }, { status: 500 });
  }
}
