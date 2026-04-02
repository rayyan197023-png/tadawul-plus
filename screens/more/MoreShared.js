'use client';
/**
 * @module screens/more/MoreScreenShared
 * @description ثوابت ومكونات UI مشتركة لـ MoreScreen
 */
import { useState, useRef } from 'react';
var CSS_STR = [
  "@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');",
  "@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');",
  "*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}",
  "::-webkit-scrollbar{width:0;height:0}",
  "body{background:#06080f}",
  ".num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.5px}",
  ".num-lg{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-1px}",
  ".m{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}",
  ".glow-gold{text-shadow:0 0 12px #f0c05099,0 0 24px #f0c05044}",
  ".glow-mint{text-shadow:0 0 10px #1ee68a88,0 0 20px #1ee68a33}",
  ".glow-electric{text-shadow:0 0 10px #4d9fff88,0 0 20px #4d9fff33}",
  ".glow-coral{text-shadow:0 0 10px #ff5f6a88,0 0 20px #ff5f6a33}",
  ".glow-white{text-shadow:0 0 8px rgba(240,246,255,.4),0 0 16px rgba(240,246,255,.15)}",
  "@keyframes springIn{0%{opacity:0;transform:translateY(24px) scale(.96)}60%{opacity:1;transform:translateY(-4px) scale(1.01)}80%{transform:translateY(2px) scale(.995)}100%{opacity:1;transform:translateY(0) scale(1)}}",
  "@keyframes springScale{0%{transform:scale(.88)}55%{transform:scale(1.06)}75%{transform:scale(.97)}100%{transform:scale(1)}}",
  "@keyframes morphIn{0%{opacity:0;transform:translateY(12px) scale(.94) rotate(-1deg)}65%{opacity:1;transform:translateY(-2px) scale(1.02) rotate(.3deg)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}",
  "@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}",
  "@keyframes floatBadge{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}",
  "@keyframes spinRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
  "@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}",
  "@keyframes buyGlow{0%,100%{box-shadow:0 0 0 1px #1ee68a22,0 4px 20px rgba(0,0,0,.3)}50%{box-shadow:0 0 0 1px #1ee68a55,0 4px 28px #1ee68a18,0 0 20px #1ee68a0f}}",
  "@keyframes dangerPulse{0%,100%{box-shadow:0 0 0 1px #ff5f6a22,0 4px 20px rgba(0,0,0,.3)}50%{box-shadow:0 0 0 1px #ff5f6a44,0 4px 24px #ff5f6a15}}",
  "@keyframes rarePop{0%{opacity:0;transform:scale(.85) translateY(6px)}60%{transform:scale(1.04) translateY(-3px)}80%{transform:scale(.98) translateY(1px)}100%{opacity:1;transform:scale(1) translateY(0)}}",
  "@keyframes fadeIn{from{opacity:0}to{opacity:1}}",
  "@keyframes rankUp{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}",
  "@keyframes glow{0%,100%{box-shadow:0 0 8px #f0c05044}50%{box-shadow:0 0 20px #f0c05088}}",
  "@keyframes ci{0%{opacity:0;transform:translateY(20px) scale(.96)}60%{opacity:1;transform:translateY(-3px) scale(1.01)}80%{transform:translateY(1px) scale(.998)}100%{opacity:1;transform:translateY(0) scale(1)}}",
  "@keyframes particle0{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(8%,12%) scale(1.15)}}",
  "@keyframes particle1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-6%,8%) scale(.88)}}",
  "@keyframes particle2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(10%,-6%) scale(1.1)}}",
  "@keyframes particle3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-8%,-10%) scale(.92)}}",
  "@keyframes particle4{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(5%,7%) scale(1.08)}}",
  "@keyframes particle5{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-4%,9%) scale(.95)}}",
  ".card-enter{animation:springIn .55s cubic-bezier(.16,1,.3,1) both}",
  ".ci{animation:ci .5s cubic-bezier(.16,1,.3,1) both}",
  ".fade-in{animation:fadeIn .35s ease both}",
  ".live-dot{animation:pulse 2s ease-in-out infinite}",
  ".buy-glow{animation:buyGlow 3.2s ease-in-out infinite}",
  ".danger-pulse{animation:dangerPulse 2.4s ease-in-out infinite}",
  ".spring-scale{animation:springScale .5s cubic-bezier(.16,1,.3,1) both}",
  ".float-badge{animation:floatBadge 3s ease-in-out infinite}",
  ".breathe{animation:breathe 4s ease-in-out infinite}",
  "button{font-family:inherit;transition:transform .15s ease,opacity .15s ease}",
  "button:active{transform:scale(.93);opacity:.85}",
  "input,select,textarea{font-family:Cairo,system-ui,sans-serif}",
  "input[type=range]{-webkit-appearance:none;height:4px;background:#2a3858;border-radius:2px;outline:none}",
  "input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#4d9fff;cursor:pointer;box-shadow:0 0 10px #4d9fff88}",
  ".root-wrap{background:#06080f;min-height:100vh;direction:rtl;font-family:Cairo,system-ui,sans-serif;color:#f0f6ff;position:relative;overflow-x:hidden;max-width:430px;margin:0 auto}",
  ".hdr{padding:52px 20px 0;background:linear-gradient(180deg,#0c1020ff 60%,#0c102000 100%);position:sticky;top:0;z-index:30}",
  ".hdr-btn{width:44px;height:44px;border-radius:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:linear-gradient(135deg,#1c2640,#222d4a);border:1px solid #32426a;box-shadow:0 2px 10px rgba(0,0,0,.25)}",
  ".live-bar{display:inline-flex;align-items:center;gap:5px;margin-top:8px;background:rgba(30,230,138,.08);border-radius:8px;padding:4px 10px;border:1px solid rgba(30,230,138,.18)}",
  "@keyframes flashCard{0%{opacity:1}25%{opacity:.5}50%{opacity:1}75%{opacity:.7}100%{opacity:1}}",
  ".flash{animation:flashCard .35s ease}",
  "@keyframes skeletonPulse{0%,100%{opacity:.4}50%{opacity:.9}}",
  ".skeleton{animation:skeletonPulse 1.4s ease-in-out infinite;background:linear-gradient(90deg,#1c2640 25%,#222d4a 50%,#1c2640 75%);background-size:200% 100%;border-radius:8px}"
].join("\n");

