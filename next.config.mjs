/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ⚡ CONFIGURACIÓN PARA DOCKER
  output: 'standalone',
  
  // ⚡ DESHABILITAR PRERENDERING PARA EVITAR ERRORES CON EVENT HANDLERS
  experimental: {
    optimizeCss: true,
  },
  
  // ⚡ OPTIMIZACIONES CRÍTICAS DE RENDIMIENTO
  images: {
    unoptimized: false,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ⚡ CONFIGURACIONES DE PERFORMANCE
  poweredByHeader: false,
  compress: true,
  
  // ⚡ OPTIMIZACIÓN DE COMPILACIÓN
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ⚡ EXTERNAL PACKAGES (CORREGIDO)
  serverExternalPackages: ['@prisma/client'],

  // ⚡ CONFIGURACIÓN DE HEADERS PARA CACHE
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59'
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
    ]
  },

  // ⚡ OPTIMIZACIÓN EXPERIMENTAL (CORREGIDA)
  experimental: {
    optimizeCss: true,
    esmExternals: true,
  },
  


  // ⚡ CONFIGURACIÓN DE WEBPACK PARA PERFORMANCE
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }

    return config
  },
}

export default nextConfig
