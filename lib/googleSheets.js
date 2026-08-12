// lib/googleSheets.js
// Módulo de conexión con Google Sheets y Google Drive (sin googleapis, compatible con Next/Vercel)

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
const ROOT_FOLDER_ID = '1YwxPvkNfV9-U2FhcrcBrEHrfO-4oxty7';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Normaliza una fila para la hoja Agenda a exactamente 17 columnas (A→Q)
 */
export function normalizarFilaAgenda(fila) {
  if (!Array.isArray(fila)) fila = [];
  if (fila.length > 17) fila = fila.slice(0, 17);
  while (fila.length < 17) fila.push('');
  return fila;
}

/**
 * Convierte cualquier entrada (2026-08-03, fecha de Sheets, etc) a DD/MM/AAAA
 */
export function formatearFechaArgentina(fecha) {
  if (!fecha) return '';
  const str = String(fecha).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  const soloFecha = str.split('T')[0];
  const partes = soloFecha.split('-');
  if (partes.length === 3) {
    const [anio, mes, dia] = partes;
    return `${dia}/${mes}/${anio}`;
  }
  return str;
}

/**
 * Convierte DD/MM/AAAA a YYYY-MM-DD para guardar en Sheets/DB (sin new Date())
 */
export function parsearFechaArgentina(fecha) {
  if (!fecha) return '';
  const str = String(fecha).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const partes = str.split('/');
  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return `${anio}-${mes}-${dia}`;
  }
  return str;
}

/**
 * Obtener la fecha de HOY en formato YYYY-MM-DD (sin desfase UTC)
 */
export function getFechaHoyISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Devuelve un objeto Date local a partir de una fecha sin sufrir desfase UTC
 */
function getFechaObj(fechaStr) {
  if (!fechaStr) return new Date(0);
  const isoStr = parsearFechaArgentina(fechaStr);
  if (typeof isoStr !== 'string' || !isoStr.includes('-')) return new Date(0);
  const partes = isoStr.split('-');
  if (partes.length === 3) {
    return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  }
  return new Date(0);
}

/**
 * Parseo robusto de usuarios compartidos
 */
function parseCompartidos(compartidosStr) {
  if (!compartidosStr) return [];
  return compartidosStr
    .split(',')
    .map((email) => (email || '').trim().toLowerCase())
    .filter((email) => email !== '');
}

function normalizeEmail(value) {
  return (value || '').toString().trim().toLowerCase();
}

/**
 * Verifica si un objeto es visible para un usuario
 */
function esVisibleParaUsuario(obj, usuario) {
  if (!usuario) return true;

  const usuarioLower = normalizeEmail(usuario);
  const creadoPor = normalizeEmail(obj.Creado_Por || '');

  if (creadoPor === usuarioLower) return true;

  const compartidos = parseCompartidos(obj.Usuarios_Compartidos || obj.Compartido_Con || '');
  return compartidos.includes(usuarioLower);
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, idx) => {
    obj[h] = row[idx] || '';
  });
  return obj;
}

// ============================================================
// AUTENTICACIÓN Y TOKENS
// ============================================================

/**
 * Obtiene un token de acceso para Google APIs usando Cuenta de Servicio
 * desde process.env.GOOGLE_SERVICE_ACCOUNT (JSON string)
 */
export async function getAccessToken() {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT no está definida');
      return null;
    }

    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    const { client_email, private_key } = credentials || {};

    if (!client_email || !private_key) {
      console.error('❌ Credenciales incompletas en GOOGLE_SERVICE_ACCOUNT');
      return null;
    }

    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const assertion = jwt.sign(payload, private_key, { algorithm: 'RS256' });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!response.ok) {
      console.error('❌ Error token:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('❌ Error al obtener token de acceso:', error.message);
    return null;
  }
}

// ============================================================
// FUNCIONES BASE DE LECTURA/ESCRITURA
// ============================================================

/**
 * Lee los datos de una hoja específica
 */
