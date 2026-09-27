export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    console.log('🔐 Intentando conectar al SAC...');
    
    const url = 'https://sac.juscordoba.gob.ar/';
    console.log('URL:', url);
    
    const loginRes = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    }).catch(err => {
      throw new Error(`Fetch error: ${err.message} | URL: ${url}`);
    });

    console.log('Response status:', loginRes.status);
    console.log('Response headers:', Object.fromEntries(loginRes.headers));

    if (!loginRes.ok) {
      const text = await loginRes.text();
      return res.status(loginRes.status).json({
        success: false,
        error: `SAC respondió con HTTP ${loginRes.status}`,
        debug: {
          status: loginRes.status,
          statusText: loginRes.statusText,
          url: loginRes.url,
          htmlSnippet: text.substring(0, 1000)
        }
      });
    }

    const html = await loginRes.text();
    console.log('HTML obtenido, length:', html.length);

    return res.status(200).json({
      success: true,
      message: 'Conexión exitosa al SAC',
      debug: {
        htmlLength: html.length,
        htmlSnippet: html.substring(0, 3000),
        url: loginRes.url
      }
    });

  } catch (error) {
    console.error('❌ Error detallado:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      debug: {
        message: error.message,
        stack: error.stack?.substring(0, 500)
      }
    });
  }
}
