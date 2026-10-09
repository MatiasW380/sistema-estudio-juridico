// lib/sacSync.js
// Funciones compartidas por la sincronización general y la de un expediente.

export function marcarContenido(idOperacion, texto) {
  return `[SAC:${idOperacion}] ${texto}`;
}

// Los escritos (presentados por una parte) guardan "Presentado por: NOMBRE"
// al comienzo del texto; sirve para saber de quién es cada uno. Los decretos,
// autos y demás emitidos por el juzgado no llevan esa línea.
export function lineaPresentante(op) {
  if (!op?.esEscrito) return '';
  const nombre = String(op.presentadoPor || '').replace(/^\s*presentado por:\s*/i, '').trim();
  return nombre ? `Presentado por: ${nombre}\n` : '';
}

export function letraColumna(indice) {
  let n = indice + 1;
  let letras = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

export function extraerIdOperacion(contenido) {
  const m = /^\[SAC:([^\]]+)\]/.exec(contenido || '');
  return m ? m[1] : null;
}

export function formatearNotificacion(masDatos) {
  const cedulas = masDatos?.datos?.detalleOperacion?.listadoCedulas || [];
  if (cedulas.length === 0) return '';
  const lineas = cedulas.map((c) => {
    const otros = c.otrosDestinatarios ? ` · también: ${c.otrosDestinatarios}` : '';
    return `${c.nombre || ''} (${c.rol || ''}) — ${c.fecha || ''}${otros}`;
  });
  return `\n\nNotificado a:\n${lineas.join('\n')}`;
}


// "23/09/2026" -> milisegundos (0 si no se puede leer)
export function fechaSACaTiempo(fecha) {
  const partes = String(fecha || '').split('/');
  if (partes.length !== 3) return 0;
  const [d, m, a] = partes.map((x) => parseInt(x, 10));
  if (!d || !m || !a) return 0;
  return new Date(a, m - 1, d).getTime();
}
