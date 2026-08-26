'use client';
/**
 * @module hooks/useMarketBridge
 * @description يربط بيانات السوق الحية بـ marketStore
 * يُستدعى مرة واحدة في AppShell
 */

import { useEffect, useRef, useMemo } from 'react';
import { useMarketEngine }   from './useMarketEngine';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';
import { useStockState } from '../store/stockStore';

export function useMarketBridge() {
  const market   = useMarketEngine();
  const dispatch = useMarketDispatch();
  const { stocks, priceCache } = useStockState();
  const prevIdx  = useRef(null);

  // دمج الأسعار الحية في الأسهم
  // ✨ useMemo -- كانت تُعاد لكل 248 سهما في كل رسم وتُطلق الـeffect
  const liveStocks = useMemo(() => stocks.map(s => {
    const live = priceCache[s.sym];
    if (!live) return s;
    return { ...s, p: live.p, ch: live.ch, pct: live.pct, v: live.v };
  }), [stocks, priceCache]);

  useEffect(() => {
    if (!market.current) return;
    if (prevIdx.current === market.current) return;
    prevIdx.current = market.current;

    // ── تاسي
    dispatch({
      type:    MARKET_ACTIONS.SET_INDICES,
      payload: [
        { id:'tasi', name:'تاسي', value: market.current, pct: market.chgPts ?? 0, ch: market.chgVal ?? 0 },
        { id:'nomu', name:'نمو',  value: 0, pct: 0, ch: 0 },
      ],
    });

    // ── أداء القطاعات
    const sectorMap = {};
    liveStocks.forEach(s => {
      if (!s.sectorId) return;
      if (!sectorMap[s.sectorId]) sectorMap[s.sectorId] = { pcts: [], name: s.sec };
      sectorMap[s.sectorId].pcts.push(s.pct ?? 0);
    });

    const liveSectors = Object.entries(sectorMap)
      .map(([id, { pcts, name }]) => ({
        id,
        name,
        pct:   +(pcts.reduce((a, b) => a + b, 0) / (pcts.length || 1)).toFixed(2),
        count: pcts.length,
      }))
      .sort((a, b) => b.pct - a.pct);

    if (liveSectors.length > 0) {
      dispatch({ type: MARKET_ACTIONS.SET_SECTORS, payload: liveSectors });
    }

    // ── اتساع السوق
    const adv = liveStocks.filter(s => (s.pct ?? 0) > 0).length;
    const dec = liveStocks.filter(s => (s.pct ?? 0) < 0).length;
    dispatch({
      type:    MARKET_ACTIONS.SET_BREADTH,
      payload: {
        advancers:  adv,
        decliners:  dec,
        unchanged:  liveStocks.length - adv - dec,
        total:      liveStocks.length,
      },
    });

    dispatch({ type: MARKET_ACTIONS.SET_LAST_UPDATED, payload: Date.now() });

  }, [market.current, dispatch, liveStocks]);

  return market;
}
