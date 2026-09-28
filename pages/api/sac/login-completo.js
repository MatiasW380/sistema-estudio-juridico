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
    console.log('=== PASO 1: Obtener formulario ===');
    
    const pageRes = await fetch('https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html1 = await pageRes.text();
    const $ = cheerio.load(html1);

    const viewState = $('input[name="__VIEWSTATE"]').val() || '';
    const eventValidation = $('input[name="__EVENTVALIDATION"]').val() || '';

    console.log('✅ ViewState extraído');

    console.log('=== PASO 2: Hacer login ===');

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

    const html2 = await loginRes.text();
    console.log('✅ Login POST completado');

    // Buscar el segundo menú (SAC para abogados)
    console.log('=== PASO 3: Buscar segundo menú ===');
    
    const $2 = cheerio.load(html2);
    
    // Buscar cualquier select o links que mencionen SAC
    const selects = $2('select').map((i, el) => ({
      name: $2(el).attr('name'),
      id: $2(el).attr('id'),
      options: $2(el).find('option').map((j, opt) => ({
        value: $2(opt).attr('value'),
        text: $2(opt).text()
      })).get()
    })).get();

    const links = $2('a').map((i, el) => ({
      href: $2(el).attr('href'),
      text: $2(el).text().substring(0, 100)
    })).get().filter(l => l.text.toLowerCase().includes('sac') || l.text.toLowerCase().includes('abogado'));

    const buttons = $2('button, input[type="button"], input[type="submit"]').map((i, el) => ({
      name: $2(el).attr('name'),
      value: $2(el).attr('value'),
      text: $2(el).text().substring(0, 100)
    })).get().filter(b => b.text.toLowerCase().includes('sac') || b.text.toLowerCase().includes('abogado'));

    console.log('✅ Búsqueda completada');

    return res.status(200).json({
      success: true,
      message: 'Login completado - Analizando segundo menú',
      debug: {
        htmlLoginLength: html1.length,
        htmlDespuesLoginLength: html2.length,
        selectsEncontrados: selects,
        linksConSAC: links,
        botonesConSAC: buttons,
        htmlSnippet: html2.substring(0, 4000)
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
