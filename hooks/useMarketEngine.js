'use client';
/**
 * @module hooks/useMarketEngine
 * @description جلب بيانات مؤشر تاسي من sahmk API
 */

import { useState, useEffect } from 'react';

const INTERVAL_MS = 30_000;

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
        if (!res.ok) return;
        const tasi = await res.json();
        if (tasi?.index_value) {
          setState(prev => ({
            ...prev,
            current: tasi.index_value,
            chgPts:  tasi.index_change_percent ?? 0,
            chgVal:  tasi.index_change         ?? 0,
          }));
        }
      } catch {}
    }

    fetchTasi();
    const t = setInterval(fetchTasi, INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  return state;
}


