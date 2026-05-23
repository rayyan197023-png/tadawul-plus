'use client';
/**
 * @module features/stock/tabs/SDFundamentalTab
 * @description تبويب التحليل الأساسي -- مالية، أرباح، توزيعات، تحليل متقدم
 *
 * ✨ نسخة منظفة:
 * - InfoTooltip استخدم useState مباشرة (إصلاح bug)
 * - البيانات من stk الحي + FINANCIALS_FULL/EARNINGS_DATA الفارغة
 * - DCF و Multiples تُحسب من stk أو تظهر "--"
 */
import { useState, useEffect, useMemo } from 'react';
import {
  C, SectionCard, Tag, Row, SkeletonCard, EmptyState, haptic,
  FINANCIALS_FULL, EARNINGS_DATA, DIVIDENDS_DETAIL,
  PROS_CONS, DISCLOSURES,
} from './StockDetailShared';
import { useSectorAvg } from '../../../hooks/useSectorAvg';
/* ═══════════════════════════════════════════════════════════════
   InfoTooltip -- أداة الشرح
═══════════════════════════════════════════════════════════════ */

function InfoTooltip({ color = C.electric, title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); haptic(); setOpen(true); }} style={{
        width: 14, height: 14, borderRadius: "50%",
        background: color + "22", border: `1px solid ${color}55`,
        color, fontSize: 9, fontWeight: 900,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0, lineHeight: 1,
      }}>؟</button>
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20, backdropFilter: "blur(4px)",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.layer1, border: `1px solid ${color}44`,
            borderRadius: 14, maxWidth: 360, width: "100%",
            padding: "16px 18px", boxShadow: `0 10px 40px rgba(0,0,0,.6)`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, color, margin: 0 }}>{title}</h3>
              <button onClick={() => setOpen(false)} style={{
                background: "transparent", border: "none", color: C.smoke,
                fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1,
              }}>×</button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ValCard -- بطاقة التقييم
═══════════════════════════════════════════════════════════════ */

