/**
 * @module constants/config
 * @description إعدادات التطبيق ومتغيرات البيئة
 */

const RUN_MODE = process.env.NEXT_PUBLIC_RUN_MODE ?? 'production';

const config = {
  runMode:      RUN_MODE,
  isDemo:       RUN_MODE === 'demo',
  isStaging:    RUN_MODE === 'staging',
  isProduction: RUN_MODE === 'production',
  isLive:       RUN_MODE !== 'demo',

  // ── Claude AI
  claudeProxyUrl: process.env.NEXT_PUBLIC_CLAUDE_PROXY_URL ?? '/api/claude',

  // ── sahmk API -- الـ proxy الداخلي فقط
  sahmkProxyUrl: '/api/sahmkdata',

  // ── App
  appName:        'تداول+',
  appVersion:     '2.1.0',
  locale:         'ar-SA',
  currency:       'SAR',
  currencySymbol: 'ر.س',

  // ── Feature Flags
  features: {
    liveMarketData: true,
    liveNews:       false,
    tradingEnabled: false,
    aiLearning:     true,
    showModeLabel:  RUN_MODE !== 'production',
  },
};

export default config;
