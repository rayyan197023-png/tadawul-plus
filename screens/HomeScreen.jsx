
'use client';
/**
 * HOME SCREEN -- تداول+
 * 
 * يحتوي على:
 * - محرك السوق (useMarketEngine) -- تحديث كل 2 ثانية
 * - شارت تاسي التفاعلي مع 5 فترات زمنية
 * - أبرز التحركات مع تبويبات وفترات زمنية
 * - مؤشر الخوف والطمع (7 مكوّنات)
 * - القطاعات مع تدفق رأس المال
 * - التحليل المتقدم: خريطة السيولة + المحرك الكمي + عرض السوق
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSharedPrices } from '../store';
import { STOCKS, STOCKS_MAP, SECTORS } from '../constants/stocksData';
import { useHaptic }          from '../hooks/useHaptic';
import { usePullToRefresh }   from '../hooks/usePullToRefresh';
import config from '../constants/config';
import { useMarketBridge } from '../hooks/useMarketBridge';



/* ─── Design tokens from screenshots ─── */
const BG    = "#06080f";
const CARD  = "#16202e";
const CARD2 = "#1c2640";
const CARD3 = "#222d4a";
const LN    = "#2a3558";
const T1    = "#ffffff";
const T2    = "#8a90a8";
const T3    = "#454d65";
const G     = "#1ee68a";
const R     = "#ff5f6a";
const GOLD  = "#f0c050";
const BLUE  = "#4d9fff";
const PU    = "#a78bfa";

/* ─── Stocks data ─── */


const SECTORS_DATA = [
  {name:"البنوك",         pct: 1.8,  dot:G,          pc:"#1d4ed8", w:22, id:"banks"},
  {name:"الطاقة",         pct: 2.1,  dot:"#3b82f6",  pc:"#2563eb", w:18, id:"energy"},
  {name:"البتروكيماويات", pct:-0.5,  dot:GOLD,       pc:"#7c3aed", w:15, id:"petro"},
  {name:"الاتصالات",      pct: 0.9,  dot:R,          pc:"#9333ea", w:12, id:"telecom"},
  {name:"التجزئة",        pct: 3.2,  dot:PU,         pc:"#4f46e5", w:10, id:"retail"},
  {name:"الغذاء",         pct:-1.1,  dot:"#34d399",  pc:"#059669", w:10, id:"food"},
  {name:"التأمين",        pct: 0.7,  dot:"#ec4899",  pc:"#db2777", w:8,  id:"insurance"},
  {name:"التعدين",        pct:-2.1,  dot:"#60a5fa",  pc:"#dc2626", w:5,  id:"mining"},
];

/* ════════════════════════════════════════════════════════
   PROFESSIONAL ANALYSIS ENGINES
   ════════════════════════════════════════════════════════

   ─── محاكاة بيانات يومية واقعية (20 يوم) ───
   نظراً لأن API غير متصل، نُولّد سلسلة زمنية
   محاكاة باستخدام seed ثابت مرتبط بالسهم،
   لضمان نتائج ثابتة وقابلة للتكرار.
*/

// دالة توليد بيانات شبه‑واقعية بـ seed ثابت (لا عشوائية)
function seedRng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function generateDailyBars(stk, days = 28) {  // 28 يوم افتراضياً لـ warm-up كافٍ لـ RSI/ATR
  const rng  = seedRng(parseInt(stk.sym, 10) * 997 + 13);
  const bars = [];
  let   p    = stk.p * (1 - stk.pct / 100); // سعر قبل days يوم تقريباً
  const avgDailyVol = stk.avgVol || stk.v || 1e6;

  for (let i = 0; i < days; i++) {
    const drift  = (stk.pct / 100) / days;
    // noise محايد (rng-0.5) -- drift يتحكم في الاتجاه فقط
    const noise  = (rng() - 0.5) * 0.022;
    const change = drift + noise;
    const open   = p;
    const close  = p * (1 + change);
    // hi ≥ max(open,close) و lo ≤ min(open,close) -- شرط ضروري أكاديمياً
    const hi     = Math.max(open, close) * (1 + rng() * 0.010);
    const lo     = Math.min(open, close) * (1 - rng() * 0.010);
    // الحجم يتأثر بمقدار التغير -- حجم أعلى عند تحركات كبيرة
    const volMult = 0.5 + rng() * 1.2 + Math.abs(change) * 8;
    const vol    = Math.round(avgDailyVol * volMult);
    bars.push({ open, hi, lo, close, vol, pct: change * 100 });
    p = close;
  }
  return bars;
}

/* ════════════════════════════════════════════════════════
   محركات الحساب الاحترافية -- نسخة مُصحَّحة كاملاً
   ════════════════════════════════════════════════════════

   ✅ إصلاح 1: RSI → Wilder's Smoothed Moving Average
   ✅ إصلاح 2: ATR → Wilder's Smoothed Moving Average
   ✅ إصلاح 3: OBV → دالة فعّالة ومُستخدمة فعلاً
   ✅ إصلاح 4: Fear&Greed historical → seed ثابت
   ✅ إصلاح 5: Fear&Greed SMA125 → محسوب من HISTORICAL_DATA
   ✅ إصلاح 6: Quantum Value → نسبة السعر/القيمة من بيانات حقيقية
   ✅ إصلاح 7: Quantum Quality → OBV slope + RSI consistency
   ✅ إصلاح 8: Breadth VWAP → محسوب من bars لكل سهم فعلاً
   ✅ إصلاح 9: HISTORICAL_DATA.week → مُولَّدة من نفس seed محرك السوق
*/

