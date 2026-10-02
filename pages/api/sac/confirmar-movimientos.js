// pages/api/sac/confirmar-movimientos.js
// Recibe los movimientos que la persona eligió en la previsualización
// (/api/sac/sincronizar) y los agrega a la hoja "Actuaciones". No vuelve a
// contactar al SAC: ya tiene todo lo que necesita (texto incluido) desde
// la previsualización, así que esto es rápido.

import { readSheet, appendToSheet } from '../../../lib/googleSheets';

export const config = { maxDuration: 30 };

function marcarContenido(idOperacion, texto) {
  return `[SAC:${idOperacion}] ${texto}`;
}

function extraerIdOperacion(contenido) {
  const m = /^\[SAC:([^\]]+)\]/.exec(contenido || '');
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { seleccionados } = req.body || {};
  if (!Array.isArray(seleccionados) || seleccionados.length === 0) {
    return res.status(400).json({ success: false, error: 'No se recibieron movimientos seleccionados' });
  }

  try {
    const filasActuaciones = await readSheet('Actuaciones');
    const headers = filasActuaciones[0] || [];
    const idxNumeroSAC = headers.indexOf('Numero_SAC');
    const idxContenido = headers.indexOf('Contenido');
    const idxID = headers.indexOf('ID');

    let maxId = 0;
    const idsExistentesPorExpediente = new Map();
    for (let i = 1; i < filasActuaciones.length; i++) {
      const fila = filasActuaciones[i];
      const idNum = parseInt(fila[idxID], 10);
      if (!Number.isNaN(idNum) && idNum > maxId) maxId = idNum;

      const numeroSAC = String(fila[idxNumeroSAC] || '').trim();
      const idOp = extraerIdOperacion(fila[idxContenido]);
      if (numeroSAC && idOp) {
        if (!idsExistentesPorExpediente.has(numeroSAC)) idsExistentesPorExpediente.set(numeroSAC, new Set());
        idsExistentesPorExpediente.get(numeroSAC).add(idOp);
      }
    }

    let siguienteId = maxId + 1;
    const filasNuevas = [];
    let omitidosPorDuplicado = 0;

    for (const mov of seleccionados) {
      const numeroSAC = String(mov.numeroSAC || '').trim();
      const idOperacion = mov.idOperacion;
      if (!numeroSAC || !idOperacion) continue;

      const yaExiste = idsExistentesPorExpediente.get(numeroSAC)?.has(idOperacion);
      if (yaExiste) {
        omitidosPorDuplicado++;
        continue;
      }

      filasNuevas.push([
        String(siguienteId++),
        numeroSAC,
        mov.fecha || '',
        mov.tipoOperacion || 'Movimiento SAC',
        'SAC',
        marcarContenido(idOperacion, mov.contenido || '(sin detalle disponible)'),
        'NO', // presentado
        'NO', // enviado
        'NO', // tienePDF
        '', // idPDFDrive
        'NO', // esBorrador
        'Sync SAC', // creadoPor
        '', // compartidoCon
      ]);
    }

    if (filasNuevas.length > 0) {
      await appendToSheet('Actuaciones', filasNuevas);
    }

    return res.status(200).json({
      success: true,
      mensaje: `Se agregaron ${filasNuevas.length} movimiento(s) a LexHub.${
        omitidosPorDuplicado > 0 ? ` (${omitidosPorDuplicado} ya estaban y se omitieron)` : ''
      }`,
      agregados: filasNuevas.length,
      omitidosPorDuplicado,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
