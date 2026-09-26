// pages/api/sac/auth.js
// Conectarse al SAC con usuario/contraseña y obtener lista de expedientes

import puppeteer from 'puppeteer';
import chromium from 'chrome-aws-lambda';

const SAC_LOGIN_URL = 'https://www.justiciacordoba.gob.ar/portalee/Pages/Index.aspx';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ 
      success: false,
      error: 'Usuario y contraseña son obligatorios' 
    });
  }

  let browser;
  try {
    console.log('🔐 Iniciando conexión con SAC...');
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // En Vercel/Lambda, usar chrome-aws-lambda
      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless
      });
    } else {
      // En desarrollo local
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    
    // Ir a la página de login del SAC
    console.log('📍 Accediendo a SAC...');
    await page.goto(SAC_LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // Llenar el formulario de login
    console.log('✍️  Ingresando credenciales...');
    
    // Buscar los campos de entrada
    const usuarioSelector = 'input[name="usuario"], input[id*="usuario"], input[placeholder*="usuario" i]';
    const passwordSelector = 'input[name="contrasena"], input[name="password"], input[type="password"]';
    
    await page.type(usuarioSelector, usuario, { delay: 50 });
    await page.type(passwordSelector, contraseña, { delay: 50 });
    
    // Click en el botón de envío
    console.log('⏳ Enviando login...');
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"], button:contains("Ingresar")'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 })
    ]).catch(() => null);

    // Esperar un poco para que cargue el contenido
    await page.waitForTimeout(2000);

    // Verificar si el login fue exitoso
    const url = page.url();
    console.log('📄 URL actual:', url);

    if (url.includes('Index.aspx') || url.includes('login')) {
      console.log('❌ Login fallido');
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas o SAC no disponible' 
      });
    }

    // Extraer expedientes de la página
    console.log('📋 Extrayendo expedientes...');
    
    const expedientes = await page.evaluate(() => {
      const items = [];
      
      // Estrategia 1: Buscar en tabla HTML
      const filas = document.querySelectorAll('table tbody tr, table tr');
      if (filas.length > 0) {
        filas.forEach(fila => {
          const celdas = fila.querySelectorAll('td');
          if (celdas.length >= 2) {
            const numero = celdas[0]?.textContent?.trim();
            const caratula = celdas[1]?.textContent?.trim();
            
            if (numero && caratula && numero !== 'Número') {
              items.push({
                numero: numero,
                caratula: caratula,
                fuero: celdas[2]?.textContent?.trim() || '',
                estado: celdas[3]?.textContent?.trim() || 'Activo',
                link: celdas[0]?.querySelector('a')?.href || ''
              });
            }
          }
        });
      }

      // Estrategia 2: Buscar en divs o contenedores con clase expediente
      if (items.length === 0) {
        const expedienteElements = document.querySelectorAll('[class*="expediente"], [data-expediente]');
        expedienteElements.forEach(el => {
          const numero = el.querySelector('[class*="numero"]')?.textContent?.trim() || 
                        el.textContent?.match(/\d{7,8}/)?.[0] || '';
          const caratula = el.querySelector('[class*="caratula"]')?.textContent?.trim() || 
                          el.textContent?.substring(0, 100) || '';
          
          if (numero) {
            items.push({
              numero: numero,
              caratula: caratula,
              fuero: '',
              estado: 'Activo',
              link: el.querySelector('a')?.href || ''
            });
          }
        });
      }

      return items;
    });

    console.log('✅ Expedientes encontrados:', expedientes.length);

    if (expedientes.length === 0) {
      console.log('⚠️  No se encontraron expedientes, mostrando HTML para debugging');
      const html = await page.content();
      console.log(html.substring(0, 500));
    }

    return res.status(200).json({
      success: true,
      expedientes: expedientes,
      count: expedientes.length,
      message: `Se encontraron ${expedientes.length} expedientes`
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
