'use client';
/**
 * @module hooks/useRankings
 * @description قوائم التصنيف - cache الثوابت + حساب حي
 *
 * cache (3 أشهر): sharesOut, eps, annualDiv, roe لأهم 40 سهم
 * حساب حي: mc/pe/divYld من السعر (stocksLive)
 */
import { useState, useEffect } from 'react';
import { STOCKS } from '../constants/stocksData';
import { sahmkFetch } from '../features/stock/tabs/SDApiEnginesTab';

const CACHE_KEY = 'rankings_const_v1';
const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000;
const TOP_N = 40;

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.timestamp || 0) > CACHE_DURATION) return null;
    return parsed.data;
  } catch (e) { return null; }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(), data,
    }));
  } catch (e) {}
};

// جلب الثوابت لأهم 40 سهم
const fetchConstants = async () => {
  const top = STOCKS.slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, TOP_N);

  const out = [];
  for (let i = 0; i < top.length; i += 3) {
    const batch = top.slice(i, i + 3);
    await Promise.all(batch.map(async (s) => {
      try {
        const [comp, ratios, div] = await Promise.all([
          sahmkFetch('fundamentals', { sym: s.sym }),
          sahmkFetch('ratios', { sym: s.sym }),
          sahmkFetch('dividends', { sym: s.sym }),
        ]);
        const f = comp.fundamentals || {};
        const r = (ratios.ratios && ratios.ratios[0] && ratios.ratios[0].ratios) || {};
        let eps = f.eps_ttm || f.basic_eps || f.eps;
        const px = f.fifty_two_week_high || comp.current_price || 100;
        if (eps != null && eps > px * 0.3 && f.basic_eps != null && f.basic_eps < eps) {
          eps = f.basic_eps;
        }
        out.push({
          sym: s.sym,
          name: comp.name || comp.name_en || s.sym,
          sec: s.sec,
          sharesOut: f.shares_outstanding || null,
          eps: eps != null ? eps : null,
          annualDiv: div.trailing_12m_dividends || null,
          roe: (r.roe != null && Math.abs(r.roe) < 100) ? r.roe : null,
        });
      } catch (e) {}
    }));
    await new Promise(res => setTimeout(res, 1000));
  }
  return out;
};

export const useRankings = (stocksLive) => {
  const [constants, setConstants] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState({
    byMarketCap: [], byDividend: [], byROE: [], byPE: [],
  });

  // تحميل الثوابت
  useEffect(() => {
    const cached = readCache();
    if (cached) { setConstants(cached); return; }
    let cancelled = false;
    setLoading(true);
    fetchConstants().then(data => {
      if (!cancelled) {
        setConstants(data);
        writeCache(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // حساب القوائم (حي)
  useEffect(() => {
    if (!constants || !stocksLive || stocksLive.length === 0) return;

    const priceMap = {};
    stocksLive.forEach(s => { priceMap[s.sym] = s.p; });

    const merged = constants.map(c => {
      const price = priceMap[c.sym] || null;
      let mc = null, pe = null, divYld = null;
      if (price && c.sharesOut) mc = (price * c.sharesOut) / 1e9; // بالمليار

      if (price && c.eps && c.eps > 0) pe = price / c.eps;
      if (price && c.annualDiv) divYld = (c.annualDiv / price) * 100;
      return { sym: c.sym, name: c.name, sec: c.sec, mc, pe, divYld, roe: c.roe };
    });

    setRankings({
      byMarketCap: merged.filter(s => s.mc > 0).sort((a,b) => b.mc - a.mc).slice(0,10),
      byDividend:  merged.filter(s => s.divYld > 0).sort((a,b) => b.divYld - a.divYld).slice(0,10),
      byROE:       merged.filter(s => s.roe > 0).sort((a,b) => b.roe - a.roe).slice(0,10),
      byPE:        merged.filter(s => s.pe > 0).sort((a,b) => a.pe - b.pe).slice(0,10),
    });
  }, [constants, stocksLive]);

  return { rankings, loading };
};

export default useRankings;
