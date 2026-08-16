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

// ════════════════════════════════════════════════════════════
//  ثوابت أساسية -- نسخة من analysisEngine
// ════════════════════════════════════════════════════════════

let MACRO = {
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

// 🆕 تطبيق macro override
function setMacroOverride(override: any): any {
  const previous = { ...MACRO };
  if (override && typeof override === 'object') {
    if (typeof override.oilPrice === 'number' && override.oilPrice > 0) MACRO.oilPrice = override.oilPrice;
    if (typeof override.vix === 'number' && override.vix > 0) MACRO.vix = override.vix;
    if (typeof override.saudiRepoRate === 'number') MACRO.saudiRepoRate = override.saudiRepoRate;
    if (typeof override.cpi === 'number') MACRO.cpi = override.cpi;
    if (typeof override.gdpGrowth === 'number') MACRO.gdpGrowth = override.gdpGrowth;
    if (typeof override.tasiPE === 'number') MACRO.tasiPE = override.tasiPE;
    if (typeof override.m2Growth === 'number') MACRO.m2Growth = override.m2Growth;
    if (typeof override.sessionDay === 'string') MACRO.sessionDay = override.sessionDay;
    if (Array.isArray(override.pifSectors)) MACRO.pifSectors = override.pifSectors;
    if (typeof override.oilTasiRegime === 'string') MACRO.oilTasiRegime = override.oilTasiRegime;
    if (typeof override.oilWarPremium === 'boolean') MACRO.oilWarPremium = override.oilWarPremium;
    if (typeof override.retailRatio === 'number') MACRO.retailRatio = override.retailRatio;
    if (typeof override.oilTarget === 'number') MACRO.oilTarget = override.oilTarget;
  }
  return previous;
}

function restoreMacro(previous: any): void {
  if (previous && typeof previous === 'object') {
    Object.keys(previous).forEach(k => {
      (MACRO as any)[k] = previous[k];
    });
  }
}

// ════════════════════════════════════════════════════════════
//  🆕 WEIGHTS OVERRIDE - دعم Strategy Lab
// ════════════════════════════════════════════════════════════

let WEIGHTS_OVERRIDE: any = null;

function setWeightsOverride(override: any): any {
  const previous = WEIGHTS_OVERRIDE;
  if (override && typeof override === 'object') {
    // تطبيع الأوزان للتأكّد أنّها صالحة
    const keys = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'];
    let total = 0;
    const normalized: any = {};
    
    keys.forEach(k => {
      const v = typeof override[k] === 'number' ? override[k] : 0.111;
      normalized[k] = Math.max(0.01, v);
      total += normalized[k];
    });
    
    // تطبيع لمجموع = 1.00
    if (total > 0) {
      keys.forEach(k => {
        normalized[k] = normalized[k] / total;
      });
      WEIGHTS_OVERRIDE = normalized;
    }
  }
  return previous;
}

function restoreWeights(previous: any): void {
  WEIGHTS_OVERRIDE = previous !== undefined ? previous : null;
}

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
//  دوال التقييم والمخاطر
// ════════════════════════════════════════════════════════════

const RADAR_SECTOR_PE: any = {
  "البنوك": 12.5, "الخدمات المالية": 15.0, "السلع الرأسمالية": 17.0,
  "المواد الأساسية": 16.5, "الطاقة": 16.0, "المرافق العامة": 14.0,
  "الخدمات التجارية والمهنية": 18.0, "النقل": 16.0, "السلع طويلة الأجل": 17.0,
  "الخدمات الإستهلاكية": 20.0, "الإعلام والترفيه": 19.0, "التجزئة": 20.0,
  "تجزئة الأغذية": 21.0, "المنتجات المنزلية والشخصية": 20.0,
  "إنتاج الأغذية": 22.0, "الرعاية الصحية": 24.0, "الأدوية": 23.0,
  "إدارة وتطوير العقارات": 15.0, "الإتصالات": 14.0,
  "التطبيقات وخدمات التقنية": 25.0, "التأمين": 16.0
};

/**
 * Factor Model - نموذج العوامل المتعدّدة
 * 🔧 تعديل: يأخذ allStocks مُمرّرة
 */
function calcFactorModel(stk: any, bars: any[], allStocks: any[]): any {
  if (!stk) return { composite: 50, factors: {}, alpha: 0, beta: 1, grade: "D", signal: "بيانات غير كافية" };
  bars = Array.isArray(bars) ? bars : [];
  allStocks = allStocks || [];

  const sectorStocksForPE = allStocks.filter((x: any) => x.sec === stk.sec && x.pe > 0 && x.pe < 60);
  const benchPE = sectorStocksForPE.length >= 2
    ? sectorStocksForPE.reduce((s: number, x: any) => s + x.pe, 0) / sectorStocksForPE.length
    : (RADAR_SECTOR_PE[stk.sec] || 18);
  const valueScore = stk.pe > 0
    ? Math.round(Math.min(95, Math.max(5, 50 - 45 * Math.tanh((stk.pe / benchPE - 1) * 1.5))))
    : 50;
  const ret1M_comp = bars.slice(-20).reduce((prod: number, b: any) => prod * (1 + (b.pct || 0) / 100), 1) - 1;
  const ret3M_comp = bars.slice(-60).reduce((prod: number, b: any) => prod * (1 + (b.pct || 0) / 100), 1) - 1;
  const momScore = Math.round(Math.min(100, Math.max(0, 50 + ret1M_comp * 100 * 1.5 + ret3M_comp * 100 * 0.4)));
  let pbPenalty = 0;
  if (stk.bookValue && stk.bookValue > 0) {
    const pb = stk.p / stk.bookValue;
    pbPenalty = Math.round(Math.tanh((pb - 2.5) / 2) * (-8));
  }
  // ✨ العوامل الأساسية تُحسب فقط عند توفّر بياناتها -- وإلا نُعيد التوزيع على المتاح
  const hasFund = stk.roe != null || stk.pe != null || stk.divY != null;
  const qualScore = hasFund ? Math.round(Math.min(100, Math.max(0, (stk.roe || 10) * 1.8 + (1 - (stk.debt || 0.3)) * 28 + Math.min(15, (stk.epsGrw || 3) * 1.5) + pbPenalty))) : 50;
  const sizeScore = stk.mktCap != null ? Math.round(Math.min(85, Math.max(35, 80 - 40 * Math.tanh((stk.mktCap - 100) / 150)))) : 50;
  const divScore = stk.divY != null ? Math.round(Math.min(90, Math.max(0, stk.divY * 14))) : 50;
  const growScore = stk.revGrw != null ? Math.round(Math.min(100, Math.max(0, 50 + stk.revGrw * 2.5))) : 50;
  // بلا أساسيات: الزخم السعري وحده يحرّك المركّب
  const composite = hasFund
    ? Math.round(valueScore * 0.20 + momScore * 0.25 + qualScore * 0.25 + sizeScore * 0.10 + divScore * 0.10 + growScore * 0.10)
    : Math.round(momScore);
  const mktAvgCh = allStocks.length > 0
    ? allStocks.reduce((s: number, x: any) => s + (x.ch || 0), 0) / allStocks.length
    : 0;
  const alpha = +((stk.ch || 0) - mktAvgCh).toFixed(2);
  return {
    composite,
    factors: { value: valueScore, momentum: momScore, quality: qualScore, size: sizeScore, dividend: divScore, growth: growScore },
    alpha,
    beta: +(stk.sector_beta || 1).toFixed(2),
    grade: composite >= 80 ? "S" : composite >= 70 ? "A" : composite >= 60 ? "B" : composite >= 50 ? "C" : "D",
    signal: composite >= 70 && alpha > 0 ? "إشارة قوية" : composite >= 60 ? "إشارة معتدلة" : "ضعيف"
  };
}

/**
 * Earnings Model - 2-Stage DDM
 */
function calcEarningsModel(stk: any): any {
  if (!stk) return { eps: 0, ddmValue: 0, peValue: 0, targetPrice: 0, upside: 0, signal: "بيانات غير كافية" };
    // ✨ بلا أساسيات لا معنى لنموذج أرباح -- محايد صريح
  if (stk.pe == null && stk.eps == null) {
    return { eps: 0, ddmValue: stk.p, peValue: stk.p, targetPrice: stk.p, upside: 0,
             payout: 0, peg: null, pegSignal: "غير محدد", ke: 0, g2: 0,
             signal: "لا بيانات أساسية -- النموذج غير متاح" };
  }
  const eps = stk.eps || stk.p / (stk.pe || 15);
  const g1 = Math.min((stk.epsGrw || 3) / 100, 0.15);
  const g2 = Math.min(g1 * 0.4, MACRO.gdpGrowth / 100 || 0.03);
  const ke = 0.08 + (stk.sector_beta || 1) * 0.055;
  const dps = stk.divY > 0 ? (stk.divY / 100) * stk.p : 0;
  const payoutNow = eps > 0 && dps > 0 ? Math.min(0.90, dps / eps) : 0.30;
  const payoutStable = Math.min(0.85, payoutNow + (1 - payoutNow) * 0.5);
  let ddm2Stage = 0;
  if (g1 < ke && eps > 0) {
    for (let yr = 1; yr <= 5; yr++) {
      ddm2Stage += eps * Math.pow(1 + g1, yr) * payoutNow / Math.pow(1 + ke, yr);
    }
    const eps5 = eps * Math.pow(1 + g1, 5);
    const div6 = eps5 * (1 + g2) * payoutStable;
    const tv = g2 < ke ? div6 / (ke - g2) : eps5 * 15;
    ddm2Stage += tv / Math.pow(1 + ke, 5);
  } else {
    ddm2Stage = stk.p;
  }
  const epsFwd = eps * (1 + g1);
  const peFwd = stk.pe > 0 ? stk.pe / (1 + g1) : 15;
  const peVal = +(epsFwd * peFwd).toFixed(2);
  const peg = stk.pe > 0 && stk.epsGrw > 0 ? +(stk.pe / stk.epsGrw).toFixed(2) : null;
  let targetAvg;
  if (stk.target && stk.target > 0) {
    targetAvg = +((peVal * 0.40 + ddm2Stage * 0.35 + stk.target * 0.25)).toFixed(2);
  } else {
    targetAvg = +((peVal + ddm2Stage) / 2).toFixed(2);
  }
  const upside = +((targetAvg / stk.p - 1) * 100).toFixed(1);
  return {
    eps: +eps.toFixed(2),
    ddmValue: +ddm2Stage.toFixed(2),
    peValue: peVal,
    targetPrice: targetAvg,
    upside,
    payout: +(payoutNow * 100).toFixed(1),
    peg,
    pegSignal: peg ? (peg < 1 ? "رخيص جداً" : peg < 1.5 ? "رخيص" : peg < 2 ? "عادل" : "غالٍ") : "غير محدد",
    ke: +(ke * 100).toFixed(1),
    g2: +(g2 * 100).toFixed(1),
    signal: upside > 15 ? "مقيّم بأقل من قيمته" : upside > 5 ? "عادل" : "مقيّم بأعلى من قيمته"
  };
}

/**
 * DCF Calculation
 */

function calcDCF(stk: any): any {
  if (!stk) return { intrinsic: 0, upside: 0, wacc: 8, dcfScore: 50, signal: "بيانات غير كافية", rating: "احتفاظ" };
  const eps = stk.eps || stk.p / (stk.pe || 15);
  const ke = 0.08 + (stk.sector_beta || 1) * 0.055;
  const roe = (stk.roe || 12) / 100;
  let bvps = stk.bookValue || (roe > ke ? eps / roe : stk.p / (stk.pe || 15) * (1 - ke / roe * 0.5));
  bvps = Math.max(bvps, eps);
  const g1 = Math.min((stk.epsGrw || 5) / 100, 0.12);
  const gdpGrowthRate = (MACRO.gdpGrowth || 4.0) / 100;
  const sectorGrowthAdj: any = { "الطاقة": 0.01, "البنوك": 0.005, "التطبيقات وخدمات التقنية": 0.02, "المواد الأساسية": 0.005, "إنتاج الأغذية": 0.005 };
  const gStable = Math.min(g1, gdpGrowthRate + (sectorGrowthAdj[stk.sec] || 0));
  const graham = eps > 0 && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : stk.p;
  const dcfVal = gStable < ke && eps > 0 ? eps * (1 + g1) / (ke - gStable) : stk.p;
  const sectorBase = 5;
  const lynchPE = Math.min(30, Math.max(10, (stk.epsGrw || 5) + (stk.divY || 0) + sectorBase));
  const lynch = eps * lynchPE;
  let peRel = Math.max(0.12, 0.45 - 0.30 * Math.tanh(((stk.pe || 15) - 20) / 25));
  let grahamW = Math.max(0.10, 0.35 - 0.20 * Math.tanh(((stk.pe || 15) - 25) / 20));
  const residual = 1.0 - grahamW - peRel;
  let lynchW = Math.max(0.05, residual);
  const totalW = grahamW + peRel + lynchW;
  grahamW /= totalW; peRel /= totalW; lynchW /= totalW;
  let intrinsic = +(graham * grahamW + dcfVal * peRel + lynch * lynchW).toFixed(2);
  const netDebtAdj = Math.max(0.85, 1.0 - (stk.debt || 0) * 0.30);
  intrinsic = +(intrinsic * netDebtAdj).toFixed(2);
  const upside = +((intrinsic / stk.p - 1) * 100).toFixed(1);
  const dcfScore = Math.round(Math.max(10, 100 / (1 + Math.exp(-0.06 * (upside - 5)))));
  return {
    intrinsic, upside,
    wacc: +(ke * 100).toFixed(1),
    grahamValue: +graham.toFixed(2),
    dcfValue: +dcfVal.toFixed(2),
    lynchValue: +lynch.toFixed(2),
    lynchPE: +lynchPE.toFixed(1),
    dcfScore,
    signal: upside > 20 ? "مقيّم بأقل من قيمته بشكل واضح" : upside > 10 ? "مقيّم بأقل من قيمته" : upside > -10 ? "تقييم عادل" : "مقيّم بأعلى من قيمته",
    rating: upside > 20 ? "شراء قوي" : upside > 10 ? "شراء" : upside > -10 ? "احتفاظ" : "تخفيف"
  };
}

/**
 * Earnings Quality
 */
function calcEarningsQuality(stk: any): any {
  // ✨ بلا أساسيات لا تُقاس جودة الأرباح -- محايد صريح
  if (stk.pe == null && stk.eps == null && stk.roe == null) {
    return { composite: 50, grade: "-", signal: "لا بيانات أساسية -- الجودة غير متاحة",
             components: { accruals: 50, consistency: 50, debt: 50, dividend: 50, pe: 50 } };
  }
  const eps = stk.eps || stk.p / (stk.pe || 15);
  const roe = stk.roe || 10, debt = stk.debt || 0.3;
  const epsGrw = stk.epsGrw || 0, revGrw = stk.revGrw || 0;
  const pe = stk.pe || 15, divY = stk.divY || 0;

  let accruals;
  if (stk.freeCashFlow && stk.freeCashFlow > 0) {
    const fcfPerShare = stk.freeCashFlow;
    accruals = Math.max(0, (eps - fcfPerShare) / Math.max(eps, fcfPerShare, 0.01));
  } else {
    const cashROE = Math.min(roe, roe * (1 - debt * 0.5));
    accruals = Math.max(0, (roe - cashROE) / 100);
  }
  const accrualScore = Math.round(Math.max(0, 100 - accruals * 300));

  let consistency;
  if (stk.eps_q1 && stk.eps_q2 && stk.eps_q3) {
    const qVals = [stk.eps_q1, stk.eps_q2, stk.eps_q3];
    const qMean = qVals.reduce((s: number, v: number) => s + v, 0) / 3;
    const qStd = Math.sqrt(qVals.reduce((s: number, v: number) => s + Math.pow(v - qMean, 2), 0) / 3);
    const qCv = qMean > 0 ? qStd / qMean : 1;
    consistency = Math.round(Math.max(20, Math.min(95, 90 - qCv * 120)));
  } else if (epsGrw > 0 && revGrw > 0) {
    const gap = Math.abs(epsGrw - revGrw);
    consistency = Math.round(Math.max(25, 90 - gap * 3));
  } else if (epsGrw > 0 && revGrw <= 0) consistency = 25;
  else if (epsGrw <= 0 && revGrw > 0) consistency = 40;
  else consistency = 20;

  const debtScore = Math.round(Math.min(90, Math.max(20, 90 - 65 * Math.tanh((debt - 0.15) / 0.25))));
  const divScore = divY > 4 ? 85 : divY > 2 ? 72 : divY > 0 ? 60 : epsGrw > 15 ? 58 : epsGrw > 5 ? 45 : 30;
  const peScore = Math.round(Math.min(85, Math.max(10, 85 - 65 * Math.tanh((pe - 18) / 22))));
  const composite = Math.round(accrualScore * 0.35 + consistency * 0.25 + debtScore * 0.20 + divScore * 0.10 + peScore * 0.10);
  return {
    composite,
    grade: composite >= 80 ? "A" : composite >= 65 ? "B" : composite >= 50 ? "C" : composite >= 35 ? "D" : "F",
    signal: composite >= 75 ? "أرباح عالية الجودة" : composite >= 60 ? "أرباح جيدة" : composite >= 45 ? "أرباح متوسطة" : "أرباح منخفضة الجودة",
    components: { accruals: accrualScore, consistency, debt: debtScore, dividend: divScore, pe: peScore }
  };
}

/**
 * Behavioral Pressure
 */
function calcBehavioralPressure(stk: any, bars: any[]): any {
  const n = bars.length;
  if (!n) return { pressureRatio: 1.0, sentiment: "محايد", signal: "محايد", unusualActivity: false, score: 50 };

  const momentum5 = bars.slice(-5).reduce((s: number, b: any) => s + (b.pct || 0), 0) / 5;
  const avgVol20 = bars.slice(-20).reduce((s: number, b: any) => s + (b.vol || 0), 0) / 20 || 1;
  const recentVol = bars.slice(-5).reduce((s: number, b: any) => s + (b.vol || 0), 0) / 5;
  const volRatio = recentVol / avgVol20;
  const vol30pct = bars.slice(-30).reduce((s: number, b: any) => s + Math.abs(b.pct || 0), 0) / 30;
  const iv = +(vol30pct * 14 + 8).toFixed(1);

  let pressureBase = 1.0;
  if (momentum5 > 3) pressureBase -= 0.15;
  else if (momentum5 > 1) pressureBase -= 0.08;
  else if (momentum5 < -3) pressureBase += 0.20;
  else if (momentum5 < -1) pressureBase += 0.10;

  if (volRatio > 2.5 && (stk.ch || 0) > 0) pressureBase -= 0.15;
  else if (volRatio > 1.5 && (stk.ch || 0) > 0) pressureBase -= 0.08;
  else if (volRatio > 2.0 && (stk.ch || 0) < -3) pressureBase += 0.20;

  if (stk.roe > 20) pressureBase -= 0.08;
  else if (stk.roe < 5) pressureBase += 0.12;

  if (stk.sec === "المواد الأساسية" && (stk.ch || 0) < 0) pressureBase += 0.10;

  const pressureRatio = +Math.min(2.0, Math.max(0.3, pressureBase)).toFixed(2);
  const unusualActivity = volRatio > 1.8 && Math.abs(stk.ch || 0) > 2.0;
  const sentiment = pressureRatio < 0.6 ? "صعودي قوي" : pressureRatio < 0.8 ? "صعودي" : pressureRatio < 1.1 ? "محايد" : pressureRatio < 1.4 ? "هبوطي" : "هبوطي قوي";
  const pressureScore = Math.round(Math.min(100, Math.max(0, 80 - (pressureRatio - 0.7) * 60 + (unusualActivity && (stk.ch || 0) > 0 ? 10 : 0))));

  return {
    pressureRatio, realizedVol: iv,
    unusualActivity, sentiment, score: pressureScore,
    signal: unusualActivity && pressureRatio < 0.8 ? "نشاط استثنائي صعودي" : unusualActivity && pressureRatio > 1.3 ? "نشاط استثنائي هبوطي" : sentiment
  };
}

/**
 * Insider Transactions
 */
function calcInsiderTransactions(stk: any, bars: any[]): any {
  const n = bars ? bars.length : 0;
  const avgVol60 = n > 0 ? bars.reduce((s: number, b: any) => s + (b.vol || 0), 0) / n : stk.avgV || 1800000;
  const recentVol = n >= 5 ? bars.slice(-5).reduce((s: number, b: any) => s + (b.vol || 0), 0) / 5 : avgVol60;
  const volRatio = recentVol / avgVol60;
  const priceMove = n >= 10 ? (bars[n - 1].c - bars[n - 10].c) / bars[n - 10].c * 100 : (stk.ch || 0);
  const valueDip = stk.pe > 0 && stk.pe < 15 ? 1 : 0;
  const quietAccum = volRatio < 0.9 && priceMove < 0;
  const fundStrong = stk.roe > 15 && stk.debt < 0.35;
  const nearLow = n >= 60 ? bars[n - 1].c <= Math.min(...bars.slice(-60).map((b: any) => b.lo)) * 1.05 : false;
  const highValuation = stk.pe > 25;
  const highPrice = n >= 60 ? bars[n - 1].c >= Math.max(...bars.slice(-60).map((b: any) => b.hi)) * 0.95 : false;
  const peaking = volRatio > 1.4 && priceMove > 5;
  let buySignals = (valueDip ? 15 : 0) + (quietAccum ? 20 : 0) + (fundStrong ? 10 : 0) + (nearLow ? 25 : 0);
  let sellSignals = (highValuation ? 15 : 0) + (highPrice ? 20 : 0) + (peaking ? 15 : 0);
  if (stk.epsGrw > 10) buySignals += 15;
  else if (stk.epsGrw < 0) sellSignals += 15;
  const netScore = Math.min(95, Math.max(5, 50 + buySignals - sellSignals));
  const isBuyDom = netScore >= 50;
  const netBuy = (netScore - 50) * (stk.mktCap || 0) * 1e6 * 0.0001;
  const signal = netScore >= 75 ? "تراكم داخلي قوي" : netScore >= 60 ? "شراء داخلي معتدل" : netScore <= 25 ? "تصريف داخلي" : netScore <= 40 ? "بيع داخلي معتدل" : "محايد";
  return {
    transactions: [] as any[],
    netBuy,
    buyValue: isBuyDom ? Math.abs(netBuy) : 0,
    sellValue: isBuyDom ? 0 : Math.abs(netBuy),
    signal,
    sentColor: isBuyDom ? "#10c97e" : "#f04f5a",
    score: netScore
  };
}

/**
 * Alternative Data
 * 🔧 تعديل: يأخذ allStocks
 */
function calcAlternativeData(stk: any, bars: any[], allStocks: any[]): any {
  allStocks = allStocks || [];
  const sectorStocks = allStocks.filter((x: any) => x.sec === stk.sec);
  const sectorAvgCh = sectorStocks.length > 0
    ? sectorStocks.reduce((s: number, x: any) => s + (x.ch || 0), 0) / sectorStocks.length
    : 0;
  const sectorMom = Math.round(50 + 35 * Math.tanh(sectorAvgCh * 0.8));
  let commodityScore = 50;
  if (stk.sec === "الطاقة" || stk.sec === "المواد الأساسية") {
    commodityScore = Math.round(50 + 30 * Math.tanh((MACRO.oilPrice - 80) / 20));
  } else if (stk.sec === "البنوك") {
    commodityScore = MACRO.saudiRepoRate > 4 ? 72 : 55;
  } else if (stk.sec === "إنتاج الأغذية") {
    commodityScore = MACRO.cpi < 2 ? 70 : MACRO.cpi < 4 ? 55 : 38;
  }
  const relPerf = (stk.ch || 0) - sectorAvgCh;
  const competitorScore = Math.round(50 + 35 * Math.tanh(relPerf * 0.6));
  const n = bars ? bars.length : 0;
  let volStab = 50;
  if (n >= 20) {
    const vols = bars.slice(-20).map((b: any) => b.vol || 0);
    const avgV = vols.reduce((s: number, v: number) => s + v, 0) / 20;
    const varV = vols.reduce((s: number, v: number) => s + Math.pow(v - avgV, 2), 0) / 20;
    const cvV = avgV > 0 ? Math.sqrt(varV) / avgV : 1;
    volStab = cvV < 0.3 ? 75 : cvV < 0.5 ? 60 : cvV < 0.8 ? 45 : 30;
  }
  const composite = Math.round(sectorMom * 0.30 + commodityScore * 0.30 + competitorScore * 0.25 + volStab * 0.15);
  return {
    composite,
    sentimentScore: sectorMom,
    searchTrend: competitorScore,
    socialScore: Math.round((sectorMom + competitorScore) / 2),
    supplyChain: volStab,
    signal: composite >= 70 ? "إشارة إيجابية" : composite >= 50 ? "محايد" : "إشارة سلبية",
    grade: composite >= 80 ? "A" : composite >= 60 ? "B" : composite >= 40 ? "C" : "D"
  };
}

/**
 * Risk Attribution
 * 🔧 تعديل: يأخذ allStocks
 */
function calcRiskAttribution(stk: any, bars: any[], allStocks: any[]): any {
  allStocks = allStocks || [];
  const volBars = bars.slice(-Math.min(bars.length, 100));
  const n = volBars.length || 1;
  const avgRet = volBars.reduce((s: number, b: any) => s + (b.pct || 0) / 100, 0) / n;
  const variance = volBars.reduce((s: number, b: any) => s + Math.pow((b.pct || 0) / 100 - avgRet, 2), 0) / n;
  const dailyVol = Math.sqrt(variance);
  const annVol = dailyVol * Math.sqrt(252);
  const volatility = +(dailyVol * 100).toFixed(2);
  const histReturn = Math.pow(1 + avgRet, 252) - 1;
  const rfRate = (MACRO.saudiRepoRate || 4.25) / 100;
  const sharpe = annVol > 0 ? +((histReturn - rfRate) / annVol).toFixed(2) : 0;
  const downVals = volBars.filter((b: any) => (b.pct || 0) < 0);
  const downVar = downVals.length > 0 ? downVals.reduce((s: number, b: any) => s + Math.pow((b.pct || 0) / 100, 2), 0) / n : variance;
  const downsideVol = Math.sqrt(downVar) * Math.sqrt(252);
  const sortino = downsideVol > 0 ? +((histReturn - rfRate) / downsideVol).toFixed(2) : 0;
  const mktRet = allStocks.length > 0
    ? allStocks.reduce((s: number, x: any) => s + (x.ch || 0) / 100, 0) / allStocks.length / 5
    : 0;
  const mktAvgDailyRet = mktRet;
  const mktAnnReturn = Math.pow(1 + mktAvgDailyRet, 252) - 1;
  const beta = stk.sector_beta || 1.0;
  const capmReturn = rfRate + beta * (mktAnnReturn - rfRate);
  const alpha = +(histReturn - capmReturn).toFixed(3);
  const riskLevel = dailyVol * 100 > 2.5 ? "مرتفع" : dailyVol * 100 > 1.2 ? "متوسط" : "منخفض";
  return {
    volatility, sharpe, sortino, alpha, riskLevel,
    beta: +beta.toFixed(2),
    annVol: +(annVol * 100).toFixed(1),
    histReturn: +(histReturn * 100).toFixed(1),
    signal: sortino > 2 ? "عائد/مخاطر ممتاز" : sharpe > 1.5 ? "عائد معدّل ممتاز" : sharpe > 0.5 ? "مقبول" : sharpe > 0 ? "عائد ضعيف" : "لا يعوّض المخاطرة"
  };
}

/**
 * Intermarket
 */
function calcIntermarket(stk: any): any {
  const m = MACRO;
  const oS = OIL_SENS[stk.sec] || 0.8;
  const oilDelta = (m.oilPrice - m.oilTarget) / m.oilTarget;
  const effectiveOilSens = stk.oilCorr ? (oS * 0.50 + stk.oilCorr * 0.50) : oS;
  const oilEffect = oilDelta * effectiveOilSens;
  const rr = m.saudiRepoRate - m.cpi;
  const rateBase = Math.round(10 + 8 * Math.tanh((rr - 1.5) / 1.5));
  const rateEffect = (rateBase - 10) / 10 * 0.05;
  const vixEffect = -0.12 * Math.tanh((m.vix - 20) / 8);
  const gdpEffect = 0.07 * Math.tanh((m.gdpGrowth - 2.5) / 2);
  const m2Effect = 0.05 * Math.tanh((m.m2Growth - 5) / 3);
  const multiplier = Math.min(1.20, Math.max(0.80, 1.0 + oilEffect + rateEffect + vixEffect + gdpEffect + m2Effect));
  return {
    multiplier: +multiplier.toFixed(3),
    score: Math.round((multiplier - 0.80) / 0.40 * 100),
    signal: multiplier >= 1.10 ? "بيئة كلية داعمة بقوة" : multiplier >= 1.03 ? "بيئة كلية داعمة" : multiplier >= 0.97 ? "محايد" : "ضاغطة"
  };
}

/**
 * Microstructure
 */
function calcMicrostructure(stk: any, bars: any[]): any {
  if (!bars || bars.length < 10) return null;
  let ofi = 0, totalVol = 0;
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i], prev = bars[i - 1];
    totalVol += (b.vol || 0);
    const dir = b.c > prev.c ? 1 : b.c < prev.c ? -1 : 0;
    const clv = (b.hi - b.lo) > 0 ? ((b.c - b.lo) - (b.hi - b.c)) / (b.hi - b.lo) : 0;
    ofi += dir * (b.vol || 0) * Math.abs(clv);
  }
  const ofiNorm = totalVol > 0 ? ofi / totalVol : 0;
  const alpha_ew = 2 / (6 + 1);
  let ewmaVol = bars[0].vol || 0;
  for (let j = 1; j < bars.length; j++) {
    ewmaVol = alpha_ew * (bars[j].vol || 0) + (1 - alpha_ew) * ewmaVol;
  }
  const recentVol = bars.slice(-3).reduce((s: number, b: any) => s + (b.vol || 0), 0) / 3;
  const volAccel = ewmaVol > 0 ? recentVol / ewmaVol : 1;
  const ofiScore = Math.round(Math.min(100, Math.max(0, 50 + ofiNorm * 50)));
  const accelScore = Math.round(Math.min(100, Math.max(0, 50 + Math.tanh((volAccel - 1) * 2) * 40)));
  const composite = Math.round(ofiScore * 0.55 + accelScore * 0.45);
  const multiplier = Math.min(1.15, Math.max(0.85, 1.0 + Math.tanh(ofiNorm * 3) * 0.10 + (volAccel > 1.3 ? 0.04 : 0)));
  return {
    composite,
    multiplier: +multiplier.toFixed(3),
    ofi: +ofiNorm.toFixed(3),
    volAccel: +volAccel.toFixed(2),
    signal: composite >= 70 && ofiNorm > 0.2 ? "تدفق شراء مؤسسي" : composite >= 70 ? "ضغط شراء" : composite >= 50 ? "متوازن" : "ضغط بيعي"
  };
}

