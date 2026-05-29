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
//  دوال السوق والاقتصاد الكلي
// ════════════════════════════════════════════════════════════

/**
 * Macro Score - النسخة المختصرة للرادار
 */
function calcMacroScore(stk: any): any {
  const pe = stk.pe || 20;
  const peScore = Math.max(0, Math.min(100, 100 - (pe - 15) * 2));
  
  const oilSens = OIL_SENS[stk.sec] || 0.5;
  const oilDelta = (MACRO.oilPrice - MACRO.oilTarget) / MACRO.oilTarget;
  const oilScore = Math.max(0, Math.min(100, 50 + oilSens * oilDelta * 80));
  
  const rateSens = RATE_SENS[stk.sec] || 0.3;
  const realRate = MACRO.saudiRepoRate - MACRO.cpi;
  const rateScore = Math.max(0, Math.min(100, 50 + rateSens * (realRate - 1.5) * 15));
  
  const vixScore = Math.max(0, Math.min(100, 100 - (MACRO.vix - 20) * 3));
  const gdpScore = Math.max(0, Math.min(100, 50 + (MACRO.gdpGrowth - 2.5) * 15));
  
  const score = Math.round(
    peScore * 0.40 + oilScore * 0.25 + rateScore * 0.15 +
    vixScore * 0.10 + gdpScore * 0.10
  );
  
  return {
    score: Math.max(0, Math.min(100, score)),
    components: {
      pe: Math.round(peScore),
      oil: Math.round(oilScore),
      rate: Math.round(rateScore),
      vix: Math.round(vixScore),
      gdp: Math.round(gdpScore),
    },
  };
}

/**
 * Macro Full - النسخة الكاملة للطبقات /20
 */
function calcMacroFull(stk: any): any {
  const m = MACRO;
  const oS = OIL_SENS[stk.sec] || 0.8;
  const rS = RATE_SENS[stk.sec] || 0.3;
  const oilDelta = (m.oilPrice - m.oilTarget) / m.oilTarget;
  const oilScore = Math.round(Math.min(20, Math.max(0, 10 + 10 * Math.tanh(oilDelta * oS * 2))));
  const rr = m.saudiRepoRate - m.cpi;
  const rateBase = Math.round(10 + 8 * Math.tanh((rr - 1.5) / 1.5));
  const rateScore = rS > 0
    ? Math.min(20, Math.max(0, rateBase * rS / 1.5))
    : Math.min(20, Math.max(0, 18 - rateBase));
  const gdp = Math.round(8 + 10 * Math.tanh((m.gdpGrowth - 2.5) / 1.5));
  const vix_s = Math.round(10 - 8 * Math.tanh((m.vix - 20) / 8));
  const mktV_s = Math.round(10 - 6 * Math.tanh((m.tasiPE - 20) / 5));
  const m2_s = Math.round(8 + 8 * Math.tanh((m.m2Growth - 5) / 3));
  const score = Math.min(20, Math.max(2, Math.round(
    oilScore * 0.25 + rateScore * 0.20 + gdp * 0.20 +
    vix_s * 0.15 + mktV_s * 0.10 + m2_s * 0.10
  )));
  return {
    score,
    env: score >= 15 ? "إيجابي" : score >= 10 ? "محايد" : "سلبي",
    label: "نفط " + m.oilPrice + "$ | فائدة " + m.saudiRepoRate + "% | مخاطرة " + m.vix,
    oilScore: +oilScore.toFixed(1),
    realRate: +rr.toFixed(2)
  };
}

/**
 * TASI Context - السياق السعودي
 * 🔧 تعديل عن analysisEngine: يقبل allStocks مُمرّرة بدل STOCKS العامّة
 */
