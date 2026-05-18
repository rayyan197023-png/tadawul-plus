/**
 * @module services/api/sahmkHistoricalApi
 * @description جلب البيانات التاريخية الحقيقية من sahmk.sa
 *
 * يحل محل genBars الوهمية في:
 * - backtestEngine.ts → generateDataFromPortfolio / generateDataFromStockList
 * - rebalancingEngine.ts → genBars calls
 *
 * Endpoint المستخدم:
 * GET /api/v1/historical/{symbol}/?from=YYYY-MM-DD&to=YYYY-MM-DD&interval=1d
 *
 * متطلبات: Starter plan أو أعلى
 */

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const SAHMK_KEY = process.env.NEXT_PUBLIC_SAHMK_KEY ?? process.env.SAHMK_KEY ?? '';

function buildSahmkUrl(path, params = {}) {
  const url = new URL(`${SAHMK_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, String(v));
  });
  return url.toString();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function mapSahmkBar(bar, prevClose) {
  const c   = parseFloat(bar.close  ?? bar.c ?? 0);
  const o   = parseFloat(bar.open   ?? bar.o ?? c);
  const hi  = parseFloat(bar.high   ?? bar.h ?? c);
  const lo  = parseFloat(bar.low    ?? bar.l ?? c);
  const vol = parseInt(bar.volume   ?? bar.v ?? 0, 10);
  const pct = prevClose && prevClose > 0
    ? parseFloat(((c - prevClose) / prevClose * 100).toFixed(2))
    : 0;
  const t = bar.date ? new Date(bar.date).getTime() : Date.now();
  return { t, d: bar.date ?? '', o, hi, lo, c, vol, pct };
}

export async function fetchHistoricalBars(symbol, days = 252, interval = '1d') {
  if (!symbol) return [];
  
  // sahmk يدعم 1Y فقط للبيانات التاريخية الكاملة
  // (1D = شمعة واحدة، 1W = 5 شموع، 1Y = 249 شمعة)
  const period = '1Y';
  
  try {
    const res = await fetch(`/api/sahmkdata?endpoint=ohlcv&sym=${symbol}&period=${period}`);
    
    if (!res.ok) {
      console.warn(`[sahmkHistorical] ${symbol}: HTTP ${res.status}`);
      return [];
    }
    
    const data = await res.json();
    const rawBars = data.bars || data.data || data.ohlcv || [];
    
    if (!Array.isArray(rawBars) || rawBars.length === 0) {
      console.warn(`[sahmkHistorical] ${symbol}: empty bars`);
      return [];
    }
    
    // تطبيع التواريخ
    rawBars.sort((a, b) => {
      const da = new Date(a.date || a.t || a.time || 0);
      const db = new Date(b.date || b.t || b.time || 0);
      return da - db;
    });
    
    // تحويل لتنسيق التطبيق
    const bars = [];
    for (let i = 0; i < rawBars.length; i++) {
      bars.push(mapSahmkBar(rawBars[i], i > 0 ? bars[i - 1].c : null));
    }
    
    // إرجاع آخر N يوم فقط
    return bars.slice(-days);
  } catch (e) {
    console.warn(`[sahmkHistorical] ${symbol} error:`, e.message);
    return [];
  }
}

export async function fetchHistoricalBarsBulk(symbols, days = 252) {
  if (!symbols || symbols.length === 0) return {};
  
  const BATCH_SIZE = 3;        // ⬇️ من 5 إلى 3 (أرفق على sahmk)
  const BATCH_DELAY_MS = 500;  // ⬆️ من 200 إلى 500 (delay أطول)
  const result = {};
  
  console.log(`[sahmkBulk] جلب ${symbols.length} سهم في batches من ${BATCH_SIZE}`);

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(symbols.length / BATCH_SIZE);
    
    console.log(`[sahmkBulk] batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`);
    
    const batchResults = await Promise.allSettled(
      batch.map(sym => fetchHistoricalBars(sym, days))
    );
    
    batch.forEach((sym, idx) => {
      const r = batchResults[idx];
      if (r.status === 'fulfilled') {
        result[sym] = r.value;
      } else {
        console.warn(`[sahmkBulk] ${sym} failed:`, r.reason?.message);
        result[sym] = [];
      }
    });
    
    // delay قبل الـ batch التالي (إلا إذا كان الأخير)
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
  
  // تقرير النتائج
  const successCount = Object.values(result).filter(bars => bars.length > 0).length;
  console.log(`[sahmkBulk] نجح: ${successCount}/${symbols.length} سهم`);
  
  return result;
}

export async function fetchBarsForBacktest(symOrStk, days = 252) {
  const symbol = typeof symOrStk === 'string'
    ? symOrStk
    : (symOrStk?.sym ?? symOrStk?.symbol ?? '');
  if (!symbol) return [];
  return fetchHistoricalBars(symbol, days);
}

export async function generateRealDataFromPortfolio(positions, days = 252) {
  if (!positions || positions.length === 0) return [];

  const symbols     = positions.map(p => p.sym).filter(Boolean);
  const stocksBars  = await fetchHistoricalBarsBulk(symbols, days);
  const validSyms   = symbols.filter(sym => stocksBars[sym]?.length > 10);
  if (validSyms.length === 0) return [];

  const minLen = Math.min(...validSyms.map(sym => stocksBars[sym].length));
  const data   = [];

  for (let i = 0; i < minLen; i++) {
    const prices = {}, stocksData = [];
    for (const sym of validSyms) {
      const bars = stocksBars[sym];
      const bar  = bars[bars.length - minLen + i];
      if (!bar) continue;
      prices[sym] = bar.c;
      const pos = positions.find(p => p.sym === sym);
      stocksData.push({
        sym,
        name: pos?.stk?.name ?? sym,
        sector: pos?.stk?.sec ?? '',
        bars: bars.slice(0, bars.length - minLen + i + 1),
        currentPrice: bar.c,
        targetWeight: pos?.weight ?? (1 / validSyms.length),
      });
    }
    data.push({
      date: stocksBars[validSyms[0]][stocksBars[validSyms[0]].length - minLen + i]?.d ?? '',
      prices,
      stocksData,
    });
  }
  return data;
}

export async function generateRealDataFromStockList(stocksList, days = 252, maxStocks = 15) {
  if (!stocksList || stocksList.length === 0) return [];

  const selected   = stocksList.slice(0, maxStocks);
  const symbols    = selected.map(s => s.sym).filter(Boolean);
  const stocksBars = await fetchHistoricalBarsBulk(symbols, days);
  const validSyms  = symbols.filter(sym => stocksBars[sym]?.length > 10);
  if (validSyms.length === 0) return [];

  const minLen = Math.min(...validSyms.map(sym => stocksBars[sym].length));
  const data   = [];

  for (let i = 0; i < minLen; i++) {
    const prices = {}, stocksData = [];
    for (const sym of validSyms) {
      const bars = stocksBars[sym];
      const bar  = bars[bars.length - minLen + i];
      if (!bar) continue;
      prices[sym] = bar.c;
      const stk = selected.find(s => s.sym === sym);
      stocksData.push({
        sym,
        name: stk?.name ?? sym,
        sector: stk?.sec ?? '',
        bars: bars.slice(0, bars.length - minLen + i + 1),
        currentPrice: bar.c,
      });
    }
    data.push({
      date: stocksBars[validSyms[0]][stocksBars[validSyms[0]].length - minLen + i]?.d ?? '',
      prices,
      stocksData,
    });
  }
  return data;
}

export async function sahmkHistoricalHandler(request) {
  const { searchParams } = new URL(request.url);
  const symbol   = searchParams.get('symbol');
  const days     = parseInt(searchParams.get('days') ?? '252', 10);
  const interval = searchParams.get('interval') ?? '1d';

  if (!symbol) {
    return Response.json({ error: 'symbol مطلوب' }, { status: 400 });
  }

  const bars = await fetchHistoricalBars(symbol, days, interval);
  return Response.json(
    { symbol, bars, count: bars.length },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
