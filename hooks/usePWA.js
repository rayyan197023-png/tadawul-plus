'use client';
/**
 * usePWA — PWA Registration Hook
 *
 * Registers the service worker and handles:
 * - Install prompt (Android/Desktop)
 * - iOS "Add to Home Screen" detection
 * - Update notifications
 *
 * Call once in AppShell.
 */

import { useState, useEffect } from 'react';

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled,   setIsInstalled]   = useState(false);
  const [isIOS,         setIsIOS]         = useState(false);
  const [updateReady,   setUpdateReady]   = useState(false);

  useEffect(() => {
    // ── Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // ── Detect if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
    setIsInstalled(standalone);

    // ── Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateReady(true);
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] SW registration failed:', err);
        });
    }

    // ── Android/Desktop install prompt
    const handlePrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  // ── Trigger install (Android/Desktop)
  const triggerInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setInstallPrompt(null);
  };

  // ── Apply update
  const applyUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  };

  return {
    canInstall:    !!installPrompt,
    isInstalled,
    isIOS,
    updateReady,
    triggerInstall,
    applyUpdate,
  };
}
