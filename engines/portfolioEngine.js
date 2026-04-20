/**
 * @module portfolioEngine
 * @description المحرك الرئيسي لتحليل مخاطر المحفظة الكلية
 *
 * هذا المحرك يحلل المحفظة ككيان واحد -- وليس كمجموع أسهم فردية.
 * يعتمد على مبادئ Modern Portfolio Theory (Markowitz 1952)
 * مع إضافات من Post-Modern Portfolio Theory (Sortino 1994)
 *
 * المصادر الأكاديمية:
 * - Markowitz, H. (1952). "Portfolio Selection"
 * - Sharpe, W. (1966). "Mutual Fund Performance"
 * - Sortino, F. (1994). "Performance Measurement in a Downside Framework"
 * - Jorion, P. (2006). "Value at Risk: The New Benchmark"
 *
 * الاستيراد:
 * import { analyzePortfolio } from '../engines/portfolioEngine';
 * var analysis = analyzePortfolio(positions, tasiBars);
 *
 * @requires ../utils/portfolioMath
 * @author تداول+
 * @version 1.0
 */

import {
  mean,
  variance,
  std,
  downsideDeviation,
  simpleReturns,
  covariance,
  correlation,
  beta,
  annualizeReturn,
  annualizeStd,
  percentile,
  clamp,
  sanitize,
} from '../utils/portfolioMath';

/* ══════════════════════════════════════════════════════════
   ⚙️ الثوابت الأساسية
═══════════════════════════════════════════════════════════ */

/**
 * معدل العائد الخالي من المخاطرة (يومي)
 * السايبور السعودي ≈ 6% سنوياً → 0.0238% يومياً
 * يُستخدم في: Sharpe, Sortino, Jensen's Alpha
 */
var RISK_FREE_DAILY = 0.06 / 252;

/**
 * عدد أيام التداول السنوية في تاسي
 * الاستخدام: التحويل من يومي إلى سنوي
 */
var TRADING_DAYS = 252;

/**
 * مستوى ثقة VaR (95%)
 * يعني: في 95% من الأيام، الخسارة ما تتجاوز VaR
 */
var VAR_CONFIDENCE = 95;

/* ══════════════════════════════════════════════════════════
   ① الدالة الرئيسية -- تحليل المحفظة الشامل
═══════════════════════════════════════════════════════════ */

/**
 * تحليل شامل للمحفظة
 *
 * @param {Array} positions - مصفوفة الممتلكات [{sym, qty, avgCost, value, bars}]
 * @param {Array} tasiBars - البيانات التاريخية لتاسي (للمقارنة)
 * @returns {Object} تحليل شامل للمحفظة
 */
export function analyzePortfolio(positions, tasiBars) {
  // فحص المدخلات
  if (!positions || positions.length === 0) {
    return emptyPortfolioAnalysis();
  }

  // الأساسيات
  var totalValue = calcTotalValue(positions);
  var weights = calcWeights(positions, totalValue);

  // سيُضاف لاحقاً في الخطوات القادمة
  return {
    // البيانات الأساسية
    totalValue: totalValue,
    stockCount: positions.length,
    weights: weights,

         // مقاييس الأداء -- العوائد + التذبذب + Sharpe (الخطوات 5-7 ✅)
  performance: (function() {
    var portfolioReturns = calcPortfolioReturns(positions, weights);
    var returnsMetrics = calcReturnsMetrics(portfolioReturns);
    var volMetrics = calcVolatility(portfolioReturns);
    // ⭐ Sharpe Ratio -- الخطوة 7
    var sharpeMetrics = calcSharpeRatio(
      returnsMetrics.annual,
      volMetrics.annual,
      0.06  // السايبور السعودي
    );
    return {
      dailyReturn: returnsMetrics.daily,
      cumulativeReturn: returnsMetrics.cumulative,
      annualReturn: returnsMetrics.annual,
      periodDays: returnsMetrics.periodDays,
      // التذبذب
      volatilityDaily: volMetrics.daily,
      volatility: volMetrics.annual,
      volatilityClass: volMetrics.classification,
      volatilityLabel: volMetrics.label,
      // ⭐ Sharpe Ratio
      sharpe: sharpeMetrics.value,
      sharpeClass: sharpeMetrics.classification,
      sharpeLabel: sharpeMetrics.label,
      sharpeInterpretation: sharpeMetrics.interpretation,
      excessReturn: sharpeMetrics.excessReturn,
      // ستُضاف لاحقاً:
      sortino: null,
      alpha: null,
      beta: null,
    };
  })(),


    // مقاييس المخاطر (ستُضاف في المرحلة 3)
    risk: {
      maxDrawdown: null,
      var95: null,
      cvar95: null,
      downsideDeviation: null,
      calmar: null,
    },

    // التنويع (سيُضاف في المرحلة 4)
    diversification: {
      hhi: null,
      correlationMatrix: null,
      avgCorrelation: null,
      score: null,
      effectiveStocks: null,
    },

    // التقييم النهائي (سيُضاف في المرحلة 6)
    healthScore: null,
    healthGrade: null,
    recommendations: [],
  };
}