function ValCard({ label, value, sub, color = C.electric, sparkline }) {
  return (
    <div style={{
      background: color + "08", border: `1px solid ${color}22`,
      borderRadius: 10, padding: "10px 8px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: C.smoke }}>{label}</span>
        {sparkline && sparkline.length > 0 && (
          <svg width="40" height="14" viewBox="0 0 40 14" style={{ flexShrink: 0 }}>
            <polyline
              points={sparkline.map((v, i) => {
                const min = Math.min(...sparkline), max = Math.max(...sparkline);
                const range = max - min || 1;
                const x = (i / (sparkline.length - 1)) * 38 + 1;
                const y = 13 - ((v - min) / range) * 12;
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              }).join(" ")}
              fill="none" stroke={color} strokeWidth="1"
            />
          </svg>
        )}
      </div>
      <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 14, fontWeight: 900, color }}>
        {value ?? "--"}
      </div>
      {sub && <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SectorCompare -- مقارنة قطاعية
═══════════════════════════════════════════════════════════════ */

function SectorCompare({ stk, label, value, sectorAvg, isLowerBetter = false }) {
  if (value == null || sectorAvg == null) {
    return (
      <div style={{
        background: C.layer3, borderRadius: 8, padding: "8px 10px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: C.smoke }}>{label}</span>
        <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, color: C.smoke }}>--</span>
      </div>
    );
  }
  const diff = ((value - sectorAvg) / sectorAvg) * 100;
  const better = isLowerBetter ? diff < 0 : diff > 0;
  const c = better ? C.mint : C.coral;
  return (
    <div style={{ padding: "6px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: C.smoke }}>{label}</span>
        <div style={{ display: "flex", gap: 6, fontFamily: "IBM Plex Mono,monospace", fontSize: 10 }}>
          <span style={{ color: c, fontWeight: 700 }}>{typeof value === "number" ? value.toFixed(2) : value}</span>
          <span style={{ color: C.smoke }}>vs</span>
          <span style={{ color: C.mist }}>{typeof sectorAvg === "number" ? sectorAvg.toFixed(2) : sectorAvg}</span>
        </div>
      </div>
      <div style={{ height: 3, background: C.layer3, borderRadius: 2, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: C.smoke + "44" }}/>
        <div style={{
          height: "100%",
          width: `${Math.min(50, Math.abs(diff) / 2)}%`,
          background: c,
          marginLeft: diff < 0 ? `${50 - Math.min(50, Math.abs(diff) / 2)}%` : "50%",
        }}/>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OverviewPane -- نظرة عامة
═══════════════════════════════════════════════════════════════ */

function OverviewPane({ stk }) {
  const prosCons = PROS_CONS[stk.sym] || PROS_CONS.default;
  const disclosures = DISCLOSURES[stk.sym] || DISCLOSURES.default;

  // DCF بسيط من البيانات الحية
  const dcfData = useMemo(() => {
    if (!stk.eps || !stk.p) return null;
    const growthRate = stk.growthYoY || 5;
    const discountRate = 9;
    const terminalGrowth = 3;
    const yearsForecast = 5;

    let pvSum = 0;
    let currentEps = stk.eps;
    for (let y = 1; y <= yearsForecast; y++) {
      currentEps *= (1 + growthRate / 100);
      pvSum += currentEps / Math.pow(1 + discountRate / 100, y);
    }
    const terminalValue = (currentEps * (1 + terminalGrowth / 100)) / (discountRate / 100 - terminalGrowth / 100);
    const pvTerminal = terminalValue / Math.pow(1 + discountRate / 100, yearsForecast);
    const fairValue = pvSum + pvTerminal;
    const upside = ((fairValue - stk.p) / stk.p) * 100;

    return {
      fairValue: fairValue.toFixed(2),
      upside: upside.toFixed(1),
      growthAssumed: growthRate,
      discount: discountRate,
    };
  }, [stk.eps, stk.p, stk.growthYoY]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* DCF Fair Value */}
      <SectionCard title="القيمة العادلة -- DCF" accent={C.gold}>
        <div style={{ padding: "12px 14px" }}>
          {dcfData ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: C.gold + "12", borderRadius: 10, padding: "10px", textAlign: "center", border: `1px solid ${C.gold}33` }}>
                  <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>القيمة العادلة</div>
                  <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 18, fontWeight: 900, color: C.gold }}>
                    {dcfData.fairValue}
                  </div>
                </div>
                <div style={{
                  background: parseFloat(dcfData.upside) >= 0 ? C.mint + "12" : C.coral + "12",
                  borderRadius: 10, padding: "10px", textAlign: "center",
                  border: `1px solid ${parseFloat(dcfData.upside) >= 0 ? C.mint : C.coral}33`,
                }}>
                  <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>الفرصة</div>
                  <div style={{
                    fontFamily: "IBM Plex Mono,monospace", fontSize: 18, fontWeight: 900,
                    color: parseFloat(dcfData.upside) >= 0 ? C.mint : C.coral,
                  }}>
                    {parseFloat(dcfData.upside) >= 0 ? "+" : ""}{dcfData.upside}%
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: 10, color: C.smoke, lineHeight: 1.6,
                background: C.layer3, borderRadius: 8, padding: "8px 10px",
              }}>
                افتراضات: نمو {dcfData.growthAssumed}% • خصم {dcfData.discount}% • نمو نهائي 3% • 5 سنوات
              </div>
            </>
          ) : (
            <EmptyState
              icon="💰"
              title="DCF غير متوفر"
              subtitle="يتطلب EPS وسعر السهم وبيانات النمو من API"
            />
          )}
        </div>
      </SectionCard>

      {/* مضاعفات التقييم */}
      <SectionCard title="مضاعفات التقييم" accent={C.electric}>
        <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ValCard label="P/E"       value={stk.pe?.toFixed(2)}       color={C.electric} sub={stk.pe ? (stk.pe < 15 ? "مقوّم بأقل" : stk.pe > 25 ? "مقوّم بأعلى" : "عادل") : null}/>
          <ValCard label="Forward P/E" value={stk.forwardPE?.toFixed(2)} color={C.electric}/>
          <ValCard label="P/B"       value={stk.pb?.toFixed(2)}       color={C.plasma}/>
          <ValCard label="P/S"       value={stk.ps?.toFixed(2) ?? "--"} color={C.plasma}/>
          <ValCard label="EV/EBITDA" value={stk.evEbitda?.toFixed(2) ?? "--"} color={C.teal}/>
          <ValCard label="PEG"       value={stk.peg?.toFixed(2) ?? "--"} color={C.teal} sub={stk.peg ? (stk.peg < 1 ? "ممتاز" : "مرتفع") : null}/>
        </div>
      </SectionCard>

      {/* هوامش وعوائد */}
      <SectionCard title="الهوامش والعوائد" accent={C.mint}>
        <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

          <ValCard label="الهامش التشغيلي"  value={stk.opMargin ? stk.opMargin + "%" : null}     color={C.mint}/>
          <ValCard label="هامش صافي"        value={stk.netMargin ? stk.netMargin + "%" : null}    color={C.mint}/>
          <ValCard label="ROE"              value={stk.roe ? stk.roe + "%" : null}                color={C.gold}/>
          <ValCard label="ROA"              value={stk.roa ? stk.roa + "%" : null}                color={C.gold}/>
          <ValCard label="ROIC"             value={stk.roic ? stk.roic + "%" : null}              color={C.gold}/>
        </div>
      </SectionCard>

      {/* إيجابيات وسلبيات */}
      {(prosCons.pros?.length > 0 || prosCons.cons?.length > 0) ? (
        <SectionCard title="إيجابيات وسلبيات" accent={C.amber}>
          <div style={{ padding: "10px 14px" }}>
            {prosCons.pros?.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.mint, marginBottom: 6 }}>✓ إيجابيات</div>
                {prosCons.pros.map((p, i) => (
                  <div key={i} style={{
                    padding: "6px 8px", marginBottom: 4,
                    background: C.mint + "08", borderRadius: 6,
                    fontSize: 10, color: C.mist, lineHeight: 1.5,
                  }}>{p}</div>
                ))}
              </>
            )}
            {prosCons.cons?.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.coral, marginTop: 10, marginBottom: 6 }}>✗ سلبيات</div>
                {prosCons.cons.map((c, i) => (
                  <div key={i} style={{
                    padding: "6px 8px", marginBottom: 4,
                    background: C.coral + "08", borderRadius: 6,
                    fontSize: 10, color: C.mist, lineHeight: 1.5,
                  }}>{c}</div>
                ))}
              </>
            )}
          </div>
        </SectionCard>
      ) : null}

      {/* الإفصاحات */}
      {disclosures.length > 0 && (
        <SectionCard title="آخر الإفصاحات" accent={C.electric}>
          {disclosures.slice(0, 5).map((d, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              borderBottom: i < Math.min(4, disclosures.length - 1) ? `1px solid ${C.line}22` : 0,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Tag text={d.type || "إفصاح"} color={
                  d.impact === "إيجابي" ? C.mint :
                  d.impact === "سلبي" ? C.coral : C.electric
                }/>
                <span style={{ fontSize: 9, color: C.smoke }}>{d.date}</span>
              </div>
              <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.5 }}>{d.title}</div>
            </div>
          ))}
        </SectionCard>
      )}

    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   FinancialsPane -- البيانات المالية
