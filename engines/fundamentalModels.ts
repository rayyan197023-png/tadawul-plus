/**
 * @module engines/fundamentalModels
 * @description نماذج التحليل الأساسي (Factor Model, Earnings Model, DCF, Earnings Quality)
 * (منقولة من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 */

import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import { RADAR_SECTOR_PE } from './marketConstants';
import type { Bar, Stock } from './types';

/* ══ Factor Model ══ */
function calcFactorModel(stk: Stock, bars: Bar[]): any {
  // ✨ Validation
  if (!stk) return {composite: 50, factors: {}, alpha: 0, beta: 1, grade: "D", signal: "بيانات غير كافية"};
  bars = Array.isArray(bars) ? bars : [];


  var sectorStocksForPE=STOCKS.filter(function(x: any){return x.sec===stk.sec&&x.pe>0&&x.pe<60;});
var benchPE=sectorStocksForPE.length>=2?  sectorStocksForPE.reduce(function(s: number, x: any){return s+x.pe;},0)/sectorStocksForPE.length:((RADAR_SECTOR_PE as any)[stk.sec]||18);
  var valueScore=stk.pe>0?Math.round(Math.min(95,Math.max(5,50-45*Math.tanh((stk.pe/benchPE-1)*1.5)))):50;
  var ret1M_comp=bars.slice(-20).reduce(function(prod: number, b: any){return prod*(1+b.pct/100);},1)-1;
var ret3M_comp=bars.slice(-60).reduce(function(prod: number, b: any){return prod*(1+b.pct/100);},1)-1;
  var momScore=Math.round(Math.min(100,Math.max(0,50+ret1M_comp*100*1.5+ret3M_comp*100*0.4)));
  var pbPenalty = 0;
  if(stk.bookValue && stk.bookValue > 0){
    var pb = stk.p / stk.bookValue;
    pbPenalty = Math.round(Math.tanh((pb-2.5)/2)*(-8));
  }
  var qualScore=Math.round(Math.min(100,Math.max(0,(stk.roe||10)*1.8+(1-(stk.debt||0.3))*28+Math.min(15,(stk.epsGrw||3)*1.5)+pbPenalty)));
  var sizeScore=Math.round(Math.min(85,Math.max(35,80-40*Math.tanh((stk.mktCap||50-100)/150))));
  var divScore=Math.round(Math.min(90,Math.max(0,(stk.divY||0)*14)));
  var growScore=Math.round(Math.min(100,Math.max(0,50+(stk.revGrw||3)*2.5)));
  var composite=Math.round(valueScore*0.20+momScore*0.25+qualScore*0.25+sizeScore*0.10+divScore*0.10+growScore*0.10);
  var mktAvgCh=STOCKS.reduce(function(s: number, x: any){return s+x.ch;},0)/STOCKS.length;
  var alpha=+(stk.ch-mktAvgCh).toFixed(2);
  return{composite,factors:{value:Math.round(valueScore),momentum:Math.round(momScore),quality:Math.round(qualScore),size:Math.round(sizeScore),dividend:Math.round(divScore),growth:Math.round(growScore)},
    alpha,beta:+(stk.sector_beta||1).toFixed(2),
    grade:composite>=80?"S":composite>=70?"A":composite>=60?"B":composite>=50?"C":"D",
    signal:composite>=70&&alpha>0?"إشارة قوية":composite>=60?"إشارة معتدلة":"ضعيف"};
}

