'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useNav } from '../store';
import { analyzePortfolio, formatCurrency } from '../engines/rebalancingEngine';
import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import Tooltip from '../components/Tooltip';
import { useOHLCVCache } from '../hooks/useOHLCVCache';

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
    low: C.smoke,
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

      {/* الحل المقترح ✨ مُصلح ✨ */}
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
          
          {/* sell */}
          {issue.solution.action === 'sell' && (
            <div style={{fontSize: 12, color: C.snow, fontWeight: 700, fontFamily: "Cairo,sans-serif"}}>
              بع <span style={{color: color}}>{issue.solution.percentage}%</span> من {issue.solution.name}
              <div style={{fontSize: 10, color: C.smoke, marginTop: 4, fontFamily: "IBM Plex Mono,monospace"}}>
                ≈ {formatCurrency(issue.solution.amount)} ريال
              </div>
            </div>
          )}

          {/* اقتراحات قطاعات (add أو add_sector) */}
          {(issue.solution.action === 'add' || issue.solution.action === 'add_sector') && issue.solution.suggestions && (
            <div>
              <div style={{fontSize: 12, color: C.snow, marginBottom: 6, fontFamily: "Cairo,sans-serif"}}>
                أضف من هذه القطاعات:
              </div>
              {issue.solution.suggestions.map((s, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  color: C.mist,
                  padding: "4px 0",
                  fontFamily: "Cairo,sans-serif",
                  borderBottom: i < issue.solution.suggestions.length - 1 ? "1px solid " + C.line + "22" : "none",
                }}>
                  <div>
                    • <span style={{color: C.gold, fontWeight: 700}}>{s.sector}</span>
                    {s.examples && (
                      <span style={{color: C.smoke}}> ({s.examples.join('، ')})</span>
                    )}
                  </div>
                  {s.reason && (
                    <div style={{
                      fontSize: 10,
                      color: C.smoke,
                      marginTop: 2,
                      paddingRight: 12,
                    }}>
                      ↳ {s.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* أسهم ضعيفة (replace_weak) */}
          {issue.solution.action === 'replace_weak' && issue.weakStocks && issue.weakStocks.length > 0 && (
            <div>
              <div style={{fontSize: 12, color: C.snow, marginBottom: 6, fontFamily: "Cairo,sans-serif"}}>
                {issue.solution.message}
              </div>
              <div style={{
                padding: "6px 10px",
                background: C.coral + "18",
                border: "1px solid " + C.coral + "44",
                borderRadius: 6,
                marginTop: 6,
              }}>
                <div style={{fontSize: 10, color: C.coral, fontWeight: 800, marginBottom: 4}}>
                  ⚠️ الأسهم الضعيفة:
                </div>
                <div style={{fontSize: 12, color: C.snow, fontWeight: 700, fontFamily: "Cairo,sans-serif"}}>
                  {issue.weakStocks.join('، ')}
                </div>
              </div>
            </div>
          )}

          {/* ✨ Fallback شامل - يعرض الـ message لأي action آخر */}
          {issue.solution.message && 
           issue.solution.action !== 'sell' && 
           !((issue.solution.action === 'add' || issue.solution.action === 'add_sector') && issue.solution.suggestions) &&
           !(issue.solution.action === 'replace_weak' && issue.weakStocks && issue.weakStocks.length > 0) && (
            <div style={{fontSize: 12, color: C.snow, fontFamily: "Cairo,sans-serif", lineHeight: 1.6}}>
              {issue.solution.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── بطاقة Health Score الكبيرة ✨ مُصلحة ✨ ─────────────────
function HealthScoreCard({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1800;
    const startTime = performance.now();
    let frameId;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * score;
      
      setAnimatedScore(Number(current.toFixed(1)));
      
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [score]);

  const getColor = (s) => {
    if (s >= 80) return C.mint;
    if (s >= 60) return C.amber;
    if (s >= 40) return C.gold;
    return C.coral;
  };

  const getLabel = (s) => {
    if (s >= 80) return '🏆 ممتازة';
    if (s >= 60) return '✅ جيدة';
    if (s >= 40) return '⚠️ متوسطة';
    return '🚨 حرجة';
  };

  const color = getColor(score);
  const circumference = 2 * Math.PI * 70;
  // ✨ Score من 0-100 (وليس 0-10)
  const offset = circumference * (1 - animatedScore / 100);

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
          <circle 
            cx={80} 
            cy={80} 
            r={70} 
            fill="none" 
            stroke={C.line + "33"} 
            strokeWidth={8}
          />
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
            {Math.round(animatedScore)}
          </div>
          <div style={{
            fontSize: 11,
            color: C.smoke,
            fontWeight: 600,
            marginTop: 4,
          }}>
            من 100
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

// ─── Donut Chart للقطاعات ─────────────────────
function SectorsDonutChart({ sectors }) {
  if (!sectors || sectors.length === 0) return null;

  const SECTOR_COLORS = [
    C.gold, C.electric, C.mint, C.amber, C.coral, C.plasma, C.teal,
  ];

  const size = 180;
  const radius = 70;
  const strokeWidth = 26;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = sectors.map((sector, idx) => {
    const percentage = sector.weight;
    const dashLength = percentage * circumference;
    const segment = {
      ...sector,
      color: SECTOR_COLORS[idx % SECTOR_COLORS.length],
      dashArray: `${dashLength} ${circumference - dashLength}`,
      dashOffset: -cumulativeOffset,
    };
    cumulativeOffset += dashLength;
    return segment;
  });

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      border: "1px solid " + C.line + "44",
      borderRadius: 16,
      padding: "18px 14px",
      marginBottom: 16,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    }}>
      <div style={{
        fontSize: 11,
        color: C.gold,
        fontWeight: 800,
        letterSpacing: "1px",
        marginBottom: 14,
        textAlign: "center",
      }}>
        🎯 توزيع القطاعات
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{
          position: "relative",
          width: size,
          height: size,
          flexShrink: 0,
        }}>
          <svg width={size} height={size} style={{transform: "rotate(-90deg)"}}>
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={C.line + "22"}
              strokeWidth={strokeWidth}
            />
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                style={{
                  filter: "drop-shadow(0 0 8px " + seg.color + "66)",
                }}
              />
            ))}
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
              fontSize: 26,
              fontWeight: 900,
              color: C.snow,
              lineHeight: 1,
            }}>
              {sectors.length}
            </div>
            <div style={{
              fontSize: 10,
              color: C.smoke,
              fontWeight: 600,
              marginTop: 4,
            }}>
              قطاع{sectors.length > 1 ? 'ات' : ''}
            </div>
          </div>
        </div>

        <div style={{flex: 1, minWidth: 120}}>
          {segments.map((seg, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 0",
              borderBottom: i < segments.length - 1 ? "1px solid " + C.line + "22" : "none",
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: seg.color,
                flexShrink: 0,
                boxShadow: "0 0 8px " + seg.color + "66",
              }}/>
              <div style={{flex: 1, fontSize: 11, color: C.mist, fontFamily: "Cairo,sans-serif"}}>
                {seg.sector}
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 800,
                color: seg.color,
                fontFamily: "IBM Plex Mono,monospace",
              }}>
                {Math.round(seg.weightPct)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── بطاقة ملخّص الأرقام ───────────────────────
function SummaryCard({ summary }) {
  const items = [
    {label: 'الأسهم', value: summary.numPositions, icon: '📊'},
    {label: 'القطاعات', value: summary.numSectors, icon: '🎯'},
    {label: 'أكبر مركز', value: (summary.largestPositionPct || 0).toFixed(1) + '%', icon: '⚖️'},
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
  if (!impact || !impact.before || !impact.after) return null;
  
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
          before: (impact.before.healthScore || 0).toFixed(0) + '/100',
          after: (impact.after.healthScore || 0).toFixed(0) + '/100',
        },
        {
          label: 'Sharpe Ratio',
          before: (impact.before.sharpe || 0).toFixed(2),
          after: (impact.after.sharpe || 0).toFixed(2),
        },
        {
          label: 'Max Drawdown',
          before: ((impact.before.maxDD || 0) * 100).toFixed(1) + '%',
          after: ((impact.after.maxDD || 0) * 100).toFixed(1) + '%',
        },
      ].map((row, i) => (
        <div key={i} style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0",
          borderBottom: i < 2 ? "1px solid " + C.line + "22" : "none",
        }}>
          <div style={{flex: 1, fontSize: 11, color: C.mist, fontFamily: "Cairo,sans-serif", display: "flex", alignItems: "center", gap: 4}}>
            {row.label}
            <Tooltip 
              termKey={
                row.label === "Health Score" ? "Health Score" :
                row.label === "Sharpe Ratio" ? "Sharpe Ratio" :
                row.label === "Max Drawdown" ? "Maximum Drawdown" :
                row.label
              } 
              size="small"
            />
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

      {impact.estimatedTime && (
        <div style={{
          marginTop: 10,
          padding: "8px 10px",
          background: C.void + "aa",
          borderRadius: 8,
          textAlign: "center",
        }}>
          <span style={{fontSize: 10, color: C.smoke}}>⏱️ الوقت المتوقع: </span>
          <span style={{fontSize: 12, color: C.gold, fontWeight: 800, fontFamily: "IBM Plex Mono,monospace"}}>
            {impact.estimatedTime}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── الشاشة الرئيسية ─────────────────────────
export default function RebalancingScreen() {
  const { setTab } = useNav(); 
  const [showAutoApply, setShowAutoApply] = useState(false);

  useEffect(() => {
    if (showAutoApply) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showAutoApply]);

  // قراءة المحفظة من localStorage (الرموز فقط)
  const rawPositions = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' && window.localStorage.getItem('tp_port');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return parsed.map(p => {
        const stk = STOCKS.find(s => s.sym === p.sym);
        return { ...p, stk };
      });
    } catch (e) {
      return [];
    }
  }, []);

  // ✨ جلب بارات أسهم المحفظة الحقيقية (نفس الـ hook الموحّد)
  const portSyms = useMemo(
    () => rawPositions.map(p => p.sym),
    [rawPositions]
  );
  const realBars = useOHLCVCache(portSyms, '3M');

  // ✨ حقن البارات الحقيقية في positions (إن توفّرت)؛ المحرك يسقط لـ genBars وإلا
  const positions = useMemo(() => {
    return rawPositions.map(p => {
      const bars = realBars[p.sym];
      return (bars && bars.length >= 30) ? { ...p, bars } : p;
    });
  }, [rawPositions, realBars]);

  // ✨ حارس "نتيجة مرحلية": طالما لم تصل البارات الحقيقية لكل رموز المحفظة بعد،
  // analysis.healthScore يُحسب من بيانات genBars الأولية ثم يتغيّر فجأة عند اكتمال realBars،
  // فتُعاد animation الدائرة من جديد (يبدو كـ"تحميل مرتين"). ننتظر الاكتمال قبل الحساب النهائي.
  const barsReady = portSyms.length === 0 || portSyms.every(s => realBars[s] && realBars[s].length >= 30);

  const analysis = useMemo(() => {
    if (!barsReady) return null;
    return analyzePortfolio(positions);
  }, [positions, barsReady]);

  if (!analysis || analysis.isEmpty) {
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

      {barsReady ? (
        <HealthScoreCard score={analysis.healthScore}/>
      ) : (
        <div style={{
          background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
          borderRadius: 20,
          padding: "24px 16px",
          marginBottom: 16,
          border: "1px solid " + C.line + "44",
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 11, color: C.gold, fontWeight: 800,
            letterSpacing: "2px", marginBottom: 16,
          }}>
            🎯 صحة المحفظة
          </div>
          <div style={{
            width: 40, height: 40, margin: "0 auto 16px",
            border: "3px solid " + C.line, borderTopColor: C.gold,
            borderRadius: "50%", animation: "rbSpin 0.9s linear infinite",
          }}/>
          <div style={{fontSize: 12, color: C.smoke}}>
            جارٍ تحليل بيانات الأسهم…
          </div>
          <style>{"@keyframes rbSpin{to{transform:rotate(360deg)}}"}</style>
        </div>
      )}

      <SummaryCard summary={analysis.summary}/>

      {analysis.sectors && analysis.sectors.length > 0 && (
        <SectorsDonutChart sectors={analysis.sectors}/>
      )}

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

      {analysis.issues.length > 0 && analysis.impactSummary && (
        <ImpactSummary impact={analysis.impactSummary}/>
      )}

      {analysis.issues.length > 0 && (
        <button
          onClick={() => setShowAutoApply(true)}
          style={{
            width: "100%",
            padding: "18px 20px",
            background: "linear-gradient(135deg," + C.gold + "," + C.goldL + ")",
            border: "none",
            borderRadius: 16,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            boxShadow: "0 6px 24px " + C.gold + "55, 0 0 40px " + C.gold + "22",
            fontFamily: "Cairo,sans-serif",
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          <span style={{fontSize: 22}}>⚡</span>
          <span style={{
            fontSize: 15,
            fontWeight: 900,
            color: C.ink,
            letterSpacing: "0.5px",
          }}>
            طبّق الاقتراحات تلقائياً
          </span>
        </button>
      )}

      {showAutoApply && (
        <div
          onClick={() => setShowAutoApply(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 0,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              height: "90vh",
              maxHeight: "90vh",
              background: "linear-gradient(180deg," + C.layer1 + "," + C.ink + ")",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              border: "1px solid " + C.gold + "44",
              padding: "20px 16px 60px",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{
              width: 40,
              height: 4,
              background: C.smoke,
              borderRadius: 2,
              margin: "0 auto 16px",
              opacity: 0.5,
            }}/>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg," + C.gold + "," + C.goldL + ")",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 4px 12px " + C.gold + "44",
              }}>
                ⚡
              </div>
              <div style={{flex: 1}}>
                <div style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: C.snow,
                  fontFamily: "Cairo,sans-serif",
                }}>
                  الخطة التلقائية
                </div>
                <div style={{
                  fontSize: 10,
                  color: C.smoke,
                  marginTop: 2,
                }}>
                  قائمة الصفقات المقترحة
                </div>
              </div>
              <button
                onClick={() => setShowAutoApply(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid " + C.line,
                  background: C.layer2,
                  color: C.smoke,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{marginBottom: 16}}>
              {analysis.issues
                .filter(i => i.solution && i.solution.action === 'sell')
                .map((issue, i) => (
                  <div key={i} style={{
                    background: C.coral + "12",
                    border: "1px solid " + C.coral + "33",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: C.coral + "22",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}>
                      📉
                    </div>
                    <div style={{flex: 1}}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: C.coral,
                        fontFamily: "Cairo,sans-serif",
                      }}>
                        بيع {issue.solution.percentage}% من {issue.solution.name}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: C.smoke,
                        marginTop: 3,
                        fontFamily: "IBM Plex Mono,monospace",
                      }}>
                        ≈ {formatCurrency(issue.solution.amount)} ريال
                      </div>
                    </div>
                  </div>
                ))}

              {analysis.issues
                .filter(i => i.solution && i.solution.suggestions)
                .map((issue, i) => (
                  <div key={'add-' + i} style={{
                    background: C.mint + "12",
                    border: "1px solid " + C.mint + "33",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 10,
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: C.mint + "22",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}>
                        📈
                      </div>
                      <div style={{flex: 1}}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: C.mint,
                          fontFamily: "Cairo,sans-serif",
                        }}>
                          إضافة: {issue.title}
                        </div>
                      </div>
                    </div>
                    {issue.solution.suggestions && (
                      <div style={{paddingRight: 50}}>
                        {issue.solution.suggestions.map((s, idx) => (
                          <div key={idx} style={{
                            fontSize: 11,
                            color: C.mist,
                            padding: "3px 0",
                            fontFamily: "Cairo,sans-serif",
                          }}>
                            • <span style={{color: C.gold, fontWeight: 700}}>{s.sector}</span>
                            {s.examples && (
                              <span style={{color: C.smoke}}> ({s.examples.join('، ')})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>

            <div style={{
              padding: "14px 16px",
              background: C.amber + "10",
              border: "1px solid " + C.amber + "33",
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 11,
                color: C.amber,
                fontWeight: 800,
                marginBottom: 6,
              }}>
                ⚠️ تنويه مهم
              </div>
              <div style={{
                fontSize: 11,
                color: C.mist,
                lineHeight: 1.7,
                fontFamily: "Cairo,sans-serif",
              }}>
                هذه خطة استرشادية. تنفيذ الصفقات يتم من شاشة المحفظة الرئيسية.
                القرار النهائي يعود لك بناءً على ظروف السوق.
              </div>
            </div>
          </div>
        </div>
      )}

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
