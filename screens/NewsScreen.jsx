'use client';
/**
 * NEWS SCREEN — الأخبار
 * تداول+ · Terminal Obsidian × Saudi Gold
 * مطابق 100٪ للملف الأصلي
 */

import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from "react";

const C = {
  ink:     "#04070d",
  void:    "#090e1a",
  layer1:  "#111a28",
  layer2:  "#182234",
  layer3:  "#1e2b40",
  line:    "#2a3b5c",
  snow:    "#eef5ff",
  mist:    "#b8cee8",
  smoke:   "#7a90b0",
  ash:     "#6b82a8",
  gold:    "#f0c050",
  electric:"#4d9fff",
  plasma:  "#a78bfa",
  mint:    "#1ee68a",
  coral:   "#ff5a64",
  teal:    "#22d3ee",
};

const CAT_COLORS = {
  أرباح:   C.mint,
  توزيعات: C.gold,
  تحليل:   C.electric,
  أخبار:   C.plasma,
  اقتصاد:  C.teal,
};

const ALL_TAB_COLOR = C.snow;
const tabColor = (t) => t === "كل الأخبار" ? ALL_TAB_COLOR : (CAT_COLORS[t] ?? C.electric);

const CAT_ICONS = {
  أرباح:"📈", توزيعات:"💰", تحليل:"🔍", أخبار:"📰", اقتصاد:"🏦",
};

const TABS       = ["كل الأخبار","أرباح","توزيعات","تحليل","أخبار","اقتصاد"];

const arabicPlural = (n, one, two, few, many) => {
  if (n === 1)             return `${n} ${one}`;
  if (n === 2)             return `${n} ${two}`;
  if (n >= 3  && n <= 10) return `${n} ${few}`;
  if (n >= 11 && n <= 99) return `${n} ${many}`;
  return `${n} ${one}`;
};

const bodyPreview = (text) => {
  const idx = text.lastIndexOf(" ", 80);
  return (idx > 0 ? text.slice(0, idx) : text.slice(0, 80)) + "…";
};

const splitParagraphs = (text) => {
  const sentences = text.match(/[^.!?؟]+[.!?؟]+/gu) ?? [text];
  const paras = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const chunk = sentences.slice(i, i + 2).join(" ").trim();
    if (chunk.length > 15) paras.push(chunk);
  }
  return paras.length > 0 ? paras : [text];
};

const readingTime = (text) => {
  const words = text.trim().split(/\s+/).length;
  const mins  = Math.max(1, Math.round(words / 150));
  return mins === 1 ? "دقيقة واحدة" : arabicPlural(mins, "دقيقة", "دقيقتان", "دقائق", "دقيقة");
};

const STOCK_PRICES = {
  "2222": { price:"27.40", change:"+0.55", pct:"+2.05%", up:true  },
  "1120": { price:"95.80", change:"+1.20", pct:"+1.27%", up:true  },
  "1211": { price:"43.90", change:"-0.40", pct:"-0.90%", up:false },
  "2010": { price:"82.20", change:"-0.80", pct:"-0.96%", up:false },
  "7010": { price:"53.50", change:"+0.30", pct:"+0.56%", up:true  },
};

