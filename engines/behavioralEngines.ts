/**
 * @module engines/behavioralEngines
 * @description محركات التحليل السلوكي (Behavioral Pressure, Insider Transactions, Alternative Data)
 * (منقولة من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 */

import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import type { Bar, MacroData, Stock } from './types';

/* ══ Behavioral Pressure -- مؤشر ضغط السوق السلوكي ══
   ملاحظة صدق: السوق السعودي (تاسي) لا يملك سوق خيارات فردية،
   فهذا ليس "تدفّق خيارات" بل مقياس ضغط شراء/بيع سلوكي مُستنتَج
   من الزخم والحجم والأساسيات. الحقلان pressureRatio/unusualActivity
   يُستخدمان في حساب LC (المحرك السلوكي) داخل stockHealth. */
function calcBehavioralPressure(stk: Stock, bars: Bar[]): any {

  var n=bars.length;
  if(!n)return{pressureRatio:1.0,sentiment:"محايد",signal:"محايد",unusualActivity:false,score:50};
    
  var momentum5  = bars.slice(-5).reduce(function(s: number, b: any){return s+b.pct;},0)/5;
var momentum20 = bars.slice(-20).reduce(function(s: number, b: any){return s+b.pct;},0)/20;
var avgVol20 = bars.slice(-20).reduce(function(s: number, b: any){return s+b.vol;},0)/20||1;
var recentVol= bars.slice(-5).reduce(function(s: number, b: any){return s+b.vol;},0)/5;
var volRatio = recentVol/avgVol20;
var vol30pct = bars.slice(-30).reduce(function(s: number, b: any){return s+Math.abs(b.pct);},0)/30;
  var iv = +(vol30pct*14+8).toFixed(1);

  var pressureBase = 1.0;

  if(momentum5 > 3)       pressureBase -= 0.15;
  else if(momentum5 > 1)  pressureBase -= 0.08;
  else if(momentum5 < -3) pressureBase += 0.20;
  else if(momentum5 < -1) pressureBase += 0.10;

  if(volRatio > 2.5 && stk.ch > 0) pressureBase -= 0.15;
  else if(volRatio > 1.5 && stk.ch > 0) pressureBase -= 0.08;
  else if(volRatio > 2.0 && stk.ch < -3) pressureBase += 0.20;

  if(stk.roe > 20) pressureBase -= 0.08;
  else if(stk.roe < 5) pressureBase += 0.12;

  if(stk.sec === "المواد الأساسية" && stk.ch < 0) pressureBase += 0.10;

  var pressureRatio = +Math.min(2.0,Math.max(0.3,pressureBase)).toFixed(2);
  var unusualActivity = volRatio > 1.8 && Math.abs(stk.ch) > 2.0;
  var sentiment = pressureRatio<0.6?"صعودي قوي":pressureRatio<0.8?"صعودي":pressureRatio<1.1?"محايد":pressureRatio<1.4?"هبوطي":"هبوطي قوي";
  var pressureScore = Math.round(Math.min(100,Math.max(0,80-(pressureRatio-0.7)*60+(unusualActivity&&stk.ch>0?10:0))));

  return{pressureRatio,realizedVol:iv,
    unusualActivity,sentiment,score:pressureScore,
    signal:unusualActivity&&pressureRatio<0.8?"نشاط استثنائي صعودي":unusualActivity&&pressureRatio>1.3?"نشاط استثنائي هبوطي":sentiment};
}

/* ══ Insider Transactions ══
   ⚠️ ملاحظة صدق: لا بيانات تعاملات مطلعين حقيقية (غير متاحة عبر sahmk).
   هذا مؤشر تراكم/تصريف مُستنتَج من الحجم والسعر والأساسيات فقط.
   المخرجات (netBuy/signal) داخلية للدرجة ولا تُعرض للمستخدم. */
