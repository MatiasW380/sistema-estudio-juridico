/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  // Configuración para que las librerías de Google solo se ejecuten en el servidor
  serverExternalPackages: ['googleapis', 'google-auth-library', 'gaxios', 'agent-base'],
  webpack: (config, { isServer }) => {
    // Si es el servidor, permitimos los módulos nativos de Node.js
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        child_process: false,
        tls: false,
        dns: false,
        dgram: false,
        http2: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
