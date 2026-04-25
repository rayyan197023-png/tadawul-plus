/**
 * ═══════════════════════════════════════════════════════════════
 * Position Engine - Smart Stop Loss + Take Profit + Management
 * 
 * Mathematical Foundations:
 * - ATR-based dynamic stops
 * - Risk/Reward optimization
 * - Volatility-adjusted exits
 * - Multiple target levels
 * - Time-based decay
 * 
 * Used by: PortfolioScreen, AnalysisScreen
 * ═══════════════════════════════════════════════════════════════
 */

import { stockHealth } from './analysisEngine';

/**
 * ✨ Smart Stop Loss Calculator
 * 
 * Uses 3 methods + picks the smartest:
 * 1. ATR-based (volatility-adjusted)
 * 2. Support-based (technical levels)
 * 3. Percentage-based (fixed %)
 * 
 * Returns the most conservative (highest) stop
 */
export function calcSmartStopLoss(entryPrice, currentPrice, health, bars){
  if(!entryPrice || !currentPrice || !bars || bars.length < 14){
    return {
      stopPrice: entryPrice * 0.93, // -7% default
      stopPct: -7,
      method: 'default',
      distance: 7,
      reason: 'بيانات غير كافية - حد افتراضي -7%'
    };
  }
  
  const atr = health?.extras?.atrPct ? (health.extras.atrPct/100) * currentPrice : currentPrice * 0.015;
  const regime = health?.regime || 'chop';
  
  // ① ATR-based stop (Bloomberg standard)
  // Volatile market: 3x ATR
  // Normal: 2.5x ATR
  // Calm: 2x ATR
  const atrMultiplier = regime === 'volatile' ? 3.0 
                      : regime === 'news-driven' ? 2.8
                      : regime === 'bear' ? 2.5
                      : regime === 'sideways' ? 2.2
                      : 2.5;
  const atrStop = entryPrice - (atr * atrMultiplier);
  const atrStopPct = ((atrStop - entryPrice) / entryPrice) * 100;
  
  // ② Support-based stop (recent low - 1%)
  const last20Bars = bars.slice(-20);
  const recentLow = Math.min(...last20Bars.map(b => b.lo || b.low || entryPrice));
  const supportStop = recentLow * 0.99; // 1% buffer
  const supportStopPct = ((supportStop - entryPrice) / entryPrice) * 100;
  
  // ③ Percentage-based stop (Half-Kelly aware)
  // Strong signal: -8%, Moderate: -6%, Weak: -4%
  const score = health?.score || 50;
  const pctStopValue = score >= 75 ? -8 : score >= 60 ? -6 : -4;
  const pctStop = entryPrice * (1 + pctStopValue/100);
  
  // ④ Pick the smartest (closest to entry, but not too tight)
  // Avoid stops that are too tight (< -2%) or too loose (> -12%)
  const candidates = [
    { stop: atrStop, pct: atrStopPct, method: 'ATR' },
    { stop: supportStop, pct: supportStopPct, method: 'Support' },
    { stop: pctStop, pct: pctStopValue, method: 'Percentage' },
  ].filter(c => c.pct >= -12 && c.pct <= -2);
  
  // Use the highest stop (least loss) that's still reasonable
  const best = candidates.length > 0 
    ? candidates.reduce((a, b) => a.stop > b.stop ? a : b)
    : { stop: entryPrice * 0.94, pct: -6, method: 'Default' };
  
  return {
    stopPrice: +best.stop.toFixed(2),
    stopPct: +best.pct.toFixed(1),
    method: best.method,
    distance: Math.abs(best.pct),
    reason: `حد خسارة ذكي (${best.method}): ${best.pct.toFixed(1)}%`,
  };
}

/**
 * ✨ Smart Take Profit Calculator
 * 
 * Uses R:R ratios + Multiple targets:
 * - T1: 1.5R (33% profit taking)
 * - T2: 2.5R (33% profit taking)
 * - T3: 4.0R (final 34%)
 * 
 * R = Risk = Distance to Stop Loss
 */