const NEWS = [
  { id:"n1", title:"أرامكو تعلن نتائج مالية قوية بأرباح تتجاوز التوقعات",
    ago:"منذ ساعتين", cat:"أرباح", sym:"2222", hot:true,
    body:"أعلنت شركة أرامكو السعودية عن نتائجها المالية للربع الرابع، مسجلةً أرباحاً صافية تجاوزت توقعات المحللين بنسبة 12%. جاءت النتائج مدعومةً بارتفاع أسعار النفط وتحسّن هوامش التكرير، مما يعكس متانة الأداء التشغيلي رغم تقلبات السوق العالمية. وأشار الرئيس التنفيذي إلى أن الشركة ماضية في تنفيذ مشاريع التوسع وفق الجداول الزمنية المحددة، مؤكداً أن المجموعة تتطلع لتعزيز مكانتها كأكبر منتج للطاقة على مستوى العالم." },
  { id:"n2", title:"الراجحي يرفع توزيعات الأرباح إلى 2.75 ريال للسهم",
    ago:"منذ 4 ساعات", cat:"توزيعات", sym:"1120",
    body:"أقرّ مجلس إدارة مصرف الراجحي توزيع أرباح نقدية للمساهمين بواقع 2.75 ريال للسهم عن النصف الثاني من العام، بارتفاع 10% عن التوزيعات السابقة. ويعكس هذا القرار الثقة في المركز المالي للمصرف ومتانة محفظته الائتمانية في ظل بيئة أسعار فائدة مرتفعة أسهمت في دعم صافي هامش الفائدة." },
  { id:"n3", title:"تراجع النفط يضغط على أسهم الطاقة في التداولات الصباحية",
    ago:"منذ 6 ساعات", cat:"تحليل", sym:"",
    body:"تراجعت أسهم قطاع الطاقة في تداولات الصباح تزامناً مع انخفاض أسعار النفط الخام بنسبة 1.8%، إثر بيانات مخزونات أمريكية فاقت التوقعات. ويرى المحللون أن هذا التراجع يمثل فرصة تراكم على المدى المتوسط، مستندين إلى تحسّن توقعات الطلب الآسيوي خلال الربع القادم." },
  { id:"n4", title:"صندوق الاستثمارات العامة يستحوذ على حصة في شركة تقنية عالمية",
    ago:"منذ 8 ساعات", cat:"أخبار", sym:"",
    body:"كشف صندوق الاستثمارات العامة عن استحواذه على حصة استراتيجية في إحدى شركات التقنية العالمية الرائدة في مجال الذكاء الاصطناعي. تأتي هذه الخطوة متسقةً مع أهداف رؤية 2030 الرامية إلى بناء اقتصاد معرفي متنوع." },
  { id:"n5", title:"البنك المركزي يثبت معدلات الفائدة عند مستوياتها الحالية",
    ago:"منذ 10 ساعات", cat:"اقتصاد", sym:"",
    body:"قررت لجنة السياسة النقدية في البنك المركزي السعودي (ساما) الإبقاء على معدل اتفاقيات إعادة الشراء عند مستواه الحالي للمرة الثالثة على التوالي. ويتوقع المحللون أن يبدأ البنك دورة تخفيض تدريجية مطلع العام القادم تزامناً مع توجهات الفيدرالي الأمريكي." },
  { id:"n6", title:"معادن تسجل قفزة في الإيرادات بدعم من ارتفاع أسعار الذهب",
    ago:"منذ 12 ساعة", cat:"أرباح", sym:"1211",
    body:"حققت شركة معادن ارتفاعاً ملحوظاً في إيراداتها الفصلية بلغ 23% على أساس سنوي، مدفوعاً بارتفاع أسعار الذهب إلى مستويات قياسية وزيادة الطاقة الإنتاجية لمجمع الفوسفات." },
  { id:"n7", title:"سابك تستعد لإطلاق خط إنتاج جديد في مجمع الجبيل",
    ago:"منذ يوم", cat:"أخبار", sym:"2010",
    body:"أعلنت سابك عن استعدادها لتشغيل خط إنتاج جديد في مجمع الجبيل الصناعي خلال الربع القادم بطاقة 500 ألف طن سنوياً من البتروكيماويات، ضمن الخطة الاستراتيجية لتعزيز الحصة في الأسواق الآسيوية." },
  { id:"n8", title:"مؤشر تداول يغلق على ارتفاع بدعم من أسهم البنوك والطاقة",
    ago:"منذ يوم", cat:"تحليل", sym:"",
    body:"أنهى مؤشر السوق المالية السعودية جلسته على ارتفاع بنسبة 0.74%، مدعوماً بمكاسب قطاعَي البنوك والطاقة. وسجّل المؤشر أعلى مستوياته في ثلاثة أسابيع فيما تجاوز حجم التداول 7 مليارات ريال للمرة الأولى هذا الشهر." },
  { id:"n9", title:"STC تطلق باقة جديدة للخدمات السحابية للمؤسسات",
    ago:"منذ يومين", cat:"أخبار", sym:"7010",
    body:"كشفت شركة الاتصالات السعودية عن باقة متكاملة من الحلول السحابية للقطاع المؤسسي تشمل الحوسبة والتخزين والأمن السيبراني، وتستهدف الاستحواذ على حصة أكبر من سوق التحول الرقمي المحلي المقدّر بأكثر من 30 مليار ريال." },
  { id:"n10", title:"توقعات بتحسن أداء السوق السعودي في الربع القادم",
    ago:"منذ يومين", cat:"تحليل", sym:"",
    body:"رفعت عدة بيوت استثمار عالمية توصياتها على السوق السعودي إلى 'تفوق على المؤشر' مستندةً إلى تحسّن توقعات النمو الاقتصادي ومضاعفات التقييم الجاذبة، فيما يُشكّل استمرار تدفق الاستثمارات الأجنبية داعماً إضافياً." },
];

const FEEDBACK_THEME = {
  mint: C.mint, coral: C.coral, gold: C.gold,
  layer1: C.layer1, layer2: C.layer2, line: C.line,
  ash: C.ash, smoke: C.smoke,
};

const STYLE_ID = "tadawul-global-css";
const FONT_ID  = "tadawul-font";

const GLOBAL_CSS = `
  * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent }
  ::-webkit-scrollbar { display:none }
  * { scrollbar-width:none; -ms-overflow-style:none }
  button { font-family:inherit; cursor:pointer; border:none; outline:none }
  button:focus { outline:2px solid #4d9fff; outline-offset:2px; border-radius:6px }
  button:focus:not(:focus-visible) { outline:none }
  button:focus-visible { outline:2px solid #4d9fff; outline-offset:2px; border-radius:6px }
  [role="button"]:focus { outline:2px solid #4d9fff; outline-offset:2px; border-radius:6px }
  [role="button"]:focus:not(:focus-visible) { outline:none }
  [role="button"]:focus-visible { outline:2px solid #4d9fff; outline-offset:2px; border-radius:6px }
  [role="article"]:focus { outline:2px solid #4d9fff; outline-offset:-2px }
  [role="article"]:focus:not(:focus-visible) { outline:none }
  [role="article"]:focus-visible { outline:2px solid #4d9fff; outline-offset:-2px }
  .pressable:active { transform:scale(.95); opacity:.82 }
  .news-row { cursor:pointer; transition:background .12s ease }
  .news-row:hover { background:var(--c-layer2) }
  .news-row:active { opacity:.76 }
  @media (prefers-reduced-motion: no-preference) {
    @keyframes fadeUp   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
    @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes slideUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    @keyframes slideDown{ from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(16px)} }
    @keyframes shimmer  { 0%,100%{opacity:.3} 50%{opacity:.7} }
    @keyframes pulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.18)} }
    @keyframes hotPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .fade-up   { animation: fadeUp   .22s cubic-bezier(.22,1,.36,1) both }
    .fade-in   { animation: fadeIn   .18s ease both }
    .slide-up  { animation: slideUp  .26s cubic-bezier(.22,1,.36,1) both }
    .slide-down{ animation: slideDown .22s ease both }
    .do-shimmer      { animation: shimmer  1.5s ease infinite }
    .sk-1.do-shimmer { animation-delay: 0s }
    .sk-2.do-shimmer { animation-delay: .12s }
    .sk-3.do-shimmer { animation-delay: .22s }
    .sk-4.do-shimmer { animation-delay: .30s }
    .do-pulse { animation: pulse    2.5s ease infinite }
    .do-hot   { animation: hotPulse 1.8s ease infinite }
    .news-stagger { animation-delay: calc(var(--idx,0) * 0.04s) }
  }
  .search-input { background:transparent; border:none; outline:none; font-family:inherit;
    color:#eef5ff; font-size:13px; font-weight:500; width:100%; direction:rtl }
  .search-input::placeholder { color:#6b82a8 }
  .stock-popup { animation: fadeIn .15s ease both }
  @media (prefers-reduced-motion: reduce) {
    .fade-up,.fade-in,.slide-up,.slide-down { animation:none; opacity:1 }
    .do-shimmer { animation:none; opacity:.45 }
    .do-pulse,.do-hot { animation:none }
    .news-stagger { animation-delay:0s }
  }
`;

