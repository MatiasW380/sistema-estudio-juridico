// lib/googleSheets.js
// Este archivo maneja toda la comunicación con Google Sheets

import { google } from 'googleapis';

// Configuración de autenticación usando las credenciales de tu cuenta
// Nota: Para que esto funcione, necesitaremos crear un archivo de credenciales
// más adelante. Por ahora, es el esqueleto de la conexión.

// ID de tu planilla de Google Sheets
// Este ID lo obtenemos de la URL de la planilla
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// Función para obtener la autenticación
async function getAuthSheets() {
  // Por ahora, usaremos un placeholder.
  // En el próximo paso configuraremos la autenticación real.
  console.log('Conectando a Google Sheets...');
  return null;
}

// Función para leer datos de una pestaña específica
export async function getSheetData(sheetName) {
  try {
    const auth = await getAuthSheets();
    if (!auth) {
      // Si no hay autenticación, devolvemos datos de ejemplo para probar
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
    return [];
  }
}

// Función para escribir datos en una pestaña
export async function appendToSheet(sheetName, values) {
  try {
    const auth = await getAuthSheets();
    if (!auth) {
      console.log('Modo demo: no se puede escribir sin autenticación');
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
