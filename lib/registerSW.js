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

export function unregisterServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    // لا نلغي -- نتركه يعمل
    console.log('[SW] registrations:', registrations.length);
  });
}
