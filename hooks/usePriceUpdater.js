'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';
import { STOCKS_MAP as SEED_MAP, updateLiveStocks, STOCKS } from '../constants/stocksData';

export function usePriceUpdater(setDebug) {
  const dispatch = useStockDispatch();
  const marketDispatch = useMarketDispatch();

  useEffect(() => {
    async function fetchAll() {
      try {
        const syms = STOCKS.map(s => s.sym);
        const chunks = [];
        for (let i = 0; i < syms.length; i += 50) chunks.push(syms.slice(i, i + 50));

        const allQuotes = [];
        for (const chunk of chunks) {
          try {
            const r = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
            const j = await r.json();
            if (j.quotes) allQuotes.push(...j.quotes);
          } catch(e) {
           if (setDebug) setDebug('خطأ دفعة: '+e.message);
          }
        }

        // عرض عدد الأسهم المستلمة
if (setDebug) setDebug(`sahmk رجع: ${allQuotes.length} من أصل ${syms.length}`);

        if (allQuotes.length > 0) {
          const newStocks = allQuotes
            .filter(q => q.price && q.symbol)
            .map(q => {
              const seed = SEED_MAP[q.symbol] || {};
              return {
                sym:      q.symbol,
                name:     q.name || q.name_en || q.symbol,
                sec:      seed.sec      || '',
                sectorId: seed.sectorId || '',
                rating:   seed.rating   || 50,
                oilCorr:  seed.oilCorr  || null,
                p:        q.price,
                ch:       q.change         ?? 0,
                pct:      q.change_percent ?? 0,
                v:        q.volume,
                avgV:     q.volume,
                hi:       q.high  || q.price,
                lo:       q.low   || q.price,
                mktCap: null, eps: null, pe: null, pb: null,
                divY: null, roe: null, debt: null, beta: null,
                w52h: null, w52l: null, target: null,
              };
            });

          dispatch({ type: 'SET_STOCKS', payload: newStocks });
          updateLiveStocks(newStocks);

          const d2 = document.getElementById('tadawul-debug');
          if (d2) { d2.style.display='block'; d2.textContent=`sahmk: ${allQuotes.length} | بعد الفلتر: ${newStocks.length}`; }
        }

        // تاسي
        const tasiRes = await fetch('/api/sahmkdata?endpoint=tasi');
        const tasi = await tasiRes.json();
        if (tasi?.index_value) {
          marketDispatch({
            type: MARKET_ACTIONS.SET_INDICES,
            payload: [
              { id:'tasi', name:'تاسي', value: tasi.index_value, pct: tasi.index_change_percent, ch: tasi.index_change },
              { id:'nomu', name:'نمو',  value: 3124.8, pct: 1.12, ch: 34.6 },
            ],
          });
        }

      } catch(e) {
        const d = document.getElementById('tadawul-debug');
        if (d) { d.style.display='block'; d.textContent='خطأ عام: '+e.message; }
      }
    }

    fetchAll();
    const t = setInterval(fetchAll, 20000);
    return () => clearInterval(t);
  }, [dispatch, marketDispatch]);
}
