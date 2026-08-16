// src/services/api/yahooHistoricalApi.ts
'use client';

/**
 * @module yahooHistoricalApi
 * @description Yahoo Finance Historical Data Service
 * 
 * يجلب بيانات تاريخية لأسهم تاسي (.SR) من Yahoo Finance
 * عبر proxy في /api/yahoo لتجاوز CORS.
 * 
 * يحوّل البيانات إلى نفس صيغة sahmk:
 *   { o, h, l, c, v, date }
 * 
 * ميزة: يدعم ١٠+ سنوات بدل سنة واحدة كحدّ sahmk.
 */

export interface YahooBar {
  // الحقول الأصلية
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  date: string;
  // ✨ aliases مطلوبة من technicalEngine + analysisEngine
  hi?: number;
  lo?: number;
  vol?: number;
  close?: number;
  open?: number;
  high?: number;
  low?: number;
  pct?: number;
}
/**
 * تحويل رمز سهم سعودي إلى صيغة Yahoo
 * مثال: "1010" → "1010.SR"
 */
function toYahooSymbol(sym: string): string {
  if (!sym) return '';
  // إن كان بالفعل بصيغة Yahoo
  if (sym.toUpperCase().endsWith('.SR')) return sym;
  // إزالة أيّ زوائد وإضافة .SR
  const cleanSym = sym.replace(/\.SR$/i, '').trim();
  return `${cleanSym}.SR`;
}

/**
 * تحويل عدد الأيام إلى range string يفهمه Yahoo
 */
function daysToRange(days: number): string {
  if (days <= 252) return '1y';
  if (days <= 504) return '2y';
  if (days <= 1260) return '5y';
  if (days <= 2520) return '10y';
  return 'max';
}

/**
 * جلب bars تاريخية لسهم واحد من Yahoo
 * 
 * @param sym - رمز السهم (مثل "1010" أو "1010.SR")
 * @param days - عدد الأيام المطلوبة
 * @returns مصفوفة bars مرتّبة من الأقدم للأحدث
 */
