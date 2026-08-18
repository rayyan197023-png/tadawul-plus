/**
 * @module engines/aiLearningWeights
 * @description توليد أوزان محسَّنة من بيانات AI Learning
 *
 * 🎯 الهدف:
 * قراءة tdw_feedback_state وتوليد Anchor Weights للجيل القادم
 * في Strategy Lab، بناءً على دقّة كل طبقة فعلياً.
 *
 * 📚 المبدأ العلمي:
 * Bayesian Updating - Pearl (1988)
 * - الأوزان تتعدّل حسب الأدلّة المتراكمة.
 * - الطبقات الأكثر دقّة تأخذ وزناً أكبر.
 *
 * @author تداول+
 * @version 1.0
 */

'use client';

import { StrategyWeights } from './strategyGenerator';

// ════════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════════

const FEEDBACK_STORE_KEY = 'tdw_feedback_state';

/**
 * الأوزان الافتراضيّة (متساوية تقريباً)
 * تُستعمل إن لم تتوفّر بيانات AI Learning كافية
 */
const DEFAULT_WEIGHTS: StrategyWeights = {

/**
 * الحدّ الأدنى من الصفقات لتُعتبر طبقة موثوقة
 */
const MIN_TRADES_FOR_RELIABILITY = 20;

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

interface LayerStats {
  total: number;
  correct: number;
  accuracy: number;
}

interface AggregatedLayerStats {
  L1: LayerStats; L2: LayerStats; L3: LayerStats;
  L4: LayerStats; L5: LayerStats; L6: LayerStats;
  L7: LayerStats; L8: LayerStats; L9: LayerStats;
}

// ════════════════════════════════════════════════════════════
//  CORE FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * قراءة AI Learning state من localStorage
 */
function loadFeedbackState(): any {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FEEDBACK_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[aiLearningWeights] Failed to load:', e);
    return null;
  }
}

/**
 * تجميع إحصاءات الطبقات عبر كل الأسهم
 * 
 * AI Learning يخزّن إحصاءات لكل سهم. هنا نُجمّعها لنحصل
 * على دقّة الطبقات على مستوى السوق بالكامل.
 */
function aggregateLayerStats(state: any): AggregatedLayerStats | null {
  if (!state || typeof state !== 'object') return null;
  
  const layerKeys: (keyof StrategyWeights)[] = ['L1','L2','L3','L4','L5','L6','L7','L8','L9'];
  
  // تهيئة المجاميع
  const agg: any = {};
  layerKeys.forEach(k => {
    agg[k] = { total: 0, correct: 0, accuracy: 0 };
  });
  
  let symbolCount = 0;
  
  // التجميع عبر كل الأسهم
  for (const sym in state) {
    const symData = state[sym];
    if (!symData || !symData.layers) continue;
    
    const layers = symData.layers;
    
    layerKeys.forEach(k => {
      if (layers[k] && typeof layers[k].total === 'number') {
        agg[k].total += layers[k].total;
        agg[k].correct += layers[k].correct || 0;
      }
    });
    
    symbolCount++;
  }
  
  if (symbolCount === 0) return null;
  
  // حساب accuracy لكل طبقة
  layerKeys.forEach(k => {
    agg[k].accuracy = agg[k].total > 0 
      ? agg[k].correct / agg[k].total 
      : 0.5;  // افتراض 50% إن لم توجد بيانات
  });
  
  return agg as AggregatedLayerStats;
}

/**
 * تحويل دقّة الطبقات إلى أوزان
 * 
 * المنطق:
 * - الطبقات الأعلى دقّة → وزن أعلى
 * - نطبّق softmax لتطبيع التوزيع
 * - نضمن مجموع الأوزان = 1.0
 */
function statsToWeights(stats: AggregatedLayerStats): StrategyWeights {
  const layerKeys: (keyof StrategyWeights)[] = ['L1','L2','L3','L4','L5','L6','L7','L8','L9'];
  
  // ① حساب "score" لكل طبقة بناءً على الدقّة والثقة
  const scores: Record<string, number> = {};
  
  layerKeys.forEach(k => {
    const stat = stats[k];
    
    // عامل الثقة: كلّما زادت الصفقات زادت الثقة (max 1.0)
    const confidence = Math.min(1.0, stat.total / MIN_TRADES_FOR_RELIABILITY);
    
    // النتيجة = الدقّة × الثقة + (1 - الثقة) × الافتراضيّ
    const defaultAcc = 0.5;
    scores[k] = stat.accuracy * confidence + defaultAcc * (1 - confidence);
  });
  
  // ② تطبيق exponential لتعزيز الفروقات
  const expScores: Record<string, number> = {};
  layerKeys.forEach(k => {
    // مضاعفة بـ 3 لتعزيز الفروقات بين الطبقات
    expScores[k] = Math.exp(scores[k] * 3);
  });
  
  // ③ التطبيع (Sum = 1.0)
  const total = layerKeys.reduce((s, k) => s + expScores[k], 0);
  
  if (total <= 0) {
    return DEFAULT_WEIGHTS;
  }
  
  const weights: any = {};
  layerKeys.forEach(k => {
    weights[k] = +(expScores[k] / total).toFixed(4);
  });
  
  return weights as StrategyWeights;
}

