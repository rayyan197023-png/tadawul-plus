'use client';
/**
 * @module PortfolioValueChart
 * @description رسم بياني: قيمة المحفظة عبر الزمن مع مقارنة TASI
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
  electric: "#4d9fff", mint: "#1ee68a", coral: "#ff5f6a",
};

const PortfolioValueChart = React.memo(function PortfolioValueChart(props) {
  const data = props.data || [];
  const height = props.height || 200;

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const chartData = useMemo(() => {
    if (!data || data.length < 2) return null;

    // ① Bounds
    const allValues = data.flatMap((d) => [d.portfolio, d.benchmark]);
    let minVal = Math.min.apply(null, allValues);
    let maxVal = Math.max.apply(null, allValues);
    let range = maxVal - minVal || 1;
    
    minVal -= range * 0.05;
    maxVal += range * 0.05;
    range = maxVal - minVal;

    // ② Dimensions
    const width = 350;
    const padding = { top: 20, right: 10, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // ③ Scaling
    const xScale = (index) => padding.left + (index / (data.length - 1)) * chartWidth;
    const yScale = (value) => padding.top + ((maxVal - value) / range) * chartHeight;

    // ④ Paths
    const portfolioPath = data.map((d, i) => 
      (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(d.portfolio)
    ).join(' ');

    const benchmarkPath = data.map((d, i) => 
      (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(d.benchmark)
    ).join(' ');

    // ⑤ Alpha zone
    const alphaPathTop = data.map((d, i) => 
      (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(d.portfolio)
    ).join(' ');
    
    const alphaPathBottom = data.slice().reverse().map((d, i) => {
      const originalIdx = data.length - 1 - i;
      return 'L' + xScale(originalIdx) + ',' + yScale(d.benchmark);
    }).join(' ');
    
    const alphaArea = alphaPathTop + ' ' + alphaPathBottom + ' Z';

    // ⑥ Changes
    const startPortfolio = data[0].portfolio;
    const endPortfolio = data[data.length - 1].portfolio;
    const portfolioChange = ((endPortfolio - startPortfolio) / startPortfolio) * 100;
    
    const startTasi = data[0].benchmark;
    const endTasi = data[data.length - 1].benchmark;
    const tasiChange = ((endTasi - startTasi) / startTasi) * 100;
    
    const alpha = portfolioChange - tasiChange;

    // ⑦ Y-Axis labels
    const yLabels = [];
    for (let i = 0; i <= 4; i++) {
      const val = minVal + (range * i / 4);
      yLabels.push({
        value: val,
        y: yScale(val),
        label: val >= 1000 ? (val / 1000).toFixed(1) + 'K' : val.toFixed(0),
      });
    }

    return {
      width, height, padding,
      xScale, yScale,
      portfolioPath, benchmarkPath, alphaArea,
      endPortfolio, portfolioChange, tasiChange, alpha,
      yLabels,
    };
  }, [data, height]);

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
      }}>
        📊 بيانات غير كافية للرسم البياني
      </div>
    );
  }

  const {
    width, padding,
    xScale, yScale,
    portfolioPath, benchmarkPath, alphaArea,
    endPortfolio, portfolioChange, tasiChange, alpha,
    yLabels,
  } = chartData;

  const portfolioColor = portfolioChange >= 0 ? C.mint : C.coral;
  const alphaColor = alpha >= 0 ? C.mint : C.coral;

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
        marginBottom: 10,
      }}>
        <div>
          <div style={{
            fontSize: 10,
            color: C.gold,
            fontWeight: 700,
            letterSpacing: "1px",
            marginBottom: 3,
          }}>
            📈 أداء المحفظة
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 800,
          }}>
            آخر {data.length} يوم
          </div>
        </div>
        
        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 18,
            fontWeight: 900,
            color: portfolioColor,
            lineHeight: 1,
          }}>
            {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}%
          </div>
          <div style={{
            fontSize: 10,
            color: C.smoke,
            marginTop: 2,
          }}>
            محفظتك
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <svg width={width} height={height} style={{ width: '100%', maxWidth: width }}>
        {/* Grid Lines */}
        {yLabels.map((label, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke={C.line}
            strokeOpacity={0.15}
            strokeDasharray="2,3"
          />
        ))}

        {/* Y-Axis Labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 5}
            y={label.y + 3}
            textAnchor="end"
            fontSize={9}
            fill={C.smoke}
            fontFamily="IBM Plex Mono,monospace"
          >
            {label.label}
          </text>
        ))}

        {/* Alpha Zone */}
        <path
          d={alphaArea}
          fill={alpha >= 0 ? C.mint : C.coral}
          fillOpacity={0.08}
        />

        {/* Benchmark Line */}
        <path
          d={benchmarkPath}
          fill="none"
          stroke={C.smoke}
          strokeWidth={1.5}
          strokeDasharray="4,3"
          opacity={0.6}
        />

        {/* Portfolio Line */}
        <path
          d={portfolioPath}
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
          cx={xScale(data.length - 1)}
          cy={yScale(endPortfolio)}
          r={4}
          fill={C.gold}
          stroke={C.ink}
          strokeWidth={2}
        />

        {/* X-Axis Labels */}
        <text
          x={padding.left}
          y={height - 10}
          fontSize={9}
          fill={C.smoke}
          textAnchor="start"
        >
          {data[0].dateLabel}
        </text>
        <text
          x={width - padding.right}
          y={height - 10}
          fontSize={9}
          fill={C.smoke}
          textAnchor="end"
        >
          {data[data.length - 1].dateLabel}
        </text>
      </svg>

      {/* Legend & Stats */}
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid " + C.line + "33",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            justifyContent: "center",
            marginBottom: 3,
          }}>
            <div style={{
              width: 12,
              height: 2,
              background: C.gold,
              borderRadius: 1,
            }} />
            <span style={{ fontSize: 9, color: C.smoke }}>محفظتك</span>
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: portfolioColor,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(1)}%
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            justifyContent: "center",
            marginBottom: 3,
          }}>
            <div style={{
              width: 12,
              height: 2,
              background: C.smoke,
              borderRadius: 1,
              opacity: 0.6,
            }} />
            <span style={{ fontSize: 9, color: C.smoke }}>تاسي</span>
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: tasiChange >= 0 ? C.mint : C.coral,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {tasiChange >= 0 ? '+' : ''}{tasiChange.toFixed(1)}%
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 9,
            color: C.gold,
            fontWeight: 700,
            marginBottom: 3,
          }}>
            Alpha
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: alphaColor,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {alpha >= 0 ? '+' : ''}{alpha.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison
  if (prev.data !== next.data) return false;
  if (prev.height !== next.height) return false;
  return true;
});

PortfolioValueChart.displayName = 'PortfolioValueChart';

export default PortfolioValueChart;
