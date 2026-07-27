// lib/googleSheets.js
// Leer y escribir en Google Sheets y Google Drive usando Cuenta de Servicio

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
const ROOT_FOLDER_ID = '1YwxPvkNfV9-U2FhcrcBrEHrfO-4oxty7';

// ==========================================
// HELPERS
// ==========================================

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

function parseCompartidos(value) {
  return (value || '')
    .toString()
    .split(',')
    .map((v) => normalizeEmail(v))
    .filter(Boolean);
}

function hasColumn(headers, columnName) {
  return headers.includes(columnName);
}

function getSafe(obj, key) {
  return obj[key] || '';
}

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
      headers: { Authorization: `Bearer ${token}` },
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
    // Validación dura para Agenda: deben ser 17 columnas exactas
    if ((sheetName === 'Agenda' || sheetName === 'Agenda!A:Q') && values.length !== 17) {
      console.error(`❌ Agenda requiere 17 columnas exactas. Recibidas: ${values.length}`);
      return false;
    }

    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso');
      return false;
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}:append?valueInputOption=USER_ENTERED`;
    const body = JSON.stringify({ values: [values] });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });

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

export async function getClientes(usuario = null) {
  try {
    const data = await fetchSheetData('Clientes_y_Expedientes');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);
    const usuarioNorm = normalizeEmail(usuario);

    const clientesMap = new Map();

    rows.forEach((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });

      const id = getSafe(obj, 'ID_Cliente');
      if (!id) return;

      const numeroSAC = getSafe(obj, 'Numero_SAC').trim();
      const tieneExpediente = numeroSAC !== '';
      const compartidos = parseCompartidos(getSafe(obj, 'Usuarios_Compartidos'));

      const creadoPorRaw = hasColumn(headers, 'Creado_Por') ? getSafe(obj, 'Creado_Por') : '';
      const creadoPorNorm = normalizeEmail(creadoPorRaw);

      const esCreador = usuarioNorm ? creadoPorNorm === usuarioNorm : true;
      const esCompartido = usuarioNorm ? compartidos.includes(usuarioNorm) : true;
      const visibleParaUsuario = usuarioNorm ? esCreador || esCompartido : true;

      const clienteBase = {
        ID_Cliente: id,
        Nombre_Cliente: getSafe(obj, 'Nombre_Cliente'),
        Telefono: getSafe(obj, 'Telefono'),
        DNI: getSafe(obj, 'DNI'),
        Domicilio: getSafe(obj, 'Domicilio'),
        Numero_SAC: numeroSAC,
        Caratula: getSafe(obj, 'Caratula'),
        Fuero: getSafe(obj, 'Fuero'),
        ID_Carpeta_Drive: getSafe(obj, 'ID_Carpeta_Drive'),
        Usuarios_Compartidos: getSafe(obj, 'Usuarios_Compartidos'),
        Creado_Por: creadoPorRaw,
        totalExpedientes: 0,
        expedientes: [],
      };

      if (!clientesMap.has(id)) {
        clientesMap.set(id, clienteBase);
      }

      const cliente = clientesMap.get(id);

      if (tieneExpediente && visibleParaUsuario) {
        cliente.totalExpedientes += 1;
        cliente.expedientes.push({
          Numero_SAC: numeroSAC,
          Caratula: getSafe(obj, 'Caratula'),
          Fuero: getSafe(obj, 'Fuero'),
          ID_Carpeta_Drive: getSafe(obj, 'ID_Carpeta_Drive'),
          Usuarios_Compartidos: getSafe(obj, 'Usuarios_Compartidos'),
          Creado_Por: creadoPorRaw,
          Cliente: getSafe(obj, 'Nombre_Cliente'),
        });
      }
    });

    let clientes = Array.from(clientesMap.values());

    // Si hay usuario: mostrar sólo clientes con expedientes visibles
    // o clientes sin expediente creados por él (si existe columna Creado_Por)
    if (usuarioNorm) {
      clientes = clientes.filter((c) => {
        if (c.expedientes.length > 0) return true;
        const creadoPorCliente = normalizeEmail(c.Creado_Por || '');
        return creadoPorCliente && creadoPorCliente === usuarioNorm;
      });
    }

    return clientes;
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error.message);
    return [];
  }
}

export async function getNextClienteId() {
  try {
    const clientes = await getClientes();
    if (clientes.length === 0) return '1';

    const ids = clientes.map((c) => parseInt(c.ID_Cliente, 10)).filter((id) => !isNaN(id));
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
    return clientes.some((c) => c.DNI === dni && c.ID_Cliente !== excludeId);
  } catch (error) {
    console.error('❌ Error al verificar DNI:', error.message);
    return false;
  }
}

export async function buscarClientes(termino, usuario = null) {
  try {
    const clientes = await getClientes(usuario);
    if (!termino || termino.trim() === '') return clientes;

    const term = termino.toLowerCase().trim();
    return clientes.filter((c) => {
      const matchPrincipal =
        (c.Nombre_Cliente && c.Nombre_Cliente.toLowerCase().includes(term)) ||
        (c.DNI && c.DNI.includes(term)) ||
        (c.Telefono && c.Telefono.includes(term)) ||
        (c.ID_Cliente && c.ID_Cliente.includes(term)) ||
        (c.Domicilio && c.Domicilio.toLowerCase().includes(term));

      if (matchPrincipal) return true;

      if (c.expedientes && c.expedientes.length > 0) {
        return c.expedientes.some(
          (exp) =>
            (exp.Numero_SAC && exp.Numero_SAC.includes(term)) ||
            (exp.Caratula && exp.Caratula.toLowerCase().includes(term)) ||
            (exp.Cliente && exp.Cliente.toLowerCase().includes(term)),
        );
      }

      return false;
    });
  } catch (error) {
    console.error('❌ Error al buscar clientes:', error.message);
    return [];
  }
}

export async function crearCliente(nombre, telefono, dni, domicilio, creadoPor = '', usuariosCompartidos = '') {
  console.log('📤 ====== CREAR CLIENTE ======');

  try {
    if (dni && dni.trim() !== '') {
      const dniExiste = await verificarDNI(dni);
      if (dniExiste) {
        return { success: false, error: 'Ya existe un cliente con ese DNI' };
      }
    }

    const nuevoId = await getNextClienteId();

    // Si tu hoja todavía no tiene Creado_Por, esta columna extra puede no mapear.
    // Dejarla al final para minimizar impacto.
    const fila = [
      nuevoId, // ID_Cliente
      nombre || '', // Nombre_Cliente
      telefono || '', // Telefono
      dni || '', // DNI
      domicilio || '', // Domicilio
      '', // Numero_SAC
      '', // Caratula
      '', // Fuero
      '', // ID_Carpeta_Drive
      usuariosCompartidos || '', // Usuarios_Compartidos
      creadoPor || '', // Creado_Por (si existe en hoja)
    ];

    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);

    if (resultado) {
      return { success: true, id: nuevoId };
    }
    return { success: false, error: 'Error al guardar en la hoja de cálculo' };
  } catch (error) {
    console.error('❌ Error al crear cliente:', error.message);
    return { success: false, error: error.message };
  }
}

// ==========================================
// FUNCIONES DE USUARIOS
// ==========================================

export async function verificarUsuario(email, pin) {
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
    const emailTrimmed = normalizeEmail(email);

    const usuarioRow = rows.find((row) => normalizeEmail(row[emailIndex]) === emailTrimmed);

    if (!usuarioRow) return null;

    if (activoIndex !== -1 && (usuarioRow[activoIndex] || '').toString().trim().toLowerCase() !== 'si') {
      return null;
    }

    const pinGuardado = (usuarioRow[pinIndex] || '').toString().trim();
    if (pinGuardado !== pin) return null;

    return {
      email: usuarioRow[emailIndex],
      rol: usuarioRow[rolIndex] || 'usuario',
      activo: usuarioRow[activoIndex] || 'SI',
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
      .filter((row) => row[sacIndex] === numeroSAC)
      .map((row) => {
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

export async function agregarActuacion(
  numeroSAC,
  fecha,
  tipo,
  origen,
  contenido,
  presentado,
  enviado,
  tienePDF,
  idPDFDrive,
  esBorrador,
  creadoPor,
  compartidoCon,
) {
  try {
    const actuaciones = await getActuaciones(numeroSAC);
    const nextId = actuaciones.length > 0 ? String(Math.max(...actuaciones.map((a) => parseInt(a.ID, 10) || 0)) + 1) : '1';

    const fila = [
      nextId,
      numeroSAC || '',
      fecha || '',
      tipo || '',
      origen || '',
      contenido || '',
      presentado ? 'SI' : 'NO',
      enviado ? 'SI' : 'NO',
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
// FUNCIONES PARA CONSULTAS
// ==========================================

export async function getConsultas(numeroSAC = null) {
  try {
    const data = await fetchSheetData('Historia_Consultas');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    let consultas = rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (numeroSAC) {
      consultas = consultas.filter((c) => c.Numero_SAC === numeroSAC);
    }

    consultas.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
    return consultas;
  } catch (error) {
    console.error('❌ Error al obtener consultas:', error.message);
    return [];
  }
}

export async function agregarConsulta(numeroSAC, fecha, abogado, notas) {
  try {
    const consultas = await getConsultas();
    const nextId = consultas.length > 0 ? String(Math.max(...consultas.map((c) => parseInt(c.ID, 10) || 0)) + 1) : '1';

    const fila = [nextId, numeroSAC || '', fecha || new Date().toISOString().split('T')[0], abogado || '', notas || ''];

    return await appendToSheet('Historia_Consultas', fila);
  } catch (error) {
    console.error('❌ Error al agregar consulta:', error.message);
    return false;
  }
}

// ==========================================
// FUNCIONES DE FINANZAS
// ==========================================

async function buildSacToClienteMap() {
  const data = await fetchSheetData('Clientes_y_Expedientes');
  if (!data || data.length <= 1) return new Map();

  const headers = data[0];
  const rows = data.slice(1);

  const sacIdx = headers.indexOf('Numero_SAC');
  const clienteIdx = headers.indexOf('Nombre_Cliente');

  const map = new Map();
  rows.forEach((row) => {
    const sac = (row[sacIdx] || '').toString().trim();
    const cliente = (row[clienteIdx] || '').toString().trim();
    if (sac && cliente && !map.has(sac)) map.set(sac, cliente);
  });

  return map;
}

export async function getFinanzas(numeroSAC = null, categoria = null, estado = null, fechaInicio = null, fechaFin = null) {
  try {
    const data = await fetchSheetData('Finanzas');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);
    const sacToCliente = await buildSacToClienteMap();

    let finanzas = rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });

      const sac = obj.Numero_SAC || '';
      obj.Cliente = sacToCliente.get(sac) || '';

      return obj;
    });

    if (numeroSAC) finanzas = finanzas.filter((f) => f.Numero_SAC === numeroSAC);
    if (categoria) finanzas = finanzas.filter((f) => f.Categoria === categoria);
    if (estado) finanzas = finanzas.filter((f) => f.Estado === estado);
    if (fechaInicio) finanzas = finanzas.filter((f) => f.Fecha >= fechaInicio);
    if (fechaFin) finanzas = finanzas.filter((f) => f.Fecha <= fechaFin);

    finanzas.sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
    return finanzas;
  } catch (error) {
    console.error('❌ Error al obtener finanzas:', error.message);
    return [];
  }
}

export async function agregarFinanza(
  numeroSAC,
  tipo,
  referencia,
  fecha,
  fechaVencimiento,
  concepto,
  montoTotal,
  montoPagado,
  estado,
  categoria,
) {
  try {
    const finanzas = await getFinanzas();
    const nextId = finanzas.length > 0 ? String(Math.max(...finanzas.map((f) => parseInt(f.ID, 10) || 0)) + 1) : '1';

    const fila = [
      nextId,
      numeroSAC || '',
      tipo || '',
      referencia || '',
      fecha || '',
      fechaVencimiento || '',
      concepto || '',
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

export async function getResumenFinanzas(categoria = null, fechaInicio = null, fechaFin = null) {
  try {
    const finanzas = await getFinanzas(null, categoria, null, fechaInicio, fechaFin);

    let totalPendiente = 0;
    let totalPagado = 0;
    let totalParcial = 0;

    finanzas.forEach((f) => {
      const monto = parseFloat(f.Monto_Total) || 0;
      const pagado = parseFloat(f.Monto_Pagado) || 0;

      if (f.Estado === 'Pendiente') totalPendiente += monto - pagado;
      else if (f.Estado === 'Pagado') totalPagado += pagado;
      else if (f.Estado === 'Parcial') totalParcial += monto - pagado;
    });

    return { totalPendiente, totalPagado, totalParcial };
  } catch (error) {
    console.error('❌ Error al obtener resumen:', error.message);
    return { totalPendiente: 0, totalPagado: 0, totalParcial: 0 };
  }
}

// ==========================================
// FUNCIONES PARA JURISPRUDENCIA
// ==========================================

export async function getJurisprudencia(tema = null, subtema = null, q = null) {
  try {
    const data = await fetchSheetData('Jurisprudencia');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    let items = rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (tema) items = items.filter((i) => i.Tema?.toLowerCase().includes(tema.toLowerCase()));
    if (subtema) items = items.filter((i) => i.Subtema?.toLowerCase().includes(subtema.toLowerCase()));

    if (q && q.trim() !== '') {
      const query = q.toLowerCase().trim();
      items = items.filter((i) => {
        const temaVal = (i.Tema || '').toLowerCase();
        const subtemaVal = (i.Subtema || '').toLowerCase();
        const juzgadoVal = (i.Juzgado || '').toLowerCase();
        const citaVal = (i.Cita || '').toLowerCase();
        return temaVal.includes(query) || subtemaVal.includes(query) || juzgadoVal.includes(query) || citaVal.includes(query);
      });
    }

    items.sort((a, b) => new Date(b.Fecha_Agregado) - new Date(a.Fecha_Agregado));
    return items;
  } catch (error) {
    console.error('❌ Error al obtener jurisprudencia:', error.message);
    return [];
  }
}

export async function agregarJurisprudencia(tema, subtema, juzgado, cita) {
  try {
    const items = await getJurisprudencia();
    const nextId = items.length > 0 ? String(Math.max(...items.map((i) => parseInt(i.ID, 10) || 0)) + 1) : '1';

    const fecha = new Date().toISOString().split('T')[0];
    const fila = [nextId, tema || '', subtema || '', juzgado || '', cita || '', fecha];
    return await appendToSheet('Jurisprudencia', fila);
  } catch (error) {
    console.error('❌ Error al agregar jurisprudencia:', error.message);
    return false;
  }
}

// ==========================================
// FUNCIONES PARA LEYES
// ==========================================

export async function getLeyes(numero = null, jurisdiccion = null) {
  try {
    const data = await fetchSheetData('Leyes');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    let items = rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (numero) items = items.filter((i) => i.Numero?.toLowerCase().includes(numero.toLowerCase()));
    if (jurisdiccion) items = items.filter((i) => i.Jurisdiccion?.toLowerCase().includes(jurisdiccion.toLowerCase()));

    items.sort((a, b) => new Date(b.Fecha_Agregado) - new Date(a.Fecha_Agregado));
    return items;
  } catch (error) {
    console.error('❌ Error al obtener leyes:', error.message);
    return [];
  }
}

export async function agregarLey(numero, jurisdiccion, texto) {
  try {
    const items = await getLeyes();
    const nextId = items.length > 0 ? String(Math.max(...items.map((i) => parseInt(i.ID, 10) || 0)) + 1) : '1';

    const fecha = new Date().toISOString().split('T')[0];
    let textoFinal = texto || '';

    if (textoFinal.length > 40000) {
      textoFinal = `${textoFinal.substring(0, 40000)}\n... [texto truncado por límite de Google Sheets]`;
    }

    const fila = [nextId, numero || '', jurisdiccion || '', textoFinal, fecha];
    return await appendToSheet('Leyes', fila);
  } catch (error) {
    console.error('❌ Error al agregar ley:', error.message);
    return false;
  }
}

// ==========================================
// FUNCIONES PARA MODELOS DE ESCRITOS
// ==========================================

export async function getModelos(fuero = null) {
  try {
    const data = await fetchSheetData('Modelos_Escritos');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    let modelos = rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (fuero) modelos = modelos.filter((m) => m.Fuero === fuero);

    return modelos;
  } catch (error) {
    console.error('❌ Error al obtener modelos:', error.message);
    return [];
  }
}

export async function agregarModelo(nombre, fuero, contenido) {
  try {
    const modelos = await getModelos();
    const nextId = modelos.length > 0 ? String(Math.max(...modelos.map((m) => parseInt(m.ID, 10) || 0)) + 1) : '1';

    const fila = [nextId, nombre || '', fuero || '', contenido || ''];
    return await appendToSheet('Modelos_Escritos', fila);
  } catch (error) {
    console.error('❌ Error al agregar modelo:', error.message);
    return false;
  }
}

// ==========================================
// FUNCIONES DE AGENDA
// ==========================================

export async function getAgenda(filtros = {}) {
  try {
    const data = await fetchSheetData('Agenda');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);
    const usuarioNorm = normalizeEmail(filtros.usuario);

    let eventos = rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    // Completar cliente por SAC cuando venga vacío (para tareas urgentes y listados)
    const sacToCliente = await buildSacToClienteMap();
    eventos = eventos.map((e) => {
      if (!e.Cliente && e.Numero_SAC) {
        return { ...e, Cliente: sacToCliente.get(e.Numero_SAC) || '' };
      }
      return e;
    });

    if (filtros.numeroSAC) eventos = eventos.filter((e) => e.Numero_SAC === filtros.numeroSAC);
    if (filtros.cliente) eventos = eventos.filter((e) => (e.Cliente || '').toLowerCase().includes(filtros.cliente.toLowerCase()));
    if (filtros.tipo) eventos = eventos.filter((e) => e.Tipo === filtros.tipo);
    if (filtros.estado) eventos = eventos.filter((e) => e.Estado === filtros.estado);
    if (filtros.fechaInicio) eventos = eventos.filter((e) => e.Fecha >= filtros.fechaInicio);
    if (filtros.fechaFin) eventos = eventos.filter((e) => e.Fecha <= filtros.fechaFin);

    if (usuarioNorm) {
      eventos = eventos.filter((e) => {
        const creadoPorNorm = normalizeEmail(e.Creado_Por);
        const compartidos = parseCompartidos(e.Compartido_Con);
        return creadoPorNorm === usuarioNorm || compartidos.includes(usuarioNorm);
      });
    }

    eventos.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
    return eventos;
  } catch (error) {
    console.error('❌ Error al obtener agenda:', error.message);
    return [];
  }
}

export async function agregarEvento(
  numeroSAC,
  cliente,
  tipo,
  titulo,
  descripcion,
  fecha,
  hora,
  horaFin,
  lugar,
  recordatorio,
  diasAntes,
  estado,
  creadoPor,
  compartidoCon,
) {
  try {
    const eventos = await getAgenda();
    const nextId = eventos.length > 0 ? String(Math.max(...eventos.map((e) => parseInt(e.ID, 10) || 0)) + 1) : '1';

    let clienteFinal = cliente || '';
    if (!clienteFinal && numeroSAC) {
      const sacToCliente = await buildSacToClienteMap();
      clienteFinal = sacToCliente.get(numeroSAC) || '';
    }

    const fila = [
      nextId, // 1. ID
      numeroSAC || '', // 2. Numero_SAC
      clienteFinal, // 3. Cliente
      tipo || 'Otro', // 4. Tipo
      titulo || '', // 5. Titulo
      descripcion || '', // 6. Descripción
      fecha || '', // 7. Fecha
      hora || '', // 8. Hora
      horaFin || '', // 9. Hora_Fin
      lugar || '', // 10. Lugar
      recordatorio || 'SI', // 11. Recordatorio
      diasAntes || '1', // 12. Dias_Antes
      estado || 'Pendiente', // 13. Estado
      creadoPor || '', // 14. Creado_Por
      compartidoCon || '', // 15. Compartido_Con
      'NO', // 16. Notificacion_Enviada
      '', // 17. Google_Calendar_ID
    ];

    return await appendToSheet('Agenda!A:Q', fila);
  } catch (error) {
    console.error('❌ Error al agregar evento:', error.message);
    return false;
  }
}

export async function getTareasPendientes(usuario) {
  try {
    const eventos = await getAgenda({
      estado: 'Pendiente',
      usuario,
    });

    return eventos.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
  } catch (error) {
    console.error('❌ Error al obtener tareas pendientes:', error.message);
    return [];
  }
}

// ==========================================
// FUNCIONES DE AGENDA (PLAZOS)
// ==========================================

export async function getPlazos(numeroSAC = null, usuario = null) {
  try {
    const eventos = await getAgenda({ usuario });
    let plazos = eventos.filter((p) => p.Tipo === 'Plazo');

    if (numeroSAC) {
      plazos = plazos.filter((p) => p.Numero_SAC === numeroSAC);
    }

    // OJO: en tu estructura real la fecha está en "Fecha", no "Fecha_Vencimiento"
    return plazos.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));
  } catch (error) {
    console.error('❌ Error al obtener plazos:', error.message);
    return [];
  }
}

export async function agregarPlazo(numeroSAC, descripcion, fechaVencimiento, creadoPor, compartidoCon = '') {
  try {
    const plazos = await getPlazos();
    const nextId = plazos.length > 0 ? String(Math.max(...plazos.map((p) => parseInt(p.ID, 10) || 0)) + 1) : '1';

    const sacToCliente = await buildSacToClienteMap();
    const cliente = numeroSAC ? sacToCliente.get(numeroSAC) || '' : '';

    const fila = [
      nextId, // 1. ID
      numeroSAC || '', // 2. Numero_SAC
      cliente, // 3. Cliente
      'Plazo', // 4. Tipo
      descripcion || '', // 5. Titulo
      '', // 6. Descripción
      fechaVencimiento || '', // 7. Fecha
      '', // 8. Hora
      '', // 9. Hora_Fin
      '', // 10. Lugar
      'SI', // 11. Recordatorio
      '1', // 12. Dias_Antes
      'Pendiente', // 13. Estado
      creadoPor || '', // 14. Creado_Por
      compartidoCon || '', // 15. Compartido_Con
      'NO', // 16. Notificacion_Enviada
      '', // 17. Google_Calendar_ID
    ];

    return await appendToSheet('Agenda!A:Q', fila);
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
        Authorization: `Bearer ${token}`,
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
      headers: { Authorization: `Bearer ${token}` },
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
// FUNCIONES PARA IA Y CORRECCIONES
// ==========================================

export async function guardarCorreccionIA(numeroSAC, tipo, promptOriginal, textoGenerado, textoCorregido, usuario) {
  try {
    const data = await fetchSheetData('Correcciones_IA');
    const nextId = data && data.length > 1 ? String(parseInt(data[data.length - 1][0] || '0', 10) + 1) : '1';

    const fecha = new Date().toISOString().split('T')[0];
    const fila = [
      nextId,
      numeroSAC || '',
      tipo || 'Escrito',
      promptOriginal || '',
      textoGenerado || '',
      textoCorregido || '',
      fecha,
      usuario || '',
    ];

    return await appendToSheet('Correcciones_IA', fila);
  } catch (error) {
    console.error('❌ Error al guardar corrección IA:', error.message);
    return false;
  }
}

// ==========================================
// DATOS DE EJEMPLO (MOCK)
// ==========================================

function getMockData(sheetName) {
  const mockData = {
    Clientes_y_Expedientes: [
      [
        'ID_Cliente',
        'Nombre_Cliente',
        'Telefono',
        'DNI',
        'Domicilio',
        'Numero_SAC',
        'Caratula',
        'Fuero',
        'ID_Carpeta_Drive',
        'Usuarios_Compartidos',
        'Creado_Por',
      ],
      ['1', 'Juan Lopez', '35178722', '12345678', 'Calle Falsa 123', '', '', '', '', '', 'matiasbaronetto@gmail.com'],
    ],
    Usuarios: [
      ['Email', 'PIN_Hash', 'Rol', 'Activo'],
      ['matiasbaronetto@gmail.com', '3543', 'admin', 'SI'],
      ['sofiaonassis@gmail.com', '8728', 'usuario', 'SI'],
    ],
    Actuaciones: [
      [
        'ID',
        'Numero_SAC',
        'Fecha',
        'Tipo',
        'Origen',
        'Contenido',
        'Presentado',
        'Enviado',
        'Tiene_PDF',
        'ID_PDF_Drive',
        'Es_Borrador',
        'Creado_Por',
        'Compartido_Con',
      ],
    ],
    Modelos_Escritos: [['ID', 'Nombre', 'Fuero', 'Contenido']],
    Agenda: [
      [
        'ID',
        'Numero_SAC',
        'Cliente',
        'Tipo',
        'Titulo',
        'Descripción',
        'Fecha',
        'Hora',
        'Hora_Fin',
        'Lugar',
        'Recordatorio',
        'Dias_Antes',
        'Estado',
        'Creado_Por',
        'Compartido_Con',
        'Notificacion_Enviada',
        'Google_Calendar_ID',
      ],
    ],
    Finanzas: [
      [
        'ID',
        'Numero_SAC',
        'Tipo',
        'Referencia',
        'Fecha',
        'Fecha_Vencimiento',
        'Concepto',
        'Monto_Total',
        'Monto_Pagado',
        'Estado',
        'Categoria',
      ],
    ],
    Jurisprudencia: [['ID', 'Tema', 'Subtema', 'Juzgado', 'Cita', 'Fecha_Agregado']],
    Leyes: [['ID', 'Numero', 'Jurisdiccion', 'Texto', 'Fecha_Agregado']],
    Correcciones_IA: [['ID', 'Numero_SAC', 'Tipo', 'Prompt_Original', 'Texto_Generado', 'Texto_Corregido', 'Fecha', 'Usuario']],
    Historia_Consultas: [['ID', 'Numero_SAC', 'Fecha', 'Abogado', 'Notas']],
  };

  return mockData[sheetName] || [['Sin datos']];
}
