'use client';
/**
 * @module features/stock/tabs/SDTechnicalTab
 * @description تبويب التحليل التقني للسهم
 */
import { useState, useRef, useMemo, useEffect } from 'react';
import { C, SectionCard, SkeletonCard, Tag } from './StockDetailShared';
import { generateOHLCBars } from '../../../services/api/stocksApi';
import { calcEMA } from '../../../engines/analysisEngine';

function TechLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(false); const t=setTimeout(()=>setShow(true),180); return ()=>clearTimeout(t); }, [stk.sym]);
  if (!show) return <div style={{ borderRadius:16, overflow:"hidden" }}>{[7,6,9].map((r,i)=><SkeletonCard key={i} rows={r}/>)}</div>;
  return <SDTechnical stk={stk}/>;
}

// ─── SDTechnical ─────────────────────────────────────────────────
function SDTechnical({ stk }) {
  const p = stk.p;
  const hist = stk.priceHistory || [];

  //
  const D = useMemo(() => {
    const closes = hist.length >= 20 ? hist.map(h=>h.c) : null;
    const vols   = hist.length >= 20 ? hist.map(h=>h.v) : null;

    //
    const ichimoku = hist.length >= 52 ? (()=>{
      const highs2=hist.map(h=>h.h||h.c), lows2=hist.map(h=>h.l||h.c);
      const hP=(arr,n)=>Math.max(...arr.slice(-n));
      const lP=(arr,n)=>Math.min(...arr.slice(-n));
      const tenkan  = parseFloat(((hP(highs2,9)+lP(lows2,9))/2).toFixed(2));
      const kijun   = parseFloat(((hP(highs2,26)+lP(lows2,26))/2).toFixed(2));
      const senkouA = parseFloat(((tenkan+kijun)/2).toFixed(2));
      const senkouB = parseFloat(((hP(highs2,52)+lP(lows2,52))/2).toFixed(2));
      const aboveCloud = p>Math.max(senkouA,senkouB);
      const belowCloud = p<Math.min(senkouA,senkouB);
      const signal = aboveCloud?"فوق السحابة":belowCloud?"تحت السحابة":"داخل السحابة";
      return {tenkan,kijun,senkouA,senkouB,signal,
        col:aboveCloud?C.mint:belowCloud?C.coral:C.amber,
        aboveCloud, belowCloud,
        tkCross:tenkan>kijun?"صاعد":"هابط"};
    })() : null;

    //
    const calcRSI = (prices, period=14) => {
      if (!prices || prices.length < period+1) return 55;
      let gains=0, losses=0;
      for(let i=1;i<=period;i++){ const d=prices[i]-prices[i-1]; d>0?gains+=d:losses+=Math.abs(d); }
      const rs = (gains/period) / (losses/period || 0.001);
      return parseFloat((100 - 100/(1+rs)).toFixed(2));
    };

    //
    const calcEMA = (prices, period) => {
      if (!prices || prices.length < period) return p;
      const k = 2/(period+1);
      let ema = prices.slice(0,period).reduce((a,b)=>a+b,0)/period;
      for(let i=period;i<prices.length;i++) ema = prices[i]*k + ema*(1-k);
      return parseFloat(ema.toFixed(2));
    };

    //
    const calcSMA = (prices, period) => {
      if (!prices || prices.length < period) return p;
      return parseFloat((prices.slice(-period).reduce((a,b)=>a+b,0)/period).toFixed(2));
    };

    //
    const calcATR = (prices, period=14) => {
      if (!prices || prices.length < 2) return parseFloat((p*0.012).toFixed(2));
      const trs = prices.slice(1).map((c,i)=>Math.abs(c-prices[i]));
      return parseFloat((trs.slice(-period).reduce((a,b)=>a+b,0)/period).toFixed(2));
    };

    // Bollinger Bands
    const calcBB = (prices, period=20, mult=2) => {
      if (!prices || prices.length < period) return { upper:p*1.04, mid:p, lower:p*0.96, bPct:50 };
      const sma = calcSMA(prices, period);
      const std = Math.sqrt(prices.slice(-period).reduce((a,b)=>a+(b-sma)**2,0)/period);
      const upper = parseFloat((sma+mult*std).toFixed(2));
      const lower = parseFloat((sma-mult*std).toFixed(2));
      const bPct  = parseFloat(((p-lower)/(upper-lower)*100).toFixed(1));
      return { upper, mid:parseFloat(sma.toFixed(2)), lower, bPct };
    };

    //
    const calcOBV = (prices, vols2) => {
      if (!prices || !vols2 || prices.length < 2) return 0;
      let obv=0;
      for(let i=1;i<prices.length;i++) prices[i]>prices[i-1]?obv+=vols2[i]:prices[i]<prices[i-1]?obv-=vols2[i]:null;
      return obv;
    };

    //
    const calcMACD = (prices) => {
      if (!prices || prices.length < 35) return {macd:0.12,signal:0.08,hist:0.04};
      const k12=2/13, k26=2/27, k9=2/10;
      let ema12=prices.slice(0,12).reduce((a,b)=>a+b,0)/12;
      let ema26=prices.slice(0,26).reduce((a,b)=>a+b,0)/26;
      for(let i=12;i<26;i++) ema12=prices[i]*k12+ema12*(1-k12);
      //
      const macdSeries=[];
      let e12=ema12, e26=ema26;
      for(let i=26;i<prices.length;i++){
        e12=prices[i]*k12+e12*(1-k12);
        e26=prices[i]*k26+e26*(1-k26);
        macdSeries.push(parseFloat((e12-e26).toFixed(4)));
      }
      const macdVal=macdSeries[macdSeries.length-1];
      //
      let signal=macdSeries.slice(0,9).reduce((a,b)=>a+b,0)/9;
      for(let i=9;i<macdSeries.length;i++) signal=macdSeries[i]*k9+signal*(1-k9);
      signal=parseFloat(signal.toFixed(4));
      const hist=parseFloat((macdVal-signal).toFixed(4));
      return {macd:macdVal, signal, hist};
    };

    const rsi14 = closes ? calcRSI(closes,14) : 58.4;
    const rsi7  = closes ? calcRSI(closes,7)  : 62.1;
    //
    const rsiDivergence = closes && closes.length >= 20 ? (()=>{
      const seg1 = closes.slice(-20, -10);
      const seg2 = closes.slice(-10);
      const rsi1 = calcRSI(seg1, Math.min(9,seg1.length-1));
      const rsi2 = calcRSI(seg2, Math.min(9,seg2.length-1));
      const p1   = seg1[seg1.length-1], p2 = seg2[seg2.length-1];

      //
      if(p2 > p1*1.005 && rsi2 < rsi1 - 3)
        return {type:"سلبي عادي", color:C.coral, note:"السعر ↑ RSI ↓ — ضعف الاتجاه الصاعد"};
      //
      if(p2 < p1*0.995 && rsi2 > rsi1 + 3)
        return {type:"إيجابي عادي", color:C.mint, note:"السعر ↓ RSI ↑ — ضعف الاتجاه الهابط"};
      //
      if(p2 > p1 && rsi2 < rsi1 && rsi2 > 40)
        return {type:"خفي صاعد", color:C.teal, note:"تباعد خفي — استمرار الصعود محتمل"};
      //
      if(p2 < p1 && rsi2 > rsi1 && rsi2 < 60)
        return {type:"خفي هابط", color:C.amber, note:"تباعد خفي — استمرار الهبوط محتمل"};
      return {type:"لا تباعد", color:C.smoke, note:"لا تباعد ظاهر حالياً"};
    })() : {type:"—", color:C.smoke, note:"بيانات غير كافية"};
    const ma5s  = closes ? calcSMA(closes,5)   : parseFloat((p*0.998).toFixed(2));
    const ma10s = closes ? calcSMA(closes,10)  : parseFloat((p*0.993).toFixed(2));
    const ma20s = closes ? calcSMA(closes,20)  : parseFloat((p*0.986).toFixed(2));
    const ma50s = closes ? calcSMA(closes,50)  : parseFloat((p*0.975).toFixed(2));
    const ma100s= closes ? calcSMA(closes,Math.min(closes.length,100)) : parseFloat((p*0.962).toFixed(2));
    const ma200s= closes ? calcSMA(closes,Math.min(closes.length,200)) : parseFloat((p*0.945).toFixed(2));
    const ma5e  = closes ? calcEMA(closes,5)   : parseFloat((p*0.999).toFixed(2));
    const ma10e = closes ? calcEMA(closes,10)  : parseFloat((p*0.995).toFixed(2));
    const ma20e = closes ? calcEMA(closes,20)  : parseFloat((p*0.989).toFixed(2));
    const ma50e = closes ? calcEMA(closes,50)  : parseFloat((p*0.978).toFixed(2));
    const ma100e= closes ? calcEMA(closes,Math.min(closes.length,100)) : parseFloat((p*0.965).toFixed(2));
    const ma200e= closes ? calcEMA(closes,Math.min(closes.length,200)) : parseFloat((p*0.948).toFixed(2));
    const atr14 = closes ? calcATR(closes,14)  : parseFloat((p*0.012).toFixed(2));
    const bb    = closes ? calcBB(closes)       : { upper:parseFloat((p*1.04).toFixed(2)), mid:parseFloat((p*1.0).toFixed(2)), lower:parseFloat((p*0.96).toFixed(2)), bPct:50 };
    const macdR = closes ? calcMACD(closes)     : {macd:0.12,signal:0.08,hist:0.04};
    const obv   = closes&&vols ? calcOBV(closes,vols) : 0;
    //
    const obvSignal = closes&&vols&&closes.length>=20 ? (()=>{
      const obvSeries=[];
      let o2=0;
      for(let i=1;i<closes.length;i++){
        closes[i]>closes[i-1]?o2+=vols[i]:closes[i]<closes[i-1]?o2-=vols[i]:null;
        obvSeries.push(o2);
      }
      const k2=2/21;
      let ema2=obvSeries.slice(0,20).reduce((a,b)=>a+b,0)/20;
      for(let i=20;i<obvSeries.length;i++) ema2=obvSeries[i]*k2+ema2*(1-k2);
      return ema2;
    })() : 0;

    //
    const hi = stk.dayHi||p*1.01, lo = stk.dayLo||p*0.99, cl = stk.prev||p;
    const pivot = parseFloat(((hi+lo+cl)/3).toFixed(2));
    const r1t=parseFloat((2*pivot-lo).toFixed(2)),    r1f=parseFloat((pivot+0.382*(hi-lo)).toFixed(2));
    const r2t=parseFloat((pivot+(hi-lo)).toFixed(2)), r2f=parseFloat((pivot+0.618*(hi-lo)).toFixed(2));
    const r3t=parseFloat((hi+2*(pivot-lo)).toFixed(2)),r3f=parseFloat((pivot+1.0*(hi-lo)).toFixed(2));
    const s1t=parseFloat((2*pivot-hi).toFixed(2)),    s1f=parseFloat((pivot-0.382*(hi-lo)).toFixed(2));
    const s2t=parseFloat((pivot-(hi-lo)).toFixed(2)), s2f=parseFloat((pivot-0.618*(hi-lo)).toFixed(2));
    const s3t=parseFloat((lo-2*(hi-pivot)).toFixed(2)),s3f=parseFloat((pivot-1.0*(hi-lo)).toFixed(2));

    //
    const adxVal = closes && hist.length >= 15 ? (()=>{
      const highs2 = hist.map(h=>h.h||h.c);
      const lows2  = hist.map(h=>h.l||h.c);
      const n14 = Math.min(14, closes.length-1);
      let dmPlus=0, dmMinus=0, trSum=0;
      for(let i=closes.length-n14;i<closes.length;i++){
        const upMove  = highs2[i]  - highs2[i-1];
        const downMove= lows2[i-1] - lows2[i];
        if(upMove>downMove && upMove>0) dmPlus+=upMove;
        if(downMove>upMove && downMove>0) dmMinus+=downMove;
        const tr=Math.max(highs2[i]-lows2[i], Math.abs(highs2[i]-closes[i-1]), Math.abs(lows2[i]-closes[i-1]));
        trSum+=tr;
      }
      if(trSum===0) return 35;
      const diPlus  = (dmPlus/trSum)*100;
      const diMinus = (dmMinus/trSum)*100;
      const dx = diPlus+diMinus>0 ? Math.abs(diPlus-diMinus)/(diPlus+diMinus)*100 : 0;
      return parseFloat(Math.min(75,Math.max(10,dx)).toFixed(1));
    })() : closes ? Math.min(75, Math.max(15, 30 + Math.abs(p-ma20s)/p*80)) : 35;

    //
    const { stochK, stochD } = closes && hist.length >= 14 ? (()=>{
      const period=14;
      const highs2 = hist.map(h=>h.h||h.c);
      const lows2  = hist.map(h=>h.l||h.c);
      //
      const kArr=[];
      for(let j=Math.max(0,hist.length-period-2);j<hist.length;j++){
        const start=Math.max(0,j-period+1);
        const hiRange=Math.max(...highs2.slice(start,j+1));
        const loRange=Math.min(...lows2.slice(start,j+1));
        kArr.push(hiRange>loRange ? parseFloat(((closes[j]-loRange)/(hiRange-loRange)*100).toFixed(2)) : 50);
      }
      const kVal=kArr[kArr.length-1];
      const dVal=kArr.length>=3 ? parseFloat((kArr.slice(-3).reduce((a,b)=>a+b,0)/3).toFixed(2)) : kVal;
      return {stochK:kVal, stochD:dVal};
    })() : {stochK:closes?Math.min(100,Math.max(0,(p-lo)/(hi-lo)*100)):65, stochD:55};

    const cciVal = closes ? parseFloat(((p-ma20s)/(0.015*(closes.slice(-20).reduce((a,b)=>a+Math.abs(b-ma20s),0)/20||1))).toFixed(1)) : 88;
    const willR  = parseFloat(((p-stk.dayHi)/(stk.dayHi-stk.dayLo||1)*100).toFixed(2));

    //
    const mfi = closes && vols && hist.length >= 14 ? (()=>{
      const n14 = Math.min(14, hist.length-1);
      let posFlow=0, negFlow=0;
      for(let i=hist.length-n14;i<hist.length;i++){
        const tp  = (( hist[i].h||closes[i]) + (hist[i].l||closes[i]) + closes[i]) / 3;
        const tpP = ((hist[i-1].h||closes[i-1]) + (hist[i-1].l||closes[i-1]) + closes[i-1]) / 3;
        const rawFlow = tp * (vols[i]||1e6);
        if(tp>tpP) posFlow+=rawFlow; else if(tp<tpP) negFlow+=rawFlow;
      }
      if(negFlow===0) return 100;
      const mfRatio=posFlow/negFlow;
      return parseFloat((100-100/(1+mfRatio)).toFixed(1));
    })() : 58;

    //
    const { stochRSI, stochRSID } = closes ? (()=>{
      if(closes.length<28) return {stochRSI:50, stochRSID:50};
      const rsiArr=[];
      for(let i=14;i<=closes.length;i++){
        rsiArr.push(parseFloat(calcRSI(closes.slice(0,i),14).toFixed(2)));
      }
      if(rsiArr.length<14) return {stochRSI:50, stochRSID:50};
      //
      const kArr=[];
      for(let i=14;i<rsiArr.length;i++){
        const window=rsiArr.slice(i-14,i+1);
        const minR=Math.min(...window), maxR=Math.max(...window);
        kArr.push(maxR===minR?50:parseFloat(((rsiArr[i]-minR)/(maxR-minR)*100).toFixed(1)));
      }
      const kVal=kArr[kArr.length-1]||50;
      //
      const dVal=kArr.length>=3
        ? parseFloat((kArr.slice(-3).reduce((a,b)=>a+b,0)/3).toFixed(1))
        : kVal;
      return {stochRSI:kVal, stochRSID:dVal};
    })() : {stochRSI:52, stochRSID:50};

    //
    const supertrend = closes && hist.length>=12 ? (()=>{
      const mult=3;
      const highs2=hist.map(h=>h.h||h.c), lows2=hist.map(h=>h.l||h.c);
      //
      const atrArr=closes.slice(1).map((c,i)=>Math.max(
        highs2[i+1]-lows2[i+1],
        Math.abs(highs2[i+1]-closes[i]),
        Math.abs(lows2[i+1]-closes[i])
      ));
      //
      let bullish=true;
      let finalUp=0, finalDn=0;
      for(let i=0;i<atrArr.length;i++){
        const mid=(highs2[i+1]+lows2[i+1])/2;
        const up=mid+mult*atrArr[i];
        const dn=mid-mult*atrArr[i];
        const prevUp=finalUp||up, prevDn=finalDn||dn;
        finalUp = up<prevUp||closes[i]>prevUp ? up : prevUp;
        finalDn = dn>prevDn||closes[i]<prevDn ? dn : prevDn;
        if(bullish && closes[i+1]<finalDn) bullish=false;
        else if(!bullish && closes[i+1]>finalUp) bullish=true;
      }
      const stVal = bullish ? parseFloat(finalDn.toFixed(2)) : parseFloat(finalUp.toFixed(2));
      const pct = parseFloat(((p-stVal)/stVal*100).toFixed(2));
      return { signal:bullish?"صاعد":"هابط", color:bullish?C.mint:C.coral, val:stVal, pct };
    })() : {signal:"صاعد",color:C.mint,val:parseFloat((p*0.97).toFixed(2)),pct:3.1};

    //
    const sectorPE  = stk.sectorPE  || 16.5;
    const sectorROE = stk.sectorROE || 18;
    const relativeStr = (()=>{
      const peMomentum   = stk.pe   ? ((sectorPE-stk.pe)/sectorPE*50)   : 0;   // P/E أقل من القطاع = أفضل
      const roeMomentum  = stk.roe  ? ((stk.roe-sectorROE)/sectorROE*50) : 0;  // ROE أعلى = أفضل
      const priceMomentum = stk.pct ? stk.pct*2 : 0;                            // أداء السعر اليومي
      const score = Math.min(100,Math.max(0,50+peMomentum+roeMomentum+priceMomentum));
      return {
        score: parseFloat(score.toFixed(1)),
        label: score>65?"أقوى من القطاع":score<35?"أضعف من القطاع":"مماثل للقطاع",
        color: score>65?C.mint:score<35?C.coral:C.amber
      };
    })();

    // ══════════════════════════════════════════════════════════
    //
    // ══════════════════════════════════════════════════════════

    //
    const maSignals = [
      {bull: p > ma5s,   w: 1},
      {bull: p > ma10s,  w: 1},
      {bull: p > ma20s,  w: 1.5},
      {bull: p > ma50s,  w: 2},
      {bull: p > ma100s, w: 2},
      {bull: p > ma200s, w: 2.5},
      //
      {bull: ma5s  > ma20s,  w: 1.5},
      {bull: ma20s > ma50s,  w: 1.5},
      {bull: ma50s > ma200s, w: 2},
    ];
    const maScore = maSignals.reduce((s,x)=> s + (x.bull ? x.w : 0), 0) /
                    maSignals.reduce((s,x)=> s + x.w, 0) * 100;
    const maBuyCount  = [ma5s,ma10s,ma20s,ma50s,ma100s,ma200s].filter(m=>p>m).length;
    const maSellCount = 6-maBuyCount;

    //
    const trendSignals = [
      {bull: macdR.macd > macdR.signal,           w: 3,   name:"MACD"},
      {bull: macdR.hist > 0,                       w: 1.5, name:"MACD Hist"},
      {bull: supertrend.signal === "صاعد",         w: 3,   name:"Supertrend"},
      {bull: ichimoku?.aboveCloud === true,         w: 2.5, name:"Ichimoku Cloud"},
      {bull: ichimoku?.tkCross === "صاعد",         w: 1.5, name:"TK Cross"},
      {bull: adxVal > 25,                          w: 1,   name:"ADX قوي"},   // ADX: قوة فقط
      {bull: rsiDivergence?.type?.includes("إيجابي") || rsiDivergence?.type?.includes("صاعد"), w:2, name:"Divergence"},
    ];
    const trendScore = trendSignals.reduce((s,x)=> s + (x.bull ? x.w : 0), 0) /
                       trendSignals.reduce((s,x)=> s + x.w, 0) * 100;

    //
    const momentumSignals = [
      {bull: rsi14 > 50,                           w: 2,   name:"RSI"},
      {bull: rsi14 > 50 && rsi14 < 70,             w: 1,   name:"RSI مثالي"},  // ليس تشبعاً
      {bull: stochK > 50,                          w: 1.5, name:"Stoch %K"},
      {bull: stochK > stochD,                      w: 1,   name:"Stoch Cross"},
      {bull: stochRSI > 50,                        w: 1.5, name:"Stoch RSI"},
      {bull: stochRSI > stochRSID,                 w: 1,   name:"StochRSI Cross"},
      {bull: cciVal > 0,                           w: 1.5, name:"CCI"},
      {bull: willR > -50,                          w: 1.5, name:"Williams %R"},
      {bull: willR < -20 && willR > -80,           w: 0.5, name:"Williams منطقة"},
    ];
    const momentumScore = momentumSignals.reduce((s,x)=> s + (x.bull ? x.w : 0), 0) /
                          momentumSignals.reduce((s,x)=> s + x.w, 0) * 100;

    //
    const volumeSignals = [
      {bull: obv > obvSignal,                      w: 2.5, name:"OBV"},
      {bull: mfi > 50,                             w: 2,   name:"MFI"},
      {bull: mfi > 50 && mfi < 80,                 w: 0.5, name:"MFI مثالي"},  // ليس تشبعاً
    ];
    const volumeScore = volumeSignals.reduce((s,x)=> s + (x.bull ? x.w : 0), 0) /
                        volumeSignals.reduce((s,x)=> s + x.w, 0) * 100;

    //
    const volSignals = [
      {bull: bb.bPct > 20 && bb.bPct < 80,         w: 1.5, name:"BB داخل النطاق"},
      {bull: bb.bPct > 50,                          w: 1,   name:"BB أعلى الوسط"},
    ];
    const volScore = volSignals.reduce((s,x)=> s + (x.bull ? x.w : 0), 0) /
                     volSignals.reduce((s,x)=> s + x.w, 0) * 100;

    //
    const weightedScore = Math.round(
      maScore       * 0.25 +
      trendScore    * 0.35 +
      momentumScore * 0.25 +
      volumeScore   * 0.10 +
      volScore      * 0.05
    );

    const summaryLabel = weightedScore >= 75 ? "شراء قوي"
                       : weightedScore >= 60 ? "شراء"
                       : weightedScore >= 45 ? "متعادل"
                       : weightedScore >= 30 ? "بيع"
                       : "بيع قوي";
    const summaryColor = weightedScore >= 60 ? C.mint
                       : weightedScore >= 45 ? C.amber
                       : C.coral;

    //
    const indBuyCount  = Math.round(trendSignals.filter(x=>x.bull).length + momentumSignals.filter(x=>x.bull).length * 0.5);
    const indSellCount = Math.round(trendSignals.length + momentumSignals.length * 0.5) - indBuyCount;
    const totalBuy = maBuyCount + indBuyCount;
    const totalSell = maSellCount + indSellCount;

    return {
      rsi14, rsi7, ma5s, ma10s, ma20s, ma50s, ma100s, ma200s, ma5e, ma10e, ma20e, ma50e, ma100e, ma200e,
      atr14, bb, macdR, obv, obvSignal, adxVal, stochK, stochD, cciVal, willR, mfi, stochRSI, stochRSID, supertrend, relativeStr, rsiDivergence, ichimoku,
      pivot, r1t, r1f, r2t, r2f, r3t, r3f, s1t, s1f, s2t, s2f, s3t, s3f,
      maBuyCount, maSellCount, indBuyCount, indSellCount,
      weightedScore, maScore:Math.round(maScore), trendScore:Math.round(trendScore),
      momentumScore:Math.round(momentumScore), volumeScore:Math.round(volumeScore),
      summaryLabel, summaryColor, maSummary: summaryLabel, indSummary: summaryLabel,
    };
  }, [stk.sym, stk.p, stk.dayHi, stk.dayLo, stk.prev]);

  const maSig = val => val>p?{l:"بيع",c:C.coral}:{l:"شراء",c:C.mint};
  const n = nowStr();

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

      {/* نقطة الارتكاز — Classic + Fibonacci */}
      <SectionCard title="نقطة الارتكاز" accent={C.electric}>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 16px 2px", fontSize:11, color:C.smoke, lineHeight:1.5 }}>
          <span>{"مبني على إغلاق أمس: "}{stk.prev}</span><span>{n}</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0, padding:"8px 16px", background:C.layer3, borderBottom:`1px solid ${C.line}44` }}>
          {["فيبوناتشي","تقليدي","المرحلة"].map((l,i)=><span key={i} style={{ fontSize:11, color:C.smoke, fontWeight:700, textAlign:i<2?"center":"right", lineHeight:1.5 }}>{l}</span>)}
        </div>
        {[
          {label:"R3", trad:D.r3t, fib:D.r3f, type:"R"},
          {label:"R2", trad:D.r2t, fib:D.r2f, type:"R"},
          {label:"R1", trad:D.r1t, fib:D.r1f, type:"R"},
          {label:"المحور",trad:D.pivot,fib:D.pivot,type:"P"},
          {label:"S1", trad:D.s1t, fib:D.s1f, type:"S"},
          {label:"S2", trad:D.s2t, fib:D.s2f, type:"S"},
          {label:"S3", trad:D.s3t, fib:D.s3f, type:"S"},
        ].map((row,i) => {
          const c = row.type==="R"?C.coralL:row.type==="P"?C.electric:C.mint;
          return (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:0, padding:"8px 16px", borderBottom:i<6?`1px solid ${C.line}22`:0, alignItems:"center", background:p>=row.trad-0.1&&p<=row.trad+0.1?`${C.electric}05`:i%2?"rgba(255,255,255,.015)":"transparent" }}>
              {[row.fib,row.trad].map((v,j)=>(
                <div key={j} style={{ background:c+"18", border:`1px solid ${c}33`, borderRadius:7, padding:"6px 4px", textAlign:"center", margin:"0 2px" }}>
                  <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:c }}>{v}</span>
                </div>
              ))}
              <span style={{ fontSize:11, color:C.mist, fontWeight:700, textAlign:"right", lineHeight:1.5 }}>{row.label}</span>
            </div>
          );
        })}
      </SectionCard>

      {/* المعدلات المتحركة */}
        {/* MA Ribbon */}
        {(()=>{
          const maVals=[{n:"5",v:D.ma5e,c:"#4d9fff"},{n:"10",v:D.ma10e,c:"#a78bfa"},{n:"20",v:D.ma20e,c:"#1ee68a"},{n:"50",v:D.ma50e,c:"#f0c050"},{n:"100",v:D.ma100e,c:"#fbbf24"},{n:"200",v:D.ma200e,c:"#ff5f6a"}];
          const bullish=maVals.every((m,i)=>i===0||m.v<=maVals[i-1].v);
          const bearish=maVals.every((m,i)=>i===0||m.v>=maVals[i-1].v);
          return (
            <div style={{ padding:"8px 16px 4px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:10, color:C.smoke }}>MA Ribbon</span>
                <Tag text={bullish?"صف صاعد":bearish?"صف هابط":"مختلط"} color={bullish?C.mint:bearish?C.coral:C.amber}/>
              </div>
              <div style={{ display:"flex", height:10, borderRadius:4, overflow:"hidden", gap:1 }}>
                {maVals.map((m,i)=>{
                  // كلما كان المتوسط أقرب للسعر كلما كان أكثر إضاءة
                  const diff = Math.abs(m.v - p) / p;
                  const belowPrice = m.v > 0 && m.v <= p;
                  // إضاءة: تحت السعر = مضاء كامل، فوق السعر = يخفت كلما بعد
                  const opacity = belowPrice ? 0.9 : Math.max(0.15, 0.7 - diff * 8);
                  return (
                    <div key={i} style={{ flex:1, background:m.c, opacity, position:"relative" }}>
                      <span style={{ position:"absolute", bottom:"-14px", left:"50%", transform:"translateX(-50%)", fontSize:7, color:m.c, whiteSpace:"nowrap" }}>{m.n}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ height:14 }}/>
              <div style={{ display:"flex", gap:8, fontSize:9, color:C.smoke, marginTop:2 }}>
                <span style={{ color:C.mint }}>{"مضاء = السعر فوق المتوسط"}</span>
                <span style={{ color:C.smoke, opacity:0.5 }}>{"شفاف = المتوسط فوق السعر"}</span>
              </div>
            </div>
          );
        })()}
      <SectionCard title="المعدلات المتحركة" accent={C.gold}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:0, padding:"8px 16px", background:C.layer3, borderBottom:`1px solid ${C.line}44` }}>
          {["أسي (EMA)","بسيط (SMA)","الإشارة","الرمز"].map((l,i)=><span key={i} style={{ fontSize:11, color:C.smoke, fontWeight:700, textAlign:i<3?"center":"right", lineHeight:1.5 }}>{l}</span>)}
        </div>
        {[
          {sym:"MA 5",  s:D.ma5s,  e:D.ma5e},
          {sym:"MA 10", s:D.ma10s, e:D.ma10e},
          {sym:"MA 20", s:D.ma20s, e:D.ma20e},
          {sym:"MA 50", s:D.ma50s, e:D.ma50e},
          {sym:"MA 100",s:D.ma100s,e:D.ma100e},
          {sym:"MA 200",s:D.ma200s,e:D.ma200e},
        ].map((row,i) => {
          const sigS=maSig(row.s), sigE=maSig(row.e);
          return (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:0, padding:"8px 16px", borderBottom:i<5?`1px solid ${C.line}22`:0, alignItems:"center", background:i%2?"rgba(255,255,255,.015)":"transparent" }}>
              {[{v:row.e,sig:sigE},{v:row.s,sig:sigS}].map((item,j)=>(
                <div key={j} style={{ background:item.sig.c+"18", border:`1px solid ${item.sig.c}33`, borderRadius:7, padding:"6px 4px", textAlign:"center", margin:"0 2px" }}>
                  <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:item.sig.c }}>{item.v}</div>
                  <div style={{ fontSize:11, color:item.sig.c, lineHeight:1.4 }}>{item.sig.l}</div>
                </div>
              ))}
              <div style={{ background:p>row.s&&p>row.e?C.mint+"15":C.coral+"15", borderRadius:7, padding:"6px 4px", textAlign:"center", border:`1px solid ${p>row.s&&p>row.e?C.mint:C.coral}33`, margin:"0 2px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:p>row.s&&p>row.e?C.mint:C.coral, lineHeight:1.4 }}>{p>row.s&&p>row.e?"فوق":"تحت"}</div>
              </div>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:C.snow, textAlign:"right", lineHeight:1.5 }}>{row.sym}</span>
            </div>
          );
        })}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"10px 16px", background:C.layer3, borderTop:`1px solid ${C.line}44` }}>
          <div style={{ background:C.mint+"18", border:`1px solid ${C.mint}33`, borderRadius:8, padding:"8px 12px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:900, color:C.mint, fontFamily:"IBM Plex Mono,monospace", lineHeight:1.5 }}>{"شراء ("}{D.maBuyCount}{")"}</div>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.4 }}>MA فوق السعر</div>
          </div>
          <div style={{ background:C.coral+"18", border:`1px solid ${C.coral}33`, borderRadius:8, padding:"8px 12px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:900, color:C.coral, fontFamily:"IBM Plex Mono,monospace", lineHeight:1.5 }}>{"بيع ("}{D.maSellCount}{")"}</div>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.4 }}>MA دون السعر</div>
          </div>
        </div>
      </SectionCard>

      {/* المؤشرات */}
      <SectionCard title="المؤشرات التقنية" accent={C.plasma}>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 16px 2px", fontSize:11, color:C.smoke, lineHeight:1.5 }}><span>محسوبة من البيانات التاريخية</span><span>{n}</span></div>
        {[
          {sym:"RSI(14)",    v:D.rsi14.toFixed(2), bar:D.rsi14,   note:D.rsi14>70?"فائض شراء":D.rsi14<30?"فائض بيع":"محايد",   c:D.rsi14>70?C.coral:D.rsi14<30?C.mint:C.amber},
          {sym:"RSI Div",    v:D.rsiDivergence?.type||"—", bar:D.rsiDivergence?.type==="إيجابي"?75:D.rsiDivergence?.type==="سلبي"?25:50, note:D.rsiDivergence?.note||"—", c:D.rsiDivergence?.color||C.smoke},
          {sym:"RSI(7)",     v:D.rsi7.toFixed(2),  bar:D.rsi7,    note:D.rsi7>70?"فائض شراء":D.rsi7<30?"فائض بيع":"محايد",     c:D.rsi7>70?C.coral:D.rsi7<30?C.mint:C.amber},
          {sym:"Stoch%K",   v:`${D.stochK.toFixed(1)} / ${D.stochD?.toFixed(1)||"—"}`, bar:D.stochK,  note:D.stochK>80?"فائض شراء":D.stochK<20?"فائض بيع":D.stochK>D.stochD?"صاعد":"هابط", c:D.stochK>80?C.coral:D.stochK<20?C.mint:D.stochK>D.stochD?C.mint:C.amber},
          {sym:"ADX(14)",   v:D.adxVal.toFixed(1), bar:D.adxVal,  note:`${D.adxVal>25?"اتجاه قوي":"اتجاه ضعيف"} | DI+${D.diPlus?.toFixed(1)||"--"} DI-${D.diMinus?.toFixed(1)||"--"}`, c:D.adxVal>25?C.mint:D.adxVal>15?C.amber:C.smoke},
          {sym:"CCI(14)",   v:D.cciVal,            bar:Math.min(100,Math.max(0,(D.cciVal+200)/4)), note:D.cciVal>200?"شراء قوي":D.cciVal>100?"شراء":D.cciVal<-200?"بيع قوي":D.cciVal<-100?"بيع":"محايد", c:D.cciVal>100?C.mint:D.cciVal<-100?C.coral:C.amber},
          {sym:"Williams%R",v:D.willR.toFixed(1),  bar:Math.max(0,100+D.willR), note:D.willR>-10?"تشبع شراء":D.willR>-20?"فائض شراء":D.willR<-90?"تشبع بيع":D.willR<-80?"فائض بيع":"محايد", c:D.willR>-20?C.coral:D.willR<-80?C.mint:C.amber},
          {sym:"MFI(14)",   v:D.mfi,               bar:D.mfi,     note:D.mfi>80?"تشبع شراء":D.mfi>60?"ضغط شراء":D.mfi<20?"تشبع بيع":D.mfi<40?"ضغط بيع":"محايد", c:D.mfi>80?C.coral:D.mfi>60?C.mint:D.mfi<20?C.mint:D.mfi<40?C.coral:C.amber},
          {sym:"Stoch RSI",v:`${D.stochRSI} / ${D.stochRSID||"—"}`, bar:D.stochRSI, note:D.stochRSI>80?"فائض شراء":D.stochRSI<20?"فائض بيع":D.stochRSI>D.stochRSID?"صاعد":"هابط", c:D.stochRSI>80?C.coral:D.stochRSI<20?C.mint:D.stochRSI>D.stochRSID?C.mint:C.amber},
          {sym:"ATR(14)",   v:D.atr14,             bar:Math.min(100,D.atr14/p*500), note:`${(D.atr14/p*100).toFixed(2)}% — ${D.atr14/p>0.025?"تقلب عالٍ":D.atr14/p>0.012?"تقلب متوسط":"تقلب منخفض"}`, c:D.atr14/p>0.025?C.coral:D.atr14/p>0.012?C.amber:C.mint},
          {sym:"OBV",       v:D.obv>0?"+"+(D.obv/1e6).toFixed(0)+" م":"" +(D.obv/1e6).toFixed(0)+" م", bar:50+Math.min(50,Math.max(-50,D.obv/1e8)), note:D.obv>D.obvSignal?"فوق الإشارة ↑":"تحت الإشارة ↓", c:D.obv>D.obvSignal?C.mint:C.coral},
          {sym:"Supertrend",v:`${D.supertrend.signal} ${D.supertrend.val}`, bar:D.supertrend.signal==="صاعد"?75:25, note:`${D.supertrend.pct>0?"+":""}${D.supertrend.pct}%`, c:D.supertrend.color},
          {sym:"Ichimoku",   v:D.ichimoku?D.ichimoku.signal:"—", bar:D.ichimoku?.aboveCloud?80:D.ichimoku?.belowCloud?20:50, note:D.ichimoku?`TK: ${D.ichimoku.tkCross} | Tenkan:${D.ichimoku.tenkan} Kijun:${D.ichimoku.kijun}`:"—", c:D.ichimoku?D.ichimoku.col:C.smoke},
        ].map((row,i,arr) => {
          //
          const strength = Math.min(100, Math.round(Math.abs((row.bar||50) - 50) * 2));
          const strCol = strength>=70?C.mint:strength>=40?C.amber:C.smoke;
          const strLabel = strength>=70?"قوية":strength>=40?"متوسطة":"ضعيفة";
          return (
          <div key={i} style={{ padding:"8px 16px", borderBottom:i<arr.length-1?`1px solid ${C.line}22`:0, background:i%2?"rgba(255,255,255,.015)":"transparent" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:700, color:C.snow, lineHeight:1.5 }}>{row.sym}</span>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:C.mist }}>{row.v}</span>
                <Tag text={row.note} color={row.c}/>
                <Tag text={strLabel} color={strCol}/>
              </div>
            </div>
            {/* شريطان: اتجاه + قوة */}
            <div style={{ display:"flex", gap:4, alignItems:"center" }}>
              <div style={{ flex:1, height:3, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(100,Math.max(0,row.bar))}%`, background:row.c, borderRadius:2 }}/>
              </div>
              <div style={{ width:60, height:3, background:C.layer3, borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${strength}%`, background:`linear-gradient(90deg,${C.smoke},${strCol})`, borderRadius:2 }}/>
              </div>
              <span style={{ fontSize:9, color:strCol, width:22, flexShrink:0, fontFamily:"IBM Plex Mono,monospace" }}>{strength}%</span>
            </div>
          </div>
          );
        })}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"10px 16px", background:C.layer3, borderTop:`1px solid ${C.line}44` }}>
          <div style={{ background:C.mint+"18", border:`1px solid ${C.mint}33`, borderRadius:8, padding:"8px 12px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:900, color:C.mint, fontFamily:"IBM Plex Mono,monospace", lineHeight:1.5 }}>{"شراء ("}{D.indBuyCount}{")"}</div>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.4 }}>مؤشرات صاعدة</div>
          </div>
          <div style={{ background:C.coral+"18", border:`1px solid ${C.coral}33`, borderRadius:8, padding:"8px 12px", textAlign:"center" }}>
            <div style={{ fontSize:13, fontWeight:900, color:C.coral, fontFamily:"IBM Plex Mono,monospace", lineHeight:1.5 }}>{"بيع ("}{D.indSellCount}{")"}</div>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.4 }}>مؤشرات هابطة</div>
          </div>
        </div>
      </SectionCard>

      {/* Bollinger Bands */}
      <SectionCard title="بولينجر باند (20,2)" accent={C.plasma}>
        <div style={{ padding:"12px 16px" }}>
          <div style={{ position:"relative", height:10, background:C.layer3, borderRadius:5, marginBottom:8, overflow:"hidden" }}>
            <div style={{ position:"absolute", inset:0, background:`linear-gradient(90deg,${C.coral}44,${C.layer3},${C.mint}44)`, borderRadius:5 }}/>
            <div style={{ position:"absolute", top:"50%", left:`${D.bb.bPct}%`, transform:"translate(-50%,-50%)", width:12, height:12, borderRadius:"50%", background:C.snow, border:`2px solid ${C.layer1}`, boxShadow:"0 0 6px rgba(0,0,0,.8)" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
            {[{l:"الحد العلوي",v:D.bb.upper,c:C.coralL},{l:"الوسط (SMA20)",v:D.bb.mid,c:C.electric},{l:"الحد السفلي",v:D.bb.lower,c:C.mint}].map((item,i)=>(
              <div key={i} style={{ background:item.c+"12", borderRadius:9, padding:"8px", textAlign:"center", border:`1px solid ${item.c}25` }}>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:13, fontWeight:900, color:item.c }}>{item.v}</div>
                <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5, marginTop:2 }}>{item.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:11, color:C.smoke, lineHeight:1.5 }}>
            <span>%B: <span style={{ color:D.bb.bPct>80?C.coral:D.bb.bPct<20?C.mint:C.amber, fontWeight:700 }}>{D.bb.bPct}%</span></span>
            <span>ATR: <span style={{ fontFamily:"IBM Plex Mono,monospace", color:C.mist }}>{D.atr14}</span></span>
            <span style={{ color:D.bb.bPct>80?C.coral:D.bb.bPct<20?C.mint:C.amber, fontWeight:700 }}>{D.bb.bPct>80?"خروج عُلوي":D.bb.bPct<20?"خروج سُفلي":D.bb.bPct>60?"داخل — مرتفع":"داخل النطاق"}</span>
          </div>
          {/* Bandwidth — ضيق = squeeze وشيك */}
          {(()=>{
            const bw = D.bb.upper && D.bb.lower ? parseFloat(((D.bb.upper-D.bb.lower)/D.bb.mid*100).toFixed(1)) : null;
            if(!bw) return null;
            return (
              <div style={{ marginTop:6, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:10, color:C.smoke }}>
                <span>Bandwidth: <span style={{ color:bw<3?C.plasma:C.smoke, fontWeight:bw<3?700:400 }}>{bw}%</span></span>
                {bw<3 && <Tag text="⚡ Squeeze" color={C.plasma}/>}
              </div>
            );
          })()}
        </div>
      </SectionCard>

      {/* MACD */}
      <SectionCard title="MACD (12,26,9)" accent={D.macdR.macd>0?C.mint:C.coral}>
        <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[{l:"MACD",v:D.macdR.macd,c:D.macdR.macd>0?C.mint:C.coral},{l:"إشارة",v:D.macdR.signal,c:C.amber},{l:"المدرج",v:D.macdR.hist,c:D.macdR.hist>0?C.mint:C.coral}].map((item,i)=>(
            <div key={i} style={{ background:item.c+"12", borderRadius:9, padding:"10px 8px", textAlign:"center", border:`1px solid ${item.c}25` }}>
              <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:item.c }}>{item.v}</div>
              <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5, marginTop:2 }}>{item.l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"8px 16px", fontSize:11, color:D.macdR.macd>0?C.mint:C.coral, lineHeight:1.5 }}>
          {D.macdR.macd>D.macdR.signal?"✓ MACD فوق خط الإشارة — إشارة صعودية":"✗ MACD دون خط الإشارة — إشارة هبوطية"}
        </div>
      </SectionCard>

      {/* الأنماط الكلاسيكية */}
      {(()=>{
        const closesP = hist.length>=20 ? hist.map(h=>h.c) : null;
        if(!closesP||closesP.length<20) return null;
        const n=closesP.length, last5=closesP.slice(-5), last10=closesP.slice(-10), last20=closesP.slice(-20);
        const patterns=[];
        //
        const lastPt=hist[hist.length-1]||{};
        if(lastPt.h&&lastPt.l&&lastPt.o&&lastPt.c){
          const body=Math.abs(lastPt.c-lastPt.o);
          const range=lastPt.h-lastPt.l;
          if(range>0&&body/range<0.1) patterns.push({name:"Doji",icon:"⊙",note:"شمعة تردد — انعكاس محتمل",c:C.amber});
          // Hammer
          const lower=Math.min(lastPt.o,lastPt.c)-lastPt.l;
          if(lower>body*2&&body/range>0.1) patterns.push({name:"Hammer",icon:"🔨",note:"مطرقة — صعود محتمل",c:C.mint});
          // Shooting Star
          const upper=lastPt.h-Math.max(lastPt.o,lastPt.c);
          if(upper>body*2&&body/range>0.1) patterns.push({name:"Shooting Star",icon:"⭐",note:"نجمة هابطة — هبوط محتمل",c:C.coral});
        }
        // Golden Cross / Death Cross
        const ma20v=last20.reduce((a,b)=>a+b,0)/20;
        const ma10v=last10.reduce((a,b)=>a+b,0)/10;
        const ma5v=last5.reduce((a,b)=>a+b,0)/5;
        if(ma5v>ma20v&&ma10v<ma20v) patterns.push({name:"Golden Cross",icon:"✨",note:"تقاطع ذهبي — إشارة شراء",c:C.gold});
        if(ma5v<ma20v&&ma10v>ma20v) patterns.push({name:"Death Cross",icon:"💀",note:"تقاطع موت — إشارة بيع",c:C.coral});
        // Head & Shoulders
        if(n>=15){
          const seg=closesP.slice(-15);
          const leftH=Math.max(...seg.slice(0,5));
          const headH=Math.max(...seg.slice(5,10));
          const rightH=Math.max(...seg.slice(10,15));
          if(headH>leftH*1.02&&headH>rightH*1.02&&Math.abs(leftH-rightH)/leftH<0.05)
            patterns.push({name:"Head & Shoulders",icon:"Ш",note:"رأس وكتفين — انعكاس هبوطي محتمل",c:C.coral});
          if(headH<leftH*0.98&&headH<rightH*0.98&&Math.abs(leftH-rightH)/leftH<0.05)
            patterns.push({name:"Inv. H&S",icon:"∪",note:"رأس وكتفين معكوس — انعكاس صعودي",c:C.mint});
        }
        // Double Top / Double Bottom
        if(n>=20){
          const seg2=closesP.slice(-20);
          const h1=Math.max(...seg2.slice(0,10)), h2=Math.max(...seg2.slice(10));
          const l1=Math.min(...seg2.slice(0,10)), l2=Math.min(...seg2.slice(10));
          if(Math.abs(h1-h2)/h1<0.02&&seg2[9]<h1*0.97)
            patterns.push({name:"Double Top",icon:"∩∩",note:"قمة مزدوجة — مقاومة قوية",c:C.coral});
          if(Math.abs(l1-l2)/l1<0.02&&seg2[9]>l1*1.03)
            patterns.push({name:"Double Bottom",icon:"∪∪",note:"قاع مزدوج — دعم قوي",c:C.mint});
        }
        // Trend
        const trend=last5[last5.length-1]>last5[0];
        if(Math.abs(last5[last5.length-1]-last5[0])/last5[0]>0.02) patterns.push({
          name:trend?"Bullish Trend":"Bearish Trend",
          icon:trend?"📈":"📉",
          note:trend?"اتجاه صاعد قوي":"اتجاه هابط قوي",
          c:trend?C.mint:C.coral
        });

        if(patterns.length===0) return null;
        return (
          <SectionCard title="الأنماط الكلاسيكية" accent={C.plasma}>
            <div style={{ padding:"10px 16px", display:"flex", flexDirection:"column", gap:6 }}>
              {patterns.map((pt,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", background:pt.c+"10", border:`1px solid ${pt.c}33`, borderRadius:9 }}>
                  <span style={{ fontSize:18 }}>{pt.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:800, color:pt.c, lineHeight:1.4 }}>{pt.name}</div>
                    <div style={{ fontSize:10, color:C.smoke, lineHeight:1.4 }}>{pt.note}</div>
                  </div>
                  <Tag text={pt.c===C.mint?"صاعد":pt.c===C.coral?"هابط":"محايد"} color={pt.c}/>
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })()}

      {/* الملخص الشامل */}
      <SectionCard title="الملخص الشامل" accent={D.summaryColor}>
        <div style={{ padding:"14px 16px" }}>
          {/* Gauge Chart */}
          {(()=>{
            const bullPct = D.weightedScore || 50;
            const R=52, CX=72, CY=72;
            //
            const angle = (bullPct/100)*Math.PI;
            const needleX = CX + R*0.8*Math.cos(Math.PI - angle);
            const needleY = CY - R*0.8*Math.sin(angle);
            return (
              <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                <svg width={144} height={90} viewBox="0 0 144 90" style={{flexShrink:0}}>
                  {/* الخلفية الرمادية */}
                  <path d={`M${CX-R},${CY} A${R},${R} 0 0,1 ${CX+R},${CY}`} fill="none" stroke={C.layer3} strokeWidth="14" strokeLinecap="round"/>
                  {/* البيع — أحمر */}
                  <path d={`M${CX-R},${CY} A${R},${R} 0 0,1 ${CX},${CY-R}`} fill="none" stroke={C.coral+"88"} strokeWidth="14" strokeLinecap="round"/>
                  {/* محايد — ذهبي */}
                  <path d={`M${CX},${CY-R} A${R},${R} 0 0,1 ${CX+R*0.71},${CY-R*0.71}`} fill="none" stroke={C.amber+"88"} strokeWidth="14" strokeLinecap="round"/>
                  {/* الشراء — أخضر */}
                  <path d={`M${CX+R*0.71},${CY-R*0.71} A${R},${R} 0 0,1 ${CX+R},${CY}`} fill="none" stroke={C.mint+"88"} strokeWidth="14" strokeLinecap="round"/>
                  {/* الإبرة */}
                  <line x1={CX} y1={CY} x2={needleX.toFixed(1)} y2={needleY.toFixed(1)} stroke={D.summaryColor} strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx={CX} cy={CY} r="5" fill={D.summaryColor}/>
                  {/* القيمة */}
                  <text x={CX} y={CY+18} textAnchor="middle" fill={D.summaryColor} fontSize="13" fontWeight="900" fontFamily="IBM Plex Mono,monospace">{bullPct}%</text>
                  <text x={CX} y={CY+30} textAnchor="middle" fill={C.smoke} fontSize="9" fontFamily="Cairo,sans-serif">صاعدة</text>
                  {/* Labels */}
                  <text x={CX-R-4} y={CY+4} textAnchor="middle" fill={C.coral} fontSize="8">بيع</text>
                  <text x={CX+R+4} y={CY+4} textAnchor="middle" fill={C.mint} fontSize="8">شراء</text>
                </svg>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:18, fontWeight:900, color:D.summaryColor, textShadow:`0 0 12px ${D.summaryColor}88`, marginBottom:6 }}>{D.summaryLabel}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {[
                      {l:"متوسطات",  v:D.maScore+"%",       c:D.maScore>=60?C.mint:D.maScore>=45?C.amber:C.coral},
                      {l:"اتجاه",    v:D.trendScore+"%",    c:D.trendScore>=60?C.mint:D.trendScore>=45?C.amber:C.coral},
                      {l:"زخم",      v:D.momentumScore+"%", c:D.momentumScore>=60?C.mint:D.momentumScore>=45?C.amber:C.coral},
                      {l:"حجم",      v:D.volumeScore+"%",   c:D.volumeScore>=60?C.mint:D.volumeScore>=45?C.amber:C.coral},
                    ].map((item,i)=>(
                      <div key={i} style={{ background:item.c+"12", borderRadius:7, padding:"5px 8px", border:`1px solid ${item.c}22` }}>
                        <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:900, color:item.c }}>{item.v}</div>
                        <div style={{ fontSize:9, color:C.smoke }}>{item.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          <div style={{ fontSize:11, color:C.smoke, lineHeight:1.7, background:C.layer3, borderRadius:10, padding:"10px 12px" }}>
            ⚠️ <strong style={{ color:C.amber }}>تنبيه:</strong> تحليل معلوماتي فقط وليس توصية استثمارية. راجع محللاً معتمداً قبل أي قرار.
          </div>
        </div>
      </SectionCard>

      {/* Elliott Wave — AI محلل متقدم */}
      {(()=>{
        const [ewData,    setEwData]    = useState(null);
        const [ewLoading, setEwLoading] = useState(false);
        const [ewErr,     setEwErr]     = useState(null);
        const [ewFetched, setEwFetched] = useState(null);

        const analyzeEW = async () => {
          setEwLoading(true); setEwErr(null);
          try {
            // نبني ملخص الشمعات للـ AI
            const h = hist || [];
            const monthly = h.filter((_,i)=>i%20===0).slice(-12).map(c=>`${c.date||""}:${c.c}`).join(", ");
            const weekly  = h.filter((_,i)=>i%5===0).slice(-24).map(c=>`${c.date||""}:${c.c}`).join(", ");
            const daily   = h.slice(-30).map(c=>`${c.date||""}:O${c.o||c.c} H${c.h||c.c} L${c.l||c.c} C${c.c}`).join(" | ");
            const prompt = `أنت أفضل محلل موجات إيليوت في العالم. حلّل سهم ${stk.name} (${stk.sym}) بناءً على البيانات التالية:

السعر الحالي: ${stk.p} ر.س
شمعات شهرية (آخر 12 شهر): ${monthly}
شمعات أسبوعية (آخر 24 أسبوع): ${weekly}
شمعات يومية (آخر 30 يوم): ${daily}

قدّم تحليل موجات إيليوت احترافياً يشمل:
1. الموجة الرئيسية الحالية (Primary) على الإطار الشهري
2. الموجة المتوسطة (Intermediate) على الإطار الأسبوعي  
3. الموجة الصغيرة (Minor) على الإطار اليومي
4. لكل موجة: رقمها/حرفها، اتجاهها (صاعد/هابط)، هل هي ممتدة أم منقطعة
5. أهداف الموجة القادمة بالأرقام (ر.س) مع نسب فيبوناتشي
6. تحذيرات أو قواعد إيليوت المهمة

أجب بـ JSON فقط بهذا الشكل:
{
  "primary":{"wave":"3","dir":"صاعد","type":"ممتدة","note":"..."},
  "intermediate":{"wave":"iii","dir":"صاعد","type":"ممتدة","note":"..."},
  "minor":{"wave":"3","dir":"صاعد","type":"طبيعية","note":"..."},
  "currentPos":"وصف موقع السهم الحالي في الدورة",
  "nextTarget":{"bull":0,"bear":0,"fib":"61.8%"},
  "support":0,
  "resistance":0,
  "warning":"...",
  "summary":"ملخص تحليلي شامل في جملتين"
}`;

            const res = await fetch("https://api.anthropic.com/v1/messages",{
              method:"POST", headers:{"Content-Type":"application/json"},
              body:JSON.stringify({
                model:"claude-sonnet-4-20250514", max_tokens:1500,
                tools:[{type:"web_search_20250305",name:"web_search"}],
                messages:[{role:"user",content:prompt}]
              })
            });
            const d = await res.json();
            const txt = (d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
            const m = txt.match(/\{[\s\S]*\}/);
            if(m){ setEwData(JSON.parse(m[0])); setEwFetched(new Date().toLocaleString("ar-SA")); }
            else setEwErr("لم يتمكن AI من تحليل الموجات");
          } catch(e){ setEwErr("خطأ: "+e.message); }
          setEwLoading(false);
        };

        const waveColor = w => {
          if(!w) return C.smoke;
          if(w.dir==="صاعد") return C.mint;
          if(w.dir==="هابط") return C.coral;
          return C.amber;
        };

        return (
          <SectionCard title="موجات إيليوت — تحليل AI" accent={C.plasma}
            badge={ewFetched?{text:"AI حي",color:C.mint}:{text:"محلل متقدم",color:C.plasma}}>
            <div style={{ padding:"10px 16px" }}>

              {/* زر التحليل */}
              {!ewData && !ewLoading && (
                <div style={{ textAlign:"center", padding:"16px 0" }}>
                  <div style={{ fontSize:11, color:C.smoke, marginBottom:12, lineHeight:1.6 }}>
                    {"تحليل AI احترافي للموجات الرئيسية والفرعية"}
                    <br/>
                    {"على الإطارات الشهري والأسبوعي واليومي"}
                  </div>
                  <button onClick={analyzeEW}
                    style={{ display:"inline-flex", alignItems:"center", gap:8, background:`linear-gradient(135deg,${C.plasma}33,${C.electric}22)`, border:`1px solid ${C.plasma}66`, borderRadius:12, padding:"12px 24px", color:C.plasma, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"Cairo,sans-serif", boxShadow:`0 0 20px ${C.plasma}22` }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.plasma} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    {"تحليل موجات إيليوت بالذكاء الاصطناعي"}
                  </button>
                </div>
              )}

              {/* تحميل */}
              {ewLoading && (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.plasma} strokeWidth="2" style={{animation:"spin 1s linear infinite",display:"block",margin:"0 auto 10px"}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  <div style={{ fontSize:11, color:C.smoke }}>{"يحلل AI الموجات على 3 إطارات زمنية..."}</div>
                  <div style={{ fontSize:10, color:C.smoke, opacity:0.6, marginTop:4 }}>{"شهري • أسبوعي • يومي"}</div>
                </div>
              )}

              {/* خطأ */}
              {ewErr && (
                <div style={{ padding:"10px", background:C.coral+"15", borderRadius:8, fontSize:11, color:C.coral, marginBottom:8 }}>
                  {ewErr}
                  <button onClick={analyzeEW} style={{ marginTop:6, display:"block", background:"transparent", border:`1px solid ${C.coral}44`, borderRadius:6, padding:"4px 10px", color:C.coral, fontSize:10, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>{"إعادة المحاولة"}</button>
                </div>
              )}

              {/* النتائج */}
              {ewData && (
                <>
                  {/* الإطارات الثلاثة */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:10 }}>
                    {[
                      {label:"شهري (Primary)",   data:ewData.primary,      icon:"M"},
                      {label:"أسبوعي (Interm.)", data:ewData.intermediate, icon:"W"},
                      {label:"يومي (Minor)",      data:ewData.minor,        icon:"D"},
                    ].map((tf,i)=>{
                      const col=waveColor(tf.data);
                      return (
                        <div key={i} style={{ background:col+"12", borderRadius:10, padding:"8px 6px", border:`1px solid ${col}33`, textAlign:"center" }}>
                          <div style={{ fontSize:8, color:C.smoke, marginBottom:4 }}>{tf.label}</div>
                          <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:18, fontWeight:900, color:col, lineHeight:1 }}>
                            {tf.data?.wave||"?"}
                          </div>
                          <div style={{ fontSize:9, color:col, marginTop:3, fontWeight:700 }}>
                            {tf.data?.dir||""}
                          </div>
                          <div style={{ fontSize:8, color:C.smoke, marginTop:2, background:C.layer3, borderRadius:4, padding:"2px 4px", display:"inline-block" }}>
                            {tf.data?.type||""}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* الموقع الحالي */}
                  {ewData.currentPos && (
                    <div style={{ background:C.plasma+"12", border:`1px solid ${C.plasma}33`, borderRadius:8, padding:"8px 10px", marginBottom:8, fontSize:10, color:C.mist, lineHeight:1.6 }}>
                      <span style={{ color:C.plasma, fontWeight:700 }}>{"الموقع الحالي: "}</span>
                      {ewData.currentPos}
                    </div>
                  )}

                  {/* الأهداف */}
                  {ewData.nextTarget && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8 }}>
                      {[
                        {l:"هدف صاعد", v:ewData.nextTarget.bull, c:C.mint},
                        {l:"هدف هابط", v:ewData.nextTarget.bear, c:C.coral},
                        {l:"فيبوناتشي", v:ewData.nextTarget.fib, c:C.gold},
                      ].map((t,i)=>(
                        <div key={i} style={{ background:t.c+"10", borderRadius:7, padding:"6px 4px", textAlign:"center", border:`1px solid ${t.c}22` }}>
                          <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:t.c }}>
                            {typeof t.v==="number"?t.v+" ر.س":t.v||"—"}
                          </div>
                          <div style={{ fontSize:8, color:C.smoke, marginTop:2 }}>{t.l}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* الدعم والمقاومة */}
                  {(ewData.support||ewData.resistance) && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
                      {[
                        {l:"دعم الموجة", v:ewData.support,    c:C.mint},
                        {l:"مقاومة",     v:ewData.resistance, c:C.coral},
                      ].map((t,i)=>(
                        <div key={i} style={{ background:t.c+"10", borderRadius:7, padding:"6px 8px", display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${t.c}22` }}>
                          <span style={{ fontSize:10, color:C.smoke }}>{t.l}</span>
                          <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:t.c }}>{t.v||"—"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* تحذير */}
                  {ewData.warning && (
                    <div style={{ background:C.amber+"15", border:`1px solid ${C.amber}33`, borderRadius:7, padding:"7px 10px", fontSize:10, color:C.amber, marginBottom:8, lineHeight:1.5 }}>
                      {"⚠ "}{ewData.warning}
                    </div>
                  )}

                  {/* ملخص */}
                  {ewData.summary && (
                    <div style={{ background:C.layer3, borderRadius:8, padding:"8px 10px", fontSize:10, color:C.mist, lineHeight:1.7 }}>
                      {ewData.summary}
                    </div>
                  )}

                  {/* تفاصيل كل موجة */}
                  <div style={{ marginTop:8 }}>
                    {[
                      {label:"الموجة الرئيسية",   data:ewData.primary},
                      {label:"الموجة المتوسطة",  data:ewData.intermediate},
                      {label:"الموجة الصغيرة",   data:ewData.minor},
                    ].filter(x=>x.data?.note).map((tf,i)=>{
                      const col=waveColor(tf.data);
                      return (
                        <div key={i} style={{ marginBottom:6, padding:"7px 10px", background:col+"08", borderRadius:7, borderRight:`3px solid ${col}` }}>
                          <div style={{ fontSize:9, color:col, fontWeight:700, marginBottom:3 }}>
                            {tf.label} — {"موجة "}{tf.data.wave} {tf.data.dir} ({tf.data.type})
                          </div>
                          <div style={{ fontSize:10, color:C.smoke, lineHeight:1.5 }}>{tf.data.note}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* زر تحديث */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                    {ewFetched && <span style={{ fontSize:9, color:C.smoke, opacity:0.6 }}>{ewFetched}</span>}
                    <button onClick={analyzeEW} disabled={ewLoading}
                      style={{ display:"flex", alignItems:"center", gap:4, background:C.plasma+"15", border:`1px solid ${C.plasma}44`, borderRadius:7, padding:"5px 10px", color:C.plasma, fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.plasma} strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.09-1"/></svg>
                      {"تحديث"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        );
      })()}

      {/* مناطق الدعم والمقاومة */}
      {hist.length>=20 && (()=>{
        const highs2=hist.map(h=>h.h||h.c), lows2=hist.map(h=>h.l||h.c);
        //
        const findLevels=(arr,isHigh)=>{
          const sorted=[...arr].sort((a,b)=>isHigh?b-a:a-b);
          const levels=[];
          for(const v of sorted){
            if(levels.every(l=>Math.abs(l-v)/v>0.005)){
              levels.push(parseFloat(v.toFixed(2)));
              if(levels.length===3) break;
            }
          }
          return levels;
        };
        const resistances=findLevels(highs2,true);
        const supports=findLevels(lows2,false);
        const strength=v=>{
          const count=[...highs2,...lows2].filter(x=>Math.abs(x-v)/v<0.005).length;
          return count>=4?"قوي":count>=2?"متوسط":"ضعيف";
        };
        return (
          <SectionCard title="مناطق الدعم والمقاومة" accent={C.electric}>
            <div style={{ padding:"10px 16px" }}>
              {[
                {label:"مقاومات",levels:resistances,color:C.coral},
                {label:"دعوم",   levels:supports,   color:C.mint},
              ].map((side,si)=>(
                <div key={si} style={{ marginBottom:si===0?12:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:side.color, marginBottom:6 }}>{side.label}</div>
                  {side.levels.map((lv,i)=>{
                    const dist=parseFloat(((lv-p)/p*100).toFixed(2));
                    const str=strength(lv);
                    const strC=str==="قوي"?C.mint:str==="متوسط"?C.amber:C.smoke;
                    const strNum=str==="قوي"?3:str==="متوسط"?2:1;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, padding:"6px 8px", background:side.color+"08", borderRadius:7, border:`1px solid ${side.color}22` }}>
                        <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:800, color:side.color, flex:1 }}>{lv}</span>
                        <span style={{ fontSize:10, color:dist>=0?C.mint:C.coral, fontFamily:"IBM Plex Mono,monospace" }}>{dist>=0?"+":""}{dist}%</span>
                        <div style={{ display:"flex", gap:2 }}>
                          {[1,2,3].map(s=><div key={s} style={{ width:5, height:5, borderRadius:1, background:s<=strNum?strC:C.layer3 }}/>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </SectionCard>
        );
      })()}

    </div>
  );
}
//

// ─── InfoTooltip ──────────────────────────────────────────────

export { TechLoader, SDTechnical };
