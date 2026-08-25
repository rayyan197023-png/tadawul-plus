'use client';
/**
 * @module VaRDistributionChart
 * @description رسم توزيع العوائد مع خطوط VaR و CVaR
 *
 * ✨ V2.0 - Performance Optimized:
 * - useMemo for all heavy calculations
 * - Custom comparison
 * - Modern JS
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

const VaRDistributionChart = React.memo(function VaRDistributionChart(props) {
  const data = props.data || { bins: [], stats: {} };
  const bins = data.bins || [];
  const stats = data.stats || {};

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const chartData = useMemo(() => {
    if (!bins || bins.length < 3) return null;

    const width = 350;
    const height = 220;
    const padding = { top: 20, right: 10, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Max count
    let maxCount = 1;
    bins.forEach((b) => {
      if (b.count > maxCount) maxCount = b.count;
    });

    const barWidth = chartWidth / bins.length;
    const barGap = 1;

    // X-axis bounds
    const minX = bins[0].start;
    const maxX = bins[bins.length - 1].end;
    const xRange = maxX - minX;

    const xScale = (value) => padding.left + ((value - minX) / xRange) * chartWidth;
    const yScale = (count) => padding.top + ((maxCount - count) / maxCount) * chartHeight;

    // Critical lines positions
    const varX = xScale(-stats.var95);
    const cvarX = xScale(-stats.cvar95);
    const meanX = xScale(stats.mean);

    // X-Axis Labels (5)
    const xLabels = [];
    for (let i = 0; i <= 4; i++) {
      const val = minX + (xRange * i / 4);
      xLabels.push({
        value: val,
        x: xScale(val),
        label: val.toFixed(1) + '%',
      });
    }

    // Y-Axis Labels
    const yLabels = [];
    const yStep = Math.ceil(maxCount / 4);
    for (let j = 0; j <= 4; j++) {
      const count = j * yStep;
      yLabels.push({
        count: count,
        y: yScale(count),
        label: count.toString(),
      });
    }

    // Pre-calculate bar data with colors
    const barData = bins.map((bin, i) => {
      const barHeight = (bin.count / maxCount) * chartHeight;
      const barX = padding.left + i * barWidth + barGap / 2;
      const barY = padding.top + chartHeight - barHeight;
      
      let color;
      if (bin.isNegative) {
        const negIntensity = Math.abs(bin.midpoint) / Math.abs(minX);
        color = 'rgba(255, 95, 106, ' + (0.4 + negIntensity * 0.5) + ')';
      } else {
        const posIntensity = bin.midpoint / maxX;
        color = 'rgba(30, 230, 138, ' + (0.4 + posIntensity * 0.5) + ')';
      }
      
      return { ...bin, barHeight, barX, barY, barWidth, color };
    });

    return {
      width, height, padding, chartWidth, chartHeight,
      maxCount, barWidth, barGap, minX, maxX, xRange,
      xScale, yScale, varX, cvarX, meanX,
      xLabels, yLabels, barData,
    };
  }, [bins, stats.var95, stats.cvar95, stats.mean]);

  // ═══════════════════════════════════════════════
  // ✨ Stats colors - memoized
  // ═══════════════════════════════════════════════
  
  const statsColors = useMemo(() => ({
    positiveDaysPct: stats.positiveDaysPct >= 55 ? C.mint 
                   : stats.positiveDaysPct >= 45 ? C.amber 
                   : C.coral,
    mean: stats.mean >= 0 ? C.mint : C.coral,
  }), [stats.positiveDaysPct, stats.mean]);

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
        📊 بيانات غير كافية لتوزيع VaR
      </div>
    );
  }

  const {
    width, height, padding, chartWidth,
    xScale, yScale, varX, cvarX, meanX,
    xLabels, yLabels, barData, barGap,
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
            📊 توزيع العوائد اليومية
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 800,
          }}>
            VaR Distribution
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 2,
          }}>
            معدل الأيام الإيجابية
          </div>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 18,
            fontWeight: 900,
            color: statsColors.positiveDaysPct,
            lineHeight: 1,
          }}>
            {stats.positiveDaysPct}%
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', maxWidth: width, display: 'block' }}>
        {/* Grid Lines */}
        {yLabels.map((label, i) => (
          <line
            key={'ygrid-' + i}
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
            key={'ylabel-' + i}
            x={padding.left - 5}
            y={label.y + 3}
            textAnchor="end"
            fontSize={8}
            fill={C.smoke}
            fontFamily="IBM Plex Mono,monospace"
          >
            {label.label}
          </text>
        ))}

        {/* Histogram Bars */}
        {barData.map((bar, i) => (
          <rect
            key={'bar-' + i}
            x={bar.barX}
            y={bar.barY}
            width={bar.barWidth - barGap}
            height={bar.barHeight}
            fill={bar.color}
            stroke={bar.isNegative ? C.coral : C.mint}
            strokeOpacity={0.3}
            strokeWidth={0.5}
          />
        ))}

        {/* Zero Line */}
        <line
          x1={xScale(0)}
          y1={padding.top}
          x2={xScale(0)}
          y2={height - padding.bottom}
          stroke={C.smoke}
          strokeWidth={1.5}
          opacity={0.6}
          strokeDasharray="3,2"
        />

        {/* VaR 95% Line */}
        <line
          x1={varX}
          y1={padding.top}
          x2={varX}
          y2={height - padding.bottom}
          stroke={C.amber}
          strokeWidth={2}
          strokeDasharray="5,3"
        />
        <text
          x={varX}
          y={padding.top - 3}
          textAnchor="middle"
          fontSize={8}
          fill={C.amber}
          fontWeight="bold"
        >
          VaR
        </text>

        {/* CVaR 95% Line */}
        <line
          x1={cvarX}
          y1={padding.top}
          x2={cvarX}
          y2={height - padding.bottom}
          stroke={C.coral}
          strokeWidth={2}
          strokeDasharray="5,3"
        />
        <text
          x={cvarX}
          y={padding.top + 10}
          textAnchor="middle"
          fontSize={8}
          fill={C.coral}
          fontWeight="bold"
        >
          CVaR
        </text>

        {/* Mean Line */}
        <line
          x1={meanX}
          y1={padding.top}
          x2={meanX}
          y2={height - padding.bottom}
          stroke={C.gold}
          strokeWidth={1.5}
          opacity={0.7}
        />
        <text
          x={meanX}
          y={height - padding.bottom + 25}
          textAnchor="middle"
          fontSize={8}
          fill={C.gold}
          fontWeight="bold"
        >
          μ
        </text>

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

        {/* Title */}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 3}
          textAnchor="middle"
          fontSize={9}
          fill={C.smoke}
          fontWeight="bold"
        >
          العائد اليومي
        </text>
      </svg>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6,
        marginTop: 10,
      }}>
        <div style={{
          background: C.gold + "15",
          border: "1px solid " + C.gold + "33",
          borderRadius: 8,
          padding: "6px 8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 8, color: C.gold, fontWeight: 700, marginBottom: 2 }}>
            المتوسط μ
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 900,
            color: statsColors.mean,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.mean >= 0 ? '+' : ''}{stats.mean}%
          </div>
        </div>

        <div style={{
          background: C.amber + "15",
          border: "1px solid " + C.amber + "33",
          borderRadius: 8,
          padding: "6px 8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 8, color: C.amber, fontWeight: 700, marginBottom: 2 }}>
            VaR 95%
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 900,
            color: C.amber,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            -{stats.var95}%
          </div>
        </div>

        <div style={{
          background: C.coral + "15",
          border: "1px solid " + C.coral + "33",
          borderRadius: 8,
          padding: "6px 8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 8, color: C.coral, fontWeight: 700, marginBottom: 2 }}>
            CVaR 95%
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 900,
            color: C.coral,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            -{stats.cvar95}%
          </div>
        </div>
      </div>

      {/* Extra Stats */}
      <div style={{
        marginTop: 8,
        padding: "8px 10px",
        background: C.void + "88",
        borderRadius: 8,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 6,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.smoke, marginBottom: 2 }}>σ</div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: C.snow,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.stdDev}%
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.smoke, marginBottom: 2 }}>الأيام</div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: C.snow,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.totalDays}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.mint, marginBottom: 2 }}>↑ رابحة</div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: C.mint,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.positiveDays}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.coral, marginBottom: 2 }}>↓ خاسرة</div>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            color: C.coral,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.negativeDays}
          </div>
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
        💡 في 95% من الأيام، خسارتك اليومية ≤ {stats.var95}%
        {stats.skewness > 0.5 && ' · التوزيع مائل إيجابياً (أرباح كبيرة نادرة)'}
        {stats.skewness < -0.5 && ' · التوزيع مائل سلبياً (خسائر كبيرة محتملة) ⚠️'}
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison
  if (prev.data === next.data) return true;
  if (!prev.data || !next.data) return false;
  
  // Compare bins reference
  if (prev.data.bins !== next.data.bins) return false;
  
  // Compare key stats
  const ps = prev.data.stats || {};
  const ns = next.data.stats || {};
  if (ps.var95 !== ns.var95) return false;
  if (ps.cvar95 !== ns.cvar95) return false;
  if (ps.mean !== ns.mean) return false;
  
  return true;
});

VaRDistributionChart.displayName = 'VaRDistributionChart';

export default VaRDistributionChart;
