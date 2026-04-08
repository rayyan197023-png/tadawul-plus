'use client';
/**
 * @module screens/more/MarketTabs
 * @description تبويبات السوق
 */
import { useState, useMemo, useEffect } from 'react';
import { C, Ico, SentimentGauge, MiniLine, SparkLine, TagFilter, SectionHeader, COMM, RANKINGS } from './MoreShared';

function RankingsTab(props) {
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
  var liveTime=tp.liveTime; var commLastUpdate=tp.commLastUpdate; var commLoading=tp.commLoading||false;
  var fetchYahoo=tp.fetchYahoo||function(){};
  var rankTick=tp.rankTick;
  return(
        <div style={{position:"relative",zIndex:1}}>
          
          {rankTick===0&&(
            <div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:8}}>
              <div className="skeleton" style={{height:52,width:"100%",borderRadius:14}}/>
              <div className="skeleton" style={{height:52,width:"100%",borderRadius:14}}/>
              <div className="skeleton" style={{height:52,width:"80%",borderRadius:14}}/>
            </div>
          )}
          <div style={{padding:"6px 20px",background:C.amber+"06",borderBottom:"1px solid "+C.line,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div className="live-dot" style={{width:5,height:5,borderRadius:"50%",background:C.amber,boxShadow:"0 0 6px "+C.amber}}/>
              <span style={{fontSize:9,color:C.amber,fontWeight:700}}>مباشر · كل 5 ثوانٍ · تحديث #{rankTick}</span>
            </div>
            <span className="m" style={{fontSize:9,color:C.smoke}}>{fmtT}</span>
          </div>
          
          <div style={{padding:"10px 16px 6px",overflowX:"auto",display:"flex",gap:6,whiteSpace:"nowrap",borderBottom:"1px solid "+C.line}}>
            {RANKINGS.map(function(r,i){return(
              <button key={i} onClick={function(){setRankIdx(i);}} style={{
                padding:"7px 16px",borderRadius:20,
                border:"1px solid "+(rankIdx===i?r.color+"66":C.line),
                background:rankIdx===i?"linear-gradient(135deg,"+r.color+"22,"+r.color+"11)":C.layer3,
                color:rankIdx===i?r.color:C.smoke,
                fontSize:10,cursor:"pointer",fontWeight:rankIdx===i?800:400,flexShrink:0,
                boxShadow:rankIdx===i?"0 0 12px "+r.color+"22, inset 0 1px 0 "+r.color+"10":"none",
                transition:"all .2s",
              }}>{r.title}</button>
            );})}
          </div>
          
          <div style={{padding:"6px 16px 4px",overflowX:"auto",display:"flex",gap:5,whiteSpace:"nowrap"}}>
            {secList.map(function(s){return(
              <button key={s} onClick={function(){setRankSec(s);}} style={{
                padding:"4px 12px",borderRadius:14,
                border:"1px solid "+(rankSec===s?C.electric+"55":C.line),
                background:rankSec===s?C.electric+"15":C.layer3,
                color:rankSec===s?C.electric:C.smoke,
                fontSize:9,cursor:"pointer",flexShrink:0,fontWeight:rankSec===s?700:400,
              }}>{s}</button>
            );})}
          </div>
          
          <div style={{padding:"10px 16px",display:"flex",flexDirection:"column",gap:8}}>
            {rankItems.map(function(s,i){
              var isBig=i<3;
              return(
                <div key={s.sym} className={"card-enter "+(s.pct>2?"buy-glow":s.pct<-2?"danger-pulse":"")} style={{
                  animationDelay:(i*0.05)+"s",
                  background:BOX,
                  border:"1px solid "+(isBig?rField.color+"44":C.line),
                  borderRadius:18,padding:"12px 14px",
                  display:"flex",alignItems:"center",gap:12,
                  boxShadow:isBig?SHD_ACTIVE+rField.color+"20, 0 0 0 1px "+rField.color+"22":SHD,
                  position:"relative",overflow:"hidden",
                }}>
                  {isBig&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+rField.color+"60,transparent)"}}/>}
                  <div style={{
                    width:36,height:36,borderRadius:11,flexShrink:0,
                    background:isBig?"linear-gradient(135deg,"+rField.color+"30,"+rField.color+"10)":C.layer3,
                    border:"1px solid "+(isBig?rField.color+"44":C.line),
                    display:"flex",alignItems:"center",justifyContent:"center",
                    boxShadow:isBig?"0 0 12px "+rField.color+"30":"none",
                  }}>
                    <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
                      <div style={{
                        background:i<3?"linear-gradient(135deg,"+rField.color+","+rField.color+"aa)":"rgba(0,0,0,.4)",
                        borderRadius:7,padding:"2px 7px",fontSize:9,fontWeight:900,
                        color:i<3?"#06080f":C.smoke,
                        boxShadow:i<3?"0 2px 8px "+rField.color+"55":"none",
                        animation:"rankUp .4s ease both",
                      }}>#{i+1}</div>
                    </div>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:800,color:C.snow,marginBottom:2}}>{s.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:9,color:C.smoke,background:C.layer3,padding:"1px 7px",borderRadius:5,border:"1px solid "+C.line}}>{s.sym}</span>
                      <span style={{fontSize:9,color:C.smoke}}>{s.sec}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <SparkLine data={s.spark} color={s.pct>=0?C.mint:C.coral} w={48} h={20}/>
                    <div style={{width:28,height:28,borderRadius:"50%",background:"conic-gradient("+rField.color+" "+Math.min(360,Math.abs(s.pct)*36)+"deg,#2a3858 "+Math.min(360,Math.abs(s.pct)*36)+"deg)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <div style={{width:20,height:20,borderRadius:"50%",background:"#16202e",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontSize:6,fontWeight:900,color:rField.color}}>{Math.abs(s.pct).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:"left",minWidth:64}}>
                    <div className="num-lg" style={{fontSize:15,fontWeight:900,color:rField.color,direction:"ltr"}}>{rField.fmt(s[rField.field])}</div>
                    <div style={{display:"flex",alignItems:"center",gap:4,marginTop:2,justifyContent:"flex-end"}}>
                      <span className="num" style={{fontSize:10,fontWeight:700,color:s.pct>=0?C.mint:C.coral,direction:"ltr"}}>{s.pct>=0?"+":""}{s.pct.toFixed(1)}%</span>
                      {Math.abs(s.pct)>=5&&<span style={{fontSize:8,background:s.pct>=0?C.mint+"20":C.coral+"20",color:s.pct>=0?C.mint:C.coral,borderRadius:4,padding:"0 5px",fontWeight:700}}><Ico k="fire" color={C.amber} size={10}/></span>}
                    </div>
                    {rField.field!=="vol"&&<div className="num" style={{fontSize:8,color:C.ash,direction:"ltr",marginTop:1}}>{(s.vol*s.p/1e6).toFixed(0)}M ر.س</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{height:20}}/>
        </div>
  );
}

function CommoditiesTab(props) {
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
  var commLoading=tp.commLoading||false;
  var rankTick=tp.rankTick;
  return(
        <div style={{position:"relative",zIndex:1}}>
          {rankTick===0&&(
            <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
              <div className="skeleton" style={{height:56,width:"100%"}}/>
              <div className="skeleton" style={{height:56,width:"100%"}}/>
              <div className="skeleton" style={{height:56,width:"80%"}}/>
            </div>
          )}
          <div style={{padding:"10px 16px 8px",background:C.layer1,borderBottom:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <Ico k="globe" color={commLoading?C.amber:C.mint} size={12}/>
              <div className="live-dot" style={{width:6,height:6,borderRadius:"50%",background:commLoading?C.amber:C.mint,boxShadow:"0 0 6px "+(commLoading?C.amber:C.mint)}}/>
              <span style={{fontSize:9,color:commLoading?C.amber:C.mint,fontWeight:700}}>{commLoading?"جارٍ التحديث...":commAgoStr}</span>
              {!commLoading&&(
                <button onClick={function(){fetchYahoo();}} style={{background:"none",border:"none",cursor:"pointer",padding:2,opacity:0.6}}>
                  <Ico k="refresh" color={C.mint} size={11}/>
                </button>
              )}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:8,color:C.smoke}}>إيجابية السوق</div>
                <div className="num" style={{fontSize:11,fontWeight:800,color:commData.filter(function(c){return c.pct>=0;}).length/commData.length>=0.5?C.mint:C.coral}}>{commData.filter(function(c){return c.pct>=0;}).length}/{commData.length} صاعد</div>
              </div>
              <SentimentGauge pct={Math.round(commData.filter(function(c){return c.pct>=0;}).length/commData.length*100)} color={commData.filter(function(c){return c.pct>=0;}).length/commData.length>=0.5?C.mint:C.coral}/>
            </div>
          </div>
          <div style={{padding:"8px 16px 4px",overflowX:"auto",display:"flex",gap:6,whiteSpace:"nowrap",borderBottom:"1px solid "+C.line}}>
            {catList.map(function(cat){return(
              <button key={cat} onClick={function(){setCommCat(cat);}} style={{
                padding:"6px 16px",borderRadius:18,
                border:"1px solid "+(commCat===cat?C.gold+"55":C.line),
                background:commCat===cat?"linear-gradient(135deg,"+C.gold+"22,"+C.goldD+"11)":C.layer3,
                color:commCat===cat?C.gold:C.smoke,
                fontSize:10,cursor:"pointer",flexShrink:0,fontWeight:commCat===cat?700:400,
              }}>{cat}</button>
            );})}
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {commF.map(function(com,ci){
              var isPos2=com.pct>=0;
              var commStats=[{l:"افتتاح",v:com.open},{l:"أعلى",v:com.hi},{l:"أدنى",v:com.lo},{l:"تغير",v:(isPos2?"+":"")+com.ch}];
              var isPos=com.pct>=0;
              var rng2=Math.min(100,Math.max(0,((com.price-com.lo52)/(com.hi52-com.lo52))*100));
              return(
                <div key={ci} className="card-enter" style={{
                  animationDelay:(ci*0.06)+"s",
                  background:BOX,
                  border:"1px solid "+com.color+"22",
                  borderRadius:20,overflow:"hidden",
                  boxShadow:"0 4px 20px rgba(0,0,0,.3), inset 0 0 0 1px "+com.color+"08",
                }}>
                  
                  <div style={{height:2,background:"linear-gradient(90deg,transparent,"+com.color+",transparent)"}}/>
                  <div style={{padding:"14px 16px 12px",background:"linear-gradient(90deg,"+com.color+"06,transparent)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:900,color:C.snow,letterSpacing:"-0.3px"}}>{com.sym}</div>
                        <div style={{fontSize:9,color:C.smoke,marginTop:2}}>{com.cat}</div>
                      </div>
                      <div style={{textAlign:"left"}}>
                        <div className="num-lg" style={{fontSize:20,fontWeight:900,color:C.snow,direction:"ltr",lineHeight:1}}>{com.price>999?com.price.toLocaleString():com.price}</div>
                        <div style={{
                          display:"inline-flex",alignItems:"center",gap:3,marginTop:4,
                          background:isPos?C.mint+"18":C.coral+"18",
                          border:"1px solid "+(isPos?C.mint:C.coral)+"44",
                          borderRadius:8,padding:"2px 8px",direction:"ltr",
                        }}>
                          <span className="num" style={{fontSize:11,fontWeight:800,color:isPos?C.mint:C.coral}}>{isPos?"▲":"▼"}{isPos?"+":""}{com.pct}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:C.line}}>
                    {commStats.map(function(st,si){return(
                      <div key={si} style={{background:C.layer2,padding:"8px 6px",textAlign:"center"}}>
                        <div style={{fontSize:8,color:C.smoke,marginBottom:2}}>{st.l}</div>
                        <div className="num" style={{fontSize:10,fontWeight:700,color:st.c||C.mist,direction:"ltr"}}>{st.v}</div>
                      </div>
                    );})}
                  </div>
                  <div style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,direction:"ltr"}}>
                      <span style={{fontSize:8,color:C.coral}}>↓ {com.lo52}</span>
                      <span style={{fontSize:8,color:C.smoke}}>النطاق السنوي 52w</span>
                      <span style={{fontSize:8,color:C.mint}}>{com.hi52} ↑</span>
                    </div>
                    <div style={{position:"relative",height:6,background:C.edge,borderRadius:3,direction:"ltr"}}>
                      <div style={{position:"absolute",top:0,left:0,height:"100%",width:rng2+"%",background:"linear-gradient(90deg,"+com.color+"44,"+com.color+")",borderRadius:3}}/>
                      <div style={{position:"absolute",top:"50%",left:rng2+"%",transform:"translate(-50%,-50%)",width:12,height:12,borderRadius:"50%",background:com.color,border:"2px solid "+C.snow,boxShadow:"0 0 8px "+com.color+"88"}}/>
                    </div>
                    <div style={{marginTop:10,padding:"6px 10px 4px",background:com.color+"08",borderRadius:"10px 10px 0 0",border:"1px solid "+com.color+"18",borderBottom:"none"}}>
                      <span style={{fontSize:9,color:C.mist,lineHeight:1.5}}>{com.fact}</span>
                    </div>
                    <div style={{background:com.color+"05",borderRadius:"0 0 10px 10px",border:"1px solid "+com.color+"18",borderTop:"none",padding:"4px 4px 6px",direction:"ltr"}}>
                      <MiniLine data={com.history} color={com.color} w={320} h={44}/>
                    </div>
                    {com.cat==="نفط"&&(
                      <div style={{marginTop:8,padding:"5px 10px",background:C.electric+"08",borderRadius:8,border:"1px solid "+C.electric+"20",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:8,color:C.electric,fontWeight:700}}>ارتباط تاسي: عالي</span>
                        <span style={{fontSize:8,color:C.smoke}}>يؤثر على 30%+ من تاسي</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{height:20}}/>
        </div>
  );
}


export { RankingsTab, CommoditiesTab };
