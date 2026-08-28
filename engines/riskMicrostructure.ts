/**
 * @module engines/riskMicrostructure
 * @description محركات المخاطر والبنية الدقيقة للسوق (Risk Attribution, Intermarket, Microstructure)
 * (منقولة من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 */

import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import { OIL_SENS, RATE_SENS } from './marketConstants';
import type { Bar, MacroData, Stock } from './types';

// ── عائد تاسي السنوي التراكمي من كاش الشموع ──
function _getTasiAnnReturn(): number | null {
  try {
    var keys = ['tp_hist_TASI', 'tp_hist_^TASI', 'tp_hist_1'];
    for (var i = 0; i < keys.length; i++) {
      var raw = localStorage.getItem(keys[i]);
      if (!raw) continue;
      var entry = JSON.parse(raw);
      if (!entry || !entry.bars || entry.bars.length < 30) continue;
      var b = entry.bars;
      var first = b[0].c, last = b[b.length - 1].c;
      if (!first || first <= 0 || !last) continue;
      var totalRet = (last - first) / first;
      // تحويل لعائد سنوي حسب عدد الشموع الفعلي
      return Math.pow(1 + totalRet, 252 / b.length) - 1;
    }
  } catch (e) {}
  return null;
}

/* ══ Risk Attribution ══ */
function calcRiskAttribution(stk: Stock, bars: Bar[], saudiRepoRate: number = 4.25): any {
  var volBars=bars.slice(-Math.min(bars.length,100));
  var n=volBars.length||1;
  var avgRet=volBars.reduce(function(s,b){return s+b.pct/100;},0)/n;
  var variance=volBars.reduce(function(s,b){return s+Math.pow(b.pct/100-avgRet,2);},0)/n;
  var dailyVol=Math.sqrt(variance);
  var annVol=dailyVol*Math.sqrt(252);
  var volatility=+(dailyVol*100).toFixed(2);
  var histReturn=Math.pow(1+avgRet,252)-1;
  var rfRate=(saudiRepoRate||4.25)/100;
  var sharpe=annVol>0?+((histReturn-rfRate)/annVol).toFixed(2):0;
  var downVals=volBars.filter(function(b){return b.pct<0;});
  var downVar=downVals.length>0?downVals.reduce(function(s,b){return s+Math.pow(b.pct/100,2);},0)/n:variance;
  var downsideVol=Math.sqrt(downVar)*Math.sqrt(252);
  var sortino=downsideVol>0?+((histReturn-rfRate)/downsideVol).toFixed(2):0;
  var mktRet = STOCKS.reduce(function(s,x){ return s + (x.ch||0)/100; },0) / STOCKS.length / 5;
  var mktAvgDailyRet = mktRet;
  var mktAnnReturn=Math.pow(1+mktAvgDailyRet,252)-1;
  var beta=stk.sector_beta||1.0;
  var capmReturn=rfRate+beta*(mktAnnReturn-rfRate);
  var alpha=+(histReturn-capmReturn).toFixed(3);
  var riskLevel=dailyVol*100>2.5?"مرتفع":dailyVol*100>1.2?"متوسط":"منخفض";
  return{volatility,sharpe,sortino,alpha,riskLevel,beta:+beta.toFixed(2),
    annVol:+(annVol*100).toFixed(1),histReturn:+(histReturn*100).toFixed(1),
    signal:sortino>2?"عائد/مخاطر ممتاز":sharpe>1.5?"عائد معدّل ممتاز":sharpe>0.5?"مقبول":sharpe>0?"عائد ضعيف":"لا يعوّض المخاطرة"};
}

/* ══ Intermarket ══ */
function calcIntermarket(stk: any, macroData: MacroData): any {
  var m=macroData;
  var oS=(OIL_SENS as any)[stk.sec]||0.8,rS=(RATE_SENS as any)[stk.sec]||0.3;
  var oilDelta=(m.oilPrice-m.oilTarget)/m.oilTarget;
  var effectiveOilSens = stk.oilCorr ? (oS*0.50 + stk.oilCorr*0.50) : oS;
  var oilEffect=oilDelta*effectiveOilSens;
  var rr=m.saudiRepoRate-m.cpi;
  var rateBase=Math.round(10+8*Math.tanh((rr-1.5)/1.5));
  var rateEffect=(rateBase-10)/10*0.05;
  var vixEffect  = -0.12 * Math.tanh((m.vix-20)/8);
  var gdpEffect  =  0.07 * Math.tanh((m.gdpGrowth-2.5)/2);
  var m2Effect   =  0.05 * Math.tanh((m.m2Growth-5)/3);
  var multiplier=Math.min(1.20,Math.max(0.80,1.0+oilEffect+rateEffect+vixEffect+gdpEffect+m2Effect));
  return{multiplier:+multiplier.toFixed(3),score:Math.round((multiplier-0.80)/0.40*100),
    signal:multiplier>=1.10?"بيئة كلية داعمة بقوة":multiplier>=1.03?"بيئة كلية داعمة":multiplier>=0.97?"محايد":"ضاغطة"};
}

/* ══ Microstructure ══ */
function calcMicrostructure(stk: any, bars: Bar[]): any {
  if(!bars||bars.length<10)return null;
  var ofi=0,totalVol=0;
  for(var i=1;i<bars.length;i++){
    var b=bars[i],prev=bars[i-1];
    totalVol+=b.vol;
    var dir=b.c>prev.c?1:b.c<prev.c?-1:0;
    var clv=(b.hi-b.lo)>0?((b.c-b.lo)-(b.hi-b.c))/(b.hi-b.lo):0;
    ofi+=dir*b.vol*Math.abs(clv);
  }
  var ofiNorm=totalVol>0?ofi/totalVol:0;
  var alpha_ew=2/(6+1);
  var ewmaVol=bars[0].vol;
  for(var j=1;j<bars.length;j++){ewmaVol=alpha_ew*bars[j].vol+(1-alpha_ew)*ewmaVol;}
  var recentVol=bars.slice(-3).reduce(function(s,b){return s+b.vol;},0)/3;
  var volAccel=ewmaVol>0?recentVol/ewmaVol:1;
  var ofiScore=Math.round(Math.min(100,Math.max(0,50+ofiNorm*50)));
  var accelScore=Math.round(Math.min(100,Math.max(0,50+Math.tanh((volAccel-1)*2)*40)));
  var composite=Math.round(ofiScore*0.55+accelScore*0.45);
  var multiplier=Math.min(1.15,Math.max(0.85,1.0+Math.tanh(ofiNorm*3)*0.10+(volAccel>1.3?0.04:0)));
  return{composite,multiplier:+multiplier.toFixed(3),ofi:+ofiNorm.toFixed(3),volAccel:+volAccel.toFixed(2),
    signal:composite>=70&&ofiNorm>0.2?"تدفق شراء مؤسسي":composite>=70?"ضغط شراء":composite>=50?"متوازن":"ضغط بيعي"};
}

export { calcRiskAttribution, calcIntermarket, calcMicrostructure };
