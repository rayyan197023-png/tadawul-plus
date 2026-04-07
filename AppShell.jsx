'use client';

/**
 * APP SHELL — Next.js Version
 * Root component: stores + nav + screens + StockDetail + PWA
 */

import { lazy, Suspense, useEffect } from 'react';
import { RootStoreProvider }   from './store/index';
import { useNav }              from './store';
import { useStockState }       from './store';
import TadawulNav from './components/shared/TadawulNav';
import PWAPrompt               from './components/PWAPrompt';
import ErrorBoundary           from './components/ErrorBoundary';
import { getGlobalStyles }     from './theme/globalStyles';
import { colors }              from './theme/tokens';
import { TAB_IDS }             from './constants/navigation';

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
};

function Loader() {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:C.bg }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:`3px solid ${C.layer3}`, borderTopColor:C.gold, animation:'shellSpin .8s linear infinite' }} />
      <style>{`@keyframes shellSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Shell() {
  const { activeTab, isStockOpen, activeStock, closeStock } = useNav();
  const { priceCache } = useStockState();
  // Merge live priceCache into activeStock so StockDetail always shows latest price
  const liveStock = activeStock && priceCache[activeStock.sym]
    ? { ...activeStock, ...priceCache[activeStock.sym] }
    : activeStock;
  const tabDef       = TABS_WITH_ICONS.find(t => t.id === activeTab) ?? TABS_WITH_ICONS[0];
  const ActiveScreen = SCREEN_MAP[activeTab] ?? HomeScreen;

  return (
    <div style={{
      minHeight:'100dvh', maxWidth:480, margin:'0 auto',
      background:`radial-gradient(ellipse 120% 80% at 50% 100%,${tabDef.glowBg} 0%,${C.bg} 55%)`,
      display:'flex', flexDirection:'column',
      position:'relative', overflow:'hidden',
      transition:'background .7s ease',
    }}>

      {/* Screen content */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch', paddingBottom:80 }}>
        <ErrorBoundary label="الشاشة الرئيسية">
          <Suspense fallback={<Loader />}>
            <ActiveScreen />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Nav bar */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, zIndex:100 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'24px 24px 0 0', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:`linear-gradient(180deg,${C.bgDeep}ee 0%,${C.bg}f8 60%,${C.bg}ff 100%)` }} />
          <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${C.gold}60 35%,${C.gold}90 50%,${C.gold}60 65%,transparent)` }} />
          <div style={{ position:'absolute', top:0, left:0, right:0, height:40, background:`linear-gradient(180deg,${tabDef.glowBg} 0%,transparent 100%)`, transition:'background .5s' }} />
        </div>
        <TadawulNav />
      </div>

      {/* Stock detail overlay */}
      {isStockOpen && liveStock && (
        <div style={{ position:'fixed', inset:0, zIndex:200, background:C.bg, animation:'shellSlide .35s cubic-bezier(.34,1.56,.64,1)' }}>
          <ErrorBoundary label="صفحة السهم">
            <Suspense fallback={<Loader />}>
              <StockDetail stk={liveStock} onClose={closeStock} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* PWA install prompt */}
      <PWAPrompt />

      <style>{`
        @keyframes shellSlide { from{transform:translateY(100%);opacity:.8} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}

export default function AppShell() {
  useEffect(() => {
    const id = 'tadawul-global';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id    = id;
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