// ── COLORS ───────────────────────────────────────────────────
const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#16202e", layer2:"#1c2640", layer3:"#222d4a",
  edge:"#2a3858", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878", goldD:"#c09030",
  electric:"#4d9fff", electricL:"#82c0ff", plasma:"#a78bfa",
  mint:"#1ee68a", coral:"#ff5f6a", amber:"#fbbf24", teal:"#22d3ee",
};

const PRIORITY_ORDER = {high:0,medium:1,low:2};

// ── DATA ─────────────────────────────────────────────────────


const DIVS = [
  {sym:"2222",name:"أرامكو",   sec:"الطاقة",          price:27.45,perShare:0.35,timesPerYear:4,exDate:"2026-03-15",payDate:"2026-04-05",daysLeft:5,  hist:[0.33,0.33,0.34,0.35]},
  {sym:"1010",name:"الأهلي",   sec:"البنوك",           price:30.0, perShare:0.50,timesPerYear:2,exDate:"2026-03-28",payDate:"2026-04-18",daysLeft:18, hist:[0.45,0.47,0.48,0.50]},
  {sym:"2010",name:"سابك",     sec:"البتروكيماويات",   price:68.90,perShare:1.25,timesPerYear:1,exDate:"2026-04-10",payDate:"2026-04-30",daysLeft:30, hist:[1.00,1.10,1.20,1.25]},
  {sym:"1120",name:"الراجحي",  sec:"البنوك",           price:92.30,perShare:0.75,timesPerYear:2,exDate:"2026-04-22",payDate:"2026-05-12",daysLeft:42, hist:[0.65,0.68,0.70,0.75]},
  {sym:"7010",name:"STC",      sec:"الاتصالات",        price:48.55,perShare:1.00,timesPerYear:2,exDate:"2026-05-05",payDate:"2026-05-25",daysLeft:55, hist:[0.90,0.93,0.95,1.00]},
  {sym:"1211",name:"معادن",    sec:"التعدين",          price:36.0, perShare:0.40,timesPerYear:1,exDate:"2026-07-01",payDate:"2026-07-21",daysLeft:112,hist:[0.30,0.33,0.37,0.40]},
];

