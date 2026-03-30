
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ── Supabase config (inline, no external import) ── */
const SUPABASE_URL = "https://kdgqncnmaifrmohjoemc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZ3FuY25tYWlmcm1vaGpvZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODgxMTYsImV4cCI6MjA5MDQ2NDExNn0.RMWuQlFEFsFZe0EXGmmF4TlUtVcm5PWMlRYxT_Lmp0I";

const sbFetch = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
};

const getUserId = () => {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem("tle_user_id");
  if (!id) { id = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem("tle_user_id", id); }
  return id;
};

const db = {
  async pull(userId) {
    try {
      return await sbFetch(`/learning_records?user_id=eq.${userId}&order=created_at.desc`);
    } catch { return null; }
  },
  async save(userId, record) {
    try {
      await sbFetch("/learning_records", {
        method: "POST",
        body: JSON.stringify({ ...record, user_id: userId }),
      });
    } catch (e) { console.error("save:", e); }
  },
  async update(userId, id, data) {
    try {
      await sbFetch(`/learning_records?id=eq.${id}&user_id=eq.${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } catch (e) { console.error("update:", e); }
  },
  async remove(userId, id) {
    try {
      await sbFetch(`/learning_records?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE" });
    } catch (e) { console.error("delete:", e); }
  },
};

/* ── palette ── */
const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#16202e", layer2:"#1c2640", layer3:"#222d4a",
  edge:"#2a3858", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878", goldD:"#c09030",
  electric:"#4d9fff", mint:"#1ee68a", coral:"#ff5f6a",
  amber:"#fbbf24", teal:"#22d3ee", plasma:"#a78bfa",
  violet:"#7c3aed",
};

const ERROR_PATTERNS = [
  { id:"overconfident", label:"مبالغة ثقة" },
  { id:"no_downside", label:"تجاهل المخاطر" },
  { id:"sector_blindspot", label:"عمى القطاع" },
  { id:"price_anchoring", label:"تثبيت السعر" },
  { id:"momentum_bias", label:"تحيز الزخم" },
  { id:"macro_ignored", label:"إهمال الكلي" },
  { id:"shallow_moat", label:"Moat سطحي" },
  { id:"fcf_mismatch", label:"تناقض FCF" },
  { id:"volume_ignored", label:"تجاهل الحجم" },
  { id:"timing_wrong", label:"خطأ التوقيت" },
];

