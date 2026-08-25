'use client';
/**
 * @module store/stockStore
 * @description إدارة حالة الأسهم المركزية
 * المصدر الوحيد للحقيقة لجميع بيانات الأسهم
 */

import { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

// ── Persistence helpers
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
  } catch {}
}

// ── Action Types
export const STOCK_ACTIONS = {
  SET_STOCKS:       'SET_STOCKS',
  UPDATE_PRICE:     'UPDATE_PRICE',
  UPDATE_PRICES:    'UPDATE_PRICES',
  ADD_TO_WATCHLIST: 'ADD_TO_WATCHLIST',
  REMOVE_WATCHLIST: 'REMOVE_WATCHLIST',
  SET_SORT:         'SET_SORT',
  SET_FILTER:       'SET_FILTER',
  SET_LOADING:      'SET_LOADING',
};

// ── Initial State
const initialState = {
  stocks:     [],
  priceCache: {},
  watchlist:  [],
  sort:       'volume',
  filter:     'all',
  isLoading:  false,
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
        priceCache: {
          ...state.priceCache,
          [sym]: { ...data, ts: Date.now() },
        },
      };
    }

    case STOCK_ACTIONS.UPDATE_PRICES: {
      const updates = {};
      const items = Array.isArray(action.payload)
        ? action.payload
        : Object.values(action.payload);
      items.forEach(({ sym, data }) => {
        updates[sym] = { ...data, ts: Date.now() };
      });
      return {
        ...state,
        priceCache: { ...state.priceCache, ...updates },
      };
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

// ── Contexts
const StockStateContext    = createContext(initialState);
const StockDispatchContext = createContext(null);

// ── Provider
export function StockProvider({ children }) {
  const [state, dispatch] = useReducer(stockReducer, {
    ...initialState,
    watchlist: loadWatchlist(),
  });

  return (
    <StockDispatchContext.Provider value={dispatch}>
      <StockStateContext.Provider value={state}>
        {children}
      </StockStateContext.Provider>
    </StockDispatchContext.Provider>
  );
}

// ── Base Hooks
export function useStockState() {
  return useContext(StockStateContext);
}

export function useStockDispatch() {
  const d = useContext(StockDispatchContext);
  if (!d) throw new Error('useStockDispatch must be within StockProvider');
  return d;
}

// ── useStocks -- للشاشات التي تحتاج فلترة وترتيب
export function useStocks() {
  const state    = useStockState();
  const dispatch = useStockDispatch();

  // ✨ useMemo -- كانت تُعاد لكل 248 سهماً في كل رسم
  const stocks = useMemo(() => state.stocks.map(s => {
    const live = state.priceCache[s.sym];
    if (!live) return s;
    return {
      ...s,
      p:    live.p,
      ch:   live.ch,
      pct:  live.pct,
      v:    live.v,
      name: live.name || s.name,
      hi:   live.hi   ?? s.hi,
      lo:   live.lo   ?? s.lo,
    };
  }), [state.stocks, state.priceCache]);

  // ✨ useMemo -- الفلترة والترتيب كانا يُعادان في كل رسم
  const sorted = useMemo(() => {
    const filtered = state.filter === 'all'
      ? stocks
      : stocks.filter(s => s.sectorId === state.filter);

    return [...filtered].sort((a, b) => {
      switch (state.sort) {
        case 'gainers': return b.pct - a.pct;
        case 'losers':  return a.pct - b.pct;
        case 'volume':  return b.v   - a.v;
        case 'price':   return b.p   - a.p;
        case 'name':    return (a.name || '').localeCompare(b.name || '', 'ar');
        default:        return b.v   - a.v;
      }
    });
  }, [stocks, state.filter, state.sort]);

  const isInWatchlist = useCallback(
    sym => state.watchlist.includes(sym),
    [state.watchlist]
  );

  const toggleWatchlist = useCallback(sym => {
    dispatch({
      type: state.watchlist.includes(sym)
        ? STOCK_ACTIONS.REMOVE_WATCHLIST
        : STOCK_ACTIONS.ADD_TO_WATCHLIST,
      payload: sym,
    });
  }, [dispatch, state.watchlist]);

  const setSort   = useCallback(v => dispatch({ type: STOCK_ACTIONS.SET_SORT,   payload: v }), [dispatch]);
  const setFilter = useCallback(v => dispatch({ type: STOCK_ACTIONS.SET_FILTER, payload: v }), [dispatch]);

  return {
    stocks,
    filteredStocks:  sorted,
    watchlist:       state.watchlist,
    watchlistStocks: stocks.filter(s => state.watchlist.includes(s.sym)),
    sort:            state.sort,
    filter:          state.filter,
    isLoading:       state.isLoading,
    priceCache:      state.priceCache,
    isInWatchlist,
    toggleWatchlist,
    setSort,
    setFilter,
    dispatch,
  };
}

// ── useSharedPrices -- للشاشات التي تقرأ الأسعار مباشرة
export function useSharedPrices() {
  const { stocks, priceCache } = useStockState();

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
      hi:   live.hi   ?? s.hi,
      lo:   live.lo   ?? s.lo,
    };
  });
}
