/**
 * RADAR ENGINE
 *
 * Opportunity scoring system.
 * Extracted from TadawulPlus_v5_engine3_final.jsx (calc9Layers function).
 *
 * Returns a health score (0-100) with layer breakdown.
 * Pure functions — no React, no UI, no API calls.
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
 * Calculate order blocks (institutional buy zones)
 */
function calcOrderBlocks(bars, atr) {
  const obs = [], cur = bars[bars.length - 1].c, n = bars.length;
  const recentVol = bars.length >= 20 ? bars.slice(-20).reduce((s, b) => s + Math.abs(b.pct ?? 0), 0) / 20 : 1.5;
  const atrMult   = Math.max(1.2, Math.min(2.0, 1.5 * recentVol / 1.5));

  for (let i = 1; i < n - 2; i++) {
    const b = bars[i];
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
  }

  const bulls    = obs.filter(o => o.type === 'bull' && o.fresh).sort((a, b) => (b.strength + (b.fvg ? 2 : 0)) - (a.strength + (a.fvg ? 2 : 0)));
  const best     = bulls[0] ?? null;
  const inBullOB = !!(best && best.inOB);
  const inRef    = !!(best && best.inRef);
  const hasFVG   = !!(best && best.fvg);
  const strength = best ? best.strength : 0;
  const baseScore = bulls.length > 0 ? Math.round(2 + 14 * Math.tanh(strength / 2.5) + (inRef ? 3 : inBullOB ? 1.5 : 0)) : 2;
  const score     = Math.min(20, Math.round(baseScore + (hasFVG ? 2 : 0)));

  return { inBullOB, inRef, hasFVG, bullCount: bulls.length, score,
    label: inRef       ? 'منطقة شراء قوية ✓'
         : inBullOB && hasFVG ? 'منطقة شراء مع فجوة'
         : inBullOB    ? 'داخل منطقة شراء'
         : bulls.length > 0 ? 'منطقة شراء متاحة' : 'لا منطقة شراء' };
}

/**
 * Liquidity sweep detection
 */
function calcLiqSweep(bars, atr) {
  const cur    = bars[bars.length - 1].c;
  const avgVol = bars.reduce((s, b) => s + b.vol, 0) / bars.length;
  const sweeps = [];
  const lb     = Math.min(20, Math.max(10, Math.round(bars.length * 0.20)));

  for (let i = lb; i < bars.length - 1; i++) {
    const b = bars[i], win = bars.slice(i - lb, i);
    const pL = Math.min(...win.map(x => x.lo));
    const volOk = b.vol > avgVol * 1.5;
    const nx    = bars[i + 1];
    if (b.lo < pL && b.c > pL && (pL - b.lo) >= atr * 0.5) {
      const conf = nx && nx.c > nx.o;
      const eq   = win.filter(x => Math.abs(x.lo - pL) / pL < 0.0015).length >= 2;
      sweeps.push({ type: 'SSL', q: (volOk ? 1 : 0) + (eq ? 1 : 0) + (conf ? 1 : 0) });
    }
  }

  const ssls   = sweeps.filter(s => s.type === 'SSL');
  const recSSL = ssls.length > 0;
  const q      = recSSL ? (ssls[ssls.length - 1].q ?? 0) : 0;
  const score  = recSSL
    ? Math.round(Math.min(20, Math.max(6, 6 + 10 * Math.tanh(q / 1.2) + Math.min(4, ssls.length * 0.8))))
    : 3;

  return { recoveredSSL: recSSL, sslCount: ssls.length, sslQuality: q, score: Math.min(20, score),
    label: recSSL && q === 3 ? 'اصطياد مثالي ✓✓✓'
         : recSSL && q === 2 ? 'اصطياد قوي ✓✓'
         : recSSL            ? 'تعافٍ من الاصطياد'
         : ssls.length > 0   ? 'اصطياد حديث' : 'لا اصطياد' };
}

/**
 * Wyckoff phase detection
 */
