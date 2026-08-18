'use client';
/**
 * @module engines/strategyFitness
 * @description قياس جودة الاستراتيجيات (Fitness Function)
 *
 * 🎯 الهدف:
 * تحويل نتائج باك-تيست إلى رقم واحد (fitness) يُحدّد جودة الاستراتيجية.
 *
 * 📚 المعادلة العلمية:
 * fitness = 
 *   + CAGR_norm        × 0.30   (العائد السنوي)
 *   + Alpha_norm       × 0.25   (التفوّق على TASI - Jensen 1968)
 *   + Sortino_norm     × 0.15   (كفاءة المخاطر - Sortino & Price 1994)
 *   + WinRate_norm     × 0.10   (الاستقرار)
 *   − MaxDD_penalty    × 0.15   (عقوبة التراجع - Young 1991)
 *   − Stability_penalty × 0.05  (عقوبة التذبذب - Grinold & Kahn 2000)
 *   − Significance_penalty       (عقوبة قلّة الصفقات - Bailey & López de Prado 2014)
 *
 * 🏆 نظام Tier:
 * - Legendary  : CAGR ≥ 80% AND Alpha ≥ 60%
 * - Excellent  : CAGR ≥ 50% AND Alpha ≥ 30%
 * - Good       : CAGR ≥ 25% AND Alpha ≥ 10%
 * - Acceptable : CAGR ≥ 15% AND Alpha ≥ 5%
 * - Below      : أقلّ من ذلك
 *
 * @author تداول+
 * @version 1.0
 */

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

export type FitnessTier = 'Legendary' | 'Excellent' | 'Good' | 'Acceptable' | 'Below';

export interface FitnessBreakdown {
  cagrContrib: number;
  alphaContrib: number;
  sortinoContrib: number;
  winRateContrib: number;
  ddPenalty: number;
  stabilityPenalty: number;
  significancePenalty: number;
  rawFitness: number;
  finalFitness: number;
}

export interface FitnessResult {
  fitness: number;             // الرقم النهائي (للترتيب)
  tier: FitnessTier;
  tierIcon: string;
  tierColor: string;
  tierDescription: string;
  breakdown: FitnessBreakdown;
  warnings: string[];           // تحذيرات (overfitting hints, etc.)
  metrics: {
    cagr: number;
    alpha: number;
    sortino: number;
    sharpe: number;
    winRate: number;
    maxDD: number;
    totalTrades: number;
    closedTrades: number;
  };
}

/**
 * مدخلات الـ fitness function
 * تأتي من نتيجة backtest()
 */
export interface BacktestMetrics {
  // العوائد
  totalReturn?: number;        // %
  annualReturn?: number;       // % (CAGR)
  
  // مقارنة TASI
  alpha?: number;              // الفرق السنوي (يُحسب من compareWithBenchmark)
  
  // المخاطر
  sharpe?: number;
  sortino?: number;
  maxDrawdown?: number;        // سالب (مثل -15.5)
  volatility?: number;
  
  // الصفقات
  totalTrades?: number;
  closedTrades?: number;
  winRate?: number;            // %
  winningTrades?: number;
  losingTrades?: number;
  avgWin?: number;
  avgLoss?: number;
  profitFactor?: number | null;
  
  // الأيام
  totalDays?: number;
  years?: number;
  positiveDaysPct?: number;
  
  // للحساب الإضافي
  dailyReturns?: number[];     // لحساب stability
}

// ════════════════════════════════════════════════════════════
//  CONFIG - أوزان المعادلة
// ════════════════════════════════════════════════════════════

const FITNESS_WEIGHTS = {
  cagr: 0.30,
  alpha: 0.25,
  sortino: 0.15,
  winRate: 0.10,
  maxDD: 0.15,         // كعقوبة (تُطرح)
  stability: 0.05,      // كعقوبة (تُطرح)
};

const TIER_THRESHOLDS = {
  legendary: { cagr: 80, alpha: 60 },
  excellent: { cagr: 50, alpha: 30 },
  good: { cagr: 25, alpha: 10 },
  acceptable: { cagr: 15, alpha: 5 },
};

// ════════════════════════════════════════════════════════════
//  NORMALIZATION FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * تطبيع CAGR إلى نطاق [-1, +2]
 * 
 * المنطق:
 * - CAGR = 0%: norm = 0
 * - CAGR = 25%: norm = 0.25
 * - CAGR = 100%: norm = 1.0
 * - CAGR = 200%: norm = 2.0 (sigmoid يمنع التضخم)
 * - CAGR = -50%: norm = -0.5
 */
