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
