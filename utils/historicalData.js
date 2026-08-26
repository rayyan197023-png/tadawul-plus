// utils/historicalData.js
/**
 * ═══════════════════════════════════════════════════════════
 * historicalData.js -- جلب البيانات التاريخية الحقيقية من sahmk
 * ═══════════════════════════════════════════════════════════
 *
 * وحدة مشتركة قابلة للاستيراد في أي شاشة React.
 * مبنية على نمطَي chart-helpers المُجرَّبين (الجلب + التطبيع).
 *
 * cache ثلاثي الطبقات:
 *   ① ذاكرة الجلسة (memCache)      -- أسرع، يُمحى عند إغلاق التطبيق
 *   ② localStorage (عمر 12 ساعة)  -- يبقى بين الجلسات، يوفّر طلبات الشبكة
 *   ③ الشبكة (/api/sahmkdata)      -- المصدر، يُخزَّن في ①+②
 *   ④ fallback: مخزّن قديم (stale) -- عند فشل الشبكة، خير من لا شيء
 *
 * ⚠️ هذا الملف لا يُوصَّل بأي شاشة بعد -- يُختبر بمعزل أولاً (انظر آخر الملف).
 */

const CACHE_PREFIX = 'tp_hist_';        // مفتاح localStorage
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 ساعة
const MAX_BARS_STORED = 300;            // نخزّن آخر 300 شمعة فقط (سنة+) -- يكفي كل المحركات

// ① cache الذاكرة (يعيش طوال الجلسة)
const memCache = {}; // { [sym]: { bars, ts } }

/* ───────────────────────────────────────────────
   التطبيع -- مقتبس من normalizeCandles في chart-helpers
   يتعامل مع كل أشكال رد sahmk، يُخرج {o,hi,lo,c,v,t}
─────────────────────────────────────────────── */
function normalizeCandles(rawData) {
  if (!Array.isArray(rawData) || !rawData.length) return [];

  var sorted = rawData.map(function (d, i) {
    var t = d.t instanceof Date ? d.t
          : d.t         ? new Date(typeof d.t === 'number' && d.t < 1e12 ? d.t * 1000 : d.t)
          : d.timestamp ? new Date(typeof d.timestamp === 'number' && d.timestamp < 1e12 ? d.timestamp * 1000 : d.timestamp)
          : d.date      ? new Date(d.date)
          : d.time      ? new Date(d.time)
          : new Date(Date.now() - (rawData.length - 1 - i) * 86400000);

    var o  = +(d.o  || d.open  || d.Open  || 0);
    var hi = +(d.hi || d.high  || d.High  || d.h || 0);
    var lo = +(d.lo || d.low   || d.Low   || d.l || 0);
    var c  = +(d.c  || d.close || d.Close || d.last || d.lastTradedPrice || 0);
    var v  = +(d.v  || d.volume|| d.Volume|| d.vol  || d.tradeVolume || 0);

    hi = Math.max(hi, o, c);
    lo = Math.min(lo || c, o || c, c) || c;
    if (!o) o = c;

    return { o: o, hi: hi, lo: lo, c: c, v: v, t: t };
  })
  .filter(function (d) { return d.c > 0; }) // إزالة الشموع غير الصالحة
  .sort(function (a, b) { // فرز تصاعدي بالتاريخ (الأقدم أولاً) لاتجاه صحيح
    var ta = a.t ? a.t.getTime() : 0;
    var tb = b.t ? b.t.getTime() : 0;
    return ta - tb;
  });

  return crossValidateCandles(sorted);
}

