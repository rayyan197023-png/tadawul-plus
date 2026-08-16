/**
 * TECHNICAL INDICATORS ENGINE
 *
 * Pure calculation functions — NO React, NO UI, NO state.
 * Extracted from TadawulPlus_v5_engine3_final.jsx
 *
 * All functions:
 * - Pure (same input → same output)
 * - Accept normalized OHLCBar[] arrays
 * - Return plain numbers or objects
 *
 * Used by: radarEngine, stockAnalysisEngine, AnalysisScreen
 */

// ── EMA (Exponential Moving Average)
// Uses SMA of first `period` values as seed — academically correct (Bloomberg standard).
// Falls back to first-value seed if data < period.
export function calcEMA(values: number[], period: number): number {
  if (!values.length) return 0;
  if (values.length < period) {
    const k = 2 / (period + 1);
    let e = values[0];
    for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
    return e;
  }
  const k = 2 / (period + 1);
  // SMA seed: standard Bloomberg / Reuters methodology
  let e = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

/**
 * RSI — Wilder's Smoothed Moving Average
 * @param {OHLCBar[]} bars - must have .c (close)
 * @param {number} period
 * @returns {number} 0–100
 */
export function calcRSI(bars: any[], period: number = 14): number {
  if (bars.length < period + 1) return 50;
  const closes = bars.map(b => b.c);
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) ag += d; else al += Math.abs(d);
  }
  ag /= period; al /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  // Keep 1 decimal — Math.round causes boundary misclassification (49.7→50 wrong zone)
  // When ag=0 AND al=0 (flat price, no movement) → neutral RSI=50, not 100
  const rsiVal = (ag === 0 && al === 0) ? 50
               : al === 0 ? 100
               : parseFloat((100 - 100 / (1 + ag / al)).toFixed(1));
  return rsiVal;
}

/**
 * RSI with trend and divergence detection
 * @param {OHLCBar[]} bars
 * @param {number} period
 * @returns {{ value, trend, rising, divergence }}
 */
export function calcRSIFull(bars: any[], period: number = 14): {
  value: number;
  trend: string;
  rising: boolean;
  divergence: string | null;
  slope?: number;
} {
  if (bars.length < period + 6) return { value: 50, trend: 'neutral', rising: false, divergence: null };

  const closes = bars.map(b => b.c);
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) ag += d; else al += Math.abs(d);
  }
  ag /= period; al /= period;

  const rsiSeries: number[] = [];
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
    rsiSeries.push((ag === 0 && al === 0) ? 50 : al === 0 ? 100 : parseFloat((100 - 100 / (1 + ag / al)).toFixed(1)));
  }

  const value  = rsiSeries[rsiSeries.length - 1];
  const last5  = rsiSeries.slice(-5);
  const slope  = (last5[4] - last5[0]) / 4;
  const rising = slope > 0;

  // Divergence detection: compare price swing vs RSI swing over last 10 bars
  let divergence = null;
  if (rsiSeries.length >= 10) {
    const priceWindow = closes.slice(-10);
    const rsiWindow   = rsiSeries.slice(-10);
    const priceMakes  = priceWindow[9] > priceWindow[0] ? 'high' : 'low';
    const rsiMakes    = rsiWindow[9]   > rsiWindow[0]   ? 'high' : 'low';
    if (priceMakes === 'high' && rsiMakes === 'low')  divergence = 'bearish'; // price up, RSI down
    if (priceMakes === 'low'  && rsiMakes === 'high') divergence = 'bullish'; // price down, RSI up
  }

  return { value, trend: rising ? 'rising' : 'falling', rising, divergence, slope: +slope.toFixed(2) };
}

/**
 * ATR — Wilder's Average True Range
 * @param {OHLCBar[]} bars
 * @param {number} period
 * @returns {number}
 */
