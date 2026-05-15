'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';
import { STOCKS_MAP as SEED_MAP } from '../constants/stocksData';

export function usePriceUpdater() {
  const dispatch = useStockDispatch();
  const marketDispatch = useMarketDispatch();

  useEffect(() => {
    async function fetchAll() {
      try {
        // 1. جلب قائمة شركات تاسي
        const compRes = await fetch('/api/sahmkdata?endpoint=companies&market=TASI&limit=500');
        const compJson = await compRes.json();
        const companies = (compJson.results || []).filter(c => {
  const n = parseInt(c.symbol);
  if (!c.symbol || c.symbol.length !== 4 || isNaN(n)) return false;
  if (n >= 8000) return false;
  if (n >= 4330 && n <= 4350) return false;
  return true;
});

        // 2. أسعار على دفعات 50
        const syms = companies.map(c => c.symbol);
        const chunks = [];
        for (let i = 0; i < syms.length; i += 50) chunks.push(syms.slice(i, i + 50));

        const allQuotes = [];
        for (const chunk of chunks) {
          try {
            const r = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
            const j = await r.json();
            if (j.quotes) allQuotes.push(...j.quotes);
          } catch(e) {}
        }

        if (allQuotes.length > 0) {
          const compMap = {};
          companies.forEach(c => { compMap[c.symbol] = c; });

                    const newStocks = allQuotes
            .filter(q => q.price && q.symbol && compMap[q.symbol])
            .map(q => ({
              ...(SEED_MAP[q.symbol] || {}),
              sym:  q.symbol,
name: q.name || compMap[q.symbol]?.name_ar || (SEED_MAP[q.symbol]?.name) || q.name_en || q.symbol,
              p:    q.price,
              ch:   q.change ?? 0,
pct:  q.change_percent ?? 0,
              v:    q.volume,
              avgV: q.volume,
              hi:   q.high || q.price,
              lo:   q.low  || q.price,
            }));

          dispatch({ type: 'SET_STOCKS', payload: newStocks });
        }

        // 3. تاسي
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

      } catch(e) {}
    }

    fetchAll();
    const t = setInterval(fetchAll, 20000);
    return () => clearInterval(t);
  }, [dispatch, marketDispatch]);
}
