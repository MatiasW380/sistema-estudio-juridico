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
    console.log('📝 Paso 1: Obtener formulario de login...');
    
    // Paso 1: Obtener la página
    const pageRes = await fetch('https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = await pageRes.text();
    const $ = cheerio.load(html);

    // Extraer ViewState y EventValidation
    const viewState = $('input[name="__VIEWSTATE"]').val() || '';
    const eventValidation = $('input[name="__EVENTVALIDATION"]').val() || '';
    
    console.log('📋 ViewState extraído:', viewState.substring(0, 50));

    if (!viewState) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo extraer ViewState. El SAC puede haber cambiado su estructura.',
        debug: {
          htmlLength: html.length,
          htmlSnippet: html.substring(0, 2000)
        }
      });
    }

    // Paso 2: Intentar login con POST
    console.log('🔐 Paso 2: Intentando login...');

    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewState);
    if (eventValidation) {
      formData.append('__EVENTVALIDATION', eventValidation);
    }
    formData.append('txtUserName', usuario);
    formData.append('txtPassword', contraseña);
    formData.append('btnLogin', 'Ingresar');

    const loginRes = await fetch('https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx'
      },
      body: formData.toString()
    });

    const htmlDespues = await loginRes.text();
    const urlDespues = loginRes.url;

    console.log('📊 Response status:', loginRes.status);
    console.log('📊 URL después:', urlDespues);
    console.log('📊 HTML después length:', htmlDespues.length);

    // Verificar si el login fue exitoso
    const estaLogueado = !htmlDespues.includes('btnLogin') || htmlDespues.includes('Servicios') || htmlDespues.includes('Expedientes');

    return res.status(200).json({
      success: true,
      message: 'Login POST completado',
      estaLogueado: estaLogueado,
      debug: {
        statusCode: loginRes.status,
        urlAntes: 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx',
        urlDespues: urlDespues,
        htmlLengthAntes: html.length,
        htmlLengthDespues: htmlDespues.length,
        tieneViewState: !!viewState,
        tieneEventValidation: !!eventValidation,
        htmlSnippetDespues: htmlDespues.substring(0, 3000)
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
