'use client';
/**
 * @module backtestEngine
 * @description محرك اختبار الاستراتيجيات تاريخياً
 * 
 * المنهجية (Pardo 2008, Kestner 2003):
 * ① تنفيذ الاستراتيجية يوماً بيوم
 * ② حساب Equity Curve
 * ③ حساب 18+ مقياس أداء
 * ④ المقارنة مع TASI Benchmark
 * 
 * @author تداول+
 * @version 1.0
 */

import { mean, std, simpleReturns } from '../utils/portfolioMath';
import { recordFeedback } from './analysisEngine';
import { generateRealDataFromPortfolio, generateRealDataFromStockList } from '../services/api/sahmkHistoricalApi';

/**
 * إعدادات Backtest الافتراضية
 */
export var BACKTEST_DEFAULTS = {
  initialCapital: 100000,      // رأس المال (100 ألف ر.س)
  commissionRate: 0.00155,     // 0.155% عمولة
  minCommission: 12,           // حد أدنى 12 ر.س
  vatRate: 0.15,              // ضريبة القيمة المضافة
  regulatoryFee: 0.00005,     // رسوم هيئة السوق
  slippage: 0.001,            // 0.1% انزلاق سعري
  riskFreeRate: 0.06,         // عائد خالي من المخاطر 6%
  includeCosts: true,         // تفعيل التكاليف
};

/**
 * حساب تكلفة الصفقة
 */
function calcTradeCost(tradeValue: number, config: any): number {
  var commission = Math.max(
    tradeValue * config.commissionRate,
    config.minCommission
  );
  var vat = commission * config.vatRate;
  var regFees = tradeValue * config.regulatoryFee;
  var slippageCost = tradeValue * config.slippage;
  
  return commission + vat + regFees + slippageCost;
}


/**
 * المحرك الرئيسي: backtest
 * 
 * @param {Object} strategy - { name, generateSignals(day, state) }
 * @param {Array} historicalData - [{ date, prices: {sym: price}, bars }]
 * @param {Object} options - إعدادات اختيارية
 * @returns {Object} نتائج Backtest كاملة
 */
export function backtest(strategy: any, historicalData: any[], options?: any): any {
  var config = Object.assign({}, BACKTEST_DEFAULTS, options || {});
  
  if (!historicalData || historicalData.length < 30) {
    return {
      error: 'بيانات غير كافية (يتطلب 30 يوماً على الأقل)',
      success: false,
    };
  }

  // ① حالة المحفظة
  var state: any = {
    cash: config.initialCapital,
    positions: {} as any,
    initialCapital: config.initialCapital,
  };

  var trades: any[] = [];
  var equityCurve: any[] = [];
  var dailyReturns: number[] = [];
  var benchmarkCurve: any[] = [];

  // ② تشغيل المحاكاة يوماً بيوم
  for (var i = 0; i < historicalData.length; i++) {
    var day = historicalData[i];
    var date = day.date;
    var prices = day.prices;

    // ٢.١ توليد الإشارات
    var signals: any[] = [];
    if (strategy && typeof strategy.generateSignals === 'function') {
      try {
        signals = strategy.generateSignals(day, state, historicalData, i) || [];
      } catch (err) {
        console.error('Strategy error:', err);
        signals = [];
      }
    }

    // ٢.٢ تنفيذ إشارات البيع أولاً (لتحرير رأس المال)
    signals.filter(function(s: any) { return s.action === 'sell'; }).forEach(function(signal: any) {
      executeSell(signal, state, prices, trades, date, config);
    });

    // ٢.٣ ثم تنفيذ إشارات الشراء
    signals.filter(function(s: any) { return s.action === 'buy'; }).forEach(function(signal: any) {
      executeBuy(signal, state, prices, trades, date, config);
    });

    // ٢.٤ حساب قيمة المحفظة اليوم
    var totalValue = state.cash;
    Object.keys(state.positions).forEach(function(sym: string) {
      var pos = state.positions[sym];
      var price = prices[sym];
      if (price && pos.shares > 0) {
        totalValue += pos.shares * price;
      }
    });

    equityCurve.push({
      date: date,
      value: +totalValue.toFixed(2),
      cash: +state.cash.toFixed(2),
      invested: +(totalValue - state.cash).toFixed(2),
      positions: Object.keys(state.positions).length,
    });

    // ٢.٥ حساب العائد اليومي
    if (i > 0) {
      var prevValue = equityCurve[i - 1].value;
      var dailyRet = (totalValue - prevValue) / prevValue;
      dailyReturns.push(dailyRet);
    }

    // ٢.٦ TASI Benchmark (متوسط تغير الأسعار)
    if (i > 0 && day.tasiValue !== undefined) {
      benchmarkCurve.push({
        date: date,
        value: day.tasiValue,
      });
    }
  }

  // ✅ حماية: تحقق من وجود بيانات قبل الحساب
  if (equityCurve.length === 0) {
    return {
      error: 'فشل توليد منحنى الأسهم - لا توجد بيانات',
      success: false,
    };
  }

  // ③ حساب مقاييس الأداء
  var performance = calcPerformanceMetrics(
    equityCurve,
    dailyReturns,
    trades,
    config,
    benchmarkCurve
  );

  return {
    success: true,
    config: config,
    equityCurve: equityCurve,
    benchmarkCurve: benchmarkCurve,
    trades: trades,
    tradeCount: trades.length,
    dailyReturns: dailyReturns,
    finalValue: equityCurve[equityCurve.length - 1].value,
    performance: performance,
    summary: generateSummary(performance, trades, config),
  };
}

