'use client';

import React, { useState } from 'react';
import { stockHealth as backtestStockHealth } from '../engines/backtestAnalysisEngine';
import { 
  backtest, 
  monteCarloSimulation, 
  compareWithBenchmark,
  createPortfolioBuyAndHoldStrategy,
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
import StrategyLabTab from '../utils/StrategyLabTab';
import { evaluateAndApplyWinner, loadCurrentWinner } from '../engines/winnerManager';
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
  
  var [config, setConfig] = useState({
    mode: 'analysis',
    category: 'diverse',  // 🆕 الافتراضيّ: السوق المتنوّع ٥٠ سهم
    initialCapital: 100000,
    days: 252,
    includeCosts: true,
    runMonteCarlo: true,
    monteCarloIterations: 5000,
    useWinner: true,  // 🆕 استعمال Winner المُطبَّق
    seed: 20260101,   // ✨ بذرة اختيار الأسهم -- نفس البذرة = نفس العالم (قابلية التكرار)
  });

  var [isRunning, setIsRunning] = useState(false);
  var [results, setResults] = useState(null);
  
  // 🆕 Strategy Lab state
  var [activeTab, setActiveTab] = useState('run'); // 'run' | 'lab'
  var [labHistoricalData, setLabHistoricalData] = useState(null);
  var [labDataInfo, setLabDataInfo] = useState(null);
  // ✨ FRED تُجلب مرة واحدة وتُخزَّن (كانت تُجلب لكل استراتيجية في المختبر)
  var labFredRef = React.useRef(null);

  async function runBacktest() {
    setIsRunning(true);
    setResults(null);
    // ✨ نُحرّر بيانات التشغيل السابق قبل بناء الجديدة -- تراكمها يستنفد ذاكرة الجوال
    setLabHistoricalData(null);
    setLabDataInfo(null);

    try {
      var historicalData;
      var strategy;
      var benchmarkStrategy;
      var modeLabel;
      
      // 🆕 جلب FRED Macro لاستعماله طوال الباك-تيست
      // (نفط حقيقي + VIX + معدل الفائدة)
      var fredMacro = null;
      try {
        var fredRes = await fetch('/api/freddata');
        if (fredRes.ok) {
          var fredData = await fredRes.json();
          if (fredData && (typeof fredData.oilPrice === 'number' || typeof fredData.vix === 'number')) {
            fredMacro = fredData;
          }
        }
      } catch(fredErr) {
        // FRED غير متاح - نتابع بقيم MACRO الافتراضية
      }
      // 🆕 قراءة Winner المُطبَّق (إن وُجد وكان الخيار مُفعَّلاً)
      var activeWinnerWeights = null;
      var activeWinnerParams = null;
      
      
      if (config.useWinner) {
        try {
          var currentWinner = loadCurrentWinner();
          if (currentWinner && currentWinner.weights) {
            activeWinnerWeights = currentWinner.weights;
            activeWinnerParams = currentWinner.params || null;

          } else {
            console.warn('[Winner] exists but missing weights');
          }
        } catch(e) {
          console.error('[Winner] Failed to load:', e.message);
        }
      }  

      if (config.mode === 'analysis') {
        var category = STOCK_CATEGORIES[config.category];
        var categoryStocks = getStocksByCategory(config.category, config.seed);
        modeLabel = `${category.icon} ${category.name} (${categoryStocks.length} سهم)`;
        
        if (categoryStocks.length === 0) {
          setResults({ error: 'لا توجد أسهم في هذه الفئة' });
          setIsRunning(false);
          return;
        }
        
        // ✨ نُثري بالأساسيات الحقيقية من sahmk قبل تمريرها للباك-تيست
        var _fundMap = {};
        try {
          var _fm = await import('../constants/stocksData');
          _fundMap = _fm.STOCKS_MAP || {};
        } catch (e) {}
        // ✨ نضمن اكتمال الأساسيات لأسهم هذا الباك-تيست قبل البدء
        try {
          var _ff = await import('../services/api/sahmkFundamentalsApi');
          // await _ff.loadFundamentalsIntoStocks(_fundMap, categoryStocks.map(function(s){ return s.sym; }));

        } catch (e) { console.warn('[Fundamentals]', e.message); }

        var enrichedStocks = categoryStocks.map(s => {
          var live = STOCKS.find(x => x.sym === s.sym);
          var fund = _fundMap[s.sym] || {};
          return { ...s, ...(live || {}), 
                   pe: fund.pe, pb: fund.pb, eps: fund.eps, bookValue: fund.bookValue,
                   roe: fund.roe, debt: fund.debt, epsGrw: fund.epsGrw, revGrw: fund.revGrw,
                   mktCap: fund.mktCap, sector_beta: fund.sector_beta,
                   w52h: fund.w52h, w52l: fund.w52l, target: fund.target };
        });
        
        // 🆕 ٥٠ سهم للـ Diverse Universe، ١٥ للفئات الأخرى
        // ✨ نقلّل عدد الأسهم للفترات الطويلة -- 50 سهماً × 1260 يوماً يستنفد ذاكرة الجوال
        var sampleSize = config.category === 'diverse'
          ? (config.days >= 1260 ? 10 : config.days >= 504 ? 25 : 50)
          : 15;
        historicalData = await generateDataFromYahoo(enrichedStocks.slice(0, sampleSize), config.days);
        
        if (!historicalData || historicalData.length === 0 || !historicalData[0] || !historicalData[0].stocksData || historicalData[0].stocksData.length === 0) {
          setResults({ error: 'فشل جلب البيانات التاريخية من Yahoo' });
          setIsRunning(false);
          return;
        }
        
        // 🆕 المحرّك الجديد المخصّص للباك-تيست
        // wrapper يُمرّر allStocks + macroOverride لـ stockHealth
        var backtestHealthWrapper = function(stk, bars, allStocks, macro) {
          return backtestStockHealth(stk, bars, allStocks, macro);
        };
        
        // 🆕 نُمرّر fredMacro للاستراتيجية لتُمرّره للمحرّك
        strategy = createTadawulStrategy(backtestHealthWrapper, activeWinnerParams, fredMacro, activeWinnerWeights);
        var benchSymbols = historicalData[0].stocksData.slice(0, 5).map(function(s) { return s.sym; });
        benchmarkStrategy = createBuyAndHoldStrategy(benchSymbols);
      }
      else if (config.mode === 'market') {
        modeLabel = 'السوق بالكامل (Sector Rotation)';
        
        // اختيار 30 سهم من قطاعات متنوّعة
        var sectorMap = {};
        STOCKS.forEach(function(stk) {
          var sector = stk.sector || stk.sec || 'other';
          if (!sectorMap[sector]) sectorMap[sector] = [];
          sectorMap[sector].push(stk);
        });
        var selected = [];
        Object.keys(sectorMap).forEach(function(sec) {
          selected = selected.concat(sectorMap[sec].slice(0, 3));
        });
        if (selected.length > 30) selected = selected.slice(0, 30);
        
        // Yahoo Finance دائماً
        historicalData = await generateDataFromYahoo(selected, config.days);
        
        if (!historicalData || historicalData.length === 0 || !historicalData[0] || !historicalData[0].stocksData || historicalData[0].stocksData.length === 0) {
          setResults({ error: 'فشل توليد بيانات السوق' });
          setIsRunning(false);
          return;
        }
        
        var marketOptions = activeWinnerParams 
          ? Object.assign({}, activeWinnerParams, { maxPositions: 10, maxPositionWeight: 0.15 })
          : { maxPositions: 10, maxPositionWeight: 0.15 };
        strategy = createTadawulStrategy(function(stk, bars, allStocks, macro) {
          return backtestStockHealth(stk, bars, allStocks, macro);
        }, marketOptions, fredMacro, activeWinnerWeights);
        
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
      
      // 🆕 حفظ البيانات لاستعمالها في Strategy Lab
      if (historicalData && historicalData.length > 0) {
        setLabHistoricalData(historicalData);
        setLabDataInfo({
          years: +(config.days / 252).toFixed(1),
          days: historicalData.length,
        });
      }
    } catch (err) {
      console.error('Backtest error:', err);
      setResults({ error: err.message || 'حدث خطأ أثناء التشغيل' });
    } finally {
      setIsRunning(false);
    }
  }
  
  // ════════════════════════════════════════════════════════════
  // 🆕 runBacktestForLab - دالة باك-تيست خاصّة بـ Strategy Lab
  // تأخذ Strategy + Data وتُرجع BacktestMetrics
  // ════════════════════════════════════════════════════════════
  async function runBacktestForLab(strategy, historicalData) {
    try {
      // جلب FRED Macro
      var fredMacro = labFredRef.current;
      if (fredMacro === null) {
        try {
          var fredRes = await fetch('/api/freddata');
          if (fredRes.ok) {
            var fredData = await fredRes.json();
            if (fredData && (typeof fredData.oilPrice === 'number' || typeof fredData.vix === 'number')) {
              fredMacro = fredData;
            }
          }
        } catch(e) {}
        labFredRef.current = fredMacro || false;
      }
      if (fredMacro === false) fredMacro = null;
      
      // wrapper للمحرّك
      var wrapper = function(stk, bars, allStocks, macro, weightsOv) {
        return backtestStockHealth(stk, bars, allStocks, macro, weightsOv);
      };
      
      // خريطة المعاملات من Strategy
      var options = {
        buyThreshold: strategy.params.buyThreshold,
        sellThreshold: strategy.params.sellThreshold,
        stopLossPct: strategy.params.stopLossPct,
        takeProfitPct: strategy.params.takeProfitPct,
        maxHoldDays: strategy.params.maxHoldDays,
        maxPositions: strategy.params.maxPositions,
        maxPositionPct: strategy.params.maxPositionPct,
      };
      
      // أوزان Strategy
      var weightsOverride = strategy.weights;
      
      // إنشاء استراتيجية مع المعاملات + الأوزان
      var labStrategy = createTadawulStrategy(wrapper, options, fredMacro, weightsOverride);
      
      // تشغيل الباك-تيست
      var result = backtest(labStrategy, historicalData, {
        initialCapital: 100000,
        includeCosts: true,
      });
      
      if (!result || !result.success) return null;
      
      // benchmark (للـ Alpha)
      var benchSymbols = historicalData[0].stocksData.slice(0, 5).map(function(s) { return s.sym; });
      var benchmark = backtest(
        createBuyAndHoldStrategy(benchSymbols),
        historicalData,
        { initialCapital: 100000, includeCosts: true }
      );
      
      var comparison = null;
      if (result.success && benchmark.success) {
        comparison = compareWithBenchmark(result, benchmark);
      }
      
      // إرجاع BacktestMetrics (نقرأ من result.performance -- البنية الصحيحة)
      var p = result.performance || {};
      return {
        annualReturn: typeof p.annualReturn === 'number' ? p.annualReturn : 0,
        totalReturn: typeof p.totalReturn === 'number' ? p.totalReturn : 0,
        sharpe: typeof p.sharpe === 'number' ? p.sharpe : 0,
        sortino: typeof p.sortino === 'number' ? p.sortino : 0,
        maxDrawdown: typeof p.maxDrawdown === 'number' ? p.maxDrawdown : 0,
        winRate: typeof p.winRate === 'number' ? p.winRate : 0,
        totalTrades: typeof p.totalTrades === 'number' ? p.totalTrades : (result.tradeCount || 0),
        closedTrades: typeof p.closedTrades === 'number' ? p.closedTrades : (p.winningTrades || 0) + (p.losingTrades || 0),
        winningTrades: typeof p.winningTrades === 'number' ? p.winningTrades : 0,
        losingTrades: typeof p.losingTrades === 'number' ? p.losingTrades : 0,
        avgWin: typeof p.avgWin === 'number' ? p.avgWin : 0,
        avgLoss: typeof p.avgLoss === 'number' ? p.avgLoss : 0,
        profitFactor: typeof p.profitFactor === 'number' ? p.profitFactor : 0,
        volatility: typeof p.volatility === 'number' ? p.volatility : 0,
        alpha: comparison ? (comparison.alphaAnnual || comparison.alpha || 0) : 0,
      };
    } catch (e) {
      console.error('[runBacktestForLab]', e);
      return null;
    }
  }
  
    // ════════════════════════════════════════════════════════════
  // 🆕 تطبيق الفائز آلياً مع Walk-Forward AI Learning Rebuild
  // ════════════════════════════════════════════════════════════
  async function handleApplyWinner(winnerData) {
    try {
      
      // ① استخراج البيانات من winnerData
      // الصيغة الجديدة: { winner, winnerFitness, testResults }
      var strategy = winnerData.winner || winnerData.strategy || winnerData;
      var testResult = winnerData.winnerFitness || winnerData.testFitness || null;
      
      // 🆕 استخراج overfitting من testResults
      var overfittingScore = 0;
      if (winnerData.testResults && winnerData.testResults.length > 0) {
        // ابحث عن testResult المُطابق للـ winner
        var matched = winnerData.testResults.find(function(t) {
          return t.strategy && t.strategy.id === strategy.id;
        });
        if (matched && typeof matched.overfittingScore === 'number') {
          overfittingScore = matched.overfittingScore;
        }
      }
     
      // ② بناء WinnerMetrics
      var metrics = {
        cagr: 0,
        alpha: 0,
        maxDD: 0,
        sortino: 0,
        winRate: 0,
        closedTrades: 0,
        testFitness: 0,
        overfitting: 0,
      };
      
      if (testResult && testResult.metrics) {
        var m = testResult.metrics;
        metrics.cagr = m.cagr || 0;
        metrics.alpha = m.alpha || 0;
        metrics.maxDD = m.maxDD || 0;
        metrics.sortino = m.sortino || 0;
        metrics.winRate = m.winRate || 0;
        metrics.closedTrades = m.closedTrades || 0;
        metrics.testFitness = testResult.fitness || 0;
      } else if (strategy.backtestResult && strategy.backtestResult.metrics) {
        // fallback من Train metrics
        var bm = strategy.backtestResult.metrics;
        metrics.cagr = bm.cagr || 0;
        metrics.alpha = bm.alpha || 0;
        metrics.maxDD = bm.maxDD || 0;
        metrics.sortino = bm.sortino || 0;
        metrics.winRate = bm.winRate || 0;
        metrics.closedTrades = bm.closedTrades || 0;
        metrics.testFitness = strategy.fitness || 0;
      }
      
      // overfitting يأتي من winnerData إن كان موجوداً
      metrics.overfitting = overfittingScore;

      
      // ③ تجهيز Walk-Forward callback
      var walkForwardCallback = null;
      
      if (labHistoricalData && labHistoricalData.length > 0) {
        walkForwardCallback = async function() {
          try {
            // إعادة تشغيل الباك-تيست بأوزان Winner على البيانات التاريخية
            // الباك-تيست يعمل شمعة-شمعة بدون lookahead بالفعل
            var rebuildResult = await runBacktestForLab(strategy, labHistoricalData);
            
            if (!rebuildResult) {
              console.warn('[WalkForward] Backtest returned null');
              return false;
            }
            
            // الباك-تيست يكتب آلياً في AI Learning عبر backtestAnalysisEngine
            // (لأنّ stockHealth يستدعي recordFeedback داخلياً)
            console.log('[WalkForward] Rebuild complete:', rebuildResult);
            return true;
          } catch (e) {
            console.error('[WalkForward] Error:', e);
            return false;
          }
        };
      }
      
      // ④ استدعاء winnerManager
      var evaluation = await evaluateAndApplyWinner(
        strategy,
        metrics,
        walkForwardCallback
      );
      
      // ⑤ عرض النتيجة للمستخدم
      if (evaluation.applied) {
        var successMsg = '🏆 تم تطبيق Winner جديد!\n\n';
        successMsg += '📊 Score الجديد: ' + evaluation.newScore + '\n';
        if (evaluation.oldScore !== null) {
          successMsg += '📊 Score السابق: ' + evaluation.oldScore + '\n';
          successMsg += '📈 التحسّن: ' + (evaluation.newScore - evaluation.oldScore).toFixed(2) + '\n';
        } else {
          successMsg += '📊 أوّل Winner يُحفظ\n';
        }
        successMsg += '\n✅ ' + evaluation.reason + '\n';
        successMsg += '\n💡 سيُطبَّق على التحليل الحيّ تلقائياً.';
        
        try { alert(successMsg); } catch(_) {}
      } else {
        // فشل التطبيق
        var failMsg = '⚠ Winner جديد لم يُطبَّق\n\n';
        failMsg += '📝 السبب: ' + evaluation.reason + '\n\n';
        
        if (evaluation.failedGates && evaluation.failedGates.length > 0) {
          failMsg += '❌ الشروط الفاشلة:\n';
          evaluation.failedGates.forEach(function(g) {
            failMsg += '  • ' + g + '\n';
          });
        }
        
        if (evaluation.oldScore !== null) {
          failMsg += '\n📊 Score الجديد: ' + evaluation.newScore + '\n';
          failMsg += '📊 Score الحالي: ' + evaluation.oldScore + '\n';
        }
        
        failMsg += '\n💾 حُفِظ في الأرشيف للمقارنة.';
        
        try { alert(failMsg); } catch(_) {}
      }
      
    } catch (e) {
      console.error('[handleApplyWinner] Error:', e);
      try {
        alert('⚠ خطأ في تطبيق Winner:\n' + (e.message || 'غير معروف'));
      } catch(_) {}
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
      
      {/* 🆕 تبويبات: Backtest عاديّ vs Strategy Lab */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 12,
        padding: 4,
        background: C.layer1,
        borderRadius: 12,
        border: "1px solid " + C.line + "33",
      }}>
        <button
          onClick={function() { haptic.tap(); setActiveTab('run'); }}
          style={{
            flex: 1,
            padding: "10px 8px",
            background: activeTab === 'run'
              ? "linear-gradient(135deg," + C.gold + "," + C.goldL + ")"
              : "transparent",
            border: "none",
            borderRadius: 8,
            color: activeTab === 'run' ? C.ink : C.smoke,
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
            fontFamily: "Cairo, sans-serif",
            transition: "all 0.2s",
          }}
        >
          🧪 Backtest
        </button>
        <button
          onClick={function() { haptic.tap(); setActiveTab('lab'); }}
          style={{
            flex: 1,
            padding: "10px 8px",
            background: activeTab === 'lab'
              ? "linear-gradient(135deg," + C.mint + "," + C.teal + ")"
              : "transparent",
            border: "none",
            borderRadius: 8,
            color: activeTab === 'lab' ? C.ink : C.smoke,
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
            fontFamily: "Cairo, sans-serif",
            transition: "all 0.2s",
          }}
        >
          🧬 Strategy Lab
        </button>
      </div>
      
      {/* ═══ Strategy Lab Tab ═══ */}
      {activeTab === 'lab' && (
        <StrategyLabTab
          C={C}
          runBacktest={runBacktestForLab}
          historicalData={labHistoricalData}
          dataInfo={labDataInfo}
          onApplyWinner={handleApplyWinner}
        />
      )}
      
      {/* ═══ Backtest Tab ═══ */}
      {activeTab === 'run' && (
      <>
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
          icon="🔍"
          title="قائمة التحليل"
          description="استراتيجية الطبقات الإحدى عشرة - اختر فئة الأسهم"
          question="هل الطبقات الإحدى عشرة دقيقة فعلاً؟"
          color={C.gold}
          active={config.mode === 'analysis'}
          onClick={function() { haptic.tap(); setConfig(Object.assign({}, config, { mode: 'analysis' })); }}
        />
        
        {config.mode === 'analysis' && (
          <div style={{
            marginBottom: 10,
            padding: '10px 12px',
            background: "linear-gradient(135deg, #10b98115, #10b98105)",
            borderRadius: 10,
            border: "1px solid #10b98144",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>🌍</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#10b981", marginBottom: 2 }}>
                  السوق المتنوّع
                </div>
                <div style={{ fontSize: 9, color: C.smoke, lineHeight: 1.4 }}>
                  ٥٠ سهم متنوّعة من كل القطاعات • يتغيّر في كل تشغيل
                </div>
              </div>
              <span style={{ fontSize: 16, color: "#10b981" }}>✓</span>
            </div>
            <div style={{
              fontSize: 9,
              color: C.smoke,
              fontStyle: "italic",
              padding: "4px 8px",
              background: "rgba(16,185,129,0.08)",
              borderRadius: 6,
              borderRight: "2px solid #10b981",
            }}>
              💡 universe متنوّع يُتيح للنظام اكتشاف استراتيجيّة عامّة تعمل على كل أنواع الأسهم
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
          <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>🌍 العالم (عيّنة الأسهم)</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { seed: 20260101, label: 'عالم ١' },
              { seed: 20260202, label: 'عالم ٢' },
              { seed: 20260303, label: 'عالم ٣' },
              { seed: 20260404, label: 'عالم ٤' },
              { seed: 20260505, label: 'عالم ٥' },
            ].map(function(opt) {
              return (
                <button
                  key={opt.seed}
                  onClick={function() { setConfig(Object.assign({}, config, { seed: opt.seed })); }}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background: config.seed === opt.seed ? C.plasma + "22" : C.void,
                    border: "1px solid " + (config.seed === opt.seed ? C.plasma : C.line) + "44",
                    borderRadius: 6,
                    color: config.seed === opt.seed ? C.plasma : C.smoke,
                    fontSize: 10, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 9, color: C.ash, marginTop: 4, lineHeight: 1.5 }}>
            💡 كل عالم = ٥٠ سهماً مختلفة. جرّب الخمسة -- استراتيجية قوية تنجح في معظمها.
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>📅 الفترة</div>
          <div style={{ display: "flex", gap: 6 }}>
                        {[
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
          
          <label style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 8px", 
            background: C.mint + "12", 
            borderRadius: 6, 
            cursor: "pointer",
            border: "1px solid " + C.mint + "33",
          }}>
            <input
              type="checkbox"
              checked={config.useWinner}
              onChange={function(e) { setConfig(Object.assign({}, config, { useWinner: e.target.checked })); }}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 11, color: C.mint, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
              🏆 استعمل Winner المُطبَّق
            </span>
          </label>
        </div>
        <button
          onClick={async function() {
            haptic.tap();
            setIsRunning(true);
            try {
              var _ff = await import('../services/api/sahmkFundamentalsApi');
              var _sd = await import('../constants/stocksData');
              await _ff.loadFundamentalsIntoStocks(_sd.STOCKS_MAP, _sd.STOCKS.map(function(s){ return s.sym; }));
              // ✨ إحصاء دقيق -- كم سهماً وصلته الأساسيات فعلاً
              var _syms = _sd.STOCKS.map(function(s){ return s.sym; });
              var _ok = 0, _pe = 0, _roe = 0;
              _syms.forEach(function(sy) {
                var o = _sd.STOCKS_MAP[sy];
                if (!o) return;
                if (o.pe != null || o.roe != null) _ok++;
                if (o.pe != null) _pe++;
                if (o.roe != null) _roe++;
              });
              alert('✅ اكتمل التحميل\n\n'
                + 'إجمالي الأسهم: ' + _syms.length + '\n'
                + 'وصلتها بيانات: ' + _ok + ' (' + Math.round(_ok / _syms.length * 100) + '%)\n'
                + '-- منها مضاعف ربحية: ' + _pe + '\n'
                + '-- منها عائد على الملكية: ' + _roe + '\n\n'
                + (_ok / _syms.length >= 0.9
                    ? '✅ التغطية ممتازة -- النتائج موثوقة'
                    : '⚠ التغطية ناقصة -- أعد الضغط لإكمالها'));

            } catch (e) { alert('⚠ فشل التحميل: ' + e.message); }
            setIsRunning(false);
          }}
          disabled={isRunning}
          style={{
            width: "100%", padding: "10px", marginBottom: 8,
            background: C.teal + "18",
            border: "1px solid " + C.teal + "55",
            borderRadius: 10, color: C.teal,
            fontSize: 11, fontWeight: 800, cursor: "pointer",
            fontFamily: "Cairo, sans-serif",
          }}
        >
          📥 تحميل البيانات الأساسية (مرة واحدة أسبوعياً)
        </button>

        <button
          onClick={() => { haptic.strong(); runBacktest(); }}
disabled={isRunning}
          style={{
            width: "100%", padding: "12px",
            background: isRunning
              ? C.line 
              : "linear-gradient(135deg," + C.gold + "," + C.goldL + ")",
            border: "none", borderRadius: 10,
            color: isRunning ? C.smoke : C.ink,
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
      </>
      )}
    </div>
  );
}
