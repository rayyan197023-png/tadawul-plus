'use client';
/**
 * @module components/analysis/AnalysisHelpers
 * @description مكونات UI المساعدة للوحة التحليل
 *
 * تحتوي على:
 * - ParticleCanvas  : خلفية الجسيمات
 * - ArcRing         : دائرة الدرجة
 * - KPIChip         : شريحة مؤشر KPI
 * - MiniChart       : شارت صغير
 * - StoryChart      : شارت قصصي
 * - Icon            : أيقونات SVG
 * - SignalsPanel    : لوحة الإشارات
 * - BreadthTooltip  : مؤشر اتساع السوق
 * - CorrelationMatrix : مصفوفة الارتباط
 * - LayerIcon       : أيقونة الطبقات
 *
 * جميع المكونات تستقبل C (palette) و LC (light mode) كـ props
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { scoreWord } from '../../engines/analysisEngine';

/* ══ لوحة الألوان — مُمرَّرة كـ props من AnalysisScreen ══ */
const C = {
  // الخلفيات
  ink:      "#06080f",
  deep:     "#090c16",
  void:     "#0c1020",
  layer1:   "#16202e",
  layer2:   "#1c2640",
  layer3:   "#222d4a",
  edge:     "#2a3858",
  line:     "#32426a",
  // نصوص — مُعزَّزة للإشعاع والوضوح
  snow:     "#f0f6ff",
  mist:     "#c8d8f0",
  smoke:    "#90a4c8",
  ash:      "#5a6e94",
  // الأكسنت الرئيسية — أكثر إشعاعاً
  gold:     "#f0c050",
  goldL:    "#ffd878",
  goldD:    "#c09030",
  electric: "#4d9fff",
  electricL:"#82c0ff",
  plasma:   "#a78bfa",
  mint:     "#1ee68a",
  coral:    "#ff5f6a",
  amber:    "#fbbf24",
  teal:     "#22d3ee",
};

/* ══ بيانات الأسهم — محدّثة بمعطيات أساسية فعلية ══ */
// STOCKS is imported from ../constants/stocksData

/* ══ بيانات تاريخية حقيقية — 100 شمعة يومية ══ */

