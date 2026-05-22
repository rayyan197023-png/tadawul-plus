'use client';
/**
 * @module hooks/useSectorAvg
 * @description متوسطات القطاع - محسوبة من أكبر 6 شركات، مخزّنة 3 أشهر
 *
 * المنطق: الأساسيات تتغير ربعياً فقط (إعلانات الشركات)
 * لذا نحسب المتوسط مرة كل 3 أشهر من أكبر شركات القطاع.
 *
 * نعرف القطاع من بادئة الرمز (نظام تداول السعودي):
 *   1xxx=بنوك | 2xxx=طاقة/بتروكيماويات | 3xxx=أسمنت
 *   4xxx=متنوع | 6xxx=أغذية | 7xxx=اتصالات | 8xxx=تأمين
 */
import { useState, useEffect } from 'react';

// مدة الصلاحية: 3 أشهر
const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 يوم

// أكبر 6 شركات في كل مجموعة (ببادئة الرمز)
const SECTOR_GROUPS = {
  "1": ['1120','1180','1010','1150','1060','1080'], // بنوك: الراجحي، الأهلي، الرياض، الإنماء، الأول، العربي
  "2": ['2222','2010','2350','2290','2330','2310'], // طاقة/بتروكيماويات: أرامكو، سابك، كيان، ينساب، المتقدمة، سبكيم
  "3": ['3030','3050','3060','3010','3020','3040'], // أسمنت: السعودية، الجنوب، ينبع، العربية، اليمامة، القصيم
  "4": ['4190','4002','4004','4013','4250','4001'], // متنوع: جرير، المواساة، دله، الحبيب، جبل عمر، العثيم
  "6": ['6010','6001','6002','6004','2280','2050'], // أغذية: نادك، حلواني، هرفي، كاتريون، المراعي، صافولا
  "7": ['7010','7020','7030','7040','7203','7200'], // اتصالات: STC، اتحاد، زين، قو، علم، MIS
  "8": ['8210','8010','8200','8230','8060','8070'], // تأمين: بوبا، التعاونية، الإعادة، تكافل الراجحي، ولاء، الدرع
};

// مفتاح التخزين (بالبادئة)
const cacheKey = (prefix) => `sectorAvg_${prefix}`;

// قراءة من localStorage مع فحص العمر
const readCache = (prefix) => {
  try {
    const raw = localStorage.getItem(cacheKey(prefix));
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
const writeCache = (prefix, data) => {
  try {
    localStorage.setItem(cacheKey(prefix), JSON.stringify({
      timestamp: Date.now(),
      data: data,
    }));
  } catch (e) {
    // تجاهل أخطاء التخزين
  }
};

// جلب ratios + pe لسهم واحد عبر proxy
const fetchStockMetrics = async (sym) => {
  try {
    // ratios (roe, netMargin)
    const rRes = await fetch(`/api/sahmkdata?endpoint=ratios&sym=${sym}`);
    const rData = rRes.ok ? await rRes.json() : null;
    const arr = rData?.ratios || [];
    const r = arr.length > 0 ? (arr[0].ratios || {}) : {};

    // fundamentals (pe)
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

// تأخير بسيط (تجنب 429)
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// حساب المتوسط (دفعات من 2 + تأخير)
const computeSectorAvg = async (prefix) => {
  const peers = SECTOR_GROUPS[prefix];
  if (!peers || peers.length === 0) return null;

  const results = [];
  // دفعات من 2 سهم + تأخير 800ms بين الدفعات
  for (let i = 0; i < peers.length; i += 2) {
    const batch = peers.slice(i, i + 2);
    const batchResults = await Promise.all(batch.map(fetchStockMetrics));
    batchResults.forEach(m => { if (m) results.push(m); });
    if (i + 2 < peers.length) await delay(800); // تأخير بين الدفعات
  }

  if (results.length === 0) return null;

  // حساب المتوسط (تجاهل null)
  const avgOf = (key) => {
    const vals = results.map(r => r[key]).filter(v => v != null && isFinite(v));
    if (vals.length === 0) return null;
    return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  };

  return {
    netMargin: avgOf('netMargin'),
    roe:       avgOf('roe'),
    pe:        avgOf('pe'),
    count:     results.length,
  };
};

/**
 * Hook لجلب متوسط القطاع (من أكبر 6 شركات)
 * @param {string} sym - رمز السهم (نستخرج القطاع من بادئته)
 * @returns {object} { avg, loading } حيث avg = {netMargin, roe, pe, count} أو null
 */
export const useSectorAvg = (sym) => {
  const [avg, setAvg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sym) return;
    const prefix = String(sym).charAt(0);
    if (!SECTOR_GROUPS[prefix]) return; // قطاع غير مدعوم
    let cancelled = false;

    // 1. تحقق من cache (3 أشهر)
    const cached = readCache(prefix);
    if (cached) {
      setAvg(cached);
      return; // صالح - لا حساب
    }

    // 2. قديم/مفقود → احسب (دفعات)
    setLoading(true);
    computeSectorAvg(prefix).then(result => {
      if (cancelled) return;
      if (result) {
        writeCache(prefix, result);
        setAvg(result);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [sym]);

  return { avg, loading };
};

export default useSectorAvg;
