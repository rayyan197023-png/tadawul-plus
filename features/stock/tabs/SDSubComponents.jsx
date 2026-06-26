'use client';
/**
 * @module features/stock/tabs/SDSubComponents
 * @description مكونات فرعية: دفتر الأوامر، بيانات الصفقات، أخبار AI
 *
 * ✨ نسخة منظفة:
 * - تم إزالة بيانات LCG الوهمية لـ OrderBook و Ticks
 * - الخانات والمكونات تبقى كما هي
 * - عند غياب البيانات: EmptyState
 * - News: تعتمد على API الحي فقط (لا fallback وهمي)
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { C, EmptyState, SectionCard, Skeleton, Tag } from './StockDetailShared';

/* ═══════════════════════════════════════════════════════════════
   OrderBook -- دفتر الأوامر (L2)
═══════════════════════════════════════════════════════════════ */

function OrderBookLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 220);
    return () => clearTimeout(t);
  }, [stk?.sym]);
  if (!show) return (
    <div style={{
      background: `linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`,
      borderRadius: 16, border: `1px solid ${C.line}`,
      boxShadow: `inset 0 1px 0 ${C.layer3}`,
      overflow: "hidden", padding: "14px", marginBottom: 10,
    }}>
      <Skeleton h={13} w="40%" mb={12}/>
      <Skeleton h={8} r={4} mb={10}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[0, 1].map(c => (
          <div key={c}>
            {[0, 1, 2, 3, 4].map(r => <Skeleton key={r} h={20} mb={4}/>)}
          </div>
        ))}
      </div>
    </div>
  );
  return <OrderBookPanel stk={stk}/>;
}

function OrderBookPanel({ stk }) {
  // OrderBook L2 (دفتر أوامر بـ 10 مستويات) غير متاح من sahmk حالياً
  const bid = stk?.bid;
  const ask = stk?.ask;

  return (
    <SectionCard title="دفتر الأوامر (L2)" accent={C.electric}
      badge={{ text: "في انتظار API", color: C.amber }}>
      <div style={{ padding: "8px 16px" }}>
        {(bid || ask) ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ background: C.mint + "12", borderRadius: 10, padding: "10px", textAlign: "center", border: `1px solid ${C.mint}33` }}>
                <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>أفضل طلب (Bid)</div>
                <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 16, fontWeight: 900, color: C.mint }}>
                  {bid != null ? bid.toFixed(2) : "--"}
                </div>
              </div>
              <div style={{ background: C.coral + "12", borderRadius: 10, padding: "10px", textAlign: "center", border: `1px solid ${C.coral}33` }}>
                <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>أفضل عرض (Ask)</div>
                <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 16, fontWeight: 900, color: C.coral }}>
                  {ask != null ? ask.toFixed(2) : "--"}
                </div>
              </div>
            </div>
            {bid && ask && (
              <div style={{ padding: "6px 10px", background: C.layer3, borderRadius: 8, fontSize: 11, textAlign: "center" }}>
                <span style={{ color: C.smoke }}>الفارق (Spread): </span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontWeight: 700, color: C.gold }}>
                  {(ask - bid).toFixed(2)} ر.س ({stk.p ? ((ask - bid) / stk.p * 100).toFixed(3) : "--"}%)
                </span>
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 10, color: C.smoke, lineHeight: 1.6, textAlign: "center", padding: "8px", background: C.layer3 + "44", borderRadius: 8 }}>
              📡 دفتر الأوامر التفصيلي (10 مستويات) سيتم عرضه عند توفر API منفصل
            </div>
          </>
        ) : (
          <EmptyState
            icon="📡"
            title="في انتظار البيانات"
            subtitle="دفتر الأوامر L2 (10 مستويات) سيتم عرضه عند توفر API"
          />
        )}
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TickData -- سجل الصفقات اللحظية
═══════════════════════════════════════════════════════════════ */

function TickLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 280);
    return () => clearTimeout(t);
  }, [stk?.sym]);
  if (!show) return (
    <div style={{
      background: `linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`,
      borderRadius: 16, border: `1px solid ${C.line}`,
      boxShadow: `inset 0 1px 0 ${C.layer3}`,
      overflow: "hidden", padding: "14px", marginBottom: 10,
    }}>
      <Skeleton h={13} w="35%" mb={12}/>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[0, 1, 2].map(i => <Skeleton key={i} h={44} r={8}/>)}
      </div>
      {[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} h={22} mb={5}/>)}
    </div>
  );
  return <TickDataPanel stk={stk}/>;
}