function calcWyckoff(bars, atr) {
  const n   = bars.length;
  const cur = bars[n - 1].c;
  const rng = bars.slice(-20);

  const hi   = Math.max(...rng.map(b => b.hi));
  const lo   = Math.min(...rng.map(b => b.lo));
  const rngW = hi - lo || 1;
  const avg  = rng.reduce((s, b) => s + b.c, 0) / rng.length;

  // Position in range (0% = at low, 100% = at high)
  const pfl  = (cur - lo) / rngW * 100;

  // Price trend: compare first half vs second half of window
  const half = Math.floor(rng.length / 2);
  const avgFirst  = rng.slice(0, half).reduce((s, b) => s + b.c, 0) / half;
  const avgSecond = rng.slice(half).reduce((s, b) => s + b.c, 0) / (rng.length - half);
  const trend = (avgSecond - avgFirst) / (avgFirst || 1) * 100; // % trend over window

  // Recent volume ratio (last 5 bars vs full window average)
  const avgVol = bars.reduce((s, b) => s + b.vol, 0) / bars.length || 1;
  const rv     = bars.slice(-5).reduce((s, b) => s + b.vol, 0) / 5 / avgVol;

  // Volatility contraction (Wyckoff consolidation = narrow range)
  const rangeWidth = rngW / (avg || 1) * 100; // range as % of price

  const BLUE = '#4d9fff', T2 = '#8a90a8', GOLD = '#f0c050', RED = '#ff5f6a';

  // Spring: near support (pfl < 35%) + increasing volume + prior downtrend turning
  if (pfl < 35 && rv > 1.2 && trend < 2)
    return { phase: 'نهاية تجميع (Spring)', col: BLUE, conf: 60, pfl: +pfl.toFixed(0) };

  // Markup (uptrend with HH structure): trend strongly positive + price in upper range
  if (trend > 2.5 && pfl > 60)
    return { phase: 'مرحلة ارتفاع (Markup)', col: BLUE, conf: 55, pfl: +pfl.toFixed(0) };

  // Distribution: price near high + volume expanding + trend flattening/declining
  if (pfl > 65 && trend < 0 && rv > 1.1)
    return { phase: 'تصريف (Distribution)', col: RED, conf: 50, pfl: +pfl.toFixed(0) };

  // Markdown (downtrend): declining price + price in lower range
  if (trend < -2.5 && pfl < 40)
    return { phase: 'مرحلة هبوط (Markdown)', col: GOLD, conf: 45, pfl: +pfl.toFixed(0) };

  // Consolidation: narrow range with declining volume
  if (rangeWidth < 3.0 && rv < 0.85)
    return { phase: 'توحيد (Consolidation)', col: T2, conf: 45, pfl: +pfl.toFixed(0) };

  return { phase: 'محايد', col: T2, conf: 30, pfl: +pfl.toFixed(0) };
}

/**
 * 9-Layer Opportunity Score
 * Main radar engine function.
 *
 * @param {Stock} stk
 * @param {OHLCBar[]} bars
 * @returns {{ totalScore, layers, regime, signals, stopLoss, targets }}
 */
