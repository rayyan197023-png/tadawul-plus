/**
 * @module engines/stockPersonality v2
 * @description كشف شخصيّة السهم - نموذج علمي أكاديميّ
 *
 * 🎯 الهدف:
 * تحليل كل سهم وتصنيفه إلى 7 شخصيّات تداوليّة:
 *  - LEADER:      قيادي ثقيل (Quality + Low-Vol + Large-cap)
 *  - GROWTH:      نموّ متفجّر (Momentum factor)
 *  - VALUE:       قيمة مقيّمة بأقلّ (Fama-French HML)
 *  - DIVIDEND:    موزّع ثابت (Dividend Aristocrat)
 *  - TURNAROUND:  متحوّل (Fallen Angel + earnings momentum)
 *  - SPECULATIVE: مضاربي عنيف (High-beta, lottery-like)
 *  - AVOID:       يُتجنّب (Distressed, toxic)
 *
 * 📚 المراجع العلميّة:
 *  - Fama-French (1992, 2015) -- Size, Value, Quality factors
 *  - Carhart (1997) -- Momentum factor
 *  - Asness, Frazzini, Pedersen (2018) -- Quality factor
 *  - Low-Volatility Anomaly (Blitz, 2014)
 *  - Behavioral Finance (Tversky-Kahneman, 1979)
 *  - Market Regimes (HMM + ADX, Hendershott 2011)
 */

'use client';

export type StockPersonality = 
  | 'LEADER'      
  | 'GROWTH'      
  | 'VALUE'       
  | 'DIVIDEND'    
  | 'TURNAROUND'  
  | 'SPECULATIVE' 
  | 'AVOID'       
  | 'NEUTRAL';

export interface PersonalityResult {
  personality: StockPersonality;
  confidence: number;
  reasons: string[];
  metrics: {
    avgDailyMove: number;
    volatility: number;
    gapCount: number;
    trendStrength: number;
    qualityScore: number;
    toxicityScore: number;
    valueScore: number;       // 🆕
    dividendScore: number;    // 🆕
    momentumScore: number;    // 🆕
    turnaroundScore: number;  // 🆕
  };
}

// ════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS (الأساسية)
// ════════════════════════════════════════════════════════════

function calcAvgDailyMove(bars: any[]): number {
  if (!bars || bars.length < 5) return 0;
  const moves = bars.map(b => Math.abs(b.pct || 0));
  return moves.reduce((s, m) => s + m, 0) / moves.length;
}

function calcVolatility(bars: any[]): number {
  if (!bars || bars.length < 10) return 0;
  const moves = bars.map(b => b.pct || 0);
  const avg = moves.reduce((s, m) => s + m, 0) / moves.length;
  const variance = moves.reduce((s, m) => s + Math.pow(m - avg, 2), 0) / moves.length;
  return Math.sqrt(variance);
}

function countGaps(bars: any[], threshold: number = 3): number {
  if (!bars || bars.length === 0) return 0;
  return bars.filter(b => Math.abs(b.pct || 0) > threshold).length;
}

function calcTrendStrength(bars: any[]): number {
  if (!bars || bars.length < 20) return 0;
  const closes = bars.map(b => b.c);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const totalMove = Math.abs((last - first) / first) * 100;
  const totalDailyMoves = bars.reduce((s, b) => s + Math.abs(b.pct || 0), 0);
  if (totalDailyMoves === 0) return 0;
  const trendRatio = (totalMove / totalDailyMoves) * 100;
  return Math.min(100, Math.max(0, trendRatio * 3));
}