function ParticleCanvas(){
  const canvasRef = useRef(null);

  useEffect(function(){
    var canvas = canvasRef.current;
    if(!canvas) return;
    var ctx = canvas.getContext("2d");
    var raf;
    var t = 0;

    // إعداد الجسيمات — مواضع في المناطق المرئية
    var particles = [
      {baseX:.15,baseY:.08,r:140,cr:"212,168,67",  sp:.0008,aX:.06,aY:.05,ph:0.0 },
      {baseX:.75,baseY:.35,r:120,cr:"212,168,67",  sp:.0005,aX:.07,aY:.06,ph:1.1 },
      {baseX:.30,baseY:.55,r:130,cr:"59,139,255",  sp:.0007,aX:.05,aY:.07,ph:2.2 },
      {baseX:.80,baseY:.70,r: 90,cr:"59,139,255",  sp:.0004,aX:.06,aY:.05,ph:3.3 },
      {baseX:.50,baseY:.20,r:100,cr:"139,92,246",  sp:.0006,aX:.05,aY:.06,ph:4.4 },
      {baseX:.10,baseY:.75,r: 80,cr:"16,201,126",  sp:.0009,aX:.04,aY:.05,ph:5.5 },
    ];

    // إعداد النجوم البيضاء — توزيع حقيقي
    var stars = (function(){
      var seed = 42;
      function rnd(){
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
      }
      return Array.from({length:30}, function(_,i){
        return{
          x:  rnd(),
          y:  rnd(),
          r:  0.4 + rnd() * 1.2,
          sp: 0.008 + rnd() * 0.025,
          ph: rnd() * Math.PI * 2,
        };
      });
    })();

    function resize(){
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(){
      t += 1;
      var W = canvas.width;
      var H = canvas.height;
      ctx.clearRect(0,0,W,H);

      // رسم الجسيمات الكبيرة — طبقتان لعمق أكبر
      particles.forEach(function(p){
        var x  = (p.baseX + p.aX * Math.sin(t * p.sp       + p.ph      )) * W;
        var y  = (p.baseY + p.aY * Math.cos(t * p.sp * 0.8 + p.ph * 0.9)) * H;
        var sc = 1 + 0.15 * Math.sin(t * p.sp * 1.2 + p.ph);
        var r  = p.r * sc;

        // الطبقة الخارجية — هالة واسعة
        var g1 = ctx.createRadialGradient(x,y,0, x,y, r);
        g1.addColorStop(0,   "rgba(" + p.cr + ",0.14)");
        g1.addColorStop(0.4, "rgba(" + p.cr + ",0.07)");
        g1.addColorStop(1,   "rgba(" + p.cr + ",0)");
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fillStyle = g1;
        ctx.fill();

        // الطبقة الداخلية — نواة أكثر إضاءة
        var g2 = ctx.createRadialGradient(x,y,0, x,y, r*0.4);
        g2.addColorStop(0,   "rgba(" + p.cr + ",0.18)");
        g2.addColorStop(1,   "rgba(" + p.cr + ",0)");
        ctx.beginPath();
        ctx.arc(x, y, r*0.4, 0, Math.PI*2);
        ctx.fillStyle = g2;
        ctx.fill();
      });

      // رسم النجوم البيضاء المتلألئة
      stars.forEach(function(s){
        var x     = s.x * W;
        var y     = s.y * H;
        var pulse = (Math.sin(t * s.sp + s.ph) + 1) / 2;
        var opac  = 0.04 + 0.14 * pulse;
        var glow  = s.r * (1 + 2.5 * pulse);
        var grad  = ctx.createRadialGradient(x,y,0, x,y, glow*4);
        grad.addColorStop(0,   "rgba(255,255,255," + (opac*0.6).toFixed(3) + ")");
        grad.addColorStop(0.3, "rgba(255,255,255," + (opac*0.2).toFixed(3) + ")");
        grad.addColorStop(1,   "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.arc(x, y, glow*4, 0, Math.PI*2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, glow, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255,255,255," + opac.toFixed(3) + ")";
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return function(){
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return(
    <canvas
      ref={canvasRef}
      style={{
        position:"fixed",inset:0,
        width:"100%",height:"100%",
        pointerEvents:"none",
        zIndex:2,
        opacity:0.40,
      }}
    />
  );
}

/* ══ المكوّن الرئيسي ══ */

function ArcRing({ val, max=100, size=64, stroke=5, color, bg=C.ash, children }){
  const r=(size-stroke*2)/2, circ=2*Math.PI*r;
  const off=circ*(1-val/max);
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} strokeOpacity={.25}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{transition:"stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)",filter:"drop-shadow(0 0 4px " + color + "88)"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {children}
      </div>
    </div>
  );
}

/* ══ بطاقة المؤشر العلوي ══ */

function KPIChip({ label, value, sub, color, icon }){
  return(
    <div style={{
      flex:"1 1 0",minWidth:0,
      background:`linear-gradient(145deg,${C.layer2},${C.layer1})`,
      borderRadius:14,padding:"12px 14px",
      border:`1px solid ${C.line}`,
      position:"relative",overflow:"hidden",
    }}>
      <div style={{position:"absolute",top:-12,right:-12,width:48,height:48,borderRadius:"50%",background:color+"18",pointerEvents:"none"}}/>
      <div style={{fontSize:11,color:C.smoke,fontWeight:600,marginBottom:4,letterSpacing:".4px"}}>{label}</div>
      <div style={{fontSize:22,fontWeight:900,color:color,lineHeight:1,letterSpacing:"-1px"}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:C.smoke,marginTop:3}}>{sub}</div>}
    </div>
  );
}

/* ══ مكوّن الجسيمات — Canvas مستقل عن React render ══ */

function MiniChart({ bars, color, h=40, w=100 }){
  if(!bars||bars.length<2) return null;
  const prices = bars.map(b=>b.c);
  const mn=Math.min(...prices), mx=Math.max(...prices), rng=mx-mn||1;
  const pts = prices.map((p,i)=>`${(i/(prices.length-1))*w},${h-(p-mn)/rng*h}`).join(" ");
  const area = `${pts} ${w},${h} 0,${h}`;
  return(
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:h,overflow:"visible"}}>
      <defs>
        <linearGradient id={"g"+color.replace("#","")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={"url(#g"+color.replace("#","")+")"} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ══ حلقة التقدم الدائرية ══ */

function StoryChart({ bars, color, score, h, w }){
  const H = h || 52;
  const SW = w || 100;
  if(!bars||bars.length<2) return null;
  const prices = bars.map(function(b){ return b.c; });
  const vols   = bars.map(function(b){ return b.vol; });
  const mn  = Math.min.apply(null, prices);
  const mx  = Math.max.apply(null, prices);
  const rng = mx - mn || 1;
  const maxV = Math.max.apply(null, vols) || 1;
  const PRICE_H = H - 14;
  const VOL_H   = 10;

  const pts = prices.map(function(p, i){
    const x = (i / (prices.length - 1)) * SW;
    const y = PRICE_H - ((p - mn) / rng) * PRICE_H;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");

  const firstPt = "0," + PRICE_H.toFixed(1);
  const lastPt  = SW.toFixed(1) + "," + PRICE_H.toFixed(1);
  const area = firstPt + " " + pts + " " + lastPt;

  const lastIdx = prices.length - 1;
  const sigX = SW * 0.97;
  const sigY = PRICE_H - ((prices[lastIdx] - mn) / rng) * PRICE_H;

  const sigColor = score >= 75 ? C.mint
                 : score >= 60 ? C.amber
                 : score >= 45 ? C.teal
                 : C.coral;

  const gradId = "sc" + color.replace("#","");

  return (
    <svg
      viewBox={"0 0 " + SW + " " + H}
      style={{width:"100%", height:H, display:"block", overflow:"visible"}}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>

      {vols.map(function(v, i){
        const x   = (i / (vols.length - 1)) * SW;
        const bH  = (v / maxV) * VOL_H;
        const col = prices[i] >= (i > 0 ? prices[i-1] : prices[i])
                  ? C.mint + "50" : C.coral + "50";
        return (
          <rect key={i} x={x - 1.2} y={H - bH} width={2.4} height={bH} fill={col} rx={1}/>
        );
      })}

      <polygon points={area} fill={"url(#" + gradId + ")"} />
      <polyline points={pts} fill="none" stroke={color}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={sigX} cy={sigY} r={3.5} fill={sigColor}/>
      <circle cx={sigX} cy={sigY} r={6.5} fill="none"
        stroke={sigColor} strokeWidth="1" strokeOpacity="0.45"/>
    </svg>
  );
}


/* ══ مكوّن الأيقونات — بديل الإيموجي ══ */
function Icon({ name, size=14, color="currentColor", style:extraStyle }){
  const s = size;
  const props = { width:s, height:s, fill:"none", stroke:color, strokeWidth:"1.4", strokeLinecap:"round", strokeLinejoin:"round", style:extraStyle||{}, viewBox:"0 0 14 14" };
  const icons = {
    check:    <svg {...props}><polyline points="2,7 5.5,11 12,3"/></svg>,
    x:        <svg {...props}><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>,
    close:    <svg {...props} viewBox="0 0 16 16"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>,
    bolt:     <svg {...props} fill={color} stroke="none"><polygon points="9,1 3,8 7,8 5,13 11,6 7,6"/></svg>,
    sun:      <svg {...props}><circle cx="7" cy="7" r="2.8"/><line x1="7" y1="1" x2="7" y2="2.5"/><line x1="7" y1="11.5" x2="7" y2="13"/><line x1="1" y1="7" x2="2.5" y2="7"/><line x1="11.5" y1="7" x2="13" y2="7"/><line x1="3" y1="3" x2="4.1" y2="4.1"/><line x1="9.9" y1="9.9" x2="11" y2="11"/><line x1="11" y1="3" x2="9.9" y2="4.1"/><line x1="4.1" y1="9.9" x2="3" y2="11"/></svg>,
    moon:     <svg {...props}><path d="M12,7.5A5,5 0 0 1 5,1.5Q3,3.5 3,7A5,5 0 0 0 10.5,12Q13,10.5 12,7.5z"/></svg>,
    rocket:   <svg {...props} fill={color} stroke="none"><path d="M7,12.5Q7,7 9.5,2.5Q11.5,6.5 10,10.5ZM7,12.5Q7,7 4.5,2.5Q2.5,6.5 4,10.5Z" opacity="0.85"/><circle cx="7" cy="6" r="1.5" fill="none" stroke={color} strokeWidth="1.2"/><path d="M4,10.5Q2.5,11.5 2.5,13Q4,13 5,12" fill={color} opacity="0.6"/><path d="M10,10.5Q11.5,11.5 11.5,13Q10,13 9,12" fill={color} opacity="0.6"/></svg>,
    trendUp:  <svg {...props}><polyline points="1,11 4.5,6.5 8,8.5 13,2.5"/><polyline points="10,2.5 13,2.5 13,5.5"/></svg>,
    trendDn:  <svg {...props}><polyline points="1,2.5 4.5,7 8,5 13,11"/><polyline points="10,11 13,11 13,8"/></svg>,
    scale:    <svg {...props}><line x1="7" y1="1" x2="7" y2="13"/><line x1="3.5" y1="13" x2="10.5" y2="13"/><line x1="2" y1="3.5" x2="12" y2="3.5"/><path d="M2,3.5Q0,5.5 2,7.5Q4,5.5 2,3.5" fill={color} stroke="none" opacity="0.7"/><path d="M12,3.5Q10,5.5 12,7.5Q14,5.5 12,3.5" fill={color} stroke="none" opacity="0.7"/></svg>,
    warning:  <svg {...props} fill="none"><polygon points="7,1.5 13,12.5 1,12.5" strokeWidth="1.3"/><line x1="7" y1="5.5" x2="7" y2="9" strokeWidth="1.6"/><circle cx="7" cy="11" r="0.9" fill={color} stroke="none"/></svg>,
    trophy:   <svg {...props}><path d="M3.5,1 H10.5 V6.5 A3.5,3.5 0 0 1 7,10 A3.5,3.5 0 0 1 3.5,6.5 Z"/><path d="M1.5,2Q0.5,4.5 3.5,5.5"/><path d="M12.5,2Q13.5,4.5 10.5,5.5"/><line x1="7" y1="10" x2="7" y2="12.5"/><line x1="4.5" y1="12.5" x2="9.5" y2="12.5"/></svg>,
    fire:     <svg {...props} fill={color} stroke="none"><path d="M7,13.5Q3,13.5 2.5,9.5Q2.5,7 4.5,6Q4.5,7.5 5.5,7.5Q4.5,5 6,2Q7.5,4.5 7,6Q8,5.5 8.5,3.5Q10.5,6 10,8Q9.5,10 8.5,10.5Q9.5,13.5 7,13.5Z" opacity="0.9"/></svg>,
    drop:     <svg {...props} fill={color} stroke="none"><path d="M7,1.5Q12,7 12,10A5,5 0 0 1 2,10Q2,7 7,1.5Z" opacity="0.9"/></svg>,
    calc:     <svg {...props}><rect x="1.5" y="1.5" width="11" height="11" rx="1.5"/><line x1="5" y1="1.5" x2="5" y2="12.5"/><circle cx="2.8" cy="4" r="0.9" fill={color} stroke="none"/><circle cx="2.8" cy="7" r="0.9" fill={color} stroke="none"/><circle cx="2.8" cy="10" r="0.9" fill={color} stroke="none"/><line x1="7" y1="4" x2="12" y2="4"/><line x1="7" y1="7" x2="12" y2="7"/><line x1="7" y1="10" x2="12" y2="10"/></svg>,
    target:   <svg {...props}><circle cx="7" cy="7" r="5.5"/><circle cx="7" cy="7" r="3"/><circle cx="7" cy="7" r="1" fill={color} stroke="none"/></svg>,
    scaffold: <svg {...props}><line x1="2.5" y1="13" x2="2.5" y2="1.5"/><line x1="2.5" y1="1.5" x2="10" y2="1.5"/><line x1="10" y1="1.5" x2="10" y2="5"/><line x1="2.5" y1="5" x2="10" y2="5"/><line x1="2.5" y1="9" x2="7" y2="9"/><line x1="4.5" y1="1.5" x2="2.5" y2="3.5"/><line x1="7" y1="1.5" x2="2.5" y2="6"/></svg>,
    triangle: <svg {...props}><polygon points="1.5,13 10.5,13 1.5,1.5"/><line x1="1.5" y1="8" x2="6" y2="8"/></svg>,
    link:     <svg {...props} viewBox="0 0 16 8"><path d="M5,4 A3,3 0 1 1 5,4.01" strokeWidth="1.6"/><path d="M11,4 A3,3 0 1 0 11,3.99" strokeWidth="1.6"/><line x1="6" y1="4" x2="10" y2="4" strokeWidth="1.6"/></svg>,
    checkCircle:<svg {...props}><circle cx="7" cy="7" r="5.5"/><polyline points="4,7 6,9.5 10,4.5"/></svg>,
    bank:     <svg {...props}><polygon points="7,1.5 13,4.5 1,4.5"/><line x1="3.5" y1="4.5" x2="3.5" y2="10.5"/><line x1="6.5" y1="4.5" x2="6.5" y2="10.5"/><line x1="7.5" y1="4.5" x2="7.5" y2="10.5"/><line x1="10.5" y1="4.5" x2="10.5" y2="10.5"/><line x1="1" y1="10.5" x2="13" y2="10.5"/><line x1="1" y1="12.5" x2="13" y2="12.5"/></svg>,
    search:   <svg {...props}><circle cx="6" cy="6" r="4.5"/><line x1="9.5" y1="9.5" x2="13" y2="13"/></svg>,
    sleep:    <svg {...props}><path d="M3,10L5,8H8L10,10"/><line x1="6" y1="4" x2="6" y2="4.5"/><path d="M3.5,4.5Q6,2 8.5,4.5Q6,7 3.5,4.5Z"/></svg>,
    chart:    <svg {...props} fill={color} stroke="none"><rect x="1" y="8.5" width="3" height="4.5" rx="0.5"/><rect x="5.5" y="5.5" width="3" height="7.5" rx="0.5"/><rect x="10" y="2" width="3" height="11" rx="0.5"/></svg>,
    eye:      <svg {...props}><path d="M1,7Q7,1 13,7Q7,13 1,7Z"/><circle cx="7" cy="7" r="2.2" fill={color} stroke="none"/></svg>,
    shield:   <svg {...props}><path d="M7,1 L12.5,3.5 V8 Q12.5,12.5 7,13.5 Q1.5,12.5 1.5,8 V3.5 Z"/></svg>,
    bell:     <svg {...props}><path d="M7,1 Q11,1 11,6 V9.5 L12.5,11 H1.5 L3,9.5 V6 Q3,1 7,1Z"/><line x1="5.5" y1="11" x2="8.5" y2="11" strokeWidth="1.6"/></svg>,
    micro:    <svg {...props}><line x1="7" y1="2.5" x2="7" y2="9.5"/><line x1="4.5" y1="2.5" x2="9.5" y2="2.5"/><line x1="5.5" y1="5.5" x2="9" y2="5.5"/><ellipse cx="7" cy="9.5" rx="4" ry="1.5"/><line x1="2.5" y1="13" x2="11.5" y2="13"/><line x1="4.5" y1="11.5" x2="3.5" y2="13"/><line x1="9.5" y1="11.5" x2="10.5" y2="13"/></svg>,
    bulb:     <svg {...props}><path d="M3,6A4,4 0 1 1 11,6Q11,8.5 9.5,10 H4.5 Q3,8.5 3,6Z"/><line x1="4.5" y1="11.5" x2="9.5" y2="11.5"/><line x1="5" y1="13" x2="9" y2="13"/></svg>,
    user:     <svg {...props}><circle cx="7" cy="5" r="3"/><path d="M1.5,13.5Q1.5,9.5 7,9.5Q12.5,9.5 12.5,13.5"/></svg>,
    gear:     <svg {...props}><circle cx="7" cy="7" r="2.2"/><line x1="7" y1="1.5" x2="7" y2="3"/><line x1="7" y1="11" x2="7" y2="12.5"/><line x1="1.5" y1="7" x2="3" y2="7"/><line x1="11" y1="7" x2="12.5" y2="7"/><line x1="3.1" y1="3.1" x2="4.1" y2="4.1"/><line x1="9.9" y1="9.9" x2="10.9" y2="10.9"/><line x1="10.9" y1="3.1" x2="9.9" y2="4.1"/><line x1="4.1" y1="9.9" x2="3.1" y2="10.9"/></svg>,
    lock:     <svg {...props}><rect x="2" y="7" width="10" height="7" rx="1.5"/><path d="M4.5,7 V5A2.5,2.5 0 0 1 9.5,5 V7"/><circle cx="7" cy="10.5" r="1.2" fill={color} stroke="none"/></svg>,
    question: <svg {...props}><path d="M3,4.5A4,4 0 1 1 9,7.5Q8,9.5 7,10"/><circle cx="7" cy="12.5" r="1" fill={color} stroke="none"/></svg>,
    signal:   <svg {...props} fill={color} stroke="none"><rect x="1" y="9" width="3" height="5" rx="0.5"/><rect x="5.5" y="6" width="3" height="8" rx="0.5"/><rect x="10" y="3" width="3" height="11" rx="0.5"/></svg>,
    xCircle:  <svg {...props}><circle cx="7" cy="7" r="5.5"/><line x1="4.5" y1="4.5" x2="9.5" y2="9.5"/><line x1="9.5" y1="4.5" x2="4.5" y2="9.5"/></svg>,
    muscle:   <svg {...props}><path d="M4.5,12Q2,10 2,7Q2,4 4.5,3.5Q5.5,1.5 7.5,2.5L10,4Q12,5.5 11.5,7.5Q10.5,10 8.5,9.5Q7.5,12 5.5,13Q4.8,12.5 4.5,12Z"/></svg>,
    medal:    <svg {...props}><circle cx="7" cy="6" r="4.5"/><path d="M3.5,10.5L1.5,13.5H12.5L10.5,10.5"/><text x="7" y="8" textAnchor="middle" fontSize="5" fill={color} stroke="none">2</text></svg>,
    star:     <svg {...props} fill={color} stroke="none"><polygon points="7,1 8.8,5.5 13.5,5.5 9.8,8.5 11.2,13 7,10.2 2.8,13 4.2,8.5 0.5,5.5 5.2,5.5"/></svg>,
    globe:    <svg {...props}><circle cx="7" cy="7" r="6"/><ellipse cx="7" cy="7" rx="2.8" ry="6"/><line x1="1" y1="7" x2="13" y2="7"/></svg>,
    antenna:  <svg {...props}><circle cx="6" cy="8" r="1.2" fill={color} stroke="none"/><path d="M3.5,5.5A3.5,3.5 0 0 1 8.5,10.5"/><path d="M1.5,3A6.5,6.5 0 0 1 11.5,13"/><line x1="6" y1="8" x2="12" y2="2"/><line x1="11" y1="1" x2="14" y2="4"/></svg>,
    dot:      <svg {...props} fill={color} stroke="none"><circle cx="7" cy="7" r="4.5"/></svg>,
    trend:    <svg {...props}><polyline points="1,11 4,7 7,8.5 12,3"/></svg>,
  };
  return icons[name] || <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.4"><circle cx="7" cy="7" r="5.5"/></svg>;
}

/* ══ مكوّن المخطط الشمعي المصغّر (احتياطي) ══ */
/* ══ مكوّن المخطط الشمعي المصغّر (احتياطي) ══ */
/* ══ SignalsPanel ══ */
function SignalsPanel({allData, C, LC, scoreWord}){
  var [show, setShow] = React.useState(false);
  var signalData = [...allData].sort(function(a,b){ return b.health.score-a.health.score; });
  var buyN   = allData.filter(function(d){ return d.health.score>=75; }).length;
  var watchN = allData.filter(function(d){ return d.health.score>=60&&d.health.score<75; }).length;
  var reduceN= allData.filter(function(d){ return d.health.score<45; }).length;
  return(
    <div style={{padding:"0 16px 10px"}}>
      <button
        onClick={function(){ setShow(function(s){ return !s; }); }}
        style={{
          width:"100%", padding:"10px 16px",
          background:LC.layer2, border:"1px solid "+LC.line,
          borderRadius:10, color:LC.ink,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          cursor:"pointer", fontSize:13, fontWeight:600,
          direction:"rtl",
        }}
      >
        <span>الإشارات النشطة</span>
        <span style={{display:"flex",gap:8,alignItems:"center"}}>
          {buyN>0&&<span style={{background:C.mint+"22",color:C.mint,padding:"2px 8px",borderRadius:6,fontSize:11}}>{buyN} شراء</span>}
          {watchN>0&&<span style={{background:C.amber+"22",color:C.amber,padding:"2px 8px",borderRadius:6,fontSize:11}}>{watchN} مراقبة</span>}
          {reduceN>0&&<span style={{background:C.coral+"22",color:C.coral,padding:"2px 8px",borderRadius:6,fontSize:11}}>{reduceN} تخفيف</span>}
          <span style={{fontSize:10,color:LC.ash}}>{show?"▲":"▼"}</span>
        </span>
      </button>
      {show&&(
        <div style={{
          background:LC.layer1, border:"1px solid "+LC.line,
          borderRadius:"0 0 10px 10px", borderTop:"none",
          maxHeight:220, overflowY:"auto", direction:"rtl",
        }}>
          {signalData.slice(0,8).map(function(d){
            var h=d.health;
            var color=h.score>=75?C.mint:h.score>=60?C.amber:h.score<45?C.coral:LC.ash;
            return(
              <div key={d.stk.sym} style={{
                display:"flex",alignItems:"center",gap:10,
                padding:"8px 12px", borderBottom:"1px solid "+LC.edge,
              }}>
                <span style={{fontSize:11,fontWeight:700,color:color,minWidth:30}}>{h.score}</span>
                <span style={{fontSize:11,color:LC.ink,flex:1}}>{d.stk.name}</span>
                <span style={{fontSize:10,color:LC.ash}}>{d.stk.sym}</span>
                <span style={{fontSize:10,fontWeight:600,color:color}}>{h.sig}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



function BreadthTooltip(){
  var [show, setShow] = useState(false);
  return(
    <div style={{position:"relative"}}>
      <button onClick={function(){ setShow(function(s){ return !s; }); }} style={{
        width:14,height:14,borderRadius:"50%",
        background:C.layer3,border:"1px solid "+C.line,
        cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,
      }}>
        <span style={{fontSize:8,fontWeight:700,color:C.smoke}}>؟</span>
      </button>
      {show&&(
        <div style={{
          position:"absolute",bottom:20,right:0,width:200,
          background:C.layer2,border:"1px solid "+C.line,
          borderRadius:10,padding:"10px 12px",
          zIndex:99,boxShadow:"0 8px 24px rgba(0,0,0,.4)",
        }}>
          <div style={{fontSize:9,fontWeight:700,color:C.snow,marginBottom:4}}>اتساع السوق</div>
          <div style={{fontSize:8,color:C.mist,lineHeight:1.6}}>
            يقيس كم سهم يرتفع مقابل كم سهم ينخفض. مثلاً: 7 من 10 أسهم ترتفع = اتساع 70% يعني سوق صاعد حقيقي. يكشف إذا كان الصعود واسعاً أم مصطنعاً من سهم واحد كبير فقط.
          </div>
        </div>
      )}
    </div>
  );
}



/* ══════════════════════════════════════════════════════════
   مصفوفة الارتباط بين الأسهم
   Pearson correlation of daily returns
   ══════════════════════════════════════════════════════════ */
function CorrelationMatrix({ allData, C }) {
  var [open, setOpen] = React.useState(false);
  var matrix = React.useMemo(function(){
    if (!open) return null;
    // Compute returns for each stock
    var stockReturns = allData.slice(0,8).map(function(d){
      return {
        sym: d.stk.sym, name: d.stk.name.slice(0,6),
        rets: d.bars.slice(-30).map(function(b){ return b.pct||0; }),
      };
    });
    // Pearson correlation
    function pearson(a, b) {
      var n = Math.min(a.length, b.length);
      var ma = a.slice(0,n).reduce(function(s,v){return s+v;},0)/n;
      var mb = b.slice(0,n).reduce(function(s,v){return s+v;},0)/n;
      var num=0, da=0, db2=0;
      for (var i=0;i<n;i++){
        num += (a[i]-ma)*(b[i]-mb);
        da  += (a[i]-ma)*(a[i]-ma);
        db2 += (b[i]-mb)*(b[i]-mb);
      }
      var denom = Math.sqrt(da*db2);
      return denom ? +(num/denom).toFixed(2) : 0;
    }
    return stockReturns.map(function(r1){ return stockReturns.map(function(r2){
      return pearson(r1.rets, r2.rets);
    }); });
  }, [allData, open]);

  if (!allData || !allData.length) return null;
  var stocks = allData.slice(0,8);

  return(
    <div style={{marginTop:16}}>
      <button onClick={function(){setOpen(function(v){return !v;});}} style={{
        width:"100%",padding:"9px",borderRadius:12,
        background:open?"linear-gradient(135deg,"+C.plasma+"22,"+C.plasma+"11)":C.layer2,
        border:"1px solid "+(open?C.plasma+"55":C.line),
        color:open?C.plasma:C.smoke,fontSize:10,cursor:"pointer",fontWeight:700,
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
      }}>
        <span>⬡</span> مصفوفة الارتباط بين الأسهم
        <span style={{fontSize:8,color:C.ash}}>(آخر 30 يوم)</span>
      </button>
      {open&&matrix&&(
        <div style={{
          marginTop:8,overflowX:"auto",
          background:C.layer2,borderRadius:14,padding:"12px",
          border:"1px solid "+C.line,
        }}>
          <div style={{fontSize:8,color:C.smoke,marginBottom:8}}>
            المحور: عوائد يومية · 1.00=ارتباط تام · -1.00=عكسي تام
          </div>
          <table style={{borderCollapse:"collapse",width:"100%",direction:"rtl"}}>
            <thead>
              <tr>
                <th style={{fontSize:7,padding:"3px",color:C.ash}}></th>
                {stocks.map(function(d,i){return(
                  <th key={i} style={{fontSize:7,padding:"3px 4px",color:C.smoke,fontWeight:700,textAlign:"center"}}>
                    {d.stk.sym}
                  </th>
                );})}
              </tr>
            </thead>
            <tbody>
              {stocks.map(function(d,i){return(
                <tr key={i}>
                  <td style={{fontSize:7,padding:"3px 4px",color:C.smoke,fontWeight:700,whiteSpace:"nowrap"}}>
                    {d.stk.name.slice(0,6)}
                  </td>
                  {matrix[i].map(function(corr,j){
                    var abs = Math.abs(corr);
                    var isPos = corr >= 0;
                    var alpha = abs * 0.7;
                    var bg = i===j ? C.gold+"33"
                           : isPos ? "rgba(16,201,126,"+alpha+")"
                           : "rgba(240,79,90,"+alpha+")";
                    return(
                      <td key={j} style={{
                        fontSize:8,padding:"4px 5px",textAlign:"center",
                        background:bg,
                        color:abs>0.6?C.snow:abs>0.3?C.mist:C.ash,
                        fontWeight:abs>0.6?700:400,
                        borderRadius:4,
                      }}>
                        {i===j?"1.00":corr.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              );})}
            </tbody>
          </table>
          <div style={{marginTop:8,display:"flex",gap:12,flexWrap:"wrap"}}>
            {[{c:C.mint,l:"ارتباط إيجابي"},{c:C.coral,l:"ارتباط عكسي"},{c:C.gold,l:"نفس السهم"}].map(function(it,i){
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:10,height:10,borderRadius:3,background:it.c+"66"}}/>
                  <span style={{fontSize:7,color:C.smoke}}>{it.l}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LayerIcon({id, color, size}){
  size = size||22;
  var s = {width:size,height:size,display:"block",flexShrink:0};
  var icons = {
    L9: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 2C12 2 5 9 5 14a7 7 0 0 0 14 0C19 9 12 2 12 2z"/>
          <path d="M12 14 Q10 11 12 8 Q14 11 12 14" strokeWidth="1.2" opacity=".6"/>
        </svg>,
    L1: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <polyline points="3,17 8,12 12,15 17,8 21,10"/>
          <line x1="3" y1="20" x2="21" y2="20" strokeWidth="1.2"/>
        </svg>,
    L4: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9"/>
          <line x1="12" y1="3" x2="12" y2="12"/>
          <polyline points="12,12 17,7"/>
        </svg>,
    L5: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="5" cy="12" r="2.5"/>
          <circle cx="12" cy="12" r="2.5"/>
          <circle cx="19" cy="12" r="2.5"/>
          <line x1="7.5" y1="12" x2="9.5" y2="12"/>
          <line x1="14.5" y1="12" x2="16.5" y2="12"/>
        </svg>,
    L7: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
          <circle cx="12" cy="12" r="5"/>
          <circle cx="12" cy="12" r="2" fill={color} stroke="none"/>
        </svg>,
    L8: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="5"/>
          <circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/>
        </svg>,
    L6: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="6" width="18" height="12" rx="2"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <line x1="8" y1="10" x2="8" y2="18"/>
        </svg>,
    L2: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="14" width="4" height="6" rx="1"/>
          <rect x="10" y="10" width="4" height="10" rx="1"/>
          <rect x="17" y="6" width="4" height="14" rx="1"/>
          <polyline points="5,10 12,7 19,3" strokeWidth="1.3" opacity=".7"/>
        </svg>,
    L3: <svg style={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 12 Q6 6 9 12 Q12 18 15 12 Q18 6 21 12"/>
        </svg>,
  };
  return icons[id] || null;
}



export {
  ParticleCanvas, ArcRing, KPIChip, MiniChart, StoryChart,
  Icon, SignalsPanel, BreadthTooltip, CorrelationMatrix, LayerIcon,
  C,
};
