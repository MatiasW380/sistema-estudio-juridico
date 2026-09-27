/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Ignorar warnings de puppeteer
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'pino': 'pino',
        'lru-cache': 'lru-cache'
      });
    }
    return config;
  }
};

module.exports = nextConfig;
