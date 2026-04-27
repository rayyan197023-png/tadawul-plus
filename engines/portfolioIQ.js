'use client';

/**
 * ═══════════════════════════════════════════════════════════════════
 *                        PORTFOLIO IQ™ ENGINE
 * ═══════════════════════════════════════════════════════════════════
 *
 * Smart Recommendations Engine
 * Bloomberg + Bridgewater + Renaissance Level
 *
 * Built on 7 academic foundations:
 * 1. Modern Portfolio Theory (Markowitz 1952 - Nobel Prize)
 * 2. Capital Asset Pricing Model (Sharpe 1964 - Nobel Prize)
 * 3. Behavioral Finance (Kahneman 2002 - Nobel Prize)
 * 4. Risk Parity Framework (Ray Dalio - Bridgewater)
 * 5. Three-Factor Model (Fama-French 1993)
 * 6. Black-Litterman Model (Goldman Sachs 1990)
 * 7. Kelly Criterion (Shannon - Information Theory)
 *
 * Original Innovations (Tadawul+ Exclusive):
 * - PsyRisk Score™     : Behavioral risk quantification
 * - Portfolio DNA™     : Style classification system
 * - Crystal Ball™      : Monte Carlo predictions
 * - Smart Stop-Loss™   : Dynamic risk management
 * - Recovery Path™     : Drawdown recovery optimization
 *
 * @author Tadawul+
 * @version 1.0.0
 * @license Proprietary
 */

import {
  mean,
  std,
  variance,
  simpleReturns,
  correlation,
  beta,
  percentile,
  sanitize,
} from '../utils/portfolioMath';

import { analyzePortfolio } from './portfolioEngine';

/* ═══════════════════════════════════════════════════════════
   ⚙️ CONSTANTS - معايير عالمية
═══════════════════════════════════════════════════════════ */

/**
 * Risk-Free Rate (Saudi SAIBOR)
 * Source: Saudi Central Bank (SAMA)
 */
const RISK_FREE_RATE = 0.06;

/**
 * TASI Average Annual Return (10-year)
 * Source: Saudi Exchange historical data
 */
const TASI_AVG_RETURN = 0.085;

/**
 * Trading Days per Year
 */
const TRADING_DAYS = 252;

/**
 * Recommendation Priority Levels
 */
const PRIORITY = {
  CRITICAL: 'critical',  // Action needed immediately
  HIGH: 'high',          // Action this week
  MEDIUM: 'medium',      // Action this month
  LOW: 'low',            // Nice to have
};

/**
 * Recommendation Categories
 */
const CATEGORY = {
  REDUCE_CONCENTRATION: 'reduce_concentration',
  ADD_DIVERSIFICATION: 'add_diversification',
  REDUCE_CORRELATION: 'reduce_correlation',
  RISK_MANAGEMENT: 'risk_management',
  REBALANCE: 'rebalance',
  TAX_OPTIMIZATION: 'tax_optimization',
  BEHAVIORAL: 'behavioral',
  OPPORTUNITY: 'opportunity',
};

/**
 * Portfolio Health Grades (S&P-style)
 */
const HEALTH_GRADES = {
  90: { grade: 'AAA', label: 'استثنائي', color: '#1ee68a' },
  85: { grade: 'AA',  label: 'ممتاز',    color: '#22d3ee' },
  80: { grade: 'A',   label: 'جيد جداً',  color: '#22d3ee' },
  75: { grade: 'BBB', label: 'جيد',       color: '#fbbf24' },
  70: { grade: 'BB',  label: 'مقبول',     color: '#fbbf24' },
  60: { grade: 'B',   label: 'متوسط',     color: '#f59e0b' },
  50: { grade: 'CCC', label: 'ضعيف',      color: '#ff5f6a' },
  0:  { grade: 'D',   label: 'حرج',       color: '#dc2626' },
};

/* ═══════════════════════════════════════════════════════════
   🎯 MAIN FUNCTION - الدالة الرئيسية
═══════════════════════════════════════════════════════════ */

