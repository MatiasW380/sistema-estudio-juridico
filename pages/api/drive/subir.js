// pages/api/drive/subir.js
// API para subir un archivo a una carpeta de Drive (recibe base64)

import { getAccessToken } from '../../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/drive/subir ejecutándose...');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { folderId, fileName, fileBase64 } = req.body;
    
    if (!folderId || !fileName || !fileBase64) {
      return res.status(400).json({ error: 'folderId, fileName y fileBase64 son obligatorios' });
    }

    console.log(`📄 Archivo recibido: ${fileName} (base64, ${fileBase64.length} caracteres)`);

    // Convertir base64 a buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    const token = await getAccessToken();
    if (!token) {
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

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error al subir archivo: ${response.status} - ${errorText}`);
      return res.status(500).json({ error: 'Error al subir el archivo' });
    }

    const data = await response.json();
    console.log(`✅ Archivo subido: ${fileName} (ID: ${data.id})`);
    return res.status(200).json({ 
      success: true, 
      fileId: data.id,
      fileName: fileName,
      webViewLink: `https://drive.google.com/file/d/${data.id}/view`
    });

  } catch (error) {
    console.error('❌ Error en la API:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
