// next.config.js
const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  reactStrictMode: false, // 關閉 React Strict Mode
  // 讓 Next 以同一條管線轉譯（避免重複產物）
  transpilePackages: ['ckeditor5', '@ckeditor/ckeditor5-react'],

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

  webpack: config => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // ⚠ 只保留 @ckeditor 的去重；不要對 'ckeditor5' 做 alias
      '@ckeditor': path.resolve(process.cwd(), 'node_modules/@ckeditor'),
    }

    // CKEditor 5 SVG 處理
    const svgRule = config.module.rules.find(rule => {
      return rule.test && rule.test.toString().includes('svg')
    })

    if (svgRule) {
      svgRule.exclude =
        /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/
    }

    config.module.rules.push({
      test: /ckeditor5-[^/\\]+[/\\]theme[/\\]icons[/\\][^/\\]+\.svg$/,
      use: ['raw-loader'],
    })


    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    })
    return config
  },

  output: 'standalone',
}

module.exports = nextConfig
