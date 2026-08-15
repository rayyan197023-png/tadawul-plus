/**
 * RADAR ENGINE - V2.0
 *
 * ✨ Improvements:
 * 1. Bull + Bear Order Blocks
 * 2. SSL + BSL (Liquidity Sweeps)
 * 3. 9 Layers (added MACD)
 * 4. Dynamic Wyckoff confidence
 * 5. Smart Stop Loss/Targets (positionEngine)
 *
 * Pure functions -- no React, no UI, no API calls.
 */

import {
  calcRSI,
  calcRSIFull,
  calcATR,
  calcVWAP,
  calcCMF,
  calcOBV,
  calcMACD,
  calcMarketStructure,
  calcIVWAP,
  calcEMA,
} from './technicalEngine';

/**
 * ✨ Calculate order blocks (Bull + Bear)
 * Bull OB: institutional buy zone
 * Bear OB: institutional sell zone
 */
export function calcOrderBlocks(bars: any[], atr: number): any {
  if (!bars || bars.length < 15 || !atr || atr <= 0) {
    return { inBullOB:false, inRef:false, hasFVG:false, inBearOB:false, bullCount:0, bearCount:0, score:2, label:'بيانات غير كافية' };
  }
  const obs: any[] = [], cur = bars[bars.length - 1].c, n = bars.length;

const recentVol = bars.length >= 20 ? bars.slice(-20).reduce((s: number, b: any) => s + Math.abs(b.pct ?? 0), 0) / 20 : 1.5;
  const atrMult   = Math.max(1.2, Math.min(2.0, 1.5 * recentVol / 1.5));

  for (let i = 1; i < n - 2; i++) {
    const b = bars[i];
    
    // Bull OB: bearish candle followed by strong upward impulse
    if (b.c < b.o) {
      const imp = Math.max(
        bars[i+1] ? bars[i+1].c - b.c : 0,
        bars[i+2] ? bars[i+2].c - b.c : 0,
        bars[i+3] && i+3 < n ? bars[i+3].c - b.c : 0
      );
      if (imp >= atr * atrMult) {
        const fresh = cur > b.lo, inOB = cur >= b.lo && cur <= b.hi;
        const inRef = cur >= b.lo && cur <= (b.hi + b.lo) / 2;
        const fvg   = i+2 < n && bars[i].hi < bars[i+2].lo;
        obs.push({ type: 'bull', hi: b.hi, lo: b.lo, mid: (b.hi + b.lo) / 2, strength: +(imp / atr).toFixed(2), fresh, inOB, inRef, fvg });
      }
    }
    
    // ✨ Bear OB: bullish candle followed by strong downward impulse
    if (b.c > b.o) {
      const imp = Math.max(
        bars[i+1] ? b.c - bars[i+1].c : 0,
        bars[i+2] ? b.c - bars[i+2].c : 0,
        bars[i+3] && i+3 < n ? b.c - bars[i+3].c : 0
      );
      if (imp >= atr * atrMult) {
        const fresh = cur < b.hi, inOB = cur >= b.lo && cur <= b.hi;
        const fvg = i+2 < n && bars[i].lo > bars[i+2].hi;
        obs.push({ type: 'bear', hi: b.hi, lo: b.lo, mid: (b.hi + b.lo) / 2, strength: +(imp / atr).toFixed(2), fresh, inOB, fvg });
      }
    }
  }

  // Bull analysis
  const bulls    = obs.filter((o: any) => o.type === 'bull' && o.fresh).sort((a: any, b: any) => (b.strength + (b.fvg ? 2 : 0)) - (a.strength + (a.fvg ? 2 : 0)));
  const bestBull = bulls[0] ?? null;
  const inBullOB = !!(bestBull && bestBull.inOB);
  const inRef    = !!(bestBull && bestBull.inRef);
  const hasFVG   = !!(bestBull && bestBull.fvg);
  const bullStrength = bestBull ? bestBull.strength : 0;
  
  // ✨ Bear analysis
  const bears = obs.filter((o: any) => o.type === 'bear' && o.fresh).sort((a: any, b: any) => b.strength - a.strength);
  const bestBear = bears[0] ?? null;
  const inBearOB = !!(bestBear && bestBear.inOB);
  
  // Score (Bull OB increases, Bear OB decreases)
  const baseScore = bulls.length > 0 
    ? Math.round(2 + 14 * Math.tanh(bullStrength / 2.5) + (inRef ? 3 : inBullOB ? 1.5 : 0))
    : 2;
  let score = Math.min(20, Math.round(baseScore + (hasFVG ? 2 : 0)));
  
  // Penalty if in Bear OB
  if (inBearOB) score = Math.max(2, score - 4);

  return { 
    inBullOB, inRef, hasFVG, 
    inBearOB,
    bullCount: bulls.length, 
    bearCount: bears.length,
    score,
    label: inRef       ? 'منطقة شراء قوية ✓'
         : inBullOB && hasFVG ? 'منطقة شراء مع فجوة'
         : inBullOB    ? 'داخل منطقة شراء'
         : inBearOB    ? '⚠ داخل منطقة بيع'
         : bulls.length > 0 ? 'منطقة شراء متاحة' : 'لا منطقة شراء' 
  };
}