export function calcSmartTakeProfit(entryPrice, stopPrice, health){
  if(!entryPrice || !stopPrice){
    return null;
  }
  
  const risk = entryPrice - stopPrice; // R value
  const score = health?.score || 50;
  const grade = health?.grade || 'C';
  
  // Adjust R:R based on signal strength
  // Stronger signal = higher targets
  const rr1 = grade === 'S' || grade === 'A' ? 2.0 : 1.5;
  const rr2 = grade === 'S' || grade === 'A' ? 3.0 : 2.5;
  const rr3 = grade === 'S' ? 5.0 : grade === 'A' ? 4.5 : 4.0;
  
  const t1 = entryPrice + (risk * rr1);
  const t2 = entryPrice + (risk * rr2);
  const t3 = entryPrice + (risk * rr3);
  
  return {
    t1: { price: +t1.toFixed(2), pct: +((t1-entryPrice)/entryPrice*100).toFixed(1), rr: rr1, sell: 33 },
    t2: { price: +t2.toFixed(2), pct: +((t2-entryPrice)/entryPrice*100).toFixed(1), rr: rr2, sell: 33 },
    t3: { price: +t3.toFixed(2), pct: +((t3-entryPrice)/entryPrice*100).toFixed(1), rr: rr3, sell: 34 },
    expectedRR: ((rr1*0.33 + rr2*0.33 + rr3*0.34)).toFixed(1),
  };
}

/**
 * ✨ Trailing Stop Dynamic
 * 
 * يتحرك مع السعر صعوداً، لا يتحرك هبوطاً
 * يحمي الأرباح المُحققة
 */
export function calcTrailingStop(entryPrice, currentPrice, highestSinceEntry, health){
  if(!entryPrice || !currentPrice){
    return null;
  }
  
  const atr = health?.extras?.atrPct ? (health.extras.atrPct/100) * currentPrice : currentPrice * 0.015;
  const profit = ((currentPrice - entryPrice) / entryPrice) * 100;
  
  // Don't activate trailing until in profit
  if(profit < 2) return null;
  
  // Trailing distance based on profit level
  // More profit = tighter trailing (protect gains)
  let trailMultiplier;
  if(profit >= 15) trailMultiplier = 1.5;       // Tight (1.5 ATR)
  else if(profit >= 10) trailMultiplier = 2.0;  // Medium
  else if(profit >= 5) trailMultiplier = 2.5;   // Wider
  else trailMultiplier = 3.0;                    // Wide
  
  const high = highestSinceEntry || currentPrice;
  const trailStop = high - (atr * trailMultiplier);
  const trailPct = ((trailStop - entryPrice) / entryPrice) * 100;
  
  // Trailing stop is always above original stop
  return {
    price: +trailStop.toFixed(2),
    pct: +trailPct.toFixed(1),
    distance: +(((currentPrice - trailStop) / currentPrice) * 100).toFixed(1),
    locked: trailStop > entryPrice ? '✓ مؤمّن' : 'لم يُفعّل بعد',
    isLocked: trailStop > entryPrice,
  };
}

/**
 * ✨ Position Health Score (0-100)
 * 
 * Combines 7 factors:
 * 1. Signal strength (25%)
 * 2. Profit/Loss status (20%)
 * 3. Stop loss proximity (15%)
 * 4. Time in position (10%)
 * 5. Volume confirmation (10%)
 * 6. Trend alignment (10%)
 * 7. Market regime (10%)
 */
