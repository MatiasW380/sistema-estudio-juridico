// lib/auth.js
// Re-exportamos las funciones de autenticación desde googleSheets.js

export { 
  verificarUsuario, 
  obtenerUsuarios, 
  agregarUsuario 
} from './googleSheets';
