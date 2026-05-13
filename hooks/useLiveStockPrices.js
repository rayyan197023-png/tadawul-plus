'use client';
/**
 * useLiveStockPrices
 *
 * ✨ V2.0 - Performance Optimized:
 * - Idle-time initialization (better TBT)
 * - Visibility API (saves battery)
 * - Smart backoff on errors
 * - Pause on tab hidden
 *
 * Only active when config.isLive === true.
 */

import { useEffect, useRef, useCallback } from 'react';
import config from '../constants/config';
import { fetchAllStocks } from '../services/api/stocksApi';
import { useStocks } from '../store';

export function useLiveStockPrices() {
  const { dispatch } = useStocks();
  const pollRef = useRef(null);
  const abortRef = useRef(null);
  const errorCountRef = useRef(0);
  const isVisibleRef = useRef(true);

  const fetchAndDispatch = useCallback(async () => {
  if (!config.isLive || !config.features.liveMarketData) return;
    
    // ✨ Skip if tab is hidden (saves battery)
    if (!isVisibleRef.current) return;

    // Abort previous in-flight request
    const ctrl = new AbortController();
if (abortRef.current) abortRef.current.abort();
abortRef.current = ctrl;

    try {
const TASI_SYMS = [
  '1010','1020','1030','1050','1060','1080','1111','1120','1140','1150',
  '1180','1182','1183','1201','1202','1210','1211','1212','1213','1214',
  '1301','1302','1303','1304','1320','1321','1322','1323','1324','1810',
  '1820','1830','1831','1832','1833','1834','1835','2001','2010','2020',
  '2030','2040','2050','2060','2070','2080','2081','2082','2083','2084',
  '2090','2100','2110','2120','2130','2140','2150','2160','2170','2180',
  '2190','2200','2210','2220','2222','2223','2230','2240','2250','2270',
  '2280','2281','2282','2283','2284','2285','2286','2287','2288','2290',
  '2300','2310','2320','2330','2340','2350','2360','2370','2380','2381',
  '2382','3002','3003','3004','3005','3007','3008','3010','3020','3030',
  '3040','3050','3060','3080','3090','3091','3092','4001','4002','4003',
  '4004','4005','4006','4007','4008','4009','4011','4012','4013','4014',
  '4015','4016','4017','4018','4019','4020','4021','4030','4031','4040',
  '4050','4051','4061','4070','4071','4072','4080','4081','4082','4083',
  '4084','4090','4100','4110','4130','4140','4141','4142','4143','4144',
  '4145','4146','4147','4148','4150','4160','4161','4162','4163','4164',
  '4165','4170','4180','4190','4191','4192','4193','4194','4200','4210',
  '4220','4230','4240','4250','4260','4261','4262','4263','4264','4265',
  '4270','4280','4290','4291','4292','4300','4310','4320','4321','4322',
  '4323','4324','4325','4326','4327','5110','6001','6002','6004','6010',
  '6012','6013','6014','6015','6016','6017','6018','6019','6020','6040',
  '6050','6060','6070','6090','7010',
];
const chunks = [];
for (let i = 0; i < TASI_SYMS.length; i += 50) {
  chunks.push(TASI_SYMS.slice(i, i + 50));
}
const allQuotes = [];
for (const chunk of chunks) {
  try {
    const res = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
    if (!res.ok) continue;
    const json = await res.json();
    if (json.quotes) allQuotes.push(...json.quotes);
  } catch(e) {}
}
if (allQuotes.length === 0) {
  console.warn('[useLiveStockPrices] allQuotes empty!');
  return;
}
console.log('[useLiveStockPrices] got', allQuotes.length, 'quotes, first:', allQuotes[0]?.symbol, allQuotes[0]?.price);

      // Reset error count on success
      errorCountRef.current = 0;

      // Build price updates
      const updates = allQuotes
  .filter(q => q.price)
  .map(q => ({
    sym:  q.symbol,
    data: { p: q.price, ch: q.change, pct: q.change_percent, v: q.volume },
  }));

      dispatch({ type: 'UPDATE_PRICES', payload: updates });
console.log('[LIVE] Updated', updates.length, 'stocks, first price:', updates[0]?.data?.p);
// ✨ Debug مؤقت
if (typeof window !== 'undefined') {
  window.__lastPriceUpdate = new Date().toISOString();
  window.__firstPrice = updates[0]?.data?.p;
}
    } catch (err) {
      if (err.name !== 'AbortError') {
        errorCountRef.current++;
        console.warn('[useLiveStockPrices] fetch failed:', err.message);
if (typeof window !== 'undefined') {
  window.__priceError = err.message;
}
      }
    }
  }, [dispatch]);

  // ═══════════════════════════════════════════════
  // ✨ Visibility detection (battery saver)
  // ═══════════════════════════════════════════════
  
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      // Fetch immediately when tab becomes visible
      if (!document.hidden && config.isLive && config.features.liveMarketData) {
        fetchAndDispatch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchAndDispatch]);

  // ═══════════════════════════════════════════════
  // ✨ Main polling logic with idle-time start
  // ═══════════════════════════════════════════════
  
  useEffect(() => {
    if (!config.isLive || !config.features.liveMarketData) return;

    let isMounted = true;
    
    // ✨ Smart polling with adaptive interval based on errors
    const getInterval = () => {
      const baseInterval = config.intervals.marketData;
      const errorCount = errorCountRef.current;
      
      // Exponential backoff on errors (max 5x)
      if (errorCount > 0) {
        const multiplier = Math.min(Math.pow(2, errorCount), 5);
        return baseInterval * multiplier;
      }
      
      return baseInterval;
    };

    const startPolling = () => {
      if (!isMounted) return;
      
      // Initial fetch
      fetchAndDispatch();

      // Setup interval
      const tick = () => {
        if (!isMounted) return;
        fetchAndDispatch();
        pollRef.current = setTimeout(tick, getInterval());
      };
      
      pollRef.current = setTimeout(tick, getInterval());
    };

    // ✨ Use requestIdleCallback to start AFTER initial paint
    // This significantly improves TBT (Total Blocking Time)
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleHandle = window.requestIdleCallback(startPolling, { timeout: 2000 });
      
      return () => {
        isMounted = false;
        window.cancelIdleCallback(idleHandle);
        if (pollRef.current) clearTimeout(pollRef.current);
        if (abortRef.current) abortRef.current.abort();
      };
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeout = setTimeout(startPolling, 1500);
      
      return () => {
        isMounted = false;
        clearTimeout(timeout);
        if (pollRef.current) clearTimeout(pollRef.current);
        if (abortRef.current) abortRef.current.abort();
      };
    }
  }, [fetchAndDispatch]);
}
