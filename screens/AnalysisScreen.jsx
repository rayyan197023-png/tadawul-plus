'use client';
/**
 * @module screens/AnalysisScreen
 * @description لوحة التحليل الاحترافي — تداول+
 *
 * بعد إعادة الهيكلة: هذا الملف يحتوي فقط على:
 * - المكوّن الرئيسي AnalysisScreen
 * - state management الخاص بالشاشة
 * - منطق العرض والتفاعل
 *
 * المحركات الحسابية → src/engines/analysisEngine.js
 * مكونات UI المساعدة → src/components/analysis/AnalysisHelpers.jsx
 */ 
 
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import { useNav, useSharedPrices, useMarket } from '../store';
import { useOHLCVCache } from '../hooks/useOHLCVCache';

// ── المحركات الحسابية
import {
  stockHealth, scoreWord, calc9Layers,
  MACRO, HISTORICAL, OIL_SENS, RATE_SENS,
  TASI_CORR_GROUPS, KELLY_CONFIG, RISK_GATE,
  applyFeedbackToWeights, loadFeedbackState,
  saveFeedbackState, getAdaptiveWeightAdjustment,
  _emptyHealthResult,
} from '../engines/analysisEngine';
import { calcSmartStopLoss, calcSmartTakeProfit } from '../engines/positionEngine'; 

// ── مكونات UI المساعدة
import {
  ParticleCanvas, ArcRing, KPIChip, MiniChart, StoryChart,
  Icon, SignalsPanel, BreadthTooltip, CorrelationMatrix, LayerIcon,
  C, getKsaMarket,
} from '../components/analysis/AnalysisHelpers';

import { savePredictions, evaluatePredictions } from '../engines/predictionTracker';
import Tooltip from '../components/Tooltip';
import ErrorBoundary from '../components/ErrorBoundary';
import FullAnalysisModal from '../components/analysis/FullAnalysisModal';
import { ANALYSIS_CSS } from '../components/analysis/analysisStyles';
import SignalsPage from '../components/analysis/SignalsPage';
import MarketOverviewCard from '../components/analysis/MarketOverviewCard';
import StockCard from '../components/analysis/StockCard';
import { shareStockCard } from '../utils/shareStockCard';
import { useHaptic } from '../hooks/useHaptic';



function AnalysisScreenInner({ commData: extCommData } = {}) {
  const liveStocks = useSharedPrices(); // أسعار مشتركة محدَّثة
    const market = useMarket();
    const haptic = useHaptic();

  // ── جلب بيانات FRED الحية (نفط WTI + VIX) مرة واحدة عند التحميل ──
  const [fredMacro, setFredMacro] = useState(null);
  useEffect(function(){
    fetch('/api/freddata').then(function(r){return r.ok?r.json():null;}).then(function(d){
      if(d && (typeof d.oilPrice==='number' || typeof d.vix==='number')) setFredMacro(d);
    }).catch(function(){});
  },[]);

  
  // ── تحديث MACRO من الأسعار الحية (commData من AppShell) ──────────
  // هذا يجعل محرك 9 الطبقات يعمل بأسعار نفط/ذهب/دولار حقيقية
  const liveMACRO = React.useMemo(function() {
    // الأساس: MACRO + قيم FRED (نفط/VIX حقيقية) إن توفّرت
    var base = Object.assign({}, MACRO);
    if (fredMacro) {
      if (typeof fredMacro.oilPrice === 'number' && fredMacro.oilPrice > 0) base.oilPrice = fredMacro.oilPrice;
      if (typeof fredMacro.vix === 'number' && fredMacro.vix > 0) base.vix = fredMacro.vix;
    }

    // ✨ Safety check شامل -- إن لا سلع، نُرجع base (مع FRED مطبّقاً)
    if (!extCommData || !Array.isArray(extCommData) || !extCommData.length) return base;
    
    var oil   = extCommData.find(function(c){return c && (c.sym==='خام برنت'||c.sym==='خام WTI');});
    var gold  = extCommData.find(function(c){return c && c.sym==='الذهب';});
    var dxy   = extCommData.find(function(c){return c && c.sym==='الدولار';});
    var sp    = extCommData.find(function(c){return c && c.sym==='S&P 500';});
    
    return Object.assign(base, {
      oilPrice:  (oil && oil.price)  || base.oilPrice,
      goldPrice: (gold && gold.price) || (base.goldPrice||2900),
      dxy:       (dxy && dxy.price)  || (base.dxy||103),
      spx:       (sp && sp.price)    || (base.spx||5500),
    });
  }, [extCommData, fredMacro])

  const { openStock } = useNav();
  const [page,        setPage]        = useState("home");
  const [sel,         setSel]         = useState(null);
  const [tab,         setTab]         = useState("all");
  const [anim,        setAnim]        = useState(false);
  const [fullAnalysis,setFullAnalysis]= useState(null);
  const [cardExpanded,setCardExpanded]= useState(false);
  const [rareAlert,   setRareAlert]   = useState(null);
  const [liveTime,    setLiveTime]    = useState(new Date());
  const [discovered,  setDiscovered]  = useState([]);
  const [cardLevel,   setCardLevel]   = useState({});
  const [flashCard,   setFlashCard]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [darkMode,    setDarkMode]    = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
  // ── محفظة المستخدم ──
const [screenerOpen, setScreenerOpen] = useState(false);
const [filters, setFilters] = useState({
  minScore:0, maxScore:100,
  sig:'all',
  sector:'all',
  minPE:0, maxPE:200,
  minDivY:0,
  minROE:0,
  minUpside:-100,
  regime:'all',
  gatesAll:false,
});


  useEffect(()=>{
    setAnim(true);
    // محاكاة وقت التحليل
    const t = setTimeout(function(){ setLoading(false); }, 800);
    return function(){ clearTimeout(t); };
  },[]);


  // عداد ثانية للساعة الحية فقط
  useEffect(()=>{
    // ✨ تحديث كل ثانية للعداد، لكن liveTime كل 30 ثانية
    const t = setInterval(function(){ 
      setLiveTime(new Date());
    }, 30000);

    return function(){ clearInterval(t); };
  },[]);
  
  // ── Throttled price snapshot — only recalculate when price changes >0.3%
  const priceSignature = useMemo(() =>
    liveStocks.map(s => Math.round(s.p * 100) + s.sym).join('|')
  , [liveStocks]);

  const [throttledSig, setThrottledSig] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setThrottledSig(priceSignature), 5000); // max once/5s
    return () => clearTimeout(t);
  }, [priceSignature]);

