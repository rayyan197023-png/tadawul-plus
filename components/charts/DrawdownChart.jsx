'use client';
/**
 * @module DrawdownChart
 * @description رسم بياني: منحنى Drawdown عبر الزمن
 * 
 * ✨ V2.0 - Performance Optimized:
 * - useMemo for heavy calculations
 * - Custom memo comparison
 * - Modern JS (const/let)
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
  electric: "#4d9fff", mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24",
};

/**
 * مكوّن منحنى Drawdown
 * SVG خفيف بدون مكتبات خارجية
 */
const DrawdownChart = React.memo(function DrawdownChart(props) {
  const chartResult = props.data || { data: [], maxDrawdown: 0 };
  const data = chartResult.data || [];
  const maxDrawdown = chartResult.maxDrawdown || 0;
  const maxDrawdownIdx = chartResult.maxDrawdownIdx || 0;
  const height = props.height || 200;

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const chartData = useMemo(() => {
    if (!data || data.length < 2) return null;

    // ① حساب الحدود
    let minDD = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i].drawdown < minDD) minDD = data[i].drawdown;
    }
    minDD = Math.min(minDD - 2, -5);
    const maxDD = 2;
    const range = maxDD - minDD;

    // ② أبعاد الرسم
    const width = 350;
    const padding = { top: 20, right: 10, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // ③ تحويل البيانات
    const xScale = (index) => padding.left + (index / (data.length - 1)) * chartWidth;
    const yScale = (value) => padding.top + ((maxDD - value) / range) * chartHeight;

    // ④ بناء المسار
    const drawdownPath = data.map((d, i) => 
      (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(d.drawdown)
    ).join(' ');

    // ⑤ منطقة الظل
    const areaPath = drawdownPath + 
      ' L' + xScale(data.length - 1) + ',' + yScale(0) +
      ' L' + xScale(0) + ',' + yScale(0) + ' Z';

    // ⑥ تسميات Y
    const yLabels = [];
    for (let m = 0; m <= 4; m++) {
      const val = minDD + (range * m / 4);
      yLabels.push({
        value: val,
        y: yScale(val),
        label: val.toFixed(1) + '%',
      });
    }

    // ⑦ خطوط حرجة
    const criticalLines = [
      { value: -5, label: '-5%', color: C.amber },
      { value: -10, label: '-10%', color: C.coral },
      { value: -20, label: '-20%', color: C.coral },
    ].filter((line) => line.value >= minDD && line.value <= maxDD);

    return {
      width, height, padding, chartWidth, chartHeight,
      minDD, maxDD, range,
      xScale, yScale,
      drawdownPath, areaPath,
      yLabels, criticalLines,
    };
  }, [data, height]);

  // ═══════════════════════════════════════════════
  // ✨ Severity classification - memoized
  // ═══════════════════════════════════════════════
  
  const severityInfo = useMemo(() => {
    if (maxDrawdown > -5) return { severity: 'ممتاز', color: C.mint };
    if (maxDrawdown > -10) return { severity: 'جيد', color: C.mint };
    if (maxDrawdown > -20) return { severity: 'مقبول', color: C.amber };
    if (maxDrawdown > -30) return { severity: 'صعب', color: C.coral };
    return { severity: 'كارثي', color: C.coral };
  }, [maxDrawdown]);

  // ═══════════════════════════════════════════════
  // ✨ Psychological message - memoized
  // ═══════════════════════════════════════════════
  
  const psychMessage = useMemo(() => {
    if (maxDrawdown > -5) return 'محفظتك مستقرة جداً -- يسهل الاحتفاظ بها نفسياً';
    if (maxDrawdown > -10) return 'تراجعات طبيعية -- معظم المستثمرين يتحملون هذا المستوى';
    if (maxDrawdown > -20) return 'يتطلب صبراً -- 80% من المستثمرين يتحملون هذا';
    if (maxDrawdown > -30) return 'صعب نفسياً -- معظم المستثمرين يبيعون هنا';
    return 'تراجع حاد -- يتطلب تحمّل استثنائي';
  }, [maxDrawdown]);

  // ═══════════════════════════════════════════════
  // 🎨 Empty state
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
        📉 بيانات غير كافية لمنحنى Drawdown
      </div>
    );
  }

  const {
    width, padding,
    xScale, yScale,
    drawdownPath, areaPath,
    yLabels, criticalLines,
  } = chartData;

  // ═══════════════════════════════════════════════
  // 🎨 Render
  // ═══════════════════════════════════════════════
  
  const currentDrawdown = data[data.length - 1].drawdown;
  const currentColor = currentDrawdown < -5 ? C.coral 
                     : currentDrawdown < -2 ? C.amber 
                     : C.mint;

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + C.coral + "22",
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
            color: C.coral,
            fontWeight: 700,
            letterSpacing: "1px",
            marginBottom: 3,
          }}>
            📉 أسوأ تراجع تاريخي
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 800,
          }}>
            Maximum Drawdown
          </div>
        </div>
        
        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 18,
            fontWeight: 900,
            color: severityInfo.color,
            lineHeight: 1,
          }}>
            {maxDrawdown.toFixed(1)}%
          </div>
          <div style={{
            fontSize: 10,
            color: severityInfo.color,
            marginTop: 2,
            fontWeight: 700,
          }}>
            {severityInfo.severity}
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} style={{ width: '100%', maxWidth: width, display: 'block' }}>

        {/* Grid Lines */}
        {yLabels.map((label, i) => (
          <line
            key={'grid-' + i}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke={C.line}
            strokeOpacity={0.15}
            strokeDasharray="2,3"
          />
        ))}

        {/* Critical Lines */}
        {criticalLines.map((line, i) => (
          <g key={'critical-' + i}>
            <line
              x1={padding.left}
              y1={yScale(line.value)}
              x2={width - padding.right}
              y2={yScale(line.value)}
              stroke={line.color}
              strokeOpacity={0.3}
              strokeDasharray="3,4"
              strokeWidth={1}
            />
            {/* ✨ الملصق داخل صندوق صغير عند الحافة اليسرى -- يمنع التراكب مع الخط الأحمر */}
            <rect
              x={width - padding.right - 32}
              y={yScale(line.value) - 9}
              width={30}
              height={11}
              rx={3}
              fill={C.ink}
              fillOpacity={0.75}
            />
            <text
              x={width - padding.right - 17}
              y={yScale(line.value) - 1}
              textAnchor="middle"
              fontSize={8}
              fill={line.color}
              fontFamily="IBM Plex Mono,monospace"
              fontWeight="bold"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Y-Axis Labels */}
        {yLabels.map((label, i) => (
          <g key={'ylabel-' + i}>
            <rect
              x={2}
              y={label.y - 7}
              width={padding.left - 6}
              height={11}
              fill={C.layer1}
              fillOpacity={0.85}
            />
            <text
              x={padding.left - 5}
              y={label.y + 3}
              textAnchor="end"
              fontSize={9}
              fill={C.smoke}
              fontFamily="IBM Plex Mono,monospace"
            >
              {label.label}
            </text>
          </g>
        ))}

        {/* Zero Line */}
        <line
          x1={padding.left}
          y1={yScale(0)}
          x2={width - padding.right}
          y2={yScale(0)}
          stroke={C.smoke}
          strokeWidth={1}
          opacity={0.4}
        />

        {/* Drawdown Area */}
        <path
          d={areaPath}
          fill={C.coral}
          fillOpacity={0.15}
        />

        {/* Drawdown Line */}
        <path
          d={drawdownPath}
          fill="none"
          stroke={C.coral}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: "drop-shadow(0 0 3px " + C.coral + "88)",
          }}
        />

        {/* Max Drawdown Point */}
        {data[maxDrawdownIdx] && (
          <g>
            <circle
              cx={xScale(maxDrawdownIdx)}
              cy={yScale(data[maxDrawdownIdx].drawdown)}
              r={5}
              fill={C.coral}
              stroke={C.ink}
              strokeWidth={2}
            />
            <text
              x={xScale(maxDrawdownIdx)}
              y={yScale(data[maxDrawdownIdx].drawdown) + 18}
              textAnchor="middle"
              fontSize={9}
              fill={C.coral}
              fontFamily="IBM Plex Mono,monospace"
              fontWeight="bold"
            >
              {data[maxDrawdownIdx].drawdown.toFixed(1)}%
            </text>
          </g>
        )}

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

      {/* Info Cards */}
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid " + C.line + "33",
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 9, color: C.smoke, marginBottom: 3 }}>أقصى تراجع</div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: severityInfo.color,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {maxDrawdown.toFixed(2)}%
          </div>
        </div>

        <div style={{ width: 1, background: C.line + "33", margin: "0 8px" }} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 9, color: C.smoke, marginBottom: 3 }}>الحالي</div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: currentColor,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {currentDrawdown.toFixed(2)}%
          </div>
        </div>

        <div style={{ width: 1, background: C.line + "33", margin: "0 8px" }} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 9, color: C.smoke, marginBottom: 3 }}>التصنيف</div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: severityInfo.color,
          }}>
            {severityInfo.severity}
          </div>
        </div>
      </div>

      {/* Psychological Insight */}
      <div style={{
        marginTop: 10,
        padding: "8px 10px",
        background: C.coral + "08",
        borderRadius: 8,
        fontSize: 10,
        color: C.mist,
        lineHeight: 1.5,
      }}>
        💡 {psychMessage}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // ✨ Custom comparison for deep memo
  if (prevProps.height !== nextProps.height) return false;
  
  const prev = prevProps.data;
  const next = nextProps.data;
  
  if (!prev && !next) return true;
  if (!prev || !next) return false;
  
  // Compare key fields
  if (prev.maxDrawdown !== next.maxDrawdown) return false;
  if (prev.maxDrawdownIdx !== next.maxDrawdownIdx) return false;
  if (prev.data?.length !== next.data?.length) return false;
  
  // Quick reference check
  return prev.data === next.data;
});

DrawdownChart.displayName = 'DrawdownChart';

export default DrawdownChart;
