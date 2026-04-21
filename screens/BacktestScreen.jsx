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
      <h1 style={{ fontSize: 32, color: '#f0c050', marginBottom: 20 }}>
        🧪 اختبار!
      </h1>
      <p style={{ fontSize: 18, marginBottom: 10 }}>
        إذا رأيت هذا -- الشاشة تعمل! ✅
      </p>
      <p style={{ color: '#90a4c8', fontSize: 14 }}>
        المشكلة في محتوى BacktestScreen الأصلي
      </p>
    </div>
  );
}
