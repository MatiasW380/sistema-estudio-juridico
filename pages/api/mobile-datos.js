// pages/api/mobile-datos.js
// Endpoint que devuelve clientes y expedientes para la versión móvil

import { readSheet } from '../../lib/googleSheets';

export default async function handler(req, res) {
  try {
    const rows = await readSheet('Clientes_y_Expedientes');
    
    if (!rows || rows.length < 2) {
      return res.status(200).json({ clientes: [], expedientes: [] });
    }

    const headers = rows[0];
    const idxNombre = headers.indexOf('Nombre_Cliente');
    const idxSAC = headers.indexOf('Numero_SAC');
    const idxCaratula = headers.indexOf('Caratula');
    const idxJuzgado = headers.indexOf('Juzgado');
    const idxCiudad = headers.indexOf('Ciudad');
    const idxFuero = headers.indexOf('Fuero');

    const clientesMap = new Map(); // normalizado -> nombre mostrable
    const expedientesData = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const nombre = (row[idxNombre] || '').trim();
      
      if (!nombre) continue;

      // Normalizar: ordenar palabras alfabéticamente para agrupar variaciones
      const palabras = nombre.split(' ').filter(Boolean);
      const nombreNormalizado = palabras.sort().join(' ');

      // Guardar el nombre más largo (probablemente más completo)
      if (!clientesMap.has(nombreNormalizado) || nombre.length > clientesMap.get(nombreNormalizado).length) {
        clientesMap.set(nombreNormalizado, nombre);
      }

      expedientesData.push({
        cliente: nombreNormalizado,
        sac: row[idxSAC] || '',
        caratula: row[idxCaratula] || '',
        juzgado: row[idxJuzgado] || '',
        ciudad: row[idxCiudad] || '',
        fuero: row[idxFuero] || '',
      });
    }

    // Convertir a lista: mantener relación normalizado -> mostrable
    const clientesList = Array.from(clientesMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([normalizado, mostrable]) => ({
        normalizado,
        mostrable
      }));
    
    console.log(`📱 Mobile: ${clientesList.length} clientes únicos, ${expedientesData.length} expedientes`);

    res.status(200).json({
      clientes: clientesList,
      expedientes: expedientesData
    });
  } catch (error) {
    console.error('Error en mobile-datos:', error);
    res.status(500).json({ error: error.message });
  }
}
