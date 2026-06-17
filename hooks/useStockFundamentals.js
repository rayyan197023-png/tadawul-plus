'use client';
import { useState, useEffect } from 'react';

const TTL = 6 * 60 * 60 * 1000; // 6 ساعات

function readCache(sym) {
  try {
    const raw = localStorage.getItem('stk_fund_v1_' + sym);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > TTL) return null;
    return obj.data;
  } catch(e) { return null; }
}

function writeCache(sym, data) {
  try {
    localStorage.setItem('stk_fund_v1_' + sym, JSON.stringify({ ts: Date.now(), data }));
  } catch(e) {}
}

export function useStockFundamentals(sym) {
  const [fund, setFund] = useState(() => readCache(sym));

  useEffect(() => {
    if (!sym) return;
    const cached = readCache(sym);
    if (cached) { setFund(cached); return; }

    fetch(`/api/sahmkdata?endpoint=fundamentals&sym=${sym}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const f = data.fundamentals || data.company || data;
        const result = {
          eps:          f.eps_ttm          ?? f.eps                  ?? f.earnings_per_share ?? null,
          pe:           f.pe_ratio         ?? f.pe                   ?? f.price_to_earnings  ?? null,
          roe:          f.roe              ?? f.return_on_equity      ?? null,
          pb:           f.pb_ratio         ?? f.pb                   ?? f.price_to_book      ?? null,
          divY:         f.dividend_yield   ?? f.div_yield            ?? null,
          debt:         f.debt_ratio       ?? f.total_debt_to_equity  ?? null,
          epsGrw:       f.eps_growth       ?? f.earnings_growth       ?? null,
          revGrw:       f.revenue_growth   ?? null,
          freeCashFlow: f.free_cash_flow   ?? f.fcf                  ?? null,
          mktCap:       f.market_cap       ?? f.mkt_cap              ?? null,
          shares:       f.shares_outstanding ?? f.shares             ?? null,
          bookValue:    f.book_value       ?? f.bvps                 ?? null,
          target:       f.target_price     ?? f.analyst_target       ?? null,
        };
        writeCache(sym, result);
        setFund(result);
      })
      .catch(() => {});
  }, [sym]);

  return fund;
}

export default useStockFundamentals;