/**
 * Comprehensive Portfolio IQ Analysis
 *
 * @param {Array} positions - Portfolio positions [{sym, qty, avgCost, value, bars, sector}]
 * @param {Array} tasiBars - TASI historical data
 * @param {Object} options - {userProfile, riskTolerance, investmentHorizon}
 * @returns {Object} Complete intelligent analysis
 */
export function analyzePortfolioIQ(positions, tasiBars, options = {}) {
  if (!positions || positions.length === 0) {
    return emptyAnalysis();
  }

  // Get base analysis from portfolioEngine
  const baseAnalysis = analyzePortfolio(positions, tasiBars);

  // Run 8 intelligence layers
  const diagnostic = runDiagnosticLayer(positions, baseAnalysis);
  const risk = runRiskLayer(positions, baseAnalysis);
  const behavioral = runBehavioralLayer(positions, baseAnalysis, options);
  const factor = runFactorLayer(positions, baseAnalysis);
  const macro = runMacroLayer(positions, baseAnalysis);
  const sector = runSectorLayer(positions, baseAnalysis);
  const stock = runStockLayer(positions, baseAnalysis);
  const action = runActionLayer(positions, baseAnalysis, {
    diagnostic, risk, behavioral, factor, macro, sector, stock,
  });

  // Calculate Portfolio IQ Score (0-100)
  const iqScore = calculateIQScore({
    diagnostic, risk, behavioral, factor, sector,
  });

  // Health grade
  const health = getHealthGrade(iqScore);

  // Generate prioritized recommendations
  const recommendations = generateRecommendations({
    positions, baseAnalysis,
    diagnostic, risk, behavioral, factor, macro, sector, stock,
  });

  // Innovations
  const psyRisk = calculatePsyRiskScore(positions, baseAnalysis, options);
  const dna = analyzePortfolioDNA(positions, baseAnalysis);
  const crystalBall = runCrystalBall(positions, baseAnalysis);
  const smartStops = calculateSmartStops(positions);
  const recoveryPath = generateRecoveryPath(positions, baseAnalysis);

  return {
    // Overall Score
    iqScore: iqScore,
    grade: health.grade,
    gradeLabel: health.label,
    gradeColor: health.color,

    // 8 Layers
    layers: {
      diagnostic,
      risk,
      behavioral,
      factor,
      macro,
      sector,
      stock,
      action,
    },

    // Innovations
    psyRisk,
    dna,
    crystalBall,
    smartStops,
    recoveryPath,

    // Recommendations
    recommendations,

    // Summary for quick view
    summary: generateSmartSummary({
      iqScore, health, baseAnalysis, recommendations,
    }),

    // Metadata
    timestamp: Date.now(),
    version: '1.0.0',
    enginesUsed: 8,
  };
}

/* ═══════════════════════════════════════════════════════════
   📊 LAYER 1 - DIAGNOSTIC (تشخيص)
═══════════════════════════════════════════════════════════ */

/**
 * Diagnostic Layer - Comprehensive portfolio diagnosis
 * Identifies structural issues and characteristics
 */
