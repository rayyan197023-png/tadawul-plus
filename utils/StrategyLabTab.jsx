'use client';
/**
 * @module utils/StrategyLabTab
 * @description واجهة Strategy Lab داخل صفحة الباك-تيست
 * 
 * 🎯 الهدف:
 * - تبويب منفصل داخل BacktestScreen.
 * - 3 شاشات: إعداد، تشغيل، نتائج.
 * - تجربة تعليميّة بسيطة بالعربية.
 * 
 * 📦 يستورد من:
 * - strategyLab (المحرّك)
 * - strategyFitness (للعرض)
 * - stockClassifier (للتصنيف)
 * 
 * 🔌 يحتاج props:
 * - C (الألوان)
 * - runBacktest (دالة الباك-تيست من المكوّن الأب)
 * - historicalData (البيانات الجاهزة)
 * - onApplyWinner (callback عند تطبيق الفائز)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  runStrategyLab,
  createLabConfig,
  estimateDuration,
  generateLabReport,
  MODE_CONFIGS,
} from '../engines/strategyLab';
import { generateAnchorFromAILearning, getAILearningStats } from '../engines/aiLearningWeights';
import { getTierInfo } from '../engines/strategyFitness';
import { setLabSeed } from '../engines/strategyGenerator';
// 🆕 لم نعد بحاجة لـ stockClassifier (Universe موحَّد)
// import { getTypeIcon, getTypeArabic, getTypeColor, getTypeDescription } from '../engines/stockClassifier';

// ════════════════════════════════════════════════════════════
//  PHASE: SETUP - شاشة الإعداد
// ════════════════════════════════════════════════════════════

function SetupPhase({ C, onStart, isReady, dataInfo }) {
  const [mode, setMode] = useState('quick');
  
  // 🆕 targetType ثابت = 'leader' (للتوافق مع الكود)
  // لكنّ الـ Universe الفعليّ يأتي من Backtest (٥٠ سهم متنوّعة)
  const targetType = 'leader';
  
  const yearsOfData = dataInfo?.years || 4;
  const estimate = estimateDuration(mode, yearsOfData);
  
  return (
    <div style={{ padding: '16px' }}>
      
      {/* ═══ مقدّمة ═══ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.electric}15, ${C.electric}05)`,
        border: `1px solid ${C.electric}33`,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18 }}>🧪</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.electric }}>
            Strategy Lab -- مختبر تطوير الاستراتيجيات
          </span>
        </div>
        <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.5 }}>
          النظام يُجرّب عشرات الاستراتيجيات تلقائياً، يختار الأفضل، ويختبرها على بيانات لم يَرَها.
          الهدف: استراتيجية فائزة تتفوّق على السوق.
        </div>
      </div>
      
      {/* ═══ 🆕 معلومة عن Universe ═══ */}
      <div style={{
        marginBottom: 16,
        padding: '12px 14px',
        background: `linear-gradient(135deg, #10b98115, #10b98105)`,
        border: `1px solid #10b98144`,
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>🌍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#10b981', marginBottom: 2 }}>
              السوق المتنوّع -- ٥٠ سهم
            </div>
            <div style={{ fontSize: 9, color: C.smoke, lineHeight: 1.4 }}>
              يستعمل نفس بيانات الباك-تيست (يتنوّع في كل تشغيل)
            </div>
          </div>
        </div>
        <div style={{
          fontSize: 9,
          color: C.mist,
          fontStyle: 'italic',
          padding: '6px 10px',
          background: 'rgba(16,185,129,0.08)',
          borderRadius: 6,
          borderRight: '2px solid #10b981',
          lineHeight: 1.5,
        }}>
          💡 المختبر يكتشف Winner عامّ يعمل على ٧ شخصيّات مختلفة من الأسهم
          (LEADER / GROWTH / VALUE / DIVIDEND / TURNAROUND / SPECULATIVE / AVOID)
        </div>
      </div>
      
      {/* ═══ اختيار الوضع ═══ */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.snow, marginBottom: 8 }}>
          ① اختر وضع التشغيل:
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { id: 'quick', label: 'سريع', icon: '🚀', desc: '3 أجيال × 12 استراتيجية', time: '~30 دقيقة' },
            { id: 'deep', label: 'عميق', icon: '🔬', desc: '5 أجيال × 20 استراتيجية', time: '~90 دقيقة' },
            { id: 'ultra', label: 'أقصى', icon: '🧪', desc: '8 أجيال × 30 استراتيجية', time: '~4 ساعات' },
          ].map(m => {
            const isSelected = mode === m.id;
            
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${C.gold}22, ${C.gold}08)`
                    : C.layer2,
                  border: `1px solid ${isSelected ? C.gold + '66' : C.line}`,
                  borderRadius: 12,
                  padding: '10px 14px',
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 2,
                  }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: isSelected ? C.gold : C.snow,
                    }}>
                      {m.label}
                    </span>
                    <span style={{
                      fontSize: 9,
                      color: isSelected ? C.gold : C.smoke,
                      background: isSelected ? C.gold + '15' : 'rgba(255,255,255,0.05)',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}>
                      {m.time}
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: C.smoke }}>
                    {m.desc}
                  </div>
                </div>
                {isSelected && (
                  <span style={{ fontSize: 16, color: C.gold }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* ═══ ملخّص ═══ */}
      <div style={{
        background: C.layer2,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 10, color: C.smoke, marginBottom: 6 }}>
          ⏱ الوقت المتوقّع: <strong style={{ color: C.snow }}>{estimate.minMinutes}-{estimate.maxMinutes} دقيقة</strong>
        </div>
        <div style={{ fontSize: 10, color: C.smoke, marginBottom: 6 }}>
          📊 البيانات: <strong style={{ color: C.snow }}>{dataInfo?.years || '?'} سنوات</strong>
          ({dataInfo?.days || '?'} يوم)
        </div>
        <div style={{ fontSize: 10, color: C.smoke }}>
          🎯 الهدف: استراتيجية تتفوّق على تاسي وتجتاز Test
        </div>
      </div>
      
      {/* ═══ تحذيرات ═══ */}
      <div style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginBottom: 6 }}>
          ⚠ ملاحظات مهمّة قبل البدء:
        </div>
        <ul style={{ fontSize: 9, color: C.mist, paddingRight: 16, lineHeight: 1.6 }}>
          <li>أبقِ الشاشة مفتوحة طوال المدة</li>
          <li>تأكّد من شحن البطارية</li>
          <li>لا تستخدم تطبيقات أخرى بكثافة</li>
          <li>عند الانتهاء، ستظهر الاستراتيجية الفائزة</li>
        </ul>
      </div>
      
      {/* ═══ زرّ البدء ═══ */}
      <button
        onClick={() => onStart(targetType, mode)}
        disabled={!isReady}
        style={{
          width: '100%',
          padding: '14px',
          background: isReady
            ? `linear-gradient(135deg, ${C.mint}, ${C.electric})`
            : C.layer3,
          border: 'none',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 800,
          color: isReady ? C.snow : C.smoke,
          fontFamily: 'Cairo, sans-serif',
          cursor: isReady ? 'pointer' : 'not-allowed',
          opacity: isReady ? 1 : 0.5,
        }}
      >
        {isReady ? '🚀 ابدأ تطوير الاستراتيجيات' : '⏳ تجهيز البيانات...'}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PHASE: RUNNING - شاشة التشغيل
// ════════════════════════════════════════════════════════════

function RunningPhase({ C, progress, onCancel }) {
  if (!progress) return null;
  
  const elapsed = Math.floor(progress.elapsedMs / 1000);
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  
  const remaining = Math.floor(progress.estimatedRemainingMs / 1000);
  const remainingMin = Math.floor(remaining / 60);
  const remainingSec = remaining % 60;
  
  return (
    <div style={{ padding: '16px' }}>
      
      {/* ═══ الحالة الرئيسية ═══ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.electric}22, ${C.electric}08)`,
        border: `1px solid ${C.electric}55`,
        borderRadius: 16,
        padding: '16px',
        marginBottom: 16,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 36,
          marginBottom: 8,
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          🧬
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 800,
          color: C.snow,
          marginBottom: 4,
        }}>
          {progress.phase === 'preparing' && 'تجهيز...'}
          {progress.phase === 'training' && 'تطوير الاستراتيجيات'}
          {progress.phase === 'validating' && 'اختبار Out-of-Sample'}
          {progress.phase === 'completed' && '✅ مكتمل'}
        </div>
        <div style={{ fontSize: 10, color: C.mist, lineHeight: 1.5 }}>
          {progress.message}
        </div>
      </div>
      
      {/* ═══ شريط التقدّم ═══ */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 10, color: C.smoke }}>التقدّم الكلّي</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.electric }}>
            {progress.overallPct}%
          </span>
        </div>
        <div style={{
          height: 8,
          background: C.ash,
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress.overallPct}%`,
            background: `linear-gradient(90deg, ${C.electric}, ${C.mint})`,
            transition: 'width 0.5s ease',
            boxShadow: `0 0 10px ${C.electric}66`,
          }} />
        </div>
      </div>
      
      {/* ═══ تفاصيل ═══ */}
      <div style={{
        background: C.layer2,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>الجيل</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.snow }}>
              {progress.currentGeneration + 1} / {progress.totalGenerations}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>الاستراتيجية</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.snow }}>
              {progress.currentStrategy} / {progress.strategiesInGeneration}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>الباك-تيستات</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.snow }}>
              {progress.completedBacktests}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>الأخطاء</div>
            <div style={{
              fontSize: 14,
              fontWeight: 800,
              color: progress.errors > 0 ? C.coral : C.mint,
            }}>
              {progress.errors}
            </div>
          </div>
        </div>
      </div>
      
      {/* ═══ أفضل Fitness ═══ */}
      {progress.bestFitnessSoFar > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${C.gold}15, ${C.gold}05)`,
          border: `1px solid ${C.gold}33`,
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 16,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: C.smoke, marginBottom: 4 }}>
            🏆 أفضل Fitness حتى الآن
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>
            {progress.bestFitnessSoFar.toFixed(3)}
          </div>
        </div>
      )}
      
      {/* ═══ الوقت ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 16,
      }}>
        <div style={{
          background: C.layer2,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: '8px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: C.smoke, marginBottom: 3 }}>
            ⏱ المنقضي
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.snow }}>
            {elapsedMin}:{String(elapsedSec).padStart(2, '0')}
          </div>
        </div>
        <div style={{
          background: C.layer2,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: '8px 12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: C.smoke, marginBottom: 3 }}>
            ⏳ المتبقّي تقريباً
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.amber }}>
            {remainingMin}:{String(remainingSec).padStart(2, '0')}
          </div>
        </div>
      </div>
      
      {/* ═══ زر الإيقاف ═══ */}
      {progress.phase !== 'completed' && (
        <button
          onClick={() => {
            if (confirm('هل تريد إيقاف التطوير؟ ستُفقد كل النتائج.')) {
              onCancel();
            }
          }}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(240,79,90,0.10)',
            border: `1px solid ${C.coral}55`,
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            color: C.coral,
            fontFamily: 'Cairo, sans-serif',
            cursor: 'pointer',
          }}
        >
          ✕ إيقاف التطوير
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  PHASE: RESULTS - شاشة النتائج
// ════════════════════════════════════════════════════════════

