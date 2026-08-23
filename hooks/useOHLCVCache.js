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

  // ✨ تهيئة فورية من localStorage -- بدل البدء بـ{} فارغ في كل جلسة
  // هذا يجعل allData يرى البيانات الحقيقية فوراً عند أول render
  const [data, setData] = useState(function() {
    if (typeof window === 'undefined') return {};
    var init = {};
    var TTL = 12 * 60 * 60 * 1000;
    var now = Date.now();
    try {
      // historicalData.js يخزن تحت 'tp_hist_[sym]'
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('tp_hist_') !== 0) continue;
        var sym = key.replace('tp_hist_', '');
        var raw = localStorage.getItem(key);
        if (!raw) continue;
        var entry = JSON.parse(raw);
        if (!entry || !entry.bars || !entry.ts) continue;
        if ((now - entry.ts) >= TTL) continue; // منتهية الصلاحية
        // تحويل لصيغة المحرك (نفس toEngineBars)
        var bars = entry.bars.map(function(b, idx) {
          var prevC = idx > 0 ? entry.bars[idx-1].c : b.o;
          var pct = (prevC && prevC > 0) ? ((b.c - prevC) / prevC * 100) : 0;
          return { o: b.o, open: b.o, c: b.c, close: b.c,
                   hi: b.hi, lo: b.lo, vol: b.v, pct: pct };
        }).filter(function(b) { return b.c > 0; });
        if (bars.length >= 20) init[sym] = bars;
      }
    } catch(e) {}
    return init;
  });

  const loadingRef = useRef(new Set());

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