function calcTasiContext(stk: any, bars: any[], allStocks: any[] = []): any {
  // حماية: لو allStocks فارغة، نُعيد قيم محايدة
  if (!allStocks || allStocks.length === 0) {
    return {
      dominanceScore: 50, domDir: 0, domBullCount: 0, domBearCount: 0,
      domRatio: 0.5, topN: 0,
      tasiRegime: "DECOUPLE", oilRegimeScore: 55,
      retailSentiment: 50, retailEuphoria: false, retailSpread: 0,
      sessionBoost: 1.0, isSunday: false, isThursday: false, sundayPenalty: 0,
      pifActive: false, pifBoost: 0,
      tasiComposite: 50, tasiSignal: "بيئة محايدة"
    };
  }

  // ① TASI Dominance Score
  const topN = Math.min(10, Math.max(3, Math.round(allStocks.length * 0.10)));
  const dominants = allStocks
    .slice()
    .sort((a: any, b: any) => (b.mktCap || 0) - (a.mktCap || 0))
    .slice(0, topN);
  const domBullCount = dominants.filter((x: any) => x.ch > 0.3).length;
  const domBearCount = dominants.filter((x: any) => x.ch < -0.3).length;
  const domRatio = domBullCount / topN;
  const domDir = domRatio >= 0.70 ? 1
              : domRatio >= 0.55 ? 0.5
              : (1 - domRatio) >= 0.70 ? -1
              : (1 - domRatio) >= 0.55 ? -0.5
              : 0;
  const dominanceScore = _clamp(Math.round(50 + domDir * 20), 0, 100);

  // ② Oil-TASI Regime
  const oilAboveTarget = MACRO.oilPrice > MACRO.oilTarget;
  const tasiAvgCh = allStocks.reduce((s: number, x: any) => s + (x.ch || 0), 0) / allStocks.length;
  const tasiBull = tasiAvgCh > 0.2;
  let tasiRegime;
  if (oilAboveTarget && tasiBull) tasiRegime = "RALLY";
  else if (oilAboveTarget && !tasiBull) tasiRegime = "DIVERGE";
  else if (!oilAboveTarget && tasiBull) tasiRegime = "DECOUPLE";
  else tasiRegime = "CRASH";
  const oilRegimeScore = tasiRegime === "RALLY" ? 80
                       : tasiRegime === "DECOUPLE" ? 55
                       : tasiRegime === "DIVERGE" ? 35
                       : 20;

  // ③ Retail Sentiment
  const smallCaps = allStocks.filter((x: any) => (x.mktCap || 100) < 100);
  const largeCaps = allStocks.filter((x: any) => (x.mktCap || 100) > 300);
  const smallAvgCh = smallCaps.length
    ? smallCaps.reduce((s: number, x: any) => s + (x.ch || 0), 0) / smallCaps.length
    : tasiAvgCh;
  const largeAvgCh = largeCaps.length
    ? largeCaps.reduce((s: number, x: any) => s + (x.ch || 0), 0) / largeCaps.length
    : tasiAvgCh;
  const retailSpread = smallAvgCh - largeAvgCh;
  const retailSentiment = _clamp(Math.round(50 + retailSpread * 12), 0, 100);
  const retailEuphoria = retailSpread > 1.5;

  // ④ Session Timing
  const sessionDay = MACRO.sessionDay || "SUN";
  const isSunday = sessionDay === "SUN";
  const isThursday = sessionDay === "THU";
  const sessionBoost = isSunday ? 1.20 : isThursday ? 1.10 : 1.0;
  const sundayPenalty = isSunday ? 5 : 0;

  // ⑤ PIF Activity
  const pifActive = (MACRO.pifSectors || []).indexOf(stk.sec) !== -1;
  const pifBoost = pifActive ? 8 : 0;

  // المركّب
  const tasiComposite = Math.round(
    dominanceScore * 0.35 +
    oilRegimeScore * 0.30 +
    retailSentiment * 0.20 +
    (100 - sundayPenalty) * 0.15
  );

  const tasiSignal = tasiComposite >= 72 ? "بيئة تاسي داعمة"
                   : tasiComposite >= 52 ? "بيئة محايدة"
                   : tasiComposite >= 35 ? "بيئة ضاغطة"
                   : "بيئة خطرة";

  return {
    dominanceScore, domDir, domBullCount, domBearCount,
    domRatio: +domRatio.toFixed(2), topN,
    tasiRegime, oilRegimeScore,
    retailSentiment, retailEuphoria, retailSpread: +retailSpread.toFixed(2),
    sessionBoost, isSunday, isThursday, sundayPenalty,
    pifActive, pifBoost,
    tasiComposite, tasiSignal,
  };
}

/**
 * Macro Gate - تعديل النتيجة حسب البيئة الاقتصادية
 */
function applyMacroGate(rawScore: number, macroScore100: number): number {
  let multiplier = 1.0;
  if (macroScore100 < 25) multiplier = 0.82;
  else if (macroScore100 < 40) multiplier = 0.91;
  else if (macroScore100 > 75) multiplier = 1.06;
  else if (macroScore100 > 60) multiplier = 1.03;
  return _clamp(rawScore * multiplier, 0, 100);
}

// ════════════════════════════════════════════════════════════
//  دالة الاختبار -- للتأكّد من نجاح المرحلة ٣
// ════════════════════════════════════════════════════════════

export function testBacktestEngine(): string {
  // اختبار الدوال
  const testStk = { sec: "البنوك", pe: 12 };
  const mc1 = calcMacroScore(testStk);
  const mc2 = calcMacroFull(testStk);
  const tc = calcTasiContext(
    testStk,
    [] as any[],
    [
      { sym: "1010", sec: "البنوك", ch: 0.5, mktCap: 30 },
      { sym: "2222", sec: "الطاقة", ch: 1.2, mktCap: 1800 }
    ]
  );
  const mg = applyMacroGate(60, 80);
  
  return `✅ المرحلة ٣ ناجحة | macroScore=${mc1.score} | macroFull=${mc2.score}/20 | tasi=${tc.tasiRegime} | macroGate=${mg.toFixed(1)}`;
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