export async function readSheet(sheetName) {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error(`❌ Error al leer ${sheetName}:`, response.status, await response.text());
      return [];
    }

    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error(`❌ readSheet(${sheetName}):`, error.message);
    return [];
  }
}

/**
 * Agrega una o más filas a una hoja específica
 */
export async function appendToSheet(sheetName, values) {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ No se pudo obtener token de acceso');
      return false;
    }

    if (!Array.isArray(values)) {
      console.error('❌ values debe ser un array');
      return false;
    }

    let rows = values;
    if (!Array.isArray(rows[0])) rows = [rows];

    let range = sheetName;

    if (sheetName === 'Agenda') {
      range = 'Agenda!A1:Q';
      rows = rows.map((fila) => normalizarFilaAgenda(fila));
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    });

    if (!response.ok) {
      console.error('❌ Error en appendToSheet:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ appendToSheet:', error.message);
    return false;
  }
}

// ============================================================
// AGENDA Y EVENTOS
// ============================================================

export async function getAgenda(filtros = {}) {
  const { numeroSAC, cliente, tipo, estado, fechaInicio, fechaFin, usuario } = filtros;

  const rows = await readSheet('Agenda');
  if (rows.length < 2) return [];

  const headers = rows[0];
  let eventos = rows.slice(1).map((row) => rowToObject(headers, normalizarFilaAgenda(row)));

  if (numeroSAC) eventos = eventos.filter((e) => e.Numero_SAC === numeroSAC);
  if (cliente) eventos = eventos.filter((e) => (e.Cliente || '').toLowerCase().includes(cliente.toLowerCase()));
  if (tipo && tipo !== 'Todos') eventos = eventos.filter((e) => e.Tipo === tipo);
  if (estado && estado !== 'Todos') eventos = eventos.filter((e) => e.Estado === estado);
  if (fechaInicio) eventos = eventos.filter((e) => e.Fecha && e.Fecha >= fechaInicio);
  if (fechaFin) eventos = eventos.filter((e) => e.Fecha && e.Fecha <= fechaFin);
  if (usuario) eventos = eventos.filter((e) => esVisibleParaUsuario(e, usuario));

  // Enriquecer cliente por SAC si falta
  const sacToCliente = new Map();
  const clientes = await getClientes(usuario || null);
  clientes.forEach((c) => {
    (c.expedientes || []).forEach((exp) => {
      if (exp.Numero_SAC) sacToCliente.set(exp.Numero_SAC, c.Nombre_Cliente || '');
    });
  });

  eventos = eventos.map((e) => ({
    ...e,
    Cliente: e.Cliente || sacToCliente.get(e.Numero_SAC) || '',
  }));

  return eventos.sort((a, b) => getFechaObj(a.Fecha) - getFechaObj(b.Fecha));
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
  const eventos = await getAgenda();
  const numericIds = eventos.map((e) => parseInt(e.ID, 10)).filter((n) => !Number.isNaN(n));
  const id = numericIds.length ? String(Math.max(...numericIds) + 1) : '1';

  let clienteFinal = cliente || '';
  if (!clienteFinal && numeroSAC) {
    const clientes = await getClientes(creadoPor || null);
    for (const c of clientes) {
      const match = (c.expedientes || []).find((exp) => exp.Numero_SAC === numeroSAC);
      if (match) {
        clienteFinal = c.Nombre_Cliente || '';
        break;
      }
    }
  }

  const fila = normalizarFilaAgenda([
    id,                    // A: ID
    numeroSAC || '',       // B: Numero_SAC
    clienteFinal || '',    // C: Cliente
    tipo || 'Otro',        // D: Tipo
    titulo || '',          // E: Titulo
    descripcion || '',     // F: Descripción
    fecha || '',           // G: Fecha
    hora || '',            // H: Hora
    horaFin || '',         // I: Hora_Fin
    lugar || '',           // J: Lugar
    recordatorio || 'SI',  // K: Recordatorio
    diasAntes || '1',      // L: Dias_Antes
    estado || 'Pendiente', // M: Estado
    creadoPor || '',       // N: Creado_Por
    compartidoCon || '',   // O: Compartido_Con
    'NO',                  // P: Notificacion_Enviada
    '',                    // Q: Google_Calendar_ID
  ]);

  return appendToSheet('Agenda', fila);
}

