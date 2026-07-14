// lib/googleSheets.js
// Conexión con Google Sheets usando require() en el servidor

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Función para obtener la autenticación (solo se ejecuta en el servidor)
async function getAuthSheets() {
  if (typeof window !== 'undefined') {
    return null;
  }

  try {
    // Usamos require() en lugar de import para evitar que Webpack resuelva las dependencias
    const { google } = require('googleapis');
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    return auth;
  } catch (error) {
    console.error('Error al configurar autenticación:', error);
    return null;
  }
}

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

// Función para leer datos de una pestaña específica
async function getSheetData(sheetName) {
  if (typeof window !== 'undefined') {
    return getMockData(sheetName);
  }

  try {
    const auth = await getAuthSheets();
    if (!auth) {
      return getMockData(sheetName);
    }

    const { google } = require('googleapis');
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z`,
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error('Error al leer datos:', error);
    return getMockData(sheetName);
  }
}

// Función para escribir datos en una pestaña
async function appendToSheet(sheetName, values) {
  if (typeof window !== 'undefined') {
    return false;
  }

  try {
    const auth = await getAuthSheets();
    if (!auth) {
      return false;
    }

    const { google } = require('googleapis');
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('Error al escribir:', error);
    return false;
  }
}

// ==========================================
// FUNCIÓN getClientes
// ==========================================

async function getClientes() {
  if (typeof window !== 'undefined') {
    return [];
  }

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

// ==========================================
// FUNCIONES DE AUTENTICACIÓN
// ==========================================

async function verificarUsuario(email, pin) {
  if (typeof window !== 'undefined') {
    return null;
  }

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

async function obtenerUsuarios() {
  if (typeof window !== 'undefined') return [];

  try {
    const data = await getSheetData('Usuarios');
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
    console.error('Error al obtener usuarios:', error);
    return [];
  }
}

// ==========================================
// DATOS DE EJEMPLO (MOCK)
// ==========================================

function getMockData(sheetName) {
  const mockData = {
    'Clientes_y_Expedientes': [
      ['ID_Cliente', 'Nombre_Cliente', 'Telefono', 'Numero_SAC', 'Caratula', 'Fuero', 'ID_Carpeta_Drive', 'Usuarios_Compartidos'],
      ['1', 'Juan Lopez', '35178722', '', '', '', '', ''],
      ['2', 'Maria Gonzalez', '32832424', '', '', '', '', ''],
    ],
    'Usuarios': [
      ['Email', 'PIN_Hash', 'Rol', 'Activo'],
      ['matiasbaronetto@gmail.com', '1234', 'admin', 'SI'],
    ],
    'Finanzas': [
      ['ID_Movimiento', 'Numero_SAC', 'Fecha_Registro', 'Fecha_Vencimiento', 'Tipo_Movimiento', 'Detalle', 'Monto_Debe', 'Monto_Haber'],
    ],
    'Agenda_Plazos': [
      ['ID_Plazo', 'Numero_SAC', 'Descripcion_Tarea', 'Fecha_Vencimiento', 'Estado', 'Alerta_Mail_Enviada', 'Alerta_Push_Enviada'],
    ],
    'Biblioteca_Leyes': [
      ['ID_Ley', 'Ambito', 'Numero_Ley', 'Nombre_Breve', 'Articulo_Texto'],
    ],
    'Doctrina_Jurisprudencia': [
      ['ID_Cita', 'Fuero', 'Tema', 'Fuente_Autor', 'Texto_Cita_Literal'],
    ],
  };
  return mockData[sheetName] || [['Sin datos']];
}

// ==========================================
// EXPORTACIONES
// ==========================================

// Usamos module.exports para evitar que Webpack intente resolver las dependencias en el cliente
module.exports = {
  getSheetData,
  appendToSheet,
  getClientes,
  verificarUsuario,
  obtenerUsuarios,
};