function ResultsPhase({ C, result, onApply, onRestart }) {
  if (!result) return null;
  
  const hasWinner = result.success && result.winner && result.winnerFitness;
  
  return (
    <div style={{ padding: '16px' }}>
      
      {/* ═══ الفائز ═══ */}
      {hasWinner ? (
        <WinnerCard C={C} winner={result.winner} fitness={result.winnerFitness} />
      ) : (
        <NoWinnerCard C={C} result={result} />
      )}
      
      {/* ═══ إحصاءات التطوّر ═══ */}
      <div style={{
        background: C.layer2,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: '12px 14px',
        marginTop: 14,
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.snow, marginBottom: 10 }}>
          📊 إحصاءات التطوّر
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>المدّة</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.snow }}>
              {(result.totalDurationMs / 60000).toFixed(1)} د
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>الباك-تيستات</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.snow }}>
              {result.totalBacktests}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>الأخطاء</div>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: result.totalErrors > 0 ? C.amber : C.mint,
            }}>
              {result.totalErrors}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: C.smoke }}>الأجيال</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.snow }}>
              {result.trainResults.length}
            </div>
          </div>
        </div>
      </div>
      
      {/* ═══ تطور Fitness عبر الأجيال ═══ */}
      <GenerationsChart C={C} trainResults={result.trainResults} />
      
      {/* ═══ Out-of-Sample Test ═══ */}
      <OutOfSampleSection C={C} testResults={result.testResults} />
      
      {/* ═══ التحذيرات ═══ */}
      {result.warnings.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 12,
          padding: '10px 14px',
          marginTop: 14,
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginBottom: 6 }}>
            ⚠ تحذيرات:
          </div>
          {result.warnings.map((w, i) => (
            <div key={i} style={{
              fontSize: 9,
              color: C.mist,
              marginBottom: 3,
              lineHeight: 1.5,
            }}>
              • {w}
            </div>
          ))}
        </div>
      )}
      
      {/* ═══ 🆕 الأخطاء (للتشخيص) ═══ */}
      {result.errors && result.errors.length > 0 && (
        <div style={{
          background: 'rgba(240,79,90,0.10)',
          border: '1px solid rgba(240,79,90,0.30)',
          borderRadius: 12,
          padding: '10px 14px',
          marginTop: 14,
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, color: '#f04f5a', fontWeight: 700, marginBottom: 6 }}>
            🐛 الأخطاء (للتشخيص):
          </div>
          {result.errors.slice(0, 5).map((e, i) => (
            <div key={i} style={{
              fontSize: 9,
              color: '#ffb0b6',
              marginBottom: 4,
              lineHeight: 1.5,
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.2)',
              padding: '4px 6px',
              borderRadius: 4,
              wordBreak: 'break-word',
            }}>
              {e}
            </div>
          ))}
          {result.errors.length > 5 && (
            <div style={{ fontSize: 9, color: '#90a4c8', marginTop: 4 }}>
              ... و {result.errors.length - 5} أخطاء أخرى
            </div>
          )}
        </div>
      )}
      
      {/* ═══ الأزرار ═══ */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {hasWinner && (
          <button
            onClick={() => onApply({
              winner: result.winner,
              winnerFitness: result.winnerFitness,
              testResults: result.testResults,
            })}
            style={{
              flex: 1,
              padding: '12px',
              background: `linear-gradient(135deg, ${C.mint}, ${C.electric})`,
              border: 'none',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              color: C.snow,
              fontFamily: 'Cairo, sans-serif',
              cursor: 'pointer',
            }}
          >
            ✓ تطبيق على التحليل الحي
          </button>
        )}
        <button
          onClick={onRestart}
          style={{
            flex: 1,
            padding: '12px',
            background: 'transparent',
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            color: C.smoke,
            fontFamily: 'Cairo, sans-serif',
            cursor: 'pointer',
          }}
        >
          🔄 محاولة أخرى
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  HELPER COMPONENTS
// ════════════════════════════════════════════════════════════

function WinnerCard({ C, winner, fitness }) {
  const tierInfo = getTierInfo(fitness.tier);
  
  return (
    <div style={{
      background: `linear-gradient(135deg, ${tierInfo.color}22, ${tierInfo.color}08)`,
      border: `2px solid ${tierInfo.color}55`,
      borderRadius: 16,
      padding: '16px',
      boxShadow: `0 8px 32px ${tierInfo.color}22`,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>{tierInfo.icon}</div>
        <div style={{
          fontSize: 16,
          fontWeight: 900,
          color: tierInfo.color,
          marginBottom: 2,
        }}>
          {tierInfo.arabicLabel}
        </div>
        <div style={{ fontSize: 9, color: C.smoke }}>
          {tierInfo.description}
        </div>
      </div>
      
      <div style={{
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 12,
        padding: '12px',
        marginBottom: 10,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 8, color: C.smoke }}>العائد السنوي</div>
            <div style={{
              fontSize: 16,
              fontWeight: 900,
              color: fitness.metrics.cagr >= 0 ? C.mint : C.coral,
            }}>
              {fitness.metrics.cagr >= 0 ? '+' : ''}{fitness.metrics.cagr.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.smoke }}>التفوّق على تاسي</div>
            <div style={{
              fontSize: 16,
              fontWeight: 900,
              color: fitness.metrics.alpha >= 0 ? C.mint : C.coral,
            }}>
              {fitness.metrics.alpha >= 0 ? '+' : ''}{fitness.metrics.alpha.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.smoke }}>Win Rate</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.snow }}>
              {fitness.metrics.winRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.smoke }}>Max DD</div>
            <div style={{
              fontSize: 14,
              fontWeight: 800,
              color: Math.abs(fitness.metrics.maxDD) < 15 ? C.mint : C.amber,
            }}>
              {fitness.metrics.maxDD.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.smoke }}>Sortino</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.snow }}>
              {fitness.metrics.sortino.toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.smoke }}>الصفقات</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.snow }}>
              {fitness.metrics.closedTrades}
            </div>
          </div>
        </div>
      </div>
      
      <div style={{
        background: `${tierInfo.color}15`,
        border: `1px solid ${tierInfo.color}33`,
        borderRadius: 10,
        padding: '8px 12px',
      }}>
        <div style={{ fontSize: 9, color: C.smoke, marginBottom: 3 }}>Fitness Score</div>
        <div style={{
          fontSize: 22,
          fontWeight: 900,
          color: tierInfo.color,
          textAlign: 'center',
        }}>
          {fitness.fitness.toFixed(3)}
        </div>
      </div>
    </div>
  );
}

