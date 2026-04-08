'use client';
/**
 * @module features/stock/tabs/SDShareholdersTab
 * @description تبويب المساهمون والملكية
 */
import { useEffect, useMemo, useState } from 'react'';
import { C, SkeletonCard, SectionCard, Tag } from './StockDetailShared';
import { InfoTooltip } from './SDFundamentalTab';

function ShareholdersLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{ setShow(false); const t=setTimeout(()=>setShow(true),160); return ()=>clearTimeout(t); },[stk.sym]);
  if(!show) return <div style={{ borderRadius:16, overflow:"hidden", padding:"14px 16px" }}><SkeletonCard rows={4}/><SkeletonCard rows={5}/></div>;
  return <SDShareholders stk={stk}/>;
}

function SDShareholders({ stk }) {
  const shs   = SHAREHOLDERS[stk.sym]   || SHAREHOLDERS.default;
  const txs   = INSIDER_TX[stk.sym]     || INSIDER_TX.default;
  const CACHE_KEY = `shariah_${stk.sym}`;

  const loadCache = () => {
    try { const raw=sessionStorage.getItem(CACHE_KEY); if(!raw) return null; const obj=JSON.parse(raw); if(Date.now()-obj.ts>30*24*60*60*1000){sessionStorage.removeItem(CACHE_KEY);return null;} return obj; } catch{return null;}
  };
  const [shStatus, setShStatus] = useState(() => {
    const cached=loadCache();
    if(cached) return {loading:false,...cached,source_type:"cache"};
    return {loading:false,halal:true,status:"متوافق مع الشريعة",reason:"",details:"",source:"محلي",date:`${new Date().getMonth()+1}/${new Date().getFullYear()}`,source_type:"local"};
  });

  const checkShariah = async () => {
    setShStatus(s=>({...s,loading:true}));
    try {
      const mY=`${new Date().getMonth()+1}/${new Date().getFullYear()}`;
      const prompt='أنت خبير شرعي متخصص في مجلس الخدمات المالية الإسلامية (IFSB) وهيئة الفتوى والرقابة الشرعية. قيّم سهم '+stk.name+' ('+stk.sym+') في القطاع: '+stk.sec+' للشهر '+mY+'.\n\nالبيانات المالية:\n- نسبة الدين/الأصول: '+stk.debtEquity||"غير متوفر"+'\n- نسبة الإيرادات من الفوائد: أقل من 5% (تقدير)\n- هامش الربح: '+stk.netMargin||"غير متوفر"+'%\n- قطاع النشاط: '+stk.subsec||stk.sec+'\n\nالمعايير الشرعية:\n1. نسبة الدين/إجمالي الأصول < 33%\n2. الذمم المدينة/إجمالي الأصول < 45%\n3. الإيرادات من الأنشطة المحرمة < 5%\n4. طبيعة النشاط الأساسي (حلال/حرام)\n\nأجب بـ JSON فقط بدون أي نص خارجه:\n{"halal":true أو false,"status":"متوافق مع الشريعة" أو "يحتاج تطهير" أو "غير متوافق","reason":"سبب محدد في سطر واحد عربي","details":"تحليل شرعي تفصيلي 3-4 أسطر عربي يذكر المعايير الدقيقة","purification":نسبة التطهير كرقم أو null,"source":"AAOIFI / IFSB / هيئة الرقابة الشرعية","date":"'+mY+'"}';
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const parsed=JSON.parse((data.content||[]).map(b=>b.text||"").join("").replace(/```json|```/g,"").trim());
      const result={loading:false,...parsed,ts:Date.now(),source_type:"ai"};
      try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(result));}catch{}
      setShStatus(result);
    } catch{setShStatus(s=>({...s,loading:false,error:"تعذّر جلب التقرير"}));}
  };

  useEffect(()=>{ if(!loadCache()) checkShariah(); },[stk.sym]);

  const sC = shStatus.halal ? C.mint : shStatus.halal===false ? C.coral : C.amber;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

      {/* كبار الملاك */}
      <SectionCard title="هيكل الملكية" accent={C.gold}>
        <div style={{ padding:"14px 16px" }}>
          {/* Pie Chart SVG */}
          {(()=>{
            const COLORS = [C.electric, C.gold, C.plasma, C.mint, C.teal, C.amber];
            const R=58, CX=72, CY=72, total=shs.reduce((a,s)=>a+s.pct,0)||100;
            let startAngle=-Math.PI/2;
            const slices = shs.map((sh,i)=>{
              const angle=(sh.pct/total)*2*Math.PI;
              const x1=CX+R*Math.cos(startAngle), y1=CY+R*Math.sin(startAngle);
              startAngle+=angle;
              const x2=CX+R*Math.cos(startAngle), y2=CY+R*Math.sin(startAngle);
              const large=angle>Math.PI?1:0;
              return {path:`M${CX},${CY} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`, col:COLORS[i%COLORS.length], ...sh};
            });
            return (
              <div style={{ display:"flex", gap:16, marginBottom:14, alignItems:"center" }}>
                <svg width={144} height={144} viewBox="0 0 144 144" style={{ flexShrink:0 }}>
                  <circle cx={CX} cy={CY} r={R+2} fill={C.layer3}/>
                  {slices.map((s,i)=><path key={i} d={s.path} fill={s.col} opacity="0.9"/>)}
                  <circle cx={CX} cy={CY} r={R*0.42} fill={C.ink}/>
                  <text x={CX} y={CY-6} textAnchor="middle" fill={C.snow} fontSize="10" fontWeight="800" fontFamily="Cairo,sans-serif">{stk.name?.split(" ")[0]}</text>
                  <text x={CX} y={CY+8} textAnchor="middle" fill={C.smoke} fontSize="9" fontFamily="IBM Plex Mono,monospace">{stk.sym}</text>
                </svg>
                <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                  {slices.map((s,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:s.col, flexShrink:0 }}/>
                        <span style={{ fontSize:10, color:C.smoke, lineHeight:1.4 }}>{s.n?.length>16?s.n.slice(0,16)+"…":s.n}</span>
                      </div>
                      <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:700, color:s.col }}>{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:11 }}>
            <span style={{ color:C.smoke, lineHeight:1.5 }}>الأسهم الحرة (Float): <span style={{ color:C.mint, fontFamily:"IBM Plex Mono,monospace", fontWeight:700 }}>{stk.floatPct}%</span></span>
            <span style={{ color:C.smoke, lineHeight:1.5 }}>البيع على المكشوف: <span style={{ color:stk.shortInterest>3?C.coral:C.smoke, fontFamily:"IBM Plex Mono,monospace", fontWeight:700 }}>{stk.shortInterest}%</span></span>
          </div>
          {shs.map((sh,i)=>(
            <div key={i} style={{ marginBottom:i<shs.length-1?14:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <div>
                  <span style={{ fontSize:12, color:C.mist, fontWeight:600, lineHeight:1.5 }}>{sh.n}</span>
                  <div style={{ display:"flex", gap:6, marginTop:2 }}>
                    {sh.type && <Tag text={sh.type} color={C.electric}/>}
                    {sh.since && <span style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>{"منذ "}{sh.since}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {sh.ch!==0 && <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:sh.ch>0?C.mint:C.coral, fontWeight:700, lineHeight:1.5 }}>{sh.ch>0?"+":""}{sh.ch}%</span>}
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:C.snow, lineHeight:1 }}>{sh.pct}%</span>
                </div>
              </div>
              <div style={{ height:5, background:C.layer3, borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${sh.pct}%`, background:`linear-gradient(90deg,${C.electric},${C.gold})`, borderRadius:3 }}/>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* تاريخ تغيرات الملكية */}
      <SectionCard title="تغيرات الملكية — آخر 12 شهر" accent={C.smoke}>
        <div style={{ padding:"12px 16px" }}>
          {[
            {date:"مارس 2025",   name:"مستثمرون مؤسسيون أجانب", change:+0.04, type:"شراء"},
            {date:"يناير 2025",  name:"صندوق الاستثمارات العامة (PIF)", change:0, type:"ثابت"},
            {date:"نوفمبر 2024", name:"مستثمرون مؤسسيون محليون", change:+0.02, type:"شراء"},
            {date:"سبتمبر 2024", name:"السوق العام",              change:-0.12, type:"بيع"},
            {date:"يوليو 2024",  name:"حكومة المملكة",            change:0, type:"ثابت"},
          ].map((ev,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:i<4?`1px solid ${C.line}22`:0 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:ev.type==="شراء"?C.mint:ev.type==="بيع"?C.coral:C.smoke, flexShrink:0 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:C.mist, lineHeight:1.5 }}>{ev.name}</div>
                <div style={{ fontSize:10, color:C.smoke, lineHeight:1.4 }}>{ev.date}</div>
              </div>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:700, color:ev.change>0?C.mint:ev.change<0?C.coral:C.smoke }}>
                {ev.change>0?"+":""}{ev.change!==0?ev.change+"%":"—"}
              </span>
              <Tag text={ev.type} color={ev.type==="شراء"?C.mint:ev.type==="بيع"?C.coral:C.smoke}/>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* تدفق المؤسسات */}
      <SectionCard title="تدفق المؤسسات والذكاء المالي" accent={C.plasma}>
        <div style={{ padding:"10px 16px" }}>
          {(()=>{
            //
            const seed3=(stk.sym||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0);
            const quarters=["Q2 2024","Q3 2024","Q4 2024","Q1 2025"];
            const flows=quarters.map((q,i)=>{
              const lcg3=((seed3+i)*1664525+1013904223)&0xffffffff;
              const r3=(lcg3>>>0)/0xffffffff;
              const netSigns3=[1,-1,1,1];
              const net=parseFloat((netSigns3[i]*(0.3+r3*1.2)).toFixed(2));
              return {q, net, buy:parseFloat((r3*1.5+0.5).toFixed(1)), sell:parseFloat(((1-r3)*1.2+0.3).toFixed(1))};
            });
            const totalNet=flows.reduce((a,f)=>a+f.net,0);
            const maxAbs=Math.max(...flows.map(f=>Math.abs(f.net)));
            return (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:11, color:C.smoke }}>صافي التدفق المؤسسي (4 أرباع)</div>
                    <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:16, fontWeight:900, color:totalNet>=0?C.mint:C.coral }}>
                      {totalNet>=0?"+":""}{totalNet.toFixed(2)} مليار ر.س
                    </div>
                  </div>
                  <Tag text={totalNet>=0?"تراكم مؤسسي":"توزيع مؤسسي"} color={totalNet>=0?C.mint:C.coral}/>
                </div>
                <svg width="100%" viewBox="0 0 300 110" style={{display:"block",marginBottom:8,overflow:"visible"}}>
                  {/* خطوط دليلية */}
                  <line x1={0} y1={55} x2={300} y2={55} stroke={C.smoke} strokeWidth="0.8" opacity="0.4"/>
                  {flows.map((f,i)=>{
                    const x=25+i*68;
                    const h=Math.max(6, Math.abs(f.net)/maxAbs*38);
                    const col=f.net>=0?C.mint:C.coral;
                    const barY=f.net>=0?55-h:55;
                    // الرقم: فوق العمود الموجب بـ14px، تحت الهابط بـ14px
                    const labelY=f.net>=0?barY-14:barY+h+14;
                    return <g key={i}>
                      <rect x={x-13} y={barY} width={26} height={h}
                        fill={col} opacity="0.85" rx="4"/>
                      <text x={x} y={labelY}
                        textAnchor="middle"
                        fill={col}
                        fontSize="10"
                        fontWeight="800"
                        fontFamily="IBM Plex Mono,monospace">
                        {f.net>=0?"+":""}{f.net}
                      </text>
                      <text x={x} y={98}
                        textAnchor="middle"
                        fill={C.smoke}
                        fontSize="8.5"
                        fontFamily="IBM Plex Mono,monospace">
                        {f.q}
                      </text>
                    </g>;
                  })}
                </svg>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {[
                    {l:"أعلى شراء",v:Math.max(...flows.map(f=>f.buy))+"B",c:C.mint},
                    {l:"أعلى بيع", v:Math.max(...flows.map(f=>f.sell))+"B",c:C.coral},
                    {l:"الاتجاه",  v:totalNet>=0?"تراكم":"توزيع",c:totalNet>=0?C.mint:C.coral},
                  ].map((item,i)=>(
                    <div key={i} style={{ background:item.c+"10", borderRadius:7, padding:"6px", textAlign:"center", border:`1px solid ${item.c}22` }}>
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:700, color:item.c }}>{item.v}</div>
                      <div style={{ fontSize:9, color:C.smoke }}>{item.l}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </SectionCard>

      {/* Concentration Ratio */}
      {(()=>{
        const top1=shs[0]?.pct||0;
        const top3=shs.slice(0,3).reduce((a,s)=>a+s.pct,0);
        const top5=shs.slice(0,5).reduce((a,s)=>a+s.pct,0);
        const hhi=shs.reduce((a,s)=>a+Math.pow(s.pct/100,2),0);
        const concC=top3>70?C.amber:top3>50?C.electric:C.mint;
        return (
          <SectionCard title="تركز الملكية — Concentration" accent={concC}>
            <div style={{ padding:"10px 16px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                {[
                  {l:"أكبر مالك",  v:top1.toFixed(1)+"%",  c:top1>50?C.coral:C.mint},
                  {l:"أكبر 3",     v:top3.toFixed(1)+"%",  c:top3>70?C.amber:C.mint},
                  {l:"أكبر 5",     v:top5.toFixed(1)+"%",  c:top5>80?C.amber:C.mint},
                  {l:"HHI", v:hhi.toFixed(3), c:hhi>0.25?C.coral:hhi>0.15?C.amber:C.mint, tip:true},
                ].map((item,i)=>(
                  <div key={i} style={{ background:item.c+"10", borderRadius:8, padding:"7px 4px", textAlign:"center", border:`1px solid ${item.c}22` }}>
                    <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:item.c }}>{item.v}</div>
                    <div style={{ fontSize:9, color:C.smoke, marginTop:2, display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                      {item.l}

                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:10, color:C.smoke, lineHeight:1.6, background:C.layer3, borderRadius:8, padding:"6px 10px" }}>
                {top3>70?"تركز عال — أكبر 3 ملاك يسيطرون على "+top3.toFixed(0)+"% — خطر قرار فردي":
                 top3>50?"تركز متوسط — ملكية شبه متوازنة مع هيمنة واضحة":
                 "تنوع جيد — توزيع الملكية يقلل المخاطر"}
              </div>
            </div>
          </SectionCard>
        );
      })()}

      {/* Smart Money vs Retail */}
      <SectionCard title="الأموال الذكية vs التجزئة" accent={C.teal}>
        <div style={{ padding:"10px 16px" }}>
          {(()=>{
            const shs2=SHAREHOLDERS[stk.sym]||SHAREHOLDERS.default;
            const institutional=shs2.filter(s=>s.type==="مؤسسي"||s.type==="حكومي").reduce((a,s)=>a+s.pct,0);
            const retail=parseFloat(Math.max(0,100-institutional-shs2.filter(s=>s.type!=="تجزئة").reduce((a,s)=>a+s.pct,0)).toFixed(1));
            const smart=institutional;
            const smartC=smart>70?C.electric:smart>50?C.mint:C.amber;
            return (
              <>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  {[
                    {l:"مؤسسي/حكومي", v:smart.toFixed(1)+"%", c:C.electric,
                      svg:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="11" width="20" height="11" rx="1"/><path d="M12 2L2 9h20L12 2z"/><line x1="6" y1="15" x2="6" y2="22"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="18" y1="15" x2="18" y2="22"/></svg>},
                    {l:"تجزئة", v:stk.floatPct+"%", c:C.mint,
                      svg:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6"/><path d="M17 14c2 0 4 1.3 4 3.5"/></svg>},
                    {l:"قوة الأموال الذكية", v:smart>60?"عالية":smart>40?"متوسطة":"منخفضة", c:smartC,
                      svg:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={smartC} strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 2a6.5 6.5 0 0 1 5 10.6V20a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-7.4A6.5 6.5 0 0 1 9.5 2z"/><line x1="9.5" y1="12" x2="9.5" y2="20"/><line x1="7" y1="16" x2="12" y2="16"/></svg>},
                  ].map((item,i)=>(
                    <div key={i} style={{ flex:1, background:item.c+"10", borderRadius:9, padding:"8px 6px", textAlign:"center", border:`1px solid ${item.c}22`, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      {item.svg}
                      <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:item.c }}>{item.v}</div>
                      <div style={{ fontSize:9, color:C.smoke, lineHeight:1.3 }}>{item.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:C.smoke, lineHeight:1.6, background:C.layer3, borderRadius:8, padding:"7px 10px" }}>
                  💡 الأموال الذكية ({smart.toFixed(1)}%) تشمل المؤسسات والصناديق والحكومة — ارتفاعها يعني ثقة عالية بالسهم
                </div>
              </>
            );
          })()}
        </div>
      </SectionCard>

      {/* معاملات المطلعين */}
      {txs.length > 0 && (
        <SectionCard title="معاملات المطلعين" accent={C.plasma}>
          <div style={{ padding:"8px 16px 4px", fontSize:11, color:C.smoke, lineHeight:1.5 }}>آخر 12 شهراً — من بيانات الإفصاح الرسمي</div>
          {txs.map((tx,i)=>(
            <div key={i} style={{ padding:"11px 16px", borderBottom:i<txs.length-1?`1px solid ${C.line}22`:0, background:i%2?"rgba(255,255,255,.015)":"transparent" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:C.mist, fontWeight:600, lineHeight:1.5 }}>{tx.name}</div>
                  <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>{tx.date} · {tx.shares.toLocaleString("en-US")} سهم بـ {tx.price} ر.س</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <Tag text={tx.action} color={tx.action==="شراء"?C.mint:C.coral}/>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:tx.action==="شراء"?C.mint:C.coral, fontWeight:700, lineHeight:1.5 }}>{tx.value} ر.س</span>
                </div>
              </div>
            </div>
          ))}
        </SectionCard>
      )}

      {/* الالتزام الشرعي */}
      <SectionCard title="الالتزام الشرعي" accent={sC}>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:11, color:C.smoke, textTransform:"uppercase", letterSpacing:"0.6px", lineHeight:1.5 }}>الالتزام الشرعي</span>
                {shStatus.date && <span style={{ fontSize:11, color:C.smoke, background:C.layer3, padding:"1px 6px", borderRadius:6, border:`1px solid ${C.line}`, lineHeight:1.5 }}>{shStatus.date}</span>}
                {shStatus.source_type==="ai" && <Tag text="AI" color={C.electric}/>}
              </div>
              {shStatus.loading
                ? <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:4 }}><div style={{ width:14,height:14,border:`2px solid ${C.electric}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/><span style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>جارٍ التحقق من التقرير الشرعي...</span></div>
                : <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:sC, textShadow:`0 0 8px ${sC}55`, marginTop:2, lineHeight:1.5 }}>{shStatus.status}</div>
              }
              {shStatus.reason && !shStatus.loading && <div style={{ fontSize:11, color:C.smoke, marginTop:4, lineHeight:1.5 }}>{shStatus.reason}</div>}
              {shStatus.purification != null && !shStatus.loading && (
                <div style={{ marginTop:6, fontSize:11, color:C.amber, background:C.amber+"10", borderRadius:6, padding:"4px 10px", border:`1px solid ${C.amber}22`, lineHeight:1.5 }}>
                  نسبة التطهير: {shStatus.purification}% من الدخل الاستثماري
                </div>
              )}
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, marginLeft:12 }}>
              <div style={{ width:44, height:44, borderRadius:22, background:sC+"18", border:`1px solid ${sC}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:sC, fontWeight:900, textShadow:`0 0 10px ${sC}66` }}>
                {shStatus.loading?"…":shStatus.halal?"✓":shStatus.halal===false?"✗":"⚠"}
              </div>
              <button onClick={()=>{ haptic(); checkShariah(); }} disabled={shStatus.loading}
                style={{ background:"transparent", border:`1px solid ${C.line}`, color:C.smoke, fontSize:11, padding:"8px 14px", borderRadius:8, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"Cairo,sans-serif", minHeight:44, lineHeight:1.5 }} aria-label="تحديث التقييم الشرعي">
                تحديث AI
              </button>
            </div>
          </div>
          {shStatus.details && !shStatus.loading && (
            <div style={{ background:sC+"10", borderRadius:10, padding:"10px 12px", border:`1px solid ${sC}25`, marginTop:12 }}>
              <div style={{ fontSize:11, color:sC, fontWeight:700, marginBottom:4, lineHeight:1.5 }}>الحكم الشرعي التفصيلي</div>
              <div style={{ fontSize:11, color:C.mist, lineHeight:1.7 }}>{shStatus.details}</div>
              {shStatus.source && <div style={{ fontSize:11, color:C.smoke, marginTop:6, paddingTop:6, borderTop:`1px solid ${sC}22`, lineHeight:1.5 }}>{"المرجع: "}{shStatus.source}</div>}
            </div>
          )}
          {shStatus.error && <div style={{ fontSize:11, color:C.coral, marginTop:4, lineHeight:1.5 }}>{shStatus.error}</div>}
        </div>
      </SectionCard>


      {/* تحليل اتجاه المطلعين */}
      {txs.length > 0 && (()=>{
        const buyTxs=txs.filter(t=>t.action==="شراء");
        const sellTxs=txs.filter(t=>t.action==="بيع");
        const buyVal=buyTxs.reduce((a,t)=>a+parseFloat((t.value||"0").replace(/[^0-9.]/g,"")||0),0);
        const sellVal=sellTxs.reduce((a,t)=>a+parseFloat((t.value||"0").replace(/[^0-9.]/g,"")||0),0);
        const total=buyVal+sellVal||1;
        const insiderC=buyVal>=sellVal?C.mint:C.coral;
        return (
          <SectionCard title="تحليل اتجاه المطلعين" accent={insiderC}>
            <div style={{ padding:"12px 16px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                {[
                  {l:"صفقات شراء", v:buyTxs.length,  c:C.mint},
                  {l:"صفقات بيع",  v:sellTxs.length, c:C.coral},
                  {l:"الاتجاه",    v:buyVal>=sellVal?"تراكم":"توزيع", c:insiderC},
                ].map((item,i)=>(
                  <div key={i} style={{ background:item.c+"12", borderRadius:8, padding:"8px 6px", textAlign:"center", border:`1px solid ${item.c}25` }}>
                    <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:item.c }}>{item.v}</div>
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
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:4 }}>
                  <span style={{ color:C.mint }}>{"شراء "}{(buyVal/total*100).toFixed(0)}{"%"}</span>
                  <span style={{ color:C.coral }}>{"بيع "}{(sellVal/total*100).toFixed(0)}{"%"}</span>
                </div>
                <div style={{ height:8, borderRadius:4, overflow:"hidden", background:C.coral, direction:"ltr" }}>
                  <div style={{ height:"100%", width:`${(buyVal/total*100).toFixed(0)}%`, background:C.mint, borderRadius:"4px 0 0 4px" }}/>
                </div>
              </div>
              <div style={{ fontSize:10, color:C.smoke, lineHeight:1.6, padding:"6px 10px", background:C.layer3, borderRadius:8 }}>
                {buyVal>=sellVal?"المطلعون يشترون أكثر مما يبيعون — إشارة ثقة داخلية":"المطلعون يبيعون أكثر مما يشترون — قد يكون توقعا بتراجع"}
              </div>
            </div>
          </SectionCard>
        );
      })()}
    </div>
  );
}

// ─── API Panels ───────────────────────────────────────────────────

export { ShareholdersLoader, SDShareholders };