const IPOS = [
  {name:"شركة نيوم للتقنية",    sec:"التقنية",        price:120,status:"قريباً", open:true, subPct:185,analyst:"شراء",  target:145,shares:"50M", mktCap:"6 مليار",   duration:"15–25 مارس",   desc:"شركة تقنية متكاملة تابعة لمشروع نيوم"},
  {name:"المملكة القابضة",      sec:"الاستثمار",      price:45, status:"قريباً", open:true, subPct:140,analyst:"محايد", target:50, shares:"80M", mktCap:"3.6 مليار", duration:"5–15 أبريل",   desc:"شركة استثمارية متنوعة القطاعات"},
  {name:"دار الأركان",          sec:"العقارات",       price:18, status:"مكتمل",  open:false,subPct:320,analyst:"شراء",  target:22, shares:"120M",mktCap:"2.1 مليار", duration:"1–10 مارس",    desc:"أكبر شركات التطوير العقاري"},
  {name:"تبوك للزراعة",         sec:"الزراعة",        price:32, status:"مكتمل",  open:false,subPct:97, analyst:"محايد", target:34, shares:"45M", mktCap:"1.4 مليار", duration:"1–8 فبراير",   desc:"شركة زراعية متكاملة شمال المملكة"},
  {name:"الرياض للنقل",         sec:"النقل",          price:55, status:"قريباً", open:true, subPct:null,analyst:"شراء", target:68, shares:"60M", mktCap:"3.3 مليار", duration:"10–20 مايو",   desc:"مشغّل نقل عام متكامل في الرياض"},
  {name:"الخليج للبتروكيماويات",sec:"البتروكيماويات", price:28, status:"مكتمل",  open:false,subPct:210,analyst:"تخفيف",target:26, shares:"90M", mktCap:"2.5 مليار", duration:"5–14 يناير",   desc:"متخصص في المواد الأساسية"},
];

const FUNDS = [
  {name:"صندوق الأسهم السعودية النمو",mgr:"الراجحي المالية", nav:12.45,ret1y:18.3,ret3y:42.1,ret5y:88.4, sharpe:1.42,beta:0.88,risk:"متوسط",stars:4,minInv:1000, type:"أسهم",  fee:1.5,bench:"تاسي +12.1%",maxDD:-14.2},
  {name:"صندوق الدخل المتوازن",       mgr:"سامبا كابيتال",   nav:8.92, ret1y:11.7,ret3y:28.4,ret5y:51.2, sharpe:1.18,beta:0.62,risk:"منخفض",stars:4,minInv:5000, type:"متوازن", fee:1.2,bench:"60/40 +9.8%",maxDD:-8.1},
  {name:"صندوق التقنية والابتكار",    mgr:"البلاد المالية",  nav:24.30,ret1y:31.4,ret3y:71.8,ret5y:142.0,sharpe:1.65,beta:1.18,risk:"مرتفع", stars:5,minInv:2000, type:"قطاعي", fee:2.0,bench:"ناسداك +28.4%",maxDD:-22.5},
  {name:"صندوق العقارات المدرة",      mgr:"الأهلي كابيتال",  nav:10.18,ret1y:-3.2,ret3y:8.1, ret5y:22.3, sharpe:0.61,risk:"متوسط",stars:2,minInv:10000,type:"عقاري", fee:1.8,bench:"ريتس -1.1%",  maxDD:-18.7},
  {name:"صندوق الشريعة المتوافق",     mgr:"الإنماء كابيتال", nav:15.60,ret1y:9.8, ret3y:24.5,ret5y:48.7, sharpe:1.05,risk:"منخفض",stars:3,minInv:500,  type:"إسلامي",fee:1.0,bench:"تاسي +12.1%",maxDD:-10.3},
];

