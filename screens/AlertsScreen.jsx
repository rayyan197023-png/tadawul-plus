'use client';
/**
 * @module AlertsScreen
 * @description Alert Center - شاشة التنبيهات الكاملة
 * 
 * Features:
 * - عرض كل التنبيهات
 * - Filtering (Priority, Type, Date)
 * - Mark as read/Dismiss
 * - Settings access
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  PRIORITY, 
  ALERT_TYPES, 
  ALERT_COLORS,
  loadAlertSettings,
  saveAlertSettings,
  getAlertsStats,
  requestNotificationPermission,
} from '../engines/smartAlertsEngine';
import { useNav } from '../store/navStore';
import { useHaptic } from '../hooks/useHaptic';

const C = {
  ink: "#06080f", deep: "#090c16", void: "#0c1020",
  layer1: "#141d2b", layer2: "#1e2d42", layer3: "#243352",
  edge: "#2e3e60", line: "#32426a",
  snow: "#f0f6ff", mist: "#c8d8f0", smoke: "#90a4c8", ash: "#5a6e94",
  gold: "#f0c050", goldL: "#ffd878",
  electric: "#4d9fff", mint: "#1ee68a", coral: "#ff5f6a",
  amber: "#fbbf24", teal: "#22d3ee", plasma: "#a78bfa",
};

// Priority colors
const PRIORITY_COLORS = {
  [PRIORITY.CRITICAL]: C.coral,
  [PRIORITY.HIGH]: C.amber,
  [PRIORITY.MEDIUM]: C.electric,
  [PRIORITY.LOW]: C.smoke,
};

const PRIORITY_LABELS = {
  [PRIORITY.CRITICAL]: 'حرج',
  [PRIORITY.HIGH]: 'عاجل',
  [PRIORITY.MEDIUM]: 'مهم',
  [PRIORITY.LOW]: 'عادي',
};

// Time formatter
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} د`;
  if (hours < 24) return `قبل ${hours} س`;
  if (days < 7) return `قبل ${days} يوم`;
  
  return new Date(timestamp).toLocaleDateString('ar-SA');
}

// Alert Card Component
const AlertCard = React.memo(function AlertCard({ alert, onDismiss, onMarkRead }) {
  const priorityColor = PRIORITY_COLORS[alert.priority] || C.smoke;
  const haptic = useHaptic();
  
  return (
    <div
      onClick={() => onMarkRead(alert.id)}
      style={{
        background: alert.read 
          ? `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`
          : `linear-gradient(135deg, ${alert.color}15, ${alert.color}08)`,
        borderRadius: 14,
        border: `1px solid ${alert.read ? C.line : alert.color + '44'}`,
        padding: '12px 14px',
        marginBottom: 10,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s',
      }}
    >
      {/* Unread indicator */}
      {!alert.read && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: alert.color,
          boxShadow: `0 0 8px ${alert.color}`,
        }} />
      )}
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        {/* Icon */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: alert.color + '22',
          border: `1px solid ${alert.color}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}>
          {alert.icon}
        </div>
        
        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 800,
            color: C.snow,
            marginBottom: 4,
            lineHeight: 1.3,
          }}>
            {alert.title}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: alert.color,
              background: alert.color + '15',
              padding: '2px 8px',
              borderRadius: 5,
            }}>
              {alert.sym}
            </span>
            
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: priorityColor,
              background: priorityColor + '15',
              padding: '2px 8px',
              borderRadius: 5,
            }}>
              {PRIORITY_LABELS[alert.priority]}
            </span>
            
            <span style={{ fontSize: 10, color: C.smoke }}>
              {formatTime(alert.timestamp)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Message */}
      <div style={{
        fontSize: 12,
        color: C.mist,
        lineHeight: 1.5,
        marginBottom: 8,
      }}>
        {alert.message}
      </div>
      
      {/* Detail */}
      {alert.detail && (
        <div style={{
          fontSize: 11,
          color: C.smoke,
          lineHeight: 1.5,
          background: C.void + '88',
          padding: '6px 10px',
          borderRadius: 8,
          marginBottom: 8,
        }}>
          {alert.detail}
        </div>
      )}
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            haptic.tap();
            onDismiss(alert.id); 
          }}
          style={{
            flex: 1,
            padding: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${C.line}`,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            color: C.smoke,
            fontFamily: 'inherit',
          }}
        >
          إخفاء
        </button>
        
        <button
          onClick={(e) => { 
            e.stopPropagation();
            haptic.tap();
          }}
          style={{
            flex: 2,
            padding: '8px',
            background: `linear-gradient(135deg, ${alert.color}25, ${alert.color}10)`,
            border: `1px solid ${alert.color}44`,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 800,
            color: alert.color,
            fontFamily: 'inherit',
          }}
        >
          {alert.action || 'عرض'}
        </button>
      </div>
    </div>
  );
});

