// pages/api/sac/auth.js
// Endpoint de prueba/diagnóstico: login al SAC + lista de expedientes +
// prueba de movimientos del primer expediente. La lógica real vive en
// lib/sac.js (compartida con /api/sac/sincronizar).

import {
  loginSAC,
  obtenerExpedientesConNovedades,
  obtenerOperaciones,
  obtenerTextoOperacion,
  obtenerTextoEscrito,
  obtenerMasDatosOperacion,
  resolverCredencialesSAC,
} from '../../../lib/sac';

export const config = { maxDuration: 60 };

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
    let diagnosticoTextoEscrito = null;
    let diagnosticoMasDatos = null;
    if (expedientes.length > 0 && expedientes[0].idExpediente) {
      const { operaciones, diagnostico } = await obtenerOperaciones(login.cookieJar, expedientes[0].idExpediente);
      diagnosticoOperaciones = {
        expedienteProbado: expedientes[0].numeroExpediente,
        totalOperaciones: operaciones.length,
        ...diagnostico,
      };

      if (operaciones.length > 0 && operaciones[0].idOperacion) {
        const { diagnostico: diagTexto } = await obtenerTextoOperacion(login.cookieJar, operaciones[0].idOperacion);
        diagnosticoTexto = {
          idOperacionProbado: operaciones[0].idOperacion,
          esEscrito: operaciones[0].esEscrito,
          endpoint: 'ObtenerTextoOperacion',
          ...diagTexto,
        };
      }

      // Si hay alguna operación marcada como escrito, probamos también el
      // otro endpoint para ver su respuesta real.
      const operacionEscrito = operaciones.find((o) => o.esEscrito && o.idOperacion);
      if (operacionEscrito) {
        const { diagnostico: diagEscrito } = await obtenerTextoEscrito(login.cookieJar, operacionEscrito.idOperacion);
        diagnosticoTextoEscrito = {
          idOperacionProbado: operacionEscrito.idOperacion,
          endpoint: 'ObtenerTextoEscrito',
          ...diagEscrito,
        };
      }

      // obtenerMasDatosOperacion solo se prueba si se pide explícitamente
      // (?probarMasDatos=1), para no sumar una llamada extra en cada
      // conexión normal y arriesgar un bloqueo por exceso de pedidos.
      if (req.query?.probarMasDatos === '1' && operaciones.length > 0 && operaciones[0].idOperacion) {
        const { diagnostico: diagMas } = await obtenerMasDatosOperacion(
          login.cookieJar,
          expedientes[0].idExpediente,
          operaciones[0].idOperacion,
          operaciones[0].esEscrito,
        );
        diagnosticoMasDatos = {
          idOperacionProbado: operaciones[0].idOperacion,
          endpoint: 'obtenerMasDatosOperacion',
          ...diagMas,
        };
      }
    }

    return res.status(200).json({
      success: true,
      conectado: true,
      diagnostico: login.diagnostico,
      diagnosticoExpedientes,
      diagnosticoOperaciones,
      diagnosticoTexto,
      diagnosticoTextoEscrito,
      diagnosticoMasDatos,
      mensaje: `Login exitoso. Se obtuvieron ${expedientes.length} expediente(s) con novedades recientes.`,
      expedientes,
    });
  } catch (error) {
    return res.status(500).json({ success: false, conectado: false, error: error.message });
  }
}
