'use client';
/**
 * @module BacktestScreen
 * @description شاشة Backtesting مع 3 أوضاع
 * 
 * الأوضاع:
 * - Mode 1: محفظتي (Buy & Hold)
 * - Mode 2: قائمة التحليل (Tadawul Strategy)
 * - Mode 3: السوق بالكامل (Tadawul + Diversification)
 * 
 * @author تداول+
 * @version 2.0
 */

import React, { useState } from 'react';
import { genBars, stockHealth } from '../engines/analysisEngine';
import { 
  backtest, 
  monteCarloSimulation, 
  compareWithBenchmark,
  generateDataFromPortfolio,
  generateDataFromStockList,
  generateDataFromMarket,
  createPortfolioBuyAndHoldStrategy,
} from '../engines/backtestEngine';
import { createTadawulStrategy, createBuyAndHoldStrategy } from '../engines/tadawulStrategy';
import EquityCurveChart from '../components/charts/EquityCurveChart';
import BacktestResultsCard from '../components/charts/BacktestResultsCard';
import MonteCarloChart from '../components/charts/MonteCarloChart';
import { STOCKS } from '../constants/stocksData';
import { useNav } from '../store';

var C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
  plasma: "#a78bfa",
};

/**
 * بطاقة اختيار الوضع
 */
function ModeCard(props) {
  return (
    <div
      onClick={props.onClick}
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
        boxShadow: props.active 
          ? "0 4px 14px " + props.color + "22" 
          : "none",
      }}
    >
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 900,
            color: props.active ? props.color : C.snow,
            marginBottom: 3,
          }}>
            {props.icon} {props.title}
          </div>
          <div style={{
            fontSize: 10,
            color: C.smoke,
            lineHeight: 1.5,
          }}>
            {props.description}
          </div>
        </div>
        
        {props.active && (
          <div style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: props.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: C.ink,
            fontSize: 12,
            fontWeight: 900,
          }}>
            ✓
          </div>
        )}
      </div>
      
      <div style={{
        padding: "6px 8px",
        background: props.active ? props.color + "15" : C.void,
        borderRadius: 6,
        borderLeft: "2px solid " + (props.active ? props.color : C.line),
      }}>
        <div style={{
          fontSize: 9,
          color: props.active ? props.color : C.ash,
          fontWeight: 700,
          marginBottom: 2,
        }}>
          💡 السؤال المُجاب
        </div>
        <div style={{
          fontSize: 10,
          color: C.mist,
          fontStyle: "italic",
        }}>
          "{props.question}"
        </div>
      </div>
    </div>
  );
}

