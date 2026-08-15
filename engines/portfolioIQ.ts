'use client';
/**
 * 🧠 PORTFOLIO IQ™ - World-Class Portfolio Intelligence
 * 
 * 8 Intelligence Layers:
 * 1. Diagnostic - Health & Issues
 * 2. Risk - Multi-dimensional
 * 3. Behavioral - Bias detection
 * 4. Factor - Style analysis
 * 5. Macro - Saudi-specific
 * 6. Sector - Industry analysis
 * 7. Stock - Individual analysis
 * 8. Action - Recommendations
 * 
 * 5 Innovations:
 * - PsyRisk Score™
 * - Portfolio DNA™
 * - Crystal Ball™ (Monte Carlo)
 * - Smart Stop-Loss™
 * - Recovery Path™
 * 
 * Academic Foundations:
 * - Markowitz MPT (1952)
 * - Sharpe CAPM (1966)
 * - Kahneman Prospect Theory (2002)
 * - Bridgewater Risk Parity
 * - Fama-French 3-Factor (1993)
 * - Black-Litterman (1990)
 * 
 * @version 2.0 (TypeScript)
 */

// ═══════════════════════════════════════════════════════
// 📊 CORE TYPES
// ═══════════════════════════════════════════════════════

export interface IQPosition {
  sym: string;
  qty: number;
  cost?: number;
  value?: number;
  rsi?: number;
  bars?: any[];
  stk?: {
    name?: string;
    sec?: string;
    sectorId?: string;
    p?: number;
    mktCap?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface IQOptions {
  riskTolerance?: number;
  benchmark?: string;
  [key: string]: any;
}


// ═══════════════════════════════════════════════════════
// 📊 LAYER INTERFACES
// ═══════════════════════════════════════════════════════

export interface LayerIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric?: number;
  message: string;
}

export interface LayerStrength {
  type: string;
  message: string;
}

export interface DiagnosticLayer {
  issuesCount: number;
  strengthsCount: number;
  issues: LayerIssue[];
  strengths: LayerStrength[];
  healthScore: number;
}

export interface RiskLayer {
  score: number;
  dimensions: {
    marketRisk: number;
    volatilityRisk: number;
    drawdownRisk: number;
    tailRisk: number;
    concentrationRisk: number;
    correlationRisk: number;
  };
  warnings: Array<{
    dimension: string;
    score: number;
    severity: string;
  }>;
  riskLevel: string;
}

export interface BehavioralBias {
  type: string;
  stock?: string;
  sector?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface BehavioralLayer {
  biasCount: number;
  biases: BehavioralBias[];
  behavioralScore: number;
  riskFlags: BehavioralBias[];
}

export interface FactorScore {
  score: number | null;
  classification: string;
}

export interface FactorLayer {
  factors: {
    size: FactorScore;
    value: FactorScore;
    momentum: FactorScore;
    quality: FactorScore;
    volatility: FactorScore;
  };
  style: string;
  styleLabel: string;
}

export interface MacroLayer {
  exposures: {
    oilPrice: number;
    interestRate: number;
    inflation: number;
    governmentSpending: number;
  };
  macroRisks: Array<{
    factor: string;
    severity: string;
    exposure: number;
    message: string;
  }>;
  diversification: string;
}

export interface SectorInfo {
  name: string;
  value: number;
  weight: number;
  stockCount: number;
  stocks: string[];
}

export interface SectorLayer {
  sectors: SectorInfo[];
  sectorCount: number;
  sectorHHI: number;
  effectiveSectors: number;
  largestSector: SectorInfo | null;
  missingSectors: string[];
  sectorIssues: Array<{
    type: string;
    severity: string;
    sector: string;
    weight: number;
    message: string;
  }>;
  diversificationScore: number;
}

export interface StockFlag {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface StockAnalysis {
  sym: string;
  name: string;
  weight: number;
  value: number;
  qty: number;
  avgCost: number;
  currentPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  flags: StockFlag[];
  score: number;
}

export interface StockLayer {
  stocks: StockAnalysis[];
  topPositions: StockAnalysis[];
  winners: StockAnalysis[];
  losers: StockAnalysis[];
  flaggedStocks: StockAnalysis[];
}

export interface ActionItem {
  source: string;
  type: string;
  stock?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

export interface ActionLayer {
  totalActions: number;
  criticalCount: number;
  highCount: number;
  actions: ActionItem[];
}


// ═══════════════════════════════════════════════════════
// 🌟 INNOVATIONS INTERFACES
// ═══════════════════════════════════════════════════════

export interface PsyRiskFactor {
  factor: string;
  impact: number;
  message: string;
}

export interface PsyRiskAnalysis {
  score: number;
  level: string;
  label: string;
  recommendation: string;
  factors: PsyRiskFactor[];
  sellPanicProbability: number;
}

export interface DNADimension {
  score: number;
  label: string;
}

export interface PortfolioDNA {
  dimensions: {
    growthValue: DNADimension;
    momentumReversion: DNADimension;
    defensiveAggressive: DNADimension;
    capSize: DNADimension;
  };
  personality: string;
  personalityLabel: string;
  personalityDescription: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CrystalBallHorizon {
  bestCase: number;
  bestCaseReturn: number;
  optimistic: number;
  optimisticReturn: number;
  median: number;
  medianReturn: number;
  pessimistic: number;
  pessimisticReturn: number;
  worstCase: number;
  worstCaseReturn: number;
  profitProbability: number;
}

export interface CrystalBallAnalysis {
  initialValue: number;
  sixMonths: CrystalBallHorizon;
  oneYear: CrystalBallHorizon;
  threeYears: CrystalBallHorizon;
  methodology: string;
  // ✨ حقول الإفصاح (تطابق ما تُرجعه runCrystalBall فعلياً)
  isEstimate?: boolean;
  confidenceNote?: string;
  disclaimer?: string;
}

export interface SmartStop {
  sym: string;
  currentPrice: number;
  suggestedStop: number | null;
  stopPercent?: number;
  atr?: number;
  method: string;
  multiplier?: number;
  riskPerShare?: number;
  totalRisk?: number;
  message?: string;
}

export interface SmartStopsAnalysis {
  stops: SmartStop[];
  totalRiskSAR: number;
  methodology: string;
}

export interface RecoveryAction {
  type: string;
  amount?: number;
  stocks?: string[];
  message: string;
}

export interface RecoveryPathAnalysis {
  currentDrawdown: number;
  recoveryNeeded?: number;
  status?: string;
  strategy?: string;
  expectedRecoveryMonths?: number;
  monthlyAddition?: number;
  actions?: RecoveryAction[];
  message?: string;
}

export interface Recommendation {
  id: string;
  priority: string;
  category: string;
  title: string;
  action: string;
  stock?: string;
  reasoning: string;
  expectedImpact: any;
  academicBasis: string;
  urgency: string;
  [key: string]: any;
}

export interface RecommendationsAnalysis {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  items: Recommendation[];
}

export interface IQSummary {
  headline: string;
  iqScore: number;
  grade: string;
  keyInsights: string[];
  topAction: {
    title: string;
    priority: string;
    reasoning: string;
  } | null;
  actionsCount: number;
  criticalActions: number;
}

export interface IQAnalysis {
  iqScore: number;
  grade: string;
  gradeLabel: string;
  gradeColor: string;
  layers: {
    diagnostic: DiagnosticLayer;
    risk: RiskLayer;
    behavioral: BehavioralLayer;
    factor: FactorLayer;
    macro: MacroLayer;
    sector: SectorLayer;
    stock: StockLayer;
    action: ActionLayer;
  };
  psyRisk: PsyRiskAnalysis;
  dna: PortfolioDNA;
  crystalBall: CrystalBallAnalysis | null;
  smartStops: SmartStopsAnalysis;
  recoveryPath: RecoveryPathAnalysis | null;
  recommendations: RecommendationsAnalysis;
  summary: IQSummary;
  timestamp?: number;
  version?: string;
  enginesUsed?: number;
}

// ═══════════════════════════════════════════════════════
// 🎯 ENUMS
// ═══════════════════════════════════════════════════════

export const PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const CATEGORY = {
  REDUCE_CONCENTRATION: 'reduce_concentration',
  ADD_DIVERSIFICATION: 'add_diversification',
  REDUCE_CORRELATION: 'reduce_correlation',
  RISK_MANAGEMENT: 'risk_management',
  BEHAVIORAL: 'behavioral',
  OPPORTUNITY: 'opportunity',
} as const;

export const HEALTH_GRADES = {
  AAA: { min: 90, label: 'استثنائي', color: '#1ee68a' },
  AA: { min: 85, label: 'ممتاز', color: '#1ee68a' },
  A: { min: 80, label: 'جيد جداً', color: '#34d399' },
  BBB: { min: 75, label: 'جيد', color: '#22d3ee' },
  BB: { min: 70, label: 'مقبول', color: '#a78bfa' },
  B: { min: 60, label: 'متوسط', color: '#fbbf24' },
  CCC: { min: 50, label: 'ضعيف', color: '#f97316' },
  D: { min: 0, label: 'حرج', color: '#ff5f6a' },
} as const;

export type Priority = typeof PRIORITY[keyof typeof PRIORITY];
export type Category = typeof CATEGORY[keyof typeof CATEGORY];

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
 * Trading Days per Year
 */
const TRADING_DAYS = 252;


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
export function analyzePortfolioIQ(
  positions: IQPosition[],
  tasiBars: any[],
  options: IQOptions = {}
): IQAnalysis {
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
function runDiagnosticLayer(positions: IQPosition[], base: any): DiagnosticLayer {
  const issues: LayerIssue[] = [];
  const strengths: LayerStrength[] = [];

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
function runRiskLayer(positions: IQPosition[], base: any): RiskLayer {
  if (!base.risk) {
    return { 
      score: 0, 
      dimensions: {
        marketRisk: 0,
        volatilityRisk: 0,
        drawdownRisk: 0,
        tailRisk: 0,
        concentrationRisk: 0,
        correlationRisk: 0,
      }, 
      warnings: [],
      riskLevel: 'unknown',
    };
  }

  const dimensions = {
    // Market risk (Beta-based)
    marketRisk: scoreMarketRisk((base.performance && base.performance.beta != null) ? base.performance.beta : 1),
    
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
  const warnings: Array<{dimension: string; score: number; severity: string}> = [];
  Object.keys(dimensions).forEach(key => {
    const dimKey = key as keyof typeof dimensions;
    if (dimensions[dimKey] < 40) {
      warnings.push({
        dimension: key,
        score: dimensions[dimKey],
        severity: dimensions[dimKey] < 25 ? 'critical' : 'high',
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
function runBehavioralLayer(positions: IQPosition[], base: any, options: IQOptions): BehavioralLayer {
  const biases: BehavioralBias[] = [];

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
    if ((sectorWeights as any)[sector] > 0.5) {
      biases.push({
        type: 'home_bias',
        sector: sector,
        severity: 'high',
        message: 'تركيز ' + ((sectorWeights as any)[sector] * 100).toFixed(0) + 
          '% في قطاع ' + sector,
      });
    }
  });

    return {
    biasCount: biases.length,
    biases: biases,
    // ✨ حدّ أدنى 0 -- يمنع درجة سالبة تتسرّب للواجهة ولحساب الـ IQ
    behavioralScore: Math.max(0, 100 - (biases.length * 15)),
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
function runFactorLayer(positions: IQPosition[], base: any): FactorLayer {
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
    // mktCap stored in billions, convert to actual value
const mktCapBillion = (p.stk && p.stk.mktCap) || 0;
const mktCap = mktCapBillion > 0 ? mktCapBillion * 1000000000 : (p.value || 0);
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

  // ✨ لا بيانات أساسية (fundamentals) متاحة لحساب هذين العاملين فعلياً --
  // نُرجع null صراحة بدل رقم مُختلَق، حتى لا يُعرض كأنه نتيجة تحليل حقيقي
  factors.quality.score = null;
  factors.quality.classification = 'unavailable';

  factors.value.score = null;
  factors.value.classification = 'unavailable';

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
function runMacroLayer(positions: IQPosition[], base: any): MacroLayer {
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
    if (sector === 'الطاقة' || sector === 'المواد الأساسية') {
      exposures.oilPrice += weight * 0.9;
    } else if (sector === 'البنوك' || sector === 'التأمين' || sector === 'الخدمات المالية') {
      exposures.interestRate += weight * 0.7;
    } else if (sector === 'إدارة وتطوير العقارات' || sector === 'السلع الرأسمالية') {
      exposures.governmentSpending += weight * 0.8;
      exposures.interestRate += weight * 0.4;
    } else if (sector === 'التجزئة' || sector === 'تجزئة الأغذية' || sector === 'إنتاج الأغذية' || sector === 'الخدمات الإستهلاكية') {
      exposures.inflation += weight * 0.5;
    } else if (sector === 'المرافق العامة' || sector === 'الإتصالات') {
      exposures.governmentSpending += weight * 0.4;
    }
  });

  // Normalize to percentages
  if (totalValue > 0) {
    Object.keys(exposures).forEach(k => {
      (exposures as any)[k] = +((exposures as any)[k] / totalValue * 100).toFixed(1);
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
function runSectorLayer(positions: IQPosition[], base: any): SectorLayer {
  const sectors: any = {};
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
  const sectorList: any[] = [];
  const sectorIssues: any[] = [];
  
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
  const importantSectors = ['البنوك', 'المواد الأساسية', 'الإتصالات', 'المرافق العامة', 'إدارة وتطوير العقارات'];
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
function runStockLayer(positions: IQPosition[], base: any): StockLayer {
  const stockAnalysis = positions.map(p => {
        const analysis: StockAnalysis = {
  sym: p.sym,
  name: (p.stk && p.stk.name) || p.sym,
  weight: 0,
  value: p.value || 0,
  qty: p.qty || 0,
  avgCost: p.avgCost || 0,
  currentPrice: 0,
  pnl: 0,
  pnlPercent: 0,
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
function runActionLayer(positions: IQPosition[], base: any, layers: any): ActionLayer {
  const actions: any[] = [];

  // From Diagnostic
  layers.diagnostic.issues.forEach((issue: any) => {
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
  layers.behavioral.biases.forEach((bias: any) => {  
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
layers.sector.sectorIssues.forEach((issue: any) => {
    actions.push({
      source: 'sector',
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
    });
  });


  // From Stock
  layers.stock.flaggedStocks.forEach((stock: any) => { 
    stock.flags.forEach((flag: any) => {
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


  /* ═══════════════════════════════════════════════════════════
   🧠 INNOVATION #1 - PSYRISK SCORE™
   Behavioral Risk Quantification
   
   Based on: Kahneman & Tversky (1979) Prospect Theory
            Loss Aversion Coefficient: 2.25
═══════════════════════════════════════════════════════════ */

/**
 * PsyRisk Score™ - Measures psychological risk
 * 
 * Calculates the probability that the investor will:
 * - Sell in panic during drawdowns
 * - Make emotional decisions
 * - Abandon strategy under stress
 * 
 * Score: 0-100 (higher = better psychological resilience)
 */
function calculatePsyRiskScore(positions: IQPosition[], base: any, options: IQOptions): PsyRiskAnalysis {
  let score = 100;
  const factors = [];

  // Factor 1: Drawdown tolerance vs actual drawdown
  // Loss aversion: pain of loss = 2.25x pleasure of gain
  const maxDD = base.risk ? Math.abs(base.risk.maxDrawdown) : 0;
  const userTolerance = (options && options.riskTolerance) || 0.20;
  
  if (maxDD > userTolerance) {
    const factor = Math.min(50, (maxDD - userTolerance) * 200);
    score -= factor;
    factors.push({
      factor: 'drawdown_intolerance',
      impact: -factor,
      message: 'تراجع ' + (maxDD * 100).toFixed(1) + '% يتجاوز قدرتك (' + 
        (userTolerance * 100).toFixed(0) + '%)',
    });
  }

  // Factor 2: Volatility comfort
  const vol = base.performance ? base.performance.volatility : 0.20;
  const volTolerance = userTolerance * 1.5;
  
  if (vol > volTolerance) {
    const factor = Math.min(20, (vol - volTolerance) * 100);
    score -= factor;
    factors.push({
      factor: 'volatility_stress',
      impact: -factor,
      message: 'تذبذب ' + (vol * 100).toFixed(1) + '% قد يسبب قلقاً',
    });
  }

  // Factor 3: Concentration anxiety
  if (base.diversification && base.diversification.largestPosition > 25) {
    const factor = Math.min(15, (base.diversification.largestPosition - 25) * 1.5);
    score -= factor;
    factors.push({
      factor: 'concentration_anxiety',
      impact: -factor,
      message: 'تركيز كبير قد يسبب توتراً عند تذبذب السهم',
    });
  }

  // Factor 4: Loss positions (psychological burden)
  let lossPositions = 0;
  let totalPositions = 0;
  
  positions.forEach(p => {
    if (p.qty && p.avgCost && p.value) {
      totalPositions++;
      const currentPrice = p.value / p.qty;
      if (currentPrice < p.avgCost * 0.9) lossPositions++;
    }
  });

  if (totalPositions > 0) {
    const lossRatio = lossPositions / totalPositions;
    if (lossRatio > 0.3) {
      const factor = Math.min(15, (lossRatio - 0.3) * 50);
      score -= factor;
      factors.push({
        factor: 'unrealized_losses',
        impact: -factor,
        message: lossPositions + ' أسهم خاسرة من ' + totalPositions + ' - ضغط نفسي',
      });
    }
  }

  // Final score
  score = Math.max(0, Math.min(100, score));

  // Classification
  let level, label, recommendation;
  if (score >= 80) {
    level = 'resilient';
    label = 'مرونة عالية';
    recommendation = 'محفظتك متوازنة نفسياً - استمر';
  } else if (score >= 60) {
    level = 'stable';
    label = 'مستقر';
    recommendation = 'محفظتك مقبولة لكن انتبه للضغوط';
  } else if (score >= 40) {
    level = 'vulnerable';
    label = 'معرّض للضغط';
    recommendation = 'فكّر في تقليل المخاطر للحفاظ على هدوئك';
  } else {
    level = 'high_stress';
    label = 'ضغط عالٍ';
    recommendation = 'محفظتك قد تجبرك على قرارات عاطفية - راجعها';
  }

  return {
    score: Math.round(score),
    level: level,
    label: label,
    recommendation: recommendation,
    factors: factors,
    sellPanicProbability: estimateSellPanicProbability(score, maxDD),
  };
}

/* ═══════════════════════════════════════════════════════════
   🧬 INNOVATION #2 - PORTFOLIO DNA™
   Style Classification System
   
   Based on: Sharpe (1992) Style Analysis
═══════════════════════════════════════════════════════════ */

/**
 * Portfolio DNA™ - Reveals true portfolio identity
 * 
 * Classifies portfolio across 4 dimensions:
 * - Growth vs Value
 * - Momentum vs Mean-Reversion
 * - Defensive vs Aggressive
 * - Domestic vs Diversified
 */
function analyzePortfolioDNA(positions: IQPosition[], base: any): PortfolioDNA {
  const dna = {
    growthValue: { score: 50, label: 'متوازن' },
    momentumReversion: { score: 50, label: 'متوازن' },
    defensiveAggressive: { score: 50, label: 'متوازن' },
    capSize: { score: 50, label: 'متنوع' },
  };

  // 1. Growth vs Value (using price momentum + market cap)
  let growthScore = 0;
  let totalWeight = 0;
  
  positions.forEach(p => {
    const weight = p.value || 0;
    totalWeight += weight;
    
    // Higher RSI = more growth-oriented
    if (p.rsi !== undefined) {
      growthScore += weight * (p.rsi / 100);
    } else {
      growthScore += weight * 0.5;
    }
  });
  
  if (totalWeight > 0) {
    const gv = (growthScore / totalWeight) * 100;
    dna.growthValue.score = Math.round(gv);
    dna.growthValue.label = 
      gv > 65 ? 'يميل لأسهم النمو السريع' :
      gv < 35 ? 'يميل لأسهم القيمة المستقرة' :
      'متوازن بين النمو والقيمة';
  }

  // 2. Momentum vs Mean-Reversion (based on portfolio beta)
  if (base.performance && base.performance.beta) {
    const beta = base.performance.beta;
    const momScore = Math.min(100, Math.max(0, 50 + (beta - 1) * 100));
    dna.momentumReversion.score = Math.round(momScore);
    dna.momentumReversion.label = 
      beta > 1.2 ? 'يتحرك بقوة مع اتجاه السوق' :
      beta < 0.8 ? 'يميل للاستقرار عكس تقلبات السوق' :
      'متوازن مع حركة السوق';
  }

  // 3. Defensive vs Aggressive (volatility-based)
  if (base.performance && base.performance.volatility) {
    const vol = base.performance.volatility;
    const aggScore = Math.min(100, vol * 250);
    dna.defensiveAggressive.score = Math.round(aggScore);
    dna.defensiveAggressive.label = 
      vol > 0.30 ? 'مخاطرة عالية بحثاً عن عوائد أكبر' :
      vol < 0.15 ? 'حذرة وتحافظ على رأس المال' :
      'متوازنة بين الحذر والمخاطرة';
  }

    // 4. Cap Size (Large vs Small)
  let largeCapValueDna = 0;
  let totalDnaValue = 0;
  
  positions.forEach(p => {
    totalDnaValue += p.value || 0;
    // mktCap stored in billions, convert to actual value
const mktCapB = (p.stk && p.stk.mktCap) || 0;
const mktCap = mktCapB > 0 ? mktCapB * 1000000000 : (p.value || 0);
if (mktCap > 50000000000) { // 50B+ = Large cap
  largeCapValueDna += p.value || 0;
}
  });
  
  const largeCapPctDna = totalDnaValue > 0 ? largeCapValueDna / totalDnaValue : 0.5;
  dna.capSize.score = Math.round(largeCapPctDna * 100);
    dna.capSize.label = 
    largeCapPctDna > 0.7 ? 'شركات كبرى راسخة' :
    largeCapPctDna > 0.4 ? 'مزيج متنوع من الأحجام' :
    'شركات صغيرة نامية';


  // Overall personality
  const personality = determinePortfolioPersonality(dna);

  return {
    dimensions: dna,
    personality: personality.type,
    personalityLabel: personality.label,
    personalityDescription: personality.description,
    strengths: personality.strengths,
    weaknesses: personality.weaknesses,
  };
}

/* ═══════════════════════════════════════════════════════════
   🔮 INNOVATION #3 - CRYSTAL BALL™
   Monte Carlo Future Predictions
   
   Based on: Geometric Brownian Motion + Bootstrap
═══════════════════════════════════════════════════════════ */

/**
 * Crystal Ball™ - Predicts future portfolio performance
 * 
 * Runs 1000 simulations using:
 * - Historical volatility
 * - Historical returns
 * - Random walk with drift
 */
function runCrystalBall(positions: IQPosition[], base: any, simulations: number = 1000): CrystalBallAnalysis | null {

  // Use defaults if data unavailable (allows testing without historical bars)
  // ✨ تحقق صريح بدل || الذي يستبدل 0% الحقيقي بافتراض مزيّف
  const hasRealPerf = !!(base.performance &&
    base.performance.annualReturn !== undefined && base.performance.annualReturn !== null &&
    base.performance.volatility !== undefined && base.performance.volatility !== null);

  if (!hasRealPerf || !base.totalValue) {
    return null; // لا نفبرك تنبؤاً من افتراضات عامة -- لا بيانات كافية = لا Crystal Ball
  }

  const annualReturn = base.performance.annualReturn;
  const annualVol = base.performance.volatility;
  const initialValue = base.totalValue;
  
  // Daily parameters
  const dailyReturn = annualReturn / TRADING_DAYS;
  const dailyVol = annualVol / Math.sqrt(TRADING_DAYS);

  // Predictions for different horizons
  const predictions = {
    sixMonths: simulateHorizon(initialValue, dailyReturn, dailyVol, 126, simulations),
    oneYear: simulateHorizon(initialValue, dailyReturn, dailyVol, 252, simulations),
    threeYears: simulateHorizon(initialValue, dailyReturn, dailyVol, 756, simulations),
  };

    return {
    initialValue: initialValue,
    sixMonths: predictions.sixMonths,
    oneYear: predictions.oneYear,
    threeYears: predictions.threeYears,
    methodology: 'محاكاة Monte Carlo (' + simulations + ' مسار) -- حركة براونية هندسية',
    // ✨ إفصاح صريح يُعرض للمستخدم: هذه تقديرات احتمالية، ليست تنبؤاً
    isEstimate: true,
    confidenceNote: 'تقدير احتمالي وليس تنبؤاً',
    disclaimer: 'هذه سيناريوهات احتمالية مبنية على محاكاة إحصائية تفترض توزيعاً طبيعياً للعوائد، ' +
      'وتعتمد على أن العائد والتذبذب المستقبليين يشبهان الماضي. ' +
      'النموذج لا يحسب الأزمات المفاجئة والانهيارات الحادة (الذيول السمينة)، ' +
      'لذا قد تكون الخسائر الفعلية في الأزمات أكبر مما يظهر. ' +
      'لا تتخذ قرارات استثمارية بناءً على هذه الأرقام وحدها.',
  };
}

/**
 * Simulate portfolio over time horizon
 */
function simulateHorizon(initialValue: number, dailyReturn: number, dailyVol: number, days: number, sims: number): any {
  const finalValues: any[] = [];
  
  // ✨ Seeded Random -- نتائج ثابتة لنفس المحفظة، مع بذرة تعكس (العائد + التذبذب + الأفق)
  // تضمين dailyVol يمنع تطابق التنبؤ بين محافظ مختلفة التذبذب رغم تشابه القيمة/العائد
  var seed = Math.floor(
    Math.abs(initialValue) * 7.13 +
    days * 31.0 +
    Math.abs(dailyReturn) * 1e6 +
    Math.abs(dailyVol) * 9.7e6
  ) % 2147483647;
  if (seed === 0) seed = 12345; // تجنّب البذرة الصفرية
  function seededRandom() {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return (seed >>> 0) / 0xffffffff;
  }

for (let s = 0; s < sims; s++) {
    let value = initialValue;
    for (let d = 0; d < days; d++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.max(seededRandom(), 1e-10);
      const u2 = seededRandom();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      
      // Geometric Brownian Motion
      const dailyChange = dailyReturn + dailyVol * z;
      value *= (1 + dailyChange);
    }
    finalValues.push(value);
  }


  // Sort for percentiles
  finalValues.sort((a, b) => a - b);

  const percentile5 = finalValues[Math.floor(sims * 0.05)];
  const percentile25 = finalValues[Math.floor(sims * 0.25)];
  const percentile50 = finalValues[Math.floor(sims * 0.50)];
  const percentile75 = finalValues[Math.floor(sims * 0.75)];
  const percentile95 = finalValues[Math.floor(sims * 0.95)];

  // Probability of profit
  const profitCount = finalValues.filter(v => v > initialValue).length;
  const profitProbability = (profitCount / sims) * 100;

    // ✨ إفصاح عن حدود النموذج: GBM يفترض توزيعاً طبيعياً (لا ذيول سمينة)
  // → يقلّل تقدير احتمالات الانهيارات الحادة. النطاقات تقديرية احتمالية، ليست تنبؤاً.
  return {
    bestCase: Math.round(percentile95),
    bestCaseReturn: +((percentile95 / initialValue - 1) * 100).toFixed(1),
    optimistic: Math.round(percentile75),
    optimisticReturn: +((percentile75 / initialValue - 1) * 100).toFixed(1),
    median: Math.round(percentile50),
    medianReturn: +((percentile50 / initialValue - 1) * 100).toFixed(1),
    pessimistic: Math.round(percentile25),
    pessimisticReturn: +((percentile25 / initialValue - 1) * 100).toFixed(1),
    worstCase: Math.round(percentile5),
    worstCaseReturn: +((percentile5 / initialValue - 1) * 100).toFixed(1),
    // نطاق احتمالي مركزي 50% (بين الربع الأدنى والأعلى) -- التعبير الأصدق عن "الأرجح"
    likelyRangeLow: Math.round(percentile25),
    likelyRangeHigh: Math.round(percentile75),
    profitProbability: +profitProbability.toFixed(1),
    isEstimate: true,
  };
}


/* ═══════════════════════════════════════════════════════════
   🛡️ INNOVATION #4 - SMART STOP-LOSS™
   Dynamic Risk Management
   
   Based on: Wilder (1978) ATR + Le Beau Chandelier Exit
═══════════════════════════════════════════════════════════ */

/**
 * Smart Stop-Loss™ - Calculates dynamic stop-loss for each stock
 * 
 * Combines:
 * - ATR (Average True Range) - Wilder 1978
 * - Volatility-adjusted stops
 * - Sector-specific factors
 */
function calculateSmartStops(positions: IQPosition[]): SmartStopsAnalysis {
  const stops = positions.map(p => {
    const currentPrice = p.value && p.qty ? p.value / p.qty : 
      (p.stk && p.stk.p) || 0;
    
    if (currentPrice <= 0) {
      return {
        sym: p.sym,
        currentPrice: 0,
        suggestedStop: null as any,
        method: 'no_price',
        message: 'لا يوجد سعر',
      };
    }

    // Try to calculate ATR if bars available
    let atr = 0;
    if (p.bars && p.bars.length >= 14) {
      atr = calculateATR(p.bars, 14);
    }
    
    // If no ATR, use volatility-based default (2.5% of price)
    if (!atr || atr <= 0) {
      atr = currentPrice * 0.025;
    }

    // ATR multiplier (sector-adjusted)
    let multiplier = 2.0;
    const sector = (p.stk && p.stk.sec) || p.sec;
    
    if (sector === 'البنوك' || sector === 'المرافق العامة' || sector === 'التأمين') {
      multiplier = 1.5;
    } else if (sector === 'المواد الأساسية' || sector === 'الطاقة') {
      multiplier = 2.5;
    }

    // Calculate stop
    const atrStop = currentPrice - (atr * multiplier);
    
    // Constraints
    const minStop = currentPrice * 0.85;
    const maxStop = currentPrice * 0.98;
    const finalStop = Math.max(minStop, Math.min(maxStop, atrStop));
    
    const stopPercent = ((currentPrice - finalStop) / currentPrice) * 100;
    
    // Risk amount
    const riskPerShare = currentPrice - finalStop;
    const totalRisk = riskPerShare * (p.qty || 0);

    return {
      sym: p.sym,
      currentPrice: +currentPrice.toFixed(2),
      suggestedStop: +finalStop.toFixed(2),
      stopPercent: +stopPercent.toFixed(1),
      atr: +atr.toFixed(2),
      method: p.bars && p.bars.length >= 14 ? 'atr_chandelier' : 'volatility_default',
      multiplier: multiplier,
      riskPerShare: +riskPerShare.toFixed(2),
      totalRisk: +totalRisk.toFixed(0),
    };
  });

  // Total portfolio risk
  const totalRisk = stops
    .filter(s => s.suggestedStop !== null)
    .reduce((sum, s) => sum + (s.totalRisk || 0), 0);

  return {
    stops: stops,
    totalRiskSAR: Math.round(totalRisk),
    methodology: 'ATR (14) + Chandelier Exit + تعديل قطاعي',
  };
}

/**
 * Calculate ATR (Average True Range)
 */
function calculateATR(bars: any[], period: number = 14): number {
  if (!bars || bars.length < period + 1) return 0;
  const trs: any[] = [];
  
  for (let i = 1; i < bars.length; i++) {
    // ✨ نقبل كل صيغ الحقول (hi/h، lo/l) -- يمنع سقوط TR لصفر صامتاً
    const high = bars[i].hi != null ? bars[i].hi : (bars[i].h != null ? bars[i].h : bars[i].c);
    const low = bars[i].lo != null ? bars[i].lo : (bars[i].l != null ? bars[i].l : bars[i].c);
    const prevClose = bars[i - 1].c;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
  }

  // Take last 'period' values
  const recent = trs.slice(-period);
  const sum = recent.reduce((a, b) => a + b, 0);
  return sum / recent.length;
}

/* ═══════════════════════════════════════════════════════════
   🔄 INNOVATION #5 - RECOVERY PATH™
   Drawdown Recovery Optimization
═══════════════════════════════════════════════════════════ */

/**
 * Recovery Path™ - Plans optimal recovery from drawdowns
 * 
 * Generates a strategy for:
 * - Dollar-Cost Averaging into weakness
 * - Position rebalancing
 * - Volatility regime adjustment
 */
function generateRecoveryPath(positions: IQPosition[], base: any): RecoveryPathAnalysis {
  if (!base.risk || Math.abs(base.risk.maxDrawdown) < 0.05) {
    return {
      currentDrawdown: 0,
      status: 'stable',
      message: 'محفظتك مستقرة - لا حاجة لخطة استعادة',
    };
  }

  const currentDD = Math.abs(base.risk.maxDrawdown);
  const recoveryNeeded = currentDD / (1 - currentDD); // Math: how much gain to recover
  
  // Strategy based on drawdown severity
  let strategy, monthlyAddition, expectedRecoveryMonths;
  
  if (currentDD < 0.10) {
    strategy = 'maintain';
    monthlyAddition = 0;
    expectedRecoveryMonths = Math.ceil(recoveryNeeded * 100 / 1.5); // 1.5% monthly assumed
  } else if (currentDD < 0.20) {
    strategy = 'gradual_dca';
    monthlyAddition = 0.05; // 5% of portfolio monthly
    expectedRecoveryMonths = Math.ceil(recoveryNeeded * 100 / 2.5);
  } else {
    strategy = 'aggressive_dca';
    monthlyAddition = 0.10; // 10% monthly
    expectedRecoveryMonths = Math.ceil(recoveryNeeded * 100 / 4);
  }

  // Recovery actions
  const actions: any[] = [];
  
  if (strategy !== 'maintain') {
    actions.push({
      type: 'monthly_dca',
      amount: Math.round((base.totalValue || 100000) * monthlyAddition),
      message: 'أضف ' + (monthlyAddition * 100).toFixed(0) + '% شهرياً للمتوسط',
    });
  }

  // Identify undervalued positions
  const undervalued = positions
    .filter(p => p.rsi && p.rsi < 35)
    .map(p => p.sym);
  
  if (undervalued.length > 0) {
    actions.push({
      type: 'add_undervalued',
      stocks: undervalued,
      message: 'فكر في زيادة: ' + undervalued.join(', ') + ' (RSI منخفض)',
    });
  }

  return {
    currentDrawdown: +(currentDD * 100).toFixed(1),
    recoveryNeeded: +(recoveryNeeded * 100).toFixed(1),
    strategy: strategy,
    expectedRecoveryMonths: expectedRecoveryMonths,
    monthlyAddition: monthlyAddition,
    actions: actions,
  };
}
/* ═══════════════════════════════════════════════════════════
   ⚡ RECOMMENDATIONS ENGINE
   The brain that converts analysis into actions
═══════════════════════════════════════════════════════════ */

/**
 * Generate prioritized, actionable recommendations
 */
function generateRecommendations(data: any): RecommendationsAnalysis {
  const { positions, baseAnalysis, diagnostic, risk, behavioral, sector, stock } = data;
  const recommendations: any[] = [];

  // === CRITICAL: Concentration Issues ===
  if (baseAnalysis.diversification && baseAnalysis.diversification.largestPosition > 30) {
    const stockData = stock.stocks[0];
    if (stockData) {
      const targetWeight = 20;
      const currentWeight = stockData.weight * 100;
      const reductionNeeded = currentWeight - targetWeight;
      
      recommendations.push({
        id: 'reduce_concentration_' + stockData.sym,
        priority: PRIORITY.CRITICAL,
        category: CATEGORY.REDUCE_CONCENTRATION,
        title: 'خفّض تركيزك في ' + stockData.sym,
        action: 'reduce_position',
        stock: stockData.sym,
        currentValue: currentWeight,
        targetValue: targetWeight,
        reductionAmount: Math.round((reductionNeeded / 100) * baseAnalysis.totalValue),
        reasoning: 'تركيز ' + currentWeight.toFixed(1) + 
          '% في سهم واحد يعرّضك لمخاطرة غير ضرورية',
        expectedImpact: {
          // HHI قابل للحساب فعلياً من فرق مربّعات الأوزان (مساهمة هذا السهم وحده)
          hhi: 'انخفاض ~' + Math.round(currentWeight * currentWeight - targetWeight * targetWeight) + ' نقطة',
          concentration: 'انخفاض تركيز المخاطر',
          diversification: 'تحسّن التنويع',
          note: 'الاتجاه المتوقع -- الأثر الفعلي يعتمد على بقية المحفظة',
        },
        academicBasis: 'Markowitz (1952) - Diversification reduces unsystematic risk',
        urgency: 'Action recommended within 1 week',
      });
    }
  }

  // === HIGH: Sector Concentration ===
  if (sector.largestSector && sector.largestSector.weight > 0.4) {
    recommendations.push({
      id: 'sector_diversification_' + sector.largestSector.name,
      priority: PRIORITY.HIGH,
      category: CATEGORY.ADD_DIVERSIFICATION,
      title: 'نوّع خارج قطاع ' + sector.largestSector.name,
      action: 'add_diversification',
      currentSectorWeight: +(sector.largestSector.weight * 100).toFixed(1),
      targetSectorWeight: 30,
      suggestedSectors: sector.missingSectors.slice(0, 2),
      reasoning: 'تركيز ' + (sector.largestSector.weight * 100).toFixed(0) + 
        '% في قطاع واحد يعرّضك لمخاطر القطاع',
            expectedImpact: {
        diversificationScore: 'تحسّن درجة التنويع',
        sectorHHI: 'انخفاض تركيز القطاع',
        correlationReduction: 'احتمال انخفاض الارتباط',
        note: 'الاتجاه المتوقع -- يعتمد على القطاعات التي تُضاف',
      },
      academicBasis: 'Fama-French (1993) - Sector diversification reduces idiosyncratic risk',
      urgency: 'Plan within this month',
    });
  }

  // === HIGH: Correlation Issues ===
  if (baseAnalysis.diversification && 
      baseAnalysis.diversification.avgCorrelation > 0.6 &&
      baseAnalysis.diversification.highCorrelations &&
      baseAnalysis.diversification.highCorrelations.length > 0) {
    
    const highCorr = baseAnalysis.diversification.highCorrelations[0];
    
    recommendations.push({
      id: 'reduce_correlation_' + highCorr.symA + '_' + highCorr.symB,
      priority: PRIORITY.HIGH,
      category: CATEGORY.REDUCE_CORRELATION,
      title: 'تنويع وهمي: ' + highCorr.symA + ' و ' + highCorr.symB,
      action: 'replace_correlated',
      stocks: [highCorr.symA, highCorr.symB],
      correlation: highCorr.correlation,
      reasoning: 'هذان السهمان يتحركان معاً (' + (highCorr.correlation * 100).toFixed(0) + 
        '%) - استبدل أحدهما بسهم من قطاع مختلف',
            expectedImpact: {
        avgCorrelation: 'انخفاض متوسط الارتباط',
        diversificationScore: 'تحسّن درجة التنويع',
        portfolioVolatility: 'احتمال انخفاض التذبذب',
        note: 'الاتجاه المتوقع -- يعتمد على السهم البديل',
      },

      academicBasis: 'Bridgewater (Ray Dalio) - "15-20 uncorrelated bets = Holy Grail"',
      urgency: 'Strategic adjustment',
    });
  }

  // === HIGH: Risk Management ===
  if (baseAnalysis.risk && Math.abs(baseAnalysis.risk.maxDrawdown) > 0.20) {
    recommendations.push({
      id: 'add_stop_losses',
      priority: PRIORITY.HIGH,
      category: CATEGORY.RISK_MANAGEMENT,
      title: 'ضع Stop-Loss على المراكز الكبيرة',
      action: 'set_stop_losses',
      affectedStocks: stock.topPositions.slice(0, 5).map((s: any) => s.sym),
      reasoning: 'تراجع تاريخي ' + (Math.abs(baseAnalysis.risk.maxDrawdown) * 100).toFixed(1) + 
        '% - حماية رأس المال أولوية',
            expectedImpact: {
        maxDrawdown: 'حدّ أقصى للخسارة في كل مركز',
        capitalProtection: 'حماية رأس المال من الانهيارات الحادة',
        note: 'Stop-Loss يحدّ الخسارة لكنه قد يتفعّل مبكراً في التذبذبات العادية',
      },

      academicBasis: 'Wilder (1978) ATR + Le Beau Chandelier Exit',
      urgency: 'Implement this week',
    });
  }

  // === MEDIUM: Behavioral Issues ===
  if (behavioral.biasCount > 0) {
    behavioral.biases.forEach((bias: any) => {
      if (bias.severity === 'high') {
        recommendations.push({
          id: 'behavioral_' + bias.type + (bias.stock || ''),
          priority: PRIORITY.MEDIUM,
          category: CATEGORY.BEHAVIORAL,
          title: 'تحيّز سلوكي: ' + getBiasLabel(bias.type),
          action: 'review_decision',
          stock: bias.stock || null,
                    reasoning: bias.message,
          expectedImpact: {
            decisionQuality: 'تحسّن جودة القرار بتجنّب التحيّز',
            longTermReturns: 'احتمال تحسّن العوائد طويلة المدى',
            note: 'الأثر سلوكي وغير قابل للقياس الكمّي الدقيق',
          },
          academicBasis: 'Kahneman-Tversky (1979) Prospect Theory',
          urgency: 'Review at next opportunity',
        });
      }
    });
  }

  // === LOW: Optimization Opportunities ===
  if (baseAnalysis.performance && baseAnalysis.performance.sharpe < 1.0 && 
      baseAnalysis.performance.sharpe > 0) {
    recommendations.push({
      id: 'optimize_sharpe',
      priority: PRIORITY.LOW,
      category: CATEGORY.OPPORTUNITY,
      title: 'حسّن نسبة Sharpe',
      action: 'rebalance',
      currentSharpe: baseAnalysis.performance.sharpe,
      targetSharpe: 1.0,
      reasoning: 'Sharpe ' + baseAnalysis.performance.sharpe.toFixed(2) + 
        ' - يمكن تحسينه بإعادة التوازن',
      expectedImpact: {
        sharpe: 'تحسّن العائد المعدّل بالمخاطر',
        risk: 'احتمال انخفاض التذبذب عبر إعادة التوازن',
        note: 'الاتجاه المتوقع -- إعادة التوازن لا تضمن تحسّن Sharpe دائماً',
      },

      academicBasis: 'Sharpe (1966) - Risk-adjusted optimization',
      urgency: 'When time permits',
    });
  }

  // Sort by priority
  recommendations.sort((a: any, b: any) => priorityScore(b.priority) - priorityScore(a.priority));

  return {
    total: recommendations.length,
    critical: recommendations.filter((r: any) => r.priority === PRIORITY.CRITICAL).length,
    high: recommendations.filter((r: any) => r.priority === PRIORITY.HIGH).length,
    medium: recommendations.filter((r: any) => r.priority === PRIORITY.MEDIUM).length,
    low: recommendations.filter((r: any) => r.priority === PRIORITY.LOW).length,
    items: recommendations,
  };
}

/* ═══════════════════════════════════════════════════════════
   📋 SMART SUMMARY
   AI-generated executive summary
═══════════════════════════════════════════════════════════ */

/**
 * Generate intelligent summary in natural language
 */
function generateSmartSummary(data: any): IQSummary {
  const { iqScore, health, baseAnalysis, recommendations } = data;
  
  // Headline
  let headline;
  if (iqScore >= 80) {
    headline = '🏆 محفظتك في حالة ممتازة';
  } else if (iqScore >= 65) {
    headline = '✅ محفظتك جيدة مع فرص للتحسين';
  } else if (iqScore >= 50) {
    headline = '⚠️ محفظتك تحتاج اهتمام';
  } else {
    headline = '🚨 محفظتك تحتاج إعادة هيكلة';
  }

  // Key insights
  const insights: any[] = [];
  
  if (baseAnalysis.performance) {
    const ret = baseAnalysis.performance.annualReturn || 0;
    const vol = baseAnalysis.performance.volatility || 0;
    insights.push(
      'العائد السنوي ' + (ret * 100).toFixed(1) + '% ' +
      'مع تذبذب ' + (vol * 100).toFixed(1) + '%'
    );
  }
  
  if (baseAnalysis.performance && baseAnalysis.performance.sharpe) {
    insights.push(
      'Sharpe ' + baseAnalysis.performance.sharpe.toFixed(2) + ' - ' + 
      (baseAnalysis.performance.sharpe > 1 ? 'مكافأة جيدة للمخاطرة' : 'يحتاج تحسين')
    );
  }
  
  if (baseAnalysis.diversification) {
    insights.push(
      'التنويع: ' + baseAnalysis.diversification.scoreLabel + 
      ' (' + baseAnalysis.diversification.score + '/100)'
    );
  }

  // Top action
  let topAction = null;
  if (recommendations && recommendations.items && recommendations.items.length > 0) {
    topAction = recommendations.items[0];
  }

  return {
    headline: headline,
    iqScore: iqScore,
    grade: health.grade,
    keyInsights: insights,
    topAction: topAction ? {
      title: topAction.title,
      priority: topAction.priority,
      reasoning: topAction.reasoning,
    } : null,
    actionsCount: recommendations ? recommendations.total : 0,
    criticalActions: recommendations ? recommendations.critical : 0,
  };
}

/* ═══════════════════════════════════════════════════════════
   🛠️ HELPER FUNCTIONS
═══════════════════════════════════════════════════════════ */

function calculateIQScore(layers: any): number {
  // Weighted IQ score
  const weights = {
    diagnostic: 0.20,
    risk: 0.25,
    behavioral: 0.15,
    factor: 0.10,
    sector: 0.20,
  };

  let score = 0;
  score += (layers.diagnostic.healthScore || 50) * weights.diagnostic;
  score += (layers.risk.score || 50) * weights.risk;
  score += (layers.behavioral.behavioralScore || 50) * weights.behavioral;
  score += 60 * weights.factor; // Factor placeholder
  score += (layers.sector.diversificationScore || 50) * weights.sector;

  return Math.round(Math.max(0, Math.min(100, score)));
}

function getHealthGrade(score: number): any {
  if (score >= 90) return { grade: 'AAA', label: 'استثنائي', color: '#1ee68a' };
  if (score >= 85) return { grade: 'AA', label: 'ممتاز', color: '#1ee68a' };
  if (score >= 80) return { grade: 'A', label: 'جيد جداً', color: '#34d399' };
  if (score >= 75) return { grade: 'BBB', label: 'جيد', color: '#22d3ee' };
  if (score >= 70) return { grade: 'BB', label: 'مقبول', color: '#a78bfa' };
  if (score >= 60) return { grade: 'B', label: 'متوسط', color: '#fbbf24' };
  if (score >= 50) return { grade: 'CCC', label: 'ضعيف', color: '#f97316' };
  return { grade: 'D', label: 'حرج', color: '#ff5f6a' };
}

function severityScore(severity: string): number {
  const scores = { critical: 4, high: 3, medium: 2, low: 1 };
  return (scores as any)[severity] || 0;
}

function priorityScore(priority: any): number {
  const scores = {
    [PRIORITY.CRITICAL]: 4,
    [PRIORITY.HIGH]: 3,
    [PRIORITY.MEDIUM]: 2,
    [PRIORITY.LOW]: 1,
  };
  return (scores as any)[priority] || 0;
}

function calculateDiagnosticScore(issues: any[], strengths: any[]): number {
  let score = 70;
  issues.forEach(i => {
    if (i.severity === 'critical') score -= 15;
    else if (i.severity === 'high') score -= 10;
    else if (i.severity === 'medium') score -= 5;
    else score -= 2;
  });
  strengths.forEach(s => score += 5);
  return Math.max(0, Math.min(100, score));
}

function scoreMarketRisk(beta: number): number {
  if (beta < 0.8) return 85;
  if (beta < 1.0) return 75;
  if (beta < 1.2) return 65;
  if (beta < 1.5) return 50;
  return 30;
}

function scoreVolatilityRisk(vol: number): number {
  if (vol < 0.10) return 90;
  if (vol < 0.15) return 80;
  if (vol < 0.20) return 70;
  if (vol < 0.30) return 50;
  return 30;
}

function scoreDrawdownRisk(maxDD: number): number {
  const dd = Math.abs(maxDD);
  if (dd < 0.05) return 95;
  if (dd < 0.10) return 85;
  if (dd < 0.15) return 70;
  if (dd < 0.25) return 50;
  return 25;
}

function scoreTailRisk(cvar: number): number {
  if (!cvar) return 50;
  if (cvar < 0.02) return 85;
  if (cvar < 0.03) return 70;
  if (cvar < 0.05) return 50;
  return 30;
}

function scoreConcentrationRisk(hhi: number): number {
  if (hhi < 1500) return 90;
  if (hhi < 2500) return 75;
  if (hhi < 4000) return 55;
  if (hhi < 6000) return 35;
  return 15;
}

function scoreCorrelationRisk(avgCorr: number): number {
  if (avgCorr < 0.30) return 90;
  if (avgCorr < 0.50) return 70;
  if (avgCorr < 0.70) return 50;
  return 30;
}

function classifyRiskLevel(score: number): string {
  if (score >= 80) return 'low';
  if (score >= 60) return 'moderate';
  if (score >= 40) return 'high';
  return 'extreme';
}

function calculateSectorWeights(positions: any[]): any {
  const sectors: any = {};
  let total = 0;
  
  positions.forEach(p => {
    const sec = (p.stk && p.stk.sec) || p.sec || 'unknown';
    sectors[sec] = (sectors[sec] || 0) + (p.value || 0);
    total += p.value || 0;
  });
  
  Object.keys(sectors).forEach(s => {
    sectors[s] = total > 0 ? sectors[s] / total : 0;
  });
  
  return sectors;
}

function calculateMacroDiversification(
  exposures: { [key: string]: number }
): 'good' | 'moderate' | 'concentrated' {
  const values = Object.values(exposures);
  const max = Math.max(...values);
  return max < 30 ? 'good' : max < 50 ? 'moderate' : 'concentrated';
}

function calculateSectorDiversificationScore(sectors: any[], missing: any[]): number {
  let score = 50;
  if (sectors.length >= 5) score += 20;
  else if (sectors.length >= 3) score += 10;
  
  if (missing.length === 0) score += 20;
  else if (missing.length <= 2) score += 10;
  
  // Penalty for concentration
  const maxWeight = sectors[0] ? sectors[0].weight : 0;
  if (maxWeight > 0.5) score -= 20;
  else if (maxWeight > 0.4) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

function classifyPortfolioStyle(factors: any): string {
  if (factors.size.score > 70 && factors.volatility.score > 70) {
    return 'large_cap_defensive';
  }
  if (factors.momentum.score > 65) return 'momentum_growth';
  if (factors.volatility.score > 70) return 'low_volatility';
  if (factors.size.score < 40) return 'small_cap_aggressive';
  return 'balanced';
}

function getStyleLabel(style: string): string {
  const labels = {
    large_cap_defensive: 'كبيرة دفاعية',
    momentum_growth: 'زخم ونمو',
    low_volatility: 'منخفضة التذبذب',
    small_cap_aggressive: 'صغيرة عدوانية',
    balanced: 'متوازنة',
  };
  return (labels as any)[style] || 'متنوعة';
}

function determinePortfolioPersonality(dna: any): any {
  const gv = dna.growthValue.score;
  const da = dna.defensiveAggressive.score;
  const mr = dna.momentumReversion.score;

  if (gv > 65 && da > 60) {
    return {
      type: 'aggressive_growth',
      label: 'نمو عدواني',
      description: 'تبحث عن نمو سريع وتقبل التذبذب',
      strengths: ['عوائد محتملة عالية', 'اختيار ذكي للأسهم'],
      weaknesses: ['تذبذب مرتفع', 'ضغط نفسي محتمل'],
    };
  }
  
  if (gv < 35 && da < 40) {
    return {
      type: 'conservative_value',
      label: 'محافظ قيمي',
      description: 'تفضّل الأمان والقيمة المستقرة',
      strengths: ['استقرار', 'حماية رأس المال', 'هدوء نفسي'],
      weaknesses: ['عوائد قد تكون أقل', 'فرص ضائعة في الأسواق الصاعدة'],
    };
  }
  
  if (mr > 65) {
    return {
      type: 'momentum_chaser',
      label: 'متتبع للزخم',
      description: 'تشتري ما يصعد وتبيع ما يهبط',
      strengths: ['عوائد قوية في الترندات'],
      weaknesses: ['خسائر في تحوّلات السوق', 'متابعة مكثفة'],
    };
  }

    return {
    type: 'balanced_investor',
    label: 'مستثمر متوازن',
    description: 'تجمع بين النمو والأمان',
    strengths: ['توازن صحي بين المخاطرة والاستقرار', 'مرونة في التكيف مع تقلبات السوق'],
    weaknesses: ['قد لا تحقق عوائد استثنائية في الأسواق الصاعدة بقوة'],
  };
}

function estimateSellPanicProbability(psyScore: number, currentDD: number): number {
  // Higher drawdown + lower psy score = higher panic probability
  const ddImpact = Math.min(50, Math.abs(currentDD) * 200);
  const psyImpact = Math.max(0, 50 - psyScore / 2);
  return Math.min(95, Math.round(ddImpact + psyImpact));
}

function getBiasLabel(type: string): string {
  const labels = {
    recency_bias: 'تحيّز الحداثة',
    loss_aversion: 'كره الخسارة',
    overconfidence: 'الثقة المفرطة',
    home_bias: 'تحيّز محلي',
    confirmation_bias: 'تحيّز التأكيد',
    anchoring: 'التثبيت',
  };
  return (labels as any)[type] || type;
}

function emptyAnalysis(): IQAnalysis {
  return {
    iqScore: 0,
    grade: 'N/A',
    gradeLabel: 'محفظة فارغة',
    gradeColor: '#888',
    layers: {} as any,
    psyRisk: { score: 0 } as any,
    dna: { personality: 'unknown' } as any,
    crystalBall: null,
    smartStops: { stops: [], totalRiskSAR: 0, methodology: '' },
    recoveryPath: null,
    recommendations: { total: 0, critical: 0, high: 0, medium: 0, low: 0, items: [] },
    summary: { 
      headline: 'محفظة فارغة - أضف أسهماً للبدء', 
      iqScore: 0,
      grade: 'N/A',
      keyInsights: [], 
      topAction: null,
      actionsCount: 0,
      criticalActions: 0,
    },
  };
}

/* ═══════════════════════════════════════════════════════════
   📤 EXPORTS
═══════════════════════════════════════════════════════════ */

export {
  RISK_FREE_RATE,
  TRADING_DAYS,
};

    