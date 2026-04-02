'use client';
/**
 * MARKET STORE
 *
 * Owns all market-level data:
 * - TASI index value & change
 * - Sector performance
 * - Market breadth (advancers/decliners)
 * - Market status (open/closed)
 * - Last update timestamp
 *
 * Populated by: marketApi.js → dispatched here
 * Read by: HomeScreen, AnalysisScreen, StockDetail
 */

import { createContext, useContext, useReducer, useCallback } from 'react';
import { SECTORS, INDICES } from '../constants/stocksData';

// ── Action Types
export const MARKET_ACTIONS = {
  SET_INDICES:      'SET_INDICES',
  SET_SECTORS:      'SET_SECTORS',
  SET_BREADTH:      'SET_BREADTH',
  SET_LOADING:      'SET_LOADING',
  SET_ERROR:        'SET_ERROR',
  SET_LAST_UPDATED: 'SET_LAST_UPDATED',
  SET_STATUS:       'SET_STATUS',
};

// ── Initial State
const initialState = {
  indices:     INDICES,    // seed from constants, replaced by live data
  sectors:     SECTORS,
  breadth: {
    advancers:  0,
    decliners:  0,
    unchanged:  0,
    total:      0,
  },
  status:      'closed',   // 'open' | 'closed' | 'pre' | 'post'
  isLoading:   false,
  error:       null,
  lastUpdated: null,
};

// ── Reducer
function marketReducer(state, action) {
  switch (action.type) {

    case MARKET_ACTIONS.SET_INDICES:
      return { ...state, indices: action.payload };

    case MARKET_ACTIONS.SET_SECTORS:
      return { ...state, sectors: action.payload };

    case MARKET_ACTIONS.SET_BREADTH:
      return { ...state, breadth: action.payload };

    case MARKET_ACTIONS.SET_STATUS:
      return { ...state, status: action.payload };

    case MARKET_ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload, error: null };

    case MARKET_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };

    case MARKET_ACTIONS.SET_LAST_UPDATED:
      return { ...state, lastUpdated: action.payload };

    default:
      return state;
  }
}

// ── Context
const MarketStateContext    = createContext(initialState);
const MarketDispatchContext = createContext(null);

// ── Provider
export function MarketProvider({ children }) {
  const [state, dispatch] = useReducer(marketReducer, initialState);
  return (
    <MarketDispatchContext.Provider value={dispatch}>
      <MarketStateContext.Provider value={state}>
        {children}
      </MarketStateContext.Provider>
    </MarketDispatchContext.Provider>
  );
}

// ── Base hooks
export function useMarketState() {
  return useContext(MarketStateContext);
}

export function useMarketDispatch() {
  const d = useContext(MarketDispatchContext);
  if (!d) throw new Error('useMarketDispatch must be within MarketProvider');
  return d;
}

// ── Composed hook for components
export function useMarket() {
  const state    = useMarketState();
  const dispatch = useMarketDispatch();

  // Selectors
  const tasi = state.indices.find(i => i.id === 'tasi') ?? state.indices[0];

  const setIndices = useCallback((data) => {
    dispatch({ type: MARKET_ACTIONS.SET_INDICES, payload: data });
    dispatch({ type: MARKET_ACTIONS.SET_LAST_UPDATED, payload: Date.now() });
  }, [dispatch]);

  const setSectors = useCallback((data) => {
    dispatch({ type: MARKET_ACTIONS.SET_SECTORS, payload: data });
  }, [dispatch]);

  const setLoading = useCallback((val) => {
    dispatch({ type: MARKET_ACTIONS.SET_LOADING, payload: val });
  }, [dispatch]);

  const setError = useCallback((err) => {
    dispatch({ type: MARKET_ACTIONS.SET_ERROR, payload: err });
  }, [dispatch]);

  return {
    // State
    indices:     state.indices,
    sectors:     state.sectors,
    breadth:     state.breadth,
    status:      state.status,
    isLoading:   state.isLoading,
    error:       state.error,
    lastUpdated: state.lastUpdated,
    tasi,
    // Actions
    setIndices,
    setSectors,
    setLoading,
    setError,
  };
}
