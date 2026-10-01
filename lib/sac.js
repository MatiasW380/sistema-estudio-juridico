// lib/sac.js
// Funciones compartidas para hablar con la Extranet / SAC del Poder
// Judicial de Córdoba. Ver notas de captcha en pages/api/sac/auth.js.

import * as cheerio from 'cheerio';

const EXTRANET_URL = 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx';

const HEADERS_COMUNES = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept-Language': 'es-ES,es;q=0.9',
};

function extraerCookies(response) {
  let raw = [];
  if (typeof response.headers.getSetCookie === 'function') {
    raw = response.headers.getSetCookie();
  } else {
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

/**
 * Intenta loguearse en el SAC. Devuelve { exito, cookieJar, diagnostico }.
 * Ver la nota sobre el captcha en pages/api/sac/auth.js: no lo enviamos
 * porque un servidor no puede resolverlo; en la práctica el SAC lo dejó
 * pasar en las pruebas realizadas.
 */
export async function loginSAC(usuario, contraseña) {
  const resGet = await fetch(EXTRANET_URL, { headers: HEADERS_COMUNES });
  const htmlGet = await resGet.text();
  let cookieJar = extraerCookies(resGet);

  const $ = cheerio.load(htmlGet);
  const viewState = $('input[name="__VIEWSTATE"]').val() || '';
  const viewStateGenerator = $('input[name="__VIEWSTATEGENERATOR"]').val() || '';
  const eventValidation = $('input[name="__EVENTVALIDATION"]').val() || '';

  if (!viewState) {
    return {
      exito: false,
      cookieJar,
      diagnostico: { etapa: 'obtener_formulario', error: 'No se pudo leer el formulario de login.' },
    };
  }

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
    redirect: 'manual',
    headers: {
      ...HEADERS_COMUNES,
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://www.justiciacordoba.gob.ar',
      Referer: EXTRANET_URL,
      Cookie: armarCookieHeader(cookieJar),
    },
    body: formData.toString(),
  });

  const cookiesPost = extraerCookies(resPost);
  cookieJar = { ...cookieJar, ...cookiesPost };
  const tienePrometeo = Object.keys(cookieJar).some((c) => c.toUpperCase() === '.PROMETEO');

  return {
    exito: tienePrometeo,
    cookieJar,
    diagnostico: { statusLogin: resPost.status, tienePrometeo },
  };
}

/**
 * Lista de expedientes con movimientos recientes (MarcoPoloNet).
 */
export async function obtenerExpedientesConNovedades(cookieJar, pageSize = 50) {
  await fetch('https://www.justiciacordoba.gob.ar/marcopolonet/misnovedades', {
    headers: { ...HEADERS_COMUNES, Cookie: armarCookieHeader(cookieJar) },
  });

  const resExp = await fetch('https://www.justiciacordoba.gob.ar/marcopolonet/api/Novedades/ObtenerExpedientes', {
    method: 'POST',
    headers: {
      ...HEADERS_COMUNES,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://www.justiciacordoba.gob.ar',
      Referer: 'https://www.justiciacordoba.gob.ar/MarcoPoloNet/misnovedades',
      Cookie: armarCookieHeader(cookieJar),
    },
    body: JSON.stringify({ pageIndex: null, pageSize }),
  });

  const texto = await resExp.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // no era JSON
  }

  const expedientes = json?.expedienteNovedades || [];
  return { expedientes, diagnostico: { status: resExp.status, esJSON: !!json } };
}

/**
 * Operaciones (movimientos) de un expediente puntual, dado su idExpediente
 * interno (el que viene en cada item de obtenerExpedientesConNovedades).
 */
export async function obtenerOperaciones(cookieJar, idExpediente) {
  const resOps = await fetch('https://www.justiciacordoba.gob.ar/marcopolonet/api/Radiografia/ObtenerOperaciones', {
    method: 'POST',
    headers: {
      ...HEADERS_COMUNES,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://www.justiciacordoba.gob.ar',
      Referer: 'https://www.justiciacordoba.gob.ar/MarcoPoloNet/misexpedientes/radiografia',
      Cookie: armarCookieHeader(cookieJar),
    },
    body: JSON.stringify({ idExpediente, includeEspeciales: false }),
  });

  const texto = await resOps.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // no era JSON
  }

  const operaciones = json?.operaciones || [];
  return { operaciones, diagnostico: { status: resOps.status, esJSON: !!json } };
}

/**
 * Texto completo de una operación puntual (lo que se ve al hacer clic en
 * un movimiento dentro de la radiografía del expediente en el SAC).
 */
export async function obtenerTextoOperacion(cookieJar, idOperacion) {
  const resTexto = await fetch(
    'https://www.justiciacordoba.gob.ar/marcopolonet/api/Radiografia/ObtenerTextoOperacion',
    {
      method: 'POST',
      headers: {
        ...HEADERS_COMUNES,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://www.justiciacordoba.gob.ar',
        Referer: 'https://www.justiciacordoba.gob.ar/MarcoPoloNet/misexpedientes/radiografia',
        Cookie: armarCookieHeader(cookieJar),
      },
      body: JSON.stringify({ idOperacion }),
    },
  );

  const texto = await resTexto.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // puede venir como texto plano directamente
  }

  let contenido = '';
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const candidato = json.texto ?? json.Texto ?? json.textoOperacion ?? json.contenido ?? json.html ?? json.Html;
    contenido = typeof candidato === 'string' ? candidato : '';
  } else if (typeof json === 'string') {
    contenido = json;
  } else if (typeof texto === 'string') {
    contenido = texto;
  }

  return {
    contenido,
    diagnostico: {
      status: resTexto.status,
      esJSON: !!json,
      camposDetectados: json && typeof json === 'object' ? Object.keys(json) : null,
      muestraCruda: texto.slice(0, 1500),
    },
  };
}

/**
 * El texto que devuelve el SAC suele venir en HTML simple. Lo convertimos
 * a texto plano legible para guardarlo en LexHub.
 */
export function limpiarHtmlOperacion(html) {
  if (typeof html !== 'string' || !html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Ntilde;/gi, 'Ñ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