/* ─── RSI -- Wilder's Smoothed Moving Average (الصيغة الرسمية) ───
   الخطوة 1: حساب أول EMA من SMA بسيط على أول `period` يوم
   الخطوة 2: Wilder's smoothing: EMA = EMA_prev×(period-1)/period + gain_today×(1/period)
   الفرق عن SMA: يُعطي وزناً أكبر للبيانات الأحدث ← أكثر حساسية
*/
function calcRSI(bars, period = 14) {
  if (bars.length < period + 1) return 50;

  // الخطوة 1: أول SMA على أول period يوم
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    if (diff > 0) avgGain += diff;
    else          avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  // الخطوة 2: Wilder's smoothing للباقي
  for (let i = period + 1; i < bars.length; i++) {
    const diff = bars[i].close - bars[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    // Wilder's EMA: α = 1/period
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

/* ─── ATR -- Wilder's Smoothed Moving Average (الصيغة الرسمية) ───
   الخطوة 1: True Range = max(Hi-Lo, |Hi-PC|, |Lo-PC|)
   الخطوة 2: Wilder's EMA: ATR = ATR_prev×(n-1)/n + TR_today×(1/n)
*/
function calcATR(bars, period = 14) {
  if (bars.length < period + 1) return 0;

  // الخطوة 1: أول SMA كـ seed
  let atr = 0;
  for (let i = 1; i <= period; i++) {
    const tr = Math.max(
      bars[i].hi - bars[i].lo,
      Math.abs(bars[i].hi - bars[i - 1].close),
      Math.abs(bars[i].lo - bars[i - 1].close)
    );
    atr += tr;
  }
  atr /= period;

  // الخطوة 2: Wilder's smoothing
  for (let i = period + 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].hi - bars[i].lo,
      Math.abs(bars[i].hi - bars[i - 1].close),
      Math.abs(bars[i].lo - bars[i - 1].close)
    );
    atr = (atr * (period - 1) + tr) / period;
  }

  return atr;
}

/* ─── OBV (On Balance Volume) -- مُصحَّح ومُستخدَم فعلاً ───
   يُعيد: { obv, trend, slope, signal }
   trend: "صاعد" | "هابط" | "محايد"
   signal: توافق OBV مع حركة السعر
*/
function calcOBV(bars) {
  if (bars.length < 5) return { obv: 0, trend: "محايد", slope: 0, signal: "محايد" };

  let obv = 0;
  const obvArr = [0];

  for (let i = 1; i < bars.length; i++) {
    if      (bars[i].close > bars[i-1].close) obv += bars[i].vol;
    else if (bars[i].close < bars[i-1].close) obv -= bars[i].vol;
    // إذا تساوى: OBV لا يتغير
    obvArr.push(obv);
  }

  // الميل بـ OLS Linear Regression على آخر 5 أيام (أدق من 2-point)
  const last5 = obvArr.slice(-5);
  const n5 = last5.length; // = 5
  const xMean = 2; // (0+1+2+3+4)/5 = 2
  const yMean = last5.reduce((s,v)=>s+v,0) / n5;
  let num = 0, den = 0;
  for (let i = 0; i < n5; i++) {
    num += (i - xMean) * (last5[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;

  // توافق OBV مع السعر
  const priceSlope = bars[bars.length-1].close - bars[bars.length-5].close;
  let signal = "محايد";
  if (slope > 0 && priceSlope > 0) signal = "تأكيد صعود";
  else if (slope < 0 && priceSlope < 0) signal = "تأكيد هبوط";
  else if (slope > 0 && priceSlope < 0) signal = "تباعد إيجابي";
  else if (slope < 0 && priceSlope > 0) signal = "تباعد سلبي";

  return {
    obv,
    obvArr,
    trend: slope > 0 ? "صاعد" : slope < 0 ? "هابط" : "محايد",
    slope,
    signal,
  };
}

/* ─── SMA (Simple Moving Average) ─── */
function calcSMA(values, period) {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

/* ─── تاريخ Fear & Greed ثابت بـ seed محدد ───
   كل فترة تُولَّد من seed خاص بها ← ثابتة لا تتغير بين renders
   القيم تعكس دورات السوق المنطقية (تذبذب + اتجاه)
*/
const FG_HISTORICAL = (() => {
  // seed ثابت لكل فترة تاريخية
  function genFgSeries(seedVal, steps, startVal, endVal, volatility) {
    const rng = seedRng(seedVal);
    const series = [startVal];
    const drift  = (endVal - startVal) / steps;
    for (let i = 1; i < steps; i++) {
      const noise = (rng() - 0.5) * volatility;
      const next  = Math.max(5, Math.min(95, series[i-1] + drift + noise));
      series.push(Math.round(next));
    }
    series.push(endVal); // آخر نقطة = القيمة الحالية
    return series;
  }

  // سنة كاملة (52 أسبوع) -- تاريخ منطقي لتاسي
  const yearSeries = genFgSeries(7001, 51, 42, 61, 8);

  return {
    // أمس: نسخة مستقرة قريبة من اليوم
    yesterday: (current) => {
      const rng = seedRng(8881);
      return Math.max(5, Math.min(95, Math.round(current + (rng()-0.5)*6)));
    },
    // أسبوع مضى: نقطة من السلسلة السنوية
    weekAgo: (current) => {
      const rng = seedRng(8882);
      return Math.max(5, Math.min(95, Math.round(current + (rng()-0.45)*14)));
    },
    // شهر مضى
    monthAgo: (current) => {
      const rng = seedRng(8883);
      return Math.max(5, Math.min(95, Math.round(current + (rng()-0.42)*22)));
    },
    yearSeries,
  };
})();

/* ─── SMA-125 محسوب من HISTORICAL_DATA ───
   نأخذ آخر 125 نقطة يومية من q3m + month + year مدمجة
*/
function calcSMA125() {
  // نحتاج 125 نقطة يومية -- نجمع: extra(40) + month(21) + q3m(66) = 127 نقطة → slice(-125)
  const extraRng = seedRng(5555);
  const extra = Array.from({length:40}, () => {
    const v = 12100 + (extraRng()-0.5)*200;
    return Math.round(v);
  });
  const combined = [
    ...extra,
    ...HISTORICAL_DATA.month.slice(0,-1),   // 21 نقطة
    ...HISTORICAL_DATA.q3m.slice(0,-1),     // 66 نقطة
  ].slice(-125);                             // = 125 نقطة بالضبط ✓
  return calcSMA(combined, 125);
}

/* ─── بيانات P/E محاكاة لكل سهم (ثابتة بـ seed) ───
   مبنية على نسب P/E واقعية للسوق السعودي 2024
*/
const STOCK_FUNDAMENTALS = (() => {
  const data = {
    "2010": { pe: 14.2, pb: 1.8,  roe: 0.128, divYield: 3.2 }, // سابك
    "2222": { pe: 17.1, pb: 3.1,  roe: 0.182, divYield: 3.8 }, // أرامكو
    "1120": { pe: 12.8, pb: 2.2,  roe: 0.172, divYield: 2.1 }, // الراجحي
    "1010": { pe: 11.4, pb: 1.6,  roe: 0.141, divYield: 3.5 }, // الرياض
    "2350": { pe: 22.3, pb: 3.4,  roe: 0.152, divYield: 2.8 }, // المراعي
    "7010": { pe: 13.6, pb: 2.0,  roe: 0.147, divYield: 4.1 }, // الاتصالات
    "4001": { pe: 18.7, pb: 2.5,  roe: 0.134, divYield: 1.9 }, // التصنيع
    "6010": { pe: 10.9, pb: 1.4,  roe: 0.128, divYield: 4.4 }, // القابضة
    "8010": { pe: 15.2, pb: 1.9,  roe: 0.125, divYield: 2.3 }, // تكافل
    "2082": { pe: 16.8, pb: 2.1,  roe: 0.125, divYield: 2.0 }, // معادن
    "1211": { pe: 20.4, pb: 2.8,  roe: 0.137, divYield: 1.5 }, // صحر
    "4280": { pe: 19.1, pb: 2.6,  roe: 0.136, divYield: 1.8 }, // التجزئة
  };
  // متوسط السوق لأي سهم غير موجود
  const mktAvgPE = 15.5, mktAvgPB = 2.2, mktAvgROE = 0.145, mktDivYield = 2.8;
  return sym => data[sym] || { pe:mktAvgPE, pb:mktAvgPB, roe:mktAvgROE, divYield:mktDivYield };
})();

/* ─── MFI (Money Flow Index) -- الصيغة الرسمية ───
   MFI = 100 − 100 / (1 + PMF/NMF)
   حيث:
     TP  = (High + Low + Close) / 3   (Typical Price)
     RMF = TP × Volume                 (Raw Money Flow)
     PMF = مجموع RMF للأيام الصاعدة
     NMF = مجموع RMF للأيام الهابطة
   الفترة المعيارية = 14 يوم
*/
function calcMFI(bars, period = 14) {
  if (bars.length < period + 1) return 50;
  let posFlow = 0, negFlow = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const tp  = (bars[i].hi + bars[i].lo + bars[i].close) / 3;
    const rmf = tp * bars[i].vol;
    const prevTp = i > 0
      ? (bars[i-1].hi + bars[i-1].lo + bars[i-1].close) / 3
      : tp;
    if (tp > prevTp) posFlow += rmf;
    else             negFlow += rmf;
  }
  if (negFlow === 0) return 100;
  if (posFlow === 0) return 0;
  return Math.round(100 - 100 / (1 + posFlow / negFlow));
}

/* ─── CMF (Chaikin Money Flow) -- الصيغة الرسمية ───
   CMF = Σ(MFV) / Σ(Volume)  لـ 20 يوم
   حيث:
     MFM = ((Close − Low) − (High − Close)) / (High − Low)
     MFV = MFM × Volume
*/
function calcCMF(bars, period = 20) {
  const slice = bars.slice(-period);
  let sumMFV = 0, sumVol = 0;
  for (const b of slice) {
    const range = b.hi - b.lo;
    if (range === 0) continue;
    const mfm = ((b.close - b.lo) - (b.hi - b.close)) / range;
    sumMFV += mfm * b.vol;
    sumVol += b.vol;
  }
  if (sumVol === 0) return 0;
  return sumMFV / sumVol;  // دقة كاملة -- التقريب يتم عند العرض فقط
}

/* ─── VWAP (Volume Weighted Average Price) ───
   VWAP = Σ(TP × Volume) / Σ(Volume)
   يُحسب على أحدث 20 جلسة (يومي)
*/
function calcVWAP(bars) {
  let sumTPV = 0, sumVol = 0;
  for (const b of bars) {
    const tp = (b.hi + b.lo + b.close) / 3;
    sumTPV  += tp * b.vol;
    sumVol  += b.vol;
  }
  return sumVol > 0 ? sumTPV / sumVol : 0;
}

/* ─── وايكوف المُحسَّن -- نظام نقاط موزونة (4 محاور أكاديمية) ───
   المرجع: R.D. Wyckoff 1931 + آدمز & شاكر 2010
   ──────────────────────────────────────────────────
   A. Price Location  30%  -- pfl موقع السعر من النطاق السنوي
   B. Volume Quality  25%  -- rv × direction + OBV direction
   C. Money Flow      25%  -- CMF(20) + MFI(14)
   D. Price Momentum  20%  -- pct_change + RSI

   كل محور: -2 (تصريف قوي) إلى +2 (تجميع قوي)
   المجموع الموزون يُحدد المرحلة من 8 مراحل وايكوف الرسمية
*/
function wyckoffPhase(pfl, rv, pct, cmf, rsi, mfi, obvDir) {
  // A: موقع السعر من النطاق السنوي
  const locA = pfl < 20 ? +2 : pfl < 35 ? +1 : pfl < 65 ? 0 : pfl < 80 ? -1 : -2;

  // B: جودة الحجم -- rv في اتجاه الحركة + OBV التراكمي
  const volDir  = pct >= 0 ? 1 : -1;
  const rvScore = rv > 2.0 ? 2 : rv > 1.4 ? 1 : rv < 0.7 ? -1 : 0;
  const obvS    = obvDir === "صاعد" ? +1 : obvDir === "هابط" ? -1 : 0;
  const locB    = Math.max(-2, Math.min(2, rvScore * volDir + obvS * 0.5));

  // C: تدفق الأموال -- CMF(20) + MFI(14)
  const cmfS = cmf > 0.15 ? +2 : cmf > 0.05 ? +1 : cmf < -0.15 ? -2 : cmf < -0.05 ? -1 : 0;
  const mfiS = (mfi||50) > 65 ? +1 : (mfi||50) < 35 ? -1 : 0;
  const locC = Math.max(-2, Math.min(2, cmfS + mfiS));

  // D: زخم السعر -- pct + RSI
  const pctS = pct > 1.0 ? +2 : pct > 0.3 ? +1 : pct < -1.0 ? -2 : pct < -0.3 ? -1 : 0;
  const rsiS = (rsi||50) > 60 ? +1 : (rsi||50) < 40 ? -1 : 0;
  const locD = Math.max(-2, Math.min(2, pctS + rsiS));

  // المجموع الموزون: نطاق [-2, +2]
  const total = locA * 0.30 + locB * 0.25 + locC * 0.25 + locD * 0.20;
  const conf  = x => Math.min(95, Math.round(Math.abs(x) * 40 + 20));

  if (total >= 1.2)                          return { phase: "تجميع نشط   (Accumulation B)", col: G,         conf: conf(total) };
  if (total >= 0.5)                          return { phase: "تجميع مبكر  (Accumulation A)", col: "#4ade80", conf: conf(total) };
  if (total >= 0.1 && pfl < 40 && rv > 1.3) return { phase: "نهاية تجميع (Spring)",          col: BLUE,       conf: 55 };
  if (total > -0.1 && total < 0.1)          return { phase: "توحيد        (Consolidation)",   col: T2,         conf: 45 };
  if (total <= -1.2)                         return { phase: "تصريف نشط   (Distribution B)",  col: R,          conf: conf(total) };
  if (total <= -0.5)                         return { phase: "تصريف مبكر  (Distribution A)",  col: GOLD,       conf: conf(total) };
  if (total < -0.1 && pfl > 60 && rv > 1.2) return { phase: "قمة نهائية  (UpThrust)",         col: "#fb923c",  conf: 50 };
  if (pct < -0.5 && rv < 0.8 && pfl < 30)   return { phase: "هبوط حر     (Markdown)",         col: R,          conf: 60 };
  return { phase: "محايد", col: T2, conf: 30 };
}

/* ─── محرك السيولة الذكية الاحترافي ─── */
function calcLiq(stk) {
  // 1. بيانات يومية -- 28 يوم لـ warm-up كافٍ (2×period=14)
  const bars = generateDailyBars(stk, 28);

  // 2. حجم مُطبَّع لتخفيف شذوذ الحجم اليومي
  const vol    = stk.v || 1e6;
  const avgVol = stk.avgVol || vol;
  const rv     = ((vol + avgVol) / 2) / avgVol;  // (v + avgVol)/2 / avgVol

  // 3. النطاق السنوي وموقع السعر
  const hi52 = stk.hi || stk.p * 1.25;
  const lo52 = stk.lo || stk.p * 0.75;
  const range52 = hi52 - lo52;
  const pfl = range52 > 0 ? ((stk.p - lo52) / range52) * 100 : 50;

  // 4. MFI الرسمي (14 يوم)
  const mfi = calcMFI(bars, 14);

  // 5. CMF الرسمي (20 يوم)
  const cmf = calcCMF(bars, 20);

  // 6. VWAP الرسمي
  const vwapVal = calcVWAP(bars);
  const vwapDiff = vwapVal > 0
    ? +((stk.p - vwapVal) / vwapVal * 100).toFixed(2) : 0;
  const aboveVwap = stk.p >= vwapVal;

  // 7. RSI (14 يوم)
  const rsi = calcRSI(bars, 14);

  // 8. ATR -- التذبذب الفعلي
  const atr    = calcATR(bars, 14);
  const atrPct = stk.p > 0 ? +(atr / stk.p * 100).toFixed(2) : 0;

  // 9. OBV trend
  const obviDir = (() => {
    let obv = 0; let prev = bars[0]?.close || stk.p;
    const arr = bars.map(b => {
      obv += b.close > prev ? b.vol : b.close < prev ? -b.vol : 0;
      prev = b.close;
      return obv;
    });
    const slope = arr.length >= 5 ? arr[arr.length-1] - arr[arr.length-5] : 0;
    return slope > 0 ? "صاعد" : slope < 0 ? "هابط" : "محايد";
  })();

  // 10. Tight Range -- التضيّق
  const rangeRatio = range52 > 0 ? (hi52 - lo52) / lo52 : 0.3;
  const tight = rangeRatio < 0.25;

  // 11. حساب LPI (Liquidity Pressure Index)
  // نطاق −100 إلى +100
  const mfiNorm = (mfi - 50) / 50;
  const cmfNorm = Math.max(-1, Math.min(1, cmf));
  const rvCapped = Math.min(rv, 4.0);  // cap عند 4x لمنع تضخيم القيم المتطرفة
  const rvNorm  = Math.max(-1, Math.min(1, (rvCapped - 1) * 0.8));
  // لا حاجة لـ ×100/100 -- round مباشر
  const lpiInt = Math.max(-100, Math.min(100,
    Math.round(mfiNorm * 40 + cmfNorm * 35 + rvNorm * 25)
  ));

  // 12. Smart Money Score -- نقاط السيولة الذكية (0–100)
  // مبني على مؤشرات محددة بدون عشوائية
  let sm = 0;
  // MFI (وزن 25%)
  sm += mfi > 70 ? 25 : mfi > 55 ? 15 : mfi > 45 ? 8 : 0;
  // CMF (وزن 20%)
  sm += cmf > 0.15 ? 20 : cmf > 0.05 ? 12 : cmf > 0 ? 5 : 0;
  // الحجم النسبي -- مُكافأ في الاتجاهين (صعود أو هبوط قوي) (وزن 20%)
  // حجم مرتفع في الصعود = شراء مؤسسي | حجم مرتفع في الهبوط = ضغط بيع
  if (stk.pct > 0) sm += rv > 2.5 ? 20 : rv > 1.8 ? 14 : rv > 1.2 ? 8 : 0;
  else             sm += rv > 2.0 ? 10 : rv > 1.5 ? 6  : 0;  // هبوط بحجم عالٍ → ضغط بيع مؤكد (نقاط جزئية)
  // RSI في نطاق صحي (وزن 15%)
  sm += rsi > 50 && rsi < 75 ? 15 : rsi > 40 && rsi <= 50 ? 8 : 0;
  // موقع السعر من المدى السنوي (وزن 10%)
  sm += pfl < 35 && stk.pct > 0 ? 10 : pfl > 65 && stk.pct > 0 ? 5 : 0;
  // فوق VWAP (وزن 10%)
  sm += aboveVwap ? 10 : 0;
  sm = Math.min(100, Math.max(0, sm));

  // 13. كشف التصريف المخفي (Hidden Distribution) -- متعدد الشروط
  // يحتاج: صعود السعر + CMF سلبي + MFI ضعيف + حجم مرتفع + OBV هابط (تباعد)
  // الأكاديمي: 3+ إشارات متباينة = احتمال تصريف
  const hdSignals = [
    stk.pct > 0.3,       // السعر يرتفع
    cmf < -0.02,         // تدفق أموال سلبي
    mfi < 50,            // ضغط بيع في المال
    rv > 1.5,            // حجم مرتفع
    obviDir === "هابط",  // OBV يتراجع رغم صعود السعر
  ].filter(Boolean).length;
  const hd = hdSignals >= 3;  // 3 شروط أو أكثر = إشارة تصريف مخفي

  // 14. احتمال انفجار الحركة (Explosion Potential -- Volatility Squeeze)
  // مبني على: Bollinger Band Squeeze proxy + حجم منخفض + RSI محايد
  // tight range + حجم متراجع عن المتوسط + RSI في المنتصف = ضغط مكبوت
  const ep = tight && rv < 0.75 && rsi > 40 && rsi < 60;

  // 15. النسبة المئوية للحجم الزائد
  const vp = Math.round((rv - 1) * 100);

  // 16. مرحلة وايكوف -- نظام نقاط موزونة (4 محاور)
  const { phase, col: phCol, conf: phConf } = wyckoffPhase(
    pfl, rv, stk.pct, cmf, rsi, mfi, obviDir
  );

  // 17. تصنيف السيولة والألوان
  let col, lbl;
  if      (sm >= 75 && stk.pct > 0 && cmf > 0.05)  { col = BLUE;     lbl = "سيولة مؤسسية"; }
  else if (lpiInt > 35 && stk.pct > 0)               { col = "#4ade80"; lbl = "شراء نشط";    }
  else if (Math.abs(lpiInt) <= 20)                    { col = "#6b7280"; lbl = "حيادي";        }
  else if (hd)                                        { col = "#fb923c"; lbl = "تصريف مخفي";  }
  else if (lpiInt < -35 || (cmf < -0.1 && rv > 1.5)){ col = R;         lbl = "تصريف مؤسسي"; }
  else if (stk.pct < 0 && rsi < 40)                  { col = "#f87171"; lbl = "ضغط بيع";     }
  else                                                { col = T2;        lbl = "محايد";        }

  return {
    stk, sm, bars,
    mfi, cmf: +cmf.toFixed(3),
    lpi: lpiInt,
    rsi,
    atr, atrPct,
    vwap: { val: +vwapVal.toFixed(2), above: aboveVwap, diff: vwapDiff },
    rv: +rv.toFixed(2),
    vp, pfl: Math.round(pfl),
    phase, phCol,
    col, lbl,
    hd, ep, tight,
    obviDir,
    range52Pct: +(rangeRatio * 100).toFixed(1),
  };
}

/* ════════════════════════════════════════════════════════
   MARKET ENGINE -- محرك السوق المركزي
   ────────────────────────────────────────────────────────
   يُولّد سعراً حياً واقعياً ويحتفظ بسجل اليوم الكامل.
   كل مكوّن يرسم من نفس المصدر → اتساق 100%.
   ════════════════════════════════════════════════════════ */

// ─ بيانات تاسي التاريخية الثابتة (seed) لكل فترة ─
// نستخدم بيانات حقيقية تقريبية لتاسي 2024-2025
const HISTORICAL_DATA = {
  // سنة كاملة -- إغلاق أسبوعي (52 أسبوع) -- بيانات تاريخية واقعية لتاسي 2024-2025
  year: [
    11580,11620,11750,11830,11900,11780,11650,11580,11490,11600,
    11720,11850,11940,12050,12180,12250,12310,12200,12080,11960,
    11880,11820,11760,11690,11720,11810,11950,12060,12140,12220,
    12350,12480,12560,12620,12700,12780,12820,12780,12720,12650,
    12580,12640,12720,12810,12870,12820,12760,12710,12770,12820,
    12840,12847.32,
  ],
  // 3 أشهر -- إغلاق يومي (67 نقطة)
  q3m: (() => {
    const rng = seedRng(9001);
    let v = 12580;
    return Array.from({length:66}, () => {
      v += (rng()-0.47)*35 + 0.4;
      return Math.round(v * 100)/100;
    }).concat([12847.32]);
  })(),
  // شهر -- إغلاق يومي (22 نقطة)
  month: (() => {
    const rng = seedRng(9002);
    let v = 12680;
    return Array.from({length:21}, () => {
      v += (rng()-0.46)*28 + 0.8;
      return Math.round(v * 100)/100;
    }).concat([12847.32]);
  })(),
  // أسبوع -- 5 أيام تداول مُولَّدة بـ seed ثابت
  // تبدأ من 12691.04 (الافتتاح) وتنتهي بـ 12847.32 (الإغلاق الحالي)
  week: (() => {
    const rng  = seedRng(9003);
    const OPEN = 12691.04;
    const arr  = [OPEN];
    for (let i = 1; i < 4; i++) {
      const prev  = arr[i-1];
      const drift = (12847.32 - OPEN) / 5;
      const noise = (rng()-0.47)*25;
      arr.push(Math.round((prev + drift + noise)*100)/100);
    }
    arr.push(12847.32);
    return arr;
  })(),
};

// ─ محرك اليوم الحي ─
function useMarketEngine() {
  // سعر الافتتاح الثابت لليوم
  const OPEN_PRICE = 12691.04;

  const [marketState, setMarketState] = useState(() => {
    const rng = seedRng(Date.now() % 100003);
    // 78 نقطة كل 5 دقائق من 10:00 → 16:30
    // نبني السلسلة من الافتتاح حتى السعر الحالي
    const pts = [OPEN_PRICE];
    for (let i = 1; i < 78; i++) {
      const prev  = pts[i-1];
      const drift = (12847.32 - OPEN_PRICE) / 78;
      const noise = (rng() - 0.488) * 22;
      const next  = prev + drift + noise;
      pts.push(Math.round(next * 100) / 100);
    }
    pts[pts.length - 1] = 12847.32;
    return {
      current:   12847.32,
      open:      OPEN_PRICE,
      todayPts:  pts,
      chgPts:    +(((12847.32 - OPEN_PRICE) / OPEN_PRICE) * 100).toFixed(2),
      chgVal:    +(12847.32 - OPEN_PRICE).toFixed(2),
    };
  });

  // تحديث لحظي كل 2 ثانية
  useEffect(() => {
    const id = setInterval(() => {
      setMarketState(prev => {
        // تذبذب ±0.04% لكل tick (واقعي لـ 2 ثانية في سوق نشط)
        const sigma  = prev.current * 0.0004;
        const rngNow = seedRng(Date.now() % 999983);
        const u1     = Math.max(1e-10, rngNow());
        const eps    = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rngNow());
        // حركة عشوائية مع ميل طفيف نحو الاتجاه
        const trend  = prev.current > 12847 ? -0.3 : 0.3;
        const delta  = sigma * eps + trend;
        const next   = Math.max(12650, Math.min(12950,
          Math.round((prev.current + delta) * 100) / 100
        ));
        const newPts = [...prev.todayPts, next];
        const chgP   = +((next - prev.open) / prev.open * 100).toFixed(2);
        const chgV   = +(next - prev.open).toFixed(2);
        return {
          current:  next,
          open:     prev.open,
          todayPts: newPts.slice(-200), // نحتفظ بـ 200 نقطة كحد أقصى
          chgPts:   chgP,
          chgVal:   chgV,
        };
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return marketState;
}


/* ─── TOP BAR ─── */
function TopBar({idx,chgP,showDemoBadge}){
  return(
    <div style={{
      padding:"12px 14px 10px",display:"flex",alignItems:"center",
      justifyContent:"space-between",background:BG,
      position:"sticky",top:0,zIndex:50,
      borderBottom:"1px solid rgba(255,255,255,.05)",
    }}>
      {/* RIGHT: Logo + Name */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{
          width:38,height:38,background:GOLD,borderRadius:10,
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 2px 10px rgba(245,158,11,.35)",
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
            <polyline points="4,16 8,10 12,13 17,7 20,9"/>
          </svg>
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:900,color:T1,lineHeight:1}}>
            <span style={{color:GOLD}}>+</span>تداول
          </div>
          <div style={{fontSize:8,color:T3,letterSpacing:"1.3px",marginTop:1}}>SAUDI MARKET</div>
        </div>
      </div>

      {/* CENTER: Index pill */}
      <div style={{
        background:CARD2,borderRadius:22,padding:"6px 15px",
        display:"flex",alignItems:"center",gap:7,
        border:"1px solid rgba(255,255,255,.07)",
      }}>
        <div style={{width:7,height:7,borderRadius:"50%",background:GOLD,animation:"blink 2s infinite"}}/>
        <span style={{fontSize:13,fontWeight:800,color:T1,letterSpacing:"-.3px",direction:"ltr"}}>{idx.toLocaleString("en-US")}</span>
        <span style={{fontSize:12,color:G,fontWeight:700}}>+{chgP}%</span>
      </div>

      {/* LEFT: Bell */}
      <div style={{
        width:38,height:38,borderRadius:11,background:CARD2,
        display:"flex",alignItems:"center",justifyContent:"center",
        position:"relative",border:"1px solid rgba(255,255,255,.07)",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T2} strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <div style={{
          position:"absolute",top:8,right:8,width:7,height:7,
          background:GOLD,borderRadius:"50%",border:"1.5px solid "+BG,
        }}/>
      </div>
    {showDemoBadge && (
      <div style={{textAlign:"center",padding:"3px 0",background:"rgba(240,192,80,.08)",borderBottom:"1px solid rgba(240,192,80,.15)"}}>
        <span style={{fontSize:9,color:GOLD,letterSpacing:"1px",fontFamily:"monospace"}}>
          ⚠ DEMO -- بيانات محاكاة · ليست أسعاراً حقيقية
        </span>
      </div>
    )}
   </div>   
  );
}


/* ─── HOME CONTENT ─── */
/* ════════════════════════════════════════════════════
   TASI CARD -- شارت تفاعلي لحظي مع فترات زمنية دقيقة
   ════════════════════════════════════════════════════

   منهجية توليد البيانات:
   - Geometric Brownian Motion (GBM) مبسّط لكل فترة
   - seed ثابت لكل فترة → نتائج ثابتة وقابلة للتكرار
   - انعكاس اتجاه chgP في اليوم الأخير لكل الفترات
   - تذبذب يومي يتناسب مع طبيعة كل فترة زمنية
*/

/* ─ توليد سلسلة أسعار بـ GBM مبسّط ─ */
function generatePriceSeries({ points, basePrice, targetPrice, volatility, seed }) {
  const rng    = seedRng(seed);
  const drift  = (targetPrice - basePrice) / points;  // الانحراف الإجمالي
  const series = [basePrice];
  for (let i = 1; i < points; i++) {
    // GBM: S(t+1) = S(t) × exp(drift + σ × ε)
    // حيث ε ~ N(0,1) نقريبها بـ Box-Muller مبسّط
    const u1   = Math.max(1e-10, rng());
    const u2   = rng();
    const eps  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const prev = series[i - 1];
    const next = prev + drift + volatility * eps;
    // Clamp: ±0.5% per 5-min tick -- واقعي لسوق تاسي
    series.push(Math.max(prev * 0.995, Math.min(prev * 1.005, next)));
  }
  // نُعدّل آخر نقطة لتطابق السعر الحالي تماماً
  series[series.length - 1] = targetPrice;
  return series;
}

/* ─ إعدادات كل فترة زمنية ─ */
const PERIOD_CONFIG = {
  "يوم":    {
    points: 78,          // كل 5 دقائق × 6.5 ساعة جلسة
    volatility: 8,       // نقاط تذبذب للخطوة
    baseDelta: -1.23,    // نسبة التغير من بداية الجلسة
    seed: 1001,
    labelFn: (i, n) => {
      const mins = Math.round(i / (n-1) * 390);
      const hh   = String(10 + Math.floor(mins / 60)).padStart(2,"0");
      const mm   = String(mins % 60).padStart(2,"0");
      return `${hh}:${mm}`;
    },
    xLabels: (n) => [0, Math.floor(n*0.25), Math.floor(n*0.5), Math.floor(n*0.75), n-1],
    xLabelFn: (i, n) => {
      const mins = Math.round(i / (n-1) * 390);
      const hh   = String(10 + Math.floor(mins / 60)).padStart(2,"0");
      const mm   = String(mins % 60).padStart(2,"0");
      return `${hh}:${mm}`;
    },
  },
  "أسبوع": {
    points: 5,           // 5 أيام تداول
    volatility: 45,
    baseDelta: -2.1,
    seed: 1007,
    labelFn: (i) => ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس"][i] || "",
    xLabels: (n) => Array.from({length:n},(_,i)=>i),
    xLabelFn: (i) => ["أحد","اثن","ثلا","أرب","خمس"][i] || "",
  },
  "شهر":   {
    points: 22,          // ~22 يوم تداول
    volatility: 55,
    baseDelta: -3.8,
    seed: 1031,
    labelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i));
      return `${d.getDate()}/${d.getMonth()+1}`;
    },
    xLabels: (n) => [0,Math.floor(n*0.25),Math.floor(n*0.5),Math.floor(n*0.75),n-1],
    xLabelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i));
      return `${d.getDate()}/${d.getMonth()+1}`;
    },
  },
  "3 أشهر":{
    points: 66,          // ~66 يوم تداول
    volatility: 38,
    baseDelta: -7.2,
    seed: 1090,
    labelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i));
      const m = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                 "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()];
      return `${d.getDate()} ${m}`;
    },
    xLabels: (n) => [0,Math.floor(n*0.25),Math.floor(n*0.5),Math.floor(n*0.75),n-1],
    xLabelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i));
      return ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
              "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()].slice(0,3);
    },
  },
  "سنة":   {
    points: 52,          // أسبوعياً × 52 أسبوع
    volatility: 120,
    baseDelta: -18.5,
    seed: 1365,
    labelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i)*7);
      return ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
              "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()]+` ${d.getFullYear()}`;
    },
    xLabels: (n) => [0,Math.floor(n*0.25),Math.floor(n*0.5),Math.floor(n*0.75),n-1],
    xLabelFn: (i, n) => {
      const d = new Date(); d.setDate(d.getDate() - (n-1-i)*7);
      return ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
              "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"][d.getMonth()].slice(0,3);
    },
  },
};