export async function agregarPlazo(numeroSAC, cliente, descripcion, fecha, creadoPor) {
  return agregarEvento(
    numeroSAC,
    cliente,
    'Plazo',
    descripcion,
    '',
    fecha,
    '',
    '',
    '',
    'SI',
    '1',
    'Pendiente',
    creadoPor,
    '',
  );
}

export async function getTareasPendientes(usuario = null) {
  const eventos = await getAgenda({ usuario, estado: 'Pendiente' });

  const clientesMap = new Map();
  const clientes = await getClientes(usuario || null);
  clientes.forEach((c) => {
    (c.expedientes || []).forEach((exp) => {
      if (exp.Numero_SAC) {
        clientesMap.set(exp.Numero_SAC, {
          id: c.ID_Cliente,
          nombre: c.Nombre_Cliente || '',
        });
      }
    });
  });

  return eventos.map((evento) => {
    const match = clientesMap.get(evento.Numero_SAC || '');
    return {
      ...evento,
      Cliente: evento.Cliente || match?.nombre || '',
      Cliente_ID: match?.id || null,
    };
  });
}

// ============================================================
// CLIENTES Y EXPEDIENTES
// ============================================================

export async function getClientes(usuario = null) {
  const rows = await readSheet('Clientes_y_Expedientes');
  if (rows.length < 2) return [];

  const headers = rows[0];

  const idxId = headers.indexOf('ID_Cliente');
  const idxNombre = headers.indexOf('Nombre_Cliente');
  const idxTelefono = headers.indexOf('Telefono');
  const idxDNI = headers.indexOf('DNI');
  const idxDomicilio = headers.indexOf('Domicilio');
  const idxSAC = headers.indexOf('Numero_SAC');
  const idxCaratula = headers.indexOf('Caratula');
  const idxFuero = headers.indexOf('Fuero');
  const idxJuzgado = headers.indexOf('Juzgado');
  const idxCreadoPor = headers.indexOf('Creado_Por');
  const idxCompartidos = headers.indexOf('Usuarios_Compartidos');
  const idxCarpetaDrive = headers.indexOf('ID_Carpeta_Drive');

  const clientesMap = new Map();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const clienteId = row[idxId] || '';
    if (!clienteId) continue;

    if (!clientesMap.has(clienteId)) {
      clientesMap.set(clienteId, {
        ID_Cliente: clienteId,
        Nombre_Cliente: row[idxNombre] || '',
        Telefono: row[idxTelefono] || '',
        DNI: row[idxDNI] || '',
        Domicilio: row[idxDomicilio] || '',
        Creado_Por: idxCreadoPor !== -1 ? row[idxCreadoPor] || '' : '',
        Usuarios_Compartidos: idxCompartidos !== -1 ? row[idxCompartidos] || '' : '',
        ID_Carpeta_Drive: idxCarpetaDrive !== -1 ? row[idxCarpetaDrive] || '' : '',
        expedientes: [],
      });
    }

    const sac = row[idxSAC] || '';
    if (sac) {
      const cliente = clientesMap.get(clienteId);
      cliente.expedientes.push({
        Numero_SAC: sac,
        Caratula: row[idxCaratula] || '',
        Fuero: row[idxFuero] || '',
        Juzgado: idxJuzgado !== -1 ? row[idxJuzgado] || '' : '',
        ID_Carpeta_Drive: idxCarpetaDrive !== -1 ? row[idxCarpetaDrive] || '' : '',
        Creado_Por: idxCreadoPor !== -1 ? row[idxCreadoPor] || '' : '',
        Usuarios_Compartidos: idxCompartidos !== -1 ? row[idxCompartidos] || '' : '',
      });
    }
  }

  let resultado = Array.from(clientesMap.values());

  if (usuario) {
    const usuarioNorm = normalizeEmail(usuario);
    resultado = resultado.filter((cliente) => {
      const creadoPor = normalizeEmail(cliente.Creado_Por || '');
      const compartidos = parseCompartidos(cliente.Usuarios_Compartidos || '');
      // Un cliente es visible si: fue creado por el usuario actual, O está compartido con él
      // Si Creado_Por está vacío, no es visible para nadie (privacidad segura)
      const visibleCliente = (creadoPor === usuarioNorm) || compartidos.includes(usuarioNorm);
      const tieneExpedientesVisibles = (cliente.expedientes || []).some((exp) => {
        const expCreado = normalizeEmail(exp.Creado_Por || '');
        const expCompartidos = parseCompartidos(exp.Usuarios_Compartidos || '');
        return (expCreado === usuarioNorm || expCompartidos.includes(usuarioNorm)) || visibleCliente;
      });
      return visibleCliente || tieneExpedientesVisibles;
    });

    // Mantener sólo expedientes visibles
    resultado = resultado.map((cliente) => {
      const creadoPor = normalizeEmail(cliente.Creado_Por || '');
      const compartidos = parseCompartidos(cliente.Usuarios_Compartidos || '');
      const visibleCliente = (creadoPor === usuarioNorm) || compartidos.includes(usuarioNorm);

      const expedientes = (cliente.expedientes || []).filter((exp) => {
        const expCreado = normalizeEmail(exp.Creado_Por || '');
        const expCompartidos = parseCompartidos(exp.Usuarios_Compartidos || '');
        return (expCreado === usuarioNorm || expCompartidos.includes(usuarioNorm)) || visibleCliente;
      });

      return { ...cliente, expedientes };
    });
  }

  resultado = resultado.map((c) => ({ ...c, totalExpedientes: (c.expedientes || []).length }));
  return resultado;
}

