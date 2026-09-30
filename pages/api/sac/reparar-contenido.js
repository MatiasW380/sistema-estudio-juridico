// pages/api/sac/reparar-contenido.js
// Actualiza los movimientos importados del SAC que quedaron guardados con
// el formato viejo (antes de que empezáramos a traer el texto real de
// ObtenerTextoOperacion), reemplazando su Contenido por el texto real.
// No agrega filas nuevas ni toca nada que no sea Origen = "SAC".

import { loginSAC, obtenerTextoOperacion, limpiarHtmlOperacion } from '../../../lib/sac';
import { readSheet, getAccessToken } from '../../../lib/googleSheets';

export const config = { maxDuration: 60 };

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';
const LIMITE_POR_CORRIDA = 40;

function extraerIdOperacion(contenido) {
  const m = /^\[SAC:([^\]]+)\]/.exec(contenido || '');
  return m ? m[1] : null;
}

function columnaALetra(indice) {
  let letra = '';
  let n = indice;
  do {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letra;
}

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
        mensaje: 'No se pudo iniciar sesión en el SAC.',
        diagnostico: login.diagnostico,
      });
    }

    const filas = await readSheet('Actuaciones');
    const headers = filas[0] || [];
    const idxOrigen = headers.indexOf('Origen');
    const idxContenido = headers.indexOf('Contenido');

    // Candidatas a reparar: Origen "SAC" cuyo contenido NO es el que ya
    // generamos con el texto real (evitamos reprocesar lo que ya está bien
    // detectando el patrón viejo " — " pegado al final, típico del formato
    // anterior, o contenido muy corto).
    const candidatas = [];
    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i];
      if (fila[idxOrigen] !== 'SAC') continue;
      const idOp = extraerIdOperacion(fila[idxContenido]);
      if (!idOp) continue;
      const sinMarcador = (fila[idxContenido] || '').replace(/^\[SAC:[^\]]+\]\s*/, '');
      const pareceViejo = /—\s*$/.test(sinMarcador) || sinMarcador.length < 15;
      if (pareceViejo) {
        candidatas.push({ filaIndice: i, idOperacion: idOp });
      }
    }

    const aProcesar = candidatas.slice(0, LIMITE_POR_CORRIDA);

    const textos = await Promise.all(
      aProcesar.map((c) => obtenerTextoOperacion(login.cookieJar, c.idOperacion).catch(() => ({ contenido: '' }))),
    );

    const token = await getAccessToken();
    const columnaContenido = columnaALetra(idxContenido);
    let actualizados = 0;

    for (let i = 0; i < aProcesar.length; i++) {
      const textoLimpio = limpiarHtmlOperacion(textos[i].contenido);
      if (!textoLimpio) continue; // si el SAC no devolvió nada, no pisamos lo que ya había

      const filaSheet = aProcesar[i].filaIndice + 1; // 1-based, fila 1 = encabezados
      const nuevoContenido = `[SAC:${aProcesar[i].idOperacion}] ${textoLimpio}`;
      const range = `Actuaciones!${columnaContenido}${filaSheet}`;

      const resp = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/${range}?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [[nuevoContenido]] }),
        },
      );
      if (resp.ok) actualizados++;
    }

    return res.status(200).json({
      success: true,
      mensaje: `Se encontraron ${candidatas.length} movimiento(s) con formato viejo. Se repararon ${actualizados} en esta corrida (límite ${LIMITE_POR_CORRIDA} por vez). ${
        candidatas.length > LIMITE_POR_CORRIDA
          ? 'Corré de nuevo para seguir con el resto.'
          : ''
      }`,
      totalCandidatas: candidatas.length,
      actualizados,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
