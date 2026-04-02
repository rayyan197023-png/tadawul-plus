'use client';
/**
 * @module hooks/useHaptic
 * @description اهتزاز اللمس (Haptic Feedback) عبر Vibration API
 * 
 * يعمل على: Android Chrome + PWA
 * iOS: يحتاج WKWebView أو إعدادات خاصة — fallback صامت
 * 
 * @example
 * const { tap, success, error, warning } = useHaptic();
 * <button onClick={() => { tap(); doAction(); }}>اضغط</button>
 */

export function useHaptic() {
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  /** نبضة خفيفة — للضغط على الأزرار */
  const tap = () => {
    if (canVibrate) navigator.vibrate(10);
  };

  /** نبضة قوية — للإجراءات المهمة (شراء، بيع) */
  const strong = () => {
    if (canVibrate) navigator.vibrate(20);
  };

  /** نمط النجاح — عند إضافة سهم أو تأكيد عملية */
  const success = () => {
    if (canVibrate) navigator.vibrate([10, 50, 10]);
  };

  /** نمط الخطأ — عند فشل عملية */
  const error = () => {
    if (canVibrate) navigator.vibrate([30, 40, 30]);
  };

  /** نمط التحذير — تنبيه سعري */
  const warning = () => {
    if (canVibrate) navigator.vibrate([15, 30, 15]);
  };

  /** نبضة للـ toggle (نجمة المتابعة) */
  const toggle = () => {
    if (canVibrate) navigator.vibrate([8, 20, 8]);
  };

  return { tap, strong, success, error, warning, toggle, canVibrate };
}

export default useHaptic;
