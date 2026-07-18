// pages/api/drive/subir.js
// API para subir un archivo usando la cuenta de servicio con una carpeta fija

import { getAccessToken } from '../../../lib/googleSheets';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

// === ID DE LA CARPETA FIJA EN DRIVE ===
const UPLOAD_FOLDER_ID = '1uMFzw4XRgD5yWhd_pcVi3VhR-Dq63L2R';

export default async function handler(req, res) {
  console.log('🚀 API /api/drive/subir ejecutándose...');
  
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { fileName, fileBase64 } = req.body;
    
    console.log('📥 Datos recibidos:');
    console.log('  fileName:', fileName);
    console.log('  fileBase64 length:', fileBase64?.length || 0);

    if (!fileName || !fileBase64) {
      console.error('❌ Faltan campos');
      return res.status(400).json({ error: 'fileName y fileBase64 son obligatorios' });
    }

    // Convertir base64 a buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    console.log(`📄 Buffer creado: ${fileBuffer.length} bytes`);

    console.log('🔑 Obteniendo token de acceso...');
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ Error al obtener token de acceso');
      return res.status(500).json({ error: 'Error al obtener token de acceso' });
    }
    console.log('✅ Token obtenido');

    // === USAR CARPETA FIJA ===
    console.log('📁 Usando carpeta fija:', UPLOAD_FOLDER_ID);

    // Subir archivo a Drive
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    console.log('📤 Subiendo a Drive...');

    const metadata = {
      name: fileName,
      parents: [UPLOAD_FOLDER_ID],
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

    console.log('📥 Respuesta de Drive status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error en Google Drive: ${response.status} - ${errorText}`);
      return res.status(response.status).json({ 
        error: `Error en Drive (${response.status}): ${errorText.substring(0, 200)}` 
      });
    }

    const data = await response.json();
    console.log(`✅ Archivo subido exitosamente: ${fileName} (ID: ${data.id})`);
    
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