function TasiCard({ idx, chgP, market }) {
  const [period,  setPeriod]  = useState("يوم");
  const [tooltip, setTooltip] = useState(null);
  const svgRef                = useRef(null);

  // ── اختيار بيانات الفترة ──
  // "يوم" → بيانات حية من useMarketEngine (تتحدث كل 2 ث)
  // باقي الفترات → بيانات تاريخية ثابتة + آخر نقطة = idx الحالي
  const pts = useMemo(() => {
    if (period === "يوم") {
      // بيانات اليوم الحية -- مرتبطة مباشرة بالمحرك
      const live = market?.todayPts || [idx];
      // نتأكد أن آخر نقطة = السعر الحالي
      const updated = [...live];
      updated[updated.length - 1] = idx;
      return updated;
    }
    // باقي الفترات -- بيانات تاريخية مع تحديث آخر نقطة للسعر الحالي
    const base = {
      "أسبوع":  [...HISTORICAL_DATA.week],
      "شهر":    [...HISTORICAL_DATA.month],
      "3 أشهر": [...HISTORICAL_DATA.q3m],
      "سنة":    [...HISTORICAL_DATA.year],
    }[period] || [idx];
    const updated = [...base];
    updated[updated.length - 1] = idx;
    return updated;
  }, [period, market?.todayPts, idx]);

  // ── حسابات الشارت ──
  const W = 340, H = 96;
  const minV = Math.min(...pts);
  const maxV = Math.max(...pts);
  const pad  = (maxV - minV) * 0.1 || 10;
  const vMin = minV - pad;
  const vMax = maxV + pad;
  const vRng = vMax - vMin;

  const toX = (i) => (i / Math.max(1, pts.length - 1)) * W;
  const toY = (v)  => H - ((v - vMin) / vRng) * H;

  const pathD = pts.map((v,i) =>
    `${i===0?"M":"L"}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`
  ).join(" ");
  const fillD = `${pathD} L${W},${H+2} L0,${H+2} Z`;

  const liveX = toX(pts.length - 1);
  const liveY = toY(pts[pts.length - 1]);

  // ── اتجاه الفترة -- من أول نقطة إلى آخر نقطة ──
  const firstPt    = pts[0] || idx;
  const lastPt     = pts[pts.length - 1] || idx;
  const periodChg  = +((lastPt - firstPt) / firstPt * 100).toFixed(2);
  const periodIsUp = periodChg >= 0;

  // ── اتجاه اليوم -- من market.open إلى السعر الحالي ──
  const openPrice  = market?.open || (idx / (1 + chgP/100));
  const dayChgVal  = +(idx - openPrice).toFixed(2);
  const dayChgPct  = chgP; // مباشر من المحرك
  const isUpToday  = dayChgPct >= 0;

  // ── اللون يتبع الفترة المختارة ──
  const color   = periodIsUp ? G : R;
  const bgFrom  = periodIsUp ? "#071c10" : "#180808";
  const bgTo    = periodIsUp ? "#040e08" : "#0e0404";
  const borderC = periodIsUp ? "rgba(34,197,94,.25)" : "rgba(239,68,68,.25)";

  // ── Labels المحور السيني ──
  const cfg = PERIOD_CONFIG[period] || PERIOD_CONFIG["يوم"];
  const xLabelIdxs = cfg.xLabels(pts.length);

  // ── Crosshair ──
  const handleMove = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const relX    = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pidx    = Math.round((relX / rect.width) * (pts.length - 1));
    const val     = pts[pidx];
    if (!val) return;
    const chgFromOpen = period === "يوم"
      ? +((val - openPrice) / openPrice * 100).toFixed(2)
      : +((val - firstPt) / firstPt * 100).toFixed(2);
    const label = cfg.labelFn(pidx, pts.length);
    setTooltip({
      x: toX(pidx), y: toY(val),
      val: val.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2}),
      chg: chgFromOpen,
      chgVal: period === "يوم" ? +(val - openPrice).toFixed(2) : +(val - firstPt).toFixed(2),
      isUp: chgFromOpen >= 0,
      label,
    });
  }, [pts, cfg, period, openPrice, firstPt]);

  const PERIODS = ["يوم","أسبوع","شهر","3 أشهر","سنة"];

  return (
    <div style={{
      margin:"10px 12px 0",
      background:`linear-gradient(170deg,${bgFrom} 0%,${bgTo} 100%)`,
      borderRadius:20,
      border:`1px solid ${borderC}`,
      overflow:"hidden",
      position:"relative",
      transition:"background .4s, border .4s",
    }}>
      {/* Ambient glow */}
      <div style={{
        position:"absolute",inset:0,pointerEvents:"none",
        background:`radial-gradient(ellipse at 10% 0%,${color}12 0%,transparent 60%)`,
        transition:"background .4s",
      }}/>

      {/* ── Info Row ── */}
      <div style={{
        padding:"14px 16px 6px",
        display:"flex",justifyContent:"space-between",alignItems:"flex-start",
        position:"relative",zIndex:1,
      }}>
        <div>
          <div style={{fontSize:10,color,fontWeight:600,marginBottom:2,opacity:.8,letterSpacing:.3}}>
            مؤشر تاسي الرئيسي
          </div>

          {/* السعر الحالي -- يتحدث مع كل tick */}
          <div style={{
            fontSize:38,fontWeight:900,color:T1,
            letterSpacing:"-1.8px",lineHeight:1,direction:"ltr",
            transition:"color .3s",
          }}>
            {idx.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}
          </div>

          {/* التغير اليومي -- مرتبط بـ market.open */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap"}}>
            <span style={{fontSize:11,fontWeight:700,color:isUpToday?G:R}}>
              {isUpToday?"▲":"▼"} {isUpToday?"+":""}{dayChgVal} نقطة
            </span>
            <span style={{
              fontSize:19,fontWeight:900,
              color:isUpToday?G:R,
              background:isUpToday?"rgba(34,197,94,.14)":"rgba(239,68,68,.14)",
              padding:"2px 8px",borderRadius:8,
              transition:"all .3s",
            }}>
              {isUpToday?"+":""}{dayChgPct}%
            </span>
            {/* تغير الفترة المختارة (إذا غير يومي) */}
            {period !== "يوم" && (
              <span style={{
                fontSize:10,fontWeight:700,
                color: periodIsUp?G:R,
                background: periodIsUp?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",
                padding:"1px 7px",borderRadius:6,
                border:`1px solid ${periodIsUp?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`,
              }}>
                {period}: {periodIsUp?"+":""}{periodChg}%
              </span>
            )}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:5,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:"rgba(255,255,255,.55)"}}>
              حجم التداول:
              <span style={{color:"rgba(255,255,255,.85)",fontWeight:600,marginRight:3}}>4.2 مليار ر.س</span>
            </span>
            <span style={{color:"rgba(255,255,255,.35)"}}>·</span>
            <span style={{fontSize:10,color:"rgba(255,255,255,.55)"}}>
              الافتتاح:
              <span style={{color:"rgba(255,255,255,.85)",fontWeight:600,marginRight:3}}>{openPrice.toFixed(2)}</span>
            </span>
          </div>
        </div>

        {/* Pills */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{
              width:7,height:7,borderRadius:"50%",
              background:isUpToday?G:R,
              boxShadow:`0 0 7px ${isUpToday?G:R}`,
              animation:"pulse 2s infinite",
            }}/>
            <span style={{fontSize:9,color:isUpToday?G:R,fontWeight:600}}>مباشر</span>
          </div>
          {[
            {l:"142",sl:"صاعد",c:G},
            {l:"58", sl:"هابط",c:R},
            {l:"12", sl:"ثابت",c:T2},
          ].map((s,i)=>(
            <div key={i} style={{
              display:"flex",alignItems:"center",gap:3,
              background:"rgba(255,255,255,.06)",borderRadius:16,padding:"2px 8px",
              border:"1px solid rgba(255,255,255,.05)",
            }}>
              <div style={{width:5,height:5,borderRadius:"50%",background:s.c}}/>
              <span style={{fontSize:10,color:s.c,fontWeight:700}}>{s.l}</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,.75)",fontWeight:500}}>{s.sl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Period Tabs ── */}
      <div style={{display:"flex",padding:"2px 14px 0",position:"relative",zIndex:1}}>
        {PERIODS.map(p=>(
          <button key={p} onClick={()=>{ setPeriod(p); setTooltip(null); }} style={{
            flex:1,padding:"6px 2px",background:"none",border:"none",cursor:"pointer",
            fontFamily:"Cairo,sans-serif",fontSize:10,fontWeight:600,
            color: period===p ? color : T3,
            borderBottom: period===p ? `2px solid ${color}` : "2px solid rgba(255,255,255,.06)",
            transition:"all .18s",
          }}>{p}</button>
        ))}
      </div>

      {/* ── SVG Chart ── */}
      <div style={{position:"relative",height:H+30,userSelect:"none"}}>
        <svg
          ref={svgRef}
          width="100%" height={H+2}
          viewBox={`0 0 ${W} ${H+2}`}
          preserveAspectRatio="none"
          style={{display:"block",cursor:"crosshair",touchAction:"none"}}
          onMouseMove={handleMove}
          onMouseLeave={()=>setTooltip(null)}
          onTouchMove={handleMove}
          onTouchEnd={()=>setTooltip(null)}
        >
          <defs>
            <linearGradient id={`chartFill_${period}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.30"/>
              <stop offset="80%"  stopColor={color} stopOpacity="0.03"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="1.2" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* خط سعر الافتتاح (baseline) في وضع اليوم */}
          {period === "يوم" && (() => {
            const baseY = toY(openPrice);
            return (
              <line x1="0" y1={baseY} x2={W} y2={baseY}
                stroke="rgba(255,255,255,.15)" strokeWidth="0.7"
                strokeDasharray="5 4"/>
            );
          })()}

          {/* Area fill */}
          <path d={fillD} fill={`url(#chartFill_${period})`}/>

          {/* Main line */}
          <path d={pathD} fill="none" stroke={color}
            strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            filter="url(#lineGlow)"/>

          {/* Crosshair */}
          {tooltip && <>
            <line x1={tooltip.x} y1={0}   x2={tooltip.x} y2={H}
              stroke={color} strokeWidth="0.8" strokeDasharray="3 2" opacity="0.75"/>
            <line x1={0} y1={tooltip.y}   x2={W}  y2={tooltip.y}
              stroke={color} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3"/>
            <circle cx={tooltip.x} cy={tooltip.y} r="5"   fill={color} opacity="0.18"/>
            <circle cx={tooltip.x} cy={tooltip.y} r="3"   fill={color}/>
            <circle cx={tooltip.x} cy={tooltip.y} r="1.2" fill="#fff"/>
          </>}

          {/* نقطة حية */}
          {!tooltip && <>
            <circle cx={liveX} cy={liveY} r="6"   fill={color} opacity="0.18"/>
            <circle cx={liveX} cy={liveY} r="3.2" fill={color}/>
            <circle cx={liveX} cy={liveY} r="1.2" fill="#fff"/>
          </>}
        </svg>

        {/* X-axis labels */}
        <div style={{
          display:"flex",position:"absolute",bottom:6,left:0,right:0,
          padding:"0 6px",pointerEvents:"none",
        }}>
          {xLabelIdxs.map((pidx,i)=>(
            <div key={i} style={{
              flex:1,
              textAlign: i===0?"left":i===xLabelIdxs.length-1?"right":"center",
              fontSize:7.5,color:T3,
            }}>
              {cfg.xLabelFn(pidx, pts.length)}
            </div>
          ))}
        </div>

        {/* Tooltip Bubble */}
        {tooltip && (
          <div style={{
            position:"absolute",
            top: tooltip.y < 35 ? tooltip.y + 10 : tooltip.y - 62,
            left: tooltip.x > W*0.62
              ? `calc(${tooltip.x/W*100}% - 128px)`
              : `calc(${tooltip.x/W*100}% + 10px)`,
            background:"rgba(12,16,28,.96)",
            border:`1px solid ${tooltip.isUp?G:R}55`,
            borderRadius:11,padding:"7px 13px",
            pointerEvents:"none",
            boxShadow:`0 6px 20px rgba(0,0,0,.6), 0 0 0 1px ${tooltip.isUp?G:R}22`,
            zIndex:20,whiteSpace:"nowrap",
            animation:"fadeUp .1s ease both",
          }}>
            {/* السعر الرئيسي */}
            <div style={{fontSize:15,fontWeight:900,color:T1,lineHeight:1,marginBottom:3}}>
              {tooltip.val}
            </div>
            {/* التغير */}
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,fontWeight:700,color:tooltip.isUp?G:R}}>
                {tooltip.isUp?"+":""}{tooltip.chg}%
              </span>
              <span style={{fontSize:10,color:tooltip.isUp?G:R}}>
                ({tooltip.isUp?"+":""}{tooltip.chgVal})
              </span>
            </div>
            {/* الوقت / التاريخ */}
            <div style={{fontSize:8.5,color:T3,marginTop:3}}>{tooltip.label}</div>
          </div>
        )}
      </div>

      {/* Breadth bar */}
      <div style={{
        margin:"0 14px 12px",height:4,
        background:"rgba(255,255,255,.05)",borderRadius:2,overflow:"hidden",display:"flex",
      }}>
        <div style={{
          width:isUpToday?"71%":"29%",
          background:`linear-gradient(90deg,${isUpToday?G+"60":"#991b1b"},${isUpToday?G:R})`,
          borderRadius:2,transition:"width .5s",
        }}/>
        <div style={{width:"14%",background:`${R}40`}}/>
        <div style={{flex:1,background:"rgba(255,255,255,.07)"}}/>
      </div>
    </div>
  );
}


