// lib/googleSheets.js
// Leer y escribir en Google Sheets y Google Drive usando Cuenta de Servicio

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
const ROOT_FOLDER_ID = '1YwxPvkNfV9-U2FhcrcBrEHrfO-4oxty7';

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

    console.log(`✅ Cuenta de servicio: ${client_email}`);

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

// ==========================================
// FUNCIONES DE CLIENTES
// ==========================================

export async function getClientes() {
  try {
    const data = await fetchSheetData('Clientes_y_Expedientes');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    const clientesMap = new Map();

    rows.forEach(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });

      const id = obj.ID_Cliente;
      if (!id) return;

      if (!clientesMap.has(id)) {
        clientesMap.set(id, {
          ID_Cliente: id,
          Nombre_Cliente: obj.Nombre_Cliente,
          Telefono: obj.Telefono,
          DNI: obj.DNI || '',
          Domicilio: obj.Domicilio || '',
          Numero_SAC: obj.Numero_SAC,
          Caratula: obj.Caratula,
          Fuero: obj.Fuero,
          ID_Carpeta_Drive: obj.ID_Carpeta_Drive || '',
          Usuarios_Compartidos: obj.Usuarios_Compartidos || '',
          totalExpedientes: 1,
          expedientes: [{
            Numero_SAC: obj.Numero_SAC,
            Caratula: obj.Caratula,
            Fuero: obj.Fuero,
            ID_Carpeta_Drive: obj.ID_Carpeta_Drive || '',
          }]
        });
      } else {
        const cliente = clientesMap.get(id);
        cliente.totalExpedientes += 1;
        cliente.expedientes.push({
          Numero_SAC: obj.Numero_SAC,
          Caratula: obj.Caratula,
          Fuero: obj.Fuero,
          ID_Carpeta_Drive: obj.ID_Carpeta_Drive || '',
        });
      }
    });

    return Array.from(clientesMap.values());
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error.message);
    return [];
  }
}

export async function getNextClienteId() {
  try {
    const clientes = await getClientes();
    if (clientes.length === 0) return '1';
    
    const ids = clientes.map(c => parseInt(c.ID_Cliente)).filter(id => !isNaN(id));
    if (ids.length === 0) return '1';
    
    const maxId = Math.max(...ids);
    return String(maxId + 1);
  } catch (error) {
    console.error('❌ Error al obtener próximo ID:', error.message);
    return '1';
  }
}

export async function verificarDNI(dni, excludeId = null) {
  try {
    const clientes = await getClientes();
    return clientes.some(c => c.DNI === dni && c.ID_Cliente !== excludeId);
  } catch (error) {
    console.error('❌ Error al verificar DNI:', error.message);
    return false;
  }
}

export async function buscarClientes(termino) {
  try {
    const clientes = await getClientes();
    if (!termino || termino.trim() === '') return clientes;
    
    const term = termino.toLowerCase().trim();
    return clientes.filter(c => {
      // Buscar en campos principales del cliente (insensible a mayúsculas)
      const matchPrincipal = 
        c.Nombre_Cliente?.toLowerCase().includes(term) ||
        c.DNI?.includes(term) ||
        c.Telefono?.includes(term) ||
        c.ID_Cliente?.includes(term) ||
        c.Domicilio?.toLowerCase().includes(term);
      
      if (matchPrincipal) return true;
      
      // Buscar en los expedientes del cliente
      if (c.expedientes && c.expedientes.length > 0) {
        return c.expedientes.some(exp => 
          exp.Numero_SAC?.includes(term) ||
          exp.Caratula?.toLowerCase().includes(term)
        );
      }
      
      return false;
    });
  } catch (error) {
    console.error('❌ Error al buscar clientes:', error.message);
    return [];
  }
}

export async function crearCliente(nombre, telefono, dni, domicilio) {
  try {
    // Verificar DNI duplicado (si se proporcionó)
    if (dni && dni.trim() !== '') {
      const dniExiste = await verificarDNI(dni);
      if (dniExiste) {
        return { success: false, error: 'Ya existe un cliente con ese DNI' };
      }
    }

    const nuevoId = await getNextClienteId();

    // La hoja tiene 10 columnas: ID_Cliente, Nombre_Cliente, Telefono, DNI, Domicilio, Numero_SAC, Caratula, Fuero, ID_Carpeta_Drive, Usuarios_Compartidos
    const fila = [
      nuevoId,          // ID_Cliente
      nombre,           // Nombre_Cliente
      telefono || '',   // Telefono
      dni || '',        // DNI
      domicilio || '',  // Domicilio
      '',               // Numero_SAC (vacío)
      '',               // Caratula (vacío)
      '',               // Fuero (vacío)
      '',               // ID_Carpeta_Drive (vacío)
      '',               // Usuarios_Compartidos (vacío)
    ];

    console.log('📤 Creando cliente con fila:', fila);

    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);
    
    if (resultado) {
      return { success: true, id: nuevoId };
    } else {
      return { success: false, error: 'Error al guardar en la hoja de cálculo' };
    }
  } catch (error) {
    console.error('❌ Error al crear cliente:', error.message);
    return { success: false, error: error.message };
  }
}

// ==========================================
// FUNCIONES DE AUTENTICACIÓN Y DRIVE
// ==========================================

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

async function getRootFolderId() {
  console.log(`📁 Usando ROOT_FOLDER_ID fijo: ${ROOT_FOLDER_ID}`);
  return ROOT_FOLDER_ID;
}

export async function crearCarpetaExpediente(numeroSAC, caratula) {
  console.log(`📁 crearCarpetaExpediente: ${numeroSAC} - ${caratula}`);
  
  try {
    const rootFolderId = await getRootFolderId();
    if (!rootFolderId) {
      console.error('❌ PASO 1 FALLÓ: ROOT_FOLDER_ID no está definido');
      return null;
    }
    console.log(`✅ Root folder ID = ${rootFolderId}`);

    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso para Drive');
      return null;
    }

    const nombreCarpeta = `${numeroSAC} - ${caratula}`;
    console.log(`📁 Creando carpeta "${nombreCarpeta}"`);

    const url = `https://www.googleapis.com/drive/v3/files`;
    const requestBody = {
      name: nombreCarpeta,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
      ['ID_Cliente', 'Nombre_Cliente', 'Telefono', 'DNI', 'Domicilio', 'Numero_SAC', 'Caratula', 'Fuero', 'ID_Carpeta_Drive', 'Usuarios_Compartidos'],
      ['1', 'Juan Lopez', '35178722', '12345678', 'Calle Falsa 123', '123456', 'Lopez c/ Molina', 'Familia', '', ''],
      ['2', 'Maria Gonzalez', '32832424', '87654321', 'Av. Siempreviva 742', '123455', 'Gonzalez c/ Cafure', 'Familia', '', ''],
    ],
    'Usuarios': [
      ['Email', 'PIN_Hash', 'Rol', 'Activo'],
      ['matiasbaronetto@gmail.com', '3543', 'admin', 'SI'],
    ],
  };
  return mockData[sheetName] || [['Sin datos']];
}
