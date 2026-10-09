// pages/api/exportar-pdf.js
// Genera un PDF del expediente: carátula + una actuación por hoja.
// Parámetros (GET): numeroSAC, email, soloImportantes=1 (opcional).

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getClientes, getActuaciones, getPerfilUsuario } from '../../lib/googleSheets';
import { clasificarActuacion } from '../../lib/actuaciones';

export const config = { maxDuration: 30 };

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_SPACE = 40;

const AZUL = rgb(0.35, 0.35, 0.35); // gris medio (antes azul)
const AZUL_OSCURO = rgb(0.12, 0.12, 0.12);
const TEXTO = rgb(0.1, 0.12, 0.16);
const GRIS = rgb(0.4, 0.45, 0.5);
const GRIS_CLARO = rgb(0.85, 0.85, 0.85);
const FONDO_TENUE = rgb(0.94, 0.94, 0.94);
const BLANCO = rgb(1, 1, 1);

function limpiarMarcadorSAC(contenido) {
  return (contenido || '').replace(/^\[SAC:[^\]]+\]\s*/, '');
}

// Helvetica estándar solo soporta un juego limitado de caracteres; cualquier
// otro (emojis, símbolos raros) haría fallar el PDF, así que se reemplaza.
function crearSanitizador(font) {
  const soportados = new Set(font.getCharacterSet());
  return (texto) => {
    let out = '';
    for (const ch of String(texto || '').replace(/\t/g, '    ').replace(/\r/g, '')) {
      if (ch === '\n') out += ch;
      else if (soportados.has(ch.codePointAt(0))) out += ch;
      else if (ch === ' ') out += ' ';
      else out += '?';
    }
    return out;
  };
}

function envolverTexto(texto, font, size, maxWidth) {
  const lineas = [];
  for (const parrafo of String(texto || '').split('\n')) {
    if (parrafo.trim() === '') {
      lineas.push('');
      continue;
    }
    let actual = '';
    for (const palabra of parrafo.split(/ +/).filter(Boolean)) {
      let candidata = actual ? `${actual} ${palabra}` : palabra;
      if (font.widthOfTextAtSize(candidata, size) <= maxWidth) {
        actual = candidata;
        continue;
      }
      if (actual) lineas.push(actual);
      // palabra más larga que la línea: se corta
      let resto = palabra;
      while (font.widthOfTextAtSize(resto, size) > maxWidth) {
        let corte = resto.length - 1;
        while (corte > 1 && font.widthOfTextAtSize(resto.slice(0, corte), size) > maxWidth) corte -= 1;
        lineas.push(resto.slice(0, corte));
        resto = resto.slice(corte);
      }
      actual = resto;
    }
    if (actual) lineas.push(actual);
  }
  return lineas;
}

