'use client';

/**
 * Web Vitals Reporting
 * 
 * يقيس Core Web Vitals الفعلية للمستخدمين:
 * - FCP (First Contentful Paint)
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 */

const VITALS_THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

function getRating(name, value) {
  const threshold = VITALS_THRESHOLDS[name];
  if (!threshold) return 'unknown';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function logMetric(metric) {
  const rating = getRating(metric.name, metric.value);
  
  // ✨ Console logging (development)
  if (process.env.NODE_ENV !== 'production') {
    const emoji = rating === 'good' ? '🟢' : rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(
      `${emoji} [Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${rating})`
    );
  }
  
  // ✨ Save to localStorage (last 50 measurements)
  try {
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('tdw_vitals') || '[]');
      stored.unshift({
        name: metric.name,
        value: metric.value,
        rating,
        timestamp: Date.now(),
        url: window.location.pathname,
      });
      // Keep last 50
      const trimmed = stored.slice(0, 50);
      localStorage.setItem('tdw_vitals', JSON.stringify(trimmed));
    }
  } catch (e) {
    // Silent fail
  }
  
  // ✨ Send to analytics (when available)
  // Example: send to your analytics endpoint
  // fetch('/api/vitals', { method: 'POST', body: JSON.stringify(metric) });
}

export function reportWebVitals() {
  if (typeof window === 'undefined') return;
  
  // Use native PerformanceObserver (no library needed)
  try {
    // FCP - First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          logMetric({ name: 'FCP', value: entry.startTime });
        }
      }
    }).observe({ type: 'paint', buffered: true });

    // LCP - Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        logMetric({ name: 'LCP', value: lastEntry.startTime });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS - Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          logMetric({ name: 'CLS', value: clsValue });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });

    // FID - First Input Delay (deprecated, but still works)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        logMetric({ 
          name: 'FID', 
          value: entry.processingStart - entry.startTime 
        });
      }
    }).observe({ type: 'first-input', buffered: true });

    // TTFB - Time to First Byte
    if (performance.getEntriesByType) {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const ttfb = navEntries[0].responseStart - navEntries[0].requestStart;
        if (ttfb > 0) {
          logMetric({ name: 'TTFB', value: ttfb });
        }
      }
    }
  } catch (e) {
    // Browser doesn't support PerformanceObserver
    console.warn('[Web Vitals] Browser support limited');
  }
}


