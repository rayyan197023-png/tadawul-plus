'use client';

import React from 'react';

export default function BacktestScreen() {
  return (
    <div style={{
      background: '#06080f',
      minHeight: '100vh',
      padding: 40,
      color: '#f0f6ff',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: 40, color: '#f0c050', marginBottom: 30 }}>
        🧪 نجح الاختبار!
      </h1>
      <p style={{ fontSize: 18, color: '#1ee68a', marginBottom: 20 }}>
        ✅ الشاشة تفتح بشكل صحيح
      </p>
      <p style={{ fontSize: 14, color: '#c8d8f0', lineHeight: 2 }}>
        التنقّل من "المزيد" إلى Backtest يعمل!
      </p>
      <div style={{
        marginTop: 40,
        padding: 20,
        background: 'rgba(240, 192, 80, 0.15)',
        border: '1px solid rgba(240, 192, 80, 0.4)',
        borderRadius: 12,
        fontSize: 13,
        color: '#f0c050',
      }}>
        💡 إذا رأيت هذا → المشكلة في محتوى BacktestScreen الأصلي
        <br /><br />
        💡 إذا لم ترَ هذا → المشكلة في التنقّل أو AppShell
      </div>
    </div>
  );
}
