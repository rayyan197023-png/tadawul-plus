'use client';
/**
 * @module engines/strategyGenerator
 * @description مولّد الاستراتيجيات للـ Strategy Lab
 *
 * 🎯 الهدف:
 * توليد استراتيجيات عشوائية (genome) لكل فئة سهم.
 * تطبيق Genetic Algorithm: Generate, Crossover, Mutate.
 *
 * 📚 المصادر العلمية:
 * - Holland (1975): "Adaptation in Natural and Artificial Systems"
 * - Goldberg (1989): "Genetic Algorithms in Search, Optimization, and Machine Learning"
 * - DeJong (1975): "An Analysis of the Behavior of a Class of Genetic Adaptive Systems"
 *
 * 🧬 نطاقات المعاملات معايرة لكل فئة:
 * - Leader: stops ضيّقة، أهداف معتدلة، فترات طويلة
 * - Growth: متوسط الأطر الزمنية
 * - Speculative: متوسط بين leader و explosive
 * - Explosive: stops واسعة، أهداف كبيرة، فترات قصيرة
 * - Mid-Cap: نطاق معتدل وشامل
 *
 * @author تداول+
 * @version 1.0
 */

// ✨ نُقل من stockClassifier المحذوف -- التصنيف نفسه لم يكن مُستدعى من أي مكان
export type StockType = 'leader' | 'growth' | 'speculative' | 'explosive' | 'mid-cap' | 'excluded';


// ════════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════════

export interface StrategyWeights {
  L1: number;  // هيكل السوق
  L2: number;  // Effort/Result
  L3: number;  // Entropy
  L4: number;  // قوّة نسبية
  L5: number;  // مؤشرات تقنية
  L6: number;  // Kelly
  L7: number;  // Bayesian
  L8: number;  // Fundamentals
  L9: number;  // Smart Money
}

export interface StrategyParams {
  buyThreshold: number;       // عتبة الشراء (0-100)
  sellThreshold: number;      // عتبة البيع
  stopLossPct: number;        // 0.05 = 5%
  takeProfitPct: number;
  maxHoldDays: number;        // أقصى مدة احتفاظ
  maxPositions: number;       // عدد الصفقات المتزامنة
  maxPositionPct: number;     // حجم الصفقة الواحدة من المحفظة
}

export interface Strategy {
  id: string;                 // معرّف فريد
  targetType: StockType;      // الفئة المستهدفة
  generation: number;         // أيّ جيل (0 = الجيل الأوّل)
  parents: string[];          // معرّفات الأبوين (إن كان من تهجين)
  
  weights: StrategyWeights;
  params: StrategyParams;
  
  // يُعبّأ بعد الاختبار
  fitness?: number;
  backtestResult?: any;
  createdAt: number;
}

// ════════════════════════════════════════════════════════════
//  CONFIG - نطاقات المعاملات لكل فئة
// ════════════════════════════════════════════════════════════

interface ParamRange {
  min: number;
  max: number;
}

interface TypeRanges {
  // أوزان الطبقات (لكل طبقة: [min, max])
  weights: Record<keyof StrategyWeights, ParamRange>;
  
  // معاملات الاستراتيجية
  buyThreshold: ParamRange;
  sellThreshold: ParamRange;
  stopLossPct: ParamRange;
  takeProfitPct: ParamRange;
  maxHoldDays: ParamRange;
  maxPositions: ParamRange;
  maxPositionPct: ParamRange;
}

/**
 * 🏛 Leader - قياديّة
 * - حركة بطيئة → stops ضيّقة + أهداف معتدلة + فترات طويلة
 */
