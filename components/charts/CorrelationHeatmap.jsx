'use client';
/**
 * @module CorrelationHeatmap
 * @description مصفوفة الارتباط الملوّنة بين أسهم المحفظة
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

// Cached outside component
function getCorrelationColor(value, isDiagonal) {
  if (isDiagonal) {
    return { bg: C.gold + "40", text: C.gold };
  }

  const absVal = Math.abs(value);

  if (value > 0.7) {
    return {
      bg: 'rgba(255, 95, 106, ' + (0.3 + absVal * 0.4) + ')',
      text: C.snow,
    };
  } else if (value > 0.4) {
    return {
      bg: 'rgba(251, 191, 36, ' + (0.2 + absVal * 0.3) + ')',
      text: absVal > 0.5 ? C.snow : C.amber,
    };
  } else if (value > -0.4) {
    return {
      bg: 'rgba(30, 230, 138, ' + (0.15 + (0.4 - absVal) * 0.3) + ')',
      text: C.mint,
    };
  } else if (value > -0.7) {
    return {
      bg: 'rgba(34, 211, 238, ' + (0.2 + absVal * 0.3) + ')',
      text: C.teal,
    };
  } else {
    return {
      bg: 'rgba(77, 159, 255, ' + (0.3 + absVal * 0.4) + ')',
      text: C.snow,
    };
  }
}

const CorrelationHeatmap = React.memo(function CorrelationHeatmap(props) {
  const data = props.data || { matrix: [], symbols: [] };
  const matrix = data.matrix || [];
  const symbols = data.symbols || [];
  const avgCorrelation = data.avgCorrelation || 0;
  const highCount = data.highCount || 0;
  const label = data.label || 'غير محدد';
  const classification = data.classification || 'unknown';

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const heatmapData = useMemo(() => {
    if (!matrix || matrix.length < 2) return null;

    // Cell size + font size
    const cellSize = Math.max(30, Math.min(50, 240 / symbols.length));
    const fontSize = symbols.length > 6 ? 8 : 10;

    // Pre-calculate all cell colors
    const rowsData = matrix.map((row, i) => ({
      i,
      symbol: symbols[i],
      cells: row.map((value, j) => {
        const isDiagonal = i === j;
        const colors = getCorrelationColor(value, isDiagonal);
        return {
          j,
          value,
          isDiagonal,
          colors,
        };
      }),
    }));

    // Classification color
    let classColor;
    if (classification === 'excellent' || classification === 'good') {
      classColor = C.mint;
    } else if (classification === 'moderate') {
      classColor = C.amber;
    } else {
      classColor = C.coral;
    }

    return {
      cellSize,
      fontSize,
      rowsData,
      classColor,
    };
  }, [matrix, symbols, classification]);

  // Empty state
  if (!heatmapData) {
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
        🔗 تحتاج سهمين على الأقل لعرض الارتباطات
      </div>
    );
  }

  const { cellSize, fontSize, rowsData, classColor } = heatmapData;

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
            🔗 مصفوفة الارتباط
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 800,
          }}>
            Correlation Matrix
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 2,
          }}>
            متوسط الارتباط
          </div>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 18,
            fontWeight: 900,
            color: classColor,
            lineHeight: 1,
          }}>
            {avgCorrelation.toFixed(2)}
          </div>
          <div style={{
            fontSize: 9,
            color: classColor,
            marginTop: 2,
            fontWeight: 700,
          }}>
            {label}
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div style={{
        overflowX: 'auto',
        paddingBottom: 4,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <table style={{
          borderCollapse: 'separate',
          borderSpacing: '2px',
          fontFamily: "IBM Plex Mono,monospace",
        }}>
          <thead>
            <tr>
              <th style={{
                width: cellSize * 0.7,
                height: cellSize * 0.6,
              }}></th>
              {symbols.map((sym, i) => (
                <th
                  key={'header-' + i}
                  style={{
                    fontSize: fontSize,
                    color: C.gold,
                    fontWeight: 700,
                    padding: '4px 2px',
                    textAlign: 'center',
                    background: C.void,
                    borderRadius: 4,
                    width: cellSize,
                    height: cellSize * 0.6,
                  }}
                >
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsData.map(({ i, symbol, cells }) => (
              <tr key={'row-' + i}>
                <td style={{
                  fontSize: fontSize,
                  fontWeight: 800,
                  color: C.gold,
                  textAlign: 'center',
                  padding: '4px',
                  background: C.void,
                  borderRadius: 4,
                }}>
                  {symbol}
                </td>
                {cells.map(({ j, value, isDiagonal, colors }) => (
                  <td
                    key={'cell-' + i + '-' + j}
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      width: cellSize,
                      height: cellSize,
                      fontSize: fontSize,
                      fontWeight: 800,
                      textAlign: 'center',
                      borderRadius: 4,
                      transition: 'all 0.2s',
                    }}
                  >
                    {isDiagonal ? '--' : value.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 12,
        display: "flex",
        justifyContent: "space-around",
        padding: "8px",
        background: C.void + "88",
        borderRadius: 8,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 20,
            height: 14,
            background: 'rgba(77, 159, 255, 0.5)',
            borderRadius: 3,
            margin: '0 auto 3px',
          }} />
          <span style={{ fontSize: 8, color: C.smoke }}>
            &lt; -0.7
          </span>
          <div style={{ fontSize: 7, color: C.ash, marginTop: 1 }}>
            تحوط
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 20,
            height: 14,
            background: 'rgba(30, 230, 138, 0.35)',
            borderRadius: 3,
            margin: '0 auto 3px',
          }} />
          <span style={{ fontSize: 8, color: C.smoke }}>
            &lt; 0.4
          </span>
          <div style={{ fontSize: 7, color: C.mint, marginTop: 1 }}>
            ممتاز
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 20,
            height: 14,
            background: 'rgba(251, 191, 36, 0.4)',
            borderRadius: 3,
            margin: '0 auto 3px',
          }} />
          <span style={{ fontSize: 8, color: C.smoke }}>
            0.4-0.7
          </span>
          <div style={{ fontSize: 7, color: C.amber, marginTop: 1 }}>
            متوسط
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 20,
            height: 14,
            background: 'rgba(255, 95, 106, 0.5)',
            borderRadius: 3,
            margin: '0 auto 3px',
          }} />
          <span style={{ fontSize: 8, color: C.smoke }}>
            &gt; 0.7
          </span>
          <div style={{ fontSize: 7, color: C.coral, marginTop: 1 }}>
            تنويع وهمي
          </div>
        </div>
      </div>

      {/* High correlation alerts */}
      {highCount > 0 && (
        <div style={{
          marginTop: 10,
          padding: "8px 10px",
          background: C.coral + "10",
          border: "1px solid " + C.coral + "33",
          borderRadius: 8,
        }}>
          <div style={{
            fontSize: 10,
            color: C.coral,
            fontWeight: 700,
            marginBottom: 4,
          }}>
            ⚠️ {highCount} زوج بارتباط عالٍ ({'>'}0.70)
          </div>
          <div style={{
            fontSize: 9,
            color: C.mist,
            lineHeight: 1.5,
          }}>
            هذه الأسهم تتحرك بشكل متشابه -- فكّر بتنويع أفضل
          </div>
        </div>
      )}

      {/* Good diversification congrats */}
      {highCount === 0 && (
        <div style={{
          marginTop: 10,
          padding: "8px 10px",
          background: C.mint + "10",
          border: "1px solid " + C.mint + "33",
          borderRadius: 8,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 11,
            color: C.mint,
            fontWeight: 700,
          }}>
            🎯 لا توجد ارتباطات عالية -- تنويع حقيقي!
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Custom comparison
  if (prev.data === next.data) return true;
  if (!prev.data || !next.data) return false;
  if (prev.data.matrix !== next.data.matrix) return false;
  if (prev.data.symbols !== next.data.symbols) return false;
  if (prev.data.avgCorrelation !== next.data.avgCorrelation) return false;
  if (prev.data.highCount !== next.data.highCount) return false;
  return true;
});

CorrelationHeatmap.displayName = 'CorrelationHeatmap';

export default CorrelationHeatmap;
