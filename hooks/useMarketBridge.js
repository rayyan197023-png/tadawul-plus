'use client';
import config from '../constants/config';
import { STOCKS } from '../constants/stocksData';
import { fetchTASIIndex }  from '../services/api/eodhdApi';
/**
 * useMarketBridge — Syncs useMarketEngine into marketStore
 *
 * Call ONCE at HomeScreen level.
 * Ensures SectorBar, TopBar, and all marketStore consumers
 * see the same live TASI data.
 */

import { useEffect, useRef } from 'react';
import { useMarketEngine }   from './useMarketEngine';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';
import { useStockState, useStockDispatch } from '../store/stockStore';

export function useMarketBridge() {
  const market   = useMarketEngine();
  const dispatch = useMarketDispatch();
  const stockDispatch = useStockDispatch();
const stockState = useStockState();
  // Merge live priceCache into stocks so sector/breadth calculations use live prices
  const stocks = stockState.stocks.map(s => {
    const live = stockState.priceCache[s.sym];
    if (!live) return s;
    return { ...s, p: live.p, ch: live.ch, pct: live.pct, v: live.v };
  });
  const prevIdx  = useRef(null);
  const pollRef  = useRef(null);

  useEffect(() => {
    // Only dispatch on meaningful change (avoid thrashing on every 2s tick)
    if (prevIdx.current === market.current) return;
    prevIdx.current = market.current;

    // ── Push live TASI to marketStore
    dispatch({
      type:    MARKET_ACTIONS.SET_INDICES,
      payload: [
        { id: 'tasi', name: 'تاسي', value: market.current, pct: market.chgPts, ch: market.chgVal },
        { id: 'nomu', name: 'نمو',  value: 3124.8,          pct: 1.12,          ch: 34.6 },
      ],
    });

    // ── Compute live sector performance from stock prices
    // Group stocks by sector and average their pct change
    const sectorMap = {};
    stocks.forEach(s => {
      if (!s.sectorId) return;
      if (!sectorMap[s.sectorId]) sectorMap[s.sectorId] = { pcts: [], name: s.sec };
      sectorMap[s.sectorId].pcts.push(s.pct ?? 0);
    });

    const liveSectors = Object.entries(sectorMap).map(([id, { pcts, name }]) => {
      const avg = pcts.reduce((a, b) => a + b, 0) / (pcts.length || 1);
      return { id, name, pct: +avg.toFixed(2), count: pcts.length };
    }).sort((a, b) => b.pct - a.pct);

    if (liveSectors.length > 0) {
      dispatch({ type: MARKET_ACTIONS.SET_SECTORS, payload: liveSectors });
    }

    // ── Market breadth
    const adv = stocks.filter(s => (s.pct ?? 0) > 0).length;
    const dec = stocks.filter(s => (s.pct ?? 0) < 0).length;
    dispatch({ type: MARKET_ACTIONS.SET_BREADTH, payload: { advancers: adv, decliners: dec, unchanged: stocks.length - adv - dec, total: stocks.length } });
    dispatch({ type: MARKET_ACTIONS.SET_LAST_UPDATED, payload: Date.now() });

    }, [market.current, dispatch, stocks]);

  return market;
}