/**
 * تنفيذ صفقة شراء
 */
function executeBuy(signal: any, state: any, prices: any, trades: any[], date: string, config: any): void {
  var price = prices[signal.sym];
  if (!price || price <= 0) return;

  // حساب قيمة الصفقة
  var desiredValue = signal.value || (signal.weight * (state.cash + calcInvestedValue(state, prices)));
  if (desiredValue > state.cash) {
    desiredValue = state.cash * 0.98; // ترك 2% احتياط
  }
  if (desiredValue < 100) return; // صفقة صغيرة جداً

  // حساب التكاليف
  var costs = config.includeCosts ? calcTradeCost(desiredValue, config) : 0;
  var netValue = desiredValue - costs;

  // حساب عدد الأسهم
  var shares = Math.floor(netValue / price);
  if (shares < 1) return;

  var actualCost = (shares * price) + costs;
  if (actualCost > state.cash) return;

  // تنفيذ الصفقة
  state.cash -= actualCost;

  if (state.positions[signal.sym]) {
    // إضافة لمركز قائم (متوسط التكلفة)
    var existing = state.positions[signal.sym];
    var totalShares = existing.shares + shares;
    var totalCost = (existing.shares * existing.avgCost) + (shares * price);
    state.positions[signal.sym] = {
      shares: totalShares,
      avgCost: totalCost / totalShares,
      entryDate: existing.entryDate,
    };
    } else {
    state.positions[signal.sym] = {
      shares: shares,
      avgCost: price,
      entryDate: date,
      layersAtEntry: signal.layers || null,  // ✨ حفظ layers للـ AI Learning
    };
  }

  trades.push({
    date: date,
    sym: signal.sym,
    action: 'buy',
    shares: shares,
    price: +price.toFixed(2),
    value: +(shares * price).toFixed(2),
    cost: +costs.toFixed(2),
    reason: signal.reason || '',
  });
}

/**
 * تنفيذ صفقة بيع
 */
