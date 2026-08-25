/**
 * @module constants/analysisConstants
 * @description ثوابت محرك التحليل — مستخرجة من الكود لتحسين القراءة والصيانة
 */

// ── Gate Thresholds ───────────────────────────────────────────────
export const GATE_THRESHOLDS = {
  LIQUIDITY_MIN:  55,    // L9 ≥ 55 للبوابة الأولى
  STRUCTURE_MIN:  50,    // L1 ≥ 50 للبوابة الثانية
  MOMENTUM_MIN:   50,    // (L4+L5)/2 ≥ 50 للبوابة الثالثة (مصحَّحة لتطابق القيمة الفعلية المستخدمة)
};


// ── Grade Thresholds (S/A/B/C/D/F) -- نظام calc9Layers/stockHealth الفعلي ──
export const GRADE_THRESHOLDS = {
  S: 85,   // ممتاز
  A: 75,   // جيد جداً
  B: 65,   // جيد
  C: 55,   // مقبول
  D: 45,   // ضعيف (أقل من هذا = F)
};


// ── Risk Parameters ───────────────────────────────────────────────
export const RISK = {
  RISK_FREE_RATE: 0.055, // معدل الخلو من المخاطر (5.5% SAIBOR)
  ATR_TARGET_MULT: 2.5,  // مضاعف ATR للهدف (target)
  ATR_STOP_MULT:  1.5,   // مضاعف ATR لوقف الخسارة (stop) -- مصحَّح من 2.5
  ATR_TRAIL_MULT: 1.8,   // مضاعف ATR للـ trailing stop (غير مستخدم فعلياً حالياً)
  STRESS_OIL_DRP: 0.30,  // سيناريو انهيار النفط 30%
  STRESS_TASI_DRP:0.15,  // سيناريو انهيار تاسي 15%
};

// ── Zakat ─────────────────────────────────────────────────────────
export const ZAKAT = {
  RATE:           0.025, // 2.5% من قيمة الأسهم
  NISAB_SAR:      22540, // النصاب بالريال (85g ذهب)
};

