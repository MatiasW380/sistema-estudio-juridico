// lib/googleSheets.js
// Leer y escribir en Google Sheets usando Cuenta de Servicio

const SHEETS_ID = '2PACX-1vRGbt4bRVuf8MkEzZXA5yWt25PRgB7J5cE2o7JfCNsG3YmYrtusfLcYhUL1mN-_GNxzNqEQYq1FoiaG';

// Función para obtener un token de acceso usando la cuenta de servicio
async function getAccessToken() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const { client_email, private_key } = credentials;

    // Crear el JWT (JSON Web Token) para autenticación
    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const token = jwt.sign(payload, private_key, { algorithm: 'RS256' });

    // Intercambiar el JWT por un token de acceso
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });

    if (!response.ok) {
      throw new Error('Error al obtener token de acceso');
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error al obtener token de acceso:', error);
    return null;
  }
}

// Función para leer datos de una hoja específica
async function fetchSheetData(sheetName) {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso');
      return getMockData(sheetName);
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Error al leer datos:', error);
    return getMockData(sheetName);
  }
}

// Función para escribir datos en una hoja
export async function appendToSheet(sheetName, values) {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso');
      return false;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [values],
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error al escribir datos:', error);
    return false;
  }
}

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

export async function getSheetData(sheetName) {
  return await fetchSheetData(sheetName);
}

export async function getClientes() {
  try {
    const data = await getSheetData('Clientes_y_Expedientes');
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
    console.error('Error al obtener clientes:', error);
    return [];
  }
}

export async function verificarUsuario(email, pin) {
  try {
    const data = await getSheetData('Usuarios');
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
// DATOS DE EJEMPLO (MOCK) - SOLO COMO RESPALDO
// ==========================================

function getMockData(sheetName) {
  const mockData = {
    'Clientes_y_Expedientes': [
      ['ID_Cliente', 'Nombre_Cliente', 'Telefono', 'Numero_SAC', 'Caratula', 'Fuero', 'ID_Carpeta_Drive', 'Usuarios_Compartidos'],
      ['1', 'Juan Lopez', '35178722', '123456', 'Lopez c/ Molina', 'Familia', '123456', ''],
      ['2', 'Maria Gonzalez', '32832424', '123455', 'Gonzalez c/ Cafure', 'Familia', '123455', ''],
      ['3', 'Carlos Alvarez', '4325133', '123477', 'Gomez c/ Alvarez', 'Familia', '123477', ''],
    ],
    'Usuarios': [
      ['Email', 'PIN_Hash', 'Rol', 'Activo'],
      ['matiasbaronetto@gmail.com', '3543', 'admin', 'SI'],
    ],
  };
  return mockData[sheetName] || [['Sin datos']];
}
