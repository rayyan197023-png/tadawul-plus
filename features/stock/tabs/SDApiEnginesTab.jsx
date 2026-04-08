'use client';
/**
 * @module features/stock/tabs/SDApiEnginesTab
 * @description تبويب محركات التحليل المتقدمة
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
            {hasLive?"✓ بيانات حية — SAHMK API":"محركات — تحميل..."}
          </div>
          {hasLive && <span style={{ fontSize:9, color:C.smoke }}>{"تتجدد كل 30 ث"}</span>}
        </div>
        {hasLive && stk.netFlow && (
          <div style={{ marginTop:8, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {[
              {l:"تدفق شراء",  v:(stk.inflow/1e6).toFixed(1)+"M",  c:C.mint},
              {l:"تدفق بيع",   v:(stk.outflow/1e6).toFixed(1)+"M", c:C.coral},
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
//
const DTABS   = ["نظرة-عامة","تقني","أساسي","محركات","ملاك"];
const DLABELS = ["نظرة عامة","تقني","الأساسي","محركات","كبار الملاك"];

// ─── ANALYST_EST — helper ─────────────────────────────────────────
const ANALYST_EST = {
  //
  "2222": { buy:8, hold:10, sell:2, targetPrice:28.30, upside:5.2 },
  default:{ buy:5, hold:4,  sell:3, targetPrice:null,  upside:null },
};

// ─── StockDetail ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
//
// ══════════════════════════════════════════════════════════════════
// SAHMK API — https://app.sahmk.sa/api/v1
// ══════════════════════════════════════════════════════════════════

const SAHMK_KEY    = process.env.NEXT_PUBLIC_SAHMK_KEY || "";
const SAHMK_BASE   = "https://app.sahmk.sa/api/v1";
const LOCAL_SERVER = ""; // not used in Next.js

// يجرب السيرفر المحلي أولاً (بدون CORS) ثم المباشر
const sahmkFetch = async (path) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  // السيرفر المحلي: /quote/2222 (بدون /api/v1)
  const localPath = path.replace("/api/v1","").replace(/\/$/, "");
  const urls = [
    { url: `${LOCAL_SERVER}${localPath}`, headers: {} },
    { url: `${SAHMK_BASE}${path}`,        headers: { "X-API-Key": SAHMK_KEY } },
  ];

  let lastErr;
  for (const { url, headers } of urls) {
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch(e) {
      lastErr = e;
      if (e.name === "AbortError") { clearTimeout(timeout); throw new Error("timeout"); }
    }
  }
  clearTimeout(timeout);
  throw lastErr;
};

// جلب السعر الحالي + التدفق
const fetchSahmkQuote = async (sym) => {
  try {
    const d = await sahmkFetch(`/quote/${sym}/`);
    return {
      p:       parseFloat(d.price),
      ch:      parseFloat(d.change),
      pct:     parseFloat(d.change_percent),
      v:       parseInt(d.volume),
      o:       parseFloat(d.open),
      dayHi:   parseFloat(d.high),
      dayLo:   parseFloat(d.low),
      prev:    parseFloat(d.previous_close),
      bid:     parseFloat(d.bid),
      ask:     parseFloat(d.ask),
      val:     d.value,
      inflow:  d.liquidity?.inflow_value,
      outflow: d.liquidity?.outflow_value,
      netFlow: d.liquidity?.net_value,
      inflowV: d.liquidity?.inflow_volume,
      outflowV:d.liquidity?.outflow_volume,
      inflowT: d.liquidity?.inflow_trades,
      outflowT:d.liquidity?.outflow_trades,
      isDelayed: d.is_delayed,
      updatedAt: d.updated_at,
      _apiErr: null,
    };
  } catch(e) {
    return { _apiErr: e.message };
  }
};

// جلب معلومات الشركة + الأساسيات
const fetchSahmkCompany = async (sym) => {
  try {
    const d = await sahmkFetch(`/company/${sym}/`);
    const f = d.fundamentals || {};
    const a = d.analysts || {};
    const v = d.valuation || {};
    const t = d.technicals || {};
    return {
      name:        d.name,
      sec:         d.sector,
      industry:    d.industry,
      website:     d.website,
      // أساسيات
      pe:          f.pe_ratio,
      forwardPE:   f.forward_pe,
      eps:         f.eps,
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
      // محللون
      targetMean:  a.target_mean,
      targetHigh:  a.target_high,
      targetLow:   a.target_low,
      consensus:   a.consensus,
      numAnalysts: a.num_analysts,
      // تقييم
      fv:          v.fair_price,
      fvConf:      v.fair_price_confidence,
      // تقني
      rsi:         t.rsi_14,
      macd:        t.macd_line,
      macdSig:     t.macd_signal,
      ma50:        t.fifty_day_average,
    };
  } catch(e) {
    return null;
  }
};

// Hook رئيسي
const useSahmkData = (baseStkData) => {
  const [liveData,    setLiveData]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [lastFetch,   setLastFetch]   = useState(null);
  const [apiStatus,   setApiStatus]   = useState("loading");
  const [apiError,    setApiError]    = useState(null);

  useEffect(() => {
    let cancelled = false;
    const sym = baseStkData.sym;
    if (!sym) return;

    const fetchAll = async () => {
      setLoading(true);
      setApiStatus("loading");
      setApiError(null);
      try {
        const quote = await fetchSahmkQuote(sym);
        if (!quote || quote._apiErr) throw new Error(quote?._apiErr || "لا استجابة");
        const company = await fetchSahmkCompany(sym);
        if (!cancelled) {
          setLiveData({ ...quote, ...(company||{}) });
          setLastFetch(new Date().toLocaleTimeString("ar-SA"));
          setApiStatus(quote.isDelayed ? "delayed" : "live");
        }
      } catch(e) {
        if (!cancelled) {
          setApiStatus("error");
          setApiError(e.message);
          setLiveData({ _apiErr: e.message });
        }
      }
      if (!cancelled) setLoading(false);
    };

    fetchAll();

    const interval = setInterval(() => {
      fetchSahmkQuote(sym).then(q => {
        if (!cancelled && q) {
          setLiveData(prev => prev ? { ...prev, ...q } : q);
          setLastFetch(new Date().toLocaleTimeString("ar-SA"));
          setApiStatus(q.isDelayed ? "delayed" : "live");
        }
      });
    }, 30000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [baseStkData.sym]);

  const stk = liveData ? { ...baseStkData, ...liveData } : baseStkData;
  return { stk, loading, lastFetch, apiStatus, apiError };
};




export { SDApiEngines };
