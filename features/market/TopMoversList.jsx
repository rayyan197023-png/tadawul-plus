'use client';
/**
 * TopMoversList — Top Gainers / Losers / Volume
 * Extracted from الرئيسية.jsx
 */

import { useState, useMemo } from 'react';
import { useNav, useStocks } from '../../store';
import { colors }     from '../../theme/tokens';

const C = colors;
const TABS = ['الأكثر ارتفاعاً', 'الأكثر انخفاضاً', 'الأكثر نشاطاً'];

function fmtVol(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'K';
  return v.toString();
}

function StockRow({ s, rank, source }) {
  const { openStock } = useNav();
  const up = s.pct >= 0;

  return (
    <div
      onClick={() => openStock(s, source)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 0', borderBottom: `1px solid ${C.line}`,
        cursor: 'pointer',
        transition: 'background .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        {/* Symbol badge */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: C.layer2, border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: '#d1d5db', letterSpacing: '-.3px' }}>{s.sym}</span>
          <span style={{ fontSize: 8, color: C.textTertiary, marginTop: 1 }}>{rank}</span>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
          <div style={{ fontSize: 10, color: C.textTertiary }}>{s.sec} · {fmtVol(s.v)}</div>
        </div>
      </div>

      <div style={{ textAlign: 'left', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{s.p.toFixed(2)}</div>
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: up ? C.positive : C.negative,
          background: up ? 'rgba(30,230,138,.1)' : 'rgba(255,95,106,.1)',
          padding: '2px 8px', borderRadius: 6, marginTop: 2,
          display: 'inline-block',
          border: `1px solid ${up ? 'rgba(30,230,138,.2)' : 'rgba(255,95,106,.2)'}`,
        }}>
          {up ? '+' : ''}{s.pct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export default function TopMoversList() {
  const [tab, setTab] = useState(0);
  const { stocks }    = useStocks();

  const lists = useMemo(() => [
    [...stocks].sort((a, b) => b.pct - a.pct).slice(0, 6),
    [...stocks].sort((a, b) => a.pct - b.pct).slice(0, 6),
    [...stocks].sort((a, b) => b.v   - a.v  ).slice(0, 6),
  ], [stocks]);

  return (
    <div style={{ margin: '12px 0 0' }}>
      {/* Header */}
      <div style={{ padding: '0 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
        <div style={{ width: 3, height: 20, background: C.gold, borderRadius: 2 }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary }}>أبرز التحركات</span>
      </div>

      {/* Sub-tabs */}
      <div style={{ padding: '0 12px', marginBottom: 2 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.line}` }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              flex: 1, padding: '8px 2px', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 600,
              color: tab === i ? C.textPrimary : C.textTertiary,
              borderBottom: tab === i ? `2px solid ${C.gold}` : '2px solid transparent',
              marginBottom: -1, transition: 'all .15s',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding: '0 12px' }}>
        {lists[tab].map((s, i) => (
          <StockRow key={s.sym} s={s} rank={i + 1} source="home" />
        ))}
      </div>
    </div>
  );
}
