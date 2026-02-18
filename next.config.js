/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb', // Richieste /api/chat con immagini base64
    },
    // Limite body per le richieste in ingresso (Route Handlers /api/*)
    proxyClientMaxBodySize: '6mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/7.x/**',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
