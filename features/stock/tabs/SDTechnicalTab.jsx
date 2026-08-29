'use client';
/**
 * @module features/stock/tabs/SDTechnicalTab
 * @description تبويب التحليل التقني للسهم
 *
 * ✨ نسخة منظفة:
 * - أُزيلت استيرادات غير مستخدمة (generateOHLCBars)
 * - يعتمد كلياً على stk.priceHistory من sahmk
 * - عند غياب البيانات: EmptyState
 */
import { useState, useRef, useMemo, useEffect } from 'react';
import { C, SectionCard, SkeletonCard, Tag, EmptyState, nowStr } from './StockDetailShared';

function TechLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(t);
  }, [stk?.sym]);
  if (!show) return (
    <div style={{ borderRadius: 16, overflow: "hidden" }}>
      {[7, 6, 9].map((r, i) => <SkeletonCard key={i} rows={r}/>)}
    </div>
  );
  return <SDTechnical stk={stk}/>;
}

// ─── SDTechnical ─────────────────────────────────────────────────
function SDTechnical({ stk }) {
  const p = stk.p;
  const hist = stk.priceHistory || [];

  // ✨ الـhooks قبل أي return مشروط -- قاعدة React الأساسية
  // ── حساب كل المؤشرات
  const D = useMemo(() => {
    const closes = hist.length >= 20 ? hist.map(h => h.c) : null;
    const vols   = hist.length >= 20 ? hist.map(h => h.v) : null;

    // Ichimoku
    const ichimoku = hist.length >= 52 ? (() => {
      const highs2 = hist.map(h => h.h || h.c), lows2 = hist.map(h => h.l || h.c);
      const hP = (arr, n) => Math.max(...arr.slice(-n));
      const lP = (arr, n) => Math.min(...arr.slice(-n));
      const tenkan  = parseFloat(((hP(highs2, 9) + lP(lows2, 9)) / 2).toFixed(2));
      const kijun   = parseFloat(((hP(highs2, 26) + lP(lows2, 26)) / 2).toFixed(2));
      const senkouA = parseFloat(((tenkan + kijun) / 2).toFixed(2));
      const senkouB = parseFloat(((hP(highs2, 52) + lP(lows2, 52)) / 2).toFixed(2));
      const aboveCloud = p > Math.max(senkouA, senkouB);
      const belowCloud = p < Math.min(senkouA, senkouB);
      const signal = aboveCloud ? "فوق السحابة" : belowCloud ? "تحت السحابة" : "داخل السحابة";
      return {
        tenkan, kijun, senkouA, senkouB, signal,
        col: aboveCloud ? C.mint : belowCloud ? C.coral : C.amber,
        aboveCloud, belowCloud,
        tkCross: tenkan > kijun ? "صاعد" : "هابط",
      };
    })() : null;

    const calcRSI = (prices, period = 14) => {
      if (!prices || prices.length < period + 1) return 55;
      let gains = 0, losses = 0;
      for (let i = 1; i <= period; i++) {
        const d = prices[i] - prices[i - 1];
        d > 0 ? gains += d : losses += Math.abs(d);
      }
      const rs = (gains / period) / (losses / period || 0.001);
      return parseFloat((100 - 100 / (1 + rs)).toFixed(2));
    };

    const calcEMA = (prices, period) => {
      if (!prices || prices.length < period) return p;
      const k = 2 / (period + 1);
      let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
      for (let i = period; i < prices.length; i++) ema = prices[i] * k + ema * (1 - k);
      return parseFloat(ema.toFixed(2));
    };

    const calcSMA = (prices, period) => {
      if (!prices || prices.length < period) return p;
      return parseFloat((prices.slice(-period).reduce((a, b) => a + b, 0) / period).toFixed(2));
    };

    const calcATR = (prices, period = 14) => {
      if (!prices || prices.length < 2) return parseFloat((p * 0.012).toFixed(2));
      const trs = prices.slice(1).map((c, i) => Math.abs(c - prices[i]));
      return parseFloat((trs.slice(-period).reduce((a, b) => a + b, 0) / period).toFixed(2));
    };

    const calcBB = (prices, period = 20, mult = 2) => {
      if (!prices || prices.length < period) return { upper: p * 1.04, mid: p, lower: p * 0.96, bPct: 50 };
      const sma = calcSMA(prices, period);
      const std = Math.sqrt(prices.slice(-period).reduce((a, b) => a + (b - sma) ** 2, 0) / period);
      const upper = parseFloat((sma + mult * std).toFixed(2));
      const lower = parseFloat((sma - mult * std).toFixed(2));
      const bPct = parseFloat(((p - lower) / (upper - lower) * 100).toFixed(1));
      return { upper, mid: parseFloat(sma.toFixed(2)), lower, bPct };
    };

    const calcOBV = (prices, vols2) => {
      if (!prices || !vols2 || prices.length < 2) return 0;
      let obv = 0;
      for (let i = 1; i < prices.length; i++) {
        prices[i] > prices[i - 1] ? obv += vols2[i] : prices[i] < prices[i - 1] ? obv -= vols2[i] : null;
      }
      return obv;
    };

    const calcMACD = (prices) => {
      if (!prices || prices.length < 35) return { macd: 0, signal: 0, hist: 0 };
      const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
      let ema12 = prices.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
      let ema26 = prices.slice(0, 26).reduce((a, b) => a + b, 0) / 26;
      for (let i = 12; i < 26; i++) ema12 = prices[i] * k12 + ema12 * (1 - k12);
      const macdSeries = [];
      let e12 = ema12, e26 = ema26;
      for (let i = 26; i < prices.length; i++) {
        e12 = prices[i] * k12 + e12 * (1 - k12);
        e26 = prices[i] * k26 + e26 * (1 - k26);
        macdSeries.push(parseFloat((e12 - e26).toFixed(4)));
      }
      const macdVal = macdSeries[macdSeries.length - 1];
      let signal = macdSeries.slice(0, 9).reduce((a, b) => a + b, 0) / 9;
      for (let i = 9; i < macdSeries.length; i++) signal = macdSeries[i] * k9 + signal * (1 - k9);
      signal = parseFloat(signal.toFixed(4));
      const hist2 = parseFloat((macdVal - signal).toFixed(4));
      return { macd: macdVal, signal, hist: hist2 };
    };

    const rsi14 = closes ? calcRSI(closes, 14) : 55;
    const rsi7  = closes ? calcRSI(closes, 7)  : 55;
    const rsiDivergence = closes && closes.length >= 20 ? (() => {
      const seg1 = closes.slice(-20, -10);
      const seg2 = closes.slice(-10);
      const rsi1 = calcRSI(seg1, Math.min(9, seg1.length - 1));
      const rsi2 = calcRSI(seg2, Math.min(9, seg2.length - 1));
      const p1 = seg1[seg1.length - 1], p2 = seg2[seg2.length - 1];
      if (p2 > p1 * 1.005 && rsi2 < rsi1 - 3) return { type: "سلبي عادي", color: C.coral, note: "السعر ↑ RSI ↓ -- ضعف الاتجاه الصاعد" };
      if (p2 < p1 * 0.995 && rsi2 > rsi1 + 3) return { type: "إيجابي عادي", color: C.mint, note: "السعر ↓ RSI ↑ -- ضعف الاتجاه الهابط" };
      if (p2 > p1 && rsi2 < rsi1 && rsi2 > 40) return { type: "خفي صاعد", color: C.teal, note: "تباعد خفي -- استمرار الصعود محتمل" };
      if (p2 < p1 && rsi2 > rsi1 && rsi2 < 60) return { type: "خفي هابط", color: C.amber, note: "تباعد خفي -- استمرار الهبوط محتمل" };
      return { type: "لا تباعد", color: C.smoke, note: "لا تباعد ظاهر حالياً" };
    })() : { type: "--", color: C.smoke, note: "بيانات غير كافية" };

    const ma5s   = closes ? calcSMA(closes, 5)                                  : p;
    const ma10s  = closes ? calcSMA(closes, 10)                                 : p;
    const ma20s  = closes ? calcSMA(closes, 20)                                 : p;
    const ma50s  = closes ? calcSMA(closes, 50)                                 : p;
    const ma100s = closes ? calcSMA(closes, Math.min(closes.length, 100))       : p;
    const ma200s = closes ? calcSMA(closes, Math.min(closes.length, 200))       : p;
    const ma5e   = closes ? calcEMA(closes, 5)                                  : p;
    const ma10e  = closes ? calcEMA(closes, 10)                                 : p;
    const ma20e  = closes ? calcEMA(closes, 20)                                 : p;
    const ma50e  = closes ? calcEMA(closes, 50)                                 : p;
    const ma100e = closes ? calcEMA(closes, Math.min(closes.length, 100))       : p;
    const ma200e = closes ? calcEMA(closes, Math.min(closes.length, 200))       : p;
    const atr14  = closes ? calcATR(closes, 14)                                 : 0;
    const bb     = closes ? calcBB(closes) : { upper: p * 1.04, mid: p, lower: p * 0.96, bPct: 50 };
    const macdR  = closes ? calcMACD(closes) : { macd: 0, signal: 0, hist: 0 };
    const obv    = closes && vols ? calcOBV(closes, vols) : 0;
    const obvSignal = closes && vols && closes.length >= 20 ? (() => {
      const obvSeries = [];
      let o2 = 0;
      for (let i = 1; i < closes.length; i++) {
        closes[i] > closes[i - 1] ? o2 += vols[i] : closes[i] < closes[i - 1] ? o2 -= vols[i] : null;
        obvSeries.push(o2);
      }
      const k2 = 2 / 21;
      let ema2 = obvSeries.slice(0, 20).reduce((a, b) => a + b, 0) / 20;
      for (let i = 20; i < obvSeries.length; i++) ema2 = obvSeries[i] * k2 + ema2 * (1 - k2);
      return ema2;
    })() : 0;

    // نقطة الارتكاز
    const hi = stk.dayHi || p * 1.01, lo = stk.dayLo || p * 0.99, cl = stk.prev || p;
    const pivot = parseFloat(((hi + lo + cl) / 3).toFixed(2));
    const r1t = parseFloat((2 * pivot - lo).toFixed(2)),    r1f = parseFloat((pivot + 0.382 * (hi - lo)).toFixed(2));
    const r2t = parseFloat((pivot + (hi - lo)).toFixed(2)), r2f = parseFloat((pivot + 0.618 * (hi - lo)).toFixed(2));
    const r3t = parseFloat((hi + 2 * (pivot - lo)).toFixed(2)), r3f = parseFloat((pivot + 1.0 * (hi - lo)).toFixed(2));
    const s1t = parseFloat((2 * pivot - hi).toFixed(2)),    s1f = parseFloat((pivot - 0.382 * (hi - lo)).toFixed(2));
    const s2t = parseFloat((pivot - (hi - lo)).toFixed(2)), s2f = parseFloat((pivot - 0.618 * (hi - lo)).toFixed(2));
    const s3t = parseFloat((lo - 2 * (hi - pivot)).toFixed(2)), s3f = parseFloat((pivot - 1.0 * (hi - lo)).toFixed(2));

    // ADX
    const adxVal = closes && hist.length >= 15 ? (() => {
      const highs2 = hist.map(h => h.h || h.c);
      const lows2 = hist.map(h => h.l || h.c);
      const n14 = Math.min(14, closes.length - 1);
      let dmPlus = 0, dmMinus = 0, trSum = 0;
      for (let i = closes.length - n14; i < closes.length; i++) {
        const upMove   = highs2[i]     - highs2[i - 1];
        const downMove = lows2[i - 1]  - lows2[i];
        if (upMove > downMove && upMove > 0) dmPlus += upMove;
        if (downMove > upMove && downMove > 0) dmMinus += downMove;
        const tr = Math.max(highs2[i] - lows2[i], Math.abs(highs2[i] - closes[i - 1]), Math.abs(lows2[i] - closes[i - 1]));
        trSum += tr;
      }
      if (trSum === 0) return 35;
      const diPlus = (dmPlus / trSum) * 100;
      const diMinus = (dmMinus / trSum) * 100;
      const dx = diPlus + diMinus > 0 ? Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100 : 0;
      return parseFloat(Math.min(75, Math.max(10, dx)).toFixed(1));
    })() : 35;

    // Stochastic
    const { stochK, stochD } = closes && hist.length >= 14 ? (() => {
      const period = 14;
      const highs2 = hist.map(h => h.h || h.c);
      const lows2 = hist.map(h => h.l || h.c);
      const kArr = [];
      for (let j = Math.max(0, hist.length - period - 2); j < hist.length; j++) {
        const start = Math.max(0, j - period + 1);
        const hiRange = Math.max(...highs2.slice(start, j + 1));
        const loRange = Math.min(...lows2.slice(start, j + 1));
        kArr.push(hiRange > loRange ? parseFloat(((closes[j] - loRange) / (hiRange - loRange) * 100).toFixed(2)) : 50);
      }
      const kVal = kArr[kArr.length - 1];
      const dVal = kArr.length >= 3 ? parseFloat((kArr.slice(-3).reduce((a, b) => a + b, 0) / 3).toFixed(2)) : kVal;
      return { stochK: kVal, stochD: dVal };
    })() : { stochK: 50, stochD: 50 };

    const cciVal = closes ? parseFloat(((p - ma20s) / (0.015 * (closes.slice(-20).reduce((a, b) => a + Math.abs(b - ma20s), 0) / 20 || 1))).toFixed(1)) : 0;
    const willR = parseFloat(((p - stk.dayHi) / (stk.dayHi - stk.dayLo || 1) * 100).toFixed(2));

    const mfi = closes && vols && hist.length >= 14 ? (() => {
      const n14 = Math.min(14, hist.length - 1);
      let posFlow = 0, negFlow = 0;
      for (let i = hist.length - n14; i < hist.length; i++) {
        const tp  = ((hist[i].h     || closes[i])     + (hist[i].l     || closes[i])     + closes[i])     / 3;
        const tpP = ((hist[i-1].h || closes[i-1]) + (hist[i-1].l || closes[i-1]) + closes[i-1]) / 3;
        const rawFlow = tp * (vols[i] || 1e6);
        if (tp > tpP) posFlow += rawFlow;
        else if (tp < tpP) negFlow += rawFlow;
      }
      if (negFlow === 0) return 100;
      const mfRatio = posFlow / negFlow;
      return parseFloat((100 - 100 / (1 + mfRatio)).toFixed(1));
    })() : 50;

    const { stochRSI, stochRSID } = closes ? (() => {
      if (closes.length < 28) return { stochRSI: 50, stochRSID: 50 };
      const rsiArr = [];
      for (let i = 14; i <= closes.length; i++) {
        rsiArr.push(parseFloat(calcRSI(closes.slice(0, i), 14).toFixed(2)));
      }
      if (rsiArr.length < 14) return { stochRSI: 50, stochRSID: 50 };
      const kArr = [];
      for (let i = 14; i < rsiArr.length; i++) {
        const window = rsiArr.slice(i - 14, i + 1);
        const minR = Math.min(...window), maxR = Math.max(...window);
        kArr.push(maxR === minR ? 50 : parseFloat(((rsiArr[i] - minR) / (maxR - minR) * 100).toFixed(1)));
      }
      const kVal = kArr[kArr.length - 1] || 50;
      const dVal = kArr.length >= 3 ? parseFloat((kArr.slice(-3).reduce((a, b) => a + b, 0) / 3).toFixed(1)) : kVal;
      return { stochRSI: kVal, stochRSID: dVal };
    })() : { stochRSI: 50, stochRSID: 50 };

    const supertrend = closes && hist.length >= 12 ? (() => {
      const mult = 3;
      const highs2 = hist.map(h => h.h || h.c), lows2 = hist.map(h => h.l || h.c);
      const atrArr = closes.slice(1).map((c, i) => Math.max(
        highs2[i+1] - lows2[i+1],
        Math.abs(highs2[i+1] - closes[i]),
        Math.abs(lows2[i+1] - closes[i])
      ));
      let bullish = true;
      let finalUp = 0, finalDn = 0;
      for (let i = 0; i < atrArr.length; i++) {
        const mid = (highs2[i+1] + lows2[i+1]) / 2;
        const up = mid + mult * atrArr[i];
        const dn = mid - mult * atrArr[i];
        const prevUp = finalUp || up, prevDn = finalDn || dn;
        finalUp = up < prevUp || closes[i] > prevUp ? up : prevUp;
        finalDn = dn > prevDn || closes[i] < prevDn ? dn : prevDn;
        if (bullish && closes[i+1] < finalDn) bullish = false;
        else if (!bullish && closes[i+1] > finalUp) bullish = true;
      }
      const stVal = bullish ? parseFloat(finalDn.toFixed(2)) : parseFloat(finalUp.toFixed(2));
      const pct = parseFloat(((p - stVal) / stVal * 100).toFixed(2));
      return { signal: bullish ? "صاعد" : "هابط", color: bullish ? C.mint : C.coral, val: stVal, pct };
    })() : { signal: "--", color: C.smoke, val: p, pct: 0 };

    return {
      rsi14, rsi7, ma5s, ma10s, ma20s, ma50s, ma100s, ma200s, ma5e, ma10e, ma20e, ma50e, ma100e, ma200e,
      atr14, bb, macdR, obv, obvSignal, adxVal, stochK, stochD, cciVal, willR, mfi, stochRSI, stochRSID,
      supertrend, rsiDivergence, ichimoku,
      pivot, r1t, r1f, r2t, r2f, r3t, r3f, s1t, s1f, s2t, s2f, s3t, s3f,
    };
  }, [stk.sym, stk.p, stk.dayHi, stk.dayLo, stk.prev, hist.length]);

  // إذا لم تتوفر بيانات الأسعار، نعرض EmptyState
  if (!p || hist.length === 0) {
    return (
      <SectionCard title="التحليل التقني" accent={C.electric}>
        <EmptyState
          icon="📈"
          title="بيانات التحليل التقني غير متوفرة"
          subtitle="جارٍ جلب البيانات التاريخية من sahmk... المؤشرات تتطلب 20+ شمعة على الأقل"
        />
      </SectionCard>
    );
  }

  const maSig = val => val > p ? { l: "بيع", c: C.coral } : { l: "شراء", c: C.mint };
  const n = nowStr();


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* نقطة الارتكاز */}
      <SectionCard title="نقطة الارتكاز" accent={C.electric}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 16px 2px", fontSize: 11, color: C.smoke, lineHeight: 1.5 }}>
          <span>مبني على إغلاق أمس: {stk.prev || "--"}</span>
          <span>{n}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, padding: "8px 16px", background: C.layer3, borderBottom: `1px solid ${C.line}44` }}>
          {["فيبوناتشي", "تقليدي", "المرحلة"].map((l, i) =>
            <span key={i} style={{ fontSize: 11, color: C.smoke, fontWeight: 700, textAlign: i < 2 ? "center" : "right", lineHeight: 1.5 }}>{l}</span>
          )}
        </div>
        {[
          { label: "R3", trad: D.r3t, fib: D.r3f, type: "R" },
          { label: "R2", trad: D.r2t, fib: D.r2f, type: "R" },
          { label: "R1", trad: D.r1t, fib: D.r1f, type: "R" },
          { label: "المحور", trad: D.pivot, fib: D.pivot, type: "P" },
          { label: "S1", trad: D.s1t, fib: D.s1f, type: "S" },
          { label: "S2", trad: D.s2t, fib: D.s2f, type: "S" },
          { label: "S3", trad: D.s3t, fib: D.s3f, type: "S" },
        ].map((row, i) => {
          const c = row.type === "R" ? C.coralL : row.type === "P" ? C.electric : C.mint;
          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              padding: "8px 16px",
              borderBottom: i < 6 ? `1px solid ${C.line}22` : 0,
              alignItems: "center",
              background: i % 2 ? "rgba(255,255,255,.015)" : "transparent",
            }}>
              {[row.fib, row.trad].map((v, j) => (
                <div key={j} style={{
                  background: c + "18", border: `1px solid ${c}33`,
                  borderRadius: 7, padding: "6px 4px", textAlign: "center", margin: "0 2px",
                }}>
                  <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 12, fontWeight: 800, color: c }}>{v}</span>
                </div>
              ))}
              <span style={{ fontSize: 11, color: C.mist, fontWeight: 700, textAlign: "right" }}>{row.label}</span>
            </div>
          );
        })}
      </SectionCard>

      {/* MA Ribbon */}
      {(() => {
        const maVals = [
          { n: "5", v: D.ma5e, c: C.electric },
          { n: "10", v: D.ma10e, c: C.plasma },
          { n: "20", v: D.ma20e, c: C.mint },
          { n: "50", v: D.ma50e, c: C.gold },
          { n: "100", v: D.ma100e, c: C.amber },
          { n: "200", v: D.ma200e, c: C.coral },
        ];
        const bullish = maVals.every((m, i) => i === 0 || m.v <= maVals[i-1].v);
        const bearish = maVals.every((m, i) => i === 0 || m.v >= maVals[i-1].v);
        return (
          <div style={{ padding: "8px 16px 4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: C.smoke }}>MA Ribbon</span>
              <Tag text={bullish ? "صف صاعد" : bearish ? "صف هابط" : "مختلط"} color={bullish ? C.mint : bearish ? C.coral : C.amber}/>
            </div>
            <div style={{ display: "flex", height: 10, borderRadius: 4, overflow: "hidden", gap: 1 }}>
              {maVals.map((m, i) => {
                const aboveMA = p >= m.v;
                const diff = Math.abs(m.v - p) / p;
                const opacity = aboveMA ? Math.max(0.5, 1 - diff * 3) : 0.15;
                const borderBottom = "none";
                return (
                  <div key={i} style={{ flex: 1, background: m.c, opacity, position: "relative", borderBottom }}>
                    <span style={{ position: "absolute", bottom: "-14px", left: "50%", transform: "translateX(-50%)", fontSize: 7, color: m.c, whiteSpace: "nowrap", opacity: 1 }}>{m.n}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ height: 14 }}/>
            <div style={{ display: "flex", gap: 8, fontSize: 9, color: C.smoke, marginTop: 2 }}>
              <span style={{ color: C.mint }}>مضاء = السعر فوق المتوسط</span>
              <span style={{ color: C.smoke, opacity: 0.5 }}>شفاف = المتوسط فوق السعر</span>
            </div>
          </div>
        );
      })()}

      {/* المعدلات المتحركة */}
      <SectionCard title="المعدلات المتحركة" accent={C.gold}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", padding: "8px 16px", background: C.layer3, borderBottom: `1px solid ${C.line}44` }}>
          {["أسي (EMA)", "بسيط (SMA)", "الإشارة", "الرمز"].map((l, i) =>
            <span key={i} style={{ fontSize: 11, color: C.smoke, fontWeight: 700, textAlign: i < 3 ? "center" : "right" }}>{l}</span>
          )}
        </div>
        {[
          { sym: "MA 5",   s: D.ma5s,   e: D.ma5e },
          { sym: "MA 10",  s: D.ma10s,  e: D.ma10e },
          { sym: "MA 20",  s: D.ma20s,  e: D.ma20e },
          { sym: "MA 50",  s: D.ma50s,  e: D.ma50e },
          { sym: "MA 100", s: D.ma100s, e: D.ma100e },
          { sym: "MA 200", s: D.ma200s, e: D.ma200e },
        ].map((row, i) => {
          const sigS = maSig(row.s), sigE = maSig(row.e);
          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
              padding: "8px 16px",
              borderBottom: i < 5 ? `1px solid ${C.line}22` : 0,
              alignItems: "center",
              background: i % 2 ? "rgba(255,255,255,.015)" : "transparent",
            }}>
              {[{ v: row.e, sig: sigE }, { v: row.s, sig: sigS }].map((item, j) => (
                <div key={j} style={{
                  background: item.sig.c + "18", border: `1px solid ${item.sig.c}33`,
                  borderRadius: 7, padding: "6px 4px", textAlign: "center", margin: "0 2px",
                }}>
                  <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 800, color: item.sig.c }}>{item.v}</div>
                  <div style={{ fontSize: 11, color: item.sig.c }}>{item.sig.l}</div>
                </div>
              ))}
              <div style={{
                background: p > row.s && p > row.e ? C.mint + "15" : C.coral + "15",
                borderRadius: 7, padding: "6px 4px", textAlign: "center",
                border: `1px solid ${p > row.s && p > row.e ? C.mint : C.coral}33`,
                margin: "0 2px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: p > row.s && p > row.e ? C.mint : C.coral }}>
                  {p > row.s && p > row.e ? "فوق" : "تحت"}
                </div>
              </div>
              <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 12, fontWeight: 800, color: C.snow, textAlign: "right" }}>{row.sym}</span>
            </div>
          );
        })}
      </SectionCard>

      {/* المؤشرات التقنية */}
      <SectionCard title="المؤشرات التقنية" accent={C.plasma}>
        {[
          { sym: "RSI(14)", v: D.rsi14.toFixed(2), bar: D.rsi14, note: D.rsi14 > 70 ? "فائض شراء" : D.rsi14 < 30 ? "فائض بيع" : "محايد", c: D.rsi14 > 70 ? C.coral : D.rsi14 < 30 ? C.mint : C.amber },
          { sym: "RSI(7)", v: D.rsi7.toFixed(2), bar: D.rsi7, note: D.rsi7 > 70 ? "فائض شراء" : D.rsi7 < 30 ? "فائض بيع" : "محايد", c: D.rsi7 > 70 ? C.coral : D.rsi7 < 30 ? C.mint : C.amber },
          { sym: "RSI Div", v: D.rsiDivergence?.type || "--", bar: 50, note: D.rsiDivergence?.note || "--", c: D.rsiDivergence?.color || C.smoke },
          { sym: "Stoch%K", v: `${D.stochK.toFixed(1)} / ${D.stochD?.toFixed(1) || "--"}`, bar: D.stochK, note: D.stochK > 80 ? "فائض شراء" : D.stochK < 20 ? "فائض بيع" : D.stochK > D.stochD ? "صاعد" : "هابط", c: D.stochK > 80 ? C.coral : D.stochK < 20 ? C.mint : D.stochK > D.stochD ? C.mint : C.amber },
          { sym: "ADX(14)", v: D.adxVal.toFixed(1), bar: D.adxVal, note: D.adxVal > 25 ? "اتجاه قوي" : "اتجاه ضعيف", c: D.adxVal > 25 ? C.mint : C.smoke },
          { sym: "CCI(14)", v: D.cciVal, bar: Math.min(100, Math.max(0, (D.cciVal + 200) / 4)), note: D.cciVal > 100 ? "شراء" : D.cciVal < -100 ? "بيع" : "محايد", c: D.cciVal > 100 ? C.mint : D.cciVal < -100 ? C.coral : C.amber },
          { sym: "Williams%R", v: D.willR.toFixed(1), bar: Math.max(0, 100 + D.willR), note: D.willR > -20 ? "فائض شراء" : D.willR < -80 ? "فائض بيع" : "محايد", c: D.willR > -20 ? C.coral : D.willR < -80 ? C.mint : C.amber },
          { sym: "MFI(14)", v: D.mfi, bar: D.mfi, note: D.mfi > 80 ? "تشبع شراء" : D.mfi < 20 ? "تشبع بيع" : "محايد", c: D.mfi > 80 ? C.coral : D.mfi < 20 ? C.mint : C.amber },
          { sym: "Stoch RSI", v: `${D.stochRSI} / ${D.stochRSID || "--"}`, bar: D.stochRSI, note: D.stochRSI > 80 ? "فائض شراء" : D.stochRSI < 20 ? "فائض بيع" : "محايد", c: D.stochRSI > 80 ? C.coral : D.stochRSI < 20 ? C.mint : C.amber },
          { sym: "ATR(14)", v: D.atr14, bar: Math.min(100, D.atr14 / p * 500), note: `${(D.atr14 / p * 100).toFixed(2)}% تقلب`, c: D.atr14 / p > 0.025 ? C.coral : D.atr14 / p > 0.012 ? C.amber : C.mint },
          { sym: "OBV", v: D.obv > 0 ? "+" + (D.obv / 1e6).toFixed(0) + "م" : (D.obv / 1e6).toFixed(0) + "م", bar: 50 + Math.min(50, Math.max(-50, D.obv / 1e8)), note: D.obv > D.obvSignal ? "فوق الإشارة" : "تحت الإشارة", c: D.obv > D.obvSignal ? C.mint : C.coral },
          { sym: "Supertrend", v: `${D.supertrend.signal} ${D.supertrend.val}`, bar: D.supertrend.signal === "صاعد" ? 75 : 25, note: `${D.supertrend.pct > 0 ? "+" : ""}${D.supertrend.pct}%`, c: D.supertrend.color },
          { sym: "Ichimoku", v: D.ichimoku ? D.ichimoku.signal : "--", bar: D.ichimoku?.aboveCloud ? 80 : D.ichimoku?.belowCloud ? 20 : 50, note: D.ichimoku ? `TK: ${D.ichimoku.tkCross}` : "--", c: D.ichimoku ? D.ichimoku.col : C.smoke },
        ].map((row, i, arr) => (
          <div key={i} style={{
            padding: "8px 16px",
            borderBottom: i < arr.length - 1 ? `1px solid ${C.line}22` : 0,
            background: i % 2 ? "rgba(255,255,255,.015)" : "transparent",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 12, fontWeight: 700, color: C.snow }}>{row.sym}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, color: C.mist }}>{row.v}</span>
                <Tag text={row.note} color={row.c}/>
              </div>
            </div>
            <div style={{ height: 3, background: C.layer3, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, row.bar))}%`, background: row.c, borderRadius: 2 }}/>
            </div>
          </div>
        ))}
      </SectionCard>

      {/* Bollinger Bands */}
      <SectionCard title="بولينجر باند (20,2)" accent={C.plasma}>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ position: "relative", height: 10, background: C.layer3, borderRadius: 5, marginBottom: 8, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,${C.coral}44,${C.layer3},${C.mint}44)`, borderRadius: 5 }}/>
            <div style={{
              position: "absolute", top: "50%", left: `${D.bb.bPct}%`,
              transform: "translate(-50%,-50%)",
              width: 12, height: 12, borderRadius: "50%",
              background: C.snow, border: `2px solid ${C.layer1}`,
              boxShadow: "0 0 6px rgba(0,0,0,.8)",
            }}/>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { l: "الحد العلوي", v: D.bb.upper, c: C.coralL },
              { l: "الوسط (SMA20)", v: D.bb.mid, c: C.electric },
              { l: "الحد السفلي", v: D.bb.lower, c: C.mint },
            ].map((item, i) => (
              <div key={i} style={{
                background: item.c + "12", borderRadius: 9, padding: "8px",
                textAlign: "center", border: `1px solid ${item.c}25`,
              }}>
                <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 13, fontWeight: 900, color: item.c }}>{item.v}</div>
                <div style={{ fontSize: 11, color: C.smoke, marginTop: 2 }}>{item.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: C.smoke }}>
            <span>%B: <span style={{ color: D.bb.bPct > 80 ? C.coral : D.bb.bPct < 20 ? C.mint : C.amber, fontWeight: 700 }}>{D.bb.bPct}%</span></span>
            <span>ATR: <span style={{ fontFamily: "IBM Plex Mono,monospace", color: C.mist }}>{D.atr14}</span></span>
          </div>
        </div>
      </SectionCard>

      {/* MACD */}
      <SectionCard title="MACD (12,26,9)" accent={D.macdR.macd > 0 ? C.mint : C.coral}>
        <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { l: "MACD", v: D.macdR.macd, c: D.macdR.macd > 0 ? C.mint : C.coral },
            { l: "إشارة", v: D.macdR.signal, c: C.amber },
            { l: "المدرج", v: D.macdR.hist, c: D.macdR.hist > 0 ? C.mint : C.coral },
          ].map((item, i) => (
            <div key={i} style={{
              background: item.c + "12", borderRadius: 9, padding: "10px 8px",
              textAlign: "center", border: `1px solid ${item.c}25`,
            }}>
              <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 14, fontWeight: 900, color: item.c }}>{item.v}</div>
              <div style={{ fontSize: 11, color: C.smoke, marginTop: 2 }}>{item.l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 16px", fontSize: 11, color: D.macdR.macd > 0 ? C.mint : C.coral, lineHeight: 1.5 }}>
          {D.macdR.macd > D.macdR.signal ? "✓ MACD فوق خط الإشارة -- صعودي" : "✗ MACD دون خط الإشارة -- هبوطي"}
        </div>
      </SectionCard>

      {/* Elliott Wave AI */}
      <ElliottWaveAI stk={stk} hist={hist}/>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ElliottWaveAI -- تحليل موجات إيليوت بالـ AI
═══════════════════════════════════════════════════════════════ */

function ElliottWaveAI({ stk, hist }) {
  const [ewData,    setEwData]    = useState(null);
  const [ewLoading, setEwLoading] = useState(false);
  const [ewErr,     setEwErr]     = useState(null);
  const [ewFetched, setEwFetched] = useState(null);

  // ═══ تجميع اليومي → أسبوعي ═══
  const buildWeekly = (daily) => {
    if (!daily || daily.length === 0) return [];
    const weeks = [];
    for (let i = 0; i < daily.length; i += 5) {
      const slice = daily.slice(i, i + 5);
      if (slice.length === 0) continue;
      weeks.push({
        d: slice[0].d,
        o: slice[0].o,
        h: Math.max(...slice.map(b => b.h)),
        l: Math.min(...slice.map(b => b.l)),
        c: slice[slice.length - 1].c,
        v: slice.reduce((s, b) => s + b.v, 0),
      });
    }
    return weeks;
  };

  // ═══ ZigZag: تحديد القمم والقيعان ═══
  const zigzag = (bars, threshold = 0.03) => {
    if (!bars || bars.length < 5) return [];
    const pivots = [];
    let lastType = null;
    let lastPrice = bars[0].c;
    let lastIdx = 0;

    for (let i = 1; i < bars.length; i++) {
      const h = bars[i].h, l = bars[i].l;
      if (lastType !== "H" && h >= lastPrice * (1 + threshold)) {
        if (lastType === null || (lastType === "H" && h > pivots[pivots.length - 1].price)) {
          if (lastType === "H") pivots.pop();
        }
        pivots.push({ idx: i, price: h, date: bars[i].d, type: "H" });
        lastType = "H"; lastPrice = h; lastIdx = i;
      } else if (lastType !== "L" && l <= lastPrice * (1 - threshold)) {
        if (lastType === "L" && l < pivots[pivots.length - 1].price) pivots.pop();
        pivots.push({ idx: i, price: l, date: bars[i].d, type: "L" });
        lastType = "L"; lastPrice = l; lastIdx = i;
      }
    }
    return pivots;
  };

  // ═══ فيبوناتشي ═══
  const fib = (start, end, level) => parseFloat((start + (end - start) * level).toFixed(2));
  const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.0, 2.618];

  const getFibLabel = (ratio) => {
    const labels = { 0.236:"23.6%", 0.382:"38.2%", 0.5:"50%", 0.618:"61.8%", 0.786:"78.6%", 1.0:"100%", 1.272:"127.2%", 1.618:"161.8%", 2.0:"200%", 2.618:"261.8%" };
    let closest = 0.618, minDiff = 999;
    for (const lvl of fibLevels) {
      if (Math.abs(ratio - lvl) < minDiff) { minDiff = Math.abs(ratio - lvl); closest = lvl; }
    }
    return labels[closest] || ratio.toFixed(3);
  };

  // ═══ فحص قواعد إليوت الثلاث الصارمة ═══
  // يتطلب 6 محاور متناوبة: P0(قاع) P1(قمة) P2(قاع) P3(قمة) P4(قاع) P5(قمة)
  const validateImpulse = (p) => {
    if (!p || p.length < 6) return { valid: false, reason: "محاور غير كافية (نحتاج 6)" };

    const [p0, p1, p2, p3, p4, p5] = p.slice(-6);
    const up = p1.price > p0.price;

    // التناوب إلزامي
    const seq = [p0, p1, p2, p3, p4, p5].map(x => x.type).join("");
    if (seq !== (up ? "LHLHLH" : "HLHLHL")) {
      return { valid: false, reason: "المحاور غير متناوبة" };
    }

    const w1 = Math.abs(p1.price - p0.price);
    const w3 = Math.abs(p3.price - p2.price);
    const w5 = Math.abs(p5.price - p4.price);

    // القاعدة 1: الموجة 2 لا تتجاوز بداية الموجة 1
    if (up ? p2.price <= p0.price : p2.price >= p0.price) {
      return { valid: false, reason: "خرق القاعدة 1: الموجة 2 تجاوزت بداية الموجة 1" };
    }

    // القاعدة 2: الموجة 3 ليست الأقصر
    if (w3 < w1 && w3 < w5) {
      return { valid: false, reason: "خرق القاعدة 2: الموجة 3 هي الأقصر" };
    }

    // القاعدة 3: الموجة 4 لا تتداخل مع منطقة الموجة 1
    if (up ? p4.price <= p1.price : p4.price >= p1.price) {
      return { valid: false, reason: "خرق القاعدة 3: الموجة 4 تداخلت مع الموجة 1" };
    }

    return {
      valid: true, up,
      points: { p0, p1, p2, p3, p4, p5 },
      sizes: { w1, w3, w5 },
      w3Ratio: w1 > 0 ? +(w3 / w1).toFixed(2) : 1,
      w5Ratio: w1 > 0 ? +(w5 / w1).toFixed(2) : 1,
      extended: w1 > 0 && (w3 / w1) >= 1.618,
    };
  };

  // ═══ فحص النمط التصحيحي ABC ═══
  // يتطلب 4 محاور: P0 → A → B → C
  const validateCorrective = (p) => {
    if (!p || p.length < 4) return { valid: false, reason: "محاور غير كافية (نحتاج 4)" };

    const [p0, pA, pB, pC] = p.slice(-4);
    const down = pA.price < p0.price;

    const seq = [p0, pA, pB, pC].map(x => x.type).join("");
    if (seq !== (down ? "HLHL" : "LHLH")) {
      return { valid: false, reason: "المحاور غير متناوبة" };
    }

    const wA = Math.abs(pA.price - p0.price);
    const wC = Math.abs(pC.price - pB.price);
    const bRetr = wA > 0 ? Math.abs(pB.price - pA.price) / wA : 0;

    // قاعدة: الموجة B لا تتجاوز بداية A (إلا في expanded flat)
    const expanded = down ? pB.price > p0.price : pB.price < p0.price;

    // النمط: zigzag إن كان B تصحيحاً ضحلاً، flat إن كان عميقاً
    const pattern = bRetr < 0.618 ? "zigzag" : expanded ? "expanded flat" : "flat";

        // ✨ شروط إضافية: C يجب أن تتجاوز A، والنسب ضمن المعقول
    const cBeyondA = down ? pC.price < pA.price : pC.price > pA.price;
    const ratioOk = wA > 0 && (wC / wA) >= 0.5 && (wC / wA) <= 3.0;
    if (!cBeyondA) return { valid: false, reason: "الموجة C لم تتجاوز A -- النمط غير مكتمل" };
    if (!ratioOk)  return { valid: false, reason: "نسبة C/A خارج النطاق المعقول" };

    return {
      valid: true, down,
      points: { p0, pA, pB, pC },
      wA, wC,
      cRatio: wA > 0 ? +(wC / wA).toFixed(2) : 1,
      bRetr: +(bRetr * 100).toFixed(0),
      pattern,
    };
  };

  // ═══ تحليل الموجات من القمم والقيعان ═══
  const analyzeWaves = (pivots, bars, timeframe) => {
    if (!pivots || pivots.length < 4) return null;

    const recent = pivots.slice(-14);
    const last = bars[bars.length - 1];
    const curPrice = stk.p || last?.c || 0;

    const firstPivot = recent[0];
    const lastPivot  = recent[recent.length - 1];
    const overallUp  = lastPivot.price > firstPivot.price;

    const highs = recent.filter(p => p.type === "H");
    const lows  = recent.filter(p => p.type === "L");

    let waveNum = "?", waveDir = "محايد", waveType = "غير محدد";
    let waveStart = 0, waveTarget = 0, fibRatio = "?";
    let waveNote = "", waveProps = "";

    // ═══ خصائص كل موجة أكاديمياً ═══
    const WAVE_PROPS = {
      "1": {
        title: "موجة 1 -- البداية الخفية",
        chars: "أضعف موجات الدافع. تبدأ والأخبار سلبية والجمهور متشائم. RSI يخرج من تشبع البيع. حجم تداول منخفض إلى متوسط. غالباً تُفسَّر كارتداد مؤقت.",
        rules: "لا قواعد صارمة عليها. تمتد عادة بين 38.2%-61.8% فيبوناتشي.",
        signal: "فرصة شراء مبكرة للمتابعين الدقيقين.",
      },
      "2": {
        title: "موجة 2 -- التصحيح الخادع",
        chars: "تصحيح عميق 50%-61.8% من موجة 1. تُوهم بعودة الهبوط. حجم تداول يتراجع تدريجياً. RSI يتراجع لكن لا يكسر منطقة تشبع البيع.",
        rules: "قاعدة صارمة: لا تتجاوز بداية موجة 1 أبداً. شكلها zigzag أو flat أو مجموعة.",
        signal: "فرصة دخول ممتازة للمتحلي بالصبر.",
      },
      "3": {
        title: "موجة 3 -- الأقوى والأطول",
        chars: "الأقوى والأطول في معظم الأحيان. تمتد 161.8% أو أكثر من موجة 1. حجم تداول مرتفع جداً. RSI في منطقة تشبع الشراء. الأخبار إيجابية والجمهور متحمس. اختراقات قوية للمقاومات.",
        rules: "قاعدة صارمة: لا تكون أقصر من موجتي 1 و5. إذا امتدت: 261.8% أو 423.6%.",
        signal: "⚡ أقوى إشارة شراء -- معظم الأرباح تتحقق هنا.",
      },
      "4": {
        title: "موجة 4 -- التصحيح الجانبي",
        chars: "تصحيح خفيف 38.2%-50% من موجة 3. أبطأ وأطول زمنياً من موجة 2. شكلها مسطح (flat) أو مثلث. RSI يتراجع لكن يبقى فوق 40. حجم تداول يتراجع.",
        rules: "قاعدة صارمة: لا تتداخل مع منطقة موجة 1 (إلا في الأسواق الآجلة). شكل مثلث = إشارة امتداد الموجة 5.",
        signal: "فرصة دخول أخيرة قبل موجة 5.",
      },
      "5": {
        title: "موجة 5 -- الختام المضلل",
        chars: "أضعف من موجة 3. تباعد سلبي واضح في RSI وMACD (السعر يرتفع لكن المؤشرات تتراجع). حجم تداول أقل من موجة 3. الأخبار ممتازة والجمهور في ذروة التفاؤل.",
        rules: "تساوي موجة 1 عادة، أو 61.8%، أو 161.8% منها. قد تكون مقتطعة (أقل من قمة 3) في أسواق ضعيفة.",
        signal: "⚠️ تحذير: نهاية الدورة الصاعدة وبداية تصحيح ABC.",
      },
      "A": {
        title: "موجة A -- بداية التصحيح",
        chars: "هبوط حاد -- كثيرون يظنونه تصحيحاً مؤقتاً فقط. حجم تداول متوسط إلى مرتفع. تتكون من 5 موجات فرعية في الـ zigzag أو 3 في الـ flat.",
        rules: "في zigzag: 5 موجات فرعية. في flat: 3 موجات فرعية. يصعب تمييزها مبكراً.",
        signal: "⚠️ ابدأ بتقليص المراكز الشرائية.",
      },
      "B": {
        title: "موجة B -- الارتداد الخادع",
        chars: "ارتداد صاعد وهمي -- أخطر موجة للمتداولين. يوهم بعودة الاتجاه الصاعد. حجم تداول منخفض جداً = إشارة خطر واضحة. RSI لا يصل لمستويات موجة 5.",
        rules: "لا يتجاوز بداية موجة A عادة (إلا في expanded flat). شكله غير منتظم وصعب التحديد.",
        signal: "🚫 فخ للمتداولين -- لا تشتري على ارتفاع B.",
      },
      "C": {
        title: "موجة C -- الهبوط الحقيقي",
        chars: "أقوى وأعنف من موجة A. يتجاوز قاع A دائماً. حجم تداول مرتفع. يتكون من 5 موجات فرعية. المتداولون الذين اشتروا في B يتكبدون خسائر كبيرة.",
        rules: "يساوي A عادة (100%) أو 161.8% منه. نهايته = بداية دورة صاعدة جديدة.",
        signal: "فرصة شراء قوية عند اكتمال C.",
      },
    };

    // ═══ تصنيف مبني على قواعد إليوت ═══
    const imp = validateImpulse(recent);
    const cor = validateCorrective(recent);
    let ruleStatus = "";

    if (imp.valid) {
      const P = imp.points, S = imp.sizes;
      waveDir = imp.up ? "صاعد" : "هابط";
      ruleStatus = "✓ القواعد الثلاث مستوفاة";

      const beyond5 = imp.up ? curPrice > P.p5.price : curPrice < P.p5.price;
      const retrFrom5 = Math.abs(P.p5.price - curPrice) / (Math.abs(P.p5.price - P.p4.price) || 1);

      if (beyond5) {
        waveNum = "5"; waveType = imp.extended ? "امتداد بعد 3 ممتدة" : "طبيعية";
        waveStart = P.p4.price;
        waveTarget = fib(P.p4.price, P.p5.price, imp.w5Ratio >= 1.5 ? 1.618 : 1.0);
        fibRatio = imp.w5Ratio >= 1.5 ? "161.8%" : "100%";
        waveNote = `الموجة 5 مستمرة -- نسبتها ${imp.w5Ratio}× من الموجة 1 · الموجة 3 = ${imp.w3Ratio}×`;
      } else if (retrFrom5 <= 0.382) {
        waveNum = "5"; waveType = "قرب الاكتمال";
        waveStart = P.p4.price;
        waveTarget = P.p5.price;
        fibRatio = "قمة 5";
        waveNote = `الموجة 5 قرب اكتمالها عند ${P.p5.price.toFixed(2)} -- تصحيح ABC مرجّح بعدها`;
      } else {
        waveNum = "A"; waveType = "بداية تصحيح";
        waveDir = imp.up ? "هابط" : "صاعد";
        waveStart = P.p5.price;
        waveTarget = fib(P.p5.price, P.p2.price, 0.382);
        fibRatio = "38.2%";
        waveNote = `اكتمل النمط الدافع 1-5 -- بدأ تصحيح ABC من ${P.p5.price.toFixed(2)}`;
      }

    } else if (cor.valid) {
      const P = cor.points;
      waveDir = cor.down ? "هابط" : "صاعد";
      ruleStatus = `نمط تصحيحي ${cor.down ? "هابط" : "صاعد (ارتداد)"} · ${cor.pattern}`;
      const beyondC = cor.down ? curPrice < P.pC.price : curPrice > P.pC.price;
      if (beyondC) {
        waveNum = "C"; waveType = cor.cRatio >= 1.5 ? "ممتدة" : "طبيعية";
        waveStart = P.pB.price;
        // ✨ الهدف = امتداد من B بمقدار A (في اتجاه C الصحيح)
        var _ext = cor.cRatio >= 1.5 ? 1.618 : 1.0;
        // ✨ الاتجاه من الموجة C نفسها (B → C) لا من A
        var _cDown = P.pC.price < P.pB.price;
        waveTarget = +(P.pB.price + (_cDown ? -1 : 1) * cor.wA * _ext).toFixed(2);
        waveDir = _cDown ? "هابط" : "صاعد";
        fibRatio = cor.cRatio >= 1.5 ? "161.8%" : "100%";
        waveNote = `الموجة C مستمرة -- نسبتها ${cor.cRatio}× من A · نمط ${cor.pattern}`;
      } else {
        waveNum = "C"; waveType = "قرب الاكتمال";
        waveStart = P.pB.price;
        waveTarget = P.pC.price;
        fibRatio = "قاع C";
        waveNote = `الموجة C قرب اكتمالها -- B صحّحت ${cor.bRetr}% من A · نمط ${cor.pattern}`;
      }

    } else {
      waveNum = "?"; waveType = "غير محدد";
      waveDir = overallUp ? "صاعد" : "هابط";
      ruleStatus = imp.reason || cor.reason || "لا نمط واضح";
      waveStart = lastPivot.price;
      waveTarget = 0;
      fibRatio = "--";
      waveNote = `لا يمكن تصنيف الموجة: ${ruleStatus}`;
    }

    // ═══ إضافة الخصائص الأكاديمية ═══
    const props = WAVE_PROPS[waveNum];
    waveProps = props ? {
      title: props.title,
      chars: props.chars,
      rules: props.rules,
      signal: props.signal,
    } : null;

    const support    = lows.length >= 2 ? Math.min(lows[lows.length-1].price, lows[lows.length-2].price) : (lows[0]?.price || curPrice * 0.95);
    const resistance = highs.length >= 2 ? Math.max(highs[highs.length-1].price, highs[highs.length-2].price) : (highs[0]?.price || curPrice * 1.05);
    const invalidation = overallUp
      ? parseFloat((lows[lows.length-1]?.price * 0.995 || curPrice * 0.95).toFixed(2))
      : parseFloat((highs[highs.length-1]?.price * 1.005 || curPrice * 1.05).toFixed(2));

    // ✨ الهدف يجب أن يتوافق مع اتجاه الموجة -- وإلا فالنمط غير موثوق
    if (waveTarget > 0) {
      var _wrongDir = (waveDir === "هابط" && waveTarget > curPrice) ||
                      (waveDir === "صاعد" && waveTarget < curPrice);
      var _far = waveTarget > curPrice * 1.6 || waveTarget < curPrice * 0.4;
      if (_wrongDir || _far) {
        waveTarget = 0;
        fibRatio = "--";
        waveNote += ` | ⚠ الهدف غير متوافق مع اتجاه الموجة -- النمط يحتاج محاور أوضح`;
      } else {
        waveNote += ` | هدف فيبوناتشي: ${waveTarget} ر.س`;
      }
    }

    const safeSupport = support < curPrice * 0.5 || support > curPrice ? parseFloat((curPrice * 0.93).toFixed(2)) : parseFloat(support.toFixed(2));
    const safeResistance = resistance > curPrice * 1.5 || resistance < curPrice ? parseFloat((curPrice * 1.07).toFixed(2)) : parseFloat(resistance.toFixed(2));

    return {
      wave: waveNum, dir: waveDir, type: waveType,
      start: waveStart, target: waveTarget, fib: fibRatio,
      note: waveNote, props: waveProps,
      ruleStatus: ruleStatus,
      support: safeSupport, resistance: safeResistance,
      invalidation: invalidation > curPrice * 1.5 || invalidation < curPrice * 0.5
        ? parseFloat((waveDir === "صاعد" ? curPrice * 0.93 : curPrice * 1.07).toFixed(2))
        : invalidation,
      pivotCount: pivots.length,
    };
  };


  // ═══ الدالة الرئيسية ═══
  const analyze = async () => {
    setEwLoading(true);
    setEwErr(null);
    try {
      // جلب البيانات
      const [dRes, hRes] = await Promise.all([
fetch(`/api/sahmkdata?endpoint=ohlcv&sym=${stk.sym}&period=5Y`),

        fetch(`/api/sahmkdata?endpoint=intraday&sym=${stk.sym}&interval=60m`),
      ]);
      const [dJson, hJson] = await Promise.all([dRes.json(), hRes.json()]);

      const parseBar = b => ({
        d: b.date || "", o: +b.open, h: +b.high, l: +b.low, c: +b.close, v: +(b.volume || 0),
      });

      const daily  = (dJson?.data || []).filter(b => b.close > 0).map(parseBar);
      const hourly = (hJson?.data || []).filter(b => b.close > 0).map(parseBar).slice(-48);
      const weekly = buildWeekly(daily);

      if (daily.length < 20) { setEwErr("بيانات غير كافية -- تحتاج 20+ شمعة يومية"); setEwLoading(false); return; }

      // ZigZag لكل إطار
      // ✨ عتبة أدق للأسبوعي -- 4% تعطي محاور قليلة جداً (4 فقط)
      var wPivots = zigzag(weekly, 0.025);
      if (wPivots.length < 6) wPivots = zigzag(weekly, 0.015);
      const dPivots = zigzag(daily,  0.025); // 2.5% لليومي
      const hPivots = zigzag(hourly, 0.015); // 1.5% للساعي

      // تحليل كل إطار
      const primary      = analyzeWaves(wPivots, weekly, "أسبوعي");
      const intermediate = analyzeWaves(dPivots, daily,  "يومي");
      const minor        = analyzeWaves(hPivots.length >= 4 ? hPivots : dPivots.slice(-6), hourly.length > 0 ? hourly : daily.slice(-20), "ساعي");

      const curPrice = stk.p || daily[daily.length - 1]?.c || 0;

      // الهدف التالي
      const bullTarget = primary?.target > curPrice ? primary.target : (intermediate?.target > curPrice ? intermediate.target : parseFloat((curPrice * 1.05).toFixed(2)));
      const bearTarget = primary?.support || parseFloat((curPrice * 0.95).toFixed(2));

      // ✨ الثقة من صحة النمط لا من عدد المحاور
      const _ok = (w) => w && w.wave !== "?" && (w.ruleStatus || "").indexOf("✓") === 0;
      const confidence = Math.min(92, Math.max(15,
        (_ok(primary)      ? 40 : primary?.wave      !== "?" ? 20 : 5) +
        (_ok(intermediate) ? 30 : intermediate?.wave !== "?" ? 15 : 5) +
        (_ok(minor)        ? 15 : minor?.wave        !== "?" ? 8  : 3) +
        (wPivots.length >= 6 ? 7 : 0)
      ));

      // الملخص
      const dir = primary?.dir || "محايد";
      const summary =
        `السهم في موجة ${primary?.wave || "؟"} ${dir} على الإطار الأسبوعي` +
        (primary?.type ? ` من نوع ${primary.type}` : "") + ". " +
        (intermediate ? `على اليومي الموجة ${intermediate.wave} ${intermediate.dir}` + (intermediate.target ? ` بهدف ${intermediate.target.toFixed(2)} ر.س` : "") + ". " : "") +
        (minor ? `الساعي يُظهر موجة ${minor.wave} ${minor.dir}` + (minor.target ? ` بهدف ${minor.target.toFixed(2)}` : "") + ". " : "") +
        (primary?.target ? `الهدف الرئيسي ${primary.target.toFixed(2)} ر.س` : "") +
        (primary?.invalidation ? ` ونقطة الإبطال ${primary.invalidation} ر.س.` : ".");

      // تحذير
      const warning =
        (primary?.wave === "5" ? "⚠️ الموجة الخامسة -- قد تنتهي قريباً ويبدأ تصحيح. " : "") +
        (primary?.wave === "4" ? "🔄 تصحيح الموجة 4 -- لا تشتري حتى تكتمل وتبدأ الموجة 5. " : "") +
        (intermediate?.wave === "C" ? "⚠️ موجة C -- ضغط بيعي قد يستمر. " : "") +
        (confidence < 60 ? "📊 بيانات ZigZag محدودة -- التحليل تقريبي." : "");

      setEwData({
        primary, intermediate, minor,
        structure: dir === "صاعد" ? "نمط دافع (1-2-3-4-5)" : dir === "هابط" ? "نمط تصحيحي (A-B-C)" : "نمط غير محدد",
        currentPos: `السعر الحالي ${curPrice.toFixed(2)} ر.س -- ${primary?.wave !== "?" ? `ضمن الموجة ${primary?.wave} ${dir}` : "الموجة غير محددة"}`,
        nextTarget: { bull: bullTarget, bear: bearTarget, fib: primary?.fib || "61.8%" },
        invalidation: primary?.invalidation || 0,
        support:      primary?.support      || 0,
        resistance:   primary?.resistance   || 0,
        confidence,
        warning:  warning  || "لا تحذيرات خاصة حالياً",
        summary,
        dataInfo: {
          weeklyBars:  weekly.length,
          dailyBars:   daily.length,
          hourlyBars:  hourly.length,
          wPivots:     wPivots.length,
          dPivots:     dPivots.length,
          hPivots:     hPivots.length,
        },
      });
      setEwFetched(new Date().toLocaleTimeString("ar-SA"));
    } catch(e) {
      setEwErr("خطأ في التحليل: " + e.message);
    }
    setEwLoading(false);
  };

  const waveColor = w => !w ? C.smoke : w.dir === "صاعد" ? C.mint : w.dir === "هابط" ? C.coral : C.amber;

  return (
    <SectionCard title="موجات إيليوت -- تحليل خوارزمي" accent={C.plasma}
      badge={ewFetched ? { text: "✓ " + ewFetched, color: C.mint } : { text: "ZigZag + فيبوناتشي", color: C.plasma }}>
      <div style={{ padding: "10px 16px" }}>

        {!ewData && !ewLoading && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 11, color: C.smoke, marginBottom: 6, lineHeight: 1.8 }}>
              خوارزمية ZigZag تحلل القمم والقيعان الحقيقية<br/>
              <span style={{ color: C.electric }}>أسبوعي (52 أسبوع)</span> •{" "}
              <span style={{ color: C.mint }}>يومي (90 يوم)</span> •{" "}
              <span style={{ color: C.gold }}>ساعي (48 ساعة)</span><br/>
              <span style={{ fontSize: 9, color: C.ash }}>بدون AI -- خوارزمية رياضية بحتة</span>
            </div>
            <button onClick={analyze} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: `linear-gradient(135deg,${C.plasma}33,${C.electric}22)`,
              border: `1px solid ${C.plasma}66`,
              borderRadius: 12, padding: "12px 24px",
              color: C.plasma, fontSize: 12, fontWeight: 800,
              cursor: "pointer", fontFamily: "Cairo,sans-serif",
            }}>
              🌊 تحليل موجات إيليوت
            </button>
          </div>
        )}

        {ewLoading && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.plasma} strokeWidth="2"
              style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 10px" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <div style={{ fontSize: 11, color: C.plasma, fontWeight: 700 }}>يحلل القمم والقيعان...</div>
            <div style={{ fontSize: 10, color: C.smoke, marginTop: 4 }}>ZigZag على 3 إطارات زمنية</div>
          </div>
        )}

        {ewErr && (
          <div style={{ padding: "10px", background: C.coral+"15", borderRadius: 8, fontSize: 11, color: C.coral, marginBottom: 10 }}>
            {ewErr}
            <button onClick={analyze} style={{ display: "block", marginTop: 8, background: "transparent", border: `1px solid ${C.coral}44`, borderRadius: 6, padding: "6px 14px", color: C.coral, fontSize: 10, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {ewData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* الإطارات الثلاثة */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {[
                { label: "أسبوعي", sub: "Primary",  data: ewData.primary },
                { label: "يومي",   sub: "Interm.",  data: ewData.intermediate },
                { label: "ساعي",   sub: "Minor",    data: ewData.minor },
              ].map((tf, i) => {
                const col = waveColor(tf.data);
                return (
                  <div key={i} style={{
                    background: col+"12", borderRadius: 10,
                    padding: "10px 6px", border: `1px solid ${col}33`, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 8, color: C.smoke, marginBottom: 2 }}>{tf.label}</div>
                    <div style={{ fontSize: 8, color: col, opacity: 0.7, marginBottom: 4 }}>{tf.sub}</div>
                    <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 22, fontWeight: 900, color: col, lineHeight: 1 }}>
                      {tf.data?.wave || "?"}
                    </div>
                    <div style={{ fontSize: 9, color: col, marginTop: 4, fontWeight: 700 }}>{tf.data?.dir || "--"}</div>
                    <div style={{ fontSize: 8, color: C.smoke, marginTop: 2 }}>{tf.data?.type || ""}</div>
                    {tf.data?.fib && <div style={{ fontSize: 8, color: C.gold, marginTop: 3, fontWeight: 700 }}>{tf.data.fib}</div>}
                  </div>
                );
              })}
            </div>

            {/* الهيكل */}
            {ewData.structure && (
              <div style={{ background: C.plasma+"10", border: `1px solid ${C.plasma}33`, borderRadius: 8, padding: "8px 12px", fontSize: 10, color: C.plasma, fontWeight: 700, textAlign: "center" }}>
                🔷 {ewData.structure}
              </div>
            )}

            {/* الموقع الحالي */}
            <div style={{ background: C.layer3, borderRadius: 8, padding: "8px 12px" }}>
              <div style={{ fontSize: 9, color: C.smoke, marginBottom: 4, fontWeight: 700 }}>📍 الموقع الحالي</div>
              <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.7 }}>{ewData.currentPos}</div>
            </div>

            {/* الأهداف */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
              {[
                { l: "هدف صاعد", v: ewData.nextTarget?.bull, c: C.mint },
                { l: "هدف هابط", v: ewData.nextTarget?.bear, c: C.coral },
                { l: "دعم",      v: ewData.support,           c: C.electric },
                { l: "مقاومة",   v: ewData.resistance,        c: C.amber },
              ].map((item, i) => (
                <div key={i} style={{ background: item.c+"10", borderRadius: 8, padding: "8px 4px", textAlign: "center", border: `1px solid ${item.c}25` }}>
                  <div style={{ fontSize: 8, color: C.smoke, marginBottom: 3 }}>{item.l}</div>
                  <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 900, color: item.c }}>
                    {item.v ? parseFloat(item.v).toFixed(2) : "--"}
                  </div>
                </div>
              ))}
            </div>

            {/* نقطة الإبطال */}
            {ewData.invalidation > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.coral+"08", border: `1px solid ${C.coral}22`, borderRadius: 8, padding: "8px 12px" }}>
                <span style={{ fontSize: 10, color: C.smoke }}>🚫 نقطة إبطال السيناريو</span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 12, fontWeight: 900, color: C.coral }}>
                  {parseFloat(ewData.invalidation).toFixed(2)} ر.س
                </span>
              </div>
            )}

            {/* الثقة */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.smoke, marginBottom: 4 }}>
                <span>مستوى الثقة بالتحليل</span>
                <span style={{ color: ewData.confidence >= 70 ? C.mint : C.amber, fontWeight: 700 }}>{ewData.confidence}%</span>
              </div>
              <div style={{ height: 4, background: C.layer3, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: ewData.confidence+"%", background: ewData.confidence >= 70 ? C.mint : C.amber, borderRadius: 2 }}/>
              </div>
            </div>
            {/* تفاصيل كل موجة + الخصائص الأكاديمية */}
            {[
              { label: "🗓 أسبوعي -- Primary", data: ewData.primary },
              { label: "📅 يومي -- Intermediate", data: ewData.intermediate },
              { label: "⏰ ساعي -- Minor", data: ewData.minor },
            ].map((tf, i) => {
              if (!tf.data?.note) return null;
              const col = waveColor(tf.data);
              return (
                <div key={i} style={{ border: `1px solid ${col}33`, borderRadius: 10, overflow: "hidden" }}>
                  <div style={{
                    background: col+"15", padding: "10px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontSize: 9, color: col, fontWeight: 800 }}>
                        {tf.label} -- موجة {tf.data.wave} {tf.data.type}
                      </div>
                      {tf.data.target > 0 && (
                        <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>
                          هدف: {parseFloat(tf.data.target).toFixed(2)} ر.س {tf.data.fib ? `(${tf.data.fib})` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 10, color: C.mist, lineHeight: 1.8, background: C.layer3, borderRadius: 6, padding: "6px 10px" }}>
                      {tf.data.note}
                    </div>
                    {tf.data.ruleStatus && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, lineHeight: 1.7,
                        color: tf.data.ruleStatus.indexOf("✓") === 0 ? C.mint : C.amber,
                        background: (tf.data.ruleStatus.indexOf("✓") === 0 ? C.mint : C.amber) + "12",
                        border: `1px solid ${(tf.data.ruleStatus.indexOf("✓") === 0 ? C.mint : C.amber)}25`,
                        borderRadius: 6, padding: "5px 9px",
                      }}>
                        {tf.data.ruleStatus.indexOf("✓") === 0 ? tf.data.ruleStatus : "⚠ " + tf.data.ruleStatus}
                      </div>
                    )}
                    {tf.data.props && (
                      <div style={{ background: col+"10", border: `1px solid ${col}22`, borderRadius: 8, padding: "8px 10px" }}>
                        <div style={{ fontSize: 10, color: col, fontWeight: 800, marginBottom: 6 }}>
                          📚 {tf.data.props.title}
                        </div>
                        <div style={{ fontSize: 9, color: C.mist, lineHeight: 1.8, marginBottom: 6 }}>
                          {tf.data.props.chars}
                        </div>
                        <div style={{ height: 1, background: col+"22", margin: "6px 0" }}/>
                        <div style={{ fontSize: 9, color: C.smoke, lineHeight: 1.7, marginBottom: 4 }}>
                          <span style={{ color: col, fontWeight: 700 }}>📏 القواعد: </span>
                          {tf.data.props.rules}
                        </div>
                        <div style={{ fontSize: 9, color: C.amber, lineHeight: 1.7, fontWeight: 700, background: C.amber+"10", borderRadius: 6, padding: "5px 8px", marginTop: 4 }}>
                          {tf.data.props.signal}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}


            {/* تحذير */}
            {ewData.warning && ewData.warning !== "لا تحذيرات خاصة حالياً" && (
              <div style={{ background: C.amber+"10", border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 9, color: C.amber, fontWeight: 800, marginBottom: 4 }}>⚠️ تحذير / سيناريو بديل</div>
                <div style={{ fontSize: 10, color: C.mist, lineHeight: 1.8 }}>{ewData.warning}</div>
              </div>
            )} 

            {/* الملخص */}
            <div style={{ background: C.layer3, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 9, color: C.electric, fontWeight: 800, marginBottom: 6 }}>📊 الملخص التحليلي</div>
              <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.8 }}>{ewData.summary}</div>
            </div>

            {/* معلومات البيانات */}
            {ewData.dataInfo && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { l: "أسبوعي", v: ewData.dataInfo.weeklyBars + " شمعة / " + ewData.dataInfo.wPivots + " محور", c: C.electric },
                  { l: "يومي",   v: ewData.dataInfo.dailyBars  + " شمعة / " + ewData.dataInfo.dPivots + " محور", c: C.mint },
                  { l: "ساعي",   v: ewData.dataInfo.hourlyBars + " شمعة / " + ewData.dataInfo.hPivots + " محور", c: C.gold },
                ].map((item, i) => (
                  <div key={i} style={{ flex: 1, background: item.c+"08", border: `1px solid ${item.c}22`, borderRadius: 6, padding: "5px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: item.c, fontWeight: 700 }}>{item.l}</div>
                    <div style={{ fontSize: 8, color: C.smoke, marginTop: 2 }}>{item.v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* زر التحديث */}
            <button onClick={analyze} disabled={ewLoading} style={{
              width: "100%", background: C.plasma+"15", border: `1px solid ${C.plasma}44`,
              borderRadius: 8, padding: "8px", color: C.plasma, fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "Cairo,sans-serif",
            }}>
              🔄 تحديث التحليل
            </button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export { TechLoader, SDTechnical, ElliottWaveAI };
