/**
 * @module portfolioMath
 * @description مكتبة الدوال الإحصائية الأساسية لإدارة مخاطر المحفظة
 *
 * هذا الملف يحتوي على الدوال الرياضية الجوهرية المستخدمة في:
 * - حساب العوائد والتذبذب
 * - حسابات الانحدار والارتباط
 * - التحويلات الإحصائية
 *
 * جميع الدوال خالصة (pure functions) -- بدون تأثيرات جانبية
 *
 * @author تداول+
 * @version 2.0 (TypeScript)
 */

// ═══════════════════════════════════════════════════════
// 📊 TYPES
// ═══════════════════════════════════════════════════════

/**
 * Bar (OHLC data point)
 */
export interface Bar {
  t: number;  // Timestamp
  o: number;  // Open
  h: number;  // High
  l: number;  // Low
  c: number;  // Close
  v: number;  // Volume
}

/**
 * Numeric array (returns, prices, etc.)
 */
export type NumberArray = number[];

/* ══════════════════════════════════════════════════════════
   ① الإحصاءات الوصفية الأساسية
═══════════════════════════════════════════════════════════ */

/**
 * المتوسط الحسابي
 * μ = Σx / n
 */
export function mean(arr: NumberArray): number {
  if (!arr || arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/**
 * التباين (العينة) -- Sample Variance
 * σ² = Σ(x - μ)² / (n - 1)
 * نستخدم (n-1) وهو تصحيح Bessel للعينة
 */
export function variance(arr: NumberArray): number {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  let sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const diff = arr[i] - m;
    sumSq += diff * diff;
  }
  return sumSq / (arr.length - 1);
}

/**
 * الانحراف المعياري -- Standard Deviation
 * σ = √(variance)
 */
export function std(arr: NumberArray): number {
  return Math.sqrt(variance(arr));
}

/**
 * الانحراف السلبي (Downside Deviation)
 * يُستخدم في Sortino Ratio -- يأخذ العوائد تحت العتبة فقط
 */
export function downsideDeviation(arr: NumberArray, threshold: number = 0): number {
  if (!arr || arr.length === 0) return 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] < threshold) {
      const diff = arr[i] - threshold;
      sumSq += diff * diff;
      count++;
    }
  }
  if (count === 0) return 0;
  return Math.sqrt(sumSq / count);
}

/* ══════════════════════════════════════════════════════════
   ② العوائد (Returns)
═══════════════════════════════════════════════════════════ */

/**
 * حساب سلسلة العوائد اليومية البسيطة
 * r_t = (P_t - P_{t-1}) / P_{t-1}
 */
export function simpleReturns(bars: Bar[]): NumberArray {
  if (!bars || bars.length < 2) return [];
  const returns: NumberArray = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].c;
    const curr = bars[i].c;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  return returns;
}

/**
 * حساب سلسلة العوائد اللوغاريتمية
 * r_t = ln(P_t / P_{t-1})
 * أكثر دقة للحسابات الطويلة المدى
 */
export function logReturns(bars: Bar[]): NumberArray {
  if (!bars || bars.length < 2) return [];
  const returns: NumberArray = [];
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1].c;
    const curr = bars[i].c;
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev));
    }
  }
  return returns;
}

/**
 * العائد التراكمي
 * (1 + r_1)(1 + r_2)...(1 + r_n) - 1
 */
export function cumulativeReturn(returns: NumberArray): number {
  if (!returns || returns.length === 0) return 0;
  let cum = 1;
  for (let i = 0; i < returns.length; i++) {
    cum *= (1 + returns[i]);
  }
  return cum - 1;
}

/* ══════════════════════════════════════════════════════════
   ③ الارتباط والانحدار
═══════════════════════════════════════════════════════════ */

/**
 * التباين المشترك (Covariance)
 * cov(X,Y) = Σ[(x - μ_x)(y - μ_y)] / (n - 1)
 */
export function covariance(x: NumberArray, y: NumberArray): number {
  if (!x || !y || x.length !== y.length || x.length < 2) return 0;
  const mx = mean(x);
  const my = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }
  return sum / (x.length - 1);
}

/**
 * معامل الارتباط (Pearson Correlation)
 * ρ(X,Y) = cov(X,Y) / (σ_x * σ_y)
 * القيمة بين -1 و +1
 */
export function correlation(x: NumberArray, y: NumberArray): number {
  const sx = std(x);
  const sy = std(y);
  if (sx === 0 || sy === 0) return 0;
  return covariance(x, y) / (sx * sy);
}

/**
 * Beta عبر الانحدار الخطي
 * β = cov(asset, market) / variance(market)
 * β > 1: أكثر تذبذباً من السوق
 * β < 1: أقل تذبذباً من السوق
 */
export function beta(assetReturns: NumberArray, marketReturns: NumberArray): number {
  const varMarket = variance(marketReturns);
  if (varMarket === 0) return 1;
  return covariance(assetReturns, marketReturns) / varMarket;
}

/* ══════════════════════════════════════════════════════════
   ④ التحويلات الزمنية (Annualization)
═══════════════════════════════════════════════════════════ */

/**
 * تحويل العائد اليومي إلى سنوي
 * r_annual = (1 + r_daily)^252 - 1
 */
export function annualizeReturn(dailyReturn: number): number {
  return Math.pow(1 + dailyReturn, 252) - 1;
}

/**
 * تحويل التذبذب اليومي إلى سنوي
 * σ_annual = σ_daily * √252
 * قاعدة جذر الزمن (Square-root-of-time rule)
 */
export function annualizeStd(dailyStd: number): number {
  return dailyStd * Math.sqrt(252);
}

/* ══════════════════════════════════════════════════════════
   ⑤ الترتيب والمئينات
═══════════════════════════════════════════════════════════ */

/**
 * حساب المئين (Percentile) عبر Linear Interpolation
 * يُستخدم في VaR (Value at Risk)
 */
export function percentile(arr: NumberArray, p: number): number {
  if (!arr || arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  if (p <= 0) return sorted[0];
  if (p >= 100) return sorted[sorted.length - 1];
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/* ══════════════════════════════════════════════════════════
   ⑥ مساعدات عامة
═══════════════════════════════════════════════════════════ */

/**
 * تقييد قيمة بين حدين (Clamp)
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * التحقق من صحة العوائد (إزالة NaN و Infinity)
 */
export function sanitize(arr: NumberArray | undefined | null): NumberArray {
  if (!arr) return [];
  return arr.filter((v): v is number => {
    return typeof v === 'number' && isFinite(v) && !isNaN(v);
  });
}
