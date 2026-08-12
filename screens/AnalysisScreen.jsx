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
  C,
} from '../components/analysis/AnalysisHelpers';

import { savePredictions, evaluatePredictions } from '../engines/predictionTracker';
import Tooltip from '../components/Tooltip';
import ErrorBoundary from '../components/ErrorBoundary';
import FullAnalysisModal from '../components/analysis/FullAnalysisModal';
import { ANALYSIS_CSS } from '../components/analysis/analysisStyles';
import SignalsPage from '../components/analysis/SignalsPage';
import { shareStockCard } from '../utils/shareStockCard';
import { useHaptic } from '../hooks/useHaptic';

// حالة السوق السعودي: الأحد–الخميس، 9:30–15:30 بتوقيت الرياض
function getKsaMarket(){
  var now = new Date();
  var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  var ksa = new Date(utc + 3 * 3600000);
  var day = ksa.getDay();
  var mins = ksa.getHours()*60 + ksa.getMinutes();
  var isOpen = (day>=0 && day<=4) && (mins>=570 && mins<=930);
  return { ksa:ksa, day:day, mins:mins, isOpen:isOpen };
}


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
                    جارٍ تحليل ٩ طبقات لـ {allData.length} سهم...
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

          {/* ─── البطاقة العلوية — قسمان + زر طي ─── */}
          {(()=>{
            const totalN     = allData.length;
            const buyN       = signalCounts.buy;
            const watchN     = signalCounts.watch;
            const reduceN    = signalCounts.reduce;
            const noSigN     = signalCounts.neutral;
            const avgHealth  = marketAverages.health;
            const avgConf    = marketAverages.conf;
            const avgRadar   = marketAverages.radar;
            const mktLabel   = "المؤشر العام";
            // 🎯 معايرة علمية: 65/55/45/38
            const mktColor = avgHealth>=65?C.mint:avgHealth>=55?C.electric:avgHealth>=45?C.amber:avgHealth>=38?"#c0392b":"#a93226"
const mktIcon = avgHealth>=65
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><path d="M12 2L8 12H4l8 10 8-10h-4L12 2z"/></svg>
  : avgHealth>=55
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  : avgHealth>=45
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><circle cx="12" cy="12" r="9"/></svg>
  : avgHealth>=38
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
  : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const best = sortedByScore.length > 0 ? sortedByScore[0] : null;

            return(
              <div style={{margin:"0 16px 14px",position:"relative"}}>
                <div style={{
                  background:`linear-gradient(160deg,#0f1628 0%,#131a2e 60%,#162040 100%)`,
                  borderRadius:20,border:`1px solid ${C.line}`,overflow:"hidden",
                  boxShadow:`0 16px 48px rgba(0,0,0,.45), inset 0 1px 0 ${C.layer3}`,
                }}>
                  {/* ضوء محيطي */}
                  <div style={{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",
                    background:`radial-gradient(circle,${mktColor}0a 0%,transparent 70%)`,pointerEvents:"none"}}/>

                  {/* ══ القسم ١ — صحة السوق (دائماً مرئي) ══ */}
                  <div style={{padding:"16px 16px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>

                      {/* التصنيف + الأرقام السريعة — يمين */}
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
<span style={{display:"flex",alignItems:"center"}}>{mktIcon}</span>
                          <span style={{fontSize:16,fontWeight:900,color:mktColor,letterSpacing:"-.3px"}}>{mktLabel}</span>
                          {(function(){
                            var isOpen = getKsaMarket().isOpen;

                            var stCol = isOpen ? mktColor : C.coral;
                            var stLbl = isOpen ? "مباشر" : "مغلق";
                            return (
                              <div style={{marginRight:"auto",display:"flex",alignItems:"center",gap:4,
                                background:stCol+"15",borderRadius:20,padding:"2px 8px",border:`1px solid ${stCol}30`}}>
                                <div className={isOpen?"live-dot":""} style={{width:5,height:5,borderRadius:"50%",background:stCol}}/>
                                <span style={{fontSize:8,fontWeight:700,color:stCol}}>{stLbl}</span>
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          {[
                            {l:"صحة السوق العام",v:scoreWord(avgHealth),c:mktColor},
                            {l:"إشارات السوق",v:scoreWord(avgRadar),c:C.electric},
                            {l:"ثقة السوق",v:scoreWord(avgConf),c:C.gold},
                          ].map(k=>(
                            <div key={k.l} style={{flex:1,background:k.c+"0f",borderRadius:9,
                              padding:"5px 6px",textAlign:"center",border:`1px solid ${k.c}20`}}>
                              <div style={{fontSize:13,fontWeight:900,color:k.c,lineHeight:1}}>{k.v}</div>
                              <div style={{fontSize:8,color:C.smoke,marginTop:2}}>{k.l}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* الحلقة 68px — يسار */}
                      <div style={{position:"relative",width:68,height:68,flexShrink:0}}>
                        <svg width={68} height={68} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                          <circle cx={34} cy={34} r={28} fill="none" stroke={C.ash} strokeWidth={5} strokeOpacity={.2}/>
                          <circle cx={34} cy={34} r={28} fill="none" stroke={mktColor} strokeWidth={5}
                            strokeDasharray={2*Math.PI*28} strokeDashoffset={2*Math.PI*28*(1-avgHealth/100)}
                            strokeLinecap="round"
                            style={{filter:`drop-shadow(0 0 6px ${mktColor}88)`,transition:"stroke-dashoffset 1s ease"}}/>
                          <circle cx={34} cy={34} r={21} fill="none" stroke={mktColor} strokeWidth={1.5}
                            strokeDasharray={2*Math.PI*21} strokeDashoffset={2*Math.PI*21*(1-avgHealth/100)}
                            strokeLinecap="round" strokeOpacity={.25}/>
                        </svg>
                        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                          <div className="glow-white" style={{fontSize:18,fontWeight:900,color:mktColor,lineHeight:1}}>{avgHealth}</div>
                          <div style={{fontSize:7,fontWeight:700,color:mktColor,marginTop:1}}>{scoreWord(avgHealth)}</div>
                        </div>
                      </div>

                    </div>
                  </div>

                  <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.line},transparent)`}}/>
                  {/* ══ اتساع السوق — بين المؤشر العام وأفضل اختيار ══ */}
                  {(function(){
                    const _bp = Math.round(allData.filter(d=>d.health.score>=50).length/totalN*100);
                    const _bc = _bp>=65?C.mint:_bp>=50?C.electric:_bp>=35?C.amber:C.coral;
                    return(
                      <div style={{padding:"10px 16px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                          <div style={{fontSize:9,color:C.smoke,fontWeight:700,letterSpacing:".8px"}}>اتساع السوق</div>
                          <span style={{fontSize:11,fontWeight:800,color:_bc}}>{_bp}%
                            <span style={{fontSize:9,color:C.smoke,fontWeight:400}}> ({allData.filter(d=>d.health.score>=50).length}/{totalN})</span>
                          </span>
                        </div>
                        <div style={{height:6,borderRadius:4,overflow:"hidden",background:C.coral+"30",position:"relative"}}>
                          <div style={{position:"absolute",top:0,right:0,height:"100%",width:`${_bp}%`,
                            background:`linear-gradient(90deg,${_bc}aa,${_bc})`,borderRadius:4,
                            boxShadow:`0 0 6px ${_bc}44`}}/>
                          <div style={{position:"absolute",top:0,right:"50%",width:1,height:"100%",background:C.smoke+"44"}}/>
                        </div>
                        <div style={{fontSize:8,color:C.mist,marginTop:4}}>
                          {_bp>=65?"📈 صعود واسع":_bp>=50?"صعود متوسط":_bp>=35?"⚠ اتساع ضعيف":"📉 هبوط واسع"}
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.line},transparent)`}}/>
                  {/* ══ القسم ٢ -- أفضل اختيار (دائماً مرئي) ══ */}
                  {best && best.stk && best.health && (
                  <div style={{padding:"12px 16px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>

                      {/* يمين — اسم + رقم + قطاع + سعر + % */}
                      <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
{best && best.stk && (
<div style={{fontSize:15,fontWeight:900,color:C.snow}}>{best.stk.name}</div>
)}

                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:8,color:C.smoke,background:C.layer3,padding:"1px 6px",borderRadius:4}}>{best.stk.sym}</span>
                          <span style={{fontSize:8,color:C.smoke}}>{best.stk.sec}</span>
                        </div>
                        <div style={{fontSize:17,fontWeight:900,color:C.snow,direction:"ltr",letterSpacing:"-.5px"}}>{best.stk.p.toFixed(2)}</div>
                        <div style={{display:"inline-flex",alignItems:"center",background:(best.stk.ch>=0?C.mint:C.coral)+"20",border:"1px solid "+(best.stk.ch>=0?C.mint:C.coral)+"44",borderRadius:6,padding:"2px 8px",direction:"ltr"}}>
                          <span style={{fontSize:10,fontWeight:700,color:best.stk.ch>=0?C.mint:C.coral}}>{best.stk.ch>=0?"+":""}{best.stk.ch.toFixed(2)}%</span>
                        </div>
                      </div>
                      {/* وسط — badge + إشارة + ثقة */}
                      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                        <span style={{fontSize:8,color:C.gold,fontWeight:700,background:"rgba(212,168,67,.12)",border:"1px solid rgba(212,168,67,.25)",padding:"2px 8px",borderRadius:6}}>⭐ أفضل اختيار</span>
                        <span style={{fontSize:9,fontWeight:700,color:best.health.sigC,background:best.health.sigC+"15",border:"1px solid "+best.health.sigC+"33",padding:"2px 8px",borderRadius:6}}>{best.health.sig}</span>
                      </div>
                      {/* يسار — الدائرة */}
                      <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                        <svg width={52} height={52} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                          <circle cx={26} cy={26} r={21} fill="none" stroke={C.ash} strokeWidth={4} strokeOpacity={.2}/>
                          <circle cx={26} cy={26} r={21} fill="none" stroke={C.gold} strokeWidth={4}
                            strokeDasharray={2*Math.PI*21} strokeDashoffset={2*Math.PI*21*(1-best.health.score/100)}
                            strokeLinecap="round" style={{filter:`drop-shadow(0 0 5px ${C.gold}88)`}}/>
                        </svg>
                        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                          <div className="glow-gold" style={{fontSize:13,fontWeight:900,color:C.gold,lineHeight:1}}>{best.health.score}</div>
                          <div style={{fontSize:6,color:C.smoke,marginTop:1}}>{best.health.grade}</div>
                        </div>
                      </div>
                         </div>
                  </div>
                  )}
                </div>
              </div>
            );
          })()}



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
{filtered.map(({stk,bars,health,isRealData},idx)=>{
              const up=stk.ch>=0;
              const priceColor=up?C.mint:C.coral;
              const selected=sel===stk.sym;
              const globalRank = rankMap[stk.sym] || 1;
const rankUp=stk.ch>0;
const isBuy=health.score>=65;     // كان 75 - معايرة علمية
              const isDanger=health.score<45;   // يبقى - دفاعي
              const isRare=health.score>=75;    // كان 85 - فرصة استثنائية
              const isFlashing = flashCard === stk.sym;
              const level = cardLevel[stk.sym] || 1; // 1=مبسط 2=كامل
              // ✨ موحَّد على مستوى البطاقة كلها: يُستخدم لتلوين كل قسم يتأثر بـ RSI
              const cardOverbought = ((health.extras && health.extras.rsiV) || 50) >= 75;

return(
  <div key={stk.sym}
    id={"stock-" + stk.sym}
    data-stock-card
    className="card-enter"
    style={{animationDelay:`${idx*.07}s`}}
    onClick={function(){
    haptic.tap();
    // Micro-feedback -- وميض لحظي
    setFlashCard(stk.sym);
    setTimeout(function(){ setFlashCard(null); }, 350);
    // Progressive Disclosure -- تقدّم في المستويات
    if(selected){
      setSel(null);
      setRareAlert(null);
    } else {
      setSel(stk.sym);
      setSel(stk.sym);
      if(isRare) setRareAlert(stk.sym);
    }
  }}
                >
                  {/* ─ البطاقة الرئيسية ─ */}
                  <div
                    className={isFlashing?"flash":isBuy&&!selected?"buy-glow":isDanger&&!selected?"danger-pulse":""}
                    style={{
                    background:"linear-gradient(135deg,#0f1628 0%,#131a2e 100%)",
                    borderRadius:18,
                    border:"1px solid " + (selected ? health.sigC+"66" : health.sigC+"22"),
                    overflow:"hidden",
                    boxShadow: isFlashing
                      ? "0 0 0 3px " + health.sigC + "55, 0 16px 48px rgba(0,0,0,.6)"
                      : selected
                      ? "0 16px 48px rgba(0,0,0,.6), 0 0 0 1px " + health.sigC + "44, inset 0 1px 0 " + health.sigC + "20"
                      : "0 4px 20px rgba(0,0,0,.3), inset 0 1px 0 " + C.layer3,
                    transition:"all .3s cubic-bezier(.4,0,.2,1)",
                    cursor:"pointer",
                    position:"relative",
                  }}>

                    {/* ── badge الترتيب — سياق المقارنة ── */}
                    <div style={{
                      position:"absolute",top:10,left:10,zIndex:5,

                      display:"flex",alignItems:"center",gap:3,
                      background:"rgba(0,0,0,.45)",borderRadius:7,
                      padding:"2px 7px",backdropFilter:"blur(4px)",
                      animation:"rankUp .4s ease both",
                    }}>
                      <span style={{fontSize:9,fontWeight:900,color:C.mist}}>#{globalRank}</span>
                      <span style={{fontSize:9,color:rankUp?C.mint:C.coral,fontWeight:700}}>
                        {rankUp?"↑":"↓"}
                      </span>
                    </div>
                    {/* شريط اللون العلوي -- معايرة علمية: 65/55/45 */}
                    <div style={{
                      height:3,
                      background:health.score>=65
                        ? `linear-gradient(90deg,${C.mint}00,${C.mint},${C.mint}00)`
                        : health.score>=55
                        ? `linear-gradient(90deg,${C.amber}00,${C.amber},${C.amber}00)`
                        : health.score>=45
                        ? `linear-gradient(90deg,${C.teal}00,${C.teal},${C.teal}00)`
                        : `linear-gradient(90deg,${C.coral}00,${C.coral},${C.coral}00)`,
                      opacity:.8,
                    }}/>

                    {/* جسم البطاقة */}
                    <div style={{padding:"14px 16px 10px",position:"relative"}}>
                      {/* خلفية ملونة خافتة حسب الإشارة */}
                      <div style={{
                        position:"absolute",top:0,right:0,width:"50%",height:"100%",
                        background:`linear-gradient(270deg, ${health.sigC}0c 0%, transparent 100%)`,
                        pointerEvents:"none",
                      }}/>

                      <div style={{display:"flex",alignItems:"center",gap:12,position:"relative"}}>

                        {/* يمين — اسم السهم + رقمه + قطاعه + سعره + نسبته */}
                        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,maxWidth:"45%"}}>
                          <div className="glow-white" style={{fontSize:16,fontWeight:900,color:C.snow,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%"}}>{stk.name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"1px 7px",borderRadius:5}}>{stk.sym}</span>
                            <span style={{fontSize:9,color:C.smoke}}>{stk.sec}</span>
                          </div>
                          <div className="num-lg glow-white" style={{fontSize:18,fontWeight:900,color:C.snow,letterSpacing:"-0.5px",lineHeight:1,direction:"ltr"}}>{stk.p.toFixed(2)}</div>
                          <div style={{display:"inline-flex",alignItems:"center",gap:3,background:priceColor+"20",border:"1px solid "+priceColor+"44",borderRadius:7,padding:"2px 8px",direction:"ltr"}}>
                            <span style={{fontSize:10,fontWeight:800,color:priceColor}}>{up?"+":""}{stk.ch.toFixed(2)}%</span>
                          </div>
                        </div>

                        {/* وسط — الإشارة + المقارنة + القائد */}
                        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          <div style={{display:"flex",alignItems:"center",gap:4,background:health.sigC+"22",border:"1px solid "+health.sigC+"55",borderRadius:8,padding:"3px 10px",boxShadow:"0 2px 8px "+health.sigC+"22"}}>
                            <div style={{width:6,height:6,borderRadius:"50%",background:health.sigC,boxShadow:"0 0 6px "+health.sigC}}/>
                            <span style={{fontSize:10,fontWeight:800,color:health.sigC}}>{health.sig}</span>
                          </div>
                          <div style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:7,padding:"2px 8px"}}>
                            {globalRank !== 1 && globalRank > 3 && (
                              <span style={{fontSize:8,color:C.smoke}}>أعلى من</span>
                            )}
                            <span style={{fontSize:9,fontWeight:800,color:globalRank<=3?C.gold:globalRank<=5?C.mint:C.mist}}>{
                              globalRank === 1 ? "الأول" :
                              globalRank <= 3 ? "أعلى " + Math.min(99, Math.round((allData.length-globalRank)/allData.length*100)) + "%" :
                              Math.min(99, Math.round((allData.length-globalRank)/allData.length*100)) + "%"
                            }</span>
                            <span style={{fontSize:8,color:C.smoke}}>من السوق</span>
                            {globalRank<=3&&<span style={{fontSize:9}}>🔥</span>}
                          </div>

                          {(function(){
                            var layers=health.layers||{};
                            var items=[{name:"السيولة",val:layers.L9||0,w:21,icon:"💧"},{name:"الاحتمالية",val:layers.L7||0,w:18,icon:"🧮"},{name:"الرادار",val:layers.L8||0,w:15,icon:"🎯"},{name:"الهيكل",val:layers.L1||0,w:14,icon:"🏗"},{name:"كيلي",val:layers.L6||0,w:12,icon:"📐"},{name:"المؤشرات",val:layers.L5||0,w:9,icon:"🔗"}];
                            var top=items.slice().sort(function(a,b){return(b.val*b.w)-(a.val*a.w);})[0];
                            var isPos=top.val>=60;
                            return(<div style={{display:"inline-flex",alignItems:"center",gap:4,background:isPos?health.sigC+"14":"rgba(90,106,138,.12)",border:"1px solid "+(isPos?health.sigC+"30":"rgba(90,106,138,.25)"),borderRadius:7,padding:"3px 8px"}}>
                              <span style={{fontSize:9}}>{top.icon}</span>
                              <span style={{fontSize:8,color:isPos?health.sigC:C.smoke,fontWeight:700}}>{top.name}</span>
                              <span style={{fontSize:8,fontWeight:900,color:isPos?health.sigC:C.smoke,background:"rgba(255,255,255,.08)",borderRadius:4,padding:"0 4px"}}>{top.val}</span>
                            </div>);
                          })()}
                        </div>

                        {/* يسار — الدائرة */}
                        <div style={{position:"relative",flexShrink:0}}>
                          <ArcRing val={health.score} size={56} stroke={4} color={health.sigC} bg={C.ash}>
                            <div style={{textAlign:"center"}}>
                              <div className="num-lg glow-white" style={{fontSize:11,fontWeight:900,color:health.sigC,lineHeight:1}}>{health.score}</div>
                              <div style={{fontSize:7,fontWeight:700,color:health.sigC,marginTop:1}}>{scoreWord(health.score)}</div>
                            </div>
                          </ArcRing>
                          {(function(){
                            // 🎯 معايرة علمية: العتبة 65 بدلاً من 75
                            var size=56,stroke=4,r=(size-stroke*2)/2,thresholdAngle=(65/100)*360-90,rad=thresholdAngle*Math.PI/180,cx=size/2,cy=size/2;
                            var x1=cx+(r-6)*Math.cos(rad),y1=cy+(r-6)*Math.sin(rad),x2=cx+(r+2)*Math.cos(rad),y2=cy+(r+2)*Math.sin(rad);
                            return(<svg style={{position:"absolute",inset:0,pointerEvents:"none"}} width={size} height={size}>
                              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gold} strokeWidth={2} strokeLinecap="round" style={{filter:"drop-shadow(0 0 3px "+C.gold+")"}}/>
                              <text x={cx+r*Math.cos(rad)*1.18} y={cy+r*Math.sin(rad)*1.18} textAnchor="middle" dominantBaseline="middle" fill={C.gold} fontSize={5} fontWeight="700">65</text>
                            </svg>);
                          })()}
                                                  
                        </div>

                      </div>
                                            {/* ══ جملة "لماذا الآن" — محسّنة ══ */}
                      {(function(){
                        var vr     = (health.extras && health.extras.vr) || 1;
                        var volPct = Math.round(Math.abs(vr - 1) * 100);
                        var L9     = (health.layers && health.layers.L9) || 50;
                        var L1     = (health.layers && health.layers.L1) || 50;
                        var L7     = (health.layers && health.layers.L7) || 50;
                        var ch     = stk.ch;

                        var why, icon, urgency, whyColor;

                                                // 🔧 إصلاح: توافق "لماذا الآن" مع التصنيف الإجمالي
                        var isStrong = health.score >= 60;  // سهم قوي
                        var isWeak = health.score < 45;     // سهم ضعيف
                        
                        if(vr >= 1.4 && ch > 0 && !isWeak){
                          why      = "الحجم أعلى من المعدل بـ " + volPct + "% -- دخول مؤسسي اليوم";
                          icon     = "🏦"; urgency = "عاجل"; whyColor = C.mint;
                        } else if(vr >= 1.4 && ch > 0 && isWeak){
                          // 🆕 حجم عالٍ على سهم ضعيف = شراء مضاربي
                          why      = "حجم عالٍ بـ " + volPct + "% -- لكن السهم ضعيف هيكلياً (احذر)";
                          icon     = "⚠";  urgency = "حذر"; whyColor = C.amber;
                        } else if(vr >= 1.4 && ch < 0 && isWeak){
                          // ─── سهم ضعيف + حجم بيع = خروج مؤسسي حقيقي ───
                          why      = "حجم بيع مرتفع بـ " + volPct + "% -- خروج مؤسسي محتمل";
                          icon     = "⚠";  urgency = "تحذير"; whyColor = C.coral;
                        } else if(vr >= 1.4 && ch < 0 && isStrong){
                          // ─── سهم قوي + حجم عالٍ + ch سلبي = تصحيح صحي ───
                          // عادةً: profit-taking أو تصحيح اعتيادي في bull
                          var cmfPos = (health.extras && health.extras.cmf > 0.05);
                          if(cmfPos){
                            why    = "حجم عالٍ مع تصحيح -- جني أرباح طبيعي";
                            icon   = "💧"; urgency = "صحي"; whyColor = C.amber;
                          } else {
                            why    = "حجم بيع عالٍ بـ " + volPct + "% -- راقب الإغلاق";
                            icon   = "👁";  urgency = "راقب"; whyColor = C.amber;
                          }

                        } else if(vr >= 1.4 && ch < 0){
                          // ─── الحالة العامة (سهم متوسط) ───
                          why      = "حجم بيع مرتفع بـ " + volPct + "% -- خروج مؤسسي محتمل";
                          icon     = "⚠";  urgency = "تحذير"; whyColor = C.coral;
                        } else if(L1 >= 80 && !isWeak){
                          why      = "هيكل الحركة يُشبه نمط الاختراق الحقيقي";
                          icon     = "📐"; urgency = "إشارة"; whyColor = C.electric;
                        } else if(L9 >= 75 && ch > 0 && !isWeak){
                          why      = "المال الذكي يتراكم -- سيولة مؤسسية إيجابية";
                          icon     = "💧"; urgency = "إيجابي"; whyColor = C.mint;
                        } else if(L9 >= 75 && ch < 0 && isStrong){
                          why      = "سيولة قوية رغم الهبوط -- قد يكون تجميعاً خفياً";
                          icon     = "🔍"; urgency = "راقب"; whyColor = C.amber;
                        } else if(L9 >= 75 && ch < 0 && isWeak){
                          // 🆕 سيولة عالية + هبوط + سهم ضعيف = تصريف
                          why      = "سيولة عالية مع هبوط -- قد يكون تصريفاً مؤسسياً";
                          icon     = "🔻"; urgency = "تحذير"; whyColor = C.coral;
                        } else if(L7 >= 75 && !isWeak){
                          why      = "الاحتمالية الرياضية تدعم استمرار الاتجاه";
                          icon     = "🧮"; urgency = "إشارة"; whyColor = C.electric;
                        } else if(isWeak){
                          // 🆕 رسالة افتراضية للأسهم الضعيفة
                          if(ch < -1) {
                            why      = "ضغط بيعي مستمر -- تجنّب الدخول الآن";
                            icon     = "🔻"; urgency = "تحذير"; whyColor = C.coral;
                          } else {
                            why      = "السهم في مرحلة ضعف -- لا توجد فرصة دخول";
                            icon     = "🛑"; urgency = "تجنّب"; whyColor = C.coral;
                          }
                        } else if(vr < 0.7){
                          why      = "حجم خفيف -- لا توجد حركة مؤسسية اليوم";
                          icon     = "😴"; urgency = "هادئ"; whyColor = C.smoke;
                        } else if(ch > 0.5){
                          why      = "حركة إيجابية -- الحجم مناسب للارتفاع";
                          icon     = "📊"; urgency = "عادي"; whyColor = C.teal;
                        } else {
                          why      = "تراجع طبيعي -- لا ضغط بيعي استثنائي";
                          icon     = "📊"; urgency = "عادي"; whyColor = C.teal;
                        }

                                             return(
                          <>
                          {/* 🆕 تحذير ذروة الشراء (RSI > 75) */}
                          {(health.extras && health.extras.rsiV >= 75) && (
                            <div style={{
                              marginTop:8,
                              background:"rgba(245,158,11,.1)",
                              border:"1px solid rgba(245,158,11,.3)",
                              borderRadius:10,
                              padding:"6px 12px",
                              display:"flex",alignItems:"center",gap:8,
                            }}>
                              <span style={{fontSize:14}}>⚠</span>
                              <div style={{flex:1}}>
                                <div style={{fontSize:9.5,color:C.amber,fontWeight:800}}>
                                  RSI في ذروة الشراء ({Math.round(health.extras.rsiV)})
                                </div>
                                <div style={{fontSize:8.5,color:C.mist,marginTop:1}}>
                                  السهم مرتفع نسبياً - احتمال تصحيح قريب
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div style={{
                            marginTop:8,
                            background: whyColor + "0d",
                            border:"1px solid " + whyColor + "28",
                            borderRadius:10,
                            overflow:"hidden",
                          }}>
                            {/* شريط العنوان */}
                            <div style={{
                              display:"flex",alignItems:"center",gap:6,
                              padding:"4px 10px",
                              background: whyColor + "15",
                              borderBottom:"1px solid " + whyColor + "20",
                            }}>
                              <span style={{fontSize:10}}>{icon}</span>
                              <span style={{
                                fontSize:8,fontWeight:800,
                                color:whyColor,letterSpacing:".3px",
                              }}>لماذا الآن</span>
                              <div style={{
                                marginRight:"auto",
                                background:whyColor+"22",
                                border:"1px solid " + whyColor + "44",
                                borderRadius:4,padding:"1px 6px",
                              }}>
                                <span style={{fontSize:7,fontWeight:800,color:whyColor}}>{urgency}</span>
                              </div>
                            </div>
                            {/* النص */}
                            <div style={{padding:"6px 10px"}}>
                              <span style={{
                                fontSize:9,color:C.mist,
                                lineHeight:1.55,fontWeight:500,
                              }}>{why}</span>
                            </div>                                                   </div>
                          </>
                        );
                      })()}

                      {/* خط القصة -- سعر + حجم + إشارة + زر الكاميرا */}
                      <div style={{marginTop:10,opacity:1,display:"flex",alignItems:"center",gap:8}}>
                        {/* زرّ الكاميرا -- يسار الرسم البياني */}
                        <button
                          onClick={function(e){
                            e.stopPropagation();
                            haptic.tap();
                            shareStockCard(allData.find(function(d){ return d && d.stk && d.stk.sym === stk.sym; }), stk.sym, stk.name, stk.p.toFixed(2), stk.ch.toFixed(2));
                          }}
                          style={{
                            width:36,height:36,
                            borderRadius:10,
                            background:"linear-gradient(135deg," + C.electric + "22," + C.electric + "11)",
                            border:"1px solid " + C.electric + "44",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",
                            boxShadow:"0 2px 8px " + C.electric + "22",
                            flexShrink:0,
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="7" width="18" height="13" rx="2" stroke={C.electric} strokeWidth="2"/>
                            <path d="M8 7L9.5 5h5L16 7" stroke={C.electric} strokeWidth="2" strokeLinejoin="round"/>
                            <circle cx="12" cy="13" r="3.5" stroke={C.electric} strokeWidth="2"/>
                          </svg>
                        </button>
                        
                        {/* الرسم البياني */}
                        <div style={{flex:1,minWidth:0,position:"relative"}}>
                          <StoryChart bars={bars} color={priceColor} score={health.score} h={52}/>
                          {/* علامة مصدر البيانات */}
                          <div style={{
                            position:"absolute",top:2,left:2,
                            display:"flex",alignItems:"center",gap:3,
                            background: isRealData ? "rgba(16,201,126,.15)" : "rgba(245,158,11,.15)",
                            border:"1px solid " + (isRealData ? "rgba(16,201,126,.3)" : "rgba(245,158,11,.3)"),
                            borderRadius:5,padding:"1px 5px",
                          }}>
                            <div style={{
                              width:5,height:5,borderRadius:"50%",
                              background:isRealData?C.mint:C.amber,
                            }}/>
                            <span style={{
                              fontSize:7,fontWeight:700,
                              color:isRealData?C.mint:C.amber,
                            }}>
                              {isRealData ? "حقيقي" : "تجريبي"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ══ بطاقة القرار الثنائية — Kahneman ══
                          System 1: رسالة عاطفية فورية
                          System 2: رقم منطقي دقيق
                          نافذة الفرصة: BJ Fogg — المحفّز الزمني */}
                      <div style={{
                        marginTop:10,display:"flex",flexDirection:"row-reverse",gap:6,
                        paddingTop:10,borderTop:"1px solid rgba(255,255,255,.05)",
                      }}>
{/* System 1 -- العقل السريع -- موحَّد: العنوان واللون والنص لا تتناقض أبداً */}
{(function(){
  var vr = (health.extras && health.extras.vr) || 1;
  var rsiV = (health.extras && health.extras.rsiV) || 50;
  var regime = health.regime;
  var isVolatile = regime === "volatile" || regime === "news-driven";
  var isOverbought = rsiV >= 75;

  var icon, title, subtitle, boxColor;

  if(health.score >= 65){
    if(isOverbought){
      icon = "⚠️"; title = "فرصة بحذر"; boxColor = C.amber;
      subtitle = "RSI مرتفع جداً (" + Math.round(rsiV) + ") - دخول تدريجي فقط";
    } else if(isVolatile){
      icon = "🚀"; title = "فرصة الآن"; boxColor = health.sigC;
      subtitle = "إشارة قوية في سوق متقلب - قلّل الحجم";
    } else {
      icon = "🚀"; title = "فرصة الآن"; boxColor = health.sigC;
      subtitle = "السيولة والزخم يدعمان الدخول";
    }
  } else if(health.score >= 55){
    icon = "👁"; title = "راقب عن قرب"; boxColor = health.sigC;
    subtitle = isVolatile ? "تذبذب عالٍ - انتظر استقراراً" : "انتظر تأكيد الحجم قبل الدخول";
  } else if(health.score >= 45){
    icon = "⚖️"; title = "لا تتسرع"; boxColor = health.sigC;
    subtitle = vr >= 1.5 ? "حجم عالٍ - راقب الاتجاه" : "الإشارة غير حاسمة - تجنّب الدخول";
  } else if(health.score >= 35){
    icon = "🛡"; title = "احتاط"; boxColor = health.sigC;
    if(vr >= 1.5 && stk.ch >= 0) subtitle = "حجم عالٍ رغم الضعف - مضاربي";
    else if(stk.ch < -1) subtitle = "تراجع متواصل - تجنّب";
    else subtitle = "إشارة ضعيفة - لا تشتري";
  } else {
    icon = "🛡"; title = "احتاط"; boxColor = health.sigC;
    subtitle = stk.ch < -2 ? "ضغط بيعي مرتفع - ابتعد" : "إشارة ضعيفة جداً - خطر";
  }

  return(
    <div style={{
      flex:1,
      background:boxColor+"14",
      border:"1px solid " + boxColor + "30",
      borderRadius:12,padding:"9px 12px",
      display:"flex",alignItems:"center",gap:8,
    }}>
      <span style={{fontSize:20,flexShrink:0,lineHeight:1}}>{icon}</span>
      <div>
        <div style={{
          fontSize:11,fontWeight:800,
          color:boxColor,lineHeight:1,marginBottom:3,
        }}>{title}</div>
        <div style={{fontSize:8.5,color:C.smoke,lineHeight:1.3}}>{subtitle}</div>
      </div>
    </div>
  );
})()}


{/* نافذة الفرصة -- مبنية على بيانات الحجم الفعلية */}
{/* 🎯 معايرة: 50 بدلاً من 55 - لتظهر مع "عاجل" */}
{(health.score>=50 || ((health.extras && health.extras.vr) || 1) >= 1.4)&&(function(){
  // ✨ لا نخلق إلحاحاً للشراء عند RSI مرتفع جداً -- نستبدل العداد بشارة تحذير
  var rsiVWindow = (health.extras && health.extras.rsiV) || 50;
  if(rsiVWindow >= 75){
    return(
      <div style={{
        flexShrink:0,width:56,
        background:"linear-gradient(160deg,"+C.amber+"18,"+C.amber+"06)",
        border:"1px solid "+C.amber+"40",
        borderRadius:12,padding:"7px 5px",
        textAlign:"center",
        display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:2,
      }}>
        <div style={{
          fontSize:7,color:C.amber,fontWeight:800,lineHeight:1,
          background:C.amber+"18",borderRadius:4,padding:"1px 5px",
        }}>RSI مرتفع</div>
        <div style={{fontSize:14,lineHeight:1}}>⏸</div>
        <div style={{fontSize:6.5,color:C.smoke,lineHeight:1.3}}>
          لا تستعجل
        </div>
      </div>
    );
  }

                          // ─── فحص حالة السوق السعودي ───
                          var _mk = getKsaMarket();
                          var ksaDay = _mk.day, ksaMin = _mk.mins, isOpen = _mk.isOpen;

                          // ─── السوق مغلق: حسب الوقت المتبقّي للافتتاح ───
                          if(!isOpen){
                            var minsToOpen;
                            if(ksaDay===5){ // الجمعة
                              minsToOpen = ((6-ksaDay)*24*60) + (570 - ksaMin) + 24*60;
                            } else if(ksaDay===6){ // السبت
                              minsToOpen = (24*60) + (570 - ksaMin);
                            } else if(ksaMin < 570){ // قبل الفتح
                              minsToOpen = 570 - ksaMin;
                            } else { // بعد الإغلاق
                              if(ksaDay===4){ // الخميس → الأحد
                                minsToOpen = (3*24*60) + (570 - ksaMin) + 24*60;
                              } else {
                                minsToOpen = (24*60 - ksaMin) + 570;
                              }
                            }
                            var openH = Math.floor(minsToOpen / 60);
                            var openM = minsToOpen % 60;
                            // ✨ تَحويل الأرقام الإنجليزية إلى عربية شرقية
                            var toArabicNum = function(n){
                              var ar = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
                              return String(n).split("").map(function(d){
                                return /\d/.test(d) ? ar[parseInt(d,10)] : d;
                              }).join("");
                            };
                            var hStr = toArabicNum(openH);
                            var mStr = toArabicNum(openM);
                            return(
                              <div style={{
                                flexShrink:0,width:56,
                                background:"linear-gradient(160deg,"+C.coral+"15,"+C.coral+"06)",
                                border:"1px solid "+C.coral+"35",
                                borderRadius:12,padding:"7px 5px",
                                textAlign:"center",
                                display:"flex",flexDirection:"column",
                                alignItems:"center",justifyContent:"center",gap:2,
                              }}>
                                <div style={{
                                  fontSize:7,color:C.coral,fontWeight:800,lineHeight:1,
                                  background:C.coral+"18",borderRadius:4,padding:"1px 5px",
                                }}>مغلق</div>
                                <div style={{
                                  fontSize:11,fontWeight:900,
                                  color:C.coral,lineHeight:1,
                                  direction:"rtl",
                                  whiteSpace:"nowrap",
                                }}>
                                  {hStr}س {mStr}د
                                </div>
                                <div style={{fontSize:6.5,color:C.smoke,lineHeight:1.3}}>
                                  للافتتاح
                                </div>
                              </div>
                            );
                          }

// ─── السوق مفتوح: نافذة الفرصة حسب الحجم ───

                          var vr   = (health.extras && health.extras.vr) || 1;
                          var L9   = (health.layers && health.layers.L9)  || 50;

                          // كلما ارتفع الحجم ضاقت النافذة -- إلحاح حقيقي
                          var windowMins = vr >= 1.5 ? 8
                                        : vr >= 1.3 ? 15
                                        : vr >= 1.1 ? 25
                                        : L9 >= 75  ? 20
                                        : 45;

                          var urgColor = windowMins <= 10 ? C.coral
                                       : windowMins <= 20 ? C.amber
                                       : health.sigC;

                          var urgLabel = windowMins <= 10 ? "عاجل"
                                       : windowMins <= 20 ? "قريب"
                                       : "متاح";

                          return(
                            <div style={{
                              flexShrink:0,width:56,
                              background:"linear-gradient(160deg," + urgColor + "18," + urgColor + "06)",
                              border:"1px solid " + urgColor + "40",
                              borderRadius:12,padding:"7px 5px",
                              textAlign:"center",
                              display:"flex",flexDirection:"column",
                              alignItems:"center",justifyContent:"center",gap:2,
                              position:"relative",
                            }}>

                              <div style={{
                                fontSize:7,color:urgColor,fontWeight:800,lineHeight:1,
                                background:urgColor+"18",borderRadius:4,padding:"1px 5px",
                              }}>{urgLabel}</div>

                              <div style={{fontSize:6.5,color:C.smoke,lineHeight:1.3}}>
                                {windowMins + "د نافذة"}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ══ بطاقة الإجراء الفوري ══
                          سطر واحد — ماذا تفعل الآن بالضبط */}
                                           {(function(){
                        // ════════════════════════════════════════════════════════
                        //  Position Size -- موحد مع analysisEngine
                        //  
                        //  المبدأ:
                        //  • نستخدم health.positionSize.pct (Half-Kelly محسوب)
                        //  • fallback: حساب من L6
                        // ════════════════════════════════════════════════════════
                        var pct;
                        if(health.positionSize && health.positionSize.pct){
                          // الأفضل: من Half-Kelly المحسوب
                          pct = Math.round(health.positionSize.pct);
                        } else {
                          // fallback آمن
                          var kelAdj = (health.layers && health.layers.L6)
                            ? health.layers.L6 / 200
                            : 0.05;
                          pct = Math.max(3, Math.min(20, Math.round(kelAdj * 100)));
                        }
// ✨ موحَّد مع المحفظة: نفس calcSmartStopLoss/calcSmartTakeProfit من positionEngine.js
var atrPct = (health.extras && health.extras.atrPct) || 2.5;
var alertPct = Math.max(0.5, Math.min(3, atrPct * 0.5));

var unifiedStop = calcSmartStopLoss(stk.p, stk.p, health, bars);
var unifiedTargets = calcSmartTakeProfit(stk.p, unifiedStop.stopPrice, health, bars);

var stop = unifiedStop.stopPrice.toFixed(2);
var tgt  = unifiedTargets ? unifiedTargets.t1.price.toFixed(2) : stop;
var alertPrice = (stk.p * (1 + alertPct/100)).toFixed(2);
                        

                        // ✨ Action Plan مع وعي بـ RSI و regime -- لون النص متّسق دائماً مع الخلفية
                        var icon, line1, line2, bg, border, lineColor;
                        var rsiV = (health.extras && health.extras.rsiV) || 50;
                        var isOverbought = rsiV >= 75;
                        var isRegimeVolatile = health.regime === "volatile" || health.regime === "news-driven";
                        
                        if(health.score >= 65){
                          // ─── رسالة سياقية حسب RSI ───
                          if(isOverbought){
                            icon  = "⚠️";
                            line1 = "فرصة شراء بحذر - " + pct + "% من المحفظة";
                            line2 = "RSI مرتفع - ادخل تدريجياً | وقف: " + stop;
                            bg    = "rgba(245,158,11,.10)";
                            border= "rgba(245,158,11,.30)";
                            lineColor = C.amber;
                          } else if(isRegimeVolatile){
                            icon  = "⚠️";
                            line1 = "فرصة شراء (سوق متقلب) - " + pct + "%";
                            line2 = "قلّص الحجم | وقف: " + stop + " · هدف: " + tgt;
                            bg    = "rgba(212,168,67,.10)";
                            border= "rgba(212,168,67,.30)";
                            lineColor = C.gold;
                          } else {
                            icon  = "✅";
                            line1 = "فرصة شراء - " + pct + "% من المحفظة";
                            line2 = "وقف: " + stop + " · هدف: " + tgt;
                            bg    = "rgba(16,201,126,.08)";
                            border= "rgba(16,201,126,.25)";
                            lineColor = C.mint;
                          }
                        } else if(health.score >= 55){
                          icon  = "🔔";
                          line1 = "اضبط تنبيهاً عند " + alertPrice;
                          line2 = "انتظر تأكيد الحجم قبل الشراء";
                          bg    = "rgba(245,158,11,.08)";
                          border= "rgba(245,158,11,.22)";
                          lineColor = C.amber;
                        } else if(health.score >= 45){
                          icon  = "⏸";
                          line1 = "لا توجد إشارة دخول";
                          line2 = "إذا كنت مالكاً: احتفظ وراقب";
                          bg    = "rgba(6,182,212,.07)";
                          border= "rgba(6,182,212,.2)";
                          lineColor = C.teal;
                        } else if(health.score >= 35){
                          icon  = "⚠";
                          line1 = "تجنّب الشراء الآن";
                          line2 = "إذا كنت مالكاً: راجع وقف الخسارة";
                          bg    = "rgba(245,158,11,.08)";
                          border= "rgba(245,158,11,.22)";
                          lineColor = C.amber;
                        } else {
                          icon  = "🔴";
                          line1 = "إشارة ضعف قوية";
                          line2 = "إذا كنت مالكاً: قلّص أو وقف عند " + stop;
                          bg    = "rgba(240,79,90,.08)";
                          border= "rgba(240,79,90,.22)";
                          lineColor = C.coral;
                        }
                                                                                                return(
                          <div>
                          <div style={{
                            marginTop:8,
                            background:bg,
                            border:"1px solid " + border,
                            borderRadius:12,
                            padding:"10px 14px",
                            display:"flex",alignItems:"center",gap:10,
                          }}>
                            <span style={{fontSize:18,flexShrink:0}}>{icon}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{
                                fontSize:11,fontWeight:900,
                                color:lineColor,lineHeight:1,marginBottom:3,
                              }}>{line1}</div>

                              <div style={{
                                fontSize:9,color:C.mist,
                                lineHeight:1.4,direction:"ltr",textAlign:"right",
                              }}>{line2}</div>
                            </div>
                          </div>
                          
                          {/* 🆕 تنبيه التباعد - يظهر فقط عند تعارض CMF/OBV */}
                          {(function(){
                            var ex = health.extras || {};
                            var cmf = ex.cmf;
                            var obvUp = ex.obvRising;
                            if (cmf == null || obvUp == null) return null;
                            
                            // تباعد إيجابي: OBV هابط + CMF إيجابي قوي
                            if (!obvUp && cmf > 0.1) {
                              return (
                                <div style={{
                                  marginTop:6,
                                  background:"rgba(245,158,11,.08)",
                                  border:"1px solid rgba(245,158,11,.25)",
                                  borderRadius:10,
                                  padding:"7px 12px",
                                  display:"flex",alignItems:"center",gap:8,
                                }}>
                                  <span style={{fontSize:14}}>⚠</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:10,fontWeight:800,color:C.amber,marginBottom:2}}>
                                      تباعد إيجابي مكتشف
                                    </div>
                                    <div style={{fontSize:8.5,color:C.mist,lineHeight:1.4}}>
                                      السعر يهبط لكن المال يتدفق - قد يكون تجميعاً خفياً
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            // تباعد سلبي: OBV صاعد + CMF سلبي
                            if (obvUp && cmf < -0.1) {
                              return (
                                <div style={{
                                  marginTop:6,
                                  background:"rgba(240,79,90,.08)",
                                  border:"1px solid rgba(240,79,90,.25)",
                                  borderRadius:10,
                                  padding:"7px 12px",
                                  display:"flex",alignItems:"center",gap:8,
                                }}>
                                  <span style={{fontSize:14}}>⚠</span>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:10,fontWeight:800,color:C.coral,marginBottom:2}}>
                                      تباعد سلبي مكتشف
                                    </div>
                                    <div style={{fontSize:8.5,color:C.mist,lineHeight:1.4}}>
                                      السعر يصعد لكن المال يخرج - قد يكون تصريفاً
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                                                        return null;
                          })()}
                          </div>
                        );
                      })()}
{/* Trading Plan */}
{health.tradingPlan && (function(){

  var tp = health.tradingPlan;
  // ✨ موحَّد: لا نعرض لون "واثق" أخضر إذا كانت البطاقة في حالة تحذير RSI أعلاها
  var sigColor = cardOverbought ? C.amber : (tp.actionColor || health.sigC);

  // ✨ موحَّد مع المحفظة: نفس وقف الخسارة والأهداف من positionEngine.js
  var uStop = calcSmartStopLoss(stk.p, stk.p, health, bars);
  var uTargets = calcSmartTakeProfit(stk.p, uStop.stopPrice, health, bars);
  var uT1 = uTargets ? uTargets.t1 : null;
  var uT2 = uTargets ? uTargets.t2 : null;
  var uRR = uTargets ? uTargets.weightedRR : null;
  var uRRLabel = uRR ? (uRR>=3?"ممتاز ⭐":uRR>=2?"جيد ✓":uRR>=1.5?"مقبول":"ضعيف ⚠") : "";

  return(

                          <div style={{
                            marginTop:10,
                            background:"linear-gradient(135deg," + sigColor + "10," + sigColor + "06)",
                            border:"1px solid " + sigColor + "33",
                            borderRadius:14,
                            overflow:"hidden",
                          }}>
                            {/* عنوان البطاقة */}
                            <div style={{
                              display:"flex",alignItems:"center",justifyContent:"space-between",
                              padding:"8px 12px",
                              background:sigColor + "15",
                              borderBottom:"1px solid " + sigColor + "20",
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                <span style={{fontSize:13}}>🎯</span>
                                <span style={{fontSize:10,fontWeight:800,color:sigColor,letterSpacing:".3px"}}>
                                  خطة التداول الاحترافية
                                </span>
                              </div>
                              {tp.timeHorizon && (
                                <div style={{
                                  background:sigColor + "20",
                                  border:"1px solid " + sigColor + "33",
                                  borderRadius:5,padding:"1px 8px",
                                }}>
                                  <span style={{fontSize:8,fontWeight:700,color:sigColor}}>
                                    ⏱ {tp.timeHorizon}
                                  </span>
                                </div>
                              )}
                            </div>
                            {cardOverbought && (
                              <div style={{
                                padding:"6px 12px",
                                background:C.amber+"10",
                                borderBottom:"1px solid "+C.amber+"20",
                                display:"flex",alignItems:"center",gap:6,
                              }}>
                                <span style={{fontSize:10}}>⚠️</span>
                                <span style={{fontSize:8,color:C.amber,fontWeight:700}}>
                                  RSI مرتفع جداً -- هذه الخطة افتراضية حتى يهدأ الزخم
                                </span>
                              </div>
                            )}

                            
                            {/* جسم البطاقة */}
                            <div style={{padding:"10px 12px"}}>
                              {/* الصف الأول: Entry + Stop + Target1 + Target2 */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                                {/* Entry -- موحَّد: نفس السعر الحالي المستخدم لحساب uStop/uTargets */}
                                <div style={{
                                  background:"rgba(255,255,255,.03)",
                                  border:"1px solid rgba(255,255,255,.06)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>📍</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>الدخول</span>
                                  </div>
                                  <div className="num" style={{fontSize:14,fontWeight:900,color:C.snow,direction:"ltr"}}>
                                    {stk.p.toFixed(2)}
                                  </div>
                                </div>
                                
                                {/* Stop Loss */}
                                <div style={{
                                  background:"rgba(240,79,90,.06)",
                                  border:"1px solid rgba(240,79,90,.18)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>🛡️</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>وقف الخسارة</span>
                                  </div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
                                    <div className="num" style={{fontSize:13,fontWeight:900,color:C.coral}}>
{uStop.stopPrice.toFixed(2)}

                                    </div>
                                    <div style={{fontSize:8,fontWeight:700,color:C.coral}}>
({uStop.stopPct.toFixed(1)}%)

                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* الصف الثاني: Target1 + Target2 */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                                {/* Target 1 */}
                                <div style={{
                                  background:"rgba(16,201,126,.06)",
                                  border:"1px solid rgba(16,201,126,.18)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>🎯</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>الهدف الأول</span>
                                  </div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
                                    <div className="num" style={{fontSize:13,fontWeight:900,color:C.mint}}>
{uT1 ? uT1.price.toFixed(2) : "-"}

                                    </div>
                                    <div style={{fontSize:8,fontWeight:700,color:C.mint}}>
(+{uT1 ? uT1.pct.toFixed(1) : "-"}%)

                                    </div>
                                  </div>
                                </div>
                                
{/* Target 2 */}
<div style={{
  background:"rgba(16,201,126,.09)",
  border:"1px solid rgba(16,201,126,.25)",
  borderRadius:8,padding:"6px 8px",
}}>
  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
    <span style={{fontSize:9}}>🚀</span>
    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>الهدف الثاني</span>
  </div>
  <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
    <div className="num" style={{fontSize:13,fontWeight:900,color:C.mint}}>
      {uT2 ? uT2.price.toFixed(2) : "-"}
    </div>
    <div style={{fontSize:8,fontWeight:700,color:C.mint}}>
      (+{uT2 ? uT2.pct.toFixed(1) : "-"}%)
    </div>
  </div>
</div>
                              </div>

                              
                              {/* الصف الثالث: R/R Ratio + Worst Case */}
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                                {/* R/R Ratio */}
                                <div style={{
                                  background:"rgba(212,168,67,.06)",
                                  border:"1px solid rgba(212,168,67,.2)",
                                  borderRadius:8,padding:"6px 8px",
                                }}>
                                  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                    <span style={{fontSize:9}}>📊</span>
                                    <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>المخاطرة/العائد</span>
                                  </div>
                                  <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                                    <div className="num" style={{fontSize:13,fontWeight:900,color:C.gold}}>
{uRR ? uRR + ":1" : "-"}

                                    </div>
                                    <div style={{fontSize:8,color:C.gold,fontWeight:700}}>
{uRRLabel}

                                    </div>
                                  </div>
                                </div>

                                
                                {/* Worst Case */}
  {uStop && (
                                  <div style={{
                                    background:"rgba(245,158,11,.06)",
                                    border:"1px solid rgba(245,158,11,.2)",
                                    borderRadius:8,padding:"6px 8px",
                                  }}>
                                    <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                                      <span style={{fontSize:9}}>💀</span>
                                      <span style={{fontSize:8,color:C.smoke,fontWeight:600}}>أسوأ سيناريو</span>
                                    </div>
                                    <div style={{display:"flex",alignItems:"baseline",gap:4,direction:"ltr"}}>
                                      <div className="num" style={{fontSize:13,fontWeight:900,color:C.amber}}>
-{Math.abs(uStop.stopPct).toFixed(1)}%

                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Action Plan - السطر الأخير */}
                              {tp.actionPlan && (
                                <div style={{
                                  background:sigColor + "18",
                                  border:"1px solid " + sigColor + "44",
                                  borderRadius:10,padding:"8px 12px",
                                  display:"flex",alignItems:"center",gap:8,
                                }}>
                                  <span style={{fontSize:16,flexShrink:0}}>🎬</span>
                                  <div style={{flex:1}}>
                                    <div style={{
                                      fontSize:11,fontWeight:900,
                                      color:sigColor,lineHeight:1.3,
                                    }}>{tp.actionPlan}</div>
                                    {tp.riskWarning && 
                                     tp.riskWarning !== tp.actionPlan && 
                                     !tp.actionPlan.includes(tp.riskWarning) &&
                                     !tp.riskWarning.includes(tp.actionPlan) && (
                                      <div style={{
                                        fontSize:8,color:C.amber,
                                        marginTop:3,lineHeight:1.4,
                                      }}>
                                        ⚠ {tp.riskWarning}
                                      </div>
                                    )}
                                  </div> 
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ البوابات الثلاث + مصفوفة الفرصة ══ */}
                      {(function(){
                        var gates = health.gates || {};
                        var opp   = health.opp   || {};
                        if(!gates.g1l) return null;

                        var gateItems = [
                          {pass:gates.g1, label:"السيولة",  score:gates.g1s||0, desc:gates.g1l||"",  icon:"💧"},
                          {pass:gates.g2, label:"الهيكل",   score:gates.g2s||0, desc:gates.g2l||"",  icon:"🏗"},
                          {pass:gates.g3, label:"الزخم",    score:gates.g3s||0, desc:gates.g3l||"",  icon:"⚡"},
                        ];

                        return(
                          <div style={{marginTop:8}}>
                            {/* عنوان */}
                            <div style={{
                              display:"flex",alignItems:"center",
                              justifyContent:"space-between",marginBottom:6,
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <div style={{width:3,height:12,background:C.electric,borderRadius:2}}/>
                                <span style={{fontSize:9,fontWeight:700,color:C.smoke,letterSpacing:".4px"}}>
                                  البوابات الثلاث
                                </span>
                              </div>
                              {/* مصفوفة الفرصة */}
                              <div style={{
                                display:"flex",alignItems:"center",gap:4,
                                background:(opp.color||C.smoke)+"18",
                                border:"1px solid " + (opp.color||C.smoke) + "35",
                                borderRadius:8,padding:"3px 10px",
                              }}>
                                <span style={{fontSize:8,fontWeight:800,color:opp.color||C.smoke}}>
                                  {opp.matrix||"--"}
                                </span>
                              </div>
                            </div>

                            {/* البوابات */}
                            <div style={{display:"flex",gap:5}}>
                              {gateItems.map(function(g,i){
                                var passColor = g.pass ? C.mint : C.coral;
                                var barW      = Math.min(100, g.score);
                                return(
                                  <div key={i} style={{
                                    flex:1,
                                    background: g.pass ? "rgba(16,201,126,.07)" : "rgba(240,79,90,.07)",
                                    border:"1px solid " + (g.pass ? C.mint+"30" : C.coral+"30"),
                                    borderRadius:10,padding:"8px 8px 6px",
                                    position:"relative",overflowX:"hidden",
                                    textAlign:"center",
                                  }}>
                                    {/* أيقونة + حالة */}
                                    <div style={{
                                      display:"flex",alignItems:"center",
                                      justifyContent:"center",marginBottom:5,
                                    }}>
                                      <span style={{
                                        fontSize:9,fontWeight:900,
                                        color:passColor,lineHeight:1,
                                      }}>
                                        {g.pass ? "✓" : "✗"}
                                      </span>
                                    </div>
                                    {/* الاسم */}
                                    <div style={{
                                      fontSize:8,fontWeight:700,
                                      color:C.snow,marginBottom:2,
                                      textAlign:"center",
                                    }}>{g.label}</div>
                                    {/* الدرجة */}
                                    <div style={{
                                      fontSize:11,fontWeight:900,
                                      color:passColor,lineHeight:1,marginBottom:4,
                                      textAlign:"center",
                                    }}>{g.score}</div>
                                    {/* شريط */}
                                    <div style={{
                                      height:3,background:C.ash+"44",
                                      borderRadius:2,overflow:"hidden",
                                    }}>
                                      <div style={{
                                        height:"100%",
                                        width:barW+"%",
                                        background:passColor,
                                        borderRadius:2,
                                        transition:"width .8s cubic-bezier(.4,0,.2,1)",
                                      }}/>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* ملاحظة إذا فشلت بوابة */}
                            {!gates.all&&(
                              <div style={{
                                marginTop:6,
                                display:"flex",alignItems:"center",gap:6,
                                background:"rgba(245,158,11,.07)",
                                border:"1px solid rgba(245,158,11,.2)",
                                borderRadius:8,padding:"5px 10px",
                              }}>
                                <span style={{fontSize:10}}>⚠</span>
                                <span style={{fontSize:8,color:C.amber,lineHeight:1.4}}>
                                  {gates.passed===2
                                    ? "بوابة واحدة لم تُجتز — الإشارة مخففة بـ 18%"
                                    : gates.passed===1
                                    ? "بوابتان لم تُجتزا — الإشارة مخففة بـ 38%"
                                    : "جميع البوابات فشلت — لا توجد إشارة موثوقة"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ══════════════════════════════════════════════════════
                          🧠 CONVICTION CARD -- Single Source of Truth
                          
                          يعرض من analysisEngine (الإصلاحات 1+10):
                          • convictionScore (منفصل عن score)
                          • convictionLabel ("ثقة عالية ⭐")
                          • convictionColor
                          • convictionAlignment (متوافق/أعلى/أقل)
                          • convictionGap
                      ══════════════════════════════════════════════════════ */}
                      {health.convictionScore != null && (function(){
                        var cs = health.convictionScore;
                        var cLabel = health.convictionLabel || "";
                        var cColor = health.convictionColor || C.electric;
                        var alignment = health.convictionAlignment || "متوافق";
                        var gap = health.convictionGap || 0;
                        var score = health.score;
                        
                        // تحديد رسالة Alignment
                        var alignMsg, alignIcon, alignColor;
                        if(alignment === "متوافق"){
                          alignMsg = "محرك الثقة يدعم تقييم Score";
                          alignIcon = "✓";
                          alignColor = C.mint;
                        } else if(alignment === "أعلى من Score"){
                          alignMsg = "ensemble داعم - ثقة إضافية";
                          alignIcon = "↑";
                          alignColor = C.mint;
                        } else {
                          alignMsg = "ensemble متحفظ - تحقّق قبل الدخول";
                          alignIcon = "↓";
                          alignColor = C.amber;
                        }
                        
                        return(
                          <div style={{
                            marginTop:8,
                            background:"linear-gradient(135deg," + cColor + "0c," + cColor + "04)",
                            border:"1px solid " + cColor + "28",
                            borderRadius:12,
                            overflow:"hidden",
                          }}>
                            {/* عنوان */}
                            <div style={{
                              display:"flex",alignItems:"center",justifyContent:"space-between",
                              padding:"6px 12px",
                              background:cColor + "10",
                              borderBottom:"1px solid " + cColor + "18",
                            }}>
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <span style={{fontSize:11}}>🧠</span>
                                <span style={{fontSize:9,fontWeight:800,color:cColor,letterSpacing:".3px"}}>
                                  محرك الثقة (Ensemble Voting)
                                </span>
                              </div>
                              <div style={{
                                background:cColor + "20",
                                border:"1px solid " + cColor + "33",
                                borderRadius:5,padding:"1px 7px",
                              }}>
                                <span style={{fontSize:8,fontWeight:700,color:cColor}}>
                                  {cLabel}
                                </span>
                              </div>
                            </div>
                            
                            {/* جسم البطاقة */}
                            <div style={{padding:"10px 12px"}}>
                              {/* المقارنة المرئية: Score vs Conviction */}
                              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                                {/* Score */}
                                <div style={{flex:1,textAlign:"center"}}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:2}}>جودة الإشارة</div>
                                  <div className="num" style={{
                                    fontSize:22,fontWeight:900,
                                    color:health.sigC,lineHeight:1,
                                  }}>{score}</div>
                                  <div style={{fontSize:7,color:C.smoke,marginTop:2}}>Score</div>
                                </div>
                                
                                {/* السهم */}
                                <div style={{flex:0,textAlign:"center"}}>
                                  <div style={{
                                    fontSize:18,
                                    color: gap > 5 ? C.mint : gap < -5 ? C.amber : C.smoke,
                                    fontWeight:900,lineHeight:1,
                                  }}>
                                    {gap > 5 ? "↗" : gap < -5 ? "↘" : "→"}
                                  </div>
                                  <div style={{fontSize:7,color:C.smoke,marginTop:3}}>
                                    {gap > 0 ? "+" : ""}{gap}
                                  </div>
                                </div>
                                
                                {/* Conviction */}
                                <div style={{flex:1,textAlign:"center"}}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:2}}>ثقة القرار</div>
                                  <div className="num" style={{
                                    fontSize:22,fontWeight:900,
                                    color:cColor,lineHeight:1,
                                  }}>{cs}</div>
                                  <div style={{fontSize:7,color:cColor,marginTop:2,fontWeight:700}}>Conviction</div>
                                </div>
                              </div>
                              
                              {/* رسالة Alignment */}
                              <div style={{
                                background:alignColor + "10",
                                border:"1px solid " + alignColor + "25",
                                borderRadius:8,padding:"5px 10px",
                                display:"flex",alignItems:"center",gap:6,
                              }}>
                                <span style={{
                                  fontSize:10,fontWeight:900,
                                  color:alignColor,
                                }}>{alignIcon}</span>
                                <div style={{flex:1}}>
                                  <div style={{
                                    fontSize:9,fontWeight:700,
                                    color:alignColor,lineHeight:1.2,marginBottom:1,
                                  }}>{alignment}</div>
                                  <div style={{
                                    fontSize:8,color:C.mist,lineHeight:1.4,
                                  }}>{alignMsg}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}


                      {/* ══ KPI Panel: Probability + PositionSize + Confidence ══ */}
                      {(function(){
                        var prob  = health.probability  || {};
                        var ps    = health.positionSize  || {};
                        var conf  = health.confidence    || 50;
   // ✨ توحيد القيم: ≤ 1 = نسبة (× 100)، > 1 = مئوية بالفعل
var normalizeProb = function(v) {
  if (v == null) return null;
  return Math.round(v <= 1 ? v * 100 : v);
};
var bull = normalizeProb(prob.bull);
var bear = normalizeProb(prob.bear);
var neut = normalizeProb(prob.neutral);
                                                                                                var pct   = ps.pct     != null ? ps.pct.toFixed(1)          : null;
                        var kelly = ps.kelly   != null ? ps.kelly.toFixed(1)        : null;
                        // 🔧 إصلاح: إضافة fallback للـ recommended
                        var recK  = ps.recommended;
                        if (!recK || recK === "") {
                          var kellyNum = parseFloat(kelly);
                          if (kellyNum >= 15) recK = "حجم كبير";
                          else if (kellyNum >= 8) recK = "حجم متوسط";
                          else if (kellyNum >= 3) recK = "حجم صغير";
                          else if (kellyNum > 0) recK = "حجم ضئيل";
                          else recK = "لا توصية";
                        }
                        if(bull==null && pct==null) return null;
                        return(
                          <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                            {/* عنوان */}
                            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                              <div style={{width:3,height:12,background:C.plasma,borderRadius:2}}/>
                              <span style={{fontSize:9,fontWeight:700,color:C.smoke,letterSpacing:".4px"}}>
                                محرك الاحتمالات وإدارة المركز
                              </span>
                            </div>

                                                        {/* الاحتمالات الثلاثة + تفسير */}
                            {bull!=null&&(
                              <div style={{
                                background:C.layer2,border:"1px solid "+C.edge,
                                borderRadius:12,padding:"10px 12px",
                              }}>
                                <div style={{fontSize:8,color:C.smoke,marginBottom:8,fontWeight:600,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                                  الاحتمال الموزون -- Softmax₃
                                  <Tooltip termKey="Softmax" size="small"/>
                                </div>
                                
                                {/* ✨ رسالة تفسيرية -- توافق Probability مع Sig */}
                                {(function(){
                                  var maxProb = Math.max(bull, bear, neut);
                                  var dominant = maxProb === bull ? "صاعد" 
                                              : maxProb === bear ? "هابط" 
                                              : "محايد";
                                  var sigPositive = health.sig === "شراء قوي" || health.sig === "مراقبة";
                                  var sigNegative = health.sig === "تخفيف";
                                  
                                  // ─── تحديد الرسالة ───
                                  var msg = null;
                                  var msgColor = C.smoke;
                                  var msgIcon = "ℹ";
                                  
                                  if(sigPositive && dominant === "صاعد" && maxProb >= 60){
                                    msg = "إجماع قوي على الصعود ✓";
                                    msgColor = C.mint;
                                    msgIcon = "🎯";
                                  } else if(sigPositive && dominant === "صاعد" && maxProb >= 45){
                                    msg = "ميل صاعد لكن غير حاسم";
                                    msgColor = C.amber;
                                    msgIcon = "⚖";
                                  } else if(sigPositive && dominant === "صاعد" && maxProb < 45){
                                    msg = "الإشارة قوية لكن الاحتمالات متذبذبة - قلّص الحجم";
                                    msgColor = C.amber;
                                    msgIcon = "⚠";
                                  } else if(sigPositive && dominant !== "صاعد"){
                                    msg = "تعارض: الإشارة إيجابية لكن الاحتمالات تشير لـ " + dominant;
                                    msgColor = C.coral;
                                    msgIcon = "⚠";
                                  } else if(sigNegative && dominant === "هابط"){
                                    msg = "إجماع على الضعف ✗";
                                    msgColor = C.coral;
                                    msgIcon = "🛑";
                                  } else if(dominant === "محايد"){
                                    msg = "السوق في حيرة - انتظر اتجاهاً واضحاً";
                                    msgColor = C.amber;
                                    msgIcon = "⚖";
                                  }
                                  
                                  if(!msg) return null;
                                  
                                  return(
                                    <div style={{
                                      background: msgColor + "10",
                                      border: "1px solid " + msgColor + "25",
                                      borderRadius:6,padding:"4px 8px",
                                      marginBottom:8,
                                      display:"flex",alignItems:"center",gap:5,
                                    }}>
                                      <span style={{fontSize:9}}>{msgIcon}</span>
                                      <span style={{
                                        fontSize:8.5,color:msgColor,
                                        lineHeight:1.3,fontWeight:600,
                                      }}>{msg}</span>
                                    </div>
                                  );
                                })()}
                                <div style={{display:"flex",gap:6}}>
                                  {[
                                    {l:"صاعد",v:bull,c:C.mint},
                                    {l:"هابط",v:bear,c:C.coral},
                                    {l:"محايد",v:neut,c:C.amber},
                                  ].map(function(it,i){
                                    return(
                                      <div key={i} style={{flex:1,textAlign:"center"}}>
                                        <div style={{
                                          fontSize:20,fontWeight:900,
                                          color:it.c,lineHeight:1,
                                        }}>{it.v}%</div>
                                        <div style={{
                                          height:4,background:C.ash+"33",
                                          borderRadius:2,margin:"4px 0",overflow:"hidden",
                                        }}>
                                          <div style={{
                                            height:"100%",width:it.v+"%",
                                            background:it.c,borderRadius:2,
                                            transition:"width .8s ease",
                                          }}/>
                                        </div>
                                        <div style={{fontSize:8,color:C.ash}}>{it.l}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* حجم المركز + Kelly + الثقة */}
                            {pct!=null&&(
                              <div style={{display:"flex",gap:6}}>
                                <div style={{
                                  flex:2,background:C.layer2,
                                  border:"1px solid "+(cardOverbought?C.amber+"33":C.edge),
                                  borderRadius:12,padding:"10px 12px",
                                }}>
                                                                    <div style={{fontSize:8,color:C.smoke,marginBottom:4,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                                    حجم المركز (Half-Kelly)
                                    <Tooltip termKey="حجم المركز" size="small"/>
                                  </div>
                                  <div style={{
                                    fontSize:22,fontWeight:900,
                                    color:cardOverbought?C.amber:(health.sigC||C.gold),lineHeight:1,
                                  }}>{pct}%</div>
                                  <div style={{fontSize:8,color:C.ash,marginTop:3}}>
                                    Kelly كامل: {kelly}% · {recK||""}
                                  </div>
                                  {cardOverbought && (
                                    <div style={{fontSize:7,color:C.amber,marginTop:3,fontWeight:600}}>
                                      ⚠ قلّص الحجم -- RSI مرتفع
                                    </div>
                                  )}
                                </div>

                                                                                                <div style={{
                                  flex:1,background:C.layer2,
                                  border:"1px solid "+C.edge,
                                  borderRadius:12,padding:"10px 12px",
                                  display:"flex",flexDirection:"column",
                                  alignItems:"center",justifyContent:"center",
                                }}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:1,display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}>
                                    ثقة الحجم
                                    <Tooltip termKey="الثقة" size="small"/>
                                  </div>
                                  <div style={{fontSize:6,color:C.ash,marginBottom:3,textAlign:"center"}}>
                                    موثوقية حساب النسبة
                                  </div>

                                  <div style={{
                                    fontSize:22,fontWeight:900,
                                    color:conf>=70?C.mint:conf>=50?C.amber:C.coral,
                                    lineHeight:1,
                                  }}>{conf}%</div>
                                  
                                  {/* ✨ سبب انخفاض الثقة (إذا منخفضة) */}
                                  {conf < 60 && (function(){
                                    var reason = null;
                                    var rsiV = (health.extras && health.extras.rsiV) || 50;
                                    var isVolatile = health.regime === "volatile" || health.regime === "news-driven";
                                    var gatesPassed = (health.gates && health.gates.passed) || 0;
                                    
                                    if(isVolatile) reason = "سوق متقلب";
                                    else if(rsiV >= 75) reason = "RSI مرتفع";
                                    else if(rsiV <= 25) reason = "RSI منخفض";
                                    else if(gatesPassed < 2) reason = "بوابات ضعيفة";
                                    else reason = "إشارات متضاربة";
                                    
                                    return(
                                      <div style={{
                                        fontSize:6.5,color:C.smoke,
                                        marginTop:3,fontWeight:600,
                                        textAlign:"center",
                                      }}>
                                        ⚠ {reason}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ══ مؤشرات متقدمة — من محرك الـ 9 طبقات ══ */}
                      {(function(){
                        var ex = health.extras || {};
                        if(!ex.rsiV && !ex.macdH) return null;
                        var rsiV   = ex.rsiV;
                        var macdH  = ex.macdH;
                        var adxV   = ex.adxV;
                        var adxBull= ex.adxBull;
                        var wyPh   = ex.wyPhase;
                        var msLbl  = ex.msLabel || (ex.bosBull ? "كسر هيكل صاعد ↑" : "");
                        var obLbl  = ex.obLabel || (ex.inBullOB ? "Order Block صاعد" : "");
                        var sslLbl = ex.sslLabel|| (ex.recoveredSSL ? "انتعاش SSL" : "");
                        var cmfV   = ex.cmf;
                        var obvUp  = ex.obvRising;
                        var vwapD  = ex.vwapDev;
                        var macroE = ex.macroEnv;
                        var macroS = ex.macroScore;
                        var rsiColor = rsiV>=75?C.coral:rsiV<30?C.mint:C.amber;

                        var macdColor= macdH>0?C.mint:C.coral;
                        var adxColor = adxV>35?C.electric:adxV>25?C.amber:C.ash;
                        return(
                          <div style={{marginTop:8}}>
                            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                              <div style={{width:3,height:12,background:C.teal,borderRadius:2}}/>
                              <span style={{fontSize:9,fontWeight:700,color:C.smoke,letterSpacing:".4px"}}>
                                المؤشرات التقنية والهيكلية
                              </span>
                            </div>
                            {/* Row 1: RSI + MACD + ADX */}
                            <div style={{display:"flex",gap:5,marginBottom:5}}>
                              {[
                                                                                                {l:"RSI", v:rsiV!=null?rsiV.toFixed(0):"-",
                                  c:rsiV==null?C.ash:rsiColor,
                                  // 🔧 موحَّد مع باقي البطاقة: عتبة 75 (لا 70) لذروة الشراء + حماية null
                                  s:rsiV==null?"لا بيانات":
                                    rsiV>85?"ذروة شراء شديدة ⚠":
                                    rsiV>=75?"ذروة شراء ⚠":
                                    rsiV<20?"ذروة بيع شديدة":
                                    rsiV<30?"ذروة بيع":
                                    rsiV>55?"محايد قوي":
                                    rsiV>45?"محايد":"ضعيف"},
                                {l:"MACD", v:macdH!=null?(macdH>0?"+":"")+macdH.toFixed(3):"-",
                                  c:macdH==null?C.ash:macdColor,
                                  s:macdH==null?"لا بيانات":macdH>0?"إيجابي":"سلبي"},
                                                                {l:"ADX", v:adxV!=null?adxV:"-",
                                  c:adxV==null?C.ash:adxColor,
                                  // 🔧 إصلاح: إضافة الاتجاه لـ "اتجاه نشط" أيضاً + حماية null
                                  s:adxV==null?"لا بيانات":
                                    adxV>35?"اتجاه قوي "+((adxBull?"↑":"↓")):adxV>25?"اتجاه نشط "+((adxBull?"↑":"↓")):adxV>15?"اتجاه ضعيف":"عرضي"},
                              ].map(function(it,i){

                                return(
                                  <div key={i} style={{
                                    flex:1,background:C.layer2,
                                    border:"1px solid "+C.edge,
                                    borderRadius:10,padding:"8px 8px 6px",
                                    textAlign:"center",
                                  }}>
                                                                   <div style={{fontSize:7,color:C.ash,marginBottom:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                                      {it.l}
                                      <Tooltip termKey={it.l} size="small"/>
                                    </div>     
                                    <div style={{fontSize:14,fontWeight:900,color:it.c,lineHeight:1}}>{it.v}</div>
                                    <div style={{fontSize:7,color:C.ash,marginTop:3,lineHeight:1.3}}>{it.s}</div>
                                  </div>
                                );
                              })}
                            </div>
                                                        {/* Row 2: CMF + OBV + VWAP */}
                            {/* 🔧 إصلاح: تحسين VWAP وكشف تباعد CMF/OBV */}
                            <div style={{display:"flex",gap:5,marginBottom:5}}>
                              {[
                                {l:"CMF", v:cmfV!=null?cmfV.toFixed(2):"-",
                                  c:cmfV==null?C.ash:(cmfV>0.05?C.mint:cmfV<-0.05?C.coral:C.amber),
                                  // 🔧 موحَّد مع بطاقة التحذير الكبيرة: عتبة 0.1 لكشف "تباعد" (لا 0.05) + حماية null
                                  s:cmfV==null?"لا بيانات":
                                    (cmfV>0.1 && obvUp===false)?"تباعد إيجابي ⚠":
                                    (cmfV<-0.1 && obvUp===true)?"تباعد سلبي ⚠":
                                    cmfV>0.15?"تدفق قوي":cmfV>0?"تدفق إيجابي":cmfV<-0.05?"ضغط بيع":"محايد"},
                                {l:"OBV", v:obvUp!=null?(obvUp?"صاعد ↑":"هابط ↓"):"-",
                                  c:obvUp==null?C.ash:(obvUp?C.mint:C.coral),
                                  // 🔧 موحَّد مع بطاقة التحذير الكبيرة: عتبة 0.1 + حماية null
                                  s:obvUp==null?"لا بيانات":
                                    (obvUp && cmfV!=null && cmfV<-0.1)?"يصعد مع ضغط بيع":
                                    (!obvUp && cmfV!=null && cmfV>0.1)?"يهبط مع تدفق إيجابي":
                                    obvUp?"تأكيد صعود":"تباعد سلبي"},
                                {l:"VWAP", v:vwapD!=null?vwapD.toFixed(1)+"%":"-",
                                  c:vwapD==null?C.ash:(vwapD>2?C.mint:vwapD<-2?C.coral:vwapD<-1?C.amber:vwapD>1?C.electric:C.amber),
                                  // 🆕 وصف أدق لـ VWAP + حماية null
                                  s:vwapD==null?"لا بيانات":
                                    vwapD>5?"فوق VWAP بقوة":
                                    vwapD>2?"فوق VWAP":
                                    vwapD>1?"يصعد فوق VWAP":
                                    vwapD>-1?"عند VWAP":
                                    vwapD>-3?"يهبط تحت VWAP":
                                    "تحت VWAP بقوة"},
                              ].map(function(it,i){

                                return(
                                  <div key={i} style={{
                                    flex:1,background:C.layer2,
                                    border:"1px solid "+C.edge,
                                    borderRadius:10,padding:"8px 8px 6px",
                                    textAlign:"center",
                                  }}>
                                          <div style={{fontSize:7,color:C.ash,marginBottom:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3}}>
                                      {it.l}
                                      <Tooltip termKey={it.l} size="small"/>
                                    </div>
                                    <div style={{fontSize:12,fontWeight:800,color:it.c,lineHeight:1}}>{it.v}</div>
                                    <div style={{fontSize:7,color:C.ash,marginTop:3,lineHeight:1.3}}>{it.s}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Row 3: Wyckoff + Market Structure + Macro */}
                            {(wyPh||msLbl||macroE)&&(
                              <div style={{
                                background:C.layer2,border:"1px solid "+C.edge,
                                borderRadius:10,padding:"8px 10px",
                                display:"flex",gap:8,alignItems:"flex-start",
                              }}>
                                                                {wyPh&&(
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2,display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
                                      وايكوف
                                      <Tooltip termKey="Wyckoff" size="small"/>
                                    </div>
                                    <div style={{fontSize:10,fontWeight:700,color:C.teal,
                                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wyPh}</div>
                                  </div>
                                )}
                                                                {msLbl&&(
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2,display:"flex",alignItems:"center",gap:3,justifyContent:"center"}}>
                                      الهيكل
                                      <Tooltip termKey="BOS" size="small"/>
                                    </div>
                                    <div style={{fontSize:9,fontWeight:700,color:ex.bosBull?C.mint:C.coral,
                                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msLbl}</div>
                                  </div>
                                )}
                                {macroE&&(
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2}}>الاقتصاد</div>
                                    <div style={{fontSize:9,fontWeight:700,
                                      color:macroE==="إيجابي"?C.mint:macroE==="سلبي"?C.coral:C.amber,
                                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"
                                    }}>{macroE} {macroS!=null?"("+macroS+"/20)":""}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* زر ٩ طبقات + Progressive Disclosure */}
                      {!selected&&(
                        <div style={{
                          marginTop:8,display:"flex",alignItems:"center",
                          justifyContent:"space-between",
                          paddingTop:8,borderTop:"1px solid rgba(255,255,255,.04)",
                        }}>
                          {discovered.indexOf(stk.sym) !== -1
                            ? (
                              <div style={{display:"flex",alignItems:"center",gap:4}}>
                                <span style={{fontSize:10,color:C.mint}}>✓</span>
                                <span style={{fontSize:8,color:C.mint,fontWeight:600}}>تم تحليله</span>
                              </div>
                            ) : (
                              <span style={{fontSize:8,color:C.smoke}}>اضغط للتفاصيل</span>
                            )
                          }
                                                    <button
                            onClick={function(e){
                              e.stopPropagation();
                              haptic.strong();
                              setFullAnalysis(stk.sym);
                              setDiscovered(function(prev){
                                if(prev.indexOf(stk.sym) !== -1) return prev;
                                return prev.concat([stk.sym]);
                              });
                            }}
                            style={{
                              display:"flex",alignItems:"center",gap:5,
                              background:"linear-gradient(135deg," + health.sigC + "20," + health.sigC + "0a)",
                              border:"1px solid " + health.sigC + "40",
                              borderRadius:8,padding:"5px 12px",cursor:"pointer",
                              fontFamily:"Cairo,sans-serif",fontSize:10,fontWeight:700,
                              color:health.sigC,
                            }}>
                            <span>🔬</span>
                            <span>٩ طبقات</span>
                          </button>
                        </div>
                      )}

                      {/* Progressive Disclosure hint — يظهر فقط على البطاقات المغلقة */}
                      {!selected&&(
                        <div style={{
                          display:"flex",alignItems:"center",justifyContent:"center",
                          gap:4,paddingTop:6,marginTop:2,
                          borderTop:"1px solid rgba(255,255,255,.04)",
                        }}>
                          <div style={{display:"flex",gap:3}}>
                            {[0,1,2].map(function(i){
                              return(
                                <div key={i} style={{
                                  width:4,height:4,borderRadius:"50%",
                                  background: i===1 ? health.sigC : health.sigC+"44",
                                  animation:"pulse " + (1.5+i*0.3) + "s ease-in-out infinite",
                                  animationDelay: i*0.2 + "s",
                                }}/>
                              );
                            })}
                          </div>
                          <span style={{fontSize:8,color:C.smoke}}>اضغط لعرض التحليل</span>
                        </div>
                      )}
                    </div>

                    {/* ─ لوحة التفاصيل المُبسَّطة ─ */}
                    {selected&&(
                      <div style={{
                        borderTop:"1px solid " + health.sigC + "33",
                        animation:"expandDown .3s cubic-bezier(.16,1,.3,1) both",
                      }}>
                        {/* زر الطي — في الأعلى لراحة اليد الواحدة */}
                                                <button
                          onClick={function(e){
                            e.stopPropagation();
                            haptic.tap();
                            setSel(null);
                            setRareAlert(null);
                          }}
                          style={{
                            width:"100%",padding:"8px",
                            background:"rgba(255,255,255,.03)",
                            border:"none",
                            borderBottom:"1px solid rgba(255,255,255,.05)",
                            cursor:"pointer",
                            display:"flex",alignItems:"center",
                            justifyContent:"center",gap:6,
                            fontFamily:"Cairo,sans-serif",
                          }}>
                          <div style={{
                            width:32,height:3,borderRadius:2,
                            background:C.ash,
                          }}/>
                          <span style={{fontSize:8,color:C.smoke}}>اضغط للطي</span>
                        </button>
                        <div style={{padding:"14px 16px"}}>

                        {/* ══ لحظة "فرصة نادرة" — تظهر فقط للدرجات العالية ══ */}
                        {isRare&&rareAlert===stk.sym&&(
                          <div style={{
                            marginBottom:12,
                            background:"linear-gradient(135deg,rgba(212,168,67,.18),rgba(212,168,67,.08))",
                            border:"1px solid " + C.gold + "55",
                            borderRadius:14,padding:"12px 14px",
                            animation:"rarePop .55s cubic-bezier(.16,1,.3,1) both",
                            display:"flex",alignItems:"center",gap:10,
                          }}>
                            <div style={{fontSize:24,flexShrink:0}}>⭐</div>
                            <div>
                              <div style={{fontSize:12,fontWeight:900,color:C.gold,marginBottom:2}}>
                                فرصة نادرة -- درجة {health.score}/100
                              </div>
                              <div style={{fontSize:10,color:C.mist,lineHeight:1.5}}>
                                {globalRank === 1 
                                  ? "هذا السهم الأول في السوق -- الإشارة استثنائية"
                                  : "هذا السهم في أعلى " + Math.min(99, Math.round((1-globalRank/allData.length)*100)) + "% من السوق -- الإشارة استثنائية"
                                }
                              </div>
                            </div>
                          </div>
                        )}


                        {/* ══ الملخص الثلاثي — القرار · السبب · التحذير ══ */}
                        <div style={{
                          background:`linear-gradient(135deg,${health.sigC}10,${health.sigC}06)`,
                          border:`1px solid ${health.sigC}30`,
                          borderRadius:14,padding:"12px 14px",marginBottom:12,
                        }}>
                                                   {/* السطر ١ -- القرار + Grade Enhanced */}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                            {/* signal badge */}
                            <div style={{
                              background:health.sigC+"22",border:`1px solid ${health.sigC}44`,
                              borderRadius:8,padding:"4px 12px",
                              fontSize:12,fontWeight:800,color:health.sigC,
                            }}>{health.sig}</div>
                            
                            {/* Grade Enhanced -- يستخدم gradeLabel + gradeColor */}
                            {(function(){
                              var gColor = health.gradeColor || health.sigC;
                              var gLabel = health.gradeLabel || scoreWord(health.score);
                              return(
                                <div style={{
                                  display:"flex",alignItems:"center",gap:5,
                                  background:gColor + "15",
                                  border:"1px solid " + gColor + "33",
                                  borderRadius:8,padding:"4px 10px",
                                }}>
                                  {/* الحرف */}
                                  <span style={{
                                    fontSize:11,fontWeight:900,color:gColor,
                                    background:gColor + "22",
                                    padding:"1px 6px",borderRadius:4,
                                    lineHeight:1,
                                  }}>{health.grade}</span>
                                  {/* الوصف العربي */}
                                  <span style={{
                                    fontSize:11,fontWeight:700,color:gColor,
                                  }}>{gLabel}</span>
                                </div>
                              );
                            })()}
                          </div>
                          
                          {/* Grade Description -- وصف تفصيلي */}
                          {health.gradeDescription && (
                            <div style={{
                              background:"rgba(255,255,255,.03)",
                              border:"1px solid rgba(255,255,255,.06)",
                              borderRadius:8,padding:"5px 10px",
                              marginBottom:8,
                              display:"flex",alignItems:"center",gap:6,
                            }}>
                              <span style={{fontSize:10}}>📊</span>
                              <span style={{
                                fontSize:9,color:C.mist,lineHeight:1.4,
                              }}>{health.gradeDescription}</span>
                            </div>
                          )}

                          {/* السطر ٢ -- السبب بعربي بسيط */}
                          {/* 🎯 معايرة علمية: 65/55/45 */}
                          <div style={{fontSize:11,color:C.mist,lineHeight:1.6,marginBottom:8}}>
                            {health.score>=65
                              ? `السيولة والزخم يدعمان الصعود -- الحجم أعلى من المعدل بـ ${Math.round(((health.extras&&health.extras.vr)||1)*100-100)}%`
                              : health.score>=55
                              ? "السهم في مرحلة تجميع -- انتظر تأكيد كسر المقاومة بحجم عالٍ"
                              : health.score>=45
                              ? "حركة السهم متذبذبة -- لا توجد إشارة واضحة حالياً"
                              : "ضغط بيعي مرتفع -- السيولة الذكية تخرج من السهم"}
                          </div>
                          {/* السطر ٣ — التحذير إن وُجد */}
                                                    {/* السطر ٣ -- التحذير إن وُجد */}
                          {/* 🎯 معايرة: عتبة 65 بدلاً من 75 */}
                          {health.score<65&&(
                            <div style={{
                              display:"flex",alignItems:"center",gap:6,
                              background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",
                              borderRadius:8,padding:"5px 10px",
                            }}>
                              <span style={{fontSize:11}}>⚠</span>
                              <span style={{fontSize:10,color:C.amber}}>
                                {health.score<45
                                  ? "لا تدخل -- انتظر حتى تتحسن قراءة السيولة"
                                  : "تحقق من حجم التداول قبل الدخول"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ══ الأرقام الأربعة — بأسماء عربية بسيطة ══ */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                          {[
                            {
                              l:"قوة السيولة",
                              desc:"هل المال يدخل أم يخرج؟",
                              v:(health.layers&&health.layers.L9)||0,
                              c:(health.layers&&health.layers.L9||0)>=70?C.mint:(health.layers&&health.layers.L9||0)>=50?C.amber:C.coral,
                            },
                            {
                              l:"ثقة الاحتمالية",
                              desc:"نسبة نجاح الإشارة رياضياً",
                              v:(health.layers&&health.layers.L7)||0,
                              c:(health.layers&&health.layers.L7||0)>=70?C.mint:(health.layers&&health.layers.L7||0)>=50?C.amber:C.coral,
                            },
                            {
                              l:"هيكل الحركة",
                              desc:"هل النمط يشبه الصعود؟",
                              v:(health.layers&&health.layers.L1)||0,
                              c:(health.layers&&health.layers.L1||0)>=70?C.mint:(health.layers&&health.layers.L1||0)>=50?C.amber:C.coral,
                            },
                            {
                              l:"جدوى الصفقة",
                              desc:"هل العائد يستحق المخاطرة؟",
                              v:(health.layers&&health.layers.L6)||0,
                              c:(health.layers&&health.layers.L6||0)>=70?C.mint:(health.layers&&health.layers.L6||0)>=50?C.amber:C.coral,
                            },
                          ].map(ax=>(
                            <div key={ax.l} style={{
                              background:C.layer3,borderRadius:12,padding:"10px 12px",
                              border:"1px solid " + ax.c + "20",
                            }}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                                <div>
                                  <div style={{fontSize:10,fontWeight:700,color:C.snow}}>{ax.l}</div>
                                  <div style={{fontSize:8,color:C.smoke,marginTop:1}}>{ax.desc}</div>
                                </div>
                                <div style={{textAlign:"left"}}>
                                  <div style={{fontSize:18,fontWeight:900,color:ax.c,lineHeight:1}}>{ax.v}</div>
                                  <div style={{fontSize:7,color:ax.c,fontWeight:700,marginTop:2}}>
                                    {ax.v>=75?"قوي":ax.v>=55?"معتدل":ax.v>=35?"ضعيف":"متدنٍ"}
                                  </div>
                                </div>
                              </div>
                              <div style={{height:3,background:C.ash,borderRadius:2,overflow:"hidden"}}>
                                <div style={{
                                  height:"100%",
                                  width:ax.v+"%",
                                  background:"linear-gradient(90deg," + ax.c + "80," + ax.c + ")",
                                  borderRadius:2,
                                  transition:"width .8s cubic-bezier(.4,0,.2,1)",
                                }}/>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* ══ زر التحليل الكامل — بارز دائماً ══ */}
                                                <button
                          onClick={e=>{ e.stopPropagation(); haptic.strong(); setFullAnalysis(stk.sym); }}
                          style={{
                            width:"100%",padding:"13px",borderRadius:12,cursor:"pointer",
                            fontFamily:"Cairo,sans-serif",fontSize:13,fontWeight:800,
                            letterSpacing:".3px",
                            background:"linear-gradient(135deg," + health.sigC + "28," + health.sigC + "15)",
                            border:"1px solid " + health.sigC + "50",
                            color:health.sigC,
                            boxShadow:"0 4px 20px " + health.sigC + "25",
                            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                          }}>
                          <span>🔬</span>
                          <span>التحليل الكامل — ٩ طبقات</span>
                          <span style={{fontSize:10,opacity:.7}}>←</span>
                        </button>
                        </div>{/* نهاية div padding */}
                      </div>
                    )}
                  </div>
                </div>
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

