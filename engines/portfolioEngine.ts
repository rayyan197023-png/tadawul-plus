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

import type { Bar } from '../utils/portfolioMath';

/* ═══════════════════════════════════════════
   📊 TYPES & INTERFACES
═══════════════════════════════════════════ */

export type { Bar };

export interface Position {
  sym: string;
  qty: number;
  value?: number;
  avgCost?: number;
  bars?: Bar[];
  stk?: any;
  sec?: string;
  rsi?: number;
  [key: string]: any;
}

export interface Weights {
  [sym: string]: number;
}

export interface PortfolioAnalysis {
  totalValue: number;
  stockCount: number;
  weights: Weights;
  performance: any;
  risk: any;
  diversification: any;
  positionSizing: any;
  stressTests: any[];
  layersIntelligence: any;
  finalRecommendation: any;
  [key: string]: any;
}

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
export function analyzePortfolio(positions: Position[], tasiBars: Bar[]): PortfolioAnalysis {
  // فحص المدخلات
  if (!positions || positions.length === 0) {
    return emptyPortfolioAnalysis();
  }

  // الأساسيات
  var totalValue = calcTotalValue(positions);
  var weights = calcWeights(positions, totalValue);

  // ✨ نحسب عوائد المحفظة مرة واحدة ونمرّرها لكل الأقسام (بدل 5 مرات)
  var sharedReturns = calcPortfolioReturns(positions, weights);

  // سيُضاف لاحقاً في الخطوات القادمة
  return {
    // البيانات الأساسية
    totalValue: totalValue,
    stockCount: positions.length,
    weights: weights,

              // مقاييس الأداء (الخطوات 5-10 ✅) -- المرحلة 2 مكتملة!
  performance: (function() {
    var portfolioReturns = sharedReturns;
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
      var portfolioReturns = sharedReturns;
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

                   // التنويع (الخطوات 16-19 ✅) -- المرحلة 4 مكتملة!
    diversification: (function() {
      // ⭐ HHI -- الخطوة 16
      var hhiMetrics = calcHHI(weights);
      // ⭐ Correlation Matrix -- الخطوة 17
      var corrResult = calcCorrelationMatrix(positions);
      // ⭐ Average Correlation -- الخطوة 18
      var avgCorrMetrics = calcAvgCorrelation(corrResult);
      // ⭐ Diversification Score -- الخطوة 19
      var divScore = calcDiversificationScore(
        hhiMetrics.value,
        avgCorrMetrics.average,
        hhiMetrics.stockCount
      );
      return {
        // HHI
        hhi: hhiMetrics.value,
        effectiveStocks: hhiMetrics.effectiveStocks,
        largestPosition: hhiMetrics.largestPosition,
        stockCount: hhiMetrics.stockCount,
        hhiClass: hhiMetrics.classification,
        hhiLabel: hhiMetrics.label,
        hhiInterpretation: hhiMetrics.interpretation,
        concentrationWarning: hhiMetrics.concentrationWarning,
        // Correlation Matrix
        correlationMatrix: corrResult.matrix,
        correlationSymbols: corrResult.symbols,
        pairCount: corrResult.pairCount,
        highCorrelations: corrResult.highCorrelations,
        highCorrelationCount: corrResult.highCorrelationCount,
        // Average Correlation
        avgCorrelation: avgCorrMetrics.average,
        maxCorrelation: avgCorrMetrics.max,
        minCorrelation: avgCorrMetrics.min,
        correlationClass: avgCorrMetrics.classification,
        correlationLabel: avgCorrMetrics.label,
        correlationInterpretation: avgCorrMetrics.interpretation,
        correlationWarning: avgCorrMetrics.warning,
        // ⭐ Diversification Score -- الخطوة 19
        score: divScore.score,
        scoreComponents: divScore.components,
        scoreClass: divScore.classification,
        scoreLabel: divScore.label,
        scoreInterpretation: divScore.interpretation,
        recommendations: divScore.recommendations,
      };
    })(),
        

                // Position Sizing -- Kelly + 2% Rule + ATR (الخطوات 20-22 ✅) -- المرحلة 5 مكتملة!
        positionSizing: (function() {
      var portfolioReturns = sharedReturns;
      // ⭐ Kelly Criterion -- الخطوة 20
      var kellyInputs = estimateKellyInputs(portfolioReturns);
      var kellyResult = calcKellyCriterion(
        kellyInputs.winProbability,
        kellyInputs.winLossRatio,
        {
          maxPositionSize: 0.25,
          kellyFraction: 0.25,
          portfolioValue: totalValue,
        }
      );
      // ⭐ 2% Rule -- الخطوة 21
      var avgPrice = 0;
      var validPositions = 0;
      for (var i = 0; i < positions.length; i++) {
        if (positions[i].stk && positions[i].stk.p > 0) {
          avgPrice += positions[i].stk.p;
          validPositions++;
        }
      }
      avgPrice = validPositions > 0 ? avgPrice / validPositions : 0;

      var twoPercentResult = calcTwoPercentRule(
        totalValue,
        avgPrice,
        avgPrice * 0.93,
        0.02
      );
      // ⭐ ATR Stop Loss -- الخطوة 22
      // نحسب ATR لكل سهم ونستخرج متوسط
      var atrStops = [];
      for (var j = 0; j < positions.length; j++) {
        var pos = positions[j];
        if (pos.bars && pos.bars.length >= 15) {
          var atrResult = calcATRStopLoss(pos.bars, 2.0, {
            maxStopPct: 0.10,
            minStopPct: 0.02,
          });
          atrStops.push({
            sym: pos.sym,
            stopLossPrice: atrResult.stopLossPrice,
            stopLossPercent: atrResult.stopLossPercent,
            atrPercent: atrResult.atrPercent,
            label: atrResult.label,
          });
        }
      }
      // متوسط ATR للمحفظة
      var avgATRPercent = 0;
      var avgStopPercent = 0;
      if (atrStops.length > 0) {
        for (var k = 0; k < atrStops.length; k++) {
          avgATRPercent += atrStops[k].atrPercent;
          avgStopPercent += atrStops[k].stopLossPercent;
        }
        avgATRPercent = avgATRPercent / atrStops.length;
        avgStopPercent = avgStopPercent / atrStops.length;
      }
      return {
        // Kelly
        fullKelly: kellyResult.fullKelly,
        safeKelly: kellyResult.safeKelly,
        edge: kellyResult.edge,
        recommendation: kellyResult.recommendation,
        amountSAR: kellyResult.amountSAR,
        kellyClass: kellyResult.classification,
        kellyLabel: kellyResult.label,
        kellyInterpretation: kellyResult.interpretation,
        // Kelly Inputs
        winProbability: kellyInputs.winProbability,
        winLossRatio: kellyInputs.winLossRatio,
        avgWin: kellyInputs.avgWin,
        avgLoss: kellyInputs.avgLoss,
        winCount: kellyInputs.winCount,
        lossCount: kellyInputs.lossCount,
        // 2% Rule
        twoPercent: {
          maxShares: twoPercentResult.maxShares,
          positionValueSAR: twoPercentResult.positionValueSAR,
          riskSAR: twoPercentResult.riskSAR,
          positionPercent: twoPercentResult.positionPercent,
          stopLossPercent: twoPercentResult.stopLossPercent,
          stopLossPrice: twoPercentResult.stopLossPrice,
          classification: twoPercentResult.classification,
          label: twoPercentResult.label,
          interpretation: twoPercentResult.interpretation,
          warning: twoPercentResult.warning,
        },
        // ⭐ ATR Stop Loss -- الخطوة 22
        atr: {
          perStock: atrStops,
          avgATRPercent: +avgATRPercent.toFixed(2),
          avgStopPercent: +avgStopPercent.toFixed(2),
          stocksAnalyzed: atrStops.length,
        },
      };
    })(),
        // Stress Tests -- الخطوة 24 ✅
        stressTests: (function() {
      var portfolioReturns = sharedReturns;
      var marketReturns = (tasiBars && tasiBars.length > 1)
        ? simpleReturns(tasiBars)
        : buildTasiSyntheticReturns(positions);
      var betaResult = calcPortfolioBeta(portfolioReturns, marketReturns);
      return runStressTests(totalValue, betaResult.value != null ? betaResult.value : 1.0);
    })(),

       // التقييم النهائي (سيُضاف عبر addIntelligenceLayer)
    layersIntelligence: null,
    finalRecommendation: null,
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
export function calcTotalValue(positions: Position[]): number {
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
export function calcWeights(positions: Position[], totalValue: number): Weights {
  var weights: any = {};
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
export function calcPortfolioReturns(positions: Position[], weights: Weights): number[] {
  if (!positions || positions.length === 0) return [];

  // حساب عوائد كل سهم
  var stockReturns: any = {};
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
export function calcReturnsMetrics(portfolioReturns: number[]): {
  daily: number;
  cumulative: number;
  annual: number;
  annualFromDaily?: number;
  annualNote?: string | null;
  periodDays: number;
} {

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
  // ✨ حارس المدد القصيرة: التحويل السنوي عند n<126 يوماً (نصف سنة) يضخّم العائد
  // بشكل مضلِّل (الأس 252/n يصبح كبيراً). دون نصف سنة: نعرض التراكمي دون تسنية.
  var annualFromCumulative;

  if (n >= 126) {
    annualFromCumulative = Math.pow(1 + cumulative, 252 / n) - 1;
  } else {
    annualFromCumulative = cumulative; // مدة قصيرة -- العائد التراكمي دون تسنية
  }

  // Method 2: من العائد اليومي (بديل للفترات الطويلة)
  var annualFromDaily = n >= 126 ? Math.pow(1 + dailyReturn, 252) - 1 : cumulative;

  // استخدام الطريقة الأولى (أكثر دقة) لكن نعرضهما معاً
    return {
    daily: +dailyReturn.toFixed(6),
    cumulative: +cumulative.toFixed(4),
    annual: +annualFromCumulative.toFixed(4),
    annualFromDaily: +annualFromDaily.toFixed(4),
    annualNote: n < 126 ? 'المدة أقل من 6 أشهر -- العائد تراكمي لا سنوي (التسنية تضخّم)' : null,
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
export function calcVolatility(portfolioReturns: number[]): {
  daily: number;
  annual: number;
  classification: string;
  label: string;
} {
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
export function calcSharpeRatio(annualReturn: number, annualVolatility: number, riskFreeRate?: number): {
  value: number;
  excessReturn?: number;
  classification: string;
  label: string;
  interpretation: string;
} {
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
export function calcSortinoRatio(portfolioReturns: number[], annualReturn: number, riskFreeRate?: number): {
    value: number | null;
  downsideDeviationAnnual: number;
  classification: string;
  label: string;
  interpretation: string;
} {
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
  // ✨ null لا Infinity -- الواجهة تعرض "--" أو الملاحظة، لا قيمة تكسر toFixed
  if (downsideDeviationAnnual <= 0) {
    return {
      value: null,
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
export function buildTasiSyntheticReturns(stocksWithBars: Position[]): number[] {
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
export function calcPortfolioBeta(portfolioReturns: number[], marketReturns: number[]): {
    value: number | null;
  classification: string;
  label: string;
  interpretation: string;
} {
  // فحص المدخلات
  if (!portfolioReturns || !marketReturns ||
      portfolioReturns.length < 2 || marketReturns.length < 2) {
    return {
      value: null,
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

  // ✨ حارس NaN: beta تُرجع NaN عند تباين سوق صفري (بيانات ثابتة/فاسدة).
  // لا نعرض رقماً مضلِّلاً -- نُرجع حالة "غير محسوب" صريحة.
  if (betaValue == null || isNaN(betaValue)) {
    return {
      value: null,
      classification: 'unknown',
      label: 'غير محسوب',
      interpretation: 'تعذّر حساب Beta -- بيانات السوق ثابتة أو غير كافية',
    };
  }

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
export function calcJensensAlpha(
  portfolioAnnualReturn: number,
  marketAnnualReturn: number,
  beta: number,
  riskFreeRate?: number
): {
  value: number;
  expected: number;
  marketRiskPremium?: number;
  classification: string;
  label: string;
  interpretation: string;
} {
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
export function calcMaxDrawdown(returns: number[]): {
  maxDrawdown: number;
  duration: number;
  recoveryDays: number | null;
  peakIndex?: number;
  troughIndex?: number;
  peakValue?: number;
  troughValue?: number;
  classification: string;
  label: string;
  interpretation: string;
} {
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
export function calcVaR(returns: number[], confidence?: number, portfolioValue?: number): {
  daily: number;
  weekly: number;
  monthly: number;
  dailySAR: number;
  weeklySAR: number;
  monthlySAR: number;
  confidence: number;
  classification: string;
  label: string;
  interpretation: string;
} {
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
export function calcCVaR(returns: number[], confidence?: number, portfolioValue?: number): {
  daily: number;
  weekly: number;
  monthly: number;
  dailySAR: number;
  weeklySAR: number;
  monthlySAR: number;
  worstDaysCount?: number;
  confidence: number;
  classification: string;
  label: string;
  interpretation: string;
} {
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
export function calcCalmarRatio(annualReturn: number, maxDrawdown: number): {
  value: number | null;
  classification: string;
  label: string;
  interpretation: string;
} {
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
  // ✨ نُرجع null لا Infinity/999 -- الواجهة تعرض "--" أو الملاحظة، لا رقماً مضلِّلاً
  if (maxDrawdown >= 0 || Math.abs(maxDrawdown) < 0.001) {
    return {
      value: null,
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
    value: +calmar.toFixed(3),
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
export function calcDownsideDeviation(returns: number[], mar?: number): {
  daily: number;
  annual: number;
  negativeDaysCount: number;
  totalDays: number;
  negativeDaysPct?: number;
  classification: string;
  label: string;
  interpretation: string;
} {
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
export function calcHHI(weights: Weights): {
  value: number;
  effectiveStocks: number;
  largestPosition: number;
  stockCount?: number;
  classification: string;
  label: string;
  interpretation: string;
  concentrationWarning: string | null;
} {
  // فحص المدخلات
  if (!weights || typeof weights !== 'object') {
    return {
      value: 0,
      effectiveStocks: 0,
      largestPosition: 0,
      stockCount: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا يمكن حساب HHI بدون أوزان',
      concentrationWarning: null,
    };
  }


  var symbols = Object.keys(weights);
  if (symbols.length === 0) {
    return {
      value: 0,
      effectiveStocks: 0,
      largestPosition: 0,
      stockCount: 0,
      classification: 'unknown',
      label: 'محفظة فارغة',
      interpretation: 'لا توجد أسهم في المحفظة',
      concentrationWarning: null,
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
export function calcCorrelationMatrix(positionsWithBars: Position[]): {
  matrix: { [sym: string]: { [sym: string]: number } };
  symbols: string[];
  pairCount: number;
  highCorrelations: any[];
  highCorrelationCount?: number;
  message?: string;
} {
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
  var stockReturns: any = {};
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
  var matrix: any = {};
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
export function extractCorrelationValues(correlationMatrixResult: any): number[] {
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
function emptyPortfolioAnalysis(): PortfolioAnalysis {
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
      // ✨ نطابق أسماء الحقول الفعلية من دالة risk (var95Daily لا var95) -- يمنع undefined.toFixed
      var95Daily: 0,
      var95Weekly: 0,
      var95Monthly: 0,
      cvar95Daily: 0,
      downsideDeviationDaily: 0,
      downsideDeviationAnnual: 0,
      calmar: null,
      maxDrawdownDuration: 0,
    },
    diversification: {
      hhi: 0,
      correlationMatrix: {},
      avgCorrelation: 0,
      score: 0,
      effectiveStocks: 0,
    },
    positionSizing: null,
    stressTests: [],
    layersIntelligence: null,
    finalRecommendation: null,
    healthScore: 0,
    healthGrade: 'N/A',
    recommendations: [],
  };
}
/* ══════════════════════════════════════════════════════════
   ⑰ Average Correlation -- قياس التنويع برقم واحد
   معيار Bridgewater (Ray Dalio)
═══════════════════════════════════════════════════════════ */

/**
 * حساب متوسط الارتباط + Max/Min للمحفظة
 *
 * المعادلة الأكاديمية:
 * Avg Corr = Σ ρ(i,j) / N
 * حيث N = n(n-1)/2 (عدد الأزواج الفريدة)
 *
 * الفلسفة (Ray Dalio - Bridgewater):
 * "15-20 استثماراً منخفضة الارتباط = الكأس المقدسة للاستثمار"
 *
 * تصنيف متوسط الارتباط:
 * - < 0.20: تنويع حقيقي (ممتاز)
 * - 0.20-0.40: تنويع جيد
 * - 0.40-0.60: يحتاج تحسين
 * - 0.60-0.80: تنويع وهمي
 * - > 0.80: كأن سهم واحد
 *
 * @param {Object} correlationMatrixResult - من calcCorrelationMatrix
 * @returns {Object} {average, max, min, classification, label, interpretation}
 */
export function calcAvgCorrelation(correlationMatrixResult: any): {
  average: number;
  max: number;
  min: number;
  count: number;
  classification: string;
  label: string;
  interpretation: string;
  warning?: string | null;
} {
  // فحص المدخلات
  if (!correlationMatrixResult || !correlationMatrixResult.matrix) {
    return {
      average: 0,
      max: 0,
      min: 0,
      count: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'تحتاج سهمين على الأقل',
    };
  }

  // ① استخراج قيم الارتباط (بدون القطر، بدون تكرار)
  var values = extractCorrelationValues(correlationMatrixResult);

  if (values.length === 0) {
    return {
      average: 0,
      max: 0,
      min: 0,
      count: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا توجد أزواج لحسابها',
    };
  }

  // ② حساب المتوسط والحد الأقصى والأدنى
  var sum = 0;
  var maxCorr = values[0];
  var minCorr = values[0];

  for (var i = 0; i < values.length; i++) {
    sum += values[i];
    if (values[i] > maxCorr) maxCorr = values[i];
    if (values[i] < minCorr) minCorr = values[i];
  }

  var avgCorr = sum / values.length;

  // ③ التصنيف
  var classification, label, interpretation;

  if (avgCorr < 0.20) {
    classification = 'excellent';
    label = 'تنويع حقيقي';
    interpretation = 'ارتباطات منخفضة -- تنويع احترافي بمستوى Bridgewater';
  } else if (avgCorr < 0.40) {
    classification = 'good';
    label = 'تنويع جيد';
    interpretation = 'تنويع مقبول -- ضمن المستوى المطلوب';
  } else if (avgCorr < 0.60) {
    classification = 'moderate';
    label = 'متوسط';
    interpretation = 'تنويع محدود -- يمكن تحسينه بأسهم من قطاعات مختلفة';
  } else if (avgCorr < 0.80) {
    classification = 'poor';
    label = 'تنويع وهمي';
    interpretation = 'أسهمك تتحرك معاً بشكل متشابه -- التنويع غير فعّال';
  } else {
    classification = 'very_poor';
    label = 'كأن سهم واحد';
    interpretation = 'ارتباط شديد بين الأسهم -- لا يوجد تنويع فعلي';
  }

  // ④ تحذيرات ذكية
  var warning = null;
  if (maxCorr > 0.85 && minCorr < -0.3) {
    warning = 'تباين شديد: بعض الأسهم مرتبطة جداً والبعض الآخر متعاكس';
  } else if (maxCorr > 0.90) {
    warning = 'زوجين متطابقين تقريباً (ارتباط > 0.90) -- احتمال تكرار';
  }

  return {
    average: +avgCorr.toFixed(3),
    max: +maxCorr.toFixed(3),
    min: +minCorr.toFixed(3),
    count: values.length,
    classification: classification,
    label: label,
    interpretation: interpretation,
    warning: warning,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑱ Diversification Score -- "درجة التنويع 0-100"
   مقياس موحد لتلخيص التنويع
═══════════════════════════════════════════════════════════ */

/**
 * حساب درجة التنويع الشاملة (0-100)
 *
 * المنهجية:
 * Score = (HHI_score × 40%) + (Correlation_score × 40%) + (StockCount_score × 20%)
 *
 * كل مكوّن يُحوّل إلى نقاط (0-100) ثم يُدمج بأوزان مُعايرة.
 *
 * المصادر:
 * - Elton & Gruber (1977) - Optimal Stock Selection
 * - Bridgewater Associates - Risk Parity Framework
 * - Bloomberg Portfolio Analytics Standards
 *
 * تصنيف النتيجة:
 * - 90-100: ممتاز (Bridgewater level)
 * - 75-89: جيد جداً (احترافي)
 * - 60-74: جيد (مقبول)
 * - 45-59: متوسط (يحتاج تحسين)
 * - 30-44: ضعيف (تنويع وهمي)
 * - < 30: سيء (خطر تركيز)
 *
 * @param {number} hhi - Herfindahl-Hirschman Index
 * @param {number} avgCorrelation - متوسط الارتباط
 * @param {number} stockCount - عدد الأسهم
 * @returns {Object} {score, components, classification, label, interpretation}
 */
export function calcDiversificationScore(hhi: number, avgCorrelation: number, stockCount: number): {
  score: number;
  components: {
    hhi: number;
    correlation: number;
    stockCount: number;
  };
  classification: string;
  label: string;
  interpretation: string;
  recommendations: any[];
} {
  // فحص المدخلات
  if (hhi === undefined || avgCorrelation === undefined || stockCount === undefined) {
    return {
      score: 0,
      components: { hhi: 0, correlation: 0, stockCount: 0 },
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'لا يمكن حساب الدرجة',
      recommendations: [],
    };
  }

  // ① تحويل HHI إلى نقاط (0-100)
  var hhiScore;
  if (hhi < 1500) {
    hhiScore = 100;
  } else if (hhi < 2500) {
    // خطي بين 70-99
    hhiScore = 100 - ((hhi - 1500) / 1000) * 30;
  } else if (hhi < 5000) {
    // خطي بين 40-69
    hhiScore = 70 - ((hhi - 2500) / 2500) * 30;
  } else if (hhi < 8000) {
    // خطي بين 20-39
    hhiScore = 40 - ((hhi - 5000) / 3000) * 20;
  } else {
    // 0-19
    hhiScore = Math.max(0, 20 - ((hhi - 8000) / 2000) * 20);
  }

  // ② تحويل Correlation إلى نقاط (0-100)
  var corrScore;
  if (avgCorrelation < 0.20) {
    corrScore = 100;
  } else if (avgCorrelation < 0.40) {
    corrScore = 100 - ((avgCorrelation - 0.20) / 0.20) * 30;
  } else if (avgCorrelation < 0.60) {
    corrScore = 70 - ((avgCorrelation - 0.40) / 0.20) * 30;
  } else if (avgCorrelation < 0.80) {
    corrScore = 40 - ((avgCorrelation - 0.60) / 0.20) * 20;
  } else {
    corrScore = Math.max(0, 20 - ((avgCorrelation - 0.80) / 0.20) * 20);
  }

  // ③ تحويل Stock Count إلى نقاط (0-100)
  var countScore;
  if (stockCount >= 10 && stockCount <= 25) {
    countScore = 100; // النطاق المثالي
  } else if ((stockCount >= 8 && stockCount < 10) || (stockCount > 25 && stockCount <= 30)) {
    countScore = 80;
  } else if ((stockCount >= 5 && stockCount < 8) || (stockCount > 30 && stockCount <= 40)) {
    countScore = 60;
  } else if (stockCount >= 3 && stockCount < 5) {
    countScore = 40;
  } else if (stockCount >= 2) {
    countScore = 20;
  } else {
    countScore = 0; // سهم واحد أو لا شيء
  }

  // ④ حساب الدرجة النهائية (متوسط مرجّح)
  var finalScore = (hhiScore * 0.40) + (corrScore * 0.40) + (countScore * 0.20);
  finalScore = Math.round(finalScore);
  finalScore = Math.max(0, Math.min(100, finalScore));

  // ⑤ التصنيف
  var classification, label, interpretation;

  if (finalScore >= 90) {
    classification = 'excellent';
    label = 'ممتاز';
    interpretation = 'تنويع بمستوى Bridgewater -- توزيع احترافي';
  } else if (finalScore >= 75) {
    classification = 'veryGood';
    label = 'جيد جداً';
    interpretation = 'تنويع احترافي -- محفظة مُدارة بعناية';
  } else if (finalScore >= 60) {
    classification = 'good';
    label = 'جيد';
    interpretation = 'تنويع مقبول -- يمكن تحسينه بخطوات بسيطة';
  } else if (finalScore >= 45) {
    classification = 'moderate';
    label = 'متوسط';
    interpretation = 'تنويع محدود -- يحتاج مراجعة جوهرية';
  } else if (finalScore >= 30) {
    classification = 'poor';
    label = 'ضعيف';
    interpretation = 'تنويع وهمي -- خطر تركيز قد يسبب خسائر كبيرة';
  } else {
    classification = 'veryPoor';
    label = 'سيء';
    interpretation = 'لا يوجد تنويع فعلي -- المحفظة شبه مركّزة في سهم واحد';
  }

  // ⑥ توصيات ذكية
  var recommendations = [];

  if (hhiScore < 60) {
    recommendations.push({
      priority: 'high',
      icon: '⚠️',
      text: 'قلل تركيز السهم الأكبر (حالياً HHI = ' + hhi + ')',
      action: 'وزّع المحفظة على أسهم أكثر',
    });
  }

  if (corrScore < 60) {
    recommendations.push({
      priority: 'high',
      icon: '🔗',
      text: 'الارتباط بين الأسهم مرتفع (' + avgCorrelation.toFixed(2) + ')',
      action: 'أضف أسهم من قطاعات مختلفة (بنوك، اتصالات، أغذية)',
    });
  }

  if (stockCount < 10) {
    recommendations.push({
      priority: 'medium',
      icon: '📊',
      text: 'عدد الأسهم قليل (' + stockCount + ')',
      action: 'الحد الأمثل 10-20 سهم (Elton & Gruber 1977)',
    });
  } else if (stockCount > 30) {
    recommendations.push({
      priority: 'low',
      icon: '📉',
      text: 'عدد الأسهم كبير (' + stockCount + ')',
      action: 'التنويع الزائد يقلل الأداء -- ركّز على الأفضل',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      icon: '🏆',
      text: 'تنويع احترافي -- حافظ على هذا المستوى',
      action: 'استمر في التوازن الحالي',
    });
  }

  return {
    score: finalScore,
    components: {
      hhi: Math.round(hhiScore),
      correlation: Math.round(corrScore),
      stockCount: Math.round(countScore),
    },
    classification: classification,
    label: label,
    interpretation: interpretation,
    recommendations: recommendations,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑲ Kelly Criterion -- "عبقرية الرياضيات في التداول"
   Kelly 1956, Thorp 1970s, Buffett-approved
═══════════════════════════════════════════════════════════ */

/**
 * حساب Kelly Criterion لسهم أو محفظة
 *
 * المعادلة الأكاديمية الأصلية (Kelly 1956):
 * f* = (bp - q) / b
 *
 * حيث:
 * - f*: نسبة رأس المال الأمثل
 * - b: نسبة الربح إلى الخسارة
 * - p: احتمال الربح
 * - q: احتمال الخسارة (1 - p)
 *
 * التطبيق العملي (Thorp 1970s):
 * Safe Kelly = Full Kelly × 0.25 (Quarter Kelly)
 *
 * قواعد الحماية:
 * - Edge سالب → Kelly = 0 (لا تستثمر)
 * - Kelly > 25% → قص عند 25% (حد أقصى مطلق)
 * - استخدم Quarter Kelly دائماً في الواقع
 *
 * @param {number} winProbability - احتمال الربح (0-1)
 * @param {number} winLossRatio - نسبة متوسط الربح إلى متوسط الخسارة
 * @param {Object} options - خيارات إضافية
 * @returns {Object} {fullKelly, safeKelly, edge, recommendation, ...}
 */
export function calcKellyCriterion(
  winProbability: number,
  winLossRatio: number,
  options?: {
    maxPositionSize?: number;
    kellyFraction?: number;
    portfolioValue?: number;
  }
): any {

  options = options || {};
  var maxPositionSize = options.maxPositionSize || 0.25; // حد أقصى 25%
  var kellyFraction = options.kellyFraction || 0.25;     // Quarter Kelly
  var portfolioValue = options.portfolioValue || 0;

  // فحص المدخلات
  if (winProbability === undefined || winLossRatio === undefined) {
    return {
      fullKelly: 0,
      safeKelly: 0,
      edge: 0,
      recommendation: 'بيانات غير كافية',
      amountSAR: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'تحتاج احتمال الربح ونسبة الربح/الخسارة',
    };
  }

  // ضمان أن p بين 0 و 1
  var p = Math.max(0, Math.min(1, winProbability));
  var q = 1 - p;
  var b = Math.max(0.01, winLossRatio); // تجنب القسمة على صفر

  // ① حساب Edge (الحافة)
  // Edge = (p × b) - q = العائد المتوقع
  var edge = (p * b) - q;

  // إذا Edge سالب → لا استثمار
  if (edge <= 0) {
    return {
      fullKelly: 0,
      safeKelly: 0,
      edge: +edge.toFixed(4),
      recommendation: 'تجنّب',
      amountSAR: 0,
      classification: 'negative_edge',
      label: 'لا توصية',
      interpretation: 'العائد المتوقع سلبي -- تجنّب هذا الاستثمار',
      winProbability: p,
      winLossRatio: b,
    };
  }

  // ② حساب Full Kelly
  // f* = (bp - q) / b
  var fullKelly = ((b * p) - q) / b;

  // ③ تطبيق الحد الأقصى
  if (fullKelly > maxPositionSize) {
    fullKelly = maxPositionSize;
  }

  // ④ حساب Safe Kelly (Quarter Kelly)
  var safeKelly = fullKelly * kellyFraction;

  // ⑤ تحويل إلى ريال سعودي
  var amountSAR = portfolioValue > 0 ? safeKelly * portfolioValue : 0;

  // ⑥ التصنيف
  var classification, label, interpretation, recommendation;

  if (safeKelly < 0.02) {
    classification = 'minimal';
    label = 'حجم ضئيل';
    interpretation = 'الحافة محدودة -- استثمار رمزي فقط';
    recommendation = 'استثمار صغير (< 2%)';
  } else if (safeKelly < 0.05) {
    classification = 'small';
    label = 'حجم صغير';
    interpretation = 'حافة معقولة -- استثمار حذر';
    recommendation = 'استثمار صغير (2-5%)';
  } else if (safeKelly < 0.10) {
    classification = 'moderate';
    label = 'حجم متوسط';
    interpretation = 'حافة جيدة -- حجم مقبول';
    recommendation = 'استثمار متوسط (5-10%)';
  } else if (safeKelly < 0.15) {
    classification = 'significant';
    label = 'حجم كبير';
    interpretation = 'حافة قوية -- استثمار استراتيجي';
    recommendation = 'استثمار كبير (10-15%)';
  } else {
    classification = 'large';
    label = 'حجم كبير جداً';
    interpretation = 'حافة استثنائية -- لكن احذر من المخاطرة';
    recommendation = 'استثمار كبير (15-25%)';
  }

  return {
    fullKelly: +fullKelly.toFixed(4),
    safeKelly: +safeKelly.toFixed(4),
    edge: +edge.toFixed(4),
    recommendation: recommendation,
    amountSAR: Math.round(amountSAR),
    classification: classification,
    label: label,
    interpretation: interpretation,
    winProbability: p,
    winLossRatio: b,
    kellyFraction: kellyFraction,
  };
}

/**
 * تقدير احتمال الربح ونسبة الربح/الخسارة من بيانات السهم
 *
 * المنهجية:
 * - نستخدم العوائد التاريخية
 * - نفصل الأيام الرابحة عن الخاسرة
 * - نحسب النسب من البيانات الفعلية
 *
 * @param {number[]} returns - سلسلة العوائد اليومية
 * @returns {Object} {winProbability, winLossRatio, avgWin, avgLoss}
 */
export function estimateKellyInputs(returns: number[]): {
  winProbability: number;
  winLossRatio: number;
  avgWin: number;
  avgLoss: number;
  sampleSize: number;
  winCount?: number;
  lossCount?: number;
} {

  if (!returns || returns.length < 10) {
    return {
      winProbability: 0,
      winLossRatio: 0,
      avgWin: 0,
      avgLoss: 0,
      sampleSize: 0,
    };
  }

  var wins = [];
  var losses = [];

  for (var i = 0; i < returns.length; i++) {
    if (returns[i] > 0) {
      wins.push(returns[i]);
    } else if (returns[i] < 0) {
      losses.push(Math.abs(returns[i]));
    }
  }

  var totalTrades = wins.length + losses.length;
  if (totalTrades === 0) {
    return {
      winProbability: 0.5,
      winLossRatio: 1,
      avgWin: 0,
      avgLoss: 0,
      sampleSize: returns.length,
    };
  }

  // احتمال الربح
  var winProbability = wins.length / totalTrades;

  // متوسط الربح والخسارة
  var avgWin = wins.length > 0
    ? wins.reduce(function(s, v) { return s + v; }, 0) / wins.length
    : 0;
  var avgLoss = losses.length > 0
    ? losses.reduce(function(s, v) { return s + v; }, 0) / losses.length
    : 0.01;

  // نسبة الربح/الخسارة
  var winLossRatio = avgLoss > 0 ? avgWin / avgLoss : 1;

  return {
    winProbability: +winProbability.toFixed(4),
    winLossRatio: +winLossRatio.toFixed(4),
    avgWin: +avgWin.toFixed(5),
    avgLoss: +avgLoss.toFixed(5),
    sampleSize: returns.length,
    winCount: wins.length,
    lossCount: losses.length,
  };
}
/* ══════════════════════════════════════════════════════════
   ⑳ 2% Rule -- "قاعدة الناجين"
   Van Tharp, Paul Tudor Jones, Turtle Traders
═══════════════════════════════════════════════════════════ */

/**
 * حساب حجم المركز بناءً على قاعدة المخاطرة الثابتة
 *
 * المعادلة:
 * Position Size = (Portfolio × Risk%) / Stop Loss Distance
 *
 * الفلسفة (Van Tharp):
 * - لا تخاطر بأكثر من 2% من رأس المال في صفقة
 * - حتى 10 خسائر متتالية = -18% فقط (قابل للتعافي)
 * - حتى 20 خسارة = -33% (مؤلم لكن لن يفلسك)
 *
 * التصنيفات المهنية:
 * - 1%: محافظ جداً (Linda Raschke)
 * - 2%: المعيار الذهبي (Van Tharp)
 * - 3%: عدواني (يتطلب نظام دقيق)
 * - > 3%: خطر الإفلاس
 *
 * @param {number} portfolioValue - قيمة المحفظة الإجمالية
 * @param {number} stockPrice - سعر السهم الحالي
 * @param {number} stopLossPrice - سعر وقف الخسارة
 * @param {number} riskPercent - نسبة المخاطرة (افتراضي 2%)
 * @returns {Object} {maxShares, positionValueSAR, riskSAR, ...}
 */
export function calcTwoPercentRule(
  portfolioValue: number,
  stockPrice: number,
  stopLossPrice?: number,
  riskPercent?: number
): any {

  // القيمة الافتراضية
  if (riskPercent === undefined) riskPercent = 0.02;

  // فحص المدخلات
  if (!portfolioValue || portfolioValue <= 0 || !stockPrice || stockPrice <= 0) {
    return {
      maxShares: 0,
      positionValueSAR: 0,
      riskSAR: 0,
      riskPercent: riskPercent,
      positionPercent: 0,
      stopLossDistance: 0,
      stopLossPercent: 0,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'تحتاج قيمة المحفظة وسعر السهم',
    };
  }

  // ① حساب المبلغ الأقصى للخسارة
  var maxRiskSAR = portfolioValue * riskPercent;

  // ② حساب مسافة وقف الخسارة
  var stopLossDistance;
  var stopLossPercent;

  if (stopLossPrice && stopLossPrice > 0 && stopLossPrice < stockPrice) {
    // وقف خسارة محدد
    stopLossDistance = stockPrice - stopLossPrice;
    stopLossPercent = (stopLossDistance / stockPrice) * 100;
  } else {
    // افتراضي: 7% وقف خسارة
    stopLossPercent = 7;
    stopLossDistance = stockPrice * 0.07;
    stopLossPrice = stockPrice - stopLossDistance;
  }

  // ③ حساب حجم المركز
  // Max Shares = Max Risk / Stop Distance
  var maxShares = Math.floor(maxRiskSAR / stopLossDistance);

  // ④ حساب القيمة الإجمالية
  var positionValueSAR = maxShares * stockPrice;
  var positionPercent = (positionValueSAR / portfolioValue) * 100;

  // ⑤ التحقق من الحدود
  var warning = null;
  if (positionPercent > 30) {
    warning = 'المركز يتجاوز 30% من المحفظة -- تركيز مخاطر';
  } else if (positionPercent > 20) {
    warning = 'المركز أكثر من 20% -- حجم كبير نسبياً';
  }

  // ⑥ التصنيف
  var classification, label, interpretation;

  if (stopLossPercent < 3) {
    classification = 'tight';
    label = 'وقف ضيق';
    interpretation = 'مسافة الوقف < 3% -- قد يتفعّل من تذبذبات عادية';
  } else if (stopLossPercent < 7) {
    classification = 'standard';
    label = 'وقف معياري';
    interpretation = 'مسافة مثالية بين 3-7% -- حماية جيدة مع مرونة';
  } else if (stopLossPercent < 10) {
    classification = 'wide';
    label = 'وقف واسع';
    interpretation = 'مسافة أوسع من المعتاد -- مناسب للأسهم المتقلبة';
  } else {
    classification = 'very_wide';
    label = 'وقف واسع جداً';
    interpretation = 'مسافة > 10% -- قد يسبب خسارة كبيرة قبل التفعيل';
  }

  return {
    maxShares: maxShares,
    positionValueSAR: Math.round(positionValueSAR),
    riskSAR: Math.round(maxRiskSAR),
    riskPercent: riskPercent,
    positionPercent: +positionPercent.toFixed(2),
    stopLossDistance: +stopLossDistance.toFixed(2),
    stopLossPercent: +stopLossPercent.toFixed(2),
    stopLossPrice: +stopLossPrice.toFixed(2),
    stockPrice: stockPrice,
    classification: classification,
    label: label,
    interpretation: interpretation,
    warning: warning,
  };
}

/* ══════════════════════════════════════════════════════════
   ㉑ ATR-based Stop Loss -- "وقف الخسارة الذكي"
   J. Welles Wilder 1978
═══════════════════════════════════════════════════════════ */

/**
 * حساب Average True Range (ATR)
 *
 * المنهجية الأكاديمية (Wilder 1978):
 * TR_t = max of:
 *   1. High - Low
 *   2. |High - Previous Close|
 *   3. |Low - Previous Close|
 *
 * ATR = Moving Average of TR (عادة 14 فترة)
 *
 * @param {Array} bars - [{hi, lo, c}, ...]
 * @param {number} period - عدد الأيام (افتراضي 14)
 * @returns {Object} {atr, atrPercent, currentPrice}
 */
export function calcATR(bars: Bar[], period?: number): {
  atr: number;
  atrPercent: number;
  currentPrice: number;
  sampleSize: number;
} {
  if (period === undefined) period = 14;

  if (!bars || bars.length < period + 1) {
    return {
      atr: 0,
      atrPercent: 0,
      currentPrice: 0,
      sampleSize: 0,
    };
  }

  // حساب True Range لكل يوم
  var trueRanges = [];

  for (var i = 1; i < bars.length; i++) {
    var bar = bars[i];
    var prevClose = bars[i - 1].c;

    var hl = (bar as any).hi - (bar as any).lo;
var hc = Math.abs((bar as any).hi - prevClose);
var lc = Math.abs((bar as any).lo - prevClose);

    var tr = Math.max(hl, hc, lc);
    trueRanges.push(tr);
  }

  // حساب ATR (متوسط آخر N يوم)
  var recentTR = trueRanges.slice(-period);
  var atr = 0;
  for (var j = 0; j < recentTR.length; j++) {
    atr += recentTR[j];
  }
  atr = atr / recentTR.length;

  // السعر الحالي
  var currentPrice = bars[bars.length - 1].c;

  return {
    atr: +atr.toFixed(3),
    atrPercent: currentPrice > 0 ? +((atr / currentPrice) * 100).toFixed(2) : 0,
    currentPrice: currentPrice,
    sampleSize: recentTR.length,
  };
}

/**
 * حساب Stop Loss الذكي بناءً على ATR
 *
 * المعادلة (Wilder 1978):
 * Stop Loss = Price - (ATR × Multiplier)
 *
 * المضاعفات:
 * - 1.5: ضيق (متداولون نشطون)
 * - 2.0: متوسط (المعيار)
 * - 2.5: واسع (مستثمرون)
 * - 3.0: واسع جداً (استثمار طويل المدى)
 *
 * @param {Array} bars - بيانات السهم
 * @param {number} multiplier - مضاعف ATR
 * @param {Object} options - {maxStopPct, minStopPct}
 * @returns {Object} {stopLossPrice, stopLossDistance, stopLossPercent, ...}
 */
export function calcATRStopLoss(
  bars: Bar[],
  multiplier?: number,
  options?: {
    maxStopPct?: number;
    minStopPct?: number;
  }
): any {
  options = options || {};
  if (multiplier === undefined) multiplier = 2.0;

  var maxStopPct = options.maxStopPct || 0.10; // أقصى 10%
  var minStopPct = options.minStopPct || 0.02; // أدنى 2%

  // حساب ATR
  var atrResult = calcATR(bars, 14);

  if (atrResult.atr === 0) {
    return {
      stopLossPrice: 0,
      stopLossDistance: 0,
      stopLossPercent: 0,
      atr: 0,
      multiplier: multiplier,
      classification: 'unknown',
      label: 'بيانات غير كافية',
      interpretation: 'تحتاج 15 يوم على الأقل من البيانات',
    };
  }

  var price = atrResult.currentPrice;
  var atr = atrResult.atr;

  // ① حساب Stop Loss الأولي
  var stopDistance = atr * multiplier;
  var stopPercent = stopDistance / price;

  // ② تطبيق الحدود (Guard Rails)
  var cappedReason = null;

  if (stopPercent > maxStopPct) {
    stopDistance = price * maxStopPct;
    stopPercent = maxStopPct;
    cappedReason = 'تم تقييد الوقف عند ' + (maxStopPct * 100) + '% (الحد الأقصى)';
  } else if (stopPercent < minStopPct) {
    stopDistance = price * minStopPct;
    stopPercent = minStopPct;
    cappedReason = 'تم توسيع الوقف إلى ' + (minStopPct * 100) + '% (الحد الأدنى)';
  }

  var stopLossPrice = price - stopDistance;

  // ③ التصنيف
  var classification, label, interpretation;

  if (atrResult.atrPercent < 1) {
    classification = 'defensive';
    label = 'سهم دفاعي';
    interpretation = 'تذبذب منخفض جداً -- وقف ضيق مناسب';
  } else if (atrResult.atrPercent < 2) {
    classification = 'stable';
    label = 'سهم مستقر';
    interpretation = 'تذبذب معتدل -- وقف متوسط';
  } else if (atrResult.atrPercent < 3.5) {
    classification = 'active';
    label = 'سهم نشط';
    interpretation = 'تذبذب ملحوظ -- يحتاج وقف أوسع';
  } else if (atrResult.atrPercent < 5) {
    classification = 'volatile';
    label = 'سهم متقلب';
    interpretation = 'تذبذب عالي -- يحتاج صبر ووقف واسع';
  } else {
    classification = 'extreme';
    label = 'سهم عالي التقلب';
    interpretation = 'تذبذب شديد -- حذر شديد موصى به';
  }

  // ④ مقارنة مع Fixed 7%
  var fixed7Percent = price * 0.07;
  var comparisonAdvantage;

  if (stopDistance < fixed7Percent) {
    comparisonAdvantage = 'ATR أضيق بـ ' + ((1 - stopDistance / fixed7Percent) * 100).toFixed(0) +
                         '% من 7% الثابت -- حماية أفضل لرأس المال';
  } else if (stopDistance > fixed7Percent) {
    comparisonAdvantage = 'ATR أوسع بـ ' + ((stopDistance / fixed7Percent - 1) * 100).toFixed(0) +
                         '% من 7% الثابت -- يحمي من التفعيل المبكر';
  } else {
    comparisonAdvantage = 'ATR = 7% الثابت تقريباً';
  }

  return {
    stopLossPrice: +stopLossPrice.toFixed(2),
    stopLossDistance: +stopDistance.toFixed(2),
    stopLossPercent: +(stopPercent * 100).toFixed(2),
    currentPrice: price,
    atr: atr,
    atrPercent: atrResult.atrPercent,
    multiplier: multiplier,
    cappedReason: cappedReason,
    classification: classification,
    label: label,
    interpretation: interpretation,
    comparisonAdvantage: comparisonAdvantage,
  };
}


/* ══════════════════════════════════════════════════════════
   ㉒ Stress Tests -- اختبارات الإجهاد
   سيناريوهات تاريخية كارثية للسوق السعودي
═══════════════════════════════════════════════════════════ */

/**
 * سيناريوهات اختبار الإجهاد -- مُعايرة للسوق السعودي
 */
var STRESS_SCENARIOS = [
  {
    id: 'oil_crash_2015',
    name: 'انهيار النفط 2015',
    icon: '🛢️',
    description: 'تاسي -20% خلال 3 أشهر مع انهيار النفط',
    tasiShock: -0.20,
    oilShock: -0.50,
    severity: 'high',
    historical: true,
  },
  {
    id: 'covid_2020',
    name: 'جائحة كورونا 2020',
    icon: '🦠',
    description: 'تاسي -24% في مارس 2020',
    tasiShock: -0.24,
    oilShock: -0.65,
    severity: 'extreme',
    historical: true,
  },
  {
    id: 'saudi_correction',
    name: 'تصحيح عادي -10%',
    icon: '📉',
    description: 'تصحيح نموذجي يحدث كل 1-2 سنة',
    tasiShock: -0.10,
    oilShock: -0.15,
    severity: 'moderate',
    historical: false,
  },
  {
    id: 'crash_2006',
    name: 'انهيار السوق 2006',
    icon: '💥',
    description: 'أسوأ انهيار في تاريخ تاسي (-65%)',
    tasiShock: -0.65,
    oilShock: 0,
    severity: 'catastrophic',
    historical: true,
  },
  {
    id: 'black_swan',
    name: 'البجعة السوداء',
    icon: '🦢',
    description: 'أسوأ سيناريو ممكن -35%',
    tasiShock: -0.35,
    oilShock: -0.70,
    severity: 'catastrophic',
    historical: false,
  },
];

/**
 * تشغيل اختبار إجهاد على المحفظة
 *
 * المنهجية:
 * - نستخدم Portfolio Beta لتقدير تأثير صدمة السوق
 * - Expected Loss = Portfolio Value × Beta × TASI Shock
 * - نموذج CAPM المبسط للصدمات
 *
 * @param {number} portfolioValue - قيمة المحفظة
 * @param {number} portfolioBeta - Beta المحفظة vs تاسي
 * @returns {Array} نتائج جميع السيناريوهات
 */
export function runStressTests(portfolioValue: number, portfolioBeta?: number): any[] {
  if (!portfolioValue || portfolioValue <= 0) {
    return [];
  }

  if (portfolioBeta === undefined || portfolioBeta === null) {
    portfolioBeta = 1.0;
  }

  var results = [];

  for (var i = 0; i < STRESS_SCENARIOS.length; i++) {
    var scenario = STRESS_SCENARIOS[i];

    // ① التأثير من صدمة تاسي (عبر Beta)
    var tasiImpact = portfolioBeta * scenario.tasiShock;

    // ② الخسارة المتوقعة كنسبة
    var expectedLossPct = tasiImpact;

    // ③ الخسارة بالريال
    var expectedLossSAR = portfolioValue * expectedLossPct;

    // ④ القيمة المتوقعة بعد الصدمة
    var afterShockValue = portfolioValue * (1 + expectedLossPct);

    // ⑤ أيام التعافي المتوقعة (تقدير من التاريخ)
    var recoveryDays;
    if (Math.abs(expectedLossPct) < 0.10) {
      recoveryDays = '30-60';
    } else if (Math.abs(expectedLossPct) < 0.20) {
      recoveryDays = '90-180';
    } else if (Math.abs(expectedLossPct) < 0.35) {
      recoveryDays = '365-730';
    } else {
      recoveryDays = '730+';
    }

    // ⑥ التقييم
    var severity, severityColor;
    if (Math.abs(expectedLossPct) < 0.10) {
      severity = 'قابل للتحمل';
      severityColor = 'mint';
    } else if (Math.abs(expectedLossPct) < 0.20) {
      severity = 'مؤلم';
      severityColor = 'amber';
    } else if (Math.abs(expectedLossPct) < 0.35) {
      severity = 'خطير';
      severityColor = 'coral';
    } else {
      severity = 'كارثي';
      severityColor = 'coral';
    }

    results.push({
      id: scenario.id,
      name: scenario.name,
      icon: scenario.icon,
      description: scenario.description,
      tasiShock: scenario.tasiShock,
      expectedLossPct: +expectedLossPct.toFixed(4),
      expectedLossSAR: Math.round(expectedLossSAR),
      afterShockValue: Math.round(afterShockValue),
      recoveryDays: recoveryDays,
      severity: severity,
      severityColor: severityColor,
      historical: scenario.historical,
    });
  }

  return results;
}

/* ══════════════════════════════════════════════════════════
   ㉓ Portfolio Intelligence -- ربط الطبقات التسع
   الخطوة 25: الختام الملحمي
═══════════════════════════════════════════════════════════ */

/**
 * تحليل جودة الأسهم في المحفظة بناءً على الطبقات التسع
 *
 * يستخدم stockHealth من analysisEngine.js لكل سهم
 * ثم يحسب متوسطاً مرجّحاً للمحفظة
 *
 * @param {Array} positionsWithBars - [{sym, stk, bars, value}]
 * @param {Object} weights - أوزان الأسهم
 * @returns {Object} {avgScore, stocksAnalyzed, qualityBreakdown}
 */
export function calcPortfolioLayersScore(
  positionsWithBars: Position[],
  weights: Weights,
  stockHealthFunc?: any
): any {
  if (!positionsWithBars || positionsWithBars.length === 0 || !stockHealthFunc) {
    return {
      avgScore: 0,
      weightedScore: 0,
      stocksAnalyzed: 0,
      qualityBreakdown: {
        strong: 0,
        moderate: 0,
        weak: 0,
      },
      perStock: [],
    };
  }

  var perStock = [];
  var totalWeightedScore = 0;
  var totalWeight = 0;
  var sumScores = 0;
  var qualityBreakdown = { strong: 0, moderate: 0, weak: 0 };

  for (var i = 0; i < positionsWithBars.length; i++) {
    var p = positionsWithBars[i];
    if (!p.stk || !p.bars) continue;

    try {
      // استدعاء محرك الطبقات التسع
      var health = stockHealthFunc(p.stk, p.bars);
      if (!health || typeof health.score !== 'number') continue;

      var weight = weights[p.sym] || 0;
      var score = health.score;

      // تصنيف الجودة
      var quality;
      if (score >= 70) {
        quality = 'strong';
        qualityBreakdown.strong++;
      } else if (score >= 50) {
        quality = 'moderate';
        qualityBreakdown.moderate++;
      } else {
        quality = 'weak';
        qualityBreakdown.weak++;
      }

      perStock.push({
        sym: p.sym,
        score: score,
        weight: +(weight * 100).toFixed(1),
        weightedContribution: +(score * weight).toFixed(2),
        quality: quality,
        recommendation: health.recommendation || health.signal || null,
      });

      totalWeightedScore += score * weight;
      totalWeight += weight;
      sumScores += score;
    } catch (e) {
      continue;
    }
  }

  var avgScore = perStock.length > 0 ? sumScores / perStock.length : 0;
  var weightedScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return {
    avgScore: +avgScore.toFixed(1),
    weightedScore: +weightedScore.toFixed(1),
    stocksAnalyzed: perStock.length,
    qualityBreakdown: qualityBreakdown,
    perStock: perStock,
  };
}

/**
 * التوصية الذكية النهائية للمحفظة
 *
 * تدمج:
 * ① جودة اختيار الأسهم (الطبقات التسع)
 * ② مخاطر المحفظة (Sharpe, Max DD, VaR)
 * ③ التنويع (HHI, Correlation, Diversification Score)
 * ④ Stress Tests
 *
 * ليعطي توصية واضحة:
 * - 🟢 عزز الاستثمار
 * - 🟡 حافظ على الوضع
 * - 🟠 راجع وقلّل
 * - 🔴 أعد هيكلة
 *
 * @param {Object} analysis - نتيجة analyzePortfolio الكاملة
 * @returns {Object} {signal, label, color, reasons, actions}
 */
export function calcFinalRecommendation(analysis: any): any {
  if (!analysis) {
    return {
      signal: 'unknown',
      label: 'بيانات غير كافية',
      color: 'gray',
      confidence: 0,
      reasons: [],
      actions: [],
    };
  }

  var perf = analysis.performance || {};
  var risk = analysis.risk || {};
  var div = analysis.diversification || {};
  var layers = analysis.layersIntelligence || {};
  var stress = analysis.stressTests || [];

  // ═══════════════════════════════════════════
  // نظام التقييم: 4 محاور × 25 نقطة = 100
  // ═══════════════════════════════════════════

  var scores = {
    stockQuality: 0,   // جودة الأسهم (الطبقات التسع)
    performance: 0,    // الأداء (Sharpe, Alpha)
    risk: 0,           // المخاطر (Max DD, VaR)
    diversification: 0 // التنويع
  };

  // ① جودة الأسهم (25 نقطة)
  if (layers.weightedScore >= 70) scores.stockQuality = 25;
  else if (layers.weightedScore >= 60) scores.stockQuality = 20;
  else if (layers.weightedScore >= 50) scores.stockQuality = 15;
  else if (layers.weightedScore >= 40) scores.stockQuality = 10;
  else scores.stockQuality = 5;

  // ② الأداء (25 نقطة)
  if (perf.sharpe >= 1.5) scores.performance = 25;
  else if (perf.sharpe >= 1.0) scores.performance = 20;
  else if (perf.sharpe >= 0.5) scores.performance = 15;
  else if (perf.sharpe >= 0) scores.performance = 10;
  else scores.performance = 5;

  // ③ المخاطر (25 نقطة)
  if (risk.maxDrawdown > -0.10 && risk.var95Daily < 0.02) scores.risk = 25;
  else if (risk.maxDrawdown > -0.20) scores.risk = 20;
  else if (risk.maxDrawdown > -0.30) scores.risk = 15;
  else scores.risk = 10;

  // ④ التنويع (25 نقطة)
  if (div.score >= 75) scores.diversification = 25;
  else if (div.score >= 60) scores.diversification = 20;
  else if (div.score >= 45) scores.diversification = 15;
  else if (div.score >= 30) scores.diversification = 10;
  else scores.diversification = 5;

  // ═══ الدرجة الإجمالية ═══
  var totalScore = scores.stockQuality + scores.performance + scores.risk + scores.diversification;

  // ═══ تحديد الإشارة ═══
  var signal, label, color, icon;

  if (totalScore >= 80) {
    signal = 'strong_buy';
    label = '🟢 عزز الاستثمار';
    icon = '🟢';
    color = 'mint';
  } else if (totalScore >= 65) {
    signal = 'hold';
    label = '🟡 حافظ على الوضع';
    icon = '🟡';
    color = 'amber';
  } else if (totalScore >= 45) {
    signal = 'review';
    label = '🟠 راجع وقلّل المخاطر';
    icon = '🟠';
    color = 'coral';
  } else {
    signal = 'restructure';
    label = '🔴 أعد هيكلة المحفظة';
    icon = '🔴';
    color = 'coral';
  }

  // ═══ الأسباب ═══
  var reasons = [];

  if (scores.stockQuality >= 20) {
    reasons.push({ icon: '✅', text: 'جودة الأسهم ممتازة (الطبقات التسع)', positive: true });
  } else if (scores.stockQuality <= 10) {
    reasons.push({ icon: '⚠️', text: 'جودة الأسهم تحتاج مراجعة', positive: false });
  }

  if (scores.performance >= 20) {
    reasons.push({ icon: '📈', text: 'أداء قوي (Sharpe > 1)', positive: true });
  } else if (scores.performance <= 10) {
    reasons.push({ icon: '📉', text: 'أداء ضعيف مقابل المخاطر', positive: false });
  }

  if (scores.risk >= 20) {
    reasons.push({ icon: '🛡️', text: 'مخاطر تحت السيطرة', positive: true });
  } else if (scores.risk <= 15) {
    reasons.push({ icon: '🚨', text: 'مخاطر مرتفعة', positive: false });
  }

  if (scores.diversification >= 20) {
    reasons.push({ icon: '🎯', text: 'تنويع احترافي', positive: true });
  } else if (scores.diversification <= 10) {
    reasons.push({ icon: '⚠️', text: 'تركيز مفرط -- تنويع ضعيف', positive: false });
  }

  // ═══ الإجراءات الموصى بها ═══
  var actions = [];

  if (scores.diversification <= 15) {
    actions.push('🎯 أضف أسهم من قطاعات متنوعة');
  }
  if (scores.stockQuality <= 15) {
    actions.push('🔍 راجع الأسهم ذات الدرجات المنخفضة');
  }
  if (scores.risk <= 15) {
    actions.push('🛡️ ضع Stop Loss واضح لكل سهم');
  }
  if (div.largestPosition > 30) {
    actions.push('⚖️ قلّل السهم الأكبر (' + div.largestPosition + '%)');
  }

  // فحص Stress Tests
  var catastrophicScenarios = stress.filter(function(s: any) {
    return s.severity === 'كارثي';
  });
  if (catastrophicScenarios.length > 0) {
    actions.push('⚡ محفظتك معرّضة لـ ' + catastrophicScenarios.length + ' سيناريو كارثي');
  }

  if (actions.length === 0) {
    actions.push('✅ حافظ على الاستراتيجية الحالية');
  }

  return {
    signal: signal,
    label: label,
    icon: icon,
    color: color,
    totalScore: totalScore,
    confidence: +(totalScore / 100 * 100).toFixed(0),
    scoreBreakdown: scores,
    reasons: reasons,
    actions: actions,
  };
}

/**
 * دالة مساعدة لإضافة طبقة الذكاء للتحليل
 * تُستدعى من PortfolioScreen بعد analyzePortfolio
 *
 * @param {Object} analysis - نتيجة analyzePortfolio
 * @param {Array} positionsWithBars
 * @param {Function} stockHealthFunc - دالة stockHealth من analysisEngine
 * @returns {Object} analysis بعد إضافة طبقة الذكاء
 */
export function addIntelligenceLayer(
  analysis: PortfolioAnalysis,
  positionsWithBars: Position[],
  stockHealthFunc?: any
): PortfolioAnalysis {
  if (!analysis) return analysis;

  if (!stockHealthFunc) {
    // إذا لم تتوفر stockHealth، نحسب التوصية النهائية فقط بدون طبقات
    analysis.layersIntelligence = {
      avgScore: 0,
      weightedScore: 0,
      stocksAnalyzed: 0,
      qualityBreakdown: { strong: 0, moderate: 0, weak: 0 },
      perStock: [],
    };
    analysis.finalRecommendation = calcFinalRecommendation(analysis);
    return analysis;
  }

  // ① حساب الطبقات التسع
  var weights: any = {};
  for (var i = 0; i < positionsWithBars.length; i++) {
    var p = positionsWithBars[i];
    weights[p.sym] = p.value / analysis.totalValue;
  }

  var layersResult = calcPortfolioLayersScore(
    positionsWithBars,
    weights,
    stockHealthFunc
  );
  analysis.layersIntelligence = layersResult;

  // ② التوصية النهائية
  var finalRec = calcFinalRecommendation(analysis);
  analysis.finalRecommendation = finalRec;

  return analysis;
}

/* ══════════════════════════════════════════════════════════
   ㉕ Chart Data Generators -- بيانات الرسوم البيانية
═══════════════════════════════════════════════════════════ */

/**
 * توليد بيانات منحنى قيمة المحفظة مقابل تاسي -- بدون أي معايرة قسرية
 * يعتمد مباشرة على القيم الحقيقية المسجّلة في perfHistory (لا rescale، لا تلاعب رياضي)
 * الفترة الزمنية: من أول نقطة تسجيل فعلية للمحفظة حتى اليوم
 */
export function generatePortfolioValueChart(perfHistory: any[], currentValue: number): any {
  if (!perfHistory || perfHistory.length < 2) {
    return [];
  }

  // نقطة البداية الحقيقية -- نبحث عن أول نقطة صالحة (قيمة أكبر من صفر)
  var startEntry = null;
  for (var si = 0; si < perfHistory.length; si++) {
    if (perfHistory[si].value && perfHistory[si].value > 0) {
      startEntry = perfHistory[si];
      break;
    }
  }
  if (!startEntry) return [];
  var startValue = startEntry.value;

  // نبحث عن أول قيمة تاسي صالحة (أكبر من صفر) بشكل منفصل -- قد لا تتوفر بنفس نقطة startValue
  var startTasi = null;
  for (var ti = 0; ti < perfHistory.length; ti++) {
    if (perfHistory[ti].tasi && perfHistory[ti].tasi > 0) {
      startTasi = perfHistory[ti].tasi;
      break;
    }
  }

  var chartData: any[] = [];
  for (var i = 0; i < perfHistory.length; i++) {
    var entry = perfHistory[i];
    var dateObj = new Date(entry.date);

    // القيم الحقيقية مباشرة -- بدون أي معايرة أو تحجيم
    var portfolioVal = entry.value;
    var tasiVal = (entry.tasi && startTasi) ? entry.tasi : null;

    chartData.push({
      date: dateObj.getTime(),
      dateLabel: (dateObj.getMonth() + 1) + '/' + dateObj.getDate(),
      portfolio: Math.round(portfolioVal),
      benchmark: tasiVal !== null ? Math.round(tasiVal) : null,
      // Alpha كنسبة مئوية تراكمية من نفس نقطة البداية -- الطريقة الصحيحة الوحيدة للمقارنة
      // (فرق % وليس فرق قيم مطلقة، لأن مقياس الريال ومقياس نقاط تاسي مختلفان تماماً)
      alpha: (tasiVal !== null && startTasi)
        ? +((((portfolioVal - startValue) / startValue) * 100) - (((tasiVal - startTasi) / startTasi) * 100)).toFixed(2)
        : null,
    });
  }

  return chartData;
}

/**
 * توليد بيانات منحنى Drawdown عبر الزمن
 * 
 * المنهجية (Kestner 2003):
 * DD(t) = (V(t) - Peak(t)) / Peak(t)
 * 
 * يُظهر "أسوأ رحلة نفسية" للمستثمر
 */
export function generateDrawdownChart(positions: Position[], days?: number): any {
  if (!positions || positions.length === 0) {
    return { data: [], maxDrawdown: 0, maxDrawdownIdx: 0 };
  }
  days = days || 60;

  // ① حساب الأوزان
  var weights: any = {};
  var totalVal = 0;
  positions.forEach(function(p) { totalVal += p.value || 0; });
  positions.forEach(function(p) {
    weights[p.sym] = (p.value || 0) / totalVal;
  });

  // ② حساب عوائد المحفظة
  var portfolioReturns = calcPortfolioReturns(positions, weights);
  if (portfolioReturns.length < 2) {
    return { data: [], maxDrawdown: 0, maxDrawdownIdx: 0 };
  }

  var numPoints = Math.min(portfolioReturns.length, days);
  var startIdx = portfolioReturns.length - numPoints;

  // ③ بناء منحنى القيمة التراكمية
  var cumValue = [1.0];
  for (var i = 0; i < numPoints; i++) {
    cumValue.push(cumValue[cumValue.length - 1] * (1 + portfolioReturns[startIdx + i]));
  }

  // ④ تتبع القمم المتحركة
  var runningMax = [cumValue[0]];
  for (var j = 1; j < cumValue.length; j++) {
    runningMax.push(Math.max(runningMax[j - 1], cumValue[j]));
  }

  // ⑤ حساب Drawdown في كل نقطة
  var chartData = [];
  var maxDD = 0;
  var maxDDIdx = 0;

  for (var k = 0; k < cumValue.length; k++) {
    var dd = (cumValue[k] / runningMax[k]) - 1;
    if (dd < maxDD) {
      maxDD = dd;
      maxDDIdx = k;
    }

    var dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - (cumValue.length - k - 1));

    chartData.push({
      date: dateObj.getTime(),
      dateLabel: (dateObj.getMonth() + 1) + '/' + dateObj.getDate(),
      drawdown: +(dd * 100).toFixed(2),
      cumValue: +cumValue[k].toFixed(4),
      peak: +runningMax[k].toFixed(4),
    });
  }

  return {
    data: chartData,
    maxDrawdown: +(maxDD * 100).toFixed(2),
    maxDrawdownIdx: maxDDIdx,
    maxDrawdownDate: chartData[maxDDIdx] ? chartData[maxDDIdx].dateLabel : null,
  };
}

/**
 * توليد بيانات جدول العوائد الشهرية (Heatmap)
 * 
 * المنهجية:
 * ① تجميع العوائد حسب الشهر
 * ② تنظيمها في مصفوفة (سنوات × أشهر)
 * ③ حساب ملخصات
 * 
 * @param {Array} positions - مع bars لكل سهم
 * @param {number} days - عدد الأيام (افتراضي 365)
 * @returns {Object} {months, stats}
 */
export function generateMonthlyReturnsHeatmap(positions: Position[], days?: number): any {
  if (!positions || positions.length === 0) {
    return { months: [], stats: {} };
  }
  days = days || 365;

  // ① حساب الأوزان
  var weights: any = {};
  var totalVal = 0;
  positions.forEach(function(p) { totalVal += p.value || 0; });
  positions.forEach(function(p) {
    weights[p.sym] = (p.value || 0) / totalVal;
  });

  // ② حساب العوائد اليومية
  var portfolioReturns = calcPortfolioReturns(positions, weights);
  if (portfolioReturns.length < 20) {
    return { months: [], stats: {} };
  }

  // ③ بناء تواريخ لكل عائد
  var today = new Date();
  var dailyData = [];
  for (var i = 0; i < portfolioReturns.length; i++) {
    var daysAgo = portfolioReturns.length - 1 - i;
    var date = new Date(today);
    // ✨ العد بأيام التداول فقط (الأحد–الخميس) -- تخطي الجمعة والسبت
    var counted = 0;
    while (counted < daysAgo) {
      date.setDate(date.getDate() - 1);
      var dow = date.getDay();
      if (dow !== 5 && dow !== 6) counted++;
    }
    dailyData.push({
      date: date,
      return: portfolioReturns[i],
    });
  }

  // ④ تجميع العوائد شهرياً
var monthlyMap: any = {};   // "2026-03" → [returns array]
  
  dailyData.forEach(function(d) {
    var year = d.date.getFullYear();
    var month = d.date.getMonth() + 1; // 1-12
    var key = year + '-' + (month < 10 ? '0' + month : month);
    
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        year: year,
        month: month,
        returns: [],
      };
    }
    monthlyMap[key].returns.push(d.return);
  });

  // ⑤ حساب عائد مركب لكل شهر
  var monthlyArray: any[] = [];
  Object.keys(monthlyMap).forEach(function(key: string) {
    var m = monthlyMap[key];
    // Compound Return = Π(1 + r_i) - 1
    var compound = 1;
    m.returns.forEach(function(r: number) {
      compound *= (1 + r);
    });
    var monthReturn = compound - 1;
    
    monthlyArray.push({
      key: key,
      year: m.year,
      month: m.month,
      return: +(monthReturn * 100).toFixed(2),
      dayCount: m.returns.length,
    });
  });

  // ترتيب زمنياً
  monthlyArray.sort(function(a, b) {
    return a.key.localeCompare(b.key);
  });

  // ⑥ حساب الإحصاءات
    var stats: any = {
    totalMonths: monthlyArray.length,
    positiveMonths: 0,
    negativeMonths: 0,
    bestMonth: null,
    worstMonth: null,
    avgReturn: 0,
    winRate: 0,
  };

  var sum = 0;
  monthlyArray.forEach(function(m) {
    if (m.return > 0) stats.positiveMonths++;
    if (m.return < 0) stats.negativeMonths++;
    if (!stats.bestMonth || m.return > stats.bestMonth.return) {
      stats.bestMonth = m;
    }
    if (!stats.worstMonth || m.return < stats.worstMonth.return) {
      stats.worstMonth = m;
    }
    sum += m.return;
  });
  stats.avgReturn = monthlyArray.length > 0 
    ? +(sum / monthlyArray.length).toFixed(2) 
    : 0;
  stats.winRate = monthlyArray.length > 0
    ? +((stats.positiveMonths / monthlyArray.length) * 100).toFixed(0)
    : 0;

  return {
    months: monthlyArray,
    stats: stats,
  };
}

/**
 * توليد بيانات Risk-Return Scatter Plot
 * 
 * المنهجية (Markowitz 1952 - Nobel 1990):
 * لكل سهم: نحسب العائد السنوي والتذبذب السنوي
 * ثم نرسم النقاط على محورين
 * 
 * + محفظتك + TASI كنقاط مرجعية
 * 
 * @param {Array} positions - مع bars لكل سهم
 * @param {Object} analysisData - نتيجة analyzePortfolio
 * @returns {Object} {stocks, portfolio, benchmark, quadrants}
 */
export function generateRiskReturnScatter(positions: Position[], analysisData: any): any {
  if (!positions || positions.length === 0) {
    return { stocks: [], portfolio: null, benchmark: null };
  }

  var scatterData: any[] = [];


  // ① حساب Risk-Return لكل سهم
  positions.forEach(function(p: any) {
    if (!p.bars || p.bars.length < 10) return;

    // حساب العوائد اليومية للسهم
    var returns = simpleReturns(p.bars);
    if (returns.length < 5) return;

    // المتوسط والتذبذب
    var meanDaily = mean(returns);
    var stdDaily = std(returns);

    // تحويل سنوي
    var annualReturn = meanDaily * 252;
    var annualVol = stdDaily * Math.sqrt(252);

    // Sharpe Ratio -- نستخدم ثابت RISK_FREE الموحّد (SAIBOR 6% سنوي)
    var rf = CONFIG.RISK_FREE_DAILY * TRADING_DAYS; // = 0.06 سنوي، من مصدر واحد
    var sharpe = annualVol > 0 
      ? (annualReturn - rf) / annualVol 
      : 0;

    // تصنيف Quadrant
    var quadrant;
    if (annualReturn >= 0.15 && annualVol < 0.25) {
      quadrant = 'nirvana'; // نجم: عائد عالٍ، مخاطرة منخفضة
    } else if (annualReturn >= 0.10 && annualVol >= 0.25) {
      quadrant = 'aggressive'; // عدواني: عائد عالٍ، مخاطرة عالية
    } else if (annualReturn < 0.10 && annualVol < 0.25) {
      quadrant = 'defensive'; // دفاعي: عائد منخفض، مخاطرة منخفضة
    } else {
      quadrant = 'avoid'; // تجنب: عائد منخفض، مخاطرة عالية
    }

    scatterData.push({
      sym: p.sym,
      name: p.stk ? p.stk.name : p.sym,
      risk: +(annualVol * 100).toFixed(2),
      return: +(annualReturn * 100).toFixed(2),
      sharpe: +sharpe.toFixed(2),
      weight: p.value ? +((p.value / analysisData.totalValue) * 100).toFixed(1) : 0,
      quadrant: quadrant,
      type: 'stock',
    });
  });

  // ② إضافة نقطة المحفظة -- نحسبها من نفس نافذة 365 يوم ونفس منهجية الأسهم
  // (لا نعيد استخدام analysisData.performance لأنه يُحسب بنافذة 60 يوم مختلفة)
  var portfolio = null;
  if (positions && positions.length > 0) {
    var pWeights: any = {};
    var pTotalVal = 0;
    positions.forEach(function(p: any) { pTotalVal += p.value || 0; });
    positions.forEach(function(p: any) { pWeights[p.sym] = (p.value || 0) / pTotalVal; });

    var pReturns = calcPortfolioReturns(positions, pWeights);
    if (pReturns.length >= 2) {
      var pMeanDaily = mean(pReturns);
      var pStdDaily = std(pReturns);
      var pAnnualReturn = pMeanDaily * 252;
      var pAnnualVol = pStdDaily * Math.sqrt(252);
      var pRf = CONFIG.RISK_FREE_DAILY * TRADING_DAYS;
      var pSharpe = pAnnualVol > 0 ? (pAnnualReturn - pRf) / pAnnualVol : 0;

      portfolio = {
        sym: 'محفظتك',
        name: 'محفظتك',
        risk: +(pAnnualVol * 100).toFixed(2),
        return: +(pAnnualReturn * 100).toFixed(2),
        sharpe: +pSharpe.toFixed(2),
        weight: 100,
        type: 'portfolio',
      };
    }
  }


  // ③ إضافة نقطة TASI (متوسط الأسهم كمرجع اصطناعي)
  var benchmark = null;
  if (scatterData.length > 0) {
    var avgRisk = scatterData.reduce(function(s, d) { return s + d.risk; }, 0) / scatterData.length;
    var avgReturn = scatterData.reduce(function(s, d) { return s + d.return; }, 0) / scatterData.length;
    benchmark = {
      sym: 'TASI',
      name: 'تاسي',
      risk: +avgRisk.toFixed(2),
      return: +avgReturn.toFixed(2),
      sharpe: 0,
      type: 'benchmark',
    };
  }

  // ④ حساب إحصاءات القطاعات
  var quadrantCounts = {
    nirvana: 0,
    aggressive: 0,
    defensive: 0,
    avoid: 0,
  };
scatterData.forEach(function(d: any) {
    (quadrantCounts as any)[d.quadrant]++;
  });  

  return {
    stocks: scatterData,
    portfolio: portfolio,
    benchmark: benchmark,
    quadrantCounts: quadrantCounts,
    totalStocks: scatterData.length,
  };
}

/**
 * توليد بيانات Correlation Heatmap
 * 
 * المنهجية (Markowitz 1952):
 * Pearson Correlation بين كل زوج من الأسهم
 * 
 * @param {Array} positions - مع bars لكل سهم
 * @returns {Object} {matrix, symbols, highCorrelations, avgCorrelation}
 */
export function generateCorrelationHeatmap(positions: Position[]): any {
  if (!positions || positions.length < 2) {
    return { matrix: [], symbols: [], avgCorrelation: 0 };
  }

  // ① بناء مصفوفة العوائد
  var validPositions = positions.filter(function(p) {
    return p.bars && p.bars.length >= 10;
  });

  if (validPositions.length < 2) {
    return { matrix: [], symbols: [], avgCorrelation: 0 };
  }

  var symbols = validPositions.map(function(p) { return p.sym; });
  var names = validPositions.map(function(p) { 
    return p.stk ? p.stk.name : p.sym; 
  });

  // حساب العوائد لكل سهم
  var allReturns = validPositions.map(function(p) {
    return simpleReturns(p.bars);
  });

  // ② بناء المصفوفة
  var matrix = [];
  var highCorrelations = [];
  var sumCorrelations = 0;
  var pairCount = 0;

  for (var i = 0; i < symbols.length; i++) {
    var row = [];
    for (var j = 0; j < symbols.length; j++) {
      var corr;
      if (i === j) {
        corr = 1.0; // السهم مع نفسه
      } else if (j < i && matrix[j] && matrix[j][i] !== undefined) {
        // ✨ استغلال التناظر: ρ(A,B) = ρ(B,A) -- نصف عدد الحسابات
        corr = matrix[j][i];
      } else {
        // مزامنة الطول
        var minLen = Math.min(allReturns[i].length, allReturns[j].length);
        var retsA = allReturns[i].slice(-minLen);
        var retsB = allReturns[j].slice(-minLen);
        corr = correlation(retsA, retsB);
        
        if (i < j) {
          sumCorrelations += corr;
          pairCount++;
          
          if (Math.abs(corr) > 0.7) {
            highCorrelations.push({
              symA: symbols[i],
              symB: symbols[j],
              correlation: +corr.toFixed(3),
            });
          }
        }
      }
      row.push(+corr.toFixed(3));
    }
    matrix.push(row);
  }

  var avgCorrelation = pairCount > 0 ? sumCorrelations / pairCount : 0;

  // تصنيف
  var classification, label;
  if (avgCorrelation < 0.20) {
    classification = 'excellent';
    label = 'تنويع حقيقي';
  } else if (avgCorrelation < 0.40) {
    classification = 'good';
    label = 'تنويع جيد';
  } else if (avgCorrelation < 0.60) {
    classification = 'moderate';
    label = 'متوسط';
  } else {
    classification = 'poor';
    label = 'تنويع ضعيف';
  }

  return {
    matrix: matrix,
    symbols: symbols,
    names: names,
    avgCorrelation: +avgCorrelation.toFixed(3),
    highCorrelations: highCorrelations,
    highCount: highCorrelations.length,
    classification: classification,
    label: label,
    totalPairs: pairCount,
  };
}

/**
 * توليد بيانات VaR Distribution Chart
 * 
 * المنهجية:
 * ① توزيع العوائد اليومية إلى Bins
 * ② حساب VaR و CVaR
 * ③ إحصاءات التوزيع (Mean, Median, Skew, Kurtosis)
 * 
 * @param {Array} positions - مع bars لكل سهم
 * @returns {Object} {bins, varLine, cvarLine, stats}
 */
export function generateVaRDistribution(positions: Position[]): any {
  if (!positions || positions.length === 0) {
    return { bins: [], stats: {} };
  }

  // ① حساب الأوزان
  var weights: any = {};
  var totalVal = 0;
  positions.forEach(function(p) { totalVal += p.value || 0; });
  positions.forEach(function(p) {
    weights[p.sym] = (p.value || 0) / totalVal;
  });

  // ② حساب العوائد اليومية
  var portfolioReturns = calcPortfolioReturns(positions, weights);
  if (portfolioReturns.length < 10) {
    return { bins: [], stats: {} };
  }

  // تحويل إلى نسب مئوية
  var returns = portfolioReturns.map(function(r) { return r * 100; });

  // ③ حساب الإحصاءات
  var n = returns.length;
  var sum = 0;
  for (var i = 0; i < n; i++) sum += returns[i];
  var meanReturn = sum / n;

  // الانحراف المعياري
  var sumSq = 0;
  for (var j = 0; j < n; j++) {
    sumSq += Math.pow(returns[j] - meanReturn, 2);
  }
  var stdDev = Math.sqrt(sumSq / n);

  // الوسيط
  var sortedReturns = returns.slice().sort(function(a, b) { return a - b; });
  var median = sortedReturns[Math.floor(n / 2)];

  // Skewness (الانحراف)
  var sumCube = 0;
  for (var k = 0; k < n; k++) {
    sumCube += Math.pow((returns[k] - meanReturn) / stdDev, 3);
  }
  var skewness = sumCube / n;

  // Kurtosis (التفرطح)
  var sumQuad = 0;
  for (var l = 0; l < n; l++) {
    sumQuad += Math.pow((returns[l] - meanReturn) / stdDev, 4);
  }
  var kurtosis = (sumQuad / n) - 3; // Excess Kurtosis

  // ④ VaR و CVaR
  var varIdx = Math.floor(0.05 * n);
  var var95 = -sortedReturns[varIdx];

  var cvarSum = 0;
  for (var m = 0; m <= varIdx; m++) {
    cvarSum += sortedReturns[m];
  }
  var cvar95 = -cvarSum / (varIdx + 1);

  // ⑤ بناء Histogram
  var minReturn = sortedReturns[0];
  var maxReturn = sortedReturns[n - 1];
  var range = maxReturn - minReturn;
  
  // عدد Bins (قاعدة Sturges: k = 1 + log2(n))
  var numBins = Math.max(10, Math.min(30, Math.ceil(1 + Math.log2(n))));
  var binWidth = range / numBins;

  var bins: any[] = [];
  for (var b = 0; b < numBins; b++) {
    var binStart = minReturn + b * binWidth;
    var binEnd = binStart + binWidth;
    bins.push({
      start: +binStart.toFixed(2),
      end: +binEnd.toFixed(2),
      midpoint: +((binStart + binEnd) / 2).toFixed(2),
      count: 0,
      isNegative: (binStart + binEnd) / 2 < 0,
    });
  }

  // توزيع العوائد
  returns.forEach(function(r) {
    var binIdx = Math.min(numBins - 1, Math.floor((r - minReturn) / binWidth));
    if (binIdx >= 0 && binIdx < numBins) {
      bins[binIdx].count++;
    }
  });

  // عدّ الأيام الإيجابية والسلبية
  var positiveCount = 0;
  var negativeCount = 0;
  returns.forEach(function(r) {
    if (r > 0) positiveCount++;
    else if (r < 0) negativeCount++;
  });

  return {
    bins: bins,
    stats: {
      mean: +meanReturn.toFixed(3),
      median: +median.toFixed(3),
      stdDev: +stdDev.toFixed(3),
      skewness: +skewness.toFixed(2),
      kurtosis: +kurtosis.toFixed(2),
      var95: +var95.toFixed(3),
      cvar95: +cvar95.toFixed(3),
      min: +minReturn.toFixed(3),
      max: +maxReturn.toFixed(3),
      totalDays: n,
      positiveDays: positiveCount,
      negativeDays: negativeCount,
      positiveDaysPct: +((positiveCount / n) * 100).toFixed(1),
    },
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
