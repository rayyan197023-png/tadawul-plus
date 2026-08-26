'use client';
/**
 * @module hooks/useCompareData
 * @description جلب بيانات سهم للمقارنة (cache أو جلب)
 *
 * - يقرأ من stockFund_v4_ (الأسهم المفتوحة) → فوري
 * - أو يجلب fundamentals + ratios + dividends
 * - يحسب mc/pe/divYld حياً من السعر
 */
import { useState, useEffect } from 'react';
import { sahmkFetch } from '../features/stock/tabs/SDApiEnginesTab';

// قراءة من cache الموجود (الأسهم المفتوحة سابقاً)
const readStockCache = (sym) => {
  try {
    const raw = localStorage.getItem(`stockFund_v14_${sym}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.data || null;
  } catch (e) { return null; }
};

// جلب بيانات سهم (مبسّط للمقارنة)
const fetchStockCompare = async (sym) => {
  // جرّب cache أولاً
  const cached = readStockCache(sym);
  if (cached) {
    return {
      pe: cached.pe, roe: cached.roe,
      divYld: cached.divYld,
      eps: cached.eps, sharesOut: cached.sharesOut,
      annualDiv: cached.annualDiv,
    };
  }
  // جلب جديد
  try {
    const [comp, ratios, div] = await Promise.all([
      sahmkFetch('fundamentals', { sym }),
      sahmkFetch('ratios', { sym }),
      sahmkFetch('dividends', { sym }),
    ]);
    const f = comp.fundamentals || {};
    const r = (ratios.ratios && ratios.ratios[0] && ratios.ratios[0].ratios) || {};
    let eps = f.eps_ttm || f.basic_eps || f.eps;
    const px = f.fifty_two_week_high || comp.current_price || 100;
    if (eps != null && eps > px * 0.3 && f.basic_eps != null && f.basic_eps < eps) {
      eps = f.basic_eps;
    }
    return {
      pe: (f.pe_ratio != null && f.pe_ratio > 3 && f.pe_ratio < 300) ? f.pe_ratio : null,
      roe: (r.roe != null && Math.abs(r.roe) < 100) ? r.roe : null,
      divYld: div.trailing_12m_yield || null,
      eps: eps,
      sharesOut: f.shares_outstanding || null,
      annualDiv: div.trailing_12m_dividends || null,
    };
  } catch (e) { return null; }
};

/**
 * Hook لبيانات سهمين للمقارنة
 */
export const useCompareData = (symA, symB, priceA, priceB) => {
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symA) return;
    let cancelled = false;
    setLoading(true);
    fetchStockCompare(symA).then(d => {
      if (!cancelled) { setDataA(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [symA]);

  useEffect(() => {
    if (!symB) return;
    let cancelled = false;
    fetchStockCompare(symB).then(d => {
      if (!cancelled) setDataB(d);
    });
    return () => { cancelled = true; };
  }, [symB]);

  // حساب القيم الحية (mc/pe/divYld من السعر)
  const compute = (data, price) => {
    if (!data) return { pe: null, roe: null, div: null, mktCap: null };
    let mc = null, pe = data.pe, divYld = data.divYld;
    if (price && data.sharesOut) mc = (price * data.sharesOut) / 1e9; // بالمليار
    if (price && data.eps && data.eps > 0) pe = price / data.eps;
    if (price && data.annualDiv) divYld = (data.annualDiv / price) * 100;
    return { pe: pe, roe: data.roe, div: divYld, mktCap: mc };
  };

  return {
    extraA: compute(dataA, priceA),
    extraB: compute(dataB, priceB),
    loading: loading,
  };
};

export default useCompareData;
