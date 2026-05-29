'use client';

import React, { useState } from 'react';
import { stockHealth } from '../engines/analysisEngine';
import { 
  backtest, 
  monteCarloSimulation, 
  compareWithBenchmark,
  createPortfolioBuyAndHoldStrategy,
  generateDataFromPortfolioReal,
  generateDataFromStockListReal,
  generateDataFromMarketReal,
} from '../engines/backtestEngine';
import { generateDataFromYahoo } from '../services/api/yahooHistoricalApi';
import { createTadawulStrategy, createBuyAndHoldStrategy } from '../engines/tadawulStrategy';
import EquityCurveChart from '../components/charts/EquityCurveChart';
import BacktestResultsCard from '../components/charts/BacktestResultsCard';
import MonteCarloChart from '../components/charts/MonteCarloChart';
import { STOCKS_LIVE as STOCKS, STOCK_CATEGORIES, getStocksByCategory } from '../constants/stocksData';
import { useNav } from '../store';
import Tooltip from '../components/Tooltip';
import { useHaptic } from '../hooks/useHaptic';

var C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
  plasma: "#a78bfa",
};

function ModeCard(props) {
  return (
    <div
      onClick={() => { if(props.onClick) props.onClick(); }}
      style={{
        padding: "14px 12px",
        background: props.active 
          ? "linear-gradient(135deg," + props.color + "18," + props.color + "08)" 
          : C.void + "88",
        border: "1.5px solid " + (props.active ? props.color : C.line + "44"),
        borderRadius: 12,
        cursor: "pointer",
        marginBottom: 8,
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: props.active ? props.color : C.snow, marginBottom: 3 }}>
            {props.icon} {props.title}
          </div>
          <div style={{ fontSize: 10, color: C.smoke, lineHeight: 1.5 }}>
            {props.description}
          </div>
        </div>
        {props.active && (
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: props.color, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: C.ink, fontSize: 12, fontWeight: 900,
          }}>✓</div>
        )}
      </div>
      <div style={{
        padding: "6px 8px",
        background: props.active ? props.color + "15" : C.void,
        borderRadius: 6,
        borderLeft: "2px solid " + (props.active ? props.color : C.line),
      }}>
        <div style={{ fontSize: 9, color: props.active ? props.color : C.ash, fontWeight: 700, marginBottom: 2 }}>
          💡 السؤال المُجاب
        </div>
        <div style={{ fontSize: 10, color: C.mist, fontStyle: "italic" }}>
          "{props.question}"
        </div>
      </div>
    </div>
  );
}