/* ══ Earnings Model (2-Stage DDM) ══ */
function calcEarningsModel(stk: any, gdpGrowth: number = 4.0): any {
  if (!stk) return {eps: 0, ddmValue: 0, peValue: 0, targetPrice: 0, upside: 0, signal: "بيانات غير كافية"};
  
  var eps=stk.eps||stk.p/(stk.pe||15);

  var g1=Math.min((stk.epsGrw||3)/100,0.15);
var g2=Math.min(g1*0.4,gdpGrowth/100||0.03);
  var ke=0.08+(stk.sector_beta||1)*0.055;
  var dps=stk.divY>0?(stk.divY/100)*stk.p:0;
  var payoutNow=eps>0&&dps>0?Math.min(0.90,dps/eps):0.30;
  var payoutStable=Math.min(0.85,payoutNow+(1-payoutNow)*0.5);
  var ddm2Stage=0;
  if(g1<ke&&eps>0){
    for(var yr=1;yr<=5;yr++){ddm2Stage+=eps*Math.pow(1+g1,yr)*payoutNow/Math.pow(1+ke,yr);}
    var eps5=eps*Math.pow(1+g1,5);
    var div6=eps5*(1+g2)*payoutStable;
    var tv=g2<ke?div6/(ke-g2):eps5*15;
    ddm2Stage+=tv/Math.pow(1+ke,5);
  } else {ddm2Stage=stk.p;}
  var epsFwd=eps*(1+g1);
  var peFwd=stk.pe>0?stk.pe/(1+g1):15;
  var peVal=+(epsFwd*peFwd).toFixed(2);
  var peg=stk.pe>0&&stk.epsGrw>0?+(stk.pe/stk.epsGrw).toFixed(2):null;
  var targetAvg;
  if(stk.target && stk.target>0){
    targetAvg=+((peVal*0.40 + ddm2Stage*0.35 + stk.target*0.25)).toFixed(2);
  } else {
    targetAvg=+((peVal+ddm2Stage)/2).toFixed(2);
  }
  var upside=+((targetAvg/stk.p-1)*100).toFixed(1);
  return{eps:eps.toFixed(2),ddmValue:+ddm2Stage.toFixed(2),peValue:peVal,targetPrice:targetAvg,upside,
    payout:+(payoutNow*100).toFixed(1),peg,
    pegSignal:peg?(peg<1?"رخيص جداً":peg<1.5?"رخيص":peg<2?"عادل":"غالٍ"):"غير محدد",
    ke:+(ke*100).toFixed(1),g2:+(g2*100).toFixed(1),
    signal:upside>15?"مقيّم بأقل من قيمته":upside>5?"عادل":"مقيّم بأعلى من قيمته"};
}

/* ══ DCF ══ */
function calcDCF(stk: any, gdpGrowth: number = 4.0): any {

  if (!stk) return {intrinsic: 0, upside: 0, wacc: 8, dcfScore: 50, signal: "بيانات غير كافية", rating: "احتفاظ"};
  
  var eps=stk.eps||stk.p/(stk.pe||15);

  var ke=0.08+(stk.sector_beta||1)*0.055;
  var roe=(stk.roe||12)/100;
  var bvps = stk.bookValue || (roe>ke ? eps/roe : stk.p/(stk.pe||15)*(1-ke/roe*0.5));
  bvps=Math.max(bvps,eps);
  var g1=Math.min((stk.epsGrw||5)/100,0.12);
var gdpGrowthRate=(gdpGrowth||4.0)/100;
  var sectorGrowthAdj=({"الطاقة":0.01,"البنوك":0.005,"التطبيقات وخدمات التقنية":0.02,"المواد الأساسية":0.005,"إنتاج الأغذية":0.005} as any)[stk.sec]||0;
  var gStable=Math.min(g1,gdpGrowthRate+sectorGrowthAdj);
  var graham=eps>0&&bvps>0?Math.sqrt(22.5*eps*bvps):stk.p;
  var dcfVal=gStable<ke&&eps>0?eps*(1+g1)/(ke-gStable):stk.p;
  var sectorBase = 5;
  var lynchPE=Math.min(30,Math.max(10,(stk.epsGrw||5)+(stk.divY||0)+sectorBase));
  var lynch=eps*lynchPE;
  var peRel=Math.max(0.12,0.45-0.30*Math.tanh(((stk.pe||15)-20)/25));
  var grahamW=Math.max(0.10,0.35-0.20*Math.tanh(((stk.pe||15)-25)/20));
  var residual=1.0-grahamW-peRel;
  var lynchW=Math.max(0.05,residual);
  var totalW=grahamW+peRel+lynchW;
  grahamW/=totalW;peRel/=totalW;lynchW/=totalW;
  var intrinsic=+(graham*grahamW+dcfVal*peRel+lynch*lynchW).toFixed(2);
  var netDebtAdj = Math.max(0.85, 1.0 - (stk.debt||0)*0.30);
  intrinsic = +(intrinsic * netDebtAdj).toFixed(2);
  var upside=+((intrinsic/stk.p-1)*100).toFixed(1);
  var dcfScore=Math.round(Math.max(10,100/(1+Math.exp(-0.06*(upside-5)))));
  return{intrinsic,upside,wacc:+(ke*100).toFixed(1),
    grahamValue:+graham.toFixed(2),dcfValue:+dcfVal.toFixed(2),lynchValue:+lynch.toFixed(2),
    lynchPE:+lynchPE.toFixed(1),dcfScore,
    signal:upside>20?"مقيّم بأقل من قيمته بشكل واضح":upside>10?"مقيّم بأقل من قيمته":upside>-10?"تقييم عادل":"مقيّم بأعلى من قيمته",
    rating:upside>20?"شراء قوي":upside>10?"شراء":upside>-10?"احتفاظ":"تخفيف"};
}

