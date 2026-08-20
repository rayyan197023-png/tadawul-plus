/**
 * @module engines/analysisEngine
 * @description محرك التحليل الكامل — مستخرج من AnalysisScreen
 *
 * يحتوي على:
 * - ثوابت الاقتصاد الكلي (MACRO, OIL_SENS, RATE_SENS)
 * - مولّد الشموع (seedRng, genBars)
 * - المؤشرات التقنية (RSI, ATR, EMA, VWAP, CMF, OBV)
 * - محركات SMC (Market Structure, Order Blocks, Liquidity)
 * - المحركات الأساسية (DCF, Factor, Earnings)
 * - محركات المخاطر (CVaR, Kelly, ATR Stop)
 * - محرك Ensemble + Feedback
 * - stockHealth() — الدالة الرئيسية
 *
 * الاستخدام:
 *   import { stockHealth, genBars, scoreWord } from '../engines/analysisEngine';
 */

import { STOCKS_LIVE as STOCKS } from '../constants/stocksData';
import { GATE_THRESHOLDS as GATE_THRESHOLDS_CONFIG } from '../constants/analysisConstants';
import { GRADE_THRESHOLDS } from '../constants/analysisConstants';
import { RISK } from '../constants/analysisConstants';
import { calcRSI, calcATR, calcVWAP, calcCMF, calcOBV, calcMACD, calcMarketStructure, calcIVWAP } from './technicalEngine';
import { calcOrderBlocks, calcLiqSweep } from './radarEngine';
import { OIL_SENS, RATE_SENS, TASI_CORR_GROUPS, KELLY_CONFIG, RISK_GATE, RADAR_SECTOR_PE } from './marketConstants';
import { calcFactorModel, calcEarningsModel, calcDCF, calcEarningsQuality } from './fundamentalModels';
import { calcBehavioralPressure, calcInsiderTransactions, calcAlternativeData } from './behavioralEngines';
import { calcRiskAttribution, calcIntermarket, calcMicrostructure } from './riskMicrostructure';
import { detectMarketRegime, buildDynamicWeights, reduceCorrelation, applyMacroGate, calcConflictPenalty, _clamp, _softmax3 } from './regimeWeighting';
import {
  ensembleVote,
  calcConfidenceThreshold,
  loadWinnerStrategy,
  applyWinnerWeights,
  loadFeedbackState,
  saveFeedbackState,
  getAdaptiveWeightAdjustment,
  recordFeedback,
  applyFeedbackToWeights,
} from './feedbackLearning';
import { calcRiskGateLevel, calcAdaptiveThreshold, calcPortfolioSharpe } from './riskGating';
import { _emptyHealthResult, scoreWord } from './helpers';
import { G, R, BLUE, GOLD, CYAN, LIME, ORANGE, PU, T2, C } from './colorTokens';
import type { Bar, MacroData, Stock, HealthScore } from './types';

/**
 * ✨ Macro Score - النسخة الموسّعة للرادار
 * 
 * تُستخدم في analyzeStockRadar
 * تأخذ في الاعتبار:
 * - Oil price (للقطاعات الحساسة)
 * - Interest rates (للبنوك والقطاعات الحساسة للفائدة)
 * - VIX (مؤشر الخوف العالمي)
 * - GDP Growth
 * - PE Ratio
 */
function calcMacroScore(stk: any, macroData: MacroData = { oilPrice: 80, oilTarget: 80, saudiRepoRate: 4.25, cpi: 2, vix: 20, gdpGrowth: 4 }): any {

  // ① PE component (40%)
  const pe = stk.pe || 20;
  const peScore = Math.max(0, Math.min(100, 100 - (pe - 15) * 2));
  
  // ② Oil component (25%) - للقطاعات الحساسة
   const oilSens = (OIL_SENS as any)[stk.sec] || 0.5;
  const oilDelta = (macroData.oilPrice - macroData.oilTarget) / macroData.oilTarget;
  const oilScore = Math.max(0, Math.min(100, 50 + oilSens * oilDelta * 80));
  
  // ③ Rate component (15%) - للبنوك والقطاعات
  const rateSens = (RATE_SENS as any)[stk.sec] || 0.3;
  const realRate = macroData.saudiRepoRate - macroData.cpi;
  const rateScore = Math.max(0, Math.min(100, 50 + rateSens * (realRate - 1.5) * 15));
  
  // ④ VIX component (10%) - inverse
  const vixScore = Math.max(0, Math.min(100, 100 - (macroData.vix - 20) * 3));
  
  // ⑤ GDP component (10%)
  const gdpScore = Math.max(0, Math.min(100, 50 + (macroData.gdpGrowth - 2.5) * 15));
  
  // ⑥ Composite score (weighted)
  const score = Math.round(
    peScore * 0.40 +
    oilScore * 0.25 +
    rateScore * 0.15 +
    vixScore * 0.10 +
    gdpScore * 0.10
  );
  
  return {
    score: Math.max(0, Math.min(100, score)),
    components: {
      pe: Math.round(peScore),
      oil: Math.round(oilScore),
      rate: Math.round(rateScore),
      vix: Math.round(vixScore),
      gdp: Math.round(gdpScore),
    },
  };
}

/* ══ ثوابت الاقتصاد الكلي ══
   استخدام `let` بدل `const` لتمكين override من FRED API */
let MACRO = {
  oilPrice: 101.44, oilTarget: 80,
  saudiRepoRate: 4.25, cpi: 1.7,
  gdpGrowth: 4.6, tasiPE: 19.8,
  vix: 24.85, m2Growth: 9.1,
  oilWarPremium: true,
  retailRatio: 0.85,
  sessionDay: "SUN",
  pifSectors: [] as any[],
  oilTasiRegime: "RALLY",
};

// MACRO الأصلي - للاسترجاع
const MACRO_DEFAULTS = { ...MACRO };

/**
 * 🆕 setMacroOverride - تحديث القيم الكلية مؤقّتاً
 * يُستعمل في stockHealth قبل التحليل، ويُعيد القيم الأصلية بعده
 */
function setMacroOverride(override: any): any {
  const previous = { ...MACRO };
  if (override && typeof override === 'object') {
    if (typeof override.oilPrice === 'number' && override.oilPrice > 0) MACRO.oilPrice = override.oilPrice;
    if (typeof override.vix === 'number' && override.vix > 0) MACRO.vix = override.vix;
    if (typeof override.saudiRepoRate === 'number') MACRO.saudiRepoRate = override.saudiRepoRate;
    if (typeof override.cpi === 'number') MACRO.cpi = override.cpi;
    if (typeof override.gdpGrowth === 'number') MACRO.gdpGrowth = override.gdpGrowth;
    if (typeof override.tasiPE === 'number') MACRO.tasiPE = override.tasiPE;
    if (typeof override.m2Growth === 'number') MACRO.m2Growth = override.m2Growth;
    if (typeof override.sessionDay === 'string') MACRO.sessionDay = override.sessionDay;
    if (Array.isArray(override.pifSectors)) MACRO.pifSectors = override.pifSectors;
    if (typeof override.oilTasiRegime === 'string') MACRO.oilTasiRegime = override.oilTasiRegime;
    if (typeof override.oilWarPremium === 'boolean') MACRO.oilWarPremium = override.oilWarPremium;
    if (typeof override.retailRatio === 'number') MACRO.retailRatio = override.retailRatio;
    if (typeof override.oilTarget === 'number') MACRO.oilTarget = override.oilTarget;
  }
  return previous;
}

/**
 * 🆕 restoreMacro - إعادة قيم MACRO السابقة
 */
function restoreMacro(previous: any): void {
  if (previous && typeof previous === 'object') {
    Object.keys(previous).forEach(k => {
      (MACRO as any)[k] = previous[k];
    });
  }
}

/* ══ TASI Context Engine — خصائص تاسي الفريدة ══
   يستغل 5 ميزات لا توجد في أي سوق آخر:
   ① TASI Dominance Score  ② Oil-TASI Regime
   ③ Retail Sentiment Proxy ④ Session Timing Factor
   ⑤ PIF Activity Signal
══════════════════════════════════════════════════ */

