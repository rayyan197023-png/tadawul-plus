'use client';
/**
 * CHART SCREEN — الشارت الاحترافي
 *
 * يُحمِّل chart.html (Canvas engine كامل) داخل iframe
 * بدون أي تعديل — نفس التصميم والوظائف بالضبط:
 *   • Candlestick / Heikin-Ashi / Renko / Line
 *   • RSI, MACD, BB, EMA, SMA, ATR, VWAP, CMF, OBV, Stoch, ADX, CCI
 *   • أدوات الرسم: Trendline, Fibonacci, Rectangle, Text
 *   • Touch events كاملة
 */

import { useEffect, useRef, useState } from 'react';

export default function ChartScreen({ stk, onClose }) {
  const iframeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Build URL with stock symbol
  const sym  = stk?.sym ?? '2222';
  const src  = `/chart.html?sym=${sym}&t=${Date.now()}`;

  // When stock changes after load → send postMessage
  useEffect(() => {
    if (!loaded || !iframeRef.current) return;
    try {
      iframeRef.current.contentWindow?.postMessage(
        { type: 'SET_STOCK', sym },
        '*'
      );
    } catch (e) {
      // iframe cross-origin safety — URL param handles initial load
    }
  }, [sym, loaded]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: '#070b12',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      )}

      {/* Skeleton while loading */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          background: '#070b12',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid #1e2d42',
            borderTopColor: '#f0c050',
            animation: 'spin 0.8s linear infinite',
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* The chart — full screen iframe, zero modifications */}
      <iframe
        ref={iframeRef}
        src={src}
        onLoad={() => setLoaded(true)}
        style={{
          flex: 1, border: 'none', width: '100%', height: '100%',
          background: '#070b12',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        title="تداول+ الشارت الاحترافي"
        allow="fullscreen"
      />
    </div>
  );
}
