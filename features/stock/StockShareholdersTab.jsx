'use client';
/**
 * StockShareholdersTab — كبار الملاك
 *
 * Shows:
 * - Ownership pie chart
 * - Institutional vs retail breakdown
 * - Insider transactions (12 months)
 * - HHI concentration index
 * - Shariah compliance
 */

import { useMemo } from 'react';
import { SHAREHOLDERS, INSIDER_TX, SHARIAH_STATUS } from '../../constants/shareholdersData';
import { colors } from '../../theme/tokens';

const C = colors;
const SLICE_COLORS = [C.electric, C.gold, C.positive, C.plasma, C.amber, C.teal];

// ── Donut/pie chart
function OwnershipPie({ holders, name, sym }) {
  const SIZE = 130, CX = 65, CY = 65, R = 52, HOLE = 28;
  const total = holders.reduce((s, h) => s + h.pct, 0) || 100;
  let angle = -Math.PI / 2;

  const slices = holders.map((h, i) => {
    const sweep = (h.pct / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(angle), y1 = CY + R * Math.sin(angle);
    angle += sweep;
    const x2 = CX + R * Math.cos(angle), y2 = CY + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return {
      d: `M${CX},${CY} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      ...h,
    };
  });

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R + 2} fill={C.layer3} />
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} opacity={0.9} />
        ))}
        <circle cx={CX} cy={CY} r={HOLE} fill={C.layer1} />
        <text x={CX} y={CY - 5} textAnchor="middle" fill={C.textPrimary} fontSize="10" fontWeight="800" fontFamily="Cairo,sans-serif">
          {name?.split(' ')[0]}
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" fill={C.textSecondary} fontSize="8" fontFamily="monospace">{sym}</text>
      </svg>

      <div style={{ flex: 1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.pct}%</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 10, color: C.textSecondary, textAlign: 'right' }}>{s.n.length > 18 ? s.n.slice(0, 18) + '…' : s.n}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Concentration metrics
function ConcentrationStats({ holders }) {
  const top1 = holders[0]?.pct ?? 0;
  const top3 = holders.slice(0, 3).reduce((s, h) => s + h.pct, 0);
  const hhi  = +holders.reduce((s, h) => s + Math.pow(h.pct / 100, 2), 0).toFixed(3);
  const hhiColor = hhi > 0.25 ? C.negative : hhi > 0.15 ? C.amber : C.positive;

  const stats = [
    { l: 'أكبر مالك', v: top1.toFixed(0) + '%',  c: top1 > 50 ? C.amber : C.positive },
    { l: 'أكبر 3',   v: top3.toFixed(0) + '%',   c: top3 > 70 ? C.amber : C.positive },
    { l: 'HHI',       v: hhi.toString(),           c: hhiColor },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
      {stats.map((s, i) => (
        <div key={i} style={{ background: s.c + '12', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: `1px solid ${s.c}25` }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: s.c, fontFamily: 'monospace' }}>{s.v}</div>
          <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 2 }}>{s.l}</div>
        </div>
      ))}
    </div>
  );
}

// ── Smart money vs retail
function SmartMoneyBar({ holders }) {
  const institutional = holders.filter(h => ['مؤسسي','حكومي','مؤسس','خزينة'].includes(h.type))
                               .reduce((s, h) => s + h.pct, 0);
  const retail = 100 - institutional;
  const color  = institutional > 60 ? C.electric : institutional > 40 ? C.positive : C.amber;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
        <span style={{ color: C.negative }}>تجزئة {retail.toFixed(0)}%</span>
        <span style={{ color: color }}>مؤسسي/حكومي {institutional.toFixed(0)}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', background: C.negative + '40' }}>
        <div style={{ width: institutional + '%', height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 10, color: C.textTertiary, textAlign: 'center' }}>
        {institutional > 60 ? 'أموال ذكية مرتفعة — ثقة مؤسسية قوية'
        : institutional > 40 ? 'توازن معقول بين المؤسسي والتجزئة'
        : 'هيمنة تجزئة — قد يزيد التذبذب'}
      </div>
    </div>
  );
}

export default function StockShareholdersTab({ stk }) {
  const holders = useMemo(() => SHAREHOLDERS[stk.sym] ?? [], [stk.sym]);
  const txs     = useMemo(() => INSIDER_TX[stk.sym]   ?? [], [stk.sym]);
  const shariah = useMemo(() => SHARIAH_STATUS[stk.sym] ?? { halal: null, status: '—', reason: '' }, [stk.sym]);

  const shColor = shariah.halal === true  ? C.positive
                : shariah.halal === false ? C.negative
                : C.amber;

  if (!holders.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.textTertiary }}>
        لا تتوفر بيانات ملكية لهذا السهم
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px 48px', direction: 'rtl', fontFamily: "'Cairo','Segoe UI',sans-serif" }}>

      {/* Ownership chart */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 3, height: 16, background: C.gold, borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>هيكل الملكية</span>
        </div>
        <OwnershipPie holders={holders} name={stk.name} sym={stk.sym} />
      </div>

      {/* Holder detail list */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
        {holders.map((h, i) => {
          const color = SLICE_COLORS[i % SLICE_COLORS.length];
          return (
            <div key={i} style={{ marginBottom: i < holders.length - 1 ? 12 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {h.ch !== 0 && (
                    <span style={{ fontSize: 10, color: h.ch > 0 ? C.positive : C.negative, fontWeight: 700 }}>
                      {h.ch > 0 ? '+' : ''}{h.ch}%
                    </span>
                  )}
                  <span style={{ fontSize: 9, color: C.textTertiary, background: C.layer3, padding: '1px 6px', borderRadius: 5 }}>{h.type}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{h.n}</span>
                  {h.since && <span style={{ fontSize: 9, color: C.textTertiary, marginRight: 6 }}>منذ {h.since}</span>}
                </div>
              </div>
              <div style={{ height: 5, background: C.layer3, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: h.pct + '%', height: '100%', background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: 3 }} />
              </div>
              <div style={{ textAlign: 'left', marginTop: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'monospace' }}>{h.pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Concentration */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 3, height: 16, background: C.electric, borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>تركز الملكية</span>
        </div>
        <ConcentrationStats holders={holders} />
      </div>

      {/* Smart money */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <div style={{ width: 3, height: 16, background: C.teal, borderRadius: 2 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>الأموال الذكية vs التجزئة</span>
        </div>
        <SmartMoneyBar holders={holders} />
      </div>

      {/* Insider transactions */}
      {txs.length > 0 && (
        <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <div style={{ width: 3, height: 16, background: C.plasma, borderRadius: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>معاملات المطلعين</span>
          </div>
          {txs.map((tx, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < txs.length - 1 ? `1px solid ${C.line}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ background: (tx.action === 'شراء' ? C.positive : C.negative) + '15', borderRadius: 6, padding: '2px 8px', display: 'inline-block' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: tx.action === 'شراء' ? C.positive : C.negative }}>{tx.action}</span>
                </div>
                <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 3 }}>{tx.value}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary }}>{tx.name}</div>
                <div style={{ fontSize: 10, color: C.textTertiary }}>{tx.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shariah compliance */}
      <div style={{ background: shColor + '10', borderRadius: 14, padding: '14px', border: `1px solid ${shColor}30` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: shColor + '20', border: `1px solid ${shColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {shariah.halal === true ? '✓' : shariah.halal === false ? '✗' : '⚠'}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: C.textTertiary, marginBottom: 2 }}>الالتزام الشرعي</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: shColor }}>{shariah.status}</div>
          </div>
        </div>
        {shariah.reason && (
          <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.7, background: C.layer2, borderRadius: 8, padding: '8px 10px' }}>
            {shariah.reason}
          </div>
        )}
        {shariah.purification && (
          <div style={{ marginTop: 8, fontSize: 11, color: C.amber, background: C.amber + '12', borderRadius: 8, padding: '6px 10px', border: `1px solid ${C.amber}25` }}>
            نسبة التطهير: {shariah.purification}% من الدخل الاستثماري
          </div>
        )}
        {shariah.source && (
          <div style={{ marginTop: 6, fontSize: 9, color: C.textTertiary, textAlign: 'left' }}>المرجع: {shariah.source}</div>
        )}
      </div>

    </div>
  );
}