export function calcATR(bars: any[], period: number = 14): number {
  if (bars.length < period + 1) return 0;
  let atr = 0;
  for (let i = 1; i <= period; i++) {
    atr += Math.max(
      bars[i].hi - bars[i].lo,
      Math.abs(bars[i].hi - bars[i - 1].c),
      Math.abs(bars[i].lo - bars[i - 1].c)
    );
  }
  atr /= period;
  for (let i = period + 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].hi - bars[i].lo,
      Math.abs(bars[i].hi - bars[i - 1].c),
      Math.abs(bars[i].lo - bars[i - 1].c)
    );
    atr = (atr * (period - 1) + tr) / period;
  }
  return atr;
}

/**
 * VWAP — Volume Weighted Average Price
 * @param {OHLCBar[]} bars
 * @returns {number}
 */
export function calcVWAP(bars: any[]): number {
  let sv = 0, svol = 0;
  for (const b of bars) {
    const tp = (b.hi + b.lo + b.c) / 3;
    sv   += tp * b.vol;
    svol += b.vol;
  }
  return svol > 0 ? sv / svol : 0;
}

/**
 * CMF — Chaikin Money Flow
 * @param {OHLCBar[]} bars
 * @param {number} period
 * @returns {number} -1 to 1
 */
export function calcCMF(bars: any[], period?: number): number {
  const n  = bars.length;
  period   = period ?? Math.min(20, Math.max(10, Math.round(n * 0.20)));
  const sl = bars.slice(-period);
  let sm = 0, sv = 0;
  for (const b of sl) {
    const r = b.hi - b.lo;
    if (r === 0) continue;
    sm += ((b.c - b.lo) - (b.hi - b.c)) / r * b.vol;
    sv += b.vol;
  }
  return sv > 0 ? Math.round(sm / sv * 100) / 100 : 0;
}

/**
 * OBV — On Balance Volume (with slope & z-score)
 * @param {OHLCBar[]} bars
 * @returns {{ slope, rising, obvZ }}
 */
export function calcOBV(bars: any[]): {
  slope: number;
  rising: boolean;
  obvZ: number;
} {
  let obv = 0;
  const arr = [0];
  for (let i = 1; i < bars.length; i++) {
    if      (bars[i].c > bars[i - 1].c) obv += bars[i].vol;
    else if (bars[i].c < bars[i - 1].c) obv -= bars[i].vol;
    arr.push(obv);
  }
  // Use last 40 bars as baseline — more sensitive to recent institutional activity
  const baseline = arr.slice(-Math.min(40, arr.length));
  const mean = baseline.reduce((s, v) => s + v, 0) / baseline.length;
  // std=0 يعني OBV ثابت تماماً -- حينها البسط (last - mean) = 0 أيضاً، فالنتيجة 0/1=0 الصحيحة.
  // الـ || 1 حارس ضد القسمة على صفر فقط، لا يُنتج إشارة وهمية.
  const std  = Math.sqrt(baseline.reduce((s, v) => s + (v - mean) ** 2, 0) / baseline.length) || 1;
  const obvZ = (arr[arr.length - 1] - mean) / std;

  // Linear regression slope on last 5 bars
  const l5 = arr.slice(-5), nm = l5.length, xm = 2;
  const ym  = l5.reduce((s, v) => s + v, 0) / nm;
  let num = 0, den = 0;
  for (let i = 0; i < nm; i++) { num += (i - xm) * (l5[i] - ym); den += (i - xm) ** 2; }
  const slope = den ? num / den : 0;

  return { slope, rising: den && slope > 0, obvZ: +obvZ.toFixed(2) };
}

/**
 * MACD — Moving Average Convergence/Divergence
 * O(n) implementation — single pass, no re-computation per bar.
 * Uses SMA seed for first EMA values (Bloomberg standard).
 *
 * @param {OHLCBar[]} bars
 * @param {{ fast?, slow?, signal? }} options
 * @returns {{ macd, signal, histogram, trend }}
 */
/**
 * MACD -- Moving Average Convergence/Divergence
 * O(n) implementation -- single pass, no re-computation per bar.
 * Uses SMA seed for first EMA values (Bloomberg standard).
 *
 * ✨ V2.0 - Mathematical Rigor:
 * - Accurate prevHistogram (using prevSignal, not current)
 * - Histogram momentum based on histogram itself (not MACD)
 * - Crossover detection with proper signal series
 * - Divergence detection
 *
 * @param {OHLCBar[]} bars
 * @param {{ fast?, slow?, signal? }} options
 * @returns {{ macd, signal, histogram, trend, histMomentum, crossover }}
 */
