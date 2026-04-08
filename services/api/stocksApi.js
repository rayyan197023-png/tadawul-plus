/**
 * STOCKS API SERVICE
 *
 * All stock-specific data fetching.
 * OHLC bars, analyst ratings, financial data.
 *
 * Components NEVER call fetch directly.
 */

import config          from '../../constants/config';
import { STOCKS_MAP }  from '../../constants/stocksData';
import { createStock } from '../../constants/stockModel';
import {
  fetchBulkQuotes,
  fetchOHLCHistory,
  fetchFundamentals,
  periodToEODHDParams,
} from './eodhdApi';

// ══════════════════════════════════════════════════════════
// SIMULATION LAYER — DEMO MODE ONLY
//
// The functions in this section (seedRng, generateOHLCBars)
// are ONLY used when config.isDemo === true.
//
// In production (config.isLive === true):
//   → fetchOHLCBars() calls EODHD API
//   → generateOHLCBars() is never called
//
// To activate production: set NEXT_PUBLIC_EODHD_KEY in Vercel.
// ══════════════════════════════════════════════════════════

// ── Seeded random for deterministic simulation
function seedRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * Generate deterministic OHLC bars for a stock.
 * Used in simulation mode — same stock always gets same bars.
 *
 * @param {Stock} stk
 * @param {number} days
 * @returns {OHLCBar[]}
 */
/**
 * [DEMO MODE ONLY] Generate deterministic OHLC bars using GBM with:
 * - Mean reversion (Ornstein-Uhlenbeck process) — prices revert toward fair value
 * - Volatility clustering (GARCH-like) — high vol follows high vol
 * - Fat-tailed noise (mixture of normals) — extreme moves more likely
 *
 * @param {Stock} stk
 * @param {number} days
 * @returns {OHLCBar[]}
 */
export function generateOHLCBars(stk, days = 60) {
  const rng      = seedRng(parseInt(stk.sym, 10) * 997 + 13);
  const bars     = [];
  const avgVol   = stk.avgV || stk.v || 1_000_000;

  // Start price: back-calculate from current price and total % change
  let   price    = stk.p * (1 - stk.pct / 100);
  const target   = stk.p; // mean reversion target = current price
  const baseVol  = 0.012; // base daily volatility (~1.2%)
  let   vol      = baseVol; // current volatility (for clustering)

  for (let i = 0; i < days; i++) {
    // ── Mean reversion (Ornstein-Uhlenbeck)
    // theta = speed of reversion (0.05 = slow, 0.15 = fast)
    const theta     = 0.08;
    const revForce  = theta * (target - price) / price; // pulls price toward target

    // ── Drift (total % change divided evenly across days)
    const drift     = (stk.pct / 100) / days;

    // ── Volatility clustering (GARCH-like)
    // vol_{t} = alpha * |return_{t-1}| + (1-alpha) * baseVol
    const alpha     = 0.25;
    const lastRet   = bars.length > 0 ? Math.abs(bars[bars.length-1].pct / 100) : baseVol;
    vol             = alpha * lastRet + (1 - alpha) * baseVol;
    vol             = Math.max(baseVol * 0.5, Math.min(vol, baseVol * 3)); // clamp

    // ── Fat-tailed noise (mixture: 90% normal, 10% large move)
    let noise;
    if (rng() > 0.90) {
      // Fat tail: 3-5x normal move
      noise = (rng() - 0.5) * vol * (3 + rng() * 2);
    } else {
      // Standard: Box-Muller for normal distribution
      const u1 = Math.max(1e-10, rng()), u2 = rng();
      const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      noise = normal * vol;
    }

    const change = drift + revForce + noise;
    const open   = price;
    const close  = Math.max(0.01, price * (1 + change));

    // Intraday range: wider on high-vol days
    const spreadMult = 0.005 + vol * 0.5;
    const hi   = Math.max(open, close) * (1 + rng() * spreadMult);
    const lo   = Math.min(open, close) * (1 - rng() * spreadMult);

    // Volume: spikes on large moves (news/institutional activity)
    const volMult = 0.5 + rng() * 0.8 + Math.abs(change) * 12;
    const vol_out = Math.round(avgVol * Math.max(0.2, volMult));

    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    const dateStr = d.toISOString().slice(0, 10);

    bars.push({
      d:   dateStr,
      o:   +open.toFixed(2),
      hi:  +hi.toFixed(2),
      lo:  +lo.toFixed(2),
      c:   +close.toFixed(2),
      vol: vol_out,
      pct: +(change * 100).toFixed(2),
    });
    price = close;
  }

  // Anchor last bar to exact current price (ensures consistency with stock card display)
  if (bars.length > 0) {
    const last = bars[bars.length - 1];
    last.c  = stk.p;
    last.hi = Math.max(last.hi, stk.p);
    last.lo = Math.min(last.lo, stk.p);
  }
  return bars;
}

