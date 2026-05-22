'use client';
/**
 * @module features/stock/tabs/SDApiEnginesTab
 * @description تبويب محركات API + Hook الاتصال بـ sahmk
 *
 * ✨ نسخة منظفة:
 * - sahmkFetch يستخدم proxy `/api/sahmkdata` (يحل CORS)
 * - ANALYST_EST فارغ -- يُملأ من API لاحقاً
 */
import { useState, useEffect, useMemo } from 'react';
import { NLPLoader, OrderBookLoader, TickLoader } from './SDSubComponents';
import { C, Skeleton } from './StockDetailShared';

function SDApiEngines({ stk }) {
  const hasLive = !!(stk.inflow || stk.netFlow);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* بطاقة حالة API */}
      <div style={{ background:hasLive?C.mint+"10":C.electric+"08", border:`1px solid ${hasLive?C.mint:C.electric}22`, borderRadius:14, padding:"10px 14px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, fontWeight:700, color:hasLive?C.mint:C.electric }}>
            {hasLive?"✓ بيانات حية -- SAHMK API":"محركات -- تحميل..."}
          </div>
          {hasLive && <span style={{ fontSize:9, color:C.smoke }}>{"تتجدد كل 30 ث"}</span>}
        </div>
        {hasLive && stk.netFlow != null && (
          <div style={{ marginTop:8, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {[
              {l:"تدفق شراء",  v:((stk.inflow||0)/1e6).toFixed(1)+"M",  c:C.mint},
              {l:"تدفق بيع",   v:((stk.outflow||0)/1e6).toFixed(1)+"M", c:C.coral},
              {l:"صافي",       v:(stk.netFlow>=0?"+":"")+(stk.netFlow/1e6).toFixed(1)+"M", c:stk.netFlow>=0?C.mint:C.coral},
            ].map((item,i)=>(
              <div key={i} style={{ background:item.c+"10", borderRadius:8, padding:"6px 4px", textAlign:"center" }}>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:item.c }}>{item.v}</div>
                <div style={{ fontSize:9, color:C.smoke }}>{item.l}</div>
              </div>
            ))}
          </div>
        )}
        {!hasLive && <div style={{ fontSize:11, color:C.smoke, lineHeight:1.6, marginTop:4 }}>{"جارٍ جلب البيانات من SAHMK API..."}</div>}
      </div>
      <OrderBookLoader stk={stk}/>
      <TickLoader      stk={stk}/>
      <NLPLoader       stk={stk}/>
    </div>
  );
}

// ─── ANALYST_EST -- تقديرات المحللين (فارغ -- يُملأ من API) ───────────
export const ANALYST_EST = {
  default: { buy: 0, hold: 0, sell: 0, targetPrice: null, upside: null },
};

// ══════════════════════════════════════════════════════════════════
// SAHMK API -- عبر proxy داخلي /api/sahmkdata (يحل CORS)
// ══════════════════════════════════════════════════════════════════

// cache للأساسيات (ثابتة - تقليل الطلبات)
const fundCache = {};

