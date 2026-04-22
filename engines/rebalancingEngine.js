/**
 * REBALANCING ENGINE
 * محرك تحليل توازن المحفظة وتقديم اقتراحات التحسين
 */

// ─── الثوابت الأساسية ─────────────────────────
const MAX_SINGLE_POSITION = 0.35;   // الحد الأقصى لسهم واحد: 35%
const IDEAL_POSITION = 0.20;        // الوزن المثالي: 20%
const MIN_SECTORS = 4;              // الحد الأدنى للقطاعات
const IDEAL_SECTORS = 5;            // العدد المثالي للقطاعات
const HIGH_CORRELATION = 0.7;       // ارتباط عالٍ (خطر)
const IDEAL_CORRELATION = 0.4;      // ارتباط مثالي

// ─── ثوابت متقدمة للسيناريوهات الجديدة ────────
const HIGH_VOLATILITY = 0.30;       // تذبذب عالٍ (> 30%)
const MIN_SHARPE = 0.5;             // Sharpe Ratio الأدنى
const IDEAL_SHARPE = 1.0;           // Sharpe مثالي
const HIGH_BETA = 1.5;              // بيتا عالٍ
const MIN_DIVIDEND_YIELD = 0.03;    // توزيعات مثالية (3%+)

// ─── الدالة الرئيسية: تحليل شامل ─────────────
export function analyzePortfolio(positions, marketData) {
  if (!positions || positions.length === 0) {
    return {
      healthScore: 0,
      issues: [],
      suggestions: [],
      summary: {
        totalValue: 0,
        numPositions: 0,
        numSectors: 0,
        avgCorrelation: 0,
      },
      isEmpty: true,
    };
  }

  // حساب إجمالي المحفظة
  const totalValue = positions.reduce((sum, p) => {
    return sum + (p.curPrice || p.avgCost) * p.qty;
  }, 0);

  // حساب الأوزان الحقيقية
  const weightedPositions = positions.map(p => {
    const value = (p.curPrice || p.avgCost) * p.qty;
    return {
      ...p,
      value,
      weight: value / totalValue,
      weightPct: (value / totalValue) * 100,
    };
  });

  // تحليل القطاعات
  const sectorMap = {};
  weightedPositions.forEach(p => {
    const sector = p.stk?.sec || 'غير محدد';
    if (!sectorMap[sector]) {
      sectorMap[sector] = { sector, value: 0, weight: 0, stocks: [] };
    }
    sectorMap[sector].value += p.value;
    sectorMap[sector].weight += p.weight;
    sectorMap[sector].stocks.push(p.sym);
  });

  const sectors = Object.values(sectorMap).map(s => ({
    ...s,
    weightPct: s.weight * 100,
  }));

  // اكتشاف المشاكل
  const issues = [];

  // 1. فحص التركيز
  const largestPosition = weightedPositions.reduce((max, p) => 
    p.weight > max.weight ? p : max, weightedPositions[0]);
  
  if (largestPosition.weight > MAX_SINGLE_POSITION) {
    const excessWeight = largestPosition.weight - IDEAL_POSITION;
    const sellAmount = largestPosition.value * (excessWeight / largestPosition.weight);
    
    issues.push({
      id: 'concentration',
      severity: 'high',
      icon: '⚠️',
      title: 'تركيز عالٍ',
      description: `${largestPosition.stk?.name || largestPosition.sym} يُشكّل ${Math.round(largestPosition.weightPct)}% من المحفظة`,
      ideal: `الوزن المثالي: ${Math.round(IDEAL_POSITION * 100)}-${Math.round(MAX_SINGLE_POSITION * 100)}%`,
      impact: {
        sharpe: '+33%',
        risk: '-18%',
      },
      solution: {
        action: 'sell',
        symbol: largestPosition.sym,
        name: largestPosition.stk?.name || largestPosition.sym,
        percentage: Math.round((excessWeight / largestPosition.weight) * 100),
        amount: Math.round(sellAmount),
      },
    });
  }

  // 2. فحص التنويع القطاعي
  const numSectors = sectors.length;
  if (numSectors < MIN_SECTORS) {
    const missingSectors = IDEAL_SECTORS - numSectors;
    const currentSectorNames = sectors.map(s => s.sector).join('، ');
    
    issues.push({
      id: 'diversification',
      severity: numSectors < 3 ? 'high' : 'medium',
      icon: '🔴',
      title: `${numSectors} ${numSectors === 1 ? 'قطاع' : numSectors === 2 ? 'قطاعان' : 'قطاعات'} فقط`,
      description: `محفظتك: ${currentSectorNames}`,
      ideal: `المثالي: ${IDEAL_SECTORS} قطاعات متنوعة`,
      impact: {
        diversification: `+${missingSectors * 20}%`,
        risk: '-25%',
      },
      solution: {
        action: 'add',
        suggestions: getSectorSuggestions(sectors.map(s => s.sector)),
      },
    });
  }

  // 3. فحص الارتباط (Correlation)
  const avgCorrelation = calculateAvgCorrelation(positions, marketData);
  if (avgCorrelation > HIGH_CORRELATION) {
    issues.push({
      id: 'correlation',
      severity: 'medium',
      icon: '🔗',
      title: 'ارتباط عالٍ بين الأسهم',
      description: `متوسط الارتباط: ${avgCorrelation.toFixed(2)}`,
      ideal: `المثالي: أقل من ${IDEAL_CORRELATION}`,
      impact: {
        diversification: '-30%',
        risk: '+15%',
      },
      solution: {
        action: 'diversify',
        message: 'أضف أسهماً من قطاعات مختلفة لتقليل الارتباط',
      },
    });
  } else if (avgCorrelation < IDEAL_CORRELATION) {
    // أخبار جيدة!
    issues.push({
      id: 'correlation-good',
      severity: 'good',
      icon: '✅',
      title: 'ارتباط ممتاز',
      description: `Correlation = ${avgCorrelation.toFixed(2)}`,
      ideal: 'تنويع حقيقي!',
      solution: {
        action: 'maintain',
        message: 'حافظ على هذا عند إضافة أسهم جديدة',
      },
    });
  }
  // ─── 5. فحص التذبذب (Volatility) ────────────
  const avgVolatility = calculateAvgVolatility(weightedPositions);
  if (avgVolatility > HIGH_VOLATILITY) {
    issues.push({
      id: 'volatility',
      severity: 'high',
      icon: '⚡',
      title: 'تذبذب عالٍ جداً',
      description: `متوسط تذبذب المحفظة: ${Math.round(avgVolatility * 100)}%`,
      ideal: `المثالي: أقل من ${Math.round(HIGH_VOLATILITY * 100)}%`,
      impact: {
        stress: '-40%',
        stability: '+30%',
      },
      solution: {
        action: 'stabilize',
        message: 'أضف أسهماً دفاعية مستقرة (STC, Bupa, الاتصالات)',
      },
    });
  } else if (avgVolatility < 0.15) {
    issues.push({
      id: 'volatility-good',
      severity: 'good',
      icon: '🛡️',
      title: 'محفظة مستقرة',
      description: `تذبذب منخفض: ${Math.round(avgVolatility * 100)}%`,
      ideal: 'مستقرة نفسياً!',
      solution: {
        action: 'maintain',
        message: 'يسهل الاحتفاظ بها على المدى الطويل',
      },
    });
  }

  // ─── 6. فحص Sharpe Ratio (العائد مقابل المخاطرة) ────
  const portfolioSharpe = calculatePortfolioSharpe(weightedPositions);
  if (portfolioSharpe < MIN_SHARPE) {
    issues.push({
      id: 'sharpe',
      severity: 'medium',
      icon: '📉',
      title: 'عائد ضعيف مقابل المخاطرة',
      description: `Sharpe Ratio: ${portfolioSharpe.toFixed(2)}`,
      ideal: `المثالي: ${IDEAL_SHARPE}+`,
      impact: {
        efficiency: `+${Math.round((IDEAL_SHARPE - portfolioSharpe) * 100)}%`,
        returns: '+25%',
      },
      solution: {
        action: 'optimize',
        message: 'استبدل الأسهم ذات الأداء الضعيف بأسهم ذات Sharpe أعلى',
      },
    });
  } else if (portfolioSharpe >= IDEAL_SHARPE) {
    issues.push({
      id: 'sharpe-good',
      severity: 'good',
      icon: '🎯',
      title: 'كفاءة عالية',
      description: `Sharpe Ratio: ${portfolioSharpe.toFixed(2)}`,
      ideal: 'عائد ممتاز مقابل المخاطرة!',
      solution: {
        action: 'maintain',
        message: 'محفظتك تستخدم المخاطرة بذكاء',
      },
    });
  }

  // ─── 7. فحص توزيعات الأرباح (Dividend Yield) ──────
  const avgDividendYield = calculateAvgDividendYield(weightedPositions);
  if (avgDividendYield < 0.02 && positions.length >= 3) {
    issues.push({
      id: 'dividends',
      severity: 'medium',
      icon: '💰',
      title: 'توزيعات أرباح منخفضة',
      description: `متوسط العائد: ${(avgDividendYield * 100).toFixed(1)}%`,
      ideal: `المثالي: ${(MIN_DIVIDEND_YIELD * 100).toFixed(0)}%+`,
      impact: {
        passive_income: '+150%',
        annual_return: '+3%',
      },
      solution: {
        action: 'add_dividends',
        message: 'أضف أسهماً توزيعية (الراجحي، STC، معادن)',
      },
    });
  } else if (avgDividendYield >= 0.05) {
    issues.push({
      id: 'dividends-good',
      severity: 'good',
      icon: '💵',
      title: 'دخل سلبي ممتاز',
      description: `توزيعات: ${(avgDividendYield * 100).toFixed(1)}% سنوياً`,
      ideal: 'محفظة توزيعية قوية!',
      solution: {
        action: 'maintain',
        message: 'دخل سلبي مستقر',
      },
    });
  }

  // ─── 8. فحص توازن Growth vs Value ──────────────
  const growthValueBalance = calculateGrowthValueBalance(weightedPositions);
  if (growthValueBalance.imbalanced) {
    issues.push({
      id: 'growth-value',
      severity: 'medium',
      icon: '⚖️',
      title: `تركيز على ${growthValueBalance.dominant}`,
      description: `${growthValueBalance.dominantPct}% من المحفظة`,
      ideal: 'المثالي: توازن 50/50 بين Growth وValue',
      impact: {
        diversification: '+25%',
        cycle_resilience: '+35%',
      },
      solution: {
        action: 'rebalance',
        message: growthValueBalance.suggestion,
      },
    });
  }

  // 4. فحص عدد المراكز
  if (positions.length < 3) {
    issues.push({
      id: 'positions',
      severity: 'medium',
      icon: '📊',
      title: `${positions.length} ${positions.length === 1 ? 'سهم' : 'سهمان'} فقط`,
      description: 'المحفظة تحتاج المزيد من التنويع',
      ideal: 'المثالي: 5-10 أسهم',
      impact: {
        diversification: '+40%',
        risk: '-30%',
      },
      solution: {
        action: 'add',
        message: `أضف ${5 - positions.length} أسهم على الأقل`,
      },
    });
  }

  // ─── حساب Health Score ─────────────
  const healthScore = calculateHealthScore({
    maxPosition: largestPosition.weight,
    numSectors,
    numPositions: positions.length,
    avgCorrelation,
  });

  // ─── حساب التأثير المتوقع بعد التطبيق ────────
  const impactSummary = calculateExpectedImpact(issues, healthScore);

  return {
    healthScore,
    issues: issues.filter(i => i.severity !== 'good'),
    positiveNotes: issues.filter(i => i.severity === 'good'),
    summary: {
      totalValue: Math.round(totalValue),
      numPositions: positions.length,
      numSectors,
      avgCorrelation: Number(avgCorrelation.toFixed(2)),
      largestPositionPct: Math.round(largestPosition.weightPct),
    },
    sectors,
    weightedPositions,
    impactSummary,
    isEmpty: false,
  };
}