/* ══ Earnings Quality -- Accruals Ratio من البيانات الفعلية ══ */
function calcEarningsQuality(stk: any): any {
  var eps=stk.eps||stk.p/(stk.pe||15);
  var roe=stk.roe||10, debt=stk.debt||0.3;
  var epsGrw=stk.epsGrw||0, revGrw=stk.revGrw||0;
  var pe=stk.pe||15, divY=stk.divY||0;

  var accruals;
  if(stk.freeCashFlow && stk.freeCashFlow > 0){
    var fcfPerShare = stk.freeCashFlow;
    accruals = Math.max(0, (eps - fcfPerShare) / Math.max(eps, fcfPerShare, 0.01));
  } else {
    var cashROE = Math.min(roe, roe*(1-debt*0.5));
    accruals = Math.max(0,(roe-cashROE)/100);
  }
  var accrualScore = Math.round(Math.max(0, 100 - accruals*300));

  var consistency;
  if(stk.eps_q1 && stk.eps_q2 && stk.eps_q3){
    var qVals = [stk.eps_q1, stk.eps_q2, stk.eps_q3];
    var qMean = qVals.reduce(function(s: number, v: number){return s+v;},0)/3;
var qStd  = Math.sqrt(qVals.reduce(function(s: number, v: number){return s+Math.pow(v-qMean,2);},0)/3);
    var qCv   = qMean>0 ? qStd/qMean : 1;
    consistency = Math.round(Math.max(20, Math.min(95, 90 - qCv*120)));
  } else if(epsGrw>0&&revGrw>0){
    var gap=Math.abs(epsGrw-revGrw);
    consistency=Math.round(Math.max(25,90-gap*3));
  } else if(epsGrw>0&&revGrw<=0){consistency=25;}
  else if(epsGrw<=0&&revGrw>0){consistency=40;}
  else{consistency=20;}

  var debtScore=Math.round(Math.min(90,Math.max(20,90-65*Math.tanh((debt-0.15)/0.25))));
  var divScore=divY>4?85:divY>2?72:divY>0?60:epsGrw>15?58:epsGrw>5?45:30;
  var peScore=Math.round(Math.min(85,Math.max(10,85-65*Math.tanh((pe-18)/22))));
  var composite=Math.round(accrualScore*0.35+consistency*0.25+debtScore*0.20+divScore*0.10+peScore*0.10);
  return{composite,grade:composite>=80?"A":composite>=65?"B":composite>=50?"C":composite>=35?"D":"F",
    signal:composite>=75?"أرباح عالية الجودة":composite>=60?"أرباح جيدة":composite>=45?"أرباح متوسطة":"أرباح منخفضة الجودة",
    components:{accruals:accrualScore,consistency,debt:debtScore,dividend:divScore,pe:peScore}};
}

export { calcFactorModel, calcEarningsModel, calcDCF, calcEarningsQuality };
