'use client';
/**
 * @module tadawulStrategy
 * @description استراتيجية الطبقات التسع للتداول مع Adaptive Personality
 * 
 * المنهجية:
 * ① تحليل الطبقات التسع لكل سهم
 * ② كشف شخصيّة السهم (Adaptive)
 * ③ تكييف params لكل سهم حسب شخصيّته
 * ④ اختيار الأسهم ذات Health Score > threshold
 * ⑤ إدارة المخاطر المُكيَّفة
 * 
 * @author تداول+
 * @version 2.0 (Adaptive)
 */

import { detectStockPersonality } from './stockPersonality';

// ════════════════════════════════════════════════════════════
//  🆕 ADAPTIVE PARAMS MULTIPLIERS
// ════════════════════════════════════════════════════════════

/**
 * مُضاعفات تكييف الـ params حسب الشخصيّة
 * المرجع العلميّ:
 *  - LEADER:      Low-Vol anomaly (Blitz 2014)
 *  - VALUE:       Fama-French HML (1992)
 *  - DIVIDEND:    Income investing
 *  - TURNAROUND:  Earnings momentum (Bernard 1989)
 *  - SPECULATIVE: Lottery preferences (Kumar 2009)
 */
const PERSONALITY_ADJUSTMENTS = {
  LEADER: {
    buyThresholdDelta: +3,      // أكثر تحفّظاً
    stopLossMultiplier: 1.3,    // stop واسع
    takeProfitMultiplier: 0.7,  // أهداف معقولة
    maxHoldMultiplier: 1.5,     // صبر أطول
    label: '🏛 قيادي - استثمار طويل',
  },
  GROWTH: {
    buyThresholdDelta: 0,
    stopLossMultiplier: 1.0,
    takeProfitMultiplier: 1.2,
    maxHoldMultiplier: 1.0,
    label: '🚀 نموّ - متابعة momentum',
  },
  VALUE: {
    buyThresholdDelta: -3,      // أسهل دخولاً
    stopLossMultiplier: 1.5,    // stop واسع جداً
    takeProfitMultiplier: 0.8,
    maxHoldMultiplier: 2.0,     // صبر طويل جداً (mean-reversion)
    label: '💎 قيمة - mean-reversion',
  },
  DIVIDEND: {
    buyThresholdDelta: +2,
    stopLossMultiplier: 1.4,
    takeProfitMultiplier: 0.5,  // هدف صغير
    maxHoldMultiplier: 2.5,     // للتوزيعات
    label: '💰 موزّع - جمع التوزيعات',
  },
  TURNAROUND: {
    buyThresholdDelta: -2,
    stopLossMultiplier: 0.8,    // stop ضيّق
    takeProfitMultiplier: 1.5,  // طموح عالٍ
    maxHoldMultiplier: 1.2,
    label: '🔄 متحوّل - حذر مع طموح',
  },
  SPECULATIVE: {
    buyThresholdDelta: +5,      // انتقائيّة شديدة
    stopLossMultiplier: 0.7,    // stop ضيّق جداً
    takeProfitMultiplier: 1.5,  // أهداف كبيرة
    maxHoldMultiplier: 0.5,     // خروج سريع
    label: '⚡ مضاربي - دخول/خروج سريع',
  },
  AVOID: {
    buyThresholdDelta: 999,     // لا يشتري أبداً
    stopLossMultiplier: 1.0,
    takeProfitMultiplier: 1.0,
    maxHoldMultiplier: 1.0,
    label: '⛔ يُتجنّب',
  },
  NEUTRAL: {
    buyThresholdDelta: 0,
    stopLossMultiplier: 1.0,
    takeProfitMultiplier: 1.0,
    maxHoldMultiplier: 1.0,
    label: '➖ محايد - params افتراضيّة',
  },
};

/**
 * تكييف params حسب الشخصيّة
 */
function adaptParamsToPersonality(baseConfig: any, personality: string): any {
  const adj = (PERSONALITY_ADJUSTMENTS as any)[personality] || PERSONALITY_ADJUSTMENTS.NEUTRAL;
  
  return {
    buyScoreThreshold: baseConfig.buyScoreThreshold + adj.buyThresholdDelta,
    sellScoreThreshold: baseConfig.sellScoreThreshold,
    stopLossPct: baseConfig.stopLossPct * adj.stopLossMultiplier,
    takeProfitPct: baseConfig.takeProfitPct * adj.takeProfitMultiplier,
    maxHoldDays: Math.round(baseConfig.maxHoldDays * adj.maxHoldMultiplier),
    personality,
    personalityLabel: adj.label,
  };
}