// ─── حساب Health Score (0-10) ─────────────────
function calculateHealthScore({ maxPosition, numSectors, numPositions, avgCorrelation }) {
  let score = 10;

  // خصم للتركيز العالي
  if (maxPosition > MAX_SINGLE_POSITION) {
    score -= Math.min(3, (maxPosition - MAX_SINGLE_POSITION) * 10);
  }

  // خصم لقلة القطاعات
  if (numSectors < IDEAL_SECTORS) {
    score -= (IDEAL_SECTORS - numSectors) * 0.7;
  }

  // خصم لقلة المراكز
  if (numPositions < 5) {
    score -= (5 - numPositions) * 0.4;
  }

  // خصم للارتباط العالي
  if (avgCorrelation > IDEAL_CORRELATION) {
    score -= (avgCorrelation - IDEAL_CORRELATION) * 5;
  }

  return Math.max(0, Math.min(10, Number(score.toFixed(1))));
}

// ─── حساب الارتباط المتوسط ───────────────────
function calculateAvgCorrelation(positions, marketData) {
  if (positions.length < 2) return 0;
  
  // قيمة افتراضية منخفضة إذا كانت القطاعات مختلفة
  const sectors = new Set(positions.map(p => p.stk?.sec || 'unknown'));
  if (sectors.size === positions.length) {
    return 0.15; // قطاعات مختلفة = ارتباط منخفض
  } else if (sectors.size > positions.length / 2) {
    return 0.35; // تنوع متوسط
  } else {
    return 0.65; // نفس القطاع = ارتباط عالٍ
  }
}

