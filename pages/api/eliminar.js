// pages/api/eliminar.js
// API para eliminar clientes o expedientes

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  console.log('🚀 API /api/eliminar ejecutándose...');
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { tipo, id, sac } = req.query;

    if (!tipo) {
      return res.status(400).json({ error: 'tipo es obligatorio (cliente o expediente)' });
    }

    const token = await getAccessToken();
    if (!token) {
      return res.status(500).json({ error: 'Error al obtener token de acceso' });
    }

    // 1. Leer todos los datos de la hoja
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Clientes_y_Expedientes`;
    const readResponse = await fetch(readUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!readResponse.ok) {
      return res.status(500).json({ error: 'Error al leer los datos' });
    }

    const data = await readResponse.json();
    const rows = data.values || [];
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron datos' });
    }

    const headers = rows[0];
    const idIndex = headers.indexOf('ID_Cliente');
    const sacIndex = headers.indexOf('Numero_SAC');

    if (idIndex === -1 || sacIndex === -1) {
      return res.status(500).json({ error: 'Estructura de hoja incorrecta' });
    }

    // 2. Encontrar filas a eliminar
    let filasAEliminar = [];

    if (tipo === 'cliente') {
      // Eliminar todas las filas con ese ID_Cliente
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idIndex] === id) {
          filasAEliminar.push(i);
        }
      }
      if (filasAEliminar.length === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
    } else if (tipo === 'expediente') {
      // Eliminar solo la fila con ese Numero_SAC
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][sacIndex] === sac) {
          filasAEliminar.push(i);
          break;
        }
      }
      if (filasAEliminar.length === 0) {
        return res.status(404).json({ error: 'Expediente no encontrado' });
      }
    } else {
      return res.status(400).json({ error: 'tipo debe ser "cliente" o "expediente"' });
    }

    // 3. Eliminar filas (de abajo hacia arriba para no desordenar índices)
    filasAEliminar.sort((a, b) => b - a);
    let eliminados = 0;

    for (const rowIndex of filasAEliminar) {
      // Usamos batchUpdate para eliminar una fila
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values:batchUpdate`;
      const batchResponse = await fetch(batchUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: [
            {
              range: `Clientes_y_Expedientes!A${rowIndex + 1}:J${rowIndex + 1}`,
              values: [Array(10).fill('')],
            }
          ],
        }),
      });

      if (batchResponse.ok) {
        eliminados++;
      } else {
        console.error(`❌ Error al eliminar fila ${rowIndex}`);
      }
    }

    // 4. Limpiar filas vacías (opcional)
    // Por simplicidad, dejamos las celdas vacías

    console.log(`✅ Eliminados ${eliminados} registros`);
    return res.status(200).json({ 
      success: true, 
      eliminados,
      mensaje: `Se eliminaron ${eliminados} registros`
    });

  } catch (error) {
    console.error('❌ Error en la API:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
}