const syms = liveStocks.map(s => s.sym);
const ohlcvCache = useOHLCVCache(syms, '3M');

        const allData = useMemo(()=>{
    // ✨ تمرير liveMACRO كـ parameter بدلاً من تعديل MACRO global
    // 🔍 مؤقّت: عدّ الأسهم الحقيقية vs الملفّقة (يُحذف بعد القياس)
    var _realCount = 0, _fakeCount = 0;
const result = liveStocks.map(stk=>{ 
      // ✨ تحقق من صحة bars من الكاش - إن كانت ناقصة/فاسدة، استخدم genBars
      var cached = ohlcvCache[stk.sym];
      var bars;
      var isRealData = false;

      var h;
      if (cached && Array.isArray(cached) && cached.length >= 20 &&
          cached.every(b => b && isFinite(b.c) && isFinite(b.vol))) {
        bars = cached;
        isRealData = true;
        _realCount++;
        h = stockHealth(stk, bars, liveMACRO);
        // حماية: إن كان score غير صالح رغم البيانات الحقيقية، استخدم نتيجة محايدة آمنة
        if (!h || !isFinite(h.score)) {
          h = _emptyHealthResult();
        }
      } else {
        bars = [];
        _fakeCount++;
        h = _emptyHealthResult();
      }
return {stk, bars, health:h, isRealData};
    });
    if (typeof window !== 'undefined') {
      window.__tadawulCounts = { real: _realCount, fake: _fakeCount, total: result.length };
    }
    return result;
    },[throttledSig, liveMACRO, ohlcvCache]); // ← throttled: recalc max every 5s not every 3s

  // ✨ لوحة التحليل → AI Learning (المصدر 2)
  // عند انتهاء التحليل: قيّم التوصيات القديمة (7+ أيام) ثم احفظ "شراء قوي" الجديدة
  useEffect(() => {
    if (loading || !allData || allData.length === 0) return;

    // 1. الأسعار الحالية لكل الأسهم
    var prices = {};
    allData.forEach(function(d){
      if (d && d.stk && d.stk.sym) prices[d.stk.sym] = d.stk.p;
    });

    // 2. راجع التوصيات القديمة → recordFeedback (live)
    evaluatePredictions(prices);

    // 3. احفظ "شراء قوي" الجديدة (مرة يومياً عبر الحارس الداخلي)
    var strongBuys = allData
      .filter(function(d){ return d && d.health && d.health.sig === "شراء قوي"; })
      .map(function(d){
        return {
          sym:    d.stk.sym,
          signal: d.health.sig,
          layers: d.health.layers,
          price:  d.stk.p,
        };
      });
    savePredictions(strongBuys);
  }, [loading, allData]);

 const filtered = useMemo(()=>{
    // ✨ Safety check
    if (!allData || !Array.isArray(allData) || allData.length === 0) return [];
    
    // 🎯 معايرة علمية: 65/55/45 بدلاً من 75/60/45
    var arr;
    if(tab==="buy")    arr = allData.filter(d=>d && d.health && d.health.score>=65);
    else if(tab==="watch")  arr = allData.filter(d=>d && d.health && d.health.score>=55 && d.health.score<65);
    else if(tab==="reduce") arr = allData.filter(d=>d && d.health && d.health.score<45);
    else arr = [...allData];
    return arr.sort(function(a,b){ 
      var sa = (a && a.health && a.health.score) || 0;
      var sb = (b && b.health && b.health.score) || 0;
      return sb - sa; 
    });
  },[allData,tab]); 
    const handleCardClick = useCallback(function(sym, isRare){
    haptic.tap();
    setFlashCard(sym);
    setTimeout(function(){ setFlashCard(null); }, 350);
    setSel(function(prev){
      if(prev===sym){ setRareAlert(null); return null; }
      if(isRare) setRareAlert(sym);
      return sym;
    });
  },[haptic]);

  const handleFullAnalysis = useCallback(function(sym){
    haptic.strong();
    setFullAnalysis(sym);
    setDiscovered(function(prev){
      if(prev.indexOf(sym) !== -1) return prev;
      return prev.concat([sym]);
    });
  },[haptic]);


    const marketAverages = useMemo(() => {
    if (!allData || !allData.length) return { health:50, conf:50, radar:50 };
    var sH=0, sR=0, n=allData.length;
    allData.forEach(function(d){
      if(d && d.health && isFinite(d.health.score)) sH += d.health.score;
      if(d && d.stk && isFinite(d.stk.rating)) sR += d.stk.rating;
    });
    var h = Math.round(sH/n);
    return { health:h, conf:Math.round(h*0.9), radar:Math.round(sR/n) };
  }, [allData]);

  const sortedByScore = useMemo(() => {
    if (!allData || !Array.isArray(allData) || allData.length === 0) return [];
    return [...allData].sort((a,b) => (((b&&b.health&&b.health.score)||0) - ((a&&a.health&&a.health.score)||0)));
  }, [allData]);


  const rankMap = useMemo(() => {
    const map = {};
    sortedByScore.forEach((d, i) => { 
      if (d && d.stk && d.stk.sym) map[d.stk.sym] = i + 1; 
    });
    return map;
  }, [sortedByScore]);

  // ✨ Stock Screener - filtered2 useMemo (Performance Fix)
  const filtered2 = useMemo(function() {
    if (!allData || !Array.isArray(allData) || allData.length === 0) return [];
    
    function applyFilter(d) {
      if (!d || !d.health || !d.stk) return false;
      var h = d.health, s = d.stk;
      if (h.score < filters.minScore || h.score > filters.maxScore) return false;
      if (filters.sig !== 'all' && h.sig !== filters.sig) return false;
      if (filters.sector !== 'all' && s.sec !== filters.sector) return false;
      if (s.pe && (s.pe < filters.minPE || s.pe > filters.maxPE)) return false;
      if (s.divY && s.divY < filters.minDivY) return false;
      if (s.roe && s.roe < filters.minROE) return false;
      if (filters.gatesAll && !(h.gates && h.gates.all)) return false;
      if (filters.regime !== 'all' && h.regime !== filters.regime) return false;
      return true;
    }
    
    return allData.filter(applyFilter).sort(function(a,b){
      return (((b&&b.health&&b.health.score)||0) - ((a&&a.health&&a.health.score)||0));
    });
  }, [allData, filters]);

  const sectorList = useMemo(function() {
    if (!allData || !Array.isArray(allData) || allData.length === 0) return ['all'];
    return ['all', ...new Set(allData.map(function(d) {
      return d && d.stk && d.stk.sec;
    }).filter(Boolean))];
  }, [allData]);


  // ✨ Performance: حساب الأعداد مرة واحدة بدل تكرار filters
  // 🎯 معايرة علمية: العتبات معدّلة لتعكس التوزيع الفعلي للـ scores
  // 🔍 نتائج البحث