/* ══ مولّد الشموع (GBM) ══ */
function seedRng(s: number): () => number { let x=s; return()=>{ x=(x*1664525+1013904223)&0xffffffff; return(x>>>0)/0xffffffff; }; }
function genBars(stk: any, n: number = 60): any[] {
  n = n||100;
  // ✨ HISTORICAL حُذفت (كانت بيانات وهمية يدوية لسهم واحد فقط) -- التوليد العشوائي أدناه هو المسار الوحيد المتبقي
  
  
  /* ════════════════════════════════════════════════════════════════
     ✨ GBM متطور - مستوى Wall Street
     يطبّق:
     1. Box-Muller Transform (Normal Distribution حقيقي)
     2. GARCH(1,1) Stochastic Volatility
     3. Student's t-distribution (Fat Tails)
     4. Jump Diffusion (Black Swan events)
     5. Asymmetric Volatility (Leverage Effect)
     6. Dynamic Mean Reversion (سرعة متغيّرة)
  ════════════════════════════════════════════════════════════════ */
  
  const rng = seedRng(parseInt(stk.sym)*997+7);
  const bars: any[] = [];
  let p = stk.p*(1-stk.ch/100);
  
  // ① معاملات أساسية
  const mu = (stk.ch/100)/n;
  const sectorBeta = stk.sector_beta || 1;
  
  // ② GARCH(1,1) Parameters
  // σ²(t) = ω + α·ε²(t-1) + β·σ²(t-1)
  let sigma_t = 0.012 * sectorBeta; // initial volatility
  const omega = 0.000001;            // long-run variance
  const alpha = 0.1;                 // ARCH coefficient
  const beta_garch = 0.85;           // GARCH coefficient (persistence)
  let lastReturn = 0;                // last return for ARCH effect
  
  // ③ Jump Diffusion Parameters (Merton)
  const jumpProb = 0.02;             // 2% احتمال قفزة يومياً
  const jumpMean = 0;                // متوسط القفزة
  const jumpStd = 0.025;             // 2.5% std للقفزات
  
  // ④ Mean Reversion (Ornstein-Uhlenbeck)
  // معدّل حسب القطاع - بحث علمي على تاسي
  const sectorMR = {
    'البنوك': 0.18,
    'المواد الأساسية': 0.10, 'الطاقة': 0.10,
    'التطبيقات وخدمات التقنية': 0.08, 'الإتصالات': 0.12,
    'التجزئة': 0.14, 'الرعاية الصحية': 0.13,
    'إدارة وتطوير العقارات': 0.11, 'المرافق العامة': 0.16,
  };
  const meanRevStrength = (sectorMR as any)[stk.sec] || 0.12;
  
  // ⑤ Oil Correlation (Dynamic)
  const baseOilCorr = stk.oilCorr || 0.15;
  const oilStress = Math.abs((MACRO.oilPrice - MACRO.oilTarget) / MACRO.oilTarget);
  const dynamicOilCorr = baseOilCorr * (1 + oilStress); // يزيد في الأزمات
  const oilReturn = (MACRO.oilPrice - MACRO.oilTarget) / MACRO.oilTarget * 0.004;
  
  
  // ⑥ Asymmetric Volatility (Leverage Effect)
  // الأخبار السلبية تُحدث تقلب أكبر من الإيجابية
  const leverageEffect = 1.3; // negative shocks have 30% more impact
  
  // ⑦ Box-Muller Transform - Normal Distribution
  function normalRandom() {
    const u1 = Math.max(rng(), 1e-10);
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  
  // ⑧ Student's t-distribution (Fat Tails) - df=4 للأسواق المالية
  function tRandom(df = 4) {
    const z = normalRandom();
    let x = 0;
    for (let i = 0; i < df; i++) {
      const ni = normalRandom();
      x += ni * ni;
    }
    return z / Math.sqrt(x / df);
  }
  
  for(let i = 0; i < n; i++) {
    // 🎯 1. Day-of-week effect (تاسي)
    const dayOfWeek = i % 5;
    const sundayMult = dayOfWeek === 0 ? 1.35 : 1.0;
    
    // 🎯 2. GARCH Volatility Update
    sigma_t = Math.sqrt(omega + alpha * lastReturn * lastReturn + beta_garch * sigma_t * sigma_t);
    sigma_t = Math.max(0.005, Math.min(0.05, sigma_t)); // bounds: 0.5% - 5%
    
    // 🎯 3. Innovation - Student's t-distribution (Fat Tails)
    const epsilon = tRandom(4);
    
    // 🎯 4. Asymmetric Volatility (Leverage Effect)
    const sigmaAsym = lastReturn < 0 ? sigma_t * leverageEffect : sigma_t;
    
    // 🎯 5. Diffusion Component
    const diffusion = sigmaAsym * epsilon * sundayMult;
    
    // 🎯 6. Jump Component (Merton Jump Diffusion)
    let jump = 0;
    if (rng() < jumpProb) {
      const jumpSize = jumpMean + jumpStd * normalRandom();
      jump = jumpSize;
    }
    
    // 🎯 7. Oil Component (Dynamic)
    const oilComponent = dynamicOilCorr * oilReturn;
    
    // 🎯 8. Mean Reversion (Ornstein-Uhlenbeck)
    const deviation = (p / stk.p - 1);
    const revComponent = -meanRevStrength * deviation * 0.01;
    
    // 🎯 9. Total Return
    const c = mu + diffusion + jump + oilComponent + revComponent;
    
    // 🎯 10. Price evolution
    const o = p;
    const cl = p * (1 + c);
    
    // 🎯 11. High/Low - يعكس volatility الحقيقية
    const intraVol = sigma_t * sundayMult * 0.7;
    const hi = Math.max(o, cl) * (1 + Math.abs(normalRandom()) * intraVol);
    const lo = Math.min(o, cl) * (1 - Math.abs(normalRandom()) * intraVol);
    
    // 🎯 12. Volume - يرتبط بـ |return|² (volume-volatility correlation)
    const volMult = 1 + Math.abs(c) * 50; // higher returns = higher volume
    const closingHourMult = (i % 10 === 9) ? 1.25 : 1.0;
    const vol = Math.round((stk.avgV || 2e6) * (0.4 + rng() * 1.6) * closingHourMult * volMult);
    
    bars.push({
      o: +o.toFixed(2),
      hi: +hi.toFixed(2),
      lo: +lo.toFixed(2),
      c: +cl.toFixed(2),
      vol: vol,
      pct: +(c * 100).toFixed(3),
    });
    
    p = cl;
    lastReturn = c; // for GARCH next iteration
  }
  
  return bars;
}


/* ══════════════════════════════════════════════════════════════
   المحركات المدمجة من رادار الفرص
══════════════════════════════════════════════════════════════ */



/* ══ المؤشرات التقنية ══ */
function calcEMA(vs: number[], p: number): number {
  if(!vs.length)return 0;
  const k=2/(p+1);let e=vs[0];
  for(let i=1;i<vs.length;i++)e=vs[i]*k+e*(1-k);
  return e;
}


/* ══ المحركات الرئيسية ══ */
function calcTasiContext(stk: any, bars: any[], allStocks: any[] = []): any {
  // ① TASI Dominance Score
  // أكبر 10 أسهم بالقيمة السوقية = قادة المؤشر (60-70% من السوق)
  // ديناميكي — يتكيف تلقائياً مع أي عدد أسهم
  var topN = Math.min(10, Math.max(3, Math.round(allStocks.length * 0.10)));
  var dominants = allStocks
    .slice()
    .sort(function(a: any, b: any){ return (b.mktCap||0)-(a.mktCap||0); })
    .slice(0, topN);
  var domBullCount = dominants.filter(function(x: any){ return x.ch>0.3; }).length;
var domBearCount = dominants.filter(function(x: any){ return x.ch<-0.3; }).length;
  var domRatio = domBullCount / topN; // نسبة الصاعدين
  // منطق الأغلبية بدل "الكل أو لا شيء"
  var domDir = domRatio>=0.70?1 : domRatio>=0.55?0.5 : (1-domRatio)>=0.70?-1 : (1-domRatio)>=0.55?-0.5 : 0;
  var dominanceScore = _clamp(Math.round(50 + domDir*20), 0, 100);

  // ② Oil-TASI Regime
  // تحديد الـ Regime بناءً على العلاقة النفط/تاسي
  var oilAboveTarget = MACRO.oilPrice > MACRO.oilTarget;
  var tasiAvgCh = allStocks.reduce(function(s: number, x: any){ return s+x.ch; },0)/allStocks.length;
  var tasiBull = tasiAvgCh > 0.2;
  var tasiRegime;
  if(oilAboveTarget && tasiBull)        tasiRegime = "RALLY";    // تأكيد مزدوج ← أفضل بيئة
  else if(oilAboveTarget && !tasiBull)  tasiRegime = "DIVERGE";  // تحذير ← نفط صاعد/تاسي هابط
  else if(!oilAboveTarget && tasiBull)  tasiRegime = "DECOUPLE"; // فصل ← تاسي يتحرك بعوامل أخرى
  else                                   tasiRegime = "CRASH";    // خطر ← كلاهما هابط
  var oilRegimeScore = tasiRegime==="RALLY"?80 : tasiRegime==="DECOUPLE"?55
                     : tasiRegime==="DIVERGE"?35 : 20;

  // ③ Retail Sentiment Proxy
  // 85% من التداول أفراد → الأسهم الصغيرة تتقدم الكبيرة عند euphoria
  var smallCaps = allStocks.filter(function(x: any){ return (x.mktCap||100)<100; });
var largeCaps = allStocks.filter(function(x: any){ return (x.mktCap||100)>300; });
var smallAvgCh = smallCaps.length ? smallCaps.reduce(function(s: number, x: any){ return s+x.ch; },0)/smallCaps.length : tasiAvgCh;
var largeAvgCh = largeCaps.length ? largeCaps.reduce(function(s: number, x: any){ return s+x.ch; },0)/largeCaps.length : tasiAvgCh;
  var retailSpread = smallAvgCh - largeAvgCh;  // إيجابي = retail يقود = momentum قوي لكن هش
  var retailSentiment = _clamp(Math.round(50 + retailSpread*12), 0, 100);
  var retailEuphoria = retailSpread > 1.5;     // الأفراد يبالغون في التفاؤل → خطر انعكاس

  // ④ Session Timing Factor
  // الأحد: تقلب ×1.2 (بعد الإجازة)، الخميس: حجم ×1.15
  var sessionDay = MACRO.sessionDay || "SUN";
  var isSunday   = sessionDay === "SUN";
  var isThursday = sessionDay === "THU";
  var sessionBoost = isSunday ? 1.20 : isThursday ? 1.10 : 1.0;
  // في الأحد: الإشارات الحدية أقل موثوقية (تقلب أعلى)
  var sundayPenalty = isSunday ? 5 : 0;

  // ⑤ PIF Activity Signal
  // القطاعات التي استقبلت إعلانات حكومية → وزن L4+L8 أعلى
  var pifActive = (MACRO.pifSectors||[]).indexOf(stk.sec) !== -1;
  var pifBoost = pifActive ? 8 : 0;

  // ── الدرجة المركّبة لتاسي ──
  var tasiComposite = Math.round(
    dominanceScore * 0.35 +
    oilRegimeScore * 0.30 +
    retailSentiment * 0.20 +
    (100 - sundayPenalty) * 0.15
  );

  // ── إشارة تاسي السياقية ──
  var tasiSignal = tasiComposite >= 72 ? "بيئة تاسي داعمة"
                 : tasiComposite >= 52 ? "بيئة محايدة"
                 : tasiComposite >= 35 ? "بيئة ضاغطة"
                 : "بيئة خطرة";

  return {
    dominanceScore, domDir, domBullCount, domBearCount,
    domRatio:+domRatio.toFixed(2), topN,
    tasiRegime, oilRegimeScore,
    retailSentiment, retailEuphoria, retailSpread:+retailSpread.toFixed(2),
    sessionBoost, isSunday, isThursday, sundayPenalty,
    pifActive, pifBoost,
    tasiComposite, tasiSignal,
  };
}

function calcMacroFull(stk: any): any {
  const m=MACRO;
  const oS=(OIL_SENS as any)[stk.sec]||0.8, rS=(RATE_SENS as any)[stk.sec]||0.3;
  const oilDelta=(m.oilPrice-m.oilTarget)/m.oilTarget;
  const oilScore=Math.round(Math.min(20,Math.max(0,10+10*Math.tanh(oilDelta*oS*2))));
  const rr=m.saudiRepoRate-m.cpi;
  const rateBase=Math.round(10+8*Math.tanh((rr-1.5)/1.5));
  const rateScore=rS>0?Math.min(20,Math.max(0,rateBase*rS/1.5)):Math.min(20,Math.max(0,18-rateBase));
  const gdp=Math.round(8+10*Math.tanh((m.gdpGrowth-2.5)/1.5));
  const vix_s=Math.round(10-8*Math.tanh((m.vix-20)/8));
  const mktV_s=Math.round(10-6*Math.tanh((m.tasiPE-20)/5));
  const m2_s=Math.round(8+8*Math.tanh((m.m2Growth-5)/3));
  const score=Math.min(20,Math.max(2,Math.round(oilScore*0.25+rateScore*0.20+gdp*0.20+vix_s*0.15+mktV_s*0.10+m2_s*0.10)));
  return{score,env:score>=15?"إيجابي":score>=10?"محايد":"سلبي",
    label:"نفط "+m.oilPrice+"$ | فائدة "+m.saudiRepoRate+"% | مخاطرة "+m.vix,
    oilScore:+oilScore.toFixed(1),realRate:+rr.toFixed(2)};
}
/* ══ VPVR ══ */
function calcVPVR(bars: any[], levels?: number): any {
  levels=levels||20;
  if(!bars||bars.length<5)return null;
  var minP=bars.reduce(function(m: number, b: any){return Math.min(m,b.lo);},Infinity);
var maxP=bars.reduce(function(m: number, b: any){return Math.max(m,b.hi);},-Infinity);
  var step=(maxP-minP)/levels;
  var profile: any[] = [];
  for(var i=0;i<levels;i++){
    var lo=minP+i*step,hi=lo+step,mid=+((lo+hi)/2).toFixed(2),vol=0;
    bars.forEach(function(b: any){var r=b.hi-b.lo||0.001,ov=Math.max(0,Math.min(b.hi,hi)-Math.max(b.lo,lo));vol+=b.vol*(ov/r);});
    profile.push({lo:+lo.toFixed(2),hi:+hi.toFixed(2),mid:mid,vol:Math.round(vol)});
  }
  var maxVol=profile.reduce(function(m: number, p: any){return Math.max(m,p.vol);},0);
var poc=profile.reduce(function(a: any, b: any){return b.vol>a.vol?b:a;});
var totalVol=profile.reduce(function(s: number, p:any){return s+p.vol;},0);
  var vaVol=0,vaLow=poc.lo,vaHigh=poc.hi;
  var sorted=profile.slice().sort(function(a: any, b: any){return b.vol-a.vol;});

  for(var j=0;j<sorted.length;j++){vaVol+=sorted[j].vol;vaLow=Math.min(vaLow,sorted[j].lo);vaHigh=Math.max(vaHigh,sorted[j].hi);if(vaVol>=totalVol*0.70)break;}
  var cur=bars[bars.length-1].c||bars[bars.length-1].close;
  return{profile,poc,maxVol,vaLow:+vaLow.toFixed(2),vaHigh:+vaHigh.toFixed(2),curPrice:cur,
    signal:cur<vaLow?"شراء — تحت VA":cur>vaHigh?"حذر — فوق VA":"محايد",
    posInVA:cur>=vaLow&&cur<=vaHigh?"داخل Value Area":cur>vaHigh?"فوق Value Area":"تحت Value Area"};
}



/* ══════════════════════════════════════════════════════════════
   رادار الفرص (SMC) — محركات مدمجة في الـ 11 طبقة
   ─────────────────────────────────────────────────────────────
   analyzeStockRadar() تُحسب نتائج الرادار التسعة:
   msScore/obScore/lsScore/viScore/trScore/moScore/lqScore/vaScore/mcScore
   ثم تُدمج كـ sub-scores في calc9Layers لتعزيز دقة النتائج
══════════════════════════════════════════════════════════════ */



function generateBarsRadar(stk: any, days: number = 60): any[] {
  const rng=seedRng(parseInt(stk.sym,10)*997+13);
  const bars=[];
  let p=stk.p*(1-stk.pct/100*(days/20));
  const av=stk.avgVol||stk.v||1e6;
  for(let i=0;i<days;i++){
    const dr=(stk.pct/100)/days;
    const no=(rng()-0.49)*0.018;
    const cl=Math.max(p*0.5,p*(1+dr+no));
    const hi=cl*(1+rng()*0.020);
    const lo=cl*(1-rng()*0.020);
    const volM=0.4+rng()*1.4+Math.abs(dr+no)*10;
    // ✨ توحيد شامل: o+open و c+close معاً -- تعمل مع كل الدوال (radarEngine تقرأ b.c)
    // يُصلح انكساراً صامتاً كان يجعل calcOrderBlocks/calcLiqSweep ترى undefined
    bars.push({o:p,open:p,c:cl,close:cl,hi,lo,vol:Math.round(av*volM),pct:(dr+no)*100});
    p=cl;
  }
  return bars;
}


/**
 * ✨ Stochastic Oscillator %K - George Lane Original
 * 
 * Mathematical Foundation:
 * %K = ((Close - Lowest Low) / (Highest High - Lowest Low)) × 100
 * Range: [0, 100]
 * 
 * Interpretation:
 * - > 80: Overbought
 * - < 20: Oversold
 * - 50: Neutral
 */
function calcStoch(bars: any[], kP: number = 14): any {
  // ① Validation
  if (!bars || !Array.isArray(bars) || bars.length === 0) return 50;
  if (kP < 1) kP = 14;
  if (bars.length < kP) return 50;
  
  // ② Helper functions
  const getC = (b: any) => {
    if (!b) return null;
    return typeof b.c === 'number' ? b.c : 
           typeof b.close === 'number' ? b.close : null;
  };
  const getH = (b: any) => {
    if (!b) return null;
    return typeof b.hi === 'number' ? b.hi : 
           typeof b.high === 'number' ? b.high : null;
  };
  const getL = (b: any) => {
    if (!b) return null;
    return typeof b.lo === 'number' ? b.lo : 
           typeof b.low === 'number' ? b.low : null;
  };
  
  // ③ Get last kP bars
  const slice = bars.slice(-kP);
  
  // ④ Find highest high and lowest low
  let highestHigh = -Infinity;
  let lowestLow = Infinity;
  
  for (const b of slice) {
    const h = getH(b);
    const l = getL(b);
    if (h !== null && h > highestHigh) highestHigh = h;
    if (l !== null && l < lowestLow) lowestLow = l;
  }
  
  // ⑤ Get current close
  const currentClose = getC(bars[bars.length - 1]);
  
  // ⑥ Edge cases
  if (currentClose === null) return 50;
  if (highestHigh === -Infinity || lowestLow === Infinity) return 50;
  
  const range = highestHigh - lowestLow;
  if (range === 0) return 50; // No movement
  
  // ⑦ Calculate %K
  const k = ((currentClose - lowestLow) / range) * 100;
  
  // ⑧ Bound to [0, 100] with 2 decimal precision
  return +Math.max(0, Math.min(100, k)).toFixed(2);
}

/**
 * ✨ SMA (Simple Moving Average)
 * 
 * Mathematical Foundation:
 * SMA = (Σ Close prices over period) / period
 * 
 * Used as:
 * - Trend identification
 * - Support/Resistance levels
 * - Crossover signals (50/200 SMA Golden/Death Cross)
 */
function calcSMA(bars: any[], period: number): number {
  // ① Validation
  if (!bars || !Array.isArray(bars) || bars.length === 0) return 0;
  if (!period || period < 1) period = 20;
  
  // ② Helper to get close
  const getC = (b: any) => {
    if (!b) return null;
    return typeof b.c === 'number' ? b.c : 
           typeof b.close === 'number' ? b.close : null;
  };
  
  // ③ Edge case: less data than period
  if (bars.length < period) {
    const lastClose = getC(bars[bars.length - 1]);
    return lastClose !== null ? +lastClose.toFixed(4) : 0;
  }
  
  // ④ Calculate sum of last 'period' closes
  const slice = bars.slice(-period);
  let sum = 0;
  let validCount = 0;
  
  for (const b of slice) {
    const c = getC(b);
    if (c !== null) {
      sum += c;
      validCount++;
    }
  }
  
  if (validCount === 0) return 0;
  
  // ⑤ Return average with 4 decimal precision
  return +(sum / validCount).toFixed(4);
}

/* ══════════════════════════════════════════════════════════════
   محرك هيكل السوق — Market Structure (HH/HL/LH/LL)
   ══════════════════════════════════════════════════════════════
   التعريف الأكاديمي (Dow Theory + ICT):
   HH = Higher High  | HL = Higher Low  → اتجاه صاعد
   LH = Lower High   | LL = Lower Low   → اتجاه هابط
   BOS = Break of Structure  → كسر الهيكل
   CHOCH = Change of Character → تغيّر طابع السوق
══════════════════════════════════════════════════════════════ */
function analyzeStockRadar(stk: Stock, pastBars?: Bar[], precomputed?: { atr: number; rsi: number; cmf: number; obv: any; ms: any; ob: any; ls: any; vi: any }): any {
  /* ─── البيانات: نستخدم الشموع الماضية الحقيقية إن مُرِّرت (يمنع تسرّب المستقبل في الباك-تيست)،
     وإلا نولّد للعرض الحيّ فقط ─── */
    const bars = (pastBars && pastBars.length >= 15)
    ? pastBars.map(function(b: any){
        // توحيد شامل: نضمن وجود c+close و o+open معاً
        // كي تعمل كل الدوال سواء قرأت b.c (radarEngine) أو b.close (المحلية) -- يمنع الانكسار الصامت
        const _c = b.c ?? b.close;
        const _o = b.o ?? b.open ?? _c;
        return { o: _o, open: _o, c: _c, close: _c, hi: b.hi, lo: b.lo, vol: b.vol, pct: b.pct };
      })
    : generateBarsRadar(stk, 60);

  // ✨ p يُشتقّ من آخر شمعة ماضية (لا من stk.p الحالي) عند الباك-تيست
  const p = (pastBars && pastBars.length >= 15) ? bars[bars.length-1].close : stk.p;
  const hi52=stk.hi||p*1.2,lo52=stk.lo||p*0.8;
  const range52=hi52-lo52,pfl=range52>0?(p-lo52)/range52*100:50;
  const distHi=hi52>0?(hi52-p)/hi52*100:10;
  const distLo=lo52>0?(p-lo52)/lo52*100:10;

  /* ─── المؤشرات الأساسية ─── */
  const rsi  = precomputed?.rsi ?? calcRSI(bars,14);
  const atr  = precomputed?.atr ?? calcATR(bars,14);
  const atrPct=p>0?atr/p*100:2;
  const vwap =calcVWAP(bars);
  const cmf  = precomputed?.cmf ?? calcCMF(bars,20);
  const obv  = precomputed?.obv ?? calcOBV(bars);
  const macd =calcMACD(bars);
  const stoch=calcStoch(bars,14);
  const sma20=calcSMA(bars,20);
  const sma50=calcSMA(bars,50);
  const rvNorm=((stk.v+(stk.avgVol||stk.v))/2)/(stk.avgVol||stk.v||1);

  /* ─── المحركات المتقدمة ─── */
  const ms  = precomputed?.ms ?? calcMarketStructure(bars);
  const ob  = precomputed?.ob ?? calcOrderBlocks(bars,atr);
  const ls  = precomputed?.ls ?? calcLiqSweep(bars,atr);
const vi   = precomputed?.vi ?? calcIVWAP(bars);


  // ✨ vwapDev: انحراف السعر الحالي عن VWAP الفصلي بوحدات الانحراف المعياري
  // (كانت موجودة بالنسخة المحلية القديمة من calcIVWAP، أُعيد حسابها هنا
  // بعد توحيد المصدر على technicalEngine.ts التي لا ترجع هذا الحقل)
  const vwapDev = (function () {
    let sumVV = 0, sumV = 0;
    for (const b of bars) {
      const tp = (b.hi + b.lo + b.c) / 3;
      sumVV += b.vol * (tp - vi.vwQ) ** 2;
      sumV += b.vol;
    }
    const std = sumV > 0 ? Math.sqrt(sumVV / sumV) : 0;
    const cur = bars[bars.length - 1].c;
    return std > 0 ? +((cur - vi.vwQ) / std).toFixed(2) : 0;
  })();

const mc = calcMacroScore(stk, { oilPrice: MACRO.oilPrice, oilTarget: MACRO.oilTarget, saudiRepoRate: MACRO.saudiRepoRate, cpi: MACRO.cpi, vix: MACRO.vix, gdpGrowth: MACRO.gdpGrowth });


  /* ═════════════════════════════════
     عامل 1: هيكل السوق /15
  ═════════════════════════════════ */
  const msScore=Math.min(15,Math.round(ms.score*15/20));

  /* ═════════════════════════════════
     عامل 2: Order Blocks /15
  ═════════════════════════════════ */
  const obScore=Math.min(15,Math.round(ob.score*15/20));

  /* ═════════════════════════════════
     عامل 3: Liquidity Sweeps /10
  ═════════════════════════════════ */
  const lsScore=Math.min(10,Math.round(ls.score*10/20));

  /* ═════════════════════════════════
     عامل 4: VWAP المؤسسي /10
  ═════════════════════════════════ */
  const viScore=Math.min(10,Math.round(vi.score*10/20));

  /* ═════════════════════════════════
     عامل 5: الاتجاه التقني /15
     SMA20/50 + ADX(DI/ATR)
  ═════════════════════════════════ */
  const aboveSMA20=p>sma20,aboveSMA50=p>sma50;
  const ma200p=lo52+range52*0.4,aboveMA200=p>ma200p;
  const maCount=(aboveSMA20?1:0)+(aboveSMA50?1:0)+(aboveMA200?1:0);
  let plusDM=0,minusDM=0,atrS=0;
  for(let i=1;i<bars.length;i++){
    plusDM+=Math.max(bars[i].hi-bars[i-1].hi,0);
    minusDM+=Math.max(bars[i-1].lo-bars[i].lo,0);
    atrS+=Math.max(bars[i].hi-bars[i].lo,Math.abs(bars[i].hi-bars[i-1].close),Math.abs(bars[i].lo-bars[i-1].close));
  }
  const atrAvg=atrS/(bars.length-1)||1;
  const plusDI=plusDM/atrAvg*100,minusDI=minusDM/atrAvg*100;
  const adxP=plusDI+minusDI>0?Math.abs(plusDI-minusDI)/(plusDI+minusDI)*100:25;
  const trScore=Math.min(15,
    (maCount===3?7:maCount===2?5:maCount===1?2:0)+
    (rsi>55&&rsi<75?5:rsi>50?3:rsi>=75?1:0)+
    (adxP>40?3:adxP>25?2:1));
  const trendBull=maCount>=2&&stk.pct>0;

  /* ═════════════════════════════════
     عامل 6: الزخم /15
     RSI Wilder + MACD(12,26) + Stoch%K(14)
  ═════════════════════════════════ */
  const rsiMomScore=rsi<30?13:rsi<45?11:rsi<60?9:rsi<75?5:2;
  const moScore=Math.min(15,
    rsiMomScore+
    ((macd as any).bull&&(macd as any).hist>0?4:(macd as any).bull?2:0)+
    (stoch<20?3:stoch<40?1:stoch>80?0:0));
  const oversold=rsi<35,overbought=rsi>70;

  /* ═════════════════════════════════
     عامل 7: السيولة الذكية /10
     OBV(Granville+OLS) + CMF(Chaikin) + Volume ratio
  ═════════════════════════════════ */
  const obvS=(obv as any).signal==="تأكيد صعود"?4:(obv as any).signal==="تباعد إيجابي"?3:(obv as any).signal==="محايد"?1:0;
  const cmfS=cmf>0.15?3:cmf>0.05?2:cmf>0?1:0;
  const volS=rvNorm>2&&stk.pct>0?3:rvNorm>1.5&&stk.pct>0?2:rvNorm>1.2?1:0;
  const lqScore=Math.min(10,obvS+cmfS+volS);
  const smDetected=(rvNorm>2&&stk.pct>0)||(rvNorm>1.5&&cmf>0.05);

  /* ═════════════════════════════════
     عامل 8: التقييم الأساسي /5
     P/E قطاعي + EY vs WACC
  ═════════════════════════════════ */
  const secPE=(RADAR_SECTOR_PE as any)[stk.sec]||15.5,peR=stk.pe/secPE;
  const ey=stk.pb>0?stk.roe/stk.pb:stk.roe;
  const vwapD2=vwap>0?(p-vwap)/vwap*100:0;
  const vaScore=Math.min(5,
    (peR<0.75?2:peR<0.90?1:0)+
    (ey>0.10?2:ey>0.08?1:0)+
    (vwapD2<-2?1:0));

  /* ═════════════════════════════════
     عامل 9: الاقتصاد الكلي /5
  ═════════════════════════════════ */
  const mcScore=Math.min(5,Math.round(mc.score*5/20));

  /* ─── المجموع الكلي ─── */
  const total=Math.min(100,Math.max(5,
    msScore+obScore+lsScore+viScore+trScore+moScore+lqScore+vaScore+mcScore));
  const scoreCol=total>=85?G:total>=70?BLUE:total>=55?GOLD:R;

  /* ─── التصنيفات ─── */
  const cats=[];
  if(ms.bosBull)       cats.push({l:"BOS صاعد",    c:G});
  if(ob.inBullOB)      cats.push({l:"Order Block",  c:CYAN});
  if(ls.recoveredSSL)  cats.push({l:"SSL انتعاش",   c:LIME});
  if(vi.belowB1&&vi.aboveAVWAP)
 cats.push({l:"VWAP فرصة", c:BLUE});
  if(smDetected)       cats.push({l:"سيولة مؤسسية",c:PU});
  if(oversold)         cats.push({l:"تشبع بيع",     c:GOLD});
  if(ms.choch&&ms.bosBull) cats.push({l:"CHOCH↑",  c:ORANGE});
  if((macd as any).bull&&!overbought)cats.push({l:"MACD↑",   c:G});
  if(!cats.length)     cats.push({l:"مراقبة",       c:T2});

  /* ─── الهدف والإيقاف بـ ATR ─── */
const target=+(p+RISK.ATR_TARGET_MULT*atr).toFixed(2);
const stop  =+(p-RISK.ATR_STOP_MULT*atr).toFixed(2);

  return{
    stk,total,scoreCol,cats,
    target,stop,atrPct:+atrPct.toFixed(2),
ms,ob,ls,vi,vwapDev,vwapD:vwapDev,mc,
    trend:{bull:trendBull,maCount,adxP:+adxP.toFixed(0),score:trScore},
    mom:{rsi,macd:(macd as any).bull,stoch,oversold,overbought,score:moScore},
    liq:{obv:(obv as any).signal,cmf:+cmf.toFixed(3),rvNorm:+rvNorm.toFixed(2),smDetected,score:lqScore},
    val:{peR:+peR.toFixed(2),ey:+(ey*100).toFixed(1),vwapD:+vwapD2.toFixed(1),score:vaScore},
    pfl:+pfl.toFixed(0),
    factors:[
      {k:"ms",  l:"هيكل السوق",   max:15,s:msScore, c:LIME},
      {k:"ob",  l:"Order Blocks", max:15,s:obScore,  c:CYAN},
      {k:"ls",  l:"Liquidity",    max:10,s:lsScore,  c:ORANGE},
      {k:"vi",  l:"VWAP مؤسسي",  max:10,s:viScore,  c:BLUE},
      {k:"tr",  l:"الاتجاه",      max:15,s:trScore,  c:BLUE},
      {k:"mo",  l:"الزخم",        max:15,s:moScore,  c:G},
      {k:"lq",  l:"السيولة",      max:10,s:lqScore,  c:PU},
      {k:"va",  l:"التقييم",      max:5, s:vaScore,  c:"#34d399"},
      {k:"mc",  l:"الاقتصاد كلي", max:5, s:mcScore,  c:GOLD},
    ],
  };
}


/**
 * ✨ Layer 2 -- الجهد/النتيجة + OBV (Effort vs Result)
 * مستقلة تماماً عن باقي الطبقات -- لا تعتمد على L1 أو أي طبقة أخرى
 * 
 * @param last10 - آخر 10 شموع
 * @param avgVol - متوسط الحجم لكل الشموع
 * @param obv - نتيجة calcOBV (تحتوي .rising)
 * @param radarMO - درجة الزخم من رادار الفرص (0-15)
 * @returns L2 score (0-100)
 */
function calculateLayer2(last10: Bar[], avgVol: number, obv: any, radarMO: number): { L2: number; harm: number; div: number } {
  let harm = 0, div = 0;
  last10.forEach(b => {
    const er = b.vol / avgVol, mv = Math.abs(b.pct);
    if (er > 1.3 && mv > 0.5) harm++;
    else if (er > 1.4 && mv < 0.2) div++;
  });
  const obvBonus = obv.rising ? 10 : -5;
  const radarL2Bonus = Math.round((radarMO / 15) * 20 - 10);
  const L2 = Math.round(Math.min(100, Math.max(0, 50 + harm * 9 - div * 12 + obvBonus + radarL2Bonus * 0.25)));
  return { L2, harm, div };
}

/**
 * ✨ Layer 3 -- Shannon Entropy مُعزَّز بوزن الحجم والتحيّز الزمني
 * مستقلة تماماً -- لا تعتمد على أي طبقة أخرى محسوبة
 * 
 * @param last20 - آخر 20 شمعة
 * @param last5 - آخر 5 شموع
 * @param avgVol - متوسط الحجم لكل الشموع
 * @returns L3 score (0-100) + entr (قيمة entropy الخام، تُستخدم لاحقاً في extras)
 */
function calculateLayer3(last20: Bar[], last5: Bar[], avgVol: number): { L3: number; entr: number } {
  const last20pcts = last20.slice(1).map((b, i, arr) => {
    const dir = b.c - last20[i].c > 0 ? 1 : -1;
    const recencyW = 1 + i / arr.length;
    return dir * Math.abs(b.pct) * recencyW * (b.vol / avgVol);
  });
  const totalAbsMag = last20pcts.reduce((s, p) => s + Math.abs(p), 0) || 1;
  const pUpW = last20pcts.filter(p => p > 0).reduce((s, p) => s + p, 0) / totalAbsMag;
  const pDnW = Math.max(0.001, 1 - Math.max(0.001, pUpW));
  const pUpC = Math.max(0.001, pUpW);
  const entr = -(pUpC * Math.log2(pUpC) + pDnW * Math.log2(pDnW));
  const dirSign = pUpW > 0.5 ? 1 : -1;
  const recentConsist = last5.every(b => b.pct > 0) ? 8 : last5.every(b => b.pct < 0) ? -8 : 0;
  const L3 = Math.round(Math.min(100, Math.max(0, 50 + dirSign * (1 - entr) * 65 + recentConsist)));
  return { L3, entr };
}

/**
 * ✨ Layer 1 -- وايكوف محسّن + هيكل السوق + OB + Pattern Recognition
 * ⚠️ الأكثر تعقيداً بين الطبقات -- ترجع L1 + 5 مخرجات جانبية
 * (spring, sos, upth, wyPhase, patternBonus) تُستخدم لاحقاً في extras
 *
 * @param bars - كل الشموع
 * @param last5 - آخر 5 شموع
 * @param last10 - آخر 10 شموع
 * @param last20 - آخر 20 شمعة
 * @param avgVol - متوسط الحجم
 * @param ms - نتيجة calcMarketStructure
 * @param ob - نتيجة calcOrderBlocks
 * @param ls - نتيجة calcLiqSweep
 * @param adxV - قيمة ADX
 * @param adxBull - هل ADX صاعد
 * @param radarMS - درجة هيكل السوق من الرادار (0-15)
 * @param radarOB - درجة Order Blocks من الرادار (0-15)
 * @param radarLS - درجة Liquidity Sweeps من الرادار (0-10)
 */
function calculateLayer1(
  bars: Bar[], last5: Bar[], last10: Bar[], last20: Bar[], avgVol: number,
  ms: any, ob: any, ls: any, adxV: number, adxBull: boolean,
  radarMS: number, radarOB: number, radarLS: number
): { L1: number; spring: boolean; sos: boolean; upth: boolean; wyPhase: string; patternBonus: number } {
  const upBars = last10.filter(b => b.pct > 0);
  const dnBars = last10.filter(b => b.pct <= 0);
  const avgUpV = upBars.length ? upBars.reduce((s, b) => s + b.vol, 0) / upBars.length : 0;
  const avgDnV = dnBars.length ? dnBars.reduce((s, b) => s + b.vol, 0) / dnBars.length : 1;
  const recentLow = Math.min(...last10.map(b => b.lo));
  const recentHigh = Math.max(...last10.map(b => b.hi));
  const range60Low = bars.length >= 60 ? Math.min(...bars.slice(-60).map(b => b.lo)) : recentLow;
  const range60High = bars.length >= 60 ? Math.max(...bars.slice(-60).map(b => b.hi)) : recentHigh;

  const spring = last5.some(b => b.lo <= recentLow * 1.005 && b.c > b.o && b.vol > avgVol * 1.2);
  const sos = last5.filter(b => b.pct > 0.8 && b.vol > avgVol * 1.4).length >= 2;
  const upth = last5.filter(b => {
    const isBreak = b.hi > Math.max(...last20.slice(0, -5).map(x => x.hi)) * 0.99;
    return isBreak && b.c < b.o && b.c < (b.hi + b.lo) / 2;
  }).length >= 1;
  const accumBars = last10.filter(b => b.vol > avgVol * 1.1 && Math.abs(b.pct) < 0.3).length;

  const pricePos60 = (bars[bars.length - 1].c - range60Low) / (range60High - range60Low + 0.001);
  const volTrend = bars.length >= 20
    ? bars.slice(-5).reduce((s, b) => s + b.vol, 0) / 5 / (bars.slice(-20, -5).reduce((s, b) => s + b.vol, 0) / 15)
    : 1;

  let wyBase = Math.round(50 + 40 * Math.tanh((pricePos60 - 0.5) * 3));
  let wyAdj = (spring && sos) ? +20 : sos ? +12 : spring ? +10 : 0;
  wyAdj += upth && pricePos60 > 0.75 ? -25 : 0;
  wyAdj += accumBars >= 3 && pricePos60 < 0.35 && volTrend < 0.9 ? +10 : 0;
  wyAdj += avgUpV > avgDnV * 1.3 ? +8 : avgDnV > avgUpV * 1.3 ? -8 : 0;
  wyAdj += volTrend > 1.2 ? +5 : volTrend < 0.8 ? -5 : 0;
  const wyScore = Math.min(95, Math.max(10, wyBase + wyAdj));
  const wyPhase = wyScore >= 82 ? "تراكم نشط" : wyScore >= 70 ? "ارتفاع قوي" : wyScore >= 55 ? "صاعد" : wyScore >= 45 ? "محايد" : wyScore >= 32 ? "هابط" : "توزيع محتمل";

  let patternBonus = 0;
  if (bars.length >= 3) {
    const c0 = bars[bars.length - 1];
    const c1 = bars[bars.length - 2];
    const c2 = bars[bars.length - 3];
    const body0 = Math.abs(c0.c - c0.o);
    const body1 = Math.abs(c1.c - c1.o);
    const range0 = c0.hi - c0.lo || 0.001;

    const isHammer = c0.lo < c1.lo && body0 < range0 * 0.3 && (c0.c - c0.lo) > range0 * 0.6;
    const isBullEngulf = c0.c > c0.o && c1.c < c1.o && c0.c > c1.o && c0.o < c1.c;
    const isBearEngulf = c0.c < c0.o && c1.c > c1.o && c0.c < c1.o && c0.o > c1.c;
    const isDoji = body0 < range0 * 0.1;
    const is3WS = c0.c > c0.o && c1.c > c1.o && c2.c > c2.o && c0.c > c1.c && c1.c > c2.c;
    const isMorningStar = c2.c < c2.o && isDoji && c0.c > c0.o && c0.c > (c2.o + c2.c) / 2;

    if (isHammer) patternBonus += 8;
    if (isBullEngulf) patternBonus += 10;
    if (isBearEngulf) patternBonus -= 10;
    if (is3WS) patternBonus += 12;
    if (isMorningStar) patternBonus += 10;
    if (isDoji && pricePos60 > 0.7) patternBonus -= 5;

    const ma20 = bars.slice(-20).reduce((s, b) => s + b.c, 0) / 20;
    const devFromMa = (c0.c - ma20) / ma20 * 100;
    if (devFromMa < -8 && volTrend > 1.2) patternBonus += 8;
    if (devFromMa > 10) patternBonus -= 5;

    if (c0.pct > 0.5 && c0.vol < avgVol * 0.7) patternBonus -= 6;
    if (c0.pct < -0.5 && c0.vol < avgVol * 0.7) patternBonus += 4;
  }
  patternBonus = Math.min(20, Math.max(-20, patternBonus));

  const msBonus = ms.bos && ms.bosBull ? 15 : ms.trend === "صاعد" ? 10 : ms.trend === "صاعد محايد" ? 5 : 0;
  const obBonus = ob.inRef ? 15 : ob.inBullOB ? 10 : ob.bullCount > 0 ? 5 : 0;
  const sslBonus = ls.recoveredSSL && ls.sslQuality >= 2 ? 10 : ls.recoveredSSL ? 6 : 0;

  const pivot5High = Math.max(...last5.map(b => b.hi));
  const pivot5Low = Math.min(...last5.map(b => b.lo));
  const curClose = bars[bars.length - 1].c;
  const abovePivot = curClose > (pivot5High + pivot5Low) / 2;
  const pivotBonus = abovePivot ? 4 : -4;

  const adxBonus = adxV > 35 && adxBull ? 6 : adxV > 25 && adxBull ? 3
    : adxV > 35 && !adxBull ? -6 : adxV > 25 && !adxBull ? -3 : 0;

  const radarL1Bonus = Math.round(
    (radarMS / 15) * 8 + (radarOB / 15) * 6 + (radarLS / 10) * 4
  );
  const L1 = Math.min(85, Math.max(0, Math.round(
    wyScore * 0.38 + msBonus * (25 / 15) + obBonus * (20 / 15) + sslBonus + patternBonus
    + pivotBonus + adxBonus
    + radarL1Bonus * 0.3
  )));

  return { L1, spring, sos, upth, wyPhase, patternBonus };
}

/**
 * ✨ Layer 4 -- القوة النسبية + VWAP المؤسسي + Sector Momentum
 * ⚠️ ترجع L4 + mktWtd (مُستخدمة لاحقاً في detectMarketRegime وفي extras.mktMomentum)
 *
 * @param stk - بيانات السهم
 * @param vi - نتيجة calcIVWAP
 * @param tc_tasi - نتيجة calcTasiContext
 * @param radarVI - درجة VWAP المؤسسي من الرادار (0-10)
 */
function calculateLayer4(stk: Stock, vi: any, tc_tasi: any, radarVI: number): { L4: number; mktWtd: number; rscRaw: number } {

  const mktWtd = STOCKS.reduce((s, x) => s + x.ch * ((x as any).mktCap || 50), 0) /
                 STOCKS.reduce((s, x) => s + ((x as any).mktCap || 50), 0);
  const rscRaw = stk.ch - mktWtd;
  const mktVar = STOCKS.reduce((s, x) => s + Math.pow(x.ch - mktWtd, 2), 0) / STOCKS.length;
  const rscZ = mktVar > 0 ? rscRaw / Math.sqrt(mktVar) : 0;
  const rscScore = Math.round(Math.min(100, Math.max(0, 50 + rscZ * 18)));
  const vwapScore = Math.round(vi.score / 20 * 100);

  const sectorPeers = STOCKS.filter(function (x) { return x.sec === stk.sec && x.sym !== stk.sym; });
  const sectorAvgCh = sectorPeers.length > 0
    ? sectorPeers.reduce(function (s, x) { return s + x.ch; }, 0) / sectorPeers.length
    : mktWtd;
  const sectorRel = stk.ch - sectorAvgCh;
  let oilWarBonus = 0;
  if (MACRO.oilWarPremium) {
    const oilImpact = stk.oilCorr || (OIL_SENS as any)[stk.sec] || 0.5;
    const oilDeltaL4 = (MACRO.oilPrice - MACRO.oilTarget) / MACRO.oilTarget;
    oilWarBonus = Math.round(oilImpact * oilDeltaL4 * 18);
    oilWarBonus = Math.max(-10, Math.min(18, oilWarBonus));
  }
  const sectorScore = Math.round(Math.min(100, Math.max(0, 50 + sectorRel * 8 + oilWarBonus)));

  const pifL4Bonus = tc_tasi.pifBoost;
  const _L4raw = Math.round(_clamp(rscScore * 0.50 + vwapScore * 0.30 + sectorScore * 0.20 + pifL4Bonus, 0, 100));

  const L4 = Math.min(100, Math.max(0, _L4raw + Math.round((radarVI / 10 * 100 - 50) * 0.2)));

  return { L4, mktWtd, rscRaw };
}

/**
 * ✨ Layer 5 -- التقاطع: RSI + MACD + ADX (مستمر وليس متقطع)
 * ⚠️ ترجع L5 + triOk (مؤكد استخدامها في extras) + باقي المتغيرات
 * احتياطاً (rsiScore, macdScore, adxScore, stochV, smaBonus, stochBonus)
 *
 * @param bars - كل الشموع
 * @param rBars - الشموع بصيغة dual-format
 * @param rsiV - قيمة RSI
 * @param macdH - قيمة MACD histogram
 * @param macdBull - هل MACD صاعد
 * @param adxV - قيمة ADX
 * @param adxBull - هل ADX صاعد
 * @param stk - بيانات السهم
 * @param radarTR - درجة الترند من الرادار (0-15)
 */
function calculateLayer5(
  bars: Bar[], rBars: Bar[], rsiV: number, macdH: number, macdBull: boolean,
  adxV: number, adxBull: boolean, stk: Stock, radarTR: number
): {

  L5: number; triOk: number; rsiScore: number; macdScore: number;
  adxScore: number; stochV: number; smaBonus: number; stochBonus: number;
} {
  const rsiOvSoldThr = bars.length >= 20 ? (function () {
    const gains = bars.slice(-30).map(function (b) { return b.pct > 0 ? b.pct : 0; });
    const avgG = gains.reduce(function (s, v) { return s + v; }, 0) / gains.length || 0.5;
    return Math.max(20, Math.min(35, 30 - avgG * 2));
  })() : 30;
  const rsiOvBghtThr = Math.max(68, Math.min(82, 75 + (rsiOvSoldThr - 30) * 0.5));
  let rsiScore;
  if (rsiV < rsiOvSoldThr) { rsiScore = Math.round(68 - (rsiOvSoldThr - rsiV) * 0.35); }
  else if (rsiV <= 50) { rsiScore = Math.round(67 - (rsiV - rsiOvSoldThr) * 0.85 * (17 / Math.max(1, 50 - rsiOvSoldThr))); }
  else if (rsiV <= rsiOvBghtThr) { rsiScore = Math.round(50 + (rsiV - 50) * 1.35 * (35 / Math.max(1, rsiOvBghtThr - 50))); }
  else { rsiScore = Math.round(85 - (rsiV - rsiOvBghtThr) * 1.50); }
  rsiScore = Math.min(90, Math.max(10, rsiScore));

  const macdMag = Math.abs(macdH) / (bars[bars.length - 1].c * 0.001 + 0.001);
  const macdScore = macdBull
    ? Math.round(Math.min(90, 52 + 38 * Math.tanh(macdMag / 3)))
    : Math.round(Math.max(12, 48 - 36 * Math.tanh(macdMag / 3)));

  const adxStr = adxV;
  const adxScore = adxV > 25
    ? (adxBull ? Math.round(50 + adxStr * 0.40) : Math.round(50 - adxStr * 0.35))
    : Math.round(50 - (25 - adxV) * 1.2);

  const triOk = [rsiV > 52, macdBull, adxV > 25 && adxBull].filter(Boolean).length;
  const _L5raw = Math.round(
    Math.min(100, Math.max(0,
      rsiScore * 0.40 + macdScore * 0.35 + adxScore * 0.25
    ))
  );
  const stochV = calcStoch(rBars, 14);
  const sma20v = calcSMA(rBars, 20), sma50v = calcSMA(rBars, 50);
  const smaBonus = (stk.p > sma20v && stk.p > sma50v) ? 4 : (stk.p > sma20v || stk.p > sma50v) ? 2 : -2;
  const stochBonus = stochV < 20 ? 5 : stochV < 35 ? 3 : stochV > 80 ? -5 : stochV > 65 ? -2 : 0;
  const L5 = Math.min(100, Math.max(0, _L5raw + Math.round((radarTR / 15 * 100 - 50) * 0.2) + smaBonus + stochBonus));

  return { L5, triOk, rsiScore, macdScore, adxScore, stochV, smaBonus, stochBonus };
}

/**
 * ✨ Layer 6 -- Kelly مُعزَّز بـ Adaptive Win Rate + Macro
 * ⚠️ ترجع L6 + kelly (مؤكد استخدامها في extras.kelly)
 *
 * @param bars - كل الشموع
 * @param vr - نسبة الحجم الحالي لمتوسطه
 * @param mc - نتيجة calcMacroFull (تحتوي .score)
 * @param stk - بيانات السهم
 * @param radarVA - درجة التقييم من الرادار (0-10)
 */
function calculateLayer6(
  bars: Bar[], vr: number, mc: any, stk: Stock, radarVA: number
): { L6: number; kelly: number; p_adj: number } {

  const kellyBars = bars.slice(-Math.min(bars.length, 100));
  const recent20 = kellyBars.slice(-20);
  const older80 = kellyBars.slice(0, -20);
  const wrRecent = recent20.filter(b => b.pct > 0).length / Math.max(recent20.length, 1);
  const wrOlder = older80.length > 0 ? older80.filter(b => b.pct > 0).length / older80.length : wrRecent;
  const histWinRate = wrRecent * 0.65 + wrOlder * 0.35;

  const sectorWinAdj = ({ "الطاقة": 0.02, "البنوك": 0.01, "التطبيقات وخدمات التقنية": 0.03, "المواد الأساسية": -0.01, "إنتاج الأغذية": 0.02 } as any)[stk.sec] || 0;

  const volSignal = vr > 1.3 ? 0.10 : vr > 1.0 ? 0.05 : vr < 0.7 ? -0.05 : 0;
  const macroSignal = mc.score > 14 ? 0.08 : mc.score > 8 ? 0.04 : mc.score < 4 ? -0.05 : 0;
  const oilWinAdj = (stk.oilCorr || 0) * ((MACRO.oilPrice - MACRO.oilTarget) / MACRO.oilTarget) * 0.05;
  const p_adj = Math.min(0.85, Math.max(0.15, histWinRate + sectorWinAdj + volSignal + macroSignal + oilWinAdj));
  const wins_b = kellyBars.filter(b => b.pct > 0);
  const losses_b = kellyBars.filter(b => b.pct <= 0);
  const aW = wins_b.length ? wins_b.reduce((s, b) => s + b.pct, 0) / wins_b.length : 0.5;
  const aL = losses_b.length ? Math.abs(losses_b.reduce((s, b) => s + b.pct, 0) / losses_b.length) : 0.5;
  const b_ratio = aL > 0 ? aW / aL : 1;
  const kelly = Math.max(0, p_adj - (1 - p_adj) / b_ratio);
  const kellyScore = Math.round(Math.min(100, kelly * 200));
  const macroBonus = Math.round(mc.score / 20 * 5);
  const _L6raw = Math.min(100, Math.round(kellyScore * 0.92 + macroBonus));
  const L6 = Math.min(100, Math.max(0, _L6raw + Math.round((radarVA / 5 * 100 - 50) * 0.25)));

  return { L6, kelly, p_adj };
}

/**
 * ✨ Layer 7 -- البايزي الحقيقي (Prior/Likelihood/Posterior)
 * ⚠️ تعتمد على L1, L4, L5 (يجب حسابها قبل استدعاء هذه الدالة)
 * ترجع L7 + bayesMult (مضاعف خارجي، مؤكد استخدامه) + متغيرات احتياطية
 *
 * @param L1, L4, L5 - نتائج الطبقات السابقة
 * @param last10, last5 - آخر الشموع
 * @param avgVol - متوسط الحجم
 * @param bars - كل الشموع
 * @param cmf - قيمة CMF
 * @param obv - نتيجة calcOBV
 * @param radarMC - درجة الاقتصاد الكلي من الرادار (0-5)
 */
function calculateLayer7(
  L1: number, L4: number, L5: number,
  last10: Bar[], last5: Bar[], avgVol: number, bars: Bar[], cmf: number, obv: any, radarMC: number
): {
  L7: number; bayesMult: number; prior: number; likel: number; post: number;
  consistency: number;
} {
  const _consMean = (L1 + L4 + L5) / 3;
  const _consStd = Math.sqrt(
    ((L1 - _consMean) ** 2 + (L4 - _consMean) ** 2 + (L5 - _consMean) ** 2) / 3
  );
  const _consistency = Math.max(0, 1 - _consStd / 40);
  const _consDir = _consMean >= 50 ? 1 : 0.55;
  const priorRaw = 0.30 + _consistency * 0.45 * _consDir;
  const prior = Math.min(0.75, Math.max(0.08, priorRaw));

  const veL = last10.filter(b => b.vol > avgVol * 1.3).length / 10;
  const volPersist = bars.length >= 10 ? (function () {
    const hv = bars.slice(-10).filter(function (b) { return b.vol > avgVol * 1.1; });
    let cc = 0, mx = 0;
    bars.slice(-10).forEach(function (b) { if (b.vol > avgVol * 1.0) { cc++; mx = Math.max(mx, cc); } else cc = 0; });
    return Math.min(1.0, mx / 5 + hv.length / 20);
  })() : 0.5;
  const cmfFactor = cmf > 0.15 ? 0.92 : cmf > 0.05 ? 0.78 : cmf > 0 ? 0.62 : cmf > -0.1 ? 0.42 : 0.22;
  const volDir = last5.filter(b => b.vol > avgVol * 1.2 && b.pct > 0).length -
                 last5.filter(b => b.vol > avgVol * 1.2 && b.pct < 0).length;
  const volDirFactor = volDir > 0 ? 0.85 : volDir < 0 ? 0.35 : 0.60;
  const obvFactor = obv.rising && obv.obvZ > 0.5 ? 0.88 : obv.rising ? 0.75 : obv.obvZ > 0 ? 0.55 : 0.28;
  const priceMom10 = bars.length >= 10
    ? (bars[bars.length - 1].c - bars[bars.length - 10].c) / bars[bars.length - 10].c
    : 0;
  const priceMomFactor = priceMom10 > 0.03 ? 0.85 : priceMom10 > 0 ? 0.65 : priceMom10 > -0.03 ? 0.40 : 0.20;
  const likel = Math.min(0.92, Math.max(0.08,
    veL * 0.08 + volPersist * 0.22 + cmfFactor * 0.22 + volDirFactor * 0.14 +
    obvFactor * 0.22 + priceMomFactor * 0.12
  ));

  const post = (prior * likel) / (prior * likel + (1 - prior) * (1 - likel));

  const _L7bayesRaw = Math.round(post * 100);
  const L7 = Math.min(100, Math.max(0, _L7bayesRaw + Math.round((radarMC / 5 * 100 - 50) * 0.25)));
  const bayesMult = Math.min(1.07, Math.max(0.93, 0.93 + post * 0.14));

  return { L7, bayesMult, prior, likel, post, consistency: _consistency };
}

/**
 * ✨ Layer 8 -- رادار مستقل: تقييم جوهري + Macro
 * ⚠️ ترجع L8 + pricePos + valScore (مؤكد استخدامهما في extras
 * بناءً على ما لاحظناه سابقاً بجانب p_adj)
 *
 * @param stk - بيانات السهم
 * @param radarLQ - درجة السيولة الذكية من الرادار (0-10)
 */
function calculateLayer8(
  stk: Stock, radarLQ: number
): { L8: number; pricePos: number; valScore: number } {
  const w52h = stk.w52h || stk.hi;
  const w52l = stk.w52l || stk.lo;
  const pricePos = w52h > w52l ? Math.round((stk.p - w52l) / (w52h - w52l) * 100) : 50;
  const pbRatio = stk.bookValue && stk.bookValue > 0 ? stk.p / stk.bookValue : 2.0;
  const valScore = Math.round(Math.min(90, Math.max(10,
    50 - 28 * Math.tanh((stk.pe - 18) / 15) - 10 * Math.tanh((pbRatio - 2) / 2)
  )));
  const oilSensW = (stk.oilCorr || 0) > 0.5 ? 0.12 : 0.10;
  const _L8raw = Math.round(
    (valScore / 100) * 45 +
    (stk.rating / 100) * 30 +
    ((100 - pricePos) / 100) * 15 +
    (oilSensW * MACRO.oilPrice / 100) * 10
  );

  const L8 = Math.min(100, Math.max(0, _L8raw + Math.round((radarLQ / 10 * 100 - 50) * 0.2)));

  return { L8, pricePos, valScore };
}

/**
 * ✨ Layer 9 -- السيولة الذكية المُعزَّزة (CMF+OBV+Volume+Direction+VWAP Dev)
 * ⚠️ ترجع L9 + smartMoney (مؤكد استخدامها في extras.liqSM)
 *
 * @param cmf - قيمة CMF
 * @param bars - كل الشموع
 * @param obv - نتيجة calcOBV
 * @param vr - نسبة الحجم الحالي لمتوسطه
 * @param stk - بيانات السهم
 * @param vi - نتيجة calcIVWAP (تحتوي .vwapDev)
 */
function calculateLayer9(
  cmf: number, bars: Bar[], obv: any, vr: number, stk: Stock, vi: any
): { L9: number; smartMoney: number } {

  const cmfScore = Math.round(50 + 45 * Math.tanh(cmf * 8));

  const obvMoment = bars.length >= 10
    ? (bars[bars.length - 1].c - bars[bars.length - 10].c) / bars[bars.length - 10].c
    : 0;
  const obvArr = (function () {
    let o = 0; const arr = [0];
    for (let i = 1; i < bars.length; i++) {
      if (bars[i].c > bars[i - 1].c) o += bars[i].vol;
      else if (bars[i].c < bars[i - 1].c) o -= bars[i].vol;
      arr.push(o);
    }
    return arr;
  })();
  const obvSlope5 = obvArr.length >= 5
    ? (obvArr[obvArr.length - 1] - obvArr[obvArr.length - 5]) / (Math.abs(obvArr[obvArr.length - 5]) || 1)
    : 0;
  const obvScore = Math.round(50 + 40 * Math.tanh(
    (obv.rising ? 1 : -1) * (0.4 + Math.abs(obvMoment) * 4 + Math.abs(obvSlope5) * 2)
  ));

  const volScore = Math.round(50 + 40 * Math.tanh((vr - 1) * 1.8));

  const ret5dir = bars.length >= 5
    ? bars.slice(-5).reduce((s, b) => s + b.pct, 0) / 5
    : stk.ch;
  const dirScore = Math.round(50 + 35 * Math.tanh(ret5dir * 0.6));

  const vwapDevScore = Math.round(50 - 25 * Math.tanh((vi.vwapDev || 0) * 0.8));

  const smartMoney = Math.round(
    cmfScore * 0.26 + obvScore * 0.24 + volScore * 0.22 + dirScore * 0.16 + vwapDevScore * 0.12
  );
  const L9 = Math.min(100, Math.max(0, smartMoney));

  return { L9, smartMoney };
}

/**
 * ✨ Layer 10 -- كفاءة السيولة (Liquidity Efficiency / Amihud Illiquidity)
 * مستقلة تماماً -- تعتمد فقط على bars، لا تحتاج أي طبقة سابقة
 *
 * @param bars - كل الشموع
 */
function calculateLayer10(bars: Bar[]): number {
  const _l10win = bars.slice(-20);
  let L10 = 50;
  if (_l10win.length >= 10) {
    const _amihud: number[] = [];
    for (const _b of _l10win) {
      const _volM = (_b.vol || 0) / 1e6;
      const _ret = Math.abs(_b.pct || 0) / 100;
      if (_volM > 0) _amihud.push(_ret / _volM);
    }
    if (_amihud.length >= 5) {
      _amihud.sort((a, b) => a - b);
      const _mid = Math.floor(_amihud.length / 2);
      const _medianIlliq = _amihud.length % 2
        ? _amihud[_mid]
        : (_amihud[_mid - 1] + _amihud[_mid]) / 2;
      const _logIlliq = Math.log10(Math.max(_medianIlliq, 1e-6));
      // ✨ معايرة لتاسي: المركز عند أميهود ≈ 0.015 (سهم بحجم مليون وتغيّر 1.5%)
      //    المعايرة القديمة (-2.7) كانت تفترض سيولة أعمق بـ7 أضعاف فتُنتج درجات متدنية للجميع
      L10 = Math.round(_clamp(50 - (_logIlliq + 1.82) * 22, 0, 100));
    }
  }
  return L10;
}

// ════════════════════════════════════════════════════════════
//  ✨ L11 -- عوامل الأداء المُثبتة أكاديمياً
//  ① الزخم 12 شهراً بتخطّي الشهر الأخير -- Jegadeesh & Titman (1993)
//     تأكيد عبر 8 أسواق: Asness, Moskowitz & Pedersen (2013)
//  ② الجودة/الربحية -- Novy-Marx (2013), Asness et al. (2019) QMJ
//  ③ تدنّي التقلّب -- Frazzini & Pedersen (2014) BAB
// ════════════════════════════════════════════════════════════
function calcFactorLayer11(stk: any, bars: any[]): any {
  const n = bars ? bars.length : 0;
  const parts: string[] = [];

  // ① الزخم 12-1
  let momScore = 50;
  if (n >= 252) {
    const p_now = bars[n - 22].c;
    const p_12m = bars[n - 252].c;
    if (p_12m > 0) {
      const mom = (p_now - p_12m) / p_12m;
      momScore = Math.round(50 + 45 * Math.tanh(mom * 2.2));
      parts.push('زخم 12ش: ' + (mom * 100).toFixed(0) + '%');
    }
  } else if (n >= 120) {
    const p_now = bars[n - 22].c, p_6m = bars[n - 120].c;
    if (p_6m > 0) {
      const mom = (p_now - p_6m) / p_6m;
      momScore = Math.round(50 + 40 * Math.tanh(mom * 2.8));
      parts.push('زخم 6ش (بديل)');
    }
  }

  // ② الجودة
  let qualScore = 50;
  let qualAvail = false;
  if (stk.roe != null) {
    qualAvail = true;
    const roeAnn = stk.roe * 4;
    let q = 50 + 35 * Math.tanh((roeAnn - 12) / 10);
    if (stk.netMargin != null) q += 12 * Math.tanh((stk.netMargin - 15) / 20);
    if (stk.debt != null) q -= 15 * Math.tanh((stk.debt - 0.5) / 0.3);
    qualScore = Math.round(Math.max(5, Math.min(95, q)));
    parts.push('جودة: roe ' + roeAnn.toFixed(1) + '%');
  }

  // ③ تدنّي التقلّب
  let volScore = 50;
  if (n >= 60) {
    const rets: number[] = [];
    for (let i = n - 60; i < n; i++) {
      if (bars[i - 1] && bars[i - 1].c > 0) rets.push((bars[i].c - bars[i - 1].c) / bars[i - 1].c);
    }
    if (rets.length > 30) {
      const m = rets.reduce((s, r) => s + r, 0) / rets.length;
      const sd = Math.sqrt(rets.reduce((s, r) => s + (r - m) ** 2, 0) / rets.length);
      const annVol = sd * Math.sqrt(252) * 100;
      volScore = Math.round(Math.max(10, Math.min(90, 50 - 35 * Math.tanh((annVol - 22) / 12))));
      parts.push('تذبذب: ' + annVol.toFixed(0) + '%');
    }
  }

  const L11 = qualAvail
    ? Math.round(momScore * 0.40 + qualScore * 0.35 + volScore * 0.25)
    : Math.round(momScore * 0.62 + volScore * 0.38);

  return {
    L11: Math.max(0, Math.min(100, L11)),
    momScore, qualScore, volScore, qualAvail,
    detail: parts.join(' · '),
  };
}

function calc9Layers(stk: Stock, bars: Bar[]): any {
  // ✨ Validation - حماية من Edge Cases
  if (!stk || typeof stk !== 'object') {
    return _emptyHealthResult();
  }
  // ✨ الحد رُفع من 5 إلى 15 -- لأن analyzeStockRadar بالأسفل تتطلب
  // pastBars.length>=15 وإلا تُولّد 60 شمعة عشوائية (generateBarsRadar) بصمت،
  // فتُلوّث L1/L2/L4/L5/L6/L7/L8 ببيانات صناعية رغم أن bars الأصلية حقيقية.
  // رفع الحد هنا يضمن: إما بيانات حقيقية كافية لكل الطبقات، أو نتيجة محايدة صريحة.
  if (!bars || !Array.isArray(bars) || bars.length < 15) {
    return _emptyHealthResult();
  }

  
  const last5  = bars.slice(-5);
  const last10 = bars.slice(-10);
  const last20 = bars.slice(-20);
  const last14 = bars.slice(-14);


   // ✨ تحويل bars - يدعم both formats (b.c لـ technicalEngine + b.close للقديمة)
const rBars = bars.map(function(b){
    return {
      o: b.o || b.c,        // open
      open: b.o || b.c,     // open (للقديمة)
      hi: b.hi,             // high
      high: b.hi,           // high (للقديمة)
      lo: b.lo,             // low
      low: b.lo,            // low (للقديمة)
      c: b.c,               // close (للجديدة)
      close: b.c,           // close (للقديمة)
      vol: b.vol,
      pct: b.pct
    };
  });

  const avgVol = bars.reduce((s,b)=>s+b.vol,0)/bars.length; 
  const vol5   = last5.reduce((s,b)=>s+b.vol,0)/5;
  const vr     = vol5/avgVol;

    // ── محركات الرادار المدمجة (✨ من technicalEngine - الصحيحة رياضياً) ──
  const atr  = calcATR(rBars, 14) || stk.p * 0.015;
  const rsiV = calcRSI(rBars, 14);
  const cmf  = calcCMF(rBars, 20);              // period ديناميكي من volatility
  const obv  = calcOBV(rBars);
  const ms   = calcMarketStructure(rBars);
const ob   = calcOrderBlocks(rBars, atr);
const ls   = calcLiqSweep(rBars, atr);
  const vi   = calcIVWAP(rBars,stk);

  // ✨ vwapDev: انحراف السعر الحالي عن VWAP الفصلي بوحدات الانحراف المعياري
  // (كانت موجودة بالنسخة المحلية القديمة من calcIVWAP، أُعيد حسابها هنا
  // بعد توحيد المصدر على technicalEngine.ts التي لا ترجع هذا الحقل)
  const vwapDev = (function () {
    let sumVV = 0, sumV = 0;
    for (const b of rBars) {
      const tp = (b.hi + b.lo + b.c) / 3;
      sumVV += b.vol * (tp - vi.vwQ) ** 2;
      sumV += b.vol;
    }
    const std = sumV > 0 ? Math.sqrt(sumVV / sumV) : 0;
    const cur = rBars[rBars.length - 1].c;
    return std > 0 ? +((cur - vi.vwQ) / std).toFixed(2) : 0;
  })();

  const mc   = calcMacroFull(stk);
  const tc_tasi = calcTasiContext(stk, bars, STOCKS);

  // ✨ L11 -- عوامل الأداء المُثبتة (زخم 12ش · جودة · تدنّي تقلّب)
  const f11 = calcFactorLayer11(stk, rBars);
  const L11 = f11.L11;

  // ── رادار الفرص (SMC) — 9 عوامل    مدمجة ──────────────────────
  // analyzeStockRadar يُشغّل محرك SMC الكامل:
  // MS/OB/LS/IVWAP/Trend/Momentum/Liquidity/Value/Macro
  // نتائجه تُدمج كـ sub-scores في الطبقات 1-9
const radar = analyzeStockRadar(stk, rBars, { atr, rsi: rsiV, cmf, obv, ms, ob, ls, vi });

  // sub-scores: 0-100 normalized من RadarTab
  const radarMS  = radar.factors.find((f: any)=>f.k==="ms")?.s  || 0;  // /15
  const radarOB  = radar.factors.find((f: any)=>f.k==="ob")?.s  || 0;  // /15
  const radarLS  = radar.factors.find((f: any)=>f.k==="ls")?.s  || 0;  // /10
  const radarVI  = radar.factors.find((f: any)=>f.k==="vi")?.s  || 0;  // /10
  const radarTR  = radar.factors.find((f: any)=>f.k==="tr")?.s  || 0;  // /15
  const radarMO  = radar.factors.find((f: any)=>f.k==="mo")?.s  || 0;  // /15
  const radarLQ  = radar.factors.find((f: any)=>f.k==="lq")?.s  || 0;  // /10
  const radarVA  = radar.factors.find((f: any)=>f.k==="va")?.s  || 0;  // /5
  const radarMC  = radar.factors.find((f: any)=>f.k==="mc")?.s  || 0;  // /5
  // تطبيع: نحوّل كل factor لنسبة 0-1 ثم نضربها في وزن ثابت
  const radarNorm= radar.total / 100;  // 0-1 — الدرجة الكلية
  // ──────────────────────────────────────────────────────────────

  // MACD periods ديناميكية حسب تقلّب السهم
  // السهم المتقلب → فترات أقصر للاستجابة السريعة
  // السهم الهادئ → فترات أطول لتصفية الضوضاء
  const stockVolPct = bars.length>=20
    ? bars.slice(-20).reduce((s,b)=>s+Math.abs(b.pct),0)/20
    : Math.abs(stk.ch);
  const macdFast = stockVolPct > 2.0 ? 8  : stockVolPct > 1.0 ? 10 : 12;
  const macdSlow = stockVolPct > 2.0 ? 18 : stockVolPct > 1.0 ? 22 : 26;
  const cls    = rBars.map(b=>b.close);
  const e12    = calcEMA(cls,macdFast), e26 = calcEMA(cls,macdSlow);
  const macdH  = e12-e26;
  const macdBull = macdH>0;

  // ADX Wilder Smoothing الكامل
  const _adxP=14;
  let _smTR=0,_smPDM=0,_smMDM=0;
  for(let i=1;i<=Math.min(_adxP,bars.length-1);i++){
    const b=bars[i],pv=bars[i-1];
    _smTR  +=Math.max(b.hi-b.lo,Math.abs(b.hi-pv.c),Math.abs(b.lo-pv.c));
    _smPDM +=Math.max(0,b.hi-pv.hi);
    _smMDM +=Math.max(0,pv.lo-b.lo);
  }
  for(let i=_adxP+1;i<bars.length;i++){
    const b=bars[i],pv=bars[i-1];
    _smTR  =_smTR  -_smTR/_adxP  +Math.max(b.hi-b.lo,Math.abs(b.hi-pv.c),Math.abs(b.lo-pv.c));
    _smPDM =_smPDM -_smPDM/_adxP +Math.max(0,b.hi-pv.hi);
    _smMDM =_smMDM -_smMDM/_adxP +Math.max(0,pv.lo-b.lo);
  }
  const plusDI =_smTR>0?_smPDM/_smTR*100:0;
  const minusDI=_smTR>0?_smMDM/_smTR*100:0;
  const atr14  =_smTR/_adxP||1;
  const dx=plusDI+minusDI>0?Math.abs(plusDI-minusDI)/(plusDI+minusDI)*100:0;
  const adxV=Math.round(Math.min(100,dx));
  const adxBull=plusDI>minusDI;

  // ════════════════════════════════════════
  //  الطبقة ١ -- وايكوف + هيكل السوق + OB (مفصولة لدالة calculateLayer1)
  // ════════════════════════════════════════
  const { L1, spring, sos, upth, wyPhase, patternBonus } = calculateLayer1(
    bars, last5, last10, last20, avgVol, ms, ob, ls, adxV, adxBull, radarMS, radarOB, radarLS
  );


  // ════════════════════════════════════════
  //  الطبقة ٢ -- الجهد/النتيجة + OBV (مفصولة لدالة calculateLayer2)
  // ════════════════════════════════════════
  const { L2, harm, div } = calculateLayer2(last10, avgVol, obv, radarMO);


  // ════════════════════════════════════════
  //  الطبقة ٣ -- Shannon Entropy (مفصولة لدالة calculateLayer3)
  // ════════════════════════════════════════
  const { L3, entr } = calculateLayer3(last20, last5, avgVol);

  // ════════════════════════════════════════
  //  الطبقة ٤ -- القوة النسبية + VWAP (مفصولة لدالة calculateLayer4)
  // ════════════════════════════════════════

  const { L4, mktWtd, rscRaw } = calculateLayer4(stk, vi, tc_tasi, radarVI);

  // ════════════════════════════════════════
  //  الطبقة ٥ -- RSI + MACD + ADX (مفصولة لدالة calculateLayer5)
  // ════════════════════════════════════════
  const { L5, triOk } = calculateLayer5(bars, rBars, rsiV, macdH, macdBull, adxV, adxBull, stk, radarTR);


  // ════════════════════════════════════════
  //  الطبقة ٦ -- Kelly + Macro (مفصولة لدالة calculateLayer6)
  // ════════════════════════════════════════
  const { L6, kelly, p_adj } = calculateLayer6(bars, vr, mc, stk, radarVA);

  
  // ════════════════════════════════════════
  //  الطبقة ٧ -- البايزي الحقيقي (مفصولة لدالة calculateLayer7)
  // ════════════════════════════════════════
  const { L7, bayesMult } = calculateLayer7(L1, L4, L5, last10, last5, avgVol, bars, cmf, obv, radarMC);

  // ════════════════════════════════════════
  //  الطبقة ٨ -- رادار مستقل: تقييم جوهري (مفصولة لدالة calculateLayer8)
  // ════════════════════════════════════════
  const { L8, pricePos, valScore } = calculateLayer8(stk, radarLQ);

    // ════════════════════════════════════════
  //  الطبقة ٩ -- السيولة الذكية المُعزَّزة (مفصولة لدالة calculateLayer9)
  // ════════════════════════════════════════
  const { L9, smartMoney } = calculateLayer9(cmf, bars, obv, vr, stk, vi);

  // ════════════════════════════════════════
  //  L10 -- كفاءة السيولة (مفصولة لدالة calculateLayer10)
  // ════════════════════════════════════════
  const L10 = calculateLayer10(bars);

  // ════════════════════════════════════════
  //  ① Regime Detection الموسّع (4 حالات)
  // ════════════════════════════════════════
  const mktBreadth  = STOCKS.filter(x=>x.ch>0).length/STOCKS.length;
const regimeData  = detectMarketRegime(bars, adxV, mktWtd, mktBreadth, atr, stk, MACRO.vix);
  const regime      = regimeData.regime;

  // ════════════════════════════════════════
  //  ② Dynamic Weighting (Regime + Sector)
  // ════════════════════════════════════════
  const W = buildDynamicWeights(regime, stk.sec);

  // ════════════════════════════════════════
  //  ③ Correlation Control
  // ════════════════════════════════════════
  const corrFactors = reduceCorrelation({L1,L2,L4,L5,L9});
  // تطبيق عامل الارتباط على الأوزان
  const WC: any = {};
  ['L1','L2','L3','L4','L5','L6','L7','L8','L9'].forEach(k=>{
    WC[k] = W[k] * (corrFactors[k]||1);
  });
  // إعادة تطبيع بعد Correlation Control
  const wcTotal = (Object.values(WC) as number[]).reduce((s,v)=>s+v,0);
  ['L1','L2','L3','L4','L5','L6','L7','L8','L9'].forEach(k=>{
    WC[k] = +(WC[k]/wcTotal).toFixed(4);
  });

  // ════════════════════════════════════════════════════════
  //  البوابات الثلاث -- Professional Gate System
  //  
  //  المبدأ العلمي:
  //  • Gate 1 (Liquidity): L9 - السيولة الذكية
  //  • Gate 2 (Structure): L1 - هيكل السوق
  //  • Gate 3 (Momentum): متوسط L4+L5 - الزخم والقوة
  //  
  //  العتبات ثابتة لضمان:
  //  ✓ الاتساق عبر جميع regimes
  //  ✓ التطابق مع opp.matrix
  //  ✓ سهولة الفهم والصيانة
  // ════════════════════════════════════════════════════════
  
  // ─── عتبات Professional Grade (من constants/analysisConstants.ts) ───
  const GATE_THRESHOLDS = {
    liquidity: GATE_THRESHOLDS_CONFIG.LIQUIDITY_MIN,
    structure: GATE_THRESHOLDS_CONFIG.STRUCTURE_MIN,
    momentum:  GATE_THRESHOLDS_CONFIG.MOMENTUM_MIN,
  };
  
  // ─── حساب البوابات ───
  const gate1 = L9 >= GATE_THRESHOLDS.liquidity;
  const gate2 = L1 >= GATE_THRESHOLDS.structure;
  
  // Gate 3: متوسط L4 و L5 (متساوي - أعدل من 55/45)
  const gate3Score = Math.round((L4 + L5) / 2);
  const gate3 = gate3Score >= GATE_THRESHOLDS.momentum;
  
  // ─── إحصاءات البوابات ───
  const gatesPassed = [gate1, gate2, gate3].filter(Boolean).length;
  const allGates = gatesPassed === 3;
  
  // ─── Gate Multiplier (سلّم منطقي) ───
  // 3/3 → 1.00 (إشارة كاملة)
  // 2/3 → 0.90 (إشارة جيدة، 10% خصم بسيط)
  // 1/3 → 0.75 (إشارة ضعيفة)
  // 0/3 → 0.55 (إشارة شبه معدومة)
  const gateMultiplier = gatesPassed === 3 ? 1.00
                       : gatesPassed === 2 ? 0.90
                       : gatesPassed === 1 ? 0.75
                       : 0.55;

    // ════════════════════════════════════════════════════════
  //  Opportunity Matrix -- Gate-Aligned Professional System
  //  
  //  المبدأ العلمي:
  //  ✓ كل بُعد (Liq/Str/Mom) يبني على gate المُقابل
  //  ✓ "high" يعني: نجح Gate + قوة إضافية
  //  ✓ يستحيل: gate ناجح + h فاشل (تناقض)
  //  
  //  المستويات:
  //  • h-level: gate ناجح + L >= عتبة عالية
  //  • Priority: 0-4 (0=لا فرصة، 4=فرصة قصوى)
  // ════════════════════════════════════════════════════════
  
  // ─── العتبات العالية (Strong Opportunity) ───
  const OPP_THRESHOLDS = {
    liquidity: 65,    // L9 >= 65 (أقوى من gate1=55)
    structure: 60,    // L1 >= 60 (أقوى من gate2=50)
    momentum:  55,    // (L4+L5)/2 >= 55 (أقوى من gate3=50)
  };
  
  // ─── حساب h-levels (يتطلب gate + قوة إضافية) ───
  // المنطق: gate يجب أن ينجح أولاً، ثم نتحقق من القوة
  const hLiq = gate1 && L9 >= OPP_THRESHOLDS.liquidity;
  const hStr = gate2 && L1 >= OPP_THRESHOLDS.structure;
  const hMom = gate3 && gate3Score >= OPP_THRESHOLDS.momentum;
  
  // ─── مصفوفة الفرص (6 حالات منطقية) ───
  let oppMatrix, oppColor, oppPriority;
  
  if(hLiq && hStr && hMom){
    // 🌟 فرصة قصوى: كل الأبعاد قوية
    oppMatrix = "فرصة قصوى";
    oppColor = C.mint;
    oppPriority = 4;
  }
  else if(hLiq && hStr){
    // 💎 فرصة قوية: سيولة + هيكل (زخم متوسط)
    oppMatrix = "فرصة مكتملة";
    oppColor = C.mint;
    oppPriority = 3;
  }
  else if(hLiq && hMom){
    // 🚀 اختراق محتمل: سيولة + زخم
    oppMatrix = "اختراق محتمل";
    oppColor = C.teal;
    oppPriority = 3;
  }
  else if(hStr && hMom){
    // 📈 صعود مؤكد: هيكل + زخم
    oppMatrix = "صعود مؤكد";
    oppColor = C.electric;
    oppPriority = 3;
  }
  else if(hLiq){
    // 🔍 تجميع: سيولة قوية فقط
    oppMatrix = "تجميع نشط";
    oppColor = C.amber;
    oppPriority = 2;
  }
  else if(hStr){
    // 📊 بنية صعودية: هيكل قوي فقط
    oppMatrix = "بنية صعودية";
    oppColor = C.amber;
    oppPriority = 2;
  }
  else if(hMom){
    // ⚡ زخم لحظي: زخم قوي بدون دعم
    oppMatrix = "زخم لحظي";
    oppColor = C.amber;
    oppPriority = 1;
  }
  else if(gatesPassed >= 1){
    // ⏸ مراقبة: بوابة واحدة على الأقل
    oppMatrix = "مراقبة";
    oppColor = C.teal;
    oppPriority = 1;
  }
  else{
    // 🔴 لا فرصة: كل البوابات فشلت
    oppMatrix = "لا فرصة";
    oppColor = C.coral;
    oppPriority = 0;
  }
    // ════════════════════════════════════════════════════════════
  //  Conflict Detection (Penalty calculation, no score impact yet)
  // ════════════════════════════════════════════════════════════
  const conflictData = calcConflictPenalty({L1,L4,L5,L7,L9}, regime);
  const conflictCount = conflictData.conflictCount;
  
  // ════════════════════════════════════════════════════════════
  //  Momentum Persistence (تستمر للجمع في adjustmentFactor)
  // ════════════════════════════════════════════════════════════
  const consecutiveUp = (function(){
    let streak=0;
    for(let i=bars.length-1;i>=Math.max(0,bars.length-7);i--){
      if(bars[i].pct>0) streak++;
      else break;
    }
    return streak;
  })();
  const consecutiveDn = (function(){
    let streak=0;
    for(let i=bars.length-1;i>=Math.max(0,bars.length-7);i--){
      if(bars[i].pct<0) streak++;
      else break;
    }
    return streak;
  })();
  const volTrendUp = vr > 1.15 && consecutiveUp >= 3;
  const volTrendDn = vr < 0.85 && consecutiveDn >= 3;
  const momentumPersistRaw = volTrendUp ? 0.08
                            : consecutiveUp >= 4 ? 0.05
                            : consecutiveUp >= 3 ? 0.03
                            : volTrendDn ? -0.08
                            : consecutiveDn >= 4 ? -0.05
                            : consecutiveDn >= 3 ? -0.03
                            : 0;
  
  // ════════════════════════════════════════════════════════════
  //  🎯 BASE SCORE -- Weighted Layer Score (لا تعديلات)
  // ════════════════════════════════════════════════════════════
  // L10 (كفاءة السيولة) -- بُعد متعامد مؤكّد (الرتبة 4.44→5.27).
  // نمنحه 7% مقتطعة بالتناسب من محور الزخم المكرّر (L1,L3,L5,L6,L7) فقط.
  const WCx = { ...WC, L10: 0 };
  const _l10w = 0.10;
  const _momKeys = ['L1','L3','L5','L6','L7'];
  const _momSum = _momKeys.reduce((s,k)=>s+(WCx[k]||0),0) || 1;
  _momKeys.forEach(k=>{ WCx[k] = (WCx[k]||0) - _l10w * ((WCx[k]||0) / _momSum); });
  WCx.L10 = _l10w;

  // ✨ L11 تدخل بوزن 20% من الدرجة، والباقي 80% للطبقات التسع
  const _base9 = _clamp(Math.round(
    L9 * WC.L9 + L1 * WC.L1 + L5 * WC.L5 + L4 * WC.L4 +
    L8 * WC.L8 + L7 * WC.L7 + L6 * WC.L6 + L2 * WC.L2 + L3 * WC.L3
  ), 0, 100);
  const baseScore = _clamp(Math.round(_base9 * 0.80 + L11 * 0.20), 0, 100);

  
  // ════════════════════════════════════════════════════════════
  //  🎯 UNIFIED ADJUSTMENT FACTOR -- 5 components, ONE multiplier
  //  
  //  المبدأ العلمي:
  //  • كل factor في [0.7, 1.15]
  //  • Weighted combination (لا ضرب متتالي)
  //  • Final adjustment في [0.7, 1.15]
  //  • Predictable, traceable, professional
  // ════════════════════════════════════════════════════════════
  
  // ─── 1. Conflict Factor (وزن 25%) ───
  // كل تعارض = خصم 4-6%
  const conflictRatio = _clamp(conflictCount * 0.05, 0, 0.20);
  const conflictFactor = 1.0 - conflictRatio;
  // نطاق: [0.80, 1.00]
  
  // ─── 2. Macro Factor (وزن 20%) ───
  // البيئة الاقتصادية الكلية
  const macroScore100 = mc.score * 5; // [0,20] → [0,100]
  const macroFactor = macroScore100 < 25 ? 0.85
                    : macroScore100 < 40 ? 0.92
                    : macroScore100 > 75 ? 1.08
                    : macroScore100 > 60 ? 1.04
                    : 1.0;
  // نطاق: [0.85, 1.08]
  
  // ─── 3. TASI Context Factor (وزن 20%) ───
  // خصائص السوق السعودي الفريدة
  const tasiBase = tc_tasi.tasiRegime === "CRASH"   ? 0.88
                 : tc_tasi.tasiRegime === "DIVERGE" ? 0.94
                 : tc_tasi.tasiRegime === "RALLY"   ? 1.06
                 : 1.0; // DECOUPLE
  
  // Dominance bonus/penalty
  const tasiDom = tc_tasi.domDir !== 0
                ? tc_tasi.domDir * 0.03 // ±3% max
                : 0;
  
  // Retail euphoria warning (للأسهم القوية)
  const retailAdj = tc_tasi.retailEuphoria && baseScore > 65 ? -0.04 : 0;
  
  // Sunday effect (تذبذب أعلى)
  const sundayAdj = tc_tasi.isSunday ? -0.02 : 0;
  
  const tasiFactor = _clamp(tasiBase + tasiDom + retailAdj + sundayAdj, 0.85, 1.10);
  // نطاق: [0.85, 1.10]
  
  // ─── 4. Gate Quality Factor (وزن 20%) ───
  // كم بوابة نجحت
  const gateFactor = gatesPassed === 3 ? 1.10
                   : gatesPassed === 2 ? 1.00
                   : gatesPassed === 1 ? 0.90
                   : 0.80;
  // نطاق: [0.80, 1.10]
  
  // ─── 5. Momentum Factor (وزن 15%) ───
  // ✨ أُزيل bayesMult (العدّ المزدوج): L7 مضمّن أصلاً في baseScore
  // كطبقة موزونة، فحقنه هنا ثانيةً كان يُضخّم البايزي مرّتين.
  // الآن: الزخم فقط -- كل إشارة تُعَدّ مرّة واحدة.
  const momentumBayesFactor = _clamp(
    1.0 + momentumPersistRaw,
    0.85, 1.10
  );
  // نطاق: [0.85, 1.10] -- الآن من الزخم فقط
  
  // ─── 🎯 COMBINED ADJUSTMENT (weighted average) ───
  const adjustmentFactor = _clamp(
    conflictFactor * 0.25 +
    macroFactor * 0.20 +
    tasiFactor * 0.20 +
    gateFactor * 0.20 +
    momentumBayesFactor * 0.15,
    0.70, 1.15  // حدود صارمة!
  );
  
  // ════════════════════════════════════════════════════════════
  //  🎯 FINAL SCORE -- Applied ONCE
  // ════════════════════════════════════════════════════════════
  const score = _clamp(Math.round(baseScore * adjustmentFactor), 0, 100);
const grade = score>=GRADE_THRESHOLDS.S?"S":score>=GRADE_THRESHOLDS.A?"A":score>=GRADE_THRESHOLDS.B?"B":score>=GRADE_THRESHOLDS.C?"C":score>=GRADE_THRESHOLDS.D?"D":"F";


    // ════════════════════════════════════════════════════════
  //  ⑦ Preliminary Probability (للأنظمة الخارجية)
  //  
  //  ملاحظة: probability النهائي يُحسب في stockHealth
  //  باستخدام conviction + ensemble bias (أدق)
  //  
  //  هذا الحساب البدائي للأنظمة التي تستدعي calc9Layers
  //  مباشرة (مثل backtestEngine)
  // ════════════════════════════════════════════════════════
  const prob = _softmax3(score - 50, 50 - score, 5);


    // ════════════════════════════════════════════════════════
  //  Preliminary Signal (calc9Layers level)
  //  
  //  ملاحظة: sig النهائي يُحسب في stockHealth
  //  هنا فقط preliminary للأنظمة الأخرى التي تستدعي calc9Layers
  // ════════════════════════════════════════════════════════
  let sig, sigC;
  if(score >= 75 && allGates && oppPriority >= 3){
    sig = "شراء قوي"; sigC = C.mint;
  }
  else if(score >= 65 && gatesPassed >= 2){
    sig = "شراء قوي"; sigC = C.mint;
  }
  else if(score >= 55 && gatesPassed >= 2){
    sig = "مراقبة"; sigC = C.amber;
  }
  else if(score >= 45 && gatesPassed >= 1){
    sig = "محايد"; sigC = C.teal;
  }
  else{
    sig = "تخفيف"; sigC = C.coral;
  }

  return{
    score, grade, sig, sigC, regime,
    weights: WC, // الأوزان بعد Correlation Control
    probability: prob, // ⑦ Probability Output
    gates:{
      g1:gate1, g2:gate2, g3:gate3,
      passed:gatesPassed, all:allGates,
      g1s:L9, g2s:L1, g3s:gate3Score,
      g1l:L9>=75?"سيولة مؤسسية":L9>=55?"سيولة جيدة":"سيولة ضعيفة",
      g2l:ms.label, g3l:adxBull?"زخم صاعد":"زخم ضعيف"
    },
    opp:{matrix:oppMatrix,color:oppColor,priority:oppPriority,highLiq:hLiq,highStr:hStr,highMom:hMom},
    tasiCtx: tc_tasi,
    layers:{L1,L2,L3,L4,L5,L6,L7,L8,L9,L10},
    extras:{
            spring, sos, upth, harm, div,
      wyPhase, patternBonus, bayesMult,
      conflictCount,
      conflictDetails: conflictData.details,
      entr:+entr.toFixed(2),
      rscRaw:+rscRaw.toFixed(2),
      rsiV, macdH:+macdH.toFixed(3),
      adxV, adxBull,
      plusDI:+plusDI.toFixed(1), minusDI:+minusDI.toFixed(1),
      triOk, kelly:+kelly.toFixed(3),
      liqSM:smartMoney, vr:+vr.toFixed(2),
      p_adj:+p_adj.toFixed(2),
      pricePos, valScore,
      mktBreadth:+mktBreadth.toFixed(2),
      mktMomentum:+mktWtd.toFixed(2),
      baseScore, adjustmentFactor:+adjustmentFactor.toFixed(3),
      macroScore100,
      gateMultiplier:+gateMultiplier.toFixed(2),
      regimeData,

      // مؤشرات الرادار
      cmf:+cmf.toFixed(3),
      obvRising:obv.rising,
      msLabel:ms.label, bosBull:ms.bosBull,
      obLabel:ob.label, inBullOB:ob.inBullOB,
      sslLabel:ls.label, recoveredSSL:ls.recoveredSSL,
vwapDev, vwapD:vwapDev, belowB1:vi.belowB1, belowB2:vi.belowB2,
      macroEnv:mc.env, macroScore:mc.score,
      L10: L10,
 
      // ✨ L11 -- عوامل الأداء المُثبتة (زخم 12ش · جودة · تدنّي تقلّب)
      L11: L11, l11Detail: f11.detail, l11Mom: f11.momScore,
      l11Qual: f11.qualScore, l11Vol: f11.volScore, l11QualAvail: f11.qualAvail,
    }
  };
}


/* ══ stockHealth v3 — Ensemble + Confidence + Feedback ══ */
/* ══════════════════════════════════════════════════════════════
   Portfolio Engine — إدارة المحفظة الكاملة
   ① Position Sizing  ② Correlation Guard  ③ Dynamic Risk Gate
   ④ Adaptive Signal Threshold  ⑤ Sharpe Tracker
══════════════════════════════════════════════════════════════ */

/* ① حساب حجم المركز الأمثل */
function calcPositionSize(health: any, riskGateLevel: any): any {
  var score  = health.score  || 50;
  var grade  = health.grade  || "D";
  var conf   = health.confidence || 50;
  var sig    = health.sig    || "";
  var regime = health.regime || "chop";
  var layers = health.layers || {};

  // ══ الخطوة ١: Half-Kelly الحقيقي ══
  // p = احتمال الربح (من score + conf)
  // b = نسبة الربح/الخسارة (من R:R تاريخي، افتراضي 1.5)
  var p = Math.min(0.80, Math.max(0.20,
    (score/100)*0.55 + (conf/100)*0.30 + (sig==="شراء قوي"?0.10:sig==="مراقبة"?0.05:0)
  ));
  var b = sig==="شراء قوي"&&score>=75 ? 1.8   // R:R أعلى للإشارات القوية
        : sig==="شراء قوي"            ? 1.5
        : 1.2;

  var q        = 1 - p;
  var fullKelly = Math.max(0, (p*b - q) / b);  // Kelly كامل
  var halfKelly = fullKelly * 0.5;               // Half-Kelly — المعيار المؤسسي

  // ══ الخطوة ٢: تعديل التقلب (Volatility Scaling) ══
  // السهم المتقلب = حجم أصغر
  var L1 = layers.L1||50, L5 = layers.L5||50, L9 = layers.L9||50;
  var volScore = (100 - L5) / 100;  // L5 عالي = مؤشرات قوية = تقلب متحكم
  var volMulti = volScore>0.6?0.75:volScore>0.4?0.90:1.0;

  // ══ الخطوة ٣: تعديل الـ Regime ══
  var regimeMulti = regime==="volatile"   ? 0.55
                  : regime==="news-driven"? 0.65
                  : regime==="bear"       ? 0.70
                  : regime==="sideways"   ? 0.85
                  : regime==="bull"       ? 1.10
                  : 0.90; // chop

  // ══ الخطوة ٤: تعديل Risk Gate ══
  var gateMulti = riskGateLevel==="DANGER"  ? 0.0
               : riskGateLevel==="CAUTION"  ? 0.50
               : 1.0;

  // ══ الخطوة ٥: الحجم النهائي ══
  var rawSize = halfKelly * volMulti * regimeMulti * gateMulti;

  // حدود منطقية:
  // - لا تداول إذا الإشارة ضعيفة جداً
  // - سقف 30% لأي سهم واحد (حتى مع إشارة S ممتازة)
  // - حد أدنى 3% إذا قرر الدخول
  if(gateMulti===0||sig==="تخفيف"||(conf<45&&sig!=="شراء قوي")){
    rawSize = 0;
  } else if(rawSize>0 && rawSize<0.03){
    rawSize = 0.03;
  }

  var finalSize = Math.min(0.30, Math.max(0, rawSize));

  // ══ تسمية ذكية بناءً على الحجم الفعلي ══
  var label = finalSize>=0.22 ? "مركز كبير (22-30%)"
            : finalSize>=0.15 ? "مركز متوسط (15-21%)"
            : finalSize>=0.08 ? "مركز صغير (8-14%)"
            : finalSize>=0.03 ? "مركز رمزي (3-7%)"
            : "لا تداول";

  return {
    size:      +(finalSize).toFixed(3),
    pct:       Math.round(finalSize*100),
    label,
    gateLevel: riskGateLevel,
    // تفاصيل الحساب للشفافية
    kelly:     +(fullKelly*100).toFixed(1),
    halfKelly: +(halfKelly*100).toFixed(1),
    p:         +(p*100).toFixed(1),
    b:         +b.toFixed(1),
  };
}

/* ② فحص الارتباط — Markowitz */
function checkCorrelationGuard(sym: string, activePositions: any[]): any {
  // أيّ مجموعة ينتمي لها السهم؟
  var myGroup: any = null;
  Object.entries(TASI_CORR_GROUPS).forEach(function([g, syms]: [string, any]){
    if(syms.indexOf(sym)!==-1) myGroup=g;
  });
  if(!myGroup) return {safe:true, reason:""};


  // كم سهماً من نفس المجموعة في المحفظة؟
  var groupCount = (activePositions||[]).filter(function(p: any){
  return (TASI_CORR_GROUPS as any)[myGroup] && (TASI_CORR_GROUPS as any)[myGroup].indexOf(p.sym)!==-1;
  }).length; 

  if(groupCount>=1){
    return {
      safe: false,
      reason: "⚠ المجموعة " + myGroup + " ممثّلة بالفعل — خطر تركّز",
      group: myGroup,
    };
  }
  return {safe:true, reason:"", group:myGroup};
}


function stockHealth(stk: Stock, bars: Bar[], macroOverride?: any): HealthScore {
  // ✨ Validation - حماية من Edge Cases
  if (!stk || typeof stk !== 'object') {
    return _emptyHealthResult();
  }
  if (!bars || !Array.isArray(bars) || bars.length < 5) {
    return _emptyHealthResult();
  }
  
  // 🆕 تطبيق macro override إن وُجد (من FRED أو commData أو الباك-تيست)
  // كل الحسابات أدناه ستستعمل القيم الجديدة
  const _macroPrevious = macroOverride ? setMacroOverride(macroOverride) : null;
  
  try {
  // ════════════════════════════════════════════════
  //  STEP 1: المحركات الأساسية الثلاثة (LA, LB, LC)
  // ════════════════════════════════════════════════
  
  // ── A) المحرك التقني
  var tech   = calc9Layers(stk, bars);
  var LA     = tech.score;
  var regime = tech.regime;
  var layers = tech.layers;

  // ── B) المحرك الأساسي
  var fm  = calcFactorModel(stk, bars);
var em  = calcEarningsModel(stk, MACRO.gdpGrowth);
var dcf = calcDCF(stk, MACRO.gdpGrowth);
  var eq  = calcEarningsQuality(stk);
  var dcfScore = Math.round(_clamp(100/(1+Math.exp(-0.06*(dcf.upside-5))), 10, 95));
  var emScore  = Math.round(_clamp(100/(1+Math.exp(-0.05*(em.upside-8))),  10, 95));
  var fundConflict = (dcfScore>70 && eq.composite<40) ? 6 : (dcfScore<40 && fm.composite>70) ? 4 : 0;
  var LB = _clamp(Math.round(dcfScore*0.35 + fm.composite*0.30 + emScore*0.20 + eq.composite*0.15 - fundConflict), 0, 100);

  // ── C) المحرك السلوكي المُعزَّز
  var opt = calcBehavioralPressure(stk, bars);
  var ins = calcInsiderTransactions(stk, bars);
  var alt = calcAlternativeData(stk, bars, { oilPrice: MACRO.oilPrice, saudiRepoRate: MACRO.saudiRepoRate, cpi: MACRO.cpi });
  var optScore = _clamp(Math.round(80 - (opt.pressureRatio-0.7)*60 + (opt.unusualActivity && opt.pressureRatio<0.9 ? 10 : 0)), 0, 100);

  // Earnings Surprise
  var earningsSurprise = 50;
  if(stk.eps_q1 && stk.eps_q2 && stk.eps_q3){
    var qVals = [stk.eps_q1, stk.eps_q2, stk.eps_q3];
    var qTrend = (qVals[2]-qVals[0])/Math.max(Math.abs(qVals[0]), 0.01);
    var qConsist = qVals[2]>qVals[1] && qVals[1]>qVals[0] ? 1 : qVals[2]<qVals[1] && qVals[1]<qVals[0] ? -1 : 0;
    earningsSurprise = _clamp(Math.round(50 + qTrend*100 + qConsist*12), 0, 100);
  } else if(stk.epsGrw>0){
    earningsSurprise = _clamp(Math.round(50 + stk.epsGrw*2.5), 0, 100);
  }

  // Sector Rotation Score
  var sectorStocks = STOCKS.filter(function(x){return x.sec===stk.sec;});
  var sectorAvgCh = sectorStocks.length>0 ? sectorStocks.reduce(function(s,x){return s+x.ch;},0)/sectorStocks.length : 0;
  var mktAvgCh = STOCKS.length>0 ? STOCKS.reduce(function(s,x){return s+x.ch;},0)/STOCKS.length : 0;
  var sectorRot = sectorAvgCh - mktAvgCh;
  if(MACRO.oilWarPremium && stk.oilCorr>0.5) sectorRot += MACRO.oilPrice>MACRO.oilTarget ? 1.5 : -1.5;
  var sectorRotScore = _clamp(Math.round(50 + sectorRot*15), 0, 100);

  var LC = Math.round(
    optScore*0.30 + ins.score*0.30 + alt.composite*0.15 +
    earningsSurprise*0.15 + sectorRotScore*0.10
  );
  // ════════════════════════════════════════════════════════
  //  LB-LC Conflict Detection -- Continuous Scale
  //  
  //  المبدأ العلمي:
  //  • Fundamental (LB) و Behavioral (LC) قد يتعارضان
  //  • التعارض تدريجي (وليس on/off)
  //  • نقيس الفجوة ونعطي عقوبة متناسبة
  //  
  //  العتبات:
  //  • فرق >= 25 نقطة: بداية تعارض
  //  • فرق >= 35 نقطة: تعارض حقيقي
  //  • فرق >= 45 نقطة: تعارض حاد
  // ════════════════════════════════════════════════════════
  var lbLcGap = Math.abs(LB - LC);
  var lbLcConflict = lbLcGap >= 25
    ? Math.min(8, Math.round((lbLcGap - 20) / 3.5))
    : 0;
  // نطاق العقوبة: [0, 8]
  // فرق 25 → 1.4 → 1
  // فرق 30 → 2.9 → 3
  // فرق 40 → 5.7 → 6
  // فرق 50 → 8.6 → 8 (مُقيّد)


  // ── D) المضاعفات الخارجية
var risk  = calcRiskAttribution(stk, bars, MACRO.saudiRepoRate);
var inter = calcIntermarket(stk, { oilPrice: MACRO.oilPrice, oilTarget: MACRO.oilTarget, saudiRepoRate: MACRO.saudiRepoRate, cpi: MACRO.cpi, vix: MACRO.vix, gdpGrowth: MACRO.gdpGrowth, m2Growth: MACRO.m2Growth });
  var micro = calcMicrostructure(stk, bars);
  var riskMult = risk.sortino>2.0 ? 1.07 : risk.sortino>1.0 ? 1.03 : risk.sharpe>0.5 ? 1.00 : risk.sharpe>0 ? 0.96 : 0.89;
  var finalMult = _clamp(riskMult * inter.multiplier * (micro ? micro.multiplier : 1.0), 0.70, 1.30);

  // ═══════════════════════════════════════════════════
  // ── E) Dynamic Weights -- Regime-Aware Allocation
  //  المبدأ العلمي:
  //  • LA (تقني): يتفوق في Bull/Volatile (الحركة سريعة)
  //  • LB (أساسي): يتفوق في Sideways (لا اتجاه واضح)
  //  • LC (سلوكي): يتفوق في News-driven (الأخبار تحرك)
  // ═══════════════════════════════════════════════════
  var wA, wB, wC;
  switch(regime){
    // Bull: LA يقود (الزخم الفني)
    case "bull":        wA=0.50; wB=0.30; wC=0.20; break;
    // Bear: متوازن (الكل مهم)
    case "bear":        wA=0.40; wB=0.35; wC=0.25; break;
    // Sideways: LB يقود (التقييم مهم)
    case "sideways":    wA=0.30; wB=0.45; wC=0.25; break;
    // Volatile: LA يقود (الاستجابة السريعة)
    case "volatile":    wA=0.55; wB=0.25; wC=0.20; break;
    // News-driven: LC يقود (السلوك يستجيب للأخبار)
    case "news-driven": wA=0.30; wB=0.30; wC=0.40; break;
    // Default: متوازن
    default:            wA=0.45; wB=0.30; wC=0.25;
  }
  // ─── التحقق: Σ(w) = 1.0 ───
  // bull: 0.50+0.30+0.20 = 1.00 ✓
  // bear: 0.40+0.35+0.25 = 1.00 ✓
  // sideways: 0.30+0.45+0.25 = 1.00 ✓
  // volatile: 0.55+0.25+0.20 = 1.00 ✓
  // news: 0.30+0.30+0.40 = 1.00 ✓
  // default: 0.45+0.30+0.25 = 1.00 ✓
  
  var bayesAdj = tech.extras && tech.extras.bayesMult ? tech.extras.bayesMult : 1.0;
  var tasiCtx = tech.tasiCtx || null;

  // ════════════════════════════════════════════════
  //  STEP 2: ENSEMBLE VOTING (يُحسب أولاً!)
  // ════════════════════════════════════════════════
  var ensemble = ensembleVote(LA, LB, LC, regime, tech.gates ? tech.gates.passed : 0, layers);

    // ════════════════════════════════════════════════════════════
  //  🎯 STEP 3: UNIFIED CONVICTION -- Professional Grade
  //  
  //  المبدأ العلمي:
  //  conviction = Σ(L_i × w_i) × ensembleQualityFactor
  //  
  //  المكونات:
  //  • LA = Technical Analysis (calc9Layers score)
  //  • LB = Fundamental Analysis (DCF + FM + EQ)
  //  • LC = Behavioral Analysis (Options + Insider)
  //  
  //  العامل الوحيد:
  //  • ensembleQualityFactor: [0.85, 1.15]
  //    يعكس جودة الاتفاق بين النماذج
  //  
  //  ملاحظة: التعديلات الأخرى (macro, tasi) موجودة في
  //  score (Block 4) - لا نُكررها هنا
  // ════════════════════════════════════════════════════════════
  
  // ─── Base Conviction (Weighted Ensemble) ───
  var baseConviction = LA * wA + LB * wB + LC * wC;
  
  // ─── Conflict Penalty (للنماذج المتعارضة) ───
  // lbLcConflict موجود من قبل (تعارض LB و LC)
  // و fundConflict (تعارض DCF و EQ)
  var ensembleConflict = (lbLcConflict || 0) + (fundConflict || 0);
  baseConviction = baseConviction - ensembleConflict;
  
  // ─── Ensemble Quality Factor (واحد فقط!) ───
  var ensembleQualityFactor = 1.0;
  
  // 1. Agreement Bonus
  if(ensemble.bullCount === 3 || ensemble.bearCount === 3){
    ensembleQualityFactor *= 1.08;  // إجماع كامل: +8%
  }
  else if(ensemble.bullCount === 2 || ensemble.bearCount === 2){
    ensembleQualityFactor *= 1.03;  // إجماع جزئي: +3%
  }
  else if(ensemble.neutCount >= 2){
    ensembleQualityFactor *= 0.95;  // أغلبية محايدة: -5%
  }
  else{
    ensembleQualityFactor *= 0.92;  // تعارض كامل: -8%
  }
  
  // 2. Tech Consensus Bonus (L1+L5+L9 متفقة)
  if(ensemble.techConsensus === 1){
    ensembleQualityFactor *= 1.03;  // اتفاق صاعد: +3%
  }
  else if(ensemble.techConsensus === -1){
    ensembleQualityFactor *= 0.97;  // اتفاق هابط: -3%
  }
  
  // 3. Apply Quality Factor (حد أقصى)
  ensembleQualityFactor = _clamp(ensembleQualityFactor, 0.85, 1.15);
  
  // ─── Final Conviction (مرة واحدة!) ───
  var conviction = _clamp(
    Math.round(baseConviction * ensembleQualityFactor),
    0, 100
  );
  
      // ════════════════════════════════════════════════════════════
  //  🎯 STEP 3.5: تعريف merged مبكراً (قبل ABM)
  //  
  //  المبدأ:
  //  • merged يجب أن يكون موجوداً قبل STEP 4 (ABM)
  //  • لأن ABM يحفظ abmInfo في merged
  // ════════════════════════════════════════════════════════════
  var merged = tech;
  
  // ════════════════════════════════════════════════════════════
  //  🎯 STEP 4: ADAPTIVE FEEDBACK LOOP (مُحسّن)
  //  
  //  المبدأ العلمي:
  //  ABM (Adaptive Bayesian Memory) يتعلم من القرارات السابقة

  //  ويُعدّل الأوزان للطبقات بناءً على دقتها التاريخية
  //  
  //  التطبيق:
  //  1. WC_adapted = أوزان مُعدّلة من ABM
  //  2. LA_adapted = إعادة حساب LA مع الأوزان الجديدة
  //  3. score يتأثر (تدريجياً 80/20)
  //  4. conviction يتأثر (تدريجياً 80/20)
  //  
  //  الفائدة: التعلم يؤثر على القرار النهائي ✓
  // ════════════════════════════════════════════════════════════
  var WC_adapted = applyFeedbackToWeights(tech.weights || {}, stk.sym, regime);
  var feedbackApplied = WC_adapted !== tech.weights;
  
  if(feedbackApplied){
    var L = layers;
    
    // ─── إعادة حساب baseScore مع الأوزان المُعدّلة ───
    var baseScoreAdapted = _clamp(Math.round(
      (L.L9||0)*WC_adapted.L9 + (L.L1||0)*WC_adapted.L1 + (L.L5||0)*WC_adapted.L5 +
      (L.L4||0)*WC_adapted.L4 + (L.L8||0)*WC_adapted.L8 + (L.L7||0)*WC_adapted.L7 +
      (L.L6||0)*WC_adapted.L6 + (L.L2||0)*WC_adapted.L2 + (L.L3||0)*WC_adapted.L3
    ), 0, 100);
    
    // ─── إعادة حساب score (مع نفس adjustmentFactor) ───
    var adjFactor = tech.extras?.adjustmentFactor || 1.0;
    var scoreAdapted = _clamp(Math.round(baseScoreAdapted * adjFactor), 0, 100);
    
    // ─── مزج محافظ 80/20 للـ score ───
    // (ABM تعديل تدريجي - لا قفزات حادة)
    var blendedScore = _clamp(Math.round(
      tech.score * 0.80 + scoreAdapted * 0.20
    ), 0, 100);
    
    // ─── تحديث LA لإعادة حساب conviction ───
    var LA_adapted = blendedScore;
    LA = LA_adapted; // يؤثر على conviction أيضاً
    
    // ─── إعادة حساب conviction مع LA_adapted ───
    var baseConvictionAdapted = LA_adapted * wA + LB * wB + LC * wC - ensembleConflict;
    var convictionAdapted = _clamp(Math.round(
      baseConvictionAdapted * ensembleQualityFactor
    ), 0, 100);
    
    // ─── مزج محافظ للـ conviction ───
    conviction = _clamp(Math.round(
      conviction * 0.80 + convictionAdapted * 0.20
    ), 0, 100);
    
    // ─── تطبيق score الجديد على merged ───
    merged.score = blendedScore;
    
    // ─── حفظ معلومات ABM للشفافية ───
    (merged as any).abmInfo = {
      applied: true,
      originalScore: tech.score,
      adaptedScore: scoreAdapted,
      finalScore: blendedScore,
      blend: "80/20",
      meta: (WC_adapted as any).__meta || null
    };
  } else {
    (merged as any).abmInfo = { applied: false };
  }

  // ════════════════════════════════════════════════════════════
  //  🛑 TOP-EXHAUSTION VETO -- نضبط score قبل Grade/Confidence/Signal
  //  
  //  المبدأ: سهم قرب قمة 52 أسبوع + RSI مرتفع جداً + علامة تصريف
  //  (upthrust أو تباعد سلبي: OBV هابط مع CMF ضعيف) = لا يستحق
  //  إشارة شراء، مهما كانت الطبقات الأخرى إيجابية.
  //  
  //  التدخّل هنا (على score مباشرة، قبل Grade/Sig/PositionSize)
  //  يضمن اتساق كل عناصر الواجهة دفعة واحدة -- بدل تعديل كل بطاقة
  //  على حدة (بطاقة الإجراء في AnalysisScreen تقرأ score مباشرة،
  //  ليس sig فقط).
  // ════════════════════════════════════════════════════════════
  var vetoExtras = tech.extras || {};
  var nearTop = vetoExtras.pricePos != null && vetoExtras.pricePos >= 85;
  var rsiHot = vetoExtras.rsiV != null && vetoExtras.rsiV >= 75;
  var distributionSignal = !!vetoExtras.upth ||
    (vetoExtras.obvRising === false && vetoExtras.cmf != null && vetoExtras.cmf < 0.05);
  var topExhaustionVeto = nearTop && rsiHot && distributionSignal;

  if(topExhaustionVeto){
    // سقف قسري داخل منطقة "تخفيف" (<45) -- يمنع شراء قوي/مراقبة تماماً
    merged.score = Math.min(merged.score, 44);
  }
  (merged as any).topExhaustionVeto = topExhaustionVeto;
  if(topExhaustionVeto){
    (merged as any).vetoReason =
      "⚠️ قرب قمة 52 أسبوع (" + vetoExtras.pricePos + "%) + RSI مرتفع (" +
      Math.round(vetoExtras.rsiV) + ") + علامة تصريف -- تجنّب الدخول حتى يتأكد الاختراق بسيولة";
  }

  // ════════════════════════════════════════════════
  //  STEP 5: CONFIDENCE THRESHOLD
  // ════════════════════════════════════════════════

  var conflictCnt = tech.extras && tech.extras.conflictCount ? tech.extras.conflictCount : 0;
  var ct = calcConfidenceThreshold(
    conviction, layers, ensemble, conflictCnt,
    tech.gates ? tech.gates.passed : 0, regime
  );

    // ════════════════════════════════════════════════════════
  //  STEP 6: تحديد الإشارة النهائية
  //  
  //  المبدأ العلمي - Single Source of Truth:
  //  • merged.score = score الحقيقي من calc9Layers (Block 4)
  //  • merged.convictionScore = conviction (للعرض فقط)
  //  • منطق sig يستخدم score (وليس conviction)
  //  
  //  هذا يضمن:
  //  ✓ التوافق مع AnalysisScreen
  //  ✓ ثبات العتبات (65/55/45)
  //  ✓ الشفافية الكاملة
  // ════════════════════════════════════════════════════════
  // ─── merged.score يبقى كما هو من calc9Layers ───
  // (لا نستبدله بـ conviction!)
  
  // ════════════════════════════════════════════════════════
  //  Grade System -- Professional + User-Friendly
  //  
  //  معايرة احترافية:
  //  • S (85+): فرصة استثنائية (~1% من السوق)
  //  • A (75-84): فرصة قوية (~5%)
  //  • B (65-74): فرصة جيدة (~15%)
  //  • C (55-64): محايد إيجابي (~25%)
  //  • D (45-54): محايد سلبي (~30%)
  //  • E (35-44): ضعيف (~20%)
  //  • F (<35): سيء (~4%)
  // ════════════════════════════════════════════════════════
  
  // ─── Grade حرف (للنظام الداخلي) ───
  merged.grade = merged.score >= 85 ? "S"
               : merged.score >= 75 ? "A"
               : merged.score >= 65 ? "B"
               : merged.score >= 55 ? "C"
               : merged.score >= 45 ? "D"
               : merged.score >= 35 ? "E"
               : "F";
  
  // ─── Grade وصف عربي (للعرض) ───
  (merged as any).gradeLabel = merged.score >= 85 ? "استثنائي 🏆"
                              : merged.score >= 75 ? "ممتاز ⭐"
                              : merged.score >= 65 ? "قوي ✓"
                              : merged.score >= 55 ? "جيد"
                              : merged.score >= 45 ? "محايد"
                              : merged.score >= 35 ? "ضعيف"
                              : "خطر ⚠";
  
  // ─── Grade لون (للواجهة) ───
  (merged as any).gradeColor = merged.score >= 85 ? "#10c97e"  // أخضر مشرق
                              : merged.score >= 75 ? "#10c97e"  // أخضر
                              : merged.score >= 65 ? "#06b6d4"  // أزرق-أخضر
                              : merged.score >= 55 ? "#06b6d4"  // أزرق
                              : merged.score >= 45 ? "#6b7280"  // رمادي
                              : merged.score >= 35 ? "#f59e0b"  // برتقالي
                              : "#f04f5a";                       // أحمر
  
    // ════════════════════════════════════════════════════════
  //  Grade Description -- وصف تفصيلي ذكي
  //  
  //  المبدأ:
  //  • وصف يعكس قوة الإشارة
  //  • + نسبة الأسهم في هذه الفئة (تقريبية)
  //  • + إرشاد سريع للقرار
  // ════════════════════════════════════════════════════════
  (merged as any).gradeDescription = 
    merged.score >= 85 ? "فرصة استثنائية - أعلى 1% من السوق"
    : merged.score >= 75 ? "فرصة قوية - أعلى 5% من السوق"
    : merged.score >= 65 ? "فرصة جيدة - أعلى 20% من السوق"
    : merged.score >= 55 ? "أداء معقول - راقب التطورات"
    : merged.score >= 45 ? "محايد - لا توجد إشارة واضحة"
    : merged.score >= 35 ? "أداء ضعيف - تجنّب الدخول"
    : "خطر عالٍ - قلّص أو ابتعد";
  
  // ════════════════════════════════════════════════════════
  //  Conviction Display -- Enhanced
  //  
  //  conviction = درجة الثقة في القرار النهائي
  //  مختلف عن score (الذي هو جودة الإشارة)
  //  
  //  مثال:
  //  • score 80 + conviction 75 = فرصة قوية وموثوقة ✅
  //  • score 80 + conviction 55 = فرصة قوية لكن إجماع ضعيف ⚠
  // ════════════════════════════════════════════════════════
  
  // ─── conviction أساسي ───
  (merged as any).convictionScore = conviction;
  
  // ─── conviction label عربي + emoji ───
  (merged as any).convictionLabel = conviction >= 85 ? "ثقة استثنائية 🏆"
                                  : conviction >= 75 ? "ثقة عالية ⭐"
                                  : conviction >= 65 ? "ثقة جيدة ✓"
                                  : conviction >= 55 ? "ثقة معقولة"
                                  : conviction >= 45 ? "ثقة محدودة"
                                  : "ثقة منخفضة ⚠";
  
  // ─── conviction color للواجهة ───
  (merged as any).convictionColor = conviction >= 75 ? "#10c97e"
                                  : conviction >= 65 ? "#06b6d4"
                                  : conviction >= 55 ? "#06b6d4"
                                  : conviction >= 45 ? "#6b7280"
                                  : conviction >= 35 ? "#f59e0b"
                                  : "#f04f5a";
  
  // ─── conviction vs score gap (للشفافية) ───
  // هل conviction يدعم score أم يتعارض معه؟
  var convictionGap = conviction - merged.score;
  (merged as any).convictionAlignment = 
    Math.abs(convictionGap) <= 5 ? "متوافق" // gap صغير
    : convictionGap > 5 ? "أعلى من Score" // ensemble داعم
    : "أقل من Score"; // ensemble متحفظ
  
  (merged as any).convictionGap = convictionGap;
  
  // ─── Score Word (وصف عربي للـ score) ───
  (merged as any).scoreWord = scoreWord(merged.score);
  
  // ─── Probability Percentages (للعرض السريع) ───
  if(merged.probability){
    (merged as any).probabilityDisplay = {
      bull: Math.round(merged.probability.bull * 100) + "%",
      bear: Math.round(merged.probability.bear * 100) + "%",
      neutral: Math.round(merged.probability.neutral * 100) + "%",
      // الإشارة الغالبة
      dominant: merged.probability.bull > merged.probability.bear && merged.probability.bull > merged.probability.neutral ? "صعودي"
              : merged.probability.bear > merged.probability.bull && merged.probability.bear > merged.probability.neutral ? "هبوطي"
              : "محايد",
      // قوة الإشارة
      strength: Math.max(merged.probability.bull, merged.probability.bear, merged.probability.neutral) >= 0.60 ? "قوية"
              : Math.max(merged.probability.bull, merged.probability.bear, merged.probability.neutral) >= 0.45 ? "متوسطة"
              : "ضعيفة"
    };
  }



  
  // ════════════════════════════════════════════════════════════
  //  🎯 UNIFIED SIGNAL LOGIC -- Professional Grade
  //  
  //  المبادئ العلمية:
  //  1. score = القرار الرئيسي (لا conviction)
  //  2. gates = filter (لا يُغيّر القرار جذرياً)
  //  3. opp.priority = bonus للفرص الاستثنائية
  //  4. ensemble = warning فقط (لا يحكم)
  //  5. shouldAbstain = نادر جداً (فقط للحالات الخطرة)
  //  
  //  المستويات (6 levels):
  //  🌟 Rare Opportunity: score≥80 + gates.all + opp=3
  //  🚀 Strong Buy:      score≥70 + gates≥2
  //  ✅ Buy:             score≥60 + gates≥2
  //  👁 Watch:           score≥50 + gates≥1
  //  ⚖️ Neutral:          score≥40
  //  🔴 Reduce:          score<40
  //  🛑 Abstain:         (نادر) score<30 + 4+ conflicts
  // ════════════════════════════════════════════════════════════
  
  var sig, sigC;
  var isRareOpportunity = false;
  
  
    // ════════════════════════════════════════════════════════════
  //  🎯 UNIFIED SIGNAL LOGIC -- Score-Based (متوافق مع AnalysisScreen)
  //  
  //  العتبات الموحّدة:
  //  • score >= 75 + gates.all + opp.priority>=3 → فرصة نادرة ⭐
  //  • score >= 65 + gates.passed >= 2 → شراء قوي
  //  • score >= 55 + gates.passed >= 1 → مراقبة
  //  • score >= 45                    → محايد
  //  • score < 45                     → تخفيف
  //  
  //  ملاحظة: نستخدم score (Block 4) وليس conviction
  //  لضمان التوافق مع AnalysisScreen
  // ════════════════════════════════════════════════════════════
  
  var score = merged.score;
  
  // ─── Level 1: 🛑 Abstain (نادر جداً) ───
  if(score < 30 && conflictCnt >= 4 && tech.gates.passed === 0){
    sig = "انتظر";
    sigC = "#6b7280"; // gray
  }
  
  // ─── Level 2: 🌟 Rare Opportunity ───
  else if(score >= 75 && tech.gates.all && tech.opp.priority >= 3){
    sig = "شراء قوي";
    sigC = "#10c97e"; // mint
    isRareOpportunity = true;
  }
  
  // ─── Level 3: 🚀 Strong Buy ───
  else if(score >= 65 && tech.gates.passed >= 2){
    sig = "شراء قوي";
    sigC = "#10c97e"; // mint
  }
  
  // ─── Level 4: 👁 Watch ───
  else if(score >= 55 && tech.gates.passed >= 1){
    sig = "مراقبة";
    sigC = "#f59e0b"; // amber
  }
  
  // ─── Level 5: ⚖️ Neutral ───
  else if(score >= 45){
    sig = "محايد";
    sigC = "#06b6d4"; // teal
  }
  
  // ─── Level 6: 🔴 Reduce ───
  else{
    sig = "تخفيف";
    sigC = "#f04f5a"; // coral
  }

  
  // ─── Ensemble Warning (metadata only - لا يُغيّر sig) ───
  var ensembleAgreement = ensemble.bullCount >= 2 ? "bullish"
                        : ensemble.bearCount >= 2 ? "bearish"
                        : "mixed";
  var ensembleWarning = null;
  if(sig === "شراء قوي" && ensembleAgreement === "bearish"){
    ensembleWarning = "النماذج الأساسية/السلوكية متحفظة";
  }
  else if(sig === "تخفيف" && ensembleAgreement === "bullish"){
    ensembleWarning = "النماذج تشير لاحتمال انعكاس";
  }
  
  // ─── تطبيق النتيجة ───
  merged.sig = sig;
  merged.sigC = sigC;
  (merged as any).isRareOpportunity = isRareOpportunity;
  (merged as any).ensembleAgreement = ensembleAgreement;
  (merged as any).ensembleWarning = ensembleWarning;

    // ════════════════════════════════════════════════════════════
  //  🎯 STEP 7: Probability -- Softmax 3-way (Professional)
  //  
  //  المبدأ الرياضي:
  //  1. logit_bull = score - 50 + ensemble_bias + gate_bias
  //  2. logit_bear = -logit_bull
  //  3. logit_neutral = -|logit_bull| (تردد = حياد)
  //  4. softmax(logits) → probabilities
  //  
  //  النتيجة:
  //  • score=80 → bull dominant
  //  • score=50 → neutral dominant
  //  • score=20 → bear dominant
  //  
  //  ضمانات:
  //  ✓ Σ probabilities = 100%
  //  ✓ منطقية رياضياً
  //  ✓ متسقة مع score
  // ════════════════════════════════════════════════════════════
  
  // ─── Step 1: حساب logits ───
  // logit_bull = الإشارة الصعودية الخام
  var logit_bull = conviction - 50;
  
  // Ensemble bias (إجماع النماذج)
  var ensembleBias = 0;
  if(ensemble.bullCount === 3) ensembleBias = 10;
  else if(ensemble.bullCount === 2) ensembleBias = 5;
  else if(ensemble.bearCount === 3) ensembleBias = -10;
  else if(ensemble.bearCount === 2) ensembleBias = -5;
  
  // Gate bias (جودة البوابات)
  var gateBias = 0;
  if(tech.gates && tech.gates.passed === 3) gateBias = 5;
  else if(tech.gates && tech.gates.passed === 2) gateBias = 2;
  else if(tech.gates && tech.gates.passed === 0) gateBias = -5;
  
  // إجمالي logit للصعود
  logit_bull = logit_bull + ensembleBias + gateBias;
  
  // logit_bear هو معكوس
  var logit_bear = -logit_bull;
  
  // logit_neutral: عالٍ عند التردد (score قريب من 50)
  // كلما ابتعدنا عن 50، يقل احتمال الحياد
  var logit_neutral = 5 - Math.abs(logit_bull) * 0.4;
  
  // ─── Step 2: تطبيق Softmax 3-way ───
  // _softmax3 موجود في الكود ويتعامل مع logits
  merged.probability = _softmax3(logit_bull, logit_bear, logit_neutral);


    // ════════════════════════════════════════════════
  //  STEP 8: Portfolio Engine
  // ════════════════════════════════════════════════
var riskGateLevel = calcRiskGateLevel(MACRO.vix, STOCKS.filter(x=>x.ch>0).length / STOCKS.length);
  (merged as any).positionSize = calcPositionSize(merged, riskGateLevel);
  (merged as any).correlationGuard = checkCorrelationGuard(stk.sym, []);
  (merged as any).riskGate = riskGateLevel;
  (merged as any).confidence = ct ? ct.confidence : 50;
  
  // ════════════════════════════════════════════════════════════
  //  🎯 STEP 8.5: TRADING PLAN -- Professional Actionable Card
  //  
  //  المبدأ العلمي:
  //  بطاقة احترافية = قرار قابل للتنفيذ
  //  
  //  المكونات:
  //  • Entry: سعر الدخول الحالي
  //  • Stop Loss: ATR-based (1.5×ATR)
  //  • Target 1: Conservative (2.0×ATR)
  //  • Target 2: Aggressive (4.0×ATR)
  //  • R/R Ratio: تقييم الفرصة
  //  • Time Horizon: حسب regime
  //  • Worst Case: % loss إذا ضرب stop
  //  • Action: ما يفعل المستخدم الآن
  // ════════════════════════════════════════════════════════════
  
  // ════════════════════════════════════════════════════════
  //  ATR Calculation -- استخدام البيانات الفعلية
  //  
  //  الأولوية:
  //  1. extras.atrPct (محسوب من ADX في calc9Layers)
  //  2. atr14 (إذا متوفر)
  //  3. fallback: 2% من السعر
  // ════════════════════════════════════════════════════════
  var atrPct = tech.extras?.atrPct;
  var atrV;
  
  if(atrPct && atrPct > 0){
    // الأفضل: ATR محسوب من البيانات الفعلية
    atrV = stk.p * (atrPct / 100);
  } else if(tech.extras?.atr14){
    // البديل: atr14 من ADX
    atrV = tech.extras.atr14;
  } else {
    // fallback آمن: 2% من السعر (وليس 1.5% الثابت)
    atrV = stk.p * 0.02;
  }
  
  // ─── حد أدنى لـ ATR (لا أقل من 1.5% من السعر) ───
  // لتجنب stops قريبة جداً
  atrV = Math.max(atrV, stk.p * 0.015);
  
  // ─── حساب مستويات Entry/Stop/Targets ───
  var currentPrice = stk.p;
  
  // ════════════════════════════════════════════════════════
  //  ATR Multipliers -- مُخصَّصة لكل Regime
  //  
  //  المبدأ العلمي:
  //  • stop ضيق + target واسع = R/R أعلى
  //  • multipliers تتكيف مع طبيعة السوق
  //  • Renaissance Tech methodology
  // ════════════════════════════════════════════════════════
  var stopMultiplier, target1Multiplier, target2Multiplier;
  
  if(regime === "volatile"){
    stopMultiplier = 1.8;
    target1Multiplier = 2.8;
    target2Multiplier = 4.8;
  } else if(regime === "bull"){
    stopMultiplier = 1.5;
    target1Multiplier = 3.0;
    target2Multiplier = 5.5;
  } else if(regime === "bear"){
    stopMultiplier = 1.5;
    target1Multiplier = 2.0;
    target2Multiplier = 3.5;
  } else if(regime === "sideways"){
    stopMultiplier = 1.5;
    target1Multiplier = 2.5;
    target2Multiplier = 4.0;
  } else if(regime === "news-driven"){
    stopMultiplier = 2.0;
    target1Multiplier = 3.0;
    target2Multiplier = 5.0;
  } else { // chop or unknown
    stopMultiplier = 1.7;
    target1Multiplier = 2.5;
    target2Multiplier = 4.0;
  }
  
  // ─── atrMultiplier للـ backward compatibility ───
  var atrMultiplier = stopMultiplier;
  
  // ─── حساب المستويات ───
  var stopLoss = +(currentPrice - atrV * stopMultiplier).toFixed(2);
  var target1 = +(currentPrice + atrV * target1Multiplier).toFixed(2);
  var target2 = +(currentPrice + atrV * target2Multiplier).toFixed(2);
  
  // ─── حساب النسب المئوية ───
  var stopLossPct = +((stopLoss - currentPrice) / currentPrice * 100).toFixed(2);
  var target1Pct = +((target1 - currentPrice) / currentPrice * 100).toFixed(2);
  var target2Pct = +((target2 - currentPrice) / currentPrice * 100).toFixed(2);
  
  // ─── R/R Ratio ───
  var risk_amount = Math.abs(stopLossPct);
  var reward_amount = target1Pct;
  var rrRatio = risk_amount > 0 ? +(reward_amount / risk_amount).toFixed(2) : 0;
  
  var rrLabel = rrRatio >= 3.0 ? "ممتاز ⭐"
              : rrRatio >= 2.0 ? "جيد ✓"
              : rrRatio >= 1.5 ? "مقبول"
              : "ضعيف ⚠";
  
  // ─── Time Horizon (حسب regime) ───
  var timeHorizon = regime === "volatile" ? "1-3 أيام"
                  : regime === "news-driven" ? "2-5 أيام"
                  : regime === "bull" ? "5-15 يوم"
                  : regime === "bear" ? "3-7 أيام"
                  : regime === "sideways" ? "10-20 يوم"
                  : "7-14 يوم"; // chop
  
  // ─── Worst Case Scenario ───
  var worstCase = {
    loss: stopLossPct,
    percentage: Math.abs(stopLossPct),
    description: stopLossPct < -8 ? "خسارة عالية"
               : stopLossPct < -5 ? "خسارة متوسطة"
               : stopLossPct < -3 ? "خسارة محدودة"
               : "خسارة بسيطة"
  };
  
  // ─── Action Plan ───
  var actionPlan;
  var actionColor;
  
  if(merged.sig === "شراء قوي" && isRareOpportunity){
    actionPlan = `🌟 فرصة نادرة! اشترِ بـ ${(merged as any).positionSize?.pct || 15}% من المحفظة`;
    actionColor = "#10c97e";
  }
  else if(merged.sig === "شراء قوي"){
    actionPlan = `🚀 اشترِ بـ ${(merged as any).positionSize?.pct || 10}% من المحفظة`;
    actionColor = "#10c97e";
  }
  else if(merged.sig === "مراقبة"){
    actionPlan = `👁 راقب - انتظر الإشارة الأقوى أو تأكيد الكسر`;
    actionColor = "#f59e0b";
  }
  else if(merged.sig === "محايد"){
    actionPlan = `⚖️ لا تشترِ - السهم في منطقة محايدة`;
    actionColor = "#06b6d4";
  }
  else if(merged.sig === "تخفيف"){
    actionPlan = `🔴 إذا كنت مالكاً: قلّص المركز - تجنّب الدخول الجديد`;
    actionColor = "#f04f5a";
  }
  else { // انتظر
    actionPlan = `🛑 انتظر - لا تتداول الآن (إشارات متعارضة)`;
    actionColor = "#6b7280";
  }
  
  // ─── Risk Gate Warning ───
  var riskWarning = null;
  if(riskGateLevel === "DANGER"){
    riskWarning = "⚠️ السوق في حالة خطر - تجنّب الدخول";
    actionPlan = "🛑 " + riskWarning;
    actionColor = "#dc2626";
  }
  else if(riskGateLevel === "CAUTION"){
    riskWarning = "⚠️ السوق متقلب - قلّل حجم المركز";
  }
  
  // ─── تجميع Trading Plan ───
  (merged as any).tradingPlan = {
    entry: currentPrice,
    stopLoss,
    stopLossPct,
    target1,
    target1Pct,
    target2,
    target2Pct,
    rrRatio,
    rrLabel,
    timeHorizon,
    worstCase,
    actionPlan,
    actionColor,
    riskWarning,
    // معلومات إضافية للمستخدم المحترف
    atrUsed: +atrV.toFixed(3),
    atrMultiplier,
    regime,
  };
  // ════════════════════════════════════════════════
  //  STEP 9: Metadata
  // ════════════════════════════════════════════════
  (merged as any).conviction = {
    LA, LB, LC, wA, wB, wC,
    riskMult: +riskMult.toFixed(2),
    finalMult: +finalMult.toFixed(3),
    dcfScore, fmScore: fm.composite, emScore,
    eqScore: eq.composite, eqGrade: eq.grade,
    optScore, insScore: ins.score, altScore: alt.composite,
    dcfUpside: dcf.upside, emUpside: em.upside,
    dcfRating: dcf.rating, fmGrade: fm.grade,
    fundConflict, lbLcConflict,
    ensemble, confidenceThreshold: ct,
    feedbackApplied: WC_adapted !== tech.weights,
    risk: {sharpe: risk.sharpe, sortino: risk.sortino, alpha: risk.alpha, volatility: risk.volatility},
    inter: {multiplier: inter.multiplier, signal: inter.signal},
    micro: micro ? {composite: micro.composite, ofi: micro.ofi} : null,
    regime,
    tasiCtx: tech.tasiCtx || null,
  };

  return merged;
  
  } finally {
    // 🆕 إعادة MACRO لقيمته السابقة (مهم لتجنّب التسرّب بين الاستدعاءات)
    if (_macroPrevious) restoreMacro(_macroPrevious);
  }
}

/* ══════════════════════════════════════════════════════════
   الصادرات — exported for use by AnalysisScreen and others
   ══════════════════════════════════════════════════════════ */
export {
  seedRng, genBars,
  calcEMA,
calcStoch,
calcSMA, calcVPVR,
  calcIVWAP, generateBarsRadar, analyzeStockRadar, calc9Layers,
  calcFactorModel, calcEarningsModel,   calcDCF,
  calcEarningsQuality,
  calcInsiderTransactions, calcAlternativeData,
  calcRiskAttribution, calcIntermarket, calcMicrostructure,
  calcPositionSize, calcRiskGateLevel, checkCorrelationGuard,
  calcPortfolioSharpe, calcAdaptiveThreshold, 
  calcTasiContext, calcMacroFull, applyMacroGate,
  detectMarketRegime, buildDynamicWeights, reduceCorrelation,
  calcConflictPenalty, stockHealth, ensembleVote,
  calcConfidenceThreshold, applyFeedbackToWeights,
  loadFeedbackState, saveFeedbackState,
  getAdaptiveWeightAdjustment, recordFeedback,
scoreWord, _emptyHealthResult,
MACRO, OIL_SENS, RATE_SENS,
  TASI_CORR_GROUPS, KELLY_CONFIG, RISK_GATE,
};
