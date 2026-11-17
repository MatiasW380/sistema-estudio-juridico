// lib/actuaciones.js
// Clasifica cada actuación según quién la originó, para mostrarla con el
// título correcto y un código de color: propia, juzgado, contraparte o
// asesoría. Sirve tanto para las que vienen del SAC como para las cargadas a mano.

export const CATEGORIAS = {
  // fondo: tinte suave de la tarjeta · hover: al pasar el mouse · borde: contorno
  // acento: barra lateral · texto: color de la etiqueta
  yo: { nombre: 'Presentados por mí', fondo: '#f0f9ff', hover: '#e0f2fe', borde: '#bae6fd', acento: '#38bdf8', texto: '#0369a1' },
  juzgado: { nombre: 'Emitidos por el juzgado', fondo: '#f8fafc', hover: '#f1f5f9', borde: '#e2e8f0', acento: '#94a3b8', texto: '#475569' },
  contraparte: { nombre: 'Contraparte', fondo: '#fffbeb', hover: '#fef3c7', borde: '#fde68a', acento: '#f59e0b', texto: '#92400e' },
  asesoria: { nombre: 'Asesoría', fondo: '#f5f3ff', hover: '#ede9fe', borde: '#ddd6fe', acento: '#8b5cf6', texto: '#5b21b6' },
  perito: { nombre: 'Perito', fondo: '#f0fdf4', hover: '#dcfce7', borde: '#bbf7d0', acento: '#22c55e', texto: '#166534' },
  oficio: { nombre: 'Respuesta a oficio', fondo: '#fff1f2', hover: '#ffe4e6', borde: '#fecdd3', acento: '#fb7185', texto: '#9f1239' },
  otro: { nombre: 'Otros', fondo: '#ffffff', hover: '#f8fafc', borde: '#e2e8f0', acento: '#cbd5e1', texto: '#475569' },
};

const sinMarcador = (c) => (c || '').replace(/^\[SAC:[^\]]+\]\s*/, '');

function tokens(texto) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

// "Presentado por: BARONETTO, OSCAR MATIAS" -> "BARONETTO, OSCAR MATIAS"
// (solo si está al comienzo del texto; en el cuerpo de un decreto la frase
// puede aparecer con otro sentido).
export function extraerPresentante(contenido) {
  const limpio = sinMarcador(contenido).trim();
  const m = /^presentado por:\s*(?:presentado por:\s*)?([^\n]+)/i.exec(limpio);
  if (!m) return null;
  return m[1].replace(/\s+(Tiene documento|Estado:|Ubicaci[oó]n:|Firmada).*$/i, '').trim() || null;
}

// nombreUsuario: el nombre completo del usuario en LexHub (p. ej. "matias baronetto").
// Es "propio" si todas las palabras de ese nombre están en el nombre del SAC,
// sin importar el orden ni los acentos ("BARONETTO, OSCAR MATIAS").
export function esPresentanteUsuario(presentante, nombreUsuario) {
  const buscado = tokens(nombreUsuario);
  if (buscado.length === 0) return false;
  const presentes = new Set(tokens(presentante));
  return buscado.every((t) => presentes.has(t));
}

// Opciones que el usuario puede elegir a mano para "quién presentó".
export const OPCIONES_PRESENTANTE = [
  { valor: '', etiqueta: 'Automático' },
  { valor: 'yo', etiqueta: 'Yo' },
  { valor: 'juzgado', etiqueta: 'Juzgado' },
  { valor: 'contraparte', etiqueta: 'Contraparte' },
  { valor: 'asesoria', etiqueta: 'Asesoría' },
  { valor: 'perito', etiqueta: 'Perito' },
  { valor: 'oficio', etiqueta: 'Respuesta a oficio' },
];

export function clasificarActuacion(act, nombreUsuario) {
  const tipo = act.Tipo || '';
  const origen = act.Origen || '';

  // Corrección manual hecha en LexHub: manda sobre la detección automática.
  const manual = (act.Categoria_Manual || '').trim();
  if (manual && CATEGORIAS[manual] && manual !== 'otro') {
    const etiquetas = { yo: 'Yo', juzgado: 'Juzgado', asesoria: 'Asesoría' };
    if (manual === 'contraparte') {
      const nombre = extraerPresentante(act.Contenido);
      return { categoria: manual, etiqueta: nombre && !esPresentanteUsuario(nombre, nombreUsuario) ? nombre : 'Contraparte', manual: true };
    }
    if (manual === 'yo') {
      return { categoria: 'yo', etiqueta: extraerPresentante(act.Contenido) || nombreUsuario || 'Yo', manual: true };
    }
    if (manual === 'perito' || manual === 'oficio') {
      return { categoria: manual, etiqueta: extraerPresentante(act.Contenido) || (manual === 'perito' ? 'Perito' : 'Respuesta a oficio'), manual: true };
    }
    return { categoria: manual, etiqueta: etiquetas[manual], manual: true };
  }

  // Pericias y respuestas a oficios (frecuentes) no son de la asesoría.
  if (/perit|pericia/i.test(tipo)) {
    return { categoria: 'perito', etiqueta: extraerPresentante(act.Contenido) || 'Perito' };
  }
  if (/oficio/i.test(tipo)) {
    return { categoria: 'oficio', etiqueta: extraerPresentante(act.Contenido) || 'Respuesta a oficio' };
  }
  if (/asesor|dictamen/i.test(tipo)) {
    return { categoria: 'asesoria', etiqueta: 'Asesoría' };
  }

  // Cargadas a mano en LexHub
  if (origen && origen !== 'SAC') {
    if (origen === 'Yo') return { categoria: 'yo', etiqueta: nombreUsuario || 'Yo' };
    if (origen === 'Tribunal') return { categoria: 'juzgado', etiqueta: 'Juzgado' };
    if (origen === 'Otra Parte') return { categoria: 'contraparte', etiqueta: 'Contraparte' };
    return { categoria: 'otro', etiqueta: origen };
  }

  // Importadas del SAC: los escritos traen "Presentado por: ..."; el resto
  // (decretos, autos, sentencias, notificaciones) lo emite el juzgado.
  const presentante = extraerPresentante(act.Contenido);
  if (presentante) {
    if (esPresentanteUsuario(presentante, nombreUsuario)) {
      return { categoria: 'yo', etiqueta: presentante, presentante };
    }
    return { categoria: 'contraparte', etiqueta: presentante, presentante };
  }
  return { categoria: 'juzgado', etiqueta: 'Juzgado' };
}
