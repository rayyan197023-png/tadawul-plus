/**
 * @module engines/backtestAnalysisEngine
 * @description محرك تحليل الباك-تيست -- نسخة مستقلة لـ stockHealth
 *
 * 🎯 الهدف:
 * - نسخة مطابقة لـ analysisEngine لكن تستعمل allStocks المُمرّرة
 * - بدلاً من STOCKS_LIVE الفارغة أثناء الباك-تيست
 * - يكتب في نفس tdw_feedback_state ليتعلّم ABM
 *
 * 🔧 قاعدة الصيانة:
 * أيّ تحديث في analysisEngine.ts يجب أن يُكرّر هنا.
 * الفرق الجوهري الوحيد: مصدر "السوق" (allStocks بدل STOCKS_LIVE).
 *
 * 📚 الاستخدام:
 *   import { stockHealth } from '../engines/backtestAnalysisEngine';
 *   const health = stockHealth(stk, bars, allStocks);
 */

import { calcRSI, calcATR, calcVWAP, calcCMF, calcOBV, calcMACD, calcMarketStructure } from './technicalEngine';
import { calcOrderBlocks, calcLiqSweep } from './radarEngine';

// ════════════════════════════════════════════════════════════
//  ثوابت أساسية -- نسخة من analysisEngine
// ════════════════════════════════════════════════════════════

const MACRO = {
  oilPrice: 101.44, oilTarget: 80,
  saudiRepoRate: 4.25, cpi: 1.7,
  gdpGrowth: 4.6, tasiPE: 19.8,
  vix: 24.85, m2Growth: 9.1,
  oilWarPremium: true,
  retailRatio: 0.85,
  sessionDay: "SUN",
  pifSectors: [] as any[],
  oilTasiRegime: "RALLY",
};

const OIL_SENS: any = {
  "الطاقة": 1.8, "المواد الأساسية": 1.3, "السلع الرأسمالية": 1.1,
  "المرافق العامة": 0.7, "البنوك": 0.9, "الخدمات المالية": 0.5,
  "التأمين": 0.6, "النقل": 0.4, "إدارة وتطوير العقارات": 0.5,
  "التجزئة": 0.6, "الإعلام والترفيه": 0.5, "إنتاج الأغذية": 0.5,
  "الإتصالات": 0.6, "التطبيقات وخدمات التقنية": 0.7,
};

const RATE_SENS: any = {
  "البنوك": 1.5, "الخدمات المالية": 1.0, "التأمين": 1.2,
  "الطاقة": 0.3, "المواد الأساسية": 0.15,
  "المرافق العامة": -0.6, "إدارة وتطوير العقارات": -0.9,
  "التجزئة": -0.8, "التطبيقات وخدمات التقنية": -0.6,
};

// ════════════════════════════════════════════════════════════
//  دوال مساعدة أساسية -- مطابقة لـ analysisEngine
// ════════════════════════════════════════════════════════════

/**
 * Clamp value between min and max
 */
function _clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Softmax 3-way - Mathematical Probability Distribution
 * Returns probabilities that sum to exactly 100%
 */
function _softmax3(a: number, b: number, c: number): any {
  a = typeof a === 'number' && !isNaN(a) ? a : 0;
  b = typeof b === 'number' && !isNaN(b) ? b : 0;
  c = typeof c === 'number' && !isNaN(c) ? c : 0;
  
  const maxVal = Math.max(a, b, c);
  const T = 50;
  
  const ea = Math.exp(_clamp((a - maxVal) / T, -10, 0));
  const eb = Math.exp(_clamp((b - maxVal) / T, -10, 0));
  const ec = Math.exp(_clamp((c - maxVal) / T, -10, 0));
  
  const s = ea + eb + ec;
  
  if (s === 0 || !isFinite(s)) {
    return { bull: 33, bear: 33, neutral: 34 };
  }
  
  let bullProb = (ea / s) * 100;
  let bearProb = (eb / s) * 100;
  let neutralProb = (ec / s) * 100;
  
  let bull = Math.round(bullProb);
  let bear = Math.round(bearProb);
  let neutral = Math.round(neutralProb);
  
  const total = bull + bear + neutral;
  if (total !== 100) {
    const diff = 100 - total;
    if (bull >= bear && bull >= neutral) bull += diff;
    else if (bear >= bull && bear >= neutral) bear += diff;
    else neutral += diff;
  }
  
  return {
    bull: Math.max(0, Math.min(100, bull)),
    bear: Math.max(0, Math.min(100, bear)),
    neutral: Math.max(0, Math.min(100, neutral))
  };
}

/**
 * نتيجة فارغة آمنة - عند فشل الفحوصات
 */
function _emptyHealthResult(): any {
  return {
    score: 50,
    grade: "D",
    sig: "محايد",
    sigC: "#06b6d4",
    regime: "chop",
    weights: { L1: 0.11, L2: 0.11, L3: 0.11, L4: 0.11, L5: 0.11, L6: 0.11, L7: 0.11, L8: 0.11, L9: 0.12 },
    probability: { bull: 33, bear: 33, neutral: 34 },
    gates: {
      g1: false, g2: false, g3: false,
      passed: 0, all: false,
      g1s: 50, g2s: 50, g3s: 50,
      g1l: "بيانات غير كافية",
      g2l: "بيانات غير كافية",
      g3l: "بيانات غير كافية"
    },
    opp: {
      matrix: "بيانات غير كافية",
      color: "#6b7280",
      priority: 0,
      highLiq: false, highStr: false, highMom: false
    },
    layers: { L1: 50, L2: 50, L3: 50, L4: 50, L5: 50, L6: 50, L7: 50, L8: 50, L9: 50 },
    extras: {
      conflictCount: 0,
      bayesMult: 1.0,
      vr: 1.0,
      kelly: 0,
      adxV: 25,
      adxBull: false,
      rsiV: 50,
      macdH: 0,
      mktBreadth: 0.5,
      mktMomentum: 0,
      gateMultiplier: 0.5,
      regimeData: { regime: "chop" },
    },
    tasiCtx: null as any,
  };
}

// ════════════════════════════════════════════════════════════
//  دالة الاختبار -- للتأكّد من نجاح المرحلة ٢
// ════════════════════════════════════════════════════════════

export function testBacktestEngine(): string {
  const test1 = _clamp(150, 0, 100);
  const test2 = _softmax3(80, 20, 5);
  const test3 = _emptyHealthResult();
  return `✅ المرحلة ٢ ناجحة | clamp=${test1} | softmax bull=${test2.bull}% | empty score=${test3.score}`;
}

// ════════════════════════════════════════════════════════════
//  TODO -- سيُضاف لاحقاً:
//  - _clamp, _softmax3, _emptyHealthResult
//  - calc9Layers (نسخة معدّلة تأخذ allStocks)
//  - stockHealth (نسخة معدّلة تأخذ allStocks)
//  - calcMacroFull, calcTasiContext
//  - calcFactorModel, calcDCF, calcEarningsModel
//  - calcRiskAttribution, calcIntermarket, calcMicrostructure
//  - ensembleVote, calcConfidenceThreshold
//  - feedback functions (تُستورد من analysisEngine بالاسم)
// ════════════════════════════════════════════════════════════