const RANKINGS = [
  {title:"الأكثر ارتفاعاً",   color:C.mint,    field:"pct",   dir:1,  fmt:function(v){return(v>0?"+":"")+v.toFixed(1)+"%";}},
  {title:"الأكثر انخفاضاً",   color:C.coral,   field:"pct",   dir:-1, fmt:function(v){return v.toFixed(1)+"%";}},
  {title:"الأكثر تداولاً",    color:C.amber,   field:"vol",   dir:1,  fmt:function(v){return v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?(v/1e3).toFixed(0)+"K":String(v);}},
  {title:"أعلى قيمة سوقية",   color:C.gold,    field:"mktCap",dir:1,  fmt:function(v){return v>=1000?(v/1000).toFixed(1)+"T":v+"B";}},
  {title:"أعلى عائد توزيعات", color:C.teal,    field:"div",   dir:1,  fmt:function(v){return v.toFixed(1)+"%";}},
  {title:"أفضل ROE",           color:C.plasma,  field:"roe",   dir:1,  fmt:function(v){return v.toFixed(1)+"%";}},
  {title:"أقل P/E",            color:C.electric,field:"pe",    dir:-1, fmt:function(v){return v+"x";}},
];

const COMM = [
  {sym:"خام برنت", cat:"نفط",    price:68.93,ch:-6.35,pct:-8.39,open:75.28,hi:75.80,lo:68.10,lo52:60,  hi52:96,  color:C.amber,   fact:"تراجع حاد بسبب حرب التعريفات",history:[75,74,73,71,70,69,68.93]},
  {sym:"خام WTI",  cat:"نفط",    price:65.76,ch:-6.65,pct:-9.14,open:72.41,hi:73.00,lo:65.20,lo52:58,  hi52:90,  color:C.amber,   fact:"أدنى مستوى في 4 سنوات",        history:[73,71,70,68,67,66,65.76]},
  {sym:"الذهب",    cat:"معادن",  price:2944, ch:32,   pct:1.11, open:2912, hi:2960, lo:2905, lo52:1820,hi52:3050,color:C.gold,    fact:"ملاذ آمن وسط الاضطرابات",       history:[2900,2910,2905,2920,2930,2935,2944]},
  {sym:"الفضة",    cat:"معادن",  price:33.25,ch:0.57, pct:1.71, open:32.68,hi:33.60,lo:32.50,lo52:22,  hi52:35,  color:C.smoke,   fact:"طلب صناعي من الطاقة الشمسية",   history:[32,32.3,32.5,32.8,33,33.1,33.25]},
  {sym:"داو جونز", cat:"مؤشرات", price:41583,ch:-29,  pct:-0.07,open:41612,hi:41800,lo:41450,lo52:36000,hi52:45100,color:C.coral,  fact:"ضغط من بيانات التضخم",          history:[41800,41750,41700,41650,41600,41590,41583]},
  {sym:"S&P 500",  cat:"مؤشرات", price:5607, ch:-14,  pct:-0.24,open:5621, hi:5640, lo:5590, lo52:4600,hi52:6100, color:C.coral,   fact:"تقلبات في قطاع التقنية",        history:[5640,5635,5628,5620,5615,5610,5607]},
  {sym:"الدولار",  cat:"عملات",  price:102.84,ch:-0.26,pct:-0.25,open:103.1,hi:103.3,lo:102.6,lo52:99, hi52:107, color:C.electric,fact:"ضغط من توقعات خفض الفائدة",    history:[103.2,103.1,103,102.95,102.9,102.87,102.84]},
];

const EVENTS = [
  {d:"15",m:"مار",ev:"نتائج أرامكو Q4 2025",       sym:"2222",imp:3,epsEst:0.39,epsLow:0.36,epsHigh:0.43,epsPrev:0.36,surprise:"+8%",daysLeft:2, whisper:0.41},
  {d:"18",m:"مار",ev:"نتائج الراجحي Q4 2025",       sym:"1120",imp:3,epsEst:5.10,epsPrev:4.95,surprise:"+3%",daysLeft:5, whisper:5.25},
  {d:"22",m:"مار",ev:"اجتماع الاحتياطي الفيدرالي",  sym:null,  imp:3,epsEst:null,epsPrev:null,surprise:null, daysLeft:9, whisper:null},
  {d:"28",m:"مار",ev:"نتائج سابك Q4 2025",           sym:"2010",imp:2,epsEst:0.14,epsPrev:0.13,surprise:"+7%",daysLeft:15,whisper:0.16},
  {d:"05",m:"أبر",ev:"بيانات التضخم السعودي",         sym:null,  imp:2,epsEst:null,epsPrev:null,surprise:null, daysLeft:23,whisper:null},
  {d:"22",m:"أبر",ev:"نتائج الراجحي Q1 2026",        sym:"1120",imp:3,epsEst:5.30,epsPrev:4.95,surprise:null, daysLeft:40,whisper:5.45},
  {d:"05",m:"مايو",ev:"اجتماع مجلس الأعمال السعودي", sym:null,  imp:1,epsEst:null,epsPrev:null,surprise:null, daysLeft:53,whisper:null},
];

