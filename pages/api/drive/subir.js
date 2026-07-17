import { getAccessToken } from '../../../lib/googleSheets';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Aseguramos que Vercel acepte el tamaño del base64
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { folderId, fileName, fileBase64 } = req.body;
    
    if (!folderId || !fileName || !fileBase64) {
      return res.status(400).json({ error: 'folderId, fileName y fileBase64 son obligatorios' });
    }

    // 1. Obtener el token de acceso
    const token = await getAccessToken();
    if (!token) {
      return res.status(500).json({ error: 'Error al obtener token de acceso' });
    }

    // 2. Convertir el contenido base64 a Buffer binario
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // 3. Definir un delimitador único para separar la metadata del archivo
    const boundary = 'PASO_A_PASO_DELIMITER_M_AND_M';
    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    // 4. Construir la estructura multipart/related que exige Google Drive
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const multipartRequestBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--`) // Delimitador de cierre obligatorio
    ]);

    // 5. Realizar la petición HTTP con los encabezados correctos
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length.toString(),
      },
      body: multipartRequestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de Google Drive:', errorText);
      return res.status(response.status).json({ error: `Error en Drive: ${errorText}` });
    }

    const data = await response.json();
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