AlertCard.displayName = 'AlertCard';

// Empty State
function EmptyState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        background: `linear-gradient(135deg, ${C.layer2}, ${C.layer3})`,
        border: `1px solid ${C.line}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        margin: '0 auto 20px',
      }}>
        🔔
      </div>
      
      <div style={{
        fontSize: 16,
        fontWeight: 800,
        color: C.snow,
        marginBottom: 8,
      }}>
        لا توجد تنبيهات
      </div>
      
      <div style={{
        fontSize: 12,
        color: C.smoke,
        lineHeight: 1.6,
        maxWidth: 280,
        margin: '0 auto',
      }}>
        التنبيهات الذكية ستظهر هنا تلقائياً عند اكتشاف فرص أو تحذيرات في أسهمك
      </div>
    </div>
  );
}

// Filter Tabs
const FILTERS = [
  { id: 'all', label: 'الكل', color: C.smoke },
  { id: 'unread', label: 'غير مقروء', color: C.electric },
  { id: PRIORITY.CRITICAL, label: 'حرج', color: C.coral },
  { id: PRIORITY.HIGH, label: 'عاجل', color: C.amber },
];

// Main Screen
export default function AlertsScreen() {
  const haptic = useHaptic();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
  soundEnabled: true,
  browserNotifications: true,
  vibration: true,
});

useEffect(() => {
  setSettings(loadAlertSettings());
}, []);

  // Load alerts on mount + every 5 seconds
  useEffect(() => {
    function loadAlerts() {
      try {
        if (typeof window === 'undefined') return;
        const raw = window.localStorage.getItem('tadawul_alerts');
        const data = raw ? JSON.parse(raw) : [];
        setAlerts(data);
        setStats(getAlertsStats());
      } catch (e) {}
    }
    
    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mark as read
  const markAsRead = useCallback((id) => {
    setAlerts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, read: true } : a);
      try {
        window.localStorage.setItem('tadawul_alerts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Dismiss alert
  const dismissAlert = useCallback((id) => {
    haptic.tap();
    setAlerts(prev => {
      const updated = prev.filter(a => a.id !== id);
      try {
        window.localStorage.setItem('tadawul_alerts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [haptic]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    haptic.tap();
    setAlerts(prev => {
      const updated = prev.map(a => ({ ...a, read: true }));
      try {
        window.localStorage.setItem('tadawul_alerts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, [haptic]);

  // Clear all
  const clearAll = useCallback(() => {
    haptic.tap();
    if (confirm('هل أنت متأكد من حذف كل التنبيهات؟')) {
      setAlerts([]);
      try {
        window.localStorage.setItem('tadawul_alerts', JSON.stringify([]));
      } catch (e) {}
    }
  }, [haptic]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'unread') return alerts.filter(a => !a.read);
    return alerts.filter(a => a.priority === filter);
  }, [alerts, filter]);

  // Update setting
  const updateSetting = useCallback((key, value) => {
    haptic.tap();
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveAlertSettings(updated);
  }, [settings, haptic]);

  // Request permission
  const requestPermission = useCallback(async () => {
    haptic.tap();
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      updateSetting('browserNotifications', true);
    }
  }, [haptic, updateSetting]);

  return (
    <div style={{
      minHeight: '100vh',
      background: C.ink,
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: `linear-gradient(180deg, ${C.void}f8, ${C.void}dd)`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.line}55`,
        padding: '14px 20px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{
              fontSize: 11,
              color: C.gold,
              fontWeight: 700,
              letterSpacing: '1.5px',
              marginBottom: 4,
            }}>
              ALERT CENTER
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 900,
              color: C.snow,
            }}>
              التنبيهات الذكية 🔔
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: showSettings ? C.gold + '25' : C.layer3,
              border: `1px solid ${showSettings ? C.gold + '44' : C.line}`,
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{
            display: 'flex',
            gap: 8,
            marginBottom: 10,
          }}>
            <div style={{ flex: 1, background: C.layer3, padding: '8px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.snow }}>
                {stats.total}
              </div>
              <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>الإجمالي</div>
            </div>
            
            <div style={{ flex: 1, background: C.electric + '15', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.electric }}>
                {stats.unread}
              </div>
              <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>غير مقروء</div>
            </div>
            
            <div style={{ flex: 1, background: C.coral + '15', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.coral }}>
                {stats.byPriority.critical}
              </div>
              <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>حرج</div>
            </div>
            
            <div style={{ flex: 1, background: C.amber + '15', padding: '8px', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.amber }}>
                {stats.byPriority.high}
              </div>
              <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>عاجل</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
        }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => { haptic.tap(); setFilter(f.id); }}
              style={{
                padding: '6px 12px',
                background: filter === f.id 
                  ? `${f.color}25` 
                  : 'transparent',
                border: `1px solid ${filter === f.id ? f.color + '55' : C.line}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                color: filter === f.id ? f.color : C.smoke,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          margin: '10px 20px',
          padding: '14px',
          background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
          borderRadius: 14,
          border: `1px solid ${C.gold}33`,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            color: C.gold,
            marginBottom: 12,
            letterSpacing: '1px',
          }}>
            ⚙️ الإعدادات
          </div>
          
          {/* Browser Notifications */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            background: C.layer3,
            borderRadius: 10,
            marginBottom: 8,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.snow, marginBottom: 2 }}>
                إشعارات المتصفح
              </div>
              <div style={{ fontSize: 10, color: C.smoke }}>
                تنبيهات حتى لو التطبيق مغلق
              </div>
            </div>
            <button
              onClick={settings.browserNotifications ? () => updateSetting('browserNotifications', false) : requestPermission}
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                background: settings.browserNotifications ? C.mint + '44' : C.line,
                border: `1px solid ${settings.browserNotifications ? C.mint : C.smoke}`,
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: settings.browserNotifications ? C.mint : C.smoke,
                position: 'absolute',
                top: 2,
                right: settings.browserNotifications ? 2 : 24,
                transition: 'all 0.2s',
              }} />
            </button>
          </div>
          
          {/* Sound */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            background: C.layer3,
            borderRadius: 10,
            marginBottom: 8,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.snow, marginBottom: 2 }}>
                الصوت
              </div>
              <div style={{ fontSize: 10, color: C.smoke }}>
                تشغيل صوت عند التنبيه
              </div>
            </div>
            <button
              onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                background: settings.soundEnabled ? C.mint + '44' : C.line,
                border: `1px solid ${settings.soundEnabled ? C.mint : C.smoke}`,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: settings.soundEnabled ? C.mint : C.smoke,
                position: 'absolute',
                top: 2,
                right: settings.soundEnabled ? 2 : 24,
              }} />
            </button>
          </div>
          
          {/* Vibration */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            background: C.layer3,
            borderRadius: 10,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.snow, marginBottom: 2 }}>
                الاهتزاز
              </div>
              <div style={{ fontSize: 10, color: C.smoke }}>
                اهتزاز الهاتف عند التنبيه
              </div>
            </div>
            <button
              onClick={() => updateSetting('vibration', !settings.vibration)}
              style={{
                width: 50,
                height: 28,
                borderRadius: 14,
                background: settings.vibration ? C.mint + '44' : C.line,
                border: `1px solid ${settings.vibration ? C.mint : C.smoke}`,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: settings.vibration ? C.mint : C.smoke,
                position: 'absolute',
                top: 2,
                right: settings.vibration ? 2 : 24,
              }} />
            </button>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {alerts.length > 0 && (
        <div style={{
          padding: '10px 20px',
          display: 'flex',
          gap: 8,
        }}>
          <button
            onClick={markAllAsRead}
            style={{
              flex: 1,
              padding: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: C.smoke,
              fontFamily: 'inherit',
            }}
          >
            ✓ علامة الكل كمقروء
          </button>
          
          <button
            onClick={clearAll}
            style={{
              flex: 1,
              padding: '8px',
              background: C.coral + '15',
              border: `1px solid ${C.coral}33`,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: C.coral,
              fontFamily: 'inherit',
            }}
          >
            🗑️ مسح الكل
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div style={{ padding: '0 20px' }}>
        {filteredAlerts.length === 0 ? (
          <EmptyState />
        ) : (
          filteredAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={dismissAlert}
              onMarkRead={markAsRead}
            />
          ))
        )}
      </div>
    </div>
  );
}
