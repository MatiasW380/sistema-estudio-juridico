// Ruta exacta en GitHub: app/test/route.js
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('¡Hola desde Vercel! El enrutador funciona de primera.', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
