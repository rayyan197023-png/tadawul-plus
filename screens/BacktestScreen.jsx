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
    }}>
      <h1 style={{ fontSize: 24, color: '#f0c050' }}>
        🧪 مختبر الاستراتيجيات
      </h1>
      <p style={{ marginTop: 20 }}>
        الشاشة تعمل! ✅
      </p>
      <p style={{ marginTop: 10, color: '#90a4c8' }}>
        إذا رأيت هذا، فالتنقّل يعمل والمشكلة في محتوى الشاشة الأصلي.
      </p>
    </div>
  );
}
