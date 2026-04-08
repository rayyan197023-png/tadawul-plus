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

import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
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
  SET_SELECTED:      'SET_SELECTED',
  CLEAR_SELECTED:    'CLEAR_SELECTED',
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
  // NOTE: selected is intentionally NOT used for navigation.
  // Use navStore.activeStock (set by openStock()) as canonical selected stock.
  // stockStore.selected is reserved for future: compare mode, multi-select.
  selected:    null,
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

    case STOCK_ACTIONS.SET_SELECTED:
      return { ...state, selected: action.payload };

    case STOCK_ACTIONS.CLEAR_SELECTED:
      return { ...state, selected: null };

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

  // NOTE: Use navStore.openStock() to navigate to a stock detail view.
  // stockStore.selected is reserved for future multi-select / comparison feature.
  const selectStock = useCallback((stock) => {
    dispatch({ type: STOCK_ACTIONS.SET_SELECTED, payload: stock });
  }, [dispatch]);

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
    selected:      state.selected,
    watchlist:     state.watchlist,
    sort:          state.sort,
    filter:        state.filter,
    isLoading:     state.isLoading,
    priceCache:    state.priceCache,
    // Derived
    watchlistStocks: stocksWithLivePrices.filter(s => state.watchlist.includes(s.sym)),
    isInWatchlist,
    // Actions
    selectStock,
    toggleWatchlist,
    setSort,
    setFilter,
    dispatch,
  };
}
