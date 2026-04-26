'use client';

import React, { useState, useEffect } from 'react';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('tadawul_alerts');
        const data = raw ? JSON.parse(raw) : [];
        setAlerts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('[Alerts] Load error:', e);
    }
  }, []);

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#06080f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f0c050',
        fontFamily: 'Cairo, sans-serif',
      }}>
        <div style={{ fontSize: 14 }}>جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#06080f',
      padding: '20px',
      paddingBottom: 100,
      direction: 'rtl',
      fontFamily: 'Cairo, sans-serif',
      color: '#f0f6ff',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 11,
          color: '#f0c050',
          fontWeight: 700,
          letterSpacing: '1.5px',
          marginBottom: 4,
        }}>
          ALERT CENTER
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 900,
          color: '#f0f6ff',
        }}>
          التنبيهات الذكية 🔔
        </div>
        <div style={{
          fontSize: 12,
          color: '#90a4c8',
          marginTop: 4,
        }}>
          {alerts.length} تنبيه
        </div>
      </div>

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#f0f6ff',
            marginBottom: 8,
          }}>
            لا توجد تنبيهات
          </div>
          <div style={{
            fontSize: 12,
            color: '#90a4c8',
            lineHeight: 1.6,
          }}>
            التنبيهات الذكية ستظهر هنا تلقائياً
          </div>
        </div>
      ) : (
        alerts.map((alert, idx) => (
          <div
            key={alert.id || idx}
            style={{
              background: 'linear-gradient(135deg, #141d2b, #1e2d42)',
              borderRadius: 14,
              border: '1px solid #32426a',
              padding: '14px',
              marginBottom: 10,
            }}
          >
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: '#f0f6ff',
              marginBottom: 6,
            }}>
              {alert.icon || '🔔'} {alert.title || 'تنبيه'}
            </div>
            
            {alert.sym && (
              <div style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 700,
                color: alert.color || '#90a4c8',
                background: (alert.color || '#90a4c8') + '15',
                padding: '2px 8px',
                borderRadius: 5,
                marginBottom: 6,
              }}>
                {alert.sym}
              </div>
            )}
            
            {alert.message && (
              <div style={{
                fontSize: 12,
                color: '#c8d8f0',
                lineHeight: 1.5,
                marginTop: 6,
              }}>
                {alert.message}
              </div>
            )}
            
            {alert.detail && (
              <div style={{
                fontSize: 11,
                color: '#90a4c8',
                marginTop: 6,
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
              }}>
                {alert.detail}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
