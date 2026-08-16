'use client';
/**
 * @module engines/strategyLab
 * @description محرّك Genetic Algorithm الرئيسيّ لـ Strategy Lab
 *
 * 🎯 الهدف:
 * تنظيم العملية الكاملة: توليد، اختبار، تقييم، تطوير عبر الأجيال.
 *
 * 📚 المنهجية العلمية:
 * 1. Train/Test Split (60/40) - Hastie et al. (2009)
 * 2. Genetic Algorithm - Holland (1975), Goldberg (1989)
 * 3. Elitism + Crossover + Mutation - DeJong (1975)
 * 4. Out-of-Sample Validation - Pardo (2008)
 *
 * 🔄 التدفّق:
 * Train (60%) → تطوّر عبر N أجيال → أفضل 3
 *                                       ↓
 * Test (40%) ← اختبار out-of-sample ← اختيار الفائز النهائيّ
 *
 * @author تداول+
 * @version 1.0
 */

import { Strategy, generatePopulation, createNextGeneration, getGenerationStats } from './strategyGenerator';
import { calculateFitness, FitnessResult, BacktestMetrics, rankByFitness } from './strategyFitness';
import { StockType } from './stockClassifier';

// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

/**
 * أوضاع التشغيل المتاحة
 */
export type LabMode = 'quick' | 'deep' | 'ultra';

/**
 * إعدادات تشغيل Lab
 */
export interface LabConfig {
  mode: LabMode;
  targetType: Exclude<StockType, 'excluded'>;
  generations: number;
  populationSize: number;
  eliteCount: number;
  mutationRate: number;
  trainPct: number;              // نسبة بيانات التدريب (0.6 = 60%)
  minTradesRequired: number;     // أدنى عدد صفقات لقبول استراتيجية
  abortOnError: boolean;         // إيقاف عند أوّل خطأ
}

/**
 * نتيجة جيل واحد
 */
export interface GenerationResult {
  generation: number;
  population: Strategy[];
  best: Strategy | null;
  stats: {
    count: number;
    testedCount: number;
    avgFitness: number;
    maxFitness: number;
    minFitness: number;
  };
  errors: number;
  durationMs: number;
}

/**
 * نتيجة Lab كاملة
 */
export interface LabResult {
  success: boolean;
  config: LabConfig;
  
  // النتائج
  trainResults: GenerationResult[];      // كل الأجيال على Train
  testResults: Array<{                    // أفضل 3 على Test (out-of-sample)
    strategy: Strategy;
    trainFitness: FitnessResult;
    testFitness: FitnessResult;
    passed: boolean;                      // هل نجح في Test؟
    overfittingScore: number;             // 0 (لا) - 1 (شديد)
  }>;
  
  // الفائز النهائيّ
  winner: Strategy | null;
  winnerFitness: FitnessResult | null;
  
  // إحصاءات
  totalBacktests: number;
  totalErrors: number;
  totalDurationMs: number;
  startedAt: number;
  finishedAt: number;
  
  // أخطاء وتحذيرات
  errors: string[];
  warnings: string[];
}

/**
 * تقدّم العملية (للـ UI)
 */
export interface LabProgress {
  phase: 'preparing' | 'training' | 'validating' | 'completed' | 'error';
  currentGeneration: number;
  totalGenerations: number;
  currentStrategy: number;
  strategiesInGeneration: number;
  
  bestFitnessSoFar: number;
  bestStrategyId: string | null;
  
  overallPct: number;            // 0-100
  message: string;
  
