'use client';
/**
 * @module MonthlyReturnsHeatmap
 * @description جدول ملوّن للعوائد الشهرية
 *
 * يُظهر الأداء شهرياً عبر السنوات بألوان متدرّجة
 * الإلهام: Wealthfront, Betterment, Morningstar
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

// أسماء الأشهر بالعربية
var MONTH_NAMES_SHORT = [
  'ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون',
  'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'
];

/**
 * حساب لون الخلية بناءً على قيمة العائد
 */
function getCellColor(returnValue, maxAbs) {
  if (returnValue === null || returnValue === undefined) {
    return { bg: C.layer1, text: C.smoke, opacity: 0.3 };
  }

  var intensity = Math.min(Math.abs(returnValue) / maxAbs, 1);
  
  if (returnValue > 0) {
    // أخضر متدرج
    return {
      bg: 'rgba(30, 230, 138, ' + (0.15 + intensity * 0.45) + ')',
      text: intensity > 0.5 ? C.snow : C.mint,
      opacity: 1,
    };
  } else if (returnValue < 0) {
    // أحمر متدرج
    return {
      bg: 'rgba(255, 95, 106, ' + (0.15 + intensity * 0.45) + ')',
      text: intensity > 0.5 ? C.snow : C.coral,
      opacity: 1,
    };
  } else {
    // حيادي
    return {
      bg: 'rgba(144, 164, 200, 0.1)',
      text: C.smoke,
      opacity: 1,
    };
  }
}

export default function MonthlyReturnsHeatmap(props) {
  var result = props.data || { months: [], stats: {} };
  var months = result.months || [];
  var stats = result.stats || {};

  if (!months || months.length === 0) {
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

  // ① تنظيم البيانات: سنوات × أشهر
  var yearMap = {}; // "2026" → {1: {...}, 2: {...}, ...}
  months.forEach(function(m) {
    if (!yearMap[m.year]) yearMap[m.year] = {};
    yearMap[m.year][m.month] = m;
  });

  var years = Object.keys(yearMap).sort();

  // ② حساب أقصى قيمة مطلقة لتدرج الألوان
  var maxAbs = 1;
  months.forEach(function(m) {
    if (Math.abs(m.return) > maxAbs) maxAbs = Math.abs(m.return);
  });

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + C.line + "44",
      padding: "14px 12px",
      marginBottom: 12,
    }}>
      {/* ── Header ── */}
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
            color: stats.winRate >= 60 ? C.mint 
                 : stats.winRate >= 50 ? C.amber 
                 : C.coral,
            lineHeight: 1,
          }}>
            {stats.winRate}%
          </div>
        </div>
      </div>

      {/* ── الجدول (Heatmap) ── */}
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
          {/* Header: أشهر */}
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
              {MONTH_NAMES_SHORT.map(function(name, i) {
                return (
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
                );
              })}
            </tr>
          </thead>

          {/* Rows: سنوات */}
          <tbody>
            {years.map(function(year) {
              return (
                <tr key={year}>
                  {/* خلية السنة */}
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

                  {/* خلايا الأشهر */}
                  {MONTH_NAMES_SHORT.map(function(_, i) {
                    var monthNum = i + 1;
                    var cell = yearMap[year][monthNum];
                    var colors = getCellColor(
                      cell ? cell.return : null,
                      maxAbs
                    );

                    return (
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
                          transition: 'all 0.2s',
                        }}
                      >
                        {cell 
                          ? (cell.return > 0 ? '+' : '') + cell.return.toFixed(1)
                          : '--'
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Stats ── */}
      <div style={{
        display: "flex",
        justifyContent: "space-around",
        marginTop: 12,
        paddingTop: 10,
        borderTop: "1px solid " + C.line + "33",
      }}>
        {/* أفضل شهر */}
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

        {/* المتوسط */}
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
            color: stats.avgReturn >= 0 ? C.mint : C.coral,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(1)}%
          </div>
          <div style={{
            fontSize: 8,
            color: C.ash,
            marginTop: 1,
          }}>
            شهر​​​​​​​​​​​​​​​​
