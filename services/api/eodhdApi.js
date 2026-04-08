/**
 * EODHD API SERVICE
 *
 * Real market data for Saudi Exchange (Tadawul).
 * All symbols use format: {symbol}.SR (e.g., 2222.SR for Aramco)
 *
 * API Key: stored in NEXT_PUBLIC_EODHD_KEY (never hardcoded here)
 * Base URL: https://eodhd.com/api
 *
 * Free tier limits:
 *   - 20 API calls/day
 *   - Real-time quotes: 1 call = 1 symbol
 *   - End-of-day OHLC: 1 call = 1 symbol × unlimited history
 *   - Bulk last-day: 1 call = entire exchange (requires paid plan)
 *
 * Endpoints used:
 *   /real-time/{sym}.SR   → live price, change, volume
 *   /eod/{sym}.SR         → OHLC history (for chart)
 *   /fundamentals/{sym}.SR → financials (eps, pe, dividends)
 */

import config from '../../constants/config';

// ── Saudi Exchange suffix
const SR = '.SR';
const BASE = config.eodhdBaseUrl;    // 'https://eodhd.com/api'
const KEY  = config.eodhdApiKey;     // process.env.NEXT_PUBLIC_EODHD_KEY

// ── Validate key present
function assertKey() {
  if (!KEY) throw new Error('EODHD_KEY not set — add NEXT_PUBLIC_EODHD_KEY to environment variables');
}

// ── Build URL with auth
function url(path, params = {}) {
  const q = new URLSearchParams({ api_token: KEY, fmt: 'json', ...params });
  return `${BASE}${path}?${q}`;
}