function normalizeCAGR(cagr: number): number {
  // نقسم على 100 لتحويل % إلى ratio
  const ratio = cagr / 100;
  
  // sigmoid soft cap لمنع التضخّم في الأرقام الخيالية
  if (ratio >= 0) {
    // للأرقام الإيجابية: تشبه linear حتى 100%، ثمّ تباطؤ
    return ratio < 1 ? ratio : 1 + Math.tanh(ratio - 1);
  } else {
    // للأرقام السلبية: linear (نريد عقوبة كاملة)
    return Math.max(-1, ratio);
  }
}

/**
 * تطبيع Alpha إلى نطاق [-1, +2]
 */
function normalizeAlpha(alpha: number): number {
  const ratio = alpha / 100;
  
  if (ratio >= 0) {
    return ratio < 1 ? ratio : 1 + Math.tanh(ratio - 1);
  } else {
    return Math.max(-1, ratio);
  }
}

/**
 * تطبيع Sortino إلى نطاق [-1, +1.5]
 * 
 * Sortino > 2 = ممتاز
 * Sortino > 1 = جيد
 * Sortino > 0 = مقبول
 * Sortino < 0 = سيّئ
 */
function normalizeSortino(sortino: number): number {
  if (sortino >= 2) return 1.0;
  if (sortino >= 1) return 0.5 + (sortino - 1) * 0.5;
  if (sortino >= 0) return sortino * 0.5;
  return Math.max(-1, sortino);
}

/**
 * تطبيع Win Rate إلى نطاق [0, 1]
 * 
 * 50% = 0.5
 * 60% = 0.7 (مكافأة)
 * 70%+ = 0.9+
 */
function normalizeWinRate(winRate: number): number {
  // sigmoid حول 50%
  return Math.max(0, Math.min(1, winRate / 100));
}

/**
 * عقوبة MaxDD
 * 
 * 0% = 0 عقوبة
 * -10% = 0.1
 * -25% = 0.5
 * -50% = 1.0
 * -75%+ = 1.5 (عقوبة شديدة)
 */
function normalizeMaxDD(maxDD: number): number {
  const absDD = Math.abs(maxDD);
  
  if (absDD <= 10) return absDD / 100;          // عقوبة خفيفة
  if (absDD <= 25) return 0.1 + (absDD - 10) * 0.02;  // عقوبة متوسطة
  if (absDD <= 50) return 0.4 + (absDD - 25) * 0.024; // عقوبة قوية
  return 1.0 + (absDD - 50) * 0.02;             // عقوبة كارثية
}

/**
 * حساب Stability Penalty
 * 
 * يقيس "هل العوائد متذبذبة جداً؟"
 * نستخدم coefficient of variation من العوائد الشهرية.
 * 
 * 0 = ثابت تماماً (مستحيل)
 * 1 = طبيعي
 * 3+ = متذبذب جداً
 */
function calcStabilityPenalty(dailyReturns?: number[]): number {
  if (!dailyReturns || dailyReturns.length < 30) {
    return 0;
  }
  
  // تجميع لعوائد شهرية تقريبية (كل 21 يوم)
  const monthlyReturns: number[] = [];
  for (let i = 0; i < dailyReturns.length; i += 21) {
    const slice = dailyReturns.slice(i, Math.min(i + 21, dailyReturns.length));
    if (slice.length < 5) continue;
    const cumReturn = slice.reduce((s, r) => s + r, 0);
    monthlyReturns.push(cumReturn);
  }
  
  if (monthlyReturns.length < 3) return 0;
  
  // mean و std
  const mean = monthlyReturns.reduce((s, r) => s + r, 0) / monthlyReturns.length;
  const variance = monthlyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / monthlyReturns.length;
  const std = Math.sqrt(variance);
  
  // Coefficient of Variation
  const cv = Math.abs(mean) > 0.001 ? std / Math.abs(mean) : std * 100;
  
  // تطبيع
  return Math.min(2.0, cv);
}

/**
 * حساب Significance Penalty
 * 
 * استراتيجية بأقلّ من 30 صفقة → نتائج إحصائياً ضعيفة.
 * عقوبة تتناقص مع زيادة الصفقات.
 */
