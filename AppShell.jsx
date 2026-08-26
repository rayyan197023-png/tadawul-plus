'use client';
import React, { lazy, Suspense, useEffect, useCallback } from 'react';
import { RootStoreProvider }  from './store/index';
import { useNav, useStockState } from './store';
import TadawulNav             from './components/shared/TadawulNav';
import { TABS, TAB_IDS }      from './constants/navigation';
import ErrorBoundary          from './components/ErrorBoundary';
import { usePriceUpdater }    from './hooks/usePriceUpdater';
import { useRef, useState } from 'react';
import { useMarketBridge }    from './hooks/useMarketBridge';
import { useHaptic }          from './hooks/useHaptic';
import { colors }             from './theme/tokens';
import { getGlobalStyles }    from './theme/globalStyles';

const C = colors;

const HomeScreen        = lazy(() => import('./screens/HomeScreen'));
const StocksScreen = lazy(() => import('./screens/StocksScreen'));
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

function Loader() {
  return (
    <div style={{ padding: 16, minHeight: '60vh' }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.layer1}, ${C.layer2})`,
        borderRadius: 16, border: `1px solid ${C.line}`,
        padding: 16, marginBottom: 12,
      }}>
        {[50, 80].map((w, i) => (
          <div key={i} style={{
            width: `${w}%`, height: i === 0 ? 18 : 24,
            borderRadius: 8, marginBottom: i === 0 ? 12 : 0,
            background: `linear-gradient(90deg, ${C.layer1} 25%, ${C.layer2} 50%, ${C.layer1} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'skelShimmer 1.5s ease-in-out infinite',
          }} />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          borderRadius: 14, border: `1px solid ${C.line}`,
          padding: 14, marginBottom: 10, height: 120,
          background: `linear-gradient(90deg, ${C.layer1} 25%, ${C.layer2} 50%, ${C.layer1} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'skelShimmer 1.5s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`
        @keyframes skelShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