export async function getExpedientesCliente(clienteId, usuario = null) {
  const clientes = await getClientes(usuario);
  const cliente = clientes.find((c) => c.ID_Cliente === clienteId);
  return cliente?.expedientes || [];
}

export async function getNextClienteId() {
  const rows = await readSheet('Clientes_y_Expedientes');
  if (rows.length < 2) return 1;

  const headers = rows[0];
  const idxId = headers.indexOf('ID_Cliente');
  if (idxId === -1) return 1;

  let maxId = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const id = parseInt(rows[i][idxId], 10);
    if (!Number.isNaN(id) && id > maxId) maxId = id;
  }
  return maxId + 1;
}

export async function verificarDNI(dni) {
  if (!dni) return false;
  const rows = await readSheet('Clientes_y_Expedientes');
  if (rows.length < 2) return false;

  const headers = rows[0];
  const idxDNI = headers.indexOf('DNI');
  if (idxDNI === -1) return false;

  for (let i = 1; i < rows.length; i += 1) {
    if ((rows[i][idxDNI] || '').trim() === String(dni).trim()) return true;
  }
  return false;
}

/**
 * FALTABA exportar esta función (la usan páginas y API)
 */
export async function buscarClientes(termino, usuario = null) {
  const clientes = await getClientes(usuario);
  if (!termino || !termino.trim()) return clientes;

  const q = termino.toLowerCase().trim();

  return clientes.filter((c) => {
    const base =
      (c.Nombre_Cliente || '').toLowerCase().includes(q) ||
      (c.Telefono || '').toLowerCase().includes(q) ||
      (c.DNI || '').toLowerCase().includes(q) ||
      (c.Domicilio || '').toLowerCase().includes(q) ||
      (c.ID_Cliente || '').toLowerCase().includes(q);

    if (base) return true;

    return (c.expedientes || []).some(
      (exp) =>
        (exp.Numero_SAC || '').toLowerCase().includes(q) ||
        (exp.Caratula || '').toLowerCase().includes(q) ||
        (exp.Fuero || '').toLowerCase().includes(q),
    );
  });
}

// ============================================================
// USUARIOS (FALTABA EXPORT)
// ============================================================

/**
 * FALTABA exportar esta función (la usan login.js y /api/usuarios)
 */
