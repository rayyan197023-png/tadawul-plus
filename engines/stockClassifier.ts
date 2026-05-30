'use client';
/**
 * @module engines/stockClassifier
 * @description تصنيف الأسهم السعودية إلى ٥ فئات حسب الخصائص
 *
 * 🎯 الهدف:
 * كل فئة تحتاج استراتيجية مختلفة (Renaissance Technologies methodology).
 * هذا الملف يصنّف كل سهم تلقائياً قبل تطبيق الاستراتيجية المناسبة.
 *
 * 📚 المصادر العلمية:
 * - Fama & French (1993): تصنيف Size + Value.
 * - Mandelbrot (1963): استخدام Volatility كمحدّد للسلوك.
 * - Lynch (1989): Growth vs Value باستخدام EPS Growth.
 * - Amihud (2002): السيولة كمعيار أساسي.
 *
 * 📐 المعايير معايرة للسوق السعودي (٢٠٢٥-٢٠٢٦):
 * - أرامكو: 5.8 تريليون ر.س (أكبر شركة)
 * - الراجحي: 390 مليار
 * - الإنماء: 4.9 مليون سهم/يوم متوسط
 * - شمس: 35 مليون سهم/يوم (الأكثر نشاطاً مضاربياً)
 *
 * 🚫 الاستبعادات:
 * - السوق الموازي (نمو): رموز 9XXX
 * - الصناديق العقارية (REITs)
 * - الصناديق الاستثمارية (ETFs)
 *
 * @author تداول+
 * @version 1.0
 */

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

export type StockType = 'leader' | 'growth' | 'speculative' | 'explosive' | 'mid-cap' | 'excluded';

export interface ClassificationResult {
  type: StockType;
  typeArabic: string;
  typeIcon: string;
  typeColor: string;
  confidence: number;          // 0-100
  metrics: {
    mktCap: number;
    volatility: number;
    avgVolumeShares: number;
    epsGrw: number;
    pe: number;
    recentMomentum: number;
  };
  reasons: string[];
  excludeReason?: string;      // سبب الاستبعاد إن type === 'excluded'
}

// ════════════════════════════════════════════════════════════
//  CONFIG - معايرة للسوق السعودي
// ════════════════════════════════════════════════════════════

const THRESHOLDS = {
  // 🚀 Explosive - شركات صغيرة تتحرّك بقوّة
  explosive: {
    maxMktCap: 10,              // < 10 مليار ر.س
    minVolatility: 3.0,         // > 3% يومي
    minMomentum: 6.0,           // > 6% آخر 30 يوم
    minAvgVolumeShares: 2000000,
  },
  
  // ⚡ Speculative - مضاربية بأحجام ضخمة
  speculative: {
    minMktCap: 1,
    maxMktCap: 30,
    minVolatility: 2.5,
    minAvgVolumeShares: 3000000,
  },
  
  // 🌱 Growth - نمو
  growth: {
    minEpsGrw: 15,
    minPE: 25,
    minMktCap: 5,
    maxMktCap: 100,
    minAvgVolumeShares: 1000000,
  },
  
  // 🏛 Leader - قياديّة
  leader: {
    minMktCap: 100,             // > 100 مليار
    maxVolatility: 2.5,
    minAvgVolumeShares: 3000000,
  },
};

// ════════════════════════════════════════════════════════════
//  EXCLUSION FILTERS
// ════════════════════════════════════════════════════════════

/**
 * استبعاد السوق الموازي (نمو)
 * رموز السوق الموازي تبدأ بـ 9
 */
function isParallelMarket(sym: string): boolean {
  const s = String(sym || '').trim();
  return s.startsWith('9');
}

/**
 * استبعاد الصناديق العقارية (REITs)
 * تُعرف عادة بقطاع "الصناديق العقارية" أو "ريت"
 */
function isREIT(stk: any): boolean {
  const sec = String(stk.sec || stk.sector || '').toLowerCase();
  const name = String(stk.name || '').toLowerCase();
  
  if (sec.includes('صناديق عقارية')) return true;
  if (sec.includes('ريت')) return true;
  if (sec.includes('reit')) return true;
  
  if (name.includes('ريت')) return true;
  if (name.includes('عقاري') && name.includes('صندوق')) return true;
  
  return false;
}