function calcSignificancePenalty(closedTrades: number): number {
  if (closedTrades >= 50) return 0;
  if (closedTrades >= 30) return 0.05;
  if (closedTrades >= 20) return 0.15;
  if (closedTrades >= 10) return 0.30;
  if (closedTrades >= 5) return 0.50;
  return 0.80;  // عقوبة شبه كاملة
}

// ════════════════════════════════════════════════════════════
//  MAIN FITNESS CALCULATION
// ════════════════════════════════════════════════════════════

/**
 * 🎯 حساب fitness شامل
 * 
 * @param metrics - نتائج backtest
 * @returns FitnessResult كامل
 */
export function calculateFitness(metrics: BacktestMetrics): FitnessResult {
  // ① استخراج القيم الأساسية (مع defaults آمنة)
  const cagr = metrics.annualReturn ?? 0;
  const alpha = metrics.alpha ?? 0;
  const sortino = metrics.sortino ?? 0;
  const winRate = metrics.winRate ?? 0;
  const maxDD = metrics.maxDrawdown ?? 0;
  const closedTrades = metrics.closedTrades ?? 0;
  const sharpe = metrics.sharpe ?? 0;
  const totalTrades = metrics.totalTrades ?? 0;
  
  // ② تطبيع كل بعد
  const cagrNorm = normalizeCAGR(cagr);
  const alphaNorm = normalizeAlpha(alpha);
  const sortinoNorm = normalizeSortino(sortino);
  const winRateNorm = normalizeWinRate(winRate);
  const ddPenaltyNorm = normalizeMaxDD(maxDD);
  const stabilityPenaltyNorm = calcStabilityPenalty(metrics.dailyReturns);
  const significancePenaltyNorm = calcSignificancePenalty(closedTrades);
  
  // ③ حساب المساهمات
  const cagrContrib = cagrNorm * FITNESS_WEIGHTS.cagr;
  const alphaContrib = alphaNorm * FITNESS_WEIGHTS.alpha;
  const sortinoContrib = sortinoNorm * FITNESS_WEIGHTS.sortino;
  const winRateContrib = winRateNorm * FITNESS_WEIGHTS.winRate;
  const ddPenalty = ddPenaltyNorm * FITNESS_WEIGHTS.maxDD;
  const stabilityPenalty = stabilityPenaltyNorm * FITNESS_WEIGHTS.stability;
  
  // ④ Fitness قبل عقوبة الـ significance
  const rawFitness = 
    cagrContrib + alphaContrib + sortinoContrib + winRateContrib
    - ddPenalty - stabilityPenalty;
  
  // ⑤ Final Fitness (مع عقوبة الـ significance)
  // ✨ العقوبة تُطرح عند السالب لا تُضرب -- الضرب كان يُحسّن النتائج السالبة
  //    (rawFitness=-0.50 × 0.20 = -0.10 أي أن قلّة الصفقات صارت مكافأة)
  const finalFitness = rawFitness >= 0
    ? rawFitness * (1 - significancePenaltyNorm)
    : rawFitness - (significancePenaltyNorm * 0.5);
  
  // ⑥ تصنيف Tier
  const tier = classifyTier(cagr, alpha);
  const tierInfo = getTierInfo(tier);
  
  // ⑦ كشف التحذيرات
  const warnings: string[] = [];
  
  if (closedTrades < 30) {
    warnings.push(`⚠ عدد قليل من الصفقات (${closedTrades}) -- نتائج إحصائياً ضعيفة`);
  }
  
  if (Math.abs(maxDD) > 35) {
    warnings.push(`⚠ تراجع كبير (${maxDD.toFixed(1)}%) -- خطر نفسيّ على المضارب`);
  }
  
  if (cagr > 100 && closedTrades < 50) {
    warnings.push(`⚠ عوائد مرتفعة جداً مع صفقات قليلة -- احتمال overfitting`);
  }
  
  if (winRate > 80 && closedTrades < 50) {
    warnings.push(`⚠ Win Rate عالٍ بشكل غير طبيعي -- تحقّق من overfitting`);
  }
  
  if (sortino > 4 && closedTrades < 50) {
    warnings.push(`⚠ Sortino عالٍ جداً -- احتمال نتائج وهمية`);
  }
  
  if (cagr < 0 && alpha < 0) {
    warnings.push(`❌ استراتيجية خاسرة -- لا توصية بتطبيقها`);
  }
  
  return {
    fitness: +finalFitness.toFixed(4),
    tier,
    tierIcon: tierInfo.icon,
    tierColor: tierInfo.color,
    tierDescription: tierInfo.description,
    breakdown: {
      cagrContrib: +cagrContrib.toFixed(4),
      alphaContrib: +alphaContrib.toFixed(4),
      sortinoContrib: +sortinoContrib.toFixed(4),
      winRateContrib: +winRateContrib.toFixed(4),
      ddPenalty: +ddPenalty.toFixed(4),
      stabilityPenalty: +stabilityPenalty.toFixed(4),
      significancePenalty: +significancePenaltyNorm.toFixed(4),
      rawFitness: +rawFitness.toFixed(4),
      finalFitness: +finalFitness.toFixed(4),
    },
    warnings,
    metrics: {
      cagr: +cagr.toFixed(2),
      alpha: +alpha.toFixed(2),
      sortino: +sortino.toFixed(2),
      sharpe: +sharpe.toFixed(2),
      winRate: +winRate.toFixed(1),
      maxDD: +maxDD.toFixed(2),
      totalTrades,
      closedTrades,
    },
  };
}