═══════════════════════════════════════════════════════════════ */

function FinancialsPane({ stk }) {
  const [period, setPeriod] = useState("annual"); // annual | quarterly
  const [section, setSection] = useState("income"); // income | balance | cashflow

  // البيانات الحية من sahmk أولاً، وإلا الوهمية
  const fin = stk.financials || FINANCIALS_FULL[stk.sym] || FINANCIALS_FULL.default;
  const data = fin[section]?.[period] || [];

  const sectionLabels = {
    income:   "قائمة الدخل",
    balance:  "الميزانية",
    cashflow: "التدفقات النقدية",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* محدد القسم */}
      <div style={{ display: "flex", gap: 5, padding: 0, flexWrap: "wrap" }}>
        {Object.entries(sectionLabels).map(([key, label]) => (
          <button key={key} onClick={() => { haptic(); setSection(key); }}
            style={{
              flex: 1, minWidth: 90,
              background: section === key ? C.electric + "22" : C.layer3,
              border: `1px solid ${section === key ? C.electric : C.line}`,
              borderRadius: 8, padding: "8px",
              fontSize: 11, fontWeight: 700,
              color: section === key ? C.electric : C.smoke,
              cursor: "pointer", fontFamily: "Cairo,sans-serif",
            }}>{label}</button>
        ))}
      </div>

      {/* محدد الفترة */}
      <div style={{ display: "flex", gap: 5 }}>
        {[
          { id: "annual",    label: "سنوي" },
          { id: "quarterly", label: "ربع سنوي" },
        ].map(p => (
          <button key={p.id} onClick={() => { haptic(); setPeriod(p.id); }}
            style={{
              flex: 1,
              background: period === p.id ? C.gold + "22" : C.layer3,
              border: `1px solid ${period === p.id ? C.gold : C.line}`,
              borderRadius: 8, padding: "6px",
              fontSize: 10, fontWeight: 700,
              color: period === p.id ? C.gold : C.smoke,
              cursor: "pointer", fontFamily: "Cairo,sans-serif",
            }}>{p.label}</button>
        ))}
      </div>

      <SectionCard title={sectionLabels[section]} accent={C.electric}>
        {data.length > 0 ? (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: `1fr repeat(${Math.min(data.length, 4)}, 70px)`,
              gap: 0, padding: "8px 12px",
              background: C.layer3, borderBottom: `1px solid ${C.line}44`,
              fontSize: 9, color: C.smoke, fontWeight: 700,
            }}>
              <span>البند</span>
              {data.slice(0, 4).map((d, i) => (
                <span key={i} style={{ textAlign: "center" }}>{d.period || d.year || `Q${i+1}`}</span>
              ))}
            </div>
            {data[0] && Object.keys(data[0]).filter(k => !["period", "year"].includes(k)).map((key, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: `1fr repeat(${Math.min(data.length, 4)}, 70px)`,
                padding: "8px 12px",
                borderBottom: `1px solid ${C.line}22`,
                background: i % 2 ? "rgba(255,255,255,.015)" : "transparent",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 10, color: C.mist }}>{key}</span>
                {data.slice(0, 4).map((d, j) => (
                  <span key={j} style={{
                    fontFamily: "IBM Plex Mono,monospace",
                    fontSize: 10, textAlign: "center", color: C.mist,
                  }}>{d[key] ?? "--"}</span>
                ))}
              </div>
            ))}
          </>
        ) : (
          <EmptyState
            icon="📄"
            title={`${sectionLabels[section]} غير متوفرة`}
            subtitle="ستظهر البيانات المالية الكاملة عند توفر API"
          />
        )}
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EarningsPane -- الأرباح والتوزيعات
═══════════════════════════════════════════════════════════════ */