function Shell() {
  const { activeTab, isStockOpen, activeStock, closeStock } = useNav();
  const haptic       = useHaptic();
  const { priceCache } = useStockState();

  const [expandedChart, setExpandedChart] = React.useState(false);
  const [snapshots,     setSnapshots]     = React.useState([]);
  const [snapOpen,      setSnapOpen]      = React.useState(false);
  const [aiAnalysis,    setAiAnalysis]    = React.useState(null);

  const [watchlist, setWatchlist] = React.useState(() => {
    try {
      const r = typeof window !== 'undefined'
        && window.localStorage.getItem('tadawul_watchlist');
      return r ? JSON.parse(r) : [
        { sym: '2222', name: 'أرامكو',  color: '#f0c050' },
        { sym: '1120', name: 'الراجحي', color: '#4d9fff' },
      ];
    } catch { return []; }
  });

  useEffect(() => {
    function refreshWatchlist() {
      try {
        const r = window.localStorage.getItem('tadawul_watchlist');
        if (r) { const fresh = JSON.parse(r); setWatchlist(fresh); }
      } catch {}
    }
    window.addEventListener('watchlist-updated', refreshWatchlist);
    return () => window.removeEventListener('watchlist-updated', refreshWatchlist);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('tadawul_watchlist', JSON.stringify(watchlist));
    } catch {}
  }, [watchlist]);

  const wlSyms = React.useMemo(() => watchlist.map(w => w.sym), [watchlist]);
  const [commData, setCommData] = React.useState([]);

  useMarketBridge();
  usePriceUpdater();

  useEffect(() => {
    const load = async () => {
      try {
        const { loadFundamentalsIntoStocks } = await import('./services/api/sahmkFundamentalsApi');
        const { STOCKS_MAP, STOCKS }         = await import('./constants/stocksData');
        // ✨ الزخم أولاً -- لا ينتظر جلب الأساسيات الطويل
        try {
          const _mc0 = await import('./services/api/momentumCache');
          _mc0.exposeMomentumCache();
          _mc0.loadMomentumBatch(STOCKS.map(s => s.sym))
            .then(function () { _mc0.exposeMomentumCache(); })
            .catch(function () {});
        } catch (e) {} 
         try { window.__STOCKS_MAP__ = STOCKS_MAP; } catch(e) {}
        await loadFundamentalsIntoStocks(STOCKS_MAP, STOCKS.map(s => s.sym));
        try { window.__STOCKS_MAP__ = STOCKS_MAP; } catch(e) {} 
  
      } catch (e) {
        console.warn('[Fundamentals]', e.message);
      }
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(load, { timeout: 5000 });
    } else {
      setTimeout(load, 5000);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    import('./lib/webVitals').then(({ reportWebVitals }) => reportWebVitals());
    import('./lib/registerSW').then(({ registerServiceWorker }) => registerServiceWorker());
    const _alertTimers = [];
    const initAlerts = async () => {
      try {
        const { runSmartAlertsEngine, requestNotificationPermission } =
          await import('./engines/smartAlertsEngine');
        const { analyzeStockRadar }   = await import('./engines/analysisEngine');

        requestNotificationPermission();

        const runEngine = async () => {
          try {
            // ✨ نُعيد الاستيراد كل مرة -- STOCKS_LIVE تُستبدل بمصفوفة جديدة عند كل تحديث سعري
            const { STOCKS_LIVE: STOCKS } = await import('./constants/stocksData');
            if (!STOCKS || STOCKS.length === 0) return;
            // ✨ نقرأ الشموع من كاش tp_hist_ -- بدونها analyzeStockRadar تُرجع 50 لكل سهم
            const _readBars = (sym) => {
              try {
                const raw = localStorage.getItem('tp_hist_' + sym);
                if (!raw) return [];
                const entry = JSON.parse(raw);
                if (!entry || !entry.bars || !entry.ts) return [];
                if ((Date.now() - entry.ts) >= 12 * 3600000) return [];
                return entry.bars.map((b, idx) => {
                  const prevC = idx > 0 ? entry.bars[idx - 1].c : b.o;
                  const pct = (prevC && prevC > 0) ? ((b.c - prevC) / prevC * 100) : 0;
                  return { o: b.o, open: b.o, c: b.c, close: b.c,
                           hi: b.hi, lo: b.lo, vol: b.v, pct: pct };
                }).filter(b => b.c > 0);
              } catch (e) { return []; }
            };

            const stocksForAnalysis = STOCKS
              .map(stock => {
                try {
                  const _bars = _readBars(stock.sym);
                  if (_bars.length < 15) return null;
                  const analysis = analyzeStockRadar(stock, _bars);
                  return {
                    sym: stock.sym, name: stock.name,
                    p: stock.p,     pct: stock.pct,
                    bars: _bars, 
                    health:      analysis.total,
                    sig:         analysis.total >= 65 ? 'شراء قوي' : analysis.total >= 55 ? 'مراقبة' : analysis.total >= 45 ? 'محايد' : 'تخفيف',
                    regime:      analysis.regime || 'chop',
                    atrPct:      analysis.atrPct,
                    vr:          analysis.liq?.rvNorm || 1, 
                    rsi:         analysis.mom?.rsi    || 50,
                    macd:        analysis.mom?.macd   ? 'bullish' : 'bearish',
                    bos:         analysis.ms?.bosBull ? 'bullish'
                                 : analysis.ms?.bosBear ? 'bearish' : null,
                    choch:       analysis.ms?.choch   || false,
                    oversold:    analysis.mom?.oversold  || false,
                    overbought:  analysis.mom?.overbought || false,
                    smDetected:  analysis.liq?.smDetected || false,
                    cats:        analysis.cats   || [],
                    target:      analysis.target,
                    stop:        analysis.stop,
                    scoreCol:    analysis.scoreCol,
                  };
                } catch { return null; }
              })
              .filter(Boolean);

            let positions = [];
            try {
              const raw = window.localStorage.getItem('tp_port');
              if (raw) positions = JSON.parse(raw);
            } catch {}

            runSmartAlertsEngine(stocksForAnalysis, positions, {
              enableBrowserNotif: true,
              enableSound: true,
            });
          } catch (e) {
            console.warn('[Alerts] Run failed:', e.message);
          }
        };

        // ✨ نحفظ المؤقتين للتنظيف -- كانا يتراكمان عند إعادة التركيب
        _alertTimers.push(setTimeout(runEngine, 45000));
        _alertTimers.push(setInterval(runEngine, 30000));
      } catch (e) {
        console.warn('[Alerts] Init failed:', e.message);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(initAlerts, { timeout: 3000 });
    } else {
      setTimeout(initAlerts, 3000);
    }

    const idle = (fn, t) => 'requestIdleCallback' in window
      ? requestIdleCallback(fn, { timeout: t })
      : setTimeout(fn, t);

    idle(() => { import('./screens/StocksScreen'); import('./screens/AnalysisScreen'); }, 2000);
    idle(() => { import('./screens/PortfolioScreen'); import('./screens/AIScreen'); }, 4000);
    idle(() => { import('./screens/NewsScreen'); import('./screens/MoreScreen'); }, 6000);

    return () => {
      _alertTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
    };
  }, []);

  useEffect(() => {
    function handleMessage(e) {
      const d = e.data;
      if (!d) return;
      if (d.type === 'AI_CHART_ANALYSIS') { setAiAnalysis(d); return; }
      if (d.type === 'TADAWUL_SNAPSHOT') {
        setSnapshots(prev => [{
          id: Date.now(), sym: d.sym || '', name: d.name || '',
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          color: '#f0c050', tag: 'تحليل فني',
          chartImage: d.chartImage || null, price: d.price || null,
          rsi: d.rsi || null, macd: d.macd || null, per: d.per || '',
        }, ...prev.slice(0, 19)]);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const liveStock = activeStock && priceCache[activeStock.sym]
    ? { ...activeStock, ...priceCache[activeStock.sym] }
    : activeStock;

  const tabDef       = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const ActiveScreen = SCREEN_MAP[activeTab] ?? HomeScreen;

  return (
    <div style={{
      minHeight: '100dvh', height: '100dvh',
      maxWidth: 480, margin: '0 auto',
      background: `radial-gradient(ellipse 120% 80% at 50% 100%,${tabDef.glowBg} 0%,${C.bg} 55%)`,
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      fontFamily: "'Cairo','Segoe UI',sans-serif",
      direction: 'rtl',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        overflowY: 'scroll', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
        paddingTop:    'env(safe-area-inset-top, 0px)',
      }}>
        <ErrorBoundary label="الشاشة الرئيسية">
          <Suspense key={activeTab} fallback={<Loader />}>
            {activeTab === TAB_IDS.MORE
              ? <ActiveScreen snapshots={snapshots} setSnapshots={setSnapshots}
                  snapOpen={snapOpen} setSnapOpen={setSnapOpen}
                  watchlist={watchlist} setWatchlist={setWatchlist}
                  commData={commData} setCommData={setCommData} />
              : activeTab === TAB_IDS.AI
              ? <ActiveScreen aiAnalysis={aiAnalysis}
                  onClearAnalysis={() => setAiAnalysis(null)}
                  commData={commData} />
              : activeTab === TAB_IDS.ANALYSIS
              ? <ActiveScreen commData={commData} />
              : <ActiveScreen />
            }
          </Suspense>
        </ErrorBoundary>
      </div>

      <div style={{
        position: 'fixed', bottom: 0,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 50,
      }}>
        <TadawulNav />
      </div>

      {isStockOpen && liveStock && (
        <div style={{ position: 'fixed', inset: 0, zIndex: expandedChart ? 500 : 200, background: C.bg }}>
          <ErrorBoundary label="صفحة السهم">
            <Suspense fallback={<Loader />}>
              <StockDetail
                stk={liveStock}
                onClose={() => { haptic.tap(); closeStock(); setExpandedChart(false); }}
                wl={wlSyms}
                onExpand={() => setExpandedChart(true)}
                toggleStar={sym => setWatchlist(prev =>
                  prev.some(w => w.sym === sym)
                    ? prev.filter(w => w.sym !== sym)
                    : [...prev, { sym, name: sym, color: '#f0c050' }]
                )}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {expandedChart && liveStock && (
        <Suspense fallback={<div />}>
          <ChartScreen stk={liveStock} onClose={() => setExpandedChart(false)} />
        </Suspense>
      )}
    </div>
  );
}

export default function AppShell() {
  useEffect(() => {
    const id = 'tadawul-global';
    if (document.getElementById(id)) return;

    const el = document.createElement('style');
    el.id = id;

    const savedFont  = localStorage.getItem('tadawul_font_size') || 'medium';
    const savedTheme = localStorage.getItem('tadawul_theme')     || 'dark';

    document.documentElement.setAttribute('data-theme', savedTheme === 'light' ? 'light' : 'dark');

    const fontScale = { small: '0.9', medium: '1', large: '1.12' };
    const zoomMap   = { small: '0.92', medium: '1', large: '1.1'  };
    document.documentElement.style.setProperty('--font-scale', fontScale[savedFont] || '1');
    document.documentElement.style.zoom = zoomMap[savedFont] || '1';

    el.textContent = getGlobalStyles() + `
      input, select, textarea { font-size: 16px !important; }
      input[type="number"], input[type="text"], input[type="search"],
      input[type="tel"], input[type="email"] { font-size: 16px !important; }
      html, body { height: 100dvh; height: 100svh; overscroll-behavior: none; }
      body { position: fixed; width: 100%; overflow: hidden; top: 0; left: 0; right: 0; bottom: 0; }
      #__next, #root { height: 100dvh; overflow: hidden; }
    `;

    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  return (
    <RootStoreProvider>
      <Shell />
    </RootStoreProvider>
  );
}
