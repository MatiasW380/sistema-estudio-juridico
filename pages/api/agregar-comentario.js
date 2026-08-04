// pages/api/agregar-comentario.js
// API para agregar comentarios internos a expedientes

import { appendToSheet } from '../../lib/googleSheets';

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
  console.log('🚀 API /api/agregar-comentario ejecutándose...');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const userData = parseUserFromCookie(req.headers.cookie || '');
    if (!userData?.email) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { numeroSAC, comentario } = req.body;

    if (!numeroSAC || !comentario || !comentario.trim()) {
      return res.status(400).json({ error: 'N° SAC y comentario son obligatorios' });
    }

    // Generar ID único para comentario
    const idComentario = `COM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Obtener fecha actual en formato ISO
    const hoy = new Date();
    const fechaISO = hoy.toISOString().split('T')[0];

    const fila = [
      idComentario,
      numeroSAC,
      userData.email,
      fechaISO,
      comentario.trim(),
    ];

    console.log('📝 Agregando comentario:', { idComentario, numeroSAC, autor: userData.email });

    await appendToSheet('Comentarios_Expediente', fila);

    return res.status(200).json({ 
      success: true, 
      comentario: {
        ID_Comentario: idComentario,
        Numero_SAC: numeroSAC,
        Autor: userData.email,
        Fecha: fechaISO,
        Comentario: comentario.trim(),
      }
    });
  } catch (error) {
    console.error('❌ Error en /api/agregar-comentario:', error);
    return res.status(500).json({ error: 'Error al agregar comentario' });
  }
}
