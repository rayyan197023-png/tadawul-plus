/**
 * ═══════════════════════════════════════════════════════════════
 * Position Engine - Smart Stop Loss + Take Profit + Management
 * 
 * Mathematical Foundations:
 * - ATR-based dynamic stops
 * - Risk/Reward optimization
 * - Volatility-adjusted exits
 * - Multiple target levels
 * - Time-based decay
 * 
 * Used by: PortfolioScreen, AnalysisScreen
 * @version 2.0 (TypeScript)
 * ═══════════════════════════════════════════════════════════════
 */

import { loadFeedbackState } from './analysisEngine';

// ═══════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════

export interface Bar {
  t?: number;
  o?: number;
  h?: number;
  l?: number;
  lo?: number;
  low?: number;
  c: number;
  v?: number;
  vol?: number;
}

export interface Health {
  score?: number;
  grade?: string;
  sig?: string;
  regime?: string;
  layers?: { [key: string]: number };
  extras?: {
    atrPct?: number;
    vr?: number;
    [key: string]: any;
  };
}

export interface Position {
  sym: string;
  qty: number;
  avgCost?: number;
  curPrice?: number;
  value?: number;
  entryDate?: string;
  stk?: {
    name?: string;
    sec?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface StopLossResult {
  stopPrice: number;
  stopPct: number;
  method: string;
  distance: number;
  reason: string;
}

export interface TakeProfitTarget {
  price: number;
  pct: number;
  rr: number;
  sell: number;
}

export interface TakeProfitResult {
  t1: TakeProfitTarget;
  t2: TakeProfitTarget;
  t3: TakeProfitTarget;
  expectedRR: string;
  // ✨ متوسط R:R مرجّح بنسب البيع -- الاسم الأصدق (expectedRR مُبقى للتوافق)
  weightedRR?: string;
}

export interface TrailingStopResult {
  price: number;
  pct: number;
  distance: number;
  locked: string;
  isLocked: boolean;
}

export interface PositionHealthComponents {
  signal: number;
  pnl: number;
  stop: number;
  time: number;
  volume: number;
  trend: number;
  regime: number;
}

export interface PositionHealthResult {
  composite: number;
  components: PositionHealthComponents;
  daysHeld: number;
  pnlPct: number;
  distanceToStop: number;
  grade: string;
  label: string;
}

export type Urgency = 'low' | 'medium' | 'high' | 'critical';

export interface SmartActionResult {
  action: string;
  percent: number;
  color: string;
  urgency: Urgency;
  confidence: number;
  reason: string;
  positionHealth: PositionHealthResult;
  stopData: StopLossResult;
  trailingStop: TrailingStopProResult | null;
  targets: TakeProfitResult | null;
  metadata: {
    pnlPct: number;
    daysHeld: number;
    grade: string;
    signal: string;
    score: number;
  };
}

export interface BalanceIssue {
  severity: 'low' | 'medium' | 'high';
  type: string;
  sym?: string;
  message: string;
}

export interface BalanceRecommendation {
  sym?: string;
  action: string;
  message: string;
}

export interface PortfolioBalanceResult {
  score: number;
  grade: string;
  label: string;
  issues: BalanceIssue[];
  recommendations: BalanceRecommendation[];
  sectorBreakdown: { [sector: string]: number };
  positionCount: number;
}

// ═══════════════════════════════════════════════════════
// 🛑 SMART STOP LOSS
// ═══════════════════════════════════════════════════════

/**
 * ✨ Smart Stop Loss Calculator
 * 
 * Uses 3 methods + picks the smartest:
 * 1. ATR-based (volatility-adjusted)
 * 2. Support-based (technical levels)
 * 3. Percentage-based (fixed %)
 * 
 * Returns the most conservative (highest) stop
 */
export function calcSmartStopLoss(
  entryPrice: number,
  currentPrice: number,
  health: Health | null,
  bars: Bar[] | null
): StopLossResult {
  if (!entryPrice || !currentPrice || !bars || bars.length < 14) {
    return {
      stopPrice: entryPrice * 0.93,
      stopPct: -7,
      method: 'default',
      distance: 7,
      reason: 'بيانات غير كافية - حد افتراضي -7%'
    };
  }
  
  const atr = health?.extras?.atrPct 
    ? (health.extras.atrPct / 100) * currentPrice 
    : currentPrice * 0.015;
  const regime = health?.regime || 'chop';
  
  // ① ATR-based stop (Bloomberg standard)
  const atrMultiplier = regime === 'volatile' ? 3.0 
                      : regime === 'news-driven' ? 2.8
                      : regime === 'bear' ? 2.5
                      : regime === 'sideways' ? 2.2
                      : 2.5;
  const atrStop = entryPrice - (atr * atrMultiplier);
  const atrStopPct = ((atrStop - entryPrice) / entryPrice) * 100;
  
  // ② Support-based stop (recent low - 1%)
    // ✨ نقبل كل صيغ حقل القاع (lo / low / l) -- يمنع سقوط support stop لـ entryPrice صامتاً
  const last20Bars = bars.slice(-20);
  const recentLow = Math.min(...last20Bars.map(b => {
    var low = b.lo != null ? b.lo : (b.low != null ? b.low : (b.l != null ? b.l : null));
    return low != null ? low : entryPrice;
  }));
  const supportStop = recentLow * 0.99;
  const supportStopPct = ((supportStop - entryPrice) / entryPrice) * 100;
  
  // ③ Percentage-based stop
  const score = health?.score || 50;
  let pctStopValue = score >= 75 ? -8 : score >= 60 ? -6 : -4;
  
  // ✨ AI Learning: تعديل خفي بناءً على دقة التعلم لهذا السهم
  try {
    const sym = (health as any)?.sym;
    if (sym) {
      const feedback = loadFeedbackState();
      const symData = feedback?.[sym];
      if (symData && symData.total >= 3) {
        const accuracy = symData.correct / symData.total;
        if (accuracy >= 0.70) {
          pctStopValue *= 1.15;  // النظام دقيق → اعطِ مساحة
        } else if (accuracy < 0.40) {
          pctStopValue *= 0.85;  // النظام غير دقيق → احذر
        }
      }
    }
  } catch (e) {}
  const pctStop = entryPrice * (1 + pctStopValue / 100);
  
  // ④ Pick the smartest
  const candidates = [
    { stop: atrStop, pct: atrStopPct, method: 'ATR' },
    { stop: supportStop, pct: supportStopPct, method: 'Support' },
    { stop: pctStop, pct: pctStopValue, method: 'Percentage' },
  ].filter(c => c.pct >= -12 && c.pct <= -2);
  
  const best = candidates.length > 0 
    ? candidates.reduce((a, b) => a.stop > b.stop ? a : b)
    : { stop: entryPrice * 0.94, pct: -6, method: 'Default' };
  
  return {
    stopPrice: +best.stop.toFixed(2),
    stopPct: +best.pct.toFixed(1),
    method: best.method,
    distance: Math.abs(best.pct),
    reason: `حد خسارة ذكي (${best.method}): ${best.pct.toFixed(1)}%`,
  };
}

// ═══════════════════════════════════════════════════════
// 🎯 SMART TAKE PROFIT
// ═══════════════════════════════════════════════════════

/**
 * ✨ Smart Take Profit Calculator
 * 
 * Uses R:R ratios + Multiple targets:
 * - T1: 1.5R (33% profit taking)
 * - T2: 2.5R (33% profit taking)
 * - T3: 4.0R (final 34%)
 */
export function calcSmartTakeProfit(
  entryPrice: number,
  stopPrice: number,
  health: Health | null,
  bars: Bar[] | null
): TakeProfitResult | null {
  if (!entryPrice || !stopPrice) {
    return null;
  }
  
  const risk = entryPrice - stopPrice;
  const score = health?.score || 50;
  const grade = health?.grade || 'C';
  const regime = health?.regime || 'chop';

  // ✨ ATR الفعلي للسهم
  const atrPct = health?.extras?.atrPct || 2.0;

  // ✨ تعديل R:R بناءً على ATR + Grade + Regime
  // سهم متقلب (ATR عالٍ) → أهداف أبعد
  // سهم هادئ (ATR منخفض) → أهداف أقرب وأكثر واقعية
  const atrMult = atrPct > 3.0 ? 1.3    // متقلب جداً
                : atrPct > 2.0 ? 1.15   // متقلب
                : atrPct > 1.0 ? 1.0    // طبيعي
                : 0.85;                  // هادئ

  // تعديل الـ Regime
  const regimeMult = regime === 'bull'        ? 1.2
                   : regime === 'bear'        ? 0.8
                   : regime === 'volatile'    ? 1.1
                   : regime === 'sideways'    ? 0.9
                   : 1.0;

  // R:R الأساسي حسب Grade
    let baseRR1 = grade === 'S' || grade === 'A' ? 2.0 : 1.5;
  let baseRR2 = grade === 'S' || grade === 'A' ? 3.0 : 2.5;
  let baseRR3 = grade === 'S' ? 5.0 : grade === 'A' ? 4.5 : 4.0;
  
  // ✨ AI Learning: تعديل الأهداف بناءً على دقة التعلم
  try {
    const sym = (health as any)?.sym;
    if (sym) {
      const feedback = loadFeedbackState();
      const symData = feedback?.[sym];
      if (symData && symData.total >= 3) {
        const accuracy = symData.correct / symData.total;
        if (accuracy >= 0.70) {
          // النظام دقيق → ارفع الأهداف 10%
          baseRR1 *= 1.10;
          baseRR2 *= 1.10;
          baseRR3 *= 1.10;
        } else if (accuracy < 0.40) {
          // النظام غير دقيق → أهداف أقرب 10%
          baseRR1 *= 0.90;
          baseRR2 *= 0.90;
          baseRR3 *= 0.90;
        }
      }
    }
  } catch (e) {}

  // ✨ R:R النهائي مع تعديل ATR + Regime
  // حدّ أدنى صارم: T1≥1.5, T2≥2.0, T3≥3.0 -- يمنع أهدافاً بنسبة ~1:1 تكسر مبدأ R:R
  const rr1 = +Math.max(1.5, baseRR1 * atrMult * regimeMult).toFixed(2);
  const rr2 = +Math.max(2.0, baseRR2 * atrMult * regimeMult).toFixed(2);
  const rr3 = +Math.max(3.0, baseRR3 * atrMult * regimeMult).toFixed(2);

  const t1 = entryPrice + (risk * rr1);
  const t2 = entryPrice + (risk * rr2);
  const t3 = entryPrice + (risk * rr3);
  
  return {
    t1: { 
      price: +t1.toFixed(2), 
      pct: +((t1 - entryPrice) / entryPrice * 100).toFixed(1), 
      rr: rr1, 
      sell: 33 
    },
    t2: { 
      price: +t2.toFixed(2), 
      pct: +((t2 - entryPrice) / entryPrice * 100).toFixed(1), 
      rr: rr2, 
      sell: 33 
    },
    t3: { 
      price: +t3.toFixed(2), 
      pct: +((t3 - entryPrice) / entryPrice * 100).toFixed(1), 
      rr: rr3, 
      sell: 34 
    },
    // ✨ متوسط R:R مرجّح بنسب البيع (33/33/34) -- ليس "العائد المتوقّع".
    // يفترض بلوغ الأهداف الثلاثة؛ الأهداف الأبعد (T2/T3) قد لا تتحقّق.
    weightedRR: ((rr1 * 0.33 + rr2 * 0.33 + rr3 * 0.34)).toFixed(1),
    expectedRR: ((rr1 * 0.33 + rr2 * 0.33 + rr3 * 0.34)).toFixed(1), // مُبقى للتوافق العكسي
  };
}


// ═══════════════════════════════════════════════════════
// 🏔️ PROFESSIONAL TRAILING STOP -- Chandelier Exit
// ═══════════════════════════════════════════════════════

export interface TrailingStopProResult {
  stopPrice: number;
  stopPct: number;
  mode: 'fixed' | 'trailing';
  stockType: 'قيادي' | 'مضاربي';
  atrMultiplier: number;
  atr: number;
  highestSinceEntry: number;
  distanceFromHighPct: number;
  lockedProfitPct: number | null;
  reason: string;
}

/**
 * ✨ Professional Trailing Stop -- Chandelier Exit
 * المنهجية: Wilder's ATR (1978) + Chandelier Exit (Le Beau / Elder)
 *
 * المبدأ:
 * 1) السعر ≤ سعر الشراء  → الوقف ثابت (مرتكز على سعر الشراء، لا يهبط مع نزول السعر)
 * 2) السعر > سعر الشراء  → الوقف يتسلّق خلف أعلى سعر مُسجَّل منذ الشراء
 * 3) Ratchet: لأن "أعلى سعر منذ الشراء" رقم تصاعدي دائماً، الوقف لا يتراجع أبداً
 *
 * تصنيف نوع السهم من القيمة السوقية (نفس عتبة 50 مليار المستخدمة في بقية المحرك):
 * - قيادي  (≥50 مليار): 2.5× ATR -- تذبذب أقل، وقف أضيق نسبياً
 * - مضاربي (<50 مليار): 3.5× ATR -- تذبذب أعلى، يحتاج مساحة أكبر لتفادي الإخراج بالضوضاء
 */
export function calcProfessionalTrailingStop(
  position: Position,
  bars: Bar[] | null,
  health: Health | null
): TrailingStopProResult | null {
  const entryPrice = position.avgCost || 0;
  const currentPrice = position.curPrice || entryPrice;
  if (!entryPrice || !currentPrice) return null;

  // ① الوقف الثابت المرتكز على سعر الشراء (calcSmartStopLoss أصلاً ترتكز كل
  //    طرقها الثلاث على entryPrice وليس currentPrice -- لذا هي "ثابتة" طبيعياً)
  const fixedStop = calcSmartStopLoss(entryPrice, currentPrice, health, bars);

  // ② تصنيف نوع السهم
  const mktCapB = (position.stk && (position.stk as any).mktCap) || 0;
  const isLeading = mktCapB >= 50;
  const stockType: 'قيادي' | 'مضاربي' = isLeading ? 'قيادي' : 'مضاربي';
  const atrMultiplier = isLeading ? 2.5 : 3.5;

  // ③ ATR الفعلي
  const atr = health?.extras?.atrPct
    ? (health.extras.atrPct / 100) * currentPrice
    : currentPrice * 0.015;

  // ④ أعلى سعر مُسجَّل منذ الشراء (من البيانات الحقيقية + السعر الحي)
  let highestSinceEntry = currentPrice;
  if (bars && bars.length > 0) {
    const entryTime = position.entryDate ? new Date(position.entryDate).getTime() : 0;
    bars.forEach((b: any) => {
      const barTime = b.t ? new Date(b.t).getTime() : 0;
      if (!entryTime || barTime >= entryTime) {
        const hi = b.hi != null ? b.hi : (b.h != null ? b.h : b.c);
        if (hi != null && hi > highestSinceEntry) highestSinceEntry = hi;
      }
    });
  }

  // ⑤ في خسارة/تعادل: الوقف الثابت فقط -- لا يهبط مع تراجع السعر
  if (currentPrice <= entryPrice) {
    return {
      stopPrice: fixedStop.stopPrice,
      stopPct: fixedStop.stopPct,
      mode: 'fixed',
      stockType, atrMultiplier,
      atr: +atr.toFixed(3),
      highestSinceEntry: +highestSinceEntry.toFixed(2),
      distanceFromHighPct: 0,
      lockedProfitPct: null,
      reason: `وقف ثابت (${stockType}) عند ${fixedStop.stopPct.toFixed(1)}% -- لم يُفعَّل التتبّع بعد`,
    };
  }

  // ⑥ في ربح: الوقف يتسلّق خلف القمة، بحدّ أدنى = الوقف الثابت (ratchet)
  const trailingStopRaw = highestSinceEntry - atr * atrMultiplier;
  const finalStop = Math.max(fixedStop.stopPrice, trailingStopRaw);
  const stopPct = +(((finalStop - entryPrice) / entryPrice) * 100).toFixed(1);
  const lockedProfitPct = finalStop > entryPrice ? stopPct : null;

  return {
    stopPrice: +finalStop.toFixed(2),
    stopPct,
    mode: 'trailing',
    stockType, atrMultiplier,
    atr: +atr.toFixed(3),
    highestSinceEntry: +highestSinceEntry.toFixed(2),
    distanceFromHighPct: +(((highestSinceEntry - finalStop) / highestSinceEntry) * 100).toFixed(1),
    lockedProfitPct,
    reason: lockedProfitPct !== null
      ? `وقف متحرك (${stockType}) -- أرباح مؤمّنة +${lockedProfitPct.toFixed(1)}%`
      : `وقف متحرك (${stockType}) يتسلّق خلف القمة -- لم يتجاوز سعر الشراء بصافي بعد`,
  };
}

// ═══════════════════════════════════════════════════════
// 💚 POSITION HEALTH
// ═══════════════════════════════════════════════════════

/**
 * ✨ Position Health Score (0-100)
 * 
 * Combines 7 factors:
 * 1. Signal strength (25%)
 * 2. Profit/Loss status (20%)
 * 3. Stop loss proximity (15%)
 * 4. Time in position (10%)
 * 5. Volume confirmation (10%)
 * 6. Trend alignment (10%)
 * 7. Market regime (10%)
 */
export function calcPositionHealth(
  position: Position | null,
  health: Health | null,
  bars: Bar[] | null
): PositionHealthResult | null {
  if (!position || !health) return null;
  
  // ✨ AI Learning: ضمان وصول sym
  if (health && position?.sym && !(health as any).sym) {
    (health as any).sym = position.sym;
  }
  
  const entryPrice = position.avgCost || 0;
  const currentPrice = position.curPrice || entryPrice;
  const pnlPct = entryPrice > 0 
    ? ((currentPrice - entryPrice) / entryPrice) * 100 
    : 0;
  const score = health.score || 50;
  const sig = health.sig || 'محايد';
  const regime = health.regime || 'chop';
  const layers = health.layers || {};
  
  const entryDate = position.entryDate ? new Date(position.entryDate) : new Date();
  const today = new Date();
  const daysHeld = Math.max(0, Math.floor(
    (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  // ① Signal strength (25%)
  const signalScore = sig === 'شراء قوي' ? 100
                    : sig === 'مراقبة' ? 70
                    : sig === 'محايد' ? 50
                    : sig === 'تخفيف' ? 25
                    : 10;
  
  // ② Profit/Loss status (20%)
  let pnlScore: number;
  if (pnlPct >= 15) pnlScore = 100;
  else if (pnlPct >= 5) pnlScore = 80;
  else if (pnlPct >= 0) pnlScore = 60;
  else if (pnlPct >= -3) pnlScore = 40;
  else if (pnlPct >= -7) pnlScore = 20;
  else pnlScore = 5;
  
  // ③ Stop loss proximity (15%) -- الوقف المتحرك الفعلي إن توفّر
  const trailingStopPH = calcProfessionalTrailingStop(position, bars, health);
  const stopData = trailingStopPH || calcSmartStopLoss(entryPrice, currentPrice, health, bars);
  const distanceToStop = ((currentPrice - stopData.stopPrice) / currentPrice) * 100;

  const stopScore = distanceToStop > 5 ? 100
                  : distanceToStop > 3 ? 75
                  : distanceToStop > 1 ? 40
                  : 10;
  
  // ④ Time in position (10%)
  const timeScore = pnlPct > 0 
    ? (daysHeld < 5 ? 70 : daysHeld < 20 ? 90 : daysHeld < 60 ? 80 : 60)
    : (daysHeld < 5 ? 80 : daysHeld < 20 ? 50 : daysHeld < 60 ? 30 : 10);
  
  // ⑤ Volume confirmation (10%)
  const vr = health?.extras?.vr || 1.0;
  const volScore = vr > 1.3 ? 90 : vr > 1.0 ? 70 : vr > 0.7 ? 50 : 30;
  
  // ⑥ Trend alignment (10%)
  const L1 = layers.L1 || 50;
  const L4 = layers.L4 || 50;
  const trendScore = (L1 + L4) / 2;
  
  // ⑦ Market regime (10%)
  const regimeScore = regime === 'bull' ? 90
                    : regime === 'sideways' ? 60
                    : regime === 'bear' ? 30
                    : regime === 'volatile' ? 25
                    : 50;
  
  const composite = Math.round(
    signalScore * 0.25 +
    pnlScore * 0.20 +
    stopScore * 0.15 +
    timeScore * 0.10 +
    volScore * 0.10 +
    trendScore * 0.10 +
    regimeScore * 0.10
  );
  
  return {
    composite,
    components: {
      signal: signalScore,
      pnl: pnlScore,
      stop: stopScore,
      time: timeScore,
      volume: volScore,
      trend: Math.round(trendScore),
      regime: regimeScore,
    },
    daysHeld,
    pnlPct: +pnlPct.toFixed(1),
    distanceToStop: +distanceToStop.toFixed(1),
    grade: composite >= 85 ? 'S'
         : composite >= 70 ? 'A'
         : composite >= 55 ? 'B'
         : composite >= 40 ? 'C'
         : composite >= 25 ? 'D' : 'F',
    label: composite >= 80 ? 'مركز ممتاز'
         : composite >= 65 ? 'مركز جيد'
         : composite >= 50 ? 'مركز متوسط'
         : composite >= 35 ? 'مركز ضعيف'
         : 'مركز خطر',
  };
}

// ═══════════════════════════════════════════════════════
// 🎯 SMART ACTION
// ═══════════════════════════════════════════════════════

/**
 * ✨ Smart Action Recommendation
 * 
 * Uses Position Health + Signal + P&L to recommend:
 * - زيادة المركز
 * - احتفاظ
 * - بيع جزئي (25% / 33% / 50% / 75%)
 * - بيع كامل
 * - وقف خسارة فوري
 */
export function calcSmartAction(
  position: Position,
  health: Health | null,
  bars: Bar[] | null,
  riskGate: string | null
): SmartActionResult | null {
  // ✨ AI Learning: نضيف sym لـ health ليصل للدوال الفرعية
  if (health && position?.sym) {
    (health as any).sym = position.sym;
  }
  
  const positionHealth = calcPositionHealth(position, health, bars);
  if (!positionHealth) return null;
  
  const entryPrice = position.avgCost || 0;
  const currentPrice = position.curPrice || entryPrice;
  const pnlPct = positionHealth.pnlPct;
  const sig = health?.sig || 'محايد';
  const score = health?.score || 50;
  const composite = positionHealth.composite;
  
  const stopData = calcSmartStopLoss(entryPrice, currentPrice, health, bars); // مرجع لحساب الأهداف R-multiple
  const trailingStop = calcProfessionalTrailingStop(position, bars, health);  // ✨ نقطة الخروج الفعلية
  const targets = calcSmartTakeProfit(entryPrice, stopData.stopPrice, health, bars);
  const activeStop = trailingStop || stopData;
  
  let action: string;
  let percent: number;
  let color: string;
  let urgency: Urgency;
  let reason: string;
  let confidence: number;
  
  if (riskGate === 'DANGER') {
    action = 'بيع كامل';
    percent = 100;
    color = '#ff5f6a';
    urgency = 'critical';
    confidence = 95;
    reason = '🚨 السوق في خطر نظامي - أغلق فوراً';
  }
  else if (currentPrice <= activeStop.stopPrice) {
    action = 'وقف خسارة';
    percent = 100;
    color = '#ff5f6a';
    urgency = 'critical';
    confidence = 100;
    reason = trailingStop && trailingStop.mode === 'trailing'
      ? `🛑 اخترق الوقف المتحرك (${activeStop.stopPct.toFixed(1)}%) -- أغلق واحتفظ بالأرباح المؤمّنة`
      : `🛑 السعر اخترق Stop Loss (${activeStop.stopPct.toFixed(1)}%) - أغلق المركز`;
  }

  else if (targets && currentPrice >= targets.t3.price) {
    action = 'بيع كامل';
    percent = 100;
    color = '#1ee68a';
    urgency = 'high';
    confidence = 90;
    reason = `🎯 وصل T3 (+${targets.t3.pct}%) - احجز الأرباح كاملة`;
  }
  else if (targets && currentPrice >= targets.t2.price) {
    action = 'بيع 50%';
    percent = 50;
    color = '#10c97e';
    urgency = 'high';
    confidence = 85;
    reason = `🎯 وصل T2 (+${targets.t2.pct}%) - احجز نصف الأرباح`;
  }
  else if (targets && currentPrice >= targets.t1.price) {
    action = 'بيع 33%';
    percent = 33;
    color = '#22d3ee';
    urgency = 'medium';
    confidence = 80;
    reason = `🎯 وصل T1 (+${targets.t1.pct}%) - احجز ثلث الأرباح`;
  }
  else if (sig === 'شراء قوي' && score >= 80 && composite >= 75 && pnlPct < 5) {
    action = 'زد المركز';
    percent = 25;
    color = '#1ee68a';
    urgency = 'medium';
    confidence = 85;
    reason = `🚀 إشارة قوية + مركز ممتاز - زد ${25}% للحجم المثالي`;
  }
  else if (composite < 40 && pnlPct < -3) {
    action = 'بيع 50%';
    percent = 50;
    color = '#fbbf24';
    urgency = 'high';
    confidence = 75;
    reason = `⚠️ المركز يتدهور (${positionHealth.label}) - قلّل المخاطرة`;
  }
  else if (sig === 'تخفيف' && pnlPct > 5) {
    action = 'بيع 50%';
    percent = 50;
    color = '#fbbf24';
    urgency = 'medium';
    confidence = 75;
    reason = `📉 الإشارة ضعفت + ربح ${pnlPct.toFixed(1)}% - احجز جزءاً`;
  }
  else if (positionHealth.daysHeld > 30 && pnlPct < -2 && composite < 50) {
    action = 'بيع كامل';
    percent = 100;
    color = '#ff5f6a';
    urgency = 'high';
    confidence = 70;
    reason = `⏰ مركز قديم (${positionHealth.daysHeld} يوم) + خاسر - استبدله`;
  }
  else {
    action = 'احتفظ';
    percent = 0;
    color = '#22d3ee';
    urgency = 'low';
    confidence = composite >= 60 ? 75 : 50;
    reason = composite >= 70 
      ? `✓ المركز جيد - استمر` 
      : `📊 لا حاجة للتحرك الآن`;
  }
  
  return {
    action,
    percent,
    color,
    urgency,
    confidence,
    reason,
    positionHealth,
    stopData,
    trailingStop,
    targets,

    metadata: {
      pnlPct: positionHealth.pnlPct,
      daysHeld: positionHealth.daysHeld,
      grade: positionHealth.grade,
      signal: sig,
      score,
    },
  };
}

