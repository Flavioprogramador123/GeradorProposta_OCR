/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Comentado para permitir dynamic routing em dev
  trailingSlash: true,
  images: {
    unoptimized: true
  }
  // rewrites removido pois não é necessário com dynamic routing
}

module.exports = nextConfig