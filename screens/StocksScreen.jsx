'use client';
/**
 * STOCKS SCREEN — Production
 * Refactored from TadawulStocks_final.jsx
 * Search + Sort + Filter by sector. All data from stockStore.
 */

import { useState, useMemo, useCallback, memo } from 'react';
import { useStocks } from '../store';
import { useNav }     from '../store';
import { SECTORS }    from '../constants/stocksData';
import { colors }     from '../theme/tokens';

const C = colors;

const SECTOR_COLORS = {
  energy: C.amber, banks: C.electric, petro: C.plasma,
  food: C.mint, telecom: C.teal, mining: C.gold,
  insurance: C.coral, realestate: '#60a5fa', construction: '#a3a3a3',
};

function fmtVol(v) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'K';
  return String(v);
}

function MiniSparkline({ stk, color }) {
  // Simple 10-point sparkline from price + pct
  const pts = [];
  let p = stk.p * (1 - stk.pct / 100);
  for (let i = 0; i < 10; i++) {
    p = p * (1 + (stk.pct / 100 / 10) + (Math.sin(i * 2.3 + stk.sym.charCodeAt(0)) * 0.005));
    pts.push(p);
  }
  pts[pts.length - 1] = stk.p;
  const W = 60, H = 24;
  const mn = Math.min(...pts), mx = Math.max(...pts), rng = mx - mn || 1;
  const toX = (i) => (i / (pts.length - 1)) * W;
  const toY = (v) => H - ((v - mn) / rng) * (H - 4) - 2;
  const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={toX(pts.length - 1)} cy={toY(pts[pts.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}

const StockCard = memo(function StockCard({ s }) {
  const { openStock }  = useNav();
  const { toggleWatchlist, isInWatchlist } = useStocks();
  const up             = s.pct >= 0;
  const secColor       = SECTOR_COLORS[s.sectorId] ?? C.ash;
  const watched        = isInWatchlist(s.sym);

  // Skeleton cards while stocks load (isLoading from store)
  const { isLoading } = useStocks ? useStocks() : {};

  return (
    <div
      onClick={() => openStock(s, 'stocks')}
      style={{
        background: C.layer1, borderRadius: 14, padding: '12px 14px',
        border: `1px solid ${C.border}`, marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', transition: 'border-color .15s',
      }}
    >
      {/* Symbol */}
      <div style={{ width: 44, height: 44, borderRadius: 10, background: C.layer3, border: `1px solid ${secColor}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: secColor, letterSpacing: '-.5px' }}>{s.sym}</span>
        <span style={{ fontSize: 7, color: C.textTertiary, marginTop: 1 }}>{s.sec}</span>
      </div>

      {/* Name + volume */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
        <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 1 }}>حجم: {fmtVol(s.v)}</div>
      </div>

      {/* Sparkline */}
      <MiniSparkline stk={s} color={up ? C.positive : C.negative} />

      {/* Price + pct */}
      <div style={{ textAlign: 'left', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{s.p.toFixed(2)}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: up ? C.positive : C.negative, background: up ? 'rgba(30,230,138,.1)' : 'rgba(255,95,106,.1)', padding: '2px 8px', borderRadius: 6, marginTop: 2, border: `1px solid ${up ? 'rgba(30,230,138,.2)' : 'rgba(255,95,106,.2)'}` }}>
          {up ? '+' : ''}{s.pct.toFixed(2)}%
        </div>
      </div>

      {/* Watchlist star */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleWatchlist(s.sym); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={watched ? C.gold : 'none'} stroke={watched ? C.gold : C.textTertiary} strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      </button>
    </div>
  );
}); // end StockCard memo

export default function StocksScreen() {
  const { filteredStocks, sort, filter, setSort, setFilter, stocks } = useStocks();
  const [search,      setSearch]      = useState('');
  const [showSearch,  setShowSearch]  = useState(false);

  const displayed = useMemo(() => {
    if (!search.trim()) return filteredStocks;
    const q = search.trim();
    return filteredStocks.filter(s => s.name.includes(q) || s.sym.includes(q));
  }, [filteredStocks, search]);

  const upCount   = stocks.filter(s => s.pct > 0).length;
  const downCount = stocks.filter(s => s.pct < 0).length;

  const SORT_OPTS = [
    { k: 'volume', l: 'الحجم' },
    { k: 'gainers', l: 'الصاعدة' },
    { k: 'losers',  l: 'الهابطة' },
    { k: 'price',   l: 'السعر' },
  ];

  return (
    <div style={{ fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl', color: C.textPrimary, fontSize: 14 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', position: 'sticky', top: 0, background: C.bg, zIndex: 40, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Search toggle */}
            <button onClick={() => setShowSearch(s => !s)} style={{ width: 36, height: 36, borderRadius: 10, background: showSearch ? C.layer3 : C.layer2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textSecondary} strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 3, height: 18, background: C.gold, borderRadius: 2 }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary }}>الأسهم</span>
          </div>
        </div>

        {/* Breadth pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[{ l: `↑ ${upCount} صاعد`, c: C.positive, bg: 'rgba(30,230,138,.1)' }, { l: `↓ ${downCount} هابط`, c: C.negative, bg: 'rgba(255,95,106,.1)' }, { l: `${stocks.length - upCount - downCount} ثابت`, c: C.textSecondary, bg: C.layer2 }].map((p, i) => (
            <div key={i} style={{ background: p.bg, borderRadius: 8, padding: '3px 10px', border: `1px solid ${p.c}20` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: p.c }}>{p.l}</span>
            </div>
          ))}
        </div>

        {/* Search input */}
        {showSearch && (
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم السهم أو الرمز..."
            style={{ width: '100%', background: C.layer2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', color: C.textPrimary, fontFamily: 'Cairo,sans-serif', fontSize: 13, outline: 'none', marginBottom: 8 }}
          />
        )}

        {/* Sort tabs */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {SORT_OPTS.map(o => (
            <button key={o.k} onClick={() => setSort(o.k)} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 600,
              background: sort === o.k ? C.gold : C.layer2,
              color:      sort === o.k ? '#000' : C.textSecondary,
              transition: 'all .15s',
            }}>{o.l}</button>
          ))}
        </div>
      </div>

      {/* Sector filter */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: 6, padding: '8px 12px', borderBottom: `1px solid ${C.border}` }}>
        <button onClick={() => setFilter('all')} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 600, background: filter === 'all' ? C.electric : C.layer2, color: filter === 'all' ? '#000' : C.textSecondary }}>
          الكل ({stocks.length})
        </button>
        {SECTORS.map(sec => (
          <button key={sec.id} onClick={() => setFilter(sec.id)} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 600, background: filter === sec.id ? (SECTOR_COLORS[sec.id] ?? C.gold) : C.layer2, color: filter === sec.id ? '#000' : C.textSecondary }}>
            {sec.name}
          </button>
        ))}
      </div>

      {/* Stock list */}
      <div style={{ padding: '8px 12px' }}>
        {displayed.map(s => <StockCard key={s.sym} s={s} />)}
        {displayed.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.textTertiary, fontSize: 13 }}>
            لا توجد نتائج
          </div>
        )}
      </div>
    </div>
  );
}