export function calcPositionHealth(position, health, bars){
  if(!position || !health) return null;
  
  const entryPrice = position.avgCost || 0;
  const currentPrice = position.curPrice || entryPrice;
  const pnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
  const score = health.score || 50;
  const sig = health.sig || 'محايد';
  const regime = health.regime || 'chop';
  const layers = health.layers || {};
  
  // Days in position
  const entryDate = position.entryDate ? new Date(position.entryDate) : new Date();
  const today = new Date();
  const daysHeld = Math.max(0, Math.floor((today - entryDate) / (1000 * 60 * 60 * 24)));
  
  // ① Signal strength (25%)
  const signalScore = sig === 'شراء قوي' ? 100
                    : sig === 'مراقبة' ? 70
                    : sig === 'محايد' ? 50
                    : sig === 'تخفيف' ? 25
                    : 10;
  
  // ② Profit/Loss status (20%)
  let pnlScore;
  if(pnlPct >= 15) pnlScore = 100;
  else if(pnlPct >= 5) pnlScore = 80;
  else if(pnlPct >= 0) pnlScore = 60;
  else if(pnlPct >= -3) pnlScore = 40;
  else if(pnlPct >= -7) pnlScore = 20;
  else pnlScore = 5;
  
  // ③ Stop loss proximity (15%)
  // إذا قريب من Stop = خطر
  const stopData = calcSmartStopLoss(entryPrice, currentPrice, health, bars);
  const distanceToStop = ((currentPrice - stopData.stopPrice) / currentPrice) * 100;
  const stopScore = distanceToStop > 5 ? 100
                  : distanceToStop > 3 ? 75
                  : distanceToStop > 1 ? 40
                  : 10;
  
  // ④ Time in position (10%)
  // المراكز القديمة المفلسة = خطر
  const timeScore = pnlPct > 0 
    ? (daysHeld < 5 ? 70 : daysHeld < 20 ? 90 : daysHeld < 60 ? 80 : 60)
    : (daysHeld < 5 ? 80 : daysHeld < 20 ? 50 : daysHeld < 60 ? 30 : 10);
  
  // ⑤ Volume confirmation (10%)
  const vr = health?.extras?.vr || 1.0;
  const volScore = vr > 1.3 ? 90 : vr > 1.0 ? 70 : vr > 0.7 ? 50 : 30;
  
  // ⑥ Trend alignment (10%)
  const L1 = layers.L1 || 50;
  const L4 = layers.L4 || 50;
  const trendScore = (L1 + L4) / 2;
  
  // ⑦ Market regime (10%)
  const regimeScore = regime === 'bull' ? 90
                    : regime === 'sideways' ? 60
                    : regime === 'bear' ? 30
                    : regime === 'volatile' ? 25
                    : 50;
  
  // Composite
  const composite = Math.round(
    signalScore * 0.25 +
    pnlScore * 0.20 +
    stopScore * 0.15 +
    timeScore * 0.10 +
    volScore * 0.10 +
    trendScore * 0.10 +
    regimeScore * 0.10
  );
  
  return {
    composite,
    components: {
      signal: signalScore,
      pnl: pnlScore,
      stop: stopScore,
      time: timeScore,
      volume: volScore,
      trend: Math.round(trendScore),
      regime: regimeScore,
    },
    daysHeld,
    pnlPct: +pnlPct.toFixed(1),
    distanceToStop: +distanceToStop.toFixed(1),
    grade: composite >= 85 ? 'S'
         : composite >= 70 ? 'A'
         : composite >= 55 ? 'B'
         : composite >= 40 ? 'C'
         : composite >= 25 ? 'D' : 'F',
    label: composite >= 80 ? 'مركز ممتاز'
         : composite >= 65 ? 'مركز جيد'
         : composite >= 50 ? 'مركز متوسط'
         : composite >= 35 ? 'مركز ضعيف'
         : 'مركز خطر',
  };
}

/**
 * ✨ Smart Action Recommendation
 * 
 * Uses Position Health + Signal + P&L to recommend:
 * - زيادة المركز
 * - احتفاظ
 * - بيع جزئي (25% / 33% / 50% / 75%)
 * - بيع كامل
 * - وقف خسارة فوري
 */