function runDiagnosticLayer(positions, base) {
  const issues = [];
  const strengths = [];

  // Check 1: Concentration
  if (base.diversification && base.diversification.hhi > 4000) {
    issues.push({
      type: 'high_concentration',
      severity: 'critical',
      metric: base.diversification.hhi,
      message: 'تركيز مفرط - HHI = ' + base.diversification.hhi,
    });
  } else if (base.diversification && base.diversification.hhi < 2000) {
    strengths.push({
      type: 'good_diversification',
      message: 'تنويع ممتاز - HHI = ' + base.diversification.hhi,
    });
  }

  // Check 2: Correlation
  if (base.diversification && base.diversification.avgCorrelation > 0.7) {
    issues.push({
      type: 'high_correlation',
      severity: 'high',
      metric: base.diversification.avgCorrelation,
      message: 'الأسهم تتحرك معاً - متوسط الارتباط ' + 
        (base.diversification.avgCorrelation * 100).toFixed(0) + '%',
    });
  }

  // Check 3: Risk-Adjusted Returns
  if (base.performance && base.performance.sharpe < 0.5) {
    issues.push({
      type: 'poor_risk_adjusted_returns',
      severity: 'high',
      metric: base.performance.sharpe,
      message: 'العائد لا يبرر المخاطرة - Sharpe = ' + 
        base.performance.sharpe.toFixed(2),
    });
  } else if (base.performance && base.performance.sharpe > 1.5) {
    strengths.push({
      type: 'excellent_risk_adjusted',
      message: 'عائد ممتاز للمخاطرة - Sharpe = ' + 
        base.performance.sharpe.toFixed(2),
    });
  }

  // Check 4: Drawdown
  if (base.risk && Math.abs(base.risk.maxDrawdown) > 0.25) {
    issues.push({
      type: 'severe_drawdown',
      severity: 'critical',
      metric: base.risk.maxDrawdown,
      message: 'تراجع حاد - MaxDD = ' + 
        (base.risk.maxDrawdown * 100).toFixed(1) + '%',
    });
  }

  // Check 5: Beta
  if (base.performance && base.performance.beta > 1.3) {
    issues.push({
      type: 'high_beta',
      severity: 'medium',
      metric: base.performance.beta,
      message: 'حساسية عالية للسوق - Beta = ' + 
        base.performance.beta.toFixed(2),
    });
  }

  // Check 6: Stock Count
  if (positions.length < 5) {
    issues.push({
      type: 'too_few_stocks',
      severity: 'high',
      metric: positions.length,
      message: 'عدد الأسهم قليل (' + positions.length + ') - تحتاج 8-15 سهم',
    });
  } else if (positions.length > 25) {
    issues.push({
      type: 'over_diversified',
      severity: 'low',
      metric: positions.length,
      message: 'تنويع زائد (' + positions.length + ') - يصعب المتابعة',
    });
  }

  return {
    issuesCount: issues.length,
    strengthsCount: strengths.length,
    issues: issues.sort((a, b) => severityScore(b.severity) - severityScore(a.severity)),
    strengths: strengths,
    healthScore: calculateDiagnosticScore(issues, strengths),
  };
}

/* ═══════════════════════════════════════════════════════════
   ⚠️ LAYER 2 - RISK (المخاطر)
═══════════════════════════════════════════════════════════ */

/**
 * Risk Layer - Multi-dimensional risk analysis
 */
function runRiskLayer(positions, base) {
  if (!base.risk) {
    return { score: 0, dimensions: {}, warnings: [] };
  }

  const dimensions = {
    // Market risk (Beta-based)
    marketRisk: scoreMarketRisk(base.performance ? base.performance.beta : 1),
    
    // Volatility risk
    volatilityRisk: scoreVolatilityRisk(base.performance ? base.performance.volatility : 0.2),
    
    // Drawdown risk
    drawdownRisk: scoreDrawdownRisk(base.risk.maxDrawdown),
    
    // Tail risk (VaR/CVaR)
    tailRisk: scoreTailRisk(base.risk.cvar95Daily),
    
    // Concentration risk
    concentrationRisk: scoreConcentrationRisk(
      base.diversification ? base.diversification.hhi : 0
    ),
    
    // Correlation risk
    correlationRisk: scoreCorrelationRisk(
      base.diversification ? base.diversification.avgCorrelation : 0
    ),
  };

  // Overall risk score (weighted average)
  const overallScore = (
    dimensions.marketRisk * 0.20 +
    dimensions.volatilityRisk * 0.20 +
    dimensions.drawdownRisk * 0.20 +
    dimensions.tailRisk * 0.15 +
    dimensions.concentrationRisk * 0.15 +
    dimensions.correlationRisk * 0.10
  );

  // Risk warnings
  const warnings = [];
  Object.keys(dimensions).forEach(key => {
    if (dimensions[key] < 40) {
      warnings.push({
        dimension: key,
        score: dimensions[key],
        severity: dimensions[key] < 25 ? 'critical' : 'high',
      });
    }
  });

  return {
    score: Math.round(overallScore),
    dimensions: dimensions,
    warnings: warnings,
    riskLevel: classifyRiskLevel(overallScore),
  };
}

