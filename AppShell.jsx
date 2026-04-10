'use client';

import React, { lazy, Suspense, useEffect } from 'react';
import { RootStoreProvider } from './store/index';
import { useNav } from './store';
import TadawulNav from './components/shared/TadawulNav';
import { TABS, TAB_IDS } from './constants/navigation';
import ErrorBoundary from './components/ErrorBoundary';
import { colors } from './theme/tokens';

const C = colors;

const HomeScreen = lazy(() => import('./screens/HomeScreen'));
const StocksScreen = lazy(() => import('./screens/StocksScreen'));
const AnalysisScreen = lazy(() => import('./screens/AnalysisScreen'));
const PortfolioScreen = lazy(() => import('./screens/PortfolioScreen'));
const NewsScreen = lazy(() => import('./screens/NewsScreen'));
const AIScreen = lazy(() => import('./screens/AIScreen'));
const MoreScreen = lazy(() => import('./screens/MoreScreen'));

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
    <div style={{ padding:40, textAlign:'center', color:'#f0c050', fontFamily:'Cairo' }}>
      جاري التحميل...
    </div>
  );
}

function Shell() {
  const { activeTab, setTab } = useNav();
  const tabDef = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const ActiveScreen = SCREEN_MAP[activeTab] ?? HomeScreen;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#06080f',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Cairo','Segoe UI',sans-serif",
      direction: 'rtl',
      color: '#fff',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        <ErrorBoundary label="الشاشة الرئيسية">
          <Suspense fallback={<Loader />}>
            <ActiveScreen />
          </Suspense>
        </ErrorBoundary>
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 100 }}>
        <TadawulNav />
      </div>
    </div>
  );
}

export default function AppShell() {
  return (
    <RootStoreProvider>
      <Shell />
    </RootStoreProvider>
  );
}