/* ───────────────────────────────────────────────
   فحص اتّساق متسلسل -- يقارن كل شمعة بإغلاق سابقتها.
   يمنع شموعاً "متّسقة ذاتياً" (hi/lo منطقيان مقابل o/c
   لنفس الشمعة) لكنها فاسدة فعلياً مقارنة بسياق السهم
   (نفس فئة باغ الشمعة المشوّهة في الشارت). دالة مستقلة
   بدل تعديل Array.prototype.
─────────────────────────────────────────────── */
function crossValidateCandles(candles) {
  for (var i = 1; i < candles.length; i++) {
    var cur = candles[i], prev = candles[i - 1];
    if (!prev.c || prev.c <= 0) continue;
    var dev = function (v) { return Math.abs(v - prev.c) / prev.c; };
    var LIMIT = 0.30;

    if (dev(cur.o) > LIMIT) cur.o = dev(cur.c) <= LIMIT ? cur.c : prev.c;
    if (dev(cur.c) > LIMIT) cur.c = prev.c;

    cur.hi = Math.max(cur.hi, cur.o, cur.c);
    cur.lo = Math.min(cur.lo, cur.o, cur.c);
    if (dev(cur.hi) > LIMIT * 1.5) cur.hi = Math.max(cur.o, cur.c) * 1.01;
    if (dev(cur.lo) > LIMIT * 1.5) cur.lo = Math.min(cur.o, cur.c) * 0.99;
  }
  return candles;
}


/* ───────────────────────────────────────────────
   الجلب من الشبكة -- نمط API_CONFIG.fetch('candles')
   يفكّ كل أشكال الرد (bars/data/ohlcv/results/historical/مصفوفة مباشرة)
─────────────────────────────────────────────── */
async function fetchFromNetwork(sym, days) {
  var toD   = new Date();
  var fromD = new Date(Date.now() - days * 86400000);
  var fmt   = function (d) { return d.toISOString().slice(0, 10); };
  var url   = '/api/sahmkdata?endpoint=ohlcv&sym=' + encodeURIComponent(sym)
            + '&from=' + fmt(fromD) + '&to=' + fmt(toD);

  var r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  var data = await r.json();

  // فكّ أشكال رد sahmk المختلفة
  var rows = Array.isArray(data) ? data
           : Array.isArray(data.bars)       ? data.bars
           : Array.isArray(data.data)       ? data.data
           : Array.isArray(data.ohlcv)      ? data.ohlcv
           : Array.isArray(data.results)    ? data.results
           : Array.isArray(data.historical) ? data.historical
           : [];

  var bars = normalizeCandles(rows);
  if (bars.length > MAX_BARS_STORED) bars = bars.slice(-MAX_BARS_STORED); // آخر N شمعة
  return bars;
}

/* ───────────────────────────────────────────────
   قراءة/كتابة localStorage بأمان
─────────────────────────────────────────────── */
function readLS(sym) {
  try {
    var raw = localStorage.getItem(CACHE_PREFIX + sym);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    // نعيد بناء Date من النص المخزّن
    if (obj && Array.isArray(obj.bars)) {
      obj.bars = obj.bars.map(function (b) {
        return { o: b.o, hi: b.hi, lo: b.lo, c: b.c, v: b.v, t: b.t ? new Date(b.t) : null };
      });
    }
    return obj; // { bars, ts }
  } catch (e) { return null; }
}

function writeLS(sym, bars) {
  try {
    var payload = { bars: bars, ts: Date.now() };
    localStorage.setItem(CACHE_PREFIX + sym, JSON.stringify(payload));
  } catch (e) { /* localStorage ممتلئ أو محظور -- نتجاهل بصمت */ }
}

/* ───────────────────────────────────────────────
   الدالة الرئيسية: جلب مع cache ثلاثي
   @param {string} sym   رمز السهم (مثل '2010')
   @param {object} opts  { days = 365, ttlMs = CACHE_TTL_MS }
   @returns {Promise<{bars, source}>}
            source: 'memory' | 'localStorage' | 'network' | 'stale' | 'empty'
─────────────────────────────────────────────── */
export async function fetchHistoricalCached(sym, opts) {
  opts = opts || {};
  var days  = opts.days  || 365;
  var ttlMs = opts.ttlMs != null ? opts.ttlMs : CACHE_TTL_MS;
  var now   = Date.now();

  // ① ذاكرة الجلسة
  var mem = memCache[sym];
  if (mem && (now - mem.ts) < ttlMs && mem.bars.length) {
    return { bars: mem.bars, source: 'memory' };
  }

  // ② localStorage
  var ls = readLS(sym);
  if (ls && ls.bars && ls.bars.length && (now - ls.ts) < ttlMs) {
    memCache[sym] = { bars: ls.bars, ts: ls.ts }; // ارفعه للذاكرة
    return { bars: ls.bars, source: 'localStorage' };
  }

  // ③ الشبكة
  try {
    var bars = await fetchFromNetwork(sym, days);
    if (bars && bars.length) {
      memCache[sym] = { bars: bars, ts: now };
      writeLS(sym, bars);
      return { bars: bars, source: 'network' };
    }
  } catch (e) {
    // ④ fallback: مخزّن قديم (حتى لو تجاوز TTL) -- خير من لا شيء
    if (ls && ls.bars && ls.bars.length) {
      memCache[sym] = { bars: ls.bars, ts: ls.ts };
      return { bars: ls.bars, source: 'stale' };
    }
    if (mem && mem.bars.length) {
      return { bars: mem.bars, source: 'stale' };
    }
  }

  // فشل كامل -- لا بيانات (المتصل يتعامل: يسقط لـ genBars)
  return { bars: [], source: 'empty' };
}