/* ═══════════════════════════════════════════════════════════
   🧠 LAYER 3 - BEHAVIORAL (السلوك النفسي)
═══════════════════════════════════════════════════════════ */

/**
 * Behavioral Layer - Detect biases and risks
 * Based on Kahneman-Tversky Prospect Theory
 */
function runBehavioralLayer(positions, base, options) {
  const biases = [];

  // 1. Recency Bias (recent buys at peak)
  // Check if recent purchases are at high RSI
  positions.forEach(p => {
    if (p.rsi && p.rsi > 70 && p.bars && p.bars.length > 0) {
      const lastPrice = p.bars[p.bars.length - 1].c;
      if (p.avgCost && lastPrice > p.avgCost * 1.1) {
        biases.push({
          type: 'recency_bias',
          stock: p.sym,
          severity: 'medium',
          message: 'اشتريت ' + p.sym + ' عند ذروة الزخم (RSI ' + p.rsi.toFixed(0) + ')',
        });
      }
    }
  });

  // 2. Loss Aversion (holding losers too long)
  positions.forEach(p => {
    if (p.avgCost && p.value && p.qty) {
      const currentPrice = p.value / p.qty;
      const lossPercent = ((currentPrice - p.avgCost) / p.avgCost) * 100;
      if (lossPercent < -15) {
        biases.push({
          type: 'loss_aversion',
          stock: p.sym,
          severity: 'high',
          message: p.sym + ' خاسر ' + lossPercent.toFixed(1) + '% - فكّر في القرار',
        });
      }
    }
  });

  // 3. Overconfidence (concentration in single stock)
  if (base.diversification && base.diversification.largestPosition > 30) {
    biases.push({
      type: 'overconfidence',
      severity: 'high',
      message: 'مركز كبير ' + base.diversification.largestPosition.toFixed(1) + 
        '% في سهم واحد - علامة ثقة مفرطة',
    });
  }

  // 4. Home Bias (over-concentration in one sector)
  const sectorWeights = calculateSectorWeights(positions);
  Object.keys(sectorWeights).forEach(sector => {
    if (sectorWeights[sector] > 0.5) {
      biases.push({
        type: 'home_bias',
        sector: sector,
        severity: 'high',
        message: 'تركيز ' + (sectorWeights[sector] * 100).toFixed(0) + 
          '% في قطاع ' + sector,
      });
    }
  });

  return {
    biasCount: biases.length,
    biases: biases,
    behavioralScore: 100 - (biases.length * 15),
    riskFlags: biases.filter(b => b.severity === 'high' || b.severity === 'critical'),
  };
}
/* ═══════════════════════════════════════════════════════════
   🎯 LAYER 4 - FACTOR (العوامل)
   Based on Fama-French Three-Factor Model (1993)
═══════════════════════════════════════════════════════════ */

/**
 * Factor Layer - Decompose portfolio into style factors
 * 
 * Factors analyzed:
 * - Size: Large-cap vs Small-cap
 * - Value: Value vs Growth
 * - Momentum: High momentum vs Low
 * - Quality: High ROE vs Low
 * - Volatility: High vol vs Low vol
 */
