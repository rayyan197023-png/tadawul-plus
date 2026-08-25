'use client';
/**
 * @module MonteCarloChart
 * @description رسم توزيع نتائج Monte Carlo
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
  plasma: "#a78bfa",
};

const MonteCarloChart = React.memo(function MonteCarloChart(props) {
  const mc = props.data;

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const chartData = useMemo(() => {
    if (!mc || !mc.success) return null;

    // Dimensions
    const width = 350;
    const height = 200;
    const padding = { top: 20, right: 10, bottom: 35, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const distribution = mc.distribution || [];
    
    // Max count
    let maxCount = 1;
    distribution.forEach((d) => {
      if (d.count > maxCount) maxCount = d.count;
    });

    // X-axis bounds
    const minX = distribution.length > 0 ? distribution[0].start : -20;
    const maxX = distribution.length > 0 ? distribution[distribution.length - 1].end : 40;
    const xRange = maxX - minX || 1;

    const xScale = (value) => padding.left + ((value - minX) / xRange) * chartWidth;
    const yScale = (count) => padding.top + ((maxCount - count) / maxCount) * chartHeight;

    // Bar width
    const barWidth = distribution.length > 0 
      ? chartWidth / distribution.length 
      : 10;

    // Pre-calculate bar data with colors
    const barData = distribution.map((bin, i) => {
      const barHeight = (bin.count / maxCount) * chartHeight;
      const barX = padding.left + i * barWidth + 0.5;
      const barY = padding.top + chartHeight - barHeight;
      
      let color;
      if (bin.isNegative) {
        const negIntensity = Math.abs(bin.midpoint) / Math.abs(minX);
        color = 'rgba(255, 95, 106, ' + (0.4 + Math.min(negIntensity, 1) * 0.5) + ')';
      } else {
        const posIntensity = bin.midpoint / maxX;
        color = 'rgba(30, 230, 138, ' + (0.4 + Math.min(posIntensity, 1) * 0.5) + ')';
      }
      
      return {
        ...bin,
        barHeight,
        barX,
        barY,
        color,
      };
    });

    // Percentile lines
    const percentileLines = [
      { value: mc.returns.percentile5, label: 'P5', color: C.coral },
      { value: mc.returns.median, label: 'P50', color: C.gold },
      { value: mc.returns.percentile95, label: 'P95', color: C.mint },
    ].map((p) => ({
      ...p,
      x: xScale(p.value),
      visible: xScale(p.value) >= padding.left && xScale(p.value) <= width - padding.right,
    }));

    // X-axis labels
    const xLabels = [];
    for (let i = 0; i <= 4; i++) {
      const val = minX + (xRange * i / 4);
      xLabels.push({
        value: val,
        x: xScale(val),
        label: val.toFixed(0) + '%',
      });
    }

    // Risk color
    let riskColor = C.amber;
    if (mc.riskColor === 'mint') riskColor = C.mint;
    else if (mc.riskColor === 'coral') riskColor = C.coral;

    // Profit color
    const profitColor = mc.probabilities.profit >= 80 ? C.mint
                      : mc.probabilities.profit >= 65 ? C.teal
                      : mc.probabilities.profit >= 50 ? C.amber
                      : C.coral;

    // Range data (5 rows)
    const rangeRows = [
      { label: 'أسوأ 5% (الكارثي)', value: mc.returns.percentile5, color: C.coral },
      { label: 'أسوأ 10%', value: mc.returns.percentile10, color: C.amber },
      { label: 'الوسيط (متوقع)', value: mc.returns.median, color: C.gold, bold: true },
      { label: 'أفضل 10%', value: mc.returns.percentile90, color: C.mint },
      { label: 'أفضل 5% (مثالي)', value: mc.returns.percentile95, color: C.mint },
    ];

    return {
      width, height, padding, chartWidth, chartHeight,
      maxCount, minX, maxX, xRange,
      xScale, yScale,
      barData, percentileLines, xLabels,
      riskColor, profitColor,
      rangeRows,
    };
  }, [mc]);

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
        🎰 لا توجد نتائج Monte Carlo
      </div>
    );
  }

  const {
    width, height, padding, chartWidth, chartHeight,
    maxCount,
    xScale,
    barData, percentileLines, xLabels,
    riskColor, profitColor,
    rangeRows,
  } = chartData;

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + riskColor + "33",
      padding: "14px 12px",
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: "1px solid " + C.line + "44",
      }}>
        <div>
          <div style={{
            fontSize: 10,
            color: C.gold,
            fontWeight: 800,
            letterSpacing: "1px",
            marginBottom: 3,
          }}>
            🎰 محاكاة Monte Carlo
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 900,
          }}>
            {mc.iterations.toLocaleString()} سيناريو
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 24,
            fontWeight: 900,
            color: profitColor,
            lineHeight: 1,
          }}>
            {mc.probabilities.profit}%
          </div>
          <div style={{
            fontSize: 10,
            color: C.smoke,
            marginTop: 2,
          }}>
            احتمالية الربح
          </div>
        </div>
      </div>

      {/* Risk Rating */}
      <div style={{
        padding: "6px 10px",
        background: riskColor + "15",
        border: "1px solid " + riskColor + "33",
        borderRadius: 8,
        marginBottom: 10,
        textAlign: "center",
      }}>
        <span style={{
          fontSize: 11,
          color: riskColor,
          fontWeight: 800,
        }}>
          {mc.riskLabel}
        </span>
      </div>

      {/* SVG Histogram */}
      <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', maxWidth: width, display: 'block' }}>
        {/* Grid Lines */}
        {[0, 1, 2, 3].map((i) => {
          const y = padding.top + (chartHeight / 4) * i;
          return (
            <line
              key={'grid-' + i}
              x1={padding.left} y1={y}
              x2={width - padding.right} y2={y}
              stroke={C.line}
              strokeOpacity={0.1}
              strokeDasharray="2,3"
            />
          );
        })}

        {/* Histogram Bars */}
        {barData.map((bar, i) => (
          <rect
            key={'bar-' + i}
            x={bar.barX}
            y={bar.barY}
            width={Math.max(1, (chartWidth / barData.length) - 1)}
            height={bar.barHeight}
            fill={bar.color}
            stroke={bar.isNegative ? C.coral : C.mint}
            strokeOpacity={0.3}
            strokeWidth={0.5}
          />
        ))}

        {/* Zero Line */}
        <line
          x1={xScale(0)} y1={padding.top}
          x2={xScale(0)} y2={height - padding.bottom}
          stroke={C.smoke}
          strokeWidth={1.5}
          opacity={0.5}
          strokeDasharray="3,2"
        />

        {/* Percentile Lines */}
        {percentileLines.map((p, i) => {
          if (!p.visible) return null;
          
          return (
            <g key={'perc-' + i}>
              <line
                x1={p.x} y1={padding.top}
                x2={p.x} y2={height - padding.bottom}
                stroke={p.color}
                strokeWidth={2}
                strokeDasharray="4,3"
              />
              <text
                x={p.x}
                y={padding.top - 3}
                textAnchor="middle"
                fontSize={8}
                fill={p.color}
                fontWeight="bold"
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {/* X-Axis Labels */}
        {xLabels.map((label, i) => (
          <text
            key={'xlabel-' + i}
            x={label.x}
            y={height - padding.bottom + 12}
            textAnchor="middle"
            fontSize={8}
            fill={C.smoke}
            fontFamily="IBM Plex Mono,monospace"
          >
            {label.label}
          </text>
        ))}

        {/* Y-Axis Label */}
        <text
          x={padding.left - 5}
          y={padding.top + 5}
          textAnchor="end"
          fontSize={8}
          fill={C.smoke}
        >
          {maxCount}
        </text>

        {/* Title */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 3}
          textAnchor="middle"
          fontSize={9}
          fill={C.smoke}
          fontWeight="bold"
        >
          العائد السنوي المحتمل
        </text>
      </svg>

      {/* 📊 Range */}
      <div style={{
        marginTop: 12,
        padding: "10px 12px",
        background: C.void + "88",
        borderRadius: 10,
        border: "1px solid " + C.line + "22",
      }}>
        <div style={{
          fontSize: 10,
          color: C.gold,
          fontWeight: 800,
          letterSpacing: "1px",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid " + C.line + "22",
        }}>
          📊 نطاق العائد السنوي
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {rangeRows.map((row, i) => (
            <div key={'range-' + i} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "4px 6px",
              background: row.bold ? row.color + "12" : "transparent",
              borderRadius: 4,
              borderLeft: row.bold ? "2px solid " + row.color : "none",
            }}>
              <span style={{
                fontSize: 10,
                color: C.smoke,
                fontWeight: row.bold ? 800 : 600,
              }}>
                {row.label}
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 900,
                color: row.color,
                fontFamily: "IBM Plex Mono,monospace",
              }}>
                {row.value >= 0 ? '+' : ''}{row.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 💰 Probabilities */}
      <div style={{
        marginTop: 10,
        padding: "10px 12px",
        background: C.void + "88",
        borderRadius: 10,
        border: "1px solid " + C.line + "22",
      }}>
        <div style={{
          fontSize: 10,
          color: C.plasma,
          fontWeight: 800,
          letterSpacing: "1px",
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: "1px solid " + C.line + "22",
        }}>
          💰 احتماليات رأس المال
        </div>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
        }}>
          <div style={{
            padding: "6px 8px",
            background: C.mint + "15",
            border: "1px solid " + C.mint + "33",
            borderRadius: 6,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 8, color: C.mint, fontWeight: 700, marginBottom: 2 }}>
              ✅ ربح
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 900,
              color: C.mint,
              fontFamily: "IBM Plex Mono,monospace",
            }}>
              {mc.probabilities.profit}%
            </div>
          </div>

          <div style={{
            padding: "6px 8px",
            background: C.coral + "15",
            border: "1px solid " + C.coral + "33",
            borderRadius: 6,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 8, color: C.coral, fontWeight: 700, marginBottom: 2 }}>
              ❌ خسارة
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 900,
              color: C.coral,
              fontFamily: "IBM Plex Mono,monospace",
            }}>
              {mc.probabilities.loss}%
            </div>
          </div>

          <div style={{
            padding: "6px 8px",
            background: C.gold + "15",
            border: "1px solid " + C.gold + "33",
            borderRadius: 6,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 8, color: C.gold, fontWeight: 700, marginBottom: 2 }}>
              🚀 مضاعفة المال
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 900,
              color: C.gold,
              fontFamily: "IBM Plex Mono,monospace",
            }}>
              {mc.probabilities.doubleMoney}%
            </div>
          </div>

          <div style={{
            padding: "6px 8px",
            background: C.coral + "10",
            border: "1px solid " + C.coral + "22",
            borderRadius: 6,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 8, color: C.coral, fontWeight: 700, marginBottom: 2 }}>
              ⚠️ خسارة النصف
            </div>
            <div style={{
              fontSize: 14,
              fontWeight: 900,
              color: C.coral,
              fontFamily: "IBM Plex Mono,monospace",
            }}>
              {mc.probabilities.halfMoney}%
            </div>
          </div>
        </div>
      </div>

      {/* 💡 Interpretation */}
      {mc.interpretation && mc.interpretation.length > 0 && (
        <div style={{
          marginTop: 10,
          padding: "10px 12px",
          background: riskColor + "10",
          border: "1px solid " + riskColor + "33",
          borderRadius: 10,
        }}>
          <div style={{
            fontSize: 10,
            color: riskColor,
            fontWeight: 800,
            letterSpacing: "1px",
            marginBottom: 8,
          }}>
            💡 التفسير الذكي
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {mc.interpretation.map((point, i) => (
              <div key={'interp-' + i} style={{
                fontSize: 11,
                color: C.mist,
                padding: "3px 0",
                lineHeight: 1.5,
              }}>
                {point}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Custom comparison
  if (prev.data === next.data) return true;
  return false;
});

MonteCarloChart.displayName = 'MonteCarloChart';

export default MonteCarloChart;
