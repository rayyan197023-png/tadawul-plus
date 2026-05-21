'use client';
/**
 * useDividend -- جلب توزيعات سهم واحد عند الطلب من sahmk
 *
 * الاستخدام:
 *   const { data, loading, error } = useDividend(sym);
 *
 * يجلب /api/sahmkdata?endpoint=dividends&sym={sym}
 * فقط عند تمرير sym صالح (عند الطلب)
 */

import { useState, useEffect } from 'react';

// ذاكرة مؤقتة بسيطة (تبقى أثناء الجلسة)
const cache = {};

export function useDividend(sym) {
  const [data, setData]       = useState(sym && cache[sym] ? cache[sym] : null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!sym) { setData(null); return; }

    // إن كانت في الكاش، استخدمها فوراً
    if (cache[sym]) {
      setData(cache[sym]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/sahmkdata?endpoint=dividends&sym=${sym}`)
      .then(r => {
        if (!r.ok) throw new Error('فشل جلب التوزيعات');
        return r.json();
      })
      .then(json => {
        if (cancelled) return;
        if (json && json.error) {
          setError(json.error);
          setData(null);
        } else {
          cache[sym] = json;   // خزّن في الكاش
          setData(json);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'خطأ');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sym]);

  return { data, loading, error };
}

// ═══════════════════════════════════════
// Hook جماعي: جلب توزيعات قائمة أسهم (دفعات)
// ═══════════════════════════════════════
export function useDividendsList(stocksList) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stocksList || stocksList.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const results = [];

    async function fetchAll() {
      // جلب دفعات (8 في كل مرة)
      for (let i = 0; i < stocksList.length; i += 8) {
        if (cancelled) return;
        const batch = stocksList.slice(i, i + 8);
        const batchData = await Promise.all(
          batch.map(stk => {
            // كاش فردي مشترك
            if (cache[stk.sym]) return Promise.resolve(cache[stk.sym]);
            return fetch(`/api/sahmkdata?endpoint=dividends&sym=${stk.sym}`)
              .then(r => r.ok ? r.json() : null)
              .then(json => {
                if (json && !json.error) { cache[stk.sym] = json; return json; }
                return null;
              })
              .catch(() => null);
          })
        );

        batchData.forEach((d, idx) => {
          const stk = batch[idx];
          if (d && d.history && d.history.length > 0) {
            results.push({ ...stk, divData: d });
          }
        });

        // تحديث تدريجي (البطاقات تظهر دفعة دفعة)
        if (!cancelled) setItems([...results]);
      }
      if (!cancelled) setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [stocksList]);

  return { items, loading };
}

export default useDividend;