export function calcRadarScore(stk, bars) {
  if (!bars || bars.length < 15) {
    return { totalScore: 0, layers: [], regime: 'insufficient_data' };
  }

  const atr    = calcATR(bars, 14);
  const rsiFull = calcRSIFull(bars, 14);
  const rsi    = rsiFull.value;
  const cmf    = calcCMF(bars);
  const obv    = calcOBV(bars);
  const macd   = bars.length >= 35 ? calcMACD(bars) : null;
  const ms     = calcMarketStructure(bars);
  const ob     = calcOrderBlocks(bars, atr);
  const liq    = calcLiqSweep(bars, atr);
  const vwap   = calcIVWAP(bars, stk);
  const cur    = bars[bars.length - 1].c;

  // ── Layer 5: RSI — continuous scoring, decimal-aware
  // Optimal buy zone: 30-50 (pullback in uptrend)
  // Danger zone: >70 (overbought), <25 (crash risk)
  let rsiScore;
  if      (rsi >= 30 && rsi < 50)  rsiScore = Math.round(14 + (50 - rsi) / 20 * 4); // 14-18
  else if (rsi >= 50 && rsi < 65)  rsiScore = Math.round(14 - (rsi - 50) / 15 * 4); // 10-14
  else if (rsi <  30)              rsiScore = Math.round(8  + (30 - rsi) / 10 * 4);  // 8-12 (oversold can mean crash)
  else if (rsi >= 65 && rsi < 80)  rsiScore = Math.round(10 - (rsi - 65) / 15 * 6); // 4-10
  else                             rsiScore = 3; // >80: extreme overbought
  rsiScore = Math.max(3, Math.min(18, rsiScore));

  // ── Layer 6: CMF — continuous scoring
  // tanh gives smooth curve without sharp cliffs
  const cmfScore = Math.round(10 + 8 * Math.tanh(cmf / 0.08));
  // Range: cmf=-0.3→3, cmf=0→10, cmf=+0.3→17, capped 3-18

  // ── Layer 7: OBV — continuous with Z-score weight
  const obvBase  = obv.rising ? 13 : 7;
  const obvBonus = Math.round(Math.tanh(obv.obvZ / 1.5) * 5);
  const obvScore = Math.max(3, Math.min(18, obvBase + obvBonus));

  // ── Layer 8: Wyckoff Phase (already defined above)
  const wyckoff   = calcWyckoff(bars, atr);
  // Map Wyckoff phase to score: Spring=high, Distribution=low, Neutral=mid
  const wyckoffScore = wyckoff.phase.includes('Spring')      ? 17
                     : wyckoff.phase.includes('Consolidation')? 11
                     : wyckoff.phase.includes('Distribution') ?  5 : 9;

  // ── Weighted layers (not equal weight — structure+volume > momentum)
  // Weights reflect institutional trading logic:
  // Price structure + liquidity = 50%, momentum indicators = 35%, Wyckoff = 15%
  const layers = [
    { id: 'structure', label: 'هيكل السوق',     score: ms.score,      label2: ms.label,   weight: 1.5 },
    { id: 'ob',        label: 'مناطق الشراء',   score: ob.score,      label2: ob.label,   weight: 1.4 },
    { id: 'sweep',     label: 'اصطياد السيولة', score: liq.score,     label2: liq.label,  weight: 1.3 },
    { id: 'vwap',      label: 'VWAP المؤسسي',   score: vwap.score,    label2: vwap.label, weight: 1.2 },
    { id: 'rsi',       label: 'RSI/زخم',        score: rsiScore,      label2: `RSI: ${rsi.toFixed ? rsi.toFixed(1) : rsi}`, weight: 1.0 },
    { id: 'cmf',       label: 'تدفق المال',     score: cmfScore,      label2: `CMF: ${cmf}`, weight: 1.1 },
    { id: 'obv',       label: 'OBV/حجم',        score: obvScore,      label2: obv.rising ? 'حجم صاعد' : 'حجم هابط', weight: 1.1 },
    { id: 'wyckoff',   label: 'وايكوف',          score: wyckoffScore,  label2: wyckoff.phase, weight: 0.9 },
  ];

  // Weighted average → normalize to 0-100
  const totalWeight = layers.reduce((s, l) => s + l.weight, 0);
  const rawWeighted = layers.reduce((s, l) => s + l.score * l.weight, 0) / totalWeight;
  const totalScore  = Math.round((rawWeighted / 20) * 100);
  const atrPct     = atr / cur;

  // Compile signals for display
  const signals = [];
  if (rsiFull.divergence === 'bullish') signals.push({ type: 'bullish', msg: 'RSI: تباعد إيجابي (Bullish Divergence)' });
  if (rsiFull.divergence === 'bearish') signals.push({ type: 'bearish', msg: 'RSI: تباعد سلبي (Bearish Divergence)' });
  if (macd?.crossover === 'bullish_cross') signals.push({ type: 'bullish', msg: 'MACD: تقاطع صاعد (Golden Cross)' });
  if (macd?.crossover === 'bearish_cross') signals.push({ type: 'bearish', msg: 'MACD: تقاطع هابط (Death Cross)' });
  if (ms.bosBull) signals.push({ type: 'bullish', msg: 'كسر هيكل صاعد BOS↑' });
  if (ms.bosBear) signals.push({ type: 'bearish', msg: 'كسر هيكل هابط BOS↓' });

  return {
    totalScore,
    layers,
    atr,
    rsi,
    rsiFull,
    cmf,
    obv,
    macd,
    ms,
    ob,
    liq,
    vwap,
    signals,
    stopLoss:  +(cur - atr * 1.5).toFixed(2),
    targets:   [
      +(cur + atr * 2).toFixed(2),
      +(cur + atr * 3.5).toFixed(2),
    ],
    regime: ms.trend,
  };
}

/**
 * Score multiple stocks and rank them
 * @param {Stock[]} stocks
 * @param {Object} barsMap - sym → OHLCBar[]
 * @returns {Array<{ stock, radarScore, rank }>}
 */
export function rankStocksByRadar(stocks, barsMap) {
  return stocks
    .map(s => ({ stock: s, radarScore: calcRadarScore(s, barsMap[s.sym] ?? []) }))
    .sort((a, b) => b.radarScore.totalScore - a.radarScore.totalScore)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}
