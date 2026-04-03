'use client';

/**
 * APP SHELL — Next.js Version
 * Root component: stores + nav + screens + StockDetail + PWA
 */

import React, { lazy, Suspense, useEffect } from 'react';
import { RootStoreProvider }   from './store/index';
import { useNav, useSharedPrices, useStockState } from './store';
import TadawulNav from './components/shared/TadawulNav';
import { TABS, TAB_IDS } from './constants/navigation';
import PWAPrompt               from './components/PWAPrompt';
import ErrorBoundary           from './components/ErrorBoundary';
import { getGlobalStyles }     from './theme/globalStyles';
import { useLiveStockPrices }  from './hooks/useLiveStockPrices';
import { useHaptic }          from './hooks/useHaptic';
import ChartScreen             from './features/chart/ChartScreen';
import { colors }              from './theme/tokens';

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
  const { activeTab, isStockOpen, activeStock, closeStock, setTab } = useNav();
  const haptic = useHaptic();
  const [chartStock, setChartStock] = React.useState(null);
  const [snapshots,   setSnapshots]  = React.useState([]);

  // ── قائمة المتابعة — مشتركة بين StockDetail ↔ MoreScreen ───────
  const [watchlist, setWatchlist] = React.useState(() => {
    try {
      const r = typeof window !== 'undefined' && window.localStorage.getItem('tadawul_watchlist');
      return r ? JSON.parse(r) : [
        {sym:'2222',name:'أرامكو',  color:'#f0c050'},
        {sym:'1120',name:'الراجحي', color:'#4d9fff'},
        {sym:'2010',name:'سابك',    color:'#1ee68a'},
      ];
    } catch(e) { return []; }
  });

  // toggleStar: يضيف أو يزيل السهم من قائمة المتابعة
  const toggleStar = React.useCallback((sym) => {
    haptic.toggle(); // نبضة عند إضافة/إزالة من المتابعة
    setWatchlist(prev => {
      const exists = prev.some(w => w.sym === sym);
      let next;
      if (exists) {
        next = prev.filter(w => w.sym !== sym);
      } else {
        // جلب اسم السهم من allStocks أو activeStock
        const name = activeStock?.sym === sym ? activeStock.name : sym;
        next = [...prev, { sym, name, color: '#f0c050' }];
      }
      try { window.localStorage.setItem('tadawul_watchlist', JSON.stringify(next)); } catch(e) {}
      return next;
    });
  }, [activeStock]);

  // مصفوفة الرموز فقط — يحتاجها StockDetail لتحديد starred
  const wlSyms = React.useMemo(() => watchlist.map(w => w.sym), [watchlist]);
  const [aiAnalysis,  setAiAnalysis] = React.useState(null);

  // ── بيانات الأسعار العالمية (نفط + ذهب + دولار + مؤشرات) ──────────
  const COMM_DEFAULT = [
    {sym:'خام برنت', cat:'نفط',    price:68.93, ch:-6.35, pct:-8.39, color:'#f59e0b'},
    {sym:'خام WTI',  cat:'نفط',    price:65.76, ch:-6.65, pct:-9.14, color:'#f59e0b'},
    {sym:'الذهب',    cat:'معادن',  price:2944,  ch:32,    pct:1.11,  color:'#f0c050'},
    {sym:'الفضة',    cat:'معادن',  price:33.12, ch:0.44,  pct:1.35,  color:'#94a3b8'},
    {sym:'S&P 500',  cat:'مؤشرات', price:5570,  ch:-120,  pct:-2.10, color:'#4d9fff'},
    {sym:'داو جونز', cat:'مؤشرات', price:41583, ch:-29,   pct:-0.07, color:'#a78bfa'},
    {sym:'ناسداك',   cat:'مؤشرات', price:17280, ch:-180,  pct:-1.03, color:'#22d3ee'},
    {sym:'الدولار',  cat:'عملات',  price:102.84,ch:-0.26, pct:-0.25, color:'#22d3ee'},
  ];
  const [commData,   setCommData]   = React.useState(COMM_DEFAULT);
  const [commTs,     setCommTs]     = React.useState(null); // timestamp آخر تحديث

  // جلب أسعار السلع كل 10 دقائق عبر Twelve Data
  React.useEffect(() => {
    const TD_KEY = process.env.NEXT_PUBLIC_TWELVE_KEY || '';
    if (!TD_KEY) return; // بدون مفتاح → بيانات افتراضية فقط

    const symbols   = ['BZ:CUR','USOIL','XAU/USD','XAG/USD','SPX','DJI','IXIC','DXY'];
    const commNames = ['خام برنت','خام WTI','الذهب','الفضة','S&P 500','داو جونز','ناسداك','الدولار'];

    async function fetchComm() {
      try {
        const reqs = symbols.map(sym =>
          fetch(`https://api.twelvedata.com/price?symbol=${encodeURIComponent(sym)}&apikey=${TD_KEY}`)
            .then(r => r.json()).catch(() => null)
        );
        const results = await Promise.all(reqs);
        setCommData(prev => prev.map(c => {
          const idx = commNames.indexOf(c.sym);
          if (idx < 0) return c;
          const res = results[idx];
          if (!res?.price) return c;
          const price = parseFloat(parseFloat(res.price).toFixed(2));
          if (!price || price <= 0) return c;
          const ch  = parseFloat((price - c.price).toFixed(2));
          const pct = parseFloat((ch / c.price * 100).toFixed(2));
          return { ...c, price, ch, pct };
        }));
        setCommTs(Date.now());
      } catch(e) {}
    }

    fetchComm();
    const t = setInterval(fetchComm, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── CANONICAL SOURCE OF TRUTH FOR SELECTED STOCK ──────────────────
  //
  // Flow:
  //   1. user taps stock anywhere in app
  //   2. navStore.openStock(stk) is called
  //   3. navStore.activeStock = stk (snapshot from stocksData/stockStore)
  //   4. HERE: we merge live priceCache on top → liveStock
  //   5. StockDetail receives liveStock — always has latest price
  //
  // Ownership:
  //   navStore     → which stock is open (symbol + snapshot)
  //   stockStore   → all stocks list + priceCache (live prices)
  //   AppShell     → merges them into liveStock (single canonical view)
  //   StockDetail  → reads only liveStock (never direct from stores)
  //
  // stockStore.selected was removed — navStore.activeStock is canonical.
  // ───────────────────────────────────────────────────────────────────

  // Live price polling — production mode: fetches from EODHD
  useLiveStockPrices();
  // Demo simulation — starts GBM price simulation for ALL screens
  // useSharedPrices() dispatches UPDATE_PRICES every 3s → shared priceCache
  useSharedPrices();

  // ── استقبال لقطات الشارت وتمريرها لـ MoreScreen ──────────────────
  React.useEffect(() => {
    function handleMessage(e) {
      const d = e.data;
      // ── AI Chart Analysis export ──────────────────────────────────
      if (d && d.type === 'AI_CHART_ANALYSIS') {
        setAiAnalysis(d);
        return;
      }
      if (!d || d.type !== 'TADAWUL_SNAPSHOT') return;
      const now = new Date();
      const ds = now.getFullYear() + '-' +
        String(now.getMonth()+1).padStart(2,'0') + '-' +
        String(now.getDate()).padStart(2,'0') + ' ' +
        String(now.getHours()).padStart(2,'0') + ':' +
        String(now.getMinutes()).padStart(2,'0');
      const cols = ['#1ee68a','#4d9fff','#f0c050','#ff5f6a','#a78bfa','#22d3ee','#fbbf24'];
      const col  = cols[Math.floor(Math.random() * cols.length)];
      const snap = {
        id:        Date.now(),
        sym:       d.sym   || '',
        name:      d.name  || '',
        date:      ds,
        note:      (d.name || '') + ' — ' + (d.per || ''),
        color:     col,
        tag:       'تحليل فني',
        snapPrice: d.price || null,
        rsi:       d.rsi   || null,
        macd:      d.macd  || null,
        vol:       d.vol   ? ((d.vol / 1e6).toFixed(1) + 'M') : null,
      };
      setSnapshots(prev => [snap, ...prev.slice(0, 19)]);
      // navigate to More → snapshots tab
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  const { priceCache } = useStockState();
  // Merge live priceCache into activeStock so StockDetail always shows latest price
  const liveStock = activeStock && priceCache[activeStock.sym]
    ? { ...activeStock, ...priceCache[activeStock.sym] }
    : activeStock;
  const tabDef       = TABS.find(t => t.id === activeTab) ?? TABS[0];
  const ActiveScreen = SCREEN_MAP[activeTab] ?? HomeScreen;

  return (
    <div style={{
      minHeight:'100dvh', maxWidth:480, margin:'0 auto',
      background:`radial-gradient(ellipse 120% 80% at 50% 100%,${tabDef.glowBg} 0%,${C.bg} 55%)`,
      display:'flex', flexDirection:'column',
      position:'relative', overflow:'hidden',
      transition:'background .7s ease',
      fontFamily:"'Cairo','Segoe UI',sans-serif",
      direction:'rtl',
      paddingTop:'env(safe-area-inset-top)',
    }}>

      {/* Screen content */}
      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', WebkitOverflowScrolling:'touch', paddingBottom:80 }}>
        <ErrorBoundary label="الشاشة الرئيسية" fallback={<div style={{color:'red',padding:20}}>خطأ في الشاشة</div>}>
          <Suspense fallback={<Loader />}>
            {activeTab === TAB_IDS.MORE
              ? <ActiveScreen snapshots={snapshots} setSnapshots={setSnapshots} watchlist={watchlist} setWatchlist={setWatchlist} commData={commData} setCommData={setCommData} />
              : activeTab === TAB_IDS.AI
              ? <ActiveScreen aiAnalysis={aiAnalysis} onClearAnalysis={() => setAiAnalysis(null)} commData={commData} />
              : activeTab === TAB_IDS.ANALYSIS
              ? <ActiveScreen commData={commData} />
              : activeTab === 'home' 
  ? <div style={{color:'white',padding:40,fontSize:18}}>التطبيق يعمل! عدد الأسهم يظهر هنا</div>
  : <ActiveScreen />

            }
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Nav bar */}
      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, zIndex:100 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'24px 24px 0 0', overflow:'hidden', paddingBottom:'env(safe-area-inset-bottom)' }}>
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
              <StockDetail stk={liveStock} onClose={() => { haptic.tap(); closeStock(); }} onExpand={() => setChartStock(liveStock)} wl={wlSyms} toggleStar={toggleStar} />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Chart Screen overlay */}
      {chartStock && (
        <ChartScreen stk={chartStock} onClose={() => setChartStock(null)} />
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
