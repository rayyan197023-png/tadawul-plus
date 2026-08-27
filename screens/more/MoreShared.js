'use client';
/**
 * @module screens/more/MoreScreenShared
 * @description ثوابت ومكونات UI مشتركة لـ MoreScreen
 */
import { useState, useRef } from 'react';
var CSS_STR = [
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


// التوزيعات: بيانات وهمية حُذفت (أسعار وتواريخ توزيع مكتوبة يدوياً تتناقض مع أسعار sahmk).
// تُربط بمصدر توزيعات حقيقي عند توفّره. التبويب يعرض حالة "لا بيانات".
const DIVS = [];

// الاكتتابات: بيانات وهمية حُذفت (شركات مخترعة بأرقام غير حقيقية).
// تُربط بمصدر اكتتابات حقيقي عند توفّره. التبويب يعرض حالة "لا بيانات".
const IPOS = [];



const RANKINGS = [
  {title:"الأكثر ارتفاعاً",   color:C.mint,    field:"pct",   dir:1,  fmt:function(v){return v==null?"--":(v>0?"+":"")+v.toFixed(1)+"%";}},
  {title:"الأكثر انخفاضاً",   color:C.coral,   field:"pct",   dir:-1, fmt:function(v){return v==null?"--":v.toFixed(1)+"%";}},
  {title:"الأكثر تداولاً",    color:C.amber,   field:"vol",   dir:1,  fmt:function(v){return v==null?"--":v>=1e6?(v/1e6).toFixed(1)+"M":v>=1e3?(v/1e3).toFixed(0)+"K":String(v);}},
  {title:"أعلى قيمة سوقية",   color:C.gold,    field:"mktCap",dir:1,  fmt:function(v){return v==null?"--":v>=1000?(v/1000).toFixed(2)+"T":v.toFixed(1)+"B";}},
  {title:"أعلى عائد توزيعات", color:C.teal,    field:"div",   dir:1,  fmt:function(v){return v==null?"--":v.toFixed(1)+"%";}},
  {title:"أفضل ROE",           color:C.plasma,  field:"roe",   dir:1,  fmt:function(v){return v==null?"--":v.toFixed(1)+"%";}},
  {title:"أقل P/E",            color:C.electric,field:"pe",    dir:-1, fmt:function(v){return v==null?"--":v.toFixed(1)+"x";}},
];

// السلع والأسواق العالمية: بيانات وهمية حذفت (أسعار نفط/ذهب/مؤشرات ثابتة قديمة).
// لا مزوّد حقيقي حالياً (Twelve Data رُفض). تُربط عند توفّر مزوّد مناسب. التبويب يعرض "غير متاح".
const COMM = [];

// التقويم المالي: بيانات وهمية حُذفت (نتائج وتوقّعات أرباح EPS وتواريخ مخترعة).
// يُربط بمصدر تقويم حقيقي عند توفّره. التبويب يعرض حالة "لا بيانات".
const EVENTS = [];

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

// الاقتصاد الكلي: بيانات وهمية حُذفت (مؤشرات GDP/تضخم/فائدة وقيم مخترعة).
// تُربط بمصدر اقتصادي حقيقي عند توفّره. التبويب يعرض حالة "لا بيانات".
export const MACRO = [];

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

export { WATCHLIST_DEFAULT, CSS_STR, C, Ico, ArcRing, SentimentGauge, MiniLine, SparkLine, Stars, SectionHeader, TagFilter, COMM, DIVS, IPOS, RANKINGS, EVENTS, PRIORITY_ORDER };

