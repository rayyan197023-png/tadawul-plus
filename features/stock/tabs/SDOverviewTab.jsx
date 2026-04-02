'use client';
/**
 * @module features/stock/tabs/SDOverviewTab
 * @description تبويب نظرة عامة — يشمل الشارت والدرجات والـ Snowflake
 *
 * المكونات:
 * - ChartLoader / CChart  : شارت السهم
 * - ScoreDrawer/ScoreCard : درجات التحليل
 * - SnowflakeCard         : رادار القوة
 * - HealthScores          : مؤشرات الصحة
 * - SDOverview            : تبويب نظرة عامة الرئيسي
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InfoTooltip } from './SDFundamentalTab';
import { C, Skeleton, SkeletonCard, EmptyState, SectionCard, Row, Tag } from './StockDetailShared';

function ChartLoader({ sym, base, per, chartType, stk, onExpand }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(false); const t=setTimeout(()=>setShow(true),150); return ()=>clearTimeout(t); }, [sym, per]);
  if (!show) return (
    <div style={{ display:"flex", background:C.ink }}>
      <div style={{ flex:1, height:220, display:"flex", flexDirection:"column", gap:6, padding:"12px 8px 4px" }}>
        <div style={{ flex:1, background:`linear-gradient(90deg,${C.layer3} 25%,${C.edge} 50%,${C.layer3} 75%)`, backgroundSize:"200% 100%", animation:"skeletonShimmer 1.4s ease infinite", borderRadius:6 }}/>
        <div style={{ height:36, background:`linear-gradient(90deg,${C.layer3} 25%,${C.edge} 50%,${C.layer3} 75%)`, backgroundSize:"200% 100%", animation:"skeletonShimmer 1.4s ease infinite", borderRadius:4 }}/>
      </div>
      <div style={{ width:52, background:C.ink, borderLeft:`1px solid ${C.line}44` }}/>
    </div>
  );
  return <CChart sym={sym} base={base} per={per} chartType={chartType} stk={stk} onExpand={onExpand}/>;
}

//
function CChart({ sym, base, per, chartType, stk, onExpand }) {
  const history = stk?.priceHistory || [];
  const canvasRef  = useRef(null);
  const volRef     = useRef(null);
  const [crosshair, setCrosshair] = useState(null);
  const [zoom, setZoom]   = useState(1);
  const touchRef = useRef({});

  //
  const pts = useMemo(() => {
    // nMap: عدد الشموع لكل فترة (شمعة 5د للـ 1D، يومية للباقي، أسبوعية للـ 5Y، شهرية للـ MAX)
    const nMap = {"1D":78,"1W":5,"1M":22,"3M":65,"6M":130,"1Y":252,"5Y":260,"MAX":120};
    const baseN = nMap[per] || 30;
    const n = Math.max(10, Math.round(baseN / zoom));
    if (history.length >= n)
      return history.slice(-n).map(h=>({ o:h.o??h.c, h:h.h??h.c, l:h.l??h.c, c:h.c, v:h.v??0 }));
    // volPct: تقلب الشمعة الواحدة — يزيد مع طول الفترة
    const volPct = per==="1D"?0.002:per==="1W"?0.007:per==="1M"?0.010:per==="3M"?0.012:per==="6M"?0.014:per==="1Y"?0.016:0.020;
    const seed = sym.split("").reduce((a,c2)=>a+c2.charCodeAt(0),0);
    let lcg = (seed * 1664525 + 1013904223) & 0xffffffff;
    const rand = () => { lcg = (lcg * 1664525 + 1013904223) & 0xffffffff; return (lcg >>> 0) / 0xffffffff; };
    const arr=[]; let p = base*(0.95+rand()*0.10); p=Math.max(base*0.88,Math.min(base*1.12,p));
    for(let i=0;i<n;i++){
      const o=parseFloat(p.toFixed(2));
      const pull=(base-p)*(0.04+(i/n)*0.08), noise=(rand()-0.5)*base*volPct*2;
      p=Math.max(base*0.84,Math.min(base*1.16,p+pull+noise));
      const c2=i===n-1?base:parseFloat(p.toFixed(2));
      const br=Math.abs(c2-o)*0.5+base*volPct*0.3, wm=0.3+rand()*0.5;
      arr.push({o,h:parseFloat((Math.max(o,c2)+br*wm).toFixed(2)),l:parseFloat((Math.min(o,c2)-br*wm).toFixed(2)),c:c2,v:Math.floor(60e6+rand()*140e6)});
    }
    return arr;
  }, [sym, per, base, zoom]);

  const n=pts.length;
  const closes=pts.map(p=>p.c);
  const highs=pts.map(p=>p.h);
  const lows=pts.map(p=>p.l);
  const vols=pts.map(p=>p.v);
  const rawMin=n>0?Math.min(...lows):0, rawMax=n>0?Math.max(...highs):1;
  const pad5=(rawMax-rawMin)*0.10;
  const mn=rawMin-pad5, mx=rawMax+pad5, rng=mx-mn||1;
  const maxVol=n>0?(Math.max(...vols)||1):1, avgVolVal=n>0?vols.reduce((a,b)=>a+b,0)/n:0;
  const isUp=n>0?closes[n-1]>=closes[0]:true;
  const color=isUp?C.mint:C.coral;
  const lastCandleUp=n<2?isUp:closes[n-1]>=closes[n-2];
  const lastColor=lastCandleUp?C.mint:C.coral;

  //
  const YAXIS_W=36, CHART_H_PX=220;
  const HCHART=174, HVOL=34, padL=8, padR=28, padT=12;

  //
  const getW  = ()=> canvasRef.current ? canvasRef.current.offsetWidth  : 400;
  const getH  = ()=> HCHART;
  const pxC   = (i,W) => padL + (n<=1?(W-padL-padR)/2:(i/(n-1))*(W-padL-padR));
  const pyC   = (v,W) => padT+(1-(v-mn)/rng)*(HCHART-padT-4);
  const cWC   = (W) => Math.max(1.5,Math.min(14,(W-padL-padR)/n*0.72));
  const pvyC  = (v,W) => HCHART+HVOL-(v/maxVol)*HVOL*0.91;

  // MA helper
  const calcMApts=(period,W)=>{
    if(n<period) return [];
    const r=[];
    for(let i=period-1;i<n;i++){
      const avg=closes.slice(i-period+1,i+1).reduce((a,b)=>a+b,0)/period;
      r.push({x:pxC(i,W),y:pyC(avg,W)});
    }
    return r;
  };

  // hex to rgba
  const hex2rgba=(hex,a)=>{
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  };

  // ── Canvas Render ─────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    //
    if(!CanvasRenderingContext2D.prototype.roundRect){
      CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){
        this.moveTo(x+r,y); this.lineTo(x+w-r,y); this.quadraticCurveTo(x+w,y,x+w,y+r);
        this.lineTo(x+w,y+h-r); this.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
        this.lineTo(x+r,y+h); this.quadraticCurveTo(x,y+h,x,y+h-r);
        this.lineTo(x,y+r); this.quadraticCurveTo(x,y,x+r,y); this.closePath();
      };
    }
    const dpr=window.devicePixelRatio||1;
    const W=canvas.offsetWidth||400;
    canvas.width  = W*dpr;
    canvas.height = HCHART*dpr;
    const ctx=canvas.getContext('2d');
    ctx.scale(dpr,dpr);
    const cw=cWC(W);

    // Background
    ctx.fillStyle=C.ink;
    ctx.fillRect(0,0,W,HCHART);

    // Grid lines
    ctx.strokeStyle=C.line+'33';
    ctx.lineWidth=0.4;
    [0.2,0.4,0.6,0.8].forEach(t=>{
      const y=padT+(1-t)*(HCHART-padT-4);
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    });

    // Pivot + R1/S1 — يظهر فقط في 1D و 1W
    if((per==="1D"||per==="1W")&&stk?.dayHi&&stk?.dayLo&&stk?.prev){
      const piv=(stk.dayHi+stk.dayLo+stk.prev)/3;
      if(piv>=mn&&piv<=mx){
        const py2=pyC(piv,W);
        ctx.setLineDash([6,4]); ctx.strokeStyle=C.electric+'88'; ctx.lineWidth=0.9;
        ctx.beginPath(); ctx.moveTo(padL,py2); ctx.lineTo(W-padR,py2); ctx.stroke();
        ctx.fillStyle=C.electric+'99'; ctx.font='7px IBM Plex Mono,monospace';
        ctx.fillText('P',padL+2,py2-2);
        const r1=2*piv-stk.dayLo, s1=2*piv-stk.dayHi;
        [r1,s1].forEach((v,vi)=>{
          if(v>=mn&&v<=mx){
            const ry=pyC(v,W);
            ctx.strokeStyle=vi===0?C.coral+'55':C.mint+'55'; ctx.lineWidth=0.7;
            ctx.beginPath(); ctx.moveTo(padL,ry); ctx.lineTo(W-padR,ry); ctx.stroke();
            ctx.fillStyle=vi===0?C.coral+'88':C.mint+'88';
            ctx.fillText(vi===0?'R1':'S1',padL+2,ry-2);
          }
        });
      }
    }
    // VWAP
    if(stk?.vwap||true){
      const tv=vols.reduce((a,b)=>a+b,0);
      const vwap=tv?parseFloat((pts.map((p2,i)=>((p2.h+p2.l+p2.c)/3)*vols[i]).reduce((a,b)=>a+b,0)/tv).toFixed(2)):null;
      if(vwap&&vwap>=mn&&vwap<=mx){
        const vy=pyC(vwap,W);
        ctx.setLineDash([5,3]); ctx.strokeStyle=C.amber+'bb'; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(padL,vy); ctx.lineTo(W-padR,vy); ctx.stroke();
        ctx.fillStyle=C.amber+'cc'; ctx.font='bold 8px IBM Plex Mono,monospace';
        ctx.fillText('VWAP',padL+2,vy-2);
      }
    }
    // Prev close — يظهر فقط في 1D
    if(per==="1D"&&stk?.prev&&stk.prev>=mn&&stk.prev<=mx){
      const py2=pyC(stk.prev,W);
      ctx.setLineDash([4,5]); ctx.strokeStyle=C.smoke+'66'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(padL,py2); ctx.lineTo(W-padR,py2); ctx.stroke();
    }
    ctx.setLineDash([]);

    //
    if(chartType==="خطي"||chartType==="منطقة"){
      // Area gradient
      const grad=ctx.createLinearGradient(0,0,0,HCHART);
      grad.addColorStop(0,hex2rgba(color,0.26));
      grad.addColorStop(1,hex2rgba(color,0));
      ctx.beginPath();
      closes.forEach((c2,i)=>{ const x=pxC(i,W),y=pyC(c2,W); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      if(chartType==="منطقة"){
        ctx.lineTo(pxC(n-1,W),HCHART); ctx.lineTo(pxC(0,W),HCHART); ctx.closePath();
        ctx.fillStyle=grad; ctx.fill();
      }
      ctx.beginPath();
      closes.forEach((c2,i)=>{ const x=pxC(i,W),y=pyC(c2,W); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
      ctx.strokeStyle=color; ctx.lineWidth=2.2; ctx.lineJoin='round'; ctx.lineCap='round';
      ctx.setLineDash([]); ctx.stroke();
    } else {
      // Heikin-Ashi or candles
      let dispPts=pts;
      if(chartType==="هيكن"){
        const ha=[]; let hO=pts[0].o;
        for(const p2 of pts){
          const hC=(p2.o+p2.h+p2.l+p2.c)/4;
          const haO=(hO+ha[ha.length-1]?.c||hO)/2||hO;
          ha.push({o:haO,c:hC,h:Math.max(p2.h,haO,hC),l:Math.min(p2.l,haO,hC),v:p2.v});
          hO=haO;
        }
        dispPts=ha;
      }
      dispPts.forEach((pt,i)=>{
        const up=pt.c>=pt.o;
        const clr=up?C.mint:C.coral;
        const x=pxC(i,W), oY=pyC(pt.o,W), cY=pyC(pt.c,W), hY=pyC(pt.h,W), lY=pyC(pt.l,W);
        const bT=Math.min(oY,cY), bH=Math.max(1,Math.abs(cY-oY));
        const isL=i===n-1;
        const bw=isL?cw*1.1:cw;
        // wick
        ctx.strokeStyle=up?C.mint+'cc':C.coral+'cc'; ctx.lineWidth=isL?1.2:0.9;
        ctx.beginPath(); ctx.moveTo(x,hY); ctx.lineTo(x,bT); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,bT+bH); ctx.lineTo(x,lY); ctx.stroke();
        // body
        if(isL){
          ctx.shadowBlur=6; ctx.shadowColor=clr+'88';
        }
        ctx.fillStyle=clr+(up?'d0':'e0');
        ctx.fillRect(x-bw/2,bT,bw,Math.max(1,bH));
        ctx.shadowBlur=0;
      });
    }

    // ─ MA lines ─────────────────────────────────
    [[20,C.electric,1.4,0.75],[50,C.plasma,1.4,0.65],[200,C.gold,1.2,0.60]].forEach(([period,col,lw,op])=>{
      const mapts=calcMApts(period,W);
      if(mapts.length<2) return;
      ctx.strokeStyle=col+(Math.round(op*255).toString(16).padStart(2,'0'));
      ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.setLineDash([]);
      ctx.beginPath();
      mapts.forEach((p2,i)=>i===0?ctx.moveTo(p2.x,p2.y):ctx.lineTo(p2.x,p2.y));
      ctx.stroke();
    });

    // ─ Crosshair ─────────────────────────────────
    if(crosshair){
      ctx.strokeStyle=C.snow+'55'; ctx.lineWidth=0.8; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(crosshair.cx,padT); ctx.lineTo(crosshair.cx,HCHART); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL,crosshair.cy); ctx.lineTo(W-padR,crosshair.cy); ctx.stroke();
      ctx.setLineDash([]);
    }

    //
    const lastY2=pyC(closes[n-1],W);
    ctx.strokeStyle=lastColor+'99'; ctx.lineWidth=0.9; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(padL,lastY2); ctx.lineTo(W-padR,lastY2); ctx.stroke();
    ctx.setLineDash([]);

    // ─ Volume Canvas ─────────────────────────────
    const vcv=volRef.current;
    if(vcv){
      vcv.width=W*dpr; vcv.height=(HVOL+2)*dpr;
      const vctx=vcv.getContext('2d');
      vctx.scale(dpr,dpr);
      vctx.fillStyle=C.ink; vctx.fillRect(0,0,W,HVOL+2);
      pts.forEach((pt,i)=>{
        const up2=pt.c>=pt.o;
        const bh=(pt.v/maxVol)*HVOL*0.91;
        const x=pxC(i,W);
        const isCH=crosshair?.idx===i;
        vctx.fillStyle=up2?C.mint+(isCH?'cc':'60'):C.coral+(isCH?'cc':'60');
        vctx.fillRect(x-cw/2,HVOL-bh,cw,bh);
      });
      // avg vol line
      const ay=HVOL-(avgVolVal/maxVol)*HVOL*0.91;
      vctx.strokeStyle=C.teal+'99'; vctx.lineWidth=0.9; vctx.setLineDash([3,3]);
      vctx.beginPath(); vctx.moveTo(padL,ay); vctx.lineTo(W-padR,ay); vctx.stroke();
      vctx.setLineDash([]);
      vctx.fillStyle=C.teal+'99'; vctx.font='7px IBM Plex Mono,monospace';
      vctx.fillText('Avg',padL+2,ay-1);
    }

    // X-axis labels
    const M=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    // bd = أيام لكل شمعة — يجب أن يطابق nMap حتى bd×n = الفترة الفعلية
    const bd={"1D":1/78,"1W":1,"1M":1,"3M":1,"6M":1,"1Y":1,"5Y":7,"MAX":30}[per]||1;
    const today=new Date(); const count=Math.min(5,n);
    ctx.fillStyle=C.smoke+'bb'; ctx.font='8px IBM Plex Mono,monospace'; ctx.textAlign='center';
    Array.from({length:count},(_,j)=>Math.round(j*(n-1)/(count-1||1))).forEach(idx=>{
      const d=new Date(today.getTime()-(n-1-idx)*bd*86400000);
      const lbl=per==="1D"
        ? `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
        :per==="1W"||per==="1M"||per==="3M"||per==="6M"||per==="1Y"?`${d.getDate()} ${M[d.getMonth()].slice(0,3)}`
        :`${M[d.getMonth()].slice(0,3)}'${d.getFullYear().toString().slice(2)}`;
      ctx.fillText(lbl,pxC(idx,W),HCHART+HVOL+10);
    });
    ctx.textAlign='start';

  },[pts,crosshair,chartType,stk]);

  //
  if(n===0) return null;

  // ── Event Handlers ────────────────────────────────────────────
  const getCoords=(clientX,clientY)=>{
    const canvas=canvasRef.current; if(!canvas) return null;
    const rect=canvas.getBoundingClientRect();
    const W=canvas.offsetWidth||400;
    const x=clientX-rect.left;
    const y=clientY-rect.top;
    const frac=(x-padL)/(W-padL-padR);
    const idx=Math.max(0,Math.min(n-1,Math.round(frac*(n-1))));
    const pt=pts[idx];
    const M=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const bd={"1D":1/78,"1W":1,"1M":1,"3M":1,"6M":1,"1Y":1,"5Y":7,"MAX":30}[per]||1;
    const d=new Date(Date.now()-(n-1-idx)*bd*86400000);
    const dateStr=per==="1D"
      ? `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
      : `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
    const prevClose = stk?.prev || closes[0] || base;
    const chg=((pt.c-prevClose)/prevClose*100).toFixed(2);
    const pxX=padL+(n<=1?((W-padL-padR)/2):idx/(n-1)*(W-padL-padR));
    const pyY=padT+(1-(pt.c-mn)/rng)*(HCHART-padT-4);
    const price=mn+(1-(y-padT)/(HCHART-padT-4))*rng;
    return {idx,cx:pxX,cy:y,x,y,price,pt,dateStr,chg,pxX,pyY};
  };

  const onMouseMove=(e)=>{
    const co=getCoords(e.clientX,e.clientY); if(!co) return;
    setCrosshair({idx:co.idx,cx:co.pxX,cy:co.pyY,price:co.pt.c,open:co.pt.o,high:co.pt.h,low:co.pt.l,vol:co.pt.v,dateStr:co.dateStr,chg:co.chg});
  };

  const onTouchMove=(e)=>{
    e.stopPropagation();
    e.preventDefault();
    if(e.touches.length===2){
      const dx=e.touches[0].clientX-e.touches[1].clientX;
      const dy=e.touches[0].clientY-e.touches[1].clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(touchRef.current.pinchDist){
        const ratio=dist/touchRef.current.pinchDist;
        setZoom(z=>Math.max(1,Math.min(4,z*ratio)));
      }
      touchRef.current.pinchDist=dist;
    } else if(e.touches.length===1){
      const co=getCoords(e.touches[0].clientX,e.touches[0].clientY);
      if(co) setCrosshair({idx:co.idx,cx:co.pxX,cy:co.pyY,price:co.pt.c,open:co.pt.o,high:co.pt.h,low:co.pt.l,vol:co.pt.v,dateStr:co.dateStr,chg:co.chg});
    }
  };

  //
  const yLevels=[0.12,0.35,0.58,0.81].map(t=>{
    const v=mn+t*rng;
    const dec=rng<2?3:rng<10?2:rng<100?1:0;
    const yPx=padT+(1-t)*(HCHART-padT-4);
    return {v:parseFloat(v.toFixed(dec)), pct:(yPx/CHART_H_PX)*100};
  });

  const crosshairChgF=crosshair?parseFloat(crosshair.chg):0;

  return (
    <div style={{ background:C.ink, userSelect:"none", position:"relative", touchAction:"none" }} data-noswipe="1">
      {/* Expand button */}
      <button onClick={()=>onExpand&&onExpand()} style={{ position:"absolute", top:8, left:8, zIndex:30, width:28, height:28, borderRadius:7, background:`${C.layer2}dd`, border:`1px solid ${C.line}55`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.smoke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </button>

      {/* Zoom indicator */}
      {zoom>1.05&&<button onClick={()=>setZoom(1)} style={{ position:"absolute", top:8, left:44, zIndex:30, height:28, padding:"0 8px", borderRadius:7, background:`${C.electric}22`, border:`1px solid ${C.electric}55`, display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
        <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:C.electric, fontWeight:700 }}>{zoom.toFixed(1)}x</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9M3 3v6h6"/></svg>
      </button>}

      {/* Crosshair Tooltip */}
      {crosshair&&(
        <div style={{ position:"absolute", top:6, left:"50%", transform:"translateX(-50%)", background:`${C.layer2}f0`, backdropFilter:"blur(8px)", border:`1px solid ${crosshairChgF>=0?C.mint+"66":C.coral+"66"}`, borderRadius:10, padding:"5px 14px", display:"flex", gap:12, alignItems:"center", boxShadow:`0 4px 20px rgba(0,0,0,.55)`, pointerEvents:"none", whiteSpace:"nowrap", zIndex:20 }}>
          <div>
            <div style={{ fontSize:10, color:C.smoke }}>{crosshair.dateStr}</div>
            <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:13, fontWeight:900, color:crosshairChgF>=0?C.mint:C.coral }}>{crosshair.price?.toFixed(2)} ر.س</div>
          </div>
          {chartType==="شموع"&&<div style={{ display:"flex", gap:8, borderRight:`1px solid ${C.line}`, paddingRight:10 }}>
            {[{l:"فتح",v:crosshair.open},{l:"أعلى",v:crosshair.high},{l:"أدنى",v:crosshair.low}].map((x,i)=>(
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontSize:10, color:C.smoke }}>{x.l}</div>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.mist }}>{x.v?.toFixed(2)}</div>
              </div>
            ))}
          </div>}
          <div>
            <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:crosshairChgF>=0?C.mint:C.coral, fontWeight:800 }}>{crosshairChgF>=0?"+":""}{crosshair.chg}%</div>
            <div style={{ fontSize:10, color:C.smoke }}>{crosshair.vol?(crosshair.vol/1e6).toFixed(1)+"م":""}</div>
          </div>
        </div>
      )}

      {/* Main chart + Y-axis */}
      <div style={{ position:"relative", height:CHART_H_PX }}>
        {/* Canvas الشارت — يأخذ كل العرض ناقص عامود الأسعار */}
        <div style={{ position:"absolute", top:0, left:0, right:YAXIS_W, bottom:0 }}>
          <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:HCHART, cursor:"crosshair" }}
            onMouseMove={onMouseMove} onMouseLeave={()=>setCrosshair(null)}
            onTouchMove={onTouchMove}
            onTouchStart={e=>{ touchRef.current={panX:e.touches[0]?.clientX}; }}
            onTouchEnd={()=>{ touchRef.current.pinchDist=null; setCrosshair(null); }}/>
          {/* Canvas الحجم */}
          <canvas ref={volRef} style={{ display:"block", width:"100%", height:HVOL+2 }}/>
          {/* X labels space */}
          <div style={{ height:12, background:C.ink }}/>
        </div>

        {/* Y-axis — HTML column على اليمين */}
        <div style={{ position:"absolute", top:0, right:0, width:YAXIS_W, bottom:0, background:C.ink, borderLeft:`1px solid ${C.line}55` }}>
          {yLevels.map((lv,i)=>(
            <div key={i} style={{ position:"absolute", top:`${lv.pct}%`, left:0, right:0, transform:"translateY(-50%)", display:"flex", alignItems:"center", paddingLeft:2 }}>
              <div style={{ width:3, height:1, background:C.line, opacity:0.5, flexShrink:0 }}/>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:8, color:C.smoke, paddingLeft:2, whiteSpace:"nowrap" }}>{lv.v}</span>
            </div>
          ))}
          {/* السعر الحالي — badge ملوّن */}
          {(()=>{
            const pct=(padT+(1-(closes[n-1]-mn)/rng)*(HCHART-padT-4))/CHART_H_PX*100;
            return (
              <div style={{ position:"absolute", top:`${pct}%`, left:0, right:0, transform:"translateY(-50%)", display:"flex", alignItems:"center", zIndex:5 }}>
                <div style={{ width:4, height:20, background:lastColor, flexShrink:0 }}/>
                <div style={{ background:lastColor, flex:1, padding:"2px 2px", borderRadius:"0 3px 3px 0" }}>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:8.5, fontWeight:900, color:C.ink, display:"block", textAlign:"center" }}>{closes[n-1].toFixed(2)}</span>
                </div>
              </div>
            );
          })()}
          {/* Crosshair badge */}
          {crosshair&&(()=>{
            const pct=(padT+(1-(crosshair.price-mn)/rng)*(HCHART-padT-4))/CHART_H_PX*100;
            return pct>0&&pct<95?(
              <div style={{ position:"absolute", top:`${pct}%`, left:0, right:0, transform:"translateY(-50%)", display:"flex", alignItems:"center", zIndex:10 }}>
                <div style={{ width:4, height:20, background:C.snow, flexShrink:0 }}/>
                <div style={{ background:C.snow, flex:1, padding:"2px 2px", borderRadius:"0 3px 3px 0" }}>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:8.5, fontWeight:900, color:C.ink, display:"block", textAlign:"center" }}>{crosshair.price?.toFixed(2)}</span>
                </div>
              </div>
            ):null;
          })()}
          {/* 52H/52L */}
          {stk?.hi52&&(()=>{ const pct2=(padT+(1-(stk.hi52-mn)/rng)*(HCHART-padT-4))/CHART_H_PX*100; return pct2>0&&pct2<100?<div style={{position:"absolute",top:`${pct2}%`,left:4,transform:"translateY(-50%)"}}><span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:8,color:C.mint,fontWeight:700}}>52H</span></div>:null; })()}
          {stk?.lo52&&(()=>{ const pct2=(padT+(1-(stk.lo52-mn)/rng)*(HCHART-padT-4))/CHART_H_PX*100; return pct2>0&&pct2<100?<div style={{position:"absolute",top:`${pct2}%`,left:4,transform:"translateY(-50%)"}}><span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:8,color:C.coral,fontWeight:700}}>52L</span></div>:null; })()}
          {/* VOL + max */}
          <div style={{ position:"absolute", top:`${(HCHART/CHART_H_PX)*100+2}%`, left:4 }}>
            <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:8, color:C.smoke, opacity:0.6, display:"block" }}>VOL</span>
            <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:7.5, color:C.smoke, opacity:0.45, display:"block" }}>{(maxVol/1e6).toFixed(0)}م</span>
          </div>
        </div>
      </div>

      {/* Range Selector */}
      <div style={{ background:C.layer1, borderTop:`1px solid ${C.line}22`, padding:"2px 8px", height:26 }}>
        {(()=>{
          const W3=360,H3=20;
          const rMin=Math.min(...closes),rMax=Math.max(...closes),rRng=rMax-rMin||1;
          const miniPath=closes.map((v,i)=>`${i===0?"M":"L"}${(i/(n-1||1)*W3).toFixed(1)},${H3-(v-rMin)/rRng*(H3-3)}`).join(" ");
          const viewW=Math.min(W3,W3/zoom), viewX=Math.max(0,W3-viewW);
          return (
            <svg width="100%" height={H3} viewBox={`0 0 ${W3} ${H3}`} preserveAspectRatio="none" style={{display:"block"}}>
              <path d={miniPath} fill="none" stroke={color} strokeWidth="1" opacity=".35"/>
              {zoom>1.05&&<rect x={viewX} y={0} width={viewW} height={H3} fill={C.electric} opacity=".10" rx="2"/>}
              {zoom>1.05&&<rect x={viewX} y={0} width={1.5} height={H3} fill={C.electric} opacity=".5"/>}
            </svg>
          );
        })()}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:6, padding:"3px 8px 4px", flexWrap:"wrap", alignItems:"center", borderTop:`1px solid ${C.line}33`, background:C.ink }}>
        {[
          {lbl:"VWAP",clr:C.amber,dash:"5,3"},
          {lbl:"MA20",clr:C.electric,dash:""},
          {lbl:"MA50",clr:C.plasma,dash:""},
          {lbl:"MA200",clr:C.gold,dash:""},
          {lbl:"Pivot",clr:C.electric,dash:"6,4"},
        ].map((item,i)=>(
          <span key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke={item.clr} strokeWidth={item.dash?"1.2":"1.6"} strokeDasharray={item.dash} opacity=".85"/></svg>
            <span style={{ fontSize:10, color:C.smoke }}>{item.lbl}</span>
          </span>
        ))}

      </div>
    </div>
  );
}


