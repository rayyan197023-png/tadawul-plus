'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useStockState } from '../../store/stockStore';
import { STOCKS_MAP } from '../../constants/stocksData';

/* ═══════════════════════════════════════════════
   StockDetail.jsx — بيانات حقيقية من sahmk فقط
   لا بيانات وهمية
═══════════════════════════════════════════════ */

const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#0a0c12", layer2:"#0d1018", layer3:"#111520",
  edge:"#2e3e60", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878",
  electric:"#4d9fff", electricL:"#82c0ff",
  plasma:"#a78bfa", mint:"#1ee68a", coral:"#ff5f6a", coralL:"#ff7a84",
  amber:"#fbbf24", teal:"#22d3ee",
};

const fmt = (v, dec=2) => v != null && !isNaN(v) ? Number(v).toFixed(dec) : '—';
const fmtVol = v => {
  if (!v) return '—';
  if (v >= 1e9) return (v/1e9).toFixed(2) + 'م';
  if (v >= 1e6) return (v/1e6).toFixed(1) + 'م';
  if (v >= 1e3) return (v/1e3).toFixed(0) + 'ك';
  return v;
};
const fmtVal = v => {
  if (!v) return '—';
  if (v >= 1e9) return (v/1e9).toFixed(2) + ' مليار';
  if (v >= 1e6) return (v/1e6).toFixed(1) + ' مليون';
  return v;
};