function runFactorLayer(positions, base) {
  const factors = {
    size: { score: 0, classification: 'mixed' },
    value: { score: 0, classification: 'mixed' },
    momentum: { score: 0, classification: 'mixed' },
    quality: { score: 0, classification: 'mixed' },
    volatility: { score: 0, classification: 'mixed' },
  };

  // Size Factor (using market cap or value)
  let totalValue = 0;
  let largeCapValue = 0;
  
  positions.forEach(p => {
    totalValue += p.value || 0;
    const mktCap = (p.stk && p.stk.mktCap) || p.value || 0;
    if (mktCap > 50000000000) { // 50B+ = Large cap
      largeCapValue += p.value || 0;
    }
  });
  
  const largeCapPct = totalValue > 0 ? largeCapValue / totalValue : 0;
  factors.size.score = Math.round(largeCapPct * 100);
  factors.size.classification = 
    largeCapPct > 0.7 ? 'large_cap_tilted' :
    largeCapPct > 0.4 ? 'mixed' :
    'small_cap_tilted';

  // Momentum Factor (using RSI)
  let highMomentumValue = 0;
  let validMomentum = 0;
  
  positions.forEach(p => {
    if (p.rsi !== undefined && p.rsi !== null) {
      validMomentum += p.value || 0;
      if (p.rsi > 60) {
        highMomentumValue += p.value || 0;
      }
    }
  });
  
  const momentumPct = validMomentum > 0 ? highMomentumValue / validMomentum : 0.5;
  factors.momentum.score = Math.round(momentumPct * 100);
  factors.momentum.classification = 
    momentumPct > 0.6 ? 'high_momentum' :
    momentumPct < 0.4 ? 'low_momentum' :
    'mixed';

  // Volatility Factor
  if (base.performance && base.performance.volatility) {
    const vol = base.performance.volatility;
    factors.volatility.score = Math.round((1 - Math.min(vol / 0.5, 1)) * 100);
    factors.volatility.classification = 
      vol < 0.15 ? 'low_volatility' :
      vol < 0.25 ? 'moderate_volatility' :
      'high_volatility';
  }

  // Quality Factor (placeholder - would need fundamentals)
  factors.quality.score = 60; // Default
  factors.quality.classification = 'unknown';

  // Value Factor (placeholder)
  factors.value.score = 50;
  factors.value.classification = 'mixed';

  // Style classification
  const style = classifyPortfolioStyle(factors);

  return {
    factors: factors,
    style: style,
    styleLabel: getStyleLabel(style),
  };
}

/* ═══════════════════════════════════════════════════════════
   🌍 LAYER 5 - MACRO (الاقتصاد الكلي)
═══════════════════════════════════════════════════════════ */

/**
 * Macro Layer - Macroeconomic exposure analysis
 * 
 * Saudi-specific macro factors:
 * - Oil price sensitivity
 * - Interest rate sensitivity (SAIBOR)
 * - Inflation hedge
 * - USD/SAR (pegged but indirect)
 * - Government spending sensitivity
 */
function runMacroLayer(positions, base) {
  const exposures = {
    oilPrice: 0,
    interestRate: 0,
    inflation: 0,
    governmentSpending: 0,
  };

  let totalValue = 0;

  positions.forEach(p => {
    totalValue += p.value || 0;
    const sector = (p.stk && p.stk.sec) || p.sec || 'unknown';
    const weight = p.value || 0;

    // Sector-based macro exposure (Saudi market)
    if (sector === 'الطاقة' || sector === 'البتروكيماويات') {
      exposures.oilPrice += weight * 0.9;
    } else if (sector === 'البنوك' || sector === 'التأمين') {
      exposures.interestRate += weight * 0.7;
    } else if (sector === 'العقارات' || sector === 'البنية التحتية') {
      exposures.governmentSpending += weight * 0.8;
      exposures.interestRate += weight * 0.4;
    } else if (sector === 'السلع الاستهلاكية' || sector === 'تجارة التجزئة') {
      exposures.inflation += weight * 0.5;
    } else if (sector === 'المرافق' || sector === 'الاتصالات') {
      exposures.governmentSpending += weight * 0.4;
    }
  });

  // Normalize to percentages
  if (totalValue > 0) {
    Object.keys(exposures).forEach(k => {
      exposures[k] = +(exposures[k] / totalValue * 100).toFixed(1);
    });
  }

  // Identify macro risks
  const macroRisks = [];
  
  if (exposures.oilPrice > 40) {
    macroRisks.push({
      factor: 'oil_price',
      severity: 'high',
      exposure: exposures.oilPrice,
      message: 'تعرض ' + exposures.oilPrice + '% لسعر النفط - حساسية عالية',
    });
  }
  
  if (exposures.interestRate > 35) {
    macroRisks.push({
      factor: 'interest_rate',
      severity: 'medium',
      exposure: exposures.interestRate,
      message: 'تعرض ' + exposures.interestRate + '% لتغير الفائدة',
    });
  }

  return {
    exposures: exposures,
    macroRisks: macroRisks,
    diversification: calculateMacroDiversification(exposures),
  };
}

