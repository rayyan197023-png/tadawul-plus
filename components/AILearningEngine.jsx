"use client";
import { useState, useEffect, useRef, useCallback } from "react";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const C = {
ink:"#06080f", deep:"#090c16", void:"#0c1020",
layer1:"#16202e", layer2:"#1c2640", layer3:"#222d4a",
edge:"#2a3858", line:"#32426a",
snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
gold:"#f0c050", electric:"#4d9fff", mint:"#1ee68a", coral:"#ff5f6a",
amber:"#fbbf24", plasma:"#a78bfa", violet:"#7c3aed", teal:"#22d3ee",
;}
const ERROR_PATTERNS = [
,} "ﺛﻘﺔ ﻣﺒﺎﻟﻐﺔ":id:"overconfident", label {
,} "ﺗﺠﺎھﻞ اﻟﻤﺨﺎﻃﺮ":id:"no_downside", label {
,} "ﻋﻤﻰ اﻟﻘﻄﺎع":id:"sector_blindspot", label {
,} "ﺗﺜﺒﯿﺖ اﻟﺴﻌﺮ":id:"price_anchoring", label {
,} "ﺗﺤﯿﺰ اﻟﺰﺧﻢ":id:"momentum_bias", label {
,} "إھﻤﺎل اﻟﻜﻠﻲ":id:"macro_ignored", label {
,} "ﺳﻄﺤﻲ id:"shallow_moat", label:"Moat {
{ id:"fcf_mismatch", label:"ﺗﻨﺎﻗﺾ FCF" },
,} "ﺗﺠﺎھﻞ اﻟﺤﺠﻢ":id:"volume_ignored", label {
,} "ﺧﻄﺄ اﻟﺘﻮﻗﯿﺖ":id:"timing_wrong", label {
;]
const fmtDate = ts => new Date(ts).toLocaleDateString("ar-SA", { day:"numeric", month:"short"
const calcAcc = records => {
const ev = records.filter(r => r.outcome);
if (!ev.length) return null;
return Math.round(ev.filter(r => r.outcome === "correct").length / ev.length * 100);
;}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const getUserId = () => {
const k = "tadawul_uid";
let u = localStorage.getItem(k);
if (!u) { u = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); local
return u;
;}
const sbPost = async (table, data) => {
await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
method: "POST",
headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Ty
body: JSON.stringify(data),
});
};
const sbPatch = async (table, filter, data) => {
await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
method: "PATCH",
headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY, "Content-Ty
body: JSON.stringify(data),
});
};
const sbGet = async (table, filter) => {
const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY },
});
return res.ok ? res.json() : [];
};
const sbDelete = async (table, filter) => {
await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
method: "DELETE",
headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY },
});
};
/* Icons */
const IBrain = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="curr
const IChart = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="curr
const IPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="curre
const IList = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="curre
const IWarn = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="curre
const IZap = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="curren
const IGlobe = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="curr
function Gauge({ value }) {
const color = value >= 75 ? C.mint : value >= 55 ? C.amber : C.coral;
return (
<div style={{ textAlign:"center" }}>
<div style={{ position:"relative", width:90, height:90, margin:"0 auto 6px" }}>
<svg width="90" height="90" viewBox="0 0 90 90">
<circle cx="45" cy="45" r="38" fill="none" stroke={C.edge} strokeWidth="7"/>
<circle cx="45" cy="45" r="38" fill="none" stroke={color} strokeWidth="7"
strokeDasharray={`${2.389 * value} 239`} strokeLinecap="round"
transform="rotate(-90 45 45)" style={{ transition:"stroke-dasharray 1s ease" }}/>
</svg>
<div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", just
<span style={{ fontSize:20, fontWeight:900, color }}>{value}%</span>
</div>
</div>
<div style={{ fontSize:9, color, fontWeight:700 }}>
}"ﻣﺘﻮﺳﻄﺔ" : "ﺗﺤﺘﺎج ﺗﺤﺴﯿﻦ" ? 55 => value : "دﻗﺔ ﻋﺎﻟﯿﺔ" ? 75 => value{
</div>
</div>
;)
}
function Stat({ label, value, color, Icon }) {
return (
<div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px s
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marg
<span style={{ fontSize:9, color:C.ash }}>{label}</span>
<span style={{ color }}><Icon /></span>
</div>
<div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
</div>
;)
}
function RecordCard({ record, onEvaluate, onDelete }) {
const [open, setOpen] = useState(false);
const [price, setPrice] = useState("");
const [outcome, setOutcome] = useState("");
const [patterns, setPatterns] = useState([]);
const [saving, setSaving] = useState(false);
const days = Math.floor((Date.now() - record.createdAt) / 86400000);
const isDue = (record.actualPrice30 === null && days >= 30) || (record.actualPrice90 === nu
const oc = { correct:C.mint, partial:C.amber, wrong:C.coral }[record.outcome] || C.ash;
const rc = record.recommendation === "buy" ? C.mint : record.recommendation === "sell" ? C.
const save = async () => {
if (!outcome) return;
setSaving(true);
await onEvaluate(record.id, price, outcome, patterns, days);
setSaving(false);
setOpen(false);
;}
return (
<div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px s
<div style={{ padding:"10px 12px", display:"flex", alignItems:"center", gap:8, cursor:"
<div style={{ width:34, height:34, borderRadius:9, background:`${rc}18`, border:`1px
<span style={{ fontSize:9, fontWeight:900, color:rc }}>{record.sym}</span>
<span style={{ fontSize:7, color:C.smoke }}>{record.recommendation==="buy"?"ﺷﺮاء":r
</div>
<div style={{ flex:1 }}>
<div style={{ display:"flex", alignItems:"center", gap:5 }}>
<span style={{ fontSize:12, fontWeight:700, color:C.snow }}>{record.name}</span>
{isDue && <span style={{ fontSize:8, color:C.amber, background:`${C.amber}18`, pa
{record.outcome && <span style={{ fontSize:8, color:oc, background:`${oc}18`, pad
</div>
<div style={{ fontSize:9, color:C.smoke }}>{record.typeLabel} · {fmtDate(record.cre
</div>
<div style={{ textAlign:"left", flexShrink:0 }}>
<div style={{ fontSize:11, fontWeight:700, color:C.snow }}>{record.currentPrice||"-
{record.targetPrice && <div style={{ fontSize:9, color:rc }}>ھﺪف: {record.targetPri
</div>
</div>
{open && (
<div style={{ borderTop:`1px solid ${C.edge}`, padding:"10px 12px" }}>
{record.errorPatterns?.length > 0 && (
<div style={{ marginBottom:8, display:"flex", flexWrap:"wrap", gap:4 }}>
{record.errorPatterns.map(p => {
const ep = ERROR_PATTERNS.find(e=>e.id===p);
return <span key={p} style={{ fontSize:9, color:C.coral, background:`${C.cora
})}
</div>
})
{(!record.outcome || isDue) && (
<div style={{ background:C.void, borderRadius:8, padding:"10px" }}>
ﯿﺠﺔ>}} 8:div style={{ fontSize:10, color:C.amber, fontWeight:700, marginBtyle={{ display:"flex", gap:6, marginBottom:8 }}>
ﺤﺎﻟﻲ"=input value={price} onChange={e=>setPrice(e.target.value)} placeholder<
style={{ flex:1, background:C.layer2, border:`1px solid ${C.line}`, borderR
{[["correct","ﺻﺤﯿﺢ",C.mint],["partial","ﺟﺰﺋﻲ",C.amber],["wrong","ﺧﺎﻃﺊ",C.cora
<button key={v} onClick={()=>setOutcome(v)} style={{ padding:"6px 8px", bor
}))
</div>
{(outcome==="wrong"||outcome==="partial") && (
<div style={{ marginBottom:8, display:"flex", flexWrap:"wrap", gap:4 }}>
{ERROR_PATTERNS.map(p => (
<button key={p.id} onClick={()=>setPatterns(prev=>prev.includes(p.id)?pre
}))
</div>
})
<button onClick={save} disabled={!outcome||saving} style={{ width:"100%", paddi
{saving ? <><div style={{ width:12,height:12,borderRadius:"50%",border:"2px s
</button>
</div>
)}
</div>
<button onClick={()=>onDelete(record.id)} style={{ marginTop:8, padding:"4px 10px",
)}
</div>
);
}
export default function AILearningEngine() {
const [tab, setTab] = useState("dashboard");
const [records, setRecords] = useState([]);
const [syncing, setSyncing] = useState(false);
const [syncOk, setSyncOk] = useState(false);
const [analysis, setAnalysis] = useState("");
const [loading, setLoading] = useState(false);
const [newRec, setNewRec] = useState({ sym:"", name:"", rec:"buy", target:"", current:"", t
const abortRef = useRef(null);
useEffect(() => {
setSyncing(true);
const uid = getUserId();
sbGet("analysis_records", `user_id=eq.${uid}&order=created_at.desc`).then(rows => {
if (rows && rows.length > 0) {
setRecords(rows.map(r => ({
id:r.id, sym:r.sym, name:r.name, type:r.type, typeLabel:r.type_label,
recommendation:r.recommendation, targetPrice:r.target_price, currentPrice:r.current
analysisText:r.analysis_text, createdAt:r.created_at, evaluateAt30:r.evaluate_at30,
evaluateAt90:r.evaluate_at90, evaluateAt180:r.evaluate_at180, outcome:r.outcome,
actualPrice30:r.actual_price30, actualPrice90:r.actual_price90, actualPrice180:r.ac
errorPatterns:r.error_patterns||[], improvement:r.improvement, score:r.score, notes
})));
setSyncOk(true);
} else {
const local = JSON.parse(localStorage.getItem("tle_records_v1")||"[]");
setRecords(local);
if (local.length) local.forEach(r => sbPost("analysis_records", { id:r.id, user_id:ui
setSyncOk(true);
}
setSyncing(false);
}).catch(() => {
setRecords(JSON.parse(localStorage.getItem("tle_records_v1")||"[]"));
setSyncing(false);
});
}, []);
useEffect(() => { localStorage.setItem("tle_records_v1", JSON.stringify(records)); }, [reco
const evaluated = records.filter(r=>r.outcome);
const acc = calcAcc(records);
const due = records.filter(r=>{ const d=Math.floor((Date.now()-r.createdAt)/86400000); retu
const errFreq = {};
records.forEach(r=>r.errorPatterns?.forEach(p=>{errFreq[p]=(errFreq[p]||0)+1;}));
const topErr = Object.entries(errFreq).sort((a,b)=>b[1]-a[1])[0];
const addRecord = async () => {
if (!newRec.sym||!newRec.name) return;
const uid = getUserId();
const r = { id:newId(), sym:newRec.sym.toUpperCase(), name:newRec.name, type:"manual", ty
setRecords(prev=>[r,...prev]);
setNewRec({sym:"",name:"",rec:"buy",target:"",current:"",text:""});
sbPost("analysis_records", { id:r.id, user_id:uid, sym:r.sym, name:r.name, type:r.type, t
;}
const evaluateRecord = async (id, actualPrice, outcome, patterns, days) => {
const uid = getUserId();
setRecords(prev=>prev.map(r=>{ if(r.id!==id) return r; return {...r, outcome, errorPatter
const update = { outcome, error_patterns:patterns };
if(days>=30) update.actual_price30 = parseFloat(actualPrice);
if(days>=90) update.actual_price90 = parseFloat(actualPrice);
if(days>=180) update.actual_price180 = parseFloat(actualPrice);
sbPatch("analysis_records", `id=eq.${id}&user_id=eq.${uid}`, update).catch(()=>{});
;}
const deleteRecord = (id) => {
const uid = getUserId();
setRecords(prev=>prev.filter(r=>r.id!==id));
sbDelete("analysis_records", `id=eq.${id}&user_id=eq.${uid}`).catch(()=>{});
;}
const runAnalysis = useCallback(async () => {
if (abortRef.current) abortRef.current.abort();
const ctrl = new AbortController();
abortRef.current = ctrl;
setLoading(true); setAnalysis("");
const errList = Object.entries(errFreq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,n])=>`
.ﻣﺘﺨﺼﺺ ﻓﻲ اﻟﺴﻮق اﻟﺴﻌﻮدي AI أﻧﺖ ﻧﻈﺎم ﺗﺤﺴﯿﻦ ذاﺗﻲ ﻟﻤﺤﻠﻞ` = const prompt
== ﺑﯿﺎﻧﺎت اﻷداء ==
ﻤﺔ | }records.length{$ :اﻟﺘﺤﻠﯿﻼت
ﱠ
ﺪدة":"%"+acc!==null?acc{$ :اﻟﺪﻗﺔ | }evaluated.length{$ :اﻟﻤﻘﯿ
.evaluated.filter(r=>r{$ :ﺧﺎﻃﺌﺔ | }evaluated.filter(r=>r.outcome==="correct").length{$ :ﺻﺤﯿﺤﺔ
== أﻧﻤﺎط اﻷﺧﻄﺎء ==
}"ﻻ ﺗﻮﺟﺪ ﺑﯿﺎﻧﺎت ﻛﺎﻓﯿﺔ ﺑﻌﺪ":)"errList.length?errList.join("\n{$
ﻤﺔ ==
ﱠ
== آﺧﺮ 3 ﻣﻘﯿ
${evaluated.slice(-3).map(r=>`${r.name}(${r.sym}): ${r.outcome} | ${r.errorPatterns?.join(","
ً
ﯾﺸﻤﻞ
:اﻛﺘﺐ ﺗﺤﻠﯿﻼ ً ذاﺗﯿﺎ
ﺗﺸﺨﯿﺺ اﻷﻧﻤﺎط** — ﻣﺎ اﻟﻤﺘﻜﺮر وﻟﻤﺎذا؟ .1**
ﺟﺬر اﻟﻤﺸﻜﻠﺔ** — اﻟﺴﺒﺐ اﻟﺤﻘﯿﻘﻲ .2**
ﺗﻌﻠﯿﻤﺎت ﻣﺤﺪدة 3 — **Prompts ﺗﺤﺴﯿﻨﺎت اﻟـ .3**
ﻗﻮاﻋﺪ اﻟﺘﺤﻘﻖ** — 5 ﻗﻮاﻋﺪ ﺻﺎرﻣﺔ .4**
;`ﺧﻄﺔ اﻟﺘﺤﺴﯿﻦ** — 3 ﺧﻄﻮات ﻟﻠـ 30 ﯾﻮم اﻟﻘﺎدﻣﺔ .5**
try {
const res = await fetch("https://api.anthropic.com/v1/messages", {
method:"POST",
headers:{"content-type":"application/json","anthropic-version":"2023-06-01","anthropi
signal:ctrl.signal,
body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:3000, stream:true,
;)}
if (!res.ok) throw new Error("HTTP "+res.status);
const reader = res.body.getReader();
const dec = new TextDecoder();
let full="", buf="";
while(true) {
const {done,value} = await reader.read();
if(done) break;
buf += dec.decode(value,{stream:true});
const lines = buf.split("\n"); buf = lines.pop()||"";
for(const line of lines) {
if(!line.startsWith("data:")) continue;
const raw = line.slice(5).trim();
if(raw==="[DONE]") continue;
try{const t=JSON.parse(raw)?.delta?.text||"";if(t){full+=t;setAnalysis(full);}}catc
}
}
} catch(e) { if(e.name!=="AbortError") setAnalysis("ﺧﻄﺄ: "+e.message); }
finally { setLoading(false); }
}, [records]);
const tabs = [
{id:"dashboard",label:"اﻟﺮﺋﯿﺴﯿﺔ",Icon:IChart},
{id:"records", label:"اﻟﺴﺠﻼت", Icon:IList},
{id:"add", label:"إﺿﺎﻓﺔ", Icon:IPlus},
{id:"insights", label:"اﻟﺘﺤﻠﯿﻞ", Icon:IBrain},
;]
return (
<div style={{ minHeight:"100vh", background:C.ink, direction:"rtl", fontFamily:"Cairo,san
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&
@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1;tran
*{box-sizing:border-box;margin:0;padding:0} button,input,textarea{font-family:inherit
::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.edge};border-
input::placeholder,textarea::placeholder{color:${C.ash}}
`}</style>
{/* HEADER */}
<div style={{ padding:"14px 16px 12px", background:`linear-gradient(160deg,${C.layer2},
<div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<div style={{ width:40,height:40,borderRadius:12,background:`${C.violet}20`,borde
<IBrain />
</div>
<div>
/<ﻣﺤﺮك اﻟﺘﻌﻠﻢ اﻟﺬاﺗﻲ>}} div style={{ fontSize:15, fontWeight:900, color:Ctyle={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
{syncing
? <><div style={{ width:10,height:10,borderRadius:"50%",border:"1.5px solid
: syncOk
? <><div style={{width:5,height:5,borderRadius:"50%",background:C.mint,an
: <span style={{fontSize:9,color:C.ash}}>...</span>
}
</div>
</div>
</div>
<div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3
{due>0 && <div style={{background:`${C.amber}18`,border:`1px solid ${C.amber}40`,
<div style={{fontSize:9,color:C.ash}}>{records.length} ﺳﺠﻞ</div>
</div>
</div>
</div>
{/* TABS */}
<div style={{ display:"flex", borderBottom:`1px solid ${C.line}`, background:C.deep }}>
{tabs.map(t => (
<button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"10px 4px",di
<t.Icon />{t.label}
</button>
}))
</div>
<div style={{ padding:"14px 14px 100px" }}>
{/* DASHBOARD */}
{tab==="dashboard" && (
<div style={{animation:"fadeIn .3s ease"}}>
<div style={{background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,border:
{acc!==null ? <Gauge value={acc} /> :
<div style={{padding:"16px 0"}}><div style={{fontSize:12,color:C.smoke,margin
}
</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}
<Stat label="إﺟﻤﺎﻟﻲ اﻟﺘﺤﻠﯿﻼت" value={records.length} color={C.electric} Icon={I
<Stat label="ﻟﻠﺘﻘﯿﯿﻢ" value={due} color={C.amber} Icon={IWarn} />
<Stat label="ﺻﺤﯿﺤﺔ" value={evaluated.filter(r=>r.outcome==="correct").length} c
<Stat label="ﺧﺎﻃﺌﺔ" value={evaluated.filter(r=>r.outcome==="wrong").length}
</div>
{topErr && (
<div style={{background:`${C.coral}08`,border:`1px solid ${C.coral}20`,borderRa
<div style={{fontSize:10,color:C.smoke,marginBottom:3}}>ً
d/<اﻟﺨﻄﺄ اﻷﻛﺜﺮ ﺗﻜﺮارا
<div style={{fontSize:12,fontWeight:700,color:C.snow}}>{ERROR_PATTERNS.find(p
</div>
})
<div style={{background:`${C.electric}06`,border:`1px solid ${C.electric}20`,bord
<div style={{display:"flex",alignItems:"center",gap:6}}><IGlobe /><span style={
<div style={{fontSize:9,color:C.smoke,marginTop:4}}>ً
ﻊ اﻟﻤﺴﺘﺨﺪﻣﯿﻦ ﻣﺤﻔﻮﻇﺔ ﺗﻠﻘﺎﺋﯿﺎ
</div>
<button onClick={()=>{setTab("insights");runAnalysis();}} disabled={records.lengt
`أﺿﻒ"?3=>IBrain />{records.length<
ّ
":
ﻞ اﻟﺘﺤﻠﯿﻞ اﻟﺬاﺗﻲ
ﻠﺒﺪء }records.length-3{$ ﺷﻐ
</button>
</div>
})
{/* RECORDS */}
{tab==="records" && (
<div style={{animation:"fadeIn .3s ease"}}>
{records.length===0
? <div style={{textAlign:"center",padding:"40px 0",color:C.smoke,fontSize:12}}>
: records.map(r=><RecordCard key={r.id} record={r} onEvaluate={evaluateRecord}
}
</div>
})
{/* ADD */}
{tab==="add" && (
<div style={{animation:"fadeIn .3s ease"}}>
<div style={{background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,border:
ﯿﻞ ﺟﺪﯾﺪ>}}12:div style={{fontSize:11,color:C.smoke,fontWeight:700,marginBottom<
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}
{[["sym","رﻣﺰ اﻟﺴﮭﻢ"],["name","اﺳﻢ اﻟﺸﺮﻛﺔ"],["current","اﻟﺴﻌﺮ اﻟﺤﺎﻟﻲ"],["targ
<input key={k} value={newRec[k]} onChange={e=>setNewRec(prev=>({...prev,[k]
style={{background:C.layer2,border:`1px solid ${C.line}`,borderRadius:8,p
}))
</div>
<div style={{display:"flex",gap:6,marginBottom:8}}>
{[["buy","ﺷﺮاء",C.mint],["hold","اﺣﺘﻔﺎظ",C.amber],["sell","ﺑﯿﻊ",C.coral]].map
<button key={v} onClick={()=>setNewRec(p=>({...p,rec:v}))} style={{flex:1,p
}))
</div>
<textarea value={newRec.text} onChange={e=>setNewRec(p=>({...p,text:e.target.va
style={{width:"100%",background:C.layer2,border:`1px solid ${C.line}`,borderR
<button onClick={addRecord} disabled={!newRec.sym||!newRec.name} style={{width:
ﺣﻔﻆ + ﻣﺰاﻣﻨﺔ اﻟﺴﺤﺎﺑﺔ
</button>
</div>
</div>
})
{/* INSIGHTS */}
{tab==="insights" && (
<div style={{animation:"fadeIn .3s ease"}}>
<div style={{display:"flex",gap:8,marginBottom:12}}>
<button onClick={runAnalysis} disabled={loading||records.length<3} style={{flex
{loading?<><div style={{width:14,height:14,borderRadius:"50%",border:"2px sol
</button>
{analysis&&<button onClick={()=>setAnalysis("")} style={{padding:"12px 14px",bo
</div>
{loading&&!analysis&&(
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{[80,95,70,85,60].map((w,i)=>(
<div key={i} style={{height:11,width:`${w}%`,borderRadius:6,background:`lin
}))
</div>
})
{analysis&&(
<div style={{background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,borde
{analysis.split("\n").map((line,i)=>{
const t=line.trim();
if(!t) return <div key={i} style={{height:6}}/>;
if(/^\*\*(.+)\*\*/.test(t)) return <div key={i} style={{display:"flex",alig
if(t.startsWith("- ")) return <div key={i} style={{display:"flex",gap:8,mar
return <p key={i} style={{fontSize:11,color:C.mist,lineHeight:1.7,margin:"0
})}
{loading&&<span style={{display:"inline-block",width:2,height:13,background:C
</div>
})
{!analysis&&!loading&&(
<div style={{textAlign:"center",padding:"40px 16px"}}>
<div style={{width:60,height:60,borderRadius:16,margin:"0 auto 12px",backgrou
اﻟﺬاﺗﻲ>}}6:div style={{fontSize:13,fontWeight:700,color:C.mist,marginBottom<
<div style={{fontSize:11,color:C.smoke}}>{records.length<3?`3{$ أﺿﻒ-records.l
</div>
})
</div>
})
</div>
</div>
;)
}
