'use client';
/**
 * @module MonthlyReturnsHeatmap
 * @description جدول ملوّن للعوائد الشهرية
 * 
 * ✨ V2.0 - Performance Optimized
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

const MONTH_NAMES_SHORT = [
  'ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون',
  'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'
];

// Cached outside component
function getCellColor(returnValue, maxAbs) {
  if (returnValue === null || returnValue === undefined) {
    return { bg: C.layer1, text: C.smoke, opacity: 0.3 };
  }

  const intensity = Math.min(Math.abs(returnValue) / maxAbs, 1);
  
  if (returnValue > 0) {
    return {
      bg: 'rgba(30, 230, 138, ' + (0.15 + intensity * 0.45) + ')',
      text: intensity > 0.5 ? C.snow : C.mint,
      opacity: 1,
    };
  } else if (returnValue < 0) {
    return {
      bg: 'rgba(255, 95, 106, ' + (0.15 + intensity * 0.45) + ')',
      text: intensity > 0.5 ? C.snow : C.coral,
      opacity: 1,
    };
  } else {
    return {
      bg: 'rgba(144, 164, 200, 0.1)',
      text: C.smoke,
      opacity: 1,
    };
  }
}

const MonthlyReturnsHeatmap = React.memo(function MonthlyReturnsHeatmap(props) {
  const result = props.data || { months: [], stats: {} };
  const months = result.months || [];
  const stats = result.stats || {};

  // ═══════════════════════════════════════════════
  // ✨ Heavy calculations - memoized
  // ═══════════════════════════════════════════════
  
  const heatmapData = useMemo(() => {
    if (!months || months.length === 0) return null;

    // Build year map
    const yearMap = {};
    months.forEach((m) => {
      if (!yearMap[m.year]) yearMap[m.year] = {};
      yearMap[m.year][m.month] = m;
    });

    const years = Object.keys(yearMap).sort();

    // Find maxAbs for color intensity
    let maxAbs = 1;
    months.forEach((m) => {
      if (Math.abs(m.return) > maxAbs) maxAbs = Math.abs(m.return);
    });

    // Pre-calculate cell colors for all cells
    const cellsData = years.map((year) => ({
      year,
      cells: MONTH_NAMES_SHORT.map((_, i) => {
        const monthNum = i + 1;
        const cell = yearMap[year][monthNum];
        const colors = getCellColor(cell ? cell.return : null, maxAbs);
        return {
          monthNum,
          cell,
          colors,
        };
      }),
    }));

    return {
      yearMap,
      years,
      maxAbs,
      cellsData,
    };
  }, [months]);

  // ═══════════════════════════════════════════════
  // ✨ Stats colors - memoized
  // ═══════════════════════════════════════════════
  
  const statsColors = useMemo(() => ({
    winRate: stats.winRate >= 60 ? C.mint 
           : stats.winRate >= 50 ? C.amber 
           : C.coral,
    avgReturn: stats.avgReturn >= 0 ? C.mint : C.coral,
  }), [stats.winRate, stats.avgReturn]);

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
        📅 بيانات غير كافية للعوائد الشهرية
      </div>
    );
  }

  const { years, cellsData } = heatmapData;

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + C.line + "44",
      padding: "14px 12px",
      marginBottom: 12,
    }}>
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
            📅 العوائد الشهرية
          </div>
          <div style={{
            fontSize: 13,
            color: C.snow,
            fontWeight: 800,
          }}>
            {stats.totalMonths} شهر
          </div>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 2,
          }}>
            معدل الربح الشهري
          </div>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 18,
            fontWeight: 900,
            color: statsColors.winRate,
            lineHeight: 1,
          }}>
            {stats.winRate}%
          </div>
        </div>
      </div>

      <div style={{
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: '2px',
          fontFamily: "IBM Plex Mono,monospace",
        }}>
          <thead>
            <tr>
              <th style={{
                fontSize: 9,
                color: C.smoke,
                fontWeight: 700,
                padding: '4px 6px',
                textAlign: 'center',
                background: C.void,
                borderRadius: 4,
              }}>
                سنة
              </th>
              {MONTH_NAMES_SHORT.map((name, i) => (
                <th
                  key={i}
                  style={{
                    fontSize: 8,
                    color: C.smoke,
                    fontWeight: 700,
                    padding: '4px 2px',
                    textAlign: 'center',
                    background: C.void,
                    borderRadius: 4,
                    minWidth: 28,
                  }}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {cellsData.map(({ year, cells }) => (
              <tr key={year}>
                <td style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: C.gold,
                  textAlign: 'center',
                  padding: '6px',
                  background: C.void,
                  borderRadius: 4,
                }}>
                  {year}
                </td>

                {cells.map(({ monthNum, cell, colors }) => (
                  <td
                    key={monthNum}
                    style={{
                      background: colors.bg,
                      color: colors.text,
                      opacity: colors.opacity,
                      padding: '6px 2px',
                      fontSize: 9,
                      fontWeight: 800,
                      textAlign: 'center',
                      borderRadius: 4,
                      minWidth: 28,
                    }}
                  >
                    {cell 
                      ? (cell.return > 0 ? '+' : '') + cell.return.toFixed(1)
                      : '--'
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid " + C.line + "33",
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 3,
          }}>
            أفضل شهر
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: C.mint,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.bestMonth 
              ? '+' + stats.bestMonth.return.toFixed(1) + '%'
              : '--'
            }
          </div>
          <div style={{
            fontSize: 8,
            color: C.ash,
            marginTop: 1,
          }}>
            {stats.bestMonth 
              ? MONTH_NAMES_SHORT[stats.bestMonth.month - 1] + ' ' + stats.bestMonth.year
              : ''
            }
          </div>
        </div>

        <div style={{ 
          width: 1, 
          background: C.line + "33",
          margin: "0 4px",
        }} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 3,
          }}>
            المتوسط
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: statsColors.avgReturn,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
{stats.avgReturn != null ? (stats.avgReturn >= 0 ? '+' : '') + stats.avgReturn.toFixed(1) + '%' : '--'}
          </div>
          <div style={{
            fontSize: 8,
            color: C.ash,
            marginTop: 1,
          }}>
            شهرياً
          </div>
        </div>

        <div style={{ 
          width: 1, 
          background: C.line + "33",
          margin: "0 4px",
        }} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 9,
            color: C.smoke,
            marginBottom: 3,
          }}>
            أسوأ شهر
          </div>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: C.coral,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.worstMonth 
              ? stats.worstMonth.return.toFixed(1) + '%'
              : '--'
            }
          </div>
          <div style={{
            fontSize: 8,
            color: C.ash,
            marginTop: 1,
          }}>
            {stats.worstMonth 
              ? MONTH_NAMES_SHORT[stats.worstMonth.month - 1] + ' ' + stats.worstMonth.year
              : ''
            }
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 10,
        display: "flex",
        gap: 8,
      }}>
        <div style={{
          flex: 1,
          padding: "6px 8px",
          background: C.mint + "15",
          border: "1px solid " + C.mint + "33",
          borderRadius: 6,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 9,
            color: C.mint,
            fontWeight: 700,
            marginBottom: 2,
          }}>
            ↑ أشهر رابحة
          </div>
          <div style={{
            fontSize: 14,
            color: C.mint,
            fontWeight: 900,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.positiveMonths}
          </div>
        </div>

        <div style={{
          flex: 1,
          padding: "6px 8px",
          background: C.coral + "15",
          border: "1px solid " + C.coral + "33",
          borderRadius: 6,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 9,
            color: C.coral,
            fontWeight: 700,
            marginBottom: 2,
          }}>
            ↓ أشهر خاسرة
          </div>
          <div style={{
            fontSize: 14,
            color: C.coral,
            fontWeight: 900,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.negativeMonths}
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Custom comparison
  if (prev.data === next.data) return true;
  if (!prev.data || !next.data) return false;
  if (prev.data.months !== next.data.months) return false;
  if (prev.data.stats !== next.data.stats) return false;
  return true;
});

MonthlyReturnsHeatmap.displayName = 'MonthlyReturnsHeatmap';

export default MonthlyReturnsHeatmap;
