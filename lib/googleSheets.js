// lib/googleSheets.js
// Leer y escribir en Google Sheets y Google Drive usando Cuenta de Servicio

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
const ROOT_FOLDER_ID = '1YwxPvkNfV9-U2FhcrcBrEHrfO-4oxty7';

// ==========================================
// FUNCIONES DE AUTENTICACIÓN Y TOKEN
// ==========================================

export async function getAccessToken() {
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
// FUNCIONES DE GOOGLE SHEETS (GENÉRICAS)
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
  console.log('📤 ====== APPEND TO SHEET ======');
  console.log('📤 sheetName:', sheetName);
  console.log('📤 values:', JSON.stringify(values));
  console.log('📤 values.length:', values.length);
  
  try {
    console.log('🔑 Obteniendo token...');
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso');
      return false;
    }
    console.log('✅ Token obtenido');

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}:append?valueInputOption=USER_ENTERED`;
    console.log('📤 URL:', url);

    const body = JSON.stringify({ values: [values] });
    console.log('📤 Body length:', body.length);
    console.log('📤 Body (primeros 200 chars):', body.substring(0, 200));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body,
    });

    console.log('📤 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP en escritura: ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Datos escritos correctamente:', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('❌ Error al escribir datos:', error.message);
    console.error('❌ Stack:', error.stack);
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

      const tieneExpediente = obj.Numero_SAC && obj.Numero_SAC.trim() !== '';

      if (!clientesMap.has(id)) {
        const nuevoCliente = {
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
          totalExpedientes: 0,
          expedientes: []
        };

        if (tieneExpediente) {
          nuevoCliente.totalExpedientes = 1;
          nuevoCliente.expedientes.push({
            Numero_SAC: obj.Numero_SAC,
            Caratula: obj.Caratula,
            Fuero: obj.Fuero,
            ID_Carpeta_Drive: obj.ID_Carpeta_Drive || '',
          });
        }

        clientesMap.set(id, nuevoCliente);
      } else {
        const cliente = clientesMap.get(id);
        if (tieneExpediente) {
          cliente.totalExpedientes += 1;
          cliente.expedientes.push({
            Numero_SAC: obj.Numero_SAC,
            Caratula: obj.Caratula,
            Fuero: obj.Fuero,
            ID_Carpeta_Drive: obj.ID_Carpeta_Drive || '',
          });
        }
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
      const matchPrincipal = 
        (c.Nombre_Cliente && c.Nombre_Cliente.toLowerCase().includes(term)) ||
        (c.DNI && c.DNI.includes(term)) ||
        (c.Telefono && c.Telefono.includes(term)) ||
        (c.ID_Cliente && c.ID_Cliente.includes(term)) ||
        (c.Domicilio && c.Domicilio.toLowerCase().includes(term));
      
      if (matchPrincipal) return true;
      
      if (c.expedientes && c.expedientes.length > 0) {
        return c.expedientes.some(exp => 
          (exp.Numero_SAC && exp.Numero_SAC.includes(term)) ||
          (exp.Caratula && exp.Caratula.toLowerCase().includes(term))
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
  console.log('📤 ====== CREAR CLIENTE ======');
  console.log('📤 nombre:', nombre);
  console.log('📤 telefono:', telefono);
  console.log('📤 dni:', dni);
  console.log('📤 domicilio:', domicilio);
  
  try {
    // Verificar DNI duplicado (si se proporcionó)
    if (dni && dni.trim() !== '') {
      console.log('🔍 Verificando DNI:', dni);
      const dniExiste = await verificarDNI(dni);
      if (dniExiste) {
        console.log('❌ DNI duplicado');
        return { success: false, error: 'Ya existe un cliente con ese DNI' };
      }
      console.log('✅ DNI no duplicado');
    }

    console.log('🔍 Obteniendo próximo ID...');
    const nuevoId = await getNextClienteId();
    console.log('📋 Nuevo ID:', nuevoId);

    // La hoja tiene 10 columnas
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

    console.log('📤 Fila a guardar:', JSON.stringify(fila));
    console.log('📤 Fila length:', fila.length);

    console.log('📤 Llamando a appendToSheet...');
    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);
    console.log('📤 Resultado de appendToSheet:', resultado);
    
    if (resultado) {
      console.log('✅ Cliente creado correctamente, ID:', nuevoId);
      return { success: true, id: nuevoId };
    } else {
      console.error('❌ appendToSheet devolvió false');
      return { success: false, error: 'Error al guardar en la hoja de cálculo' };
    }
  } catch (error) {
    console.error('❌ Error al crear cliente:', error.message);
    console.error('❌ Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// ==========================================
// FUNCIONES DE USUARIOS
// ==========================================

export async function verificarUsuario(email, pin) {
  console.log('🔍 Verificando usuario:', email);
  
  try {
    const data = await fetchSheetData('Usuarios');
    if (!data || data.length <= 1) {
      console.error('❌ No se encontró la pestaña Usuarios');
      return null;
    }

    const headers = data[0];
    const emailIndex = headers.indexOf('Email');
    const pinIndex = headers.indexOf('PIN_Hash');
    const rolIndex = headers.indexOf('Rol');
    const activoIndex = headers.indexOf('Activo');

    if (emailIndex === -1 || pinIndex === -1) {
      console.error('❌ Columnas Email o PIN_Hash no encontradas');
      return null;
    }

    const rows = data.slice(1);
    const emailTrimmed = email.trim();
    const usuarioRow = rows.find(row => {
      const rowEmail = row[emailIndex] ? row[emailIndex].toString().trim() : '';
      return rowEmail.toLowerCase() === emailTrimmed.toLowerCase();
    });

    if (!usuarioRow) {
      console.error('❌ Usuario no encontrado');
      return null;
    }

    if (activoIndex !== -1 && usuarioRow[activoIndex]?.toLowerCase() !== 'si') {
      console.error('❌ Usuario inactivo');
      return null;
    }

    const pinGuardado = usuarioRow[pinIndex] ? usuarioRow[pinIndex].toString().trim() : '';
    if (pinGuardado !== pin) {
      console.error('❌ PIN incorrecto');
      return null;
    }

    return {
      email: usuarioRow[emailIndex],
      rol: usuarioRow[rolIndex] || 'usuario',
      activo: usuarioRow[activoIndex] || 'SI'
    };
  } catch (error) {
    console.error('❌ Error al verificar usuario:', error);
    return null;
  }
}

// ==========================================
// FUNCIONES DE ACTUACIONES
// ==========================================

export async function getActuaciones(numeroSAC) {
  try {
    const data = await fetchSheetData('Actuaciones');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);
    
    const sacIndex = headers.indexOf('Numero_SAC');
    if (sacIndex === -1) return [];

    return rows
      .filter(row => row[sacIndex] === numeroSAC)
      .map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      })
      .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
  } catch (error) {
    console.error('❌ Error al obtener actuaciones:', error.message);
    return [];
  }
}

export async function agregarActuacion(numeroSAC, fecha, tipo, origen, contenido, presentado, tienePDF, idPDFDrive, esBorrador, creadoPor, compartidoCon) {
  try {
    const actuaciones = await getActuaciones(numeroSAC);
    const nextId = actuaciones.length > 0 
      ? String(Math.max(...actuaciones.map(a => parseInt(a.ID) || 0)) + 1)
      : '1';

    const fila = [
      nextId,
      numeroSAC,
      fecha,
      tipo,
      origen,
      contenido,
      presentado ? 'SI' : 'NO',
      tienePDF ? 'SI' : 'NO',
      idPDFDrive || '',
      esBorrador ? 'SI' : 'NO',
      creadoPor || '',
      compartidoCon || '',
    ];

    return await appendToSheet('Actuaciones', fila);
  } catch (error) {
    console.error('❌ Error al agregar actuación:', error.message);
    return false;
  }
}

// ==========================================
// FUNCIONES DE MODELOS DE ESCRITOS
// ==========================================

export async function getModelos(fuero = null) {
  try {
    const data = await fetchSheetData('Modelos_Escritos');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);
    const fueroIndex = headers.indexOf('Fuero');

    let modelos = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (fuero) {
      modelos = modelos.filter(m => m.Fuero === fuero);
    }

    return modelos;
  } catch (error) {
    console.error('❌ Error al obtener modelos:', error.message);
    return [];
  }
}

export async function agregarModelo(nombre, fuero, contenido) {
  try {
    const modelos = await getModelos();
    const nextId = modelos.length > 0 
      ? String(Math.max(...modelos.map(m => parseInt(m.ID) || 0)) + 1)
      : '1';

    const fila = [nextId, nombre, fuero, contenido];
    return await appendToSheet('Modelos_Escritos', fila);
  } catch (error) {
    console.error('❌ Error al agregar modelo:', error.message);
    return false;
  }
}

// ==========================================
// FUNCIONES DE AGENDA
// ==========================================

export async function getPlazos(numeroSAC = null) {
  try {
    const data = await fetchSheetData('Agenda');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);
    const sacIndex = headers.indexOf('Numero_SAC');

    let plazos = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (numeroSAC) {
      plazos = plazos.filter(p => p.Numero_SAC === numeroSAC);
    }

    return plazos.sort((a, b) => new Date(a.Fecha_Vencimiento) - new Date(b.Fecha_Vencimiento));
  } catch (error) {
    console.error('❌ Error al obtener plazos:', error.message);
    return [];
  }
}

export async function agregarPlazo(numeroSAC, descripcion, fechaVencimiento, creadoPor) {
  try {
    const plazos = await getPlazos();
    const nextId = plazos.length > 0 
      ? String(Math.max(...plazos.map(p => parseInt(p.ID) || 0)) + 1)
      : '1';

    const fila = [nextId, numeroSAC, descripcion, fechaVencimiento, 'Pendiente', 'NO', creadoPor];
    return await appendToSheet('Agenda', fila);
  } catch (error) {
    console.error('❌ Error al agregar plazo:', error.message);
    return false;
  }
}

// ==========================================
// FUNCIONES DE DRIVE
// ==========================================

async function getRootFolderId() {
  console.log(`📁 Usando ROOT_FOLDER_ID fijo: ${ROOT_FOLDER_ID}`);
  return ROOT_FOLDER_ID;
}

export async function crearCarpetaExpediente(numeroSAC, caratula) {
  console.log(`📁 crearCarpetaExpediente: ${numeroSAC} - ${caratula}`);
  
  try {
    const rootFolderId = await getRootFolderId();
    if (!rootFolderId) {
      console.error('❌ No se encontró la carpeta raíz');
      return null;
    }

    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso');
      return null;
    }

    const nombreCarpeta = `${numeroSAC} - ${caratula}`;
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

// ==========================================
// FUNCIONES DE FINANZAS (NUEVA VERSIÓN)
// ==========================================

export async function getFinanzas(numeroSAC = null, categoria = null, estado = null, fechaInicio = null, fechaFin = null) {
  try {
    const data = await fetchSheetData('Finanzas');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    let finanzas = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (numeroSAC) {
      finanzas = finanzas.filter(f => f.Numero_SAC === numeroSAC);
    }
    if (categoria) {
      finanzas = finanzas.filter(f => f.Categoria === categoria);
    }
    if (estado) {
      finanzas = finanzas.filter(f => f.Estado === estado);
    }
    if (fechaInicio) {
      finanzas = finanzas.filter(f => f.Fecha >= fechaInicio);
    }
    if (fechaFin) {
      finanzas = finanzas.filter(f => f.Fecha <= fechaFin);
    }

    finanzas.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
    return finanzas;
  } catch (error) {
    console.error('❌ Error al obtener finanzas:', error.message);
    return [];
  }
}

export async function agregarFinanza(numeroSAC, tipo, referencia, fecha, fechaVencimiento, concepto, montoTotal, montoPagado, estado, categoria) {
  try {
    const finanzas = await getFinanzas();
    const nextId = finanzas.length > 0 
      ? String(Math.max(...finanzas.map(f => parseInt(f.ID) || 0)) + 1)
      : '1';

    const fila = [
      nextId,
      numeroSAC,
      tipo,
      referencia || '',
      fecha,
      fechaVencimiento || '',
      concepto,
      montoTotal || '',
      montoPagado || '',
      estado || 'Pendiente',
      categoria || 'Honorarios',
    ];

    return await appendToSheet('Finanzas', fila);
  } catch (error) {
    console.error('❌ Error al agregar finanza:', error.message);
    return false;
  }
}

export async function actualizarFinanza(id, campos) {
  // Esta función actualizará una fila específica
  // La implementaremos más adelante
  console.log('🔧 actualizarFinanza pendiente de implementación');
  return false;
}

export async function getResumenFinanzas(categoria = null, fechaInicio = null, fechaFin = null) {
  try {
    const finanzas = await getFinanzas(null, categoria, null, fechaInicio, fechaFin);
    
    let totalPendiente = 0;
    let totalPagado = 0;
    let totalParcial = 0;

    finanzas.forEach(f => {
      const monto = parseFloat(f.Monto_Total) || 0;
      const pagado = parseFloat(f.Monto_Pagado) || 0;
      
      if (f.Estado === 'Pendiente') {
        totalPendiente += monto - pagado;
      } else if (f.Estado === 'Pagado') {
        totalPagado += pagado;
      } else if (f.Estado === 'Parcial') {
        totalParcial += monto - pagado;
      }
    });

    return { totalPendiente, totalPagado, totalParcial };
  } catch (error) {
    console.error('❌ Error al obtener resumen:', error.message);
    return { totalPendiente: 0, totalPagado: 0, totalParcial: 0 };
  }
}
// ==========================================
// DATOS DE EJEMPLO (MOCK)
// ==========================================

function getMockData(sheetName) {
  const mockData = {
    'Clientes_y_Expedientes': [
      ['ID_Cliente', 'Nombre_Cliente', 'Telefono', 'DNI', 'Domicilio', 'Numero_SAC', 'Caratula', 'Fuero', 'ID_Carpeta_Drive', 'Usuarios_Compartidos'],
      ['1', 'Juan Lopez', '35178722', '12345678', 'Calle Falsa 123', '', '', '', '', ''],
    ],
    'Usuarios': [
      ['Email', 'PIN_Hash', 'Rol', 'Activo'],
      ['matiasbaronetto@gmail.com', '3543', 'admin', 'SI'],
    ],
    'Actuaciones': [
      ['ID', 'Numero_SAC', 'Fecha', 'Tipo', 'Origen', 'Contenido', 'Presentado', 'Tiene_PDF', 'ID_PDF_Drive', 'Es_Borrador', 'Creado_Por', 'Compartido_Con'],
    ],
    'Modelos_Escritos': [
      ['ID', 'Nombre', 'Fuero', 'Contenido'],
    ],
    'Agenda': [
      ['ID', 'Numero_SAC', 'Descripcion', 'Fecha_Vencimiento', 'Estado', 'Notificacion_Enviada', 'Creado_Por'],
    ],
  };
  return mockData[sheetName] || [['Sin datos']];
}
