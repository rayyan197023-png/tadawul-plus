'use client';
/**
 * @module BacktestResultsCard
 * @description بطاقة عرض نتائج Backtest الكاملة
 * 
 * ✨ V2.0 - Performance Optimized:
 * - useMemo for color calculations
 * - React.memo on sub-components
 * - Custom comparison
 * - Modern JS
 * 
 * @author تداول+
 * @version 2.0
 */

import React, { useMemo } from 'react';
import Tooltip from '../Tooltip';

const C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  mint: "#1ee68a", coral: "#ff5f6a", amber: "#fbbf24", teal: "#22d3ee",
  plasma: "#a78bfa",
};

// Tooltip key mapping (cached outside component)
const TOOLTIP_MAP = {
  "معدل الربح": "Win Rate",
  "Profit Factor": "Profit Factor",
  "Sharpe Ratio": "Sharpe Ratio",
  "Sortino Ratio": "Sortino Ratio",
  "Calmar Ratio": "Calmar Ratio",
  "Max Drawdown": "Maximum Drawdown",
  "VaR 95%": "VaR",
  "CVaR 95%": "CVaR",
  "VaR": "VaR",
  "CVaR": "CVaR",
  "صفقات رابحة": "Win Rate",
  "صفقات خاسرة": "Win Rate",
  "متوسط الربح": "Profit Factor",
  "متوسط الخسارة": "Profit Factor",
};

/**
 * مكوّن قيمة مقياس واحد - memoized
 */
const MetricItem = React.memo(function MetricItem(props) {
  const tooltipKey = TOOLTIP_MAP[props.label] || props.label;
  
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 8px",
      background: props.highlight ? (props.color || C.gold) + "12" : "transparent",
      borderRadius: 6,
      borderLeft: props.highlight ? "2px solid " + (props.color || C.gold) : "none",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ 
          fontSize: 10, 
          color: C.smoke, 
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}>
          {props.label}
          <Tooltip termKey={tooltipKey} size="small" />
        </span>
        {props.sublabel && (
          <span style={{ fontSize: 8, color: C.ash }}>
            {props.sublabel}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 900,
        color: props.color || C.snow,
        fontFamily: "IBM Plex Mono,monospace",
      }}>
        {props.value}
      </div>
    </div>
  );
});

MetricItem.displayName = 'MetricItem';

/**
 * قسم كامل (Title + Metrics) - memoized
 */