export function calcMACD(
  bars: any[],
  options: { fast?: number; slow?: number; signal?: number } = {}
): any {
  const { fast = 12, slow = 26, signal = 9 } = options;
  const minBars = slow + signal;
  if (bars.length < minBars) {
    return { 
      macd: 0, 
      signal: 0, 
      histogram: 0, 
      trend: 'neutral',
      histMomentum: 'neutral',
      crossover: null,
      aboveZero: false,
    };
  }
  
  const closes = bars.map(b => b.c);
  const kFast  = 2 / (fast   + 1);
  const kSlow  = 2 / (slow   + 1);
  const kSig   = 2 / (signal + 1);

  // Seed EMAs with SMA (Bloomberg standard)
  let emaFast = closes.slice(0, fast).reduce((a, b) => a + b, 0) / fast;
  let emaSlow = closes.slice(0, slow).reduce((a, b) => a + b, 0) / slow;

  // Advance fast EMA to index slow-1 (sync starting point)
  for (let i = fast; i < slow; i++) {
    emaFast = closes[i] * kFast + emaFast * (1 - kFast);
  }

  // ✨ Build full MACD series O(n) -- single pass from slow onwards
  const macdSeries: number[] = [];
  for (let i = slow; i < closes.length; i++) {
    emaFast = closes[i] * kFast + emaFast * (1 - kFast);
    emaSlow = closes[i] * kSlow + emaSlow * (1 - kSlow);
    macdSeries.push(emaFast - emaSlow);
  }

  if (macdSeries.length < signal) {
    return {
      macd: +macdSeries[macdSeries.length - 1].toFixed(4),
      signal: 0,
      histogram: 0,
      trend: 'neutral',
      histMomentum: 'neutral',
      crossover: null,
      aboveZero: macdSeries[macdSeries.length - 1] > 0,
    };
  }

  // ✨ Build full Signal series (للحصول على prevSignal دقيق)
  const signalSeries: number[] = [];
  let sigVal = macdSeries.slice(0, signal).reduce((a, b) => a + b, 0) / signal;
  signalSeries.push(sigVal);
  
  for (let i = signal; i < macdSeries.length; i++) {
    sigVal = macdSeries[i] * kSig + sigVal * (1 - kSig);
    signalSeries.push(sigVal);
  }

  // ✨ Build full Histogram series
  const histSeries: number[] = [];
  for (let i = 0; i < signalSeries.length; i++) {
    const macdIdx = signal - 1 + i; // align indices
    if (macdIdx < macdSeries.length) {
      histSeries.push(macdSeries[macdIdx] - signalSeries[i]);
    }
  }

  // ✨ Current values
  const macdVal = macdSeries[macdSeries.length - 1];
  const signalVal = signalSeries[signalSeries.length - 1];
  const histogram = histSeries[histSeries.length - 1];
  
  // ✨ Previous histogram (دقيق - من الـ series)
  const prevHistogram = histSeries.length >= 2 ? histSeries[histSeries.length - 2] : histogram;

  // ✨ Histogram Momentum - بناءً على histogram نفسه (وليس MACD)
  let histMomentum;
  if (histogram > 0) {
    // Bullish histogram
    histMomentum = histogram > prevHistogram ? 'strengthening' : 'weakening';
  } else if (histogram < 0) {
    // Bearish histogram - "strengthening" يعني الـ momentum السلبي يزداد
    histMomentum = histogram < prevHistogram ? 'strengthening' : 'weakening';
  } else {
    histMomentum = 'neutral';
  }

  // ✨ Crossover Detection (دقيق)
  let crossover = null;
  if (histSeries.length >= 2) {
    if (prevHistogram <= 0 && histogram > 0) {
      crossover = 'bullish_cross';
    } else if (prevHistogram >= 0 && histogram < 0) {
      crossover = 'bearish_cross';
    }
  }

  // ✨ Divergence Detection (bonus)
  let divergence = null;
  if (closes.length >= 14 && macdSeries.length >= 14) {
    const recentCloses = closes.slice(-14);
    const recentMACD = macdSeries.slice(-14);
    
    const priceMakesHigh = recentCloses[13] > recentCloses[0];
    const priceMakesLow = recentCloses[13] < recentCloses[0];
    const macdMakesHigh = recentMACD[13] > recentMACD[0];
    const macdMakesLow = recentMACD[13] < recentMACD[0];
    
    if (priceMakesHigh && macdMakesLow) {
      divergence = 'bearish'; // price up, MACD down (warning)
    } else if (priceMakesLow && macdMakesHigh) {
      divergence = 'bullish'; // price down, MACD up (opportunity)
    }
  }

  return {
    macd: +macdVal.toFixed(4),
    signal: +signalVal.toFixed(4),
    histogram: +histogram.toFixed(4),
    prevHistogram: +prevHistogram.toFixed(4),
    trend: histogram > 0 ? 'bullish' : histogram < 0 ? 'bearish' : 'neutral',
    histMomentum,
    crossover,
    divergence,
    aboveZero: macdVal > 0,
    // Bonus: full series for advanced analysis
    seriesLength: macdSeries.length,
  };
}

