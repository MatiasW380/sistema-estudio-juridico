// pages/api/biblioteca.js
// API para gestionar modelos, jurisprudencia y leyes

import {
  getModelos,
  agregarModelo,
  getJurisprudencia,
  agregarJurisprudencia,
  getLeyes,
  agregarLey,
} from '../../lib/googleSheets';

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    return data?.email ? data : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const userData = parseUserFromCookie(req.headers.cookie || '');

  // Opcional: si querés bloquear anónimos en API
  if (!userData?.email) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.method === 'GET') {
    try {
      const { tipo, q, tema, subtema } = req.query;

      if (tipo === 'modelos') {
        const modelos = await getModelos();
        return res.status(200).json({ modelos: modelos || [] });
      }

      if (tipo === 'jurisprudencia') {
        // Soporta búsqueda por q (tema/subtema/juzgado/cita), además de filtros clásicos
        const jurisprudencia = await getJurisprudencia(
          tema || null,
          subtema || null,
          q || null,
        );
        return res.status(200).json({ jurisprudencia: jurisprudencia || [] });
      }

      if (tipo === 'leyes') {
        const leyes = await getLeyes();
        return res.status(200).json({ leyes: leyes || [] });
      }

      const [modelos, jurisprudencia, leyes] = await Promise.all([
        getModelos(),
        getJurisprudencia(null, null, q || null),
        getLeyes(),
      ]);

      return res.status(200).json({
        modelos: modelos || [],
        jurisprudencia: jurisprudencia || [],
        leyes: leyes || [],
      });
    } catch (error) {
      console.error('❌ Error en GET /api/biblioteca:', error);
      return res.status(500).json({ error: 'Error al obtener datos' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        tipo,
        nombre,
        fuero,
        contenido,
        tema,
        subtema,
        juzgado,
        cita,
        numero,
        jurisdiccion,
        texto,
      } = req.body || {};

      if (tipo === 'modelo') {
        if (!nombre || !contenido) {
          return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, contenido' });
        }

        const ok = await agregarModelo(nombre, fuero || '', contenido);
        if (!ok) return res.status(500).json({ error: 'No se pudo guardar el modelo' });

        return res.status(200).json({ success: true });
      }

      if (tipo === 'jurisprudencia') {
        if (!tema || !cita) {
          return res.status(400).json({ error: 'Faltan campos obligatorios: tema, cita' });
        }

        const ok = await agregarJurisprudencia(tema, subtema || '', juzgado || '', cita);
        if (!ok) return res.status(500).json({ error: 'No se pudo guardar la jurisprudencia' });

        return res.status(200).json({ success: true });
      }

      if (tipo === 'ley') {
        if (!numero || !texto) {
          return res.status(400).json({ error: 'Faltan campos obligatorios: numero, texto' });
        }

        const ok = await agregarLey(numero, jurisdiccion || '', texto);
        if (!ok) return res.status(500).json({ error: 'No se pudo guardar la ley' });

        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Tipo no válido' });
    } catch (error) {
      console.error('❌ Error en POST /api/biblioteca:', error);
      return res.status(500).json({ error: 'Error al guardar' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
