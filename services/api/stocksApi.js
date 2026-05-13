import config          from '../../constants/config';
import { STOCKS_MAP }  from '../../constants/stocksData';
import { createStock } from '../../constants/stockModel';
import {
  fetchOHLCHistory,
  periodToEODHDParams,
} from './eodhdApi';

function seedRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateOHLCBars(stk, days = 60) {
  const rng    = seedRng(parseInt(stk.sym, 10) * 997 + 13);
  const bars   = [];
  const avgVol = stk.avgV || stk.v || 1_000_000;
  let price    = stk.p * (1 - stk.pct / 100);
  const target = stk.p;
  const baseVol = 0.012;
  let vol = baseVol;

  for (let i = 0; i < days; i++) {
    const theta    = 0.08;
    const revForce = theta * (target - price) / price;
    const drift    = (stk.pct / 100) / days;
    const alpha    = 0.25;
    const lastRet  = bars.length > 0 ? Math.abs(bars[bars.length-1].pct / 100) : baseVol;
    vol = alpha * lastRet + (1 - alpha) * baseVol;
    vol = Math.max(baseVol * 0.5, Math.min(vol, baseVol * 3));
    let noise;
    if (rng() > 0.90) {
      noise = (rng() - 0.5) * vol * (3 + rng() * 2);
    } else {
      const u1 = Math.max(1e-10, rng()), u2 = rng();
      const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      noise = normal * vol;
    }
    const change = drift + revForce + noise;
    const open   = price;
    const close  = Math.max(0.01, price * (1 + change));
    const spreadMult = 0.005 + vol * 0.5;
    const hi  = Math.max(open, close) * (1 + rng() * spreadMult);
    const lo  = Math.min(open, close) * (1 - rng() * spreadMult);
    const volMult = 0.5 + rng() * 0.8 + Math.abs(change) * 12;
    const vol_out = Math.round(avgVol * Math.max(0.2, volMult));
    const d = new Date();
    d.setDate(d.getDate() - (days - i));
    bars.push({
      d:   d.toISOString().slice(0, 10),
      o:   +open.toFixed(2),
      hi:  +hi.toFixed(2),
      lo:  +lo.toFixed(2),
      c:   +close.toFixed(2),
      vol: vol_out,
      pct: +(change * 100).toFixed(2),
    });
    price = close;
  }
  if (bars.length > 0) {
    const last = bars[bars.length - 1];
    last.c  = stk.p;
    last.hi = Math.max(last.hi, stk.p);
    last.lo = Math.min(last.lo, stk.p);
  }
  return bars;
}

export async function fetchOHLCBars(sym, period = '3M', signal) {
  try {
    if (config.isLive && config.features.liveMarketData) {
      const res = await fetch(
  `/api/sahmkdata?sym=${sym}&endpoint=ohlcv&period=${period}`,
        { signal }
      );
      if (!res.ok) throw new Error(`OHLCV fetch failed: ${res.status}`);
      const json = await res.json();
      if (json && json.data && json.data.length > 0) {
        return json.data.map(bar => ({
          d:   bar.date,
          o:   bar.open,
          hi:  bar.high,
          lo:  bar.low,
          c:   bar.close,
          vol: bar.volume,
          pct: bar.close > bar.open 
            ? +((bar.close - bar.open) / bar.open * 100).toFixed(2)
            : +((bar.close - bar.open) / bar.open * 100).toFixed(2),
        }));
      }
    }
  } catch (err) {
    console.warn(`[stocksApi] fetchOHLCBars(${sym}) failed:`, err.message);
  }
  // Fallback -- شموع وهمية
  const daysMap = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
  const days = daysMap[period] ?? 90;
  const stk = STOCKS_MAP[sym];
  return stk ? generateOHLCBars(stk, Math.min(days + 28, 120)) : [];
}

export async function fetchStockDetail(sym) {
  try {
    if (config.isLive && config.features.liveMarketData) {
      const res = await fetch(`/api/sahmkdata?sym=${sym}&endpoint=quote`);
if (!res.ok) throw new Error(`Stock fetch failed: ${res.status}`);
const quote = await res.json();
if (quote && quote.price) {
  return {
    ...STOCKS_MAP[sym],
    p:   quote.price,
    ch:  quote.change,
    pct: quote.change_percent,
    v:   quote.volume,
    o:   quote.open,
    hi:  quote.high,
    lo:  quote.low,
  };
}
    }
  } catch (err) {
    console.warn(`[stocksApi] fetchStockDetail(${sym}) failed:`, err.message);
  }
  return STOCKS_MAP[sym] ?? null;
}

function isSaudiMarketOpen() {
  const now = new Date();
  const riyadh = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const day = riyadh.getDay();
  const hour = riyadh.getHours();
  const min = riyadh.getMinutes();
  const time = hour * 60 + min;
  if (day === 5 || day === 6) return false;
  return time >= 600 && time <= 930;
}

export async function fetchAllStocks(signal) {
  try {
    if (config.isLive && config.features.liveMarketData) {
      console.log('[fetchAllStocks] Starting fetch...');
      const allSyms = Object.keys(STOCKS_MAP);
const chunks = [];
for (let i = 0; i < allSyms.length; i += 50) {
  chunks.push(allSyms.slice(i, i + 50));
}
const allQuotes = [];
for (const chunk of chunks) {
  try {
const base = typeof window !== 'undefined' ? window.location.origin : '';
const url = `${base}/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`;
    const res = await fetch(url);
    const text = await res.text();
    const json = JSON.parse(text);
    if (json.quotes && json.quotes.length > 0) {
      allQuotes.push(...json.quotes);
    }
  } catch(e) {}
}
if (allQuotes.length === 0) {
  // Fallback: جلب سهم واحد مباشرة
  try {
    const res = await fetch('/api/sahmkdata?endpoint=quote&sym=2222');
    const json = await res.json();
    if (json.price && STOCKS_MAP['2222']) {
      STOCKS_MAP['2222'].p = json.price;
      STOCKS_MAP['2222'].ch = json.change;
      STOCKS_MAP['2222'].pct = json.change_percent;
    }
  } catch(e) {}
}
if (allQuotes.length > 0) {
  allQuotes.forEach(function(quote) {
    if (STOCKS_MAP[quote.symbol] && quote.price) {
      STOCKS_MAP[quote.symbol].p   = quote.price;
      STOCKS_MAP[quote.symbol].ch  = quote.change;
      STOCKS_MAP[quote.symbol].pct = quote.change_percent;
      STOCKS_MAP[quote.symbol].v   = quote.volume;
    }
  });
  return [];
}
    }
  } catch (err) {
  console.error('[fetchAllStocks FAILED]', err.message);
}
  return [];
}
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
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  if (!text) throw new Error('Empty response from AI');
  return text;
}
