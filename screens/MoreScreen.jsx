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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import { useNav } from '../store/navStore';
import { TAB_IDS } from '../constants/navigation';
import { useSharedPrices } from '../store';
import { useHaptic } from '../hooks/useHaptic';
import AILearningDashboard from '../components/AILearningDashboard';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useRankings } from '../hooks/useRankings';
// ── Shared constants + UI
import { C, Ico, COMM, PRIORITY_ORDER, WATCHLIST_DEFAULT, RANKINGS, DIVS, CSS_STR, TADAWUL, WTI } from './more/MoreShared';

// ── تبويبات السوق
import { RankingsTab, CommoditiesTab } from './more/MarketTabs';

// ── تبويبات مالية
import { DividendsTab, MacroTab } from './more/FinanceTabs';

// ── تبويبات الأدوات
import { SnapshotsTab, SettingsTab, ProfitCalc, CompareView, AlertsPanel, WatchlistTab } from './more/ToolsTabs';

export default function MoreScreen({
  snapshots: extSnaps, setSnapshots: setExtSnaps,
  watchlist: extWatchlist, setWatchlist: setExtWatchlist,
  commData: extCommData, setCommData: setExtCommData,
} = {}) {
  const liveStocks = useSharedPrices();
const { setTab } = useNav();
  // ── UX hooks ──────────────────────────────────────────────────
  const haptic  = useHaptic();
  const scrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [aiLearningOpen, setAiLearningOpen] = useState(false);
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
  const [snapOpen, setSnapOpen] = useState(false);
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
  const [homeConf, setHomeConf] = useState({showOpportunity:true,showTopMovers:true,showSectorChart:true,showAdvanced:false});
  const [snaps, setSnaps] = useState(function(){
  try{
    var r=localStorage.getItem('tadawul_snapshots');
    return r?JSON.parse(r):[];
  }catch(e){return [];}
});
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
  const [fullSnap, setFullSnap] = useState(null);
  const [snapTag, setSnapTag] = useState("الكل");
  const [fontSize, setFontSize] = useState(function(){
  try{return localStorage.getItem('tadawul_font_size')||'medium';}catch(e){return 'medium';}
});
  var fontScale={small:0.9,medium:1,large:1.12};
  const [_localCommData, _setLocalCommData] = useState(COMM);
  // ── جلب الأسواق العالمية الحقيقية من FRED (نفط WTI + VIX) ──
  const [fredComm, setFredComm] = useState([]);
useEffect(function(){
  var CACHE_KEY = 'tdw_fred_cache';
  var CACHE_HOURS = 24;
  
  function processFred(d){
    if(!d) return;
    var items = [];
    function buildItem(hist, price, name, sym, cat, color, fact){
      if(!Array.isArray(hist) || hist.length < 2 || typeof price !== 'number') return null;
      var prev = hist[hist.length-2];
      var pct = prev ? ((price - prev)/prev*100) : 0;
      var hi = Math.max.apply(null, hist);
      var lo = Math.min.apply(null, hist);
      return {
        sym: name, cat: cat, color: color,
        price: Math.round(price*100)/100,
        pct: Math.round(pct*100)/100,
        open: Math.round(prev*100)/100,
        hi: Math.round(hi*100)/100,
        lo: Math.round(lo*100)/100,
        ch: Math.round((price-prev)*100)/100,
        lo52: Math.round(lo*100)/100,
        hi52: Math.round(hi*100)/100,
        fact: fact,
        history: hist,
      };
    }
    var defs = [
      {k:'oil',    name:'خام WTI',          cat:'نفط',     color:C.gold,    fact:'نفط غربي تكساس · نطاق آخر 40 يوم · FRED'},
      {k:'brent',  name:'خام برنت',         cat:'نفط',     color:C.goldL,   fact:'النفط المرجعي العالمي · نطاق آخر 40 يوم · FRED'},
      {k:'natgas', name:'الغاز الطبيعي',    cat:'طاقة',    color:C.amber,   fact:'غاز هنري هَب · $/MMBtu · FRED'},
      {k:'vix',    name:'مؤشر الخوف VIX',   cat:'مؤشرات',  color:C.electric,fact:'تقلّب السوق الأمريكي · أقل = استقرار · FRED'},
      {k:'sp500',  name:'ستاندرد آند بورز 500',cat:'مؤشرات',color:C.mint,  fact:'أكبر 500 شركة أمريكية · FRED'},
      {k:'nasdaq', name:'ناسداك المركّب',   cat:'مؤشرات',  color:C.plasma,  fact:'مؤشر التقنية الأمريكي · FRED'},
      {k:'dow',    name:'داو جونز',         cat:'مؤشرات',  color:C.teal,    fact:'30 شركة صناعية كبرى · FRED'},
      {k:'dxy',    name:'مؤشر الدولار',     cat:'عملات',   color:C.coral,   fact:'قوة الدولار مرجّحاً تجارياً · FRED'},
      {k:'fedrate',name:'الفائدة الفيدرالية',cat:'فائدة',  color:C.electric,fact:'سعر الفائدة الأمريكي اليومي % · FRED'},
      {k:'t10',    name:'سندات 10 سنوات',   cat:'سندات',   color:C.smoke,   fact:'عائد السندات الأمريكية 10 سنوات % · FRED'},
    ];
    defs.forEach(function(def){
      var it = buildItem(d[def.k+'History'], d[def.k+'Price'], def.name, def.k, def.cat, def.color, def.fact);
      if(it) items.push(it);
    });
    if(items.length) setFredComm(items);
  }
  
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if(cached) {
      var parsed = JSON.parse(cached);
      var ageHours = (Date.now() - parsed.savedAt) / (1000 * 60 * 60);
      if(ageHours < CACHE_HOURS) {
        processFred(parsed.data);
        return;
      }
    }
  } catch(e) {}
  
  fetch('/api/freddata').then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d) return;
    processFred(d);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: d,
        savedAt: Date.now(),
      }));
    } catch(e){}
  }).catch(function(){});
},[]);

  // ── استخدام commData ──
  // FRED حقيقي فقط (حُذف extCommData الوهمي القديم من العرض). COMM فارغة = "لا بيانات".
  var commData = (fredComm && fredComm.length) ? fredComm : _localCommData;

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
const stocksLive = liveStocks;
const { rankings: fundRankings, loading: rankLoading } = useRankings(stocksLive);

  // ── effects ──
  useEffect(function(){var el=document.createElement("style");el.textContent=CSS_STR;document.head.appendChild(el);return function(){document.head.removeChild(el);};},[]);
  // Auto-navigate to snapshots tab when new snapshot arrives from AppShell
  useEffect(function(){
    if (extSnaps && extSnaps.length > 0) {
      setSub("snapshots");
    }
  }, [extSnaps]);