function calcQualityScore(stk: any): number {
  let score = 0;
  let available = 0;

  if (stk.roe != null) {
    available += 30;
    if (stk.roe >= 20) score += 30;
    else if (stk.roe >= 15) score += 25;
    else if (stk.roe >= 10) score += 20;
    else if (stk.roe >= 5) score += 10;
  }

  if (stk.debt != null) {
    available += 25;
    if (stk.debt <= 0.2) score += 25;
    else if (stk.debt <= 0.4) score += 20;
    else if (stk.debt <= 0.6) score += 10;
  }

  if (stk.pe != null && stk.pe > 0) {
    available += 20;
    if (stk.pe <= 15) score += 20;
    else if (stk.pe <= 25) score += 15;
    else if (stk.pe <= 35) score += 5;
  }

  if (stk.epsGrw != null) {
    available += 25;
    if (stk.epsGrw >= 15) score += 25;
    else if (stk.epsGrw >= 10) score += 20;
    else if (stk.epsGrw >= 5) score += 10;
    else if (stk.epsGrw >= 0) score += 5;
  }

  // ✨ تطبيع على المتاح فعلياً -- لا نعاقب على بيانات غائبة
  if (available === 0) return 0;
  return Math.min(100, Math.round((score / available) * 100));
}

function calcToxicityScore(stk: any, bars: any[]): number {
  let score = 0;
  // ✨ لا نعاقب على بيانات غائبة -- نتخطّى بدل افتراض الأسوأ
  if (stk.roe != null) {
    if (stk.roe < 0) score += 35;
    else if (stk.roe < 3) score += 25;
    else if (stk.roe < 5) score += 15;
  } 

  if (stk.debt != null) {
    if (stk.debt > 0.8) score += 30;
    else if (stk.debt > 0.65) score += 20;
    else if (stk.debt > 0.5) score += 10;
  }
  
  if (bars && bars.length >= 60) {
    const firstPrice = bars[0].c;
    const lastPrice = bars[bars.length - 1].c;
    const totalReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
    if (totalReturn < -30) score += 25;
    else if (totalReturn < -20) score += 15;
    else if (totalReturn < -10) score += 5;
  }
  
  if (stk.epsGrw != null) {
    if (stk.epsGrw < -20) score += 20;
    else if (stk.epsGrw < -10) score += 10;
  }
  
  return Math.min(100, score);
}

// ════════════════════════════════════════════════════════════
//  NEW HELPERS (الجديدة - علميّة أكاديميّة)
// ════════════════════════════════════════════════════════════

/**
 * Value Score (Fama-French HML inspired)
 * كلّما زاد → السهم "قيمة" (مُقيّم بأقلّ من قيمته)
 */
