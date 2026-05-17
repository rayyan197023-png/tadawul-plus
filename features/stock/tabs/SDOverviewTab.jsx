'use client';
/**
 * @module features/stock/tabs/SDOverviewTab
 * @description تبويب النظرة العامة -- شارت + إحصائيات + درجات صحة + Snowflake
 *
 * ✨ نسخة منظفة:
 * - الشارت يستخدم stk.priceHistory من sahmk ohlcv API
 * - المحللين من ANALYST_BANKS (فارغ) أو AI live
 * - PEERS من sahmk companies (فارغ افتراضياً)
 * - الإحصائيات من stk الحي + fundamentals
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  C, SectionCard, Tag, Row, SkeletonCard, EmptyState, haptic, nowStr,
  ANALYST_BANKS, PEERS, FIN_SCORES,
} from './StockDetailShared';
import { ANALYST_EST } from './SDApiEnginesTab';

/* ═══════════════════════════════════════════════════════════════
   ChartLoader + CChart -- شارت احترافي على Canvas
═══════════════════════════════════════════════════════════════ */

function ChartLoader({ stk, period }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, [stk?.sym, period]);
  if (!show) return (
    <div style={{
      height: 280, background: C.layer2, borderRadius: 14,
      border: `1px solid ${C.line}`, marginBottom: 10,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ fontSize: 11, color: C.smoke }}>تحميل الشارت...</div>
    </div>
  );
  return <CChart stk={stk} period={period}/>;
}

