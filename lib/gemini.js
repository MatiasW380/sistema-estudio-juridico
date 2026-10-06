// lib/gemini.js
// Llamada a Gemini con reintento automático y errores que explican la causa
// real. Antes cualquier 429 se mostraba como "límite diario alcanzado, esperá
// 24 horas", pero Google usa el mismo código para límites por MINUTO (pedidos
// o tokens por minuto), que se resuelven en segundos.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function analizarError(status, texto) {
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // no era JSON
  }
  const err = json?.error || {};
  const detalles = Array.isArray(err.details) ? err.details : [];

  let retrasoSeg = null;
  const info = detalles.find((d) => /RetryInfo/.test(d['@type'] || ''));
  const m = /([\d.]+)s/.exec(info?.retryDelay || '');
  if (m) retrasoSeg = Math.ceil(parseFloat(m[1]));

  const violaciones = detalles
    .filter((d) => /QuotaFailure/.test(d['@type'] || ''))
    .flatMap((d) => d.violations || []);
  const ids = violaciones.map((v) => `${v.quotaId || ''} ${v.quotaMetric || ''}`).join(' ');

  let tipo = 'desconocido';
  if (/PerDay/i.test(ids)) tipo = 'diario';
  else if (/PerMinute/i.test(ids)) tipo = 'por minuto';

  return { status, mensajeGoogle: err.message || texto.slice(0, 300), retrasoSeg, tipo, ids: ids.trim() };
}

export function mensajeParaUsuario(e) {
  if (e.status === 429) {
    if (e.tipo === 'diario') {
      return `Se agotó la cuota DIARIA de Gemini de esta API Key. Detalle de Google: ${e.mensajeGoogle}`;
    }
    if (e.tipo === 'por minuto') {
      return `Gemini rechazó el pedido por el límite POR MINUTO (puede ser por la cantidad de texto enviado). Reintentá en ${e.retrasoSeg || 60} segundos. Detalle de Google: ${e.mensajeGoogle}`;
    }
    return `Gemini devolvió 429 (límite de uso). Detalle de Google: ${e.mensajeGoogle}`;
  }
  if (e.status === 503) {
    return `Gemini está sobrecargado en este momento. Reintentá en unos segundos. Detalle: ${e.mensajeGoogle}`;
  }
  if (e.status === 400 || e.status === 403 || e.status === 404) {
    return `Gemini rechazó el pedido (${e.status}). Revisá la API Key y el modelo. Detalle de Google: ${e.mensajeGoogle}`;
  }
  return `Error en Gemini (${e.status}): ${e.mensajeGoogle}`;
}

/**
 * Devuelve { ok: true, texto } o { ok: false, error } (error ya listo para mostrar).
 * Reintenta una vez si Google pide esperar pocos segundos (429/503).
 */
export async function llamarGemini(prompt, apiKey, { maxOutputTokens = 8192, temperature = 0.3, limiteMs = 46000 } = {}) {
  const inicio = Date.now();
  const cuerpo = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  });

  let ultimo = null;
  for (let intento = 1; intento <= 2; intento += 1) {
    // Vercel corta la función a los 60 s con un error ilegible (504); se
    // corta antes, a mano, para poder avisar qué pasó.
    const restante = limiteMs - (Date.now() - inicio);
    if (restante < 8000) break;
    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), restante);
    let response;
    try {
      response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: cuerpo,
        signal: controlador.signal,
      });
    } catch (e) {
      clearTimeout(reloj);
      if (e.name === 'AbortError') {
        return { ok: false, status: 504, error: 'Gemini tardó demasiado en responder (casi un minuto). Probá de nuevo; si se repite, el texto a analizar es muy largo.' };
      }
      throw e;
    }
    clearTimeout(reloj);

    if (response.ok) {
      const data = await response.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return { ok: true, texto: texto || 'No se pudo generar respuesta.' };
    }

    const texto = await response.text();
    console.error(`❌ Error en Gemini (intento ${intento}):`, response.status, texto.slice(0, 1500));
    ultimo = analizarError(response.status, texto);

    const reintentable = (ultimo.status === 429 && ultimo.tipo !== 'diario') || ultimo.status === 503;
    const espera = Math.min(ultimo.retrasoSeg || 8, 20);
    if (intento === 1 && reintentable && Date.now() - inicio + espera * 1000 < 25000) {
      await esperar(espera * 1000);
      continue;
    }
    break;
  }
  if (!ultimo) {
    return { ok: false, status: 504, error: 'No quedó tiempo para completar el pedido a Gemini. Probá de nuevo.' };
  }
  return { ok: false, status: ultimo.status, error: mensajeParaUsuario(ultimo) };
}
