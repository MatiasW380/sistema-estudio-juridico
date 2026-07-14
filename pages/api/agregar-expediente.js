// pages/api/agregar-expediente.js
// API para agregar un nuevo expediente y crear su carpeta en Drive

import { appendToSheet, crearCarpetaExpediente } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/agregar-expediente ejecutándose...');
  
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { clienteId, nombre, telefono, numeroSAC, caratula, fuero, usuariosCompartidos } = req.body;

    console.log('📥 Datos recibidos:');
    console.log('  Cliente ID:', clienteId);
    console.log('  Nombre:', nombre);
    console.log('  N° SAC:', numeroSAC);
    console.log('  Carátula:', caratula);

    if (!clienteId || !nombre || !numeroSAC || !caratula) {
      console.log('❌ Faltan campos obligatorios');
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos obligatorios' 
      });
    }

    // INTENTAR CREAR CARPETA
    console.log('📁 Llamando a crearCarpetaExpediente...');
    let folderId = null;
    
    try {
      folderId = await crearCarpetaExpediente(numeroSAC, caratula);
      console.log(`📁 Resultado de crearCarpetaExpediente: ${folderId}`);
    } catch (error) {
      console.error('❌ Error al ejecutar crearCarpetaExpediente:', error);
      console.error('❌ Stack trace:', error.stack);
    }

    if (!folderId) {
      console.warn('⚠️ No se pudo crear la carpeta en Drive. Continuamos sin folderId.');
    }

    // Preparar la fila para la hoja
    const fila = [
      clienteId,
      nombre,
      telefono || '',
      numeroSAC,
      caratula,
      fuero || '',
      folderId || '',
      usuariosCompartidos || '',
    ];

    console.log('📤 Escribiendo en Sheets:', fila);

    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);

    if (resultado) {
      console.log('✅ Expediente agregado correctamente');
      return res.status(200).json({ 
        success: true, 
        folderId: folderId || null,
        mensaje: folderId 
          ? 'Expediente y carpeta creados' 
          : 'Expediente creado, pero no se pudo crear la carpeta en Drive'
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
    console.error('❌ Stack trace:', error.stack);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
