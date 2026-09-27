import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña, numeroSAC } = req.body;

  if (!usuario || !contraseña || !numeroSAC) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  let browser;
  try {
    console.log(`📋 Obteniendo movimientos para ${numeroSAC}...`);
    
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      executablePath,
      headless: chromium.headless,
      args: chromium.args,
    });

    const page = await browser.newPage();
    
    // Login
    await page.goto('https://sac.juscordoba.gob.ar/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[name="usuario"]', { timeout: 10000 });
    await page.type('input[name="usuario"]', usuario);
    await page.type('input[name="contraseña"]', contraseña);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    console.log('✅ Login exitoso');
    
    // Buscar expediente por número
    await page.waitForSelector('input[placeholder*="buscar"], input[placeholder*="Número"]', { timeout: 5000 });
    const searchInput = await page.$('input[placeholder*="buscar"], input[placeholder*="Número"]');
    
    if (searchInput) {
      await searchInput.type(numeroSAC);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Extraer movimientos
    const movimientos = await page.evaluate((numExp) => {
      const items = [];
      document.querySelectorAll('[class*="movimiento"], [class*="actuacion"], tr').forEach((el) => {
        const fecha = el.querySelector('[class*="fecha"]')?.innerText || '';
        const descripcion = el.querySelector('[class*="descripcion"], td:nth-child(2)')?.innerText || '';
        const tipo = el.querySelector('[class*="tipo"]')?.innerText || '';
        
        if (fecha && descripcion) {
          items.push({
            fecha: fecha.trim(),
            descripcion: descripcion.trim(),
            tipo: tipo.trim()
          });
        }
      });
      return items.slice(0, 50); // Máximo 50 movimientos
    }, numeroSAC);

    console.log(`✅ Se extrajeron ${movimientos.length} movimientos`);

    return res.status(200).json({
      success: true,
      expediente: {
        numeroSAC,
        movimientos,
        totalMovimientos: movimientos.length
      }
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