export async function getYahooBars(sym: string, days: number = 2520): Promise<YahooBar[]> {
  try {
    const yahooSym = toYahooSymbol(sym);
    const range = daysToRange(days);
    
    const url = `/api/yahoo?symbol=${yahooSym}&range=${range}&interval=1d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[Yahoo] فشل جلب ${yahooSym}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    // التحقّق من البنية
    if (!data || !data.chart || !data.chart.result || !data.chart.result[0]) {
      console.warn(`[Yahoo] بنية غير متوقّعة لـ ${yahooSym}`);
      return [];
    }
    
    const result = data.chart.result[0];
    const timestamps: number[] = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];
    
    if (!quotes || timestamps.length === 0) {
      console.warn(`[Yahoo] لا بيانات لـ ${yahooSym}`);
      return [];
    }
    
    const opens: (number | null)[] = quotes.open || [];
    const highs: (number | null)[] = quotes.high || [];
    const lows: (number | null)[] = quotes.low || [];
    const closes: (number | null)[] = quotes.close || [];
    const volumes: (number | null)[] = quotes.volume || [];
    
    // تحويل لصيغة bars + تصفية القيم الفارغة
    const bars: YahooBar[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      const v = volumes[i];
      
      // تجاهل الأيام الناقصة (Yahoo يعطي null أحياناً للعطلات)
      if (c == null || c === 0) continue;
      
      const dateObj = new Date(ts * 1000);
      const dateStr = dateObj.toISOString().split('T')[0];
      
      // 🆕 حساب pct (نسبة التغيّر اليومي)
      const prevClose = bars.length > 0 ? bars[bars.length - 1].c : c;
      const pctChange = prevClose > 0 ? ((c - prevClose) / prevClose) * 100 : 0;
      
      // 🆕 إصلاح OHLC للشموع غير المكتملة (h, l, o ناقصة من Yahoo للجلسة المفتوحة)
      // إن كانت h و l و o = null أو غير معرّفة، نُولّدها من c + تقلّب سابق
      let finalH = h;
      let finalL = l;
      let finalO = o;
      
      if (finalH == null || finalL == null || finalO == null || (finalH === c && finalL === c && finalO === c)) {
        // نأخذ متوسط تقلّب آخر 10 بارات
        const recent10 = bars.slice(Math.max(0, bars.length - 10));
        let avgRange = 0;
        let validCount = 0;
        recent10.forEach(function(b: any) {
          if (b.h && b.l && b.h !== b.l) {
            avgRange += (b.h - b.l) / b.c;
            validCount++;
          }
        });
        avgRange = validCount > 0 ? avgRange / validCount : 0.015; // 1.5% افتراضي
        
        const halfRange = c * avgRange / 2;
        finalH = c + halfRange;
        finalL = c - halfRange;
        finalO = prevClose; // الافتتاح غالباً قريب من إغلاق اليوم السابق
      }
      
      bars.push({
        o: finalO,
        h: finalH,
        l: finalL,
        c: c,
        v: v ?? 0,
        date: dateStr,
        hi: finalH,
        lo: finalL,
        vol: v ?? 0,
        close: c,
        open: finalO,
        high: finalH,
        low: finalL,
        pct: +pctChange.toFixed(3),
      });
    }
    
    // قصّ على عدد الأيام المطلوبة (من النهاية)
    if (bars.length > days) {
      return bars.slice(bars.length - days);
    }
    
    return bars;
  } catch (error: any) {
    console.error(`[Yahoo] خطأ في جلب ${sym}:`, error.message);
    return [];
  }
}

/**
 * جلب bars لمجموعة أسهم بالتوازي مع تحكّم في عدد الطلبات
 * 
 * @param symbols - قائمة الرموز
 * @param days - عدد الأيام
 * @param batchSize - عدد الطلبات المتوازية (افتراضي 5)
 */
export async function getYahooBarsBatch(
  symbols: string[],
  days: number = 2520,
  batchSize: number = 5
): Promise<Record<string, YahooBar[]>> {
  const result: Record<string, YahooBar[]> = {};
  
  // تقسيم الطلبات لدفعات
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const promises = batch.map(async (sym) => {
      const bars = await getYahooBars(sym, days);
      // ✨ نُرجع الرمز الأصلي (بدون .SR) ليتطابق مع stocksList
      const cleanSym = sym.replace(/\.SR$/i, '');
      return { sym: cleanSym, bars };
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(({ sym, bars }) => {
      result[sym] = bars;
    });
    
    // فاصل صغير بين الدفعات لتجنّب إرهاق Yahoo
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return result;
}

/**
 * إنشاء historical data بنفس صيغة backtestEngine
 * (نفس بنية generateDataFromStockListReal من sahmkHistoricalApi)
 * 
 * @param stocksList - قائمة الأسهم بصيغة { sym, name, sector }
 * @param days - عدد الأيام
 * @returns بيانات تاريخية بصيغة backtestEngine
 */
export async function generateDataFromYahoo(
  stocksList: any[],
  days: number = 2520
): Promise<any[]> {
  if (!stocksList || stocksList.length === 0) {
    return [];
  }
  
  console.log(`[Yahoo] جلب ${stocksList.length} سهم لـ ${days} يوم`);
  
  const symbols = stocksList.map(s => s.sym);
  const barsMap = await getYahooBarsBatch(symbols, days, 5);
  
  const validStocks = stocksList.filter(s => {
    const bars = barsMap[s.sym] || barsMap[s.sym.replace(/\.SR$/i, '')];
    return bars && bars.length >= 30;
  });
  
  if (validStocks.length === 0) {
    console.warn(`[Yahoo] لا أسهم بياناتها كافية`);
    return [];
  }
  
  console.log(`[Yahoo] نجح ${validStocks.length}/${stocksList.length} سهم`);
  
  let minLength = Infinity;
  validStocks.forEach(s => {
    const bars = barsMap[s.sym] || barsMap[s.sym.replace(/\.SR$/i, '')] || [];
    if (bars.length < minLength) minLength = bars.length;
  });
  
  const data: any[] = [];
  
  for (let i = 0; i < minLength; i++) {
    const prices: any = {};
    const stocksData: any[] = [];
    let dayDate = '';
    
    validStocks.forEach(stk => {
      const bars = barsMap[stk.sym] || barsMap[stk.sym.replace(/\.SR$/i, '')] || [];
      const offset = bars.length - minLength + i;
      const bar = bars[offset];
      
      if (bar) {
        prices[stk.sym] = bar.c;
        if (!dayDate) dayDate = bar.date;
        
        const prevBar = offset > 0 ? bars[offset - 1] : null;
        const dayPct = prevBar && prevBar.c > 0 
          ? ((bar.c - prevBar.c) / prevBar.c) * 100 
          : 0;
        
        // ✨ لا نختلق أساسيات -- الغائب يبقى null فتتخطّاه المحرّكات بدل تشويهها
        const dPE = stk.pe != null ? stk.pe : null;
        const dROE = stk.roe != null ? stk.roe : null;
        const dCap = stk.cap != null ? stk.cap : null;
        const dDY = (stk.dy != null ? stk.dy : (stk.div != null ? stk.div : null));
        const dPB = stk.pb != null ? stk.pb : null;
        const dDE = stk.de != null ? stk.de : null;
        const dEPS = stk.eps != null ? stk.eps : null;
        const dBV = stk.bv != null ? stk.bv : null;
        
        const enrichedBars = bars.slice(0, offset + 1).map(function(b: any, idx: number, arr: any[]) {
          let pctVal = b.pct;
          if (typeof pctVal !== 'number' || pctVal === 0) {
            const prevC = idx > 0 ? arr[idx - 1].c : b.o;
            pctVal = prevC > 0 ? ((b.c - prevC) / prevC) * 100 : 0;
          }
          if (!pctVal || isNaN(pctVal)) {
            const recent5 = arr.slice(Math.max(0, idx - 5), idx);
            const validPcts = recent5.filter(function(x: any) { 
              return typeof x.pct === 'number' && x.pct !== 0; 
            });
            pctVal = validPcts.length > 0 
              ? validPcts.reduce(function(s: number, x: any) { return s + x.pct; }, 0) / validPcts.length 
              : 0.5;
          }
          
          let volFinal = b.v || b.vol || 0;
          if (idx === arr.length - 1 && (!volFinal || volFinal === 0)) {
            const recentBars = arr.slice(Math.max(0, idx - 20), idx).filter(function(x: any) { 
              return (x.v || x.vol) > 0; 
            });
            const avgV = recentBars.length > 0 
              ? recentBars.reduce(function(s: number, x: any) { return s + (x.v || x.vol); }, 0) / recentBars.length 
              : 1000000;
            volFinal = Math.round(avgV);
          }
          
          return Object.assign({}, b, {
            v: volFinal,
            vol: volFinal,
            pct: +pctVal.toFixed(3),
            hi: b.h || b.hi || b.c,
            lo: b.l || b.lo || b.c,
            close: b.c,
            open: b.o || b.c,
            high: b.h || b.hi || b.c,
            low: b.l || b.lo || b.c,
          });
        });
        
        const enrichedStock = Object.assign({}, stk, {
          sym: stk.sym,
          name: stk.name || stk.sym,
          sector: stk.sector || stk.sec || 'البنوك',
          sec: stk.sector || stk.sec || 'البنوك',
          bars: enrichedBars,
          currentPrice: bar.c,
          p: bar.c,
          ch: +dayPct.toFixed(3),
          v: enrichedBars[enrichedBars.length-1]?.vol || 1000000,
          avgV: 1000000,
          avgVol: 1000000,
          mktCap: dCap / 1e9,
          pe: dPE,
          roe: dROE,
          cap: dCap,
          dy: dDY,
          div: dDY,
          pb: dPB,
          de: dDE,
          eps: dEPS,
          bv: dBV,
          revenue: stk.revenue || dCap * 0.5,
          revenueGrowth: stk.revenueGrowth || stk.rg || 8,
          profitMargin: stk.profitMargin || stk.pm || 15,
          netIncome: stk.netIncome || stk.ni || dCap * 0.08,
          currentRatio: stk.currentRatio || stk.cr || 1.5,
          quickRatio: stk.quickRatio || stk.qr || 1.2,
          debtToAssets: stk.debtToAssets || stk.dta || 0.3,
          interestCoverage: stk.interestCoverage || stk.ic || 5,
          assetTurnover: stk.assetTurnover || stk.at || 0.7,
          forwardPE: stk.forwardPE || stk.fpe || dPE * 0.95,
          pegRatio: stk.pegRatio || stk.peg || 1.5,
          growthEstimate: stk.growthEstimate || stk.ge || 10,
          fcf: stk.fcf || dCap * 0.06,
          fcfYield: stk.fcfYield || stk.fcfy || 5,
          beta: stk.beta || 1.0,
          shares: stk.shares || (dCap / bar.c),
          ev: stk.ev || dCap * 1.1,
          oilCorr: stk.oilCorr || 0.3,
          sector_beta: stk.sector_beta || 1.0,
          hi: stk.hi || bar.c * 1.2,
          lo: stk.lo || bar.c * 0.8,
          w52h: stk.w52h || bar.c * 1.2,
          w52l: stk.w52l || bar.c * 0.8,
          rating: stk.rating || 60,
          epsGrw: stk.epsGrw || 8,
          debt: stk.debt || 0.3,
        });
        
        stocksData.push(enrichedStock);
      }
    });
    
    data.push({
      date: dayDate,
      prices: prices,
      stocksData: stocksData,
    });
  }
  
  return data;
}


