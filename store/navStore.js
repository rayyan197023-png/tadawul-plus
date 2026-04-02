'use client';
/**
 * NAVIGATION STORE
 *
 * Controls:
 * - Active tab
 * - Stock detail view (which stock is open)
 * - Navigation history (for back button)
 *
 * No component should manage navigation state locally.
 * All navigation flows through here.
 */

import { createContext, useContext, useReducer, useCallback } from 'react';
import { TAB_IDS } from '../constants/navigation';

// ── Action Types
const NAV = {
  SET_TAB:         'SET_TAB',
  OPEN_STOCK:      'OPEN_STOCK',
  CLOSE_STOCK:     'CLOSE_STOCK',
  SET_PREV_TAB:    'SET_PREV_TAB',
};

// ── Initial State
const initialState = {
  activeTab:       TAB_IDS.HOME,
  prevTab:         null,   // available for back-navigation — consumed by future router
  activeStock:     null,   // Stock object when detail is open
  stockSource:     null,   // Which tab opened the stock ('stocks' | 'ai' | 'portfolio' | etc.)
  isStockOpen:     false,
};

// ── Reducer
function navReducer(state, action) {
  switch (action.type) {

    case NAV.SET_TAB:
      return {
        ...state,
        prevTab:     state.activeTab,
        activeTab:   action.payload,
        isStockOpen: false,
        activeStock: null,
      };

    case NAV.OPEN_STOCK:
      return {
        ...state,
        activeStock:  action.payload.stock,
        stockSource:  action.payload.source ?? state.activeTab,
        isStockOpen:  true,
      };

    case NAV.CLOSE_STOCK:
      return {
        ...state,
        activeStock:  null,
        isStockOpen:  false,
        stockSource:  null,
      };

    default:
      return state;
  }
}

// ── Context
const NavStateContext    = createContext(initialState);
const NavDispatchContext = createContext(null);

// ── Provider
export function NavProvider({ children }) {
  const [state, dispatch] = useReducer(navReducer, initialState);
  return (
    <NavDispatchContext.Provider value={dispatch}>
      <NavStateContext.Provider value={state}>
        {children}
      </NavStateContext.Provider>
    </NavDispatchContext.Provider>
  );
}

// ── Hooks
export function useNavState() {
  return useContext(NavStateContext);
}

function useNavDispatch() {
  const d = useContext(NavDispatchContext);
  if (!d) throw new Error('useNavDispatch must be within NavProvider');
  return d;
}

/**
 * Primary navigation hook — use this in components
 */
export function useNav() {
  const state    = useNavState();
  const dispatch = useNavDispatch();

  const setTab = useCallback((tabId) => {
    dispatch({ type: NAV.SET_TAB, payload: tabId });
  }, [dispatch]);

  const openStock = useCallback((stock, source) => {
    dispatch({ type: NAV.OPEN_STOCK, payload: { stock, source } });
  }, [dispatch]);

  const closeStock = useCallback(() => {
    dispatch({ type: NAV.CLOSE_STOCK });
  }, [dispatch]);

  return {
    // State
    activeTab:   state.activeTab,
    prevTab:     state.prevTab,
    activeStock: state.activeStock,
    isStockOpen: state.isStockOpen,
    stockSource: state.stockSource,
    // Actions
    setTab,
    openStock,
    closeStock,
  };
}