export default function BacktestScreen() {
  var positions = useNav(function(s) { return s.positions; }) || [];
  
  var [config, setConfig] = useState({
    mode: 'analysis', // portfolio / analysis / market
    initialCapital: 100000,
    days: 252,
    includeCosts: true,
    runMonteCarlo: true,
    monteCarloIterations: 5000,
  });

  var [isRunning, setIsRunning] = useState(false);
  var [results, setResults] = useState(null);

  /**
   * التحقق من وضع المحفظة
   */
  var hasPortfolio = positions && positions.length > 0;

  /**
   * تشغيل Backtest
   */
  function runBacktest() {
    setIsRunning(true);
    setResults(null);

    setTimeout(function() {
      try {
        var historicalData;
        var strategy;
        var benchmarkStrategy;
        var modeLabel;

        // تحديد الوضع
        if (config.mode === 'portfolio') {
          // Mode 1: المحفظة الحالية
          if (!hasPortfolio) {
            setResults({ error: 'المحفظة فارغة! أضف أسهماً أولاً.' });
            setIsRunning(false);
            return;
          }

          modeLabel = 'محفظتي الحالية';
          historicalData = generateDataFromPortfolio(positions, genBars, config.days);
          strategy = createPortfolioBuyAndHoldStrategy(positions);
          
          // Benchmark: نفس الأسهم لكن بأوزان متساوية
          var equalWeightPositions = positions.map(function(p) {
            return Object.assign({}, p, { weight: 1 / positions.length });
          });
          benchmarkStrategy = createPortfolioBuyAndHoldStrategy(equalWeightPositions);
        
        } else if (config.mode === 'analysis') {
          // Mode 2: قائمة التحليل
          modeLabel = 'قائمة التحليل (Tadawul Strategy)';
          historicalData = generateDataFromStockList(STOCKS, genBars, config.days, 15);
          strategy = createTadawulStrategy(stockHealth);
          
          // Benchmark: Buy & Hold على أول 5 أسهم
          var benchmarkSymbols = historicalData[0].stocksData.slice(0, 5).map(function(s) { 
            return s.sym; 
          });
          benchmarkStrategy = createBuyAndHoldStrategy(benchmarkSymbols);
        
        } else if (config.mode === 'market') {
          // Mode 3: السوق بالكامل
          modeLabel = 'السوق بالكامل (Sector Rotation)';
          historicalData = generateDataFromMarket(STOCKS, genBars, config.days);
          strategy = createTadawulStrategy(stockHealth, {
            maxPositions: 10, // أكثر تنويعاً
            maxPositionWeight: 0.15,
          });
          
          var marketBenchmarkSymbols = historicalData[0].stocksData.slice(0, 10).map(function(s) { 
            return s.sym; 
          });
          benchmarkStrategy = createBuyAndHoldStrategy(marketBenchmarkSymbols);
        }

        if (!historicalData || historicalData.length === 0) {
          setResults({ error: 'فشل توليد البيانات التاريخية' });
          setIsRunning(false);
          return;
        }

        // تشغيل Backtest للاستراتيجية
        var strategyResult = backtest(strategy, historicalData, {
          initialCapital: config.initialCapital,
          includeCosts: config.includeCosts,
        });

        // تشغيل Benchmark
        var benchmarkResult = backtest(benchmarkStrategy, historicalData, {
          initialCapital: config.initialCapital,
          includeCosts: config.includeCosts,
        });

        // مقارنة
        var comparison = null;
        if (strategyResult.success && benchmarkResult.success) {
          comparison = compareWithBenchmark(strategyResult, benchmarkResult);
        }

        // Monte Carlo
        var monteCarloResult = null;
        if (config.runMonteCarlo && strategyResult.success) {
          monteCarloResult = monteCarloSimulation(
            strategyResult,
            config.monteCarloIterations
          );
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
    }, 100);
  }

  return (
    <div style={{
      background: C.ink,
      minHeight: "100vh",
      padding: "16px 12px 100px",
      fontFamily: "Cairo,sans-serif",
      direction: "rtl",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
        borderRadius: 14,
        border: "1px solid " + C.gold + "33",
        padding: "14px 12px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          color: C.gold,
          fontWeight: 800,
          letterSpacing: "1px",
          marginBottom: 4,
        }}>
          🧪 محرك Backtesting
        </div>
        <div style={{
          fontSize: 15,
          color: C.snow,
          fontWeight: 900,
          marginBottom: 4,
        }}>
          اختبار الاستراتيجية التاريخية
        </div>
        <div style={{
          fontSize: 10,
          color: C.smoke,
          lineHeight: 1.6,
        }}>
          اختبر 3 استراتيجيات مختلفة على بيانات تاريخية
        </div>
      </div>

      {/* 🎯 Mode Selection */}
      <div style={{
        background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
        borderRadius: 14,
        border: "1px solid " + C.line + "44",
        padding: "14px 12px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          color: C.gold,
          fontWeight: 800,
          letterSpacing: "1px",
          marginBottom: 10,
        }}>
          🎯 اختر وضع Backtest
        </div>

        {/* Mode 1: محفظتي */}
        <ModeCard
          icon="💼"
          title="محفظتي الحالية"
          description={hasPortfolio 
            ? "اختبار محفظتك الفعلية (" + positions.length + " أسهم)" 
            : "⚠️ المحفظة فارغة -- أضف أسهماً أولاً"}
          question="كيف كانت محفظتي ستؤدي تاريخياً؟"
          color={C.mint}
          active={config.mode === 'portfolio'}
          onClick={function() { 
            if (hasPortfolio) {
              setConfig(Object.assign({}, config, { mode: 'portfolio' })); 
            }
          }}
        />

        {/* Mode 2: قائمة التحليل */}
        <ModeCard
          icon="🔍"
          title="قائمة التحليل"
          description={"استراتيجية الطبقات التسع على 15 سهم مختار"}
          question="هل الطبقات التسع دقيقة فعلاً؟"
          color={C.gold}
          active={config.mode === 'analysis'}
          onClick={function() { 
            setConfig(Object.assign({}, config, { mode: 'analysis' })); 
          }}
        />

        {/* Mode 3: السوق بالكامل */}
        <ModeCard
          icon="🌐"
          title="السوق بالكامل"
          description="Tadawul + Sector Rotation على 30 سهم من كل القطاعات"
          question="هل النظام يكتشف أفضل الفرص في السوق؟"
          color={C.teal}
          active={config.mode === 'market'}
          onClick={function() { 
            setConfig(Object.assign({}, config, { mode: 'market' })); 
          }}
        />
      </div>

      {/* ⚙️ Config */}
      <div style={{
        background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
        borderRadius: 14,
        border: "1px solid " + C.line + "44",
        padding: "14px 12px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          color: C.plasma,
          fontWeight: 800,
          letterSpacing: "1px",
          marginBottom: 10,
        }}>
          ⚙️ الإعدادات
        </div>

        {/* رأس المال */}
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 10,
            color: C.smoke,
            marginBottom: 4,
          }}>
            💰 رأس المال
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[50000, 100000, 250000, 500000].map(function(amt) {
              return (
                <button
                  key={amt}
                  onClick={function() { 
                    setConfig(Object.assign({}, config, { initialCapital: amt })); 
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background: config.initialCapital === amt ? C.gold + "22" : C.void,
                    border: "1px solid " + (config.initialCapital === amt ? C.gold : C.line) + "44",
                    borderRadius: 6,
                    color: config.initialCapital === amt ? C.gold : C.smoke,
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "IBM Plex Mono,monospace",
                  }}
                >
                  {amt >= 1000 ? (amt / 1000) + 'K' : amt}
                </button>
              );
            })}
          </div>
        </div>

        {/* الفترة */}
        <div style={{ marginBottom: 10 }}>
          <div style={{
            fontSize: 10,
            color: C.smoke,
            marginBottom: 4,
          }}>
            📅 الفترة
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { days: 60, label: '3 أشهر' },
              { days: 126, label: '6 أشهر' },
              { days: 252, label: 'سنة' },
              { days: 504, label: 'سنتين' },
            ].map(function(opt) {
              return (
                <button
                  key={opt.days}
                  onClick={function() { 
                    setConfig(Object.assign({}, config, { days: opt.days })); 
                  }}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    background: config.days === opt.days ? C.teal + "22" : C.void,
                    border: "1px solid " + (config.days === opt.days ? C.teal : C.line) + "44",
                    borderRadius: 6,
                    color: config.days === opt.days ? C.teal : C.smoke,
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Checkboxes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            background: C.void,
            borderRadius: 6,
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={config.includeCosts}
              onChange={function(e) { 
                setConfig(Object.assign({}, config, { includeCosts: e.target.checked })); 
              }}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 11, color: C.mist, fontWeight: 700 }}>
              💸 تطبيق عمولات التداول (0.155%)
            </span>
          </label>

          <label style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            background: C.void,
            borderRadius: 6,
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              checked={config.runMonteCarlo}
              onChange={function(e) { 
                setConfig(Object.assign({}, config, { runMonteCarlo: e.target.checked })); 
              }}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontSize: 11, color: C.mist, fontWeight: 700 }}>
              🎰 Monte Carlo ({config.monteCarloIterations.toLocaleString()} محاكاة)
            </span>
          </label>
        </div>

        {/* زر التشغيل */}
        <button
          onClick={runBacktest}
          disabled={isRunning || (config.mode === 'portfolio' && !hasPortfolio)}
          style={{
            width: "100%",
            padding: "12px",
            background: isRunning || (config.mode === 'portfolio' && !hasPortfolio)
              ? C.line 
              : "linear-gradient(135deg," + C.gold + "," + C.goldL + ")",
            border: "none",
            borderRadius: 10,
            color: isRunning || (config.mode === 'portfolio' && !hasPortfolio) ? C.smoke : C.ink,
            fontSize: 13,
            fontWeight: 900,
            cursor: isRunning ? "not-allowed" : "pointer",
            boxShadow: isRunning ? "none" : "0 4px 12px " + C.gold + "33",
          }}
        >
          {isRunning ? "⏳ جاري التشغيل..." : "🚀 تشغيل Backtest"}
        </button>
      </div>

      {/* Loading */}
      {isRunning && (
        <div style={{
          background: C.layer1,
          borderRadius: 12,
          padding: 40,
          textAlign: "center",
          marginBottom: 12,
        }}>
          <div style={{
            fontSize: 14,
            color: C.gold,
            marginBottom: 10,
          }}>
            🧪 جاري تشغيل المحاكاة...
          </div>
          <div style={{
            fontSize: 10,
            color: C.smoke,
          }}>
            يُحلّل {config.days} يوم تداول
            {config.runMonteCarlo && ' · ' + config.monteCarloIterations.toLocaleString() + ' سيناريو'}
          </div>
        </div>
      )}

      {/* Error */}
      {results && results.error && (
        <div style={{
          background: C.coral + "15",
          border: "1px solid " + C.coral + "33",
          borderRadius: 12,
          padding: 20,
          textAlign: "center",
          color: C.coral,
          fontSize: 12,
          marginBottom: 12,
        }}>
          ⚠️ {results.error}
        </div>
      )}

      {/* النتائج */}
      {results && !results.error && results.strategy && results.strategy.success && (
        <>
          {/* Mode Label */}
          <div style={{
            background: C.gold + "12",
            border: "1px solid " + C.gold + "33",
            borderRadius: 10,
            padding: "8px 12px",
            marginBottom: 12,
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 10,
              color: C.gold,
              fontWeight: 800,
              letterSpacing: "1px",
              marginBottom: 2,
            }}>
              🎯 نتائج Backtest
            </div>
            <div style={{
              fontSize: 12,
              color: C.snow,
              fontWeight: 900,
            }}>
              {results.modeLabel}
            </div>
          </div>

          {/* Equity Curve */}
          <EquityCurveChart
            equityCurve={results.strategy.equityCurve}
            benchmarkCurve={results.benchmark && results.benchmark.success 
              ? results.benchmark.equityCurve.map(function(e) { 
                  return { date: e.date, value: e.value }; 
                })
              : []}
            initialCapital={config.initialCapital}
            trades={results.strategy.trades}
            showTrades={false}
          />

          {/* Backtest Results */}
          <BacktestResultsCard
            result={results.strategy}
            benchmarkResult={results.benchmark}
            comparison={results.comparison}
          />

          {/* Monte Carlo */}
          {results.monteCarlo && results.monteCarlo.success && (
            <MonteCarloChart data={results.monteCarlo} />
          )}

          {/* Trade Log */}
          {results.strategy.trades && results.strategy.trades.length > 0 && (
            <div style={{
              background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
              borderRadius: 14,
              border: "1px solid " + C.line + "44",
              padding: "14px 12px",
              marginBottom: 12,
            }}>
              <div style={{
                fontSize: 11,
                color: C.plasma,
                fontWeight: 800,
                letterSpacing: "1px",
                marginBottom: 10,
              }}>
                📋 سجل الصفقات (آخر 15)
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {results.strategy.trades.slice(-15).reverse().map(function(trade, i) {
                  return (
                    <div key={'trade-' + i} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      background: C.void,
                      borderRadius: 6,
                      borderLeft: "2px solid " + (trade.action === 'buy' ? C.mint : C.coral),
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 9,
                          color: trade.action === 'buy' ? C.mint : C.coral,
                          fontWeight: 800,
                          padding: "2px 6px",
                          background: (trade.action === 'buy' ? C.mint : C.coral) + "15",
                          borderRadius: 4,
                        }}>
                          {trade.action === 'buy' ? '🟢 شراء' : '🔴 بيع'}
                        </span>
                        <span style={{ fontSize: 10, color: C.snow, fontWeight: 700 }}>
                          {trade.sym}
                        </span>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{
                          fontSize: 10,
                          color: trade.pnl !== undefined 
                            ? (trade.pnl >= 0 ? C.mint : C.coral)
                            : C.snow,
                          fontWeight: 800,
                          fontFamily: "IBM Plex Mono,monospace",
                        }}>
                          {trade.pnl !== undefined 
                            ? (trade.pnl >= 0 ? '+' : '') + trade.pnlPct + '%'
                            : trade.value.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 8, color: C.ash }}>
                          {trade.date}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Info Footer */}
      {!isRunning && !results && (
        <div style={{
          padding: "14px 12px",
          background: C.void + "88",
          borderRadius: 10,
          border: "1px solid " + C.line + "22",
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 11,
            color: C.smoke,
            lineHeight: 1.6,
          }}>
            💡 اختر وضعاً ثم اضغط "تشغيل Backtest"
          </div>
        </div>
      )}
    </div>
  );
}
