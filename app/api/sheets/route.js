import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const client_email = "tu-email-de-servicio@sistema-gestion-estudio-502310.iam.gserviceaccount.com";
    
    // Pegamos la clave utilizando el formato de plantilla de cadena (` `)
    // Esto preserva los saltos de línea nativamente.
    const private_key = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDB6siuqNA8uTTi
3EZ0RkAfIJBYcEhbORAFgOREvvE+GidfRF8vtq1zFDGdrzfZnwRYks1Z7B9zfu5E
mEMO4JwZ8jI+mA7SZhGrsLNKxuOsSAqzmNlg8Xn/N7DLb2QOdxhaU+rVf5UdCQMX
Yg28LZqg2HCtqrlQE07eDtXnY1YvfKWCoXJjam2KGGa/m8yTyUEZaXyckN7K3trn
Fts9zUIctTvj5L9e8+V7rNUiDcEj93kbJg6Cij70ChwEIXk/w0r6CJHfnUoUJxQq
ZCioseUjGEcU1LD83sNTEQUAGpktNDpF0EtTLUAonAr6DY1lz2GFxuQRFq+iOrQk
5jJ/le5DAgMBAAECggEAAvlDvJHwJ447hmMUXYIaR5/rNr/6DBQS79KrLXa0Ilyq
T+avgv7NKB+eJynhtF+g5G7T4VYioVXH95tSI+9D1Y4GQTl5uLZB/R0HktT79s9g
AqMMalUppsVG28fIhARFhlUVG9MKCVjzCC/DwCf+4AqRp8gfcV/qbLNTimnWj4HV
/onmWGqMKpDY3eZwWN0WGEX2UHZF367M/lHa3DScvDWiZBtdeb8BtveDbbMeZdC2
Dku36lk8UdHhjKfsBy69M1PcfCy1vPFzl+fPyR5IsIAJUZ7infqasPugAFVw3RSA
tSLtXr2N3ilKRswmcvUND5wpoY4aNpI7+MdN/Mtu6QKBgQDfMBCN39V7bFptBR5H
Na81SYnwAUcw0zg5ys6BgnUVvoejHyHDm1TEjl5rZaLFjuFBe97MxEdF3noTACcZ
iShsM3U8oLOc1Fw152cvcWvstbAnslIORqnIn20lzMWiH19K/EQIa5fDzAsghYG8
Bq7exXcsh0/IBK4DjvqRSalwfwKBgQDebRWidZlh6YUPswaAMi2rsEXMsIkFWYx5
mOHnmVhxcbKqaR9M/lctq4de+7SS6BmPwXgcSAe0za2+f6erFe6T3oEKWNhgqjhD
jUPduSqCShHRBDWlzZXb/CgUMbDe+h/g3BvMSWsL2FKmrPyZTe7Vn6ZDMzzm7zPo
HNrgnLngPQKBgAmINPzKNYTq8MW9NTjXWx9Mf76nX1H/g2Q8fCtd1gBSvdpCpx+C
j9FBP1kY4yXK32X7k11teJnMUaxkEkdt6zML05L+Tg2BqFqJAogtMO3QKLDZVdXU
QMYXwQKfR0WQT3KVaZZuefHb0hHWgd707h0Hk/pr4QVq5b+zKJJx8fGjAoGAH7Sx
Bs14pcph21ELti5w8C5aZMktXwPa0GKIoTjssI8ihsQhYBpJVwtCarm6jc5kBmfv
tShXYOCIycTso6imr5FiF5V+kpjxGEAE0pBYjOX+ECtnclER8Z/KHsbOjZpd/PGj
TMWSasfVUEkMYNYJG458Zsvg/JJQdd/XG3l7zYkCgYB2ovaon+jBfI5OPBMOkMfI
u+PC77dGByNUdZPC5uSEYzkf0gtT9a/OZN6w6jXrL0ZVmdT6/C7k/znHS8U725HR
F46gbRiQqMY/3Rp1sasENY9Fnv+ck4h9un1RxYKhVXShlAUJL/e+04+aTixqI9y5
5jHKw5q7msvm4FPtCWFcsQ==
-----END PRIVATE KEY-----`;

    const auth = new google.auth.JWT(
      client_email,
      null,
      private_key,
      ['https://www.googleapis.com/auth/sheets.readonly']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: '17YFhMlCPE8AkXJG4Pw6',
      range: 'Clientes_y_Expedientes!A2:G100',
    });

    return NextResponse.json({ data: response.data.values || [] });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Fallo en autenticación", detalle: error.message }, { status: 500 });
  }
}
