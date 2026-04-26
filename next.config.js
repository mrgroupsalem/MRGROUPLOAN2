/** @type {import('next').NextConfig} */
const nextConfig = {
  // Using src directory with App Router
  
  images: {
    domains: ['localhost'],
  },
  // Optimize for production
  swcMinify: true,
  // Enable compression
  compress: true,
  // Ensure xlsx is properly bundled
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
