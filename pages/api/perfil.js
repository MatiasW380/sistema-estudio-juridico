// pages/api/perfil.js
// API para obtener y actualizar perfil del usuario

import { getPerfilUsuario, actualizarPerfilUsuario } from '../../lib/googleSheets';

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

  if (!userData?.email) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.method === 'GET') {
    try {
      const perfil = await getPerfilUsuario(userData.email);
      return res.status(200).json({ perfil: perfil || {} });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return res.status(500).json({ error: 'Error al obtener perfil' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nombre, domicilioConstituido, matricula } = req.body || {};

      if (!nombre || !domicilioConstituido || !matricula) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }

      const ok = await actualizarPerfilUsuario(
        userData.email,
        nombre,
        domicilioConstituido,
        matricula,
      );

      if (!ok) {
        return res.status(500).json({ error: 'Error al actualizar perfil' });
      }

      const perfilActualizado = await getPerfilUsuario(userData.email);
      return res.status(200).json({ success: true, perfil: perfilActualizado });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      return res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
