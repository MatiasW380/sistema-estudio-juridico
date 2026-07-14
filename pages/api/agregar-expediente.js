// pages/api/agregar-expediente.js
// API para agregar un nuevo expediente a un cliente existente

import { appendToSheet } from '../../lib/googleSheets';

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { clienteId, nombre, telefono, numeroSAC, caratula, fuero, usuariosCompartidos } = req.body;

    console.log('📥 Recibida solicitud para agregar expediente:');
    console.log('  Cliente ID:', clienteId);
    console.log('  Nombre:', nombre);
    console.log('  Teléfono:', telefono);
    console.log('  N° SAC:', numeroSAC);
    console.log('  Carátula:', caratula);
    console.log('  Fuero:', fuero);

    // Validar campos obligatorios
    if (!clienteId || !nombre || !numeroSAC || !caratula) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos obligatorios: clienteId, nombre, numeroSAC, caratula' 
      });
    }

    // Preparar la fila para la hoja
    const fila = [
      clienteId,
      nombre,
      telefono || '',
      numeroSAC,
      caratula,
      fuero || '',
      '',
      usuariosCompartidos || '',
    ];

    console.log('📤 Escribiendo fila:', fila);

    // Escribir en Google Sheets
    const resultado = await appendToSheet('Clientes_y_Expedientes', fila);

    if (resultado) {
      console.log('✅ Expediente agregado correctamente');
      return res.status(200).json({ success: true });
    } else {
      console.error('❌ Error al agregar expediente: appendToSheet devolvió false');
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