/**
 * استبعاد الصناديق الاستثمارية (ETFs)
 */
function isETF(stk: any): boolean {
  const name = String(stk.name || '').toLowerCase();
  const sec = String(stk.sec || stk.sector || '').toLowerCase();
  
  if (name.includes('etf')) return true;
  if (name.includes('صندوق') && !name.includes('عقاري')) return true;
  if (sec.includes('etf')) return true;
  if (sec.includes('صناديق متداولة')) return true;
  
  return false;
}

/**
 * فحص الاستبعاد الشامل
 * 
 * @returns سبب الاستبعاد أو null إن لم يكن مستبعداً
 */
function checkExclusion(stk: any): string | null {
  if (isParallelMarket(stk.sym)) {
    return 'السوق الموازي (نمو) - مستبعد';
  }
  
  if (isREIT(stk)) {
    return 'صندوق عقاري (REIT) - مستبعد';
  }
  
  if (isETF(stk)) {
    return 'صندوق استثماري (ETF) - مستبعد';
  }
  
  return null;
}

// ════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS - حسابات
// ════════════════════════════════════════════════════════════

/**
 * حساب التذبذب اليومي (volatility)
 * يستخدم آخر 60 يوم
 * 
 * @returns volatility كنسبة مئوية يومية (مثال: 1.85 = 1.85%)
 */
function calcVolatility(bars: any[]): number {
  if (!bars || bars.length < 10) return 1.5;
  
  const recent = bars.slice(-Math.min(60, bars.length));
  const returns: number[] = [];
  
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1].c;
    const curr = recent[i].c;
    if (prev > 0) {
      const ret = (curr - prev) / prev * 100;
      returns.push(ret);
    }
  }
  
  if (returns.length === 0) return 1.5;
  
  // standard deviation
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  
  return +std.toFixed(2);
}

/**
 * حساب متوسط حجم التداول (بعدد الأسهم) لآخر 30 يوم
 */
function calcAvgVolumeShares(bars: any[]): number {
  if (!bars || bars.length < 10) return 0;
  
  const recent = bars.slice(-30);
  const sum = recent.reduce((s, b) => s + (b.vol || 0), 0);
  
  return Math.round(sum / recent.length);
}

/**
 * حساب الزخم لآخر 30 يوم
 * 
 * @returns نسبة التغيّر %
 */
function calcRecentMomentum(bars: any[]): number {
  if (!bars || bars.length < 20) return 0;
  
  const recent = bars.slice(-30);
  if (recent.length < 2) return 0;
  
  const startPrice = recent[0].c;
  const endPrice = recent[recent.length - 1].c;
  
  if (startPrice <= 0) return 0;
  
  return +((endPrice - startPrice) / startPrice * 100).toFixed(2);
}

// ════════════════════════════════════════════════════════════
//  CLASSIFICATION LOGIC
// ════════════════════════════════════════════════════════════

/**
 * التصنيف الرئيسي - الدالة الأهمّ
 * 
 * المنطق:
 * ① فحص الاستبعاد أولاً (السوق الموازي، REITs، ETFs)
 * ② حساب المقاييس
 * ③ تطبيق الاختبارات بترتيب الأولوية:
 *    أ. Explosive (الأشدّ تطرّفاً)
 *    ب. Speculative
 *    ج. Growth
 *    د. Leader
 *    هـ. Mid-Cap (افتراضي)
 * 
 * @param stk - بيانات السهم
 * @param bars - شموع تاريخية
 * @returns نتيجة التصنيف مع التفاصيل والأسباب
 */
