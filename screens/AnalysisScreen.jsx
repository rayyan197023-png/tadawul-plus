'use client';
/**
 * ANALYSIS SCREEN — لوحة التحليل الاحترافي
 * Refactored from TadawulPlus_v5_engine3_final.jsx (5925 lines)
 * Uses: radarEngine + stockAnalysisEngine + stockStore
 */

import { useState, useMemo, memo } from 'react';
import { useStocks }         from '../store';
import { useNav }            from '../store';
import { calcRadarScore }    from '../engines/radarEngine';
import { generateOHLCBars }  from '../services/api/stocksApi';
import { colors }            from '../theme/tokens';

const C = colors;

const TABS = [
  { id: 'all',    label: 'الكل' },
  { id: 'buy',    label: 'شراء'  },
  { id: 'watch',  label: 'مراقبة'},
  { id: 'reduce', label: 'تخفيف' },
];

function ScoreRing({ score, size = 56 }) {
  const color = score >= 75 ? C.positive : score >= 55 ? C.amber : C.negative;
  const r = (size - 8) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.layer3} strokeWidth="5" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={color}
        fontSize="13" fontWeight="900" fontFamily="monospace">{score}</text>
    </svg>
  );
}

// memo: prevent re-rendering all 12 cards when only tab changes
const StockCard = memo(function StockCard({ item }) {
  const { openStock } = useNav();
  const { stk, radar } = item;
  const isUp = stk.pct >= 0;
  const score = radar.totalScore;
  const color = score >= 75 ? C.positive : score >= 55 ? C.amber : C.negative;

  return (
    <div
      onClick={() => openStock(stk, 'analysis')}
      style={{
        background: C.layer1, borderRadius: 14, padding: '12px 14px',
        border: `1px solid ${color}22`, marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      }}
    >
      <ScoreRing score={score} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: isUp ? C.positive : C.negative }}>
            {isUp ? '+' : ''}{stk.pct.toFixed(2)}%
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{stk.name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: C.textTertiary }}>{radar.ms?.trend ?? '—'}</span>
          <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>{score >= 68 ? 'شراء قوي' : score >= 48 ? 'مراقبة' : 'تجنب'}</span>
        </div>
        {/* Layer breakdown mini bars */}
        <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
          {(radar.layers ?? []).slice(0, 5).map((l, i) => (
            <div key={i} style={{ flex: 1, height: 3, background: l.score >= 12 ? color : C.layer3, borderRadius: 2 }} />
          ))}
        </div>
      </div>
      <div style={{ textAlign: 'left', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{stk.p.toFixed(2)}</div>
        <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 2 }}>{stk.sym}</div>
      </div>
    </div>
  );
}

export default function AnalysisScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const { stocks, isLoading } = useStocks();

  const scored = useMemo(() => {
    return stocks.map(stk => {
      const bars  = generateOHLCBars(stk, 40);
      const radar = calcRadarScore(stk, bars);
      return { stk, radar };
    }).sort((a, b) => b.radar.totalScore - a.radar.totalScore);
  }, [stocks]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'buy':    return scored.filter(d => d.radar.totalScore >= 68);
      case 'watch':  return scored.filter(d => d.radar.totalScore >= 48 && d.radar.totalScore < 68);
      case 'reduce': return scored.filter(d => d.radar.totalScore < 38);
      default:       return scored;
    }
  }, [scored, activeTab]);

  // Market summary stats
  const buyCount   = scored.filter(d => d.radar.totalScore >= 68).length;
  const watchCount = scored.filter(d => d.radar.totalScore >= 48 && d.radar.totalScore < 68).length;

  return (
    <div style={{ fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl', color: C.textPrimary }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', position: 'sticky', top: 0, background: C.bg, zIndex: 40, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 3, height: 18, background: C.gold, borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary }}>لوحة التحليل</span>
        </div>

        {/* Summary pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[
            { l: `${buyCount} شراء قوي`,  c: C.positive },
            { l: `${watchCount} مراقبة`,  c: C.amber },
            { l: `${scored.length - buyCount - watchCount} تجنب`, c: C.negative },
          ].map((p, i) => (
            <div key={i} style={{ background: p.c + '10', borderRadius: 8, padding: '3px 10px', border: `1px solid ${p.c}20` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: p.c }}>{p.l}</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, background: C.layer3, borderRadius: 10, padding: 3 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 600,
              background: activeTab === t.id ? C.gold : 'transparent',
              color:      activeTab === t.id ? '#000' : C.textSecondary,
              transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Stock list */}
      <div style={{ padding: '8px 12px' }}>
        {filtered.map(item => <StockCard key={item.stk.sym} item={item} />)}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.textTertiary }}>لا توجد نتائج</div>
        )}
      </div>
    </div>
  );
}
