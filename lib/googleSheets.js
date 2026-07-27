// lib/googleSheets.js
// Módulo de conexión con Google Sheets y Google Drive

import { google } from 'googleapis';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Normaliza una fila para la hoja Agenda a exactamente 17 columnas (A→Q)
 */
function normalizarFilaAgenda(fila) {
    if (!Array.isArray(fila)) {
        fila = [];
    }
    // Si tiene más de 17, recortar
    if (fila.length > 17) {
        fila = fila.slice(0, 17);
    }
    // Si tiene menos de 17, rellenar con strings vacíos
    while (fila.length < 17) {
        fila.push('');
    }
    return fila;
}

/**
 * Parseo robusto de usuarios compartidos
 */
function parseCompartidos(compartidosStr) {
    if (!compartidosStr) return [];
    return compartidosStr
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(email => email !== '');
}

/**
 * Verifica si un objeto es visible para un usuario
 */
function esVisibleParaUsuario(obj, usuario) {
    if (!usuario) return true;
    
    const usuarioLower = usuario.toLowerCase().trim();
    const creadoPor = (obj.Creado_Por || '').toLowerCase().trim();
    
    // Es creador
    if (creadoPor === usuarioLower) return true;
    
    // Es compartido
    const compartidos = parseCompartidos(obj.Usuarios_Compartidos);
    return compartidos.includes(usuarioLower);
}

// ============================================================
// AUTENTICACIÓN Y TOKENS
// ============================================================

/**
 * Obtiene un token de acceso para Google APIs usando una cuenta de servicio
 */
export async function getAccessToken() {
    try {
        // La variable de entorno GOOGLE_APPLICATION_CREDENTIALS debe apuntar al archivo JSON
        // o podemos usar directamente las credenciales desde variables de entorno
        const auth = new google.auth.GoogleAuth({
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        return token.token;
    } catch (error) {
        console.error('❌ Error al obtener token de acceso:', error);
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
    const token = await getAccessToken();
    if (!token) {
        console.error('❌ No se pudo obtener token de acceso');
        return [];
    }
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${sheetName}`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        console.error(`❌ Error al leer ${sheetName}:`, response.status);
        return [];
    }
    
    const data = await response.json();
    return data.values || [];
}

/**
 * Agrega una o más filas a una hoja específica
 */
export async function appendToSheet(sheetName, values) {
    console.log(`📤 appendToSheet: ${sheetName}`);
    
    const token = await getAccessToken();
    if (!token) {
        console.error('❌ No se pudo obtener token de acceso');
        return false;
    }

    // Asegurar que values sea un array de arrays
    if (!Array.isArray(values)) {
        console.error('❌ values debe ser un array');
        return false;
    }

    // Si es un array plano, convertirlo a array de una fila
    if (!Array.isArray(values[0])) {
        values = [values];
    }

    // Normalizar si es Agenda (FORZAR 17 COLUMNAS A→Q)
    let range = sheetName;
    if (sheetName === 'Agenda') {
        range = 'Agenda!A:Q';
        values = values.map(fila => normalizarFilaAgenda(fila));
        console.log('📤 Agenda normalizada a 17 columnas:', values);
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${range}:append?valueInputOption=USER_ENTERED`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en appendToSheet:', response.status, errorText);
        return false;
    }

    console.log('✅ appendToSheet exitoso');
    return true;
}

// ============================================================
// AGENDA Y EVENTOS
// ============================================================

/**
 * Obtiene eventos de agenda con filtros opcionales
 */
export async function getAgenda(filtros = {}) {
    const {
        numeroSAC,
        cliente,
        tipo,
        estado,
        fechaInicio,
        fechaFin,
        usuario
    } = filtros;
    
    const rows = await readSheet('Agenda');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    const eventos = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx] || '';
        });
        return obj;
    });
    
    // Aplicar filtros
    let resultado = eventos;
    
    if (numeroSAC) {
        resultado = resultado.filter(e => e.Numero_SAC === numeroSAC);
    }
    if (cliente) {
        resultado = resultado.filter(e => 
            e.Cliente && e.Cliente.toLowerCase().includes(cliente.toLowerCase())
        );
    }
    if (tipo && tipo !== 'Todos') {
        resultado = resultado.filter(e => e.Tipo === tipo);
    }
    if (estado && estado !== 'Todos') {
        resultado = resultado.filter(e => e.Estado === estado);
    }
    if (fechaInicio) {
        resultado = resultado.filter(e => e.Fecha && e.Fecha >= fechaInicio);
    }
    if (fechaFin) {
        resultado = resultado.filter(e => e.Fecha && e.Fecha <= fechaFin);
    }
    if (usuario) {
        resultado = resultado.filter(e => esVisibleParaUsuario(e, usuario));
    }
    
    return resultado;
}