export function classifyStock(
  stk: any,
  bars: any[] = []
): ClassificationResult {
  // ───────────────────────────────────────
  // ① فحص الاستبعاد
  // ───────────────────────────────────────
  const exclusion = checkExclusion(stk);
  if (exclusion) {
    return {
      type: 'excluded',
      typeArabic: 'مستبعد',
      typeIcon: '🚫',
      typeColor: '#6b7280',
      confidence: 100,
      metrics: {
        mktCap: stk.mktCap || 0,
        volatility: 0,
        avgVolumeShares: 0,
        epsGrw: stk.epsGrw || 0,
        pe: stk.pe || 0,
        recentMomentum: 0,
      },
      reasons: [exclusion],
      excludeReason: exclusion,
    };
  }
  
  // ───────────────────────────────────────
  // ② حساب المقاييس
  // ───────────────────────────────────────
  const mktCap = stk.mktCap || 50;
  const epsGrw = stk.epsGrw || 0;
  const pe = stk.pe || 20;
  
  const volatility = bars.length >= 10
    ? calcVolatility(bars)
    : (stk.volatility || 1.8);
  
  const avgVolumeShares = bars.length >= 10
    ? calcAvgVolumeShares(bars)
    : (stk.avgV || stk.v || 0);
  
  const recentMomentum = bars.length >= 20
    ? calcRecentMomentum(bars)
    : (stk.ch || 0);
  
  const metrics = {
    mktCap: +mktCap.toFixed(1),
    volatility: +volatility.toFixed(2),
    avgVolumeShares: avgVolumeShares,
    epsGrw: +epsGrw.toFixed(1),
    pe: +pe.toFixed(1),
    recentMomentum: +recentMomentum.toFixed(2),
  };
  
  const reasons: string[] = [];
  
  // ───────────────────────────────────────
  // ③ اختبار Explosive (الأولوية الأعلى)
  // ───────────────────────────────────────
  if (
    mktCap < THRESHOLDS.explosive.maxMktCap &&
    volatility > THRESHOLDS.explosive.minVolatility &&
    Math.abs(recentMomentum) > THRESHOLDS.explosive.minMomentum &&
    avgVolumeShares > THRESHOLDS.explosive.minAvgVolumeShares
  ) {
    reasons.push(`📊 رأس مال صغير: ${mktCap.toFixed(1)} مليار`);
    reasons.push(`⚡ تذبذب عالٍ: ${volatility.toFixed(2)}%`);
    reasons.push(`🚀 زخم قوي: ${recentMomentum.toFixed(1)}% آخر شهر`);
    reasons.push(`💧 حجم: ${(avgVolumeShares / 1000000).toFixed(1)}M سهم/يوم`);
    
    return {
      type: 'explosive',
      typeArabic: 'انفجاري',
      typeIcon: '🚀',
      typeColor: '#f04f5a',
      confidence: 85,
      metrics,
      reasons,
    };
  }
  
  // ───────────────────────────────────────
  // ④ اختبار Speculative
  // ───────────────────────────────────────
  if (
    mktCap >= THRESHOLDS.speculative.minMktCap &&
    mktCap < THRESHOLDS.speculative.maxMktCap &&
    volatility > THRESHOLDS.speculative.minVolatility &&
    avgVolumeShares > THRESHOLDS.speculative.minAvgVolumeShares
  ) {
    reasons.push(`📈 تذبذب مرتفع: ${volatility.toFixed(2)}%`);
    reasons.push(`💧 سيولة قوية: ${(avgVolumeShares / 1000000).toFixed(1)}M سهم/يوم`);
    reasons.push(`📦 رأس مال متوسط: ${mktCap.toFixed(1)} مليار`);
    
    return {
      type: 'speculative',
      typeArabic: 'مضاربي',
      typeIcon: '⚡',
      typeColor: '#f59e0b',
      confidence: 80,
      metrics,
      reasons,
    };
  }
  
  // ───────────────────────────────────────
  // ⑤ اختبار Growth
  // ───────────────────────────────────────
  if (
    epsGrw > THRESHOLDS.growth.minEpsGrw &&
    pe > THRESHOLDS.growth.minPE &&
    mktCap >= THRESHOLDS.growth.minMktCap &&
    mktCap < THRESHOLDS.growth.maxMktCap &&
    avgVolumeShares > THRESHOLDS.growth.minAvgVolumeShares
  ) {
    reasons.push(`🌱 نمو الأرباح: ${epsGrw.toFixed(1)}%`);
    reasons.push(`💎 تقييم متميّز: P/E ${pe.toFixed(1)}`);
    reasons.push(`📊 رأس مال: ${mktCap.toFixed(1)} مليار`);
    reasons.push(`💧 سيولة: ${(avgVolumeShares / 1000000).toFixed(1)}M سهم/يوم`);
    
    return {
      type: 'growth',
      typeArabic: 'نمو',
      typeIcon: '🌱',
      typeColor: '#10c97e',
      confidence: 78,
      metrics,
      reasons,
    };
  }
  
  // ───────────────────────────────────────
  // ⑥ اختبار Leader
  // ───────────────────────────────────────
  if (
    mktCap >= THRESHOLDS.leader.minMktCap &&
    volatility < THRESHOLDS.leader.maxVolatility &&
    avgVolumeShares > THRESHOLDS.leader.minAvgVolumeShares
  ) {
    reasons.push(`🏛 رأس مال ضخم: ${mktCap.toFixed(1)} مليار`);
    reasons.push(`🛡 استقرار: تذبذب ${volatility.toFixed(2)}%`);
    reasons.push(`💧 سيولة عالية: ${(avgVolumeShares / 1000000).toFixed(1)}M سهم/يوم`);
    
    return {
      type: 'leader',
      typeArabic: 'قيادي',
      typeIcon: '🏛',
      typeColor: '#1a6fd4',
      confidence: 90,
      metrics,
      reasons,
    };
  }
  
  // ───────────────────────────────────────
  // ⑦ افتراضي: Mid-Cap
  // ───────────────────────────────────────
  reasons.push(`⚖️ خصائص متوسطة`);
  reasons.push(`📊 رأس مال: ${mktCap.toFixed(1)} مليار`);
  reasons.push(`📈 تذبذب: ${volatility.toFixed(2)}%`);
  
  return {
    type: 'mid-cap',
    typeArabic: 'متوسط',
    typeIcon: '⚖️',
    typeColor: '#06b6d4',
    confidence: 60,
    metrics,
    reasons,
  };
}

