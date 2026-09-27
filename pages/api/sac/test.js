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
    console.log('🔐 Iniciando navegador...');
    
    const executablePath = await chromium.executablePath();
    
    browser = await puppeteer.launch({
      executablePath,
      headless: chromium.headless,
      args: chromium.args,
    });

    console.log('📱 Abriendo SAC...');
    const page = await browser.newPage();
    
    // Ir al SAC
    await page.goto('https://sac.juscordoba.gob.ar/', { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });
    
    console.log('📝 Capturando HTML inicial...');
    const htmlInicial = await page.content();
    const inicialLength = htmlInicial.length;

    // Intentar login
    console.log('🔑 Intentando login...');
    
    // Buscar el formulario de login
    const loginForm = await page.$('form');
    if (!loginForm) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró formulario de login en SAC',
        debug: {
          htmlLength: inicialLength,
          htmlSnippet: htmlInicial.substring(0, 2000)
        }
      });
    }

    // Intentar ingresar credenciales
    const usuarioInput = await page.$('input[type="text"]') || await page.$('input[name*="usuario"]') || await page.$('input[name*="user"]');
    const passwordInput = await page.$('input[type="password"]');

    if (!usuarioInput || !passwordInput) {
      return res.status(400).json({
        success: false,
        error: 'No se encontraron campos de usuario/contraseña',
        debug: {
          htmlSnippet: htmlInicial.substring(0, 3000)
        }
      });
    }

    await usuarioInput.type(usuario);
    await passwordInput.type(contraseña);

    // Buscar botón submit
    const submitButton = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
    if (submitButton) {
      await submitButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {
        console.log('⚠️ No hubo navegación después del click');
      });
    }

    console.log('📸 Capturando HTML después de login...');
    const htmlDespues = await page.content();
    
    // Extraer texto visible para ver estructura
    const textoVisible = await page.evaluate(() => {
      return document.body.innerText;
    });

    return res.status(200).json({
      success: true,
      message: 'Conexión exitosa al SAC',
      debug: {
        urlActual: page.url(),
        htmlLengthAntes: inicialLength,
        htmlLengthDespues: htmlDespues.length,
        htmlSnippetDespues: htmlDespues.substring(0, 5000),
        textoVisiblePrimeras500lineas: textoVisible.split('\n').slice(0, 100).join('\n'),
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