export async function verificarUsuario(email, pin) {
  const rows = await readSheet('Usuarios');
  if (rows.length < 2) return null;

  const headers = rows[0];
  const idxEmail = headers.indexOf('Email');
  const idxPin = headers.indexOf('PIN_Hash');
  const idxRol = headers.indexOf('Rol');
  const idxActivo = headers.indexOf('Activo');

  if (idxEmail === -1 || idxPin === -1) return null;

  const emailNorm = normalizeEmail(email || '');

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rowEmail = normalizeEmail(row[idxEmail] || '');
    if (rowEmail !== emailNorm) continue;

    const activo = idxActivo !== -1 ? normalizeEmail(row[idxActivo] || 'si') : 'si';
    if (activo !== 'si') return null;

    const pinGuardado = (row[idxPin] || '').toString().trim();
    if (pinGuardado !== (pin || '').toString().trim()) return null;

    return {
      email: row[idxEmail] || '',
      rol: idxRol !== -1 ? row[idxRol] || 'usuario' : 'usuario',
      activo: idxActivo !== -1 ? row[idxActivo] || 'SI' : 'SI',
    };
  }

  return null;
}

// ============================================================
// PERFIL DE USUARIO / ABOGADO
// ============================================================

export async function getPerfilUsuario(email) {
  const rows = await readSheet('Usuarios');
  if (rows.length < 2) return null;

  const headers = rows[0];
  const idxEmail = headers.indexOf('Email');
  const idxNombre = headers.indexOf('Nombre_Abogado');
  const idxDomicilio = headers.indexOf('Domicilio_Constituido');
  const idxMatricula = headers.indexOf('Matricula');

  if (idxEmail === -1) return null;

  const emailNorm = normalizeEmail(email || '');

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rowEmail = normalizeEmail(row[idxEmail] || '');
    if (rowEmail !== emailNorm) continue;

    return {
      email: row[idxEmail] || '',
      nombre: idxNombre !== -1 ? row[idxNombre] || '' : '',
      domicilioConstituido: idxDomicilio !== -1 ? row[idxDomicilio] || '' : '',
      matricula: idxMatricula !== -1 ? row[idxMatricula] || '' : '',
    };
  }

  return null;
}

export async function actualizarPerfilUsuario(email, nombre, domicilioConstituido, matricula) {
  try {
    const rows = await readSheet('Usuarios');
    if (rows.length < 1) return false;

    const headers = rows[0];
    const idxEmail = headers.indexOf('Email');

    if (idxEmail === -1) return false;

    // Agregar columnas si no existen
    let idxNombre = headers.indexOf('Nombre_Completo');
    if (idxNombre === -1) {
      headers.push('Nombre_Completo');
      idxNombre = headers.length - 1;
      // Llenar columna nueva con vacíos
      for (let i = 1; i < rows.length; i += 1) {
        while (rows[i].length <= idxNombre) rows[i].push('');
      }
    }

    let idxDomicilio = headers.indexOf('Domicilio_Constituido');
    if (idxDomicilio === -1) {
      headers.push('Domicilio_Constituido');
      idxDomicilio = headers.length - 1;
      for (let i = 1; i < rows.length; i += 1) {
        while (rows[i].length <= idxDomicilio) rows[i].push('');
      }
    }

    let idxMatricula = headers.indexOf('Matricula');
    if (idxMatricula === -1) {
      headers.push('Matricula');
      idxMatricula = headers.length - 1;
      for (let i = 1; i < rows.length; i += 1) {
        while (rows[i].length <= idxMatricula) rows[i].push('');
      }
    }

    const emailNorm = normalizeEmail(email || '');
    let rowIndex = -1;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowEmail = normalizeEmail(row[idxEmail] || '');
      if (rowEmail === emailNorm) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) return false;

    // Asegurar que la fila tiene suficientes celdas
    while (rows[rowIndex].length <= Math.max(idxNombre, idxDomicilio, idxMatricula)) {
      rows[rowIndex].push('');
    }

    // Actualizar campos
    rows[rowIndex][idxNombre] = nombre || '';
    rows[rowIndex][idxDomicilio] = domicilioConstituido || '';
    rows[rowIndex][idxMatricula] = matricula || '';

    // Escribir cambios
    await writeSheet('Usuarios', rows);
    return true;
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return false;
  }
}