const searchResults = useMemo(() => {
  if (!searchQuery.trim() || !allData) return [];
  const q = searchQuery.trim().toLowerCase();
  return allData.filter(d => {
    if (!d || !d.stk) return false;
    const sym = String(d.stk.sym).toLowerCase();
    const name = (d.stk.name || '').toLowerCase();
    const sec = (d.stk.sec || '').toLowerCase();
    return sym.includes(q) || name.includes(q) || sec.includes(q);
  }).slice(0, 20); // أوّل 20 نتيجة
}, [allData, searchQuery]);

  const signalCounts = useMemo(() => {
    if (!allData || !Array.isArray(allData) || allData.length === 0) {
      return { buy: 0, watch: 0, neutral: 0, reduce: 0, total: 0 };
    }
    
    let buy = 0, watch = 0, neutral = 0, reduce = 0;
    
    allData.forEach(d => {
      if (!d || !d.health) return;
      const score = d.health.score;
      if (score >= 65) buy++;          // كان 75 - معايرة علمية
      else if (score >= 55) watch++;   // كان 60 - معايرة علمية
      else if (score >= 45) neutral++; // يبقى - دفاعي
      else reduce++;
    });
    
    return { 
      buy, 
      watch, 
      neutral, 
      reduce, 
      total: allData.length 
    };
  }, [allData]);

  // ✨ Safety: حماية من undefined و empty arrays