function executeSell(signal: any, state: any, prices: any, trades: any[], date: string, config: any): void {
  var position = state.positions[signal.sym];
  if (!position || position.shares <= 0) return;

  var price = prices[signal.sym];
  if (!price || price <= 0) return;

  var shares = signal.shares || position.shares;
  if (shares > position.shares) shares = position.shares;

  var grossValue = shares * price;
  var costs = config.includeCosts ? calcTradeCost(grossValue, config) : 0;
  var netValue = grossValue - costs;

  // حساب الربح/الخسارة
  var costBasis = shares * position.avgCost;
  var pnl = netValue - costBasis;
  var pnlPct = (pnl / costBasis) * 100;

  // تنفيذ البيع
  state.cash += netValue;

  if (shares >= position.shares) {
    delete state.positions[signal.sym];
  } else {
    state.positions[signal.sym].shares -= shares;
  }

    trades.push({
    date: date,
    sym: signal.sym,
    action: 'sell',
    shares: shares,
    price: +price.toFixed(2),
    value: +grossValue.toFixed(2),
    cost: +costs.toFixed(2),
    pnl: +pnl.toFixed(2),
    pnlPct: +pnlPct.toFixed(2),
    reason: signal.reason || '',
  });

      // ✨ AI Smart Weighted Learning - مبني على أبحاث Quant Finance
  try {
    // 🎯 القاعدة 1: Dead Zone - تجاهل الضوضاء (±0.5%)
    // 🎯 القاعدة 2: Anomaly Filter - تجاهل الحركات الاستثنائية (±20%)
    if (Math.abs(pnlPct) >= 0.5 && Math.abs(pnlPct) <= 20) {
      // 🎯 القاعدة 3: Weighted Learning - كل صفقة بقوتها
      var actualOutcome = 0;
      
      // النتائج الإيجابية
      if (pnlPct >= 10)      actualOutcome = 2.0;
      else if (pnlPct >= 5)  actualOutcome = 1.5;
      else if (pnlPct >= 3)  actualOutcome = 1.0;
      else if (pnlPct >= 1)  actualOutcome = 0.5;
      else if (pnlPct > 0)   actualOutcome = 0.2;
      // النتائج السلبية
      else if (pnlPct >= -1)  actualOutcome = -0.2;
      else if (pnlPct >= -3)  actualOutcome = -0.5;
      else if (pnlPct >= -5)  actualOutcome = -1.0;
      else if (pnlPct >= -10) actualOutcome = -1.5;
      else                    actualOutcome = -2.0;
      
      var signalTaken = pnlPct >= 0 ? 'شراء قوي' : 'تخفيف';
      
      var layersUsed = position.layersAtEntry || {
        L1: 60, L2: 60, L3: 60, L4: 60, L5: 60,
        L6: 60, L7: 60, L8: 60, L9: 60
      };
      
      recordFeedback(signal.sym, signalTaken, layersUsed, actualOutcome);
    }
  } catch (e) {
    // فشل صامت
  }
}

/**
 * حساب القيمة المستثمرة حالياً
 */
function calcInvestedValue(state: any, prices: any): number {
  var total = 0;
  Object.keys(state.positions).forEach(function(sym: string) {
    var pos = state.positions[sym];
    var price = prices[sym];
    if (price && pos.shares > 0) {
      total += pos.shares * price;
    }
  });
  return total;
}

/**
 * حساب مقاييس الأداء (18 مقياساً)
 */
