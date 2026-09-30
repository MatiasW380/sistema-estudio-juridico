// pages/api/sac/auth.js
// Intenta autenticar contra la Extranet del Poder Judicial de Córdoba (SAC).
//
// IMPORTANTE: el formulario real del SAC exige resolver un captcha de
// Cloudflare Turnstile (campos `cf-turnstile-response` y
// `Login$hdnCaptchaToken`). Un servidor no puede generar ese token — lo
// genera el navegador de la persona al resolver el desafío. Este endpoint
// intenta el login de todos modos, sin esos campos, para comprobar si
// Cloudflare deja pasar la petición (a veces el modo "invisible" del
// Turnstile no exige nada si la sesión/IP no resulta sospechosa) o si la
// rechaza. El resultado de esa prueba decide el próximo paso.

import * as cheerio from 'cheerio';

const EXTRANET_URL = 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx';

// Junta las cookies devueltas por el servidor (Set-Cookie puede venir en
// varias líneas) en un objeto { nombre: valor }, para ir arrastrando la
// sesión entre pedidos como haría un navegador.
function extraerCookies(response) {
  let raw = [];
  if (typeof response.headers.getSetCookie === 'function') {
    raw = response.headers.getSetCookie();
  } else {
    // Fallback para runtimes donde Headers no expone getSetCookie().
    for (const [k, v] of response.headers.entries()) {
      if (k.toLowerCase() === 'set-cookie') raw.push(v);
    }
  }
  const cookies = {};
  for (const linea of raw) {
    const parNombreValor = linea.split(';')[0];
    const idx = parNombreValor.indexOf('=');
    if (idx === -1) continue;
    const nombre = parNombreValor.slice(0, idx).trim();
    const valor = parNombreValor.slice(idx + 1).trim();
    if (nombre) cookies[nombre] = valor;
  }
  return cookies;
}

function armarCookieHeader(cookieJar) {
  return Object.entries(cookieJar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña } = req.body || {};
  if (!usuario || !contraseña) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
  }

  const headersComunes = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9',
  };

  try {
    // Paso 1: pedir la página de login para sacar el ViewState, el
    // EventValidation y las cookies iniciales de sesión.
    const resGet = await fetch(EXTRANET_URL, { headers: headersComunes });
    const htmlGet = await resGet.text();
    let cookieJar = extraerCookies(resGet);

    const $ = cheerio.load(htmlGet);
    const viewState = $('input[name="__VIEWSTATE"]').val() || '';
    const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val() || '';
    const eventValidation = $('input[name="__EVENTVALIDATION"]').val() || '';

    if (!viewState) {
      return res.status(502).json({
        success: false,
        conectado: false,
        etapa: 'obtener_formulario',
        error: 'No se pudo leer el formulario de login del SAC (puede haber cambiado de estructura).',
      });
    }

    // Paso 2: enviar el login con los NOMBRES REALES de campo (confirmados
    // contra una captura real del formulario): la contraseña va en
    // Login$txtUserContrasenia, no en Login$txtUserPassword.
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewState);
    formData.append('__VIEWSTATEGENERATOR', viewStateGenerator);
    formData.append('__EVENTVALIDATION', eventValidation);
    formData.append('Login$txtUserName', usuario);
    formData.append('Login$txtUserPassword', '');
    formData.append('Login$txtUserContrasenia', contraseña);
    formData.append('Login$cmdLogin', 'Ingresar');
    formData.append('PrometeoToken', '');
    formData.append('txtUsuarioCodificado', '');
    formData.append('txtPssCodificado', '');

    const resPost = await fetch(EXTRANET_URL, {
      method: 'POST',
      redirect: 'manual', // queremos ver si intenta redirigir (señal de login OK)
      headers: {
        ...headersComunes,
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://www.justiciacordoba.gob.ar',
        Referer: EXTRANET_URL,
        Cookie: armarCookieHeader(cookieJar),
      },
      body: formData.toString(),
    });

    const cookiesPost = extraerCookies(resPost);
    cookieJar = { ...cookieJar, ...cookiesPost };

    const htmlPost = resPost.status >= 300 && resPost.status < 400 ? '' : await resPost.text();

    // La señal real de sesión iniciada: la cookie .PROMETEO solo aparece
    // cuando el SAC valida usuario + contraseña + captcha correctamente.
    const tienePrometeo = Object.keys(cookieJar).some((c) => c.toUpperCase() === '.PROMETEO');
    const location = resPost.headers.get('location') || null;

    if (!tienePrometeo) {
      return res.status(200).json({
        success: false,
        conectado: false,
        etapa: 'login',
        diagnostico: {
          statusLogin: resPost.status,
          redirigioA: location,
          cookiesRecibidas: Object.keys(cookiesPost),
          tienePrometeo,
        },
        mensaje:
          'El SAC no entregó la cookie de sesión. Lo más probable es que haya bloqueado el intento por el captcha (Cloudflare Turnstile), que un servidor no puede resolver.',
        htmlSnippet: htmlPost.slice(0, 1500),
        expedientes: [],
      });
    }

    // Paso 3: con la sesión ya iniciada (.PROMETEO), entrar a MarcoPoloNet
    // (el módulo "SAC para abogados y auxiliares") y pedir la lista de
    // expedientes con movimientos recientes.
    let expedientes = [];
    let diagnosticoExpedientes = null;
    try {
      const resMarco = await fetch('https://www.justiciacordoba.gob.ar/marcopolonet/misnovedades', {
        headers: { ...headersComunes, Cookie: armarCookieHeader(cookieJar) },
      });
      const cookiesMarco = extraerCookies(resMarco);
      cookieJar = { ...cookieJar, ...cookiesMarco };

      const resExp = await fetch(
        'https://www.justiciacordoba.gob.ar/marcopolonet/api/Novedades/ObtenerExpedientes',
        {
          method: 'POST',
          headers: {
            ...headersComunes,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: 'https://www.justiciacordoba.gob.ar',
            Referer: 'https://www.justiciacordoba.gob.ar/MarcoPoloNet/misnovedades',
            Cookie: armarCookieHeader(cookieJar),
          },
          body: JSON.stringify({ pageIndex: null, pageSize: 20 }),
        },
      );

      const textoExp = await resExp.text();
      let jsonExp = null;
      try {
        jsonExp = JSON.parse(textoExp);
      } catch {
        // Puede no ser JSON si la sesión de MarcoPoloNet no quedó bien establecida
      }

      diagnosticoExpedientes = {
        status: resExp.status,
        esJSON: !!jsonExp,
        camposDetectados: jsonExp && typeof jsonExp === 'object' ? Object.keys(jsonExp) : null,
        muestraCruda: textoExp.slice(0, 1500),
      };

      if (jsonExp) {
        expedientes =
          jsonExp.expedienteNovedades ||
          (Array.isArray(jsonExp) ? jsonExp : jsonExp.data || jsonExp.items || jsonExp.Expedientes || []);
      }
    } catch (errorMarco) {
      diagnosticoExpedientes = { error: errorMarco.message };
    }

    return res.status(200).json({
      success: true,
      conectado: true,
      etapa: 'expedientes',
      diagnostico: {
        statusLogin: resPost.status,
        tienePrometeo,
      },
      diagnosticoExpedientes,
      mensaje: `Login exitoso. Se obtuvieron ${expedientes.length} expediente(s) de MarcoPoloNet (formato aún sin mapear).`,
      expedientes,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      conectado: false,
      etapa: 'error_inesperado',
      error: error.message,
    });
  }
}