function calcValueScore(stk: any): number {
  let score = 0;
  
  // PE منخفض = قيمة
  const pe = stk.pe || 100;
  if (pe > 0 && pe < 10) score += 35;
  else if (pe > 0 && pe < 13) score += 25;
  else if (pe > 0 && pe < 16) score += 15;
  
  // PB منخفض = قيمة (إن وُجد)
  const pb = stk.bookValue && stk.bookValue > 0 ? stk.p / stk.bookValue : null;
  if (pb !== null) {
    if (pb < 1) score += 30;
    else if (pb < 1.5) score += 20;
    else if (pb < 2) score += 10;
  }
  
  // Dividend Yield جيّد = قيمة
  const divY = stk.divY || 0;
  if (divY > 5) score += 20;
  else if (divY > 3) score += 12;
  else if (divY > 1.5) score += 6;
  
  // ROE معقول (ليس ضعيفاً) = قيمة حقيقيّة (وليس "value trap")
  const roe = stk.roe || 0;
  if (roe >= 8 && roe < 20) score += 15;
  else if (roe < 5) score -= 20;  // value trap
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Dividend Score (Dividend Aristocrat-like)
 * كلّما زاد → السهم موزّع جيّد
 */
function calcDividendScore(stk: any): number {
  let score = 0;
  
  const divY = stk.divY || 0;
  if (divY > 6) score += 40;
  else if (divY > 4) score += 30;
  else if (divY > 2.5) score += 20;
  else if (divY > 1) score += 10;
  
  // ROE مستقرّ (يدعم التوزيعات)
  const roe = stk.roe || 0;
  if (roe >= 10) score += 20;
  else if (roe >= 6) score += 12;
  
  // Debt معقول (يستطيع التوزيع)
  const debt = stk.debt || 0.5;
  if (debt <= 0.4) score += 20;
  else if (debt <= 0.55) score += 12;
  
  // mktCap كبير (استقرار)
  if ((stk.mktCap || 0) >= 50) score += 10;
  
  // EPS Growth إيجابيّ (يدعم استمرار التوزيعات)
  const epsGrw = stk.epsGrw || 0;
  if (epsGrw > 5) score += 10;
  else if (epsGrw < -5) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Momentum Score (Carhart momentum factor)
 * كلّما زاد → السهم في momentum قويّ
 */
function calcMomentumScore(stk: any, bars: any[]): number {
  if (!bars || bars.length < 60) return 0;
  
  let score = 0;
  
  // عائد 60 يوم (3 شهور تقريباً)
  const ret60 = ((bars[bars.length - 1].c - bars[bars.length - 60].c) / bars[bars.length - 60].c) * 100;
  if (ret60 > 30) score += 35;
  else if (ret60 > 20) score += 25;
  else if (ret60 > 10) score += 15;
  else if (ret60 > 5) score += 8;
  else if (ret60 < -10) score -= 20;
  
  // عائد آخر 20 يوم (تأكيد قصير المدى)
  if (bars.length >= 20) {
    const ret20 = ((bars[bars.length - 1].c - bars[bars.length - 20].c) / bars[bars.length - 20].c) * 100;
    if (ret20 > 10) score += 20;
    else if (ret20 > 5) score += 12;
    else if (ret20 < -5) score -= 15;
  }
  
  // EPS Growth (fundamental momentum)
  const epsGrw = stk.epsGrw || 0;
  if (epsGrw > 25) score += 25;
  else if (epsGrw > 15) score += 18;
  else if (epsGrw > 8) score += 10;
  
  // Revenue Growth
  const revGrw = stk.revGrw || 0;
  if (revGrw > 20) score += 20;
  else if (revGrw > 10) score += 12;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Turnaround Score (Fallen Angel detection)
 * ROE حالياً ضعيف، لكنّ EPS Growth قويّ → احتمال انقلاب
 */
function calcTurnaroundScore(stk: any, bars: any[]): number {
  let score = 0;
  
  // ROE حالياً ضعيف-متوسّط (5-10%)
  const roe = stk.roe || 0;
  if (roe >= 5 && roe < 10) score += 25;
  else if (roe >= 3 && roe < 5) score += 15;
  
  // لكنّ EPS Growth قويّ جداً (مؤشّر انقلاب)
  const epsGrw = stk.epsGrw || 0;
  if (epsGrw > 30) score += 35;
  else if (epsGrw > 20) score += 25;
  else if (epsGrw > 12) score += 15;
  else score -= 10;  // إن لم يكن هناك نمو، فليس turnaround
  
  // أداء حديث إيجابيّ (آخر 30 يوم)
  if (bars && bars.length >= 30) {
    const ret30 = ((bars[bars.length - 1].c - bars[bars.length - 30].c) / bars[bars.length - 30].c) * 100;
    if (ret30 > 10) score += 20;
    else if (ret30 > 5) score += 12;
    else if (ret30 < 0) score -= 10;
  }
  
  // ليس بـ debt مرتفع جداً (إلا فهو distressed)
  const debt = stk.debt || 0;
  if (debt < 0.6) score += 10;
  else if (debt > 0.75) score -= 20;
  
  // ليس بأداء كارثيّ في السنة الماضية
  if (bars && bars.length >= 60) {
    const ret60 = ((bars[bars.length - 1].c - bars[bars.length - 60].c) / bars[bars.length - 60].c) * 100;
    if (ret60 < -25) score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
}

// ════════════════════════════════════════════════════════════
//  MAIN API
// ════════════════════════════════════════════════════════════

/**
 * 🎯 كشف شخصيّة السهم - النموذج العلميّ المُحسَّن
 * 
 * ترتيب الأولويّات (مهمّ):
 *  ١. AVOID       -- تجنّب أوّلاً
 *  ٢. SPECULATIVE -- حذر شديد
 *  ٣. VALUE       -- قيمة مُكتشفة
 *  ٤. DIVIDEND    -- دخل ثابت
 *  ٥. TURNAROUND  -- احتمال انقلاب
 *  ٦. LEADER      -- قيادي
 *  ٧. GROWTH      -- نموّ
 *  ٨. NEUTRAL     -- افتراضيّ
 */
export function detectStockPersonality(stk: any, bars: any[]): PersonalityResult {
  if (!stk || !bars || bars.length < 20) {
    return {
      personality: 'NEUTRAL',
      confidence: 0,
      reasons: ['بيانات غير كافية للتصنيف'],
      metrics: {
        avgDailyMove: 0, volatility: 0, gapCount: 0, trendStrength: 0,
        qualityScore: 0, toxicityScore: 0, valueScore: 0,
        dividendScore: 0, momentumScore: 0, turnaroundScore: 0,
      },
    };
  }
  
  // حساب كل المقاييس
  const avgDailyMove = calcAvgDailyMove(bars);
  const volatility = calcVolatility(bars);
  const gapCount = countGaps(bars, 3);
  const trendStrength = calcTrendStrength(bars);
  const qualityScore = calcQualityScore(stk);
  const toxicityScore = calcToxicityScore(stk, bars);
  const valueScore = calcValueScore(stk);
  const dividendScore = calcDividendScore(stk);
  const momentumScore = calcMomentumScore(stk, bars);
  const turnaroundScore = calcTurnaroundScore(stk, bars);
  
  const metrics = {
    avgDailyMove: +avgDailyMove.toFixed(2),
    volatility: +volatility.toFixed(2),
    gapCount,
    trendStrength: +trendStrength.toFixed(1),
    qualityScore, toxicityScore, valueScore,
    dividendScore, momentumScore, turnaroundScore,
  };
  
  const reasons: string[] = [];
  
  // ═══ ① AVOID Check (الأولويّة العليا) ═══
  if (toxicityScore >= 55) {
    reasons.push(`درجة سمّيّة عالية (${toxicityScore}/100)`);
    if (stk.roe < 5) reasons.push(`ROE منخفض (${stk.roe || 0}%)`);
    if (stk.debt > 0.65) reasons.push(`دَين مرتفع (${((stk.debt || 0) * 100).toFixed(0)}%)`);
    return { personality: 'AVOID', confidence: Math.min(1, toxicityScore / 70), reasons, metrics };
  }
  
  // ═══ ② SPECULATIVE Check (حذر عالٍ) ═══
  const isSpeculative = 
    avgDailyMove > 3 &&
    gapCount >= 8 &&
    trendStrength < 30 &&
    momentumScore < 50;
  
  if (isSpeculative) {
    reasons.push(`حركة عالية (${avgDailyMove.toFixed(1)}%/يوم)`);
    reasons.push(`قفزات متكرّرة (${gapCount} قفزة)`);
    reasons.push(`اتّجاه ضعيف`);
    return {
      personality: 'SPECULATIVE',
      confidence: Math.min(1, (avgDailyMove / 5 + gapCount / 15) / 2),
      reasons, metrics,
    };
  }
  
  // ═══ ③ VALUE Check (Fama-French) ═══
  const isValue = 
    valueScore >= 55 &&
    toxicityScore < 35 &&
    qualityScore >= 40;  // ليس "value trap"
  
  if (isValue) {
    reasons.push(`قيمة مكتشفة (${valueScore}/100)`);
    if ((stk.pe || 99) < 13) reasons.push(`PE منخفض (${(stk.pe || 0).toFixed(1)})`);
    if ((stk.divY || 0) > 3) reasons.push(`توزيعات جيّدة (${stk.divY}%)`);
    return {
      personality: 'VALUE',
      confidence: Math.min(1, valueScore / 80),
      reasons, metrics,
    };
  }
  
  // ═══ ④ DIVIDEND Check (Aristocrat) ═══
  const isDividend = 
    dividendScore >= 60 &&
    toxicityScore < 30 &&
    avgDailyMove < 2;
  
  if (isDividend) {
    reasons.push(`موزّع ثابت (${dividendScore}/100)`);
    if ((stk.divY || 0) > 4) reasons.push(`عائد توزيع (${stk.divY}%)`);
    reasons.push(`حركة هادئة (${avgDailyMove.toFixed(1)}%/يوم)`);
    return {
      personality: 'DIVIDEND',
      confidence: Math.min(1, dividendScore / 85),
      reasons, metrics,
    };
  }
  
  // ═══ ⑤ TURNAROUND Check (Fallen Angel) ═══
  const isTurnaround = 
    turnaroundScore >= 55 &&
    toxicityScore < 45 &&
    (stk.epsGrw || 0) > 15;
  
  if (isTurnaround) {
    reasons.push(`احتمال انقلاب (${turnaroundScore}/100)`);
    reasons.push(`نموّ ربحيّ قويّ (${stk.epsGrw}%)`);
    if ((stk.roe || 0) < 10) reasons.push(`ROE في تحسّن`);
    return {
      personality: 'TURNAROUND',
      confidence: Math.min(1, turnaroundScore / 80),
      reasons, metrics,
    };
  }
  
  // ═══ ⑥ LEADER Check ═══
  const isLeader = 
    avgDailyMove < 1.8 &&
    qualityScore >= 60 &&
    toxicityScore < 30 &&
    (stk.mktCap || 0) >= 50;
  
  if (isLeader) {
    reasons.push(`قيادي مستقرّ`);
    reasons.push(`حركة بطيئة (${avgDailyMove.toFixed(1)}%/يوم)`);
    reasons.push(`جودة عالية (${qualityScore}/100)`);
    return {
      personality: 'LEADER',
      confidence: Math.min(1, qualityScore / 80),
      reasons, metrics,
    };
  }
  
  // ═══ ⑦ GROWTH Check ═══
  const isGrowth = 
    momentumScore >= 55 &&
    trendStrength >= 25 &&
    toxicityScore < 35;
  
  if (isGrowth) {
    reasons.push(`نموّ قويّ (${momentumScore}/100)`);
    reasons.push(`اتّجاه واضح (${trendStrength.toFixed(0)}/100)`);
    if ((stk.epsGrw || 0) >= 10) reasons.push(`نموّ ربحي (${stk.epsGrw}%)`);
    return {
      personality: 'GROWTH',
      confidence: Math.min(1, momentumScore / 80),
      reasons, metrics,
    };
  }
  
  // ═══ ⑧ Default: NEUTRAL ═══
  reasons.push('لا يطابق نموذجاً واضحاً');
  return {
    personality: 'NEUTRAL',
    confidence: 0.5,
    reasons, metrics,
  };
}

// ════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════

export function getPersonalityName(personality: StockPersonality): string {
  switch (personality) {
    case 'LEADER':      return 'قيادي';
    case 'GROWTH':      return 'نموّ';
    case 'VALUE':       return 'قيمة';
    case 'DIVIDEND':    return 'موزّع';
    case 'TURNAROUND':  return 'متحوّل';
    case 'SPECULATIVE': return 'مضاربي';
    case 'AVOID':       return 'يُتجنّب';
    case 'NEUTRAL':     return 'محايد';
    default:            return 'غير محدّد';
  }
}

export function getPersonalityIcon(personality: StockPersonality): string {
  switch (personality) {
    case 'LEADER':      return '🏛';
    case 'GROWTH':      return '🚀';
    case 'VALUE':       return '💎';
    case 'DIVIDEND':    return '💰';
    case 'TURNAROUND':  return '🔄';
    case 'SPECULATIVE': return '⚡';
    case 'AVOID':       return '⛔';
    case 'NEUTRAL':     return '➖';
    default:            return '?';
  }
}

export function getPersonalityColor(personality: StockPersonality): string {
  switch (personality) {
    case 'LEADER':      return '#f0c050';
    case 'GROWTH':      return '#10c97e';
    case 'VALUE':       return '#22d3ee';
    case 'DIVIDEND':    return '#a78bfa';
    case 'TURNAROUND':  return '#fb923c';
    case 'SPECULATIVE': return '#fbbf24';
    case 'AVOID':       return '#ef4444';
    case 'NEUTRAL':     return '#6b7280';
    default:            return '#06b6d4';
  }
}
