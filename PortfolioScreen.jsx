'use client';
/**
 * PORTFOLIO SCREEN — المحفظة
 * Refactored from PortfolioPage.jsx
 * Portfolio data persisted in localStorage via stockStore watchlist pattern
 * Live prices from stockStore
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStockState as useStocks }  from '../store';
import { useNav }     from '../store';
import { colors }     from '../theme/tokens';

const C = colors;

const LS_PORT    = 'tp_port_v2';
const LS_CAPITAL = 'tp_capital_v2';

function loadLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function fmtNum(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ── Donut chart
function DonutChart({ positions, totalValue }) {
  if (!positions?.length) return null;
  const size = 120, cx = 60, cy = 60, r = 48, stroke = 14;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const COLORS = [C.gold, C.electric, C.mint, C.plasma, C.amber, C.teal, C.coral];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {positions.map((pos, i) => {
        const pct  = pos.curValue / (totalValue || 1);
        const dash = pct * circ;
        const seg  = (
          <circle key={pos.sym} cx={cx} cy={cy} r={r}
            fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset + circ / 4}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return seg;
      })}
      <circle cx={cx} cy={cy} r={r - stroke / 2 - 2} fill={C.layer1} />
    </svg>
  );
}

// ── Add position modal
function AddModal({ stocks, onAdd, onClose }) {
  const [sym,  setSym]  = useState('');
  const [qty,  setQty]  = useState('');
  const [cost, setCost] = useState('');
  const [srch, setSrch] = useState('');

  const filtered = srch.trim() ? stocks.filter(s => s.name.includes(srch) || s.sym.includes(srch)) : stocks;
  const selStock = stocks.find(s => s.sym === sym);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200 }} />
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.layer1, borderRadius: '20px 20px 0 0', padding: 20, zIndex: 201, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary, marginBottom: 14, textAlign: 'right' }}>إضافة سهم للمحفظة</div>

        {/* Stock search */}
        <input value={srch} onChange={e => setSrch(e.target.value)} placeholder="ابحث عن سهم..." autoFocus
          style={{ background: C.layer2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', color: C.textPrimary, fontFamily: 'Cairo,sans-serif', fontSize: 13, outline: 'none', marginBottom: 8 }} />

        {!sym && (
          <div style={{ overflowY: 'auto', maxHeight: 200, marginBottom: 12 }}>
            {filtered.slice(0, 8).map(s => (
              <div key={s.sym} onClick={() => { setSym(s.sym); setCost(s.p.toFixed(2)); setSrch(''); }}
                style={{ padding: '8px 4px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: s.pct >= 0 ? C.positive : C.negative }}>{s.p.toFixed(2)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{s.name}</span>
              </div>
            ))}
          </div>
        )}

        {sym && selStock && (
          <div style={{ background: C.layer2, borderRadius: 10, padding: '10px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: C.textSecondary }}>{selStock.p.toFixed(2)} ر.س</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary }}>{selStock.name} ({sym})</span>
          </div>
        )}

        {sym && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'عدد الأسهم', val: qty, set: setQty, placeholder: '100' },
                { label: 'متوسط التكلفة', val: cost, set: setCost, placeholder: selStock?.p.toFixed(2) },
              ].map((f, i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, color: C.textTertiary, marginBottom: 4, textAlign: 'right' }}>{f.label}</div>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    style={{ width: '100%', background: C.layer3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', color: C.textPrimary, fontFamily: 'monospace', fontSize: 13, textAlign: 'center', outline: 'none' }} />
                </div>
              ))}
            </div>
            {qty && cost && (
              <div style={{ background: C.layer3, borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: C.textSecondary }}>القيمة الإجمالية: </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>{fmtNum(parseFloat(qty) * parseFloat(cost))} ر.س</span>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, background: C.layer3, border: `1px solid ${C.border}`, color: C.textSecondary, fontFamily: 'Cairo,sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
          <button
            onClick={() => { if (sym && qty && cost) { onAdd({ sym, qty: parseFloat(qty), avgCost: parseFloat(cost) }); onClose(); } }}
            disabled={!sym || !qty || !cost}
            style={{ flex: 2, padding: '12px', borderRadius: 10, background: sym && qty && cost ? C.positive : C.layer3, border: 'none', color: sym && qty && cost ? '#000' : C.textTertiary, fontFamily: 'Cairo,sans-serif', fontSize: 13, fontWeight: 800, cursor: sym && qty && cost ? 'pointer' : 'default' }}
          >
            إضافة للمحفظة
          </button>
        </div>
      </div>
    </>
  );
}

export default function PortfolioScreen() {
  // useStocks() merges priceCache into stock.p automatically
  // Use the merged stocks directly — priceCache already applied
  const { stocks, priceCache } = useStocks();
  const { openStock } = useNav();

  const [port,    setPort]    = useState(() => loadLS(LS_PORT, []));
  const [capital, setCapital] = useState(() => loadLS(LS_CAPITAL, 100000));
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState('positions');

  useEffect(() => saveLS(LS_PORT, port),    [port]);
  useEffect(() => saveLS(LS_CAPITAL, capital), [capital]);

  const positions = useMemo(() => {
    return port.map(pp => {
      const stk      = stocks.find(s => s.sym === pp.sym);
      // Use priceCache for latest live price if available
      const cached   = priceCache[pp.sym];
      const curPrice = cached?.p ?? stk?.p ?? pp.avgCost;
      const curValue = curPrice * pp.qty;
      const cost     = pp.avgCost * pp.qty;
      const pnl      = curValue - cost;
      const pnlPct   = cost > 0 ? (pnl / cost) * 100 : 0;
      return { ...pp, stk, curPrice, curValue, cost, pnl, pnlPct };
    });
  }, [port, stocks]);

  const totalValue   = positions.reduce((s, p) => s + p.curValue, 0);
  const totalCost    = positions.reduce((s, p) => s + p.cost,     0);
  const totalPnl     = totalValue - totalCost;
  const totalPnlPct  = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isPortUp     = totalPnl >= 0;

  const addPosition = useCallback((entry) => {
    setPort(prev => {
      const existing = prev.find(p => p.sym === entry.sym);
      if (existing) {
        return prev.map(p => p.sym === entry.sym
          ? { ...p, qty: p.qty + entry.qty, avgCost: (p.avgCost * p.qty + entry.avgCost * entry.qty) / (p.qty + entry.qty) }
          : p
        );
      }
      return [...prev, entry];
    });
  }, []);

  const removePosition = useCallback((sym) => {
    setPort(prev => prev.filter(p => p.sym !== sym));
  }, []);

  const TABS = [
    { id: 'positions', label: 'المراكز'   },
    { id: 'summary',   label: 'الملخص'   },
  ];

  if (port.length === 0) {
    return (
      <div style={{ fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl', color: C.textPrimary }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setShowAdd(true)} style={{ background: C.gold, border: 'none', borderRadius: 10, padding: '8px 16px', color: '#000', fontFamily: 'Cairo,sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ إضافة سهم</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 3, height: 18, background: C.gold, borderRadius: 2 }} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>المحفظة</span>
          </div>
        </div>
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>محفظتك فارغة</div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 20 }}>أضف أسهمك لمتابعة أدائها</div>
          <button onClick={() => setShowAdd(true)} style={{ background: C.gold, border: 'none', borderRadius: 12, padding: '12px 28px', color: '#000', fontFamily: 'Cairo,sans-serif', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>إضافة أول سهم</button>
        </div>
        {showAdd && <AddModal stocks={stocks} onAdd={addPosition} onClose={() => setShowAdd(false)} />}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl', color: C.textPrimary }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 8px', position: 'sticky', top: 0, background: C.bg, zIndex: 40, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => setShowAdd(true)} style={{ background: C.gold, border: 'none', borderRadius: 10, padding: '7px 14px', color: '#000', fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ إضافة</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 3, height: 18, background: C.gold, borderRadius: 2 }} />
            <span style={{ fontSize: 16, fontWeight: 800 }}>المحفظة</span>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${isPortUp ? C.positive + '22' : C.negative + '22'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: C.textTertiary, marginBottom: 2 }}>إجمالي الربح/الخسارة</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: isPortUp ? C.positive : C.negative }}>
                {isPortUp ? '+' : ''}{fmtNum(totalPnl)} ({isPortUp ? '+' : ''}{totalPnlPct.toFixed(2)}%)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: C.textTertiary, marginBottom: 2 }}>إجمالي المحفظة</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.textPrimary, fontFamily: 'monospace' }}>{fmtNum(totalValue)} <span style={{ fontSize: 11 }}>ر.س</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? C.gold : 'transparent'}`, color: activeTab === t.id ? C.gold : C.textSecondary, fontFamily: 'Cairo,sans-serif', fontSize: 12, fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Positions tab */}
      {activeTab === 'positions' && (
        <div style={{ padding: '8px 12px' }}>
          {positions.map(pos => (
            <div key={pos.sym} style={{ background: C.layer1, borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${pos.pnl >= 0 ? C.positive + '18' : C.negative + '18'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => removePosition(pos.sym)} style={{ background: C.layer3, border: 'none', borderRadius: 6, padding: '3px 8px', color: C.textTertiary, fontSize: 10, cursor: 'pointer', fontFamily: 'Cairo,sans-serif' }}>×</button>
                  <button onClick={() => pos.stk && openStock(pos.stk, 'portfolio')} style={{ background: C.layer2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', color: C.electric, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif' }}>تحليل</button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{pos.stk?.name ?? pos.sym}</div>
                  <div style={{ fontSize: 10, color: C.textTertiary }}>{pos.qty} سهم · تكلفة {fmtNum(pos.avgCost)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                {[
                  { l: 'السعر الحالي', v: fmtNum(pos.curPrice), c: C.textPrimary },
                  { l: 'القيمة',       v: fmtNum(pos.curValue), c: C.textPrimary },
                  { l: 'ر/خ',         v: (pos.pnl >= 0 ? '+' : '') + fmtNum(pos.pnl), c: pos.pnl >= 0 ? C.positive : C.negative },
                ].map((s, i) => (
                  <div key={i} style={{ background: C.layer3, borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: C.textTertiary, marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 6, textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: pos.pnl >= 0 ? C.positive : C.negative }}>
                  {pos.pnl >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary tab */}
      {activeTab === 'summary' && (
        <div style={{ padding: '14px 12px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <DonutChart positions={positions} totalValue={totalValue} />
            <div style={{ flex: 1 }}>
              {positions.map((pos, i) => {
                const COLORS = [C.gold, C.electric, C.mint, C.plasma, C.amber, C.teal, C.coral];
                const pct = ((pos.curValue / totalValue) * 100).toFixed(1);
                return (
                  <div key={pos.sym} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: COLORS[i % COLORS.length], fontWeight: 700 }}>{pct}%</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontSize: 12, color: C.textPrimary }}>{pos.stk?.name ?? pos.sym}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Stats */}
          {[
            { l: 'إجمالي الاستثمار',   v: fmtNum(totalCost) + ' ر.س' },
            { l: 'القيمة الحالية',      v: fmtNum(totalValue) + ' ر.س', c: C.textPrimary },
            { l: 'الربح / الخسارة',    v: (totalPnl >= 0 ? '+' : '') + fmtNum(totalPnl) + ' ر.س', c: totalPnl >= 0 ? C.positive : C.negative },
            { l: 'العائد الإجمالي',    v: (totalPnlPct >= 0 ? '+' : '') + totalPnlPct.toFixed(2) + '%', c: totalPnlPct >= 0 ? C.positive : C.negative },
            { l: 'عدد المراكز',        v: positions.length + ' سهم' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.c ?? C.textPrimary }}>{r.v}</span>
              <span style={{ fontSize: 11, color: C.textSecondary }}>{r.l}</span>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddModal stocks={stocks} onAdd={addPosition} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
