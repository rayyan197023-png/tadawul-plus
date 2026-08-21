/**
 * @module engines/winnerManager
 * @description إدارة Winner: مقارنة، تطبيق، أرشفة، Walk-Forward Rebuild
 *
 * 🎯 الهدف:
 * عند ظهور Winner جديد:
 * ① مقارنة آلية مع Winner السابق بالمعادلة المُرجَّحة.
 * ② إن كان أفضل (بشروط صارمة):
 *    - أرشفة AI Learning القديم
 *    - مسح AI Learning النشط
 *    - Walk-Forward Rebuild على بيانات سنتين
 *    - حفظ Winner + alert
 * ③ إن لم يكن: حفظ في الأرشيف فقط.
 *
 * 📚 المبادئ العلميّة:
 * - Forward Testing (Pardo 2008)
 * - Walk-Forward Analysis (no lookahead)
 * - Weighted Multi-Criteria Decision (MCDM)
 *
 * @author تداول+
 * @version 1.0
 */

'use client';

import { Strategy } from './strategyGenerator';
import { archiveAILearning, clearAILearning, restoreLastAIArchive } from './aiLearningWeights';

// ════════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════════

const WINNER_STORE_KEY = 'tdw_winning_strategy';
const WINNER_HISTORY_KEY = 'tdw_winner_history';

/**
 * أوزان المعادلة المُرجَّحة (مجموع = 100)
 * Score = CAGR×30 + Alpha×30 + (-MaxDD)×20 + Sortino×10 + WinRate×10
 */
const SCORE_WEIGHTS = {
  cagr: 30,
  alpha: 30,
  maxDD: 20,    // يُحسب كـ (-MaxDD) لأنّ MaxDD سالب
  sortino: 10,
  winRate: 10,
};

/**
 * الشروط الصارمة للتطبيق التلقائيّ
 */
const STRICT_GATES = {
  minTestFitness: 0,        // Test Fitness > 0
  minTestCAGR: 0,           // CAGR > 0
  minClosedTrades: 10,      // ≥ 10 صفقة مغلقة
  maxOverfitting: 0.30,     // < 30%
  minAlphaImprovement: 0,   // Alpha > السابق (بدون فرق أدنى)
  minDDImprovement: 0,      // Max DD < السابق
};

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

export interface WinnerMetrics {
  cagr: number;
  alpha: number;
  maxDD: number;       // سالب عادةً (مثلاً -3.5)
  sortino: number;
  winRate: number;
  closedTrades: number;
  testFitness: number;
  overfitting: number;
}

export interface StoredWinner {
  weights: any;
  params: any;
  targetType: string;
  metrics: WinnerMetrics;
  score: number;
  appliedAt: number;
  generation?: number;
}

export interface WinnerEvaluation {
  applied: boolean;
  reason: string;
  newScore: number;
  oldScore: number | null;
  failedGates: string[];
}

// ════════════════════════════════════════════════════════════
//  SCORE CALCULATION
// ════════════════════════════════════════════════════════════

/**
 * 📊 حساب Score المُرجَّح لاستراتيجية
 * 
 * Score = CAGR×30 + Alpha×30 + (-MaxDD)×20 + Sortino×10 + WinRate×10
 * 
 * المقاييس مُطبَّعة:
 * - CAGR, Alpha: نسب مئويّة (مثلاً 5.0 = 5%)
 * - MaxDD: نسبة سلبيّة (مثلاً -3.5)
 * - Sortino: عدد بدون وحدة
 * - WinRate: نسبة مئويّة (0-100)
 */
export function calculateWinnerScore(metrics: WinnerMetrics): number {
  const W = SCORE_WEIGHTS;
  
  const score = 
    (metrics.cagr * W.cagr) +
    (metrics.alpha * W.alpha) +
    ((-metrics.maxDD) * W.maxDD) +       // -MaxDD يحول السالب لإيجابي
    // ✨ Sortino نطاقه ~0.5 بينما CAGR/Alpha بالنسب المئوية -- نُطبّعه ×10
    //    ليعكس وزنه المعلن (10%) بدل 0.6% فعلياً
    (metrics.sortino * W.sortino * 10) +
    (metrics.winRate * W.winRate / 10);
  
  return +score.toFixed(2);
}

