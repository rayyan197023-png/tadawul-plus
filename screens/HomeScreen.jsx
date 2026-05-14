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

/* ─── TOP BAR ─── */
function TopBar({idx, chgP}) {
  return (
    <div style={{
      padding:"12px 14px 10px", display:"flex", alignItems:"center",
      justifyContent:"space-between", background:BG,
      position:"sticky", top:0, zIndex:50,
      borderBottom:"1px solid rgba(255,255,255,.05)",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        <div style={{
          width:38, height:38, background:GOLD, borderRadius:10,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 10px rgba(245,158,11,.35)",
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
            <polyline points="4,16 8,10 12,13 17,7 20,9"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:15, fontWeight:900, color:T1, lineHeight:1}}>
            <span style={{color:GOLD}}>+</span>تداول
          </div>
          <div style={{fontSize:8, color:T3, letterSpacing:"1.3px", marginTop:1}}>SAUDI MARKET</div>
        </div>
      </div>
      <div style={{
        background:CARD2, borderRadius:22, padding:"6px 15px",
        display:"flex", alignItems:"center", gap:7,
        border:"1px solid rgba(255,255,255,.07)",
      }}>
        <div style={{width:7, height:7, borderRadius:"50%", background:GOLD, animation:"blink 2s infinite"}}/>
        <span style={{fontSize:13, fontWeight:800, color:T1, letterSpacing:"-.3px", direction:"ltr"}}>
          {idx ? idx.toLocaleString("en-US", {minimumFractionDigits:2}) : "--"}
        </span>
        <span style={{fontSize:12, color:chgP>=0?G:R, fontWeight:700}}>
          {chgP>=0?"+":""}{chgP}%
        </span>
      </div>
    </div>
  );
}

/* ─── STOCK ROW ─── */
const StockRow = React.memo(function StockRow({s, rank, period}) {
  const { openStock } = useNav();
  const up = s.pct >= 0;
  return (
    <div onClick={() => openStock(s)} style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"11px 0", borderBottom:"1px solid rgba(255,255,255,.04)", cursor:"pointer",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0}}>
        <div style={{
          width:42, height:42, borderRadius:10, flexShrink:0,
          background:CARD2, border:"1px solid rgba(255,255,255,.07)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        }}>
          <span style={{fontSize:9, fontWeight:900, color:"#d1d5db"}}>{s.sym}</span>
          <span style={{fontSize:8, color:T3, marginTop:1}}>{rank}</span>
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13, fontWeight:700, color:T1, whiteSpace:"nowrap",
                       overflow:"hidden", textOverflow:"ellipsis"}}>{s.name}</div>
          <div style={{fontSize:10, color:T3}}>{s.sec}</div>
        </div>
      </div>
      <div style={{textAlign:"left", flexShrink:0}}>
        <div style={{fontSize:15, fontWeight:800, color:T1}}>{s.p?.toFixed(2)}</div>
        <div style={{
          fontSize:11, fontWeight:700, color:up?G:R,
          background:up?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
          padding:"2px 8px", borderRadius:6, marginTop:2,
          display:"inline-block",
          border:`1px solid ${up?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`,
        }}>{up?"+":""}{s.pct?.toFixed(2)}%</div>
      </div>
    </div>
  );
});

/* ─── HOME CONTENT ─── */
function HomeContent({idx, chgP, market, liveStocks=[], isLoadingH=false, isRefreshingH=false}) {
  const [stTab, setStTab] = useState(0);
  const [sortBy, setSortBy] = useState("pct");

  const byUp  = [...liveStocks].sort((a,b) => b.pct - a.pct);
  const byDn  = [...liveStocks].sort((a,b) => a.pct - b.pct);
  const byVol = [...liveStocks].sort((a,b) => b.v - a.v);
  const lists = [byUp, byDn, byVol];

  return (
    <div style={{paddingBottom:30, animation:"fadeUp .28s ease both"}}>
      <TasiChart market={market}/>

      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                   padding:"14px 14px 10px"}}>
        <div style={{display:"flex", alignItems:"center", gap:6}}>
          <div style={{width:3, height:20, background:GOLD, borderRadius:2}}/>
          <span style={{fontSize:16, fontWeight:800, color:T1}}>أبرز التحركات</span>
        </div>
      </div>

      <div style={{padding:"0 12px", marginBottom:2}}>
        <div style={{display:"flex", borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          {["الأكثر ارتفاعاً","الأكثر انخفاضاً","الأكثر نشاطاً"].map((t,i) => (
            <button key={i} onClick={() => setStTab(i)} style={{
              flex:1, padding:"8px 2px", background:"none", border:"none", cursor:"pointer",
              fontFamily:"Cairo,sans-serif", fontSize:11, fontWeight:600,
              color:stTab===i?T1:T3,
              borderBottom:stTab===i?"2px solid "+GOLD:"2px solid transparent",
              marginBottom:-1,
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"0 12px"}}>
        {isLoadingH
          ? Array.from({length:6}).map((_,i) => (
              <div key={i} style={{
                height:64, marginBottom:8, borderRadius:12,
                background:"linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)",
                backgroundSize:"200% 100%", animation:"shimmer 1.4s ease infinite",
                animationDelay: i * 0.1 + "s",
              }}/>
            ))
          : lists[stTab].slice(0,8).map((s,i) => (
              <StockRow key={s.sym} s={s} rank={i+1} period="يومي"/>
            ))
        }
      </div>

      <SectorSection liveStocks={liveStocks}/>
      <FearGreedIndex liveStocks={liveStocks}/>
      <AdvancedSection liveStocks={liveStocks}/>
    </div>
  );
}

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
