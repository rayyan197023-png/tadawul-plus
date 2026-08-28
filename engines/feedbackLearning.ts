/**
 * @module engines/feedbackLearning
 * @description نظام التصويت الجماعي، الثقة، واستراتيجية التعلم التكيفي (ABM)
 * (منقول من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 */

import { _clamp } from './regimeWeighting';

/* ══════════════════════════════════════════════════════════════
   🎯 Ensemble Voting -- Professional Grade
══════════════════════════════════════════════════════════════ */
function ensembleVote(LA: number, LB: number, LC: number, regime: any, gates: any, layers: any): any {
  const L1 = layers ? (layers.L1 || 50) : 50;
  const L5 = layers ? (layers.L5 || 50) : 50;
  const L9 = layers ? (layers.L9 || 50) : 50;

  function modelVote(score: number, buyThr: number, sellThr: number): number {
    if(score >= buyThr) return 1;
    if(score <= sellThr) return -1;
    return 0;
  }

  const techVote = modelVote(LA, 60, 40);
  const fundVote = modelVote(LB, 62, 38);
  const behavVote = modelVote(LC, 58, 42);

  const votes = [techVote, fundVote, behavVote];
  const bullCount = votes.filter(v => v > 0).length;
  const bearCount = votes.filter(v => v < 0).length;
  const neutCount = votes.filter(v => v === 0).length;

  let wT, wF, wB;
  switch(regime){
    case "bull":        wT=0.50; wF=0.30; wB=0.20; break;
    case "bear":        wT=0.40; wF=0.35; wB=0.25; break;
    case "sideways":    wT=0.30; wF=0.45; wB=0.25; break;
    case "volatile":    wT=0.55; wF=0.25; wB=0.20; break;
    case "news-driven": wT=0.30; wF=0.30; wB=0.40; break;
    default:            wT=0.45; wF=0.30; wB=0.25;
  }

  const softT = _clamp((LA - 50) / 50, -1, 1);
  const softF = _clamp((LB - 50) / 50, -1, 1);
  const softB = _clamp((LC - 50) / 50, -1, 1);
  const softBull = +(softT * wT + softF * wF + softB * wB).toFixed(3);

  let agreementBoost = 1.0;
  if(bullCount === 3 || bearCount === 3){
    agreementBoost = 1.10;
  }
  else if(bullCount === 2 || bearCount === 2){
    agreementBoost = 1.03;
  }
  else if(neutCount >= 2){
    agreementBoost = 1.00;
  }
  else{
    agreementBoost = 0.92;
  }

  if((bullCount === 3 || bearCount === 3) && gates === 3){
    agreementBoost = Math.min(1.15, agreementBoost + 0.05);
  }

  const techConsensus = L1 > 55 && L5 > 55 && L9 > 55 ? 1
                      : L1 < 45 && L5 < 45 && L9 < 45 ? -1
                      : 0;

  const agreement = bullCount === 3 || bearCount === 3 ? "كامل"
                  : bullCount === 2 || bearCount === 2 ? "جزئي"
                  : neutCount >= 2 ? "محايد"
                  : "متعارض";

  const ensembleSig = bullCount >= 2 ? "صعودي"
                    : bearCount >= 2 ? "هبوطي"
                    : "محايد";

  return {
    bullCount,
    bearCount,
    neutCount,
    softBull,
    techConsensus,
    agreement,
    agreementBoost: +agreementBoost.toFixed(3),
    ensembleSig,
    votes: {
      tech: techVote,
      fund: fundVote,
      behav: behavVote
    }
  };
}