// ════════════════════════════════════════════════════════════
//  دوال مساعدة لحساب الطبقات
// ════════════════════════════════════════════════════════════

function calcEMA(vs: number[], p: number): number {
  if (!vs.length) return 0;
  const k = 2 / (p + 1);
  let e = vs[0];
  for (let i = 1; i < vs.length; i++) e = vs[i] * k + e * (1 - k);
  return e;
}

function calcStoch(bars: any[], kP: number = 14): number {
  if (!bars || bars.length < kP) return 50;
  const slice = bars.slice(-kP);
  let highestHigh = -Infinity;
  let lowestLow = Infinity;
  for (const b of slice) {
    const h = b.hi || b.high || b.c;
    const l = b.lo || b.low || b.c;
    if (h > highestHigh) highestHigh = h;
    if (l < lowestLow) lowestLow = l;
  }
  const currentClose = bars[bars.length - 1].c;
  const range = highestHigh - lowestLow;
  if (range === 0) return 50;
  const k = ((currentClose - lowestLow) / range) * 100;
  return +Math.max(0, Math.min(100, k)).toFixed(2);
}

function calcSMA(bars: any[], period: number): number {
  if (!bars || bars.length < period) return bars && bars.length > 0 ? bars[bars.length - 1].c : 0;
  const slice = bars.slice(-period);
  const sum = slice.reduce((s: number, b: any) => s + b.c, 0);
  return +(sum / period).toFixed(4);
}

