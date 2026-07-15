// pages/api/drive/listar.js
// API para listar archivos de una carpeta de Drive

import { getAccessToken } from '../../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/drive/listar ejecutándose...');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { folderId } = req.query;
    if (!folderId) {
      return res.status(400).json({ error: 'folderId es obligatorio' });
    }

    const token = await getAccessToken();
    if (!token) {
      return res.status(500).json({ error: 'Error al obtener token de acceso' });
    }

    // Listar archivos en la carpeta
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error al listar archivos:', errorText);
      return res.status(500).json({ error: 'Error al listar archivos' });
    }

    const data = await response.json();
    const files = data.files || [];

    // Obtener URLs de descarga para cada archivo
    const filesWithUrls = files.map(file => ({
      ...file,
      downloadUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    }));

    return res.status(200).json({ files: filesWithUrls });

  } catch (error) {
    console.error('❌ Error en la API:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