const selData = (allData || []).find(d => d && d.stk && d.stk.sym === sel);

const upCount = (liveStocks || []).filter(s => s && s.ch > 0).length;

const avgChange = (liveStocks && liveStocks.length > 0)
  ? (liveStocks.reduce((sum, x) => sum + (x ? x.ch : 0), 0) / liveStocks.length).toFixed(2)
  : "0.00";

  const tasi = market?.indices?.find(i => i.id === 'tasi');
  const tasiVal = tasi?.value || 0;
  const tasiPct = tasi?.pct || 0;

  // ألوان Light Mode
  const LC = useMemo(()=> darkMode ? C : {
    ink:"#f0f4ff",   deep:"#e8edf8",  void:"#dde4f5",
    layer1:"#ffffff", layer2:"#f4f7ff", layer3:"#eaeffa",
    edge:"#dde4f8",   line:"#c8d3ee",  ash:"#b0bedd",
    snow:"#0d1225",   mist:"#2d3a5a",  smoke:"#4a5a7a",
    gold:C.gold,      goldL:C.goldL,   goldD:C.goldD,
    electric:"#1a6fd4",
    mint:"#0aaa66",   coral:"#d93545",
    amber:C.amber,    teal:"#0596b0",  plasma:C.plasma,
  },[darkMode]);


     return(
    <div style={{
      maxWidth:430, margin:"0 auto",
      background: LC.ink,
      minHeight:"100vh",
      fontFamily:"Cairo,system-ui,sans-serif",
      direction:"rtl",
      color: LC.snow,
      position:"relative",
      transition:"background .4s ease, color .4s ease",
      zoom: "1",
    }}
    className="tadawul-root"
    >

      {/* ══ CSS الأساسي ══ */}
      <style>{ANALYSIS_CSS}</style>

      {/* ══ خلفية الجسيمات المتحركة ══ */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {/* جسيمات كبيرة — تطفو ببطء */}
        {[
          {w:340,h:340,t:"-8%", r:"-15%",c:C.gold+"08",  dur:"18s"},
          {w:260,h:260,t:"55%", r:"-8%", c:C.gold+"06",  dur:"22s"},
          {w:280,h:280,t:"25%", r:"65%", c:C.electric+"07",dur:"16s"},
          {w:200,h:200,t:"75%", r:"18%", c:C.electric+"05",dur:"24s"},
          {w:220,h:220,t:"2%",  r:"38%", c:C.plasma+"06", dur:"20s"},
          {w:180,h:180,t:"45%", r:"75%", c:C.plasma+"05", dur:"14s"},
        ].map(function(p,i){
          return(
            <div key={i} style={{
              position:"absolute",
              width:p.w, height:p.h,
              borderRadius:"50%",
              background:"radial-gradient(circle," + p.c + " 0%, transparent 70%)",
              top:p.t, right:p.r,
              animation:"particle" + i + " " + p.dur + " ease-in-out infinite",
            }}/>
          );
        })}
        {/* نجوم صغيرة ثابتة */}
        {[...Array(12)].map(function(_,i){
          var size = i%3===0 ? 2 : 1;
          var colors = [C.gold+"66", C.electric+"55", C.plasma+"44"];
          return(
            <div key={"star"+i} style={{
              position:"absolute",
              width:size, height:size,
              borderRadius:"50%",
              background:colors[i%3],
              top: (7+i*7.3)%95 + "%",
              right: (3+i*8.1)%92 + "%",
              animation:"pulse " + (2.5+i*0.4) + "s ease-in-out infinite",
              animationDelay: (i*0.3) + "s",
            }}/>
          );
        })}
      </div>

      {/* ══ خلفية الجسيمات -- Canvas مستقل ══ */}
      <ParticleCanvas/>

      {/* ══════════════════════════════════
           الصفحة الرئيسية
      ══════════════════════════════════ */}
      {page==="home"&&(()=>{
        // ٤ — Contextual Color Temperature
        const avgHealth = allData.length > 0
  ? Math.round(allData.reduce(function(s,d){ return s + ((d && d.health && d.health.score) || 0); },0) / allData.length)
  : 50;
        const mktWarm   = avgHealth >= 65; // سوق صاعد → دفء ذهبي
        const tempColor = mktWarm ? C.gold : C.electric;
        const tempOpacity = "0.018";

        // ٣ — Glanceable Dashboard
const best3 = sortedByScore.length > 0 ? sortedByScore[0] : null;

                // 🎯 معايرة: 55 بدلاً من 60
        const mktOk  = avgHealth >= 55;
        return(
        <div style={{paddingBottom:80,position:"relative",zIndex:1}}>

          {/* Contextual Color Temperature — خلفية تتكيف مع حالة السوق */}
          <div style={{
            position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
            background: mktWarm
              ? "radial-gradient(ellipse at 50% 0%, rgba(212,168,67," + tempOpacity + ") 0%, transparent 70%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(59,139,255," + tempOpacity + ") 0%, transparent 70%)",
            transition:"background 2s ease",
          }}/>

          {/* ─── شريط العنوان الثابت ─── */}
          <div style={{
            padding:"52px 20px 12px",
            background:`linear-gradient(180deg, ${C.void}ff 60%, ${C.void}00 100%)`,
            position:"sticky",top:0,zIndex:30,
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:10,color:C.gold,fontWeight:700,letterSpacing:"3px",marginBottom:3}}>TADAWUL+</div>
                <div style={{fontSize:20,fontWeight:900,color:C.snow,lineHeight:1.1,letterSpacing:"-0.5px"}}>
                  لوحة التحليل{" "}
                  <span style={{
                    background:`linear-gradient(90deg,${C.gold},${C.goldL})`,
                    WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                  }}>الاحترافي</span>
                </div>
                {/* نبض السوق الحي */}
                <div style={{
                  display:"inline-flex",alignItems:"center",gap:5,
                  marginTop:6,
                  background:"rgba(16,201,126,.08)",
                  borderRadius:8,padding:"4px 10px",
                  border:"1px solid rgba(16,201,126,.18)",
                }}>
{(function(){
                    var isOpen = getKsaMarket().isOpen;

                    var stColor = isOpen ? C.mint : C.coral;
                    var stLabel = isOpen ? "مباشر" : "مغلق";
                    return (
                      <>
{[4,8,12,6,10].map(function(barH, i){
                          return (
                            <div key={i} style={{
                              width:3,
                              height: barH,
                              borderRadius:2,
                              background: stColor,
                              opacity: isOpen ? 0.35 : 0.4,
                              animation: isOpen ? "pulse 1.5s ease-in-out "+(i*0.3)+"s infinite" : "none",
                            }}/>
                          );
                        })}
                        <span style={{fontSize:8,fontWeight:700,color:stColor,marginRight:2}}>{stLabel}</span>
                      </>
                    );
                  })()}
                  {(function(){
                    var c = (typeof window !== 'undefined') ? window.__tadawulCounts : null;
                    if (!c || !c.total) return null;
                    var pct = Math.round((c.real/c.total)*100);
                    var clr = pct >= 90 ? C.mint : pct >= 70 ? C.amber : C.coral;
                    return (<span style={{fontSize:8,fontWeight:700,color:clr,marginRight:4,direction:"ltr"}}>
                      {c.real}/{c.total}
                    </span>);
                                    })()}
                  <span style={{fontSize:8,color:C.smoke}}>
{(function(){
    var d = liveTime || new Date();
    var hh = String(d.getHours()).padStart(2,"0");
    var mm = String(d.getMinutes()).padStart(2,"0");
    var ss = String(d.getSeconds()).padStart(2,"0");
    return hh + ":" + mm + ":" + ss;
})()}
                  </span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                {/* مؤشر تاسي */}
<div style={{
    background:"linear-gradient(135deg," + C.layer1 + "," + C.layer2 + ")",
    borderRadius:14,padding:"8px 14px",textAlign:"center",
    border:"1px solid " + C.line,
}}>

                  <div style={{fontSize:8,color:C.smoke,letterSpacing:"1px",marginBottom:2}}>تاسي</div>
                  <div className="num-lg" style={{fontSize:18,fontWeight:900,color:C.goldL,lineHeight:1,direction:"ltr"}}>{tasiVal.toLocaleString()}</div>
                  <div style={{fontSize:10,fontWeight:700,color:tasiPct>=0?C.mint:C.coral,marginTop:2,direction:"ltr"}}>
                    {tasiPct>=0?"▲":"▼"} {Math.abs(tasiPct).toFixed(2)}%
                  </div>
                </div>
{/* أزرار الإعدادات -- 44px touch target (Apple HIG) */}
<div style={{display:"flex",gap:6,alignItems:"center"}}>
  {/* 🔍 زرّ البحث */}
  <button
    onClick={function(){ haptic.tap(); setSearchOpen(function(s){ return !s; }); }}
    style={{
      width:44,height:44,borderRadius:12,cursor:"pointer",
      background: searchOpen 
        ? "linear-gradient(135deg," + C.gold + "33," + C.gold + "11)"
        : "linear-gradient(135deg," + C.layer3 + "," + C.edge + ")",
      border:"1px solid " + (searchOpen ? C.gold + "66" : C.line),
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:18,
      boxShadow: searchOpen 
        ? "0 0 12px " + C.gold + "44, 0 2px 10px rgba(0,0,0,.25)"
        : "0 2px 10px rgba(0,0,0,.25)",
      transition: "all .25s ease",
    }}>
    🔍
  </button>
                  {/* Dark/Light Mode */}
                                    <button
                    onClick={function(){ haptic.toggle(); setDarkMode(function(d){ return !d; }); }}

                    style={{
                      width:44,height:44,borderRadius:12,cursor:"pointer",
                      background:  darkMode
                        ? "linear-gradient(135deg," + C.layer3 + "," + C.edge + ")"
                        : "linear-gradient(135deg,#e8edf8,#dde4f5)",
                      border:"1px solid " + C.line,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:18,
                      boxShadow:"0 2px 10px rgba(0,0,0,.25)",
                    }}>
                    {darkMode
                      ? <Icon name="sun"  size={18} color={C.smoke}/>
                      : <Icon name="moon" size={18} color="#2d3a5a"/>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
 {/* ══ 🔍 شريط البحث ══ */}
{searchOpen && (
  <div style={{
    margin:"10px 16px 0",
    background:"linear-gradient(135deg," + C.layer1 + "," + C.layer2 + ")",
    borderRadius:14,
    border:"1px solid " + C.gold + "33",
    overflow:"hidden",
    animation:"expandDown .35s ease both",
  }}>
    <div style={{padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:16,color:C.gold}}>🔍</span>
      <input
        type="search"
        value={searchQuery}
        onChange={function(e){ setSearchQuery(e.target.value); }}
        placeholder="ابحث (الاسم، الرمز 2130، القطاع...)"
        autoFocus
        style={{
          flex:1,
          background:"transparent",
          border:"none",
          outline:"none",
          color:C.snow,
          fontSize:13,
          fontWeight:600,
          fontFamily:"Cairo,sans-serif",
          textAlign:"right",
          direction:"rtl",
        }}
      />
      {searchQuery && (
        <button
          onClick={function(){ haptic.tap(); setSearchQuery(""); }}
          style={{
            background:"transparent",
            border:"none",
            color:C.smoke,
            cursor:"pointer",
            padding:4,
            fontSize:16,
          }}>
          ✕
        </button>
      )}
    </div>
    
    {/* نتائج البحث */}
    {searchQuery && (
      <div style={{
        borderTop:"1px solid " + C.line,
        maxHeight:320,
        overflowY:"auto",
        padding:"6px 8px",
      }}>
        <div style={{
          fontSize:9,
          color:C.smoke,
          fontWeight:700,
          padding:"4px 6px",
        }}>
          {searchResults.length === 0 
            ? "لا توجد نتائج" 
            : "وجدت " + searchResults.length + " نتيجة"}
        </div>
        {searchResults.map(function(d){
          return (
            <div
              key={d.stk.sym}
              onClick={function(){
                haptic.success();
                setSel(d.stk.sym);
                setSearchOpen(false);
                setSearchQuery("");
                // scroll للسهم
                setTimeout(function(){
                  var el = document.getElementById("stock-" + d.stk.sym);
                  if (el) el.scrollIntoView({behavior:"smooth",block:"center"});
                }, 100);
              }}
              style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                padding:"8px 10px",
                margin:"3px 0",
                background:C.layer2,
                borderRadius:8,
                cursor:"pointer",
                border:"1px solid " + d.health.sigC + "33",
                transition:"all .15s ease",
              }}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:C.snow}}>{d.stk.name}</div>
                <div style={{fontSize:9,color:C.smoke,marginTop:2}}>
                  {d.stk.sym} · {d.stk.sec}
                </div>
              </div>
              <div style={{textAlign:"left",marginLeft:8}}>
                <div style={{
                  fontSize:13,
                  fontWeight:900,
                  color:d.health.sigC,
                  direction:"ltr",
                }}>
                  {d.stk.p.toFixed(2)}
                </div>
                <div style={{
                  fontSize:8,
                  fontWeight:700,
                  color:d.health.sigC,
                  marginTop:2,
                }}>
                  {d.health.score} · {d.health.sig}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}


          {/* ══ Skeleton Loading — أثناء التحليل ══ */}
          {loading&&(
            <div style={{padding:"12px 16px"}}>
              {/* Skeleton للـ Glanceable */}
              <div className="skeleton" style={{
                height:62,borderRadius:14,marginBottom:10,
                background:'linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)',
backgroundSize:'200% 100%',
animation:'shimmer 1.4s ease infinite',
              }}/>
              {/* Skeleton للبطاقة العلوية */}
              <div className="skeleton" style={{
                height:180,borderRadius:20,marginBottom:10,
                background:'linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)',
backgroundSize:'200% 100%',
animation:'shimmer 1.4s ease infinite',
              }}/>
              {/* Skeleton لبطاقات الأسهم */}
              {[1,2,3].map(function(i){
                return(
                  <div key={i} className="skeleton" style={{
                    height:130,borderRadius:18,marginBottom:10,
                    background:'linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)',
backgroundSize:'200% 100%',
animation:'shimmer 1.4s ease infinite',
                    animationDelay: (i*0.15) + "s",
                  }}/>
                );
              })}
              {/* نص التحليل */}
              <div style={{textAlign:"center",paddingTop:8}}>
                <div style={{
                  display:"inline-flex",alignItems:"center",gap:8,
                  background:C.layer2,borderRadius:20,padding:"8px 16px",
                  border:"1px solid " + C.line,
                }}>
                  <div style={{
                    width:8,height:8,borderRadius:"50%",
                    background:C.electric,
                    animation:"skeletonPulse 1s ease-in-out infinite",
                  }}/>
                  <span style={{fontSize:11,color:C.mist,fontWeight:600}}>
                    جارٍ تحليل ١١ طبقة لـ {allData.length} سهم...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══ Glanceable Dashboard -- نظرة واحدة تكفي ══ */}
{!loading&&(
<div style={{
    margin:"10px 16px 4px",
    background:"linear-gradient(135deg," + C.layer1 + "," + C.layer2 + ")",
    borderRadius:14,padding:"10px 14px",
    border:"1px solid " + tempColor + "22",
    borderRadius:14,padding:"10px 14px",
    border:"1px solid " + tempColor + "22",
    display:"flex",alignItems:"center",
    boxShadow:"0 4px 20px rgba(0,0,0,.3), inset 0 1px 0 " + C.layer3,
}}>

            {/* السؤال ١: كيف السوق؟ */}
            {/* 🎯 معايرة: 65/55/45 */}
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>حال السوق</div>
              <div style={{
                fontSize:16,fontWeight:900,lineHeight:1,
                color: avgHealth>=65?C.mint:avgHealth>=55?C.electric:avgHealth>=45?C.amber:C.coral,
              }}>{avgHealth}</div>
              <div style={{
                fontSize:7,fontWeight:700,marginTop:2,
                color: avgHealth>=65?C.mint:avgHealth>=55?C.electric:avgHealth>=45?C.amber:C.coral,
              }}>{avgHealth>=65?"ممتاز":avgHealth>=55?"جيد":avgHealth>=45?"محايد":"حذر"}</div>
            </div>
            <div style={{width:1,height:36,background:C.line}}/>
            {/* السؤال ٢: ما أفضل سهم؟ */}
            <div style={{flex:1.4,textAlign:"center",padding:"0 12px"}}>
              <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>أفضل فرصة</div>
              <div style={{fontSize:14,fontWeight:900,color:C.gold,lineHeight:1}}>{best3 && best3.stk ? best3.stk.name : '--'}</div>
<div style={{fontSize:8,color:best3 && best3.health ? best3.health.sigC : C.smoke,marginTop:2,fontWeight:700}}>{best3 && best3.health ? best3.health.sig : '--'}</div>
            </div>
            <div style={{width:1,height:36,background:C.line}}/>
            {/* السؤال ٣: هل الآن وقت الدخول؟ */}
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>توقيت الدخول</div>
              <div style={{
                fontSize:14,fontWeight:900,lineHeight:1,
                color: mktOk ? C.mint : C.coral,
              }}>{mktOk?"الآن":"انتظر"}</div>
              <div style={{fontSize:7,color:C.smoke,marginTop:2}}>
                {mktOk ? "الظروف مناسبة" : "السوق غير مهيأ"}
              </div>
            </div>
          </div>
          )}

          {/* ─── المحتوى الرئيسي — يظهر بعد التحليل ─── */}
          {!loading&&(
          <div>
          
          {/* ─── البطاقة العلوية -- قسمان + زر طي ─── */}
          <MarketOverviewCard
            allData={allData}
            signalCounts={signalCounts}
            marketAverages={marketAverages}
            sortedByScore={sortedByScore}
          />



          {/* ─── زر الإشارات ─── */}
          <div style={{padding:"0 16px 10px"}}>
                        <button
              onClick={()=>{ haptic.tap(); setPage("signals"); }}
              style={{
                width:"100%",
                background:"linear-gradient(135deg,"+C.electric+"22,"+C.mint+"18)",
                border:"1px solid "+C.electric+"55",
                borderRadius:14,
                padding:"14px 16px",
                cursor:"pointer",
                textAlign:"right",
              }}
            >
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:14,color:C.electric}}>←</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:C.snow}}>إشارات اليوم</div>
                    <div style={{fontSize:9,color:C.smoke,marginTop:1}}>اضغط لعرض التفاصيل الكاملة</div>
                  </div>
                  <span style={{fontSize:16}}>⚡</span>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",gap:6}}>
                {[
    {label:"شراء قوي", count:signalCounts.buy, color:C.mint},
    {label:"مراقبة",   count:signalCounts.watch, color:C.amber||"#f59e0b"},
    {label:"محايد",    count:signalCounts.neutral, color:C.teal},
    {label:"تخفيف",    count:signalCounts.reduce, color:C.coral},
].map(item=>(
                  <div key={item.label} style={{
                    flex:1, background:item.color+"18",
                    border:"1px solid "+item.color+"33",
                    borderRadius:8, padding:"6px 4px", textAlign:"center",
                  }}>
                    <div style={{fontSize:16,fontWeight:900,color:item.color}}>{item.count}</div>
                    <div style={{fontSize:8,color:C.smoke,marginTop:1}}>{item.label}</div>
                  </div>
                ))}
              </div>
            </button>
          </div>

          {/* ─── شريط الفلتر ─── */}
          <div style={{padding:"0 16px 10px",display:"flex",gap:6}}>
            {[
              {k:"all",   l:"الكل",     c:C.electric},
              {k:"buy",   l:"شراء قوي", c:C.mint},
              {k:"watch", l:"مراقبة",    c:C.amber},
              {k:"reduce",l:"تخفيف",    c:C.coral},
            ].map(({k,l,c})=>(
                            <button key={k} onClick={()=>{ haptic.tap(); setTab(k); }} style={{

                flex:1,padding:"8px 4px",borderRadius:10,cursor:"pointer",
                fontFamily:"Cairo,sans-serif",fontSize:10,fontWeight:700,
                background:tab===k ? c+"22" : "transparent",
                border:"1px solid "+(tab===k ? c+"55" : C.line),
                color:tab===k ? c : C.smoke,
                transition:"all .25s cubic-bezier(.4,0,.2,1)",
                letterSpacing:".2px",
              }}>
                <div>{l}</div>
                <div style={{fontSize:8,marginTop:1,opacity:.8}}>
  {k==="all"?signalCounts.total:k==="buy"?signalCounts.buy:k==="watch"?signalCounts.watch:signalCounts.reduce}
</div>
              </button>
            ))}
          </div>

          {/* ─── قائمة الأسهم ─── */}
          <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map(function(d,idx){
              return (
                <StockCard
                  key={d.stk.sym}
                  stk={d.stk}
                  bars={d.bars}
                  health={d.health}
                  isRealData={d.isRealData}
                  idx={idx}
                  selected={sel===d.stk.sym}
                  isFlashing={flashCard===d.stk.sym}
                  globalRank={rankMap[d.stk.sym]||1}
                  allData={allData}
                  discovered={discovered}
                  onCardClick={handleCardClick}
                  onFullAnalysis={handleFullAnalysis}
                  haptic={haptic}
                />
              );
            })}

          {/* ══ مصفوفة الارتباط ══ */}
          <CorrelationMatrix allData={allData} C={C}/>

          </div>
          </div>
          )}
        </div>
        );
      })()}

      {/* ══════════════════════════════════
           صفحة الإشارات
      ══════════════════════════════════ */}
      {page==="signals"&&(
        <SignalsPage
          allData={allData}
          filtered2={filtered2}
          filters={filters}
          setFilters={setFilters}
          screenerOpen={screenerOpen}
          setScreenerOpen={setScreenerOpen}
          sectorList={sectorList}
          onBack={function(){ setPage("home"); }}
          haptic={haptic}
        />
      )}
 

      {/* ══ شريط الحالة العلوي ══ */}
      <div style={{
        position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,
        padding:"12px 20px 6px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        background:`linear-gradient(180deg,${C.void} 60%,transparent 100%)`,
        zIndex:40,pointerEvents:"none",
      }}>
        <div style={{fontSize:9,fontWeight:600,color:C.smoke}}>
  {(function(){
    var d = liveTime || new Date();
    var hh = String(d.getHours()).padStart(2,"0");
    var mm = String(d.getMinutes()).padStart(2,"0");
    return hh + ":" + mm;
  })()}
</div>
      </div>

      {/* ══ لوحة التحليل الكامل -- ٩ طبقات (Modal) ══ */}
      <FullAnalysisModal
        sym={fullAnalysis}
        onClose={function(){ setFullAnalysis(null); }}
        allData={allData}
        liveStocks={liveStocks}
        haptic={haptic}
      />

    </div>
  );
}

// ══ Default Export with Error Boundary ══
export default function AnalysisScreen(props) {
  return (
    <ErrorBoundary label="لوحة التحليل">
      <AnalysisScreenInner {...props} />
    </ErrorBoundary>
  );
}

