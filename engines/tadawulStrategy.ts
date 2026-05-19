'use client';
/**
 * @module tadawulStrategy
 * @description استراتيجية الطبقات التسع للتداول
 * 
 * المنهجية:
 * ① تحليل الطبقات التسع لكل سهم
 * ② اختيار الأسهم ذات Health Score > 70
 * ③ إدارة المخاطر (Stop Loss, Take Profit)
 * ④ Rebalancing دوري
 * ⑤ تنويع تلقائي (max 20% per stock)
 * 
 * @author تداول+
 * @version 1.0
 */

/**
 * إعدادات الاستراتيجية
 */
export var STRATEGY_DEFAULTS = {
  // معايير الشراء - معايرة علمية متطابقة مع التحليل الاحترافي
  buyScoreThreshold: 65,       // Health Score >= 65 للشراء (كان 70)
  maxPositions: 8,             // أقصى عدد مراكز
  maxPositionWeight: 0.20,     // أقصى وزن 20% لكل سهم
  minPositionValue: 5000,      // أقل قيمة صفقة 5,000 ر.س
  
  // معايير البيع - معايرة علمية
  sellScoreThreshold: 45,      // Health Score < 45 للبيع (كان 40)
  stopLossPct: -0.10,          // وقف خسارة -10%
  takeProfitPct: 0.25,         // جني أرباح +25%
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
export function createTadawulStrategy(healthFn: any, options?: any): any { 
  var config = Object.assign({}, STRATEGY_DEFAULTS, options || {});
  var lastRebalanceDay = 0;
  var marketRegime = 'bull'; // bull / bear / neutral

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
      var stockScores: any[] = [];
      day.stocksData.forEach(function(stk: any) {
        if (!stk.bars || stk.bars.length < 30) return;
        
        try {
          var health = healthFn(stk, stk.bars);
          stockScores.push({
            sym: stk.sym,
            stk: stk,
            score: health.score || 0,
            health: health,
            price: day.prices[stk.sym],
          });
        } catch (err) {
          // تجاهل الأخطاء
        }
      });

      // ترتيب تنازلي حسب Score
      stockScores.sort(function(a: any, b: any) { return b.score - a.score; });

      // ④ إشارات البيع (قبل الشراء)
      Object.keys(state.positions).forEach(function(sym) {
        var pos = state.positions[sym];
        var currentPrice = day.prices[sym];
        if (!currentPrice) return;

        var currentScore = null;
        var stockData = stockScores.find(function(s: any) { return s.sym === sym; });
        if (stockData) currentScore = stockData.score;

        var sellReason = shouldSell(pos, currentPrice, currentScore, day.date, dayIndex, config);
        
        if (sellReason) {
          signals.push({
            action: 'sell',
            sym: sym,
            shares: pos.shares,
            reason: sellReason,
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
            // شرط Health Score
            if (s.score < config.buyScoreThreshold) return false;
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
              signals.push({
                action: 'buy',
                sym: stock.sym,
                value: availableValue,
                reason: 'Score=' + stock.score + '/' + config.buyScoreThreshold,
                layers: stock.health?.layers || null,  // ✨ AI Learning: pass actual layers
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

  // ④ Max Hold Period
  if (position.entryDay !== undefined) {
    var holdDays = dayIndex - position.entryDay;
    if (holdDays > config.maxHoldDays) {
      return 'Max Hold (' + holdDays + ' days)';
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