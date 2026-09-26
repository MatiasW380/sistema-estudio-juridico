// pages/api/sac/obtener-movimientos.js
// Obtener movimientos y operaciones de un expediente del SAC

import puppeteer from 'puppeteer';
import chromium from 'chrome-aws-lambda';

const SAC_LOGIN_URL = 'https://www.justiciacordoba.gob.ar/portalee/Pages/Index.aspx';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { usuario, contraseña, numeroSAC } = req.body;

  if (!usuario || !contraseña || !numeroSAC) {
    return res.status(400).json({ 
      success: false,
      error: 'Usuario, contraseña y número SAC son obligatorios' 
    });
  }

  let browser;
  try {
    console.log(`🔐 Obteniendo movimientos del expediente ${numeroSAC}...`);
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
    
    // Ir a login
    await page.goto(SAC_LOGIN_URL, { waitUntil: 'networkidle0', timeout: 30000 });

    // Login
    console.log('✍️  Autenticando...');
    const usuarioSelector = 'input[name="usuario"], input[id*="usuario"]';
    const passwordSelector = 'input[name="contrasena"], input[name="password"], input[type="password"]';
    
    await page.type(usuarioSelector, usuario, { delay: 50 });
    await page.type(passwordSelector, contraseña, { delay: 50 });
    
    await Promise.all([
      page.click('button[type="submit"], input[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 })
    ]).catch(() => null);

    await page.waitForTimeout(2000);

    // Buscar el expediente
    console.log(`🔍 Buscando expediente ${numeroSAC}...`);
    
    // Estrategia 1: Buscar en la página actual un campo de búsqueda
    const searchSelector = 'input[placeholder*="número"], input[placeholder*="SAC"], input[placeholder*="expediente" i]';
    const searchInput = await page.$(searchSelector).catch(() => null);
    
    if (searchInput) {
      console.log('📝 Usando búsqueda en página...');
      await page.type(searchSelector, numeroSAC);
      await Promise.all([
        page.click('button:contains("Buscar"), input[value="Buscar"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 })
      ]).catch(() => null);
      
      await page.waitForTimeout(1000);
    } else {
      // Estrategia 2: Navegar directo a la URL del expediente
      console.log('🔗 Navegando directo al expediente...');
      const expedienteURL = `https://www.justiciacordoba.gob.ar/portalee/Pages/ExpedienteDetalle.aspx?expediente=${numeroSAC}`;
      await page.goto(expedienteURL, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => null);
    }

    await page.waitForTimeout(2000);

    // Extraer movimientos/operaciones
    console.log('📋 Extrayendo movimientos...');
    
    const datosExpediente = await page.evaluate(() => {
      const movimientos = [];
      
      // Extraer datos generales del expediente
      const numero = document.querySelector('[id*="numero"], [data-numero]')?.textContent?.trim() || '';
      const caratula = document.querySelector('[id*="caratula"], [data-caratula]')?.textContent?.trim() || '';
      
      // Estrategia 1: Extraer de tabla de movimientos
      const filas = document.querySelectorAll('table tbody tr, .movimiento-row, [class*="operacion"]');
      
      filas.forEach((fila, idx) => {
        // Intentar extraer de celdas
        const celdas = fila.querySelectorAll('td');
        if (celdas.length > 0) {
          movimientos.push({
            id: idx,
            foja: celdas[0]?.textContent?.trim() || '',
            fecha: celdas[1]?.textContent?.trim() || '',
            tipo: celdas[2]?.textContent?.trim() || '',
            descripcion: celdas[3]?.textContent?.trim() || celdas[2]?.textContent?.trim() || '',
            texto: celdas[4]?.textContent?.trim() || ''
          });
        } else {
          // Intentar extraer de div/span
          const texto = fila.textContent?.trim() || '';
          if (texto.length > 10) {
            movimientos.push({
              id: idx,
              texto: texto.substring(0, 200)
            });
          }
        }
      });

      // Estrategia 2: Buscar en un div con clase "libro" o "expediente-detalle"
      if (movimientos.length === 0) {
        const libroDiv = document.querySelector('[class*="libro"], [class*="expediente-detalle"], [id*="libro"]');
        if (libroDiv) {
          const lineas = libroDiv.textContent?.split('\n').filter(l => l.trim().length > 10) || [];
          lineas.forEach((linea, idx) => {
            movimientos.push({
              id: idx,
              texto: linea.trim().substring(0, 300)
            });
          });
        }
      }

      return {
        numero: numero || numeroSAC,
        caratula: caratula,
        movimientos: movimientos,
        totalMovimientos: movimientos.length
      };
    });

    console.log('✅ Datos extraídos:', datosExpediente.totalMovimientos, 'movimientos');

    return res.status(200).json({
      success: true,
      expediente: datosExpediente,
      message: `Se encontraron ${datosExpediente.totalMovimientos} movimientos`
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
