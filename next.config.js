/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000']
    }
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/conference-files/**',
      },
    ],
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  // 生產環境輸出配置
  output: 'standalone',
}

module.exports = nextConfig