/* ══════════════════════════════════════════════════════════
   ② دوال مساعدة أساسية
═══════════════════════════════════════════════════════════ */

/**
 * حساب القيمة الإجمالية للمحفظة
 * @param {Array} positions
 * @returns {number}
 */
export function calcTotalValue(positions) {
  if (!positions || positions.length === 0) return 0;
  var total = 0;
  for (var i = 0; i < positions.length; i++) {
    total += positions[i].value || 0;
  }
  return total;
}

/**
 * حساب الأوزان النسبية لكل سهم في المحفظة
 * weight_i = value_i / total_value
 *
 * مجموع الأوزان = 1.0 (100%)
 *
 * @param {Array} positions
 * @param {number} totalValue
 * @returns {Object} {sym: weight}
 */
export function calcWeights(positions, totalValue) {
  var weights = {};
  if (!positions || totalValue <= 0) return weights;

  for (var i = 0; i < positions.length; i++) {
    var p = positions[i];
    weights[p.sym] = p.value / totalValue;
  }
  return weights;
}

/**
 * حساب سلسلة العوائد للمحفظة اليومية
 * R_p(t) = Σ [w_i × r_i(t)]
 *
 * عائد المحفظة = مجموع (وزن كل سهم × عائده اليومي)
 *
 * @param {Array} positions - [{sym, bars, value}]
 * @param {Object} weights - {sym: weight}
 * @returns {number[]} سلسلة العوائد اليومية للمحفظة
 */
export function calcPortfolioReturns(positions, weights) {
  if (!positions || positions.length === 0) return [];

  // حساب عوائد كل سهم
  var stockReturns = {};
  var minLength = Infinity;

  for (var i = 0; i < positions.length; i++) {
    var p = positions[i];
    if (!p.bars || p.bars.length < 2) continue;
    var rets = simpleReturns(p.bars);
    stockReturns[p.sym] = rets;
    if (rets.length < minLength) minLength = rets.length;
  }

  if (minLength === Infinity || minLength === 0) return [];

  // مزامنة الأطوال -- نأخذ آخر N يوم من كل سهم
  var portfolioReturns = [];
  for (var t = 0; t < minLength; t++) {
    var dailyReturn = 0;
    for (var sym in stockReturns) {
      var rets2 = stockReturns[sym];
      // أخذ العائد من نهاية السلسلة (آخر N يوم)
      var idx = rets2.length - minLength + t;
      var w = weights[sym] || 0;
      dailyReturn += w * rets2[idx];
    }
    portfolioReturns.push(dailyReturn);
  }

  return sanitize(portfolioReturns);
}

/* ══════════════════════════════════════════════════════════
   ③ مقاييس الأداء -- العوائد
═══════════════════════════════════════════════════════════ */

/**
 * حساب مقاييس العائد الكاملة للمحفظة
 *
 * يحسب:
 * - العائد اليومي المتوسط
 * - العائد التراكمي للفترة
 * - العائد السنوي المتوقع
 * - عدد الأيام المستخدمة في الحساب
 *
 * @param {number[]} portfolioReturns - سلسلة العوائد اليومية للمحفظة
 * @returns {Object} {daily, cumulative, annual, periodDays}
 *
 * @example
 * var returns = calcPortfolioReturns(positions, weights);
 * var perf = calcReturnsMetrics(returns);
 * console.log(perf.annual); // 0.12 يعني 12% سنوياً
 */
