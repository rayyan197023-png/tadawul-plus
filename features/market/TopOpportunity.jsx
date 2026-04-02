'use client';
/**
 * TopOpportunity — Best Smart Money Score Card
 * Extracted from الرئيسية.jsx
 * Uses radarEngine to rank stocks and show the top opportunity.
 */

import { useMemo }           from 'react';
import { useNav, useStocks } from '../../store';
import { calcRadarScore }    from '../../engines/radarEngine';
import { generateOHLCBars }  from '../../services/api/stocksApi';
import { colors }            from '../../theme/tokens';

const C = colors;

export default function TopOpportunity() {
  const { stocks }    = useStocks();
  const { openStock } = useNav();

  const top = useMemo(() => {
    const scored = stocks.map(s => {
      const bars  = generateOHLCBars(s, 30);
      const radar = calcRadarScore(s, bars);
      return { s, score: radar.totalScore, radar };
    }).sort((a, b) => b.score - a.score);
    return scored[0] ?? null;
  }, [stocks]);

  if (!top) return null;

  const { s, score } = top;
  const scoreColor   = score >= 68 ? C.positive : score >= 48 ? C.gold : C.negative;
  const up           = s.pct >= 0;

  return (
    <div
      onClick={() => openStock(s, 'home')}
      style={{
        margin: '10px 12px 0',
        background: `linear-gradient(135deg,${scoreColor}12,${scoreColor}06)`,
        borderRadius: 16, padding: '12px 14px',
        border: `1px solid ${scoreColor}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
      }}
    >
      {/* Background glow */}
      <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: `${scoreColor}06`, pointerEvents: 'none' }} />

      {/* Score badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: `linear-gradient(135deg,${scoreColor}cc,${scoreColor})`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${scoreColor}44`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#000', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 8, color: 'rgba(0,0,0,.7)', fontWeight: 700 }}>RADAR</span>
        </div>

        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{s.p.toFixed(2)}</div>
          <div style={{ fontSize: 12, color: up ? C.positive : C.negative, fontWeight: 600 }}>
            {up ? '+' : ''}{s.pct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ textAlign: 'right', flex: 1, padding: '0 10px' }}>
        <div style={{ fontSize: 7, color: C.textTertiary, marginBottom: 2 }}>أفضل فرصة</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: C.textPrimary }}>{s.name}</div>
        <div style={{ fontSize: 11, color: scoreColor, fontWeight: 600 }}>
          {score >= 68 ? 'سيولة مؤسسية' : score >= 48 ? 'فرصة جيدة' : 'متوسط'}
        </div>
      </div>

      {/* Symbol */}
      <div style={{
        background: `linear-gradient(135deg,${scoreColor}cc,${scoreColor})`,
        borderRadius: 10, padding: '9px 12px',
        boxShadow: `0 2px 8px ${scoreColor}44`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#000' }}>{s.sym}</span>
      </div>
    </div>
  );
}
