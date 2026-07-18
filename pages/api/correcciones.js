// pages/api/correcciones.js
// API para guardar correcciones de IA

import { guardarCorreccionIA } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/correcciones ejecutándose...');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { numeroSAC, tipo, promptOriginal, textoGenerado, textoCorregido, usuario } = req.body;

    if (!numeroSAC || !textoGenerado || !textoCorregido) {
      return res.status(400).json({ error: 'numeroSAC, textoGenerado y textoCorregido son obligatorios' });
    }

    const resultado = await guardarCorreccionIA(
      numeroSAC,
      tipo || 'Escrito',
      promptOriginal || '',
      textoGenerado,
      textoCorregido,
      usuario || ''
    );

    if (resultado) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: 'Error al guardar corrección' });
    }
  } catch (error) {
    console.error('❌ Error en correcciones:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
