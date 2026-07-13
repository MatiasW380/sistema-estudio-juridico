// Ruta exacta en GitHub: nextConfig.js (en la raíz pura del proyecto)
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fuerza a Next.js a no generar páginas estáticas defectuosas durante el build
  output: 'standalone',
  // Evita problemas de enrutamiento estricto con barras diagonales
  trailingSlash: false,
};

module.exports = nextConfig;
