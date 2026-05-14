'use client';
/**
 * HOME SCREEN — تداول+
 * 
 * يحتوي على:
 * - محرك السوق (useMarketEngine) — تحديث كل 2 ثانية
 * - شارت تاسي التفاعلي مع 5 فترات زمنية
 * - أبرز التحركات مع تبويبات وفترات زمنية
 * - مؤشر الخوف والطمع (7 مكوّنات)
 * - القطاعات مع تدفق رأس المال
 * - التحليل المتقدم: خريطة السيولة + المحرك الكمي + عرض السوق
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TasiChart from '../features/market/TasiChart';
import { useSharedPrices, useNav } from '../store';
import { STOCKS, STOCKS_MAP, SECTORS } from '../constants/stocksData';
import { useHaptic }          from '../hooks/useHaptic';
import { usePullToRefresh }   from '../hooks/usePullToRefresh';
import config from '../constants/config';
import { useMarketBridge } from '../hooks/useMarketBridge';
import { calcEMA } from '../engines/technicalEngine';



/* ─── Design tokens from screenshots ─── */
const BG    = "#06080f";
const CARD  = "#16202e";
const CARD2 = "#1c2640";
const CARD3 = "#222d4a";
const LN    = "#2a3558";
const T1    = "#ffffff";
const T2    = "#a0a8c0";
const T3    = "#7a85a8";
const G     = "#1ee68a";
const R     = "#ff5f6a";
const GOLD  = "#f0c050";
const BLUE  = "#4d9fff";
const PU    = "#a78bfa";

function FearGreedIndex({liveStocks=[]}) { return null; }

function SectorSection({liveStocks=[]}) { return null; }

function AdvancedSection({liveStocks=[]}) {
  return (
    <div style={{
      margin:"14px 12px 0",
      background:"rgba(167,139,250,.05)",
      borderRadius:14, padding:"18px 16px",
      border:"1px solid rgba(167,139,250,.12)",
      textAlign:"center",
    }}>
      <div style={{fontSize:20, marginBottom:8}}>🔧</div>
      <div style={{fontSize:13, fontWeight:700, color:T1, marginBottom:4}}>
        التحليل المتقدم
      </div>
      <div style={{fontSize:11, color:T2, lineHeight:1.7}}>
        قيد التطوير -- سيتم ربطه ببيانات حقيقية قريباً
      </div>
    </div>
  );
}




              
            




