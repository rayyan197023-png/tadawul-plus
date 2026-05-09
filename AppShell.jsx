'use client';

import React, { lazy, Suspense, useEffect } from 'react';
import { RootStoreProvider } from './store/index';
import { useNav, useSharedPrices, useStockState } from './store';
import TadawulNav from './components/shared/TadawulNav';
import { TABS, TAB_IDS } from './constants/navigation';
import ErrorBoundary from './components/ErrorBoundary';
import { useLiveStockPrices } from './hooks/useLiveStockPrices';
import { useHaptic } from './hooks/useHaptic';
import { colors } from './theme/tokens';
import { getGlobalStyles } from './theme/globalStyles';
import PWAPrompt from './components/PWAPrompt';

const C = colors;

// ═══════════════════════════════════════════════
// 🚀 Lazy Load ALL Screens (true code splitting)
// ═══════════════════════════════════════════════

const HomeScreen        = lazy(() => import('./screens/HomeScreen'));
const StocksScreen      = lazy(() => import('./screens/StocksScreen'));
const AnalysisScreen    = lazy(() => import('./screens/AnalysisScreen'));
const PortfolioScreen   = lazy(() => import('./screens/PortfolioScreen'));
const NewsScreen        = lazy(() => import('./screens/NewsScreen'));
const AIScreen          = lazy(() => import('./screens/AIScreen'));
const MoreScreen        = lazy(() => import('./screens/MoreScreen'));
const BacktestScreen    = lazy(() => import('./screens/BacktestScreen'));
const RebalancingScreen = lazy(() => import('./screens/RebalancingScreen'));
const StockDetail       = lazy(() => import('./features/stock/StockDetail'));
const ChartScreen       = lazy(() => import('./features/chart/ChartScreen'));

const SCREEN_MAP = {
  [TAB_IDS.HOME]:        HomeScreen,
  [TAB_IDS.STOCKS]:      StocksScreen,
  [TAB_IDS.ANALYSIS]:    AnalysisScreen,
  [TAB_IDS.PORTFOLIO]:   PortfolioScreen,
  [TAB_IDS.NEWS]:        NewsScreen,
  [TAB_IDS.AI]:          AIScreen,
  [TAB_IDS.MORE]:        MoreScreen,
  [TAB_IDS.BACKTEST]:    BacktestScreen,
  [TAB_IDS.REBALANCING]: RebalancingScreen,
};

// ═══════════════════════════════════════════════
// 🎨 Loader Component (Branded)
// ═══════════════════════════════════════════════

