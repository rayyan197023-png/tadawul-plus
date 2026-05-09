/**
 * @module services/api/eodhdApi
 * @description EODHD Market Data API -- جاهز للربط
 *
 * الحالة الحالية: stub functions ترجع null
 * عند الاشتراك: ضع NEXT_PUBLIC_EODHD_KEY في Vercel وستعمل تلقائياً
 *
 * التوثيق: https://eodhd.com/financial-apis/
 */

const API_KEY = process.env.NEXT_PUBLIC_EODHD_KEY ?? '';

const BASE_URL = 'https://eodhd.com/api';
const EXCHANGE = 'SR';

const hasKey = () => !!(API_KEY && API_KEY.length > 10);

const buildUrl = (path, params = {}) => {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('api_token', API_KEY);
  url.searchParams.set('fmt', 'json');
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });
  return url.toString();
};

const apiFetch = async (url, signal, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const combinedSignal = signal || controller.signal;
  try {
    const res = await fetch(url, { signal: combinedSignal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`EODHD HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
};

const toEODHDTicker = (sym) => {
  if (!sym) return null;
  if (sym.includes('.')) return sym;
  return `${sym}.${EXCHANGE}`;
};

const mapFundamentals = (data) => {
  if (!data) return null;
  const g = data.General || {};
  const h = data.Highlights || {};
  const v = data.Valuation || {};
  const s = data.SharesStats || {};
  const d = data.SplitsDividends || {};
  const t = data.Technicals || {};
  return {
    name:         g.Name,
    sec:          g.Sector,
    subsec:       g.Industry,
    description:  g.Description,
    website:      g.WebURL,
    listedYear:   g.IPODate ? new Date(g.IPODate).getFullYear() : null,
    mc:           h.MarketCapitalization ? (h.MarketCapitalization / 1e12).toFixed(2) + 'T' : null,
    mcNum:        h.MarketCapitalization,
    pe:           h.PERatio           ? parseFloat(h.PERatio)           : null,
    forwardPE:    h.ForwardPE         ? parseFloat(h.ForwardPE)         : null,
    eps:          h.EarningsShare     ? parseFloat(h.EarningsShare)     : null,
    epsForward:   h.EPSEstimateNextYear ? parseFloat(h.EPSEstimateNextYear) : null,
    bvps:         h.BookValue         ? parseFloat(h.BookValue)         : null,
    pb:           v.PriceBookMRQ      ? parseFloat(v.PriceBookMRQ)      : null,
    ps:           v.PriceSalesTTM     ? parseFloat(v.PriceSalesTTM)     : null,
    evebitda:     v.EnterpriseValueEbitda ? parseFloat(v.EnterpriseValueEbitda) : null,
    roe:          h.ReturnOnEquityTTM  ? parseFloat((h.ReturnOnEquityTTM  * 100).toFixed(2)) : null,
    roa:          h.ReturnOnAssetsTTM  ? parseFloat((h.ReturnOnAssetsTTM  * 100).toFixed(2)) : null,
    grossMargin:  h.GrossProfitTTM && h.RevenueTTM ? parseFloat((h.GrossProfitTTM / h.RevenueTTM * 100).toFixed(2)) : null,
    opMargin:     h.OperatingMarginTTM ? parseFloat((h.OperatingMarginTTM * 100).toFixed(2)) : null,
    netMargin:    h.ProfitMargin       ? parseFloat((h.ProfitMargin       * 100).toFixed(2)) : null,
    rev:          h.RevenueTTM        ? Math.round(h.RevenueTTM / 1e6)  : null,
    revGrowthYoY: h.RevenueGrowthQuarterlyYoy ? parseFloat((h.RevenueGrowthQuarterlyYoy * 100).toFixed(2)) : null,
    net:          h.NetIncomeTTM      ? Math.round(h.NetIncomeTTM / 1e6): null,
    ebitda:       h.EBITDA            ? Math.round(h.EBITDA / 1e6)      : null,
    beta:         t.Beta              ? parseFloat(t.Beta)              : null,
    hi52:         t['52WeekHigh']     ? parseFloat(t['52WeekHigh'])     : null,
    lo52:         t['52WeekLow']      ? parseFloat(t['52WeekLow'])      : null,
    ma50:         t['50DayMA']        ? parseFloat(t['50DayMA'])        : null,
    ma200:        t['200DayMA']       ? parseFloat(t['200DayMA'])       : null,
    shares:       s.SharesOutstanding ? (s.SharesOutstanding / 1e9).toFixed(2) + 'B' : null,
    floatPct:     s.SharesFloat && s.SharesOutstanding ? parseFloat((s.SharesFloat / s.SharesOutstanding * 100).toFixed(2)) : null,
    div:          d.ForwardAnnualDividendRate  ? parseFloat(d.ForwardAnnualDividendRate)           : null,
    divYld:       d.ForwardAnnualDividendYield ? parseFloat((d.ForwardAnnualDividendYield * 100).toFixed(2)) : null,
    payoutRatio:  d.PayoutRatio       ? parseFloat((d.PayoutRatio * 100).toFixed(2)) : null,
    exDivDate:    d.ExDividendDate    || null,
  };
};

const mapRealTimeQuote = (data) => {
  if (!data) return null;
  return {
    p:        data.close        ? parseFloat(data.close)                        : null,
    ch:       data.change       ? parseFloat(data.change)                       : null,
    pct:      data.change_p     ? parseFloat(data.change_p)                     : null,
    o:        data.open         ? parseFloat(data.open)                         : null,
    dayHi:    data.high         ? parseFloat(data.high)                         : null,
    dayLo:    data.low          ? parseFloat(data.low)                          : null,
    prev:     data.previousClose? parseFloat(data.previousClose)                : null,
    v:        data.volume       ? parseInt(data.volume)                         : null,
    vwap:     data.vwap         ? parseFloat(data.vwap)                         : null,
    updatedAt: data.timestamp   ? new Date(data.timestamp * 1000).toISOString() : null,
  };
};

export async function fetchRealTimeQuote(sym, signal) {
  if (!hasKey()) { console.info('[EODHD] لا يوجد API key'); return null; }
  try {
    const ticker = toEODHDTicker(sym);
    const url = buildUrl(`/real-time/${ticker}`, { s: ticker });
    const data = await apiFetch(url, signal);
    return mapRealTimeQuote(data);
  } catch (e) { console.warn('[EODHD] fetchRealTimeQuote:', e.message); return null; }
}

export async function fetchBulkQuotes(syms, signal) {
  if (!hasKey() || !syms?.length) return [];
  try {
    const tickers = syms.map(toEODHDTicker).join(',');
    const url = buildUrl(`/real-time/${syms[0]}.${EXCHANGE}`, { s: tickers });
    const data = await apiFetch(url, signal);
    const arr = Array.isArray(data) ? data : [data];
    return arr.map(mapRealTimeQuote).filter(Boolean);
  } catch (e) { console.warn('[EODHD] fetchBulkQuotes:', e.message); return []; }
}

export async function fetchOHLCHistory(sym, params = {}, signal) {
  if (!hasKey()) return [];
  try {
    const ticker = toEODHDTicker(sym);
    const url = buildUrl(`/eod/${ticker}`, { from: params.from, to: params.to, period: params.period || 'd' });
    const data = await apiFetch(url, signal);
    if (!Array.isArray(data)) return [];
    return data.map(bar => ({ date: bar.date, o: parseFloat(bar.open), h: parseFloat(bar.high), l: parseFloat(bar.low), c: parseFloat(bar.close), v: parseInt(bar.volume) }));
  } catch (e) { console.warn('[EODHD] fetchOHLCHistory:', e.message); return []; }
}

export async function fetchFundamentals(sym, signal) {
  if (!hasKey()) { console.info('[EODHD] لا يوجد API key'); return null; }
  try {
    const ticker = toEODHDTicker(sym);
    const url = buildUrl(`/fundamentals/${ticker}`);
    const data = await apiFetch(url, signal);
    return mapFundamentals(data);
  } catch (e) { console.warn('[EODHD] fetchFundamentals:', e.message); return null; }
}

export async function fetchTASIIndex(signal) {
  if (!hasKey()) return null;
  try {
    const url = buildUrl('/real-time/TASI.SR');
    const data = await apiFetch(url, signal);
    return mapRealTimeQuote(data);
  } catch (e) { console.warn('[EODHD] fetchTASIIndex:', e.message); return null; }
}

export function periodToEODHDParams(period) {
  const now = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  const sub = (d, days) => { const x = new Date(d); x.setDate(x.getDate() - days); return x; };
  switch (period) {
    case '1D': return { from: fmt(sub(now, 1)),    to: fmt(now), period: 'd' };
    case '1W': return { from: fmt(sub(now, 7)),    to: fmt(now), period: 'd' };
    case '1M': return { from: fmt(sub(now, 30)),   to: fmt(now), period: 'd' };
    case '3M': return { from: fmt(sub(now, 90)),   to: fmt(now), period: 'd' };
    case '6M': return { from: fmt(sub(now, 180)),  to: fmt(now), period: 'w' };
    case '1Y': return { from: fmt(sub(now, 365)),  to: fmt(now), period: 'w' };
    case '5Y': return { from: fmt(sub(now, 1825)), to: fmt(now), period: 'm' };
    default:   return { from: fmt(sub(now, 90)),   to: fmt(now), period: 'd' };
  }
}