function HomeContent({idx,chgP,market,isLoadingH=false,isRefreshingH=false}){
  const [stTab,   setStTab]        = useState(0);
  const [period,  setPeriod]       = useState("يومي");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [proMode, setPro]          = useState(true);

  // ── تعديل الفترة الزمنية ──
  // المنهج الصحيح أكاديمياً:
  //   pct_daily هي العائد اليومي الحالي
  //   لتقدير عائد الفترة الأطول من يوم واحد نحتاج بيانات تاريخية فعلية
  //   في غيابها: نستخدم HISTORICAL_DATA لحساب التغير الفعلي للفترة
  //   للأسهم الفردية: نُعدّل بنسبة تغير المؤشر بين الفترتين (beta proxy)
  //
  //   ملاحظة: √T Rule تنطبق على σ (الانحراف المعياري) لا على الـ Return.
  //   pct_weekly ≠ pct_daily × √5 -- هذا خطأ مفاهيمي شائع.
  //   الصحيح: نُظهر pct_daily دائماً مع إشارة للفترة المرجعية.

  const periodDays = {يومي:1, أسبوعي:5, شهري:22, سنوي:250};
  const T = periodDays[period];

  // تغير مؤشر تاسي خلال الفترة (من HISTORICAL_DATA)
  const tasiPeriodPct = (() => {
    if (period === "يومي") return market?.chgPts || 1.23;
    const data = {
      أسبوعي: HISTORICAL_DATA.week,
      شهري:   HISTORICAL_DATA.month,
      سنوي:   HISTORICAL_DATA.year,
    }[period] || HISTORICAL_DATA.week;
    const first = data[0], last = data[data.length-1];
    return first > 0 ? (last - first)/first*100 : 1.23;
  })();

  // لكل سهم: نُعدّل pct بنسبة beta_proxy = pct_daily / tasiDayPct
  // أي: pct_period ≈ tasiPeriodPct × (pct_daily / tasiDayPct)
  // هذا أكاديمياً أقرب للواقع من pct×√T
  const tasiDayPct = market?.chgPts || 1.23;

  const adjusted = liveStocks.map(s => {
    let adjPct;
    if (period === "يومي") {
      adjPct = s.pct;  // يومي: بدون تعديل
    } else {
      // beta_proxy: مدى استجابة السهم للسوق
      const betaProxy = tasiDayPct !== 0 ? s.pct / tasiDayPct : 1;
      // pct_period = tasiPeriodPct × betaProxy
      // مُقيَّد بحدود واقعية حسب الفترة
      const maxPct = {أسبوعي:25, شهري:50, سنوي:150}[period] || 25;
      adjPct = +Math.max(-maxPct, Math.min(maxPct, tasiPeriodPct * betaProxy)).toFixed(2);
    }
    // حجم الفترة: v × عدد الأيام (تقريب معقول للتداول التراكمي)
    const adjVol = Math.round(s.v * T);
    return { ...s, pct: adjPct, v: adjVol };
  });
  const byUp  = [...adjusted].sort((a,b)=>b.pct-a.pct);
  const byDn  = [...adjusted].sort((a,b)=>a.pct-b.pct);
  const byVol = [...adjusted].sort((a,b)=>b.v-a.v);
  const lists = [byUp,byDn,byVol];

  return(
    <div style={{paddingBottom:30,animation:"fadeUp .28s ease both"}}>

      {/* ── 1. TASI Hero with Live Chart ── */}
      <TasiCard idx={idx} chgP={chgP} market={market}/>

      {/* ── 2. Pro / Beginner toggle ── */}
      <div style={{
        margin:"8px 12px",display:"flex",alignItems:"center",
        justifyContent:"space-between",
        padding:"10px 14px",
        background: proMode ? "rgba(245,158,11,.06)" : "rgba(74,158,255,.06)",
        borderRadius:12,
        border:"1px solid "+(proMode?"rgba(245,158,11,.15)":"rgba(74,158,255,.15)"),
      }}>
        <span style={{fontSize:14,fontWeight:700,color:T1}}>الرئيسية</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Beginner label */}
          <span style={{
            fontSize:11,fontWeight:600,
            color:!proMode?BLUE:T3,
            opacity:!proMode?1:.45,
            transition:"all .2s",
          }}>مبتدئ</span>

          {/* Toggle */}
          <div onClick={()=>setPro(p=>!p)} style={{
            width:52,height:28,borderRadius:14,cursor:"pointer",
            background: proMode
              ? "linear-gradient(90deg,#d97706,"+GOLD+")"
              : "linear-gradient(90deg,#1d4ed8,"+BLUE+")",
            position:"relative",transition:"background .3s",flexShrink:0,
            boxShadow: proMode
              ? "0 0 10px rgba(245,158,11,.4)"
              : "0 0 10px rgba(74,158,255,.4)",
          }}>
            <div style={{
              position:"absolute",top:3,
              left: proMode ? 27 : 3,
              width:22,height:22,borderRadius:"50%",background:T1,
              transition:"left .25s",boxShadow:"0 2px 6px rgba(0,0,0,.5)",
            }}/>
          </div>

          {/* Pro label */}
          <span style={{
            fontSize:11,fontWeight:600,
            color:proMode?GOLD:T3,
            opacity:proMode?1:.45,
            transition:"all .2s",
          }}>محترف</span>
        </div>
      </div>

      {/* ── 3. Top Opportunity -- محسوب ديناميكياً من calcLiq ── */}
      {(()=>{
        // نحسب SM Score لكل سهم ونختار الأعلى
        const opps = liveStocks.map(s => {
          const liq = calcLiq(s);
          return { s, sm: liq.sm, liq };
        }).sort((a,b)=>b.sm-a.sm);
        const top = opps[0];
        if(!top) return null;
        const { s, sm, liq } = top;
        const scoreColor = sm>=75 ? G : sm>=55 ? GOLD : R;
        return (
        <div style={{
          margin:"0 12px 8px",
          background:`linear-gradient(135deg,${scoreColor}12,${scoreColor}06)`,
          borderRadius:16,padding:"12px 14px",
          border:`1px solid ${scoreColor}20`,
          display:"flex",alignItems:"center",justifyContent:"space-between",
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:-20,left:-20,width:80,height:80,borderRadius:"50%",
                       background:`${scoreColor}06`}}/>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{
              width:52,height:52,borderRadius:12,
              background:`linear-gradient(135deg,${scoreColor}cc,${scoreColor})`,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              boxShadow:`0 4px 12px ${scoreColor}44`,
            }}>
              <span style={{fontSize:20,fontWeight:900,color:"#000",lineHeight:1}}>{sm}</span>
              <span style={{fontSize:8,color:"rgba(0,0,0,.7)",fontWeight:700}}>SM</span>
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:T1}}>{s.p.toFixed(2)}</div>
              <div style={{fontSize:12,color:s.pct>=0?G:R,fontWeight:600}}>
                {s.pct>=0?"+":""}{s.pct}%
              </div>
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:17,fontWeight:900,color:T1}}>{s.name}</div>
            <div style={{fontSize:11,color:scoreColor,fontWeight:600}}>
              {sm>=75?"سيولة مؤسسية":sm>=55?"فرصة جيدة":"متوسط"}
            </div>
            <div style={{fontSize:9,color:T3,marginTop:2}}>
              MFI {liq.mfi} | CMF {liq.cmf?.toFixed?.(2)||0}
            </div>
          </div>
          <div style={{
            background:`linear-gradient(135deg,${scoreColor}cc,${scoreColor})`,
            borderRadius:10,padding:"9px 12px",
            boxShadow:`0 2px 8px ${scoreColor}44`,
          }}>
            <span style={{fontSize:13,fontWeight:900,color:"#000"}}>{s.sym}</span>
          </div>
        </div>
        );
      })()}

      {/* ── 4. أبرز التحركات ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                   padding:"0 14px 10px"}}>
        {/* Three-lines button with dropdown */}
        <div style={{position:"relative"}}>
          <div
            onClick={()=>setShowPeriodMenu(p=>!p)}
            style={{
              width:34,height:34,borderRadius:9,background:showPeriodMenu?CARD3:CARD2,
              display:"flex",alignItems:"center",justifyContent:"center",
              border:"1px solid "+(showPeriodMenu?"rgba(245,158,11,.4)":"rgba(255,255,255,.06)"),
              cursor:"pointer",transition:"all .15s",
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={showPeriodMenu?GOLD:T2} strokeWidth="1.5">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
          {/* Dropdown menu */}
          {showPeriodMenu&&(
            <div style={{
              position:"absolute",top:40,right:0,zIndex:100,
              background:CARD,borderRadius:12,overflow:"hidden",
              border:"1px solid rgba(255,255,255,.1)",
              boxShadow:"0 8px 24px rgba(0,0,0,.5)",
              minWidth:100,
              animation:"fadeUp .15s ease both",
            }}>
              {["يومي","أسبوعي","شهري","سنوي"].map(p=>(
                <div key={p} onClick={()=>{setPeriod(p);setShowPeriodMenu(false);}}
                  style={{
                    padding:"10px 16px",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
                    background:period===p?"rgba(245,158,11,.1)":"transparent",
                    borderBottom:"1px solid rgba(255,255,255,.05)",
                    transition:"background .12s",
                  }}>
                  <span style={{fontSize:13,fontWeight:period===p?700:500,
                                color:period===p?GOLD:T1}}>{p}</span>
                  {period===p&&<div style={{width:6,height:6,borderRadius:"50%",background:GOLD}}/>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:20,background:GOLD,borderRadius:2}}/>
          <span style={{fontSize:16,fontWeight:800,color:T1}}>أبرز التحركات</span>
          {/* Active period badge */}
          <div style={{
            background:"rgba(245,158,11,.15)",borderRadius:7,
            padding:"2px 8px",border:"1px solid rgba(245,158,11,.25)",
          }}>
            <span style={{fontSize:10,fontWeight:700,color:GOLD}}>{period}</span>
          </div>
        </div>
      </div>

      {/* Stock subtabs */}
      <div style={{padding:"0 12px",marginBottom:2}}>
        <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
          {["الأكثر ارتفاعاً","الأكثر انخفاضاً","الأكثر نشاطاً"].map((t,i)=>(
            <button key={i} onClick={()=>setStTab(i)} style={{
              flex:1,padding:"8px 2px",background:"none",border:"none",cursor:"pointer",
              fontFamily:"Cairo,sans-serif",fontSize:11,fontWeight:600,
              color:stTab===i?T1:T3,
              borderBottom:stTab===i?"2px solid "+GOLD:"2px solid transparent",
              marginBottom:-1,transition:"all .15s",
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── Pull to refresh indicator ── */}
      {isRefreshingH && (
        <div className="pull-indicator">
          <div className="pull-spinner"/>
          <span>جارٍ التحديث...</span>
        </div>
      )}

      {/* Stock rows -- with skeleton loading */}
      <div style={{padding:"0 12px"}}>
        {isLoadingH
          ? Array.from({length:6}).map((_,i) => (
              <div key={i} style={{
                height:64, marginBottom:8, borderRadius:12,
                background:'linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)',
                backgroundSize:'200% 100%',
                animation:'shimmer 1.4s ease infinite',
                animationDelay: i * 0.1 + 's',
              }}/>
            ))
          : lists[stTab].slice(0,6).map((s,i)=>(
              <StockRow key={s.sym+period} s={s} rank={i+1} period={period}/>
            ))
        }
      </div>

      {/* ── 6. Sector performance ── */}
      <SectorSection/>

      {/* ── 6.5. Fear & Greed Index ── */}
      {proMode && <FearGreedIndex/>}

      {/* ── 7. Advanced analysis -- محترف فقط ── */}
      {proMode ? (
        <AdvancedSection/>
      ) : (
        <div style={{
          margin:"14px 12px 0",
          background:"rgba(74,158,255,.05)",
          borderRadius:14,padding:"18px 16px",
          border:"1px solid rgba(74,158,255,.12)",
          textAlign:"center",
        }}>
          <div style={{fontSize:20,marginBottom:8}}>🔒</div>
          <div style={{fontSize:13,fontWeight:700,color:T1,marginBottom:4}}>
            التحليل المتقدم -- وضع المحترف
          </div>
          <div style={{fontSize:11,color:T2,lineHeight:1.7,marginBottom:12}}>
            فعّل وضع <span style={{color:GOLD,fontWeight:700}}>المحترف</span> للوصول إلى
            خريطة السيولة الذكية، المحرك الكمي الخماسي، ومؤشرات عرض السوق
          </div>
          <button onClick={()=>setPro(true)} style={{
            background:"linear-gradient(135deg,#d97706,"+GOLD+")",
            border:"none",borderRadius:10,padding:"9px 24px",
            fontSize:12,fontWeight:700,color:"#000",cursor:"pointer",
            fontFamily:"Cairo,sans-serif",
            boxShadow:"0 3px 10px rgba(245,158,11,.35)",
          }}>
            تفعيل وضع المحترف ⚡
          </button>
        </div>
      )}

    </div>
  );
}

/* ─── STOCK ROW ─── */
function StockRow({s,rank,period}){
  const up=s.pct>=0;
  return(
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"11px 0",borderBottom:"1px solid rgba(255,255,255,.04)",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
        <div style={{
          width:42,height:42,borderRadius:10,flexShrink:0,
          background:CARD2,border:"1px solid rgba(255,255,255,.07)",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        }}>
          <span style={{fontSize:9,fontWeight:900,color:"#d1d5db",letterSpacing:"-.3px"}}>{s.sym}</span>
          <span style={{fontSize:8,color:T3,marginTop:1}}>{rank}</span>
        </div>
        <div style={{minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:T1,whiteSpace:"nowrap",
                       overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div>
          <div style={{fontSize:10,color:T3}}>{s.sec}</div>
        </div>
      </div>
      <div style={{textAlign:"left",flexShrink:0}}>
        <div style={{fontSize:15,fontWeight:800,color:T1}}>{s.p.toFixed(2)}</div>
        <div style={{
          fontSize:11,fontWeight:700,color:up?G:R,
          background:up?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
          padding:"2px 8px",borderRadius:6,marginTop:2,
          display:"inline-block",border:`1px solid ${up?"rgba(34,197,94,.2)":"rgba(239,68,68,.2)"}`,
        }}>{up?"+":""}{s.pct.toFixed(2)}%</div>
      </div>
    </div>
  );
}

/* ─── SECTOR SECTION ─── */
/* ════════════════════════════════════════════════════════════
   FEAR & GREED INDEX -- مؤشر الخوف والطمع الاحترافي
   ════════════════════════════════════════════════════════════

   7 مكوّنات وزن متوازن (مجموع = 100%):

   1. زخم السوق / Market Momentum (20%)
      = نسبة تاسي الحالية من متوسط 125 يوم (SMA-125)
      إشارة: فوق المتوسط = طمع، تحته = خوف

   2. قوة السهم / Stock Price Strength (15%)
      = نسبة الأسهم على قمم 52 أسبوع ÷ قيعان 52 أسبوع
      إشارة: نسبة عالية = طمع

   3. عرض السوق / Market Breadth (15%)
      = مذبذب ماكليلان (A/D line)
      إشارة: موجب قوي = طمع، سالب = خوف

   4. مؤشر تذبذب السوق / Volatility (15%)
      = ATR نسبي مقارنة بالمتوسط التاريخي
      إشارة: تذبذب منخفض = طمع، مرتفع = خوف

   5. سيولة السوق / Market Liquidity (15%)
      = حجم التداول الحالي ÷ متوسط 20 يوم
      إشارة: حجم مرتفع في صعود = طمع

   6. زخم RSI المجمع / Composite RSI (10%)
      = متوسط RSI(14) لجميع الأسهم
      إشارة: > 60 طمع، < 40 خوف

   7. CMF المجمع / Money Flow (10%)
      = متوسط Chaikin Money Flow لجميع الأسهم
      إشارة: موجب = طمع
════════════════════════════════════════════════════════════ */

function calcFearGreed() {
  /* ══════════════════════════════════════════════════════════
     بيانات الأسهم -- 28 يوم لـ warm-up كافٍ
  ══════════════════════════════════════════════════════════ */
  const stockData = liveStocks.map(s => {
    const bars = generateDailyBars(s, 28);
    const atr  = calcATR(bars, 14);
    return {
      stk:  s,
      bars,
      rsi:  calcRSI(bars, 14),
      cmf:  calcCMF(bars, 20),
      atr,
      atrPct: s.p > 0 ? atr / s.p * 100 : 1.5,
      vwap: calcVWAP(bars),
      hi52: s.hi || s.p * 1.2,
      lo52: s.lo || s.p * 0.8,
    };
  });

  const n = stockData.length;

  /* ── 1. زخم السوق (20%) ──
     المنهج: S&P 500 vs SMA-125 (CNN Fear & Greed)
     نُطبّقه على تاسي -- نستخدم percentile ranking بدلاً من معامل تعسفي
     percentile يُحوَّل لـ score 0-100 عبر التوزيع التاريخي المحاكى
  */
  const currentIdx = 12847.32;
  const sma125     = calcSMA125();
  const momentumRaw = ((currentIdx - sma125) / sma125) * 100; // % deviation

  // z-score تقريبي: std dev تاريخية للانحراف ≈ 4% للسوق السعودي
  const momentumZScore = momentumRaw / 4.0;
  // z-score دقيق بـ CDF الطبيعي: CDF(z) = 0.5×(1 + erf(z/√2))
  // نُقرّب erf بسلسلة Horner (دقة < 1.5×10⁻⁷ وفق Abramowitz & Stegun)
  const erfApprox = z => {
    const t = 1 / (1 + 0.3275911 * Math.abs(z));
    const poly = t*(0.254829592 + t*(-0.284496736 + t*(1.421413741 + t*(-1.453152027 + t*1.061405429))));
    const sign = z >= 0 ? 1 : -1;
    return sign * (1 - poly * Math.exp(-z*z));
  };
  const momentumPercentile = Math.max(0, Math.min(100,
    50 * (1 + erfApprox(momentumZScore / Math.sqrt(2)))
  ));
  const momentumScore = Math.round(momentumPercentile);

  /* ── 2. قوة السهم (15%) ──
     NYSE 52-week H/L Ratio = Highs / (Highs + Lows)
     نُطبّقه على أسهم تاسي المتاحة
     نستخدم قمة/قاع فعلي (ليس threshold ±%)
  */
  const atHigh  = stockData.filter(d => d.stk.p >= d.hi52).length;
  const atLow   = stockData.filter(d => d.stk.p <= d.lo52).length;
  const nearH   = stockData.filter(d => d.stk.p >= d.hi52 * 0.98).length; // ±2%
  const nearL   = stockData.filter(d => d.stk.p <= d.lo52 * 1.02).length;
  const hlTotal = nearH + nearL || 1;
  const hlRatio = nearH / hlTotal; // 0-1

  // CNN formula: score = hlRatio × 100 مع smoothing
  // نُضيف weight للأسهم على القمة الحقيقية
  const hlWeighted = (nearH + atHigh * 0.5) / (hlTotal + atHigh * 0.5 + atLow * 0.5);
  const strengthScore = Math.round(Math.max(0, Math.min(100, hlWeighted * 100)));

  /* ── 3. عرض السوق (15%) ──
     McClellan Summation Index = Σ(EMA19 - EMA39) على A/D line تاريخي
     هذا هو التعريف الدقيق وفق Sherman & Marian McClellan 1969
  */
  const adv = liveStocks.filter(s => s.pct > 0).length;
  const dec = liveStocks.filter(s => s.pct < 0).length;

  // بناء سلسلة A/D يومية من HISTORICAL_DATA (52 أسبوع × 5 أيام/أسبوع ≈ 260 يوم)
  const calcEMA = (values, period) => {
    if (values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++)
      ema = values[i] * k + ema * (1 - k);
    return ema;
  };

  // سلسلة A/D يومية محاكاة واقعية من بيانات تاسي السنوية
  const rngAD = seedRng(77001);
  const adSeries = [];
  let cumAD = 0;
  HISTORICAL_DATA.year.forEach((v, i) => {
    if (i === 0) return;
    const chg    = v - HISTORICAL_DATA.year[i-1];
    const advEst = Math.round(n * (0.5 + chg / 300 + (rngAD()-0.5)*0.12));
    const advDay = Math.max(1, Math.min(n-1, advEst));
    const decDay = n - advDay;
    cumAD += advDay - decDay;
    // نُولّد 5 أيام لكل أسبوع
    for (let d = 0; d < 5; d++) {
      const noise = (rngAD()-0.5)*(n*0.2);
      adSeries.push(cumAD + noise);
    }
  });
  // اليوم الحالي
  adSeries.push(cumAD + (adv - dec));

  // McClellan Oscillator = EMA(19) - EMA(39)
  const ema19 = calcEMA(adSeries, 19);
  const ema39 = calcEMA(adSeries, 39);
  const mclOscillator = ema19 - ema39;

  // McClellan Summation Index = Σ(Oscillator) -- نُحسبه تراكمياً
  let summation = 0;
  const oscSeries = [];
  for (let i = 0; i < adSeries.length; i++) {
    const slice_i = adSeries.slice(0, i+1);
    const e19 = calcEMA(slice_i, 19);
    const e39 = calcEMA(slice_i, 39);
    oscSeries.push(e19 - e39);
    summation = oscSeries.reduce((s,v) => s+v, 0);
  }

  // Summation عادةً بين -1000 و +1000 -- نُطبّع لـ 0-100
  // نستخدم tanh للـ normalization (أكاديمياً أفضل من linear clamp)
  const summationNorm = Math.tanh(summation / 500);  // -1 to +1
  const breadthScore  = Math.round(Math.max(0, Math.min(100, 50 + summationNorm * 50)));

  /* ── 4. التذبذب (15%) ──
     CNN: VIX vs SMA-50(VIX) -- خوف شديد عندما VIX > SMA
     نُطبّق على تاسي: ATR النسبي vs SMA-20(ATR) لنفس السهم
     z-score للانحراف بدلاً من مقارنة بمرجع ثابت hard-coded
  */
  // نُحسب ATR التاريخي (SMA-20 للـ ATR) من بيانات كل سهم
  const atrHistoricalScores = stockData.map(d => {
    // SMA-20 للـ ATR من أول 14 شمعة (warm-up) إلى آخر 20
    const atrSeries = [];
    for (let i = 14; i < d.bars.length; i++) {
      const sliceAtr = d.bars.slice(Math.max(0, i-14), i);
      if (sliceAtr.length < 2) continue;
      let tr = 0;
      for (let j = 1; j < sliceAtr.length; j++) {
        tr += Math.max(
          sliceAtr[j].hi - sliceAtr[j].lo,
          Math.abs(sliceAtr[j].hi - sliceAtr[j-1].close),
          Math.abs(sliceAtr[j].lo - sliceAtr[j-1].close)
        );
      }
      atrSeries.push(tr / (sliceAtr.length - 1) / d.stk.p * 100);
    }
    if (atrSeries.length < 2) return 50;
    const smaATR = atrSeries.reduce((s,v)=>s+v,0) / atrSeries.length;
    const currentAtr = d.atrPct;
    // نسبة ATR الحالي / SMA_ATR -- مشابه لـ VIX/SMA_VIX في CNN
    const ratio = smaATR > 0 ? currentAtr / smaATR : 1;
    // ratio < 1 = هدوء = طمع | ratio > 1 = توتر = خوف
    // نُطبّع: ratio=0.5→100, ratio=1→50, ratio=2→0
    return Math.max(0, Math.min(100, 100 - (ratio - 0.5) * 100));
  });
  const volatilityScore = Math.round(
    atrHistoricalScores.reduce((s,v)=>s+v,0) / atrHistoricalScores.length
  );

  /* ── 5. سيولة السوق (15%) ──
     CNN: Safe Haven Demand = فارق عائد السندات vs الأسهم (20 يوم)
     نُقدّره في غياب بيانات السندات بمعادلة مركّبة:
     - حجم التداول النسبي (مكوّن أساسي)
     - اتجاه السوق (مكوّن مُعدِّل)
     نستخدم logistic function بدلاً من معاملات تعسفية
  */
  const totalVol    = liveStocks.reduce((s, stk) => s + (stk.v || 0), 0);
  const totalAvgVol = liveStocks.reduce((s, stk) => s + (stk.avgVol || stk.v || 0), 0);
  const volRv       = totalAvgVol > 0 ? totalVol / totalAvgVol : 1;
  const advPct      = adv / n;  // نسبة الصاعد

  // Logistic(x) = 1/(1+e^-x) → نطاق 0-1
  const logistic = x => 1 / (1 + Math.exp(-x));
  // إشارة مركّبة: حجم مرتفع في السوق الصاعد = طمع
  const liqSignal = (volRv - 1) * 2 + (advPct - 0.5) * 4;
  const liquidityScore = Math.round(logistic(liqSignal) * 100);

  /* ── 6. RSI المجمع (10%) ──
     الأكاديمي: نسبة الأسهم فوق RSI-50 (breadth RSI)
     أفضل من المتوسط البسيط لأنه يعكس التوزيع لا المتوسط
  */
  const aboveRSI50 = stockData.filter(d => d.rsi > 50).length;
  const aboveRSI60 = stockData.filter(d => d.rsi > 60).length;
  // نُعطي وزناً للأسهم فوق 60 (زخم قوي)
  const rsiBreadth = (aboveRSI50 + aboveRSI60 * 0.5) / (n * 1.5);
  const rsiScore   = Math.round(Math.max(0, Math.min(100, rsiBreadth * 100)));

  /* ── 7. CMF المجمع (10%) ──
     نسبة الأسهم بـ CMF موجب (breadth CMF)
     أكثر موثوقية من المتوسط البسيط عند N صغير
     + نُضيف وزناً للأسهم بـ CMF قوي (>0.1)
  */
  const positiveCMF = stockData.filter(d => d.cmf > 0).length;
  const strongCMF   = stockData.filter(d => d.cmf > 0.10).length;
  const cmfBreadth  = (positiveCMF + strongCMF * 0.5) / (n * 1.5);
  const cmfScore    = Math.round(Math.max(0, Math.min(100, cmfBreadth * 100)));

  /* ── المجموع الموزون ── */
  const totalScore = Math.round(
    momentumScore    * 0.20 +
    strengthScore    * 0.15 +
    breadthScore     * 0.15 +
    volatilityScore  * 0.15 +
    liquidityScore   * 0.15 +
    rsiScore         * 0.10 +
    cmfScore         * 0.10
  );

  return {
    total: totalScore,
    components: [
      { id:"momentum",   label:"زخم السوق",       weight:20, score:momentumScore,
        desc:`تاسي ${momentumRaw.toFixed(1)}% عن SMA-125 (z=${momentumZScore.toFixed(2)}σ)`,
        raw:`${currentIdx.toFixed(0)} vs SMA-125(${Math.round(sma125)})` },
      { id:"strength",   label:"قوة السهم",        weight:15, score:strengthScore,
        desc:`${nearH} سهم قرب قمة سنوية / ${nearL} قرب قاع`,
        raw:`H-L Ratio = ${(hlWeighted*100).toFixed(0)}%` },
      { id:"breadth",    label:"عرض السوق",        weight:15, score:breadthScore,
        desc:`McClellan Summation = ${Math.round(summation)} | Osc = ${mclOscillator.toFixed(1)}`,
        raw:`EMA(19)-EMA(39) على A/D line تاريخي` },
      { id:"volatility", label:"التذبذب",          weight:15, score:volatilityScore,
        desc:`ATR/SMA(ATR) -- نسبة تذبذب حالي لمتوسطه التاريخي`,
        raw:`كل سهم: ATR_current / ATR_historical_avg` },
      { id:"liquidity",  label:"سيولة السوق",      weight:15, score:liquidityScore,
        desc:`حجم ${volRv >= 1 ? "+" : ""}${((volRv-1)*100).toFixed(0)}% | Logistic(vol+dir)`,
        raw:`${(totalVol/1e6).toFixed(0)}م / متوسط ${(totalAvgVol/1e6).toFixed(0)}م` },
      { id:"rsi",        label:"RSI المجمع",       weight:10, score:rsiScore,
        desc:`${aboveRSI50}/${n} سهم فوق RSI-50 | ${aboveRSI60}/${n} فوق RSI-60`,
        raw:`RSI Breadth (نسبة الأسهم فوق 50)` },
      { id:"cmf",        label:"تدفق الأموال CMF", weight:10, score:cmfScore,
        desc:`${positiveCMF}/${n} سهم بـ CMF موجب | ${strongCMF}/${n} بـ CMF>0.1`,
        raw:`CMF Breadth (نسبة الأسهم بتدفق إيجابي)` },
    ],
    prevScore: FG_HISTORICAL.yesterday(totalScore),
    weekAgo:   FG_HISTORICAL.weekAgo(totalScore),
    monthAgo:  FG_HISTORICAL.monthAgo(totalScore),
    // للإشارة في الواجهة
    adLine: adv - dec,
    mclOsc: Math.round(mclOscillator),
    summation: Math.round(summation),
  };
}

/* ── تصنيف النقطة ── */
function fgLabel(score) {
  if (score >= 80) return { ar:"طمع شديد",   en:"Extreme Greed", col:"#1ee68a", bg:"rgba(34,197,94,.12)"  };
  if (score >= 60) return { ar:"طمع",         en:"Greed",         col:"#86efac", bg:"rgba(134,239,172,.1)" };
  if (score >= 45) return { ar:"محايد",        en:"Neutral",       col:"#f0c050", bg:"rgba(245,158,11,.1)"  };
  if (score >= 25) return { ar:"خوف",          en:"Fear",          col:"#fb923c", bg:"rgba(251,146,60,.1)"  };
  return                  { ar:"خوف شديد",    en:"Extreme Fear",  col:"#ff5f6a", bg:"rgba(239,68,68,.12)"  };
}

function FearGreedIndex() {
  const [expanded, setExpanded] = useState(false);
  const [activeComp, setActiveComp] = useState(null);

  const data    = useMemo(() => calcFearGreed(), []);
  const score   = data.total;
  const lbl     = fgLabel(score);

  // ── مقياس العقرب (Needle gauge) ──
  const R   = 80, CX = 100, CY = 90;
  const deg = -180 + (score / 100) * 180;  // -180° (خوف شديد) → 0° (طمع شديد)
  const rad = (deg * Math.PI) / 180;
  const nx  = CX + (R - 10) * Math.cos(rad);
  const ny  = CY + (R - 10) * Math.sin(rad);

  // ── شرائح الـ gauge ──
  const ZONES = [
    { from: 0,  to: 20,  col:"#ff5f6a", label:"خوف شديد" },
    { from: 20, to: 40,  col:"#fb923c", label:"خوف"      },
    { from: 40, to: 60,  col:"#f0c050", label:"محايد"    },
    { from: 60, to: 80,  col:"#86efac", label:"طمع"      },
    { from: 80, to: 100, col:"#1ee68a", label:"طمع شديد" },
  ];

  function arcPath(fromPct, toPct, r) {
    const a1 = ((-180 + fromPct * 1.8) * Math.PI) / 180;
    const a2 = ((-180 + toPct  * 1.8) * Math.PI) / 180;
    const x1 = CX + r * Math.cos(a1), y1 = CY + r * Math.sin(a1);
    const x2 = CX + r * Math.cos(a2), y2 = CY + r * Math.sin(a2);
    const lg = toPct - fromPct > 50 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`;
  }

  return (
    <div style={{ margin:"12px 12px 0" }}>
      {/* Header */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:8,
      }}>
        <button onClick={()=>setExpanded(e=>!e)} style={{
          background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",
          borderRadius:8,padding:"4px 10px",cursor:"pointer",
          fontFamily:"Cairo,sans-serif",fontSize:9,fontWeight:600,color:T2,
        }}>
          {expanded ? "إخفاء التفاصيل ▲" : "عرض التفاصيل ▼"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:18,background:lbl.col,borderRadius:2}}/>
          <span style={{fontSize:15,fontWeight:800,color:T1}}>مؤشر الخوف والطمع</span>
        </div>
      </div>

      {/* Main Card */}
      <div style={{
        background:`linear-gradient(145deg,${lbl.bg},rgba(255,255,255,.02))`,
        borderRadius:18,
        border:`1px solid ${lbl.col}35`,
        padding:"16px 14px 12px",
        overflow:"hidden",
        position:"relative",
      }}>
        {/* Glow */}
        <div style={{
          position:"absolute",top:-30,right:-30,width:120,height:120,
          borderRadius:"50%",background:lbl.col+"1a",pointerEvents:"none",
        }}/>

        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>

          {/* ── Gauge SVG ── */}
          <div style={{flexShrink:0}}>
            <svg width="200" height="108" viewBox="0 0 200 108">
              {/* Background arc */}
              <path d={arcPath(0,100,R)} fill="none"
                stroke="rgba(255,255,255,.07)" strokeWidth="14"
                strokeLinecap="round"/>

              {/* Colored zone arcs */}
              {ZONES.map((z,i)=>(
                <path key={i} d={arcPath(z.from,z.to,R)} fill="none"
                  stroke={z.col} strokeWidth="12" strokeLinecap="butt"
                  opacity="0.75"/>
              ))}

              {/* Inner ring */}
              <path d={arcPath(0,100,R-16)} fill="none"
                stroke="rgba(0,0,0,.3)" strokeWidth="2"/>

              {/* Score arc (filled to current score) */}
              <path d={arcPath(0,score,R)} fill="none"
                stroke={lbl.col} strokeWidth="14" strokeLinecap="round"
                opacity="0.35"/>

              {/* Needle */}
              <line
                x1={CX} y1={CY}
                x2={nx}  y2={ny}
                stroke={lbl.col} strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Needle base */}
              <circle cx={CX} cy={CY} r="6" fill={lbl.col} opacity="0.9"/>
              <circle cx={CX} cy={CY} r="3" fill="#fff"/>

              {/* Score in center */}
              <text x={CX} y={CY+20} textAnchor="middle"
                fill={lbl.col} fontSize="22" fontWeight="900" fontFamily="Cairo">
                {score}
              </text>
              <text x={CX} y={CY+34} textAnchor="middle"
                fill={T2} fontSize="8" fontFamily="Cairo">
                / 100
              </text>

              {/* Zone labels */}
              {[
                {x:14, y:90, t:"خوف شديد", c:"#ff5f6a"},
                {x:186,y:90, t:"طمع شديد", c:"#1ee68a"},
              ].map((lb,i)=>(
                <text key={i} x={lb.x} y={lb.y} textAnchor="middle"
                  fill={lb.c} fontSize="7" fontFamily="Cairo" opacity="0.8">
                  {lb.t}
                </text>
              ))}
            </svg>
          </div>

          {/* ── Right info ── */}
          <div style={{flex:1}}>
            {/* Classification */}
            <div style={{
              display:"inline-block",
              background:lbl.col+"20",border:`1px solid ${lbl.col}50`,
              borderRadius:10,padding:"4px 12px",marginBottom:8,
            }}>
              <span style={{fontSize:15,fontWeight:900,color:lbl.col}}>{lbl.ar}</span>
              <span style={{fontSize:9,color:lbl.col,opacity:.7,marginRight:5}}> {lbl.en}</span>
            </div>

            {/* Historical comparison */}
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {[
                {l:"الآن",     v:score,          c:lbl.col},
                {l:"أمس",      v:data.prevScore, c:fgLabel(data.prevScore).col},
                {l:"أسبوع",    v:data.weekAgo,   c:fgLabel(data.weekAgo).col},
                {l:"شهر",      v:data.monthAgo,  c:fgLabel(data.monthAgo).col},
              ].map((h,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:9,color:T3,width:30,textAlign:"right"}}>{h.l}</span>
                  <div style={{flex:1,height:4,background:"rgba(255,255,255,.06)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{
                      width:h.v+"%",height:"100%",
                      background:h.c,borderRadius:2,
                      transition:"width .5s ease",
                    }}/>
                  </div>
                  <span style={{
                    fontSize:10,fontWeight:700,color:h.c,
                    minWidth:24,textAlign:"left",
                  }}>{h.v}</span>
                  <span style={{
                    fontSize:8,color:h.c,
                    background:h.c+"15",borderRadius:4,padding:"1px 5px",
                  }}>{fgLabel(h.v).ar}</span>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{
              marginTop:8,fontSize:7.5,color:T3,lineHeight:1.5,
              borderTop:"1px solid rgba(255,255,255,.05)",paddingTop:6,
            }}>
              ⚠ استرشادي · 7 مؤشرات: زخم+قوة+عرض+تذبذب+سيولة+RSI+CMF
            </div>
          </div>
        </div>

        {/* ── 7 Component Breakdown ── */}
        {expanded && (
          <div style={{marginTop:14,animation:"fadeUp .2s ease both"}}>
            <div style={{fontSize:10,fontWeight:700,color:T2,marginBottom:10,textAlign:"right"}}>
              تفصيل المكوّنات السبعة
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {data.components.map((c,i)=>{
                const cl  = fgLabel(c.score);
                const isA = activeComp === c.id;
                return (
                  <div key={i}
                    onClick={()=>setActiveComp(isA ? null : c.id)}
                    style={{
                      background: isA ? cl.col+"12" : "rgba(255,255,255,.03)",
                      borderRadius:10,padding:"8px 11px",cursor:"pointer",
                      border:`1px solid ${isA ? cl.col+"40" : "rgba(255,255,255,.06)"}`,
                      transition:"all .18s",
                    }}>
                    {/* Row */}
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {/* Score circle */}
                      <div style={{
                        width:36,height:36,borderRadius:"50%",flexShrink:0,
                        background:`conic-gradient(${cl.col} ${c.score*3.6}deg, rgba(255,255,255,.06) 0deg)`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        position:"relative",
                      }}>
                        <div style={{
                          position:"absolute",inset:3,borderRadius:"50%",
                          background:BG,display:"flex",alignItems:"center",justifyContent:"center",
                        }}>
                          <span style={{fontSize:10,fontWeight:900,color:cl.col}}>{c.score}</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:9,color:T3}}>وزن {c.weight}%</span>
                          <span style={{fontSize:11,fontWeight:700,color:T1}}>{c.label}</span>
                        </div>
                        {/* Progress bar */}
                        <div style={{
                          height:5,background:"rgba(255,255,255,.06)",
                          borderRadius:3,overflow:"hidden",marginTop:4,
                        }}>
                          <div style={{
                            width:c.score+"%",height:"100%",
                            background:`linear-gradient(90deg,${cl.col}80,${cl.col})`,
                            borderRadius:3,transition:"width .5s ease",
                          }}/>
                        </div>
                      </div>

                      {/* Label badge */}
                      <span style={{
                        fontSize:8.5,fontWeight:700,color:cl.col,
                        background:cl.col+"18",borderRadius:6,padding:"2px 7px",
                        border:`1px solid ${cl.col}30`,flexShrink:0,
                      }}>{cl.ar}</span>
                    </div>

                    {/* Expanded detail */}
                    {isA && (
                      <div style={{
                        marginTop:8,paddingTop:8,
                        borderTop:"1px solid rgba(255,255,255,.07)",
                        animation:"fadeUp .15s ease both",
                      }}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          <div style={{background:"rgba(255,255,255,.04)",borderRadius:7,padding:"6px 8px"}}>
                            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>القيمة المحسوبة</div>
                            <div style={{fontSize:10,fontWeight:700,color:cl.col}}>{c.desc}</div>
                          </div>
                          <div style={{background:"rgba(255,255,255,.04)",borderRadius:7,padding:"6px 8px"}}>
                            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>البيانات الخام</div>
                            <div style={{fontSize:10,fontWeight:700,color:T2}}>{c.raw}</div>
                          </div>
                          <div style={{background:"rgba(255,255,255,.04)",borderRadius:7,padding:"6px 8px",gridColumn:"1/-1"}}>
                            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>المساهمة في المؤشر الكلي</div>
                            <div style={{fontSize:10,fontWeight:700,color:cl.col}}>
                              {c.weight}% × {c.score} = {(c.weight * c.score / 100).toFixed(1)} نقطة
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Formula summary */}
            <div style={{
              marginTop:10,background:"rgba(255,255,255,.03)",
              borderRadius:10,padding:"10px 12px",
              border:"1px solid rgba(255,255,255,.06)",
            }}>
              <div style={{fontSize:9,color:T2,fontWeight:700,marginBottom:4,textAlign:"right"}}>
                معادلة الحساب
              </div>
              <div style={{fontSize:8.5,color:T3,lineHeight:1.8,direction:"ltr",textAlign:"left"}}>
                FGI = Momentum(20%) + Strength(15%) + Breadth(15%) +
                Volatility(15%) + Liquidity(15%) + RSI(10%) + CMF(10%)
              </div>
              <div style={{
                marginTop:6,display:"flex",justifyContent:"flex-end",
                alignItems:"center",gap:8,
              }}>
                <span style={{fontSize:9,color:T3}}>النقاط الكلية:</span>
                <span style={{fontSize:16,fontWeight:900,color:lbl.col}}>{score}</span>
                <span style={{fontSize:9,color:T3}}>/ 100</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   حساب تدفق رأس المال لكل قطاع -- المعادلات الأكاديمية
   ────────────────────────────────────────────────────
   المؤشر المحسوب: Dollar Price Impact (DPI)
   ─────────────────────────────────────────
   وهو مختلف عن "Money Flow" الكلاسيكي (Chaikin):
     • Money Flow الحقيقي = Σ(TP × Vol) للأيام الصاعدة/الهابطة
     • DPI = Σ(vol × price × |pct| / 100) ← ما نحسبه هنا
     DPI يقيس: "كم ريالاً تأثّر بحركة السعر في كل اتجاه؟"

   الصيغ المُستخدمة:
   ─────────────────
   Turnover       = Σ(vol × price)             ← قيمة التداول الكاملة
   DPI_in         = Σ(vol × price × |pct|/100) for pct > 0  ← تأثير الصعود
   DPI_out        = Σ(vol × price × |pct|/100) for pct < 0  ← تأثير الهبوط
   Net_DPI        = DPI_in − DPI_out
   Active_Flow    = DPI_in + DPI_out
   FR_active      = Net_DPI / Active_Flow × 100  ← نسبة من التدفق الفعّال
   FR_turnover    = Net_DPI / Turnover × 100     ← نسبة من السيولة الكلية
   weightedPct    = Σ(pct × vol × price) / Σ(vol × price)  ← موزون بالقيمة
   vol_normalized = (v + avgVol) / 2             ← تطبيع شذوذ الحجم اليومي
══════════════════════════════════════════════════════ */
function calcSectorFlows() {
  const totalTurnover = liveStocks.reduce((s, st) => s + st.v * st.p, 0) || 1;

  // حساب الانحراف المعياري لـ FR_active لتصنيف ديناميكي
  // نحسبه في مرحلة ثانية بعد تجميع كل القطاعات
  const rawResults = SECTORS_DATA.map(sec => {
    const secStocks = STOCKS.filter(s => s.sec === sec.name);
    if (secStocks.length === 0) return {
      ...sec, secStocks:[], dpiIn:0, dpiOut:0, netDPI:0,
      turnover:0, activeFlow:0, frActive:0, frTurnover:0,
      weightedPct:0, dominance:50, marketShare:0, volume:0,
      flowDir:"محايد", flowCol:T2, flowLabel:"لا بيانات",
    };

    // ── حجم مُطبَّع: يُخفِّف شذوذ الحجم اليومي ──
    // (v + avgVol) / 2 يُعطي وزناً للحجم التاريخي
    const normVol = st => (st.v + (st.avgVol || st.v)) / 2;

    // ── Turnover بالحجم المُطبَّع ──
    const turnover = secStocks.reduce((s, st) => s + normVol(st) * st.p, 0);

    // ── Dollar Price Impact ──
    let dpiIn = 0, dpiOut = 0;
    secStocks.forEach(st => {
      const vol   = normVol(st);
      const dpi   = vol * st.p * Math.abs(st.pct) / 100;
      if      (st.pct > 0) dpiIn  += dpi;
      else if (st.pct < 0) dpiOut += dpi;
      // pct === 0 → لا تأثير سعري → يُهمل ✓
    });

    const netDPI      = dpiIn - dpiOut;
    const activeFlow  = dpiIn + dpiOut || 1; // التدفق الفعّال (غير الصفري)

    // ── FR_active: نسبة صافي التأثير من التأثير الكلي ──
    // أكاديمياً أكثر تعبيراً من FR_turnover (أقل تخفيفاً)
    const frActive   = (netDPI / activeFlow) * 100;   // نطاق [-100, +100]

    // ── FR_turnover: نسبة صافي التأثير من السيولة الكاملة ──
    const frTurnover = turnover > 0 ? (netDPI / turnover) * 100 : 0;

    // ── weightedPct: موزون بالقيمة السوقية (value-weighted) ──
    // أكاديمياً أدق من الوزن بعدد الأسهم
    const totalValue  = secStocks.reduce((s, st) => s + normVol(st) * st.p, 0) || 1;
    const weightedPct = secStocks.reduce((s, st) => s + st.pct * normVol(st) * st.p, 0) / totalValue;

    // ── Dominance: نسبة DPI الداخل من التدفق الفعّال ──
    const dominance = (dpiIn / activeFlow) * 100;

    // ── Market Share ──
    const marketShare = (turnover / totalTurnover) * 100;

    return {
      ...sec,
      secStocks,
      inflow: dpiIn, outflow: dpiOut,        // للتوافق مع الـ UI القديم
      netFlow: netDPI,
      dpiIn, dpiOut, netDPI,
      turnover, activeFlow, marketShare: +marketShare.toFixed(1),
      frActive:   +frActive.toFixed(2),       // [-100, +100] -- الإشارة الرئيسية
      frTurnover: +frTurnover.toFixed(3),     // نسبة مخففة
      flowRatio:  +frActive.toFixed(2),       // للتوافق مع الـ UI
      dominance:  +dominance.toFixed(1),
      weightedPct: +weightedPct.toFixed(2),
      flowDir:  netDPI >= 0 ? "دخول" : "خروج",
      flowCol:  netDPI >= 0 ? G : R,
      volume:   secStocks.reduce((s, st) => s + st.v, 0),
    };
  });

  // ── تصنيف ديناميكي بناءً على توزيع |frActive| الفعلي ──
  // نستخدم percentile ranking بدلاً من حدود hard-coded
  const frValues = rawResults.map(r => Math.abs(r.frActive || 0)).filter(v => v > 0);
  const frMean   = frValues.length > 0
    ? frValues.reduce((s,v)=>s+v,0) / frValues.length : 50;
  const frStd    = frValues.length > 1
    ? Math.sqrt(frValues.reduce((s,v)=>s+(v-frMean)**2,0)/frValues.length) : 20;

  return rawResults.map(r => {
    const absFR = Math.abs(r.frActive || 0);
    // تصنيف بـ z-score: > +1σ قوي، 0 إلى +1σ معتدل، < 0 ضعيف
    const zFR     = frStd > 0 ? (absFR - frMean) / frStd : 0;
    const flowLabel = zFR > 1.0  ? "تدفق قوي جداً"
                    : zFR > 0.25 ? "تدفق قوي"
                    : zFR > -0.5 ? "تدفق معتدل"
                    : "تدفق ضعيف";
    return { ...r, flowLabel };
  }).sort((a, b) => b.netDPI - a.netDPI);
}

function SectorSection(){
  const [selected,  setSelected]  = useState(null);
  const [viewMode,  setViewMode]  = useState("perf");
  const sectorFlows = useMemo(() => calcSectorFlows(), []);

  // ── أُضيف pct المحسوب الحقيقي لكل قطاع ──
  const sectorsWithRealPct = useMemo(() => {
    return SECTORS_DATA.map(sec => {
      const flow = sectorFlows.find(f => f.id === sec.id);
      return { ...sec, pct: flow ? flow.weightedPct : sec.pct };
    });
  }, [sectorFlows]);

  // ── Pie slices ──
  const cx=160, cy=88, rx=115, ry=65, dep=24;
  const slices = (() => {
    let a = -Math.PI/2;
    return sectorsWithRealPct.map(s => {
      const sw = (s.w/100)*2*Math.PI, a1=a, a2=a+sw; a=a2;
      const x1=cx+rx*Math.cos(a1), y1=cy+ry*Math.sin(a1);
      const x2=cx+rx*Math.cos(a2), y2=cy+ry*Math.sin(a2);
      const mid = (a1+a2)/2;
      return { ...s, x1,y1,x2,y2, lg:sw>Math.PI?1:0, mid };
    });
  })();

  const selSec      = selected ? SECTORS_DATA.find(s=>s.id===selected) : null;
  const selFlow     = selected ? sectorFlows.find(s=>s.id===selected)  : null;
  const selStocks   = selSec   ? STOCKS.filter(s=>s.sec===selSec.name) : [];

  // أكبر تدفق لتطبيع الأشرطة
  const maxAbsFlow  = Math.max(...sectorFlows.map(s=>Math.abs(s.netFlow)), 1);
  const totalVolume = sectorFlows.reduce((s,f)=>s+f.volume,0) || 1;

  return (
    <div>
      {/* ── Header ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                   padding:"14px 14px 6px"}}>
        <div style={{display:"flex",gap:4}}>
          {[{id:"perf",l:"الأداء"},{id:"flow",l:"التدفق"},{id:"bubble",l:"الفقاعة"}].map(v=>(
            <button key={v.id} onClick={()=>setViewMode(v.id)} style={{
              padding:"4px 10px",borderRadius:8,cursor:"pointer",
              fontFamily:"Cairo,sans-serif",fontSize:10,fontWeight:600,
              background:viewMode===v.id?GOLD+"20":"rgba(255,255,255,.04)",
              border:"1px solid "+(viewMode===v.id?GOLD+"50":"rgba(255,255,255,.07)"),
              color:viewMode===v.id?GOLD:T3,
            }}>{v.l}</button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:3,height:18,background:GOLD,borderRadius:2}}/>
          <span style={{fontSize:15,fontWeight:800,color:T1}}>أداء القطاعات</span>
        </div>
      </div>

      {/* ── 3D Pie (مشترك بين جميع modes) ── */}
      <div style={{display:"flex",justifyContent:"center",padding:"4px 0 8px",position:"relative"}}>
        <svg width="320" height="190" viewBox="0 0 320 190" style={{cursor:"pointer"}}>
          {slices.map((s,i)=>
            s.mid>0&&s.mid<Math.PI ? (
              <path key={"d"+i}
                d={`M${s.x1},${s.y1} L${s.x1},${s.y1+dep} A${rx},${ry} 0 ${s.lg} 1 ${s.x2},${s.y2+dep} L${s.x2},${s.y2} A${rx},${ry} 0 ${s.lg} 0 ${s.x1},${s.y1}Z`}
                fill={s.pc} opacity={selected===s.id?0.75:0.38}
                style={{transition:"opacity .2s"}}/>
            ):null
          )}
          {slices.map((s,i)=>{
            const flow    = sectorFlows.find(f=>f.id===s.id);
            const isIn    = flow?.netFlow >= 0;
            return (
              <path key={"s"+i}
                onClick={()=>setSelected(sel=>sel===s.id?null:s.id)}
                d={`M${cx},${cy} L${s.x1},${s.y1} A${rx},${ry} 0 ${s.lg} 1 ${s.x2},${s.y2}Z`}
                fill={viewMode==="flow" ? (isIn?s.pc:s.pc+"88") : s.pc}
                stroke={selected===s.id?"#fff":BG}
                strokeWidth={selected===s.id?2.5:1.5}
                opacity={selected&&selected!==s.id?0.4:1}
                transform={selected===s.id
                  ?`translate(${Math.cos(s.mid)*6},${Math.sin(s.mid)*6})`
                  :"translate(0,0)"}
                style={{cursor:"pointer",transition:"all .25s"}}
              />
            );
          })}

          {/* تدفق السيم على الـ pie في وضع Flow */}
          {viewMode==="flow" && slices.map((s,i)=>{
            const flow = sectorFlows.find(f=>f.id===s.id);
            if (!flow) return null;
            const midX = cx + rx*0.58*Math.cos(s.mid);
            const midY = cy + ry*0.58*Math.sin(s.mid);
            return (
              <g key={"fl"+i}>
                <text x={midX} y={midY-4} textAnchor="middle"
                  fill="#fff" fontSize="8" fontWeight="700" fontFamily="Cairo">
                  {flow.flowDir==="دخول"?"↑":"↓"}
                </text>
                <text x={midX} y={midY+7} textAnchor="middle"
                  fill="rgba(255,255,255,.8)" fontSize="6.5" fontFamily="Cairo">
                  {Math.abs(flow.flowPct).toFixed(0)}%
                </text>
              </g>
            );
          })}

          <text x={cx} y={cy-5}  textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Cairo">القطاعات</text>
          <text x={cx} y={cy+12} textAnchor="middle" fill={T2}    fontSize="9"  fontFamily="Cairo">
            {viewMode==="flow"?"تدفق رأس المال":"السوق السعودي"}
          </text>
        </svg>
      </div>

      {/* ── Selected sector expanded card ── */}
      {selected && selSec && selFlow && (
        <div style={{
          margin:"0 12px 10px",
          background:selSec.pc+"16",borderRadius:16,
          padding:"12px 14px",
          border:"1px solid "+selSec.pc+"45",
          animation:"fadeUp .2s ease both",
        }}>
          {/* Header row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:selSec.pc,
                           boxShadow:"0 0 7px "+selSec.pc}}/>
              <span style={{fontSize:10,color:T2}}>{selStocks.length} سهم</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,color:selSec.pct>=0?G:R,fontWeight:700}}>
                {selSec.pct>=0?"+":""}{selSec.pct}%
              </span>
              <span style={{fontSize:15,fontWeight:800,color:T1}}>{selSec.name}</span>
            </div>
          </div>

          {/* تدفق رأس المال */}
          <div style={{
            background:"rgba(0,0,0,.2)",borderRadius:10,
            padding:"10px 12px",marginBottom:10,
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{
                fontSize:9,color:selFlow.flowCol,fontWeight:700,
                background:selFlow.flowCol+"18",borderRadius:5,padding:"2px 7px",
              }}>
                {selFlow.flowDir} {selFlow.flowDir==="دخول"?"↑":"↓"} {selFlow.flowLabel}
              </span>
              <span style={{fontSize:11,fontWeight:700,color:T1}}>تدفق رأس المال</span>
            </div>
            {/* شريط دخول/خروج */}
            <div style={{height:8,background:"rgba(255,255,255,.06)",borderRadius:4,overflow:"hidden",display:"flex",marginBottom:5}}>
              <div style={{
                width:selFlow.dominance+"%",height:"100%",
                background:"linear-gradient(90deg,"+G+"80,"+G+")",borderRadius:4,
                transition:"width .4s",
              }}/>
              <div style={{
                flex:1,background:"linear-gradient(90deg,"+R+"80,"+R+")",
              }}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:T3}}>
              <span style={{color:R}}>{(100-selFlow.dominance).toFixed(0)}% خروج</span>
              <span style={{color:G}}>{selFlow.dominance.toFixed(0)}% دخول</span>
            </div>

            {/* Metrics */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginTop:8}}>
              {[
                {l:"صافي التدفق",    v:(selFlow.netFlow>=0?"+":"")+(selFlow.netFlow/1e6).toFixed(2)+"م", c:selFlow.flowCol},
                {l:"الدخول",         v:(selFlow.inflow/1e6).toFixed(2)+"م",                              c:G},
                {l:"الخروج",         v:(selFlow.outflow/1e6).toFixed(2)+"م",                             c:R},
                {l:"DPI Active",     v:(selFlow.frActive>=0?"+":"")+selFlow.frActive.toFixed(1)+"%",    c:selFlow.flowCol},
              ].map((m,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,.05)",borderRadius:7,padding:"6px 8px",textAlign:"center"}}>
                  <div style={{fontSize:7.5,color:T3,marginBottom:2}}>{m.l}</div>
                  <div style={{fontSize:11,fontWeight:700,color:m.c}}>{m.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* أسهم القطاع */}
          {selStocks.map((st,i)=>(
            <div key={i} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"7px 0",
              borderBottom:i<selStocks.length-1?"1px solid rgba(255,255,255,.05)":"none",
            }}>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:700,color:st.pct>=0?G:R}}>
                  {st.pct>=0?"+":""}{st.pct.toFixed(2)}%
                </div>
                <div style={{fontSize:10,color:T2}}>{st.p.toFixed(2)} ر.س</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:12,fontWeight:700,color:T1}}>{st.name}</div>
                <div style={{fontSize:9,color:T3}}>{st.sym}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════
          PERFORMANCE VIEW
      ══════════════════════════════ */}
      {viewMode==="perf" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,padding:"0 10px"}}>
          {sectorsWithRealPct.map((s,i)=>{
            const up  = s.pct>=0;
            const bw  = Math.min(88,Math.abs(s.pct)*18);
            const isSel = selected===s.id;
            return(
              <div key={i} onClick={()=>setSelected(sel=>sel===s.id?null:s.id)}
                style={{
                  padding:"10px 12px",cursor:"pointer",transition:"background .2s",
                  borderBottom:"1px solid rgba(255,255,255,.04)",
                  background:isSel?s.pc+"12":"transparent",
                  borderRadius:isSel?8:0,
                }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12,fontWeight:700,color:up?G:R}}>
                    {up?"+":""}{s.pct}%
                  </span>
                  <span style={{fontSize:11,fontWeight:600,color:isSel?T1:T2}}>{s.name}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"flex-end"}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:s.dot,flexShrink:0,
                               boxShadow:isSel?"0 0 6px "+s.dot:"none"}}/>
                  <div style={{flex:1,maxWidth:85,height:4,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:bw+"%",background:up?G:R,borderRadius:2}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════
          FLOW VIEW -- تدفق رأس المال
      ══════════════════════════════ */}
      {viewMode==="flow" && (
        <div style={{padding:"4px 12px 8px"}}>
          {/* شرح المقياس */}
          <div style={{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            marginBottom:10,padding:"6px 10px",
            background:"rgba(255,255,255,.03)",borderRadius:8,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:8,height:8,borderRadius:2,background:R}}/>
              <span style={{fontSize:9,color:T3}}>خروج</span>
            </div>
            <span style={{fontSize:9,color:T3}}>تدفق رأس المال = حجم × |تغير%|</span>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,color:T3}}>دخول</span>
              <div style={{width:8,height:8,borderRadius:2,background:G}}/>
            </div>
          </div>

          {sectorFlows.map((sec,i)=>{
            const isSel = selected===sec.id;
            const inW   = Math.max(4, (sec.inflow  / (sec.inflow+sec.outflow||1)) * 100);
            const outW  = Math.max(4, (sec.outflow / (sec.inflow+sec.outflow||1)) * 100);
            const barW  = Math.max(8, Math.abs(sec.netFlow) / maxAbsFlow * 100);
            const volPct= sec.volume / totalVolume * 100;
            return (
              <div key={i} onClick={()=>setSelected(sel=>sel===sec.id?null:sec.id)}
                style={{
                  marginBottom:6,padding:"9px 11px",cursor:"pointer",
                  background:isSel?sec.pc+"12":CARD2,
                  borderRadius:11,
                  border:"1px solid "+(isSel?sec.pc+"40":LN),
                  transition:"all .18s",
                }}>
                {/* Row 1: اسم + اتجاه + % أداء */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{
                      fontSize:8.5,fontWeight:700,
                      color:sec.flowCol,
                      background:sec.flowCol+"18",borderRadius:5,padding:"1px 7px",
                      border:"1px solid "+sec.flowCol+"30",
                    }}>
                      {sec.flowDir} {sec.flowDir==="دخول"?"↑":"↓"}
                    </span>
                    <span style={{fontSize:9,color:T3}}>
                      {sec.marketShare.toFixed(1)}% من السوق
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{textAlign:"left"}}>
                      <span style={{fontSize:11,fontWeight:700,color:sec.weightedPct>=0?G:R}}>
                        {sec.weightedPct>=0?"+":""}{sec.weightedPct}%
                      </span>
                      <span style={{fontSize:8,color:T3,marginRight:4}}> أداء</span>
                    </div>
                    <div style={{width:8,height:8,borderRadius:2,background:sec.pc}}/>
                    <span style={{fontSize:12,fontWeight:700,color:T1}}>{sec.name}</span>
                  </div>
                </div>

                {/* شريط الدخول/الخروج المزدوج */}
                <div style={{display:"flex",height:7,borderRadius:4,overflow:"hidden",gap:1,marginBottom:4}}>
                  <div style={{
                    width:inW+"%",background:"linear-gradient(90deg,"+G+"60,"+G+")",
                    borderRadius:"4px 0 0 4px",transition:"width .4s",
                  }}/>
                  <div style={{
                    flex:1,background:"linear-gradient(90deg,"+R+","+R+"60)",
                    borderRadius:"0 4px 4px 0",
                  }}/>
                </div>

                {/* صافي التدفق */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:3}}>
                  <div style={{display:"flex",gap:10}}>
                    <span style={{fontSize:8,color:G}}>↑ {(sec.inflow/1e6).toFixed(2)}م ر.س</span>
                    <span style={{fontSize:8,color:R}}>↓ {(sec.outflow/1e6).toFixed(2)}م ر.س</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:9,fontWeight:700,color:sec.flowCol}}>
                      {sec.netFlow>=0?"+":""}{(sec.netFlow/1e6).toFixed(2)}م
                    </span>
                    <span style={{
                      fontSize:8,color:sec.flowCol,
                      background:sec.flowCol+"12",borderRadius:4,padding:"1px 5px",
                      border:"1px solid "+sec.flowCol+"25",
                    }}>
                      DPI {sec.frActive>=0?"+":""}{sec.frActive.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ملخص السوق */}
          <div style={{
            marginTop:8,padding:"10px 12px",
            background:"rgba(255,255,255,.03)",borderRadius:10,
            border:"1px solid rgba(255,255,255,.06)",
          }}>
            <div style={{fontSize:10,fontWeight:700,color:T2,marginBottom:6,textAlign:"right"}}>
              ملخص تدفق السوق
            </div>
            {(() => {
              const totalIn  = sectorFlows.reduce((s,f)=>s+f.inflow,0);
              const totalOut = sectorFlows.reduce((s,f)=>s+f.outflow,0);
              const net      = totalIn - totalOut;
              const pct      = (totalIn/(totalIn+totalOut||1)*100).toFixed(1);
              return (
                <div>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    {[
                      {l:"إجمالي الدخول",  v:(totalIn/1e6).toFixed(1)+"م",  c:G},
                      {l:"إجمالي الخروج",  v:(totalOut/1e6).toFixed(1)+"م", c:R},
                      {l:"الصافي",          v:(net/1e6>=0?"+":"")+(net/1e6).toFixed(1)+"م", c:net>=0?G:R},
                    ].map((m,i)=>(
                      <div key={i} style={{flex:1,background:"rgba(255,255,255,.04)",borderRadius:7,padding:"5px 7px",textAlign:"center"}}>
                        <div style={{fontSize:7.5,color:T3,marginBottom:1}}>{m.l}</div>
                        <div style={{fontSize:10,fontWeight:700,color:m.c}}>{m.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden",display:"flex"}}>
                    <div style={{width:pct+"%",background:"linear-gradient(90deg,"+G+"70,"+G+")",borderRadius:3}}/>
                    <div style={{flex:1,background:"linear-gradient(90deg,"+R+","+R+"70)"}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:7.5,color:T3}}>
                    <span style={{color:R}}>{(100-parseFloat(pct)).toFixed(1)}% خروج</span>
                    <span style={{color:G}}>{pct}% دخول</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          BUBBLE VIEW -- فقاعات
      ══════════════════════════════ */}
      {viewMode==="bubble" && (
        <div style={{padding:"4px 12px 10px"}}>
          <div style={{
            display:"flex",flexWrap:"wrap",
            gap:8,justifyContent:"center",
            padding:"6px 0",
          }}>
            {sectorFlows.map((sec,i)=>{
              // حجم الفقاعة يعتمد على حجم التداول
              const volPct = sec.volume / totalVolume;
              const size   = Math.round(60 + volPct * 200); // 60-260px
              const clamp  = Math.max(64, Math.min(120, size));
              const up     = sec.weightedPct >= 0;
              const isSel  = selected === sec.id;
              return (
                <div key={i} onClick={()=>setSelected(sel=>sel===sec.id?null:sec.id)}
                  style={{
                    width:clamp, height:clamp,
                    borderRadius:"50%",
                    cursor:"pointer",
                    background:`radial-gradient(circle at 35% 35%, ${sec.pc}cc, ${sec.pc}88)`,
                    border:`2px solid ${isSel?"#fff":sec.pc+"55"}`,
                    boxShadow: isSel
                      ? `0 0 20px ${sec.pc}55, inset 0 0 10px rgba(255,255,255,.1)`
                      : `0 4px 14px ${sec.pc}30`,
                    display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",
                    transition:"all .2s",
                    transform: isSel?"scale(1.08)":"scale(1)",
                    position:"relative",
                  }}>
                  {/* تدفق badge */}
                  <div style={{
                    position:"absolute",top:-4,right:-4,
                    width:16,height:16,borderRadius:"50%",
                    background:sec.flowCol,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:10,fontWeight:900,color:"#000",
                    boxShadow:"0 0 6px "+sec.flowCol,
                  }}>
                    {sec.flowDir==="دخول"?"↑":"↓"}
                  </div>
                  <span style={{
                    fontSize:Math.max(8,clamp/9),
                    fontWeight:800,color:"#fff",
                    textShadow:"0 1px 3px rgba(0,0,0,.5)",
                    textAlign:"center",lineHeight:1.2,
                  }}>{sec.name}</span>
                  <span style={{
                    fontSize:Math.max(9,clamp/8),
                    fontWeight:900,
                    color:up?"#fff":"#fecaca",
                    marginTop:3,
                  }}>{up?"+":""}{sec.weightedPct}%</span>
                  <span style={{
                    fontSize:Math.max(7,clamp/11),
                    color:"rgba(255,255,255,.7)",marginTop:1,
                  }}>
                    {(sec.volume/1e6).toFixed(1)}م
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{
            textAlign:"center",fontSize:9,color:T3,marginTop:6,
          }}>
            حجم الفقاعة = حجم التداول &nbsp;·&nbsp; السهم = اتجاه التدفق
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ADVANCED SECTION ─── */
function AdvancedSection(){
  const [open,setOpen]=useState(true);
  const [panel,setPanel]=useState("liquidity"); // liquidity | quantum | breadth

  return(
    <div style={{margin:"14px 12px 0"}}>
      {/* Toggle button */}
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"10px 14px",borderRadius:12,cursor:"pointer",fontFamily:"Cairo,sans-serif",
        background:open?CARD2:CARD,
        border:"1px solid "+(open?"rgba(245,158,11,.25)":"rgba(255,255,255,.07)"),
        color:T1,marginBottom:open?0:0,
      }}>
        <span style={{fontSize:13,fontWeight:700,color:open?GOLD:T2}}>التحليل المتقدم</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={open?GOLD:T3} strokeWidth="2" strokeLinecap="round">
            <polyline points={open?"18 15 12 9 6 15":"6 9 12 15 18 9"}/>
          </svg>
          <span style={{fontSize:12,color:open?GOLD:T3,fontWeight:600}}>
            {open?"إخفاء التحليل المتقدم":"عرض التحليل المتقدم"}
          </span>
        </div>
      </button>

      {open&&(
        <div style={{
          background:"linear-gradient(145deg,#13162a,#0f1220)",
          borderRadius:"0 0 16px 16px",
          border:"1px solid rgba(167,139,250,.2)",
          borderTop:"none",overflow:"hidden",
        }}>
          {/* Panel tabs -- matching screenshot */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
            {[{id:"liquidity",l:"خريطة السيولة"},{id:"quantum",l:"المحرك الكمي"},{id:"breadth",l:"عرض السوق"}].map(p=>(
              <button key={p.id} onClick={()=>setPanel(p.id)} style={{
                flex:1,padding:"10px 4px",cursor:"pointer",fontFamily:"Cairo,sans-serif",
                background:"none",border:"none",fontSize:11,fontWeight:600,
                color:panel===p.id?GOLD:T3,
                borderBottom:panel===p.id?"2px solid "+GOLD:"2px solid transparent",
                transition:"all .15s",
              }}>{p.l}</button>
            ))}
          </div>

          {panel==="liquidity" && <LiquidityPanel/>}
          {panel==="quantum"   && <QuantumPanel/>}
          {panel==="breadth"   && <BreadthPanel/>}
        </div>
      )}
    </div>
  );
}

/* ─── LIQUIDITY PANEL ─── */
function LiquidityPanel(){
  const [view,setView]=useState("map");
  const [scanning,setScan]=useState(false);
  const [data,setData]=useState([]);
  const [selSec,setSelSec]=useState(null);
  const [lastUpdate,setLastUpdate]=useState(null);

  const run=useCallback(()=>{
    setScan(true);
    setTimeout(()=>{
      setData(liveStocks.map(calcLiq));
      setLastUpdate(new Date());
      setScan(false);
    },900);
  },[]);
  useEffect(()=>{run();},[run]);

  const now=lastUpdate?`${lastUpdate.getHours().toString().padStart(2,"0")}:${lastUpdate.getMinutes().toString().padStart(2,"0")}`:"--:--";

  // Sector flows for sector view
  const sectorFlows=(()=>{
    const s={};
    data.forEach(d=>{
      const k=d.stk.sec||"أخرى";
      if(!s[k])s[k]={name:k,in:0,out:0,n:0,sum:0};
      s[k].n++;s[k].sum+=d.sm;
      if(d.lpi>20)s[k].in+=d.lpi;else if(d.lpi<-20)s[k].out+=Math.abs(d.lpi);
    });
    return Object.values(s).map(x=>({...x,avg:Math.round(x.sum/x.n),net:x.in-x.out,dir:x.in>x.out?"دخول":"خروج",fc:x.in>x.out?G:R}));
  })();

  const LEGEND=[{c:BLUE,l:"مؤسسي"},{c:"#4ade80",l:"شراء"},{c:"#6b7280",l:"حيادي"},{c:"#fb923c",l:"تصريف مخفي"},{c:R,l:"تصريف"}];
  const VTABS=[{id:"map",l:"الخريطة"},{id:"list",l:"القائمة الذكية"},{id:"sector",l:"القطاعات"},{id:"dna",l:"DNA السيولة"}];

  return(
    <div>
      {/* Header matching screenshot exactly */}
      <div style={{
        padding:"10px 12px 8px",
        background:"linear-gradient(135deg,rgba(167,139,250,.06),transparent)",
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{
              width:22,height:22,borderRadius:"50%",
              background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.3)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:11,cursor:"pointer",
            }}>?</div>
            <button onClick={run} disabled={scanning} style={{
              background:"linear-gradient(135deg,#6d28d9,"+PU+")",
              border:"none",color:T1,borderRadius:9,padding:"5px 14px",
              fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Cairo,sans-serif",
              boxShadow:"0 2px 8px rgba(167,139,250,.3)",
            }}>{scanning?"...":"فحص"}</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:900,color:T1}}>خريطة السيولة الذكية</div>
              <div style={{fontSize:8.5,color:T3,direction:"ltr",textAlign:"right"}}>Smart Liquidity Map</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              {scanning
                ? <div style={{width:10,height:10,border:"2px solid "+PU+"40",borderTop:"2px solid "+PU,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                : <div style={{width:8,height:8,borderRadius:"50%",background:PU,boxShadow:"0 0 8px "+PU}}/>
              }
              <span style={{fontSize:10,color:T2}}>تحديث: {now}</span>
            </div>
          </div>
        </div>

        {/* Sub-tabs -- pill style matching screenshot */}
        <div style={{display:"flex",gap:6}}>
          {VTABS.map(v=>(
            <button key={v.id} onClick={()=>setView(v.id)} style={{
              flex:1,padding:"6px 4px",borderRadius:9,fontSize:10,fontWeight:600,
              cursor:"pointer",fontFamily:"Cairo,sans-serif",transition:"all .15s",
              background:view===v.id?"linear-gradient(135deg,#6d28d9,"+PU+")":"rgba(255,255,255,.05)",
              border:"1px solid "+(view===v.id?PU+"60":"rgba(255,255,255,.07)"),
              color:view===v.id?T1:T3,
              boxShadow:view===v.id?"0 2px 8px rgba(167,139,250,.2)":"none",
            }}>{v.l}</button>
          ))}
        </div>
        {/* إخلاء مسؤولية */}
        <div style={{
          marginTop:8,fontSize:8,color:GOLD,
          background:"rgba(245,158,11,.05)",borderRadius:7,
          padding:"4px 8px",border:"1px solid rgba(245,158,11,.1)",lineHeight:1.5,
        }}>
          ⚠ التحليل استرشادي -- محسوب من بيانات MFI·CMF·VWAP·RSI·OBV·ATR. ليس توصية استثمارية.
        </div>
      </div>

      {/* Scanning */}
      {scanning&&(
        <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:8}}>
          {[100,85,70,55].map((w,i)=>(
            <div key={i} style={{height:10,borderRadius:5,background:PU+"10",width:w+"%",opacity:.5}}/>
          ))}
        </div>
      )}

      {/* MAP VIEW -- matching screenshot bubbles */}
      {!scanning&&view==="map"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {LEGEND.map((l,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:8,height:8,borderRadius:2,background:l.c}}/>
                <span style={{fontSize:8,color:T2}}>{l.l}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {data.map((d,i)=>{
              const sz=d.sm>=80?72:d.sm>=65?62:d.sm>=50?52:d.sm>=35?44:36;
              return(
                <div key={i} style={{
                  width:sz,height:sz,borderRadius:9,
                  background:"linear-gradient(135deg,"+d.col+"25,"+d.col+"10)",
                  border:"1.5px solid "+d.col+"50",
                  display:"flex",flexDirection:"column",alignItems:"center",
                  justifyContent:"center",padding:3,cursor:"pointer",
                }}>
                  <span style={{fontSize:Math.max(8,sz/7),fontWeight:900,color:T1,lineHeight:1}}>
                    {d.stk.sym}
                  </span>
                  <span style={{fontSize:Math.max(8,sz/8),fontWeight:700,color:d.col,lineHeight:1.2}}>
                    {d.sm}
                  </span>
                  <span style={{fontSize:7,color:d.stk.pct>=0?G:R,fontWeight:600}}>
                    {d.stk.pct>=0?"+":""}{d.stk.pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW -- matching screenshot cards exactly */}
      {!scanning&&view==="list"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{fontSize:12,fontWeight:700,color:PU,marginBottom:10,textAlign:"right"}}>
            أعلى الأسهم بسيولة ذكية
          </div>
          {[...data].sort((a,b)=>b.sm-a.sm).map((d,i)=>(
            <div key={i} style={{
              background:CARD2,borderRadius:14,padding:"12px 14px",
              marginBottom:8,border:"1px solid "+LN,
            }}>
              {/* Top row: score + name + symbol badge */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{
                    minWidth:42,textAlign:"right",
                  }}>
                    <div style={{fontSize:22,fontWeight:900,color:PU,lineHeight:1}}>{d.sm}</div>
                    <div style={{fontSize:9,color:T3}}>نقاط الذكاء</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:800,color:T1}}>{d.stk.name}</div>
                    <div style={{
                      fontSize:10,color:d.lbl==="حيادي"?T3:d.lbl==="بيع"||d.lbl==="تصريف مؤسسي"?R:G,
                      fontWeight:600,
                    }}>{d.lbl}</div>
                  </div>
                  <div style={{
                    background:CARD3,borderRadius:8,padding:"6px 10px",minWidth:46,textAlign:"center",
                    border:"1px solid rgba(255,255,255,.08)",
                  }}>
                    <span style={{fontSize:11,fontWeight:800,color:T1}}>{d.stk.sym}</span>
                  </div>
                </div>
              </div>
              {/* Metrics row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                {[
                  {l:"MFI",      v:d.mfi,                              c:d.mfi>60?G:d.mfi<40?R:T2,  t:"مؤشر تدفق الأموال (14 يوم)"},
                  {l:"CMF",      v:d.cmf>0?"+"+d.cmf:d.cmf,           c:d.cmf>0.05?G:d.cmf<-0.05?R:T2, t:"Chaikin Money Flow (20 يوم)"},
                  {l:"RSI",      v:d.rsi,                              c:d.rsi>60?G:d.rsi<40?R:T2,  t:"مؤشر القوة النسبية (14 يوم)"},
                  {l:"LPI",      v:(d.lpi>0?"+":"")+d.lpi,            c:d.lpi>20?G:d.lpi<-20?R:T2, t:"مؤشر ضغط السيولة"},
                ].map((m,mi)=>(
                  <div key={mi} style={{
                    background:"rgba(255,255,255,.04)",borderRadius:8,
                    padding:"6px 8px",textAlign:"center",cursor:"default",
                  }} title={m.t}>
                    <div style={{fontSize:7.5,color:T3,marginBottom:3}}>{m.l}</div>
                    <div style={{fontSize:11,fontWeight:700,color:m.c,lineHeight:1}}>{m.v}</div>
                  </div>
                ))}
              </div>
              {d.hd&&<div style={{marginTop:7,fontSize:8.5,color:GOLD,background:GOLD+"10",borderRadius:7,padding:"4px 9px"}}>
                ⚠ تصريف مخفي -- ارتفاع السعر مع ضعف مؤشر التدفق
              </div>}
              {d.ep&&<div style={{marginTop:7,fontSize:8.5,color:BLUE,background:BLUE+"10",borderRadius:7,padding:"4px 9px"}}>
                💥 احتمال انفجار -- تضيق النطاق مع تراجع السيولة
              </div>}
            </div>
          ))}
        </div>
      )}

      {/* SECTOR VIEW */}
      {!scanning&&view==="sector"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{fontSize:11,fontWeight:700,color:PU,marginBottom:8}}>تحليل تدفق السيولة</div>
          {sectorFlows.map((sec,i)=>{
            const bw=Math.min(100,Math.abs(sec.net)/3);
            const open=selSec===sec.name;
            const secStocks=data.filter(d=>(d.stk.sec||"أخرى")===sec.name)
              .filter(d=>sec.dir==="دخول"?d.lpi>0:d.lpi<=0)
              .sort((a,b)=>sec.dir==="دخول"?b.lpi-a.lpi:a.lpi-b.lpi);
            return(
              <div key={i} style={{marginBottom:6}}>
                <div onClick={()=>setSelSec(open?null:sec.name)} style={{
                  background:open?sec.fc+"10":CARD2,borderRadius:10,
                  padding:"9px 11px",cursor:"pointer",
                  border:"1px solid "+(open?sec.fc+"30":LN),
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:8.5,color:sec.fc,fontWeight:700,
                                     background:sec.fc+"15",borderRadius:5,padding:"1px 7px"}}>
                        {sec.dir} {sec.dir==="دخول"?"↑":"↓"}
                      </span>
                      <span style={{fontSize:9,color:T3}}>{sec.n} سهم</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:12,fontWeight:800,color:T1}}>{sec.name}</span>
                      <span style={{fontSize:10,color:T3}}>{open?"▲":"▼"}</span>
                    </div>
                  </div>
                  <div style={{height:5,background:CARD,borderRadius:3,overflow:"hidden",marginBottom:4}}>
                    <div style={{height:"100%",width:bw+"%",background:sec.fc,borderRadius:3}}/>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:8,color:T3}}>متوسط الذكاء: <span style={{color:PU,fontWeight:700}}>{sec.avg}</span></span>
                    <span style={{fontSize:8,color:sec.fc,fontWeight:700}}>تدفق: {sec.net>0?"+":""}{sec.net.toFixed(0)}</span>
                  </div>
                </div>
                {open&&secStocks.length>0&&(
                  <div style={{marginRight:8,marginTop:3,background:CARD,borderRadius:10,border:"1px solid "+LN}}>
                    <div style={{padding:"6px 10px",borderBottom:"1px solid "+LN,display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:8,color:T3}}>نقاط الذكاء</span>
                      <span style={{fontSize:9,fontWeight:700,color:sec.fc}}>
                        {sec.dir==="دخول"?"أسهم الشراء -- سيولة داخلة":"أسهم البيع -- سيولة خارجة"}
                      </span>
                    </div>
                    {secStocks.map((d,si)=>(
                      <div key={si} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                                             padding:"7px 10px",borderBottom:"1px solid "+LN}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:d.lpi>0?G:R}}/>
                          <div>
                            <div style={{fontSize:10,fontWeight:700,color:T1}}>{d.stk.name}</div>
                            <div style={{fontSize:8.5,color:d.lpi>0?G:R,fontWeight:600}}>{d.stk.pct>=0?"+":""}{d.stk.pct}%</div>
                          </div>
                        </div>
                        <div style={{textAlign:"left"}}>
                          <div style={{fontSize:11,fontWeight:800,color:PU}}>{d.sm}</div>
                          <div style={{fontSize:8,color:d.lpi>0?G:R}}>LPI: {d.lpi>0?"+":""}{d.lpi}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DNA VIEW */}
      {!scanning&&view==="dna"&&(
        <div style={{padding:"10px 12px"}}>
          <div style={{fontSize:11,fontWeight:700,color:PU,marginBottom:8}}>DNA السيولة -- نمط حركة المال الذكي</div>
          {[...data].filter(d=>d.sm>30).sort((a,b)=>b.sm-a.sm).map((d,i)=>(
            <DnaCard key={i} d={d}/>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── DNA CARD -- interactive bars with date tooltip ─── */
function DnaCard({d}){
  const [activeBar, setActiveBar] = useState(null);

  // Generate 20 daily data points going back from today
  const bars = Array.from({length:20}, (_,k)=>{
    const daysAgo = 19 - k;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dayNames = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
    const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const rngDNA = seedRng(parseInt(d.stk.sym, 10) * 31 + k * 7);
    const h = 4 + Math.abs((rngDNA() - 0.5) * 48 * (d.sm / 100));
    // تغير اليوم = تغير السهم الفعلي × عامل تراجع زمني (أقدم = أقل يقيناً)
    const timeFade = 0.5 + (k / 28) * 0.5;  // 0.5 للأقدم → 1.0 لليوم الحالي
    const barPct = +(d.stk.pct * timeFade + (rngDNA() - 0.5) * 0.8).toFixed(2);
    const vol = Math.round(d.stk.v * (0.4 + rngDNA() * 1.2));
    const isRecent = k > 14;
    return {
      k, h, barPct, vol, isRecent,
      label: `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`,
      shortDate: `${date.getDate()}/${date.getMonth()+1}`,
    };
  });

  const ab = activeBar !== null ? bars[activeBar] : null;

  return(
    <div style={{background:CARD2,borderRadius:12,padding:"10px 12px",marginBottom:7,border:"1px solid "+LN}}>
      {/* Bars */}
      <div style={{display:"flex",gap:2,alignItems:"flex-end",height:44,marginBottom:4}}>
        {bars.map((bar)=>(
          <div
            key={bar.k}
            onClick={()=>setActiveBar(activeBar===bar.k?null:bar.k)}
            style={{
              flex:1, height:bar.h, borderRadius:2, cursor:"pointer",
              background: activeBar===bar.k
                ? d.col
                : bar.isRecent ? d.col+"cc" : d.col+"30",
              transition:"all .15s",
              transform: activeBar===bar.k ? "scaleY(1.18)" : "scaleY(1)",
              transformOrigin:"bottom",
              boxShadow: activeBar===bar.k ? "0 0 6px "+d.col : "none",
            }}
          />
        ))}
      </div>

      {/* Date labels every 4 bars */}
      <div style={{display:"flex",marginBottom:6}}>
        {bars.map((bar,i)=>(
          <div key={i} style={{flex:1,textAlign:"center"}}>
            {i%4===0&&(
              <span style={{
                fontSize:7,fontWeight:activeBar===i?700:400,
                color:activeBar===i?d.col:T3,
              }}>{bar.shortDate}</span>
            )}
          </div>
        ))}
      </div>

      {/* Tooltip -- full width below bars, always inside card */}
      {ab&&(
        <div style={{
          background:"linear-gradient(135deg,"+CARD3+","+CARD+")",
          border:"1px solid "+d.col+"70",
          borderRadius:12,padding:"10px 14px",
          marginBottom:8,
          boxShadow:"0 2px 12px rgba(0,0,0,.5)",
          animation:"fadeUp .15s ease both",
        }}>
          {/* Header: date + close */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div
              onClick={()=>setActiveBar(null)}
              style={{
                width:20,height:20,borderRadius:"50%",
                background:"rgba(255,255,255,.08)",
                display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"pointer",fontSize:10,color:T2,
              }}>✕</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:d.col}}/>
              <span style={{fontSize:12,fontWeight:700,color:T1}}>{ab.label}</span>
            </div>
          </div>
          {/* Metrics grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            {[
              {l:"التغير",   v:(ab.barPct>=0?"+":"")+ab.barPct+"%",  c:ab.barPct>=0?G:R},
              {l:"الحجم",   v:(ab.vol/1000000).toFixed(1)+"م",       c:T2},
              {l:"SM Score", v:d.sm,                                   c:d.col},
            ].map((m,mi)=>(
              <div key={mi} style={{
                background:"rgba(255,255,255,.05)",borderRadius:8,
                padding:"7px 8px",textAlign:"center",
              }}>
                <div style={{fontSize:8,color:T3,marginBottom:3}}>{m.l}</div>
                <div style={{fontSize:13,fontWeight:800,color:m.c}}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:14,fontWeight:900,color:PU}}>{d.sm}</span>
          <span style={{fontSize:8,color:T3}}>SM Score</span>
        </div>
        <span style={{fontSize:9,color:d.phCol,fontWeight:600}}>{d.phase}</span>
        <span style={{fontSize:12,fontWeight:700,color:T1}}>{d.stk.name}</span>
      </div>
    </div>
  );
}

/* ─── QUANTUM CARD -- expandable with full calculation breakdown ─── */
function QuantumCard({s}){
  const [expanded, setExpanded] = useState(false);

  const FACTOR_META = {
    momentum:  { label:"الزخم",     color:BLUE,       icon:"📈",
      desc:"RSI(14) + موقع السعر من 52 أسبوع + الحجم النسبي في الاتجاه" },
    value:     { label:"القيمة",    color:"#34d399",  icon:"💎",
      desc:"خصم VWAP + مضاعف P/E + موقع السعر من النطاق السنوي" },
    quality:   { label:"الجودة",    color:GOLD,       icon:"⭐",
      desc:"CMF(20) + تناسق الاتجاه (5 أيام) + توافق الحجم مع الاتجاه" },
    volatility:{ label:"التذبذب",  color:PU,         icon:"🎯",
      desc:"ATR(14) كنسبة من السعر + نسبة تضيّق النطاق السنوي" },
    liquidity: { label:"السيولة",   color:"#fb923c",  icon:"💧",
      desc:"MFI(14) + الحجم النسبي في الاتجاه + مؤشر ضغط السيولة LPI" },
  };

  const total = Object.values(s.factors).reduce((a,b)=>a+b,0);

  return(
    <div style={{
      background:CARD2,borderRadius:13,marginBottom:8,
      border:"1px solid "+(expanded?s.sc+"40":LN),
      overflow:"hidden",transition:"border .2s",
    }}>
      {/* Summary row -- always visible */}
      <div
        onClick={()=>setExpanded(e=>!e)}
        style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"12px 14px",cursor:"pointer",
        }}
      >
        {/* Left: QS score badge */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:46,height:46,borderRadius:12,
            background:"linear-gradient(135deg,"+s.sc+"20,"+s.sc+"08)",
            border:"1.5px solid "+s.sc+"40",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            flexShrink:0,
          }}>
            <span style={{fontSize:16,fontWeight:900,color:s.sc,lineHeight:1}}>{s.qs}</span>
            <span style={{fontSize:7,color:s.sc,opacity:.7,letterSpacing:.5}}>QS</span>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T1}}>{s.stk.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
              <span style={{
                fontSize:9,fontWeight:700,color:s.sc,
                background:s.sc+"15",borderRadius:5,padding:"1px 7px",
                border:"1px solid "+s.sc+"25",
              }}>{s.sig}</span>
              <span style={{fontSize:9,color:T3}}>{s.stk.sym}</span>
            </div>
          </div>
        </div>

        {/* Right: mini factor bars + price */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
          <div style={{
            fontSize:13,fontWeight:800,
            color:s.stk.pct>=0?G:R,
          }}>{s.stk.pct>=0?"+":""}{s.stk.pct}%</div>
          <div style={{display:"flex",gap:3}}>
            {Object.entries(s.factors).map(([k,v])=>(
              <div key={k} title={FACTOR_META[k].label}
                style={{width:16,height:16,borderRadius:4,background:CARD3,
                        display:"flex",alignItems:"flex-end",overflow:"hidden"}}>
                <div style={{
                  width:"100%",height:(v/20*100)+"%",
                  background:FACTOR_META[k].color,
                  borderRadius:4,
                }}/>
              </div>
            ))}
          </div>
          <div style={{
            fontSize:9,color:T3,display:"flex",alignItems:"center",gap:3,
          }}>
            {expanded?"▲ إخفاء":"▼ التفاصيل"}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded&&(
        <div style={{
          padding:"0 14px 14px",
          borderTop:"1px solid rgba(255,255,255,.06)",
          animation:"fadeUp .15s ease both",
        }}>

          {/* Price + indicators info */}
          <div style={{
            display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,
            marginTop:12,marginBottom:12,
          }}>
            {[
              {l:"السعر الحالي",   v:s.stk.p.toFixed(2)+" ر.س",                        c:T1},
              {l:"VWAP (20 يوم)",  v:s.vwap.val+" ر.س",                                c:s.vwap.above?G:R},
              {l:"فرق VWAP",       v:(s.vwap.dist>0?"+":"")+s.vwap.dist+"%",           c:s.vwap.above?G:R},
              {l:"RSI (14 يوم)",   v:s.rsi,                                             c:s.rsi>60?G:s.rsi<40?R:GOLD},
              {l:"MFI (14 يوم)",   v:s.mfi,                                             c:s.mfi>60?G:s.mfi<40?R:GOLD},
              {l:"ATR% (14 يوم)",  v:s.atrPct+"%",                                     c:s.atrPct<1.5?G:s.atrPct>3?R:GOLD},
            ].map((m,mi)=>(
              <div key={mi} style={{
                background:"rgba(255,255,255,.04)",borderRadius:8,
                padding:"7px 8px",textAlign:"center",
              }}>
                <div style={{fontSize:7.5,color:T3,marginBottom:3}}>{m.l}</div>
                <div style={{fontSize:11,fontWeight:700,color:m.c}}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Factor breakdown */}
          <div style={{fontSize:10,fontWeight:700,color:T2,marginBottom:8}}>
            تفصيل نقاط العوامل الخمسة
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {Object.entries(s.factors).map(([k,v])=>{
              const meta = FACTOR_META[k];
              const pct  = Math.round(v/20*100);
              return(
                <div key={k}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <span style={{fontSize:11}}>{meta.icon}</span>
                      <span style={{fontSize:10,color:T2}}>{meta.desc}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:11,fontWeight:800,color:meta.color}}>{v}</span>
                      <span style={{fontSize:9,color:T3}}>/20</span>
                      <span style={{
                        fontSize:9,color:meta.color,
                        background:meta.color+"15",borderRadius:5,
                        padding:"1px 6px",fontWeight:700,
                      }}>{meta.label}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{
                      height:"100%",width:pct+"%",
                      background:"linear-gradient(90deg,"+meta.color+"80,"+meta.color+")",
                      borderRadius:3,transition:"width .4s ease",
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total score bar */}
          <div style={{
            marginTop:12,padding:"10px 12px",
            background:s.sc+"0a",borderRadius:10,
            border:"1px solid "+s.sc+"25",
          }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:10,color:T2}}>المجموع الكلي</span>
              <span style={{fontSize:16,fontWeight:900,color:s.sc}}>{s.qs} / 100</span>
            </div>
            <div style={{height:8,background:"rgba(255,255,255,.06)",borderRadius:4,overflow:"hidden"}}>
              <div style={{
                height:"100%",width:s.qs+"%",
                background:"linear-gradient(90deg,"+s.sc+"80,"+s.sc+")",
                borderRadius:4,
              }}/>
            </div>
            <div style={{
              display:"flex",justifyContent:"space-between",
              marginTop:6,fontSize:8,color:T3,
            }}>
              <span>0 -- احتراز</span>
              <span>35 -- بيع</span>
              <span>50 -- محايد</span>
              <span>65 -- شراء</span>
              <span>80 -- قوي ✓</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── QUANTUM PANEL ─── */
function QuantumPanel(){
  const [scores,setScores]=useState([]);
  const [scanning,setScan]=useState(false);
  const [view,setView]=useState("top");

  const run=useCallback(()=>{
    setScan(true);
    setTimeout(()=>{
      const r=STOCKS.map(s=>{
        const bars = generateDailyBars(s, 28);
        const vol  = s.v || 1e6;
        const avg  = s.avgVol || vol;
        const rv   = ((vol + avg) / 2) / avg;  // مُطبَّع لتخفيف شذوذ الحجم
        const hi52 = s.hi || s.p * 1.25;
        const lo52 = s.lo || s.p * 0.75;
        const range52 = hi52 - lo52;
        const pfl = range52 > 0 ? (s.p - lo52) / range52 * 100 : 50;

        // ─── عامل 1: الزخم (Momentum) / 20 ───
        // RSI: 55-75 نطاق زخم صحي | >75 تشبع شراء | <40 زخم سلبي
        const rsi   = calcRSI(bars, 14);
        const rsiScore = rsi > 55 && rsi < 75 ? 8
                       : rsi > 50 && rsi <= 55 ? 6
                       : rsi > 40 && rsi <= 50 ? 3
                       : rsi >= 75 ? 2           // تشبع -- خطر انعكاس
                       : 0;

        // pflScore: يُمنح فقط للصاعد -- الهابط لا يستحق نقاط موقع
        // أكاديمياً: قيمة pfl لا معنى لها بدون momentum إيجابي
        const pflScore = s.pct <= 0 ? 0                         // هابط: صفر نقاط
                       : pfl < 30 ? 6                           // قرب القاع + صعود = فرصة
                       : pfl < 60 ? 4                           // منتصف + صعود
                       : 2;                                     // قرب القمة + صعود

        // rv مُطبَّع: (v + avgVol)/2/avgVol يُخفف شذوذ الحجم اليومي
        const rvNormMom = ((s.v + (s.avgVol || s.v)) / 2) / (s.avgVol || s.v || 1);
        // الحجم المرتفع في الهبوط = بيع مؤسسي = عقوبة (أكاديمياً صحيح)
        const rvMomScore = rvNormMom > 2.0 && s.pct > 0 ? 6
                         : rvNormMom > 1.4 && s.pct > 0 ? 4
                         : rvNormMom > 1.0 && s.pct > 0 ? 2
                         : rvNormMom > 2.0 && s.pct < 0 ? -2      // بيع مؤسسي = عقوبة
                         : 0;
        const mf = Math.min(20, Math.max(0, rsiScore + pflScore + rvMomScore));

        // ─── عامل 2: القيمة (Value) / 20 ───
        // يعتمد على: VWAP discount + P/E نسبةً لمتوسط القطاع + P/B + عائد الأرباح
        const vwapVal  = calcVWAP(bars);
        const vwapDisc = vwapVal > 0 ? (s.p - vwapVal) / vwapVal * 100 : 0;
        const vwapScore= vwapDisc < -2 ? 8 : vwapDisc < 0 ? 5 : vwapDisc < 2 ? 3 : 1;

        // P/E و P/B من STOCK_FUNDAMENTALS (واقعية)
        const fund = STOCK_FUNDAMENTALS(s.sym);

        // متوسطات P/E حسب القطاع (أكاديمياً أدق من مقارنة بمتوسط السوق)
        const SECTOR_PE_AVG = {
          "البنوك": 12.5, "الطاقة": 16.0, "البتروكيماويات": 15.0,
          "الاتصالات": 14.0, "التجزئة": 20.0, "الغذاء": 22.0,
          "التأمين": 16.0, "التعدين": 18.0, "الصناعة": 17.0,
        };
        const sectorPEAvg = SECTOR_PE_AVG[s.sec] || 15.5;
        // السهم رخيص إذا P/E أقل من متوسط قطاعه -- Graham relativity
        const peRelative = fund.pe / sectorPEAvg; // < 1 = رخيص، > 1 = غالٍ
        const peScore = peRelative < 0.75 ? 6 : peRelative < 0.90 ? 4
                      : peRelative < 1.10 ? 2 : 0;

        // P/B: أقل من متوسط القطاع = قيمة جيدة
        const SECTOR_PB_AVG = {
          "البنوك": 2.0, "الطاقة": 3.0, "البتروكيماويات": 2.0,
          "الاتصالات": 2.2, "التجزئة": 2.8, "الغذاء": 3.2,
          "التأمين": 2.0, "التعدين": 2.2, "الصناعة": 2.4,
        };
        const sectorPBAvg = SECTOR_PB_AVG[s.sec] || 2.2;
        const pbRelative  = fund.pb / sectorPBAvg;
        const pbScore = pbRelative < 0.75 ? 4 : pbRelative < 0.95 ? 3
                      : pbRelative < 1.15 ? 1 : 0;

        // عائد التوزيعات: أعلى = أفضل للقيمة
        const divScore = fund.divYield > 4 ? 2 : fund.divYield > 2.5 ? 1 : 0;
        const vf = Math.min(20, vwapScore + peScore + pbScore + divScore);

        // ─── عامل 3: الجودة (Quality) / 20 ───
        // يعتمد على: ROE + ROIC proxy + CMF + OBV signal + تناسق الاتجاه
        const cmf       = calcCMF(bars, 20);
        const obvResult = calcOBV(bars);

        // ROE مقارنةً بمتوسط القطاع (أكاديمياً أدق)
        const SECTOR_ROE_AVG = {
          "البنوك": 0.155, "الطاقة": 0.180, "البتروكيماويات": 0.130,
          "الاتصالات": 0.145, "التجزئة": 0.140, "الغذاء": 0.155,
          "التأمين": 0.125, "التعدين": 0.130, "الصناعة": 0.135,
        };
        const secROEAvg   = SECTOR_ROE_AVG[s.sec] || 0.145;
        const roeRelative = fund.roe / secROEAvg;
        const roeScore     = roeRelative > 1.20 ? 7 : roeRelative > 1.05 ? 5
                           : roeRelative > 0.90 ? 3 : 1;

        // ROIC proxy أكاديمي أدق:
        // ROE / P/B ≈ Earnings Yield على حق الملكية الدفتري
        // يُعطي فكرة عن عائد الاستثمار بدون الحاجة للميزانية الكاملة
        // إذا ROE/PB > WACC(8%) = يخلق قيمة
        const earningsYield = fund.pb > 0 ? fund.roe / fund.pb : fund.roe;
        const WACC_SAUDI    = 0.08;  // تكلفة رأس المال المُقدَّرة للسوق السعودي
        const roicBonus     = earningsYield > WACC_SAUDI ? 1 : 0;

        // CMF: تدفق أموال ثابت
        const cmfScore = cmf > 0.15 ? 5 : cmf > 0.05 ? 3 : cmf > 0 ? 1 : 0;
        // OBV signal: توافق الحجم مع السعر
        const obvScore = obvResult.signal === "تأكيد صعود"   ? 5
                       : obvResult.signal === "تباعد إيجابي" ? 3
                       : obvResult.signal === "محايد"         ? 2
                       : obvResult.signal === "تباعد سلبي"   ? 1 : 0;
        // تناسق الاتجاه
        const last5 = bars.slice(-5);
        const upDays = last5.filter(b => b.pct > 0).length;
        const consistScore = upDays >= 4 ? 2 : upDays === 3 ? 1 : 0;
        const qf = Math.min(20, roeScore + roicBonus + cmfScore + obvScore + consistScore);

        // ─── عامل 4: التذبذب (Volatility) / 20 ───
        const atr    = calcATR(bars, 14);
        const atrPct = s.p > 0 ? atr / s.p * 100 : 3;
        // ATR < 0.3% → ركود غير طبيعي → لا نُكافئه (ليس فرصة)
        // ATR 0.3%-2.0% → نطاق صحي ← نُكافئ الأقل تذبذباً
        const atrScore = atrPct < 0.3 ? 0          // ركود مريب -- لا نقاط
                       : atrPct < 1.0 ? 10
                       : atrPct < 1.5 ? 8
                       : atrPct < 2.0 ? 6
                       : atrPct < 3.0 ? 4 : 2;
        const rangeRatio = range52 > 0 ? (hi52 - lo52) / lo52 : 0.3;
        // نطاق ضيق جداً (<10%) مريب أيضاً -- نحدّ نقاطه
        const rangeScoreV = rangeRatio < 0.10 ? 4   // ضيق مريب
                          : rangeRatio < 0.20 ? 10
                          : rangeRatio < 0.30 ? 7
                          : rangeRatio < 0.40 ? 5 : 3;
        const volf = Math.min(20, atrScore + rangeScoreV);

        // ─── عامل 5: السيولة (Liquidity) / 20 ───
        // يعتمد على: MFI + الحجم النسبي + LPI
        const mfi      = calcMFI(bars, 14);
        const mfiScore = mfi > 70 ? 8 : mfi > 55 ? 5 : mfi > 45 ? 3 : 0;
        const rvLiqScore = rv > 2 && s.pct > 0 ? 7
                         : rv > 1.5 && s.pct > 0 ? 5
                         : rv > 1.2 ? 3 : 1;
        const mfiNorm = (mfi - 50) / 50;
        const cmfNorm = Math.max(-1, Math.min(1, cmf));
        const rvNorm  = Math.max(-1, Math.min(1, (rv-1)*0.8));
        const lpi     = Math.round((mfiNorm*40 + cmfNorm*35 + rvNorm*25));
        const lpiScore = lpi > 30 ? 5 : lpi > 10 ? 3 : lpi > -10 ? 1 : 0;
        const lf = Math.min(20, mfiScore + rvLiqScore + lpiScore);

        // ─── النقاط الكلية ───
        const qs = Math.min(100, Math.max(5, mf + vf + qf + volf + lf));
        const sig = qs >= 80 ? "إشارة شراء قوية"
                  : qs >= 65 ? "إشارة شراء"
                  : qs >= 50 ? "محايد"
                  : qs >= 35 ? "إشارة بيع"
                  : "احتراز تام";
        const sc = qs >= 65 ? G : qs >= 50 ? GOLD : R;

        return {
          stk: s, qs, sig, sc, rv: +rv.toFixed(2), rsi, mfi, cmf: +cmf.toFixed(3),
          atrPct: +atrPct.toFixed(2), lpi,
          factors: { momentum: mf, value: vf, quality: qf, volatility: volf, liquidity: lf },
          block: rv > 1.6 && s.pct !== 0,
          vwap: {
            above: s.p > vwapVal,
            val: +vwapVal.toFixed(2),
            dist: +((s.p - vwapVal) / vwapVal * 100).toFixed(2),
          },
          pfl: Math.round(pfl),
        };
      }).sort((a,b) => b.qs - a.qs);
      setScores(r); setScan(false);
    }, 900);
  },[]);
  useEffect(()=>{run();},[run]);

  const topBuy=scores.filter(s=>s.qs>=65).slice(0,5);
  const blocks=scores.filter(s=>s.block).slice(0,4);
  const vwap=scores.filter(s=>s.vwap.above&&s.qs>50).slice(0,4);

  return(
    <div style={{padding:"10px 12px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {scanning?<div style={{width:12,height:12,border:"2px solid "+BLUE+"30",borderTop:"2px solid "+BLUE,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
            :<div style={{width:7,height:7,borderRadius:"50%",background:BLUE,boxShadow:"0 0 6px "+BLUE}}/>}
          <button onClick={run} disabled={scanning} style={{
            background:BLUE+"20",border:"1px solid "+BLUE+"40",color:BLUE,
            borderRadius:8,padding:"3px 12px",fontSize:9,fontWeight:600,cursor:"pointer",fontFamily:"Cairo,sans-serif",
          }}>{scanning?"...":"فحص"}</button>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:12,fontWeight:700,color:T2}}>المحرك الكمي الخماسي</div>
          <div style={{fontSize:8.5,color:T3}}>Momentum · Value · Quality · Volatility · Liquidity</div>
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:8}}>
        {[{id:"top",l:"أفضل الفرص"},{id:"block",l:"صفقات كبيرة"},{id:"vwap",l:"فوق المتوسط"}].map(v=>(
          <button key={v.id} onClick={()=>setView(v.id)} style={{
            flex:1,padding:"5px 4px",borderRadius:8,fontSize:9.5,fontWeight:600,cursor:"pointer",
            fontFamily:"Cairo,sans-serif",
            background:view===v.id?BLUE+"20":"rgba(255,255,255,.04)",
            border:"1px solid "+(view===v.id?BLUE:"rgba(255,255,255,.07)"),
            color:view===v.id?BLUE:T3,
          }}>{v.l}</button>
        ))}
      </div>
      {scanning&&<div style={{padding:"10px 0",display:"flex",flexDirection:"column",gap:7}}>
        {[100,85,70].map((w,i)=><div key={i} style={{height:9,borderRadius:5,background:BLUE+"10",width:w+"%"}}/>)}
      </div>}

      {!scanning&&view==="top"&&(
        <div>
          {/* Formula explanation */}
          <div style={{
            background:"rgba(74,158,255,.06)",borderRadius:10,
            padding:"8px 12px",marginBottom:10,
            border:"1px solid rgba(74,158,255,.12)",
          }}>
            <div style={{fontSize:10,fontWeight:700,color:BLUE,marginBottom:4}}>
              🔬 طريقة الحساب -- المحرك الكمي الخماسي
            </div>
            <div style={{fontSize:9,color:T2,lineHeight:1.7}}>
              النقاط الكلية = <span style={{color:BLUE,fontWeight:700}}>الزخم</span> +{" "}
              <span style={{color:"#34d399",fontWeight:700}}>القيمة</span> +{" "}
              <span style={{color:GOLD,fontWeight:700}}>الجودة</span> +{" "}
              <span style={{color:PU,fontWeight:700}}>التذبذب</span> +{" "}
              <span style={{color:"#fb923c",fontWeight:700}}>السيولة</span>
              {" "}(كل عامل من 20 نقطة = 100 الحد الأقصى)
            </div>
          </div>

          {topBuy.map((s,i)=>(
            <QuantumCard key={i} s={s}/>
          ))}
        </div>
      )}
      {!scanning&&view==="block"&&(
        <div>
          <div style={{fontSize:9,color:T3,marginBottom:8}}>صفقات كبيرة محتملة -- حجم غير عادي</div>
          {blocks.length===0?<div style={{textAlign:"center",padding:"16px",fontSize:9,color:T3}}>لا توجد صفقات كبيرة</div>
            :blocks.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                                     padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:T1}}>{s.stk.name}</div>
                  <div style={{fontSize:8.5,color:PU}}>حجم {s.rv}x -- صفقة كبيرة</div>
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:13,fontWeight:800,color:s.stk.pct>=0?G:R}}>{s.stk.pct>=0?"+":""}{s.stk.pct}%</div>
                  <div style={{fontSize:8,color:PU}}>BT: {s.qs}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}
      {!scanning&&view==="vwap"&&(
        <div>
          <div style={{fontSize:9,color:T3,marginBottom:8}}>أسهم فوق المتوسط المرجح</div>
          {vwap.map((s,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                                   padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,.04)"}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:T1}}>{s.stk.name}</div>
                <div style={{fontSize:8.5,color:G}}>{"فوق المتوسط بـ "+s.vwap.dist+"% · "+s.vwap.val}</div>
              </div>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:12,fontWeight:900,color:s.sc}}>{s.qs}</div>
                <div style={{fontSize:7.5,color:T3}}>Quantum Score</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── BREADTH PANEL ─── */
function BreadthPanel(){
  // ─── بيانات عرض السوق الفعلية ───
  const adv = liveStocks.filter(s => s.pct > 0).length;
  const dec = liveStocks.filter(s => s.pct < 0).length;
  const unc = liveStocks.filter(s => s.pct === 0).length;
  const tot = STOCKS.length;
  const advRatio = (adv / tot * 100).toFixed(1);

  // خط التقدم/التراجع = (صاعد − هابط)
  const adLine = adv - dec;
  const bs     = Math.round(adLine / tot * 100);
  const sig    = bs > 40  ? "سوق صاعد قوي"
               : bs > 15  ? "ميل صعودي"
               : bs > -15 ? "متوازن"
               : bs > -40 ? "ميل هبوطي"
               : "سوق هابط قوي";
  const sc = bs > 15 ? G : bs < -15 ? R : GOLD;

  // ─── VWAP لكل سهم -- Σ(TP×Vol)/Σ(Vol) الرسمي (Wilder-corrected) ✓ ───
  const vwapResults = liveStocks.map(s => {
    const bars = generateDailyBars(s, 28);
    const vwap = calcVWAP(bars);  // الصيغة الرسمية المُصحَّحة
    const diff = vwap > 0 ? +((s.p - vwap) / vwap * 100).toFixed(2) : 0;
    return { sym: s.sym, name: s.name, aboveVwap: s.p >= vwap, diff, vwapVal: +vwap.toFixed(2) };
  });
  const aboveVwapCount = vwapResults.filter(v => v.aboveVwap).length;
  const belowVwapCount = tot - aboveVwapCount;

  // ─── RSI لكل سهم ───
  const rsiResults = STOCKS.map(s => {
    const bars = generateDailyBars(s, 28);
    return { sym: s.sym, name: s.name, rsi: calcRSI(bars, 14) };
  });
  const overbought = rsiResults.filter(r => r.rsi > 70).length;  // RSI > 70
  const oversold   = rsiResults.filter(r => r.rsi < 30).length;  // RSI < 30

  /* ── مذبذب ماكليلان الحقيقي (McClellan Oscillator) ──
     التعريف: EMA(19, A/D_daily) − EMA(39, A/D_daily)
     نُحاكي سلسلة A/D يومية من HISTORICAL_DATA للحصول على EMAين كافيين
  */
  const calcEMA = (values, period) => {
    if (values.length === 0) return 0;
    const k = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
      ema = values[i] * k + ema * (1 - k);
    }
    return ema;
  };

  // بناء سلسلة A/D يومية محاكاة من بيانات تاسي التاريخية (52 أسبوع)
  const rngAD = seedRng(77001);
  const adSeries = HISTORICAL_DATA.year.map((v, i) => {
    if (i === 0) return 0;
    const chg = v - HISTORICAL_DATA.year[i-1];
    // نسبة الصاعد/الهابط بناءً على حجم تغير المؤشر
    const advEst = Math.round(tot * (0.5 + chg/200 + (rngAD()-0.5)*0.15));
    const advC   = Math.max(1, Math.min(tot-1, advEst));
    return advC - (tot - advC);  // A/D daily
  });

  // EMA(19) و EMA(39) على سلسلة A/D
  const ema19 = calcEMA(adSeries, 19);
  const ema39 = calcEMA(adSeries, 39);
  const mcl   = Math.round(ema19 - ema39);  // مذبذب ماكليلان الحقيقي

  // ─── قمم وقيعان جديدة (52 أسبوع) ───
  // بناءً على موقع السعر الحالي من hi52/lo52
  const newHighs = STOCKS.filter(s => s.hi > 0 && s.p >= s.hi * 0.995).length;
  const newLows  = STOCKS.filter(s => s.lo > 0 && s.p <= s.lo * 1.005).length;

  // ─── نسبة Hi/Lo ─── (نتجنب ∞ عند newLows=0)
  const hlRatio = newLows === 0
    ? newHighs > 0 ? `${newHighs}:0` : "--"
    : (newHighs / newLows).toFixed(1);

  return(
    <div style={{padding:"12px 14px"}}>

      {/* إخلاء مسؤولية */}
      <div style={{
        background:"rgba(245,158,11,.06)",borderRadius:8,padding:"6px 10px",
        marginBottom:10,border:"1px solid rgba(245,158,11,.12)",
        fontSize:8.5,color:GOLD,lineHeight:1.5,
      }}>
        ⚠ التحليل استرشادي -- يعتمد على بيانات السهم المدخلة. ليس توصية استثمارية.
      </div>

      {/* إشارة السوق */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:sc,boxShadow:"0 0 6px "+sc}}/>
          <span style={{fontSize:9,color:sc,fontWeight:700}}>{sig}</span>
        </div>
        <span style={{fontSize:13,fontWeight:900,color:T1}}>مؤشرات عرض السوق</span>
      </div>

      {/* شريط A/D */}
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:8.5,color:R}}>{dec} هابط</span>
          <div style={{textAlign:"center"}}>
            <span style={{fontSize:9,color:T3,fontWeight:600}}>A/D Line: </span>
            <span style={{fontSize:10,color:sc,fontWeight:800}}>{adLine > 0 ? "+" : ""}{adLine}</span>
          </div>
          <span style={{fontSize:8.5,color:G}}>{adv} صاعد</span>
        </div>
        <div style={{height:8,background:R+"30",borderRadius:4,overflow:"hidden"}}>
          <div style={{width:advRatio+"%",height:"100%",
                       background:"linear-gradient(90deg,"+G+"80,"+G+")",borderRadius:4}}/>
        </div>
        <div style={{textAlign:"center",marginTop:3}}>
          <span style={{fontSize:8,color:T3}}>{advRatio}% صاعد · {unc} ثابت · من إجمالي {tot} سهم</span>
        </div>
      </div>

      {/* مقاييس 6 */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
        {[
          { l:"فوق VWAP",       v:`${aboveVwapCount}/${tot}`, c:aboveVwapCount>tot/2?G:R,
            sub:"السعر > VWAP",                               desc:"يعتمد VWAP الحقيقي (TP×Vol)" },
          { l:"تحت VWAP",       v:`${belowVwapCount}/${tot}`, c:belowVwapCount>tot/2?R:G,
            sub:"السعر < VWAP",                               desc:"" },
          { l:"قمم 52 أسبوع",  v:newHighs,                   c:newHighs>2?G:T2,
            sub:"قرب الحد الأعلى",                             desc:"السعر ≥ 99.5% من أعلى سنوي" },
          { l:"قيعان 52 أسبوع",v:newLows,                    c:newLows>2?R:T2,
            sub:"قرب الحد الأدنى",                             desc:"السعر ≤ 100.5% من أدنى سنوي" },
          { l:"تشبع شراء RSI",  v:overbought,                 c:overbought>3?R:T2,
            sub:"RSI > 70",                                    desc:"محسوب بـ RSI 14 يوم" },
          { l:"تشبع بيع RSI",   v:oversold,                   c:oversold>3?G:T2,
            sub:"RSI < 30",                                    desc:"فرصة انتعاش" },
        ].map((m,i)=>(
          <div key={i} style={{background:CARD2,borderRadius:9,padding:"8px 8px",textAlign:"center"}}>
            <div style={{fontSize:7.5,color:T3,marginBottom:2}}>{m.l}</div>
            <div style={{fontSize:14,fontWeight:900,color:m.c}}>{m.v}</div>
            <div style={{fontSize:7,color:m.c,opacity:.75,marginTop:1}}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* ماكليلان */}
      <div style={{
        background:CARD2,borderRadius:10,padding:"10px 12px",marginBottom:10,
        border:"1px solid "+(mcl>20?G+"30":mcl<-20?R+"30":LN),
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:900,color:mcl>0?G:R}}>
            {mcl > 0 ? "+" : ""}{mcl}
          </span>
          <span style={{fontSize:11,fontWeight:700,color:T1}}>مذبذب ماكليلان</span>
        </div>
        <div style={{height:6,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden",position:"relative"}}>
          <div style={{
            position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"rgba(255,255,255,.2)",
          }}/>
          <div style={{
            position:"absolute",top:0,bottom:0,
            background:mcl>0?G:R,
            left: mcl>0 ? "50%" : `${50 + mcl/2}%`,
            width: Math.abs(mcl/2)+"%",
            borderRadius:3,
          }}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:7.5,color:T3}}>
          <span>−100 تشبع بيع</span>
          <span>0 محايد</span>
          <span>+100 تشبع شراء</span>
        </div>
        <div style={{fontSize:8,color:T3,marginTop:4}}>
          = (صاعد − هابط) / (صاعد + هابط) × 100
          · القيمة: <span style={{color:mcl>20?G:mcl<-20?R:T2,fontWeight:700}}>
            {mcl>20?"إيجابي -- ميل شراء":mcl<-20?"سلبي -- ميل بيع":"محايد"}
          </span>
        </div>
      </div>

      {/* قادة فوق VWAP */}
      <div style={{fontSize:9,fontWeight:700,color:T2,marginBottom:6}}>
        أعلى أسهم فوق VWAP
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {vwapResults
          .filter(v=>v.aboveVwap && v.diff>0)
          .sort((a,b)=>b.diff-a.diff)
          .slice(0,6)
          .map((v,i)=>(
            <div key={i} style={{
              background:G+"10",border:"1px solid "+G+"25",
              borderRadius:7,padding:"3px 9px",
            }}>
              <span style={{fontSize:9,fontWeight:700,color:G}}>{v.sym}</span>
              <span style={{fontSize:8,color:T2}}> +{v.diff}%</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Next.js Screen Export
   يستخدم useMarketEngine من الملف نفسه
   ══════════════════════════════════════════════════════ */

export default function HomeScreen() {
  const liveStocks = useSharedPrices(); // أسعار مشتركة محدَّثة
  const market = useMarketBridge();
  const idx    = market.current  || 12843.7;
  const chgP   = market.chgPts   || 0.84;
  const showDemoBadge = config.features.showModeLabel;

  // ── UX: Haptic ──────────────────────────────────────────────────
  const haptic = useHaptic();

  // ── UX: Search with keyboard support ────────────────────────────
  const [searchQ, setSearchQ] = useState('');
  const searchRef = useRef(null);
  const handleSearchKey = useCallback((e) => {
    if (e.key === 'Enter') { e.target.blur(); haptic.tap(); }
    if (e.key === 'Escape') { setSearchQ(''); e.target.blur(); }
  }, [haptic]);

  // ── UX: Scroll to top ───────────────────────────────────────────
  const scrollRef  = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const handleScroll = useCallback((e) => {
    setShowScrollTop(e.target.scrollTop > 300);
  }, []);
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    haptic.tap();
  }, [haptic]);

  // ── UX: Pull to refresh ─────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    haptic.success();
    // Stocks refresh via shared price store -- just wait 1s
    await new Promise(r => setTimeout(r, 1000));
  }, [haptic]);
  const { containerRef: pullRef, isPulling, pullProgress, isRefreshing, touchHandlers } =
    usePullToRefresh(handleRefresh, 60);

  // ── UX: Skeleton -- show for first 1.2s ──────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
<div style={{color:'yellow',padding:20,fontSize:16,position:'fixed',top:50,zIndex:9999}}>HomeScreen يعمل</div>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(30,230,138,.5)}70%{box-shadow:0 0 0 6px rgba(30,230,138,0)}100%{box-shadow:0 0 0 0 rgba(30,230,138,0)}}
      `}</style>
      <div
        ref={pullRef}
        {...touchHandlers}
        onScroll={handleScroll}
        style={{
          fontFamily:"'Cairo','Segoe UI',sans-serif",
          direction:'rtl', color:'#fff', fontSize:14,
          background:BG, minHeight:'100%',
          overflowY:'auto', height:'100dvh', paddingBottom:80,
        }}>
        {/* Pull to refresh visual indicator */}
        {(isPulling || isRefreshing) && (
          <div style={{
            textAlign:'center', padding:'8px 0 0',
            color:'#f0c050', fontSize:11, overflow:'hidden',
            height: isPulling ? Math.round(pullProgress * 40) + 'px' : isRefreshing ? '40px' : '0px',
            transition: isPulling ? 'none' : 'height .3s ease',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          }}>
            {isRefreshing
              ? <><div className="pull-spinner"/> <span>جارٍ التحديث...</span></>
              : <span style={{opacity:pullProgress}}>{pullProgress >= 1 ? '↑ حرِّر للتحديث' : '↓ اسحب للتحديث'}</span>
            }
          </div>
        )}
        <TopBar idx={idx} chgP={chgP} showDemoBadge={showDemoBadge}/>
        <HomeContent idx={idx} chgP={chgP} market={market} isLoadingH={isLoading} isRefreshingH={isRefreshing}/>
        {/* Scroll to top */}
        {showScrollTop && (
          <button
            className="scroll-top-btn"
            onClick={scrollToTop}
            aria-label="العودة للأعلى"
            style={{bottom:90}}
          >↑</button>
        )}
      </div>
    </>
  );
}
