'use client';
import React from 'react';
import { SignalsPanel, C } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';

export default function SignalsPage({
  allData, filtered2, filters, setFilters,
  screenerOpen, setScreenerOpen, sectorList,
  onBack, haptic
}) {
  return (
        <div style={{padding:"90px 20px 90px",position:"relative",zIndex:1}}>

<button onClick={()=>{ haptic.tap(); setPage("home"); }} style={{
  position:"absolute",top:52,right:16,
  background:C.layer2,border:"1px solid "+C.line,
  borderRadius:10,padding:"7px 14px",
  color:C.smoke,fontSize:12,cursor:"pointer",
  display:"flex",alignItems:"center",gap:6,
}}>
  ← رجوع
</button>        
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"3px",marginBottom:4}}>SIGNALS</div>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:"-0.5px"}}>
              <span style={{
                background:`linear-gradient(90deg,${C.snow},${C.mist})`,
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              }}>إشارات اليوم</span>
            </div>
          </div>

          {/* ملخص الإشارات -- SignalsPanel */}
          <SignalsPanel allData={allData} C={C} LC={C} scoreWord={scoreWord}/>

          {/* ══ فلاتر الفرز المتقدمة -- Stock Screener ══ */}
          {(
              <div style={{marginBottom:16}}>
 
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                                    <button onClick={function(){ haptic.toggle(); setScreenerOpen(function(v){return !v;});}} style={{
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
                          <span style={{color:C.smoke,fontSize:9}}>--</span>
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
                                            <button onClick={function(){ haptic.tap(); setFilters({minScore:0,maxScore:100,sig:'all',sector:'all',minPE:0,maxPE:200,minDivY:0,minROE:0,minUpside:-100,regime:'all',gatesAll:false});}}
                        style={{padding:"3px 10px",borderRadius:6,background:"none",border:"1px solid "+C.line,color:C.smoke,fontSize:9,cursor:"pointer"}}>
                        إعادة ضبط
                      </button>
                    </div>
                  </div>
                )}
              </div>
          )}

          {/* بطاقات الإشارات */}
          {filtered2.map(({stk,bars,health},i)=>(
            <div key={stk.sym} className="card-enter" style={{animationDelay:`${i*.06}s`,marginBottom:10}}>
              <div style={{
                background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
                borderRadius:16,padding:"14px 16px",
                border:`1px solid ${health.sigC}33`,
                boxShadow:`0 4px 20px rgba(0,0,0,.3), inset 0 0 0 1px ${health.sigC}08`,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                                      {/* النقطة الملوّنة */}
                  {/* 🎯 معايرة: 65/55 */}
                  <div style={{
                    width:44,height:44,borderRadius:12,flexShrink:0,
                    background:`linear-gradient(135deg,${health.sigC}22,${health.sigC}11)`,
                    border:`1px solid ${health.sigC}44`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:18,
                  }}>
                    {health.score>=65?"🚀":health.score>=55?"👁":"⚡"}
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
          );
}
