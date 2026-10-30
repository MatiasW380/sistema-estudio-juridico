// pages/api/sac/estado-sesion.js
// Indica si la sesión del SAC guardada del usuario sigue activa. Al consultarla
// con una llamada liviana, además la mantiene en uso (si el SAC renueva la
// sesión con la actividad, así no se vence por inactividad).
// POST { email } -> { tieneSesion, activa }

import { getSesionSAC } from '../../../lib/googleSheets';
import { parsearSesionPegada, armarCookieJarDeSesion, obtenerExpedientesConNovedades } from '../../../lib/sac';

export const config = { maxDuration: 20 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Falta el email' });

  try {
    const pegada = parsearSesionPegada(await getSesionSAC(email));
    if (!pegada) return res.status(200).json({ tieneSesion: false, activa: false });
    const { diagnostico } = await obtenerExpedientesConNovedades(await armarCookieJarDeSesion(pegada), 1);
    return res.status(200).json({ tieneSesion: true, activa: !!diagnostico.esJSON });
  } catch (error) {
    // Error de red o de Google: no se sabe, no se marca como vencida.
    return res.status(200).json({ tieneSesion: true, activa: null, error: error.message });
  }
}
