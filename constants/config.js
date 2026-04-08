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
const RUN_MODE = process.env.NEXT_PUBLIC_RUN_MODE ?? 'demo';
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
  eodhdApiKey:  process.env.NEXT_PUBLIC_EODHD_KEY     ?? '',
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
    liveMarketData: !!(process.env.NEXT_PUBLIC_EODHD_KEY), // auto-enables when key is set
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

  // ── Polling intervals (ms) — only active when liveMarketData=true
  intervals: {
    marketData:  30_000,   // 30s
    portfolio:   60_000,   // 1m
    news:       300_000,   // 5m
  },
};

export default config;