/**
 * ✨ Liquidity sweep detection (SSL + BSL)
 * SSL: Sell-Side Liquidity (under support)
 * BSL: Buy-Side Liquidity (above resistance)
 */
export function calcLiqSweep(bars: any[], atr: number): any {
  if (!bars || bars.length < 15 || !atr || atr <= 0) {
    return { recoveredSSL:false, recoveredBSL:false, sslCount:0, bslCount:0, sslQuality:0, score:3, label:'بيانات غير كافية' };
  }
  const cur    = bars[bars.length - 1].c;

  const avgVol = bars.reduce((s: number, b: any) => s + b.vol, 0) / bars.length;
  const sweeps: any[] = [];
  const lb     = Math.min(20, Math.max(10, Math.round(bars.length * 0.20)));

  for (let i = lb; i < bars.length - 1; i++) {
    const b = bars[i], win = bars.slice(i - lb, i);
    const pH = Math.max(...win.map((x: any) => x.hi));
    const pL = Math.min(...win.map((x: any) => x.lo));
    const volOk = b.vol > avgVol * 1.5;
    const nx    = bars[i + 1];
    
    // SSL Detection
    if (b.lo < pL && b.c > pL && (pL - b.lo) >= atr * 0.5) {
      const conf = nx && nx.c > nx.o;
      const eq   = win.filter((x: any) => Math.abs(x.lo - pL) / pL < 0.0015).length >= 2;
      sweeps.push({ type: 'SSL', q: (volOk ? 1 : 0) + (eq ? 1 : 0) + (conf ? 1 : 0) });
    }
    
    // ✨ BSL Detection (above resistance)
    if (b.hi > pH && b.c < pH && (b.hi - pH) >= atr * 0.5) {
      const conf = nx && nx.c < nx.o;
      const eq = win.filter((x: any) => Math.abs(x.hi - pH) / pH < 0.0015).length >= 2;
      sweeps.push({ type: 'BSL', q: (volOk ? 1 : 0) + (eq ? 1 : 0) + (conf ? 1 : 0) });
    }
  }

  const ssls   = sweeps.filter((s: any) => s.type === 'SSL');
  const bsls   = sweeps.filter((s: any) => s.type === 'BSL');
  const recSSL = ssls.length > 0;
  const recBSL = bsls.length > 0;
  const q      = recSSL ? (ssls[ssls.length - 1].q ?? 0) : 0;
  
  let score = recSSL
    ? Math.round(Math.min(20, Math.max(6, 6 + 10 * Math.tanh(q / 1.2) + Math.min(4, ssls.length * 0.8))))
    : 3;
  
  // Penalty if BSL detected (buy-side liquidity grabbed = top warning)
  if (recBSL && !recSSL) score = Math.max(2, score - 3);

  return { 
    recoveredSSL: recSSL, 
    recoveredBSL: recBSL,
    sslCount: ssls.length, 
    bslCount: bsls.length,
    sslQuality: q, 
    score: Math.min(20, score),
    label: recSSL && q === 3 ? 'اصطياد مثالي ✓✓✓'
         : recSSL && q === 2 ? 'اصطياد قوي ✓✓'
         : recSSL            ? 'تعافٍ من الاصطياد'
         : recBSL            ? '⚠ اصطياد BSL (تحذير قمة)'
         : ssls.length > 0   ? 'اصطياد حديث' 
         : 'لا اصطياد' 
  };
}

