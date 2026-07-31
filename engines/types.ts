/**
 * @module engines/types
 * @description أنواع بيانات مشتركة (TypeScript Interfaces) لمحرك التحليل
 * تبدأ بـ Bar فقط كخطوة أولى آمنة، تُضاف أنواع أخرى تدريجياً
 */

/**
 * شمعة سعرية واحدة (OHLCV)
 * ملاحظة: بعض الحقول مكرّرة (o/open, c/close) للتوافق مع نمطين مختلفين
 * مستخدمين تاريخياً بالكود (technicalEngine يقرأ o/c، كود قديم يقرأ open/close)
 */
export interface Bar {
  o: number;
  open?: number;
  hi: number;
  lo: number;
  c: number;
  close?: number;
  vol: number;
  pct?: number;
  t?: Date | string;
}

export interface MacroData {
  oilPrice: number;
  oilTarget: number;
  saudiRepoRate: number;
  cpi: number;
  vix: number;
  gdpGrowth: number;
  m2Growth?: number;
}

/**
 * بيانات السهم -- نوع "متدرّج" (progressive typing)
 * يوثّق الحقول الأساسية المؤكدة، ويسمح بأي حقل إضافي عبر [key: string]: any
 * (بدل تصميم شامل دفعة واحدة قد يكسر دوال تستخدم حقولاً غير موثّقة بعد)
 */
export interface Stock {
  sym: string;
  p: number;
  ch: number;
  sec: string;
  [key: string]: any;
}

/**
 * نتيجة stockHealth -- نوع "متدرّج" (progressive typing)
 * يوثّق الحقول الأساسية المؤكدة (من _emptyHealthResult)، ويسمح بالباقي عبر [key: string]: any
 */
export interface HealthScore {
  score: number;
  grade: string;
  sig: string;
  sigC: string;
  regime: string;
  [key: string]: any;
}
