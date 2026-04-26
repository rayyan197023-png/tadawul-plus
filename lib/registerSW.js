'use client';

/**
 * Service Worker - DISABLED (causing cache issues)
 */

export function registerServiceWorker() {
  // Disabled to fix cache issues
  if (typeof window === 'undefined') return;
  
  // Unregister any existing SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
      });
    });
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
  }
}

export function unregisterServiceWorker() {
  registerServiceWorker(); // Same logic
}