// ════════════════════════════════════════════════════════════
//  TIER CLASSIFICATION
// ════════════════════════════════════════════════════════════

/**
 * تصنيف Tier حسب CAGR + Alpha
 */
export function classifyTier(cagr: number, alpha: number): FitnessTier {
  if (cagr >= TIER_THRESHOLDS.legendary.cagr && alpha >= TIER_THRESHOLDS.legendary.alpha) {
    return 'Legendary';
  }
  if (cagr >= TIER_THRESHOLDS.excellent.cagr && alpha >= TIER_THRESHOLDS.excellent.alpha) {
    return 'Excellent';
  }
  if (cagr >= TIER_THRESHOLDS.good.cagr && alpha >= TIER_THRESHOLDS.good.alpha) {
    return 'Good';
  }
  if (cagr >= TIER_THRESHOLDS.acceptable.cagr && alpha >= TIER_THRESHOLDS.acceptable.alpha) {
    return 'Acceptable';
  }
  return 'Below';
}

/**
 * معلومات Tier (أيقونة، لون، وصف)
 */
export function getTierInfo(tier: FitnessTier): {
  icon: string;
  color: string;
  description: string;
  arabicLabel: string;
} {
  const map: Record<FitnessTier, { icon: string; color: string; description: string; arabicLabel: string }> = {
    Legendary: {
      icon: '🏆',
      color: '#FFD700',
      description: 'أداء أسطوريّ -- أفضل من أساطير وول ستريت',
      arabicLabel: 'أسطوريّ',
    },
    Excellent: {
      icon: '🥇',
      color: '#10c97e',
      description: 'أداء استثنائيّ -- مستوى Renaissance Medallion',
      arabicLabel: 'استثنائيّ',
    },
    Good: {
      icon: '🥈',
      color: '#1a6fd4',
      description: 'أداء جيّد -- مستوى صناديق التحوّط الجيّدة',
      arabicLabel: 'جيّد',
    },
    Acceptable: {
      icon: '🥉',
      color: '#f59e0b',
      description: 'أداء مقبول -- أفضل من السوق قليلاً',
      arabicLabel: 'مقبول',
    },
    Below: {
      icon: '❌',
      color: '#f04f5a',
      description: 'تحت المستوى -- لا يُنصح بالتطبيق',
      arabicLabel: 'مرفوض',
    },
  };
  
  return map[tier];
}

// ════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════

/**
 * ترتيب قائمة استراتيجيات حسب fitness (تنازليّا)
 */
export function rankByFitness<T extends { fitness?: number }>(
  strategies: T[]
): T[] {
  return [...strategies].sort((a, b) => (b.fitness ?? -Infinity) - (a.fitness ?? -Infinity));
}

/**
 * تصفية الاستراتيجيات إلى Tier معيّن وما فوق
 */
export function filterByMinTier(
  strategies: Array<{ fitness?: number; tier?: FitnessTier }>,
  minTier: FitnessTier
): typeof strategies {
  const tierOrder: Record<FitnessTier, number> = {
    Below: 0,
    Acceptable: 1,
    Good: 2,
    Excellent: 3,
    Legendary: 4,
  };
  
  const minLevel = tierOrder[minTier];
  return strategies.filter(s => s.tier && tierOrder[s.tier] >= minLevel);
}