function CChart({ stk, period = "3M" }) {
  const canvasRef = useRef(null);
  const [chartType, setChartType] = useState("line"); // line, area, candle
  const [showMA, setShowMA] = useState({ ma20: false, ma50: false, ma200: false });
  const [showVWAP, setShowVWAP] = useState(false);

  const bars = useMemo(() => {
    const h = stk?.priceHistory || [];
    if (h.length === 0) return [];
    // تصفية حسب الفترة
    const periodMap = { "1D":1, "1W":5, "1M":22, "3M":66, "6M":132, "1Y":252, "5Y":1260, "MAX":h.length };
    const days = periodMap[period] || 66;
    return h.slice(-days);
  }, [stk?.priceHistory, period]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bars.length === 0) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width, H = rect.height;
    const padding = { top: 14, right: 12, bottom: 22, left: 12 };
    const cW = W - padding.left - padding.right;
    const cH = H - padding.top - padding.bottom;

    // مدى الأسعار
    const prices = bars.flatMap(b => [b.h || b.c, b.l || b.c]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const padR = range * 0.05;

    const xScale = i => padding.left + (i / Math.max(1, bars.length - 1)) * cW;
    const yScale = p => padding.top + ((maxP + padR - p) / (range + 2 * padR)) * cH;

    // Background grid
    ctx.strokeStyle = C.line + "33";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * cH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + cW, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = C.smoke;
    ctx.font = "10px IBM Plex Mono,monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * cH;
      const p = maxP + padR - (i / 4) * (range + 2 * padR);
      ctx.fillText(p.toFixed(2), W - 2, y + 3);
    }

    // الشارت
    if (chartType === "candle" && bars.length > 0 && bars[0].o != null) {
      const candleW = Math.max(2, cW / bars.length * 0.7);
      bars.forEach((b, i) => {
        const x = xScale(i);
        const isUp = b.c >= b.o;
        const col = isUp ? C.mint : C.coral;
        // الفتيل
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, yScale(b.h || b.c));
        ctx.lineTo(x, yScale(b.l || b.c));
        ctx.stroke();
        // الجسم
        ctx.fillStyle = col;
        const yO = yScale(b.o);
        const yC = yScale(b.c);
        ctx.fillRect(x - candleW/2, Math.min(yO, yC), candleW, Math.max(1, Math.abs(yC - yO)));
      });
    } else {
      // Area / Line
      const closes = bars.map(b => b.c);
      const lastP = closes[closes.length - 1];
      const firstP = closes[0];
      const isUp = lastP >= firstP;
      const lineColor = isUp ? C.mint : C.coral;

      if (chartType === "area") {
        // Gradient fill
        const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + cH);
        grad.addColorStop(0, lineColor + "55");
        grad.addColorStop(1, lineColor + "00");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(xScale(0), yScale(closes[0]));
        closes.forEach((p, i) => ctx.lineTo(xScale(i), yScale(p)));
        ctx.lineTo(xScale(closes.length - 1), padding.top + cH);
        ctx.lineTo(xScale(0), padding.top + cH);
        ctx.closePath();
        ctx.fill();
      }

      // Line
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1.8;
      ctx.lineJoin = "round";
      ctx.beginPath();
      closes.forEach((p, i) => {
        if (i === 0) ctx.moveTo(xScale(i), yScale(p));
        else ctx.lineTo(xScale(i), yScale(p));
      });
      ctx.stroke();
    }

    // MA overlays
    const drawMA = (period, color) => {
      if (bars.length < period) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = period - 1; i < bars.length; i++) {
        const sum = bars.slice(i - period + 1, i + 1).reduce((s, b) => s + b.c, 0);
        const ma = sum / period;
        if (i === period - 1) ctx.moveTo(xScale(i), yScale(ma));
        else ctx.lineTo(xScale(i), yScale(ma));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };
    if (showMA.ma20) drawMA(20, C.electric);
    if (showMA.ma50) drawMA(50, C.gold);
    if (showMA.ma200) drawMA(200, C.plasma);

    // VWAP
    if (showVWAP && bars[0].v != null) {
      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      let cumPV = 0, cumV = 0;
      bars.forEach((b, i) => {
        const tp = ((b.h || b.c) + (b.l || b.c) + b.c) / 3;
        cumPV += tp * (b.v || 0);
        cumV += b.v || 0;
        const vwap = cumV > 0 ? cumPV / cumV : b.c;
        if (i === 0) ctx.moveTo(xScale(i), yScale(vwap));
        else ctx.lineTo(xScale(i), yScale(vwap));
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [bars, chartType, showMA, showVWAP]);

  if (bars.length === 0) {
    return (
      <div style={{
        height: 280, background: C.layer2, borderRadius: 14,
        border: `1px solid ${C.line}`, marginBottom: 10,
      }}>
        <EmptyState
          icon="📊"
          title="لا توجد بيانات للشارت"
          subtitle="جارٍ تحميل البيانات التاريخية من sahmk..."
        />
      </div>
    );
  }

  return (
    <div style={{ background: C.layer2, borderRadius: 14, border: `1px solid ${C.line}`, marginBottom: 10, overflow: "hidden" }}>
      {/* أدوات الشارت */}
      <div style={{ display: "flex", gap: 5, padding: "8px 10px", borderBottom: `1px solid ${C.line}44`, flexWrap: "wrap" }}>
        {[
          { id: "line", icon: "📈" },
          { id: "area", icon: "🌄" },
          { id: "candle", icon: "🕯" },
        ].map(t => (
          <button key={t.id} onClick={() => { haptic(); setChartType(t.id); }}
            style={{
              background: chartType === t.id ? C.electric + "22" : C.layer3,
              border: `1px solid ${chartType === t.id ? C.electric : C.line}`,
              borderRadius: 6, padding: "5px 9px", fontSize: 13, cursor: "pointer",
            }}>{t.icon}</button>
        ))}
        <div style={{ flex: 1 }}/>
        {[
          { key: "ma20", label: "MA20", color: C.electric },
          { key: "ma50", label: "MA50", color: C.gold },
          { key: "ma200", label: "MA200", color: C.plasma },
        ].map(m => (
          <button key={m.key} onClick={() => { haptic(); setShowMA(s => ({ ...s, [m.key]: !s[m.key] })); }}
            style={{
              background: showMA[m.key] ? m.color + "22" : C.layer3,
              border: `1px solid ${showMA[m.key] ? m.color : C.line}`,
              borderRadius: 6, padding: "4px 8px", fontSize: 9, cursor: "pointer",
              color: showMA[m.key] ? m.color : C.smoke, fontWeight: 700,
            }}>{m.label}</button>
        ))}
        <button onClick={() => { haptic(); setShowVWAP(v => !v); }}
          style={{
            background: showVWAP ? C.teal + "22" : C.layer3,
            border: `1px solid ${showVWAP ? C.teal : C.line}`,
            borderRadius: 6, padding: "4px 8px", fontSize: 9, cursor: "pointer",
            color: showVWAP ? C.teal : C.smoke, fontWeight: 700,
          }}>VWAP</button>
      </div>
      <div style={{ height: 280, position: "relative" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ScoreCard, MiniScoreCard, ScoreDrawer -- درجات الصحة
═══════════════════════════════════════════════════════════════ */

function ScoreCard({ score, label, color, sub, max = 100, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: color + "10", border: `1px solid ${color}33`,
      borderRadius: 12, padding: "12px 10px", textAlign: "center",
      cursor: onClick ? "pointer" : "default",
    }}>
      <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
        {score}{max && <span style={{ fontSize: 10, color: C.smoke }}>/{max}</span>}
      </div>
      <div style={{ fontSize: 10, color: C.mist, marginTop: 4, fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function MiniScoreCard({ score, label, color, max = 100 }) {
  return (
    <div style={{
      background: color + "0c", border: `1px solid ${color}22`,
      borderRadius: 8, padding: "6px", textAlign: "center",
    }}>
      <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 13, fontWeight: 900, color }}>
        {score}<span style={{ fontSize: 8, color: C.smoke }}>/{max}</span>
      </div>
      <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function HealthScores({ stk }) {
  const scores = FIN_SCORES[stk.sym] || FIN_SCORES.default;
  const hasData = scores.altmanZ > 0 || scores.piotroski > 0;

  if (!hasData) {
    return (
      <SectionCard title="درجات الصحة المالية" accent={C.gold}>
        <EmptyState
          icon="🏥"
          title="درجات الصحة غير متوفرة"
          subtitle="ستظهر عند توفر البيانات المالية الكاملة من API"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="درجات الصحة المالية" accent={C.gold}>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <ScoreCard score={scores.altmanZ}    label="Altman Z"    color={scores.altmanZ > 3 ? C.mint : scores.altmanZ > 1.8 ? C.amber : C.coral} max={null} sub="إفلاس"/>
          <ScoreCard score={scores.piotroski}  label="Piotroski F" color={scores.piotroski >= 7 ? C.mint : scores.piotroski >= 4 ? C.amber : C.coral} max={9} sub="جودة"/>
          <ScoreCard score={scores.cashScore}  label="Cash Score"  color={scores.cashScore > 70 ? C.mint : scores.cashScore > 40 ? C.amber : C.coral} sub="نقدية"/>
          <ScoreCard score={scores.beneish}    label="Beneish M"   color={scores.beneish < -2.22 ? C.mint : C.amber} max={null} sub="تلاعب"/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <MiniScoreCard score={scores.profitScore} label="ربحية" color={scores.profitScore > 60 ? C.mint : C.amber}/>
          <MiniScoreCard score={scores.growthScore} label="نمو"   color={scores.growthScore > 60 ? C.mint : C.amber}/>
          <MiniScoreCard score={scores.debtScore}   label="ديون"  color={scores.debtScore > 60 ? C.mint : C.amber}/>
        </div>
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SnowflakeCard -- رادار 6 محاور
═══════════════════════════════════════════════════════════════ */

function SnowflakeCard({ stk }) {
  // 6 محاور: pe (تقييم), growth, margin, current ratio, dividend, price perf
  const axes = useMemo(() => {
    const norm = (v, min, max) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
    return [
      { label: "تقييم",   value: stk.pe          ? 100 - norm(stk.pe, 5, 35) : 0,    raw: stk.pe?.toFixed(1) || "--" },
      { label: "نمو",     value: stk.growthYoY   ? norm(stk.growthYoY, -10, 40)   : 0, raw: stk.growthYoY ? stk.growthYoY + "%" : "--" },
      { label: "هامش",    value: stk.netMargin   ? norm(stk.netMargin, 0, 30)     : 0, raw: stk.netMargin ? stk.netMargin + "%" : "--" },
      { label: "سيولة",   value: stk.currentRatio? norm(stk.currentRatio, 0.5, 3) : 0, raw: stk.currentRatio?.toFixed(2) || "--" },
      { label: "توزيعات", value: stk.divYld      ? norm(stk.divYld, 0, 10)        : 0, raw: stk.divYld ? stk.divYld + "%" : "--" },
      { label: "أداء",    value: stk.pct         ? norm(stk.pct, -5, 5)            : 50, raw: stk.pct ? (stk.pct > 0 ? "+" : "") + stk.pct + "%" : "--" },
    ];
  }, [stk]);

  const CX = 90, CY = 90, R = 70;
  const points = axes.map((a, i) => {
    const angle = (i / 6) * 2 * Math.PI - Math.PI / 2;
    const r = (a.value / 100) * R;
    return {
      x: CX + r * Math.cos(angle),
      y: CY + r * Math.sin(angle),
      lx: CX + (R + 16) * Math.cos(angle),
      ly: CY + (R + 16) * Math.sin(angle),
      label: a.label,
      value: a.value,
      raw: a.raw,
    };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <SectionCard title="بطاقة الجودة -- Snowflake" accent={C.teal}>
      <div style={{ padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
        <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
          {/* شبكة خلفية */}
          {[0.25, 0.5, 0.75, 1].map(r => (
            <polygon key={r}
              points={Array.from({ length: 6 }).map((_, i) => {
                const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
                return `${CX + R * r * Math.cos(a)},${CY + R * r * Math.sin(a)}`;
              }).join(" ")}
              fill="none" stroke={C.line + "44"} strokeWidth="0.5"/>
          ))}
          {/* محاور */}
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * 2 * Math.PI - Math.PI / 2;
            return <line key={i} x1={CX} y1={CY} x2={CX + R * Math.cos(a)} y2={CY + R * Math.sin(a)} stroke={C.line + "44"} strokeWidth="0.5"/>;
          })}
          {/* المضلع */}
          <path d={path} fill={C.teal + "33"} stroke={C.teal} strokeWidth="1.5"/>
          {/* نقاط */}
          {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={C.teal}/>)}
          {/* تسميات */}
          {points.map((p, i) => (
            <text key={i} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle"
              fill={C.smoke} fontSize="9" fontFamily="Cairo,sans-serif">{p.label}</text>
          ))}
        </svg>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {axes.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.smoke }}>{a.label}</span>
              <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 700, color: a.value > 60 ? C.mint : a.value < 30 ? C.coral : C.amber }}>{a.raw}</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PerDropdown -- قائمة الفترات
═══════════════════════════════════════════════════════════════ */

function PerDropdown({ value, onChange }) {
  const periods = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y", "MAX"];
  return (
    <div style={{ display: "flex", gap: 4, padding: "0 0 8px", flexWrap: "wrap" }}>
      {periods.map(p => (
        <button key={p} onClick={() => { haptic(); onChange(p); }}
          style={{
            background: value === p ? C.electric + "22" : C.layer3,
            border: `1px solid ${value === p ? C.electric : C.line}`,
            borderRadius: 6, padding: "5px 10px",
            fontSize: 10, fontFamily: "IBM Plex Mono,monospace",
            color: value === p ? C.electric : C.smoke,
            fontWeight: 700, cursor: "pointer",
          }}>{p}</button>
      ))}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   SDOverview -- المكون الرئيسي
═══════════════════════════════════════════════════════════════ */

function SDOverview({ stk }) {
  const [period, setPeriod] = useState("3M");
  const [showMore, setShowMore] = useState(false);
  const [aiAnalyst, setAiAnalyst] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const analystEst = ANALYST_EST[stk.sym] || ANALYST_EST.default;
  const peers = PEERS[stk.sym] || PEERS.default;

  // Range bars: today + 52w
  const dayRange = useMemo(() => {
    if (!stk.dayLo || !stk.dayHi || !stk.p) return null;
    const pct = ((stk.p - stk.dayLo) / (stk.dayHi - stk.dayLo)) * 100;
    return { lo: stk.dayLo, hi: stk.dayHi, pct: Math.max(0, Math.min(100, pct)) };
  }, [stk.dayLo, stk.dayHi, stk.p]);

  const yearRange = useMemo(() => {
    if (!stk.lo52 || !stk.hi52 || !stk.p) return null;
    const pct = ((stk.p - stk.lo52) / (stk.hi52 - stk.lo52)) * 100;
    return { lo: stk.lo52, hi: stk.hi52, pct: Math.max(0, Math.min(100, pct)) };
  }, [stk.lo52, stk.hi52, stk.p]);

  // الزخم على فترات متعددة
  const momentum = useMemo(() => {
    const h = stk.priceHistory || [];
    if (h.length < 22) return null;
    const last = h[h.length - 1].c;
    const calcPct = (back) => {
      const idx = Math.max(0, h.length - 1 - back);
      const prev = h[idx]?.c;
      return prev ? +((last - prev) / prev * 100).toFixed(2) : null;
    };
    return [
      { label: "1ي",  pct: calcPct(1) },
      { label: "1أ",  pct: calcPct(5) },
      { label: "1ش",  pct: calcPct(22) },
      { label: "3ش",  pct: calcPct(66) },
      { label: "6ش",  pct: calcPct(132) },
      { label: "1س",  pct: calcPct(252) },
      { label: "ytd", pct: calcPct(Math.min(h.length - 1, new Date().getMonth() * 22)) },
      { label: "MAX", pct: calcPct(h.length - 1) },
    ];
  }, [stk.priceHistory]);

  // تحليل المحللين بـ AI
  const fetchAiAnalyst = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `ابحث عن أحدث توصيات المحللين لسهم ${stk.name} (${stk.sym}) في السوق السعودي.\nأجب بـ JSON فقط:\n{"consensus":"شراء قوي/شراء/محايد/بيع","targetMean":رقم,"targetHigh":رقم,"targetLow":رقم,"numAnalysts":رقم,"buy":رقم,"hold":رقم,"sell":رقم,"banks":[{"bank":"اسم البنك","rating":"التصنيف","target":رقم,"date":"التاريخ"}],"summary":"ملخص"}`
          }]
        })
      });
      const d = await res.json();
      const txt = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const m = txt.match(/\{[\s\S]*\}/);
      if (m) setAiAnalyst(JSON.parse(m[0]));
      else setAiError("لم يُعثر على بيانات");
    } catch (e) {
      setAiError("خطأ: " + e.message);
    }
    setAiLoading(false);
  };

  const consensusData = aiAnalyst || (stk.consensus ? {
    consensus: stk.consensus,
    targetMean: stk.targetMean,
    targetHigh: stk.targetHigh,
    targetLow:  stk.targetLow,
    numAnalysts: stk.numAnalysts,
    buy:  analystEst.buy,
    hold: analystEst.hold,
    sell: analystEst.sell,
  } : null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* الشارت */}
      <SectionCard title="السعر والشارت" accent={C.electric}>
        <div style={{ padding: "10px 12px 0" }}>
          <PerDropdown value={period} onChange={setPeriod}/>
        </div>
        <div style={{ padding: "0 8px 8px" }}>
          <ChartLoader stk={stk} period={period}/>
        </div>
      </SectionCard>

      {/* نطاقات السعر */}
      <SectionCard title="نطاقات السعر" accent={C.gold}>
        <div style={{ padding: "12px 16px" }}>
          {dayRange ? (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: C.smoke }}>نطاق اليوم</span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, color: C.mist, fontWeight: 700 }}>
                  {dayRange.lo} -- {dayRange.hi}
                </span>
              </div>
              <div style={{ position: "relative", height: 8, background: C.layer3, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,${C.coral}66,${C.amber}66,${C.mint}66)` }}/>
                <div style={{ position: "absolute", left: `${dayRange.pct}%`, top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: C.snow, border: `2px solid ${C.layer1}`, boxShadow: "0 0 4px rgba(0,0,0,.8)" }}/>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: C.smoke, marginBottom: 12, textAlign: "center" }}>نطاق اليوم -- غير متوفر</div>
          )}
          {yearRange ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: C.smoke }}>نطاق 52 أسبوع</span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, color: C.mist, fontWeight: 700 }}>
                  {yearRange.lo} -- {yearRange.hi}
                </span>
              </div>
              <div style={{ position: "relative", height: 8, background: C.layer3, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,${C.coral}66,${C.amber}66,${C.mint}66)` }}/>
                <div style={{ position: "absolute", left: `${yearRange.pct}%`, top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: "50%", background: C.snow, border: `2px solid ${C.layer1}`, boxShadow: "0 0 4px rgba(0,0,0,.8)" }}/>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: C.smoke, textAlign: "center" }}>نطاق 52 أسبوع -- غير متوفر</div>
          )}
        </div>
      </SectionCard>

      {/* الإحصائيات */}
      <SectionCard title="الإحصائيات" accent={C.electric}>
        <Row label="الإغلاق السابق" value={stk.prev?.toFixed(2) ?? "--"}/>
        <Row label="الافتتاح" value={stk.o?.toFixed(2) ?? "--"} even/>
        <Row label="أعلى اليوم" value={stk.dayHi?.toFixed(2) ?? "--"} color={C.mint}/>
        <Row label="أدنى اليوم" value={stk.dayLo?.toFixed(2) ?? "--"} color={C.coral} even/>
        <Row label="الحجم" value={stk.v ? (stk.v / 1e6).toFixed(2) + "M" : "--"}/>
        <Row label="القيمة" value={stk.val ? (stk.val / 1e6).toFixed(2) + "M ر.س" : "--"} even/>
        <Row label="القيمة السوقية" value={stk.mc || "--"}/>
        <Row label="عدد الأسهم" value={stk.sharesOut ? (stk.sharesOut / 1e6).toFixed(0) + "M" : "--"} even/>
        {showMore && (
          <>
            <Row section="مالية"/>
            <Row label="P/E" value={stk.pe?.toFixed(2) ?? "--"}/>
            <Row label="Forward P/E" value={stk.forwardPE?.toFixed(2) ?? "--"} even/>
            <Row label="EPS" value={stk.eps?.toFixed(2) ?? "--"}/>
            <Row label="P/B" value={stk.pb?.toFixed(2) ?? "--"} even/>
            <Row label="القيمة الدفترية" value={stk.bvps?.toFixed(2) ?? "--"}/>
            <Row label="Beta" value={stk.beta?.toFixed(2) ?? "--"} even/>
            <Row section="نطاق سنوي"/>
            <Row label="أعلى 52 أسبوع" value={stk.hi52?.toFixed(2) ?? "--"} color={C.mint}/>
            <Row label="أدنى 52 أسبوع" value={stk.lo52?.toFixed(2) ?? "--"} color={C.coral} even/>
            <Row label="الأسهم الحرة" value={stk.floatPct ? stk.floatPct + "%" : "--"}/>
          </>
        )}
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${C.line}33` }}>
          <button onClick={() => { haptic(); setShowMore(s => !s); }} style={{
            width: "100%", background: "transparent", border: `1px solid ${C.line}`,
            borderRadius: 8, padding: "8px", color: C.electric,
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif",
          }}>{showMore ? "عرض أقل ▲" : "عرض المزيد ▼"}</button>
        </div>
      </SectionCard>

      {/* درجات الصحة */}
      <HealthScores stk={stk}/>

      {/* Snowflake */}
      <SnowflakeCard stk={stk}/>

      {/* الزخم على فترات */}
      {momentum && (
        <SectionCard title="الزخم -- أداء السعر" accent={C.plasma}>
          <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {momentum.map((m, i) => {
              const isUp = m.pct != null && m.pct >= 0;
              const c = m.pct == null ? C.smoke : isUp ? C.mint : C.coral;
              return (
                <div key={i} style={{
                  background: c + "10", border: `1px solid ${c}22`,
                  borderRadius: 8, padding: "6px 4px", textAlign: "center",
                }}>
                  <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 800, color: c }}>
                    {m.pct == null ? "--" : (isUp ? "+" : "") + m.pct + "%"}
                  </div>
                  <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* إجماع المحللين */}
      <SectionCard title="إجماع المحللين" accent={C.gold}
        badge={aiAnalyst ? { text: "حي AI", color: C.mint } : null}>
        <div style={{ padding: "10px 14px" }}>
          {consensusData ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <Tag text={consensusData.consensus || "--"}
                    color={
                      consensusData.consensus?.includes("شراء") ? C.mint :
                      consensusData.consensus?.includes("بيع") ? C.coral : C.amber
                    }/>
                  {consensusData.numAnalysts > 0 && (
                    <div style={{ fontSize: 9, color: C.smoke, marginTop: 4 }}>
                      {consensusData.numAnalysts} محلل
                    </div>
                  )}
                </div>
                {consensusData.targetMean && (
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 9, color: C.smoke }}>السعر المستهدف</div>
                    <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 16, fontWeight: 900, color: C.gold }}>
                      {consensusData.targetMean.toFixed(2)}
                    </div>
                    {stk.p && (
                      <div style={{ fontSize: 9, color: consensusData.targetMean > stk.p ? C.mint : C.coral, marginTop: 2 }}>
                        {consensusData.targetMean > stk.p ? "+" : ""}
                        {((consensusData.targetMean - stk.p) / stk.p * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
              {(consensusData.buy > 0 || consensusData.hold > 0 || consensusData.sell > 0) && (
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ flex: consensusData.buy || 0, background: C.mint }}/>
                  <div style={{ flex: consensusData.hold || 0, background: C.amber }}/>
                  <div style={{ flex: consensusData.sell || 0, background: C.coral }}/>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 10 }}>
                <div style={{ textAlign: "center", color: C.mint }}>شراء: {consensusData.buy || 0}</div>
                <div style={{ textAlign: "center", color: C.amber }}>محايد: {consensusData.hold || 0}</div>
                <div style={{ textAlign: "center", color: C.coral }}>بيع: {consensusData.sell || 0}</div>
              </div>
              {aiAnalyst?.summary && (
                <div style={{
                  marginTop: 10, padding: "8px 10px",
                  background: C.layer3, borderRadius: 8,
                  fontSize: 10, color: C.mist, lineHeight: 1.6,
                }}>{aiAnalyst.summary}</div>
              )}
            </>
          ) : (
            <EmptyState
              icon="📊"
              title="بيانات المحللين غير متوفرة"
              subtitle="اضغط للبحث بـ AI عن أحدث التوصيات"
            />
          )}
          {aiError && (
            <div style={{ padding: "6px 10px", background: C.coral + "15", borderRadius: 7, fontSize: 10, color: C.coral, marginTop: 6 }}>
              {aiError}
            </div>
          )}
          <button onClick={() => { haptic(); fetchAiAnalyst(); }} disabled={aiLoading} style={{
            width: "100%", marginTop: 10,
            background: aiLoading ? C.layer3 : C.gold + "18",
            border: `1px solid ${C.gold}44`,
            borderRadius: 8, padding: "9px",
            color: C.gold, fontSize: 11, fontWeight: 700,
            cursor: aiLoading ? "not-allowed" : "pointer",
            fontFamily: "Cairo,sans-serif",
          }}>
            {aiLoading ? "جارٍ البحث..." : aiAnalyst ? "تحديث AI" : "🔍 بحث بـ AI"}
          </button>
        </div>
      </SectionCard>

      {/* الأقران */}
      <SectionCard title="مقارنة الأقران" accent={C.teal}>
        {peers.length > 0 ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px 60px", gap: 0, padding: "8px 12px", background: C.layer3, fontSize: 9, color: C.smoke, fontWeight: 700, borderBottom: `1px solid ${C.line}44` }}>
              <span>الشركة</span>
              <span style={{ textAlign: "center" }}>P/E</span>
              <span style={{ textAlign: "center" }}>ROE%</span>
              <span style={{ textAlign: "center" }}>التغير%</span>
            </div>
            {peers.map((peer, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 60px 60px 60px",
                padding: "8px 12px", borderBottom: i < peers.length - 1 ? `1px solid ${C.line}22` : 0,
                background: peer.isCurrent ? C.electric + "08" : i % 2 ? "rgba(255,255,255,.015)" : "transparent",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 10, color: peer.isCurrent ? C.electric : C.mist, fontWeight: peer.isCurrent ? 800 : 600 }}>
                  {peer.name}
                </span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 10, textAlign: "center", color: C.mist }}>
                  {peer.pe?.toFixed(1) || "--"}
                </span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 10, textAlign: "center", color: C.mist }}>
                  {peer.roe || "--"}
                </span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 10, textAlign: "center", color: peer.pct >= 0 ? C.mint : C.coral, fontWeight: 700 }}>
                  {peer.pct != null ? (peer.pct >= 0 ? "+" : "") + peer.pct + "%" : "--"}
                </span>
              </div>
            ))}
          </>
        ) : (
          <EmptyState
            icon="🏢"
            title="بيانات الأقران غير متوفرة"
            subtitle="ستظهر شركات نفس القطاع عند توفر البيانات"
          />
        )}
      </SectionCard>

    </div>
  );
}

// ─── Exports ────────────────────────────────────────────────────
export {
  ChartLoader, CChart,
  ScoreCard, MiniScoreCard,
  SnowflakeCard, HealthScores,
  PerDropdown,
  SDOverview,
};
