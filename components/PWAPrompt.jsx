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

  // ── iOS instructions
  if (isIOS) {
    return (
      <div style={{
        position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: 448,
        background: C.layer2, borderRadius: 16,
        border: `1px solid ${C.gold}33`,
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,.6)',
        zIndex: 500, direction: 'rtl',
        fontFamily: "'Cairo','Segoe UI',sans-serif",
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <button onClick={dismiss} style={{ background: 'none', border: 'none', color: C.textTertiary, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary, marginBottom: 8 }}>
              📲 أضف تداول+ للشاشة الرئيسية
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.7 }}>
              ١. اضغط على زر <span style={{ color: C.gold }}>مشاركة</span> ↑ في Safari
              <br />
              ٢. اختر <span style={{ color: C.gold }}>"إضافة إلى الشاشة الرئيسية"</span>
              <br />
              ٣. اضغط <span style={{ color: C.gold }}>إضافة</span> ✓
            </div>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: C.gold,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginRight: 10,
            boxShadow: `0 2px 10px ${C.glowGold}`,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <polyline points="4,16 8,10 12,13 17,7 20,9" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

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

  return null;
}