/* ───────────────────────────────────────────────
   المحوّل: صيغة الشارت {o,hi,lo,c,v,t}
            → صيغة المحرك {o,open,c,close,hi,lo,vol,pct}
   ⚠️ حرج: المحركات (stockHealth/calcSmartAction/calcRadarScore)
   تتوقّع vol (لا v)، و open/close مكرّرين، و pct (التغيّر اليومي).
   هذا يطابق ما تنتجه genBars بعد إصلاح الخطوة 7.
─────────────────────────────────────────────── */
export function toEngineBars(candles) {
  if (!Array.isArray(candles) || !candles.length) return [];
  return candles.map(function (b, i) {
    var prevClose = i > 0 ? candles[i - 1].c : b.o;
    var pct = (prevClose && prevClose > 0) ? ((b.c - prevClose) / prevClose * 100) : 0;
    return {
      o: b.o, open: b.o,
      c: b.c, close: b.c,
      hi: b.hi, lo: b.lo,
      vol: b.v,
      pct: pct,
      t: b.t,
    };
  });
}

/* ───────────────────────────────────────────────
   أدوات مساعدة
─────────────────────────────────────────────── */
// دالة مدمجة مريحة: جلب + تحويل لصيغة المحرك مباشرة
// @returns {Promise<{bars, source}>} -- bars جاهزة للمحركات
export async function fetchEngineBars(sym, opts) {
  var result = await fetchHistoricalCached(sym, opts);
  return { bars: toEngineBars(result.bars), source: result.source };
}

/* ───────────────────────────────────────────────
   🧪 كيفية الاختبار بمعزل (قبل أي توصيل بالشاشات):

   في أي مكون مؤقت أو console المتصفح بعد import:

     import { fetchHistoricalCached, fetchEngineBars } from '../utils/historicalData';

     fetchHistoricalCached('2010').then(function(r){
       console.log('sahmk سابك:', r.source, r.bars.length, 'شمعة');
       console.log('أول شمعة:', r.bars[0]);
       console.log('آخر شمعة:', r.bars[r.bars.length-1]);
     });

   المتوقّع عند النجاح:
     - source: 'network' أول مرة، ثم 'memory'/'localStorage' بعدها
     - bars.length ≈ 250 (سنة تداول)
     - كل شمعة: {o, hi, lo, c, v, t}

   ثم اختبر المحوّل:
     fetchEngineBars('2010').then(function(r){
       console.log('صيغة المحرك:', r.bars[0]); // يجب أن تحوي o,open,c,close,hi,lo,vol,pct
     });

   إن رجع source:'empty' -- تحقّق من حدّ sahmk اليومي (429) أو رمز السهم.
─────────────────────────────────────────────── */

/* ───────────────────────────────────────────────
   ✨ الدالتان اللتان يستوردهما useOHLCVCache
   (كانتا مفقودتين فيفشل الجلب بصمت داخل try/catch،
    والبيانات تأتي من localStorage وحده)
─────────────────────────────────────────────── */

/** جلب شموع سهم واحد بصيغة المحرّك مباشرة */
export async function fetchBarsForStock(sym, days) {
  var r = await fetchEngineBars(sym, { days: days || 365 });
  return r.bars;
}


