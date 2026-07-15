// pages/api/drive/descargar-completo.js
// API para descargar todos los PDFs de una carpeta unidos en uno solo

import { getAccessToken } from '../../../lib/googleSheets';
import { PDFDocument } from 'pdf-lib';

export default async function handler(req, res) {
  console.log('🚀 API /api/drive/descargar-completo ejecutándose...');
  
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

    // 1. Listar archivos PDF en la carpeta
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false and mimeType='application/pdf'&orderBy=createdTime`;
    const listResponse = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!listResponse.ok) {
      return res.status(500).json({ error: 'Error al listar archivos' });
    }

    const data = await listResponse.json();
    const files = data.files || [];

    if (files.length === 0) {
      return res.status(404).json({ error: 'No hay PDFs en este expediente' });
    }

    // 2. Descargar cada PDF y fusionarlos
    const pdfDoc = await PDFDocument.create();
    let pageCount = 0;

    for (const file of files) {
      console.log(`📄 Procesando: ${file.name}`);
      
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const downloadResponse = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!downloadResponse.ok) {
        console.error(`❌ Error al descargar ${file.name}`);
        continue;
      }

      const pdfBytes = await downloadResponse.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => {
        pdfDoc.addPage(page);
        pageCount++;
      });
    }

    if (pageCount === 0) {
      return res.status(404).json({ error: 'No se pudieron procesar los PDFs' });
    }

    // 3. Guardar el PDF fusionado
    const mergedPdfBytes = await pdfDoc.save();

    // 4. Enviar al cliente
    const nombreArchivo = `expediente_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${nombreArchivo}`);
    res.send(Buffer.from(mergedPdfBytes));

  } catch (error) {
    console.error('❌ Error en la API:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
