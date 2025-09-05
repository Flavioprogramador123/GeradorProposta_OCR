/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  async rewrites() {
    return [
      {
        source: '/proposta/:slug',
        destination: '/proposta/[slug]'
      }
    ]
  }
}

module.exports = nextConfig