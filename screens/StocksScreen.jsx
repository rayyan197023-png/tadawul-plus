'use client';
import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from "react";
import { useHaptic }          from '../hooks/useHaptic';
import { usePullToRefresh }   from '../hooks/usePullToRefresh';
import { useNav, useSharedPrices, useStockState } from '../store';
import { STOCKS } from '../constants/stocksData';
import StockDetail from '../features/stock/StockDetail';

const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#141d2b", layer2:"#1e2d42", layer3:"#243352",
  edge:"#2e3e60", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878", goldD:"#c09030",
  electric:"#4d9fff", electricL:"#82c0ff",
  plasma:"#a78bfa", mint:"#1ee68a", coral:"#ff5f6a", coralL:"#ff7a84",
  amber:"#fbbf24", teal:"#22d3ee",
};

const nowStr = () => { const d=new Date(),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

const SECTOR_COLORS = {
  طاقة:C.amber, بنوك:C.electric, بتروكيماويات:C.plasma,
  أغذية:C.mint, تقنية:C.teal, تعدين:C.gold, تأمين:C.coral,
  عقارات:C.electricL, سياحة:C.goldL, لوجستية:C.teal,
  "رعاية صحية":C.mint, "مواد بناء":C.smoke,
  صناعة:C.ash, مطاعم:C.amber, "طاقة متجددة":C.mint,
  زراعة:C.gold,
};

function genBars(stk) {
  let seed = stk.sym.split("").reduce((a,c)=>a+c.charCodeAt(0),0)*7919;
  const rnd = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };
  const bars = [];
  let price = stk.p * (0.88 + rnd()*0.06);
  const trend = stk.ch >= 0 ? 0.501 : 0.499;
  for (let i = 0; i < 60; i++) {
    const chg = (rnd() - trend) * price * 0.022;
    price = Math.max(price*0.7, Math.min(price*1.3, price + chg));
    bars.push({ c:price, vol:stk.avgV*(0.6+rnd()*.9) });
  }
  bars[bars.length-1].c = stk.p;
  return bars;
}

function MiniChart({ bars, color, h=40, id="" }) {
  const W=200, H=h;
  const prices = bars.slice(-30).map(b=>b.c);
  const mn=Math.min(...prices), mx=Math.max(...prices), rng=mx-mn||1;
  const toY = p => H-((p-mn)/rng)*(H-8)-4;
  const pts = prices.map((p,i)=>`${(i/(prices.length-1))*W},${toY(p)}`).join(" ");
  const area = `0,${H} `+prices.map((p,i)=>`${(i/(prices.length-1))*W},${toY(p)}`).join(" ")+` ${W},${H}`;
  const gid = `mg${id}${color.replace("#","")}`;
  const lastY = toY(prices[prices.length-1]);
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{display:"block"}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={.22}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"/>
<circle cx={W} cy={lastY} r={2.2} fill={color}/>
    </svg>
  );
}

