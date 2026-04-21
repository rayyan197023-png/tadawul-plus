'use client';

import React, { useMemo, useState } from 'react';
import { useNav } from '../store';
import { analyzePortfolio, formatCurrency } from '../engines/rebalancingEngine';
import { STOCKS } from '../constants/stocksData';
import { genBars, stockHealth } from '../engines/analysisEngine';

const C = {
  ink: "#06080f",
  deep: "#090c16",
  void: "#0c1020",
  layer1: "#141d2b",
  layer2: "#1e2d42",
  layer3: "#222d4a",
  edge: "#2e3e60",
  line: "#32426a",
  snow: "#f0f6ff",
  mist: "#c8d8f0",
  smoke: "#90a4c8",
  ash: "#5a6e94",
  gold: "#f0c050",
  goldL: "#ffd878",
  mint: "#1ee68a",
  coral: "#ff5f6a",
  amber: "#fbbf24",
  teal: "#22d3ee",
  electric: "#4d9fff",
  plasma: "#a78bfa",
};

// ─── بطاقة القضية (Issue Card) ────────────────
function IssueCard({ issue, index }) {
  const severityColors = {
    high: C.coral,
    medium: C.amber,
    good: C.mint,
  };
  const color = severityColors[issue.severity] || C.smoke;

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      border: "1px solid " + color + "44",
      borderRadius: 16,
      padding: "16px 14px",
      marginBottom: 12,
      boxShadow: "0 4px 20px " + color + "15",
    }}>
      {/* العنوان */}
      <div style={{display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10}}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: color + "22",
          border: "1px solid " + color + "55",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
          color: color,
          flexShrink: 0,
        }}>
          {index + 1}
        </div>
        <div style={{flex: 1}}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}>
            <span style={{fontSize: 18}}>{issue.icon}</span>
            <span style={{
              fontSize: 14,
              fontWeight: 900,
              color: color,
              fontFamily: "Cairo,sans-serif",
            }}>
              {issue.title}
            </span>
          </div>
          <div style={{
            fontSize: 12,
            color: C.mist,
            lineHeight: 1.6,
            fontFamily: "Cairo,sans-serif",
          }}>
            {issue.description}
          </div>
        </div>
      </div>

      {/* المثالي */}
      <div style={{
        padding: "8px 10px",
        background: C.void + "88",
        borderRadius: 8,
        borderLeft: "2px solid " + color,
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 10,
          color: C.smoke,
          fontWeight: 700,
          marginBottom: 2,
        }}>
          💡 المستهدف
        </div>
        <div style={{
          fontSize: 11,
          color: C.mist,
          fontFamily: "Cairo,sans-serif",
        }}>
          {issue.ideal}
        </div>
      </div>

      {/* التأثير */}
      {issue.impact && (
        <div style={{marginBottom: 10}}>
          <div style={{
            fontSize: 10,
            color: C.gold,
            fontWeight: 800,
            marginBottom: 6,
            letterSpacing: "1px",
          }}>
            📈 التأثير المتوقع
          </div>
          <div style={{display: "flex", gap: 8, flexWrap: "wrap"}}>
            {Object.entries(issue.impact).map(([key, value]) => (
              <div key={key} style={{
                padding: "4px 10px",
                background: C.mint + "18",
                border: "1px solid " + C.mint + "44",
                borderRadius: 8,
                fontSize: 10,
                color: C.mint,
                fontWeight: 800,
                fontFamily: "IBM Plex Mono,monospace",
              }}>
                {key}: {value}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* الحل المقترح */}
      {issue.solution && (
        <div style={{
          padding: "10px 12px",
          background: "linear-gradient(135deg," + color + "18," + color + "08)",
          borderRadius: 10,
          border: "1px solid " + color + "33",
        }}>
          <div style={{
            fontSize: 10,
            color: color,
            fontWeight: 800,
            marginBottom: 4,
            letterSpacing: "1px",
          }}>
            🎯 الحل المقترح
          </div>
          
          {issue.solution.action === 'sell' && (
            <div style={{fontSize: 12, color: C.snow, fontWeight: 700, fontFamily: "Cairo,sans-serif"}}>
              بع <span style={{color: color}}>{issue.solution.percentage}%</span> من {issue.solution.name}
              <div style={{fontSize: 10, color: C.smoke, marginTop: 4, fontFamily: "IBM Plex Mono,monospace"}}>
                ≈ {formatCurrency(issue.solution.amount)} ريال
              </div>
            </div>
          )}

          {issue.solution.action === 'add' && issue.solution.suggestions && (
            <div>
              <div style={{fontSize: 12, color: C.snow, marginBottom: 6, fontFamily: "Cairo,sans-serif"}}>
                أضف من هذه القطاعات:
              </div>
              {issue.solution.suggestions.map((s, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  color: C.mist,
                  padding: "3px 0",
                  fontFamily: "Cairo,sans-serif",
                }}>
                  • <span style={{color: C.gold, fontWeight: 700}}>{s.sector}</span>
                  <span style={{color: C.smoke}}> ({s.examples.join('، ')})</span>
                </div>
              ))}
            </div>
          )}

          {issue.solution.action === 'add' && !issue.solution.suggestions && (
            <div style={{fontSize: 12, color: C.snow, fontFamily: "Cairo,sans-serif"}}>
              {issue.solution.message}
            </div>
          )}

          {issue.solution.action === 'maintain' && (
            <div style={{fontSize: 12, color: C.snow, fontFamily: "Cairo,sans-serif"}}>
              {issue.solution.message}
            </div>
          )}

          {issue.solution.action === 'diversify' && (
            <div style={{fontSize: 12, color: C.snow, fontFamily: "Cairo,sans-serif"}}>
              {issue.solution.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── بطاقة Health Score الكبيرة ─────────────────
function HealthScoreCard({ score }) {
  const getColor = (s) => {
    if (s >= 8) return C.mint;
    if (s >= 6) return C.amber;
    if (s >= 4) return C.gold;
    return C.coral;
  };

  const getLabel = (s) => {
    if (s >= 9) return '🏆 ممتازة';
    if (s >= 7) return '✅ جيدة';
    if (s >= 5) return '⚠️ متوسطة';
    if (s >= 3) return '⚠️ ضعيفة';
    return '🚨 حرجة';
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference * (1 - score / 10);

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 20,
      padding: "24px 16px",
      marginBottom: 16,
      border: "1px solid " + color + "33",
      boxShadow: "0 8px 30px " + color + "22",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: 11,
        color: C.gold,
        fontWeight: 800,
        letterSpacing: "2px",
        marginBottom: 4,
      }}>
        🎯 صحة المحفظة
      </div>

      <div style={{
        position: "relative",
        width: 160,
        height: 160,
        margin: "16px auto",
      }}>
        <svg width={160} height={160} style={{transform: "rotate(-90deg)"}}>
          <circle cx={80} cy={80} r={70} fill="none" stroke={C.line + "33"} strokeWidth={8}/>
          <circle
            cx={80}
            cy={80}
            r={70}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              filter: "drop-shadow(0 0 10px " + color + "aa)",
              transition: "stroke-dashoffset 1.5s ease",
            }}
          />
        </svg>
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "IBM Plex Mono,monospace",
            fontSize: 36,
            fontWeight: 900,
            color: color,
            lineHeight: 1,
            textShadow: "0 0 20px " + color + "88",
          }}>
            {score}
          </div>
          <div style={{
            fontSize: 11,
            color: C.smoke,
            fontWeight: 600,
            marginTop: 4,
          }}>
            من 10
          </div>
        </div>
      </div>

      <div style={{
        fontSize: 16,
        fontWeight: 900,
        color: color,
        fontFamily: "Cairo,sans-serif",
      }}>
        {getLabel(score)}
      </div>
    </div>
  );
}

// ─── بطاقة ملخّص الأرقام ───────────────────────
function SummaryCard({ summary }) {
  const items = [
    {label: 'الأسهم', value: summary.numPositions, icon: '📊'},
    {label: 'القطاعات', value: summary.numSectors, icon: '🎯'},
    {label: 'أكبر مركز', value: summary.largestPositionPct + '%', icon: '⚖️'},
    {label: 'الإجمالي', value: formatCurrency(summary.totalValue), icon: '💰', unit: 'ر'},
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: C.void + "aa",
          border: "1px solid " + C.line + "44",
          borderRadius: 12,
          padding: "12px 10px",
          textAlign: "center",
        }}>
          <div style={{fontSize: 18, marginBottom: 4}}>{item.icon}</div>
          <div style={{fontSize: 10, color: C.smoke, marginBottom: 4, fontWeight: 600}}>
            {item.label}
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 900,
            color: C.snow,
            fontFamily: "IBM Plex Mono,monospace",
          }}>
            {item.value} {item.unit && <span style={{fontSize: 10, color: C.smoke}}>{item.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ملخّص التأثير ────────────────────────────
function ImpactSummary({ impact }) {
  return (
    <div style={{
      background: "linear-gradient(145deg," + C.mint + "15," + C.mint + "05)",
      border: "1px solid " + C.mint + "44",
      borderRadius: 14,
      padding: "14px 12px",
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 11,
        color: C.mint,
        fontWeight: 800,
        letterSpacing: "1px",
        marginBottom: 10,
      }}>
        📊 ملخّص التأثير إذا طبّقت الاقتراحات
      </div>

      <div style={{display: "flex", gap: 8, marginBottom: 8}}>
        <div style={{flex: 1, textAlign: "center"}}>
          <div style={{fontSize: 10, color: C.smoke}}>قبل</div>
        </div>
        <div style={{fontSize: 14, color: C.gold, fontWeight: 900}}>→</div>
        <div style={{flex: 1, textAlign: "center"}}>
          <div style={{fontSize: 10, color: C.mint, fontWeight: 700}}>بعد</div>
        </div>
      </div>

      {[
        {
          label: 'Health Score',
          before: impact.before.healthScore + '/10',
          after: impact.after.healthScore + '/10',
        },
        {
          label: 'Sharpe Ratio',
          before: impact.before.sharpe,
          after: impact.after.sharpe,
        },
        {
          label: 'Max Drawdown',
          before: impact.before.maxDD + '%',
          after: impact.after.maxDD + '%',
        },
      ].map((row, i) => (
        <div key={i} style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0",
          borderBottom: i < 2 ? "1px solid " + C.line + "22" : "none",
        }}>
          <div style={{flex: 1, fontSize: 11, color: C.mist, fontFamily: "Cairo,sans-serif"}}>
            {row.label}
          </div>
          <div style={{
            fontSize: 12,
            color: C.smoke,
            fontFamily: "IBM Plex Mono,monospace",
            textAlign: "center",
            minWidth: 50,
          }}>
            {row.before}
          </div>
          <div style={{color: C.gold, fontWeight: 900}}>→</div>
          <div style={{
            fontSize: 12,
            color: C.mint,
            fontWeight: 800,
            fontFamily: "IBM Plex Mono,monospace",
            textAlign: "center",
            minWidth: 50,
          }}>
            {row.after}
          </div>
        </div>
      ))}

      <div style={{
        marginTop: 10,
        padding: "8px 10px",
        background: C.void + "aa",
        borderRadius: 8,
        textAlign: "center",
      }}>
        <span style={{fontSize: 10, color: C.smoke}}>💰 التكلفة المتوقعة: </span>
        <span style={{fontSize: 12, color: C.gold, fontWeight: 800, fontFamily: "IBM Plex Mono,monospace"}}>
          {impact.estimatedCost} ريال
        </span>
      </div>
    </div>
  );
}

