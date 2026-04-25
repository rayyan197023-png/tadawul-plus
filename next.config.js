/** @type {import('next').NextConfig} */

/**
 * Next.js Configuration - Production-Grade
 * 
 * ✨ Optimizations:
 * - Image optimization (WebP/AVIF)
 * - Code splitting (smart chunks)
 * - Compression (gzip/brotli)
 * - Security headers
 * - Bundle analyzer (optional)
 * - Performance flags
 * - SEO friendly
 */

const nextConfig = {
  // ═══════════════════════════════════════════════
  // 🚀 Performance & Build
  // ═══════════════════════════════════════════════
  
  // Compression (gzip + brotli)
  compress: true,
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Build optimization
  swcMinify: true,
  
  // ═══════════════════════════════════════════════
  // 🖼️ Image Optimization
  // ═══════════════════════════════════════════════
  
  images: {
    // Modern formats (WebP saves 70%, AVIF saves 80%)
    formats: ['image/avif', 'image/webp'],
    
    // Responsive sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Cache TTL (1 day)
    minimumCacheTTL: 86400,
    
    // Allow remote images (if needed)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // ═══════════════════════════════════════════════
  // 📦 Webpack Optimization (Code Splitting)
  // ═══════════════════════════════════════════════
  
  webpack: (config, { dev, isServer }) => {
    // Production-only optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: false,
            vendors: false,
            
            // Framework (React, Next.js core)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
              reuseExistingChunk: true,
            },
            
            // Supabase (heavy library)
            supabase: {
              name: 'supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              priority: 35,
              reuseExistingChunk: true,
            },
            
            // Icons
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            
            // Other vendor libraries
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const match = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                );
                return match ? `npm.${match[1].replace('@', '')}` : 'lib';
              },
              priority: 20,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            
            // Common (shared between pages)
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
            
            // Engines (lazy-load heavy ones)
            engines: {
              name: 'engines',
              test: /[\\/]engines[\\/]/,
              priority: 15,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // ═══════════════════════════════════════════════
  // 🛡️ Security Headers (Production-Grade)
  // ═══════════════════════════════════════════════
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=()',
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // DNS prefetch
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/icons/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // ═══════════════════════════════════════════════
  // 🔄 Redirects (SEO)
  // ═══════════════════════════════════════════════
  
  async redirects() {
    return [
      // Add redirects here if needed
      // Example: { source: '/old-path', destination: '/new-path', permanent: true }
    ];
  },
  
  // ═══════════════════════════════════════════════
  // 🚀 Experimental Features
  // ═══════════════════════════════════════════════
  
  experimental: {
    // Optimize package imports (tree-shaking)
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
    ],
    
    // CSS optimization
    optimizeCss: true,
    
    // Server actions (if using)
    // serverActions: { bodySizeLimit: '2mb' },
  },
  
  // ═══════════════════════════════════════════════
  // 📊 Output (Vercel-optimized)
  // ═══════════════════════════════════════════════
  
  // For Vercel deployment
  output: 'standalone',
  
  // ═══════════════════════════════════════════════
  // 🌍 i18n (Future-ready, currently RTL Arabic)
  // ═══════════════════════════════════════════════
  
  // i18n: {
  //   locales: ['ar-SA', 'en'],
  //   defaultLocale: 'ar-SA',
  // },
  
  // ═══════════════════════════════════════════════
  // ⚡ Generic Optimizations
  // ═══════════════════════════════════════════════
  
  // Trailing slash (consistency)
  trailingSlash: false,
  
  // Generate ETags (caching)
  generateEtags: true,
  
  // Page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;