// ============================================================

export async function getActuaciones(numeroSAC) {
  const rows = await readSheet('Actuaciones');
  if (rows.length < 2) return [];

  const headers = rows[0];
  const sacIndex = headers.indexOf('Numero_SAC');
  if (sacIndex === -1) return [];

  return rows
    .slice(1)
    .map((row) => rowToObject(headers, row))
    .filter((obj) => obj.Numero_SAC === numeroSAC)
    .sort((a, b) => getFechaObj(b.Fecha) - getFechaObj(a.Fecha));
}

export async function agregarActuacion(
  numeroSAC,
  fecha,
  tipo,
  origen,
  contenido,
  presentado = false,
  enviado = false,
  tienePDF = false,
  idPDFDrive = '',
  esBorrador = true,
  creadoPor = '',
  compartidoCon = '',
) {
  const actuaciones = await getActuaciones(numeroSAC);
  const ids = actuaciones.map((a) => parseInt(a.ID, 10)).filter((n) => !Number.isNaN(n));
  const id = ids.length ? String(Math.max(...ids) + 1) : '1';

  const fila = [
    id,
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

  return appendToSheet('Actuaciones', fila);
}

// ============================================================
// FINANZAS / HONORARIOS
// ============================================================

export async function getFinanzas(numeroSAC, categoria, estado, fechaInicio, fechaFin, usuario = null) {
  const rows = await readSheet('Finanzas');
  if (rows.length < 2) return [];

  const headers = rows[0];
  const idxSAC = headers.indexOf('Numero_SAC');

  const clientesCache = new Map();
  const clientes = await getClientes(usuario); // Filtrar clientes por usuario si se proporciona
  clientes.forEach((c) => {
    (c.expedientes || []).forEach((exp) => {
      if (exp.Numero_SAC) clientesCache.set(exp.Numero_SAC, c.Nombre_Cliente || '');
    });
  });

  // Si se proporciona usuario, solo mostrar finanzas de expedientes que puede ver
  const sacPermitidos = usuario ? new Set(Array.from(clientesCache.keys())) : null;

  let items = rows.slice(1).map((row) => {
    const obj = rowToObject(headers, row);
    obj.Cliente = clientesCache.get(obj.Numero_SAC || '') || '';
    obj.Nombre_Cliente = obj.Cliente;
    return obj;
  });

  // Filtrar por acceso del usuario
  if (sacPermitidos) {
    items = items.filter((f) => sacPermitidos.has(f.Numero_SAC || ''));
  }

  if (numeroSAC) items = items.filter((f) => f.Numero_SAC === numeroSAC);
  if (categoria && categoria !== 'Todos') items = items.filter((f) => f.Categoria === categoria);
  if (estado && estado !== 'Todos') items = items.filter((f) => f.Estado === estado);
  if (fechaInicio) items = items.filter((f) => f.Fecha && f.Fecha >= fechaInicio);
  if (fechaFin) items = items.filter((f) => f.Fecha && f.Fecha <= fechaFin);

  return items.sort((a, b) => getFechaObj(b.Fecha) - getFechaObj(a.Fecha));
}

export async function getResumenFinanzas(categoria, fechaInicio, fechaFin, usuario = null, estado = null, cliente = null) {
  // Obtener finanzas con todos los filtros aplicados
  let finanzas = await getFinanzas(null, categoria, estado, fechaInicio, fechaFin, usuario);

  // Filtrar por cliente si se proporciona
  if (cliente && cliente.trim() !== '') {
    const q = cliente.toLowerCase().trim();
    finanzas = finanzas.filter((f) =>
      (f.Cliente || f.Nombre_Cliente || '').toLowerCase().includes(q),
    );
  }

  let totalAcordado = 0;  // Suma de Monto_Total acordado
  let totalPagado = 0;    // Suma de Monto_Pagado recibido
  
  finanzas.forEach((f) => {
    const acordado = parseFloat(f.Monto_Total) || 0;
    const pagado = parseFloat(f.Monto_Pagado) || 0;
    
    totalAcordado += acordado;
    totalPagado += pagado;
  });

  const totalPendiente = totalAcordado - totalPagado; // Lo que falta cobrar

  return { totalAcordado, totalPagado, totalPendiente };
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
  const rows = await readSheet('Finanzas');
  const headers = rows[0] || [];
  const idxId = headers.indexOf('ID');

  let nextId = '1';
  if (idxId !== -1 && rows.length > 1) {
    const ids = rows.slice(1).map((r) => parseInt(r[idxId], 10)).filter((n) => !Number.isNaN(n));
    nextId = ids.length ? String(Math.max(...ids) + 1) : '1';
  }

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
    categoria || '',
  ];

  return appendToSheet('Finanzas', fila);
}

