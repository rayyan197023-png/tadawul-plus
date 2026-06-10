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

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: 'ابحث عن أحدث 5 أخبار مهمة عن سهم ' + stk.name + ' (' + stk.sym + ') في السوق السعودي خلال آخر 48 ساعة.\nلكل خبر حلل مشاعره تجاه السهم.\nأجب بـ JSON فقط بالشكل التالي بدون أي نص خارجه:\n{"news":[{"title":"عنوان الخبر بالعربي","src":"المصدر","sentiment":"إيجابي أو سلبي أو محايد","score":رقم_من_0_الى_100,"impact":"عالي أو متوسط أو منخفض","category":"أرباح أو قطاعي أو شركة أو ماكرو أو تصنيف","time":"منذ Xس أو منذ X يوم"}],"overall":رقم_الإجماع,"summary":"ملخص قصير للمشاعر"}'
          }]
        })
      });
      const d = await res.json();
      const txt = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) {
        setData(JSON.parse(m[0]));
        setFetched(new Date().toLocaleString("ar-SA"));
      } else {
        setError("لم يُعثر على بيانات");
      }
    } catch (e) {
      setError("خطأ: " + e.message);
    }
    setLoading(false);
  };

  const news = data?.news || [];
  const avg = data?.overall ?? (news.length > 0
    ? Math.round(news.reduce((s, n) => s + (n.score || 0), 0) / news.length)
    : 50);
  const sC = avg > 65 ? C.mint : avg < 40 ? C.coral : C.amber;

  return (
    <SectionCard title="تحليل المشاعر -- AI + بحث حي" accent={sC}
      badge={data ? { text: "حي", color: C.mint } : { text: "في انتظار التحديث", color: C.amber }}>
      <div style={{ padding: "8px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            {data ? (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Tag text={avg > 65 ? "إيجابي" : avg < 40 ? "سلبي" : "محايد"} color={sC}/>
                  <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 13, fontWeight: 900, color: sC }}>{avg}/100</span>
                </div>
                {fetched && <div style={{ fontSize: 9, color: C.mint, marginTop: 2 }}>{"✓ بيانات حية -- "}{fetched}</div>}
              </>
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
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                جارٍ...
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.electric} strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-.09-1"/>
                </svg>
                {data ? "تحديث AI" : "تحليل AI"}
              </>
            )}
          </button>
        </div>

        {data && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 5, background: C.layer3, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
              <div style={{
                height: "100%", width: `${avg}%`,
                background: `linear-gradient(90deg,${avg > 65 ? C.coral : C.mint},${sC})`,
                borderRadius: 3,
              }}/>
            </div>
            {news.length > 1 && (
              <svg width="100%" height="28" viewBox="0 0 200 28" preserveAspectRatio="none" style={{ display: "block" }}>
                <defs>
                  <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sC} stopOpacity=".3"/>
                    <stop offset="100%" stopColor={sC} stopOpacity="0"/>
                  </linearGradient>
                </defs>
                {(() => {
                  const pts3 = news.map((n, i) => ({
                    x: (i / (news.length - 1)) * 196 + 2,
                    y: 28 - (n.score || 0) / 100 * 24,
                  }));
                  const path3 = pts3.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                  const area3 = path3 + ` L${pts3[pts3.length-1].x},28 L2,28 Z`;
                  return (
                    <>
                      <path d={area3} fill="url(#sentGrad)"/>
                      <path d={path3} fill="none" stroke={sC} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      {pts3.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="2.5"
                          fill={news[i].sentiment === "إيجابي" ? C.mint : news[i].sentiment === "سلبي" ? C.coral : C.amber}/>
                      ))}
                    </>
                  );
                })()}
              </svg>
            )}
          </div>
        )}

        {data?.summary && (
          <div style={{
            padding: "7px 10px",
            background: sC + "10", border: `1px solid ${sC}33`,
            borderRadius: 8, marginBottom: 10,
            fontSize: 11, color: C.mist, lineHeight: 1.6,
          }}>
            {data.summary}
          </div>
        )}

        {error && (
          <div style={{
            padding: "6px 10px",
            background: C.coral + "15", border: `1px solid ${C.coral}33`,
            borderRadius: 8, marginBottom: 8,
            fontSize: 10, color: C.coral,
          }}>{error}</div>
        )}

        {news.length > 0 ? (
          news.map((n, i) => {
            const sc = n.sentiment === "إيجابي" ? C.mint : n.sentiment === "سلبي" ? C.coral : C.amber;
            return (
              <div key={i} style={{
                padding: "9px 0",
                borderBottom: i < news.length - 1 ? `1px solid ${C.line}22` : 0,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <Tag text={n.src} color={C.electric}/>
                    <Tag text={n.category} color={C.smoke}/>
                    <span style={{ fontSize: 10, color: C.smoke }}>{n.time}</span>
                  </div>
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    <Tag
                      text={n.impact === "عالي" ? "⚡عالي" : n.impact === "متوسط" ? "متوسط" : "منخفض"}
                      color={n.impact === "عالي" ? C.coral : n.impact === "متوسط" ? C.amber : C.smoke}
                    />
                    <Tag text={n.sentiment} color={sc}/>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.6 }}>{n.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <div style={{ flex: 1, height: 3, background: C.layer3, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${n.score}%`, background: sc, borderRadius: 2 }}/>
                  </div>
                  <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 10, color: sc, fontWeight: 700, flexShrink: 0 }}>{n.score}</span>
                </div>
              </div>
            );
          })
        ) : !loading && !error && (
          <EmptyState
            icon="📰"
            title="لا توجد أخبار محملة"
            subtitle="اضغط الزر أعلاه لجلب أحدث الأخبار وتحليل مشاعرها"
          />
        )}
      </div>
    </SectionCard>
  );
}
/* ═══════════════════════════════════════════════════════════════
   IntradayChart -- شارت Intraday من sahmk
═══════════════════════════════════════════════════════════════ */

function IntradayChart({ stk }) {
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stk?.sym) return;
    setLoading(true);
    fetch(`/api/sahmkdata?endpoint=intraday&sym=${stk.sym}`)
      .then(r => r.json())
      .then(d => {
        const data = d.data || [];
        setBars(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [stk?.sym]);

  if (loading) return (
    <SectionCard title="شارت Intraday" accent={C.teal}>
      <div style={{ padding: "14px 16px" }}>
        <Skeleton h={80} mb={8}/>
      </div>
    </SectionCard>
  );

  if (!bars.length) return null;

  // فلتر اليوم الحالي فقط
  const today = new Date().toISOString().slice(0, 10);
  const todayBars = bars.filter(b => b.date.startsWith(today));
  const displayBars = todayBars.length >= 2 ? todayBars : bars.slice(-10);

  const closes = displayBars.map(b => b.close);
  const vols   = displayBars.map(b => b.volume);
  const n = closes.length;
  if (n < 2) return null;

  const minC = Math.min(...closes), maxC = Math.max(...closes);
  const rng = maxC - minC || 1;
  const maxV = Math.max(...vols) || 1;
  const isUp = closes[n-1] >= closes[0];
  const color = isUp ? C.mint : C.coral;

  const W = 320, H = 80, VH = 20, PAD = 4;
  const px = i => PAD + (i / (n-1)) * (W - PAD*2);
  const py = v => H - PAD - ((v - minC) / rng) * (H - PAD*2);
  const pvy = v => H + VH - (v / maxV) * VH * 0.9;

  const linePath = closes.map((c, i) => `${i===0?"M":"L"}${px(i).toFixed(1)},${py(c).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L${px(n-1)},${H} L${px(0)},${H} Z`;

  // تنسيق الوقت
  const fmtTime = dateStr => {
    try {
      const d = new Date(dateStr);
      return `${String(d.getUTCHours()+3).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
    } catch { return ""; }
  };

  const change = closes[n-1] - closes[0];
  const changePct = ((change / closes[0]) * 100).toFixed(2);

  return (
    <SectionCard title="شارت Intraday -- ساعي" accent={C.teal}>
      <div style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: C.smoke }}>
            {fmtTime(displayBars[0]?.date)} -- {fmtTime(displayBars[n-1]?.date)}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 13, fontWeight: 900, color: C.snow }}>
              {closes[n-1]?.toFixed(2)}
            </span>
            <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 700, color }}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)} ({changePct}%)
            </span>
          </div>
        </div>

        <svg width="100%" viewBox={`0 0 ${W} ${H + VH + 10}`} preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id="intradayGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          {/* خطوط الشبكة */}
          {[0.25, 0.5, 0.75].map((t, i) => (
            <line key={i} x1={PAD} y1={PAD + t*(H-PAD*2)} x2={W-PAD} y2={PAD + t*(H-PAD*2)}
              stroke={C.line} strokeWidth="0.4" opacity="0.5"/>
          ))}
          {/* منطقة التعبئة */}
          <path d={areaPath} fill="url(#intradayGrad)"/>
          {/* الخط */}
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {/* نقطة آخر سعر */}
          <circle cx={px(n-1)} cy={py(closes[n-1])} r="3.5" fill={color}/>
          {/* أعمدة الحجم */}
          {displayBars.map((b, i) => {
            const bh = (b.volume / maxV) * VH * 0.9;
            const bw = Math.max(1.5, (W - PAD*2) / n * 0.7);
            const up = i === 0 || b.close >= displayBars[i-1]?.close;
            return (
              <rect key={i} x={px(i) - bw/2} y={pvy(b.volume)} width={bw} height={bh}
                fill={up ? C.mint : C.coral} opacity="0.5"/>
            );
          })}
          {/* تسميات الوقت */}
          {[0, Math.floor(n/2), n-1].map(idx => (
            <text key={idx} x={px(idx)} y={H + VH + 9} textAnchor="middle"
              fill={C.smoke} fontSize="7" fontFamily="IBM Plex Mono,monospace">
              {fmtTime(displayBars[idx]?.date)}
            </text>
          ))}
          {/* تسمية آخر سعر */}
          <text x={px(n-1) + 5} y={py(closes[n-1]) + 4} fill={color} fontSize="8"
            fontFamily="IBM Plex Mono,monospace" fontWeight="700">
            {closes[n-1]?.toFixed(2)}
          </text>
        </svg>

        {/* ملخص السيولة */}
        {stk.inflow && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 8 }}>
            {[
              { l: "شراء", v: ((stk.inflow||0)/1e6).toFixed(1)+"M", c: C.mint },
              { l: "بيع",  v: ((stk.outflow||0)/1e6).toFixed(1)+"M", c: C.coral },
              { l: "صافي", v: ((stk.netFlow||0)>=0?"+":"") + ((stk.netFlow||0)/1e6).toFixed(1)+"M", c: (stk.netFlow||0)>=0?C.mint:C.coral },
            ].map((item, i) => (
              <div key={i} style={{ background: item.c+"10", borderRadius: 8, padding: "5px", textAlign: "center", border: `1px solid ${item.c}22` }}>
                <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 800, color: item.c }}>{item.v}</div>
                <div style={{ fontSize: 9, color: C.smoke }}>{item.l}</div>
              </div>
            ))}
          </div>
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
