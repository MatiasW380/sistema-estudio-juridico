// pages/api/sac/sincronizar-expediente.js
// Fuerza la sincronización de UN expediente (identificado por su número de
// SAC) sin depender de la sincronización general. Trae los movimientos
// nuevos más recientes primero, hasta agotar el tiempo disponible.

import {
  loginSAC,
  obtenerExpedientesConNovedades,
  obtenerOperaciones,
  obtenerTextoDeOperacion,
  obtenerMasDatosOperacion,
  limpiarHtmlOperacion,
  resolverCredencialesSAC,
} from '../../../lib/sac';
import { readSheet, appendToSheet, actualizarCeldas } from '../../../lib/googleSheets';
import { marcarContenido, lineaPresentante, letraColumna, extraerIdOperacion, formatearNotificacion, fechaSACaTiempo } from '../../../lib/sacSync';

export const config = { maxDuration: 60 };

const TAMANO_TANDA = 15;
const PRESUPUESTO_MS = 38000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const inicio = Date.now();
  const numeroSAC = String(req.body?.numeroSAC || '').trim();
  if (!numeroSAC) {
    return res.status(400).json({ success: false, mensaje: 'Falta el número de expediente' });
  }

  const { usuario, contraseña, error: errorCred } = await resolverCredencialesSAC(req.body);
  if (errorCred) {
    return res.status(200).json({ success: false, mensaje: errorCred });
  }

  try {
    const [filasClientes, filasActuaciones] = await Promise.all([
      readSheet('Clientes_y_Expedientes'),
      readSheet('Actuaciones'),
    ]);
    if (filasClientes.length < 2 || filasActuaciones.length < 1) {
      return res.status(200).json({ success: false, mensaje: 'No se pudo leer Google Sheets (error temporal). Probá de nuevo en un momento.' });
    }

    const existeEnLexHub = filasClientes.slice(1).some((f) => String(f[5] || '').trim() === numeroSAC);
    if (!existeEnLexHub) {
      return res.status(200).json({ success: false, mensaje: `El expediente ${numeroSAC} no está cargado en LexHub.` });
    }

    const login = await loginSAC(usuario, contraseña);
    if (!login.exito) {
      return res.status(200).json({ success: false, mensaje: 'No se pudo iniciar sesión en el SAC.', diagnostico: login.diagnostico });
    }

    // El SAC identifica cada expediente con un id interno; la única forma
    // confirmada de obtenerlo es la lista de expedientes con novedades.
    const { expedientes } = await obtenerExpedientesConNovedades(login.cookieJar, 500);
    const exp = expedientes.find((e) => String(e.numeroExpediente).trim() === numeroSAC);
    if (!exp) {
      return res.status(200).json({
        success: false,
        noEncontrado: true,
        mensaje: `El SAC no incluye el expediente ${numeroSAC} en "Mis novedades" (${expedientes.length} expedientes), y por ahora esa es la única lista que LexHub sabe consultar.`,
      });
    }

    const { operaciones } = await obtenerOperaciones(login.cookieJar, exp.idExpediente);

    const headers = filasActuaciones[0];
    const idxNumeroSAC = headers.indexOf('Numero_SAC');
    const idxContenido = headers.indexOf('Contenido');
    const idxID = headers.indexOf('ID');

    let maxId = 0;
    const idsExistentes = new Set();
    for (let i = 1; i < filasActuaciones.length; i++) {
      const fila = filasActuaciones[i];
      const idNum = parseInt(fila[idxID], 10);
      if (!Number.isNaN(idNum) && idNum > maxId) maxId = idNum;
      if (String(fila[idxNumeroSAC] || '').trim() === numeroSAC) {
        const idOp = extraerIdOperacion(fila[idxContenido]);
        if (idOp) idsExistentes.add(idOp);
      }
    }

    const nuevas = operaciones
      .filter((op) => !idsExistentes.has(op.idOperacion))
      .sort((a, b) => fechaSACaTiempo(b.fecha) - fechaSACaTiempo(a.fecha));

    const filasNuevas = [];
    let revisadas = 0;
    let sinTexto = 0;
    let siguienteId = maxId + 1;

    for (let i = 0; i < nuevas.length; i += TAMANO_TANDA) {
      if (Date.now() - inicio > PRESUPUESTO_MS) break;
      const tanda = nuevas.slice(i, i + TAMANO_TANDA);
      const [textos, masDatos] = await Promise.all([
        Promise.all(tanda.map((op) => obtenerTextoDeOperacion(login.cookieJar, op).catch(() => ({ contenido: '' })))),
        Promise.all(tanda.map((op) => obtenerMasDatosOperacion(login.cookieJar, exp.idExpediente, op.idOperacion, op.esEscrito).catch(() => ({ datos: null })))),
      ]);
      tanda.forEach((op, k) => {
        revisadas++;
        const texto = limpiarHtmlOperacion(textos[k].contenido);
        if (!texto) {
          sinTexto++;
          return;
        }
        filasNuevas.push([
          String(siguienteId++), numeroSAC, op.fecha || '', op.tipoOperacion || 'Movimiento SAC', 'SAC',
          marcarContenido(op.idOperacion, lineaPresentante(op) + texto + formatearNotificacion(masDatos[k])),
          'NO', 'NO', 'NO', '', 'NO', 'Sync SAC', '',
        ]);
      });
    }

    // Completar "Presentado por" en escritos de este expediente ya cargados sin esa línea.
    const opPorId = new Map(operaciones.map((op) => [op.idOperacion, op]));
    const actualizaciones = [];
    for (let i = 1; i < filasActuaciones.length; i++) {
      const fila = filasActuaciones[i];
      if (String(fila[idxNumeroSAC] || '').trim() !== numeroSAC) continue;
      const contenidoActual = fila[idxContenido] || '';
      const idOp = extraerIdOperacion(contenidoActual);
      const op = idOp ? opPorId.get(idOp) : null;
      const linea = op ? lineaPresentante(op) : '';
      if (!linea) continue;
      const resto = contenidoActual.replace(/^\[SAC:[^\]]+\]\s*/, '');
      if (/^\s*presentado por:/i.test(resto)) continue;
      actualizaciones.push({ rango: `Actuaciones!${letraColumna(idxContenido)}${i + 1}`, valor: marcarContenido(idOp, linea + resto) });
    }
    const completados = (await actualizarCeldas(actualizaciones)) ? actualizaciones.length : 0;

    if (filasNuevas.length > 0) {
      const ok = await appendToSheet('Actuaciones', filasNuevas);
      if (!ok) {
        return res.status(200).json({ success: false, mensaje: 'Se leyeron los movimientos pero no se pudieron guardar en Google Sheets. Probá de nuevo.' });
      }
    }

    const pendientes = nuevas.length - revisadas;
    const partes = [`${filasNuevas.length} movimiento(s) nuevo(s) agregado(s).`];
    if (completados > 0) partes.push(`Se completó quién presentó en ${completados} escrito(s).`);
    if (sinTexto > 0) partes.push(`${sinTexto} sin texto (administrativos) omitidos.`);
    if (pendientes > 0) partes.push(`Quedan ${pendientes} por revisar: volvé a tocar el botón para continuar.`);
    if (filasNuevas.length === 0 && pendientes === 0 && completados === 0) {
      partes.push(`El SAC tiene ${operaciones.length} movimientos y todos los que tienen texto ya estaban en LexHub.`);
    }

    return res.status(200).json({ success: true, agregados: filasNuevas.length, pendientes, mensaje: partes.join(' ') });
  } catch (error) {
    return res.status(500).json({ success: false, mensaje: `Error: ${error.message}` });
  }
}
