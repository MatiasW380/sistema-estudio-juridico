import { NextResponse } from 'next/server';

export async function GET() {
  // Vamos a ver qué variables existen realmente en el servidor
  const debug = {
    emailExists: !!process.env.GOOGLE_CLIENT_EMAIL,
    projectExists: !!process.env.GOOGLE_PROJECT_ID,
    keyExists: !!process.env.GOOGLE_PRIVATE_KEY,
    keyLength: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.length : 0
  };

  return NextResponse.json({ 
    status: "Diagnóstico",
    detalles: debug 
  });
}