// ════════════════════════════════════════════════════════════
//  STORAGE HELPERS
// ════════════════════════════════════════════════════════════

/**
 * 📥 قراءة Winner المحفوظ
 */
export function loadCurrentWinner(): StoredWinner | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(WINNER_STORE_KEY);
    if (!raw) return null;
    
    const data = JSON.parse(raw);
    if (!data || !data.weights) return null;
    
    return data as StoredWinner;
  } catch (e) {
    return null;
  }
}

/**
 * 💾 حفظ Winner كحالي
 */
function saveCurrentWinner(winner: StoredWinner): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(WINNER_STORE_KEY, JSON.stringify(winner));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 📚 إضافة Winner للأرشيف التاريخيّ
 */
function addToHistory(winner: StoredWinner, wasApplied: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    
    let history: any[] = [];
    const existing = localStorage.getItem(WINNER_HISTORY_KEY);
    if (existing) {
      try { history = JSON.parse(existing); } catch (e) {}
    }
    
    history.push({
      ...winner,
      wasApplied,
      timestamp: Date.now(),
    });
    
    // الاحتفاظ بآخر ٥٠ فائز فقط
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    localStorage.setItem(WINNER_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════
//  STRICT GATES VALIDATION
// ════════════════════════════════════════════════════════════

/**
 * 🚦 التحقّق من الشروط الصارمة
 * 
 * يُرجع قائمة الشروط الفاشلة (فارغة = نجاح كامل)
 */
function checkStrictGates(
  newMetrics: WinnerMetrics,
  oldWinner: StoredWinner | null
): string[] {
  const failed: string[] = [];
  const G = STRICT_GATES;
  
  // الشروط الأساسيّة (لا تعتمد على وجود winner سابق)
  if (newMetrics.testFitness <= G.minTestFitness) {
    failed.push(`Test Fitness ≤ ${G.minTestFitness}`);
  }
  
  if (newMetrics.cagr <= G.minTestCAGR) {
    failed.push(`CAGR ≤ ${G.minTestCAGR}%`);
  }
  
  if (newMetrics.closedTrades < G.minClosedTrades) {
    failed.push(`Trades < ${G.minClosedTrades} (only ${newMetrics.closedTrades})`);
  }
  
  if (newMetrics.overfitting > G.maxOverfitting) {
    failed.push(`Overfitting > ${G.maxOverfitting * 100}%`);
  }
  
  // الشروط المقارَنة (تتطلّب winner سابقاً)
  if (oldWinner && oldWinner.metrics) {
    const old = oldWinner.metrics;
    
    if (newMetrics.alpha <= old.alpha + G.minAlphaImprovement) {
      failed.push(`Alpha (${newMetrics.alpha.toFixed(1)}%) ≤ Old (${old.alpha.toFixed(1)}%)`);
    }
    
    // ✨ MaxDD سالب، فالأفضل هو الأقرب للصفر.
    //    نسمح بتدهور حتى 3 نقاط إن كان العائد المعدّل بالمخاطر أفضل بوضوح
    //    (الشرط المطلق كان يرفض استراتيجية بضعف العائد لتراجع أسوأ بنقطة واحدة)
    const _ddTolerance = (newMetrics.sortino > old.sortino * 1.25) ? 3 : 0;
    if (newMetrics.maxDD < old.maxDD - _ddTolerance) {
      failed.push(`MaxDD (${newMetrics.maxDD.toFixed(1)}%) أسوأ من السابق (${old.maxDD.toFixed(1)}%)`);
    }
  }
  
  return failed;
}

// ════════════════════════════════════════════════════════════
//  MAIN EVALUATION FUNCTION
// ════════════════════════════════════════════════════════════

/**
 * 🎯 تقييم Winner جديد وتطبيقه إن كان يستحقّ
 * 
 * @param newStrategy - الاستراتيجية الفائزة من Strategy Lab
 * @param newMetrics - مقاييس الأداء (من Test set)
 * @param walkForwardCallback - دالة Walk-Forward (اختياريّة)
 * @returns تقرير التقييم
 */
export async function evaluateAndApplyWinner(
  newStrategy: Strategy,
  newMetrics: WinnerMetrics,
  walkForwardCallback?: () => Promise<boolean>
): Promise<WinnerEvaluation> {
  // ① حساب Score الجديد
  const newScore = calculateWinnerScore(newMetrics);
  
  // ② قراءة Score القديم
  const oldWinner = loadCurrentWinner();
  const oldScore = oldWinner ? (oldWinner.score || 0) : null;
  
  // ③ بناء كائن Winner الجديد
  const candidate: StoredWinner = {
    weights: newStrategy.weights,
    params: newStrategy.params,
    targetType: newStrategy.targetType,
    metrics: newMetrics,
    score: newScore,
    appliedAt: Date.now(),
    generation: newStrategy.generation,
  };
  
  // ④ التحقّق من الشروط الصارمة
  const failedGates = checkStrictGates(newMetrics, oldWinner);
  
  if (failedGates.length > 0) {
    // فشل الشروط → حفظ في الأرشيف فقط
    addToHistory(candidate, false);
    
    return {
      applied: false,
      reason: 'فشل في الشروط الصارمة',
      newScore,
      oldScore,
      failedGates,
    };
  }
  
  // ⑤ المقارنة بالـ Score
  if (oldScore !== null && newScore <= oldScore) {
    addToHistory(candidate, false);
    
    return {
      applied: false,
      reason: `Score الجديد (${newScore}) ≤ القديم (${oldScore})`,
      newScore,
      oldScore,
      failedGates: [],
    };
  }
  
  // ⑥ Winner أفضل! → Walk-Forward Rebuild
  
  // أرشفة AI Learning القديم
  archiveAILearning('winner_change');
  
  // مسح AI Learning النشط
  clearAILearning();
  
  // تشغيل Walk-Forward (إن وجد callback)
  let walkForwardSuccess = true;
  if (walkForwardCallback) {
    try {
      walkForwardSuccess = await walkForwardCallback();
    } catch (e) {
      console.error('[winnerManager] Walk-Forward failed:', e);
      walkForwardSuccess = false;
    }
  }

  // ✨ عند فشل Walk-Forward نستعيد الأرشيف بدل ترك النظام فارغاً
  if (!walkForwardSuccess) {
    const _restored = restoreLastAIArchive();
    console.warn('[winnerManager] WF failed -- archive restored:', _restored);
  }
  
  // ⑦ حفظ Winner كحاليّ
  saveCurrentWinner(candidate);
  addToHistory(candidate, true);
  
  return {
    applied: true,
    reason: walkForwardSuccess
      ? '✅ Winner جديد طُبِّق + AI Learning أُعيد بناؤه'
      : '⚠ Winner طبِّق لكن Walk-Forward فشل (AI Learning فارغ)',
    newScore,
    oldScore,
    failedGates: [],
  };
}

// ════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * 📜 الحصول على تاريخ Winners
 */
export function getWinnerHistory(): any[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(WINNER_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * 📊 معلومات Winner الحاليّ (للعرض)
 */
export function getCurrentWinnerInfo(): {
  exists: boolean;
  metrics?: WinnerMetrics;
  score?: number;
  appliedAt?: number;
  daysActive?: number;
} {
  const winner = loadCurrentWinner();
  
  if (!winner) {
    return { exists: false };
  }
  
  const now = Date.now();
  const daysActive = Math.floor((now - winner.appliedAt) / (1000 * 60 * 60 * 24));
  
  return {
    exists: true,
    metrics: winner.metrics,
    score: winner.score,
    appliedAt: winner.appliedAt,
    daysActive,
  };
}

/**
 * ♻️ استعادة آخر أرشيف من AI Learning
 * تُستعمل عند فشل Walk-Forward Rebuild -- لا نترك النظام فارغاً
 */
export function restoreLastAIArchive(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('tdw_feedback_archive');
    if (!raw) return false;
    const archives = JSON.parse(raw);
    if (!Array.isArray(archives) || archives.length === 0) return false;
    const last = archives[archives.length - 1];
    if (!last || !last.data) return false;
    localStorage.setItem(FEEDBACK_STORE_KEY, last.data);
    return true;
  } catch (e) {
    console.warn('[aiLearningWeights] Restore failed:', e);
    return false;
  }
}