/**
 * ✨ Wyckoff phase detection - WITH DYNAMIC CONFIDENCE
 */
function calcWyckoff(bars: any[]): any {
  const n   = bars.length;
  const cur = bars[n - 1].c;
  const rng = bars.slice(-20);

  const hi   = Math.max(...rng.map((b: any) => b.hi));
  const lo   = Math.min(...rng.map((b: any) => b.lo));
  const rngW = hi - lo || 1;
  const avg  = rng.reduce((s: number, b: any) => s + b.c, 0) / rng.length;

  // Position in range (0% = at low, 100% = at high)
  const pfl  = (cur - lo) / rngW * 100;

  // Price trend
  const half = Math.floor(rng.length / 2);
  const avgFirst  = rng.slice(0, half).reduce((s: number, b: any) => s + b.c, 0) / half;
  const avgSecond = rng.slice(half).reduce((s: number, b: any) => s + b.c, 0) / (rng.length - half);
  const trend = (avgSecond - avgFirst) / (avgFirst || 1) * 100;

  // Volume ratio
  const avgVol = bars.reduce((s: number, b: any) => s + b.vol, 0) / bars.length || 1;
  const rv     = bars.slice(-5).reduce((s: number, b: any) => s + b.vol, 0) / 5 / avgVol;

  // Volatility contraction
  const rangeWidth = rngW / (avg || 1) * 100;

  const BLUE = '#4d9fff', T2 = '#8a90a8', GOLD = '#f0c050', RED = '#ff5f6a';

  // ✨ Dynamic confidence calculation
  function calcConf(baseConf: number, signals: number[]): number {
    const avgStrength = signals.reduce((s: number, v: number) => s + v, 0) / signals.length;
    return Math.round(baseConf + avgStrength * 25); // 25 points max bonus
  }

  // Spring: near support + increasing volume + prior downtrend
  if (pfl < 35 && rv > 1.2 && trend < 2) {
    const springStrength = [
      (35 - pfl) / 35,        // closer to support = stronger
      Math.min(1, (rv - 1) / 1), // higher volume = stronger
      trend < -2 ? 1 : 0.5,   // prior downtrend confirms
    ];
    return { 
      phase: 'نهاية تجميع (Spring)', 
      col: BLUE, 
      conf: calcConf(50, springStrength),
      pfl: +pfl.toFixed(0),
      strength: +(springStrength.reduce((s: number,v: number)=>s+v,0)/3).toFixed(2)
    };
  }

  // Markup
  if (trend > 2.5 && pfl > 60) {
    const markupStrength = [
      Math.min(1, (trend - 2.5) / 5),
      (pfl - 60) / 40,
      rv > 1 ? 1 : 0.5,
    ];
    return { 
      phase: 'مرحلة ارتفاع (Markup)', 
      col: BLUE, 
      conf: calcConf(45, markupStrength),
      pfl: +pfl.toFixed(0),
      strength: +(markupStrength.reduce((s: number,v: number)=>s+v,0)/3).toFixed(2)
    };
  }

  // Distribution
  if (pfl > 65 && trend < 0 && rv > 1.1) {
    const distStrength = [
      (pfl - 65) / 35,
      Math.min(1, Math.abs(trend) / 5),
      Math.min(1, (rv - 1) / 1),
    ];
    return { 
      phase: 'تصريف (Distribution)', 
      col: RED, 
      conf: calcConf(40, distStrength),
      pfl: +pfl.toFixed(0),
      strength: +(distStrength.reduce((s: number,v: number)=>s+v,0)/3).toFixed(2)
    };
  }

  // Markdown
  if (trend < -2.5 && pfl < 40) {
    const markdownStrength = [
      Math.min(1, Math.abs(trend) / 5),
      (40 - pfl) / 40,
      rv > 0.8 ? 1 : 0.5,
    ];
    return { 
      phase: 'مرحلة هبوط (Markdown)', 
      col: GOLD, 
      conf: calcConf(35, markdownStrength),
      pfl: +pfl.toFixed(0),
      strength: +(markdownStrength.reduce((s: number,v: number)=>s+v,0)/3).toFixed(2)
    };
  }

  // Consolidation
  if (rangeWidth < 3.0 && rv < 0.85) {
    const consStrength = [
      (3.0 - rangeWidth) / 3.0,
      (0.85 - rv) / 0.85,
      0.5,
    ];
    return { 
      phase: 'توحيد (Consolidation)', 
      col: T2, 
      conf: calcConf(35, consStrength),
      pfl: +pfl.toFixed(0),
      strength: +(consStrength.reduce((s: number,v: number)=>s+v,0)/3).toFixed(2)
    };
  }

  return { phase: 'محايد', col: T2, conf: 25, pfl: +pfl.toFixed(0), strength: 0.3 };
}

