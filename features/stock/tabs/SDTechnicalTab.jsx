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
                const opacity = aboveMA ? 1 : 0.18;
                const borderBottom = aboveMA ? `2px solid ${m.c}` : "none";
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
  const [ewData, setEwData] = useState(null);
  const [ewLoading, setEwLoading] = useState(false);
  const [ewErr, setEwErr] = useState(null);
  const [ewFetched, setEwFetched] = useState(null);

  const analyzeEW = async () => {
    setEwLoading(true);
    setEwErr(null);
    try {
      const monthly = hist.filter((_, i) => i % 20 === 0).slice(-12).map(c => `${c.d || ""}:${c.c}`).join(", ");
      const weekly = hist.filter((_, i) => i % 5 === 0).slice(-24).map(c => `${c.d || ""}:${c.c}`).join(", ");
      const daily = hist.slice(-30).map(c => `${c.d || ""}:O${c.o || c.c} H${c.h || c.c} L${c.l || c.c} C${c.c}`).join(" | ");

      const prompt = `أنت أفضل محلل موجات إيليوت في العالم. حلّل سهم ${stk.name} (${stk.sym}) بناءً على البيانات:

السعر الحالي: ${stk.p} ر.س
شمعات شهرية (آخر 12 شهر): ${monthly}
شمعات أسبوعية (آخر 24 أسبوع): ${weekly}
شمعات يومية (آخر 30 يوم): ${daily}

أجب بـ JSON فقط:
{
  "primary":{"wave":"3","dir":"صاعد","type":"ممتدة","note":"..."},
  "intermediate":{"wave":"iii","dir":"صاعد","type":"ممتدة","note":"..."},
  "minor":{"wave":"3","dir":"صاعد","type":"طبيعية","note":"..."},
  "currentPos":"...",
  "nextTarget":{"bull":0,"bear":0,"fib":"61.8%"},
  "support":0,
  "resistance":0,
  "warning":"...",
  "summary":"..."
}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const d = await res.json();
      const txt = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) {
        setEwData(JSON.parse(m[0]));
        setEwFetched(new Date().toLocaleString("ar-SA"));
      } else setEwErr("لم يتمكن AI من تحليل الموجات");
    } catch (e) {
      setEwErr("خطأ: " + e.message);
    }
    setEwLoading(false);
  };

  const waveColor = w => {
    if (!w) return C.smoke;
    if (w.dir === "صاعد") return C.mint;
    if (w.dir === "هابط") return C.coral;
    return C.amber;
  };

  return (
    <SectionCard title="موجات إيليوت -- تحليل AI" accent={C.plasma}
      badge={ewFetched ? { text: "AI حي", color: C.mint } : { text: "محلل متقدم", color: C.plasma }}>
      <div style={{ padding: "10px 16px" }}>
        {!ewData && !ewLoading && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 11, color: C.smoke, marginBottom: 12, lineHeight: 1.6 }}>
              تحليل AI احترافي للموجات الرئيسية والفرعية<br/>
              على الإطارات الشهري والأسبوعي واليومي
            </div>
            <button onClick={analyzeEW} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: `linear-gradient(135deg,${C.plasma}33,${C.electric}22)`,
              border: `1px solid ${C.plasma}66`,
              borderRadius: 12, padding: "12px 24px",
              color: C.plasma, fontSize: 12, fontWeight: 800,
              cursor: "pointer", fontFamily: "Cairo,sans-serif",
              boxShadow: `0 0 20px ${C.plasma}22`,
            }}>تحليل موجات إيليوت بالذكاء الاصطناعي</button>
          </div>
        )}
        {ewLoading && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.plasma} strokeWidth="2"
              style={{ animation: "spin 1s linear infinite", display: "block", margin: "0 auto 10px" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <div style={{ fontSize: 11, color: C.smoke }}>يحلل AI الموجات على 3 إطارات زمنية...</div>
          </div>
        )}
        {ewErr && (
          <div style={{ padding: "10px", background: C.coral + "15", borderRadius: 8, fontSize: 11, color: C.coral }}>
            {ewErr}
          </div>
        )}
        {ewData && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
              {[
                { label: "شهري (Primary)", data: ewData.primary },
                { label: "أسبوعي (Interm.)", data: ewData.intermediate },
                { label: "يومي (Minor)", data: ewData.minor },
              ].map((tf, i) => {
                const col = waveColor(tf.data);
                return (
                  <div key={i} style={{
                    background: col + "12", borderRadius: 10,
                    padding: "8px 6px", border: `1px solid ${col}33`, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 8, color: C.smoke, marginBottom: 4 }}>{tf.label}</div>
                    <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 18, fontWeight: 900, color: col, lineHeight: 1 }}>
                      {tf.data?.wave || "?"}
                    </div>
                    <div style={{ fontSize: 9, color: col, marginTop: 3, fontWeight: 700 }}>{tf.data?.dir || ""}</div>
                  </div>
                );
              })}
            </div>
            {ewData.summary && (
              <div style={{ background: C.layer3, borderRadius: 8, padding: "8px 10px", fontSize: 10, color: C.mist, lineHeight: 1.7 }}>
                {ewData.summary}
              </div>
            )}
            <button onClick={analyzeEW} disabled={ewLoading} style={{
              marginTop: 8, width: "100%",
              background: C.plasma + "15", border: `1px solid ${C.plasma}44`,
              borderRadius: 7, padding: "6px",
              color: C.plasma, fontSize: 10, fontWeight: 700,
              cursor: "pointer", fontFamily: "Cairo,sans-serif",
            }}>تحديث</button>
          </>
        )}
      </div>
    </SectionCard>
  );
}

export { TechLoader, SDTechnical, ElliottWaveAI };