function calcInsiderTransactions(stk: Stock, bars: Bar[]): any {

  var n=bars?bars.length:0;
  var avgVol60=n>0?bars.reduce(function(s: number, b: any){return s+b.vol;},0)/n:stk.avgV||1800000;
var recentVol=n>=5?bars.slice(-5).reduce(function(s: number, b: any){return s+b.vol;},0)/5:avgVol60;
  var volRatio=recentVol/avgVol60;
  var priceMove=n>=10?(bars[n-1].c-bars[n-10].c)/bars[n-10].c*100:stk.ch;
  var valueDip=stk.pe>0&&stk.pe<15?1:0;
  var quietAccum=volRatio<0.9&&priceMove<0;
  var fundStrong=stk.roe>15&&stk.debt<0.35;
    var nearLow=n>=60?bars[n-1].c<=Math.min(...bars.slice(-60).map((b: any)=>b.lo))*1.05:false;
  var highValuation=stk.pe>25;
  var highPrice=n>=60?bars[n-1].c>=Math.max(...bars.slice(-60).map((b: any)=>b.hi))*0.95:false;
  var peaking=volRatio>1.4&&priceMove>5;
  var buySignals=(valueDip?15:0)+(quietAccum?20:0)+(fundStrong?10:0)+(nearLow?25:0);
  var sellSignals=(highValuation?15:0)+(highPrice?20:0)+(peaking?15:0);
  if(stk.epsGrw>10)buySignals+=15; else if(stk.epsGrw<0)sellSignals+=15;
  var netScore=Math.min(95,Math.max(5,50+buySignals-sellSignals));
  var isBuyDom=netScore>=50;
  var netBuy=(netScore-50)*stk.mktCap*1e6*0.0001;
  var signal=netScore>=75?"تراكم داخلي قوي":netScore>=60?"شراء داخلي معتدل":netScore<=25?"تصريف داخلي":netScore<=40?"بيع داخلي معتدل":"محايد";
  var transactions: any[] = [];
  return{transactions,netBuy,buyValue:isBuyDom?Math.abs(netBuy):0,sellValue:isBuyDom?0:Math.abs(netBuy),
    signal,sentColor:isBuyDom?"#10c97e":"#f04f5a",score:netScore};
}

/* ══ Alternative Data ══
   ⚠️ ملاحظة صدق: لا بيانات بديلة حقيقية (Google Trends / تواصل اجتماعي / سلاسل توريد).
   كل المخرجات مشتقة من أسعار القطاع والأساسيات والحجم:
   sentimentScore = زخم القطاع · searchTrend = أداء نسبي · supplyChain = استقرار الحجم. */
function calcAlternativeData(stk: Stock, bars: Bar[], macroData: Pick<MacroData, 'oilPrice' | 'saudiRepoRate' | 'cpi'> = { oilPrice: 80, saudiRepoRate: 4, cpi: 2 }): any {

  var sectorStocks=STOCKS.filter(function(x: any){return x.sec===stk.sec;});
var sectorAvgCh=sectorStocks.reduce(function(s: number, x: any){return s+x.ch;},0)/sectorStocks.length;
  var sectorMom=Math.round(50+35*Math.tanh(sectorAvgCh*0.8));
  var commodityScore=50;
  if(stk.sec==="الطاقة"||stk.sec==="المواد الأساسية"){commodityScore=Math.round(50+30*Math.tanh((macroData.oilPrice-80)/20));}
  else if(stk.sec==="البنوك"){commodityScore=macroData.saudiRepoRate>4?72:55;}
  else if(stk.sec==="إنتاج الأغذية"){commodityScore=macroData.cpi<2?70:macroData.cpi<4?55:38;}
  var relPerf=stk.ch-sectorAvgCh;
  var competitorScore=Math.round(50+35*Math.tanh(relPerf*0.6));
  var n=bars?bars.length:0;
  var volStab=50;
  if(n>=20){
    var vols=bars.slice(-20).map(function(b: any){return b.vol;});
var avgV=vols.reduce(function(s: number, v: number){return s+v;},0)/20;
var varV=vols.reduce(function(s: number, v: number){return s+Math.pow(v-avgV,2);},0)/20;
    var cvV=avgV>0?Math.sqrt(varV)/avgV:1;
    volStab=cvV<0.3?75:cvV<0.5?60:cvV<0.8?45:30;
  }
  var composite=Math.round(sectorMom*0.30+commodityScore*0.30+competitorScore*0.25+volStab*0.15);
  return{composite,sentimentScore:sectorMom,searchTrend:competitorScore,
    socialScore:Math.round((sectorMom+competitorScore)/2),supplyChain:volStab,
    signal:composite>=70?"إشارة إيجابية":composite>=50?"محايد":"إشارة سلبية",
    grade:composite>=80?"A":composite>=60?"B":composite>=40?"C":"D"};
}

export { calcBehavioralPressure, calcInsiderTransactions, calcAlternativeData };