export function calcReturnsMetrics(portfolioReturns) {
  // فحص المدخلات
  if (!portfolioReturns || portfolioReturns.length === 0) {
    return {
      daily: 0,
      cumulative: 0,
      annual: 0,
      periodDays: 0,
    };
  }

  var n = portfolioReturns.length;

  // ① العائد اليومي المتوسط (Arithmetic Mean)
  // R_daily = Σ R(t) / n
  var sumReturns = 0;
  for (var i = 0; i < n; i++) {
    sumReturns += portfolioReturns[i];
  }
  var dailyReturn = sumReturns / n;

  // ② العائد التراكمي (Geometric - يأخذ بعين الاعتبار Compounding)
  // R_cum = (1 + r_1)(1 + r_2)...(1 + r_n) - 1
  var cumulative = 1;
  for (var j = 0; j < n; j++) {
    cumulative *= (1 + portfolioReturns[j]);
  }
  cumulative -= 1;

  // ③ العائد السنوي (Annualized)
  // Method 1: من العائد التراكمي
  // R_annual = (1 + R_cum)^(252/n) - 1
  var annualFromCumulative = Math.pow(1 + cumulative, 252 / n) - 1;

  // Method 2: من العائد اليومي (بديل للفترات الطويلة)
  // R_annual = (1 + R_daily)^252 - 1
  var annualFromDaily = Math.pow(1 + dailyReturn, 252) - 1;

  // استخدام الطريقة الأولى (أكثر دقة) لكن نعرضهما معاً
  return {
    daily: +dailyReturn.toFixed(6),
    cumulative: +cumulative.toFixed(4),
    annual: +annualFromCumulative.toFixed(4),
    annualFromDaily: +annualFromDaily.toFixed(4),
    periodDays: n,
  };
}
/* ══════════════════════════════════════════════════════════
   ④ مقاييس الأداء -- التذبذب (Volatility)
═══════════════════════════════════════════════════════════ */

/**
 * حساب التذبذب اليومي والسنوي للمحفظة
 *
 * يعتمد على قاعدة جذر الزمن (Bachelier 1900):
 * σ_annual = σ_daily × √252
 *
 * تصنيف التذبذب (معايير CFA):
 * - low: < 10% (منخفض -- محفظة دفاعية)
 * - moderate: 10-20% (متوسط -- محفظة متوازنة)
 * - high: 20-30% (مرتفع -- محفظة نمو)
 * - extreme: > 30% (شديد -- محفظة مضاربية)
 *
 * @param {number[]} portfolioReturns - سلسلة العوائد اليومية
 * @returns {Object} {daily, annual, classification, label}
 *
 * @example
 * var vol = calcVolatility(returns);
 * console.log(vol.annual); // 0.18 يعني 18% سنوياً
 * console.log(vol.label);  // "متوسط"
 */
