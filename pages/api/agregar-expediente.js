// pages/api/agregar-expediente.js
// API para agregar un nuevo expediente y crear su carpeta en Drive

import { appendToSheet, crearCarpetaExpediente } from '../../lib/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { clienteId, nombre, telefono, numeroSAC, caratula, fuero, usuariosCompartidos } = req.body;

    console.log('📥 Recibida solicitud para agregar expediente:');
    console.log('  Cliente ID:', clienteId);
    console.log('  N° SAC:', numeroSAC);
    console.log('  Carátula:', caratula);

    if (!clienteId || !nombre || !numeroSAC || !caratula) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos obligatorios' 
      });
    }

    // PASO 1: Crear la carpeta en Drive
    console.log('📁 Intentando crear carpeta en Drive...');
    let folderId = null;
    let driveError = null;
    
    try {
      folderId = await crearCarpetaExpediente(numeroSAC, caratula);
      if (folderId) {
        console.log(`✅ Carpeta creada con ID: ${folderId}`);
      } else {
        console.error('❌ crearCarpetaExpediente devolvió null');
        driveError = 'La función crearCarpetaExpediente devolvió null';
      }
    } catch (error) {
      console.error('❌ Error al crear carpeta:', error);
      driveError = error.message || 'Error desconocido al crear carpeta';
    }

    if (!folderId) {
      console.warn('⚠️ No se pudo crear la carpeta en Drive. Continuamos sin folderId.');
    }

    // PASO 2: Preparar la fila para la hoja
    const fila = [
      clienteId,
      nombre,
      telefono || '',
      numeroSAC,
      caratula,
      fuero || '',
      folderId || '',  // Guardamos el ID de la carpeta (vacío si falló)
      usuariosCompartidos || '',
    ];

    console.log('📤 Escribiendo fila en Sheets:', fila);

    // PASO 3: Escribir en Google Sheets
    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);

    if (resultado) {
      console.log('✅ Expediente agregado correctamente');
      return res.status(200).json({ 
        success: true, 
        folderId: folderId || null,
        driveError: driveError || null,
        mensaje: folderId 
          ? 'Expediente y carpeta creados' 
          : 'Expediente creado, pero no se pudo crear la carpeta en Drive. Verificá permisos.'
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
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
