'use client';
import { useState, useEffect, useRef } from 'react';

const cache = {};
const cacheTime = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

export function useOHLCVCache(syms = [], period = '3M') {
  const [data, setData] = useState(cache);
  const loadingRef = useRef(new Set());

  useEffect(() => {
    if (!syms.length) return;
    const missing = syms.filter(s => {
  if (loadingRef.current.has(s)) return false;
  if (!cache[s]) return true;
  return Date.now() - (cacheTime[s] || 0) > CACHE_TTL;
});
    if (!missing.length) return;

    missing.forEach(s => loadingRef.current.add(s));

    const fetchBatch = async (batch) => {
      for (const sym of batch) {
        try {
          const r = await fetch(`/api/sahmkdata?endpoint=ohlcv&sym=${sym}&period=${period}`);
          const j = await r.json();
          if (j?.data?.length > 0) {
            cache[sym] = j.data.map(b => ({
              open:  b.open,
              hi:    b.high,
              lo:    b.low,
              close: b.close,
              vol:   b.volume,
              pct:   b.close > b.open ? +((b.close-b.open)/b.open*100).toFixed(3) : +((b.close-b.open)/b.open*100).toFixed(3),
            }));
          }
        } catch(e) {}
        loadingRef.current.delete(sym);
      }
      setData({...cache});
    };

    // دفعات من 5 أسهم لتوفير الطلبات
    for (let i = 0; i < missing.length; i += 5) {
      fetchBatch(missing.slice(i, i + 5));
    }
  }, [syms.join(','), period]);

  return data;
}
