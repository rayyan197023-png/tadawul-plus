'use client';
/**
 * @module PortfolioScreen
 * @description شاشة المحفظة — تحليل الأداء وإدارة المراكز
 *
 * الوظائف الرئيسية:
 * - getDecision()    : توصية مبنية على محرك 9 الطبقات
 * - exportToCSV()    : تصدير المحفظة والصفقات
 * - closeTrade()     : تسجيل الصفقات المغلقة
 * - zakatCalc        : حساب الزكاة (2.5% عند بلوغ النصاب)
 *
 * @requires ../engines/analysisEngine stockHealth
 */
/**
 * PORTFOLIO SCREEN — محفظة تداول+
 * Terminal Obsidian × Saudi Gold
 * مطابق 100٪ للملف الأصلي مع تحويل Next.js
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useHaptic } from '../hooks/useHaptic';
import { genBars, stockHealth, recordFeedback, calc9Layers, analyzeStockRadar } from '../engines/analysisEngine';
import { calcSmartStopLoss, calcSmartTakeProfit, calcTrailingStop, calcPositionHealth, calcSmartAction, calcPortfolioBalance } from '../engines/positionEngine';
import { analyzePortfolio, addIntelligenceLayer, generatePortfolioValueChart, generateDrawdownChart, generateMonthlyReturnsHeatmap, generateRiskReturnScatter, generateCorrelationHeatmap, generateVaRDistribution } from '../engines/portfolioEngine';
import { analyzePortfolioIQ } from '../engines/portfolioIQ';
import RiskDashboard from '../components/RiskDashboard';
import Tooltip from '../components/Tooltip';
import PortfolioValueChart from '../components/charts/PortfolioValueChart';
import DrawdownChart from '../components/charts/DrawdownChart';
import MonthlyReturnsHeatmap from '../components/charts/MonthlyReturnsHeatmap';
import RiskReturnScatter from '../components/charts/RiskReturnScatter';
import CorrelationHeatmap from '../components/charts/CorrelationHeatmap';
import VaRDistributionChart from '../components/charts/VaRDistributionChart';
import { RISK_FREE_RATE, HEALTH_GRADES } from '../constants/portfolioConfig';
import { STOCKS } from '../constants/stocksData';
import { useNav } from '../store';
import { TAB_IDS } from '../constants/navigation';

/* ======================================================
   محفظة تداول+ - Terminal Obsidian x Saudi Gold
   نفس DNA الرئيسية بالضبط
====================================================== */

const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#141d2b", layer2:"#1e2d42", layer3:"#243352",
  edge:"#2e3e60", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878", goldD:"#c09030",
  electric:"#4d9fff", electricL:"#82c0ff",
  plasma:"#a78bfa", mint:"#1ee68a", coral:"#ff5f6a",
  amber:"#fbbf24", teal:"#22d3ee",
};

function SvgIcon(props) {
  var name=props.name, size=props.size||16, color=props.color||"currentColor";
  var s=size;
  var p={fill:"none",stroke:color,strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round"};
  if(name==="buy")       return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><polyline points="2,12 6,7 10,9 14,4"/><polyline points="10,4 14,4 14,8"/></svg>;
  if(name==="sell")      return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><polyline points="2,4 6,9 10,7 14,12"/><polyline points="10,12 14,12 14,8"/></svg>;
  if(name==="add")       return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><line x1="8" y1="13" x2="8" y2="3"/><polyline points="4,7 8,3 12,7"/><line x1="5" y1="12" x2="11" y2="12"/></svg>;
  if(name==="hold")      return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><path d="M8,2 L13,4.5 L13,9 C13,12 8,14.5 8,14.5 C8,14.5 3,12 3,9 L3,4.5 Z"/><polyline points="5.5,8.5 7.5,10.5 11,6.5"/></svg>;
  if(name==="wait")      return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><path d="M4,2h8M4,14h8"/><path d="M5,2c0,3 3,5 3,5s3,2 3,5"/><path d="M11,2c0,3 -3,5 -3,5s-3,2 -3,5"/></svg>;
  if(name==="watch")     return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><path d="M1,8 C1,8 4,3 8,3 C12,3 15,8 15,8 C15,8 12,13 8,13 C4,13 1,8 1,8Z"/><circle cx="8" cy="8" r="2.5"/></svg>;
  if(name==="stop")      return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><circle cx="8" cy="8" r="6"/><line x1="5.5" y1="5.5" x2="10.5" y2="10.5"/><line x1="10.5" y1="5.5" x2="5.5" y2="10.5"/></svg>;
  if(name==="danger")    return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><path d="M8,2 L14.5,14 L1.5,14 Z"/><line x1="8" y1="6.5" x2="8" y2="10"/><circle cx="8" cy="12.5" r=".6" fill={color} stroke="none"/></svg>;
  if(name==="block")     return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><circle cx="8" cy="8" r="6"/><line x1="4.5" y1="4.5" x2="11.5" y2="11.5"/></svg>;
  if(name==="portfolio") return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><rect x="1.5" y="5" width="13" height="9" rx="2"/><path d="M5.5,5 L5.5,3.5 C5.5,2.7 6.2,2 7,2 L9,2 C9.8,2 10.5,2.7 10.5,3.5 L10.5,5"/><line x1="1.5" y1="9" x2="14.5" y2="9"/></svg>;
  if(name==="log")       return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><rect x="3" y="1.5" width="10" height="13" rx="1.5"/><line x1="5.5" y1="5.5" x2="10.5" y2="5.5"/><line x1="5.5" y1="8" x2="10.5" y2="8"/><line x1="5.5" y1="10.5" x2="8.5" y2="10.5"/></svg>;
  if(name==="compare")   return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><line x1="2" y1="14" x2="14" y2="14"/><rect x="3" y="7" width="3" height="7" rx="1"/><rect x="6.5" y="4" width="3" height="10" rx="1"/><rect x="10" y="9" width="3" height="5" rx="1"/></svg>;
  if(name==="trophy")    return <svg width={s} height={s} viewBox="0 0 16 16" {...p}><path d="M5,2 L11,2 L11,7 C11,10 8,11 8,11 C8,11 5,10 5,7 Z"/><path d="M3,3 L5,3 L5,6.5 C3.5,6 3,4.5 3,3Z"/><path d="M11,3 L13,3 L13,6.5 C14.5,6 13,4.5 13,3Z"/><line x1="8" y1="11" x2="8" y2="13"/><line x1="5.5" y1="13.5" x2="10.5" y2="13.5"/></svg>;
  if(name==="urgent")    return <svg width={s} height={s} viewBox="0 0 16 16" fill={color} stroke="none"><polygon points="9,1 3,9 7.5,9 7,15 13,7 8.5,7"/></svg>;
  return null;
}

function getDecision(p) {
    // ✨ Strategic Insight (Portfolio IQ Integration)
  var strategicInsight = null;
  if (p.curWeightPct !== undefined && p.curWeightPct > 0) {
    var weight = p.curWeightPct;
    var alerts = [];
    var severity = 'info';
    var recommendedAction = null;
    
    if (weight > 35) {
      alerts.push({
        message: 'مركز كبير جداً (' + weight.toFixed(1) + '%)',
        suggestion: 'خطر تركيز عالٍ',
        icon: '🔴',
      });
      severity = 'danger';
    } else if (weight > 30) {
      alerts.push({
        message: 'وزن مرتفع جداً (' + weight.toFixed(1) + '%)',
        suggestion: 'الموصى: 20% أو أقل',
        icon: '🚨',
      });
      severity = 'danger';
    } else if (weight > 25) {
      alerts.push({
        message: 'وزن مرتفع (' + weight.toFixed(1) + '%)',
        suggestion: 'فكّر في التخفيف',
        icon: '⚠️',
      });
      severity = 'warning';
    }
    
    // ✨ حساب الحل المقترح
    if (alerts.length > 0 && p.value > 0 && p.qty > 0) {
      // الوزن المستهدف بناءً على الشدة
      var targetWeight = severity === 'danger' ? 25 : 20;
      
      // إذا الوزن > 35%, نخفّض إلى 20%
      if (weight > 35) targetWeight = 20;
      
      // النسبة المئوية للبيع
      var sellPercent = ((weight - targetWeight) / weight) * 100;
      
      // الكمية المقترحة للبيع
      var sellQty = Math.round((p.qty * sellPercent) / 100);
      
      // القيمة المقترحة للبيع
      var pricePerShare = p.value / p.qty;
      var sellValue = Math.round(sellQty * pricePerShare);
      
      // تأثير على HHI (تقريبي)
      // HHI الحالي = (weight)^2 + ...
      // HHI الجديد = (targetWeight)^2 + ...
      var hhiCurrent = weight * weight;  // مساهمة هذا السهم
      var hhiAfter = targetWeight * targetWeight;
      var hhiReduction = ((hhiCurrent - hhiAfter) / hhiCurrent) * 100;
      
      // تأثير على Volatility (تقريبي)
      var volReduction = Math.min(15, weight - targetWeight) / 5;
      
      // تأثير على Sharpe (تقريبي)
      var sharpeImprovement = (weight - targetWeight) / 100;
      
      // مستوى التنويع
      var diversificationBefore = weight > 50 ? 'ضعيف جداً' : 
                                   weight > 35 ? 'ضعيف' : 
                                   'متوسط';
      var diversificationAfter = targetWeight > 25 ? 'متوسط' : 'جيد';
      
      recommendedAction = {
        targetWeight: targetWeight,
        sellPercent: +sellPercent.toFixed(1),
        sellQty: sellQty,
        sellValue: sellValue,
        impact: {
          hhi: {
            change: '-' + hhiReduction.toFixed(0) + '%',
            description: 'انخفاض HHI',
          },
          volatility: {
            change: '-' + volReduction.toFixed(1) + '%',
            description: 'تقلبات أقل',
          },
          sharpe: {
            change: '+' + sharpeImprovement.toFixed(2),
            description: 'Sharpe أفضل',
          },
          diversification: {
            before: diversificationBefore,
            after: diversificationAfter,
            description: 'تنويع المحفظة',
          },
        },
      };
    }
    
    if (alerts.length > 0) {
      strategicInsight = {
        alerts: alerts,
        severity: severity,
        weight: weight,
        recommendedAction: recommendedAction,
      };
    }
  }
  
  
  // ✨ إذا smartAction متوفر، استخدمه (Bloomberg-level)
  if(p.smartAction) {
    var sa = p.smartAction;
    var iconMap = {
      'بيع كامل': 'sell',
      'بيع 75%': 'sell',
      'بيع 50%': 'sell',
      'بيع 33%': 'sell',
      'بيع 25%': 'sell',
      'بيع جزئي': 'sell',
      'وقف خسارة': 'stop',
      'زد المركز': 'add',
      'اشتري': 'buy',
      'احتفظ': 'hold',
      'انتظر': 'watch',
      'لا تدخل': 'block',
    };
    
    return {
      act: sa.action,
      pct: sa.percent,
      color: sa.color,
      icon: iconMap[sa.action] || 'hold',
      reason: sa.reason,
      detail: sa.positionHealth ? 
        `صحة المركز: ${sa.positionHealth.composite}/100 (${sa.positionHealth.label}) · ${sa.positionHealth.daysHeld} يوم · ثقة ${sa.confidence}%` :
        `ثقة ${sa.confidence}%`,
      urgent: sa.urgency === 'critical' || sa.urgency === 'high',
      upside: null,
      rr: sa.targets ? sa.targets.expectedRR : null,
      // ✨ بيانات إضافية من Smart Engine
      smartData: {
        stopPrice: sa.stopData ? sa.stopData.stopPrice : null,
        stopPct: sa.stopData ? sa.stopData.stopPct : null,
        targets: sa.targets,
        positionHealth: sa.positionHealth,
                confidence: sa.confidence,
      },
      strategicInsight: strategicInsight,
    };
  }
  
  // ── Fallback: Logic القديم (إذا smartAction غير متوفر) ──
  var sig=p.health?p.health.sig||"":"", score=p.health?p.health.score||50:50;
  var ps=p.health?p.health.positionSize||{pct:10,b:1.5}:{pct:10,b:1.5};
  var gate=p.health?p.health.riskGate||"SAFE":"SAFE";
  var extras=p.health?p.health.extras||{}:{};
  var risk=p.health&&p.health.conviction?p.health.conviction.risk||{}:{};
  var pnl=p.pnlPct||0, wNow=p.curWeightPct||0, wRec=ps.pct||0;
  var ch=p.stk?p.stk.ch||0:0;
  var vr=extras.vr||1;
  var target=p.stk&&p.stk.target?p.stk.target:null;
  var upside=target&&p.curPrice?((target-p.curPrice)/p.curPrice*100):null;
  var vrText=vr>=1.5?"الحجم "+Math.round(vr*100-100)+"% فوق المعدل":"الحجم طبيعي";

  var atrStop = risk.stopLoss ? risk.stopLoss : null;
var trailStop = risk.trailingStop ? risk.trailingStop : null;
var stopPct = atrStop && p.curPrice > 0 
  ? ((p.curPrice - atrStop) / p.curPrice * 100) 
  : 7;
stopPct = Math.min(Math.abs(stopPct), 10);

  if(gate==="DANGER") return {act:"بيع كامل",pct:100,color:C.coral,icon:"danger",reason:"السوق في خطر نظامي - اغلق جميع المراكز فوراً",detail:"ضغط بيعي استثنائي على مستوى السوق كله",urgent:true,upside:null,rr:null};

  if(sig==="شراء قوي"&&score>=75) {
    if(wNow===0) return {act:"اشتري",pct:wRec,color:C.mint,icon:"buy",reason:"ادخل بـ "+wRec+"% . "+vrText+" . "+(ch>=0?"الزخم إيجابي":"تراجع طفيف - فرصة"),detail:(ch>=0?"الزخم إيجابي يدعم الدخول":"تراجع طفيف يمنح فرصة دخول أفضل")+(upside?" . السهم لديه مساحة صعود":""),urgent:false,upside:upside,rr:ps.b||1.5};
    if(wNow<wRec*0.75) return {act:"زد المركز",pct:Math.round(wRec-wNow),color:C.mint,icon:"add",reason:"أضف "+Math.round(wRec-wNow)+"% للوصول للحجم المثالي . "+vrText,detail:"المحرك يؤكد قوة الاتجاه . زيادة المركز الآن تحسّن متوسط الدخول",urgent:false,upside:upside,rr:ps.b||1.5};
    var trailText = trailStop&&p.curPrice>0?" . trailing stop: "+(p.curPrice-trailStop).toFixed(2)+" ر.س":"";
    return {act:"احتفظ",pct:0,color:C.teal,icon:"hold",reason:"المركز مثالي . الإشارة لا تزال قوية"+trailText,detail:"المحرك يؤكد الاحتفاظ . لا تتسرع في البيع"+(upside?" . السهم لم يبلغ هدفه بعد":""),urgent:false,upside:upside,rr:ps.b||1.5};
  }

  if(sig==="مراقبة") {
    if(pnl>20) return {act:"بيع جزئي",pct:30,color:C.amber,icon:"sell",reason:"ربح "+pnl.toFixed(1)+"% - احجز 30% والمحرك لم يعد قوياً",detail:"السيولة الذكية تتباطأ . الإشارة تراجعت من شراء قوي",urgent:false,upside:upside,rr:ps.b||1.5};
    if(pnl<-stopPct) return {act:"وقف خسارة",pct:100,color:C.coral,icon:"stop",reason:"خسارة "+Math.abs(pnl).toFixed(1)+"% تجاوزت حد الـ "+stopPct.toFixed(1)+"% (ATR-based) - أغلق",detail:"الدفاع عن رأس المال أولاً . حد الخسارة محسوب على أساس تقلب السهم الفعلي",urgent:true,upside:null,rr:null};
    return {act:"انتظر",pct:0,color:C.amber,icon:"watch",reason:"الإشارة تراجعت من شراء قوي . الزخم يتباطأ",detail:"لا تزد ولا تبع حتى يتضح الاتجاه . انتظر تأكيداً جديداً",urgent:false,upside:upside,rr:null};
  }

  if(sig==="تخفيف"||score<45) {
    if(pnl>5) return {act:"بيع 50%",pct:50,color:C.coral,icon:"danger",reason:"ربح "+pnl.toFixed(1)+"% مع ضغط بيعي - احجز الآن",detail:"السيولة الذكية تخرج . الحجم دون المعدل . خطر انقلاب",urgent:true,upside:null,rr:null};
    return {act:"بيع كامل",pct:100,color:C.coral,icon:"sell",reason:"ضغط بيعي مرتفع . المحرك يرى تدهوراً في الجودة",detail:"استخدم رأس المال في فرص أفضل . لا تتمسك بمركز خاسر",urgent:true,upside:null,rr:null};
  }

  if(wNow===0) return {act:"لا تدخل",pct:0,color:C.smoke,icon:"block",reason:"الإشارة لا تستوفي معايير الدخول",detail:"ننتظر تحسن السيولة والزخم . لا تتعجل الدخول",urgent:false,upside:upside,rr:null};
  if(pnl>10) return {act:"بيع 25%",pct:25,color:C.amber,icon:"sell",reason:"ربح "+pnl.toFixed(1)+"% مع إشارة محايدة . خفف المخاطرة",detail:"خذ 25% من الأرباح . احتفظ بـ 75% للاحتمال الصاعد",urgent:false,upside:upside,rr:null};
  return {act:"انتظر",pct:0,color:C.smoke,icon:"wait",reason:"إشارة محايدة . لا حافز للتحرك الآن",detail:"انتظر تحسن الإشارة قبل أي قرار . الصبر استراتيجية",urgent:false,upside:upside,rr:null};
}


/* == Donut Chart - توزيع المحفظة == */
function DonutChart(props) {
  var positions=props.positions, tv=props.tv;
  if(!positions||positions.length===0) return null;
  var cx=70, cy=70, r=54, r2=38;
  var colors=[C.electric,C.mint,C.gold,C.coral,C.plasma,C.amber,C.teal];
  var slices=[];
  var angle=-Math.PI/2;
  positions.forEach(function(p,i){
    var pct=p.value/tv;
    var sweep=pct*2*Math.PI;
    var x1=cx+r*Math.cos(angle), y1=cy+r*Math.sin(angle);
    var x2=cx+r*Math.cos(angle+sweep), y2=cy+r*Math.sin(angle+sweep);
    var x3=cx+r2*Math.cos(angle+sweep), y3=cy+r2*Math.sin(angle+sweep);
    var x4=cx+r2*Math.cos(angle), y4=cy+r2*Math.sin(angle);
    var large=sweep>Math.PI?1:0;
    slices.push({d:"M"+x1+","+y1+" A"+r+","+r+" 0 "+large+",1 "+x2+","+y2+" L"+x3+","+y3+" A"+r2+","+r2+" 0 "+large+",0 "+x4+","+y4+" Z",color:colors[i%colors.length],pct:Math.round(pct*100),name:p.stk.name,pnlPct:p.pnlPct,cost:p.cost,value:p.value});
    angle+=sweep;
  });
  return (
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <div style={{flexShrink:0}}>
        <svg width={140} height={140}>
          {slices.map(function(s,i){return <path key={i} d={s.d} fill={s.color} opacity={.88} style={{filter:"drop-shadow(0 2px 6px rgba(0,0,0,.5))"}}/>;}) }
          <circle cx={cx} cy={cy} r={32} fill={C.layer1}/>
          <text x={cx} y={cy-7} textAnchor="middle" fill={C.snow} fontSize={13} fontWeight={900} fontFamily="IBM Plex Mono,monospace">{slices.length}</text>
          <text x={cx} y={cy+8} textAnchor="middle" fill={C.smoke} fontSize={9} fontFamily="Cairo,sans-serif">سهم</text>
        </svg>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
        {slices.map(function(s,i){return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:3,height:24,borderRadius:2,background:s.color,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:C.mist,fontWeight:700}}>{s.name}</div>
              <div style={{display:"flex",gap:8,marginTop:1,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:s.color,fontFamily:"IBM Plex Mono,monospace",fontWeight:800}}>{s.pct}%</span>
                <span style={{fontSize:11,color:s.pnlPct>=0?C.mint:C.coral,fontFamily:"IBM Plex Mono,monospace",fontWeight:800}}>({Math.round(s.value).toLocaleString("en-US")} ر)</span>
                <span style={{fontSize:11,color:s.pnlPct>=0?C.mint:C.coral,fontFamily:"IBM Plex Mono,monospace"}}>{s.pnlPct>=0?"+":""}{s.pnlPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        );}) }
      </div>
    </div>
  );
}

function PerfChart(props) {
  var history=props.history;
  if(!history||history.length<2) return null;
  var W=320, H=100, padX=8, padY=12;
  var vals=history.map(function(h){return h.v;});
  var mn=Math.min.apply(null,vals)*0.998, mx=Math.max.apply(null,vals)*1.002;
  var range=mx-mn||1;
  var isUp=vals[vals.length-1]>=vals[0];
  var lineColor=isUp?C.mint:C.coral;
  var pts=history.map(function(h,i){
    return {x:padX+(i/(history.length-1))*(W-padX*2), y:H-padY-((h.v-mn)/range)*(H-padY*2), v:h.v, d:h.date};
  });
  var polyline=pts.map(function(p){return p.x+","+p.y;}).join(" ");
  var first=pts[0], last=pts[pts.length-1];
  var areaPath="M"+first.x+","+first.y+" L"+pts.slice(1).map(function(p){return p.x+","+p.y;}).join(" L")+" L"+last.x+","+(H-padY)+" L"+first.x+","+(H-padY)+" Z";
  var pctChange=((vals[vals.length-1]-vals[0])/vals[0]*100).toFixed(1);
  var maxIdx=vals.indexOf(Math.max.apply(null,vals));
  return (
    <div>
      <svg width="100%" height={H} viewBox={"0 0 "+W+" "+H} preserveAspectRatio="none">
        <defs>
          <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity=".35"/>
            <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0,1,2].map(function(i){var y=padY+i*(H-padY*2)/2; return <line key={i} x1={padX} y1={y} x2={W-padX} y2={y} stroke={C.line} strokeWidth=".5" strokeOpacity=".4"/>;})}
        <path d={areaPath} fill="url(#perfGrad)"/>
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={first.x} cy={first.y} r={2.5} fill={C.smoke}/>
        <circle cx={last.x} cy={last.y} r={4} fill={lineColor} opacity=".3"/>
        <circle cx={last.x} cy={last.y} r={2.5} fill={lineColor} style={{filter:"drop-shadow(0 0 5px "+lineColor+")"}}/>
        <circle cx={pts[maxIdx].x} cy={pts[maxIdx].y} r={2} fill={C.gold} opacity=".8"/>
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",padding:"0 8px",marginTop:-4}}>
        <span style={{fontSize:11,color:C.ash}}>{history[0].date.slice(5)}</span>
        <span style={{fontSize:11,fontWeight:800,color:lineColor,fontFamily:"IBM Plex Mono,monospace"}}>{isUp?"+":""}{pctChange}%</span>
        <span style={{fontSize:11,color:C.ash}}>{history[history.length-1].date.slice(5)}</span>
      </div>
    </div>
  );
}