// ─── الشاشة الرئيسية ─────────────────────────
export default function RebalancingScreen() {
  const { setTab } = useNav();

  // جلب المحفظة من localStorage
  const positions = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' && window.localStorage.getItem('tp_port')
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      
      // ربط كل مركز بـ stock data
      return parsed.map(p => {
        const stk = STOCKS.find(s => s.sym === p.sym);
        return { ...p, stk };
      });
    } catch (e) {
      return [];
    }
  }, []);

  // تحليل المحفظة
  const analysis = useMemo(() => {
    return analyzePortfolio(positions);
  }, [positions]);

  // حالة فارغة
  if (analysis.isEmpty) {
    return (
      <div style={{
        background: C.ink,
        minHeight: "100vh",
        padding: "20px 16px 100px",
        fontFamily: "Cairo,sans-serif",
        direction: "rtl",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}>
          <button
            onClick={() => setTab('portfolio')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1px solid " + C.line,
              background: C.layer1,
              color: C.snow,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            →
          </button>
          <div style={{fontSize: 17, fontWeight: 900, color: C.snow}}>
            توازن المحفظة
          </div>
        </div>

        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: C.layer1,
          borderRadius: 20,
          border: "1px solid " + C.line + "44",
        }}>
          <div style={{fontSize: 60, marginBottom: 16}}>⚖️</div>
          <div style={{fontSize: 16, fontWeight: 900, color: C.snow, marginBottom: 8}}>
            المحفظة فارغة
          </div>
          <div style={{fontSize: 12, color: C.smoke, lineHeight: 1.8, marginBottom: 20}}>
            أضف أسهماً إلى محفظتك أولاً<br/>
            لتحصل على اقتراحات التوازن
          </div>
          <button
            onClick={() => setTab('portfolio')}
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg," + C.gold + "," + C.goldL + ")",
              border: "none",
              borderRadius: 12,
              color: C.ink,
              fontSize: 13,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "Cairo,sans-serif",
              boxShadow: "0 4px 20px " + C.gold + "44",
            }}
          >
            العودة للمحفظة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: C.ink,
      minHeight: "100vh",
      padding: "20px 16px 100px",
      fontFamily: "Cairo,sans-serif",
      direction: "rtl",
    }}>
      {/* الهيدر */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 20,
      }}>
        <button
          onClick={() => setTab('portfolio')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid " + C.line,
            background: C.layer1,
            color: C.snow,
            fontSize: 18,
            cursor: "pointer",
            fontWeight: 900,
          }}
        >
          →
        </button>
        <div>
          <div style={{fontSize: 17, fontWeight: 900, color: C.snow}}>
            توازن المحفظة
          </div>
          <div style={{fontSize: 10, color: C.smoke, marginTop: 2}}>
            Rebalancing Assistant
          </div>
        </div>
      </div>

      {/* Health Score */}
      <HealthScoreCard score={analysis.healthScore}/>

      {/* Summary */}
      <SummaryCard summary={analysis.summary}/>

      {/* Issues */}
      {analysis.issues.length > 0 && (
        <>
          <div style={{
            fontSize: 12,
            color: C.gold,
            fontWeight: 800,
            letterSpacing: "1px",
            marginBottom: 10,
            marginTop: 4,
          }}>
            📋 {analysis.issues.length} اقتراح{analysis.issues.length > 1 ? 'ات' : ''} للتحسين
          </div>
          {analysis.issues.map((issue, i) => (
            <IssueCard key={issue.id} issue={issue} index={i}/>
          ))}
        </>
      )}

      {/* Positive Notes */}
      {analysis.positiveNotes.length > 0 && (
        <>
          <div style={{
            fontSize: 12,
            color: C.mint,
            fontWeight: 800,
            letterSpacing: "1px",
            marginBottom: 10,
            marginTop: 16,
          }}>
            ✨ نقاط قوة
          </div>
          {analysis.positiveNotes.map((issue, i) => (
            <IssueCard key={issue.id} issue={issue} index={i}/>
          ))}
        </>
      )}

      {/* Impact Summary */}
      {analysis.issues.length > 0 && analysis.impactSummary && (
        <ImpactSummary impact={analysis.impactSummary}/>
      )}

      {/* Footer Note */}
      <div style={{
        padding: "12px 14px",
        background: C.void + "88",
        borderRadius: 12,
        border: "1px solid " + C.line + "22",
        marginTop: 16,
      }}>
        <div style={{fontSize: 10, color: C.smoke, lineHeight: 1.7, textAlign: "center"}}>
          💡 هذه اقتراحات استرشادية مبنية على تحليل المحفظة
          <br/>
          القرار النهائي يعود لك دائماً
        </div>
      </div>
    </div>
  );
}
