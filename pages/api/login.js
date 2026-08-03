// pages/api/login.js
// API para autenticar usuarios (email + PIN) contra la hoja "Usuarios"

import { verificarUsuario } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/login ejecutándose...');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email y PIN son obligatorios' });
    }

    const usuario = await verificarUsuario(email, pin);

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario o PIN incorrectos' });
    }

    return res.status(200).json({ usuario });
  } catch (error) {
    console.error('❌ Error en /api/login:', error);
    return res.status(500).json({ error: 'Error al verificar el usuario' });
  }
}
