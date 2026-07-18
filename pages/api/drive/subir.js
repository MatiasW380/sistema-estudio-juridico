// pages/api/drive/subir.js
// API para subir un archivo a una carpeta de Drive

import { getAccessToken } from '../../../lib/googleSheets';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  console.log('🚀 API /api/drive/subir ejecutándose...');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { folderId, fileName, fileBase64 } = req.body;
    
    if (!folderId || !fileName || !fileBase64) {
      console.error('❌ Faltan campos:', { folderId, fileName, fileBase64: !!fileBase64 });
      return res.status(400).json({ error: 'folderId, fileName y fileBase64 son obligatorios' });
    }

    console.log(`📄 Archivo recibido: ${fileName} (${fileBase64.length} caracteres base64)`);

    // Convertir base64 a buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    console.log(`📄 Buffer creado: ${fileBuffer.length} bytes`);

    const token = await getAccessToken();
    if (!token) {
      console.error('❌ Error al obtener token de acceso');
      return res.status(500).json({ error: 'Error al obtener token de acceso' });
    }

    // Subir archivo a Drive
    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }));

    console.log(`📤 Subiendo archivo a carpeta: ${folderId}`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error en Google Drive: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Error en Drive: ${errorText}` 
      });
    }

    const data = await response.json();
    console.log(`✅ Archivo subido: ${fileName} (ID: ${data.id})`);
    
    return res.status(200).json({ 
      success: true, 
      fileId: data.id,
      webViewLink: `https://drive.google.com/file/d/${data.id}/view`
    });

  } catch (error) {
    console.error('❌ Error interno en la API de subida:', error);
    return res.status(500).json({ error: error.message });
  }
}