const LEADER_RANGES: TypeRanges = {
  weights: {
    L1: { min: 0.15, max: 0.25 },
    L2: { min: 0.02, max: 0.08 },
    L3: { min: 0.01, max: 0.05 },
    L4: { min: 0.10, max: 0.20 },
    L5: { min: 0.10, max: 0.20 },
    L6: { min: 0.03, max: 0.10 },
    L7: { min: 0.03, max: 0.10 },
    L8: { min: 0.10, max: 0.20 },
    L9: { min: 0.10, max: 0.20 },
  },
  buyThreshold: { min: 55, max: 80 },       // وُسّع -- 72 أثبت تفوّقاً
  sellThreshold: { min: 20, max: 48 },      // وُسّع -- 28 أثبت تفوّقاً
  stopLossPct: { min: 0.05, max: 0.18 },    // وُسّع -- 0.13 أثبت تفوّقاً
  takeProfitPct: { min: 0.10, max: 0.40 },
  maxHoldDays: { min: 30, max: 400 },       // وُسّع -- 365 أثبت تفوّقاً
  maxPositions: { min: 5, max: 10 },
  maxPositionPct: { min: 0.08, max: 0.22 }, // وُسّع -- 0.20 أثبت تفوّقاً
};

/**
 * 🌱 Growth - نمو
 * - متوسط الأطر الزمنية
 * - اهتمام بالمؤشرات والـ Fundamentals
 */
const GROWTH_RANGES: TypeRanges = {
  weights: {
    L1: { min: 0.12, max: 0.22 },
    L2: { min: 0.03, max: 0.08 },
    L3: { min: 0.02, max: 0.06 },
    L4: { min: 0.12, max: 0.22 },
    L5: { min: 0.10, max: 0.20 },
    L6: { min: 0.04, max: 0.10 },
    L7: { min: 0.04, max: 0.10 },
    L8: { min: 0.08, max: 0.18 },
    L9: { min: 0.10, max: 0.20 },
  },
    buyThreshold: { min: 52, max: 68 },   // 🆕
  sellThreshold: { min: 38, max: 50 },
  stopLossPct: { min: 0.08, max: 0.15 },
  takeProfitPct: { min: 0.20, max: 0.50 },
  maxHoldDays: { min: 20, max: 120 },   // 🆕
  maxPositions: { min: 4, max: 8 },
  maxPositionPct: { min: 0.10, max: 0.18 },
};

/**
 * ⚡ Speculative - مضاربي
 * - تذبذب عالٍ → أطر متوسطة
 * - اهتمام بالسيولة والمومنتم
 */
const SPECULATIVE_RANGES: TypeRanges = {
  weights: {
    L1: { min: 0.10, max: 0.20 },
    L2: { min: 0.05, max: 0.12 },   // Effort/Result مهمّ
    L3: { min: 0.02, max: 0.06 },
    L4: { min: 0.10, max: 0.20 },
    L5: { min: 0.12, max: 0.22 },   // مؤشرات تقنية مهمّة
    L6: { min: 0.04, max: 0.10 },
    L7: { min: 0.04, max: 0.10 },
    L8: { min: 0.05, max: 0.12 },
    L9: { min: 0.15, max: 0.25 },   // السيولة الأهمّ
  },
  buyThreshold: { min: 50, max: 65 },   // 🆕
  sellThreshold: { min: 40, max: 52 },
  stopLossPct: { min: 0.08, max: 0.15 },
  takeProfitPct: { min: 0.15, max: 0.40 },
  maxHoldDays: { min: 10, max: 60 },    // 🆕
  maxPositions: { min: 4, max: 10 },
  maxPositionPct: { min: 0.08, max: 0.15 },
};

/**
 * 🚀 Explosive - انفجاري
 * - تذبذب عنيف → stops واسعة + أهداف كبيرة + فترات قصيرة
 */