// نُسخ من Full functions في analysisEngine للاستخدام الداخلي
function calcOrderBlocksFull(bars: any[], atr: number): any {
  const obs: any[] = [];
  const cur = bars[bars.length - 1].close || bars[bars.length - 1].c;
  const n = bars.length;
  const recentVolatility = bars.length >= 20
    ? bars.slice(-20).reduce((s: number, b: any) => s + Math.abs(b.pct || 0), 0) / 20
    : 1.5;
  const atrMult = Math.max(1.2, Math.min(2.0, 1.5 * recentVolatility / 1.5));
  for (let i = 1; i < n - 2; i++) {
    const b = bars[i];
    const bClose = b.close || b.c;
    const bOpen = b.open || b.o;
    if (bClose < bOpen) {
      const imp = Math.max(
        bars[i + 1] ? (bars[i + 1].close || bars[i + 1].c) - bClose : 0,
        bars[i + 2] ? (bars[i + 2].close || bars[i + 2].c) - bClose : 0,
        bars[i + 3] && i + 3 < n ? (bars[i + 3].close || bars[i + 3].c) - bClose : 0
      );
      if (imp >= atr * atrMult) {
        const fresh = cur > b.lo, inOB = cur >= b.lo && cur <= b.hi;
        const inRef = cur >= b.lo && cur <= (b.hi + b.lo) / 2;
        const fvg = i + 2 < n && bars[i].hi < bars[i + 2].lo;
        obs.push({ type: "bull", hi: b.hi, lo: b.lo, mid: (b.hi + b.lo) / 2, strength: +(imp / atr).toFixed(2), fresh, inOB, inRef, fvg });
      }
    }
  }
  const bulls = obs.filter((o: any) => o.type === "bull" && o.fresh).sort((a: any, b: any) => (b.strength + (b.fvg ? 2 : 0)) - (a.strength + (a.fvg ? 2 : 0)));
  const best = bulls[0] || null;
  const inBullOB = !!(best && best.inOB), inRef = !!(best && best.inRef), hasFVG = !!(best && best.fvg);
  const strength = best ? best.strength : 0;
  const baseScore = bulls.length > 0
    ? Math.round(2 + 14 * Math.tanh(strength / 2.5) + (inRef ? 3 : inBullOB ? 1.5 : 0))
    : 2;
  const score = Math.round(Math.min(20, Math.max(2, baseScore + (hasFVG ? 2 : 0))));
  return {
    inBullOB, inRef, hasFVG,
    bullCount: bulls.length,
    score: Math.min(20, score),
    label: inRef ? "منطقة شراء قوية ✓" : inBullOB && hasFVG ? "منطقة شراء مع فجوة" : inBullOB ? "داخل منطقة شراء" : bulls.length > 0 ? "منطقة شراء متاحة" : "لا منطقة شراء"
  };
}

