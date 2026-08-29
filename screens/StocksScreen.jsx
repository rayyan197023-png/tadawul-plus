'use client';
import React, { useState, useMemo, useEffect, useRef, useCallback, startTransition } from "react";
import { useHaptic }        from '../hooks/useHaptic';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useNav, useSharedPrices, useStockState } from '../store';
// import StockDetail removed -- opened by AppShell
import { useOHLCVCache }    from '../hooks/useOHLCVCache';

// ── Design Tokens ─────────────────────────────────────────────
const C = {
  ink:"#06080f",     deep:"#090c16",   void:"#0c1020",
  layer1:"#141d2b",  layer2:"#1e2d42", layer3:"#243352",
  edge:"#2e3e60",    line:"#32426a",
  snow:"#f0f6ff",    mist:"#c8d8f0",   smoke:"#90a4c8",  ash:"#5a6e94",
  gold:"#f0c050",    goldL:"#ffd878",  goldD:"#c09030",
  electric:"#4d9fff",electricL:"#82c0ff",
  plasma:"#a78bfa",  mint:"#1ee68a",   coral:"#ff5f6a",
  amber:"#fbbf24",   teal:"#22d3ee",
};

const SECTOR_COLORS = {
  طاقة:"#fbbf24",          بنوك:"#4d9fff",
  بتروكيماويات:"#a78bfa",  أغذية:"#1ee68a",
  تقنية:"#22d3ee",          اتصالات:"#22d3ee",
  تعدين:"#f0c050",          تأمين:"#ff5f6a",
  عقارات:"#82c0ff",         سياحة:"#ffd878",
  لوجستية:"#22d3ee",        "رعاية صحية":"#1ee68a",
  "مواد بناء":"#90a4c8",    صناعة:"#5a6e94",
  "طاقة متجددة":"#1ee68a",  زراعة:"#f0c050",
  "نقل وخدمات":"#4d9fff",   تعليم:"#a78bfa",
  إعلام:"#90a4c8",          خدمات:"#5a6e94",
  "خدمات مالية":"#a78bfa",  مرافق:"#1ee68a",
};


