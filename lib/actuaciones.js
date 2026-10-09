// lib/actuaciones.js
// Clasifica cada actuación según quién la originó, para mostrarla con el
// título correcto y un código de color: propia, juzgado, contraparte o
// asesoría. Sirve tanto para las que vienen del SAC como para las cargadas a mano.

export const CATEGORIAS = {
  yo: { nombre: 'Presentados por mí', fondo: '#e0f2fe', hover: '#bae6fd', borde: '#7dd3fc', texto: '#0369a1' },
  juzgado: { nombre: 'Emitidos por el juzgado', fondo: '#f1f5f9', hover: '#e2e8f0', borde: '#cbd5e1', texto: '#475569' },
  contraparte: { nombre: 'Contraparte', fondo: '#fef3c7', hover: '#fde68a', borde: '#fcd34d', texto: '#92400e' },
  asesoria: { nombre: 'Asesoría', fondo: '#ede9fe', hover: '#ddd6fe', borde: '#c4b5fd', texto: '#5b21b6' },
  otro: { nombre: 'Otros', fondo: '#f7fafc', hover: '#edf2f7', borde: '#cbd5e1', texto: '#4a5568' },
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
    return { categoria: manual, etiqueta: etiquetas[manual], manual: true };
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