// ════════════════════════════════════════════════════════════
//  BATCH CLASSIFICATION - تصنيف قائمة كاملة
// ════════════════════════════════════════════════════════════

/**
 * تصنيف قائمة كاملة من الأسهم
 * 
 * @param stocks - قائمة الأسهم (مثل STOCKS_LIVE)
 * @param barsMap - خريطة sym → bars (اختياري)
 * @returns تصنيف منظّم + ملخّص
 */
export function classifyAllStocks(
  stocks: any[],
  barsMap: { [sym: string]: any[] } = {}
): {
  byType: Record<StockType, any[]>;
  classifications: Record<string, ClassificationResult>;
  summary: {
    leader: number;
    growth: number;
    speculative: number;
    explosive: number;
    'mid-cap': number;
    excluded: number;
    total: number;
    eligible: number;        // إجمالي القابلة للاستراتيجيات
  };
} {
  const byType: Record<StockType, any[]> = {
    leader: [],
    growth: [],
    speculative: [],
    explosive: [],
    'mid-cap': [],
    excluded: [],
  };
  
  const classifications: Record<string, ClassificationResult> = {};
  
  stocks.forEach(stk => {
    const bars = barsMap[stk.sym] || [];
    const result = classifyStock(stk, bars);
    
    classifications[stk.sym] = result;
    byType[result.type].push({
      ...stk,
      classification: result,
    });
  });
  
  const summary = {
    leader: byType.leader.length,
    growth: byType.growth.length,
    speculative: byType.speculative.length,
    explosive: byType.explosive.length,
    'mid-cap': byType['mid-cap'].length,
    excluded: byType.excluded.length,
    total: stocks.length,
    eligible: 
      byType.leader.length +
      byType.growth.length +
      byType.speculative.length +
      byType.explosive.length +
      byType['mid-cap'].length,
  };
  
  return { byType, classifications, summary };
}

// ════════════════════════════════════════════════════════════
//  PUBLIC HELPERS
// ════════════════════════════════════════════════════════════

