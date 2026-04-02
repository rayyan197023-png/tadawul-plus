'use client';
/**
 * @module screens/MoreScreen
 * @description شاشة المزيد — بعد إعادة الهيكلة
 *
 * التبويبات مستخرجة إلى:
 * - more/MarketTabs.jsx  → ترتيب + سلع
 * - more/FinanceTabs.jsx → توزيعات + اكتتابات + صناديق + تقويم + كلي
 * - more/ToolsTabs.jsx   → لقطات + إعدادات + حاسبة + مقارنة + تنبيهات + متابعة
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'';
import { STOCKS } from '../constants/stocksData';
import { useSharedPrices } from '../store';
import { useHaptic } from '../hooks/useHaptic';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

// ── Shared constants + UI
import { C, Ico, COMM, PRIORITY_ORDER } from './more/MoreShared';

// ── تبويبات السوق
import { RankingsTab, CommoditiesTab } from './more/MarketTabs';

// ── تبويبات مالية
import { DividendsTab, IposTab, FundsTab, CalendarTab, MacroTab } from './more/FinanceTabs';

// ── تبويبات الأدوات
import { SnapshotsTab, SettingsTab, ProfitCalc, CompareView, AlertsPanel, WatchlistTab } from './more/ToolsTabs';

export default function MoreScreen({
  const liveStocks = useSharedPrices(); // أسعار مشتركة محدَّثة snapshots: extSnaps, setSnapshots: setExtSnaps, watchlist: extWatchlist, setWatchlist: setExtWatchlist } = {}) {

  // ── UX hooks ──────────────────────────────────────────────────
  const haptic  = useHaptic();
  const scrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleRefresh = useCallback(async () => {
    haptic.success();
    await new Promise(r => setTimeout(r, 800));
  }, [haptic]);

  const {
    containerRef: pullRef, isPulling, pullProgress, isRefreshing, touchHandlers,
  } = usePullToRefresh(handleRefresh, 60);

  const handleScroll = useCallback((e) => {
    setShowScrollTop(e.target.scrollTop > 400);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top:0, behavior:'smooth' });
    haptic.tap();
  }, [haptic]);

  // ── states ──
  const [sub, setSub] = useState("");
  var sFL=useState(null); var flashCard=sFL[0]; var setFlashCard=sFL[1];
  var sWL=useState(function(){
    try{var r=window.localStorage.getItem("tadawul_watchlist");return r?JSON.parse(r):WATCHLIST_DEFAULT;}catch(e){return WATCHLIST_DEFAULT;}
  }); var _localWL=sWL[0];
  var _setLocalWL=function(updater){
    sWL[1](function(prev){
      var next=typeof updater==="function"?updater(prev):updater;
      try{window.localStorage.setItem("tadawul_watchlist",JSON.stringify(next));}catch(e){}
      return next;
    });
  };
  // ── استخدام watchlist من AppShell إذا متاحة، وإلا من localStorage ──
  var watchlist = extWatchlist !== undefined ? extWatchlist : _localWL;
  var setWatchlist = extWatchlist !== undefined
    ? function(updater) {
        if (setExtWatchlist) setExtWatchlist(updater);
        _setLocalWL(updater); // نحافظ على localStorage دائماً
      }
    : _setLocalWL;
  var sMF=useState("all"); var macroFilter=sMF[0]; var setMacroFilter=sMF[1];
  var sC=useState(false); var showCalc=sC[0]; var setShowCalc=sC[1];
  var sCo=useState(false); var showCompare=sCo[0]; var setShowCompare=sCo[1];
  var sAl=useState(false); var showAlerts=sAl[0]; var setShowAlerts=sAl[1];
  const [divItem, setDivItem] = useState(null);
  const [divShares, setDivShares] = useState("100");
  const [divCost, setDivCost] = useState("");
  const [rankIdx, setRankIdx] = useState(0);
  const [rankSec, setRankSec] = useState("الكل");
  const [commCat, setCommCat] = useState("الكل");
  const [fundTab, setFundTab] = useState("all");
  const [ipoF, setIpoF] = useState("all");
  const [calF, setCalF] = useState("all");
  const [homeConf, setHomeConf] = useState({showOpportunity:true,showTopMovers:true,showSectorChart:true,showAdvanced:false});
  const [snaps, setSnaps] = useState([
    {id:1,sym:"2222",name:"أرامكو",  date:"2026-03-20 14:32",note:"اختراق مقاومة 28.5",color:C.mint, tag:"تحليل فني",snapPrice:27.80,rsi:42,macd:"هبوطي",vol:"12.4M",spark:[26.2,26.8,27.1,27.4,27.8,28.1,27.9,28.3,27.8,27.5,27.2,27.8]},
    {id:2,sym:"1120",name:"الراجحي",date:"2026-03-18 09:15",note:"نمط رأس وكتفين",    color:C.coral,tag:"نمط",      snapPrice:93.10,rsi:38,macd:"هبوطي",vol:"4.1M",spark:[95.2,96.1,97.3,96.8,95.4,94.1,93.8,94.5,93.2,92.8,93.1,93.1]},
    {id:3,sym:"2010",name:"سابك",    date:"2026-03-15 11:48",note:"تقاطع المتوسطات",   color:C.amber,tag:"مؤشر",     snapPrice:67.50,rsi:55,macd:"صعودي",vol:"1.8M",spark:[64.2,64.8,65.3,65.9,66.4,66.8,67.1,67.5,68.0,68.3,67.8,67.5]},
  ]);
  // ── ربط اللقطات القادمة من AppShell (iframe postMessage) ──
  useEffect(function() {
    if (!extSnaps || extSnaps.length === 0) return;
    setSnaps(function(prev) {
      var existIds = new Set(prev.map(function(s) { return s.id; }));
      var newOnes = extSnaps.filter(function(s) { return !existIds.has(s.id); });
      if (newOnes.length === 0) return prev;
      return newOnes.concat(prev).slice(0, 20);
    });
  }, [extSnaps]);
  const [editSnap, setEditSnap] = useState(null);
  const [snapTag, setSnapTag] = useState("الكل");
  const [fontSize, setFontSize] = useState("medium");
  var fontScale={small:0.9,medium:1,large:1.12};
  const [_localCommData, _setLocalCommData] = useState(COMM);
  // ── استخدام commData من AppShell إذا متاحة (أسعار حية) ──
  var commData = extCommData !== undefined ? extCommData : _localCommData;
  var setCommData = extCommData !== undefined
    ? function(updater) {
        if (setExtCommData) setExtCommData(updater);
        _setLocalCommData(updater);
      }
    : _setLocalCommData;
  const [liveTime, setLiveTime] = useState(new Date());
  const [commLastUpdate, setCommLastUpdate] = useState(new Date());
  const [commLU, setCommLU] = useState(new Date());
  const [commLoading, setCommLoading] = useState(false);
  const [notifSound, setNotifSound] = useState(true);
  const [rankTick, setRankTick] = useState(0);
  const [stocksLive, setStocksLive] = useState(liveStocks.map(function(s){return Object.assign({},s);}));

  // ── effects ──
  useEffect(function(){var el=document.createElement("style");el.textContent=CSS_STR;document.head.appendChild(el);return function(){document.head.removeChild(el);};},[]);
  // Auto-navigate to snapshots tab when new snapshot arrives from AppShell
  useEffect(function(){
    if (extSnaps && extSnaps.length > 0) {
      setSub("snapshots");
    }
  }, [extSnaps]);

  useEffect(function(){
    var t=setInterval(function(){setLiveTime(new Date());},1000);
    return function(){clearInterval(t);};
  },[]);



  useEffect(function(){
    var t=setInterval(function(){
      setRankTick(function(n){return n+1;});
      // Sync commData simulation (merged from 8s tick)
      setCommLU(new Date());
      setCommLastUpdate(new Date());
      if(!extCommData) { // only simulate if no live data from AppShell
        setCommData(function(prev){return prev.map(function(c){
          var v2=c.price*0.0012, delta=(Math.random()-0.5)*2*v2;
          var np=Math.max(c.lo52*0.95,parseFloat((c.price+delta).toFixed(c.price>1000?0:2)));
          return Object.assign({},c,{price:np,ch:parseFloat((np-c.open).toFixed(2)),
            pct:parseFloat(((np-c.open)/c.open*100).toFixed(2)),
            history:c.history.slice(-9).concat([np])});
        });});
      }
      // Sync stocksLive with priceCache from central store
      setStocksLive(function(prev){return prev.map(function(s){
        var d2=(Math.random()-0.49)*s.p*0.003;
        var np=parseFloat((s.p+d2).toFixed(2));
        var orig=STOCKS.filter(function(x){return x.sym===s.sym;})[0];
        var npct=parseFloat(((np-(orig?orig.p:np))/(orig?orig.p:np)*100).toFixed(2));
        return Object.assign({},s,{p:np,pct:npct,spark:s.spark.slice(-9).concat([np])});
      });});
    },5000);
    return function(){clearInterval(t);};
  },[]);

  // ── Yahoo Finance API — الأسواق العالمية ──────────────────────────
  var APIFY_TOKEN="apify_api_MsJ3LPDywCAcB0hTcAY6itez6Y72ku2nXDs2";
  var YAHOO_TICKERS=["BZ=F","CL=F","GC=F","SI=F","^GSPC","^DJI","^IXIC","DX-Y.NYB"];
  var TICKER_MAP={
    "BZ=F":   {sym:"خام برنت",  cat:"نفط",     color:"#f97316"},
    "CL=F":   {sym:"خام WTI",   cat:"نفط",     color:"#fb923c"},
    "GC=F":   {sym:"الذهب",     cat:"معادن",   color:"#f0c050"},
    "SI=F":   {sym:"الفضة",     cat:"معادن",   color:"#94a3b8"},
    "^GSPC":  {sym:"S&P 500",   cat:"مؤشرات",  color:"#4d9fff"},
    "^DJI":   {sym:"داو جونز",  cat:"مؤشرات",  color:"#818cf8"},
    "^IXIC":  {sym:"ناسداك",    cat:"مؤشرات",  color:"#a78bfa"},
    "DX-Y.NYB":{sym:"الدولار", cat:"عملات",   color:"#34d399"},
  };

  function fetchYahooData(){
    setCommLoading(true);
    // Twelve Data API
    var TD_KEY=(typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_TWELVE_KEY) || '';
    var symbols=["BZ:CUR","USOIL","XAU/USD","XAG/USD","SPX","DJI","IXIC","DXY"];
    var commSyms=["خام برنت","خام WTI","الذهب","الفضة","S&P 500","داو جونز","ناسداك","الدولار"];
    if(!TD_KEY){setCommLoading(false);return;}
    var requests=symbols.map(function(sym){
      return fetch("https://api.twelvedata.com/price?symbol="+encodeURIComponent(sym)+"&apikey="+TD_KEY)
        .then(function(r){return r.json();})
        .catch(function(){return null;});
    });
    Promise.all(requests).then(function(results){
      setCommData(function(prev){
        return prev.map(function(c){
          var idx2=commSyms.indexOf(c.sym);
          if(idx2<0) return c;
          var res=results[idx2];
          if(!res||!res.price) return c;
          var price=parseFloat(parseFloat(res.price).toFixed(2));
          if(isNaN(price)||price<=0) return c;
          var ch=parseFloat((price-c.open).toFixed(2));
          var pct=c.open>0?parseFloat(((ch/c.open)*100).toFixed(2)):c.pct;
          return Object.assign({},c,{
            price:price, ch:ch, pct:pct,
            history:c.history.slice(-6).concat([price]),
          });
        });
      });
      setCommLastUpdate(new Date());
      setCommLU(new Date());
    })
    .catch(function(e){
})
    .finally(function(){setCommLoading(false);});
  }

  useEffect(function(){
    fetchYahooData();
    var t=setInterval(fetchYahooData, 10*60*1000);
    return function(){clearInterval(t);};
  },[]);



  // ── Push Notifications (Browser API) ────────────────────────────────
  useEffect(function(){
    if('Notification' in window && Notification.permission === 'default'){
      Notification.requestPermission();
    }
  },[]);

  function sendPushNotif(title, body, icon) {
    if('Notification' in window && Notification.permission === 'granted'){
      try {
        new Notification(title, {
          body: body,
          icon: icon || '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'tadawul-alert',
          renotify: true,
          dir: 'rtl',
          lang: 'ar',
        });
      } catch(e) {}
    }
  }

// ── فحص التنبيهات السعرية ─────────────────────────────────────────
  useEffect(function(){
    try{
      var stored=window.localStorage.getItem("tadawul_alerts");
      var als=stored?JSON.parse(stored):[];
      if(!als||als.length===0) return;
      var triggered=false;
      var updated=als.map(function(al){
        if(!al.active||al.triggered) return al;
        var stock=stocksLive.filter(function(s){return s.sym===al.sym;})[0];
        if(!stock) return al;
        var hit=(al.type==="above"&&stock.p>=al.price)||(al.type==="below"&&stock.p<=al.price);
        if(!hit) return al;
        triggered=true;
        try{
          var pushTitle="⚡ تنبيه تداول+ — "+al.sym;
          var pushBody=(al.type==='above'?"تجاوز السعر المستهدف":"وصل تحت السعر المستهدف")+": "+(al.targetPrice||"")+" ر.س";
          sendPushNotif(pushTitle, pushBody);
        }catch(e){}
        return Object.assign({},al,{triggered:true,active:false});
      });
      if(triggered){
        window.localStorage.setItem("tadawul_alerts",JSON.stringify(updated));
        if(notifSound){
          try{
            var ctx=new (window.AudioContext||window.webkitAudioContext)();
            var osc=ctx.createOscillator();
            var gain=ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880,ctx.currentTime);
            osc.frequency.setValueAtTime(660,ctx.currentTime+0.15);
            osc.frequency.setValueAtTime(880,ctx.currentTime+0.3);
            gain.gain.setValueAtTime(0.4,ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime+0.5);
          }catch(e){}
        }
      }
    }catch(e){}
  },[stocksLive]);

  // ── computed ──
  var secList=["الكل"];
  stocksLive.forEach(function(s){if(secList.indexOf(s.sec)===-1)secList.push(s.sec);});
  var rField=RANKINGS[rankIdx];
  var rankBase = useMemo(function(){
    return stocksLive.filter(function(s){return rankSec==="الكل"||s.sec===rankSec;}).map(function(s){
      return Object.assign({},s,{vol:s.vol||s.v||0});
    });
  },[stocksLive, rankSec]);
  var rankFiltered = useMemo(function(){
    return rField.dir===-1&&rField.field==="pct"?rankBase.filter(function(s){return s.pct<0;}):
           rField.dir===1&&rField.field==="pct"?rankBase.filter(function(s){return s.pct>0;}):rankBase;
  },[rankBase, rField]);
  var rankItems = useMemo(function(){
    return rankFiltered.slice().sort(function(a,b){return rField.dir*(b[rField.field]-a[rField.field]);}).slice(0,10);
  },[rankFiltered, rField]);
  var catList=["الكل"];
  commData.forEach(function(c){if(catList.indexOf(c.cat)===-1)catList.push(c.cat);});
  var commF=commCat==="الكل"?commData:commData.filter(function(c){return c.cat===commCat;});
  var fundsF=fundTab==="all"?FUNDS:fundTab==="top"?FUNDS.slice().sort(function(a,b){return b.ret1y-a.ret1y;}).slice(0,3):FUNDS.filter(function(f){return f.type==="إسلامي";});
  var iposF=ipoF==="all"?IPOS:ipoF==="open"?IPOS.filter(function(x){return x.open;}):IPOS.filter(function(x){return !x.open;});
  var eventsF=calF==="all"?EVENTS:calF==="high"?EVENTS.filter(function(e){return e.imp===3;}):EVENTS.filter(function(e){return e.sym!==null;});

  function cfmt(v) {
    return(v>=1000?v.toLocaleString("en",{maximumFractionDigits:0}):v.toFixed(2))+" ر.س";
  }

  var commAgo=Math.floor((liveTime-commLU)/1000);
  var commAgoStr=commAgo<60?"منذ "+commAgo+"ث":"منذ "+Math.floor(commAgo/60)+"د";
  var fmtT=liveTime.getHours().toString().padStart(2,"0")+":"+liveTime.getMinutes().toString().padStart(2,"0")+":"+liveTime.getSeconds().toString().padStart(2,"0");

  // card styles
  var BOX = "linear-gradient(135deg,"+C.layer1+" 0%,"+C.layer2+" 100%)";
  var SHD = "0 4px 20px rgba(0,0,0,.3), inset 0 1px 0 "+C.layer3;
  var SHD_ACTIVE = "0 16px 48px rgba(0,0,0,.5), inset 0 1px 0 ";

  var MENU=[
    {id:"watchlist",  label:"الأسهم المتابعة",    color:C.gold,    icoK:"fire",    sub:"محفظتي · تنبيهات · متابعة"},
    {id:"rankings",   label:"قوائم التصنيف",   color:C.amber,   icoK:"medal",   sub:"أفضل الأسهم · مباشر"},
    {id:"commodities",label:"الأسواق العالمية", color:C.gold,    icoK:"globe",   sub:"نفط · معادن · مؤشرات"},
    {id:"macro",      label:"الاقتصاد الكلي",     color:"#22d3ee", icoK:"globe",   sub:"GDP · تضخم · فائدة · PMI"},
    {id:"ipos",       label:"الاكتتابات",        color:C.electric,icoK:"rocket",  sub:"مفتوح · قريباً · مكتمل"},
    {id:"calendar",   label:"التقويم المالي",    color:C.teal,    icoK:"calendar",sub:"أرباح · توزيعات · اجتماعات"},
    {id:"dividends",  label:"التوزيعات",         color:C.mint,    icoK:"coins",   sub:"استحقاقات · DRIP · YoC"},
    {id:"compare",    label:"مقارنة سهمين",      color:"#f97316", icoK:"scale",   sub:"رادار · جدول · مقاييس"},

    {id:"profitcalc", label:"حاسبة الربح",       color:C.mint,    icoK:"calc",    sub:"ROI · نقطة التعادل · سيناريوهات"},
    {id:"funds",      label:"الصناديق",          color:C.plasma,  icoK:"invest",  sub:"تصنيف · ألفا · شارب"},
  ];

  var subItem=MENU.filter(function(m){return m.id===sub;})[0];
  var subColor=subItem?subItem.color:C.gold;
  var subLabel=subItem?subItem.label:"";

  function handle(id) {
    if(id==="profitcalc"){setShowCalc(true);return;}
    if(id==="compare"){setShowCompare(true);return;}
    if(id==="alerts"){setShowAlerts(true);return;}
    setSub(id);
  }

  var tabProps={
    sub:sub, setSub:setSub, stocksLive:stocksLive,
    rankIdx:rankIdx, setRankIdx:setRankIdx,
    rankSec:rankSec, setRankSec:setRankSec,
    commData:commData, commCat:commCat, setCommCat:setCommCat,
    commLastUpdate:commLastUpdate, commLoading:commLoading, fetchYahoo:fetchYahooData,
    fundTab:fundTab, setFundTab:setFundTab,
    ipoF:ipoF, setIpoF:setIpoF,
    calF:calF, setCalF:setCalF,
    divItem:divItem, setDivItem:setDivItem,
    divShares:divShares, setDivShares:setDivShares,
    divCost:divCost, setDivCost:setDivCost,
    snaps:snaps, setSnaps:setSnaps,
    editSnap:editSnap, setEditSnap:setEditSnap,
    snapTag:snapTag, setSnapTag:setSnapTag,
    fontSize:fontSize, setFontSize:setFontSize,
    notifSound:notifSound, setNotifSound:setNotifSound,
    homeConf:homeConf, setHomeConf:setHomeConf,
    rField:rField, rankItems:rankItems, secList:secList,
    commF:commF, catList:catList,
    fundsF:fundsF, iposF:iposF, eventsF:eventsF,
    cfmt:cfmt, commAgoStr:commAgoStr, fmtT:fmtT,
    BOX:BOX, SHD:SHD, SHD_ACTIVE:SHD_ACTIVE,
    liveTime:liveTime, rankTick:rankTick,
    watchlist:watchlist, setWatchlist:setWatchlist,
    macroFilter:macroFilter, setMacroFilter:setMacroFilter,
  };
  return(
    <div className="root-wrap">
      
      <div className="hdr">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          {!sub?(
            <div>
              <div style={{fontSize:10,color:C.gold,fontWeight:700,letterSpacing:"3px",marginBottom:3}}>TADAWUL+</div>
              <div className="glow-white" style={{fontSize:20,fontWeight:900,color:C.snow,lineHeight:1.1,letterSpacing:"-0.5px"}}>
                الأدوات{" "}
                <span style={{background:"linear-gradient(90deg,"+C.gold+","+C.goldL+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>والتحليلات</span>
              </div>
              
              <div className="live-bar">
                <div style={{width:3,height:4, borderRadius:2,background:C.mint,opacity:rankTick%5===0?1:0.2}}/>
                <div style={{width:3,height:8, borderRadius:2,background:C.mint,opacity:rankTick%5===1?1:0.2}}/>
                <div style={{width:3,height:12,borderRadius:2,background:C.mint,opacity:rankTick%5===2?1:0.2}}/>
                <div style={{width:3,height:6, borderRadius:2,background:C.mint,opacity:rankTick%5===3?1:0.2}}/>
                <div style={{width:3,height:10,borderRadius:2,background:C.mint,opacity:rankTick%5===4?1:0.2}}/>
                <span style={{fontSize:8,fontWeight:700,color:C.mint,marginRight:2}}>مباشر</span>
                <span className="m" style={{fontSize:8,color:C.smoke}}>{fmtT}</span>
              </div>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <button onClick={function(){setSub("");}} style={{width:40,height:40,borderRadius:12,cursor:"pointer",background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",border:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 10px rgba(0,0,0,.25)"}}><Ico k="back" color={C.smoke} size={18}/></button>
              <div>
                <div style={{fontSize:9,color:subColor,fontWeight:700,letterSpacing:"2px",opacity:0.7}}>TADAWUL+</div>
                <div style={{fontSize:16,fontWeight:900,color:subColor,letterSpacing:"-0.3px",textShadow:"0 0 12px "+subColor+"44"}}>{subLabel}</div>
              </div>
            </div>
          )}
          {!sub&&(
          <div style={{display:"flex",gap:6}}>
            <button onClick={function(){setSub(sub==="snapshots"?"":"snapshots");}} style={{
              width:44,height:44,borderRadius:12,cursor:"pointer",position:"relative",
              background:sub==="snapshots"?"linear-gradient(135deg,"+C.teal+"22,"+C.teal+"11)":"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",
              border:"1px solid "+(sub==="snapshots"?C.teal+"44":C.line),
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
              boxShadow:sub==="snapshots"?"0 0 16px "+C.teal+"33, 0 2px 10px rgba(0,0,0,.25)":"0 2px 10px rgba(0,0,0,.25)",
            }}>
              <Ico k="camera" color={C.teal} size={18}/>
              <span style={{fontSize:7,color:sub==="snapshots"?C.teal:C.smoke,fontWeight:600}}>لقطاتي</span>
              {snaps.length>0&&<div style={{position:"absolute",top:5,left:5,width:14,height:14,borderRadius:7,background:C.coral,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 6px "+C.coral+"88"}}><span style={{fontSize:7,color:"white",fontWeight:800}}>{snaps.length}</span></div>}
            </button>
            <button onClick={function(){setShowAlerts(true);}} style={{
              width:44,height:44,borderRadius:12,cursor:"pointer",position:"relative",
              background:sub==="alerts"?"linear-gradient(135deg,"+C.coral+"22,"+C.coral+"11)":"linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.02))",
              border:"1px solid "+(showAlerts?C.coral+"44":C.line),
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
              boxShadow:showAlerts?"0 0 16px "+C.coral+"33, 0 2px 10px rgba(0,0,0,.25)":"0 2px 10px rgba(0,0,0,.2)",
            }}>
              <Ico k="bell" color={C.coral} size={18}/>
              <span style={{fontSize:7,color:showAlerts?C.coral:C.smoke,fontWeight:600}}>التنبيهات</span>
            </button>
            <button onClick={function(){setSub(sub==="settings"?"":"settings");}} style={{
              width:44,height:44,borderRadius:12,cursor:"pointer",
              background:sub==="settings"?"linear-gradient(135deg,"+C.gold+"22,"+C.goldD+"11)":"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",
              border:"1px solid "+(sub==="settings"?C.gold+"44":C.line),
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
              boxShadow:sub==="settings"?"0 0 16px "+C.gold+"33, 0 2px 10px rgba(0,0,0,.25)":"0 2px 10px rgba(0,0,0,.25)",
            }}>
              <Ico k="settings" color={C.gold} size={18}/>
              <span style={{fontSize:7,color:sub==="settings"?C.gold:C.smoke,fontWeight:600}}>إعدادات</span>
            </button>
          </div>
          )}
        </div>
      </div>

      
      {!sub&&(
        <div style={{padding:"12px 16px 24px",position:"relative",zIndex:1}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {MENU.map(function(item,i){return(
              <button key={item.id} className={"card-enter"+(flashCard===item.id?" flash":"")} onClick={function(){setFlashCard(item.id);setTimeout(function(){setFlashCard(null);},350);handle(item.id);}}
                style={{
                  animationDelay:(i*0.05)+"s",
                  background:BOX,
                  border:"1px solid "+item.color+"22",
                  borderRadius:20,
                  padding:"20px 10px 18px",
                  minHeight:130,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,
                  cursor:"pointer",
                  boxShadow:"0 8px 24px rgba(0,0,0,.35), 0 0 0 1px "+item.color+"18, inset 0 1px 0 "+C.layer3,
                  position:"relative",overflow:"hidden",
                  transition:"all .3s cubic-bezier(.4,0,.2,1)",
                }}>
                <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 80% at 50% 30%,"+item.color+"12,transparent)"}}/>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,"+item.color+"70,transparent)",borderRadius:"20px 20px 0 0"}}/>
                <div className="breathe" style={{position:"relative",width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,"+item.color+"22,"+item.color+"0a)",border:"1px solid "+item.color+"44",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px "+item.color+"33, inset 0 1px 0 "+item.color+"15"}}>
                  <Ico k={item.icoK} color={item.color} size={28}/>
                </div>
                <div style={{position:"relative",textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:800,color:C.snow,lineHeight:1.3}}>{item.label}</div>
                  <div style={{fontSize:8,color:item.color,marginTop:4,opacity:0.8,fontWeight:500}}>{item.sub}</div>
                </div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,"+item.color+"40,transparent)"}}/>
              </button>
            );})}
          </div>
        </div>
      )}

      
      {sub==="rankings"&&<RankingsTab p={tabProps}/>}

      
      {sub==="commodities"&&<CommoditiesTab p={tabProps}/>}

      
      {sub==="dividends"&&<DividendsTab p={tabProps}/>}

      
      {sub==="ipos"&&<IposTab p={tabProps}/>}

      
      {sub==="funds"&&<FundsTab p={tabProps}/>}

      
      {sub==="calendar"&&<CalendarTab p={tabProps}/>}

      
      {sub==="snapshots"&&<SnapshotsTab p={tabProps}/>}

      
      {sub==="settings"&&<SettingsTab p={tabProps}/>}

      {sub==="macro"&&<MacroTab p={tabProps}/>}
      {sub==="watchlist"&&<WatchlistTab p={tabProps}/>}

      {showCalc&&<ProfitCalc onClose={function(){setShowCalc(false);}}/>}
      {showCompare&&<CompareView onClose={function(){setShowCompare(false);}}/>}
      {showAlerts&&<AlertsPanel onClose={function(){setShowAlerts(false);}}/>}
    </div>
  );
}
