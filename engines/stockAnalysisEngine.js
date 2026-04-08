/**
 * STOCK ANALYSIS ENGINE
 *
 * Fundamental + technical combined scoring.
 * Extracted from TadawulPlus_v5_engine3_final.jsx
 *
 * Includes: DCF, Factor Model, Earnings Quality, Macro analysis
 * Pure functions — no React, no UI.
 */

import { calcRSI, calcATR, calcVWAP, calcCMF } from './technicalEngine';

// ── Macro context (seed data — replace with API)
const MACRO = {
  oilPrice:   82.4,
  oilTarget:  75.0,
  fedRate:    5.25,
  saudiRate:  6.0,
  usdSar:     3.75,
  tasiYTD:    8.4,
};

/**
 * DCF Valuation
 * @param {Stock} stk
 * @returns {{ intrinsicValue, upside, margin, rating, label }}
 */
export function calcDCF(stk) {
  if (!stk.eps || !stk.roe) {
    return { intrinsicValue: null, upside: null, margin: null, rating: 'غير متاح', label: 'بيانات غير كافية' };
  }

  // Growth confidence discount: high growth (>15%) is discounted by market
  // A 23% grower rarely sustains that. Effective g1 capped at 15% with discount above.
  const rawGrw  = (stk.epsGrw ?? 5) / 100;
  const g1      = rawGrw > 0.15
    ? 0.15  // cap: beyond 15%, sustainability is uncertain
    : Math.min(rawGrw, 0.25);
  const g2      = Math.min(g1 * 0.5, 0.06);   // stage 2: half of g1, max 6%
  const gTerm   = 0.03;                         // terminal growth (Saudi GDP long-term)

  // ── WACC by sector (Saudi market calibrated)
  // Banks: higher regulatory capital cost
  // Energy/Defensive: lower beta → lower WACC
  // High-debt sectors: premium for financial risk
  const waccBySector = {
    banks:        0.12,  // regulatory + capital requirements
    energy:       0.09,  // low beta, stable cash flows (Aramco ~8.5%)
    petro:        0.11,  // cyclical, commodity exposure
    telecom:      0.10,  // stable but capex-heavy
    food:         0.09,  // defensive, low beta
    mining:       0.12,  // commodity + operational risk
    realestate:   0.11,  // leverage-heavy sector
    insurance:    0.11,
    construction: 0.12,
    industrial:   0.11,
  };
  const wacc = waccBySector[stk.sectorId] ?? 0.10;

  // If FCF is negative, use EPS*0.6 as fallback
  const rawFCF  = (stk.freeCashFlow !== null && stk.freeCashFlow > 0)
    ? stk.freeCashFlow
    : (stk.eps ?? 0) * 0.6;
  // FCF yield cap: max 12% of price — prevents DCF explosion for high-FCF stocks
  // If a stock yields >12% FCF, something is unusual (data error or temporary spike)
  const maxFCF  = stk.p * 0.12;
  const baseFCF = Math.min(rawFCF, maxFCF);
  let fcf = baseFCF;
  let pv  = 0;

  // Stage 1: 5 years
  for (let t = 1; t <= 5; t++) {
    fcf *= (1 + g1);
    pv  += fcf / Math.pow(1 + wacc, t);
  }
  // Stage 2: years 6-10
  for (let t = 6; t <= 10; t++) {
    fcf *= (1 + g2);
    pv  += fcf / Math.pow(1 + wacc, t);
  }
  // Terminal value
  const tv  = fcf * (1 + gTerm) / (wacc - gTerm);
  pv       += tv / Math.pow(1 + wacc, 10);

  const intrinsicValue = +pv.toFixed(2);
  const upside         = stk.p > 0 ? +((intrinsicValue - stk.p) / stk.p * 100).toFixed(1) : 0;
  const margin         = upside;

  // Confidence range: DCF is sensitive to assumptions — show ±20% WACC sensitivity
  const pvBull = intrinsicValue * 1.20;  // optimistic (WACC -1%)
  const pvBear = intrinsicValue * 0.80;  // pessimistic (WACC +1%)

  const rating = upside > 30  ? 'شراء قوي'
               : upside > 10  ? 'شراء'
               : upside > -10 ? 'محايد'
               : upside > -30 ? 'بيع'
               : 'بيع قوي';

  return {
    intrinsicValue, upside, margin, rating,
    bullCase:  +pvBull.toFixed(2),
    bearCase:  +pvBear.toFixed(2),
    wacc:      wacc,
    g1Used:    +(g1 * 100).toFixed(1),
    label:     `${rating} (${upside > 0 ? '+' : ''}${upside}%)`,
  };
}