function calcLiqSweepFull(bars: any[], atr: number): any {
  const cur = bars[bars.length - 1].close || bars[bars.length - 1].c;
  const avgVol = bars.reduce((s: number, b: any) => s + (b.vol || 0), 0) / bars.length;
  const sweeps: any[] = [];
  const lb = Math.min(20, Math.max(10, Math.round(bars.length * 0.20)));
  for (let i = lb; i < bars.length - 1; i++) {
    const b = bars[i], win = bars.slice(i - lb, i);
    const pH = Math.max(...win.map((x: any) => x.hi));
    const pL = Math.min(...win.map((x: any) => x.lo));
    const volOk = b.vol > avgVol * 1.5;
    const nx = bars[i + 1];
    const bClose = b.close || b.c;
    if (b.hi > pH && bClose < pH && (b.hi - pH) >= atr * 0.5) {
      const conf = nx && (nx.close || nx.c) < (nx.open || nx.o);
      const eq = win.filter((x: any) => Math.abs(x.hi - pH) / pH < 0.0015).length >= 2;
      sweeps.push({ type: "BSL", q: (volOk ? 1 : 0) + (eq ? 1 : 0) + (conf ? 1 : 0) });
    }
    if (b.lo < pL && bClose > pL && (pL - b.lo) >= atr * 0.5) {
      const conf = nx && (nx.close || nx.c) > (nx.open || nx.o);
      const eq = win.filter((x: any) => Math.abs(x.lo - pL) / pL < 0.0015).length >= 2;
      sweeps.push({ type: "SSL", q: (volOk ? 1 : 0) + (eq ? 1 : 0) + (conf ? 1 : 0) });
    }
  }
  const ssls = sweeps.filter((s: any) => s.type === "SSL");
  const bsls = sweeps.filter((s: any) => s.type === "BSL");
  const bestSSL = ssls[ssls.length - 1];
  const recSSL = ssls.length > 0;
  const q = bestSSL ? (bestSSL.q || 0) : 0;
  let score = 3;
  if (recSSL) {
    score = Math.round(Math.min(20, Math.max(6, 6 + 10 * Math.tanh(q / 1.2) + Math.min(4, ssls.length * 0.8))));
  } else if (ssls.length > 0) {
    score = 5;
  }
  return {
    recoveredSSL: recSSL,
    sslCount: ssls.length,
    bslCount: bsls.length,
    sslQuality: q,
    score: Math.min(20, score),
    label: recSSL && q === 3 ? "اصطياد مثالي ✓✓✓" : recSSL && q === 2 ? "اصطياد قوي ✓✓" : recSSL ? "تعافٍ من الاصطياد" : ssls.length > 0 ? "اصطياد حديث" : "لا اصطياد"
  };
}

function calcIVWAP(bars: any[]): any {
  const cur = bars[bars.length - 1].close || bars[bars.length - 1].c;
  const vwM = calcVWAP(bars.slice(-20));
  const vwQ = calcVWAP(bars);
  const bars60 = bars.slice(-Math.min(bars.length, 60));
  const loIdx60 = bars60.reduce((mi: number, b: any, i: number) => b.lo < bars60[mi].lo ? i : mi, 0);
  const avwap = calcVWAP(bars60.slice(loIdx60));
  let sumVV = 0, sumV = 0;
  for (const b of bars) {
    const tp = (b.hi + b.lo + (b.close || b.c)) / 3;
    sumVV += (b.vol || 0) * Math.pow(tp - vwQ, 2);
    sumV += (b.vol || 0);
  }
  const std = sumV > 0 ? Math.sqrt(sumVV / sumV) : 0;
  const b1Lo = vwQ - std, b2Lo = vwQ - 2 * std;
  const aboveAVWAP = cur > avwap;
  const belowB1 = cur < b1Lo, belowB2 = cur < b2Lo;
  const vwapDev = std > 0 ? (cur - vwQ) / std : 0;
  const above3 = [calcVWAP(bars.slice(-5)), vwM, vwQ].filter((v: number) => cur > v).length;
  let score = 4;
  if (belowB2 && aboveAVWAP) score = 20;
  else if (belowB1 && aboveAVWAP) score = Math.round(14 + Math.tanh(-vwapDev) * 2);
  else if (above3 === 3) score = Math.round(6 - Math.tanh(vwapDev) * 2);
  else if (aboveAVWAP) score = Math.round(8 - Math.tanh(vwapDev));
  else score = Math.round(Math.max(2, 8 - Math.abs(vwapDev) * 2));
  return {
    vwapMonth: +vwM.toFixed(2),
    avwap: +avwap.toFixed(2),
    vwapDev: std > 0 ? +((cur - vwQ) / std).toFixed(2) : 0,
    aboveAVWAP, belowB1, belowB2, above3,
    score: Math.min(20, score),
    label: belowB2 && aboveAVWAP ? "تحت -2σ + فوق AVWAP ✓" : belowB1 ? "تحت VWAP -1σ" : above3 === 3 ? "فوق 3 VWAPs" : aboveAVWAP ? "فوق AVWAP" : "تحت AVWAP"
  };
}

// ════════════════════════════════════════════════════════════
//  Regime Detection و Dynamic Weighting
// ════════════════════════════════════════════════════════════

function detectMarketRegime(bars: any[], adxV: number, mktWtd: number, mktBreadth: number, atr: number, stk: any): any {
  const n = bars.length || 1;
  const atrPct = atr / (bars[n - 1].c || 1) * 100;
  const ret5 = bars.length >= 5 ? bars.slice(-5).reduce((s: number, b: any) => s + (b.pct || 0), 0) / 5 : 0;
  const recentAtrPct = bars.length >= 5
    ? bars.slice(-5).reduce((s: number, b: any) => s + Math.abs(b.pct || 0), 0) / 5
    : Math.abs(stk.ch || 0);
  const historicAtrPct = bars.length >= 20
    ? bars.slice(-20).reduce((s: number, b: any) => s + Math.abs(b.pct || 0), 0) / 20
    : recentAtrPct;
  const volSpike = historicAtrPct > 0 ? recentAtrPct / historicAtrPct : 1;
  const isSideways = adxV < 20 && atrPct < 1.2;
  const isVolatile = volSpike > 1.8 || atrPct > 2.5;
  const avgVol = bars.reduce((s: number, b: any) => s + (b.vol || 0), 0) / n;
  const vol5 = bars.length >= 5 ? bars.slice(-5).reduce((s: number, b: any) => s + (b.vol || 0), 0) / 5 : avgVol;
  const volRatio = avgVol > 0 ? vol5 / avgVol : 1;
  const isNewsdriven = MACRO.vix > 28 && volRatio > 1.6;
  const isTrending = adxV > 28 && Math.abs(mktWtd) > 0.25;
  const isBullish = isTrending && mktWtd > 0 && mktBreadth > 0.55;
  const isBearish = isTrending && mktWtd < 0 && mktBreadth < 0.45;
  let regime;
  if (isVolatile) regime = "volatile";
  else if (isNewsdriven) regime = "news-driven";
  else if (isSideways) regime = "sideways";
  else if (isBullish) regime = "bull";
  else if (isBearish) regime = "bear";
  else regime = "chop";
  return { regime, atrPct: +atrPct.toFixed(2), volSpike: +volSpike.toFixed(2), ret5: +ret5.toFixed(3), volRatio: +volRatio.toFixed(2) };
}

function buildDynamicWeights(regime: string, sector: string): any {
  // 🆕 إن وُجد override من Strategy Lab، نستعمله مباشرة
  if (WEIGHTS_OVERRIDE) {
    const w: any = {};
    const keys = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'];
    let total = 0;
    keys.forEach(k => {
      w[k] = WEIGHTS_OVERRIDE[k] || 0.111;
      total += w[k];
    });
    if (total > 0) {
      keys.forEach(k => {
        w[k] = +(w[k] / total).toFixed(4);
      });
    }
    return w;
  }
  
  const BASE: any = {
    L9: 0.20, L1: 0.20, L5: 0.20,
    L4: 0.15, L8: 0.15,
    L7: 0.06, L6: 0.04, L2: 0.02, L3: 0.02
  };
  const DELTA: any = {
    bull: { L5: +.05, L1: +.03, L4: +.02, L9: +.01, L8: -.02, L7: -.03, L6: -.02, L2: -.02, L3: -.02 },
    bear: { L9: +.06, L7: +.03, L8: +.02, L1: +.01, L5: -.05, L4: -.03, L6: -.02, L2: -.01, L3: -.01 },
    sideways: { L7: +.05, L8: +.04, L9: +.02, L1: -.03, L5: -.05, L4: -.02, L6: +.01, L2: -.01, L3: -.01 },
    volatile: { L9: +.06, L8: +.04, L7: +.02, L5: -.05, L1: -.04, L4: -.02, L6: -.01, L2: 0, L3: 0 },
    "news-driven": { L8: +.06, L9: +.03, L7: +.02, L5: -.04, L1: -.03, L4: -.02, L6: -.01, L2: -.01, L3: 0 },
    chop: { L7: +.04, L8: +.03, L9: +.02, L5: -.03, L1: -.03, L4: -.02, L6: 0, L2: -.01, L3: 0 },
  };
  const SECTOR_D: any = {
    "الطاقة": { L9: +.04, L8: +.03, L1: +.01, L5: -.03, L4: -.02, L7: -.02, L6: -.01 },
    "المواد الأساسية": { L9: +.03, L8: +.03, L1: +.01, L5: -.02, L4: -.02, L7: -.02, L6: -.01 },
    "البنوك": { L8: +.03, L7: +.03, L5: +.01, L9: -.02, L1: -.02, L4: -.01, L6: -.01, L2: -.01 },
    "التطبيقات وخدمات التقنية": { L5: +.03, L1: +.03, L4: +.01, L9: -.02, L8: -.02, L7: -.01, L6: -.01, L2: -.01 },
    "إنتاج الأغذية": { L8: +.03, L7: +.02, L9: +.01, L5: -.02, L1: -.02, L4: -.01, L6: -.01 },
    "التأمين": { L8: +.03, L7: +.02, L9: +.01, L5: -.02, L1: -.02, L4: -.01, L6: -.01 },
  };
  const W: any = { ...BASE };
  const rd = DELTA[regime] || DELTA.chop;
  const sd = SECTOR_D[sector] || {};
  ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'].forEach(k => {
    W[k] = (BASE[k] || 0) + (rd[k] || 0) * 0.70 + (sd[k] || 0) * 0.30;
    W[k] = Math.max(0.01, W[k]);
  });
  const total = (Object.values(W) as number[]).reduce((s: number, v: number) => s + v, 0);
  ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'].forEach(k => {
    W[k] = +(W[k] / total).toFixed(4);
  });
  return W;
}

function reduceCorrelation(layers: any): any {
  const { L1, L2, L4, L5, L7, L9 } = layers;
  const W_corr: any = { L1: 1, L2: 1, L3: 1, L4: 1, L5: 1, L6: 1, L7: 1, L8: 1, L9: 1 };
  if (L1 !== undefined && L4 !== undefined && Math.abs(L1 - L4) < 15) W_corr.L4 = 0.75;
  if (L5 !== undefined && L2 !== undefined && Math.abs(L5 - L2) < 15) W_corr.L2 = 0.70;
  if (L9 !== undefined && L2 !== undefined) {
    if ((L9 > 65 && L2 > 65) || (L9 < 40 && L2 < 40)) W_corr.L2 = Math.min(W_corr.L2, 0.65);
  }
  if (L1 !== undefined && L5 !== undefined && Math.abs(L1 - L5) < 12) W_corr.L5 = 0.90;
  if (L7 !== undefined && L9 !== undefined) {
    if ((L7 > 65 && L9 > 65) || (L7 < 40 && L9 < 40)) W_corr.L7 = 0.92;
  }
  return W_corr;
}

function calcConflictPenalty(layers: any, regime: string): any {
  const { L1, L4, L5, L7, L9 } = layers;
  const conflicts = [
    { active: L1 > 75 && L5 < 30, severity: 3 },
    { active: L9 > 75 && L1 < 30, severity: 3 },
    { active: L5 > 75 && L9 < 30, severity: 2 },
    { active: L7 > 75 && L9 < 35, severity: 2 },
    { active: L4 > 70 && L1 < 30, severity: 1 },
  ];
  const active = conflicts.filter(c => c.active);
  if (!active.length) return { penalty: 0, conflictCount: 0, details: [] as any[] };
  let penalty = 0;
  active.forEach((c, i) => { penalty += c.severity * 3 * (1 + i * 0.5); });
  if (regime === "volatile") penalty *= 1.3;
  if (regime === "news-driven") penalty *= 1.2;
  return {
    penalty: Math.round(_clamp(penalty, 0, 25)),
    conflictCount: active.length,
    details: [] as any[]
  };
}

// ════════════════════════════════════════════════════════════
//  analyzeStockRadar - للرادار SMC
// ════════════════════════════════════════════════════════════

