'use client';

/**
 * Service Worker Registration
 * 
 * Registers the SW for offline support and caching.
 * Only runs in production.
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  
  // Only register in production (avoid dev confusion)
  if (process.env.NODE_ENV !== 'production') {
    return;
  }
  
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  // Register after page load (don't block initial render)
  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register);
  }
}

function register() {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[SW] Registered successfully');
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            console.log('[SW] New version available');
            // Optional: show update prompt to user
          }
        });
      });
    })
    .catch((error) => {
      console.warn('[SW] Registration failed:', error);
    });
}

/**
 * Unregister Service Worker (for debugging)
 */
export function unregisterServiceWorker() {
  if (typeof window === 'undefined') return;
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
  }
}
