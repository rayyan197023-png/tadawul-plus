'use client';
/**
 * ROOT STORE PROVIDER
 *
 * Composes all store providers in the correct dependency order.
 * Import this ONCE in AppShell — never nest providers manually.
 *
 * Order matters:
 * NavProvider > MarketProvider > StockProvider > ...
 */

import { NavProvider }    from './navStore';
import { MarketProvider } from './marketStore';
import { StockProvider }  from './stockStore';

export function RootStoreProvider({ children }) {
  return (
    <NavProvider>
      <MarketProvider>
        <StockProvider>
          {children}
        </StockProvider>
      </MarketProvider>
    </NavProvider>
  );
}

// Re-export all store hooks for convenient imports
// Single import point — components NEVER import from individual store files
export { useNav, NavProvider }                              from './navStore';
export { useMarket, useMarketDispatch, MarketProvider, MARKET_ACTIONS } from './marketStore';
export { useStocks, useStockState, StockProvider, STOCK_ACTIONS, useSharedPrices } from './stockStore';