function Ico(props) {
  var k=props.k, c=props.color||"currentColor", sz=props.size||18;
  if(k==="chart")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><rect x="18" y="3" width="3" height="18" rx="1"/><rect x="10.5" y="8" width="3" height="13" rx="1"/><rect x="3" y="13" width="3" height="8" rx="1"/></svg>);
  if(k==="globe")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>);
  if(k==="coins")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><circle cx="8" cy="15" r="5"/><path d="M13 10a5 5 0 0 1 5 5"/><circle cx="16" cy="9" r="5"/></svg>);
  if(k==="rocket")   return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>);
  if(k==="box")      return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>);
  if(k==="calendar") return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>);
  if(k==="scale")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 6l9-3 9 3"/><path d="M3 6l3 6c0 2.21-1.34 4-3 4s-3-1.79-3-4l3-6z"/><path d="M21 6l-3 6c0 2.21 1.34 4 3 4s3-1.79 3-4l-3-6z"/></svg>);
  if(k==="bell")     return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>);
  if(k==="calc")     return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>);
  if(k==="camera")   return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>);
  if(k==="refresh")  return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>);
  if(k==="settings") return(
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}>
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65
        1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
  if(k==="back")     return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><polyline points="15 18 9 12 15 6"/></svg>);
  if(k==="medal")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>);
  if(k==="fire")     return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d="M12 2c0 5.5-4 8-4 12a4 4 0 0 0 8 0c0-4-4-6.5-4-12z"/></svg>);
  if(k==="share")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>);
  if(k==="trash")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>);
  if(k==="invest")   return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>);
  if(k==="plus")     return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
  if(k==="edit")     return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>);
  if(k==="clock")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>);
  if(k==="alert")    return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>);
  return(<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}><circle cx="12" cy="12" r="10"/></svg>);
}

function ArcRing(props) {
  var val=props.val, max=props.max||100, size=props.size||56, stroke=props.stroke||5, color=props.color;
  var r=(size-stroke*2)/2;
  var circ=2*Math.PI*r;
  var off=circ*(1-val/max);
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={size} height={size} style={{position:"absolute",inset:0,transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.edge} strokeWidth={stroke} strokeOpacity="0.4"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{filter:"drop-shadow(0 0 4px "+color+"66)",transition:"stroke-dashoffset .6s ease"}}/>
      </svg>
      {props.children}
    </div>
  );
}

function SentimentGauge(props) {
  var pct=props.pct, color=props.color;
  var r=26, cx=34, cy=34;
  var circ=Math.PI*r;
  var offset=circ*(1-pct/100);
  return(
    <div style={{position:"relative",width:68,height:40,flexShrink:0}}>
      <svg width="68" height="40" viewBox="0 0 68 40" style={{display:"block"}}>
        <path d={"M "+(cx-r)+" "+cy+" A "+r+" "+r+" 0 0 1 "+(cx+r)+" "+cy}
          fill="none" stroke={C.edge} strokeWidth="5" strokeLinecap="round"/>
        <path d={"M "+(cx-r)+" "+cy+" A "+r+" "+r+" 0 0 1 "+(cx+r)+" "+cy}
          fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{filter:"drop-shadow(0 0 4px "+color+")"}}/>
        <text x={cx} y={cy-2} textAnchor="middle" fill={color} fontSize="10" fontWeight="900">{pct}%</text>
      </svg>
    </div>
  );
}

