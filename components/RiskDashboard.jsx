'use client';
/**
 * @module RiskDashboard
 * @description لوحة المخاطر الشاملة -- واجهة المستخدم
 *
 * تعرض 18 مقياساً عالمياً في 3 أقسام:
 * - الأداء (Sharpe, Sortino, Alpha, Beta)
 * - المخاطر (VaR, CVaR, Max Drawdown, Calmar)
 * - التنويع (HHI, Correlation, Diversification Score)
 *
 * @author تداول+
 * @version 1.0
 */

import React, { useState, useMemo } from 'react';
import Tooltip from './Tooltip';

const C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42", layer3: "#243352",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  electric: "#4d9fff", plasma: "#a78bfa",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
};

/* ══════════════════════════════════════════════════════════
   ① تحديد لون المقياس حسب التصنيف
═══════════════════════════════════════════════════════════ */
function getMetricColor(classification) {
  var goodClasses = ['excellent', 'veryGood', 'good', 'legendary', 'diversified'];
  var okClasses = ['moderate', 'balanced', 'neutral', 'standard'];
  var badClasses = ['poor', 'negative', 'concentrated', 'highlyConcentrated', 'aggressive', 'speculative', 'very_poor', 'failing', 'catastrophic', 'difficult', 'extreme'];

  if (goodClasses.indexOf(classification) !== -1) return C.mint;
  if (okClasses.indexOf(classification) !== -1) return C.amber;
  if (badClasses.indexOf(classification) !== -1) return C.coral;
  return C.smoke;
}

/* ══════════════════════════════════════════════════════════
   ② حساب Health Score الإجمالي
═══════════════════════════════════════════════════════════ */
function calcHealthScore(analysis) {
  if (!analysis || !analysis.performance) return 50;

  var perf = analysis.performance;
  var risk = analysis.risk;
  var div = analysis.diversification;

  // وزن الأداء 30%
  var perfScore = 50;
  if (perf.sharpe > 1) perfScore = 85;
  else if (perf.sharpe > 0.5) perfScore = 70;
  else if (perf.sharpe > 0) perfScore = 55;
  else perfScore = 30;

  // وزن المخاطر 30%
  var riskScore = 50;
  if (risk && risk.maxDrawdown > -0.10) riskScore = 80;
  else if (risk && risk.maxDrawdown > -0.20) riskScore = 60;
  else if (risk && risk.maxDrawdown > -0.30) riskScore = 40;
  else riskScore = 25;

  // وزن التنويع 40%
  var divScore = (div && div.score) ? div.score : 50;

  var finalScore = Math.round(perfScore * 0.3 + riskScore * 0.3 + divScore * 0.4);
  return Math.max(0, Math.min(100, finalScore));
}

/* ══════════════════════════════════════════════════════════
   ③ تحديد الحرف والتصنيف
═══════════════════════════════════════════════════════════ */
function getGradeInfo(score) {
  if (score >= 90) return { grade: 'A+', label: 'ممتاز', color: C.mint };
  if (score >= 80) return { grade: 'A', label: 'ممتاز', color: C.mint };
  if (score >= 70) return { grade: 'B', label: 'جيد جداً', color: C.electric };
  if (score >= 60) return { grade: 'C', label: 'جيد', color: C.teal };
  if (score >= 50) return { grade: 'D', label: 'متوسط', color: C.amber };
  if (score >= 40) return { grade: 'E', label: 'ضعيف', color: C.coral };
  return { grade: 'F', label: 'خطر', color: C.coral };
}

