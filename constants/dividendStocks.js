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


