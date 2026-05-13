'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';

// الريت -- نستبعدها
const REIT_RANGE = (sym) => {
  const n = parseInt(sym);
  return n >= 4330 && n <= 4350;
};

export function usePriceUpdater() {
  const dispatch = useStockDispatch();
  const marketDispatch = useMarketDispatch();

  useEffect(() => {
    async function fetchAll() {
      try {
        // 1. جلب قائمة الشركات
        const compRes = await fetch('/api/sahmkdata?endpoint=companies&market=TASI&limit=300');
        const compJson = await compRes.json();
        const companies = (compJson.results || []).filter(c => {
          const sym = c.symbol;
          if (!sym || sym.length !== 4 || isNaN(sym)) return false;
          if (REIT_RANGE(sym)) return false;
          return true;
        });

        const syms = companies.map(c => c.symbol);

        // 2. جلب الأسعار على دفعات
        const chunks = [];
        for (let i = 0; i < syms.length; i += 50) {
          chunks.push(syms.slice(i, i + 50));
        }
        const allQuotes = [];
        for (const chunk of chunks) {
          try {
            const res = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
            const json = await res.json();
            if (json.quotes) allQuotes.push(...json.quotes);
          } catch(e) {}
        }

        if (allQuotes.length > 0) {
          const compMap = {};
          companies.forEach(c => { compMap[c.symbol] = c; });

          const updates = allQuotes
            .filter(q => q.price)
            .map(q => ({
              sym: q.symbol,
              data: {
                p:   q.price,
                ch:  q.change,
                pct: q.change_percent,
                v:   q.volume,
                name: compMap[q.symbol]?.name_ar || q.name_en || q.symbol,
              }
            }));

          if (updates.length > 0) {
            // أضف الأسهم الجديدة للـ store
            dispatch({ type: 'SET_STOCKS_FROM_API', payload: updates });
            dispatch({ type: 'UPDATE_PRICES', payload: updates });
          }
        }

        // 3. تاسي
        const tasiRes = await fetch('/api/sahmkdata?endpoint=tasi');
        const tasi = await tasiRes.json();
        if (tasi && tasi.index_value) {
          marketDispatch({
            type: MARKET_ACTIONS.SET_INDICES,
            payload: [
              { id: 'tasi', name: 'تاسي', value: tasi.index_value, pct: tasi.index_change_percent, ch: tasi.index_change },
              { id: 'nomu', name: 'نمو', value: 3124.8, pct: 1.12, ch: 34.6 },
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