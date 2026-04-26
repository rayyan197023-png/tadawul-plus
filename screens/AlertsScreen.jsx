'use client';

import React from 'react';

export default function AlertsScreen() {
  const [alerts, setAlerts] = React.useState([]);
  
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('tadawul_alerts');
      const data = raw ? JSON.parse(raw) : [];
      setAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Alerts load error:', e);
    }
  }, []);
  
  return (
    <div style={{
      padding: 20,
      minHeight: '100vh',
      background: '#06080f',
      color: '#f0f6ff',
      fontFamily: 'Cairo, sans-serif',
      direction: 'rtl',
    }}>
      <h1 style={{ fontSize: 20, color: '#f0c050' }}>التنبيهات الذكية 🔔</h1>
      <p style={{ marginTop: 10, color: '#90a4c8' }}>
        {alerts.length === 0 ? 'لا توجد تنبيهات بعد' : `${alerts.length} تنبيه`}
      </p>
      
      {alerts.map((a, i) => (
        <div key={a.id || i} style={{
          padding: 12,
          margin: '10px 0',
          background: '#141d2b',
          border: '1px solid #32426a',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {a.icon || '🔔'} {a.title || 'تنبيه'}
          </div>
          {a.message && (
            <div style={{ fontSize: 12, color: '#c8d8f0', marginTop: 6 }}>
              {a.message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