export var STRATEGY_DEFAULTS = {
  // معايير الشراء - معايرة علمية متطابقة مع التحليل الاحترافي
  buyScoreThreshold: 72,
  maxPositions: 8,             // أقصى عدد مراكز
  maxPositionWeight: 0.20,     // أقصى وزن 20% لكل سهم
  minPositionValue: 5000,      // أقل قيمة صفقة 5,000 ر.س
  
  // معايير البيع - معايرة علمية
  sellScoreThreshold: 35,      // كان 45 -- يقتل 71% من الصفقات مبكراً بنجاح 10%
  stopLossPct: -0.10,          // وقف أوسع -- 18 صفقة تُلمس بـ7% بنجاح 0%
  takeProfitPct: 0.20,         // نسبة 2:1
  maxHoldDays: 180,            // أقصى فترة احتفاظ 180 يوم
  
  // Rebalancing
  rebalanceFreq: 30,           // إعادة توازن كل 30 يوم
  rebalanceThreshold: 0.05,    // انحراف > 5% يستدعي rebalance
  
  // Market Regime
  useRegimeFilter: true,       // تفعيل فلتر السوق
  bearMarketCash: 0.50,        // احتفاظ 50% كاش في السوق الهابط
  bullMarketInvest: 0.95,      // استثمار 95% في السوق الصاعد
};

/**
 * استراتيجية الطبقات التسع
 * 
 * @param {Object} healthFn - دالة stockHealth من analysisEngine
 * @param {Object} options - إعدادات اختيارية
 * @returns {Object} strategy object
 */
