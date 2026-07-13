// lib/googleSheets.js
// Conexión con Google Sheets usando cuenta de servicio

// @ts-nocheck
import { google } from 'googleapis';

// Obtener el ID de la planilla desde las variables de entorno
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Obtener las credenciales de la cuenta de servicio desde variables de entorno
const getAuthSheets = () => {
  try {
    // Las credenciales están guardadas como JSON en la variable de entorno
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
  const data = await getSheetData('Clientes_y_Expedientes');
  if (!data || data.length <= 1) return [];
  
  // La primera fila son los encabezados
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
