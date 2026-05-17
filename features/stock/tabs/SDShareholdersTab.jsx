'use client';
/**
 * @module features/stock/tabs/SDShareholdersTab
 * @description تبويب المساهمون والملكية
 *
 * ✨ نسخة منظفة:
 * - SHAREHOLDERS و INSIDER_TX من StockDetailShared (فارغة افتراضياً)
 * - أُزيلت 5 أحداث وهمية ثابتة من تغيرات الملكية → EmptyState
 * - أُزيلت بيانات LCG وهمية من تدفق المؤسسات → EmptyState
 * - الالتزام الشرعي: AI + sessionStorage cache (محتفظ به)
 */
import { useEffect, useMemo, useState } from 'react';
import { C, SkeletonCard, SectionCard, Tag, EmptyState, haptic, SHAREHOLDERS, INSIDER_TX } from './StockDetailShared';
import { InfoTooltip } from './SDFundamentalTab';

function ShareholdersLoader({ stk }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 160);
    return () => clearTimeout(t);
  }, [stk?.sym]);
  if (!show) return (
    <div style={{ borderRadius: 16, overflow: "hidden", padding: "14px 16px" }}>
      <SkeletonCard rows={4}/>
      <SkeletonCard rows={5}/>
    </div>
  );
  return <SDShareholders stk={stk}/>;
}

