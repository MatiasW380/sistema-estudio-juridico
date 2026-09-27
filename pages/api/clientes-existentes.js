import { google } from 'googleapis';

const sheets = google.sheets('v4');
const SHEETS_ID = process.env.NEXT_PUBLIC_SHEETS_ID;

async function getAuthToken() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const auth = await getAuthToken();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Clientes_y_Expedientes!A:B',
      auth,
    });

    const rows = response.data.values || [];
    const clientes = [];

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && rows[i][1]) {
        clientes.push({ id: rows[i][0], nombre: rows[i][1] });
      }
    }

    return res.status(200).json({ success: true, clientes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
