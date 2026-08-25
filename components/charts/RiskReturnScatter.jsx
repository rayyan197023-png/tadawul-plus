'use client';
/**
 * @module RiskReturnScatter
 * @description رسم Risk-Return Scatter Plot
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
  electric: "#4d9fff", plasma: "#a78bfa",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
};

const QUADRANT_COLORS = {
  nirvana: C.mint,
  aggressive: C.amber,
  defensive: C.teal,
  avoid: C.coral,
};

const QUADRANT_LABELS = {
  nirvana: '🏆 نجم',
  aggressive: '⚡ عدواني',
  defensive: '🛡️ دفاعي',
  avoid: '❌ تجنب',
};

const RiskReturnScatter = React.memo(function RiskReturnScatter(props) {
  const data = props.data || { stocks: [], portfolio: null, benchmark: null };
  const stocks = data.stocks || [];
  const portfolio = data.portfolio;
  const benchmark = data.benchmark;
  const quadrantCounts = data.quadrantCounts || {};

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const chartData = useMemo(() => {
    if (!stocks || stocks.length < 1) return null;

    // ① Bounds
    const allPoints = stocks.slice();
    if (portfolio) allPoints.push(portfolio);
    if (benchmark) allPoints.push(benchmark);

    let minRisk = 0;
    let maxRisk = 40;
    let minReturn = -20;
    let maxReturn = 40;

    allPoints.forEach((p) => {
      if (p.risk < minRisk) minRisk = Math.floor(p.risk / 5) * 5;
      if (p.risk > maxRisk) maxRisk = Math.ceil(p.risk / 5) * 5;
      if (p.return < minReturn) minReturn = Math.floor(p.return / 5) * 5;
      if (p.return > maxReturn) maxReturn = Math.ceil(p.return / 5) * 5;
    });

    // ✨ هامش أمان -- يمنع رسم النقاط (والنصوص الملصقة بها) على حافة الرسم تماماً
    var riskPad = Math.max(5, (maxRisk - minRisk) * 0.12);
    var returnPad = Math.max(5, (maxReturn - minReturn) * 0.12);
    maxRisk = Math.ceil((maxRisk + riskPad) / 5) * 5;
    minRisk = Math.max(0, Math.floor((minRisk - riskPad * 0.3) / 5) * 5);
    maxReturn = Math.ceil((maxReturn + returnPad) / 5) * 5;
    minReturn = Math.floor((minReturn - returnPad) / 5) * 5;

    // ② Dimensions
    const width = 350;
    const height = 280;
    const padding = { top: 20, right: 15, bottom: 40, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // ③ Scaling
    const xScale = (risk) => padding.left + ((risk - minRisk) / (maxRisk - minRisk)) * chartWidth;
    const yScale = (ret) => padding.top + ((maxReturn - ret) / (maxReturn - minReturn)) * chartHeight;

    // ④ Grid values
    const xGridValues = [];
    const xStep = (maxRisk - minRisk) / 5;
    for (let i = 0; i <= 5; i++) {
      xGridValues.push(minRisk + xStep * i);
    }

    const yGridValues = [];
    const yStep = (maxReturn - minReturn) / 5;
    for (let j = 0; j <= 5; j++) {
      yGridValues.push(minReturn + yStep * j);
    }

    // ⑤ Critical lines
    const zeroY = yScale(0);
    const midRisk = (minRisk + maxRisk) / 2;
    const midX = xScale(midRisk);

    // ⑥ Pre-calculate stock points
    // ✨ clamp داخل حدود الرسم -- يمنع خروج الدائرة أو النص الملصق
    const clampX = (x) => Math.max(padding.left + 18, Math.min(width - padding.right - 18, x));
    const clampY = (y) => Math.max(padding.top + 14, Math.min(height - padding.bottom - 8, y));

    const stockPoints = stocks.map((stock) => {
      const color = QUADRANT_COLORS[stock.quadrant] || C.smoke;
      const radius = Math.max(4, Math.min(10, (stock.weight || 5) / 5 + 4));
      return {
        ...stock,
        x: clampX2(xScale(stock.risk)),
        y: clampY2(yScale(stock.return)),
        color,
        radius,
      };
    });

    // ⑦ Portfolio + Benchmark positions
    // ✨ clamp داخل حدود الرسم بهامش 18px لكل جانب -- يمنع خروج الدائرة أو النص الملصق
    const clampX = (x) => Math.max(padding.left + 18, Math.min(width - padding.right - 18, x));
    const clampY = (y) => Math.max(padding.top + 14, Math.min(height - padding.bottom - 8, y));

    const portfolioPos = portfolio ? {
      x: clampX(xScale(portfolio.risk)),
      y: clampY(yScale(portfolio.return)),
    } : null;

    const benchmarkPos = benchmark ? {
      x: clampX(xScale(benchmark.risk)),
      y: clampY(yScale(benchmark.return)),
    } : null;

    return {
      width, height, padding, chartWidth, chartHeight,
      xScale, yScale,
      xGridValues, yGridValues,
      zeroY, midX,
      stockPoints, portfolioPos, benchmarkPos,
    };
  }, [stocks, portfolio, benchmark]);

  // Empty state
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
        📊 بيانات غير كافية لـ Risk-Return Scatter
      </div>
    );
  }

  const {
    width, height, padding, chartWidth,
    xGridValues, yGridValues,
    zeroY, midX,
    stockPoints, portfolioPos, benchmarkPos,
  } = chartData;

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
      <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', maxWidth: width, display: 'block' }}>

        {/* Quadrant backgrounds */}
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

        {/* Grid - vertical */}
        {xGridValues.map((val, i) => (
          <line
            key={'xgrid-' + i}
            x1={chartData.xScale(val)} y1={padding.top}
            x2={chartData.xScale(val)} y2={height - padding.bottom}
            stroke={C.line} strokeOpacity={0.15} strokeDasharray="2,3"
          />
        ))}

        {/* Grid - horizontal */}
        {yGridValues.map((val, i) => (
          <line
            key={'ygrid-' + i}
            x1={padding.left} y1={chartData.yScale(val)}
            x2={width - padding.right} y2={chartData.yScale(val)}
            stroke={C.line} strokeOpacity={0.15} strokeDasharray="2,3"
          />
        ))}

        {/* Zero return line */}
        <line
          x1={padding.left} y1={zeroY}
          x2={width - padding.right} y2={zeroY}
          stroke={C.smoke} strokeWidth={1} opacity={0.5}
        />

        {/* Mid risk divider */}
        <line
          x1={midX} y1={padding.top}
          x2={midX} y2={height - padding.bottom}
          stroke={C.smoke} strokeWidth={1} opacity={0.3} strokeDasharray="4,3"
        />

        {/* Y-Axis Labels */}
        {yGridValues.map((val, i) => (
          <text
            key={'ylabel-' + i}
            x={padding.left - 5} y={chartData.yScale(val) + 3}
            textAnchor="end" fontSize={8}
            fill={C.smoke} fontFamily="IBM Plex Mono,monospace"
          >
            {val.toFixed(0)}%
          </text>
        ))}

        {/* X-Axis Labels */}
        {xGridValues.map((val, i) => (
          <text
            key={'xlabel-' + i}
            x={chartData.xScale(val)} y={height - padding.bottom + 12}
            textAnchor="middle" fontSize={8}
            fill={C.smoke} fontFamily="IBM Plex Mono,monospace"
          >
            {val.toFixed(0)}%
          </text>
        ))}

        {/* Axis Title */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 5}
          textAnchor="middle" fontSize={9}
          fill={C.smoke} fontWeight="bold"
        >
          ← المخاطرة (التذبذب) →
        </text>

        {/* Stock points */}
        {stockPoints.map((stock, i) => (
          <g key={'stock-' + i}>
            <circle
              cx={stock.x}
              cy={stock.y}
              r={stock.radius}
              fill={stock.color}
              fillOpacity={0.7}
              stroke={stock.color}
              strokeWidth={1.5}
            />
            <text
              x={stock.x}
              y={stock.y - stock.radius - 3}
              textAnchor="middle" fontSize={8}
              fill={stock.color} fontWeight="bold"
            >
              {stock.sym}
            </text>
          </g>
        ))}

        {/* Benchmark point */}
        {benchmarkPos && (
          <g>
            <circle
              cx={benchmarkPos.x}
              cy={benchmarkPos.y}
              r={6}
              fill="none"
              stroke={C.smoke}
              strokeWidth={2}
              strokeDasharray="3,2"
            />
            <text
              x={benchmarkPos.x}
              y={benchmarkPos.y + 16}
              textAnchor="middle" fontSize={8}
              fill={C.smoke} fontWeight="bold"
            >
              تاسي
            </text>
          </g>
        )}

        {/* Portfolio point (most important) */}
        {portfolioPos && (
          <g>
            <circle
              cx={portfolioPos.x}
              cy={portfolioPos.y}
              r={10}
              fill={C.gold}
              fillOpacity={0.3}
            />
            <circle
              cx={portfolioPos.x}
              cy={portfolioPos.y}
              r={6}
              fill={C.gold}
              stroke={C.ink}
              strokeWidth={2}
              style={{
                filter: "drop-shadow(0 0 6px " + C.gold + "aa)",
              }}
            />
            <text
              x={portfolioPos.x}
              y={portfolioPos.y - 12}
              textAnchor="middle" fontSize={9}
              fill={C.gold} fontWeight="bold"
            >
              محفظتك ⭐
            </text>
          </g>
        )}
      </svg>

      {/* Legend - 4 Quadrants */}
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

      {/* Insight */}
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
}, (prev, next) => {
  // Custom comparison
  if (prev.data === next.data) return true;
  if (!prev.data || !next.data) return false;
  if (prev.data.stocks !== next.data.stocks) return false;
  if (prev.data.portfolio !== next.data.portfolio) return false;
  if (prev.data.benchmark !== next.data.benchmark) return false;
  if (prev.data.quadrantCounts !== next.data.quadrantCounts) return false;
  return true;
});

RiskReturnScatter.displayName = 'RiskReturnScatter';

export default RiskReturnScatter;
