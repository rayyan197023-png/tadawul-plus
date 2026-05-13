'use client';
import config from '../constants/config';
import { useState, useEffect } from 'react';

export function useMarketEngine() {
  const [state, setState] = useState({
    current:  0,
    open:     0,
    todayPts: [],
    chgPts:   0,
    chgVal:   0,
  });

  useEffect(() => {
    async function fetchTasi() {
      try {
        const res = await fetch('/api/sahmkdata?endpoint=tasi');
        const tasi = await res.json();
        if (tasi?.index_value) {
          setState(prev => ({
            ...prev,
            current: tasi.index_value,
            chgPts:  tasi.index_change_percent,
            chgVal:  tasi.index_change,
          }));
        }
      } catch(e) {}
    }
    fetchTasi();
    const t = setInterval(fetchTasi, 20000);
    return () => clearInterval(t);
  }, []);

  return state;
}

export const HISTORICAL_SERIES = {
  year:  [],
  q3m:   [],
  month: [],
  week:  [],
};
