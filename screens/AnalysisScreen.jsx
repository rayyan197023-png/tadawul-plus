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
import { STOCKS } from '../constants/stocksData';
import { useNav, useSharedPrices } from '../store';

// ── المحركات الحسابية
import {
  genBars, stockHealth, scoreWord, calc9Layers,
  MACRO, HISTORICAL, OIL_SENS, RATE_SENS,
  TASI_CORR_GROUPS, KELLY_CONFIG, RISK_GATE,
  applyFeedbackToWeights, loadFeedbackState,
  saveFeedbackState, getAdaptiveWeightAdjustment,
  recordFeedback,
} from '../engines/analysisEngine';

// ── مكونات UI المساعدة
import {
  ParticleCanvas, ArcRing, KPIChip, MiniChart, StoryChart,
  Icon, SignalsPanel, BreadthTooltip, CorrelationMatrix, LayerIcon,
  C,
} from '../components/analysis/AnalysisHelpers';

export default function AnalysisScreen(){
  const liveStocks = useSharedPrices(); // أسعار مشتركة محدَّثة

  // ── تحديث MACRO من الأسعار الحية (commData من AppShell) ──────────
  // هذا يجعل محرك 9 الطبقات يعمل بأسعار نفط/ذهب/دولار حقيقية
  const liveMACRO = React.useMemo(function() {
    if (!extCommData || !extCommData.length) return MACRO;
    var oil   = extCommData.find(function(c){return c.sym==='خام برنت'||c.sym==='خام WTI';});
    var gold  = extCommData.find(function(c){return c.sym==='الذهب';});
    var dxy   = extCommData.find(function(c){return c.sym==='الدولار';});
    var sp    = extCommData.find(function(c){return c.sym==='S&P 500';});
    return Object.assign({}, MACRO, {
      oilPrice:  oil  ? oil.price  : MACRO.oilPrice,
      goldPrice: gold ? gold.price : (MACRO.goldPrice||2900),
      dxy:       dxy  ? dxy.price  : (MACRO.dxy||103),
      spx:       sp   ? sp.price   : (MACRO.spx||5500),
    });
  }, [extCommData]);
  const { openStock } = useNav();
  const [page,        setPage]        = useState("home");
  const [sel,         setSel]         = useState(null);
  const [tab,         setTab]         = useState("all");
  const [anim,        setAnim]        = useState(false);
  const [fullAnalysis,setFullAnalysis]= useState(null);
  const [cardExpanded,setCardExpanded]= useState(false);
  const [rareAlert,   setRareAlert]   = useState(null);
  const [liveTime,    setLiveTime]    = useState(new Date());
  const [tick,        setTick]        = useState(0);
  const [discovered,  setDiscovered]  = useState([]);
  const [cardLevel,   setCardLevel]   = useState({});
  const [flashCard,   setFlashCard]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [darkMode,    setDarkMode]    = useState(true);
  // ── محفظة المستخدم ──
  const [port,        setPort]        = useState([]); // [{sym, qty, avgCost}]
  const [portSheet,   setPortSheet]   = useState(null); // "add" | sym
  const [portSrch,    setPortSrch]    = useState("");

  useEffect(()=>{
    setAnim(true);
    // محاكاة وقت التحليل
    const t = setTimeout(function(){ setLoading(false); }, 1400);
    return function(){ clearTimeout(t); };
  },[]);

  // عداد ثانية للساعة الحية فقط
  useEffect(()=>{
    const t = setInterval(function(){ setLiveTime(new Date()); setTick(function(n){ return n+1; }); }, 1000);
    return function(){ clearInterval(t); };
  },[]);

  // حجم الخط — Accessibility
  
  // ══ نظام تتبع القرارات — Calibration System ══
  // يحفظ القرارات ويقيس دقتها لاحقاً لمعايرة الأوزان
  const [decisions, setDecisions] = useState(() => {
    try {
      // نستخدم sessionStorage (مؤقت للجلسة) بدل localStorage
      if (typeof window === 'undefined') return [];
      const saved = sessionStorage.getItem('tdw_decisions');
      return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  const trackDecision = function(sym, signal, conviction, price) {
    const newDecision = {
      id: Date.now(),
      sym, signal, conviction, price,
      date: new Date().toISOString().split('T')[0],
      verified: false, result: null,
    };
    setDecisions(function(prev) {
      const updated = [...prev.slice(-49), newDecision]; // آخر 50 قرار فقط
      try { if (typeof window !== 'undefined') sessionStorage.setItem('tdw_decisions', JSON.stringify(updated)); } catch(e){}
      return updated;
    });
  };

  // حساب دقة القرارات المحفوظة (تحقق مبسّط من نفس الجلسة)
  const decisionAccuracy = useMemo(() => {
    const verified = decisions.filter(d => d.verified && d.result !== null);
    if(verified.length < 3) return null;
    const correct = verified.filter(d =>
      (d.signal==="شراء قوي" && d.result>0) ||
      (d.signal==="تخفيف" && d.result<0) ||
      (d.signal==="مراقبة" && d.result>-2)
    ).length;
    return Math.round(correct/verified.length*100);
  }, [decisions]);

  // ── Throttled price snapshot — only recalculate when price changes >0.3%
  const priceSignature = useMemo(() =>
    liveStocks.map(s => Math.round(s.p * 100) + s.sym).join('|')
  , [liveStocks]);

  const [throttledSig, setThrottledSig] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setThrottledSig(priceSignature), 5000); // max once/5s
    return () => clearTimeout(t);
  }, [priceSignature]);

  const allData = useMemo(()=>{
    // Patch MACRO with live commodity prices before running stockHealth
    const _origOil = MACRO.oilPrice;
    const _origGold = MACRO.goldPrice;
    if (liveMACRO !== MACRO) {
      MACRO.oilPrice  = liveMACRO.oilPrice;
      MACRO.goldPrice = liveMACRO.goldPrice || MACRO.goldPrice;
    }
    const result = liveStocks.map(stk=>{ const bars=genBars(stk); return{stk,bars,health:stockHealth(stk,bars)}; });
    // Restore
    MACRO.oilPrice  = _origOil;
    MACRO.goldPrice = _origGold;
    return result;
  },[throttledSig, liveMACRO]); // ← throttled: recalc max every 5s not every 3s

  const filtered = useMemo(()=>{
    var arr;
    if(tab==="buy")    arr = allData.filter(d=>d.health.score>=75);
    else if(tab==="watch")  arr = allData.filter(d=>d.health.score>=60&&d.health.score<75);
    else if(tab==="reduce") arr = allData.filter(d=>d.health.score<45);
    else arr = [...allData];
    return arr.sort(function(a,b){ return b.health.score - a.health.score; });
  },[allData,tab]);

  const selData = allData.find(d=>d.stk.sym===sel);
  const upCount = liveStocks.filter(s=>s.ch>0).length;
  const avgChange = (liveStocks.reduce((s,x)=>s+x.ch,0)/liveStocks.length).toFixed(2);
  const tasiVal = 11842;

  const navItems = [
    { id:"home",      icon:"⌂",  label:"الرئيسية" },
    { id:"portfolio", icon:"◎",  label:"محفظتي"   },
    { id:"profile",   icon:"◈",  label:"حسابي"   },
  ];

  // ألوان Light Mode
  const LC = darkMode ? C : {
    ink:"#f0f4ff",   deep:"#e8edf8",  void:"#dde4f5",
    layer1:"#ffffff", layer2:"#f4f7ff", layer3:"#eaeffa",
    edge:"#dde4f8",   line:"#c8d3ee",  ash:"#b0bedd",
    snow:"#0d1225",   mist:"#2d3a5a",  smoke:"#4a5a7a",
    gold:C.gold,      goldL:C.goldL,   goldD:C.goldD,
    electric:"#1a6fd4",
    mint:"#0aaa66",   coral:"#d93545",
    amber:C.amber,    teal:"#0596b0",  plasma:C.plasma,
  };

  return(
    <div style={{
      maxWidth:430, margin:"0 auto",
      background: LC.ink,
      minHeight:"100vh",
      fontFamily:"Cairo,system-ui,sans-serif",
      direction:"rtl",
      color: LC.snow,
      position:"relative", overflow:"hidden",
      transition:"background .4s ease, color .4s ease",
      zoom: "1",
    }}
    className="tadawul-root"
    >

      {/* ══ CSS الأساسي ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0;height:0}
        body{background:${C.ink}}
        .num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.5px}
        .num-lg{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-1px}

        /* ── إشعاع النصوص — Terminal Glow ── */
        .glow-gold{text-shadow:0 0 12px ${C.gold}99,0 0 24px ${C.gold}44}
        .glow-mint{text-shadow:0 0 10px ${C.mint}88,0 0 20px ${C.mint}33}
        .glow-electric{text-shadow:0 0 10px ${C.electric}88,0 0 20px ${C.electric}33}
        .glow-coral{text-shadow:0 0 10px ${C.coral}88,0 0 20px ${C.coral}33}
        .glow-white{text-shadow:0 0 8px rgba(240,246,255,.4),0 0 16px rgba(240,246,255,.15)}

        /* ── Spring Physics — حركة طبيعية ── */
        @keyframes springIn{
          0%{opacity:0;transform:translateY(24px) scale(.96)}
          60%{opacity:1;transform:translateY(-4px) scale(1.01)}
          80%{transform:translateY(2px) scale(.995)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes springScale{
          0%{transform:scale(.88)}
          55%{transform:scale(1.06)}
          75%{transform:scale(.97)}
          100%{transform:scale(1)}
        }
        @keyframes floatIn{
          0%{opacity:0;transform:translateX(16px)}
          60%{opacity:1;transform:translateX(-3px)}
          100%{opacity:1;transform:translateX(0)}
        }
        @keyframes morphIn{
          0%{opacity:0;transform:translateY(12px) scale(.94) rotate(-1deg)}
          65%{opacity:1;transform:translateY(-2px) scale(1.02) rotate(.3deg)}
          100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}
        }

        /* ── الحركة الدائمة ── */
        @keyframes breathe{
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.018)}
        }
        @keyframes floatBadge{
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-2px)}
        }
        @keyframes spinRing{
          from{transform:rotate(0deg)}
          to{transform:rotate(360deg)}
        }

        /* ── النبض والتوهج ── */
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes buyGlow{
          0%,100%{box-shadow:0 0 0 1px ${C.mint}22,0 4px 20px rgba(0,0,0,.3)}
          50%{box-shadow:0 0 0 1px ${C.mint}55,0 4px 28px ${C.mint}18,0 0 20px ${C.mint}0f}
        }
        @keyframes dangerPulse{
          0%,100%{box-shadow:0 0 0 1px ${C.coral}22,0 4px 20px rgba(0,0,0,.3)}
          50%{box-shadow:0 0 0 1px ${C.coral}44,0 4px 24px ${C.coral}15}
        }
        @keyframes rarePop{
          0%{opacity:0;transform:scale(.85) translateY(6px)}
          60%{transform:scale(1.04) translateY(-3px)}
          80%{transform:scale(.98) translateY(1px)}
          100%{opacity:1;transform:scale(1) translateY(0)}
        }
        @keyframes skeletonPulse{0%,100%{opacity:.4}50%{opacity:.8}}
        .skeleton{animation:skeletonPulse 1.4s ease infinite}
        @keyframes flashPulse{0%{opacity:1}30%{opacity:.5}100%{opacity:1}}
        @keyframes rankUp{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes skeletonPulse{0%,100%{opacity:.35}50%{opacity:.75}}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes expandDown{
          0%{opacity:0;transform:translateY(-10px) scale(.98)}
          70%{transform:translateY(2px) scale(1.005)}
          100%{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px ${C.gold}44}50%{box-shadow:0 0 20px ${C.gold}88}}

        /* ── Classes ── */
        .card-enter{animation:springIn .55s cubic-bezier(.16,1,.3,1) both}
        .fade-in{animation:fadeIn .35s ease both}
        .live-dot{animation:pulse 2s ease-in-out infinite}
        .buy-glow{animation:buyGlow 3.2s ease-in-out infinite}
        .danger-pulse{animation:dangerPulse 2.4s ease-in-out infinite}
        .flash{animation:flashPulse .3s ease both}
        .skeleton{animation:skeletonPulse 1.4s ease-in-out infinite}
        .spring-scale{animation:springScale .5s cubic-bezier(.16,1,.3,1) both}
        .float-badge{animation:floatBadge 3s ease-in-out infinite}
        .breathe{animation:breathe 4s ease-in-out infinite}
        button{font-family:inherit;transition:transform .15s ease, opacity .15s ease}
        button:active{transform:scale(.93);opacity:.85}
        @keyframes particle0{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(8%,12%) scale(1.15)}}
        @keyframes particle1{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(-6%,8%) scale(.88)}}
        @keyframes particle2{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(10%,-6%) scale(1.1)}}
        @keyframes particle3{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(-8%,-10%) scale(.92)}}
        @keyframes particle4{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(5%,7%) scale(1.08)}}
        @keyframes particle5{0%,100%{transform:translate(0%,0%) scale(1)}50%{transform:translate(-4%,9%) scale(.95)}}
      `}</style>

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

      {/* ══ خلفية الجسيمات — Canvas مستقل ══ */}
      <ParticleCanvas/>

      {/* ══════════════════════════════════
           الصفحة الرئيسية
      ══════════════════════════════════ */}
      {page==="home"&&(()=>{
        // ٤ — Contextual Color Temperature
        const avgHealth = Math.round(allData.reduce(function(s,d){ return s+d.health.score; },0)/allData.length);
        const mktWarm   = avgHealth >= 65; // سوق صاعد → دفء ذهبي
        const tempColor = mktWarm ? C.gold : C.electric;
        const tempOpacity = "0.018";

        // ٣ — Glanceable Dashboard
        const best3  = [...allData].sort(function(a,b){ return b.health.score-a.health.score; }).slice(0,1)[0];
        const mktOk  = avgHealth >= 60;
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
                  {[4,8,12,6,10].map(function(barH, i){
                    const active = tick % 5 === i;
                    return (
                      <div key={i} style={{
                        width:3,
                        height: active ? barH + 4 : barH,
                        borderRadius:2,
                        background: active ? C.mint : C.mint,
                        opacity: active ? 1 : 0.22,
                        transition:"height .25s ease, opacity .25s ease",
                      }}/>
                    );
                  })}
                  <span style={{fontSize:8,fontWeight:700,color:C.mint,marginRight:2}}>مباشر</span>
                  <span style={{fontSize:8,color:C.smoke}}>
                    {(function(){
                      var d = new Date();
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
                  background:"linear-gradient(135deg," + C.layer2 + "," + C.layer3 + ")",
                  borderRadius:14,padding:"8px 14px",textAlign:"center",
                  border:"1px solid " + C.line,
                }}>
                  <div style={{fontSize:8,color:C.smoke,letterSpacing:"1px",marginBottom:2}}>تاسي</div>
                  <div className="num-lg" style={{fontSize:18,fontWeight:900,color:C.goldL,lineHeight:1,direction:"ltr"}}>{tasiVal.toLocaleString()}</div>
                  <div style={{fontSize:10,fontWeight:700,color:avgChange>=0?C.mint:C.coral,marginTop:2,direction:"ltr"}}>
                    {avgChange>=0?"▲":"▼"} {Math.abs(avgChange)}%
                  </div>
                </div>
                {/* أزرار الإعدادات — 44px touch target (Apple HIG) */}
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {/* Dark/Light Mode */}
                  <button
                    onClick={function(){ setDarkMode(function(d){ return !d; }); }}
                    style={{
                      width:44,height:44,borderRadius:12,cursor:"pointer",
                      background: darkMode
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

          {/* ══ Skeleton Loading — أثناء التحليل ══ */}
          {loading&&(
            <div style={{padding:"12px 16px"}}>
              {/* Skeleton للـ Glanceable */}
              <div className="skeleton" style={{
                height:62,borderRadius:14,marginBottom:10,
                background:"linear-gradient(135deg," + C.layer2 + "," + C.layer3 + ")",
              }}/>
              {/* Skeleton للبطاقة العلوية */}
              <div className="skeleton" style={{
                height:180,borderRadius:20,marginBottom:10,
                background:"linear-gradient(135deg," + C.layer2 + "," + C.layer3 + ")",
              }}/>
              {/* Skeleton لبطاقات الأسهم */}
              {[1,2,3].map(function(i){
                return(
                  <div key={i} className="skeleton" style={{
                    height:130,borderRadius:18,marginBottom:10,
                    background:"linear-gradient(135deg," + C.layer2 + "," + C.layer3 + ")",
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

          {/* ══ Glanceable Dashboard — نظرة واحدة تكفي ══ */}
          {!loading&&(
          <div style={{
            margin:"10px 16px 4px",
            background:"linear-gradient(135deg," + C.layer2 + "," + C.layer3 + ")",
            borderRadius:14,padding:"10px 14px",
            border:"1px solid " + tempColor + "22",
            display:"flex",alignItems:"center",
            boxShadow:"0 4px 20px rgba(0,0,0,.3), inset 0 1px 0 " + C.layer3,
          }}>
            {/* السؤال ١: كيف السوق؟ */}
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>حال السوق</div>
              <div style={{
                fontSize:16,fontWeight:900,lineHeight:1,
                color: avgHealth>=75?C.mint:avgHealth>=60?C.electric:avgHealth>=45?C.amber:C.coral,
              }}>{avgHealth}</div>
              <div style={{
                fontSize:7,fontWeight:700,marginTop:2,
                color: avgHealth>=75?C.mint:avgHealth>=60?C.electric:avgHealth>=45?C.amber:C.coral,
              }}>{avgHealth>=75?"ممتاز":avgHealth>=60?"جيد":avgHealth>=45?"محايد":"حذر"}</div>
            </div>
            <div style={{width:1,height:36,background:C.line}}/>
            {/* السؤال ٢: ما أفضل سهم؟ */}
            <div style={{flex:1.4,textAlign:"center",padding:"0 12px"}}>
              <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>أفضل فرصة</div>
              <div style={{fontSize:14,fontWeight:900,color:C.gold,lineHeight:1}}>{best3.stk.name}</div>
              <div style={{fontSize:8,color:best3.health.sigC,marginTop:2,fontWeight:700}}>{best3.health.sig}</div>
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
            const buyN       = allData.filter(d=>d.health.score>=75).length;
            const watchN     = allData.filter(d=>d.health.score>=60&&d.health.score<75).length;
            const reduceN    = allData.filter(d=>d.health.score<45).length;
            const noSigN     = totalN-buyN-watchN-reduceN;
            const avgHealth  = Math.round(allData.reduce((s,d)=>s+d.health.score,0)/totalN);
            const avgConf    = Math.round(allData.reduce((s,d)=>s+d.health.score*.9,0)/totalN);
            const avgRadar   = Math.round(allData.reduce((s,d)=>s+d.stk.rating,0)/totalN);
            const mktLabel   = "المؤشر العام";
            const mktColor   = avgHealth>=75?C.mint:avgHealth>=60?C.electric:avgHealth>=50?C.amber:avgHealth>=38?C.coral:"#ff2244";
            const mktIcon    = avgHealth>=75?"rocket":avgHealth>=60?"trendUp":avgHealth>=50?"scale":avgHealth>=38?"trendDn":"warning";
            const breadthPct = Math.round(allData.filter(d=>d.health.score>=50).length/totalN*100);
            const bColor     = breadthPct>=65?C.mint:breadthPct>=50?C.electric:breadthPct>=35?C.amber:C.coral;
            const best       = [...allData].sort((a,b)=>b.health.score-a.health.score)[0];

            return(
              <div style={{margin:"0 16px 14px",position:"relative"}}>
                <div style={{
                  background:`linear-gradient(160deg,${C.layer1} 0%,${C.layer2} 60%,${C.layer3} 100%)`,
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
                          <span style={{fontSize:16}}>{mktIcon}</span>
                          <span style={{fontSize:16,fontWeight:900,color:mktColor,letterSpacing:"-.3px"}}>{mktLabel}</span>
                          <div style={{marginRight:"auto",display:"flex",alignItems:"center",gap:4,
                            background:mktColor+"15",borderRadius:20,padding:"2px 8px",border:`1px solid ${mktColor}30`}}>
                            <div className="live-dot" style={{width:5,height:5,borderRadius:"50%",background:mktColor}}/>
                            <span style={{fontSize:8,fontWeight:700,color:mktColor}}>مباشر</span>
                          </div>
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
                  {/* ══ القسم ٢ — أفضل اختيار (دائماً مرئي) ══ */}
                  <div style={{padding:"12px 16px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {/* يمين — اسم + رقم + قطاع + سعر + % */}
                      <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                        <div style={{fontSize:15,fontWeight:900,color:C.snow}}>{best.stk.name}</div>
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
                        <div style={{display:"flex",alignItems:"center",gap:3}}>
                          <span style={{fontSize:8,color:C.smoke}}>ثقة:</span>
                          <span style={{fontSize:10,fontWeight:700,color:best.health.sigC}}>{best.health.score}%</span>
                        </div>
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
                </div>
              </div>
            );
          })()}


          {/* ─── شريط التصنيف الأفقي — محسّن ─── */}
          <div style={{padding:"0 16px 10px"}}>
            <div style={{
              background:C.layer1,borderRadius:14,padding:"12px 14px",
              border:"1px solid " + C.line,
            }}>
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                marginBottom:10,
              }}>
                <div style={{fontSize:9,color:C.smoke,fontWeight:700,letterSpacing:".6px"}}>
                  ترتيب قوة الإشارة
                </div>
                <div style={{display:"flex",gap:8}}>
                  {[
                    {c:C.mint,  l:"شراء"},
                    {c:C.amber, l:"مراقبة"},
                    {c:C.teal,  l:"محايد"},
                    {c:C.coral, l:"تخفيف"},
                  ].map(function(k){
                    return(
                      <div key={k.l} style={{display:"flex",alignItems:"center",gap:3}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:k.c}}/>
                        <span style={{fontSize:7,color:C.smoke}}>{k.l}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* النقاط مع درجة الصحة */}
              <div style={{display:"flex",alignItems:"flex-end",gap:2,position:"relative",height:72}}>
                {[...allData]
                  .sort(function(a,b){ return b.health.score - a.health.score; })
                  .map(function(d,i){
                    var isSelected = sel === d.stk.sym;
                    var dotSize    = isSelected ? 16 : 12;
                    var barH       = 4 + (d.health.score / 100) * 26;
                    return(
                      <div
                        key={d.stk.sym}
                        onClick={function(e){ e.stopPropagation(); setSel(d.stk.sym); }}
                        style={{
                          flex:1,display:"flex",flexDirection:"column",
                          alignItems:"center",justifyContent:"flex-end",
                          cursor:"pointer",height:"100%",gap:0,
                        }}
                      >
                        {/* الدرجة — فوق الكل عند التحديد */}
                        <div style={{
                          fontSize:8,fontWeight:900,
                          color:isSelected?d.health.sigC:"transparent",
                          height:12,lineHeight:"12px",
                          transition:"color .2s",
                        }}>{d.health.score}</div>

                        {/* عمود + نقطة في صف واحد */}
                        <div style={{
                          position:"relative",
                          display:"flex",flexDirection:"column",
                          alignItems:"center",
                          height:barH + dotSize,
                          marginBottom:2,
                        }}>
                          {/* العمود */}
                          <div style={{
                            width:5,
                            height:barH,
                            borderRadius:"3px 3px 0 0",
                            background: isSelected
                              ? "linear-gradient(180deg," + d.health.sigC + "," + d.health.sigC + "77)"
                              : d.health.sigC + "44",
                            transition:"all .3s ease",
                          }}/>
                          {/* النقطة */}
                          <div style={{
                            width:dotSize,height:dotSize,
                            borderRadius:"50%",
                            background:d.health.sigC,
                            border:"2px solid " + (isSelected?C.snow:d.health.sigC+"55"),
                            boxShadow:"0 0 " + (isSelected?"10px":"5px") + " " + d.health.sigC + (isSelected?"bb":"44"),
                            transition:"all .3s ease",
                            flexShrink:0,
                          }}/>
                        </div>

                        {/* الاسم — ثابت في الأسفل */}
                        <div style={{
                          fontSize:6.5,fontWeight:isSelected?800:500,
                          color:isSelected?d.health.sigC:C.smoke,
                          whiteSpace:"nowrap",
                          height:14,lineHeight:"14px",
                          transition:"color .3s",
                          overflow:"hidden",
                          maxWidth:"100%",
                          textAlign:"center",
                        }}>{d.stk.name}</div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>


          {/* ─── زر الإشارات ─── */}
          <div style={{padding:"0 16px 10px"}}>
            <button
              onClick={()=>setPage("signals")}
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
                  {label:"شراء قوي", count:allData.filter(d=>d.health.score>=75).length,                                    color:C.mint},
                  {label:"مراقبة",   count:allData.filter(d=>d.health.score>=60&&d.health.score<75).length,                  color:C.amber||"#f59e0b"},
                  {label:"محايد",    count:allData.filter(d=>d.health.score>=45&&d.health.score<60).length,                  color:C.teal},
                  {label:"تخفيف",    count:allData.filter(d=>d.health.score<45).length,                                      color:C.coral},
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
              <button key={k} onClick={()=>setTab(k)} style={{
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
                  {k==="all"?allData.length:k==="buy"?allData.filter(d=>d.health.score>=75).length:k==="watch"?allData.filter(d=>d.health.score>=60&&d.health.score<75).length:allData.filter(d=>d.health.score<45).length}
                </div>
              </button>
            ))}
          </div>

          {/* ─── قائمة الأسهم ─── */}
          <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
            {filtered.map(({stk,bars,health},idx)=>{
              const up=stk.ch>=0;
              const priceColor=up?C.mint:C.coral;
              const selected=sel===stk.sym;
              const globalRank=[...allData].sort((a,b)=>b.health.score-a.health.score).findIndex(d=>d.stk.sym===stk.sym)+1;
              const prevRank=globalRank+(stk.ch>=0?-1:1);
              const rankUp=stk.ch>0;
              const isBuy=health.score>=75;
              const isDanger=health.score<45;
              const isRare=health.score>=85;
              const isFlashing = flashCard === stk.sym;
              const level = cardLevel[stk.sym] || 1; // 1=مبسط 2=كامل
              return(
                <div key={stk.sym}
                  className="card-enter"
                  style={{animationDelay:`${idx*.07}s`}}
                  onClick={function(){
                    // Micro-feedback — وميض لحظي
                    setFlashCard(stk.sym);
                    setTimeout(function(){ setFlashCard(null); }, 350);
                    // Progressive Disclosure — تقدّم في المستويات
                    if(selected){
                      setSel(null);
                      setRareAlert(null);
                    } else {
                      setSel(stk.sym);
                      if(isRare) setRareAlert(stk.sym);
                    }
                  }}
                >
                  {/* ─ البطاقة الرئيسية ─ */}
                  <div
                    className={isFlashing?"flash":isBuy&&!selected?"buy-glow":isDanger&&!selected?"danger-pulse":""}
                    style={{
                    background:"linear-gradient(135deg," + C.layer1 + " 0%," + C.layer2 + " 100%)",
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
                      position:"absolute",top:20,left:10,zIndex:5,
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
                    {/* شريط اللون العلوي — تمييز بصري فوري للإشارة */}
                    <div style={{
                      height:3,
                      background:health.score>=75
                        ? `linear-gradient(90deg,${C.mint}00,${C.mint},${C.mint}00)`
                        : health.score>=60
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
                        <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                          <div className="glow-white" style={{fontSize:16,fontWeight:900,color:C.snow}}>{stk.name}</div>
                          <div style={{display:"flex",alignItems:"center",gap:4}}>
                            <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"1px 7px",borderRadius:5}}>{stk.sym}</span>
                            <span style={{fontSize:9,color:C.smoke}}>{stk.sec}</span>
                          </div>
                          <div className="num-lg" className="glow-white" style={{fontSize:18,fontWeight:900,color:C.snow,letterSpacing:"-0.5px",lineHeight:1,direction:"ltr"}}>{stk.p.toFixed(2)}</div>
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
                            <span style={{fontSize:8,color:C.smoke}}>أعلى من</span>
                            <span style={{fontSize:9,fontWeight:800,color:globalRank<=3?C.gold:globalRank<=5?C.mint:C.mist}}>{Math.round((allData.length-globalRank)/allData.length*100)+"%"}</span>
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
                              <div className="num-lg" className="glow-white" style={{fontSize:11,fontWeight:900,color:health.sigC,lineHeight:1}}>{health.score}</div>
                              <div style={{fontSize:7,fontWeight:700,color:health.sigC,marginTop:1}}>{scoreWord(health.score)}</div>
                              <div style={{display:"flex",alignItems:"flex-end",gap:1,justifyContent:"center",marginTop:3,height:6}}>
                                {(function(){
                                  var base=health.score,trend=stk.ch>0?1:-1;
                                  var vals=[Math.max(20,base-8+trend*2),Math.max(20,base-5+trend*3),Math.max(20,base-2+trend*1),Math.max(20,base+trend*2),base];
                                  var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),rng=mx-mn||1;
                                  return vals.map(function(v,i){return(<div key={i} style={{width:3,height:2+((v-mn)/rng)*4,borderRadius:1,background:i===vals.length-1?health.sigC:health.sigC+"55"}}/>);});
                                })()}
                              </div>
                            </div>
                          </ArcRing>
                          {(function(){
                            var size=56,stroke=4,r=(size-stroke*2)/2,thresholdAngle=(75/100)*360-90,rad=thresholdAngle*Math.PI/180,cx=size/2,cy=size/2;
                            var x1=cx+(r-6)*Math.cos(rad),y1=cy+(r-6)*Math.sin(rad),x2=cx+(r+2)*Math.cos(rad),y2=cy+(r+2)*Math.sin(rad);
                            return(<svg style={{position:"absolute",inset:0,pointerEvents:"none"}} width={size} height={size}>
                              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gold} strokeWidth={2} strokeLinecap="round" style={{filter:"drop-shadow(0 0 3px "+C.gold+")"}}/>
                              <text x={cx+r*Math.cos(rad)*1.18} y={cy+r*Math.sin(rad)*1.18} textAnchor="middle" dominantBaseline="middle" fill={C.gold} fontSize={5} fontWeight="700">75</text>
                            </svg>);
                          })()}
                          {(function(){
                            var trend=stk.ch>=0,delta=Math.max(1,Math.min(12,Math.abs(Math.round(health.score*stk.ch/100*3))));
                            return(<div style={{position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:2,background:trend?"rgba(16,201,126,.15)":"rgba(240,79,90,.15)",border:"1px solid "+(trend?"rgba(16,201,126,.3)":"rgba(240,79,90,.3)"),borderRadius:5,padding:"1px 5px",whiteSpace:"nowrap"}}>
                              <span style={{fontSize:7,fontWeight:800,color:trend?C.mint:C.coral}}>{trend?"↑":"↓"}{delta}</span>
                            </div>);
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

                        if(vr >= 1.4 && ch > 0){
                          why      = "الحجم أعلى من المعدل بـ " + volPct + "% — دخول مؤسسي اليوم";
                          icon     = "🏦"; urgency = "عاجل"; whyColor = C.mint;
                        } else if(vr >= 1.4 && ch < 0){
                          why      = "حجم بيع مرتفع بـ " + volPct + "% — خروج مؤسسي محتمل";
                          icon     = "⚠";  urgency = "تحذير"; whyColor = C.coral;
                        } else if(L1 >= 80){
                          why      = "هيكل الحركة يُشبه نمط الاختراق الحقيقي";
                          icon     = "📐"; urgency = "إشارة"; whyColor = C.electric;
                        } else if(L9 >= 75 && ch > 0){
                          why      = "المال الذكي يتراكم — سيولة مؤسسية إيجابية";
                          icon     = "💧"; urgency = "إيجابي"; whyColor = C.mint;
                        } else if(L9 >= 75 && ch < 0){
                          why      = "سيولة قوية رغم الهبوط — قد يكون تجميعاً خفياً";
                          icon     = "🔍"; urgency = "راقب"; whyColor = C.amber;
                        } else if(L7 >= 75){
                          why      = "الاحتمالية الرياضية تدعم استمرار الاتجاه";
                          icon     = "🧮"; urgency = "إشارة"; whyColor = C.electric;
                        } else if(vr < 0.7){
                          why      = "حجم خفيف — لا توجد حركة مؤسسية اليوم";
                          icon     = "😴"; urgency = "هادئ"; whyColor = C.smoke;
                        } else if(ch > 0.5){
                          why      = "حركة إيجابية — الحجم مناسب للارتفاع";
                          icon     = "📊"; urgency = "عادي"; whyColor = C.teal;
                        } else {
                          why      = "تراجع طبيعي — لا ضغط بيعي استثنائي";
                          icon     = "📊"; urgency = "عادي"; whyColor = C.teal;
                        }

                        return(
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
                            </div>
                          </div>
                        );
                      })()}

                      {/* خط القصة — سعر + حجم + إشارة */}
                      <div style={{marginTop:10,opacity:1}}>
                        <StoryChart bars={bars} color={priceColor} score={health.score} h={52}/>
                      </div>

                      {/* ══ بطاقة القرار الثنائية — Kahneman ══
                          System 1: رسالة عاطفية فورية
                          System 2: رقم منطقي دقيق
                          نافذة الفرصة: BJ Fogg — المحفّز الزمني */}
                      <div style={{
                        marginTop:10,display:"flex",flexDirection:"row-reverse",gap:6,
                        paddingTop:10,borderTop:"1px solid rgba(255,255,255,.05)",
                      }}>
                        {/* System 1 — العقل السريع */}
                        <div style={{
                          flex:1,
                          background:health.sigC+"14",
                          border:"1px solid " + health.sigC + "30",
                          borderRadius:12,padding:"9px 12px",
                          display:"flex",alignItems:"center",gap:8,
                        }}>
                          <span style={{fontSize:20,flexShrink:0,lineHeight:1}}>
                            {health.score>=75?"🚀":health.score>=60?"👁":health.score>=45?"⚖️":"🛡"}
                          </span>
                          <div>
                            <div style={{
                              fontSize:11,fontWeight:800,
                              color:health.sigC,lineHeight:1,marginBottom:3,
                            }}>
                              {health.score>=75?"فرصة الآن"
                              :health.score>=60?"راقب عن قرب"
                              :health.score>=45?"لا تتسرع"
                              :"احتاط"}
                            </div>
                            <div style={{fontSize:8.5,color:C.smoke,lineHeight:1.3}}>
                              {health.score>=75?"السيولة والزخم يدعمان"
                              :health.score>=60?"انتظر تأكيد الحجم"
                              :health.score>=45?"الإشارة غير حاسمة"
                              :"ضغط بيعي مرتفع"}
                            </div>
                          </div>
                        </div>

                        {/* نافذة الفرصة — مبنية على بيانات الحجم الفعلية */}
                        {health.score>=60&&(function(){
                          var vr   = (health.extras && health.extras.vr) || 1;
                          var L9   = (health.layers && health.layers.L9)  || 50;

                          // كلما ارتفع الحجم ضاقت النافذة — إلحاح حقيقي
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

                          // العداد يعتمد على حجم النافذة
                          var totalSecs = windowMins * 60;
                          var elapsed   = tick % totalSecs;
                          var remaining = totalSecs - elapsed;
                          var remMins   = Math.floor(remaining / 60);
                          var remSecs   = remaining % 60;

                          var barPct = (function(){
                            var p = (remaining / totalSecs) * 100;
                            return p.toFixed(1) + "%";
                          })();

                          return(
                            <div style={{
                              flexShrink:0,width:56,
                              background:"linear-gradient(160deg," + urgColor + "18," + urgColor + "06)",
                              border:"1px solid " + urgColor + "40",
                              borderRadius:12,padding:"7px 5px",
                              textAlign:"center",
                              display:"flex",flexDirection:"column",
                              alignItems:"center",justifyContent:"center",gap:2,
                              position:"relative",overflow:"hidden",
                            }}>
                              {/* شريط التقدم مبني على الحجم */}
                              <div style={{
                                position:"absolute",bottom:0,left:0,right:0,height:3,
                                background:"rgba(255,255,255,.06)",
                              }}>
                                <div style={{
                                  height:"100%",background:urgColor,
                                  width:barPct,
                                  transition:"width 1s linear",borderRadius:2,
                                }}/>
                              </div>
                              <div style={{
                                fontSize:7,color:urgColor,fontWeight:800,lineHeight:1,
                                background:urgColor+"18",borderRadius:4,padding:"1px 5px",
                              }}>{urgLabel}</div>
                              <div style={{
                                fontSize:12,fontWeight:900,
                                color:urgColor,lineHeight:1,direction:"ltr",
                              }}>
                                {String(remMins).padStart(2,"0") + ":" + String(remSecs).padStart(2,"0")}
                              </div>
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
                        var kelAdj = (health.layers && health.layers.L6)
                          ? health.layers.L6 / 200
                          : 0.05;
                        var pct  = Math.max(3, Math.min(20, Math.round(kelAdj * 100)));
                        var stop = (stk.p * 0.96).toFixed(2);
                        var tgt  = (stk.p * 1.08).toFixed(2);
                        var alert= (stk.p * 1.015).toFixed(2);

                        var icon, line1, line2, bg, border;
                        if(health.score >= 75){
                          icon  = "✅";
                          line1 = "ادخل بـ " + pct + "% من المحفظة";
                          line2 = "وقف: " + stop + " · هدف: " + tgt;
                          bg    = "rgba(16,201,126,.08)";
                          border= "rgba(16,201,126,.25)";
                        } else if(health.score >= 60){
                          icon  = "🔔";
                          line1 = "اضبط تنبيهاً عند " + alert;
                          line2 = "لا تدخل قبل تأكيد الحجم";
                          bg    = "rgba(245,158,11,.08)";
                          border= "rgba(245,158,11,.22)";
                        } else if(health.score >= 45){
                          icon  = "⏸";
                          line1 = "لا إجراء مطلوب الآن";
                          line2 = "راقب حتى تتحسن السيولة";
                          bg    = "rgba(6,182,212,.07)";
                          border= "rgba(6,182,212,.2)";
                        } else {
                          icon  = "🔴";
                          line1 = "قلّص إلى 50% من مركزك";
                          line2 = "وقف دفاعي عند " + stop;
                          bg    = "rgba(240,79,90,.08)";
                          border= "rgba(240,79,90,.22)";
                        }

                        return(
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
                                color:health.sigC,lineHeight:1,marginBottom:3,
                              }}>{line1}</div>
                              <div style={{
                                fontSize:9,color:C.mist,
                                lineHeight:1.4,direction:"ltr",textAlign:"right",
                              }}>{line2}</div>
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
                                  {opp.matrix||"—"}
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
                                    position:"relative",overflow:"hidden",
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

                      {/* ══ KPI Panel: Probability + PositionSize + Confidence ══ */}
                      {(function(){
                        var prob  = health.probability  || {};
                        var ps    = health.positionSize  || {};
                        var conf  = health.confidence    || 50;
                        var bull  = prob.bull  != null ? Math.round(prob.bull*100)  : null;
                        var bear  = prob.bear  != null ? Math.round(prob.bear*100)  : null;
                        var neut  = prob.neut  != null ? Math.round(prob.neut*100)  : null;
                        var pct   = ps.pct     != null ? (ps.pct*100).toFixed(1)    : null;
                        var kelly = ps.kelly   != null ? ps.kelly.toFixed(1)        : null;
                        var recK  = ps.recommended;
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

                            {/* الاحتمالات الثلاثة */}
                            {bull!=null&&(
                              <div style={{
                                background:C.layer2,border:"1px solid "+C.edge,
                                borderRadius:12,padding:"10px 12px",
                              }}>
                                <div style={{fontSize:8,color:C.smoke,marginBottom:8,fontWeight:600}}>
                                  الاحتمال الموزون — Softmax₃
                                </div>
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
                                  border:"1px solid "+C.edge,
                                  borderRadius:12,padding:"10px 12px",
                                }}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:4}}>حجم المركز (Half-Kelly)</div>
                                  <div style={{
                                    fontSize:22,fontWeight:900,
                                    color:health.sigC||C.gold,lineHeight:1,
                                  }}>{pct}%</div>
                                  <div style={{fontSize:8,color:C.ash,marginTop:3}}>
                                    Kelly كامل: {kelly}% · {recK||""}
                                  </div>
                                </div>
                                <div style={{
                                  flex:1,background:C.layer2,
                                  border:"1px solid "+C.edge,
                                  borderRadius:12,padding:"10px 12px",
                                  display:"flex",flexDirection:"column",
                                  alignItems:"center",justifyContent:"center",
                                }}>
                                  <div style={{fontSize:8,color:C.smoke,marginBottom:4}}>الثقة</div>
                                  <div style={{
                                    fontSize:22,fontWeight:900,
                                    color:conf>=70?C.mint:conf>=50?C.amber:C.coral,
                                    lineHeight:1,
                                  }}>{conf}%</div>
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
                        var rsiColor = rsiV>70?C.coral:rsiV<30?C.mint:C.amber;
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
                                {l:"RSI(14)", v:rsiV!=null?rsiV.toFixed(0):"-", c:rsiColor,
                                  s:rsiV>70?"ذروة شراء":rsiV<30?"ذروة بيع":"محايد"},
                                {l:"MACD", v:macdH!=null?(macdH>0?"+":"")+macdH:"-", c:macdColor,
                                  s:macdH>0?"إيجابي":"سلبي"},
                                {l:"ADX", v:adxV!=null?adxV:"-", c:adxColor,
                                  s:adxV>35?"اتجاه قوي "+((adxBull?"↑":"↓")):adxV>25?"اتجاه نشط":"ضعيف"},
                              ].map(function(it,i){
                                return(
                                  <div key={i} style={{
                                    flex:1,background:C.layer2,
                                    border:"1px solid "+C.edge,
                                    borderRadius:10,padding:"8px 8px 6px",
                                    textAlign:"center",
                                  }}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:3}}>{it.l}</div>
                                    <div style={{fontSize:14,fontWeight:900,color:it.c,lineHeight:1}}>{it.v}</div>
                                    <div style={{fontSize:7,color:C.ash,marginTop:3,lineHeight:1.3}}>{it.s}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Row 2: CMF + OBV + VWAP */}
                            <div style={{display:"flex",gap:5,marginBottom:5}}>
                              {[
                                {l:"CMF", v:cmfV!=null?cmfV.toFixed(2):"-",
                                  c:cmfV>0.05?C.mint:cmfV<-0.05?C.coral:C.amber,
                                  s:cmfV>0.15?"تدفق قوي":cmfV>0?"تدفق إيجابي":cmfV<-0.05?"ضغط بيع":"محايد"},
                                {l:"OBV", v:obvUp!=null?(obvUp?"صاعد ↑":"هابط ↓"):"-",
                                  c:obvUp?C.mint:C.coral,
                                  s:obvUp?"تأكيد صعود":"تباعد"},
                                {l:"VWAP%", v:vwapD!=null?vwapD.toFixed(1)+"%":"-",
                                  c:vwapD>0?C.mint:vwapD<-3?C.coral:C.amber,
                                  s:vwapD>2?"فوق VWAP":vwapD<-2?"تحت VWAP":"عند VWAP"},
                              ].map(function(it,i){
                                return(
                                  <div key={i} style={{
                                    flex:1,background:C.layer2,
                                    border:"1px solid "+C.edge,
                                    borderRadius:10,padding:"8px 8px 6px",
                                    textAlign:"center",
                                  }}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:3}}>{it.l}</div>
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
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2}}>وايكوف</div>
                                    <div style={{fontSize:10,fontWeight:700,color:C.teal,
                                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wyPh}</div>
                                  </div>
                                )}
                                {msLbl&&(
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:7,color:C.ash,marginBottom:2}}>الهيكل</div>
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
                                فرصة نادرة — درجة {health.score}/100
                              </div>
                              <div style={{fontSize:10,color:C.mist,lineHeight:1.5}}>
                                هذا السهم في أعلى {Math.round((1-globalRank/allData.length)*100)}% من السوق — الإشارة استثنائية
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
                          {/* السطر ١ — القرار */}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                            <div style={{
                              background:health.sigC+"22",border:`1px solid ${health.sigC}44`,
                              borderRadius:8,padding:"4px 12px",
                              fontSize:12,fontWeight:800,color:health.sigC,
                            }}>{health.sig}</div>
                            <div style={{
                              display:"flex",alignItems:"center",gap:4,
                              background:"rgba(255,255,255,.05)",borderRadius:8,padding:"4px 10px",
                            }}>
                              <span style={{fontSize:10,color:C.smoke}}>ثقة</span>
                              <span style={{fontSize:13,fontWeight:900,color:health.sigC}}>{scoreWord(health.score)}</span>
                              <span style={{fontSize:10,color:C.smoke,fontWeight:700,
                                background:C.layer3,padding:"1px 5px",borderRadius:4}}>{health.grade}</span>
                            </div>
                          </div>
                          {/* السطر ٢ — السبب بعربي بسيط */}
                          <div style={{fontSize:11,color:C.mist,lineHeight:1.6,marginBottom:8}}>
                            {health.score>=75
                              ? `السيولة والزخم يدعمان الصعود — الحجم أعلى من المعدل بـ ${Math.round(((health.extras&&health.extras.vr)||1)*100-100)}%`
                              : health.score>=60
                              ? "السهم في مرحلة تجميع — انتظر تأكيد كسر المقاومة بحجم عالٍ"
                              : health.score>=45
                              ? "حركة السهم متذبذبة — لا توجد إشارة واضحة حالياً"
                              : "ضغط بيعي مرتفع — السيولة الذكية تخرج من السهم"}
                          </div>
                          {/* السطر ٣ — التحذير إن وُجد */}
                          {health.score<75&&(
                            <div style={{
                              display:"flex",alignItems:"center",gap:6,
                              background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",
                              borderRadius:8,padding:"5px 10px",
                            }}>
                              <span style={{fontSize:11}}>⚠</span>
                              <span style={{fontSize:10,color:C.amber}}>
                                {health.score<45
                                  ? "لا تدخل — انتظر حتى تتحسن قراءة السيولة"
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
                          onClick={e=>{ e.stopPropagation(); setFullAnalysis(stk.sym); }}
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
        <div style={{padding:"52px 20px 90px",position:"relative",zIndex:1}}>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"3px",marginBottom:4}}>SIGNALS</div>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:"-0.5px"}}>
              <span style={{
                background:`linear-gradient(90deg,${C.snow},${C.mist})`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              }}>إشارات اليوم</span>
            </div>
          </div>

          {/* ملخص الإشارات — SignalsPanel */}
          <SignalsPanel allData={allData} C={C} LC={C} scoreWord={scoreWord}/>

          {/* ══ فلاتر الفرز المتقدمة — Stock Screener ══ */}
          {(function(){
            var [screenerOpen, setScreenerOpen] = React.useState(false);
            var [filters, setFilters] = React.useState({
              minScore:0, maxScore:100,
              sig:'all',       // all|شراء قوي|مراقبة|محايد|تخفيف
              sector:'all',
              minPE:0, maxPE:200,
              minDivY:0,
              minROE:0,
              minUpside:-100,
              regime:'all',    // all|trend|chop|reversal
              gatesAll:false,
            });
            var sectorList = ['all',...new Set(allData.map(function(d){return d.stk.sec;}))];
            function applyFilter(d){
              var h=d.health||{}, s=d.stk;
              if(h.score<filters.minScore||h.score>filters.maxScore) return false;
              if(filters.sig!=='all'&&h.sig!==filters.sig) return false;
              if(filters.sector!=='all'&&s.sec!==filters.sector) return false;
              if(s.pe&&(s.pe<filters.minPE||s.pe>filters.maxPE)) return false;
              if(s.divY&&s.divY<filters.minDivY) return false;
              if(s.roe&&s.roe<filters.minROE) return false;
              if(filters.gatesAll&&!(h.gates&&h.gates.all)) return false;
              if(filters.regime!=='all'&&h.regime!==filters.regime) return false;
              return true;
            }
            var filtered2 = allData.filter(applyFilter);
            return(
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <button onClick={function(){setScreenerOpen(function(v){return !v;});}} style={{
                    display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
                    background:screenerOpen?"linear-gradient(135deg,"+C.electric+"22,"+C.electric+"11)":C.layer2,
                    border:"1px solid "+(screenerOpen?C.electric+"55":C.line),
                    borderRadius:10,color:screenerOpen?C.electric:C.smoke,fontSize:10,cursor:"pointer",fontWeight:700,
                  }}>
                    ⚙ فلاتر الفرز
                    {screenerOpen&&<span style={{background:C.electric,color:C.ink,borderRadius:4,padding:"1px 5px",fontSize:8}}>{filtered2.length}</span>}
                  </button>
                  <span style={{fontSize:9,color:C.smoke}}>{filtered2.length} سهم مطابق</span>
                </div>

                {screenerOpen&&(
                  <div style={{
                    background:C.layer2,border:"1px solid "+C.line,
                    borderRadius:14,padding:"12px 14px",marginBottom:10,
                  }}>
                    {/* Row 1: Score + Signal */}
                    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                      <div style={{flex:1,minWidth:120}}>
                        <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>درجة التحليل</div>
                        <div style={{display:"flex",gap:4,alignItems:"center"}}>
                          <input type="number" value={filters.minScore} min="0" max="100"
                            onChange={function(e){setFilters(function(f){return Object.assign({},f,{minScore:+e.target.value});});}}
                            style={{width:40,background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"3px 5px",color:C.snow,fontSize:10,textAlign:"center"}}/>
                          <span style={{color:C.smoke,fontSize:9}}>—</span>
                          <input type="number" value={filters.maxScore} min="0" max="100"
                            onChange={function(e){setFilters(function(f){return Object.assign({},f,{maxScore:+e.target.value});});}}
                            style={{width:40,background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"3px 5px",color:C.snow,fontSize:10,textAlign:"center"}}/>
                        </div>
                      </div>
                      <div style={{flex:1,minWidth:100}}>
                        <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>الإشارة</div>
                        <select value={filters.sig} onChange={function(e){setFilters(function(f){return Object.assign({},f,{sig:e.target.value});});}}
                          style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"4px 6px",color:C.snow,fontSize:9}}>
                          {['all','شراء قوي','مراقبة','محايد','تخفيف'].map(function(v){return(
                            <option key={v} value={v}>{v==='all'?'الكل':v}</option>
                          );})}
                        </select>
                      </div>
                      <div style={{flex:1,minWidth:100}}>
                        <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>القطاع</div>
                        <select value={filters.sector} onChange={function(e){setFilters(function(f){return Object.assign({},f,{sector:e.target.value});});}}
                          style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"4px 6px",color:C.snow,fontSize:9}}>
                          {sectorList.map(function(s){return(<option key={s} value={s}>{s==='all'?'الكل':s}</option>);})}
                        </select>
                      </div>
                    </div>
                    {/* Row 2: Fundamentals */}
                    <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                      {[
                        {k:'minDivY',l:'عائد توزيعات ≥',unit:'%',min:0,max:20,step:0.5},
                        {k:'minROE',l:'ROE ≥',unit:'%',min:0,max:50,step:1},
                        {k:'maxPE',l:'P/E ≤',unit:'x',min:1,max:200,step:1},
                      ].map(function(f){return(
                        <div key={f.k} style={{flex:1,minWidth:90}}>
                          <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>{f.l}</div>
                          <div style={{display:"flex",alignItems:"center",gap:3}}>
                            <input type="number" value={filters[f.k]} min={f.min} max={f.max} step={f.step}
                              onChange={function(e){var k=f.k;setFilters(function(prev){var n=Object.assign({},prev);n[k]=+e.target.value;return n;});}}
                              style={{width:50,background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"3px 5px",color:C.snow,fontSize:10,textAlign:"center"}}/>
                            <span style={{fontSize:9,color:C.ash}}>{f.unit}</span>
                          </div>
                        </div>
                      );})}
                    </div>
                    {/* Row 3: Checkboxes */}
                    <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                      <label style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}>
                        <input type="checkbox" checked={filters.gatesAll}
                          onChange={function(e){setFilters(function(f){return Object.assign({},f,{gatesAll:e.target.checked});});}}
                          style={{accentColor:C.mint}}/>
                        <span style={{fontSize:9,color:C.smoke}}>البوابات الثلاث ✅ فقط</span>
                      </label>
                      <div style={{flex:1,minWidth:100}}>
                        <select value={filters.regime} onChange={function(e){setFilters(function(f){return Object.assign({},f,{regime:e.target.value});});}}
                          style={{background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"3px 6px",color:C.snow,fontSize:9}}>
                          {[
                            {v:'all',l:'كل الأنظمة'},{v:'trend',l:'اتجاهي'},{v:'chop',l:'عرضي'},{v:'reversal',l:'انعكاسي'},
                          ].map(function(o){return(<option key={o.v} value={o.v}>{o.l}</option>);})}
                        </select>
                      </div>
                      <button onClick={function(){setFilters({minScore:0,maxScore:100,sig:'all',sector:'all',minPE:0,maxPE:200,minDivY:0,minROE:0,minUpside:-100,regime:'all',gatesAll:false});}}
                        style={{padding:"3px 10px",borderRadius:6,background:"none",border:"1px solid "+C.line,color:C.smoke,fontSize:9,cursor:"pointer"}}>
                        إعادة ضبط
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* بطاقات الإشارات */}
          {allData.sort((a,b)=>b.health.score-a.health.score).map(({stk,bars,health},i)=>(
            <div key={stk.sym} className="card-enter" style={{animationDelay:`${i*.06}s`,marginBottom:10}}>
              <div style={{
                background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
                borderRadius:16,padding:"14px 16px",
                border:`1px solid ${health.sigC}33`,
                boxShadow:`0 4px 20px rgba(0,0,0,.3), inset 0 0 0 1px ${health.sigC}08`,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {/* النقطة الملوّنة */}
                  <div style={{
                    width:44,height:44,borderRadius:12,flexShrink:0,
                    background:`linear-gradient(135deg,${health.sigC}22,${health.sigC}11)`,
                    border:`1px solid ${health.sigC}44`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:18,
                  }}>
                    {health.score>=75?"🚀":health.score>=60?"👁":"⚡"}
                  </div>

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:14,fontWeight:800,color:C.snow}}>{stk.name}</span>
                      <span style={{
                        fontSize:8,color:health.sigC,fontWeight:700,
                        background:health.sigC+"15",padding:"1px 6px",borderRadius:4,
                        border:`1px solid ${health.sigC}30`,
                      }}>{health.sig}</span>
                    </div>
                    <div style={{fontSize:10,color:C.smoke}}>{stk.sec} · {stk.sym}</div>
                  </div>

                  <div style={{textAlign:"left",flexShrink:0}}>
                    <div style={{fontSize:16,fontWeight:900,color:C.snow,direction:"ltr"}}>{stk.p.toFixed(2)}</div>
                    <div style={{
                      fontSize:10,fontWeight:700,
                      color:stk.ch>=0?C.mint:C.coral,
                      direction:"ltr",
                    }}>{stk.ch>=0?"+":""}{stk.ch.toFixed(2)}%</div>
                  </div>

                  {/* نقطة الدرجة */}
                  <div style={{
                    width:40,height:40,borderRadius:"50%",flexShrink:0,
                    background:`conic-gradient(${health.sigC} ${health.score*3.6}deg, ${C.ash} ${health.score*3.6}deg)`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                    <div style={{
                      width:30,height:30,borderRadius:"50%",
                      background:C.layer1,
                      display:"flex",alignItems:"center",justifyContent:"center",
                    }}>
                      <span style={{fontSize:9,fontWeight:800,color:health.sigC}}>{health.score}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════
           صفحة الرادار — بوابة المسح والتوجيه
      ══════════════════════════════════ */}

      {/* ══════════════════════════════════
           صفحة المحفظة الذكية — Portfolio Engine
      ══════════════════════════════════ */}
      {page==="portfolio"&&(()=>{
        // ── حساب قيم المحفظة ──
        const portWithData = port.map(function(p){
          const d = allData.find(function(x){ return x.stk.sym===p.sym; });
          if(!d) return null;
          const curPrice = d.stk.p;
          const value    = curPrice * p.qty;
          const cost     = p.avgCost * p.qty;
          const pnl      = value - cost;
          const pnlPct   = cost>0 ? (pnl/cost*100) : 0;
          return { ...p, stk:d.stk, health:d.health, bars:d.bars,
            curPrice, value, cost, pnl, pnlPct };
        }).filter(Boolean);

        const totalValue = portWithData.reduce(function(s,p){ return s+p.value; },0);
        const totalCost  = portWithData.reduce(function(s,p){ return s+p.cost;  },0);
        const totalPnL   = totalValue - totalCost;
        const totalPnLPct= totalCost>0 ? totalPnL/totalCost*100 : 0;
        const pnlColor   = totalPnL>=0 ? C.mint : C.coral;

        // فلترة البحث
        const filtered = portWithData.filter(function(p){
          return portSrch ? p.stk.name.includes(portSrch)||p.stk.sym.includes(portSrch) : true;
        });

        return (
          <div style={{padding:"52px 0 90px",position:"relative",zIndex:1}}>

            {/* ── هيدر المحفظة ── */}
            <div style={{padding:"0 16px 14px"}}>
              <div style={{
                background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
                borderRadius:18,padding:"18px 18px 16px",
                border:"1px solid "+(totalPnL>=0?C.mint:C.coral)+"33",
                boxShadow:"0 8px 32px rgba(0,0,0,.4)",
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <div style={{fontSize:10,color:C.smoke,fontWeight:700,letterSpacing:1,marginBottom:4}}>
                      إجمالي المحفظة
                    </div>
                    <div className="num glow-white" style={{fontSize:28,fontWeight:900,color:C.snow,letterSpacing:-1}}>
                      {totalValue>0 ? totalValue.toLocaleString("ar-SA",{maximumFractionDigits:0})+" ر" : "—"}
                    </div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{
                      background:pnlColor+"18",border:"1px solid "+pnlColor+"33",
                      borderRadius:12,padding:"8px 14px",
                    }}>
                      <div className="num" style={{fontSize:18,fontWeight:900,color:pnlColor}}>
                        {totalPnL>=0?"+":""}{totalPnL.toLocaleString("ar-SA",{maximumFractionDigits:0})}
                      </div>
                      <div className="num" style={{fontSize:11,color:pnlColor,marginTop:2}}>
                        {totalPnLPct>=0?"+":""}{totalPnLPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* شريط التوزيع */}
                {portWithData.length>0&&(
                  <div>
                    <div style={{display:"flex",height:6,borderRadius:4,overflow:"hidden",gap:1,marginBottom:6}}>
                      {portWithData.map(function(p,i){
                        return(
                          <div key={i} style={{
                            flex:p.value/totalValue,
                            background:p.health.sigC||C.electric,
                            opacity:0.85,
                          }}/>
                        );
                      })}
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {portWithData.map(function(p,i){
                        return(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                            <div style={{width:5,height:5,borderRadius:"50%",background:p.health.sigC||C.electric}}/>
                            <span style={{fontSize:8,color:C.smoke}}>{p.stk.name}</span>
                            <span style={{fontSize:8,color:C.ash}}>{(p.value/totalValue*100).toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── شريط بحث + إضافة ── */}
            <div style={{padding:"0 16px 10px",display:"flex",gap:8}}>
              <div style={{
                flex:1,display:"flex",alignItems:"center",gap:6,
                background:C.layer1,borderRadius:10,padding:"8px 12px",
                border:"1px solid "+C.line,
              }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.smoke} strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  value={portSrch}
                  onChange={function(e){ setPortSrch(e.target.value); }}
                  placeholder="ابحث في محفظتك..."
                  style={{
                    flex:1,background:"transparent",border:"none",outline:"none",
                    fontSize:11,color:C.snow,fontFamily:"Cairo,sans-serif",
                    textAlign:"right",
                  }}
                />
                {portSrch&&(
                  <button onClick={function(){ setPortSrch(""); }}
                    style={{background:"transparent",border:"none",cursor:"pointer",color:C.smoke,fontSize:12}}>
                    ×
                  </button>
                )}
              </div>
              <button
                onClick={function(){ setPortSheet("add"); }}
                style={{
                  background:"linear-gradient(135deg,"+C.electric+"33,"+C.electric+"18)",
                  border:"1px solid "+C.electric+"55",
                  borderRadius:10,padding:"0 14px",
                  cursor:"pointer",fontSize:18,color:C.electric,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                +
              </button>
            </div>

            {/* ── قائمة الأسهم ── */}
            {portWithData.length===0 ? (
              <div style={{
                textAlign:"center",padding:"60px 20px",
                color:C.smoke,
              }}>
                <div style={{fontSize:40,marginBottom:12}}>📊</div>
                <div style={{fontSize:14,fontWeight:700,color:C.mist,marginBottom:8}}>محفظتك فارغة</div>
                <div style={{fontSize:11,color:C.smoke,marginBottom:20}}>أضف أسهمك لتتابع أداءها</div>
                <button
                  onClick={function(){ setPortSheet("add"); }}
                  style={{
                    background:"linear-gradient(135deg,"+C.electric+"22,"+C.electric+"11)",
                    border:"1px solid "+C.electric+"44",
                    borderRadius:12,padding:"10px 24px",
                    cursor:"pointer",fontSize:12,fontWeight:700,
                    color:C.electric,fontFamily:"Cairo,sans-serif",
                  }}>
                  + أضف سهمك الأول
                </button>
              </div>
            ) : (
              <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:8}}>
                {filtered.map(function(p,i){
                  const isUp = p.pnl>=0;
                  const pColor = isUp ? C.mint : C.coral;
                  return(
                    <div key={p.sym} style={{
                      background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
                      borderRadius:14,padding:"12px 14px",
                      border:"1px solid "+pColor+"22",
                      display:"flex",alignItems:"center",gap:10,
                    }}>
                      {/* رمز الشركة */}
                      <div style={{
                        width:40,height:40,borderRadius:12,flexShrink:0,
                        background:"linear-gradient(135deg,"+p.health.sigC+"28,"+p.health.sigC+"12)",
                        border:"1px solid "+p.health.sigC+"44",
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                      }}>
                        <span style={{fontSize:8,fontWeight:800,color:p.health.sigC,letterSpacing:"-0.5px"}}>{p.stk.sym}</span>
                        <span style={{fontSize:6,color:C.smoke,marginTop:1}}>{p.health.grade}</span>
                      </div>

                      {/* اسم + قطاع */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:C.snow,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {p.stk.name}
                        </div>
                        <div style={{fontSize:9,color:C.smoke,marginTop:1}}>
                          {p.qty} وحدة · متوسط {p.avgCost.toFixed(2)}
                        </div>
                      </div>

                      {/* الربح/الخسارة */}
                      <div style={{textAlign:"left",flexShrink:0}}>
                        <div className="num" style={{fontSize:13,fontWeight:900,color:C.snow}}>
                          {p.curPrice.toFixed(2)}
                        </div>
                        <div style={{
                          display:"inline-flex",alignItems:"center",gap:2,
                          background:pColor+"18",border:"1px solid "+pColor+"33",
                          borderRadius:6,padding:"2px 6px",marginTop:2,
                        }}>
                          <span className="num" style={{fontSize:9,fontWeight:700,color:pColor}}>
                            {isUp?"+":""}{p.pnlPct.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* حذف */}
                      <button
                        onClick={function(){ setPort(function(prev){ return prev.filter(function(x){ return x.sym!==p.sym; }); }); }}
                        style={{
                          background:"rgba(240,79,90,.12)",border:"1px solid rgba(240,79,90,.2)",
                          borderRadius:8,width:28,height:28,cursor:"pointer",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          flexShrink:0,color:C.coral,fontSize:14,
                        }}>
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── شيت إضافة سهم ── */}
            {portSheet==="add"&&(
              <div style={{
                position:"fixed",inset:0,background:"rgba(0,0,0,.7)",
                zIndex:200,display:"flex",alignItems:"flex-end",
              }} onClick={function(){ setPortSheet(null); }}>
                <div style={{
                  width:"100%",background:C.layer1,
                  borderRadius:"20px 20px 0 0",
                  padding:"20px 20px 40px",
                  border:"1px solid "+C.line,
                }} onClick={function(e){ e.stopPropagation(); }}>
                  <div style={{
                    width:40,height:4,background:C.ash,borderRadius:2,
                    margin:"0 auto 16px",
                  }}/>
                  <div style={{fontSize:14,fontWeight:800,color:C.snow,marginBottom:16,textAlign:"right"}}>
                    إضافة سهم للمحفظة
                  </div>
                  {(function(){
                    const [addSym,setAddSym]= useState("");
                    const [addQty,setAddQty]= useState("");
                    const [addCost,setAddCost]= useState("");
                    const found = STOCKS.find(function(s){ return s.sym===addSym||s.name===addSym; });
                    const canAdd = found&&parseFloat(addQty)>0&&parseFloat(addCost)>0;
                    return(
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {/* اختيار السهم */}
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <span style={{fontSize:10,color:C.smoke,fontWeight:700}}>السهم</span>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                            {STOCKS.map(function(s){
                              return(
                                <button key={s.sym}
                                  onClick={function(){ setAddSym(s.sym); setAddCost(s.p.toFixed(2)); }}
                                  style={{
                                    background:addSym===s.sym?s.sec==="طاقة"?C.gold+"22":C.electric+"22":"transparent",
                                    border:"1px solid "+(addSym===s.sym?C.electric+"66":C.line),
                                    borderRadius:8,padding:"5px 10px",cursor:"pointer",
                                    fontSize:10,fontWeight:700,color:addSym===s.sym?C.snow:C.smoke,
                                    fontFamily:"Cairo,sans-serif",
                                  }}>
                                  {s.sym}
                                </button>
                              );
                            })}
                          </div>
                          {found&&<div style={{fontSize:10,color:C.mist,marginTop:2}}>{found.name} · {found.p.toFixed(2)} ر</div>}
                        </div>
                        {/* الكمية والتكلفة */}
                        <div style={{display:"flex",gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:10,color:C.smoke,marginBottom:4}}>الكمية</div>
                            <input
                              type="number" value={addQty}
                              onChange={function(e){ setAddQty(e.target.value); }}
                              placeholder="100"
                              style={{
                                width:"100%",background:C.layer2,border:"1px solid "+C.line,
                                borderRadius:8,padding:"8px 10px",fontSize:13,color:C.snow,
                                fontFamily:"Cairo,sans-serif",outline:"none",textAlign:"center",
                                boxSizing:"border-box",
                              }}
                            />
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:10,color:C.smoke,marginBottom:4}}>متوسط التكلفة</div>
                            <input
                              type="number" value={addCost}
                              onChange={function(e){ setAddCost(e.target.value); }}
                              placeholder="0.00"
                              style={{
                                width:"100%",background:C.layer2,border:"1px solid "+C.line,
                                borderRadius:8,padding:"8px 10px",fontSize:13,color:C.snow,
                                fontFamily:"Cairo,sans-serif",outline:"none",textAlign:"center",
                                boxSizing:"border-box",
                              }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={function(){
                            if(!canAdd) return;
                            setPort(function(prev){
                              const existing = prev.find(function(x){ return x.sym===addSym; });
                              if(existing){
                                return prev.map(function(x){
                                  if(x.sym!==addSym) return x;
                                  const newQty = x.qty+parseFloat(addQty);
                                  const newCost= (x.avgCost*x.qty+parseFloat(addCost)*parseFloat(addQty))/newQty;
                                  return{...x,qty:newQty,avgCost:newCost};
                                });
                              }
                              return [...prev,{sym:addSym,qty:parseFloat(addQty),avgCost:parseFloat(addCost)}];
                            });
                            setPortSheet(null);
                          }}
                          style={{
                            width:"100%",padding:"12px",
                            background:canAdd?"linear-gradient(135deg,"+C.mint+"33,"+C.mint+"18)":"rgba(255,255,255,.05)",
                            border:"1px solid "+(canAdd?C.mint+"55":C.line),
                            borderRadius:12,cursor:canAdd?"pointer":"default",
                            fontSize:13,fontWeight:800,
                            color:canAdd?C.mint:C.smoke,
                            fontFamily:"Cairo,sans-serif",
                            transition:"all .2s ease",
                          }}>
                          {canAdd?"✓ إضافة للمحفظة":"اختر سهماً وأدخل الكمية والتكلفة"}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

          </div>
        );
      })()}

      {/* ══════════════════════════════════
           صفحة الحساب
      ══════════════════════════════════ */}
      {page==="profile"&&(
        <div style={{padding:"52px 20px 90px",position:"relative",zIndex:1}}>
          {/* بطاقة الحساب */}
          <div style={{
            background:`linear-gradient(135deg,${C.layer2} 0%,${C.layer3} 100%)`,
            borderRadius:22,padding:"24px",
            border:`1px solid ${C.gold}33`,
            marginBottom:20,
            boxShadow:`0 16px 48px rgba(0,0,0,.4), inset 0 1px 0 ${C.gold}18`,
            position:"relative",overflow:"hidden",
          }}>
            <div style={{
              position:"absolute",bottom:-40,left:-40,width:180,height:180,borderRadius:"50%",
              background:`radial-gradient(circle, ${C.gold}10 0%, transparent 70%)`,
            }}/>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
              <div style={{
                width:64,height:64,borderRadius:18,
                background:`linear-gradient(135deg,${C.gold},${C.goldD})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,
                boxShadow:`0 8px 24px ${C.gold}44`,
              }}>👤</div>
              <div>
                <div style={{fontSize:18,fontWeight:900,color:C.snow}}>مستثمر احترافي</div>
                <div style={{fontSize:11,color:C.gold,fontWeight:600,marginTop:2}}>عضو ذهبي · Premium</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[
                {l:"المحفظة",v:"٢٤٠ ألف",c:C.gold},
                {l:"العائد",  v:"+١٢.٣%",  c:C.mint},
                {l:"الصفقات",v:"٤٧",       c:C.electric},
              ].map(i=>(
                <div key={i.l} style={{
                  background:"rgba(255,255,255,.04)",borderRadius:12,
                  padding:"12px 8px",textAlign:"center",
                  border:`1px solid ${C.line}`,
                }}>
                  <div style={{fontSize:16,fontWeight:900,color:i.c,marginBottom:3}}>{i.v}</div>
                  <div style={{fontSize:9,color:C.smoke}}>{i.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* قائمة الإعدادات */}
          {[
            {icon:"🔔",l:"التنبيهات",       d:"٣ تنبيهات نشطة"},
            {icon:"📊",l:"نتائج التحليل",   d:"آخر تحديث: الآن"},
            {icon:"⚙️",l:"الإعدادات",        d:"الملف الشخصي"},
            {icon:"🔐",l:"الأمان والخصوصية",d:"محمي"},
            {icon:"❓",l:"المساعدة والدعم",  d:"متاح ٢٤/٧"},
          ].map((item,i)=>(
            <div key={item.l} className="card-enter" style={{animationDelay:`${i*.07}s`,marginBottom:8}}>
              <div style={{
                background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
                borderRadius:14,padding:"14px 16px",
                border:`1px solid ${C.line}`,
                display:"flex",alignItems:"center",gap:14,cursor:"pointer",
                transition:"all .2s",
              }}>
                <div style={{
                  width:40,height:40,borderRadius:10,
                  background:C.layer3,border:`1px solid ${C.line}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:18,flexShrink:0,
                }}>{item.icon==="fire"
                  ?<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round"><path d="M12 2C10 6 7 9 7 13a5 5 0 0 0 10 0c0-3-2-5-3-7-0.5 2.5-2 4-2 4s-1-2.5 0-5"/></svg>
                  :item.icon==="bolt"
                  ?<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
                  :<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.snow}}>{item.l}</div>
                  <div style={{fontSize:10,color:C.smoke,marginTop:1}}>{item.d}</div>
                </div>
                <div style={{color:C.smoke,fontSize:12}}>›</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════
           شريط التنقل السفلي
      ══════════════════════════════════ */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,zIndex:50,
        padding:"0 12px 0",
      }}>
        {/* الحاوية مع blur */}
        <div style={{
          background:`${C.layer2}ee`,
          backdropFilter:"blur(20px)",
          WebkitBackdropFilter:"blur(20px)",
          borderRadius:"20px 20px 0 0",
          border:`1px solid ${C.line}`,
          borderBottom:"none",
          padding:"6px 4px 14px",
          display:"flex",
          boxShadow:`0 -8px 32px rgba(0,0,0,.4), inset 0 1px 0 ${C.layer3}`,
        }}>
          {navItems.map(({id,icon,label})=>{
            const active=page===id;
            return(
              <button key={id} onClick={()=>setPage(id)} style={{
                flex:1,display:"flex",flexDirection:"column",
                alignItems:"center",gap:4,cursor:"pointer",
                background:"none",border:"none",padding:"6px 0",
                position:"relative",
              }}>
                {/* المؤشر العلوي */}
                {active&&(
                  <div style={{
                    position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                    width:30,height:3,borderRadius:2,
                    background:`linear-gradient(90deg,${C.gold},${C.goldL})`,
                    boxShadow:`0 0 10px ${C.gold}88`,
                  }}/>
                )}

                {/* الأيقونة */}
                <div style={{
                  width:38,height:38,borderRadius:12,
                  background:active
                    ? `linear-gradient(135deg,${C.gold}22,${C.gold}11)`
                    : "transparent",
                  border:active ? `1px solid ${C.gold}44` : "1px solid transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,
                  transition:"all .3s cubic-bezier(.4,0,.2,1)",
                  boxShadow:active ? `0 4px 16px ${C.gold}22` : "none",
                  color: active ? C.gold : C.smoke,
                }}>
                  {icon}
                </div>

                <span style={{
                  fontSize:9,fontWeight:active?700:500,
                  color:active?C.gold:C.smoke,
                  transition:"color .3s",letterSpacing:".3px",
                }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ شريط الحالة العلوي ══ */}
      <div style={{
        position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,
        padding:"12px 20px 6px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        background:`linear-gradient(180deg,${C.void} 60%,transparent 100%)`,
        zIndex:40,pointerEvents:"none",
      }}>
        <div style={{fontSize:9,fontWeight:600,color:C.smoke}}>9:41</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:4,
            background:`${C.mint}18`,borderRadius:20,padding:"2px 8px",
            border:`1px solid ${C.mint}30`,
          }}>
            <div className="live-dot" style={{width:5,height:5,borderRadius:"50%",background:C.mint}}/>
            <span style={{fontSize:8,fontWeight:700,color:C.mint}}>مباشر</span>
          </div>
          <span style={{fontSize:9,color:C.smoke}}>📶 ▪▪▪</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
           لوحة التحليل الكامل — ٩ طبقات (Modal)
      ══════════════════════════════════════════════ */}
      {fullAnalysis&&(()=>{
        const fd = allData.find(d=>d.stk.sym===fullAnalysis);
        if(!fd) return null;
        const {stk, bars, health} = fd;
        const up = stk.ch>=0;
        const pC = up?C.mint:C.coral;

        // استخدام البيانات المحسوبة مسبقاً من calc9Layers
        const {L1,L2,L3,L4,L5,L6,L7,L8,L9} = health.layers;
        const ex = health.extras;

        // ألوان كل طبقة
        const lc = v => v>=70?C.mint:v>=50?C.amber:C.coral;

        // أوصاف مفهومة — بدون مصطلحات تقنية
        const wyDesc = ex.spring&&ex.sos
          ? "نمط تجميع قوي — المال الذكي يشتري على الانخفاضات ✅"
          : ex.upth
          ? "تحذير: الكسر الوهمي — ارتفع ثم أغلق للأسفل ⚠"
          : ex.harm>2
          ? "تجميع نشط — الحجم يرتفع مع الصعود"
          : "لا نمط واضح — حركة عشوائية";

        const rscRank  = [...liveStocks].sort((a,b)=>b.ch-a.ch).findIndex(x=>x.sym===stk.sym)+1;
        const sectorPeersModal = STOCKS.filter(function(x){ return x.sec===stk.sec && x.sym!==stk.sym; });
        const sectorAvgChModal = sectorPeersModal.length>0
          ? (sectorPeersModal.reduce(function(s,x){ return s+x.ch; },0)/sectorPeersModal.length).toFixed(2)
          : "0.00";
        const sectorRelModal   = (stk.ch - parseFloat(sectorAvgChModal)).toFixed(2);
        const rscDesc = `رتبة ${rscRank} من ${STOCKS.length} في السوق · قطاع ${stk.sec} متوسطه ${sectorAvgChModal}% · السهم ${parseFloat(sectorRelModal)>=0?"يتفوق":"يتأخر"} عن قطاعه بـ ${Math.abs(parseFloat(sectorRelModal)).toFixed(1)}%`;

        const triDesc  = ex.triOk===3
          ? `ثلاثة مؤشرات متوافقة — ${ex.adxV>40?"اتجاه قوي جداً ✅":"اتجاه مؤكد ✅"}`
          : ex.triOk===2
          ? "مؤشران من ثلاثة — إشارة جزئية، انتظر تأكيداً"
          : "المؤشرات متضاربة — لا توجد إشارة واضحة ⚠";

        const kelAdj   = ex.kelly*.5;
        const kelDesc  = kelAdj>=.08
          ? `نسبة الدخول المثلى: ${(kelAdj*100).toFixed(1)}% من المحفظة — الصفقة مبررة رياضياً ✅`
          : `نسبة الدخول: ${(kelAdj*100).toFixed(1)}% — صغيرة جداً، المخاطرة أكبر من العائد ❌`;

        const bayPrior = Math.round((L1+L2+L3+L4+L5+L6)/600*100);
        const bayDelta = L7-bayPrior;
        const bayDesc  = `الاحتمالية الأولية: ${bayPrior}% ← بعد تحليل الحجم والاتجاه: ${L7}% (${bayDelta>=0?"تحسّن +":"تراجع "}${Math.abs(bayDelta)}%)`;

        const radarGrade = L8>=80?"S":L8>=70?"A":L8>=60?"B":L8>=50?"C":"D";
        const radarColor = L8>=75?C.mint:L8>=60?C.amber:L8>=45?C.teal:C.coral;
        const radarDesc  = `مجموع نقاط الفرصة: ${L8}/100 — تصنيف ${radarGrade} ${L8>=75?"✅":L8>=50?"⚠":"❌"}`;

        const lpi      = Math.round((ex.vr-1)*40);
        const liqType  = L9>=75&&up?"مؤسسي":L9>=55&&up?"جيد":stk.ch<-1.5&&ex.vr>1.2?"تصريف":"محايد";
        const liqColor = liqType==="مؤسسي"?C.electric:liqType==="جيد"?C.mint:liqType==="تصريف"?C.coral:C.smoke;
        const liqDesc  = liqType==="مؤسسي"
          ? `حجم التداول أعلى بـ ${Math.round((ex.vr-1)*100)}% — المال الكبير يدخل ✅`
          : liqType==="جيد"
          ? `سيولة إيجابية — الحجم فوق المعدل بـ ${Math.round((ex.vr-1)*100)}%`
          : liqType==="تصريف"
          ? `⚠ ضغط بيعي — حجم عالٍ مع هبوط السعر`
          : `سيولة عادية — لا توجد حركة مؤسسية واضحة`;

        const erDesc   = ex.harm>2
          ? `توافق جيد: ${ex.harm} شمعة حجم+حركة، تعارض: ${ex.div} ✅`
          : `ضعيف: الحجم لا يدعم الحركة (تعارض: ${ex.div})`;

        const entDesc  = L3>=70
          ? `الحركة منظمة ومتجهة — مناسب للتحليل`
          : `حركة فوضوية — المؤشرات أقل موثوقية ⚠`;

        // الطبقات — بأوصاف مفهومة وأوزان
        // الأوزان الفعلية المستخدمة (من النظام التكيّفي)
        const W = health.weights || {
          L9:0.26,L1:0.22,L4:0.16,L5:0.12,
          L7:0.09,L8:0.07,L6:0.04,L2:0.03,L3:0.01,
        };

        const regimeLabel = health.regime==="bull" ? "سوق صاعد 🚀"
                          : health.regime==="bear" ? "سوق هابط 📉"
                          : "سوق متذبذب ⚖️";
        const regimeColor = health.regime==="bull" ? C.mint
                          : health.regime==="bear" ? C.coral
                          : C.amber;
        const regimeDesc  = health.regime==="bull"
          ? "الأوزان مُحسَّنة للزخم النسبي والسيولة (Jegadeesh & Titman)"
          : health.regime==="bear"
          ? "الأوزان مُحسَّنة للسيولة الدفاعية (Amihud 2002)"
          : "الأوزان مُحسَّنة للفلاتر والبيئة الغامضة (Lo 2004)";

        const layers = [
          {n:"٩", title:"قوة السيولة",       score:L9, color:liqColor, weight:Math.round(W.L9*100), desc:liqDesc,   icon:"💧", id:"L9", simple:"هل المال يدخل أم يخرج؟"},
          {n:"١", title:"هيكل الحركة",       score:L1, color:lc(L1),  weight:Math.round(W.L1*100), desc:wyDesc,    icon:"🏗", id:"L1", simple:"هل النمط يشبه الصعود؟"},
          {n:"٤", title:"أداء مقارنة بالسوق",score:L4, color:lc(L4),  weight:Math.round(W.L4*100), desc:rscDesc,   icon:"💪", id:"L4", simple:"هل السهم يتفوق على السوق؟"},
          {n:"٥", title:"تأكيد المؤشرات",    score:L5, color:lc(L5),  weight:Math.round(W.L5*100), desc:triDesc,   icon:"🔗", id:"L5", simple:"هل ٣ مؤشرات تتفق؟"},
          {n:"٧", title:"ثقة الاحتمالية",    score:L7, color:lc(L7),  weight:Math.round(W.L7*100), desc:bayDesc,   icon:"🧮", simple:"نسبة نجاح الإشارة رياضياً"},
          {n:"٨", title:"نقاط الفرصة",       score:L8, color:lc(L8),  weight:Math.round(W.L8*100), desc:radarDesc, icon:"🎯", id:"L8", simple:"تقييم جوهري مستقل"},
          {n:"٦", title:"جدوى الصفقة",       score:L6, color:lc(L6),  weight:Math.round(W.L6*100), desc:kelDesc,   icon:"📐", simple:"هل العائد يستحق المخاطرة؟"},
          {n:"٢", title:"توافق الحجم والحركة",score:L2,color:lc(L2),  weight:Math.round(W.L2*100), desc:erDesc,    icon:"⚖️", id:"L2", simple:"هل الحجم يدعم الاتجاه؟"},
          {n:"٣", title:"انتظام الحركة",     score:L3, color:lc(L3),  weight:Math.round(W.L3*100), desc:entDesc,   icon:"📊", simple:"هل الحركة منظمة أم فوضوية؟"},
        ];

        // النتيجة النهائية
        const finalScore = health.score;
        const finalGrade = health.grade;
        const finalColor = health.sigC;

        // ملخص القرار الثلاثي
        const decisionText = finalScore>=75
          ? "السيولة والزخم يدعمان الدخول"
          : finalScore>=60
          ? "إشارة إيجابية — انتظر تأكيد الحجم"
          : finalScore>=45
          ? "لا توجد إشارة واضحة حالياً"
          : "ضغط بيعي — تجنّب الدخول";
        const warningText = finalScore<75
          ? finalScore<45 ? "ابتعد عن هذا السهم الآن" : "تحقق من الحجم قبل الدخول"
          : null;

        return(
          <div style={{
            position:"fixed",inset:0,zIndex:200,
            background:"rgba(6,8,15,.88)",
            backdropFilter:"blur(14px)",
            WebkitBackdropFilter:"blur(14px)",
            display:"flex",alignItems:"flex-end",justifyContent:"center",
            animation:"fadeIn .25s ease both",
          }} onClick={()=>setFullAnalysis(null)}>
            {/* الدرج المنزلق من الأسفل */}
            <div
              onClick={e=>e.stopPropagation()}
              style={{
                width:"100%",maxWidth:430,
                background:"linear-gradient(180deg," + C.layer2 + " 0%," + C.deep + " 100%)",
                borderRadius:"24px 24px 0 0",
                border:"1px solid " + C.line,
                borderBottom:"none",
                maxHeight:"78vh",
                display:"flex",flexDirection:"column",
                boxShadow:"0 -24px 64px rgba(0,0,0,.8), inset 0 1px 0 " + C.layer3,
                animation:"slideUp .38s cubic-bezier(.16,1,.3,1) both",
                flexShrink:0,
              }}>

              {/* ── مقبض السحب + زر الإغلاق السريع ── */}
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"10px 16px 0",
              }}>
                <button
                  onClick={()=>setFullAnalysis(null)}
                  style={{
                    width:44,height:44,borderRadius:12,border:"1px solid " + C.line,
                    background:C.layer3,color:C.mist,fontSize:18,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>✕</button>
                <div style={{width:40,height:4,borderRadius:2,background:C.ash}}/>
                <div style={{width:44,height:44}}/>{/* spacer */}
              </div>

              {/* ── رأس اللوحة ── */}
              <div style={{
                padding:"14px 20px 14px",
                borderBottom:`1px solid ${C.line}`,
                display:"flex",alignItems:"center",justifyContent:"space-between",
                flexShrink:0,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  {/* حلقة النتيجة النهائية */}
                  <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                    <svg width={52} height={52} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                      <circle cx={26} cy={26} r={21} fill="none" stroke={C.ash} strokeWidth={4} strokeOpacity={.2}/>
                      <circle cx={26} cy={26} r={21} fill="none" stroke={finalColor} strokeWidth={4}
                        strokeDasharray={2*Math.PI*21}
                        strokeDashoffset={2*Math.PI*21*(1-finalScore/100)}
                        strokeLinecap="round"
                        style={{filter:"drop-shadow(0 0 5px " + finalColor + "aa)",transition:"stroke-dashoffset 1s ease"}}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <div style={{fontSize:14,fontWeight:900,color:finalColor,lineHeight:1}}>{finalScore}</div>
                      <div style={{fontSize:6,color:C.smoke,marginTop:1}}>{finalGrade}</div>
                    </div>
                  </div>
                  <div>
                    <div className="glow-white" style={{fontSize:16,fontWeight:900,color:C.snow}}>{stk.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                      <span style={{
                        fontSize:9,fontWeight:700,color:health.sigC,
                        background:health.sigC+"18",border:"1px solid " + health.sigC + "33",
                        padding:"1px 7px",borderRadius:5,
                      }}>{health.sig}</span>
                      <span style={{fontSize:10,fontWeight:700,color:pC,direction:"ltr"}}>
                        {up?"+":""}{stk.ch.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── العنوان ── */}
              <div style={{
                padding:"12px 20px 8px",
                display:"flex",alignItems:"center",gap:8,flexShrink:0,
              }}>
                <div style={{width:3,height:16,background:finalColor,borderRadius:2}}/>
                <span style={{fontSize:12,fontWeight:700,color:C.mist,letterSpacing:".5px"}}>التحليل الكامل — ٩ طبقات</span>
                <div style={{
                  marginRight:"auto",background:finalColor+"18",
                  border:`1px solid ${finalColor}33`,borderRadius:8,padding:"2px 8px",
                }}>
                  <span style={{fontSize:9,fontWeight:700,color:finalColor}}>نتيجة موحّدة: {finalScore} ({finalGrade})</span>
                </div>
              </div>

              {/* ── المحتوى القابل للتمرير ── */}
              <div style={{overflowY:"auto",padding:"4px 16px 32px",flex:1}}>

                {/* ══ بطاقة النظام السوقي ══ */}
                <div style={{
                  marginBottom:10,
                  background:"linear-gradient(135deg,"+regimeColor+"10,"+regimeColor+"05)",
                  border:"1px solid "+regimeColor+"35",
                  borderRadius:12,padding:"10px 14px",
                  display:"flex",alignItems:"center",gap:10,
                }}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                      <span style={{fontSize:10,fontWeight:800,color:regimeColor}}>{regimeLabel}</span>
                      <div style={{background:regimeColor+"20",border:"1px solid "+regimeColor+"40",borderRadius:5,padding:"1px 7px"}}>
                        <span style={{fontSize:7,fontWeight:700,color:regimeColor}}>الأوزان مُعدَّلة تلقائياً</span>
                      </div>
                    </div>
                    <div style={{fontSize:8,color:C.smoke,lineHeight:1.4}}>{regimeDesc}</div>
                  </div>
                  <div style={{textAlign:"center",flexShrink:0,background:"rgba(255,255,255,.04)",borderRadius:8,padding:"6px 10px"}}>
                    <div style={{fontSize:13,fontWeight:900,color:regimeColor}}>{Math.round((ex.mktBreadth||0.5)*100)}%</div>
                    <div style={{fontSize:7,color:C.smoke}}>اتساع</div>
                  </div>
                </div>

                {/* الطبقات التسع — مرتّبة حسب الأهمية */}
                {layers.map((ly,i)=>(
                  <div key={ly.n} style={{
                    marginBottom:10,
                    background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
                    borderRadius:16,padding:"14px 14px 12px",
                    border:`1px solid ${ly.color}${i<2?"44":"22"}`,
                    boxShadow: i<2
                      ? `inset 0 1px 0 ${C.layer3}, 0 4px 20px ${ly.color}18`
                      : `inset 0 1px 0 ${C.layer3}`,
                    animation:`fadeSlideUp .4s cubic-bezier(.16,1,.3,1) ${i*.05}s both`,
                    position:"relative",overflow:"hidden",
                  }}>
                    {/* شريط الترتيب للطبقتين الأهم */}
                    {i<2&&<div style={{
                      position:"absolute",top:0,right:0,
                      background:`linear-gradient(135deg,${ly.color}33,${ly.color}11)`,
                      padding:"3px 10px 3px 16px",
                      borderRadius:"0 16px 0 12px",
                      fontSize:8,fontWeight:800,color:ly.color,
                      borderLeft:`1px solid ${ly.color}33`,
                      borderBottom:`1px solid ${ly.color}33`,
                    }}>
                      {i===0?"🏆 الأهم":"🥈 الثانية"}
                    </div>}

                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {/* أيقونة */}
                      <div style={{
                        width:40,height:40,borderRadius:12,flexShrink:0,
                        background:`${ly.color}18`,border:`1px solid ${ly.color}${i<2?"44":"33"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:16,
                        boxShadow: i<2 ? `0 4px 12px ${ly.color}33` : "none",
                      }}>
                        <LayerIcon id={ly.id} color={ly.color} size={20}/>
                      </div>

                      {/* المعلومات */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                          <div style={{display:"flex",alignItems:"center",gap:5}}>
                            {/* رقم الطبقة */}
                            <span style={{
                              fontSize:9,fontWeight:700,color:ly.color,
                              background:ly.color+"18",padding:"1px 6px",borderRadius:4,
                            }}>طبقة {ly.n}</span>
                            <span style={{fontSize:12,fontWeight:800,color:C.snow}}>{ly.title}</span>
                            <span style={{
                              fontSize:8,fontWeight:700,
                              color:ly.weight>=15?C.gold:ly.weight>=9?C.mist:C.smoke,
                              background:"rgba(255,255,255,.05)",
                              border:"1px solid rgba(255,255,255,.08)",
                              padding:"1px 5px",borderRadius:4,
                            }}>{ly.weight}%</span>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                            <span className="glow-white" style={{fontSize:22,fontWeight:900,color:ly.color,letterSpacing:"-1px",lineHeight:1}}>{ly.score}</span>
                            <span style={{fontSize:8,fontWeight:700,color:ly.color}}>
                              {ly.score>=75?"قوي":ly.score>=55?"معتدل":ly.score>=35?"ضعيف":"متدنٍ"}
                            </span>
                          </div>
                        </div>

                        {/* السؤال البسيط */}
                        <div style={{fontSize:9,color:C.smoke,marginBottom:5,fontStyle:"italic"}}>{ly.simple}</div>

                        {/* شريط التقدم */}
                        <div style={{position:"relative",marginBottom:5}}>
                          {/* شريط الخلفية */}
                          <div style={{height:5,background:C.ash+"44",borderRadius:3,overflow:"hidden"}}>
                            <div style={{
                              height:"100%",width:`${ly.score}%`,
                              background:`linear-gradient(90deg,${ly.color}70,${ly.color})`,
                              borderRadius:3,
                              boxShadow:`0 0 8px ${ly.color}66`,
                              transition:"width .9s cubic-bezier(.4,0,.2,1)",
                            }}/>
                          </div>
                          {/* مؤشر الوزن النسبي */}
                          <div style={{
                            position:"absolute",top:0,left:`${ly.weight*4}%`,
                            width:1.5,height:"100%",
                            background:C.smoke+"88",
                            borderRadius:1,
                          }}/>
                        </div>

                        {/* الوصف */}
                        <div style={{fontSize:9.5,color:C.mist,lineHeight:1.4}}>{ly.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* ملخص الدمج */}
                <div style={{
                  marginTop:6,
                  background:`linear-gradient(135deg,${finalColor}12,${finalColor}06)`,
                  borderRadius:18,padding:"16px",
                  border:`1px solid ${finalColor}33`,
                  boxShadow:`0 8px 32px ${finalColor}18`,
                }}>
                  <div style={{fontSize:11,fontWeight:700,color:C.smoke,marginBottom:12,letterSpacing:".5px"}}>
                    محرك الدمج — القرار الموحّد
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{position:"relative",width:70,height:70,flexShrink:0}}>
                      <svg width={70} height={70} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                        <circle cx={35} cy={35} r={28} fill="none" stroke={C.ash} strokeWidth={5} strokeOpacity={.2}/>
                        <circle cx={35} cy={35} r={28} fill="none" stroke={finalColor} strokeWidth={5}
                          strokeDasharray={2*Math.PI*28}
                          strokeDashoffset={2*Math.PI*28*(1-finalScore/100)}
                          strokeLinecap="round"
                          style={{filter:`drop-shadow(0 0 8px ${finalColor}cc)`,transition:"stroke-dashoffset 1s ease"}}/>
                        <circle cx={35} cy={35} r={21} fill="none" stroke={finalColor} strokeWidth={1.5}
                          strokeDasharray={2*Math.PI*21}
                          strokeDashoffset={2*Math.PI*21*(1-finalScore/100)}
                          strokeLinecap="round" strokeOpacity={.3}/>
                      </svg>
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                        <div style={{fontSize:20,fontWeight:900,color:finalColor,lineHeight:1}}>{finalScore}</div>
                        <div style={{fontSize:7,color:C.smoke,marginTop:1}}>من 100</div>
                      </div>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{
                        fontSize:22,fontWeight:900,color:finalColor,
                        background:`linear-gradient(90deg,${finalColor},${finalColor}aa)`,
                        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
                        marginBottom:4,
                      }}>تصنيف {finalGrade}</div>
                      <div style={{
                        display:"inline-flex",alignItems:"center",gap:5,
                        background:health.sigC+"18",border:`1px solid ${health.sigC}33`,
                        borderRadius:10,padding:"4px 12px",marginBottom:6,
                      }}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:health.sigC,
                          boxShadow:`0 0 6px ${health.sigC}`}}/>
                        <span style={{fontSize:12,fontWeight:700,color:health.sigC}}>{health.sig}</span>
                      </div>
                      <div style={{fontSize:10,color:C.mist}}>
                        ثقة: <span style={{fontWeight:700,color:finalColor}}>{finalScore}%</span>
                        {" · "}رادار: <span style={{fontWeight:700,color:radarColor}}>{L8}/100</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
