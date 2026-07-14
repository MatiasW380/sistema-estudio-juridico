// lib/googleSheets.js
// Leer y escribir en Google Sheets y Google Drive usando Cuenta de Servicio

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

// Función para obtener un token de acceso usando la cuenta de servicio
async function getAccessToken() {
  console.log('🔑 Intentando obtener token de acceso...');
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT no está definida en Vercel');
      return null;
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const { client_email, private_key } = credentials;

    if (!client_email || !private_key) {
      console.error('❌ Credenciales incompletas');
      return null;
    }

    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: client_email,
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const token = jwt.sign(payload, private_key, { algorithm: 'RS256' });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error al obtener token: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log('✅ Token de acceso obtenido correctamente');
    return data.access_token;
  } catch (error) {
    console.error('❌ Error al obtener token de acceso:', error.message);
    return null;
  }
}

// ==========================================
// FUNCIONES DE GOOGLE SHEETS
// ==========================================

async function fetchSheetData(sheetName) {
  try {
    const token = await getAccessToken();
    if (!token) return getMockData(sheetName);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status}`);
      return getMockData(sheetName);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('❌ Error al leer datos:', error.message);
    return getMockData(sheetName);
  }
}

// --- EXPORTACIONES DE SHEETS ---
export async function appendToSheet(sheetName, values) {
  try {
    const token = await getAccessToken();
    if (!token) return false;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [values] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP en escritura: ${response.status} - ${errorText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error al escribir datos:', error.message);
    return false;
  }
}

export async function getClientes() {
  try {
    const data = await fetchSheetData('Clientes_y_Expedientes');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error.message);
    return [];
  }
}

export async function verificarUsuario(email, pin) {
  try {
    const data = await fetchSheetData('Usuarios');
    if (!data || data.length <= 1) return null;

    const headers = data[0];
    const emailIndex = headers.indexOf('Email');
    const pinIndex = headers.indexOf('PIN_Hash');
    const rolIndex = headers.indexOf('Rol');
    const activoIndex = headers.indexOf('Activo');

    if (emailIndex === -1 || pinIndex === -1) return null;

    const rows = data.slice(1);
    const usuarioRow = rows.find(row => row[emailIndex]?.toLowerCase() === email.toLowerCase());

    if (!usuarioRow) return null;
    if (activoIndex !== -1 && usuarioRow[activoIndex]?.toLowerCase() !== 'si') return null;

    const pinGuardado = usuarioRow[pinIndex] || '';
    if (pinGuardado !== pin) return null;

    return {
      email: usuarioRow[emailIndex],
      rol: usuarioRow[rolIndex] || 'usuario',
      activo: usuarioRow[activoIndex] || 'SI'
    };
  } catch (error) {
    console.error('Error al verificar usuario:', error);
    return null;
  }
}

// ==========================================
// FUNCIONES DE GOOGLE DRIVE
// ==========================================

// ID de la carpeta raíz "SISTEMA DE GESTION" en Drive
let ROOT_FOLDER_ID = null;

async function getRootFolderId() {
  if (ROOT_FOLDER_ID) return ROOT_FOLDER_ID;

  try {
    const token = await getAccessToken();
    if (!token) return null;

    // Buscar la carpeta "SISTEMA DE GESTION" en la raíz
    const url = `https://www.googleapis.com/drive/v3/files?q=name='SISTEMA DE GESTION' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error('❌ Error al buscar carpeta raíz:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      ROOT_FOLDER_ID = data.files[0].id;
      console.log('✅ Carpeta raíz encontrada:', ROOT_FOLDER_ID);
      return ROOT_FOLDER_ID;
    } else {
      console.error('❌ No se encontró la carpeta "SISTEMA DE GESTION"');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al buscar carpeta raíz:', error.message);
    return null;
  }
}

// --- EXPORTACIONES DE DRIVE ---
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

export async function listarArchivosExpediente(folderId) {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error('❌ Error al listar archivos:', response.status);
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('❌ Error al listar archivos:', error.message);
    return [];
  }
}

export async function subirArchivoExpediente(folderId, file, name) {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    const metadata = {
      name: name,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

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
      return null;
    }

    const data = await response.json();
    console.log(`✅ Archivo subido: ${name} (ID: ${data.id})`);
    return data.id;
  } catch (error) {
    console.error('❌ Error al subir archivo:', error.message);
    return null;
  }
}

// ==========================================
// DATOS DE EJEMPLO (MOCK)
// ==========================================

function getMockData(sheetName) {
  const mockData = {
    'Clientes_y_Expedientes': [
      ['ID_Cliente', 'Nombre_Cliente', 'Telefono', 'Numero_SAC', 'Caratula', 'Fuero', 'ID_Carpeta_Drive', 'Usuarios_Compartidos'],
      ['1', 'Juan Lopez', '35178722', '123456', 'Lopez c/ Molina', 'Familia', '', ''],
      ['2', 'Maria Gonzalez', '32832424', '123455', 'Gonzalez c/ Cafure', 'Familia', '', ''],
    ],
    'Usuarios': [
      ['Email', 'PIN_Hash', 'Rol', 'Activo'],
      ['matiasbaronetto@gmail.com', '3543', 'admin', 'SI'],
    ],
  };
  return mockData[sheetName] || [['Sin datos']];
}
