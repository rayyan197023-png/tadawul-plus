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
        border: "1px solid " + C.line​​​​​​​​​​​​​​​​