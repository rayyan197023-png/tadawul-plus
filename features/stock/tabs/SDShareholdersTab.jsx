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


      {/* الأسهم الحرة vs المقيدة */}
      {stk.floatPct != null && stk.sharesOut != null && (
        <SectionCard title="هيكل الأسهم" accent={C.electric}>
          <div style={{ padding:"12px 16px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              {[
                { l:"الأسهم الحرة",    v:stk.floatPct+"%",                                                          c:C.mint },
                { l:"الأسهم المقيدة",  v:(100-stk.floatPct).toFixed(1)+"%",                                        c:C.amber },
                { l:"إجمالي الأسهم",   v:(stk.sharesOut/1e9).toFixed(2)+"B",                                       c:C.electric },
                { l:"القيمة السوقية",  v:stk.mc || "--",                                                            c:C.gold },
              ].map((item,i) => (
                <div key={i} style={{ background:item.c+"10", borderRadius:9, padding:"10px", textAlign:"center", border:`1px solid ${item.c}22` }}>
                  <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:13, fontWeight:900, color:item.c }}>{item.v}</div>
                  <div style={{ fontSize:9, color:C.smoke, marginTop:3 }}>{item.l}</div>
                </div>
              ))}
            </div>
            <div style={{ height:8, borderRadius:4, overflow:"hidden", background:C.amber+"44" }}>
              <div style={{ height:"100%", width:`${stk.floatPct}%`, background:C.mint, borderRadius:"4px 0 0 4px" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:9, color:C.smoke }}>
              <span style={{ color:C.mint }}>حرة {stk.floatPct}%</span>
              <span style={{ color:C.amber }}>مقيدة {(100-stk.floatPct).toFixed(1)}%</span>
            </div>
          </div>
        </SectionCard>
      )}

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
