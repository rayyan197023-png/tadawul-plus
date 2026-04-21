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
const ChartScreen = lazy(() => import('./features/chart/ChartScreen'));
const C = colors;

const HomeScreen      = lazy(() => import('./screens/HomeScreen'));
const StocksScreen    = lazy(() => import('./screens/StocksScreen'));
const AnalysisScreen  = lazy(() => import('./screens/AnalysisScreen'));
const PortfolioScreen = lazy(() => import('./screens/PortfolioScreen'));
const NewsScreen      = lazy(() => import('./screens/NewsScreen'));
const AIScreen        = lazy(() => import('./screens/AIScreen'));
const MoreScreen      = lazy(() => import('./screens/MoreScreen'));
const StockDetail     = lazy(() => import('./features/stock/StockDetail'));

const SCREEN_MAP = {
  [TAB_IDS.HOME]:      HomeScreen,
  [TAB_IDS.STOCKS]:    StocksScreen,
  [TAB_IDS.ANALYSIS]:  AnalysisScreen,
  [TAB_IDS.PORTFOLIO]: PortfolioScreen,
  [TAB_IDS.NEWS]:      NewsScreen,
  [TAB_IDS.AI]:        AIScreen,
  [TAB_IDS.MORE]:      MoreScreen,
    [TAB_IDS.BACKTEST]:  BacktestScreen,
};

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:40, color:C.gold, fontFamily:'Cairo' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', border:'3px solid #222', borderTopColor:C.gold, animation:'spin .8s linear infinite', margin:'0 auto 10px' }} />
        <div style={{ fontSize:12 }}>جاري التحميل...</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Shell() {
  const { activeTab, isStockOpen, activeStock, closeStock } = useNav();
  const haptic = useHaptic();
  const { priceCache } = useStockState();
  const [expandedChart, setExpandedChart] = React.useState(false);
  const [watchlist, setWatchlist] = React.useState(() => {
    try {
      const r = typeof window !== 'undefined' && window.localStorage.getItem('tadawul_watchlist');
      return r ? JSON.parse(r) : [{sym:'2222',name:'أرامكو',color:'#f0c050'},{sym:'1120',name:'الراجحي',color:'#4d9fff'}];
    } catch(e) { return []; }
  });
  const wlSyms = React.useMemo(() => watchlist.map(w => w.sym), [watchlist]);

  const [snapshots, setSnapshots] = React.useState([]);
  const [aiAnalysis, setAiAnalysis] = React.useState(null);

  const COMM_DEFAULT = [
    {sym:'خام برنت', cat:'نفط',    price:68.93, ch:-6.35, pct:-8.39, color:'#f59e0b'},
    {sym:'الذهب',    cat:'معادن',  price:2944,  ch:32,    pct:1.11,  color:'#f0c050'},
    {sym:'S&P 500',  cat:'مؤشرات', price:5570,  ch:-120,  pct:-2.10, color:'#4d9fff'},
    {sym:'الدولار',  cat:'عملات',  price:102.84,ch:-0.26, pct:-0.25, color:'#22d3ee'},
  ];
  const [commData, setCommData] = React.useState(COMM_DEFAULT);

  useLiveStockPrices();

  React.useEffect(() => {
    function handleMessage(e) {
      const d = e.data;
      if (d && d.type === 'AI_CHART_ANALYSIS') { setAiAnalysis(d); return; }
      if (!d || d.type !== 'TADAWUL_SNAPSHOT') return;
      setSnapshots(prev => [{
        id: Date.now(), sym: d.sym||'', name: d.name||'',
        date: new Date().toISOString().slice(0,16).replace('T',' '),
        color: '#f0c050', tag: 'تحليل فني',
      }, ...prev.slice(0,19)]);
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
      /* حُذف overflow:hidden — كان يمنع السحب */
      fontFamily: "'Cairo','Segoe UI',sans-serif",
      direction: 'rtl',
      paddingTop: 'env(safe-area-inset-top)',
    }}>

      {/* منطقة المحتوى — قابلة للسحب */}
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

      {/* شريط التنقل السفلي */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        zIndex: 100,
      }}>
        <TadawulNav />
      </div>

      {/* صفحة تفاصيل السهم */}
      {isStockOpen && liveStock && (
        <div style={{ position:'fixed', inset:0, zIndex:expandedChart?500:200, background:C.bg }}>
          <ErrorBoundary label="صفحة السهم">
            <Suspense fallback={<Loader />}>
              <StockDetail
  stk={liveStock}
  onClose={() => { haptic.tap(); closeStock(); setExpandedChart(false); }}
  wl={wlSyms}
  onExpand={() => setExpandedChart(true)}
  toggleStar={(sym) => {
                  setWatchlist(prev =>
                    prev.some(w => w.sym === sym)
                      ? prev.filter(w => w.sym !== sym)
                      : [...prev, {sym, name:sym, color:'#f0c050'}]
                  );
                }}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {expandedChart && liveStock && (
  <Suspense fallback={<div/>}>
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

export default function AppShell() {
  useEffect(() => {
  import('./screens/StocksScreen');
  import('./screens/AnalysisScreen');
  import('./screens/PortfolioScreen');
  import('./screens/NewsScreen');
  import('./screens/AIScreen');
  import('./screens/MoreScreen');
}, []);

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