function analyzeStockRadar(stk: any, pastBars?: any[]): any {
  const bars = (pastBars && pastBars.length >= 15)
    ? pastBars.map((b: any) => {
        const _c = b.c ?? b.close;
        const _o = b.o ?? b.open ?? _c;
        return { o: _o, open: _o, c: _c, close: _c, hi: b.hi, lo: b.lo, vol: b.vol, pct: b.pct };
      })
    : [];

  if (bars.length < 15) {
    return {
      stk, total: 50, scoreCol: "#06b6d4", cats: [{ l: "بيانات غير كافية", c: "#6b7280" }],
      target: stk.p, stop: stk.p, atrPct: 1.5,
      ms: { score: 5 }, ob: { score: 2 }, ls: { score: 3 }, vi: { score: 4 }, mc: { score: 10 },
      trend: { bull: false, maCount: 0, adxP: 25, score: 5 },
      mom: { rsi: 50, macd: false, stoch: 50, oversold: false, overbought: false, score: 5 },
      liq: { obv: "محايد", cmf: 0, rvNorm: 1, smDetected: false, score: 3 },
      val: { peR: 1, ey: 8, vwapD: 0, score: 2 },
      pfl: 50,
      factors: [
        { k: "ms", l: "هيكل السوق", max: 15, s: 5, c: "#a3e635" },
        { k: "ob", l: "Order Blocks", max: 15, s: 2, c: "#22d3ee" },
        { k: "ls", l: "Liquidity", max: 10, s: 3, c: "#fb923c" },
        { k: "vi", l: "VWAP مؤسسي", max: 10, s: 4, c: "#4d9fff" },
        { k: "tr", l: "الاتجاه", max: 15, s: 5, c: "#4d9fff" },
        { k: "mo", l: "الزخم", max: 15, s: 5, c: "#1ee68a" },
        { k: "lq", l: "السيولة", max: 10, s: 3, c: "#a78bfa" },
        { k: "va", l: "التقييم", max: 5, s: 2, c: "#34d399" },
        { k: "mc", l: "الاقتصاد كلي", max: 5, s: 2, c: "#f0c050" },
      ],
    };
  }

  const p = bars[bars.length - 1].close;
  const hi52 = stk.hi || p * 1.2, lo52 = stk.lo || p * 0.8;
  const range52 = hi52 - lo52;
  const pfl = range52 > 0 ? (p - lo52) / range52 * 100 : 50;

  const rsi = calcRSI(bars, 14);
  const atr = calcATR(bars, 14);
  const atrPct = p > 0 ? atr / p * 100 : 2;
  const vwap = calcVWAP(bars);
  const cmf = calcCMF(bars, 20);
  const obv = calcOBV(bars);
  const macd = calcMACD(bars);
  const stoch = calcStoch(bars, 14);
  const sma20 = calcSMA(bars, 20);
  const sma50 = calcSMA(bars, 50);
  const rvNorm = ((stk.v + (stk.avgVol || stk.v)) / 2) / (stk.avgVol || stk.v || 1);

  const ms = calcMarketStructure(bars);
  const ob = calcOrderBlocksFull(bars, atr);
  const ls = calcLiqSweepFull(bars, atr);
  const vi = calcIVWAP(bars);
  const mc = calcMacroScore(stk);

  const msScore = Math.min(15, Math.round(ms.score * 15 / 20));
  const obScore = Math.min(15, Math.round(ob.score * 15 / 20));
  const lsScore = Math.min(10, Math.round(ls.score * 10 / 20));
  const viScore = Math.min(10, Math.round(vi.score * 10 / 20));

  const aboveSMA20 = p > sma20, aboveSMA50 = p > sma50;
  const ma200p = lo52 + range52 * 0.4;
  const aboveMA200 = p > ma200p;
  const maCount = (aboveSMA20 ? 1 : 0) + (aboveSMA50 ? 1 : 0) + (aboveMA200 ? 1 : 0);
  let plusDM = 0, minusDM = 0, atrS = 0;
  for (let i = 1; i < bars.length; i++) {
    plusDM += Math.max(bars[i].hi - bars[i - 1].hi, 0);
    minusDM += Math.max(bars[i - 1].lo - bars[i].lo, 0);
    atrS += Math.max(bars[i].hi - bars[i].lo, Math.abs(bars[i].hi - bars[i - 1].close), Math.abs(bars[i].lo - bars[i - 1].close));
  }
  const atrAvg = atrS / (bars.length - 1) || 1;
  const plusDI = plusDM / atrAvg * 100, minusDI = minusDM / atrAvg * 100;
  const adxP = plusDI + minusDI > 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 25;
  const trScore = Math.min(15,
    (maCount === 3 ? 7 : maCount === 2 ? 5 : maCount === 1 ? 2 : 0) +
    (rsi > 55 && rsi < 75 ? 5 : rsi > 50 ? 3 : rsi >= 75 ? 1 : 0) +
    (adxP > 40 ? 3 : adxP > 25 ? 2 : 1));
  const trendBull = maCount >= 2 && (stk.pct || 0) > 0;

  const rsiMomScore = rsi < 30 ? 13 : rsi < 45 ? 11 : rsi < 60 ? 9 : rsi < 75 ? 5 : 2;
  const moScore = Math.min(15,
    rsiMomScore +
    ((macd as any).bull && (macd as any).hist > 0 ? 4 : (macd as any).bull ? 2 : 0) +
    (stoch < 20 ? 3 : stoch < 40 ? 1 : 0));
  const oversold = rsi < 35, overbought = rsi > 70;

  const obvS = (obv as any).signal === "تأكيد صعود" ? 4 : (obv as any).signal === "تباعد إيجابي" ? 3 : (obv as any).signal === "محايد" ? 1 : 0;
  const cmfS = cmf > 0.15 ? 3 : cmf > 0.05 ? 2 : cmf > 0 ? 1 : 0;
  const volS = rvNorm > 2 && (stk.pct || 0) > 0 ? 3 : rvNorm > 1.5 && (stk.pct || 0) > 0 ? 2 : rvNorm > 1.2 ? 1 : 0;
  const lqScore = Math.min(10, obvS + cmfS + volS);
  const smDetected = (rvNorm > 2 && (stk.pct || 0) > 0) || (rvNorm > 1.5 && cmf > 0.05);

  const secPE = RADAR_SECTOR_PE[stk.sec] || 15.5;
  // ✨ لا نمنح نقاط تقييم بلا بيانات أساسية -- null يعني "غير متاح" لا "رخيص"
  const peR = (stk.pe != null && stk.pe > 0) ? stk.pe / secPE : null;
  const ey = (stk.roe != null) ? (stk.pb > 0 ? stk.roe / stk.pb : stk.roe) : null;
  const vwapD2 = vwap > 0 ? (p - vwap) / vwap * 100 : 0;
  const vaScore = Math.min(5,
    (peR != null ? (peR < 0.75 ? 2 : peR < 0.90 ? 1 : 0) : 0) +
    (ey != null ? (ey > 0.10 ? 2 : ey > 0.08 ? 1 : 0) : 0) +
    (vwapD2 < -2 ? 1 : 0));

  const mcScore = Math.min(5, Math.round(mc.score * 5 / 20));

  const total = Math.min(100, Math.max(5, msScore + obScore + lsScore + viScore + trScore + moScore + lqScore + vaScore + mcScore));
  const scoreCol = total >= 85 ? "#1ee68a" : total >= 70 ? "#4d9fff" : total >= 55 ? "#f0c050" : "#ff5f6a";

  const cats: any[] = [];
  if (ms.bosBull) cats.push({ l: "BOS صاعد", c: "#1ee68a" });
  if (ob.inBullOB) cats.push({ l: "Order Block", c: "#22d3ee" });
  if (ls.recoveredSSL) cats.push({ l: "SSL انتعاش", c: "#a3e635" });
  if (smDetected) cats.push({ l: "سيولة مؤسسية", c: "#a78bfa" });
  if (oversold) cats.push({ l: "تشبع بيع", c: "#f0c050" });
  if (!cats.length) cats.push({ l: "مراقبة", c: "#8a90a8" });

  const target = +(p + 2.5 * atr).toFixed(2);
  const stop = +(p - 1.5 * atr).toFixed(2);

  return {
    stk, total, scoreCol, cats, target, stop, atrPct: +atrPct.toFixed(2),
    ms, ob, ls, vi, mc,
    trend: { bull: trendBull, maCount, adxP: +adxP.toFixed(0), score: trScore },
    mom: { rsi, macd: (macd as any).bull, stoch, oversold, overbought, score: moScore },
    liq: { obv: (obv as any).signal, cmf: +cmf.toFixed(3), rvNorm: +rvNorm.toFixed(2), smDetected, score: lqScore },
    val: { peR: peR != null ? +peR.toFixed(2) : null, ey: ey != null ? +(ey * 100).toFixed(1) : null, vwapD: +vwapD2.toFixed(1), score: vaScore },
    pfl: +pfl.toFixed(0),
    factors: [
      { k: "ms", l: "هيكل السوق", max: 15, s: msScore, c: "#a3e635" },
      { k: "ob", l: "Order Blocks", max: 15, s: obScore, c: "#22d3ee" },
      { k: "ls", l: "Liquidity", max: 10, s: lsScore, c: "#fb923c" },
      { k: "vi", l: "VWAP مؤسسي", max: 10, s: viScore, c: "#4d9fff" },
      { k: "tr", l: "الاتجاه", max: 15, s: trScore, c: "#4d9fff" },
      { k: "mo", l: "الزخم", max: 15, s: moScore, c: "#1ee68a" },
      { k: "lq", l: "السيولة", max: 10, s: lqScore, c: "#a78bfa" },
      { k: "va", l: "التقييم", max: 5, s: vaScore, c: "#34d399" },
      { k: "mc", l: "الاقتصاد كلي", max: 5, s: mcScore, c: "#f0c050" },
    ],
  };
}

// ════════════════════════════════════════════════════════════
//  calc9Layers - الدالة الكبرى مع allStocks مُمرّرة
// ════════════════════════════════════════════════════════════

