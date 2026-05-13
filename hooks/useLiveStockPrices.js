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
import { STOCKS_MAP } from '../constants/stocksData';
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
      const syms = Object.keys(STOCKS_MAP);
const chunks = [];
for (let i = 0; i < syms.length; i += 50) {
  chunks.push(syms.slice(i, i + 50));
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
const stocks = Object.values(STOCKS_MAP).map(seed => {
  const q = allQuotes.find(q => q.symbol === seed.sym);
  if (q && q.price) {
    return { ...seed, p: q.price, ch: q.change, pct: q.change_percent, v: q.volume };
  }
  return seed;
});

      // Reset error count on success
      errorCountRef.current = 0;

      // Build price updates
      const updates = stocks.map(s => ({
        sym:  s.sym,
        data: { p: s.p, ch: s.ch, pct: s.pct, v: s.v, o: s.o, hi: s.hi, lo: s.lo },
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
