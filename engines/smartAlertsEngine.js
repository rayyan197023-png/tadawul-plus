/**
 * SMART ALERTS ENGINE
 * محرك التنبيهات الذكية -- مستوى Bloomberg × Apple
 * 
 * يُحلّل تلقائياً:
 * - تغيّرات Health Score (الطبقات التسع)
 * - إشارات BOS, Wyckoff, RSI, MACD
 * - حالة السيولة والتذبذب
 * - الوصول لأهداف السعر / Stop Loss
 * - صحة المحفظة (Rebalancing مطلوب)
 */

import { STOCKS } from '../constants/stocksData';

// ─── الثوابت الأساسية ─────────────────────────
const COOLDOWN_MINUTES = 15;          // مدة الانتظار بين تنبيهات متشابهة
const MAX_ALERTS_PER_SYMBOL = 3;      // أقصى عدد تنبيهات لسهم واحد/يوم
const HEALTH_JUMP_THRESHOLD = 15;     // قفزة Health Score (نقاط)
const HEALTH_DROP_THRESHOLD = 15;     // هبوط Health Score (نقاط)
const HIGH_HEALTH_THRESHOLD = 85;     // Health عالٍ (فرصة قوية)
const LOW_HEALTH_THRESHOLD = 35;      // Health منخفض (خطر)
const RSI_OVERSOLD = 30;              // ذروة البيع
const RSI_OVERBOUGHT = 70;            // ذروة الشراء

// ─── أنواع التنبيهات ───────────────────────────
export const ALERT_TYPES = {
  // تنبيهات الفرص
  HEALTH_JUMP:      'healthJump',       // 🎯 Health قفز فجأة
  STRONG_BUY:       'strongBuy',        // 💎 إشارة شراء قوية
  BOS_BULLISH:      'bosBullish',       // ⚡ BOS صاعد
  RSI_OVERSOLD:     'rsiOversold',      // 📊 RSI في ذروة البيع
  LIQUIDITY_SURGE:  'liquiditySurge',   // 💧 تحسّن السيولة فجأة
  
  // تنبيهات المخاطر
  HEALTH_DROP:      'healthDrop',       // ⚠️ Health هبط فجأة
  STRONG_SELL:      'strongSell',       // 🚨 إشارة بيع قوية
  BOS_BEARISH:      'bosBearish',       // 🔴 BOS هابط
  RSI_OVERBOUGHT:   'rsiOverbought',    // ⚠️ RSI في ذروة الشراء
  
  // تنبيهات المحفظة
  TARGET_REACHED:   'targetReached',    // 🎯 وصل هدف السعر
  STOP_LOSS:        'stopLossBreach',   // 🛑 كسر Stop Loss
  REBALANCE_NEEDED: 'rebalanceNeeded',  // ⚖️ إعادة توازن مطلوبة
};
// ─── مكتبة النغمات (6 نغمات احترافية) ──────────
export const SOUND_PRESETS = {
  classic: {
    id: 'classic',
    name: '🎯 كلاسيكي',
    description: 'نغمة ثلاثية متصاعدة',
    notes: [
      { freq: 1200, time: 0, duration: 0.15 },
      { freq: 800, time: 0.15, duration: 0.15 },
      { freq: 1200, time: 0.3, duration: 0.3 },
    ],
  },
  gentle: {
    id: 'gentle',
    name: '✨ ناعم',
    description: 'نغمة هادئة مريحة',
    notes: [
      { freq: 523, time: 0, duration: 0.2 },
      { freq: 659, time: 0.2, duration: 0.4 },
    ],
  },
  energy: {
    id: 'energy',
    name: '⚡ طاقة',
    description: 'نغمة حيوية نشطة',
    notes: [
      { freq: 880, time: 0, duration: 0.1 },
      { freq: 1046, time: 0.1, duration: 0.1 },
      { freq: 1318, time: 0.2, duration: 0.1 },
      { freq: 1568, time: 0.3, duration: 0.3 },
    ],
  },
  alert: {
    id: 'alert',
    name: '🚨 تنبيه',
    description: 'نغمة طوارئ حادة',
    notes: [
      { freq: 1500, time: 0, duration: 0.1 },
      { freq: 1500, time: 0.15, duration: 0.1 },
      { freq: 1500, time: 0.3, duration: 0.2 },
    ],
  },
  calm: {
    id: 'calm',
    name: '🧘 هدوء',
    description: 'نغمة ناعمة جداً',
    notes: [
      { freq: 440, time: 0, duration: 0.5 },
    ],
  },
  pulse: {
    id: 'pulse',
    name: '💓 نبض',
    description: 'نغمة نبضات القلب',
    notes: [
      { freq: 600, time: 0, duration: 0.08 },
      { freq: 600, time: 0.1, duration: 0.08 },
      { freq: 600, time: 0.4, duration: 0.08 },
      { freq: 600, time: 0.5, duration: 0.08 },
    ],
  },
};

