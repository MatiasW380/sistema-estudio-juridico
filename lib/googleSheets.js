// lib/googleSheets.js
// Leer Google Sheets usando el enlace público CSV

const SHEETS_PUBLIC_URL = process.env.GOOGLE_SHEETS_PUBLIC_URL;

// Función para obtener el CSV completo desde el enlace público
async function fetchCSV() {
  if (!SHEETS_PUBLIC_URL) {
    console.error('❌ GOOGLE_SHEETS_PUBLIC_URL no está definida');
    return null;
  }

  try {
    const response = await fetch(SHEETS_PUBLIC_URL);
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status}`);
      return null;
    }
    const csvText = await response.text();
    return csvText;
  } catch (error) {
    console.error('❌ Error de red:', error);
    return null;
  }
}

// Función para extraer una hoja específica del CSV
function extractSheet(csvText, sheetName) {
  if (!csvText) {
    console.error(`❌ No hay datos para la hoja: ${sheetName}`);
    return [];
  }

  // El CSV de Google Sheets tiene un formato especial cuando hay varias hojas:
  // Las hojas se separan con líneas que empiezan con el nombre de la hoja.
  // Pero como nuestro enlace es para "Documento completo", todas las hojas vienen juntas.
  
  // Estrategia: buscar todas las líneas que NO sean nombres de hoja
  const lines = csvText.split('\n');
  const dataLines = [];
  let isFirstDataLine = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Si la línea está vacía, la saltamos
    if (line === '') continue;
    
    // Si la línea empieza con el nombre de la hoja entre comillas, es un marcador
    // Buscamos específicamente la hoja que queremos
    if (line.startsWith(`"${sheetName}"`)) {
      isFirstDataLine = true;
      continue;
    }
    
    // Si encontramos otra hoja (empieza con comillas) y no es la que buscamos, paramos
    if (isFirstDataLine && line.startsWith('"') && !line.startsWith(`"${sheetName}"`)) {
      break;
    }
    
    // Si estamos dentro de la hoja que buscamos, guardamos la línea
    if (isFirstDataLine) {
      // Dividimos por comas y limpiamos comillas
      const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      dataLines.push(cells);
    }
  }

  // Si no encontramos datos, intentamos con una estrategia alternativa:
  // Si el CSV tiene solo una hoja, todas las líneas son datos
  if (dataLines.length === 0 && lines.length > 0) {
    // Asumimos que la primera línea son encabezados
    const headers = lines[0].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    // Verificamos si los encabezados coinciden con la hoja que buscamos
    // (esto es solo para el caso de "Clientes_y_Expedientes")
    if (sheetName === 'Clientes_y_Expedientes' && headers.includes('ID_Cliente')) {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        const cells = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        if (cells.length > 0) {
          dataLines.push(cells);
        }
      }
      // Añadimos los encabezados al principio
      dataLines.unshift(headers);
    }
  }

  return dataLines;
}

// ==========================================
// FUNCIONES PRINCIPALES
// ==========================================

export async function getSheetData(sheetName) {
  const csvText = await fetchCSV();
  if (!csvText) {
    console.warn('⚠️ Usando datos de ejemplo (mock) porque no se pudo obtener el CSV');
    return getMockData(sheetName);
  }
  const data = extractSheet(csvText, sheetName);
  if (data.length === 0) {
    console.warn(`⚠️ No se encontraron datos para la hoja: ${sheetName}`);
    return getMockData(sheetName);
  }
  return data;
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
