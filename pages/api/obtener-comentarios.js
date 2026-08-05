// pages/api/obtener-comentarios.js
// API para obtener todos los comentarios de un expediente

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;

export default async function handler(req, res) {
  console.log('🚀 API /api/obtener-comentarios ejecutándose...');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { numeroSAC } = req.query;

    if (!numeroSAC) {
      return res.status(400).json({ error: 'Número de SAC requerido' });
    }

    console.log(`📥 Buscando comentarios para SAC: ${numeroSAC}`);

    // Leer la hoja Comentarios_Expediente - usar range explícito
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Comentarios_Expediente!A:E`;
    const accessToken = await getAccessToken();

    const response = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Error al leer Sheets: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    console.log(`📊 Total de filas en Comentarios_Expediente: ${rows.length}`);
    if (rows.length > 0) {
      console.log(`📋 Primera fila (headers): ${JSON.stringify(rows[0])}`);
      console.log(`📋 Primeras 3 filas de datos: ${JSON.stringify(rows.slice(1, 4))}`);
    }

    if (rows.length === 0) {
      console.log('⚠️ La hoja Comentarios_Expediente está vacía');
      return res.status(200).json({ comentarios: [] });
    }

    // Primera fila son headers
    const headers = rows[0];
    console.log('🔍 Headers encontrados:', headers);

    // Buscar columnas de forma más flexible (case-insensitive, ignorar espacios extras)
    const normalize = (str) => (str || '').trim().toLowerCase();
    const findColumnIndex = (headerName) => {
      return headers.findIndex(h => normalize(h) === normalize(headerName));
    };

    const idxNumeroSAC = findColumnIndex('Numero_SAC');
    const idxAutor = findColumnIndex('Autor');
    const idxFecha = findColumnIndex('Fecha');
    const idxComentario = findColumnIndex('Comentario');

    console.log(`📍 Índices: SAC=${idxNumeroSAC}, Autor=${idxAutor}, Fecha=${idxFecha}, Comentario=${idxComentario}`);

    // Validar que todos los índices sean válidos
    if (idxNumeroSAC === -1 || idxAutor === -1 || idxFecha === -1 || idxComentario === -1) {
      console.error('❌ Una o más columnas no encontradas en la hoja');
      console.error('Headers disponibles:', headers);
      return res.status(200).json({ 
        comentarios: [],
        debug: {
          message: 'Columnas no encontradas',
          headersFound: headers,
          indicesRequested: { idxNumeroSAC, idxAutor, idxFecha, idxComentario }
        }
      });
    }

    // Filtrar comentarios del expediente y ordenar por fecha descendente
    const comentarios = rows
      .slice(1)
      .filter((row) => {
        const valor = row[idxNumeroSAC];
        const coincide = valor === numeroSAC;
        if (!coincide && row[idxNumeroSAC]) {
          console.log(`  ❌ No coincide SAC: "${valor}" !== "${numeroSAC}"`);
        }
        return coincide;
      })
      .map((row) => ({
        autor: row[idxAutor] || '',
        fecha: row[idxFecha] || '',
        comentario: row[idxComentario] || '',
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    console.log(`✅ Encontrados ${comentarios.length} comentarios para SAC ${numeroSAC}`);

    return res.status(200).json({ comentarios });
  } catch (error) {
    console.error('❌ Error en /api/obtener-comentarios:', error);
    return res.status(500).json({ error: 'Error al obtener comentarios', details: error.message });
  }
}
