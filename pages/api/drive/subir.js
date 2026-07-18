// pages/api/drive/subir.js
// API para subir un archivo usando OAuth 2.0 (cuenta personal)

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

// Obtener un token de acceso OAuth 2.0 (usando el refresh token)
async function getOAuthToken() {
  try {
    // Leer el refresh token de la hoja de configuración
    // Por ahora, usamos un placeholder
    console.log('🔑 Obteniendo token OAuth 2.0...');
    
    // NOTA: Este es un enfoque simplificado.
    // La implementación completa requiere almacenar el refresh token
    // de un usuario que haya autorizado la aplicación.
    
    return null; // Placeholder
  } catch (error) {
    console.error('❌ Error al obtener token OAuth:', error);
    return null;
  }
}

export default async function handler(req, res) {
  console.log('🚀 API /api/drive/subir ejecutándose...');
  
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { folderId, fileName, fileBase64 } = req.body;
    
    console.log('📥 Datos recibidos:');
    console.log('  folderId:', folderId);
    console.log('  fileName:', fileName);
    console.log('  fileBase64 length:', fileBase64?.length || 0);

    if (!folderId || !fileName || !fileBase64) {
      console.error('❌ Faltan campos');
      return res.status(400).json({ error: 'folderId, fileName y fileBase64 son obligatorios' });
    }

    // Convertir base64 a buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    console.log(`📄 Buffer creado: ${fileBuffer.length} bytes`);

    // === USAR OAUTH 2.0 (cuenta personal) ===
    // Por ahora, como no tenemos implementado OAuth, 
    // intentamos usar el token de la cuenta de servicio con un enfoque alternativo.
    // Este es un placeholder para mostrar la estructura.
    
    // NOTA: La implementación completa requiere:
    // 1. Configurar OAuth 2.0 en Google Cloud Console.
    // 2. Almacenar el refresh token de un usuario autorizado.
    // 3. Usar ese refresh token para generar tokens de acceso.
    
    console.log('⚠️ OAuth 2.0 no está completamente implementado.');
    console.log('📌 Se requiere:');
    console.log('  1. Configurar OAuth 2.0 en Google Cloud Console.');
    console.log('  2. Almacenar el refresh token.');
    console.log('  3. Generar tokens de acceso con el refresh token.');
    
    return res.status(501).json({ 
      error: 'Funcionalidad en desarrollo. Se requiere OAuth 2.0 para cuentas personales.' 
    });

  } catch (error) {
    console.error('❌ Error interno en la API de subida:', error);
    return res.status(500).json({ error: error.message });
  }
}