function calc9Layers(stk: any, bars: any[], allStocks: any[]): any {
  if (!stk || typeof stk !== 'object') return _emptyHealthResult();
  if (!bars || !Array.isArray(bars) || bars.length < 5) return _emptyHealthResult();
  allStocks = allStocks || [];

  const last5 = bars.slice(-5);
  const last10 = bars.slice(-10);
  const last20 = bars.slice(-20);

  const rBars = bars.map((b: any) => ({
    o: b.o || b.c, open: b.o || b.c,
    hi: b.hi, high: b.hi,
    lo: b.lo, low: b.lo,
    c: b.c, close: b.c,
    vol: b.vol, pct: b.pct
  }));

  const avgVol = bars.reduce((s: number, b: any) => s + (b.vol || 0), 0) / bars.length;
  const vol5 = last5.reduce((s: number, b: any) => s + (b.vol || 0), 0) / 5;
  const vr = vol5 / (avgVol || 1);

  const atr = calcATR(rBars, 14) || stk.p * 0.015;
  const rsiV = calcRSI(rBars, 14);
  const cmf = calcCMF(rBars, 20);
  const obv = calcOBV(rBars);
  const ms = calcMarketStructure(rBars);
  const ob = calcOrderBlocksFull(rBars, atr);
  const ls = calcLiqSweepFull(rBars, atr);
  const vi = calcIVWAP(rBars);
  const mc = calcMacroFull(stk);
  const tc_tasi = calcTasiContext(stk, bars, allStocks);

  const radar = analyzeStockRadar(stk, rBars);
  const radarMS = radar.factors.find((f: any) => f.k === "ms")?.s || 0;
  const radarOB = radar.factors.find((f: any) => f.k === "ob")?.s || 0;
  const radarLS = radar.factors.find((f: any) => f.k === "ls")?.s || 0;
  const radarVI = radar.factors.find((f: any) => f.k === "vi")?.s || 0;
  const radarTR = radar.factors.find((f: any) => f.k === "tr")?.s || 0;
  const radarMO = radar.factors.find((f: any) => f.k === "mo")?.s || 0;
  const radarLQ = radar.factors.find((f: any) => f.k === "lq")?.s || 0;
  const radarVA = radar.factors.find((f: any) => f.k === "va")?.s || 0;
  const radarMC = radar.factors.find((f: any) => f.k === "mc")?.s || 0;

  const cls = rBars.map((b: any) => b.close);
  const e12 = calcEMA(cls, 12), e26 = calcEMA(cls, 26);
  const macdH = e12 - e26;
  const macdBull = macdH > 0;

  // ADX
  const _adxP = 14;
  let _smTR = 0, _smPDM = 0, _smMDM = 0;
  for (let i = 1; i <= Math.min(_adxP, bars.length - 1); i++) {
    const b = bars[i], pv = bars[i - 1];
    _smTR += Math.max(b.hi - b.lo, Math.abs(b.hi - pv.c), Math.abs(b.lo - pv.c));
    _smPDM += Math.max(0, b.hi - pv.hi);
    _smMDM += Math.max(0, pv.lo - b.lo);
  }
  for (let i = _adxP + 1; i < bars.length; i++) {
    const b = bars[i], pv = bars[i - 1];
    _smTR = _smTR - _smTR / _adxP + Math.max(b.hi - b.lo, Math.abs(b.hi - pv.c), Math.abs(b.lo - pv.c));
    _smPDM = _smPDM - _smPDM / _adxP + Math.max(0, b.hi - pv.hi);
    _smMDM = _smMDM - _smMDM / _adxP + Math.max(0, pv.lo - b.lo);
  }
  const plusDI = _smTR > 0 ? _smPDM / _smTR * 100 : 0;
  const minusDI = _smTR > 0 ? _smMDM / _smTR * 100 : 0;
  const dx = plusDI + minusDI > 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
  const adxV = Math.round(Math.min(100, dx));
  const adxBull = plusDI > minusDI;

  // ═══ L1: هيكل السوق + Wyckoff + OB
  const recentHigh = Math.max(...last10.map((b: any) => b.hi));
  const recentLow = Math.min(...last10.map((b: any) => b.lo));
  const range60Low = bars.length >= 60 ? Math.min(...bars.slice(-60).map((b: any) => b.lo)) : recentLow;
  const range60High = bars.length >= 60 ? Math.max(...bars.slice(-60).map((b: any) => b.hi)) : recentHigh;
  const spring = last5.some((b: any) => b.lo <= recentLow * 1.005 && b.c > b.o && b.vol > avgVol * 1.2);
  const sos = last5.filter((b: any) => b.pct > 0.8 && b.vol > avgVol * 1.4).length >= 2;
  const pricePos60 = (bars[bars.length - 1].c - range60Low) / (range60High - range60Low + 0.001);
  let wyScore = Math.round(50 + 40 * Math.tanh((pricePos60 - 0.5) * 3));
  let wyAdj = (spring && sos) ? +20 : sos ? +12 : spring ? +10 : 0;
  wyScore = Math.min(95, Math.max(10, wyScore + wyAdj));
  const msBonus = ms.bos && ms.bosBull ? 15 : ms.trend === "صاعد" ? 10 : 0;
  const obBonus = ob.inRef ? 15 : ob.inBullOB ? 10 : ob.bullCount > 0 ? 5 : 0;
  const radarL1Bonus = Math.round((radarMS / 15) * 8 + (radarOB / 15) * 6 + (radarLS / 10) * 4);
  const L1 = Math.min(85, Math.max(0, Math.round(
    wyScore * 0.38 + msBonus * (25 / 15) + obBonus * (20 / 15) + radarL1Bonus * 0.3
  )));

  // ═══ L2: Effort/Result + OBV
  let harm = 0, div = 0;
  last10.forEach((b: any) => {
    const er = b.vol / avgVol, mv = Math.abs(b.pct || 0);
    if (er > 1.3 && mv > 0.5) harm++;
    else if (er > 1.4 && mv < 0.2) div++;
  });
  const obvBonus = obv.rising ? 10 : -5;
  const radarL2Bonus = Math.round((radarMO / 15) * 20 - 10);
  const L2 = Math.round(Math.min(100, Math.max(0, 50 + harm * 9 - div * 12 + obvBonus + radarL2Bonus * 0.25)));

  // ═══ L3: Entropy
  const last20pcts = last20.slice(1).map((b: any, i: number, arr: any[]) => {
    const dir = b.c - last20[i].c > 0 ? 1 : -1;
    const recencyW = 1 + i / arr.length;
    return dir * Math.abs(b.pct || 0) * recencyW * ((b.vol || 1) / (avgVol || 1));
  });
  const totalAbsMag = last20pcts.reduce((s: number, p: number) => s + Math.abs(p), 0) || 1;
  const pUpW = last20pcts.filter((p: number) => p > 0).reduce((s: number, p: number) => s + p, 0) / totalAbsMag;
  const pDnW = Math.max(0.001, 1 - Math.max(0.001, pUpW));
  const pUpC = Math.max(0.001, pUpW);
  const entr = -(pUpC * Math.log2(pUpC) + pDnW * Math.log2(pDnW));
  const dirSign = pUpW > 0.5 ? 1 : -1;
  const L3 = Math.round(Math.min(100, Math.max(0, 50 + dirSign * (1 - entr) * 65)));

  // ═══ L4: القوة النسبية مع allStocks
  const mktWtdSum = allStocks.reduce((s: number, x: any) => s + (x.ch || 0) * (x.mktCap || 50), 0);
  const mktWtdDen = allStocks.reduce((s: number, x: any) => s + (x.mktCap || 50), 0);
  const mktWtd = mktWtdDen > 0 ? mktWtdSum / mktWtdDen : 0;
  const rscRaw = (stk.ch || 0) - mktWtd;
  const mktVarSum = allStocks.reduce((s: number, x: any) => s + Math.pow((x.ch || 0) - mktWtd, 2), 0);
  const mktVar = allStocks.length > 0 ? mktVarSum / allStocks.length : 0;
  const rscZ = mktVar > 0 ? rscRaw / Math.sqrt(mktVar) : 0;
  const rscScore = Math.round(Math.min(100, Math.max(0, 50 + rscZ * 18)));
  const vwapScore = Math.round(vi.score / 20 * 100);
  const sectorPeers = allStocks.filter((x: any) => x.sec === stk.sec && x.sym !== stk.sym);
  const sectorAvgCh = sectorPeers.length > 0
    ? sectorPeers.reduce((s: number, x: any) => s + (x.ch || 0), 0) / sectorPeers.length
    : mktWtd;
  const sectorRel = (stk.ch || 0) - sectorAvgCh;
  const sectorScore = Math.round(Math.min(100, Math.max(0, 50 + sectorRel * 8)));
  const _L4raw = Math.round(_clamp(rscScore * 0.50 + vwapScore * 0.30 + sectorScore * 0.20 + tc_tasi.pifBoost, 0, 100));
  const L4 = Math.min(100, Math.max(0, _L4raw + Math.round((radarVI / 10 * 100 - 50) * 0.2)));

  // ═══ L5: RSI + MACD + ADX
  let rsiScore;
  if (rsiV < 30) rsiScore = Math.round(68 - (30 - rsiV) * 0.35);
  else if (rsiV <= 50) rsiScore = Math.round(67 - (rsiV - 30) * 0.85 * (17 / 20));
  else if (rsiV <= 75) rsiScore = Math.round(50 + (rsiV - 50) * 1.35 * (35 / 25));
  else rsiScore = Math.round(85 - (rsiV - 75) * 1.50);
  rsiScore = Math.min(90, Math.max(10, rsiScore));
  const macdMag = Math.abs(macdH) / (bars[bars.length - 1].c * 0.001 + 0.001);
  const macdScore = macdBull
    ? Math.round(Math.min(90, 52 + 38 * Math.tanh(macdMag / 3)))
    : Math.round(Math.max(12, 48 - 36 * Math.tanh(macdMag / 3)));
  const adxScore = adxV > 25
    ? (adxBull ? Math.round(50 + adxV * 0.40) : Math.round(50 - adxV * 0.35))
    : Math.round(50 - (25 - adxV) * 1.2);
  const _L5raw = Math.round(Math.min(100, Math.max(0, rsiScore * 0.40 + macdScore * 0.35 + adxScore * 0.25)));
  const stochV = calcStoch(rBars, 14);
  const sma20v = calcSMA(rBars, 20), sma50v = calcSMA(rBars, 50);
  const smaBonus = (stk.p > sma20v && stk.p > sma50v) ? 4 : (stk.p > sma20v || stk.p > sma50v) ? 2 : -2;
  const stochBonus = stochV < 20 ? 5 : stochV < 35 ? 3 : stochV > 80 ? -5 : 0;
  const L5 = Math.min(100, Math.max(0, _L5raw + Math.round((radarTR / 15 * 100 - 50) * 0.2) + smaBonus + stochBonus));

  // ═══ L6: Kelly + Macro
  const kellyBars = bars.slice(-Math.min(bars.length, 100));
  const wrRecent = bars.length >= 20 ? kellyBars.slice(-20).filter((b: any) => (b.pct || 0) > 0).length / Math.min(20, kellyBars.length) : 0.5;
  const histWinRate = wrRecent;
  const p_adj = Math.min(0.85, Math.max(0.15, histWinRate + (vr > 1.3 ? 0.10 : 0) + (mc.score > 14 ? 0.08 : 0)));
  const wins_b = kellyBars.filter((b: any) => (b.pct || 0) > 0);
  const losses_b = kellyBars.filter((b: any) => (b.pct || 0) <= 0);
  const aW = wins_b.length ? wins_b.reduce((s: number, b: any) => s + (b.pct || 0), 0) / wins_b.length : 0.5;
  const aL = losses_b.length ? Math.abs(losses_b.reduce((s: number, b: any) => s + (b.pct || 0), 0) / losses_b.length) : 0.5;
  const b_ratio = aL > 0 ? aW / aL : 1;
  const kelly = Math.max(0, p_adj - (1 - p_adj) / b_ratio);
  const kellyScore = Math.round(Math.min(100, kelly * 200));
  const macroBonus = Math.round(mc.score / 20 * 5);
  const _L6raw = Math.min(100, Math.round(kellyScore * 0.92 + macroBonus));
  const L6 = Math.min(100, Math.max(0, _L6raw + Math.round((radarVA / 5 * 100 - 50) * 0.25)));

  // ═══ L7: Bayesian
  const _consMean = (L1 + L4 + L5) / 3;
  const _consStd = Math.sqrt(((L1 - _consMean) ** 2 + (L4 - _consMean) ** 2 + (L5 - _consMean) ** 2) / 3);
  const _consistency = Math.max(0, 1 - _consStd / 40);
  const _consDir = _consMean >= 50 ? 1 : 0.55;
  const priorRaw = 0.30 + _consistency * 0.45 * _consDir;
  const prior = Math.min(0.75, Math.max(0.08, priorRaw));
  const cmfFactor = cmf > 0.15 ? 0.92 : cmf > 0.05 ? 0.78 : cmf > 0 ? 0.62 : 0.42;
  const obvFactor = obv.rising && obv.obvZ > 0.5 ? 0.88 : obv.rising ? 0.75 : 0.55;
  const priceMom10 = bars.length >= 10 ? (bars[bars.length - 1].c - bars[bars.length - 10].c) / bars[bars.length - 10].c : 0;
  const priceMomFactor = priceMom10 > 0.03 ? 0.85 : priceMom10 > 0 ? 0.65 : 0.40;
  const likel = Math.min(0.92, Math.max(0.08, cmfFactor * 0.30 + obvFactor * 0.30 + priceMomFactor * 0.40));
  const post = (prior * likel) / (prior * likel + (1 - prior) * (1 - likel));
  const _L7bayesRaw = Math.round(post * 100);
  const L7 = Math.min(100, Math.max(0, _L7bayesRaw + Math.round((radarMC / 5 * 100 - 50) * 0.25)));
  const bayesMult = Math.min(1.07, Math.max(0.93, 0.93 + post * 0.14));

  // ═══ L8: Fundamentals
  const w52h = stk.w52h || stk.hi || (stk.p * 1.2);
  const w52l = stk.w52l || stk.lo || (stk.p * 0.8);
  const pricePos = w52h > w52l ? Math.round((stk.p - w52l) / (w52h - w52l) * 100) : 50;
  const pbRatio = stk.bookValue && stk.bookValue > 0 ? stk.p / stk.bookValue : 2.0;
  const valScore = Math.round(Math.min(90, Math.max(10,
    50 - 28 * Math.tanh(((stk.pe || 18) - 18) / 15) - 10 * Math.tanh((pbRatio - 2) / 2)
  )));
  const _L8raw = Math.round(
    (valScore / 100) * 45 +
    ((stk.rating || 60) / 100) * 30 +
    ((100 - pricePos) / 100) * 15 +
    (0.10 * MACRO.oilPrice / 100) * 10
  );
  const L8 = Math.min(100, Math.max(0, _L8raw + Math.round((radarLQ / 10 * 100 - 50) * 0.2)));

  // ═══ L9: السيولة الذكية
  const cmfScore = Math.round(50 + 45 * Math.tanh(cmf * 8));
  const obvMoment = bars.length >= 10 ? (bars[bars.length - 1].c - bars[bars.length - 10].c) / bars[bars.length - 10].c : 0;
  const obvScore = Math.round(50 + 40 * Math.tanh((obv.rising ? 1 : -1) * (0.4 + Math.abs(obvMoment) * 4)));
  const volScore = Math.round(50 + 40 * Math.tanh((vr - 1) * 1.8));
  const ret5dir = bars.length >= 5 ? bars.slice(-5).reduce((s: number, b: any) => s + (b.pct || 0), 0) / 5 : (stk.ch || 0);
  const dirScore = Math.round(50 + 35 * Math.tanh(ret5dir * 0.6));
  const vwapDevScore = Math.round(50 - 25 * Math.tanh((vi.vwapDev || 0) * 0.8));
  const smartMoney = Math.round(cmfScore * 0.26 + obvScore * 0.24 + volScore * 0.22 + dirScore * 0.16 + vwapDevScore * 0.12);
  const L9 = Math.min(100, Math.max(0, smartMoney));

  // ═══ Regime + Weights + Conflicts
  const mktBreadth = allStocks.length > 0 ? allStocks.filter((x: any) => (x.ch || 0) > 0).length / allStocks.length : 0.5;
  const regimeData = detectMarketRegime(bars, adxV, mktWtd, mktBreadth, atr, stk);
  const regime = regimeData.regime;
  const W = buildDynamicWeights(regime, stk.sec);
  const corrFactors = reduceCorrelation({ L1, L2, L4, L5, L7, L9 });
  const WC: any = {};
  ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'].forEach(k => {
    WC[k] = W[k] * (corrFactors[k] || 1);
  });
  const wcTotal = (Object.values(WC) as number[]).reduce((s: number, v: number) => s + v, 0);
  ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'].forEach(k => {
    WC[k] = +(WC[k] / wcTotal).toFixed(4);
  });

  // Gates
  const gate1 = L9 >= 55;
  const gate2 = L1 >= 50;
  const gate3Score = Math.round((L4 + L5) / 2);
  const gate3 = gate3Score >= 50;
  const gatesPassed = [gate1, gate2, gate3].filter(Boolean).length;
  const allGates = gatesPassed === 3;

  // Opportunity Matrix
  const hLiq = gate1 && L9 >= 65;
  const hStr = gate2 && L1 >= 60;
  const hMom = gate3 && gate3Score >= 55;
  let oppMatrix, oppPriority;
  if (hLiq && hStr && hMom) { oppMatrix = "فرصة قصوى"; oppPriority = 4; }
  else if (hLiq && hStr) { oppMatrix = "فرصة مكتملة"; oppPriority = 3; }
  else if (hLiq && hMom) { oppMatrix = "اختراق محتمل"; oppPriority = 3; }
  else if (hStr && hMom) { oppMatrix = "صعود مؤكد"; oppPriority = 3; }
  else if (gatesPassed >= 1) { oppMatrix = "مراقبة"; oppPriority = 1; }
  else { oppMatrix = "لا فرصة"; oppPriority = 0; }

  const conflictData = calcConflictPenalty({ L1, L4, L5, L7, L9 }, regime);
  const conflictCount = conflictData.conflictCount;

  // Base Score
  const baseScore = _clamp(Math.round(
    L9 * WC.L9 + L1 * WC.L1 + L5 * WC.L5 + L4 * WC.L4 +
    L8 * WC.L8 + L7 * WC.L7 + L6 * WC.L6 + L2 * WC.L2 + L3 * WC.L3
  ), 0, 100);

  // Adjustment Factor
  const conflictFactor = 1.0 - _clamp(conflictCount * 0.05, 0, 0.20);
  const macroScore100 = mc.score * 5;
  const macroFactor = macroScore100 < 25 ? 0.85 : macroScore100 < 40 ? 0.92 : macroScore100 > 75 ? 1.08 : macroScore100 > 60 ? 1.04 : 1.0;
  const tasiFactor = tc_tasi.tasiRegime === "CRASH" ? 0.88 : tc_tasi.tasiRegime === "DIVERGE" ? 0.94 : tc_tasi.tasiRegime === "RALLY" ? 1.06 : 1.0;
  const gateFactor = gatesPassed === 3 ? 1.10 : gatesPassed === 2 ? 1.00 : gatesPassed === 1 ? 0.90 : 0.80;
  // ✨ رُبط بـ bayesMult المحسوب في L7 بدل ثابت 1.0 المعطّل
  const momentumBayesFactor = _clamp(bayesMult, 0.85, 1.10);
  const adjustmentFactor = _clamp(
    conflictFactor * 0.25 + macroFactor * 0.20 + tasiFactor * 0.20 + gateFactor * 0.20 + momentumBayesFactor * 0.15,
    0.70, 1.15
  );

  const score = _clamp(Math.round(baseScore * adjustmentFactor), 0, 100);
  const grade = score >= 85 ? "S" : score >= 75 ? "A" : score >= 65 ? "B" : score >= 55 ? "C" : score >= 45 ? "D" : "F";
  const prob = _softmax3(score - 50, 50 - score, 5);
  const sig = score >= 65 && gatesPassed >= 2 ? "شراء قوي" : score >= 55 && gatesPassed >= 2 ? "مراقبة" : score >= 45 ? "محايد" : "تخفيف";

  return {
    score, grade, sig, sigC: "#06b6d4", regime,
    weights: WC,
    probability: prob,
    gates: { g1: gate1, g2: gate2, g3: gate3, passed: gatesPassed, all: allGates, g1s: L9, g2s: L1, g3s: gate3Score, g1l: "", g2l: ms.label, g3l: adxBull ? "زخم صاعد" : "زخم ضعيف" },
    opp: { matrix: oppMatrix, priority: oppPriority, highLiq: hLiq, highStr: hStr, highMom: hMom },
    tasiCtx: tc_tasi,
    layers: { L1, L2, L3, L4, L5, L6, L7, L8, L9 },
    extras: {
      conflictCount, bayesMult, vr: +vr.toFixed(2),
      kelly: +kelly.toFixed(3), adxV, adxBull, rsiV,
      macdH: +macdH.toFixed(3),
      mktBreadth: +mktBreadth.toFixed(2),
      mktMomentum: +mktWtd.toFixed(2),
      gateMultiplier: gatesPassed / 3,
      regimeData, baseScore,
      adjustmentFactor: +adjustmentFactor.toFixed(3),
      macroScore100, pricePos, valScore,
      cmf: +cmf.toFixed(3),
      obvRising: obv.rising,
      msLabel: ms.label, bosBull: ms.bosBull,
      obLabel: ob.label, inBullOB: ob.inBullOB,
      sslLabel: ls.label, recoveredSSL: ls.recoveredSSL,
      vwapDev: vi.vwapDev, belowB1: vi.belowB1, belowB2: vi.belowB2,
      macroEnv: mc.env, macroScore: mc.score,
    }
  };
}