/* ═══════════════════════════════════════════════════════════
   🏭 LAYER 6 - SECTOR (القطاعات)
═══════════════════════════════════════════════════════════ */

/**
 * Sector Layer - Industry-level analysis
 */
function runSectorLayer(positions, base) {
  const sectors = {};
  let totalValue = 0;

  // Calculate sector weights
  positions.forEach(p => {
    const sector = (p.stk && p.stk.sec) || p.sec || 'غير مصنف';
    if (!sectors[sector]) {
      sectors[sector] = {
        name: sector,
        value: 0,
        weight: 0,
        stockCount: 0,
        stocks: [],
      };
    }
    sectors[sector].value += p.value || 0;
    sectors[sector].stockCount++;
    sectors[sector].stocks.push(p.sym);
    totalValue += p.value || 0;
  });

  // Calculate weights and identify issues
  const sectorList = [];
  const sectorIssues = [];
  
  Object.keys(sectors).forEach(name => {
    const sec = sectors[name];
    sec.weight = totalValue > 0 ? sec.value / totalValue : 0;
    sectorList.push(sec);

    // Flag over-concentration
    if (sec.weight > 0.4) {
      sectorIssues.push({
        type: 'sector_concentration',
        severity: 'high',
        sector: name,
        weight: +(sec.weight * 100).toFixed(1),
        message: 'تركيز ' + (sec.weight * 100).toFixed(0) + '% في ' + name,
      });
    }
  });

  // Sort by weight
  sectorList.sort((a, b) => b.weight - a.weight);

  // Calculate sector HHI
  let sectorHHI = 0;
  sectorList.forEach(s => {
    sectorHHI += s.weight * s.weight;
  });
  sectorHHI *= 10000;

  // Effective number of sectors
  const effectiveSectors = sectorHHI > 0 ? 10000 / sectorHHI : 0;

  // Missing important sectors (Saudi market)
  const importantSectors = ['البنوك', 'البتروكيماويات', 'الاتصالات', 'المرافق', 'العقارات'];
  const missingSectors = importantSectors.filter(
    s => !sectorList.find(sec => sec.name === s)
  );

  return {
    sectors: sectorList,
    sectorCount: sectorList.length,
    sectorHHI: Math.round(sectorHHI),
    effectiveSectors: +effectiveSectors.toFixed(1),
    largestSector: sectorList[0] || null,
    missingSectors: missingSectors,
    sectorIssues: sectorIssues,
    diversificationScore: calculateSectorDiversificationScore(sectorList, missingSectors),
  };
}

/* ═══════════════════════════════════════════════════════════
   📈 LAYER 7 - STOCK (الأسهم الفردية)
═══════════════════════════════════════════════════════════ */

/**
 * Stock Layer - Individual stock analysis
 */