/* ══════════════════════════════════════════════════════════
   ④ كرت مقياس واحد
═══════════════════════════════════════════════════════════ */
const MetricCard = React.memo(function MetricCard(props) {
  var label = props.label;
  var value = props.value;
  var unit = props.unit || '';
  var classification = props.classification;
  var description = props.description;

  var color = getMetricColor(classification);

  return (
    <div style={{
      background: "linear-gradient(135deg," + C.layer1 + "," + C.layer2 + ")",
      border: "1px solid " + color + "33",
      borderRadius: 12,
      padding: "10px 12px",
      flex: 1,
      minWidth: 0,
    }}>
            <div style={{
        fontSize: 10,
        color: C.smoke,
        fontWeight: 600,
        marginBottom: 4,
        letterSpacing: "0.3px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 4,
      }}>
        <span>{label}</span>
                <Tooltip 
          termKey={
            label === "Sharpe" ? "Sharpe Ratio" :
            label === "Sortino" ? "Sortino Ratio" :
            label === "Alpha" ? "Alpha" :
            label === "Beta" ? "Beta" :
            label === "Calmar" ? "Calmar Ratio" :
            label === "VaR" ? "VaR" :
            label === "VaR 95" ? "VaR" :
            label === "VaR 95%" ? "VaR" :
            label === "CVaR" ? "CVaR" :
            label === "CVaR 95" ? "CVaR" :
            label === "CVaR 95%" ? "CVaR" :
            label === "Max DD" ? "Maximum Drawdown" :
            label === "Maximum Drawdown" ? "Maximum Drawdown" :
            label === "HHI" ? "HHI" :
            label === "Avg Corr" ? "Avg Corr" :
            label === "Score" ? "Score" :
            label === "المتوسط μ" ? "المتوسط μ" :
            label === "VaR Distribution" ? "VaR Distribution" :
            label === "Correlation Matrix" ? "Correlation" :
            label === "خريطة Markowitz" ? "Markowitz" :
            label
          } 
          size="small"
        />
      </div>
      <div style={{
        fontFamily: "IBM Plex Mono,monospace",
        fontSize: 16,
        fontWeight: 900,
        color: color,
        lineHeight: 1.1,
        marginBottom: 2,
      }}>
        {value}{unit}
      </div>
           {description && (
        <div style={{
          fontSize: 9,
          color: C.ash,
          marginTop: 2,
          lineHeight: 1.3,
        }}>
          {description}
        </div>
      )}
    </div>
  );
});

