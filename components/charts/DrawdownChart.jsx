'use client';
/**
 * @module DrawdownChart
 * @description رسم بياني: منحنى Drawdown عبر الزمن
 *
 * يُظهر "أسوأ رحلة نفسية" للمستثمر
 * مع إبراز نقطة Max Drawdown
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
  electric: "#4d9fff", mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24",
};

/**
 * مكوّن منحنى Drawdown
 * SVG خفيف بدون مكتبات خارجية
 */
export default function DrawdownChart(props) {
  var chartResult = props.data || { data: [], maxDrawdown: 0 };
  var data = chartResult.data || [];
  var maxDrawdown = chartResult.maxDrawdown || 0;
  var maxDrawdownIdx = chartResult.maxDrawdownIdx || 0;
  var height = props.height || 200;

  if (!data || data.length < 2) {
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

  // ① حساب الحدود
  var minDD = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i].drawdown < minDD) minDD = data[i].drawdown;
  }
  // padding تحت الحد الأدنى
  minDD = Math.min(minDD - 2, -5);
  var maxDD = 2; // دائماً يبدأ من صفر + padding

  var range = maxDD - minDD;

  // ② أبعاد الرسم
  var width = 350;
  var padding = { top: 20, right: 10, bottom: 30, left: 50 };
  var chartWidth = width - padding.left - padding.right;
  var chartHeight = height - padding.top - padding.bottom;

  // ③ تحويل البيانات إلى إحداثيات SVG
  function xScale(index) {
    return padding.left + (index / (data.length - 1)) * chartWidth;
  }
  function yScale(value) {
    return padding.top + ((maxDD - value) / range) * chartHeight;
  }

  // ④ بناء المسار (منحنى Drawdown)
  var drawdownPath = data.map(function(d, i) {
    return (i === 0 ? 'M' : 'L') + xScale(i) + ',' + yScale(d.drawdown);
  }).join(' ');

  // ⑤ منطقة الظل (تحت المنحنى)
  var areaPath = drawdownPath + 
    ' L' + xScale(data.length - 1) + ',' + yScale(0) +
    ' L' + xScale(0) + ',' + yScale(0) + ' Z';

  // ⑥ تسميات المحور Y
  var yLabels = [];
  for (var m = 0; m <= 4; m++) {
    var val = minDD + (range * m / 4);
    yLabels.push({
      value: val,
      y: yScale(val),
      label: val.toFixed(1) + '%',
    });
  }

  // ⑦ خطوط حرجة
  var criticalLines = [
    { value: -5, label: '-5%', color: C.amber },
    { value: -10, label: '-10%', color: C.coral },
    { value: -20, label: '-20%', color: C.coral },
  ].filter(function(line) {
    return line.value >= minDD && line.value <= maxDD;
  });

  // ⑧ تصنيف Max Drawdown
  var severity, severityColor;
  if (maxDrawdown > -5) {
    severity = 'ممتاز';
    severityColor = C.mint;
  } else if (maxDrawdown > -10) {
    severity = 'جيد';
    severityColor = C.mint;
  } else if (maxDrawdown > -20) {
    severity = 'مقبول';
    severityColor = C.amber;
  } else if (maxDrawdown > -30) {
    severity = 'صعب';
    severityColor = C.coral;
  } else {
    severity = 'كارثي';
    severityColor = C.coral;
  }

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + C.coral + "22",
      padding: "14px 12px",
      marginBottom: 12,
    }}>
      {/* ── Header ── */}
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
            color: severityColor,
            lineHeight: 1,
          }}>
            {maxDrawdown.toFixed(1)}%
          </div>
          <div style={{
            fontSize: 10,
            color: severityColor,
            marginTop: 2,
            fontWeight: 700,
          }}>
            {severity}
          </div>
        </div>
      </div>

      {/* ── SVG Chart ── */}
      <svg width={width} height={height} style={{ width: '100%', maxWidth: width }}>
        {/* Grid Lines */}
        {yLabels.map(function(label, i) {
          return (
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
          );
        })}

        {/* خطوط حرجة */}
        {criticalLines.map(function(line, i) {
          return (
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
              <text
                x={width - padding.right - 2}
                y={yScale(line.value) - 2}
                textAnchor="end"
                fontSize={8}
                fill={line.color}
                fontFamily="IBM Plex Mono,monospace"
                opacity={0.6}
              >
                {line.label}
              </text>
            </g>
          );
        })}

        {/* Y-Axis Labels */}
        {yLabels.map(function(label, i) {
          return (
            <text
              key={'ylabel-' + i}
              x={padding.left - 5}
              y={label.y + 3}
              textAnchor="end"
              fontSize={9}
              fill={C.smoke}
              fontFamily="IBM Plex Mono,monospace"
            >
              {label.label}
            </text>
          );
        })}

        {/* خط الصفر (الخط الأساسي) */}
        <line
          x1={padding.left}
          y1={yScale(0)}
          x2={width - padding.right}
          y2={yScale(0)}
          stroke={C.smoke}
          strokeWidth={1}
          opacity={0.4}
        />

        {/* منطقة Drawdown (مظلّلة) */}
        <path
          d={areaPath}
          fill={C.coral}
          fillOpacity={0.15}
        />

        {/* خط Drawdown */}
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

        {/* نقطة Max Drawdown */}
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

      {/* ── Info Cards ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px solid " + C.line + "33",
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 3,
          }}>
            أقصى تراجع
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: severityColor,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {maxDrawdown.toFixed(2)}%
          </div>
        </div>

        <div style={{ 
          width: 1, 
          background: C.line + "33",
          margin: "0 8px",
        }} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 3,
          }}>
            الحالي
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: data[data.length - 1].drawdown < -5 ? C.coral 
                 : data[data.length - 1].drawdown < -2 ? C.amber 
                 : C.mint,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {data[data.length - 1].drawdown.toFixed(2)}%
          </div>
        </div>

        <div style={{ 
          width: 1, 
          background: C.line + "33",
          margin: "0 8px",
        }} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 3,
          }}>
            التصنيف
          </div>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: severityColor,
          }}>
            {severity}
          </div>
        </div>
      </div>

      {/* ── تفسير نفسي ── */}
      <div style={{
        marginTop: 10,
        padding: "8px 10px",
        background: C.coral + "08",
        borderRadius: 8,
        fontSize: 10,
        color: C.mist,
        lineHeight: 1.5,
      }}>
        💡 {maxDrawdown > -5 
          ? 'محفظتك مستقرة جداً -- يسهل الاحتفاظ بها نفسياً'
          : maxDrawdown > -10
          ? 'تراجعات طبيعية -- معظم المستثمرين يتحملون هذا المستوى'
          : maxDrawdown > -20
          ? 'يتطلب صبراً -- 80% من المستثمرين يتحملون هذا'
          : maxDrawdown > -30
          ? 'صعب نفسياً -- معظم المستثمرين يبيعون هنا'
          : 'تراجع حاد -- يتطلب تحمّل استثنائي'
        }
      </div>
    </div>
  );
}