// ─── اقتراحات القطاعات الناقصة ────────────────
function getSectorSuggestions(existingSectors) {
  const allSectors = {
    'تقنية': ['STC', 'Elm', 'سوليوشنز'],
    'صحة': ['Bupa', 'موندير', 'الدكتور سليمان'],
    'استهلاكي': ['BinDawood', 'Jarir', 'Extra'],
    'عقاري': ['دار الأركان', 'إعمار', 'الأندلس'],
    'صناعي': ['سابك', 'SIDCO', 'الكابلات'],
    'خدمات': ['الخطوط السعودية', 'مطارات الدمام'],
  };

  const suggestions = [];
  Object.keys(allSectors).forEach(sector => {
    if (!existingSectors.includes(sector)) {
      suggestions.push({
        sector,
        examples: allSectors[sector].slice(0, 2),
      });
    }
  });

  return suggestions.slice(0, 3);
}

// ─── حساب التأثير المتوقع ─────────────────────
function calculateExpectedImpact(issues, currentHealth) {
  const criticalIssues = issues.filter(i => i.severity === 'high' || i.severity === 'medium');
  const improvement = Math.min(3, criticalIssues.length * 0.8);
  
  return {
    before: {
      healthScore: currentHealth,
      sharpe: 1.2,
      maxDD: -18,
    },
    after: {
      healthScore: Math.min(10, currentHealth + improvement),
      sharpe: (1.2 + (improvement * 0.2)).toFixed(1),
      maxDD: Math.max(-25, -18 + (improvement * 2)),
    },
    estimatedCost: Math.round(criticalIssues.length * 15 + 10),
  };
}

// ─── دالة مساعدة لتنسيق الأرقام ───────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
}