const sahmkFetch = async (endpoint, params = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const qs = new URLSearchParams({ endpoint, ...params }).toString();
    const url = `/api/sahmkdata?${qs}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === "AbortError") throw new Error("timeout");
    throw e;
  }
};

// جلب الـ quote الكامل (سعر + تدفق سيولة)
const fetchSahmkQuote = async (sym) => {
  try {
    const d = await sahmkFetch("quote", { sym });
    return {
      p:        parseFloat(d.price),
      ch:       parseFloat(d.change),
      pct:      parseFloat(d.change_percent),
      v:        parseInt(d.volume),
      o:        parseFloat(d.open),
      dayHi:    parseFloat(d.high),
      dayLo:    parseFloat(d.low),
      prev:     parseFloat(d.previous_close),
      bid:      parseFloat(d.bid),
      ask:      parseFloat(d.ask),
      val:      d.value,
      inflow:   d.liquidity?.inflow_value,
      outflow:  d.liquidity?.outflow_value,
      netFlow:  d.liquidity?.net_value,
      inflowV:  d.liquidity?.inflow_volume,
      outflowV: d.liquidity?.outflow_volume,
      inflowT:  d.liquidity?.inflow_trades,
      outflowT: d.liquidity?.outflow_trades,
      isDelayed: d.is_delayed,
      updatedAt: d.updated_at,
      _apiErr: null,
    };
  } catch (e) {
    return { _apiErr: e.message };
  }
};

// جلب معلومات الشركة + الأساسيات (endpoint: fundamentals)
const fetchSahmkCompany = async (sym) => {
  if (fundCache['c_'+sym]) return fundCache['c_'+sym];
  try {
    const d = await sahmkFetch("fundamentals", { sym });
    const f = d.fundamentals || {};
    const result = {
      name:        d.name || d.name_en,
      sec:         d.sector,
      industry:    d.industry,
      website:     d.website,
      pe:          f.pe_ratio,
      forwardPE:   f.forward_pe,
      eps:         f.eps_ttm || f.basic_eps || f.eps,
      bvps:        f.book_value,
      pb:          f.price_to_book,
      beta:        f.beta,
      mc:          f.market_cap ? (f.market_cap/1e12).toFixed(2)+"T" : null,
      sharesOut:   f.shares_outstanding,
      floatPct:    f.float_shares && f.shares_outstanding
                     ? parseFloat((f.float_shares/f.shares_outstanding*100).toFixed(2))
                     : null,
            hi52:        f.fifty_two_week_high,
      lo52:        f.fifty_two_week_low,
    };
    fundCache['c_'+sym] = result;
    return result;
  } catch (e) {
    return null;
  }
};

// جلب النسب المالية (ROE, ROA, الهوامش)
const fetchSahmkRatios = async (sym) => {
  if (fundCache['r_'+sym]) return fundCache['r_'+sym];
  try {
    const d = await sahmkFetch("ratios", { sym });
    const arr = d.ratios || [];
    if (arr.length === 0) return null;
    const r = arr[0].ratios || {};
    const km = arr[0].key_metrics || {};
    // ROIC تقريبي = صافي الدخل ÷ (حقوق الملكية + الدين)
    var roic = null;
    var equity = km.stockholders_equity, debt = km.total_debt, ni = km.net_income;
    if (ni && equity) {
      var capital = equity + (debt || 0);
      if (capital > 0) roic = parseFloat((ni / capital * 100).toFixed(2));
    }
    const result = {
      roe:        r.roe,
      roa:        r.roa,
      netMargin:  r.net_margin,
      opMargin:   r.operating_margin,
      debtEquity: r.debt_to_equity,
      roic:       roic,
      _revenue:   km.total_revenue,
      _netIncome: km.net_income,
      _ocf:       km.operating_cash_flow,
    };
    fundCache['r_'+sym] = result;
    return result;
  } catch (e) {
    return null;
  }
};

// جلب البيانات المالية (للنمو + DCF)
const fetchSahmkFinancials = async (sym) => {
  if (fundCache['f_'+sym]) return fundCache['f_'+sym];
  try {
    const d = await sahmkFetch("financials", { sym });
    const inc = (d.income_statements || []).filter(x => x.is_full_year);
    const cf  = (d.cash_flows || []).filter(x => x.is_full_year);
    // نمو صافي الدخل (آخر سنتين كاملتين)
    let growthYoY = null;
    if (inc.length >= 2) {
      var newer = inc[0].net_income, older = inc[1].net_income;
      if (older && older !== 0) {
        growthYoY = parseFloat(((newer - older) / Math.abs(older) * 100).toFixed(1));
      }
    }
    const result = {
      growthYoY: growthYoY,
      _revLatest: inc.length > 0 ? inc[0].total_revenue : null,
      _ocfLatest: cf.length > 0 ? cf[0].operating_cash_flow : null,
    };
    fundCache['f_'+sym] = result;
    return result;
  } catch (e) {
    return null;
  }
};

// جلب التوزيعات (عائد + آخر توزيع)
const fetchSahmkDividend = async (sym) => {
  if (fundCache['d_'+sym]) return fundCache['d_'+sym];
  try {
    const d = await sahmkFetch("dividends", { sym });
    const hist = d.history || [];
    const result = {
      divYld:  d.trailing_12m_yield || null,
      lastDiv: hist.length > 0 ? hist[0].value : null,
    };
    fundCache['d_'+sym] = result;
    return result;
  } catch (e) {
    return null;
  }
};

// جلب الشارت التاريخي
const fetchSahmkOhlcv = async (sym, period = '3M') => {
  try {
    const d = await sahmkFetch("ohlcv", { sym, period });
    if (d?.data?.length > 0) {
      return d.data.map(bar => ({
        d:   bar.date,
        o:   bar.open,
        h:   bar.high,
        l:   bar.low,
        c:   bar.close,
        v:   bar.volume,
        pct: bar.open ? +((bar.close - bar.open) / bar.open * 100).toFixed(2) : 0,
      }));
    }
    return [];
  } catch (e) {
    return [];
  }
};

// ─── Hook رئيسي لجلب بيانات السهم ────────────────────────────────
const useSahmkData = (baseStkData) => {
  const [liveData,  setLiveData]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [apiStatus, setApiStatus] = useState("loading");
  const [apiError,  setApiError]  = useState(null);

  useEffect(() => {
    let cancelled = false;
    const sym = baseStkData?.sym;
    if (!sym) return;

    const fetchAll = async () => {
      setLoading(true);
      setApiStatus("loading");
      setApiError(null);
      try {
        const quote = await fetchSahmkQuote(sym);
        if (!quote || quote._apiErr) throw new Error(quote?._apiErr || "لا استجابة");

        // جلب متوازي (أسرع + لا يُلغي بعضه)
        const [company, ratios, financials, priceHistory] = await Promise.all([
          fetchSahmkCompany(sym),
          fetchSahmkRatios(sym),
          fetchSahmkFinancials(sym),
          fetchSahmkOhlcv(sym, '3M'),
        ]);

        if (!cancelled) {
          setLiveData({
            ...quote,
            ...(company || {}),
            ...(ratios || {}),
            ...(financials || {}),
            priceHistory,
          });

          setLastFetch(new Date().toLocaleTimeString("ar-SA"));
          setApiStatus(quote.isDelayed ? "delayed" : "live");
        }
      } catch (e) {
        if (!cancelled) {
          setApiStatus("error");
          setApiError(e.message);
          setLiveData({ _apiErr: e.message });
        }
      }
      if (!cancelled) setLoading(false);
    };

    fetchAll();

    // تحديث الـ quote فقط كل 30 ثانية
    const interval = setInterval(() => {
      fetchSahmkQuote(sym).then(q => {
        if (!cancelled && q && !q._apiErr) {
          setLiveData(prev => prev ? { ...prev, ...q } : q);
          setLastFetch(new Date().toLocaleTimeString("ar-SA"));
          setApiStatus(q.isDelayed ? "delayed" : "live");
        }
      });
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [baseStkData?.sym]);

  const stk = liveData ? { ...baseStkData, ...liveData } : baseStkData;
  return { stk, loading, lastFetch, apiStatus, apiError };
};

export { SDApiEngines, useSahmkData, sahmkFetch, fetchSahmkQuote, fetchSahmkCompany, fetchSahmkRatios, fetchSahmkFinancials, fetchSahmkOhlcv };