// ════════════════════════════════════════════════════════════
//  Ensemble Voting
// ════════════════════════════════════════════════════════════

function ensembleVote(LA: number, LB: number, LC: number, regime: string, gates: number, layers: any): any {
  const L1 = layers ? (layers.L1 || 50) : 50;
  const L5 = layers ? (layers.L5 || 50) : 50;
  const L9 = layers ? (layers.L9 || 50) : 50;
  
  function modelVote(score: number, buyThr: number, sellThr: number): number {
    if (score >= buyThr) return 1;
    if (score <= sellThr) return -1;
    return 0;
  }
  
  const techVote = modelVote(LA, 60, 40);
  const fundVote = modelVote(LB, 62, 38);
  const behavVote = modelVote(LC, 58, 42);
  
  const votes = [techVote, fundVote, behavVote];
  const bullCount = votes.filter(v => v > 0).length;
  const bearCount = votes.filter(v => v < 0).length;
  const neutCount = votes.filter(v => v === 0).length;
  
  let wT, wF, wB;
  switch (regime) {
    case "bull": wT = 0.50; wF = 0.30; wB = 0.20; break;
    case "bear": wT = 0.40; wF = 0.35; wB = 0.25; break;
    case "sideways": wT = 0.30; wF = 0.45; wB = 0.25; break;
    case "volatile": wT = 0.55; wF = 0.25; wB = 0.20; break;
    case "news-driven": wT = 0.30; wF = 0.30; wB = 0.40; break;
    default: wT = 0.45; wF = 0.30; wB = 0.25;
  }
  
  const softT = _clamp((LA - 50) / 50, -1, 1);
  const softF = _clamp((LB - 50) / 50, -1, 1);
  const softB = _clamp((LC - 50) / 50, -1, 1);
  const softBull = +(softT * wT + softF * wF + softB * wB).toFixed(3);
  
  let agreementBoost = 1.0;
  if (bullCount === 3 || bearCount === 3) agreementBoost = 1.10;
  else if (bullCount === 2 || bearCount === 2) agreementBoost = 1.03;
  else if (neutCount >= 2) agreementBoost = 1.00;
  else agreementBoost = 0.92;
  
  const techConsensus = L1 > 55 && L5 > 55 && L9 > 55 ? 1 : L1 < 45 && L5 < 45 && L9 < 45 ? -1 : 0;
  
  return {
    bullCount, bearCount, neutCount,
    softBull, techConsensus,
    agreementBoost: +agreementBoost.toFixed(3),
    ensembleSig: bullCount >= 2 ? "صعودي" : bearCount >= 2 ? "هبوطي" : "محايد"
  };
}

// ════════════════════════════════════════════════════════════
//  Feedback System - يكتب في نفس tdw_feedback_state
// ════════════════════════════════════════════════════════════

const FEEDBACK_STORE_KEY = 'tdw_feedback_state';

function loadFeedbackState(): any {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FEEDBACK_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveFeedbackState(state: any): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (!state || typeof state !== 'object') return;
    localStorage.setItem(FEEDBACK_STORE_KEY, JSON.stringify(state));
  } catch (e) {
    // silent
  }
}

/**
 * recordFeedback - يسجّل نتيجة كل صفقة في tdw_feedback_state
 * هذا ما يُغذّي ABM في analysisEngine للتعلّم
 */
