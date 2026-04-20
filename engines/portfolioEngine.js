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

              // مقاييس الأداء (الخطوات 5-10 ✅) -- المرحلة 2 مكتملة!
  performance: (function() {
    var portfolioReturns = calcPortfolioReturns(positions, weights);
    var returnsMetrics = calcReturnsMetrics(portfolioReturns);
    var volMetrics = calcVolatility(portfolioReturns);
    // ⭐ Sharpe Ratio -- الخطوة 7
    var sharpeMetrics = calcSharpeRatio(
      returnsMetrics.annual,
      volMetrics.annual,
      0.06
    );
    // ⭐ Sortino Ratio -- الخطوة 8
    var sortinoMetrics = calcSortinoRatio(
      portfolioReturns,
      returnsMetrics.annual,
      0.06
    );
    // ⭐ Portfolio Beta vs TASI -- الخطوة 9
    var marketReturns;
    if (tasiBars && tasiBars.length > 1) {
      marketReturns = simpleReturns(tasiBars);
    } else {
      marketReturns = buildTasiSyntheticReturns(positions);
    }
    var betaMetrics = calcPortfolioBeta(portfolioReturns, marketReturns);
    // ⭐ Jensen's Alpha -- الخطوة 10
    // حساب العائد السنوي لتاسي
    var tasiReturnsMetrics = calcReturnsMetrics(marketReturns);
    var alphaMetrics = calcJensensAlpha(
      returnsMetrics.annual,
      tasiReturnsMetrics.annual,
      betaMetrics.value,
      0.06
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
      // ⭐ Sharpe
      sharpe: sharpeMetrics.value,
      sharpeClass: sharpeMetrics.classification,
      sharpeLabel: sharpeMetrics.label,
      sharpeInterpretation: sharpeMetrics.interpretation,
      excessReturn: sharpeMetrics.excessReturn,
      // ⭐ Sortino
      sortino: sortinoMetrics.value,
      sortinoClass: sortinoMetrics.classification,
      sortinoLabel: sortinoMetrics.label,
      sortinoInterpretation: sortinoMetrics.interpretation,
      downsideDeviation: sortinoMetrics.downsideDeviationAnnual,
      // ⭐ Beta
      beta: betaMetrics.value,
      betaClass: betaMetrics.classification,
      betaLabel: betaMetrics.label,
      betaInterpretation: betaMetrics.interpretation,
      // ⭐ Alpha (الخطوة 10) -- المرحلة 2 مكتملة!
      alpha: alphaMetrics.value,
      alphaClass: alphaMetrics.classification,
      alphaLabel: alphaMetrics.label,
      alphaInterpretation: alphaMetrics.interpretation,
      expectedReturn: alphaMetrics.expected,
      marketAnnualReturn: tasiReturnsMetrics.annual,
    };
  })(),

        // مقاييس المخاطر (الخطوات 11-15 ✅) -- المرحلة 3 مكتملة!
    risk: (function() {
      var portfolioReturns = calcPortfolioReturns(positions, weights);
      // ⭐ Maximum Drawdown -- الخطوة 11
      var ddMetrics = calcMaxDrawdown(portfolioReturns);
      // ⭐ Value at Risk -- الخطوة 12
      var varMetrics = calcVaR(portfolioReturns, 95, totalValue);
      // ⭐ Conditional VaR -- الخطوة 13
      var cvarMetrics = calcCVaR(portfolioReturns, 95, totalValue);
      // ⭐ Calmar Ratio -- الخطوة 14
      var returnsMetrics = calcReturnsMetrics(portfolioReturns);
      var calmarMetrics = calcCalmarRatio(returnsMetrics.annual, ddMetrics.maxDrawdown);
      // ⭐ Downside Deviation -- الخطوة 15
      var downMetrics = calcDownsideDeviation(portfolioReturns, 0);
      return {
        // Max Drawdown
        maxDrawdown: ddMetrics.maxDrawdown,
        drawdownDuration: ddMetrics.duration,
        recoveryDays: ddMetrics.recoveryDays,
        drawdownClass: ddMetrics.classification,
        drawdownLabel: ddMetrics.label,
        drawdownInterpretation: ddMetrics.interpretation,
        // VaR 95%
        var95Daily: varMetrics.daily,
        var95Weekly: varMetrics.weekly,
        var95Monthly: varMetrics.monthly,
        var95DailySAR: varMetrics.dailySAR,
        var95WeeklySAR: varMetrics.weeklySAR,
        var95MonthlySAR: varMetrics.monthlySAR,
        varClass: varMetrics.classification,
        varLabel: varMetrics.label,
        varInterpretation: varMetrics.interpretation,
        // CVaR 95%
        cvar95Daily: cvarMetrics.daily,
        cvar95Weekly: cvarMetrics.weekly,
        cvar95Monthly: cvarMetrics.monthly,
        cvar95DailySAR: cvarMetrics.dailySAR,
        cvar95WeeklySAR: cvarMetrics.weeklySAR,
        cvar95MonthlySAR: cvarMetrics.monthlySAR,
        cvarClass: cvarMetrics.classification,
        cvarLabel: cvarMetrics.label,
        cvarInterpretation: cvarMetrics.interpretation,
        // Calmar
        calmar: calmarMetrics.value,
        calmarClass: calmarMetrics.classification,
        calmarLabel: calmarMetrics.label,
        calmarInterpretation: calmarMetrics.interpretation,
        // ⭐ Downside Deviation -- الخطوة 15
        downsideDeviationDaily: downMetrics.daily,
        downsideDeviationAnnual: downMetrics.annual,
        negativeDaysCount: downMetrics.negativeDaysCount,
        negativeDaysPct: downMetrics.negativeDaysPct,
        downsideClass: downMetrics.classification,
        downsideLabel: downMetrics.label,
        downsideInterpretation: downMetrics.interpretation,
      };
    })(),

        
        // التنويع (الخطوة 16 ✅ - بداية المرحلة 4)
    diversification: (function() {
      // ⭐ HHI -- الخطوة 16
      var hhiMetrics = calcHHI(weights);
      return {
        hhi: hhiMetrics.value,
        effectiveStocks: hhiMetrics.effectiveStocks,
        largestPosition: hhiMetrics.largestPosition,
        stockCount: hhiMetrics.stockCount,
        hhiClass: hhiMetrics.classification,
        hhiLabel: hhiMetrics.label,
        hhiInterpretation: hhiMetrics.interpretation,
        concentrationWarning: hhiMetrics.concentrationWarning,
        // ستُضاف لاحقاً:
        correlationMatrix: null,
        avgCorrelation: null,
        score: null,
      };
    })(),

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
   ⑥ مقاييس الأداء -- Sortino Ratio (Sortino 1994)
