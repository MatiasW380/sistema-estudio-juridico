// pages/api/actualizar-cliente.js
// API para actualizar los datos de un cliente

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  console.log('🚀 API /api/actualizar-cliente ejecutándose...');
  
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Método no permitido. Use PUT.' });
  }

  try {
    const { id, nombre, telefono, dni, domicilio } = req.body;

    console.log('📥 Datos recibidos:');
    console.log('  ID:', id);
    console.log('  Nombre:', nombre);
    console.log('  Teléfono:', telefono);
    console.log('  DNI:', dni);
    console.log('  Domicilio:', domicilio);

    if (!id || !nombre) {
      return res.status(400).json({
        success: false,
        error: 'ID y nombre son obligatorios'
      });
    }

    // Obtener token de acceso
    const token = await getAccessToken();
    if (!token) {
      return res.status(500).json({
        success: false,
        error: 'Error al obtener token de acceso'
      });
    }

    // 1. Leer todos los datos de la hoja
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Clientes_y_Expedientes`;
    const readResponse = await fetch(readUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!readResponse.ok) {
      const errorText = await readResponse.text();
      console.error('❌ Error al leer datos:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Error al leer los datos'
      });
    }

    const data = await readResponse.json();
    const rows = data.values || [];
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron datos'
      });
    }

    // 2. Encontrar el índice del cliente
    const headers = rows[0];
    const idIndex = headers.indexOf('ID_Cliente');
    const nombreIndex = headers.indexOf('Nombre_Cliente');
    const telefonoIndex = headers.indexOf('Telefono');
    const dniIndex = headers.indexOf('DNI');
    const domicilioIndex = headers.indexOf('Domicilio');

    if (idIndex === -1) {
      return res.status(500).json({
        success: false,
        error: 'No se encontró la columna ID_Cliente'
      });
    }

    let rowIndex = -1;
    let rowData = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][idIndex] === id) {
        rowIndex = i;
        rowData = rows[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // 3. Actualizar los datos en el arreglo
    const updatedRow = [...rowData];
    if (nombreIndex !== -1) updatedRow[nombreIndex] = nombre;
    if (telefonoIndex !== -1) updatedRow[telefonoIndex] = telefono || '';
    if (dniIndex !== -1) updatedRow[dniIndex] = dni || '';
    if (domicilioIndex !== -1) updatedRow[domicilioIndex] = domicilio || '';

    // 4. Escribir la fila actualizada (usando el rango específico)
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Clientes_y_Expedientes!A${rowIndex + 1}:J${rowIndex + 1}?valueInputOption=USER_ENTERED`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [updatedRow]
      })
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('❌ Error al actualizar:', errorText);
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar el cliente'
      });
    }

    console.log('✅ Cliente actualizado correctamente');
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Error en la API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
}