export default function BacktestScreen() {
  var nav = useNav();
  var haptic = useHaptic();
  var positions = [];
  
  var [config, setConfig] = useState({
    mode: 'analysis',
    category: 'leaders',
    initialCapital: 100000,
    days: 252,
    includeCosts: true,
    runMonteCarlo: true,
    monteCarloIterations: 5000,
  });

  var [isRunning, setIsRunning] = useState(false);
  var [results, setResults] = useState(null);

  var hasPortfolio = positions && positions.length > 0;

  async function runBacktest() {
    setIsRunning(true);
    setResults(null);

    try {
      var historicalData;
      var strategy;
      var benchmarkStrategy;
      var modeLabel;

      if (config.mode === 'portfolio') {
        if (!hasPortfolio) {
          setResults({ error: 'المحفظة فارغة! أضف أسهماً أولاً.' });
          setIsRunning(false);
          return;
        }
        modeLabel = 'محفظتي الحالية';
        historicalData = await generateDataFromPortfolioReal(positions, config.days);
        
        if (!historicalData || historicalData.length === 0 || !historicalData[0] || !historicalData[0].stocksData) {
          setResults({ error: 'فشل جلب بيانات المحفظة التاريخية' });
          setIsRunning(false);
          return;
        }
        
        strategy = createPortfolioBuyAndHoldStrategy(positions);
        var equalWeight = positions.map(function(p) {
          return Object.assign({}, p, { weight: 1 / positions.length });
        });
        benchmarkStrategy = createPortfolioBuyAndHoldStrategy(equalWeight);
      } else if (config.mode === 'analysis') {
        var category = STOCK_CATEGORIES[config.category];
        var categoryStocks = getStocksByCategory(config.category);
        modeLabel = `${category.icon} ${category.name} (${categoryStocks.length} سهم)`;
        
        if (categoryStocks.length === 0) {
          setResults({ error: 'لا توجد أسهم في هذه الفئة' });
          setIsRunning(false);
          return;
        }
        
        var enrichedStocks = categoryStocks.map(s => {
          var live = STOCKS.find(x => x.sym === s.sym);
          return live ? { ...s, ...live } : s;
        }).filter(s => s.p > 0);
        
        historicalData = await generateDataFromStockListReal(enrichedStocks, config.days, 15);
        
        // 🔬 تشخيص: كم يوماً وصل فعلاً؟
        var requestedDays = config.days;
        var actualDays = historicalData ? historicalData.length : 0;
        var coverage = requestedDays > 0 ? ((actualDays / requestedDays) * 100).toFixed(1) : '0';
        var firstStock = (historicalData && historicalData[0] && historicalData[0].stocksData && historicalData[0].stocksData[0]) || null;
        var barsCount = (firstStock && firstStock.bars) ? firstStock.bars.length : 0;
        var firstDate = (historicalData && historicalData[0]) ? historicalData[0].date : 'لا يوجد';
        var lastDate = (historicalData && historicalData[historicalData.length-1]) ? historicalData[historicalData.length-1].date : 'لا يوجد';
        
        alert(
          '🔬 تشخيص sahmk:\n\n' +
          'الفترة المطلوبة: ' + requestedDays + ' يوم\n' +
          'الفترة المُسترجَعة: ' + actualDays + ' يوم\n' +
          'التغطية: ' + coverage + '%\n\n' +
          'أول تاريخ: ' + firstDate + '\n' +
          'آخر تاريخ: ' + lastDate + '\n\n' +
          'عدد الأسهم: ' + (firstStock ? (historicalData[0].stocksData||[]).length : 0) + '\n' +
          'bars في أول سهم: ' + barsCount
        ); 

        if (!historicalData || historicalData.length === 0 || !historicalData[0] || !historicalData[0].stocksData || historicalData[0].stocksData.length === 0) {
          var debugInfo = 'تشخيص:\n' +
            'الفئة: ' + config.category + '\n' +
            'أسهم الفئة: ' + categoryStocks.length + '\n' +
            'STOCKS_LIVE المحمّلة: ' + STOCKS.length + '\n' +
            'أسهم بعد التصفية (p>0): ' + enrichedStocks.length + '\n' +
            'historicalData ?: ' + (historicalData ? historicalData.length : 'null') + '\n' +
            'أول يوم: ' + (historicalData && historicalData[0] ? JSON.stringify(historicalData[0]).slice(0,200) : 'لا يوجد');
          alert(debugInfo);
          setResults({ error: 'لا توجد بيانات تاريخية كافية - تحقق من اتصال API' });
          setIsRunning(false);
          return;
        }
        
        strategy = createTadawulStrategy(stockHealth);
        var benchSymbols = historicalData[0].stocksData.slice(0, 5).map(function(s) { return s.sym; });
        benchmarkStrategy = createBuyAndHoldStrategy(benchSymbols);
      }
      else if (config.mode === 'market') {
        modeLabel = 'السوق بالكامل (Sector Rotation)';
        historicalData = await generateDataFromMarketReal(STOCKS, config.days);
        
        if (!historicalData || historicalData.length === 0 || !historicalData[0] || !historicalData[0].stocksData || historicalData[0].stocksData.length === 0) {
          setResults({ error: 'فشل توليد بيانات السوق' });
          setIsRunning(false);
          return;
        }
        
        strategy = createTadawulStrategy(stockHealth, { maxPositions: 10, maxPositionWeight: 0.15 });
        var marketBenchSymbols = historicalData[0].stocksData.slice(0, 10).map(function(s) { return s.sym; });
        benchmarkStrategy = createBuyAndHoldStrategy(marketBenchSymbols);
      }

      var strategyResult, benchmarkResult;
      var comparison = null;
      var monteCarloResult = null;
      
      try {
        strategyResult = backtest(strategy, historicalData, {
          initialCapital: config.initialCapital,
          includeCosts: config.includeCosts,
        });

        benchmarkResult = backtest(benchmarkStrategy, historicalData, {
          initialCapital: config.initialCapital,
          includeCosts: config.includeCosts,
        });

        if (strategyResult.success && benchmarkResult.success) {
          comparison = compareWithBenchmark(strategyResult, benchmarkResult);
        }

        if (config.runMonteCarlo && strategyResult.success) {
          monteCarloResult = monteCarloSimulation(strategyResult, config.monteCarloIterations);
        }
      } catch (innerErr) {
        console.error('[Backtest engine error]', innerErr);
        setResults({ error: 'فشل تشغيل المحاكاة: بيانات غير كافية أو تنسيق غير متوافق' });
        setIsRunning(false);
        return;
      }

      setResults({
        strategy: strategyResult,
        benchmark: benchmarkResult,
        comparison: comparison,
        monteCarlo: monteCarloResult,
        modeLabel: modeLabel,
      });
    } catch (err) {
      console.error('Backtest error:', err);
      setResults({ error: err.message || 'حدث خطأ أثناء التشغيل' });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div style={{
      background: C.ink,
      minHeight: "100vh",
      padding: "16px 12px 100px",
      fontFamily: "Cairo,sans-serif",
      direction: "rtl",
    }}>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
      }}>
        <button
          onClick={function() { haptic.tap(); nav.setTab('more'); }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid " + C.line,
            background: C.layer1,
            color: C.snow,
            fontSize: 18,
            fontWeight: 900,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          →
        </button>
        <div style={{ fontSize: 15, fontWeight: 900, color: C.snow }}>
          مختبر الاستراتيجيات
        </div>
      </div>

      <div style={{
        background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
        borderRadius: 14,
        border: "1px solid " + C.gold + "33",
        padding: "14px 12px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 800, letterSpacing: "1px", marginBottom: 4 }}>
          🧪 محرك Backtesting
        </div>
        <div style={{ fontSize: 15, color: C.snow, fontWeight: 900, marginBottom: 4 }}>
          اختبار الاستراتيجية التاريخية
        </div>
        <div style={{ fontSize: 10, color: C.smoke, lineHeight: 1.6 }}>
          اختبر 3 استراتيجيات مختلفة على بيانات تاريخية
        </div>
      </div>

      <div style={{
        background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
        borderRadius: 14,
        border: "1px solid " + C.line + "44",
        padding: "14px 12px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 800, letterSpacing: "1px", marginBottom: 10 }}>
          🎯 اختر وضع Backtest
        </div>

        <ModeCard
          icon="💼"
          title="محفظتي الحالية"
          description={hasPortfolio ? "اختبار محفظتك الفعلية (" + positions.length + " أسهم)" : "⚠️ المحفظة فارغة -- أضف أسهماً أولاً"}
          question="كيف كانت محفظتي ستؤدي تاريخياً؟"
          color={C.mint}
          active={config.mode === 'portfolio'}
          onClick={function() { 
            haptic.tap();
            if (hasPortfolio) setConfig(Object.assign({}, config, { mode: 'portfolio' }));  
          }}
        />

        <ModeCard
          icon="🔍"
          title="قائمة التحليل"
          description="استراتيجية الطبقات التسع - اختر فئة الأسهم"
          question="هل الطبقات التسع دقيقة فعلاً؟"
          color={C.gold}
          active={config.mode === 'analysis'}
          onClick={function() { haptic.tap(); setConfig(Object.assign({}, config, { mode: 'analysis' })); }}
        />
        
        {config.mode === 'analysis' && (
          <div style={{
            marginBottom: 10,
            padding: '10px 12px',
            background: C.void + "55",
            borderRadius: 10,
            border: "1px solid " + C.gold + "33",
          }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, marginBottom: 8, letterSpacing: "0.5px" }}>
              🎯 اختر فئة الأسهم
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {Object.values(STOCK_CATEGORIES).map(function(cat) {
                var count = getStocksByCategory(cat.id).length;
                var isActive = config.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={function() {
                      haptic.tap();
                      setConfig(Object.assign({}, config, { category: cat.id }));
                    }}
                    style={{
                      padding: "8px 6px",
                      background: isActive ? cat.color + "22" : C.void,
                      border: "1.5px solid " + (isActive ? cat.color : C.line + "44"),
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "right",
                      fontFamily: "Cairo, sans-serif",
                    }}
                  >
                    <div style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: isActive ? cat.color : C.snow,
                      marginBottom: 2,
                    }}>
                      {cat.icon} {cat.name}
                    </div>
                    <div style={{
                      fontSize: 8,
                      color: C.smoke,
                      fontWeight: 500,
                    }}>
                      {count} سهم • {cat.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ModeCard
          icon="🌐"
          title="السوق بالكامل"
          description="Tadawul + Sector Rotation على 30 سهم من كل القطاعات"
          question="هل النظام يكتشف أفضل الفرص في السوق؟"
          color={C.teal}
          active={config.mode === 'market'}
          onClick={function() { haptic.tap(); setConfig(Object.assign({}, config, { mode: 'market' })); }}
        />
      </div>

      <div style={{
        background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
        borderRadius: 14,
        border: "1px solid " + C.line + "44",
        padding: "14px 12px",
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 11, color: C.plasma, fontWeight: 800, letterSpacing: "1px", marginBottom: 10 }}>
          ⚙️ الإعدادات
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>💰 رأس المال</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[50000, 100000, 250000, 500000].map(function(amt) {
              return (
                <button
                  key={amt}
                  onClick={function() { setConfig(Object.assign({}, config, { initialCapital: amt })); }}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background: config.initialCapital === amt ? C.gold + "22" : C.void,
                    border: "1px solid " + (config.initialCapital === amt ? C.gold : C.line) + "44",
                    borderRadius: 6,
                    color: config.initialCapital === amt ? C.gold : C.smoke,
                    fontSize: 10, fontWeight: 800, cursor: "pointer",
                    fontFamily: "IBM Plex Mono,monospace",
                  }}
                >
                  {amt >= 1000 ? (amt / 1000) + 'K' : amt}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>📅 الفترة</div>
          <div style={{ display: "flex", gap: 6 }}>
                        {[
              { days: 60, label: '٣ أشهر' },
              { days: 252, label: 'سنة' },
              { days: 504, label: 'سنتان 🆕' },
              { days: 1260, label: '٥ سنوات 🆕' },
              { days: 2520, label: '١٠ سنوات 🆕' },
            ].map(function(opt) {
              return (
                <button
                  key={opt.days}
                  onClick={function() { setConfig(Object.assign({}, config, { days: opt.days })); }}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background: config.days === opt.days ? C.teal + "22" : C.void,
                    border: "1px solid " + (config.days === opt.days ? C.teal : C.line) + "44",
                    borderRadius: 6,
                    color: config.days === opt.days ? C.teal : C.smoke,
                    fontSize: 10, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", background: C.void, borderRadius: 6, cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={config.includeCosts}
              onChange={function(e) { setConfig(Object.assign({}, config, { includeCosts: e.target.checked })); }}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 11, color: C.mist, fontWeight: 700 }}>
              💸 تطبيق عمولات التداول (0.155%)
            </span>
          </label>

          <label style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", background: C.void, borderRadius: 6, cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={config.runMonteCarlo}
              onChange={function(e) { setConfig(Object.assign({}, config, { runMonteCarlo: e.target.checked })); }}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 11, color: C.mist, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
              🎰 Monte Carlo ({config.monteCarloIterations.toLocaleString()} محاكاة)
              <Tooltip termKey="Monte Carlo" size="small"/>
            </span>
          </label>
        </div>

        <button
          onClick={() => { haptic.strong(); runBacktest(); }}
          disabled={isRunning || (config.mode === 'portfolio' && !hasPortfolio)}
          style={{
            width: "100%", padding: "12px",
            background: isRunning || (config.mode === 'portfolio' && !hasPortfolio)
              ? C.line 
              : "linear-gradient(135deg," + C.gold + "," + C.goldL + ")",
            border: "none", borderRadius: 10,
            color: isRunning || (config.mode === 'portfolio' && !hasPortfolio) ? C.smoke : C.ink,
            fontSize: 13, fontWeight: 900,
            cursor: isRunning ? "not-allowed" : "pointer",
            boxShadow: isRunning ? "none" : "0 4px 12px " + C.gold + "33",
          }}
        >
          {isRunning ? "⏳ جاري التشغيل..." : "🚀 تشغيل Backtest"}
        </button>
      </div>

      {isRunning && (
        <div style={{
          background: C.layer1, borderRadius: 12, padding: 40,
          textAlign: "center", marginBottom: 12,
        }}>
          <div style={{ fontSize: 14, color: C.gold, marginBottom: 10 }}>
            🧪 جاري تشغيل المحاكاة...
          </div>
          <div style={{ fontSize: 10, color: C.smoke }}>
            يُحلّل {config.days} يوم تداول
            {config.runMonteCarlo && ' · ' + config.monteCarloIterations.toLocaleString() + ' سيناريو'}
          </div>
        </div>
      )}

      {results && results.error && (
        <div style={{
          background: C.coral + "15",
          border: "1px solid " + C.coral + "33",
          borderRadius: 12, padding: 20, textAlign: "center",
          color: C.coral, fontSize: 12, marginBottom: 12,
        }}>
          ⚠️ {results.error}
        </div>
      )}

      {results && !results.error && results.strategy && results.strategy.success && (
        <>
          <div style={{
            background: C.gold + "12",
            border: "1px solid " + C.gold + "33",
            borderRadius: 10, padding: "8px 12px",
            marginBottom: 12, textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, letterSpacing: "1px", marginBottom: 2 }}>
              🎯 نتائج Backtest
            </div>
            <div style={{ fontSize: 12, color: C.snow, fontWeight: 900 }}>
              {results.modeLabel}
            </div>
          </div>

          <EquityCurveChart
            equityCurve={results.strategy.equityCurve}
            benchmarkCurve={results.benchmark && results.benchmark.success 
              ? results.benchmark.equityCurve.map(function(e) { return { date: e.date, value: e.value }; })
              : []}
            initialCapital={config.initialCapital}
            trades={results.strategy.trades}
            showTrades={false}
          />

          <BacktestResultsCard
            result={results.strategy}
            benchmarkResult={results.benchmark}
            comparison={results.comparison}
          />

          {results.monteCarlo && results.monteCarlo.success && (
            <MonteCarloChart data={results.monteCarlo} />
          )}
        </>
      )}

      {!isRunning && !results && (
        <div style={{
          padding: "14px 12px",
          background: C.void + "88",
          borderRadius: 10,
          border: "1px solid " + C.line + "22",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 11, color: C.smoke, lineHeight: 1.6 }}>
            💡 اختر وضعاً ثم اضغط "تشغيل Backtest"
          </div>
        </div>
      )}
    </div>
  );
}
