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
  title: {
    default: 'تداول+ | تحليل ذكي للأسهم السعودية',
    template: '%s | تداول+',
  },
  description: 'تطبيق احترافي لتحليل الأسهم السعودية (تاسي) باستخدام الذكاء الاصطناعي والطبقات الإحدى عشرة. مع Backtest، إدارة محفظة، تنبيهات ذكية، ونظام توصيات متقدم.',
  keywords: [
    'تاسي', 'أسهم سعودية', 'تحليل أسهم', 'سوق الأسهم السعودي',
    'تداول', 'استثمار', 'محفظة استثمارية', 'ذكاء اصطناعي',
    'تحليل فني', 'Wyckoff', 'الراجحي', 'أرامكو', 'STC',
    'Tadawul', 'Saudi Stock Market', 'TASI',
  ],
  authors: [{ name: 'Tadawul Plus Team' }],
  creator: 'Tadawul Plus',
  publisher: 'Tadawul Plus',
  
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
  
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: 'https://tadawul-plus.vercel.app',
    siteName: 'تداول+',
    title: 'تداول+ | تحليل ذكي للأسهم السعودية',
description: 'تطبيق احترافي لتحليل الأسهم السعودية بالذكاء الاصطناعي والطبقات الإحدى عشرة.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'تداول+ - تحليل الأسهم السعودية',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'تداول+ | تحليل ذكي للأسهم السعودية',
    description: 'تطبيق احترافي لتحليل الأسهم السعودية بالذكاء الاصطناعي.',
    images: ['/og-image.png'],
  },
  
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'تداول+',
  },
  
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },

  
  category: 'finance',
};

// ═══════════════════════════════════════════════
// 📱 Viewport
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
        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://app.sahmk.sa" />
        <link rel="dns-prefetch" href="https://query1.finance.yahoo.com" />
        
        {/* Resource Hints */}
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
        
        {/* Theme */}
        <meta name="color-scheme" content="dark" />
      </head>
      
      <body 
        style={{
          fontFamily: 'var(--font-cairo), Cairo, sans-serif',
          background: '#06080f',
          color: '#f0f6ff',
          margin: 0,
padding: 0,
paddingTop: 'env(safe-area-inset-top)',
          minHeight: '100vh',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
        }}
      >
        {children}
        
        {/* Schema.org (deferred) */}
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
    </html>
  );
}
