// lib/googleSheets.js
// Leer Google Sheets usando la API REST (sin googleapis)

const SHEETS_PUBLIC_URL = process.env.GOOGLE_SHEETS_PUBLIC_URL;

// Función para obtener todas las hojas en un solo CSV
async function fetchAllSheets() {
  if (!SHEETS_PUBLIC_URL) {
    console.error('No se encontró la variable GOOGLE_SHEETS_PUBLIC_URL');
    return null;
  }

  try {
    const response = await fetch(SHEETS_PUBLIC_URL);
    if (!response.ok) {
      throw new Error(`Error al obtener datos: ${response.status}`);
    }
    const csvText = await response.text();
    return csvText;
  } catch (error) {
    console.error('Error al leer Google Sheets:', error);
    return null;
  }
}

// Función para extraer una hoja específica del CSV completo
function extractSheet(csvText, sheetName) {
  if (!csvText) return getMockData(sheetName);

  // El CSV de Google Sheets con varias hojas tiene este formato:
  // "NombreHoja1",,,
  // datos,datos,datos
  // "NombreHoja2",,,
  // datos,datos,datos

  // Buscamos la hoja por su nombre
  const lines = csvText.split('\n');
  let sheetFound = false;
  const sheetLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Si encontramos una línea que empieza con el nombre de la hoja entre comillas
    if (line.startsWith(`"${sheetName}"`)) {
      sheetFound = true;
      // Saltamos la línea del nombre y empezamos a recolectar los datos
      continue;
    }
    // Si ya encontramos la hoja y la línea está vacía, significa que terminó esta hoja
    if (sheetFound && line === '') {
      break;
    }
    // Si encontramos otra hoja (empieza con comillas y no es la que buscamos) y ya estábamos en una hoja, terminamos
    if (sheetFound && line.startsWith('"') && !line.startsWith(`"${sheetName}"`)) {
      break;
    }
    if (sheetFound) {
      // Dividimos la línea por comas y limpiamos las comillas
      const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      sheetLines.push(cells);
    }
  }

  if (sheetLines.length === 0) {
    console.warn(`No se encontraron datos para la hoja: ${sheetName}`);
    return getMockData(sheetName);
  }

  return sheetLines;
}

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

export async function getSheetData(sheetName) {
  const csvText = await fetchAllSheets();
  return extractSheet(csvText, sheetName);
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