const EXPLOSIVE_RANGES: TypeRanges = {
  weights: {
    L1: { min: 0.10, max: 0.20 },
    L2: { min: 0.05, max: 0.12 },
    L3: { min: 0.02, max: 0.08 },
    L4: { min: 0.05, max: 0.15 },
    L5: { min: 0.10, max: 0.20 },
    L6: { min: 0.03, max: 0.08 },
    L7: { min: 0.05, max: 0.12 },
    L8: { min: 0.02, max: 0.08 },   // Fundamentals أقلّ أهمية
    L9: { min: 0.20, max: 0.35 },   // السيولة كل شيء
  },
  buyThreshold: { min: 48, max: 65 },   // 🆕
  sellThreshold: { min: 42, max: 55 },
  stopLossPct: { min: 0.12, max: 0.25 },
  takeProfitPct: { min: 0.30, max: 0.80 },
  maxHoldDays: { min: 7, max: 45 },     // 🆕
  maxPositions: { min: 3, max: 8 },
  maxPositionPct: { min: 0.05, max: 0.12 },
};

/**
 * ⚖️ Mid-Cap - متوسط
 * - نطاق معتدل وشامل
 */
const MIDCAP_RANGES: TypeRanges = {
  weights: {
    L1: { min: 0.12, max: 0.22 },
    L2: { min: 0.03, max: 0.10 },
    L3: { min: 0.02, max: 0.06 },
    L4: { min: 0.10, max: 0.20 },
    L5: { min: 0.10, max: 0.20 },
    L6: { min: 0.04, max: 0.10 },
    L7: { min: 0.04, max: 0.10 },
    L8: { min: 0.06, max: 0.15 },
    L9: { min: 0.12, max: 0.22 },
  },
  buyThreshold: { min: 52, max: 68 },   // 🆕
  sellThreshold: { min: 38, max: 50 },
  stopLossPct: { min: 0.07, max: 0.13 },
  takeProfitPct: { min: 0.15, max: 0.35 },
  maxHoldDays: { min: 15, max: 100 },   // 🆕
  maxPositions: { min: 4, max: 10 },
  maxPositionPct: { min: 0.08, max: 0.15 },
};

/**
 * خريطة الفئة → النطاقات
 */
const TYPE_RANGES: Record<Exclude<StockType, 'excluded'>, TypeRanges> = {
  leader: LEADER_RANGES,
  growth: GROWTH_RANGES,
  speculative: SPECULATIVE_RANGES,
  explosive: EXPLOSIVE_RANGES,
  'mid-cap': MIDCAP_RANGES,
};

// ════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════
// ✨ مولّد عشوائي ببذرة ثابتة (LCG -- Knuth)
//    الهدف: جعل المختبر قابلاً للتكرار -- نفس البذرة تُنتج نفس الأجيال
let _labSeed = 987654321;

export function setLabSeed(seed: number): void {
  _labSeed = (typeof seed === 'number' && seed > 0) ? Math.floor(seed) : 987654321;
}

function _rnd(): number {
  // ✨ عشوائية حقيقية -- المختبر أداة استكشاف، وكل جولة تبحث في مسار جديد
  return Math.random();
}

/**
 * توليد رقم عشوائي بين min و max
 */
function randomInRange(range: ParamRange): number {
  return range.min + _rnd() * (range.max - range.min);
}

/**
 * توليد عدد صحيح عشوائي
 */
function randomIntInRange(range: ParamRange): number {
  // ✨ +1 ليشمل الحد الأقصى -- Math.floor وحده يجعله غير قابل للبلوغ أبداً
  return Math.floor(range.min + _rnd() * (range.max - range.min + 1));
}

/**
 * توليد معرّف فريد للاستراتيجية
 */
function generateId(): string {
  const ts = Date.now().toString(36);
  const rnd = _rnd().toString(36).substring(2, 8);
  return `s_${ts}_${rnd}`;
}

/**
 * تطبيع الأوزان لتجميعها = 1.00
 * 
 * مهمّ علمياً: يجب أن يكون مجموع الأوزان = 100% دائماً.
 */
