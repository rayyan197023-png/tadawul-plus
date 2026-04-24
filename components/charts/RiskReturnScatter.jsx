'use client';
/**
 * @module RiskReturnScatter
 * @description رسم Risk-Return Scatter Plot
 * 
 * أساس Modern Portfolio Theory (Markowitz 1952)
 * جائزة نوبل في الاقتصاد 1990
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
  electric: "#4d9fff", plasma: "#a78bfa",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
};

// ألوان القطاعات (Quadrants)
var QUADRANT_COLORS = {
  nirvana: C.mint,      // 🏆 نجم
  aggressive: C.amber,  // ⚡ عدواني
  defensive: C.teal,    // 🛡️ دفاعي
  avoid: C.coral,       // ❌ تجنب
};

var QUADRANT_LABELS = {
  nirvana: '🏆 نجم',
  aggressive: '⚡ عدواني',
  defensive: '🛡️ دفاعي',
  avoid: '❌ تجنب',
};

const RiskReturnScatter = React.memo(function RiskReturnScatter(props) {
  var data = props.data || { stocks: [], portfolio: null, benchmark: null };
  var stocks = data.stocks || [];
  var portfolio = data.portfolio;
  var benchmark = data.benchmark;
  var quadrantCounts = data.quadrantCounts || {};

  if (!stocks || stocks.length < 1) {
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
        📊 بيانات غير كافية لـ Risk-Return Scatter
      </div>
    );
  }

  // ① حساب الحدود
  var allPoints = stocks.slice();
  if (portfolio) allPoints.push(portfolio);
  if (benchmark) allPoints.push(benchmark);

  var minRisk = 0;
  var maxRisk = 40;
  var minReturn = -20;
  var maxReturn = 40;

  allPoints.forEach(function(p) {
    if (p.risk < minRisk) minRisk = Math.floor(p.risk / 5) * 5;
    if (p.risk > maxRisk) maxRisk = Math.ceil(p.risk / 5) * 5;
    if (p.return < minReturn) minReturn = Math.floor(p.return / 5) * 5;
    if (p.return > maxReturn) maxReturn = Math.ceil(p.return / 5) * 5;
  });

  // ② أبعاد الرسم
  var width = 350;
  var height = 280;
  var padding = { top: 20, right: 15, bottom: 40, left: 45 };
  var chartWidth = width - padding.left - padding.right;
  var chartHeight = height - padding.top - padding.bottom;

  // ③ التحويلات
  function xScale(risk) {
    return padding.left + ((risk - minRisk) / (maxRisk - minRisk)) * chartWidth;
  }
  function yScale(ret) {
    return padding.top + ((maxReturn - ret) / (maxReturn - minReturn)) * chartHeight;
  }

  // ④ خطوط الشبكة
  var xGridValues = [];
  var xStep = (maxRisk - minRisk) / 5;
  for (var i = 0; i <= 5; i++) {
    xGridValues.push(minRisk + xStep * i);
  }

  var yGridValues = [];
  var yStep = (maxReturn - minReturn) / 5;
  for (var j = 0; j <= 5; j++) {
    yGridValues.push(minReturn + yStep * j);
  }

  // خط الصفر للعائد
  var zeroY = yScale(0);
  // خط التذبذب 25% (فاصل المخاطرة)
  var midRisk = (minRisk + maxRisk) / 2;
  var midX = xScale(midRisk);

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + C.line + "44",
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
            📊 المخاطرة vs العائد
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 800,
          }}>
            خريطة Markowitz
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
          }}>
            عدد الأسهم
          </div>
          <div style={{
            fontSize: 18,
            fontWeight: 900,
            color: C.gold,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stocks.length}
          </div>
        </div>
      </div>

      {/* SVG */}
      <svg width={width} height={height} style={{ width: '100%', maxWidth: width }}>
        {/* خلفيات القطاعات (Quadrants) */}
        <rect 
          x={padding.left} y={padding.top} 
          width={midX - padding.left} height={zeroY - padding.top}
          fill={C.mint} fillOpacity={0.04}
        />
        <rect 
          x={midX} y={padding.top} 
          width={width - padding.right - midX} height={zeroY - padding.top}
          fill={C.amber} fillOpacity={0.04}
        />
        <rect 
          x={padding.left} y={zeroY} 
          width={midX - padding.left} height={(height - padding.bottom) - zeroY}
          fill={C.teal} fillOpacity={0.04}
        />
        <rect 
          x={midX} y={zeroY} 
          width={width - padding.right - midX} height={(height - padding.bottom) - zeroY}
          fill={C.coral} fillOpacity={0.04}
        />

        {/* خطوط الشبكة - عمودية */}
        {xGridValues.map(function(val, i) {
          return (
            <line
              key={'xgrid-' + i}
              x1={xScale(val)} y1={padding.top}
              x2={xScale(val)} y2={height - padding.bottom}
              stroke={C.line} strokeOpacity={0.15} strokeDasharray="2,3"
            />
          );
        })}

        {/* خطوط الشبكة - أفقية */}
        {yGridValues.map(function(val, i) {
          return (
            <line
              key={'ygrid-' + i}
              x1={padding.left} y1={yScale(val)}
              x2={width - padding.right} y2={yScale(val)}
              stroke={C.line} strokeOpacity={0.15} strokeDasharray="2,3"
            />
          );
        })}

        {/* خط الصفر للعائد */}
        <line
          x1={padding.left} y1={zeroY}
          x2={width - padding.right} y2={zeroY}
          stroke={C.smoke} strokeWidth={1} opacity={0.5}
        />

        {/* خط فاصل المخاطرة */}
        <line
          x1={midX} y1={padding.top}
          x2={midX} y2={height - padding.bottom}
          stroke={C.smoke} strokeWidth={1} opacity={0.3} strokeDasharray="4,3"
        />

        {/* Y-Axis Labels */}
        {yGridValues.map(function(val, i) {
          return (
            <text
              key={'ylabel-' + i}
              x={padding.left - 5} y={yScale(val) + 3}
              textAnchor="end" fontSize={8}
              fill={C.smoke} fontFamily="IBM Plex Mono,monospace"
            >
              {val.toFixed(0)}%
            </text>
          );
        })}

        {/* X-Axis Labels */}
        {xGridValues.map(function(val, i) {
          return (
            <text
              key={'xlabel-' + i}
              x={xScale(val)} y={height - padding.bottom + 12}
              textAnchor="middle" fontSize={8}
              fill={C.smoke} fontFamily="IBM Plex Mono,monospace"
            >
              {val.toFixed(0)}%
            </text>
          );
        })}

        {/* Axis Titles */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 5}
          textAnchor="middle" fontSize={9}
          fill={C.smoke} fontWeight="bold"
        >
          ← المخاطرة (التذبذب) →
        </text>

        {/* نقاط الأسهم */}
        {stocks.map(function(stock, i) {
          var color = QUADRANT_COLORS[stock.quadrant] || C.smoke;
          var radius = Math.max(4, Math.min(10, (stock.weight || 5) / 5 + 4));
          return (
            <g key={'stock-' + i}>
              <circle
                cx={xScale(stock.risk)}
                cy={yScale(stock.return)}
                r={radius}
                fill={color}
                fillOpacity={0.7}
                stroke={color}
                strokeWidth={1.5}
              />
              <text
                x={xScale(stock.risk)}
                y={yScale(stock.return) - radius - 3}
                textAnchor="middle" fontSize={8}
                fill={color} fontWeight="bold"
              >
                {stock.sym}
              </text>
            </g>
          );
        })}

        {/* نقطة Benchmark (TASI) */}
        {benchmark && (
          <g>
            <circle
              cx={xScale(benchmark.risk)}
              cy={yScale(benchmark.return)}
              r={6}
              fill="none"
              stroke={C.smoke}
              strokeWidth={2}
              strokeDasharray="3,2"
            />
            <text
              x={xScale(benchmark.risk)}
              y={yScale(benchmark.return) + 16}
              textAnchor="middle" fontSize={8}
              fill={C.smoke} fontWeight="bold"
            >
              تاسي
            </text>
          </g>
        )}

        {/* نقطة المحفظة (الأهم) */}
        {portfolio && (
          <g>
            <circle
              cx={xScale(portfolio.risk)}
              cy={yScale(portfolio.return)}
              r={10}
              fill={C.gold}
              fillOpacity={0.3}
            />
            <circle
              cx={xScale(portfolio.risk)}
              cy={yScale(portfolio.return)}
              r={6}
              fill={C.gold}
              stroke={C.ink}
              strokeWidth={2}
              style={{
                filter: "drop-shadow(0 0 6px " + C.gold + "aa)",
              }}
            />
            <text
              x={xScale(portfolio.risk)}
              y={yScale(portfolio.return) - 12}
              textAnchor="middle" fontSize={9}
              fill={C.gold} fontWeight="bold"
            >
              محفظتك ⭐
            </text>
          </g>
        )}
      </svg>

      {/* Legend - القطاعات الأربعة */}
      <div style={{
        marginTop: 10,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
      }}>
        <div style={{
          padding: "6px 8px",
          background: C.mint + "15",
          border: "1px solid " + C.mint + "33",
          borderRadius: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: C.mint, fontWeight: 700 }}>
            🏆 نجم
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 900,
            color: C.mint,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {quadrantCounts.nirvana || 0}
          </span>
        </div>

        <div style={{
          padding: "6px 8px",
          background: C.amber + "15",
          border: "1px solid " + C.amber + "33",
          borderRadius: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: C.amber, fontWeight: 700 }}>
            ⚡ عدواني
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 900,
            color: C.amber,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {quadrantCounts.aggressive || 0}
          </span>
        </div>

        <div style={{
          padding: "6px 8px",
          background: C.teal + "15",
          border: "1px solid " + C.teal + "33",
          borderRadius: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: C.teal, fontWeight: 700 }}>
            🛡️ دفاعي
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 900,
            color: C.teal,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {quadrantCounts.defensive || 0}
          </span>
        </div>

        <div style={{
          padding: "6px 8px",
          background: C.coral + "15",
          border: "1px solid " + C.coral + "33",
          borderRadius: 6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: C.coral, fontWeight: 700 }}>
            ❌ تجنب
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 900,
            color: C.coral,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {quadrantCounts.avoid || 0}
          </span>
        </div>
      </div>

      {/* شرح */}
      <div style={{
        marginTop: 10,
        padding: "8px 10px",
        background: C.gold + "08",
        borderRadius: 8,
        fontSize: 10,
        color: C.mist,
        lineHeight: 1.5,
      }}>
        💡 النقطة الذهبية = محفظتك · الدائرة المقطّعة = تاسي
      </div>
    </div>
    );
});

export default RiskReturnScatter;