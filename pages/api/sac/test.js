export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    console.log('🔐 Conectando al SAC real...');
    
    const url = 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx';
    console.log('URL:', url);
    
    // Paso 1: Obtener la página de login
    const loginPageRes = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!loginPageRes.ok) {
      return res.status(loginPageRes.status).json({
        success: false,
        error: `HTTP ${loginPageRes.status} - ${loginPageRes.statusText}`
      });
    }

    const html = await loginPageRes.text();
    console.log('✅ HTML obtenido, length:', html.length);

    // Extraer ViewState (típico de ASP.NET)
    const viewStateMatch = html.match(/name="__VIEWSTATE" value="([^"]+)"/);
    const viewState = viewStateMatch ? viewStateMatch[1] : '';
    
    const eventValidationMatch = html.match(/name="__EVENTVALIDATION" value="([^"]+)"/);
    const eventValidation = eventValidationMatch ? eventValidationMatch[1] : '';

    return res.status(200).json({
      success: true,
      message: 'Conexión exitosa al SAC',
      debug: {
        url: url,
        htmlLength: html.length,
        hasViewState: !!viewState,
        hasEventValidation: !!eventValidation,
        htmlSnippet: html.substring(0, 4000),
        textoVisible: extraerTextoVisible(html)
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function extraerTextoVisible(html) {
  // Remover scripts y styles
  let texto = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return texto.substring(0, 2000);
}
