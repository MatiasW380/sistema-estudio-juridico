// pages/api/debug-sheets-id.js
// Verificar qué SHEETS_ID se está usando y si tiene acceso

import { getAccessToken } from '../../lib/googleSheets';

const SHEETS_ID = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc';

export default async function handler(req, res) {
  try {
    console.log('🔍 Verificando SHEETS_ID y acceso...');
    console.log('📋 SHEETS_ID configurado:', SHEETS_ID);

    const accessToken = await getAccessToken();
    console.log('🔑 Access Token obtenido:', accessToken ? 'SÍ' : 'NO');
    
    if (!accessToken) {
      return res.status(500).json({ 
        error: 'No se pudo obtener access token',
        SHEETS_ID
      });
    }

    // Intentar leer la hoja conocida "Clientes_y_Expedientes"
    console.log('\n📥 Intentando leer hoja: Clientes_y_Expedientes');
    const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Clientes_y_Expedientes!A1:A5`;
    
    const testResponse = await fetch(testUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const testData = await testResponse.json();
    
    console.log(`✅ Response status: ${testResponse.status}`);
    console.log(`📋 Response data:`, JSON.stringify(testData).substring(0, 200));

    // Ahora intentar leer Comentarios_Expediente
    console.log('\n📥 Intentando leer hoja: Comentarios_Expediente');
    const comentUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/Comentarios_Expediente!A1:E10`;
    
    const comentResponse = await fetch(comentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const comentData = await comentResponse.json();
    
    console.log(`✅ Response status: ${comentResponse.status}`);
    console.log(`📋 Response data:`, JSON.stringify(comentData).substring(0, 200));

    return res.status(200).json({
      SHEETS_ID,
      accessTokenObtained: !!accessToken,
      clientesTest: {
        status: testResponse.status,
        success: testResponse.ok,
        rowCount: testData.values ? testData.values.length : 0,
        data: testData
      },
      comentariosTest: {
        status: comentResponse.status,
        success: comentResponse.ok,
        rowCount: comentData.values ? comentData.values.length : 0,
        data: comentData
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: error.message,
      SHEETS_ID
    });
  }
}
