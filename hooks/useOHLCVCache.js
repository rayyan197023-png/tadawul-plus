'use client';
/**
 * @module hooks/useOHLCVCache
 * @description كاش البيانات التاريخية OHLCV من sahmk API
 */

import { useState, useEffect, useRef } from 'react';

const cache     = {};
const cacheTime = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 دقائق

export function useOHLCVCache(syms = [], period = '3M') {
  const [data, setData]   = useState(cache);
  const loadingRef        = useRef(new Set());

  useEffect(() => {
    if (!syms.length) return;

    const missing = syms.filter(s => {
      if (loadingRef.current.has(s)) return false;
      if (!cache[s]) return true;
      return Date.now() - (cacheTime[s] || 0) > CACHE_TTL;
    });

    if (!missing.length) return;
    missing.forEach(s => loadingRef.current.add(s));

    async function fetchBatch(batch) {
      for (const sym of batch) {
        try {
          const res = await fetch(
            `/api/sahmkdata?endpoint=ohlcv&sym=${sym}&period=${period}`
          );
          if (!res.ok) continue;
          const json = await res.json();

          if (json?.data?.length > 0) {
            cacheTime[sym] = Date.now();
            // ✨ فرز تصاعدي بالتاريخ (الأقدم أولاً) لضمان اتجاه صحيح
            // sahmk قد يُرجع البيانات تنازلياً حسب endpoint
            var sorted = json.data.slice().sort(function(a, b) {
              var da = new Date(a.date || a.t || a.timestamp || 0).getTime();
              var db = new Date(b.date || b.t || b.timestamp || 0).getTime();
              return da - db;
            });
            cache[sym] = sorted.map(b => ({
              open:  b.open,
              hi:    b.high,
              lo:    b.low,
              close: b.close,
              vol:   b.volume,
              pct:   b.open > 0
                ? +((b.close - b.open) / b.open * 100).toFixed(3)
                : 0,
            }));
          }
        } catch { /* فشل سهم واحد لا يوقف الباقي */ }
        loadingRef.current.delete(sym);
      }
      setData({ ...cache });
    }

    // دفعات من 5 أسهم
    for (let i = 0; i < missing.length; i += 5) {
      fetchBatch(missing.slice(i, i + 5));
    }
  }, [syms.join(','), period]);

  return data;
}
