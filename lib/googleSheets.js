// lib/googleSheets.js
// Conexión con Google Sheets usando cuenta de servicio (SOLO SERVIDOR)
// Este archivo solo se ejecuta en el servidor, nunca en el navegador.

const isServer = typeof window === 'undefined';

// Importamos googleapis solo si estamos en el servidor
let google;
if (isServer) {
  google = require('googleapis').google;
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Obtener las credenciales de la cuenta de servicio desde variables de entorno
const getAuthSheets = () => {
  // Si no estamos en el servidor, devolvemos null
  if (!isServer) {
    console.warn('getAuthSheets solo debe ejecutarse en el servidor');
    return null;
  }
  
  try {
    // Parsear las credenciales desde la variable de entorno
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
};

// Función para leer datos de una pestaña específica
export async function getSheetData(sheetName) {
  // Si no estamos en el servidor, devolvemos datos de ejemplo
  if (!isServer) {
    console.warn('getSheetData solo debe ejecutarse en el servidor');
    return getMockData(sheetName);
  }
  
  try {
    const auth = getAuthSheets();
    if (!auth) {
      console.error('No se pudo obtener autenticación');
      return getMockData(sheetName);
    }
    
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1:Z`,
    });
    
    return response.data.values || [];
  } catch (error) {
    console.error('Error al leer datos de Google Sheets:', error);
    return getMockData(sheetName);
  }
}

// Función para escribir datos en una pestaña
export async function appendToSheet(sheetName, values) {
  if (!isServer) {
    console.warn('appendToSheet solo debe ejecutarse en el servidor');
    return false;
  }
  
  try {
    const auth = getAuthSheets();
    if (!auth) {
      console.error('No se pudo obtener autenticación');
      return false;
    }
    
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
    console.error('Error al escribir en Google Sheets:', error);
    return false;
  }
}

// Datos de ejemplo para probar sin conexión real a Google
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
// FUNCIONES DE AUTENTICACIÓN (AHORA AQUÍ)
// ==========================================

// Función para verificar usuario (email + PIN)
export async function verificarUsuario(email, pin) {
  // Si no estamos en el servidor, devolvemos null (esto debería ejecutarse en getServerSideProps)
  if (!isServer) {
    console.warn('verificarUsuario solo debe ejecutarse en el servidor');
    return null;
  }
  
  try {
    // Leer la pestaña Usuarios
    const data = await getSheetData('Usuarios');
    if (!data || data.length <= 1) {
      console.error('No se encontró la pestaña Usuarios o está vacía');
      return null;
    }

    // Buscar el email en la planilla
    const headers = data[0];
    const emailIndex = headers.indexOf('Email');
    const pinIndex = headers.indexOf('PIN_Hash');
    const rolIndex = headers.indexOf('Rol');
    const activoIndex = headers.indexOf('Activo');

    if (emailIndex === -1 || pinIndex === -1) {
      console.error('La pestaña Usuarios no tiene las columnas Email o PIN_Hash');
      return null;
    }

    // Buscar el usuario por email
    const rows = data.slice(1);
    const usuarioRow = rows.find(row => row[emailIndex]?.toLowerCase() === email.toLowerCase());

    if (!usuarioRow) {
      console.error('Usuario no encontrado');
      return null;
    }

    // Verificar si el usuario está activo
    if (activoIndex !== -1 && usuarioRow[activoIndex]?.toLowerCase() !== 'si') {
      console.error('Usuario inactivo');
      return null;
    }

    // Verificar el PIN (por ahora en texto plano, luego se hasheará)
    const pinGuardado = usuarioRow[pinIndex] || '';
    if (pinGuardado !== pin) {
      console.error('PIN incorrecto');
      return null;
    }

    // Usuario válido
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

// Función para obtener todos los usuarios (solo para admin)
export async function obtenerUsuarios() {
  if (!isServer) {
    return [];
  }
  
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

// Función para agregar un nuevo usuario (solo admin)
export async function agregarUsuario(email, pin, rol = 'usuario') {
  if (!isServer) {
    return { success: false, error: 'Solo se puede ejecutar en el servidor' };
  }
  
  try {
    // Verificar que el email no exista ya
    const usuarios = await obtenerUsuarios();
    if (usuarios.some(u => u.Email?.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'El email ya está registrado' };
    }

    // Agregar a la planilla
    const values = [email, pin, rol, 'SI'];
    const result = await appendToSheet('Usuarios', values);
    
    if (result) {
      return { success: true };
    } else {
      return { success: false, error: 'Error al guardar en la planilla' };
    }
  } catch (error) {
    console.error('Error al agregar usuario:', error);
    return { success: false, error: error.message };
  }
}