function calcPerformanceMetrics(equityCurve: any[], dailyReturns: number[], trades: any[], config: any, benchmarkCurve: any[]): any {
  if (equityCurve.length < 2) return {};

  var initial = config.initialCapital;
  var final = equityCurve[equityCurve.length - 1].value;

  // ① العوائد الأساسية
  var totalReturn = (final / initial) - 1;
  var days = equityCurve.length;
  var years = days / 252;
  // ✨ حارس المدد القصيرة: التحويل السنوي عند years<0.5 يُضخّم العائد بشكل مضلِّل.
  // دون نصف سنة: نعرض العائد الكلي دون تحويل سنوي، مع علَم للإفصاح.
  var annualReturn;
  var annualReturnIsExtrapolated = false;
  if (years >= 0.5) {
    annualReturn = Math.pow(1 + totalReturn, 1 / years) - 1;
  } else {
    annualReturn = totalReturn; // مدة قصيرة جداً -- لا نُسنوِيه
    annualReturnIsExtrapolated = false;
  }

  // ② التذبذب
  var meanRet = dailyReturns.length > 0 ? mean(dailyReturns) : 0;
  var stdRet = dailyReturns.length > 0 ? std(dailyReturns) : 0;
  var volatility = stdRet * Math.sqrt(252);

  // ③ Sharpe Ratio
  var sharpe = volatility > 0 
    ? (annualReturn - config.riskFreeRate) / volatility 
    : 0;

  // ④ Sortino Ratio (downside deviation)
  // ✨ القسمة على n الكلي (Sortino & Price 1994) -- لا على عدد السالبة فقط.
  // نفس تصحيح portfolioMath.downsideDeviation -- semi-deviation حقيقي.
  var downReturns = dailyReturns.filter(function(r: number) { return r < 0; });
  var downStd = 0;
  if (downReturns.length > 0 && dailyReturns.length > 0) {
    var sumSqDown = downReturns.reduce(function(s: number, r: number) { return s + r * r; }, 0);
    downStd = Math.sqrt(sumSqDown / dailyReturns.length);
  }
  var downsideVol = downStd * Math.sqrt(252);
  var sortino = downsideVol > 0 
    ? (annualReturn - config.riskFreeRate) / downsideVol 
    : 0;

  // ⑤ Max Drawdown
  var peak = equityCurve[0].value;
  var maxDD = 0;
  var maxDDDate = null;
  equityCurve.forEach(function(e: any) {
    if (e.value > peak) peak = e.value;
    var dd = (e.value - peak) / peak;
    if (dd < maxDD) {
      maxDD = dd;
      maxDDDate = e.date;
    }
  });

  // ⑥ Calmar Ratio
  var calmar = maxDD < 0 ? annualReturn / Math.abs(maxDD) : 0;

  // ⑦ إحصاءات الصفقات
  var closedTrades = trades.filter(function(t: any) { return t.action === 'sell' && t.pnl !== undefined; });
  var winningTrades = closedTrades.filter(function(t: any) { return t.pnl > 0; });
  var losingTrades = closedTrades.filter(function(t: any) { return t.pnl < 0; });

  var winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;

  var avgWin = winningTrades.length > 0 
    ? mean(winningTrades.map(function(t: any) { return t.pnl; })) 
    : 0;
  var avgLoss = losingTrades.length > 0 
    ? Math.abs(mean(losingTrades.map(function(t: any) { return t.pnl; })))
    : 0;

  // ⑧ Profit Factor
  var grossProfit = winningTrades.reduce(function(s: number, t: any) { return s + t.pnl; }, 0);
  var grossLoss = Math.abs(losingTrades.reduce(function(s: number, t: any) { return s + t.pnl; }, 0));
  // عند انعدام الخسائر: لا نعرض رقماً مضلِّلاً (999). نستخدم null كإشارة "لا يُحسب".
  var profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  // ⑨ Expected Return per trade
  var expectedReturn = closedTrades.length > 0
    ? mean(closedTrades.map(function(t: any) { return t.pnlPct; }))
    : 0;

  // ⑩ VaR & CVaR
  var sortedReturns = dailyReturns.slice().sort(function(a: number, b: number) { return a - b; });
  var varIdx = Math.floor(0.05 * sortedReturns.length);
  var var95 = sortedReturns.length > 0 ? -sortedReturns[varIdx] * 100 : 0;
  
  var cvarSum = 0;
  for (var m = 0; m <= varIdx && m < sortedReturns.length; m++) {
    cvarSum += sortedReturns[m];
  }
  var cvar95 = varIdx >= 0 ? -(cvarSum / (varIdx + 1)) * 100 : 0;

    // ⑪ مقاييس إضافية (محمية من array فارغة)
  var bestDay = dailyReturns.length > 0 ? Math.max.apply(null, dailyReturns) * 100 : 0;
  var worstDay = dailyReturns.length > 0 ? Math.min.apply(null, dailyReturns) * 100 : 0;
  
  var positiveDays = dailyReturns.filter(function(r: number) { return r > 0; }).length;
  var negativeDays = dailyReturns.filter(function(r: number) { return r < 0; }).length;
  var positiveDaysPct = dailyReturns.length > 0 ? (positiveDays / dailyReturns.length) * 100 : 0;

  return {
    // العوائد
    totalReturn: +(totalReturn * 100).toFixed(2),
    annualReturn: +(annualReturn * 100).toFixed(2),
    annualReturnNote: years < 0.5 ? 'المدة أقل من 6 أشهر -- العائد كلّي لا سنوي (التحويل السنوي يُضخّم)' : null,
    finalValue: +final.toFixed(2),
    
    // المخاطر
    volatility: +(volatility * 100).toFixed(2),
    maxDrawdown: +(maxDD * 100).toFixed(2),
    maxDrawdownDate: maxDDDate,
    var95: +var95.toFixed(3),
    cvar95: +cvar95.toFixed(3),
    
    // النسب
    sharpe: +sharpe.toFixed(2),
    sortino: +sortino.toFixed(2),
    calmar: +calmar.toFixed(2),
    profitFactor: profitFactor != null ? +profitFactor.toFixed(2) : null,
    profitFactorNote: profitFactor == null ? 'لا خسائر مُسجّلة -- النسبة غير قابلة للحساب' : null,
    
    // الصفقات
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: +winRate.toFixed(1),
    avgWin: +avgWin.toFixed(2),
    avgLoss: +avgLoss.toFixed(2),
    expectedReturn: +expectedReturn.toFixed(2),
    
    // أيام
    totalDays: days,
    years: +years.toFixed(2),
    bestDay: +bestDay.toFixed(2),
    worstDay: +worstDay.toFixed(2),
    positiveDays: positiveDays,
    negativeDays: negativeDays,
    positiveDaysPct: +positiveDaysPct.toFixed(1),
  };
}

