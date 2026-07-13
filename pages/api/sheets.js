import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/auth/callback/google`
    );

    // Nota para Matías: Acá el sistema usará las credenciales del estudio.
    // Como prueba inicial para ver si conecta, intentamos leer la pestaña 'Clientes'
    const sheets = google.sheets({ version: 'v4', auth });
    
    // IMPORTANTE: Reemplazá este ID por el de tu planilla BD_SISTEMA_GESTION
    const spreadsheetId = '17YFhMlCPE8AkXJG4Pw6PyzvJuwGgXWKpNc8RTIc7Drc'; 

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Clientes!A1:E10', 
    });

    res.status(200).json({ success: true, data: response.data.values });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