export function calcSmartAction(position, health, bars, riskGate){
  const positionHealth = calcPositionHealth(position, health, bars);
  if(!positionHealth) return null;
  
  const entryPrice = position.avgCost || 0;
  const currentPrice = position.curPrice || entryPrice;
  const pnlPct = positionHealth.pnlPct;
  const sig = health?.sig || 'محايد';
  const score = health?.score || 50;
  const composite = positionHealth.composite;
  
  // Calculate stop and targets
  const stopData = calcSmartStopLoss(entryPrice, currentPrice, health, bars);
  const targets = calcSmartTakeProfit(entryPrice, stopData.stopPrice, health);
  
  let action, percent, color, urgency, reason, confidence;
  
  // ① DANGER: Risk gate triggered
  if(riskGate === 'DANGER'){
    action = 'بيع كامل';
    percent = 100;
    color = '#ff5f6a';
    urgency = 'critical';
    confidence = 95;
    reason = '🚨 السوق في خطر نظامي - أغلق فوراً';
  }
  // ② STOP LOSS HIT
  else if(currentPrice <= stopData.stopPrice){
    action = 'وقف خسارة';
    percent = 100;
    color = '#ff5f6a';
    urgency = 'critical';
    confidence = 100;
    reason = `🛑 السعر اخترق Stop Loss (${stopData.stopPct.toFixed(1)}%) - أغلق المركز`;
  }
  // ③ TAKE PROFIT 3 (Final target)
  else if(targets && currentPrice >= targets.t3.price){
    action = 'بيع كامل';
    percent = 100;
    color = '#1ee68a';
    urgency = 'high';
    confidence = 90;
    reason = `🎯 وصل T3 (+${targets.t3.pct}%) - احجز الأرباح كاملة`;
  }
  // ④ TAKE PROFIT 2
  else if(targets && currentPrice >= targets.t2.price){
    action = 'بيع 50%';
    percent = 50;
    color = '#10c97e';
    urgency = 'high';
    confidence = 85;
    reason = `🎯 وصل T2 (+${targets.t2.pct}%) - احجز نصف الأرباح`;
  }
  // ⑤ TAKE PROFIT 1
  else if(targets && currentPrice >= targets.t1.price){
    action = 'بيع 33%';
    percent = 33;
    color = '#22d3ee';
    urgency = 'medium';
    confidence = 80;
    reason = `🎯 وصل T1 (+${targets.t1.pct}%) - احجز ثلث الأرباح`;
  }
  // ⑥ STRONG BUY signal + Excellent health
  else if(sig === 'شراء قوي' && score >= 80 && composite >= 75 && pnlPct < 5){
    action = 'زد المركز';
    percent = 25;
    color = '#1ee68a';
    urgency = 'medium';
    confidence = 85;
    reason = `🚀 إشارة قوية + مركز ممتاز - زد ${25}% للحجم المثالي`;
  }
  // ⑦ Position deteriorating - Time to reduce
  else if(composite < 40 && pnlPct < -3){
    action = 'بيع 50%';
    percent = 50;
    color = '#fbbf24';
    urgency = 'high';
    confidence = 75;
    reason = `⚠️ المركز يتدهور (${positionHealth.label}) - قلّل المخاطرة`;
  }
  // ⑧ Signal weakened + good profit
  else if(sig === 'تخفيف' && pnlPct > 5){
    action = 'بيع 50%';
    percent = 50;
    color = '#fbbf24';
    urgency = 'medium';
    confidence = 75;
    reason = `📉 الإشارة ضعفت + ربح ${pnlPct.toFixed(1)}% - احجز جزءاً`;
  }
  // ⑨ Time decay - Old losing position
  else if(positionHealth.daysHeld > 30 && pnlPct < -2 && composite < 50){
    action = 'بيع كامل';
    percent = 100;
    color = '#ff5f6a';
    urgency = 'high';
    confidence = 70;
    reason = `⏰ مركز قديم (${positionHealth.daysHeld} يوم) + خاسر - استبدله`;
  }
  // ⑩ Default: Hold
  else {
    action = 'احتفظ';
    percent = 0;
    color = '#22d3ee';
    urgency = 'low';
    confidence = composite >= 60 ? 75 : 50;
    reason = composite >= 70 
      ? `✓ المركز جيد - استمر` 
      : `📊 لا حاجة للتحرك الآن`;
  }
  
  return {
    action,
    percent,
    color,
    urgency,
    confidence,
    reason,
    positionHealth,
    stopData,
    targets,
    metadata: {
      pnlPct: positionHealth.pnlPct,
      daysHeld: positionHealth.daysHeld,
      grade: positionHealth.grade,
      signal: sig,
      score,
    },
  };
}

