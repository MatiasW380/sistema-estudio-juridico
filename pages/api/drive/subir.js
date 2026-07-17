// pages/api/drive/subir.js
// API para subir un archivo a una carpeta de Drive

import { getAccessToken } from '../../../lib/googleSheets';

// Deshabilitar bodyParser para manejar archivos
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('🚀 API /api/drive/subir ejecutándose...');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { folderId, fileName } = req.query;
    if (!folderId || !fileName) {
      return res.status(400).json({ error: 'folderId y fileName son obligatorios' });
    }

    // Leer el archivo del body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: 'No se recibió el archivo' });
    }

    console.log(`📄 Archivo recibido: ${fileName} (${fileBuffer.length} bytes)`);

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
