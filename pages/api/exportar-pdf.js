// pages/api/exportar-pdf.js
// Genera un PDF con la carátula, datos del cliente y el historial completo de
// actuaciones de un expediente. Pensado para enviarle un resumen al cliente o
// armar el legajo físico.

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getClientes, getActuaciones } from '../../lib/googleSheets';

export const config = { maxDuration: 30 };

// --- Helpers de maquetado -------------------------------------------------

const PAGE_WIDTH = 595.28; // A4 en puntos
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function limpiarMarcadorSAC(contenido) {
  return (contenido || '').replace(/^\[SAC:[^\]]+\]\s*/, '');
}

// Separa un texto en líneas que entran en el ancho disponible, respetando
// saltos de línea ya existentes.
function envolverTexto(texto, font, size, maxWidth) {
  const lineasFinales = [];
  const parrafos = String(texto || '').split(/\r?\n/);

  for (const parrafo of parrafos) {
    if (parrafo.trim() === '') {
      lineasFinales.push('');
      continue;
    }
    const palabras = parrafo.split(/\s+/).filter(Boolean);
    let lineaActual = '';

    for (const palabra of palabras) {
      const candidata = lineaActual ? `${lineaActual} ${palabra}` : palabra;
      const ancho = font.widthOfTextAtSize(candidata, size);
      if (ancho > maxWidth && lineaActual) {
        lineasFinales.push(lineaActual);
        lineaActual = palabra;
      } else {
        lineaActual = candidata;
      }
    }
    if (lineaActual) lineasFinales.push(lineaActual);
  }

  return lineasFinales;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { numeroSAC, email } = req.query;

    if (!numeroSAC || !email) {
      return res.status(400).json({ error: 'numeroSAC y email son obligatorios' });
    }

    // 1. Ubicar el cliente/expediente (igual que getServerSideProps de la ficha)
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

    // 2. Actuaciones en orden cronológico (más antigua primero)
    const actuaciones = (await getActuaciones(numeroSAC)).slice().reverse();

    // 3. Armar el PDF
    const pdfDoc = await PDFDocument.create();
    const fuente = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fuenteNegrita = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const colorTexto = rgb(0.1, 0.12, 0.16);
    const colorGris = rgb(0.4, 0.45, 0.5);
    const colorAzul = rgb(0.12, 0.25, 0.68);

    function nuevaPagina() {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    function asegurarEspacio(alturaNecesaria) {
      if (y - alturaNecesaria < MARGIN) {
        nuevaPagina();
      }
    }

    function escribirLinea(texto, { size = 10, font = fuente, color = colorTexto, gap = 4 } = {}) {
      asegurarEspacio(size + gap);
      page.drawText(texto, { x: MARGIN, y, size, font, color });
      y -= size + gap;
    }

    function escribirParrafo(texto, { size = 10, font = fuente, color = colorTexto, lineGap = 4, paragraphGap = 8 } = {}) {
      const lineas = envolverTexto(texto, font, size, CONTENT_WIDTH);
      for (const linea of lineas) {
        asegurarEspacio(size + lineGap);
        if (linea) {
          page.drawText(linea, { x: MARGIN, y, size, font, color });
        }
        y -= size + lineGap;
      }
      y -= paragraphGap - lineGap;
    }

    function lineaSeparadora() {
      asegurarEspacio(12);
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_WIDTH - MARGIN, y },
        thickness: 0.5,
        color: rgb(0.85, 0.87, 0.9),
      });
      y -= 14;
    }

    // --- Encabezado ---
    escribirLinea(`Expediente ${numeroSAC}`, { size: 18, font: fuenteNegrita, color: colorAzul, gap: 10 });
    escribirParrafo(expediente.Caratula || 'Carátula no registrada', { size: 12, font: fuenteNegrita, paragraphGap: 10 });

    escribirLinea(`Cliente: ${cliente.Nombre_Cliente || '-'}`, { size: 10, color: colorGris });
    if (expediente.Juzgado) {
      escribirLinea(`Juzgado/Dependencia: ${expediente.Juzgado}`, { size: 10, color: colorGris });
    }
    if (expediente.Fuero) {
      escribirLinea(`Fuero: ${expediente.Fuero}`, { size: 10, color: colorGris });
    }
    const fechaGeneracion = new Date().toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    escribirLinea(`Documento generado el ${fechaGeneracion}`, { size: 9, color: colorGris, gap: 14 });

    lineaSeparadora();

    escribirLinea(`Historial de Actuaciones (${actuaciones.length})`, { size: 13, font: fuenteNegrita, color: colorTexto, gap: 12 });

    if (actuaciones.length === 0) {
      escribirParrafo('No hay actuaciones registradas para este expediente.', { size: 10, color: colorGris });
    }

    // --- Cada actuación ---
    for (const act of actuaciones) {
      asegurarEspacio(40);

      const encabezadoActuacion = `${act.Fecha || 'Sin fecha'}  —  ${act.Tipo || 'Sin tipo'}`;
      escribirLinea(encabezadoActuacion, { size: 10.5, font: fuenteNegrita, color: colorAzul, gap: 4 });

      if (act.Origen) {
        escribirLinea(`Origen: ${act.Origen}`, { size: 8.5, color: colorGris, gap: 6 });
      }

      const contenido = limpiarMarcadorSAC(act.Contenido) || '(sin contenido)';
      escribirParrafo(contenido, { size: 9.5, lineGap: 3, paragraphGap: 14 });

      lineaSeparadora();
    }

    const pdfBytes = await pdfDoc.save();

    const nombreArchivo = `expediente_${numeroSAC}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('❌ Error en /api/exportar-pdf:', error);
    return res.status(500).json({ error: error.message || 'Error interno' });
  }
}
