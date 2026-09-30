// pages/api/sac/sincronizar.js
// Compara los expedientes del SAC con los que ya existen en LexHub
// (por Número de expediente = Numero_SAC, que es único) y agrega en la
// hoja "Actuaciones" solo los movimientos que todavía no estaban.

import { loginSAC, obtenerExpedientesConNovedades, obtenerOperaciones } from '../../../lib/sac';
import { readSheet, getActuaciones, agregarActuacion } from '../../../lib/googleSheets';

// Cada movimiento se guarda con un marcador [SAC:idOperacion] al inicio del
// contenido. Así, en la próxima sincronización, sabemos cuáles ya están
// cargados sin necesidad de una columna nueva en la hoja.
function marcarContenido(idOperacion, texto) {
  return `[SAC:${idOperacion}] ${texto}`;
}

function extraerIdOperacion(contenido) {
  const m = /^\[SAC:([^\]]+)\]/.exec(contenido || '');
  return m ? m[1] : null;
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
        mensaje:
          'No se pudo iniciar sesión en el SAC. Puede que Cloudflare haya pedido el captcha esta vez (no siempre lo pide).',
        diagnostico: login.diagnostico,
      });
    }

    // 1) Expedientes con novedades recientes, según el SAC.
    const { expedientes: expedientesSAC, diagnostico: diagExp } = await obtenerExpedientesConNovedades(
      login.cookieJar,
    );

    // 2) Expedientes que ya tenemos cargados en LexHub (hoja
    //    Clientes_y_Expedientes), para saber cuáles nos interesa actualizar.
    const filas = await readSheet('Clientes_y_Expedientes');
    const locales = new Map(); // numeroSAC -> { nombreCliente, caratula }
    for (let i = 1; i < filas.length; i++) {
      const fila = filas[i];
      const numeroSAC = fila[5]; // columna F
      if (numeroSAC) {
        locales.set(String(numeroSAC).trim(), {
          nombreCliente: fila[1] || '',
          caratula: fila[6] || '',
        });
      }
    }

    // 3) Cruzar: solo expedientes que YA existen en LexHub.
    const coincidencias = expedientesSAC.filter((e) => locales.has(String(e.numeroExpediente).trim()));

    const resultados = [];
    for (const exp of coincidencias) {
      const numeroSAC = String(exp.numeroExpediente).trim();
      const { operaciones } = await obtenerOperaciones(login.cookieJar, exp.idExpediente);

      const existentes = await getActuaciones(numeroSAC);
      const idsExistentes = new Set(existentes.map((a) => extraerIdOperacion(a.Contenido)).filter(Boolean));

      const nuevas = operaciones.filter((op) => !idsExistentes.has(op.idOperacion));

      for (const op of nuevas) {
        const contenido = marcarContenido(
          op.idOperacion,
          `${op.tipoOperacion || 'Movimiento'} — ${op.ubicacion || ''}`.trim(),
        );
        await agregarActuacion(
          numeroSAC,
          op.fecha || '',
          op.tipoOperacion || 'Movimiento SAC',
          'SAC',
          contenido,
          false, // presentado
          false, // enviado
          false, // tienePDF
          '', // idPDFDrive
          false, // esBorrador
          'Sync SAC', // creadoPor
          '', // compartidoCon
        );
      }

      resultados.push({
        numeroSAC,
        caratula: locales.get(numeroSAC).caratula || exp.caratula,
        totalOperacionesSAC: operaciones.length,
        movimientosNuevos: nuevas.length,
      });
    }

    return res.status(200).json({
      success: true,
      mensaje: `Se revisaron ${coincidencias.length} expediente(s) que coinciden con LexHub. Se agregaron ${resultados.reduce((acc, r) => acc + r.movimientosNuevos, 0)} movimiento(s) nuevo(s).`,
      totalExpedientesSAC: expedientesSAC.length,
      totalCoincidencias: coincidencias.length,
      resultados,
      diagnosticoListaSAC: diagExp,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