// ============================================================
// BIBLIOTECA LEGAL
// ============================================================

export async function getModelos() {
  const rows = await readSheet('Modelos_Escritos');
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => rowToObject(headers, row));
}

export async function agregarModelo(nombre, fuero, contenido) {
  const modelos = await getModelos();
  const ids = modelos.map((m) => parseInt(m.ID, 10)).filter((n) => !Number.isNaN(n));
  const nextId = ids.length ? String(Math.max(...ids) + 1) : '1';
  return appendToSheet('Modelos_Escritos', [nextId, nombre || '', fuero || '', contenido || '']);
}

export async function getJurisprudencia(tema = null, subtema = null, q = null) {
  const rows = await readSheet('Jurisprudencia');
  if (rows.length < 2) return [];
  const headers = rows[0];

  let items = rows.slice(1).map((row) => rowToObject(headers, row));

  if (tema) items = items.filter((i) => (i.Tema || '').toLowerCase().includes(tema.toLowerCase()));
  if (subtema) items = items.filter((i) => (i.Subtema || '').toLowerCase().includes(subtema.toLowerCase()));

  if (q && q.trim()) {
    const term = q.toLowerCase().trim();
    items = items.filter((i) =>
      (i.Tema || '').toLowerCase().includes(term) ||
      (i.Subtema || '').toLowerCase().includes(term) ||
      (i.Juzgado || '').toLowerCase().includes(term) ||
      (i.Cita || '').toLowerCase().includes(term),
    );
  }

  return items.sort((a, b) => getFechaObj(b.Fecha_Agregado) - getFechaObj(a.Fecha_Agregado));
}

export async function agregarJurisprudencia(tema, subtema, juzgado, cita) {
  const items = await getJurisprudencia();
  const ids = items.map((i) => parseInt(i.ID, 10)).filter((n) => !Number.isNaN(n));
  const nextId = ids.length ? String(Math.max(...ids) + 1) : '1';
  const fecha = getFechaHoyISO();
  return appendToSheet('Jurisprudencia', [nextId, tema || '', subtema || '', juzgado || '', cita || '', fecha]);
}

export async function getLeyes() {
  const rows = await readSheet('Leyes');
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows
    .slice(1)
    .map((row) => rowToObject(headers, row))
    .sort((a, b) => getFechaObj(b.Fecha_Agregado) - getFechaObj(a.Fecha_Agregado));
}

export async function agregarLey(numero, jurisdiccion, texto) {
  const leyes = await getLeyes();
  const ids = leyes.map((l) => parseInt(l.ID, 10)).filter((n) => !Number.isNaN(n));
  const nextId = ids.length ? String(Math.max(...ids) + 1) : '1';
  const fecha = getFechaHoyISO();

  let textoFinal = texto || '';
  if (textoFinal.length > 40000) {
    textoFinal = `${textoFinal.substring(0, 40000)}\n... [texto truncado por límite de Google Sheets]`;
  }

  return appendToSheet('Leyes', [nextId, numero || '', jurisdiccion || '', textoFinal, fecha]);
}

