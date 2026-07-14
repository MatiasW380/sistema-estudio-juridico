// lib/auth.js
// Funciones de autenticación para el sistema

import { getSheetData } from './googleSheets';

// Función para verificar usuario (email + PIN)
export async function verificarUsuario(email, pin) {
  try {
    // Leer la pestaña Usuarios
    const data = await getSheetData('Usuarios');
    if (!data || data.length <= 1) {
      console.error('No se encontró la pestaña Usuarios o está vacía');
      return null;
    }

    // Buscar el email en la planilla
    const headers = data[0];
    const emailIndex = headers.indexOf('Email');
    const pinIndex = headers.indexOf('PIN_Hash');
    const rolIndex = headers.indexOf('Rol');
    const activoIndex = headers.indexOf('Activo');

    if (emailIndex === -1 || pinIndex === -1) {
      console.error('La pestaña Usuarios no tiene las columnas Email o PIN_Hash');
      return null;
    }

    // Buscar el usuario por email
    const rows = data.slice(1);
    const usuarioRow = rows.find(row => row[emailIndex]?.toLowerCase() === email.toLowerCase());

    if (!usuarioRow) {
      console.error('Usuario no encontrado');
      return null;
    }

    // Verificar si el usuario está activo
    if (activoIndex !== -1 && usuarioRow[activoIndex]?.toLowerCase() !== 'si') {
      console.error('Usuario inactivo');
      return null;
    }

    // Verificar el PIN (por ahora en texto plano, luego se hasheará)
    const pinGuardado = usuarioRow[pinIndex] || '';
    if (pinGuardado !== pin) {
      console.error('PIN incorrecto');
      return null;
    }

    // Usuario válido
    return {
      email: usuarioRow[emailIndex],
      rol: usuarioRow[rolIndex] || 'usuario',
      activo: usuarioRow[activoIndex] || 'SI'
    };
  } catch (error) {
    console.error('Error al verificar usuario:', error);
    return null;
  }
}

// Función para obtener todos los usuarios (solo para admin)
export async function obtenerUsuarios() {
  try {
    const data = await getSheetData('Usuarios');
    if (!data || data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return [];
  }
}

// Función para agregar un nuevo usuario (solo admin)
export async function agregarUsuario(email, pin, rol = 'usuario') {
  try {
    // Verificar que el email no exista ya
    const usuarios = await obtenerUsuarios();
    if (usuarios.some(u => u.Email?.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'El email ya está registrado' };
    }

    // Agregar a la planilla
    const values = [email, pin, rol, 'SI'];
    const result = await appendToSheet('Usuarios', values);
    
    if (result) {
      return { success: true };
    } else {
      return { success: false, error: 'Error al guardar en la planilla' };
    }
  } catch (error) {
    console.error('Error al agregar usuario:', error);
    return { success: false, error: error.message };
  }
}