/**
 * Factor Model (Quality + Value + Momentum + Growth)
 * @param {Stock} stk
 * @param {OHLCBar[]} bars
 * @returns {{ quality, value, momentum, growth, composite, label }}
 */
export function calcFactorModel(stk, bars) {
  // Quality factor — four sub-dimensions
  // 1. Profitability (ROE): primary quality signal (0-45 pts)
  const roePts = Math.min(45, Math.round((stk.roe ?? 0) * 1.5));
  // 2. Margin proxy: use net_margin if available, else EPS/P as proxy (0-20 pts)
  const earningsYield = stk.eps && stk.p > 0 ? (stk.eps / stk.p) * 100 : 0;
  const marginProxy   = stk.net_margin ?? earningsYield;
  const marginPts     = Math.min(20, Math.round(marginProxy * 0.8));
  // 3. Balance sheet strength — inverse of debt ratio (0-20 pts)
  const debtPenalty = Math.max(0, 1 - Math.min(stk.debt ?? 0.5, 2.0));
  const debtPts     = Math.round(debtPenalty * 20);
  // 4. FCF quality — positive FCF is a sign of earnings quality (0-15 pts)
  const fcfPts = stk.freeCashFlow
    ? stk.freeCashFlow > 0
      ? Math.min(15, Math.round(stk.freeCashFlow / (stk.eps || 1) * 10))
      : 0
    : 5; // unknown → neutral

  const quality = Math.min(100, roePts + marginPts + debtPts + fcfPts);

  // Value factor — sector-aware scoring
  // P/E: scored relative to sector norms (banks ~10x, growth ~30x)
  const sectorPENorm = {
    banks: 12, energy: 16, petro: 20, telecom: 14,
    food: 22, mining: 18, realestate: 14, insurance: 12,
  }[stk.sectorId] ?? 18;
  const peScore = stk.pe
    ? Math.max(0, Math.min(100, Math.round(100 - (stk.pe / sectorPENorm - 1) * 50)))
    : 50;

  // P/B: scored relative to sector norms (banks ~1.5x, tech ~4x)
  const sectorPBNorm = {
    banks: 1.8, energy: 4.0, petro: 1.5, telecom: 2.5,
    food: 3.5, mining: 2.0, realestate: 1.2, insurance: 2.0,
  }[stk.sectorId] ?? 2.5;
  const pbScore = stk.pb
    ? Math.max(0, Math.min(100, Math.round(100 - (stk.pb / sectorPBNorm - 1) * 40)))
    : 50;

  const divBonus = (stk.divY ?? 0) * 4;
  const value   = Math.min(100, Math.round((peScore * 0.55 + pbScore * 0.30) + divBonus));

  // Momentum factor (from bars)
  let momentum = 50;
  if (bars && bars.length >= 20) {
    const rsi = calcRSI(bars, 14);
    const ret20 = bars.length >= 20 ? (bars[bars.length-1].c - bars[bars.length-20].c) / bars[bars.length-20].c * 100 : 0;
    momentum = Math.min(100, Math.round(50 + ret20 * 2 + (rsi - 50) * 0.5));
  }

  // Growth factor
  const growth = Math.min(100, Math.round(
    (stk.epsGrw ?? 0) * 2 +
    (stk.revGrw ?? 0) * 1.5 +
    ((stk.freeCashFlow ?? 0) > 0 ? 15 : 0)  // parentheses required: negative FCF must not get bonus
  ));

  const composite = Math.round((quality * 0.30 + value * 0.25 + momentum * 0.25 + growth * 0.20));

  return {
    quality, value, momentum, growth, composite,
    label: composite >= 75 ? 'ممتاز' : composite >= 60 ? 'جيد' : composite >= 45 ? 'متوسط' : 'ضعيف',
  };
}

/**
 * Earnings Quality Assessment
 * @param {Stock} stk
 * @returns {{ score, accrualRatio, consistency, label }}
 */
