/**
 * @module engines/stockPersonality
 * @description كشف شخصية السهم -- Adaptive Strategy System
 *
 * 🎯 الهدف:
 * تحليل كل سهم وتصنيفه إلى شخصيّة تداوليّة:
 *  - LEADER:      قيادي ثقيل، حركة بطيئة، أساسيّات قويّة
 *  - GROWTH:      نموّ متفجّر، momentum قويّ
 *  - SPECULATIVE: مضاربي عنيف، تذبذب عالٍ
 *  - AVOID:       تجنّب (خاسر/سامّ)
 *
 * 📚 المبادئ العلميّة:
 *  - Behavioral Finance (Tversky & Kahneman)
 *  - Momentum vs Mean-Reversion classification
 *  - Volatility clustering (GARCH-inspired)
 *
 * @author تداول+
 * @version 1.0
 */

'use client';

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

export type StockPersonality = 'LEADER' | 'GROWTH' | 'SPECULATIVE' | 'AVOID' | 'NEUTRAL';

export interface PersonalityResult {
  personality: StockPersonality;
  confidence: number;        // 0-1, مدى الثقة في التصنيف
  reasons: string[];          // أسباب التصنيف (للعرض)
  metrics: {
    avgDailyMove: number;     // متوسّط الحركة اليوميّة %
    volatility: number;       // التذبذب
    gapCount: number;         // عدد القفزات
    trendStrength: number;    // قوّة الاتّجاه (ADX-like)
    qualityScore: number;     // درجة الجودة 0-100
    toxicityScore: number;    // درجة السمّيّة 0-100
  };
}

// ════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * حساب متوسّط الحركة اليوميّة المطلقة
 */
function calcAvgDailyMove(bars: any[]): number {
  if (!bars || bars.length < 5) return 0;
  const moves = bars.map(b => Math.abs(b.pct || 0));
  return moves.reduce((s, m) => s + m, 0) / moves.length;
}

/**
 * حساب التذبذب (standard deviation للحركة اليوميّة)
 */
function calcVolatility(bars: any[]): number {
  if (!bars || bars.length < 10) return 0;
  const moves = bars.map(b => b.pct || 0);
  const avg = moves.reduce((s, m) => s + m, 0) / moves.length;
  const variance = moves.reduce((s, m) => s + Math.pow(m - avg, 2), 0) / moves.length;
  return Math.sqrt(variance);
}

/**
 * عدّ القفزات (حركة > 3% في يوم واحد)
 */
function countGaps(bars: any[], threshold: number = 3): number {
  if (!bars || bars.length === 0) return 0;
  return bars.filter(b => Math.abs(b.pct || 0) > threshold).length;
}

/**
 * حساب قوّة الاتّجاه (تبسيط لـ ADX)
 */
function calcTrendStrength(bars: any[]): number {
  if (!bars || bars.length < 20) return 0;
  
  const closes = bars.map(b => b.c);
  const first = closes[0];
  const last = closes[closes.length - 1];
  const totalMove = Math.abs((last - first) / first) * 100;
  
  // مقارنة الحركة الإجماليّة بمجموع الحركات اليوميّة
  // اتّجاه قويّ = حركة إجماليّة كبيرة مقارنة بالتذبذب
  const totalDailyMoves = bars.reduce((s, b) => s + Math.abs(b.pct || 0), 0);
  
  if (totalDailyMoves === 0) return 0;
  const trendRatio = (totalMove / totalDailyMoves) * 100;
  
  // التحويل إلى مقياس 0-100 (شبيه بـ ADX)
  return Math.min(100, Math.max(0, trendRatio * 3));
}

/**
 * حساب درجة جودة الأساسيّات
 */
