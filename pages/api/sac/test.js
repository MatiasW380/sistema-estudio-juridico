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
    console.log('🔐 Conectando al SAC...');
    
    // Paso 1: Obtener la página de login
    const loginPageRes = await fetch('https://sac.juscordoba.gob.ar/', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!loginPageRes.ok) {
      return res.status(500).json({
        success: false,
        error: `No se pudo acceder al SAC (HTTP ${loginPageRes.status})`,
        debug: {
          status: loginPageRes.status,
          statusText: loginPageRes.statusText,
          url: loginPageRes.url
        }
      });
    }

    const htmlLogin = await loginPageRes.text();
    console.log('📄 HTML login capturado, length:', htmlLogin.length);

    const $ = cheerio.load(htmlLogin);
    
    // Verificar si tiene formulario de login
    const formAction = $('form').attr('action');
    const formMethod = $('form').attr('method');
    
    return res.status(200).json({
      success: true,
      message: 'Conexión exitosa al SAC',
      debug: {
        htmlLength: htmlLogin.length,
        formAction: formAction || 'No encontrado',
        formMethod: formMethod || 'No encontrado',
        htmlSnippet: htmlLogin.substring(0, 3000),
        textoVisible: $('body').text().substring(0, 2000)
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
