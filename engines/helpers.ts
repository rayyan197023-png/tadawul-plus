/**
 * @module engines/helpers
 * @description دوال مساعدة صغيرة ومستقلة (تحويل الدرجة لكلمة وصفية، نتيجة فارغة آمنة)
 * (منقول من analysisEngine.ts كجزء من تقسيم الملف لموديولات)
 */

/**
 * ✨ نتيجة فارغة آمنة - عند فشل الفحوصات
 * تمنع crash في حالة bars فارغة أو stk غير صالح
 */
function _emptyHealthResult(){
  return {
    score: 50,
    grade: "D",
    sig: "محايد",
    sigC: "#06b6d4",
    regime: "chop",
    weights: {L1:0.11,L2:0.11,L3:0.11,L4:0.11,L5:0.11,L6:0.11,L7:0.11,L8:0.11,L9:0.12},
    probability: {bull: 33, bear: 33, neutral: 34},
    gates: {
      g1: false, g2: false, g3: false,
      passed: 0, all: false,
      g1s: 50, g2s: 50, g3s: 50,
      g1l: "بيانات غير كافية",
      g2l: "بيانات غير كافية",
      g3l: "بيانات غير كافية"
    },
    opp: {
      matrix: "بيانات غير كافية",
      color: "#6b7280",
      priority: 0,
      highLiq: false, highStr: false, highMom: false
    },
    layers: {L1:50,L2:50,L3:50,L4:50,L5:50,L6:50,L7:50,L8:50,L9:50,L10:50,L11:50},
    extras: {
      conflictCount: 0,
      conflictDetails: [] as any[],
      bayesMult: 1.0,
      vr: 1.0,
      kelly: 0,
      adxV: 25,
      adxBull: false,
      rsiV: 50,
      macdH: 0,
      mktBreadth: 0.5,
      mktMomentum: 0,
      gateMultiplier: 0.5,
      regimeData: {regime: "chop"},
      cmf: 0,
      obvRising: false,
      msLabel: "بيانات غير كافية",
      bosBull: false,
      obLabel: "لا منطقة شراء",
      inBullOB: false,
      sslLabel: "لا اصطياد",
      recoveredSSL: false,
      vwapDev: 0,
      belowB1: false,
      belowB2: false,
      macroEnv: "محايد",
      macroScore: 10,
      pricePos: 50,
      valScore: 50,
    },
    tasiCtx: null as any,
  };
}

/**
 * ✨ scoreWord - تحويل الدرجة الرقمية إلى كلمة وصفية
 */
function scoreWord(score: number): string {
  return score>=80?"ممتاز":score>=70?"قوي":score>=60?"جيد":score>=50?"متوسط":score>=40?"ضعيف":"ضعيف جداً";
}

export { _emptyHealthResult, scoreWord };
