// pages/api/actuaciones.js
// API para listar, agregar y actualizar actuaciones de un expediente

import { getActuaciones, agregarActuacion } from '../../lib/googleSheets';

export default async function handler(req, res) {
  console.log('🚀 API /api/actuaciones ejecutándose...');
  
  // GET: Listar actuaciones
  if (req.method === 'GET') {
    try {
      const { numeroSAC } = req.query;
      if (!numeroSAC) {
        return res.status(400).json({ error: 'numeroSAC es obligatorio' });
      }
      const actuaciones = await getActuaciones(numeroSAC);
      return res.status(200).json({ actuaciones });
    } catch (error) {
      console.error('❌ Error al listar actuaciones:', error);
      return res.status(500).json({ error: 'Error al listar actuaciones' });
    }
  }

  // POST: Agregar actuación
  if (req.method === 'POST') {
    try {
      const { 
        numeroSAC, 
        fecha, 
        tipo, 
        tipoOtro,
        origen, 
        contenido, 
        presentado, 
        tienePDF, 
        idPDFDrive, 
        esBorrador, 
        creadoPor, 
        compartidoCon 
      } = req.body;
      
      if (!numeroSAC || !fecha || !contenido) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: numeroSAC, fecha, contenido' });
      }

      // Determinar el tipo final
      let tipoFinal = tipo;
      if (tipo === 'Otro' && tipoOtro && tipoOtro.trim() !== '') {
        tipoFinal = tipoOtro.trim();
      } else if (!tipo) {
        tipoFinal = 'Otro';
      }

      const resultado = await agregarActuacion(
        numeroSAC,
        fecha,
        tipoFinal,
        origen || 'Yo',
        contenido,
        presentado || false,
        tienePDF || false,
        idPDFDrive || '',
        esBorrador || true,
        creadoPor || 'sistema',
        compartidoCon || ''
      );

      if (resultado) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ error: 'Error al guardar en la hoja de cálculo' });
      }
    } catch (error) {
      console.error('❌ Error al agregar actuación:', error);
      return res.status(500).json({ error: error.message || 'Error al agregar actuación' });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
