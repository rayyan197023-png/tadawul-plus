'use client';
/**
 * SectorBar — Sector Performance Component
 * Extracted from الرئيسية.jsx
 */

import { useMarket } from '../../store';
import { colors }    from '../../theme/tokens';

const C = colors;

export default function SectorBar() {
  const { sectors } = useMarket();

  return (
    <div style={{ margin: '12px 12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: C.textSecondary }}>مرتب حسب الوزن</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 3, height: 18, background: C.gold, borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>أداء القطاعات</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sectors.slice(0, 8).map((sec, i) => {
          const up     = sec.pct >= 0;
          const color  = up ? C.positive : C.negative;
          const barPct = Math.min(100, Math.abs(sec.pct) * 20);

          return (
            <div key={sec.id} style={{
              background: C.layer1,
              borderRadius: 10,
              padding: '8px 12px',
              border: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              {/* Rank */}
              <span style={{ fontSize: 9, color: C.textTertiary, width: 14, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>

              {/* Name */}
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, flex: 1, textAlign: 'right' }}>{sec.name}</span>

              {/* Bar */}
              <div style={{ width: 60, height: 4, background: C.layer3, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{
                  width: barPct + '%',
                  height: '100%',
                  background: color,
                  borderRadius: 2,
                  transition: 'width .5s ease',
                  marginLeft: up ? 'auto' : undefined,
                }} />
              </div>

              {/* Pct */}
              <span style={{
                fontSize: 11, fontWeight: 700, color,
                background: up ? 'rgba(30,230,138,.1)' : 'rgba(255,95,106,.1)',
                padding: '2px 7px', borderRadius: 6,
                border: `1px solid ${up ? 'rgba(30,230,138,.2)' : 'rgba(255,95,106,.2)'}`,
                flexShrink: 0, minWidth: 48, textAlign: 'center',
              }}>
                {up ? '+' : ''}{sec.pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
