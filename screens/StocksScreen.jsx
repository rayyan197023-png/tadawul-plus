
'use client';
/**
 * STOCKS SCREEN — قائمة الأسهم السعودية
 * تداول+ · Terminal Obsidian × Saudi Gold
 * مطابق 100٪ للملف الأصلي
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useHaptic }          from '../hooks/useHaptic';
import { usePullToRefresh }   from '../hooks/usePullToRefresh';


/* ================================================================
   StockDetail.jsx — مستوى عالمي | Terminal Obsidian x Saudi Gold
   يضاهي Bloomberg Terminal + TradingView + Simply Wall St
================================================================ */

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

const haptic = () => {};
const nowStr = () => { const d=new Date(),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

//
const SECTOR_COLORS = {
  طاقة:C.amber, بنوك:C.electric, بترو:C.plasma,
  غذاء:C.mint, تقنية:C.teal, تعدين:C.gold, تأمين:C.coral
};




const SECTOR_COLORS = {
  طاقة:C.amber, بنوك:C.electric, بترو:C.plasma,
  غذاء:C.mint, تقنية:C.teal, تعدين:C.gold, تأمين:C.coral
};

function genBars(stk) {
  let seed = stk.sym.split("").reduce((a,c)=>a+c.charCodeAt(0),0)*7919;
  const rnd = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };
  const bars = [];
  let price = stk.p * (0.88 + rnd()*0.06);
  const trend = stk.ch >= 0 ? 0.501 : 0.499;
  for (let i = 0; i < 60; i++) {
    const chg = (rnd() - trend) * price * 0.022;
    const open = price;
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
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6}
        strokeLinecap="round" strokeLinejoin="round"
        style={{filter:`drop-shadow(0 0 3px ${color}66)`}}/>
      <circle cx={W} cy={lastY} r={2.2} fill={color}
        style={{filter:`drop-shadow(0 0 3px ${color})`}}/>
    </svg>
  );
}