═══════════════════════════════════════════════════════════ */

/**
 * حساب Sortino Ratio للمحفظة
 *
 * المعادلة الأكاديمية (Sortino & van der Meer 1991, Sortino & Price 1994):
 * Sortino = (R_portfolio - R_riskfree) / σ_downside
 *
 * الفرق الجوهري عن Sharpe:
 * - Sharpe يستخدم σ (الانحراف المعياري الكامل)
 * - Sortino يستخدم σ_downside (الانحراف السلبي فقط)
 *
 * مزايا Sortino على Sharpe:
 * ① لا يعاقب على التذبذب الإيجابي (الأرباح)
 * ② يقيس "المخاطرة الحقيقية" (الخسائر فقط)
 * ③ أكثر واقعية للمستثمر
 *
 * قاعدة ذهبية: Sortino > Sharpe (دائماً لنفس المحفظة)
 *
 * @param {number[]} portfolioReturns - سلسلة العوائد اليومية
 * @param {number} annualReturn - العائد السنوي (decimal)
 * @param {number} riskFreeRate - معدل خالي من المخاطر سنوي
 * @returns {Object} {value, classification, label, downsideDeviationAnnual}
 */
export function calcSortinoRatio(portfolioReturns, annualReturn, riskFreeRate) {
  // القيمة الافتراضية للسايبور السعودي
  if (riskFreeRate === undefined) riskFreeRate = 0.06;

  // فحص المدخلات
  if (!portfolioReturns || portfolioReturns.length < 2) {
    return {
      value: 0,
      downsideDeviationAnnual: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا توجد بيانات كافية للحساب',
    };
  }

  // ① حساب العتبة اليومية من السايبور (Minimum Acceptable Return)
  // MAR_daily = R_riskfree / 252
  var marDaily = riskFreeRate / 252;

  // ② حساب الانحراف السلبي (Downside Deviation)
  // نأخذ فقط العوائد التي تحت العتبة
  // DD = √[Σ min(0, r_i - MAR)² / n]
  var sumSqDownside = 0;
  var n = portfolioReturns.length;

  for (var i = 0; i < n; i++) {
    var deviation = portfolioReturns[i] - marDaily;
    // نأخذ فقط الانحرافات السلبية (الخسائر)
    if (deviation < 0) {
      sumSqDownside += deviation * deviation;
    }
    // الانحرافات الموجبة = 0 في الحساب (الفرق عن Sharpe)
  }

  // متوسط التذبذب السلبي اليومي
  var downsideDeviationDaily = Math.sqrt(sumSqDownside / n);

  // ③ التحويل السنوي (قاعدة جذر الزمن)
  var downsideDeviationAnnual = downsideDeviationDaily * Math.sqrt(252);

  // حالة حدية: لا توجد خسائر (محفظة مثالية)
  if (downsideDeviationAnnual <= 0) {
    return {
      value: Infinity,
      downsideDeviationAnnual: 0,
      classification: 'perfect',
      label: 'لا خسائر',
      interpretation: 'المحفظة لم تسجل أي خسائر في الفترة -- مؤشر إيجابي استثنائي',
    };
  }

  // ④ حساب Sortino Ratio
  var excessReturn = annualReturn - riskFreeRate;
  var sortino = excessReturn / downsideDeviationAnnual;

  // ⑤ التصنيف (أعلى من Sharpe لأن Sortino أكثر تساهلاً)
  var classification, label, interpretation;

  if (sortino > 3.0) {
    classification = 'legendary';
    label = 'أسطوري';
    interpretation = 'عائد ممتاز مع حد أدنى من الخسائر';
  } else if (sortino > 2.5) {
    classification = 'excellent';
    label = 'ممتاز';
    interpretation = 'إدارة خسائر احترافية';
  } else if (sortino > 1.5) {
    classification = 'veryGood';
    label = 'جيد جداً';
    interpretation = 'توازن ممتاز بين العائد والخسائر';
  } else if (sortino > 0.8) {
    classification = 'good';
    label = 'جيد';
    interpretation = 'أداء مقبول -- الخسائر مُدارة';
  } else if (sortino > 0) {
    classification = 'poor';
    label = 'ضعيف';
    interpretation = 'العائد لا يعوض الخسائر بشكل كافٍ';
  } else {
    classification = 'negative';
    label = 'سلبي';
    interpretation = 'الخسائر تتجاوز الأرباح -- خطر حقيقي';
  }

  return {
    value: +sortino.toFixed(3),
    downsideDeviationAnnual: +downsideDeviationAnnual.toFixed(4),
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑦ TASI Synthetic Index -- بناء مؤشر مرجعي
   
   لا توجد بيانات تاسي تاريخية مباشرة، لذا نبنيها من
   متوسط مرجّح بالقيمة السوقية لأكبر 10 أسهم
   (نفس منهجية S&P 500 و Nikkei 225)
═══════════════════════════════════════════════════════════ */

/**
 * بناء سلسلة عوائد TASI Synthetic
 * 
 * المنهجية: Market-Cap Weighted Index
 * TASI(t) = Σ [w_i × P_i(t)]
 * 
 * @param {Array} stocksWithBars - [{stk, bars, value}] - الأسهم مع بياناتها
 * @returns {number[]} - سلسلة عوائد تاسي اليومية (decimal)
 *
 * @example
 * var tasiReturns = buildTasiSyntheticReturns(allStocksWithBars);
 * // [0.008, -0.003, 0.005, ...]
 */
export function buildTasiSyntheticReturns(stocksWithBars) {
  if (!stocksWithBars || stocksWithBars.length === 0) return [];

  // ① اختيار أكبر 10 أسهم بالقيمة السوقية
  // إذا لم تتوفر mktCap، نستخدم value كبديل
  var topStocks = stocksWithBars
    .slice()
    .sort(function(a, b) {
      var aCap = (a.stk && a.stk.mktCap) || a.value || 0;
      var bCap = (b.stk && b.stk.mktCap) || b.value || 0;
      return bCap - aCap;
    })
    .slice(0, Math.min(10, stocksWithBars.length));

  if (topStocks.length === 0) return [];

  // ② حساب الأوزان النسبية
  var totalCap = 0;
  for (var i = 0; i < topStocks.length; i++) {
    var cap = (topStocks[i].stk && topStocks[i].stk.mktCap) || topStocks[i].value || 0;
    totalCap += cap;
  }

  if (totalCap === 0) return [];

  var weights = [];
  for (var j = 0; j < topStocks.length; j++) {
    var cap2 = (topStocks[j].stk && topStocks[j].stk.mktCap) || topStocks[j].value || 0;
    weights.push(cap2 / totalCap);
  }

  // ③ حساب عوائد كل سهم
  var stockReturns = [];
  var minLength = Infinity;

  for (var k = 0; k < topStocks.length; k++) {
    var bars = topStocks[k].bars;
    if (!bars || bars.length < 2) continue;

    var rets = simpleReturns(bars);
    stockReturns.push(rets);
    if (rets.length < minLength) minLength = rets.length;
  }

  if (minLength === Infinity || minLength === 0) return [];

  // ④ حساب عوائد TASI Synthetic (مرجّحة)
  var tasiReturns = [];
  for (var t = 0; t < minLength; t++) {
    var dailyTasiReturn = 0;
    for (var s = 0; s < stockReturns.length; s++) {
      if (stockReturns[s] && stockReturns[s].length > 0) {
        var idx = stockReturns[s].length - minLength + t;
        dailyTasiReturn += weights[s] * stockReturns[s][idx];
      }
    }
    tasiReturns.push(dailyTasiReturn);
  }

  return sanitize(tasiReturns);
}

/* ══════════════════════════════════════════════════════════
   ⑧ Portfolio Beta -- حساسية المحفظة لحركة السوق
═══════════════════════════════════════════════════════════ */

/**
 * حساب Beta للمحفظة مقابل TASI
 * 
 * المعادلة الأكاديمية (Sharpe 1964, CAPM):
 * β = Cov(R_portfolio, R_market) / Var(R_market)
 * 
 * التفسير:
 * β = 1.0  : تتحرك مثل تاسي
 * β > 1.0  : أكثر تذبذباً من تاسي (hyper-aggressive)
 * β < 1.0  : أقل تذبذباً من تاسي (defensive)
 * β = 0    : غير مرتبطة (نادر)
 * β < 0    : تتحرك عكس تاسي (hedged)
 * 
 * @param {number[]} portfolioReturns
 * @param {number[]} marketReturns
 * @returns {Object} {value, classification, label, interpretation}
 */
export function calcPortfolioBeta(portfolioReturns, marketReturns) {
  // فحص المدخلات
  if (!portfolioReturns || !marketReturns ||
      portfolioReturns.length < 2 || marketReturns.length < 2) {
    return {
      value: 1.0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا يمكن حساب Beta بدون بيانات تاريخية كافية',
    };
  }

  // مزامنة الأطوال
  var minLen = Math.min(portfolioReturns.length, marketReturns.length);
  var pReturns = portfolioReturns.slice(-minLen);
  var mReturns = marketReturns.slice(-minLen);

  // حساب Beta
  var betaValue = beta(pReturns, mReturns);

  // التصنيف
  var classification, label, interpretation;

  if (betaValue > 1.5) {
    classification = 'aggressive';
    label = 'عدوانية جداً';
    interpretation = 'المحفظة تتحرك أكثر من تاسي بـ ' +
                    Math.round((betaValue - 1) * 100) + '% -- مخاطرة عالية';
  } else if (betaValue > 1.2) {
    classification = 'moderatelyAggressive';
    label = 'عدوانية';
    interpretation = 'أكثر تذبذباً من تاسي -- تربح أكثر في الصعود، تخسر أكثر في الهبوط';
  } else if (betaValue > 0.8) {
    classification = 'balanced';
    label = 'متوازنة';
    interpretation = 'تتحرك تقريباً مع تاسي -- توازن طبيعي';
  } else if (betaValue > 0.5) {
    classification = 'defensive';
    label = 'دفاعية';
    interpretation = 'أقل تذبذباً من تاسي -- حماية جزئية في الأزمات';
  } else if (betaValue > 0) {
    classification = 'veryDefensive';
    label = 'دفاعية جداً';
    interpretation = 'تتحرك بشكل مستقل تقريباً عن تاسي -- تنويع ممتاز';
  } else {
    classification = 'inverse';
    label = 'عكسية';
    interpretation = 'تتحرك عكس تاسي -- تحوّط طبيعي (نادر)';
  }

  return {
    value: +betaValue.toFixed(3),
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑨ Jensen's Alpha -- "هل أنت أذكى من السوق؟"
═══════════════════════════════════════════════════════════ */

/**
 * حساب Jensen's Alpha للمحفظة
 *
 * المعادلة الأكاديمية (Jensen 1968):
 * α = R_p - [R_f + β × (R_m - R_f)]
 *
 * حيث:
 * - R_p: العائد الفعلي للمحفظة
 * - R_f: معدل خالي من المخاطر
 * - β:  Beta المحفظة
 * - R_m: عائد السوق (تاسي)
 *
 * التفسير:
 * Alpha > 0 : تفوقت على السوق (بعد تعديل المخاطر)
 * Alpha = 0 : أداؤك = أداء السوق (مؤشر)
 * Alpha < 0 : أداؤك أقل من السوق
 *
 * تصنيف Alpha السنوي:
 * - > +5%: استثنائي (مستوى Buffett)
 * - +3% to +5%: ممتاز
 * - +1% to +3%: جيد
 * - 0% to +1%: محايد
 * - 0% to -2%: ضعيف
 * - < -2%: فاشل
 *
 * ملاحظة: 90% من الصناديق العالمية تحقق Alpha سالب على المدى الطويل
 *
 * @param {number} portfolioAnnualReturn - العائد السنوي للمحفظة
 * @param {number} marketAnnualReturn - العائد السنوي لتاسي
 * @param {number} beta - Beta المحفظة
 * @param {number} riskFreeRate - معدل خالي من المخاطر
 * @returns {Object} {value, expected, classification, label, interpretation}
 */
export function calcJensensAlpha(portfolioAnnualReturn, marketAnnualReturn, beta, riskFreeRate) {
  // القيم الافتراضية
  if (riskFreeRate === undefined) riskFreeRate = 0.06;
  if (beta === undefined || beta === null) beta = 1.0;

  // فحص المدخلات
  if (portfolioAnnualReturn === undefined || portfolioAnnualReturn === null ||
      marketAnnualReturn === undefined || marketAnnualReturn === null) {
    return {
      value: 0,
      expected: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا يمكن حساب Alpha بدون بيانات كاملة',
    };
  }

  // ① حساب العائد المتوقع حسب CAPM
  // Expected = R_f + β × (R_m - R_f)
  var marketRiskPremium = marketAnnualReturn - riskFreeRate;
  var expectedReturn = riskFreeRate + beta * marketRiskPremium;

  // ② حساب Alpha
  // α = R_p - Expected
  var alpha = portfolioAnnualReturn - expectedReturn;

  // ③ التصنيف (معايير مهنية لإدارة الصناديق)
  var classification, label, interpretation;

  if (alpha > 0.05) {
    classification = 'exceptional';
    label = 'استثنائي';
    interpretation = 'تتفوق على السوق بـ ' + (alpha * 100).toFixed(1) +
                    '% سنوياً -- مستوى أفضل صناديق العالم';
  } else if (alpha > 0.03) {
    classification = 'excellent';
    label = 'ممتاز';
    interpretation = 'تتفوق على السوق بشكل ملحوظ -- اختيار أسهم احترافي';
  } else if (alpha > 0.01) {
    classification = 'good';
    label = 'جيد';
    interpretation = 'تتفوق على السوق قليلاً -- اختيار جيد للأسهم';
  } else if (alpha > -0.01) {
    classification = 'neutral';
    label = 'محايد';
    interpretation = 'أداؤك يطابق السوق تقريباً -- لا ميزة واضحة';
  } else if (alpha > -0.03) {
    classification = 'poor';
    label = 'ضعيف';
    interpretation = 'أداؤك أقل من السوق -- راجع اختياراتك';
  } else {
    classification = 'failing';
    label = 'فاشل';
    interpretation = 'أداؤك أقل بكثير من السوق -- شراء مؤشر تاسي أفضل';
  }

  return {
    value: +alpha.toFixed(4),
    expected: +expectedReturn.toFixed(4),
    marketRiskPremium: +marketRiskPremium.toFixed(4),
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑩ Maximum Drawdown -- أسوأ رحلة نفسية
═══════════════════════════════════════════════════════════ */

/**
 * حساب Maximum Drawdown و Drawdown Duration
 *
 * المنهجية الأكاديمية (Kestner 2003):
 * 1. بناء منحنى قيمة المحفظة من العوائد
 * 2. تتبع القمم المتحركة (Running Maximum)
 * 3. حساب الهبوط من كل قمة
 * 4. استخراج أكبر هبوط + مدته
 *
 * المعادلة:
 * DD(t) = (V(t) - Peak(t)) / Peak(t)
 * MaxDD = min(DD) لكل t
 *
 * تصنيف Max Drawdown:
 * - > -5%: ممتاز (مستقرة)
 * - -5% to -10%: جيد (طبيعي)
 * - -10% to -20%: مقبول (يحتاج صبر)
 * - -20% to -30%: صعب نفسياً
 * - < -30%: كارثي
 *
 * @param {number[]} returns - سلسلة العوائد اليومية
 * @returns {Object} {maxDrawdown, duration, recoveryDays, peakValue, troughValue, ...}
 */
export function calcMaxDrawdown(returns) {
  // فحص المدخلات
  if (!returns || returns.length < 2) {
    return {
      maxDrawdown: 0,
      duration: 0,
      recoveryDays: null,
      peakIndex: 0,
      troughIndex: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا توجد بيانات كافية للحساب',
    };
  }

  // ① بناء منحنى قيمة المحفظة (Cumulative Value)
  // نبدأ من 1.0 ونضرب بـ (1 + العائد) لكل يوم
  var cumValue = [1.0];
  for (var i = 0; i < returns.length; i++) {
    cumValue.push(cumValue[cumValue.length - 1] * (1 + returns[i]));
  }

  // ② تتبع أعلى قمة حتى كل نقطة (Running Maximum)
  var runningMax = [cumValue[0]];
  for (var j = 1; j < cumValue.length; j++) {
    runningMax.push(Math.max(runningMax[j - 1], cumValue[j]));
  }

  // ③ حساب Drawdown في كل نقطة
  // DD(t) = (V(t) / Peak(t)) - 1
  var drawdowns = [];
  for (var k = 0; k < cumValue.length; k++) {
    var dd = (cumValue[k] / runningMax[k]) - 1;
    drawdowns.push(dd);
  }

  // ④ إيجاد Max Drawdown (أكبر هبوط -- أصغر قيمة سالبة)
  var maxDD = 0;
  var troughIdx = 0;
  for (var l = 0; l < drawdowns.length; l++) {
    if (drawdowns[l] < maxDD) {
      maxDD = drawdowns[l];
      troughIdx = l;
    }
  }

  // ⑤ إيجاد القمة السابقة للقاع (Peak Index)
  var peakIdx = 0;
  var peakValue = cumValue[0];
  for (var m = 0; m <= troughIdx; m++) {
    if (cumValue[m] > peakValue) {
      peakValue = cumValue[m];
      peakIdx = m;
    }
  }

  // ⑥ حساب مدة Drawdown (من القمة للقاع)
  var duration = troughIdx - peakIdx;

  // ⑦ حساب أيام التعافي (إذا حدث)
  var recoveryDays = null;
  for (var p = troughIdx + 1; p < cumValue.length; p++) {
    if (cumValue[p] >= peakValue) {
      recoveryDays = p - troughIdx;
      break;
    }
  }

  // ⑧ التصنيف
  var classification, label, interpretation;

  if (maxDD > -0.05) {
    classification = 'excellent';
    label = 'ممتاز';
    interpretation = 'محفظة مستقرة جداً -- تراجعات محدودة';
  } else if (maxDD > -0.10) {
    classification = 'good';
    label = 'جيد';
    interpretation = 'تراجعات طبيعية -- سهلة التحمل نفسياً';
  } else if (maxDD > -0.20) {
    classification = 'moderate';
    label = 'مقبول';
    interpretation = 'يتطلب صبراً -- 80% من المستثمرين يتحملون هذا المستوى';
  } else if (maxDD > -0.30) {
    classification = 'difficult';
    label = 'صعب نفسياً';
    interpretation = 'معظم المستثمرين يبيعون عند هذا التراجع -- احذر';
  } else {
    classification = 'catastrophic';
    label = 'كارثي';
    interpretation = 'تراجع حاد -- نادراً ما يصمد المستثمر نفسياً';
  }

  return {
    maxDrawdown: +maxDD.toFixed(4),
    duration: duration,
    recoveryDays: recoveryDays,
    peakIndex: peakIdx,
    troughIndex: troughIdx,
    peakValue: +peakValue.toFixed(4),
    troughValue: +cumValue[troughIdx].toFixed(4),
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑪ Value at Risk (VaR) -- معيار JPMorgan / بازل III
═══════════════════════════════════════════════════════════ */

/**
 * حساب Value at Risk للمحفظة
 *
 * المنهجية: Historical Simulation Method (Hull 2018)
 * - أسلوب غير معلمي (non-parametric)
 * - لا يفترض توزيع العوائد
 * - أدق من Parametric VaR للأسواق الناشئة
 *
 * المعادلة:
 * VaR_α(daily) = -Percentile(returns, 100-α)
 * VaR_α(weekly) = VaR_daily × √5
 * VaR_α(monthly) = VaR_daily × √21
 *
 * التفسير:
 * VaR 95% = 2.5% → "في 95% من الأيام، الخسارة ≤ 2.5%"
 *                  "في 5% من الأيام (1 من 20)، قد تتجاوز"
 *
 * تصنيف VaR يومي:
 * - < 1%: محافظة
 * - 1%-2%: متوازنة
 * - 2%-3%: نمو
 * - 3%-5%: عدوانية
 * - > 5%: مضاربة
 *
 * @param {number[]} returns - سلسلة العوائد اليومية
 * @param {number} confidence - مستوى الثقة (افتراضي 95)
 * @param {number} portfolioValue - قيمة المحفظة (لحساب الخسارة بالريال)
 * @returns {Object} {daily, weekly, monthly, dailySAR, ...}
 */
export function calcVaR(returns, confidence, portfolioValue) {
  // القيم الافتراضية
  if (confidence === undefined) confidence = 95;
  if (portfolioValue === undefined) portfolioValue = 0;

  // فحص المدخلات
  if (!returns || returns.length < 10) {
    return {
      daily: 0,
      weekly: 0,
      monthly: 0,
      dailySAR: 0,
      weeklySAR: 0,
      monthlySAR: 0,
      confidence: confidence,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'تحتاج 10+ أيام من البيانات لحساب VaR',
    };
  }

  // ① ترتيب العوائد تصاعدياً (من الأسوأ للأفضل)
  var sorted = returns.slice().sort(function(a, b) { return a - b; });

  // ② حساب موقع الـ Percentile
  // VaR 95% = أسوأ 5% من العوائد
  var percentileIdx = Math.floor((100 - confidence) / 100 * sorted.length);
  if (percentileIdx >= sorted.length) percentileIdx = sorted.length - 1;
  if (percentileIdx < 0) percentileIdx = 0;

  // ③ VaR يومي (قيمة سالبة → نحولها موجبة للوضوح)
  var varDaily = -sorted[percentileIdx];
  if (varDaily < 0) varDaily = 0; // حالة نادرة: كل العوائد موجبة

  // ④ VaR أسبوعي وشهري (قاعدة جذر الزمن)
  var varWeekly = varDaily * Math.sqrt(5);
  var varMonthly = varDaily * Math.sqrt(21);

  // ⑤ تحويل إلى ريال سعودي
  var dailySAR = varDaily * portfolioValue;
  var weeklySAR = varWeekly * portfolioValue;
  var monthlySAR = varMonthly * portfolioValue;

  // ⑥ التصنيف (معايير بنكية)
  var classification, label, interpretation;

  if (varDaily < 0.01) {
    classification = 'conservative';
    label = 'محافظة';
    interpretation = 'مخاطر يومية منخفضة جداً -- محفظة دفاعية';
  } else if (varDaily < 0.02) {
    classification = 'balanced';
    label = 'متوازنة';
    interpretation = 'مخاطر معتدلة -- مناسبة للاستثمار طويل المدى';
  } else if (varDaily < 0.03) {
    classification = 'growth';
    label = 'نمو';
    interpretation = 'مخاطر نشطة -- عوائد محتملة أعلى';
  } else if (varDaily < 0.05) {
    classification = 'aggressive';
    label = 'عدوانية';
    interpretation = 'مخاطر مرتفعة -- تحتاج قدرة على تحمل الخسائر';
  } else {
    classification = 'speculative';
    label = 'مضاربية';
    interpretation = 'مخاطر عالية جداً -- محفظة مضاربية';
  }

  return {
    daily: +varDaily.toFixed(4),
    weekly: +varWeekly.toFixed(4),
    monthly: +varMonthly.toFixed(4),
    dailySAR: +dailySAR.toFixed(0),
    weeklySAR: +weeklySAR.toFixed(0),
    monthlySAR: +monthlySAR.toFixed(0),
    confidence: confidence,
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑫ Conditional VaR (CVaR) -- Expected Shortfall
   معيار Basel III الحديث (2019+)
═══════════════════════════════════════════════════════════ */

/**
 * حساب Conditional Value at Risk (CVaR)
 * المعروف أيضاً بـ Expected Shortfall (ES)
 *
 * المنهجية (Rockafellar & Uryasev 2000):
 * CVaR_α = E[Loss | Loss > VaR_α]
 *        = متوسط أسوأ (100-α)% من العوائد
 *
 * مزايا CVaR على VaR:
 * ① يكشف المخاطر الذيلية (Tail Risk)
 * ② Coherent Risk Measure (Artzner 1999)
 * ③ معيار Basel III الحديث
 * ④ مستخدم في BlackRock, Bridgewater, Goldman Sachs
 *
 * قاعدة: CVaR دائماً ≥ VaR
 *
 * @param {number[]} returns - سلسلة العوائد اليومية
 * @param {number} confidence - مستوى الثقة (افتراضي 95)
 * @param {number} portfolioValue - قيمة المحفظة
 * @returns {Object} {daily, weekly, monthly, dailySAR, ...}
 */
export function calcCVaR(returns, confidence, portfolioValue) {
  if (confidence === undefined) confidence = 95;
  if (portfolioValue === undefined) portfolioValue = 0;

  if (!returns || returns.length < 10) {
    return {
      daily: 0,
      weekly: 0,
      monthly: 0,
      dailySAR: 0,
      weeklySAR: 0,
      monthlySAR: 0,
      worstDays: [],
      confidence: confidence,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'تحتاج 10+ أيام من البيانات لحساب CVaR',
    };
  }

  // ① ترتيب العوائد تصاعدياً
  var sorted = returns.slice().sort(function(a, b) { return a - b; });

  // ② تحديد عتبة VaR (عدد أسوأ الأيام)
  var threshold = Math.floor((100 - confidence) / 100 * sorted.length);
  if (threshold < 1) threshold = 1;

  // ③ استخراج أسوأ الأيام
  var worstDays = sorted.slice(0, threshold);

  // ④ حساب متوسط الخسارة في أسوأ الأيام (CVaR)
  var sumWorst = 0;
  for (var i = 0; i < worstDays.length; i++) {
    sumWorst += worstDays[i];
  }
  var cvarDaily = -sumWorst / worstDays.length;
  if (cvarDaily < 0) cvarDaily = 0;

  // ⑤ CVaR أسبوعي وشهري (قاعدة جذر الزمن)
  var cvarWeekly = cvarDaily * Math.sqrt(5);
  var cvarMonthly = cvarDaily * Math.sqrt(21);

  // ⑥ تحويل إلى ريال سعودي
  var dailySAR = cvarDaily * portfolioValue;
  var weeklySAR = cvarWeekly * portfolioValue;
  var monthlySAR = cvarMonthly * portfolioValue;

  // ⑦ التصنيف
  var classification, label, interpretation;

  if (cvarDaily < 0.015) {
    classification = 'conservative';
    label = 'محافظة';
    interpretation = 'خسائر الأيام الكارثية محدودة -- محفظة دفاعية';
  } else if (cvarDaily < 0.025) {
    classification = 'balanced';
    label = 'متوازنة';
    interpretation = 'خسائر كارثية معقولة -- مقبولة للاستثمار طويل المدى';
  } else if (cvarDaily < 0.04) {
    classification = 'growth';
    label = 'نمو';
    interpretation = 'خسائر كارثية محسوسة -- تتطلب قدرة نفسية عالية';
  } else if (cvarDaily < 0.06) {
    classification = 'aggressive';
    label = 'عدوانية';
    interpretation = 'خسائر كارثية كبيرة -- مناسبة للمستثمرين ذوي الخبرة';
  } else {
    classification = 'speculative';
    label = 'مضاربية';
    interpretation = 'خسائر كارثية خطرة -- مستوى مضاربة عالية';
  }

  return {
    daily: +cvarDaily.toFixed(4),
    weekly: +cvarWeekly.toFixed(4),
    monthly: +cvarMonthly.toFixed(4),
    dailySAR: +dailySAR.toFixed(0),
    weeklySAR: +weeklySAR.toFixed(0),
    monthlySAR: +monthlySAR.toFixed(0),
    worstDaysCount: worstDays.length,
    confidence: confidence,
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑬ Calmar Ratio -- "العائد مقابل أسوأ كارثة"
═══════════════════════════════════════════════════════════ */

/**
 * حساب Calmar Ratio للمحفظة
 *
 * المنهجية الأكاديمية (Young 1991):
 * Calmar = Annual Return / |Max Drawdown|
 *
 * الفرق الجوهري عن Sharpe و Sortino:
 * - Sharpe يقيس: العائد مقابل التذبذب الكامل
 * - Sortino يقيس: العائد مقابل التذبذب السلبي
 * - Calmar يقيس: العائد مقابل أسوأ كارثة تاريخية
 *
 * مزايا Calmar:
 * ① يكشف المحافظ ذات "الكوارث التاريخية"
 * ② مستخدم في Hedge Funds الكبرى
 * ③ يحمي من الإغراء بالعوائد العالية
 *
 * تصنيف Calmar:
 * - > 3.0: أسطوري
 * - 2.0-3.0: ممتاز
 * - 1.0-2.0: جيد جداً
 * - 0.5-1.0: مقبول
 * - 0-0.5: ضعيف
 * - < 0: سلبي
 *
 * @param {number} annualReturn - العائد السنوي (decimal)
 * @param {number} maxDrawdown - Max Drawdown (قيمة سالبة)
 * @returns {Object} {value, classification, label, interpretation}
 */
export function calcCalmarRatio(annualReturn, maxDrawdown) {
  // فحص المدخلات
  if (annualReturn === undefined || annualReturn === null ||
      maxDrawdown === undefined || maxDrawdown === null) {
    return {
      value: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا يمكن حساب Calmar بدون Max Drawdown',
    };
  }

  // حالة حدية: لا توجد خسائر (محفظة مثالية)
  if (maxDrawdown >= 0 || Math.abs(maxDrawdown) < 0.001) {
    return {
      value: Infinity,
      classification: 'perfect',
      label: 'لا خسائر',
      interpretation: 'المحفظة لم تسجل تراجعات كبيرة -- مؤشر استثنائي',
    };
  }

  // ① حساب Calmar Ratio
  var calmar = annualReturn / Math.abs(maxDrawdown);

  // ② التصنيف
  var classification, label, interpretation;

  if (calmar > 3.0) {
    classification = 'legendary';
    label = 'أسطوري';
    interpretation = 'عائد استثنائي مقابل أقل كارثة -- نادر جداً عالمياً';
  } else if (calmar > 2.0) {
    classification = 'excellent';
    label = 'ممتاز';
    interpretation = 'عائد ممتاز مع حماية من التراجعات الحادة';
  } else if (calmar > 1.0) {
    classification = 'veryGood';
    label = 'جيد جداً';
    interpretation = 'توازن صحي بين العائد وأسوأ تراجع';
  } else if (calmar > 0.5) {
    classification = 'good';
    label = 'مقبول';
    interpretation = 'العائد يبرر التراجعات التاريخية -- لكن يحتاج صبر';
  } else if (calmar > 0) {
    classification = 'poor';
    label = 'ضعيف';
    interpretation = 'العائد لا يعوض المخاطر التاريخية بشكل كافٍ';
  } else {
    classification = 'negative';
    label = 'سلبي';
    interpretation = 'خسارة مع تراجعات -- محفظة خاسرة تاريخياً';
  }

  return {
    value: calmar === Infinity ? 999 : +calmar.toFixed(3),
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑭ Downside Deviation -- "تذبذب الخسائر فقط"
═══════════════════════════════════════════════════════════ */

/**
 * حساب Downside Deviation للمحفظة
 *
 * المنهجية الأكاديمية (Sortino & Price 1994):
 * DD = √[Σ min(0, r_i - MAR)² / n]
 *
 * الفرق عن Volatility التقليدي:
 * - Volatility: يحسب كل التذبذبات (موجبة وسالبة)
 * - Downside Deviation: يحسب فقط التذبذبات السلبية
 *
 * الاستخدامات الاحترافية:
 * ① مقام Sortino Ratio
 * ② Omega Ratio
 * ③ Upside/Downside Capture Ratio
 * ④ Stutzer Index
 *
 * تصنيف DD سنوي:
 * - < 8%: ممتاز (دفاعية)
 * - 8%-12%: جيد (متوازنة)
 * - 12%-18%: مرتفع (نشطة)
 * - 18%-25%: عالي (عدوانية)
 * - > 25%: شديد (مضاربية)
 *
 * @param {number[]} returns - سلسلة العوائد اليومية
 * @param {number} mar - العتبة (Minimum Acceptable Return) - افتراضي 0
 * @returns {Object} {daily, annual, classification, label, interpretation}
 */
export function calcDownsideDeviation(returns, mar) {
  // القيمة الافتراضية: العتبة = 0 (أي عائد سالب يُعتبر خسارة)
  if (mar === undefined) mar = 0;

  // فحص المدخلات
  if (!returns || returns.length < 2) {
    return {
      daily: 0,
      annual: 0,
      negativeDaysCount: 0,
      totalDays: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا توجد بيانات كافية للحساب',
    };
  }

  // ① حساب مجموع مربعات الانحرافات السلبية
  var sumSqDownside = 0;
  var negativeDaysCount = 0;

  for (var i = 0; i < returns.length; i++) {
    var deviation = returns[i] - mar;
    // نأخذ فقط الانحرافات السلبية (الخسائر)
    if (deviation < 0) {
      sumSqDownside += deviation * deviation;
      negativeDaysCount++;
    }
    // الانحرافات الموجبة = 0 في الحساب (الفرق عن Volatility)
  }

  // ② حساب Downside Deviation اليومي
  // نقسم على العدد الكلي (وليس عدد الأيام السلبية فقط)
  var ddDaily = Math.sqrt(sumSqDownside / returns.length);

  // ③ التحويل السنوي (قاعدة جذر الزمن)
  var ddAnnual = ddDaily * Math.sqrt(252);

  // ④ التصنيف
  var classification, label, interpretation;

  if (ddAnnual < 0.08) {
    classification = 'excellent';
    label = 'ممتاز';
    interpretation = 'تذبذب سلبي محدود -- محفظة دفاعية مستقرة';
  } else if (ddAnnual < 0.12) {
    classification = 'good';
    label = 'جيد';
    interpretation = 'خسائر معتدلة -- متوازن بين الأمان والعائد';
  } else if (ddAnnual < 0.18) {
    classification = 'moderate';
    label = 'مرتفع';
    interpretation = 'خسائر ملحوظة -- يتطلب تحمل نفسي جيد';
  } else if (ddAnnual < 0.25) {
    classification = 'high';
    label = 'عالي';
    interpretation = 'خسائر حادة -- محفظة عدوانية تحتاج خبرة';
  } else {
    classification = 'extreme';
    label = 'شديد';
    interpretation = 'خسائر كبيرة جداً -- مستوى مضاربي';
  }

  return {
    daily: +ddDaily.toFixed(5),
    annual: +ddAnnual.toFixed(4),
    negativeDaysCount: negativeDaysCount,
    totalDays: returns.length,
    negativeDaysPct: +(negativeDaysCount / returns.length * 100).toFixed(1),
    classification: classification,
    label: label,
    interpretation: interpretation,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑮ HHI -- Herfindahl-Hirschman Index
   مقياس تركيز المحفظة (وزارة العدل الأمريكية 1982)
═══════════════════════════════════════════════════════════ */

/**
 * حساب HHI للمحفظة
 *
 * المعادلة الأكاديمية:
 * HHI = Σ (w_i)² × 10,000
 *
 * المعيار التاريخي:
 * - وزارة العدل الأمريكية منذ 1982
 * - معيار SEC لتقييم صناديق الاستثمار
 * - معيار Bloomberg Terminal
 *
 * تصنيف HHI:
 * - < 1,500: متنوعة جيداً
 * - 1,500-2,500: تنويع متوسط
 * - 2,500-5,000: مركّزة
 * - > 5,000: مركّزة بشدة
 * - = 10,000: سهم واحد (احتكار)
 *
 * Effective Number of Stocks:
 * N_eff = 10,000 / HHI
 * "كم سهم متساوي الوزن يعادل محفظتي؟"
 *
 * @param {Object} weights - أوزان الأسهم {sym: weight}
 * @returns {Object} {value, effectiveStocks, classification, ...}
 */
export function calcHHI(weights) {
  // فحص المدخلات
  if (!weights || typeof weights !== 'object') {
    return {
      value: 0,
      effectiveStocks: 0,
      largestPosition: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا يمكن حساب HHI بدون أوزان',
    };
  }

  var symbols = Object.keys(weights);
  if (symbols.length === 0) {
    return {
      value: 0,
      effectiveStocks: 0,
      largestPosition: 0,
      classification: 'unknown',
      label: 'محفظة فارغة',
      interpretation: 'لا توجد أسهم في المحفظة',
    };
  }

  // ① حساب HHI
  // HHI = Σ (w_i)²
  var sumSquaredWeights = 0;
  var largestWeight = 0;

  for (var i = 0; i < symbols.length; i++) {
    var w = weights[symbols[i]] || 0;
    sumSquaredWeights += w * w;
    if (w > largestWeight) largestWeight = w;
  }

  // ② تحويل إلى مقياس 10,000
  var hhi = sumSquaredWeights * 10000;

  // ③ حساب Effective Number of Stocks
  var effectiveStocks = hhi > 0 ? 10000 / hhi : 0;

  // ④ التصنيف (معايير وزارة العدل الأمريكية)
  var classification, label, interpretation;

  if (hhi < 1500) {
    classification = 'diversified';
    label = 'متنوعة جيداً';
    interpretation = 'توزيع صحي -- لا تركيز مفرط على أي سهم';
  } else if (hhi < 2500) {
    classification = 'moderate';
    label = 'تنويع متوسط';
    interpretation = 'تركيز مقبول -- لكن يمكن تحسين التوزيع';
  } else if (hhi < 5000) {
    classification = 'concentrated';
    label = 'مركّزة';
    interpretation = 'تركيز مرتفع -- خطر الاعتماد على عدد قليل من الأسهم';
  } else if (hhi < 8000) {
    classification = 'highlyConcentrated';
    label = 'مركّزة بشدة';
    interpretation = 'تركيز حاد -- المحفظة تعتمد على سهم أو سهمين';
  } else {
    classification = 'monopoly';
    label = 'احتكار كامل';
    interpretation = 'المحفظة سهم واحد فعلياً -- لا تنويع';
  }

  // ⑤ تحذير للسهم الأكبر
  var largestPositionPct = largestWeight * 100;
  var concentrationWarning = null;
  if (largestPositionPct > 30) {
    concentrationWarning = 'السهم الأكبر ' + largestPositionPct.toFixed(1) + '% -- فوق الحد الآمن (30%)';
  }

  return {
    value: Math.round(hhi),
    effectiveStocks: +effectiveStocks.toFixed(1),
    largestPosition: +largestPositionPct.toFixed(1),
    stockCount: symbols.length,
    classification: classification,
    label: label,
    interpretation: interpretation,
    concentrationWarning: concentrationWarning,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑯ Correlation Matrix -- مصفوفة الارتباط
   أساس Markowitz Portfolio Theory (نوبل 1990)
═══════════════════════════════════════════════════════════ */

/**
 * بناء مصفوفة الارتباط بين أسهم المحفظة
 *
 * المنهجية الأكاديمية (Pearson Correlation):
 * ρ(X,Y) = Cov(X,Y) / (σ_X × σ_Y)
 *
 * القيم بين -1 و +1:
 * - +1.0: ارتباط تام موجب
 * - +0.7: قوي موجب
 * - 0.0: لا ارتباط
 * - -0.7: قوي سلبي
 * - -1.0: ارتباط تام سلبي (تحوط كامل)
 *
 * الخصائص:
 * - القطر = 1.0 دائماً (السهم مع نفسه)
 * - متناظرة: ρ(A,B) = ρ(B,A)
 *
 * @param {Array} positionsWithBars - [{sym, bars}]
 * @returns {Object} {matrix, symbols, pairCount, highCorrelations}
 */
export function calcCorrelationMatrix(positionsWithBars) {
  if (!positionsWithBars || positionsWithBars.length < 2) {
    return {
      matrix: {},
      symbols: [],
      pairCount: 0,
      highCorrelations: [],
      message: 'تحتاج سهمين على الأقل لحساب الارتباط',
    };
  }

  // ① حساب عوائد كل سهم
  var stockReturns = {};
  var symbols = [];

  for (var i = 0; i < positionsWithBars.length; i++) {
    var p = positionsWithBars[i];
    if (!p.bars || p.bars.length < 10) continue;
    var rets = simpleReturns(p.bars);
    if (rets.length < 5) continue;
    stockReturns[p.sym] = rets;
    symbols.push(p.sym);
  }

  if (symbols.length < 2) {
    return {
      matrix: {},
      symbols: symbols,
      pairCount: 0,
      highCorrelations: [],
      message: 'بيانات غير كافية',
    };
  }

  // ② بناء المصفوفة
  var matrix = {};
  var highCorrelations = []; // أزواج الارتباط العالي (> 0.7)

  for (var j = 0; j < symbols.length; j++) {
    var symA = symbols[j];
    matrix[symA] = {};

    for (var k = 0; k < symbols.length; k++) {
      var symB = symbols[k];

      if (j === k) {
        // القطر = 1.0 دائماً
        matrix[symA][symB] = 1.0;
      } else if (k < j && matrix[symB] && matrix[symB][symA] !== undefined) {
        // استفد من التناظر (تحسين الأداء)
        matrix[symA][symB] = matrix[symB][symA];
      } else {
        // حساب الارتباط
        var retsA = stockReturns[symA];
        var retsB = stockReturns[symB];

        // مزامنة الأطوال
        var minLen = Math.min(retsA.length, retsB.length);
        var syncA = retsA.slice(-minLen);
        var syncB = retsB.slice(-minLen);

        var corr = correlation(syncA, syncB);
        matrix[symA][symB] = +corr.toFixed(3);

        // رصد الارتباطات العالية
        if (j < k && Math.abs(corr) > 0.7) {
          highCorrelations.push({
            symA: symA,
            symB: symB,
            correlation: +corr.toFixed(3),
            strength: Math.abs(corr) > 0.85 ? 'تام تقريباً' : 'قوي',
            risk: 'هذان السهمان يتحركان معاً - التنويع محدود',
          });
        }
      }
    }
  }

  // ③ إحصاءات
  var pairCount = (symbols.length * (symbols.length - 1)) / 2;

  return {
    matrix: matrix,
    symbols: symbols,
    pairCount: pairCount,
    highCorrelations: highCorrelations,
    highCorrelationCount: highCorrelations.length,
  };
}

/**
 * استخراج جميع قيم الارتباط (بدون القطر)
 * مفيد لحساب متوسط الارتباط
 *
 * @param {Object} correlationMatrixResult
 * @returns {number[]} مصفوفة قيم الارتباط (بدون تكرار)
 */
export function extractCorrelationValues(correlationMatrixResult) {
  if (!correlationMatrixResult || !correlationMatrixResult.matrix) return [];

  var matrix = correlationMatrixResult.matrix;
  var symbols = correlationMatrixResult.symbols;
  var values = [];

  for (var i = 0; i < symbols.length; i++) {
    for (var j = i + 1; j < symbols.length; j++) {
      var symA = symbols[i];
      var symB = symbols[j];
      if (matrix[symA] && matrix[symA][symB] !== undefined) {
        values.push(matrix[symA][symB]);
      }
    }
  }

  return values;
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
