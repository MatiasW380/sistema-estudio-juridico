// pages/api/obtener-expedientes.js
// API para obtener expedientes (solo los que el usuario puede ver)

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

function parseUserFromCookie(rawCookie = '') {
  const userCookie = rawCookie
    .split(';')
    .find((c) => c.trim().startsWith('user='));

  if (!userCookie) return null;

  try {
    const value = decodeURIComponent(userCookie.split('=').slice(1).join('='));
    const data = JSON.parse(value);
    return data?.email ? data : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    console.log('📥 Obteniendo expedientes del usuario...');

    // Obtener usuario autenticado
    const userData = parseUserFromCookie(req.headers.cookie || '');
    if (!userData?.email) {
      console.log('⚠️ Usuario no autenticado');
      return res.status(200).json({ expedientes: [] });
    }

    const userEmail = userData.email;
    console.log(`📧 Usuario: ${userEmail}`);

    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Clientes_y_Expedientes!A:L`;
    const accessToken = await getAccessToken();

    const response = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return res.status(200).json({ expedientes: [] });
    }

    // Headers: ID_Cliente, Nombre_Cliente, Telefono, DNI, Domicilio, Numero_SAC, Caratula, Fuero, Juzgado, ID_Carpeta_Drive, Usuarios_Compartidos, Creado_Por
    const headers = rows[0];
    const idxIdCliente = headers.indexOf('ID_Cliente');
    const idxNombreCliente = headers.indexOf('Nombre_Cliente');
    const idxNumeroSAC = headers.indexOf('Numero_SAC');
    const idxCaratula = headers.indexOf('Caratula');
    const idxFuero = headers.indexOf('Fuero');
    const idxJuzgado = headers.indexOf('Juzgado');
    const idxDomicilio = headers.indexOf('Domicilio');
    const idxUsuariosCompartidos = headers.indexOf('Usuarios_Compartidos');
    const idxCreadoPor = headers.indexOf('Creado_Por');

    // Extraer expedientes con control de privacidad
    const expedientes = rows
      .slice(1)
      .filter(row => row[idxNumeroSAC] && row[idxNumeroSAC].trim()) // Solo filas con SAC
      .filter(row => {
        // Filtrar por privacidad: solo si el usuario es el creador o está en usuarios_compartidos
        const creadoPor = row[idxCreadoPor] || '';
        const compartidos = row[idxUsuariosCompartidos] || '';
        
        const esCreador = creadoPor.toLowerCase().trim() === userEmail.toLowerCase().trim();
        const esCompartido = compartidos.toLowerCase().includes(userEmail.toLowerCase());
        
        return esCreador || esCompartido;
      })
      .map(row => {
        // Extraer ciudad del domicilio (última parte después de la última coma)
        const domicilio = row[idxDomicilio] || '';
        const ciudad = domicilio.split(',').pop()?.trim() || '';

        return {
          idCliente: row[idxIdCliente] || '',
          cliente: row[idxNombreCliente] || '',
          sac: row[idxNumeroSAC] || '',
          caratula: row[idxCaratula] || '',
          fuero: row[idxFuero] || '',
          juzgado: row[idxJuzgado] || '',
          ciudad: ciudad || '',
        };
      });

    console.log(`✅ Se encontraron ${expedientes.length} expedientes visibles para ${userEmail}`);

    return res.status(200).json({ expedientes });
  } catch (error) {
    console.error('❌ Error al obtener expedientes:', error);
    return res.status(500).json({ error: error.message });
  }
}