function TickDataPanel({ stk }) {
  // ملخص التدفق من بيانات السيولة الحية من sahmk quote
  const inflow   = stk?.inflow;
  const outflow  = stk?.outflow;
  const netFlow  = stk?.netFlow;
  const inflowT  = stk?.inflowT;
  const outflowT = stk?.outflowT;

  const hasLiquidity = inflow != null || outflow != null;

  return (
    <SectionCard title="سجل الصفقات والتدفق" accent={C.plasma}
      badge={hasLiquidity ? { text: "● حي", color: C.mint } : { text: "في انتظار API", color: C.amber }}>
      <div style={{ padding: "8px 16px" }}>
        {hasLiquidity ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                { l: "تدفق شراء", v: ((inflow||0)/1e6).toFixed(1) + "M",  c: C.mint,    sub: inflowT ? `${inflowT} صفقة` : null },
                { l: "تدفق بيع",  v: ((outflow||0)/1e6).toFixed(1) + "M", c: C.coralL,  sub: outflowT ? `${outflowT} صفقة` : null },
                {
                  l: "صافي السيولة",
                  v: ((netFlow||0)>=0 ? "+" : "") + ((netFlow||0)/1e6).toFixed(1) + "M",
                  c: (netFlow||0) >= 0 ? C.mint : C.coral,
                  sub: (netFlow||0) > 0 ? "ضغط شراء" : (netFlow||0) < 0 ? "ضغط بيع" : "متوازن",
                },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, background: C.layer3, borderRadius: 8, padding: "6px 8px",
                  textAlign: "center", border: `1px solid ${C.line}44`,
                }}>
                  <div style={{ fontSize: 11, color: C.smoke, marginBottom: 2, lineHeight: 1.5 }}>{s.l}</div>
                  <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 13, fontWeight: 800, color: s.c, lineHeight: 1.5 }}>{s.v}</div>
                  {s.sub && <div style={{ fontSize: 10, color: C.smoke, lineHeight: 1.4 }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10, color: C.smoke, lineHeight: 1.6, textAlign: "center", padding: "8px", background: C.layer3 + "44", borderRadius: 8 }}>
              📡 سجل الصفقات اللحظي (Tick-by-tick) سيتم عرضه عند توفر API منفصل
            </div>
          </>
        ) : (
          <EmptyState
            icon="📡"
            title="في انتظار البيانات"
            subtitle="بيانات السيولة وسجل الصفقات سيتم عرضها عند توفر اتصال API"
          />
        )}
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════
   NLPNews -- تحليل الأخبار بـ AI
═══════════════════════════════════════════════════════════════ */

function NLPLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 340);
    return () => clearTimeout(t);
  }, [stk?.sym]);
  if (!show) return (
    <div style={{
      background: `linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`,
      borderRadius: 16, border: `1px solid ${C.line}`,
      boxShadow: `inset 0 1px 0 ${C.layer3}`,
      overflow: "hidden", padding: "14px", marginBottom: 10,
    }}>
      <Skeleton h={13} w="55%" mb={12}/>
      <Skeleton h={6} r={3} mb={10}/>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ marginBottom: 12 }}>
          <Skeleton h={11} w="80%" mb={5}/>
          <Skeleton h={9} w="50%"/>
        </div>
      ))}
    </div>
  );
  return <NLPNewsPanel stk={stk}/>;
}