// ─── حالة الإعدادات (تحميل من localStorage) ───────
export function loadAlertSettings() {
  if (typeof window === 'undefined') {
    return getDefaultSettings();
  }
  try {
    const raw = window.localStorage.getItem('tadawul_alert_settings');
    if (!raw) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(raw) };
  } catch (e) {
    return getDefaultSettings();
  }
}

export function saveAlertSettings(settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('tadawul_alert_settings', JSON.stringify(settings));
  } catch (e) {}
}

function getDefaultSettings() {
  return {
    soundEnabled: true,
    soundMode: 'critical',        // 'all' | 'critical' | 'off'
    soundPreset: 'classic',
    browserNotifications: true,
    vibration: true,
    volume: 0.3,
  };
}


// ─── مستويات الأولوية ─────────────────────────
export const PRIORITY = {
  CRITICAL: 'critical',  // 🚨 حرج (مخاطر عالية)
  HIGH:     'high',      // 🔴 عالية
  MEDIUM:   'medium',    // 🟡 متوسطة
  LOW:      'low',       // 🔵 منخفضة
};

// ─── الألوان حسب النوع ─────────────────────────
export const ALERT_COLORS = {
  [ALERT_TYPES.HEALTH_JUMP]:      { bg: '#1ee68a', icon: '🎯', label: 'قفزة صحة' },
  [ALERT_TYPES.STRONG_BUY]:       { bg: '#1ee68a', icon: '💎', label: 'شراء قوي' },
  [ALERT_TYPES.BOS_BULLISH]:      { bg: '#22d3ee', icon: '⚡', label: 'اختراق صاعد' },
  [ALERT_TYPES.RSI_OVERSOLD]:     { bg: '#4d9fff', icon: '📊', label: 'ذروة بيع' },
  [ALERT_TYPES.LIQUIDITY_SURGE]:  { bg: '#22d3ee', icon: '💧', label: 'تدفق سيولة' },
  
  [ALERT_TYPES.HEALTH_DROP]:      { bg: '#ff5f6a', icon: '⚠️', label: 'انخفاض صحة' },
  [ALERT_TYPES.STRONG_SELL]:      { bg: '#ff5f6a', icon: '🚨', label: 'بيع قوي' },
  [ALERT_TYPES.BOS_BEARISH]:      { bg: '#ff5f6a', icon: '🔴', label: 'كسر هابط' },
  [ALERT_TYPES.RSI_OVERBOUGHT]:   { bg: '#fbbf24', icon: '⚠️', label: 'ذروة شراء' },
  
  [ALERT_TYPES.TARGET_REACHED]:   { bg: '#f0c050', icon: '🎯', label: 'هدف محقق' },
  [ALERT_TYPES.STOP_LOSS]:        { bg: '#ff5f6a', icon: '🛑', label: 'Stop Loss' },
  [ALERT_TYPES.REBALANCE_NEEDED]: { bg: '#a78bfa', icon: '⚖️', label: 'توازن محفظة' },
};

// ─── الذاكرة المؤقتة (للمقارنة) ──────────────
let previousState = {}; // { [sym]: { health, rsi, macd, bos } }

/**
 * الدالة الرئيسية: توليد التنبيهات الذكية
 * 
 * @param {Array} currentStocks - الأسهم الحالية مع التحليلات
 * @param {Array} positions - مراكز المحفظة
 * @returns {Array} - قائمة التنبيهات الجديدة
 */