/**
 * الاسم العربي للفئة
 */
export function getTypeArabic(type: StockType): string {
  const map: Record<StockType, string> = {
    leader: 'قيادي',
    growth: 'نمو',
    speculative: 'مضاربي',
    explosive: 'انفجاري',
    'mid-cap': 'متوسط',
    excluded: 'مستبعد',
  };
  return map[type] || 'غير محدّد';
}

/**
 * الأيقونة للفئة
 */
export function getTypeIcon(type: StockType): string {
  const map: Record<StockType, string> = {
    leader: '🏛',
    growth: '🌱',
    speculative: '⚡',
    explosive: '🚀',
    'mid-cap': '⚖️',
    excluded: '🚫',
  };
  return map[type] || '❓';
}

/**
 * لون الفئة
 */
export function getTypeColor(type: StockType): string {
  const map: Record<StockType, string> = {
    leader: '#1a6fd4',
    growth: '#10c97e',
    speculative: '#f59e0b',
    explosive: '#f04f5a',
    'mid-cap': '#06b6d4',
    excluded: '#6b7280',
  };
  return map[type] || '#6b7280';
}

/**
 * وصف تفصيلي للفئة (للواجهة)
 */
export function getTypeDescription(type: StockType): string {
  const map: Record<StockType, string> = {
    leader: 'الشركات الكبرى المستقرّة. حركة بطيئة، توزيعات أرباح. مناسبة للاستثمار طويل المدى.',
    growth: 'شركات تنمو أرباحها بسرعة. صعود مستمرّ مدفوع بأرباح متزايدة.',
    speculative: 'شركات متذبذبة بأحجام تداول كبيرة. فرص مضاربة متعدّدة.',
    explosive: 'شركات صغيرة قابلة لقفزات كبيرة. مخاطر عالية لكن عوائد محتملة استثنائية.',
    'mid-cap': 'شركات متوسطة الحجم. توازن بين الاستقرار والنمو.',
    excluded: 'مستبعد من النظام (السوق الموازي، REITs، ETFs).',
  };
  return map[type] || '';
}

// ════════════════════════════════════════════════════════════
//  TEST FUNCTION - للتحقّق من العمل
// ════════════════════════════════════════════════════════════

/**
 * دالة اختبار شاملة
 */
export function testClassifier(): string {
  const tests: any[] = [];
  
  // اختبار 1: قيادي (الراجحي)
  const rajhi = {
    sym: '1120',
    name: 'الراجحي',
    sec: 'البنوك',
    mktCap: 390,
    pe: 14,
    epsGrw: 5,
    avgV: 5000000,
  };
  tests.push({ name: 'الراجحي', result: classifyStock(rajhi) });
  
  // اختبار 2: انفجاري (شركة صغيرة)
  const explosive = {
    sym: '4081',
    name: 'النايفات',
    sec: 'الخدمات المالية',
    mktCap: 4,
    pe: 18,
    epsGrw: 8,
    avgV: 3000000,
  };
  const volatileBars = Array(60).fill(0).map((_, i) => ({
    c: 50 + Math.sin(i / 3) * 5 + (i / 60) * 4,
    o: 50, hi: 55, lo: 45, vol: 3000000, pct: 0,
  }));
  tests.push({ name: 'النايفات', result: classifyStock(explosive, volatileBars) });
  
  // اختبار 3: مستبعد (سوق موازي)
  const parallel = {
    sym: '9528',
    name: 'شركة موازية',
    sec: 'تقنية',
    mktCap: 2,
  };
  tests.push({ name: 'سوق موازي', result: classifyStock(parallel) });
  
  // اختبار 4: مستبعد (REIT)
  const reit = {
    sym: '4338',
    name: 'صندوق الراجحي ريت',
    sec: 'الصناديق العقارية',
    mktCap: 5,
  };
  tests.push({ name: 'REIT', result: classifyStock(reit) });
  
  return tests.map(t => 
    `${t.name}: ${t.result.typeIcon} ${t.result.typeArabic}`
  ).join('\n');
}
