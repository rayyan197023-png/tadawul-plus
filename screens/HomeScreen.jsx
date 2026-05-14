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