export function generateSmartAlerts(currentStocks, positions = []) {
  if (!currentStocks || currentStocks.length === 0) return [];
  
  const newAlerts = [];
  const now = Date.now();
  
  // تحميل التنبيهات السابقة لمنع التكرار
  const existingAlerts = loadExistingAlerts();
  const recentAlerts = existingAlerts.filter(a => 
    a.timestamp && (now - a.timestamp) < COOLDOWN_MINUTES * 60 * 1000
  );
  
  currentStocks.forEach(stock => {
    const prev = previousState[stock.sym];
    
    // ═══ 1. فحص Health Score ═══
    if (prev && stock.health) {
      const healthChange = stock.health - prev.health;
      
      // قفزة إيجابية كبيرة
      if (healthChange >= HEALTH_JUMP_THRESHOLD && stock.health >= 70) {
        const alert = createAlert({
          type: ALERT_TYPES.HEALTH_JUMP,
          priority: PRIORITY.HIGH,
          sym: stock.sym,
          name: stock.name,
          title: 'فرصة شراء متنامية',
          message: `Health Score قفز من ${prev.health} إلى ${stock.health}`,
          detail: `تحسّن ${healthChange}+ نقطة في الدقائق الماضية`,
          action: 'عرض التحليل الكامل',
          data: { from: prev.health, to: stock.health, change: healthChange },
        });
        
        if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
      }
      
      // هبوط سلبي كبير
      if (healthChange <= -HEALTH_DROP_THRESHOLD && stock.health <= 50) {
        const alert = createAlert({
          type: ALERT_TYPES.HEALTH_DROP,
          priority: PRIORITY.HIGH,
          sym: stock.sym,
          name: stock.name,
          title: 'تحذير: تدهور الأداء',
          message: `Health Score هبط من ${prev.health} إلى ${stock.health}`,
          detail: `انخفاض ${Math.abs(healthChange)} نقطة -- راجع مركزك`,
          action: 'عرض التحليل',
          data: { from: prev.health, to: stock.health, change: healthChange },
        });
        
        if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
      }
    }
    
    // ═══ 2. إشارات شراء قوية (Health عالٍ) ═══
    if (stock.health >= HIGH_HEALTH_THRESHOLD) {
      const alert = createAlert({
        type: ALERT_TYPES.STRONG_BUY,
        priority: PRIORITY.CRITICAL,
        sym: stock.sym,
        name: stock.name,
        title: '💎 إشارة شراء قوية جداً',
        message: `Health Score: ${stock.health}/100`,
        detail: 'الطبقات التسع تتوافق على شراء قوي',
        action: 'استكشف الفرصة',
        data: { health: stock.health },
      });
      
      if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
    }
    
    // ═══ 3. إشارات بيع قوية (Health منخفض) ═══
    if (stock.health <= LOW_HEALTH_THRESHOLD) {
      const alert = createAlert({
        type: ALERT_TYPES.STRONG_SELL,
        priority: PRIORITY.CRITICAL,
        sym: stock.sym,
        name: stock.name,
        title: '🚨 تحذير بيع حاد',
        message: `Health Score: ${stock.health}/100`,
        detail: 'ضعف واضح في المؤشرات الفنية والأساسية',
        action: 'راجع المركز',
        data: { health: stock.health },
      });
      
      if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
    }
    
    // ═══ 4. BOS (Break of Structure) ═══
    if (stock.bos && prev?.bos !== stock.bos) {
      if (stock.bos === 'bullish') {
        const alert = createAlert({
          type: ALERT_TYPES.BOS_BULLISH,
          priority: PRIORITY.HIGH,
          sym: stock.sym,
          name: stock.name,
          title: '⚡ كسر هيكلي صاعد',
          message: 'BOS Bullish -- اختراق مؤكد',
          detail: 'السهم كسر القمة السابقة -- إشارة صعود قوية',
          action: 'عرض التفاصيل',
          data: { bos: stock.bos },
        });
        
        if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
      } else if (stock.bos === 'bearish') {
        const alert = createAlert({
          type: ALERT_TYPES.BOS_BEARISH,
          priority: PRIORITY.HIGH,
          sym: stock.sym,
          name: stock.name,
          title: '🔴 كسر هيكلي هابط',
          message: 'BOS Bearish -- انهيار مؤكد',
          detail: 'السهم كسر القاع السابق -- إشارة هبوط',
          action: 'راجع المركز',
          data: { bos: stock.bos },
        });
        
        if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
      }
    }
    
    // ═══ 5. RSI Oversold (ذروة البيع -- فرصة) ═══
    if (stock.rsi && stock.rsi <= RSI_OVERSOLD && (!prev || prev.rsi > RSI_OVERSOLD)) {
      const alert = createAlert({
        type: ALERT_TYPES.RSI_OVERSOLD,
        priority: PRIORITY.MEDIUM,
        sym: stock.sym,
        name: stock.name,
        title: '📊 فرصة من ذروة البيع',
        message: `RSI: ${stock.rsi}`,
        detail: 'السهم في منطقة تشبع بيعي -- فرصة ارتداد محتملة',
        action: 'فحص السهم',
        data: { rsi: stock.rsi },
      });
      
      if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
    }
    
    // ═══ 6. RSI Overbought (ذروة الشراء -- تحذير) ═══
    if (stock.rsi && stock.rsi >= RSI_OVERBOUGHT && (!prev || prev.rsi < RSI_OVERBOUGHT)) {
      const alert = createAlert({
        type: ALERT_TYPES.RSI_OVERBOUGHT,
        priority: PRIORITY.MEDIUM,
        sym: stock.sym,
        name: stock.name,
        title: '⚠️ تحذير ذروة الشراء',
        message: `RSI: ${stock.rsi}`,
        detail: 'السهم في منطقة تشبع شرائي -- احتمال تصحيح',
        action: 'راقب بحذر',
        data: { rsi: stock.rsi },
      });
      
      if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
    }
    
    // ═══ 7. تنبيهات المحفظة (Target Reached / Stop Loss) ═══
    const myPosition = positions.find(p => p.sym === stock.sym);
    if (myPosition && stock.p) {
      // هدف السعر (+15% ربح افتراضي)
      const targetPrice = myPosition.avgCost * 1.15;
      if (stock.p >= targetPrice && !prev?.targetAlerted) {
        const alert = createAlert({
          type: ALERT_TYPES.TARGET_REACHED,
          priority: PRIORITY.HIGH,
          sym: stock.sym,
          name: stock.name,
          title: '🎯 وصلت الهدف!',
          message: `السعر الحالي: ${stock.p.toFixed(2)} ر`,
          detail: `ربح +15% من سعر الدخول (${myPosition.avgCost.toFixed(2)})`,
          action: 'فكّر في البيع الجزئي',
          data: { current: stock.p, entry: myPosition.avgCost, gain: 15 },
        });
        
        if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
      }
      
      // Stop Loss (-8% خسارة افتراضي)
      const stopLoss = myPosition.avgCost * 0.92;
      if (stock.p <= stopLoss && !prev?.stopLossAlerted) {
        const alert = createAlert({
          type: ALERT_TYPES.STOP_LOSS,
          priority: PRIORITY.CRITICAL,
          sym: stock.sym,
          name: stock.name,
          title: '🛑 كسر Stop Loss',
          message: `السعر الحالي: ${stock.p.toFixed(2)} ر`,
          detail: `خسارة -8% من سعر الدخول (${myPosition.avgCost.toFixed(2)})`,
          action: 'قرار فوري مطلوب',
          data: { current: stock.p, entry: myPosition.avgCost, loss: 8 },
        });
        
        if (!isDuplicate(alert, recentAlerts)) newAlerts.push(alert);
      }
    }
    
    // تحديث الحالة السابقة
    previousState[stock.sym] = {
      health: stock.health,
      rsi: stock.rsi,
      macd: stock.macd,
      bos: stock.bos,
      price: stock.p,
    };
  });
  
  return newAlerts;
}

