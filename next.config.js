/** @type {import('next').NextConfig} */

/**
 * Next.js 16 Configuration - Turbopack Compatible
 * 
 * ✨ Optimizations (without webpack config):
 * - Image optimization (WebP/AVIF)
 * - Compression
 * - Security headers
 * - Performance flags
 * - Tree shaking
 */

const nextConfig = {
  // ═══════════════════════════════════════════════
  // 🚀 Performance & Build
  // ═══════════════════════════════════════════════
  
  compress: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // ═══════════════════════════════════════════════
  // 🖼️ Image Optimization
  // ═══════════════════════════════════════════════
  
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // ═══════════════════════════════════════════════
  // 🛡️ Security Headers
  // ═══════════════════════════════════════════════
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
{ key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co  https://app.sahmk.sa https://*.sahmk.sa; frame-src 'self'; object-src 'none';" },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  
  // ═══════════════════════════════════════════════
  // 🚀 Experimental Features (Turbopack-compatible)
  // ═══════════════════════════════════════════════
  
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
    ],
  },
  
  // ═══════════════════════════════════════════════
  // ⚡ Generic Optimizations
  // ═══════════════════════════════════════════════
  
  trailingSlash: false,
  generateEtags: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // ═══════════════════════════════════════════════
  // 📦 Turbopack Config (Next.js 16)
  // ═══════════════════════════════════════════════
  
  turbopack: {
    // Empty config - uses smart defaults
  },
};

export default nextConfig;
