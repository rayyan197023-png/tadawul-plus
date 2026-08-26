'use client';
/**
 * @module features/stock/tabs/SDOverviewTab
 * @description تبويب نظرة عامة -- يشمل الشارت والدرجات والـ Snowflake
 *
 * المكونات:
 * - ChartLoader / CChart  : شارت السهم
 * - ScoreDrawer/ScoreCard : درجات التحليل
 * - SnowflakeCard         : رادار القوة
 * - HealthScores          : مؤشرات الصحة
 * - SDOverview            : تبويب نظرة عامة الرئيسي
 *
 * ✨ تم إصلاح:
 * - استيراد البيانات من StockDetailShared (لا dependency دائري)
 * - إصلاح bracket مكسور قرب popSide
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InfoTooltip } from './SDFundamentalTab';
import {
  C, Skeleton, SkeletonCard, EmptyState, SectionCard, Row, Tag,
  FIN_SCORES, PEERS, PROS_CONS, TECH_DATA, ANALYST_BANKS,
  EARNINGS_DATA, DIVIDENDS_DETAIL, DISCLOSURES, FINANCIALS_FULL,
  SHAREHOLDERS, INSIDER_TX,
} from './StockDetailShared';
import { ANALYST_EST } from './SDApiEnginesTab';
import { sahmkFetch } from '../../../services/api/sahmkFundamentalsApi';

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

function CChart({ sym, base, per, chartType, stk, onExpand }) {
  const isIndexChart = stk?.sym === 'TASI';
  // جلب الشموع الحقيقية من sahmk
  const [sahmkBars, setSahmkBars] = useState([]);

  const [sahmkLoading, setSahmkLoading] = useState(false);

    // sahmk فترات مدعومة فعلياً: 1D, 1W, 1Y فقط (الباقي يرجع ~3 أشهر افتراضياً)
  useEffect(() => {
    if (!sym) return;
    let cancelled = false;
    setSahmkLoading(true);

    const fetchBars = async () => {
      try {
        let normalized = [];
        if (per === "1H") {
          // ساعي: آخر يومين من intraday
          const res = await fetch(`/api/sahmkdata?endpoint=intraday&sym=${sym}&interval=60m`);
          const data = res.ok ? await res.json() : null;
          if (data?.data?.length) {
            normalized = data.data.slice(-16).map(b => ({
              o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume,
            })).filter(b => b.c > 0);
          }
        } else

        if (per === "1D") {
          // فريم اليوم: نستخدم intraday ساعي
          const res = await fetch(`/api/sahmkdata?endpoint=intraday&sym=${sym}&interval=60m`);
          const data = res.ok ? await res.json() : null;
          if (data?.data?.length) {
            // فلتر اليوم الحالي فقط
            const today = new Date().toISOString().slice(0, 10);
            const todayBars = data.data.filter(b => b.date.startsWith(today));
            const srcBars = todayBars.length >= 2 ? todayBars : data.data.slice(-8);
            normalized = srcBars.map(b => ({
              o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume,
            })).filter(b => b.c > 0);
          }
        } else if (per === "1W") {
          // أسبوع: آخر 5 أيام من intraday
          const res = await fetch(`/api/sahmkdata?endpoint=intraday&sym=${sym}&interval=60m`);
          const data = res.ok ? await res.json() : null;
          if (data?.data?.length) {
            normalized = data.data.slice(-35).map(b => ({
              o: b.open, h: b.high, l: b.low, c: b.close, v: b.volume,
            })).filter(b => b.c > 0);
          }
        } else {
          // باقي الفريمات: ohlcv يومي
          // sahmk يدعم 1Y فقط بشكل موثوق -- نجلب سنة ونقطع حسب الفترة
          const res = await fetch(`/api/sahmkdata?endpoint=ohlcv&sym=${sym}&period=1Y`);
          const data = res.ok ? await res.json() : null;
          if (data) {
            const bars = data.data || data.bars || data.ohlcv || [];
            const sliceMap = {"1M":22,"3M":65,"6M":130,"1Y":252,"5Y":252,"MAX":252};
            const sliceN = sliceMap[per] || 65;
            normalized = bars.slice(-sliceN).map(b => ({
              o: +(b.open  ?? b.o ?? 0),
              h: +(b.high  ?? b.h ?? 0),
              l: +(b.low   ?? b.l ?? 0),
              c: +(b.close ?? b.c ?? b.adjusted_close ?? 0),
              v: +(b.volume ?? b.v ?? 0),
            })).filter(b => b.c > 0);
          }
        }

        if (!cancelled) setSahmkBars(normalized);
      } catch (e) {
        if (!cancelled) setSahmkBars([]);
      } finally {

        if (!cancelled) setSahmkLoading(false);
      }
    };

    fetchBars();
    return () => { cancelled = true; };
  }, [sym, per]);


  const history = sahmkBars;
  const canvasRef  = useRef(null);
  const volRef     = useRef(null);
  const [crosshair, setCrosshair] = useState(null);
  const [zoom, setZoom]   = useState(1);
  const touchRef = useRef({});

  const pts = useMemo(() => {
    const nMap = {"1D":78,"1W":35,"1M":22,"3M":65,"6M":130,"1Y":248,"5Y":248,"MAX":248};
    const baseN = nMap[per] || 65;
    const n = Math.max(10, Math.round(baseN / zoom));
    // إذا البيانات الحقيقية موجودة استخدمها دائماً
    if (history.length >= 5)
      return history.slice(-n).map(h=>({ o:h.o??h.c, h:h.h??h.c, l:h.l??h.c, c:h.c, v:h.v??0 }));

    // لا بيانات وهمية -- إرجاع مصفوفة فارغة إذا لم تتوفر بيانات حقيقية
    return [];

  }, [sym, per, base, zoom, history]);

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

  const YAXIS_W=36, CHART_H_PX=220;
  const HCHART=174, HVOL=isIndexChart?0:34, padL=8, padR=28, padT=12;

  const getW  = ()=> canvasRef.current ? canvasRef.current.offsetWidth  : 400;
  const getH  = ()=> HCHART;
  const pxC   = (i,W) => padL + (n<=1?(W-padL-padR)/2:(i/(n-1))*(W-padL-padR));
  const pyC   = (v,W) => padT+(1-(v-mn)/rng)*(HCHART-padT-4);
  const cWC   = (W) => Math.max(1.5,Math.min(14,(W-padL-padR)/n*0.72));
  const pvyC  = (v,W) => HCHART+HVOL-(v/maxVol)*HVOL*0.91;

  const calcMApts=(period,W)=>{
    if(n<period) return [];
    const r=[];
    for(let i=period-1;i<n;i++){
      const avg=closes.slice(i-period+1,i+1).reduce((a,b)=>a+b,0)/period;
      r.push({x:pxC(i,W),y:pyC(avg,W)});
    }
    return r;
  };

  const hex2rgba=(hex,a)=>{
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  };

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
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

    ctx.fillStyle=C.ink;
    ctx.fillRect(0,0,W,HCHART);

    ctx.strokeStyle=C.line+'33';
    ctx.lineWidth=0.4;
    [0.2,0.4,0.6,0.8].forEach(t=>{
      const y=padT+(1-t)*(HCHART-padT-4);
      ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    });

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
    if(per==="1D"&&stk?.prev&&stk.prev>=mn&&stk.prev<=mx){
      const py2=pyC(stk.prev,W);
      ctx.setLineDash([4,5]); ctx.strokeStyle=C.smoke+'66'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(padL,py2); ctx.lineTo(W-padR,py2); ctx.stroke();
    }
    ctx.setLineDash([]);

    if(chartType==="خطي"||chartType==="منطقة"){
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
      let dispPts=pts;
      if(chartType==="هيكن"){
        const ha=[]; let hO=pts[0].o;
        for(const p2 of pts){
          const hC=(p2.o+p2.h+p2.l+p2.c)/4;
          const haO=(hO+(ha[ha.length-1]?.c||hO))/2||hO;
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
        ctx.strokeStyle=up?C.mint+'cc':C.coral+'cc'; ctx.lineWidth=isL?1.2:0.9;
        ctx.beginPath(); ctx.moveTo(x,hY); ctx.lineTo(x,bT); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,bT+bH); ctx.lineTo(x,lY); ctx.stroke();
        if(isL){
          ctx.shadowBlur=6; ctx.shadowColor=clr+'88';
        }
        ctx.fillStyle=clr+(up?'d0':'e0');
        ctx.fillRect(x-bw/2,bT,bw,Math.max(1,bH));
        ctx.shadowBlur=0;
      });
    }

    [[20,C.electric,1.4,0.75],[50,C.plasma,1.4,0.65]].forEach(([period,col,lw,op])=>{
      const mapts=calcMApts(period,W);
      if(mapts.length<2) return;
      ctx.strokeStyle=col+(Math.round(op*255).toString(16).padStart(2,'0'));
      ctx.lineWidth=lw; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.setLineDash([]);
      ctx.beginPath();
      mapts.forEach((p2,i)=>i===0?ctx.moveTo(p2.x,p2.y):ctx.lineTo(p2.x,p2.y));
      ctx.stroke();
    });

    if(crosshair){
      ctx.strokeStyle=C.snow+'55'; ctx.lineWidth=0.8; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(crosshair.cx,padT); ctx.lineTo(crosshair.cx,HCHART); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padL,crosshair.cy); ctx.lineTo(W-padR,crosshair.cy); ctx.stroke();
      ctx.setLineDash([]);
    }

    const lastY2=pyC(closes[n-1],W);
    ctx.strokeStyle=lastColor+'99'; ctx.lineWidth=0.9; ctx.setLineDash([3,4]);
    ctx.beginPath(); ctx.moveTo(padL,lastY2); ctx.lineTo(W-padR,lastY2); ctx.stroke();
    ctx.setLineDash([]);

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
      const ay=HVOL-(avgVolVal/maxVol)*HVOL*0.91;
      vctx.strokeStyle=C.teal+'99'; vctx.lineWidth=0.9; vctx.setLineDash([3,3]);
      vctx.beginPath(); vctx.moveTo(padL,ay); vctx.lineTo(W-padR,ay); vctx.stroke();
      vctx.setLineDash([]);
      vctx.fillStyle=C.teal+'99'; vctx.font='7px IBM Plex Mono,monospace';
      vctx.fillText('Avg',padL+2,ay-1);
    }

    const M=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
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

  if(n===0) return (
    <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center",background:C.ink}}>
      <div style={{textAlign:"center"}}>
        {sahmkLoading ? (
          <>
            <div style={{fontSize:12,color:C.smoke,marginBottom:8}}>جارٍ تحميل البيانات...</div>
            <div style={{width:32,height:32,border:`3px solid ${C.line}`,borderTopColor:C.electric,borderRadius:"50%",animation:"spin 0.9s linear infinite",margin:"0 auto"}}/>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          </>
        ) : (
          <>
            <div style={{fontSize:22,marginBottom:6}}>📉</div>
            <div style={{fontSize:12,color:C.smoke}}>لا توجد بيانات لهذه الفترة</div>
          </>
        )}
      </div>
    </div>
  );

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

  const yLevels=[0.12,0.35,0.58,0.81].map(t=>{
    const v=mn+t*rng;
    const dec=rng<2?3:rng<10?2:rng<100?1:0;
    const yPx=padT+(1-t)*(HCHART-padT-4);
    return {v:parseFloat(v.toFixed(dec)), pct:(yPx/CHART_H_PX)*100};
  });

  const crosshairChgF=crosshair?parseFloat(crosshair.chg):0;

  return (
    <div style={{ background:C.ink, userSelect:"none", position:"relative", touchAction:"none" }} data-noswipe="1">
      <button onClick={()=>onExpand&&onExpand()} style={{ position:"absolute", top:8, left:8, zIndex:30, width:28, height:28, borderRadius:7, background:`${C.layer2}dd`, border:`1px solid ${C.line}55`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.smoke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
      </button>

      {zoom>1.05&&<button onClick={()=>setZoom(1)} style={{ position:"absolute", top:8, left:44, zIndex:30, height:28, padding:"0 8px", borderRadius:7, background:`${C.electric}22`, border:`1px solid ${C.electric}55`, display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}>
        <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:C.electric, fontWeight:700 }}>{zoom.toFixed(1)}x</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9M3 3v6h6"/></svg>
      </button>}

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

      <div style={{ position:"relative", height:CHART_H_PX }}>
        <div style={{ position:"absolute", top:0, left:0, right:YAXIS_W, bottom:0 }}>
          <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:HCHART, cursor:"crosshair" }}
            onMouseMove={onMouseMove} onMouseLeave={()=>setCrosshair(null)}
            onTouchMove={onTouchMove}
            onTouchStart={e=>{ touchRef.current={panX:e.touches[0]?.clientX}; }}
            onTouchEnd={()=>{ touchRef.current.pinchDist=null; setCrosshair(null); }}/>
          <canvas ref={volRef} style={{ display:"block", width:"100%", height:HVOL+2 }}/>
          <div style={{ height:12, background:C.ink }}/>
        </div>

        <div style={{ position:"absolute", top:0, right:0, width:YAXIS_W, bottom:0, background:C.ink, borderLeft:`1px solid ${C.line}55` }}>
          {yLevels.map((lv,i)=>(
            <div key={i} style={{ position:"absolute", top:`${lv.pct}%`, left:0, right:0, transform:"translateY(-50%)", display:"flex", alignItems:"center", paddingLeft:2 }}>
              <div style={{ width:3, height:1, background:C.line, opacity:0.5, flexShrink:0 }}/>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:8, color:C.smoke, paddingLeft:2, whiteSpace:"nowrap" }}>{lv.v}</span>
            </div>
          ))}
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
          {stk?.hi52&&(()=>{ const pct2=(padT+(1-(stk.hi52-mn)/rng)*(HCHART-padT-4))/CHART_H_PX*100; return pct2>0&&pct2<100?<div style={{position:"absolute",top:`${pct2}%`,left:4,transform:"translateY(-50%)"}}><span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:8,color:C.mint,fontWeight:700}}>52H</span></div>:null; })()}
          {stk?.lo52&&(()=>{ const pct2=(padT+(1-(stk.lo52-mn)/rng)*(HCHART-padT-4))/CHART_H_PX*100; return pct2>0&&pct2<100?<div style={{position:"absolute",top:`${pct2}%`,left:4,transform:"translateY(-50%)"}}><span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:8,color:C.coral,fontWeight:700}}>52L</span></div>:null; })()}
          <div style={{ position:"absolute", top:`${(HCHART/CHART_H_PX)*100+2}%`, left:4 }}>
            <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:8, color:C.smoke, opacity:0.6, display:"block" }}>VOL</span>
            <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:7.5, color:C.smoke, opacity:0.45, display:"block" }}>{(maxVol/1e6).toFixed(0)}م</span>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:6, padding:"3px 8px 4px", flexWrap:"wrap", alignItems:"center", borderTop:`1px solid ${C.line}33`, background:C.ink }}>
        {[
          {lbl:"VWAP",clr:C.amber,dash:"5,3"},
          {lbl:"MA20",clr:C.electric,dash:""},
          {lbl:"MA50",clr:C.plasma,dash:""},
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



// ─── ScoreDrawer -- popup مركزي ────────────────────────────────────
function ScoreDrawer({ item, color, onClose }) {
  if (!item) return null;
  const col = color || item?.color || C.electric;
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
        <div style={{ fontSize:12, color:C.mist, lineHeight:1.75, marginBottom:12 }}>{item.tip}</div>
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
  const isBottom = idx >= 2;
  const popSide = idx % 2 === 0 ? { right:0, left:"auto" } : { left:0, right:"auto" };
  return (
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
  const cardRef = useRef(null);

  const openInfo = (ax) => {
    setDrawerItem(ax);
  };

  const labelCol = (label) =>
    label==="ممتاز"?C.mint:label==="جيد"?C.mint:label==="مقبول"?C.amber:
    label==="معقول"?C.amber:label==="مرتفع"?C.coral:
    label==="ضعيف"||label==="غالي"||label==="خطر"||label==="منخفض"||label==="سلبي"?C.coral:C.smoke;

const getLabel = (metric, val) => {
    if(val==null) return "--";
    if(metric==="pe")     return val<10?"رخيص جداً":val<20?"معقول":val<30?"مرتفع":"غالي";
    if(metric==="growth") return val>20?"ممتاز":val>10?"جيد":val>5?"مقبول":val>0?"ضعيف":"سلبي";
    if(metric==="margin") return val>25?"ممتاز":val>15?"جيد":val>5?"مقبول":"ضعيف";
    if(metric==="cr")     return val>2?"ممتاز":val>1.5?"جيد":val>1?"مقبول":"خطر";
    if(metric==="de")     return val<0.5?"ممتاز":val<1.0?"جيد":val<2.0?"مقبول":"ضعيف";
    if(metric==="div")    return val>5?"ممتاز":val>3?"جيد":val>1?"مقبول":"منخفض";
    if(metric==="pct")    return val>5?"ممتاز":val>0?"جيد":val>-5?"مقبول":"ضعيف";
    return "--";
  };

  const axesDefs = [
    { l:"القيمة",  col:C.electric, key:"pe",
      raw: stk.pe ? stk.pe+"x" : "-",
      label: getLabel("pe", stk.pe),
      tip:"P/E -- مكرر الربحية. الأقل = قيمة أفضل.",
      ranges:"أقل من 10 = رخيص جداً | 10-20 = معقول | 20-30 = مرتفع | أكثر من 30 = غالي",
      v: Math.min(100,Math.max(0, stk.pe ? Math.round(Math.max(0,100-(stk.pe/40)*100)) : scores?.valScore||60)) },
    { l:"النمو",   col:C.mint, key:"growth",
      raw: stk.growthYoY!=null ? stk.growthYoY+"%" : "-",
      label: getLabel("growth", stk.growthYoY),
      tip:"نمو الإيرادات سنوياً (YoY). الأعلى أفضل.",
      ranges:"أكثر من 20% = ممتاز | 10-20% = جيد | 5-10% = مقبول | 0-5% = ضعيف | سلبي = صفر",
      v: Math.min(100,Math.max(0, stk.growthYoY!=null ? Math.round(Math.min(100,Math.max(0,stk.growthYoY)*5)) : scores?.growthScore||55)) },
    { l:"الربحية", col:C.plasma, key:"margin",
      raw: stk.netMargin!=null ? stk.netMargin+"%" : "-",
      label: getLabel("margin", stk.netMargin),
      tip:"هامش الربح الصافي. الأعلى أفضل.",
      ranges:"أكثر من 25% = ممتاز | 15-25% = جيد | 5-15% = مقبول | أقل من 5% = ضعيف",
      v: Math.min(100,Math.max(0, stk.netMargin ? Math.round(Math.min(100,stk.netMargin*3.3)) : scores?.profitScore||70)) },
{ l:"الصحة",  col:C.teal, key:"cr",
  raw: stk.debtEquity!=null ? stk.debtEquity.toFixed(2)+"x" : (stk.currentRatio!=null ? stk.currentRatio+"x" : "-"),
  label: stk.debtEquity!=null ? getLabel("de", stk.debtEquity) : getLabel("cr", stk.currentRatio),
  tip:"نسبة الدين إلى حقوق الملكية (Debt-to-Equity). الأقل أفضل -- تقيس مدى اعتماد الشركة على الديون.",
  ranges:"أقل من 0.5 = ممتاز | 0.5-1.0 = جيد | 1.0-2.0 = مقبول | أكثر من 2.0 = ضعيف",
  v: Math.min(100,Math.max(0, stk.debtEquity!=null ? Math.round(Math.max(0,100-stk.debtEquity*40)) : scores?.debtScore!=null ? scores.debtScore : 0)) },

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
      <SectionCard title="تقييم شامل -- Snowflake" accent={C.plasma}>
        <div ref={cardRef} style={{ padding:"10px 16px", direction:"ltr" }}>
          <div style={{display:"flex", flexDirection:"row", alignItems:"center", gap:12}}>
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
      <SectionCard title="الصحة المالية -- درجات متعددة المعايير" accent={C.mint}>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              {l:"ألتمان Z",           eng:"Altman Z-Score",    v:scores.altmanZ,   max:5,   note:scores.altmanZ>=3?"منطقة آمنة":scores.altmanZ>=2?"رمادي":"خطر",       color:scores.altmanZ>=3?C.mint:scores.altmanZ>=2?C.amber:C.coral,
                tip:"يقيس احتمالية الإفلاس. ≥3 آمن، 1.8-3 رمادي، <1.8 خطر."},
              {l:"بيوتروسكي F",        eng:"Piotroski F-Score", v:scores.piotroski, max:9,   note:scores.piotroski>=7?"جودة عالية":scores.piotroski>=5?"متوسط":"ضعيف", color:scores.piotroski>=7?C.mint:scores.piotroski>=5?C.amber:C.coral,
                tip:"يقيس جودة الأرباح والقوة المالية من 9 نقاط. 7-9 ممتاز، 4-6 متوسط، 0-3 ضعيف."},
              {l:"نقاط التدفق النقدي", eng:"Cash Score",        v:scores.cashScore, max:100, note:scoreLabel(scores.cashScore), color:scoreColor(scores.cashScore),
                tip:"يقيس قوة التدفق النقدي من 100 نقطة. ≥75 قوي، 50-74 متوسط، <50 ضعيف."},
              {l:"بينيش M",            eng:"Beneish M-Score",   v:scores.beneish,   max:null, note:scores.beneish==null?"غير متاح":scores.beneish<-2.22?"لا تلاعب":"مراقبة", color:scores.beneish==null?C.smoke:scores.beneish<-2.22?C.mint:C.amber, isNeg:true,
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

// ─── PerDropdown ─────────────────────────────────────────────────
function PerDropdown({ per, setPer }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const labels = {"1H":"ساعي","1D":"يوم","1W":"أسبوع","1M":"شهر","3M":"3 أشهر","6M":"6 أشهر","1Y":"سنة"};

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
            {["1H","1D","1W","1M","3M","6M","1Y"].map(p2=>(

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

// ─── SDOverview ───────────────────────────────────────────────────
function SDOverview({ stk, per, setPer, onNav, onExpand }) {
  const isIndex = stk?.sym === 'TASI';
  const [chartType, setChartType] = useState("شموع");
  const [showMore, setShowMore] = useState(false);
  const scores = stk.finScores || FIN_SCORES[stk.sym] || FIN_SCORES.default;

  // فترة افتراضية إذا لم تكن متوفرة من props
  const [internalPer, setInternalPer] = useState("3M");
  const effPer = per || internalPer;
  const effSetPer = setPer || setInternalPer;

const est = stk.analystsData || (ANALYST_EST ? (ANALYST_EST[stk.sym] || ANALYST_EST.default) : {});
const banks = [];

  const peers  = PEERS[stk.sym] || PEERS.default;

  const rng = (stk.hi52 || stk.p*1.1) - (stk.lo52 || stk.p*0.9) || 1;
  const pos52 = Math.min(100, Math.max(0, ((stk.p-(stk.lo52||stk.p*0.9))/rng)*100));
  const dayRng = (stk.dayHi||stk.p) - (stk.dayLo||stk.p) || 1;
  const dayPos = Math.min(100, Math.max(0, ((stk.p-(stk.dayLo||stk.p))/dayRng)*100));

  const tot = (est.buy||0)+(est.hold||0)+(est.sell||0);
  const buyP  = tot?Math.round((est.buy /tot)*100):0;
  const holdP = tot?Math.round((est.hold/tot)*100):0;
  const sellP = tot?Math.round((est.sell/tot)*100):0;
  const aColor = buyP>50?C.mint:sellP>50?C.coral:C.amber;

  const scoreColor = s => s>=75?C.mint:s>=50?C.amber:C.coral;
  const scoreLabel = s => s>=75?"قوي":s>=50?"متوسط":"ضعيف";

    const statRowsMain = [
    {section:"السعر والتداول"},
    {l:"مدى يومي", v: stk.dayHi&&stk.dayLo ? `${stk.dayLo} - ${stk.dayHi}` : "--"},
    {l:"نطاق 52 أسبوعاً", v: stk.hi52&&stk.lo52 ? `${stk.lo52} - ${stk.hi52}` : "--"},
    {l:"القيمة السوقية", v: stk.mc || "--"},
    {l:"طلب/عرض", v: stk.bid&&stk.ask ? `${stk.bid} / ${stk.ask}` : "--"},
    {l:"الحجم", v: stk.v ? (stk.v/1e6).toFixed(1)+"م" : "--"},
    {l:"الإغلاق السابق", v: stk.prev ? stk.prev.toFixed(2) : "--"},
    {l:"سعر الفتح", v: stk.o ? stk.o.toFixed(2) : "--"},
    {section:"التقييم"},
    {l:"مكررات الأرباح (P/E)", v: stk.pe ? stk.pe.toFixed(2)+"x" : "--"},
    {l:"ربحية السهم EPS", v: stk.eps ? stk.eps.toFixed(2)+" ر.س" : "--"},
    {l:"القيمة الدفترية/السهم", v: stk.bvps ? stk.bvps.toFixed(2)+" ر.س" : "--"},
    {l:"بيتا", v: stk.beta ? stk.beta.toFixed(2) : "--"},
  ];

  const statRowsExtra = [
    {section:"مضاعفات إضافية"},
    {l:"مضاعف الأرباح المتوقع (Forward P/E)", v: stk.forwardPE ? stk.forwardPE.toFixed(2)+"x" : "--"},
    {l:"السعر/القيمة الدفترية (P/B)", v: stk.pb ? stk.pb.toFixed(2)+"x" : "--"},
    {l:"السعر/المبيعات (P/S)", v: stk.ps ? stk.ps.toFixed(2)+"x" : "--"},
    {l:"PEG", v: stk.peg ? stk.peg.toFixed(2) : "--"},
    {section:"العوائد"},
    {l:"العائد على حقوق الملكية (ROE)", v: stk.roe!=null ? stk.roe+"%" : "--"},
    {l:"العائد على الأصول (ROA)", v: stk.roa!=null ? stk.roa+"%" : "--"},
    {l:"العائد على رأس المال (ROIC)", v: stk.roic!=null ? stk.roic+"%" : "--"},
    {section:"الهوامش"},
    {l:"الهامش التشغيلي", v: stk.opMargin!=null ? stk.opMargin+"%" : "--"},
    {l:"الهامش الصافي", v: stk.netMargin!=null ? stk.netMargin+"%" : "--"},
    {section:"المديونية والسيولة"},
    {l:"الدين/حقوق الملكية", v: stk.debtEquity!=null ? stk.debtEquity+"x" : "--"},
    {section:"التوزيعات"},
    {l:"عائد التوزيعات", v: stk.divYld!=null ? stk.divYld+"%" : "--"},
    {l:"آخر توزيع", v: stk.lastDiv ? stk.lastDiv+" ر.س" : "--"},
    {section:"الأسهم"},
    {l:"الأسهم القائمة", v: stk.sharesOut ? (stk.sharesOut/1e6).toFixed(0)+"م" : "--"},
    {l:"الأسهم الحرة", v: stk.floatPct!=null ? stk.floatPct+"%" : "--"},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0 }}>

      {/* الشارت */}
      <div style={{ marginBottom:10 }}>
        <div style={{ borderRadius:"16px 16px 0 0", overflow:"hidden", border:`1px solid ${C.line}`, borderBottom:"none" }}>
          <ChartLoader sym={stk.sym} base={stk.p} per={effPer} chartType={chartType} stk={stk} onExpand={onExpand}/>
        </div>
        <div style={{ background:`linear-gradient(160deg,${C.layer2},${C.deep})`, border:`1px solid ${C.line}`, borderTop:"none", borderRadius:"0 0 16px 16px", padding:"4px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:`inset 0 1px 0 ${C.layer3}` }}>
          <PerDropdown per={effPer} setPer={effSetPer}/>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
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
      {stk.dayHi && stk.dayLo && (
        <SectionCard>
          <div style={{ padding:"12px 16px" }}>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5, marginBottom:7, textTransform:"uppercase", letterSpacing:"0.7px" }}>{"النطاق اليومي"}</div>
            <div style={{ position:"relative", height:4, background:C.layer3, borderRadius:2, margin:"0 4px" }}>
              <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg,${C.coral},${C.amber},${C.mint})`, borderRadius:2 }}/>
              <div style={{ position:"absolute", top:"50%", left:`${dayPos}%`, transform:"translate(-50%,-50%)", width:10, height:10, borderRadius:"50%", background:C.snow, boxShadow:`0 0 6px ${C.snow}77` }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11 }}>
              <span style={{ color:C.mint, fontFamily:"IBM Plex Mono,monospace" }}>{stk.dayHi} ر.س</span>
              <span style={{ color:C.coral, fontFamily:"IBM Plex Mono,monospace" }}>{stk.dayLo} ر.س</span>
            </div>
          </div>
        </SectionCard>
      )}

      {stk.hi52 && stk.lo52 && (
        <SectionCard>
          <div style={{ padding:"12px 16px" }}>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5, marginBottom:7, textTransform:"uppercase", letterSpacing:"0.7px" }}>{"نطاق 52 أسبوع"}</div>
            <div style={{ position:"relative", height:4, background:C.layer3, borderRadius:2, margin:"0 4px" }}>
              <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg,${C.coral},${C.amber},${C.mint})`, borderRadius:2 }}/>
              <div style={{ position:"absolute", top:"50%", left:`${pos52}%`, transform:"translate(-50%,-50%)", width:10, height:10, borderRadius:"50%", background:C.snow, boxShadow:`0 0 6px ${C.snow}77` }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11 }}>
              <span style={{ color:C.mint, fontFamily:"IBM Plex Mono,monospace" }}>{stk.hi52} ر.س</span>
              <span style={{ color:C.coral, fontFamily:"IBM Plex Mono,monospace" }}>{stk.lo52} ر.س</span>
            </div>
          </div>
        </SectionCard>
      )}

      {/* الإحصائيات -- لا تُعرض لمؤشر تاسي (خاصة بشركة فردية) */}
      {!isIndex && (
      <SectionCard title="الإحصائيات الشاملة" accent={C.electric}>
                {statRowsMain.map((row, i) => {
          if (row.section) return <Row key={i} section={row.section}/>;
          return (
            <Row
              key={i}
              label={row.l}
              value={row.v}
              sub={row.sub}
              color={
                row.l && row.l.includes("توزيع") ? C.gold :
                row.l && row.l.includes("هامش") ? C.mint :
                row.l && row.l.includes("دين") ? C.coralL :
                C.mist
              }
              even={i % 2 === 0}
            />
          );
        })}
                {showMore && statRowsExtra.map((row, i) => {
          if (row.section) return <Row key={"e" + i} section={row.section}/>;
          return (
            <Row
              key={"e" + i}
              label={row.l}
              value={row.v}
              sub={row.sub}
              color={
                row.l && row.l.includes("توزيع") ? C.gold :
                row.l && row.l.includes("هامش") ? C.mint :
                row.l && row.l.includes("دين") ? C.coralL :
                C.mist
              }
              even={i % 2 === 0}
            />
          );
        })}
        <button onClick={()=>setShowMore(v=>!v)} style={{display:"flex",width:"100%",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",background:`${C.electric}08`,cursor:"pointer",border:"none",borderTop:`1px solid ${C.line}33`,minHeight:44}}>
          <span style={{fontSize:11,color:C.electric,fontWeight:700}}>{showMore?"اظهار أقل":"اظهار المزيد ("+statRowsExtra.length+" حقل إضافي)"}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5">{showMore?<polyline points="18 15 12 9 6 15"/>:<polyline points="6 9 12 15 18 9"/>}</svg>
        </button>
      </SectionCard>
      )}

      {/* السعر العادل من Sahmk -- لا يُعرض لمؤشر تاسي */}
      {!isIndex && stk.fairPrice && (
        <SectionCard title="السعر العادل -- SAHMK AI" accent={C.gold}>
          <div style={{ padding:"12px 14px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div style={{ background:C.gold+"12", borderRadius:10, padding:"10px", textAlign:"center", border:`1px solid ${C.gold}33` }}>
                <div style={{ fontSize:10, color:C.smoke, marginBottom:4 }}>السعر العادل</div>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:18, fontWeight:900, color:C.gold }}>
                  {stk.fairPrice} ر.س
                </div>
              </div>
              <div style={{
                background: stk.p && stk.fairPrice > stk.p ? C.mint+"12" : C.coral+"12",
                borderRadius:10, padding:"10px", textAlign:"center",
                border:`1px solid ${stk.p && stk.fairPrice > stk.p ? C.mint : C.coral}33`,
              }}>
                <div style={{ fontSize:10, color:C.smoke, marginBottom:4 }}>الفرصة</div>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:18, fontWeight:900,
                  color: stk.p && stk.fairPrice > stk.p ? C.mint : C.coral }}>
                  {stk.p ? ((stk.fairPrice - stk.p) / stk.p * 100).toFixed(1) : "--"}%
                </div>
              </div>
            </div>
            {stk.fairConfidence && (
              <div style={{ marginTop:8, fontSize:10, color:C.smoke, textAlign:"center" }}>
                مستوى الثقة: {Math.round(stk.fairConfidence * 100)}%
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* درجات الصحة المالية -- لا تُعرض لمؤشر تاسي */}
      {!isIndex && <HealthScores scores={scores} scoreLabel={scoreLabel} scoreColor={scoreColor}/>}

      {/* Snowflake -- لا يُعرض لمؤشر تاسي */}
      {!isIndex && <SnowflakeCard stk={stk} scores={scores}/>}

      {/* تقييمات المحللين -- لا تُعرض لمؤشر تاسي */}
      {!isIndex && (
      <SectionCard title="تقييمات المحللين" accent={aColor} badge={banks.length>0?{text:banks.length+" بنك",color:C.electric}:null}>

        <div style={{ padding:"8px 16px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div style={{ fontSize:10, color:C.smoke, lineHeight:1.5 }}>
  {est?.numAnalysts > 0 ? `✓ ${est.numAnalysts} محلل -- SAHMK` : "بيانات المحللين من SAHMK"}
</div>
        </div>
        <div style={{ padding:"14px 16px" }}>
          {tot > 0 ? (
            <>
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
                    <span style={{ fontSize:11, color:C.smoke }}>الهدف الوسيط</span>
                    <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:18, fontWeight:900, color:C.snow }}>{est.targetPrice} <span style={{ fontSize:11, color:C.smoke }}>ر.س</span></span>
                  </div>
                </div>
              )}
              {banks.map((b,i) => {
                const ratingCol = b.rating==="شراء"?C.mint:b.rating==="بيع"?C.coral:b.rating==="احتفاظ"?C.amber:C.smoke;
                return (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<banks.length-1?`1px solid ${C.line}22`:0 }}>
                    <div>
                      <div style={{ fontSize:11, color:C.mist, fontWeight:600 }}>{b.bank}</div>
                      {b.date && <div style={{ fontSize:9, color:C.smoke }}>{b.date}</div>}
                    </div>
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <Tag text={b.rating} color={ratingCol}/>
                      {b.target && (
                        <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.snow, fontWeight:700 }}>{b.target}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
<EmptyState
  icon="📊"
  title="بيانات المحللين غير متوفرة"
  subtitle="لا توجد تقييمات محللين لهذا السهم حالياً"
/>
          )}
        </div>
      </SectionCard>
      )}

      {/* مقارنة الأقران -- لا تُعرض لمؤشر تاسي */}
      {!isIndex && peers.length > 0 && (
        <SectionCard title="مقارنة بأقران القطاع" accent={C.teal}>
          <div style={{ overflowX:"auto" }}>
            <div style={{ minWidth:480 }}>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:0, padding:"8px 16px", background:C.layer3, borderBottom:`1px solid ${C.line}44` }}>
                {["الشركة","مضاعف الأرباح","السعر/الدفترية","ROE%","توزيع%","هامش إج%"].map((h,i)=><span key={i} style={{ fontSize:11, color:C.smoke, fontWeight:700, textAlign:i>0?"center":"right" }}>{h}</span>)}
              </div>
              {peers.map((peer,i)=>(
                <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr", gap:0, padding:"10px 16px", borderBottom:i<peers.length-1?`1px solid ${C.line}22`:0, background:peer.isCurrent?`${C.electric}08`:i%2===0?"transparent":"rgba(255,255,255,.015)", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:peer.isCurrent?800:600, color:peer.isCurrent?C.electric:C.mist }}>{peer.name}</div>
                    <div style={{ fontSize:11, color:C.smoke }}>{peer.sym} · {peer.pct>=0?"+":""}{peer.pct}%</div>
                  </div>
                  {[peer.pe,peer.pb,peer.roe,peer.divYld,peer.grossM].map((v,j)=>(
                    <div key={j} style={{ textAlign:"center" }}>
                      <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:peer.isCurrent?800:500, color:peer.isCurrent?C.electric:C.smoke }}>{v ?? "--"}{j>=2?"%":"x"}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────
export {
  ChartLoader, CChart,
  ScoreDrawer, ScoreCard, MiniScoreCard, SnowflakeCard,
  HealthScores, PerDropdown, SDOverview,
};