function StocksPage() {
  const haptic                  = useHaptic();
  const [sel,      setSel]      = useState(null);
  const [tab,      setTab]      = useState("all");
  const [sortBy,   setSortBy]   = useState("ch");
  const [flash,    setFlash]    = useState(null);
  const [isLoading,setIsLoading]= useState(true);
  const [showTop,  setShowTop]  = useState(false);
  const scrollPos = useRef(0);
  const listRef   = useRef(null);

  // ── Skeleton: show for first 1s ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(t);
  }, []);

  // ── Scroll to top button ─────────────────────────────────────────
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // ── Pull to refresh ──────────────────────────────────────────────
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

  const allData = useMemo(()=>liveStocks.map(stk=>({stk, bars:genBars(stk)})), [liveStocks]);
  const SECTORS = useMemo(()=>[...new Set(STOCKS.map(s=>s.sec))],[]);

  const changeTab    = v => { haptic.tap(); setTab(v);    window.scrollTo({top:0,behavior:"smooth"}); };
  const changeSortBy = v => { setSortBy(v); window.scrollTo({top:0,behavior:"smooth"}); };

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

  return (
    <div style={{maxWidth:430,margin:"0 auto",background:C.ink,minHeight:"100vh",fontFamily:"Cairo,system-ui,sans-serif",direction:"rtl",color:C.snow,position:"relative",overflow:"hidden"}}
      ref={pullRef}
      {...touchHandlers}
    >
      {/* ── Pull to Refresh indicator ──────────────────────── */}
      {(isPulling || isRefreshing) && (
        <div className="pull-indicator" style={{
          position:"absolute",top:0,left:0,right:0,zIndex:10,
          background:"linear-gradient(180deg,rgba(7,11,18,.95),transparent)",
          paddingTop:8,
          transform:`translateY(${Math.round((isPulling ? pullProgress : 1) * 48 - 48)}px)`,
          transition: isRefreshing ? "none" : "transform .15s",
        }}>
          <div className="pull-spinner" style={{
            animationPlayState: isRefreshing ? "running" : "paused",
            transform: isPulling ? `rotate(${Math.round(pullProgress * 180)}deg)` : "none",
          }}/>
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
        @keyframes flashPulse{0%{opacity:1;transform:scale(1)}15%{opacity:.55;transform:scale(.982)}100%{opacity:1;transform:scale(1)}}
        .card-stagger{animation:cardStagger .28s cubic-bezier(.16,1,.3,1) both}
        .fade-in{animation:fadeIn .25s ease both}
        .flash{animation:flashPulse .35s ease both}
        .live{animation:pulse 2s ease-in-out infinite}
        .stk-card{transition:transform .15s ease,box-shadow .15s ease}
        .stk-card:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.4)}
        .stk-card:active{transform:scale(.978)}
        .btn-filter{min-height:44px;display:flex;align-items:center;justify-content:center}
        .btn-sort{min-height:44px;display:flex;align-items:center;justify-content:center;padding:0 10px}
        button{font-family:inherit;transition:transform .12s ease,opacity .12s ease}
        button:active{transform:scale(.91);opacity:.82}
        input::placeholder{color:#5a6e94}
        .card-hint{position:relative}
        .card-hint::after{content:"←";position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:12px;color:rgba(144,164,200,.25);pointer-events:none;z-index:2}
      `}</style>

      {/* خلفية */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {[{w:300,h:300,t:"-5%",r:"-10%",c:C.gold+"08"},{w:240,h:240,t:"50%",r:"-5%",c:C.gold+"06"},{w:260,h:260,t:"25%",r:"60%",c:C.electric+"07"},{w:180,h:180,t:"70%",r:"15%",c:C.plasma+"06"}].map((p,i)=>(
          <div key={i} style={{position:"absolute",width:p.w,height:p.h,borderRadius:"50%",background:`radial-gradient(circle,${p.c} 0%,transparent 70%)`,top:p.t,right:p.r}}/>
        ))}
      </div>

      <div style={{position:"relative",zIndex:1,paddingBottom:80}}>

        {/* هيدر */}
        <div style={{padding:"52px 20px 10px",background:`linear-gradient(180deg,${C.void}ff 60%,${C.void}00 100%)`,position:"sticky",top:0,zIndex:30}}>
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
            <button onClick={()=>{setShowSrch(v=>!v);if(showSrch)setSearch("");}}
              style={{background:showSrch?C.electric+"22":"rgba(255,255,255,.04)",border:`1px solid ${showSrch?C.electric+"55":C.line}`,borderRadius:12,width:44,height:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showSrch?C.electric:C.smoke} strokeWidth="2.2" strokeLinecap="round">
                {showSrch
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/></>
                }
              </svg>
            </button>
          </div>

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

          {/* فلتر القطاعات */}
          <div style={{position:"relative",marginBottom:6}}>
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
              {[{k:"all",l:"الكل",c:C.electric,count:allData.length},...SECTORS.map(sec=>({k:sec,l:sec,c:SECTOR_COLORS[sec]||C.smoke,count:allData.filter(d=>d.stk.sec===sec).length}))].map(({k,l,c,count})=>(
                <button key={k} onClick={()=>changeTab(k)}
                  className="btn-filter"
                  style={{flex:"0 0 auto",padding:"0 12px",borderRadius:8,cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:11,fontWeight:700,background:tab===k?c+"22":"transparent",border:`1px solid ${tab===k?c+"55":C.line+"66"}`,color:tab===k?c:C.smoke,transition:"all .18s ease",whiteSpace:"nowrap"}}>
                  {l}<span style={{fontSize:10,marginRight:4,opacity:.6}}>{count}</span>
                </button>
              ))}
            </div>
            <div style={{position:"absolute",top:0,left:0,width:28,height:"100%",background:`linear-gradient(270deg,${C.void}ee,transparent)`,pointerEvents:"none"}}/>
          </div>

          {/* أزرار الترتيب */}
          <div style={{display:"flex",gap:4,alignItems:"stretch"}}>
            {[{k:"all",l:"الكل",c:C.gold},{k:"ch",l:"% التغير",c:C.electric},{k:"vol",l:"الحجم",c:C.electric}].map(({k,l,c})=>(
              <button key={k} onClick={()=>changeSortBy(k)}
                className="btn-sort"
                style={{flex:1,borderRadius:8,cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:11,fontWeight:700,background:sortBy===k?c+"20":"transparent",border:`1px solid ${sortBy===k?c+"44":C.line+"66"}`,color:sortBy===k?c:C.ash,transition:"all .18s ease",whiteSpace:"nowrap"}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* قائمة الأسهم */}
        {/* ── Skeleton loading ── */}
        {isLoading && (
          <div style={{padding:"10px 16px 0"}}>
            {Array.from({length:8}).map((_,i)=>(
              <div key={i} className="skeleton" style={{
                height:64, marginBottom:8, borderRadius:12,
                animationDelay:`${i*0.07}s`,
              }}/>
            ))}
          </div>
        )}
        {/* ── Scroll to top ── */}
        {showTop && (
          <button
            className="scroll-top-btn"
            aria-label="العودة للأعلى"
            onClick={()=>{ haptic.tap(); listRef.current?.scrollTo({top:0,behavior:'smooth'}); }}
          >↑</button>
        )}
        <div ref={listRef} style={{padding:"10px 16px 0", overflowY:"auto", WebkitOverflowScrolling:"touch", display: isLoading ? "none" : "block"}}>
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"52px 20px"}}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{marginBottom:14}}>
                <circle cx="21" cy="21" r="13" stroke={C.smoke} strokeWidth="2.5"/>
                <line x1="30" y1="30" x2="42" y2="42" stroke={C.smoke} strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="16" y1="21" x2="26" y2="21" stroke={C.ash} strokeWidth="2" strokeLinecap="round"/>
                <line x1="21" y1="16" x2="21" y2="26" stroke={C.ash} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{fontSize:15,fontWeight:800,color:C.mist,marginBottom:6}}>لا توجد أسهم مطابقة</div>
              <div style={{fontSize:12,color:C.smoke,marginBottom:24,lineHeight:1.6}}>
                {search
                  ? <>لا يوجد سهم بـ "<span style={{color:C.mist,maxWidth:160,display:"inline-block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",verticalAlign:"bottom"}}>{search}</span>"</>
                  : "جرّب تغيير الفلتر"}
              </div>
              <button onClick={()=>{changeTab("all");setSearch("");setShowSrch(false);}}
                style={{background:C.electric+"22",border:`1px solid ${C.electric}44`,borderRadius:10,padding:"12px 28px",color:C.electric,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Cairo,sans-serif",minHeight:44}}>
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
                    <div style={{display:"flex",flexDirection:"column",gap:5}}>
                      {group.items.map(({stk,bars})=>{
                        const up   = stk.ch>=0;
                        const pc   = up?C.mint:C.coral;
                        const isFlsh = flash===stk.sym;
                        const delay  = `${(globalIdx++)*0.04}s`;
                        return(
                          <div key={stk.sym} className="card-stagger card-hint"
                            style={{animationDelay:delay,position:"relative",borderRadius:12,overflow:"hidden"}}
                            onClick={()=>{setFlash(stk.sym);setTimeout(()=>setFlash(null),350);openDetail(stk.sym);}}>
                            <div className={`stk-card ${isFlsh?"flash":""}`}
                              style={{background:`linear-gradient(160deg,${C.layer1} 0%,${C.layer2} 100%)`,border:`1px solid ${C.line+"66"}`,boxShadow:`0 1px 6px rgba(0,0,0,.25)`,cursor:"pointer"}}>

                              {/* شريط اللون */}
                              <div style={{height:3,background:up
                                ?`linear-gradient(90deg,${C.mint}00,${C.mint}cc,${C.mint}00)`
                                :`linear-gradient(90deg,${C.coral}00,${C.coral}cc,${C.coral}00)`}}/>

                              <div style={{display:"flex",gap:0}}>
                                {/* يمين — اسم + رمز + حجم */}
                                <div style={{flexShrink:0,minHeight:60,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,paddingTop:10,paddingBottom:10,paddingRight:10,paddingLeft:8}}>
                                  <div style={{fontSize:14,fontWeight:900,color:C.snow,lineHeight:1,letterSpacing:"-.3px"}}>{stk.name}</div>
                                  <span style={{fontSize:11,color:C.ash,background:C.layer3,padding:"1px 5px",borderRadius:4}}>{stk.sym}</span>
                                  <div style={{display:"flex",alignItems:"center",gap:2}}>
                                    <span style={{fontSize:11,fontWeight:700,color:stk.v>stk.avgV?C.mint:C.ash,fontFamily:"monospace"}}>{fmtVol(stk.v)}</span>
                                    {stk.v>stk.avgV*1.3&&<span style={{fontSize:11,color:C.mint}}>↑</span>}
                                  </div>
                                </div>

                                {/* وسط — شارت */}
                                <div style={{flex:1,minWidth:0,padding:"10px 8px",display:"flex",alignItems:"center"}}>
                                  <MiniChart bars={bars} color={pc} h={40} id={stk.sym}/>
                                </div>

                                {/* يسار — سعر + نسبة */}
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
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* StockDetail — handled by AppShell via openStock */}
    </div>
  );
}

export { StocksPage };
export default StocksPage;
import { useSharedPrices } from '../store';
import { STOCKS, SECTORS } from '../constants/stocksData';
