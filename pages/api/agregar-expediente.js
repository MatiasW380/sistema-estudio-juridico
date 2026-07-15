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
    console.log('  N° SAC:', numeroSAC);
    console.log('  Carátula:', caratula);
    console.log('  Fuero:', fuero);

    if (!clienteId || !nombre || !numeroSAC || !caratula) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos obligatorios' 
      });
    }

    // --- CREAR CARPETA EN DRIVE ---
    console.log('📁 Creando carpeta en Drive...');
    let folderId = null;
    try {
      folderId = await crearCarpetaExpediente(numeroSAC, caratula);
      if (folderId) {
        console.log(`✅ Carpeta creada con ID: ${folderId}`);
      } else {
        console.warn('⚠️ No se pudo crear la carpeta en Drive');
      }
    } catch (error) {
      console.error('❌ Error al crear carpeta:', error);
    }

    // --- PREPARAR FILA (10 COLUMNAS) ---
    // Orden: ID_Cliente, Nombre_Cliente, Telefono, DNI, Domicilio, Numero_SAC, Caratula, Fuero, ID_Carpeta_Drive, Usuarios_Compartidos
    const fila = [
      clienteId,                // ID_Cliente
      nombre,                   // Nombre_Cliente
      telefono || '',           // Telefono
      '',                       // DNI (vacío, se mantiene del cliente)
      '',                       // Domicilio (vacío, se mantiene del cliente)
      numeroSAC,                // Numero_SAC
      caratula,                 // Caratula
      fuero || '',              // Fuero
      folderId || '',           // ID_Carpeta_Drive
      usuariosCompartidos || '', // Usuarios_Compartidos
    ];

    console.log('📤 Fila a guardar:', fila);

    // --- GUARDAR EN SHEETS ---
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
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Error interno del servidor' 
    });
  }
}