export function normalizeWeights(weights: StrategyWeights): StrategyWeights {
  const sum = 
    weights.L1 + weights.L2 + weights.L3 +
    weights.L4 + weights.L5 + weights.L6 +
    weights.L7 + weights.L8 + weights.L9;
  
  if (sum <= 0) {
    // fallback: توزيع متساوٍ
    return {
      L1: 0.111, L2: 0.111, L3: 0.111,
      L4: 0.111, L5: 0.111, L6: 0.111,
      L7: 0.111, L8: 0.111, L9: 0.112,
    };
  }
  
  return {
    L1: +(weights.L1 / sum).toFixed(4),
    L2: +(weights.L2 / sum).toFixed(4),
    L3: +(weights.L3 / sum).toFixed(4),
    L4: +(weights.L4 / sum).toFixed(4),
    L5: +(weights.L5 / sum).toFixed(4),
    L6: +(weights.L6 / sum).toFixed(4),
    L7: +(weights.L7 / sum).toFixed(4),
    L8: +(weights.L8 / sum).toFixed(4),
    L9: +(weights.L9 / sum).toFixed(4),
  };
}

// ════════════════════════════════════════════════════════════
//  GENETIC OPERATIONS
// ════════════════════════════════════════════════════════════

/**
 * 🧬 توليد استراتيجية عشوائية جديدة
 * 
 * @param targetType - الفئة المستهدفة
 * @param generation - رقم الجيل (افتراضي 0)
 * @returns استراتيجية جديدة
 */
export function generateRandomStrategy(
  targetType: Exclude<StockType, 'excluded'>,
  generation: number = 0,
  anchorWeights?: StrategyWeights
): Strategy {
  const ranges = TYPE_RANGES[targetType];
  
  // 🆕 30% احتمال للبدء من Anchor (مع طفرة ±25%)
  const useAnchor = anchorWeights && _rnd() < 0.30;
  
  let rawWeights: StrategyWeights;
  
  if (useAnchor && anchorWeights) {
    // طفرة الـ Anchor بنسبة ±25% لكل وزن
    rawWeights = {
      L1: anchorWeights.L1 * (1 + (_rnd() - 0.5) * 0.5),
      L2: anchorWeights.L2 * (1 + (_rnd() - 0.5) * 0.5),
      L3: anchorWeights.L3 * (1 + (_rnd() - 0.5) * 0.5),
      L4: anchorWeights.L4 * (1 + (_rnd() - 0.5) * 0.5),
      L5: anchorWeights.L5 * (1 + (_rnd() - 0.5) * 0.5),
      L6: anchorWeights.L6 * (1 + (_rnd() - 0.5) * 0.5),
      L7: anchorWeights.L7 * (1 + (_rnd() - 0.5) * 0.5),
      L8: anchorWeights.L8 * (1 + (_rnd() - 0.5) * 0.5),
      L9: anchorWeights.L9 * (1 + (_rnd() - 0.5) * 0.5),
    };
    
    // التأكّد من البقاء داخل النطاقات
    const keys: (keyof StrategyWeights)[] = ['L1','L2','L3','L4','L5','L6','L7','L8','L9'];
    keys.forEach(k => {
      const range = ranges.weights[k];
      rawWeights[k] = Math.max(range.min, Math.min(range.max, rawWeights[k]));
    });
  } else {
    // ① توليد أوزان عشوائية (السلوك الأصلي)
    rawWeights = {
      L1: randomInRange(ranges.weights.L1),
      L2: randomInRange(ranges.weights.L2),
      L3: randomInRange(ranges.weights.L3),
      L4: randomInRange(ranges.weights.L4),
      L5: randomInRange(ranges.weights.L5),
      L6: randomInRange(ranges.weights.L6),
      L7: randomInRange(ranges.weights.L7),
      L8: randomInRange(ranges.weights.L8),
      L9: randomInRange(ranges.weights.L9),
    };
  }
  
  // ② تطبيع الأوزان
  const weights = normalizeWeights(rawWeights);
  
  // ③ توليد المعاملات
  const params: StrategyParams = {
    buyThreshold: +randomInRange(ranges.buyThreshold).toFixed(1),
    sellThreshold: +randomInRange(ranges.sellThreshold).toFixed(1),
    stopLossPct: +randomInRange(ranges.stopLossPct).toFixed(3),
    takeProfitPct: +randomInRange(ranges.takeProfitPct).toFixed(3),
    maxHoldDays: randomIntInRange(ranges.maxHoldDays),
    maxPositions: randomIntInRange(ranges.maxPositions),
    maxPositionPct: +randomInRange(ranges.maxPositionPct).toFixed(3),
  };
  
  return {
    id: generateId(),
    targetType,
    generation,
    parents: [],
    weights,
    params,
    createdAt: Date.now(),
  };
}

