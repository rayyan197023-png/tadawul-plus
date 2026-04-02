/**
 * LIQUIDITY ENGINE
 *
 * Institutional liquidity and volume flow analysis.
 * Extracted from TadawulPlus_v5_engine3_final.jsx
 *
 * Pure functions — no React, no UI.
 */

import { calcCMF, calcVWAP, calcOBV, calcATR } from './technicalEngine';

/**
 * Detect institutional vs retail volume
 * @param {OHLCBar[]} bars
 * @param {Stock} stk
 * @returns {{ type, label, color, cmf, obvRising, volumeRatio }}
 */
export function classifyLiquidity(bars, stk) {
  const cmf    = calcCMF(bars);
  const obv    = calcOBV(bars);
  const avgVol = bars.slice(-20).reduce((s, b) => s + b.vol, 0) / 20;
  // Use 3-bar average to reduce single-bar noise (institutional activity spans multiple bars)
  const recentVol   = bars.slice(-3).reduce((s, b) => s + b.vol, 0) / 3;
  const volumeRatio = recentVol / (avgVol || 1);
  const cur         = bars[bars.length - 1];

  const BLUE  = '#4d9fff';
  const GREEN = '#1ee68a';
  const RED   = '#ff5f6a';
  const GOLD  = '#f0c050';
  const GRAY  = '#8a90a8';

  let type, label, color;

  // ── Composite pressure scores (continuous, not step-function)
  // Higher CMF weight means money flow is primary signal
  const buyPressure  = (cmf * 15) + (obv.rising ? 3 : -1) + (obv.obvZ > 1 ? 2 : 0) + (volumeRatio >= 1.3 ? 3 : 0);
  const sellPressure = (-cmf * 15) + (!obv.rising ? 3 : -1) + (obv.obvZ < -1 ? 2 : 0) + (volumeRatio >= 1.3 ? 1 : 0);

  // ── Classification (priority order: volume+cmf → cmf+obv → volume → neutral)
  if      (volumeRatio >= 1.4 && cmf > 0.04)   { type = 'institutional_buy';  label = 'سيولة مؤسسية';    color = BLUE;  }
  else if (volumeRatio >= 1.4 && cmf < -0.04)  { type = 'institutional_sell'; label = 'ضغط مؤسسي';       color = RED;   }
  else if (buyPressure >= 4  && cmf > 0)        { type = 'accumulation';       label = 'تجميع منظم';      color = GREEN; }
  else if (sellPressure >= 4 && cmf < 0)        { type = 'distribution';       label = 'توزيع';           color = RED;   }
  else if (cmf > 0.05 && obv.rising)            { type = 'buy_pressure';       label = 'ضغط شراء';        color = GREEN; }
  else if (cmf < -0.05 && !obv.rising)          { type = 'sell_pressure';      label = 'ضغط بيع';         color = RED;   }
  else if (volumeRatio > 1.15)                  { type = 'high_volume';        label = 'حجم مرتفع';       color = GOLD;  }
  else if (cmf > 0.02)                          { type = 'mild_buy';           label = 'ميل شراء خفيف';  color = GREEN; }
  else if (cmf < -0.02)                         { type = 'mild_sell';          label = 'ميل بيع خفيف';   color = RED;   }
  else                                          { type = 'neutral';            label = 'محايد';           color = GRAY;  }

  return { type, label, color, cmf, obvRising: obv.rising, volumeRatio: +volumeRatio.toFixed(2), obvZ: obv.obvZ };
}

/**
 * VPVR — Volume Profile Visible Range
 * Price levels with highest volume concentration
 * @param {OHLCBar[]} bars
 * @param {number} levels
 * @returns {Array<{ price, volume, isPOC }>}
 */
/**
 * VPVR — Volume Profile Visible Range
 * 30 buckets (was 20) for better price resolution.
 * Includes POC, VAH, VAL (70% value area — institutional standard).
 */