// ── Stock Card ────────────────────────────────────────────────
const StockCard = React.memo(function StockCard({ stk, bars, flash, openDetail, setFlash, fmtVol, netFlow }) {

  const up     = (stk.ch || 0) >= 0;
  const pc     = up ? C.mint : C.coral;
  const isFlsh = flash === stk.sym;
  return (
    <div
      className="card-stagger"
      style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}
      onClick={() => { setFlash(stk.sym); setTimeout(() => setFlash(null), 350); openDetail(stk.sym); }}
    >
      <div
        className={`stk-card ${isFlsh ? "flash" : ""}`}
        style={{
          background: `linear-gradient(160deg,${C.layer1} 0%,${C.layer2} 100%)`,
          border: `1px solid ${C.line}66`,
          boxShadow: "0 1px 6px rgba(0,0,0,.25)",
          cursor: "pointer",
        }}
      >
        <div style={{ height: 3, background: up ? `linear-gradient(90deg,${C.mint}00,${C.mint}cc,${C.mint}00)` : `linear-gradient(90deg,${C.coral}00,${C.coral}cc,${C.coral}00)` }} />
        <div style={{ display: "flex" }}>
          {/* يمين -- الاسم والرمز والحجم */}
          <div style={{ flexShrink: 0, minHeight: 60, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, padding: "10px 10px 10px 8px" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: C.snow, lineHeight: 1, letterSpacing: "-.3px" }}>{stk.name}</div>
            <span style={{ fontSize: 11, color: C.ash, background: C.layer3, padding: "1px 5px", borderRadius: 4 }}>{stk.sym}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: (stk.v || 0) > (stk.avgV || 0) ? C.mint : C.ash, fontFamily: "monospace" }}>
                {fmtVol(stk.v || 0)}
              </span>
              {(stk.v || 0) > (stk.avgV || 0) * 1.3 && <span style={{ fontSize: 11, color: C.mint }}>↑</span>}
            </div>
          </div>
          {/* وسط -- تدفق السيولة */}
          <div style={{ flex: 1, minWidth: 0, padding: "8px 6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {netFlow ? (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, direction: "ltr" }}>
                {[
                  { l: "صافي السيولة", v: (netFlow.net >= 0 ? "+" : "") + fmtVol(Math.abs(netFlow.net)), c: netFlow.net >= 0 ? C.mint : C.coral, b: true },
                  { l: "ش/ب", v: netFlow.pct + "%", c: netFlow.pct >= 50 ? C.mint : C.coral },
                ].map(function (r, i) {
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 5, direction: "rtl" }}>
                      <span style={{ fontSize: r.b ? 10 : 9, color: C.ash }}>{r.l}</span>
                      <span style={{ fontSize: r.b ? 14 : 11, fontWeight: r.b ? 900 : 700, color: r.c, fontFamily: "monospace", direction: "ltr" }}>{r.v}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: 9, color: C.ash }}>…</span>
            )}
          </div>
          {/* يسار -- السعر والتغيير */}
          <div style={{ flexShrink: 0, minHeight: 60, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "10px 8px 10px 0" }}>
            <div className="mono" style={{ fontSize: 18, fontWeight: 900, color: C.snow, direction: "ltr", lineHeight: 1, letterSpacing: "-.5px" }}>
              {(stk.p || 0).toFixed(2)}
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: `${pc}15`, border: `1px solid ${pc}30`, borderRadius: 5, padding: "2px 7px", direction: "ltr" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: pc }}>{up ? "+" : ""}{(stk.ch || 0).toFixed(2)}%</span>
              <span style={{ fontSize: 9, color: pc, opacity: 0.45 }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: pc }}>{up ? "+" : ""}{((stk.p || 0) * (stk.ch || 0) / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.stk.p    === next.stk.p   &&
  prev.stk.ch   === next.stk.ch  &&
  prev.stk.v    === next.stk.v   &&
  prev.flash    === next.flash   &&
  prev.netFlow  === next.netFlow &&
  prev.bars     === next.bars
);

// ── Main Screen ───────────────────────────────────────────────
function StocksPage() {
  const haptic                  = useHaptic();
const { stocks } = useStockState();
const liveStocks = stocks.length > 0 ? stocks : [];
  const { openStock }           = useNav();

  const barsCache    = useRef({});
  const scrollPos    = useRef(0);
  const listRef      = useRef(null);

  const [sel,          setSel]         = useState(null);
  const [tab,          setTab]         = useState("all");
    const [sortBy, setSortBy] = useState("all");
  const [flash,        setFlash]       = useState(null);
  const [isLoading,    setIsLoading]   = useState(true);
  const [showTop,      setShowTop]     = useState(false);
  const [showFilter,   setShowFilter]  = useState(false);
  const [visibleCount, setVisibleCount]= useState(20);
  const [search,       setSearch]      = useState("");
  const [showSrch,     setShowSrch]    = useState(false);
  const [now,          setNow]         = useState(new Date());


  // ── إخفاء Skeleton عند وصول البيانات ─────────────────────
  useEffect(() => {
    if (liveStocks.length > 0) {
      setIsLoading(false);
      setTimeout(() => setVisibleCount(50),   300);
      setTimeout(() => setVisibleCount(9999), 600);
    }
  }, [liveStocks.length]);

  // Fallback: إخفاء Skeleton بعد 5 ثوان حتى لو لم تصل البيانات
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // ── Scroll listener ───────────────────────────────────────
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setShowTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // ── Clock ─────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  // ── Pull to Refresh ───────────────────────────────────────
  // ✨ تحديث فعلي: نمسح كاش الشموع ليُعاد بناؤه من tp_hist_ المحدَّث
  const handleRefresh = useCallback(async () => {
    barsCache.current = {};
    await new Promise(res => setTimeout(res, 400));
  }, []);
  const { containerRef: pullRef, isPulling, pullProgress, isRefreshing, touchHandlers } =
    usePullToRefresh(handleRefresh, 60);

  const allData = useMemo(() =>
    liveStocks.map(stk => {
      // ✨ الشموع الحقيقية تنتهي بإغلاق الأمس لا بالسعر اللحظي،
      //    فنكتفي بقراءتها مرة واحدة لكل سهم
      return { stk, bars: [] };
    }),
  [liveStocks]);

  // ── الفلترة والترتيب ──────────────────────────────────────
  const filtered = useMemo(() => {
    let arr = tab === "all" ? [...allData] : allData.filter(d => d.stk.sec === tab);
    if (search) arr = arr.filter(d =>
      (d.stk.name || '').includes(search) || d.stk.sym.includes(search)
    );
    if (sortBy === "vol") arr.sort((a, b) => (b.stk.v || 0) - (a.stk.v || 0));
    else if (sortBy === "ch") arr.sort((a, b) => (b.stk.ch || 0) - (a.stk.ch || 0));
    return arr;
  }, [allData, tab, sortBy, search]);

  // ✨ جلب بيانات OHLCV الحقيقية لأول 30 سهماً مرئياً (آمن من 429)
  // يتبع القائمة المفلترة: عند تغيير القطاع/البحث، يُجلب أول 30 من النتيجة الجديدة

  // ✨ لم نعد نعرض شارتاً -- الشموع كانت تبطئ جلب السيولة
  var realBars = {};

const [liquidityMap, setLiquidityMap] = useState({});
const liquidityFetched = useRef(new Set());

  var _liqTimers = useRef([]);
  useEffect(function() {
    // ✨ ألغِ المؤقتات السابقة قبل بدء دفعة جديدة
    _liqTimers.current.forEach(function(t){ clearTimeout(t); });
    _liqTimers.current = [];
    // ✨ يتوسع مع التمرير -- visibleCount يزيد تدريجياً
    var syms = filtered.slice(0, Math.min(visibleCount, filtered.length)).map(function(d) { return d.stk.sym; });
  var toFetch = syms.filter(function(s) { return !liquidityFetched.current.has(s); });
  if (toFetch.length === 0) return;
  
  // جلب واحد كل 300ms لتفادي 429
  toFetch.forEach(function(sym, i) {
    _liqTimers.current.push(setTimeout(function() {
      liquidityFetched.current.add(sym);
      fetch('/api/sahmkdata?endpoint=liquidity&sym=' + sym)
        .then(function(r) { return r.json(); })
        .then(function(j) {
          if (j && j.liquidity && typeof j.liquidity.net_value === 'number') {
            var L = j.liquidity;
            var tot = (L.inflow_value || 0) + (L.outflow_value || 0);
            setLiquidityMap(function(prev) {
              return Object.assign({}, prev, { [sym]: {
                net:  L.net_value,
                buy:  L.inflow_value || 0,
                sell: L.outflow_value || 0,
                pct:  tot > 0 ? Math.round((L.inflow_value || 0) / tot * 100) : 50,
              }});
            });
          }
        })

        .catch(function() {});
    }, i * 300));
  });
}, [filtered.slice(0, Math.min(visibleCount, filtered.length)).map(function(d){ return d.stk.sym; }).join(',')]);

  // ── إحصاءات ───────────────────────────────────────────────
  const upCount   = liveStocks.filter(s => (s.ch || 0) > 0).length;
  const downCount = liveStocks.filter(s => (s.ch || 0) < 0).length;
  const avgCh     = liveStocks.length > 0
    ? (liveStocks.reduce((s, x) => s + (x.ch || 0), 0) / liveStocks.length).toFixed(2)
    : "0.00";

  const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const fmtVol  = v => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "م" : v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v || 0);
  const listKey = `${tab}-${sortBy}`;
  const activeFiltersCount = (tab !== "all" ? 1 : 0) + (sortBy !== "all" ? 1 : 0);


  // ── فتح التفاصيل ─────────────────────────────────────────
  const openDetail = useCallback(sym => {
    haptic.tap();
    scrollPos.current = window.scrollY;
    setSel(sym);
    const found = liveStocks.find(s => s.sym === sym);
    if (found) openStock(found);
  }, [haptic, liveStocks, openStock]);

  const closeDetail = () => {
    setSel(null);
    requestAnimationFrame(() => window.scrollTo({ top: scrollPos.current }));
  };

  const changeTab    = v => { haptic.tap(); startTransition(() => setTab(v)); };
  const changeSortBy = v => { setSortBy(v); setShowFilter(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div
      style={{ maxWidth: 430, margin: "0 auto", background: C.ink, minHeight: "100vh", fontFamily: "Cairo,system-ui,sans-serif", direction: "rtl", color: C.snow, position: "relative", overflow: "hidden" }}
      ref={pullRef}
      {...touchHandlers}
    >

      {/* Pull to Refresh */}
      {(isPulling || isRefreshing) && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(180deg,rgba(7,11,18,.95),transparent)", paddingTop: 8, transform: `translateY(${Math.round((isPulling ? pullProgress : 1) * 48 - 48)}px)`, transition: isRefreshing ? "none" : "transform .15s" }}>
          <span style={{ fontSize: 10, color: C.gold }}>
            {isRefreshing ? "جارٍ التحديث..." : pullProgress >= 1 ? "أطلق للتحديث ↑" : "اسحب للتحديث ↓"}
          </span>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:0;height:0}
        .mono{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;letter-spacing:-.3px}
        @keyframes cardStagger{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
        @keyframes flashPulse{0%{opacity:1;transform:scale(1)}15%{opacity:.55;transform:scale(.982)}100%{opacity:1;transform:scale(1)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .card-stagger{animation:cardStagger .28s cubic-bezier(.16,1,.3,1) both}
        .fade-in{animation:fadeIn .25s ease both}
        .slide-down{animation:slideDown .22s cubic-bezier(.16,1,.3,1) both}
        .flash{animation:flashPulse .35s ease both}
        .live{animation:pulse 2s ease-in-out infinite}
        .stk-card{transition:transform .15s ease,box-shadow .15s ease}
        .stk-card:active{transform:scale(.978)}
        button{font-family:inherit;transition:transform .12s ease,opacity .12s ease}
        button:active{transform:scale(.91);opacity:.82}
        input::placeholder{color:#5a6e94}
      `}</style>

      {/* خلفية */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[
          { w: 300, h: 300, t: "-5%",  r: "-10%", c: C.gold + "08" },
          { w: 240, h: 240, t: "50%",  r: "-5%",  c: C.gold + "06" },
          { w: 260, h: 260, t: "25%",  r: "60%",  c: C.electric + "07" },
          { w: 180, h: 180, t: "70%",  r: "15%",  c: C.plasma + "06" },
        ].map((p, i) => (
          <div key={i} style={{ position: "absolute", width: p.w, height: p.h, borderRadius: "50%", background: `radial-gradient(circle,${p.c} 0%,transparent 70%)`, top: p.t, right: p.r }} />
        ))}
      </div>

      <div style={{ position: "relative", zIndex: 1, paddingBottom: 80 }}>

        {/* هيدر */}
        <div style={{ padding: "52px 20px 10px", background: `linear-gradient(180deg,${C.void}ff 60%,${C.void}00 100%)`, position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: "3px", marginBottom: 2 }}>TADAWUL+</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: C.snow, letterSpacing: "-.5px" }}>سوق الأسهم</div>
                {(function(){
                  // فحص حالة السوق السعودي (KSA UTC+3)
                  var nowD = new Date();
                  var utc = nowD.getTime() + (nowD.getTimezoneOffset() * 60000);
                  var ksa = new Date(utc + 3 * 3600000);
                  var day = ksa.getDay();
                  var timeInMin = ksa.getHours() * 60 + ksa.getMinutes();
                  var isOpen = (day >= 0 && day <= 4) && (timeInMin >= 570 && timeInMin <= 930);
                  var stCol = isOpen ? C.mint : C.coral;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div className={isOpen?"live":""} style={{ width: 5, height: 5, borderRadius: "50%", background: stCol, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.smoke, fontFamily: "monospace" }}>{timeStr}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowSrch(v => !v); if (showSrch) setSearch(""); }}
                style={{ background: showSrch ? C.electric + "22" : "rgba(255,255,255,.04)", border: `1px solid ${showSrch ? C.electric + "55" : C.line}`, borderRadius: 12, width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showSrch ? C.electric : C.smoke} strokeWidth="2.2" strokeLinecap="round">
                  {showSrch ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" /></>}
                </svg>
              </button>
              <button onClick={() => setShowFilter(v => !v)}
                style={{ position: "relative", background: showFilter || activeFiltersCount > 0 ? C.gold + "22" : "rgba(255,255,255,.04)", border: `1px solid ${showFilter || activeFiltersCount > 0 ? C.gold + "55" : C.line}`, borderRadius: 12, width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={showFilter || activeFiltersCount > 0 ? C.gold : C.smoke} strokeWidth="2.2" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
                </svg>
                {activeFiltersCount > 0 && <div style={{ position: "absolute", top: 6, left: 6, width: 8, height: 8, borderRadius: "50%", background: C.gold, border: `1px solid ${C.void}` }} />}
              </button>
            </div>
          </div>

          {/* شريط البحث */}
          {showSrch && (
            <div className="fade-in" style={{ marginBottom: 8 }}>
              <input
                autoFocus value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") { setShowSrch(false); setSearch(""); } }}
                placeholder="ابحث باسم السهم أو الرمز..."
                style={{ width: "100%", background: C.layer1, border: `1px solid ${C.electric}55`, borderRadius: 12, padding: "11px 14px", color: C.snow, fontSize: 13, fontFamily: "Cairo,sans-serif", direction: "rtl", outline: "none" }}
              />
            </div>
          )}

          {/* ملخص السوق */}
          <div style={{ background: C.layer1, borderRadius: 12, padding: "8px 14px", border: `1px solid ${C.line}`, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 14 }}>
                {[
                  { v: upCount,                                    l: "صاعد",  c: C.mint  },
                  { v: downCount,                                  l: "هابط",  c: C.coral },
                  { v: liveStocks.length - upCount - downCount,    l: "مستقر", c: C.smoke },
                ].map((it, i) => (
                  <div key={i} style={{ textAlign: "center", paddingLeft: i > 0 ? 14 : 0, borderLeft: i > 0 ? `1px solid ${C.line}` : "none" }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: it.c }}>{it.v}</div>
                    <div style={{ fontSize: 11, color: C.ash }}>{it.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: C.ash }}>متوسط التغير</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 900, color: parseFloat(avgCh) >= 0 ? C.mint : C.coral }}>
                  {parseFloat(avgCh) > 0 ? "+" : ""}{avgCh}%
                </div>
              </div>
            </div>
            {liveStocks.length > 0 && (
              <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", gap: 1 }}>
                <div style={{ width: `${(upCount / liveStocks.length) * 100}%`, background: `linear-gradient(90deg,${C.mint}88,${C.mint})`, borderRadius: "2px 0 0 2px" }} />
                <div style={{ width: `${((liveStocks.length - upCount - downCount) / liveStocks.length) * 100}%`, background: C.smoke + "44" }} />
                <div style={{ flex: 1, background: `linear-gradient(90deg,${C.coral},${C.coral}88)`, borderRadius: "0 2px 2px 0" }} />
              </div>
            )}
          </div>

          {/* الفلاتر النشطة */}
          {(tab !== "all" || sortBy !== "all") && (
            <div className="fade-in" style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
              {tab !== "all" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.layer2, border: `1px solid ${SECTOR_COLORS[tab] || C.line}55`, borderRadius: 8, padding: "4px 10px" }}>
                  <span style={{ fontSize: 11, color: SECTOR_COLORS[tab] || C.smoke, fontWeight: 700 }}>{tab}</span>
                  <button onClick={() => changeTab("all")} style={{ background: "none", border: "none", color: C.ash, fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                </div>
              )}
              {sortBy !== "all" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, background: C.layer2, border: `1px solid ${C.electric}55`, borderRadius: 8, padding: "4px 10px" }}>
                  <span style={{ fontSize: 11, color: C.electric, fontWeight: 700 }}>{sortBy === "vol" ? "الحجم" : sortBy === "ch" ? "التغيّر" : sortBy}</span>
                  <button onClick={() => changeSortBy("all")} style={{ background: "none", border: "none", color: C.ash, fontSize: 13, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                </div>
              )}
            </div>
          )}

          {/* Panel الفلتر */}
          {showFilter && (
            <div className="slide-down" onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 20, right: 20, zIndex: 60, background: C.layer1, border: `1px solid ${C.line}`, borderRadius: 16, padding: "16px", boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: C.ash, fontWeight: 700, letterSpacing: "2px", marginBottom: 8 }}>القطاع</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { k: "all", l: "الكل", c: C.electric, count: allData.length },
                    // ✨ القطاعات من البيانات الفعلية -- SECTORS لم تكن معرّفة والفلتر ينهار
                    ...Array.from(new Set(allData.map(d => d.stk.sec).filter(Boolean))).map(sec => ({ k: sec, l: sec, c: SECTOR_COLORS[sec] || C.smoke, count: allData.filter(d => d.stk.sec === sec).length })),
                  ].map(({ k, l, c, count }) => (
                    <button key={k} onClick={() => changeTab(k)}
                      style={{ flex: "0 0 auto", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontSize: 11, fontWeight: 700, background: tab === k ? c + "25" : "transparent", border: `1px solid ${tab === k ? c + "66" : C.line}`, color: tab === k ? c : C.smoke, transition: "all .15s ease", display: "flex", alignItems: "center", gap: 4 }}>
                      {l}
                      <span style={{ fontSize: 10, opacity: 0.6, background: tab === k ? c + "22" : C.layer3, padding: "0 4px", borderRadius: 4 }}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.ash, fontWeight: 700, letterSpacing: "2px", marginBottom: 8 }}>الترتيب</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { k: "all", l: "الافتراضي", icon: "⊞" },
                    { k: "ch",  l: "% التغير",  icon: "↕" },
                    { k: "vol", l: "الحجم",      icon: "◈" },
                  ].map(({ k, l, icon }) => (
                    <button key={k} onClick={() => changeSortBy(k)}
                      style={{ flex: 1, padding: "8px 6px", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontSize: 11, fontWeight: 700, background: sortBy === k ? C.electric + "22" : "transparent", border: `1px solid ${sortBy === k ? C.electric + "55" : C.line}`, color: sortBy === k ? C.electric : C.smoke, transition: "all .15s ease", textAlign: "center" }}>
                      <div style={{ fontSize: 14, marginBottom: 2 }}>{icon}</div>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {activeFiltersCount > 0 && (
                <button onClick={() => { changeTab("all"); changeSortBy("ch"); }}
                  style={{ width: "100%", marginTop: 12, padding: "8px", borderRadius: 8, background: "transparent", border: `1px solid ${C.coral}44`, color: C.coral, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          )}
        </div>

        {/* Skeleton Loading */}
        {isLoading && (
          <div style={{ padding: "10px 16px 0" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 72, marginBottom: 8, borderRadius: 12, background: "linear-gradient(90deg,#111827 25%,#1a2332 50%,#111827 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite", animationDelay: i * 0.1 + "s" }} />
            ))}
          </div>
        )}

        {/* زر الصعود */}
        {showTop && (
          <button
            onClick={() => { haptic.tap(); listRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }}
            style={{ position: "fixed", bottom: 100, left: 20, zIndex: 30, background: C.layer2, border: `1px solid ${C.line}`, borderRadius: 12, width: 40, height: 40, color: C.smoke, fontSize: 16, cursor: "pointer" }}>
            ↑
          </button>
        )}

        {/* قائمة الأسهم */}
        <div
          ref={listRef}
          style={{ padding: "10px 16px 0", overflowY: "auto", WebkitOverflowScrolling: "touch", display: isLoading ? "none" : "block" }}
        >
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 20px" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.mist, marginBottom: 6 }}>
                {liveStocks.length === 0 ? "جارٍ تحميل الأسهم..." : "لا توجد أسهم مطابقة"}
              </div>
              {liveStocks.length > 0 && (
                <button
                  onClick={() => { changeTab("all"); setSearch(""); setShowSrch(false); }}
                  style={{ background: C.electric + "22", border: `1px solid ${C.electric}44`, borderRadius: 10, padding: "12px 28px", color: C.electric, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>
          ) : ((() => {
            const groupBySector = sortBy === "all";
            const groups = [];
            if (groupBySector) {
              const secIndex = {};
              filtered.forEach(item => {
                const sec = item.stk.sec || "أخرى";
                if (secIndex[sec] === undefined) {
                  secIndex[sec] = groups.length;
                  groups.push({ sec, items: [] });
                }
                groups[secIndex[sec]].items.push(item);
              });
            } else {
              groups.push({ sec: null, items: filtered });
            }
            const singleSec = !groupBySector || groups.length === 1;
            let globalIdx   = 0;
            return (
              <div key={listKey}>
                {groups.map((group, gi) => (
                  <div key={group.sec} style={{ marginBottom: gi < groups.length - 1 ? 18 : 0 }}>
                    {!singleSec && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, marginTop: gi > 0 ? 8 : 0 }}>
                        <div style={{ width: 3, height: 14, background: SECTOR_COLORS[group.sec] || C.line, borderRadius: 2, flexShrink: 0, boxShadow: `0 0 6px ${SECTOR_COLORS[group.sec] || C.line}66` }} />
                        <span style={{ fontSize: 12, fontWeight: 900, color: C.snow }}>{group.sec}</span>
                        <span style={{ fontSize: 11, color: C.ash, background: C.layer2, padding: "1px 7px", borderRadius: 4, border: `1px solid ${C.line}` }}>{group.items.length}</span>
                        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${SECTOR_COLORS[group.sec] || C.line}33,transparent)` }} />
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, touchAction: "pan-y" }}>
                                            {group.items.slice(0, Math.max(0, visibleCount - globalIdx)).map(({ stk, bars }) => {
                        globalIdx++;
                        // ✨ بيانات حقيقية إن توفّرت (للمرئي)، وإلا الرسم التقريبي
                        var realB = realBars[stk.sym];
                        var chartBars = (realB && realB.length >= 10) ? realB : bars;
                        return (
                          <StockCard
                            key={stk.sym}
                            stk={stk}
                            bars={chartBars}
                            flash={flash}
                            openDetail={openDetail}
                            setFlash={setFlash}
                            fmtVol={fmtVol}
                            netFlow={liquidityMap[stk.sym]}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })())}
        </div>
      </div>

      {/* StockDetail يُفتح عبر AppShell -- لا حاجة لطبقة هنا */}
    </div>
  );
}

export { StocksPage };
export default StocksPage;