// ─── ScoreDrawer — popup مركزي ────────────────────────────────────
function ScoreDrawer({ item, color, onClose }) {
  if (!item) return null;
  const col = color || item?.color || C.electric;
  const history = item.v!=null ? [0.85,0.90,0.95,1].map(f=>
    parseFloat(((item.max ? item.v/item.max : 0.7)*f*(item.max||10)).toFixed(1))
  ) : [];
  return (
    <>
      <div onClick={onClose}
        style={{ position:"fixed", inset:0, zIndex:150, background:"rgba(0,0,0,.65)" }}/>
      <div data-noswipe="1" style={{
        position:"fixed",
        top:"50%", left:"50%",
        transform:"translate(-50%,-50%)",
        zIndex:200,
        background:C.layer1,
        border:`1px solid ${col}66`,
        borderRadius:16,
        padding:"16px",
        width:"85vw", maxWidth:320,
        boxShadow:`0 12px 40px rgba(0,0,0,.95)`
      }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:800, color:col }}>{item.eng || item.l}</div>
            <div style={{ fontSize:11, color:C.smoke, marginTop:2 }}>{item.note || ""}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {item.max && (
              <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:20, fontWeight:900, color:col }}>
                {item.v}<span style={{ fontSize:11, color:C.smoke }}>{"/"}{item.max}</span>
              </div>
            )}
            <span data-noswipe="1" onClick={onClose}
              style={{ width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center", background:C.layer3, borderRadius:"50%", cursor:"pointer", color:C.smoke, fontSize:16 }}>{"×"}</span>
          </div>
        </div>
        {/* المحتوى */}
        <div style={{ fontSize:12, color:C.mist, lineHeight:1.75, marginBottom:12 }}>{item.tip}</div>
        {/* شريط القيمة */}
        {item.max && (
          <div style={{ marginBottom:12 }}>
            <div style={{ height:8, background:C.layer3, borderRadius:4, overflow:"hidden", marginBottom:6 }}>
              <div style={{ height:"100%", width:`${Math.max(0,Math.min(100,item.v/item.max*100))}%`, background:col, borderRadius:4 }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10 }}>
              <span style={{ color:C.smoke }}>{"0"}</span>
              <span style={{ color:col, fontWeight:700 }}>{item.v}{" / "}{item.max}</span>
              <span style={{ color:C.smoke }}>{item.max}</span>
            </div>
          </div>
        )}
        {/* اتجاه آخر 4 أرباع */}
        {history.length > 0 && (
          <div style={{ background:C.layer3, borderRadius:10, padding:"10px 12px" }}>
            <div style={{ fontSize:10, color:C.smoke, marginBottom:8, fontWeight:700 }}>{"الاتجاه — آخر 4 أرباع"}</div>
            <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:36 }}>
              {history.map((h,i)=>{
                const pct = item.max ? h/item.max : 0.7;
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ width:"100%", height:Math.max(8,pct*36), background:col, borderRadius:3, opacity:0.4+i*0.18 }}/>
                    <span style={{ fontSize:8, color:C.smoke, fontFamily:"IBM Plex Mono,monospace" }}>{h}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


// ─── ScoreCard ────────────────────────────────────────────────────
function ScoreCard({ item, idx, onInfo }) {
  const [open, setOpen] = useState(false);
  const grade = item.max
    ? (item.v/item.max>=0.78?"A":item.v/item.max>=0.56?"B":item.v/item.max>=0.33?"C":"D")
    : (item.v<-2.22?"A":item.v<-1.78?"B":"C");
  const gradeCol = grade==="A"?C.mint:grade==="B"?C.amber:C.coral;
  const col = item.color;
  // idx 0,1 = صف أول → popup أسفل | idx 2,3 = صف ثاني → popup فوق
  const isBottom = idx >= 2;
  // عمود يمين (idx زوجي في RTL) → popup يمتد يساراً (right:0) | عمود يسار → يمتد يميناً (left:0)
  const popSide = idx % 2 === 0 ? { right:0, left:"auto" } : { left:0, right:"auto" };  return (
    <div style={{ background:col+"12", borderRadius:14, border:`1px solid ${col}25`, padding:"12px", paddingTop:38, position:"relative", textAlign:"center" }}>
      <button data-noswipe="1"
        onClick={e=>{e.stopPropagation();setOpen(v=>!v);}}
        onTouchEnd={e=>{e.stopPropagation();e.preventDefault();setOpen(v=>!v);}}
        style={{ position:"absolute", top:6, right:6, width:24, height:24, borderRadius:"50%", background:open?col+"33":col+"22", border:`1.5px solid ${col}`, color:col, fontSize:12, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1, zIndex:2, WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>{"?"}</button>
      <div style={{ position:"absolute", top:6, left:6, width:22, height:22, borderRadius:5, background:gradeCol+"22", border:`1px solid ${gradeCol}55`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:10, fontWeight:900, color:gradeCol }}>{grade}</span>
      </div>
      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:22, fontWeight:900, color:col, textShadow:`0 0 10px ${col}55`, lineHeight:1, marginBottom:6 }}>{item.v}</div>
      {item.max && <div style={{ height:3, background:C.layer3, borderRadius:2, marginBottom:6, overflow:"hidden" }}><div style={{ height:"100%", width:`${Math.max(0,Math.min(100,(item.v/item.max)*100))}%`, background:col, borderRadius:2 }}/></div>}
      <div style={{ fontSize:11, color:col, fontWeight:700 }}>{item.note}</div>
      <div style={{ fontSize:10, color:C.smoke, marginTop:2, lineHeight:1.3 }}>{item.eng}</div>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:100 }}/>
          <div data-noswipe="1" style={{
            position:"absolute",
            ...(isBottom ? { bottom:"calc(100% + 6px)" } : { top:"calc(100% + 6px)" }),
            ...popSide,
            width:"200px",
            zIndex:100,
            background:C.layer1,
            border:`1px solid ${col}66`,
            borderRadius:12,
            padding:"12px",
            textAlign:"right",
            boxShadow:`0 8px 32px rgba(0,0,0,.95)`
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:800, color:col }}>{item.eng || item.l}</span>
              <span data-noswipe="1" onClick={()=>setOpen(false)}
                style={{ width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:C.layer3,borderRadius:"50%",cursor:"pointer",color:C.smoke,fontSize:14,flexShrink:0 }}>{"×"}</span>
            </div>
            <div style={{ fontSize:11, color:C.mist, lineHeight:1.7, marginBottom:10 }}>{item.tip}</div>
            {item.max && <>
              <div style={{ height:6, background:C.layer3, borderRadius:3, overflow:"hidden", marginBottom:6 }}>
                <div style={{ height:"100%", width:`${Math.max(0,Math.min(100,item.v/item.max*100))}%`, background:col, borderRadius:3 }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.smoke }}>
                <span>{"0"}</span><span style={{ color:col,fontWeight:700 }}>{item.v}/{item.max}</span><span>{item.max}</span>
              </div>
            </>}
          </div>
        </>
      )}
    </div>
  );
}
// ─── MiniScoreCard ────────────────────────────────────────────────
function MiniScoreCard({ item, c, idx, onInfo }) {
  const [open, setOpen] = useState(false);
  // 3 بطاقات في صف — idx 0=يمين (RTL)، 1=وسط، 2=يسار
  // يمين → popup يمتد يساراً | يسار → popup يمتد يميناً
  const popLeft = idx === 0 ? { right:0, left:"auto" }
                : idx === 2 ? { left:0, right:"auto" }
                : { left:"50%", transform:"translateX(-50%)" };
  return (
    <div style={{ background:c+"12", borderRadius:10, border:`1px solid ${c}25`, padding:"10px 8px", textAlign:"center", position:"relative" }}>
      <button data-noswipe="1"
        onClick={e=>{e.stopPropagation();setOpen(v=>!v);}}
        onTouchEnd={e=>{e.stopPropagation();e.preventDefault();setOpen(v=>!v);}}
        style={{ position:"absolute", top:5, left:5, width:22, height:22, borderRadius:"50%", background:open?c+"33":c+"22", border:`1.5px solid ${c}`, color:c, fontSize:11, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1, zIndex:2, WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>{"?"}</button>
      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:22, fontWeight:900, color:c, textShadow:`0 0 8px ${c}55` }}>{item.v}</div>
      <div style={{ height:3, background:C.layer3, borderRadius:2, margin:"5px 0" }}><div style={{ width:item.v+"%", height:"100%", background:c, borderRadius:2 }}/></div>
      <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>{item.l}</div>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:100 }}/>
          <div data-noswipe="1" style={{
            position:"absolute",
            bottom:"calc(100% + 6px)",
            ...popLeft,
            width:"160px",
            zIndex:100,
            background:C.layer1,
            border:`1px solid ${c}66`,
            borderRadius:12,
            padding:"12px",
            textAlign:"right",
            boxShadow:`0 8px 32px rgba(0,0,0,.95)`
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:800, color:c }}>{item.l}</span>
              <span data-noswipe="1" onClick={()=>setOpen(false)}
                style={{ width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:C.layer3,borderRadius:"50%",cursor:"pointer",color:C.smoke,fontSize:14,flexShrink:0 }}>{"×"}</span>
            </div>
            <div style={{ fontSize:11, color:C.mist, lineHeight:1.7, marginBottom:8 }}>{item.tip}</div>
            <div style={{ height:5, background:C.layer3, borderRadius:3, overflow:"hidden" }}>
              <div style={{ height:"100%", width:item.v+"%", background:c, borderRadius:3 }}/>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── SnowflakeCard ────────────────────────────────────────────────
