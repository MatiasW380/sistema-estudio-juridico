// lib/googleSheets.js
// Leer y escribir en Google Sheets usando Cuenta de Servicio

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

// Función para obtener un token de acceso usando la cuenta de servicio
async function getAccessToken() {
  console.log('🔑 Intentando obtener token de acceso...');
  try {
    // Verificar que la variable de entorno exista
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT no está definida en Vercel');
      return null;
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const { client_email, private_key } = credentials;

    if (!client_email || !private_key) {
      console.error('❌ Credenciales incompletas: falta client_email o private_key');
      return null;
    }

    console.log(`✅ Cuenta de servicio: ${client_email}`);

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
    console.log('✅ JWT generado correctamente');

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

// Función para leer datos de una hoja específica
async function fetchSheetData(sheetName) {
  console.log(`📖 Leyendo hoja: ${sheetName}...`);
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso, usando MOCK');
      return getMockData(sheetName);
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}`;
    console.log(`📡 Consultando URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP: ${response.status} - ${errorText}`);
      return getMockData(sheetName);
    }

    const data = await response.json();
    console.log(`✅ Datos obtenidos: ${data.values?.length || 0} filas (incluyendo encabezados)`);
    return data.values || [];
  } catch (error) {
    console.error('❌ Error al leer datos:', error.message);
    return getMockData(sheetName);
  }
}

// Función para escribir datos en una hoja
export async function appendToSheet(sheetName, values) {
  console.log(`✍️ Escribiendo en hoja: ${sheetName}...`);
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso para escritura');
      return false;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}:append?valueInputOption=USER_ENTERED`;
    console.log(`📡 Enviando a URL: ${url}`);
    console.log(`📦 Datos a escribir:`, JSON.stringify(values));

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
      const errorText = await response.text();
      console.error(`❌ Error HTTP en escritura: ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log(`✅ Datos escritos correctamente. Respuesta:`, data);
    return true;
  } catch (error) {
    console.error('❌ Error al escribir datos:', error.message);
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
  console.log('👥 Obteniendo clientes...');
  try {
    const data = await getSheetData('Clientes_y_Expedientes');
    if (!data || data.length <= 1) {
      console.warn('⚠️ No hay datos de clientes (o solo encabezados)');
      return [];
    }

    const headers = data[0];
    const rows = data.slice(1);
    console.log(`📋 Procesando ${rows.length} clientes`);

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
  console.warn(`⚠️ Usando MOCK para la hoja: ${sheetName}`);
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
