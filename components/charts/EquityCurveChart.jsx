'use client';
/**
 * @module EquityCurveChart
 * @description رسم منحنى نمو المحفظة عبر الزمن
 * 
 * يعرض:
 * - Equity Curve للاستراتيجية
 * - Benchmark Curve (TASI / Buy & Hold)
 * - Alpha Zone (الفجوة)
 * - نقاط الصفقات (اختياري)
 * 
 * @author تداول+
 * @version 1.0
 */

import React from 'react';

var C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
};

const EquityCurveChart = React.memo(function EquityCurveChart(props) {
  var equityCurve = props.equityCurve || [];
  var benchmarkCurve = props.benchmarkCurve || [];
  var initialCapital = props.initialCapital || 100000;
  var showTrades = props.showTrades || false;
  var trades = props.trades || [];
  var height = props.height || 260;

  if (!equityCurve || equityCurve.length < 2) {
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

  // ① حساب الحدود
  var allValues = equityCurve.map(function(e) { return e.value; });
  
  // إضافة قيم Benchmark إن وُجدت
  var benchmarkValues = [];
  if (benchmarkCurve && benchmarkCurve.length > 0) {
    // تطبيع Benchmark على نفس Initial Capital
    var firstBench = benchmarkCurve[0].value;
    benchmarkValues = benchmarkCurve.map(function(b) {
      return (b.value / firstBench) * initialCapital;
    });
    benchmarkValues.forEach(function(v) { allValues.push(v); });
  }

  var minVal = Math.min.apply(null, allValues);
  var maxVal = Math.max.apply(null, allValues);
  var range = maxVal - minVal || 1;
  
  // padding
  minVal -= range * 0.05;
  maxVal += range * 0.05;
  range = maxVal - minVal;

  // ② أبعاد الرسم
  var width = 350;
  var padding = { top: 20, right: 10, bottom: 35, left: 55 };
  var chartWidth = width - padding.left - padding.right;
  var chartHeight = height - padding.top - padding.bottom;

  // ③ Scaling
  function xScale(index) {
    return padding.left + (index / (equityCurve.length - 1)) * chartWidth;
  }
  function yScale(value) {
    return padding.top + ((maxVal - value) / range) * chartHeight;
  }

  // ④ بناء المسارات
  var strategyPath = equityCurve.map(function(e, i) {
    return (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(e.value);
  }).join(' ');

  // مسار Benchmark (إذا وُجد)
  var benchmarkPath = '';
  if (benchmarkValues.length > 0) {
    benchmarkPath = benchmarkValues.map(function(v, i) {
      return (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(v);
    }).join(' ');
  }

  // ⑤ منطقة Alpha (بين الخطين)
  var alphaPath = '';
  if (benchmarkValues.length > 0) {
    var alphaTop = equityCurve.map(function(e, i) {
      return (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(e.value);
    }).join(' ');
    
    var alphaBottom = '';
    for (var k = equityCurve.length - 1; k >= 0; k--) {
      var benchVal = benchmarkValues[k] || equityCurve[k].value;
      alphaBottom += 'L' + xScale(k) + ',' + yScale(benchVal) + ' ';
    }
    alphaPath = alphaTop + ' ' + alphaBottom + ' Z';
  }

  // ⑥ خط رأس المال الأولي
  var initialLine = yScale(initialCapital);

  // ⑦ حساب الإحصاءات
  var startValue = initialCapital;
  var endValue = equityCurve[equityCurve.length - 1].value;
  var totalReturn = ((endValue - startValue) / startValue) * 100;
  
  var benchReturn = 0;
  if (benchmarkValues.length > 0) {
    var benchEnd = benchmarkValues[benchmarkValues.length - 1];
    benchReturn = ((benchEnd - initialCapital) / initialCapital) * 100;
  }
  
  var alpha = totalReturn - benchReturn;

  // ⑧ تسميات المحور Y
  var yLabels = [];
  for (var i = 0; i <= 4; i++) {
    var val = minVal + (range * i / 4);
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

  // ⑨ علامات الصفقات
  var tradeMarkers = [];
  if (showTrades && trades.length > 0) {
    trades.slice(-20).forEach(function(trade) {
      // ابحث عن اليوم في equity curve
      var dayIndex = equityCurve.findIndex(function(e) { return e.date === trade.date; });
      if (dayIndex < 0) return;
      
      tradeMarkers.push({
        x: xScale(dayIndex),
        y: yScale(equityCurve[dayIndex].value),
        action: trade.action,
      });
    });
  }

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
      <svg width={width} height={height} style={{ width: '100%', maxWidth: width }}>
        {/* Grid Lines */}
        {yLabels.map(function(label, i) {
          return (
            <line
              key={'grid-' + i}
              x1={padding.left} y1={label.y}
              x2={width - padding.right} y2={label.y}
              stroke={C.line} strokeOpacity={0.15}
              strokeDasharray="2,3"
            />
          );
        })}

        {/* Y-Axis Labels */}
        {yLabels.map(function(label, i) {
          return (
            <text
              key={'ylabel-' + i}
              x={padding.left - 5} y={label.y + 3}
              textAnchor="end" fontSize={9}
              fill={C.smoke} fontFamily="IBM Plex Mono,monospace"
            >
              {label.label}
            </text>
          );
        })}

        {/* خط رأس المال الأولي */}
        <line
          x1={padding.left} y1={initialLine}
          x2={width - padding.right} y2={initialLine}
          stroke={C.smoke} strokeWidth={1} opacity={0.3}
          strokeDasharray="3,3"
        />

        {/* منطقة Alpha */}
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

        {/* Strategy Line (الأهم) */}
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

        {/* نقطة النهاية */}
        <circle
          cx={xScale(equityCurve.length - 1)}
          cy={yScale(endValue)}
          r={5}
          fill={C.gold}
          stroke={C.ink}
          strokeWidth={2}
        />

        {/* علامات الصفقات */}
        {tradeMarkers.map(function(marker, i) {
          return (
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
          );
        })}

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
        {/* رأس المال الأولي */}
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

        {/* القيمة النهائية */}
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

        {/* Alpha */}
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
              Alpha vs TASI
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
              تاسي
            </span>
          </div>
        )}
      </div>

      {/* تفسير */}
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
          ? ' -- تفوّقت على تاسي بـ +' + alpha.toFixed(1) + '% ✅'
          : benchmarkValues.length > 0
          ? ' -- أقل من تاسي بـ ' + alpha.toFixed(1) + '%'
          : ''}
      </div>
    </div>
  );
}

/**
 * تنسيق الأرقام المالية
 */
function formatMoney(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toFixed(0);
}

/**
 * تنسيق التاريخ
 */
function formatDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    var parts = date.split('-');
    if (parts.length >= 2) return parts[1] + '/' + (parts[2] || '01');
  }
  if (date instanceof Date) {
    return (date.getMonth() + 1) + '/' + date.getDate();
  }
  return '';
}
