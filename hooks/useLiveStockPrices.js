'use client';
/**
 * useLiveStockPrices
 *
 * Polls EODHD for live prices of all stocks.
 * Dispatches UPDATE_PRICES to stockStore.
 *
 * Only active when config.isLive === true.
 * In demo mode: no-op (uses GBM simulation via useMarketEngine).
 */

import { useEffect, useRef, useCallback } from 'react';
import config         from '../constants/config';
import { fetchAllStocks } from '../services/api/stocksApi';
import { useStockState }  from '../store';

export function useLiveStockPrices() {
  const { dispatch } = useStockState();
  const pollRef = useRef(null);
  const abortRef = useRef(null);

  const fetchAndDispatch = useCallback(async () => {
    if (!config.isLive || !config.features.liveMarketData) return;

    // Abort previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const stocks = await fetchAllStocks(ctrl.signal);
      if (ctrl.signal.aborted) return;

      // Build price updates
      const updates = stocks.map(s => ({
        sym:  s.sym,
        data: { p: s.p, ch: s.ch, pct: s.pct, v: s.v, o: s.o, hi: s.hi, lo: s.lo },
      }));

      dispatch({ type: 'UPDATE_PRICES', payload: updates });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[useLiveStockPrices] fetch failed:', err.message);
      }
    }
  }, [dispatch]);

  useEffect(() => {
    if (!config.isLive || !config.features.liveMarketData) return;

    // Fetch immediately
    fetchAndDispatch();

    // Poll every 30s
    pollRef.current = setInterval(fetchAndDispatch, config.intervals.marketData);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchAndDispatch]);
}