const fmtDate = (ts) => new Date(ts).toLocaleDateString("ar-SA", { day:"numeric", month:"short" });
const calcAccuracy = (records) => {
  const ev = records.filter(r => r.outcome);
  if (!ev.length) return null;
  return Math.round((ev.filter(r => r.outcome === "correct").length / ev.length) * 100);
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ── Icons ── */
const I = {
  Brain: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
  Chart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  List: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  Sync: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>,
  Warn: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Globe: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

/* ── Gauge ── */
function Gauge({ value }) {
  const color = value >= 75 ? C.mint : value >= 55 ? C.amber : C.coral;
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{ position:"relative", width:88, height:88, margin:"0 auto 6px" }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke={C.edge} strokeWidth="7"/>
          <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${2.262 * value} 226`} strokeLinecap="round"
            transform="rotate(-90 44 44)" style={{ transition:"stroke-dasharray 1s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:20, fontWeight:900, color, letterSpacing:"-1px" }}>{value}%</span>
        </div>
      </div>
      <div style={{ fontSize:9, color, fontWeight:700 }}>
        {value >= 75 ? "دقة عالية" : value >= 55 ? "متوسطة" : "تحتاج تحسين"}
      </div>
    </div>
  );
}

/* ── Stat ── */
function Stat({ label, value, color, icon: Icon }) {
  return (
    <div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px solid ${color}25`, borderRadius:10, padding:"10px 12px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <span style={{ fontSize:9, color:C.ash }}>{label}</span>
        <span style={{ color }}><Icon /></span>
      </div>
      <div style={{ fontSize:20, fontWeight:900, color, letterSpacing:"-0.5px" }}>{value}</div>
    </div>
  );
}

/* ── Record Card ── */
function RecordCard({ record, onEvaluate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [outcome, setOutcome] = useState("");
  const [patterns, setPatterns] = useState([]);
  const [saving, setSaving] = useState(false);
  const days = Math.floor((Date.now() - record.createdAt) / 86400000);
  const isDue = (record.actualPrice30 === null && days >= 30) || (record.actualPrice90 === null && days >= 90);
  const oc = { correct:C.mint, partial:C.amber, wrong:C.coral }[record.outcome] || C.ash;
  const rc = record.recommendation === "buy" ? C.mint : record.recommendation === "sell" ? C.coral : C.amber;

  const save = async () => {
    if (!outcome) return;
    setSaving(true);
    await onEvaluate(record.id, price, outcome, patterns, days);
    setSaving(false);
    setOpen(false);
  };

  return (
    <div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px solid ${isDue ? C.amber+"50" : record.outcome ? oc+"35" : C.edge}`, borderRadius:12, overflow:"hidden", marginBottom:8, boxShadow: isDue ? `0 0 10px ${C.amber}15` : "none" }}>
      <div style={{ padding:"10px 12px", display:"flex", alignItems:"center", gap:8, cursor:"pointer" }} onClick={() => setOpen(e => !e)}>
        <div style={{ width:34, height:34, borderRadius:9, background:`${rc}18`, border:`1px solid ${rc}30`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontSize:9, fontWeight:900, color:rc }}>{record.sym}</span>
          <span style={{ fontSize:7, color:C.smoke }}>{record.recommendation === "buy" ? "شراء" : record.recommendation === "sell" ? "بيع" : "احتفاظ"}</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.snow }}>{record.name}</span>
            {isDue && <span style={{ fontSize:8, color:C.amber, background:`${C.amber}18`, padding:"1px 5px", borderRadius:4 }}>للتقييم</span>}
            {record.outcome && <span style={{ fontSize:8, color:oc, background:`${oc}18`, padding:"1px 5px", borderRadius:4 }}>{record.outcome === "correct" ? "صحيح" : record.outcome === "wrong" ? "خاطئ" : "جزئي"}</span>}
          </div>
          <div style={{ fontSize:9, color:C.smoke }}>{record.typeLabel} · {fmtDate(record.createdAt)}</div>
        </div>
        <div style={{ textAlign:"left", flexShrink:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.snow }}>{record.currentPrice || "—"}</div>
          {record.targetPrice && <div style={{ fontSize:9, color:rc }}>هدف: {record.targetPrice}</div>}
        </div>
      </div>

      {open && (
        <div style={{ borderTop:`1px solid ${C.edge}`, padding:"10px 12px" }}>
          {record.errorPatterns?.length > 0 && (
            <div style={{ marginBottom:8, display:"flex", flexWrap:"wrap", gap:4 }}>
              {record.errorPatterns.map(p => {
                const ep = ERROR_PATTERNS.find(e => e.id === p);
                return <span key={p} style={{ fontSize:9, color:C.coral, background:`${C.coral}15`, padding:"2px 6px", borderRadius:4 }}>{ep?.label || p}</span>;
              })}
            </div>
          )}
          {(!record.outcome || isDue) && (
            <div style={{ background:C.void, borderRadius:8, padding:"10px" }}>
              <div style={{ fontSize:10, color:C.amber, fontWeight:700, marginBottom:8 }}>تقييم النتيجة ({days} يوم)</div>
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                <input value={price} onChange={e => setPrice(e.target.value)} placeholder="السعر الحالي"
                  style={{ flex:1, background:C.layer2, border:`1px solid ${C.line}`, borderRadius:7, padding:"6px 8px", color:C.snow, fontSize:11, fontFamily:"Cairo,sans-serif" }} />
                {[["correct","صحيح",C.mint],["partial","جزئي",C.amber],["wrong","خاطئ",C.coral]].map(([v,l,c]) => (
                  <button key={v} onClick={() => setOutcome(v)} style={{ padding:"6px 8px", borderRadius:6, cursor:"pointer", fontSize:10, fontWeight:700, background: outcome===v ? `${c}25` : C.layer3, border:`1px solid ${outcome===v ? c+"60" : C.edge}`, color: outcome===v ? c : C.smoke }}>{l}</button>
                ))}
              </div>
              {(outcome === "wrong" || outcome === "partial") && (
                <div style={{ marginBottom:8, display:"flex", flexWrap:"wrap", gap:4 }}>
                  {ERROR_PATTERNS.map(p => (
                    <button key={p.id} onClick={() => setPatterns(prev => prev.includes(p.id) ? prev.filter(x=>x!==p.id) : [...prev,p.id])}
                      style={{ padding:"3px 7px", borderRadius:4, cursor:"pointer", fontSize:9, background: patterns.includes(p.id) ? `${C.coral}20` : C.layer3, border:`1px solid ${patterns.includes(p.id) ? C.coral+"50" : C.edge}`, color: patterns.includes(p.id) ? C.coral : C.smoke }}>{p.label}</button>
                  ))}
                </div>
              )}
              <button onClick={save} disabled={!outcome || saving} style={{ width:"100%", padding:"8px", borderRadius:8, cursor: outcome && !saving ? "pointer" : "not-allowed", background: outcome ? `linear-gradient(135deg,${C.gold}30,${C.gold}15)` : C.layer3, border:`1px solid ${outcome ? C.gold+"50" : C.edge}`, color: outcome ? C.gold : C.ash, fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                {saving ? <div style={{ width:12, height:12, borderRadius:"50%", border:"2px solid transparent", borderTopColor:C.gold, animation:"spin 0.8s linear infinite" }} /> : "حفظ التقييم"}
              </button>
            </div>
          )}
          <button onClick={() => onDelete(record.id)} style={{ marginTop:8, padding:"4px 10px", background:"none", border:`1px solid ${C.coral}30`, borderRadius:6, cursor:"pointer", fontSize:9, color:C.coral }}>حذف</button>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MAIN
================================================================ */
export default function AILearningEngine() {
  const [tab, setTab] = useState("dashboard");
  const [records, setRecords] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [newRec, setNewRec] = useState({ sym:"", name:"", type:"fundamental_combined", rec:"buy", target:"", current:"", text:"" });
  const abortRef = useRef(null);
  const userId = typeof window !== "undefined" ? getUserId() : null;

  /* Load from Supabase on mount */
  useEffect(() => {
    if (!userId) return;
    setSyncing(true);
    db.pull(userId).then(cloud => {
      if (cloud && cloud.length > 0) {
        setRecords(cloud.map(r => ({ ...r, createdAt: new Date(r.created_at).getTime() })));
        setSyncStatus("ok");
      } else {
        try {
          const local = JSON.parse(localStorage.getItem("tle_records_v1") || "[]");
          setRecords(local);
          if (local.length > 0) {
            Promise.all(local.map(r => db.save(userId, r))).then(() => setSyncStatus("ok"));
          }
        } catch {}
      }
      setSyncing(false);
    }).catch(() => {
      try { setRecords(JSON.parse(localStorage.getItem("tle_records_v1") || "[]")); } catch {}
      setSyncing(false);
      setSyncStatus("error");
    });
  }, [userId]);

  /* Always persist locally */
  useEffect(() => {
    localStorage.setItem("tle_records_v1", JSON.stringify(records));
  }, [records]);

  /* Stats */
  const evaluated = records.filter(r => r.outcome);
  const acc = calcAccuracy(records);
  const due = records.filter(r => {
    const d = Math.floor((Date.now() - r.createdAt) / 86400000);
    return (r.actualPrice30 === null && d >= 30) || (r.actualPrice90 === null && d >= 90);
  }).length;
  const errFreq = {};
  records.forEach(r => r.errorPatterns?.forEach(p => { errFreq[p] = (errFreq[p]||0)+1; }));
  const topErr = Object.entries(errFreq).sort((a,b)=>b[1]-a[1])[0];

  /* Add */
  const addRecord = async () => {
    if (!newRec.sym || !newRec.name) return;
    const r = {
      id: newId(),
      sym: newRec.sym.toUpperCase(),
      name: newRec.name,
      type: newRec.type,
      typeLabel: newRec.type,
      recommendation: newRec.rec,
      targetPrice: newRec.target ? parseFloat(newRec.target) : null,
      currentPrice: newRec.current ? parseFloat(newRec.current) : null,
      analysisText: newRec.text,
      createdAt: Date.now(),
      outcome: null,
      actualPrice30: null,
      actualPrice90: null,
      actualPrice180: null,
      errorPatterns: [],
    };
    setRecords(prev => [r, ...prev]);
    setNewRec({ sym:"", name:"", type:"fundamental_combined", rec:"buy", target:"", current:"", text:"" });
    if (userId) db.save(userId, r).catch(console.error);
  };

  /* Evaluate */
  const evaluateRecord = async (id, actualPrice, outcome, patterns, days) => {
    setRecords(prev => prev.map(r => {
      if (r.id !== id) return r;
      return { ...r, outcome, errorPatterns: patterns,
        actualPrice30: days >= 30 ? parseFloat(actualPrice) || r.actualPrice30 : r.actualPrice30,
        actualPrice90: days >= 90 ? parseFloat(actualPrice) || r.actualPrice90 : r.actualPrice90,
      };
    }));
    if (userId) db.update(userId, id, { outcome, errorPatterns: patterns, actualPrice30: parseFloat(actualPrice) }).catch(console.error);
  };

  /* Delete */
  const deleteRecord = (id) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    if (userId) db.remove(userId, id).catch(console.error);
  };

  /* AI self-analysis */
  const runAnalysis = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setAnalysis("");
    const errorList = Object.entries(errFreq).sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([id,n]) => `${ERROR_PATTERNS.find(p=>p.id===id)?.label||id}: ${n} مرة`);
    const prompt = `أنت نظام تحسين ذاتي لمحلل AI متخصص في السوق السعودي
== بيانات الأداء ==
إجمالي التحليلات: ${records.length}
المقيَّمة: ${evaluated.length}
الدقة الكلية: ${acc !== null ? acc + "%" : "غير محددة"}
صحيحة: ${evaluated.filter(r=>r.outcome==="correct").length} | خاطئة: ${evaluated.filter(r=>r.outcome==="wrong").length}
== أنماط الأخطاء ==
${errorList.length ? errorList.join("\n") : "لا توجد بيانات كافية"}
== آخر 3 تحليلات مقيَّمة ==
${evaluated.slice(-3).map(r => `${r.name}(${r.sym}): ${r.outcome} | أخطاء: ${r.errorPatterns?.join(", ")||"لا"}`).join("\n")}
اكتب تحليلاً ذاتياً دقيقاً يشمل:
1. **تشخيص الأنماط** — ما المتكرر ولماذا؟
2. **جذر المشكلة** — السبب الحقيقي
3. **تحسينات الـ Prompts** — 3 تعليمات إضافية محددة
4. **قواعد التحقق** — 5 قواعد صارمة قبل أي توصية
5. **خطة التحسين** — 3 خطوات للـ 30 يوم القادمة`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          stream: true,
          system: "أنت نظام تحسين ذاتي متخصص. أسلوبك تقني ودقيق وصريح تماماً. لا تجامل.",
          messages: [{ role:"user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "", buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream:true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") continue;
          try { const t = JSON.parse(raw)?.delta?.text||""; if(t){full+=t;setAnalysis(full);} } catch {}
        }
      }
    } catch(e) {
      if (e.name !== "AbortError") setAnalysis("خطأ: " + e.message);
    } finally { setLoading(false); }
  }, [records]);

  /* ── RENDER ── */
  return (
    <div style={{ minHeight:"100vh", background:C.ink, direction:"rtl", fontFamily:"Cairo,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.95)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing:border-box; margin:0; padding:0; }
        button,input,textarea { font-family:inherit; }
        ::-webkit-scrollbar { width:3px; } ::-webkit-scrollbar-thumb { background:${C.edge}; border-radius:3px; }
        input::placeholder,textarea::placeholder { color:${C.ash}; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding:"14px 16px 12px", background:`linear-gradient(160deg,${C.layer2},${C.deep})`, borderBottom:`1px solid ${C.line}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`${C.violet}20`, border:`1px solid ${C.violet}50`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 20px ${C.violet}25` }}>
              <I.Brain />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:900, color:C.snow }}>محرك التعلم الذاتي</div>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                {syncing
                  ? <><div style={{ width:10, height:10, borderRadius:"50%", border:"1.5px solid transparent", borderTopColor:C.electric, animation:"spin 0.8s linear infinite" }} /><span style={{ fontSize:9, color:C.smoke }}>مزامنة...</span></>
                  : syncStatus === "ok"
                  ? <><div style={{ width:5, height:5, borderRadius:"50%", background:C.mint }} /><span style={{ fontSize:9, color:C.mint }}>متزامن</span></>
                  : syncStatus === "error"
                  ? <><span style={{ color:C.coral }}><I.Warn /></span><span style={{ fontSize:9, color:C.coral }}>خطأ في المزامنة</span></>
                  : <span style={{ fontSize:9, color:C.ash }}>جاري التحميل...</span>
                }
              </div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
            {due > 0 && (
              <div style={{ background:`${C.amber}18`, border:`1px solid ${C.amber}40`, borderRadius:8, padding:"3px 9px", fontSize:9, fontWeight:700, color:C.amber }}>{due} للتقييم</div>
            )}
            <div style={{ fontSize:9, color:C.ash }}>{records.length} سجل</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.line}`, background:C.deep }}>
        {[
          { id:"dashboard", label:"الرئيسية", Icon:I.Chart },
          { id:"records", label:"السجلات", Icon:I.List },
          { id:"add", label:"إضافة", Icon:I.Plus },
          { id:"insights", label:"التحليل", Icon:I.Brain },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"10px 4px", display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", borderBottom:`2px solid ${tab===t.id ? C.gold : "transparent"}`, color: tab===t.id ? C.gold : C.ash, fontSize:9, fontWeight: tab===t.id ? 700 : 400, transition:"all .15s" }}>
            <t.Icon />
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:"14px 14px 100px" }}>
        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div style={{ animation:"fadeIn .3s ease" }}>
            <div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px solid ${C.line}`, borderRadius:14, padding:16, marginBottom:12 }}>
              {acc !== null
                ? <Gauge value={acc} />
                : <div style={{ textAlign:"center", padding:"16px 0" }}>
                    <div style={{ fontSize:12, color:C.smoke, marginBottom:4 }}>في انتظار التقييمات</div>
                    <div style={{ fontSize:10, color:C.ash }}>أضف {Math.max(0,3-evaluated.length)} تقييمات للبدء</div>
                  </div>
              }
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              <Stat label="إجمالي التحليلات" value={records.length} color={C.electric} icon={I.Chart} />
              <Stat label="للتقييم" value={due} color={C.amber} icon={I.Warn} />
              <Stat label="صحيحة" value={evaluated.filter(r=>r.outcome==="correct").length} color={C.mint} icon={I.Zap} />
              <Stat label="خاطئة" value={evaluated.filter(r=>r.outcome==="wrong").length} color={C.coral} icon={I.Warn} />
            </div>
            {topErr && (
              <div style={{ background:`${C.coral}08`, border:`1px solid ${C.coral}20`, borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
                <div style={{ fontSize:10, color:C.smoke, marginBottom:3 }}>الخطأ الأكثر تكراراً</div>
                <div style={{ fontSize:12, fontWeight:700, color:C.snow }}>{ERROR_PATTERNS.find(p=>p.id===topErr[0])?.label} · {topErr[1]} مرات</div>
              </div>
            )}
            <div style={{ background:`${C.electric}06`, border:`1px solid ${C.electric}20`, borderRadius:10, padding:"10px 12px", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <I.Globe />
                <span style={{ fontSize:10, color:C.electric, fontWeight:600 }}>منصة سحابية مع Supabase</span>
              </div>
              <div style={{ fontSize:9, color:C.smoke, marginTop:4 }}>
                {syncStatus === "ok" ? "بياناتك محفوظة الآن" : "في انتظار الاتصال"}
              </div>
            </div>
            <button onClick={() => { setTab("insights"); runAnalysis(); }} disabled={records.length < 3}
              style={{ width:"100%", padding:"14px", borderRadius:14, cursor:records.length>=3?"pointer":"not-allowed", background:records.length>=3?`linear-gradient(135deg,${C.violet}30,${C.violet}15)`:C.layer2, border:`2px solid ${records.length>=3?C.violet+"60":C.edge}`, color:records.length>=3?C.violet+"cc":C.ash, display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:13, fontWeight:800 }}>
              <I.Brain />{records.length>=3?"تشغيل التحليل الذاتي":`أضف ${3-records.length} تحليلات للبدء`}
            </button>
          </div>
        )}

        {/* RECORDS */}
        {tab === "records" && (
          <div style={{ animation:"fadeIn .3s ease" }}>
            {records.length === 0
              ? <div style={{ textAlign:"center", padding:"40px 0", color:C.smoke, fontSize:12 }}>لا توجد سجلات بعد</div>
              : records.map(r => <RecordCard key={r.id} record={r} onEvaluate={evaluateRecord} onDelete={deleteRecord} />)
            }
          </div>
        )}

        {/* ADD */}
        {tab === "add" && (
          <div style={{ animation:"fadeIn .3s ease" }}>
            <div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px solid ${C.line}`, borderRadius:14, padding:14 }}>
              <div style={{ fontSize:11, color:C.smoke, fontWeight:700, marginBottom:12 }}>إضافة تحليل جديد</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                {[["sym","رمز السهم"],["name","اسم الشركة"],["current","السعر الحالي"],["target","السعر المستهدف"]].map(([k,p]) => (
                  <input key={k} value={newRec[k]} onChange={e=>setNewRec(prev=>({...prev,[k]:e.target.value}))} placeholder={p}
                    style={{ background:C.layer2, border:`1px solid ${C.line}`, borderRadius:8, padding:"8px 10px", color:C.snow, fontSize:11, direction:"rtl" }} />
                ))}
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                {[["buy","شراء",C.mint],["hold","احتفاظ",C.amber],["sell","بيع",C.coral]].map(([v,l,c]) => (
                  <button key={v} onClick={()=>setNewRec(p=>({...p,rec:v}))} style={{ flex:1, padding:"8px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700, background:newRec.rec===v?`${c}25`:C.layer3, border:`1px solid ${newRec.rec===v?c+"60":C.edge}`, color:newRec.rec===v?c:C.smoke }}>{l}</button>
                ))}
              </div>
              <textarea value={newRec.text} onChange={e=>setNewRec(p=>({...p,text:e.target.value}))} placeholder="الصق نص التحليل (اختياري)" rows={3}
                style={{ width:"100%", background:C.layer2, border:`1px solid ${C.line}`, borderRadius:8, padding:"8px 10px", color:C.snow, fontSize:11, direction:"rtl", resize:"vertical", fontFamily:"Cairo,sans-serif", marginBottom:8 }} />
              <button onClick={addRecord} disabled={!newRec.sym||!newRec.name} style={{ width:"100%", padding:"12px", borderRadius:10, cursor:newRec.sym&&newRec.name?"pointer":"not-allowed", background:newRec.sym&&newRec.name?`linear-gradient(135deg,${C.gold}30,${C.gold}15)`:C.layer3, border:`1px solid ${newRec.sym&&newRec.name?C.gold+"50":C.edge}`, color:newRec.sym&&newRec.name?C.gold:C.ash, fontSize:12, fontWeight:800 }}>
                حفظ في السجل + مزامنة السحابة
              </button>
            </div>
          </div>
        )}

        {/* INSIGHTS */}
        {tab === "insights" && (
          <div style={{ animation:"fadeIn .3s ease" }}>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <button onClick={runAnalysis} disabled={loading||records.length<3} style={{ flex:1, padding:"12px", borderRadius:12, cursor:!loading&&records.length>=3?"pointer":"not-allowed", background:!loading&&records.length>=3?`linear-gradient(135deg,${C.violet}30,${C.violet}15)`:C.layer2, border:`1px solid ${!loading&&records.length>=3?C.violet+"50":C.edge}`, color:!loading&&records.length>=3?C.violet+"cc":C.ash, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:12, fontWeight:800 }}>
                {loading ? <><div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid transparent",borderTopColor:C.violet,animation:"spin 0.8s linear infinite" }} />جاري التحليل...</> : <><I.Brain />تحليل ذاتي جديد</>}
              </button>
              {analysis && <button onClick={()=>setAnalysis("")} style={{ padding:"12px 14px", background:C.layer2, border:`1px solid ${C.edge}`, borderRadius:12, color:C.ash, cursor:"pointer", fontSize:11 }}>مسح</button>}
            </div>
            {loading && !analysis && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[80,95,70,85,60].map((w,i) => (
                  <div key={i} style={{ height:11, width:`${w}%`, borderRadius:6, background:`linear-gradient(90deg,${C.layer2},${C.layer3},${C.layer2})`, backgroundSize:"200% 100%", animation:"shimmer 1.4s ease-in-out infinite", animationDelay:`${i*.1}s` }} />
                ))}
              </div>
            )}
            {analysis && (
              <div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px solid ${C.line}`, borderRadius:12, padding:14, direction:"rtl", fontFamily:"Cairo,sans-serif" }}>
                {analysis.split("\n").map((line,i) => {
                  const t = line.trim();
                  if (!t) return <div key={i} style={{ height:6 }} />;
                  if (/^\*\*(.+)\*\*/.test(t)) return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, marginBottom:4 }}>
                      <div style={{ width:3, height:14, borderRadius:2, background:`linear-gradient(${C.gold},${C.goldD})` }} />
                      <span style={{ fontSize:12, fontWeight:800, color:C.gold }}>{t.replace(/\*\*/g,"")}</span>
                    </div>
                  );
                  if (t.startsWith("- ")) return (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:4 }}>
                      <div style={{ width:4,height:4,borderRadius:"50%",background:C.electric,marginTop:6,flexShrink:0 }} />
                      <span style={{ fontSize:11, color:C.mist, lineHeight:1.65 }}>{t.slice(2)}</span>
                    </div>
                  );
                  return <p key={i} style={{ fontSize:11, color:C.mist, lineHeight:1.7, marginBottom:3 }}>{t}</p>;
                })}
                {loading && <span style={{ display:"inline-block", width:2, height:13, background:C.gold, animation:"pulse 1s infinite", marginRight:2 }} />}
              </div>
            )}
            {!analysis && !loading && (
              <div style={{ textAlign:"center", padding:"40px 16px" }}>
                <div style={{ width:60,height:60,borderRadius:16,margin:"0 auto 12px",background:`${C.violet}18`,border:`1px solid ${C.violet}30`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <I.Brain />
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:C.mist, marginBottom:6 }}>التحليل الذاتي</div>
                <div style={{ fontSize:11, color:C.smoke }}>
                  {records.length < 3 ? `أضف ${3-records.length} تحليلات للبدء` : "اضغط الزر أعلاه"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