function EarningsPane({ stk }) {
  const earnings = stk.epsHistory || EARNINGS_DATA[stk.sym] || EARNINGS_DATA.default;
  const dividends = stk.divHistory || DIVIDENDS_DETAIL[stk.sym] || DIVIDENDS_DETAIL.default;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* مخطط EPS */}
      <SectionCard title="مسار EPS" accent={C.gold}>
        <div style={{ padding: "12px 14px" }}>
          {earnings.length > 0 ? (
            <>
              <svg width="100%" height="80" viewBox="0 0 300 80" preserveAspectRatio="none">
                {(() => {
                  const epsArr = earnings.slice(-8).map(e => e.eps).filter(v => v != null);
                  if (epsArr.length < 2) return null;
                  const min = Math.min(...epsArr), max = Math.max(...epsArr);
                  const range = max - min || 1;
                  const pts = epsArr.map((v, i) => ({
                    x: (i / (epsArr.length - 1)) * 296 + 2,
                    y: 75 - ((v - min) / range) * 65,
                  }));
                  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                  return (
                    <>
                      <path d={path} fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round"/>
                      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={C.gold}/>)}
                    </>
                  );
                })()}
              </svg>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.smoke, marginTop: 4 }}>
                <span>أقدم</span>
                <span>أحدث</span>
              </div>
            </>
          ) : (
            <EmptyState icon="📈" title="بيانات EPS غير متوفرة"/>
          )}
        </div>
      </SectionCard>

      {/* جدول الأرباح */}
      <SectionCard title="إصدارات الأرباح" accent={C.electric}>
        {earnings.length > 0 ? (
          <>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 60px 60px 50px",
              padding: "8px 12px", background: C.layer3,
              fontSize: 9, color: C.smoke, fontWeight: 700,
              borderBottom: `1px solid ${C.line}44`,
            }}>
              <span>الفترة</span>
              <span style={{ textAlign: "center" }}>EPS فعلي</span>
              <span style={{ textAlign: "center" }}>متوقع</span>
              <span style={{ textAlign: "center" }}>المفاجأة</span>
            </div>
            {earnings.slice(0, 8).map((e, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 60px 60px 50px",
                padding: "8px 12px",
                borderBottom: i < earnings.length - 1 ? `1px solid ${C.line}22` : 0,
                background: i % 2 ? "rgba(255,255,255,.015)" : "transparent",
                alignItems: "center",
              }}>
                <span style={{ fontSize: 10, color: C.mist }}>{e.period || e.date}</span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 10, textAlign: "center", color: C.mist }}>
                  {e.eps?.toFixed(2) ?? "--"}
                </span>
                <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 10, textAlign: "center", color: C.smoke }}>
                  {e.epsEst?.toFixed(2) ?? "--"}
                </span>
                <span style={{
                  fontFamily: "IBM Plex Mono,monospace", fontSize: 10, textAlign: "center",
                  color: e.surprise > 0 ? C.mint : e.surprise < 0 ? C.coral : C.smoke,
                  fontWeight: 700,
                }}>{e.surprise != null ? (e.surprise > 0 ? "+" : "") + e.surprise + "%" : "--"}</span>
              </div>
            ))}
          </>
        ) : (
          <EmptyState
            icon="📊"
            title="بيانات الأرباح غير متوفرة"
            subtitle="ستظهر تواريخ الإصدارات والمفاجآت عند توفر API"
          />
        )}
      </SectionCard>

      {/* التوزيعات */}
      <SectionCard title="التوزيعات النقدية" accent={C.mint}>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <ValCard label="عائد التوزيع" value={stk.divYld ? stk.divYld + "%" : null} color={C.mint}/>
            <ValCard label="آخر توزيع"    value={stk.lastDiv ? stk.lastDiv + " ر.س" : null} color={C.gold}/>
          </div>
          {dividends.length > 0 ? (
            <>
              <div style={{ fontSize: 10, color: C.smoke, marginBottom: 6, fontWeight: 700 }}>السجل التاريخي</div>
              {dividends.slice(0, 5).map((d, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 10px", marginBottom: 4,
                  background: C.mint + "08", borderRadius: 7,
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.mist, fontWeight: 700 }}>{d.date}</div>
                    {d.type && <Tag text={d.type} color={C.smoke}/>}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 12, fontWeight: 800, color: C.mint }}>
                      {d.div} ر.س
                    </div>
                    {d.yld && <div style={{ fontSize: 9, color: C.smoke }}>{d.yld}%</div>}
                  </div>
                </div>
              ))}
            </>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DupontPane -- تحليل دوبونت + جراهام + جودة الأرباح