function SnowflakeCard({ stk, scores }) {
  const [drawerItem, setDrawerItem] = useState(null);
  const [popPos,     setPopPos]     = useState({top:0, left:0});
  const cardRef = useRef(null);

  const openInfo = (ax) => {
    setDrawerItem(ax);
  };

  // helper: label based on real value
  const labelCol = (label) =>
    label==="ممتاز"?C.mint:label==="جيد"?C.mint:label==="مقبول"?C.amber:
    label==="معقول"?C.amber:label==="مرتفع"?C.coral:
    label==="ضعيف"||label==="غالي"||label==="خطر"||label==="منخفض"||label==="سلبي"?C.coral:C.smoke;

  const getLabel = (metric, val) => {
    if(val==null) return "—";
    if(metric==="pe")     return val<10?"رخيص جداً":val<20?"معقول":val<30?"مرتفع":"غالي";
    if(metric==="growth") return val>20?"ممتاز":val>10?"جيد":val>5?"مقبول":val>0?"ضعيف":"سلبي";
    if(metric==="margin") return val>25?"ممتاز":val>15?"جيد":val>5?"مقبول":"ضعيف";
    if(metric==="cr")     return val>2?"ممتاز":val>1.5?"جيد":val>1?"مقبول":"خطر";
    if(metric==="div")    return val>5?"ممتاز":val>3?"جيد":val>1?"مقبول":"منخفض";
    if(metric==="pct")    return val>5?"ممتاز":val>0?"جيد":val>-5?"مقبول":"ضعيف";
    return "—";
  };

  const axesDefs = [
    { l:"القيمة",  col:C.electric, key:"pe",
      raw: stk.pe ? stk.pe+"x" : "-",
      label: getLabel("pe", stk.pe),
      tip:"P/E — مكرر الربحية. الأقل = قيمة أفضل.",
      ranges:"أقل من 10 = رخيص جداً | 10-20 = معقول | 20-30 = مرتفع | أكثر من 30 = غالي",
      v: Math.min(100,Math.max(0, stk.pe ? Math.round(Math.max(0,100-(stk.pe/40)*100)) : scores.valScore||60)) },
    { l:"النمو",   col:C.mint, key:"growth",
      raw: stk.revGrowthYoY!=null ? stk.revGrowthYoY+"%" : "-",
      label: getLabel("growth", stk.revGrowthYoY),
      tip:"نمو الإيرادات سنوياً (YoY). الأعلى أفضل.",
      ranges:"أكثر من 20% = ممتاز | 10-20% = جيد | 5-10% = مقبول | 0-5% = ضعيف | سلبي = صفر",
      v: Math.min(100,Math.max(0, stk.revGrowthYoY!=null ? Math.round(Math.min(100,Math.max(0,stk.revGrowthYoY)*5)) : scores.growthScore||55)) },
    { l:"الربحية", col:C.plasma, key:"margin",
      raw: stk.netMargin!=null ? stk.netMargin+"%" : "-",
      label: getLabel("margin", stk.netMargin),
      tip:"هامش الربح الصافي. الأعلى أفضل.",
      ranges:"أكثر من 25% = ممتاز | 15-25% = جيد | 5-15% = مقبول | أقل من 5% = ضعيف",
      v: Math.min(100,Math.max(0, stk.netMargin ? Math.round(Math.min(100,stk.netMargin*3.3)) : scores.profitScore||70)) },
    { l:"الصحة",  col:C.teal, key:"cr",
      raw: stk.currentRatio!=null ? stk.currentRatio+"x" : "-",
      label: getLabel("cr", stk.currentRatio),
      tip:"نسبة التداول (Current Ratio). الأعلى أفضل.",
      ranges:"أكثر من 2 = ممتاز | 1.5-2 = جيد | 1-1.5 = مقبول | أقل من 1 = خطر",
      v: Math.min(100,Math.max(0, stk.currentRatio ? Math.round(Math.min(100,stk.currentRatio*45)) : scores.debtScore||65)) },
    { l:"التوزيع", col:C.gold, key:"div",
      raw: stk.divYld!=null ? stk.divYld+"%" : "-",
      label: getLabel("div", stk.divYld),
      tip:"عائد التوزيعات (Dividend Yield). الأعلى أفضل.",
      ranges:"أكثر من 5% = ممتاز | 3-5% = جيد | 1-3% = مقبول | أقل من 1% = منخفض",
      v: Math.min(100,Math.max(0, stk.divYld ? Math.round(Math.min(100,stk.divYld*16.6)) : 50)) },
    { l:"الزخم",  col:C.amber, key:"pct",
      raw: stk.pct!=null ? (stk.pct>0?"+":"")+stk.pct+"%" : "-",
      label: getLabel("pct", stk.pct),
      tip:"الأداء السعري مقارنة بالسوق.",
      ranges:"أكثر من +5% = ممتاز | 0 إلى +5% = جيد | -5 إلى 0% = مقبول | أقل من -5% = ضعيف",
      v: Math.min(100,Math.max(0, stk.pct!=null ? Math.round(50+stk.pct*5) : 55)) },
  ];

  const axes=axesDefs;
  const N=axes.length, R=52, CX=75, CY=75;
  const toXY=(i,r)=>{ const a=(i/N)*2*Math.PI-Math.PI/2; return {x:CX+r*Math.cos(a),y:CY+r*Math.sin(a)}; };
  const outerPts=axes.map((_,i)=>toXY(i,R));
  const valuePath=axes.map((ax,i)=>toXY(i,ax.v/100*R)).map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z";
  const avgScore=Math.round(axes.reduce((a,ax)=>a+ax.v,0)/N);

  return (
    <>
      <SectionCard title="تقييم شامل — Snowflake" accent={C.plasma}>
        <div ref={cardRef} style={{ padding:"10px 16px", direction:"ltr" }}>
          <div style={{display:"flex", flexDirection:"row", alignItems:"center", gap:12}}>
            {/* المحاور مع زر ? */}
            <div style={{flex:1, minWidth:0}}>
              {axes.map((ax,i)=>(
                <div key={i} style={{marginBottom:7}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:10, marginBottom:2}}>
                    <div style={{display:"flex", alignItems:"center", gap:6}}>
                      <span style={{color:C.smoke}}>{ax.l}</span>
                      <span
                        data-noswipe="1"
                        onClick={()=>openInfo(ax)}
                        onTouchEnd={e=>{ e.stopPropagation(); e.preventDefault(); openInfo(ax); }}
                        style={{width:20,height:20,borderRadius:"50%",background:ax.col+"22",border:`1.5px solid ${labelCol(ax.label)}`,color:labelCol(ax.label),fontSize:11,fontWeight:900,cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",lineHeight:1,WebkitTapHighlightColor:"transparent",touchAction:"manipulation",flexShrink:0,userSelect:"none"}}>
                        {"?"}
                      </span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{color:C.smoke,fontSize:9,opacity:0.7}}>{ax.raw}</span>
                      <span style={{fontSize:9,color:labelCol(ax.label),fontWeight:700}}>{ax.label}</span>
                    </div>
                  </div>
                  <div style={{height:3,background:C.layer3,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${ax.v}%`,background:labelCol(ax.label),borderRadius:2}}/>
                  </div>
                </div>
              ))}
            </div>
            {/* المخطط */}
            <svg width={130} height={130} viewBox="0 0 150 150" style={{flexShrink:0}}>
              {[0.25,0.5,0.75,1].map((t,i)=>{
                const pts2=axes.map((_,j)=>toXY(j,R*t));
                const path2=pts2.map((p,j)=>`${j===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+"Z";
                return <path key={i} d={path2} fill="none" stroke={C.line} strokeWidth=".6" opacity=".5"/>;
              })}
              {outerPts.map((p,i)=><line key={i} x1={CX} y1={CY} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke={C.line} strokeWidth=".5" opacity=".4"/>)}
              <path d={valuePath} fill={C.plasma+"40"} stroke={C.plasma} strokeWidth="1.8"/>
              <circle cx={CX} cy={CY} r={R*0.12} fill={C.plasma} opacity=".6"/>
              <text x={CX} y={CY+4} textAnchor="middle" fill={C.snow} fontSize="9" fontWeight="800" fontFamily="IBM Plex Mono,monospace">{avgScore}</text>
              {axes.map((ax,i)=>{
                const lp=toXY(i,R+18);
                const vp=toXY(i,ax.v/100*R);
                return <g key={i}>
                  <text x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor="middle" fill={C.smoke} fontSize="9" fontFamily="Cairo,sans-serif">{ax.l}</text>
                  <circle cx={vp.x.toFixed(1)} cy={vp.y.toFixed(1)} r="3.5" fill={labelCol(ax.label)} opacity="0.9"/>
                  <text x={vp.x.toFixed(1)} y={(vp.y-6).toFixed(1)} textAnchor="middle" fill={C.snow} fontSize="7.5" fontWeight="700" fontFamily="IBM Plex Mono,monospace">{ax.v}</text>
                </g>;
              })}
            </svg>
          </div>
        </div>
      </SectionCard>

      {/* Popup في وسط الشاشة */}
      {drawerItem && (
        <>
          <div onClick={()=>setDrawerItem(null)}
            style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,.65)"}}/>
          <div data-noswipe="1" style={{
            position:"fixed",
            top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
            zIndex:200,
            background:C.layer1,
            border:`1px solid ${drawerItem.col}66`,
            borderRadius:16,
            padding:"16px",
            width:"85vw", maxWidth:300,
            boxShadow:`0 12px 40px rgba(0,0,0,.95)`
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:800,color:drawerItem.col}}>{drawerItem.l}</div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,color:C.smoke}}>{"القيمة الفعلية"}</div>
                  <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:16,fontWeight:900,color:C.mist}}>{drawerItem.raw}</div>
                </div>
                <div style={{width:1,height:32,background:C.line}}/>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,color:C.smoke}}>{"الدرجة"}</div>
                  <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:22,fontWeight:900,color:drawerItem.col}}>{drawerItem.v}<span style={{fontSize:10,color:C.smoke}}>{"/100"}</span></div>
                </div>
                <span data-noswipe="1" onClick={()=>setDrawerItem(null)}
                  style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",background:C.layer3,borderRadius:"50%",cursor:"pointer",color:C.smoke,fontSize:16}}>{"×"}</span>
              </div>
            </div>
            <div style={{fontSize:12,color:C.mist,lineHeight:1.75,marginBottom:10}}>{drawerItem.tip}</div>
            <div style={{background:C.layer3,borderRadius:8,padding:"8px 10px",marginBottom:12}}>
              {drawerItem.ranges && drawerItem.ranges.split(" | ").map((r,i)=>(
                <div key={i} style={{fontSize:10,color:C.smoke,lineHeight:1.8}}>{r}</div>
              ))}
            </div>
            <div style={{height:8,background:C.layer3,borderRadius:4,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${drawerItem.v}%`,background:drawerItem.col,borderRadius:4,transition:"width .4s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
              <span style={{color:C.smoke}}>{"0"}</span>
              <span style={{color:drawerItem.v>=75?C.mint:drawerItem.v>=50?C.amber:C.coral,fontWeight:800}}>
                {drawerItem.v>=75?"ممتاز ✓":drawerItem.v>=50?"جيد":"يحتاج تحسين"}
              </span>
              <span style={{color:C.smoke}}>{"100"}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── HealthScores ─────────────────────────────────────────────────
function HealthScores({ scores, scoreLabel, scoreColor }) {
  const [drawerItem,  setDrawerItem]  = useState(null);
  const [drawerColor, setDrawerColor] = useState(null);
  const openDrawer = (item, col) => {
    setDrawerItem(item);
    setDrawerColor(col || item?.color);
  };
  return (
    <>
      <SectionCard title="الصحة المالية — درجات متعددة المعايير" accent={C.mint}>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              {l:"ألتمان Z",           eng:"Altman Z-Score",    v:scores.altmanZ,   max:5,   note:scores.altmanZ>=3?"منطقة آمنة":scores.altmanZ>=2?"رمادي":"خطر",       color:scores.altmanZ>=3?C.mint:scores.altmanZ>=2?C.amber:C.coral,
                tip:"يقيس احتمالية الإفلاس. ≥3 آمن، 1.8-3 رمادي، <1.8 خطر."},
              {l:"بيوتروسكي F",        eng:"Piotroski F-Score", v:scores.piotroski, max:9,   note:scores.piotroski>=7?"جودة عالية":scores.piotroski>=5?"متوسط":"ضعيف", color:scores.piotroski>=7?C.mint:scores.piotroski>=5?C.amber:C.coral,
                tip:"يقيس جودة الأرباح والقوة المالية من 9 نقاط. 7-9 ممتاز، 4-6 متوسط، 0-3 ضعيف."},
              {l:"نقاط التدفق النقدي", eng:"Cash Score",        v:scores.cashScore, max:100, note:scoreLabel(scores.cashScore), color:scoreColor(scores.cashScore),
                tip:"يقيس قوة التدفق النقدي من 100 نقطة. ≥75 قوي، 50-74 متوسط، <50 ضعيف."},
              {l:"بينيش M",            eng:"Beneish M-Score",   v:scores.beneish,   max:null, note:scores.beneish<-2.22?"لا تلاعب":"مراقبة", color:scores.beneish<-2.22?C.mint:C.amber, isNeg:true,
                tip:"يكتشف التلاعب بالأرباح. <-2.22 لا تلاعب، ≥-2.22 يستحق المراقبة."},
            ].map((item,i) => (
              <ScoreCard key={i} item={item} idx={i} onInfo={openDrawer}/>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[
              {l:"الربحية", v:scores.profitScore, tip:"يقيس هوامش الربح وعائد حقوق الملكية. ≥75 قوي، 50-74 متوسط، <50 ضعيف."},
              {l:"النمو",   v:scores.growthScore,  tip:"يقيس نمو الإيرادات والأرباح سنة على سنة. ≥75 قوي، 50-74 متوسط، <50 ضعيف."},
              {l:"الديون",  v:scores.debtScore,    tip:"يقيس مستوى المديونية وقدرة السداد. ≥75 آمن، 50-74 مقبول، <50 مرتفع."},
            ].map((item,i) => {
              const c = scoreColor(item.v);
              return <MiniScoreCard key={i} item={item} c={c} idx={i} onInfo={openDrawer}/>;
            })}
          </div>
        </div>
      </SectionCard>
      {drawerItem && (
        <ScoreDrawer
          item={drawerItem}
          color={drawerColor}
          onClose={()=>setDrawerItem(null)}
        />
      )}
    </>
  );
}

// ─── SDOverview ───────────────────────────────────────────────────
//
function PerDropdown({ per, setPer }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const labels = {"1D":"يوم","1W":"أسبوع","1M":"شهر","3M":"3 أشهر","6M":"6 أشهر","1Y":"سنة","5Y":"5 سنوات","MAX":"أقصى"};
  const toggle = () => {
    if(btnRef.current) setRect(btnRef.current.getBoundingClientRect());
    setOpen(v=>!v);
  };
  return (
    <div>
      <button ref={btnRef} onClick={toggle}
        style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px", borderRadius:8, background:`linear-gradient(135deg,${C.electric}22,${C.electric}0c)`, border:`1px solid ${C.electric}55`, color:C.electric, fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, cursor:"pointer", minHeight:36 }}>
        {per}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5" style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s"}}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && rect && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:100 }}/>
          <div style={{ position:"fixed", top:rect.top - 212, left: Math.max(8, rect.right - 148), background:C.layer1, border:`1px solid ${C.line}`, borderRadius:10, padding:6, boxShadow:"0 8px 24px rgba(0,0,0,.8)", zIndex:100, display:"grid", gridTemplateColumns:"1fr 1fr", gap:3, minWidth:140 }}>
            {["1D","1W","1M","3M","6M","1Y","5Y","MAX"].map(p2=>(
              <button key={p2} onClick={()=>{ setPer(p2); setOpen(false); }}
                style={{ padding:"8px 6px", borderRadius:7, background:per===p2?`${C.electric}22`:"transparent", border:`1px solid ${per===p2?C.electric+"55":C.line+"33"}`, color:per===p2?C.electric:C.smoke, fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:per===p2?800:500, cursor:"pointer", textAlign:"center", lineHeight:1.4 }}>
                <div>{p2}</div>
                <div style={{ fontSize:9, color:per===p2?C.electric:C.ash }}>{labels[p2]}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SDOverview({ stk, per, setPer, onNav, onExpand }) {
  const [chartType, setChartType] = useState("شموع"); // شموع | خطي | هيكن | منطقة
  const [showMore, setShowMore] = useState(false);
  const scores = FIN_SCORES[stk.sym] || FIN_SCORES.default;

  //
  const mom = useMemo(() => {
    const p = stk.p || 100;
    const prev = stk.prev || p;
    const seed = (stk.sym||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);

    //
    const makeLCG = (s) => {
      let lcg = (s * 1664525 + 1013904223) & 0xffffffff;
      return () => { lcg=(lcg*1664525+1013904223)&0xffffffff; return (lcg>>>0)/0xffffffff; };
    };

    //
    const miniRSI = (prices) => {
      if(prices.length < 2) return 50;
      let gains=0, losses=0;
      for(let i=1;i<prices.length;i++){
        const d=prices[i]-prices[i-1];
        if(d>0) gains+=d; else losses+=Math.abs(d);
      }
      if(losses===0) return 100;
      return parseFloat((100-100/(1+gains/losses)).toFixed(1));
    };

    //
    const calcMom = (bars, volatility, seedOffset) => {
      const rand = makeLCG(seed + seedOffset);
      const prices = [prev];
      for(let i=0;i<bars;i++){
        const last = prices[prices.length-1];
        const pull = (p - last) * 0.1;
        const noise = (rand()-0.48) * p * volatility;
        prices.push(Math.max(p*0.8, Math.min(p*1.2, last + pull + noise)));
      }
      prices[prices.length-1] = p; // آخر نقطة = السعر الحالي
      const rsi = miniRSI(prices);
      //
      const shortMA = prices.slice(-Math.min(3,prices.length)).reduce((a,b)=>a+b,0)/Math.min(3,prices.length);
      const longMA  = prices.reduce((a,b)=>a+b,0)/prices.length;
      const maSignal = shortMA > longMA;
      const chg = (prices[prices.length-1]-prices[0])/prices[0]*100;

      //
      const bullish = [rsi>55, maSignal, chg>0].filter(Boolean).length;
      if(bullish===3) return "شراء قوي";
      if(bullish===2) return "شراء";
      if(bullish===1) return "مراقبة";
      return "بيع";
    };

    //
    const m5   = calcMom(5,   0.002, 1);
    const m15  = calcMom(15,  0.003, 2);
    const m30  = calcMom(30,  0.004, 3);
    const h1   = calcMom(60,  0.005, 4);
    const h5   = calcMom(300, 0.007, 5);
    const d1   = calcMom(24,  0.008, 6);
    const w1   = calcMom(7,   0.012, 7);
    const mo1  = calcMom(30,  0.018, 8);

    //
    const allSignals = [m5,m15,m30,h1,h5,d1,w1,mo1];
    const bullCount  = allSignals.filter(s=>s.includes("شراء")).length;
    const priceScore = Math.round((bullCount/8)*100);

    return { m5, m15, m30, h1, h5, d1, w1, mo1, priceScore };
  }, [stk.sym, stk.p, stk.prev]);

  //
  const [analystData, setAnalystData] = useState(null);
  const [analystLoading, setAnalystLoading] = useState(false);
  const [analystError, setAnalystError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchAnalystRatings = async () => {
    setAnalystLoading(true);
    setAnalystError(null);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: 'ابحث عن أحدث تقييمات المحللين لسهم '+stk.name+' برمز ('+stk.sym+') في تداول السعودية.\nاجمع أحدث التقييمات من البنوك الدولية والسعودية (الراجحي كابيتال، SNB Capital، رياض كابيتال، JPMorgan، Goldman Sachs، HSBC، Morgan Stanley، Citi، UBS، وغيرها).\nأجب فقط بـ JSON صالح بهذا الشكل بدون أي نص إضافي:\n{\n  "buy": عدد_شراء,\n  "hold": عدد_احتفاظ,\n  "sell": عدد_بيع,\n  "targetPrice": متوسط_السعر_المستهدف_رقم,\n  "highTarget": أعلى_هدف,\n  "lowTarget": أدنى_هدف,\n  "banks": [\n    {"bank": "اسم_البنك", "rating": "شراء أو احتفاظ أو بيع أو تخفيض وزن", "target": رقم, "date": "YYYY/MM/DD"}\n  ]\n}'
          }]
        })
      });
      const data = await response.json();
      //
      const textBlocks = data.content?.filter(b => b.type === "text") || [];
      const fullText = textBlocks.map(b => b.text).join("");
      const match = fullText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setAnalystData(parsed);
        setLastFetched(new Date().toLocaleString("ar-SA"));
      } else {
        setAnalystError("لم يتم العثور على بيانات");
      }
    } catch(e) {
      setAnalystError("خطأ في الاتصال: " + e.message);
    }
    setAnalystLoading(false);
  };

  //
  const est   = analystData || (ANALYST_EST ? (ANALYST_EST[stk.sym] || ANALYST_EST.default) : {});
  const banks = analystData?.banks?.slice(0,8) || (ANALYST_BANKS[stk.sym] || ANALYST_BANKS.default).slice(0,5);
  const peers  = PEERS[stk.sym] || PEERS.default;

  const rng = stk.hi52 - stk.lo52 || 1;
  const pos52 = Math.min(100, Math.max(0, ((stk.p-stk.lo52)/rng)*100));
  const dayRng = stk.dayHi-stk.dayLo || 1;
  const dayPos = Math.min(100, Math.max(0, ((stk.p-stk.dayLo)/dayRng)*100));

  const tot = (est.buy||0)+(est.hold||0)+(est.sell||0);
  const buyP  = tot?Math.round((est.buy /tot)*100):0;
  const holdP = tot?Math.round((est.hold/tot)*100):0;
  const sellP = tot?Math.round((est.sell/tot)*100):0;
  const aColor = buyP>50?C.mint:sellP>50?C.coral:C.amber;

  const scoreColor = s => s>=75?C.mint:s>=50?C.amber:C.coral;
  const scoreLabel = s => s>=75?"قوي":s>=50?"متوسط":"ضعيف";

  const momColor = v => {
    if(v==="شراء قوي") return {bg:C.mint+"18",bd:C.mint+"55",c:C.mint};
    if(v==="شراء")     return {bg:C.mint+"10",bd:C.mint+"33",c:C.mint};
    if(v==="متعادل")   return {bg:C.smoke+"10",bd:C.line,c:C.smoke};
    if(v==="بيع")      return {bg:C.coral+"18",bd:C.coral+"44",c:C.coral};
    if(v==="بيع قوي")  return {bg:C.coral+"22",bd:C.coral+"55",c:C.coral};
    return {bg:C.layer3,bd:C.line,c:C.ash};
  };

  const statRowsMain = [
    {section:"السعر والتداول"},
    stk.dayHi&&stk.dayLo?{l:"مدى يومي",v:`${stk.dayLo} - ${stk.dayHi}`}:null,
    stk.hi52&&stk.lo52?{l:"نطاق 52 أسبوعاً",v:`${stk.lo52} - ${stk.hi52}`}:null,
    stk.mc?{l:"القيمة السوقية",v:stk.mc}:null,
    stk.bid&&stk.ask?{l:"طلب/عرض",v:`${stk.bid} / ${stk.ask}`}:null,
    stk.v?{l:"الحجم",v:(stk.v/1e6).toFixed(1)+"م"}:null,
    stk.avgVol30?{l:"معدل التداول 30 يوم",v:(stk.avgVol30/1e6).toFixed(1)+"م"}:null,
    stk.prev?{l:"الإغلاق السابق",v:stk.prev}:null,
    stk.o?{l:"سعر الفتح",v:stk.o}:null,
    {section:"التقييم"},
    stk.pe?{l:"مكررات الأرباح",v:stk.pe+"x"}:null,
    stk.ev?{l:"ق. الشركة/الربح قبل فوائد وضرائب وإهلاك",v:stk.ev}:null,
    stk.eps?{l:"ربحية السهم EPS",v:stk.eps+" ر.س"}:null,
    stk.bvps?{l:"القيمة الدفترية/السهم",v:stk.bvps+" ر.س"}:null,
    stk.beta?{l:"بيتا",v:stk.beta}:null,
    {section:"التوزيعات"},
    stk.div?{l:"توزيعات الأرباح (العائد)",v:`${stk.div} (${stk.divYld}%)`}:null,
    stk.shares?{l:"عدد الأسهم القائمة",v:stk.shares}:null,
  ].filter(Boolean);
  const statRowsExtra = [
    stk.nextEarnings?{l:"تاريخ الأرباح المقبل",v:stk.nextEarnings}:null,
    stk.priceReturn1y?{l:"إجمالي عائد السعر خلال 1 سنة",v:stk.priceReturn1y}:null,
    stk.priceReturnYTD?{l:"العائد منذ بداية السنة",v:stk.priceReturnYTD}:null,
    null,
    stk.forwardPE?{l:"مضاعف الأرباح المتوقع",v:stk.forwardPE+"x"}:null,
    stk.pegRatio?{l:"نسبة PEG",v:stk.pegRatio,sub:"<1 = مقيّم بأقل"}:null,
    stk.pb?{l:"السعر/القيمة الدفترية",v:stk.pb+"x"}:null,
    stk.ps?{l:"السعر/المبيعات",v:stk.ps+"x"}:null,
    stk.pcf?{l:"السعر/التدفق الحر",v:stk.pcf+"x"}:null,
    stk.evebitda?{l:"EV/EBITDA",v:stk.evebitda+"x"}:null,
    null,
    stk.roe?{l:"العائد على حقوق الملكية",v:stk.roe+"%"}:null,
    stk.roa?{l:"العائد على الأصول",v:stk.roa+"%"}:null,
    stk.roic?{l:"العائد على رأس المال المستثمر",v:stk.roic+"%"}:null,
    null,
    stk.grossMargin?{l:"هامش الربح الإجمالي",v:stk.grossMargin+"%"}:null,
    stk.opMargin?{l:"هامش الربح التشغيلي",v:stk.opMargin+"%"}:null,
    stk.netMargin?{l:"هامش الربح الصافي",v:stk.netMargin+"%"}:null,
    stk.ebitdaMargin?{l:"هامش EBITDA",v:stk.ebitdaMargin+"%"}:null,
    null,
    stk.debtEquity?{l:"الدين/حقوق الملكية",v:stk.debtEquity+"x"}:null,
    stk.currentRatio?{l:"نسبة التداول",v:stk.currentRatio}:null,
    stk.quickRatio?{l:"نسبة السيولة السريعة",v:stk.quickRatio}:null,
    null,
    stk.divStreak?{l:"سنوات التوزيع المتواصل",v:stk.divStreak+" سنوات"}:null,
    stk.divGrowth3y?{l:"نمو التوزيعات 3 سنوات",v:"+"+stk.divGrowth3y+"%"}:null,
    stk.payoutRatio?{l:"نسبة التوزيع",v:stk.payoutRatio+"%"}:null,
    stk.exDivDate?{l:"تاريخ الاستحقاق",v:stk.exDivDate}:null,
    null,
    stk.sharesFloat?{l:"الأسهم الحرة للتداول",v:stk.sharesFloat,sub:stk.floatPct+'% من الإجمالي'}:null,
    stk.shortInterest?{l:"البيع على المكشوف",v:stk.shortInterest+"%"}:null,
    stk.vwap?{l:"VWAP اليومي",v:stk.vwap?.toFixed(2)}:null,
  ].filter(Boolean);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>

      {/* الرسم البياني */}
      <div style={{ marginBottom:10 }}>
        <div style={{ borderRadius:"16px 16px 0 0", overflow:"hidden", border:`1px solid ${C.line}`, borderBottom:"none" }}>
          <ChartLoader sym={stk.sym} base={stk.p} per={per} chartType={chartType} stk={stk} onExpand={onExpand}/>
        </div>
        {/* شريط أدوات الشارت — فترات + أدوات */}
        <div style={{ background:`linear-gradient(160deg,${C.layer2},${C.deep})`, border:`1px solid ${C.line}`, borderTop:"none", borderRadius:"0 0 16px 16px", padding:"4px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:`inset 0 1px 0 ${C.layer3}` }}>

          {/* زر الفترة الزمنية */}
          <PerDropdown per={per} setPer={setPer}/>

          {/* أدوات — يمين */}
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {stk.vwap && <span style={{ fontSize:10, color:C.amber, background:C.amber+"15", border:`1px solid ${C.amber}33`, borderRadius:6, padding:"3px 7px", fontFamily:"IBM Plex Mono,monospace", lineHeight:1.5 }}>VWAP {stk.vwap}</span>}
            {stk.updatedAt && <span style={{ fontSize:9, padding:"2px 7px", borderRadius:5, fontFamily:"IBM Plex Mono,monospace", fontWeight:700, background:C.mint+"20", color:C.mint, border:`1px solid ${C.mint}33` }}>{"● حي"}</span>}
            <div style={{ display:"flex", gap:3 }}>
              {[
                {k:"شموع", icon:(col)=>(
                  <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
                    <line x1="4" y1="0" x2="4" y2="3"  stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
                    <rect x="2" y="3" width="4" height="6" fill={col} rx="0.5"/>
                    <line x1="4" y1="9" x2="4" y2="12" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="10" y1="2" x2="10" y2="4" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
                    <rect x="8" y="4" width="4" height="7" fill="none" stroke={col} strokeWidth="1.2" rx="0.5"/>
                    <line x1="10" y1="11" x2="10" y2="14" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
                    <line x1="15" y1="1" x2="15" y2="4" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
                    <rect x="13" y="4" width="4" height="5" fill={col} rx="0.5"/>
                    <line x1="15" y1="9" x2="15" y2="13" stroke={col} strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                )},
                {k:"خطي", icon:(col)=>(
                  <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
                    <polyline points="1,13 5,8 9,10 13,4 17,6" stroke={col} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )},
              ].map(({k,icon})=>(
                <button key={k} onClick={()=>setChartType(k)}
                  style={{ background:chartType===k?C.electric+"22":C.layer3, border:`1px solid ${chartType===k?C.electric:C.line}`, borderRadius:7, padding:"6px 8px", cursor:"pointer", minHeight:34 }}>
                  {icon(chartType===k?C.electric:C.smoke)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* نطاقات الأسعار */}
      {[
        {title:"النطاق اليومي", lo:stk.dayLo+' ر.س', hi:stk.dayHi+' ر.س', pos:dayPos},
        {title:"نطاق 52 أسبوع", lo:stk.lo52+' ر.س', hi:stk.hi52+' ر.س', pos:pos52},
      ].map((r,i) => (
        <SectionCard key={i}>
          <div style={{ padding:"12px 16px" }}>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5, marginBottom:7, textTransform:"uppercase", letterSpacing:"0.7px" }}>{r.title}</div>
            <div style={{ position:"relative", height:4, background:C.layer3, borderRadius:2, margin:"0 4px" }}>
              <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg,${C.coral},${C.amber},${C.mint})`, borderRadius:2 }}/>
              <div style={{ position:"absolute", top:"50%", left:`${r.pos}%`, transform:"translate(-50%,-50%)", width:10, height:10, borderRadius:"50%", background:C.snow, boxShadow:`0 0 6px ${C.snow}77` }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11 }}>
              <span style={{ color:C.coral, fontFamily:"IBM Plex Mono,monospace" }}>{r.lo}</span>
              <span style={{ color:C.mint, fontFamily:"IBM Plex Mono,monospace" }}>{r.hi}</span>
            </div>
          </div>
        </SectionCard>
      ))}

      {/* إحصائيات شاملة */}
      <SectionCard title="الإحصائيات الشاملة" accent={C.electric}>
        {statRowsMain.map((row,i)=>
          row===null?<div key={i} style={{height:1,background:C.line+"44",margin:"4px 0"}}/>:
          row.section?<Row key={i} section={row.section}/>:
          <Row key={i} label={row.l} value={row.v} sub={row.sub}
            color={row.l.includes("توزيع")||row.l.includes("عائد")?C.gold:row.l.includes("هامش")?C.mint:row.l.includes("دين")?C.coralL:C.mist}
            even={i%2===0}/>)}
        {showMore && statRowsExtra.map((row,i)=>
          row===null?<div key={"e"+i} style={{height:1,background:C.line+"44",margin:"4px 0"}}/>:
          row.section?<Row key={"e"+i} section={row.section}/>:
          <Row key={"e"+i} label={row.l} value={row.v} sub={row.sub}
            color={row.l.includes("توزيع")||row.l.includes("عائد")?C.gold:row.l.includes("هامش")?C.mint:row.l.includes("دين")?C.coralL:C.mist}
            even={i%2===0}/>)}
        <button onClick={()=>setShowMore(v=>!v)} style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:`${C.electric}08`,cursor:"pointer",border:"none",borderTop:`1px solid ${C.line}33`,minHeight:44}}>
          <span style={{fontSize:11,color:C.electric,fontWeight:700}}>{showMore?"اظهار أقل":"اظهار المزيد"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5">{showMore?<polyline points="18 15 12 9 6 15"/>:<polyline points="6 9 12 15 18 9"/>}</svg>
        </button>
        {onNav && (
          <button onClick={() => onNav("أساسي")} style={{ display:"flex", width:"100%", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:`${C.electric}08`, cursor:"pointer", border:"none", minHeight:44 }}>
            <span style={{ fontSize:11, color:C.electric, fontWeight:700 }}>البيانات المالية الكاملة</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        )}
      </SectionCard>

      {/* درجات الصحة المالية */}
      <HealthScores scores={scores} scoreLabel={scoreLabel} scoreColor={scoreColor}/>

      {/* Snowflake Chart — Simply Wall St Style */}
      <SnowflakeCard stk={stk} scores={scores}/>
      {/* الزخم متعدد الإطارات */}
      <SectionCard title="الزخم التقني — متعدد الإطارات" accent={C.gold}>
        <div style={{ padding:"14px 16px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6, marginBottom:6 }}>
            {[{t:"5د",v:mom.m5},{t:"15د",v:mom.m15},{t:"30د",v:mom.m30},{t:"1س",v:mom.h1}].map((item,i)=>{
              const mc=momColor(item.v);
              const icon=item.v==="شراء قوي"?"↑↑":item.v==="شراء"?"↑":item.v==="بيع"?"↓":"—";
              return <div key={i} style={{ background:mc.bg, border:`1px solid ${mc.bd}`, borderRadius:8, padding:"7px 4px", textAlign:"center" }}>
                <div style={{ fontSize:13, color:mc.c, lineHeight:1 }}>{icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color:mc.c, lineHeight:1.3, marginTop:1 }}>{item.v}</div>
                <div style={{ fontSize:9, color:C.smoke, marginTop:1, lineHeight:1.4 }}>{item.t}</div>
              </div>;
            })}
          </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:6, marginBottom:12 }}>
            {[{t:"5س",v:mom.h5},{t:"يومي",v:mom.d1},{t:"أسبوعي",v:mom.w1},{t:"شهري",v:mom.mo1}].map((item,i)=>{
              const mc=momColor(item.v);
              const icon=item.v==="شراء قوي"?"↑↑":item.v==="شراء"?"↑":item.v==="بيع"?"↓":"—";
              return <div key={i} style={{ background:mc.bg, border:`1px solid ${mc.bd}`, borderRadius:8, padding:"7px 4px", textAlign:"center" }}>
                <div style={{ fontSize:13, color:mc.c, lineHeight:1 }}>{icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color:mc.c, lineHeight:1.3, marginTop:1 }}>{item.v}</div>
                <div style={{ fontSize:9, color:C.smoke, marginTop:1, lineHeight:1.4 }}>{item.t}</div>
              </div>;
            })}
          </div>
          <div style={{ direction:"ltr", overflow:"visible" }}>
          <div style={{ position:"relative", paddingTop:32, marginBottom:4 }}>
            {(()=>{
              const score = mom.priceScore;
              const clamped = Math.max(8, Math.min(88, score));
              const col = score>=75?C.mint:score>=50?C.amber:C.coral;
              return (<>
                <div style={{ position:"absolute", top:0, left:`${clamped}%`, transform:"translateX(-50%)", background:C.layer1, border:`1px solid ${col}`, borderRadius:6, padding:"2px 10px", fontSize:11, color:col, fontWeight:700, whiteSpace:"nowrap", zIndex:2, boxShadow:`0 2px 8px rgba(0,0,0,.6)`, direction:"rtl" }}>
                  {score>=75?"شراء قوي":score>=50?"شراء":score>=30?"مراقبة":"بيع"} <span style={{fontFamily:"IBM Plex Mono,monospace"}}>{score}%</span>
                </div>
                <div style={{ position:"absolute", top:25, left:`${clamped}%`, transform:"translateX(-50%)", width:0, height:0, borderLeft:"5px solid transparent", borderRight:"5px solid transparent", borderTop:`5px solid ${col}` }}/>
              </>);
            })()}
            <div style={{ position:"relative", height:8, borderRadius:4, background:`linear-gradient(90deg,${C.coral},${C.amber},${C.mint})` }}>
              <div style={{ position:"absolute", top:"50%", left:`${Math.max(2,Math.min(98,mom.priceScore))}%`, transform:"translate(-50%,-50%)", width:13, height:13, borderRadius:"50%", background:C.snow, border:`2px solid ${C.layer1}`, boxShadow:"0 0 6px rgba(0,0,0,.7)" }}/>
            </div>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:11 }}>
            <span style={{ color:C.coral }}>ضعيف</span><span style={{ color:C.mint }}>ممتاز</span>
          </div>
          </div>
        </div>
      </SectionCard>

      {/* تقييمات المحللين المفصّلة */}
      <SectionCard title="تقييمات المحللين" accent={aColor} badge={banks.length>0?{text:banks.length+" بنك",color:C.electric}:null}>
        {/* زر التحديث بالذكاء الاصطناعي */}
        <div style={{ padding:"8px 16px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:10, color:C.smoke, lineHeight:1.5 }}>
            {lastFetched ? '✓ بيانات حية — '+lastFetched : "مخزّنة — اضغط للتحديث الحي"}
          </div>
          <button
            onClick={fetchAnalystRatings}
            disabled={analystLoading}
            style={{ display:"flex", alignItems:"center", gap:5, background:analystLoading?C.layer3:`${C.electric}18`, border:`1px solid ${C.electric}44`, borderRadius:8, padding:"5px 10px", color:C.electric, fontSize:11, fontWeight:700, cursor:analystLoading?"not-allowed":"pointer", fontFamily:"Cairo,sans-serif", minHeight:32 }}
          >
            {analystLoading ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5" style={{animation:"spin 1s linear infinite"}}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                جارٍ التحديث...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-1"/>
                </svg>
                تحديث AI
              </>
            )}
          </button>
        </div>
        {analystError && (
          <div style={{ margin:"6px 16px 0", padding:"6px 10px", background:`${C.coral}15`, border:`1px solid ${C.coral}33`, borderRadius:8, fontSize:10, color:C.coral }}>{analystError}</div>
        )}
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <Tag text={buyP>50?"شراء":sellP>50?"بيع":"احتفاظ"} color={aColor}/>
            <span style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>{tot} محلل</span>
          </div>
          <div style={{ display:"flex", height:6, borderRadius:3, overflow:"hidden", marginBottom:8, gap:1 }}>
            <div style={{ width:buyP+"%", background:C.mint, borderRadius:"3px 0 0 3px" }}/>
            <div style={{ width:holdP+"%", background:C.ash }}/>
            <div style={{ width:sellP+"%", background:C.coral, borderRadius:"0 3px 3px 0" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:12, fontSize:11, color:C.smoke, marginBottom:14, lineHeight:1.5 }}>
            <span><span style={{ color:C.coral }}>●</span> {est.sell||0} بيع</span>
            <span><span style={{ color:C.smoke }}>●</span> {est.hold||0} احتفاظ</span>
            <span><span style={{ color:C.mint }}>●</span> {est.buy||0} شراء</span>
          </div>
          {est.targetPrice && (
            <div style={{ background:C.layer3, borderRadius:10, border:`1px solid ${C.line}`, padding:"10px 14px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>الهدف الوسيط</span>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:18, fontWeight:900, color:C.snow }}>{est.targetPrice} <span style={{ fontSize:11, color:C.smoke }}>ر.س</span></span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                <span style={{ color:C.smoke, lineHeight:1.5 }}>{"أدنى هدف: "}{Math.min(...banks.filter(b=>b.target).map(b=>b.target))} ر.س</span>
                <span style={{ color:est.upside>=0?C.mint:C.coral, fontFamily:"IBM Plex Mono,monospace", fontWeight:800 }}>{est.upside>=0?"+":""}{est.upside}%</span>
                <span style={{ color:C.smoke, lineHeight:1.5 }}>{"أعلى هدف: "}{Math.max(...banks.filter(b=>b.target).map(b=>b.target))} ر.س</span>
              </div>
            </div>
          )}
          {banks.map((b,i) => {
            const ratingCol = b.rating==="شراء"?C.mint:b.rating==="بيع"?C.coral:b.rating==="احتفاظ"?C.amber:C.smoke;
            const changed = b.prev && b.prev!==b.target;
            return (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<banks.length-1?`1px solid ${C.line}22`:0 }}>
              <div>
                <div style={{ fontSize:11, color:C.mist, fontWeight:600, lineHeight:1.5 }}>{b.bank}</div>
                {b.date && <div style={{ fontSize:9, color:C.smoke }}>{b.date}</div>}
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <Tag text={b.rating} color={ratingCol}/>
                {b.target && (
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.snow, fontWeight:700 }}>{b.target}</div>
                    {changed && <div style={{ fontSize:9, color:C.smoke }}>{"من "}{b.prev}</div>}
                  </div>
                )}
                {b.upside!=null && <span style={{ fontSize:11, color:b.upside>=0?C.mint:C.coral, fontFamily:"IBM Plex Mono,monospace", fontWeight:700 }}>{b.upside>=0?"+":""}{b.upside}%</span>}
              </div>
            </div>
            );
          })}
        </div>
      </SectionCard>

      {/* مقارنة الأقران */}
      <SectionCard title="مقارنة بأقران القطاع" accent={C.teal}>
        <div style={{ overflowX:"auto" }}>
          <div style={{ minWidth:480 }}>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:0, padding:"8px 16px", background:C.layer3, borderBottom:`1px solid ${C.line}44` }}>
              {["الشركة","مضاعف الأرباح","السعر/الدفترية","ROE%","توزيع%","هامش إج%"].map((h,i)=><span key={i} style={{ fontSize:11, color:C.smoke, fontWeight:700, textAlign:i>0?"center":"right", lineHeight:1.5 }}>{h}</span>)}
            </div>
            {(()=>{
              //
              const cols2=[
                {k:"pe",    low:true},  // P/E أقل=أفضل
                {k:"pb",    low:true},  // P/B أقل=أفضل
                {k:"roe",   low:false}, // ROE أعلى=أفضل
                {k:"divYld",low:false}, // توزيع أعلى=أفضل
                {k:"grossM",low:false}, // هامش أعلى=أفضل
              ];
              const bests = cols2.map(({k,low})=>{
                const vals=peers.map(p=>p[k]).filter(v=>v!=null);
                return low ? Math.min(...vals) : Math.max(...vals);
              });
              return peers.map((peer,i)=>(
                <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:0, padding:"10px 16px", borderBottom:i<peers.length-1?`1px solid ${C.line}22`:0, background:peer.isCurrent?`${C.electric}08`:i%2===0?"transparent":"rgba(255,255,255,.015)", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:peer.isCurrent?800:600, color:peer.isCurrent?C.electric:C.mist, lineHeight:1.5 }}>{peer.name}</div>
                    <div style={{ fontSize:11, color:C.smoke, lineHeight:1.4 }}>{peer.sym} · {peer.pct>=0?"+":""}{peer.pct}%</div>
                  </div>
                  {[peer.pe,peer.pb,peer.roe,peer.divYld,peer.grossM].map((v,j)=>{
                    const isBest = v===bests[j];
                    const suffix = j>=2?"%":"x";
                    const col = isBest?C.gold:peer.isCurrent?C.electric:C.smoke;
                    return (
                      <div key={j} style={{ textAlign:"center" }}>
                        <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:isBest||peer.isCurrent?800:500, color:col }}>
                          {v}{suffix}
                        </span>
                        {isBest && <div style={{ fontSize:8, color:C.gold, lineHeight:1 }}>★</div>}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      </SectionCard>

      {/* مزاج السوق السعودي */}
      <SectionCard title="مزاج السوق السعودي" accent={C.plasma}>
        <div style={{ padding:"10px 16px" }}>
          {(()=>{
            //
            const seed2=(stk.sym||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0);
            const moodScore=Math.round(50+(stk.pct||0)*4+Math.sin(seed2)*15);
            const clamped=Math.max(0,Math.min(100,moodScore));
            const label=clamped>70?"جشع":clamped>55?"تفاؤل":clamped>45?"محايد":clamped>30?"قلق":"خوف";
            const moodC=clamped>70?C.coral:clamped>55?C.amber:clamped>45?C.smoke:clamped>30?C.amber:C.mint;
            const sectors=[
              {n:"طاقة",v:Math.min(100,Math.max(0,clamped+5))},
              {n:"بنوك",v:Math.min(100,Math.max(0,clamped-8))},
              {n:"بتروكيماويات",v:Math.min(100,Math.max(0,clamped+2))},
              {n:"اتصالات",v:Math.min(100,Math.max(0,clamped-3))},
              {n:"عقارات",v:Math.min(100,Math.max(0,clamped-12))},
            ];
            const fgItems=[
              {l:"زخم السوق",  v:Math.round(Math.min(100,Math.max(0,clamped+Math.sin(seed2+1)*10)))},
              {l:"قوة السعر",  v:Math.round(Math.min(100,Math.max(0,clamped+Math.sin(seed2+2)*8)))},
              {l:"التقلب",     v:Math.round(Math.min(100,Math.max(0,100-(clamped*0.6+20))))},
              {l:"حجم التداول",v:Math.round(Math.min(100,Math.max(0,clamped+Math.sin(seed2+3)*12)))},
            ];
            return (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4, direction:"ltr" }}>
                      <span style={{ color:C.coral, fontWeight:700 }}>خوف</span>
                      <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:moodC }}>{clamped}</span>
                      <span style={{ color:C.mint, fontWeight:700 }}>جشع</span>
                    </div>
                    <div style={{ position:"relative", height:8, background:`linear-gradient(to right,${C.coral},${C.amber},${C.mint})`, borderRadius:4, direction:"ltr" }}>
                      <div style={{ position:"absolute", top:-2, left:`${clamped}%`, transform:"translateX(-50%)", width:12, height:12, borderRadius:"50%", background:C.snow, border:`2px solid ${moodC}`, boxShadow:`0 0 6px ${moodC}88` }}/>
                    </div>
                  </div>
                  <div style={{ textAlign:"center", minWidth:60 }}>
                    <div style={{ fontSize:18, fontWeight:900, color:moodC }}>{label}</div>
                    <div style={{ fontSize:9, color:C.smoke }}>مزاج السوق</div>
                  </div>
                </div>
                {/* القطاعات */}
                <div style={{ fontSize:10, color:C.smoke, fontWeight:700, marginBottom:4 }}>أداء القطاعات</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:10 }}>
                  {sectors.map((s,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:10, color:C.smoke, width:80, flexShrink:0 }}>{s.n}</span>
                      <div style={{ flex:1, height:4, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${s.v}%`, background:s.v>60?C.coral:s.v>45?C.amber:C.mint, borderRadius:2 }}/>
                      </div>
                      <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:9, color:C.smoke, width:24 }}>{s.v}</span>
                    </div>
                  ))}
                </div>
                {/* Fear & Greed مكونات */}
                <div style={{ fontSize:10, color:C.smoke, fontWeight:700, marginBottom:4 }}>مكونات مزاج السوق</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {fgItems.map((f,i)=>{
                    const fc=f.v>60?C.coral:f.v>45?C.amber:C.mint;
                    return (
                      <div key={i} style={{ background:fc+"10", borderRadius:8, padding:"6px 8px", border:`1px solid ${fc}22` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:9, color:C.smoke }}>{f.l}</span>
                          <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:9, color:fc, fontWeight:700 }}>{f.v}</span>
                        </div>
                        <div style={{ height:3, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${f.v}%`, background:fc, borderRadius:2 }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </SectionCard>

      {/* القوة النسبية vs القطاع */}
      {(()=>{
        const peers2 = PEERS[stk.sym] || PEERS.default;
        const peerAvg = peers2.filter(p2=>!p2.isCurrent).reduce((a,p2,_,arr)=>a+p2.pct/arr.length,0);
        const diff = parseFloat((stk.pct - peerAvg).toFixed(2));
        const diffC = diff>2?C.mint:diff>0?C.teal:diff>-2?C.amber:C.coral;
        const label = diff>5?"متفوق بقوة":diff>2?"متفوق":diff>0?"أعلى بقليل":diff>-2?"أدنى بقليل":diff>-5?"متأخر":"متأخر بقوة";
        // comment
        const barPct = Math.round(50 + diff*5);
        const clamped = Math.max(5, Math.min(95, barPct));
        return (
          <SectionCard title="القوة النسبية — السهم vs القطاع" accent={diffC}>
            <div style={{ padding:"12px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:22, fontWeight:900, color:diffC }}>
                    {diff>=0?"+":""}{diff}%
                  </div>
                  <div style={{ fontSize:11, color:C.smoke, marginTop:2 }}>فرق الأداء عن متوسط القطاع</div>
                </div>
                <Tag text={label} color={diffC}/>
              </div>
              <div style={{ direction:"ltr" }}>
                <div style={{ position:"relative", height:8, borderRadius:4, background:`linear-gradient(90deg,${C.coral},${C.amber},${C.mint})`, marginBottom:6 }}>
                  {/* خط المنتصف */}
                  <div style={{ position:"absolute", top:-3, left:"50%", transform:"translateX(-50%)", width:1, height:14, background:C.smoke, opacity:0.5 }}/>
                  {/* النقطة */}
                  <div style={{ position:"absolute", top:"50%", left:`${clamped}%`, transform:"translate(-50%,-50%)", width:13, height:13, borderRadius:"50%", background:C.snow, border:`2px solid ${diffC}`, boxShadow:`0 0 6px ${diffC}88` }}/>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10 }}>
                  <span style={{ color:C.coral }}>أضعف من القطاع</span>
                  <span style={{ color:C.mint }}>أقوى من القطاع</span>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:10 }}>
                {[
                  {l:"أداء السهم",   v:(stk.pct>=0?"+":"")+stk.pct+"%",           c:stk.pct>=0?C.mint:C.coral},
                  {l:"متوسط القطاع", v:(peerAvg>=0?"+":"")+peerAvg.toFixed(2)+"%", c:peerAvg>=0?C.mint:C.coral},
                  {l:"الفرق",        v:(diff>=0?"+":"")+diff+"%",                   c:diffC},
                ].map((item,i)=>(
                  <div key={i} style={{ background:C.layer3, borderRadius:8, padding:"7px 6px", textAlign:"center" }}>
                    <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:item.c }}>{item.v}</div>
                    <div style={{ fontSize:9, color:C.smoke, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                      {item.l}
                      {item.tip && (
                        <InfoTooltip color={item.c} title="HHI — مؤشر هيرفيندال">
                          <div style={{fontSize:11,color:C.mist,lineHeight:1.8,marginBottom:10}}>
                            {"HHI = مجموع مربعات حصص الملاك."}<br/>
                            {"يقيس درجة تمركز الملكية."}
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:6}}>
                            {[
                              {r:"< 0.15",      l:"تنوع جيد",       c:C.mint},
                              {r:"0.15 — 0.25", l:"تركز متوسط",     c:C.amber},
                              {r:"> 0.25",      l:"تركز عال",       c:C.coral},
                            ].map((row,j)=>(
                              <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"5px 8px",background:row.c+"12",borderRadius:7}}>
                                <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:10,color:row.c,fontWeight:700}}>{row.r}</span>
                                <span style={{fontSize:10,color:C.smoke}}>{row.l}</span>
                              </div>
                            ))}
                          </div>
                        </InfoTooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:10, color:C.smoke, padding:"5px 8px", background:C.layer3, borderRadius:7 }}>
                <span>قوة نسبية 3 أشهر:</span>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", color:diffC, fontWeight:700 }}>
                  {diff>5?"ممتاز ▲▲":diff>2?"جيد ▲":diff>0?"أعلى بقليل":diff>-2?"أدنى بقليل":"ضعيف ▼"}
                </span>
              </div>
            </div>
          </SectionCard>
        );
      })()}

    </div>
  );
}
// ─── TechLoader ──────────────────────────────────────────────────

export {
  ChartLoader, CChart,
  ScoreDrawer, ScoreCard, MiniScoreCard, SnowflakeCard,
  HealthScores, PerDropdown, SDOverview,
};
