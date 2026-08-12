'use client';
import React from 'react';
import { C } from './AnalysisHelpers';
import { scoreWord } from '../../engines/analysisEngine';

export default function MarketOverviewCard({ allData, signalCounts, marketAverages, sortedByScore }) {
            const totalN     = allData.length;
            const buyN       = signalCounts.buy;
            const watchN     = signalCounts.watch;
            const reduceN    = signalCounts.reduce;
            const noSigN     = signalCounts.neutral;
            const avgHealth  = marketAverages.health;
            const avgConf    = marketAverages.conf;
            const avgRadar   = marketAverages.radar;
            const mktLabel   = "المؤشر العام";
            
 
            // 🎯 معايرة علمية: 65/55/45/38
            const mktColor = avgHealth>=65?C.mint:avgHealth>=55?C.electric:avgHealth>=45?C.amber:avgHealth>=38?"#c0392b":"#a93226"
const mktIcon = avgHealth>=65
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><path d="M12 2L8 12H4l8 10 8-10h-4L12 2z"/></svg>
  : avgHealth>=55
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  : avgHealth>=45
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><circle cx="12" cy="12" r="9"/></svg>
  : avgHealth>=38
  ? <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
  : <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={mktColor} strokeWidth={2} strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const best = sortedByScore.length > 0 ? sortedByScore[0] : null;

            return(
              <div style={{margin:"0 16px 14px",position:"relative"}}>
                <div style={{
                  background:`linear-gradient(160deg,#0f1628 0%,#131a2e 60%,#162040 100%)`,
                  borderRadius:20,border:`1px solid ${C.line}`,overflow:"hidden",
                  boxShadow:`0 16px 48px rgba(0,0,0,.45), inset 0 1px 0 ${C.layer3}`,
                }}>
                  {/* ضوء محيطي */}
                  <div style={{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",
                    background:`radial-gradient(circle,${mktColor}0a 0%,transparent 70%)`,pointerEvents:"none"}}/>

                  {/* ══ القسم ١ -- صحة السوق (دائماً مرئي) ══ */}
                  <div style={{padding:"16px 16px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>

                      {/* التصنيف + الأرقام السريعة -- يمين */}
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
<span style={{display:"flex",alignItems:"center"}}>{mktIcon}</span>
                          <span style={{fontSize:16,fontWeight:900,color:mktColor,letterSpacing:"-.3px"}}>{mktLabel}</span>
                          {(function(){
                            var isOpen = getKsaMarket().isOpen;

                            var stCol = isOpen ? mktColor : C.coral;
                            var stLbl = isOpen ? "مباشر" : "مغلق";
                            return (
                              <div style={{marginRight:"auto",display:"flex",alignItems:"center",gap:4,
                                background:stCol+"15",borderRadius:20,padding:"2px 8px",border:`1px solid ${stCol}30`}}>
                                <div className={isOpen?"live-dot":""} style={{width:5,height:5,borderRadius:"50%",background:stCol}}/>
                                <span style={{fontSize:8,fontWeight:700,color:stCol}}>{stLbl}</span>
                              </div>
                            );
                          })()}
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

                      {/* الحلقة 68px -- يسار */}
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
                  {/* ══ اتساع السوق -- بين المؤشر العام وأفضل اختيار ══ */}
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
                  {/* ══ القسم ٢ -- أفضل اختيار (دائماً مرئي) ══ */}
                  {best && best.stk && best.health && (
                  <div style={{padding:"12px 16px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>

                      {/* يمين -- اسم + رقم + قطاع + سعر + % */}
                      <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
{best && best.stk && (
<div style={{fontSize:15,fontWeight:900,color:C.snow}}>{best.stk.name}</div>
)}

                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:8,color:C.smoke,background:C.layer3,padding:"1px 6px",borderRadius:4}}>{best.stk.sym}</span>
                          <span style={{fontSize:8,color:C.smoke}}>{best.stk.sec}</span>
                        </div>
                        <div style={{fontSize:17,fontWeight:900,color:C.snow,direction:"ltr",letterSpacing:"-.5px"}}>{best.stk.p.toFixed(2)}</div>
                        <div style={{display:"inline-flex",alignItems:"center",background:(best.stk.ch>=0?C.mint:C.coral)+"20",border:"1px solid "+(best.stk.ch>=0?C.mint:C.coral)+"44",borderRadius:6,padding:"2px 8px",direction:"ltr"}}>
                          <span style={{fontSize:10,fontWeight:700,color:best.stk.ch>=0?C.mint:C.coral}}>{best.stk.ch>=0?"+":""}{best.stk.ch.toFixed(2)}%</span>
                        </div>
                      </div>
                      {/* وسط -- badge + إشارة + ثقة */}
                      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                        <span style={{fontSize:8,color:C.gold,fontWeight:700,background:"rgba(212,168,67,.12)",border:"1px solid rgba(212,168,67,.25)",padding:"2px 8px",borderRadius:6}}>⭐ أفضل اختيار</span>
                        <span style={{fontSize:9,fontWeight:700,color:best.health.sigC,background:best.health.sigC+"15",border:"1px solid "+best.health.sigC+"33",padding:"2px 8px",borderRadius:6}}>{best.health.sig}</span>
                      </div>
                      {/* يسار -- الدائرة */}
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
                  )}
                </div>
              </div>
            );
            }
