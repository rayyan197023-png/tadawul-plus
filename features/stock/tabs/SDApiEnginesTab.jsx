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
  const isIndex = stk?.sym === 'TASI';

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

      {!isIndex && <OrderBookLoader stk={stk}/>}
      <TickLoader stk={stk}/>
      {!isIndex && <NLPLoader stk={stk}/>}
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

// cache دائم في localStorage (3 أشهر - الأساسيات الربعية)
const FUND_CACHE_DURATION = 24 * 60 * 60 * 1000; // يوم واحد فقط

const readFundCache = (sym) => {
  try {
const raw = localStorage.getItem(`stockFund_v14_${sym}`);

    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.timestamp || 0) > FUND_CACHE_DURATION) return null;
    return parsed.data;
  } catch (e) {
    return null;
  }
};

const writeFundCache = (sym, data) => {
  try {
localStorage.setItem(`stockFund_v14_${sym}`, JSON.stringify({


      timestamp: Date.now(),
      data: data,
    }));
  } catch (e) {}
};

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
    const tech = d.technicals || {};
    const val  = d.valuation  || {};
    const ana  = d.analysts   || {};
    const result = {
      name:        d.name || d.name_en,
      sec:         d.sector,
      industry:    d.industry,
      website:     d.website,
      pe:          (function(){
                     // ✨ نحسب P/E دائماً من السعر ÷ eps_ttm (الأدق)
                     // pe_ratio من API مبني على eps قديم (legacy) -- نتجاهله
                     var px = parseFloat(d.current_price || d.price || 0);
                     // ✨ basic_eps أدق وأكثر توافقاً مع المنصات (تكرشارت وغيرها)
                     var epsTTM = f.eps_ttm;
                     if (px > 0 && epsTTM != null && epsTTM > 0) {
                       return parseFloat((px / epsTTM).toFixed(2));
                     }
                     var epsBasic = f.basic_eps;
                     if (px > 0 && epsBasic != null && epsBasic > 0) {
                       return parseFloat((px / epsBasic).toFixed(2));
                     }

                     // آخر fallback: pe_ratio من API
                     if (f.pe_ratio != null && f.pe_ratio > 0.5 && f.pe_ratio < 500) {
                       return parseFloat(f.pe_ratio.toFixed(2));
                     }
                     return null;
                   })(),

      forwardPE:   (f.forward_pe != null && f.forward_pe > 0.5 && f.forward_pe < 300) ? f.forward_pe : null,
eps:          (function(){
                 // ✨ basic_eps = صافي الدخل السنوي ÷ الأسهم -- هو الأدق والمتوافق مع تكرشارت
var e = f.eps_ttm ?? f.basic_eps ?? null;

                 if (e == null) return null;
                 var px = parseFloat(d.price || d.current_price || 0);
                 var shares = f.shares_outstanding;
                 // لو EPS أكبر من السعر × 10 فهو إجمالي ريال (مش للسهم)
                 if (px > 0 && Math.abs(e) > px * 10 && shares && shares > 0) {
                   return parseFloat((e / shares).toFixed(2));
                 }
                 // لو EPS سالب كبير جداً بالنسبة للسعر -- مشكوك فيه
                 if (px > 0 && Math.abs(e) > px * 3) return null;
                 return parseFloat(e.toFixed(2));
               })(),
                   
      bvps:        f.book_value,
      pb:          f.price_to_book,
      beta:        f.beta,
            mc:          f.market_cap
                     ? (f.market_cap >= 1e12
                         ? (f.market_cap/1e12).toFixed(2)+"T"
                         : (f.market_cap/1e9).toFixed(2)+"B")
                     : null,
            mcRaw:       f.market_cap || null,
      sharesOut:   f.shares_outstanding,
      floatPct:    f.float_shares && f.shares_outstanding
                     ? parseFloat((f.float_shares/f.shares_outstanding*100).toFixed(2))
                     : null,
            hi52:        f.fifty_two_week_high,
      lo52:        f.fifty_two_week_low,
      // Technicals
      rsi14:          tech.rsi_14            || null,
      macdLine:       tech.macd_line         || null,
      macdSignal:     tech.macd_signal       || null,
      macdHistogram:  tech.macd_histogram    || null,
      ma50:           tech.fifty_day_average || null,
      techStrength:   tech.technical_strength|| null,
      priceDirection: tech.price_direction   || null,
      // Valuation
      fairPrice:      val.fair_price         || null,
      fairConfidence: val.fair_price_confidence || null,
      // Analysts
      analystsData: ana.num_analysts ? {
        targetMean:  ana.target_mean   || null,
        targetHigh:  ana.target_high   || null,
        targetLow:   ana.target_low    || null,
        consensus:   ana.consensus     || null,
        numAnalysts: ana.num_analysts  || 0,
      } : null,
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
      roe:        (r.roe != null && Math.abs(r.roe) < 100) ? r.roe : null,
      roa:        (r.roa != null && Math.abs(r.roa) < 50) ? r.roa : null,
      netMargin:  (r.net_margin != null && Math.abs(r.net_margin) < 100) ? r.net_margin : null,
      opMargin:   (r.operating_margin != null && Math.abs(r.operating_margin) < 100) ? r.operating_margin : null,
      debtEquity: r.debt_to_equity,
      roic:       (roic != null && Math.abs(roic) < 80) ? roic : null,
      epsGrw:     (function(){
                    var g = r.eps_growth ?? r.earnings_growth ?? null;
                    if (g == null) return null;
                    // ✨ إذا كان خارج ±200 فهو مضروب في 100
                    if (Math.abs(g) > 200) g = g / 100;
                    return parseFloat(g.toFixed(2));
                  })(),
      shares:     km.shares_outstanding ?? null,
      freeCashFlow: (function(){
                    var fcf = km.free_cash_flow ?? km.operating_cash_flow ?? null;
                    if (fcf == null) return null;
                    var shares = km.shares_outstanding;
                    // إذا كان إجمالياً (> سعر × 1000) قسّم على الأسهم
                    return (shares && shares > 0 && Math.abs(fcf) > 10000)
                      ? parseFloat((fcf / shares).toFixed(4))
                      : fcf;
                  })(),

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
    const incAll = (d.income_statements || []);
    const balAll = (d.balance_sheets || []);
    const cfAll  = (d.cash_flows || []);
    const inc = incAll.filter(x => x.is_full_year);
    const cf  = cfAll.filter(x => x.is_full_year);
    // نمو صافي الدخل (آخر سنتين كاملتين)
    let growthYoY = null;
    if (inc.length >= 2) {
      var newer = inc[0].net_income, older = inc[1].net_income;
      if (older && older !== 0) {
        growthYoY = parseFloat(((newer - older) / Math.abs(older) * 100).toFixed(1));
      }
    }
    // تنسيق الأرقام (مليار)
    var fmtB = function(v){ return v != null ? (v/1e9).toFixed(1)+" مليار" : "--"; };
    // بناء جداول العرض (سنوي)
// ربع سنوي
var incomeRowsQ = incAll.filter(function(x){return !x.is_full_year;}).slice(0,4).map(function(x){
  return {
    period: (x.fiscal_year || "") + " Q" + (x.fiscal_quarter || ""),
    "الإيرادات": fmtB(x.total_revenue),
    "الدخل التشغيلي": fmtB(x.operating_income),
    "صافي الدخل": fmtB(x.net_income),
  };
});
var incomeRows = incAll.filter(function(x){return x.is_full_year;}).slice(0,4).map(function(x){
  return {
    period: x.fiscal_year || "--",

        "الإيرادات": fmtB(x.total_revenue),
        "الدخل التشغيلي": fmtB(x.operating_income),
        "صافي الدخل": fmtB(x.net_income),
      };
    });
var balanceRowsQ = balAll.filter(function(x){return !x.is_full_year;}).slice(0,4).map(function(x){
  return {
    period: (x.fiscal_year || "") + " Q" + (x.fiscal_quarter || ""),
    "إجمالي الأصول": fmtB(x.total_assets),
    "إجمالي الخصوم": fmtB(x.total_liabilities),
    "حقوق الملكية": fmtB(x.stockholders_equity),
    "إجمالي الدين": fmtB(x.total_debt),
  };
});
var balanceRows = balAll.filter(function(x){return x.is_full_year;}).slice(0,4).map(function(x){
  return {
    period: x.fiscal_year || "--",

        "إجمالي الأصول": fmtB(x.total_assets),
        "إجمالي الخصوم": fmtB(x.total_liabilities),
        "حقوق الملكية": fmtB(x.stockholders_equity),
        "إجمالي الدين": fmtB(x.total_debt),
      };
    });
var cashflowRowsQ = cfAll.filter(function(x){return !x.is_full_year;}).slice(0,4).map(function(x){
  return {
    period: (x.fiscal_year || "") + " Q" + (x.fiscal_quarter || ""),
    "التدفق التشغيلي": fmtB(x.operating_cash_flow),
  };
});
var cashflowRows = cfAll.filter(function(x){return x.is_full_year;}).slice(0,4).map(function(x){
  return {
    period: x.fiscal_year || "--",

        "التدفق التشغيلي": fmtB(x.operating_cash_flow),
      };
    });
        // ═══ حساب درجات الصحة المالية ═══
    var scores = null;
    var latestInc = inc[0], latestBal = balAll.filter(function(x){return x.is_full_year;})[0], latestCf = cf[0];
    if (latestInc && latestBal) {
      var assets = latestBal.total_assets || 0;
      var liab = latestBal.total_liabilities || 0;
      var equity = latestBal.stockholders_equity || 0;
      var debt = latestBal.total_debt || 0;
      var rev = latestInc.total_revenue || 0;
      var opInc = latestInc.operating_income || 0;
      var netInc = latestInc.net_income || 0;
      var ocf = latestCf ? latestCf.operating_cash_flow : 0;

      // Altman Z-Score (تقريبي)
      var workingCap = assets - liab; // تقريب رأس المال العامل
      var z = assets > 0 ? (
        1.2 * (workingCap / assets) +
        1.4 * (netInc / assets) +
        3.3 * (opInc / assets) +
        0.6 * (equity / (liab || 1)) +
        1.0 * (rev / assets)
      ) : 0;
      z = parseFloat(z.toFixed(2));

      // Cash Score (من التدفق النقدي)
      var cashScore = rev > 0 ? Math.min(100, Math.round((ocf / rev) * 200)) : 0;

      // الربحية (هامش صافي + ROE)
      var nm = rev > 0 ? (netInc / rev * 100) : 0;
      var roeCalc = equity > 0 ? (netInc / equity * 100) : 0;
      var profitScore = Math.min(100, Math.round((nm * 2 + roeCalc * 2)));

      // النمو
      var growthScore = growthYoY != null ? Math.min(100, Math.max(0, Math.round(50 + growthYoY * 2))) : 50;

      // الديون (أقل = أفضل)
      var de = equity > 0 ? (debt / equity) : 0;
      var debtScore = Math.min(100, Math.max(0, Math.round(100 - de * 50)));

      // Piotroski تقريبي (من المتاح)
      var piotroski = 0;
      if (netInc > 0) piotroski += 2;
      if (ocf > 0) piotroski += 2;
      if (ocf > netInc) piotroski += 1;
      if (growthYoY != null && growthYoY > 0) piotroski += 2;
      if (de < 1) piotroski += 2;

      scores = {
        altmanZ: z,
        piotroski: piotroski,
        cashScore: cashScore,
        beneish: null, // ✨ يتطلب 8 متغيرات غير متاحة -- لا نعرض قيمة مُختلقة
        profitScore: Math.max(0, profitScore),
        growthScore: growthScore,
        debtScore: debtScore,
      };
    }

        // مسار EPS التاريخي (net_income / shares)
    // shares من fundamentals - نمررها لاحقاً، هنا نحفظ net_income
    var epsHistory = incAll.slice(0,8).reverse().map(function(x){
      return {
        period: x.fiscal_year || "--",
        _netIncome: x.net_income,
      };
    });

    const result = {
      growthYoY: growthYoY,
      _revLatest: inc.length > 0 ? inc[0].total_revenue : null,
      _ocfLatest: cf.length > 0 ? cf[0].operating_cash_flow : null,
      finScores: scores,
      epsHistoryRaw: epsHistory,
      financials: {
        income:   { annual: incomeRows,   quarterly: incomeRowsQ },
        balance:  { annual: balanceRows,  quarterly: balanceRowsQ },
        cashflow: { annual: cashflowRows, quarterly: cashflowRowsQ },
      },
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
    // سجل التوزيعات للعرض
    var divHistory = hist.slice(0, 8).map(function(h){
      return {
        date: h.distribution_date || h.eligibility_date || "--",
        div: h.value,
        type: h.period || "",
        yld: null,
      };
    });
            const result = {
      divYld:  d.trailing_12m_yield || null,
      annualDiv: d.trailing_12m_dividends || null,
      lastDiv: hist.length > 0 ? hist[0].value : null,
      divHistory: divHistory,
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

        // تحقق من cache الدائم (3 أشهر) للأساسيات
        const cachedFund = readFundCache(sym);
        if (cachedFund) {
          // الأساسيات من cache + السعر الحي فقط
          if (!cancelled) {
            setLiveData({
              ...cachedFund,        // الأساسيات المخزّنة
              ...quote,             // السعر الحي (يطغى)
              priceHistory: cachedFund.priceHistory || [],
            });
            setLastFetch(new Date().toLocaleTimeString("ar-SA"));
            setApiStatus(quote.isDelayed ? "delayed" : "live");
            setLoading(false);
          }
          return; // لا نجلب الأساسيات (من cache)
        }

        // cache مفقود/قديم → جلب متوازي كامل
const [company, ratios, financials, dividend, priceHistory] = await Promise.all([
  fetchSahmkCompany(sym),
  fetchSahmkRatios(sym),
  fetchSahmkFinancials(sym),
  fetchSahmkDividend(sym),
  fetchSahmkOhlcv(sym, '3M'),
]);

        
        // حسابات إضافية (P/S, PEG, EPS تاريخي)
        var extras = {};
        if (company && company.mc && financials && financials._revLatest) {
          // mc قد يكون "X.XXT" أو "X.XXB"
          var mcStr = company.mc;
          var mcNum = mcStr.indexOf('T') >= 0
            ? parseFloat(mcStr) * 1e12
            : parseFloat(mcStr) * 1e9;
          if (financials._revLatest > 0) {
            extras.ps = parseFloat((mcNum / financials._revLatest).toFixed(2));
          }
        }
        
        if (company && company.pe && financials && financials.growthYoY && financials.growthYoY > 0) {
          extras.peg = parseFloat((company.pe / financials.growthYoY).toFixed(2));
        }
        // مسار EPS = net_income / shares_outstanding
        if (company && company.sharesOut && financials && financials.epsHistoryRaw) {
          var shares = company.sharesOut;
          extras.epsHistory = financials.epsHistoryRaw.map(function(e){
            return {
              period: e.period,
              eps: e._netIncome && shares ? parseFloat((e._netIncome / shares).toFixed(2)) : null,
            };
          });
        }

                // تجميع الأساسيات للتخزين (بدون السعر المتغير)
var fundData = {
  ...(company || {}),
  ...(ratios || {}),
  ...(financials || {}),
  ...(dividend || {}),
  ...extras,
  priceHistory,
};

        // حفظ الأساسيات في cache الدائم (3 أشهر)
        writeFundCache(sym, fundData);

        if (!cancelled) {
          setLiveData({
            ...fundData,
            ...quote,
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

export { SDApiEngines, useSahmkData, sahmkFetch, fetchSahmkQuote, fetchSahmkCompany, fetchSahmkRatios, fetchSahmkFinancials, fetchSahmkDividend, fetchSahmkOhlcv };


