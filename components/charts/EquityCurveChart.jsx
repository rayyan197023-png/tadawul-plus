'use client';
/**
 * @module EquityCurveChart
 * @description رسم منحنى نمو المحفظة عبر الزمن
 * 
 * ✨ V2.0 - Performance Optimized
 * 
 * @author تداول+
 * @version 2.0
 */

import React, { useMemo } from 'react';

const C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
};

// Utility functions (cached outside component)
function formatMoney(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toFixed(0);
}

function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    const parts = date.split('-');
    if (parts.length >= 2) return parts[1] + '/' + (parts[2] || '01');
  }
  if (date instanceof Date) {
    return (date.getMonth() + 1) + '/' + date.getDate();
  }
  return '';
}

const EquityCurveChart = React.memo(function EquityCurveChart(props) {
  const equityCurve = props.equityCurve || [];
  const benchmarkCurve = props.benchmarkCurve || [];
  const initialCapital = props.initialCapital || 100000;
  const showTrades = props.showTrades || false;
  const trades = props.trades || [];
  const height = props.height || 260;

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const chartData = useMemo(() => {
    if (!equityCurve || equityCurve.length < 2) return null;

    // ① Values
    const allValues = equityCurve.map((e) => e.value);
    
    let benchmarkValues = [];
    if (benchmarkCurve && benchmarkCurve.length > 0) {
      const firstBench = benchmarkCurve[0].value;
      benchmarkValues = benchmarkCurve.map((b) => (b.value / firstBench) * initialCapital);
      benchmarkValues.forEach((v) => allValues.push(v));
    }

    let minVal = Math.min.apply(null, allValues);
    let maxVal = Math.max.apply(null, allValues);
    let range = maxVal - minVal || 1;
    
    // padding
    minVal -= range * 0.05;
    maxVal += range * 0.05;
    range = maxVal - minVal;

    // ② Dimensions
    const width = 350;
    const padding = { top: 20, right: 10, bottom: 35, left: 55 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // ③ Scaling
    const xScale = (index) => padding.left + (index / (equityCurve.length - 1)) * chartWidth;
    const yScale = (value) => padding.top + ((maxVal - value) / range) * chartHeight;

    // ④ Paths
    const strategyPath = equityCurve.map((e, i) => 
      (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(e.value)
    ).join(' ');

    let benchmarkPath = '';
    if (benchmarkValues.length > 0) {
      benchmarkPath = benchmarkValues.map((v, i) => 
        (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(v)
      ).join(' ');
    }

    // ⑤ Alpha area
    let alphaPath = '';
    if (benchmarkValues.length > 0) {
      const alphaTop = equityCurve.map((e, i) => 
        (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(e.value)
      ).join(' ');
      
      let alphaBottom = '';
      for (let k = equityCurve.length - 1; k >= 0; k--) {
        const benchVal = benchmarkValues[k] || equityCurve[k].value;
        alphaBottom += 'L' + xScale(k) + ',' + yScale(benchVal) + ' ';
      }
      alphaPath = alphaTop + ' ' + alphaBottom + ' Z';
    }

    // ⑥ Initial capital line
    const initialLine = yScale(initialCapital);

    // ⑦ Stats
    const startValue = initialCapital;
    const endValue = equityCurve[equityCurve.length - 1].value;
    const totalReturn = ((endValue - startValue) / startValue) * 100;
    
    let benchReturn = 0;
    if (benchmarkValues.length > 0) {
      const benchEnd = benchmarkValues[benchmarkValues.length - 1];
      benchReturn = ((benchEnd - initialCapital) / initialCapital) * 100;
    }
    
    const alpha = totalReturn - benchReturn;

    // ⑧ Y-Axis labels
    const yLabels = [];
    for (let i = 0; i <= 4; i++) {
      const val = minVal + (range * i / 4);
      yLabels.push({
        value: val,
        y: yScale(val),
        label: val >= 1000000 
          ? (val / 1000000).toFixed(2) + 'M' 
          : val >= 1000 
            ? (val / 1000).toFixed(0) + 'K' 
            : val.toFixed(0),
      });
    }

    // ⑨ Trade markers
    const tradeMarkers = [];
    if (showTrades && trades.length > 0) {
      trades.slice(-20).forEach((trade) => {
        const dayIndex = equityCurve.findIndex((e) => e.date === trade.date);
        if (dayIndex < 0) return;
        
        tradeMarkers.push({
          x: xScale(dayIndex),
          y: yScale(equityCurve[dayIndex].value),
          action: trade.action,
        });
      });
    }

    return {
      width, height, padding, chartWidth, chartHeight,
      benchmarkValues,
      xScale, yScale,
      strategyPath, benchmarkPath, alphaPath,
      initialLine,
      endValue, totalReturn, benchReturn, alpha,
      yLabels, tradeMarkers,
    };
  }, [equityCurve, benchmarkCurve, initialCapital, showTrades, trades, height]);

  // ═══════════════════════════════════════════════
  // ✨ Empty state
  // ═══════════════════════════════════════════════
  
  if (!chartData) {
    return (
      <div style={{
        background: C.layer1,
        borderRadius: 12,
        padding: 20,
        textAlign: 'center',
        color: C.smoke,
        fontSize: 12,
        marginBottom: 12,
      }}>
        📊 بيانات Backtest غير كافية
      </div>
    );
  }

  const {
    width, padding, benchmarkValues,
    xScale, yScale,
    strategyPath, benchmarkPath, alphaPath,
    initialLine, endValue, totalReturn, alpha,
    yLabels, tradeMarkers,
  } = chartData;

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + C.gold + "22",
      padding: "14px 12px",
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}>
        <div>
          <div style={{
            fontSize: 10,
            color: C.gold,
            fontWeight: 700,
            letterSpacing: "1px",
            marginBottom: 3,
          }}>
            📈 منحنى نمو المحفظة
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 800,
          }}>
            Equity Curve
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 20,
            fontWeight: 900,
            color: totalReturn >= 0 ? C.mint : C.coral,
            lineHeight: 1,
          }}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
          </div>
          <div style={{
            fontSize: 10,
            color: C.smoke,
            marginTop: 2,
          }}>
            إجمالي العائد
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', maxWidth: width, display: 'block' }}>
        {/* Grid Lines */}
        {yLabels.map((label, i) => (
          <line
            key={'grid-' + i}
            x1={padding.left} y1={label.y}
            x2={width - padding.right} y2={label.y}
            stroke={C.line} strokeOpacity={0.15}
            strokeDasharray="2,3"
          />
        ))}

        {/* Y-Axis Labels */}
        {yLabels.map((label, i) => (
          <text
            key={'ylabel-' + i}
            x={padding.left - 5} y={label.y + 3}
            textAnchor="end" fontSize={9}
            fill={C.smoke} fontFamily="IBM Plex Mono,monospace"
          >
            {label.label}
          </text>
        ))}

        {/* Initial Capital Line */}
        <line
          x1={padding.left} y1={initialLine}
          x2={width - padding.right} y2={initialLine}
          stroke={C.smoke} strokeWidth={1} opacity={0.3}
          strokeDasharray="3,3"
        />

        {/* Alpha Area */}
        {alphaPath && (
          <path
            d={alphaPath}
            fill={alpha >= 0 ? C.mint : C.coral}
            fillOpacity={0.1}
          />
        )}

        {/* Benchmark Line */}
        {benchmarkPath && (
          <path
            d={benchmarkPath}
            fill="none"
            stroke={C.smoke}
            strokeWidth={1.5}
            strokeDasharray="4,3"
            opacity={0.6}
          />
        )}

        {/* Strategy Line */}
        <path
          d={strategyPath}
          fill="none"
          stroke={C.gold}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: "drop-shadow(0 0 4px " + C.gold + "aa)",
          }}
        />

        {/* End Point */}
        <circle
          cx={xScale(equityCurve.length - 1)}
          cy={yScale(endValue)}
          r={5}
          fill={C.gold}
          stroke={C.ink}
          strokeWidth={2}
        />

        {/* Trade Markers */}
        {tradeMarkers.map((marker, i) => (
          <circle
            key={'trade-' + i}
            cx={marker.x}
            cy={marker.y}
            r={2.5}
            fill={marker.action === 'buy' ? C.mint : C.coral}
            fillOpacity={0.7}
            stroke={C.ink}
            strokeWidth={0.5}
          />
        ))}

        {/* X-Axis Labels */}
        <text
          x={padding.left} y={height - 10}
          fontSize={9} fill={C.smoke}
          textAnchor="start"
        >
          {equityCurve[0].date ? formatDate(equityCurve[0].date) : 'بداية'}
        </text>
        <text
          x={width - padding.right} y={height - 10}
          fontSize={9} fill={C.smoke}
          textAnchor="end"
        >
          {equityCurve[equityCurve.length - 1].date 
            ? formatDate(equityCurve[equityCurve.length - 1].date) 
            : 'نهاية'}
        </text>
      </svg>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6,
        marginTop: 10,
      }}>
        <div style={{
          background: C.void + "88",
          borderRadius: 8,
          padding: "6px 8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 8, color: C.smoke, marginBottom: 2 }}>
            رأس المال
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: C.snow,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {formatMoney(initialCapital)}
          </div>
        </div>

        <div style={{
          background: (totalReturn >= 0 ? C.mint : C.coral) + "15",
          border: "1px solid " + (totalReturn >= 0 ? C.mint : C.coral) + "33",
          borderRadius: 8,
          padding: "6px 8px",
          textAlign: "center",
        }}>
          <div style={{ 
            fontSize: 8, 
            color: totalReturn >= 0 ? C.mint : C.coral, 
            marginBottom: 2,
            fontWeight: 700,
          }}>
            القيمة النهائية
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 900,
            color: totalReturn >= 0 ? C.mint : C.coral,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {formatMoney(endValue)}
          </div>
        </div>

        {benchmarkValues.length > 0 && (
          <div style={{
            background: C.gold + "15",
            border: "1px solid " + C.gold + "33",
            borderRadius: 8,
            padding: "6px 8px",
            textAlign: "center",
          }}>
            <div style={{ 
              fontSize: 8, 
              color: C.gold, 
              marginBottom: 2,
              fontWeight: 700,
            }}>
              Alpha vs B&H
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 900,
              color: alpha >= 0 ? C.mint : C.coral,
              fontFamily: "IBM Plex Mono,monospace",
            }}>
              {alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 10,
        display: "flex",
        justifyContent: "center",
        gap: 16,
        padding: "6px",
        background: C.void + "55",
        borderRadius: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 14, height: 2,
            background: C.gold,
            borderRadius: 1,
          }} />
          <span style={{ fontSize: 9, color: C.gold, fontWeight: 700 }}>
            استراتيجيتك
          </span>
        </div>
        {benchmarkValues.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 14, height: 2,
              background: C.smoke,
              borderRadius: 1,
              opacity: 0.6,
            }} />
            <span style={{ fontSize: 9, color: C.smoke, fontWeight: 700 }}>
              شراء واحتفاظ
            </span>
          </div>
        )}
      </div>

      {/* Insight */}
      <div style={{
        marginTop: 8,
        padding: "8px 10px",
        background: alpha >= 0 ? C.mint + "08" : C.coral + "08",
        borderRadius: 8,
        fontSize: 10,
        color: C.mist,
        lineHeight: 1.5,
        textAlign: 'center',
      }}>
        {totalReturn > 0 
          ? '🏆 استراتيجيتك ربحت ' + totalReturn.toFixed(1) + '%'
          : '📉 استراتيجيتك خسرت ' + Math.abs(totalReturn).toFixed(1) + '%'}
        {benchmarkValues.length > 0 && alpha > 0 
          ? ' -- تفوّقت على شراء واحتفاظ بـ +' + alpha.toFixed(1) + '% ✅'
          : benchmarkValues.length > 0
          ? ' -- أقل من شراء واحتفاظ بـ ' + alpha.toFixed(1) + '%'
          : ''}
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison
  if (prev.equityCurve !== next.equityCurve) return false;
  if (prev.benchmarkCurve !== next.benchmarkCurve) return false;
  if (prev.initialCapital !== next.initialCapital) return false;
  if (prev.showTrades !== next.showTrades) return false;
  if (prev.trades !== next.trades) return false;
  if (prev.height !== next.height) return false;
  return true;
});

EquityCurveChart.displayName = 'EquityCurveChart';

export default EquityCurveChart;
