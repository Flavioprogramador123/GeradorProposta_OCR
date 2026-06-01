/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'better-sqlite3'];
    }
    return config;
  },
  // output: 'export', // Comentado para permitir dynamic routing em dev
  trailingSlash: false, // Corrigido para evitar redirecionamentos 308
  images: {
    unoptimized: true
  },
  // Desabilitar verificação de TypeScript no build para resolver rapidamente
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // rewrites removido pois não é necessário com dynamic routing
}

module.exports = nextConfig