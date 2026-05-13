'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';

export function usePriceUpdater() {
  const dispatch = useStockDispatch();

  useEffect(() => {
    const SYMS = [
      '2222','1120','2010','1010','2350','1180','1050','1060',
      '7010','7020','7030','1211','2060','4001','4008','4007',
      '2082','4150','4020','8230','6010','2381','2280','4030',
      '4164','2040','9200','1304','4180','3050','1020','1030',
      '1080','1090','1100','1140','1150','1160','2020','2030',
      '2070','2080','2090','2100','2110','2120','2250','2290',
      '2300','2310','2320','2340','2360','2370','2380','1302',
      '2160','2170','2190','2200','2210','4003','4006','4050',
      '4160','4190','4200','4210','4220','7040','7200','7203',
      '7204','7240','7241','4040','4100','4130','4140','8010',
      '8020','8040','8050','8060','8070','8100','4002','4009',
      '4015','2083','2084','4261','4263','6090','6001','6002','6020',
    ];

    async function fetchPrices() {
      const chunks = [];
      for (let i = 0; i < SYMS.length; i += 50) {
        chunks.push(SYMS.slice(i, i + 50));
      }
      const allQuotes = [];
      for (const chunk of chunks) {
        try {
          const res = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
          const json = await res.json();
          if (json.quotes) allQuotes.push(...json.quotes);
        } catch(e) {}
      }
      if (allQuotes.length === 0) return;
      const updates = allQuotes
  .filter(q => q.price)
  .map(q => ({
    sym: q.symbol,
    data: { 
      p: q.price, 
      ch: q.change, 
      pct: q.change_percent, 
      v: q.volume,
      name: q.name_en ? q.name_en : undefined,
    }
  }));
      if (updates.length > 0) {
        dispatch({ type: 'UPDATE_PRICES', payload: updates });
      }
    }

    fetchPrices();
    const t = setInterval(fetchPrices, 20000);
    return () => clearInterval(t);
  }, [dispatch]);
}
