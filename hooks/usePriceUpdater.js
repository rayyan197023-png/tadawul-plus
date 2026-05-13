'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';

export function usePriceUpdater() {
  const dispatch = useStockDispatch();

  useEffect(() => {
    async function update() {
      try {
        const res = await fetch('/api/sahmkdata?endpoint=quotes&symbols=2222,1120,2010,1010,2350,7010,1211,2082,4150,1180,1050,1060,7020,7030,2060,4001,4008,4007,8230,6010,2381,2280,4030,4164,2040,9200,1304,4180,3050,1020,1030,1080,1090,1100,1140,1150,1160,2020,2030,2070,2080,2090,2100,2110,2120,2250,2290,2300');
        const json = await res.json();
        if (!json.quotes || json.quotes.length === 0) return;
        const updates = json.quotes
          .filter(q => q.price)
          .map(q => ({
            sym: q.symbol,
            data: { p: q.price, ch: q.change, pct: q.change_percent, v: q.volume }
          }));
        if (updates.length > 0) {
          dispatch({ type: 'UPDATE_PRICES', payload: updates });
        }
      } catch(e) {}
    }

    update();
    const t = setInterval(update, 20000);
    return () => clearInterval(t);
  }, [dispatch]);
}