/* ── شارت شموع يابانية ── */
function CandleChart({ bars, stk }) {
  const canvasRef = useRef(null);
  const [crosshair, setCrosshair] = useState(null);

  const n = bars.length;
  const closes = bars.map(b => b.close);
  const highs  = bars.map(b => b.high);
  const lows   = bars.map(b => b.low);
  const vols   = bars.map(b => b.volume);

  const rawMin = Math.min(...lows);
  const rawMax = Math.max(...highs);
  const pad    = (rawMax - rawMin) * 0.08;
  const mn = rawMin - pad, mx = rawMax + pad, rng = mx - mn || 1;
  const maxVol = Math.max(...vols) || 1;
  const HCHART = 180, HVOL = 32, padL = 6, padR = 42, padT = 10;

  const pxC = (i, W) => padL + (n <= 1 ? (W-padL-padR)/2 : (i/(n-1))*(W-padL-padR));
  const pyC = (v)    => padT + (1-(v-mn)/rng)*(HCHART-padT-4);
  const cW  = (W)    => Math.max(2, Math.min(12, (W-padL-padR)/n*0.7));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 360;
    canvas.width  = W * dpr;
    canvas.height = (HCHART + HVOL + 16) * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const cw = cW(W);

    // خلفية
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, HCHART + HVOL + 16);

    // خطوط الشبكة
    ctx.strokeStyle = C.line + '33';
    ctx.lineWidth = 0.4;
    [0.2, 0.4, 0.6, 0.8].forEach(t => {
      const y = padT + (1-t) * (HCHART-padT-4);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W-padR, y); ctx.stroke();
    });

    // الشموع
    bars.forEach((bar, i) => {
      const up = bar.close >= bar.open;
      const clr = up ? C.mint : C.coral;
      const x  = pxC(i, W);
      const oY = pyC(bar.open);
      const cY = pyC(bar.close);
      const hY = pyC(bar.high);
      const lY = pyC(bar.low);
      const bT = Math.min(oY, cY);
      const bH = Math.max(1, Math.abs(cY - oY));

      // الفتيل
      ctx.strokeStyle = clr + 'cc';
      ctx.lineWidth   = 0.9;
      ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, bT); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, bT+bH); ctx.lineTo(x, lY); ctx.stroke();

      // الجسم
      ctx.fillStyle = clr + (up ? 'd0' : 'e0');
      ctx.fillRect(x - cw/2, bT, cw, bH);
    });

    // خط crosshair
    if (crosshair) {
      ctx.strokeStyle = C.snow + '44';
      ctx.lineWidth   = 0.7;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(crosshair.cx, padT); ctx.lineTo(crosshair.cx, HCHART); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL, crosshair.cy); ctx.lineTo(W-padR, crosshair.cy); ctx.stroke();
      ctx.setLineDash([]);
    }

    // خط السعر الحالي
    const lastY = pyC(closes[n-1]);
    const lastUp = n >= 2 ? closes[n-1] >= closes[n-2] : true;
    ctx.strokeStyle = (lastUp ? C.mint : C.coral) + '88';
    ctx.lineWidth   = 0.8;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(padL, lastY); ctx.lineTo(W-padR, lastY); ctx.stroke();
    ctx.setLineDash([]);

    // Y-axis أسعار
    const yLevels = [0.15, 0.38, 0.62, 0.85].map(t => mn + t * rng);
    ctx.fillStyle  = C.smoke + 'bb';
    ctx.font       = '8px IBM Plex Mono,monospace';
    ctx.textAlign  = 'right';
    yLevels.forEach(v => {
      const y = pyC(v);
      const dec = rng < 2 ? 3 : rng < 10 ? 2 : 1;
      ctx.fillText(v.toFixed(dec), W - 2, y + 3);
    });

    // السعر الحالي badge
    const lastPrice = closes[n-1];
    const badgeCol  = lastUp ? C.mint : C.coral;
    ctx.fillStyle   = badgeCol;
    ctx.fillRect(W-padR, lastY-9, padR, 18);
    ctx.fillStyle  = C.ink;
    ctx.font       = 'bold 8px IBM Plex Mono,monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(lastPrice.toFixed(2), W-padR/2, lastY+3);

    // Volume bars
    const vy0 = HCHART + 2;
    vols.forEach((v, i) => {
      const up2 = bars[i].close >= bars[i].open;
      const x   = pxC(i, W);
      const bh  = (v / maxVol) * HVOL * 0.9;
      ctx.fillStyle = up2 ? C.mint + '55' : C.coral + '55';
      ctx.fillRect(x - cw/2, vy0 + HVOL - bh, cw, bh);
    });

    // X labels
    const count = Math.min(4, n);
    ctx.fillStyle  = C.smoke + 'aa';
    ctx.font       = '8px IBM Plex Mono,monospace';
    ctx.textAlign  = 'center';
    Array.from({length: count}, (_, j) => Math.round(j*(n-1)/(count-1||1))).forEach(idx => {
      const d = new Date(bars[idx].date);
      const lbl = `${d.getDate()}/${d.getMonth()+1}`;
      ctx.fillText(lbl, pxC(idx, W), HCHART + HVOL + 13);
    });
    ctx.textAlign = 'start';

  }, [bars, crosshair]);

  const onTouch = useCallback(e => {
    e.stopPropagation();
    if (!canvasRef.current || n === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const W    = canvasRef.current.offsetWidth || 360;
    const x    = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const frac = (x - padL) / (W - padL - padR);
    const idx  = Math.max(0, Math.min(n-1, Math.round(frac*(n-1))));
    const bar  = bars[idx];
    const cx   = padL + (n<=1?(W-padL-padR)/2:(idx/(n-1))*(W-padL-padR));
    const cy   = pyC(bar.close);
    setCrosshair({ idx, cx, cy, bar });
  }, [bars]);

  if (n === 0) return (
    <div style={{ height: 232, display:'flex', alignItems:'center', justifyContent:'center', color: C.smoke, fontSize: 13 }}>
      جارٍ تحميل الشارت...
    </div>
  );

  const ch = crosshair;
  const chBar = ch?.bar;

  return (
    <div style={{ background: C.ink, position:'relative', userSelect:'none', touchAction:'none' }}>
      {/* Crosshair tooltip */}
      {chBar && (
        <div style={{
          position:'absolute', top:6, left:'50%', transform:'translateX(-50%)',
          background:`${C.layer2}f0`, backdropFilter:'blur(8px)',
          border:`1px solid ${chBar.close>=chBar.open?C.mint+'55':C.coral+'55'}`,
          borderRadius:10, padding:'5px 12px',
          display:'flex', gap:10, alignItems:'center',
          pointerEvents:'none', whiteSpace:'nowrap', zIndex:10,
          boxShadow:'0 4px 20px rgba(0,0,0,.6)',
        }}>
          <div style={{ fontSize:10, color:C.smoke }}>{chBar.date}</div>
          <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:900, color:chBar.close>=chBar.open?C.mint:C.coral }}>{chBar.close.toFixed(2)}</div>
          <div style={{ fontSize:10, color:C.smoke }}>ح:{chBar.high.toFixed(2)} | د:{chBar.low.toFixed(2)}</div>
          <div style={{ fontSize:10, color:C.smoke }}>{fmtVol(chBar.volume)}</div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{ display:'block', width:'100%', height: HCHART + HVOL + 16, cursor:'crosshair' }}
        onMouseMove={onTouch}
        onMouseLeave={() => setCrosshair(null)}
        onTouchMove={onTouch}
        onTouchEnd={() => setCrosshair(null)}
      />
    </div>
  );
}