function NoWinnerCard({ C, result }) {
  return (
    <div style={{
      background: 'rgba(240,79,90,0.10)',
      border: `1px solid ${C.coral}55`,
      borderRadius: 16,
      padding: '20px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
      <div style={{
        fontSize: 14,
        fontWeight: 800,
        color: C.coral,
        marginBottom: 6,
      }}>
        لا توجد استراتيجية فائزة
      </div>
      <div style={{
        fontSize: 10,
        color: C.mist,
        lineHeight: 1.5,
      }}>
        لم تنجح أيّ استراتيجية في اختبار Out-of-Sample.
        <br />
        جرّب: فترة أطول، فئة مختلفة، أو وضع Deep/Ultra.
      </div>
    </div>
  );
}

function GenerationsChart({ C, trainResults }) {
  if (!trainResults || trainResults.length === 0) return null;
  
  const maxFitness = Math.max(...trainResults.map(g => g.stats.maxFitness));
  const minFitness = Math.min(...trainResults.map(g => g.stats.minFitness));
  const range = maxFitness - minFitness || 1;
  
  return (
    <div style={{
      background: C.layer2,
      border: `1px solid ${C.line}`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.snow, marginBottom: 10 }}>
        📈 تطوّر Fitness عبر الأجيال
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {trainResults.map((gen, i) => {
          const heightPct = ((gen.stats.maxFitness - minFitness) / range) * 100;
          
          return (
            <div key={i} style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}>
              <div style={{ fontSize: 8, color: C.mint, fontWeight: 700 }}>
                {gen.stats.maxFitness.toFixed(2)}
              </div>
              <div style={{
                width: '100%',
                height: `${Math.max(10, heightPct)}%`,
                background: `linear-gradient(180deg, ${C.mint}, ${C.electric})`,
                borderRadius: '3px 3px 0 0',
                minHeight: 4,
              }} />
              <div style={{ fontSize: 8, color: C.smoke }}>
                G{i + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutOfSampleSection({ C, testResults }) {
  if (!testResults || testResults.length === 0) return null;
  
  return (
    <div style={{
      background: C.layer2,
      border: `1px solid ${C.line}`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 14,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.snow, marginBottom: 10 }}>
        🧪 اختبار Out-of-Sample (أفضل 3)
      </div>
      
      {testResults.map((t, i) => {
        const passIcon = t.passed ? '✓' : '✗';
        const passColor = t.passed ? C.mint : C.coral;
        const overfitColor = t.overfittingScore < 0.3 ? C.mint
          : t.overfittingScore < 0.6 ? C.amber : C.coral;
        
        return (
          <div key={i} style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 10,
            padding: '8px 12px',
            marginBottom: 6,
            border: `1px solid ${passColor}33`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, color: passColor, fontWeight: 900 }}>
                {passIcon}
              </span>
              <span style={{ fontSize: 10, color: C.snow, fontWeight: 700 }}>
                استراتيجية #{i + 1}
              </span>
              <span style={{
                marginRight: 'auto',
                fontSize: 8,
                color: overfitColor,
                background: `${overfitColor}15`,
                padding: '1px 6px',
                borderRadius: 4,
              }}>
                Overfit: {(t.overfittingScore * 100).toFixed(0)}%
              </span>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              fontSize: 9,
              color: C.mist,
            }}>
              <div>Train: {t.trainFitness.fitness.toFixed(3)}</div>
              <div>Test: {t.testFitness.fitness.toFixed(3)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════

/**
 * مكون Strategy Lab الرئيسيّ
 * 
 * Props:
 * - C: ألوان النظام
 * - runBacktest: async function(strategy, data) → metrics
 * - historicalData: البيانات الجاهزة
 * - dataInfo: { years, days }
 * - onApplyWinner: callback عند تطبيق الفائز
 */
export default function StrategyLabTab({ 
  C, 
  runBacktest, 
  historicalData, 
  dataInfo,
  onApplyWinner 
}) {
  const [phase, setPhase] = useState('setup');  // 'setup' | 'running' | 'results'
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const cancelRef = useRef(false);
  
  // ═══ بدء التشغيل ═══
  const handleStart = useCallback(async (targetType, mode) => {
    if (!runBacktest || !historicalData || historicalData.length < 100) {
      alert('البيانات غير جاهزة. شغّل باك-تيست واحد أولاً لتحميل البيانات.');
      return;
    }
    
    cancelRef.current = false;
    setPhase('running');
    setProgress({
      phase: 'preparing',
      currentGeneration: 0,
      totalGenerations: 0,
      currentStrategy: 0,
      strategiesInGeneration: 0,
      bestFitnessSoFar: 0,
      bestStrategyId: null,
      overallPct: 0,
      message: 'تجهيز...',
      completedBacktests: 0,
      totalBacktests: 0,
      errors: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
    });
      // ✨ بذرة ثابتة -- تجعل المختبر قابلاً للتكرار
    try { setLabSeed(987654321); } catch (e) {}
  
    const config = createLabConfig(mode, targetType);
    
    // 🆕 قراءة Anchor Weights من AI Learning
    let anchorWeights = null;
    try {
      anchorWeights = generateAnchorFromAILearning();
      if (anchorWeights) {
        const stats = getAILearningStats();
        console.log('[Lab] Using AI Learning anchor:', anchorWeights);
        console.log('[Lab] AI Learning stats:', stats);
      } else {
        console.log('[Lab] No anchor available (insufficient AI Learning data)');
      }
    } catch (e) {
      console.warn('[Lab] Anchor read failed:', e);
    }
    
    try {
      const labResult = await runStrategyLab(
        config,
        historicalData,
        runBacktest,
        (prog) => {
          if (cancelRef.current) return;
          setProgress(prog);
        },
        anchorWeights
      );
      
      if (!cancelRef.current) {
        setResult(labResult);
        setPhase('results');
      }
    } catch (err) {
      alert('خطأ في التشغيل: ' + (err.message || 'غير معروف'));
      setPhase('setup');
    }
  }, [runBacktest, historicalData]);
  
  // ═══ إلغاء ═══
  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setPhase('setup');
    setProgress(null);
  }, []);
  
  // ═══ تطبيق الفائز ═══
  const handleApplyWinner = useCallback((winnerPackage) => {
    if (onApplyWinner) {
      onApplyWinner(winnerPackage);
    }
    // alert يُعرض من BacktestScreen.handleApplyWinner مع تفاصيل أكثر
  }, [onApplyWinner]);
  
  // ═══ إعادة المحاولة ═══
  const handleRestart = useCallback(() => {
    setPhase('setup');
    setProgress(null);
    setResult(null);
  }, []);
  
  const isReady = !!(runBacktest && historicalData && historicalData.length >= 100);
  
  return (
    <div style={{ 
      direction: 'rtl',
      fontFamily: 'Cairo, sans-serif',
    }}>
      {phase === 'setup' && (
        <SetupPhase 
          C={C} 
          onStart={handleStart} 
          isReady={isReady}
          dataInfo={dataInfo}
        />
      )}
      
      {phase === 'running' && (
        <RunningPhase 
          C={C} 
          progress={progress}
          onCancel={handleCancel}
        />
      )}
      
      {phase === 'results' && (
        <ResultsPhase 
          C={C}
          result={result}
          onApply={handleApplyWinner}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