function useGlobalStyle() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById(FONT_ID)) {
      const link = document.createElement("link");
      link.id = FONT_ID; link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID; style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
      document.documentElement.style.setProperty("--c-layer2", C.layer2);
    }
  }, []);
}

function SkeletonRow({ isLast }) {
  return (
    <div style={{ background:C.layer1, paddingBlock:"14px", paddingInline:"16px", display:"flex", gap:12,
      alignItems:"flex-start", borderBottom: isLast ? undefined : `1px solid ${C.line}33` }}>
      <div style={{ width:3, borderRadius:2, alignSelf:"stretch", background:C.layer3, flexShrink:0, minHeight:52 }}/>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:9 }}>
        <div className="do-shimmer sk-1" style={{ height:13, borderRadius:5, background:C.layer3, width:"88%" }}/>
        <div className="do-shimmer sk-2" style={{ height:13, borderRadius:5, background:C.layer3, width:"66%" }}/>
        <div style={{ display:"flex", gap:7, marginBlockStart:2 }}>
          <div className="do-shimmer sk-3" style={{ height:20, width:52, borderRadius:5, background:C.layer3 }}/>
          <div className="do-shimmer sk-4" style={{ height:20, width:38, borderRadius:5, background:C.layer3 }}/>
        </div>
      </div>
    </div>
  );
}