// ============================================================
// CONSULTAS DE CLIENTES
// ============================================================

export async function getConsultas(numeroSAC, clienteId) {
  const rows = await readSheet('Historia_Consultas');
  if (rows.length < 2) return [];

  const headers = rows[0];

  let items = rows.slice(1).map((row) => rowToObject(headers, row));

  if (numeroSAC) items = items.filter((c) => c.Numero_SAC === numeroSAC);
  if (clienteId) items = items.filter((c) => c.ID_Cliente === clienteId);

  return items.sort((a, b) => getFechaObj(b.Fecha) - getFechaObj(a.Fecha));
}

export async function agregarConsulta(numeroSAC, fecha, abogado, notas, clienteId = '') {
  const items = await getConsultas();
  const ids = items.map((i) => parseInt(i.ID, 10)).filter((n) => !Number.isNaN(n));
  const nextId = ids.length ? String(Math.max(...ids) + 1) : '1';

  const fila = [
    nextId,
    numeroSAC || '',
    fecha || getFechaHoyISO(),
    abogado || '',
    notas || '',
    clienteId || '', // Nuevo: guardar ID_Cliente
  ];

  return appendToSheet('Historia_Consultas', fila);
}

// ============================================================
// GOOGLE DRIVE - CARPETAS / ARCHIVOS
// ============================================================

/**
 * Crea una carpeta en Google Drive para un expediente usando Drive REST API
 */
export async function crearCarpetaExpediente(numeroSAC, caratula) {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const folderName = `SAC ${numeroSAC} - ${caratula}`.substring(0, 100);

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [ROOT_FOLDER_ID],
      }),
    });

    if (!response.ok) {
      console.error('❌ Error al crear carpeta en Drive:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return data.id || null;
  } catch (error) {
    console.error('❌ Error al crear carpeta en Drive:', error.message);
    return null;
  }
}

export async function listarArchivosExpediente(folderId) {
  try {
    const token = await getAccessToken();
    if (!token) return [];

    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error('❌ listarArchivosExpediente:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('❌ listarArchivosExpediente:', error.message);
    return [];
  }
}

export async function guardarCorreccionIA(numeroSAC, tipo, promptOriginal, textoGenerado, textoCorregido, usuario) {
  const rows = await readSheet('Correcciones_IA');
  const headers = rows[0] || [];
  const idxId = headers.indexOf('ID');

  let nextId = '1';
  if (idxId !== -1 && rows.length > 1) {
    const ids = rows.slice(1).map((r) => parseInt(r[idxId], 10)).filter((n) => !Number.isNaN(n));
    nextId = ids.length ? String(Math.max(...ids) + 1) : '1';
  }

  const fila = [
    nextId,
    numeroSAC || '',
    tipo || '',
    promptOriginal || '',
    textoGenerado || '',
    textoCorregido || '',
    getFechaHoyISO(),
    usuario || '',
  ];

  return appendToSheet('Correcciones_IA', fila);
}

// ============================================================
// EXPORT COMPAT API ROUTES
// ============================================================

export { getAccessToken as getAccessTokenForApi };

// Inicializar columnas en sheet Usuarios si no existen
export async function inicializarColumnasUsuarios() {
  try {
    const rows = await readSheet('Usuarios');
    if (rows.length < 1) return false;

    const headers = rows[0];
    const columnasRequeridas = [
      'Nombre_Completo',
      'Domicilio_Constituido',
      'Matricula'
    ];

    let actualizarSheet = false;

    for (const columna of columnasRequeridas) {
      if (headers.indexOf(columna) === -1) {
        headers.push(columna);
        actualizarSheet = true;
        // Llenar columna nueva con vacíos
        for (let i = 1; i < rows.length; i += 1) {
          while (rows[i].length <= headers.length - 1) {
            rows[i].push('');
          }
        }
      }
    }

    if (actualizarSheet) {
      return await writeSheet('Usuarios', rows);
    }

    return true;
  } catch (error) {
    console.error('Error al inicializar columnas Usuarios:', error);
    return false;
  }
}
