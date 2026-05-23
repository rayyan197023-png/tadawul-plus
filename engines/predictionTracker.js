'use client';
/**
 * @module engines/predictionTracker
 * @description تتبّع توصيات لوحة التحليل → AI Learning (context: live)
 *
 * الآلية:
 * 1. savePredictions: يحفظ "شراء قوي" مرة يومياً (snapshot)
 * 2. evaluatePredictions: بعد 7 أيام، يراجع كل توصية:
 *    - ارتفع السعر = صح ✓ / هبط = خطأ ✗
 *    - recordFeedback (context: live) → يصحّح الأوزان
 *    - يحذف المُقيَّمة
 */
import { recordFeedback } from './analysisEngine';

const PENDING_KEY  = 'tdw_pending_predictions';
const LASTSAVE_KEY = 'tdw_predictions_lastsave';
const MIN_DAYS     = 7;
const DAY_MS       = 86400000;

// ── مفتاح اليوم (YYYY-MM-DD) لحارس الحفظ اليومي ──
function todayKey() {
  var d = new Date();
  return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
}

/**
 * حفظ "شراء قوي" -- مرة واحدة يومياً (snapshot)
 * @param {Array} strongBuys [{sym, signal, layers, price}]
 */
export function savePredictions(strongBuys) {
  try {
    if (!Array.isArray(strongBuys) || strongBuys.length === 0) return;

    // ── حارس الحفظ اليومي: إن حُفظ اليوم، تخطَّ ──
    var lastSave = localStorage.getItem(LASTSAVE_KEY);
    if (lastSave === todayKey()) return;

    var raw = localStorage.getItem(PENDING_KEY);
    var pending = raw ? JSON.parse(raw) : {};
    var now = Date.now();

    strongBuys.forEach(function(p){
      if (!p || !p.sym || !p.price) return;
      // توصية واحدة لكل سهم (الأحدث تحفظ فقط إن لم تكن هناك توصية معلّقة)
      // إن وُجدت توصية معلّقة لم تُقيَّم بعد، لا نكتب فوقها (نحافظ على تاريخها)
      if (pending[p.sym]) return;
      pending[p.sym] = {
        signal: p.signal,
        layers: p.layers || {},
        price:  p.price,
        date:   now,
      };
    });

    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    localStorage.setItem(LASTSAVE_KEY, todayKey());
  } catch (e) {}
}

/**
 * مراجعة التوصيات القديمة (7+ أيام) وتسجيلها في AI Learning
 * @param {Object} currentPrices {sym: price}
 */
export function evaluatePredictions(currentPrices) {
  try {
    if (!currentPrices) return;
    var raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    var pending = JSON.parse(raw);
    var now = Date.now();
    var changed = false;

    Object.keys(pending).forEach(function(sym){
      var pred = pending[sym];
      if (!pred) { delete pending[sym]; changed = true; return; }

      var ageDays = (now - pred.date) / DAY_MS;
      if (ageDays < MIN_DAYS) return; // لم تنضج بعد

      var cur = currentPrices[sym];
      if (!cur || !pred.price) {
        delete pending[sym]; changed = true; return; // سعر مفقود → احذف
      }

      var pnlPct = ((cur - pred.price) / pred.price) * 100;

      // ── Dead Zone + Anomaly (مطابق لـ Backtest) ──
      if (Math.abs(pnlPct) >= 0.5 && Math.abs(pnlPct) <= 30) {
        var outcome;
        if (pnlPct >= 10)       outcome = 2.0;
        else if (pnlPct >= 5)   outcome = 1.5;
        else if (pnlPct >= 3)   outcome = 1.0;
        else if (pnlPct >= 1)   outcome = 0.5;
        else if (pnlPct > 0)    outcome = 0.2;
        else if (pnlPct >= -1)  outcome = -0.2;
        else if (pnlPct >= -3)  outcome = -0.5;
        else if (pnlPct >= -5)  outcome = -1.0;
        else if (pnlPct >= -10) outcome = -1.5;
        else                    outcome = -2.0;

        // ⭐ context: live -- أقوى من backtest في getAdaptiveWeightAdjustment
        recordFeedback(sym, pred.signal, pred.layers, outcome, { type: 'live' });
      }

      // احذف المُقيَّمة (حتى لو في Dead Zone -- لا نعيد تقييمها)
      delete pending[sym];
      changed = true;
    });

    if (changed) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch (e) {}
}
