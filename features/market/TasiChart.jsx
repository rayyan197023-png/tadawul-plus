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
 * - بيانات تاسي التاريخية الحقيقية من sahmk
 * - Animated gradient fill
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { colors } from '../../theme/tokens';
import { useNav } from '../../store/navStore';

const C = colors;

// ── Period configuration
const PERIODS = ['أسبوع', 'شهر', '3 أشهر', 'سنة'];

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

import { useSharedPrices } from '../../store';

export default function TasiChart({ market }) {
  const allStocks = useSharedPrices();
  const { openStock } = useNav();
const [period, setPeriod] = useState('أسبوع');
  const [tasiLive,  setTasiLive]  = useState(null);
  const [ohlcvData, setOhlcvData] = useState({});
const todayPtsRef = useRef([]);

  // جلب بيانات تاسي الحية
  useEffect(() => {
    const fetchTasi = async () => {
      try {
        const r = await fetch('/api/sahmkdata?endpoint=tasi');
        const j = await r.json();
        if (j?.index_value) {
  setTasiLive(j);
  todayPtsRef.current = [...todayPtsRef.current, j.index_value].slice(-390);
}
      } catch(e) {}
    };
fetchTasi();
    const t = setInterval(fetchTasi, 60000); // كل دقيقة بدل كل 20 ثانية
    return () => clearInterval(t);
  }, []);

  // جلب OHLCV تاسي
  useEffect(() => {
    const periodMap = { 'يوم':'1D', 'أسبوع':'1W', 'شهر':'1M', '3 أشهر':'3M', 'سنة':'1Y' };
    const sahmkPeriod = periodMap[period];
    if (!sahmkPeriod) return;
    if (ohlcvData[period]) return;
const fetchOHLCV = async (retryCount = 0) => {
      try {
        const r = await fetch(`/api/sahmkdata?endpoint=ohlcv&sym=TASI&period=${sahmkPeriod}`);
        const j = await r.json();
        // إذا 429، انتظر وأعد المحاولة
        if (j?.error && j.error.includes('429') && retryCount < 3) {
          const waitMs = 5000 * Math.pow(2, retryCount); // 5s, 10s, 20s
          setTimeout(() => fetchOHLCV(retryCount + 1), waitMs);
          return;
        }
        if (j?.data?.length > 0) {
          setOhlcvData(prev => ({
            ...prev,
            [period]: j.data.map(b => b.close),
            [period + '_ohlc']: j.data.map(b => ({
              o: b.open  ?? b.close,
              h: b.high  ?? b.close,
              l: b.low   ?? b.close,
              c: b.close,
            })),
          }));
        }
      } catch(e) {}
    };
    fetchOHLCV();
  }, [period]);
const chartType = 'line'; // ثابت دائماً على الخط -- البطاقة بالرئيسية للعرض السريع فقط
  const [tooltip,   setTooltip]   = useState(null);
  const svgRef                    = useRef(null);

  const idx      = tasiLive?.index_value     ?? market.current  ?? 0;
const chgP     = tasiLive?.index_change_percent ?? market.chgPts ?? 0;
const chgVal   = tasiLive?.index_change    ?? market.chgVal   ?? 0;
const openPrice= idx - chgVal;
const isUpToday= chgP >= 0;
const advancing  = tasiLive?.advancing   ?? 0;
const declining  = tasiLive?.declining   ?? 0;
const unchanged  = tasiLive?.unchanged   ?? 0;
const totalVol   = tasiLive?.total_volume ?? 0;

// ✨ احسب قيمة التداول الإجمالية: Σ (volume × price) لكل سهم
const totalValue = useMemo(() => {
  if (!allStocks || !allStocks.length) return 0;
  return allStocks.reduce((sum, s) => {
    const vol = s.v || s.vol || 0;
    const price = s.p || 0;
    return sum + (vol * price);
  }, 0);
}, [allStocks]);

    // ── Build points for selected period
  const pts = useMemo(() => {
    if (period === 'يوم') {
      const today = todayPtsRef.current;
      return today.length > 0 ? today : [idx];
    }
    // الفترات الأخرى من OHLCV
    const base = ohlcvData[period];
    if (!base || !Array.isArray(base) || base.length === 0) {
      return [idx];
    }
    return base;
  }, [period, idx, ohlcvData]);
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

  // Container color follows actual day direction (chgP), not period change
  // periodUp would be misleading when only 1 data point exists (=0 → false-green)
  const color   = isUpToday ? C.positive : C.negative;
  const bgFrom  = isUpToday ? '#071c10' : '#180808';
  const bgTo    = isUpToday ? '#040e08' : '#0e0404';
  const borderC = isUpToday ? 'rgba(30,230,138,0.2)' : 'rgba(255,95,106,0.2)'; 

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

const dayChgVal = +chgVal.toFixed(2);

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
             قيمة التداول: <span style={{ color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>{
               totalValue
                 ? (totalValue >= 1e9
                     ? (totalValue/1e9).toFixed(2)+' مليار ر.س'
                     : totalValue >= 1e6
                       ? (totalValue/1e6).toFixed(0)+' مليون ر.س'
                       : '--')
                 : '--'
             }</span>
            </span>
            
            <span style={{ color: 'rgba(255,255,255,.35)' }}>·</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,.55)' }}>
              الافتتاح: <span style={{ color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>{openPrice.toFixed(2)}</span>
            </span>
          </div>
        </div>

        {/* Live status + breadth pills */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
          {(() => {
            // فحص حالة السوق السعودي (KSA UTC+3)
            // التداول: الأحد (0) - الخميس (4) من 09:30 إلى 15:30
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const ksa = new Date(utc + 3 * 3600000);
            const day = ksa.getDay();
            const timeInMin = ksa.getHours() * 60 + ksa.getMinutes();
            const isWeekday = day >= 0 && day <= 4;
            const isMarketHours = timeInMin >= 570 && timeInMin <= 930;
            const isOpen = isWeekday && isMarketHours;
            const statusColor = isOpen ? C.positive : C.negative;
            const statusLabel = isOpen ? 'مباشر' : 'مغلق';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, boxShadow: `0 0 7px ${statusColor}`, animation: isOpen ? 'homeScreenPulse 2s infinite' : 'none' }} />
                <span style={{ fontSize: 9, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
              </div>
            );
          })()}
          {[{ l:advancing||'--', sl:'صاعد', c: C.positive }, { l:declining||'--', sl:'هابط', c: C.negative }, { l:unchanged||'--', sl:'ثابت', c: C.textSecondary }].map((s, i) => (

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
        {/* فتح شارت تاسي الكامل (chart.html) */}
        <button
onClick={() => {
  openStock({
    sym: 'TASI',
    name: 'مؤشر تاسي',
    p: idx,
    ch: chgVal,
    pct: chgP,
    sec: 'مؤشر',
  }, 'market');
}}

          style={{
            padding: '4px 8px', background: 'none',
            border: '1px solid ' + color + '44', borderRadius: 6, cursor: 'pointer',
            fontFamily: 'Cairo,sans-serif', fontSize: 9, fontWeight: 700, color: color, marginLeft: 6, flexShrink: 0, minHeight: 28,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <span>📊</span>
          <span>عرض الشارت</span>
        </button>
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
