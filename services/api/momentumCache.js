'use client';
/**
 * @module momentumCache
 * @description كاش الزخم -- يخزّن رقمين لكل سهم بدل 248 شمعة
 *
 * المشكلة: الزخم 12 شهراً (Jegadeesh & Titman) يحتاج سنة من الشموع،
 * وتحميلها لـ248 سهماً يستنفد ذاكرة الجوال (~500 ألف كائن).
 *
 * الحل: نجلب السنة مرة واحدة أسبوعياً، ونستخرج رقمين فقط:
 *   p12m = السعر قبل 12 شهراً
 *   p1m  = السعر قبل شهر (لتخطّي الشهر الأخير كما تقتضي المنهجية)
 * فالذاكرة تنخفض من ~500,000 كائن إلى ~500 رقم.
 */

const KEY = 'tp_momentum';
const TTL_DAYS = 7;

function _load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
}

function _save(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
}

/** يُرجع { p12m, p1m } أو null */
export function getMomentumPoints(sym) {
  const all = _load();
  const hit = all[sym];
  if (hit && (Date.now() - hit.t) < TTL_DAYS * 86400000) return hit.d;
  return null;
}

/** يجلب نقاط الزخم لسهم واحد ويخزّنها */
export async function fetchMomentumPoints(sym) {
  const cached = getMomentumPoints(sym);
  if (cached) return cached;

  try {
      if (sym === '1120') alert('١ -- بدأ جلب 1120');
    const res = await fetch('/api/sahmkdata?endpoint=ohlcv&sym=' + sym + '&period=1Y');
    if (!res.ok) return null;
    const j = await res.json();
    const rows = Array.isArray(j) ? j : (j.data || j.results || j.candles || []);
        if (sym === '1120') alert('٢ -- وصلت الاستجابة · صفوف: ' + (Array.isArray(rows) ? rows.length : 'ليست مصفوفة'));
    if (!Array.isArray(rows) || rows.length < 120) return null;

    const closes = rows.map(r => +(r.close ?? r.c ?? 0)).filter(v => v > 0);
    if (closes.length < 120) return null;

    const n = closes.length;
    const out = {
      p12m: closes[0],                       // أقدم سعر (~سنة)
      p1m: closes[Math.max(0, n - 22)],      // قبل شهر
      n: n,
    };

    const all = _load();
    all[sym] = { t: Date.now(), d: out };
        if (sym === '1120') alert('٣ -- حُفظ: ' + JSON.stringify(out));
    _save(all);
    return out;
  } catch (e) {
    return null;
  }
}

/** يجلب دفعة -- 3 متزامنة تفادياً للحمل */
export async function loadMomentumBatch(symbols, concurrency = 3) {
  for (let i = 0; i < symbols.length; i += concurrency) {
    const chunk = symbols.slice(i, i + concurrency);
    await Promise.all(chunk.map(s => fetchMomentumPoints(s)));
    await new Promise(r => setTimeout(r, 200));
  }
}

/** يُعرّض الكاش للمحرّكات */
export function exposeMomentumCache() {
  try {
    const all = _load();
    const flat = {};
    Object.keys(all).forEach(k => {
      if ((Date.now() - all[k].t) < TTL_DAYS * 86400000) flat[k] = all[k].d;
    });
    window.__MOMENTUM__ = flat;
    return Object.keys(flat).length;
  } catch (e) { return 0; }
}
