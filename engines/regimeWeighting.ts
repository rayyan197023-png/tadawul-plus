/**
 * @module engines/regimeWeighting
 * @description كشف حالة السوق، الأوزان الديناميكية، ضبط الارتباط، وعقوبات التعارض
 * (منقول من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 */

/* ── مساعد: clamp + sigmoid + softmax ── */
function _clamp(v: number, lo: number, hi: number): number { return Math.min(hi,Math.max(lo,v)); }

function _softmax3(a: number, b: number, c: number): any {
  a = typeof a === 'number' && !isNaN(a) ? a : 0;
  b = typeof b === 'number' && !isNaN(b) ? b : 0;
  c = typeof c === 'number' && !isNaN(c) ? c : 0;
  
  const maxVal = Math.max(a, b, c);
  const T = 50;
  
  const ea = Math.exp(_clamp((a - maxVal) / T, -10, 0));
  const eb = Math.exp(_clamp((b - maxVal) / T, -10, 0));
  const ec = Math.exp(_clamp((c - maxVal) / T, -10, 0));
  
  const s = ea + eb + ec;
  
  if (s === 0 || !isFinite(s)) {
    return { bull: 33, bear: 33, neutral: 34 };
  }
  
  let bullProb = (ea / s) * 100;
  let bearProb = (eb / s) * 100;
  let neutralProb = (ec / s) * 100;
  
  let bull = Math.round(bullProb);
  let bear = Math.round(bearProb);
  let neutral = Math.round(neutralProb);
  
  const total = bull + bear + neutral;
  if (total !== 100) {
    const diff = 100 - total;
    if (bull >= bear && bull >= neutral) bull += diff;
    else if (bear >= bull && bear >= neutral) bear += diff;
    else neutral += diff;
  }
  
  return {
    bull: Math.max(0, Math.min(100, bull)),
    bear: Math.max(0, Math.min(100, bear)),
    neutral: Math.max(0, Math.min(100, neutral))
  };
}

/* ── 1) detectMarketRegime الموسّع ── */
function detectMarketRegime(bars: any[], adxV: number, mktWtd: any, mktBreadth: any, atr: number, stk: any, vix: number = 20): any {
  const n = bars.length||1;
  const atrPct = atr / (bars[n-1].c||1) * 100;
  const ret5 = bars.length>=5 ? bars.slice(-5).reduce((s,b)=>s+b.pct,0)/5 : 0;
  const recentAtrPct = bars.length>=5
    ? bars.slice(-5).reduce((s,b)=>s+Math.abs(b.pct),0)/5
    : Math.abs(stk.ch);
  const historicAtrPct = bars.length>=20
    ? bars.slice(-20).reduce((s,b)=>s+Math.abs(b.pct),0)/20
    : recentAtrPct;
  const volSpike = historicAtrPct>0 ? recentAtrPct/historicAtrPct : 1;
  const isSideways = adxV < 20 && atrPct < 1.2;
  const isVolatile  = volSpike > 1.8 || atrPct > 2.5;
  const avgVol = bars.reduce((s,b)=>s+b.vol,0)/n;
  const vol5   = bars.length>=5 ? bars.slice(-5).reduce((s,b)=>s+b.vol,0)/5 : avgVol;
  const volRatio = avgVol>0 ? vol5/avgVol : 1;
  const isNewsdriven = vix > 28 && volRatio > 1.6;
  const isTrending = adxV > 28 && Math.abs(mktWtd) > 0.25;
  const isBullish  = isTrending && mktWtd > 0 && mktBreadth > 0.55;
  const isBearish  = isTrending && mktWtd < 0 && mktBreadth < 0.45;

  let regime;
  if      (isVolatile)   regime = "volatile";
  else if (isNewsdriven) regime = "news-driven";
  else if (isSideways)   regime = "sideways";
  else if (isBullish)    regime = "bull";
  else if (isBearish)    regime = "bear";
  else                   regime = "chop";

  return {regime, atrPct:+atrPct.toFixed(2), volSpike:+volSpike.toFixed(2), ret5:+ret5.toFixed(3), volRatio:+volRatio.toFixed(2)};
}

