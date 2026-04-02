'use client';
/**
 * StockHeader — Price header for StockDetail
 * Shows: name, symbol, price, change, quick stats bar
 */

import { useState, useRef } from 'react';
import { useStocks }        from '../../store';
import { colors }           from '../../theme/tokens';

const C = colors;

export default function StockHeader({ stk, onClose }) {
  const { toggleWatchlist, isInWatchlist } = useStocks();
  const [alertOpen,  setAlertOpen]  = useState(false);
  const [alertPrice, setAlertPrice] = useState(() => stk ? +(stk.p * 1.05).toFixed(2) : 0);
  const [alertType,  setAlertType]  = useState('فوق');
  const [alertSet,   setAlertSet]   = useState(false);
  const btnRef = useRef(null);

  const watched  = isInWatchlist(stk?.sym);
  const isUp     = (stk?.pct ?? 0) >= 0;
  const triggered= alertSet && (alertType === 'فوق' ? stk.p >= alertPrice : stk.p <= alertPrice);

  if (!stk) return null;

  return (
    <div style={{ padding: '4px 16px 8px', flexShrink: 0, background: C.layer2, borderBottom: `1px solid ${C.border}` }}>

      {/* Name row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, flexShrink: 0,
            background: `linear-gradient(135deg,${C.layer3},${C.layer2})`,
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 900, color: C.textPrimary }}>{stk.sym}</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.textPrimary, lineHeight: 1.3 }}>{stk.name}</div>
            <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
              {stk.sym} · <span style={{ color: C.electric }}>{stk.sec}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Watchlist */}
          <button
            onClick={() => toggleWatchlist(stk.sym)}
            style={{
              width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
              background: watched ? C.gold + '20' : C.layer3,
              border: `1px solid ${watched ? C.gold + '55' : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: watched ? C.gold : C.textSecondary,
            }}
          >
            {watched ? '★' : '☆'}
          </button>

          {/* Alert */}
          <button
            ref={btnRef}
            onClick={() => setAlertOpen(v => !v)}
            style={{
              width: 40, height: 40, borderRadius: 10, cursor: 'pointer',
              background: triggered ? C.gold + '33' : alertSet ? C.gold + '15' : C.layer3,
              border: `1px solid ${triggered ? C.gold : alertSet ? C.gold + '55' : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={alertSet ? C.gold : C.textSecondary} strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              {alertSet && <circle cx="18" cy="8" r="3" fill={triggered ? C.coral : C.gold} stroke="none" />}
            </svg>
          </button>

          {/* Alert popup */}
          {alertOpen && (
            <>
              <div onClick={() => setAlertOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
              <div style={{
                position: 'fixed', top: (btnRef.current?.getBoundingClientRect().bottom ?? 60) + 6,
                left: 20, right: 20, maxWidth: 260, margin: '0 auto',
                background: C.layer1, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: 14, zIndex: 999,
                boxShadow: '0 8px 28px rgba(0,0,0,.8)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.gold, marginBottom: 10 }}>
                  تنبيه سعري — {stk.sym}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {['فوق', 'تحت'].map(t => (
                    <button key={t} onClick={() => setAlertType(t)} style={{
                      flex: 1, padding: '6px', borderRadius: 7, cursor: 'pointer',
                      border: `1px solid ${alertType === t ? C.gold + '66' : C.border}`,
                      background: alertType === t ? C.gold + '18' : 'transparent',
                      color: alertType === t ? C.gold : C.textSecondary,
                      fontSize: 11, fontWeight: 700, fontFamily: 'Cairo,sans-serif',
                    }}>{t}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    type="number" value={alertPrice} step="0.1"
                    onChange={e => setAlertPrice(parseFloat(e.target.value))}
                    style={{ flex: 1, background: C.layer3, border: `1px solid ${C.border}`, borderRadius: 7, padding: '7px 10px', color: C.textPrimary, fontSize: 12, fontFamily: 'monospace', textAlign: 'center' }}
                  />
                  <span style={{ fontSize: 11, color: C.textSecondary, flexShrink: 0 }}>ر.س</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setAlertSet(true); setAlertOpen(false); }} style={{ flex: 1, padding: '8px', borderRadius: 8, background: C.gold + '22', border: `1px solid ${C.gold}44`, color: C.gold, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif' }}>
                    تفعيل
                  </button>
                  {alertSet && (
                    <button onClick={() => { setAlertSet(false); setAlertOpen(false); }} style={{ padding: '8px 10px', borderRadius: 8, background: C.layer3, border: `1px solid ${C.border}`, color: C.textSecondary, fontSize: 11, cursor: 'pointer', fontFamily: 'Cairo,sans-serif' }}>
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{ width: 40, height: 40, borderRadius: 10, background: C.layer3, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSecondary, fontSize: 20, cursor: 'pointer' }}
          >×</button>
        </div>
      </div>

      {/* Price row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 10 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 900, color: C.textPrimary, letterSpacing: '-2px', lineHeight: 1 }}>
          {stk.p.toFixed(2)}
        </span>
        <div style={{ paddingBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: isUp ? C.positive : C.negative, marginBottom: 2 }}>
            {isUp ? '+' : ''}{(stk.ch ?? 0).toFixed(2)} ({isUp ? '+' : ''}{stk.pct.toFixed(2)}%)
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary }}>
            الإغلاق السابق: {stk.prev ?? (stk.p - (stk.ch ?? 0)).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={{
        display: 'flex', gap: 0, background: C.layer3, borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${C.border}`,
      }}>
        {[
          { l: 'الفتح',       v: stk.o    ?? (+(stk.p - stk.ch).toFixed(2)) }, // open = prev close if not provided
          { l: 'أعلى يومي',   v: stk.hi   ?? stk.p },
          { l: 'أدنى يومي',   v: stk.lo   ?? stk.p },
          { l: 'الحجم',       v: stk.v ? (stk.v / 1e6).toFixed(1) + 'م' : '—' },
        ].map((item, i) => (
          <div key={i} style={{ padding: '7px 8px', borderLeft: i ? `1px solid ${C.border}44` : 0, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: C.textSecondary, marginBottom: 3 }}>{item.l}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, color: C.textPrimary }}>
              {typeof item.v === 'number' ? item.v.toFixed(2) : item.v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