function runStockLayer(positions, base) {
  const stockAnalysis = positions.map(p => {
    const analysis = {
      sym: p.sym,
      name: (p.stk && p.stk.name) || p.sym,
      weight: 0,
      value: p.value || 0,
      qty: p.qty || 0,
      avgCost: p.avgCost || 0,
      flags: [],
      score: 50,
    };

    // Calculate weight
    const totalValue = base.totalValue || 1;
    analysis.weight = totalValue > 0 ? p.value / totalValue : 0;

    // Calculate P&L
    if (p.qty && p.avgCost && p.value) {
      const currentPrice = p.value / p.qty;
      analysis.currentPrice = currentPrice;
      analysis.pnl = (currentPrice - p.avgCost) * p.qty;
      analysis.pnlPercent = ((currentPrice - p.avgCost) / p.avgCost) * 100;
    }

    // Flags
    if (analysis.weight > 0.25) {
      analysis.flags.push({
        type: 'over_weighted',
        severity: 'high',
        message: 'وزن ' + (analysis.weight * 100).toFixed(1) + '% - تركيز عالٍ',
      });
    }

    if (p.rsi && p.rsi > 75) {
      analysis.flags.push({
        type: 'overbought',
        severity: 'medium',
        message: 'RSI ' + p.rsi.toFixed(0) + ' - ذروة شراء',
      });
    }

    if (p.rsi && p.rsi < 30) {
      analysis.flags.push({
        type: 'oversold',
        severity: 'low',
        message: 'RSI ' + p.rsi.toFixed(0) + ' - ذروة بيع (فرصة محتملة)',
      });
    }

    if (analysis.pnlPercent && analysis.pnlPercent < -20) {
      analysis.flags.push({
        type: 'large_loss',
        severity: 'high',
        message: 'خسارة ' + analysis.pnlPercent.toFixed(1) + '%',
      });
    }

    // Score
    let score = 50;
    if (analysis.weight < 0.20 && analysis.weight > 0.05) score += 15;
    if (p.rsi && p.rsi > 40 && p.rsi < 60) score += 10;
    if (analysis.pnlPercent && analysis.pnlPercent > 0) score += 15;
    if (analysis.flags.length === 0) score += 10;
    
    analysis.score = Math.min(100, Math.max(0, score));

    return analysis;
  });

  // Sort by weight
  stockAnalysis.sort((a, b) => b.weight - a.weight);

  // Identify winners and losers
  const winners = stockAnalysis
    .filter(s => s.pnlPercent && s.pnlPercent > 5)
    .sort((a, b) => b.pnlPercent - a.pnlPercent)
    .slice(0, 3);

  const losers = stockAnalysis
    .filter(s => s.pnlPercent && s.pnlPercent < -5)
    .sort((a, b) => a.pnlPercent - b.pnlPercent)
    .slice(0, 3);

  return {
    stocks: stockAnalysis,
    topPositions: stockAnalysis.slice(0, 5),
    winners: winners,
    losers: losers,
    flaggedStocks: stockAnalysis.filter(s => s.flags.length > 0),
  };
}

/* ═══════════════════════════════════════════════════════════
   ⚡ LAYER 8 - ACTION (التوصيات التنفيذية)
═══════════════════════════════════════════════════════════ */

/**
 * Action Layer - Combine all insights into actionable recommendations
 */
function runActionLayer(positions, base, layers) {
  const actions = [];

  // From Diagnostic
  layers.diagnostic.issues.forEach(issue => {
    if (issue.severity === 'critical' || issue.severity === 'high') {
      actions.push({
        source: 'diagnostic',
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
      });
    }
  });

  // From Behavioral
  layers.behavioral.biases.forEach(bias => {
    if (bias.severity === 'high') {
      actions.push({
        source: 'behavioral',
        type: bias.type,
        severity: bias.severity,
        message: bias.message,
      });
    }
  });

  // From Sector
  layers.sector.sectorIssues.forEach(issue => {
    actions.push({
      source: 'sector',
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
    });
  });

  // From Stock
  layers.stock.flaggedStocks.forEach(stock => {
    stock.flags.forEach(flag => {
      if (flag.severity === 'high') {
        actions.push({
          source: 'stock',
          type: flag.type,
          stock: stock.sym,
          severity: flag.severity,
          message: stock.sym + ': ' + flag.message,
        });
      }
    });
  });

  return {
    totalActions: actions.length,
    criticalCount: actions.filter(a => a.severity === 'critical').length,
    highCount: actions.filter(a => a.severity === 'high').length,
    actions: actions.sort((a, b) => severityScore(b.severity) - severityScore(a.severity)),
  };
}