/**
 * Agrega un evento a la agenda (SIEMPRE con 17 columnas A→Q)
 */
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
    compartidoCon
) {
    console.log('📝 agregarEvento - Datos:', { numeroSAC, cliente, tipo, titulo, fecha });
    
    // Generar ID único
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    
    // Construir fila de EXACTAMENTE 17 posiciones (A→Q)
    const fila = [
        id,                    // A: ID
        numeroSAC || '',       // B: Numero_SAC
        cliente || '',         // C: Cliente
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
        ''                     // Q: Google_Calendar_ID
    ];
    
    // Verificación de seguridad
    if (fila.length !== 17) {
        console.error('❌ Error: fila no tiene 17 columnas', fila.length);
        return false;
    }
    
    console.log('📤 Guardando fila (17 columnas):', fila);
    
    return await appendToSheet('Agenda', fila);
}

/**
 * Agrega un plazo (usa agregarEvento con parámetros específicos)
 */
export async function agregarPlazo(numeroSAC, cliente, descripcion, fecha, creadoPor) {
    return await agregarEvento(
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
        ''
    );
}

/**
 * Obtiene tareas pendientes (eventos con estado 'Pendiente')
 */
export async function getTareasPendientes(usuario = null) {
    const eventos = await getAgenda({ usuario, estado: 'Pendiente' });
    
    // Enriquecer con cliente desde SAC
    const clientesMap = new Map();
    if (usuario) {
        const clientes = await getClientes(usuario);
        clientes.forEach(c => {
            c.expedientes.forEach(exp => {
                if (exp.Numero_SAC) {
                    clientesMap.set(exp.Numero_SAC, c.Nombre_Cliente);
                }
            });
        });
    }
    
    return eventos.map(evento => {
        let cliente = evento.Cliente || '';
        if (!cliente && evento.Numero_SAC && clientesMap.has(evento.Numero_SAC)) {
            cliente = clientesMap.get(evento.Numero_SAC);
        }
        return {
            ...evento,
            Cliente: cliente,
        };
    });
}

// ============================================================
// CLIENTES Y EXPEDIENTES
// ============================================================

/**
 * Obtiene clientes con sus expedientes, filtrados por visibilidad
 */