function Loader() {
  return (
    <div style={{ 
      padding: 16, 
      minHeight: '60vh',
    }}>
      {/* Skeleton placeholder */}
      <div style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        borderRadius: 16,
        border: `1px solid ${C.line}`,
        padding: 16,
        marginBottom: 12,
      }}>
        <div style={{
          width: '50%',
          height: 18,
          borderRadius: 8,
          background: `linear-gradient(90deg, ${C.layer1} 25%, ${C.layer2} 50%, ${C.layer1} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'skelShimmer 1.5s ease-in-out infinite',
          marginBottom: 12,
        }} />
        <div style={{
          width: '80%',
          height: 24,
          borderRadius: 8,
          background: `linear-gradient(90deg, ${C.layer1} 25%, ${C.layer2} 50%, ${C.layer1} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'skelShimmer 1.5s ease-in-out infinite',
        }} />
      </div>
      
      {/* Cards skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
          borderRadius: 14,
          border: `1px solid ${C.line}`,
          padding: 14,
          marginBottom: 10,
          height: 120,
          background: `linear-gradient(90deg, ${C.layer1} 25%, ${C.layer2} 50%, ${C.layer1} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'skelShimmer 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      
      <style>{`
        @keyframes skelShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════
// 🏗️ Shell Component (Main App Logic)
// ═══════════════════════════════════════════════

function Shell() {
  const { activeTab, isStockOpen, activeStock, closeStock } = useNav();
  const haptic = useHaptic();
  const { priceCache } = useStockState();
  const [expandedChart, setExpandedChart] = React.useState(false);
  
  const [watchlist, setWatchlist] = React.useState(() => {
    try {
      const r = typeof window !== 'undefined' && window.localStorage.getItem('tadawul_watchlist');
      return r ? JSON.parse(r) : [
        { sym: '2222', name: 'أرامكو', color: '#f0c050' },
        { sym: '1120', name: 'الراجحي', color: '#4d9fff' }
      ];
    } catch (e) { 
      return []; 
    }
  });
  
  const wlSyms = React.useMemo(() => watchlist.map(w => w.sym), [watchlist]);

  const [snapshots, setSnapshots] = React.useState([]);
const [snapOpen, setSnapOpen] = React.useState(false);
const [aiAnalysis, setAiAnalysis] = React.useState(null);

  const COMM_DEFAULT = [
    { sym: 'خام برنت', cat: 'نفط',    price: 68.93, ch: -6.35, pct: -8.39, color: '#f59e0b' },
    { sym: 'الذهب',    cat: 'معادن',  price: 2944,  ch: 32,    pct: 1.11,  color: '#f0c050' },
    { sym: 'S&P 500',  cat: 'مؤشرات', price: 5570,  ch: -120,  pct: -2.10, color: '#4d9fff' },
    { sym: 'الدولار',  cat: 'عملات',  price: 102.84,ch: -0.26, pct: -0.25, color: '#22d3ee' },
  ];
  const [commData, setCommData] = React.useState(COMM_DEFAULT);

  useLiveStockPrices();

  // ═══════════════════════════════════════════════
  // 🎯 Smart Preloading (on idle)
  // ═══════════════════════════════════════════════
  
    useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // ✨ Web Vitals reporting (Real User Monitoring)
    import('./lib/webVitals').then(({ reportWebVitals }) => {
      reportWebVitals();
    });
        // ✨ Service Worker - UNREGISTER OLD VERSIONS (debug)
import('./lib/registerSW').then(({ unregisterServiceWorker }) => {
  unregisterServiceWorker();
});
    
        // ✨ Smart Alerts Engine - يستخدم analyzeStockRadar (deep analysis)
    let alertsInterval;
    let alertsInitialTimer;
    const initAlerts = async () => {
      try {
        const { runSmartAlertsEngine, requestNotificationPermission } = await import('./engines/smartAlertsEngine');
        const { STOCKS } = await import('./constants/stocksData');
        const { analyzeStockRadar } = await import('./engines/analysisEngine');
        
        // طلب إذن Browser Notifications
        requestNotificationPermission();
        
        const runEngine = () => {
          try {
            // إعداد بيانات الأسهم باستخدام analyzeStockRadar (التحليل العميق)
            const stocksForAnalysis = STOCKS.map(stock => {
              try {
                const analysis = analyzeStockRadar(stock);
                return {
                  sym: stock.sym,
                  name: stock.name,
                  p: stock.p,
                  pct: stock.pct,
                  health: analysis.total,
                  rsi: analysis.mom?.rsi || 50,
                  macd: analysis.mom?.macd ? 'bullish' : 'bearish',
                  bos: analysis.ms?.bosBull ? 'bullish' : (analysis.ms?.bosBear ? 'bearish' : null),
                  choch: analysis.ms?.choch || false,
                  oversold: analysis.mom?.oversold || false,
                  overbought: analysis.mom?.overbought || false,
                  smDetected: analysis.liq?.smDetected || false,
                  cats: analysis.cats || [],
                  target: analysis.target,
                  stop: analysis.stop,
                  scoreCol: analysis.scoreCol,
                };
              } catch (e) {
                return null;
              }
            }).filter(s => s !== null);
            
            // جلب المحفظة
            let positions = [];
            try {
              const portRaw = window.localStorage.getItem('tp_port');
              if (portRaw) positions = JSON.parse(portRaw);
            } catch (e) {}
            
            // تشغيل المحرك
            const result = runSmartAlertsEngine(stocksForAnalysis, positions, {
              enableBrowserNotif: true,
              enableSound: true,
            });
            
            if (result.count > 0) {
              console.log(`🔔 Smart Alerts: ${result.count} new alerts`, result.summary);
            }
          } catch (e) {
            console.warn('[Alerts] Run failed:', e.message);
          }
        };
        
        // أول تشغيل بعد 10 ثوان
        alertsInitialTimer = setTimeout(runEngine, 10000);
        
        // ثم كل 30 ثانية
        alertsInterval = setInterval(runEngine, 30000);
      } catch (e) {
        console.warn('[Alerts] Init failed:', e.message);
      }
    };
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initAlerts, { timeout: 3000 });
    } else {
      setTimeout(initAlerts, 3000);
    }

    // Preload most-used screens after initial paint
    const preloadScreens = () => {
      // Priority 1: Most used (Stocks, Analysis)
      import('./screens/StocksScreen');
      import('./screens/AnalysisScreen');
    };
    
    const preloadSecondary = () => {
      // Priority 2: Common (Portfolio, AI)
      import('./screens/PortfolioScreen');
      import('./screens/AIScreen');
    };
    
    const preloadTertiary = () => {
      // Priority 3: Less common (News, More, Backtest, Rebalancing)
      import('./screens/NewsScreen');
      import('./screens/MoreScreen');
    };
    
    // Use requestIdleCallback if available (smart preloading)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preloadScreens(), { timeout: 2000 });
      requestIdleCallback(() => preloadSecondary(), { timeout: 4000 });
      requestIdleCallback(() => preloadTertiary(), { timeout: 6000 });
    } else {
      // Fallback: setTimeout with delays
      setTimeout(preloadScreens, 2000);
      setTimeout(preloadSecondary, 4000);
      setTimeout(preloadTertiary, 6000);
    }
  }, []);

  // ═══════════════════════════════════════════════
  // 📨 Message Handler (Snapshots + AI)
  // ═══════════════════════════════════════════════
  
  React.useEffect(() => {
    function handleMessage(e) {
      const d = e.data;
      if (d && d.type === 'AI_CHART_ANALYSIS') { 
        setAiAnalysis(d); 
        return; 
      }
      if (!d || d.type !== 'TADAWUL_SNAPSHOT') return;
      setSnapshots(prev => [{
  id: Date.now(), 
  sym: d.sym || '', 
  name: d.name || '',
  date: new Date().toISOString().slice(0, 16).replace('T', ' '),
  color: '#f0c050', 
  tag: 'تحليل فني',
  chartImage: d.chartImage || null,
  price: d.price || null,
  rsi: d.rsi || null,
  macd: d.macd || null,
  per: d.per || '',
}, ...prev.slice(0, 19)]);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const liveStock = activeStock && priceCache[activeStock.sym]
    ? { ...activeStock, ...priceCache[activeStock.sym] }
    : activeStock;

  const tabDef = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const ActiveScreen = SCREEN_MAP[activeTab] ?? HomeScreen;

  return (
    <div style={{
      minHeight: '100dvh',
      height: '100dvh',
      maxWidth: 480,
      margin: '0 auto',
      background: `radial-gradient(ellipse 120% 80% at 50% 100%,${tabDef.glowBg} 0%,${C.bg} 55%)`,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: "'Cairo','Segoe UI',sans-serif",
      direction: 'rtl',
      paddingTop: 'env(safe-area-inset-top)',
    }}>

      {/* Content Area */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'scroll',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 100,
      }}>
        <ErrorBoundary label="الشاشة الرئيسية">
          <Suspense key={activeTab} fallback={<Loader />}>
            {activeTab === TAB_IDS.MORE
              ? <ActiveScreen
                  snapshots={snapshots}
                  setSnapshots={setSnapshots}
                  snapOpen={snapOpen}
                  setSnapOpen={setSnapOpen}
                  watchlist={watchlist}
                  setWatchlist={setWatchlist}
                  commData={commData}
                  setCommData={setCommData}
                />
              : activeTab === TAB_IDS.AI
              ? <ActiveScreen
                  aiAnalysis={aiAnalysis}
                  onClearAnalysis={() => setAiAnalysis(null)}
                  commData={commData}
                />
              : activeTab === TAB_IDS.ANALYSIS
              ? <ActiveScreen commData={commData} />
              : <ActiveScreen />
            }
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Bottom Navigation */}
      <div id="tadawul-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        zIndex: 50,
        display: 'block',
      }}>
        <TadawulNav />
      </div>

      {/* Stock Detail */}
      {isStockOpen && liveStock && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: expandedChart ? 500 : 200, 
          background: C.bg 
        }}>
          <ErrorBoundary label="صفحة السهم">
            <Suspense fallback={<Loader />}>
              <StockDetail
                stk={liveStock}
                onClose={() => { 
                  haptic.tap(); 
                  closeStock(); 
                  setExpandedChart(false); 
                }}
                wl={wlSyms}
                onExpand={() => setExpandedChart(true)}
                toggleStar={(sym) => {
                  setWatchlist(prev =>
                    prev.some(w => w.sym === sym)
                      ? prev.filter(w => w.sym !== sym)
                      : [...prev, { sym, name: sym, color: '#f0c050' }]
                  );
                }}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      
      {/* Expanded Chart */}
      {expandedChart && liveStock && (
        <Suspense fallback={<div />}>
          <ChartScreen
            stk={liveStock}
            onClose={() => setExpandedChart(false)}
          />
        </Suspense>
      )}
      
      <PWAPrompt />
    </div>
  );
}

// ═══════════════════════════════════════════════
// 🚀 Main AppShell (Entry Point)
// ═══════════════════════════════════════════════

export default function AppShell() {
  // Inject global styles once
  useEffect(() => {
    const id = 'tadawul-global';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = getGlobalStyles();
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  return (
    <RootStoreProvider>
      <Shell />
    </RootStoreProvider>
  );
}
