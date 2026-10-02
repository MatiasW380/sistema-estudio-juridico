// pages/api/sac/test-cedulas.js
// Prueba aislada: login + ObtenerCedulas, nada más. Separado del resto de
// la lógica para no arriesgar los otros pedidos (ver nota sobre el 401 en
// obtenerMasDatosOperacion cuando se encadenan muchos pedidos seguidos).

import { loginSAC, obtenerCedulas, resolverCredencialesSAC } from '../../../lib/sac';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña, error: errorCred } = await resolverCredencialesSAC(req.body);
  if (errorCred) {
    return res.status(200).json({ success: false, mensaje: errorCred });
  }

  try {
    const login = await loginSAC(usuario, contraseña);
    if (!login.exito) {
      return res.status(200).json({ success: false, mensaje: 'No se pudo conectar al SAC', diagnostico: login.diagnostico });
    }

    const { diagnostico } = await obtenerCedulas(login.cookieJar, 10);

    return res.status(200).json({ success: true, mensaje: 'Login OK. Mostrando respuesta cruda de ObtenerCedulas.', diagnostico });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