const Section = React.memo(function Section(props) {
  return (
    <div style={{
      marginBottom: 12,
      padding: "10px 12px",
      background: C.void + "88",
      borderRadius: 10,
      border: "1px solid " + (props.color || C.line) + "22",
    }}>
      <div style={{
        fontSize: 10,
        color: props.color || C.gold,
        fontWeight: 800,
        letterSpacing: "1px",
        marginBottom: 8,
        paddingBottom: 6,
        borderBottom: "1px solid " + (props.color || C.line) + "22",
      }}>
        {props.icon} {props.title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {props.children}
      </div>
    </div>
  );
});

Section.displayName = 'Section';

/**
 * Format money utility
 */
function formatMoney(value) {
  // ✨ حماية من null/undefined -- كانت تنهار على value.toFixed()
  if (value == null || !isFinite(value)) return '-';
  if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M ر.س';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K ر.س';
  return value.toFixed(0) + ' ر.س';
}
/**
 * Main BacktestResultsCard component
 */
const BacktestResultsCard = React.memo(function BacktestResultsCard(props) {
  const result = props.result;
  const benchmarkResult = props.benchmarkResult;
  const comparison = props.comparison;

  // ═══════════════════════════════════════════════
  // ✨ Color calculations - memoized
  // ═══════════════════════════════════════════════
  
  const colors = useMemo(() => {
    if (!result || !result.success) return null;
    const perf = result.performance;
    
    return {
      annualReturn: perf.annualReturn >= 15 ? C.mint 
                  : perf.annualReturn >= 5 ? C.amber 
                  : C.coral,
      sharpe: perf.sharpe >= 1.5 ? C.mint
            : perf.sharpe >= 1.0 ? C.teal
            : perf.sharpe >= 0.5 ? C.amber
            : C.coral,
      dd: perf.maxDrawdown >= -10 ? C.mint
        : perf.maxDrawdown >= -20 ? C.amber
        : C.coral,
      winRate: perf.winRate >= 60 ? C.mint
             : perf.winRate >= 50 ? C.amber
             : C.coral,
      summary: result.summary.color === 'coral' ? C.coral
             : result.summary.color === 'amber' ? C.amber
             : C.mint,
      sortino: perf.sortino >= 1.5 ? C.mint 
             : perf.sortino >= 1 ? C.amber 
             : C.coral,
      calmar: perf.calmar >= 2 ? C.mint 
            : perf.calmar >= 1 ? C.amber 
            : C.coral,
      profitFactor: perf.profitFactor >= 2 ? C.mint 
                  : perf.profitFactor >= 1.5 ? C.amber 
                  : C.coral,
      volatility: perf.volatility < 15 ? C.mint 
                : perf.volatility < 25 ? C.amber 
                : C.coral,
      positiveDays: perf.positiveDaysPct >= 55 ? C.mint 
                  : perf.positiveDaysPct >= 50 ? C.amber 
                  : C.coral,
    };
  }, [result]);

  // Empty state
  if (!result || !result.success) {
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
        {result && result.error ? result.error : '📊 لا توجد نتائج Backtest'}
      </div>
    );
  }

  const perf = result.performance;
  const summary = result.summary;

  return (
    <div style={{
      background: "linear-gradient(145deg," + C.layer1 + "," + C.layer2 + ")",
      borderRadius: 14,
      border: "1px solid " + colors.summary + "33",
      padding: "14px 12px",
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid " + C.line + "44",
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 6,
        }}>
          <div>
            <div style={{
              fontSize: 11,
              color: C.gold,
              fontWeight: 800,
              letterSpacing: "1px",
              marginBottom: 3,
            }}>
              🧪 نتائج Backtest
            </div>
            <div style={{
              fontSize: 14,
              color: C.snow,
              fontWeight: 900,
            }}>
              {perf.years} سنة · {perf.totalDays} يوم
            </div>
          </div>
          
          <div style={{
            padding: "4px 10px",
            background: colors.summary + "22",
            border: "1px solid " + colors.summary + "55",
            borderRadius: 20,
            fontSize: 10,
            color: colors.summary,
            fontWeight: 900,
          }}>
            {summary.label}
          </div>
        </div>
        
        {/* Summary Bar */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontFamily: "IBM Plex Mono,monospace",
              fontSize: 20,
              fontWeight: 900,
              color: colors.annualReturn,
              lineHeight: 1,
            }}>
              {perf.annualReturn >= 0 ? '+' : ''}{perf.annualReturn}%
            </div>
            <div style={{ fontSize: 9, color: C.smoke, marginTop: 3 }}>
              عائد سنوي
            </div>
          </div>
          
          <div style={{ width: 1, background: C.line + "44" }} />
          
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontFamily: "IBM Plex Mono,monospace",
              fontSize: 20,
              fontWeight: 900,
              color: colors.sharpe,
              lineHeight: 1,
            }}>
              {perf.sharpe}
            </div>
            <div style={{ fontSize: 9, color: C.smoke, marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
              Sharpe
              <Tooltip termKey="Sharpe Ratio" size="small"/>
            </div>
          </div>
          
          <div style={{ width: 1, background: C.line + "44" }} />
          
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              fontFamily: "IBM Plex Mono,monospace",
              fontSize: 20,
              fontWeight: 900,
              color: colors.dd,
              lineHeight: 1,
            }}>
              {perf.maxDrawdown}%
            </div>
            <div style={{ fontSize: 9, color: C.smoke, marginTop: 3 }}>
              أسوأ تراجع
            </div>
          </div>
        </div>
      </div>

      {/* ⭐ المقاييس الرئيسية */}
      <Section icon="⭐" title="المقاييس الرئيسية" color={C.gold}>
        <MetricItem 
          label="العائد الإجمالي"
          sublabel="من بداية Backtest"
          value={(perf.totalReturn >= 0 ? '+' : '') + perf.totalReturn + '%'}
          color={perf.totalReturn >= 0 ? C.mint : C.coral}
          highlight={true}
        />
        <MetricItem 
          label="العائد السنوي"
          sublabel="CAGR"
          value={(perf.annualReturn >= 0 ? '+' : '') + perf.annualReturn + '%'}
          color={colors.annualReturn}
        />
        <MetricItem 
          label="القيمة النهائية"
          value={formatMoney(perf.finalValue)}
          color={perf.finalValue >= 100000 ? C.mint : C.coral}
        />
        <MetricItem 
          label="التذبذب السنوي"
          sublabel="σ"
          value={perf.volatility + '%'}
          color={colors.volatility}
        />
      </Section>

      {/* 📊 إحصاءات الصفقات */}
      <Section icon="📊" title="إحصاءات الصفقات" color={C.teal}>
        <MetricItem label="أوامر التنفيذ" sublabel="شراء + بيع" value={perf.totalTrades} color={C.smoke} />
        <MetricItem label="صفقات مُغلقة" sublabel="أساس كل النسب أدناه" value={perf.closedTrades} color={C.snow} highlight={true} />
        <MetricItem label="معدل الربح" sublabel={'Win Rate -- ' + perf.winningTrades + ' من ' + perf.closedTrades} value={perf.winRate + '%'} color={colors.winRate} highlight={true} />
        <MetricItem label="صفقات رابحة" value={perf.winningTrades} color={C.mint} />
        <MetricItem label="صفقات خاسرة" value={perf.losingTrades} color={C.coral} />
        {perf.closedTrades > 0 && (perf.winningTrades + perf.losingTrades) !== perf.closedTrades && (
          <MetricItem label="صفقات بتعادل" value={perf.closedTrades - perf.winningTrades - perf.losingTrades} color={C.smoke} />
        )}
        <MetricItem label="متوسط الربح" value={'+' + perf.avgWin} color={C.mint} />
        <MetricItem label="متوسط الخسارة" value={'-' + perf.avgLoss} color={C.coral} />
        <MetricItem 
          label="Profit Factor"
          sublabel="إجمالي الأرباح / إجمالي الخسائر"
          value={perf.profitFactor}
          color={colors.profitFactor}
          highlight={true}
        />
      </Section>
      {/* 🚪 تشخيص أسباب الخروج */}
      {result.trades && result.trades.length > 0 && (function(){
        var sells = result.trades.filter(function(t){ return t.action === 'sell'; });
        if (sells.length === 0) return null;

        var buckets = {};
        sells.forEach(function(t){
          var r = t.reason || 'غير محدد';
          var key = r.indexOf('Stop Loss') >= 0 ? '🛑 وقف خسارة'
                  : r.indexOf('Take Profit') >= 0 ? '🎯 جني أرباح'
                  : r.indexOf('Weak Score') >= 0 ? '📉 ضعف الدرجة'
                  : r.indexOf('Max Hold') >= 0 ? '⏰ أقصى مدة'
                  : '❓ ' + r.split('(')[0].trim();
          if (!buckets[key]) buckets[key] = { count: 0, pnl: 0, wins: 0 };
          buckets[key].count++;
          buckets[key].pnl += (t.pnl || 0);
          if ((t.pnl || 0) > 0) buckets[key].wins++;
        });

        var rows = Object.keys(buckets).map(function(k){
          return { key: k, ...buckets[k] };
        }).sort(function(a,b){ return b.count - a.count; });

        return (
          <Section icon="🚪" title="أسباب الخروج (تشخيص)" color={C.plasma}>
            {rows.map(function(r, i){
              var pct = Math.round(r.count / sells.length * 100);
              var wr = Math.round(r.wins / r.count * 100);
              return (
                <MetricItem
                  key={i}
                  label={r.key}
                  sublabel={pct + '% من الخروجات · نجاح ' + wr + '%'}
                  value={r.count + ' | ' + (r.pnl >= 0 ? '+' : '') + Math.round(r.pnl)}
                  color={r.pnl >= 0 ? C.mint : C.coral}
                />
              );
            })}
          </Section>
        );
      })()}

      {/* ⚡ مقاييس المخاطر */}
      <Section icon="⚡" title="مقاييس المخاطر" color={C.coral}>
        <MetricItem label="Sharpe Ratio" sublabel="عائد مُعدّل بالمخاطرة" value={perf.sharpe} color={colors.sharpe} />
        <MetricItem label="Sortino Ratio" sublabel="مُعدّل بالمخاطر السلبية فقط" value={perf.sortino} color={colors.sortino} />
        <MetricItem label="Calmar Ratio" sublabel="العائد / أسوأ تراجع" value={perf.calmar} color={colors.calmar} />
        <MetricItem 
          label="Max Drawdown"
          sublabel={perf.maxDrawdownDate || ''}
          value={perf.maxDrawdown + '%'}
          color={colors.dd}
          highlight={true}
        />
        <MetricItem label="VaR 95%" sublabel="خسارة محتملة يومياً" value={'-' + perf.var95 + '%'} color={C.amber} />
        <MetricItem label="CVaR 95%" sublabel="متوسط أسوأ 5%" value={'-' + perf.cvar95 + '%'} color={C.coral} />
      </Section>

      {/* 📅 إحصاءات الأيام */}
      <Section icon="📅" title="إحصاءات الأيام" color={C.plasma}>
        <MetricItem label="أيام رابحة" value={perf.positiveDays + ' / ' + perf.totalDays} color={C.mint} />
        <MetricItem 
          label="معدل الأيام الإيجابية"
          value={perf.positiveDaysPct + '%'}
          color={colors.positiveDays}
          highlight={true}
        />
        <MetricItem label="أفضل يوم" value={'+' + perf.bestDay + '%'} color={C.mint} />
        <MetricItem label="أسوأ يوم" value={perf.worstDay + '%'} color={C.coral} />
      </Section>

      {/* ⚔️ مقارنة مع Benchmark */}
      {comparison && (
        <Section icon="⚔️" title="مقارنة مع تاسي" color={C.gold}>
          <MetricItem 
            label="Alpha"
            sublabel="الفرق السنوي عن تاسي"
            value={(comparison.alpha >= 0 ? '+' : '') + comparison.alpha + '%'}
            color={comparison.alpha >= 0 ? C.mint : C.coral}
            highlight={true}
          />
          <MetricItem 
            label="فرق Sharpe"
            value={(comparison.sharpeDiff >= 0 ? '+' : '') + comparison.sharpeDiff}
            color={comparison.sharpeDiff >= 0 ? C.mint : C.coral}
          />
          <MetricItem 
            label="فرق Max DD"
            value={(comparison.maxDDDiff >= 0 ? '+' : '') + comparison.maxDDDiff + '%'}
            color={comparison.maxDDDiff >= 0 ? C.mint : C.coral}
          />
          <MetricItem 
            label="فرق التذبذب"
            value={(comparison.volDiff >= 0 ? '+' : '') + comparison.volDiff + '%'}
            color={C.smoke}
          />
          
          <div style={{
            marginTop: 8,
            padding: "8px 10px",
            background: (comparison.outperformance ? C.mint : C.coral) + "15",
            border: "1px solid " + (comparison.outperformance ? C.mint : C.coral) + "33",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 800,
              color: comparison.outperformance ? C.mint : C.coral,
            }}>
              {comparison.outperformance 
                ? '🏆 استراتيجيتك تتفوّق على تاسي'
                : '📊 تاسي يتفوّق على استراتيجيتك'}
            </div>
          </div>
        </Section>
      )}

      {/* 🏆 نقاط القوة والضعف */}
      {summary.keyPoints && summary.keyPoints.length > 0 && (
        <div style={{
          padding: "10px 12px",
          background: colors.summary + "10",
          border: "1px solid " + colors.summary + "33",
          borderRadius: 10,
        }}>
          <div style={{
            fontSize: 10,
            color: colors.summary,
            fontWeight: 800,
            letterSpacing: "1px",
            marginBottom: 8,
          }}>
            🎯 التحليل السريع
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {summary.keyPoints.map((point, i) => (
              <div key={'kp-' + i} style={{
                fontSize: 11,
                color: C.mist,
                padding: "4px 0",
              }}>
                {point}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  // Custom comparison
  if (prev.result !== next.result) return false;
  if (prev.benchmarkResult !== next.benchmarkResult) return false;
  if (prev.comparison !== next.comparison) return false;
  return true;
});

BacktestResultsCard.displayName = 'BacktestResultsCard';

export default BacktestResultsCard;
