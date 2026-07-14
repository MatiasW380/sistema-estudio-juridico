// Función para crear una carpeta de expediente en Drive
export async function crearCarpetaExpediente(numeroSAC, caratula) {
  console.log(`📁 crearCarpetaExpediente: ${numeroSAC} - ${caratula}`);
  
  try {
    const rootFolderId = await getRootFolderId();
    if (!rootFolderId) {
      console.error('❌ No se encontró la carpeta raíz SISTEMA DE GESTION');
      return null;
    }
    console.log(`✅ Root folder ID: ${rootFolderId}`);

    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso para Drive');
      return null;
    }

    const nombreCarpeta = `${numeroSAC} - ${caratula}`;
    console.log(`📁 Creando carpeta: "${nombreCarpeta}" en parent: ${rootFolderId}`);

    const url = `https://www.googleapis.com/drive/v3/files`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: nombreCarpeta,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error al crear carpeta: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Carpeta creada: ${nombreCarpeta} (ID: ${data.id})`);
    return data.id;
  } catch (error) {
    console.error('❌ Error al crear carpeta:', error.message);
    return null;
  }
}