/* ══════════════════════════════════════════════════════════════
   🎯 Confidence Engine -- Professional Grade
══════════════════════════════════════════════════════════════ */
function calcConfidenceThreshold(score: number, layers: any, ensemble: any, conflictCount: number, gates: any, regime: any): any {
  const {L1, L4, L5, L9} = layers;

  const scoreClarity = _clamp(Math.abs(score - 50) / 50, 0, 1);

  const gateQuality = gates === 3 ? 1.00
                    : gates === 2 ? 0.75
                    : gates === 1 ? 0.45
                    : 0.20;

  const ensembleAgreement = ensemble.bullCount === 3 || ensemble.bearCount === 3 ? 1.00
                          : ensemble.bullCount === 2 || ensemble.bearCount === 2 ? 0.70
                          : ensemble.neutCount >= 2 ? 0.40
                          : 0.20;

  const coreScores = [L1, L4, L5, L9];
  const coreMean = coreScores.reduce((s, v) => s + v, 0) / 4;
  const coreStd = Math.sqrt(
    coreScores.reduce((s, v) => s + Math.pow(v - coreMean, 2), 0) / 4
  );
  const layerConsistency = _clamp(1 - coreStd / 40, 0, 1);

  const conflictPenalty = _clamp(conflictCount * 0.03, 0, 0.20);

  const rawConfidence = (
    scoreClarity     * 0.40 +
    gateQuality      * 0.30 +
    ensembleAgreement * 0.20 +
    layerConsistency * 0.10
  );

  const confidence = _clamp(
    Math.round(rawConfidence * (1 - conflictPenalty) * 100),
    0, 100
  );

  const shouldAbstain = (
    confidence < 25 &&
    gates === 0 &&
    conflictCount >= 3
  );

  const isStrong = confidence >= 70 && !shouldAbstain;
  const isNormal = confidence >= 50 && confidence < 70 && !shouldAbstain;
  const isWeak = confidence < 50 && !shouldAbstain;

  return {
    confidence,
    shouldAbstain,
    isStrong,
    isNormal,
    isWeak,
    scoreClarity: +scoreClarity.toFixed(3),
    gateQuality: +gateQuality.toFixed(3),
    ensembleAgreement: +ensembleAgreement.toFixed(3),
    layerConsistency: +layerConsistency.toFixed(3),
    conflictPenalty: +conflictPenalty.toFixed(3),
    label: confidence >= 75 ? "ثقة عالية"
         : confidence >= 60 ? "ثقة جيدة"
         : confidence >= 45 ? "ثقة معقولة"
         : confidence >= 30 ? "ثقة منخفضة"
         : "ثقة ضعيفة"
  };
}

/* ══════════════════════════════════════════════════════════════
   ⭐ Strategy Lab Winner Integration -- مزج 70/30
══════════════════════════════════════════════════════════════ */
const WINNER_STORE_KEY = 'tdw_winning_strategy';
const WINNER_BLEND_RATIO = 0.70;

function loadWinnerStrategy(): any {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(WINNER_STORE_KEY);
    if (!raw) return null;
    const winner = JSON.parse(raw);

    if (!winner || !winner.weights) return null;

    const w = winner.weights;
    if (typeof w.L1 !== 'number' || typeof w.L9 !== 'number') return null;

    return winner;
  } catch (e) {
    console.warn('[Winner] Load failed:', e);
    return null;
  }
}

function applyWinnerWeights(WC: any, winner: any): any {
  if (!winner || !winner.weights) return WC;

  const wWinner = winner.weights;
  const result: any = {};
  const keys = ['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10','L11'];

  keys.forEach(k => {
    const winnerW = typeof wWinner[k] === 'number' ? wWinner[k] : (WC[k] || 0.11);
    const originalW = WC[k] || 0.11;
    result[k] = WINNER_BLEND_RATIO * winnerW + (1 - WINNER_BLEND_RATIO) * originalW;
  });

  const total = keys.reduce((s, k) => s + result[k], 0);
  if (total > 0) {
    keys.forEach(k => {
      result[k] = +(result[k] / total).toFixed(4);
    });
  }

  (result as any).__winnerMeta = {
    applied: true,
    winnerId: winner.targetType || 'unknown',
    appliedAt: winner.appliedAt || null,
    blendRatio: WINNER_BLEND_RATIO,
  };

  return result;
}

/* ══════════════════════════════════════════════════════════════
   ③ Feedback Loop -- Adaptive Weight Calibration
══════════════════════════════════════════════════════════════ */
const FEEDBACK_STORE_KEY = 'tdw_feedback_state';