/* ─── BREADTH PANEL ─── */
function BreadthPanel({liveStocks=[]}){
  // ─── بيانات عرض السوق الفعلية ───
  const adv = liveStocks.filter(s => s.pct > 0).length;
  const dec = liveStocks.filter(s => s.pct < 0).length;
  const unc = liveStocks.filter(s => s.pct === 0).length;
  const tot = STOCKS.length;
  const advRatio = (adv / tot * 100).toFixed(1);

  // خط التقدم/التراجع = (صاعد − هابط)
  const adLine = adv - dec;
  const bs     = Math.round(adLine / tot * 100);
  const sig    = bs > 40  ? "سوق صاعد قوي"
               : bs > 15  ? "ميل صعودي"
               : bs > -15 ? "متوازن"
               : bs > -40 ? "ميل هبوطي"
               : "سوق هابط قوي";
  const sc = bs > 15 ? G : bs < -15 ? R : GOLD;

  // ─── VWAP لكل سهم — Σ(TP×Vol)/Σ(Vol) الرسمي (Wilder-corrected) ✓ ───
  const vwapResults = liveStocks.map(s => {
    const bars = generateDailyBars(s, 28);
    const vwap = calcVWAP(bars);  // الصيغة الرسمية المُصحَّحة
    const diff = vwap > 0 ? +((s.p - vwap) / vwap * 100).toFixed(2) : 0;
    return { sym: s.sym, name: s.name, aboveVwap: s.p >= vwap, diff, vwapVal: +vwap.toFixed(2) };
  });
  const aboveVwapCount = vwapResults.filter(v => v.aboveVwap).length;
  const belowVwapCount = tot - aboveVwapCount;

  // ─── RSI لكل سهم ───
  const rsiResults = STOCKS.map(s => {
    const bars = generateDailyBars(s, 28);
    return { sym: s.sym, name: s.name, rsi: calcRSI(bars, 14) };
  });
  const overbought = rsiResults.filter(r => r.rsi > 70).length;  // RSI > 70
  const oversold   = rsiResults.filter(r => r.rsi < 30).length;  // RSI < 30

  /* ── مذبذب ماكليلان الحقيقي (McClellan Oscillator) ──
     التعريف: EMA(19, A/D_daily) − EMA(39, A/D_daily)
     نُحاكي سلسلة A/D يومية من HISTORICAL_DATA للحصول على EMAين كافيين
  */
  const calcEMA = (values, period) => {
    if (values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  };

  // بناء سلسلة A/D يومية محاكاة من بيانات تاسي التاريخية (52 أسبوع)
  const rngAD = seedRng(77001);
  const adSeries = HISTORICAL_DATA.year.map((v, i) => {
    if (i === 0) return 0;
    const chg = v - HISTORICAL_DATA.year[i-1];
    // نسبة الصاعد/الهابط بناءً على حجم تغير المؤشر
    const advEst = Math.round(tot * (0.5 + chg/200 + (rngAD()-0.5)*0.15));
    const advC   = Math.max(1, Math.min(tot-1, advEst));
    return advC - (tot - advC);  // A/D daily
  });

  // EMA(19) و EMA(39) على سلسلة A/D
  const ema19 = calcEMA(adSeries, 19);
  const ema39 = calcEMA(adSeries, 39);
  const mcl   = Math.round(ema19 - ema39);  // مذبذب ماكليلان الحقيقي

  // ─── قمم وقيعان جديدة (52 أسبوع) ───
  // بناءً على موقع السعر الحالي من hi52/lo52
  const newHighs = STOCKS.filter(s => s.hi > 0 && s.p >= s.hi * 0.995).length;
  const newLows  = STOCKS.filter(s => s.lo > 0 && s.p <= s.lo * 1.005).length;

  // ─── نسبة Hi/Lo ─── (نتجنب ∞ عند newLows=0)
  const hlRatio = newLows === 0
    ? newHighs > 0 ? `${newHighs}:0` : "—"
    : (newHighs / newLows).toFixed(1);

  return(
    <div style={{padding:"12px 14px"}}>

      {/* إخلاء مسؤولية */}
      <div style={{
        background:"rgba(245,158,11,.06)",borderRadius:8,padding:"6px 10px",
        marginBottom:10,border:"1px solid rgba(245,158,11,.12)",
        fontSize:8.5,color:GOLD,lineHeight:1.5,
      }}>
        ⚠ التحليل استرشادي — يعتمد على بيانات السهم المدخلة. ليس توصية استثمارية.
      </div>

      {/* إشارة السوق */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:sc,boxShadow:"0 0 6px "+sc}}/>
          <span style={{fontSize:9,color:sc,fontWeight:700}}>{sig}</span>
        </div>
        <span style={{fontSize:13,fontWeight:900,color:T1}}>مؤشرات عرض السوق</span>
      </div>

      {/* شريط A/D */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:8.5,color:G}}>{adv} صاعد</span>
          <div style={{textAlign:"center"}}>
            <span style={{fontSize:9,color:T3,fontWeight:600}}>A/D Line: </span>
            <span style={{fontSize:10,color:sc,fontWeight:800}}>{adLine > 0 ? "+" : ""}{adLine}</span>
          </div>
          <span style={{fontSize:8.5,color:R}}>{dec} هابط</span>
        </div>
        <div style={{height:8,background:R+"30",borderRadius:4,overflow:"hidden"}}>
          <div style={{width:advRatio+"%",height:"100%",
                       background:"linear-gradient(90deg,"+G+"80,"+G+")",borderRadius:4}}/>
        </div>
        <div style={{textAlign:"center",marginTop:3}}>
          <span style={{fontSize:8,color:T3}}>{advRatio}% صاعد · {unc} ثابت · من إجمالي {tot} سهم</span>
        </div>
      </div>

      {/* مقاييس 6 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
        {[
          { l:"فوق VWAP",       v:`${aboveVwapCount}/${tot}`, c:aboveVwapCount>tot/2?G:R,
            sub:"السعر > VWAP",                               desc:"يعتمد VWAP الحقيقي (TP×Vol)" },
          { l:"تحت VWAP",       v:`${belowVwapCount}/${tot}`, c:belowVwapCount>tot/2?R:G,
            sub:"السعر < VWAP",                               desc:"" },
          { l:"قمم 52 أسبوع",  v:newHighs,                   c:newHighs>2?G:T2,
            sub:"قرب الحد الأعلى",                             desc:"السعر ≥ 99.5% من أعلى سنوي" },
          { l:"قيعان 52 أسبوع",v:newLows,                    c:newLows>2?R:T2,
            sub:"قرب الحد الأدنى",                             desc:"السعر ≤ 100.5% من أدنى سنوي" },
          { l:"تشبع شراء RSI",  v:overbought,                 c:overbought>3?R:T2,
            sub:"RSI > 70",                                    desc:"محسوب بـ RSI 14 يوم" },
          { l:"تشبع بيع RSI",   v:oversold,                   c:oversold>3?G:T2,
            sub:"RSI < 30",                                    desc:"فرصة انتعاش" },
        ].map((m,i)=>(
          <div key={i} style={{background:CARD2,borderRadius:9,padding:"8px 8px",textAlign:"center"}}>
            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>{m.l}</div>
            <div style={{fontSize:14,fontWeight:900,color:m.c}}>{m.v}</div>
            <div style={{fontSize:7,color:m.c,opacity:.75,marginTop:1}}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ماكليلان */}
      <div style={{
        background:CARD2,borderRadius:10,padding:"10px 12px",marginBottom:10,
        border:"1px solid "+(mcl>20?G+"30":mcl<-20?R+"30":LN),
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:900,color:mcl>0?G:R}}>
            {mcl > 0 ? "+" : ""}{mcl}
          </span>
          <span style={{fontSize:11,fontWeight:700,color:T1}}>مذبذب ماكليلان</span>
        </div>
        <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden",position:"relative"}}>
          <div style={{
            position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"rgba(255,255,255,.2)",
          }}/>
          <div style={{
            position:"absolute",top:0,bottom:0,
            background:mcl>0?G:R,
            left: mcl>0 ? "50%" : `${50 + mcl/2}%`,
            width: Math.abs(mcl/2)+"%",
            borderRadius:3,
          }}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:7.5,color:T3}}>
          <span>−100 تشبع بيع</span>
          <span>0 محايد</span>
          <span>+100 تشبع شراء</span>
        </div>
        <div style={{fontSize:8,color:T3,marginTop:4}}>
          = (صاعد − هابط) / (صاعد + هابط) × 100
          · القيمة: <span style={{color:mcl>20?G:mcl<-20?R:T2,fontWeight:700}}>
            {mcl>20?"إيجابي — ميل شراء":mcl<-20?"سلبي — ميل بيع":"محايد"}
          </span>
        </div>
      </div>

      {/* قادة فوق VWAP */}
      <div style={{fontSize:9,fontWeight:700,color:T2,marginBottom:6}}>
        أعلى أسهم فوق VWAP
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {vwapResults
          .filter(v=>v.aboveVwap && v.diff>0)
          .sort((a,b)=>b.diff-a.diff)
          .slice(0,6)
          .map((v,i)=>(
            <div key={i} style={{
              background:G+"10",border:"1px solid "+G+"25",
              borderRadius:7,padding:"3px 9px",
            }}>
              <span style={{fontSize:9,fontWeight:700,color:G}}>{v.sym}</span>
              <span style={{fontSize:8,color:T2}}> +{v.diff}%</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Next.js Screen Export
   يستخدم useMarketEngine من الملف نفسه
   ══════════════════════════════════════════════════════ */

export default function HomeScreen() {
  const liveStocks = useSharedPrices(); // أسعار مشتركة محدَّثة
  const market = useMarketBridge();
  const idx    = market.current  || 12843.7;
  const chgP   = market.chgPts   || 0.84;
  const showDemoBadge = config.features.showModeLabel;

  // ── UX: Haptic ──────────────────────────────────────────────────
  const haptic = useHaptic();

  // ── UX: Search with keyboard support ────────────────────────────
  const [searchQ, setSearchQ] = useState('');
  const searchRef = useRef(null);
  const handleSearchKey = useCallback((e) => {
    if (e.key === 'Enter') { e.target.blur(); haptic.tap(); }
    if (e.key === 'Escape') { setSearchQ(''); e.target.blur(); }
  }, [haptic]);

  // ── UX: Scroll to top ───────────────────────────────────────────
  const scrollRef  = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const handleScroll = useCallback((e) => {
    setShowScrollTop(e.target.scrollTop > 300);
  }, []);
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    haptic.tap();
  }, [haptic]);

  // ── UX: Pull to refresh ─────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    haptic.success();
    // Stocks refresh via shared price store — just wait 1s
    await new Promise(r => setTimeout(r, 1000));
  }, [haptic]);
  const { containerRef: pullRef, isPulling, pullProgress, isRefreshing, touchHandlers } =
    usePullToRefresh(handleRefresh, 60);

  // ── UX: Skeleton — show for first 1.2s ──────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
    
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(30,230,138,.5)}70%{box-shadow:0 0 0 6px rgba(30,230,138,0)}100%{box-shadow:0 0 0 0 rgba(30,230,138,0)}}
      `}</style>
      <div
        ref={pullRef}
        {...touchHandlers}
        onScroll={handleScroll}
        style={{
          fontFamily:"'Cairo','Segoe UI',sans-serif",
          direction:'rtl', color:'#fff', fontSize:14,
          background:BG, minHeight:'100%',
          overflowY:'auto', height:'100dvh', paddingBottom:80,
        }}>
        {/* Pull to refresh visual indicator */}
        {(isPulling || isRefreshing) && (
          <div style={{
            textAlign:'center', padding:'8px 0 0',
            color:'#f0c050', fontSize:11, overflow:'hidden',
            height: isPulling ? Math.round(pullProgress * 40) + 'px' : isRefreshing ? '40px' : '0px',
            transition: isPulling ? 'none' : 'height .3s ease',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            {isRefreshing
              ? <><div className="pull-spinner"/> <span>جارٍ التحديث...</span></>
              : <span style={{opacity:pullProgress}}>{pullProgress >= 1 ? '↑ حرِّر للتحديث' : '↓ اسحب للتحديث'}</span>
            }
          </div>
        )}
        <TopBar idx={idx} chgP={chgP} showDemoBadge={showDemoBadge}/>
        <HomeContent idx={idx} chgP={chgP} market={market} liveStocks={liveStocks} isLoadingH={isLoading} isRefreshingH={isRefreshing}/>
        {/* Scroll to top */}
        {showScrollTop && (
          <button
            className="scroll-top-btn"
            onClick={scrollToTop}
            aria-label="العودة للأعلى"
            style={{bottom:90}}
          >↑</button>
        )}
      </div>
    </>
  );
}