/**
 * ✨ 9-Layer Opportunity Score (TRUE 9 LAYERS!)
 *
 * @param {Stock} stk
 * @param {OHLCBar[]} bars
 * @returns {{ totalScore, layers, regime, signals, stopLoss, targets }}
 */
export function calcRadarScore(stk: any, bars: any[]): any {
  if (!bars || bars.length < 15) {
    return { totalScore: 0, layers: [], regime: 'insufficient_data' };
  }

  const atr     = calcATR(bars, 14);
  const rsiFull = calcRSIFull(bars, 14);
  const rsi     = rsiFull.value;
  const cmf     = calcCMF(bars);
  const obv     = calcOBV(bars);
  const macd    = bars.length >= 35 ? calcMACD(bars) : null;
  const ms      = calcMarketStructure(bars);
  const ob      = calcOrderBlocks(bars, atr);
  const liq     = calcLiqSweep(bars, atr);
  const vwap    = calcIVWAP(bars, stk);
  const cur     = bars[bars.length - 1].c;

  // ── Layer 5: RSI
  let rsiScore;
  if      (rsi >= 30 && rsi < 50)  rsiScore = Math.round(14 + (50 - rsi) / 20 * 4);
  else if (rsi >= 50 && rsi < 65)  rsiScore = Math.round(14 - (rsi - 50) / 15 * 4);
  else if (rsi <  30)              rsiScore = Math.round(8  + (30 - rsi) / 10 * 4);
  else if (rsi >= 65 && rsi < 80)  rsiScore = Math.round(10 - (rsi - 65) / 15 * 6);
  else                             rsiScore = 3;
  rsiScore = Math.max(3, Math.min(18, rsiScore));

  // ── Layer 6: CMF
  const cmfScore = Math.round(10 + 8 * Math.tanh(cmf / 0.08));

  // ── Layer 7: OBV
  const obvBase  = obv.rising ? 13 : 7;
  const obvBonus = Math.round(Math.tanh(obv.obvZ / 1.5) * 5);
  const obvScore = Math.max(3, Math.min(18, obvBase + obvBonus));

  // ── Layer 8: Wyckoff
  const wyckoff = calcWyckoff(bars);
  const wyckoffScore = wyckoff.phase.includes('Spring')      ? 17
                     : wyckoff.phase.includes('Markup')       ? 15
                     : wyckoff.phase.includes('Consolidation')? 11
                     : wyckoff.phase.includes('Distribution') ?  5 
                     : wyckoff.phase.includes('Markdown')     ?  4 : 9;

  // ✨ Layer 9: MACD (NEW!)
  let macdScore = 10;
  if (macd) {
    if (macd.crossover === 'bullish_cross') macdScore = 17;
    else if (macd.crossover === 'bearish_cross') macdScore = 4;
    else if (macd.histogram > 0 && macd.histMomentum === 'strengthening') macdScore = 14;
    else if (macd.histogram > 0 && macd.histMomentum === 'weakening') macdScore = 11;
    else if (macd.histogram < 0 && macd.histMomentum === 'weakening') macdScore = 9;
    else if (macd.histogram < 0 && macd.histMomentum === 'strengthening') macdScore = 5;
    
    // Divergence bonus
    if (macd.divergence === 'bullish') macdScore = Math.min(18, macdScore + 3);
    if (macd.divergence === 'bearish') macdScore = Math.max(2, macdScore - 3);
  }

  // ✨ 9 Weighted Layers
  const layers: any[] = [
    { id: 'structure', label: 'هيكل السوق',     score: ms.score,      label2: ms.label,   weight: 1.5 },
    { id: 'ob',        label: 'مناطق الشراء',   score: ob.score,      label2: ob.label,   weight: 1.4 },
    { id: 'sweep',     label: 'اصطياد السيولة', score: liq.score,     label2: liq.label,  weight: 1.3 },
    { id: 'vwap',      label: 'VWAP المؤسسي',   score: vwap.score,    label2: vwap.label, weight: 1.2 },
    { id: 'rsi',       label: 'RSI/زخم',        score: rsiScore,      label2: `RSI: ${rsi.toFixed ? rsi.toFixed(1) : rsi}`, weight: 1.0 },
    { id: 'cmf',       label: 'تدفق المال',     score: cmfScore,      label2: `CMF: ${cmf}`, weight: 1.1 },
    { id: 'obv',       label: 'OBV/حجم',        score: obvScore,      label2: obv.rising ? 'حجم صاعد' : 'حجم هابط', weight: 1.1 },
    { id: 'wyckoff',   label: 'وايكوف',         score: wyckoffScore,  label2: `${wyckoff.phase} (${wyckoff.conf}%)`, weight: 0.9 },
    { id: 'macd',      label: 'MACD',           score: macdScore,     label2: macd ? (macd.crossover || macd.trend) : 'بيانات غير كافية', weight: 1.0 },
  ];

  const totalWeight = layers.reduce((s: number, l: any) => s + l.weight, 0);
  const rawWeighted = layers.reduce((s: number, l: any) => s + l.score * l.weight, 0) / totalWeight;
  const totalScore  = Math.round((rawWeighted / 20) * 100);
  const atrPct      = atr / cur;

  // ✨ Smart Stop Loss & Targets (using positionEngine logic)
  // Adaptive ATR multiplier based on Wyckoff + Health
  let stopMultiplier = 1.5;
  let targetMultiplier1 = 2.0;
  let targetMultiplier2 = 3.5;
  let targetMultiplier3 = 5.0;
  
  if (wyckoff.phase.includes('Spring')) {
    stopMultiplier = 1.2;     // Tight stop at Spring
    targetMultiplier1 = 2.5;
    targetMultiplier2 = 4.0;
    targetMultiplier3 = 6.0;
  } else if (wyckoff.phase.includes('Markup')) {
    stopMultiplier = 2.0;
    targetMultiplier1 = 2.5;
    targetMultiplier2 = 4.0;
    targetMultiplier3 = 5.5;
  } else if (wyckoff.phase.includes('Distribution') || wyckoff.phase.includes('Markdown')) {
    stopMultiplier = 1.0;     // Very tight - dangerous zone
    targetMultiplier1 = 1.5;
    targetMultiplier2 = 2.5;
    targetMultiplier3 = 3.5;
  }
  
  const stopLossPrice = +(cur - atr * stopMultiplier).toFixed(2);
  const stopLossPct = +((stopLossPrice - cur) / cur * 100).toFixed(2);
  
  const targets = [
    { 
      price: +(cur + atr * targetMultiplier1).toFixed(2),
      pct: +((atr * targetMultiplier1) / cur * 100).toFixed(2),
      rr: +(targetMultiplier1 / stopMultiplier).toFixed(1),
      sell: 33,
    },
    { 
      price: +(cur + atr * targetMultiplier2).toFixed(2),
      pct: +((atr * targetMultiplier2) / cur * 100).toFixed(2),
      rr: +(targetMultiplier2 / stopMultiplier).toFixed(1),
      sell: 33,
    },
    { 
      price: +(cur + atr * targetMultiplier3).toFixed(2),
      pct: +((atr * targetMultiplier3) / cur * 100).toFixed(2),
      rr: +(targetMultiplier3 / stopMultiplier).toFixed(1),
      sell: 34,
    },
  ];

  // Compile signals
  const signals: any[] = [];
  if (rsiFull.divergence === 'bullish') signals.push({ type: 'bullish', msg: 'RSI: تباعد إيجابي (Bullish Divergence)' });
  if (rsiFull.divergence === 'bearish') signals.push({ type: 'bearish', msg: 'RSI: تباعد سلبي (Bearish Divergence)' });
  if (macd?.crossover === 'bullish_cross') signals.push({ type: 'bullish', msg: 'MACD: تقاطع صاعد (Golden Cross)' });
  if (macd?.crossover === 'bearish_cross') signals.push({ type: 'bearish', msg: 'MACD: تقاطع هابط (Death Cross)' });
  if (macd?.divergence === 'bullish') signals.push({ type: 'bullish', msg: 'MACD: تباعد إيجابي' });
  if (macd?.divergence === 'bearish') signals.push({ type: 'bearish', msg: 'MACD: تباعد سلبي' });
  if (ms.bosBull) signals.push({ type: 'bullish', msg: 'كسر هيكل صاعد BOS↑' });
  if (ms.bosBear) signals.push({ type: 'bearish', msg: 'كسر هيكل هابط BOS↓' });
  if (ob.inRef) signals.push({ type: 'bullish', msg: 'منطقة شراء قوية (50% Refinement)' });
  if (ob.inBearOB) signals.push({ type: 'bearish', msg: '⚠ داخل منطقة بيع' });
  if (liq.recoveredSSL) signals.push({ type: 'bullish', msg: 'تعافٍ من اصطياد السيولة' });
  if (liq.recoveredBSL) signals.push({ type: 'bearish', msg: '⚠ اصطياد BSL (تحذير قمة)' });
  if (wyckoff.phase.includes('Spring')) signals.push({ type: 'bullish', msg: `Wyckoff Spring (ثقة ${wyckoff.conf}%)` });
  if (wyckoff.phase.includes('Distribution')) signals.push({ type: 'bearish', msg: `Wyckoff Distribution (ثقة ${wyckoff.conf}%)` });

  return {
    totalScore,
    layers,
    atr,
    atrPct: +(atrPct * 100).toFixed(2),
    rsi,
    rsiFull,
    cmf,
    obv,
    macd,
    ms,
    ob,
    liq,
    vwap,
    wyckoff,
    signals,
    stopLoss: {
      price: stopLossPrice,
      pct: stopLossPct,
      method: `ATR × ${stopMultiplier} (${wyckoff.phase})`,
    },
    targets,


    // متوسط R:R مرجّح بنسب البيع -- ليس "عائداً متوقعاً" احتمالياً
    weightedRR: +((targets[0].rr * 0.33 + targets[1].rr * 0.33 + targets[2].rr * 0.34)).toFixed(1),
    expectedRR: +((targets[0].rr * 0.33 + targets[1].rr * 0.33 + targets[2].rr * 0.34)).toFixed(1),
    regime: ms.trend,
  };
}

/**
 * Score multiple stocks and rank them
 */
export function rankStocksByRadar(stocks: any[], barsMap: any): any[] {
  return stocks
    .map((s: any) => ({ stock: s, radarScore: calcRadarScore(s, (barsMap as any)[s.sym] ?? []) }))
    .sort((a: any, b: any) => b.radarScore.totalScore - a.radarScore.totalScore)
    .map((item: any, i: number) => ({ ...item, rank: i + 1 }));
}
