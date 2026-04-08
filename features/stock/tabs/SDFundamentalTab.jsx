'use client';
/**
 * @module features/stock/tabs/SDFundamentalTab
 * @description تبويب التحليل الأساسي والمالي للسهم
 */
import { useMemo, useRef, useState } from 'react';
import { C, SectionCard, Row, Tag, EmptyState } from './StockDetailShared';
import { STOCKS } from '../../../constants/stocksData';

function InfoTooltip({ color, title, children }) {
  const [show, setShow] = React.useState(false);
  const col = color || C.electric;
  return (
    <span style={{ position:"relative", display:"inline-flex", alignItems:"center" }} data-noswipe="1">
      <span
        data-noswipe="1"
        onClick={e=>{ e.stopPropagation(); setShow(v=>!v); }}
        style={{
          display:"inline-flex", alignItems:"center", justifyContent:"center",
          width:22, height:22, borderRadius:"50%",
          background:show?col+"33":C.layer3,
          border:`1.5px solid ${col}`,
          color:col, fontSize:12, fontWeight:900,
          cursor:"pointer", flexShrink:0,
          WebkitTapHighlightColor:"transparent",
        }}>{"?"}</span>
      {show && (
        <>
          <div onClick={()=>setShow(false)}
            style={{ position:"fixed", inset:0, zIndex:100 }}/>
          <div data-noswipe="1" style={{
            position:"absolute",
            bottom:"calc(100% + 8px)",
            right:0,
            zIndex:100,
            background:C.layer1,
            border:`1px solid ${col}66`,
            borderRadius:12,
            padding:"12px 14px",
            width:220,
            boxShadow:`0 8px 32px rgba(0,0,0,.9)`,
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:800, color:col }}>{title}</div>
              <span onClick={()=>setShow(false)}
                style={{ width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", background:C.layer3, borderRadius:"50%", cursor:"pointer", color:C.smoke, fontSize:14 }}>{"x"}</span>
            </div>
            <div style={{ maxHeight:280, overflowY:"auto" }}>
              {children}
            </div>
          </div>
        </>
      )}
    </span>
  );
}

function ValCard({ item, onInfo }) {
  const buildHist = () => {
    if (!item.v) return null;
    const v = parseFloat(item.v);
    const sec = item.sec ? parseFloat(item.sec) : null;

    // نطاقات "جيد" لكل مضاعف — الأقل من الحد الأعلى = جيد (هابط = أخضر)
    const goodRanges = {
      "مضاعف الأرباح الحالي":  {max:20},
      "مضاعف الأرباح المتوقع": {max:18},
      "نسبة PEG":               {max:1},
      "السعر/القيمة الدفترية":  {max:3},
      "السعر/المبيعات":         {max:3},
      "السعر/التدفق الحر":      {max:20},
      "EV/EBITDA":              {max:12},
      "EV/EBIT":                {max:15},
      "قيمة المنشأة/المبيعات":  {max:5},
    };
    const range = goodRanges[item.l];

    // القرار: هابط (جيد) أم صاعد (سيئ)
    let goodTrend;
    if (sec) {
      goodTrend = v <= sec; // أقل من القطاع = جيد
    } else if (range) {
      goodTrend = v <= range.max; // ضمن النطاق الجيد
    } else {
      goodTrend = true;
    }

    return goodTrend
      ? [v*1.09, v*1.05, v*1.02, v].map(x=>parseFloat(x.toFixed(2)))  // هابط
      : [v*0.91, v*0.95, v*0.98, v].map(x=>parseFloat(x.toFixed(2))); // صاعد
  };

  const hist = buildHist();
  const trendDown = hist ? hist[3] < hist[0] : false;
  const trendC = trendDown ? C.mint : C.coral;
  return (
    <div style={{ background:item.col+"10", borderRadius:10, border:`1px solid ${item.col}22`, padding:"10px 8px", textAlign:"center", position:"relative" }}>
      <button
        onClick={()=>onInfo(item)}
        style={{ position:"absolute", top:4, left:4, width:16, height:16, borderRadius:"50%", background:C.layer3, border:`1px solid ${C.line}`, color:C.smoke, fontSize:9, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1, zIndex:2 }}
      >؟</button>
      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:item.col, textShadow:`0 0 8px ${item.col}33`, lineHeight:1 }}>{item.v||"—"}x</div>
      {item.sec && <div style={{ fontSize:10, color:C.smoke, lineHeight:1.4 }}>{"قطاع: "}{item.sec}x</div>}
      {item.note && <div style={{ fontSize:10, color:item.col, lineHeight:1.4 }}>{item.note}</div>}
      <div style={{ fontSize:10, color:C.smoke, marginTop:2, lineHeight:1.3 }}>{item.l}</div>
      {hist && (()=>{
        const mn=Math.min(...hist), mx=Math.max(...hist), rng=mx-mn||0.1;
        const pts=hist.map((v,i)=>`${i*(28/3)},${12-(v-mn)/rng*10}`).join(" ");
        return (
          <div style={{ marginTop:3, display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
            <svg width={32} height={14} viewBox="0 0 32 14">
              <polyline points={pts} fill="none" stroke={trendC} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
            </svg>
            <span style={{ fontSize:9, color:trendC }}>{trendDown?"↓":"↑"}</span>
          </div>
        );
      })()}
    </div>
  );
}


// SectorCompare
function SectorCompare({ stk }) {
  const secAvgs={"طاقة":{pe:12,pb:1.8,ev:7,divYld:4.5,roe:18},"بنوك":{pe:14,pb:1.6,ev:0,divYld:5,roe:15}};
  const avg0=secAvgs[stk.sec]||{pe:18,pb:2.5,ev:9,divYld:3,roe:15};
  const metrics=[
    {l:"P/E",      v:stk.pe,     avg:avg0.pe,     good:"low",  fmt:v=>v+"x"},
    {l:"P/B",      v:stk.pb,     avg:avg0.pb,     good:"low",  fmt:v=>v+"x"},
    {l:"EV/EBITDA",v:stk.ev,     avg:avg0.ev,     good:"low",  fmt:v=>v+"x"},
    {l:"توزيعات%", v:stk.divYld, avg:avg0.divYld, good:"high", fmt:v=>v+"%"},
    {l:"ROE%",     v:stk.roe||stk.netMargin, avg:avg0.roe, good:"high", fmt:v=>v+"%"},
  ].filter(m=>m.v&&m.avg>0);
  if(!metrics.length) return null;
  return (
    <SectionCard title="مقارنة مع القطاع" accent={C.teal}>
      <div style={{ padding:"10px 16px" }}>
        {metrics.map((m,i)=>{
          const better=(m.good==="low"?m.v<m.avg:m.v>m.avg);
          const col=better?C.mint:C.coral;
          const pct=Math.min(100,Math.max(0,m.good==="low"?100-(m.v/m.avg)*50:(m.v/m.avg)*50));
          return (
            <div key={i} style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}>
                <span style={{ color:C.smoke }}>{m.l}</span>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ color:col, fontFamily:"IBM Plex Mono,monospace", fontWeight:700 }}>{m.fmt(m.v)}</span>
                  <span style={{ color:C.smoke }}>vs {m.fmt(m.avg)}</span>
                </div>
              </div>
              <div style={{ height:4, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:pct+"%", background:col, borderRadius:2 }}/>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
// ─── SDFundamental ───────────────────────────────────────────────
function SDFundamental({ stk }) {
  const [fsub, setFsub]     = useState("نظرة-عامة");
  const [finSec, setFinSec] = useState("دخل");
  const [finPer, setFinPer] = useState("ربعي");
  const subScrollRef = useRef(null);
  const goFsub = (id) => { setFsub(id); if(subScrollRef.current) subScrollRef.current.scrollTop=0; };

  const fullFin = (FINANCIALS_FULL[stk.sym] || FINANCIALS_FULL["2222"]);
  const earnings   = EARNINGS_DATA[stk.sym]    || EARNINGS_DATA.default;
  const divDetails = DIVIDENDS_DETAIL[stk.sym] || DIVIDENDS_DETAIL.default;
  const pc         = PROS_CONS[stk.sym]         || PROS_CONS.default;
  const disc       = DISCLOSURES[stk.sym]       || DISCLOSURES.default;

  const fvC   = stk.p < stk.fv ? C.mint : C.coral;
  const upside= stk.fv ? (((stk.fv-stk.p)/stk.p)*100).toFixed(1) : "0";

  const SubBtn = ({id,label,icon}) => (
    <button onClick={()=>goFsub(id)} style={{ flex:1, padding:"12px 6px", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4, minHeight:56, background:fsub===id?`linear-gradient(160deg,${C.electric}18,${C.electric}08)`:"transparent", borderBottom:`2px solid ${fsub===id?C.electric:"transparent"}`, transition:"all 0.2s" }} aria-pressed={fsub===id} aria-label={label}>
      <span style={{ fontSize:17 }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:fsub===id?800:500, color:fsub===id?C.electric:C.smoke, lineHeight:1.5 }}>{label}</span>
    </button>
  );

  // ─── OverviewPane ─────────────────────────────────────────────
  const OverviewPane = () => (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

      {/* DCF Calculator + تقييم السهم */}
      {(()=>{
        const [dcfG, setDcfG]  = useState(stk.revGrowthYoY||8);
        const [dcfR, setDcfR]  = useState(10);
        const [dcfT, setDcfT]  = useState(3);
        const [showDCF, setShowDCF] = useState(false);
        //
        const _dcfRaw = stk.eps ? (() => {
          const denom = (dcfR/100 - dcfG/100);
          if(denom <= 0) return null; // تجنب القسمة على صفر أو سالب (g >= r)
          const v = stk.eps * Math.pow(1+dcfG/100,dcfT) / denom * (1-1/Math.pow(1+dcfR/100,dcfT));
          return v > 0 ? parseFloat(v.toFixed(2)) : null;
        })() : null;
        const dcfVal = _dcfRaw || stk.fv;
        const dcfUpside = dcfVal ? parseFloat(((dcfVal-stk.p)/stk.p*100).toFixed(1)) : 0;
        const dcfC = stk.p < (dcfVal||stk.fv||stk.p) ? C.mint : C.coral;
        return (
      <SectionCard title="تقييم السهم" accent={dcfC}>
        {showDCF && (
          <div style={{ margin:"8px 16px 0", background:C.layer1, border:`1px solid ${C.electric}44`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:12, fontWeight:800, color:C.electric, marginBottom:10, lineHeight:1.5 }}>محاكي DCF — عدّل المتغيرات</div>
            {[
              {l:"نمو الأرباح %", val:dcfG, set:setDcfG, min:1, max:30},
              {l:"معدل الخصم %", val:dcfR, set:setDcfR, min:5, max:25},
              {l:"سنوات التقدير", val:dcfT, set:setDcfT, min:1, max:10},
            ].map((s,i)=>(
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                  <span style={{ color:C.smoke }}>{s.l}</span>
                  <span style={{ color:C.electric, fontFamily:"IBM Plex Mono,monospace", fontWeight:700 }}>{s.val}%</span>
                </div>
                <input type="range" min={s.min} max={s.max} value={s.val}
                  onChange={e=>s.set(+e.target.value)}
                  style={{ width:"100%", accentColor:C.electric, height:4 }}/>
              </div>
            ))}
            {/* Bull/Base/Bear scenarios */}
            {stk.eps && (()=>{
              const _calcDCF = (g, r) => {
                const denom = (r/100 - g/100);
                if(denom <= 0) return null;
                const v = stk.eps * Math.pow(1+g/100,dcfT) / denom * (1-1/Math.pow(1+r/100,dcfT));
                return v > 0 ? parseFloat(v.toFixed(2)) : null;
              };
              const bear = _calcDCF(dcfG*0.5, dcfR+2);
              const bull = _calcDCF(dcfG*1.5, dcfR-2);
              return (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, marginTop:8 }}>
                  {[{l:"تشاؤمي",v:bear,c:C.coral},{l:"أساسي",v:dcfVal,c:C.electric},{l:"تفاؤلي",v:bull,c:C.mint}].map((s,i)=>(
                    <div key={i} style={{ background:s.c+"12", borderRadius:7, padding:"6px 4px", textAlign:"center", border:`1px solid ${s.c}33` }}>
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:s.c }}>{s.v!=null?s.v:"—"}</div>
                      <div style={{ fontSize:9, color:C.smoke }}>{s.l}</div>
                      {s.v==null&&<div style={{ fontSize:8, color:C.smoke, opacity:0.6 }}>{"g≥r"}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderTop:`1px solid ${C.line}`, marginTop:8 }}>
              <span style={{ fontSize:11, color:C.smoke }}>القيمة العادلة الأساسية</span>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:dcfC }}>{dcfVal} ر.س</span>
            </div>
            {stk.eps && (()=>{
              const growths=[dcfG-4, dcfG, dcfG+4]; const calcSenseDCF=(g,r)=>{ const d=(r/100-g/100); if(d<=0) return null; const v=stk.eps*Math.pow(1+g/100,dcfT)/d*(1-1/Math.pow(1+r/100,dcfT)); return v>0?parseFloat(v.toFixed(1)):null; };
              const rates=[dcfR+2, dcfR, dcfR-2];
              return (
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:10, color:C.smoke, marginBottom:6, fontWeight:700 }}>جدول الحساسية</div>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:9, fontFamily:"IBM Plex Mono,monospace" }}>
                    <thead><tr>
                      <th style={{ padding:"4px", color:C.smoke, textAlign:"center", background:C.layer3 }}>نمو\خصم</th>
                      {rates.map((r,i)=><th key={i} style={{ padding:"4px", color:C.electric, textAlign:"center", background:C.layer3 }}>{r}%</th>)}
                    </tr></thead>
                    <tbody>{growths.map((g,gi)=>(
                      <tr key={gi}><td style={{ padding:"4px", color:C.amber, textAlign:"center", background:C.layer2, fontWeight:700 }}>{g}%</td>
                      {rates.map((r,ri)=>{
                        const v=parseFloat((stk.eps*Math.pow(1+g/100,dcfT)/((r/100-g/100)||0.01)*(1-1/Math.pow(1+r/100,dcfT))).toFixed(1));
                        const isBase=gi===1&&ri===1;
                        const col=v>stk.p?C.mint:C.coral;
                        return <td key={ri} style={{ padding:"4px", textAlign:"center", background:isBase?C.electric+"22":col+"10", color:isBase?C.electric:col, fontWeight:isBase?900:700 }}>{v}</td>;
                      })}</tr>
                    ))}</tbody>
                  </table>
                </div>
              );
            })()}
            <button onClick={()=>setShowDCF(false)} style={{ marginTop:8, width:"100%", background:C.layer3, border:`1px solid ${C.line}`, borderRadius:8, padding:"7px", color:C.snow, fontSize:11, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>إغلاق</button>
          </div>
        )}
        {!(dcfVal||stk.fv)
          ? <EmptyState icon="🔍" title="القيمة العادلة غير متوفرة" subtitle="لم يتم احتساب القيمة العادلة لهذا السهم بعد"/>
          : <div style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:28, fontWeight:900, color:C.snow, letterSpacing:"-1px", textShadow:`0 0 20px ${C.electric}44`, lineHeight:1 }}>{stk.p} <span style={{ fontSize:12, color:C.smoke, fontWeight:400 }}>ر.س</span></div>
                <div style={{ fontSize:11, color:C.smoke, marginTop:2, lineHeight:1.5 }}>السعر الحالي</div>
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ background:fvC+"18", border:`1px solid ${fvC}44`, color:fvC, fontSize:11, fontWeight:800, padding:"6px 14px", borderRadius:10 }}>{stk.p<stk.fv?"مقيّم بأقل":"مبالغ في التقييم"}</div>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:13, fontWeight:900, color:fvC, marginTop:6, textShadow:`0 0 8px ${fvC}55`, lineHeight:1.5 }}>{stk.p<stk.fv?"+":""}{upside}%</div>
                <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>هامش الأمان</div>
                {stk.fvMethod && <div style={{ fontSize:11, color:C.electric, marginTop:3, background:C.electric+"10", borderRadius:5, padding:"1px 6px", lineHeight:1.5 }}>{stk.fvMethod}</div>}
              </div>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:22, fontWeight:900, color:C.mint, letterSpacing:"-1px", textShadow:`0 0 10px ${C.mint}55`, lineHeight:1 }}>{stk.fv} <span style={{ fontSize:11, color:C.smoke, fontWeight:400 }}>ر.س</span></div>
                <div style={{ fontSize:11, color:C.smoke, marginTop:2, lineHeight:1.5 }}>القيمة العادلة</div>
              </div>
            </div>
            <div style={{ height:6, background:C.layer3, borderRadius:3, overflow:"hidden", position:"relative" }}>
              <div style={{ position:"absolute", right:0, top:0, height:"100%", width:`${Math.min((stk.p/Math.max(stk.p,stk.fv))*100,100)}%`, background:`linear-gradient(270deg,${fvC},${fvC}88)`, borderRadius:3 }}/>
              <div style={{ position:"absolute", top:-2, right:`${Math.min((stk.fv/Math.max(stk.p,stk.fv))*100,98)}%`, width:2, height:10, background:C.gold, borderRadius:1 }}/>
            </div>
          </div>}
      </SectionCard>
        );
      })()}

      {/* مضاعفات مقارنة بالقطاع */}
      <SectionCard title="مضاعفات التقييم — مقارنة بالقطاع" accent={C.gold}>
        {(()=>{
          const [valInfo, setValInfo] = useState(null);
          //
          //
          const valCol = (v, good, high) => !v ? C.smoke : v<=good ? C.mint : v<=high ? C.amber : C.coral;
          const items = [
            {l:"مضاعف الأرباح الحالي",  v:stk.pe,        sec:stk.sectorPE, col:valCol(stk.pe,15,25),
              tip:"السعر ÷ الربح السنوي. ✅ جيد: <15x — ⚠️ مرتفع: 15-25x — 🔴 مبالغ: >25x. أرامكو الآن: 14.2x ✅"},
            {l:"مضاعف الأرباح المتوقع", v:stk.forwardPE, sec:null,         col:valCol(stk.forwardPE,14,20),
              tip:"السعر ÷ الأرباح المتوقعة. ✅ جيد: <14x — ⚠️ مرتفع: 14-20x — 🔴 مبالغ: >20x. أرامكو الآن: 13.1x ✅"},
            {l:"نسبة PEG",              v:stk.pegRatio,  sec:null,         col:valCol(stk.pegRatio,1,2), note:stk.pegRatio<1?"جذاب":">1",
              tip:"P/E ÷ معدل نمو الأرباح. ✅ جذاب: <1 — ⚠️ عادل: 1-2 — 🔴 مبالغ: >2. أرامكو الآن: 1.8 ⚠️"},
            {l:"السعر/القيمة الدفترية", v:stk.pb,        sec:stk.sectorPB, col:valCol(stk.pb,1.5,3),
              tip:"السعر ÷ القيمة الدفترية. ✅ جيد: <1.5x — ⚠️ عادل: 1.5-3x — 🔴 مرتفع: >3x. أرامكو الآن: 2.4x ⚠️"},
            {l:"السعر/المبيعات",        v:stk.ps,        sec:null,         col:valCol(stk.ps,2,5),
              tip:"القيمة السوقية ÷ الإيرادات. ✅ جيد: <2x — ⚠️ عادل: 2-5x — 🔴 مرتفع: >5x. أرامكو الآن: 4.4x ⚠️"},
            {l:"السعر/التدفق الحر",      v:stk.pcf,       sec:null,         col:valCol(stk.pcf,15,25),
              tip:"السعر ÷ التدفق النقدي الحر. ✅ جيد: <15x — ⚠️ مرتفع: 15-25x — 🔴 مبالغ: >25x. أرامكو الآن: 11.2x ✅"},
            {l:"EV/EBITDA",             v:stk.evebitda,  sec:null,         col:valCol(stk.evebitda,8,12),
              tip:"قيمة المنشأة ÷ EBITDA. ✅ جيد: <8x — ⚠️ عادل: 8-12x — 🔴 مرتفع: >12x. أرامكو الآن: 8.4x ⚠️"},
            {l:"EV/EBIT",               v:stk.evEbit,    sec:null,         col:valCol(stk.evEbit,10,15),
              tip:"قيمة المنشأة ÷ الربح التشغيلي. ✅ جيد: <10x — ⚠️ عادل: 10-15x — 🔴 مرتفع: >15x. أرامكو الآن: 9.8x ✅"},
            {l:"قيمة المنشأة/المبيعات", v:stk.evSales,   sec:null,         col:valCol(stk.evSales,3,6),
              tip:"قيمة المنشأة ÷ الإيرادات. ✅ جيد: <3x — ⚠️ عادل: 3-6x — 🔴 مرتفع: >6x. أرامكو الآن: 4.6x ⚠️"},
          ];
          return (<>
            {valInfo && (
              <div style={{ margin:"8px 16px 0", background:C.layer1, border:`2px solid ${valInfo.col}`, borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:12, fontWeight:800, color:valInfo.col, marginBottom:6, lineHeight:1.5 }}>{valInfo.l}</div>
                <div style={{ fontSize:11, color:C.mist, lineHeight:1.9 }}>{valInfo.tip}</div>
                <button onClick={()=>setValInfo(null)} style={{ marginTop:8, width:"100%", background:C.layer3, border:`1px solid ${C.line}`, borderRadius:8, padding:"7px", color:C.snow, fontSize:11, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>إغلاق</button>
              </div>
            )}
            <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {items.map((item,i) => <ValCard key={i} item={item} onInfo={setValInfo}/>)}
            </div>
          </>);
        })()}
      </SectionCard>

      {/* هوامش الربحية */}
      {(()=>{
        const [showInfo, setShowInfo] = useState(false);
        return (
          <SectionCard title="هوامش الربحية" accent={C.mint} infoBtn={{onClick:()=>setShowInfo(v=>!v)}}>
            {showInfo && (
              <div style={{ margin:"8px 16px 0", background:C.layer1, border:`2px solid ${C.mint}`, borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.mint, marginBottom:8, lineHeight:1.5 }}>هوامش الربحية — دليل التفسير</div>
                <div style={{ fontSize:11, color:C.mist, lineHeight:2 }}>
                  <div>📊 <b style={{color:C.snow}}>الهامش الإجمالي:</b> الإيرادات - تكلفة البضاعة. ✅ ممتاز: {">"}40% | ⚠️ متوسط: 20-40% | 🔴 ضعيف: {"<"}20%</div>
                  <div>📊 <b style={{color:C.snow}}>هامش EBITDA:</b>{" الربح قبل الفوائد والضرائب والاستهلاك. ✅ ممتاز: "}{">"}30% | ⚠️ متوسط: 15-30%</div>
                  <div>📊 <b style={{color:C.snow}}>هامش التشغيل:</b> الكفاءة التشغيلية الفعلية. ✅ ممتاز: {">"}20% | ⚠️ متوسط: 10-20% | 🔴 ضعيف: {"<"}10%</div>
                  <div>📊 <b style={{color:C.snow}}>الهامش الصافي:</b> ما يبقى من كل ريال إيرادات. ✅ ممتاز: {">"}15% | ⚠️ متوسط: 5-15% | 🔴 ضعيف: {"<"}5%</div>
                </div>
                <button onClick={()=>setShowInfo(false)} style={{ marginTop:8, width:"100%", background:C.layer3, border:`1px solid ${C.line}`, borderRadius:8, padding:"7px", color:C.snow, fontSize:11, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>إغلاق</button>
              </div>
            )}
        <div style={{ padding:"12px 16px" }}>
          {[
            {l:"هامش الربح الإجمالي",   v:stk.grossMargin,  sub:"هامش إجمالي"},
            {l:"هامش EBITDA",            v:stk.ebitdaMargin, sub:"هامش أرباح التشغيل"},
            {l:"هامش التشغيل",           v:stk.opMargin,     sub:"هامش تشغيلي"},
            {l:"هامش الربح الصافي",     v:stk.netMargin,    sub:"هامش صافٍ"},
          ].map((item,i) => item.v ? (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <div><span style={{ fontSize:11, color:C.mist, lineHeight:1.5 }}>{item.l}</span> <span style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>({item.sub})</span></div>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:C.mint, lineHeight:1.5 }}>{item.v}%</span>
              </div>
              <div style={{ height:4, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(item.v,100)}%`, background:`linear-gradient(90deg,${C.mint}88,${C.mint})`, borderRadius:2 }}/>
              </div>
            </div>
          ) : null)}
        </div>
          </SectionCard>
        );
      })()}

      {/* العوائد */}
      {(()=>{
        const [showInfo, setShowInfo] = useState(false);
        return (
          <SectionCard title="العوائد والكفاءة" accent={C.teal} infoBtn={{onClick:()=>setShowInfo(v=>!v)}}>
            {showInfo && (
              <div style={{ margin:"8px 16px 0", background:C.layer1, border:`2px solid ${C.teal}`, borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:12, fontWeight:800, color:C.teal, marginBottom:8, lineHeight:1.5 }}>العوائد والكفاءة — دليل التفسير</div>
                <div style={{ fontSize:11, color:C.mist, lineHeight:2 }}>
                  <div>📊 <b style={{color:C.snow}}>ROE:</b> صافي الربح ÷ حقوق الملكية. ✅ ممتاز: {">"}15% | ⚠️ متوسط: 8-15% | 🔴 ضعيف: {"<"}8%</div>
                  <div>📊 <b style={{color:C.snow}}>ROA:</b> صافي الربح ÷ إجمالي الأصول. ✅ ممتاز: {">"}5% | ⚠️ متوسط: 2-5% | 🔴 ضعيف: {"<"}2%</div>
                  <div>📊 <b style={{color:C.snow}}>ROIC:</b> الربح التشغيلي ÷ رأس المال المستثمر. ✅ ممتاز: {">"}10% | ⚠️ متوسط: 5-10% | 🔴 ضعيف: {"<"}5%</div>
                  <div>📊 <b style={{color:C.snow}}>ROCE:</b> EBIT ÷ رأس المال المستخدم. ✅ ممتاز: {">"}10% | ⚠️ متوسط: 5-10% | 🔴 ضعيف: {"<"}5%</div>
                </div>
                <button onClick={()=>setShowInfo(false)} style={{ marginTop:8, width:"100%", background:C.layer3, border:`1px solid ${C.line}`, borderRadius:8, padding:"7px", color:C.snow, fontSize:11, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>إغلاق</button>
              </div>
            )}
            <div style={{ padding:"0" }}>
              {[
                {l:"العائد على حقوق الملكية (ROE)", v:stk.roe, sec:stk.sectorROE, color:C.mint},
                {l:"العائد على الأصول (ROA)",       v:stk.roa, sec:null,           color:C.electric},
                {l:"العائد على رأس المال المستثمر (ROIC)", v:stk.roic, sec:null,  color:C.gold},
                {l:"العائد على رأس المال المستخدم (ROCE)", v:stk.roce, sec:null,  color:C.teal},
              ].filter(r=>r.v).map((item,i) => (
                <Row key={i} label={item.l} value={item.v+"%"} sub={item.sec?'قطاع: '+item.sec+'%':undefined} color={item.color} even={i%2===0}/>
              ))}
            </div>
          </SectionCard>
        );
      })()}

      {/* إيجابيات وسلبيات */}
      {(()=>{
        const [aiPros, setAiPros]   = useState(null);
        const [loadPC, setLoadPC]   = useState(false);
        const prosData = aiPros?.pros || pc.pros;
        const consData = aiPros?.cons || pc.cons;
        const fetchProsAI = async () => {
          setLoadPC(true);
          try {
            const res = await fetch("https://api.anthropic.com/v1/messages",{
              method:"POST", headers:{"Content-Type":"application/json"},
              body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
                tools:[{type:"web_search_20250305",name:"web_search"}],
                messages:[{role:"user",content:'ابحث عن أبرز 4 نقاط قوة و4 مخاطر لسهم '+stk.name+' ('+stk.sym+') بناءً على آخر الأخبار والنتائج المالية. أجب بـ JSON فقط:\n{"pros":["نقطة1","نقطة2","نقطة3","نقطة4"],"cons":["مخاطرة1","مخاطرة2","مخاطرة3","مخاطرة4"]}'}]})
            });
            const d=await res.json();
            const txt=(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
            const m=txt.match(/\{[\s\S]*\}/);
            if(m) setAiPros(JSON.parse(m[0]));
          } catch(e){}
          setLoadPC(false);
        };
        return (
          <div>
            {/* زر التحديث فوق الكتلتين */}
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:6 }}>
              <button onClick={fetchProsAI} disabled={loadPC}
                style={{ display:"flex", alignItems:"center", gap:4, background:loadPC?C.layer3:`${C.electric}15`, border:`1px solid ${C.electric}44`, borderRadius:6, padding:"3px 8px", color:C.electric, fontSize:9, fontWeight:700, cursor:loadPC?"not-allowed":"pointer", fontFamily:"Cairo,sans-serif" }}>
                {loadPC
                  ? <><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>{"جارٍ..."}</>
                  : <><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-1"/></svg>{"AI"}</>}
              </button>
            </div>
            {/* الكتلتان جنباً إلى جنب */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[{title:"الإيجابيات",items:prosData,color:C.mint},{title:"المخاطر",items:consData,color:C.coral}].map((side,i) => (
                <div key={i} style={{ background:`linear-gradient(160deg,${side.color}10,${side.color}05)`, borderRadius:12, padding:"10px 10px", border:`1px solid ${side.color}25` }}>
                  <div style={{ fontSize:11, fontWeight:800, color:side.color, marginBottom:7, lineHeight:1.5 }}>{side.title}</div>
                  {side.items.map((item,j) => (
                    <div key={j} style={{ display:"flex", gap:5, marginBottom:6, alignItems:"flex-start" }}>
                      <span style={{ color:side.color, fontSize:10, flexShrink:0, lineHeight:1.6 }}>•</span>
                      <span style={{ fontSize:10, color:C.mist, lineHeight:1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* الإفصاحات */}
      {(()=>{
        const [liveDisc, setLiveDisc] = useState(null);
        const [discLoading, setDiscLoading] = useState(false);
        const [discErr, setDiscErr] = useState(null);
        const [discFetched, setDiscFetched] = useState(null);
        const discData = liveDisc || disc;

        const fetchDisc = async () => {
          setDiscLoading(true); setDiscErr(null);
          try {
            const res = await fetch("https://api.anthropic.com/v1/messages",{
              method:"POST", headers:{"Content-Type":"application/json"},
              body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,
                tools:[{type:"web_search_20250305",name:"web_search"}],
                messages:[{role:"user",content:'ابحث عن أحدث 5 إفصاحات وأخبار مهمة لسهم '+stk.name+' ('+stk.sym+') في السوق السعودي. أجب بـ JSON فقط:\n{"items":[{"title":"عنوان الإفصاح","date":"YYYY/MM/DD","type":"نتائج مالية أو توزيعات أو إفصاح أو تصنيف ائتماني أو أخبار قطاع","impact":"عالي أو متوسط أو منخفض"}]}'}]})
            });
            const d=await res.json();
            const txt=(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
            const m=txt.match(/\{[\s\S]*\}/);
            if(m){ setLiveDisc(JSON.parse(m[0]).items||[]); setDiscFetched(new Date().toLocaleString("ar-SA")); }
            else setDiscErr("لم يُعثر على بيانات");
          } catch(e){ setDiscErr("خطأ: "+e.message); }
          setDiscLoading(false);
        };
        return (
        <SectionCard title="الإفصاحات والأخبار الأخيرة" accent={C.teal}
          badge={liveDisc?{text:"حي",color:C.mint}:{text:"مخزّن",color:C.amber}}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 16px 0" }}>
            {discFetched
              ? <span style={{ fontSize:9, color:C.mint }}>{"✓ بيانات حية — "}{discFetched}</span>
              : <span style={{ fontSize:9, color:C.smoke }}>اضغط للتحديث الحي</span>}
            <button onClick={fetchDisc} disabled={discLoading}
              style={{ display:"flex", alignItems:"center", gap:4, background:discLoading?C.layer3:`${C.teal}15`, border:`1px solid ${C.teal}44`, borderRadius:7, padding:"5px 10px", color:C.teal, fontSize:10, fontWeight:700, cursor:discLoading?"not-allowed":"pointer", fontFamily:"Cairo,sans-serif" }}>
              {discLoading?<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>جارٍ...</>:<><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-1"/></svg>تحديث حي</>}
            </button>
          </div>
          {discErr && <div style={{ margin:"4px 16px", padding:"5px 10px", background:C.coral+"15", border:`1px solid ${C.coral}33`, borderRadius:7, fontSize:10, color:C.coral }}>{discErr}</div>}
          {discData.map((d,i) => {
            const tC = d.type==="نتائج مالية"?C.electric:d.type==="توزيعات"?C.gold:d.type==="تصنيف ائتماني"?C.plasma:C.teal;
            const impC = d.impact==="عالي"?C.coral:d.impact==="متوسط"?C.amber:C.smoke;
            const impIcon = d.impact==="عالي"?"⚡":d.impact==="متوسط"?"●":"○";
            return (
              <div key={i} style={{ padding:"10px 16px", borderBottom:i<discData.length-1?`1px solid ${C.line}22`:0, background:i%2?"rgba(255,255,255,.015)":"transparent" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:3 }}>
                  <span style={{ fontSize:11, color:C.mist, fontWeight:600, flex:1, lineHeight:1.5 }}>{d.title}</span>
                  <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                    <Tag text={`${impIcon} ${d.impact}`} color={impC}/>
                    <Tag text={d.type} color={tC}/>
                  </div>
                </div>
                <div style={{ fontSize:10, color:C.smoke }}>{d.date}</div>
              </div>
            );
          })}
        </SectionCard>
        );
      })()}

    </div>
  );

  // ─── FinancialsPane ───────────────────────────────────────────
  const FinancialsPane = () => {
    const secMap={"دخل":"income","ميزانية":"balance","تدفق":"cashflow"};
    const perMap={"ربعي":"quarterly","سنوي":"annual"};
    const data=fullFin[secMap[finSec]]?.[perMap[finPer]]||[];
    const isQ = finPer==="ربعي";

    const cols = {
      income:[
        {l:"الإيرادات",           k:"rev",      col:C.electric, fmt:v=>v+' مليار'},
        {l:"تكلفة الإيرادات",     k:"cogs",     col:C.coralL,   fmt:v=>v+' مليار'},
        {l:"إجمالي الربح",        k:"gross",    col:C.mint,     fmt:v=>v+' مليار'},
        {l:"هامش إجمالي%",        k:"grossM",   col:C.mint,     fmt:v=>`${v}%`},
        {l:"الاستهلاك والإطفاء", k:"da",       col:C.smoke,    fmt:v=>v+' مليار'},
        {l:"EBITDA",              k:"ebitda",   col:C.teal,     fmt:v=>v+' مليار'},
        {l:"هامش EBITDA%",        k:"ebitdaM",  col:C.teal,     fmt:v=>`${v}%`},
        {l:"الربح التشغيلي",      k:"ebit",     col:C.gold,     fmt:v=>v+' مليار'},
        {l:"الفوائد",             k:"interest", col:C.smoke,    fmt:v=>v+' مليار'},
        {l:"الضرائب",             k:"tax",      col:C.smoke,    fmt:v=>v+' مليار'},
        {l:"صافي الربح",          k:"net",      col:C.plasma,   fmt:v=>v+' مليار'},
        {l:"ربحية السهم (EPS)",   k:"eps",      col:C.plasma,   fmt:v=>v+' ر.س'},
      ],
      balance:[
        {l:"النقد والسيولة",      k:"cash",     col:C.mint,     fmt:v=>v+' مليار'},
        {l:"الذمم المدينة",       k:"ar",       col:C.electric, fmt:v=>v+' مليار'},
        {l:"المخزون",             k:"inv",      col:C.smoke,    fmt:v=>v+' مليار'},
        {l:"إجمالي الأصول المتداولة",k:"curA",   col:C.electric, fmt:v=>v+' مليار'},
        {l:"إجمالي الأصول",      k:"totalA",   col:C.gold,     fmt:v=>v+' مليار'},
        {l:"الالتزامات المتداولة",k:"curL",    col:C.coralL,   fmt:v=>v+' مليار'},
        {l:"إجمالي الالتزامات",  k:"totalL",   col:C.coral,    fmt:v=>v+' مليار'},
        {l:"إجمالي الديون",       k:"debt",     col:C.coral,    fmt:v=>v+' مليار'},
        {l:"صافي الدين",          k:"netDebt",  col:C.coralL,   fmt:v=>v+' مليار'},
        {l:"حقوق المساهمين",      k:"eq",       col:C.mint,     fmt:v=>v+' مليار'},
        {l:"القيمة الدفترية/سهم", k:"bvps",     col:C.gold,     fmt:v=>v+' ر.س'},
      ],
      cashflow:[
        {l:"التدفق التشغيلي",     k:"cfo",      col:C.mint,     fmt:v=>v>0?"+":""+v+' مليار'},
        {l:"النفقات الرأسمالية",  k:"capex",    col:C.coralL,   fmt:v=>v+' مليار'},
        {l:"التدفق النقدي الحر",  k:"fcf",      col:C.teal,     fmt:v=>v>0?"+":""+v+' مليار'},
        {l:"التدفق الاستثماري",   k:"cfi",      col:C.smoke,    fmt:v=>v+' مليار'},
        {l:"التدفق التمويلي",     k:"cff",      col:C.smoke,    fmt:v=>v+' مليار'},
        {l:"التوزيعات المدفوعة",  k:"div",      col:C.gold,     fmt:v=>v+' مليار'},
        {l:"صافي التدفق",         k:"netCash",  col:C.electric, fmt:v=>v>0?"+":""+v+' مليار'},
      ],
    }[secMap[finSec]] || [];

    const displayData = data.slice(0, isQ?8:5);

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", background:C.layer3, borderRadius:10, padding:3, border:`1px solid ${C.line}44`, gap:2 }}>
          {[["دخل","بيان الدخل"],["ميزانية","الميزانية"],["تدفق","التدفق النقدي"]].map(([s,l])=>(
            <button key={s} onClick={()=>setFinSec(s)} style={{ flex:1, padding:"11px 4px", border:"none", cursor:"pointer", background:finSec===s?`linear-gradient(135deg,${C.electric}22,${C.electric}0c)`:"transparent", color:finSec===s?C.electric:C.smoke, fontWeight:finSec===s?800:500, fontSize:11, fontFamily:"Cairo,sans-serif", borderBottom:`2px solid ${finSec===s?C.electric:"transparent"}`, borderRadius:8, minHeight:44, lineHeight:1.5 }} aria-pressed={finSec===s}>{l}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["ربعي","ربعي"],["سنوي","سنوي (5 سنوات)"]].map(([p2,l])=>(
            <button key={p2} onClick={()=>setFinPer(p2)} style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${finPer===p2?C.gold+"44":C.line}`, cursor:"pointer", background:finPer===p2?C.gold+"10":"transparent", color:finPer===p2?C.gold:C.smoke, fontWeight:finPer===p2?800:500, fontSize:12, fontFamily:"Cairo,sans-serif", minHeight:44, lineHeight:1.5 }} aria-pressed={finPer===p2}>{l}</button>
          ))}
        </div>

        {data.length===0 ? <EmptyState icon="📋" title="لا توجد بيانات مالية" subtitle="البيانات غير متوفرة لهذا القسم"/> : (
          <SectionCard>
            <div style={{ overflowX:"auto" }}>
              <div style={{ minWidth: Math.max(400, displayData.length*90+140) }}>
                {/* Header */}
                <div style={{ display:"grid", gridTemplateColumns:`140px ${displayData.map(()=>"1fr").join(" ")}`, background:C.layer3, borderBottom:`1px solid ${C.line}44`, direction:"rtl" }}>
                  <div style={{ padding:"8px 12px", fontSize:11, color:C.smoke, fontWeight:700, lineHeight:1.5 }}>البيان</div>
                  {displayData.map((r,i)=><div key={i} style={{ padding:"8px 6px", fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:i===0?C.electric:C.smoke, fontWeight:i===0?800:500, textAlign:"center", lineHeight:1.5 }}>{r.p}</div>)}
                </div>
                {/* Rows */}
                {cols.map((col,ci) => {
                  const vals = displayData.map(r=>r[col.k]);
                  const maxV = Math.max(...vals.map(v=>Math.abs(v||0)));
                  return (
                    <div key={ci} style={{ display:"grid", gridTemplateColumns:`140px ${displayData.map(()=>"1fr").join(" ")}`, borderBottom:`1px solid ${C.line}22`, background:ci%2===0?"transparent":"rgba(255,255,255,.02)", direction:"rtl" }}>
                      <div style={{ padding:"10px 12px", display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:3, height:14, background:col.col, borderRadius:2, flexShrink:0 }}/>
                        <div>
                          <span style={{ fontSize:11, fontWeight:700, color:col.col, lineHeight:1.4 }}>{col.l}</span>
                          {vals.filter(v=>v!=null).length>=3 && (()=>{
                            const sv=vals.filter(v=>v!=null);
                            const mn2=Math.min(...sv.map(v=>Math.abs(v))),mx2=Math.max(...sv.map(v=>Math.abs(v)));
                            const rng2=mx2-mn2||1;
                            const W2=40,H2=14;
                            const pts2=sv.map((v,i)=>`${(i/(sv.length-1))*W2},${H2-(Math.abs(v)-mn2)/rng2*(H2-2)}`).join(" ");
                            const trend=sv[0]!=null&&sv[sv.length-1]!=null?sv[sv.length-1]>sv[0]:true;
                            return <svg width={W2} height={H2} style={{display:"block",marginTop:1}}><polyline points={pts2} fill="none" stroke={trend?C.mint:C.coral} strokeWidth="1.5" opacity="0.7"/></svg>;
                          })()}
                        </div>
                      </div>
                      {vals.map((v,vi) => {
                        const pctBar = maxV>0?Math.min(100,(Math.abs(v||0)/maxV)*100):0;
                        const isPos = (v||0)>=0;
                        //
                        const prevYearVal = vals[vi+4]; // ربع السنة الماضية (4 أرباع للخلف)
                        const yoy = prevYearVal && prevYearVal!==0 && v!=null
                          ? parseFloat(((v-prevYearVal)/Math.abs(prevYearVal)*100).toFixed(1))
                          : null;
                        return (
                          <div key={vi} style={{ padding:"6px 4px", textAlign:"center", borderRight:`1px solid ${C.line}22` }}>
                            <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:vi===0?900:500, color:vi===0?col.col:C.smoke, lineHeight:1.5 }}>{v!=null?col.fmt(v):"—"}</div>
                            {yoy!==null && vi<4 && (
                              <div style={{ fontSize:9, fontWeight:700, color:yoy>=0?C.mint:C.coral, lineHeight:1.3 }}>
                                {yoy>=0?"+":""}{yoy}%
                              </div>
                            )}
                            <div style={{ height:2, background:C.layer3, borderRadius:1, margin:"2px 4px 0", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${pctBar}%`, background:isPos?col.col:C.coral, borderRadius:1 }}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    );
  };

  // ─── EarningsPane ─────────────────────────────────────────────
  const EarningsPane = () => {
    if (!earnings||earnings.length===0) return <EmptyState title="لا توجد بيانات" subtitle="لا توجد ارباح"/>;
    const latest = earnings.find(e=>!e.future);
    const W=300, H=100, barW=20, gap=34;
    const chartData = earnings.filter(e=>!e.future);
    const epsVals = chartData.map(e=>e.eps||0);
    const epsMax = Math.max(...epsVals), epsMin = Math.min(...epsVals);
    // نضيف هامش 15% فوق وتحت
    const pad = (epsMax - epsMin) * 0.2 || 0.1;
    const yMax = epsMax + pad, yMin = epsMin - pad;
    const epsRng = yMax - yMin || 1;
    const epsW=280, epsH=60;
    const toX = i => parseFloat((i / (chartData.length-1 || 1) * (epsW-8) + 4).toFixed(1));
    const toY = v => parseFloat((epsH - ((v - yMin) / epsRng) * (epsH - 8) - 4).toFixed(1));
    const revMax = Math.max(...chartData.map(e=>e.rev||0))*1.15||1;
    const avgSurprise = chartData.filter(e=>e.surprise!=null).reduce((a,e)=>a+e.surprise,0)/(chartData.filter(e=>e.surprise!=null).length||1);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {chartData.length>1 && (
          <SectionCard title="اتجاه ربحية السهم (EPS)" accent={C.mint}>
            <div style={{ padding:"10px 16px" }}>
              <svg width="100%" viewBox={"0 0 "+epsW+" "+(epsH+24)} style={{display:"block", overflow:"visible"}}>
                {/* خط baseline عند 0 إذا كان ضمن النطاق */}
                {yMin<0 && yMax>0 && (
                  <line x1={4} y1={toY(0)} x2={epsW-4} y2={toY(0)}
                    stroke={C.line} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5"/>
                )}
                {/* خطوط دليلية أفقية */}
                {[0.25,0.5,0.75].map((t,i)=>(
                  <line key={i} x1={4} y1={4+t*(epsH-8)} x2={epsW-4} y2={4+t*(epsH-8)}
                    stroke={C.line} strokeWidth="0.3" opacity="0.3"/>
                ))}
                {/* منطقة تحت الخط */}
                {chartData.length>1 && (()=>{
                  const pts = chartData.map((e,i)=>`${toX(i)},${toY(e.eps||0)}`).join(" ");
                  const area = `${toX(0)},${toY(yMin)} ${pts} ${toX(chartData.length-1)},${toY(yMin)}`;
                  return <polygon points={area} fill={C.mint} opacity="0.08"/>;
                })()}
                {/* الخطوط بين النقاط */}
                {chartData.map((e,i)=>{
                  if(i===0) return null;
                  const col = (e.eps||0)>=(chartData[i-1]?.eps||0) ? C.mint : C.coral;
                  return <line key={i}
                    x1={toX(i-1)} y1={toY(chartData[i-1]?.eps||0)}
                    x2={toX(i)}   y2={toY(e.eps||0)}
                    stroke={col} strokeWidth="2" strokeLinecap="round"/>;
                })}
                {/* النقاط والتسميات */}
                {chartData.map((e,i)=>{
                  const cx=toX(i), cy=toY(e.eps||0);
                  const isLast=i===chartData.length-1;
                  const col=isLast?C.gold:C.mint;
                  const labelY = cy > 16 ? cy-7 : cy+14;
                  return <g key={i}>
                    {/* ظل للنقطة */}
                    {isLast && <circle cx={cx} cy={cy} r="7" fill={C.gold} opacity="0.15"/>}
                    <circle cx={cx} cy={cy} r={isLast?4.5:3}
                      fill={col} stroke={C.layer1} strokeWidth="1.5"/>
                    {/* قيمة EPS */}
                    <text x={cx} y={labelY} textAnchor="middle"
                      fill={col} fontSize={isLast?"9":"8"}
                      fontWeight={isLast?"900":"700"}
                      fontFamily="IBM Plex Mono,monospace">{e.eps}</text>
                    {/* اسم الربع */}
                    <text x={cx} y={epsH+16} textAnchor="middle"
                      fill={C.smoke} fontSize="8"
                      fontFamily="Cairo,sans-serif">{e.q}</text>
                    {/* مؤشر beat/miss */}
                    {e.beat!=null && (
                      <text x={cx} y={epsH+24} textAnchor="middle"
                        fill={e.beat?C.mint:C.coral} fontSize="7">
                        {e.beat?"▲":"▼"}
                      </text>
                    )}
                  </g>;
                })}
              </svg>
              {/* ملخص سريع */}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:10 }}>
                <span style={{ color:C.smoke }}>{"أحدث EPS: "}
                  <span style={{ color:C.gold, fontFamily:"IBM Plex Mono,monospace", fontWeight:700 }}>
                    {chartData[chartData.length-1]?.eps}
                  </span>
                </span>
                <span style={{ color:epsVals[epsVals.length-1]>=epsVals[0]?C.mint:C.coral }}>
                  {epsVals[0]>0
                    ? ((epsVals[epsVals.length-1]/epsVals[0]-1)*100).toFixed(0)+"%"
                    : ""}
                </span>
              </div>
            </div>
          </SectionCard>
        )}
        <SectionCard title="آخر إصدار للأرباح" accent={C.gold}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, padding:"12px 16px" }}>
            {[
              {l:"الإيرادات",v:latest?.rev?latest.rev+" B":"—",col:C.mint,
               sub:latest?.rev&&latest?.revEst?'توقع: '+latest.revEst+'B':null},
              {l:"ربحية السهم",v:latest?.eps?latest.eps+" ر.س":"—",col:C.electric,
               sub:latest?.epsEst?'توقع: '+latest.epsEst:null},
              {l:"مفاجأة الأرباح",v:avgSurprise>=0?`+${avgSurprise.toFixed(1)}%`:avgSurprise.toFixed(1)+"%",
               col:avgSurprise>=0?C.mint:C.coral,
               sub:chartData.filter(e=>e.eps>=e.epsEst).length+'/'+chartData.length+' تجاوزت'},
            ].map((item,i)=>(
              <div key={i} style={{ background:item.col+"12", borderRadius:10, border:`1px solid ${item.col}25`, padding:"9px 6px", textAlign:"center" }}>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:16, fontWeight:900, color:item.col, lineHeight:1 }}>{item.v}</div>
                <div style={{ fontSize:10, color:C.smoke, marginTop:3, lineHeight:1.4 }}>{item.l}</div>
                {item.sub && <div style={{ fontSize:10, color:item.col, lineHeight:1.4, fontWeight:600 }}>{item.sub}</div>}
              </div>
            ))}
          </div>
          {/* موعد الإصدار القادم */}
          {earnings.find(e=>e.future) && (
            <div style={{ margin:"0 16px 10px", padding:"7px 12px", background:C.gold+"10", border:`1px solid ${C.gold}33`, borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.smoke }}>الإصدار القادم</span>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.gold, fontWeight:700 }}>{earnings.find(e=>e.future)?.date}</span>
                <Tag text="مرتقب" color={C.gold}/>
              </div>
            </div>
          )}
        </SectionCard>

        {/* رسم تاريخي للإيرادات والأرباح — متعدد السنوات */}
        <SectionCard title="الأداء المالي التاريخي — 5 سنوات" accent={C.electric}>
          <div style={{ padding:"10px 12px 6px" }}>
            {(()=>{
              const annualData = fullFin.income?.annual||[];
              const W2=300, H2=90, n=annualData.length;
              if(!n) return null;
              const revMax=Math.max(...annualData.map(d=>d.rev||0))*1.15||1;
              const netMax=Math.max(...annualData.map(d=>d.net||0))*1.15||1;
              const xOf=i=>20+i*(260/(n-1||1));
              const revPts=annualData.map((d,i)=>({x:xOf(i),y:H2-((d.rev||0)/revMax)*(H2*0.82)}));
              const revPath=revPts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
              return (
                <svg width="100%" viewBox={`0 0 ${W2} ${H2+28}`} style={{display:"block",overflow:"visible"}}>
                  <defs>
                    <linearGradient id="histGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.electric} stopOpacity=".25"/>
                      <stop offset="100%" stopColor={C.electric} stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {n>1&&<path d={`${revPath} L${revPts[n-1].x},${H2} L${revPts[0].x},${H2} Z`} fill="url(#histGrad2)"/>}
                  {n>1&&<path d={revPath} fill="none" stroke={C.electric} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
                  {annualData.map((d,i)=>{
                    const cx=xOf(i);
                    const nh=((d.net||0)/netMax)*(H2*0.6);
                    const yoy=i>0?((d.rev-annualData[i-1].rev)/annualData[i-1].rev*100).toFixed(1):null;
                    const revY=revPts[i].y; // موضع نقطة الإيرادات
                    const yoyCol=parseFloat(yoy)>=0?C.mint:C.coral;
                    return (
                      <g key={i}>
                        {/* عمود صافي الربح */}
                        <rect x={cx-10} y={H2-nh} width={20} height={nh}
                          fill={d.net>=0?C.mint:C.coral} opacity="0.75" rx="2"/>
                        {/* نسبة YoY فوق نقطة الإيرادات */}
                        {yoy&&<text x={cx} y={Math.max(8,revY-6)}
                          textAnchor="middle" fill={yoyCol}
                          fontSize="7" fontWeight="700">
                          {parseFloat(yoy)>=0?"+":""}{yoy}{"%"}
                        </text>}
                        {/* نقطة الإيرادات */}
                        <circle cx={revPts[i].x} cy={revPts[i].y} r="3"
                          fill={C.electric} stroke={C.ink} strokeWidth="1"/>
                        {/* السنة */}
                        <text x={cx} y={H2+12} textAnchor="middle"
                          fill={C.smoke} fontSize="8" fontFamily="IBM Plex Mono,monospace">{d.p}</text>
                        {/* قيمة الإيرادات */}
                        <text x={cx} y={H2+22} textAnchor="middle"
                          fill={C.mist} fontSize="7">
                          {d.rev?`${(d.rev/1000).toFixed(1)}T`:""}
                        </text>
                      </g>
                    );
                  })}
                  <line x1={0} y1={H2} x2={W2} y2={H2} stroke={C.line} strokeWidth=".5"/>
                </svg>
              );
            })()}
            <div style={{display:"flex",gap:14,marginTop:4,fontSize:10,color:C.smoke}}>
              <span><span style={{display:"inline-block",width:14,height:2,background:C.electric,marginLeft:4,verticalAlign:"middle"}}/>إيرادات</span>
              <span><span style={{display:"inline-block",width:8,height:8,background:C.mint,borderRadius:2,marginLeft:4}}/>صافي ربح</span>
              <span><span style={{display:"inline-block",width:20,fontSize:9,color:C.mint,marginLeft:2}}>+%</span><span style={{fontSize:9,color:C.coral}}>-%</span>{" نمو YoY"}</span>
            </div>
          </div>
        </SectionCard>

      {/* رسم EPS vs توقعات */}
        <SectionCard title="الإيرادات وربحية السهم — مقابل التوقعات">
          <div style={{ padding:"12px 12px 6px" }}>
            <div style={{ display:"flex", gap:12, marginBottom:8, fontSize:11, color:C.smoke, lineHeight:1.5, flexWrap:"wrap", alignItems:"center" }}>
              <span><span style={{ display:"inline-block",width:8,height:8,background:C.electric,borderRadius:2,marginLeft:4 }}/>إيرادات</span>
              <span><span style={{ display:"inline-block",width:8,height:8,background:C.plasma,borderRadius:2,marginLeft:4 }}/>{"EPS"}</span>
              <span><span style={{ display:"inline-block",width:12,height:2,background:C.gold,marginLeft:4,verticalAlign:"middle" }}/>تقدير</span>
              <span><span style={{ display:"inline-block",width:8,height:8,background:C.mint,borderRadius:"50%",marginLeft:4 }}/>تجاوز</span>
              <span><span style={{ display:"inline-block",width:8,height:8,background:C.coral,borderRadius:"50%",marginLeft:4 }}/>أخفق</span>
            </div>
            <svg width="100%" viewBox={`-52 0 ${W+52} ${H+32}`} style={{ overflow:"visible",display:"block" }}>
              <defs>
                <linearGradient id="epgR" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.electric} stopOpacity="1"/><stop offset="100%" stopColor={C.electric} stopOpacity="0.3"/></linearGradient>
                <linearGradient id="epgE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.plasma} stopOpacity="1"/><stop offset="100%" stopColor={C.plasma} stopOpacity="0.3"/></linearGradient>
              </defs>
              {/* المحور الرأسي */}
              <line x1={4} y1={4} x2={4} y2={H+2} stroke={C.line} strokeWidth="1"/>
              {/* تسميات المحور Y — على اليسار */}
              {[0,0.33,0.66,1].map((t,i)=>{
                const y=H*(1-t*0.88);
                const v=t*revMax;
                const lbl=v>=1000?(v/1000).toFixed(1)+"T":Math.round(v)+"B";
                return (
                  <g key={i}>
                    <line x1={4} y1={y} x2={W-4} y2={y} stroke={C.line} strokeWidth={i===0?1:0.4} strokeDasharray={i===0?"none":"3,3"} opacity="0.5"/>
                    <text x={0} y={y+3} textAnchor="end" fill={C.electric} fontSize="8" fontFamily="IBM Plex Mono,monospace">{lbl}</text>
                  </g>
                );
              })}
              {chartData.map((e,i)=>{
                const cx=12+i*gap+gap/2, rh=((e.rev||0)/revMax)*(H*0.85);
                const eh=Math.max(((e.eps-epsMin)/(epsMax-epsMin||1))*(H*0.7),2);
                const estH=Math.max(((e.epsEst-epsMin)/(epsMax-epsMin||1))*(H*0.7),2);
                const beat = e.eps >= e.epsEst;
                return (
                  <g key={i}>
                    <rect x={cx-barW/2} y={H-rh} width={barW*0.55} height={rh} fill="url(#epgR)" rx="2" opacity="0.9"/>
                    <rect x={cx-barW/2+barW*0.58} y={H-eh} width={barW*0.38} height={eh} fill="url(#epgE)" rx="2" opacity="0.9"/>
                    <line x1={cx-barW/2-3} y1={H-estH} x2={cx+barW/2+3} y2={H-estH} stroke={C.gold} strokeWidth="2" strokeLinecap="round"/>
                    <circle cx={cx} cy={H-eh-6} r="4" fill={beat?C.mint:C.coral} opacity="0.9"/>
                    <text x={cx} y={H+16} textAnchor="middle" fill={C.smoke} fontSize="8" fontFamily="IBM Plex Mono,monospace">{e.period}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </SectionCard>

        {/* جدول الأرباح التفصيلي */}
        <SectionCard title="تاريخ إصدار الأرباح" accent={C.electric}>
          <div style={{ display:"grid", gridTemplateColumns:"1.2fr 0.7fr 1fr 1fr 0.8fr", padding:"8px 16px", background:C.layer3, borderBottom:`1px solid ${C.line}44` }}>
            {["تاريخ الإصدار","الفترة","EPS (فعلي/توقع)","إيرادات (فعلي/توقع)","مفاجأة"].map((h,i)=><span key={i} style={{ fontSize:11, color:C.smoke, fontWeight:700, textAlign:"center", lineHeight:1.5 }}>{h}</span>)}
          </div>
          {earnings.map((e,i)=>{
            const beat = e.eps!=null && e.epsEst && e.eps>=e.epsEst;
            const surpColor = e.surprise!=null?(e.surprise>=0?C.mint:C.coral):C.smoke;
            return (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"1.2fr 0.7fr 1fr 1fr 0.8fr", padding:"10px 16px", borderBottom:i<earnings.length-1?`1px solid ${C.line}22`:0, background:i%2?"rgba(255,255,255,.015)":"transparent", alignItems:"center" }}>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:700, color:e.future?C.gold:C.mist, lineHeight:1.5 }}>{e.date}</div>
                <div style={{ fontSize:11, color:C.smoke, textAlign:"center", lineHeight:1.5 }}>{e.period}</div>
                <div style={{ textAlign:"center" }}>
                  {e.future ? <Tag text="مرتقب" color={C.gold}/> : (
                    <div>
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:700, color:beat?C.mint:C.coral, lineHeight:1.5 }}>{e.eps}</div>
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.smoke, lineHeight:1.4 }}>{"توقع: "}{e.epsEst}</div>
                    </div>
                  )}
                </div>
                <div style={{ textAlign:"center" }}>
                  {e.future ? <span style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>{e.revEst}B</span> : (
                    <div>
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:700, color:(e.rev||0)>=(e.revEst||0)?C.mint:C.coral, lineHeight:1.5 }}>{e.rev}B</div>
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.smoke, lineHeight:1.4 }}>{"توقع: "}{e.revEst}B</div>
                    </div>
                  )}
                </div>
                <div style={{ textAlign:"center" }}>
                  {e.surprise!=null ? <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:700, color:surpColor, lineHeight:1.5 }}>{e.surprise>=0?"+":""}{e.surprise}%</span> : <span style={{ color:C.smoke, fontSize:11, lineHeight:1.5 }}>—</span>}
                </div>
              </div>
            );
          })}
        </SectionCard>

        {/* التوزيعات */}
        <SectionCard title="توزيعات الأرباح" accent={C.gold}>
          <div style={{ padding:"10px 16px 4px", display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              {l:"عائد التوزيع", v:stk.divYld+"%", c:C.gold},
              {l:"نسبة التوزيع", v:stk.payoutRatio+"%", c:C.amber},
              {l:"نمو 3 سنوات", v:"+"+stk.divGrowth3y+"%", c:C.mint},
              {l:"سنوات متواصلة", v:stk.divStreak, c:C.electric},
            ].filter(item=>item.v&&item.v!=="undefined%").map((item,i)=>(
              <div key={i} style={{ flex:1, minWidth:70, background:item.c+"12", borderRadius:9, padding:"8px 10px", textAlign:"center", border:`1px solid ${item.c}25` }}>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:15, fontWeight:900, color:item.c, lineHeight:1 }}>{item.v}</div>
                <div style={{ fontSize:11, color:C.smoke, marginTop:3, lineHeight:1.4 }}>{item.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 0.8fr 0.8fr 0.8fr 0.8fr", padding:"8px 16px", background:C.layer3, borderBottom:`1px solid ${C.line}44`, marginTop:8 }}>
            {["تاريخ الدفع","تاريخ الاستحقاق","التوزيع","العائد%","النوع"].map((h,i)=><span key={i} style={{ fontSize:11, color:C.smoke, fontWeight:700, textAlign:"center", lineHeight:1.5 }}>{h}</span>)}
          </div>
          {divDetails.map((d,i)=>(
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 0.8fr 0.8fr 0.8fr 0.8fr", padding:"9px 16px", borderBottom:i<divDetails.length-1?`1px solid ${C.line}22`:0, background:i%2?"rgba(255,255,255,.015)":"transparent", alignItems:"center" }}>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.smoke, textAlign:"center", lineHeight:1.5 }}>{d.date}</span>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.smoke, textAlign:"center", lineHeight:1.5 }}>{d.exDate}</span>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:900, color:C.gold, textAlign:"center", textShadow:`0 0 6px ${C.gold}44`, lineHeight:1.5 }}>{d.div}</span>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.mist, textAlign:"center", lineHeight:1.5 }}>{d.yld?.toFixed(2)}%</span>
              <div style={{ textAlign:"center" }}><Tag text={d.type} color={C.gold}/></div>
            </div>
          ))}
        </SectionCard>

      </div>
    );
  };

  // ─── DupontPane ──────────────────────────────────────────────
  const DupontPane = () => {
    const netM  = stk.netMargin  || 0;
    const assetT= stk.revenue && stk.totalAssets ? parseFloat((stk.revenue/stk.totalAssets).toFixed(2)) : 0.45;
    const levg  = stk.totalAssets && stk.equity ? parseFloat((stk.totalAssets/stk.equity).toFixed(2)) : (stk.debtEquity ? parseFloat((1+stk.debtEquity).toFixed(2)) : 1.61);
    const roe   = parseFloat((netM/100 * assetT * levg * 100).toFixed(1));
    const graham= stk.eps&&stk.bvps ? parseFloat(Math.sqrt(22.5*stk.eps*stk.bvps).toFixed(2)) : null;
    const grahamUpside = graham ? parseFloat(((graham-stk.p)/stk.p*100).toFixed(1)) : null;
    const eqScore = (()=>{
      let s=0;
      if(stk.netMargin>20) s+=20;
      if(stk.piotroski>=7) s+=25;
      if(stk.beneish<-2.22) s+=25;
      if(stk.currentRatio>=1.5) s+=15;
      if(stk.debtEquity<0.5) s+=15;
      return s;
    })();
    const eqC=eqScore>=70?C.mint:eqScore>=50?C.amber:C.coral;

    //
    const InfoBtn = ({ title, verdict, why, isGood, openUp=false }) => {
      const [open, setOpen] = useState(false);
      const col = isGood ? C.mint : C.coral;
      return (
        <div style={{ position:"relative" }}>
          <button
            data-noswipe="1"
            onClick={e=>{e.stopPropagation();setOpen(v=>!v);}}
            onTouchEnd={e=>{e.stopPropagation();e.preventDefault();setOpen(v=>!v);}}
            style={{ width:24, height:24, borderRadius:"50%", background:open?col+"33":C.layer3, border:`1px solid ${open?col:C.line}`, color:open?col:C.smoke, fontSize:12, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1, flexShrink:0, WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>{"?"}</button>
          {open && (
            <>
              <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, zIndex:100 }}/>
              <div data-noswipe="1" style={{
                position:"fixed",
                top:"50%", left:"50%",
                transform:"translate(-50%,-50%)",
                zIndex:200,
                width:"80vw", maxWidth:280,
                background:C.layer1,
                border:`1px solid ${col}55`,
                borderRadius:14,
                padding:"14px",
                boxShadow:`0 12px 40px rgba(0,0,0,.95)`
              }}>
                <div style={{ fontSize:12, fontWeight:800, color:col, marginBottom:8 }}>{title}</div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                  <span>{isGood?"✅":"⚠️"}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:col }}>{verdict}</span>
                </div>
                <div style={{ fontSize:11, color:C.mist, lineHeight:1.7, marginBottom:10 }}>{why}</div>
                <button data-noswipe="1" onClick={()=>setOpen(false)}
                  style={{ width:"100%", background:C.layer3, border:`1px solid ${C.line}`, borderRadius:7, padding:"6px", color:C.snow, fontSize:11, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>{"إغلاق"}</button>
              </div>
            </>
          )}
        </div>
      );
    };

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {/* Dupont Analysis */}
        <SectionCard title="تحليل Dupont — مكونات ROE" accent={C.plasma}>
          <div style={{ padding:"12px 16px" }}>
            {/* زر شرح Dupont */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:11, color:C.smoke }}>ROE = هامش × دوران الأصول × الرافعة</span>
              <InfoBtn
                title="تحليل Dupont — هل النتيجة جيدة؟"
                isGood={roe >= 15}
                verdict={roe>=20?"ROE ممتاز — كفاءة عالية":roe>=15?"ROE جيد — مقبول":roe>=10?"ROE متوسط — يمكن تحسينه":"ROE ضعيف — مشكلة في الكفاءة"}
                why={roe>=15
                  ? 'ROE '+roe+'% يعني الشركة تحقق '+roe+' ريال ربح لكل 100 ريال من حقوق المساهمين. '+levg>3?"تحذير: جزء كبير من الربح مدفوع بالرافعة المالية العالية.":"الرافعة معقولة والأرباح حقيقية."
                  : 'ROE '+roe+'% منخفض. '+netM<10?"الهامش الصافي ضعيف — الشركة لا تحتفظ بكافٍ من الإيرادات.":""+assetT<0.5?" دوران الأصول بطيء — الأصول غير مستغلة بكفاءة.":""}
              />
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              {[
                {l:"هامش صافي",v:netM+"%",c:C.mint},
                {l:"×",v:"",c:C.smoke},
                {l:"دوران الأصول",v:assetT+"x",c:C.electric},
                {l:"×",v:"",c:C.smoke},
                {l:"الرافعة",v:levg+"x",c:C.amber},
                {l:"=",v:"",c:C.smoke},
                {l:"ROE",v:roe+"%",c:roe>=15?C.mint:roe>=10?C.amber:C.coral},
              ].map((item,i)=>(
                item.l==="×"||item.l==="="
                  ? <span key={i} style={{ fontSize:16, color:C.smoke, fontWeight:300 }}>{item.l}</span>
                  : <div key={i} style={{ textAlign:"center", background:item.c+"12", borderRadius:8, padding:"6px 8px", border:`1px solid ${item.c}25` }}>
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:900, color:item.c }}>{item.v}</div>
                      <div style={{ fontSize:9, color:C.smoke, marginTop:1 }}>{item.l}</div>
                    </div>
              ))}
            </div>
            <div style={{ fontSize:10, color:C.smoke, lineHeight:1.6, padding:"6px 10px", background:C.layer3, borderRadius:8 }}>
              {netM}% × {assetT}x × {levg}x = <strong style={{color:roe>=15?C.mint:roe>=10?C.amber:C.coral}}>{roe}%</strong>
            </div>
          </div>
        </SectionCard>

        {/* Graham Number */}
        {graham && (
          <SectionCard title="رقم غراهام — Benjamin Graham" accent={grahamUpside>=0?C.mint:C.coral}>
            <div style={{ padding:"12px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:22, fontWeight:900, color:grahamUpside>=0?C.mint:C.coral }}>{graham} <span style={{ fontSize:11, color:C.smoke }}>ر.س</span></div>
                  <div style={{ fontSize:10, color:C.smoke }}>{"= √(22.5 × "}{stk.eps}{" × "}{stk.bvps}{")"}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:16, fontWeight:900, color:grahamUpside>=0?C.mint:C.coral }}>{grahamUpside>=0?"+":""}{grahamUpside}%</div>
                    <div style={{ fontSize:10, color:C.smoke }}>الهامش عن السعر</div>
                  </div>
                  <InfoBtn
                    title="رقم غراهام — هل السعر مناسب؟"
                    isGood={grahamUpside>=0}
                    verdict={grahamUpside>=20?"مقيّم بأقل من قيمته بشكل واضح":grahamUpside>=0?"مقيّم بأقل من قيمته":grahamUpside>=-20?"أعلى من القيمة المحافظة قليلاً":"أعلى بكثير من القيمة المحافظة"}
                    why={grahamUpside>=0
                      ? 'رقم غراهام '+graham+' أعلى من السعر الحالي '+stk.p+'. بمعنى أن غراهام كان سيعتبر هذا السهم صفقة جيدة. الهامش الآمن '+grahamUpside+'%.'
                      : 'السعر الحالي '+stk.p+' أعلى من رقم غراهام '+graham+'. المستثمر المحافظ يفضل انتظار تراجع السعر. لكن تذكر: غراهام وضع هذه المعادلة للشركات التقليدية وقد لا تنطبق على كل القطاعات.'}
                  />
                </div>
              </div>
              {(()=>{
                const minV=Math.min(stk.p,graham)*0.9;
                const maxV=Math.max(stk.p,graham)*1.1;
                const rng2=maxV-minV||1;
                const pPct=((stk.p-minV)/rng2*100).toFixed(0);
                const gPct=((graham-minV)/rng2*100).toFixed(0);
                return (
                  <div style={{ position:"relative", height:22, background:C.layer3, borderRadius:6, marginBottom:8, direction:"ltr", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:4, left:`${Math.min(pPct,gPct)}%`, height:14, width:`${Math.abs(pPct-gPct)}%`, background:grahamUpside>=0?C.mint+"44":C.coral+"44", borderRadius:3 }}/>
                    <div style={{ position:"absolute", top:"50%", left:`${pPct}%`, transform:"translate(-50%,-50%)", width:2, height:16, background:C.electric }}/>
                    <div style={{ position:"absolute", top:"50%", left:`${gPct}%`, transform:"translate(-50%,-50%)", width:2, height:16, background:grahamUpside>=0?C.mint:C.coral }}/>
                    <span style={{ position:"absolute", bottom:2, left:`${pPct}%`, transform:"translateX(-50%)", fontSize:7, color:C.electric }}>{"السعر"}</span>
                    <span style={{ position:"absolute", bottom:2, left:`${gPct}%`, transform:"translateX(-50%)", fontSize:7, color:grahamUpside>=0?C.mint:C.coral }}>{"غراهام"}</span>
                  </div>
                );
              })()}
              <div style={{ fontSize:10, color:C.smoke, lineHeight:1.6 }}>
                {"رقم غراهام هو الحد الأقصى المنطقي لسعر السهم المحافظ. "}<strong style={{color:grahamUpside>=0?C.mint:C.coral}}>{stk.p<graham?"السهم مقيم بأقل من قيمته":"السهم فوق القيمة المحافظة"}</strong>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Earnings Quality Score */}
        <SectionCard title="درجة جودة الأرباح" accent={eqC}>
          <div style={{ padding:"12px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:32, fontWeight:900, color:eqC, textShadow:`0 0 20px ${eqC}55` }}>{eqScore}</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Tag text={eqScore>=70?"جودة عالية":eqScore>=50?"جودة متوسطة":"جودة منخفضة"} color={eqC}/>
                <InfoBtn
                  title="درجة جودة الأرباح — ماذا تعني؟"
                  isGood={eqScore>=70}
                  verdict={eqScore>=70?"أرباح عالية الجودة وموثوقة":eqScore>=50?"أرباح مقبولة — بعض المخاوف":"أرباح منخفضة الجودة — احذر"}
                  why={eqScore>=70
                    ? 'الدرجة '+eqScore+'/100 تعني أن الشركة تحقق أرباحاً حقيقية نقدية وليست محاسبية فقط. هامش صافٍ قوي، لا تلاعب في الأرقام (بينيش)، وضع مالي متين.'
                    : eqScore>=50
                    ? 'الدرجة '+eqScore+'/100 مقبولة لكن توجد بعض نقاط الضعف. '+stk.piotroski<7?"بيوتروسكي أقل من 7 — جودة أرباح متوسطة. ":""+stk.beneish>=-2.22?"بينيش يشير لاحتمال تلاعب — تحقق من التفاصيل. ":""
                    : 'الدرجة '+eqScore+'/100 منخفضة. هذا يعني أن الأرباح قد لا تعكس الواقع الفعلي. ابحث في التفاصيل قبل الاستثمار.'}
                />
              </div>
            </div>
            <div style={{ height:6, background:C.layer3, borderRadius:3, overflow:"hidden", marginBottom:10 }}>
              <div style={{ height:"100%", width:`${eqScore}%`, background:`linear-gradient(90deg,${C.coral},${C.amber},${C.mint})`, borderRadius:3 }}/>
            </div>
            {[
              {l:"هامش صافي >20%",    ok:stk.netMargin>20,    pts:20, why:stk.netMargin>20?"الشركة تحتفظ بأكثر من 20% من الإيرادات كأرباح — ممتاز":"الهامش أقل من 20% — يحتاج مراجعة"},
              {l:"بيوتروسكي ≥7",       ok:stk.piotroski>=7,    pts:25, why:stk.piotroski>=7?"F-Score عالٍ يعني جودة مالية قوية وأرباح حقيقية":"F-Score منخفض — إشارة لضعف جودة الأرباح"},
              {l:"بينيش <-2.22",       ok:stk.beneish<-2.22,   pts:25, why:stk.beneish<-2.22?"لا مؤشر على تلاعب في الأرقام المحاسبية":"احتمال تلاعب في الأرقام — راجع التفاصيل"},
              {l:"نسبة التداول ≥1.5",  ok:stk.currentRatio>=1.5,pts:15, why:stk.currentRatio>=1.5?"الشركة قادرة على سداد التزاماتها قصيرة المدى":"نسبة سيولة منخفضة — خطر في المدى القصير"},
              {l:"الدين/ملكية <0.5",   ok:stk.debtEquity<0.5,  pts:15, why:stk.debtEquity<0.5?"ديون منخفضة نسبة لحقوق المساهمين — مستقر":"اعتماد عالٍ على الديون قد يضغط على الأرباح"},
            ].map((cr,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:i<4?`1px solid ${C.line}22`:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:12 }}>{cr.ok?"✓":"○"}</span>
                  <span style={{ fontSize:10, color:cr.ok?C.mist:C.smoke }}>{cr.l}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:cr.ok?C.mint:C.smoke }}>{cr.ok?"+"+cr.pts:"—"}</span>
                  <InfoBtn
                    title={cr.l}
                    isGood={cr.ok}
                    verdict={cr.ok?"✅ معيار محقق":"⚠️ معيار غير محقق"}
                    why={cr.why}
                    openUp={i>=3}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    );
  };

  const FSUBS = ["نظرة-عامة","مالية","أرباح","تحليل متقدم"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0, background:C.ink, minHeight:"100%" }}>
      <div style={{ flexShrink:0, background:`linear-gradient(180deg,${C.layer2},${C.deep})`, borderBottom:`1px solid ${C.line}55` }}>
        <div role="tablist" aria-label="أقسام الأساسي" style={{ display:"flex" }}>
          <SubBtn id="نظرة-عامة"    label="نظرة عامة"    icon="📊"/>
          <SubBtn id="مالية"  label="البيانات المالية" icon="💰"/>
          <SubBtn id="أرباح"    label="الأرباح"      icon="📈"/>
          <SubBtn id="تحليل متقدم" label="تحليل متقدم" icon="🔬"/>
        </div>
      </div>
      <div ref={subScrollRef} style={{ overflowY:"auto", flex:1, padding:"14px 16px 40px" }}>
        {fsub==="نظرة-عامة"   && <div key="ov"  className="sd-tabIn"><OverviewPane/></div>}
        {fsub==="مالية" && <div key="fin" className="sd-tabIn"><FinancialsPane/></div>}
        {fsub==="أرباح"   && <div key="ear" className="sd-tabIn"><EarningsPane/></div>}
        {fsub==="تحليل متقدم" && <div key="adv" className="sd-tabIn"><DupontPane/></div>}
      </div>
    </div>
  );
}
// ─── SDShareholders ──────────────────────────────────────────────

export { InfoTooltip, ValCard, SectorCompare, SDFundamental };
