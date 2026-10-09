// pages/api/actuaciones-importante.js
// Marca / desmarca una actuación como "Importante". Guarda el valor en una
// columna "Importante" (SI / vacío) de la hoja Actuaciones; si la columna
// todavía no existe, la crea sola al final del encabezado.

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

function letraColumna(indice) {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id, numeroSAC, importante } = req.body || {};
  // Campo a escribir: por defecto "Importante" (SI / vacío); también "Categoria_Manual"
  // (yo / juzgado / contraparte / asesoria / vacío = automático).
  const CAMPOS = ['Importante', 'Categoria_Manual'];
  const campo = req.body?.campo || 'Importante';
  if (!CAMPOS.includes(campo)) return res.status(400).json({ error: 'Campo no permitido' });
  const CATEGORIAS_OK = ['', 'yo', 'juzgado', 'contraparte', 'asesoria'];
  let valor;
  if (campo === 'Importante') valor = importante ? 'SI' : '';
  else {
    valor = String(req.body?.valor || '');
    if (!CATEGORIAS_OK.includes(valor)) return res.status(400).json({ error: 'Valor no permitido' });
  }
  if (!id || !numeroSAC) {
    return res.status(400).json({ error: 'id y numeroSAC son obligatorios' });
  }

  try {
    const token = await getAccessToken();
    if (!token) return res.status(500).json({ error: 'No se pudo obtener el token de Google' });
    const auth = { Authorization: `Bearer ${token}` };

    const lectura = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Actuaciones`, { headers: auth });
    if (!lectura.ok) return res.status(500).json({ error: 'No se pudo leer la hoja Actuaciones' });
    const rows = (await lectura.json()).values || [];
    if (rows.length < 2) return res.status(404).json({ error: 'No hay actuaciones' });

    const headers = rows[0].map((h) => (h || '').toString().trim());
    const idIdx = headers.indexOf('ID');
    const sacIdx = headers.indexOf('Numero_SAC');
    if (idIdx === -1 || sacIdx === -1) return res.status(500).json({ error: 'Estructura de hoja incorrecta' });

    let filaIdx = -1;
    for (let i = 1; i < rows.length; i += 1) {
      if (String(rows[i][idIdx] || '') === String(id) && String(rows[i][sacIdx] || '') === String(numeroSAC)) {
        filaIdx = i;
        break;
      }
    }
    if (filaIdx === -1) return res.status(404).json({ error: 'Actuación no encontrada' });

    let colIdx = headers.indexOf(campo);
    if (colIdx === -1) {
      colIdx = headers.length;
      const rangoHeader = `Actuaciones!${letraColumna(colIdx)}1`;
      const escribirHeader = () =>
        fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(rangoHeader)}?valueInputOption=RAW`,
          { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [[campo]] }) },
        );

      let crear = await escribirHeader();
      if (!crear.ok) {
        // Lo más probable: la hoja no tiene una columna libre a la derecha.
        // Se agrega una columna a la grilla y se reintenta.
        const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}?fields=sheets.properties`, { headers: auth });
        const meta = metaRes.ok ? await metaRes.json() : null;
        const hoja = meta?.sheets?.find((h) => h.properties?.title === 'Actuaciones');
        if (hoja) {
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}:batchUpdate`, {
            method: 'POST',
            headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: [{ appendDimension: { sheetId: hoja.properties.sheetId, dimension: 'COLUMNS', length: 1 } }] }),
          });
          crear = await escribirHeader();
        }
      }
      if (!crear.ok) {
        const detalle = (await crear.text()).slice(0, 300);
        return res.status(500).json({
          error: `No se pudo crear la columna "${campo}" (Google respondió ${crear.status}). Podés crearla a mano en la hoja Actuaciones, en la primera celda vacía del encabezado. Detalle: ${detalle}`,
        });
      }
    }

    const rango = `Actuaciones!${letraColumna(colIdx)}${filaIdx + 1}`;
    const guardar = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${encodeURIComponent(rango)}?valueInputOption=RAW`,
      { method: 'PUT', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [[valor]] }) },
    );
    if (!guardar.ok) return res.status(500).json({ error: 'No se pudo guardar el cambio' });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error en /api/actuaciones-importante:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
