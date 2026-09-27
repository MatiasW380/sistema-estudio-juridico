import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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
    console.log('🔐 Iniciando Puppeteer con Chromium...');
    
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      executablePath,
      headless: chromium.headless,
      args: chromium.args,
    });

    console.log('📱 Abriendo SAC...');
    const page = await browser.newPage();
    
    // Ir al login del SAC
    await page.goto('https://sac.juscordoba.gob.ar/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Esperar al input de usuario
    await page.waitForSelector('input[name="usuario"]', { timeout: 10000 });
    
    // Ingresar credenciales
    await page.type('input[name="usuario"]', usuario);
    await page.type('input[name="contraseña"]', contraseña);
    
    // Clickear login
    await page.click('button[type="submit"]');
    
    // Esperar a que cargue la página de expedientes
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    console.log('✅ Login exitoso');
    
    // Extraer expedientes (HTML)
    const expedientes = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('[class*="expediente"], [class*="caso"]').forEach((el) => {
        const numero = el.querySelector('[class*="numero"]')?.innerText || '';
        const caratula = el.querySelector('[class*="caratula"]')?.innerText || '';
        const fuero = el.querySelector('[class*="fuero"]')?.innerText || '';
        
        if (numero) items.push({ numero: numero.trim(), caratula: caratula.trim(), fuero: fuero.trim() });
      });
      return items;
    });

    console.log(`📋 Se extrajeron ${expedientes.length} expedientes`);

    return res.status(200).json({
      success: true,
      expedientes: expedientes,
      message: `Se conectó exitosamente. Se encontraron ${expedientes.length} expedientes`
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
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
