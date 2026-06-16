'use client';
/**
 * @module hooks/useOHLCVCache
 * @description كاش OHLCV -- يستخدم historicalData (كاش ثلاثي: ذاكرة+localStorage 12س+شبكة)
 * أُعيدت كتابته ليرث الكاش المستدام من historicalData بدل كاش الذاكرة فقط.
 * هذا يمنع إعادة الجلب عند كل reload (السبب الجذري لاستنزاف حدّ sahmk).
 */

import { useState, useEffect, useRef } from 'react';
import { fetchEngineBars } from '../utils/historicalData';

export function useOHLCVCache(syms = [], period = '3M') {
  const days = period === '1Y' ? 365 : period === '6M' ? 180 : 90;

  // ✨ تهيئة الـstate من localStorage مباشرة (بدل البدء بـ{} فارغ دائماً)
  // هذا يجعل allData يرى البيانات المحفوظة فوراً بدل انتظار fetch جديد
  const [data, setData] = useState(function() {
    if (typeof window === 'undefined') return {};
    var init = {};
    try {
      var cacheRaw = localStorage.getItem('ohlcv_cache_v1');
      if (cacheRaw) {
        var cache = JSON.parse(cacheRaw);
        var now = Date.now();
        var TTL = 12 * 60 * 60 * 1000; // 12 ساعة
        Object.keys(cache).forEach(function(key) {
          var entry = cache[key];
          // استخدم البيانات فقط إذا لم تنتهِ صلاحيتها
          if (entry && entry.ts && (now - entry.ts) < TTL && Array.isArray(entry.bars) && entry.bars.length >= 20) {
            init[key] = entry.bars;
          }
        });
      }
    } catch(e) {}
    return init;
  });

  const loadingRef = useRef(new Set()); // 3M افتراضي

  useEffect(() => {
    if (!syms.length) return;
    let cancelled = false;

    // اجلب فقط ما لم يُحمَّل/يُجلب بعد
    const toFetch = syms.filter(s => !loadingRef.current.has(s) && !data[s]);
    if (!toFetch.length) return;
    toFetch.forEach(s => loadingRef.current.add(s));

    // دفعات من 5 (احترام لطيف لحدّ الـ API)
    async function fetchBatch(batch) {
      for (const sym of batch) {
        try {
          const r = await fetchEngineBars(sym, { days });
          if (!cancelled && r.bars && r.bars.length > 0) {
            setData(prev => Object.assign({}, prev, { [sym]: r.bars }));
            // ✨ حفظ في localStorage مع timestamp للكاش الـ12 ساعة
            try {
              var cacheRaw2 = localStorage.getItem('ohlcv_cache_v1');
              var cache2 = cacheRaw2 ? JSON.parse(cacheRaw2) : {};
              cache2[sym] = { bars: r.bars, ts: Date.now() };
              localStorage.setItem('ohlcv_cache_v1', JSON.stringify(cache2));
            } catch(e) {}
          }
        } catch { /* فشل سهم لا يوقف الباقي */ }
        loadingRef.current.delete(sym);
      }
    }

// تأخير بين الدفعات لتجنب 429
async function fetchAll() {
  for (let i = 0; i < toFetch.length; i += 5) {
    await new Promise(r => setTimeout(r, 800));
    fetchBatch(toFetch.slice(i, i + 5));
  }
}
fetchAll();

    return () => { cancelled = true; };
  }, [syms.join(','), period]);

  return data;
}
