// pages/api/sac/estado-sesion.js
// Indica si la sesión del SAC guardada del usuario sigue activa. Al consultarla
// con una llamada liviana, además la mantiene en uso (si el SAC renueva la
// sesión con la actividad, así no se vence por inactividad).
// POST { email } -> { tieneSesion, activa }

import { getSesionSAC } from '../../../lib/googleSheets';
import { parsearSesionPegada, armarCookieJarDeSesion, obtenerExpedientesConNovedades, resolverCredencialesSAC, loginSAC } from '../../../lib/sac';

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Falta el email' });

  try {
    const pegada = parsearSesionPegada(await getSesionSAC(email));
    if (pegada) {
      const { diagnostico } = await obtenerExpedientesConNovedades(await armarCookieJarDeSesion(pegada), 1);
      if (diagnostico.esJSON) return res.status(200).json({ tieneSesion: true, activa: true, modo: 'sesion' });
    }
    // Sin sesión pegada, o vencida: si el SAC deja entrar con usuario y
    // contraseña (a veces no pide captcha), la conexión igual funciona. Solo
    // se prueba cuando se pide (al abrir LexHub), no en cada chequeo.
    if (req.body?.probarLogin) {
      const { usuario, contraseña, error } = await resolverCredencialesSAC({ email });
      if (!error) {
        const login = await loginSAC(usuario, contraseña);
        if (login.exito) return res.status(200).json({ tieneSesion: !!pegada, activa: true, modo: 'login' });
      }
    }
    return res.status(200).json({ tieneSesion: !!pegada, activa: false });
  } catch (error) {
    // Error de red o de Google: no se sabe, no se marca como vencida.
    return res.status(200).json({ tieneSesion: true, activa: null, error: error.message });
  }
}