// ════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════

/**
 * 🎯 توليد Anchor Weights من بيانات AI Learning
 * 
 * يُستعمل في Strategy Lab كنقطة بداية ذكيّة بدل العشوائيّ الكامل.
 * 
 * @returns الأوزان المُولَّدة أو null إن لم توجد بيانات كافية
 */
export function generateAnchorFromAILearning(): StrategyWeights | null {
  const state = loadFeedbackState();
  if (!state) return null;
  
  const stats = aggregateLayerStats(state);
  if (!stats) return null;
  
  // التحقّق: هل لدينا بيانات كافية على الأقلّ؟
  const totalTrades = Object.values(stats).reduce(
    (s: number, lay: any) => s + (lay.total || 0), 
    0
  );
  const totalCorrect = Object.values(stats).reduce(
    (s: number, lay: any) => s + (lay.correct || 0),
    0
  );
  
  if (totalTrades < MIN_TRADES_FOR_RELIABILITY * 5) {
    // أقلّ من 100 صفقة → لا نثق بعد
    return null;
  }
  
  // 🆕 شرط الدقّة: لا نستعمل Anchor إلا إن كانت الدقّة الإجمالية ≥ 40%
  // السبب العلميّ: Anchor من بيانات ضعيفة يُضلّل بدل أن يُساعد
  const overallAccuracy = totalTrades > 0 ? totalCorrect / totalTrades : 0;
  if (overallAccuracy < 0.40) {
    console.log('[Anchor] Disabled: accuracy ' + (overallAccuracy * 100).toFixed(1) + '% < 40% threshold');
    return null;
  }
  
  console.log('[Anchor] Enabled: accuracy ' + (overallAccuracy * 100).toFixed(1) + '%');
  const weights = statsToWeights(stats);
  
  return weights;
}

/**
 * 🔍 الحصول على إحصاءات AI Learning (للعرض/التشخيص)
 */
export function getAILearningStats(): {
  symbolCount: number;
  totalTrades: number;
  overallAccuracy: number;
  layerAccuracies: Record<string, number>;
} | null {
  const state = loadFeedbackState();
  if (!state) return null;
  
  const stats = aggregateLayerStats(state);
  if (!stats) return null;
  
  const layerKeys: (keyof StrategyWeights)[] = ['L1','L2','L3','L4','L5','L6','L7','L8','L9'];
  
  let totalTrades = 0;
  let totalCorrect = 0;
  const layerAccuracies: Record<string, number> = {};
  
  layerKeys.forEach(k => {
    totalTrades += stats[k].total;
    totalCorrect += stats[k].correct;
    layerAccuracies[k] = +stats[k].accuracy.toFixed(3);
  });
  
  const symbolCount = Object.keys(state).length;
  
  return {
    symbolCount,
    totalTrades,
    overallAccuracy: totalTrades > 0 ? +(totalCorrect / totalTrades).toFixed(3) : 0,
    layerAccuracies,
  };
}

/**
 * 🧹 أرشفة AI Learning الحاليّ (قبل المسح)
 * 
 * يُستعمل قبل Walk-Forward Rebuild لحفظ التاريخ.
 */
export function archiveAILearning(reason: string = 'winner_change'): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    
    const current = localStorage.getItem(FEEDBACK_STORE_KEY);
    if (!current) return false;
    
    const archive = {
      data: current,
      archivedAt: Date.now(),
      reason,
    };
    
    // نحفظ آخر 3 أرشيفات فقط
    const ARCHIVE_KEY = 'tdw_feedback_archive';
    let archives: any[] = [];
    
    try {
      const existing = localStorage.getItem(ARCHIVE_KEY);
      if (existing) archives = JSON.parse(existing);
    } catch (e) {}
    
    archives.push(archive);
    if (archives.length > 3) {
      archives = archives.slice(-3);
    }
    
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives));
    return true;
  } catch (e) {
    console.warn('[aiLearningWeights] Archive failed:', e);
    return false;
  }
}

/**
 * 🧼 مسح AI Learning الحاليّ
 * 
 * يُستعمل قبل Walk-Forward Rebuild.
 * تأكّد من استدعاء archiveAILearning() أوّلاً!
 */
export function clearAILearning(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.removeItem(FEEDBACK_STORE_KEY);
    return true;
  } catch (e) {
    console.warn('[aiLearningWeights] Clear failed:', e);
    return false;
  }
}
