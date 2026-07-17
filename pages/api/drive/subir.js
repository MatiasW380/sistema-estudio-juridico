// pages/api/drive/subir.js
// API para subir un archivo a una carpeta de Drive

import { getAccessToken } from '../../../lib/googleSheets';
import { IncomingForm } from 'formidable';
import fs from 'fs';

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
    // Parsear el FormData
    const form = new IncomingForm();
    form.keepExtensions = true;
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: 'No se recibió el archivo' });
    }

    const folderId = fields.folderId || req.query.folderId;
    const fileName = fields.fileName || req.query.fileName || file.originalFilename;

    if (!folderId) {
      return res.status(400).json({ error: 'folderId es obligatorio' });
    }

    console.log(`📄 Archivo recibido: ${fileName} (${file.filepath})`);

    // Leer el archivo
    const fileBuffer = fs.readFileSync(file.filepath);

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
    formData.append('file', new Blob([fileBuffer], { type: file.mimetype || 'application/pdf' }));

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

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath);

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
