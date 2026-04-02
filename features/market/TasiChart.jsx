'use client';
/**
 * TasiChart — Interactive TASI Index Chart
 *
 * Extracted from الرئيسية.jsx (TasiCard component).
 * Receives live market data via props — no internal data fetching.
 *
 * Features:
 * - 5 time periods: Day / Week / Month / 3M / Year
 * - Touch + mouse crosshair
 * - GBM-seeded historical data
 * - Animated gradient fill
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { colors } from '../../theme/tokens';
import { HISTORICAL_SERIES } from '../../hooks/useMarketEngine'; // constants only — live data via prop

const C = colors;

// ── Period configuration
const PERIODS = ['يوم', 'أسبوع', 'شهر', '3 أشهر', 'سنة'];

const PERIOD_CFG = {
  'يوم': {
    xLabelFn: (i, n) => {
      const mins = Math.round(i / (n - 1) * 390);
      return `${String(10 + Math.floor(mins / 60)).padStart(2,'0')}:${String(mins % 60).padStart(2,'0')}`;
    },
    xLabels: (n) => [0, Math.floor(n*.25), Math.floor(n*.5), Math.floor(n*.75), n-1],
  },
  'أسبوع': {
    xLabelFn: (i) => ['أحد','اثن','ثلا','أرب','خمس'][i] ?? '',
    xLabels:  (n) => Array.from({ length: n }, (_, i) => i),
  },
  'شهر': {
    xLabelFn: (i, n) => { const d = new Date(); d.setDate(d.getDate() - (n-1-i)); return `${d.getDate()}/${d.getMonth()+1}`; },
    xLabels:  (n) => [0, Math.floor(n*.25), Math.floor(n*.5), Math.floor(n*.75), n-1],
  },
  '3 أشهر': {
    xLabelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i));
      return ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][d.getMonth()].slice(0,3);
    },
    xLabels: (n) => [0, Math.floor(n*.25), Math.floor(n*.5), Math.floor(n*.75), n-1],
  },
  'سنة': {
    xLabelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i)*7);
      return ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][d.getMonth()].slice(0,3);
    },
    xLabels: (n) => [0, Math.floor(n*.25), Math.floor(n*.5), Math.floor(n*.75), n-1],
  },
};

export default function TasiChart({ market }) {
  const [period,    setPeriod]    = useState('يوم');
  const [chartType, setChartType] = useState('line');  // 'line' | 'candle'
  const [tooltip,   setTooltip]   = useState(null);
  const svgRef                    = useRef(null);

  const idx      = market.current;
  const openPrice= market.open;
  const chgP     = market.chgPts;
  const isUpToday= chgP >= 0;

  // ── Build points for selected period
  const pts = useMemo(() => {
    if (period === 'يوم') {
      const live = [...(market.todayPts ?? [idx])];
      live[live.length - 1] = idx;
      return live;
    }
    const base = {
      'أسبوع':  [...HISTORICAL_SERIES.week],
      'شهر':    [...HISTORICAL_SERIES.month],
      '3 أشهر': [...HISTORICAL_SERIES.q3m],
      'سنة':    [...HISTORICAL_SERIES.year],
    }[period] ?? [idx];
    const updated = [...base];
    updated[updated.length - 1] = idx;
    return updated;
  }, [period, market.todayPts, idx]);

  // ── Chart geometry
  const W = 340, H = 96;
  const minV = Math.min(...pts), maxV = Math.max(...pts);
  const pad  = (maxV - minV) * 0.1 || 10;
  const vMin = minV - pad, vMax = maxV + pad, vRng = vMax - vMin;
  const toX  = (i) => (i / Math.max(1, pts.length - 1)) * W;
  const toY  = (v) => H - ((v - vMin) / vRng) * H;

  const pathD  = pts.map((v,i) => `${i===0?'M':'L'}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(' ');
  const fillD  = `${pathD} L${W},${H+2} L0,${H+2} Z`;
  const liveX  = toX(pts.length - 1);
  const liveY  = toY(pts[pts.length - 1]);

  // ── Period change
  const firstPt  = pts[0] ?? idx, lastPt = pts[pts.length - 1] ?? idx;
  const periodChg= +((lastPt - firstPt) / firstPt * 100).toFixed(2);
  const periodUp = periodChg >= 0;

  const color   = periodUp ? C.positive : C.negative;
  const bgFrom  = periodUp ? '#071c10' : '#180808';
  const bgTo    = periodUp ? '#040e08' : '#0e0404';
  const borderC = periodUp ? 'rgba(30,230,138,0.2)' : 'rgba(255,95,106,0.2)';

  // ── Crosshair
  const cfg = PERIOD_CFG[period] ?? PERIOD_CFG['يوم'];
  const handleMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const relX    = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pidx    = Math.round((relX / rect.width) * (pts.length - 1));
    const val     = pts[pidx];
    if (!val) return;
    const chgFromBase = period === 'يوم'
      ? +((val - openPrice) / openPrice * 100).toFixed(2)
      : +((val - firstPt) / firstPt * 100).toFixed(2);
    setTooltip({
      x: toX(pidx), y: toY(val),
      val: val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      chg: chgFromBase, isUp: chgFromBase >= 0,
      label: cfg.xLabelFn(pidx, pts.length),
    });
  }, [pts, cfg, period, openPrice, firstPt]);

  const dayChgVal  = +(idx - openPrice).toFixed(2);

  return (
    <div style={{
      margin: '10px 12px 0',
      background: `linear-gradient(170deg,${bgFrom} 0%,${bgTo} 100%)`,
      borderRadius: 20,
      border: `1px solid ${borderC}`,
      overflow: 'hidden',
      position: 'relative',
      transition: 'background .4s, border .4s',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 10% 0%,${color}12 0%,transparent 60%)`,
      }} />

      {/* ── Info Row */}
      <div style={{ padding: '14px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: 10, color, fontWeight: 600, marginBottom: 2, opacity: .8, letterSpacing: .3 }}>مؤشر تاسي الرئيسي</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: C.textPrimary, letterSpacing: '-1.8px', lineHeight: 1, direction: 'ltr', transition: 'color .3s' }}>
            {idx.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isUpToday ? C.positive : C.negative }}>
              {isUpToday ? '▲' : '▼'} {isUpToday ? '+' : ''}{dayChgVal} نقطة
            </span>
            <span style={{ fontSize: 19, fontWeight: 900, color: isUpToday ? C.positive : C.negative, background: isUpToday ? 'rgba(30,230,138,.14)' : 'rgba(255,95,106,.14)', padding: '2px 8px', borderRadius: 8, transition: 'all .3s' }}>
              {isUpToday ? '+' : ''}{chgP}%
            </span>
            {period !== 'يوم' && (
              <span style={{ fontSize: 10, fontWeight: 700, color: periodUp ? C.positive : C.negative, background: periodUp ? 'rgba(30,230,138,.08)' : 'rgba(255,95,106,.08)', padding: '1px 7px', borderRadius: 6, border: `1px solid ${periodUp ? 'rgba(30,230,138,.2)' : 'rgba(255,95,106,.2)'}` }}>
                {period}: {periodUp ? '+' : ''}{periodChg}%
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }}>
              حجم التداول: <span style={{ color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>4.2 مليار ر.س</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,.35)' }}>·</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }}>
              الافتتاح: <span style={{ color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>{openPrice.toFixed(2)}</span>
            </span>
          </div>
        </div>

        {/* Live status + breadth pills */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: isUpToday ? C.positive : C.negative, boxShadow: `0 0 7px ${isUpToday ? C.positive : C.negative}`, animation: 'homeScreenPulse 2s infinite' }} />
            <span style={{ fontSize: 9, color: isUpToday ? C.positive : C.negative, fontWeight: 600 }}>مباشر</span>
          </div>
          {[{ l:'142', sl:'صاعد', c: C.positive }, { l:'58', sl:'هابط', c: C.negative }, { l:'12', sl:'ثابت', c: C.textSecondary }].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,.06)', borderRadius: 16, padding: '2px 8px', border: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
              <span style={{ fontSize: 10, color: s.c, fontWeight: 700 }}>{s.l}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,.75)', fontWeight: 500 }}>{s.sl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Period Tabs + Chart Type Toggle */}
      <div style={{ display: 'flex', padding: '2px 14px 0', position: 'relative', zIndex: 1, alignItems: 'center' }}>
        {/* Candlestick / Line toggle */}
        <button
          onClick={() => { setChartType(t => t === 'line' ? 'candle' : 'line'); setTooltip(null); }}
          style={{
            padding: '4px 8px', background: chartType === 'candle' ? color + '22' : 'none',
            border: '1px solid ' + color + '44', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'monospace', fontSize: 9, color: color, marginLeft: 6, flexShrink: 0, minHeight: 28,
          }}
        >{chartType === 'line' ? 'شموع' : 'خط'}</button>
        {PERIODS.map(p => (
          <button key={p} onClick={() => { setPeriod(p); setTooltip(null); }} style={{
            flex: 1, padding: '6px 2px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'Cairo,sans-serif', fontSize: 10, fontWeight: 600,
            color: period === p ? color : C.textTertiary,
            borderBottom: period === p ? `2px solid ${color}` : '2px solid rgba(255,255,255,.06)',
            transition: 'all .18s',
          }}>{p}</button>
        ))}
      </div>

      {/* ── SVG Chart */}
      <div style={{ position: 'relative', height: H + 30, userSelect: 'none' }}>
        <svg
          ref={svgRef}
          width="100%" height={H + 2}
          viewBox={`0 0 ${W} ${H + 2}`}
          preserveAspectRatio="none"
          style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setTooltip(null)}
          onTouchMove={handleMove}
          onTouchEnd={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="tasiChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.30" />
              <stop offset="80%"  stopColor={color} stopOpacity="0.03" />
              <stop offset="100%" stopColor={color} stopOpacity="0"    />
            </linearGradient>
          </defs>

          {/* Open price baseline */}
          {period === 'يوم' && (() => {
            const baseY = toY(openPrice);
            return <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="rgba(255,255,255,.15)" strokeWidth="1" strokeDasharray="4 3" />;
          })()}

          {/* Fill (line mode only) */}
          {chartType === 'line' && <path d={fillD} fill="url(#tasiChartFill)" />}
          {/* Line */}
          {chartType === 'line' && (
            <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {/* Candlestick mode */}
          {chartType === 'candle' && pts.length > 0 && (() => {
            const candleW = Math.max(2, Math.floor(W / pts.length * 0.7));
            // Group into candles (aggregate N points per candle)
            const candleCount = Math.min(40, pts.length);
            const step = pts.length / candleCount;
            const candles = [];
            for (let i = 0; i < candleCount; i++) {
              const start = Math.floor(i * step);
              const end   = Math.min(Math.floor((i + 1) * step), pts.length);
              const slice = pts.slice(start, end);
              if (!slice.length) continue;
              const o = slice[0];
              const cl = slice[slice.length - 1];
              const hi2 = Math.max(...slice);
              const lo2 = Math.min(...slice);
              const x   = Math.round(i / candleCount * W + W / candleCount / 2);
              candles.push({ x, o, c: cl, hi: hi2, lo: lo2, up: cl >= o });
            }
            return candles.map((candle, i) => {
              const openY  = toY(candle.o);
              const closeY = toY(candle.c);
              const hiY    = toY(candle.hi);
              const loY    = toY(candle.lo);
              const col    = candle.up ? C.positive : C.negative;
              const bodyTop    = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));
              return (
                <g key={i}>
                  {/* Wick */}
                  <line x1={candle.x} y1={hiY} x2={candle.x} y2={loY} stroke={col} strokeWidth="1" opacity="0.8" />
                  {/* Body */}
                  <rect x={candle.x - candleW/2} y={bodyTop} width={candleW} height={bodyHeight} fill={col} opacity="0.9" rx="1" />
                </g>
              );
            });
          })()}

          {/* Live dot */}
          <circle cx={liveX} cy={liveY} r="4" fill={color} opacity="0.9" />
          <circle cx={liveX} cy={liveY} r="8" fill={color} opacity="0.15" />

          {/* Crosshair */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1="0" x2={tooltip.x} y2={H} stroke="rgba(255,255,255,.3)" strokeWidth="1" strokeDasharray="3 2" />
              <circle cx={tooltip.x} cy={tooltip.y} r="4" fill={tooltip.isUp ? C.positive : C.negative} />
            </>
          )}
        </svg>

        {/* X-axis labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 2px 0', direction: 'ltr' }}>
          {cfg.xLabels(pts.length).map((idx2, i) => (
            <span key={i} style={{ fontSize: 8, color: C.textTertiary }}>{cfg.xLabelFn(idx2, pts.length)}</span>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute', top: 4, left: 8,
            background: 'rgba(22,32,46,.95)', borderRadius: 8, padding: '5px 10px',
            border: `1px solid ${tooltip.isUp ? C.positive : C.negative}40`,
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, direction: 'ltr' }}>{tooltip.val}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: tooltip.isUp ? C.positive : C.negative }}>
              {tooltip.isUp ? '+' : ''}{tooltip.chg}%
            </div>
            <div style={{ fontSize: 9, color: C.textTertiary }}>{tooltip.label}</div>
          </div>
        )}
      </div>
    </div>
  );
}
