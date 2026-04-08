'use client';
/**
 * @module screens/more/ToolsTabs
 * @description تبويبات الأدوات: لقطات، إعدادات، حاسبة، مقارنة، تنبيهات، المتابعة
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { STOCKS } from '../../constants/stocksData';
import { C, Ico, MiniLine, PRIORITY_ORDER, SectionHeader, SparkLine, TagFilter } from './MoreShared';
import { useHaptic } from '../../hooks/useHaptic';

function SnapshotsTab(props) {
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
  var sn2=useState(""); var snapSearch=sn2[0]; var setSnapSearch=sn2[1];
  var sn3=useState("newest"); var snapSort=sn3[0]; var setSnapSort=sn3[1];
  var sn4=useState(null); var viewSnap=sn4[0]; var setViewSnap=sn4[1];
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
  var filteredSnaps=snaps.filter(function(sn){
    var tagOk=!snapTag||snapTag==="الكل"||sn.tag===snapTag;
    var searchOk=!snapSearch||sn.name.indexOf(snapSearch)>=0||sn.sym.indexOf(snapSearch)>=0;
    return tagOk&&searchOk;
  });
  if(snapSort==="oldest") filteredSnaps=filteredSnaps.slice().reverse();
  return(
        <div style={{position:"relative",zIndex:1}}>
          <div style={{padding:"10px 16px 6px",borderBottom:"1px solid "+C.line,display:"flex",gap:8,alignItems:"center"}}>
            <input value={snapSearch} onChange={function(e){setSnapSearch(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"){e.target.blur();}}}
              placeholder="بحث في اللقطات..."
              style={{flex:1,background:C.layer3,border:"1px solid "+C.line,borderRadius:10,padding:"7px 12px",color:C.snow,fontSize:11,direction:"rtl",outline:"none"}}/>
            <button onClick={function(){setSnapSort(snapSort==="newest"?"oldest":"newest");}}
              style={{padding:"7px 12px",borderRadius:10,border:"1px solid "+C.line,background:C.layer3,color:C.smoke,fontSize:10,cursor:"pointer",whiteSpace:"nowrap"}}>
              {snapSort==="newest"?"الأحدث":"الأقدم"}
            </button>
          </div>
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {snaps.length>0&&<TagFilter snapshots={snaps} snapTag={snapTag} setSnapTag={setSnapTag}/>}
            {snaps.length===0&&(
              <div style={{textAlign:"center",padding:"56px 20px",color:C.smoke}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><Ico k="camera" color={C.teal+"55"} size={48}/></div>
                <div style={{fontSize:15,fontWeight:800,color:C.mist,marginBottom:6}}>لا توجد لقطات بعد</div>
                <div style={{fontSize:11,lineHeight:1.7,color:C.smoke}}>ستظهر هنا لقطات الرسم البياني<br/>من الشارت مباشرة</div>
              </div>
            )}
            {filteredSnaps.map(function(snap,i){
              var liveS=stocksLive.filter(function(s){return s.sym===snap.sym;})[0];
              var liveP=liveS?liveS.p:snap.snapPrice;
              var diff=liveP&&snap.snapPrice?((liveP-snap.snapPrice)/snap.snapPrice*100):null;
              var up=diff&&diff>=0;
              // Use saved spark first, fallback to live spark
              var sparkPts="";
              var sparkData=snap.spark||(liveS&&liveS.spark?liveS.spark:null);
              if(sparkData&&sparkData.length>=2){
                var smn=Math.min.apply(null,sparkData), smx=Math.max.apply(null,sparkData), srng=smx-smn||1;
                sparkPts=sparkData.map(function(v,idx){return((idx/(sparkData.length-1))*300)+","+(90-((v-smn)/srng)*80);}).join(" ");
              }
              return(
                <div key={snap.id} className="card-enter" onClick={function(){setViewSnap(snap);}} style={{
                  animationDelay:(i*0.06)+"s",
                  background:BOX,
                  border:"1px solid "+C.line,
                  borderRadius:20,overflow:"hidden",
                  boxShadow:SHD,
                  cursor:"pointer",
                }}>
                  <div style={{position:"relative",height:90,background:"linear-gradient(135deg,"+C.layer2+","+C.void+")",overflow:"hidden",borderBottom:"1px solid "+C.line+"44"}}>
                    <div style={{position:"absolute",inset:0,opacity:0.6}}>
                      {sparkPts?(
                        <svg width="100%" height="100%" viewBox="0 0 300 90" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={"spg"+snap.id} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={snap.color} stopOpacity="0.4"/>
                              <stop offset="100%" stopColor={snap.color} stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          <polygon points={"0,90 "+sparkPts+" 300,90"} fill={"url(#spg"+snap.id+")"} stroke="none"/>
                          <polyline points={sparkPts} fill="none" stroke={snap.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ):(
                        <svg width="100%" height="100%" viewBox="0 0 300 90" preserveAspectRatio="none">
                          <polyline points="0,70 60,50 120,40 180,30 240,20 300,15" fill="none" stroke={snap.color} strokeWidth="2.5"/>
                          <polyline points="0,70 60,50 120,40 180,30 240,20 300,15 300,90 0,90" fill={snap.color+"18"} stroke="none"/>
                        </svg>
                      )}
                    </div>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+snap.color+",transparent)"}}/>
                    <div className="float-badge" style={{position:"absolute",top:8,right:10,background:snap.color+"33",border:"1px solid "+snap.color+"55",borderRadius:8,padding:"2px 9px"}}>
                      <span style={{fontSize:8,color:snap.color,fontWeight:800}}>{snap.tag||"لقطة"}</span>
                    </div>
                    {(snap.rsi||snap.macd)&&(
                      <div style={{position:"absolute",bottom:6,left:10,display:"flex",gap:4}}>
                        {snap.rsi&&<div style={{background:C.layer1+"ee",borderRadius:5,padding:"2px 6px",border:"1px solid "+C.line+"66"}}><span style={{fontSize:8,color:C.smoke}}>RSI </span><span className="num" style={{fontSize:8,fontWeight:700,color:snap.rsi<30||snap.rsi>70?C.amber:C.smoke}}>{snap.rsi}</span></div>}
                        {snap.macd&&<div style={{background:C.layer1+"ee",borderRadius:5,padding:"2px 6px",border:"1px solid "+C.line+"66"}}><span style={{fontSize:8,color:snap.macd>0?C.mint:C.coral,fontWeight:700}}>MACD {snap.macd>0?"صعودي":"هبوطي"}</span></div>}
                        {snap.vol&&<div style={{background:C.layer1+"ee",borderRadius:5,padding:"2px 6px"}}><span className="num" style={{fontSize:8,color:C.smoke}}>{snap.vol}</span></div>}
                      </div>
                    )}
                  </div>
                  <div style={{padding:"12px 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}>
                      <div className="num-lg" style={{fontSize:28,fontWeight:900,color:snap.color,letterSpacing:"-1px",lineHeight:1}}>{snap.sym}</div>
                      <div style={{fontSize:10,color:C.smoke,marginTop:2}}>{snap.name}</div>
                    </div>
                    {liveP&&(
                      <div style={{textAlign:"left",display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
                        <div className="num" style={{fontSize:18,fontWeight:900,color:C.snow,direction:"ltr"}}>{typeof liveP==="number"?liveP.toFixed(2):liveP}</div>
                        {diff!==null&&(
                          <div className="num" style={{fontSize:11,fontWeight:700,color:up?C.mint:C.coral,direction:"ltr"}}>{up?"+":""}{diff.toFixed(2)}%</div>
                        )}
                        <div style={{fontSize:8,color:C.smoke,whiteSpace:"nowrap"}}>منذ اللقطة</div>
                      </div>
                    )}
                  </div>
                  <div style={{padding:"12px 16px"}}>
                    {editSnap===snap.id?(
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={function(){setEditSnap(null);}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"6px 12px",borderRadius:10,cursor:"pointer",fontSize:10}}>إلغاء</button>
                        <input defaultValue={snap.note} onBlur={function(e){
                          var val=e.target.value;
                          setSnaps(function(p){return p.map(function(s){if(s.id===snap.id){var ns=Object.assign({},s);ns.note=val;return ns;}return s;});});
                          setEditSnap(null);
                        }} autoFocus style={{flex:1,background:C.layer3,border:"1px solid "+C.teal+"55",borderRadius:10,padding:"6px 12px",color:C.snow,fontSize:11,outline:"none",direction:"rtl"}}/>
                      </div>
                    ):(
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={function(){setEditSnap(snap.id);}} style={{background:C.electric+"15",border:"1px solid "+C.electric+"30",color:C.electric,padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:10,fontWeight:600}}>تعديل</button>
                          <button onClick={function(){
                            var text="[لقطة] "+snap.name+" ("+snap.sym+")\nالسعر: "+(liveP?liveP.toFixed(2):"—")+" ر.س"+(diff!==null?" ("+(up?"+":"")+diff.toFixed(2)+"%)":" ")+"\nRSI: "+(snap.rsi||"—")+" | MACD: "+(snap.macd||"—")+"\n"+snap.note+"\n— تداول+";
                            if(navigator.share){navigator.share({title:"لقطة تداول+",text:text});}
                            else if(navigator.clipboard){navigator.clipboard.writeText(text);}
                          }} style={{background:C.teal+"15",border:"1px solid "+C.teal+"30",color:C.teal,padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:10,fontWeight:600}}>مشاركة</button>
                          <button onClick={function(){setSnaps(function(p){return p.filter(function(s){return s.id!==snap.id;});});}} style={{background:C.coral+"15",border:"1px solid "+C.coral+"30",color:C.coral,padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:10,fontWeight:600}}>حذف</button>
                        </div>
                        <div style={{textAlign:"right",minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.snow,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{snap.note}</div>
                          <div style={{fontSize:8,color:C.smoke,marginTop:2}}>{snap.date}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {snaps.length>0&&(
              <button onClick={function(){setSnaps([]);}} style={{width:"100%",background:C.coral+"10",border:"1px solid "+C.coral+"25",color:C.coral,padding:"12px",borderRadius:14,fontSize:11,cursor:"pointer",fontWeight:700}}>
                حذف جميع اللقطات
              </button>
            )}
          </div>
          {viewSnap&&(
            <div style={{
              position:"fixed",inset:0,zIndex:200,
              background:"#06080f",
              display:"flex",flexDirection:"column",
            }}>
              <div style={{flex:1,position:"relative",overflow:"hidden"}}>
                {(function(){
                  var sd=viewSnap.spark;
                  var pts="", dotEls=[], gridEls=[];
                  if(sd&&sd.length>=2){
                    var smn=Math.min.apply(null,sd), smx=Math.max.apply(null,sd), sr=smx-smn||1;
                    var pad=sr*0.1;
                    var smn2=smn-pad, smx2=smx+pad, sr2=smx2-smn2;
                    pts=sd.map(function(v,i){
                      return (30+(i/(sd.length-1))*340)+","+(270-((v-smn2)/sr2)*240+15);
                    }).join(" ");
                    for(var di=0;di<sd.length;di++){
                      var dcx=30+(di/(sd.length-1))*340;
                      var dcy=270-((sd[di]-smn2)/sr2)*240+15;
                      var isLast=di===sd.length-1;
                      dotEls.push(<circle key={di} cx={dcx} cy={dcy} r={isLast?7:2} fill={isLast?viewSnap.color:viewSnap.color+"66"} stroke={isLast?"#06080f":"none"} strokeWidth={isLast?2:0} vectorEffect="non-scaling-stroke"/>);
                    }
                    for(var gi=0;gi<=4;gi++){
                      var gy=15+((4-gi)/4)*255;
                      gridEls.push(<line key={gi} x1="0" y1={gy} x2="400" y2={gy} stroke="rgba(255,255,255,0.05)" strokeWidth="1" vectorEffect="non-scaling-stroke"/>);
                    }
                  }
                  return(
                    <div style={{position:"absolute",inset:0}}>
                      <svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none" style={{display:"block",direction:"ltr"}}>
                        <defs>
                          <linearGradient id="fsg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={viewSnap.color} stopOpacity="0.35"/>
                            <stop offset="100%" stopColor={viewSnap.color} stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {gridEls}
                        {pts&&<polygon points={"0,300 "+pts+" 400,300"} fill="url(#fsg)" stroke="none"/>}
                        {pts&&<polyline points={pts} fill="none" stroke={viewSnap.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>}
                        {dotEls}
                      </svg>
                      <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(6,8,15,0.72) 0%,transparent 35%,transparent 55%,rgba(6,8,15,0.9) 100%)"}}/>
                      <div style={{position:"absolute",top:0,left:0,right:0,padding:"52px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <button onClick={function(){setViewSnap(null);}} style={{width:42,height:42,borderRadius:12,background:"rgba(6,8,15,0.8)",border:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                          <Ico k="back" color={C.snow} size={18}/>
                        </button>
                        <div style={{textAlign:"right"}}>
                          <div style={{display:"inline-block",background:viewSnap.color+"33",border:"1px solid "+viewSnap.color+"66",borderRadius:8,padding:"3px 10px",marginBottom:6}}>
                            <span style={{fontSize:9,color:viewSnap.color,fontWeight:800}}>{viewSnap.tag||"لقطة"}</span>
                          </div>
                          <div className="num-lg" style={{fontSize:42,fontWeight:900,color:viewSnap.color,lineHeight:1,display:"block"}}>{viewSnap.sym}</div>
                          <div style={{fontSize:13,color:C.mist,marginTop:3}}>{viewSnap.name}</div>
                        </div>
                      </div>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 20px 36px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
                          <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                            {viewSnap.rsi&&<div style={{background:"rgba(6,8,15,0.88)",borderRadius:9,padding:"6px 12px",border:"1px solid rgba(255,255,255,0.1)"}}><span style={{fontSize:8,color:C.smoke}}>RSI </span><span className="num" style={{fontSize:14,fontWeight:900,color:viewSnap.rsi<30?C.mint:viewSnap.rsi>70?C.coral:C.amber}}>{viewSnap.rsi}</span></div>}
                            {viewSnap.macd&&<div style={{background:"rgba(6,8,15,0.88)",borderRadius:9,padding:"6px 12px",border:"1px solid rgba(255,255,255,0.1)"}}><span style={{fontSize:10,fontWeight:700,color:viewSnap.macd==="صعودي"?C.mint:C.coral}}>MACD {viewSnap.macd}</span></div>}
                            {viewSnap.vol&&<div style={{background:"rgba(6,8,15,0.88)",borderRadius:9,padding:"6px 12px",border:"1px solid rgba(255,255,255,0.1)"}}><span className="num" style={{fontSize:10,color:C.smoke}}>{viewSnap.vol}</span></div>}
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div className="num" style={{fontSize:28,fontWeight:900,color:C.snow,lineHeight:1}}>{viewSnap.snapPrice}</div>
                            <div style={{fontSize:9,color:C.smoke,marginTop:2}}>سعر اللقطة · ر.س</div>
                          </div>
                        </div>
                        {viewSnap.note&&(
                          <div style={{background:"rgba(6,8,15,0.88)",border:"1px solid "+viewSnap.color+"33",borderRadius:14,padding:"10px 14px",marginBottom:12}}>
                            <div style={{fontSize:8,color:viewSnap.color,fontWeight:700,marginBottom:3}}>الملاحظة</div>
                            <div style={{fontSize:12,color:C.snow,lineHeight:1.6}}>{viewSnap.note}</div>
                            <div style={{fontSize:8,color:C.smoke,marginTop:4}}>{viewSnap.date}</div>
                          </div>
                        )}
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={function(){
                            var text="[لقطة] "+viewSnap.name+" ("+viewSnap.sym+")\nالسعر: "+viewSnap.snapPrice+" ر.س\n"+viewSnap.note;
                            if(navigator.share){navigator.share({title:"لقطة تداول+",text:text});}
                            else if(navigator.clipboard){navigator.clipboard.writeText(text);}
                          }} style={{flex:1,padding:"13px",borderRadius:14,background:"linear-gradient(135deg,"+viewSnap.color+"33,"+viewSnap.color+"18)",border:"1px solid "+viewSnap.color+"55",color:viewSnap.color,fontSize:13,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                            <Ico k="share" color={viewSnap.color} size={16}/>
                            مشاركة اللقطة
                          </button>
                          <button onClick={function(){setEditSnap(viewSnap.id);setViewSnap(null);}} style={{padding:"13px 18px",borderRadius:14,background:"rgba(6,8,15,0.88)",border:"1px solid rgba(255,255,255,0.1)",color:C.smoke,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                            <Ico k="edit" color={C.smoke} size={15}/>
                            تعديل
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }())}
              </div>
            </div>
          )}
          <div style={{height:20}}/>
        </div>
  );
}

function SettingsTab(props) {
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
  var fontSizeOpts=[{k:"small",l:"صغير",s:11},{k:"medium",l:"متوسط",s:14},{k:"large",l:"كبير",s:17}];
  var sThm=useState("dark"); var theme=sThm[0]; var setTheme=sThm[1];
  var isLight=theme==="light";
  var changeTheme=function(t){setTheme(t);try{window.storage&&window.storage.set("user_theme",t);}catch(e){}};
  var sNP=useState(false); var showNotifPanel=sNP[0]; var setShowNotifPanel=sNP[1];
  var sRP=useState(false); var showRatingPanel=sRP[0]; var setShowRatingPanel=sRP[1];
  var sRated=useState(0); var ratingVal=sRated[0]; var setRatingVal=sRated[1];
  var sPP=useState(false); var showPrivacy=sPP[0]; var setShowPrivacy=sPP[1];
  return(
        <div style={{position:"relative",zIndex:1}}>
          <div style={{background:C.layer1,borderTop:"1px solid "+C.line}}>
            
            
            <div className="card-enter fade-in" style={{padding:"16px 20px",borderBottom:"1px solid "+C.line}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <span style={{fontSize:9,color:C.smoke}}>حجم النصوص في التطبيق</span>
                <span style={{fontSize:14,fontWeight:800,color:C.snow}}>حجم الخط</span>
              </div>
              <div style={{display:"flex",gap:10}}>
                {fontSizeOpts.map(function(f){return(
                  <button key={f.k} onClick={function(){setFontSize(f.k);}} style={{
                    flex:1,padding:"12px 6px",borderRadius:14,
                    border:"2px solid "+(fontSize===f.k?C.electric+"66":C.line),
                    background:fontSize===f.k?"linear-gradient(135deg,"+C.electric+"22,"+C.electric+"11)":C.layer3,
                    cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                    boxShadow:fontSize===f.k?"0 0 14px "+C.electric+"22":"none",
                  }}>
                    <span style={{fontSize:f.s,fontWeight:900,color:fontSize===f.k?C.electric:C.mist}}>أ</span>
                    <span style={{fontSize:9,color:fontSize===f.k?C.electric:C.smoke,fontWeight:fontSize===f.k?700:400}}>{f.l}</span>
                  </button>
                );})}
              </div>
            </div>
            
            
          </div>

            <div className="card-enter fade-in" style={{padding:"16px 20px",borderBottom:"1px solid "+C.line}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <span style={{fontSize:10,color:C.smoke}}>{isLight?"فاتح":"غامق"}</span>
                <span style={{fontSize:14,fontWeight:800,color:C.snow}}>الخلفية</span>
              </div>
              <div style={{display:"flex",gap:12}}>
                <button onClick={function(){changeTheme("dark");}} style={{
                  flex:1,borderRadius:14,overflow:"hidden",
                  border:"2px solid "+(theme==="dark"?C.electric:C.line),
                  background:"transparent",cursor:"pointer",padding:0,
                }}>
                  <div style={{background:"#0a0c10",padding:"14px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <div style={{width:"100%",background:"#131720",borderRadius:8,padding:"6px 8px",display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:18,height:18,borderRadius:6,background:C.mint,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{height:5,background:"#252b3a",borderRadius:3,marginBottom:3,width:"70%"}}/>
                        <div style={{height:4,background:"#1f2535",borderRadius:3,width:"50%"}}/>
                      </div>
                    </div>
                    <div style={{width:"100%",background:"#181d28",borderRadius:6,padding:"5px 8px",display:"flex",gap:3}}>
                      {["#f5a623","#1db88a","#e8394a"].map(function(col,ci){
                        return <div key={ci} style={{height:4,flex:1,background:col,borderRadius:2,opacity:0.7}}/>;
                      })}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:"#e8eaf0"}}>غامق</span>
                  </div>
                  {theme==="dark"&&(
                    <div style={{background:C.electric,padding:"4px",textAlign:"center"}}>
                      <span style={{fontSize:9,fontWeight:800,color:"#000"}}>• محدد</span>
                    </div>
                  )}
                </button>
                <button onClick={function(){changeTheme("light");}} style={{
                  flex:1,borderRadius:14,overflow:"hidden",
                  border:"2px solid "+(theme==="light"?C.electric:C.line),
                  background:"transparent",cursor:"pointer",padding:0,
                }}>
                  <div style={{background:"#f0f2f5",padding:"14px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <div style={{width:"100%",background:"#ffffff",borderRadius:8,padding:"6px 8px",display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:18,height:18,borderRadius:6,background:C.mint,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{height:5,background:"#dde0e8",borderRadius:3,marginBottom:3,width:"70%"}}/>
                        <div style={{height:4,background:"#eceef2",borderRadius:3,width:"50%"}}/>
                      </div>
                    </div>
                    <div style={{width:"100%",background:"#eceef2",borderRadius:6,padding:"5px 8px",display:"flex",gap:3}}>
                      {["#f5a623","#1db88a","#e8394a"].map(function(col,ci){
                        return <div key={ci} style={{height:4,flex:1,background:col,borderRadius:2,opacity:0.7}}/>;
                      })}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:"#0d1117"}}>فاتح</span>
                  </div>
                  {theme==="light"&&(
                    <div style={{background:C.electric,padding:"4px",textAlign:"center"}}>
                      <span style={{fontSize:9,fontWeight:800,color:"#000"}}>• محدد</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            <div style={{background:C.layer2,borderTop:"1px solid "+C.line}}>
              <div onClick={function(){setShowNotifPanel(true);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+C.line,cursor:"pointer"}}>
                <Ico k="back" color={C.smoke} size={13}/>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Ico k="bell" color={C.mint} size={15}/>
                  <span style={{fontSize:13,color:C.snow}}>الإشعارات</span>
                </div>
              </div>
              <div onClick={function(){setShowRatingPanel(true);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+C.line,cursor:"pointer"}}>
                <Ico k="back" color={C.smoke} size={13}/>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Ico k="star" color={C.gold} size={15}/>
                  <span style={{fontSize:13,color:C.snow}}>تقييم التطبيق</span>
                </div>
              </div>
              <div onClick={function(){
                var shareData={title:"تداول+ | تطبيق الأسهم السعودية",text:"تطبيق تداول+ المتكامل لتحليل سوق الأسهم السعودية بالذكاء الاصطناعي",url:"https://claude.ai"};
                var tryShare=function(w){if(w&&w.navigator&&w.navigator.share){w.navigator.share(shareData).catch(function(){});return true;}return false;};
                if(!tryShare(window)){try{if(!tryShare(window.top))tryShare(window.parent);}catch(e){}}
              }} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",cursor:"pointer"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.smoke} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span style={{fontSize:13,color:C.snow}}>مشاركة التطبيق</span>
              </div>
            </div>

          

          {showNotifPanel&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.96)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",border:"1px solid "+C.line}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <button onClick={function(){setShowNotifPanel(false);}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,cursor:"pointer",fontSize:12}}>
                    <Ico k="back" color={C.smoke} size={14}/>
                  </button>
                  <div style={{fontSize:15,fontWeight:800,color:C.snow}}>الإشعارات</div>
                  <div style={{width:36}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <div style={{background:C.layer3,borderRadius:14,padding:"14px 16px",border:"1px solid "+C.line}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <button onClick={function(){setNotifSound(function(v){return !v;});}} style={{width:44,height:24,borderRadius:12,cursor:"pointer",border:"none",background:notifSound?C.mint:C.edge,position:"relative",transition:"background .25s",flexShrink:0}}>
                        <div style={{width:20,height:20,borderRadius:10,background:C.snow,position:"absolute",top:2,left:notifSound?22:2,transition:"left .25s"}}/>
                      </button>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.snow}}>الإشعارات الصوتية</div>
                        <div style={{fontSize:9,color:C.smoke,marginTop:2}}>صوت عند تفعيل التنبيهات السعرية</div>
                      </div>
                    </div>
                  </div>
                  <div style={{background:C.layer3,borderRadius:14,padding:"14px 16px",border:"1px solid "+C.line,opacity:0.5}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{width:44,height:24,borderRadius:12,background:C.edge,position:"relative",flexShrink:0}}>
                        <div style={{width:20,height:20,borderRadius:10,background:C.snow,position:"absolute",top:2,left:2}}/>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.smoke}}>الإشعارات الفورية</div>
                        <div style={{fontSize:9,color:C.ash,marginTop:2}}>يتطلب نسخة التطبيق الكامل</div>
                      </div>
                    </div>
                  </div>
                  <div style={{background:C.layer3,borderRadius:14,padding:"14px 16px",border:"1px solid "+C.line,opacity:0.5}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{width:44,height:24,borderRadius:12,background:C.edge,position:"relative",flexShrink:0}}>
                        <div style={{width:20,height:20,borderRadius:10,background:C.snow,position:"absolute",top:2,left:2}}/>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.smoke}}>ملخص السوق اليومي</div>
                        <div style={{fontSize:9,color:C.ash,marginTop:2}}>إشعار يومي عند إغلاق السوق</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showRatingPanel&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.96)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",padding:"24px 20px 40px",border:"1px solid "+C.line}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <button onClick={function(){setShowRatingPanel(false);setRatingVal(0);}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,cursor:"pointer",fontSize:12}}>
                    <Ico k="back" color={C.smoke} size={14}/>
                  </button>
                  <div style={{fontSize:15,fontWeight:800,color:C.snow}}>تقييم التطبيق</div>
                  <div style={{width:36}}/>
                </div>
                <div style={{textAlign:"center",padding:"8px 0 16px"}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.snow,marginBottom:4}}>كيف تجد تداول+؟</div>
                  <div style={{fontSize:11,color:C.smoke,marginBottom:20}}>تقييمك يساعدنا على التحسين المستمر</div>
                  <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:20}}>
                    {[1,2,3,4,5].map(function(n){return(
                      <div key={n} onClick={function(){setRatingVal(n);}} style={{cursor:"pointer",fontSize:36,transition:"transform .2s",transform:ratingVal>=n?"scale(1.25)":"scale(1)"}}>
                        <span style={{color:ratingVal>=n?C.gold:C.smoke,fontSize:36}}>{ratingVal>=n?"\u2605":"\u2606"}</span>
                      </div>
                    );})}
                  </div>
                  {ratingVal>0&&(
                    <div>
                      <div className="num-lg" style={{fontSize:14,color:ratingVal>=4?C.mint:ratingVal>=3?C.amber:C.coral,fontWeight:700,marginBottom:20}}>
                        {ratingVal===5?"ممتاز! شكراً جزيلاً":ratingVal===4?"رائع! نسعد بتقييمك":ratingVal===3?"جيد، سنعمل على التحسين":ratingVal===2?"شكراً، سنحاول أكثر":"نأسف لذلك، أخبرنا ما المشكلة"}
                      </div>
                      <button onClick={function(){setShowRatingPanel(false);setRatingVal(0);}} style={{background:"linear-gradient(135deg,"+C.gold+","+C.goldD+")",color:"#000",border:"none",padding:"12px 40px",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
                        إرسال التقييم
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div style={{textAlign:"center",padding:"28px 20px"}}>
            <div className="glow-gold" style={{fontSize:10,color:C.gold,fontWeight:700,letterSpacing:"4px",marginBottom:5}}>TADAWUL+</div>
            <div style={{fontSize:14,fontWeight:900,color:C.mist,marginBottom:5}}>تداول+</div>
            <div style={{fontSize:9,color:C.ash}}>الإصدار 3.0 · Terminal Obsidian × Saudi Gold</div>
            <div style={{fontSize:8,color:C.edge,marginTop:3}}>© 2026 تداول+ · جميع الحقوق محفوظة</div>
            <button onClick={function(){
              if(!window.confirm("هل تريد إعادة ضبط جميع الإعدادات؟")) return;
              setFontSize("medium"); setNotifSound(true); changeTheme("dark");
              setCommCat("الكل"); setFundTab("all"); setIpoF("all"); setCalF("all"); setRankIdx(0); setRankSec("الكل");
            }} style={{
              marginTop:16,
              border:"1px solid "+C.line,color:C.ash,
              padding:"9px 22px",borderRadius:12,fontSize:10,cursor:"pointer",
              fontFamily:"Cairo,sans-serif",
            }}>إعادة ضبط الإعدادات</button>
              <button onClick={function(){setShowPrivacy(true);}} style={{
                marginTop:10,
                background:"none",
                border:"1px solid "+C.line,color:C.smoke,
                padding:"9px 22px",borderRadius:12,fontSize:10,cursor:"pointer",
                fontFamily:"Cairo,sans-serif",
              }}>سياسة الخصوصية</button>
          </div>
          {showPrivacy&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.97)",zIndex:999,overflowY:"auto"}}>
              <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",minHeight:"100vh",padding:"0 0 40px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid "+C.line,position:"sticky",top:0,background:C.layer1,zIndex:10}}>
                  <button onClick={function(){setShowPrivacy(false);}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,cursor:"pointer",fontSize:12}}>
                    <Ico k="back" color={C.smoke} size={14}/>
                  </button>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.gold,fontWeight:700,letterSpacing:"2px"}}>+TADAWUL</div>
                    <div style={{fontSize:15,fontWeight:800,color:C.snow}}>سياسة الخصوصية</div>
                  </div>
                  <div style={{width:36}}/>
                </div>
                <div style={{padding:"24px 20px",display:"flex",flexDirection:"column",gap:20}}>
                  <div style={{textAlign:"center",padding:"8px 0 16px"}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.gold,marginBottom:4}}>تداول+ · الإصدار 3.0</div>
                    <div style={{fontSize:10,color:C.smoke}}>آخر تحديث: مارس 2026</div>
                  </div>
                  {[
                    {
                      title:"جمع البيانات",
                      ico:"shield",
                      color:C.mint,
                      body:"تداول+ لا يجمع أي بيانات شخصية أو مالية. جميع البيانات المُدخَلة (التنبيهات، المتابعة، الملاحظات) تُحفظ محلياً على جهازك فقط ولا تُرسَل لأي خادم."
                    },
                    {
                      title:"البيانات المحلية",
                      ico:"box",
                      color:C.electric,
                      body:"يستخدم التطبيق localStorage لحفظ إعداداتك وقوائم متابعتك وتنبيهاتك السعرية. هذه البيانات تبقى على جهازك تماماً ويمكنك حذفها في أي وقت من إعدادات المتصفح."
                    },
                    {
                      title:"بيانات السوق",
                      ico:"chart",
                      color:C.amber,
                      body:"أسعار الأسهم والبيانات المالية المعروضة مصدرها بيانات السوق السعودي وYahoo Finance. هذه البيانات للأغراض المعلوماتية فقط وليست توصيات استثمارية."
                    },
                    {
                      title:"إخلاء المسؤولية",
                      ico:"scale",
                      color:C.coral,
                      body:"تداول+ تطبيق معلوماتي تعليمي بحت. المعلومات المعروضة لا تُعدّ نصيحة مالية أو استثمارية. يتحمل المستخدم مسؤولية قراراته الاستثمارية بالكامل. استشر متخصصاً مالياً مرخصاً قبل اتخاذ أي قرار استثماري."
                    },
                    {
                      title:"حقوق الملكية",
                      ico:"medal",
                      color:C.gold,
                      body:"جميع حقوق الملكية الفكرية لتطبيق تداول+ محفوظة. يُحظر نسخ أو توزيع أي جزء من التطبيق دون إذن خطي مسبق. العلامات التجارية للشركات المذكورة ملك لأصحابها."
                    },
                    {
                      title:"التواصل معنا",
                      ico:"bell",
                      color:C.teal,
                      body:"لأي استفسارات أو ملاحظات بخصوص سياسة الخصوصية أو التطبيق، يسعدنا تلقّي تواصلك عبر قسم التقييم داخل التطبيق. نلتزم بالرد خلال 48 ساعة."
                    },
                  ].map(function(sec,si){return(
                    <div key={si} style={{background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",borderRadius:16,padding:"16px 18px",border:"1px solid "+sec.color+"22",boxShadow:"0 4px 20px rgba(0,0,0,.2)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{width:32,height:32,borderRadius:9,background:sec.color+"18",border:"1px solid "+sec.color+"33",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <Ico k={sec.ico} color={sec.color} size={16}/>
                        </div>
                        <div style={{fontSize:13,fontWeight:800,color:C.snow}}>{sec.title}</div>
                      </div>
                      <div style={{fontSize:11,color:C.mist,lineHeight:1.7,textAlign:"right"}}>{sec.body}</div>
                    </div>
                  );})}
                  <div style={{textAlign:"center",padding:"8px 0",borderTop:"1px solid "+C.line}}>
                    <div style={{fontSize:9,color:C.ash,lineHeight:1.8}}>
                      باستخدامك لتداول+ فإنك توافق على هذه السياسة
                    </div>
                    <div style={{fontSize:8,color:C.edge,marginTop:4}}>© 2026 تداول+ · جميع الحقوق محفوظة</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{height:14}}/>
        </div>
  );
}

function ProfitCalc(props) {
  var onClose=props.onClose;
  const haptic = useHaptic();
  const [sym, setSym] = useState(STOCKS[0]);
  var sSrch=useState(""); var symSearch=sSrch[0]; var setSymSearch=sSrch[1];
  var symQ=symSearch.trim();
  var symResults=symQ.length>0?STOCKS.filter(function(s){return s.sym.indexOf(symQ)>=0||s.name.indexOf(symQ)>=0;}).slice(0,6):[];
  const [qty, setQty] = useState("100");
  const [buyP, setBuyP] = useState("");
  const [sellP, setSellP] = useState("");
  const [calcTab, setCalcTab] = useState("basic");
  const [commRate, setCommRate] = useState("0.06");
  var scenarios=[
    {label:"متحفظ (Bear)",   pct:5,  color:C.teal},
    {label:"متوسط (Base)",   pct:10, color:C.amber},
    {label:"متفائل (Bull)",  pct:20, color:C.mint},
    {label:"استثنائي",       pct:35, color:C.gold},
  ];
  var buy=parseFloat(buyP)||sym.p*0.95;
  var sell=parseFloat(sellP)||sym.p;
  var q=Math.max(1,parseInt(qty)||100);
  var gross=(sell-buy)*q;
  var rate=Math.max(0,parseFloat(commRate)||0.06)/100;
  var brok=Math.max((buy*q+sell*q)*rate,30);
  var net=gross-brok;
  var pct=((sell-buy)/buy)*100;
  var breakeven=((buy*q+brok)/q).toFixed(2);
  var netPct=buy*q>0?net/(buy*q):0;
  var calcTabs=[{k:"basic",l:"أساسي"},{k:"scenarios",l:"سيناريوهات"}];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.95)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto",border:"1px solid "+C.line,boxShadow:"0 -24px 60px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 16px 12px",borderBottom:"1px solid "+C.line}}>
          <button onClick={function(){onClose();}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,fontSize:12,cursor:"pointer"}}>
            <Ico k="back" color={C.smoke} size={14}/>
          </button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:C.gold,fontWeight:700,letterSpacing:"2px"}}>+TADAWUL</div>
            <div style={{fontSize:15,fontWeight:800,color:C.snow}}>حاسبة الربح</div>
          </div>
          <div style={{display:"flex",background:C.layer3,borderRadius:9,border:"1px solid "+C.line,padding:3}}>
            {calcTabs.map(function(t){return(
              <button key={t.k} onClick={function(){setCalcTab(t.k);}}
                style={{padding:"6px 14px",borderRadius:7,border:"none",background:calcTab===t.k?"linear-gradient(135deg,"+C.gold+"22,"+C.goldD+"11)":"transparent",color:calcTab===t.k?C.gold:C.smoke,fontSize:10,cursor:"pointer",fontWeight:calcTab===t.k?700:400}}>
                {t.l}
              </button>
            );})}
          </div>
        </div>
        <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
          {calcTab==="basic"&&(
            <div>
              <div style={{marginBottom:10,position:"relative"}}>
                <div style={{fontSize:10,color:C.smoke,marginBottom:6,textAlign:"right"}}>السهم</div>
                <input
                  value={symSearch}
                  onChange={function(e){setSymSearch(e.target.value);}}
                  placeholder={sym.sym+" · "+sym.name}
                  style={{width:"100%",background:C.layer3,border:"1px solid "+(symSearch?C.gold+"55":C.line),borderRadius:10,padding:"10px 14px",color:C.snow,fontSize:12,direction:"rtl",outline:"none",boxSizing:"border-box"}}
                />
                {symSearch&&symResults.length===0&&(
                  <div style={{padding:"8px 14px",color:C.smoke,fontSize:11,textAlign:"right"}}>لا توجد نتائج</div>
                )}
                {symResults.length>0&&(
                  <div style={{position:"absolute",top:"110%",left:0,right:0,background:C.layer2,border:"1px solid "+C.line,borderRadius:10,marginTop:2,zIndex:50,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
                    {symResults.map(function(s){return(
                      <div key={s.sym} onClick={function(){setSym(s);setBuyP("");setSellP("");setSymSearch("");}}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid "+C.line+"44",cursor:"pointer",background:sym.sym===s.sym?C.gold+"11":"transparent"}}>
                        <div className="num" style={{fontSize:12,fontWeight:700,color:sym.sym===s.sym?C.gold:C.smoke}}>{s.sym}</div>
                        <div style={{fontSize:12,color:sym.sym===s.sym?C.gold:C.snow}}>{s.name}</div>
                      </div>
                    );})}
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:5,gap:5,alignItems:"center"}}>
                  <div className="num" style={{fontSize:11,fontWeight:700,color:C.gold}}>{sym.sym}</div>
                  <div style={{fontSize:10,color:C.smoke}}>·</div>
                  <div style={{fontSize:11,color:C.mist}}>{sym.name}</div>
                  <div style={{fontSize:9,color:C.smoke,marginRight:4}}>السهم المحدد:</div>
                </div>
              </div>
              {[
                {label:"سعر الشراء (ر.س)", val:buyP,  set:setBuyP,  ph:buy.toFixed(2)},
                {label:"سعر البيع (ر.س)",  val:sellP, set:setSellP, ph:sym.p.toFixed(2)},
                {label:"الكمية / Shares",  val:qty,   set:setQty,   ph:"100"},
                {label:"نسبة العمولة %",   val:commRate, set:setCommRate, ph:"0.06"},
              ].map(function(f){return(
                <div key={f.label} style={{marginBottom:8}}>
                  <div style={{fontSize:10,color:C.smoke,marginBottom:5,textAlign:"right"}}>{f.label}</div>
                  <input value={f.val} onChange={function(e){f.set(e.target.value);}} placeholder={String(f.ph)}
                    style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:10,padding:"11px 14px",color:C.snow,fontSize:14,direction:"ltr",textAlign:"right",outline:"none",boxSizing:"border-box"}}/>
                </div>
              );})}
              <div style={{background:C.layer3,borderRadius:12,padding:14,border:"1px solid "+C.line}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                  {[
                    {l:"صافي الربح",    v:(net>=0?"+":"")+net.toFixed(2)+" ر.س",     c:net>=0?C.mint:C.coral,big:true},
                    {l:"ROI %",         v:(pct>=0?"+":"")+pct.toFixed(2)+"%",         c:pct>=0?C.mint:C.coral,big:true},
                    {l:"العمولة (ش+ب)", v:brok.toFixed(2)+" ر.س",                     c:C.smoke},
                    {l:"نقطة التعادل",  v:breakeven+" ر.س",                            c:C.amber},
                  ].map(function(r){return(
                    <div key={r.l} style={{background:"rgba(255,255,255,.04)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
                      <div style={{fontSize:8,color:C.smoke,marginBottom:3}}>{r.l}</div>
                      <div className="num" style={{fontSize:r.big?15:12,fontWeight:800,color:r.c}}>{r.v}</div>
                    </div>
                  );})}
                </div>
              </div>
            </div>
          )}
          {calcTab==="scenarios"&&(
            <div>
              <div style={{marginBottom:12,position:"relative"}}>
                <input
                  value={symSearch}
                  onChange={function(e){setSymSearch(e.target.value);}}
                  placeholder={sym.sym+" · "+sym.name}
                  style={{width:"100%",background:C.layer3,border:"1px solid "+(symSearch?C.gold+"55":C.line),borderRadius:10,padding:"10px 14px",color:C.snow,fontSize:12,direction:"rtl",outline:"none",boxSizing:"border-box"}}
                />
                {symSearch&&symResults.length===0&&(
                  <div style={{padding:"8px 14px",color:C.smoke,fontSize:11,textAlign:"right"}}>لا توجد نتائج</div>
                )}
                {symResults.length>0&&(
                  <div style={{position:"absolute",top:"110%",left:0,right:0,background:C.layer2,border:"1px solid "+C.line,borderRadius:10,marginTop:2,zIndex:50,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
                    {symResults.map(function(s){return(
                      <div key={s.sym} onClick={function(){setSym(s);setSymSearch("");}}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid "+C.line+"44",cursor:"pointer",background:sym.sym===s.sym?C.gold+"11":"transparent"}}>
                        <div className="num" style={{fontSize:12,fontWeight:700,color:sym.sym===s.sym?C.gold:C.smoke}}>{s.sym}</div>
                        <div style={{fontSize:12,color:sym.sym===s.sym?C.gold:C.snow}}>{s.name}</div>
                      </div>
                    );})}
                  </div>
                )}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:5,gap:5,alignItems:"center"}}>
                  <div className="num" style={{fontSize:11,fontWeight:700,color:C.gold}}>{sym.sym}</div>
                  <div style={{fontSize:10,color:C.smoke}}>·</div>
                  <div style={{fontSize:11,color:C.mist}}>{sym.name}</div>
                  <div style={{fontSize:9,color:C.smoke,marginRight:4}}>السهم المحدد:</div>
                </div>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:10,color:C.smoke,marginBottom:5,textAlign:"right"}}>رأس المال (ر.س)</div>
                <input value={buyP} onChange={function(e){setBuyP(e.target.value);}} placeholder={String(Math.round(sym.p*100))}
                  style={{width:"100%",background:C.layer3,border:"1px solid "+C.line,borderRadius:10,padding:"11px 14px",color:C.snow,fontSize:14,direction:"ltr",textAlign:"right",outline:"none",boxSizing:"border-box"}} onKeyDown={function(e){if(e.key==="Enter"){haptic.tap();e.target.blur();}}} />
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {scenarios.map(function(sc){
                  var capital=parseFloat(buyP)||sym.p*100;
                  var profit=capital*(sc.pct/100);
                  return(
                    <div key={sc.label} style={{background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",border:"1px solid "+sc.color+"22",borderRadius:14,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div className="num" style={{fontSize:15,fontWeight:900,color:sc.color}}>+{profit.toFixed(0)} ر.س</div>
                        <div style={{fontSize:8,color:C.smoke,marginTop:2}}>{sc.label} · +{sc.pct}%</div>
                      </div>
                      <div style={{width:42,height:42,borderRadius:11,background:sc.color+"18",border:"1px solid "+sc.color+"33",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Ico k="invest" color={sc.color} size={20}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RadarCompare(props) {
  var a=props.a,b=props.b,metrics=props.metrics;
  var n=metrics.length;
  var cx=120,cy=120,r=72;
  function ptX(i,ratio){var angle=(i/n)*Math.PI*2-Math.PI/2;return cx+Math.cos(angle)*r*ratio;}
  function ptY(i,ratio){var angle=(i/n)*Math.PI*2-Math.PI/2;return cy+Math.sin(angle)*r*ratio;}
  function labelX(i){var angle=(i/n)*Math.PI*2-Math.PI/2;return cx+Math.cos(angle)*(r+22);}
  function labelY(i){var angle=(i/n)*Math.PI*2-Math.PI/2;return cy+Math.sin(angle)*(r+22)+3;}
  function anchor(i){
    var angle=(i/n)*Math.PI*2-Math.PI/2;
    var cos=Math.cos(angle);
    if(cos>0.3) return "start";
    if(cos<-0.3) return "end";
    return "middle";
  }
  function polyPts(stock){
    var pts=[];
    for(var i=0;i<metrics.length;i++){
      var m=metrics[i];
      var aVal=a[m.ka]||0, bVal=b[m.ka]||0, sVal=stock[m.ka]||0;
      var mn=Math.min.apply(null,[aVal,bVal]);
      var mx=Math.max.apply(null,[aVal,bVal]);
      var ratio;
      if(mx===mn){
        ratio=0.5;
      } else {
        ratio=(sVal-mn)/(mx-mn);
        if(!m.higher) ratio=1-ratio;
        ratio=Math.max(0.08,Math.min(0.92,ratio));
      }
      pts.push(ptX(i,ratio)+","+ptY(i,ratio));
    }
    return pts.join(" ");
  }
  return(
    <svg width="240" height="240" viewBox="0 0 240 240">
      {(function(){
        var r1=[],r2=[],r3=[];
        for(var i=0;i<n;i++){r1.push(ptX(i,0.33)+","+ptY(i,0.33));r2.push(ptX(i,0.66)+","+ptY(i,0.66));r3.push(ptX(i,1)+","+ptY(i,1));}
        return(<React.Fragment>
          <polygon points={r1.join(" ")} fill="none" stroke={C.line} strokeWidth="0.7"/>
          <polygon points={r2.join(" ")} fill="none" stroke={C.line} strokeWidth="0.7"/>
          <polygon points={r3.join(" ")} fill={C.layer2} stroke={C.line} strokeWidth="0.7"/>
        </React.Fragment>);
      }())}
      {(function(){
        var ls=[];
        for(var i=0;i<n;i++){ls.push(<line key={i} x1={cx} y1={cy} x2={ptX(i,1)} y2={ptY(i,1)} stroke={C.line} strokeWidth="0.7"/>);}
        return ls;
      }())}
      <polygon points={polyPts(a)} fill={C.electric+"30"} stroke={C.electric} strokeWidth="2"/>
      <polygon points={polyPts(b)} fill={C.gold+"30"} stroke={C.gold} strokeWidth="2"/>
      {metrics.map(function(m,i){
        return(
          <text key={m.ka} x={labelX(i)} y={labelY(i)}
            textAnchor={anchor(i)}
            fill={C.smoke} fontSize="8" fontFamily="Cairo,sans-serif"
            fontWeight="600">{m.l}</text>
        );
      })}
    </svg>
  );
}

function CompareView(props) {
  var onClose=props.onClose;
  var sA=useState(STOCKS[0]); var a=sA[0]; var setA=sA[1];
  var sB=useState(STOCKS[1]); var b=sB[0]; var setB=sB[1];
  var metrics=[
    {l:"السعر",   ka:"p",      higher:true},
    {l:"التغير",  ka:"pct",    higher:true},
    {l:"P/E",     ka:"pe",     higher:false},
    {l:"توزيعات", ka:"div",    higher:true},
    {l:"ROE",     ka:"roe",    higher:true},
    {l:"ق.سوقية", ka:"mktCap", higher:true},
  ];
  function winner(ka){
    var m=null;
    for(var i=0;i<metrics.length;i++){if(metrics[i].ka===ka){m=metrics[i];break;}}
    if(!m) return "tie";
    return (m.higher?(a[ka]>b[ka]):(a[ka]<b[ka]))?"a":(m.higher?(b[ka]>a[ka]):(b[ka]<a[ka]))?"b":"tie";
  }
  var aWins=0,bWins=0;
  for(var i=0;i<metrics.length;i++){
    var w=winner(metrics[i].ka);
    if(w==="a") aWins++;
    if(w==="b") bWins++;
  }
  var stockPairs=[{s:a,set:setA,col:C.electric,lbl:"السهم الأول"},{s:b,set:setB,col:C.gold,lbl:"السهم الثاني"}];
  var winRows=[{s:a,col:C.electric,wins:aWins},{s:b,col:C.gold,wins:bWins}];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.95)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto",border:"1px solid "+C.line,boxShadow:"0 -24px 60px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px",borderBottom:"1px solid "+C.line}}>
          <button onClick={function(){onClose();}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,fontSize:12,cursor:"pointer"}}>
            <Ico k="back" color={C.smoke} size={14}/>
          </button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:"#f97316",fontWeight:700,letterSpacing:"2px"}}>TADAWUL+</div>
            <div style={{fontSize:15,fontWeight:800,color:C.snow}}>مقارنة سهمين</div>
          </div>
          <div style={{width:44}}/>
        </div>
        <div style={{padding:14}}>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            {stockPairs.map(function(row,ri){return(
              <div key={ri} style={{flex:1}}>
                <div style={{fontSize:9,color:row.col,fontWeight:700,marginBottom:4,textAlign:"center"}}>{row.lbl}</div>
                <select value={row.s.sym} onChange={function(e){var v=e.target.value;var f=STOCKS.filter(function(s){return s.sym===v;});if(f[0])row.set(f[0]);}}
                  style={{width:"100%",background:C.layer3,border:"1px solid "+row.col+"44",borderRadius:9,padding:"8px 10px",color:row.col,fontSize:11,direction:"rtl",outline:"none",cursor:"pointer",fontWeight:700}}>
                  {STOCKS.map(function(s){return(<option key={s.sym} value={s.sym} style={{background:C.layer2}}>{s.name}</option>);})}
                </select>
              </div>
            );})}
          </div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
            <RadarCompare a={a} b={b} metrics={metrics}/>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {winRows.map(function(row,ri){return(
              <div key={ri} style={{flex:1,background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",borderRadius:12,padding:"12px 10px",textAlign:"center",border:"1px solid "+row.col+"33"}}>
                <div style={{fontSize:16,fontWeight:900,color:row.col}}>{row.s.name}</div>
                <div style={{fontSize:11,color:C.smoke,marginTop:2}}>{row.wins} انتصار</div>
                {row.wins>bWins&&ri===0&&<div style={{fontSize:9,color:C.mint,marginTop:3,fontWeight:700}}>الأفضل اجمالاً</div>}
                {row.wins>aWins&&ri===1&&<div style={{fontSize:9,color:C.mint,marginTop:3,fontWeight:700}}>الأفضل اجمالاً</div>}
              </div>
            );})}
          </div>
          {metrics.map(function(m){
            var w=winner(m.ka);
            var aVal=a[m.ka]; var bVal=b[m.ka];
            return(
              <div key={m.ka} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"10px 12px",background:C.layer3,borderRadius:11,border:"1px solid "+C.line}}>
                <div style={{flex:1,textAlign:"left"}}>
                  <div className="num" style={{fontSize:13,fontWeight:800,color:w==="a"?C.electric:C.smoke,direction:"ltr"}}>{aVal}</div>
                  {w==="a"&&<div style={{fontSize:8,color:C.mint,fontWeight:700}}>أفضل</div>}
                </div>
                <div style={{fontSize:9,color:C.smoke,textAlign:"center",minWidth:40,fontWeight:700}}>{m.l}</div>
                <div style={{flex:1,textAlign:"right"}}>
                  <div className="num" style={{fontSize:13,fontWeight:800,color:w==="b"?C.gold:C.smoke,direction:"ltr"}}>{bVal}</div>
                  {w==="b"&&<div style={{fontSize:8,color:C.mint,fontWeight:700}}>أفضل</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AlertsPanel(props) {
  var onClose=props.onClose;
  var PRIORITY_ORDER={high:0,medium:1,low:2};
  var typeOpts=[
    {k:"above",  l:"فوق السعر",      c:C.mint},
    {k:"below",  l:"تحت السعر",      c:C.coral},
    {k:"volume", l:"حجم غير عادي",   c:C.amber},
    {k:"news",   l:"أخبار جديدة",    c:C.electric},
  ];
  var prioOpts=[
    {k:"high",   l:"عالي",   c:C.coral},
    {k:"medium", l:"متوسط",  c:C.amber},
    {k:"low",    l:"منخفض",  c:C.mint},
  ];
  var sA=useState(function(){
    try{var r=window.localStorage.getItem("tadawul_alerts");return r?JSON.parse(r):[];}catch(e){return [];}
  }); var alerts=sA[0]; var setAlerts=sA[1];
  useEffect(function(){
    try{window.localStorage.setItem("tadawul_alerts",JSON.stringify(alerts));}catch(e){}
  },[alerts]);
  var sS=useState(STOCKS[0]); var sym=sS[0]; var setSym=sS[1];
  var sT=useState("above"); var type=sT[0]; var setType=sT[1];
  var sP2=useState(""); var price=sP2[0]; var setPrice=sP2[1];
  var sN=useState(""); var note=sN[0]; var setNote=sN[1];
  var sPr=useState("medium"); var priority=sPr[0]; var setPriority=sPr[1];
  var sEx=useState(""); var expiry=sEx[0]; var setExpiry=sEx[1];
  function add() {
    if(!price&&type!=="news"&&type!=="volume") return;
    setAlerts(function(p){
      return [{
        id:Date.now(),sym:sym.sym,name:sym.name,
        type:type,price:parseFloat(price),note:note,
        triggered:false,active:true,priority:priority,expiry:expiry||null
      }].concat(p);
    });
    setPrice(""); setNote(""); setExpiry("");
  }
  var sortedAlerts=alerts.slice().sort(function(a,b){
    return (PRIORITY_ORDER[a.priority]||1)-(PRIORITY_ORDER[b.priority]||1);
  });
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.95)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",maxHeight:"88vh",overflowY:"auto",border:"1px solid "+C.line,boxShadow:"0 -24px 60px rgba(0,0,0,.6)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px",borderBottom:"1px solid "+C.line}}>
          <button onClick={function(){onClose();}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,fontSize:12,cursor:"pointer"}}>
            <Ico k="back" color={C.smoke} size={14}/>
          </button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:C.electric,fontWeight:700,letterSpacing:"2px"}}>TADAWUL+</div>
            <div style={{fontSize:15,fontWeight:800,color:C.snow}}>التنبيهات السعرية</div>
          </div>
          <div style={{background:C.electric+"18",borderRadius:10,padding:"4px 10px",border:"1px solid "+C.electric+"33"}}>
            <span className="num" style={{fontSize:11,fontWeight:700,color:C.electric}}>{alerts.filter(function(a){return a.active;}).length}</span>
            <span style={{fontSize:9,color:C.smoke}}> نشط</span>
          </div>
        </div>
        <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:C.layer3,borderRadius:14,padding:14,border:"1px solid "+C.line}}>
            <div style={{fontSize:10,color:C.smoke,marginBottom:8,textAlign:"right",fontWeight:700}}>السهم</div>
            <select value={sym.sym} onChange={function(e){var f=STOCKS.filter(function(s){return s.sym===e.target.value;});if(f[0])setSym(f[0]);}}
              style={{width:"100%",background:C.layer2,border:"1px solid "+C.line,borderRadius:9,padding:"9px 12px",color:C.snow,fontSize:12,direction:"rtl",outline:"none",marginBottom:10,cursor:"pointer"}}>
              {STOCKS.map(function(s){return(<option key={s.sym} value={s.sym} style={{background:C.layer2}}>{s.name} {s.p} ر.س</option>);})}
            </select>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
              {typeOpts.map(function(t){return(
                <button key={t.k} onClick={function(){setType(t.k);}}
                  style={{padding:"8px",borderRadius:9,border:"1px solid "+(type===t.k?t.c+"66":C.line),background:type===t.k?t.c+"18":C.layer2,color:type===t.k?t.c:C.smoke,fontSize:10,cursor:"pointer",fontWeight:type===t.k?700:400}}>
                  {t.l}
                </button>
              );})}
            </div>
            {(type==="above"||type==="below")&&(
              <input value={price} onChange={function(e){setPrice(e.target.value);}} placeholder="السعر المستهدف"
                style={{width:"100%",background:C.layer2,border:"1px solid "+C.line,borderRadius:9,padding:"9px 12px",color:C.snow,fontSize:14,outline:"none",direction:"ltr",textAlign:"right",boxSizing:"border-box",marginBottom:8}}/>
            )}
            <input value={note} onChange={function(e){setNote(e.target.value);}} placeholder="ملاحظة (اختياري)"
              style={{width:"100%",background:C.layer2,border:"1px solid "+C.line,borderRadius:9,padding:"9px 12px",color:C.snow,fontSize:12,outline:"none",direction:"rtl",boxSizing:"border-box",marginBottom:8}}/>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:C.smoke,marginBottom:6,textAlign:"right"}}>الأولوية</div>
              <div style={{display:"flex",gap:6}}>
                {prioOpts.map(function(pr){return(
                  <button key={pr.k} onClick={function(){setPriority(pr.k);}}
                    style={{flex:1,padding:"7px",borderRadius:9,border:"1px solid "+(priority===pr.k?pr.c+"66":C.line),background:priority===pr.k?pr.c+"18":C.layer2,color:priority===pr.k?pr.c:C.smoke,fontSize:10,cursor:"pointer",fontWeight:priority===pr.k?700:400}}>
                    {pr.l}
                  </button>
                );})}
              </div>
            </div>
            <input type="date" value={expiry} onChange={function(e){setExpiry(e.target.value);}}
              style={{width:"100%",background:C.layer2,border:"1px solid "+C.line,borderRadius:9,padding:"9px 12px",color:C.smoke,fontSize:11,outline:"none",boxSizing:"border-box",marginBottom:10}}/>
            <button onClick={function(){add();}}
              style={{width:"100%",background:"linear-gradient(135deg,"+C.electric+","+C.electric+"cc)",color:C.snow,border:"none",padding:"12px",borderRadius:11,fontSize:13,cursor:"pointer",fontWeight:800}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <Ico k="plus" color={C.snow} size={14}/>
                إضافة تنبيه
              </span>
            </button>
          </div>
          {sortedAlerts.length===0&&(
            <div style={{textAlign:"center",padding:"32px 20px",color:C.smoke}}>
              <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><Ico k="bell" color={C.electric+"55"} size={44}/></div>
              <div style={{fontSize:13,fontWeight:700,color:C.mist}}>لا توجد تنبيهات</div>
            </div>
          )}
          {sortedAlerts.map(function(al){
            var tColor=al.type==="above"?C.mint:al.type==="below"?C.coral:al.type==="volume"?C.amber:C.electric;
            var prColor=al.priority==="high"?C.coral:al.priority==="medium"?C.amber:C.mint;
            return(
              <div key={al.id} style={{background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",borderRadius:14,padding:"12px 14px",border:"1px solid "+(al.triggered?C.amber+"44":C.line),position:"relative"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <button onClick={function(){setAlerts(function(p){return p.filter(function(x){return x.id!==al.id;});});}}
                      style={{background:C.coral+"15",border:"1px solid "+C.coral+"30",color:C.coral,width:28,height:28,borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <Ico k="trash" color={C.coral} size={12}/>
                    </button>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:800,color:C.snow}}>{al.name}</div>
                    <div style={{display:"flex",gap:4,marginTop:3,justifyContent:"flex-end",flexWrap:"wrap"}}>
                      <span style={{fontSize:9,color:tColor,background:tColor+"15",borderRadius:5,padding:"1px 7px",border:"1px solid "+tColor+"30"}}>
                        {al.type==="above"?"↑ فوق":al.type==="below"?"↓ تحت":al.type==="volume"?"حجم غير عادي":"أخبار"}
                        {al.price?" "+al.price:""}
                      </span>
                      <span style={{fontSize:9,color:prColor,background:prColor+"15",borderRadius:5,padding:"1px 7px",border:"1px solid "+prColor+"30"}}>
                        {al.priority==="high"?"عالي":al.priority==="medium"?"متوسط":"منخفض"}
                      </span>
                      {al.triggered&&<span style={{fontSize:9,color:C.amber,background:C.amber+"18",borderRadius:5,padding:"1px 7px",display:"inline-flex",alignItems:"center",gap:3}}>
                        <Ico k="bell" color={C.amber} size={10}/> مُفعَّل
                      </span>}
                    </div>
                    {al.note&&<div style={{fontSize:9,color:C.smoke,marginTop:3}}>{al.note}</div>}
                    {al.expiry&&<div style={{fontSize:9,color:C.plasma,marginTop:2}}>ينتهي: {al.expiry}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WatchlistTab(props) {
  var tp=props.p?props.p:props;
  var sub=tp.sub, setSub=tp.setSub;
  var watchlist=tp.watchlist||[], setWatchlist=tp.setWatchlist||function(){};
  var stocksLive=tp.stocksLive||[];
  var BOX=tp.BOX, SHD=tp.SHD;
  var sAdd=useState(false); var showAdd=sAdd[0]; var setShowAdd=sAdd[1];
  var sSrch=useState(""); var wlSearch=sSrch[0]; var setWlSearch=sSrch[1];
  var wlQ=wlSearch.trim();
  var wlResults=wlQ.length>0?STOCKS.filter(function(s){return (s.sym.indexOf(wlQ)>=0||s.name.indexOf(wlQ)>=0)&&!watchlist.some(function(w){return w.sym===s.sym;});}).slice(0,6):[];
  var sNote=useState(function(){
    try{var r=window.localStorage.getItem("tadawul_wl_notes");return r?JSON.parse(r):{};} catch(e){return {};}
  }); var notes=sNote[0];
  var setNotes=function(updater){
    sNote[1](function(prev){
      var next=typeof updater==="function"?updater(prev):updater;
      try{window.localStorage.setItem("tadawul_wl_notes",JSON.stringify(next));}catch(e){}
      return next;
    });
  };
  var sEdit=useState(null); var editNote=sEdit[0]; var setEditNote=sEdit[1];
  return(
    <div style={{position:"relative",zIndex:1}}>
      <div style={{padding:"10px 16px",borderBottom:"1px solid "+C.line,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:C.smoke}}>{watchlist.length} سهم</span>
        <button onClick={function(){setShowAdd(true);}} style={{display:"flex",alignItems:"center",gap:6,background:"linear-gradient(135deg,"+C.gold+"22,"+C.gold+"11)",border:"1px solid "+C.gold+"44",borderRadius:10,padding:"7px 14px",color:C.gold,fontSize:11,cursor:"pointer",fontWeight:700}}>
          <Ico k="plus" color={C.gold} size={14}/>
          إضافة سهم
        </button>
      </div>
      {showAdd&&(
        <div style={{padding:"12px 16px",background:C.layer1,borderBottom:"1px solid "+C.line,position:"relative"}}>
          <input
            value={wlSearch}
            onChange={function(e){setWlSearch(e.target.value);}}
            placeholder="ابحث باسم أو رقم السهم..."
            style={{width:"100%",background:C.layer3,border:"1px solid "+(wlSearch?C.gold+"55":C.line),borderRadius:12,padding:"11px 16px",color:C.snow,fontSize:13,direction:"rtl",outline:"none",boxSizing:"border-box"}}
          />
          {wlSearch&&wlResults.length===0&&(
            <div style={{padding:"8px 4px",color:C.smoke,fontSize:11,textAlign:"right"}}>لا توجد نتائج</div>
          )}
          {wlResults.length>0&&(
            <div style={{background:C.layer2,border:"1px solid "+C.line,borderRadius:12,marginTop:4,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.5)"}}>
              {wlResults.map(function(s){return(
                <div key={s.sym} onClick={function(){setWatchlist(function(p){return p.concat([{sym:s.sym,name:s.name,color:s.color||C.mint}]);});setShowAdd(false);setWlSearch("");}}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid "+C.line+"33",cursor:"pointer"}}>
                  <div className="num" style={{fontSize:12,fontWeight:700,color:C.smoke}}>{s.sym}</div>
                  <div style={{fontSize:13,color:C.snow}}>{s.name}</div>
                </div>
              );})}            </div>
          )}
          <button onClick={function(){setShowAdd(false);setWlSearch("");}} style={{marginTop:8,fontSize:10,color:C.smoke,background:"none",border:"none",cursor:"pointer",display:"block",textAlign:"right",width:"100%"}}>إغلاق</button>
        </div>
      )}
      {watchlist.length===0&&(
        <div style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:12}}><Ico k="fire" color={C.gold+"44"} size={48}/></div>
          <div style={{fontSize:14,fontWeight:700,color:C.mist,marginBottom:6}}>لا توجد أسهم متابعة</div>
          <div style={{fontSize:11,color:C.smoke}}>اضغط إضافة سهم لبدء متابعة أسهمك</div>
        </div>
      )}
      <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
        {watchlist.map(function(w,wi){
          var live=stocksLive.filter(function(s){return s.sym===w.sym;})[0];
          var base2=STOCKS.filter(function(s){return s.sym===w.sym;})[0];
          var stock=live||base2||{};
          var isPos=(stock.pct||0)>=0;
          return(
            <div key={w.sym} className={"card-enter "+(isPos?"buy-glow":"danger-pulse")} style={{background:BOX,borderRadius:16,padding:"14px 16px",border:"1px solid "+(isPos?C.mint:C.coral)+"22",boxShadow:SHD,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+(isPos?C.mint:C.coral)+",transparent)"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={function(){setWatchlist(function(p){return p.filter(function(x){return x.sym!==w.sym;});});}} style={{width:28,height:28,borderRadius:7,background:C.coral+"15",border:"1px solid "+C.coral+"30",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                    <Ico k="trash" color={C.coral} size={12}/>
                  </button>
                  <div>
                    <div className="num" style={{fontSize:13,fontWeight:900,color:isPos?C.mint:C.coral,direction:"ltr"}}>{(isPos?"+":"")+((stock.pct||0).toFixed(2))}%</div>
                    <div className="num" style={{fontSize:11,color:C.smoke}}>{(stock.p||0).toFixed(2)} ر.س</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.snow}}>{w.name}</div>
                  <div style={{fontSize:9,color:C.smoke}}>{w.sym} · {stock.sec||""}</div>
                </div>
              </div>
              {stock.spark&&(
                <div style={{marginTop:6}}>
                  <SparkLine data={stock.spark} color={isPos?C.mint:C.coral} w={280} h={28}/>
                </div>
              )}
              {notes[w.sym]&&(
                <div style={{marginTop:8,padding:"6px 10px",background:C.layer3,borderRadius:8,border:"1px solid "+C.line}}>
                  <span style={{fontSize:9,color:C.mist}}>{notes[w.sym]}</span>
                </div>
              )}
              <div style={{marginTop:8,display:"flex",gap:6}}>
                <button onClick={function(){setEditNote(editNote===w.sym?null:w.sym);}} style={{flex:1,padding:"6px",borderRadius:8,background:C.layer3,border:"1px solid "+C.line,color:C.smoke,fontSize:9,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
                  <Ico k="edit" color={C.smoke} size={11}/>{notes[w.sym]?"تعديل الملاحظة":"إضافة ملاحظة"}
                </button>
              </div>
              {editNote===w.sym&&(
                <div style={{marginTop:8}}>
                  <input defaultValue={notes[w.sym]||""} id={"note-"+w.sym}
                    style={{width:"100%",background:C.layer2,border:"1px solid "+C.gold+"44",borderRadius:9,padding:"8px 12px",color:C.snow,fontSize:12,direction:"rtl",outline:"none",boxSizing:"border-box"}}
                    placeholder="ملاحظتك على هذا السهم..."/>
                  <div style={{display:"flex",gap:6,marginTop:6}}>
                    <button onClick={function(){var el=document.getElementById("note-"+w.sym);if(el){setNotes(function(p){var n=Object.assign({},p);n[w.sym]=el.value;return n;});}setEditNote(null);}} style={{flex:1,padding:"7px",borderRadius:8,background:"linear-gradient(135deg,"+C.gold+"22,"+C.gold+"11)",border:"1px solid "+C.gold+"44",color:C.gold,fontSize:10,cursor:"pointer",fontWeight:700}}>حفظ</button>
                    <button onClick={function(){setEditNote(null);}} style={{padding:"7px 12px",borderRadius:8,background:C.layer3,border:"1px solid "+C.line,color:C.smoke,fontSize:10,cursor:"pointer"}}>إلغاء</button>
                  </div>
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


export { SnapshotsTab, SettingsTab, ProfitCalc, RadarCompare, CompareView, AlertsPanel, WatchlistTab };