export function calcVPVR(bars, levels = 30) {
  if (!bars.length) return [];

  const hi  = Math.max(...bars.map(b => b.hi));
  const lo  = Math.min(...bars.map(b => b.lo));
  const rng = hi - lo;
  if (rng === 0) return [];

  const buckets = Array(levels).fill(0);
  const step    = rng / levels;

  for (const b of bars) {
    const tp  = (b.hi + b.lo + b.c) / 3;
    const idx = Math.min(Math.floor((tp - lo) / step), levels - 1);
    buckets[idx] += b.vol;
  }

  const totalVol = buckets.reduce((s, v) => s + v, 0);
  const maxVol   = Math.max(...buckets);
  const pocIdx   = buckets.indexOf(maxVol);

  // Value Area: 70% of total volume centered around POC
  const targetVol = totalVol * 0.70;
  let vaVol = buckets[pocIdx], vahIdx = pocIdx, valIdx = pocIdx;
  while (vaVol < targetVol && (vahIdx < levels - 1 || valIdx > 0)) {
    const upVol   = vahIdx < levels - 1 ? buckets[vahIdx + 1] : 0;
    const downVol = valIdx > 0           ? buckets[valIdx - 1] : 0;
    if (upVol >= downVol && vahIdx < levels - 1) { vahIdx++; vaVol += upVol; }
    else if (valIdx > 0)                          { valIdx--; vaVol += downVol; }
    else break;
  }

  return buckets.map((vol, i) => ({
    price:  +(lo + (i + 0.5) * step).toFixed(2),
    volume: vol,
    isPOC:  i === pocIdx,
    isVAH:  i === vahIdx,
    isVAL:  i === valIdx,
    inVA:   i >= valIdx && i <= vahIdx,
    pct:    maxVol > 0 ? Math.round(vol / maxVol * 100) : 0,
  }));
}

/**
 * Detect abnormal volume spikes (potential manipulation or news)
 * @param {OHLCBar[]} bars
 * @returns {Array<{ date, ratio, type }>}
 */
export function detectVolumeSpikes(bars) {
  if (bars.length < 20) return [];

  const spikes = [];

  for (let i = 20; i < bars.length; i++) {
    // Rolling 20-bar average (excludes current bar) — more accurate baseline
    const rollingAvg = bars.slice(i - 20, i).reduce((s, b) => s + b.vol, 0) / 20;
    const ratio = bars[i].vol / (rollingAvg || 1);
    if (ratio >= 2.5) {  // lowered from 3x to 2.5x for better sensitivity
      spikes.push({
        date:  bars[i].d,
        ratio: +ratio.toFixed(1),
        type:  bars[i].c > bars[i].o ? 'buy_spike' : 'sell_spike',
        // Confirm: if next bar continues in same direction
        confirmed: i + 1 < bars.length && (
          (bars[i].c > bars[i].o && bars[i+1].c > bars[i+1].o) ||
          (bars[i].c < bars[i].o && bars[i+1].c < bars[i+1].o)
        ),
      });
    }
  }
  return spikes;
}

/**
 * Composite Liquidity Score (0–100)
 * Combines: CMF, OBV Z-score, volume ratio, spike detection
 * Used by: AnalysisScreen ranking, radarEngine layer
 */
export function calcLiquidityScore(bars) {
  if (bars.length < 20) return { score: 50, label: 'غير كافٍ', components: {} };

  const cmf  = calcCMF(bars);
  const obv  = calcOBV(bars);
  const rvol = calcRelativeVolume(bars, 20);
  const spikes = detectVolumeSpikes(bars);

  // CMF component (0-40): money flow direction + strength
  const cmfScore = Math.round(20 + Math.tanh(cmf / 0.10) * 20);  // 0-40

  // OBV component (0-30): trend confirmation
  const obvScore = Math.round(15 + Math.tanh(obv.obvZ / 1.5) * 10 + (obv.rising ? 5 : -5)); // 0-30

  // Volume component (0-20): relative volume
  const volScore = Math.round(Math.min(20, Math.max(0, (rvol.rvol - 0.5) / 2.5 * 20)));

  // Spike component (0-10): confirmed buy spikes
  const confirmedBuySPikes = spikes.filter(s => s.type === 'buy_spike' && s.confirmed).length;
  const spikeScore = Math.min(10, confirmedBuySPikes * 3);

  const raw   = cmfScore + obvScore + volScore + spikeScore;
  const score = Math.max(0, Math.min(100, raw));

  return {
    score,
    label: score >= 70 ? 'سيولة قوية جداً'
         : score >= 55 ? 'سيولة جيدة'
         : score >= 40 ? 'سيولة متوسطة'
         : score >= 25 ? 'سيولة ضعيفة'
         : 'سيولة منخفضة جداً',
    components: { cmfScore, obvScore, volScore, spikeScore },
  };
}

/**
 * Relative volume (today vs average)
 * @param {OHLCBar[]} bars
 * @param {number} period
 * @returns {{ rvol, label }}
 */
export function calcRelativeVolume(bars, period = 20) {
  if (bars.length < period + 1) return { rvol: 1, label: 'طبيعي' };

  const today  = bars[bars.length - 1].vol;
  const avgVol = bars.slice(-period - 1, -1).reduce((s, b) => s + b.vol, 0) / period;
  const rvol   = +(today / (avgVol || 1)).toFixed(2);

  return {
    rvol,
    label: rvol >= 3   ? 'حجم استثنائي 🔥'
         : rvol >= 2   ? 'حجم مرتفع جداً'
         : rvol >= 1.5 ? 'حجم مرتفع'
         : rvol >= 0.8 ? 'حجم طبيعي'
         : 'حجم منخفض',
  };
}