export async function getClientes(usuario = null) {
    const rows = await readSheet('Clientes_y_Expedientes');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    
    // Índices de columnas
    const idxId = headers.indexOf('ID_Cliente');
    const idxNombre = headers.indexOf('Nombre_Cliente');
    const idxTelefono = headers.indexOf('Telefono');
    const idxDNI = headers.indexOf('DNI');
    const idxDomicilio = headers.indexOf('Domicilio');
    const idxSAC = headers.indexOf('Numero_SAC');
    const idxCaratula = headers.indexOf('Caratula');
    const idxFuero = headers.indexOf('Fuero');
    const idxCreadoPor = headers.indexOf('Creado_Por');
    const idxCompartidos = headers.indexOf('Usuarios_Compartidos');
    
    const clientesMap = new Map();
    
    // Agrupar expedientes por cliente
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const clienteId = row[idxId] || '';
        const sac = row[idxSAC] || '';
        
        if (!clienteId) continue;
        
        if (!clientesMap.has(clienteId)) {
            clientesMap.set(clienteId, {
                ID_Cliente: clienteId,
                Nombre_Cliente: row[idxNombre] || '',
                Telefono: row[idxTelefono] || '',
                DNI: row[idxDNI] || '',
                Domicilio: row[idxDomicilio] || '',
                Creado_Por: row[idxCreadoPor] || '',
                Usuarios_Compartidos: row[idxCompartidos] || '',
                expedientes: []
            });
        }
        
        if (sac) {
            const cliente = clientesMap.get(clienteId);
            cliente.expedientes.push({
                Numero_SAC: sac,
                Caratula: row[idxCaratula] || '',
                Fuero: row[idxFuero] || ''
            });
        }
    }
    
    // Convertir a array y filtrar por visibilidad
    let resultado = Array.from(clientesMap.values());
    
    if (usuario) {
        resultado = resultado.filter(cliente => {
            // Tiene al menos un expediente visible
            const expedientesVisibles = cliente.expedientes.filter(exp => {
                // Por simplicidad, si el cliente es visible, todos sus expedientes lo son
                return true;
            });
            
            // Si no tiene expedientes, solo visible si es creador
            if (expedientesVisibles.length === 0) {
                return (cliente.Creado_Por || '').toLowerCase() === usuario.toLowerCase();
            }
            
            return esVisibleParaUsuario(cliente, usuario);
        });
    }
    
    return resultado;
}

/**
 * Obtiene todos los expedientes de un cliente
 */
export async function getExpedientesCliente(clienteId, usuario = null) {
    const rows = await readSheet('Clientes_y_Expedientes');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    const idxId = headers.indexOf('ID_Cliente');
    const idxSAC = headers.indexOf('Numero_SAC');
    const idxCaratula = headers.indexOf('Caratula');
    const idxFuero = headers.indexOf('Fuero');
    const idxCreadoPor = headers.indexOf('Creado_Por');
    const idxCompartidos = headers.indexOf('Usuarios_Compartidos');
    
    const expedientes = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[idxId] === clienteId && row[idxSAC]) {
            const obj = {
                Numero_SAC: row[idxSAC] || '',
                Caratula: row[idxCaratula] || '',
                Fuero: row[idxFuero] || '',
                Creado_Por: row[idxCreadoPor] || '',
                Usuarios_Compartidos: row[idxCompartidos] || '',
            };
            if (usuario && !esVisibleParaUsuario(obj, usuario)) continue;
            expedientes.push(obj);
        }
    }
    return expedientes;
}

/**
 * Obtiene el próximo ID de cliente disponible
 */
export async function getNextClienteId() {
    const rows = await readSheet('Clientes_y_Expedientes');
    if (rows.length < 2) return 1;
    
    const headers = rows[0];
    const idxId = headers.indexOf('ID_Cliente');
    if (idxId === -1) return 1;
    
    let maxId = 0;
    for (let i = 1; i < rows.length; i++) {
        const id = parseInt(rows[i][idxId]);
        if (!isNaN(id) && id > maxId) {
            maxId = id;
        }
    }
    return maxId + 1;
}

/**
 * Verifica si un DNI ya existe
 */
export async function verificarDNI(dni) {
    if (!dni) return false;
    const rows = await readSheet('Clientes_y_Expedientes');
    if (rows.length < 2) return false;
    
    const headers = rows[0];
    const idxDNI = headers.indexOf('DNI');
    if (idxDNI === -1) return false;
    
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][idxDNI] === dni) {
            return true;
        }
    }
    return false;
}

// ============================================================
// ACTUACIONES
// ============================================================

/**
 * Obtiene actuaciones de un expediente
 */