/**
 * Fetch OHLC bars for a stock symbol
 * @param {string} sym
 * @param {'1D'|'1W'|'1M'|'3M'|'1Y'} period
 * @returns {Promise<OHLCBar[]>}
 */
export async function fetchOHLCBars(sym, period = '3M', signal) {
  const daysMap = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
  const days    = daysMap[period] ?? 90;

  try {
    // ── Production: real EODHD OHLC data
    if (config.isLive && config.features.liveMarketData && config.eodhdApiKey) {
      const params = periodToEODHDParams(period);
      const bars   = await fetchOHLCHistory(sym, params, signal);
      if (bars.length > 0) return bars;
      // If EODHD returns empty (market closed / new symbol), fall back
    }
  } catch (err) {
    console.warn(`[stocksApi] EODHD fetchOHLCBars(${sym}) failed:`, err.message);
  }

  // ── Demo/fallback: GBM simulation
  const stk = STOCKS_MAP[sym];
  return stk ? generateOHLCBars(stk, Math.min(days + 28, 120)) : [];
}

/**
 * Fetch single stock full detail
 * @param {string} sym
 * @returns {Promise<Stock>}
 */
export async function fetchStockDetail(sym) {
  try {
    if (config.isLive && config.features.liveMarketData) {
      const res = await fetch(`${config.sahmkBaseUrl}/stock/${sym}`);
      if (!res.ok) throw new Error(`Stock fetch failed: ${res.status}`);
      return res.json();
    }
    return STOCKS_MAP[sym] ?? null;
  } catch (err) {
    console.warn(`[stocksApi] fetchStockDetail(${sym}) failed:`, err.message);
    return STOCKS_MAP[sym] ?? null;
  }
}

/**
 * Fetch all stocks list with live prices
 * @returns {Promise<Stock[]>}
 */
export async function fetchAllStocks(signal) {
  try {
    // ── Production: fetch live quotes for all symbols in ONE call
    if (config.isLive && config.features.liveMarketData && config.eodhdApiKey) {
      const syms   = Object.keys(STOCKS_MAP);
      const quotes = await fetchBulkQuotes(syms, signal);
      
      return syms.map(sym => {
        const seed  = STOCKS_MAP[sym];
        const quote = quotes.find(q => q?.sym === sym);
        if (!seed) return null;
        // Merge live price on top of seed fundamentals
        return createStock(quote ? { ...seed, ...quote } : seed);
      }).filter(Boolean);
    }
  } catch (err) {
    console.warn('[stocksApi] EODHD fetchAllStocks failed:', err.message);
  }
  // ── Demo/fallback: seed data
  return Object.values(STOCKS_MAP);
}

/**
 * Call Claude AI via proxy for stock analysis
 * No API key in component — all goes through proxy
 *
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
/**
 * @param {string} prompt
 * @param {number} maxTokens
 * @param {AbortSignal} [signal] - optional AbortController signal
 * @returns {Promise<string>}
 */
export async function fetchAIAnalysis(prompt, maxTokens = 1200, signal = undefined) {
  const res = await fetch(config.claudeProxyUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      max_tokens: Math.min(maxTokens, 4000),
      messages:   [{ role: 'user', content: String(prompt).slice(0, 12000) }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message ?? `API error ${res.status}`;
    // Preserve status code for caller (rate limit detection)
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  if (!text) throw new Error('Empty response from AI');
  return text;
}
