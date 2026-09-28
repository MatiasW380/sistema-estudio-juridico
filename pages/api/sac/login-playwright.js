import { chromium } from '@playwright/test';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  let browser;
  try {
    console.log('🚀 Iniciando Playwright...');
    
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    console.log('📱 Navegando al SAC...');
    await page.goto('https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('✅ Página cargada');

    // Ingresar usuario
    await page.fill('input[name*="UserName"], input[id*="user"], input[placeholder*="Usuario"]', usuario);
    
    // Ingresar contraseña
    await page.fill('input[name*="Password"], input[id*="pass"], input[type="password"]', contraseña);

    // Buscar y hacer click en submit
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {
        console.log('⚠️ No navegó después del submit');
      });
    }

    const htmlDespues = await page.content();
    const urlActual = page.url();

    return res.status(200).json({
      success: true,
      message: 'Playwright conexión exitosa',
      debug: {
        urlAntes: 'https://www.justiciacordoba.gob.ar/JusticiaCordoba/extranet.aspx',
        urlDespues: urlActual,
        htmlLength: htmlDespues.length,
        htmlSnippet: htmlDespues.substring(0, 3000)
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