const StockCard = React.memo(function StockCard({ stk, bars, flash, openDetail, setFlash, fmtVol }) {
  const up = stk.ch >= 0;
  const pc = up ? C.mint : C.coral;
  const isFlsh = flash === stk.sym;
  return (
    <div className="card-stagger" style={{position:"relative",borderRadius:12,overflow:"hidden"}}
      onClick={()=>{setFlash(stk.sym);setTimeout(()=>setFlash(null),350);openDetail(stk.sym);}}>
      <div className={`stk-card ${isFlsh?"flash":""}`}
        style={{background:`linear-gradient(160deg,${C.layer1} 0%,${C.layer2} 100%)`,border:`1px solid ${C.line+"66"}`,boxShadow:`0 1px 6px rgba(0,0,0,.25)`,cursor:"pointer"}}>
        <div style={{height:3,background:up?`linear-gradient(90deg,${C.mint}00,${C.mint}cc,${C.mint}00)`:`linear-gradient(90deg,${C.coral}00,${C.coral}cc,${C.coral}00)`}}/>
        <div style={{display:"flex",gap:0}}>
          <div style={{flexShrink:0,minHeight:60,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,paddingTop:10,paddingBottom:10,paddingRight:10,paddingLeft:8}}>
            <div style={{fontSize:14,fontWeight:900,color:C.snow,lineHeight:1,letterSpacing:"-.3px"}}>{stk.name}</div>
            <span style={{fontSize:11,color:C.ash,background:C.layer3,padding:"1px 5px",borderRadius:4}}>{stk.sym}</span>
            <div style={{display:"flex",alignItems:"center",gap:2}}>
              <span style={{fontSize:11,fontWeight:700,color:stk.v>stk.avgV?C.mint:C.ash,fontFamily:"monospace"}}>{fmtVol(stk.v)}</span>
              {stk.v>stk.avgV*1.3&&<span style={{fontSize:11,color:C.mint}}>↑</span>}
            </div>
          </div>
          <div style={{flex:1,minWidth:0,padding:"10px 8px",display:"flex",alignItems:"center"}}>
            <MiniChart bars={bars} color={pc} h={40} id={stk.sym}/>
          </div>
          <div style={{flexShrink:0,minHeight:60,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:4,paddingTop:10,paddingBottom:10,paddingLeft:8}}>
            <div className="mono" style={{fontSize:18,fontWeight:900,color:C.snow,direction:"ltr",lineHeight:1,letterSpacing:"-.5px"}}>{stk.p.toFixed(2)}</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:3,background:pc+"15",border:`1px solid ${pc}30`,borderRadius:5,padding:"2px 7px",direction:"ltr"}}>
              <span style={{fontSize:11,fontWeight:800,color:pc}}>{up?"+":""}{stk.ch.toFixed(2)}%</span>
              <span style={{fontSize:9,color:pc,opacity:.45}}>·</span>
              <span style={{fontSize:11,fontWeight:700,color:pc}}>{up?"+":""}{(stk.p*stk.ch/100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, function(prev, next) {
  return prev.stk.p === next.stk.p &&
         prev.stk.ch === next.stk.ch &&
         prev.stk.v === next.stk.v &&
         prev.flash === next.flash;
});

function StocksPage() {
  const haptic                  = useHaptic();
  const liveStocks = useSharedPrices();
const { priceCache } = useStockState();
const { priceCache } = useStockState();
// Debug
React.useEffect(() => {
  const keys = Object.keys(priceCache);
  console.log('[StocksScreen] priceCache size:', keys.length, 'first:', keys[0], priceCache[keys[0]]?.p);
}, [priceCache]);
  const barsCache = useRef({});
  const [sel,      setSel]      = useState(null);
  const [tab,      setTab]      = useState("all");
  const [sortBy,   setSortBy]   = useState("ch");
  const [flash,    setFlash]    = useState(null);
  const [isLoading,setIsLoading]= useState(true);
  const [showTop,  setShowTop]  = useState(false);
  const [showFilter, setShowFilter] = useState(false);
const [visibleCount, setVisibleCount] = useState(20);
  const scrollPos = useRef(0);
  const listRef   = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1000);
    setTimeout(() => setVisibleCount(50), 1300);
    setTimeout(() => setVisibleCount(9999), 1600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleRefresh = useCallback(() => {
    return new Promise(res => setTimeout(res, 800));
  }, []);

  const { containerRef: pullRef, isPulling, pullProgress,
          isRefreshing, touchHandlers } = usePullToRefresh(handleRefresh, 60);

  const { openStock } = useNav();
  const openDetail = sym => { haptic.tap(); scrollPos.current=window.scrollY; setSel(sym); openStock(STOCKS.find(s=>s.sym===sym)); };
  const closeDetail = () => { setSel(null); requestAnimationFrame(()=>window.scrollTo({top:scrollPos.current})); };
  const [search,   setSearch]   = useState("");
  const [showSrch, setShowSrch] = useState(false);
  const [now,      setNow]      = useState(new Date());

  useEffect(()=>{ const t=setInterval(()=>setNow(new Date()),30000); return()=>clearInterval(t); },[]);

  const allData = useMemo(()=>liveStocks.map(stk=>{
  if(!barsCache.current[stk.sym]) barsCache.current[stk.sym] = genBars(stk);
  return {stk, bars:barsCache.current[stk.sym]};
}), [liveStocks, priceCache]);
  const SECTORS = useMemo(()=>[...new Set(STOCKS.map(s=>s.sec))],[]);

  const changeTab = v => { haptic.tap(); startTransition(() => setTab(v)); };
  const changeSortBy = v => { setSortBy(v); setShowFilter(false); window.scrollTo({top:0,behavior:"smooth"}); };

  const filtered = useMemo(()=>{
    let arr = tab==="all" ? [...allData] : allData.filter(d=>d.stk.sec===tab);
    if(search) arr=arr.filter(d=>d.stk.name.includes(search)||d.stk.sym.includes(search));
    if(sortBy==="vol") arr.sort((a,b)=>b.stk.v-a.stk.v);
    else if(sortBy==="ch") arr.sort((a,b)=>b.stk.ch-a.stk.ch);
    return arr;
  },[allData,tab,sortBy,search]);

  const upCount  = liveStocks.filter(s=>s.ch>0).length;
  const downCount= liveStocks.filter(s=>s.ch<0).length;
  const avgCh    = (liveStocks.reduce((s,x)=>s+x.ch,0)/liveStocks.length).toFixed(2);
  const timeStr  = now.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
  const fmtVol   = v => v>=1000000 ? (v/1000000).toFixed(1)+"م" : v>=1000 ? (v/1000).toFixed(0)+"k" : v;
  const listKey  = `${tab}-${sortBy}`;

  const activeFiltersCount = (tab !== "all" ? 1 : 0) + (sortBy !== "ch" ? 1 : 0);

  return (
    <div style={{maxWidth:430,margin:"0 auto",background:C.ink,minHeight:"100vh",fontFamily:"Cairo,system-ui,sans-serif",direction:"rtl",color:C.snow,position:"relative",overflow:"hidden"}}
      ref={pullRef}
      {...touchHandlers}
    >
      {(isPulling || isRefreshing) && (
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,background:"linear-gradient(180deg,rgba(7,11,18,.95),transparent)",paddingTop:8,transform:`translateY(${Math.round((isPulling ? pullProgress : 1) * 48 - 48)}px)`,transition: isRefreshing ? "none" : "transform .15s"}}>
          <span style={{fontSize:10,color:"#f0c050"}}>
            {isRefreshing ? "جارٍ التحديث..." : pullProgress >= 1 ? "أطلق للتحديث ↑" : "اسحب للتحديث ↓"}
          </span>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0;height:0}
        .mono{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
        @keyframes cardStagger{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes flashPulse{0%{opacity:1;transform:scale(1)}15%{opacity:.55;transform:scale(.982)}100%{opacity:1;transform:scale(1)}}
        .card-stagger{animation:cardStagger .28s cubic-bezier(.16,1,.3,1) both}
        .fade-in{animation:fadeIn .25s ease both}
        .slide-down{animation:slideDown .22s cubic-bezier(.16,1,.3,1) both}
        .flash{animation:flashPulse .35s ease both}
        .live{animation:pulse 2s ease-in-out infinite}
        .stk-card{transition:transform .15s ease,box-shadow .15s ease}
        .stk-card:active{transform:scale(.978)}
        button{font-family:inherit;transition:transform .12s ease,opacity .12s ease}
        button:active{transform:scale(.91);opacity:.82}
        input::placeholder{color:#5a6e94}
      `}</style>

      {/* خلفية */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {[{w:300,h:300,t:"-5%",r:"-10%",c:C.gold+"08"},{w:240,h:240,t:"50%",r:"-5%",c:C.gold+"06"},{w:260,h:260,t:"25%",r:"60%",c:C.electric+"07"},{w:180,h:180,t:"70%",r:"15%",c:C.plasma+"06"}].map((p,i)=>(
          <div key={i} style={{position:"absolute",width:p.w,height:p.h,borderRadius:"50%",background:`radial-gradient(circle,${p.c} 0%,transparent 70%)`,top:p.t,right:p.r}}/>
        ))}
      </div>


      <div style={{position:"relative",zIndex:1,paddingBottom:80}}>

        {/* هيدر */}
        <div style={{padding:"52px 20px 10px",background:`linear-gradient(180deg,${C.void}ff 60%,${C.void}00 100%)`,position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div style={{fontSize:10,color:C.gold,fontWeight:700,letterSpacing:"3px",marginBottom:2}}>TADAWUL+</div>
              <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                <div style={{fontSize:18,fontWeight:900,color:C.snow,letterSpacing:"-.5px"}}>سوق الأسهم</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <div className="live" style={{width:5,height:5,borderRadius:"50%",background:C.mint,flexShrink:0}}/>
                  <span style={{fontSize:11,color:C.smoke,fontFamily:"monospace"}}>{timeStr}</span>
                </div>
              </div>
            </div>

            {/* أزرار البحث والفلتر */}
            <div style={{display:"flex",gap:8}}>
              {/* زر البحث */}
              <button onClick={()=>{setShowSrch(v=>!v);if(showSrch)setSearch("");}}
                style={{background:showSrch?C.electric+"22":"rgba(255,255,255,.04)",border:`1px solid ${showSrch?C.electric+"55":C.line}`,borderRadius:12,width:44,height:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showSrch?C.electric:C.smoke} strokeWidth="2.2" strokeLinecap="round">
                  {showSrch
                    ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                    : <><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></>
                  }
                </svg>
              </button>

              {/* زر الفلتر */}
              <button onClick={()=>setShowFilter(v=>!v)}
                style={{position:"relative",background:showFilter||activeFiltersCount>0?C.gold+"22":"rgba(255,255,255,.04)",border:`1px solid ${showFilter||activeFiltersCount>0?C.gold+"55":C.line}`,borderRadius:12,width:44,height:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showFilter||activeFiltersCount>0?C.gold:C.smoke} strokeWidth="2.2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6"/>
                  <line x1="7" y1="12" x2="17" y2="12"/>
                  <line x1="10" y1="18" x2="14" y2="18"/>
                </svg>
                {activeFiltersCount > 0 && (
                  <div style={{position:"absolute",top:6,left:6,width:8,height:8,borderRadius:"50%",background:C.gold,border:`1px solid ${C.void}`}}/>
                )}
              </button>
            </div>
          </div>

          {/* شريط البحث */}
          {showSrch&&(
            <div className="fade-in" style={{marginBottom:8}}>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>{if(e.key==="Escape"){setShowSrch(false);setSearch("");}}}
                placeholder="ابحث باسم السهم أو الرمز..."
                style={{width:"100%",background:C.layer1,border:`1px solid ${C.electric}55`,borderRadius:12,padding:"11px 14px",color:C.snow,fontSize:13,fontFamily:"Cairo,sans-serif",direction:"rtl",outline:"none"}}/>
            </div>
          )}

          {/* ملخص السوق */}
          <div style={{background:C.layer1,borderRadius:12,padding:"8px 14px",border:`1px solid ${C.line}`,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",gap:14}}>
                {[{v:upCount,l:"صاعد",c:C.mint},{v:downCount,l:"هابط",c:C.coral},{v:STOCKS.length-upCount-downCount,l:"مستقر",c:C.smoke}].map((it,i)=>(
                  <div key={i} style={{textAlign:"center",paddingLeft:i>0?14:0,borderLeft:i>0?`1px solid ${C.line}`:"none"}}>
                    <div style={{fontSize:14,fontWeight:900,color:it.c}}>{it.v}</div>
                    <div style={{fontSize:11,color:C.ash}}>{it.l}</div>
                  </div>
                ))}
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:11,color:C.ash}}>متوسط التغير</div>
                <div className="mono" style={{fontSize:14,fontWeight:900,color:parseFloat(avgCh)>=0?C.mint:C.coral}}>{avgCh>0?"+":""}{avgCh}%</div>
              </div>
            </div>
            <div style={{display:"flex",height:4,borderRadius:2,overflow:"hidden",gap:1}}>
              <div style={{width:`${(upCount/STOCKS.length)*100}%`,background:`linear-gradient(90deg,${C.mint}88,${C.mint})`,borderRadius:"2px 0 0 2px"}}/>
              <div style={{width:`${((STOCKS.length-upCount-downCount)/STOCKS.length)*100}%`,background:C.smoke+"44"}}/>
              <div style={{flex:1,background:`linear-gradient(90deg,${C.coral},${C.coral}88)`,borderRadius:"0 2px 2px 0"}}/>
            </div>
          </div>

          {/* شريط الفلتر النشط */}
          {(tab !== "all" || sortBy !== "ch") && (
            <div className="fade-in" style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
              {tab !== "all" && (
                <div style={{display:"flex",alignItems:"center",gap:4,background:C.layer2,border:`1px solid ${SECTOR_COLORS[tab]||C.line}55`,borderRadius:8,padding:"4px 10px"}}>
                  <span style={{fontSize:11,color:SECTOR_COLORS[tab]||C.smoke,fontWeight:700}}>{tab}</span>
                  <button onClick={()=>changeTab("all")} style={{background:"none",border:"none",color:C.ash,fontSize:13,cursor:"pointer",padding:0,lineHeight:1}}>×</button>
                </div>
              )}
              {sortBy !== "ch" && (
                <div style={{display:"flex",alignItems:"center",gap:4,background:C.layer2,border:`1px solid ${C.electric}55`,borderRadius:8,padding:"4px 10px"}}>
                  <span style={{fontSize:11,color:C.electric,fontWeight:700}}>{sortBy==="vol"?"الحجم":"الكل"}</span>
                  <button onClick={()=>changeSortBy("ch")} style={{background:"none",border:"none",color:C.ash,fontSize:13,cursor:"pointer",padding:0,lineHeight:1}}>×</button>
                </div>
              )}
            </div>
          )}

          {/* Panel الفلتر */}
          {showFilter && (
            <div className="slide-down" onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"100%",left:20,right:20,zIndex:60,
background:C.layer1,border:`1px solid ${C.line}`,borderRadius:16,padding:"16px",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>

              {/* القطاعات */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:C.ash,fontWeight:700,letterSpacing:"2px",marginBottom:8}}>القطاع</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {[{k:"all",l:"الكل",c:C.electric,count:allData.length},...SECTORS.map(sec=>({k:sec,l:sec,c:SECTOR_COLORS[sec]||C.smoke,count:allData.filter(d=>d.stk.sec===sec).length}))].map(({k,l,c,count})=>(
                    <button key={k} onClick={()=>changeTab(k)}
                      style={{flex:"0 0 auto",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:11,fontWeight:700,background:tab===k?c+"25":"transparent",border:`1px solid ${tab===k?c+"66":C.line}`,color:tab===k?c:C.smoke,transition:"all .15s ease",display:"flex",alignItems:"center",gap:4}}>
                      {l}
                      <span style={{fontSize:10,opacity:.6,background:tab===k?c+"22":C.layer3,padding:"0 4px",borderRadius:4}}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* الترتيب */}
              <div>
                <div style={{fontSize:10,color:C.ash,fontWeight:700,letterSpacing:"2px",marginBottom:8}}>الترتيب</div>
                <div style={{display:"flex",gap:6}}>
                  {[{k:"all",l:"الافتراضي",icon:"⊞"},{k:"ch",l:"% التغير",icon:"↕"},{k:"vol",l:"الحجم",icon:"◈"}].map(({k,l,icon})=>(
                    <button key={k} onClick={()=>changeSortBy(k)}
                      style={{flex:1,padding:"8px 6px",borderRadius:8,cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:11,fontWeight:700,background:sortBy===k?C.electric+"22":"transparent",border:`1px solid ${sortBy===k?C.electric+"55":C.line}`,color:sortBy===k?C.electric:C.smoke,transition:"all .15s ease",textAlign:"center"}}>
                      <div style={{fontSize:14,marginBottom:2}}>{icon}</div>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* زر إعادة ضبط */}
              {activeFiltersCount > 0 && (
                <button onClick={()=>{changeTab("all");changeSortBy("ch");}}
                  style={{width:"100%",marginTop:12,padding:"8px",borderRadius:8,background:"transparent",border:`1px solid ${C.coral}44`,color:C.coral,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          )}
        </div>

        {/* قائمة الأسهم */}
       {isLoading && (
  <div style={{padding:"10px 16px 0"}}>
    {Array.from({length:8}).map((_,i)=>(
      <div key={i} style={{
        height:72, marginBottom:8, borderRadius:12,
        background:'linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)',
        backgroundSize:'200% 100%',
        animation:'shimmer 1.4s ease infinite',
        animationDelay: i * 0.1 + 's',
      }}/>
    ))}
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </div>
)}

        {showTop && (
          <button onClick={()=>{ haptic.tap(); listRef.current?.scrollTo({top:0,behavior:'smooth'}); }}
            style={{position:"fixed",bottom:100,left:20,zIndex:30,background:C.layer2,border:`1px solid ${C.line}`,borderRadius:12,width:40,height:40,color:C.smoke,fontSize:16,cursor:"pointer"}}>
            ↑
          </button>
        )}

        <div ref={listRef} style={{padding:"10px 16px 0",overflowY:"auto",WebkitOverflowScrolling:"touch",display:isLoading?"none":"block"}}>
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"52px 20px"}}>
              <div style={{fontSize:15,fontWeight:800,color:C.mist,marginBottom:6}}>لا توجد أسهم مطابقة</div>
              <button onClick={()=>{changeTab("all");setSearch("");setShowSrch(false);}}
                style={{background:C.electric+"22",border:`1px solid ${C.electric}44`,borderRadius:10,padding:"12px 28px",color:C.electric,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
                إعادة ضبط الفلاتر
              </button>
            </div>
          ):(()=>{
            const groups=[];
            const seen={};
            filtered.forEach(item=>{
              const sec=item.stk.sec;
              if(!seen[sec]){seen[sec]=true;groups.push({sec,items:[]});}
              groups[groups.length-1].items.push(item);
            });
            const singleSec = groups.length===1 && sortBy!=="all";
            let globalIdx=0;
            return (
              <div key={listKey}>
                {groups.map((group,gi)=>(
                  <div key={group.sec} style={{marginBottom:gi<groups.length-1?18:0}}>
                    {!singleSec&&(
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,marginTop:gi>0?8:0}}>
                        <div style={{width:3,height:14,background:SECTOR_COLORS[group.sec]||C.line,borderRadius:2,flexShrink:0,boxShadow:`0 0 6px ${SECTOR_COLORS[group.sec]||C.line}66`}}/>
                        <span style={{fontSize:12,fontWeight:900,color:C.snow}}>{group.sec}</span>
                        <span style={{fontSize:11,color:C.ash,background:C.layer2,padding:"1px 7px",borderRadius:4,border:`1px solid ${C.line}`}}>{group.items.length}</span>
                        <div style={{flex:1,height:1,background:`linear-gradient(90deg,${SECTOR_COLORS[group.sec]||C.line}33,transparent)`}}/>
                      </div>
                    )}
                    <div style={{display:"flex",flexDirection:"column",gap:5,touchAction:"pan-y"}}>
                      {group.items.slice(0, Math.max(0, visibleCount - globalIdx)).map(({stk,bars})=>{
  const delay = `${(globalIdx++)*0.04}s`;
  return (
    <StockCard
      key={stk.sym}
      stk={stk}
      bars={bars}
      flash={flash}
      openDetail={openDetail}
      setFlash={setFlash}
      fmtVol={fmtVol}
      style={{animationDelay:delay}}
    />
  );
})}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {sel&&(()=>{
        const found = allData.find(d=>d.stk.sym===sel);
        if(!found) return null;
        const s = found.stk;
        return (
          <StockDetail
            stk={{ sym:s.sym, name:s.name, sec:s.sec, p:s.p, ch:s.ch, pct:s.ch }}
            onClose={closeDetail}
          />
        );
      })()}
    </div>
  );
}

export { StocksPage };
export default StocksPage;
