'use client';
/**
 * @module screens/more/ToolsTabs
 * @description تبويبات الأدوات: لقطات، إعدادات، حاسبة، مقارنة، تنبيهات، المتابعة
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { STOCKS_LIVE as STOCKS } from '../../constants/stocksData';
import { C, Ico, MiniLine, PRIORITY_ORDER, SectionHeader, SparkLine, TagFilter } from './MoreShared';
import { useHaptic } from '../../hooks/useHaptic';
import { useNav } from '../../store';
import { useCompareData } from '../../hooks/useCompareData';

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
  var snaps=tp.snapshots||tp.snaps||[];
var setSnaps=tp.setSnapshots||tp.setSnaps;
  var editSnap=tp.editSnap;
  var fullSnap=tp.fullSnap;
var setFullSnap=tp.setFullSnap;
var snapOpen=tp.snapOpen;
var setSnapOpen=tp.setSnapOpen;
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
        <div style={{position:"relative",zIndex:1,overflow:viewSnap?'hidden':'visible'}}>
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
                <div key={snap.id} className="card-enter" onClick={function(){
  setViewSnap(snap);
  try{var n=document.getElementById('tadawul-nav');if(n)n.style.display='none';}catch(e){}
}}
 style={{
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
                          setSnaps(function(p){
  var updated=p.map(function(s){if(s.id===snap.id){var ns=Object.assign({},s);ns.note=val;return ns;}return s;});
  try{localStorage.setItem('tadawul_snapshots',JSON.stringify(updated));}catch(e){}
  return updated;
});
                          setEditSnap(null);
                        }} autoFocus style={{flex:1,background:C.layer3,border:"1px solid "+C.teal+"55",borderRadius:10,padding:"6px 12px",color:C.snow,fontSize:11,outline:"none",direction:"rtl"}}/>
                      </div>
                    ):(
                    <div>
    {snap.chartImage && (
      <img 
        src={snap.chartImage} 
        style={{ width: '100%', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }} 
      />
    )}
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
  {snap.price&&<div style={{background:C.layer3,borderRadius:8,padding:'4px 10px',border:'1px solid '+C.line}}>
    <span style={{fontSize:9,color:C.smoke}}>السعر </span>
    <span style={{fontSize:11,fontWeight:800,color:C.snow,fontFamily:'monospace'}}>{snap.price}</span>
  </div>}
  {snap.per&&<div style={{background:C.layer3,borderRadius:8,padding:'4px 10px',border:'1px solid '+C.line}}>
    <span style={{fontSize:9,color:C.smoke}}>الفريم </span>
    <span style={{fontSize:11,fontWeight:800,color:C.electric,fontFamily:'monospace'}}>{snap.per}</span>
  </div>}
  {snap.rsi&&<div style={{background:C.layer3,borderRadius:8,padding:'4px 10px',border:'1px solid '+C.line}}>
    <span style={{fontSize:9,color:C.smoke}}>RSI </span>
    <span style={{fontSize:11,fontWeight:800,color:C.amber,fontFamily:'monospace'}}>{snap.rsi}</span>
  </div>}
  {snap.macd&&<div style={{background:C.layer3,borderRadius:8,padding:'4px 10px',border:'1px solid '+C.line}}>
    <span style={{fontSize:9,color:C.smoke}}>MACD </span>
    <span style={{fontSize:11,fontWeight:800,color:snap.macd>0?C.mint:C.coral,fontFamily:'monospace'}}>{snap.macd}</span>
  </div>}
  {snap.indicators&&snap.indicators.length>0&&<div style={{background:C.layer3,borderRadius:8,padding:'4px 10px',border:'1px solid '+C.line}}>
    <span style={{fontSize:9,color:C.smoke}}>مؤشرات </span>
    <span style={{fontSize:11,fontWeight:800,color:C.teal}}>{snap.indicators.join(' · ')}</span>
  </div>}
</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={function(){setEditSnap(snap.id);}} style={{background:C.electric+"15",border:"1px solid "+C.electric+"30",color:C.electric,padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:10,fontWeight:600}}>تعديل</button>
                          <button onClick={function(){
                            var text="[لقطة] "+snap.name+" ("+snap.sym+")\nالسعر: "+(liveP?liveP.toFixed(2):"—")+" ر.س"+(diff!==null?" ("+(up?"+":"")+diff.toFixed(2)+"%)":" ")+"\nRSI: "+(snap.rsi||"—")+" | MACD: "+(snap.macd||"—")+"\n"+snap.note+"\n— تداول+";
                            if(navigator.share){navigator.share({title:"لقطة تداول+",text:text});}
                            else if(navigator.clipboard){navigator.clipboard.writeText(text);}
                          }} style={{background:C.teal+"15",border:"1px solid "+C.teal+"30",color:C.teal,padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:10,fontWeight:600}}>مشاركة</button>
                          <button onClick={function(){
  var updated=snaps.filter(function(s){return s.id!==snap.id;});
  setSnaps(updated);
  try{localStorage.setItem('tadawul_snapshots',JSON.stringify(updated));}catch(e){}
}}
style={{background:C.coral+"15",border:"1px solid "+C.coral+"30",color:C.coral,padding:"6px 10px",borderRadius:10,cursor:"pointer",fontSize:10,fontWeight:600}}>حذف</button>
                        </div>
                        <div style={{textAlign:"right",minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:C.snow,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>{snap.note}</div>
                          <div style={{fontSize:8,color:C.smoke,marginTop:2}}>{snap.date}</div>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              );
            })}
            {snaps.length>0&&(
              <button onClick={function(){
  setSnaps([]);
  try{localStorage.removeItem('tadawul_snapshots');}catch(e){}
}} style={{width:"100%",background:C.coral+"10",border:"1px solid "+C.coral+"25",color:C.coral,padding:"12px",borderRadius:14,fontSize:11,cursor:"pointer",fontWeight:700}}>
                حذف جميع اللقطات
              </button>
            )}
          </div>
          {viewSnap&&(
  <div style={{
    position:"fixed",inset:0,zIndex:1000,
    background:"#06080f",
    display:"flex",flexDirection:"column",
    paddingBottom:'env(safe-area-inset-bottom)',
    touchAction:'none',
    overscrollBehavior:'none',
    }}>
    <div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,background:'#06080f',borderBottom:'1px solid #1a2235',zIndex:10,position:'relative'}}>
      <button onClick={function(){
        setViewSnap(null);
        try{var n=document.getElementById('tadawul-nav');if(n)n.style.display='block';}catch(e){}
      }} style={{width:40,height:40,borderRadius:12,background:'#131720',border:'1px solid #1a2235',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
        <Ico k="back" color="#94a3b8" size={18}/>
      </button>
      <div>
        <div style={{fontSize:14,fontWeight:900,color:'#f0f6ff'}}>{viewSnap.name} · {viewSnap.sym}</div>
        <div style={{fontSize:10,color:'#4a6585'}}>{viewSnap.per} · {viewSnap.date}</div>
      </div>
    </div>
              <div style={{flex:1,position:"relative",overflow:"hidden"}}>
  {viewSnap.chartImage&&(
    <img src={viewSnap.chartImage} style={{width:"100%",height:"100%",objectFit:"contain"}}/>
  )}
  <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 20px 16px",zIndex:3}}>
    {viewSnap.note&&(
      <div style={{background:"rgba(6,8,15,0.88)",border:"1px solid "+viewSnap.color+"33",borderRadius:14,padding:"10px 14px",marginBottom:8}}>
        <div style={{fontSize:8,color:viewSnap.color,fontWeight:700,marginBottom:3}}>الملاحظة</div>
        <div style={{fontSize:12,color:"#f0f6ff",lineHeight:1.6}}>{viewSnap.note}</div>
        <div style={{fontSize:8,color:"#4a6585",marginTop:4}}>{viewSnap.date}</div>
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
      <button onClick={function(){setEditSnap(viewSnap.id);setViewSnap(null);}} style={{padding:"13px 18px",borderRadius:14,background:"rgba(6,8,15,0.88)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
        <Ico k="edit" color="#94a3b8" size={15}/>
        تعديل
      </button>
    </div>
  </div>
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
  var sThm=useState(function(){
  try{return localStorage.getItem('tadawul_theme')||'dark';}catch(e){return 'dark';}
}); var theme=sThm[0]; var setTheme=sThm[1];
  var isLight=theme==="light";
  var changeTheme=function(t){
  setTheme(t);
  try{localStorage.setItem('tadawul_theme', t);}catch(e){}
  document.documentElement.setAttribute('data-theme', t);
};
  var sNP=useState(false); var showNotifPanel=sNP[0]; var setShowNotifPanel=sNP[1];
  var sRP=useState(false); var showRatingPanel=sRP[0]; var setShowRatingPanel=sRP[1];
  var sRated=useState(0); var ratingVal=sRated[0]; var setRatingVal=sRated[1];
  var sPP=useState(false); var showPrivacy=sPP[0]; var setShowPrivacy=sPP[1];

  // ── إعدادات التنبيهات الذكية ──
  var sSmartPanel=useState(false); var showSmartPanel=sSmartPanel[0]; var setShowSmartPanel=sSmartPanel[1];

  // الإعدادات الافتراضية + التحميل/الحفظ محلياً (localStorage)
  var ALERT_DEFAULTS={soundEnabled:true,soundMode:"all",soundPreset:"chime",browserNotifications:true,vibration:true,volume:0.7};

  function loadAlertSettings(){
    try{
      var r=window.localStorage.getItem("tadawul_alert_settings");
      return r?Object.assign({},ALERT_DEFAULTS,JSON.parse(r)):ALERT_DEFAULTS;
    }catch(e){return ALERT_DEFAULTS;}
  }
  function saveAlertSettings(s){
    try{window.localStorage.setItem("tadawul_alert_settings",JSON.stringify(s));}catch(e){}
  }

  // نغمات التنبيه
  var SOUND_PRESETS={
    chime:{id:"chime",name:"رنّة كلاسيكية",description:"نغمة هادئة ومميزة"},
    bell:{id:"bell",name:"جرس",description:"تنبيه واضح"},
    ping:{id:"ping",name:"نبضة",description:"صوت قصير سريع"},
  };

  // تشغيل نغمة معاينة (Web Audio -- لا ملفات خارجية)
  function playAlertSound(presetId, volume){
    try{
      var AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return;
      var ctx=new AC();
      var osc=ctx.createOscillator();
      var gain=ctx.createGain();
      var freqMap={chime:880,bell:660,ping:1040};
      osc.frequency.value=freqMap[presetId]||880;
      osc.type="sine";
      gain.gain.value=(volume!=null?volume:0.7)*0.3;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.4);
      osc.stop(ctx.currentTime+0.42);
    }catch(e){}
  }

  var sAlertSet=useState(function(){return loadAlertSettings();}); var alertSettings=sAlertSet[0]; var setAlertSettings=sAlertSet[1];

  function updateAlertSettings(newValues) {
    var updated = Object.assign({}, alertSettings, newValues);
    setAlertSettings(updated);
    saveAlertSettings(updated);
  }

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
                  <button key={f.k} onClick={function(){
  setFontSize(f.k);
  var scales={small:'0.9',medium:'1',large:'1.12'};
  document.documentElement.style.setProperty('--font-scale', scales[f.k]);
  var zoomMap = {small: '0.92', medium: '1', large: '1.1'};
document.documentElement.style.zoom = zoomMap[f.k];
try{localStorage.setItem('tadawul_font_size', f.k);}catch(e){}
try{localStorage.setItem('tadawul_font_size', f.k);}catch(e){}
}}
 style={{
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
                            <div onClick={function(){setShowSmartPanel(true);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid "+C.line,cursor:"pointer"}}>
                <Ico k="back" color={C.smoke} size={13}/>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:15}}>✨</span>
                  <span style={{fontSize:13,color:C.snow}}>التنبيهات الذكية</span>
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
                var shareData={title:"تداول+ | تطبيق الأسهم السعودية",text:"تطبيق تداول+ المتكامل لتحليل سوق الأسهم السعودية بالذكاء الاصطناعي",url:"https://tadawul-plus.vercel.app"};
                var tryShare=function(w){if(w&&w.navigator&&w.navigator.share){w.navigator.share(shareData).catch(function(){});return true;}return false;};
              if(!tryShare(window)){try{if(!tryShare(window.top))tryShare(window.parent);}catch(e){}}
              }} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",cursor:"pointer"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.smoke} strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                <span style={{fontSize:13,color:C.snow}}>مشاركة التطبيق</span>
              </div>
            </div>

                    {showNotifPanel&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.96)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end",overflow:"hidden"}}>
              <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",height:"85vh",display:"flex",flexDirection:"column",border:"1px solid "+C.line}}>
                <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",padding:"24px 20px 80px",flex:1}}>
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
                </div>
                </div>
              </div>
            </div>
          )}

          {showRatingPanel&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.96)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"center"}}>
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
            {/* ═══ نافذة إعدادات التنبيهات الذكية ═══ */}
                    {showSmartPanel&&(
            <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.96)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",height:"92vh",maxHeight:"92vh",overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain",padding:"24px 16px 120px",border:"1px solid "+C.line}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <button onClick={function(){setShowSmartPanel(false);}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,cursor:"pointer",fontSize:12}}>
                    <Ico k="back" color={C.smoke} size={14}/>
                  </button>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.plasma,fontWeight:700,letterSpacing:"2px"}}>TADAWUL+</div>
                    <div style={{fontSize:15,fontWeight:800,color:C.snow}}>✨ التنبيهات الذكية</div>
                  </div>
                  <div style={{width:36}}/>
                </div>
                
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  
                  {/* 🔊 قسم الصوت */}
                  <div style={{background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",borderRadius:14,padding:16,border:"1px solid "+C.line}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                      <span style={{fontSize:20}}>🔊</span>
                      <div style={{fontSize:14,fontWeight:900,color:C.snow,fontFamily:"Cairo,sans-serif"}}>الصوت</div>
                    </div>
                    
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",background:C.layer2,borderRadius:10,marginBottom:10,border:"1px solid "+C.line+"44"}}>
                      <div style={{fontSize:12,color:C.mist,fontWeight:700,fontFamily:"Cairo,sans-serif"}}>تفعيل الصوت</div>
                      <button onClick={function(){updateAlertSettings({soundEnabled:!alertSettings.soundEnabled});}} style={{width:48,height:26,borderRadius:13,background:alertSettings.soundEnabled?C.mint:C.line,border:"none",cursor:"pointer",position:"relative",transition:"all 0.3s"}}>
                        <div style={{position:"absolute",top:3,right:alertSettings.soundEnabled?3:25,width:20,height:20,borderRadius:10,background:C.snow,transition:"all 0.3s",boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}/>
                      </button>
                    </div>

                    {alertSettings.soundEnabled && (
                      <>
                        <div style={{fontSize:10,color:C.smoke,marginBottom:8,fontWeight:700,textAlign:"right"}}>متى يُشغّل الصوت؟</div>
                        {[
                          {k:"all",l:"كل التنبيهات",d:"حتى الأولويات المتوسطة والمنخفضة"},
                          {k:"critical",l:"الحرجة فقط",d:"الأولويات الحرجة (Critical/High)"},
                          {k:"off",l:"صامت",d:"لا صوت لكن التنبيهات تظهر"},
                        ].map(function(opt){
                          var isActive = alertSettings.soundMode === opt.k;
                          return (
                            <button key={opt.k} onClick={function(){updateAlertSettings({soundMode:opt.k});}} style={{width:"100%",padding:"12px",background:isActive?C.electric+"18":C.layer2,border:"1px solid "+(isActive?C.electric+"55":C.line+"44"),borderRadius:10,cursor:"pointer",marginBottom:8,textAlign:"right",transition:"all 0.2s"}}>
                              <div style={{fontSize:12,fontWeight:800,color:isActive?C.electric:C.mist,fontFamily:"Cairo,sans-serif",marginBottom:3}}>
                                {isActive && "● "}{opt.l}
                              </div>
                              <div style={{fontSize:9,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>{opt.d}</div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* 🎵 اختيار النغمة */}
                  {alertSettings.soundEnabled && alertSettings.soundMode !== 'off' && (
                    <div style={{background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",borderRadius:14,padding:16,border:"1px solid "+C.line}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                        <span style={{fontSize:20}}>🎵</span>
                        <div style={{fontSize:14,fontWeight:900,color:C.snow,fontFamily:"Cairo,sans-serif"}}>نغمة التنبيه</div>
                      </div>

                      {Object.values(SOUND_PRESETS).map(function(preset){
                        var isActive = alertSettings.soundPreset === preset.id;
                        return (
                          <div key={preset.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px",background:isActive?C.gold+"12":C.layer2,border:"1px solid "+(isActive?C.gold+"55":C.line+"44"),borderRadius:10,marginBottom:8,cursor:"pointer"}} onClick={function(){updateAlertSettings({soundPreset:preset.id});}}>
                            <div style={{width:20,height:20,borderRadius:10,border:"2px solid "+(isActive?C.gold:C.line),background:isActive?C.gold:"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {isActive && <div style={{width:8,height:8,borderRadius:4,background:C.ink}}/>}
                            </div>
                            <div style={{flex:1,textAlign:"right"}}>
                              <div style={{fontSize:13,fontWeight:800,color:isActive?C.gold:C.snow,fontFamily:"Cairo,sans-serif",marginBottom:2}}>{preset.name}</div>
                              <div style={{fontSize:10,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>{preset.description}</div>
                            </div>
                            <button onClick={function(e){e.stopPropagation();playAlertSound(preset.id, alertSettings.volume);}} style={{width:36,height:36,borderRadius:10,background:C.electric+"22",border:"1px solid "+C.electric+"44",color:C.electric,fontSize:16,cursor:"pointer",flexShrink:0}}>▶</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 📱 الإشعارات */}
                  <div style={{background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",borderRadius:14,padding:16,border:"1px solid "+C.line}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                      <span style={{fontSize:20}}>📱</span>
                      <div style={{fontSize:14,fontWeight:900,color:C.snow,fontFamily:"Cairo,sans-serif"}}>الإشعارات</div>
                    </div>

                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",background:C.layer2,borderRadius:10,marginBottom:10,border:"1px solid "+C.line+"44"}}>
                      <div>
                        <div style={{fontSize:12,color:C.mist,fontWeight:700,fontFamily:"Cairo,sans-serif",marginBottom:3}}>Browser Notifications</div>
                        <div style={{fontSize:9,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>تنبيه حتى لو التطبيق مغلق</div>
                      </div>
                      <button onClick={function(){updateAlertSettings({browserNotifications:!alertSettings.browserNotifications});}} style={{width:48,height:26,borderRadius:13,background:alertSettings.browserNotifications?C.mint:C.line,border:"none",cursor:"pointer",position:"relative",transition:"all 0.3s",flexShrink:0}}>
                        <div style={{position:"absolute",top:3,right:alertSettings.browserNotifications?3:25,width:20,height:20,borderRadius:10,background:C.snow,transition:"all 0.3s",boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}/>
                      </button>
                    </div>

                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px",background:C.layer2,borderRadius:10,border:"1px solid "+C.line+"44"}}>
                      <div>
                        <div style={{fontSize:12,color:C.mist,fontWeight:700,fontFamily:"Cairo,sans-serif",marginBottom:3}}>الاهتزاز</div>
                        <div style={{fontSize:9,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>اهتزاز على الموبايل مع الصوت</div>
                      </div>
                      <button onClick={function(){updateAlertSettings({vibration:!alertSettings.vibration});}} style={{width:48,height:26,borderRadius:13,background:alertSettings.vibration?C.mint:C.line,border:"none",cursor:"pointer",position:"relative",transition:"all 0.3s",flexShrink:0}}>
                        <div style={{position:"absolute",top:3,right:alertSettings.vibration?3:25,width:20,height:20,borderRadius:10,background:C.snow,transition:"all 0.3s",boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}/>
                      </button>
                    </div>
                  </div>

                  {/* ℹ️ ملاحظة */}
                  <div style={{padding:"12px 14px",background:C.plasma+"10",border:"1px solid "+C.plasma+"33",borderRadius:10,marginTop:4}}>
                    <div style={{fontSize:10,color:C.plasma,fontWeight:800,marginBottom:5}}>ℹ️ ملاحظة</div>
                    <div style={{fontSize:10,color:C.mist,lineHeight:1.6,fontFamily:"Cairo,sans-serif"}}>
                      هذه الإعدادات تُطبّق على التنبيهات الذكية التلقائية فقط.
                      التنبيهات اليدوية لها إعدادات منفصلة.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
  const [commRate, setCommRate] = useState("0.155");
  var scenarios=[
    {label:"هبوط (Bear)",    pct:-15, color:C.coral},
    {label:"متحفظ",          pct:5,   color:C.teal},
    {label:"متوسط (Base)",   pct:10,  color:C.amber},
    {label:"متفائل (Bull)",  pct:20,  color:C.mint},
  ];
  var buy=parseFloat(buyP)||sym.p*0.95;
  var sell=parseFloat(sellP)||sym.p;
  var q=Math.max(1,parseInt(qty)||100);
  var gross=(sell-buy)*q;
  var rate=Math.max(0,parseFloat(commRate)||0.155)/100;
  var brok=Math.max((buy*q+sell*q)*rate,30);
  var net=gross-brok;
  var pct=((sell-buy)/buy)*100;
  var breakeven=((buy*q+brok)/q).toFixed(2);
  var netPct=buy*q>0?net/(buy*q):0;
  var calcTabs=[{k:"basic",l:"أساسي"},{k:"scenarios",l:"سيناريوهات"}];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.95)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto",paddingBottom:80,border:"1px solid "+C.line,boxShadow:"0 -24px 60px rgba(0,0,0,.6)"}}>
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
                {label:"نسبة العمولة %",   val:commRate, set:setCommRate, ph:"0.155"},
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
                    {l:"ROI % (صافي)",  v:(netPct>=0?"+":"")+(netPct*100).toFixed(2)+"%", c:netPct>=0?C.mint:C.coral,big:true},
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
                        <div className="num" style={{fontSize:15,fontWeight:900,color:sc.color}}>{profit>=0?"+":""}{profit.toFixed(0)} ر.س</div>
                        <div style={{fontSize:8,color:C.smoke,marginTop:2}}>{sc.label} · {sc.pct>=0?"+":""}{sc.pct}%</div>
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

  // جلب الأساسيات (cache أو API) + حساب mc/pe/divYld حياً
  var cmp = useCompareData(a.sym, b.sym, a.p, b.p);
  var aFull = Object.assign({}, a, cmp.extraA);
  var bFull = Object.assign({}, b, cmp.extraB);

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
    var av=aFull[ka], bv=bFull[ka];
    if(av==null||bv==null) return "tie";
    return (m.higher?(av>bv):(av<bv))?"a":(m.higher?(bv>av):(bv<av))?"b":"tie";
  }
  var aWins=0,bWins=0;
  for(var i=0;i<metrics.length;i++){
    var w=winner(metrics[i].ka);
    if(w==="a") aWins++;
    if(w==="b") bWins++;
  }
  // تنسيق القيم للعرض
  function fmtVal(ka, v){
    if(v==null) return "--";
    if(ka==="p") return v.toFixed(2);
    if(ka==="pct") return (v>=0?"+":"")+v.toFixed(2)+"%";
    if(ka==="pe") return v.toFixed(1)+"x";
    if(ka==="div") return v.toFixed(2)+"%";
    if(ka==="roe") return v.toFixed(1)+"%";
    if(ka==="mktCap") return v>=1000?(v/1000).toFixed(2)+"T":v.toFixed(1)+"B";
    return String(v);
  }
  var stockPairs=[{s:a,set:setA,col:C.electric,lbl:"السهم الأول"},{s:b,set:setB,col:C.gold,lbl:"السهم الثاني"}];
  var winRows=[{s:a,col:C.electric,wins:aWins},{s:b,col:C.gold,wins:bWins}];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.95)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto",paddingBottom:80,border:"1px solid "+C.line,boxShadow:"0 -24px 60px rgba(0,0,0,.6)"}}>
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
          {cmp.loading&&(
            <div style={{textAlign:"center",padding:"8px",fontSize:10,color:C.smoke}}>جارٍ جلب البيانات...</div>
          )}
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
            <RadarCompare a={aFull} b={bFull} metrics={metrics}/>
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
            var aVal=fmtVal(m.ka, aFull[m.ka]);
            var bVal=fmtVal(m.ka, bFull[m.ka]);
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
  var PRIORITY_ORDER={critical:0,high:1,medium:2,low:3};
  
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
  
  // Filter options for smart alerts
  var filterOpts=[
    {k:"all",     l:"الكل",       c:C.smoke},
    {k:"unread",  l:"غير مقروء",  c:C.electric},
    {k:"critical",l:"حرج",        c:C.coral},
    {k:"high",    l:"عاجل",       c:C.amber},
  ];
  
  var sTab=useState("smart"); var activeTab=sTab[0]; var setActiveTab=sTab[1];
  var sFilter=useState("all"); var activeFilter=sFilter[0]; var setActiveFilter=sFilter[1];
  var sShowSettings=useState(false); var showSettings=sShowSettings[0]; var setShowSettings=sShowSettings[1];
  var sShowForm=useState(false); var showForm=sShowForm[0]; var setShowForm=sShowForm[1];

  var sA=useState(function(){
    try{var r=window.localStorage.getItem("tadawul_alerts");return r?JSON.parse(r):[];}catch(e){return [];}
  }); var alerts=sA[0]; var setAlerts=sA[1];
  
  // Settings state
  var sSettings=useState(function(){
    try{
      var r=window.localStorage.getItem("tadawul_alert_settings");
      return r?JSON.parse(r):{browserNotifications:true,soundEnabled:true,vibration:true};
    }catch(e){return {browserNotifications:true,soundEnabled:true,vibration:true};}
  });
  var settings=sSettings[0]; var setSettings=sSettings[1];
  
  function updateSetting(key, value) {
    var newSettings=Object.assign({},settings);
    newSettings[key]=value;
    setSettings(newSettings);
    try{window.localStorage.setItem("tadawul_alert_settings",JSON.stringify(newSettings));}catch(e){}
  }
  
  useEffect(function(){
    try{window.localStorage.setItem("tadawul_alerts",JSON.stringify(alerts));}catch(e){}
  },[alerts]);
  
  // Auto-refresh every 5 seconds
  useEffect(function(){
    var t=setInterval(function(){
      try{
        var r=window.localStorage.getItem("tadawul_alerts");
        if(r){
          var fresh=JSON.parse(r);
          if(fresh.length!==alerts.length){
            setAlerts(fresh);
          }
        }
      }catch(e){}
    },5000);
    return function(){clearInterval(t);};
  },[alerts]);
  
  var sS=useState(STOCKS[0]); var sym=sS[0]; var setSym=sS[1];
  var sT=useState("above"); var type=sT[0]; var setType=sT[1];
  var sP2=useState(""); var price=sP2[0]; var setPrice=sP2[1];
    var sASrch=useState(null); var alertSearch=sASrch[0]; var setAlertSearch=sASrch[1];
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
    setShowForm(false);
  }
  
  // Time formatter
  function formatTime(timestamp){
    if(!timestamp) return '';
    var diff=Date.now()-timestamp;
    var mins=Math.floor(diff/60000);
    var hours=Math.floor(diff/3600000);
    var days=Math.floor(diff/86400000);
    if(mins<1) return 'الآن';
    if(mins<60) return 'قبل '+mins+' د';
    if(hours<24) return 'قبل '+hours+' س';
    if(days<7) return 'قبل '+days+' يوم';
    try{return new Date(timestamp).toLocaleDateString('ar-SA');}catch(e){return '';}
  }
  
  // Mark as read
  function markAsRead(id){
    setAlerts(function(prev){
      return prev.map(function(a){return a.id===id?Object.assign({},a,{read:true}):a;});
    });
  }
  
  // Mark all as read
  function markAllAsRead(){
    setAlerts(function(prev){
      return prev.map(function(a){return Object.assign({},a,{read:true});});
    });
  }
  
  // Clear all
  function clearAll(){
    if(window.confirm('هل أنت متأكد من حذف كل التنبيهات؟')){
      setAlerts([]);
    }
  }
  
  // Request notification permission
  function requestPermission(){
    if('Notification' in window){
      Notification.requestPermission().then(function(result){
        if(result==='granted'){
          updateSetting('browserNotifications',true);
        }
      });
    }
  }
  
  // Filter alerts
  var smartAlerts=alerts.filter(function(a){return a.smart===true;}).sort(function(a,b){
    return (b.timestamp||0)-(a.timestamp||0);
  });
  var manualAlerts=alerts.filter(function(a){return !a.smart;}).sort(function(a,b){
    return (PRIORITY_ORDER[a.priority]||1)-(PRIORITY_ORDER[b.priority]||1);
  });
  
  // Apply filter to smart alerts
  var filteredSmartAlerts=smartAlerts;
  if(activeFilter==='unread'){
    filteredSmartAlerts=smartAlerts.filter(function(a){return !a.read;});
  } else if(activeFilter==='critical'||activeFilter==='high'){
    filteredSmartAlerts=smartAlerts.filter(function(a){return a.priority===activeFilter;});
  }
  
  var sortedAlerts=activeTab==="smart"?filteredSmartAlerts:manualAlerts;
  
  // Stats
  var stats={
    total:alerts.length,
    unread:smartAlerts.filter(function(a){return !a.read;}).length,
    critical:smartAlerts.filter(function(a){return a.priority==='critical';}).length,
    high:smartAlerts.filter(function(a){return a.priority==='high';}).length,
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(6,8,15,.95)",zIndex:999,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div style={{background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",borderRadius:"20px 20px 0 0",height:"92vh",overflowY:"scroll",paddingBottom:"120px",border:"1px solid "+C.line,boxShadow:"0 -24px 60px rgba(0,0,0,.6)",WebkitOverflowScrolling:"touch",overscrollBehavior:"contain"}}>
        
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px",borderBottom:"1px solid "+C.line,position:"sticky",top:0,background:"linear-gradient(160deg,"+C.layer1+","+C.layer2+")",zIndex:10}}>
          <button onClick={function(){onClose();}} style={{background:C.layer3,border:"1px solid "+C.line,color:C.smoke,padding:"7px 14px",borderRadius:10,fontSize:12,cursor:"pointer"}}>
            <Ico k="back" color={C.smoke} size={14}/>
          </button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:C.gold,fontWeight:700,letterSpacing:"2px"}}>ALERT CENTER</div>
            <div style={{fontSize:15,fontWeight:800,color:C.snow}}>التنبيهات الذكية 🔔</div>
          </div>
          <button onClick={function(){setShowSettings(!showSettings);}} style={{background:showSettings?C.gold+"25":C.layer3,border:"1px solid "+(showSettings?C.gold+"44":C.line),color:showSettings?C.gold:C.smoke,padding:"7px 12px",borderRadius:10,fontSize:14,cursor:"pointer"}}>
            ⚙️
          </button>
        </div>

        {/* Stats Dashboard - 4 cards */}
        <div style={{display:"flex",gap:8,padding:"12px 14px"}}>
          <div style={{flex:1,background:C.layer3,padding:"10px 8px",borderRadius:10,textAlign:"center",border:"1px solid "+C.line}}>
            <div style={{fontSize:18,fontWeight:900,color:C.snow,fontFamily:"IBM Plex Mono,monospace"}}>{stats.total}</div>
            <div style={{fontSize:9,color:C.smoke,marginTop:2}}>الإجمالي</div>
          </div>
          <div style={{flex:1,background:C.electric+"15",padding:"10px 8px",borderRadius:10,textAlign:"center",border:"1px solid "+C.electric+"33"}}>
            <div style={{fontSize:18,fontWeight:900,color:C.electric,fontFamily:"IBM Plex Mono,monospace"}}>{stats.unread}</div>
            <div style={{fontSize:9,color:C.smoke,marginTop:2}}>غير مقروء</div>
          </div>
          <div style={{flex:1,background:C.coral+"15",padding:"10px 8px",borderRadius:10,textAlign:"center",border:"1px solid "+C.coral+"33"}}>
            <div style={{fontSize:18,fontWeight:900,color:C.coral,fontFamily:"IBM Plex Mono,monospace"}}>{stats.critical}</div>
            <div style={{fontSize:9,color:C.smoke,marginTop:2}}>حرج</div>
          </div>
          <div style={{flex:1,background:C.amber+"15",padding:"10px 8px",borderRadius:10,textAlign:"center",border:"1px solid "+C.amber+"33"}}>
            <div style={{fontSize:18,fontWeight:900,color:C.amber,fontFamily:"IBM Plex Mono,monospace"}}>{stats.high}</div>
            <div style={{fontSize:9,color:C.smoke,marginTop:2}}>عاجل</div>
          </div>
        </div>

        {/* Settings Panel - collapsible */}
        {showSettings&&(
          <div style={{margin:"0 14px 12px",padding:14,background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:12,border:"1px solid "+C.gold+"33"}}>
            <div style={{fontSize:11,fontWeight:800,color:C.gold,marginBottom:10,letterSpacing:"1px"}}>⚙️ الإعدادات</div>
            
            {/* Browser Notifications */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:C.layer3,borderRadius:8,marginBottom:6}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.snow,marginBottom:1}}>إشعارات المتصفح</div>
                <div style={{fontSize:9,color:C.smoke}}>تنبيهات حتى لو التطبيق مغلق</div>
              </div>
              <button onClick={settings.browserNotifications?function(){updateSetting('browserNotifications',false);}:requestPermission}
                style={{width:42,height:24,borderRadius:12,background:settings.browserNotifications?C.mint+"44":C.line,border:"1px solid "+(settings.browserNotifications?C.mint:C.smoke),cursor:"pointer",position:"relative"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:settings.browserNotifications?C.mint:C.smoke,position:"absolute",top:2,right:settings.browserNotifications?2:20,transition:"all 0.2s"}}/>
              </button>
            </div>
            
            {/* Sound */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:C.layer3,borderRadius:8,marginBottom:6}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.snow,marginBottom:1}}>الصوت</div>
                <div style={{fontSize:9,color:C.smoke}}>تشغيل صوت عند التنبيه</div>
              </div>
              <button onClick={function(){updateSetting('soundEnabled',!settings.soundEnabled);}}
                style={{width:42,height:24,borderRadius:12,background:settings.soundEnabled?C.mint+"44":C.line,border:"1px solid "+(settings.soundEnabled?C.mint:C.smoke),cursor:"pointer",position:"relative"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:settings.soundEnabled?C.mint:C.smoke,position:"absolute",top:2,right:settings.soundEnabled?2:20,transition:"all 0.2s"}}/>
              </button>
            </div>
            
            {/* Vibration */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:C.layer3,borderRadius:8}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.snow,marginBottom:1}}>الاهتزاز</div>
                <div style={{fontSize:9,color:C.smoke}}>اهتزاز الهاتف عند التنبيه</div>
              </div>
              <button onClick={function(){updateSetting('vibration',!settings.vibration);}}
                style={{width:42,height:24,borderRadius:12,background:settings.vibration?C.mint+"44":C.line,border:"1px solid "+(settings.vibration?C.mint:C.smoke),cursor:"pointer",position:"relative"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:settings.vibration?C.mint:C.smoke,position:"absolute",top:2,right:settings.vibration?2:20,transition:"all 0.2s"}}/>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:"flex",gap:8,padding:"0 14px 0",borderBottom:"1px solid "+C.line+"44"}}>
          <button onClick={function(){setActiveTab("smart");setActiveFilter("all");}}
            style={{flex:1,padding:"10px",background:activeTab==="smart"?"linear-gradient(135deg,"+C.gold+"22,"+C.gold+"08)":"transparent",border:"1px solid "+(activeTab==="smart"?C.gold+"55":C.line+"44"),borderRadius:10,color:activeTab==="smart"?C.gold:C.smoke,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Cairo,sans-serif",position:"relative",transition:"all 0.2s"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:14}}>✨</span>
              الذكية
            </span>
            {smartAlerts.length>0&&(
              <span style={{position:"absolute",top:6,right:8,background:C.gold+"33",color:C.gold,fontSize:9,padding:"1px 6px",borderRadius:6,fontWeight:800}}>{smartAlerts.length}</span>
            )}
          </button>
          
          <button onClick={function(){setActiveTab("manual");setActiveFilter("all");}}
            style={{flex:1,padding:"10px",background:activeTab==="manual"?"linear-gradient(135deg,"+C.electric+"22,"+C.electric+"08)":"transparent",border:"1px solid "+(activeTab==="manual"?C.electric+"55":C.line+"44"),borderRadius:10,color:activeTab==="manual"?C.electric:C.smoke,fontSize:12,fontWeight:800,cursor:"pointer",fontFamily:"Cairo,sans-serif",position:"relative",transition:"all 0.2s"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <Ico k="bell" color={activeTab==="manual"?C.electric:C.smoke} size={13}/>
              يدوية

            </span>
            {manualAlerts.length>0&&(
              <span style={{position:"absolute",top:6,right:8,background:C.electric+"33",color:C.electric,fontSize:9,padding:"1px 6px",borderRadius:6,fontWeight:800}}>{manualAlerts.length}</span>
            )}
          </button>
        </div>

        {/* Filters - only for smart tab */}
        {activeTab==="smart"&&smartAlerts.length>0&&(
          <div style={{display:"flex",gap:6,padding:"10px 14px",overflowX:"auto"}}>
            {filterOpts.map(function(f){return(
              <button key={f.k} onClick={function(){setActiveFilter(f.k);}}
                style={{padding:"6px 12px",background:activeFilter===f.k?f.c+"25":"transparent",border:"1px solid "+(activeFilter===f.k?f.c+"55":C.line),borderRadius:8,cursor:"pointer",fontSize:10,fontWeight:700,color:activeFilter===f.k?f.c:C.smoke,fontFamily:"Cairo,sans-serif",whiteSpace:"nowrap",flexShrink:0}}>
                {f.l}
              </button>
            );})}
          </div>
        )}

        {/* Action bar - only for smart with alerts */}
        {activeTab==="smart"&&smartAlerts.length>0&&(
          <div style={{padding:"0 14px 10px",display:"flex",gap:8}}>
            <button onClick={markAllAsRead}
              style={{flex:1,padding:"7px",background:"rgba(255,255,255,.04)",border:"1px solid "+C.line,borderRadius:8,cursor:"pointer",fontSize:10,fontWeight:700,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
              ✓ علامة الكل كمقروء
            </button>
            <button onClick={clearAll}
              style={{flex:1,padding:"7px",background:C.coral+"15",border:"1px solid "+C.coral+"33",borderRadius:8,cursor:"pointer",fontSize:10,fontWeight:700,color:C.coral,fontFamily:"Cairo,sans-serif"}}>
              🗑️ مسح الكل
            </button>
          </div>
        )}

        {/* Add manual alert form - only for manual tab */}
        {activeTab==="manual"&&(
          <div style={{padding:"0 14px 12px"}}>
            <button onClick={function(){setShowForm(!showForm);}}
              style={{width:"100%",background:showForm?C.electric+"22":"linear-gradient(135deg,"+C.electric+","+C.electric+"cc)",color:showForm?C.electric:C.snow,border:showForm?"1px solid "+C.electric+"55":"none",padding:"12px",borderRadius:11,fontSize:13,cursor:"pointer",fontWeight:800,fontFamily:"Cairo,sans-serif"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                <Ico k="plus" color={showForm?C.electric:C.snow} size={14}/>
                {showForm?"إخفاء النموذج":"إضافة تنبيه يدوي"}
              </span>
            </button>
          </div>
        )}

        {/* Manual alert form */}
        {activeTab==="manual"&&showForm&&(
          <div style={{margin:"0 14px 12px",background:C.layer3,borderRadius:14,padding:14,border:"1px solid "+C.line}}>
            <div style={{fontSize:10,color:C.smoke,marginBottom:8,textAlign:"right",fontWeight:700}}>السهم</div>
            <div style={{position:"relative",marginBottom:10}}>
              <input
              <input
                value={alertSearch!==null ? alertSearch : (sym.name+" "+sym.p+" ر.س")}
                onChange={function(e){setAlertSearch(e.target.value);}}
                onFocus={function(){setAlertSearch("");}}
                placeholder="ابحث باسم السهم أو رقمه..."
                style={{width:"100%",background:C.layer2,border:"1px solid "+C.gold+"55",borderRadius:9,padding:"9px 12px",color:C.snow,fontSize:12,direction:"rtl",outline:"none",boxSizing:"border-box"}}
              />
              {price.startsWith("search:") && (function(){
                var q=price.slice(7).trim();
                var results=q.length>0?STOCKS.filter(function(s){return s.sym.indexOf(q)>=0||s.name.indexOf(q)>=0;}).slice(0,6):STOCKS.slice(0,6);
                return(
                  <div style={{position:"absolute",top:"110%",left:0,right:0,background:C.layer2,border:"1px solid "+C.line,borderRadius:10,zIndex:50,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,.5)",maxHeight:200,overflowY:"auto"}}>
                    {results.map(function(s){return(
                      <div key={s.sym} onClick={function(){setSym(s);setPrice("");}}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid "+C.line+"44",cursor:"pointer",background:sym.sym===s.sym?C.gold+"11":"transparent"}}>
                        <div style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:C.smoke}}>{s.sym}</div>
                        <div style={{fontSize:12,color:C.snow}}>{s.name}</div>
                        <div style={{fontSize:11,color:C.gold}}>{s.p} ر.س</div>
                      </div>
                    );})}
                  </div>
                );
              })()}
            </div>
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
              style={{width:"100%",background:"linear-gradient(135deg,"+C.mint+","+C.mint+"cc)",color:C.snow,border:"none",padding:"12px",borderRadius:11,fontSize:13,cursor:"pointer",fontWeight:800,fontFamily:"Cairo,sans-serif"}}>
              <span style={{display:"inline-flex",alignItems:"center",gap:6}}>
                ✓ تأكيد الإضافة
              </span>
            </button>
          </div>
        )}

        {/* Alerts list */}
        <div style={{padding:"0 14px",display:"flex",flexDirection:"column",gap:10}}>
          {sortedAlerts.length===0&&(
            <div style={{textAlign:"center",padding:"40px 20px",color:C.smoke}}>
              <div style={{marginBottom:12,display:"flex",justifyContent:"center"}}>
                {activeTab==="smart"?<span style={{fontSize:50}}>✨</span>:<Ico k="bell" color={C.electric+"55"} size={50}/>}
              </div>
              <div style={{fontSize:14,fontWeight:800,color:C.mist,marginBottom:6,fontFamily:"Cairo,sans-serif"}}>
                {activeTab==="smart"?(activeFilter==="all"?"لا توجد تنبيهات ذكية":"لا توجد تنبيهات في هذا الفلتر"):"لا توجد تنبيهات"}
              </div>
              {activeTab==="smart"&&activeFilter==="all"&&(
                <div style={{fontSize:11,color:C.smoke,marginTop:8,lineHeight:1.6,fontFamily:"Cairo,sans-serif"}}>
                  المحرك يراقب الأسهم تلقائياً<br/>
                  سيخبرك عند أي فرصة أو مخاطرة
                </div>
              )}
            </div>
          )}
          
          {sortedAlerts.map(function(al){
            // Smart alerts
            if(al.smart){
              return(
                <div key={al.id} onClick={function(){if(!al.read)markAsRead(al.id);}}
                  style={{
                    background:al.read?"linear-gradient(135deg,"+C.layer1+","+C.layer2+")":"linear-gradient(135deg,"+al.color+"18,"+al.color+"08)",
                    borderRadius:14,
                    padding:"14px 16px",
                    border:"1px solid "+(al.read?C.line:al.color+"44"),
                    position:"relative",
                    cursor:"pointer",
                    boxShadow:al.read?"none":"0 4px 16px "+al.color+"22",
                  }}>
                  
                  {/* Unread indicator */}
                  {!al.read&&(
                    <div style={{position:"absolute",top:12,left:12,width:8,height:8,borderRadius:"50%",background:al.color,boxShadow:"0 0 8px "+al.color}}/>
                  )}
                  
                  <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                    <div style={{width:40,height:40,borderRadius:10,background:al.color+"22",border:"1px solid "+al.color+"55",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                      {al.icon}
                    </div>
                    <div style={{flex:1,textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:900,color:al.color,fontFamily:"Cairo,sans-serif",marginBottom:3}}>
                        {al.title}
                      </div>
                      <div style={{fontSize:11,color:C.snow,fontWeight:700}}>
                        {al.name} <span style={{color:C.smoke,fontSize:9,marginRight:4}}>({al.sym})</span>
                      </div>
                    </div>
                    <button onClick={function(e){e.stopPropagation();setAlerts(function(p){return p.filter(function(x){return x.id!==al.id;});});}}
                      style={{background:"transparent",border:"none",color:C.smoke,cursor:"pointer",padding:4,fontSize:14}}>
                      ✕
                    </button>
                  </div>
                  
                  <div style={{background:C.layer2+"88",padding:"8px 10px",borderRadius:8,marginBottom:8}}>
                    <div style={{fontSize:12,color:C.mist,fontWeight:700,marginBottom:3,fontFamily:"Cairo,sans-serif"}}>
                      {al.message}
                    </div>
                    <div style={{fontSize:10,color:C.smoke,lineHeight:1.5,fontFamily:"Cairo,sans-serif"}}>
                      {al.detail}
                    </div>
                  </div>
                  
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:9,color:al.color,background:al.color+"15",padding:"3px 8px",borderRadius:6,fontWeight:700,border:"1px solid "+al.color+"33"}}>
                      {al.label}
                    </div>
                    <div style={{fontSize:9,color:C.smoke}}>
                      {formatTime(al.timestamp)}
                    </div>
                  </div>
                </div>
              );
            }
            
            // Manual alerts
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
  var nav=useNav();
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
            <div key={w.sym} onClick={function(e){if(e.target.closest("button"))return;nav.openStock(stock,"more");}} className={"card-enter "+(isPos?"buy-glow":"danger-pulse")} style={{background:BOX,borderRadius:16,padding:"14px 16px",border:"1px solid "+(isPos?C.mint:C.coral)+"22",boxShadow:SHD,position:"relative",overflow:"hidden",cursor:"pointer"}}>
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