function MiniLine(props) {
  var data=props.data, color=props.color, h=props.h||24, w=props.w||56;
  if(!data||data.length<2) return null;
  var vw=100;
  var mn=Math.min.apply(null,data), mx=Math.max.apply(null,data), rng=mx-mn||1;
  var pad=3;
  var pts=data.map(function(v,i){
    var x=(i/(data.length-1))*vw;
    var y=(h-pad)-((v-mn)/rng)*(h-pad*2);
    return x+","+y;
  }).join(" ");
  var lastV=data[data.length-1];
  var lastX=vw;
  var lastY=(h-pad)-((lastV-mn)/rng)*(h-pad*2);
  return(
    <svg width="100%" height={h} viewBox={"0 0 100 "+h} preserveAspectRatio="none" style={{display:"block",direction:"ltr"}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      <circle cx={lastX} cy={lastY} r="3" fill={color} stroke="#06080f" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

const MACRO = [
  {id:"gdp",     label:"نمو الناتج المحلي",    val:2.6,  prev:3.1,  unit:"%",          period:"Q4 2025", color:"#4d9fff", cat:"نمو",   desc:"أقل من التوقعات",   trend:[3.8,3.1,2.9,3.1,2.6]},
  {id:"cpi",     label:"التضخم",                val:1.9,  prev:2.1,  unit:"%",          period:"فبراير",  color:"#ff5555", cat:"أسعار", desc:"ضمن النطاق المستهدف",trend:[2.8,2.5,2.3,2.1,1.9]},
  {id:"rate",    label:"سعر الفائدة",           val:5.25, prev:5.25, unit:"%",          period:"مارس",    color:"#f0c050", cat:"نقدي",  desc:"ثابت منذ 6 أشهر",   trend:[4.5,5.0,5.25,5.25,5.25]},
  {id:"oil",     label:"إنتاج النفط السعودي",  val:9.0,  prev:9.0,  unit:"مليون ب/ي", period:"فبراير",  color:"#f97316", cat:"نفط",   desc:"ضمن حصة أوبك+",    trend:[9.5,9.2,9.0,9.0,9.0]},
  {id:"pmi",     label:"مؤشر مديري المشتريات", val:56.4, prev:54.2, unit:"",           period:"فبراير",  color:"#1ee68a", cat:"نشاط",  desc:"توسع قوي",          trend:[52.1,53.0,54.2,55.8,56.4]},
  {id:"trade",   label:"الميزان التجاري",       val:18.2, prev:16.8, unit:"مليار ر.س", period:"يناير",   color:"#1ee68a", cat:"تجارة", desc:"فائض متزايد",       trend:[14.5,15.2,16.8,17.1,18.2]},
  {id:"unemp",   label:"معدل البطالة",          val:7.7,  prev:8.1,  unit:"%",          period:"Q3 2025", color:"#a78bfa", cat:"عمل",   desc:"تراجع تدريجي",      trend:[9.0,8.7,8.3,8.1,7.7]},
  {id:"tadawul", label:"تداولات تاسي",          val:5.8,  prev:4.9,  unit:"مليار ر.س", period:"أمس",     color:"#f0c050", cat:"سوق",   desc:"نشاط مرتفع",        trend:[3.2,4.1,4.9,5.3,5.8]},
];

const WATCHLIST_DEFAULT = [
  {sym:"2222",name:"أرامكو",   color:"#f0c050"},
  {sym:"1120",name:"الراجحي",  color:"#4d9fff"},
  {sym:"2010",name:"سابك",     color:"#1ee68a"},
];

// ── MICRO-COMPONENTS ────────────────────────────────────────
function SparkLine(props) {
  var data=props.data, color=props.color, w=props.w||56, h=props.h||22;
  if(!data||data.length<2) return null;
  var mn=Math.min.apply(null,data), mx=Math.max.apply(null,data), rng=mx-mn||1;
  var pts=data.map(function(v,i){return((i/(data.length-1))*w)+","+(h-((v-mn)/rng)*h);}).join(" ");
  var last=data[data.length-1];
  var lastY=h-((last-mn)/rng)*h;
  return(
    <svg width={w} height={h} viewBox={"0 0 "+w+" "+h} style={{flexShrink:0,direction:"ltr"}}>
      <defs>
        <linearGradient id={"sg"+color.replace("#","")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polyline points={pts+" "+w+","+h+" 0,"+h} fill={"url(#sg"+color.replace("#","")+")"} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={w} cy={lastY} r="2.5" fill={color} style={{filter:"drop-shadow(0 0 4px "+color+")"}}/>
    </svg>
  );
}

function Stars(props) {
  var n=props.n, max=props.max||5;
  return(
    <div style={{display:"flex",gap:1}}>
      <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={0<n?C.gold:C.edge} stroke={0<n?C.goldD:"none"} strokeWidth={0<n?"0.5":"0"}/></svg>
      <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={1<n?C.gold:C.edge} stroke={1<n?C.goldD:"none"} strokeWidth={1<n?"0.5":"0"}/></svg>
      <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={2<n?C.gold:C.edge} stroke={2<n?C.goldD:"none"} strokeWidth={2<n?"0.5":"0"}/></svg>
      <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={3<n?C.gold:C.edge} stroke={3<n?C.goldD:"none"} strokeWidth={3<n?"0.5":"0"}/></svg>
      <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={4<n?C.gold:C.edge} stroke={4<n?C.goldD:"none"} strokeWidth={4<n?"0.5":"0"}/></svg>
    </div>
  );
}

function SectionHeader(props) {
  var label=props.label, sub=props.sub, color=props.color, icoK=props.icoK||props.icon;
  return(
    <div style={{
      padding:"16px 20px 14px",
      background:"linear-gradient(160deg,"+C.deep+" 0%,"+C.ink+" 100%)",
      borderBottom:"1px solid "+C.line,
      position:"relative",overflow:"hidden",
    }}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 80% 100% at 0% 50%,"+color+"0a,transparent)"}}/>
      <div style={{position:"absolute",bottom:-30,left:-20,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,"+color+"08,transparent 70%)"}}/>
      <div style={{position:"relative",display:"flex",alignItems:"center",gap:12}}>
        <div style={{
          width:46,height:46,borderRadius:14,
          background:"linear-gradient(135deg,"+color+"28,"+color+"0f)",
          border:"1px solid "+color+"44",
          display:"flex",alignItems:"center",justifyContent:"center",
          flexShrink:0,
          boxShadow:"0 6px 20px "+color+"33, inset 0 1px 0 "+color+"20",
        }}><Ico k={icoK} color={color} size={22}/></div>
        <div>
          <div style={{fontSize:8,color:color,fontWeight:700,letterSpacing:"2px",marginBottom:2,opacity:0.8}}>TADAWUL+</div>
          <div style={{fontSize:17,fontWeight:900,color:C.snow,lineHeight:1.1,letterSpacing:"-0.3px"}}>{label}</div>
          {sub&&<div style={{fontSize:9,color:C.smoke,marginTop:3}}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function TagFilter(props) {
  var snapshots=props.snapshots, snapTag=props.snapTag, setSnapTag=props.setSnapTag;
  var allTags=["الكل"];
  snapshots.forEach(function(s){if(s.tag&&allTags.indexOf(s.tag)===-1)allTags.push(s.tag);});
  return(
    <div style={{overflowX:"auto",display:"flex",gap:6,paddingBottom:2,whiteSpace:"nowrap"}}>
      {allTags.map(function(t){return(
        <button key={t} onClick={function(){setSnapTag(t);}}
          style={{
            padding:"5px 14px",borderRadius:16,
            border:"1px solid "+(snapTag===t?C.teal:C.line),
            background:snapTag===t?C.teal+"18":C.layer3,
            color:snapTag===t?C.teal:C.smoke,
            fontSize:10,cursor:"pointer",flexShrink:0,
            fontWeight:snapTag===t?700:400,
            boxShadow:snapTag===t?"0 0 12px "+C.teal+"22":"none",
          }}>
          {t}
        </button>
      );})}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────

export { C, Ico, ArcRing, SentimentGauge, MiniLine, SparkLine, Stars, SectionHeader, TagFilter,
         COMM, DIVS, IPOS, FUNDS, RANKINGS, EVENTS, PRIORITY_ORDER };
