/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(
        '@sparticuz/chromium',
        'puppeteer-core',
        'pino',
        'lru-cache'
      );
    }
    return config;
  }
};

module.exports = nextConfig;