/**
 * توليد ملخص نصي
 */
function generateSummary(perf: any, trades: any[], config: any): any {
  var summary: any = {
    rating: 'neutral',
    label: 'أداء متوسط',
    color: 'amber',
    keyPoints: [] as string[],
  };

  // تقييم الأداء
  if (perf.sharpe >= 1.5 && perf.winRate >= 55) {
    summary.rating = 'excellent';
    summary.label = 'أداء استثنائي';
    summary.color = 'mint';
  } else if (perf.sharpe >= 1.0 && perf.winRate >= 50) {
    summary.rating = 'good';
    summary.label = 'أداء جيد';
    summary.color = 'mint';
  } else if (perf.sharpe >= 0.5) {
    summary.rating = 'moderate';
    summary.label = 'أداء مقبول';
    summary.color = 'amber';
  } else {
    summary.rating = 'poor';
    summary.label = 'أداء ضعيف';
    summary.color = 'coral';
  }

  // نقاط القوة
  if (perf.sharpe > 1.5) summary.keyPoints.push('✅ Sharpe ممتاز');
  if (perf.winRate > 55) summary.keyPoints.push('✅ معدل ربح قوي');
  if (perf.maxDrawdown > -15) summary.keyPoints.push('✅ تراجعات محدودة');
  if (perf.profitFactor > 2) summary.keyPoints.push('✅ نسبة ربح/خسارة ممتازة');
  
  // نقاط الضعف
  if (perf.maxDrawdown < -25) summary.keyPoints.push('⚠️ تراجعات كبيرة');
  if (perf.winRate < 40) summary.keyPoints.push('⚠️ معدل ربح منخفض');
  if (perf.sharpe < 0.5) summary.keyPoints.push('⚠️ Sharpe ضعيف');

  return summary;
}

/**
 * مقارنة مع TASI Benchmark
 */
export function compareWithBenchmark(backtestResult: any, benchmarkResult: any): any {
  if (!backtestResult.success || !benchmarkResult.success) {
    return null;
  }

  var strategy = backtestResult.performance;
  var bench = benchmarkResult.performance;

  return {
    alpha: +(strategy.annualReturn - bench.annualReturn).toFixed(2),
    outperformance: strategy.annualReturn > bench.annualReturn,
    sharpeDiff: +(strategy.sharpe - bench.sharpe).toFixed(2),
    maxDDDiff: +(strategy.maxDrawdown - bench.maxDrawdown).toFixed(2),
    volDiff: +(strategy.volatility - bench.volatility).toFixed(2),
    winRateDiff: +(strategy.winRate - bench.winRate).toFixed(1),
  };
}

/* ══════════════════════════════════════════════════════════
   🎰 Monte Carlo Simulation
   Bootstrap Resampling (Efron 1979)
═══════════════════════════════════════════════════════════ */

/**
 * محاكاة Monte Carlo لنتائج Backtest
 * 
 * المنهجية:
 * ① أخذ العوائد اليومية من Backtest الأصلي
 * ② خلط الترتيب عشوائياً (Bootstrap)
 * ③ حساب Equity Curve الجديد
 * ④ تكرار N مرة
 * ⑤ تحليل توزيع النتائج
 * 
 * @param {Object} backtestResult - نتيجة backtest()
 * @param {number} iterations - عدد المحاكيات (10,000 افتراضي)
 * @returns {Object} نتائج Monte Carlo
 */
/**
 * ✨ طول الكتلة الأمثل لـ Block Bootstrap
 * قاعدة Politis & White (2004) المبسّطة: block ≈ n^(1/3)
 * تحافظ على الترابط الزمني (volatility clustering + autocorrelation)
 * مُقيّدة بين 5 و 20 يوماً (أسبوع تداول إلى ~شهر)
 */
function optimalBlockLength(n: number): number {
  var raw = Math.round(Math.pow(n, 1 / 3));
  return Math.max(5, Math.min(20, raw));
}