/**
 * Bollinger Bands
 * @param {OHLCBar[]} bars
 * @param {number} period
 * @param {number} stdDev
 * @returns {{ upper, middle, lower, bandwidth }}
 */
export function calcBollingerBands(bars: any[], period: number = 20, stdDev: number = 2): {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
} {
  if (bars.length < period) return { upper: 0, middle: 0, lower: 0, bandwidth: 0 };
  const closes = bars.slice(-period).map(b => b.c);
  const middle = closes.reduce((s, v) => s + v, 0) / period;
  const variance = closes.reduce((s, v) => s + (v - middle) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return {
    upper:     +(middle + stdDev * sd).toFixed(2),
    middle:    +middle.toFixed(2),
    lower:     +(middle - stdDev * sd).toFixed(2),
    bandwidth: +(2 * stdDev * sd / middle * 100).toFixed(2),
  };
}

/**
 * Market Structure Analysis — HH/HL/LH/LL + BOS/CHOCH
 * @param {OHLCBar[]} bars
 * @returns {{ trend, bos, choch, bosBull, bosBear, score, label }}
 */
export function calcMarketStructure(bars: any[]): any {
  if (bars.length < 10) {
    return { trend: 'محايد', bos: false, choch: false, score: 5, label: 'هيكل محايد' };
  }
  // ✨ نشتقّ نسبة التغيّر من الإغلاقات حين يغيب pct (بارات API الخام) -- لا نعتمد على حقل قد لا يوجد
  const recent10 = bars.slice(-10);
  let sumPct = 0;
  for (let i = 0; i < recent10.length; i++) {
    const b = recent10[i];
    if (b.pct != null) {
      sumPct += Math.abs(b.pct);
    } else if (i > 0 && recent10[i - 1].c) {
      sumPct += Math.abs((b.c - recent10[i - 1].c) / recent10[i - 1].c * 100);
    }
  }
  const recentRng = sumPct / recent10.length;
  const swWin     = recentRng > 2.5 ? 2 : recentRng > 1.0 ? 3 : 4;

  const swings: any[] = [];
  for (let i = swWin; i < bars.length - swWin; i++) {
    const isHigh = bars.slice(i - swWin, i).every(b => b.hi <= bars[i].hi)
                && bars.slice(i + 1, i + 1 + swWin).every(b => b.hi <= bars[i].hi);
    const isLow  = bars.slice(i - swWin, i).every(b => b.lo >= bars[i].lo)
                && bars.slice(i + 1, i + 1 + swWin).every(b => b.lo >= bars[i].lo);
    if (isHigh) swings.push({ i, type: 'H', val: bars[i].hi });
    if (isLow)  swings.push({ i, type: 'L', val: bars[i].lo });
  }

  const highs = swings.filter(s => s.type === 'H').slice(-4);
  const lows  = swings.filter(s => s.type === 'L').slice(-4);

  let hhC = 0, hlC = 0, lhC = 0, llC = 0;
  for (let i = 1; i < highs.length; i++) highs[i].val > highs[i-1].val ? hhC++ : lhC++;
  for (let i = 1; i < lows.length;  i++) lows[i].val  > lows[i-1].val  ? hlC++ : llC++;

  const bull = hhC > 0 && hlC > 0, bear = lhC > 0 && llC > 0;
  const trend = bull && !bear ? 'صاعد' : bear && !bull ? 'هابط' : hhC > lhC ? 'صاعد محايد' : 'هابط محايد';

  const cur    = bars[bars.length - 1].c;
  const lastH  = highs.length > 0 ? highs[highs.length - 1].val : Infinity;
  const lastL  = lows.length  > 0 ? lows[lows.length - 1].val   : 0;
  const bosBull = cur > lastH, bosBear = cur < lastL;
  const bos     = bosBull || bosBear;
  const choch   = (bull && bosBear) || (bear && bosBull);

  const trendStrength = hhC + hlC - lhC - llC;
  const score = Math.round(Math.min(20, Math.max(2,
    10 + trendStrength * 2.5 + (bosBull ? 4 : 0) + (choch && bosBull ? 2 : 0) - (bosBear ? 4 : 0)
  )));

  return {
    trend, bos, choch, bosBull, bosBear, hhC, hlC, lhC, llC, score,
    label: bosBull  ? 'كسر هيكل صاعد BOS↑'
         : bosBear  ? 'كسر هيكل هابط BOS↓'
         : choch    ? 'تغيّر طابع CHOCH'
         : trend === 'صاعد' ? 'هيكل HH/HL صاعد'
         : trend === 'هابط' ? 'هيكل LH/LL هابط'
         : 'هيكل محايد',
  };
}

/**
 * IVWAP — Institutional VWAP (Weekly + Monthly + Quarterly + Anchored)
 * @param {OHLCBar[]} bars
 * @returns {{ vwW, vwM, vwQ, avwap, aboveAVWAP, score, label }}
 */
export function calcIVWAP(bars: any[], stk?: any): any {
  const vwW    = calcVWAP(bars.slice(-5));
  const vwM    = calcVWAP(bars.slice(-20));
  const vwQ    = calcVWAP(bars);
  const bars60 = bars.slice(-60);
  const loIdx60 = bars60.reduce((mi, b, i) => b.lo < bars60[mi].lo ? i : mi, 0);
  const avwap  = calcVWAP(bars60.slice(loIdx60));
  const cur    = bars[bars.length - 1].c;
  const above  = [vwW, vwM, vwQ].filter(v => cur > v).length;

  const vwapDev  = avwap > 0 ? (cur - avwap) / avwap : 0;
  const atr14 = calcATR(bars, 14); // ✨ نحسبه مرة واحدة بدل مرتين
  const b1 = vwM - atr14;
  const b2 = vwM - 2 * atr14;
  const belowB1  = cur < b1, belowB2 = cur < b2;
  const aboveAVWAP = cur > avwap;

  let score = 10;
  if (belowB2 && aboveAVWAP)    score = 20;
  else if (belowB1 && aboveAVWAP) score = Math.round(14 + Math.tanh(-vwapDev) * 2);
  else if (above === 3)           score = 5;
  else if (aboveAVWAP)            score = 12;
  else                            score = 6;

  return {
    vwW: +vwW.toFixed(2), vwM: +vwM.toFixed(2), vwQ: +vwQ.toFixed(2),
    avwap: +avwap.toFixed(2), aboveAVWAP, above3: above === 3,
    belowB1, belowB2, score: Math.min(20, score),
    label: belowB2 && aboveAVWAP ? 'تحت -2σ + فوق AVWAP ✓'
         : belowB1               ? 'تحت VWAP -1σ'
         : above === 3            ? 'فوق 3 VWAPs'
         : aboveAVWAP             ? 'فوق AVWAP'
         : 'تحت AVWAP',
  };
}
