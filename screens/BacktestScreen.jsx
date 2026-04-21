'use client';
/**
 * @module BacktestScreen
 * @description شاشة اختبار الاستراتيجية
 * 
 * تدمج:
 * - Equity Curve Chart
 * - Backtest Results Card
 * - Monte Carlo Chart
 * - Trade Log
 * 
 * @author تداول+
 * @version 1.0
 */

import React, { useState, useMemo } from 'react';
import { genBars, stockHealth } from '../engines/analysisEngine';
import { backtest, monteCarloSimulation, compareWithBenchmark } from '../engines/backtestEngine';
import { createTadawulStrategy, createBuyAndHoldStrategy } from '../engines/tadawulStrategy';
import EquityCurveChart from '../components/charts/EquityCurveChart';
import BacktestResultsCard from '../components/charts/BacktestResultsCard';
import MonteCarloChart from '../components/charts/MonteCarloChart';
import { STOCKS } from '../constants/stocksData';

var C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
};

/**
 * توليد بيانات تاريخية اصطناعية
 * (في الإنتاج: يُستبدل بـ API حقيقي)
 */
function generateHistoricalData(days, includeStocks) {
  var data = [];
  var today = new Date();
  
  // اختيار 10 أسهم عشوائية
  var stockList = (includeStocks || STOCKS.slice(0, 10));
  
  // توليد bars لكل سهم
  var stocksBars = {};
  stockList.forEach(function(stk) {
    stocksBars[stk.sym] = genBars(stk.seed || stk.sym, days);
  });

  // بناء البيانات اليومية
  for (var i = 0; i < days; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - (days - i - 1));
    
    var prices = {};
    var stocksData = [];
    
    stockList.forEach(function(stk) {
      var bars = stocksBars[stk.sym];
      if (bars && bars[i]) {
        prices[stk.sym] = bars[i].c;
        
        // إنشاء stock data مع bars حتى اليوم الحالي
        stocksData.push({
          sym: stk.sym,
          name: stk.name,
          sector: stk.sector,
          bars: bars.slice(0, i + 1), // bars حتى اليوم الحالي
          currentPrice: bars[i].c,
        });
      }
    });

    data.push({
      date: date.toISOString().split('T')[0],
      prices: prices,
      stocksData: stocksData,
    });
  }

  return data;
}

export default function BacktestScreen() {
  var [config, setConfig] = useState({
    initialCapital: 100000,
    days: 252, // سنة واحدة
    includeCosts: true,
    runMonteCarlo: true,
    monteCarloIterations: 5000,
  });

  var [isRunning, setIsRunning] = useState(false);
  var [results, setResults] = useState(null);

  /**
   * تشغيل Backtest
   */
  function runBacktest() {
    setIsRunning(true);
    setResults(null);

    // استخدام setTimeout للسماح بـ rendering loading state
    setTimeout(function() {
      try {
        // ① توليد البيانات التاريخية
        var historicalData = generateHistoricalData(config.days);
        
        // ② إنشاء الاستراتيجيات
        var tadawulStrategy = createTadawulStrategy(stockHealth);
        var buyHoldStrategy = createBuyAndHoldStrategy(
          historicalData[0].stocksData.slice(0, 5).map(function(s) { return s.sym; })
        );

        // ③ تشغيل Backtest على Tadawul Strategy
        var strategyResult = backtest(tadawulStrategy, historicalData, {
          initialCapital: config.initialCapital,
          includeCosts: config.includeCosts,
        });

        // ④ تشغيل Benchmark (Buy & Hold)
        var benchmarkResult = backtest(buyHoldStrategy, historicalData, {
          initialCapital: config.initialCapital,
          includeCosts: config.includeCosts,
        });

        // ⑤ مقارنة
        var comparison = null;
        if (strategyResult.success && benchmarkResult.success) {
          comparison = compareWithBenchmark(strategyResult, benchmarkResult);
        }

        // ⑥ Monte Carlo
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
          اختبر استراتيجية الطبقات التسع على بيانات حقيقية
        </div>
      </div>

      {/* Config Card */}
      <div style={{
        background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
        borderRadius: 14,
        border: "1px solid " + C.line + "44",
        padding: "14px 12px",
        marginBottom: 12,
      }}>
        <div style={{
          fontSize: 11,
          color: C.teal,
          fontWeight: 800,
          letterSpacing: "1px",
          marginBottom: 10,
        }}>
          ⚙️ إعدادات Backtest
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
          <div style={{
            display: "flex",
            gap: 6,
          }}>
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
                    background: config.initialCapital === amt 
                      ? C.gold + "22" 
                      : C.void,
                    border: "1px solid " + (config.initialCapital === amt 
                      ? C.gold 
                      : C.line) + "44",
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
          <div style={{
            display: "flex",
            gap: 6,
          }}>
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
                    background: config.days === opt.days 
                      ? C.teal + "22" 
                      : C.void,
                    border: "1px solid " + (config.days === opt.days 
                      ? C.teal 
                      : C.line) + "44",
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
        <div style={{ 
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 12,
        }}>
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
              🎰 تشغيل Monte Carlo ({config.monteCarloIterations.toLocaleString()} محاكاة)
            </span>
          </label>
        </div>

        {/* زر التشغيل */}
        <button
          onClick={runBacktest}
          disabled={isRunning}
          style={{
            width: "100%",
            padding: "12px",
            background: isRunning 
              ? C.line 
              : "linear-gradient(135deg," + C.gold + "," + C.goldL + ")",
            border: "none",
            borderRadius: 10,
            color: isRunning ? C.smoke : C.ink,
            fontSize: 13,
            fontWeight: 900,
            cursor: isRunning ? "not-allowed" : "pointer",
            boxShadow: isRunning 
              ? "none" 
              : "0 4px 12px " + C.gold + "33",
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
            {config.runMonteCarlo && ' · ' + config.monteCarloIterations.toLocaleString() + ' سيناريو Monte Carlo'}
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

          {/* Backtest Results Card */}
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
                color: C.plasma || C.teal,
                fontWeight: 800,
                letterSpacing: "1px",
                marginBottom: 10,
              }}>
                📋 سجل الصفقات (آخر 15)
              </div>
              
              <div style={{ 
                display: "flex", 
                flexDirection: "column",
                gap: 4,
              }}>
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
            💡 اضغط "تشغيل Backtest" لبدء اختبار الاستراتيجية
          </div>
          <div style={{
            fontSize: 10,
            color: C.ash,
            marginTop: 4,
          }}>
            سيتم تحليل {config.days} يوم تداول · {config.runMonteCarlo ? config.monteCarloIterations.toLocaleString() + ' محاكاة Monte Carlo' : 'بدون Monte Carlo'}
          </div>
        </div>
      )}
    </div>
  );
}