export async function getActuaciones(numeroSAC) {
    const rows = await readSheet('Actuaciones');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    const sacIndex = headers.indexOf('Numero_SAC');
    if (sacIndex === -1) return [];
    
    const actuaciones = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[sacIndex] === numeroSAC) {
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = row[idx] || '';
            });
            actuaciones.push(obj);
        }
    }
    return actuaciones;
}

/**
 * Agrega una actuación a un expediente
 */
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
    compartidoCon = ''
) {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    
    const fila = [
        id,                 // A: ID
        numeroSAC || '',    // B: Numero_SAC
        fecha || '',        // C: Fecha
        tipo || '',         // D: Tipo
        origen || '',       // E: Origen
        contenido || '',    // F: Contenido
        presentado ? 'SI' : 'NO',    // G: Presentado
        enviado ? 'SI' : 'NO',       // H: Enviado
        tienePDF ? 'SI' : 'NO',      // I: Tiene_PDF
        idPDFDrive || '',   // J: ID_PDF_Drive
        esBorrador ? 'SI' : 'NO',    // K: Es_Borrador
        creadoPor || '',    // L: Creado_Por
        compartidoCon || '' // M: Compartido_Con
    ];
    
    return await appendToSheet('Actuaciones', fila);
}

// ============================================================
// FINANZAS / HONORARIOS
// ============================================================

/**
 * Obtiene movimientos financieros con cliente resuelto
 */
export async function getFinanzas(numeroSAC, categoria, estado, fechaInicio, fechaFin) {
    const rows = await readSheet('Finanzas');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    const idxSAC = headers.indexOf('Numero_SAC');
    const idxFecha = headers.indexOf('Fecha');
    
    // Cache de clientes por SAC
    const clientesCache = new Map();
    const clientes = await getClientes();
    clientes.forEach(c => {
        c.expedientes.forEach(exp => {
            if (exp.Numero_SAC) {
                clientesCache.set(exp.Numero_SAC, c.Nombre_Cliente);
            }
        });
    });
    
    const resultado = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx] || '';
        });
        
        // Agregar Cliente resuelto
        const sac = row[idxSAC] || '';
        obj.Cliente = clientesCache.get(sac) || '';
        
        // Aplicar filtros
        if (numeroSAC && sac !== numeroSAC) continue;
        if (categoria && categoria !== 'Todos' && obj.Categoria !== categoria) continue;
        if (estado && estado !== 'Todos' && obj.Estado !== estado) continue;
        if (fechaInicio && obj.Fecha && obj.Fecha < fechaInicio) continue;
        if (fechaFin && obj.Fecha && obj.Fecha > fechaFin) continue;
        
        resultado.push(obj);
    }
    return resultado;
}

/**
 * Obtiene resumen financiero
 */
export async function getResumenFinanzas(categoria, fechaInicio, fechaFin) {
    const finanzas = await getFinanzas(null, categoria, null, fechaInicio, fechaFin);
    
    let totalPendiente = 0;
    let totalPagado = 0;
    let totalParcial = 0;
    
    finanzas.forEach(f => {
        const total = parseFloat(f.Monto_Total) || 0;
        const pagado = parseFloat(f.Monto_Pagado) || 0;
        const estado = f.Estado || '';
        
        if (estado === 'Pagado') {
            totalPagado += total;
        } else if (estado === 'Parcial') {
            totalParcial += pagado || total;
        } else {
            totalPendiente += total;
        }
    });
    
    return { totalPendiente, totalPagado, totalParcial };
}

/**
 * Agrega un movimiento financiero
 */
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
    categoria
) {
    const fila = [
        numeroSAC || '',
        tipo || '',
        referencia || '',
        fecha || '',
        fechaVencimiento || '',
        concepto || '',
        montoTotal || '',
        montoPagado || '',
        estado || 'Pendiente',
        categoria || ''
    ];
    return await appendToSheet('Finanzas', fila);
}

// ============================================================
// BIBLIOTECA LEGAL
// ============================================================

/**
 * Obtiene todos los modelos de escritos
 */