export function createTadawulStrategy(healthFn: any, options?: any, macroOverride?: any, weightsOverride?: any): any { 
  // 🆕 تطبيع المعاملات من Strategy Lab (إن جاءت بأسماء مختلفة)
  var normalizedOptions = options || {};
  if (options) {
    var mapped: any = {};
    
    // buyThreshold → buyScoreThreshold
    if (typeof options.buyThreshold === 'number') {
      mapped.buyScoreThreshold = options.buyThreshold;
    }
    if (typeof options.buyScoreThreshold === 'number') {
      mapped.buyScoreThreshold = options.buyScoreThreshold;
    }
    
    // sellThreshold → sellScoreThreshold
    if (typeof options.sellThreshold === 'number') {
      mapped.sellScoreThreshold = options.sellThreshold;
    }
    if (typeof options.sellScoreThreshold === 'number') {
      mapped.sellScoreThreshold = options.sellScoreThreshold;
    }
    
    // stopLossPct: Strategy تُمرّر موجباً (0.10) لكن config يحتاجها سالبة (-0.10)
    if (typeof options.stopLossPct === 'number') {
      var sl = options.stopLossPct;
      mapped.stopLossPct = sl > 0 ? -sl : sl;
    }
    
    // takeProfitPct
    if (typeof options.takeProfitPct === 'number') {
      mapped.takeProfitPct = options.takeProfitPct;
    }
    
    // maxHoldDays
    if (typeof options.maxHoldDays === 'number') {
      mapped.maxHoldDays = options.maxHoldDays;
    }
    
    // maxPositions
    if (typeof options.maxPositions === 'number') {
      mapped.maxPositions = options.maxPositions;
    }
    
    // maxPositionPct → maxPositionWeight (Strategy Lab uses maxPositionPct)
    if (typeof options.maxPositionPct === 'number') {
      mapped.maxPositionWeight = options.maxPositionPct;
    }
    if (typeof options.maxPositionWeight === 'number') {
      mapped.maxPositionWeight = options.maxPositionWeight;
    }
    
    // ندمج المُطابق مع options الأصلية
    normalizedOptions = Object.assign({}, options, mapped);
  }
  
  var config = Object.assign({}, STRATEGY_DEFAULTS, normalizedOptions);
  var lastRebalanceDay = 0;
  var marketRegime = 'bull'; // bull / bear / neutral
    // ✨ ذاكرة الدرجات -- للدخول على الميل الصاعد بدل المستوى المرتفع
  var scoreHistory = {};   // { sym: [أقدم ... أحدث] }
  var _macroOverride = macroOverride || null;
  // 🆕 weights override لـ Strategy Lab
  var _weightsOverride = weightsOverride || null;

  return {
    name: 'Tadawul Layers-9 Strategy',
    config: config,

    /**
     * توليد الإشارات ليوم معين
     */
    generateSignals: function(day: any, state: any, historicalData: any[], dayIndex: number): any[] {
      var signals: any[] = [];
      
      // ① تحديد Market Regime
      if (config.useRegimeFilter && dayIndex > 20) {
        marketRegime = detectMarketRegime(historicalData, dayIndex);
      }

      // ② فحص الأسهم المتاحة
      if (!day.stocksData || !Array.isArray(day.stocksData)) {
        return signals;
      }

      // ③ تقييم كل سهم متاح
      // 🆕 نُمرّر day.stocksData كـ allStocks + macroOverride للمحرّك الجديد
      // المحرّك القديم سيتجاهل المعاملين الإضافيين (backward compatible)
      var stockScores: any[] = [];
      var allStocksForToday = day.stocksData || [];
      day.stocksData.forEach(function(stk: any) {
        if (!stk.bars || stk.bars.length < 30) return;
        
                try {
          // 🆕 نُمرّر weightsOverride للمحرّك (Strategy Lab)
          var health = healthFn(stk, stk.bars, allStocksForToday, _macroOverride, _weightsOverride);
          // ✨ نكشف الشخصيّة مرة واحدة هنا بدل مرتين (بيع + شراء)
          var _pers = 'NEUTRAL';
          try { _pers = detectStockPersonality(stk, stk.bars).personality; } catch (e) {}
          // ✨ سجّل الدرجة في الذاكرة (آخر 6 أيام)
          var _sc = health.score || 0;
          if (!scoreHistory[stk.sym]) scoreHistory[stk.sym] = [];
          scoreHistory[stk.sym].push(_sc);
          if (scoreHistory[stk.sym].length > 6) scoreHistory[stk.sym].shift();
          var _hist = scoreHistory[stk.sym];
          var _slope = _hist.length >= 4 ? (_hist[_hist.length - 1] - _hist[_hist.length - 4]) : 0;

          stockScores.push({
            sym: stk.sym,
            stk: stk,
            score: health.score || 0,
            health: health,
            price: day.prices[stk.sym],
            personality: _pers,
          });
        } catch (err) {
          // تجاهل الأخطاء
        }
      });

      // ترتيب تنازلي حسب Score
      stockScores.sort(function(a: any, b: any) { return b.score - a.score; });

      // ④ إشارات البيع (قبل الشراء) - مع تكييف Adaptive
      Object.keys(state.positions).forEach(function(sym) {
        var pos = state.positions[sym];
        var currentPrice = day.prices[sym];
        if (!currentPrice) return;

        var currentScore = null;
        var currentPersonality: any = 'NEUTRAL';
        var stockData = stockScores.find(function(s: any) { return s.sym === sym; });
        if (stockData) {
          currentScore = stockData.score;
          currentPersonality = stockData.personality || 'NEUTRAL';
        }
        
        // 🆕 تكييف config حسب الشخصيّة
        var adaptedConfig = adaptParamsToPersonality(config, currentPersonality);

        var sellReason = shouldSell(pos, currentPrice, currentScore, day.date, dayIndex, adaptedConfig);
        
        if (sellReason) {
          signals.push({
            action: 'sell',
            sym: sym,
            shares: pos.shares,
            reason: sellReason,
            personality: currentPersonality,
          });
        }
      });

      // ⑤ تحديد حجم الاستثمار المسموح
      var portfolioValue = state.cash + calcPortfolioInvested(state, day.prices);
      var maxInvestment = portfolioValue;
      
      if (marketRegime === 'bear') {
        maxInvestment = portfolioValue * (1 - config.bearMarketCash);
      } else if (marketRegime === 'bull') {
        maxInvestment = portfolioValue * config.bullMarketInvest;
      }

      // ⑥ إشارات الشراء
      var currentPositionCount = Object.keys(state.positions).length;
      var slotsAvailable = config.maxPositions - currentPositionCount;
      
      if (slotsAvailable > 0 && state.cash > config.minPositionValue) {
        var topStocks = stockScores
          .filter(function(s) {
            // ✨ الشخصيّة محسوبة مسبقاً عند بناء stockScores
            var personality: any = s.personality || 'NEUTRAL';
            
            // 🆕 رفض AVOID تماماً
            if (personality === 'AVOID') return false;
            
            // 🆕 تكييف buyThreshold حسب الشخصيّة
            var adaptedConfig = adaptParamsToPersonality(config, personality);
            
            // شرط Health Score المُكيَّف
            if (s.score < adaptedConfig.buyScoreThreshold) return false;

            // ليس مملوكاً بالفعل
            if (state.positions[s.sym]) return false;
            // له سعر صالح
            if (!s.price || s.price <= 0) return false;
            return true;
          })
          .slice(0, slotsAvailable);

        // توزيع رأس المال على الأسهم المختارة
        if (topStocks.length > 0) {
          var targetWeight = Math.min(
            config.maxPositionWeight,
            1.0 / (currentPositionCount + topStocks.length)
          );
          
          topStocks.forEach(function(stock) {
            var targetValue = portfolioValue * targetWeight;
            var availableValue = Math.min(targetValue, state.cash * 0.9);
            
            if (availableValue >= config.minPositionValue) {
              // 🆕 إرفاق معلومات الشخصيّة بالـ signal
              var stockPersonality = stock.personality || 'NEUTRAL';
              var stockAdapted = adaptParamsToPersonality(config, stockPersonality);
              
              signals.push({
                action: 'buy',
                sym: stock.sym,
                value: availableValue,
                reason: 'Score=' + stock.score + '/' + stockAdapted.buyScoreThreshold + ' [' + stockPersonality + ']',
                layers: stock.health?.layers || null,
                personality: stockPersonality,
                adaptedParams: {
                  stopLoss: stockAdapted.stopLossPct,
                  takeProfit: stockAdapted.takeProfitPct,
                  maxHold: stockAdapted.maxHoldDays,
                },
              });
            }
          });
        }
      }

      return signals;
    },

    /**
     * إعادة تعيين (للاختبارات المتعددة)
     */
    reset: function() {
      lastRebalanceDay = 0;
      marketRegime = 'bull';
    },
  };
}

