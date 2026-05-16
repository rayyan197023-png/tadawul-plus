'use client';
/**
 * @module hooks/usePriceUpdater
 * @description جلب أسعار الأسهم وبيانات تاسي من sahmk API
 * يُستدعى مرة واحدة في AppShell
 */

import { useEffect, useRef } from 'react';
import { useStockDispatch } from '../store/stockStore';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';
import { STOCKS_MAP as SEED_MAP, updateLiveStocks, STOCKS } from '../constants/stocksData';

const INTERVAL_MS    = 30_000; // تحديث كل 30 ثانية
const CHUNK_SIZE     = 50;     // حد sahmk لكل طلب

export function usePriceUpdater(setDebug) {
  const dispatch       = useStockDispatch();
  const marketDispatch = useMarketDispatch();
  const isMounted      = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    async function fetchAll() {
      try {
        // ── ① أسعار الأسهم ──────────────────────────────
        const syms   = STOCKS.map(s => s.sym);
        const chunks = [];
        for (let i = 0; i < syms.length; i += CHUNK_SIZE) {
          chunks.push(syms.slice(i, i + CHUNK_SIZE));
        }

        const allQuotes = [];
        for (const chunk of chunks) {
          try {
            const res  = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
            if (!res.ok) continue;
            const json = await res.json();
            if (Array.isArray(json.quotes)) allQuotes.push(...json.quotes);
          } catch { /* chunk فشل -- نكمل */ }
        }

        if (!isMounted.current) return;

        setDebug?.(`sahmk: ${allQuotes.length} سهم من أصل ${syms.length}`);

        if (allQuotes.length > 0) {
          const newStocks = allQuotes
            .filter(q => q.symbol && q.price > 0)
            .map(q => {
              const seed = SEED_MAP[q.symbol] || {};
              return {
                sym:      q.symbol,
                name:     q.name     || q.name_en || q.symbol,
                sec:      seed.sec      || '',
                sectorId: seed.sectorId || '',
                rating:   seed.rating   || 50,
                oilCorr:  seed.oilCorr  || null,
                p:        q.price,
                ch:       q.change          ?? 0,
                pct:      q.change_percent  ?? 0,
                v:        q.volume          ?? 0,
                avgV:     q.volume          ?? 0,
                hi:       q.high            || q.price,
                lo:       q.low             || q.price,
                mktCap:   null, eps:  null, pe:   null,
                pb:       null, divY: null, roe:  null,
                debt:     null, beta: null, w52h: null,
                w52l:     null, target: null,
              };
            });

          dispatch({ type: 'SET_STOCKS', payload: newStocks });
          updateLiveStocks(newStocks);
          setDebug?.(`✅ ${newStocks.length} سهم محمّل`);
        }

        // ── ② مؤشر تاسي ─────────────────────────────────
        const tasiRes  = await fetch('/api/sahmkdata?endpoint=tasi');
        if (!tasiRes.ok) return;
        const tasi = await tasiRes.json();

        if (tasi?.index_value && isMounted.current) {
          marketDispatch({
            type:    MARKET_ACTIONS.SET_INDICES,
            payload: [
              {
                id:    'tasi',
                name:  'تاسي',
                value: tasi.index_value,
                pct:   tasi.index_change_percent ?? 0,
                ch:    tasi.index_change         ?? 0,
              },
              { id:'nomu', name:'نمو', value: 0, pct: 0, ch: 0 },
            ],
          });
        }

      } catch(e) {
        setDebug?.('خطأ: ' + e.message);
      }
    }

    fetchAll();
    const timer = setInterval(fetchAll, INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, [dispatch, marketDispatch]);
}