export async function getModelos() {
    const rows = await readSheet('Modelos');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx] || '';
        });
        return obj;
    });
}

/**
 * Agrega un modelo de escrito
 */
export async function agregarModelo(nombre, fuero, contenido) {
    const fila = [
        nombre || '',
        fuero || '',
        contenido || ''
    ];
    return await appendToSheet('Modelos', fila);
}

/**
 * Obtiene toda la jurisprudencia
 */
export async function getJurisprudencia() {
    const rows = await readSheet('Jurisprudencia');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx] || '';
        });
        return obj;
    });
}

/**
 * Agrega jurisprudencia
 */
export async function agregarJurisprudencia(tema, subtema, juzgado, cita) {
    const fila = [
        tema || '',
        subtema || '',
        juzgado || '',
        cita || ''
    ];
    return await appendToSheet('Jurisprudencia', fila);
}

/**
 * Obtiene todas las leyes
 */
export async function getLeyes() {
    const rows = await readSheet('Leyes');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx] || '';
        });
        return obj;
    });
}

/**
 * Agrega una ley
 */
export async function agregarLey(numero, jurisdiccion, texto) {
    const fila = [
        numero || '',
        jurisdiccion || '',
        texto || ''
    ];
    return await appendToSheet('Leyes', fila);
}

// ============================================================
// CONSULTAS DE CLIENTES
// ============================================================

/**
 * Obtiene consultas de un expediente o cliente
 */
export async function getConsultas(numeroSAC, clienteId) {
    const rows = await readSheet('Consultas');
    if (rows.length < 2) return [];
    
    const headers = rows[0];
    const idxSAC = headers.indexOf('Numero_SAC');
    const idxCliente = headers.indexOf('ID_Cliente');
    
    return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
            obj[h] = row[idx] || '';
        });
        return obj;
    }).filter(c => {
        if (numeroSAC && c.Numero_SAC !== numeroSAC) return false;
        if (clienteId && c.ID_Cliente !== clienteId) return false;
        return true;
    });
}

/**
 * Agrega una consulta
 */
export async function agregarConsulta(numeroSAC, fecha, abogado, notas) {
    const fila = [
        numeroSAC || '',
        fecha || '',
        abogado || '',
        notas || ''
    ];
    return await appendToSheet('Consultas', fila);
}

// ============================================================
// GOOGLE DRIVE - CARPETAS DE EXPEDIENTES
// ============================================================

/**
 * Crea una carpeta en Google Drive para un expediente
 */
export async function crearCarpetaExpediente(numeroSAC, caratula) {
    try {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        
        const drive = google.drive({ version: 'v3', auth });
        
        // Buscar carpeta padre (opcional)
        const folderName = `SAC ${numeroSAC} - ${caratula}`.substring(0, 100);
        
        const response = await drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                // parents: ['ID_DE_CARPETA_PADRE'] // Opcional
            },
            fields: 'id'
        });
        
        const folderId = response.data.id;
        console.log(`✅ Carpeta creada en Drive: ${folderId}`);
        return folderId;
    } catch (error) {
        console.error('❌ Error al crear carpeta en Drive:', error);
        return null;
    }
}

/**
 * Guarda una corrección de IA
 */
export async function guardarCorreccionIA(numeroSAC, tipo, promptOriginal, textoGenerado, textoCorregido, usuario) {
    const fila = [
        numeroSAC || '',
        tipo || '',
        promptOriginal || '',
        textoGenerado || '',
        textoCorregido || '',
        usuario || '',
        new Date().toISOString()
    ];
    return await appendToSheet('Correcciones_IA', fila);
}

// ============================================================
// EXPORTACIÓN DE FUNCIONES DE AUTENTICACIÓN (para API routes)
// ============================================================

// Re-exportamos getAccessToken para que esté disponible en las API routes
export { getAccessToken as getAccessTokenForApi };

// ============================================================
// FIN DEL ARCHIVO
// ============================================================
