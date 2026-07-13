// lib/googleSheets.js
// Conexión con Google Sheets usando cuenta de servicio (SOLO SERVIDOR)

// Verificamos que esto solo se ejecute en el servidor
const isServer = typeof window === 'undefined';

// Si estamos en el servidor, importamos googleapis
let google;
if (isServer) {
  google = require('googleapis').google;
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Obtener las credenciales de la cuenta de servicio desde variables de entorno
const getAuthSheets = () => {
  if (!isServer) {
    console.warn('getAuthSheets solo debe ejecutarse en el servidor');
    return null;
  }
  
  try {
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
      ['ID_Cliente', 'Nombre_Cliente', 'Telefono', 'Numero_SAC', 'Caratula', 'Fuero', 'ID_Carpeta_Drive'],
      ['1', 'Juan Lopez', '35178722', '', '', '', ''],
      ['2', 'Maria Gonzalez', '32832424', '', '', '', ''],
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

// Función para obtener datos de clientes (función auxiliar)
export async function getClientes() {
  if (!isServer) {
    return [];
  }
  
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
}
