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
