'use client';
/**
 * STOCK STORE
 *
 * Owns:
 * - All stocks list (normalized)
 * - Selected stock (for detail view)
 * - Watchlist (persisted to localStorage)
 * - Price cache (sym → live price)
 * - Sort/filter preferences
 *
 * The watchlist is the ONLY data persisted to localStorage.
 * Everything else is in-memory.
 */

import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import config from '../constants/config';

// ── Persistence helpers (safe wrappers)
const LS_KEY_WATCHLIST = 'td_watchlist_v2';

function loadWatchlist() {
  try {
    const raw = localStorage.getItem(LS_KEY_WATCHLIST);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  try {
    localStorage.setItem(LS_KEY_WATCHLIST, JSON.stringify(list));
  } catch { /* storage full — silent fail */ }
}

// ── Action Types
export const STOCK_ACTIONS = {
  SET_STOCKS:        'SET_STOCKS',
  UPDATE_PRICE:      'UPDATE_PRICE',
  UPDATE_PRICES:     'UPDATE_PRICES',
  ADD_TO_WATCHLIST:  'ADD_TO_WATCHLIST',
  REMOVE_WATCHLIST:  'REMOVE_WATCHLIST',
  SET_SORT:          'SET_SORT',
  SET_FILTER:        'SET_FILTER',
  SET_LOADING:       'SET_LOADING',
};

// ── Initial State
function loadCachedStocks() {
  try {
    // امسح الكاش القديم دائماً -- سيُعاد بناؤه من API
    localStorage.removeItem('td_stocks_cache_v1');
    return [];
  } catch { return []; }
}

const initialState = {
  stocks: loadCachedStocks(),
  priceCache:  {},              // sym → { p, ch, pct, v, ts }

  watchlist:   loadWatchlist(), // Array of sym strings
  sort:        'volume',        // 'volume'|'gainers'|'losers'|'name'|'price'
  filter:      'all',           // sectorId or 'all'
  isLoading:   false,
};

// ── Reducer
function stockReducer(state, action) {
  switch (action.type) {

    case STOCK_ACTIONS.SET_STOCKS: {
  return { ...state, stocks: action.payload };
}
    case STOCK_ACTIONS.UPDATE_PRICE: {
      const { sym, data } = action.payload;
      return {
        ...state,
        priceCache: { ...state.priceCache, [sym]: { ...data, ts: Date.now() } },
      };
    }

    case STOCK_ACTIONS.UPDATE_PRICES: {
      const updates = {};
      (Array.isArray(action.payload) ? action.payload : Object.values(action.payload)).forEach(({ sym, data }) => {
        updates[sym] = { ...data, ts: Date.now() };
      });
      return { ...state, priceCache: { ...state.priceCache, ...updates } };
    }

    case STOCK_ACTIONS.ADD_TO_WATCHLIST: {
      if (state.watchlist.includes(action.payload)) return state;
      const next = [...state.watchlist, action.payload];
      saveWatchlist(next);
      return { ...state, watchlist: next };
    }

    case STOCK_ACTIONS.REMOVE_WATCHLIST: {
      const next = state.watchlist.filter(s => s !== action.payload);
      saveWatchlist(next);
      return { ...state, watchlist: next };
    }

    case STOCK_ACTIONS.SET_SORT:
      return { ...state, sort: action.payload };

    case STOCK_ACTIONS.SET_FILTER:
      return { ...state, filter: action.payload };
case 'SET_STOCKS_FROM_API': {
  const newStocks = action.payload.map(u => ({
    sym: u.sym,
    name: u.data.name || u.sym,
    sec: '',
    sectorId: '',
    p: u.data.p,
    ch: u.data.ch,
    pct: u.data.pct,
    v: u.data.v,
    avgV: 0, hi: 0, lo: 0,
    w52h: null, w52l: null,
    target: null, eps: null, pe: null,
    pb: null, divY: null, roe: null,
    mktCap: null, debt: null,
    revGrw: null, epsGrw: null,
    freeCashFlow: null, beta: null,
    oilCorr: null, rating: 50,
    desc: null, earnDate: null,
  }));
  // دمج مع الأسهم الموجودة
  const existingSyms = new Set(state.stocks.map(s => s.sym));
  const merged = [...state.stocks];
  newStocks.forEach(s => {
    if (!existingSyms.has(s.sym)) merged.push(s);
    else {
      const idx = merged.findIndex(x => x.sym === s.sym);
      if (idx >= 0) merged[idx] = { ...merged[idx], name: s.name };
    }
  });
  return { ...state, stocks: merged };
}
    case STOCK_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
}

// ── Context
const StockStateContext    = createContext(initialState);
const StockDispatchContext = createContext(null);

// ── Provider
export function StockProvider({ children }) {
  const [state, dispatch] = useReducer(stockReducer, initialState);
  return (
    <StockDispatchContext.Provider value={dispatch}>
      <StockStateContext.Provider value={state}>
        {children}
      </StockStateContext.Provider>
    </StockDispatchContext.Provider>
  );
}

// ── Base hooks
export function useStockState() {
  return useContext(StockStateContext);
}

export function useStockDispatch() {
  const d = useContext(StockDispatchContext);
  if (!d) throw new Error('useStockDispatch must be within StockProvider');
  return d;
}

// ── Composed hook
export function useStocks() {
  const state    = useStockState();
  const dispatch = useStockDispatch();

  // Merge live prices into stock objects
  const stocksWithLivePrices = state.stocks.map(s => {
    const live = state.priceCache[s.sym];
    if (!live) return s;
   return {
  ...s,
  p:   live.p,
  ch:  live.ch,
  pct: live.pct,
  v:   live.v,
  name: live.name || s.name,
};
  });

  // Apply filter
  const filtered = state.filter === 'all'
    ? stocksWithLivePrices
    : stocksWithLivePrices.filter(s => s.sectorId === state.filter);

  // Apply sort
  const sorted = [...filtered].sort((a, b) => {
    switch (state.sort) {
      case 'gainers':  return b.pct - a.pct;
      case 'losers':   return a.pct - b.pct;
      case 'volume':   return b.v   - a.v;
      case 'price':    return b.p   - a.p;
      case 'name':     return a.name.localeCompare(b.name, 'ar');
      default:         return b.v   - a.v;
    }
  });

  const isInWatchlist = useCallback((sym) => {
    return state.watchlist.includes(sym);
  }, [state.watchlist]);


  const toggleWatchlist = useCallback((sym) => {
    const action = state.watchlist.includes(sym)
      ? STOCK_ACTIONS.REMOVE_WATCHLIST
      : STOCK_ACTIONS.ADD_TO_WATCHLIST;
    dispatch({ type: action, payload: sym });
  }, [dispatch, state.watchlist]);

  const setSort = useCallback((sort) => {
    dispatch({ type: STOCK_ACTIONS.SET_SORT, payload: sort });
  }, [dispatch]);

  const setFilter = useCallback((filter) => {
    dispatch({ type: STOCK_ACTIONS.SET_FILTER, payload: filter });
  }, [dispatch]);

  return {
    // State
    stocks:        stocksWithLivePrices,
    filteredStocks: sorted,
    watchlist:     state.watchlist,
    sort:          state.sort,
    filter:        state.filter,
    isLoading:     state.isLoading,
    priceCache:    state.priceCache,
    // Derived
    watchlistStocks: stocksWithLivePrices.filter(s => state.watchlist.includes(s.sym)),
    isInWatchlist,
    // Actions
    toggleWatchlist,
    setSort,
    setFilter,
    dispatch,
  };
}

// ══════════════════════════════════════════════════════════════
// useSharedPrices — الأسعار المشتركة بين جميع الشاشات
//
// يُشغّل محاكاة GBM مركزية واحدة
// جميع الشاشات تقرأ من نفس priceCache → أسعار موحدة
// ══════════════════════════════════════════════════════════════

function _gbmSeed(s) {
  let x = s;
  return () => { x = (x*1664525+1013904223)&0xffffffff; return (x>>>0)/0xffffffff; };
}

 export function useSharedPrices() {
  const { priceCache, stocks } = useStockState();
  const dispatch = useStockDispatch();
  const tickRef = useRef(null);

  useEffect(() => {
    if (!config.features.liveMarketData) {
      // وضع المحاكاة -- GBM فقط عند demo
      tickRef.current = setInterval(() => {
        const rng = _gbmSeed(Date.now() & 0xffff);
        const updates = stocks.map(s => {
          const cur   = priceCache[s.sym] ? priceCache[s.sym].p : s.p;
          const base  = s.p;
          const drift = (base - cur) * 0.02;
          const sigma = cur * 0.003;
          const delta = drift + (rng() - 0.49) * sigma;
          const newP  = Math.max(base * 0.7, parseFloat((cur + delta).toFixed(2)));
          const newCh = parseFloat((newP - base).toFixed(2));
          const newPct = parseFloat(((newP - base) / base * 100).toFixed(2));
          const rawVol = s.v || s.avgV || 1000000;
          const newV  = Math.round(rawVol * (0.6 + rng() * 0.8));
          return {
            sym: s.sym,
            data: { p: newP, ch: newCh, pct: newPct, v: newV }
          };
        });
        dispatch({ type: 'UPDATE_PRICES', payload: updates });
      }, 5000);
      return () => clearInterval(tickRef.current);
    }

    // وضع الأسعار الحية -- sahmk API
    async function fetchLive() {
      try {
        const syms = stocks.map(s => s.sym).join(',');
const res  = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${syms}`);
if (!res.ok) return;
const json = await res.json();
if (!json || !json.quotes) return;
const updates = json.quotes
  .filter(item => item.symbol)
  .map(item => ({
    sym:  item.symbol,
    data: {
      p:    item.price          ?? 0,
      ch:   item.change_percent ?? 0,
      v:    item.volume         ?? 0,
      name: item.name           ?? '',
      hi:   item.high           ?? 0,
      lo:   item.low            ?? 0,
    },
  }));
        if (updates.length > 0) {
          dispatch({ type: 'UPDATE_PRICES', payload: updates });
        }
      } catch (e) {
        console.warn('[useSharedPrices] fetch failed:', e.message);
      }
    }

       // usePriceUpdater يتولى التحديث -- لا نحتاج جلب مزدوج
  }, [stocks.length]);
 // يُعاد عند تغيّر عدد الأسهم فقط

  return stocks.map(s => {
    const live = priceCache[s.sym];
    if (!live) return s;
    return {
      ...s,
      p:    live.p,
      ch:   live.ch,
      pct:  live.pct,
      v:    live.v,
      name: live.name || s.name,
      ...(live.hi != null && { hi: live.hi }),
      ...(live.lo != null && { lo: live.lo }),
      ...(live.o  != null && { o:  live.o  }),
    };
  });
}