/* ── 2) Dynamic Weights حسب الـ Regime + القطاع ── */
function buildDynamicWeights(regime: any, sector: string): any {
  const BASE = {
    L9:0.20, L1:0.20, L5:0.20,
    L4:0.15, L8:0.15,
    L7:0.06, L6:0.04, L2:0.02, L3:0.02
  };

  const DELTA = {
    bull:        {L5:+.05, L1:+.03, L4:+.02, L9:+.01, L8:-.02, L7:-.03, L6:-.02, L2:-.02, L3:-.02},
    bear:        {L9:+.06, L7:+.03, L8:+.02, L1:+.01, L5:-.05, L4:-.03, L6:-.02, L2:-.01, L3:-.01},
    sideways:    {L7:+.05, L8:+.04, L9:+.02, L1:-.03, L5:-.05, L4:-.02, L6:+.01, L2:-.01, L3:-.01},
    volatile:    {L9:+.06, L8:+.04, L7:+.02, L5:-.05, L1:-.04, L4:-.02, L6:-.01, L2:0,    L3:0   },
    "news-driven":{L8:+.06, L9:+.03, L7:+.02, L5:-.04, L1:-.03, L4:-.02, L6:-.01, L2:-.01, L3:0  },
    chop:        {L7:+.04, L8:+.03, L9:+.02, L5:-.03, L1:-.03, L4:-.02, L6:0,    L2:-.01, L3:0   },
  };

  const SECTOR_D = {
    "الطاقة" :  {L9:+.04, L8:+.03, L1:+.01, L5:-.03, L4:-.02, L7:-.02, L6:-.01},
    "المواد الأساسية" :  {L9:+.03, L8:+.03, L1:+.01, L5:-.02, L4:-.02, L7:-.02, L6:-.01},
    "البنوك" :  {L8:+.03, L7:+.03, L5:+.01, L9:-.02, L1:-.02, L4:-.01, L6:-.01, L2:-.01},
    "التطبيقات وخدمات التقنية":  {L5:+.03, L1:+.03, L4:+.01, L9:-.02, L8:-.02, L7:-.01, L6:-.01, L2:-.01},
    "إنتاج الأغذية" :  {L8:+.03, L7:+.02, L9:+.01, L5:-.02, L1:-.02, L4:-.01, L6:-.01},
    "التأمين":  {L8:+.03, L7:+.02, L9:+.01, L5:-.02, L1:-.02, L4:-.01, L6:-.01},
  };

  const W = {...BASE};
  const rd = (DELTA as any)[regime] || DELTA.chop;
const sd = (SECTOR_D as any)[sector] || {};

  ['L1','L2','L3','L4','L5','L6','L7','L8','L9'].forEach(k=>{
    (W as any)[k] = ((BASE as any)[k]||0) + ((rd as any)[k]||0)*0.70 + ((sd as any)[k]||0)*0.30;
    (W as any)[k] = Math.max(0.01, (W as any)[k]);
  });

  const total = (Object.values(W) as number[]).reduce((s,v)=>s+v,0);
['L1','L2','L3','L4','L5','L6','L7','L8','L9'].forEach(k=>{
    (W as any)[k] = +((W as any)[k]/total).toFixed(4);
  });

  return W;
}

/* ── 3) Correlation Control ── */
function reduceCorrelation(layers: any): any {
  const {L1, L2, L4, L5, L7, L9} = layers;
  
  let W_corr = {L1:1, L2:1, L3:1, L4:1, L5:1, L6:1, L7:1, L8:1, L9:1};

  if(L1 !== undefined && L4 !== undefined && Math.abs(L1-L4) < 15){
    W_corr.L4 = 0.75;
  }

  if(L5 !== undefined && L2 !== undefined && Math.abs(L5-L2) < 15){
    W_corr.L2 = 0.70;
  }

  if(L9 !== undefined && L2 !== undefined){
    if((L9>65 && L2>65) || (L9<40 && L2<40)){
      W_corr.L2 = Math.min(W_corr.L2, 0.65);
    }
  }

  if(L1 !== undefined && L5 !== undefined && Math.abs(L1-L5) < 12){
    W_corr.L5 = 0.90;
  }

  if(L7 !== undefined && L9 !== undefined){
    if((L7>65 && L9>65) || (L7<40 && L9<40)){
      W_corr.L7 = 0.92;
    }
  }

  return W_corr;
}

/* ── 4) Macro Impact Gate ── */
function applyMacroGate(rawScore: number, macroScore100: number): any {
  let multiplier = 1.0;
  if      (macroScore100 < 25) multiplier = 0.82;
  else if (macroScore100 < 40) multiplier = 0.91;
  else if (macroScore100 > 75) multiplier = 1.06;
  else if (macroScore100 > 60) multiplier = 1.03;
  return _clamp(rawScore * multiplier, 0, 100);
}

/* ── 5) Progressive Conflict Penalty ── */
function calcConflictPenalty(layers: any, regime: any): any {
  const {L1,L4,L5,L7,L9} = layers;

  const conflicts = [
    {active: L1>75 && L5<30,  severity: 3, label:"هيكل↑ مؤشرات↓"},
    {active: L9>75 && L1<30,  severity: 3, label:"سيولة↑ هيكل↓"},
    {active: L5>75 && L9<30,  severity: 2, label:"زخم↑ سيولة↓"},
    {active: L7>75 && L9<35,  severity: 2, label:"بايزي↑ سيولة↓"},
    {active: L4>70 && L1<30,  severity: 1, label:"قوة↑ هيكل↓"},
  ];

  const active = conflicts.filter(c=>c.active);
  if(!active.length) return {penalty:0, conflictCount:0, details:[]};

  let penalty = 0;
  active.forEach((c,i)=>{
    penalty += c.severity * 3 * (1 + i * 0.5);
  });

  if(regime === "volatile") penalty *= 1.3;
  if(regime === "news-driven") penalty *= 1.2;

  return {
    penalty: Math.round(_clamp(penalty, 0, 25)),
    conflictCount: active.length,
    details: active.map(c=>c.label)
  };
}

export { detectMarketRegime, buildDynamicWeights, reduceCorrelation, applyMacroGate, calcConflictPenalty, _clamp, _softmax3 };
