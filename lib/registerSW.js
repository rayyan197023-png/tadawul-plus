'use client';

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(reg) {
        console.log('[SW] registered:', reg.scope);
      })
      .catch(function(e) {
        console.warn('[SW] failed:', e.message);
      });
  });
}

