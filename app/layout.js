import { Cairo, IBM_Plex_Mono } from 'next/font/google';

// ═══════════════════════════════════════════════
// 🎨 Fonts (Optimized with subsets + display swap)
// ═══════════════════════════════════════════════

const cairo = Cairo({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-cairo',
  weight: ['400', '700', '900'],
  preload: true,
  fallback: ['system-ui', 'arial', 'sans-serif'],
  adjustFontFallback: true,
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['500', '700'],
  preload: false,
  fallback: ['Consolas', 'Monaco', 'monospace'],
});
// ═══════════════════════════════════════════════
// 📋 Metadata (SEO + Social + PWA)
// ═══════════════════════════════════════════════

export const metadata = {
  // Basic
  title: {
    default: 'تداول+ | تحليل ذكي للأسهم السعودية',
    template: '%s | تداول+',
  },
  description: 'تطبيق احترافي لتحليل الأسهم السعودية (تاسي) باستخدام الذكاء الاصطناعي والطبقات التسع. مع Backtest، إدارة محفظة، تنبيهات ذكية، ونظام توصيات متقدم.',
  keywords: [
    'تاسي',
    'أسهم سعودية',
    'تحليل أسهم',
    'سوق الأسهم السعودي',
    'تداول',
    'استثمار',
    'محفظة استثمارية',
    'ذكاء اصطناعي',
    'تحليل فني',
    'Wyckoff',
    'الراجحي',
    'أرامكو',
    'STC',
    'Tadawul',
    'Saudi Stock Market',
    'TASI',
  ],
  authors: [{ name: 'Tadawul Plus Team' }],
  creator: 'Tadawul Plus',
  publisher: 'Tadawul Plus',
  
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Open Graph (Facebook, WhatsApp, LinkedIn)
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: 'https://tadawul-plus.vercel.app',
    siteName: 'تداول+',
    title: 'تداول+ | تحليل ذكي للأسهم السعودية',
    description: 'تطبيق احترافي لتحليل الأسهم السعودية بالذكاء الاصطناعي والطبقات التسع.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'تداول+ - تحليل الأسهم السعودية',
      },
    ],
  },
  
  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: 'تداول+ | تحليل ذكي للأسهم السعودية',
    description: 'تطبيق احترافي لتحليل الأسهم السعودية بالذكاء الاصطناعي.',
    images: ['/og-image.png'],
  },
  
  // PWA
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'تداول+',
  },
  
  // Verification (لاحقاً عند Google Search Console)
  // verification: {
  //   google: 'your-google-verification-code',
  // },
  
  // Format detection
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  
  // Categories (for app stores)
  category: 'finance',
  
  // Alternate languages (future)
  // alternates: {
  //   languages: {
  //     'ar-SA': '/ar',
  //     'en-US': '/en',
  //   },
  // },
};

// ═══════════════════════════════════════════════
// 📱 Viewport (separate export in Next.js 14+)
// ═══════════════════════════════════════════════

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#06080f' },
    { media: '(prefers-color-scheme: light)', color: '#06080f' },
  ],
  colorScheme: 'dark',
};

// ═══════════════════════════════════════════════
// 🏗️ Root Layout
// ═══════════════════════════════════════════════

export default function RootLayout({ children }) {
  return (
    <html 
      lang="ar" 
      dir="rtl" 
      className={`${cairo.variable} ${ibmPlexMono.variable}`}
    >
      <head>
  {/* ═════════════════════════════════════════
      🚀 Performance: Preconnect (highest priority)
      ═════════════════════════════════════════ */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  
  {/* ═════════════════════════════════════════
      🌐 Performance: DNS Prefetch
      ═════════════════════════════════════════ */}
  <link rel="dns-prefetch" href="https://eodhd.com" />
  <link rel="dns-prefetch" href="https://supabase.co" />
  
  {/* ═════════════════════════════════════════
      📦 Performance: Resource Hints
      ═════════════════════════════════════════ */}
  <meta httpEquiv="x-dns-prefetch-control" content="on" />
  
  {/* ═════════════════════════════════════════
      🎨 Critical CSS Hint
      ═════════════════════════════════════════ */}
  <meta name="color-scheme" content="dark" />
  
  <head>
  {/* ═════════════════════════════════════════
      🚀 Performance: Preconnect (highest priority)
      ═════════════════════════════════════════ */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  
  {/* ═════════════════════════════════════════
      🌐 Performance: DNS Prefetch
      ═════════════════════════════════════════ */}
  <link rel="dns-prefetch" href="https://eodhd.com" />
  <link rel="dns-prefetch" href="https://supabase.co" />
  
  {/* ═════════════════════════════════════════
      📦 Performance: Resource Hints
      ═════════════════════════════════════════ */}
  <meta httpEquiv="x-dns-prefetch-control" content="on" />
  
  {/* ═════════════════════════════════════════
      🎨 Critical CSS Hint
      ═════════════════════════════════════════ */}
  <meta name="color-scheme" content="dark" />
</head>

      <body 
  style={{
    fontFamily: 'var(--font-cairo), Cairo, sans-serif',
    background: '#06080f',
    color: '#f0f6ff',
    margin: 0,
    padding: 0,
    minHeight: '100vh',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'optimizeLegibility',
  }}
>
  {children}
  
  {/* ═════════════════════════════════════════
      🌐 Schema.org Structured Data (deferred)
      ═════════════════════════════════════════ */}
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'تداول+',
        alternateName: 'Tadawul Plus',
        description: 'تطبيق احترافي لتحليل الأسهم السعودية بالذكاء الاصطناعي',
        url: 'https://tadawul-plus.vercel.app',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        inLanguage: 'ar-SA',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'SAR',
        },
        author: {
          '@type': 'Organization',
          name: 'Tadawul Plus',
        },
      }),
    }}
  />
</body>