function SummaryCard(props) {
  var positions=props.positions, tv=props.tv, tp=props.tp, tpP=props.tpP, dp=props.dp, capital=props.capital, tradeLog=props.tradeLog;

  // حالة جلسة تداول السعودية - تتحدث كل دقيقة
  var nowT_s=useState(new Date()); var nowT=nowT_s[0], setNowT=nowT_s[1];
  useEffect(function(){
    var t=setInterval(function(){setNowT(new Date());},60000);
    return function(){clearInterval(t);};
  },[]);
  var hour=nowT.getHours(), min=nowT.getMinutes();
  var timeVal=hour*60+min;
  var isSession=(timeVal>=10*60&&timeVal<15*60);
  var isPreOpen=(timeVal>=9*60+30&&timeVal<10*60);
  var sessionLabel=isSession?"الجلسة مفتوحة":isPreOpen?"ما قبل الفتح":"الجلسة مغلقة";
  var sessionColor=isSession?"#1ee68a":isPreOpen?"#fbbf24":"#ff5f6a";

  var fmt=function(n){return n.toLocaleString("en-US",{maximumFractionDigits:0});};
  var capitalUsed=tv, capitalFree=Math.max(0,capital-capitalUsed);
  var alpha=props.alpha||0, benchmarkReturn=props.benchmarkReturn||0;
  return (
    <div>
      {/* ── Alpha vs TASI ── */}
      {(tpP!==0||benchmarkReturn!==0)&&(
        <div style={{
          display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"8px 12px",marginBottom:8,
          background:alpha>=0?"rgba(16,201,126,.08)":"rgba(240,79,90,.08)",
          border:"1px solid "+(alpha>=0?"rgba(16,201,126,.25)":"rgba(240,79,90,.25)"),
          borderRadius:12,
        }}>
          <div>
            <div style={{fontSize:8,color:"#94a3b8",marginBottom:2}}>الأداء مقارنة بتاسي</div>
            <div style={{fontSize:9,color:"#94a3b8"}}>
              محفظتك: <span style={{color:tpP>=0?"#1ee68a":"#ff5f6a",fontWeight:700}}>{tpP>=0?"+":""}{tpP.toFixed(1)}%</span>
              {" · "}تاسي: <span style={{color:"#94a3b8"}}>{benchmarkReturn>=0?"+":""}{benchmarkReturn.toFixed(1)}%</span>
            </div>
          </div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:8,color:"#94a3b8",marginBottom:1}}>Alpha</div>
            <div style={{fontSize:18,fontWeight:900,color:alpha>=0?"#1ee68a":"#ff5f6a",lineHeight:1}}>
              {alpha>=0?"+":""}{alpha.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        <div style={{flex:1,background:C.electric+"08",borderRadius:12,padding:"8px 12px",border:"1px solid "+C.electric+"22"}}>
          <div style={{fontSize:11,color:C.smoke,marginBottom:3}}>مستثمر</div>
          <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:C.electric}}>{fmt(capitalUsed)} ر</div>
          <div style={{height:3,background:C.layer3,borderRadius:2,marginTop:5,overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.min(100,capitalUsed/capital*100)+"%",background:C.electric,borderRadius:2,transition:"width 1s ease"}}/>
          </div>
        </div>
        <div style={{flex:1,background:C.smoke+"06",borderRadius:12,padding:"8px 12px",border:"1px solid "+C.line}}>
          <div style={{fontSize:11,color:C.smoke,marginBottom:3}}>نقدي متاح</div>
          <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:C.smoke}}>{fmt(capitalFree)} ر</div>
          <div style={{height:3,background:C.layer3,borderRadius:2,marginTop:5,overflow:"hidden"}}>
            <div style={{height:"100%",width:Math.min(100,capitalFree/capital*100)+"%",background:C.smoke,borderRadius:2}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal(props) {
  var pos=props.pos, onClose=props.onClose, setPort=props.setPort, setTradeLog=props.setTradeLog;
  var eq=useState(String(pos.qty)); var eQty=eq[0], setEQty=eq[1];
  var ec=useState(pos.avgCost.toFixed(2)); var eCost=ec[0], setECost=ec[1];
  var cd=useState(false); var confirmDel=cd[0], setConfirmDel=cd[1];
  var newQty=parseFloat(eQty)||0, newCost=parseFloat(eCost)||0;
  var canSave=newQty>0&&newCost>0;
  var totalCost=newQty*newCost, origTotal=pos.qty*pos.avgCost;
  var diffPct=origTotal>0?(totalCost-origTotal)/origTotal*100:0;
  function doSave(){
    if(!canSave) return;
    
    // ✨ Validation شامل
    if (newQty <= 0) {
      alert('الكمية يجب أن تكون أكبر من صفر');
      return;
    }
    if (newCost <= 0) {
      alert('السعر يجب أن يكون أكبر من صفر');
      return;
    }
    if (newQty > 1000000) {
      alert('الكمية كبيرة جداً (الحد الأقصى: 1,000,000)');
      return;
    }
    if (newCost > 100000) {
      alert('السعر مرتفع جداً (الحد الأقصى: 100,000 ر.س)');
      return;
    }
    if (!Number.isFinite(newQty) || !Number.isFinite(newCost)) {
      alert('قيم غير صالحة');
      return;
    }
    
    setPort(function(prev){
      return prev.map(function(p){
        return p.sym !== pos.sym ? p : Object.assign({}, p, {qty: newQty, avgCost: newCost});
      });
    });
    onClose();
  }
  function doDelete(){
    setPort(function(prev){return prev.filter(function(p){return p.sym!==pos.sym;});});
    setTradeLog(function(prev){return [{id:Date.now(),sym:pos.sym,name:pos.sym,action:"بيع",qty:pos.qty,price:pos.curPrice||pos.avgCost,date:new Date().toISOString().slice(0,10),signal:"حذف يدوي",score:0}].concat(prev);});
    onClose();
  }
  function stopProp(e){e.stopPropagation();}
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(6,8,15,.92)",backdropFilter:"blur(14px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn .2s ease both"}} onClick={onClose}>
      <div onClick={stopProp} className="card-enter" style={{width:"100%",maxWidth:390,background:"linear-gradient(160deg,"+C.layer2+" 0%,"+C.deep+" 100%)",borderRadius:20,border:"1px solid "+C.line,boxShadow:"0 24px 64px rgba(0,0,0,.75),inset 0 1px 0 "+C.layer3,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:16,background:C.electric,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:800,color:C.snow}}>تعديل مركز</span>
            <span style={{fontSize:11,color:C.electric,background:C.electric+"15",borderRadius:6,padding:"1px 8px",border:"1px solid "+C.electric+"30"}}>{pos.sym}</span>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:"1px solid "+C.line,background:C.layer3,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><SvgIcon name="stop" size={12} color={C.smoke}/></button>
        </div>
        <div style={{padding:"16px 20px 20px"}}>
          <div style={{background:"rgba(255,255,255,.03)",borderRadius:12,padding:"10px 12px",marginBottom:14,border:"1px solid "+C.line+"44"}}>
            <div style={{display:"flex",gap:0}}>
              {[{l:"الكمية",v:pos.qty.toLocaleString("en-US"),c:C.mist},{l:"سعر الدخول",v:pos.avgCost.toFixed(2)+" ر",c:C.snow},{l:"الإجمالي",v:Math.round(pos.qty*pos.avgCost).toLocaleString("en-US")+" ر",c:C.electric}].map(function(s,i){return(
                <div key={i} style={{flex:1,textAlign:"center",borderRight:i<2?"1px solid "+C.line+"33":"none",padding:"0 6px"}}>
                  <div style={{fontSize:11,color:C.smoke,marginBottom:3}}>{s.l}</div>
                  <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                </div>
              );}) }
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:10}}>
            {[{l:"الكمية الجديدة",v:eQty,set:setEQty,ph:String(pos.qty)},{l:"سعر الشراء الجديد",v:eCost,set:setECost,ph:pos.avgCost.toFixed(2)}].map(function(f,i){return(
              <div key={i} style={{flex:1}}>
                <div style={{fontSize:12,color:C.smoke,fontWeight:700,marginBottom:5}}>{f.l}</div>
                <input type="number" value={f.v} onChange={function(e){f.set(e.target.value);}} placeholder={f.ph} style={{width:"100%",boxSizing:"border-box",background:C.layer3,border:"1px solid "+C.line,borderRadius:10,padding:"11px",fontSize:15,color:C.snow,fontFamily:"IBM Plex Mono,monospace",outline:"none",textAlign:"center"}} onKeyDown={function(e){if(e.key==="Enter"){haptic.tap();e.target.blur();}}} />
              </div>
            );}) }
          </div>
          {canSave&&(
            <div className="fade-in" style={{marginBottom:14,padding:"10px 12px",background:diffPct>=0?C.electric+"08":C.amber+"08",border:"1px solid "+(diffPct>=0?C.electric:C.amber)+"22",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:C.smoke}}>الإجمالي الجديد</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:diffPct>=0?C.electric:C.amber}}>{Math.round(totalCost).toLocaleString("en-US")} ر</div>
                <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,color:diffPct>=0?C.electric:C.amber,marginTop:1}}>{diffPct>=0?"+":""}{diffPct.toFixed(1)}%</div>
              </div>
            </div>
          )}
          {confirmDel?(
            <div className="fade-in">
              <div style={{marginBottom:10,padding:"10px 12px",background:C.coral+"10",border:"1px solid "+C.coral+"30",borderRadius:10,fontSize:11,color:C.coral,textAlign:"center"}}>هل تريد حذف مركز {pos.sym} كاملاً؟</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={doDelete} style={{flex:1,padding:"12px",background:"linear-gradient(135deg,"+C.coral+"44,"+C.coral+"22)",border:"1px solid "+C.coral+"55",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:900,color:C.coral,fontFamily:"Cairo,sans-serif"}}>تأكيد الحذف</button>
                <button onClick={function(){setConfirmDel(false);}} style={{flex:1,padding:"12px",background:"rgba(255,255,255,.04)",border:"1px solid "+C.line,borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:700,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>إلغاء</button>
              </div>
            </div>
          ):(
            <div style={{display:"flex",gap:8}}>
              <button onClick={doSave} style={{flex:2,padding:"12px",background:canSave?"linear-gradient(135deg,"+C.electric+"33,"+C.electric+"18)":"rgba(255,255,255,.04)",border:"1px solid "+(canSave?C.electric+"44":C.line),borderRadius:12,cursor:canSave?"pointer":"default",fontSize:13,fontWeight:800,color:canSave?C.electric:C.smoke,fontFamily:"Cairo,sans-serif",transition:"all .2s"}}>حفظ التعديل</button>
              <button onClick={function(){setConfirmDel(true);}} style={{flex:1,padding:"12px",background:"linear-gradient(135deg,"+C.coral+"18,"+C.coral+"08)",border:"1px solid "+C.coral+"33",borderRadius:12,cursor:"pointer",fontSize:13,fontWeight:800,color:C.coral,fontFamily:"Cairo,sans-serif"}}>حذف</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card(props) {
  var p=props.p, i=props.i, capital=props.capital, setSellSheet=props.setSellSheet;
  var onEdit=props.onEdit;
  var d=useMemo(function(){return getDecision(p);},[p]);

  var score = p.health && p.health.score !== undefined && p.health.score !== null
  ? p.health.score
  : Math.min(95, Math.max(20, Math.round(50 + (p.pnlPct || 0) * 0.8 + (p.stk.ch || 0) * 3)));
  var grade=p.health?p.health.grade||"ض":score>=85?"م":score>=75?"ج":score>=65?"ب":score>=55?"م-":score>=45?"ض+":"ض";
  var gradeColor=score>=75?C.mint:score>=55?C.amber:C.coral;
  var circ=2*Math.PI*22;
  var urgentAnim=d.urgent?"dangerPulse 2.4s ease-in-out infinite":d.color===C.mint?"buyGlow 3.2s ease-in-out infinite":"";
  var cardStyle={animationDelay:(i*.06)+"s",marginBottom:12,position:"relative"};
  if(urgentAnim) cardStyle.animation=urgentAnim;
  function handleSell(e)   { e.stopPropagation(); setSellSheet({sym:p.sym,name:p.stk.name,qty:p.qty,avgCost:p.avgCost,curPrice:p.curPrice}); }
  function handleEdit(e)   { e.stopPropagation(); onEdit(p); }

  // 1 Hierarchy بصري - بطاقات urgent أكبر وأبرز
  var isTop = d.urgent || d.color===C.mint;
  var cardBg = isTop
    ? "linear-gradient(145deg,"+C.layer1+" 0%,"+C.layer2+" 50%,"+d.color+"08 100%)"
    : "linear-gradient(135deg,"+C.layer1+","+C.layer2+")";
  var borderGlow = isTop
    ? "0 8px 32px "+d.color+"22, 0 2px 8px rgba(0,0,0,.4), inset 0 1px 0 "+C.layer3
    : "0 4px 16px rgba(0,0,0,.3), inset 0 1px 0 "+C.layer3;

  return (
    <div className="card-enter" style={cardStyle}>
      {/* 2 gradient border حقيقي - pseudo element بـ SVG trick */}
      <div style={{background:cardBg,borderRadius:18,border:"1px solid "+d.color+(isTop?"44":"25"),overflow:"hidden",boxShadow:borderGlow}}>

        {/* شريط علوي بـ gradient متدرج - أسمك للـ urgent */}
        <div style={{height:isTop?3:2,background:"linear-gradient(90deg,"+d.color+"00,"+d.color+(isTop?"ff":"bb")+","+d.color+"00)"}}/>

        {/* corner badge للـ urgent */}
        {d.urgent&&(
          <div style={{position:"absolute",top:0,left:0,background:"linear-gradient(135deg,"+C.coral+"33,"+C.coral+"11)",borderRadius:"18px 0 12px 0",padding:"4px 12px 4px 10px",fontSize:11,fontWeight:800,color:C.coral,display:"flex",alignItems:"center",gap:3}}>
            <SvgIcon name="urgent" size={8} color={C.coral}/>
            عاجل
          </div>
        )}

        <div style={{padding:"14px 14px 12px",paddingTop:d.urgent?"22px":"14px"}}>

          {/* الصف الرئيسي */}
          <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
            <div style={{flex:1,minWidth:0}}>

              {/* pill القرار - 3 أكبر وأوضح */}
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <div style={{background:"linear-gradient(135deg,"+d.color+"28,"+d.color+"12)",border:"1px solid "+d.color+"55",borderRadius:10,padding:"5px 14px",fontSize:13,fontWeight:900,color:d.color,display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px "+d.color+"22"}}>
                  <SvgIcon name={d.icon} size={12} color={d.color}/>
                  {d.act}{d.pct>0?" "+d.pct+"%":""}
                </div>
                <span style={{fontSize:11,color:C.smoke,background:C.layer3,borderRadius:4,padding:"1px 6px",border:"1px solid "+C.line}}>{p.sym}</span>

              </div>

              {/* اسم السهم - كبير وواضح */}
              <div style={{fontSize:isTop?22:19,fontWeight:900,color:C.snow,lineHeight:1.1,marginBottom:5,textShadow:"0 0 20px rgba(240,246,255,.15)"}}>{p.stk.name}</div>

              {/* السعر + التغير */}
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:18,fontWeight:800,color:C.snow,letterSpacing:"-0.5px"}}>{p.curPrice.toFixed(2)}</span>
                <span style={{fontSize:12,fontWeight:700,color:p.stk.ch>=0?C.mint:C.coral,background:(p.stk.ch>=0?C.mint:C.coral)+"18",borderRadius:6,padding:"2px 8px",border:"1px solid "+(p.stk.ch>=0?C.mint:C.coral)+"33"}}>{p.stk.ch>=0?"+":""}{(p.stk.ch||0).toFixed(2)}%</span>
                <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:800,color:p.pnlPct>=0?C.mint:C.coral,textShadow:p.pnlPct>=0?"0 0 8px #1ee68a66":"0 0 8px #ff5f6a66"}}>{p.pnlPct>=0?"+":""}{p.pnlPct.toFixed(1)}%</span>
              </div>
            </div>

            {/* دائرة الدرجة + المبلغ */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,flexShrink:0}}>
              <div style={{position:"relative",width:isTop?60:52,height:isTop?60:52}}>
                <svg width={isTop?60:52} height={isTop?60:52} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                  <circle cx={isTop?30:26} cy={isTop?30:26} r={isTop?25:22} fill="none" stroke={C.ash} strokeWidth={3} strokeOpacity={.2}/>
                  <circle cx={isTop?30:26} cy={isTop?30:26} r={isTop?25:22} fill="none" stroke={gradeColor} strokeWidth={3} strokeDasharray={isTop?2*Math.PI*25:circ} strokeDashoffset={(isTop?2*Math.PI*25:circ)*(1-score/100)} strokeLinecap="round" style={{filter:"drop-shadow(0 0 6px "+gradeColor+"aa)",transition:"stroke-dashoffset 1s ease"}}/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:isTop?16:14,fontWeight:900,color:gradeColor,lineHeight:1,textShadow:"0 0 10px "+gradeColor+"88"}}>{score}</div>
                  <div style={{fontSize:isTop?8:7,color:C.smoke,marginTop:1,fontWeight:700}}>{grade}</div>
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:p.pnlPct>=0?C.mint:C.coral,textShadow:p.pnlPct>=0?"0 0 8px #1ee68a55":"0 0 8px #ff5f6a55",whiteSpace:"nowrap"}}>{Math.round(p.qty*p.avgCost*(1+p.pnlPct/100)).toLocaleString("en-US")}</div>
                <div style={{fontSize:9,color:C.smoke,marginTop:1}}>ريال</div>
              </div>
            </div>
          </div>

          {/* سبب القرار + confidence meter + detail */}
          <div style={{background:"linear-gradient(135deg,"+d.color+"12,"+d.color+"06)",border:"1px solid "+d.color+"22",borderRadius:12,padding:"10px 12px",marginBottom:10}}>
            {/* السبب الرئيسي */}
            <div style={{fontSize:11,color:C.mist,lineHeight:1.6,marginBottom:8}}>{d.reason}</div>
            {/* detail */}
            {d.detail&&(
              <div style={{fontSize:12,color:C.smoke,lineHeight:1.5,borderTop:"1px solid "+d.color+"20",paddingTop:6}}>{d.detail}</div>
            )}
          </div>
          {/* ✨ Smart Position Panel - Bloomberg Level */}
          {d.smartData && d.smartData.stopPrice && (
            <div style={{
              background: "linear-gradient(135deg, " + C.layer3 + "60, " + C.layer2 + "40)",
              border: "1px solid " + C.line,
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 10,
            }}>
              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: "1px solid " + C.line + "44",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>🎯</span>
                  <span style={{fontSize:11,fontWeight:800,color:C.snow}}>إدارة المركز الذكية</span>
                </div>
                {d.smartData.confidence && (
                  <div style={{
                    fontSize:9,
                    color:d.smartData.confidence>=80?C.mint:d.smartData.confidence>=60?C.amber:C.coral,
                    background:(d.smartData.confidence>=80?C.mint:d.smartData.confidence>=60?C.amber:C.coral)+"15",
                    padding:"2px 8px",
                    borderRadius:6,
                    fontWeight:800,
                  }}>
                    ثقة {d.smartData.confidence}%
                  </div>
                )}
              </div>
              
              {/* Stop Loss + Targets Grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:d.smartData.targets?8:0}}>
                {/* Stop Loss */}
                <div style={{
                  background: C.coral + "10",
                  border: "1px solid " + C.coral + "30",
                  borderRadius: 8,
                  padding: "6px 8px",
                }}>
                  <div style={{fontSize:8,color:C.smoke,fontWeight:700,marginBottom:2}}>🛑 وقف الخسارة</div>
                  <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:C.coral}}>
                    {d.smartData.stopPrice.toFixed(2)}
                  </div>
                  <div style={{fontSize:9,color:C.coral,fontWeight:700}}>
                    {d.smartData.stopPct}%
                  </div>
                </div>
                
                {/* Position Health */}
                {d.smartData.positionHealth && (
                  <div style={{
                    background: (d.smartData.positionHealth.composite>=70?C.mint:d.smartData.positionHealth.composite>=50?C.amber:C.coral) + "10",
                    border: "1px solid " + (d.smartData.positionHealth.composite>=70?C.mint:d.smartData.positionHealth.composite>=50?C.amber:C.coral) + "30",
                    borderRadius: 8,
                    padding: "6px 8px",
                  }}>
                    <div style={{fontSize:8,color:C.smoke,fontWeight:700,marginBottom:2}}>💚 صحة المركز</div>
                    <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:d.smartData.positionHealth.composite>=70?C.mint:d.smartData.positionHealth.composite>=50?C.amber:C.coral}}>
                      {d.smartData.positionHealth.composite}
                    </div>
                    <div style={{fontSize:9,color:d.smartData.positionHealth.composite>=70?C.mint:d.smartData.positionHealth.composite>=50?C.amber:C.coral,fontWeight:700}}>
                      {d.smartData.positionHealth.label}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Take Profit Targets */}
              {d.smartData.targets && (
                <div>
                  <div style={{fontSize:9,color:C.smoke,fontWeight:700,marginBottom:5}}>🎯 أهداف جني الأرباح:</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                    {/* T1 */}
                    <div style={{
                      background: p.curPrice>=d.smartData.targets.t1.price ? C.mint+"25" : C.teal + "10",
                      border: "1px solid " + (p.curPrice>=d.smartData.targets.t1.price ? C.mint+"55" : C.teal + "25"),
                      borderRadius: 6,
                      padding: "5px 6px",
                      textAlign:"center",
                    }}>
                      <div style={{fontSize:7,color:C.smoke,fontWeight:700,marginBottom:1}}>T1 (33%)</div>
                      <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:900,color:p.curPrice>=d.smartData.targets.t1.price?C.mint:C.teal}}>
                        {d.smartData.targets.t1.price.toFixed(2)}
                      </div>
                      <div style={{fontSize:8,color:p.curPrice>=d.smartData.targets.t1.price?C.mint:C.teal,fontWeight:700}}>
                        +{d.smartData.targets.t1.pct}%
                      </div>
                    </div>
                    
                    {/* T2 */}
                    <div style={{
                      background: p.curPrice>=d.smartData.targets.t2.price ? C.mint+"25" : C.amber + "10",
                      border: "1px solid " + (p.curPrice>=d.smartData.targets.t2.price ? C.mint+"55" : C.amber + "25"),
                      borderRadius: 6,
                      padding: "5px 6px",
                      textAlign:"center",
                    }}>
                      <div style={{fontSize:7,color:C.smoke,fontWeight:700,marginBottom:1}}>T2 (33%)</div>
                      <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:900,color:p.curPrice>=d.smartData.targets.t2.price?C.mint:C.amber}}>
                        {d.smartData.targets.t2.price.toFixed(2)}
                      </div>
                      <div style={{fontSize:8,color:p.curPrice>=d.smartData.targets.t2.price?C.mint:C.amber,fontWeight:700}}>
                        +{d.smartData.targets.t2.pct}%
                      </div>
                    </div>
                    
                    {/* T3 */}
                    <div style={{
                      background: p.curPrice>=d.smartData.targets.t3.price ? C.mint+"25" : C.gold + "10",
                      border: "1px solid " + (p.curPrice>=d.smartData.targets.t3.price ? C.mint+"55" : C.gold + "25"),
                      borderRadius: 6,
                      padding: "5px 6px",
                      textAlign:"center",
                    }}>
                      <div style={{fontSize:7,color:C.smoke,fontWeight:700,marginBottom:1}}>T3 (34%)</div>
                      <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:900,color:p.curPrice>=d.smartData.targets.t3.price?C.mint:C.gold}}>
                        {d.smartData.targets.t3.price.toFixed(2)}
                      </div>
                      <div style={{fontSize:8,color:p.curPrice>=d.smartData.targets.t3.price?C.mint:C.gold,fontWeight:700}}>
                        +{d.smartData.targets.t3.pct}%
                      </div>
                    </div>
                  </div>
                  <div style={{fontSize:9,color:C.smoke,marginTop:5,textAlign:"center",fontWeight:600}}>
                    R:R المتوقع: <span style={{color:C.gold,fontWeight:800}}>{d.smartData.targets.expectedRR}:1</span>
                  </div>
                </div>
              )}
            </div>
          )}
          

          {/* pills المعلومات */}
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {p.health&&p.health.positionSize&&p.health.positionSize.pct>0&&(
              <span style={{fontSize:12,color:C.electric,background:C.electric+"12",borderRadius:8,padding:"3px 9px",border:"1px solid "+C.electric+"25"}}>حجم مثالي {p.health.positionSize.pct}%</span>
            )}
            {p.value>0&&p.pnlPct<=-7&&(
              <span className="danger-pulse" style={{fontSize:12,color:C.coral,background:C.coral+"18",borderRadius:8,padding:"3px 9px",border:"1px solid "+C.coral+"44",fontWeight:800}}>وقف الخسارة</span>
            )}
            {p.value>0&&p.pnlPct>=20&&(
              <span style={{fontSize:12,color:C.gold,background:C.gold+"15",borderRadius:8,padding:"3px 9px",border:"1px solid "+C.gold+"30",fontWeight:800}}>هدف الربح</span>
            )}
            {d.upside&&(
              <span style={{fontSize:12,color:d.upside>=0?C.mint:C.coral,background:(d.upside>=0?C.mint:C.coral)+"12",borderRadius:8,padding:"3px 9px",border:"1px solid "+(d.upside>=0?C.mint:C.coral)+"25"}}>هدف {d.upside>=0?"+":""}{d.upside.toFixed(1)}%</span>
            )}
            {d.rr&&(
              <span title="نسبة المكسب للمخاطرة - كل 1 ريال خطر تكسب X ريال" style={{fontSize:12,color:C.gold,background:C.gold+"12",borderRadius:8,padding:"3px 9px",border:"1px solid "+C.gold+"25",cursor:"help"}}>ربح/خطر {d.rr}:1</span>
            )}
          </div>
          {/* ✨ Strategic Insight - Portfolio IQ Integration */}
          {d.strategicInsight && d.strategicInsight.alerts.length > 0 && (
            <div style={{
              background: d.strategicInsight.severity === 'danger' 
                ? "linear-gradient(135deg," + C.coral + "15," + C.coral + "08)"
                : "linear-gradient(135deg," + C.amber + "15," + C.amber + "08)",
              border: "1px solid " + (d.strategicInsight.severity === 'danger' ? C.coral + "44" : C.amber + "44"),
              borderRadius: 12,
              padding: "10px 12px",
              marginBottom: 10,
              position: "relative",
            }}>
              {/* Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: "1px solid " + (d.strategicInsight.severity === 'danger' ? C.coral + "33" : C.amber + "33"),
              }}>
                <div style={{display: "flex", alignItems: "center", gap: 6}}>
                  <span style={{fontSize: 14}}>🧠</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: d.strategicInsight.severity === 'danger' ? C.coral : C.amber,
                    fontFamily: "Cairo,sans-serif",
                  }}>
                    تنبيه استراتيجي
                  </span>
                </div>
                <span style={{
                  fontSize: 9,
                  color: C.smoke,
                  background: "rgba(255,255,255,.05)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontWeight: 700,
                  fontFamily: "Cairo,sans-serif",
                }}>
                  Portfolio IQ
                </span>
              </div>
              
              {/* Alerts */}
              {d.strategicInsight.alerts.map(function(alert, i) {
                return (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: i < d.strategicInsight.alerts.length - 1 ? 6 : 0,
                  }}>
                    <span style={{fontSize: 14, flexShrink: 0}}>{alert.icon}</span>
                    <div style={{flex: 1}}>
                      <div style={{
                        fontSize: 11,
                        color: C.snow,
                        fontWeight: 700,
                        marginBottom: 2,
                        fontFamily: "Cairo,sans-serif",
                      }}>
                        {alert.message}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: C.smoke,
                        lineHeight: 1.5,
                        fontFamily: "Cairo,sans-serif",
                      }}>
                        💡 {alert.suggestion}
                      </div>
                    </div>
                  </div>
                );
                            })}
              
              {/* ✨ الحل المقترح + التأثير المتوقع */}
              {d.strategicInsight.recommendedAction && (
                <div style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px dashed " + (d.strategicInsight.severity === 'danger' ? C.coral + "33" : C.amber + "33"),
                }}>
                  {/* عنوان الحل */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}>
                    <span style={{fontSize: 14}}>🎯</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: C.mint,
                      fontFamily: "Cairo,sans-serif",
                    }}>
                      الحل المقترح
                    </span>
                  </div>
                  
                  {/* تفاصيل البيع */}
                  <div style={{
                    background: "rgba(30,230,138,.06)",
                    border: "1px solid " + C.mint + "33",
                    borderRadius: 8,
                    padding: "8px 10px",
                    marginBottom: 8,
                  }}>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: C.snow,
                        fontFamily: "Cairo,sans-serif",
                      }}>
                        بِع {d.strategicInsight.recommendedAction.sellQty} سهم
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: C.mint,
                        fontFamily: "IBM Plex Mono,monospace",
                      }}>
                        {d.strategicInsight.recommendedAction.sellValue.toLocaleString('en-US')} ر
                      </span>
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: C.smoke,
                      fontFamily: "Cairo,sans-serif",
                    }}>
                      للوصول إلى {d.strategicInsight.recommendedAction.targetWeight}% (تخفيف {d.strategicInsight.recommendedAction.sellPercent}%)
                    </div>
                  </div>
                  
                  {/* التأثير المتوقع */}
                  <div style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid " + C.line,
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}>
                    <div style={{
                      fontSize: 10,
                      color: C.plasma,
                      fontWeight: 800,
                      letterSpacing: "1px",
                      marginBottom: 6,
                    }}>
                      📊 التأثير المتوقع
                    </div>
                    
                    {/* HHI */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "3px 0",
                      fontSize: 10,
                      fontFamily: "Cairo,sans-serif",
                    }}>
                      <span style={{color: C.smoke}}>التركيز (HHI):</span>
                      <span style={{
                        color: C.mint,
                        fontWeight: 800,
                        fontFamily: "IBM Plex Mono,monospace",
                      }}>
                        {d.strategicInsight.recommendedAction.impact.hhi.change}
                      </span>
                    </div>
                    
                    {/* Volatility */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "3px 0",
                      fontSize: 10,
                      fontFamily: "Cairo,sans-serif",
                    }}>
                      <span style={{color: C.smoke}}>التقلبات:</span>
                      <span style={{
                        color: C.mint,
                        fontWeight: 800,
                        fontFamily: "IBM Plex Mono,monospace",
                      }}>
                        {d.strategicInsight.recommendedAction.impact.volatility.change}
                      </span>
                    </div>
                    
                    {/* Sharpe */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "3px 0",
                      fontSize: 10,
                      fontFamily: "Cairo,sans-serif",
                    }}>
                      <span style={{color: C.smoke}}>Sharpe Ratio:</span>
                      <span style={{
                        color: C.mint,
                        fontWeight: 800,
                        fontFamily: "IBM Plex Mono,monospace",
                      }}>
                        {d.strategicInsight.recommendedAction.impact.sharpe.change}
                      </span>
                    </div>
                    
                    {/* Diversification */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "3px 0 0",
                      borderTop: "1px solid " + C.line,
                      marginTop: 4,
                      fontSize: 10,
                      fontFamily: "Cairo,sans-serif",
                    }}>
                      <span style={{color: C.smoke}}>التنويع:</span>
                      <span style={{
                        color: C.mint,
                        fontWeight: 800,
                      }}>
                        {d.strategicInsight.recommendedAction.impact.diversification.before} → {d.strategicInsight.recommendedAction.impact.diversification.after}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* أزرار الإجراءات */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:6,borderTop:"1px solid "+C.line+"33"}}>
            <span style={{fontSize:11,color:C.smoke,background:"rgba(255,255,255,.04)",borderRadius:8,padding:"3px 9px",border:"1px solid "+C.line}}>{p.curWeightPct.toFixed(1)}% من المحفظة</span>
            {p.value>0&&(
              <div style={{display:"flex",gap:6}}>
                <button onClick={handleEdit} style={{background:"rgba(255,255,255,.04)",border:"1px solid "+C.line,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
                  تعديل
                </button>
                <button onClick={handleSell} style={{background:"linear-gradient(135deg,"+C.coral+"25,"+C.coral+"10)",border:"1px solid "+C.coral+"44",borderRadius:8,padding:"5px 14px",cursor:"pointer",fontSize:11,fontWeight:800,color:C.coral,fontFamily:"Cairo,sans-serif",display:"flex",alignItems:"center",gap:4,boxShadow:"0 2px 8px "+C.coral+"18"}}>
                  <SvgIcon name="sell" size={10} color={C.coral}/>
                  بيع
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SellSheet(props) {
  var sellSheet=props.sellSheet, setSellSheet=props.setSellSheet, setTradeLog=props.setTradeLog, setPort=props.setPort;
  var setPerfHistory=props.setPerfHistory, sl=props.sl||[];
  var sq=useState(String(sellSheet.qty)); var sellQty=sq[0], setSellQty=sq[1];
  var sp=useState(sellSheet.curPrice.toFixed(2)); var sellPrice=sp[0], setSellPrice=sp[1];
  var qty=parseFloat(sellQty)||0, price=parseFloat(sellPrice)||0;
  var pnlAmt=(price-sellSheet.avgCost)*qty;
  var pnlPct=sellSheet.avgCost>0?(price-sellSheet.avgCost)/sellSheet.avgCost*100:0;
  var canSell=qty>0&&price>0&&qty<=sellSheet.qty;
    function doSell() {
    if(!canSell) return;
    
        // ✨ AI Smart Weighted Learning - مبني على أبحاث Quant Finance
    try {
      var pnlPct = sellSheet.avgCost > 0 ? ((price - sellSheet.avgCost) / sellSheet.avgCost) * 100 : 0;
      
      // 🎯 القاعدة 1: Dead Zone - تجاهل الضوضاء (±0.5%)
      // 🎯 القاعدة 2: Anomaly Filter - تجاهل الحركات الاستثنائية (±20%)
      if (Math.abs(pnlPct) >= 0.5 && Math.abs(pnlPct) <= 20) {
        // 🎯 القاعدة 3: Weighted Learning - كل صفقة بقوتها
        var actualOutcome = 0;
        
        // النتائج الإيجابية
        if (pnlPct >= 10)      actualOutcome = 2.0;   // ممتاز
        else if (pnlPct >= 5)  actualOutcome = 1.5;   // قوي
        else if (pnlPct >= 3)  actualOutcome = 1.0;   // واضح
        else if (pnlPct >= 1)  actualOutcome = 0.5;   // ضعيف
        else if (pnlPct > 0)   actualOutcome = 0.2;   // طفيف
        // النتائج السلبية
        else if (pnlPct >= -1)  actualOutcome = -0.2;
        else if (pnlPct >= -3)  actualOutcome = -0.5;
        else if (pnlPct >= -5)  actualOutcome = -1.0;
        else if (pnlPct >= -10) actualOutcome = -1.5;
        else                    actualOutcome = -2.0;
        
        var signalTaken = pnlPct >= 0 ? 'شراء قوي' : 'تخفيف';
        
        // Layers محفوظة من وقت الشراء
        var layersUsed = sellSheet.layersAtEntry || {
          L1: 60, L2: 60, L3: 60, L4: 60, L5: 60,
          L6: 60, L7: 60, L8: 60, L9: 60
        };
        
        recordFeedback(sellSheet.sym, signalTaken, layersUsed, actualOutcome);
      }
    } catch (e) {
      // فشل صامت
    }
    
    setTradeLog(function(prev){return [{id:Date.now(),sym:sellSheet.sym,name:sellSheet.name,action:"بيع",qty:qty,price:price,date:new Date().toISOString().slice(0,10),signal:"-",score:0,note:"تسجيل بيع"}].concat(prev);});
    setPort(function(prev){return prev.map(function(pp){if(pp.sym!==sellSheet.sym)return pp;var rem=pp.qty-qty;if(rem<=0)return null;return Object.assign({},pp,{qty:rem});}).filter(Boolean);});
    // تحديث perfHistory
    if(setPerfHistory) {
      var today=new Date().toISOString().slice(0,10);
      setPerfHistory(function(prev){
        var lastV=prev.length?prev[prev.length-1].v:0;
        var newV=Math.max(0,lastV-(sellSheet.avgCost*qty)+(qty*price));
        return prev.concat([{date:today,v:Math.round(newV)}]);
      });
    }
    if(navigator.vibrate) navigator.vibrate(50);
    setSellSheet(null);
  }
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(6,8,15,.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn .25s ease both"}} onClick={function(){setSellSheet(null);}}>
      <div onClick={function(e){e.stopPropagation();}} style={{width:"100%",maxWidth:430,background:"linear-gradient(180deg,"+C.layer2+" 0%,"+C.deep+" 100%)",borderRadius:"24px 24px 0 0",border:"1px solid "+C.line,borderBottom:"none",maxHeight:"78vh",display:"flex",flexDirection:"column",boxShadow:"0 -24px 64px rgba(0,0,0,.8), inset 0 1px 0 "+C.layer3,animation:"slideUp .38s cubic-bezier(.16,1,.3,1) both"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 0"}}>
          <button onClick={function(){setSellSheet(null);}} style={{width:44,height:44,borderRadius:12,border:"1px solid "+C.line,background:C.layer3,color:C.mist,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><SvgIcon name="stop" size={16} color={C.smoke}/></button>
          <div style={{width:40,height:4,borderRadius:2,background:C.ash}}/>
          <div style={{width:44,height:44}}/>
        </div>
        <div style={{padding:"12px 20px 14px",borderBottom:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:3,height:16,background:C.coral,borderRadius:2}}/>
            <span style={{fontSize:13,fontWeight:700,color:C.mist}}>تسجيل بيع</span>
          </div>
          <span style={{fontSize:12,fontWeight:700,color:C.coral,background:C.coral+"18",border:"1px solid "+C.coral+"33",borderRadius:8,padding:"2px 9px"}}>{sellSheet.name}</span>
        </div>
        <div style={{overflowY:"auto",padding:"14px 20px 100px",flex:1}}>
          <div style={{background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:12,padding:"10px 14px",marginBottom:14,border:"1px solid "+C.line,boxShadow:"inset 0 1px 0 "+C.layer3}}>
            {[{l:"سعر الدخول",v:sellSheet.avgCost.toFixed(2)+" ر"},{l:"السعر الحالي",v:sellSheet.curPrice.toFixed(2)+" ر"},{l:"الكمية المتاحة",v:sellSheet.qty.toLocaleString("en-US")}].map(function(f,i){return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:i<2?4:0}}>
                <span style={{fontSize:12,color:C.smoke}}>{f.l}</span>
                <span className="num" style={{fontSize:12,fontWeight:800,color:C.snow}}>{f.v}</span>
              </div>
            );})}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:C.smoke,fontWeight:700,marginBottom:7}}>بيع نسبة سريع</div>
            <div style={{display:"flex",gap:6}}>
              {[25,50,75,100].map(function(pct){
                var qtyForPct=Math.round(sellSheet.qty*pct/100);
                var isActive=parseInt(sellQty)===qtyForPct;
                return(
                  <button key={pct} onClick={function(){setSellQty(String(qtyForPct));}} style={{flex:1,padding:"7px 0",background:isActive?"linear-gradient(135deg,"+C.coral+"28,"+C.coral+"12)":"rgba(255,255,255,.04)",border:"1px solid "+(isActive?C.coral+"44":C.line),borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:800,color:isActive?C.coral:C.smoke,fontFamily:"Cairo,sans-serif",transition:"all .2s"}}>
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            {[{l:"الكمية المباعة",v:sellQty,set:setSellQty,ph:String(sellSheet.qty)},{l:"سعر البيع",v:sellPrice,set:setSellPrice,ph:sellSheet.curPrice.toFixed(2)}].map(function(f,i){return (
              <div key={i} style={{flex:1}}>
                <div style={{fontSize:12,color:C.smoke,fontWeight:700,marginBottom:5}}>{f.l}</div>
                <input type="number" value={f.v} onChange={function(e){f.set(e.target.value);}} placeholder={f.ph} style={{width:"100%",boxSizing:"border-box",background:C.layer3,border:"1px solid "+C.line,borderRadius:11,padding:"11px",fontSize:16,color:C.snow,fontFamily:"IBM Plex Mono,monospace",outline:"none",textAlign:"center"}} onKeyDown={function(e){if(e.key==="Enter"){haptic.tap();e.target.blur();}}} />
              </div>
            );})}
          </div>
          {canSell&&(
            <div className="fade-in" style={{marginBottom:12,padding:"10px 14px",background:pnlAmt>=0?C.mint+"0a":C.coral+"0a",border:"1px solid "+(pnlAmt>=0?C.mint:C.coral)+"22",borderRadius:11,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:C.smoke}}>الربح / الخسارة</span>
              <div style={{textAlign:"left"}}>
                <div className="num" style={{fontSize:15,fontWeight:900,color:pnlAmt>=0?C.mint:C.coral}}>{pnlAmt>=0?"+":""}{Math.round(pnlAmt).toLocaleString("en-US")} ر</div>
                <div className="num" style={{fontSize:12,color:pnlAmt>=0?C.mint:C.coral}}>{pnlPct>=0?"+":""}{pnlPct.toFixed(2)}%</div>
              </div>
            </div>
          )}
          <button onClick={doSell} style={{width:"100%",padding:"14px",background:canSell?"linear-gradient(135deg,"+C.coral+"33,"+C.coral+"18)":"rgba(255,255,255,.04)",border:"1px solid "+(canSell?C.coral+"55":C.line),borderRadius:14,cursor:canSell?"pointer":"default",fontSize:14,fontWeight:900,color:canSell?C.coral:C.smoke,fontFamily:"Cairo,sans-serif",transition:"all .2s"}}>
            {canSell?"تسجيل البيع":"ادخل الكمية والسعر"}
          </button>
        </div>
      </div>
    </div>
  );
}



export default function PortfolioScreen() {
  const { openStock, setTab } = useNav();

  // ── حساب بيانات الصحة من محرك التحليل الاحترافي ──────────────
  // allData: نفس البنية التي تنتجها AnalysisScreen
  // يحسب health لكل سهم في قائمة STOCKS
  const allData = useMemo(function() {
    return STOCKS.map(function(stk) {
      var bars = genBars(stk);
      return { stk: stk, bars: bars, health: stockHealth(stk, bars) };
    });
  }, []); // تُحسب مرة واحدة — STOCKS ثابتة

  var stocks = STOCKS;
const [isLoading, setIsLoading] = useState(true);
const [showAdvanced, setShowAdvanced] = useState(false);
useEffect(() => {
  const t = setTimeout(() => setIsLoading(false), 600);
  return () => clearTimeout(t);
}, []);

  // ======= دالة مساعدة للـ localStorage =======
  function loadLS(key, fallback) {
    try { var v=localStorage.getItem(key); return v?JSON.parse(v):fallback; } catch(e){ return fallback; }
  }
  function saveLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(e){}
  }

  // ══ تصدير المحفظة CSV ══
  function exportToCSV() {
    var rows = [
      ['الرمز','الاسم','القطاع','الكمية','سعر الدخول','السعر الحالي','P&L%','P&L ريال','الوزن%'],
    ];
    positions.forEach(function(p){
      rows.push([
        p.sym, p.stk?p.stk.name:p.sym, p.stk?p.stk.sec:'',
        p.qty, p.avgCost.toFixed(2),
        p.curPrice?p.curPrice.toFixed(2):'',
        p.pnlPct?p.pnlPct.toFixed(2):'',
        p.pnl?p.pnl.toFixed(2):'',
        p.curWeightPct?p.curWeightPct.toFixed(1):'',
      ]);
    });
    var csv = rows.map(function(r){ return r.join(','); }).join('\n');
    var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'portfolio_'+new Date().toISOString().split('T')[0]+'.csv';
    a.click(); URL.revokeObjectURL(url);
  }

  // تصدير سجل الصفقات
  function exportTradeHistory() {
    var rows = [['الرمز','الكمية','سعر الدخول','سعر الخروج','P&L%','P&L ريال','تاريخ الإغلاق']];
    tradeHistory.forEach(function(t){
      rows.push([t.sym,t.qty,t.openPrice,t.closePrice,t.pnlPct,t.pnlAmount,t.closeDate]);
    });
    var csv = rows.map(function(r){ return r.join(','); }).join('\n');
    var blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'trades_'+new Date().toISOString().split('T')[0]+'.csv';
    a.click(); URL.revokeObjectURL(url);
  }

  // ======= الحالة المحفوظة =======
  const haptic = useHaptic();
  var ps=useState(function(){ return loadLS("tp_port", []); });
  var port=ps[0], setPort=ps[1];

  // ══ سجل الصفقات المغلقة (Trade History) ══
  const [tradeHistory, setTradeHistory] = useState(function(){
    return loadLS("tp_trade_history", []);
  });

  // حفظ عند كل تغيير
  useEffect(function(){ saveLS("tp_trade_history", tradeHistory); }, [tradeHistory]);

  // دالة إغلاق صفقة وحفظها في السجل
  function closeTrade(sym, qty, closePrice, openPrice) {
    var pnlPct = openPrice > 0 ? ((closePrice - openPrice) / openPrice * 100) : 0;
    var trade = {
      id: Date.now(),
      sym, qty, openPrice, closePrice,
      pnlPct: +pnlPct.toFixed(2),
      pnlAmount: +((closePrice - openPrice) * qty).toFixed(2),
      openDate: null, // سيُضاف عند الدخول
      closeDate: new Date().toISOString().split('T')[0],
    };
    setTradeHistory(function(prev){ return [trade, ...prev].slice(0, 200); });
  }

  // ══ الزكاة ══
  // زكاة الاستثمار = 2.5% من قيمة الأسهم المحتفظ بها حولاً قمرياً
  const zakatCalc = useMemo(function(){
    var tv = 0; // إجمالي قيمة المحفظة سيُحسب لاحقاً
    return {
      zakatRate: 0.025,
      zakatDue: function(portfolioValue){ return +(portfolioValue * 0.025).toFixed(2); },
      nisab: 22540, // نصاب الذهب تقريباً بالريال (85g × سعر الذهب)
      note: "تستحق الزكاة إذا بلغت القيمة النصاب وحال الحول"
    };
  }, []);

  // حفظ المحفظة عند كل تغيير
  useEffect(function(){ saveLS("tp_port", port); },[port]);

  // ======= نظام الأسعار الحية =======
  // عند ربط API: استبدل هذا الـ useEffect بطلب حقيقي
  var lp=useState(function(){
    var init={};
    STOCKS.forEach(function(s){init[s.sym]={p:s.p,ch:s.ch};});
    return init;
  }); var livePrices=lp[0], setLivePrices=lp[1];
  var lastUpdate_s=useState(null); var lastUpdate=lastUpdate_s[0], setLastUpdate=lastUpdate_s[1];

  useEffect(function(){
    function fetchPrices() {
      // ============================================================
      // ربط API هنا - استبدل هذه الدالة بطلب حقيقي:
      // fetch("https://your-api.com/prices").then(r=>r.json()).then(data=>{
      //   setLivePrices(data); setLastUpdate(new Date());
      // });
      // ============================================================
      // محاكاة تغير طفيف في الأسعار للاختبار
      setLivePrices(function(prev){
        var next={};
        Object.keys(prev).forEach(function(sym){
          var old=prev[sym];
          var delta=(Math.random()-0.48)*0.15;
          var newP=Math.max(0.1, old.p*(1+delta/100));
          var newCh=old.ch+delta*0.3;
          next[sym]={p:parseFloat(newP.toFixed(2)),ch:parseFloat(newCh.toFixed(2))};
        });
        return next;
      });
      setLastUpdate(new Date());
    }
    
    // ✨ Fetch أول مرة فوراً عند التحميل
    fetchPrices();
    
    var interval=setInterval(fetchPrices, 30000); // كل 30 ثانية
    return function(){ clearInterval(interval); };
  },[]);
  // دمج الأسعار الحية مع STOCKS
  var sl=useMemo(function(){
    var base=stocks.length?stocks:STOCKS;
    return base.map(function(s){
      var live=livePrices[s.sym];
      return live?Object.assign({},s,{p:live.p,ch:live.ch}):s;
    });
  },[stocks,livePrices]);

  var prevDecisions_s=useState({}); var prevDecisions=prevDecisions_s[0], setPrevDecisions=prevDecisions_s[1];
  var prevPnlMap_s=useState({}); var prevPnlMap=prevPnlMap_s[0], setPrevPnlMap=prevPnlMap_s[1];

  var ss=useState(false); var sheet=ss[0], setSheet=ss[1];
  var as=useState(""); var addSym=as[0], setAddSym=as[1];
  var aq=useState(""); var addQty=aq[0], setAddQty=aq[1];
  var ac=useState(""); var addCost=ac[0], setAddCost=ac[1];
  var cs=useState(function(){ return loadLS("tp_capital", 100000); }); var capital=cs[0], setCapital=cs[1];
  useEffect(function(){ saveLS("tp_capital", capital); },[capital]);
  var ts=useState("decisions"); var activeTab=ts[0], setActiveTab=ts[1];
  var scrolls=useState({"decisions":0,"log":0,"compare":0}); var scrollPos=scrolls[0], setScrollPos=scrolls[1];
  var hm=useState(false); var headerMin=hm[0], setHeaderMin=hm[1];
  function switchTab(id) {
    // احفظ الـ scroll الحالي قبل التبديل
    var el=document.getElementById("tab-"+activeTab);
    if(el) setScrollPos(function(prev){var n=Object.assign({},prev);n[activeTab]=el.scrollTop;return n;});
    setActiveTab(id);
    // استرجع الـ scroll بعد render
    requestAnimationFrame(function(){var el2=document.getElementById("tab-"+id);if(el2)el2.scrollTop=scrollPos[id]||0;});
  }
  var sk=useState(""); var stockSrch=sk[0], setStockSrch=sk[1];
  var sv=useState(null); var sellSheet=sv[0], setSellSheet=sv[1];
  var lf=useState("الكل"); var logFilter=lf[0], setLogFilter=lf[1];
  var em=useState(null); var editPos=em[0], setEditPos=em[1];
  var ob=useState(function(){ return loadLS("tp_port",[]).length===0; }); var showOB=ob[0], setShowOB=ob[1];
  var obStep_s=useState(0); var obStep=obStep_s[0], setObStep=obStep_s[1];
  var ph=useState(function(){ return loadLS("tp_perf", []); });
  var perfHistory=ph[0], setPerfHistory=ph[1];
  useEffect(function(){ saveLS("tp_perf", perfHistory); },[perfHistory]);

  var tl=useState(function(){ return loadLS("tp_log", []); });
  var tradeLog=tl[0], setTradeLog=tl[1];
  useEffect(function(){ saveLS("tp_log", tradeLog); },[tradeLog]);

  var al=useState(function(){ return loadLS("tp_alerts", []); });
  var alerts=al[0], setAlerts=al[1];
  useEffect(function(){ saveLS("tp_alerts", alerts); },[alerts]);

  useEffect(function(){
    if(!document.getElementById("tp-portfolio-css")){
      var s=document.createElement("style"); s.id="tp-portfolio-css";
      s.textContent=[
        "@keyframes alertFlash{0%{opacity:1}25%{opacity:.3}50%{opacity:1}75%{opacity:.3}100%{opacity:1}}",
        ".alert-flash{animation:alertFlash .6s ease 2}",
        ".num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.5px}",
        ".glow-gold{text-shadow:0 0 12px #f0c05099,0 0 24px #f0c05044}",
        ".glow-mint{text-shadow:0 0 10px #1ee68a88,0 0 20px #1ee68a33}",
        ".glow-coral{text-shadow:0 0 10px #ff5f6a88,0 0 20px #ff5f6a33}",
        ".glow-electric{text-shadow:0 0 10px #4d9fff88,0 0 20px #4d9fff33}",
        ".glow-white{text-shadow:0 0 8px rgba(240,246,255,.4),0 0 16px rgba(240,246,255,.15)}",
        "@keyframes springIn{0%{opacity:0;transform:translateY(24px) scale(.96)}60%{opacity:1;transform:translateY(-4px) scale(1.01)}80%{transform:translateY(2px) scale(.995)}100%{opacity:1;transform:none}}",
        "@keyframes fadeIn{from{opacity:0}to{opacity:1}}",
        "@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}",
        "@keyframes buyGlow{0%,100%{box-shadow:0 0 0 1px #1ee68a22,0 4px 20px rgba(0,0,0,.3)}50%{box-shadow:0 0 0 1px #1ee68a55,0 4px 28px #1ee68a18}}",
        "@keyframes dangerPulse{0%,100%{box-shadow:0 0 0 1px #ff5f6a22,0 4px 20px rgba(0,0,0,.3)}50%{box-shadow:0 0 0 1px #ff5f6a44,0 4px 24px #ff5f6a15}}",
        "@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}",
        ".card-enter{animation:springIn .55s cubic-bezier(.16,1,.3,1) both}",
        ".fade-in{animation:fadeIn .35s ease both}",
        ".buy-glow{animation:buyGlow 3.2s ease-in-out infinite}",
        ".danger-pulse{animation:dangerPulse 2.4s ease-in-out infinite}",
        ".live-dot{animation:pulse 2s ease-in-out infinite}",
        "button{font-family:inherit;transition:transform .15s ease,opacity .15s ease}",
        "button:active{transform:scale(.93);opacity:.85}",
        "::-webkit-scrollbar{width:0;height:0}",
        "input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}",
      ].join("");
      document.head.appendChild(s);
    }
    ["https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap",
     "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap"
    ].forEach(function(href){
      if(!document.querySelector("link[href=\""+href+"\"]")){
        var l=document.createElement("link"); l.rel="stylesheet"; l.href=href;
        document.head.appendChild(l);
      }
    });
    // طلب إذن الإشعارات
    if("Notification" in window && Notification.permission==="default"){
      Notification.requestPermission();
    }
  },[]);

  // ======= دالة إطلاق التنبيه الكامل =======
  function fireAlert(a) {
    // ١. إشعار المتصفح
    if("Notification" in window && Notification.permission==="granted"){
      new Notification("⚡ "+a.name+" — "+a.act,{
        body:a.reason,
        tag:a.sym,
        requireInteraction:a.urgent
      });
    }
    // ٢. صوت تنبيه
    try {
      var ctx=new (window.AudioContext||window.webkitAudioContext)();
      var osc=ctx.createOscillator();
      var gain=ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(a.urgent?880:660, ctx.currentTime);
      osc.frequency.setValueAtTime(a.urgent?440:880, ctx.currentTime+0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime+0.5);
      // ✨ تنظيف: إغلاق AudioContext بعد الانتهاء
      setTimeout(function(){ 
        try { ctx.close(); } catch(e){} 
      }, 600);
    } catch(e){}
    // ٣. اهتزاز الجهاز
    if(navigator.vibrate){
      navigator.vibrate(a.urgent?[200,100,200,100,400]:[150,100,150]);
    }
  }

                 // ══════════════════════════════════════════════
  // 🏆 Position Sizing Analysis (Dev only)
  // ══════════════════════════════════════════════
  useEffect(function(){
    if (!positions || positions.length === 0) return;
    if (process.env.NODE_ENV !== 'development') return;

    try {
      var positionsWithBars = positions.map(function(p) {
        var bars = genBars(p.stk, 60);
        return {
          sym: p.sym,
          qty: p.qty,
          value: p.value,
          bars: bars,
          stk: p.stk,
        };
      });

      var analysis = analyzePortfolio(positionsWithBars, []);
      var ps = analysis.positionSizing;

      console.log('🏆 Position Sizing:', {
        totalValue: analysis.totalValue,
        kelly: (ps.safeKelly * 100).toFixed(2) + '%',
        twoPercent: ps.twoPercent.riskSAR,
        atr: ps.atr.avgATRPercent + '%',
        stocksAnalyzed: ps.atr.stocksAnalyzed,
      });
    } catch (e) {
      console.error('[Position Sizing Error]', e);
    }
  }, [positions]);
    var positions=useMemo(function(){
    var tv=port.reduce(function(s,pp){var stk=sl.find(function(x){return x.sym===pp.sym;});return s+(stk?stk.p:pp.avgCost)*pp.qty;},0)||1;
        return port.map(function(pp){
      var stk=sl.find(function(x){return x.sym===pp.sym;})||{sym:pp.sym,name:pp.sym,p:pp.avgCost,ch:0,sec:"-"};
      var h=allData.find(function(d){return d.stk&&d.stk.sym===pp.sym;}); h=h?h.health:null;
      var value=stk.p*pp.qty, cost=pp.avgCost*pp.qty, pnl=value-cost;
      
      // ✨ Smart Action Engine - تحليل احترافي لكل مركز
      var smartBars = genBars(stk, 60);
      var smartAction = null;
      try {
        if(h && smartBars && smartBars.length >= 14) {
          var positionData = {
            sym: pp.sym,
            avgCost: pp.avgCost,
            curPrice: stk.p,
            qty: pp.qty,
            entryDate: pp.entryDate || new Date().toISOString(),
          };
          smartAction = calcSmartAction(positionData, h, smartBars, h.riskGate || 'SAFE');
        }
            } catch(e) {
        console.error('[SmartAction Error]', pp.sym, e.message, e);
      }
      
      return Object.assign({}, pp, {
        stk: stk,
        health: h,
        value: value,
        cost: cost,
        pnl: pnl,
        pnlPct: cost>0 ? pnl/cost*100 : 0,
        dayPnl: stk.ch/100*value,
        curPrice: stk.p,
        curWeightPct: value/tv*100,
        smartAction: smartAction, // ✨ جديد!
      });
    });
  },[port,sl,allData]);

  var tv=positions.reduce(function(s,p){return s+p.value;},0);
  var tp=positions.reduce(function(s,p){return s+p.pnl;},0);
  var tpP=tv-tp>0?tp/(tv-tp)*100:0;
  var dp=positions.reduce(function(s,p){return s+p.dayPnl;},0);

  // ── مقارنة بالمرجع (Benchmark vs TASI) ──────────────────────────
  // TASI return تقريبي من متوسط أداء الأسهم في المحفظة مقارنة بالسوق
  var benchmarkReturn = useMemo(function(){
    if(!positions.length) return 0;
    // متوسط وزني لأداء قطاع كل سهم كمقياس بديل لـ TASI
    var totalW = tv || 1;
    var wReturn = positions.reduce(function(s,p){
      var h = allData.find(function(d){return d.stk&&d.stk.sym===p.sym;});
      var tasiSectorReturn = h&&h.health&&h.health.tasiCtx ? h.health.tasiCtx.domDir*2.5 : 1.8;
      return s + (p.value/totalW) * tasiSectorReturn;
    }, 0);
    return +wReturn.toFixed(2);
  }, [positions, tv, allData]);

  var alpha = +(tpP - benchmarkReturn).toFixed(2); // Alpha vs TASI
  var decisions=useMemo(function(){var m={};positions.forEach(function(p){m[p.sym]=getDecision(p);});return m;},[positions]);

  // ═══ تحليل المحفظة الشامل (المراحل 1-5) ═══
  var portfolioAnalysis = useMemo(function() {
    if (!positions || positions.length === 0) return null;
    var positionsWithBars = positions.map(function(p) {
      var bars = genBars(p.stk, 60);
      return {
        sym: p.sym,
        qty: p.qty,
        value: p.value,
        bars: bars,
        stk: p.stk,
      };
    });
            var analysis = analyzePortfolio(positionsWithBars, []);
    analysis = addIntelligenceLayer(analysis, positionsWithBars, stockHealth);
    // ⭐ بيانات الرسم البياني
                     analysis.chartData = {
      portfolioValue: generatePortfolioValueChart(
        positionsWithBars, 
        analysis.totalValue, 
        60
      ),
      drawdown: generateDrawdownChart(positionsWithBars, 60),
      monthlyReturns: generateMonthlyReturnsHeatmap(positionsWithBars, 365),
      riskReturn: generateRiskReturnScatter(positionsWithBars, analysis),
      correlation: generateCorrelationHeatmap(positionsWithBars),
      varDistribution: generateVaRDistribution(positionsWithBars),
    };

    return analysis;
  }, [positions]);
    

  // ======= كشف تغيير القرار وإطلاق التنبيه =======
  useEffect(function(){
    var newAlerts=[];
    positions.forEach(function(p){
      var d=decisions[p.sym];
      var prevD=prevDecisions[p.sym];
      var prevPnl=prevPnlMap[p.sym];
      if(!d) return;
      // تغيير من إيجابي لسلبي
      if(prevD){
        var wasGood=prevD.act==="احتفظ"||prevD.act==="اشتري"||prevD.act==="زد المركز";
        var nowBad=d.act==="بيع كامل"||d.act==="بيع 50%"||d.act==="وقف خسارة"||d.act==="بيع جزئي"||d.act==="بيع 25%";
        if(wasGood&&nowBad){
          newAlerts.push({id:Date.now()+Math.random(),sym:p.sym,name:p.stk.name,act:d.act,reason:d.reason,color:d.color,pnlPct:p.pnlPct,urgent:d.urgent});
        }
      }
      // تجاوز حد الربح +20%
      if(prevPnl!==undefined&&p.pnlPct>=20&&prevPnl<20){
        newAlerts.push({id:Date.now()+Math.random(),sym:p.sym,name:p.stk.name,act:"هدف الربح",reason:"وصل السهم لهدف الربح +20% — فكّر في الحجز",color:"#f0c050",pnlPct:p.pnlPct,urgent:false});
      }
      // تجاوز حد الخسارة -7%
      if(prevPnl!==undefined&&p.pnlPct<=-7&&prevPnl>-7){
        newAlerts.push({id:Date.now()+Math.random(),sym:p.sym,name:p.stk.name,act:"وقف الخسارة",reason:"وصل السهم لحد الخسارة -7% — أغلق المركز",color:C.coral,pnlPct:p.pnlPct,urgent:true});
      }
    });
    if(newAlerts.length>0){
      newAlerts.forEach(function(a){ fireAlert(a); });
      setAlerts(function(prev){return newAlerts.concat(prev).slice(0,10);});
    }
    setPrevDecisions(decisions);
    var newPnlMap={};
    positions.forEach(function(p){newPnlMap[p.sym]=p.pnlPct;});
    setPrevPnlMap(newPnlMap);
  },[decisions]);

  var sorted=useMemo(function(){
    return positions.slice().sort(function(a,b){
      var da=decisions[a.sym]||getDecision(a),db=decisions[b.sym]||getDecision(b);
      if(da.urgent&&!db.urgent)return -1; if(!da.urgent&&db.urgent)return 1;
      var o={"اشتري":0,"بيع كامل":1,"بيع 50%":2,"زد المركز":3,"وقف خسارة":4,"بيع جزئي":5,"انتظر":6,"احتفظ":7,"لا تدخل":8};
      return (o[da.act]||9)-(o[db.act]||9);
    });
  },[positions]);
  var urgentN=sorted.filter(function(p){return (decisions[p.sym]||getDecision(p)).urgent;}).length;
  var found=sl.find(function(s){return s.sym===addSym;});
  var canAdd=!!(found&&parseFloat(addQty)>0&&parseFloat(addCost)>0);
  function doAdd(){
    if(!canAdd) return;
    haptic.success();
    var qty=parseFloat(addQty), cost=parseFloat(addCost);
    
    // ✨ Validation
    if (qty <= 0 || cost <= 0) {
      alert('الكمية والسعر يجب أن يكونا أكبر من صفر');
      return;
    }
    if (qty > 1000000) {
      alert('الكمية كبيرة جداً');
      return;
    }
    if (cost > 100000) {
      alert('السعر مرتفع جداً');
      return;
    }
    if (!Number.isFinite(qty) || !Number.isFinite(cost)) {
      alert('قيم غير صالحة');
      return;
    }
    
    var h=allData.find(function(d){return d.stk&&d.stk.sym===addSym;}); h=h?h.health:null;
    var layersAtEntry = h ? h.layers || null : null;
    
    // ✨ احسب القيمة الجديدة قبل setPort
    var addedValue = qty * cost;
    
    setPort(function(prev){
      var ex=prev.find(function(x){return x.sym===addSym;});
      if(ex) return prev.map(function(x){return x.sym!==addSym?x:Object.assign({},x,{qty:x.qty+qty,avgCost:(x.avgCost*x.qty+cost*qty)/(x.qty+qty), layersAtEntry: layersAtEntry || x.layersAtEntry});});
      return prev.concat([{sym:addSym,qty:qty,avgCost:cost, layersAtEntry: layersAtEntry}]);
    });

    setTradeLog(function(prev){return [{id:Date.now(),sym:addSym,name:found?found.name:addSym,action:"شراء",qty:qty,price:cost,date:new Date().toISOString().slice(0,10),signal:h?h.sig||"-":"-",score:h?h.score||0:0}].concat(prev);});
    setSheet(false); setAddSym(""); setAddQty(""); setAddCost("");
    
    // ✨ سجّل نقطة أداء - استخدم القيمة الحديثة
    var today=new Date().toISOString().slice(0,10);
    setPerfHistory(function(prev){
      var lastV = prev.length ? prev[prev.length - 1].v : 0;
      var newV = lastV + addedValue;
      return prev.concat([{date:today,v:Math.round(newV)}]);
    });
  }

  // حالة جلسة تداول السعودية - تتحدث كل دقيقة
  var nowT_s=useState(new Date()); var nowT=nowT_s[0], setNowT=nowT_s[1];
  useEffect(function(){
    var t=setInterval(function(){setNowT(new Date());},60000);
    return function(){clearInterval(t);};
  },[]);
  var hour=nowT.getHours(), min=nowT.getMinutes();
  var timeVal=hour*60+min;
  var isSession=(timeVal>=10*60&&timeVal<15*60);
  var isPreOpen=(timeVal>=9*60+30&&timeVal<10*60);
  var sessionLabel=isSession?"الجلسة مفتوحة":isPreOpen?"ما قبل الفتح":"الجلسة مغلقة";
  var sessionColor=isSession?C.mint:isPreOpen?C.amber:C.coral;

  var fmt=function(n){return n.toLocaleString("en-US",{maximumFractionDigits:0});};
  var headerStats=[
    {l:"اليوم",v:(dp>=0?"+":"")+fmt(dp)+" ر",c:dp>=0?C.mint:C.coral},
  ];
  var logStats=useMemo(function(){
    if(!tradeLog.length) return null;
    var buys=tradeLog.filter(function(t){return t.action==="شراء";});
    var sells=tradeLog.filter(function(t){return t.action==="بيع";});
    var totalBuyVal=buys.reduce(function(s,t){return s+t.price*t.qty;},0);
    var avgScore=Math.round(tradeLog.reduce(function(s,t){return s+(t.score||0);},0)/tradeLog.length);
    var winTrades=sells.filter(function(t){var b=tradeLog.find(function(b2){return b2.action==="شراء"&&b2.sym===t.sym;});return b&&t.price>b.price;}).length;
    var winRate=sells.length>0?Math.round(winTrades/sells.length*100):0;
    var avgHold="-";
    if(buys.length>0){
      var oldest=buys.reduce(function(mn,t){return t.date<mn?t.date:mn;},buys[0].date);
      var newest=tradeLog.reduce(function(mx,t){return t.date>mx?t.date:mx;},tradeLog[0].date);
      var days=Math.round((new Date(newest)-new Date(oldest))/(86400000));
      if(days>0) avgHold=days+"يوم";
    }
    return [
      {l:"صفقات شراء",v:String(buys.length),c:C.mint,sub:Math.round(totalBuyVal/1000)+"K ر"},
      {l:"نسبة الربح",v:(sells.length>0?winRate:"-")+"%",c:winRate>=50?C.mint:C.coral,sub:winTrades+" من "+sells.length},
      {l:"متوسط الدرجة",v:String(avgScore),c:avgScore>=70?C.mint:avgScore>=50?C.amber:C.coral,sub:"/100"},
      {l:"مدة الاحتفاظ",v:avgHold,c:C.electric,sub:"متوسط"},
    ];
  },[tradeLog]);
  // ======= بيانات تاسي - جاهز للـ API =======
  // عند ربط API استبدل هذا الـ useEffect:
  // fetch("https://your-api.com/tasi").then(r=>r.json()).then(data=>{
  //   setTasiData({now: data.price, change: data.changePct});
  // });
  var td_s=useState(function(){
    return loadLS("tp_tasi_baseline", null);
  }); var tasiBaseline=td_s[0], setTasiBaseline=td_s[1];

  var td2_s=useState({now:null, change:null});
  var tasiLive=td2_s[0], setTasiLive=td2_s[1];

  // عند أول صفقة: احفظ سعر تاسي الحالي كنقطة بداية
  useEffect(function(){
    if(tradeLog.length>0 && !tasiBaseline){
      // عند ربط API: استبدل 11500 بالسعر الحقيقي من API
      var baselinePrice = tasiLive.now || 11500;
      var baseline = {price: baselinePrice, date: tradeLog[tradeLog.length-1].date};
      setTasiBaseline(baseline);
      saveLS("tp_tasi_baseline", baseline);
    }
  },[tradeLog.length]);

  // حساب عائد تاسي الحقيقي
  var tasiReturn = useMemo(function(){
    if(tasiLive.now && tasiBaseline && tasiBaseline.price){
      // عائد حقيقي من API
      return ((tasiLive.now - tasiBaseline.price) / tasiBaseline.price * 100);
    }
    // تقدير مؤقت حتى يتوفر API
    return tasiLive.change || 0;
  },[tasiLive, tasiBaseline]);

  var compareData=useMemo(function(){
    var portReturn=tpP;
    var alpha2=portReturn-tasiReturn;
    var best=positions.slice().sort(function(a,b){return b.pnlPct-a.pnlPct;})[0];
    var worst=positions.slice().sort(function(a,b){return a.pnlPct-b.pnlPct;})[0];
    var winRate2=positions.filter(function(p){return p.pnl>=0;}).length;
    var firstDate=tradeLog.length?tradeLog[tradeLog.length-1].date:"-";
    var maxDD=positions.length>0?Math.abs(Math.min.apply(null,positions.map(function(p){return p.pnlPct;}))).toFixed(1):"0";
    var avgPos=positions.length>0?(tv/positions.length/1000).toFixed(1):"0";
    var sectorMap={};
    positions.forEach(function(p){
      var sec=p.stk.sec||"أخرى";
      sectorMap[sec]=(sectorMap[sec]||0)+p.value;
    });
    var sectors=Object.keys(sectorMap).map(function(k){return {name:k,pct:tv>0?Math.round(sectorMap[k]/tv*100):0};}).sort(function(a,b){return b.pct-a.pct;});
    var tasiLiveLabel = tasiLive.now ? "تاسي (حي)" : "تاسي (تقدير)";
    return {
      portReturn:portReturn, tasiReturn:tasiReturn, alpha:alpha2,
      tasiLabel:tasiLiveLabel, tasiIsLive:!!tasiLive.now,
      best:best, worst:worst, winRate:winRate2, firstDate:firstDate,
      sectors:sectors,
      bars:[
        {l:"محفظتك",v:portReturn,c:C.electric,icon:"portfolio"},
        {l:tasiLiveLabel,v:tasiReturn,c:C.amber,icon:"compare"},
      ],
      statsItems:[
        {l:"عدد الصفقات",v:String(tradeLog.length),c:C.electric},
        {l:"نسبة الربح",v:(positions.length>0?Math.round(winRate2/positions.length*100):0)+"%",c:winRate2/(positions.length||1)>=0.5?C.mint:C.coral},
        {l:"أقصى تراجع",v:"-"+maxDD+"%",c:parseFloat(maxDD)>10?C.coral:C.amber},
        {l:"متوسط المركز",v:avgPos+"K ر",c:C.electric},
        {l:"اجمالي الربح",v:(tp>=0?"+":"")+Math.round(tp).toLocaleString("en-US")+" ر",c:tp>=0?C.mint:C.coral},
        {l:"راس المال المستخدم",v:Math.round(tv/capital*100)+"%",c:C.amber},
      ],
    };
  },[positions,tpP,tradeLog,tv,capital,tasiReturn]);
  var foundH=allData.find(function(d){return d.stk&&d.stk.sym===addSym;}); var foundHealth=foundH?foundH.health:null;
  var foundHealthColor=foundHealth?foundHealth.sig==="شراء قوي"?C.mint:foundHealth.sig==="تخفيف"?C.coral:foundHealth.sig==="مراقبة"?C.amber:C.smoke:C.smoke;
  var foundHealthPct=foundHealth&&foundHealth.positionSize?foundHealth.positionSize.pct:0;
  var addCostVal=canAdd?parseFloat(addCost)*parseFloat(addQty):0;
  var addWeightVal=addCostVal>0?(addCostVal/(tv+addCostVal))*100:0;
  var addIsOver=foundHealthPct>0&&addWeightVal>foundHealthPct*1.3;
  var addCostPreview=canAdd?{cost:addCostVal,weight:addWeightVal,isOver:addIsOver,idealPct:foundHealthPct}:null;
  return (
 <div style={{maxWidth:430,margin:"0 auto",background:C.ink,minHeight:"100vh",fontFamily:"Cairo,system-ui,sans-serif",direction:"rtl",color:C.snow,position:"relative",overflowX:"hidden"}}>

{isLoading ? (
  <div style={{padding:"80px 16px 16px"}}>
    {Array.from({length:5}).map((_,i)=>(
      <div key={i} style={{
        height:80, marginBottom:10, borderRadius:14,
        background:'linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)',
        backgroundSize:'200% 100%',
        animation:'shimmer 1.4s ease infinite',
        animationDelay: i * 0.1 + 's',
      }}/>
    ))}
    <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
  </div>
) : (
  <>
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {[{w:300,h:300,t:"-8%",r:"-15%",c:C.gold+"08",dur:"18s",an:"particle0"},{w:240,h:240,t:"55%",r:"-8%",c:C.gold+"06",dur:"22s",an:"particle1"},{w:260,h:260,t:"25%",r:"65%",c:C.electric+"07",dur:"16s",an:"particle2"},{w:180,h:180,t:"75%",r:"18%",c:C.electric+"05",dur:"24s",an:"particle3"}].map(function(pp,i){return(
          <div key={i} style={{position:"absolute",width:pp.w,height:pp.h,borderRadius:"50%",background:"radial-gradient(circle,"+pp.c+" 0%,transparent 70%)",top:pp.t,right:pp.r,animation:pp.an+" "+pp.dur+" ease-in-out infinite"}}/>
        );})}
      </div>
      <div style={{position:"sticky",top:0,zIndex:50,background:"linear-gradient(180deg,"+C.void+"f8 0%,"+C.void+"dd 100%)",backdropFilter:"blur(20px)",borderBottom:"1px solid "+C.line+"55",padding:"10px 20px 0"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingBottom:8}}>
          <button onClick={function(){setSheet(true);}} style={{width:44,height:44,borderRadius:12,border:"1px solid "+C.line,background:C.layer3,color:C.mint,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,boxShadow:"inset 0 1px 0 "+C.layer2}}>+</button>
          <button onClick={function(){setHeaderMin(function(h){return !h;});}} style={{width:40,height:4,borderRadius:2,background:headerMin?C.gold:C.ash,cursor:"pointer",border:"none",padding:0,transition:"background .2s"}}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span className={isSession?"live-dot":""} style={{width:5,height:5,borderRadius:"50%",background:sessionColor,boxShadow:"0 0 6px "+sessionColor,display:"inline-block"}}/>
            <span style={{fontSize:11,color:sessionColor,fontWeight:700}}>{sessionLabel}</span>
          </div>
        </div>
        {!headerMin&&(<div style={{borderBottom:"1px solid "+C.line+"44",paddingBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{position:"relative",width:68,height:68,flexShrink:0}}>
              <svg width={68} height={68} style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                <circle cx={34} cy={34} r={28} fill="none" stroke={C.ash} strokeWidth={3.5} strokeOpacity={.2}/>
                <circle cx={34} cy={34} r={28} fill="none" stroke={tp>=0?C.mint:C.coral} strokeWidth={3.5} strokeDasharray={2*Math.PI*28} strokeDashoffset={2*Math.PI*28*(1-Math.min(1,Math.abs(tpP)/50))} strokeLinecap="round" style={{filter:"drop-shadow(0 0 5px "+(tp>=0?C.mint:C.coral)+"aa)",transition:"stroke-dashoffset 1s ease"}}/>
              </svg>
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:14,fontWeight:900,color:tp>=0?C.mint:C.coral,lineHeight:1,textShadow:tp>=0?"0 0 10px #1ee68a88":"0 0 10px #ff5f6a88"}}>{tpP>=0?"+":""}{tpP.toFixed(1)}%</div>
                <div style={{fontSize:9,color:C.smoke,fontWeight:700}}>عائد</div>
              </div>
            </div>
            <div>
              <div style={{fontSize:17,fontWeight:900,color:C.snow,lineHeight:1,textShadow:"0 0 8px rgba(240,246,255,.4)"}}>محفظتي</div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:tp>=0?C.mint:C.coral,background:(tp>=0?C.mint:C.coral)+"15",border:"1px solid "+(tp>=0?C.mint:C.coral)+"30",padding:"1px 7px",borderRadius:5,fontFamily:"IBM Plex Mono,monospace"}}>{tp>=0?"+":""}{fmt(tp)} ر</span>
                {urgentN>0&&(<span style={{fontSize:12,fontWeight:800,color:C.coral,display:"flex",alignItems:"center",gap:3}}><SvgIcon name="urgent" size={9} color={C.coral}/>{urgentN} عاجل</span>)}
              </div>
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:5,justifyContent:"center"}}>
              <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:20,fontWeight:900,color:C.snow,lineHeight:1,textShadow:"0 0 8px rgba(240,246,255,.4)"}}>{tv>0?fmt(tv):"-"}</div>
              <div style={{fontSize:11,color:C.smoke,fontWeight:700}}>ريال</div>
            </div>
            <div style={{fontSize:11,color:C.smoke,marginTop:3,textAlign:"center"}}>{positions.length} مركز</div>
          </div>
        </div>)}
        {!headerMin&&(<div style={{padding:"8px 0 0",display:"flex",gap:0}}>
          {headerStats.map(function(s,i){return(
            <div key={i} style={{flex:1,borderRight:i<2?"1px solid "+C.line+"44":"none",paddingRight:i<2?8:0,paddingLeft:i>0?8:0,textAlign:"center"}}>
              <div style={{fontSize:11,color:C.smoke,marginBottom:2}}>{s.l}{s.est&&<span style={{fontSize:11,color:C.ash}}> *</span>}</div>
              <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:12,fontWeight:800,color:s.c}}>{s.v}</div>
            </div>
          );})}
        </div>)} 
        {!headerMin && (
          <div style={{display:"flex",gap:10,marginTop:12,marginBottom:4}}>
            <button
              onClick={function(){switchTab("decisions");}}
              style={{
                flex:1,
                padding:"14px 10px",
                background:"linear-gradient(135deg,"+C.gold+"18,"+C.gold+"08)",
                border:"1px solid "+C.gold+"33",
                borderRadius:14,
                cursor:"pointer",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                gap:6,
                boxShadow:"0 4px 12px "+C.gold+"15",
                transition:"all 0.2s",
              }}
            >
              <div style={{fontSize:22}}>🔍</div>
              <div style={{fontSize:12,fontWeight:900,color:C.gold,fontFamily:"Cairo,sans-serif"}}>
                التحليل
              </div>
              <div style={{fontSize:9,color:C.smoke,fontWeight:600}}>
                9 طبقات
              </div>
            </button>
            
            <button
            onClick={function(){setTab(TAB_IDS.REBALANCING);}}
              style={{
                flex:1,
                padding:"14px 10px",
                background:"linear-gradient(135deg,"+C.electric+"18,"+C.electric+"08)",
                border:"1px solid "+C.electric+"33",
                borderRadius:14,
                cursor:"pointer",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                gap:6,
                boxShadow:"0 4px 12px "+C.electric+"15",
                transition:"all 0.2s",
              }}
            >
              <div style={{fontSize:22}}>⚖️</div>
              <div style={{fontSize:12,fontWeight:900,color:C.electric,fontFamily:"Cairo,sans-serif"}}>
                توازن المحفظة
              </div>
              <div style={{fontSize:9,color:C.smoke,fontWeight:600}}>
                Rebalance
              </div>
            </button>
                        <button
              onClick={function(){haptic.tap(); switchTab("iq");}}
              style={{
                flex:1,
                padding:"14px 10px",
                background:"linear-gradient(135deg,"+C.plasma+"18,"+C.plasma+"08)",
                border:"1px solid "+C.plasma+"33",
                borderRadius:14,
                cursor:"pointer",
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                gap:6,
                boxShadow:"0 4px 12px "+C.plasma+"15",
                transition:"all 0.2s",
              }}
            >
              <div style={{fontSize:22}}>🧠</div>
              <div style={{fontSize:12,fontWeight:900,color:C.plasma,fontFamily:"Cairo,sans-serif"}}>
                Portfolio IQ
              </div>
              <div style={{fontSize:9,color:C.smoke,fontWeight:600}}>
                ذكاء متقدم
              </div>
            </button>
          </div>
        )}
                <div style={{display:"flex",gap:0,marginTop:8}}>
          {[{id:"decisions",l:"القرارات"},{id:"log",l:"السجل"},{id:"compare",l:"المقارنة"}
].map(function(t){return(
            <button key={t.id} onClick={function(){switchTab(t.id);}} style={{flex:1,padding:"9px 0",background:"transparent",border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"Cairo,sans-serif",color:activeTab===t.id?C.snow:C.smoke,borderBottom:"2px solid "+(activeTab===t.id?C.gold:"transparent"),transition:"all .2s"}}>
              {t.l}
            </button>
          );})}
        </div>
      </div>

      {activeTab==="decisions"&&(
        <div id="tab-decisions" style={{overflowY:"auto",paddingTop:10,paddingLeft:20,paddingRight:20,paddingBottom:"calc(90px + env(safe-area-inset-bottom, 0px))",position:"relative",zIndex:1}}>
          {positions.length===0?(
            <div style={{textAlign:"center",padding:"70px 20px"}}>
              <div style={{width:72,height:72,borderRadius:20,margin:"0 auto 20px",background:"linear-gradient(135deg,"+C.layer2+","+C.layer3+")",border:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"inset 0 1px 0 "+C.edge}}>
                <SvgIcon name="portfolio" size={32} color={C.smoke}/>
              </div>
              <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"2px",marginBottom:6}}>PORTFOLIO EMPTY</div>
              <div style={{fontSize:15,fontWeight:800,color:C.mist,marginBottom:8}}>لا توجد مراكز</div>
              <div style={{fontSize:12,color:C.smoke,marginBottom:28,lineHeight:1.7}}>اضف اسهمك لتظهر توصيات الشراء والبيع من المحرك</div>
              <button onClick={function(){haptic.tap();setSheet(true);}} style={{background:"linear-gradient(135deg,"+C.electric+"28,"+C.electric+"12)",border:"1px solid "+C.electric+"44",borderRadius:14,padding:"13px 32px",cursor:"pointer",fontSize:13,fontWeight:900,color:C.electric,fontFamily:"Cairo,sans-serif",boxShadow:"0 4px 20px "+C.electric+"22"}}>+ اضف سهمك الاول</button>
            </div>
          ):(
            <div>
              {/* ======= لوحة التنبيهات ======= */}
              {alerts.length>0&&(
                <div className="fade-in" style={{marginBottom:12}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <SvgIcon name="urgent" size={11} color={C.coral}/>
                      <span style={{fontSize:11,fontWeight:800,color:C.coral}}>تنبيهات ({alerts.length})</span>
                    </div>
                    <button onClick={function(){setAlerts([]);}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:11,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>مسح الكل</button>
                  </div>
                  {alerts.map(function(a){return(
                    <div key={a.id} className={a.urgent?"fade-in danger-pulse alert-flash":"fade-in"} style={{marginBottom:8,padding:"10px 12px",background:"linear-gradient(135deg,"+a.color+"18,"+a.color+"08)",border:"1px solid "+a.color+"44",borderRadius:12,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                          <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:12,fontWeight:900,color:C.snow}}>{a.sym}</span>
                          <span style={{fontSize:11,fontWeight:800,color:a.color,background:a.color+"20",borderRadius:5,padding:"1px 7px"}}>{a.act}</span>
                          <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,color:a.pnlPct>=0?C.mint:C.coral,fontWeight:700}}>{a.pnlPct>=0?"+":""}{a.pnlPct.toFixed(1)}%</span>
                        </div>
                        <div style={{fontSize:11,color:C.smoke,lineHeight:1.5}}>{a.reason}</div>
                      </div>
                      <button onClick={function(){setAlerts(function(prev){return prev.filter(function(x){return x.id!==a.id;});});}} style={{background:"transparent",border:"none",cursor:"pointer",color:C.ash,fontSize:14,flexShrink:0,padding:0,lineHeight:1}}>×</button>
                    </div>
                  );})}
                </div>
              )}
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0 10px"}}>
                <div style={{width:3,height:14,background:C.electric,borderRadius:2,boxShadow:"0 0 6px "+C.electric+"66"}}/>
                <span style={{fontSize:11,fontWeight:700,color:C.mist,letterSpacing:".5px"}}>القرارات</span>
                {lastUpdate&&<span style={{fontSize:10,color:C.ash,marginRight:"auto"}}>آخر تحديث {lastUpdate.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"})}</span>}
              </div>
              <div className="card-enter" style={{marginBottom:12,background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:16,border:"1px solid "+C.line,boxShadow:"0 4px 20px rgba(0,0,0,.3),inset 0 1px 0 "+C.layer3,overflow:"hidden"}}>
                <div style={{padding:"12px 14px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"1.5px"}}>الأداء</span>
                  <span style={{fontSize:11,color:C.ash}}>{perfHistory.length>0?"منذ "+perfHistory[0].date.slice(5):""}</span>
                </div>
                <div style={{padding:"4px 0 8px"}}>
                  <PerfChart history={perfHistory}/>
                </div>
                <div style={{padding:"10px 14px",borderTop:"1px solid "+C.line+"33"}}>
                  <span style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"1.5px",display:"block",marginBottom:10}}>التوزيع</span>
                  <DonutChart positions={positions} tv={tv}/>
                </div>
                <div style={{padding:"0 14px 12px",borderTop:"1px solid "+C.line+"33",marginTop:8}}>
                  <SummaryCard positions={positions} tv={tv} tp={tp} tpP={tpP} dp={dp} capital={capital} tradeLog={tradeLog}/>

                {/* ══ زكاة المحفظة ══ */}
                {tv >= zakatCalc.nisab && (
                  <div style={{
                    marginTop:8, padding:"10px 14px",
                    background:"linear-gradient(135deg,rgba(240,192,80,.12),rgba(240,192,80,.06))",
                    border:"1px solid rgba(240,192,80,.3)", borderRadius:12,
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                  }}>
                    <div>
                      <div style={{fontSize:9,color:"#f0c050",fontWeight:700,marginBottom:2}}>
                        ☪ زكاة المحفظة (2.5%)
                      </div>
                      <div style={{fontSize:8,color:"#94a3b8"}}>{zakatCalc.note}</div>
                    </div>
                    <div style={{fontSize:16,fontWeight:900,color:"#f0c050"}}>
                      {zakatCalc.zakatDue(tv).toLocaleString("ar-SA")} ر.س
                    </div>
                  </div>
                )}

                {/* ══ أزرار التصدير ══ */}
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={exportToCSV} style={{
                    flex:1,padding:"8px",borderRadius:10,
                    background:"rgba(77,159,255,.15)",border:"1px solid rgba(77,159,255,.3)",
                    color:"#4d9fff",fontSize:9,fontWeight:700,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                  }}>
                    ⬇ تصدير المحفظة CSV
                  </button>
                  {tradeHistory.length > 0 && (
                    <button onClick={exportTradeHistory} style={{
                      flex:1,padding:"8px",borderRadius:10,
                      background:"rgba(16,201,126,.12)",border:"1px solid rgba(16,201,126,.25)",
                      color:"#10c97e",fontSize:9,fontWeight:700,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                    }}>
                      ⬇ سجل الصفقات CSV
                    </button>
                  )}
                </div>
                </div>
              </div>
 
               

                             {/* ═══ لوحة المخاطر الشاملة (قابلة للطي) ═══ */}
              
             {sorted.map(function(p,i){return <Card key={p.sym} p={p} i={i} capital={capital} setSellSheet={setSellSheet} onEdit={function(pos){setEditPos(pos);}}/>;}) }

              {/* 🎨 زر التحليل المتقدم */}
              <div style={{margin:"24px 0 12px"}}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    width:"100%",
                    padding:"16px 18px",
                    background: showAdvanced
                      ? "linear-gradient(135deg,rgba(240,192,80,0.18),rgba(240,192,80,0.08))"
                      : "linear-gradient(135deg,rgba(77,159,255,0.15),rgba(77,159,255,0.05))",
                    border: `1.5px solid ${showAdvanced ? "rgba(240,192,80,0.4)" : "rgba(77,159,255,0.35)"}`,
                    borderRadius:16,
                    cursor:"pointer",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"space-between",
                    transition:"all 0.3s ease",
                    boxShadow: showAdvanced
                      ? "0 4px 20px rgba(240,192,80,0.15)"
                      : "0 4px 20px rgba(77,159,255,0.12)",
                  }}
                >
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{
                      width:42,
                      height:42,
                      borderRadius:12,
                      background: showAdvanced
                        ? "linear-gradient(135deg,#f0c050,#ffd878)"
                        : "linear-gradient(135deg,#4d9fff,#22d3ee)",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      fontSize:22,
                      boxShadow: showAdvanced
                        ? "0 4px 12px rgba(240,192,80,0.3)"
                        : "0 4px 12px rgba(77,159,255,0.3)",
                    }}>
                      📊
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{
                        fontSize:14,
                        fontWeight:900,
                        color:"#f0f6ff",
                        fontFamily:"Cairo,sans-serif",
                        marginBottom:2,
                      }}>
                        التحليل المتقدم
                      </div>
                      <div style={{
                        fontSize:10,
                        color:"#90a4c8",
                        fontWeight:600,
                      }}>
                        {showAdvanced ? "7 تحليلات احترافية · اضغط للإخفاء" : "7 تحليلات احترافية + لوحة المخاطر"}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize:24,
                    color: showAdvanced ? "#f0c050" : "#4d9fff",
                    fontWeight:900,
                    transition:"transform 0.3s ease",
                    transform: showAdvanced ? "rotate(180deg)" : "rotate(0)",
                  }}>
                    ⌄
                  </div>
                </button>
              </div> 
              
              {/* ═══ الرسوم البيانية المتقدمة (قابلة للطي) ═══ */}
              {showAdvanced && (
              <>
              {/* 📈 رسم بياني: قيمة المحفظة عبر الزمن */}
              {portfolioAnalysis && portfolioAnalysis.chartData && portfolioAnalysis.chartData.portfolioValue && portfolioAnalysis.chartData.portfolioValue.length > 0 && (
                <PortfolioValueChart data={portfolioAnalysis.chartData.portfolioValue} />
              )}

              {/* 📉 رسم بياني: Drawdown */}
                           {portfolioAnalysis && portfolioAnalysis.chartData && portfolioAnalysis.chartData.drawdown && portfolioAnalysis.chartData.drawdown.data && portfolioAnalysis.chartData.drawdown.data.length > 0 && (
                <DrawdownChart data={portfolioAnalysis.chartData.drawdown} />
              )}

              {/* 📅 جدول العوائد الشهرية */}
              {portfolioAnalysis && portfolioAnalysis.chartData && portfolioAnalysis.chartData.monthlyReturns && portfolioAnalysis.chartData.monthlyReturns.months && portfolioAnalysis.chartData.monthlyReturns.months.length > 0 && (
                <MonthlyReturnsHeatmap data={portfolioAnalysis.chartData.monthlyReturns} />
              )}

              {/* 📊 رسم المخاطرة vs العائد */}
              {portfolioAnalysis && portfolioAnalysis.chartData && portfolioAnalysis.chartData.riskReturn && portfolioAnalysis.chartData.riskReturn.stocks && portfolioAnalysis.chartData.riskReturn.stocks.length > 0 && (
                <RiskReturnScatter data={portfolioAnalysis.chartData.riskReturn} />
              )}

              {/* 🔗 مصفوفة الارتباط */}
              {portfolioAnalysis && portfolioAnalysis.chartData && portfolioAnalysis.chartData.correlation && portfolioAnalysis.chartData.correlation.matrix && portfolioAnalysis.chartData.correlation.matrix.length >= 2 && (
                <CorrelationHeatmap data={portfolioAnalysis.chartData.correlation} />
              )}

              {/* 📊 رسم توزيع VaR */}
              {portfolioAnalysis && portfolioAnalysis.chartData && portfolioAnalysis.chartData.varDistribution && portfolioAnalysis.chartData.varDistribution.bins && portfolioAnalysis.chartData.varDistribution.bins.length >= 3 && (
                <VaRDistributionChart data={portfolioAnalysis.chartData.varDistribution} />
              )}

              {/* 🛡️ لوحة المخاطر الشاملة */}
              {portfolioAnalysis && <RiskDashboard analysis={portfolioAnalysis} />}
              </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab==="log"&&(
        <div id="tab-log" style={{overflowY:"auto",paddingTop:10,paddingLeft:20,paddingRight:20,paddingBottom:"calc(90px + env(safe-area-inset-bottom, 0px))",position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0 10px"}}>
            <div style={{width:3,height:14,background:C.gold,borderRadius:2,boxShadow:"0 0 6px "+C.gold+"66"}}/>
            <span style={{fontSize:11,fontWeight:700,color:C.mist,letterSpacing:".5px"}}>سجل الصفقات</span>
            <div style={{marginRight:"auto",background:C.gold+"18",border:"1px solid "+C.gold+"33",borderRadius:8,padding:"2px 8px"}}>
              <span style={{fontSize:11,fontWeight:700,color:C.gold}}>{tradeLog.length} صفقة</span>
            </div>
          </div>
          {tradeLog.length>0&&logStats&&(
            <div className="card-enter" style={{marginBottom:12,background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:14,border:"1px solid "+C.line,boxShadow:"0 4px 16px rgba(0,0,0,.3),inset 0 1px 0 "+C.layer3,overflow:"hidden"}}>
              <div style={{padding:"10px 14px 0"}}><span style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"1.5px"}}>إحصائيات التداول</span></div>
              <div style={{display:"flex",gap:0,padding:"8px 0"}}>
                {logStats.map(function(s,i){return(
                  <div key={i} style={{flex:1,textAlign:"center",borderRight:i<3?"1px solid "+C.line+"44":"none",padding:"4px 6px"}}>
                    <div style={{fontSize:11,color:C.smoke,marginBottom:3}}>{s.l}</div>
                    <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:14,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</div>
                    <div style={{fontSize:11,color:C.ash,marginTop:2}}>{s.sub}</div>
                  </div>
                );}) }
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {["الكل","شراء","بيع"].map(function(f){return(
              <button key={f} onClick={function(){setLogFilter(f);}} style={{flex:1,padding:"8px 0",background:logFilter===f?"linear-gradient(135deg,"+C.gold+"22,"+C.gold+"0a)":"transparent",border:"1px solid "+(logFilter===f?C.gold+"44":C.line),borderRadius:10,cursor:"pointer",fontSize:11,fontWeight:700,color:logFilter===f?C.gold:C.smoke,fontFamily:"Cairo,sans-serif",transition:"all .2s"}}>
                {f}
              </button>
            );}) }
          </div>
          {tradeLog.length===0||(logFilter!=="الكل"&&tradeLog.filter(function(t){return t.action===logFilter;}).length===0)?(
            <div style={{textAlign:"center",padding:"50px 20px"}}>
              <SvgIcon name="log" size={36} color={C.smoke}/>
              <div style={{fontSize:13,color:C.mist,marginTop:12}}>{tradeLog.length===0?"لا توجد صفقات":"لا توجد صفقات "+logFilter}</div>
              {tradeLog.length>0&&<div style={{fontSize:11,color:C.smoke,marginTop:6}}>جرّب فلتر "الكل"</div>}
            </div>
          ):(
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",right:21,top:0,bottom:0,width:1,background:"linear-gradient(180deg,"+C.line+","+C.line+"33)",zIndex:0}}/>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {(logFilter==="الكل"?tradeLog:tradeLog.filter(function(t){return t.action===logFilter;})).map(function(t,i){
                  var stk=sl.find(function(s){return s.sym===t.sym;});
                  var curPrice=stk?stk.p:t.price;
                  var pnlPct=(curPrice-t.price)/t.price*100;
                  var pnlAmt=(curPrice-t.price)*t.qty;
                  var sigCol=t.signal==="شراء قوي"?C.mint:t.signal==="تخفيف"?C.coral:t.signal==="مراقبة"?C.amber:C.smoke;
                  var isBuy=t.action==="شراء";
                  return(
                    <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <div style={{flexShrink:0,width:44,display:"flex",flexDirection:"column",alignItems:"center",gap:2,position:"relative",zIndex:1}}>
                        <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,"+sigCol+"22,"+sigCol+"0a)",border:"1px solid "+sigCol+"44",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                          <span style={{fontSize:11,fontWeight:900,color:sigCol,lineHeight:1}}>{t.sym}</span>
                          {isBuy?<SvgIcon name="buy" size={9} color={C.mint}/>:<SvgIcon name="sell" size={9} color={C.coral}/>}
                        </div>
                        <div style={{fontSize:11,color:C.ash,textAlign:"center",lineHeight:1.2}}>{t.date.slice(5)}</div>
                      </div>
                      <div className="card-enter" style={{flex:1,animationDelay:(i*.04)+"s",background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:14,padding:"12px 14px",border:"1px solid "+(pnlPct>=0?C.mint:C.coral)+"22",boxShadow:"0 3px 12px rgba(0,0,0,.3),inset 0 1px 0 "+C.layer3}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:7}}>
                            <span style={{fontSize:13,fontWeight:900,color:C.snow}}>{t.name}</span>
                            <span style={{fontSize:11,fontWeight:700,color:sigCol,background:sigCol+"15",borderRadius:5,padding:"1px 6px",border:"1px solid "+sigCol+"25"}}>{t.signal}</span>
                          </div>
                          <div style={{textAlign:"left"}}>
                            <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:pnlPct>=0?C.mint:C.coral,lineHeight:1}}>{pnlPct>=0?"+":""}{pnlPct.toFixed(1)}%</div>
                            <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,color:pnlPct>=0?C.mint:C.coral,marginTop:2}}>{pnlAmt>=0?"+":""}{Math.round(pnlAmt).toLocaleString("en-US")} ر</div>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:0,background:"rgba(255,255,255,.03)",borderRadius:9,overflow:"hidden",marginBottom:t.score>0?7:0}}>
                          {[{l:isBuy?"دخول":"خروج",v:t.price.toFixed(2),c:isBuy?C.mint:C.coral},{l:"الآن",v:curPrice.toFixed(2),c:C.mist},{l:"الكمية",v:t.qty.toLocaleString("en-US"),c:C.mist},{l:"القيمة",v:Math.round(t.qty*t.price/1000)+"K",c:C.electric}].map(function(s,j){return(
                            <div key={j} style={{flex:1,padding:"7px 5px",textAlign:"center",borderRight:j<3?"1px solid "+C.line+"33":"none"}}>
                              <div style={{fontSize:11,color:C.smoke,marginBottom:2}}>{s.l}</div>
                              <div style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:800,color:s.c}}>{s.v}</div>
                            </div>
                          );}) }
                        </div>
                        {t.score>0&&(
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:11,color:C.smoke}}>درجة الدخول</span>
                            <div style={{flex:1,height:3,background:C.layer3,borderRadius:2,overflow:"hidden"}}>
                              <div style={{height:"100%",width:t.score+"%",background:t.score>=70?C.mint:t.score>=50?C.amber:C.coral,borderRadius:2}}/>
                            </div>
                            <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:800,color:t.score>=70?C.mint:t.score>=50?C.amber:C.coral}}>{t.score}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) }
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab==="compare"&&(
        <div id="tab-compare" style={{overflowY:"auto",paddingTop:10,paddingLeft:20,paddingRight:20,paddingBottom:"calc(90px + env(safe-area-inset-bottom, 0px))",position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0 10px"}}>
            <div style={{width:3,height:14,background:C.plasma,borderRadius:2,boxShadow:"0 0 6px "+C.plasma+"66"}}/>
            <span style={{fontSize:11,fontWeight:700,color:C.mist,letterSpacing:".5px"}}>مقارنة الاداء</span>
          </div>
          {compareData&&(
            <div>
              <div className="card-enter" style={{background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:16,padding:"16px",border:"1px solid "+(compareData.alpha>=0?C.mint:C.coral)+"22",boxShadow:"0 4px 20px rgba(0,0,0,.3),inset 0 1px 0 "+C.layer3,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"1.5px"}}>الأداء</div>
                    {compareData.tasiIsLive
                      ? <span style={{fontSize:10,color:C.mint,background:C.mint+"18",borderRadius:5,padding:"1px 6px",border:"1px solid "+C.mint+"33",display:"flex",alignItems:"center",gap:3}}><span className="live-dot" style={{width:4,height:4,borderRadius:"50%",background:C.mint,display:"inline-block"}}/>تاسي حي</span>
                      : <span style={{fontSize:10,color:C.ash,background:C.layer3,borderRadius:5,padding:"1px 6px",border:"1px solid "+C.line}}>تاسي تقدير</span>
                    }
                  </div>
                  <div style={{fontSize:11,color:C.ash,background:C.layer3,borderRadius:6,padding:"2px 8px",border:"1px solid "+C.line}}>منذ {compareData.firstDate}</div>
                </div>
                <div style={{marginBottom:10,padding:"4px 0 8px"}}>
                  <PerfChart history={perfHistory}/>
                </div>

                {compareData.bars.map(function(s,i){
                  var maxAbs=Math.max(Math.abs(compareData.portReturn),Math.abs(compareData.tasiReturn),5);
                  var barW=Math.min(100,Math.abs(s.v)/maxAbs*100);
                  return(
                    <div key={i} style={{marginBottom:i<2?12:0}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <SvgIcon name={s.icon} size={13} color={s.c}/>
                          <span style={{fontSize:11,color:C.smoke}}>{s.l}</span>
                        </div>
                        <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:s.c}}>{s.v>=0?"+":""}{s.v.toFixed(1)}%</span>
                      </div>
                      <div style={{height:5,background:C.layer3,borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:barW+"%",background:"linear-gradient(90deg,"+s.c+","+s.c+"88)",borderRadius:3,transition:"width 1s ease",boxShadow:"0 0 6px "+s.c+"44"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              {compareData.sectors&&compareData.sectors.length>0&&(
                <div className="card-enter" style={{animationDelay:".1s",background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:16,padding:"14px",border:"1px solid "+C.line,boxShadow:"0 4px 16px rgba(0,0,0,.3),inset 0 1px 0 "+C.layer3,marginBottom:10}}>
                  <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"1.5px",marginBottom:12}}>توزيع القطاعات</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {compareData.sectors.map(function(sec,j){
                      var colors=[C.electric,C.mint,C.gold,C.plasma,C.teal,C.amber];
                      var clr=colors[j%colors.length];
                      return(
                        <div key={j}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:11,color:C.mist,fontWeight:600}}>{sec.name}</span>
                            <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:800,color:clr}}>{sec.pct}%</span>
                          </div>
                          <div style={{height:4,background:C.layer3,borderRadius:2,overflow:"hidden"}}>
                            <div style={{height:"100%",width:sec.pct+"%",background:"linear-gradient(90deg,"+clr+","+clr+"88)",borderRadius:2,transition:"width 1s ease",boxShadow:"0 0 6px "+clr+"44"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
            {activeTab==="iq"&&(
        <div id="tab-iq" style={{
          overflowY:"auto",
          paddingTop:10,
          paddingLeft:20,
          paddingRight:20,
          paddingBottom:"calc(90px + env(safe-area-inset-bottom, 0px))",
          position:"relative",
          zIndex:1,
        }}>
          {positions.length===0?(
            <div style={{textAlign:"center",padding:"70px 20px"}}>
              <div style={{
                width:72,height:72,borderRadius:20,
                margin:"0 auto 20px",
                background:"linear-gradient(135deg,"+C.plasma+"22,"+C.plasma+"08)",
                border:"1px solid "+C.plasma+"33",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 8px 24px "+C.plasma+"22",
              }}>
                <span style={{fontSize:36}}>🧠</span>
              </div>
              <div style={{fontSize:11,color:C.plasma,fontWeight:700,letterSpacing:"2px",marginBottom:6}}>
                PORTFOLIO IQ™
              </div>
              <div style={{fontSize:15,fontWeight:800,color:C.mist,marginBottom:8}}>
                ذكاء متقدم لمحفظتك
              </div>
              <div style={{fontSize:12,color:C.smoke,marginBottom:28,lineHeight:1.7}}>
                أضف أسهمك للحصول على<br/>
                تحليل بمستوى Bloomberg + Bridgewater
              </div>
            </div>
          ):(
            (function(){
              var iq = analyzePortfolioIQ(positions, [], {riskTolerance: 0.20});
              var scoreColor = iq.iqScore >= 80 ? C.mint :
                               iq.iqScore >= 65 ? C.teal :
                               iq.iqScore >= 50 ? C.amber : C.coral;
              return (
                <div>
                  <div className="card-enter" style={{
                    background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
                    border:"1px solid "+C.plasma+"33",
                    borderRadius:20,
                    padding:"20px 16px",
                    marginBottom:14,
                    boxShadow:"0 8px 32px "+C.plasma+"22, inset 0 1px 0 "+C.layer3,
                    position:"relative",
                    overflow:"hidden",
                  }}>
                    <div style={{
                      position:"absolute",
                      top:0,left:0,right:0,
                      height:3,
                      background:"linear-gradient(90deg,"+C.plasma+"00,"+C.plasma+"ff,"+C.plasma+"00)",
                    }}/>
                    <div style={{textAlign:"center",marginBottom:16}}>
                      <div style={{fontSize:9,color:C.plasma,fontWeight:800,letterSpacing:"3px",marginBottom:4}}>
                        🧠 PORTFOLIO IQ™
                      </div>
                      <div style={{fontSize:11,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
                        تحليل بمستوى Bloomberg + Bridgewater
                      </div>
                    </div>
                    <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
                      <div style={{position:"relative",width:140,height:140}}>
                        <svg width="140" height="140" style={{transform:"rotate(-90deg)"}}>
                          <circle cx="70" cy="70" r="62" fill="none" stroke={C.layer3} strokeWidth="6"/>
                          <circle 
                            cx="70" cy="70" r="62" 
                            fill="none" 
                            stroke={scoreColor} 
                            strokeWidth="6" 
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 62}
                            strokeDashoffset={(2 * Math.PI * 62) * (1 - iq.iqScore/100)}
                            style={{
                              filter:"drop-shadow(0 0 10px "+scoreColor+"aa)",
                              transition:"stroke-dashoffset 1.5s ease-out",
                            }}
                          />
                        </svg>
                        <div style={{
                          position:"absolute",
                          inset:0,
                          display:"flex",
                          flexDirection:"column",
                          alignItems:"center",
                          justifyContent:"center",
                        }}>
                          <div style={{
                            fontSize:48,
                            fontWeight:900,
                            color:scoreColor,
                            fontFamily:"IBM Plex Mono,monospace",
                            lineHeight:1,
                            textShadow:"0 0 20px "+scoreColor+"66",
                          }}>
                            {iq.iqScore}
                          </div>
                          <div style={{fontSize:10,color:C.smoke,marginTop:4,fontWeight:700,letterSpacing:"1px"}}>
                            IQ SCORE
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:"center",marginBottom:14}}>
                      <div style={{
                        display:"inline-block",
                        padding:"6px 20px",
                        background:scoreColor+"22",
                        border:"1px solid "+scoreColor+"55",
                        borderRadius:12,
                        boxShadow:"0 4px 12px "+scoreColor+"33",
                      }}>
                        <span style={{fontSize:24,fontWeight:900,color:scoreColor,fontFamily:"IBM Plex Mono,monospace"}}>
                          {iq.grade}
                        </span>
                        <span style={{fontSize:11,color:C.mist,fontWeight:700,marginRight:8,fontFamily:"Cairo,sans-serif"}}>
                          {iq.gradeLabel}
                        </span>
                      </div>
                    </div>
                    {iq.summary && iq.summary.headline && (
                      <div style={{
                        textAlign:"center",
                        fontSize:15,
                        fontWeight:800,
                        color:C.snow,
                        marginBottom:14,
                        lineHeight:1.4,
                        fontFamily:"Cairo,sans-serif",
                      }}>
                        {iq.summary.headline}
                      </div>
                    )}
                    {iq.summary && iq.summary.keyInsights && iq.summary.keyInsights.length > 0 && (
                      <div style={{
                        background:"rgba(255,255,255,.03)",
                        border:"1px solid "+C.line,
                        borderRadius:12,
                        padding:"10px 12px",
                      }}>
                        <div style={{fontSize:9,color:C.plasma,fontWeight:800,letterSpacing:"1.5px",marginBottom:6}}>
                          💡 ملاحظات رئيسية
                        </div>
                        {iq.summary.keyInsights.map(function(insight,i){
                          return (
                            <div key={i} style={{
                              fontSize:11,
                              color:C.mist,
                              lineHeight:1.6,
                              marginBottom:i<iq.summary.keyInsights.length-1?6:0,
                              fontFamily:"Cairo,sans-serif",
                              display:"flex",
                              alignItems:"flex-start",
                              gap:6,
                            }}>
                              <span style={{color:C.plasma,fontWeight:700,marginTop:1}}>•</span>
                              <span>{insight}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{
                    background:C.layer1,
                    border:"1px solid "+C.line,
                    borderRadius:12,
                    padding:"10px 14px",
                    marginBottom:14,
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"space-between",
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:14}}>📊</span>
                      <div>
                        <div style={{fontSize:11,color:C.mist,fontWeight:700}}>
                          {positions.length} {positions.length === 1 ? "سهم" : "أسهم"}
                        </div>
                        <div style={{fontSize:9,color:C.smoke}}>
                          محلّل بـ 8 طبقات ذكاء
                        </div>
                      </div>
                    </div>
                    {iq.summary && (
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:11,color:C.plasma,fontWeight:800}}>
                          {iq.summary.actionsCount} توصية
                        </div>
                        {iq.summary.criticalActions > 0 && (
                          <div style={{fontSize:9,color:C.coral,fontWeight:700}}>
                            {iq.summary.criticalActions} عاجل
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Top Recommendation Card */}
{iq.recommendations && iq.recommendations.items && iq.recommendations.items.length > 0 && (function(){
  var topRec = iq.recommendations.items[0];
  var priorityColor = topRec.priority === 'critical' ? C.coral :
                      topRec.priority === 'high' ? C.amber :
                      topRec.priority === 'medium' ? C.teal : C.smoke;
  var priorityLabel = topRec.priority === 'critical' ? 'عاجل جداً' :
                      topRec.priority === 'high' ? 'مهم' :
                      topRec.priority === 'medium' ? 'متوسط' : 'منخفض';
  var priorityIcon = topRec.priority === 'critical' ? '🚨' :
                     topRec.priority === 'high' ? '⚡' :
                     topRec.priority === 'medium' ? '💡' : '📌';
  return (
    <div className="card-enter" style={{
      background:"linear-gradient(135deg,"+priorityColor+"15,"+priorityColor+"08)",
      border:"1px solid "+priorityColor+"44",
      borderRadius:16,
      padding:"16px",
      marginBottom:14,
      boxShadow:"0 8px 24px "+priorityColor+"22, inset 0 1px 0 "+C.layer3,
      position:"relative",
      overflow:"hidden",
    }}>
      {/* شريط علوي ملون */}
      <div style={{
        position:"absolute",
        top:0,left:0,right:0,
        height:3,
        background:"linear-gradient(90deg,"+priorityColor+"00,"+priorityColor+"ff,"+priorityColor+"00)",
      }}/>
      
      {/* Header */}
      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        marginBottom:12,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>{priorityIcon}</span>
          <div>
            <div style={{fontSize:9,color:priorityColor,fontWeight:800,letterSpacing:"1.5px"}}>
              توصية #1
            </div>
            <div style={{
              fontSize:10,
              color:priorityColor,
              fontWeight:700,
              background:priorityColor+"22",
              padding:"2px 8px",
              borderRadius:6,
              display:"inline-block",
              marginTop:3,
            }}>
              {priorityLabel}
            </div>
          </div>
        </div>
        <div style={{
          fontSize:9,
          color:C.smoke,
          fontWeight:600,
          textAlign:"left",
        }}>
          {topRec.urgency || ''}
        </div>
      </div>
      
      {/* العنوان الرئيسي */}
      <div style={{
        fontSize:16,
        fontWeight:900,
        color:C.snow,
        marginBottom:10,
        lineHeight:1.4,
        fontFamily:"Cairo,sans-serif",
      }}>
        {topRec.title}
      </div>
      
      {/* السبب */}
      <div style={{
        background:"rgba(255,255,255,.04)",
        border:"1px solid "+C.line,
        borderRadius:10,
        padding:"10px 12px",
        marginBottom:10,
      }}>
        <div style={{fontSize:9,color:priorityColor,fontWeight:800,letterSpacing:"1px",marginBottom:5}}>
          📊 السبب
        </div>
        <div style={{fontSize:11,color:C.mist,lineHeight:1.6,fontFamily:"Cairo,sans-serif"}}>
          {topRec.reasoning}
        </div>
      </div>
      
      {/* التأثير المتوقع */}
      {topRec.expectedImpact && (
        <div style={{
          background:"rgba(30,230,138,.06)",
          border:"1px solid "+C.mint+"33",
          borderRadius:10,
          padding:"10px 12px",
          marginBottom:10,
        }}>
          <div style={{fontSize:9,color:C.mint,fontWeight:800,letterSpacing:"1px",marginBottom:6}}>
            💰 التأثير المتوقع
          </div>
          {Object.keys(topRec.expectedImpact).map(function(key,i){
            return (
              <div key={i} style={{
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center",
                padding:"3px 0",
                fontSize:10,
                fontFamily:"Cairo,sans-serif",
              }}>
                <span style={{color:C.smoke,fontWeight:600}}>{key}</span>
                <span style={{color:C.mint,fontWeight:800,fontFamily:"IBM Plex Mono,monospace"}}>
                  {topRec.expectedImpact[key]}
                </span>
              </div>
            );
          })}
        </div>
      )}
      
      {/* المرجع الأكاديمي */}
      {topRec.academicBasis && (
        <div style={{
          background:"rgba(167,139,250,.06)",
          border:"1px solid "+C.plasma+"33",
          borderRadius:10,
          padding:"8px 12px",
        }}>
          <div style={{fontSize:9,color:C.plasma,fontWeight:800,letterSpacing:"1px",marginBottom:3}}>
            📚 المرجع الأكاديمي
          </div>
          <div style={{
            fontSize:10,
            color:C.mist,
            fontStyle:"italic",
            lineHeight:1.5,
            fontFamily:"Cairo,sans-serif",
          }}>
            {topRec.academicBasis}
          </div>
        </div>
      )}
    </div>
  );
})()}

{/* عداد التوصيات */}
{iq.recommendations && iq.recommendations.total > 1 && (
  <div style={{
    background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
    border:"1px solid "+C.line,
    borderRadius:12,
    padding:"12px 14px",
    marginBottom:14,
    textAlign:"center",
  }}>
    <div style={{fontSize:10,color:C.plasma,fontWeight:800,letterSpacing:"1px",marginBottom:6}}>
      📋 المزيد من التوصيات
    </div>
    <div style={{display:"flex",justifyContent:"center",gap:10,fontSize:11,color:C.mist,fontWeight:700}}>
      {iq.recommendations.critical > 0 && (
        <span style={{color:C.coral}}>🚨 {iq.recommendations.critical} عاجل</span>
      )}
      {iq.recommendations.high > 0 && (
        <span style={{color:C.amber}}>⚡ {iq.recommendations.high} مهم</span>
      )}
      {iq.recommendations.medium > 0 && (
        <span style={{color:C.teal}}>💡 {iq.recommendations.medium} متوسط</span>
      )}
      {iq.recommendations.low > 0 && (
        <span style={{color:C.smoke}}>📌 {iq.recommendations.low} منخفض</span>
      )}
    </div>
    <div style={{fontSize:9,color:C.smoke,marginTop:6,fontFamily:"Cairo,sans-serif"}}>
      جميع التوصيات قادمة في تحديث قادم
    </div>
  </div>
)}
{/* PsyRisk Score™ Card */}
{iq.psyRisk && (function(){
  var psy = iq.psyRisk;
  var psyColor = psy.score >= 80 ? C.mint :
                 psy.score >= 60 ? C.teal :
                 psy.score >= 40 ? C.amber : C.coral;
  return (
    <div className="card-enter" style={{
      background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
      border:"1px solid "+psyColor+"33",
      borderRadius:16,
      padding:"16px",
      marginBottom:14,
      boxShadow:"0 8px 24px "+psyColor+"22, inset 0 1px 0 "+C.layer3,
      position:"relative",
      overflow:"hidden",
    }}>
      <div style={{
        position:"absolute",
        top:0,left:0,right:0,
        height:3,
        background:"linear-gradient(90deg,"+psyColor+"00,"+psyColor+"ff,"+psyColor+"00)",
      }}/>
      
      {/* Header */}
      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        marginBottom:14,
      }}>
        <div>
          <div style={{fontSize:9,color:psyColor,fontWeight:800,letterSpacing:"2px",marginBottom:3}}>
            🧠 PSYRISK SCORE™
          </div>
          <div style={{fontSize:10,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
            مقياس المخاطر النفسية
          </div>
        </div>
        <div style={{textAlign:"left"}}>
          <div style={{
            fontSize:32,
            fontWeight:900,
            color:psyColor,
            fontFamily:"IBM Plex Mono,monospace",
            lineHeight:1,
            textShadow:"0 0 12px "+psyColor+"66",
          }}>
            {psy.score}
          </div>
          <div style={{
            fontSize:10,
            color:psyColor,
            fontWeight:700,
            marginTop:3,
            fontFamily:"Cairo,sans-serif",
          }}>
            {psy.label}
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div style={{
        height:8,
        background:C.layer3,
        borderRadius:4,
        marginBottom:12,
        overflow:"hidden",
      }}>
        <div style={{
          height:"100%",
          width:psy.score+"%",
          background:"linear-gradient(90deg,"+psyColor+","+psyColor+"88)",
          borderRadius:4,
          transition:"width 1.5s ease-out",
          boxShadow:"0 0 8px "+psyColor+"66",
        }}/>
      </div>
      
      {/* Recommendation */}
      <div style={{
        background:"rgba(255,255,255,.04)",
        border:"1px solid "+C.line,
        borderRadius:10,
        padding:"10px 12px",
        marginBottom:psy.sellPanicProbability !== undefined ? 10 : 0,
      }}>
        <div style={{fontSize:9,color:psyColor,fontWeight:800,letterSpacing:"1px",marginBottom:5}}>
          💡 توصية نفسية
        </div>
        <div style={{fontSize:11,color:C.mist,lineHeight:1.6,fontFamily:"Cairo,sans-serif"}}>
          {psy.recommendation}
        </div>
      </div>
      
      {/* Sell Panic Probability */}
      {psy.sellPanicProbability !== undefined && psy.sellPanicProbability > 0 && (
        <div style={{
          background:psy.sellPanicProbability > 50 ? C.coral+"15" : C.amber+"15",
          border:"1px solid "+(psy.sellPanicProbability > 50 ? C.coral+"33" : C.amber+"33"),
          borderRadius:10,
          padding:"10px 12px",
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
        }}>
          <div>
            <div style={{fontSize:10,color:C.smoke,fontWeight:700,marginBottom:2}}>
              ⚠️ احتمال البيع في الذعر
            </div>
            <div style={{fontSize:9,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
              عند الانخفاضات الحادة
            </div>
          </div>
          <div style={{
            fontSize:24,
            fontWeight:900,
            color:psy.sellPanicProbability > 50 ? C.coral : C.amber,
            fontFamily:"IBM Plex Mono,monospace",
          }}>
            {psy.sellPanicProbability}%
          </div>
        </div>
      )}
      
      {/* Factors (if any) */}
      {psy.factors && psy.factors.length > 0 && (
        <div style={{marginTop:10}}>
          <div style={{fontSize:9,color:C.smoke,fontWeight:700,marginBottom:6}}>
            عوامل الخطر النفسي:
          </div>
          {psy.factors.slice(0,2).map(function(f,i){
            return (
              <div key={i} style={{
                fontSize:10,
                color:C.smoke,
                lineHeight:1.5,
                marginBottom:3,
                fontFamily:"Cairo,sans-serif",
                display:"flex",
                alignItems:"flex-start",
                gap:5,
              }}>
                <span style={{color:C.coral,fontWeight:700}}>•</span>
                <span>{f.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})()}

{/* Portfolio DNA™ Card */}
{iq.dna && iq.dna.dimensions && (function(){
  var dna = iq.dna;
  return (
    <div className="card-enter" style={{
      background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
      border:"1px solid "+C.plasma+"33",
      borderRadius:16,
      padding:"16px",
      marginBottom:14,
      boxShadow:"0 8px 24px "+C.plasma+"22, inset 0 1px 0 "+C.layer3,
      position:"relative",
      overflow:"hidden",
    }}>
      <div style={{
        position:"absolute",
        top:0,left:0,right:0,
        height:3,
        background:"linear-gradient(90deg,"+C.plasma+"00,"+C.plasma+"ff,"+C.plasma+"00)",
      }}/>
      
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:9,color:C.plasma,fontWeight:800,letterSpacing:"2px",marginBottom:4}}>
          🧬 PORTFOLIO DNA™
        </div>
        <div style={{fontSize:11,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
          هوية محفظتك الحقيقية
        </div>
      </div>
      
      {/* Personality */}
      {dna.personalityLabel && (
        <div style={{
          background:"linear-gradient(135deg,"+C.plasma+"22,"+C.plasma+"11)",
          border:"1px solid "+C.plasma+"55",
          borderRadius:12,
          padding:"12px 14px",
          marginBottom:14,
          textAlign:"center",
          boxShadow:"0 4px 12px "+C.plasma+"22",
        }}>
          <div style={{fontSize:9,color:C.plasma,fontWeight:800,letterSpacing:"1.5px",marginBottom:4}}>
            ✨ شخصية المحفظة
          </div>
          <div style={{
            fontSize:18,
            fontWeight:900,
            color:C.snow,
            marginBottom:6,
            fontFamily:"Cairo,sans-serif",
          }}>
            {dna.personalityLabel}
          </div>
          {dna.personalityDescription && (
            <div style={{
              fontSize:11,
              color:C.mist,
              lineHeight:1.5,
              fontFamily:"Cairo,sans-serif",
            }}>
              {dna.personalityDescription}
            </div>
          )}
        </div>
      )}
      
      {/* 4 Dimensions */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:8,
        marginBottom:14,
      }}>
        {[
          {key:"growthValue", icon:"📈", label:"النمو/القيمة"},
          {key:"momentumReversion", icon:"⚡", label:"الزخم"},
          {key:"defensiveAggressive", icon:"🛡️", label:"دفاعي/عدواني"},
          {key:"capSize", icon:"🏢", label:"حجم الشركات"},
        ].map(function(dim,i){
          var d = dna.dimensions[dim.key];
          if (!d) return null;
          return (
            <div key={i} style={{
              background:"rgba(255,255,255,.03)",
              border:"1px solid "+C.line,
              borderRadius:10,
              padding:"10px 8px",
              textAlign:"center",
            }}>
              <div style={{fontSize:14,marginBottom:3}}>{dim.icon}</div>
              <div style={{fontSize:9,color:C.smoke,marginBottom:5,fontFamily:"Cairo,sans-serif"}}>
                {dim.label}
              </div>
              {/* Mini bar */}
              <div style={{
                height:4,
                background:C.layer3,
                borderRadius:2,
                marginBottom:5,
                overflow:"hidden",
              }}>
                <div style={{
                  height:"100%",
                  width:d.score+"%",
                  background:C.plasma,
                  borderRadius:2,
                  transition:"width 1.5s ease-out",
                }}/>
              </div>
              <div style={{
                fontSize:10,
                color:C.plasma,
                fontWeight:800,
                fontFamily:"Cairo,sans-serif",
                lineHeight:1.3,
              }}>
                {d.label}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Strengths & Weaknesses */}
      {(dna.strengths && dna.strengths.length > 0) || (dna.weaknesses && dna.weaknesses.length > 0) ? (
        <div style={{display:"flex",gap:8}}>
          {/* Strengths */}
          {dna.strengths && dna.strengths.length > 0 && (
            <div style={{
              flex:1,
              background:C.mint+"10",
              border:"1px solid "+C.mint+"33",
              borderRadius:10,
              padding:"8px 10px",
            }}>
              <div style={{fontSize:9,color:C.mint,fontWeight:800,marginBottom:4}}>
                ✅ نقاط القوة
              </div>
              {dna.strengths.slice(0,3).map(function(s,i){
                return (
                  <div key={i} style={{
                    fontSize:10,
                    color:C.mist,
                    lineHeight:1.4,
                    marginBottom:2,
                    fontFamily:"Cairo,sans-serif",
                  }}>
                    • {s}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Weaknesses */}
          {dna.weaknesses && dna.weaknesses.length > 0 && (
            <div style={{
              flex:1,
              background:C.coral+"10",
              border:"1px solid "+C.coral+"33",
              borderRadius:10,
              padding:"8px 10px",
            }}>
              <div style={{fontSize:9,color:C.coral,fontWeight:800,marginBottom:4}}>
                ⚠️ نقاط الضعف
              </div>
              {dna.weaknesses.slice(0,3).map(function(w,i){
                return (
                  <div key={i} style={{
                    fontSize:10,
                    color:C.mist,
                    lineHeight:1.4,
                    marginBottom:2,
                    fontFamily:"Cairo,sans-serif",
                  }}>
                    • {w}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
})()}
{/* Crystal Ball™ Card */}
{iq.crystalBall && iq.crystalBall.oneYear && (function(){
  var cb = iq.crystalBall;
  var oneYr = cb.oneYear;
  var profitColor = oneYr.profitProbability >= 70 ? C.mint :
                    oneYr.profitProbability >= 50 ? C.teal :
                    oneYr.profitProbability >= 30 ? C.amber : C.coral;
  return (
    <div className="card-enter" style={{
      background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
      border:"1px solid "+C.teal+"33",
      borderRadius:16,
      padding:"16px",
      marginBottom:14,
      boxShadow:"0 8px 24px "+C.teal+"22, inset 0 1px 0 "+C.layer3,
      position:"relative",
      overflow:"hidden",
    }}>
      <div style={{
        position:"absolute",
        top:0,left:0,right:0,
        height:3,
        background:"linear-gradient(90deg,"+C.teal+"00,"+C.teal+"ff,"+C.teal+"00)",
      }}/>
      
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:9,color:C.teal,fontWeight:800,letterSpacing:"2px",marginBottom:4}}>
          🔮 CRYSTAL BALL™
        </div>
        <div style={{fontSize:11,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
          تنبؤات Monte Carlo (1000 محاكاة)
        </div>
      </div>
      
      {/* Profit Probability */}
      <div style={{
        background:"linear-gradient(135deg,"+profitColor+"22,"+profitColor+"11)",
        border:"1px solid "+profitColor+"55",
        borderRadius:12,
        padding:"12px 14px",
        marginBottom:12,
        textAlign:"center",
        boxShadow:"0 4px 12px "+profitColor+"22",
      }}>
        <div style={{fontSize:9,color:profitColor,fontWeight:800,letterSpacing:"1.5px",marginBottom:5}}>
          ✨ احتمال الربح خلال سنة
        </div>
        <div style={{
          fontSize:36,
          fontWeight:900,
          color:profitColor,
          fontFamily:"IBM Plex Mono,monospace",
          lineHeight:1,
          textShadow:"0 0 16px "+profitColor+"66",
        }}>
          {oneYr.profitProbability}%
        </div>
      </div>
      
      {/* Time Horizons */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr 1fr",
        gap:6,
        marginBottom:12,
      }}>
        {[
          {label:"6 أشهر", data:cb.sixMonths},
          {label:"سنة", data:cb.oneYear, highlight:true},
          {label:"3 سنوات", data:cb.threeYears},
        ].filter(function(h){return h.data;}).map(function(h,i){
          var ret = h.data.medianReturn;
          var color = ret >= 0 ? C.mint : C.coral;
          return (
            <div key={i} style={{
              background:h.highlight?C.teal+"15":"rgba(255,255,255,.03)",
              border:"1px solid "+(h.highlight?C.teal+"33":C.line),
              borderRadius:10,
              padding:"8px 6px",
              textAlign:"center",
            }}>
              <div style={{fontSize:9,color:C.smoke,marginBottom:4,fontFamily:"Cairo,sans-serif"}}>
                {h.label}
              </div>
              <div style={{
                fontSize:14,
                fontWeight:900,
                color:color,
                fontFamily:"IBM Plex Mono,monospace",
                marginBottom:2,
              }}>
                {ret >= 0 ? '+' : ''}{ret.toFixed(1)}%
              </div>
              <div style={{fontSize:8,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
                الأكثر احتمالاً
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Scenarios Bar */}
      <div style={{
        background:"rgba(255,255,255,.03)",
        border:"1px solid "+C.line,
        borderRadius:10,
        padding:"10px 12px",
        marginBottom:10,
      }}>
        <div style={{fontSize:9,color:C.teal,fontWeight:800,letterSpacing:"1px",marginBottom:8}}>
          📊 السيناريوهات (سنة)
        </div>
        
        {/* Best */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10}}>🟢</span>
            <span style={{fontSize:10,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>أفضل سيناريو</span>
          </div>
          <span style={{
            fontSize:11,
            color:C.mint,
            fontWeight:800,
            fontFamily:"IBM Plex Mono,monospace",
          }}>
            +{oneYr.bestCaseReturn.toFixed(1)}%
          </span>
        </div>
        
        {/* Optimistic */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10}}>🟢</span>
            <span style={{fontSize:10,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>متفائل</span>
          </div>
          <span style={{
            fontSize:11,
            color:C.mint,
            fontWeight:800,
            fontFamily:"IBM Plex Mono,monospace",
          }}>
            +{oneYr.optimisticReturn.toFixed(1)}%
          </span>
        </div>
        
        {/* Median */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,padding:"4px 0",background:C.teal+"10",borderRadius:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6,paddingRight:6}}>
            <span style={{fontSize:10}}>🟡</span>
            <span style={{fontSize:10,color:C.teal,fontWeight:700,fontFamily:"Cairo,sans-serif"}}>الأكثر احتمالاً</span>
          </div>
          <span style={{
            fontSize:12,
            color:C.teal,
            fontWeight:900,
            fontFamily:"IBM Plex Mono,monospace",
            paddingLeft:6,
          }}>
            {oneYr.medianReturn >= 0 ? '+' : ''}{oneYr.medianReturn.toFixed(1)}%
          </span>
        </div>
        
        {/* Pessimistic */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10}}>🟠</span>
            <span style={{fontSize:10,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>متشائم</span>
          </div>
          <span style={{
            fontSize:11,
            color:C.amber,
            fontWeight:800,
            fontFamily:"IBM Plex Mono,monospace",
          }}>
            {oneYr.pessimisticReturn.toFixed(1)}%
          </span>
        </div>
        
        {/* Worst */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10}}>🔴</span>
            <span style={{fontSize:10,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>أسوأ سيناريو</span>
          </div>
          <span style={{
            fontSize:11,
            color:C.coral,
            fontWeight:800,
            fontFamily:"IBM Plex Mono,monospace",
          }}>
            {oneYr.worstCaseReturn.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Methodology */}
      <div style={{
        background:"rgba(167,139,250,.06)",
        border:"1px solid "+C.plasma+"33",
        borderRadius:10,
        padding:"8px 12px",
      }}>
        <div style={{fontSize:9,color:C.plasma,fontWeight:800,letterSpacing:"1px",marginBottom:3}}>
          📚 المنهجية
        </div>
        <div style={{
          fontSize:10,
          color:C.mist,
          fontStyle:"italic",
          lineHeight:1.5,
          fontFamily:"Cairo,sans-serif",
        }}>
          {cb.methodology || 'Geometric Brownian Motion + Bootstrap Sampling'}
        </div>
      </div>
    </div>
  );
})()}
{/* Smart Stop-Loss™ Card */}
{iq.smartStops && iq.smartStops.stops && iq.smartStops.stops.length > 0 && (function(){
  var ss = iq.smartStops;
  var validStops = ss.stops.filter(function(s){return s.suggestedStop !== null;});
  if (validStops.length === 0) return null;
  return (
    <div className="card-enter" style={{
      background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
      border:"1px solid "+C.coral+"33",
      borderRadius:16,
      padding:"16px",
      marginBottom:14,
      boxShadow:"0 8px 24px "+C.coral+"22, inset 0 1px 0 "+C.layer3,
      position:"relative",
      overflow:"hidden",
    }}>
      <div style={{
        position:"absolute",
        top:0,left:0,right:0,
        height:3,
        background:"linear-gradient(90deg,"+C.coral+"00,"+C.coral+"ff,"+C.coral+"00)",
      }}/>
      
      {/* Header */}
      <div style={{
        display:"flex",
        alignItems:"center",
        justifyContent:"space-between",
        marginBottom:12,
      }}>
        <div>
          <div style={{fontSize:9,color:C.coral,fontWeight:800,letterSpacing:"2px",marginBottom:3}}>
            🛡️ SMART STOP-LOSS™
          </div>
          <div style={{fontSize:10,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
            وقف خسارة ذكي لكل سهم
          </div>
        </div>
        {ss.totalRiskSAR > 0 && (
          <div style={{
            background:C.coral+"15",
            border:"1px solid "+C.coral+"33",
            borderRadius:8,
            padding:"6px 10px",
            textAlign:"left",
          }}>
            <div style={{fontSize:9,color:C.smoke,marginBottom:2}}>إجمالي الخطر</div>
            <div style={{
              fontSize:13,
              fontWeight:900,
              color:C.coral,
              fontFamily:"IBM Plex Mono,monospace",
            }}>
              {ss.totalRiskSAR.toLocaleString('en-US')} ر
            </div>
          </div>
        )}
      </div>
      
      {/* Stops List */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
        {validStops.slice(0, 5).map(function(stop,i){
          return (
            <div key={i} style={{
              background:"rgba(255,255,255,.03)",
              border:"1px solid "+C.line,
              borderRadius:10,
              padding:"10px 12px",
            }}>
              {/* Symbol + Current Price */}
              <div style={{
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center",
                marginBottom:6,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{
                    fontFamily:"IBM Plex Mono,monospace",
                    fontSize:12,
                    fontWeight:900,
                    color:C.snow,
                  }}>
                    {stop.sym}
                  </span>
                  <span style={{fontSize:9,color:C.smoke}}>الحالي:</span>
                  <span style={{
                    fontFamily:"IBM Plex Mono,monospace",
                    fontSize:11,
                    fontWeight:700,
                    color:C.mist,
                  }}>
                    {stop.currentPrice}
                  </span>
                </div>
                <div style={{
                  background:C.coral+"22",
                  border:"1px solid "+C.coral+"55",
                  borderRadius:6,
                  padding:"3px 8px",
                }}>
                  <span style={{
                    fontSize:11,
                    fontWeight:800,
                    color:C.coral,
                    fontFamily:"IBM Plex Mono,monospace",
                  }}>
                    -{stop.stopPercent}%
                  </span>
                </div>
              </div>
              
              {/* Stop Price + Risk */}
              <div style={{
                display:"flex",
                justifyContent:"space-between",
                alignItems:"center",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11}}>🛑</span>
                  <span style={{fontSize:9,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>وقف عند:</span>
                  <span style={{
                    fontFamily:"IBM Plex Mono,monospace",
                    fontSize:13,
                    fontWeight:900,
                    color:C.coral,
                  }}>
                    {stop.suggestedStop}
                  </span>
                </div>
                {stop.totalRisk > 0 && (
                  <div style={{
                    fontSize:10,
                    color:C.smoke,
                    fontFamily:"IBM Plex Mono,monospace",
                  }}>
                    خطر: {stop.totalRisk.toLocaleString('en-US')} ر
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Methodology */}
      <div style={{
        background:"rgba(167,139,250,.06)",
        border:"1px solid "+C.plasma+"33",
        borderRadius:10,
        padding:"8px 12px",
      }}>
        <div style={{fontSize:9,color:C.plasma,fontWeight:800,letterSpacing:"1px",marginBottom:3}}>
          📚 المنهجية
        </div>
        <div style={{
          fontSize:10,
          color:C.mist,
          lineHeight:1.5,
          fontFamily:"Cairo,sans-serif",
        }}>
          {ss.methodology || 'ATR (14) + Chandelier Exit + تعديل قطاعي'}
        </div>
      </div>
    </div>
  );
})()}

{/* Recovery Path™ Card */}
{iq.recoveryPath && iq.recoveryPath.status !== 'stable' && (function(){
  var rp = iq.recoveryPath;
  var ddSeverity = rp.currentDrawdown < 10 ? C.amber :
                   rp.currentDrawdown < 20 ? C.coral : '#dc2626';
  return (
    <div className="card-enter" style={{
      background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
      border:"1px solid "+ddSeverity+"33",
      borderRadius:16,
      padding:"16px",
      marginBottom:14,
      boxShadow:"0 8px 24px "+ddSeverity+"22, inset 0 1px 0 "+C.layer3,
      position:"relative",
      overflow:"hidden",
    }}>
      <div style={{
        position:"absolute",
        top:0,left:0,right:0,
        height:3,
        background:"linear-gradient(90deg,"+ddSeverity+"00,"+ddSeverity+"ff,"+ddSeverity+"00)",
      }}/>
      
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:9,color:ddSeverity,fontWeight:800,letterSpacing:"2px",marginBottom:4}}>
          🔄 RECOVERY PATH™
        </div>
        <div style={{fontSize:11,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
          خطة استعادة من التراجع
        </div>
      </div>
      
      {/* Current Drawdown */}
      <div style={{
        background:"linear-gradient(135deg,"+ddSeverity+"22,"+ddSeverity+"11)",
        border:"1px solid "+ddSeverity+"55",
        borderRadius:12,
        padding:"12px",
        marginBottom:10,
        textAlign:"center",
      }}>
        <div style={{fontSize:9,color:ddSeverity,fontWeight:800,letterSpacing:"1.5px",marginBottom:4}}>
          📉 التراجع الحالي
        </div>
        <div style={{
          fontSize:28,
          fontWeight:900,
          color:ddSeverity,
          fontFamily:"IBM Plex Mono,monospace",
          lineHeight:1,
        }}>
          -{rp.currentDrawdown}%
        </div>
      </div>
      
      {/* Recovery Needed */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:8,
        marginBottom:10,
      }}>
        <div style={{
          background:"rgba(255,255,255,.03)",
          border:"1px solid "+C.line,
          borderRadius:10,
          padding:"10px",
          textAlign:"center",
        }}>
          <div style={{fontSize:9,color:C.smoke,marginBottom:4,fontFamily:"Cairo,sans-serif"}}>
            ⬆️ ربح مطلوب
          </div>
          <div style={{
            fontSize:18,
            fontWeight:900,
            color:C.mint,
            fontFamily:"IBM Plex Mono,monospace",
          }}>
            +{rp.recoveryNeeded}%
          </div>
        </div>
        <div style={{
          background:"rgba(255,255,255,.03)",
          border:"1px solid "+C.line,
          borderRadius:10,
          padding:"10px",
          textAlign:"center",
        }}>
          <div style={{fontSize:9,color:C.smoke,marginBottom:4,fontFamily:"Cairo,sans-serif"}}>
            ⏱️ مدة متوقعة
          </div>
          <div style={{
            fontSize:18,
            fontWeight:900,
            color:C.teal,
            fontFamily:"IBM Plex Mono,monospace",
          }}>
            {rp.expectedRecoveryMonths} شهر
          </div>
        </div>
      </div>
      
      {/* Strategy */}
      {rp.actions && rp.actions.length > 0 && (
        <div style={{
          background:"rgba(30,230,138,.06)",
          border:"1px solid "+C.mint+"33",
          borderRadius:10,
          padding:"10px 12px",
        }}>
          <div style={{fontSize:9,color:C.mint,fontWeight:800,letterSpacing:"1px",marginBottom:6}}>
            💡 الخطة المقترحة
          </div>
          {rp.actions.map(function(action,i){
            return (
              <div key={i} style={{
                fontSize:11,
                color:C.mist,
                lineHeight:1.6,
                marginBottom:i<rp.actions.length-1?6:0,
                fontFamily:"Cairo,sans-serif",
                display:"flex",
                alignItems:"flex-start",
                gap:6,
              }}>
                <span style={{color:C.mint,fontWeight:700,marginTop:1}}>•</span>
                <span>{action.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
})()}

{/* Recovery - Stable Message */}
{iq.recoveryPath && iq.recoveryPath.status === 'stable' && (
  <div className="card-enter" style={{
    background:"linear-gradient(135deg,"+C.mint+"11,"+C.mint+"05)",
    border:"1px solid "+C.mint+"33",
    borderRadius:16,
    padding:"14px 16px",
    marginBottom:14,
    textAlign:"center",
  }}>
    <div style={{fontSize:24,marginBottom:6}}>✅</div>
    <div style={{fontSize:11,color:C.mint,fontWeight:800,letterSpacing:"1.5px",marginBottom:4}}>
      🔄 RECOVERY PATH™
    </div>
    <div style={{
      fontSize:13,
      color:C.snow,
      fontWeight:800,
      fontFamily:"Cairo,sans-serif",
    }}>
      محفظتك مستقرة
    </div>
    <div style={{
      fontSize:10,
      color:C.smoke,
      marginTop:4,
      fontFamily:"Cairo,sans-serif",
    }}>
      {iq.recoveryPath.message || 'لا حاجة لخطة استعادة'}
    </div>
  </div>
)}
{/* 8 Layers Detail Card */}
{iq.layers && (function(){
  var layers = iq.layers;
  
  // إعداد البيانات للعرض
  var layerData = [
    {
      icon: '🔍',
      name: 'التشخيص',
      score: layers.diagnostic && layers.diagnostic.healthScore,
      issues: layers.diagnostic && layers.diagnostic.issuesCount,
      strengths: layers.diagnostic && layers.diagnostic.strengthsCount,
      detail: layers.diagnostic && layers.diagnostic.issues && layers.diagnostic.issues.length > 0 
        ? layers.diagnostic.issues[0].message 
        : 'لا توجد مشاكل',
    },
    {
      icon: '⚠️',
      name: 'المخاطر',
      score: layers.risk && layers.risk.score,
      detail: layers.risk && layers.risk.riskLevel ? 'مستوى: ' + (layers.risk.riskLevel === 'low' ? 'منخفض' : layers.risk.riskLevel === 'moderate' ? 'متوسط' : layers.risk.riskLevel === 'high' ? 'عالٍ' : 'شديد') : '',
    },
    {
      icon: '🧠',
      name: 'السلوك',
      score: layers.behavioral && layers.behavioral.behavioralScore,
      issues: layers.behavioral && layers.behavioral.biasCount,
      detail: layers.behavioral && layers.behavioral.biases && layers.behavioral.biases.length > 0
        ? layers.behavioral.biases[0].message
        : 'لا توجد تحيزات',
    },
    {
      icon: '🎯',
      name: 'العوامل',
      score: layers.factor && layers.factor.factors && layers.factor.factors.size 
        ? layers.factor.factors.size.score 
        : null,
      detail: layers.factor && layers.factor.styleLabel ? 'النمط: ' + layers.factor.styleLabel : '',
    },
    {
      icon: '🌍',
      name: 'الاقتصاد',
      score: null,
      detail: layers.macro && layers.macro.exposures && layers.macro.exposures.oilPrice 
        ? 'تعرض النفط: ' + layers.macro.exposures.oilPrice + '%'
        : 'متوازن',
    },
    {
      icon: '🏭',
      name: 'القطاعات',
      score: layers.sector && layers.sector.diversificationScore,
      detail: layers.sector && layers.sector.largestSector
        ? 'الأكبر: ' + layers.sector.largestSector.name + ' (' + (layers.sector.largestSector.weight * 100).toFixed(0) + '%)'
        : '',
    },
    {
      icon: '📈',
      name: 'الأسهم',
      score: null,
      detail: layers.stock && layers.stock.flaggedStocks 
        ? layers.stock.flaggedStocks.length + ' سهم يحتاج اهتمام'
        : 'كل الأسهم سليمة',
    },
    {
      icon: '⚡',
      name: 'الإجراءات',
      score: null,
      issues: layers.action && layers.action.totalActions,
      detail: layers.action && layers.action.criticalCount > 0
        ? layers.action.criticalCount + ' إجراء عاجل'
        : 'لا إجراءات عاجلة',
    },
  ];
  
  return (
    <div className="card-enter" style={{
      background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
      border:"1px solid "+C.gold+"33",
      borderRadius:16,
      padding:"16px",
      marginBottom:14,
      boxShadow:"0 8px 24px "+C.gold+"22, inset 0 1px 0 "+C.layer3,
      position:"relative",
      overflow:"hidden",
    }}>
      <div style={{
        position:"absolute",
        top:0,left:0,right:0,
        height:3,
        background:"linear-gradient(90deg,"+C.gold+"00,"+C.gold+"ff,"+C.gold+"00)",
      }}/>
      
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:9,color:C.gold,fontWeight:800,letterSpacing:"2px",marginBottom:4}}>
          📊 8 LAYERS DETAIL
        </div>
        <div style={{fontSize:11,color:C.smoke,fontFamily:"Cairo,sans-serif"}}>
          تفاصيل التحليل الشامل
        </div>
      </div>
      
      {/* Layers Grid */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"1fr 1fr",
        gap:8,
      }}>
        {layerData.map(function(layer,i){
          var scoreColor = layer.score === null ? C.smoke :
                           layer.score >= 75 ? C.mint :
                           layer.score >= 60 ? C.teal :
                           layer.score >= 45 ? C.amber : C.coral;
          return (
            <div key={i} style={{
              background:"rgba(255,255,255,.03)",
              border:"1px solid "+C.line,
              borderRadius:10,
              padding:"10px 8px",
              position:"relative",
            }}>
              {/* Top: Icon + Name + Score */}
              <div style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"space-between",
                marginBottom:4,
              }}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{fontSize:14}}>{layer.icon}</span>
                  <span style={{
                    fontSize:11,
                    fontWeight:800,
                    color:C.snow,
                    fontFamily:"Cairo,sans-serif",
                  }}>
                    {layer.name}
                  </span>
                </div>
                {layer.score !== null && (
                  <span style={{
                    fontSize:13,
                    fontWeight:900,
                    color:scoreColor,
                    fontFamily:"IBM Plex Mono,monospace",
                  }}>
                    {layer.score}
                  </span>
                )}
              </div>
              
              {/* Progress Bar (if has score) */}
              {layer.score !== null && (
                <div style={{
                  height:3,
                  background:C.layer3,
                  borderRadius:2,
                  marginBottom:6,
                  overflow:"hidden",
                }}>
                  <div style={{
                    height:"100%",
                    width:layer.score+"%",
                    background:scoreColor,
                    borderRadius:2,
                    transition:"width 1.5s ease-out",
                  }}/>
                </div>
              )}
              
              {/* Detail */}
              {layer.detail && (
                <div style={{
                  fontSize:9,
                  color:C.smoke,
                  lineHeight:1.4,
                  fontFamily:"Cairo,sans-serif",
                  marginTop: layer.score === null ? 4 : 0,
                }}>
                  {layer.detail}
                </div>
              )}
              
              {/* Issues count */}
              {layer.issues > 0 && (
                <div style={{
                  position:"absolute",
                  top:4,
                  left:4,
                  background:C.coral+"22",
                  color:C.coral,
                  fontSize:8,
                  fontWeight:800,
                  padding:"1px 5px",
                  borderRadius:4,
                  fontFamily:"IBM Plex Mono,monospace",
                }}>
                  {layer.issues}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div style={{
        marginTop:12,
        padding:"8px 12px",
        background:"rgba(167,139,250,.06)",
        border:"1px solid "+C.plasma+"33",
        borderRadius:10,
        textAlign:"center",
      }}>
        <div style={{
          fontSize:10,
          color:C.plasma,
          fontWeight:700,
          fontFamily:"Cairo,sans-serif",
        }}>
          🧠 محلّل بـ 8 طبقات ذكاء متقدمة
        </div>
      </div>
    </div>
  );
})()}


{/* Coming Soon Card */}
<div style={{
  background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",
  border:"1px solid "+C.line,
  borderRadius:12,
  padding:"14px 16px",
  textAlign:"center",
}}>
  <div style={{fontSize:10,color:C.plasma,fontWeight:800,marginBottom:8,letterSpacing:"1px"}}> 
    ✨ المزيد قادم قريباً
  </div>
</div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {sellSheet&&<SellSheet sellSheet={sellSheet} setSellSheet={setSellSheet} setTradeLog={setTradeLog} setPort={setPort} setPerfHistory={setPerfHistory} sl={sl}/>}
      {editPos&&<EditModal pos={editPos} onClose={function(){setEditPos(null);}} setPort={setPort} setTradeLog={setTradeLog}/>}

      {showOB&&(
        <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(6,8,15,.94)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,animation:"fadeIn .3s ease both"}}>
          <div style={{width:"100%",maxWidth:360,textAlign:"center"}}>
            {[
              {icon:"portfolio",title:"محفظتك الذكية",desc:"تتبع اسهمك وراقب قراراتك الورقية قبل التنفيذ الحقيقي في البنك",color:C.electric},
              {icon:"hold",title:"قرارات من المحرك",desc:"كل سهم يحصل على قرار واحد واضح مع سبب ديناميكي من 9 طبقات تحليل",color:C.mint},
              {icon:"log",title:"سجّل صفقاتك الورقية",desc:"جرّب القرارات على ورق اولاً - تابع الربح والخسارة دون مخاطرة حقيقية",color:C.gold},
            ].map(function(s,idx){return obStep===idx?(
              <div key={idx} className="card-enter">
                <div style={{width:72,height:72,borderRadius:20,margin:"0 auto 20px",background:"linear-gradient(135deg,"+s.color+"22,"+s.color+"0a)",border:"1px solid "+s.color+"44",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 32px "+s.color+"22"}}>
                  <SvgIcon name={s.icon} size={32} color={s.color}/>
                </div>
                <div style={{fontSize:11,color:s.color,fontWeight:700,letterSpacing:"2px",marginBottom:8}}>0{idx+1} / 03</div>
                <div style={{fontSize:20,fontWeight:900,color:C.snow,marginBottom:12,lineHeight:1.2}}>{s.title}</div>
                <div style={{fontSize:13,color:C.smoke,lineHeight:1.8,marginBottom:32}}>{s.desc}</div>
              </div>
            ):null;}) }
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:24}}>
              {[0,1,2].map(function(i){return <div key={i} style={{width:i===obStep?20:6,height:6,borderRadius:3,background:i===obStep?C.electric:C.line,transition:"all .3s"}}/>;}) }
            </div>
            <button onClick={function(){if(obStep<2)setObStep(obStep+1);else setShowOB(false);}} style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,"+C.electric+"33,"+C.electric+"18)",border:"1px solid "+C.electric+"44",borderRadius:16,cursor:"pointer",fontSize:15,fontWeight:900,color:C.electric,fontFamily:"Cairo,sans-serif",boxShadow:"0 4px 20px "+C.electric+"22",marginBottom:12}}>
              {obStep<2?"التالي":"ابدأ الآن"}
            </button>
            <button onClick={function(){setShowOB(false);}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:C.ash,fontFamily:"Cairo,sans-serif"}}>
              تخطي
            </button>
          </div>
        </div>
      )}

      {sheet&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(6,8,15,.88)",backdropFilter:"blur(14px)",display:"flex",alignItems:"flex-end",justifyContent:"center",animation:"fadeIn .25s ease both"}} onClick={function(){setSheet(false);}}>
          <div onClick={function(e){e.stopPropagation();}} style={{width:"100%",maxWidth:430,background:"linear-gradient(180deg,"+C.layer2+" 0%,"+C.deep+" 100%)",borderRadius:"24px 24px 0 0",border:"1px solid "+C.line,borderBottom:"none",maxHeight:"82vh",height:"82vh",display:"flex",flexDirection:"column",boxShadow:"0 -24px 64px rgba(0,0,0,.8), inset 0 1px 0 "+C.layer3,animation:"slideUp .38s cubic-bezier(.16,1,.3,1) both"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 0"}}>
              <button onClick={function(){setSheet(false);}} style={{width:44,height:44,borderRadius:12,border:"1px solid "+C.line,background:C.layer3,color:C.mist,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><SvgIcon name="stop" size={16} color={C.smoke}/></button>
              <div style={{width:40,height:4,borderRadius:2,background:C.ash}}/>
              <div style={{width:44,height:44}}/>
            </div>
            <div style={{padding:"12px 20px 14px",borderBottom:"1px solid "+C.line,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:3,height:16,background:C.electric,borderRadius:2}}/>
                <span style={{fontSize:12,fontWeight:700,color:C.mist,letterSpacing:".5px"}}>اضافة مركز جديد</span>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {[{n:"١",l:"السهم"},{n:"٢",l:"الكمية"},{n:"٣",l:"تأكيد"}].map(function(st,idx){
                    var active=idx===0?true:idx===1?!!(addSym):idx===2?canAdd:false;
                    return(
                      <div key={idx} style={{display:"flex",alignItems:"center",gap:3}}>
                        <div style={{width:16,height:16,borderRadius:"50%",background:active?"linear-gradient(135deg,"+C.electric+","+C.electric+"88)":"rgba(255,255,255,.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:active?C.snow:C.ash}}>{st.n}</div>
                        {idx<2&&<div style={{width:8,height:1,background:active?C.electric+"44":C.line}}/>}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{background:C.electric+"18",border:"1px solid "+C.electric+"33",borderRadius:8,padding:"2px 8px"}}>
                <span style={{fontSize:11,fontWeight:700,color:C.electric}}>راس المال: {(capital/1000).toFixed(0)}K ر</span>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:"14px 20px 100px",flex:1}}>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,color:C.smoke,fontWeight:700,letterSpacing:.5,marginBottom:8}}>اختر السهم</div>
                <div style={{display:"flex",alignItems:"center",gap:6,background:C.layer3,border:"1px solid "+C.line,borderRadius:10,padding:"8px 10px",marginBottom:8}}>
                  <SvgIcon name="watch" size={12} color={C.smoke}/>
                  <input value={stockSrch} onChange={function(e){setStockSrch(e.target.value);}} placeholder="ابحث بالرمز او الاسم..." style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:12,color:C.snow,fontFamily:"Cairo,sans-serif",textAlign:"right"}}/>
                  {stockSrch&&<button onClick={function(){setStockSrch("");}} style={{background:"transparent",border:"none",cursor:"pointer",color:C.smoke,fontSize:14,fontFamily:"inherit"}}>x</button>}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:180,overflowY:"auto"}}>
                  {sl.filter(function(s){return !stockSrch||(s.sym.includes(stockSrch)||s.name.includes(stockSrch));}).map(function(s){
                    var h=allData.find(function(d){return d.stk&&d.stk.sym===s.sym;}); h=h?h.health:null;
                    var sc=h&&h.sig==="شراء قوي"?C.mint:h&&h.sig==="تخفيف"?C.coral:h&&h.sig==="مراقبة"?C.amber:C.smoke;
                    var isA=addSym===s.sym;
                    var isHalal=s.sec!=="بنوك";
                    return(
                      <button key={s.sym} onClick={function(){setAddSym(s.sym);setAddCost(s.p.toFixed(2));}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,cursor:"pointer",background:isA?"linear-gradient(135deg,"+C.electric+"22,"+C.electric+"0a)":"rgba(255,255,255,.02)",border:"1px solid "+(isA?C.electric+"55":C.line),fontFamily:"Cairo,sans-serif",minHeight:44,transition:"all .15s"}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:sc,boxShadow:"0 0 5px "+sc,flexShrink:0}}/>
                        <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:12,fontWeight:800,color:isA?C.snow:C.mist,minWidth:36}}>{s.sym}</span>
                        <span style={{flex:1,fontSize:12,fontWeight:600,color:isA?C.snow:C.smoke,textAlign:"right"}}>{s.name}</span>
                        <span style={{fontSize:11,fontWeight:700,color:sc,background:sc+"15",borderRadius:5,padding:"1px 7px"}}>{h?h.sig||"-":"-"}</span>
                        {isHalal&&<span style={{fontSize:11,color:C.teal,background:C.teal+"15",borderRadius:5,padding:"1px 5px"}}>حلال</span>}
                        <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:12,fontWeight:800,color:isA?C.snow:C.mist}}>{s.p.toFixed(2)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {found&&(
                <div className="fade-in" style={{marginBottom:14,padding:"12px 14px",background:"linear-gradient(135deg,"+C.layer1+","+C.layer2+")",borderRadius:14,border:"1px solid "+C.line,boxShadow:"inset 0 1px 0 "+C.layer3}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:14,fontWeight:900,color:C.snow,textShadow:"0 0 8px rgba(240,246,255,.4)"}}>{found.name}</span>
                    <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:15,fontWeight:900,color:C.snow,textShadow:"0 0 8px rgba(240,246,255,.4)"}}>{found.p.toFixed(2)} ر</span>
                  </div>
                  {foundHealth&&(
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,fontWeight:700,color:foundHealthColor,background:foundHealthColor+"18",border:"1px solid "+foundHealthColor+"33",borderRadius:5,padding:"1px 7px"}}>{foundHealth.sig}</span>
                      <span style={{fontSize:11,color:C.electric,background:C.electric+"14",border:"1px solid "+C.electric+"22",borderRadius:5,padding:"1px 7px"}}>الحجم المقترح: {foundHealthPct}%</span>
                      <span style={{fontSize:11,color:C.smoke,background:C.layer3,border:"1px solid "+C.line,borderRadius:5,padding:"1px 7px"}}>{foundHealth.grade} . {foundHealth.score}/100</span>
                    </div>
                  )}
                </div>
              )}
              <div style={{display:"flex",gap:10,marginBottom:12}}>
                {[{l:"الكمية",v:addQty,set:setAddQty,ph:"100"},{l:"سعر الشراء",v:addCost,set:setAddCost,ph:"0.00"}].map(function(f,i){return(
                  <div key={i} style={{flex:1}}>
                    <div style={{fontSize:11,color:C.smoke,fontWeight:700,marginBottom:5}}>{f.l}</div>
                    <input type="number" value={f.v} onChange={function(e){f.set(e.target.value);}} placeholder={f.ph} style={{width:"100%",boxSizing:"border-box",background:C.layer3,border:"1px solid "+C.line,borderRadius:11,padding:"11px",fontSize:16,color:C.snow,fontFamily:"IBM Plex Mono,monospace",outline:"none",textAlign:"center"}} onKeyDown={function(e){if(e.key==="Enter"){haptic.tap();e.target.blur();}}} />
                  </div>
                );}) }
              </div>
              {canAdd&&addCostPreview&&(
                <div className="fade-in" style={{marginBottom:12}}>
                  <div style={{padding:"10px 14px",background:addCostPreview.isOver?C.amber+"0a":C.mint+"0a",border:"1px solid "+(addCostPreview.isOver?C.amber:C.mint)+"22",borderRadius:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,color:C.smoke}}>اجمالي التكلفة</span>
                      <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:13,fontWeight:900,color:addCostPreview.isOver?C.amber:C.mint}}>{addCostPreview.cost.toLocaleString("en-US",{maximumFractionDigits:0})} ر</span>
                    </div>
                    {addCostPreview.idealPct>0&&(
                      <div style={{marginTop:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:11,color:C.smoke}}>الوزن في المحفظة</span>
                        <span style={{fontFamily:"IBM Plex Mono,monospace",fontSize:11,fontWeight:800,color:addCostPreview.isOver?C.amber:C.mint}}>{addCostPreview.weight.toFixed(1)}% {addCostPreview.isOver?"(يتجاوز المثالي "+addCostPreview.idealPct+"%)":"(مثالي: "+addCostPreview.idealPct+"%)"}</span>
                      </div>
                    )}
                  </div>
                  {addCostPreview.isOver&&(
                    <div style={{marginTop:6,padding:"7px 12px",background:C.amber+"08",border:"1px solid "+C.amber+"22",borderRadius:9,display:"flex",alignItems:"center",gap:6}}>
                      <SvgIcon name="danger" size={11} color={C.amber}/>
                      <span style={{fontSize:11,color:C.amber}}>الوزن اعلى من الحجم المثالي - المحرك يقترح {addCostPreview.idealPct}%</span>
                    </div>
                  )}
                </div>
              )}
              <button onClick={doAdd} style={{width:"100%",padding:"14px",background:canAdd?"linear-gradient(135deg,"+C.mint+"33,"+C.mint+"18)":"rgba(255,255,255,.04)",border:"1px solid "+(canAdd?C.mint+"55":C.line),borderRadius:14,cursor:canAdd?"pointer":"default",fontSize:14,fontWeight:900,color:canAdd?C.mint:C.smoke,fontFamily:"Cairo,sans-serif",boxShadow:canAdd?"0 4px 20px "+C.mint+"22":"none",transition:"all .2s"}}>
                {canAdd?"اضافة المركز":"اختر سهماً وادخل البيانات"}
              </button>
              <div style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+C.line}}>
                <div style={{fontSize:11,color:C.smoke,fontWeight:700,marginBottom:5}}>راس مالك (لحساب المبالغ)</div>
                <input type="number" value={capital} onChange={function(e){setCapital(parseFloat(e.target.value)||100000);}} style={{width:"100%",boxSizing:"border-box",background:C.layer3,border:"1px solid "+C.line,borderRadius:11,padding:"10px",fontSize:15,color:C.snow,fontFamily:"IBM Plex Mono,monospace",outline:"none",textAlign:"center"}} onKeyDown={function(e){if(e.key==="Enter"){haptic.tap();e.target.blur();}}} />
              </div>
                        </div>
          </div>
        </div>
      )}
  </>
)}
    </div>
  );
}



