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
  const [data, setData] = useState({});
  const loadingRef = useRef(new Set());
  // أيام البيانات حسب الفترة المطلوبة
  const days = period === '1Y' ? 365 : period === '6M' ? 180 : 90; // 3M افتراضي

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