/* ── بطاقة معلومات ── */
function InfoRow({ label, value, color, even }) {
  return (
    <div style={{
      display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'9px 16px',
      background: even ? 'rgba(255,255,255,.02)' : 'transparent',
      borderBottom:`1px solid ${C.line}22`,
    }}>
      <span style={{ fontSize:12, color:C.smoke }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color: color || C.mist, fontFamily:'IBM Plex Mono,monospace' }}>{value}</span>
    </div>
  );
}

function SectionCard({ title, accent, children }) {
  return (
    <div style={{
      background:`linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`,
      borderRadius:16, border:`1px solid ${C.line}`,
      overflow:'hidden', marginBottom:10,
    }}>
      {title && (
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.line}44`, display:'flex', alignItems:'center', gap:8 }}>
          {accent && <div style={{ width:3, height:16, background:accent, borderRadius:2 }}/>}
          <span style={{ fontSize:13, fontWeight:800, color:C.snow }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

/* ── مكون السيولة ── */
function LiquidityBar({ inflow, outflow }) {
  const total = (inflow || 0) + Math.abs(outflow || 0);
  if (!total) return null;
  const inflowPct = Math.round((inflow / total) * 100);
  const outflowPct = 100 - inflowPct;
  return (
    <div style={{ padding:'12px 16px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:11, color:C.mint, fontWeight:700 }}>↑ دخول {fmtVal(inflow)}</span>
        <span style={{ fontSize:11, color:C.coral, fontWeight:700 }}>خروج {fmtVal(Math.abs(outflow))} ↓</span>
      </div>
      <div style={{ height:6, borderRadius:3, overflow:'hidden', display:'flex' }}>
        <div style={{ width:`${inflowPct}%`, background:C.mint, borderRadius:'3px 0 0 3px' }}/>
        <div style={{ width:`${outflowPct}%`, background:C.coral, borderRadius:'0 3px 3px 0' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:5 }}>
        <span style={{ fontSize:10, color:C.smoke }}>{inflowPct}% دخول</span>
        <span style={{ fontSize:10, color:C.smoke }}>{outflowPct}% خروج</span>
      </div>
    </div>
  );
}

/* ══ المكون الرئيسي ══ */
export default function StockDetail({ stk: stkProp, onClose, wl, toggleStar, onExpand }) {
  const { priceCache } = useStockState();
  const [quote,   setQuote]   = useState(null);
  const [bars,    setBars]    = useState([]);
  const [period,  setPeriod]  = useState('3M');
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');
  const abortRef = useRef(null);

  // دمج البيانات: priceCache → stkProp → STOCKS_MAP
  const cached  = priceCache[stkProp?.sym] || {};
  const seed    = STOCKS_MAP[stkProp?.sym] || {};
  const sym     = stkProp?.sym || '';
  const name    = seed.name || stkProp?.name || sym;
  const sec     = seed.sec  || stkProp?.sec  || '';

  const price   = cached.p   ?? quote?.price         ?? stkProp?.p   ?? 0;
  const ch      = cached.ch  ?? quote?.change         ?? stkProp?.ch  ?? 0;
  const pct     = cached.pct ?? quote?.change_percent ?? stkProp?.pct ?? 0;
  const isUp    = ch >= 0;
  const pc      = isUp ? C.mint : C.coral;

  // جلب بيانات السهم من sahmk
  useEffect(() => {
    if (!sym) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const fetchData = async () => {
      setLoading(true);
      try {
        // جلب السعر الحي
        const qRes = await fetch(`/api/sahmkdata?endpoint=quote&sym=${sym}`, { signal: ctrl.signal });
        const qJson = await qRes.json();
        if (qJson?.price) setQuote(qJson);
      } catch(e) {}
      setLoading(false);
    };

    fetchData();
    return () => ctrl.abort();
  }, [sym]);

  // جلب الشارت
  useEffect(() => {
    if (!sym) return;
    const ctrl = new AbortController();

    const fetchChart = async () => {
      setBars([]);
      try {
        const r = await fetch(`/api/sahmkdata?endpoint=ohlcv&sym=${sym}&period=${period}`, { signal: ctrl.signal });
        const j = await r.json();
        if (j?.data?.length > 0) {
          setBars(j.data.map(b => ({
            date:   b.date,
            open:   b.open,
            high:   b.high,
            low:    b.low,
            close:  b.close,
            volume: b.volume,
          })));
        }
      } catch(e) {}
    };

    fetchChart();
    return () => ctrl.abort();
  }, [sym, period]);

  // بيانات السعر الحي
  const liveQuote = quote || {};
  const open      = liveQuote.open          ?? stkProp?.o   ?? 0;
  const high      = liveQuote.high          ?? stkProp?.hi  ?? 0;
  const low       = liveQuote.low           ?? stkProp?.lo  ?? 0;
  const prev      = liveQuote.previous_close ?? 0;
  const volume    = liveQuote.volume        ?? cached.v     ?? stkProp?.v  ?? 0;
  const value     = liveQuote.value         ?? 0;
  const bid       = liveQuote.bid           ?? 0;
  const ask       = liveQuote.ask           ?? 0;
  const liq       = liveQuote.liquidity     ?? null;

  // نطاق 52 أسبوع من الشارت
  const hi52 = bars.length > 0 ? Math.max(...bars.map(b => b.high))  : null;
  const lo52 = bars.length > 0 ? Math.min(...bars.map(b => b.low))   : null;

  const PERIODS = ['1M','3M','6M','1Y'];
  const TABS    = [
    { id:'overview', label:'نظرة عامة' },
    { id:'liquidity', label:'السيولة' },
    { id:'chart',    label:'الشارت' },
  ];

  const isStarred = wl?.includes(sym);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:C.ink, overflowY:'auto',
      fontFamily:"'Cairo','Segoe UI',sans-serif",
      direction:'rtl', color:C.snow,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0}
        .mono{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}
      `}</style>

      {/* هيدر */}
      <div style={{
        position:'sticky', top:0, zIndex:50,
        background:`${C.void}f8`, backdropFilter:'blur(12px)',
        borderBottom:`1px solid ${C.line}`,
        padding:'env(safe-area-inset-top, 0px) 16px 0',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0 8px' }}>
          {/* زر الإغلاق */}
          <button onClick={onClose} style={{
            width:40, height:40, borderRadius:12,
            background:`${C.layer2}`, border:`1px solid ${C.line}`,
            color:C.smoke, fontSize:18, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>←</button>

          {/* اسم السهم */}
          <div style={{ textAlign:'center', flex:1, margin:'0 12px' }}>
            <div style={{ fontSize:16, fontWeight:900, color:C.snow }}>{name}</div>
            <div style={{ fontSize:12, color:C.ash }}>{sym} · {sec}</div>
          </div>

          {/* زر المفضلة */}
          <button onClick={() => toggleStar?.(sym)} style={{
            width:40, height:40, borderRadius:12,
            background: isStarred ? `${C.gold}22` : C.layer2,
            border:`1px solid ${isStarred ? C.gold+'55' : C.line}`,
            color: isStarred ? C.gold : C.smoke,
            fontSize:18, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>★</button>
        </div>

        {/* السعر الرئيسي */}
        <div style={{ padding:'4px 0 12px', display:'flex', alignItems:'baseline', gap:12 }}>
          <div className="mono" style={{ fontSize:32, fontWeight:900, color:C.snow }}>{fmt(price)}</div>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:6,
            background: pc + '18', border:`1px solid ${pc}33`,
            borderRadius:8, padding:'4px 10px',
          }}>
            <span className="mono" style={{ fontSize:14, fontWeight:800, color:pc }}>
              {isUp?'+':''}{fmt(ch)}
            </span>
            <span style={{ fontSize:11, color:pc, opacity:.6 }}>·</span>
            <span className="mono" style={{ fontSize:13, fontWeight:700, color:pc }}>
              {isUp?'+':''}{fmt(pct)}%
            </span>
          </div>
        </div>

        {/* تبويبات */}
        <div style={{ display:'flex', gap:4, paddingBottom:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex:1, padding:'8px 4px',
              background:'transparent',
              border:'none', borderBottom:`2px solid ${tab===t.id ? C.electric : 'transparent'}`,
              color: tab===t.id ? C.electric : C.smoke,
              fontSize:12, fontWeight:700, cursor:'pointer',
              fontFamily:"Cairo,sans-serif",
              transition:'all .15s',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* المحتوى */}
      <div style={{ padding:'10px 16px 80px' }}>

        {/* ── تبويب نظرة عامة ── */}
        {tab === 'overview' && (
          <>
            {/* بيانات اليوم */}
            <SectionCard title="بيانات اليوم" accent={C.electric}>
              <InfoRow label="الافتتاح"       value={fmt(open)}   even={false} />
              <InfoRow label="أعلى"            value={fmt(high)}   color={C.mint}  even={true} />
              <InfoRow label="أدنى"            value={fmt(low)}    color={C.coral} even={false} />
              <InfoRow label="الإغلاق السابق" value={fmt(prev)}   even={true} />
              <InfoRow label="Bid / Ask"       value={`${fmt(bid)} / ${fmt(ask)}`} even={false} />
              <InfoRow label="الحجم"           value={fmtVol(volume)} even={true} />
              <InfoRow label="القيمة المتداولة" value={fmtVal(value)} even={false} />
            </SectionCard>

            {/* النطاق السعري */}
            {(hi52 || lo52) && (
              <SectionCard title={`النطاق — ${period}`} accent={C.gold}>
                <div style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:12, color:C.coral }}>أدنى: {fmt(lo52)}</span>
                    <span style={{ fontSize:12, color:C.mint }}>أعلى: {fmt(hi52)}</span>
                  </div>
                  <div style={{ height:6, background:C.layer3, borderRadius:3, overflow:'hidden' }}>
                    <div style={{
                      height:'100%',
                      marginRight: `${((price-lo52)/(hi52-lo52||1)*100)}%`,
                      marginLeft: `${(1-(price-lo52)/(hi52-lo52||1))*100}%`,
                      background: C.gold,
                      minWidth:4, borderRadius:3,
                    }}/>
                  </div>
                  <div style={{ textAlign:'center', marginTop:6, fontSize:11, color:C.smoke }}>
                    السعر الحالي: <span className="mono" style={{ color:C.gold }}>{fmt(price)}</span>
                  </div>
                </div>
                <InfoRow label={`أدنى (${period})`} value={fmt(lo52)} color={C.coral} even={false} />
                <InfoRow label={`أعلى (${period})`} value={fmt(hi52)} color={C.mint}  even={true}  />
                <InfoRow label="التغير عن الأدنى"  value={lo52 ? `+${((price/lo52-1)*100).toFixed(1)}%` : '—'} color={C.mint} even={false} />
                <InfoRow label="التغير عن الأعلى"  value={hi52 ? `${((price/hi52-1)*100).toFixed(1)}%` : '—'} color={C.coral} even={true}  />
              </SectionCard>
            )}

            {/* وقت التحديث */}
            {liveQuote.updated_at && (
              <div style={{ textAlign:'center', padding:'8px', fontSize:10, color:C.ash }}>
                آخر تحديث: {new Date(liveQuote.updated_at).toLocaleTimeString('ar-SA')}
                {liveQuote.is_delayed && ' · متأخر 15 دقيقة'}
              </div>
            )}
          </>
        )}

        {/* ── تبويب السيولة ── */}
        {tab === 'liquidity' && (
          <>
            {liq ? (
              <>
                <SectionCard title="تدفق السيولة" accent={C.teal}>
                  <LiquidityBar inflow={liq.inflow_value} outflow={liq.outflow_value} />
                  <InfoRow label="قيمة الدخول"   value={fmtVal(liq.inflow_value)}  color={C.mint}  even={false} />
                  <InfoRow label="حجم الدخول"    value={fmtVol(liq.inflow_volume)} color={C.mint}  even={true}  />
                  <InfoRow label="صفقات الدخول"  value={liq.inflow_trades?.toLocaleString() || '—'} color={C.mint} even={false} />
                  <InfoRow label="قيمة الخروج"   value={fmtVal(liq.outflow_value)}  color={C.coral} even={true}  />
                  <InfoRow label="حجم الخروج"    value={fmtVol(liq.outflow_volume)} color={C.coral} even={false} />
                  <InfoRow label="صفقات الخروج"  value={liq.outflow_trades?.toLocaleString() || '—'} color={C.coral} even={true} />
                  <InfoRow
                    label="صافي السيولة"
                    value={fmtVal(Math.abs(liq.net_value))}
                    color={liq.net_value >= 0 ? C.mint : C.coral}
                    even={false}
                  />
                </SectionCard>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'40px 20px', color:C.smoke, fontSize:13 }}>
                {loading ? 'جارٍ تحميل بيانات السيولة...' : 'لا تتوفر بيانات السيولة'}
              </div>
            )}
          </>
        )}

        {/* ── تبويب الشارت ── */}
        {tab === 'chart' && (
          <>
            {/* أزرار الفترات */}
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  flex:1, padding:'8px 4px',
                  borderRadius:8, cursor:'pointer',
                  fontFamily:"Cairo,sans-serif", fontSize:12, fontWeight:700,
                  background: period===p ? `${C.electric}22` : 'transparent',
                  border:`1px solid ${period===p ? C.electric+'66' : C.line}`,
                  color: period===p ? C.electric : C.smoke,
                  transition:'all .15s',
                }}>{p}</button>
              ))}
            </div>

            <SectionCard accent={C.plasma}>
              {bars.length > 0 ? (
                <CandleChart bars={bars} stk={{ price, prev }} />
              ) : (
                <div style={{ height:232, display:'flex', alignItems:'center', justifyContent:'center', color:C.smoke, fontSize:13 }}>
                  {loading ? 'جارٍ تحميل الشارت...' : 'لا تتوفر بيانات الشارت'}
                </div>
              )}
            </SectionCard>

            {/* إحصائيات الشارت */}
            {bars.length > 0 && (() => {
              const last = bars[bars.length-1];
              const first = bars[0];
              const totalReturn = ((last.close - first.close) / first.close * 100).toFixed(2);
              const avgVol = Math.round(bars.reduce((s,b) => s+b.volume, 0) / bars.length);
              const volatility = (() => {
                const returns = bars.slice(1).map((b,i) => Math.log(b.close/bars[i].close));
                const mean = returns.reduce((s,r) => s+r, 0) / returns.length;
                const variance = returns.reduce((s,r) => s+Math.pow(r-mean,2), 0) / returns.length;
                return (Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1);
              })();
              return (
                <SectionCard title={`إحصائيات ${period}`} accent={C.gold}>
                  <InfoRow label="العائد الإجمالي" value={`${totalReturn > 0 ? '+' : ''}${totalReturn}%`} color={totalReturn > 0 ? C.mint : C.coral} even={false} />
                  <InfoRow label="أعلى سعر"         value={fmt(hi52)}    color={C.mint}  even={true}  />
                  <InfoRow label="أدنى سعر"         value={fmt(lo52)}    color={C.coral} even={false} />
                  <InfoRow label="متوسط الحجم"      value={fmtVol(avgVol)}              even={true}  />
                  <InfoRow label="التقلبية السنوية"  value={`${volatility}%`}            even={false} />
                  <InfoRow label="عدد الجلسات"       value={`${bars.length} يوم`}        even={true}  />
                </SectionCard>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
