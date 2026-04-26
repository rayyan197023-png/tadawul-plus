'use client';

/**
 * Service Worker Registration - DISABLED FOR DEBUG
 */

export function registerServiceWorker() {
  // Temporarily disabled for debugging
  return;
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined') return;
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
        console.log('[SW] Unregistered');
      });
    });
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
        console.log('[SW] All caches cleared');
      });
    }
  }
}
