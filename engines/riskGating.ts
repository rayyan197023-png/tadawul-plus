/**
 * @module engines/riskGating
 * @description بوابة المخاطر الديناميكية، العتبة التكيفية، ونسبة شارب (على مستوى تحليل سهم فردي بسياق السوق العام)
 * (منقول من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 * ملاحظة: مختلف عن engines/portfolioEngine.ts الموجود (الذي يخص إدارة محفظة متعددة الأسهم)
 * ملاحظة: calcPositionSize لم تُنقل من analysisEngine.ts (فروقات جوهرية عن ثوابت KELLY، قرار سابق بعدم لمسها)
 */

/* ③ Dynamic Risk Gate */
function calcRiskGateLevel(vix: number = 20, breadth: number = 0.5): any {
  if(vix>30 || breadth<0.20) return "DANGER";
  if(vix>20 || breadth<0.35)     return "CAUTION";
  return "SAFE";
}

/* ④ Adaptive Signal Threshold */
function calcAdaptiveThreshold(allHealthData: any[], breadth: number = 0.5, vix: number = 20): any {
  if(!allHealthData||!allHealthData.length) return 45;

  var avgADX = allHealthData.reduce(function(s,h){
    return s+(h.layers&&h.layers.L1?h.layers.L1:50);
  },0)/allHealthData.length;

  if(avgADX>65 && breadth>0.60 && vix<20) return 38;
  if(avgADX<40 || (breadth>0.40 && breadth<0.60)) return 48;
  if(vix>25 || breadth<0.35) return 62;
  return 45;
}

/* ⑤ Sharpe-like Tracker
   ⚠️ ليست نسبة شارب حقيقية: المدخلات درجات صحة لا عوائد،
   والثابت 0.15 افتراض تحويل تعسّفي. مؤشر تشتت داخلي فقط. */
function calcPortfolioSharpe(allHealthData: any[], saudiRepoRate: number = 4.25): any {
  if(!allHealthData||allHealthData.length<2) return null;
  var scores = allHealthData.map(function(h){return h.score||50;});
  var avg    = scores.reduce(function(s,v){return s+v;},0)/scores.length;
  var std    = Math.sqrt(scores.reduce(function(s,v){return s+Math.pow(v-avg,2);},0)/scores.length);
  var rf     = (saudiRepoRate||4.25)/252;
  var sharpe = std>0 ? +((avg/100*0.15 - rf) / (std/100)).toFixed(2) : 0;
  return {
    avg:+avg.toFixed(1), std:+std.toFixed(1), sharpe,
    label: sharpe>2?"ممتاز":sharpe>1?"جيد":sharpe>0.5?"مقبول":"ضعيف",
  };
}

export { calcRiskGateLevel, calcAdaptiveThreshold, calcPortfolioSharpe };
