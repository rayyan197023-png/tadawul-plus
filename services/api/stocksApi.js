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