// ── Safe fetch with timeout
async function safeFetch(endpoint, signal) {
  assertKey();
  const controller = signal ? null : new AbortController();
  const fetchSignal = signal ?? controller?.signal;
  const timeout = controller ? setTimeout(() => controller.abort(), 10_000) : null;
  try {
    const res = await fetch(endpoint, { signal: fetchSignal });
    if (!res.ok) throw new Error(`EODHD ${res.status}: ${await res.text().catch(()=>'')}`);
    return await res.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

// ══════════════════════════════════════════════════
// 1. REAL-TIME QUOTE — single stock
//    Returns: { code, timestamp, open, high, low, close,
//               volume, previousClose, change, change_p }
// ══════════════════════════════════════════════════
export async function fetchRealTimeQuote(sym, signal) {
  const data = await safeFetch(url(`/real-time/${sym}${SR}`), signal);
  return normalizeQuote(sym, data);
}

// ══════════════════════════════════════════════════
// 2. BULK REAL-TIME — all 12 stocks in ONE call
//    EODHD allows comma-separated symbols in real-time endpoint
// ══════════════════════════════════════════════════
export async function fetchBulkQuotes(syms, signal) {
  // EODHD bulk: /real-time/2222.SR?s=1120.SR,2010.SR,...
  const [first, ...rest] = syms;
  const s = rest.map(sym => `${sym}${SR}`).join(',');
  const endpoint = url(`/real-time/${first}${SR}`, rest.length ? { s } : {});
  const data = await safeFetch(endpoint, signal);
  // Returns array when multiple symbols
  const arr = Array.isArray(data) ? data : [data];
  return arr.map(d => normalizeQuote(d.code?.replace(SR,'') ?? first, d));
}

// ══════════════════════════════════════════════════
// 3. OHLC HISTORY — for chart
//    period: 'd' (daily), 'w' (weekly), 'm' (monthly)
//    from/to: 'YYYY-MM-DD'
// ══════════════════════════════════════════════════
export async function fetchOHLCHistory(sym, { from, to, period = 'd' } = {}, signal) {
  const params = { period };
  if (from) params.from = from;
  if (to)   params.to   = to;
  const data = await safeFetch(url(`/eod/${sym}${SR}`, params), signal);
  return (Array.isArray(data) ? data : []).map(bar => ({
    d:   bar.date,
    o:   +bar.open,
    hi:  +bar.high,
    lo:  +bar.low,
    c:   +bar.close,
    vol: +bar.volume,
    pct: bar.close && bar.open ? +((bar.close - bar.open) / bar.open * 100).toFixed(2) : 0,
  }));
}

// ══════════════════════════════════════════════════
// 4. FUNDAMENTALS — financials, ratios
//    Returns rich object with highlights
// ══════════════════════════════════════════════════
export async function fetchFundamentals(sym, signal) {
  const data = await safeFetch(url(`/fundamentals/${sym}${SR}`), signal);
  return normalizeFundamentals(sym, data);
}

// ══════════════════════════════════════════════════
// 5. TASI INDEX — ^TASI or market index
// ══════════════════════════════════════════════════
export async function fetchTASIIndex(signal) {
  try {
    // EODHD index format: TASI.SR or ^TASI
    const data = await safeFetch(url('/real-time/TASI.SR'), signal);
    return {
      value:  +(data.close ?? data.last ?? 0),
      change: +(data.change ?? 0),
      pct:    +(data.change_p ?? 0),
    };
  } catch {
    return null; // fallback to simulation
  }
}

// ══════════════════════════════════════════════════
// NORMALIZERS — convert EODHD response → our stock shape
// ══════════════════════════════════════════════════

/**
 * Normalize real-time quote to partial stock update
 * Only updates live fields — fundamentals come from seed data
 */
function normalizeQuote(sym, raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    sym,
    // Live price fields
    p:   +(raw.close    ?? raw.last ?? 0),
    o:   +(raw.open     ?? 0),
    hi:  +(raw.high     ?? 0),
    lo:  +(raw.low      ?? 0),
    v:   +(raw.volume   ?? 0),
    ch:  +(raw.change   ?? 0),
    pct: +(raw.change_p ?? 0),
    prev:+(raw.previousClose ?? 0),
    // Metadata
    _source:    'eodhd-live',
    _timestamp: raw.timestamp ? raw.timestamp * 1000 : Date.now(),
  };
}

/**
 * Normalize fundamentals to update seed stock data
 * Fills in the 22 fields that were showing — in UI
 */
function normalizeFundamentals(sym, raw) {
  if (!raw || typeof raw !== 'object') return null;

  const H  = raw.Highlights             ?? {};
  const V  = raw.Valuation              ?? {};
  const SR = raw.SharesStats            ?? {};
  const FI = raw.Financials?.Income_Statement?.quarterly ?? {};
  const FB = raw.Financials?.Balance_Sheet?.quarterly    ?? {};
  const FC = raw.Financials?.Cash_Flow?.quarterly        ?? {};

  // Helper: get most recent quarterly value
  const recentQ = (obj) => {
    const keys = Object.keys(obj ?? {}).sort().reverse();
    return obj[keys[0]] ?? {};
  };

  const latestIncome  = recentQ(FI);
  const latestBalance = recentQ(FB);
  const latestCF      = recentQ(FC);

  return {
    sym,
    // Profitability
    eps:         H.EarningsShare    ? +H.EarningsShare    : null,
    pe:          H.PERatio          ? +H.PERatio          : null,
    pb:          H.PriceBookMRQ     ? +H.PriceBookMRQ     : null,
    roe:         H.ReturnOnEquityTTM  ? +(H.ReturnOnEquityTTM  * 100).toFixed(1) : null,
    roa:         H.ReturnOnAssetsTTM  ? +(H.ReturnOnAssetsTTM  * 100).toFixed(1) : null,
    divY:        H.DividendYield    ? +(H.DividendYield * 100).toFixed(2)        : null,
    mktCap:      H.MarketCapitalizationMln ? +H.MarketCapitalizationMln          : null,

    // Margins (the 22 missing fields!)
    net_margin:  H.ProfitMargin     ? +(H.ProfitMargin     * 100).toFixed(1)     : null,
    grossMargin: H.GrossProfitTTM && H.RevenueTTM
                 ? +(H.GrossProfitTTM / H.RevenueTTM * 100).toFixed(1)           : null,
    opMargin:    H.OperatingMarginTTM ? +(H.OperatingMarginTTM * 100).toFixed(1) : null,

    // Valuation
    ev:          V.EnterpriseValue  ? +V.EnterpriseValue                         : null,
    evebitda:    V.EnterpriseValueEbitda ? +V.EnterpriseValueEbitda              : null,
    forwardPE:   V.ForwardPE        ? +V.ForwardPE                               : null,

    // Growth
    revGrw:      H.QuarterlyRevenueGrowthYOY
                 ? +(H.QuarterlyRevenueGrowthYOY * 100).toFixed(1)               : null,
    epsGrw:      H.QuarterlyEarningsGrowthYOY
                 ? +(H.QuarterlyEarningsGrowthYOY * 100).toFixed(1)              : null,

    // Shares
    sharesOutstanding: SR.SharesOutstanding ? +SR.SharesOutstanding              : null,
    floatPct:    SR.PercentInsiders
                 ? +(100 - SR.PercentInsiders * 100).toFixed(1)                  : null,

    // Balance sheet
    debt:        latestBalance.longTermDebt && latestBalance.totalStockholderEquity
                 ? +(latestBalance.longTermDebt / latestBalance.totalStockholderEquity).toFixed(2) : null,
    freeCashFlow:latestCF.freeCashFlow ? +(latestCF.freeCashFlow / 1e9).toFixed(2) : null,

    // Dividend
    divStreak:   H.DividendShare     ? Math.round(H.DividendShare)               : null,
    payoutRatio: H.PayoutRatio       ? +(H.PayoutRatio * 100).toFixed(1)         : null,

    _source:    'eodhd-fundamentals',
    _timestamp: Date.now(),
  };
}

// ══════════════════════════════════════════════════
// HELPER: convert period string → EODHD params
// ══════════════════════════════════════════════════
export function periodToEODHDParams(period) {
  const now = new Date();
  const fmt  = d => d.toISOString().slice(0,10);
  const sub  = (d, days) => { const x=new Date(d); x.setDate(x.getDate()-days); return x; };
  switch(period) {
    case '1D':  return { from: fmt(sub(now,1)),   to: fmt(now), period:'d' };
    case '1W':  return { from: fmt(sub(now,7)),   to: fmt(now), period:'d' };
    case '1M':  return { from: fmt(sub(now,30)),  to: fmt(now), period:'d' };
    case '3M':  return { from: fmt(sub(now,90)),  to: fmt(now), period:'d' };
    case '6M':  return { from: fmt(sub(now,180)), to: fmt(now), period:'w' };
    case '1Y':  return { from: fmt(sub(now,365)), to: fmt(now), period:'w' };
    default:    return { from: fmt(sub(now,90)),  to: fmt(now), period:'d' };
  }
}
