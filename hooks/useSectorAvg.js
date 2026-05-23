'use client';
/**
 * @module hooks/useSectorAvg
 * @description متوسطات القطاع - من أكبر 6 شركات (بالتقييم)، مخزّنة 3 أشهر
 *
 * يستخدم التصنيف الرسمي من stocksData (sectorId).
 * المنطق: الأساسيات تتغير ربعياً، نحسب مرة كل 3 أشهر.
 */
import { useState, useEffect } from 'react';
import { STOCKS, STOCKS_MAP } from '../constants/stocksData';

// مدة الصلاحية: 3 أشهر
const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000;

// مفتاح التخزين (بالـ sectorId)
const cacheKey = (sectorId) => `sectorAvg_${sectorId}`;

// قراءة من localStorage مع فحص العمر
const readCache = (sectorId) => {
  try {
    const raw = localStorage.getItem(cacheKey(sectorId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.timestamp || 0);
    if (age > CACHE_DURATION) return null;
    return parsed.data;
  } catch (e) {
    return null;
  }
};

// حفظ في localStorage مع تاريخ
const writeCache = (sectorId, data) => {
  try {
    localStorage.setItem(cacheKey(sectorId), JSON.stringify({
      timestamp: Date.now(),
      data: data,
    }));
  } catch (e) {}
};

// أكبر 6 شركات في القطاع (بالتقييم)
const getSectorPeers = (sym) => {
  const sectorId = STOCKS_MAP[sym]?.sectorId;
  if (!sectorId) return { sectorId: null, peers: [] };
  const peers = STOCKS
    .filter(s => s.sectorId === sectorId)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6)
    .map(s => s.sym);
  return { sectorId, peers };
};

// جلب ratios + pe لسهم واحد
const fetchStockMetrics = async (sym) => {
  try {
    const rRes = await fetch(`/api/sahmkdata?endpoint=ratios&sym=${sym}`);
    const rData = rRes.ok ? await rRes.json() : null;
    const arr = rData?.ratios || [];
    const r = arr.length > 0 ? (arr[0].ratios || {}) : {};

    const fRes = await fetch(`/api/sahmkdata?endpoint=fundamentals&sym=${sym}`);
    const fData = fRes.ok ? await fRes.json() : null;
    const f = fData?.fundamentals || {};

    return {
      roe:       r.roe != null ? r.roe : null,
      netMargin: r.net_margin != null ? r.net_margin : null,
      pe:        f.pe_ratio != null ? f.pe_ratio : null,
    };
  } catch (e) {
    return null;
  }
};

// تأخير (تجنب 429)
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// حساب المتوسط (دفعات من 2 + تأخير)
const computeSectorAvg = async (peers) => {
  if (!peers || peers.length === 0) return null;

  const results = [];
  for (let i = 0; i < peers.length; i += 2) {
    const batch = peers.slice(i, i + 2);
    const batchResults = await Promise.all(batch.map(fetchStockMetrics));
    batchResults.forEach(m => { if (m) results.push(m); });
    if (i + 2 < peers.length) await delay(800);
  }

  if (results.length === 0) return null;

    const avgOf = (key, maxValid) => {
    var vals = results.map(r => r[key]).filter(v => v != null && isFinite(v));
    // تصفية القيم الشاذة (outliers)
    if (maxValid != null) {
      vals = vals.filter(v => Math.abs(v) <= maxValid);
    }
    if (vals.length === 0) return null;
    return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  };

    return {
    netMargin: avgOf('netMargin', 100),   // هامش معقول < 100%
    roe:       avgOf('roe', 100),         // ROE معقول < 100%
    pe:        avgOf('pe', 200),          // P/E معقول < 200
    count:     results.length,
  };
};

/**
 * Hook لجلب متوسط القطاع (من أكبر 6 شركات بالتقييم)
 * @param {string} sym - رمز السهم
 * @returns {object} { avg, loading }
 */
export const useSectorAvg = (sym) => {
  const [avg, setAvg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sym) return;
    const { sectorId, peers } = getSectorPeers(sym);
    if (!sectorId || peers.length === 0) return;
    let cancelled = false;

    // 1. تحقق من cache (3 أشهر)
    const cached = readCache(sectorId);
    if (cached) {
      setAvg(cached);
      return;
    }

    // 2. احسب (دفعات)
    setLoading(true);
    computeSectorAvg(peers).then(result => {
      if (cancelled) return;
      if (result) {
        writeCache(sectorId, result);
        setAvg(result);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [sym]);

  return { avg, loading };
};

export default useSectorAvg;