export function recordFeedback(sym: string, signal: string, layers: any, actualOutcome: number, context?: any): void {
  const state = loadFeedbackState() || {};
  const now = Date.now();
  
  // Migration للبيانات القديمة
  if (state[sym] && !state[sym].version) {
    const old = state[sym];
    state[sym] = {
      version: 2,
      longTerm: { totalEver: old.total || 0, correctEver: old.correct || 0 },
      shortTerm: { recent: [] as any[], weightedAccuracy: old.total > 0 ? old.correct / old.total : 0.5 },
      context: {
        backtest: { total: old.total || 0, correct: old.correct || 0 },
        live: { total: 0, correct: 0 },
        bull: { total: 0, correct: 0 },
        bear: { total: 0, correct: 0 },
      },
      layers: old.layers || {},
      meta: { lastUpdate: now, firstUpdate: now }
    };
  }
  
  if (!state[sym]) {
    state[sym] = {
      version: 2,
      longTerm: { totalEver: 0, correctEver: 0 },
      shortTerm: { recent: [] as any[], weightedAccuracy: 0.5 },
      context: {
        backtest: { total: 0, correct: 0 },
        live: { total: 0, correct: 0 },
        bull: { total: 0, correct: 0 },
        bear: { total: 0, correct: 0 },
      },
      layers: {},
      meta: { lastUpdate: now, firstUpdate: now }
    };
  }
  
  const perf = state[sym];
  const weight = Math.abs(actualOutcome);
  const isCorrect = actualOutcome > 0;
  
  // Long-term
  perf.longTerm.totalEver += weight;
  if (isCorrect) perf.longTerm.correctEver += weight;
  
  // Short-term (آخر 30)
  perf.shortTerm.recent.push({ timestamp: now, outcome: actualOutcome, signal, weight });
  if (perf.shortTerm.recent.length > 30) perf.shortTerm.recent.shift();
  
  // Weighted accuracy (decay)
  const decay = 0.92;
  let weightedSum = 0, totalWeight = 0;
  perf.shortTerm.recent.forEach((trade: any, i: number, arr: any[]) => {
    const age = arr.length - 1 - i;
    const w = Math.pow(decay, age) * trade.weight;
    if (trade.outcome > 0) weightedSum += w;
    totalWeight += w;
  });
  perf.shortTerm.weightedAccuracy = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  
  // Context tracking
  const ctxType = context?.type === 'live' ? 'live' : 'backtest';
  perf.context[ctxType].total += weight;
  if (isCorrect) perf.context[ctxType].correct += weight;
  
  const marketRegime = context?.regime === 'bear' ? 'bear' : 'bull';
  perf.context[marketRegime].total += weight;
  if (isCorrect) perf.context[marketRegime].correct += weight;
  
  // Layer tracking
  const lnames = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'];
  lnames.forEach(k => {
    if (layers[k] === undefined) return;
    if (!perf.layers[k]) perf.layers[k] = { total: 0, correct: 0, recent: [] as any[] };
    perf.layers[k].total += weight;
    const layerDir = layers[k] > 55 ? 1 : layers[k] < 45 ? -1 : 0;
    const signalDir = signal === 'شراء قوي' || signal === 'مراقبة' ? 1 : signal === 'تخفيف' ? -1 : 0;
    const layerCorrect = (layerDir !== 0 && layerDir === signalDir && isCorrect) ||
                         (layerDir !== 0 && layerDir !== signalDir && !isCorrect);
    if (layerCorrect) perf.layers[k].correct += weight;
    perf.layers[k].recent.push({ correct: layerCorrect, weight });
    if (perf.layers[k].recent.length > 20) perf.layers[k].recent.shift();
  });
  
  perf.meta.lastUpdate = now;
  saveFeedbackState(state);
}

// ════════════════════════════════════════════════════════════
//  stockHealth - الدالة الرئيسية المُصدَّرة
// ════════════════════════════════════════════════════════════

export function stockHealth(stk: any, bars: any[], allStocks?: any[], macroOverride?: any, weightsOverride?: any): any {
  if (!stk || typeof stk !== 'object') return _emptyHealthResult();
  if (!bars || !Array.isArray(bars) || bars.length < 5) return _emptyHealthResult();
  
  // 🆕 تطبيق macro override إن وُجد
  const _macroPrevious = macroOverride ? setMacroOverride(macroOverride) : null;
  // 🆕 تطبيق weights override إن وُجد (Strategy Lab)
  const _weightsPrevious = weightsOverride ? setWeightsOverride(weightsOverride) : undefined;
  
  try {

  // إن لم تُمرَّر allStocks، نستعمل قائمة فيها السهم نفسه على الأقلّ
  const stocks = (allStocks && allStocks.length > 0) ? allStocks : [stk];
  
  // STEP 1: المحرّكات الأساسية
  const tech = calc9Layers(stk, bars, stocks);
  const LA = tech.score;
  const regime = tech.regime;
  const layers = tech.layers;
  
  // STEP 2: المحرّك الأساسي LB
  const fm = calcFactorModel(stk, bars, stocks);
  const em = calcEarningsModel(stk);
  const dcf = calcDCF(stk);
  const eq = calcEarningsQuality(stk);
  const dcfScore = Math.round(_clamp(100 / (1 + Math.exp(-0.06 * (dcf.upside - 5))), 10, 95));
  const emScore = Math.round(_clamp(100 / (1 + Math.exp(-0.05 * (em.upside - 8))), 10, 95));
  const fundConflict = (dcfScore > 70 && eq.composite < 40) ? 6 : (dcfScore < 40 && fm.composite > 70) ? 4 : 0;
  const LB = _clamp(Math.round(dcfScore * 0.35 + fm.composite * 0.30 + emScore * 0.20 + eq.composite * 0.15 - fundConflict), 0, 100);
  
  // STEP 3: المحرّك السلوكي LC
  const opt = calcBehavioralPressure(stk, bars);
  const ins = calcInsiderTransactions(stk, bars);
  const alt = calcAlternativeData(stk, bars, stocks);
  const optScore = _clamp(Math.round(80 - (opt.pressureRatio - 0.7) * 60 + (opt.unusualActivity && opt.pressureRatio < 0.9 ? 10 : 0)), 0, 100);
  
  // Sector Rotation Score
  const sectorStocks = stocks.filter((x: any) => x.sec === stk.sec);
  const sectorAvgCh = sectorStocks.length > 0 ? sectorStocks.reduce((s: number, x: any) => s + (x.ch || 0), 0) / sectorStocks.length : 0;
  const mktAvgCh = stocks.length > 0 ? stocks.reduce((s: number, x: any) => s + (x.ch || 0), 0) / stocks.length : 0;
  const sectorRot = sectorAvgCh - mktAvgCh;
  const sectorRotScore = _clamp(Math.round(50 + sectorRot * 15), 0, 100);
  
  // ✨ حُذف ثابت 50×0.15 (مكان محجوز لمكوّن غير منفّذ) -- الوزن أُعيد توزيعه على المكوّنات الفعلية
  const LC = Math.round(optScore * 0.35 + ins.score * 0.35 + alt.composite * 0.18 + sectorRotScore * 0.12);
  
  // STEP 4: المضاعفات الخارجية
  const risk = calcRiskAttribution(stk, bars, stocks);
  const inter = calcIntermarket(stk);
  const micro = calcMicrostructure(stk, bars);
  const riskMult = risk.sortino > 2.0 ? 1.07 : risk.sortino > 1.0 ? 1.03 : risk.sharpe > 0.5 ? 1.00 : risk.sharpe > 0 ? 0.96 : 0.89;
  const finalMult = _clamp(riskMult * inter.multiplier * (micro ? micro.multiplier : 1.0), 0.70, 1.30);
  
  // STEP 5: Dynamic Weights
  let wA, wB, wC;
  switch (regime) {
    case "bull": wA = 0.50; wB = 0.30; wC = 0.20; break;
    case "bear": wA = 0.40; wB = 0.35; wC = 0.25; break;
    case "sideways": wA = 0.30; wB = 0.45; wC = 0.25; break;
    case "volatile": wA = 0.55; wB = 0.25; wC = 0.20; break;
    case "news-driven": wA = 0.30; wB = 0.30; wC = 0.40; break;
    default: wA = 0.45; wB = 0.30; wC = 0.25;
  }
  
  // STEP 6: Ensemble Vote
  const ensemble = ensembleVote(LA, LB, LC, regime, tech.gates ? tech.gates.passed : 0, layers);
  
  // STEP 7: Conviction
  // ✨ إن كان المحرّك الأساسي محايداً (لا بيانات أساسية)، نُعيد توزيع وزنه على LA/LC
  //    بدل أن يسحب الدرجة للأسفل بقيمة محايدة ثابتة
  const _fundAvailable = stk.pe != null || stk.roe != null || stk.divY != null;
  let _wA = wA, _wB = wB, _wC = wC;
  if (!_fundAvailable) {
    const _redistribute = wB;
    _wB = 0;
    _wA = wA + _redistribute * (wA / (wA + wC));
    _wC = wC + _redistribute * (wC / (wA + wC));
  }
  const baseConviction = LA * _wA + LB * _wB + LC * _wC;
  const lbLcGap = Math.abs(LB - LC);
  const lbLcConflict = lbLcGap >= 25 ? Math.min(8, Math.round((lbLcGap - 20) / 3.5)) : 0;
  const ensembleConflict = lbLcConflict + fundConflict;
  
  let ensembleQualityFactor = 1.0;
  if (ensemble.bullCount === 3 || ensemble.bearCount === 3) ensembleQualityFactor *= 1.08;
  else if (ensemble.bullCount === 2 || ensemble.bearCount === 2) ensembleQualityFactor *= 1.03;
  else if (ensemble.neutCount >= 2) ensembleQualityFactor *= 0.95;
  else ensembleQualityFactor *= 0.92;
  
  if (ensemble.techConsensus === 1) ensembleQualityFactor *= 1.03;
  else if (ensemble.techConsensus === -1) ensembleQualityFactor *= 0.97;
  
  ensembleQualityFactor = _clamp(ensembleQualityFactor, 0.85, 1.15);
  const conviction = _clamp(Math.round((baseConviction - ensembleConflict) * ensembleQualityFactor), 0, 100);
  
  // STEP 8: تجميع النتيجة
  const merged: any = { ...tech };
  // اختبار مؤقّت: نعود للدرجة التقنية (LA) للتحقّق من سبب الفجوات
  const score = merged.score;

  let sig, sigC;
  if (score >= 65 && tech.gates.passed >= 2) { sig = "شراء قوي"; sigC = "#10c97e"; }
  else if (score >= 55 && tech.gates.passed >= 1) { sig = "مراقبة"; sigC = "#f59e0b"; }
  else if (score >= 45) { sig = "محايد"; sigC = "#06b6d4"; }
  else { sig = "تخفيف"; sigC = "#f04f5a"; }
  
  merged.sig = sig;
  merged.sigC = sigC;
  merged.convictionScore = conviction;
  merged.confidence = conviction;
  
  // Conviction metadata
  merged.conviction = {
    LA, LB, LC, wA, wB, wC,
    riskMult: +riskMult.toFixed(2),
    finalMult: +finalMult.toFixed(3),
    dcfScore, fmScore: fm.composite, emScore,
    eqScore: eq.composite, eqGrade: eq.grade,
    optScore, insScore: ins.score, altScore: alt.composite,
    dcfUpside: dcf.upside, emUpside: em.upside,
    fundConflict, lbLcConflict,
    ensemble,
    risk: { sharpe: risk.sharpe, sortino: risk.sortino, alpha: risk.alpha, volatility: risk.volatility },
    inter: { multiplier: inter.multiplier, signal: inter.signal },
    micro: micro ? { composite: micro.composite, ofi: micro.ofi } : null,
    regime,
  };
  
  return merged;
  
  } finally {
    if (_macroPrevious) restoreMacro(_macroPrevious);
    // 🆕 استرجاع الأوزان
    if (_weightsPrevious !== undefined) restoreWeights(_weightsPrevious);
  }
}  

// ════════════════════════════════════════════════════════════
//  دالة الاختبار النهائية -- للتأكّد من نجاح المرحلة ٧
// ════════════════════════════════════════════════════════════

export function testBacktestEngine(): string {
  const testStk = {
    sym: "1010", sec: "البنوك", p: 20,
    pe: 12, roe: 14, debt: 0.3, mktCap: 30,
    epsGrw: 8, ch: 0.5, sector_beta: 1.0,
    hi: 25, lo: 15, rating: 60,
    avgVol: 1000000, v: 1100000
  };
  const testBars = Array(60).fill(0).map((_, i) => ({
    o: 20 + i * 0.05 + Math.sin(i / 5) * 0.3,
    c: 20 + i * 0.05 + Math.sin(i / 5) * 0.3 + 0.05,
    hi: 20 + i * 0.05 + Math.sin(i / 5) * 0.3 + 0.25,
    lo: 20 + i * 0.05 + Math.sin(i / 5) * 0.3 - 0.15,
    vol: 1000000 + Math.random() * 500000,
    pct: 0.3 + Math.sin(i / 3) * 0.5
  }));
  const testAllStocks = [
    { sym: "1010", sec: "البنوك", ch: 0.5, mktCap: 30, pe: 12 },
    { sym: "2222", sec: "الطاقة", ch: 1.2, mktCap: 1800, pe: 14 },
    { sym: "1120", sec: "البنوك", ch: 0.8, mktCap: 280, pe: 18 },
    { sym: "7010", sec: "الإتصالات", ch: -0.3, mktCap: 110, pe: 14 }
  ];
  
  const result = stockHealth(testStk, testBars, testAllStocks);
  const L = result.layers;
  
  return `✅ المحرّك جاهز! | score=${result.score} | sig=${result.sig} | conviction=${result.convictionScore} | L1=${L.L1} L4=${L.L4} L5=${L.L5} L7=${L.L7} L9=${L.L9}`;
}