function centrado(page, texto, y, font, size, color) {
  const ancho = font.widthOfTextAtSize(texto, size);
  page.drawText(texto, { x: (PAGE_WIDTH - ancho) / 2, y, size, font, color });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { numeroSAC, email } = req.query;
    const soloImportantes = req.query.soloImportantes === '1';

    if (!numeroSAC || !email) {
      return res.status(400).json({ error: 'numeroSAC y email son obligatorios' });
    }

    const clientes = await getClientes(email);
    let expediente = null;
    let cliente = null;
    for (const c of clientes) {
      const exp = c.expedientes?.find((e) => e.Numero_SAC === numeroSAC);
      if (exp) {
        expediente = exp;
        cliente = c;
        break;
      }
    }
    if (!expediente || !cliente) {
      return res.status(404).json({ error: 'Expediente no encontrado' });
    }

    let nombreUsuario = '';
    try {
      nombreUsuario = (await getPerfilUsuario(email))?.nombre || '';
    } catch {
      // sin nombre: no se distinguen las propias
    }

    // Cronológico (la más antigua primero)
    let actuaciones = (await getActuaciones(numeroSAC)).slice().reverse();
    if (soloImportantes) {
      actuaciones = actuaciones.filter((a) => a.Importante === 'SI');
      if (actuaciones.length === 0) {
        return res.status(404).json({ error: 'No hay actuaciones marcadas como importantes en este expediente' });
      }
    }

    const pdfDoc = await PDFDocument.create();
    const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const negrita = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const limpiar = crearSanitizador(fuente);

    // ---------------- CARÁTULA ----------------
    const portada = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    portada.drawRectangle({ x: 0, y: PAGE_HEIGHT - 110, width: PAGE_WIDTH, height: 110, color: FONDO_TENUE });
    centrado(portada, 'LEXHUB', PAGE_HEIGHT - 36, negrita, 10, GRIS);
    centrado(portada, 'EXPEDIENTE', PAGE_HEIGHT - 66, negrita, 22, TEXTO);
    centrado(portada, limpiar(`N° ${numeroSAC}`), PAGE_HEIGHT - 92, fuente, 14, TEXTO);

    let y = PAGE_HEIGHT - 190;
    const lineasCaratula = envolverTexto(limpiar(expediente.Caratula || 'Carátula no registrada'), negrita, 20, CONTENT_WIDTH - 20);
    for (const l of lineasCaratula) {
      centrado(portada, l, y, negrita, 20, AZUL_OSCURO);
      y -= 28;
    }
    y -= 20;
    portada.drawLine({ start: { x: PAGE_WIDTH / 2 - 60, y }, end: { x: PAGE_WIDTH / 2 + 60, y }, thickness: 1.5, color: AZUL });
    y -= 40;

    const datos = [
      ['Cliente', cliente.Nombre_Cliente],
      ['Juzgado / Dependencia', expediente.Juzgado],
      ['Fuero', expediente.Fuero],
    ].filter(([, v]) => v);
    for (const [etiqueta, valor] of datos) {
      centrado(portada, etiqueta.toUpperCase(), y, negrita, 9, GRIS);
      y -= 16;
      for (const l of envolverTexto(limpiar(valor), fuente, 13, CONTENT_WIDTH - 40)) {
        centrado(portada, l, y, fuente, 13, TEXTO);
        y -= 18;
      }
      y -= 14;
    }

    const fechaGen = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Cordoba' });
    centrado(portada, soloImportantes ? 'RESUMEN DE ACTUACIONES IMPORTANTES' : 'HISTORIAL COMPLETO DE ACTUACIONES', 150, negrita, 11, AZUL);
    centrado(portada, `${actuaciones.length} ${actuaciones.length === 1 ? 'actuación' : 'actuaciones'}  ·  Generado el ${fechaGen}`, 130, fuente, 10, GRIS);

    // ---------------- UNA ACTUACIÓN POR HOJA ----------------
    const total = actuaciones.length;
    actuaciones.forEach((act, i) => {
      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let continuacion = false;

      const dibujarEncabezado = () => {
        page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 44, width: PAGE_WIDTH, height: 44, color: FONDO_TENUE });
        page.drawText(`ACTUACIÓN ${i + 1} DE ${total}${continuacion ? '  (continuación)' : ''}`, {
          x: MARGIN, y: PAGE_HEIGHT - 17, size: 7.5, font: negrita, color: GRIS,
        });
        page.drawText(limpiar(act.Tipo || 'Sin tipo'), { x: MARGIN, y: PAGE_HEIGHT - 35, size: 13, font: negrita, color: TEXTO });
        const fecha = limpiar(act.Fecha || 'Sin fecha');
        const anchoFecha = fuente.widthOfTextAtSize(fecha, 10);
        page.drawText(fecha, { x: PAGE_WIDTH - MARGIN - anchoFecha, y: PAGE_HEIGHT - 35, size: 10, font: fuente, color: TEXTO });
        let yy = PAGE_HEIGHT - 44 - 22;
        if (!continuacion) {
          const { etiqueta } = clasificarActuacion(act, nombreUsuario);
          page.drawText(limpiar(`Presentado por: ${etiqueta}`), { x: MARGIN, y: yy, size: 9, font: fuente, color: GRIS });
          yy -= 22;
        }
        return yy;
      };

      let yy = dibujarEncabezado();
      const contenido = limpiar(limpiarMarcadorSAC(act.Contenido).trim()) || '(sin contenido)';
      const size = 10.5;
      const interlineado = 15;

      for (const linea of envolverTexto(contenido, fuente, size, CONTENT_WIDTH)) {
        if (yy < MARGIN + FOOTER_SPACE) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          continuacion = true;
          yy = dibujarEncabezado();
        }
        if (linea) page.drawText(linea, { x: MARGIN, y: yy, size, font: fuente, color: TEXTO });
        yy -= interlineado;
      }
    });

    // ---------------- PIE DE PÁGINA ----------------
    const paginas = pdfDoc.getPages();
    paginas.forEach((p, idx) => {
      if (idx === 0) return; // la carátula va sin pie
      p.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_WIDTH - MARGIN, y: 42 }, thickness: 0.5, color: GRIS_CLARO });
      p.drawText(limpiar(`Expediente ${numeroSAC}`), { x: MARGIN, y: 28, size: 8, font: fuente, color: GRIS });
      const num = `Página ${idx + 1} de ${paginas.length}`;
      p.drawText(num, { x: PAGE_WIDTH - MARGIN - fuente.widthOfTextAtSize(num, 8), y: 28, size: 8, font: fuente, color: GRIS });
    });

    const bytes = await pdfDoc.save();
    const sufijo = soloImportantes ? '_importantes' : '';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="expediente_${numeroSAC}${sufijo}.pdf"`);
    res.send(Buffer.from(bytes));
  } catch (error) {
    console.error('❌ Error en /api/exportar-pdf:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
