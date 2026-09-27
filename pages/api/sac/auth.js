import cheerio from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    console.log('🔐 Obteniendo página de login...');
    
    const loginRes = await fetch('https://sac.juscordoba.gob.ar/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!loginRes.ok) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo acceder al SAC'
      });
    }

    // Placeholder: Esta es una prueba simple
    // Se necesita investigar cómo funciona el login del SAC real
    
    return res.status(200).json({
      success: true,
      message: 'API de auth necesita ser configurada según estructura real del SAC',
      expedientes: []
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
