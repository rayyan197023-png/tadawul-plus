/**
 * @module constants/analysisConstants
 * @description ثوابت محرك التحليل — مستخرجة من الكود لتحسين القراءة والصيانة
 */

// ── Layer Weights (افتراضية — تُعدَّل بـ buildDynamicWeights) ──────
export const LAYER_WEIGHTS = {
  L1_STRUCTURE:   0.21,  // هيكل السوق
  L2_FLOW:        0.14,  // تدفق السيولة
  L3_ENTROPY:     0.08,  // كثافة المعلومات
  L4_RELATIVE:    0.12,  // القوة النسبية
  L5_MOMENTUM:    0.09,  // الزخم
  L6_VALUE:       0.10,  // التقييم
  L7_MACRO:       0.08,  // الاقتصاد الكلي
  L8_RISK:        0.07,  // المخاطر
  L9_LIQUIDITY:   0.11,  // السيولة (بوابة)
};

// ── Gate Thresholds ───────────────────────────────────────────────
export const GATE_THRESHOLDS = {
  LIQUIDITY_MIN:  55,    // L9 ≥ 55 للبوابة الأولى
  STRUCTURE_MIN:  50,    // L1/MS ≥ 50 للبوابة الثانية
  MOMENTUM_MIN:   45,    // ADX/MACD ≥ 45 للبوابة الثالثة
};

// ── Signal Score Boundaries ───────────────────────────────────────
export const SIGNAL_LEVELS = {
  STRONG_BUY:     75,    // شراء قوي
  WATCH:          60,    // مراقبة
  NEUTRAL:        45,    // محايد
  REDUCE:         0,     // تخفيف (أقل من 45)
};

// ── Kelly Position Sizing ─────────────────────────────────────────
export const KELLY = {
  HALF_FACTOR:    0.5,   // Half-Kelly (المعيار المؤسسي)
  MAX_POSITION:   0.15,  // الحد الأقصى 15% من المحفظة
  MIN_POSITION:   0.02,  // الحد الأدنى 2%
  RR_DEFAULT:     1.5,   // نسبة المكسب/الخسارة الافتراضية
  RR_STRONG:      1.8,   // R:R للإشارات القوية
};

// ── Risk Parameters ───────────────────────────────────────────────
export const RISK = {
  RISK_FREE_RATE: 0.055, // معدل الخلو من المخاطر (5.5% SAIBOR)
  ATR_STOP_MULT:  2.5,   // مضاعف ATR لوقف الخسارة
  ATR_TRAIL_MULT: 1.8,   // مضاعف ATR للـ trailing stop
  STRESS_OIL_DRP: 0.30,  // سيناريو انهيار النفط 30%
  STRESS_TASI_DRP:0.15,  // سيناريو انهيار تاسي 15%
};

// ── Zakat ─────────────────────────────────────────────────────────
export const ZAKAT = {
  RATE:           0.025, // 2.5% من قيمة الأسهم
  NISAB_SAR:      22540, // النصاب بالريال (85g ذهب)
};

// ── API Polling Intervals (ms) ────────────────────────────────────
export const INTERVALS = {
  PRICE_UPDATE:   3000,  // تحديث الأسعار كل 3 ثوانٍ
  ANALYSIS_CALC:  5000,  // حساب التحليل كل 5 ثوانٍ
  COMMODITY_API:  600000,// أسعار السلع كل 10 دقائق
  PRICE_ALERT:    5000,  // فحص التنبيهات كل 5 ثوانٍ
};
