/**
 * CONFIG — Environment Variables + Run Mode
 *
 * ALL secrets and API endpoints live here ONLY.
 * Components, services, engines → import from this file.
 * NEVER hardcode keys, URLs, or tokens elsewhere.
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  RUN MODES                                              │
 * │  demo       — simulation data, no API keys needed       │
 * │  staging    — real API, non-prod Supabase               │
 * │  production — real API, prod Supabase, full security    │
 * └─────────────────────────────────────────────────────────┘
 *
 * To activate production mode:
 *   1. Set NEXT_PUBLIC_EODHD_KEY in Vercel environment variables
 *   2. Set NEXT_PUBLIC_RUN_MODE=production
 *   3. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_KEY
 *
 * Current status: DEMO MODE (simulation data, no real prices)
 */

// ── Run mode: explicit, never ambiguous
const RUN_MODE = process.env.NEXT_PUBLIC_RUN_MODE ?? 'production';
// 'demo'       → GBM simulation, static seed data, no API calls
// 'staging'    → real EODHD data, non-prod Supabase
// 'production' → real EODHD data, prod Supabase, full monitoring

const config = {
  // ── Run mode (read-only — set via env var only)
  runMode: RUN_MODE,
  isDemo:       RUN_MODE === 'demo',
  isStaging:    RUN_MODE === 'staging',
  isProduction: RUN_MODE === 'production',
  isLive:       RUN_MODE !== 'demo', // any real-data mode

  // ── Claude AI — always use proxy, never direct
  claudeProxyUrl: process.env.NEXT_PUBLIC_CLAUDE_PROXY_URL ?? '/api/claude',

  // ── Supabase
  // SECURITY NOTE: The anon key is intentionally public-facing (Supabase design).
  // Real protection comes from RLS policies on each table, not key secrecy.
  supabaseUrl:  process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
  supabaseKey:  process.env.NEXT_PUBLIC_SUPABASE_KEY  ?? '',

  // ── EODHD Market Data (production)
  // Get key: https://eodhd.com → free tier: 20 requests/day
  eodhdApiKey: process.env.NEXT_PUBLIC_EODHD_KEY ?? '69bf5e872dcbf8.52356857',
  eodhdBaseUrl: 'https://eodhd.com/api',

  // ── Legacy / alternative data source
  sahmkBaseUrl: process.env.NEXT_PUBLIC_SAHMK_URL     ?? '/api/sahmk',

  // ── App Config
  appName:       'تداول+',
  appVersion:    '2.1.0',
  locale:        'ar-SA',
  currency:      'SAR',
  currencySymbol:'ر.س',

  // ── Feature Flags (auto-derived from runMode when not overridden)
  features: {
    // Data
    liveMarketData: true, // force true // auto-enables when key is set
    liveNews:       false,          // needs news API subscription
    tradingEnabled: false,          // always false until brokerage integration

    // AI
    aiLearning:     true,           // Supabase logging — works in all modes

    // Debug
    showModeLabel:  RUN_MODE !== 'production', // show "DEMO" badge in dev/staging
  },

  // ── What is REAL vs SIMULATED (honest classification)
  dataStatus: {
    // ✅ Real
    aiAnalysis:       'real',       // Claude API via proxy
    supabaseLogging:  'real',       // Supabase when keys set

    // ⚠️ Simulated (GBM) — changes when liveMarketData=true
    stockPrices:      'simulated',
    ohlcBars:         'simulated',
    volume:           'simulated',
    marketIndex:      'simulated',
    sectorPerformance:'simulated',

    // 📋 Static seed data
    fundamentals:     'seed-data',  // eps, pe, pb — from stocksData.js
    shareholderData:  'seed-data',  // from shareholdersData.js
    newsArticles:     'mock',       // mock data in newsApi.js
  },

    // ── Polling intervals (ms) -- تتكيف مع نوع الاشتراك
  intervals: (function() {
    // تحديد نوع الاشتراك من env variable
    const tier = process.env.NEXT_PUBLIC_API_TIER || 'free';
    
    // free   → 20 طلب/يوم (EODHD Free)
    // basic  → 100,000 طلب/شهر (EODHD $20/mo)
    // premium → 1,000,000 طلب/شهر (EODHD $100/mo)
    // realtime → WebSocket (لحظي)
    
    if (tier === 'realtime') {
      // WebSocket - لحظي
      return {
        marketData:  5_000,    // 5 ثواني (fallback)
        portfolio:   10_000,   // 10 ثواني
        news:        60_000,   // دقيقة
      };
    }
    
    if (tier === 'premium') {
      // Premium - كل 30 ثانية
      return {
        marketData:  30_000,   // 30 ثانية
        portfolio:   60_000,   // دقيقة
        news:        300_000,  // 5 دقائق
      };
    }
    
    if (tier === 'basic') {
      // Basic - كل 3 دقائق
      return {
        marketData:  180_000,  // 3 دقائق
        portfolio:   300_000,  // 5 دقائق
        news:        600_000,  // 10 دقائق
      };
    }
    
    // Free - كل 15 دقيقة (الافتراضي)
    return {
      marketData:  900_000,   // 15 دقيقة
      portfolio:   900_000,   // 15 دقيقة
      news:        900_000,   // 15 دقيقة
    };
  })(),
};

export default config;
