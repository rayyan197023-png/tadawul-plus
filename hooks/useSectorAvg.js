'use client';
/**
 * @module hooks/useSectorAvg
 * @description متوسطات القطاع - محسوبة ومخزّنة 3 أشهر
 *
 * المنطق: الأساسيات تتغير ربعياً فقط (إعلانات الشركات)
 * لذا نحسب المتوسط مرة ونثبّته 3 أشهر.
 */
import { useState, useEffect } from 'react';

// مدة الصلاحية: 3 أشهر بالميلي ثانية
const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 يوم

// مفتاح التخزين
const cacheKey = (sector) => `sectorAvg_${sector}`;

// قراءة من localStorage مع فحص العمر
const readCache = (sector) => {
  try {
    const raw = localStorage.getItem(cacheKey(sector));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - (parsed.timestamp || 0);
    if (age > CACHE_DURATION) return null; // قديم
    return parsed.data; // صالح
  } catch (e) {
    return null;
  }
};

// حفظ في localStorage مع تاريخ
const writeCache = (sector, data) => {
  try {
    localStorage.setItem(cacheKey(sector), JSON.stringify({
      timestamp: Date.now(),
      data: data,
    }));
  } catch (e) {
    // تجاهل أخطاء التخزين
  }
};

/**
 * Hook لجلب متوسط القطاع
 * @param {string} sector - اسم القطاع (مثل "Energy")
 * @returns {object} { avg, loading } حيث avg = {netMargin, roe, pe} أو null
 */
export const useSectorAvg = (sector) => {
  const [avg, setAvg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sector) return;
    let cancelled = false;

    // 1. تحقق من cache (3 أشهر)
    const cached = readCache(sector);
    if (cached) {
      setAvg(cached);
      return; // صالح - لا حساب
    }

    // 2. قديم/مفقود → احسب (الخطوة 2 لاحقاً)
    // مؤقتاً: لا حساب بعد (نبنيه في الخطوة 2)
    setLoading(true);
    computeSectorAvg(sector).then(result => {
      if (cancelled) return;
      if (result) {
        writeCache(sector, result);
        setAvg(result);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [sector]);

  return { avg, loading };
};

// حساب المتوسط (الخطوة 2 - مؤقتاً فارغ)
const computeSectorAvg = async (sector) => {
  // سنبنيه في الخطوة 2
  return null;
};

export default useSectorAvg;