useEffect(function(){
    if(sub==="snapshots"){
      try{
        var r=localStorage.getItem('tadawul_snapshots');
        if(r){
          var fresh=JSON.parse(r);
          setSnaps(fresh);
        }
      }catch(e){}
    }
  },[sub]);

  useEffect(function(){
    var t=setInterval(function(){setLiveTime(new Date());},1000);
    return function(){clearInterval(t);};
  },[]);

  // ✨ استمع لتحديثات المفضّلة من شاشات أخرى (مثل زرّ النجمة في StockDetail)
  useEffect(function(){
    function refreshWatchlist(){
      try{
        var r=window.localStorage.getItem("tadawul_watchlist");
        if(r){
          var fresh=JSON.parse(r);
          _setLocalWL(fresh);
          if (setExtWatchlist) {
            setExtWatchlist(fresh);
          }
        }
      }catch(e){}
    }
    window.addEventListener('watchlist-updated', refreshWatchlist);
    // ✨ نَفحص أيضاً كلّ ثانية كـ fallback (إذا event فَشل)
    var interval = setInterval(refreshWatchlist, 1500);
    return function(){
      window.removeEventListener('watchlist-updated', refreshWatchlist);
      clearInterval(interval);
    };
  },[]);

  useEffect(function(){
    var t=setInterval(function(){
      setRankTick(function(n){return n+1;});
      },5000);
    return function(){clearInterval(t);};
  },[]);

  // الأسواق العالمية مربوطة بـ FRED (نفط/مؤشرات/فائدة) عبر useEffect أعلاه → fredComm.
  // هذه الدالة تبقى placeholder لزر التحديث في CommoditiesTab (FRED يُجلب تلقائياً عند التحميل، cache 12 ساعة).
  function fetchYahooData(){ /* لا حاجة لجلب يدوي -- FRED يُحدّث تلقائياً عبر cache */ }

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
        // ✨ تجاهل التنبيهات المنتهية -- expiry كان يُعرض ولا يُفحص
        if(al.expiry && new Date(al.expiry) < new Date()) return al;
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
  // دمج بيانات حية (pct/spark/p) مع قائمة fundamentals
  var enrichLive = function(arr, fieldName){
    return arr.map(function(r){
      var live = stocksLive.filter(function(s){return s.sym===r.sym;})[0] || {};
      var obj = Object.assign({}, r, {
        pct: live.pct || 0,
        p: live.p || 0,
        vol: live.v || 0,
        spark: live.spark || [],
      });
      obj[fieldName] = r[fieldName==="mktCap"?"mc":fieldName==="div"?"divYld":fieldName];
      return obj;
    });
  };
  var rankItems = useMemo(function(){
    // القوائم من fundamentals (mc/div/roe/pe)
    if (rField.field === "mktCap")  return enrichLive(fundRankings.byMarketCap, "mktCap");
    if (rField.field === "div")     return enrichLive(fundRankings.byDividend, "div");
    if (rField.field === "roe")     return enrichLive(fundRankings.byROE, "roe");
    if (rField.field === "pe")      return enrichLive(fundRankings.byPE, "pe");
    // القوائم الحية (pct/vol) - كما هي
    return rankFiltered.slice().sort(function(a,b){return rField.dir*(b[rField.field]-a[rField.field]);}).slice(0,10);
  },[rankFiltered, rField, fundRankings, stocksLive]);
  var catList=["الكل"];
  commData.forEach(function(c){if(catList.indexOf(c.cat)===-1)catList.push(c.cat);});
  var commF=commCat==="الكل"?commData:commData.filter(function(c){return c.cat===commCat;});

  function cfmt(v) {
  if(v==null||isNaN(v)) return "-- ر.س";
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

    {id:"dividends",  label:"التوزيعات",         color:C.mint,    icoK:"coins",   sub:"استحقاقات · DRIP · YoC"},
    {id:"compare",    label:"مقارنة سهمين",      color:"#f97316", icoK:"scale",   sub:"رادار · جدول · مقاييس"},

    {id:"profitcalc", label:"حاسبة الربح",       color:C.mint,    icoK:"calc",    sub:"ROI · نقطة التعادل · سيناريوهات"},
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
    divItem:divItem, setDivItem:setDivItem,
    divShares:divShares, setDivShares:setDivShares,
    divCost:divCost, setDivCost:setDivCost,
    snaps: extSnaps && extSnaps.length > 0 ? extSnaps : snaps,
    snapOpen:snapOpen, setSnapOpen:setSnapOpen,
setSnaps:setSnaps,
    fullSnap:fullSnap, setFullSnap:setFullSnap,
    editSnap:editSnap, setEditSnap:setEditSnap,
    snapTag:snapTag, setSnapTag:setSnapTag,
    fontSize:fontSize, setFontSize:setFontSize,
    notifSound:notifSound, setNotifSound:setNotifSound,
    homeConf:homeConf, setHomeConf:setHomeConf,
    rField:rField, rankItems:rankItems, secList:secList,
    commF:commF, catList:catList,
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
              
              {(function(){
                // فحص حالة السوق السعودي (KSA UTC+3)
                var now = new Date();
                var utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                var ksa = new Date(utc + 3 * 3600000);
                var day = ksa.getDay();
                var timeInMin = ksa.getHours() * 60 + ksa.getMinutes();
                var isOpen = (day >= 0 && day <= 4) && (timeInMin >= 570 && timeInMin <= 930);
                var stCol = isOpen ? C.mint : C.coral;
                var stLbl = isOpen ? "مباشر" : "مغلق";
                var bars = [4,8,12,6,10];
                return (
                  <div className="live-bar">
                    {bars.map(function(barH, i){
                      var active = isOpen && (rankTick % 5 === i);
                      return (
                        <div key={i} style={{
                          width:3,
                          height: barH,
                          borderRadius:2,
                          background: stCol,
                          opacity: active ? 1 : (isOpen ? 0.2 : 0.4),
                        }}/>
                      );
                    })}
                    <span style={{fontSize:8,fontWeight:700,color:stCol,marginRight:2}}>{stLbl}</span>
                    <span className="m" style={{fontSize:8,color:C.smoke}}>{fmtT}</span>
                  </div>
                );
              })()}
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
                        <button onClick={function(){setShowAlerts(true);}}

style={{
              width:44,height:44,borderRadius:12,cursor:"pointer",position:"relative",
              background:"linear-gradient(135deg,rgba(255,255,255,.04),rgba(255,255,255,.02))",
              border:"1px solid "+C.line,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
              boxShadow:"0 2px 10px rgba(0,0,0,.2)",
            }}>
              <Ico k="bell" color={C.coral} size={18}/>
              <span style={{fontSize:7,color:C.smoke,fontWeight:600}}>التنبيهات</span>
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
      <>
        {/* 🧠 بطاقة AI Learning */}
        <div
          onClick={function() { setAiLearningOpen(true); }}
          style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(59, 130, 246, 0.08))",
            border: "1.5px solid rgba(139, 92, 246, 0.4)",
            borderRadius: 14,
            padding: "16px 14px",
            margin: "12px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(139, 92, 246, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "linear-gradient(135deg, #8b5cf6, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, flexShrink: 0,
              boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)",
            }}>
              🧠
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: "#8b5cf6", fontWeight: 800, letterSpacing: "1.5px", marginBottom: 3 }}>
                ✨ ذكاء متطوّر
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: C.snow, marginBottom: 3, fontFamily: "Cairo,sans-serif" }}>
                AI Learning Dashboard
              </div>
              <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.5, fontFamily: "Cairo,sans-serif" }}>
                راقب تعلّم النظام وخبرته المتراكمة
              </div>
            </div>
            <div style={{
              fontSize: 22,
              color: "#8b5cf6",
              fontWeight: 900,
              transform: "rotate(180deg)",
            }}>
              →
            </div>
          </div>
        </div>

        {/* 🧪 بطاقة مختبر الاستراتيجيات */}
        <div
          onClick={function() { setTab(TAB_IDS.BACKTEST); }}
          style={{
            background: "linear-gradient(135deg, rgba(240, 192, 80, 0.18), rgba(30, 230, 138, 0.08))",
            border: "1.5px solid rgba(240, 192, 80, 0.4)",
            borderRadius: 14,
            padding: "16px 14px",
            margin: "12px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(240, 192, 80, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "linear-gradient(135deg, #f0c050, #ffd878)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26, flexShrink: 0,
              boxShadow: "0 4px 10px rgba(240, 192, 80, 0.3)",
            }}>
              🧪
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, color: "#f0c050", fontWeight: 800, letterSpacing: "1.5px", marginBottom: 3 }}>
                ✨ جديد
              </div>
              <div style={{ fontSize: 15, color: "#f0f6ff", fontWeight: 900, marginBottom: 4 }}>
                مختبر الاستراتيجيات
              </div>
              <div style={{ fontSize: 11, color: "#c8d8f0", lineHeight: 1.5 }}>
                اختبر محفظتك على سنوات + محاكاة 5,000 سيناريو
              </div>
            </div>
            <div style={{ fontSize: 20, color: "#f0c050", fontWeight: 900, flexShrink: 0 }}>
              ←
            </div>
          </div>
          <div style={{
            marginTop: 10, paddingTop: 10,
            borderTop: "1px solid rgba(240, 192, 80, 0.2)",
            display: "flex", gap: 6, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 9, padding: "3px 8px", background: "rgba(30, 230, 138, 0.15)", color: "#1ee68a", borderRadius: 10, fontWeight: 700 }}>
              💼 محفظتي
            </span>
            <span style={{ fontSize: 9, padding: "3px 8px", background: "rgba(240, 192, 80, 0.15)", color: "#f0c050", borderRadius: 10, fontWeight: 700 }}>
              🔍 ١١ طبقة
            </span>
            <span style={{ fontSize: 9, padding: "3px 8px", background: "rgba(34, 211, 238, 0.15)", color: "#22d3ee", borderRadius: 10, fontWeight: 700 }}>
              🌐 السوق
            </span>
          </div>
        </div>

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
                  position:"relative",overflowX:"hidden",
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
              </>
        )}



      
      {sub==="rankings"&&<RankingsTab p={tabProps}/>}

      
      {sub==="commodities"&&<CommoditiesTab p={tabProps}/>}

      
      {sub==="dividends"&&<DividendsTab p={tabProps}/>}


      
      {sub==="snapshots"&&<SnapshotsTab p={tabProps}/>}

      
      {sub==="settings"&&<SettingsTab p={tabProps}/>}

      {sub==="macro"&&<MacroTab p={tabProps}/>}
      {sub==="watchlist"&&<WatchlistTab p={tabProps}/>}

            {showCalc&&<ProfitCalc onClose={function(){setShowCalc(false);}}/>}
      {showCompare&&<CompareView onClose={function(){setShowCompare(false);}}/>}
{showAlerts&&<AlertsPanel onClose={function(){setShowAlerts(false);}}/>}      
      
      {/* 🧠 AI Learning Dashboard */}
      {aiLearningOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0a0e1a',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <AILearningDashboard onBack={() => setAiLearningOpen(false)} />
        </div>
      )}
    </div>
  );
}

