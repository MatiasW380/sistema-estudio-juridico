// pages/api/usuarios.js
// API para gestionar usuarios (solo admin)

import { appendToSheet, getAccessToken, verificarUsuario } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  console.log('🚀 API /api/usuarios ejecutándose...');
  
  // Verificar que el usuario sea admin
  const { email, pin } = req.headers;
  if (!email || !pin) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const usuario = await verificarUsuario(email, pin);
  if (!usuario || usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede gestionar usuarios' });
  }

  // GET: Obtener lista de usuarios
  if (req.method === 'GET') {
    try {
      const token = await getAccessToken();
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Usuarios`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const rows = data.values || [];
      if (rows.length === 0) {
        return res.status(200).json({ usuarios: [] });
      }
      const headers = rows[0];
      const usuarios = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i] || '');
        return obj;
      });
      return res.status(200).json({ usuarios });
    } catch (error) {
      console.error('❌ Error al obtener usuarios:', error);
      return res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  }

  // POST: Crear nuevo usuario (solo admin)
  if (req.method === 'POST') {
    try {
      const { email: newEmail, pin: newPin, rol = 'usuario' } = req.body;
      if (!newEmail || !newPin) {
        return res.status(400).json({ error: 'Email y PIN son obligatorios' });
      }
      if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
        return res.status(400).json({ error: 'El PIN debe ser de 4 dígitos' });
      }

      const result = await appendToSheet('Usuarios', [newEmail, newPin, rol, 'SI']);
      if (result) {
        return res.status(200).json({ success: true, message: 'Usuario creado correctamente' });
      } else {
        return res.status(500).json({ error: 'Error al crear usuario' });
      }
    } catch (error) {
      console.error('❌ Error al crear usuario:', error);
      return res.status(500).json({ error: 'Error al crear usuario' });
    }
  }

  // PUT: Cambiar estado de usuario (activar/desactivar)
  if (req.method === 'PUT') {
    try {
      const { email: targetEmail, activo } = req.body;
      if (!targetEmail) {
        return res.status(400).json({ error: 'Email es obligatorio' });
      }

      const token = await getAccessToken();
      // Leer todos los usuarios
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Usuarios`;
      const readResponse = await fetch(readUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await readResponse.json();
      const rows = data.values || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No hay usuarios' });
      }

      const headers = rows[0];
      const emailIndex = headers.indexOf('Email');
      const activoIndex = headers.indexOf('Activo');
      if (emailIndex === -1 || activoIndex === -1) {
        return res.status(500).json({ error: 'Estructura de usuarios incorrecta' });
      }

      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][emailIndex] === targetEmail) {
          rowIndex = i;
          break;
        }
      }
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Actualizar el estado
      const updatedRow = [...rows[rowIndex]];
      updatedRow[activoIndex] = activo ? 'SI' : 'NO';

      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Usuarios!A${rowIndex + 1}:D${rowIndex + 1}?valueInputOption=USER_ENTERED`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [updatedRow] })
      });

      if (updateResponse.ok) {
        return res.status(200).json({ success: true, message: 'Usuario actualizado' });
      } else {
        return res.status(500).json({ error: 'Error al actualizar usuario' });
      }
    } catch (error) {
      console.error('❌ Error al actualizar usuario:', error);
      return res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