/**
 * مقارنة استراتيجيتين بناءً على fitness + tier
 * 
 * @returns < 0 إن a أفضل، > 0 إن b أفضل
 */
export function compareStrategies(
  a: { fitness?: number; tier?: FitnessTier },
  b: { fitness?: number; tier?: FitnessTier }
): number {
  const fa = a.fitness ?? -Infinity;
  const fb = b.fitness ?? -Infinity;
  return fb - fa;
}

/**
 * توليد نصّ تقرير قابل للقراءة
 */
export function formatFitnessReport(result: FitnessResult): string {
  const lines: string[] = [];
  
  lines.push(`${result.tierIcon} ${getTierInfo(result.tier).arabicLabel}`);
  lines.push(`Fitness: ${result.fitness.toFixed(3)}`);
  lines.push('');
  lines.push('المقاييس:');
  lines.push(`  CAGR: ${result.metrics.cagr.toFixed(1)}%`);
  lines.push(`  Alpha: ${result.metrics.alpha.toFixed(1)}%`);
  lines.push(`  Sortino: ${result.metrics.sortino.toFixed(2)}`);
  lines.push(`  Sharpe: ${result.metrics.sharpe.toFixed(2)}`);
  lines.push(`  Win Rate: ${result.metrics.winRate.toFixed(1)}%`);
  lines.push(`  Max DD: ${result.metrics.maxDD.toFixed(1)}%`);
  lines.push(`  الصفقات: ${result.metrics.closedTrades} مغلقة من ${result.metrics.totalTrades}`);
  
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('التحذيرات:');
    result.warnings.forEach(w => lines.push(`  ${w}`));
  }
  
  return lines.join('\n');
}

// ════════════════════════════════════════════════════════════
//  TEST FUNCTION
// ════════════════════════════════════════════════════════════

/**
 * دالة اختبار شاملة
 */
export function testFitness(): string {
  const lines: string[] = [];
  
  // اختبار 1: استراتيجية أسطورية
  const legendary = calculateFitness({
    annualReturn: 95,
    alpha: 75,
    sortino: 2.5,
    sharpe: 2.1,
    winRate: 65,
    maxDrawdown: -22,
    closedTrades: 120,
    totalTrades: 240,
  });
  lines.push(`🏆 Legendary test:`);
  lines.push(`   Tier: ${legendary.tier} ${legendary.tierIcon}`);
  lines.push(`   Fitness: ${legendary.fitness}`);
  lines.push(`   Warnings: ${legendary.warnings.length}`);
  
  // اختبار 2: استراتيجية جيّدة
  const good = calculateFitness({
    annualReturn: 28,
    alpha: 12,
    sortino: 1.4,
    sharpe: 1.2,
    winRate: 55,
    maxDrawdown: -12,
    closedTrades: 80,
    totalTrades: 160,
  });
  lines.push(`\n🥈 Good test:`);
  lines.push(`   Tier: ${good.tier} ${good.tierIcon}`);
  lines.push(`   Fitness: ${good.fitness}`);
  
  // اختبار 3: استراتيجية سيّئة
  const bad = calculateFitness({
    annualReturn: -8,
    alpha: -15,
    sortino: -0.5,
    sharpe: -0.3,
    winRate: 30,
    maxDrawdown: -35,
    closedTrades: 50,
    totalTrades: 100,
  });
  lines.push(`\n❌ Bad test:`);
  lines.push(`   Tier: ${bad.tier} ${bad.tierIcon}`);
  lines.push(`   Fitness: ${bad.fitness}`);
  lines.push(`   Warnings: ${bad.warnings.join(', ')}`);
  
  // اختبار 4: استراتيجية مع صفقات قليلة (overfitting risk)
  const overfit = calculateFitness({
    annualReturn: 150,
    alpha: 130,
    sortino: 3.5,
    sharpe: 2.8,
    winRate: 85,
    maxDrawdown: -8,
    closedTrades: 8,    // قليل جداً!
    totalTrades: 16,
  });
  lines.push(`\n⚠ Overfit test (8 trades only):`);
  lines.push(`   Tier: ${overfit.tier} ${overfit.tierIcon}`);
  lines.push(`   Fitness: ${overfit.fitness} (مخفّض بسبب significance penalty)`);
  lines.push(`   Warnings: ${overfit.warnings.length}`);
  
  return lines.join('\n');
}