export function calcVolatility(portfolioReturns) {
  // فحص المدخلات
  if (!portfolioReturns || portfolioReturns.length < 2) {
    return {
      daily: 0,
      annual: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
    };
  }

  // ① حساب الانحراف المعياري اليومي
  // std = √[Σ(r_i - μ)² / (n-1)]
  var n = portfolioReturns.length;
  var sum = 0;
  for (var i = 0; i < n; i++) sum += portfolioReturns[i];
  var mean = sum / n;

  var sumSqDev = 0;
  for (var j = 0; j < n; j++) {
    var dev = portfolioReturns[j] - mean;
    sumSqDev += dev * dev;
  }
  var variance = sumSqDev / (n - 1); // n-1 = Bessel's correction
  var dailyStd = Math.sqrt(variance);

  // ② التحويل السنوي (قاعدة جذر الزمن)
  // σ_annual = σ_daily × √252
  var annualVol = dailyStd * Math.sqrt(252);

  // ③ التصنيف
  var classification, label;
  if (annualVol < 0.10) {
    classification = 'low';
    label = 'منخفض';
  } else if (annualVol < 0.20) {
    classification = 'moderate';
    label = 'متوسط';
  } else if (annualVol < 0.30) {
    classification = 'high';
    label = 'مرتفع';
  } else {
    classification = 'extreme';
    label = 'شديد';
  }

  return {
    daily: +dailyStd.toFixed(5),
    annual: +annualVol.toFixed(4),
    classification: classification,
    label: label,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑤ مقاييس الأداء -- Sharpe Ratio (نوبل 1990)
═══════════════════════════════════════════════════════════ */

/**
 * حساب Sharpe Ratio للمحفظة
 *
 * المعادلة الأكاديمية الأصلية (Sharpe 1966):
 * Sharpe = (R_portfolio - R_riskfree) / σ_portfolio
 *
 * حيث:
 * - R_portfolio: العائد السنوي للمحفظة
 * - R_riskfree: معدل العائد الخالي من المخاطر (السايبور)
 * - σ_portfolio: التذبذب السنوي للمحفظة
 *
 * تصنيف CFA:
 * - > 3.0: أسطوري (نادر)
 * - 2.0-3.0: ممتاز
 * - 1.0-2.0: جيد جداً
 * - 0.5-1.0: مقبول
 * - 0.0-0.5: ضعيف
 * - < 0: سلبي (خسارة بعد تعديل المخاطر)
 *
 * @param {number} annualReturn - العائد السنوي (decimal: 0.12 = 12%)
 * @param {number} annualVolatility - التذبذب السنوي (decimal)
 * @param {number} riskFreeRate - معدل خالي من المخاطر سنوي (default: 0.06)
 * @returns {Object} {value, classification, label, interpretation}
 *
 * @example
 * var sharpe = calcSharpeRatio(0.12, 0.18, 0.06);
 * console.log(sharpe.value);  // 0.33
 * console.log(sharpe.label);  // "ضعيف"
 */
export function calcSharpeRatio(annualReturn, annualVolatility, riskFreeRate) {
  // القيمة الافتراضية للسايبور السعودي
  if (riskFreeRate === undefined) riskFreeRate = 0.06;

  // حالة حدية: لا يوجد تذبذب (محفظة نقدية 100%)
  if (!annualVolatility || annualVolatility <= 0) {
    return {
      value: 0,
      classification: 'unknown',
      label: 'لا يمكن حسابه',
      interpretation: 'التذبذب صفر -- محفظة نقدية أو بيانات غير كافية',
    };
  }

  // ① حساب Sharpe Ratio
  var excessReturn = annualReturn - riskFreeRate;
  var sharpe = excessReturn / annualVolatility;

  // ② التصنيف
  var classification, label, interpretation;

  if (sharpe > 3.0) {
    classification = 'legendary';
    label = 'أسطوري';
    interpretation = 'أداء استثنائي نادر - مستوى Renaissance / Medallion';
  } else if (sharpe > 2.0) {
    classification = 'excellent';
    label = 'ممتاز';
    interpretation = 'أداء صناديق النخبة - استراتيجية محكمة';
  } else if (sharpe > 1.0) {
    classification = 'veryGood';
    label = 'جيد جداً';
    interpretation = 'أداء احترافي - أفضل من معظم الصناديق';
  } else if (sharpe > 0.5) {
    classification = 'good';
    label = 'مقبول';
    interpretation = 'أداء متوسط - فوق المؤشر قليلاً';
  } else if (sharpe > 0) {
    classification = 'poor';
    label = 'ضعيف';
    interpretation = 'العائد بالكاد يبرر المخاطرة - راجع الاستراتيجية';
  } else {
    classification = 'negative';
    label = 'سلبي';
    interpretation = 'خسارة بعد تعديل المخاطر - السايبور أفضل من محفظتك';
  }

  return {
    value: +sharpe.toFixed(3),
    excessReturn: +excessReturn.toFixed(4),
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑤ حالة فارغة (للمحافظ الفارغة)
═══════════════════════════════════════════════════════════ */

/**
 * إرجاع تحليل فارغ للمحافظ غير الجاهزة
 * يتجنب الأخطاء في الواجهة عندما لا توجد بيانات
 */
function emptyPortfolioAnalysis() {
  return {
    totalValue: 0,
    stockCount: 0,
    weights: {},
    performance: {
      dailyReturn: 0,
      annualReturn: 0,
      volatility: 0,
      sharpe: 0,
      sortino: 0,
      alpha: 0,
      beta: 0,
    },
    risk: {
      maxDrawdown: 0,
      var95: 0,
      cvar95: 0,
      downsideDeviation: 0,
      calmar: 0,
    },
    diversification: {
      hhi: 0,
      correlationMatrix: {},
      avgCorrelation: 0,
      score: 0,
      effectiveStocks: 0,
    },
    healthScore: 0,
    healthGrade: 'N/A',
    recommendations: [],
  };
}

/* ══════════════════════════════════════════════════════════
   ⑥ دوال التصدير (للاستخدام في الشاشة)
═══════════════════════════════════════════════════════════ */

// تصدير الثوابت للاستخدام في أماكن أخرى
export var CONFIG = {
  RISK_FREE_DAILY: RISK_FREE_DAILY,
  TRADING_DAYS: TRADING_DAYS,
  VAR_CONFIDENCE: VAR_CONFIDENCE,
};
