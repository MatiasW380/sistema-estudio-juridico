import { inicializarColumnasUsuarios } from '../../lib/googleSheets';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const resultado = await inicializarColumnasUsuarios();
    
    if (resultado) {
      return res.status(200).json({ 
        success: true,
        message: 'Columnas inicializadas correctamente'
      });
    } else {
      return res.status(500).json({ 
        success: false,
        message: 'Error al inicializar columnas'
      });
    }
  } catch (error) {
    console.error('Error en inicializar:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}
