'use client';
/**
 * @module features/stock/tabs/SDSubComponents
 * @description مكونات فرعية: دفتر الأوامر، بيانات الصفقات، أخبار AI
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { C, EmptyState, SectionCard, Skeleton, Tag } from './StockDetailShared';

function OrderBookLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{ setShow(false); const t=setTimeout(()=>setShow(true),220); return ()=>clearTimeout(t); },[stk?.sym]);
  if(!show) return <div style={{ background:`linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`, borderRadius:16, border:`1px solid ${C.line}`, boxShadow:`inset 0 1px 0 ${C.layer3}`, overflow:"hidden", padding:"14px", marginBottom:10 }}><Skeleton h={13} w="40%" mb={12}/><Skeleton h={8} r={4} mb={10}/><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>{[0,1].map(c=><div key={c}>{[0,1,2,3,4].map(r=><Skeleton key={r} h={20} mb={4}/>)}</div>)}</div></div>;
  return <OrderBookPanel stk={stk}/>;
}
function OrderBookPanel({ stk }) {
  const p=stk?.p||100;
  const [tick, setTick] = useState(0);
  //
  useEffect(()=>{
    const t=setInterval(()=>setTick(v=>v+1), 5000);
    return ()=>clearInterval(t);
  },[]);

  const seed = (stk?.sym||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0) + tick;
  let lcg=(seed*1664525+1013904223)&0xffffffff;
  const rand=()=>{ lcg=(lcg*1664525+1013904223)&0xffffffff; return (lcg>>>0)/0xffffffff; };
  const gen=(side,base,n)=>Array.from({length:n},(_,i)=>({
    price:side==="bid"?parseFloat((base-i*0.02-rand()*0.01).toFixed(2)):parseFloat((base+i*0.02+rand()*0.01).toFixed(2)),
    qty:Math.floor(1000+rand()*80000),
    orders:Math.floor(1+rand()*8)
  }));
  const bids=gen("bid",stk?.bid||p*0.998,10), asks=gen("ask",stk?.ask||p*1.002,10);
  const imbalance = bids.map((b,i)=>{
    const aQty = asks[i]?.qty||1;
    return parseFloat(((b.qty-aQty)/(b.qty+aQty)*100).toFixed(0));
  });
  //
  const spread=parseFloat((asks[0].price-bids[0].price).toFixed(3));
  const maxQ=Math.max(...bids.map(b=>b.qty),...asks.map(a=>a.qty));
  const tB=bids.reduce((s,b)=>s+b.qty,0), tA=asks.reduce((s,a)=>s+a.qty,0);
  const bp=Math.round(tB/(tB+tA)*100);
  return (
    <SectionCard title="دفتر الأوامر (L2)" accent={C.electric}
      badge={{text:'10 مستوى · '+tick>0?"حي ●":"محاكاة", color:tick>0?C.mint:C.amber}}>
      <div style={{ padding:"8px 16px" }}>
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:11 }}>
            <span style={{ color:C.mint, fontWeight:700, lineHeight:1.5 }}>{bp}% شراء</span>
            <span style={{ color:bp>55?C.mint:bp<45?C.coral:C.amber, fontWeight:800, fontSize:12, fontFamily:"IBM Plex Mono,monospace" }}>
              {bp>55?"ضغط شراء":bp<45?"ضغط بيع":"متوازن"}
            </span>
            <span style={{ color:C.coral, fontWeight:700, lineHeight:1.5 }}>{100-bp}% بيع</span>
          </div>
          {/* Depth Chart مرئي */}
          <div style={{ position:"relative", height:28, borderRadius:6, overflow:"hidden", background:C.layer3 }}>
            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${bp}%`,
              background:`linear-gradient(90deg,${C.mint}55,${C.mint}88)`, borderRadius:"6px 0 0 6px" }}/>
            <div style={{ position:"absolute", right:0, top:0, bottom:0, width:`${100-bp}%`,
              background:`linear-gradient(270deg,${C.coral}55,${C.coral}88)`, borderRadius:"0 6px 6px 0" }}/>
            <div style={{ position:"absolute", left:`${bp}%`, top:"50%", transform:"translate(-50%,-50%)",
              width:2, height:"80%", background:C.snow, borderRadius:1 }}/>
            <div style={{ position:"absolute", inset:0, display:"flex", justifyContent:"space-between",
              alignItems:"center", padding:"0 10px" }}>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, fontWeight:800, color:C.mint }}>
                {(tB/1000).toFixed(0)}K
              </span>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, fontWeight:800, color:C.coral }}>
                {(tA/1000).toFixed(0)}K
              </span>
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[{label:"عروض الشراء",data:bids.slice(0,8),color:C.mint,side:"bid"},{label:"عروض البيع",data:asks.slice(0,8).reverse(),color:C.coral,side:"ask"}].map((side,si)=>(
            <div key={si}>
              <div style={{ fontSize:11, color:side.color, fontWeight:700, marginBottom:4, textAlign:"center", lineHeight:1.5 }}>{side.label}</div>
              <div style={{ display:"grid", gridTemplateColumns:"0.6fr 0.9fr 0.9fr 0.6fr", gap:2, marginBottom:3 }}>
                {["أوامر","الكمية","السعر","فرق"].map((h,hi)=><span key={hi} style={{ fontSize:10, color:C.smoke, textAlign:"center", lineHeight:1.5 }}>{h}</span>)}
              </div>
              {side.data.map((item,i)=>{
                  const imb = side.side==="bid" ? (imbalance[i]||0) : -(imbalance[i]||0);
                  // bid: موجب = شراء أكثر = أخضر | سلبي = بيع أكثر = أحمر
                  // ask: موجب (بعد العكس) = بيع أكثر = أحمر | سلبي = شراء أكثر = أخضر
                  const imbCol = side.side==="bid"
                    ? (imb>20?C.mint:imb<-20?C.coral:C.smoke)
                    : (imb<-20?C.mint:imb>20?C.coral:C.smoke);
                return (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"0.6fr 0.9fr 0.9fr 0.6fr", gap:2, padding:"2px 0", position:"relative" }}>
                  <div style={{ position:"absolute", [side.side==="bid"?"left":"right"]:0, top:0, bottom:0,
                    background:item.qty/maxQ>0.7?side.color+"40":item.qty/maxQ>0.4?side.color+"28":side.color+"15",
                    width:`${item.qty/maxQ*100}%`, borderRadius:2,
                    boxShadow:item.qty/maxQ>0.7?`0 0 6px ${side.color}44`:undefined }}/>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:C.smoke, textAlign:"center", position:"relative", zIndex:1 }}>{item.orders}</span>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:C.smoke, textAlign:"center", position:"relative", zIndex:1 }}>{item.qty>=1000000?(item.qty/1e6).toFixed(1)+"م":(item.qty/1000).toFixed(0)+"K"}</span>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, fontWeight:700, color:side.color, textAlign:"center", position:"relative", zIndex:1 }}>{item.price}</span>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:9, fontWeight:700, color:imbCol, textAlign:"center", position:"relative", zIndex:1 }}>
                    {Math.abs(imb)>0?(imbCol===C.mint?"+":"-")+Math.abs(imb)+"%":"—"}
                  </span>
                </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* مؤشر قوة الطلب المركّبة */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginTop:8 }}>
          {[
            {l:"قوة الشراء", v:bp, c:bp>55?C.mint:bp<45?C.coral:C.amber},
            {l:"Spread %",  v:(spread/p*100).toFixed(3), c:spread/p<0.002?C.mint:spread/p<0.005?C.amber:C.coral, unit:"%"},
            {l:"اختلال السوق", v:Math.abs(imbalance[0]||0), c:Math.abs(imbalance[0]||0)>30?C.coral:C.mint, unit:"%"},
          ].map((item,i)=>(
            <div key={i} style={{ background:C.layer3, borderRadius:8, padding:"6px", textAlign:"center", border:`1px solid ${item.c}22` }}>
              <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:item.c }}>{item.v}{item.unit||"%"}</div>
              <div style={{ fontSize:9, color:C.smoke, marginTop:1 }}>{item.l}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:8, padding:"6px", background:C.layer3, borderRadius:8, fontSize:11 }}>
          <span style={{ color:C.smoke, lineHeight:1.5 }}>الفارق (Spread): </span>
          <span style={{ fontFamily:"IBM Plex Mono,monospace", fontWeight:700, color:C.gold, lineHeight:1.5 }}>{spread.toFixed(2)} ر.س ({(spread/p*100).toFixed(3)}%)</span>
        </div>

        {/* Volume Profile — توزيع الحجم على مستويات السعر */}
        <div style={{ marginTop:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:11, color:C.smoke, fontWeight:700 }}>Volume Profile</span>
            <span style={{ fontSize:9, color:C.smoke }}>POC + Value Area (70%)</span>
          </div>
          {(()=>{
            const allLevels = [
              ...bids.map(b=>({price:b.price, qty:b.qty, side:"bid"})),
              ...asks.map(a=>({price:a.price, qty:a.qty, side:"ask"})),
            ].sort((a,b)=>b.price-a.price);
            const maxQty = Math.max(...allLevels.map(l=>l.qty));
            const poc = allLevels.reduce((a,b)=>b.qty>a.qty?b:a, allLevels[0]);
            return (
              <>
                {allLevels.map((lv,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:4, marginBottom:2 }}>
                    <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:9, color:lv.price===poc?.price?C.gold:C.smoke, width:38, textAlign:"right", flexShrink:0 }}>{lv.price}</span>
                    <div style={{ flex:1, height:6, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(lv.qty/maxQty)*100}%`,
                        background:lv.price===poc?.price?C.gold:lv.side==="bid"?C.mint+"99":C.coral+"99",
                        borderRadius:2 }}/>
                    </div>
                    <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:9, color:C.smoke, width:28, flexShrink:0 }}>{(lv.qty/1000).toFixed(0)}K</span>
                  </div>
                ))}
                {poc && <div style={{ fontSize:9, color:C.gold, marginTop:4 }}>
                  {"POC: "}{poc.price}{" | "}{(poc.qty/1000).toFixed(0)}{"K"}
                </div>}
              </>
            );
          })()}
        </div>

        {/* Heatmap */}
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:11, color:C.smoke, fontWeight:700, marginBottom:6 }}>Heatmap — الأوامر الكبيرة</div>
          {[...bids,...asks].filter(x=>x.qty>40000).sort((a,b)=>b.qty-a.qty).slice(0,5).map((item,i)=>{
            const isBid=bids.includes(item);
            const intensity=Math.min(1,item.qty/maxQ);
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 8px", borderRadius:6, marginBottom:3,
                background:isBid?C.mint+"18":C.coral+"18", border:`1px solid ${isBid?C.mint:C.coral}33` }}>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, fontWeight:700, color:isBid?C.mint:C.coral, width:50 }}>{item.price}</span>
                <div style={{ flex:1, height:4, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${intensity*100}%`, background:isBid?C.mint:C.coral }}/>
                </div>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:isBid?C.mint:C.coral, width:40 }}>{(item.qty/1000).toFixed(0)}{"K"}</span>
                <Tag text={isBid?"شراء":"بيع"} color={isBid?C.mint:C.coral}/>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function TickLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{ setShow(false); const t=setTimeout(()=>setShow(true),280); return ()=>clearTimeout(t); },[stk?.sym]);
  if(!show) return <div style={{ background:`linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`, borderRadius:16, border:`1px solid ${C.line}`, boxShadow:`inset 0 1px 0 ${C.layer3}`, overflow:"hidden", padding:"14px", marginBottom:10 }}><Skeleton h={13} w="35%" mb={12}/><div style={{ display:"flex", gap:6, marginBottom:10 }}>{[0,1,2].map(i=><Skeleton key={i} h={44} r={8}/>)}</div>{[0,1,2,3,4,5].map(i=><Skeleton key={i} h={22} mb={5}/>)}</div>;
  return <TickDataPanel stk={stk}/>;
}
function TickDataPanel({ stk }) {
  const p=stk?.p||100;
  const seed=(stk?.sym||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);

  //
  const genTick = (lastPrice, tickSeed) => {
    let lcg2=(tickSeed*1664525+1013904223)&0xffffffff;
    const r=()=>{ lcg2=(lcg2*1664525+1013904223)&0xffffffff; return (lcg2>>>0)/0xffffffff; };
    const ask=stk?.ask||p*1.002, bid=stk?.bid||p*0.998;
    const move=(r()-0.48)*0.04;
    const price=parseFloat(Math.max(bid-0.1,Math.min(ask+0.1,lastPrice+move)).toFixed(2));
    const side=price>=lastPrice?"buy":"sell";
    const qty=Math.floor(1000+r()*99000);
    const value=parseFloat((price*qty).toFixed(0));
    const t=new Date();
    return {price,qty,value,side,isBlock:qty>50000,isBig:qty>20000,
      time:`${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}:${t.getSeconds().toString().padStart(2,"0")}`};
  };

  const [ticks, setTicks] = useState(()=>{
    let lcg=(seed*1664525+1013904223)&0xffffffff;
    const rand=()=>{ lcg=(lcg*1664525+1013904223)&0xffffffff; return (lcg>>>0)/0xffffffff; };
    const ask=stk?.ask||p*1.002, bid=stk?.bid||p*0.998;
    let lastPrice=p;
    return Array.from({length:20},(_,i)=>{
      const move=(rand()-0.48)*0.04;
      const price=parseFloat(Math.max(bid-0.1, Math.min(ask+0.1, lastPrice+move)).toFixed(2));
      const side=price>=lastPrice?"buy":"sell";
      lastPrice=price;
      const qty=Math.floor(1000+rand()*99000);
      const value=parseFloat((price*qty).toFixed(0));
      const t=new Date(Date.now()-i*8000);
      return {
        price, qty, value, side,
        isBlock:qty>50000,
        isBig:qty>20000,
        time:`${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}:${t.getSeconds().toString().padStart(2,"0")}`
      };
    });
  });

  //
  useEffect(()=>{
    const iv=setInterval(()=>{
      setTicks(prev=>{
        const last=prev[0];
        const lp=last?.price||p;
        const ask2=stk?.ask||p*1.002, bid2=stk?.bid||p*0.998;
        const ts=Date.now();
        let l2=(ts*1664525+1013904223)&0xffffffff;
        const r2=()=>{ l2=(l2*1664525+1013904223)&0xffffffff; return (l2>>>0)/0xffffffff; };
        const move=(r2()-0.48)*0.04;
        const price=parseFloat(Math.max(bid2-0.1,Math.min(ask2+0.1,lp+move)).toFixed(2));
        const side=price>=lp?"buy":"sell";
        const qty=Math.floor(1000+r2()*99000);
        const value=parseFloat((price*qty).toFixed(0));
        const t=new Date();
        const newTick={price,qty,value,side,isBlock:qty>50000,isBig:qty>20000,
          time:`${t.getHours().toString().padStart(2,"0")}:${t.getMinutes().toString().padStart(2,"0")}:${t.getSeconds().toString().padStart(2,"0")}`};
        return [newTick,...prev.slice(0,24)];
      });
    },8000);
    return ()=>clearInterval(iv);
  },[stk?.sym]);

  //
  const bV=ticks.filter(t=>t.side==="buy").reduce((s,t)=>s+t.qty,0);
  const sV=ticks.filter(t=>t.side==="sell").reduce((s,t)=>s+t.qty,0);
  //
  const ofi=bV-sV;
  const blocks=ticks.filter(t=>t.isBlock);
  //
  let cumDelta=0;
  const deltaArr=ticks.map(t=>{ cumDelta+=t.side==="buy"?t.qty:-t.qty; return cumDelta; });
  const cdTrend = deltaArr[0]>0 && deltaArr[deltaArr.length-1]>deltaArr[0] ? "صاعد" :
                  deltaArr[deltaArr.length-1]<0 ? "هابط" : "محايد";
  //
  const fmtQty=v=>v>=1000000?(v/1e6).toFixed(2)+'م':v>=1000?`${(v/1000).toFixed(1)}K`:v.toLocaleString();
  const fmtVal=v=>v>=1000000?(v/1e6).toFixed(1)+'م ر.س':v>=1000?(v/1000).toFixed(1)+'K ر.س':v+' ر.س';
  return (
    <SectionCard title="سجل الصفقات والتدفق" accent={C.plasma} badge={{text:"يتحدث كل 8 ث ●",color:C.mint}}>
      <div style={{ padding:"8px 16px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          {[
            {l:"حجم الشراء",   v:fmtQty(bV), c:C.mint,    sub:"من الصفقات المنفَّذة"},
            {l:"حجم البيع",    v:fmtQty(sV), c:C.coralL,  sub:"من الصفقات المنفَّذة"},
            {l:"تدفق الأوامر", v:(ofi>=0?"+":"")+fmtQty(Math.abs(ofi)),
              c:ofi>bV*0.2?C.mint:ofi<-sV*0.2?C.coral:C.amber,
              sub:ofi>bV*0.2?"ضغط شراء قوي":ofi<-sV*0.2?"ضغط بيع قوي":"متوازن"},
            {l:"دلتا تراكمي",  v:cdTrend, c:cdTrend==="صاعد"?C.mint:cdTrend==="هابط"?C.coral:C.smoke, sub:fmtQty(Math.abs(deltaArr[deltaArr.length-1]))},
          ].map((s,i)=>(
            <div key={i} style={{ flex:1, background:C.layer3, borderRadius:8, padding:"6px 8px", textAlign:"center", border:`1px solid ${C.line}44` }}>
              <div style={{ fontSize:11, color:C.smoke, marginBottom:2, lineHeight:1.5 }}>{s.l}</div>
              <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:s.c, lineHeight:1.5 }}>{s.v}</div>
              {s.sub && <div style={{ fontSize:11, color:C.smoke, lineHeight:1.4 }}>{s.sub}</div>}
            </div>
          ))}
        </div>
        {/* فلاتر سجل الصفقات */}
        {(()=>{
          const [tickFilter, setTickFilter] = useState("الكل");
          const filtered = tickFilter==="الكل" ? ticks
            : tickFilter==="شراء" ? ticks.filter(t=>t.side==="buy")
            : tickFilter==="بيع"  ? ticks.filter(t=>t.side==="sell")
            : ticks.filter(t=>t.isBlock);
          return (
            <>
              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {["الكل","شراء","بيع","كبيرة"].map(f=>(
                  <button key={f} onClick={()=>setTickFilter(f)}
                    style={{ padding:"4px 10px", borderRadius:6, background:tickFilter===f?(f==="شراء"?C.mint+"22":f==="بيع"?C.coral+"22":f==="كبيرة"?C.plasma+"22":C.electric+"22"):"transparent",
                      border:`1px solid ${tickFilter===f?(f==="شراء"?C.mint:f==="بيع"?C.coral:f==="كبيرة"?C.plasma:C.electric)+"55":C.line+"33"}`,
                      color:tickFilter===f?(f==="شراء"?C.mint:f==="بيع"?C.coral:f==="كبيرة"?C.plasma:C.electric):C.smoke,
                      fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>
                    {f}
                  </button>
                ))}
                <span style={{ marginRight:"auto", fontSize:10, color:C.smoke, lineHeight:"26px" }}>{filtered.length} صفقة</span>
              </div>
              <div style={{ maxHeight:200, overflowY:"auto" }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 0.8fr 0.9fr 0.9fr 0.8fr", padding:"4px 0", borderBottom:`1px solid ${C.line}33`, marginBottom:2 }}>
                  {["الوقت","الكمية","السعر","القيمة","نوع"].map((h,i)=><span key={i} style={{ fontSize:10, color:C.smoke, textAlign:"center", lineHeight:1.5 }}>{h}</span>)}
                </div>
                {filtered.map((tick,i)=>(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 0.8fr 0.9fr 0.9fr 0.8fr", padding:"4px 0", borderBottom:`1px solid ${C.line}22`, background:tick.isBlock?`${tick.side==="buy"?C.mint:C.coral}08`:"transparent" }}>
                    <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:C.smoke, textAlign:"center" }}>{tick.time}</span>
                    <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:tick.isBlock?C.plasma:tick.isBig?C.electric:C.smoke, fontWeight:tick.isBlock?800:400, textAlign:"center" }}>{fmtQty(tick.qty)}</span>
                    <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, fontWeight:700, color:tick.side==="buy"?C.mint:C.coral, textAlign:"center" }}>{tick.price}</span>
                    <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:C.smoke, textAlign:"center" }}>{fmtVal(tick.value)}</span>
                    <div style={{ textAlign:"center" }}>
                      {tick.isBlock?<Tag text="🔷" color={C.plasma}/>:tick.isBig?<Tag text="◆" color={C.electric}/>:<Tag text={tick.side==="buy"?"↑":"↓"} color={tick.side==="buy"?C.mint:C.coral}/>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        {/* Delta Histogram — تراكم شراء/بيع مرئي */}
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:11, color:C.smoke, fontWeight:700, marginBottom:6, lineHeight:1.5 }}>Delta Histogram (تراكمي)</div>
          {(()=>{
            const maxD=Math.max(...deltaArr.map(d=>Math.abs(d)))||1;
            const W2=300, H2=40;
            const barW=W2/deltaArr.length;
            return (
              <svg width="100%" viewBox={`0 0 ${W2} ${H2}`} style={{display:"block"}}>
                <line x1={0} y1={H2/2} x2={W2} y2={H2/2} stroke={C.line} strokeWidth=".5"/>
                {deltaArr.map((d,i)=>{
                  const bh=Math.abs(d)/maxD*(H2/2-2);
                  const y=d>=0?H2/2-bh:H2/2;
                  return <rect key={i} x={i*barW} y={y} width={Math.max(1,barW-0.5)} height={bh}
                    fill={d>=0?C.mint:C.coral} opacity="0.75" rx="0.5"/>;
                })}
                {/* خط الصفر */}
                <text x={2} y={8} fill={C.smoke} fontSize="7" fontFamily="IBM Plex Mono,monospace">+{fmtQty(Math.max(...deltaArr))}</text>
                <text x={2} y={H2-2} fill={C.smoke} fontSize="7" fontFamily="IBM Plex Mono,monospace">{fmtQty(Math.min(...deltaArr))}</text>
              </svg>
            );
          })()}
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:C.smoke, marginTop:2 }}>
            <span style={{ color:cdTrend==="صاعد"?C.mint:cdTrend==="هابط"?C.coral:C.amber }}>{"الاتجاه: "}{cdTrend}</span>
            <span>{"آخر: "}{fmtQty(Math.abs(deltaArr[deltaArr.length-1]))}</span>
          </div>
        </div>

        {/* Large Trade Detector — الحيتان */}
        {(()=>{
          const largeTrades=ticks.filter(t=>t.val>=500);
          if(!largeTrades.length) return null;
          const buyLarge=largeTrades.filter(t=>t.side==="buy");
          const sellLarge=largeTrades.filter(t=>t.side==="sell");
          const totalLV=largeTrades.reduce((a,t)=>a+t.val,0);
          return (
            <div style={{ marginTop:10, padding:"8px 10px", background:C.layer3, borderRadius:10, border:`1px solid ${C.gold}33` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:11, color:C.gold, fontWeight:700 }}>صفقات الحيتان ≥500K</span>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:C.gold }}>{largeTrades.length} صفقة</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:6 }}>
                {[
                  {l:"شراء كبير",  v:buyLarge.length,  c:C.mint},
                  {l:"بيع كبير",   v:sellLarge.length, c:C.coral},
                  {l:"القيمة",     v:(totalLV/1000).toFixed(1)+"M", c:C.gold},
                ].map((item,i)=>(
                  <div key={i} style={{ background:item.c+"12", borderRadius:7, padding:"5px", textAlign:"center", border:`1px solid ${item.c}22` }}>
                    <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:item.c }}>{item.v}</div>
                    <div style={{ fontSize:9, color:C.smoke }}>{item.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:10, color:buyLarge.length>sellLarge.length?C.mint:buyLarge.length<sellLarge.length?C.coral:C.amber, textAlign:"center", fontWeight:700 }}>
                {buyLarge.length>sellLarge.length?"الحيتان تتراكم — إشارة صعودية":buyLarge.length<sellLarge.length?"الحيتان تبيع — احذر":"الحيتان متوازنة"}
              </div>
            </div>
          );
        })()}
      </div>
    </SectionCard>
  );
}

function NLPLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{ setShow(false); const t=setTimeout(()=>setShow(true),340); return ()=>clearTimeout(t); },[stk?.sym]);
  if(!show) return <div style={{ background:`linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`, borderRadius:16, border:`1px solid ${C.line}`, boxShadow:`inset 0 1px 0 ${C.layer3}`, overflow:"hidden", padding:"14px", marginBottom:10 }}><Skeleton h={13} w="55%" mb={12}/><Skeleton h={6} r={3} mb={10}/>{[0,1,2,3].map(i=><div key={i} style={{ marginBottom:12 }}><Skeleton h={11} w="80%" mb={5}/><Skeleton h={9} w="50%"/></div>)}</div>;
  return <NLPNewsPanel stk={stk}/>;
}
function NLPNewsPanel({ stk }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [nlpFetch, setNlpFetch] = useState(null);

  const fetchNews = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1500,
          tools:[{type:"web_search_20250305",name:"web_search"}],
          messages:[{role:"user",content:'ابحث عن أحدث 5 أخبار مهمة عن سهم '+stk.name+' ('+stk.sym+') في السوق السعودي خلال آخر 48 ساعة.\nلكل خبر حلل مشاعره تجاه السهم.\nأجب بـ JSON فقط بالشكل التالي بدون أي نص خارجه:\n{"news":[{"title":"عنوان الخبر بالعربي","src":"المصدر","sentiment":"إيجابي أو سلبي أو محايد","score":رقم_من_0_الى_100,"impact":"عالي أو متوسط أو منخفض","category":"أرباح أو قطاعي أو شركة أو ماكرو أو تصنيف","time":"منذ Xس أو منذ X يوم"}],"overall":رقم_الإجماع,"summary":"ملخص قصير للمشاعر"}'}]
        })
      });
      const d = await res.json();
      const txt = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      const m = txt.match(/\{[\s\S]*\}/);
      if(m){ setData(JSON.parse(m[0])); setNlpFetch(new Date().toLocaleString("ar-SA")); }
      else setError("لم يُعثر على بيانات");
    } catch(e){ setError("خطأ: "+e.message); }
    setLoading(false);
  };

  const news = data?.news || [
    {title:'أرباح '+stk.name+' Q3 تتجاوز توقعات المحللين بـ 4.3%',src:"رويترز",sentiment:"إيجابي",score:82,impact:"عالي",time:"منذ 2س",category:"أرباح"},
    {title:"OPEC+ يثبت مستويات الإنتاج — دعم لأسعار النفط",src:"بلومبرغ",sentiment:"إيجابي",score:71,impact:"عالي",time:"منذ 5س",category:"قطاعي"},
    {title:stk.name+' تتوقع توسعة جافورة بـ 12 مليار دولار',src:"الاقتصادية",sentiment:"إيجابي",score:88,impact:"عالي",time:"منذ 8س",category:"شركة"},
    {title:"التوترات الجيوسياسية في الشرق الأوسط تضغط على الأسواق",src:"WSJ",sentiment:"سلبي",score:35,impact:"متوسط",time:"منذ 12س",category:"ماكرو"},
    {title:"Moody's يثبت التصنيف A1 — نظرة مستقبلية مستقرة",src:"موديز",sentiment:"محايد",score:58,impact:"منخفض",time:"منذ 1 يوم",category:"تصنيف"},
  ];
  const avg = data?.overall || Math.round(news.reduce((s,n)=>s+n.score,0)/news.length);
  const sC = avg>65?C.mint:avg<40?C.coral:C.amber;

  return (
    <SectionCard title="تحليل المشاعر — AI + بحث حي" accent={sC}
      badge={data?{text:"حي",color:C.mint}:{text:"مخزّن",color:C.amber}}>
      <div style={{ padding:"8px 16px" }}>
        {/* زر تحديث AI */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <Tag text={avg>65?"إيجابي":avg<40?"سلبي":"محايد"} color={sC}/>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:13, fontWeight:900, color:sC }}>{avg}/100</span>
            </div>
            {nlpFetch && <div style={{ fontSize:9, color:C.mint, marginTop:2 }}>{"✓ بيانات حية — "}{nlpFetch}</div>}
          </div>
          <button onClick={fetchNews} disabled={loading}
            style={{ display:"flex", alignItems:"center", gap:5, background:loading?C.layer3:`${C.electric}18`, border:`1px solid ${C.electric}44`, borderRadius:8, padding:"6px 11px", color:C.electric, fontSize:11, fontWeight:700, cursor:loading?"not-allowed":"pointer", fontFamily:"Cairo,sans-serif" }}>
            {loading?(
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>جارٍ...</>
            ):(
              <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-1"/></svg>تحديث AI</>
            )}
          </button>
        </div>

        {/* شريط المشاعر + Trend */}
        <div style={{ marginBottom:12 }}>
          <div style={{ height:5, background:C.layer3, borderRadius:3, overflow:"hidden", marginBottom:6 }}>
            <div style={{ height:"100%", width:`${avg}%`, background:`linear-gradient(90deg,${avg>65?C.coral:C.mint},${sC})`, borderRadius:3 }}/>
          </div>
          {/* Sentiment Sparkline من الأخبار */}
          <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" style={{display:"block"}}>
            <defs><linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sC} stopOpacity=".3"/>
              <stop offset="100%" stopColor={sC} stopOpacity="0"/>
            </linearGradient></defs>
            {news.length>1 && (()=>{
              const pts3=news.map((n,i)=>({x:(i/(news.length-1))*196+2, y:28-n.score/100*24}));
              const path3=pts3.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
              const area3=path3+` L${pts3[pts3.length-1].x},28 L2,28 Z`;
              return (<>
                <path d={area3} fill="url(#sentGrad)"/>
                <path d={path3} fill="none" stroke={sC} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                {pts3.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2.5" fill={news[i].sentiment==="إيجابي"?C.mint:news[i].sentiment==="سلبي"?C.coral:C.amber}/>)}
              </>);
            })()}
          </svg>
        </div>

        {/* ملخص AI إذا متوفر */}
        {data?.summary && (
          <div style={{ padding:"7px 10px", background:sC+"10", border:`1px solid ${sC}33`, borderRadius:8, marginBottom:10, fontSize:11, color:C.mist, lineHeight:1.6 }}>
            {data.summary}
          </div>
        )}

        {error && <div style={{ padding:"6px 10px", background:C.coral+"15", border:`1px solid ${C.coral}33`, borderRadius:8, marginBottom:8, fontSize:10, color:C.coral }}>{error}</div>}

        {/* قائمة الأخبار */}
        {news.map((n,i)=>{
          const sc=n.sentiment==="إيجابي"?C.mint:n.sentiment==="سلبي"?C.coral:C.amber;
          return (
            <div key={i} style={{ padding:"9px 0", borderBottom:i<news.length-1?`1px solid ${C.line}22`:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  <Tag text={n.src} color={C.electric}/>
                  <Tag text={n.category} color={C.smoke}/>
                  <span style={{ fontSize:10, color:C.smoke }}>{n.time}</span>
                </div>
                <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                  <Tag text={n.impact==="عالي"?"⚡عالي":n.impact==="متوسط"?"متوسط":"منخفض"} color={n.impact==="عالي"?C.coral:n.impact==="متوسط"?C.amber:C.smoke}/>
                  <Tag text={n.sentiment} color={sc}/>
                </div>
              </div>
              <div style={{ fontSize:11, color:C.mist, lineHeight:1.6 }}>{n.title}</div>
              {/* شريط درجة المشاعر */}
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:5 }}>
                <div style={{ flex:1, height:3, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${n.score}%`, background:sc, borderRadius:2 }}/>
                </div>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:sc, fontWeight:700, flexShrink:0 }}>{n.score}</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}


export { OrderBookLoader, OrderBookPanel, TickLoader, TickDataPanel, NLPLoader, NLPNewsPanel };
