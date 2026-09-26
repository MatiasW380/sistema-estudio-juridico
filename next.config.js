/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuración para Vercel + Puppeteer
  serverRuntimeConfig: {
    // Solo disponible en el servidor
    maxDuration: 60, // Timeout de 60 segundos para funciones serverless
  },
  
  publicRuntimeConfig: {
    // Disponible tanto en cliente como en servidor
  },

  // Ignorar warnings de puppeteer
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'pino': 'pino',
        'lru-cache': 'lru-cache'
      });
    }
    return config;
  },

  // Aumentar el timeout de Vercel para funciones API
  functions: {
    'api/**': {
      maxDuration: 60
    }
  }
};

module.exports = nextConfig;