// ─── إنشاء تنبيه مع metadata كامل ─────────────
function createAlert({ type, priority, sym, name, title, message, detail, action, data }) {
  return {
    id: generateAlertId(sym, type),
    type,
    priority,
    sym,
    name,
    title,
    message,
    detail,
    action,
    data,
    timestamp: Date.now(),
    createdAt: new Date().toISOString(),
    read: false,
    dismissed: false,
    smart: true, // لتمييزها عن التنبيهات اليدوية
    color: ALERT_COLORS[type]?.bg || '#90a4c8',
    icon: ALERT_COLORS[type]?.icon || '🔔',
    label: ALERT_COLORS[type]?.label || 'تنبيه',
  };
}

// ─── توليد معرف فريد ──────────────────────────
function generateAlertId(sym, type) {
  return `smart_${sym}_${type}_${Date.now()}`;
}

// ─── فحص التكرار ──────────────────────────────
function isDuplicate(newAlert, existingAlerts) {
  return existingAlerts.some(a => 
    a.sym === newAlert.sym &&
    a.type === newAlert.type &&
    a.timestamp &&
    (Date.now() - a.timestamp) < COOLDOWN_MINUTES * 60 * 1000
  );
}

// ─── تحميل التنبيهات الموجودة ─────────────────
function loadExistingAlerts() {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage.getItem('tadawul_alerts');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// ─── حفظ التنبيهات الجديدة ───────────────────
export function saveSmartAlerts(newAlerts) {
  if (!newAlerts || newAlerts.length === 0) return;
  
  try {
    const existing = loadExistingAlerts();
    const combined = [...newAlerts, ...existing];
    
    // احتفظ بآخر 100 تنبيه فقط
    const trimmed = combined.slice(0, 100);
    
    window.localStorage.setItem('tadawul_alerts', JSON.stringify(trimmed));
    return true;
  } catch (e) {
    return false;
  }
}

// ─── إرسال Browser Notification ───────────────
export function sendBrowserNotification(alert) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  // أولوية critical وhigh فقط → Notification
  if (alert.priority !== PRIORITY.CRITICAL && alert.priority !== PRIORITY.HIGH) return;
  
  try {
    new Notification(`${alert.icon} ${alert.title}`, {
      body: `${alert.name} -- ${alert.message}\n${alert.detail}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `tadawul-smart-${alert.sym}`,
      renotify: true,
      dir: 'rtl',
      lang: 'ar',
      requireInteraction: alert.priority === PRIORITY.CRITICAL,
    });
  } catch (e) {}
}

// ─── تشغيل المحرك الكامل ──────────────────────
export function runSmartAlertsEngine(currentStocks, positions = [], options = {}) {
  const { enableBrowserNotif = true, enableSound = true } = options;
  
  // توليد التنبيهات
  const newAlerts = generateSmartAlerts(currentStocks, positions);
  
  if (newAlerts.length === 0) return { count: 0, alerts: [] };
  
  // حفظ في localStorage
  saveSmartAlerts(newAlerts);
  
  // إرسال Browser Notifications للأولويات العالية
  if (enableBrowserNotif) {
    newAlerts.forEach(alert => {
      if (alert.priority === PRIORITY.CRITICAL || alert.priority === PRIORITY.HIGH) {
        sendBrowserNotification(alert);
      }
    });
  }
  
  // تشغيل صوت للأولوية الحرجة
  if (enableSound && newAlerts.some(a => a.priority === PRIORITY.CRITICAL)) {
    playAlertSound();
  }
  
  return {
    count: newAlerts.length,
    alerts: newAlerts,
    summary: {
      critical: newAlerts.filter(a => a.priority === PRIORITY.CRITICAL).length,
      high: newAlerts.filter(a => a.priority === PRIORITY.HIGH).length,
      medium: newAlerts.filter(a => a.priority === PRIORITY.MEDIUM).length,
      low: newAlerts.filter(a => a.priority === PRIORITY.LOW).length,
    },
  };
}

// ─── صوت التنبيه ──────────────────────────────
function playAlertSound() {
  if (typeof window === 'undefined') return;
  
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // نغمة ثلاثية (مميّزة)
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {}
}

// ─── إحصائيات التنبيهات ──────────────────────
export function getAlertsStats() {
  const alerts = loadExistingAlerts();
  const now = Date.now();
  const today = new Date().setHours(0, 0, 0, 0);
  
  return {
    total: alerts.length,
    today: alerts.filter(a => a.timestamp && a.timestamp >= today).length,
    unread: alerts.filter(a => !a.read && !a.dismissed).length,
    smart: alerts.filter(a => a.smart).length,
    manual: alerts.filter(a => !a.smart).length,
    byPriority: {
      critical: alerts.filter(a => a.priority === PRIORITY.CRITICAL).length,
      high: alerts.filter(a => a.priority === PRIORITY.HIGH).length,
      medium: alerts.filter(a => a.priority === PRIORITY.MEDIUM).length,
      low: alerts.filter(a => a.priority === PRIORITY.LOW).length,
    },
  };
}

// ─── تسجيل إذن Browser Notifications ──────────
export function requestNotificationPermission() {
  if (typeof window === 'undefined') return Promise.resolve('unsupported');
  if (!('Notification' in window)) return Promise.resolve('unsupported');
  
  if (Notification.permission === 'granted') return Promise.resolve('granted');
  if (Notification.permission === 'denied') return Promise.resolve('denied');
  
  return Notification.requestPermission();
}