═══════════════════════════════════════════════════════════════ */

function DupontPane({ stk }) {
  // متوسط القطاع (من أكبر 6 شركات، cache 3 أشهر)
  const { avg: sectorAvg, loading: sectorLoading } = useSectorAvg(stk.sym);

  // معادلة دوبونت: ROE = هامش صافي × دوران الأصول × رافعة مالية
  const dupont = useMemo(() => {
    if (!stk.roe || !stk.netMargin) return null;
    const netMargin = stk.netMargin / 100;
    const assetTurnover = stk.assetTurnover || (stk.roa && stk.netMargin ? stk.roa / stk.netMargin : null);
    const leverage = assetTurnover ? (stk.roe / 100) / (netMargin * assetTurnover) : null;
    return {
      netMargin: stk.netMargin,
      assetTurnover: assetTurnover ? assetTurnover.toFixed(2) : null,
      leverage: leverage ? leverage.toFixed(2) : null,
      roe: stk.roe,
    };
  }, [stk.roe, stk.netMargin, stk.roa, stk.assetTurnover]);

  // قواعد جراهام السبع
  const grahamCriteria = useMemo(() => [
    { label: "حجم كافي",          pass: stk.mc ? parseFloat(stk.mc) > 500 : null, val: stk.mc },
    { label: "وضع مالي قوي",      pass: stk.currentRatio ? stk.currentRatio >= 2 : null, val: stk.currentRatio?.toFixed(2) },
    { label: "أرباح مستقرة",      pass: stk.eps ? stk.eps > 0 : null, val: stk.eps ? "ربح" : "خسارة" },
    { label: "توزيعات مستمرة",    pass: stk.divYld ? stk.divYld > 0 : null, val: stk.divYld ? "نعم" : "لا" },
    { label: "نمو أرباح",         pass: stk.growthYoY ? stk.growthYoY > 3 : null, val: stk.growthYoY ? stk.growthYoY + "%" : null },
    { label: "P/E معقول",         pass: stk.pe ? stk.pe < 15 : null, val: stk.pe?.toFixed(1) },
    { label: "P/B معقول",         pass: stk.pb ? stk.pb < 1.5 : null, val: stk.pb?.toFixed(2) },
  ], [stk]);

  const grahamPassed = grahamCriteria.filter(c => c.pass === true).length;
  const grahamTotal = grahamCriteria.filter(c => c.pass != null).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* تحليل دوبونت */}
      <SectionCard title="تحليل دوبونت -- مصادر ROE" accent={C.plasma}>
        <div style={{ padding: "12px 14px" }}>
          {dupont ? (
            <>
              <div style={{
                padding: "10px",
                background: C.plasma + "10", border: `1px solid ${C.plasma}33`,
                borderRadius: 10, marginBottom: 10, textAlign: "center",
              }}>
                <div style={{ fontSize: 10, color: C.smoke, marginBottom: 4 }}>ROE الإجمالي</div>
                <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 22, fontWeight: 900, color: C.plasma }}>
                  {dupont.roe}%
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.smoke, textAlign: "center", marginBottom: 8 }}>
                = هامش صافي × دوران أصول × رافعة مالية
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <ValCard label="هامش صافي"   value={dupont.netMargin + "%"} color={C.mint}/>
                <ValCard label="دوران أصول" value={dupont.assetTurnover}    color={C.gold}/>
                <ValCard label="رافعة"        value={dupont.leverage}          color={C.coral}/>
              </div>
            </>
          ) : (
            <EmptyState
              icon="🔍"
              title="تحليل دوبونت غير متوفر"
              subtitle="يتطلب بيانات ROE وهامش صافي ودوران الأصول"
            />
          )}
        </div>
      </SectionCard>

      {/* معايير جراهام */}
      <SectionCard title="معايير جراهام السبع"
        accent={C.gold}
        badge={grahamTotal > 0 ? {
          text: `${grahamPassed}/${grahamTotal}`,
          color: grahamPassed >= 6 ? C.mint : grahamPassed >= 4 ? C.amber : C.coral,
        } : null}>
        <div style={{ padding: "8px 14px" }}>
          {grahamCriteria.map((c, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0",
              borderBottom: i < grahamCriteria.length - 1 ? `1px solid ${C.line}22` : 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: c.pass === true ? C.mint + "22" : c.pass === false ? C.coral + "22" : C.layer3,
                  border: `1px solid ${c.pass === true ? C.mint : c.pass === false ? C.coral : C.line}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: c.pass === true ? C.mint : c.pass === false ? C.coral : C.smoke,
                  fontWeight: 900,
                }}>
                  {c.pass === true ? "✓" : c.pass === false ? "✗" : "?"}
                </div>
                <span style={{ fontSize: 11, color: C.mist }}>{c.label}</span>
              </div>
              <span style={{
                fontFamily: "IBM Plex Mono,monospace", fontSize: 10,
                color: c.pass === true ? C.mint : c.pass === false ? C.coral : C.smoke,
                fontWeight: 700,
              }}>{c.val ?? "--"}</span>
            </div>
          ))}
        </div>
      </SectionCard>
      {/* جودة الأرباح */}
      <SectionCard title="جودة الأرباح" accent={C.teal}>
        <div style={{ padding: "10px 14px" }}>
          {sectorLoading && (
            <div style={{
              padding: "10px", fontSize: 10, color: C.teal,
              textAlign: "center", background: C.layer3, borderRadius: 8, marginBottom: 8,
            }}>
              جارٍ حساب متوسط القطاع (أول مرة)...
            </div>
          )}
          <SectorCompare
            label="هامش الربح"
            value={stk.netMargin}
            sectorAvg={sectorAvg?.netMargin}
          />
          <SectorCompare
            label="ROE"
            value={stk.roe}
            sectorAvg={sectorAvg?.roe}
          />
          <SectorCompare
            label="P/E (أقل أفضل)"
            value={stk.pe}
            sectorAvg={sectorAvg?.pe}
            isLowerBetter
          />
          {sectorAvg?.count && (
            <div style={{
              padding: "6px 10px", fontSize: 9, color: C.smoke,
              textAlign: "center", marginTop: 6,
            }}>
              المتوسط محسوب من {sectorAvg.count} شركات بالقطاع
            </div>
          )}
          {(!sectorAvg && !sectorLoading) && (
            <div style={{
              padding: "10px", fontSize: 10, color: C.smoke,
              textAlign: "center", background: C.layer3, borderRadius: 8, marginTop: 8,
            }}>
              مقارنات قطاعية ستظهر عند توفر متوسطات القطاع
            </div>
          )}
        </div>
      </SectionCard>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SDFundamental -- المكون الرئيسي مع 4 أقسام
═══════════════════════════════════════════════════════════════ */

function SDFundamental({ stk }) {
  const [pane, setPane] = useState("overview");

  const panes = [
    { id: "overview",    label: "نظرة عامة",   icon: "📋" },
    { id: "financials",  label: "مالية",        icon: "💰" },
    { id: "earnings",    label: "أرباح",        icon: "📊" },
    { id: "dupont",      label: "تحليل متقدم",  icon: "🔬" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* محدد القسم */}
      <div style={{ display: "flex", gap: 4, padding: 0, flexWrap: "wrap" }}>
        {panes.map(p => (
          <button key={p.id} onClick={() => { haptic(); setPane(p.id); }}
            style={{
              flex: 1, minWidth: 70,
              background: pane === p.id ? C.gold + "22" : C.layer3,
              border: `1px solid ${pane === p.id ? C.gold : C.line}`,
              borderRadius: 8, padding: "8px 4px",
              fontSize: 10, fontWeight: 700,
              color: pane === p.id ? C.gold : C.smoke,
              cursor: "pointer", fontFamily: "Cairo,sans-serif",
              display: "flex", flexDirection: "column", gap: 2, alignItems: "center",
            }}>
            <span style={{ fontSize: 14 }}>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {/* المحتوى */}
      {pane === "overview"   && <OverviewPane   stk={stk}/>}
      {pane === "financials" && <FinancialsPane stk={stk}/>}
      {pane === "earnings"   && <EarningsPane   stk={stk}/>}
      {pane === "dupont"     && <DupontPane     stk={stk}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FundamentalLoader
═══════════════════════════════════════════════════════════════ */

function FundamentalLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, [stk?.sym]);
  if (!show) return (
    <div style={{ borderRadius: 16, overflow: "hidden" }}>
      <SkeletonCard rows={5}/>
      <SkeletonCard rows={6}/>
    </div>
  );
  return <SDFundamental stk={stk}/>;
}

// ─── Exports ────────────────────────────────────────────────────
export {
  InfoTooltip,
  ValCard,
  SectorCompare,
  OverviewPane, FinancialsPane, EarningsPane, DupontPane,
  SDFundamental, FundamentalLoader,
};
