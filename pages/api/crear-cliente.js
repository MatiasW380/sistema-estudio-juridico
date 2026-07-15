// pages/api/crear-cliente.js
// API para crear un nuevo cliente

import { appendToSheet, getNextClienteId, verificarDNI } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/crear-cliente ejecutándose...');
  
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido:', req.method);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, telefono, dni, domicilio } = req.body;

    console.log('📥 Datos recibidos:');
    console.log('  Nombre:', nombre);
    console.log('  Teléfono:', telefono);
    console.log('  DNI:', dni);
    console.log('  Domicilio:', domicilio);

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'El nombre es obligatorio' 
      });
    }

    // Verificar DNI duplicado (si se proporcionó)
    if (dni && dni.trim() !== '') {
      const dniExiste = await verificarDNI(dni);
      if (dniExiste) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un cliente con ese DNI'
        });
      }
    }

    // Obtener próximo ID
    const nuevoId = await getNextClienteId();
    console.log('📋 Nuevo ID:', nuevoId);

    // Preparar la fila (10 columnas)
    const fila = [
      nuevoId,          // ID_Cliente
      nombre,           // Nombre_Cliente
      telefono || '',   // Telefono
      dni || '',        // DNI
      domicilio || '',  // Domicilio
      '',               // Numero_SAC
      '',               // Caratula
      '',               // Fuero
      '',               // ID_Carpeta_Drive
      '',               // Usuarios_Compartidos
    ];

    console.log('📤 Fila a guardar:', fila);

    // Guardar en Google Sheets
    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);

    if (resultado) {
      console.log('✅ Cliente creado correctamente con ID:', nuevoId);
      return res.status(200).json({ 
        success: true, 
        id: nuevoId 
      });
    } else {
      console.error('❌ appendToSheet devolvió false');
      return res.status(500).json({ 
        success: false, 
        error: 'Error al guardar en la hoja de cálculo' 
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