function calcQualityScore(stk: any): number {
  let score = 0;
  
  // ROE (نسبة العائد على حقوق المساهمين)
  const roe = stk.roe || 0;
  if (roe >= 20) score += 30;
  else if (roe >= 15) score += 25;
  else if (roe >= 10) score += 20;
  else if (roe >= 5) score += 10;
  
  // Debt (الدَين)
  const debt = stk.debt || 0.5;
  if (debt <= 0.2) score += 25;
  else if (debt <= 0.4) score += 20;
  else if (debt <= 0.6) score += 10;
  
  // PE (مكرّر الربحيّة)
  const pe = stk.pe || 20;
  if (pe > 0 && pe <= 15) score += 20;
  else if (pe > 0 && pe <= 25) score += 15;
  else if (pe > 0 && pe <= 35) score += 5;
  
  // EPS Growth
  const epsGrw = stk.epsGrw || 0;
  if (epsGrw >= 15) score += 25;
  else if (epsGrw >= 10) score += 20;
  else if (epsGrw >= 5) score += 10;
  else if (epsGrw >= 0) score += 5;
  
  return Math.min(100, score);
}

/**
 * حساب درجة السمّيّة (كلّما زادت، تجنّب أكثر)
 */
function calcToxicityScore(stk: any, bars: any[]): number {
  let score = 0;
  
  // ROE سالب أو ضعيف جداً
  const roe = stk.roe || 0;
  if (roe < 0) score += 35;
  else if (roe < 3) score += 25;
  else if (roe < 5) score += 15;
  
  // دَين مرتفع جداً
  const debt = stk.debt || 0;
  if (debt > 0.8) score += 30;
  else if (debt > 0.65) score += 20;
  else if (debt > 0.5) score += 10;
  
  // أداء كارثيّ
  if (bars && bars.length >= 60) {
    const firstPrice = bars[0].c;
    const lastPrice = bars[bars.length - 1].c;
    const totalReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (totalReturn < -30) score += 25;
    else if (totalReturn < -20) score += 15;
    else if (totalReturn < -10) score += 5;
  }
  
  // EPS Growth سلبيّ كبير
  const epsGrw = stk.epsGrw || 0;
  if (epsGrw < -20) score += 20;
  else if (epsGrw < -10) score += 10;
  
  return Math.min(100, score);
}

// ════════════════════════════════════════════════════════════
//  MAIN API
// ════════════════════════════════════════════════════════════

/**
 * 🎯 كشف شخصيّة السهم
 * 
 * يحلّل السلوك التداوليّ والأساسيّات لتحديد النوع:
 * - LEADER:      قيادي مستقرّ
 * - GROWTH:      نموّ متفجّر
 * - SPECULATIVE: مضاربي عنيف
 * - AVOID:       يُتجنّب
 * - NEUTRAL:     غير محدّد
 */
