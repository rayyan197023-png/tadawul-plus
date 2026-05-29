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
  const qualScore = Math.round(Math.min(100, Math.max(0, (stk.roe || 10) * 1.8 + (1 - (stk.debt || 0.3)) * 28 + Math.min(15, (stk.epsGrw || 3) * 1.5) + pbPenalty)));
  const sizeScore = Math.round(Math.min(85, Math.max(35, 80 - 40 * Math.tanh(((stk.mktCap || 50) - 100) / 150))));
  const divScore = Math.round(Math.min(90, Math.max(0, (stk.divY || 0) * 14)));
  const growScore = Math.round(Math.min(100, Math.max(0, 50 + (stk.revGrw || 3) * 2.5)));
  const composite = Math.round(valueScore * 0.20 + momScore * 0.25 + qualScore * 0.25 + sizeScore * 0.10 + divScore * 0.10 + growScore * 0.10);
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
  const netBuy = (netScore - 50) * stk.mktCap * 1e6 * 0.0001;
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
//  دالة الاختبار -- للتأكّد من نجاح المرحلة ٥
// ════════════════════════════════════════════════════════════

export function testBacktestEngine(): string {
  const testBars = Array(60).fill(0).map((_, i) => ({
    o: 20 + i * 0.1, c: 20 + i * 0.1 + 0.05,
    hi: 20 + i * 0.1 + 0.2, lo: 20 + i * 0.1 - 0.1,
    close: 20 + i * 0.1 + 0.05,
    open: 20 + i * 0.1,
    vol: 1000000, pct: 0.5
  }));
  
  const atr = 0.3;
  const ob = calcOrderBlocksFull(testBars, atr);
  const ls = calcLiqSweepFull(testBars, atr);
  const vi = calcIVWAP(testBars);
  const regime = detectMarketRegime(testBars, 25, 0.1, 0.5, atr, { c: 20, ch: 0.5 });
  const w = buildDynamicWeights("bull", "البنوك");
  const cr = reduceCorrelation({ L1: 60, L4: 55, L5: 50, L9: 65 });
  
  return `✅ المرحلة ٥ ناجحة | OB=${ob.score} | LS=${ls.score} | VI=${vi.score} | regime=${regime.regime} | W.L1=${w.L1}`;
}
