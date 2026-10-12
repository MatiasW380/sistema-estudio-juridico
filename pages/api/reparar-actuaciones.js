// pages/api/reparar-actuaciones.js
// Reparación puntual: acomoda en las columnas A:O las actuaciones que quedaron
// escritas desplazadas hacia la derecha (por una celda suelta que desvió el
// "append" de Google), quita los duplicados y limpia las celdas sueltas.
//
//   GET /api/reparar-actuaciones           -> solo muestra qué haría (no cambia nada)
//   GET /api/reparar-actuaciones?aplicar=1 -> aplica la reparación

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
const COLUMNAS = 15; // A:O

export const config = { maxDuration: 30 };

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

const vacio = (v) => v === undefined || v === null || String(v).trim() === '';
const marcador = (contenido) => /^\[SAC:([^\]]+)\]/.exec(String(contenido || ''))?.[1] || null;

export default async function handler(req, res) {
  try {
    const aplicar = req.query.aplicar === '1';
    const token = await getAccessToken();
    if (!token) return res.status(500).json({ error: 'No se pudo obtener el token de Google' });
    const auth = { Authorization: `Bearer ${token}` };

    const lectura = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Actuaciones`, { headers: auth });
    if (!lectura.ok) return res.status(500).json({ error: `No se pudo leer Actuaciones (${lectura.status})` });
    const rows = (await lectura.json()).values || [];

    // Filas bien ubicadas: tienen ID en la columna A.
    let ultimaAlineada = 1;
    rows.forEach((r, i) => { if (i >= 1 && !vacio(r[0])) ultimaAlineada = i + 1; });

    const marcasExistentes = new Set();
    const clavesExistentes = new Set();
    const idsExistentes = new Set();
    let maxId = 0;
    rows.forEach((r, i) => {
      if (i < 1 || vacio(r[0])) return;
      idsExistentes.add(String(r[0]));
      const n = parseInt(r[0], 10);
      if (!Number.isNaN(n) && n > maxId) maxId = n;
      const m = marcador(r[5]);
      if (m) marcasExistentes.add(`${r[1]}|${m}`);
      clavesExistentes.add(`${r[1]}|${r[2]}|${r[3]}|${String(r[5] || '').slice(0, 80)}`);
    });

    const recuperadas = [];
    let duplicadas = 0;
    let sueltas = 0;
    let maxAncho = COLUMNAS;
    const filasALimpiar = [];

    rows.forEach((r, i) => {
      if (i < 1 || !vacio(r[0])) return;
      const j = r.findIndex((v) => !vacio(v));
      if (j === -1) return;
      maxAncho = Math.max(maxAncho, r.length);
      filasALimpiar.push(i + 1);

      const registro = r.slice(j, j + COLUMNAS);
      const esRegistro = j > 0 && !vacio(registro[0]) && !vacio(registro[1]) && /^\d+$/.test(String(registro[0]).trim());
      if (!esRegistro) { sueltas += 1; return; }

      const m = marcador(registro[5]);
      const clave = m ? `${registro[1]}|${m}` : `${registro[1]}|${registro[2]}|${registro[3]}|${String(registro[5] || '').slice(0, 80)}`;
      const set = m ? marcasExistentes : clavesExistentes;
      if (set.has(clave)) { duplicadas += 1; return; }
      set.add(clave);

      const fila = registro.slice();
      while (fila.length < COLUMNAS) fila.push('');
      if (idsExistentes.has(String(fila[0]))) { maxId += 1; fila[0] = String(maxId); }
      idsExistentes.add(String(fila[0]));
      recuperadas.push(fila);
    });

    const resumen = {
      modo: aplicar ? 'APLICADO' : 'VISTA PREVIA (agregá ?aplicar=1 para aplicar)',
      ultimaFilaBienUbicada: ultimaAlineada,
      filasDesplazadasEncontradas: filasALimpiar.length,
      actuacionesRecuperadas: recuperadas.length,
      duplicadasDescartadas: duplicadas,
      celdasSueltasLimpiadas: sueltas,
      recuperadasPorExpediente: recuperadas.reduce((acc, f) => { acc[f[1]] = (acc[f[1]] || 0) + 1; return acc; }, {}),
    };
    if (!aplicar || filasALimpiar.length === 0) return res.status(200).json(resumen);

    // 1) Limpiar todas las filas desplazadas / sueltas (cada una por separado,
    //    así no se toca ninguna fila bien ubicada que quede en el medio).
    const ultimaCol = letraColumna(maxAncho - 1);
    const rangos = filasALimpiar.map((n) => `Actuaciones!A${n}:${ultimaCol}${n}`);
    const limpiar = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values:batchClear`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranges: rangos }),
    });
    if (!limpiar.ok) return res.status(500).json({ error: `No se pudo limpiar (${limpiar.status})`, detalle: (await limpiar.text()).slice(0, 300) });

    // 2) Escribir las recuperadas en A:O, a continuación de la última fila bien ubicada.
    if (recuperadas.length > 0) {
      const desde = ultimaAlineada + 1;
      const rango = `Actuaciones!A${desde}:O${desde + recuperadas.length - 1}`;
      const escribir = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${rango}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: recuperadas }),
      });
      if (!escribir.ok) return res.status(500).json({ error: `Se limpió pero no se pudo escribir (${escribir.status})`, detalle: (await escribir.text()).slice(0, 300), resumen });
    }
    return res.status(200).json(resumen);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
