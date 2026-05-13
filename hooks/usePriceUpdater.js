'use client';
import { useEffect } from 'react';
import { useStockDispatch } from '../store/stockStore';

export function usePriceUpdater() {
  const dispatch = useStockDispatch();

  useEffect(() => {
    async function update() {
      try {
        const res = await fetch('/api/sahmkdata?endpoint=quote&sym=2222');
        const json = await res.json();
        if (json && json.price) {
          dispatch({ 
            type: 'UPDATE_PRICES', 
            payload: [{ 
              sym: '2222', 
              data: { p: json.price, ch: json.change, pct: json.change_percent, v: json.volume } 
            }] 
          });
          alert('Updated 2222: ' + json.price);
        } else {
          alert('No price: ' + JSON.stringify(json).slice(0, 100));
        }
      } catch(e) {
        alert('Error: ' + e.message);
      }
    }

    update();
  }, [dispatch]);
}