/**
 * 🧬 توليد جيل كامل من الاستراتيجيات
 * 
 * @param targetType - الفئة المستهدفة
 * @param count - عدد الاستراتيجيات
 * @param generation - رقم الجيل
 */
export function generatePopulation(
  targetType: Exclude<StockType, 'excluded'>,
  count: number = 20,
  generation: number = 0,
  anchorWeights?: StrategyWeights
): Strategy[] {
  const population: Strategy[] = [];
  for (let i = 0; i < count; i++) {
    population.push(generateRandomStrategy(targetType, generation, anchorWeights));
  }
  return population;
}

/**
 * 🧬 تهجين استراتيجيتين (Crossover)
 * 
 * يستخدم Single-Point Crossover (Holland 1975):
 * - يختار نقطة قطع عشوائية في الأوزان.
 * - النصف الأوّل من الأب 1، الثاني من الأب 2.
 * - المعاملات: متوسط الأبوين مع عشوائية بسيطة.
 * 
 * @param parent1 - الأب الأوّل
 * @param parent2 - الأب الثاني
 * @param generation - الجيل الجديد
 * @returns طفل (استراتيجية جديدة)
 */
export function crossover(
  parent1: Strategy,
  parent2: Strategy,
  generation: number
): Strategy {
  // يجب أن يكونا من نفس الفئة
  if (parent1.targetType !== parent2.targetType) {
    throw new Error('Crossover requires parents of same type');
  }
  
  // ① Single-Point Crossover للأوزان
  const weightKeys: (keyof StrategyWeights)[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'];
  const cutPoint = Math.floor(_rnd() * weightKeys.length);
  
  const childWeights: any = {};
  weightKeys.forEach((key, idx) => {
    if (idx < cutPoint) {
      childWeights[key] = parent1.weights[key];
    } else {
      childWeights[key] = parent2.weights[key];
    }
  });
  
  const weights = normalizeWeights(childWeights);
    // ✨ نطاقات الفئة -- لتقييد المعاملات بعد التهجين
  const _r = TYPE_RANGES[parent1.targetType as Exclude<StockType, 'excluded'>];
  const _clampR = function(v: number, rg: ParamRange): number {
    return Math.max(rg.min, Math.min(rg.max, v));
  };
  
  // ② Crossover للمعاملات (متوسط مع عشوائية ±10%)
  const params: StrategyParams = {
    buyThreshold: +_clampR(
      (parent1.params.buyThreshold + parent2.params.buyThreshold) / 2 * (1 + (_rnd() - 0.5) * 0.1),
      _r.buyThreshold
    ).toFixed(1),
    sellThreshold: +_clampR(
      (parent1.params.sellThreshold + parent2.params.sellThreshold) / 2 * (1 + (_rnd() - 0.5) * 0.1),
      _r.sellThreshold
    ).toFixed(1),
    stopLossPct: +_clampR(
      (parent1.params.stopLossPct + parent2.params.stopLossPct) / 2,
      _r.stopLossPct
    ).toFixed(3),
    takeProfitPct: +_clampR(
      (parent1.params.takeProfitPct + parent2.params.takeProfitPct) / 2,
      _r.takeProfitPct
    ).toFixed(3),
    maxHoldDays: Math.round(_clampR(
      (parent1.params.maxHoldDays + parent2.params.maxHoldDays) / 2,
      _r.maxHoldDays
    )),
    maxPositions: Math.round(_clampR(
      (parent1.params.maxPositions + parent2.params.maxPositions) / 2,
      _r.maxPositions
    )),
    maxPositionPct: +_clampR(
      (parent1.params.maxPositionPct + parent2.params.maxPositionPct) / 2,
      _r.maxPositionPct
    ).toFixed(3),
  };

  
  return {
    id: generateId(),
    targetType: parent1.targetType,
    generation,
    parents: [parent1.id, parent2.id],
    weights,
    params,
    createdAt: Date.now(),
  };
}

/**
 * 🧬 طفرة (Mutation)
 * 
 * تطبيق طفرة عشوائية على استراتيجية:
 * - كل معامل له احتمال `mutationRate` للتغيّر.
 * - التغيّر بنسبة ±20% من القيمة الحالية.
 * 
 * @param strategy - الاستراتيجية الأصلية
 * @param mutationRate - احتمال تغيّر كل معامل (افتراضي 10%)
 * @returns استراتيجية جديدة مع طفرات
 */
export function mutate(
  strategy: Strategy,
  mutationRate: number = 0.10
): Strategy {
  const ranges = TYPE_RANGES[strategy.targetType as Exclude<StockType, 'excluded'>];
  
  // ① طفرة الأوزان
  const mutatedWeights: any = { ...strategy.weights };
  const weightKeys: (keyof StrategyWeights)[] = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'];
  
  weightKeys.forEach(key => {
    if (_rnd() < mutationRate) {
      const current = strategy.weights[key];
      const delta = (_rnd() - 0.5) * 0.4 * current;  // ±20%
      let newValue = current + delta;
      
      // التأكّد من البقاء داخل النطاق
      const range = ranges.weights[key];
      newValue = Math.max(range.min, Math.min(range.max, newValue));
      
      mutatedWeights[key] = newValue;
    }
  });
  
  const weights = normalizeWeights(mutatedWeights);
  
  // ② طفرة المعاملات
  const mutatedParams: StrategyParams = { ...strategy.params };
  
  if (_rnd() < mutationRate) {
    mutatedParams.buyThreshold = +Math.max(
      ranges.buyThreshold.min,
      Math.min(ranges.buyThreshold.max, 
        strategy.params.buyThreshold * (1 + (_rnd() - 0.5) * 0.2)
      )
    ).toFixed(1);
  }
  
  if (_rnd() < mutationRate) {
    mutatedParams.sellThreshold = +Math.max(
      ranges.sellThreshold.min,
      Math.min(ranges.sellThreshold.max,
        strategy.params.sellThreshold * (1 + (_rnd() - 0.5) * 0.2)
      )
    ).toFixed(1);
  }
  
  if (_rnd() < mutationRate) {
    mutatedParams.stopLossPct = +Math.max(
      ranges.stopLossPct.min,
      Math.min(ranges.stopLossPct.max,
        strategy.params.stopLossPct * (1 + (_rnd() - 0.5) * 0.3)
      )
    ).toFixed(3);
  }
  
  if (_rnd() < mutationRate) {
    mutatedParams.takeProfitPct = +Math.max(
      ranges.takeProfitPct.min,
      Math.min(ranges.takeProfitPct.max,
        strategy.params.takeProfitPct * (1 + (_rnd() - 0.5) * 0.3)
      )
    ).toFixed(3);
  }
  
  if (_rnd() < mutationRate) {
    mutatedParams.maxHoldDays = Math.round(Math.max(
      ranges.maxHoldDays.min,
      Math.min(ranges.maxHoldDays.max,
        strategy.params.maxHoldDays * (1 + (_rnd() - 0.5) * 0.3)
      )
    ));
  }
  
  if (_rnd() < mutationRate) {
    mutatedParams.maxPositions = Math.round(Math.max(
      ranges.maxPositions.min,
      Math.min(ranges.maxPositions.max,
        strategy.params.maxPositions + (_rnd() < 0.5 ? -1 : 1)
      )
    ));
  }
  
  if (_rnd() < mutationRate) {
    mutatedParams.maxPositionPct = +Math.max(
      ranges.maxPositionPct.min,
      Math.min(ranges.maxPositionPct.max,
        strategy.params.maxPositionPct * (1 + (_rnd() - 0.5) * 0.2)
      )
    ).toFixed(3);
  }
  
  return {
    id: generateId(),
    targetType: strategy.targetType,
    generation: strategy.generation,
    parents: [strategy.id],   // الأصل
    weights,
    params: mutatedParams,
    createdAt: Date.now(),
  };
}

// ════════════════════════════════════════════════════════════
//  GENERATION HELPER - إنشاء جيل كامل (Elites + Offspring + Random)
// ════════════════════════════════════════════════════════════

/**
 * 🧬 إنشاء جيل جديد بناءً على الجيل السابق
 * 
 * التكوين:
 * - 20% Elites (نخبة الجيل السابق - تنتقل كما هي)
 * - 60% Offspring (تهجين الأبوين من النخبة)
 * - 20% Random (عشوائيين جدد لمنع التركّز)
 * 
 * @param previousGeneration - الاستراتيجيات السابقة مع fitness
 * @param populationSize - حجم الجيل الجديد
 * @param newGenerationNumber - رقم الجيل الجديد
 * @param mutationRate - احتمال الطفرة
 */
export function createNextGeneration(
  previousGeneration: Strategy[],
  populationSize: number = 20,
  newGenerationNumber: number = 1,
  mutationRate: number = 0.10
): Strategy[] {
  // التحقّق من أنّ كل الاستراتيجيات تم اختبارها
  const tested = previousGeneration.filter(s => s.fitness !== undefined);
  if (tested.length === 0) {
    throw new Error('Cannot create next generation: no tested strategies');
  }
  
  const targetType = tested[0].targetType as Exclude<StockType, 'excluded'>;
  
  // ① ترتيب حسب fitness (الأعلى أوّلاً)
  const sorted = [...tested].sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
  
  // ② اختيار النخبة (top 20%)
  const eliteCount = Math.max(2, Math.round(populationSize * 0.20));
  const elites = sorted.slice(0, eliteCount);
  
  const newPopulation: Strategy[] = [];
  
  // ③ إضافة النخبة كما هي
  elites.forEach(elite => {
    newPopulation.push({
      ...elite,
      id: generateId(),
      generation: newGenerationNumber,
      parents: [elite.id],
      fitness: undefined,
      backtestResult: undefined,
    });
  });
  
  // ④ توليد Offspring (60%) من تهجين النخبة
  const offspringCount = Math.round(populationSize * 0.60);
  for (let i = 0; i < offspringCount; i++) {
    const p1 = elites[Math.floor(_rnd() * elites.length)];
    // ✨ نتجنّب التهجين مع النفس -- يُهدر فرصة استكشاف (نسخة لا طفل)
    let p2 = elites[Math.floor(_rnd() * elites.length)];
    if (elites.length > 1 && p2.id === p1.id) {
      const _alt = elites.filter(function(e) { return e.id !== p1.id; });
      p2 = _alt[Math.floor(_rnd() * _alt.length)];
    }
    
    let child = crossover(p1, p2, newGenerationNumber);
    
    // تطبيق طفرة باحتمال
    if (_rnd() < 0.5) {
      child = mutate(child, mutationRate);
    }
    
    newPopulation.push(child);
  }
  
  // ⑤ توليد Random (20%) للحفاظ على التنوّع
  const randomCount = populationSize - newPopulation.length;
  for (let i = 0; i < randomCount; i++) {
    newPopulation.push(generateRandomStrategy(targetType, newGenerationNumber));
  }
  
  return newPopulation;
}

// ════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════

/**
 * نسخ استراتيجية (deep clone)
 */
export function cloneStrategy(strategy: Strategy): Strategy {
  return {
    ...strategy,
    weights: { ...strategy.weights },
    params: { ...strategy.params },
    parents: [...strategy.parents],
  };
}

/**
 * مقارنة استراتيجيتين (للترتيب حسب fitness)
 */
export function compareByFitness(a: Strategy, b: Strategy): number {
  const fa = a.fitness ?? -Infinity;
  const fb = b.fitness ?? -Infinity;
  return fb - fa;  // ترتيب تنازلي
}

/**
 * إحصاءات جيل
 */
export function getGenerationStats(generation: Strategy[]): {
  count: number;
  testedCount: number;
  avgFitness: number;
  maxFitness: number;
  minFitness: number;
} {
  const tested = generation.filter(s => s.fitness !== undefined);
  
  if (tested.length === 0) {
    return {
      count: generation.length,
      testedCount: 0,
      avgFitness: 0,
      maxFitness: 0,
      minFitness: 0,
    };
  }
  
  const fitnesses = tested.map(s => s.fitness!);
  const sum = fitnesses.reduce((s, f) => s + f, 0);
  
  return {
    count: generation.length,
    testedCount: tested.length,
    avgFitness: +(sum / tested.length).toFixed(4),
    maxFitness: +Math.max(...fitnesses).toFixed(4),
    minFitness: +Math.min(...fitnesses).toFixed(4),
  };
}

// ════════════════════════════════════════════════════════════
//  TEST FUNCTION
// ════════════════════════════════════════════════════════════

/**
 * دالة اختبار شاملة
 */
export function testGenerator(): string {
  const lines: string[] = [];
  
  // اختبار 1: توليد استراتيجية قياديّة
  const leaderStrat = generateRandomStrategy('leader');
  lines.push(`✅ Leader strategy created:`);
  lines.push(`   ID: ${leaderStrat.id}`);
  lines.push(`   Weights L1=${leaderStrat.weights.L1.toFixed(3)}, L9=${leaderStrat.weights.L9.toFixed(3)}`);
  lines.push(`   buyThreshold=${leaderStrat.params.buyThreshold}, stopLoss=${(leaderStrat.params.stopLossPct * 100).toFixed(1)}%`);
  
  // اختبار 2: توليد استراتيجية انفجارية
  const explosiveStrat = generateRandomStrategy('explosive');
  lines.push(`\n✅ Explosive strategy created:`);
  lines.push(`   stopLoss=${(explosiveStrat.params.stopLossPct * 100).toFixed(1)}% (يجب أن يكون واسعاً)`);
  lines.push(`   takeProfit=${(explosiveStrat.params.takeProfitPct * 100).toFixed(1)}% (يجب أن يكون كبيراً)`);
  lines.push(`   maxHoldDays=${explosiveStrat.params.maxHoldDays} (يجب أن يكون قصيراً)`);
  
  // اختبار 3: التحقّق من تطبيع الأوزان
  const sum = Object.values(leaderStrat.weights).reduce((s, v) => s + v, 0);
  lines.push(`\n✅ Weights sum: ${sum.toFixed(4)} (يجب ≈ 1.000)`);
  
  // اختبار 4: Crossover
  const leader1 = generateRandomStrategy('leader');
  const leader2 = generateRandomStrategy('leader');
  const child = crossover(leader1, leader2, 1);
  lines.push(`\n✅ Crossover: parents=[${child.parents.join(', ')}]`);
  
  // اختبار 5: Mutation
  const mutated = mutate(leader1, 0.5);  // 50% للاختبار
  lines.push(`\n✅ Mutation: id=${mutated.id}, originalParent=${mutated.parents[0]}`);
  
  // اختبار 6: Population
  const pop = generatePopulation('leader', 5);
  lines.push(`\n✅ Population created: ${pop.length} strategies`);
  
  return lines.join('\n');
}
