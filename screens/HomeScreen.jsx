'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TasiChart from '../features/market/TasiChart';
import { useSharedPrices, useNav } from '../store';
import { useHaptic }          from '../hooks/useHaptic';
import { usePullToRefresh }   from '../hooks/usePullToRefresh';
import config from '../constants/config';
import { useMarketBridge } from '../hooks/useMarketBridge';
import { useOHLCVCache } from '../hooks/useOHLCVCache';

/* ─── Design tokens ─── */
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

/* ─── TOP BAR ─── */
function TopBar({idx, chgP}) {
  return (
    <div style={{
      padding:"12px 14px 10px", display:"flex", alignItems:"center",
      justifyContent:"space-between", background:BG,
      position:"sticky", top:0, zIndex:50,
      borderBottom:"1px solid rgba(255,255,255,.05)",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        <div style={{
          width:38, height:38, background:GOLD, borderRadius:10,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 10px rgba(245,158,11,.35)",
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
            <polyline points="4,16 8,10 12,13 17,7 20,9"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:15, fontWeight:900, color:T1, lineHeight:1}}>
            <span style={{color:GOLD}}>+</span>تداول
          </div>
          <div style={{fontSize:8, color:T3, letterSpacing:"1.3px", marginTop:1}}>SAUDI MARKET</div>
        </div>
      </div>
      <div style={{
        background:CARD2, borderRadius:22, padding:"6px 15px",
        display:"flex", alignItems:"center", gap:7,
        border:"1px solid rgba(255,255,255,.07)",
      }}>
        <div style={{width:7, height:7, borderRadius:"50%", background:GOLD, animation:"blink 2s infinite"}}/>
        <span style={{fontSize:13, fontWeight:800, color:T1, letterSpacing:"-.3px", direction:"ltr"}}>
          {idx ? idx.toLocaleString("en-US", {minimumFractionDigits:2}) : "—"}
        </span>
        <span style={{fontSize:12, color:chgP>=0?G:R, fontWeight:700}}>
          {chgP>=0?"+":""}{chgP}%
        </span>
      </div>
    </div>
  );
}

/* ─── STOCK ROW ─── */
const StockRow = React.memo(function StockRow({s, rank}) {
  const { openStock } = useNav();
  const up = (s.pct||0) >= 0;
  return (
    <div onClick={() => openStock(s)} style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"11px 0", borderBottom:"1px solid rgba(255,255,255,.04)", cursor:"pointer",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0}}>
        <div style={{
          width:42, height:42, borderRadius:10, flexShrink:0,
          background:CARD2, border:"1px solid rgba(255,255,255,.07)",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        }}>
          <span style={{fontSize:9, fontWeight:900, color:"#d1d5db"}}>{s.sym}</span>
          <span style={{fontSize:8, color:T3, marginTop:1}}>{rank}</span>
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13, fontWeight:700, color:T1, whiteSpace:"nowrap",
                       overflow:"hidden", textOverflow:"ellipsis"}}>{s.name}</div>
          <div style={{fontSize:10, color:T3}}>{s.sec}</div>
        </div>
      </div>
      <div style={{textAlign:"left", flexShrink:0}}>
        <div style={{fontSize:15, fontWeight:800, color:T1}}>{(s.p||0).toFixed(2)}</div>
        <div style={{
          fontSize:11, fontWeight:700, color:up?G:R,
          background:up?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
          padding:"2px 8px", borderRadius:6, marginTop:2, display:"inline-block",
          border:`1px solid ${up?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`,
        }}>{up?"+":""}{(s.pct||0).toFixed(2)}%</div>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════
   SECTOR SECTION — أداء القطاعات ببيانات حقيقية
══════════════════════════════════════════════════════ */
function SectorSection({liveStocks=[]}) {
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("perf");

  const SECTOR_COLORS = {
    "بنوك":"#4d9fff","طاقة":"#f97316","بتروكيماويات":"#a78bfa",
    "تقنية":"#22d3ee","تجزئة":"#34d399","أغذية":"#10b981",
    "تأمين":"#818cf8","عقارات":"#fb7185","سياحة":"#fbbf24",
    "لوجستية":"#94a3b8","رعاية صحية":"#f472b6","مواد بناء":"#78716c",
    "صناعة":"#6b7280","تعدين":"#f0c050","طاقة متجددة":"#6ee7b7",
    "زراعة":"#4ade80","نقل وخدمات":"#60a5fa","تعليم":"#f472b6",
    "إعلام":"#94a3b8","خدمات":"#94a3b8","خدمات مالية":"#a78bfa",
  };

  const sectorData = useMemo(() => {
    const map = {};
    liveStocks.forEach(s => {
      const sec = s.sec || "أخرى";
      if (!map[sec]) map[sec] = { name:sec, stocks:[] };
      map[sec].stocks.push(s);
    });
    return Object.values(map).map(sec => {
      const stocks = sec.stocks;
      const totalVol = stocks.reduce((a,s) => a+(s.v||0), 0);
      const weightedPct = totalVol > 0
        ? stocks.reduce((a,s) => a+(s.pct||0)*(s.v||0), 0) / totalVol
        : stocks.reduce((a,s) => a+(s.pct||0), 0) / (stocks.length||1);
      let dpiIn=0, dpiOut=0;
      stocks.forEach(s => {
        const dpi = (s.v||0)*(s.p||0)*Math.abs(s.pct||0)/100;
        if ((s.pct||0)>0) dpiIn+=dpi; else if ((s.pct||0)<0) dpiOut+=dpi;
      });
      const netFlow = dpiIn-dpiOut;
      const activeFlow = dpiIn+dpiOut||1;
      const dominance = (dpiIn/activeFlow)*100;
      const adv = stocks.filter(s=>(s.pct||0)>0).length;
      const dec = stocks.filter(s=>(s.pct||0)<0).length;
      const pc = SECTOR_COLORS[sec.name]||"#94a3b8";
      return {
        name:sec.name, stocks, pc,
        pct:+weightedPct.toFixed(2),
        totalVol, dpiIn, dpiOut, netFlow,
        frActive:+((netFlow/activeFlow)*100).toFixed(1),
        dominance:+dominance.toFixed(1),
        flowDir:netFlow>=0?"دخول":"خروج",
        flowCol:netFlow>=0?G:R,
        adv, dec,
        w:Math.max(3,Math.min(25,stocks.length/liveStocks.length*100*3)),
      };
    }).sort((a,b)=>b.pct-a.pct);
  }, [liveStocks]);

  const totalVolume = sectorData.reduce((a,s)=>a+s.totalVol,0)||1;
  const selSec = selected ? sectorData.find(s=>s.name===selected) : null;

  // Pie chart
  const cx=160, cy=88, rx=115, ry=65, dep=24;
  const slices = useMemo(()=>{
    let a=-Math.PI/2;
    const totalW = sectorData.reduce((s,x)=>s+x.w,0)||1;
    return sectorData.map(s=>{
      const sw=(s.w/totalW)*2*Math.PI, a1=a, a2=a+sw; a=a2;
      const x1=cx+rx*Math.cos(a1),y1=cy+ry*Math.sin(a1);
      const x2=cx+rx*Math.cos(a2),y2=cy+ry*Math.sin(a2);
      return {...s,x1,y1,x2,y2,lg:sw>Math.PI?1:0,mid:(a1+a2)/2};
    });
  },[sectorData]);

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 14px 6px"}}>
        <div style={{display:"flex",gap:4}}>
          {[{id:"perf",l:"الأداء"},{id:"flow",l:"التدفق"},{id:"bubble",l:"الفقاعة"}].map(v=>(
            <button key={v.id} onClick={()=>setViewMode(v.id)} style={{
              padding:"4px 10px",borderRadius:8,cursor:"pointer",
              fontFamily:"Cairo,sans-serif",fontSize:10,fontWeight:600,
              background:viewMode===v.id?GOLD+"20":"rgba(255,255,255,.04)",
              border:"1px solid "+(viewMode===v.id?GOLD+"50":"rgba(255,255,255,.07)"),
              color:viewMode===v.id?GOLD:T3,
            }}>{v.l}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:18,background:GOLD,borderRadius:2}}/>
          <span style={{fontSize:15,fontWeight:800,color:T1}}>أداء القطاعات</span>
        </div>
      </div>

      {/* Pie */}
      <div style={{display:"flex",justifyContent:"center",padding:"4px 0 8px"}}>
        <svg width="320" height="190" viewBox="0 0 320 190" style={{cursor:"pointer"}}>
          {slices.map((s,i)=>s.mid>0&&s.mid<Math.PI?(
            <path key={"d"+i}
              d={`M${s.x1},${s.y1} L${s.x1},${s.y1+dep} A${rx},${ry} 0 ${s.lg} 1 ${s.x2},${s.y2+dep} L${s.x2},${s.y2} A${rx},${ry} 0 ${s.lg} 0 ${s.x1},${s.y1}Z`}
              fill={s.pc} opacity={selected===s.name?0.75:0.38}/>
          ):null)}
          {slices.map((s,i)=>(
            <path key={"s"+i}
              onClick={()=>setSelected(sel=>sel===s.name?null:s.name)}
              d={`M${cx},${cy} L${s.x1},${s.y1} A${rx},${ry} 0 ${s.lg} 1 ${s.x2},${s.y2}Z`}
              fill={viewMode==="flow"?(s.netFlow>=0?s.pc:s.pc+"88"):s.pc}
              stroke={selected===s.name?"#fff":BG}
              strokeWidth={selected===s.name?2.5:1.5}
              opacity={selected&&selected!==s.name?0.4:1}
              transform={selected===s.name?`translate(${Math.cos(s.mid)*6},${Math.sin(s.mid)*6})`:""}
              style={{cursor:"pointer",transition:"all .25s"}}
            />
          ))}
          {viewMode==="flow"&&slices.map((s,i)=>{
            const midX=cx+rx*0.58*Math.cos(s.mid);
            const midY=cy+ry*0.58*Math.sin(s.mid);
            return(
              <g key={"fl"+i}>
                <text x={midX} y={midY-4} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700" fontFamily="Cairo">
                  {s.flowDir==="دخول"?"↑":"↓"}
                </text>
              </g>
            );
          })}
          <text x={cx} y={cy-5} textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Cairo">القطاعات</text>
          <text x={cx} y={cy+12} textAnchor="middle" fill={T2} fontSize="9" fontFamily="Cairo">
            {viewMode==="flow"?"تدفق رأس المال":"السوق السعودي"}
          </text>
        </svg>
      </div>

      {/* Selected sector card */}
      {selected&&selSec&&(
        <div style={{
          margin:"0 12px 10px",
          background:selSec.pc+"16",borderRadius:16,
          padding:"12px 14px",
          border:"1px solid "+selSec.pc+"45",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:selSec.pc}}/>
              <span style={{fontSize:10,color:T2}}>{selSec.stocks.length} سهم</span>
              <span style={{fontSize:10,color:G}}>{selSec.adv}↑</span>
              <span style={{fontSize:10,color:R}}>{selSec.dec}↓</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,color:selSec.pct>=0?G:R,fontWeight:700}}>
                {selSec.pct>=0?"+":""}{selSec.pct}%
              </span>
              <span style={{fontSize:15,fontWeight:800,color:T1}}>{selSec.name}</span>
            </div>
          </div>

          {/* تدفق */}
          <div style={{background:"rgba(0,0,0,.2)",borderRadius:10,padding:"10px 12px",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:9,color:selSec.flowCol,fontWeight:700,
                background:selSec.flowCol+"18",borderRadius:5,padding:"2px 7px"}}>
                {selSec.flowDir} {selSec.flowDir==="دخول"?"↑":"↓"}
              </span>
              <span style={{fontSize:11,fontWeight:700,color:T1}}>تدفق رأس المال</span>
            </div>
            <div style={{height:8,background:"rgba(255,255,255,.06)",borderRadius:4,overflow:"hidden",display:"flex",marginBottom:5}}>
              <div style={{width:selSec.dominance+"%",background:"linear-gradient(90deg,"+G+"80,"+G+")",borderRadius:4}}/>
              <div style={{flex:1,background:"linear-gradient(90deg,"+R+"80,"+R+")"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T3}}>
              <span style={{color:R}}>{(100-selSec.dominance).toFixed(0)}% خروج</span>
              <span style={{color:G}}>{selSec.dominance.toFixed(0)}% دخول</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:8}}>
              {[
                {l:"صافي التدفق",v:(selSec.netFlow>=0?"+":"")+(selSec.netFlow/1e6).toFixed(2)+"م",c:selSec.flowCol},
                {l:"الدخول",v:(selSec.dpiIn/1e6).toFixed(2)+"م",c:G},
                {l:"الخروج",v:(selSec.dpiOut/1e6).toFixed(2)+"م",c:R},
              ].map((m,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.05)",borderRadius:7,padding:"6px 8px",textAlign:"center"}}>
                  <div style={{fontSize:7.5,color:T3,marginBottom:2}}>{m.l}</div>
                  <div style={{fontSize:11,fontWeight:700,color:m.c}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* أسهم القطاع */}
                              {selSec.stocks.map((st,i)=>(
            <div key={i} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"7px 0",
              borderBottom:i<selSec.stocks.length-1?"1px solid rgba(255,255,255,.05)":"none",
            }}>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:700,color:(st.pct||0)>=0?G:R}}>
                  {(st.pct||0)>=0?"+":""}{(st.pct||0).toFixed(2)}%
                </div>
                <div style={{fontSize:10,color:T2}}>{(st.p||0).toFixed(2)} ر.س</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:700,color:T1}}>{st.name}</div>
                <div style={{fontSize:9,color:T3}}>{st.sym}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Performance View */}
      {viewMode==="perf"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,padding:"0 10px"}}>
          {sectorData.map((s,i)=>{
            const up=s.pct>=0;
            const bw=Math.min(88,Math.abs(s.pct)*18);
            const isSel=selected===s.name;
            return(
              <div key={i} onClick={()=>setSelected(sel=>sel===s.name?null:s.name)}
                style={{
                  padding:"10px 12px",cursor:"pointer",
                  borderBottom:"1px solid rgba(255,255,255,.04)",
                  background:isSel?s.pc+"12":"transparent",
                  borderRadius:isSel?8:0,
                }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:700,color:up?G:R}}>
                    {up?"+":""}{s.pct}%
                  </span>
                  <span style={{fontSize:11,fontWeight:600,color:isSel?T1:T2}}>{s.name}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:s.pc,flexShrink:0,
                    boxShadow:isSel?"0 0 6px "+s.pc:"none"}}/>
                  <div style={{flex:1,maxWidth:85,height:4,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:bw+"%",background:up?G:R,borderRadius:2}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flow View */}
      {viewMode==="flow"&&(
        <div style={{padding:"4px 12px 8px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:10,padding:"6px 10px",background:"rgba(255,255,255,.03)",borderRadius:8}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:R}}/>
              <span style={{fontSize:9,color:T3}}>خروج</span>
            </div>
            <span style={{fontSize:9,color:T3}}>تدفق رأس المال = حجم × |تغير%|</span>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,color:T3}}>دخول</span>
              <div style={{width:8,height:8,borderRadius:2,background:G}}/>
            </div>
          </div>
          {sectorData.map((sec,i)=>{
            const isSel=selected===sec.name;
            const inW=Math.max(4,sec.dominance);
            return(
              <div key={i} onClick={()=>setSelected(sel=>sel===sec.name?null:sec.name)}
                style={{
                  marginBottom:6,padding:"9px 11px",cursor:"pointer",
                  background:isSel?sec.pc+"12":CARD2,
                  borderRadius:11,border:"1px solid "+(isSel?sec.pc+"40":LN),
                }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:8.5,fontWeight:700,color:sec.flowCol,
                      background:sec.flowCol+"18",borderRadius:5,padding:"1px 7px",
                      border:"1px solid "+sec.flowCol+"30"}}>
                      {sec.flowDir} {sec.flowDir==="دخول"?"↑":"↓"}
                    </span>
                    <span style={{fontSize:9,color:T3}}>
                      {(sec.totalVol/totalVolume*100).toFixed(1)}% من السوق
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:11,fontWeight:700,color:sec.pct>=0?G:R}}>
                      {sec.pct>=0?"+":""}{sec.pct}% أداء
                    </span>
                    <div style={{width:8,height:8,borderRadius:2,background:sec.pc}}/>
                    <span style={{fontSize:12,fontWeight:700,color:T1}}>{sec.name}</span>
                  </div>
                </div>
                <div style={{display:"flex",height:7,borderRadius:4,overflow:"hidden",gap:1,marginBottom:4}}>
                  <div style={{width:inW+"%",background:"linear-gradient(90deg,"+G+"60,"+G+")",borderRadius:"4px 0 0 4px"}}/>
                  <div style={{flex:1,background:"linear-gradient(90deg,"+R+","+R+"60)",borderRadius:"0 4px 4px 0"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
                  <div style={{display:"flex",gap:10}}>
                    <span style={{fontSize:8,color:G}}>↑ {(sec.dpiIn/1e6).toFixed(2)}م ر.س</span>
                    <span style={{fontSize:8,color:R}}>↓ {(sec.dpiOut/1e6).toFixed(2)}م ر.س</span>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:sec.flowCol}}>
                    {sec.netFlow>=0?"+":""}{(sec.netFlow/1e6).toFixed(2)}م
                  </span>
                </div>
              </div>
            );
          })}
          {/* ملخص السوق */}
          <div style={{marginTop:8,padding:"10px 12px",background:"rgba(255,255,255,.03)",borderRadius:10,border:"1px solid rgba(255,255,255,.06)"}}>
            <div style={{fontSize:10,fontWeight:700,color:T2,marginBottom:6,textAlign:"right"}}>ملخص تدفق السوق</div>
            {(()=>{
              const totalIn=sectorData.reduce((s,f)=>s+f.dpiIn,0);
              const totalOut=sectorData.reduce((s,f)=>s+f.dpiOut,0);
              const net=totalIn-totalOut;
              const pct=(totalIn/(totalIn+totalOut||1)*100).toFixed(1);
              return(
                <div>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    {[
                      {l:"إجمالي الدخول",v:(totalIn/1e6).toFixed(1)+"م",c:G},
                      {l:"إجمالي الخروج",v:(totalOut/1e6).toFixed(1)+"م",c:R},
                      {l:"الصافي",v:(net/1e6>=0?"+":"")+(net/1e6).toFixed(1)+"م",c:net>=0?G:R},
                    ].map((m,i)=>(
                      <div key={i} style={{flex:1,background:"rgba(255,255,255,.04)",borderRadius:7,padding:"5px 7px",textAlign:"center"}}>
                        <div style={{fontSize:7.5,color:T3,marginBottom:1}}>{m.l}</div>
                        <div style={{fontSize:10,fontWeight:700,color:m.c}}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden",display:"flex"}}>
                    <div style={{width:pct+"%",background:"linear-gradient(90deg,"+G+"70,"+G+")",borderRadius:3}}/>
                    <div style={{flex:1,background:"linear-gradient(90deg,"+R+","+R+"70)"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:7.5,color:T3}}>
                    <span style={{color:R}}>{(100-parseFloat(pct)).toFixed(1)}% خروج</span>
                    <span style={{color:G}}>{pct}% دخول</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Bubble View */}
      {viewMode==="bubble"&&(
        <div style={{padding:"4px 12px 10px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",padding:"6px 0"}}>
            {sectorData.map((sec,i)=>{
              const volPct=sec.totalVol/totalVolume;
              const clamp=Math.max(64,Math.min(120,Math.round(60+volPct*300)));
              const up=sec.pct>=0;
              const isSel=selected===sec.name;
              return(
                <div key={i} onClick={()=>setSelected(sel=>sel===sec.name?null:sec.name)}
                  style={{
                    width:clamp,height:clamp,borderRadius:"50%",cursor:"pointer",
                    background:`radial-gradient(circle at 35% 35%, ${sec.pc}cc, ${sec.pc}88)`,
                    border:`2px solid ${isSel?"#fff":sec.pc+"55"}`,
                    boxShadow:isSel?`0 0 20px ${sec.pc}55`:`0 4px 14px ${sec.pc}30`,
                    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    transition:"all .2s",transform:isSel?"scale(1.08)":"scale(1)",position:"relative",
                  }}>
                  <div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",
                    background:sec.flowCol,display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:10,fontWeight:900,color:"#000",boxShadow:"0 0 6px "+sec.flowCol}}>
                    {sec.flowDir==="دخول"?"↑":"↓"}
                  </div>
                  <span style={{fontSize:Math.max(8,clamp/9),fontWeight:800,color:"#fff",textAlign:"center",lineHeight:1.2}}>{sec.name}</span>
                  <span style={{fontSize:Math.max(9,clamp/8),fontWeight:900,color:up?"#fff":"#fecaca",marginTop:3}}>
                    {up?"+":""}{sec.pct}%
                  </span>
                  <span style={{fontSize:Math.max(7,clamp/11),color:"rgba(255,255,255,.7)",marginTop:1}}>
                    {(sec.totalVol/1e6).toFixed(1)}م
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{textAlign:"center",fontSize:9,color:T3,marginTop:6}}>
            حجم الفقاعة = حجم التداول · السهم = اتجاه التدفق
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   FEAR & GREED INDEX — ببيانات حقيقية
══════════════════════════════════════════════════════ */
function FearGreedIndex({liveStocks=[]}) {
  const [expanded, setExpanded] = useState(false);
  const [activeComp, setActiveComp] = useState(null);

  const data = useMemo(()=>{
    const n=liveStocks.length||1;
    const adv=liveStocks.filter(s=>(s.pct||0)>0).length;
    const dec=liveStocks.filter(s=>(s.pct||0)<0).length;
    const unc=n-adv-dec;
    const strongUp=liveStocks.filter(s=>(s.pct||0)>1).length;
    const strongDn=liveStocks.filter(s=>(s.pct||0)<-1).length;
    const avgAbsPct=liveStocks.reduce((s,x)=>s+Math.abs(x.pct||0),0)/n;
    const avgPct=liveStocks.reduce((a,s)=>a+(s.pct||0),0)/n;
    const volUp=liveStocks.filter(s=>(s.pct||0)>0).reduce((a,s)=>a+(s.v||0),0);
    const volDn=liveStocks.filter(s=>(s.pct||0)<0).reduce((a,s)=>a+(s.v||0),0);
    const valUp=liveStocks.filter(s=>(s.pct||0)>0).reduce((a,s)=>a+(s.v||0)*(s.p||0),0);
    const valDn=liveStocks.filter(s=>(s.pct||0)<0).reduce((a,s)=>a+(s.v||0)*(s.p||0),0);
    const adLine=adv-dec;

    const momentumScore=Math.round(Math.min(100,Math.max(0,(adv/n)*100*1.4)));
    const strengthScore=Math.round(Math.min(100,Math.max(0,(strongUp/(strongUp+strongDn+1))*100)));
    const breadthScore=Math.round(Math.min(100,Math.max(0,50+(adLine/n)*100)));
    const volatilityScore=Math.round(Math.min(100,Math.max(0,100-avgAbsPct*20)));
    const liquidityScore=Math.round(Math.min(100,Math.max(0,volUp/((volUp+volDn)||1)*100)));
    const rsiScore=Math.round(Math.min(100,Math.max(0,50+avgPct*8)));
    const cmfScore=Math.round(Math.min(100,Math.max(0,valUp/((valUp+valDn)||1)*100)));

    const total=Math.round(
      momentumScore*0.20+strengthScore*0.15+breadthScore*0.15+
      volatilityScore*0.15+liquidityScore*0.15+rsiScore*0.10+cmfScore*0.10
    );

    return {
      total,adv,dec,unc,n,
      components:[
        {id:"momentum",label:"زخم السوق",weight:20,score:momentumScore,
          desc:`${adv} سهم صاعد من ${n}`,raw:`${(adv/n*100).toFixed(0)}% صاعد`},
        {id:"strength",label:"قوة السهم",weight:15,score:strengthScore,
          desc:`${strongUp} فوق +1% | ${strongDn} تحت -1%`,raw:"تغير أكثر من 1%"},
        {id:"breadth",label:"عرض السوق",weight:15,score:breadthScore,
          desc:`A/D = ${adLine>0?"+":""}${adLine}`,raw:"صاعد − هابط"},
        {id:"volatility",label:"التذبذب",weight:15,score:volatilityScore,
          desc:`متوسط |تغير| = ${avgAbsPct.toFixed(2)}%`,raw:"كلما انخفض = طمع"},
        {id:"liquidity",label:"سيولة السوق",weight:15,score:liquidityScore,
          desc:`حجم الصاعدة ${(volUp/1e6).toFixed(0)}م`,raw:"حجم صاعد / إجمالي"},
        {id:"rsi",label:"RSI المجمع",weight:10,score:rsiScore,
          desc:`متوسط التغير ${avgPct.toFixed(2)}%`,raw:"تقدير من pct الحالي"},
        {id:"cmf",label:"تدفق الأموال",weight:10,score:cmfScore,
          desc:`قيمة الصاعدة ${(valUp/1e9).toFixed(2)} مليار`,raw:"قيمة صاعد / إجمالي"},
            ],
    };
  },[liveStocks]);


  const score=data.total;

  function fgLabel(s){
    if(s>=80)return{ar:"طمع شديد",en:"Extreme Greed",col:"#1ee68a",bg:"rgba(34,197,94,.12)"};
    if(s>=60)return{ar:"طمع",en:"Greed",col:"#86efac",bg:"rgba(134,239,172,.1)"};
    if(s>=45)return{ar:"محايد",en:"Neutral",col:"#f0c050",bg:"rgba(245,158,11,.1)"};
    if(s>=25)return{ar:"خوف",en:"Fear",col:"#fb923c",bg:"rgba(251,146,60,.1)"};
    return{ar:"خوف شديد",en:"Extreme Fear",col:"#ff5f6a",bg:"rgba(239,68,68,.12)"};
  }

  const lbl=fgLabel(score);
  const R2=80,CX=100,CY=90;
  const deg=-180+(score/100)*180;
  const rad=(deg*Math.PI)/180;
  const nx=CX+(R2-10)*Math.cos(rad);
  const ny=CY+(R2-10)*Math.sin(rad);
  const ZONES=[
    {from:0,to:20,col:"#ff5f6a"},{from:20,to:40,col:"#fb923c"},
    {from:40,to:60,col:"#f0c050"},{from:60,to:80,col:"#86efac"},
    {from:80,to:100,col:"#1ee68a"},
  ];
  function arcPath(fromPct,toPct,r){
    const a1=((-180+fromPct*1.8)*Math.PI)/180;
    const a2=((-180+toPct*1.8)*Math.PI)/180;
    const x1=CX+r*Math.cos(a1),y1=CY+r*Math.sin(a1);
    const x2=CX+r*Math.cos(a2),y2=CY+r*Math.sin(a2);
    return`M ${x1} ${y1} A ${r} ${r} 0 ${toPct-fromPct>50?1:0} 1 ${x2} ${y2}`;
  }

  return(
    <div style={{margin:"12px 12px 0"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={()=>setExpanded(e=>!e)} style={{
          background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",
          borderRadius:8,padding:"4px 10px",cursor:"pointer",
          fontFamily:"Cairo,sans-serif",fontSize:9,fontWeight:600,color:T2,
        }}>
          {expanded?"إخفاء التفاصيل ▲":"عرض التفاصيل ▼"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:18,background:lbl.col,borderRadius:2}}/>
          <span style={{fontSize:15,fontWeight:800,color:T1}}>مؤشر الخوف والطمع</span>
        </div>
      </div>

      <div style={{
        background:`linear-gradient(145deg,${lbl.bg},rgba(255,255,255,.02))`,
        borderRadius:18,border:`1px solid ${lbl.col}35`,
        padding:"16px 14px 12px",overflow:"hidden",position:"relative",
      }}>
        <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,
          borderRadius:"50%",background:lbl.col+"1a",pointerEvents:"none"}}/>

        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          {/* Gauge */}
          <div style={{flexShrink:0}}>
            <svg width="200" height="108" viewBox="0 0 200 108">
              <path d={arcPath(0,100,R2)} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="14" strokeLinecap="round"/>
              {ZONES.map((z,i)=>(
                <path key={i} d={arcPath(z.from,z.to,R2)} fill="none" stroke={z.col} strokeWidth="12" strokeLinecap="butt" opacity="0.75"/>
              ))}
              <path d={arcPath(0,score,R2)} fill="none" stroke={lbl.col} strokeWidth="14" strokeLinecap="round" opacity="0.35"/>
              <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={lbl.col} strokeWidth="3" strokeLinecap="round"/>
              <circle cx={CX} cy={CY} r="6" fill={lbl.col} opacity="0.9"/>
              <circle cx={CX} cy={CY} r="3" fill="#fff"/>
              <text x={CX} y={CY+20} textAnchor="middle" fill={lbl.col} fontSize="22" fontWeight="900" fontFamily="Cairo">{score}</text>
              <text x={CX} y={CY+34} textAnchor="middle" fill={T2} fontSize="8" fontFamily="Cairo">/ 100</text>
              <text x={14} y={105} textAnchor="middle" fill="#ff5f6a" fontSize="7" fontFamily="Cairo" opacity="0.8">خوف شديد</text>
              <text x={186} y={105} textAnchor="middle" fill="#1ee68a" fontSize="7" fontFamily="Cairo" opacity="0.8">طمع شديد</text>
            </svg>
          </div>

          {/* Right info */}
          <div style={{flex:1}}>
            <div style={{
              display:"inline-block",
              background:lbl.col+"20",border:`1px solid ${lbl.col}50`,
              borderRadius:10,padding:"4px 12px",marginBottom:8,
            }}>
              <span style={{fontSize:15,fontWeight:900,color:lbl.col}}>{lbl.ar}</span>
              <span style={{fontSize:9,color:lbl.col,opacity:.7,marginRight:5}}>{lbl.en}</span>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {[
                {l:"الآن",v:score,c:lbl.col},
              ].map((h,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:9,color:T3,width:30,textAlign:"right"}}>{h.l}</span>
                  <div style={{flex:1,height:4,background:"rgba(255,255,255,.06)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{width:h.v+"%",height:"100%",background:h.c,borderRadius:2,transition:"width .5s ease"}}/>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,color:h.c,minWidth:24,textAlign:"left"}}>{h.v}</span>
                  <span style={{fontSize:8,color:h.c,background:h.c+"15",borderRadius:4,padding:"1px 5px"}}>
                    {fgLabel(h.v).ar}
                  </span>
                </div>
              ))}
            </div>

            <div style={{marginTop:8,fontSize:7.5,color:T3,lineHeight:1.5,
              borderTop:"1px solid rgba(255,255,255,.05)",paddingTop:6}}>
              ⚠ استرشادي · {data.adv} صاعد · {data.dec} هابط · {data.unc} ثابت من {data.n} سهم
            </div>
          </div>
        </div>

        {/* Component Breakdown */}
        {expanded&&(
          <div style={{marginTop:14,animation:"fadeUp .2s ease both"}}>
            <div style={{fontSize:10,fontWeight:700,color:T2,marginBottom:10,textAlign:"right"}}>
              تفصيل المكوّنات السبعة
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {data.components.map((c,i)=>{
                const cl=fgLabel(c.score);
                const isA=activeComp===c.id;
                return(
                  <div key={i} onClick={()=>setActiveComp(isA?null:c.id)}
                    style={{
                      background:isA?cl.col+"12":"rgba(255,255,255,.03)",
                      borderRadius:10,padding:"8px 11px",cursor:"pointer",
                      border:`1px solid ${isA?cl.col+"40":"rgba(255,255,255,.06)"}`,
                      transition:"all .18s",
                    }}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
                        background:`conic-gradient(${cl.col} ${c.score*3.6}deg, rgba(255,255,255,.06) 0deg)`,
                        display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                        <div style={{position:"absolute",inset:3,borderRadius:"50%",background:BG,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:10,fontWeight:900,color:cl.col}}>{c.score}</span>
                        </div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:9,color:T3}}>وزن {c.weight}%</span>
                          <span style={{fontSize:11,fontWeight:700,color:T1}}>{c.label}</span>
                        </div>
                        <div style={{height:5,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden",marginTop:4}}>
                          <div style={{width:c.score+"%",height:"100%",
                            background:`linear-gradient(90deg,${cl.col}80,${cl.col})`,
                            borderRadius:3,transition:"width .5s ease"}}/>
                        </div>
                      </div>
                      <span style={{fontSize:8.5,fontWeight:700,color:cl.col,
                        background:cl.col+"18",borderRadius:6,padding:"2px 7px",
                        border:`1px solid ${cl.col}30`,flexShrink:0}}>{cl.ar}</span>
                    </div>
                    {isA&&(
                      <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.07)",animation:"fadeUp .15s ease both"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          <div style={{background:"rgba(255,255,255,.04)",borderRadius:7,padding:"6px 8px"}}>
                            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>القيمة المحسوبة</div>
                            <div style={{fontSize:10,fontWeight:700,color:cl.col}}>{c.desc}</div>
                          </div>
                          <div style={{background:"rgba(255,255,255,.04)",borderRadius:7,padding:"6px 8px"}}>
                            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>البيانات الخام</div>
                            <div style={{fontSize:10,fontWeight:700,color:T2}}>{c.raw}</div>
                          </div>
                          <div style={{background:"rgba(255,255,255,.04)",borderRadius:7,padding:"6px 8px",gridColumn:"1/-1"}}>
                            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>المساهمة في المؤشر</div>
                            <div style={{fontSize:10,fontWeight:700,color:cl.col}}>
                              {c.weight}% × {c.score} = {(c.weight*c.score/100).toFixed(1)} نقطة
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:10,background:"rgba(255,255,255,.03)",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(255,255,255,.06)"}}>
              <div style={{fontSize:9,color:T2,fontWeight:700,marginBottom:4,textAlign:"right"}}>معادلة الحساب</div>
              <div style={{fontSize:8.5,color:T3,lineHeight:1.8,direction:"ltr",textAlign:"left"}}>
                FGI = Momentum(20%) + Strength(15%) + Breadth(15%) + Volatility(15%) + Liquidity(15%) + RSI(10%) + CMF(10%)
              </div>
              <div style={{marginTop:6,display:"flex",justifyContent:"flex-end",alignItems:"center",gap:8}}>
                <span style={{fontSize:9,color:T3}}>النقاط الكلية:</span>
                <span style={{fontSize:16,fontWeight:900,color:lbl.col}}>{score}</span>
                <span style={{fontSize:9,color:T3}}>/ 100</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ADVANCED SECTION
══════════════════════════════════════════════════════ */
function AdvancedSection({liveStocks=[]}) {
  const [open,setOpen]=useState(false);
  const [panel,setPanel]=useState("liquidity");

    // ✨ أعلى 50 سهم بالسيولة (الحجم) -- توازن مثالي بين الشمولية والأداء
  const topStocks=useMemo(()=>
    [...liveStocks].sort((a,b)=>(b.v||0)-(a.v||0)).slice(0,50),
    [liveStocks]
  );

  // ✨ جلب OHLCV الحقيقيّ لـ 20 يوماً (شهر تقريباً)
  const topSyms = useMemo(()=>topStocks.map(s=>s.sym),[topStocks]);
  const ohlcvCache = useOHLCVCache(topSyms, '3M');

  return(
    <div style={{margin:"14px 12px 0"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"10px 14px",borderRadius:12,cursor:"pointer",fontFamily:"Cairo,sans-serif",
        background:open?CARD2:CARD,
        border:"1px solid "+(open?"rgba(245,158,11,.25)":"rgba(255,255,255,.07)"),
        color:T1,marginBottom:0,
      }}>
        <span style={{fontSize:13,fontWeight:700,color:open?GOLD:T2}}>التحليل المتقدم</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={open?GOLD:T3} strokeWidth="2" strokeLinecap="round">
            <polyline points={open?"18 15 12 9 6 15":"6 9 12 15 18 9"}/>
          </svg>
          <span style={{fontSize:12,color:open?GOLD:T3,fontWeight:600}}>
            {open?"إخفاء التحليل المتقدم":"عرض التحليل المتقدم"}
          </span>
        </div>
      </button>

      {open&&(
        <div style={{
          background:"linear-gradient(145deg,#13162a,#0f1220)",
          borderRadius:"0 0 16px 16px",
          border:"1px solid rgba(167,139,250,.2)",
          borderTop:"none",overflow:"hidden",
        }}>
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            {[{id:"liquidity",l:"خريطة السيولة"},{id:"breadth",l:"عرض السوق"}].map(p=>(

              <button key={p.id} onClick={()=>setPanel(p.id)} style={{
                flex:1,padding:"10px 4px",cursor:"pointer",fontFamily:"Cairo,sans-serif",
                background:"none",border:"none",fontSize:11,fontWeight:600,
                color:panel===p.id?GOLD:T3,
                borderBottom:panel===p.id?"2px solid "+GOLD:"2px solid transparent",
                transition:"all .15s",
              }}>{p.l}</button>
            ))}
          </div>
                    {panel==="liquidity"&&<LiquidityMapPanel stocks={topStocks} allStocks={liveStocks} ohlcvCache={ohlcvCache}/>}
          {panel==="breadth"&&<BreadthPanel liveStocks={liveStocks}/>}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LIQUIDITY PANEL -- خريطة السيولة الذكية الكاملة
   4 تبويبات: الخريطة | القائمة الذكية | القطاعات | DNA السيولة
══════════════════════════════════════════════════════ */
function LiquidityMapPanel({stocks=[], allStocks=[], ohlcvCache={}}) {
  const {openStock} = useNav();
  const [view, setView]             = useState("map");
  const [scanning, setScan]         = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selSec, setSelSec]         = useState(null);

  // ✨ متوسّط حجم كل الأسهم (للأسهم بدون OHLCV cache)
  const globalAvgVol = useMemo(() => {
    if (!stocks.length) return 1e6;
    return stocks.reduce((sum, s) => sum + (s.v || 0), 0) / stocks.length;
  }, [stocks]);

  const data = useMemo(() => stocks.map(s => {
    const vol = s.v || 1e6;
    const pct = s.pct || 0;

    // ✨ حساب avgVol حقيقي من OHLCV عند توفّره
    const cachedBars = ohlcvCache[s.sym];
    const isRealVol = cachedBars && Array.isArray(cachedBars) && cachedBars.length >= 10;
    let avgVol;
    if (isRealVol) {
      const lastN = cachedBars.slice(-20);
      avgVol = lastN.reduce((sum, b) => sum + (b.vol || 0), 0) / lastN.length || vol;
    } else {
      // فولباك: متوسّط السوق العام
      avgVol = globalAvgVol;
    }

    const rv = avgVol > 0 ? vol / avgVol : 1;
    const lpi = Math.round((pct / 3) * 40 + (rv - 1) * 25);

    // ── حساب SM Score (نطاق 0-100) ──
    let sm = 20; // قاعدة

    // 1️⃣ الحجم النسبيّ
    if (rv > 2.5 && pct > 0)       sm += 30;
    else if (rv > 1.5 && pct > 0)  sm += 22;
    else if (rv > 1.2)             sm += 12;
    else if (rv >= 0.8 && rv <= 1.2) sm += 5;  // حجم متوازن

    // 2️⃣ تَغيّر السعر
    if (pct > 3)        sm += 30;
    else if (pct > 2)   sm += 25;
    else if (pct > 1)   sm += 20;
    else if (pct > 0)   sm += 12;
    else if (pct < -3)  sm -= 15;
    else if (pct < -2)  sm -= 8;
    else if (pct < 0)   sm -= 3;

    // 3️⃣ شدة الحجم
    if (vol > avgVol * 2.0)      sm += 25;
    else if (vol > avgVol * 1.3) sm += 15;
    else if (vol > avgVol)       sm += 8;

    sm = Math.min(100, Math.max(0, sm));

    const hd = (s.pct||0) > 0.3 && rv > 1.5 && lpi < 0;
    const ep = rv < 0.75 && Math.abs(s.pct||0) < 0.5;

    let col, lbl;
    if      (sm >= 75 && (s.pct||0) > 0)  { col = BLUE;      lbl = "سيولة مؤسسية"; }
    else if (lpi > 35 && (s.pct||0) > 0)  { col = "#4ade80"; lbl = "شراء نشط";     }
    else if (Math.abs(lpi) <= 20)          { col = "#6b7280"; lbl = "حيادي";         }
    else if (hd)                           { col = "#fb923c"; lbl = "تصريف مخفي";   }
    else if (lpi < -35)                    { col = R;         lbl = "تصريف مؤسسي";  }
    else if ((s.pct||0) < 0)              { col = "#f87171"; lbl = "ضغط بيع";       }
    else                                   { col = T2;        lbl = "محايد";         }

    const phase = lpi > 30 && rv > 1.5 ? "تجميع نشط"
                : lpi > 10             ? "تجميع مبكر"
                : lpi < -30 && rv > 1.5 ? "تصريف نشط"
                : lpi < -10            ? "تصريف مبكر" : "توحيد";
    const phCol = lpi > 10 ? G : lpi < -10 ? R : GOLD;

    const mfi = Math.min(100, Math.max(0, Math.round(50 + (s.pct||0) * 5)));
    const cmf = +((s.pct||0) / 20).toFixed(3);
    const rsi = Math.min(100, Math.max(0, Math.round(50 + (s.pct||0) * 3)));

    return { stk:s, sm, lpi:Math.round(lpi), rv:+rv.toFixed(2), col, lbl, hd, ep, phase, phCol, mfi, cmf, rsi, vp:Math.round((rv-1)*100) };
  }), [stocks]);

  const run = () => { setScan(true); setTimeout(() => { setLastUpdate(new Date()); setScan(false); }, 900); };
  useEffect(() => { run(); }, []);

  const now = `${lastUpdate.getHours().toString().padStart(2,"0")}:${lastUpdate.getMinutes().toString().padStart(2,"0")}`;

      // ✨ القطاعات تحسب من كل الأسهم (241) -- وليس 50 فقط
  const sectorAllData = useMemo(() => allStocks.map(s => {
    const vol    = s.v    || 1e6;
    const avgVol = s.avgV || vol;
    const rv     = ((vol + avgVol) / 2) / avgVol;
    const lpi    = Math.round(((s.pct||0) / 3) * 40 + (rv - 1) * 25);
    let sm = 20;
    if (rv > 2.5 && (s.pct||0) > 0) sm += 30;
    else if (rv > 1.5 && (s.pct||0) > 0) sm += 20;
    else if (rv > 1.2) sm += 10;
    if ((s.pct||0) > 2) sm += 25;
    else if ((s.pct||0) > 0) sm += 15;
    else if ((s.pct||0) < -2) sm -= 10;
    if (vol > avgVol * 1.5) sm += 25;
    else if (vol > avgVol) sm += 15;
    sm = Math.min(100, Math.max(0, sm));
    return { stk:s, sm, lpi:Math.round(lpi) };
  }), [allStocks]);

  const sectorFlows = useMemo(() => {
    const s = {};
    sectorAllData.forEach(d => {
      const k = d.stk.sec || "أخرى";
      if (!s[k]) s[k] = { name:k, in:0, out:0, n:0, sum:0 };
      s[k].n++; s[k].sum += d.sm;
      if (d.lpi > 20) s[k].in += d.lpi;
      else if (d.lpi < -20) s[k].out += Math.abs(d.lpi);
    });
    return Object.values(s).map(x => ({
      ...x, avg:Math.round(x.sum/x.n), net:x.in-x.out,
      dir:x.in>x.out?"دخول":"خروج", fc:x.in>x.out?G:R,
    }));
  }, [sectorAllData]);

  const LEGEND = [
    {c:BLUE,     l:"مؤسسي"},
    {c:"#4ade80",l:"شراء"},
    {c:"#6b7280",l:"حيادي"},
    {c:"#fb923c",l:"تصريف مخفي"},
    {c:R,        l:"تصريف"},
  ];

  const VTABS = [
    {id:"map",   l:"الخريطة"},
    {id:"list",  l:"القائمة الذكية"},
    {id:"sector",l:"القطاعات"},
    {id:"dna",   l:"DNA السيولة"},
  ];

  return (
    <div>
      {/* Header */}
      <div style={{padding:"10px 12px 8px",background:"linear-gradient(135deg,rgba(167,139,250,.06),transparent)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={run} disabled={scanning} style={{
              background:"linear-gradient(135deg,#6d28d9,"+PU+")",border:"none",color:T1,
              borderRadius:9,padding:"5px 14px",fontSize:11,fontWeight:700,cursor:"pointer",
              fontFamily:"Cairo,sans-serif",boxShadow:"0 2px 8px rgba(167,139,250,.3)",opacity:scanning?0.6:1,
            }}>{scanning?"...":"فحص"}</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:900,color:T1}}>خريطة السيولة الذكية</div>
              <div style={{fontSize:8.5,color:T3}}>Smart Liquidity Map</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              {scanning
                ? <div style={{width:10,height:10,border:"2px solid "+PU+"40",borderTop:"2px solid "+PU,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                : <div style={{width:8,height:8,borderRadius:"50%",background:PU,boxShadow:"0 0 8px "+PU}}/>
              }
              <span style={{fontSize:10,color:T2}}>تحديث: {now}</span>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{display:"flex",gap:6}}>
          {VTABS.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{
              flex:1,padding:"6px 4px",borderRadius:9,fontSize:10,fontWeight:600,
              cursor:"pointer",fontFamily:"Cairo,sans-serif",transition:"all .15s",
              background:view===v.id?"linear-gradient(135deg,#6d28d9,"+PU+")":"rgba(255,255,255,.05)",
              border:"1px solid "+(view===v.id?PU+"60":"rgba(255,255,255,.07)"),
              color:view===v.id?T1:T3,
              boxShadow:view===v.id?"0 2px 8px rgba(167,139,250,.2)":"none",
            }}>{v.l}</button>
          ))}
        </div>

        <div style={{marginTop:8,fontSize:8,color:GOLD,background:"rgba(245,158,11,.05)",borderRadius:7,padding:"4px 8px",border:"1px solid rgba(245,158,11,.1)",lineHeight:1.5}}>
          ⚠ التحليل استرشادي -- محسوب من: حجم التداول · نسبة التغير · الحجم النسبي. ليس توصية استثمارية.
        </div>
      </div>

      {/* Scanning */}
      {scanning&&(
        <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:8}}>
          {[100,85,70,55].map((w,i)=>(
            <div key={i} style={{height:10,borderRadius:5,background:PU+"10",width:w+"%",opacity:.5}}/>
          ))}
        </div>
      )}

      {/* ── MAP VIEW ── */}
      {!scanning&&view==="map"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {LEGEND.map((l,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:8,height:8,borderRadius:2,background:l.c}}/>
                <span style={{fontSize:8,color:T2}}>{l.l}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {data.map((d,i)=>{
              const sz=d.sm>=80?72:d.sm>=65?62:d.sm>=50?52:d.sm>=35?44:36;
              return(
                <div key={i} onClick={()=>openStock(d.stk)} style={{
                  width:sz,height:sz,borderRadius:9,
                  background:"linear-gradient(135deg,"+d.col+"25,"+d.col+"10)",
                  border:"1.5px solid "+d.col+"50",
                  display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",padding:3,cursor:"pointer",
                }}>
                  <span style={{fontSize:Math.max(8,sz/7),fontWeight:900,color:T1,lineHeight:1}}>{d.stk.sym}</span>
                  <span style={{fontSize:Math.max(8,sz/8),fontWeight:700,color:d.col,lineHeight:1.2}}>{d.sm}</span>
                  <span style={{fontSize:7,color:(d.stk.pct||0)>=0?G:R,fontWeight:600}}>
                    {(d.stk.pct||0)>=0?"+":""}{(d.stk.pct||0).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {!scanning&&view==="list"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{fontSize:12,fontWeight:700,color:PU,marginBottom:10,textAlign:"right"}}>
            أعلى الأسهم بسيولة ذكية
          </div>
          {[...data].sort((a,b)=>b.sm-a.sm).slice(0,50).map((d,i)=>(
            <div key={i} style={{background:CARD2,borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid "+LN}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{minWidth:42,textAlign:"right"}}>
                    <div style={{fontSize:22,fontWeight:900,color:PU,lineHeight:1}}>{d.sm}</div>
                    <div style={{fontSize:9,color:T3}}>نقاط الذكاء</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:800,color:T1}}>{d.stk.name}</div>
                    <div style={{fontSize:10,color:d.col,fontWeight:600}}>{d.lbl}</div>
                  </div>
                  <div style={{background:CARD3,borderRadius:8,padding:"6px 10px",minWidth:46,textAlign:"center",border:"1px solid rgba(255,255,255,.08)"}}>
                    <span style={{fontSize:11,fontWeight:800,color:T1}}>{d.stk.sym}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                {[
                  {l:"MFI", v:d.mfi,                        c:d.mfi>60?G:d.mfi<40?R:T2},
                  {l:"CMF", v:d.cmf>0?"+"+d.cmf:d.cmf,     c:d.cmf>0.05?G:d.cmf<-0.05?R:T2},
                  {l:"RSI", v:d.rsi,                        c:d.rsi>60?G:d.rsi<40?R:T2},
                  {l:"LPI", v:(d.lpi>0?"+":"")+d.lpi,      c:d.lpi>20?G:d.lpi<-20?R:T2},
                ].map((m,mi)=>(
                  <div key={mi} style={{background:"rgba(255,255,255,.04)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:7.5,color:T3,marginBottom:3}}>{m.l}</div>
                    <div style={{fontSize:11,fontWeight:700,color:m.c,lineHeight:1}}>{m.v}</div>
                  </div>
                ))}
              </div>
              {d.hd&&<div style={{marginTop:7,fontSize:8.5,color:GOLD,background:GOLD+"10",borderRadius:7,padding:"4px 9px"}}>
                ⚠ تصريف مخفي -- ارتفاع السعر مع ضعف مؤشر التدفق
              </div>}
              {d.ep&&<div style={{marginTop:7,fontSize:8.5,color:BLUE,background:BLUE+"10",borderRadius:7,padding:"4px 9px"}}>
                💥 احتمال انفجار -- تضيق النطاق مع تراجع السيولة
              </div>}
            </div>
          ))}
        </div>
      )}

      {/* ── SECTOR VIEW ── */}
      {!scanning&&view==="sector"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{fontSize:11,fontWeight:700,color:PU,marginBottom:8}}>تحليل تدفق السيولة بالقطاع</div>
          {sectorFlows.map((sec,i)=>{
            const bw=Math.min(100,Math.abs(sec.net)/3);
            const open=selSec===sec.name;
const secStocks=sectorAllData.filter(d=>(d.stk.sec||"أخرى")===sec.name)
              .filter(d=>sec.dir==="دخول"?d.lpi>0:d.lpi<=0)
              .sort((a,b)=>sec.dir==="دخول"?b.lpi-a.lpi:a.lpi-b.lpi);
            return(
              <div key={i} style={{marginBottom:6}}>
                <div onClick={()=>setSelSec(open?null:sec.name)} style={{
                  background:open?sec.fc+"10":CARD2,borderRadius:10,
                  padding:"9px 11px",cursor:"pointer",
                  border:"1px solid "+(open?sec.fc+"30":LN),
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:8.5,color:sec.fc,fontWeight:700,background:sec.fc+"15",borderRadius:5,padding:"1px 7px"}}>
                        {sec.dir} {sec.dir==="دخول"?"↑":"↓"}
                      </span>
                      <span style={{fontSize:9,color:T3}}>{sec.n} سهم</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:12,fontWeight:800,color:T1}}>{sec.name}</span>
                      <span style={{fontSize:10,color:T3}}>{open?"▲":"▼"}</span>
                    </div>
                  </div>
                  <div style={{height:5,background:CARD,borderRadius:3,overflow:"hidden",marginBottom:4}}>
                    <div style={{height:"100%",width:bw+"%",background:sec.fc,borderRadius:3}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:8,color:T3}}>متوسط الذكاء: <span style={{color:PU,fontWeight:700}}>{sec.avg}</span></span>
                    <span style={{fontSize:8,color:sec.fc,fontWeight:700}}>تدفق: {sec.net>0?"+":""}{sec.net.toFixed(0)}</span>
                  </div>
                </div>
                {open&&secStocks.length>0&&(
                  <div style={{marginRight:8,marginTop:3,background:CARD,borderRadius:10,border:"1px solid "+LN}}>
                    <div style={{padding:"6px 10px",borderBottom:"1px solid "+LN,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:8,color:T3}}>نقاط الذكاء</span>
                      <span style={{fontSize:9,fontWeight:700,color:sec.fc}}>
                        {sec.dir==="دخول"?"أسهم الشراء -- سيولة داخلة":"أسهم البيع -- سيولة خارجة"}
                      </span>
                    </div>
                    {secStocks.map((d,si)=>(
                      <div key={si} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",borderBottom:si<secStocks.length-1?"1px solid "+LN:"none"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:d.lpi>0?G:R}}/>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:T1}}>{d.stk.name}</div>
                            <div style={{fontSize:8.5,color:d.lpi>0?G:R,fontWeight:600}}>{(d.stk.pct||0)>=0?"+":""}{(d.stk.pct||0).toFixed(2)}%</div>
                          </div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:11,fontWeight:800,color:PU}}>{d.sm}</div>
                          <div style={{fontSize:8,color:d.lpi>0?G:R}}>LPI: {d.lpi>0?"+":""}{d.lpi}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DNA VIEW ── */}
      {!scanning&&view==="dna"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{fontSize:11,fontWeight:700,color:PU,marginBottom:8}}>
            DNA السيولة -- نمط حركة المال الذكي
          </div>
                    {[...data].filter(d=>d.sm>30).sort((a,b)=>b.sm-a.sm).slice(0,50).map((d,i)=>(
            <DnaCard key={i} d={d} bars={ohlcvCache[d.stk.sym]}/>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── DNA CARD ── */
function DnaCard({d, bars: ohlcvBars}) {
  const [activeBar, setActiveBar] = useState(null);
  const isReal = ohlcvBars && Array.isArray(ohlcvBars) && ohlcvBars.length >= 20;

  const bars = useMemo(()=>{
    const dayNames=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
    const monthNames=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

    if (isReal) {
      // ✨ بيانات حقيقيّة: آخر 20 يوماً
      const last20 = ohlcvBars.slice(-20);
      const maxVol = Math.max(...last20.map(b=>b.vol||0)) || 1;
      return last20.map((bar, k) => {
        const date = bar.t ? new Date(bar.t) : new Date();
        const prevClose = k > 0 ? last20[k-1].c : bar.o;
        const barPct = prevClose > 0 ? +(((bar.c - prevClose) / prevClose) * 100).toFixed(2) : 0;
        // ارتفاع العمود يَعكس الحجم النسبيّ (volume bar)
        const h = Math.round(4 + ((bar.vol || 0) / maxVol) * 44);
        return {
          k, h: Math.max(4, h), barPct, vol: bar.vol || 0, isRecent: k > 14,
          label: `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`,
          shortDate: `${date.getDate()}/${date.getMonth()+1}`,
        };
      });
    }

    // ✨ لا بيانات وهمية -- ننتظر وصول الشموع الحقيقية
    return [];
  },[d, ohlcvBars, isReal]);

  const ab = activeBar!==null ? bars[activeBar] : null;

  return(
    <div style={{background:CARD2,borderRadius:12,padding:"10px 12px",marginBottom:7,border:"1px solid "+LN}}>
      {bars.length === 0 && (
        <div style={{height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:T3,marginBottom:4}}>
          جارٍ تحميل شموع {d.stk.sym}…
        </div>
      )}
      <div style={{display:bars.length?"flex":"none",gap:2,alignItems:"flex-end",height:44,marginBottom:4}}>
        {bars.map(bar=>(
          <div key={bar.k} onClick={()=>setActiveBar(activeBar===bar.k?null:bar.k)} style={{
            flex:1,height:bar.h,borderRadius:2,cursor:"pointer",
            background:activeBar===bar.k?d.col:bar.isRecent?d.col+"cc":d.col+"30",
            transition:"all .15s",
            transform:activeBar===bar.k?"scaleY(1.18)":"scaleY(1)",
            transformOrigin:"bottom",
            boxShadow:activeBar===bar.k?"0 0 6px "+d.col:"none",
          }}/>
        ))}
      </div>
      <div style={{display:"flex",marginBottom:6}}>
        {bars.map((bar,i)=>(
          <div key={i} style={{flex:1,textAlign:"center"}}>
            {i%4===0&&<span style={{fontSize:7,fontWeight:activeBar===i?700:400,color:activeBar===i?d.col:T3}}>{bar.shortDate}</span>}
          </div>
        ))}
      </div>
      {ab&&(
        <div style={{background:"linear-gradient(135deg,"+CARD3+","+CARD+")",border:"1px solid "+d.col+"70",borderRadius:12,padding:"10px 14px",marginBottom:8,boxShadow:"0 2px 12px rgba(0,0,0,.5)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div onClick={()=>setActiveBar(null)} style={{width:20,height:20,borderRadius:"50%",background:"rgba(255,255,255,.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:T2}}>✕</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:d.col}}/>
              <span style={{fontSize:12,fontWeight:700,color:T1}}>{ab.label}</span>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {l:"التغير",  v:(ab.barPct>=0?"+":"")+ab.barPct+"%",c:ab.barPct>=0?G:R},
              {l:"الحجم",  v:(ab.vol/1000000).toFixed(1)+"م",     c:T2},
              {l:"SM Score",v:d.sm,                                 c:d.col},
            ].map((m,mi)=>(
              <div key={mi} style={{background:"rgba(255,255,255,.05)",borderRadius:8,padding:"7px 8px",textAlign:"center"}}>
                <div style={{fontSize:8,color:T3,marginBottom:3}}>{m.l}</div>
                <div style={{fontSize:13,fontWeight:800,color:m.c}}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14,fontWeight:900,color:PU}}>{d.sm}</span>
          <span style={{fontSize:8,color:T3}}>SM Score</span>
          <div style={{
            display:"flex",alignItems:"center",gap:3,
            background: isReal ? "rgba(16,201,126,.15)" : "rgba(245,158,11,.15)",
            border: "1px solid " + (isReal ? "rgba(16,201,126,.3)" : "rgba(245,158,11,.3)"),
            borderRadius:5,padding:"1px 5px",
          }}>
            <div style={{width:5,height:5,borderRadius:"50%",background:isReal?G:GOLD}}/>
            <span style={{fontSize:7,fontWeight:700,color:isReal?G:GOLD}}>
              {isReal ? "حقيقي" : "تجريبي"}
            </span>
          </div>
        </div>
        <span style={{fontSize:9,color:d.phCol,fontWeight:600}}>{d.phase}</span>
        <span style={{fontSize:12,fontWeight:700,color:T1}}>{d.stk.name}</span>
      </div>
    </div>
  );
}

/* ── عرض السوق ── */
function BreadthPanel({liveStocks=[]}) {
  const n=liveStocks.length||1;
  const adv=liveStocks.filter(s=>(s.pct||0)>0).length;
  const dec=liveStocks.filter(s=>(s.pct||0)<0).length;
  const unc=n-adv-dec;
  const advRatio=(adv/n*100).toFixed(1);
  const adLine=adv-dec;
  const bs=Math.round(adLine/n*100);
  const sig=bs>40?"سوق صاعد قوي":bs>15?"ميل صعودي":bs>-15?"متوازن":bs>-40?"ميل هبوطي":"سوق هابط قوي";
  const sc=bs>15?G:bs<-15?R:GOLD;
  const strongUp=liveStocks.filter(s=>(s.pct||0)>2).length;
  const strongDn=liveStocks.filter(s=>(s.pct||0)<-2).length;
  const volUp=liveStocks.filter(s=>(s.pct||0)>0).reduce((a,s)=>a+(s.v||0),0);
  const volDn=liveStocks.filter(s=>(s.pct||0)<0).reduce((a,s)=>a+(s.v||0),0);
  const volRatio=volUp/((volUp+volDn)||1)*100;
  const mcl=Math.round((adv-dec)/n*100);

  return(
    <div style={{padding:"12px 14px"}}>
      <div style={{background:"rgba(245,158,11,.06)",borderRadius:8,padding:"6px 10px",
        marginBottom:10,border:"1px solid rgba(245,158,11,.12)",
        fontSize:8.5,color:GOLD,lineHeight:1.5}}>
        ⚠ التحليل استرشادي — يعتمد على بيانات السهم المدخلة. ليس توصية استثمارية.
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:sc,boxShadow:"0 0 6px "+sc}}/>
          <span style={{fontSize:9,color:sc,fontWeight:700}}>{sig}</span>
        </div>
        <span style={{fontSize:13,fontWeight:900,color:T1}}>مؤشرات عرض السوق</span>
      </div>

      {/* A/D Bar */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:8.5,color:G}}>{adv} صاعد</span>
          <div style={{textAlign:"center"}}>
            <span style={{fontSize:9,color:T3,fontWeight:600}}>A/D Line: </span>
            <span style={{fontSize:10,color:sc,fontWeight:800}}>{adLine>0?"+":""}{adLine}</span>
          </div>
          <span style={{fontSize:8.5,color:R}}>{dec} هابط</span>
        </div>
        <div style={{height:8,background:R+"30",borderRadius:4,overflow:"hidden"}}>
          <div style={{width:advRatio+"%",height:"100%",
            background:"linear-gradient(90deg,"+G+"80,"+G+")",borderRadius:4}}/>
        </div>
        <div style={{textAlign:"center",marginTop:3}}>
          <span style={{fontSize:8,color:T3}}>{advRatio}% صاعد · {unc} ثابت · إجمالي {n} سهم</span>
        </div>
      </div>

      {/* Metrics */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
        {[
          {l:"صاعد قوي >2%",v:strongUp,c:strongUp>10?G:T2},
          {l:"هابط قوي >2%",v:strongDn,c:strongDn>10?R:T2},
          {l:"حجم الصاعدة",v:volRatio.toFixed(0)+"%",c:volRatio>60?G:R},
          {l:"حجم صاعد (م)",v:(volUp/1e6).toFixed(0),c:G},
          {l:"حجم هابط (م)",v:(volDn/1e6).toFixed(0),c:R},
          {l:"ثابت",v:unc,c:T2},
        ].map((m,i)=>(
          <div key={i} style={{background:CARD2,borderRadius:9,padding:"8px 8px",textAlign:"center"}}>
            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>{m.l}</div>
            <div style={{fontSize:14,fontWeight:900,color:m.c}}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* McClellan */}
      <div style={{background:CARD2,borderRadius:10,padding:"10px 12px",marginBottom:10,
        border:"1px solid "+(mcl>20?G+"30":mcl<-20?R+"30":LN)}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:900,color:mcl>0?G:R}}>
            {mcl>0?"+":""}{mcl}
          </span>
          <span style={{fontSize:11,fontWeight:700,color:T1}}>مذبذب ماكليلان</span>
        </div>
        <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"rgba(255,255,255,.2)"}}/>
          <div style={{
            position:"absolute",top:0,bottom:0,
            background:mcl>0?G:R,
            left:mcl>0?"50%":`${50+mcl/2}%`,
            width:Math.abs(mcl/2)+"%",
            borderRadius:3,
          }}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:7.5,color:T3}}>
          <span>−100 تشبع بيع</span>
          <span>0 محايد</span>
          <span>+100 تشبع شراء</span>
        </div>
        <div style={{fontSize:8,color:T3,marginTop:4}}>
          القيمة: <span style={{color:mcl>20?G:mcl<-20?R:T2,fontWeight:700}}>
            {mcl>20?"إيجابي — ميل شراء":mcl<-20?"سلبي — ميل بيع":"محايد"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── HOME CONTENT ─── */
function HomeContent({idx, chgP, market, liveStocks=[], isLoadingH=false, isRefreshingH=false}) {
  const [stTab,setStTab]=useState(0);
  const [period,setPeriod]=useState("يومي");
  const [showPeriodMenu,setShowPeriodMenu]=useState(false);
  const [proMode,setPro]=useState(true);

  // ✨ جلب OHLCV لحساب التغيّر حسب الفترة
  const syms = useMemo(()=>liveStocks.map(s=>s.sym),[liveStocks]);
  // ✨ لا نجلب شموع 249 سهماً إلا عند اختيار فترة غير يومية
  const ohlcvCache = useOHLCVCache(period === "يومي" ? [] : syms, '3M');

  // أيام كل فترة (عدد شموع التداول)
  // الأسبوعي = 5 أيام تداول، لكن نَحتاج 6 شموع (إغلاق الخميس السابق + 5 أيام)
  const periodBars = period==="يومي"?2 : period==="أسبوعي"?6 : 23; // شهري = 23
  const periodVolDays = period==="يومي"?1 : period==="أسبوعي"?5 : 22;

  // إعادة حساب pct/vol لكل سهم حسب الفترة
  const periodStocks = useMemo(()=>liveStocks.map(s=>{
    if (period === "يومي") return s; // اليومي يُستخدم s.pct و s.v مباشرة
    const bars = ohlcvCache[s.sym];
    if (!bars || !Array.isArray(bars) || bars.length < periodBars) {
      return { ...s, _invalid: true }; // ⚠️ غير صالح للفترة
    }
    const slice = bars.slice(-periodBars);
    // firstClose = إغلاق الشمعة قبل بداية الفترة (الخميس السابق للأسبوعي)
    const firstClose = slice[0].c;
    // lastClose = إغلاق آخر شمعة (اليوم الحاليّ)
    const lastClose = slice[slice.length-1].c;
    if (!firstClose || !lastClose) return { ...s, _invalid: true };
    const pPct = ((lastClose - firstClose) / firstClose) * 100;
    // الحجم = مجموع آخر periodVolDays فقط (بدون الشمعة المرجعيّة)
    const volSlice = slice.slice(-periodVolDays);
    const pVol = volSlice.reduce((sum,b)=>sum+(b.vol||0),0);
    return { ...s, pct: pPct, v: pVol };
  }),[liveStocks, ohlcvCache, period, periodBars, periodVolDays]);

  // ✨ استبعاد الأسهم بدون بيانات فترة صالحة (لا تَخلط مع اليومي)
  const validStocks = period === "يومي" ? periodStocks : periodStocks.filter(s=>!s._invalid);

  const byUp=[...validStocks].sort((a,b)=>b.pct-a.pct);
  const byDn=[...validStocks].sort((a,b)=>a.pct-b.pct);
  const byVol=[...validStocks].sort((a,b)=>b.v-a.v);
  const lists=[byUp,byDn,byVol];
  return(
    <div style={{paddingBottom:30,animation:"fadeUp .28s ease both"}}>
      <TasiChart market={market}/>

      {/* Pro/Beginner toggle */}
      <div style={{
        margin:"8px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 14px",
        background:proMode?"rgba(245,158,11,.06)":"rgba(74,158,255,.06)",
        borderRadius:12,border:"1px solid "+(proMode?"rgba(245,158,11,.15)":"rgba(74,158,255,.15)"),
      }}>
        <span style={{fontSize:14,fontWeight:700,color:T1}}>الرئيسية</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,fontWeight:600,color:!proMode?BLUE:T3,opacity:!proMode?1:.45}}>مبتدئ</span>
          <div onClick={()=>setPro(p=>!p)} style={{
            width:52,height:28,borderRadius:14,cursor:"pointer",
            background:proMode?"linear-gradient(90deg,#d97706,"+GOLD+")":"linear-gradient(90deg,#1d4ed8,"+BLUE+")",
            position:"relative",transition:"background .3s",flexShrink:0,
            boxShadow:proMode?"0 0 10px rgba(245,158,11,.4)":"0 0 10px rgba(74,158,255,.4)",
          }}>
            <div style={{
              position:"absolute",top:3,left:proMode?27:3,
              width:22,height:22,borderRadius:"50%",background:T1,
              transition:"left .25s",boxShadow:"0 2px 6px rgba(0,0,0,.5)",
            }}/>
          </div>
          <span style={{fontSize:11,fontWeight:600,color:proMode?GOLD:T3,opacity:proMode?1:.45}}>محترف</span>
        </div>
      </div>

      {/* أبرز التحركات */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 14px 10px"}}>
        <div style={{position:"relative"}}>
          <div onClick={()=>setShowPeriodMenu(p=>!p)} style={{
            width:34,height:34,borderRadius:9,background:showPeriodMenu?CARD3:CARD2,
            display:"flex",alignItems:"center",justifyContent:"center",
            border:"1px solid "+(showPeriodMenu?"rgba(245,158,11,.4)":"rgba(255,255,255,.06)"),
            cursor:"pointer",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showPeriodMenu?GOLD:T2} strokeWidth="1.5">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
          {showPeriodMenu&&(
            <div style={{position:"absolute",top:40,right:0,zIndex:100,background:CARD,borderRadius:12,
              overflow:"hidden",border:"1px solid rgba(255,255,255,.1)",
              boxShadow:"0 8px 24px rgba(0,0,0,.5)",minWidth:100}}>
                            {["يومي","أسبوعي","شهري"].map(p=>(
                <div key={p} onClick={()=>{setPeriod(p);setShowPeriodMenu(false);}}
                  style={{padding:"10px 16px",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
                    background:period===p?"rgba(245,158,11,.1)":"transparent",
                    borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                  <span style={{fontSize:13,fontWeight:period===p?700:500,color:period===p?GOLD:T1}}>{p}</span>
                  {period===p&&<div style={{width:6,height:6,borderRadius:"50%",background:GOLD}}/>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:20,background:GOLD,borderRadius:2}}/>
          <span style={{fontSize:16,fontWeight:800,color:T1}}>أبرز التحركات</span>
          <div style={{background:"rgba(245,158,11,.15)",borderRadius:7,padding:"2px 8px",border:"1px solid rgba(245,158,11,.25)"}}>
            <span style={{fontSize:10,fontWeight:700,color:GOLD}}>{period}</span>
          </div>
        </div>
      </div>

      {/* Stock subtabs */}
      <div style={{padding:"0 12px",marginBottom:2}}>
        <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          {["الأكثر ارتفاعاً","الأكثر انخفاضاً","الأكثر نشاطاً"].map((t,i)=>(
            <button key={i} onClick={()=>setStTab(i)} style={{
              flex:1,padding:"8px 2px",background:"none",border:"none",cursor:"pointer",
              fontFamily:"Cairo,sans-serif",fontSize:11,fontWeight:600,
              color:stTab===i?T1:T3,
              borderBottom:stTab===i?"2px solid "+GOLD:"2px solid transparent",
              marginBottom:-1,transition:"all .15s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"0 12px"}}>
        {isLoadingH
          ?Array.from({length:6}).map((_,i)=>(
            <div key={i} style={{
              height:64,marginBottom:8,borderRadius:12,
              background:"linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)",
              backgroundSize:"200% 100%",animation:"shimmer 1.4s ease infinite",
              animationDelay:i*0.1+"s",
            }}/>
          ))
          :lists[stTab].slice(0,6).map((s,i)=>(
            <StockRow key={s.sym+period} s={s} rank={i+1}/>
          ))
        }
      </div>

      {/* القطاعات */}
      <SectorSection liveStocks={liveStocks}/>

      {/* Fear & Greed */}
      {proMode&&<FearGreedIndex liveStocks={liveStocks}/>}

      {/* التحليل المتقدم */}
      {proMode?(
        <AdvancedSection liveStocks={liveStocks}/>
      ):(
        <div style={{
          margin:"14px 12px 0",background:"rgba(74,158,255,.05)",
          borderRadius:14,padding:"18px 16px",
          border:"1px solid rgba(74,158,255,.12)",textAlign:"center",
        }}>
          <div style={{fontSize:20,marginBottom:8}}>🔒</div>
          <div style={{fontSize:13,fontWeight:700,color:T1,marginBottom:4}}>التحليل المتقدم — وضع المحترف</div>
          <div style={{fontSize:11,color:T2,lineHeight:1.7,marginBottom:12}}>
            فعّل وضع <span style={{color:GOLD,fontWeight:700}}>المحترف</span> للوصول إلى
            خريطة السيولة الذكية، ومؤشرات عرض السوق
          </div>
          <button onClick={()=>setPro(true)} style={{
            background:"linear-gradient(135deg,#d97706,"+GOLD+")",border:"none",
            borderRadius:10,padding:"9px 24px",fontSize:12,fontWeight:700,
            color:"#000",cursor:"pointer",fontFamily:"Cairo,sans-serif",
            boxShadow:"0 3px 10px rgba(245,158,11,.35)",
          }}>تفعيل وضع المحترف ⚡</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════ */
export default function HomeScreen() {
  const liveStocks=useSharedPrices();
  const market=useMarketBridge();
  const idx=market.current||0;
  const chgP=market.chgPts||0;
  const haptic=useHaptic();

  const scrollRef=useRef(null);
  const [showScrollTop,setShowScrollTop]=useState(false);
  const handleScroll=useCallback((e)=>{setShowScrollTop(e.target.scrollTop>300);},[]);
  const scrollToTop=useCallback(()=>{scrollRef.current?.scrollTo({top:0,behavior:"smooth"});haptic.tap();},[haptic]);

  // ✨ تحديث فعلي: نمسح كاش الشموع ليُعاد بناؤه من tp_hist_ المحدَّث
  const handleRefresh=useCallback(async()=>{
    haptic.success();
    try {
      const mod = await import('../utils/historicalData');
      if (mod && typeof mod.fetchEngineBars === 'function') {
        // نكتفي بإعادة القراءة -- الأسعار تُحدَّث تلقائياً كل 15 ثانية
      }
    } catch(e) {}
    await new Promise(r=>setTimeout(r,600));
  },[haptic]);
  const {containerRef:pullRef,isPulling,pullProgress,isRefreshing,touchHandlers}=usePullToRefresh(handleRefresh,60);

  const [isLoading,setIsLoading]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setIsLoading(false),1200);return()=>clearTimeout(t);},[]);

  return(
    <>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(30,230,138,.5)}70%{box-shadow:0 0 0 6px rgba(30,230,138,0)}100%{box-shadow:0 0 0 0 rgba(30,230,138,0)}}
      `}</style>
      <div
        ref={pullRef}
        {...touchHandlers}
        onScroll={handleScroll}
        style={{
          fontFamily:"'Cairo','Segoe UI',sans-serif",
          direction:"rtl",color:"#fff",fontSize:14,
          background:BG,minHeight:"100%",
          overflowY:"auto",height:"100dvh",paddingBottom:80,
        }}>
        {(isPulling||isRefreshing)&&(
          <div style={{
            textAlign:"center",padding:"8px 0 0",color:"#f0c050",fontSize:11,overflow:"hidden",
            height:isPulling?Math.round(pullProgress*40)+"px":isRefreshing?"40px":"0px",
            transition:isPulling?"none":"height .3s ease",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6,
          }}>
            {isRefreshing
              ?<><div className="pull-spinner"/><span>جارٍ التحديث...</span></>
              :<span style={{opacity:pullProgress}}>{pullProgress>=1?"↑ حرِّر للتحديث":"↓ اسحب للتحديث"}</span>
            }
          </div>
        )}
        <TopBar idx={idx} chgP={chgP}/>
        <HomeContent idx={idx} chgP={chgP} market={market} liveStocks={liveStocks} isLoadingH={isLoading} isRefreshingH={isRefreshing}/>
        {showScrollTop&&(
          <button className="scroll-top-btn" onClick={scrollToTop} aria-label="العودة للأعلى" style={{bottom:90}}>↑</button>
        )}
      </div>
    </>
  );
}
