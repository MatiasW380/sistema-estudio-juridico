// pages/api/biblioteca.js
// API para gestionar modelos, jurisprudencia y leyes

import { 
  getModelos, agregarModelo,
  getJurisprudencia, agregarJurisprudencia,
  getLeyes, agregarLey
} from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/biblioteca ejecutándose...');

  if (req.method === 'GET') {
    try {
      const { tipo } = req.query;
      if (tipo === 'modelos') {
        const modelos = await getModelos();
        return res.status(200).json({ modelos });
      } else if (tipo === 'jurisprudencia') {
        const jurisprudencia = await getJurisprudencia();
        return res.status(200).json({ jurisprudencia });
      } else if (tipo === 'leyes') {
        const leyes = await getLeyes();
        return res.status(200).json({ leyes });
      } else {
        const [modelos, jurisprudencia, leyes] = await Promise.all([
          getModelos(),
          getJurisprudencia(),
          getLeyes(),
        ]);
        return res.status(200).json({ modelos, jurisprudencia, leyes });
      }
    } catch (error) {
      console.error('❌ Error en GET:', error);
      return res.status(500).json({ error: 'Error al obtener datos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { tipo, nombre, fuero, contenido, tema, subtema, juzgado, cita, numero, jurisdiccion, texto } = req.body;

      if (tipo === 'modelo') {
        const resultado = await agregarModelo(nombre, fuero, contenido);
        return res.status(200).json({ success: resultado });
      } else if (tipo === 'jurisprudencia') {
        const resultado = await agregarJurisprudencia(tema, subtema, juzgado, cita);
        return res.status(200).json({ success: resultado });
      } else if (tipo === 'ley') {
        const resultado = await agregarLey(numero, jurisdiccion, texto);
        return res.status(200).json({ success: resultado });
      } else {
        return res.status(400).json({ error: 'Tipo no válido' });
      }
    } catch (error) {
      console.error('❌ Error en POST:', error);
      return res.status(500).json({ error: 'Error al guardar' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