function NLPNewsPanel({ stk }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [fetched, setFetched] = useState(null);

  // ═══ تحليل المشاعر بالكلمات المفتاحية ═══
  const analyzeSentiment = (text) => {
    const positive = ["أرباح","نمو","ارتفاع","صعود","قوي","إيجابي","توزيعات","فوز","عقد","اتفاقية","توسع","زيادة","تحسن","ممتاز","قياسي","تجاوز","فاق","تحقيق","إنجاز","شراكة"];
    const negative = ["خسارة","هبوط","انخفاض","ضعيف","سلبي","تراجع","غرامة","مخالفة","دعوى","إفلاس","تخفيض","ديون","مشكلة","أزمة","تحقيق","إيقاف","تأخر","فشل","خطر","تحذير"];
    const high_impact = ["أرباح","خسارة","توزيعات","عقد","اتفاقية","غرامة","دعوى","إيقاف","توسع","استحواذ"];

    const lowerText = text.toLowerCase();
    let score = 50;
    let posCount = 0, negCount = 0;

    positive.forEach(w => { if (text.includes(w)) { score += 8; posCount++; } });
    negative.forEach(w => { if (text.includes(w)) { score -= 8; negCount++; } });

    score = Math.max(5, Math.min(95, score));
    const sentiment = score > 60 ? "إيجابي" : score < 40 ? "سلبي" : "محايد";
    const hasHighImpact = high_impact.some(w => text.includes(w));
    const impact = hasHighImpact ? "عالي" : (Math.abs(score - 50) > 20 ? "متوسط" : "منخفض");

    return { score, sentiment, impact };
  };

  // ═══ تصنيف الخبر ═══
  const categorize = (text) => {
    if (text.includes("أرباح") || text.includes("إيرادات") || text.includes("ربحية") || text.includes("مالي")) return "أرباح";
    if (text.includes("قطاع") || text.includes("سوق") || text.includes("اقتصاد") || text.includes("نفط")) return "قطاعي";
    if (text.includes("عقد") || text.includes("اتفاقية") || text.includes("شراكة") || text.includes("استحواذ")) return "شركة";
    if (text.includes("تصنيف") || text.includes("توصية") || text.includes("تحليل") || text.includes("مستهدف")) return "تصنيف";
    return "ماكرو";
  };

  // ═══ حساب الوقت النسبي ═══
  const timeAgo = (dateStr) => {
    try {
      const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 3600;
      if (diff < 1) return "منذ أقل من ساعة";
      if (diff < 24) return `منذ ${Math.floor(diff)}س`;
      return `منذ ${Math.floor(diff/24)} يوم`;
    } catch { return ""; }
  };

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sahmkdata?endpoint=events&sym=${stk.sym}`);
      const d = await res.json();
      const rawNews = d?.events || [];

      if (!rawNews.length) {
        setError("لا توجد أخبار متاحة لهذا السهم");
        setLoading(false);
        return;
      }

      const analyzed = rawNews.slice(0, 8).map(n => {
        const text = n.description || "";
        // ✨ استخدام sentiment من sahmk مباشرة
        const sentimentMap = {
          "positive":          { sentiment: "إيجابي", score: 75 },
          "slightly_positive": { sentiment: "إيجابي", score: 62 },
          "neutral":           { sentiment: "محايد",  score: 50 },
          "slightly_negative": { sentiment: "سلبي",   score: 38 },
          "negative":          { sentiment: "سلبي",   score: 25 },
        };
        const mapped = sentimentMap[n.sentiment] || { sentiment: "محايد", score: 50 };

        // ✨ دمج تحليل الكلمات المفتاحية مع sentiment من sahmk
        const kwAnalysis = analyzeSentiment(text);
        const finalScore = Math.round((mapped.score * 0.6) + (kwAnalysis.score * 0.4));

        const impact = n.importance === "important" ? "عالي"
          : n.event_type === "FINANCIAL_REPORT" ? "عالي"
          : "متوسط";

        const categoryMap = {
          "FINANCIAL_REPORT": "أرباح",
          "DIVIDEND":         "توزيعات",
          "BOARD_MEETING":    "مجلس الإدارة",
          "REGULAR":          "تقرير",
          "OTHER":            categorize(text),
        };

        return {
          title:    text.slice(0, 120) + (text.length > 120 ? "..." : ""),
          src:      n.stock_name || stk.name || "sahmk",
          sentiment: mapped.sentiment,
          score:    finalScore,
          impact,
          category: categoryMap[n.event_type] || categorize(text),
          time:     timeAgo(n.event_date || n.article_date),
          url:      null,
        };
      });

      const overall = Math.round(analyzed.reduce((s, n) => s + n.score, 0) / analyzed.length);
      const posNews = analyzed.filter(n => n.sentiment === "إيجابي").length;
      const negNews = analyzed.filter(n => n.sentiment === "سلبي").length;
      const neuNews = analyzed.filter(n => n.sentiment === "محايد").length;
      const summary = overall > 65
        ? `المشاعر إيجابية -- ${posNews} خبر إيجابي من أصل ${analyzed.length}`
        : overall < 40
        ? `المشاعر سلبية -- ${negNews} خبر سلبي من أصل ${analyzed.length}`
        : `المشاعر محايدة -- ${posNews} إيجابي و${neuNews} محايد و${negNews} سلبي من أصل ${analyzed.length}`;


      setData({ news: analyzed, overall, summary });
      setFetched(new Date().toLocaleTimeString("ar-SA"));
    } catch(e) {
      setError("خطأ في جلب الأخبار: " + e.message);
    }
    setLoading(false);
  };

  const news = data?.news || [];
  const avg  = data?.overall ?? 50;
  const sC   = avg > 65 ? C.mint : avg < 40 ? C.coral : C.amber;

  return (
    <SectionCard title="تحليل المشاعر -- أخبار الشركة" accent={sC}
      badge={data ? { text: "✓ " + fetched, color: C.mint } : { text: "في انتظار التحديث", color: C.amber }}>
      <div style={{ padding: "8px 16px" }}>

        {/* شريط التحكم */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            {data ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Tag text={avg > 65 ? "إيجابي" : avg < 40 ? "سلبي" : "محايد"} color={sC}/>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 13, fontWeight: 900, color: sC }}>{avg}/100</span>
              </div>
            ) : (
              <span style={{ fontSize: 11, color: C.smoke }}>اضغط لتحليل أحدث الأخبار</span>
            )}
          </div>
          <button onClick={fetchNews} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 5,
            background: loading ? C.layer3 : `${C.electric}18`,
            border: `1px solid ${C.electric}44`,
            borderRadius: 8, padding: "6px 11px",
            color: C.electric, fontSize: 11, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Cairo,sans-serif",
          }}>
            {loading ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5"
                  style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                جارٍ...
              </>
            ) : (
              <>🔄 {data ? "تحديث" : "تحليل AI"}</>
            )}
          </button>
        </div>

        {/* شريط المشاعر */}
        {data && (
          <>
            <div style={{ height: 5, background: C.layer3, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ height: "100%", width: `${avg}%`, background: sC, borderRadius: 3, transition: "width .5s" }}/>
            </div>

            {/* مخطط المشاعر */}
            {news.length > 1 && (
              <svg width="100%" height="32" viewBox="0 0 200 32" preserveAspectRatio="none" style={{ display: "block", marginBottom: 8 }}>
                <defs>
                  <linearGradient id="sentGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sC} stopOpacity=".3"/>
                    <stop offset="100%" stopColor={sC} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = news.map((n, i) => ({
                    x: (i / (news.length - 1)) * 196 + 2,
                    y: 30 - (n.score / 100) * 26,
                  }));
                  const path = pts.map((p, i) => `${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                  const area = path + ` L${pts[pts.length-1].x},30 L2,30 Z`;
                  return (
                    <>
                      <path d={area} fill="url(#sentGrad2)"/>
                      <path d={path} fill="none" stroke={sC} strokeWidth="1.5" strokeLinecap="round"/>
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="2.5"
                          fill={news[i].sentiment === "إيجابي" ? C.mint : news[i].sentiment === "سلبي" ? C.coral : C.amber}/>
                      ))}
                    </>
                  );
                })()}
              </svg>
            )}

            {/* ملخص */}
            <div style={{ padding: "7px 10px", background: sC+"10", border: `1px solid ${sC}33`, borderRadius: 8, marginBottom: 10, fontSize: 11, color: C.mist, lineHeight: 1.6 }}>
              {data.summary}
            </div>
          </>
        )}

        {/* خطأ */}
        {error && (
          <div style={{ padding: "8px 10px", background: C.coral+"15", border: `1px solid ${C.coral}33`, borderRadius: 8, marginBottom: 8, fontSize: 10, color: C.coral }}>
            {error}
          </div>
        )}

        {/* قائمة الأخبار */}
        {news.length > 0 ? news.map((n, i) => {
          const sc = n.sentiment === "إيجابي" ? C.mint : n.sentiment === "سلبي" ? C.coral : C.amber;
          return (
            <div key={i} style={{ padding: "9px 0", borderBottom: i < news.length-1 ? `1px solid ${C.line}22` : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <Tag text={n.src} color={C.electric}/>
                  <Tag text={n.category} color={C.smoke}/>
                  <span style={{ fontSize: 9, color: C.smoke }}>{n.time}</span>
                </div>
                <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                  <Tag text={n.impact === "عالي" ? "⚡عالي" : n.impact === "متوسط" ? "متوسط" : "منخفض"}
                    color={n.impact === "عالي" ? C.coral : n.impact === "متوسط" ? C.amber : C.smoke}/>
                  <Tag text={n.sentiment} color={sc}/>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.6 }}>{n.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                <div style={{ flex: 1, height: 3, background: C.layer3, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${n.score}%`, background: sc, borderRadius: 2 }}/>
                </div>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 10, color: sc, fontWeight: 700 }}>{n.score}</span>
              </div>
            </div>
          );
        }) : !loading && !error && (
          <EmptyState icon="📰" title="لا توجد أخبار محملة" subtitle="اضغط الزر أعلاه لجلب أحدث أخبار الشركة"/>
        )}
      </div>
    </SectionCard>
  );
}


export {
  OrderBookLoader, OrderBookPanel,
  TickLoader, TickDataPanel,
  NLPLoader, NLPNewsPanel,
};