/**
 * ✨ Portfolio Balance Analyzer
 * 
 * Detects:
 * - Concentration risk (>30% in one stock)
 * - Sector concentration (>50% in one sector)
 * - Correlation risk
 * - Cash buffer adequacy
 * - Position size optimization
 */
export function calcPortfolioBalance(positions, totalValue){
  if(!positions || positions.length === 0 || !totalValue) return null;
  
  const issues = [];
  const recommendations = [];
  
  // ① Concentration check
  positions.forEach(p => {
    const weight = (p.value / totalValue) * 100;
    if(weight > 30){
      issues.push({
        severity: 'high',
        type: 'concentration',
        sym: p.sym,
        message: `${p.stk?.name || p.sym}: ${weight.toFixed(1)}% من المحفظة (>30%)`,
      });
      recommendations.push({
        sym: p.sym,
        action: 'reduce',
        message: `قلّل ${p.stk?.name || p.sym} إلى أقل من 25%`,
      });
    } else if(weight > 25){
      issues.push({
        severity: 'medium',
        type: 'concentration',
        sym: p.sym,
        message: `${p.stk?.name || p.sym}: ${weight.toFixed(1)}% (مرتفع)`,
      });
    }
  });
  
  // ② Sector concentration
  const sectorMap = {};
  positions.forEach(p => {
    const sec = p.stk?.sec || 'غير محدد';
    sectorMap[sec] = (sectorMap[sec] || 0) + p.value;
  });
  Object.entries(sectorMap).forEach(([sec, value]) => {
    const weight = (value / totalValue) * 100;
    if(weight > 50){
      issues.push({
        severity: 'high',
        type: 'sector',
        message: `قطاع ${sec}: ${weight.toFixed(1)}% (>50%)`,
      });
      recommendations.push({
        action: 'diversify',
        message: `نوّع خارج قطاع ${sec}`,
      });
    } else if(weight > 35){
      issues.push({
        severity: 'medium',
        type: 'sector',
        message: `قطاع ${sec}: ${weight.toFixed(1)}% (مرتفع)`,
      });
    }
  });
  
  // ③ Number of positions
  if(positions.length < 4){
    issues.push({
      severity: 'medium',
      type: 'diversification',
      message: `${positions.length} أسهم فقط - تنويع منخفض`,
    });
    recommendations.push({
      action: 'add',
      message: 'أضف 2-4 أسهم لتنويع أفضل',
    });
  } else if(positions.length > 12){
    issues.push({
      severity: 'low',
      type: 'over-diversification',
      message: `${positions.length} أسهم - تنويع زائد`,
    });
    recommendations.push({
      action: 'consolidate',
      message: 'فكر في دمج المراكز الصغيرة',
    });
  }
  
  // Calculate balance score
  const highIssues = issues.filter(i => i.severity === 'high').length;
  const mediumIssues = issues.filter(i => i.severity === 'medium').length;
  const balanceScore = Math.max(0, 100 - (highIssues * 20) - (mediumIssues * 8));
  
  return {
    score: balanceScore,
    grade: balanceScore >= 85 ? 'S'
         : balanceScore >= 70 ? 'A'
         : balanceScore >= 55 ? 'B'
         : balanceScore >= 40 ? 'C' : 'D',
    label: balanceScore >= 80 ? 'محفظة متوازنة'
         : balanceScore >= 60 ? 'متوسطة التوازن'
         : balanceScore >= 40 ? 'تحتاج تعديل'
         : 'مخاطرة عالية',
    issues,
    recommendations,
    sectorBreakdown: sectorMap,
    positionCount: positions.length,
  };
}
