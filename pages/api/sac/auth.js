// pages/api/sac/auth.js
// Endpoint de prueba/diagnóstico: login al SAC + lista de expedientes +
// prueba de movimientos del primer expediente. La lógica real vive en
// lib/sac.js (compartida con /api/sac/sincronizar).

import { loginSAC, obtenerExpedientesConNovedades, obtenerOperaciones, obtenerTextoOperacion } from '../../../lib/sac';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña } = req.body || {};
  if (!usuario || !contraseña) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
  }

  try {
    const login = await loginSAC(usuario, contraseña);

    if (!login.exito) {
      return res.status(200).json({
        success: false,
        conectado: false,
        mensaje:
          'El SAC no entregó la cookie de sesión. Lo más probable es que haya pedido el captcha (Cloudflare Turnstile) esta vez.',
        diagnostico: login.diagnostico,
        expedientes: [],
      });
    }

    const { expedientes, diagnostico: diagnosticoExpedientes } = await obtenerExpedientesConNovedades(
      login.cookieJar,
    );

    let diagnosticoOperaciones = null;
    let diagnosticoTexto = null;
    if (expedientes.length > 0 && expedientes[0].idExpediente) {
      const { operaciones, diagnostico } = await obtenerOperaciones(login.cookieJar, expedientes[0].idExpediente);
      diagnosticoOperaciones = {
        expedienteProbado: expedientes[0].numeroExpediente,
        totalOperaciones: operaciones.length,
        ...diagnostico,
      };

      if (operaciones.length > 0 && operaciones[0].idOperacion) {
        const { diagnostico: diagTexto } = await obtenerTextoOperacion(login.cookieJar, operaciones[0].idOperacion);
        diagnosticoTexto = { idOperacionProbado: operaciones[0].idOperacion, ...diagTexto };
      }
    }

    return res.status(200).json({
      success: true,
      conectado: true,
      diagnostico: login.diagnostico,
      diagnosticoExpedientes,
      diagnosticoOperaciones,
      diagnosticoTexto,
      mensaje: `Login exitoso. Se obtuvieron ${expedientes.length} expediente(s) con novedades recientes.`,
      expedientes,
    });
  } catch (error) {
    return res.status(500).json({ success: false, conectado: false, error: error.message });
  }
}