/**
 * قرار البيع
 */
function shouldSell(position: any, currentPrice: number, currentScore: number, currentDate: any, dayIndex: number, config: any): any {
  var costBasis = position.avgCost;
  var returnPct = (currentPrice - costBasis) / costBasis; 

  // ① Stop Loss
  if (returnPct <= config.stopLossPct) {
    return 'Stop Loss (' + (returnPct * 100).toFixed(1) + '%)';
  }

  // ② Take Profit
  if (returnPct >= config.takeProfitPct) {
    return 'Take Profit (+' + (returnPct * 100).toFixed(1) + '%)';
  }

  // ③ Health Score تدهور
  if (currentScore !== null && currentScore < config.sellScoreThreshold) {
    return 'Weak Score (' + currentScore + ')';
  }


  // ④ Max Hold Period -- نحسب من entryDate (المحفوظ فعلياً في backtestEngine)
  if (position.entryDate && currentDate) {
    var _d1 = new Date(position.entryDate).getTime();
    var _d2 = new Date(currentDate).getTime();
    if (!isNaN(_d1) && !isNaN(_d2)) {
      var holdDays = Math.floor((_d2 - _d1) / 86400000);
      if (holdDays > config.maxHoldDays) {
        return 'Max Hold (' + holdDays + ' days)';
      }
    }
  }

  return null; // لا تبع
}

/**
 * كشف حالة السوق (Bull/Bear/Neutral)
 */
function detectMarketRegime(historicalData: any[], dayIndex: number): any {
  var lookback = Math.min(20, dayIndex);
  var recentDays = historicalData.slice(dayIndex - lookback, dayIndex);
  
  if (recentDays.length < 5) return 'neutral';

  // حساب اتجاه السوق بناءً على متوسط الأسعار
  var startPrices: number[] = [];
var endPrices: number[] = [];
  
  if (recentDays[0].prices && recentDays[recentDays.length - 1].prices) {
    Object.keys(recentDays[0].prices).forEach(function(sym) {
      if (recentDays[recentDays.length - 1].prices[sym]) {
        startPrices.push(recentDays[0].prices[sym]);
        endPrices.push(recentDays[recentDays.length - 1].prices[sym]);
      }
    });
  }

  if (startPrices.length === 0) return 'neutral';

  var avgStart = startPrices.reduce(function(s, p) { return s + p; }, 0) / startPrices.length;
  var avgEnd = endPrices.reduce(function(s, p) { return s + p; }, 0) / endPrices.length;
  var change = (avgEnd - avgStart) / avgStart;

  if (change > 0.03) return 'bull';      // > 3% نمو = سوق صاعد
  if (change < -0.03) return 'bear';     // < -3% = سوق هابط
  return 'neutral';
}

/**
 * حساب قيمة الاستثمارات الحالية
 */
function calcPortfolioInvested(state: any, prices: any): number {
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
 * استراتيجية Buy & Hold (للمقارنة كـ Benchmark)
 */
export function createBuyAndHoldStrategy(stockSymbols: string[]): any {
  var hasBought = false;
  
  return {
    name: 'Buy & Hold (Benchmark)',
    
    generateSignals: function(day: any, state: any, historicalData: any[], dayIndex: number): any[] {
      var signals: any[] = [];
      
      // في اليوم الأول فقط: اشترِ الأسهم بالتساوي
      if (!hasBought && stockSymbols && stockSymbols.length > 0) {
        var availableStocks = stockSymbols.filter(function(sym: string) {
          return day.prices[sym] && day.prices[sym] > 0;
        });
        
        if (availableStocks.length > 0) {
          var valuePerStock = (state.cash * 0.95) / availableStocks.length;
          
          availableStocks.forEach(function(sym: string) {
            signals.push({
              action: 'buy',
              sym: sym,
              value: valuePerStock,
              reason: 'Initial allocation',
            });
          });
          
          hasBought = true;
        }
      }
      
      return signals;
    },
    
    reset: function() {
      hasBought = false;
    },
  };
}