export function calcEarningsQuality(stk) {
  if (!stk.eps_q1 && !stk.eps_q2) {
    return { score: 50, accrualRatio: null, consistency: null, label: 'بيانات محدودة' };
  }

  const quarters = [stk.eps_q1, stk.eps_q2, stk.eps_q3, stk.eps_q4].filter(Boolean);

  // Consistency: standard deviation of quarterly EPS
  const avg = quarters.reduce((s, v) => s + v, 0) / quarters.length;
  const std = Math.sqrt(quarters.reduce((s, v) => s + (v - avg) ** 2, 0) / quarters.length);
  const cv  = avg > 0 ? std / avg : 1;  // coefficient of variation

  // FCF vs earnings alignment
  const fcfAlignment = stk.freeCashFlow && stk.eps
    ? stk.freeCashFlow / stk.eps
    : 1;

  const consistency = Math.max(0, Math.round(100 - cv * 100));
  // FCF alignment score: FCF/EPS ratio (1.0 = perfect alignment, >1 = even better)
  const fcfScore = Math.min(30, Math.round(Math.max(0, Math.min(fcfAlignment, 2)) * 15));
  // ROE contribution: capped to avoid dominating score
  const roeContrib = Math.min(20, Math.round((stk.roe ?? 0) * 0.5));
  const score = Math.min(100, Math.round(consistency * 0.55 + fcfScore + roeContrib));

  return {
    score,
    accrualRatio: +(1 - fcfAlignment).toFixed(2),
    consistency,
    label: score >= 75 ? 'أرباح عالية الجودة' : score >= 50 ? 'أرباح متوسطة' : 'أرباح ضعيفة',
  };
}

/**
 * Macro context impact on stock
 * @param {Stock} stk
 * @returns {{ oilImpact, rateImpact, tasiCorr, overallImpact, label }}
 */
export function calcMacroImpact(stk) {
  const oilDev    = (MACRO.oilPrice - MACRO.oilTarget) / MACRO.oilTarget;
  const oilImpact = (stk.oilCorr ?? 0) * oilDev * 100;

  // Rate sensitivity by sector (Saudi market calibrated)
  // Banks benefit from higher rates (wider NIM)
  // Real estate, construction, high-debt companies hurt
  // Insurance benefits (investment income)
  const rateSensMap = {
    banks:        +0.30,   // NIM expansion
    insurance:    +0.15,   // investment income improves
    energy:        0.00,   // oil-price driven, rate-insensitive
    telecom:      -0.10,   // capex-financed, modest sensitivity
    petro:        -0.10,   // debt-financed projects
    food:         -0.05,   // defensive, minimal sensitivity
    mining:       -0.10,   // capex funding
    realestate:   -0.40,   // highly leveraged, rate-sensitive
    construction: -0.25,   // project financing
    industrial:   -0.15,
  };
  const rateSens = rateSensMap[stk.sectorId]
    ?? (stk.debt > 0.5 ? -0.20 : 0.00);
  const rateImpact = rateSens * (MACRO.saudiRate - 4) * 10;

  const overallImpact = +(oilImpact + rateImpact).toFixed(1);

  return {
    oilImpact:    +oilImpact.toFixed(1),
    rateImpact:   +rateImpact.toFixed(1),
    oilPrice:     MACRO.oilPrice,
    overallImpact,
    label: overallImpact > 5  ? 'بيئة ماكرو إيجابية'
         : overallImpact > -5 ? 'بيئة ماكرو محايدة'
         : 'بيئة ماكرو سلبية',
  };
}

/**
 * Comprehensive stock score (0-100)
 * Combines: radar + fundamentals + macro
 */
export function calcComprehensiveScore(stk, bars) {
  const dcf     = calcDCF(stk);
  const factor  = calcFactorModel(stk, bars);
  const earnings= calcEarningsQuality(stk);
  const macro   = calcMacroImpact(stk);

  const fundamentalScore = Math.round(
    (factor.composite * 0.5) +
    (earnings.score   * 0.3) +
    (dcf.upside !== null ? Math.min(30, Math.max(0, dcf.upside / 2)) : 15)
  );

  const macroAdj = macro.overallImpact * 0.3;

  return {
    fundamental: fundamentalScore,
    macro: macro.overallImpact,
    dcf,
    factor,
    earnings,
    macroContext: macro,
    total: Math.min(100, Math.max(0, Math.round(fundamentalScore + macroAdj))),
  };
}