  // إحصاءات
  completedBacktests: number;
  totalBacktests: number;
  errors: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

/**
 * Backtest Function Type
 * 
 * يتوقّع Lab أن يُمرَّر له دالة باك-تيست تأخذ استراتيجية + بيانات
 * وتُرجع متريات.
 */
export type BacktestFunction = (
  strategy: Strategy,
  historicalData: any[]
) => Promise<BacktestMetrics | null>;

// ════════════════════════════════════════════════════════════
//  CONFIG PRESETS
// ════════════════════════════════════════════════════════════

/**
 * إعدادات افتراضية لكل وضع
 */
export const MODE_CONFIGS: Record<LabMode, Omit<LabConfig, 'targetType'>> = {
    quick: {
    mode: 'quick',
    generations: 3,
    populationSize: 12,
    eliteCount: 3,
    mutationRate: 0.15,
    trainPct: 0.6,
    minTradesRequired: 10,
    abortOnError: false,
  },
  deep: { 
    mode: 'deep',
    generations: 5,
    populationSize: 20,
    eliteCount: 4,
    mutationRate: 0.10,
    trainPct: 0.6,
    minTradesRequired: 25,
    abortOnError: false,
  },
  ultra: {
    mode: 'ultra',
    generations: 8,
    populationSize: 30,
    eliteCount: 5,
    mutationRate: 0.08,           // أقلّ للتركيز
    trainPct: 0.7,                // تدريب أطول
    minTradesRequired: 30,
    abortOnError: false,
  },
};

/**
 * إنشاء config كامل لوضع معيّن
 */
export function createLabConfig(
  mode: LabMode,
  targetType: Exclude<StockType, 'excluded'>
): LabConfig {
  return {
    ...MODE_CONFIGS[mode],
    targetType,
  };
}

// ════════════════════════════════════════════════════════════
//  TIME ESTIMATES
// ════════════════════════════════════════════════════════════

/**
 * تقدير وقت التشغيل لوضع معيّن
 * 
 * @returns الوقت بالدقائق
 */
export function estimateDuration(
  mode: LabMode,
  yearsOfData: number = 4
): { minMinutes: number; maxMinutes: number; expected: number } {
  const config = MODE_CONFIGS[mode];
  const totalBacktests = config.generations * config.populationSize + 3;  // +3 للـ Test
  
  // افتراض: كل باك-تيست يستغرق 15-30 ثانية على iPhone
  const minSecPerTest = 15 * (yearsOfData / 4);
  const maxSecPerTest = 30 * (yearsOfData / 4);
  
  const minMinutes = Math.ceil((totalBacktests * minSecPerTest) / 60);
  const maxMinutes = Math.ceil((totalBacktests * maxSecPerTest) / 60);
  const expected = Math.ceil((minMinutes + maxMinutes) / 2);
  
  return { minMinutes, maxMinutes, expected };
}

// ════════════════════════════════════════════════════════════
//  DATA SPLITTING (TRAIN/TEST)
// ════════════════════════════════════════════════════════════

/**
 * تقسيم البيانات التاريخية إلى Train + Test
 * 
 * المبدأ:
 * - Train = أول 60% (أو حسب config)
 * - Test = آخر 40%
 * - لا تداخل بينهما
 * 
 * @param historicalData - بيانات يومية مرتّبة زمنياً
 * @param trainPct - نسبة التدريب (0.6 = 60%)
 */
export function splitTrainTest(
  historicalData: any[],
  trainPct: number = 0.6
): { train: any[]; test: any[] } {
  if (!historicalData || historicalData.length < 60) {
    return { train: historicalData, test: [] };
  }
  
  const splitIdx = Math.floor(historicalData.length * trainPct);
  
  return {
    train: historicalData.slice(0, splitIdx),
    test: historicalData.slice(splitIdx),
  };
}

// ════════════════════════════════════════════════════════════
//  OVERFITTING DETECTION
// ════════════════════════════════════════════════════════════

/**
 * كشف overfitting بمقارنة Train vs Test
 * 
 * المنطق:
 * - إن fitness Train >> Test → overfitting شديد
 * - إن fitness Train ≈ Test → عام جيّدا
 * - إن fitness Test > Train → "lucky" (ممكن)
 * 
 * @returns 0 (لا overfitting) - 1 (شديد)
 */
export function calcOverfittingScore(
  trainFitness: number,
  testFitness: number
): number {
  // إن كلاهما سلبيّ، لا قياس مفيد
  if (trainFitness <= 0 && testFitness <= 0) {
    return 0.5;
  }
  
  // إن train سلبيّ و test إيجابيّ، نجح ضدّ التوقّع
  if (trainFitness <= 0 && testFitness > 0) {
    return 0;
  }
  
  // إن train إيجابيّ و test سلبيّ، overfitting شديد
  if (trainFitness > 0 && testFitness <= 0) {
    return 1.0;
  }
  
  // كلاهما إيجابيّ: قياس النسبة
  const ratio = testFitness / trainFitness;
  
  if (ratio >= 0.8) return 0;        // ممتاز
  if (ratio >= 0.5) return 0.3;      // مقبول
  if (ratio >= 0.3) return 0.6;      // ضعيف
  return 0.9;                         // overfitting شديد
}

/**
 * هل الاستراتيجية تجتاز اختبار Out-of-Sample؟
 */
export function passesOutOfSampleTest(
  trainFitness: FitnessResult,
  testFitness: FitnessResult,
  minTestFitness: number = 0.05
): boolean {
  // ① إن كل النظام خاسر في Train: نقبل "الأقلّ خسارة"
  const trainIsLosing = trainFitness.fitness < 0;
  
  if (trainIsLosing) {
    // الأهمّ: Test يجب أن يكون أفضل من Train (دلالة على التعلّم)
    if (testFitness.fitness < trainFitness.fitness) {
      return false;  // الاستراتيجية لم تتعلّم
    }
    
    // overfitting score غير مفيد في هذه الحالة، نتجاوزه
    
    // Test يجب أن يكون قريباً من الصفر أو إيجابيّاً (نسمح حتى -0.10)
    if (testFitness.fitness < -0.10) return false;
    
    // CAGR في Test لا يقلّ كثيراً (نسمح بـ -15% كحدّ أدنى)
    if (testFitness.metrics.cagr < -15) return false;
    
    return true;  // نقبل كأفضل خيار متاح
  }
  
  // الوضع العاديّ (Train إيجابيّ):
  if (testFitness.fitness < minTestFitness) return false;
  
  const overfitting = calcOverfittingScore(trainFitness.fitness, testFitness.fitness);
  if (overfitting > 0.7) return false;
  
  if (testFitness.metrics.cagr < 0) return false;
  
  return true;
}

// ════════════════════════════════════════════════════════════
//  MAIN LAB ENGINE
// ════════════════════════════════════════════════════════════

/**
 * 🧪 تشغيل Strategy Lab الكامل
 * 
 * هذه هي الدالة الرئيسية. تقوم بـ:
 * 1. تقسيم البيانات (Train/Test)
 * 2. تشغيل Genetic Algorithm على Train
 * 3. اختبار Top 3 على Test
 * 4. إرجاع الفائز
 * 
 * @param config - إعدادات Lab
 * @param historicalData - البيانات التاريخية الكاملة
 * @param runBacktest - دالة باك-تيست (تُمرَّر من خارج)
 * @param onProgress - دالة تحديث التقدّم (للـ UI)
 */
export async function runStrategyLab(
  config: LabConfig,
  historicalData: any[],
  runBacktest: BacktestFunction,
  onProgress?: (progress: LabProgress) => void,
  anchorWeights?: any
): Promise<LabResult> {
  const startedAt = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalBacktests = 0;
  let totalErrors = 0;
  
  // ───────────────────────────────────────
  // ① التحقّق من المدخلات
  // ───────────────────────────────────────
  if (!historicalData || historicalData.length < 100) {
    return createFailedResult(config, startedAt, [
      'بيانات غير كافية: يتطلّب 100 يوم على الأقلّ'
    ]);
  }
  
  // ───────────────────────────────────────
  // ② تقسيم Train/Test
  // ───────────────────────────────────────
  const { train, test } = splitTrainTest(historicalData, config.trainPct);
  
  if (train.length < 60 || test.length < 30) {
    return createFailedResult(config, startedAt, [
      `Train/Test split فشل: train=${train.length}, test=${test.length}`
    ]);
  }
  
  // إخطار التقدّم
  emitProgress(onProgress, {
    phase: 'preparing',
    currentGeneration: 0,
    totalGenerations: config.generations,
    currentStrategy: 0,
    strategiesInGeneration: config.populationSize,
    bestFitnessSoFar: 0,
    bestStrategyId: null,
    overallPct: 1,
    message: `تجهيز: Train=${train.length} يوم, Test=${test.length} يوم`,
    completedBacktests: 0,
    totalBacktests: config.generations * config.populationSize + 3,
    errors: 0,
    elapsedMs: Date.now() - startedAt,
    estimatedRemainingMs: 0,
  });
  
  // ───────────────────────────────────────
  // ③ التطوّر عبر الأجيال على Train
  // ───────────────────────────────────────
  const trainResults: GenerationResult[] = [];
  let currentPopulation: Strategy[] = [];
  let bestFitness = -Infinity;
  let bestStrategyId: string | null = null;
  
  const totalExpectedBacktests = config.generations * config.populationSize + 3;
  
  for (let gen = 0; gen < config.generations; gen++) {
    const genStart = Date.now();
    
    // ① توليد الجيل
        try {
    if (gen === 0) {
      currentPopulation = generatePopulation(config.targetType, config.populationSize, 0, anchorWeights);
    } else {
      currentPopulation = createNextGeneration(
        currentPopulation,
        config.populationSize,
        gen,
        config.mutationRate
      );
    }
    
    let genErrors = 0;
    
    // ② اختبار كل استراتيجية
    for (let i = 0; i < currentPopulation.length; i++) {
      const strategy = currentPopulation[i];
      
      // تحديث progress
      emitProgress(onProgress, {
        phase: 'training',
        currentGeneration: gen,
        totalGenerations: config.generations,
        currentStrategy: i + 1,
        strategiesInGeneration: currentPopulation.length,
        bestFitnessSoFar: bestFitness > -Infinity ? bestFitness : 0,
        bestStrategyId,
        overallPct: Math.round((totalBacktests / totalExpectedBacktests) * 100),
        message: `جيل ${gen + 1}/${config.generations} - استراتيجية ${i + 1}/${currentPopulation.length}`,
        completedBacktests: totalBacktests,
        totalBacktests: totalExpectedBacktests,
        errors: totalErrors,
        elapsedMs: Date.now() - startedAt,
        estimatedRemainingMs: estimateRemainingTime(
          totalBacktests,
          totalExpectedBacktests,
          Date.now() - startedAt
        ),
      });
      
      // تشغيل الباك-تيست
      try {
        const metrics = await runBacktest(strategy, train);
        totalBacktests++;
        
        if (!metrics) {
          genErrors++;
          totalErrors++;
          strategy.fitness = -999;
          continue;
        }
        
        // التحقّق من عدد الصفقات
        if ((metrics.closedTrades || 0) < config.minTradesRequired) {
          strategy.fitness = -100 - ((metrics.closedTrades || 0) / 100);  // عقوبة + ترتيب
          continue;
        }
        
        // حساب fitness
        const fitnessResult = calculateFitness(metrics);
        strategy.fitness = fitnessResult.fitness;
        strategy.backtestResult = {
          fitness: fitnessResult,
          metrics: fitnessResult.metrics,
        };
        
        // تحديث الأفضل
        if (fitnessResult.fitness > bestFitness) {
          bestFitness = fitnessResult.fitness;
          bestStrategyId = strategy.id;
        }
        
      } catch (err: any) {
        genErrors++;
        totalErrors++;
        strategy.fitness = -999;
        errors.push(`Gen ${gen} Strategy ${i}: ${err.message || 'Unknown error'}`);
        
        if (config.abortOnError) {
          return createFailedResult(config, startedAt, errors);
        }
      }
    }
    
    // ③ تسجيل إحصاءات الجيل
    const genStats = getGenerationStats(currentPopulation);
    const best = [...currentPopulation]
      .filter(s => s.fitness !== undefined && s.fitness > -100)
      .sort((a, b) => (b.fitness || 0) - (a.fitness || 0))[0] || null;
    
    trainResults.push({
      generation: gen,
      population: currentPopulation,
      best,
      stats: genStats,
      errors: genErrors,
      durationMs: Date.now() - genStart,
    });
    
    } catch (outerErr: any) {
      // 🐛 خطأ خارجيّ في الجيل
      totalErrors++;
      errors.push(`OUTER Gen ${gen}: ${outerErr.message || 'unknown'} | stack: ${(outerErr.stack || '').slice(0, 200)}`);
    }
  }
  
  // ───────────────────────────────────────
  // ④ اختيار أفضل 3 من Train
  // ───────────────────────────────────────
  const allTrained = trainResults
    .flatMap(g => g.population)
    .filter(s => s.fitness !== undefined && s.fitness > -100);
  
  const top3 = rankByFitness(allTrained).slice(0, 3);
  
  if (top3.length === 0) {
    // 🆕 احفظ كل الأخطاء التفصيلية + الإحصاءات للتشخيص
    const allErrors = ['لا توجد استراتيجيات صالحة بعد التدريب'];
    
    // إحصاء fitness الاستراتيجيات
    const allWithFitness = trainResults.flatMap(g => g.population).filter(s => s.fitness !== undefined);
    const aboveMinus100 = allWithFitness.filter(s => (s.fitness || -999) > -100).length;
    const aboveMinus50 = allWithFitness.filter(s => (s.fitness || -999) > -50).length;
    const above0 = allWithFitness.filter(s => (s.fitness || -999) > 0).length;
    
    allErrors.push(`📊 الباك-تيستات الناجحة: ${totalBacktests}`);
    allErrors.push(`📊 الاستراتيجيات المُختبرة: ${allWithFitness.length}`);
    allErrors.push(`📊 fitness > -100: ${aboveMinus100}`);
    allErrors.push(`📊 fitness > -50: ${aboveMinus50}`);
    allErrors.push(`📊 fitness > 0: ${above0}`);
    
    if (errors.length > 0) {
      allErrors.push(`⚠ أخطاء فعلية: ${errors.length}`);
      errors.slice(0, 3).forEach(e => allErrors.push(e));
    }
    
    return createFailedResult(config, startedAt, allErrors, totalBacktests, trainResults);
  }
  
  // ───────────────────────────────────────
  // ⑤ اختبار Out-of-Sample على Test
  // ───────────────────────────────────────
  emitProgress(onProgress, {
    phase: 'validating',
    currentGeneration: config.generations,
    totalGenerations: config.generations,
    currentStrategy: 0,
    strategiesInGeneration: 3,
    bestFitnessSoFar: bestFitness,
    bestStrategyId,
    overallPct: 95,
    message: 'اختبار Out-of-Sample على بيانات لم تُرَ من قبل...',
    completedBacktests: totalBacktests,
    totalBacktests: totalExpectedBacktests,
    errors: totalErrors,
    elapsedMs: Date.now() - startedAt,
    estimatedRemainingMs: 0,
  });
  
  const testResults: LabResult['testResults'] = [];
  
  for (let i = 0; i < top3.length; i++) {
    const strategy = top3[i];
    
    try {
      const testMetrics = await runBacktest(strategy, test);
      totalBacktests++;
      
      if (!testMetrics) {
        testResults.push({
          strategy,
          trainFitness: strategy.backtestResult.fitness,
          testFitness: calculateFitness({}),
          passed: false,
          overfittingScore: 1.0,
        });
        continue;
      }
      
      const testFitness = calculateFitness(testMetrics);
      const trainFitness = strategy.backtestResult.fitness;
      
      const overfittingScore = calcOverfittingScore(
        trainFitness.fitness,
        testFitness.fitness
      );
      
      const passed = passesOutOfSampleTest(trainFitness, testFitness);
      
      testResults.push({
        strategy,
        trainFitness,
        testFitness,
        passed,
        overfittingScore,
      });
      
    } catch (err: any) {
      totalErrors++;
      errors.push(`Test ${i}: ${err.message || 'Unknown error'}`);
    }
  }
  
  // ───────────────────────────────────────
  // ⑥ اختيار الفائز النهائيّ
  // ───────────────────────────────────────
  const passedStrategies = testResults.filter(t => t.passed);
  
  // الفائز = أعلى Test Fitness من الذين نجحوا
  let winner: Strategy | null = null;
  let winnerFitness: FitnessResult | null = null;
  
  if (passedStrategies.length > 0) {
    const winnerTest = passedStrategies.sort(
      (a, b) => b.testFitness.fitness - a.testFitness.fitness
    )[0];
    winner = winnerTest.strategy;
    winnerFitness = winnerTest.testFitness;
  } else {
    warnings.push('⚠ لم تنجح أيّ استراتيجية في اختبار Out-of-Sample. النظام يحتاج تعديلاً أو فترة بيانات أطول.');
  }
  
  // ───────────────────────────────────────
  // ⑦ النتيجة النهائية
  // ───────────────────────────────────────
  const finishedAt = Date.now();
  
  emitProgress(onProgress, {
    phase: 'completed',
    currentGeneration: config.generations,
    totalGenerations: config.generations,
    currentStrategy: top3.length,
    strategiesInGeneration: top3.length,
    bestFitnessSoFar: winnerFitness?.fitness || 0,
    bestStrategyId: winner?.id || null,
    overallPct: 100,
    message: winner
      ? `✅ اكتمل! الفائز: ${winner.id} (Fitness ${winnerFitness!.fitness.toFixed(3)})`
      : '⚠ اكتمل لكن لم يُوجد فائز يجتاز Out-of-Sample',
    completedBacktests: totalBacktests,
    totalBacktests: totalExpectedBacktests,
    errors: totalErrors,
    elapsedMs: finishedAt - startedAt,
    estimatedRemainingMs: 0,
  });
  
  return {
    success: true,
    config,
    trainResults,
    testResults,
    winner,
    winnerFitness,
    totalBacktests,
    totalErrors,
    totalDurationMs: finishedAt - startedAt,
    startedAt,
    finishedAt,
    errors,
    warnings,
  };
}

// ════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════

/**
 * إخطار التقدّم (آمن -- يلتقط الأخطاء)
 */
function emitProgress(
  callback: ((p: LabProgress) => void) | undefined,
  progress: LabProgress
): void {
  if (!callback) return;
  try {
    callback(progress);
  } catch (e) {
    // فشل صامت -- لا نريد كسر العملية بسبب UI bug
  }
}

/**
 * تقدير الوقت المتبقّي
 */
function estimateRemainingTime(
  completed: number,
  total: number,
  elapsedMs: number
): number {
  if (completed === 0) return 0;
  const avgMs = elapsedMs / completed;
  const remaining = total - completed;
  return Math.round(avgMs * remaining);
}

/**
 * إنشاء نتيجة فاشلة
 */
function createFailedResult(
  config: LabConfig,
  startedAt: number,
  errors: string[],
  totalBacktests: number = 0,
  trainResults: GenerationResult[] = []
): LabResult {
  return {
    success: false,
    config,
    trainResults,
    testResults: [],
    winner: null,
    winnerFitness: null,
    totalBacktests,
    totalErrors: errors.length,
    totalDurationMs: Date.now() - startedAt,
    startedAt,
    finishedAt: Date.now(),
    errors,
    warnings: [],
  };
}

// ════════════════════════════════════════════════════════════
//  REPORT GENERATION
// ════════════════════════════════════════════════════════════

/**
 * توليد تقرير نصّيّ من نتائج Lab
 */
export function generateLabReport(result: LabResult): string {
  const lines: string[] = [];
  
  lines.push('═══════════════════════════════════════');
  lines.push('📊 تقرير Strategy Lab');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  
  lines.push(`الفئة: ${result.config.targetType}`);
  lines.push(`الوضع: ${result.config.mode}`);
  lines.push(`المدّة: ${(result.totalDurationMs / 60000).toFixed(1)} دقيقة`);
  lines.push(`الباك-تيستات: ${result.totalBacktests}`);
  lines.push(`الأخطاء: ${result.totalErrors}`);
  lines.push('');
  
  if (result.winner && result.winnerFitness) {
    lines.push('🏆 الفائز النهائي:');
    lines.push(`   ID: ${result.winner.id}`);
    lines.push(`   Tier: ${result.winnerFitness.tier} ${result.winnerFitness.tierIcon}`);
    lines.push(`   Test Fitness: ${result.winnerFitness.fitness.toFixed(3)}`);
    lines.push(`   CAGR: ${result.winnerFitness.metrics.cagr.toFixed(1)}%`);
    lines.push(`   Alpha: ${result.winnerFitness.metrics.alpha.toFixed(1)}%`);
    lines.push(`   Win Rate: ${result.winnerFitness.metrics.winRate.toFixed(1)}%`);
    lines.push(`   Max DD: ${result.winnerFitness.metrics.maxDD.toFixed(1)}%`);
  } else {
    lines.push('❌ لا يوجد فائز يجتاز Out-of-Sample');
  }
  
  lines.push('');
  lines.push('تطور الأجيال:');
  result.trainResults.forEach(gen => {
    lines.push(`   Gen ${gen.generation}: max=${gen.stats.maxFitness.toFixed(3)}, avg=${gen.stats.avgFitness.toFixed(3)}, errors=${gen.errors}`);
  });
  
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('التحذيرات:');
    result.warnings.forEach(w => lines.push(`   ${w}`));
  }
  
  return lines.join('\n');
}

/**
 * استخراج Top N استراتيجيات من كل الأجيال
 */
export function getTopStrategies(result: LabResult, n: number = 5): Strategy[] {
  const all = result.trainResults
    .flatMap(g => g.population)
    .filter(s => s.fitness !== undefined && s.fitness > -100);
  
  return rankByFitness(all).slice(0, n);
}