/* ══════════════════════════════════════════════════════════
   ⑤ Risk Dashboard الرئيسي
═══════════════════════════════════════════════════════════ */
export default function RiskDashboard(props) {
  var analysis = props.analysis;
  var expandedState = useState(false);
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];

  // ✨ الـhooks قبل أي return مشروط -- قاعدة React الأساسية
  var healthScore = useMemo(function () {
    return calcHealthScore(analysis);
  }, [analysis]);

  if (!analysis || !analysis.totalValue) {
    return null;
  }

  var gradeInfo = getGradeInfo(healthScore);
  var perf = analysis.performance || {};
  var risk = analysis.risk || {};
  var div = analysis.diversification || {};
  var layers = analysis.layersIntelligence || {};
  var finalRec = analysis.finalRecommendation || {};

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + " 0%," + C.layer2 + " 100%)",
      borderRadius: 18,
      border: "1px solid " + gradeInfo.color + "44",
      boxShadow: "0 8px 32px " + gradeInfo.color + "11, 0 2px 8px rgba(0,0,0,.4)",
      overflow: "hidden",
      marginBottom: 12,
    }}>
      {/* ── شريط علوي ── */}
      <div style={{
        height: 3,
        background: "linear-gradient(90deg," + gradeInfo.color + "00," + gradeInfo.color + "cc," + gradeInfo.color + "00)"
      }} />

      {/* ── Header: Health Score ── */}
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid " + C.line + "33",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}>
        {/* دائرة الدرجة */}
        <div style={{ position: "relative", width: 70, height: 70, flexShrink: 0 }}>
          <svg width={70} height={70} style={{ transform: "rotate(-90deg)", position: "absolute", inset: 0 }}>
            <circle cx={35} cy={35} r={30} fill="none" stroke={C.ash} strokeWidth={4} strokeOpacity={0.2} />
            <circle
              cx={35} cy={35} r={30}
              fill="none"
              stroke={gradeInfo.color}
              strokeWidth={4}
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - healthScore / 100)}
              strokeLinecap="round"
              style={{
                filter: "drop-shadow(0 0 6px " + gradeInfo.color + "aa)",
                transition: "stroke-dashoffset 1s ease",
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
              fontSize: 18,
              fontWeight: 900,
              color: gradeInfo.color,
              lineHeight: 1,
              textShadow: "0 0 10px " + gradeInfo.color + "88",
            }}>
              {healthScore}
            </div>
            <div style={{
              fontSize: 11,
              color: gradeInfo.color,
              fontWeight: 800,
              marginTop: 2,
            }}>
              {gradeInfo.grade}
            </div>
          </div>
        </div>

        {/* النص */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10,
            color: C.gold,
            fontWeight: 700,
            letterSpacing: "1.5px",
            marginBottom: 3,
          }}>
            لوحة المخاطر الشاملة
          </div>
          <div style={{
            fontSize: 15,
            fontWeight: 900,
            color: C.snow,
            marginBottom: 3,
          }}>
            صحة المحفظة: {gradeInfo.label}
          </div>
                   <div style={{
            fontSize: 11,
            color: C.smoke,
            lineHeight: 1.4,
          }}>
            18 مقياساً عالمياً · تحليل أكاديمي شامل
          </div>

          {/* ✨ إفصاح مصدر المرجع (TASI) -- يوضّح أساس Beta/Alpha */}
          {analysis.benchmarkSource && analysis.benchmarkSource !== 'pending' && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "Cairo,sans-serif",
              color: analysis.benchmarkSource === 'real' ? C.mint : C.amber,
              background: (analysis.benchmarkSource === 'real' ? C.mint : C.amber) + "14",
              border: "1px solid " + (analysis.benchmarkSource === 'real' ? C.mint : C.amber) + "33",
            }}>
              {analysis.benchmarkSource === 'real'
                ? '✓ المرجع: مؤشر تاسي حقيقي'
                : '⚠ المرجع: تقديري (مشتقّ من محفظتك) -- Beta/Alpha نسبية'}
            </div>
          )}
        </div>
      </div>

      {/* ── 3 أقسام رئيسية ── */}
      <div style={{ padding: "12px 14px" }}>
        {/* القسم 1: الأداء */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}>
            <div style={{
              width: 3,
              height: 12,
              background: C.electric,
              borderRadius: 2,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.mist,
              letterSpacing: "0.5px",
            }}>
              📈 الأداء
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <MetricCard
              label="Sharpe"
              value={perf.sharpe != null ? perf.sharpe.toFixed(2) : '-'}
              classification={perf.sharpeClass}
              description={perf.sharpeLabel}
            />
            <MetricCard
              label="Sortino"
              value={perf.sortino != null ? perf.sortino.toFixed(2) : (perf.sortinoClass === 'perfect' ? '∞' : '-')}
              classification={perf.sortinoClass}
              description={perf.sortinoLabel}
            />
            <MetricCard
              label="Alpha"
              value={perf.alpha != null ? (perf.alpha * 100).toFixed(1) : '-'}
              unit="%"
              classification={perf.alphaClass}
              description={perf.alphaLabel}
            />
          </div>
        </div>

        {/* القسم 2: المخاطر */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}>
            <div style={{
              width: 3,
              height: 12,
              background: C.coral,
              borderRadius: 2,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.mist,
              letterSpacing: "0.5px",
            }}>
              📉 المخاطر
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <MetricCard
              label="Max DD"
              value={risk.maxDrawdown != null ? (risk.maxDrawdown * 100).toFixed(1) : '-'}
              unit="%"
              classification={risk.drawdownClass}
              description={risk.drawdownLabel}
            />
            <MetricCard
              label="VaR 95%"
              value={risk.var95Daily != null ? (risk.var95Daily * 100).toFixed(2) : '-'}
              unit="%"
              classification={risk.varClass}
              description={risk.varLabel}
            />
            <MetricCard
              label="CVaR"
              value={risk.cvar95Daily != null ? (risk.cvar95Daily * 100).toFixed(2) : '-'}
              unit="%"
              classification={risk.cvarClass}
              description={risk.cvarLabel}
            />
          </div>
        </div>

        {/* القسم 3: التنويع */}
        <div style={{ marginBottom: 8 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}>
            <div style={{
              width: 3,
              height: 12,
              background: C.mint,
              borderRadius: 2,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: C.mist,
              letterSpacing: "0.5px",
            }}>
              🎯 التنويع
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <MetricCard
              label="HHI"
              value={div.hhi || '-'}
              classification={div.hhiClass}
              description={div.hhiLabel}
            />
            <MetricCard
              label="Avg Corr"
              value={div.avgCorrelation != null ? div.avgCorrelation.toFixed(2) : '-'}
              classification={div.correlationClass}
              description={div.correlationLabel}
            />
            <MetricCard
              label="Score"
              value={div.score || '-'}
              unit="/100"
              classification={div.scoreClass}
              description={div.scoreLabel}
            />
          </div>
        </div>

        {/* ⭐ التوصية النهائية الذكية (الخطوة 25) */}
        {finalRec && finalRec.label && (
          <div style={{
            background: finalRec.color === 'mint' ? "rgba(30,230,138,0.08)"
                      : finalRec.color === 'amber' ? "rgba(251,191,36,0.08)"
                      : "rgba(255,95,106,0.08)",
            border: "1px solid " + (finalRec.color === 'mint' ? C.mint
                                   : finalRec.color === 'amber' ? C.amber
                                   : C.coral) + "44",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 10,
          }}>
            <div style={{
              fontSize: 10,
              color: C.gold,
              fontWeight: 700,
              marginBottom: 6,
              letterSpacing: "1px",
            }}>
              🏆 التوصية النهائية الذكية
            </div>
            <div style={{
              fontSize: 15,
              fontWeight: 900,
              color: finalRec.color === 'mint' ? C.mint
                   : finalRec.color === 'amber' ? C.amber
                   : C.coral,
              marginBottom: 6,
            }}>
              {finalRec.label}
            </div>
            <div style={{
              fontSize: 11,
              color: C.mist,
              marginBottom: 8,
            }}>
              درجة الثقة: {finalRec.confidence}/100 · جودة الأسهم: {layers.weightedScore || '-'}/100
            </div>

            {finalRec.reasons && finalRec.reasons.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {finalRec.reasons.map(function(reason, i) {
                  return (
                    <div key={i} style={{
                      fontSize: 10,
                      color: reason.positive ? C.mint : C.coral,
                      lineHeight: 1.5,
                      marginBottom: 2,
                    }}>
                      {reason.icon} {reason.text}
                    </div>
                  );
                })}
              </div>
            )}

            {finalRec.actions && finalRec.actions.length > 0 && (
              <div style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: "1px solid " + C.line + "33",
              }}>
                <div style={{
                  fontSize: 9,
                  color: C.gold,
                  fontWeight: 700,
                  marginBottom: 4,
                }}>
                  📋 الإجراءات الموصى بها:
                </div>
                {finalRec.actions.map(function(action, i) {
                  return (
                    <div key={i} style={{
                      fontSize: 10,
                      color: C.mist,
                      lineHeight: 1.5,
                      marginBottom: 2,
                    }}>
                      {action}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* زر التوسعة */}
        <button
          onClick={function () { setExpanded(!expanded); }}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid " + C.line,
            borderRadius: 10,
            padding: "8px",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 700,
            color: C.smoke,
            fontFamily: "Cairo,sans-serif",
            marginTop: 4,
            transition: "all .2s",
          }}
        >
          {expanded ? '▲ إخفاء التفاصيل' : '▼ عرض التفاصيل الكاملة'}
        </button>

        {/* قسم التفاصيل الموسعة */}
        {expanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid " + C.line + "33" }}>
            {/* تفاصيل الأداء */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.electric, fontWeight: 700, marginBottom: 6, letterSpacing: "1px" }}>
                تفاصيل الأداء
              </div>
              <div style={{ fontSize: 10, color: C.mist, lineHeight: 1.7 }}>
                <div>• عائد سنوي: <span style={{ color: C.snow, fontWeight: 700 }}>{perf.annualReturn != null ? (perf.annualReturn * 100).toFixed(2) + '%' : '-'}</span></div>
                <div>• تذبذب سنوي: <span style={{ color: C.snow, fontWeight: 700 }}>{perf.volatility != null ? (perf.volatility * 100).toFixed(2) + '%' : '-'}</span></div>
                <div>• Beta vs تاسي: <span style={{ color: C.snow, fontWeight: 700 }}>{perf.beta != null ? perf.beta.toFixed(2) : '-'}</span></div>
                <div>• Downside Deviation: <span style={{ color: C.snow, fontWeight: 700 }}>{risk.downsideDeviationAnnual != null ? (risk.downsideDeviationAnnual * 100).toFixed(2) + '%' : '-'}</span></div>
              </div>
            </div>

            {/* تفاصيل المخاطر */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.coral, fontWeight: 700, marginBottom: 6, letterSpacing: "1px" }}>
                تفاصيل المخاطر
              </div>
              <div style={{ fontSize: 10, color: C.mist, lineHeight: 1.7 }}>
                <div>• خسارة يومية محتملة (VaR): <span style={{ color: C.coral, fontWeight: 700 }}>{risk.var95DailySAR != null ? risk.var95DailySAR.toLocaleString() + ' ر.س' : '-'}</span></div>
                <div>• خسارة كارثية (CVaR): <span style={{ color: C.coral, fontWeight: 700 }}>{risk.cvar95DailySAR != null ? risk.cvar95DailySAR.toLocaleString() + ' ر.س' : '-'}</span></div>
                <div>• Calmar Ratio: <span style={{ color: C.snow, fontWeight: 700 }}>{risk.calmar != null ? risk.calmar.toFixed(2) : '-'}</span></div>
                <div>• مدة التراجع: <span style={{ color: C.snow, fontWeight: 700 }}>{risk.drawdownDuration || '-'} يوم</span></div>
              </div>
            </div>

            {/* تفاصيل التنويع */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: C.mint, fontWeight: 700, marginBottom: 6, letterSpacing: "1px" }}>
                تفاصيل التنويع
              </div>
              <div style={{ fontSize: 10, color: C.mist, lineHeight: 1.7 }}>
                <div>• عدد الأسهم الفعلي: <span style={{ color: C.snow, fontWeight: 700 }}>{div.effectiveStocks || '-'}</span></div>
                <div>• السهم الأكبر: <span style={{ color: C.snow, fontWeight: 700 }}>{div.largestPosition || '-'}%</span></div>
                <div>• أعلى ارتباط: <span style={{ color: C.snow, fontWeight: 700 }}>{div.maxCorrelation != null ? div.maxCorrelation.toFixed(2) : '-'}</span></div>
                <div>• ارتباطات عالية: <span style={{ color: C.snow, fontWeight: 700 }}>{div.highCorrelationCount || 0} زوج</span></div>
              </div>
            </div>

            {/* ⚡ اختبارات الإجهاد (الخطوة 24) */}
            {analysis.stressTests && analysis.stressTests.length > 0 && (
              <div style={{
                background: "rgba(255,95,106,0.04)",
                border: "1px solid " + C.coral + "22",
                borderRadius: 10,
                padding: "10px",
                marginTop: 10,
                marginBottom: 10,
              }}>
                <div style={{
                  fontSize: 10,
                  color: C.coral,
                  fontWeight: 700,
                  marginBottom: 8,
                  letterSpacing: "1px"
                }}>
                  ⚡ اختبارات الإجهاد (ماذا لو تاسي انهار؟)
                </div>
                {analysis.stressTests.map(function (test, i) {
                  var color = test.severityColor === 'mint' ? C.mint
                            : test.severityColor === 'amber' ? C.amber
                            : C.coral;
                  return (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid " + color + "22",
                      borderRadius: 8,
                      padding: "8px 10px",
                      marginBottom: 6,
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}>
                        <div style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: C.snow,
                        }}>
                          {test.icon} {test.name}
                        </div>
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: color,
                          background: color + "15",
                          borderRadius: 4,
                          padding: "1px 6px",
                        }}>
                          {test.severity}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: C.smoke,
                        marginBottom: 4,
                        lineHeight: 1.4,
                      }}>
                        {test.description}
                      </div>
                      <div style={{
                        display: "flex",
                        gap: 8,
                        fontSize: 10,
                        fontFamily: "IBM Plex Mono,monospace",
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: C.ash }}>الخسارة: </span>
                          <span style={{ color: color, fontWeight: 800 }}>
                            {test.expectedLossPct != null ? (test.expectedLossPct * 100).toFixed(1) + '%' : '-'}
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: C.ash }}>بالريال: </span>
                          <span style={{ color: color, fontWeight: 800 }}>
                            {Math.abs(test.expectedLossSAR).toLocaleString()} ر.س
                          </span>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 9,
                        color: C.ash,
                        marginTop: 4,
                      }}>
                        ⏳ التعافي المتوقع: {test.recoveryDays} يوم
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* التوصيات */}
            {div.recommendations && div.recommendations.length > 0 && (
              <div style={{
                background: "rgba(240,192,80,0.06)",
                border: "1px solid " + C.gold + "22",
                borderRadius: 10,
                padding: "10px",
                marginTop: 10,
              }}>
                <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginBottom: 6, letterSpacing: "1px" }}>
                  💡 التوصيات الذكية
                </div>
                {div.recommendations.map(function (rec, i) {
                  return (
                    <div key={i} style={{
                      fontSize: 10,
                      color: C.mist,
                      lineHeight: 1.5,
                      marginBottom: 4,
                    }}>
                      {rec.icon} {rec.text}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
