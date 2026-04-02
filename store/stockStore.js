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
import { STOCKS } from '../constants/stocksData';

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
const initialState = {
  stocks:      STOCKS,          // All stocks (seed data)
  priceCache:  {},              // sym → { p, ch, pct, v, ts }

  watchlist:   loadWatchlist(), // Array of sym strings
  sort:        'volume',        // 'volume'|'gainers'|'losers'|'name'|'price'
  filter:      'all',           // sectorId or 'all'
  isLoading:   false,
};

// ── Reducer
function stockReducer(state, action) {
  switch (action.type) {

    case STOCK_ACTIONS.SET_STOCKS:
      return { ...state, stocks: action.payload };

    case STOCK_ACTIONS.UPDATE_PRICE: {
      const { sym, data } = action.payload;
      return {
        ...state,
        priceCache: { ...state.priceCache, [sym]: { ...data, ts: Date.now() } },
      };
    }

    case STOCK_ACTIONS.UPDATE_PRICES: {
      const updates = {};
      action.payload.forEach(({ sym, data }) => {
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
    return { ...s, p: live.p, ch: live.ch, pct: live.pct, v: live.v };
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
  const { dispatch, priceCache, stocks } = useStockState();
  const tickRef = useRef(null);

  useEffect(() => {
    // كل 3 ثوانٍ — تذبذب ±0.3% لكل سهم
    tickRef.current = setInterval(() => {
      const rng = _gbmSeed(Date.now() & 0xffff);
      const updates = stocks.map(s => {
        const cur  = priceCache[s.sym] ? priceCache[s.sym].p : s.p;
        const base = s.p; // السعر الأساسي الثابت
        const drift = (base - cur) * 0.02; // mean reversion
        const sigma = cur * 0.003;
        const delta = drift + (rng() - 0.49) * sigma;
        const newP  = Math.max(base * 0.7, parseFloat((cur + delta).toFixed(2)));
        const newCh = parseFloat((newP - base).toFixed(2));
        const newPct = parseFloat(((newP - base) / base * 100).toFixed(2));
        const rawVol = s.v || s.avgV || 1000000;
        const newV  = Math.round(rawVol * (0.6 + rng() * 0.8));
        return {
          sym: s.sym,
          data: { p: newP, ch: newCh, pct: newPct, v: newV, hi: Math.max(newP, s.hi||newP), lo: Math.min(newP, s.lo||newP) }
        };
      });
      dispatch({ type: 'UPDATE_PRICES', payload: updates });
    }, 3000);

    return () => clearInterval(tickRef.current);
  }, []); // يبدأ مرة واحدة فقط

  // يُرجع STOCKS مع الأسعار الحية مدمجة
  return stocks.map(s => {
    const live = priceCache[s.sym];
    if (!live) return s;
    return {
      ...s,
      p:   live.p,
      ch:  live.ch,
      pct: live.pct,
      v:   live.v,
      ...(live.hi  != null && { hi: live.hi }),
      ...(live.lo  != null && { lo: live.lo }),
      ...(live.o   != null && { o:  live.o  }),
    };
  });
}