export function detectStockPersonality(stk: any, bars: any[]): PersonalityResult {
  // حماية ضدّ البيانات الناقصة
  if (!stk || !bars || bars.length < 20) {
    return {
      personality: 'NEUTRAL',
      confidence: 0,
      reasons: ['بيانات غير كافية للتصنيف'],
      metrics: {
        avgDailyMove: 0,
        volatility: 0,
        gapCount: 0,
        trendStrength: 0,
        qualityScore: 0,
        toxicityScore: 0,
      },
    };
  }
  
  // حساب المقاييس
  const avgDailyMove = calcAvgDailyMove(bars);
  const volatility = calcVolatility(bars);
  const gapCount = countGaps(bars, 3);
  const trendStrength = calcTrendStrength(bars);
  const qualityScore = calcQualityScore(stk);
  const toxicityScore = calcToxicityScore(stk, bars);
  
  const metrics = {
    avgDailyMove: +avgDailyMove.toFixed(2),
    volatility: +volatility.toFixed(2),
    gapCount,
    trendStrength: +trendStrength.toFixed(1),
    qualityScore,
    toxicityScore,
  };
  
  const reasons: string[] = [];
  
  // ═══ ① AVOID Check (الأولويّة العليا) ═══
  if (toxicityScore >= 50) {
    reasons.push(`درجة سمّيّة عالية (${toxicityScore}/100)`);
    if (stk.roe < 5) reasons.push(`ROE منخفض (${stk.roe || 0}%)`);
    if (stk.debt > 0.65) reasons.push(`دَين مرتفع (${((stk.debt || 0) * 100).toFixed(0)}%)`);
    
    return {
      personality: 'AVOID',
      confidence: Math.min(1, toxicityScore / 70),
      reasons,
      metrics,
    };
  }
  
  // ═══ ② LEADER Check ═══
  const isLeader = 
    avgDailyMove < 1.8 &&
    qualityScore >= 60 &&
    toxicityScore < 30 &&
    (stk.mktCap || 0) >= 50;
  
  if (isLeader) {
    reasons.push(`حركة بطيئة (${avgDailyMove.toFixed(1)}%/يوم)`);
    reasons.push(`جودة عالية (${qualityScore}/100)`);
    if (stk.roe >= 15) reasons.push(`ROE ممتاز (${stk.roe}%)`);
    if (stk.mktCap >= 100) reasons.push(`حجم كبير (${stk.mktCap}مليار)`);
    
    return {
      personality: 'LEADER',
      confidence: Math.min(1, qualityScore / 80),
      reasons,
      metrics,
    };
  }
  
  // ═══ ③ SPECULATIVE Check ═══
  const isSpeculative = 
    avgDailyMove > 3 &&
    gapCount >= 8 &&
    trendStrength < 30;
  
  if (isSpeculative) {
    reasons.push(`حركة عالية (${avgDailyMove.toFixed(1)}%/يوم)`);
    reasons.push(`قفزات متكرّرة (${gapCount} في الفترة)`);
    reasons.push(`اتّجاه ضعيف (${trendStrength.toFixed(0)}/100)`);
    
    return {
      personality: 'SPECULATIVE',
      confidence: Math.min(1, (avgDailyMove / 5 + gapCount / 15) / 2),
      reasons,
      metrics,
    };
  }
  
  // ═══ ④ GROWTH Check ═══
  const isGrowth = 
    avgDailyMove >= 1.8 &&
    avgDailyMove <= 3.5 &&
    trendStrength >= 25 &&
    ((stk.epsGrw || 0) >= 10 || qualityScore >= 50);
  
  if (isGrowth) {
    reasons.push(`حركة متوسّطة (${avgDailyMove.toFixed(1)}%/يوم)`);
    reasons.push(`اتّجاه واضح (${trendStrength.toFixed(0)}/100)`);
    if ((stk.epsGrw || 0) >= 10) reasons.push(`نموّ ربحيّ (${stk.epsGrw}%)`);
    
    return {
      personality: 'GROWTH',
      confidence: Math.min(1, trendStrength / 60),
      reasons,
      metrics,
    };
  }
  
  // ═══ ⑤ Default: NEUTRAL ═══
  reasons.push('لا يطابق نموذجاً واضحاً');
  reasons.push(`حركة: ${avgDailyMove.toFixed(1)}%/يوم`);
  reasons.push(`اتّجاه: ${trendStrength.toFixed(0)}/100`);
  
  return {
    personality: 'NEUTRAL',
    confidence: 0.5,
    reasons,
    metrics,
  };
}

// ════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * اسم الشخصيّة بالعربيّة
 */
export function getPersonalityName(personality: StockPersonality): string {
  switch (personality) {
    case 'LEADER':      return 'قيادي';
    case 'GROWTH':      return 'نموّ';
    case 'SPECULATIVE': return 'مضاربي';
    case 'AVOID':       return 'يُتجنّب';
    case 'NEUTRAL':     return 'محايد';
    default:            return 'غير محدّد';
  }
}

/**
 * أيقونة الشخصيّة
 */
export function getPersonalityIcon(personality: StockPersonality): string {
  switch (personality) {
    case 'LEADER':      return '🏛';
    case 'GROWTH':      return '🚀';
    case 'SPECULATIVE': return '⚡';
    case 'AVOID':       return '⛔';
    case 'NEUTRAL':     return '➖';
    default:            return '?';
  }
}

/**
 * لون الشخصيّة
 */
export function getPersonalityColor(personality: StockPersonality): string {
  switch (personality) {
    case 'LEADER':      return '#f0c050';  // ذهبيّ
    case 'GROWTH':      return '#10c97e';  // أخضر
    case 'SPECULATIVE': return '#fbbf24';  // برتقاليّ-أصفر
    case 'AVOID':       return '#ef4444';  // أحمر
    case 'NEUTRAL':     return '#6b7280';  // رمادي
    default:            return '#06b6d4';
  }
}
