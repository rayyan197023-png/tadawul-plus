'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';

export function usePriceUpdater() {
  const dispatch = useStockDispatch();
  const marketDispatch = useMarketDispatch();

  useEffect(() => {
    async function fetchPrices() {
      try {
        // 1. جلب قائمة الشركات من sahmk
        const compRes = await fetch('/api/sahmkdata?endpoint=companies&market=TASI&limit=300');
        const compJson = await compRes.json();
        const companies = compJson.results || [];

        // 2. جلب الأسعار لكل الأسهم
        const syms = companies
          .filter(c => c.symbol && c.symbol.length === 4 && !isNaN(c.symbol))
          .map(c => c.symbol);

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
          // دمج الاسم الحقيقي مع السعر
          const compMap = {};
          companies.forEach(c => { compMap[c.symbol] = c; });

          const updates = allQuotes
            .filter(q => q.price)
            .map(q => ({
              sym: q.symbol,
              data: {
                p: q.price,
                ch: q.change,
                pct: q.change_percent,
                v: q.volume,
                name: compMap[q.symbol]?.name_ar || q.name_en || undefined,
              }
            }));

          if (updates.length > 0) {
            dispatch({ type: 'UPDATE_PRICES', payload: updates });
            console.log('sample update:', updates[0]);
          }
        }

        // 3. مؤشر تاسي
        const tasiRes = await fetch('/api/sahmkdata?endpoint=tasi');
        const tasi = await tasiRes.json();
        if (tasi && tasi.index_value) {
          marketDispatch({
            type: MARKET_ACTIONS.SET_INDICES,
            payload: [
              {
                id: 'tasi',
                name: 'تاسي',
                value: tasi.index_value,
                pct: tasi.index_change_percent,
                ch: tasi.index_change,
              },
              { id: 'nomu', name: 'نمو', value: 3124.8, pct: 1.12, ch: 34.6 },
            ],
          });
        }

      } catch(e) {}
    }

    fetchPrices();
    const t = setInterval(fetchPrices, 20000);
    return () => clearInterval(t);
  }, [dispatch, marketDispatch]);
}
