// pages/api/buscar-clientes.js
// API para buscar clientes/expedientes desde el buscador de la pantalla de Clientes
// (necesaria porque buscarClientes() usa credenciales de servidor y no puede
// llamarse directamente desde el navegador)

import { buscarClientes } from '../../lib/googleSheets';

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
  console.log('🚀 API /api/buscar-clientes ejecutándose...');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const userData = parseUserFromCookie(req.headers.cookie || '');
    if (!userData?.email) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { q } = req.query;
    const resultados = await buscarClientes(q || '', userData.email);
    return res.status(200).json({ clientes: resultados });
  } catch (error) {
    console.error('❌ Error en /api/buscar-clientes:', error);
    return res.status(500).json({ error: 'Error al buscar clientes' });
  }
}