export function monteCarloSimulation(backtestResult: any, iterations?: number): any {
  iterations = iterations || 10000;
  
  if (!backtestResult || !backtestResult.success) {
    return { error: 'نتائج Backtest غير صالحة', success: false };
  }

  var dailyReturns = backtestResult.dailyReturns || [];
  if (dailyReturns.length < 30) {
    return { error: 'بيانات غير كافية (30 يوم على الأقل)', success: false };
  }

  var initialCapital = backtestResult.config.initialCapital;
  var totalDays = dailyReturns.length;
  // ✨ نقرأ riskFreeRate من نفس config الباك-تيست -- لضمان اتساق Sharpe بين اللوحتين
  var riskFreeRate = (backtestResult.config && backtestResult.config.riskFreeRate != null)
    ? backtestResult.config.riskFreeRate : 0.06;

  // ① تشغيل المحاكاة
  var allResults: number[] = [];
  var allMaxDrawdowns: number[] = [];
  var allSharpes: number[] = [];
  var allFinalValues: number[] = [];

  // ✨ Block Bootstrap -- يحافظ على الترابط الزمني (volatility clustering)
  var blockLen = optimalBlockLength(totalDays);

  for (var sim = 0; sim < iterations; sim++) {
    // أخذ عيّنات كتلية متتالية بدل أيام منفردة (Künsch 1989)
    var shuffledReturns: number[] = [];
    while (shuffledReturns.length < totalDays) {
      // نقطة بداية عشوائية لكتلة متتالية
      var startIdx = Math.floor(Math.random() * totalDays);
      for (var b2 = 0; b2 < blockLen && shuffledReturns.length < totalDays; b2++) {
        // التفاف دائري (circular) لضمان كتل كاملة دائماً
        var srcIdx = (startIdx + b2) % totalDays;
        shuffledReturns.push(dailyReturns[srcIdx]);
      }
    }

    // حساب Equity Curve
    var value = initialCapital;
    var peak = value;
    var maxDD = 0;

    for (var t = 0; t < shuffledReturns.length; t++) {
      value *= (1 + shuffledReturns[t]);
      if (value > peak) peak = value;
      var dd = (value - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }

    var finalValue = value;
    var totalReturn = (finalValue / initialCapital) - 1;
    var years = totalDays / 252;
    // نفس حارس المدد القصيرة -- تجنّب تضخيم العائد في المحاكاة
    var annualReturn = years >= 0.5 ? Math.pow(1 + totalReturn, 1 / years) - 1 : totalReturn;

    // حساب Sharpe للسيناريو
    var simMean = 0;
    for (var m = 0; m < shuffledReturns.length; m++) simMean += shuffledReturns[m];
    simMean /= shuffledReturns.length;

    var simVar = 0;
    for (var v = 0; v < shuffledReturns.length; v++) {
      simVar += Math.pow(shuffledReturns[v] - simMean, 2);
    }
    var simStd = Math.sqrt(simVar / shuffledReturns.length);
    var simVol = simStd * Math.sqrt(252);
    var simSharpe = simVol > 0 ? (annualReturn - riskFreeRate) / simVol : 0;

    allResults.push(annualReturn * 100);
    allMaxDrawdowns.push(maxDD * 100);
    allSharpes.push(simSharpe);
    allFinalValues.push(finalValue);
  }

  // ② ترتيب النتائج
  allResults.sort(function(a: number, b: number) { return a - b; });
  allMaxDrawdowns.sort(function(a: number, b: number) { return a - b; });
  allSharpes.sort(function(a: number, b: number) { return a - b; });
  allFinalValues.sort(function(a: number, b: number) { return a - b; });

  // ③ حساب الإحصاءات
  var median = allResults[Math.floor(iterations / 2)];
var meanResult = allResults.reduce(function(s: number, r: number) { return s + r; }, 0) / iterations;
  
  var positiveCount = allResults.filter(function(r: number) { return r > 0; }).length;
  var probabilityOfProfit = (positiveCount / iterations) * 100;

  // ④ Percentiles
  function getPercentile(sortedArr: number[], p: number): number {
    var idx = Math.floor((p / 100) * sortedArr.length);
    if (idx >= sortedArr.length) idx = sortedArr.length - 1;
    return sortedArr[idx];
  }

  // ⑤ تصنيف المخاطر
  var riskRating;
  var riskColor;
  var riskLabel;
  
  if (probabilityOfProfit > 80 && getPercentile(allResults, 5) > 0) {
    riskRating = 'excellent';
    riskColor = 'mint';
    riskLabel = 'مخاطر منخفضة جداً';
  } else if (probabilityOfProfit > 70) {
    riskRating = 'good';
    riskColor = 'mint';
    riskLabel = 'مخاطر منخفضة';
  } else if (probabilityOfProfit > 60) {
    riskRating = 'moderate';
    riskColor = 'amber';
    riskLabel = 'مخاطر متوسطة';
  } else if (probabilityOfProfit > 50) {
    riskRating = 'elevated';
    riskColor = 'amber';
    riskLabel = 'مخاطر مرتفعة';
  } else {
    riskRating = 'high';
    riskColor = 'coral';
    riskLabel = 'مخاطر عالية جداً';
  }

  // ⑥ توزيع النتائج (20 bin)
  var minResult = allResults.length > 0 ? allResults[0] : 0;
  var maxResult = allResults.length > 0 ? allResults[allResults.length - 1] : 0;
  var numBins = 20;
  var binWidth = numBins > 0 && maxResult !== minResult ? (maxResult - minResult) / numBins : 1;
  
  var distribution: any[] = [];
  for (var b = 0; b < numBins; b++) {
    var binStart = minResult + b * binWidth;
    var binEnd = binStart + binWidth;
    var count = 0;
    allResults.forEach(function(r: number) {
      if (r >= binStart && r < binEnd) count++;
      else if (b === numBins - 1 && r === binEnd) count++;
    });
    distribution.push({
      start: +binStart.toFixed(2),
      end: +binEnd.toFixed(2),
      midpoint: +((binStart + binEnd) / 2).toFixed(2),
      count: count,
      pct: +((count / iterations) * 100).toFixed(1),
      isNegative: (binStart + binEnd) / 2 < 0,
    });
  }

  return {
    success: true,
    iterations: iterations,
    
    // إحصاءات العائد
    returns: {
      mean: +meanResult.toFixed(2),
      median: +median.toFixed(2),
      min: +minResult.toFixed(2),
      max: +maxResult.toFixed(2),
      percentile5: +getPercentile(allResults, 5).toFixed(2),
      percentile10: +getPercentile(allResults, 10).toFixed(2),
      percentile25: +getPercentile(allResults, 25).toFixed(2),
      percentile75: +getPercentile(allResults, 75).toFixed(2),
      percentile90: +getPercentile(allResults, 90).toFixed(2),
      percentile95: +getPercentile(allResults, 95).toFixed(2),
    },
    
    // إحصاءات Max Drawdown
    maxDrawdowns: {
      median: +allMaxDrawdowns[Math.floor(iterations / 2)].toFixed(2),
      worst: +allMaxDrawdowns[0].toFixed(2),
      percentile95: +allMaxDrawdowns[Math.floor(iterations * 0.05)].toFixed(2),
    },
    
    // إحصاءات Sharpe
    sharpes: {
      median: +allSharpes[Math.floor(iterations / 2)].toFixed(2),
      min: +allSharpes[0].toFixed(2),
      max: +allSharpes[allSharpes.length - 1].toFixed(2),
      percentile25: +getPercentile(allSharpes, 25).toFixed(2),
      percentile75: +getPercentile(allSharpes, 75).toFixed(2),
    },
    
    // إحصاءات القيمة النهائية
    finalValues: {
      median: +allFinalValues[Math.floor(iterations / 2)].toFixed(0),
      min: +allFinalValues[0].toFixed(0),
      max: +allFinalValues[allFinalValues.length - 1].toFixed(0),
    },
    
    // الاحتماليات
    probabilities: {
      profit: +probabilityOfProfit.toFixed(1),
      loss: +(100 - probabilityOfProfit).toFixed(1),
      doubleMoney: +((allFinalValues.filter(function(v: number) { 
        return v >= initialCapital * 2; 
      }).length / iterations) * 100).toFixed(1),
      halfMoney: +((allFinalValues.filter(function(v: number) { 
        return v <= initialCapital * 0.5; 
      }).length / iterations) * 100).toFixed(1),
    },
    
    // التوزيع (للرسم)
    distribution: distribution,
    
    // التقييم
    riskRating: riskRating,
    riskColor: riskColor,
    riskLabel: riskLabel,
    
    // الملخص
    interpretation: generateInterpretation(
  meanResult, 
  median,
      probabilityOfProfit, 
      getPercentile(allResults, 5),
      getPercentile(allResults, 95)
    ),
  };
}

/**
 * توليد تفسير ذكي للنتائج
 */
function generateInterpretation(mean: number, median: number, probProfit: number, worst5: number, best95: number): string[] {
  var points: string[] = [];

  // ① الاحتمالية العامة
  if (probProfit > 85) {
    points.push('🎯 احتمالية الربح عالية جداً (' + probProfit.toFixed(0) + '%)');
  } else if (probProfit > 70) {
    points.push('✅ احتمالية الربح جيدة (' + probProfit.toFixed(0) + '%)');
  } else if (probProfit > 55) {
    points.push('⚖️ احتمالية الربح متوسطة (' + probProfit.toFixed(0) + '%)');
  } else {
    points.push('⚠️ احتمالية الربح منخفضة (' + probProfit.toFixed(0) + '%)');
  }

  // ② السيناريو الأسوأ
  if (worst5 > 0) {
    points.push('🛡️ حتى في أسوأ 5% من الحالات، تحقق ربح');
  } else if (worst5 > -10) {
    points.push('💡 في أسوأ 5% من الحالات، الخسارة محدودة (' + worst5.toFixed(1) + '%)');
  } else {
    points.push('⚠️ في أسوأ 5% من الحالات، خسارة كبيرة (' + worst5.toFixed(1) + '%)');
  }

  // ③ السيناريو الأفضل
  if (best95 > 30) {
    points.push('🚀 في أفضل 5% من الحالات، أرباح استثنائية (' + best95.toFixed(1) + '%)');
  } else if (best95 > 15) {
    points.push('📈 في أفضل 5% من الحالات، أرباح ممتازة (' + best95.toFixed(1) + '%)');
  }

  // ④ الوسيط vs المتوسط (skewness)
  var skewness = mean - median;
  if (skewness > 2) {
    points.push('📊 التوزيع مائل إيجابياً -- أرباح كبيرة نادرة');
  } else if (skewness < -2) {
    points.push('📊 التوزيع مائل سلبياً -- خسائر كبيرة نادرة ممكنة');
  }

  return points;
}


/* ══════════════════════════════════════════════════════════
   📦 Data Generators -- محوّلات بيانات المصادر المختلفة
═══════════════════════════════════════════════════════════ */

/**
 * استراتيجية Buy & Hold محسّنة للمحفظة الحالية
 * تشتري الأسهم بأوزانها الحالية ثم تحتفظ
 */
export function createPortfolioBuyAndHoldStrategy(positions: any[]): any {
  var hasBought = false;

  return {
    name: 'محفظتي الحالية (Buy & Hold)',
    
    generateSignals: function(day: any, state: any, historicalData: any[], dayIndex: number): any[] {
      var signals: any[] = [];
      
      // في اليوم الأول فقط
      if (!hasBought && day.stocksData) {
        day.stocksData.forEach(function(stk: any) {
          var weight = stk.targetWeight || (1 / day.stocksData.length);
          var valueForStock = state.cash * weight * 0.95;
          
          if (valueForStock >= 1000) {
            signals.push({
              action: 'buy',
              sym: stk.sym,
              value: valueForStock,
              reason: 'Portfolio allocation (' + (weight * 100).toFixed(0) + '%)',
            });
          }
        });
        
        hasBought = true;
      }
      
      return signals;
    },
    
    reset: function() {
      hasBought = false;
    },
  };
}
export async function generateDataFromPortfolioReal(positions: any[], days: number = 252): Promise<any[]> {
  return generateRealDataFromPortfolio(positions, days);
}

export async function generateDataFromStockListReal(stocksList: any[], days: number = 252, maxStocks: number = 15): Promise<any[]> {
  return generateRealDataFromStockList(stocksList, days, maxStocks);
}

export async function generateDataFromMarketReal(allStocks: any[], days: number = 252): Promise<any[]> {
  if (!allStocks || allStocks.length === 0) {
    console.warn('[generateDataFromMarketReal] القائمة فارغة');
    return [];
  }
  
  // اختيار 30 سهم من قطاعات متنوعة
  const sectorMap: any = {};
  allStocks.forEach((stk: any) => {
    const sector = stk.sector || stk.sec || 'other';
    if (!sectorMap[sector]) sectorMap[sector] = [];
    sectorMap[sector].push(stk);
  });
  
  // 3 أسهم من كل قطاع، حد أقصى 30
  let selected: any[] = [];
  Object.keys(sectorMap).forEach((sector: string) => {
    selected = selected.concat(sectorMap[sector].slice(0, 3));
  });
  if (selected.length > 30) selected = selected.slice(0, 30);
  
  console.log(`[generateDataFromMarketReal] اختير ${selected.length} سهم من ${Object.keys(sectorMap).length} قطاع`);
  
  return generateRealDataFromStockList(selected, days, selected.length);
}

