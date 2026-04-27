/**
 * 🎯 Tadawul+ Type Definitions
 * Comprehensive type system for the application
 */

// ═══════════════════════════════════════════════════════
// 🏢 STOCK
// ═══════════════════════════════════════════════════════

export interface Stock {
  sym: string;
  name: string;
  sec: string;
  sectorId?: string;
  
  p: number;
  ch: number;
  pct: number;
  
  v: number;
  avgVol: number;
  
  hi: number;
  lo: number;
  w52h: number;
  w52l: number;
  
  target?: number;
  eps?: number;
  pe?: number;
  mktCap?: number;
  rating?: number;
  divY?: number;
  roe?: number;
  debt?: number;
  revGrw?: number;
  epsGrw?: number;
  
  sector_beta?: number;
  bookValue?: number;
  freeCashFlow?: number;
  oilCorr?: number;
}

// ═══════════════════════════════════════════════════════
// 📊 BAR (OHLC)
// ═══════════════════════════════════════════════════════

export interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// ═══════════════════════════════════════════════════════
// 💼 POSITION
// ═══════════════════════════════════════════════════════

export interface Position {
  sym: string;
  qty: number;
  cost: number;
  date: string;
  
  value?: number;
  curWeightPct?: number;
  rsi?: number;
  
  stk?: Stock;
  bars?: Bar[];
  
  smartAction?: SmartAction;
  health?: HealthAnalysis;
}

// ═══════════════════════════════════════════════════════
// 🎯 SMART ACTION
// ═══════════════════════════════════════════════════════

export interface SmartAction {
  action: string;
  percent?: number;
  color: string;
  reason: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  positionHealth?: PositionHealth;
  stopData?: StopData;
  targets?: Targets;
}

export interface PositionHealth {
  composite: number;
  label: string;
  daysHeld: number;
}

export interface StopData {
  stopPrice: number;
  stopPct: number;
}

export interface Targets {
  t1: number;
  t2: number;
  t3: number;
  expectedRR: number;
}

// ═══════════════════════════════════════════════════════
// 📊 HEALTH
// ═══════════════════════════════════════════════════════

export interface HealthAnalysis {
  score: number;
  grade: string;
  sig: string;
  rec?: string;
}

// ═══════════════════════════════════════════════════════
// 🎯 STRATEGIC INSIGHT
// ═══════════════════════════════════════════════════════

export interface StrategicInsight {
  alerts: Array<{
    message: string;
    suggestion: string;
    icon: string;
  }>;
  severity: 'info' | 'warning' | 'danger';
  weight: number;
  recommendedAction?: RecommendedAction;
}

export interface RecommendedAction {
  targetWeight: number;
  sellPercent: number;
  sellQty: number;
  sellValue: number;
  impact: {
    hhi: { change: string; description: string };
    volatility: { change: string; description: string };
    sharpe: { change: string; description: string };
    diversification: { 
      before: string; 
      after: string; 
      description: string;
    };
  };
}

// ═══════════════════════════════════════════════════════
// 📋 DECISION
// ═══════════════════════════════════════════════════════

export interface Decision {
  act: string;
  pct?: number;
  color: string;
  icon: string;
  reason: string;
  detail: string;
  urgent: boolean;
  upside: number | null;
  rr: number | null;
  smartData?: {
    stopPrice: number | null;
    stopPct: number | null;
    targets: Targets | null;
    positionHealth: PositionHealth | null;
    confidence: number;
  };
  strategicInsight?: StrategicInsight;
}

// ═══════════════════════════════════════════════════════
// 📐 PORTFOLIO MATH (utils)
// ═══════════════════════════════════════════════════════

export type NumberArray = number[];

// ═══════════════════════════════════════════════════════
// 🌐 GLOBAL STATE
// ═══════════════════════════════════════════════════════

export interface AppState {
  positions: Position[];
  perfHistory: any[];
  tradeLog: any[];
  capital: number;
  watchlist: string[];
}
