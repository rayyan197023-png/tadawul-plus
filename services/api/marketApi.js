/**
 * MARKET API SERVICE
 *
 * DATA STATUS (honest):
 *   Demo mode:       returns seed data from constants/stocksData.js
 *   Production mode: calls EODHD API (requires NEXT_PUBLIC_EODHD_KEY)
 *
 * Current mode: config.runMode (see constants/config.js)
 *
 * All market data fetching lives here.
 * Components NEVER call fetch directly.
 *
 * Currently: returns seed data (simulation mode).
 * Future: replace return statements with real API calls.
 * Shape of returned data never changes — only the source changes.
 */

import config          from '../../constants/config';
import { STOCKS }      from '../../constants/stocksData';
import { createStock } from '../../constants/stockModel';

// ── Simulate network latency in dev
const SIMULATE_DELAY = 400;
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Fetch current market indices (TASI, Nomu)
 * @returns {Promise<Array<MarketIndex>>}
 */
export async function fetchIndices() {
  if (config.isLive && config.features.liveMarketData) {
    // INTEGRATION: Replace with EODHD bulk endpoint when NEXT_PUBLIC_EODHD_KEY is set
    // const res = await fetch(`${config.sahmkBaseUrl}/indices`);
    // return res.json();
  }

  await delay(SIMULATE_DELAY);
  return [
    { id: 'tasi',  name: 'تاسي',  value: 11842.3, pct:  0.84, ch:  98.8 },
    { id: 'nomu',  name: 'نمو',   value:  3124.8, pct:  1.12, ch:  34.6 },
  ];
}

/**
 * Fetch all sector performance
 * @returns {Promise<Array<Sector>>}
 */
export async function fetchSectors() {
  if (config.isLive && config.features.liveMarketData) {
    // INTEGRATION: Live data via EODHD API — auto-activates with NEXT_PUBLIC_EODHD_KEY
  }

  await delay(SIMULATE_DELAY);
  return [
    { id: 'banks',        name: 'البنوك',           pct:  1.8, w: 22 },
    { id: 'energy',       name: 'الطاقة',            pct:  2.1, w: 18 },
    { id: 'petro',        name: 'البتروكيماويات',   pct: -0.5, w: 15 },
    { id: 'telecom',      name: 'الاتصالات',         pct:  0.9, w: 12 },
    { id: 'retail',       name: 'التجزئة',           pct:  3.2, w: 10 },
    { id: 'food',         name: 'الغذاء',            pct: -1.1, w: 10 },
    { id: 'insurance',    name: 'التأمين',           pct:  0.7, w:  8 },
    { id: 'mining',       name: 'التعدين',           pct: -2.1, w:  5 },
    { id: 'realestate',   name: 'العقارات',          pct:  1.2, w:  5 },
    { id: 'construction', name: 'البناء والتشييد',  pct:  0.5, w:  3 },
    { id: 'industrial',   name: 'الصناعة',           pct:  1.0, w:  2 },
  ];
}

/**
 * Fetch live prices for all stocks
 * @returns {Promise<Array<{ sym, p, ch, pct, v }>>}
 */
export async function fetchLivePrices() {
  if (config.isLive && config.features.liveMarketData) {
    // INTEGRATION: Live data via EODHD API — auto-activates with NEXT_PUBLIC_EODHD_KEY
    // const res = await fetch(`${config.sahmkBaseUrl}/prices`);
    // const data = await res.json();
    // return data.map(d => ({ sym: d.symbol, p: d.price, ch: d.change, pct: d.changePct, v: d.volume }));
  }

  await delay(SIMULATE_DELAY);
  // Return seed prices (same as constants) — no change in simulation mode
  return STOCKS.map(s => ({ sym: s.sym, p: s.p, ch: s.ch, pct: s.pct, v: s.v }));
}

/**
 * Fetch market breadth (advancers / decliners)
 * @returns {Promise<{ advancers, decliners, unchanged, total }>}
 */
export async function fetchBreadth() {
  if (config.isLive && config.features.liveMarketData) {
    // INTEGRATION: Live data via EODHD API — auto-activates with NEXT_PUBLIC_EODHD_KEY
  }

  await delay(SIMULATE_DELAY);
  const advancers = STOCKS.filter(s => s.pct > 0).length;
  const decliners = STOCKS.filter(s => s.pct < 0).length;
  return {
    advancers,
    decliners,
    unchanged: STOCKS.length - advancers - decliners,
    total:     STOCKS.length,
  };
}

/**
 * Fetch market status (open/closed/pre/post)
 * Based on Tadawul trading hours: Sun-Thu 10:00-15:00 AST (UTC+3)
 * @returns {Promise<'open'|'closed'|'pre'|'post'>}
 */
export async function fetchMarketStatus() {
  const now    = new Date();
  const ast    = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const day    = ast.getDay();   // 0=Sun, 1=Mon, ..., 4=Thu, 5=Fri, 6=Sat
  const hour   = ast.getHours();
  const minute = ast.getMinutes();
  const time   = hour * 60 + minute;

  const isWeekday = day >= 0 && day <= 4; // Sun(0) to Thu(4)
  const preOpen   = 9  * 60 + 30;  // 09:30
  const open      = 10 * 60;        // 10:00
  const close     = 15 * 60;        // 15:00
  const postClose = 15 * 60 + 30;   // 15:30

  if (!isWeekday)             return 'closed';
  if (time < preOpen)         return 'closed';
  if (time < open)            return 'pre';
  if (time < close)           return 'open';
  if (time < postClose)       return 'post';
  return 'closed';
}
