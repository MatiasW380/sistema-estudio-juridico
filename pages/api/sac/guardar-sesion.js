// pages/api/sac/guardar-sesion.js
// Guarda la sesión del SAC que el usuario abrió en su propio navegador (donde
// el captcha se resuelve solo). LexHub la usa en lugar del login con contraseña.
// POST { email, cookie }  (cookie vacía = borrar la sesión guardada)

import { guardarSesionSAC } from '../../../lib/googleSheets';
import { parsearSesionPegada } from '../../../lib/sac';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email, cookie } = req.body || {};
  if (!email) return res.status(400).json({ success: false, mensaje: 'Falta el email' });

  const texto = String(cookie || '').trim();
  if (texto && !parsearSesionPegada(texto)) {
    return res.status(200).json({
      success: false,
      mensaje: 'No reconocí la cookie. Pegá el valor de la cookie .PROMETEO (o el encabezado Cookie completo, que la incluya).',
    });
  }
  const r = await guardarSesionSAC(email, texto);
  if (!r.ok) return res.status(200).json({ success: false, mensaje: r.error });
  return res.status(200).json({ success: true });
}
