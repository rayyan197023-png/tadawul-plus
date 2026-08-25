'use client';
/**
 * AI Learning Dashboard - Premium Design
 * Shows real-time learning statistics and insights
 */

import React, { useState, useEffect, useMemo } from 'react';
import { loadFeedbackState, getAdaptiveWeightAdjustment } from '../engines/analysisEngine';
import { STOCKS_MAP } from '../constants/stocksData';

const C = {
  ink: "#0a0e1a",
  void: "#111827",
  layer1: "#1a2236",
  layer2: "#232e4a",
  layer3: "#2d3a5c",
  line: "#3a4769",
  
  snow: "#ffffff",
  cream: "#f5f1e8",
  mist: "#d4d8e0",
  smoke: "#9ca3af",
  ash: "#6b7280",
  
  gold: "#d4af37",
  goldL: "#f7d560",
  
  electric: "#3b82f6",
  plasma: "#8b5cf6",
  mint: "#10b981",
  coral: "#ef4444",
  amber: "#f59e0b",
  teal: "#06b6d4",
};

export default function AILearningDashboard({ onBack }) {
  const [feedbackState, setFeedbackState] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const state = loadFeedbackState() || {};
    setFeedbackState(state);
  }, [refreshKey]);

  // إحصائيات شاملة
  const stats = useMemo(() => {
    const symbols = Object.keys(feedbackState);
    
    let totalTrades = 0;
    let totalCorrect = 0;
    const stockStats = [];
    const layerStats = { L1:{t:0,c:0}, L2:{t:0,c:0}, L3:{t:0,c:0}, L4:{t:0,c:0}, L5:{t:0,c:0}, L6:{t:0,c:0}, L7:{t:0,c:0}, L8:{t:0,c:0}, L9:{t:0,c:0} };
    
        symbols.forEach(sym => {
      const data = feedbackState[sym];
      if (!data) return;
      
      // دعم structure v2 (longTerm) + القديم (total)
      const symTotal = data.version === 2 
        ? (data.longTerm?.totalEver || 0)
        : (data.total || 0);
      const symCorrect = data.version === 2
        ? (data.longTerm?.correctEver || 0)
        : (data.correct || 0);
      
      if (!symTotal) return;
      
            totalTrades += Math.round(symTotal);
      totalCorrect += Math.round(symCorrect);
      
      const accuracy = symTotal > 0 ? (symCorrect / symTotal) * 100 : 0;
      const stockInfo = STOCKS_MAP && STOCKS_MAP[sym];
      
            stockStats.push({
        sym,
        name: stockInfo?.name || sym,
        sector: stockInfo?.sec || '--',
        total: symTotal,
        correct: symCorrect,
        accuracy: +accuracy.toFixed(1),
      });
      
      // جمع stats الطبقات
      if (data.layers) {
        Object.keys(data.layers).forEach(L => {
          if (layerStats[L]) {
            layerStats[L].t += data.layers[L].total || 0;
            layerStats[L].c += data.layers[L].correct || 0;
          }
        });
      }
    });
    
    // فرز الأسهم
    const sortedByAccuracy = [...stockStats].sort((a, b) => b.accuracy - a.accuracy);
    const topStocks = sortedByAccuracy.filter(s => s.total >= 5).slice(0, 5);
    const worstStocks = sortedByAccuracy.filter(s => s.total >= 5).slice(-5).reverse();
    const mostTraded = [...stockStats].sort((a, b) => b.total - a.total).slice(0, 10);
    
    // دقة الطبقات
    const layerAccuracy = Object.keys(layerStats).map(L => ({
      layer: L,
      accuracy: layerStats[L].t > 0 ? (layerStats[L].c / layerStats[L].t) * 100 : 0,
      total: layerStats[L].t,
    })).sort((a, b) => b.accuracy - a.accuracy);
    
    const overallAccuracy = totalTrades > 0 ? (totalCorrect / totalTrades) * 100 : 0;
    
    // مستوى الخبرة
    let experienceLevel = 'مبتدئ';
    let experienceColor = C.smoke;
    let experienceIcon = '🌱';
    if (totalTrades >= 10000) { experienceLevel = 'أسطوري'; experienceColor = C.gold; experienceIcon = '👑'; }
    else if (totalTrades >= 5000) { experienceLevel = 'خبير'; experienceColor = C.plasma; experienceIcon = '🏆'; }
    else if (totalTrades >= 1000) { experienceLevel = 'متقدم'; experienceColor = C.electric; experienceIcon = '⭐'; }
    else if (totalTrades >= 100) { experienceLevel = 'متوسط'; experienceColor = C.mint; experienceIcon = '📈'; }
    else if (totalTrades >= 10) { experienceLevel = 'مبتدئ'; experienceColor = C.teal; experienceIcon = '🌿'; }
    
    return {
      totalTrades,
      totalCorrect,
      totalWrong: totalTrades - totalCorrect,
      overallAccuracy: +overallAccuracy.toFixed(1),
      uniqueStocks: symbols.length,
      topStocks,
      worstStocks,
      mostTraded,
      layerAccuracy,
      experienceLevel,
      experienceColor,
      experienceIcon,
    };
  }, [feedbackState]);


  const hasData = stats.totalTrades > 0;

  return (
    <div style={{
      background: `radial-gradient(ellipse at top, ${C.layer1} 0%, ${C.ink} 100%)`,
      minHeight: '100vh',
      padding: '16px 12px 100px',
      fontFamily: "'Cairo', sans-serif",
      direction: 'rtl',
    }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
      }}>
        <button
          onClick={onBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: `1px solid ${C.line}`,
            background: C.layer2,
            color: C.snow,
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          →
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            color: C.snow,
            letterSpacing: '-0.3px',
          }}>
            🧠 AI Learning
          </div>
          <div style={{ fontSize: 11, color: C.smoke, fontWeight: 500 }}>
            خبرة النظام الذكي
          </div>
        </div>
      </div>

      {!hasData && <EmptyState />}

      {hasData && (
        <>
          {/* Experience Level */}
          <ExperienceCard stats={stats} />

          {/* Main Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            marginBottom: 16,
          }}>
            <StatCard
              label="إجمالي الصفقات"
              value={stats.totalTrades.toLocaleString()}
              icon="📊"
              color={C.electric}
              subtitle={`${stats.uniqueStocks} سهم`}
            />
            <StatCard
              label="معدل الدقة"
              value={`${stats.overallAccuracy}%`}
              icon="🎯"
              color={stats.overallAccuracy >= 70 ? C.mint : stats.overallAccuracy >= 50 ? C.amber : C.coral}
              subtitle={`${stats.totalCorrect} صح من ${stats.totalTrades}`}
            />
            <StatCard
              label="صفقات ناجحة"
              value={stats.totalCorrect.toLocaleString()}
              icon="✅"
              color={C.mint}
              subtitle={`${((stats.totalCorrect/stats.totalTrades)*100).toFixed(1)}%`}
            />
            <StatCard
              label="صفقات خاطئة"
              value={stats.totalWrong.toLocaleString()}
              icon="❌"
              color={C.coral}
              subtitle={`${((stats.totalWrong/stats.totalTrades)*100).toFixed(1)}%`}
            />
          </div>

          {/* Accuracy Progress */}
          <AccuracyProgress accuracy={stats.overallAccuracy} />

          {/* Top Stocks */}
          {stats.topStocks.length > 0 && (
            <SectionCard title="🏆 أفضل أداء" color={C.mint}>
              {stats.topStocks.map((stock, i) => (
                <StockRow
                  key={stock.sym}
                  rank={i + 1}
                  stock={stock}
                  color={C.mint}
                  showBadge={i === 0}
                />
              ))}
            </SectionCard>
          )}

          {/* Worst Stocks */}
          {stats.worstStocks.length > 0 && (
            <SectionCard title="⚠️ يحتاج مراجعة" color={C.coral}>
              {stats.worstStocks.map((stock, i) => (
                <StockRow
                  key={stock.sym}
                  rank={i + 1}
                  stock={stock}
                  color={C.coral}
                />
              ))}
            </SectionCard>
          )}

          {/* Most Traded */}
          {stats.mostTraded.length > 0 && (
            <SectionCard title="📈 الأكثر تحليلاً" color={C.electric}>
              {stats.mostTraded.slice(0, 5).map((stock, i) => (
                <StockRow
                  key={stock.sym}
                  rank={i + 1}
                  stock={stock}
                  color={C.electric}
                  showTotal
                />
              ))}
            </SectionCard>
          )}

          {/* Layer Performance */}
          <SectionCard title="🎯 أداء الطبقات (١-٩)" color={C.gold}>
            <LayerPerformance layers={stats.layerAccuracy} />
          </SectionCard>

          {/* مؤشر الحفظ التلقائي */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 16,
            padding: '12px',
            background: `linear-gradient(135deg, ${C.mint}15, ${C.mint}05)`,
            border: `1px solid ${C.mint}33`,
            borderRadius: 14,
          }}>
            <span style={{ fontSize: 14 }}>💾</span>
            <span style={{
              fontSize: 12,
              color: C.mint,
              fontWeight: 700,
            }}>
              يتم الحفظ تلقائياً
            </span>
          </div>

          {/* Info Box */}
          <div style={{
            marginTop: 20,
            padding: 16,
            background: `linear-gradient(135deg, ${C.plasma}15, ${C.electric}08)`,
            border: `1px solid ${C.plasma}33`,
            borderRadius: 14,
          }}>
            <div style={{
              fontSize: 12,
              color: C.snow,
              fontWeight: 800,
              marginBottom: 8,
            }}>
              💡 كيف يعمل النظام؟
            </div>
            <div style={{
              fontSize: 11,
              color: C.mist,
              lineHeight: 1.7,
              fontWeight: 400,
            }}>
              يتعلم النظام من كل صفقة في Backtest تلقائياً. 
              كل صفقة ناجحة أو فاشلة تُحسّن الأوزان الذكية. 
              كلما زادت الصفقات، زادت دقة التوقعات المستقبلية.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Empty State
// ═══════════════════════════════════════════════
function EmptyState() {
  return (
    <div style={{
      padding: '60px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 72,
        marginBottom: 20,
        opacity: 0.5,
      }}>
        🧠
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 900,
        color: C.snow,
        marginBottom: 8,
      }}>
        النظام جاهز للتعلم
      </div>
      <div style={{
        fontSize: 13,
        color: C.smoke,
        lineHeight: 1.7,
        marginBottom: 20,
        maxWidth: 280,
        margin: '0 auto 24px',
      }}>
        لم يُسجّل أي تعلم بعد. شغّل Backtest لتبدأ رحلة التعلم!
      </div>
      <div style={{
        display: 'inline-block',
        padding: '10px 20px',
        background: `${C.electric}15`,
        border: `1px solid ${C.electric}44`,
        borderRadius: 12,
        fontSize: 12,
        color: C.electric,
        fontWeight: 700,
      }}>
        ✨ اذهب إلى Backtest وشغّل محاكاة
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Experience Card
// ═══════════════════════════════════════════════
function ExperienceCard({ stats }) {
  const progress = Math.min((stats.totalTrades / 10000) * 100, 100);
  
  return (
    <div style={{
      background: `linear-gradient(135deg, ${stats.experienceColor}22, ${stats.experienceColor}08)`,
      border: `1.5px solid ${stats.experienceColor}66`,
      borderRadius: 18,
      padding: 20,
      marginBottom: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: -40,
        left: -40,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${stats.experienceColor}33 0%, transparent 70%)`,
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            fontSize: 36,
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            {stats.experienceIcon}
          </div>
          <div>
            <div style={{
              fontSize: 11,
              color: C.smoke,
              fontWeight: 600,
              letterSpacing: '1px',
              marginBottom: 2,
            }}>
              المستوى الحالي
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              color: stats.experienceColor,
              letterSpacing: '-0.3px',
            }}>
              {stats.experienceLevel}
            </div>
          </div>
        </div>
        
        <div style={{
          height: 6,
          background: C.layer3,
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${stats.experienceColor}, ${C.goldL})`,
            borderRadius: 3,
            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: `0 0 12px ${stats.experienceColor}88`,
          }} />
        </div>
        
        <div style={{
          fontSize: 10,
          color: C.smoke,
          fontWeight: 500,
        }}>
          {stats.totalTrades.toLocaleString()} / 10,000 صفقة للأسطورة
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Stat Card
// ═══════════════════════════════════════════════
function StatCard({ label, value, icon, color, subtitle }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      border: `1px solid ${color}33`,
      borderRadius: 14,
      padding: 14,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 8,
        left: 10,
        fontSize: 18,
        opacity: 0.3,
      }}>
        {icon}
      </div>
      
      <div style={{
        fontSize: 9,
        color: C.smoke,
        fontWeight: 600,
        letterSpacing: '0.5px',
        marginBottom: 6,
      }}>
        {label}
      </div>
      
      <div style={{
        fontSize: 22,
        fontWeight: 900,
        color: color,
        letterSpacing: '-0.5px',
        marginBottom: 4,
      }}>
        {value}
      </div>
      
      <div style={{
        fontSize: 9,
        color: C.smoke,
        fontWeight: 500,
      }}>
        {subtitle}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Accuracy Progress
// ═══════════════════════════════════════════════
function AccuracyProgress({ accuracy }) {
  const color = accuracy >= 70 ? C.mint : accuracy >= 50 ? C.amber : C.coral;
  
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}15, ${color}05)`,
      border: `1px solid ${color}44`,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 800,
          color: C.snow,
        }}>
          📊 مؤشر الدقة الإجمالي
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 900,
          color: color,
          letterSpacing: '-0.5px',
        }}>
          {accuracy}%
        </div>
      </div>
      
      <div style={{
        height: 10,
        background: C.layer3,
        borderRadius: 5,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${accuracy}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: 5,
          transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `0 0 16px ${color}aa`,
        }} />
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 6,
        fontSize: 9,
        color: C.smoke,
        fontWeight: 500,
      }}>
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Section Card
// ═══════════════════════════════════════════════
function SectionCard({ title, color, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(20px)',
      border: `1px solid ${C.line}`,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
    }}>
      <div style={{
        fontSize: 14,
        fontWeight: 900,
        color: color,
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: `1px solid ${color}22`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════
// Stock Row
// ═══════════════════════════════════════════════
function StockRow({ rank, stock, color, showBadge, showTotal }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: `1px solid ${C.line}22`,
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: rank <= 3 ? `${color}22` : C.layer3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 900,
        color: rank <= 3 ? color : C.smoke,
      }}>
        {rank}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 800,
          color: C.snow,
          marginBottom: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {stock.name}
          {showBadge && (
            <span style={{
              marginRight: 6,
              padding: '2px 6px',
              background: `${color}22`,
              borderRadius: 4,
              fontSize: 9,
              color: color,
              fontWeight: 700,
            }}>
              🏆
            </span>
          )}
        </div>
        <div style={{
          fontSize: 9,
          color: C.smoke,
          fontWeight: 500,
        }}>
          {stock.sym} • {stock.total} صفقة
        </div>
      </div>
      
      <div style={{
        fontSize: 16,
        fontWeight: 900,
        color: color,
        letterSpacing: '-0.5px',
      }}>
        {showTotal ? stock.total : `${stock.accuracy}%`}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Layer Performance
// ═══════════════════════════════════════════════
function LayerPerformance({ layers }) {
  // ✨ الأسماء مطابقة لـ FullAnalysisModal -- كانت معكوسة تقريباً
  const layerNames = {
    L1: 'هيكل الحركة',
    L2: 'توافق الحجم والحركة',
    L3: 'انتظام الحركة',
    L4: 'أداء مقارنة بالسوق',
    L5: 'تأكيد المؤشرات',
    L6: 'جدوى الصفقة',
    L7: 'ثقة الاحتمالية',
    L8: 'نقاط الفرصة',
    L9: 'قوة السيولة',
  };
  
  // ✨ Confidence levels based on sample size
  const getConfidence = (total) => {
    if (total === 0) return { icon: '⚪', label: 'لا بيانات', color: C.smoke };
    if (total < 5) return { icon: '🔴', label: 'غير موثوقة', color: C.coral };
    if (total < 10) return { icon: '🟡', label: 'عينة صغيرة', color: C.amber };
    if (total < 30) return { icon: '🟢', label: 'محدودة', color: C.mint };
    return { icon: '✅', label: 'موثوقة', color: C.mint };
  };
  
  // ✨ تحذير عام إذا كل الطبقات لها عينة صغيرة
  const totalSample = layers.reduce((sum, l) => sum + (l.total || 0), 0) / layers.length;
  const showSampleWarning = totalSample < 10;
  
  return (
    <div>
      {/* ✨ تحذير العينة الصغيرة */}
      {showSampleWarning && (
        <div style={{
          padding: '10px 12px',
          background: `linear-gradient(135deg, ${C.amber}15, ${C.amber}05)`,
          border: `1px solid ${C.amber}44`,
          borderRadius: 10,
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11,
            color: C.amber,
            fontWeight: 800,
            marginBottom: 4,
          }}>
            ⚠️ عينة صغيرة جداً
          </div>
          <div style={{
            fontSize: 11,
            color: C.mist,
            lineHeight: 1.6,
          }}>
            النسب الحالية مبنية على {Math.round(totalSample)} صفقة فقط.
            <br/>
            تحتاج <strong style={{color: C.gold}}>30+ صفقة</strong> للحصول على نسب موثوقة.
          </div>
        </div>
      )}
      
      {layers.map((l, i) => {
        const color = l.accuracy >= 70 ? C.mint : l.accuracy >= 50 ? C.amber : C.coral;
        const confidence = getConfidence(l.total || 0);
        const isReliable = (l.total || 0) >= 10;
        
        return (
          <div key={l.layer} style={{
            marginBottom: i < layers.length - 1 ? 12 : 0,
            opacity: isReliable ? 1 : 0.7, // ✨ خفّض السطوع للعينات الصغيرة
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.snow,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                {l.layer} • {layerNames[l.layer]}
                {/* ✨ confidence indicator */}
                <span style={{
                  fontSize: 9,
                  color: confidence.color,
                  marginRight: 4,
                }}>
                  {confidence.icon}
                </span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {/* ✨ عدد الصفقات */}
                <span style={{
                  fontSize: 9,
                  color: C.smoke,
                  fontFamily: 'IBM Plex Mono, monospace',
                }}>
                  ({Math.round(l.total || 0)})
                </span>
                <div style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: isReliable ? color : C.smoke, // ✨ لون باهت للعينات الصغيرة
                }}>
                  {l.total > 0 ? `${l.accuracy.toFixed(0)}%` : '--'}
                </div>
              </div>
            </div>
            <div style={{
              height: 5,
              background: C.layer3,
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${l.accuracy}%`,
                background: isReliable ? color : `${color}66`, // ✨ شفاف للعينات الصغيرة
                borderRadius: 3,
                transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isReliable ? `0 0 8px ${color}88` : 'none',
              }}/>
            </div>
          </div>
        );
      })}
      
      {/* ✨ نصيحة للمستخدم */}
      {showSampleWarning && (
        <div style={{
          marginTop: 14,
          padding: '8px 10px',
          background: C.void + '88',
          borderRadius: 8,
          fontSize: 10,
          color: C.smoke,
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          💡 أجرِ Backtests متعددة في صفحة Backtest Lab لتدريب AI
        </div>
      )}
    </div>
  );
}