function ReadingProgress({ scrollRef, newsId }) {
  const [pct, setPct] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    setPct(0);
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const max = scrollHeight - clientHeight;
        setPct(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0);
      });
    };
    el.addEventListener("scroll", onScroll, { passive:true });
    return () => { el.removeEventListener("scroll", onScroll); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [scrollRef, newsId]);
  return (
    <div style={{ position:"absolute", insetBlockEnd:0, insetInlineStart:0, insetInlineEnd:0, height:2, background:C.layer3 }}>
      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.electric},${C.mint})`, transition:"width .08s linear", borderRadius:1 }}/>
    </div>
  );
}

function StockPopup({ sym, onClose }) {
  const ref = useRef(null);
  const data = STOCK_PRICES[sym];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("pointerdown", handler, { capture:true });
    return () => document.removeEventListener("pointerdown", handler, { capture:true });
  }, [onClose]);

  if (!data) return null;
  return (
    <div ref={ref} className="stock-popup" style={{ position:"absolute", insetBlockStart:"calc(100% + 6px)",
      insetInlineEnd:0, zIndex:200, minWidth:160,
      background:C.layer2, border:`1px solid ${C.line}`,
      borderRadius:12, paddingBlock:"10px", paddingInline:"14px",
      boxShadow:`0 8px 32px ${C.ink}cc` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBlockEnd:6 }}>
        <span style={{ fontSize:11, fontWeight:800, color:C.snow }}>{sym}</span>
        <button onClick={onClose} onPointerDown={ev => ev.stopPropagation()} aria-label="إغلاق" className="pressable"
          style={{ background:"none", color:C.ash, fontSize:14, lineHeight:1, paddingInline:"4px" }}>×</button>
      </div>
      <div style={{ fontSize:22, fontWeight:900, color:C.snow, fontVariantNumeric:"tabular-nums",
        letterSpacing:"-.5px" }}>{data.price}</div>
      <div style={{ fontSize:11, fontWeight:700, marginBlockStart:2,
        color: data.up ? C.mint : C.coral }}>
        {data.change} ({data.pct})
      </div>
      <div style={{ fontSize:9, color:C.ash, marginBlockStart:6, fontWeight:600 }}>
        بيانات مؤجلة • تداول+
      </div>
    </div>
  );
}


const FEEDBACK_BTNS = [
  { key:"up",   emoji:"👍", baseLabel:"مفيد",     colorKey:"mint"  },
  { key:"down", emoji:"👎", baseLabel:"غير مفيد", colorKey:"coral" },
];

function FeedbackBar({ theme, newsId }) {
  const savedKey = `saved-${newsId}`;
  const [voted,     setVoted]     = useState(null);
  const [saved,     setSaved]     = useState(() => sessionStorage.getItem(savedKey) === "1");
  const [confirmed, setConfirmed] = useState(false);
  const confirmTimerRef = useRef(null);

  const votedRef = useRef(null);
  const handleVote = useCallback((key) => {
    const next = votedRef.current === key ? null : key;
    votedRef.current = next;
    setVoted(next);
    if (next === null) {
      setConfirmed(false);
    } else {
      setConfirmed(true);
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmed(false), 2000);
    }
  }, []);

  useEffect(() => {
    return () => clearTimeout(confirmTimerRef.current);
  }, []);

  const savedRef = useRef(saved);
  useEffect(() => { savedRef.current = saved; }, [saved]);

  const handleSave = useCallback(() => {
    const next = !savedRef.current;
    setSaved(next);
    if (next) sessionStorage.setItem(savedKey, "1");
    else sessionStorage.removeItem(savedKey);
  }, [savedKey]);

  return (
    <div style={{ marginBlockStart:28, padding:"16px", background:theme.layer1, borderRadius:14, border:`1px solid ${theme.line}44` }}>
      <div style={{ fontSize:11, fontWeight:700, color:theme.ash, marginBlockEnd:10 }}>
        هل كان الخبر مفيداً؟
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {FEEDBACK_BTNS.map(btn => {
          const active = voted === btn.key;
          const col    = theme[btn.colorKey];
          return (
            <button key={btn.key}
              aria-pressed={active}
              aria-label={active ? `إلغاء ${btn.baseLabel}` : btn.baseLabel}
              onClick={() => handleVote(btn.key)}
              style={{
                flex:1, minHeight:48, paddingBlock:"8px", paddingInline:0, borderRadius:10,
                background: active ? col+"1a" : theme.layer2,
                border:`1.5px solid ${active ? col+"88" : theme.line+"55"}`,
                fontSize:11, fontWeight:700, color: active ? col : theme.smoke,
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                transition:"background .18s ease, border-color .18s ease, color .18s ease",
              }}>
              <span style={{ fontSize:18 }}>{btn.emoji}</span>
              {btn.baseLabel}
            </button>
          );
        })}
        <button
          aria-pressed={saved}
          aria-label={saved ? "إلغاء حفظ الخبر" : "حفظ الخبر"}
          onClick={handleSave}
          style={{
            width:52, minHeight:48, borderRadius:10, flexShrink:0,
            background: saved ? C.gold+"1a" : theme.layer2,
            border:`1.5px solid ${saved ? C.gold+"88" : theme.line+"55"}`,
            fontSize:11, fontWeight:700, color: saved ? C.gold : theme.smoke,
            display:"flex", flexDirection:"column", alignItems:"center", gap:4,
            transition:"background .18s ease, border-color .18s ease, color .18s ease",
          }}>
          <span style={{ fontSize:18 }}>🔖</span>
          {saved ? "محفوظ" : "حفظ"}
        </button>
      </div>
      <div style={{ height:24, marginBlockStart:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {confirmed && (
          <span className="fade-in" style={{ fontSize:11, color:C.mint, fontWeight:600 }}>
            شكراً! تم تسجيل رأيك ✓
          </span>
        )}
      </div>
    </div>
  );
}

const articleReducer = (state, action) => {
  switch (action.type) {
    case "open":  return { news: action.news, feedbackKey: state.feedbackKey + 1, closing: false };
    case "close": return { ...state, closing: true };
    case "closed": return { news: null, feedbackKey: state.feedbackKey, closing: false };
    default: throw new Error(`articleReducer: unknown action "${action.type}"`);
  }
};

export default function NewsScreen() {
  useGlobalStyle();

  const [activeTab,    setActiveTab]    = useState("كل الأخبار");
  const [article,      dispatchArticle] = useReducer(articleReducer, { news:null, feedbackKey:0, closing:false });
  const [tabLoading,   setTabLoading]   = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [stockPopup,   setStockPopup]   = useState(null);
  const [sortBy,       setSortBy]       = useState("newest");
  const [liveText,     setLiveText]     = useState("");

  const { news: selectedNews, feedbackKey, closing } = article;

  const tabsRef           = useRef(null);
  const articleRef        = useRef(null);
  const tabTimerRef       = useRef(null);
  const tabScrollTimerRef = useRef(null);
  const copyTimerRef      = useRef(null);
  const liveTimerRef      = useRef(null);
  const activeTabRef      = useRef(activeTab);
  const selectedNewsRef   = useRef(null);
  const swipeStartY       = useRef(null);
  const skeletonCountRef  = useRef(Math.min(Math.max(NEWS.length, 2), 5));
  const prevSearchRef     = useRef("");

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    return () => {
      clearTimeout(tabTimerRef.current);
      clearTimeout(tabScrollTimerRef.current);
      clearTimeout(copyTimerRef.current);
      clearTimeout(liveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => dispatchArticle({ type:"closed" }), 220);
    return () => clearTimeout(t);
  }, [closing]);

  const handleClose = useCallback(() => {
    selectedNewsRef.current = null;
    setCopied(false);
    dispatchArticle({ type:"close" });
  }, []);

  const handleTabChange = useCallback((t) => {
    setSearchActive(false);
    setSearchQuery("");
    setStockPopup(null);
    prevSearchRef.current = "";
    clearTimeout(liveTimerRef.current);
    if (t === activeTabRef.current) {
      if (t !== "كل الأخبار") {
        activeTabRef.current = "كل الأخبار";
        skeletonCountRef.current = Math.min(Math.max(NEWS.length, 2), 5);
        clearTimeout(tabTimerRef.current);
        clearTimeout(tabScrollTimerRef.current);
        setTabLoading(true);
        setActiveTab("كل الأخبار");
        tabTimerRef.current = setTimeout(() => {
          setTabLoading(false);
          setLiveText("");
          liveTimerRef.current = setTimeout(() => setLiveText(
            arabicPlural(NEWS.length, "خبر", "خبران", "أخبار", "خبراً") + " في آخر الأخبار"
          ), 50);
        }, 380);
      }
      return;
    }
    const nextFiltered = t === "كل الأخبار" ? NEWS : NEWS.filter(n => n.cat === t);
    skeletonCountRef.current = Math.min(Math.max(nextFiltered.length, 2), 5);
    activeTabRef.current = t;
    clearTimeout(tabTimerRef.current);
    clearTimeout(tabScrollTimerRef.current);
    setTabLoading(true);
    setActiveTab(t);
    tabTimerRef.current = setTimeout(() => {
      setTabLoading(false);
      const label = t === "كل الأخبار" ? "آخر الأخبار" : `أخبار ${t}`;
      const text  = arabicPlural(nextFiltered.length, "خبر", "خبران", "أخبار", "خبراً") + " في " + label;
      setLiveText("");
      liveTimerRef.current = setTimeout(() => setLiveText(text), 50);
    }, 380);
    tabScrollTimerRef.current = setTimeout(() => {
      const nodes = tabsRef.current?.querySelectorAll("[data-tab]") ?? [];
      for (const node of nodes) {
        if (node.getAttribute("data-tab") === t) {
          node.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"center" });
          break;
        }
      }
    }, 40);
  }, []);

  const handleNewsClick = useCallback((n) => {
    setCopied(false);
    selectedNewsRef.current = n;
    dispatchArticle({ type:"open", news:n });
  }, []);

  const handleCopy = useCallback(() => {
    clearTimeout(copyTimerRef.current);
    const title = selectedNewsRef.current?.title;
    if (!title) return;
    navigator.clipboard?.writeText(title).then(() => {
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, []);

  const handleTouchStart = useCallback((e) => {
    swipeStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (swipeStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - swipeStartY.current;
    swipeStartY.current = null;
    if (delta > 60 && articleRef.current?.scrollTop === 0) handleClose();
  }, [handleClose]);

  const filtered = useMemo(
    () => activeTab === "كل الأخبار" ? NEWS : NEWS.filter(n => n.cat === activeTab),
    [activeTab]
  );

  const displayed = useMemo(() => {
    const q = searchQuery.trim();
    let list = filtered;
    if (q) {
      const lower = q.toLowerCase();
      list = list.filter(n =>
        n.title.includes(q) || n.body.includes(q) ||
        n.cat.includes(q)   || n.sym.toLowerCase().includes(lower)
      );
    }
    if (sortBy === "oldest") list = [...list].reverse();
    if (sortBy === "sym")    list = [...list].filter(n => n.sym);
    return list;
  }, [filtered, searchQuery, sortBy]);

  const skeletonCount = skeletonCountRef.current;
  const sectionLabel  = searchActive && searchQuery.trim()
    ? `نتائج "${searchQuery.trim()}"`
    : activeTab === "كل الأخبار" ? "آخر الأخبار" : `أخبار ${activeTab}`;

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q === prevSearchRef.current) return;
    prevSearchRef.current = q;
    const t = setTimeout(() => {
      setLiveText("");
      setTimeout(() => setLiveText(
        `${arabicPlural(displayed.length, "نتيجة", "نتيجتان", "نتائج", "نتيجة")} للبحث عن "${q}"`
      ), 50);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, displayed.length]);

  return (
    <div style={{ maxWidth:430, marginInline:"auto", background:C.ink, minHeight:"100vh",
      fontFamily:"Cairo,system-ui,sans-serif", direction:"rtl", color:C.snow }}>

      <div style={{ paddingBlockStart:"48px", paddingInline:"20px", paddingBlockEnd:0,
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        background:`linear-gradient(180deg,${C.void}f8 72%,${C.void}00 100%)`,
        position:"sticky", top:0, zIndex:40 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBlockEnd:3 }}>
          <span style={{ fontSize:9, color:C.gold, fontWeight:800, letterSpacing:"3.5px" }}>TADAWUL+</span>
          <span className="do-pulse" style={{ width:4, height:4, borderRadius:"50%", background:C.gold, display:"inline-block", flexShrink:0 }}/>
        </div>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBlockEnd:12 }}>
          <div style={{ fontSize:22, fontWeight:900, color:C.snow, letterSpacing:"-.5px", lineHeight:1.3 }}>
            الأخبار
          </div>
          <button className="pressable" aria-label={searchActive ? "إغلاق البحث" : "بحث في الأخبار"}
            onClick={() => { setSearchActive(s => !s); setSearchQuery(""); }}
            style={{ width:38, height:38, borderRadius:10, display:"flex", alignItems:"center",
              justifyContent:"center", background: searchActive ? C.electric+"22" : C.layer2,
              border:`1px solid ${searchActive ? C.electric+"66" : C.line}`,
              transition:"background .18s ease, border-color .18s ease" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={searchActive ? C.electric : C.smoke} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              {searchActive
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>
              }
            </svg>
          </button>
        </div>

        {searchActive && (
          <div className="fade-in" style={{ display:"flex", alignItems:"center", gap:8, marginBlockEnd:10,
            background:C.layer2, borderRadius:10, paddingBlock:"10px", paddingInline:"14px",
            border:`1px solid ${C.line}` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={C.ash} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="search-input" type="search" autoFocus
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث في العناوين والتصنيفات والرموز…"
              aria-label="بحث في الأخبار"/>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} aria-label="مسح البحث"
                style={{ background:"none", color:C.ash, fontSize:16, lineHeight:1, flexShrink:0 }}>×</button>
            )}
          </div>
        )}

        <div style={{ position:"relative" }}>
          <div ref={tabsRef} role="tablist" aria-label="تصنيفات الأخبار"
            style={{ display:"flex", gap:7, overflowX:"auto", paddingBlockEnd:12,
              maskImage:"linear-gradient(to left, black 94%, transparent 100%)",
              WebkitMaskImage:"linear-gradient(to left, black 94%, transparent 100%)" }}>
            {TABS.map(t => {
              const active = activeTab === t;
              const col    = tabColor(t);
              return (
                <button key={t} data-tab={t}
                  role="tab" aria-selected={active} aria-controls="news-list"
                  className="pressable"
                  onClick={() => handleTabChange(t)}
                  style={{ flexShrink:0, minHeight:44, paddingBlock:"7px", paddingInline:"15px", borderRadius:9,
                    fontSize:12, fontWeight:700,
                    border:`1.5px solid ${active ? col+"88" : C.line+"44"}`,
                    background: active ? `linear-gradient(135deg,${col}22,${col}0c)` : "transparent",
                    color: active ? col : C.smoke,
                    boxShadow: active ? `0 2px 0 0 ${col}` : "none",
                    whiteSpace:"nowrap",
                    transition:"background .2s ease, border-color .2s ease, color .2s ease, box-shadow .2s ease" }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ paddingBlockStart:"14px", paddingInline:"16px", paddingBlockEnd:"90px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBlockEnd:10 }}>
          <div style={{ fontSize:10, fontWeight:800, color:C.ash, letterSpacing:"1.5px" }}>{sectionLabel}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {!tabLoading && (
              <span style={{ fontSize:10, color:C.ash, fontWeight:600 }}>
                {arabicPlural(displayed.length, "خبر", "خبران", "أخبار", "خبراً")}
              </span>
            )}
            <div style={{ display:"flex", gap:4 }}>
              {[["newest","الأحدث"],["oldest","الأقدم"],["sym","أسهم فقط"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setSortBy(val)}
                  aria-pressed={sortBy === val}
                  style={{ fontSize:9, fontWeight:700, paddingBlock:"3px", paddingInline:"7px",
                    minHeight:32, borderRadius:6,
                    border:`1px solid ${sortBy===val ? C.electric+"88" : C.line+"44"}`,
                    background: sortBy===val ? C.electric+"18" : "transparent",
                    color: sortBy===val ? C.electric : C.ash,
                    transition:"background .15s ease, color .15s ease" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div aria-live="polite" aria-atomic="true" style={{ position:"absolute", width:1, height:1,
          overflow:"hidden", clipPath:"inset(50%)", whiteSpace:"nowrap" }}>
          {liveText}
        </div>

        <div id="news-list" role="feed" aria-label="قائمة الأخبار"
          aria-busy={tabLoading}
          style={{ borderRadius:14,
            clipPath:"inset(0 round 14px)",
            border:`1px solid ${C.line}44`,
            marginBlockEnd:22, boxShadow:`0 4px 20px ${C.ink}aa` }}>
          {tabLoading
            ? <div aria-hidden="true">
                {Array.from({ length: skeletonCount }, (_, i) => <SkeletonRow key={i} isLast={i===skeletonCount-1}/>)}
              </div>
            : displayed.length === 0
            ? (
              <div className="fade-in" style={{ paddingBlock:"52px", paddingInline:"24px", display:"flex",
                flexDirection:"column", alignItems:"center", gap:12, background:C.layer1 }}>
                <div style={{ fontSize:32 }} role="img" aria-label={searchQuery.trim() ? "لا نتائج" : "لا يوجد محتوى"}>
                  {searchQuery.trim() ? "🔍" : (CAT_ICONS[activeTab] ?? "📋")}
                </div>
                <div style={{ fontSize:14, fontWeight:800, color:C.smoke, textAlign:"center" }}>
                  {searchQuery.trim()
                    ? `لا نتائج للبحث عن "${searchQuery.trim()}"`
                    : "لا توجد أخبار في هذا التصنيف"
                  }
                </div>
                <div style={{ fontSize:12, color:C.ash, textAlign:"center", lineHeight:1.7, maxWidth:220 }}>
                  {searchQuery.trim()
                    ? "جرّب كلمة مختلفة أو تصنيفاً آخر"
                    : `تحقق لاحقاً للاطلاع على آخر مستجدات قطاع ${activeTab}`
                  }
                </div>
                {!searchQuery.trim() && (
                  <button className="pressable" onClick={() => handleTabChange("كل الأخبار")}
                    style={{ marginBlockStart:4, paddingBlock:"10px", paddingInline:"22px", borderRadius:10, minHeight:44,
                      fontSize:12, fontWeight:700, background:C.layer3, color:C.smoke, border:`1px solid ${C.line}` }}>
                    عرض كل الأخبار
                  </button>
                )}
              </div>
            )
            : displayed.map((n, i) => (
              <div key={n.id}
                role="article" tabIndex={0}
                aria-roledescription="خبر قابل للفتح"
                aria-label={`${n.title}. ${n.cat}. نُشر ${n.ago}`}
                aria-describedby={`news-body-${n.id}`}
                aria-setsize={displayed.length}
                aria-posinset={i + 1}
                className="news-row fade-up news-stagger"
                style={{ "--idx":i,
                  background: i===0 && activeTab==="كل الأخبار"
                    ? `linear-gradient(160deg,${C.layer2},${C.layer1} 70%)` : C.layer1,
                  paddingBlock:"14px", paddingInline:"16px",
                  borderBottom: i < displayed.length-1 ? `1px solid ${C.line}2a` : "none",
                  position:"relative" }}
                onClick={() => handleNewsClick(n)}
                onKeyDown={e => {
                  if (e.key === "Enter") { handleNewsClick(n); }
                  if (e.key === " ") { e.preventDefault(); handleNewsClick(n); }
                }}>

                <div style={{ position:"absolute", insetBlockStart:0, insetInlineEnd:0, insetBlockEnd:0, width:3,
                  background:`linear-gradient(180deg,${CAT_COLORS[n.cat]??C.smoke},${CAT_COLORS[n.cat]??C.smoke}55)` }}/>

                <div aria-hidden="true" style={{ position:"absolute", insetBlockStart:0,
                  insetInlineStart:0, insetInlineEnd:0, height:3,
                  background:`linear-gradient(90deg,${CAT_COLORS[n.cat]??C.electric}55,${CAT_COLORS[n.cat]??C.electric}11 60%,transparent)` }}/>

                <span id={`news-body-${n.id}`} style={{
                  position:"absolute", width:1, height:1,
                  overflow:"hidden", clipPath:"inset(50%)", whiteSpace:"nowrap" }}>
                  {bodyPreview(n.body)}
                </span>

                <div style={{ display:"flex", alignItems:"flex-start", gap:11, paddingInlineEnd:8, paddingBlockStart:6 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    {n.hot && i===0 && activeTab==="كل الأخبار" && (
                      <div className="do-hot" role="img" aria-label="خبر عاجل"
                        style={{ display:"inline-flex", alignItems:"center", gap:5,
                          fontSize:9, fontWeight:800, color:C.coral,
                          background:C.coral+"15", border:`1px solid ${C.coral}44`,
                          paddingBlock:"2px", paddingInline:"8px", borderRadius:4, marginBlockEnd:7, letterSpacing:"1px" }}>
                        <span aria-hidden="true" className="do-pulse" style={{ width:5, height:5, borderRadius:"50%",
                          background:C.coral, display:"inline-block", flexShrink:0 }}/>
                        عاجل
                      </div>
                    )}
                    <div style={{ fontSize:13, fontWeight:700, color:C.snow, lineHeight:1.6,
                      marginBlockEnd:8, wordBreak:"keep-all", overflowWrap:"break-word" }}>
                      {n.title}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                      <span style={{ fontSize:10, fontWeight:700,
                        color: CAT_COLORS[n.cat] ?? C.smoke,
                        background: (CAT_COLORS[n.cat] ?? C.smoke)+"15",
                        border:`1px solid ${(CAT_COLORS[n.cat] ?? C.smoke)}30`,
                        paddingBlock:"2px", paddingInline:"8px", borderRadius:5,
                        display:"flex", alignItems:"center", gap:3 }}>
                        <span style={{ fontSize:9 }} aria-hidden="true">{CAT_ICONS[n.cat]}</span>
                        {n.cat}
                      </span>
                      {n.sym && (
                        <div style={{ position:"relative" }}>
                          <button
                            onPointerDown={ev => ev.stopPropagation()}
                            onClick={ev => { ev.stopPropagation(); setStockPopup(p => p === n.sym ? null : n.sym); }}
                            aria-label={`عرض سعر سهم ${n.sym}`}
                            style={{ fontSize:10, fontWeight:700,
                              color: STOCK_PRICES[n.sym] ? (STOCK_PRICES[n.sym].up ? C.mint : C.coral) : C.ash,
                              background: STOCK_PRICES[n.sym] ? (STOCK_PRICES[n.sym].up ? C.mint+"18" : C.coral+"18") : C.layer3,
                              border:`1px solid ${STOCK_PRICES[n.sym] ? (STOCK_PRICES[n.sym].up ? C.mint+"44" : C.coral+"44") : C.line+"55"}`,
                              paddingBlock:"2px", paddingInline:"7px", borderRadius:5,
                              fontVariantNumeric:"tabular-nums",
                              display:"flex", alignItems:"center", gap:4 }}>
                            {n.sym}
                            {STOCK_PRICES[n.sym] && (
                              <span style={{ fontSize:9 }}>{STOCK_PRICES[n.sym].up ? "▲" : "▼"}</span>
                            )}
                          </button>
                          {stockPopup === n.sym && (
                            <StockPopup sym={n.sym} onClose={() => setStockPopup(null)}/>
                          )}
                        </div>
                      )}
                      <span style={{ fontSize:9, color:C.ash, fontWeight:500 }}>
                        {readingTime(n.body)}
                      </span>
                      <span style={{ fontSize:10, color:C.ash, marginInlineStart:"auto", fontWeight:500 }}>
                        {n.ago}
                      </span>
                    </div>
                  </div>
                  <div aria-hidden="true" style={{ width:44, minHeight:44, flexShrink:0, alignSelf:"stretch",
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <div style={{ width:28, height:28, borderRadius:8,
                      background:C.layer3, border:`1px solid ${C.line}55`,
                      display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke={C.smoke} strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>

      </div>

      {(selectedNews || closing) && (
        <div ref={articleRef}
          className={closing ? "slide-down" : "slide-up"}
          role="dialog" aria-modal="true"
          aria-label={selectedNewsRef.current?.title ?? selectedNews?.title ?? ""}
          style={{ position:"fixed", inset:0, zIndex:100, background:C.ink, overflowY:"auto" }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>

          <div style={{ paddingBlockStart:"48px", paddingInline:"20px", paddingBlockEnd:"14px",
            backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
            background:`linear-gradient(180deg,${C.void}f8 75%,${C.void}00 100%)`,
            position:"sticky", top:0, zIndex:10 }}>
            {selectedNews && <ReadingProgress scrollRef={articleRef} newsId={selectedNews.id}/>}
            <div aria-hidden="true" style={{ display:"flex", justifyContent:"center", paddingBlockStart:6, paddingBlockEnd:6 }}>
              <div style={{ width:36, height:4, borderRadius:2, background:C.line, opacity:.6 }}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button className="pressable" onClick={handleClose}
                aria-label="رجوع إلى قائمة الأخبار"
                style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                  background:C.layer1, border:`1px solid ${C.line}`,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke={C.smoke} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              {selectedNews && (
                <>
                  <span style={{ fontSize:11, fontWeight:700,
                    color: CAT_COLORS[selectedNews.cat] ?? C.smoke,
                    background: (CAT_COLORS[selectedNews.cat] ?? C.smoke)+"18",
                    border:`1px solid ${(CAT_COLORS[selectedNews.cat] ?? C.smoke)}33`,
                    paddingBlock:"5px", paddingInline:"13px", borderRadius:8, display:"flex", alignItems:"center", gap:4 }}>
                    <span aria-hidden="true">{CAT_ICONS[selectedNews.cat]}</span>
                    {selectedNews.cat}
                  </span>
                  <button className="pressable" onClick={handleCopy}
                    aria-label={copied ? "تم نسخ عنوان الخبر" : "نسخ عنوان الخبر"}
                    style={{ marginInlineStart:"auto", width:44, height:44, borderRadius:12, flexShrink:0,
                      background: copied ? C.mint+"22" : C.layer1,
                      border:`1px solid ${copied ? C.mint+"66" : C.line}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      transition:"background .18s ease, border-color .18s ease" }}>
                    {copied
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke={C.mint} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke={C.smoke} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
                          <circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                    }
                  </button>
                </>
              )}
            </div>
          </div>

          {selectedNews && (
            <div style={{ paddingBlockStart:"12px", paddingInline:"20px", paddingBlockEnd:"90px" }}>
              <div style={{ fontSize:20, fontWeight:900, color:C.snow, lineHeight:1.55,
                marginBlockEnd:14, wordBreak:"keep-all", overflowWrap:"break-word" }}>
                {selectedNews.title}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBlockEnd:20, flexWrap:"wrap" }}>
                {selectedNews.sym && (
                  <span style={{ fontSize:11, fontWeight:700, color:C.electric,
                    background:C.electric+"15", border:`1px solid ${C.electric}33`,
                    paddingBlock:"3px", paddingInline:"10px", borderRadius:6 }}>
                    {selectedNews.sym}
                  </span>
                )}
                <span style={{ fontSize:11, color:C.ash, fontWeight:500 }}>{selectedNews.ago}</span>
                <span style={{ fontSize:10, color:C.ash, fontWeight:500 }}>
                  · {readingTime(selectedNews.body)}
                </span>
                <div style={{ marginInlineStart:"auto", fontSize:10, fontWeight:700,
                  color:C.ash, background:C.layer2, border:`1px solid ${C.line}44`,
                  paddingBlock:"2px", paddingInline:"9px", borderRadius:5 }}>تداول+</div>
              </div>
              <div style={{ height:1, marginBlockEnd:20,
                background:`linear-gradient(90deg,${CAT_COLORS[selectedNews.cat]??C.electric}77,${C.line}22,transparent)` }}/>

              <div className="fade-in">
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {splitParagraphs(selectedNews.body).map((para, i) => (
                    <p key={i} style={{ fontSize:15, color:C.mist, lineHeight:2.0, fontWeight:400,
                      wordBreak:"keep-all", overflowWrap:"break-word", margin:0 }}>
                      {para.trim()}
                    </p>
                  ))}
                </div>
                <FeedbackBar key={feedbackKey} theme={FEEDBACK_THEME} newsId={selectedNews.id}/>
                <div style={{ marginBlockStart:12, display:"flex", alignItems:"center", gap:8,
                  paddingBlock:"10px", paddingInline:"14px",
                  borderRadius:10, background:C.layer1, border:`1px solid ${C.line}33` }}>
                  <span className="do-pulse" aria-hidden="true" style={{ width:6, height:6, borderRadius:"50%",
                    flexShrink:0, background:C.mint, boxShadow:`0 0 5px ${C.mint}88`, display:"inline-block" }}/>
                  <span style={{ fontSize:10, color:C.ash, fontWeight:600 }}>المصدر: تداول+ • بيانات مباشرة</span>
                  <div aria-hidden="true" style={{ marginInlineStart:"auto", display:"flex", gap:3 }}>
                    {[C.electric, C.mint, C.plasma].map((col, i) => (
                      <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:col, opacity:.5 }}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
