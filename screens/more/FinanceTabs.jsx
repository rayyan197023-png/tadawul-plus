'use client';
/**
 * @module screens/more/FinanceTabs
 * @description تبويبات مالية: توزيعات، اكتتابات، صناديق، تقويم، كلي
 */
import { useState, useMemo, useEffect } from 'react';
import { ArcRing, C, DIVS, EVENTS, FUNDS, IPOS, Ico, MiniLine, SectionHeader, Stars } from './MoreShared';

function DividendsTab(props) {
  var tp=props.p?props.p:props;
  var sub=tp.sub;
  var setSub=tp.setSub;
  var stocksLive=tp.stocksLive;
  var rankIdx=tp.rankIdx;
  var setRankIdx=tp.setRankIdx;
  var rankSec=tp.rankSec;
  var setRankSec=tp.setRankSec;
  var commData=tp.commData;
  var commCat=tp.commCat;
  var setCommCat=tp.setCommCat;
  var fundTab=tp.fundTab;
  var setFundTab=tp.setFundTab;
  var ipoF=tp.ipoF;
  var setIpoF=tp.setIpoF;
  var calF=tp.calF;
  var setCalF=tp.setCalF;
  var divItem=tp.divItem;
  var setDivItem=tp.setDivItem;
  var divShares=tp.divShares;
  var setDivShares=tp.setDivShares;
  var divCost=tp.divCost;
  var setDivCost=tp.setDivCost;
  var snaps=tp.snaps;
  var setSnaps=tp.setSnaps;
  var editSnap=tp.editSnap;
  var setEditSnap=tp.setEditSnap;
  var snapTag=tp.snapTag;
  var setSnapTag=tp.setSnapTag;
  var fontSize=tp.fontSize;
  var setFontSize=tp.setFontSize;
  var notifSound=tp.notifSound;
  var setNotifSound=tp.setNotifSound;
  var homeConf=tp.homeConf;
  var setHomeConf=tp.setHomeConf;
  var rField=tp.rField;
  var rankItems=tp.rankItems;
  var secList=tp.secList;
  var commF=tp.commF;
  var catList=tp.catList;
  var fundsF=tp.fundsF;
  var iposF=tp.iposF;
  var eventsF=tp.eventsF;
  var cfmt=tp.cfmt;
  var commAgoStr=tp.commAgoStr;
  var fmtT=tp.fmtT;
  var BOX=tp.BOX;
  var SHD=tp.SHD;
  var SHD_ACTIVE=tp.SHD_ACTIVE;
  var liveTime=tp.liveTime; var commLastUpdate=tp.commLastUpdate;
  var rankTick=tp.rankTick;
  var divDateItems=divItem?[{l:"تاريخ الاستحقاق",v:divItem.exDate},{l:"تاريخ التوزيع",v:divItem.payDate}]:[];
  return(
        <div style={{position:"relative",zIndex:1}}>
          
          {divItem&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.97)",zIndex:99,display:"flex",alignItems:"flex-end"}}>
              <div style={{
                background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",
                borderRadius:"24px 24px 0 0",
                width:"100%",padding:"24px 20px",
                border:"1px solid "+C.line,
                boxShadow:"0 -24px 64px rgba(0,0,0,.7), inset 0 1px 0 "+C.layer3,
                maxHeight:"88vh",overflowY:"auto",
              }}>
                <div style={{textAlign:"center",marginBottom:20}}>
                  <div style={{fontSize:9,color:C.mint,fontWeight:700,letterSpacing:"2px",marginBottom:4}}>DIVIDENDS CALCULATOR</div>
                  <div className="glow-mint" style={{fontSize:18,fontWeight:900,color:C.snow}}>{divItem.name}</div>
                  <div style={{fontSize:10,color:C.smoke,marginTop:3}}>سنوي · عائد {((divItem.perShare*(divItem.timesPerYear||1))/divItem.price*100).toFixed(2)}% سنوي</div>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:C.smoke,marginBottom:6,textAlign:"right"}}>عدد الأسهم التي تمتلكها</div>
                  <input value={divShares} onChange={function(e){setDivShares(e.target.value);}}
                    style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:12,padding:"13px",color:C.snow,fontSize:18,textAlign:"center",outline:"none",boxSizing:"border-box",fontFamily:"'IBM Plex Mono',monospace"}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:C.smoke,marginBottom:5,textAlign:"right"}}>سعر الشراء الأصلي (Yield on Cost)</div>
                  <input value={divCost} onChange={function(e){setDivCost(e.target.value);}} placeholder="اختياري"
                    style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:12,padding:"11px 14px",color:C.snow,fontSize:14,outline:"none",direction:"ltr",textAlign:"right",boxSizing:"border-box"}}/>
                  {(function(){
                    var cost=parseFloat(divCost);
                    if(!cost||cost<=0) return null;
                    var annD=divItem.perShare*(divItem.timesPerYear||1); // التوزيع السنوي الكامل
                    var yoc=(annD/cost*100).toFixed(2);
                    return(<div className="glow-mint" style={{fontSize:12,color:C.mint,fontWeight:700,marginTop:5,textAlign:"right"}}>Yield on Cost: <span className="m">{yoc}%</span></div>);
                  }())}
                </div>
                <div style={{background:C.mint+"08",border:"1px solid "+C.mint+"33",borderRadius:16,padding:"18px 16px",marginBottom:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:C.smoke,marginBottom:5}}>هذا التوزيع</div>
                      <div className="num-lg glow-mint" style={{fontSize:22,fontWeight:900,color:C.mint}}>{cfmt(divItem.perShare)}</div>
                      <div style={{fontSize:9,color:C.smoke,marginTop:2}}>ر.س / للسهم</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:9,color:C.smoke,marginBottom:5}}>إجمالي التوزيع</div>
                      <div className="num-lg glow-gold" style={{fontSize:22,fontWeight:900,color:C.gold}}>{cfmt((parseFloat(divShares)||0)*divItem.perShare)}</div>
                      <div style={{fontSize:9,color:C.smoke,marginTop:2}}>ر.س</div>
                    </div>
                     </div>
                  {(function(){
                    var shares=parseFloat(divShares)||0;
                    if(shares<=0) return null;
                    // التوزيعات السعودية سنوية — perShare هو التوزيع السنوي للسهم
                    var annD=shares*divItem.perShare;
                    // سعر السهم: من DIVS مباشرة أو STOCKS
                    var spArr=STOCKS.filter(function(s){return s.sym===divItem.sym;});
                    var spPrice=divItem.price||(spArr.length>0?spArr[0].p:0);
                    if(!spPrice||spPrice<=0) return null;
                    // أسهم جديدة بالسنة = إجمالي التوزيعات ÷ سعر السهم
                    var newSh=(annD/spPrice).toFixed(2);
                    // عائد التوزيع الفعلي = perShare ÷ سعر السهم
                    var yr=divItem.perShare/spPrice;
                    // رصيد بعد 3 سنوات بإعادة استثمار التوزيعات (DRIP)
                    var totalShares3=Math.round(shares*Math.pow(1+yr,3));
                    var newShares3=totalShares3-Math.round(shares);
                    var totalDiv3=parseFloat((annD*3).toFixed(2));
                    return(
                      <div style={{borderTop:"1px solid "+C.mint+"20",paddingTop:14}}>
                        <div style={{fontSize:9,color:C.mint,fontWeight:700,marginBottom:8,textAlign:"right"}}>DRIP — إعادة استثمار التوزيعات · 3 سنوات</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                          <div style={{background:C.mint+"10",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
                            <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>توزيعات/سنة</div>
                            <div className="num" style={{fontSize:13,fontWeight:900,color:C.mint}}>{cfmt(annD)}</div>
                            <div style={{fontSize:7,color:C.smoke}}>ر.س</div>
                          </div>
                          <div style={{background:C.electric+"10",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
                            <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>إجمالي 3 سنوات</div>
                            <div className="num" style={{fontSize:13,fontWeight:900,color:C.electric}}>{cfmt(totalDiv3)}</div>
                            <div style={{fontSize:7,color:C.smoke}}>ر.س</div>
                          </div>
                          <div style={{background:C.gold+"10",borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
                            <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>أسهمك بعد 3 سنوات</div>
                            <div className="num" style={{fontSize:13,fontWeight:900,color:C.gold}}>{totalShares3}</div>
                            <div style={{fontSize:7,color:C.mint}}>+{newShares3} سهم جديد</div>
                          </div>
                        </div>
                      </div>
                    );
                  }())}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  {divDateItems.map(function(r){return(
                    <div key={r.l} style={{background:C.layer3,borderRadius:12,padding:"12px",textAlign:"center",border:"1px solid "+C.line}}>
                      <div style={{fontSize:9,color:C.smoke,marginBottom:4}}>{r.l}</div>
                      <div className="m" style={{fontSize:12,fontWeight:700,color:C.mist,direction:"ltr"}}>{r.v}</div>
                    </div>
                  );})}
                </div>
                <button onClick={function(){setDivItem(null);setDivCost("");}} style={{
                  width:"100%",background:"linear-gradient(135deg,"+C.layer3+","+C.edge+")",
                  border:"1px solid "+C.line,color:C.smoke,
                  padding:"14px",borderRadius:14,fontSize:13,cursor:"pointer",
                  fontFamily:"Cairo,sans-serif",
                }}>إغلاق</button>
              </div>
            </div>
          )}
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {DIVS.map(function(div,i){
              // ── دمج سعر السوق الحي ──
              var liveDiv=stocksLive&&stocksLive.filter(function(s){return s.sym===div.sym;})[0];
              var curPrice=liveDiv?liveDiv.p:div.price;
              var liveYield=curPrice>0?((div.perShare*div.timesPerYear)/curPrice*100).toFixed(2):null;
              var divRowDates=[{l:"استحقاق",v:div.exDate},{l:"توزيع",v:div.payDate}];
              return(
              <div key={i} className={"card-enter "+(div.daysLeft<=5?"danger-pulse":div.daysLeft<=20?"buy-glow":"")} style={{
                animationDelay:(i*0.06)+"s",
                background:BOX,
                border:"1px solid "+(div.daysLeft<=10?C.mint+"55":C.line),
                borderRadius:20,overflow:"hidden",
                boxShadow:div.daysLeft<=10?SHD_ACTIVE+C.mint+"18, 0 0 0 1px "+C.mint+"22":SHD,
              }}>
                {div.daysLeft<=10&&<div style={{height:2,background:"linear-gradient(90deg,transparent,"+C.mint+",transparent)"}}/>}
                <div style={{padding:"14px 16px",background:"linear-gradient(90deg,"+C.mint+"06,transparent)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:C.snow,marginBottom:4}}>{div.name}</div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"1px 8px",borderRadius:5,border:"1px solid "+C.line}}>{div.sec}</span>
                        <span style={{fontSize:9,color:C.mint,background:C.mint+"12",padding:"1px 8px",borderRadius:5,border:"1px solid "+C.mint+"25"}}>{div.timesPerYear===4?"ربعي":div.timesPerYear===2?"نصف سنوي":"سنوي"}</span>
                        {div.daysLeft<=10&&<span style={{fontSize:9,color:C.coral,background:C.coral+"15",padding:"1px 8px",borderRadius:5,display:"inline-flex",alignItems:"center",gap:3}}><Ico k="alert" color={C.coral} size={10}/>{div.daysLeft} يوم</span>}
                      </div>
                      
                      <div style={{display:"flex",gap:3,alignItems:"flex-end",height:22,marginTop:10}}>
                        {(function(){
                          var mx2=Math.max.apply(null,div.hist)||1;
                          return div.hist.map(function(v,hi){
                            var h2=Math.max(4,Math.round((v/mx2)*22));
                            var isLast=hi===div.hist.length-1;
                            return(<div key={hi} style={{width:14,height:h2,borderRadius:3,background:isLast?C.mint:C.mint+"55",boxShadow:isLast?"0 0 6px "+C.mint+"88":"none"}}/>);
                          });
                        }())}
                      </div>
                    </div>
                    <div style={{textAlign:"left"}}>
                      <div className="num-lg glow-mint" style={{fontSize:24,fontWeight:900,color:C.mint}}>{cfmt(div.perShare)}</div>
                      <div style={{fontSize:9,color:C.smoke}}>/ سهم</div>
                      <div style={{fontSize:10,fontWeight:700,color:C.teal,textAlign:"right",marginTop:3}}>عائد {((div.perShare*(div.timesPerYear||1))/div.price*100).toFixed(2)}%</div>
                    </div>
                  </div>
                </div>
                <div style={{borderTop:"1px solid "+C.line+"22",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:16}}>
                    {divRowDates.map(function(d){return(
                      <div key={d.l}>
                        <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>{d.l}</div>
                        <div className="m" style={{fontSize:11,fontWeight:700,color:C.mist,direction:"ltr"}}>{d.v}</div>
                      </div>
                    );})}
                  </div>
                  <button onClick={function(){setDivItem(div);setDivShares("100");setDivCost("");}} style={{
                    background:"linear-gradient(135deg,"+C.mint+"22,"+C.mint+"11)",
                    border:"1px solid "+C.mint+"44",color:C.mint,
                    padding:"9px 16px",borderRadius:12,fontSize:11,cursor:"pointer",fontWeight:800,
                    boxShadow:"0 4px 12px "+C.mint+"22",
                  }}>احسب العائد</button>
                </div>
              </div>
            );})}
          </div>
          <div style={{height:20}}/>
        </div>
  );
}

function IposTab(props) {
  var tp=props.p?props.p:props;
  var sub=tp.sub;
  var setSub=tp.setSub;
  var stocksLive=tp.stocksLive;
  var rankIdx=tp.rankIdx;
  var setRankIdx=tp.setRankIdx;
  var rankSec=tp.rankSec;
  var setRankSec=tp.setRankSec;
  var commData=tp.commData;
  var commCat=tp.commCat;
  var setCommCat=tp.setCommCat;
  var fundTab=tp.fundTab;
  var setFundTab=tp.setFundTab;
  var ipoF=tp.ipoF;
  var setIpoF=tp.setIpoF;
  var calF=tp.calF;
  var setCalF=tp.setCalF;
  var divItem=tp.divItem;
  var setDivItem=tp.setDivItem;
  var divShares=tp.divShares;
  var setDivShares=tp.setDivShares;
  var divCost=tp.divCost;
  var setDivCost=tp.setDivCost;
  var snaps=tp.snaps;
  var setSnaps=tp.setSnaps;
  var editSnap=tp.editSnap;
  var setEditSnap=tp.setEditSnap;
  var snapTag=tp.snapTag;
  var setSnapTag=tp.setSnapTag;
  var fontSize=tp.fontSize;
  var setFontSize=tp.setFontSize;
  var notifSound=tp.notifSound;
  var setNotifSound=tp.setNotifSound;
  var homeConf=tp.homeConf;
  var setHomeConf=tp.setHomeConf;
  var rField=tp.rField;
  var rankItems=tp.rankItems;
  var secList=tp.secList;
  var commF=tp.commF;
  var catList=tp.catList;
  var fundsF=tp.fundsF;
  var iposF=tp.iposF;
  var eventsF=tp.eventsF;
  var cfmt=tp.cfmt;
  var commAgoStr=tp.commAgoStr;
  var fmtT=tp.fmtT;
  var BOX=tp.BOX;
  var SHD=tp.SHD;
  var SHD_ACTIVE=tp.SHD_ACTIVE;
  var liveTime=tp.liveTime; var commLastUpdate=tp.commLastUpdate;
  var rankTick=tp.rankTick;
  var ipoFilters=[{k:"all",l:"الكل"},{k:"open",l:"مفتوح/قريباً"},{k:"closed",l:"مكتمل"}];
  return(
        <div style={{position:"relative",zIndex:1}}>
          <div style={{padding:"10px 16px 4px",display:"flex",gap:6,borderBottom:"1px solid "+C.line}}>
            {ipoFilters.map(function(f){return(
              <button key={f.k} onClick={function(){setIpoF(f.k);}} style={{
                padding:"7px 16px",borderRadius:18,
                border:"1px solid "+(ipoF===f.k?C.electric+"55":C.line),
                background:ipoF===f.k?"linear-gradient(135deg,"+C.electric+"22,"+C.electric+"11)":C.layer3,
                color:ipoF===f.k?C.electric:C.smoke,
                fontSize:10,cursor:"pointer",marginBottom:8,fontWeight:ipoF===f.k?800:400,
              }}>{f.l}</button>
            );})}
          </div>
          <div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {iposF.map(function(ipo,i){
              var aC=ipo.analyst==="شراء"?C.mint:ipo.analyst==="تخفيف"?C.coral:C.amber;
              var ups=ipo.target&&ipo.price?((ipo.target-ipo.price)/ipo.price*100).toFixed(1):null;
              return(
                <div key={i} className={"card-enter "+(ipo.open&&ipo.subPct&&ipo.subPct>150?"buy-glow":ipo.open&&ipo.daysLeft<=5?"danger-pulse":"")} style={{
                  animationDelay:(i*0.06)+"s",
                  background:BOX,
                  border:"1px solid "+(ipo.open?C.electric+"33":C.line),
                  borderRadius:20,overflow:"hidden",
                  boxShadow:ipo.open?SHD_ACTIVE+C.electric+"18, 0 0 0 1px "+C.electric+"15":SHD,
                }}>
                  {ipo.open&&<div style={{height:2,background:"linear-gradient(90deg,transparent,"+C.electric+",transparent)"}}/>}
                  <div style={{padding:"14px 16px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:800,color:C.snow,marginBottom:4}}>{ipo.name}</div>
                        <div style={{display:"flex",gap:5}}>
                          <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"1px 8px",borderRadius:5,border:"1px solid "+C.line}}>{ipo.sec}</span>
                          <span style={{fontSize:9,color:C.smoke}}>{ipo.mktCap}</span>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                        <span style={{background:ipo.open?C.mint+"18":C.layer3,border:"1px solid "+(ipo.open?C.mint+"44":C.line),color:ipo.open?C.mint:C.smoke,fontSize:10,fontWeight:800,borderRadius:9,padding:"3px 12px"}}>{ipo.status}</span>
                        <span style={{background:aC+"18",border:"1px solid "+aC+"30",color:aC,fontSize:9,fontWeight:700,borderRadius:6,padding:"2px 8px"}}>{ipo.analyst}</span>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
                      {[
                        {l:"سعر الاكتتاب",v:cfmt(ipo.price),c:C.gold},
                        {l:"الهدف",        v:ipo.target?cfmt(ipo.target):"—",c:ipo.open?C.mint:C.smoke},
                        {l:"الأسهم",       v:ipo.shares,c:C.mist},
                      ].map(function(x){return(
                        <div key={x.l} style={{background:"rgba(255,255,255,.03)",borderRadius:12,padding:"10px 8px",textAlign:"center",border:"1px solid "+C.line}}>
                          <div style={{fontSize:8,color:C.smoke,marginBottom:4}}>{x.l}</div>
                          <div className="num" style={{fontSize:13,fontWeight:900,color:x.c}}>{x.v}</div>
                        </div>
                      );})}
                    </div>
                    {ipo.desc&&<div style={{fontSize:10,color:C.smoke,lineHeight:1.6,marginBottom:8}}>{ipo.desc}</div>}
                    {ipo.duration&&(
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:C.electric+"08",border:"1px solid "+C.electric+"22",borderRadius:10,padding:"7px 12px"}}>
                        <span style={{fontSize:9,color:C.electric,fontWeight:700}}>{ipo.duration}</span>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:9,color:C.smoke,display:"inline-flex",alignItems:"center",gap:3}}><Ico k="calendar" color={C.smoke} size={10}/>فترة الاكتتاب</span>
                          {ipo.open&&<span style={{fontSize:9,color:C.gold,background:C.gold+"15",border:"1px solid "+C.gold+"30",borderRadius:6,padding:"1px 7px",fontWeight:700}}>النشرة</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  {ipo.subPct&&(
                    <div style={{padding:"0 16px 12px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                        <span className="num" style={{fontSize:10,fontWeight:700,color:ipo.subPct>=200?C.mint:ipo.subPct>=100?C.amber:C.smoke}}>{ipo.subPct}%</span>
                        <span style={{fontSize:9,color:C.smoke}}>نسبة الاكتتاب</span>
                      </div>
                      <div style={{height:6,background:C.edge,borderRadius:3,overflow:"hidden",position:"relative",direction:"ltr"}}>
                        <div style={{position:"absolute",top:0,left:"33.3%",width:"1.5px",height:"100%",background:"rgba(255,255,255,0.4)",zIndex:1}}/>
                        <div style={{height:"100%",width:Math.min(100,ipo.subPct/3)+"%",background:ipo.subPct>=200?"linear-gradient(90deg,"+C.electric+","+C.mint+")":ipo.subPct>=100?"linear-gradient(90deg,"+C.electric+","+C.gold+")":"linear-gradient(90deg,"+C.electric+","+C.plasma+")",transition:"width .6s ease",borderRadius:3}}/>
                        <div style={{height:"100%",width:Math.min(100,ipo.subPct/3)+"%",background:ipo.subPct>=200?"linear-gradient(90deg,"+C.electric+","+C.mint+")":ipo.subPct>=100?"linear-gradient(90deg,"+C.electric+","+C.gold+")":"linear-gradient(90deg,"+C.electric+","+C.plasma+")",transition:"width .6s ease",borderRadius:3}}/>
                      </div>
                    </div>
                  )}
                  {ups&&(
                    <div style={{borderTop:"1px solid "+C.line+"22",padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div className="num" style={{fontSize:12,fontWeight:800,color:parseFloat(ups)>0?C.mint:C.coral,direction:"ltr"}}>{parseFloat(ups)>0?"+":""}{ups}% هدف المحللين</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{height:20}}/>
        </div>
  );
}

function FundsTab(props) {
  var tp=props.p?props.p:props;
  var sub=tp.sub;
  var setSub=tp.setSub;
  var stocksLive=tp.stocksLive;
  var rankIdx=tp.rankIdx;
  var setRankIdx=tp.setRankIdx;
  var rankSec=tp.rankSec;
  var setRankSec=tp.setRankSec;
  var commData=tp.commData;
  var commCat=tp.commCat;
  var setCommCat=tp.setCommCat;
  var fundTab=tp.fundTab;
  var setFundTab=tp.setFundTab;
  var ipoF=tp.ipoF;
  var setIpoF=tp.setIpoF;
  var calF=tp.calF;
  var setCalF=tp.setCalF;
  var divItem=tp.divItem;
  var setDivItem=tp.setDivItem;
  var divShares=tp.divShares;
  var setDivShares=tp.setDivShares;
  var divCost=tp.divCost;
  var setDivCost=tp.setDivCost;
  var snaps=tp.snaps;
  var setSnaps=tp.setSnaps;
  var editSnap=tp.editSnap;
  var setEditSnap=tp.setEditSnap;
  var snapTag=tp.snapTag;
  var setSnapTag=tp.setSnapTag;
  var fontSize=tp.fontSize;
  var setFontSize=tp.setFontSize;
  var notifSound=tp.notifSound;
  var setNotifSound=tp.setNotifSound;
  var homeConf=tp.homeConf;
  var setHomeConf=tp.setHomeConf;
  var rField=tp.rField;
  var rankItems=tp.rankItems;
  var secList=tp.secList;
  var commF=tp.commF;
  var catList=tp.catList;
  var fundsF=tp.fundsF;
  var iposF=tp.iposF;
  var eventsF=tp.eventsF;
  var cfmt=tp.cfmt;
  var commAgoStr=tp.commAgoStr;
  var fmtT=tp.fmtT;
  var BOX=tp.BOX;
  var SHD=tp.SHD;
  var SHD_ACTIVE=tp.SHD_ACTIVE;
  var liveTime=tp.liveTime; var commLastUpdate=tp.commLastUpdate;
  var rankTick=tp.rankTick;
  var fundTabs=[{k:"all",l:"الكل"},{k:"top",l:"الأعلى أداءً"},{k:"islamic",l:"إسلامية"}];
  return(
        <div style={{position:"relative",zIndex:1}}>
          <div style={{padding:"10px 16px 4px",display:"flex",gap:6,borderBottom:"1px solid "+C.line}}>
            {fundTabs.map(function(t){return(
              <button key={t.k} onClick={function(){setFundTab(t.k);}} style={{
                padding:"7px 16px",borderRadius:18,
                border:"1px solid "+(fundTab===t.k?C.plasma+"55":C.line),
                background:fundTab===t.k?"linear-gradient(135deg,"+C.plasma+"22,"+C.plasma+"11)":C.layer3,
                color:fundTab===t.k?C.plasma:C.smoke,
                fontSize:10,cursor:"pointer",marginBottom:8,fontWeight:fundTab===t.k?800:400,
              }}>{t.l}</button>
            );})}
          </div>
          <div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {fundsF.map(function(fund,i){
              var pos=fund.ret1y>=0;
              var rC=fund.risk==="منخفض"?C.mint:fund.risk==="مرتفع"?C.coral:C.amber;
              var bStr=fund.bench.replace(/−/g,"-");
              var bRet=parseFloat((bStr.match(/[+-]?\d+\.?\d*/)||[])[0])||0;
              var alpha=fund.ret1y-bRet;
              var alphaC=alpha>=0?C.mint:C.coral;
              return(
                <div key={i} className={"card-enter "+(pos?"buy-glow":"danger-pulse")} style={{
                  animationDelay:(i*0.06)+"s",
                  background:BOX,
                  border:"1px solid "+C.line,
                  borderRadius:20,overflow:"hidden",
                  boxShadow:SHD,
                }}>
                  <div style={{height:2,background:"linear-gradient(90deg,transparent,"+(pos?C.mint:C.coral)+",transparent)"}}/>
                  <div style={{padding:"14px 16px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{flex:1,minWidth:0,marginLeft:10}}>
                        <div style={{fontSize:13,fontWeight:800,color:C.snow,lineHeight:1.3,marginBottom:5}}>{fund.name}</div>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          <span style={{fontSize:9,color:C.smoke}}>{fund.mgr}</span>
                          <span style={{fontSize:9,color:rC,background:rC+"12",borderRadius:5,padding:"0 7px",border:"1px solid "+rC+"25"}}>مخاطرة {fund.risk}</span>
                          <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"0 7px",borderRadius:5,border:"1px solid "+C.line}}>{fund.type}</span>
                        </div>
                      </div>
                      <div style={{flexShrink:0,textAlign:"center"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <ArcRing val={fund.stars} max={5} size={36} stroke={3} color={fund.stars>=4?C.mint:fund.stars>=3?C.amber:C.coral}>
                        <span style={{fontSize:8,fontWeight:900,color:fund.stars>=4?C.mint:fund.stars>=3?C.amber:C.coral}}>{fund.stars}</span>
                      </ArcRing>
                      <Stars n={fund.stars}/>
                    </div>
                        <div style={{fontSize:8,color:C.smoke,marginTop:3}}>مورنينجستار</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10}}>
                      {[
                        {l:"عائد سنة",    v:(pos?"+":"")+fund.ret1y+"%",c:pos?C.mint:C.coral,big:true},
                        {l:"عائد 3 سنوات",v:"+"+fund.ret3y+"%",         c:C.electric},
                        {l:"عائد 5 سنوات",v:"+"+fund.ret5y+"%",         c:C.gold},
                      ].map(function(r){return(
                        <div key={r.l} style={{
                          background:r.big?(pos?C.mint+"0a":C.coral+"0a"):"rgba(255,255,255,.03)",
                          borderRadius:12,padding:"10px 6px",textAlign:"center",
                          border:"1px solid "+(r.big?(pos?C.mint:C.coral)+"30":C.line),
                        }}>
                          <div style={{fontSize:8,color:C.smoke,marginBottom:4}}>{r.l}</div>
                          <div className="num" style={{fontSize:r.big?16:13,fontWeight:900,color:r.c}}>{r.v}</div>
                        </div>
                      );})}
                    </div>
                    
                    <div style={{padding:"8px 12px",background:alpha>=0?C.mint+"08":C.coral+"08",border:"1px solid "+alphaC+"22",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:alphaC,boxShadow:"0 0 6px "+alphaC}}/>
                        <div className="num" style={{fontSize:14,fontWeight:900,color:alphaC,direction:"ltr"}}>{alpha>=0?"+":""}{alpha.toFixed(1)}%</div>
                      </div>
                      <span style={{fontSize:9,color:C.smoke}}>ألفا مقابل {fund.bench}</span>
                    </div>
                  </div>
                  <div style={{borderTop:"1px solid "+C.line+"22",padding:"10px 16px",display:"flex",gap:0}}>
                    {[
                      {l:"شارب", v:String(fund.sharpe),c:fund.sharpe>1.3?C.mint:fund.sharpe>0.8?C.amber:C.coral},
                      {l:"بيتا",   v:String(fund.beta||0.9),c:fund.beta&&fund.beta>1.2?C.coral:fund.beta&&fund.beta<0.8?C.mint:C.amber},
                      {l:"صافي الأصول",    v:fund.nav+" ر.س",   c:C.electric},
                      {l:"رسوم",   v:fund.fee+"%",       c:fund.fee>1.5?C.coral:C.mist},
                      {l:"أقصى خسارة", v:fund.maxDD+"%",     c:C.coral},
                      {l:"الحد الأدنى",v:fund.minInv.toLocaleString()+" ر.س",c:C.mist},
                    ].map(function(x,xi){return(
                      <div key={x.l} style={{flex:1,textAlign:"center",borderRight:xi<3?"1px solid "+C.line+"33":undefined,padding:"0 4px"}}>
                        <div style={{fontSize:8,color:C.smoke,marginBottom:2}}>{x.l}</div>
                        <div className="num" style={{fontSize:10,fontWeight:700,color:x.c}}>{x.v}</div>
                      </div>
                    );})}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{height:20}}/>
        </div>
  );
}

function CalendarTab(props) {
  var tp=props.p?props.p:props;
  var sub=tp.sub;
  var setSub=tp.setSub;
  var stocksLive=tp.stocksLive;
  var rankIdx=tp.rankIdx;
  var setRankIdx=tp.setRankIdx;
  var rankSec=tp.rankSec;
  var setRankSec=tp.setRankSec;
  var commData=tp.commData;
  var commCat=tp.commCat;
  var setCommCat=tp.setCommCat;
  var fundTab=tp.fundTab;
  var setFundTab=tp.setFundTab;
  var ipoF=tp.ipoF;
  var setIpoF=tp.setIpoF;
  var calF=tp.calF;
  var setCalF=tp.setCalF;
  var divItem=tp.divItem;
  var setDivItem=tp.setDivItem;
  var divShares=tp.divShares;
  var setDivShares=tp.setDivShares;
  var divCost=tp.divCost;
  var setDivCost=tp.setDivCost;
  var snaps=tp.snaps;
  var setSnaps=tp.setSnaps;
  var editSnap=tp.editSnap;
  var setEditSnap=tp.setEditSnap;
  var snapTag=tp.snapTag;
  var setSnapTag=tp.setSnapTag;
  var fontSize=tp.fontSize;
  var setFontSize=tp.setFontSize;
  var notifSound=tp.notifSound;
  var setNotifSound=tp.setNotifSound;
  var homeConf=tp.homeConf;
  var setHomeConf=tp.setHomeConf;
  var rField=tp.rField;
  var rankItems=tp.rankItems;
  var secList=tp.secList;
  var commF=tp.commF;
  var catList=tp.catList;
  var fundsF=tp.fundsF;
  var iposF=tp.iposF;
  var eventsF=tp.eventsF;
  var cfmt=tp.cfmt;
  var commAgoStr=tp.commAgoStr;
  var fmtT=tp.fmtT;
  var BOX=tp.BOX;
  var SHD=tp.SHD;
  var SHD_ACTIVE=tp.SHD_ACTIVE;
  var liveTime=tp.liveTime; var commLastUpdate=tp.commLastUpdate;
  var rankTick=tp.rankTick;
  var calFilters=[{k:"all",l:"الكل"},{k:"high",l:"عالي الأهمية"},{k:"stocks",l:"أسهم فقط"}];
  return(
        <div style={{position:"relative",zIndex:1}}>
          <div style={{padding:"10px 16px 4px",display:"flex",gap:6,borderBottom:"1px solid "+C.line}}>
            {calFilters.map(function(f){return(
              <button key={f.k} onClick={function(){setCalF(f.k);}} style={{
                padding:"7px 14px",borderRadius:18,
                border:"1px solid "+(calF===f.k?C.teal+"55":C.line),
                background:calF===f.k?"linear-gradient(135deg,"+C.teal+"22,"+C.teal+"11)":C.layer3,
                color:calF===f.k?C.teal:C.smoke,
                fontSize:10,cursor:"pointer",marginBottom:8,fontWeight:calF===f.k?800:400,
              }}>{f.l}</button>
            );})}
          </div>
          
          {eventsF[0]&&(
            <div style={{
              margin:"12px 16px 4px",
              background:"linear-gradient(135deg,"+C.teal+"14,"+C.layer1+")",
              border:"1px solid "+C.teal+"33",borderRadius:20,padding:"14px 16px",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              boxShadow:"0 0 24px "+C.teal+"18, inset 0 1px 0 "+C.teal+"15",
              position:"relative",overflow:"hidden",
            }}>
              <div style={{position:"absolute",bottom:-30,left:-20,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,"+C.teal+"0a,transparent 70%)"}}/>
              <div style={{position:"relative"}}>
                <div style={{fontSize:9,color:C.teal,fontWeight:700,letterSpacing:"1px",marginBottom:4}}>⏱ الحدث القادم</div>
                <div style={{fontSize:14,fontWeight:800,color:C.snow}}>{eventsF[0].ev}</div>
                {eventsF[0].sym&&<div style={{fontSize:9,color:C.smoke,marginTop:3}}>{eventsF[0].sym}</div>}
                {eventsF[0].whisper&&<div style={{fontSize:9,color:C.amber,marginTop:2,fontWeight:600}}>همس: <span className="m">{eventsF[0].whisper}</span></div>}
              </div>
              <div style={{
                textAlign:"center",
                background:C.teal+"20",border:"1px solid "+C.teal+"44",
                borderRadius:14,padding:"10px 14px",flexShrink:0,
                boxShadow:"0 0 16px "+C.teal+"22",
              }}>
                <div className="num-lg glow-mint" style={{fontSize:26,fontWeight:900,color:C.teal,lineHeight:1}}>{eventsF[0].daysLeft}</div>
                <div style={{fontSize:8,color:C.smoke,marginTop:2}}>يوم</div>
              </div>
            </div>
          )}
          <div style={{background:C.layer1,marginTop:4}}>
            {eventsF.map(function(e,i){
              var iC=e.imp===3?C.coral:e.imp===2?C.amber:C.smoke;
              var urgent=e.daysLeft<=3;
              return(
                <div key={i} className="card-enter" style={{
                  animationDelay:(i*0.04)+"s",
                  padding:"14px 20px",
                  borderBottom:i<eventsF.length-1?"1px solid "+C.line+"22":undefined,
                  background:urgent?C.coral+"04":"transparent",
                }}>
                  <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                    <div style={{width:46,textAlign:"center",flexShrink:0}}>
                      <div style={{fontSize:20,fontWeight:900,color:C.snow,lineHeight:1}}>{e.d}</div>
                      <div style={{fontSize:9,color:C.smoke,marginTop:1}}>{e.m}</div>
                      <div style={{
                        marginTop:4,
                        background:e.daysLeft<=3?C.coral+"20":e.daysLeft<=7?C.amber+"20":C.teal+"15",
                        border:"1px solid "+(e.daysLeft<=3?C.coral:e.daysLeft<=7?C.amber:C.teal)+"33",
                        borderRadius:6,padding:"1px 5px",
                      }}>
                        <span style={{fontSize:8,fontWeight:700,color:e.daysLeft<=3?C.coral:e.daysLeft<=7?C.amber:C.teal}}>{e.daysLeft}d</span>
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:iC,boxShadow:"0 0 6px "+iC+"88",flexShrink:0}}/>
                        <div style={{fontSize:13,fontWeight:600,color:C.snow,lineHeight:1.3}}>{e.ev}</div>
                      </div>
                      {e.sym&&<div style={{fontSize:9,color:C.smoke,marginBottom:5}}>{e.sym}</div>}
                      {e.epsEst&&(
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {e.whisper&&<div style={{background:C.amber+"12",border:"1px solid "+C.amber+"25",borderRadius:6,padding:"2px 8px"}}><span style={{fontSize:9,color:C.amber,fontWeight:700}}>همس: </span><span className="m" style={{fontSize:9,color:C.amber}}>{e.whisper}</span></div>}
                          <div style={{background:C.electric+"12",border:"1px solid "+C.electric+"25",borderRadius:6,padding:"2px 8px"}}><span style={{fontSize:9,color:C.electric,fontWeight:700}}>توقع: </span><span className="m" style={{fontSize:9,color:C.electric}}>{e.epsEst}</span></div>
                          {e.epsLow&&e.epsHigh&&<div style={{background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"2px 8px"}}><span style={{fontSize:9,color:C.smoke}}>نطاق: </span><span className="num m" style={{fontSize:9,color:C.smoke}}>{e.epsLow}–{e.epsHigh}</span></div>}
                          {e.epsPrev&&<div style={{background:C.layer3,border:"1px solid "+C.line,borderRadius:6,padding:"2px 8px"}}><span style={{fontSize:9,color:C.smoke}}>سابق: </span><span className="m" style={{fontSize:9,color:C.smoke}}>{e.epsPrev}</span></div>}
                          {e.surprise&&<div style={{background:C.mint+"12",border:"1px solid "+C.mint+"25",borderRadius:6,padding:"2px 8px"}}><span style={{fontSize:9,color:C.mint,fontWeight:700}}>مفاجأة: {e.surprise}</span></div>}
                        </div>
                      )}
                    </div>
                    <div style={{flexShrink:0,textAlign:"center"}}>
                      <div style={{fontSize:9,color:iC,fontWeight:700}}>{e.imp===3?"عالي":e.imp===2?"متوسط":"عادي"}</div>
                      <div style={{marginTop:4,display:"flex",justifyContent:"center"}}>
                        <Ico k={e.imp===3?"fire":e.imp===2?"alert":"clock"} color={iC} size={14}/>
                      
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{height:20}}/>
        </div>
  );
}

function MacroTab(props) {
  var tp=props.p?props.p:props;
  var sub=tp.sub, setSub=tp.setSub;
  var macroFilter=tp.macroFilter||"all", setMacroFilter=tp.setMacroFilter||function(){};
  var stocksLive=tp.stocksLive||[];
  var BOX=tp.BOX, SHD=tp.SHD;
  var filters=[{k:"all",l:"الكل"},{k:"growth",l:"النمو"},{k:"inflation",l:"التضخم"},{k:"market",l:"السوق"}];
  var catMap={gdp:"growth",pmi:"growth",trade:"growth",cpi:"inflation",rate:"inflation",unemp:"growth",oil:"market",tadawul:"market"};
  var filtered=macroFilter==="all"?MACRO:MACRO.filter(function(m){return catMap[m.id]===macroFilter;});
  return(
    <div style={{position:"relative",zIndex:1}}>
      <div style={{padding:"10px 16px 6px",display:"flex",gap:6,overflowX:"auto",borderBottom:"1px solid "+C.line}}>
        {filters.map(function(f){return(
          <button key={f.k} onClick={function(){setMacroFilter(f.k);}}
            style={{padding:"6px 14px",borderRadius:16,border:"1px solid "+(macroFilter===f.k?C.teal+"66":C.line),background:macroFilter===f.k?"linear-gradient(135deg,"+C.teal+"22,"+C.teal+"11)":C.layer3,color:macroFilter===f.k?C.teal:C.smoke,fontSize:10,cursor:"pointer",fontWeight:macroFilter===f.k?700:400,whiteSpace:"nowrap"}}>
            {f.l}
          </button>
        );})}
      </div>
      <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(function(m){
          var isUp=m.val>=m.prev;
          var changePct=m.prev!==0?((m.val-m.prev)/Math.abs(m.prev)*100).toFixed(1):0;
          var barW=Math.min(100,Math.abs(m.val/Math.max(m.val,m.prev))*100);
          return(
            <div key={m.id} className="card-enter" style={{background:BOX,borderRadius:16,padding:"14px 16px",border:"1px solid "+m.color+"22",boxShadow:SHD,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+m.color+",transparent)"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{textAlign:"left"}}>
                  <div className="num-lg" style={{fontSize:22,fontWeight:900,color:m.color}}>{m.val}<span style={{fontSize:11,color:C.smoke,marginRight:3}}> {m.unit}</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                    <span style={{fontSize:10,color:isUp?C.mint:C.coral,fontWeight:700}}>{isUp?"+":""}{changePct}%</span>
                    <span style={{fontSize:9,color:C.smoke}}>السابق: {m.prev}</span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.snow,marginBottom:3}}>{m.label}</div>
                  <div style={{fontSize:9,color:C.smoke,marginBottom:4}}>{m.period}</div>
                  <div style={{background:m.color+"18",borderRadius:6,padding:"2px 8px",border:"1px solid "+m.color+"30"}}>
                    <span style={{fontSize:8,color:m.color,fontWeight:600}}>{m.desc}</span>
                  </div>
                </div>
              </div>
              <div style={{marginTop:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1}}>
                    <MiniLine data={m.trend} color={m.color} w={120} h={28}/>
                  </div>
                  <div style={{display:"flex",gap:2,alignItems:"flex-end",height:28}}>
                    {(function(){
                      var mx2=Math.max.apply(null,m.trend.map(function(v){return Math.abs(v);}));
                      return m.trend.map(function(v,ti){
                        var h=Math.max(3,(Math.abs(v)/(mx2||1))*24);
                        var isLast=ti===m.trend.length-1;
                        return(<div key={ti} style={{width:6,height:h,borderRadius:2,background:isLast?m.color:m.color+"55",transition:"height .4s ease",boxShadow:isLast?"0 0 6px "+m.color+"88":"none"}}/>);
                      });
                    }())}
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                  <span style={{fontSize:7,color:C.ash}}>4 فترات سابقة</span>
                  <span style={{fontSize:7,color:m.color,fontWeight:700}}>الآن</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{height:20}}/>
    </div>
  );
}


export { DividendsTab, IposTab, FundsTab, CalendarTab, MacroTab };