function SDShareholders({ stk }) {
  const shs = SHAREHOLDERS[stk.sym] || SHAREHOLDERS.default;
  const txs = INSIDER_TX[stk.sym] || INSIDER_TX.default;
  const CACHE_KEY = `shariah_${stk.sym}`;

  const loadCache = () => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > 30 * 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      return obj;
    } catch { return null; }
  };

  const [shStatus, setShStatus] = useState(() => {
    const cached = loadCache();
    if (cached) return { loading: false, ...cached, source_type: "cache" };
    return {
      loading: false,
      halal: null,
      status: "--",
      reason: "",
      details: "",
      source: "",
      date: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
      source_type: "pending",
    };
  });

  const checkShariah = async () => {
    setShStatus(s => ({ ...s, loading: true }));
    try {
      const mY = `${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
      const prompt = 'أنت خبير شرعي متخصص. قيّم سهم ' + stk.name + ' (' + stk.sym + ') في القطاع: ' + (stk.sec || "--") + ' للشهر ' + mY + '.\n\nالبيانات المالية:\n- نسبة الدين/الأصول: ' + (stk.debtEquity || "غير متوفر") + '\n- هامش الربح: ' + (stk.netMargin || "غير متوفر") + '%\n- قطاع النشاط: ' + (stk.industry || stk.sec || "--") + '\n\nالمعايير الشرعية:\n1. نسبة الدين/إجمالي الأصول < 33%\n2. الذمم المدينة/إجمالي الأصول < 45%\n3. الإيرادات من الأنشطة المحرمة < 5%\n4. طبيعة النشاط الأساسي\n\nأجب بـ JSON فقط:\n{"halal":true أو false,"status":"متوافق مع الشريعة" أو "يحتاج تطهير" أو "غير متوافق","reason":"سبب محدد","details":"تحليل شرعي تفصيلي 3-4 أسطر","purification":نسبة أو null,"source":"AAOIFI / IFSB / هيئة الرقابة الشرعية","date":"' + mY + '"}';
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const parsed = JSON.parse((data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim());
      const result = { loading: false, ...parsed, ts: Date.now(), source_type: "ai" };
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch {}
      setShStatus(result);
    } catch {
      setShStatus(s => ({ ...s, loading: false, error: "تعذّر جلب التقرير" }));
    }
  };

  // لا نجلب تلقائياً بعد الآن -- المستخدم يضغط الزر
  // useEffect(() => { if(!loadCache()) checkShariah(); }, [stk.sym]);

  const sC = shStatus.halal === true ? C.mint : shStatus.halal === false ? C.coral : C.amber;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* هيكل الملكية */}
      <SectionCard title="هيكل الملكية" accent={C.gold}>
        {shs.length > 0 ? (
          <div style={{ padding: "14px 16px" }}>
            {/* Pie Chart */}
            {(() => {
              const COLORS = [C.electric, C.gold, C.plasma, C.mint, C.teal, C.amber];
              const R = 58, CX = 72, CY = 72, total = shs.reduce((a, s) => a + s.pct, 0) || 100;
              let startAngle = -Math.PI / 2;
              const slices = shs.map((sh, i) => {
                const angle = (sh.pct / total) * 2 * Math.PI;
                const x1 = CX + R * Math.cos(startAngle), y1 = CY + R * Math.sin(startAngle);
                startAngle += angle;
                const x2 = CX + R * Math.cos(startAngle), y2 = CY + R * Math.sin(startAngle);
                const large = angle > Math.PI ? 1 : 0;
                return {
                  path: `M${CX},${CY} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`,
                  col: COLORS[i % COLORS.length],
                  ...sh,
                };
              });
              return (
                <div style={{ display: "flex", gap: 16, marginBottom: 14, alignItems: "center" }}>
                  <svg width={144} height={144} viewBox="0 0 144 144" style={{ flexShrink: 0 }}>
                    <circle cx={CX} cy={CY} r={R + 2} fill={C.layer3}/>
                    {slices.map((s, i) => <path key={i} d={s.path} fill={s.col} opacity="0.9"/>)}
                    <circle cx={CX} cy={CY} r={R * 0.42} fill={C.ink}/>
                    <text x={CX} y={CY - 6} textAnchor="middle" fill={C.snow} fontSize="10" fontWeight="800">{stk.name?.split(" ")[0]}</text>
                    <text x={CX} y={CY + 8} textAnchor="middle" fill={C.smoke} fontSize="9" fontFamily="IBM Plex Mono,monospace">{stk.sym}</text>
                  </svg>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {slices.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: s.col, flexShrink: 0 }}/>
                          <span style={{ fontSize: 10, color: C.smoke }}>{s.n?.length > 16 ? s.n.slice(0, 16) + "…" : s.n}</span>
                        </div>
                        <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 700, color: s.col }}>{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 11 }}>
              <span style={{ color: C.smoke }}>الأسهم الحرة: <span style={{ color: C.mint, fontFamily: "IBM Plex Mono,monospace", fontWeight: 700 }}>{stk.floatPct ? stk.floatPct + "%" : "--"}</span></span>
              <span style={{ color: C.smoke }}>عدد الملاك: <span style={{ color: C.mist, fontFamily: "IBM Plex Mono,monospace", fontWeight: 700 }}>{shs.length}</span></span>
            </div>

            {shs.map((sh, i) => (
              <div key={i} style={{ marginBottom: i < shs.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div>
                    <span style={{ fontSize: 12, color: C.mist, fontWeight: 600 }}>{sh.n}</span>
                    <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                      {sh.type && <Tag text={sh.type} color={C.electric}/>}
                      {sh.since && <span style={{ fontSize: 11, color: C.smoke }}>منذ {sh.since}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {sh.ch !== 0 && sh.ch != null && (
                      <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, color: sh.ch > 0 ? C.mint : C.coral, fontWeight: 700 }}>
                        {sh.ch > 0 ? "+" : ""}{sh.ch}%
                      </span>
                    )}
                    <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 14, fontWeight: 900, color: C.snow }}>{sh.pct}%</span>
                  </div>
                </div>
                <div style={{ height: 5, background: C.layer3, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${sh.pct}%`, background: `linear-gradient(90deg,${C.electric},${C.gold})`, borderRadius: 3 }}/>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="👥"
            title="بيانات الملكية غير متوفرة"
            subtitle="ستظهر هيكل الملكية ونسب كبار الملاك عند توفر البيانات من API"
          />
        )}
      </SectionCard>

      {/* تغيرات الملكية */}
      <SectionCard title="تغيرات الملكية" accent={C.smoke}>
        <EmptyState
          icon="📅"
          title="سجل التغيرات غير متوفر"
          subtitle="ستظهر تغيرات الملكية في آخر 12 شهراً عند توفر API"
        />
      </SectionCard>

      {/* تدفق المؤسسات */}
      <SectionCard title="تدفق المؤسسات" accent={C.plasma}>
        <EmptyState
          icon="🏦"
          title="بيانات التدفق المؤسسي غير متوفرة"
          subtitle="ستظهر إحصائيات شراء وبيع المؤسسات الفصلية عند توفر API"
        />
      </SectionCard>

      {/* Concentration Ratio */}
      {shs.length > 0 && (() => {
        const top1 = shs[0]?.pct || 0;
        const top3 = shs.slice(0, 3).reduce((a, s) => a + s.pct, 0);
        const top5 = shs.slice(0, 5).reduce((a, s) => a + s.pct, 0);
        const hhi = shs.reduce((a, s) => a + Math.pow(s.pct / 100, 2), 0);
        const concC = top3 > 70 ? C.amber : top3 > 50 ? C.electric : C.mint;
        return (
          <SectionCard title="تركز الملكية" accent={concC}>
            <div style={{ padding: "10px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[
                  { l: "أكبر مالك", v: top1.toFixed(1) + "%", c: top1 > 50 ? C.coral : C.mint },
                  { l: "أكبر 3", v: top3.toFixed(1) + "%", c: top3 > 70 ? C.amber : C.mint },
                  { l: "أكبر 5", v: top5.toFixed(1) + "%", c: top5 > 80 ? C.amber : C.mint },
                  { l: "HHI", v: hhi.toFixed(3), c: hhi > 0.25 ? C.coral : hhi > 0.15 ? C.amber : C.mint },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: item.c + "10", borderRadius: 8,
                    padding: "7px 4px", textAlign: "center", border: `1px solid ${item.c}22`,
                  }}>
                    <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, fontWeight: 800, color: item.c }}>{item.v}</div>
                    <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>{item.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.smoke, lineHeight: 1.6, background: C.layer3, borderRadius: 8, padding: "6px 10px" }}>
                {top3 > 70 ? `تركز عال -- أكبر 3 ملاك يسيطرون على ${top3.toFixed(0)}%` :
                 top3 > 50 ? "تركز متوسط -- ملكية شبه متوازنة" :
                 "تنوع جيد -- توزيع الملكية يقلل المخاطر"}
              </div>
            </div>
          </SectionCard>
        );
      })()}

      {/* Smart Money vs Retail */}
      {shs.length > 0 && (
        <SectionCard title="الأموال الذكية vs التجزئة" accent={C.teal}>
          <div style={{ padding: "10px 16px" }}>
            {(() => {
              const institutional = shs.filter(s => s.type === "مؤسسي" || s.type === "حكومي").reduce((a, s) => a + s.pct, 0);
              const smartC = institutional > 70 ? C.electric : institutional > 50 ? C.mint : C.amber;
              return (
                <>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {[
                      { l: "مؤسسي/حكومي", v: institutional.toFixed(1) + "%", c: C.electric },
                      { l: "تجزئة", v: stk.floatPct ? stk.floatPct + "%" : "--", c: C.mint },
                      { l: "قوة الأموال الذكية", v: institutional > 60 ? "عالية" : institutional > 40 ? "متوسطة" : "منخفضة", c: smartC },
                    ].map((item, i) => (
                      <div key={i} style={{
                        flex: 1, background: item.c + "10", borderRadius: 9,
                        padding: "8px 6px", textAlign: "center", border: `1px solid ${item.c}22`,
                      }}>
                        <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 12, fontWeight: 800, color: item.c }}>{item.v}</div>
                        <div style={{ fontSize: 9, color: C.smoke, marginTop: 4 }}>{item.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: C.smoke, lineHeight: 1.6, background: C.layer3, borderRadius: 8, padding: "7px 10px" }}>
                    💡 الأموال الذكية ({institutional.toFixed(1)}%) تشمل المؤسسات والصناديق والحكومة
                  </div>
                </>
              );
            })()}
          </div>
        </SectionCard>
      )}

      {/* معاملات المطلعين */}
      <SectionCard title="معاملات المطلعين" accent={C.plasma}>
        {txs.length > 0 ? (
          <>
            <div style={{ padding: "8px 16px 4px", fontSize: 11, color: C.smoke }}>آخر 12 شهراً</div>
            {txs.map((tx, i) => (
              <div key={i} style={{
                padding: "11px 16px",
                borderBottom: i < txs.length - 1 ? `1px solid ${C.line}22` : 0,
                background: i % 2 ? "rgba(255,255,255,.015)" : "transparent",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: C.mist, fontWeight: 600 }}>{tx.name}</div>
                    <div style={{ fontSize: 11, color: C.smoke }}>
                      {tx.date} · {tx.shares?.toLocaleString("en-US")} سهم بـ {tx.price} ر.س
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <Tag text={tx.action} color={tx.action === "شراء" ? C.mint : C.coral}/>
                    <span style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 11, color: tx.action === "شراء" ? C.mint : C.coral, fontWeight: 700 }}>{tx.value} ر.س</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <EmptyState
            icon="📋"
            title="معاملات المطلعين غير متوفرة"
            subtitle="ستظهر معاملات شراء وبيع المطلعين عند توفر بيانات الإفصاحات"
          />
        )}
      </SectionCard>

      {/* الالتزام الشرعي */}
      <SectionCard title="الالتزام الشرعي" accent={sC}>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.smoke, textTransform: "uppercase", letterSpacing: "0.6px" }}>الالتزام الشرعي</span>
                {shStatus.date && (
                  <span style={{ fontSize: 11, color: C.smoke, background: C.layer3, padding: "1px 6px", borderRadius: 6, border: `1px solid ${C.line}` }}>{shStatus.date}</span>
                )}
                {shStatus.source_type === "ai" && <Tag text="AI" color={C.electric}/>}
                {shStatus.source_type === "cache" && <Tag text="مخزن" color={C.gold}/>}
              </div>
              {shStatus.loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <div style={{ width: 14, height: 14, border: `2px solid ${C.electric}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                  <span style={{ fontSize: 11, color: C.smoke }}>جارٍ التحقق...</span>
                </div>
              ) : (
                <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 14, fontWeight: 900, color: sC, textShadow: `0 0 8px ${sC}55`, marginTop: 2 }}>
                  {shStatus.status}
                </div>
              )}
              {shStatus.reason && !shStatus.loading && (
                <div style={{ fontSize: 11, color: C.smoke, marginTop: 4 }}>{shStatus.reason}</div>
              )}
              {shStatus.purification != null && !shStatus.loading && (
                <div style={{ marginTop: 6, fontSize: 11, color: C.amber, background: C.amber + "10", borderRadius: 6, padding: "4px 10px", border: `1px solid ${C.amber}22` }}>
                  نسبة التطهير: {shStatus.purification}% من الدخل الاستثماري
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginLeft: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22,
                background: sC + "18", border: `1px solid ${sC}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, color: sC, fontWeight: 900,
                textShadow: `0 0 10px ${sC}66`,
              }}>
                {shStatus.loading ? "…" : shStatus.halal === true ? "✓" : shStatus.halal === false ? "✗" : "?"}
              </div>
              <button onClick={() => { haptic(); checkShariah(); }} disabled={shStatus.loading} style={{
                background: "transparent", border: `1px solid ${C.line}`,
                color: C.smoke, fontSize: 11, padding: "8px 14px",
                borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap",
                fontFamily: "Cairo,sans-serif", minHeight: 44,
              }}>{shStatus.source_type === "pending" ? "تحقق AI" : "تحديث AI"}</button>
            </div>
          </div>
          {shStatus.details && !shStatus.loading && (
            <div style={{ background: sC + "10", borderRadius: 10, padding: "10px 12px", border: `1px solid ${sC}25`, marginTop: 12 }}>
              <div style={{ fontSize: 11, color: sC, fontWeight: 700, marginBottom: 4 }}>الحكم الشرعي التفصيلي</div>
              <div style={{ fontSize: 11, color: C.mist, lineHeight: 1.7 }}>{shStatus.details}</div>
              {shStatus.source && (
                <div style={{ fontSize: 11, color: C.smoke, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${sC}22` }}>
                  المرجع: {shStatus.source}
                </div>
              )}
            </div>
          )}
          {shStatus.error && (
            <div style={{ fontSize: 11, color: C.coral, marginTop: 4 }}>{shStatus.error}</div>
          )}
        </div>
      </SectionCard>

      {/* تحليل اتجاه المطلعين */}
      {txs.length > 0 && (() => {
        const buyTxs = txs.filter(t => t.action === "شراء");
        const sellTxs = txs.filter(t => t.action === "بيع");
        const buyVal = buyTxs.reduce((a, t) => a + parseFloat((t.value || "0").toString().replace(/[^0-9.]/g, "") || 0), 0);
        const sellVal = sellTxs.reduce((a, t) => a + parseFloat((t.value || "0").toString().replace(/[^0-9.]/g, "") || 0), 0);
        const total = buyVal + sellVal || 1;
        const insiderC = buyVal >= sellVal ? C.mint : C.coral;
        return (
          <SectionCard title="تحليل اتجاه المطلعين" accent={insiderC}>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                {[
                  { l: "صفقات شراء", v: buyTxs.length, c: C.mint },
                  { l: "صفقات بيع", v: sellTxs.length, c: C.coral },
                  { l: "الاتجاه", v: buyVal >= sellVal ? "تراكم" : "توزيع", c: insiderC },
                ].map((item, i) => (
                  <div key={i} style={{
                    background: item.c + "12", borderRadius: 8,
                    padding: "8px 6px", textAlign: "center", border: `1px solid ${item.c}25`,
                  }}>
                    <div style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: 14, fontWeight: 900, color: item.c }}>{item.v}</div>
                    <div style={{ fontSize: 9, color: C.smoke, marginTop: 2 }}>{item.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: C.mint }}>شراء {(buyVal / total * 100).toFixed(0)}%</span>
                  <span style={{ color: C.coral }}>بيع {(sellVal / total * 100).toFixed(0)}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, overflow: "hidden", background: C.coral, direction: "ltr" }}>
                  <div style={{ height: "100%", width: `${(buyVal / total * 100).toFixed(0)}%`, background: C.mint, borderRadius: "4px 0 0 4px" }}/>
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.smoke, lineHeight: 1.6, padding: "6px 10px", background: C.layer3, borderRadius: 8 }}>
                {buyVal >= sellVal ? "المطلعون يشترون أكثر -- إشارة ثقة" : "المطلعون يبيعون أكثر -- قد يكون توقعاً بتراجع"}
              </div>
            </div>
          </SectionCard>
        );
      })()}
    </div>
  );
}

export { ShareholdersLoader, SDShareholders };
