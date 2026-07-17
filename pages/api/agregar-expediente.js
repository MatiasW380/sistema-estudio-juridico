// pages/api/agregar-expediente.js
// API para agregar un nuevo expediente y crear su carpeta en Drive

import { appendToSheet, crearCarpetaExpediente, getClientes, agregarActuacion } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 ====== API /api/agregar-expediente INICIADA ======');
  
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { clienteId, nombre, telefono, numeroSAC, caratula, fuero, usuariosCompartidos } = req.body;

    console.log('📥 Datos recibidos:');
    console.log('  Cliente ID:', clienteId);
    console.log('  N° SAC:', numeroSAC);
    console.log('  Carátula:', caratula);
    console.log('  Fuero:', fuero);

    if (!clienteId || !nombre || !numeroSAC || !caratula) {
      console.log('❌ Faltan campos obligatorios');
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos obligatorios' 
      });
    }

    // Obtener DNI y Domicilio del cliente existente
    console.log('🔍 Buscando datos del cliente...');
    const clientes = await getClientes();
    const cliente = clientes.find(c => c.ID_Cliente === clienteId);
    const dni = cliente?.DNI || '';
    const domicilio = cliente?.Domicilio || '';
    console.log('📋 DNI:', dni);
    console.log('📋 Domicilio:', domicilio);

    // CREAR CARPETA EN DRIVE
    console.log('📁 Creando carpeta en Drive...');
    let folderId = null;
    try {
      folderId = await crearCarpetaExpediente(numeroSAC, caratula);
      if (folderId) {
        console.log(`✅ Carpeta creada con ID REAL de Drive: ${folderId}`);
      } else {
        console.warn('⚠️ No se pudo crear la carpeta en Drive (folderId es null)');
      }
    } catch (error) {
      console.error('❌ Error al crear carpeta:', error);
    }

    // Preparar fila para Clientes_y_Expedientes
    console.log('📤 Preparando fila para Sheets...');
    const fila = [
      clienteId,
      nombre,
      telefono || '',
      dni,
      domicilio,
      numeroSAC,
      caratula,
      fuero || '',
      folderId || '',  // ID_Carpeta_Drive (ID REAL de Google)
      usuariosCompartidos || '',
    ];

    console.log('📤 Fila a guardar:', JSON.stringify(fila));

    // Guardar en Google Sheets
    console.log('📤 Guardando en Sheets...');
    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);

    if (resultado) {
      console.log('✅ Expediente agregado correctamente a Sheets');
      console.log('📁 ID_Carpeta_Drive guardado:', folderId || 'vacío');
      
      // Crear actuación inicial
      const fechaActual = new Date().toISOString().split('T')[0];
      await agregarActuacion(
        numeroSAC,
        fechaActual,
        'Apertura',
        'Yo',
        `Expediente iniciado: ${caratula}`,
        false,
        false,
        '',
        false,
        'sistema',
        ''
      );
      console.log('✅ Actuación inicial agregada');

      return res.status(200).json({ 
        success: true, 
        folderId: folderId || null,
        mensaje: folderId 
          ? 'Expediente, carpeta y actuación inicial creados' 
          : 'Expediente y actuación inicial creados, pero no se pudo crear la carpeta en Drive'
      });
    } else {
      console.error('❌ Error al agregar expediente a Sheets');
      return res.status(500).json({ 
        success: false, 
        error: 'Error al escribir en la hoja de cálculo' 
      });
    }
  } catch (error) {
    console.error('❌ Error en la API:', error);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