function loadFeedbackState(): any {
  try{
    if(typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FEEDBACK_STORE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    console.warn('[Feedback] Load failed:', e);
    return null;
  }
}

function saveFeedbackState(state: any): void {
  try{
    if(typeof localStorage === 'undefined') return;
    if(!state || typeof state !== 'object') return;
    localStorage.setItem(FEEDBACK_STORE_KEY, JSON.stringify(state));
  }catch(e){
    console.warn('[Feedback] Save failed:', e);
  }
}

function getAdaptiveWeightAdjustment(sym: string, currentRegime?: string): any {
  const state = loadFeedbackState();
  if (!state || !state[sym]) return null;
  const perf = state[sym];

  if (!perf.version) return null;

  const totalEver = perf.longTerm?.totalEver || 0;
  if (totalEver < 5) return null;

  const shortAcc = perf.shortTerm?.weightedAccuracy || 0.5;
  const longAcc = totalEver > 0 ? perf.longTerm.correctEver / totalEver : 0.5;

  const liveCtx = perf.context?.live || { total: 0, correct: 0 };
  const liveAcc = liveCtx.total >= 3 ? liveCtx.correct / liveCtx.total : longAcc;

  let regimeAcc = longAcc;
  let regimeBoost = 1.0;
  if(currentRegime){
    const regimeKey = (currentRegime === 'bear' || currentRegime === 'volatile') ? 'bear' : 'bull';
    const regimeCtx = perf.context?.[regimeKey] || { total: 0, correct: 0 };

    if(regimeCtx.total >= 5){
      regimeAcc = regimeCtx.correct / regimeCtx.total;
      if(regimeAcc >= 0.65) regimeBoost = 1.20;
      else if(regimeAcc >= 0.55) regimeBoost = 1.10;
      else if(regimeAcc < 0.40) regimeBoost = 0.70;
      else if(regimeAcc < 0.50) regimeBoost = 0.85;
    }
  }

  const composite = shortAcc * 0.40 + longAcc * 0.20 + liveAcc * 0.20 + regimeAcc * 0.20;

  const regimeShift = shortAcc < longAcc - 0.15;
  const improving = shortAcc > longAcc + 0.10;

  const adj: any = {};

  Object.keys(perf.layers || {}).forEach(k => {
    const lp = perf.layers[k];
    if (!lp || lp.total < 3) return;

    const layerHistAcc = lp.correct / lp.total;
    const recentLayer = lp.recent || [];
    let recentLayerAcc = layerHistAcc;

    if (recentLayer.length >= 3) {
      let rCorrect = 0, rTotal = 0;
      recentLayer.forEach((r: any) => {
        if (r.correct) rCorrect += r.weight;
        rTotal += r.weight;
      });
      recentLayerAcc = rTotal > 0 ? rCorrect / rTotal : layerHistAcc;
    }

    const layerAcc = recentLayerAcc * 0.60 + layerHistAcc * 0.40;

    let baseAdj = 0;

    if (layerAcc >= 0.75) {
      baseAdj = +0.025;
    } else if (layerAcc >= 0.65) {
      baseAdj = +0.015;
    } else if (layerAcc >= 0.55) {
      baseAdj = +0.008;
    } else if (layerAcc < 0.35) {
      baseAdj = -0.030;
    } else if (layerAcc < 0.45) {
      baseAdj = -0.020;
    }

    if (regimeShift) {
      baseAdj *= 0.6;
    } else if (improving) {
      baseAdj *= 1.2;
    }

    if (lp.total < 10) baseAdj *= 0.5;
    else if (lp.total < 20) baseAdj *= 0.8;

    baseAdj *= regimeBoost;

    if (Math.abs(baseAdj) > 0.001) {
      adj[k] = +baseAdj.toFixed(4);
    }
  });

  if (Object.keys(adj).length > 0) {
    (adj as any).__meta = {
      composite: +composite.toFixed(3),
      shortAcc: +shortAcc.toFixed(3),
      longAcc: +longAcc.toFixed(3),
      liveAcc: +liveAcc.toFixed(3),
      regimeAcc: +regimeAcc.toFixed(3),
      regimeBoost: +regimeBoost.toFixed(3),
      currentRegime: currentRegime || 'unknown',
      regimeShift,
      improving,
      sampleSize: Math.round(totalEver),
    };
  }

  return Object.keys(adj).filter(k => k !== '__meta').length > 0 ? adj : null;
}

function recordFeedback(sym: string, signal: any, layers: any, actualOutcome: any, context?: any): any {
  const state = loadFeedbackState() || {};
  const now = Date.now();

  if (state[sym] && !state[sym].version) {
    const old = state[sym];
    state[sym] = {
      version: 2,
      longTerm: {
        totalEver: old.total || 0,
        correctEver: old.correct || 0,
      },
      shortTerm: {
        recent: [] as any[],
        weightedAccuracy: old.total > 0 ? old.correct / old.total : 0.5,
      },
      context: {
        backtest: { total: old.total || 0, correct: old.correct || 0 },
        live:     { total: 0, correct: 0 },
        bull:     { total: 0, correct: 0 },
        bear:     { total: 0, correct: 0 },
      },
      layers: old.layers || {},
      meta: {
        lastUpdate: now,
        firstUpdate: now,
      }
    };
  }

  if (!state[sym]) {
    state[sym] = {
      version: 2,
      longTerm: { totalEver: 0, correctEver: 0 },
      shortTerm: { recent: [], weightedAccuracy: 0.5 },
      context: {
        backtest: { total: 0, correct: 0 },
        live:     { total: 0, correct: 0 },
        bull:     { total: 0, correct: 0 },
        bear:     { total: 0, correct: 0 },
      },
      layers: {},
      meta: { lastUpdate: now, firstUpdate: now }
    };
  }

  const perf = state[sym];
  const weight = Math.abs(actualOutcome);
  const isCorrect = actualOutcome > 0;

  perf.longTerm.totalEver += weight;
  if (isCorrect) perf.longTerm.correctEver += weight;

  perf.shortTerm.recent.push({
    timestamp: now,
    outcome: actualOutcome,
    signal,
    weight,
  });
  if (perf.shortTerm.recent.length > 30) {
    perf.shortTerm.recent.shift();
  }

  const decay = 0.92;
  let weightedSum = 0;
  let totalWeight = 0;
  perf.shortTerm.recent.forEach((trade: any, i: number, arr: any[]) => {
    const age = arr.length - 1 - i;
    const w = Math.pow(decay, age) * trade.weight;
    if (trade.outcome > 0) weightedSum += w;
    totalWeight += w;
  });
  perf.shortTerm.weightedAccuracy = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  const ctxType = context?.type === 'live' ? 'live' : 'backtest';
  perf.context[ctxType].total += weight;
  if (isCorrect) perf.context[ctxType].correct += weight;

  const marketRegime = context?.regime === 'bear' ? 'bear' : 'bull';
  perf.context[marketRegime].total += weight;
  if (isCorrect) perf.context[marketRegime].correct += weight;

  const lnames = ['L1','L2','L3','L4','L5','L6','L7','L8','L9','L10','L11'];
  lnames.forEach(k => {
    if (layers[k] === undefined) return;
    if (!perf.layers[k]) perf.layers[k] = { total: 0, correct: 0, recent: [] as any[] };

    perf.layers[k].total += weight;

    const layerDir = layers[k] > 55 ? 1 : layers[k] < 45 ? -1 : 0;
    const signalDir = signal === 'شراء قوي' || signal === 'مراقبة' ? 1
                    : signal === 'تخفيف' ? -1 : 0;

    const layerCorrect = (layerDir !== 0 && layerDir === signalDir && isCorrect) ||
                         (layerDir !== 0 && layerDir !== signalDir && !isCorrect);
    if (layerCorrect) perf.layers[k].correct += weight;

    perf.layers[k].recent.push({ correct: layerCorrect, weight });
    if (perf.layers[k].recent.length > 20) perf.layers[k].recent.shift();
  });

  perf.meta.lastUpdate = now;

  saveFeedbackState(state);
}

/* ══ applyFeedbackToWeights: تطبيق الضبط التكيّفي مع ABM ══ */
function applyFeedbackToWeights(WC: any, sym: string, currentRegime?: string): any {
  const winner = loadWinnerStrategy();
  if (winner) {
    WC = applyWinnerWeights(WC, winner);
  }

  const adj = getAdaptiveWeightAdjustment(sym, currentRegime);

  if (!adj) return WC;

  const result = { ...WC };
  // ✨ نستثني حقول الميتا -- كانت تدخل التطبيع وتنتج NaN
  const keys = Object.keys(result).filter(k => k.indexOf('__') !== 0);

  let totalAdjustment = 0;
  keys.forEach(k => {
    if (adj[k] && typeof adj[k] === 'number' && typeof result[k] === 'number') {
      result[k] = Math.max(0.005, result[k] + adj[k]);
      totalAdjustment += Math.abs(adj[k]);
    }
  });

  if (totalAdjustment < 0.005) return WC;

  const total = keys.reduce((s, k) => s + result[k], 0);
  if (total > 0) {
    keys.forEach(k => {
      result[k] = +(result[k] / total).toFixed(4);
    });
  }

  if (adj.__meta) {
    (result as any).__meta = adj.__meta;
  }

  return result;
}

export {
  ensembleVote,
  calcConfidenceThreshold,
  loadWinnerStrategy,
  applyWinnerWeights,
  loadFeedbackState,
  saveFeedbackState,
  getAdaptiveWeightAdjustment,
  recordFeedback,
  applyFeedbackToWeights,
};
