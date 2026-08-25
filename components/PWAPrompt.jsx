'use client';
/**
 * PWAPrompt — Install Banner
 *
 * Shows:
 * - iOS: "أضف للشاشة الرئيسية" instructions
 * - Android/Desktop: Install button
 * - Update notification when new version is available
 */

import { useState } from 'react';
import { usePWA }   from '../hooks/usePWA';
import { colors }   from '../theme/tokens';

const C = colors;

export default function PWAPrompt() {
  const { canInstall, isInstalled, isIOS, updateReady, triggerInstall, applyUpdate } = usePWA();
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem('pwa_dismissed'); } catch { return false; }
  });

  const dismiss = () => {
    try { localStorage.setItem('pwa_dismissed', '1'); } catch {}
    setDismissed(true);
  };

  // ── Update notification (highest priority)
  if (updateReady) {
    return (
      <div style={{
        position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 448,
        background: C.layer2, borderRadius: 14,
        border: `1px solid ${C.electric}44`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(0,0,0,.6)',
        zIndex: 500, direction: 'rtl',
        fontFamily: "'Cairo','Segoe UI',sans-serif",
      }}>
        <button
          onClick={applyUpdate}
          style={{
            background: C.electric, border: 'none', borderRadius: 8,
            padding: '7px 16px', color: '#000', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          تحديث الآن
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>تحديث متاح</div>
          <div style={{ fontSize: 10, color: C.textSecondary }}>نسخة جديدة من تداول+ جاهزة</div>
        </div>
      </div>
    );
  }

  // Don't show if installed or dismissed
  if (isInstalled || dismissed) return null;

  // ── Android / Desktop install button
  if (canInstall) {
    return (
      <div style={{
        position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 448,
        background: C.layer2, borderRadius: 14,
        border: `1px solid ${C.gold}33`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(0,0,0,.6)',
        zIndex: 500, direction: 'rtl',
        fontFamily: "'Cairo','Segoe UI',sans-serif",
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={triggerInstall}
            style={{
              background: C.gold, border: 'none', borderRadius: 8,
              padding: '7px 16px', color: '#000', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            تثبيت
          </button>
          <button onClick={dismiss} style={{ background: C.layer3, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', color: C.textSecondary, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            لاحقاً
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>ثبّت تداول+</div>
          <div style={{ fontSize: 10, color: C.textSecondary }}>تطبيق سريع بدون متصفح</div>
        </div>
      </div>
    );
  }

  // ✨ iOS: Safari لا يدعم beforeinstallprompt -- نعرض تعليمات يدوية
  if (isIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 448,
        background: C.layer2, borderRadius: 14,
        border: `1px solid ${C.gold}33`,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(0,0,0,.6)',
        zIndex: 500, direction: 'rtl',
        fontFamily: "'Cairo','Segoe UI',sans-serif",
      }}>
        <button onClick={dismiss} style={{
          background: C.layer3, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '7px 12px', color: C.textSecondary, fontSize: 12,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          لاحقاً
        </button>
        <div style={{ textAlign: 'right', flex: 1, marginRight: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>ثبّت تداول+ على آيفون</div>
          <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.5 }}>
            اضغط زر المشاركة ⬆️ ثم «إضافة إلى الشاشة الرئيسية»
          </div>
        </div>
      </div>
    );
  }

  return null;
}

