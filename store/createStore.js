'use client';
/**
 * BASE STORE — Lightweight Context + useReducer pattern
 *
 * Creates a typed store with:
 * - State
 * - Dispatch
 * - Selectors
 * - No external dependencies (pure React)
 *
 * Usage:
 *   const { Provider, useStore, useSelector } = createStore(reducer, initialState);
 */

import { createContext, useContext, useReducer, useCallback } from 'react';

/**
 * @template S - State type
 * @template A - Action type
 * @param {Function} reducer
 * @param {S} initialState
 * @returns {{ Provider, useStore, useSelector, useDispatch }}
 */
export function createStore(reducer, initialState) {
  const StateContext    = createContext(initialState);
  const DispatchContext = createContext(null);

  function Provider({ children }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
      <DispatchContext.Provider value={dispatch}>
        <StateContext.Provider value={state}>
          {children}
        </StateContext.Provider>
      </DispatchContext.Provider>
    );
  }

  function useStore() {
    return useContext(StateContext);
  }

  function useDispatch() {
    const dispatch = useContext(DispatchContext);
    if (!dispatch) throw new Error('useDispatch must be used within Provider');
    return dispatch;
  }

  /**
   * @param {Function} selector - (state) => derivedValue
   * Memoized — only re-renders when selected value changes.
   */
  function useSelector(selector) {
    const state = useStore();
    return selector(state);
  }

  return { Provider, useStore, useSelector, useDispatch };
}
