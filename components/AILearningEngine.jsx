‘use client’;
import { useState, useEffect, useRef, useCallback } from ‘react’;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const C = {
ink:’#06080f’, deep:’#090c16’, void:’#0c1020’,
layer1:’#16202e’, layer2:’#1c2640’, layer3:’#222d4a’,
edge:’#2a3858’, line:’#32426a’,
snow:’#f0f6ff’, mist:’#c8d8f0’, smoke:’#90a4c8’, ash:’#5a6e94’,
gold:’#f0c050’, electric:’#4d9fff’, mint:’#1ee68a’, coral:’#ff5f6a’,
amber:’#fbbf24’, plasma:’#a78bfa’, violet:’#7c3aed’, teal:’#22d3ee’,
};
const ERROR_PATTERNS = [
{ id:‘overconfident’, label:‘ثقة مبالغة’ },
{ id:‘no_downside’, label:‘تجاهل المخاطر’ },
{ id:‘sector_blindspot’, label:‘عمى القطاع’ },
{ id:‘price_anchoring’, label:‘تثبيت السعر’ },
{ id:‘momentum_bias’, label:‘تحيز الزخم’ },
{ id:‘macro_ignored’, label:‘إهمال الكلي’ },
{ id:‘shallow_moat’, label:‘Moat سطحي’ },
{ id:‘fcf_mismatch’, label:‘تناقض FCF’ },
{ id:‘volume_ignored’, label:‘تجاهل الحجم’ },
{ id:‘timing_wrong’, label:‘خطأ التوقيت’ },
];
const fmtDate = ts => new Date(ts).toLocaleDateString(‘ar-SA’, { day:‘numeric’, month:‘short’ });
const calcAcc = records => {
const ev = records.filter(r => r.outcome);
if (!ev.length) return null;
return Math.round(ev.filter(r => r.outcome === ‘correct’).length / ev.length * 100);
};
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const getUserId = () => {
const k = ‘tadawul_uid’;
let u = localStorage.getItem(k);
if (!u) { u = ‘u_’ + Date.now().toString(36) + Math.random().toString(36).slice(2,8); localStorage.setItem(k,u); }
return u;
};
const sbPost = async (table, data) => {
await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
method: ‘POST’,
headers: { ‘apikey’: SUPABASE_KEY, ‘Authorization’: ’Bearer ’ + SUPABASE_KEY, ‘Content-Type’: ‘application/json’, ‘Prefer’: ‘return=minimal’ },
body: JSON.stringify(data),
});
};
const sbPatch = async (table, filter, data) => {
await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
method: ‘PATCH’,
headers: { ‘apikey’: SUPABASE_KEY, ‘Authorization’: ’Bearer ’ + SUPABASE_KEY, ‘Content-Type’: ‘application/json’ },
body: JSON.stringify(data),
});
};
const sbGet = async (table, filter) => {
const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
headers: { ‘apikey’: SUPABASE_KEY, ‘Authorization’: ’Bearer ’ + SUPABASE_KEY },
});
return res.ok ? res.json() : [];
};
const sbDelete = async (table, filter) => {
await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
method: ‘DELETE’,
headers: { ‘apikey’: SUPABASE_KEY, ‘Authorization’: ’Bearer ’ + SUPABASE_KEY },
});
};
const IBrain = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>;
const IChart = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IList = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IWarn = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IZap = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IGlobe = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;

function Gauge({ value }) {
const color = value >= 75 ? C.mint : value >= 55 ? C.amber : C.coral;
return (
<div style={{ textAlign:‘center’ }}>
<div style={{ position:‘relative’, width:90, height:90, margin:‘0 auto 6px’ }}>
<svg width="90" height="90" viewBox="0 0 90 90">
<circle cx="45" cy="45" r="38" fill="none" stroke={C.edge} strokeWidth="7"/>
<circle cx=‘45’ cy=‘45’ r=‘38’ fill=‘none’ stroke={color} strokeWidth=‘7’
strokeDasharray={`${2.389 * value} 239`} strokeLinecap=‘round’
transform=‘rotate(-90 45 45)’ style={{ transition:‘stroke-dasharray 1s ease’ }}/>
</svg>
<div style={{ position:‘absolute’, inset:0, display:‘flex’, alignItems:‘center’, justifyContent:‘center’ }}>
<span style={{ fontSize:20, fontWeight:900, color }}>{value}%</span>
</div>
</div>
<div style={{ fontSize:9, color, fontWeight:700 }}>
{value >= 75 ? ‘دقة عالية’ : value >= 55 ? ‘متوسطة’ : ‘تحتاج تحسين’}
</div>
</div>
);
}

function Stat({ label, value, color, Icon }) {
return (
<div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px solid ${C.edge}`, borderRadius:10, padding:‘10px 12px’ }}>
<div style={{ display:‘flex’, justifyContent:‘space-between’, alignItems:‘center’, marginBottom:4 }}>
<span style={{ fontSize:9, color:C.ash }}>{label}</span>
<span style={{ color }}><Icon /></span>
</div>
<div style={{ fontSize:20, fontWeight:900, color }}>{value}</div>
</div>
);
}

function RecordCard({ record, onEvaluate, onDelete }) {
const [open, setOpen] = useState(false);
const [price, setPrice] = useState(’’);
const [outcome, setOutcome] = useState(’’);
const [patterns, setPatterns] = useState([]);
const [saving, setSaving] = useState(false);
const days = Math.floor((Date.now() - record.createdAt) / 86400000);
const isDue = (record.actualPrice30 === null && days >= 30) || (record.actualPrice90 === null && days >= 90);
const oc = { correct:C.mint, partial:C.amber, wrong:C.coral }[record.outcome] || C.ash;
const rc = record.recommendation === ‘buy’ ? C.mint : record.recommendation === ‘sell’ ? C.coral : C.amber;
const save = async () => {
if (!outcome) return;
setSaving(true);
await onEvaluate(record.id, price, outcome, patterns, days);
setSaving(false);
setOpen(false);
};
return (
<div style={{ background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, border:`1px solid ${C.edge}`, borderRadius:12, marginBottom:10, overflow:‘hidden’ }}>
<div style={{ padding:‘10px 12px’, display:‘flex’, alignItems:‘center’, gap:8, cursor:‘pointer’ }} onClick={()=>setOpen(o=>!o)}>
<div style={{ width:34, height:34, borderRadius:9, background:`${rc}18`, border:`1px solid ${rc}30`, display:‘flex’, flexDirection:‘column’, alignItems:‘center’, justifyContent:‘center’, flexShrink:0 }}>
<span style={{ fontSize:9, fontWeight:900, color:rc }}>{record.sym}</span>
<span style={{ fontSize:7, color:C.smoke }}>{record.recommendation===‘buy’?‘شراء’:record.recommendation===‘sell’?‘بيع’:‘احتفاظ’}</span>
</div>
<div style={{ flex:1 }}>
<div style={{ display:‘flex’, alignItems:‘center’, gap:5 }}>
<span style={{ fontSize:12, fontWeight:700, color:C.snow }}>{record.name}</span>
{isDue && <span style={{ fontSize:8, color:C.amber, background:`${C.amber}18`, padding:‘1px 5px’, borderRadius:4 }}>للتقييم</span>}
{record.outcome && <span style={{ fontSize:8, color:oc, background:`${oc}18`, padding:‘1px 5px’, borderRadius:4 }}>{record.outcome===‘correct’?‘صحيح’:record.outcome===‘partial’?‘جزئي’:‘خاطئ’}</span>}
</div>
<div style={{ fontSize:9, color:C.smoke }}>{record.typeLabel} · {fmtDate(record.createdAt)}</div>
</div>
<div style={{ textAlign:‘left’, flexShrink:0 }}>
<div style={{ fontSize:11, fontWeight:700, color:C.snow }}>{record.currentPrice||’-’}</div>
{record.targetPrice && <div style={{ fontSize:9, color:rc }}>هدف: {record.targetPrice}</div>}
</div>
</div>
{open && (
<div style={{ borderTop:`1px solid ${C.edge}`, padding:‘10px 12px’ }}>
{record.errorPatterns?.length > 0 && (
<div style={{ marginBottom:8, display:‘flex’, flexWrap:‘wrap’, gap:4 }}>
{record.errorPatterns.map(p => {
const ep = ERROR_PATTERNS.find(e=>e.id===p);
return <span key={p} style={{ fontSize:9, color:C.coral, background:`${C.coral}15`, padding:‘2px 6px’, borderRadius:4 }}>{ep?.label||p}</span>;
})}
</div>
)}
{(!record.outcome || isDue) && (
<div style={{ background:C.void, borderRadius:8, padding:‘10px’ }}>
<div style={{ fontSize:10, color:C.amber, fontWeight:700, marginBottom:8 }}>تقييم النتيجة</div>
<div style={{ display:‘flex’, gap:6, marginBottom:8 }}>
<input value={price} onChange={e=>setPrice(e.target.value)} placeholder=‘السعر الحالي’
style={{ flex:1, background:C.layer2, border:`1px solid ${C.line}`, borderRadius:8, padding:‘7px 10px’, color:C.snow, fontSize:11 }}/>
</div>
<div style={{ display:‘flex’, gap:6, marginBottom:8 }}>
{[[‘correct’,‘صحيح’,C.mint],[‘partial’,‘جزئي’,C.amber],[‘wrong’,‘خاطئ’,C.coral]].map(([v,l,c])=>(
<button key={v} onClick={()=>setOutcome(v)} style={{ padding:‘6px 8px’, borderRadius:7, border:`1px solid ${outcome===v?c:C.line}`, background:outcome===v?`${c}20`:C.layer2, color:outcome===v?c:C.smoke, fontSize:10, flex:1, cursor:‘pointer’ }}>{l}</button>
))}
</div>
{(outcome===‘wrong’||outcome===‘partial’) && (
<div style={{ marginBottom:8, display:‘flex’, flexWrap:‘wrap’, gap:4 }}>
{ERROR_PATTERNS.map(p => (
<button key={p.id} onClick={()=>setPatterns(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[…prev,p.id])}
style={{ fontSize:9, padding:‘3px 7px’, borderRadius:5, border:`1px solid ${patterns.includes(p.id)?C.coral:C.line}`, background:patterns.includes(p.id)?`${C.coral}20`:C.layer2, color:patterns.includes(p.id)?C.coral:C.smoke, cursor:‘pointer’ }}>{p.label}</button>
))}
</div>
)}
<button onClick={save} disabled={!outcome||saving} style={{ width:‘100%’, padding:‘9px’, borderRadius:8, border:‘none’, background:outcome?C.electric:’#333’, color:outcome?C.void:C.ash, fontWeight:700, fontSize:12, cursor:outcome?‘pointer’:‘not-allowed’ }}>
{saving ? ‘جاري الحفظ…’ : ‘حفظ التقييم’}
</button>
</div>
)}
<button onClick={()=>onDelete(record.id)} style={{ marginTop:8, padding:‘4px 10px’, borderRadius:6, border:`1px solid ${C.coral}30`, background:‘transparent’, color:C.coral, fontSize:9, cursor:‘pointer’ }}>حذف</button>
</div>
)}
</div>
);
}

export default function AILearningEngine() {
const [tab, setTab] = useState(‘dashboard’);
const [records, setRecords] = useState([]);
const [syncing, setSyncing] = useState(false);
const [syncOk, setSyncOk] = useState(false);
const [analysis, setAnalysis] = useState(’’);
const [loading, setLoading] = useState(false);
const [newRec, setNewRec] = useState({ sym:’’, name:’’, rec:‘buy’, target:’’, current:’’, text:’’ });
const abortRef = useRef(null);

useEffect(() => {
setSyncing(true);
const uid = getUserId();
sbGet(‘analysis_records’, `user_id=eq.${uid}&order=created_at.desc`).then(rows => {
if (rows && rows.length > 0) {
setRecords(rows.map(r => ({
id:r.id, sym:r.sym, name:r.name, type:r.type, typeLabel:r.type_label,
recommendation:r.recommendation, targetPrice:r.target_price, currentPrice:r.current_price,
analysisText:r.analysis_text, createdAt:r.created_at, outcome:r.outcome,
actualPrice30:r.actual_price30, actualPrice90:r.actual_price90, actualPrice180:r.actual_price180,
errorPatterns:r.error_patterns||[], improvement:r.improvement, score:r.score, notes:r.notes,
})));
setSyncOk(true);
} else {
const local = JSON.parse(localStorage.getItem(‘tle_records_v1’)||’[]’);
setRecords(local);
if (local.length) local.forEach(r => sbPost(‘analysis_records’, { id:r.id, user_id:uid, sym:r.sym, name:r.name }));
setSyncOk(true);
}
setSyncing(false);
}).catch(() => {
setRecords(JSON.parse(localStorage.getItem(‘tle_records_v1’)||’[]’));
setSyncing(false);
});
}, []);

useEffect(() => { localStorage.setItem(‘tle_records_v1’, JSON.stringify(records)); }, [records]);

const evaluated = records.filter(r=>r.outcome);
const acc = calcAcc(records);
const due = records.filter(r=>{ const d=Math.floor((Date.now()-r.createdAt)/86400000); return (r.actualPrice30===null&&d>=30)||(r.actualPrice90===null&&d>=90); }).length;
const errFreq = {};
records.forEach(r=>r.errorPatterns?.forEach(p=>{errFreq[p]=(errFreq[p]||0)+1;}));
const topErr = Object.entries(errFreq).sort((a,b)=>b[1]-a[1])[0];

const addRecord = async () => {
if (!newRec.sym||!newRec.name) return;
const uid = getUserId();
const r = { id:newId(), sym:newRec.sym.toUpperCase(), name:newRec.name, type:‘manual’, typeLabel:‘يدوي’, recommendation:newRec.rec, targetPrice:newRec.target, currentPrice:newRec.current, analysisText:newRec.text, createdAt:Date.now(), outcome:null, actualPrice30:null, actualPrice90:null, actualPrice180:null, errorPatterns:[], improvement:null, score:null, notes:null };
setRecords(prev=>[r,…prev]);
setNewRec({sym:’’,name:’’,rec:‘buy’,target:’’,current:’’,text:’’});
sbPost(‘analysis_records’, { id:r.id, user_id:uid, sym:r.sym, name:r.name, type:r.type, type_label:r.typeLabel, recommendation:r.recommendation, target_price:r.targetPrice, current_price:r.currentPrice, analysis_text:r.analysisText, created_at:new Date(r.createdAt).toISOString() });
};

const evaluateRecord = async (id, actualPrice, outcome, patterns, days) => {
const uid = getUserId();
setRecords(prev=>prev.map(r=>{ if(r.id!==id) return r; return {…r, outcome, errorPatterns:patterns}; }));
const update = { outcome, error_patterns:patterns };
if(days>=30) update.actual_price30 = parseFloat(actualPrice);
if(days>=90) update.actual_price90 = parseFloat(actualPrice);
if(days>=180) update.actual_price180 = parseFloat(actualPrice);
sbPatch(‘analysis_records’, `id=eq.${id}&user_id=eq.${uid}`, update).catch(()=>{});
};

const deleteRecord = (id) => {
const uid = getUserId();
setRecords(prev=>prev.filter(r=>r.id!==id));
sbDelete(‘analysis_records’, `id=eq.${id}&user_id=eq.${uid}`).catch(()=>{});
};

const runAnalysis = useCallback(async () => {
if (abortRef.current) abortRef.current.abort();
const ctrl = new AbortController();
abortRef.current = ctrl;
setLoading(true); setAnalysis(’’);
const errList = Object.entries(errFreq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,n])=>`- ${ERROR_PATTERNS.find(p=>p.id===id)?.label||id}: ${n} مرة`);
const prompt = `أنت نظام تحسين ذاتي لمحلل AI متخصص في السوق السعودي. == بيانات الأداء == التحليلات: ${records.length} | المقيّمة: ${evaluated.length} | الدقة: ${acc!==null?acc+"%":"غير محددة"} صحيحة: ${evaluated.filter(r=>r.outcome==="correct").length} | خاطئة: ${evaluated.filter(r=>r.outcome==="wrong").length} == أنماط الأخطاء == ${errList.length?errList.join("\n"):"لا توجد بيانات كافية بعد"} == آخر 3 مقيّمة == ${evaluated.slice(-3).map(r=>`${r.name}(${r.sym}): ${r.outcome} | ${r.errorPatterns?.join(’,’)}`).join(’\n’)}
اكتب تحليلاً ذاتياً يشمل:

1. **تشخيص الأنماط** — ما المتكرر ولماذا؟
1. **جذر المشكلة** — السبب الحقيقي
1. **تحسينات الـ Prompts** — 3 تعليمات محددة
1. **قواعد التحقق** — 5 قواعد صارمة
1. **خطة التحسين** — 3 خطوات للـ 30 يوم القادمة`;
   try {
   const res = await fetch(’/api/claude’, {
   method:‘POST’,
   headers:{‘content-type’:‘application/json’},
   signal:ctrl.signal,
   body:JSON.stringify({ model:‘claude-sonnet-4-20250514’, max_tokens:3000, stream:true, messages:[{role:‘user’,content:prompt}] }),
   });
   if (!res.ok) throw new Error(‘HTTP ‘+res.status);
   const reader = res.body.getReader();
   const dec = new TextDecoder();
   let full=’’, buf=’’;
   while(true) {
   const {done,value} = await reader.read();
   if(done) break;
   buf += dec.decode(value,{stream:true});
   const lines = buf.split(’\n’); buf = lines.pop()||’’;
   for(const line of lines) {
   if(!line.startsWith(‘data:’)) continue;
   const raw = line.slice(5).trim();
   if(raw===’[DONE]’) continue;
   try{const t=JSON.parse(raw)?.delta?.text||’’;if(t){full+=t;setAnalysis(full);}}catch(e){}
   }
   }
   } catch(e) { if(e.name!==‘AbortError’) setAnalysis(’خطأ: ’+e.message); }
   finally { setLoading(false); }
   }, [records]);

const tabs = [
{id:‘dashboard’,label:‘الرئيسية’,Icon:IChart},
{id:‘records’, label:‘السجلات’, Icon:IList},
{id:‘add’, label:‘إضافة’, Icon:IPlus},
{id:‘insights’, label:‘التحليل’, Icon:IBrain},
];

return (
<div style={{ minHeight:‘100vh’, background:C.ink, direction:‘rtl’, fontFamily:‘Cairo,sans-serif’ }}>
<style>{`@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"); @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}} *{box-sizing:border-box;margin:0;padding:0} button,input,textarea{font-family:inherit;} ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:${C.edge};border-radius:3px;} input::placeholder,textarea::placeholder{color:${C.ash}}`}</style>
<div style={{ padding:‘14px 16px 12px’, background:`linear-gradient(160deg,${C.layer2},${C.layer1})`, borderBottom:`1px solid ${C.edge}` }}>
<div style={{ display:‘flex’, alignItems:‘center’, justifyContent:‘space-between’ }}>
<div style={{ display:‘flex’, alignItems:‘center’, gap:10 }}>
<div style={{ width:40,height:40,borderRadius:12,background:`${C.violet}20`,border:`1px solid ${C.violet}40`,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,color:C.violet }}>
<IBrain />
</div>
<div>
<div style={{ fontSize:15, fontWeight:900, color:C.snow }}>محرك التعلم الذاتي</div>
<div style={{ display:‘flex’, alignItems:‘center’, gap:5, marginTop:2 }}>
{syncing
? <><div style={{ width:10,height:10,borderRadius:‘50%’,border:‘1.5px solid ‘+C.electric,borderTopColor:‘transparent’,animation:‘spin .8s linear infinite’ }}/><span style={{fontSize:9,color:C.electric}}>جاري التحميل…</span></>
: syncOk
? <><div style={{width:5,height:5,borderRadius:‘50%’,background:C.mint,animation:‘pulse 2s infinite’}}/><span style={{fontSize:9,color:C.mint}}>منصة سحابية · Supabase</span></>
: <span style={{fontSize:9,color:C.ash}}>…</span>
}
</div>
</div>
</div>
<div style={{ display:‘flex’, flexDirection:‘column’, alignItems:‘flex-end’, gap:3 }}>
{due>0 && <div style={{background:`${C.amber}18`,border:`1px solid ${C.amber}40`,borderRadius:6,padding:‘3px 8px’,fontSize:9,color:C.amber}}>{due} للتقييم</div>}
<div style={{fontSize:9,color:C.ash}}>{records.length} سجل</div>
</div>
</div>
</div>
<div style={{ display:‘flex’, borderBottom:`1px solid ${C.line}`, background:C.deep }}>
{tabs.map(t => (
<button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:‘10px 4px’,display:‘flex’,flexDirection:‘column’,alignItems:‘center’,gap:3,border:‘none’,background:‘transparent’,color:tab===t.id?C.electric:C.ash,borderBottom:`2px solid ${tab===t.id?C.electric:"transparent"}`,fontSize:8,fontWeight:700,cursor:‘pointer’,transition:‘all .2s’ }}>
<t.Icon />{t.label}
</button>
))}
</div>
<div style={{ padding:‘14px 14px 100px’ }}>
{tab===‘dashboard’ && (
<div style={{animation:‘fadeIn .3s ease’}}>
<div style={{background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,border:`1px solid ${C.edge}`,borderRadius:12,padding:‘16px’,marginBottom:12,textAlign:‘center’}}>
{acc!==null ? <Gauge value={acc} /> :
<div style={{padding:‘16px 0’}}><div style={{fontSize:12,color:C.smoke,marginBottom:4}}>في انتظار التقييمات</div><div style={{fontSize:10,color:C.ash}}>أضف 3 تقييمات للبدء</div></div>
}
</div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:12}}>
<Stat label="إجمالي التحليلات" value={records.length} color={C.electric} Icon={IChart} />
<Stat label="للتقييم" value={due} color={C.amber} Icon={IWarn} />
<Stat label=‘صحيحة’ value={evaluated.filter(r=>r.outcome===‘correct’).length} color={C.mint} Icon={IZap} />
<Stat label=‘خاطئة’ value={evaluated.filter(r=>r.outcome===‘wrong’).length} color={C.coral} Icon={IWarn} />
</div>
{topErr && (
<div style={{background:`${C.coral}08`,border:`1px solid ${C.coral}20`,borderRadius:10,padding:‘10px 12px’,marginBottom:10}}>
<div style={{fontSize:10,color:C.smoke,marginBottom:3}}>الخطأ الأكثر تكراراً</div>
<div style={{fontSize:12,fontWeight:700,color:C.snow}}>{ERROR_PATTERNS.find(p=>p.id===topErr[0])?.label} — {topErr[1]} مرة</div>
</div>
)}
<div style={{background:`${C.electric}06`,border:`1px solid ${C.electric}20`,borderRadius:10,padding:‘10px 12px’,marginBottom:10}}>
<div style={{display:‘flex’,alignItems:‘center’,gap:6}}><IGlobe /><span style={{fontSize:10,color:C.electric,fontWeight:700}}>منصة سحابية مع Supabase</span></div>
<div style={{fontSize:9,color:C.smoke,marginTop:4}}>بياناتك محفوظة تلقائياً مع المستخدمين</div>
</div>
<button onClick={()=>{setTab(‘insights’);runAnalysis();}} disabled={records.length<3} style={{width:‘100%’,padding:‘13px’,borderRadius:10,border:‘none’,background:records.length>=3?`linear-gradient(135deg,${C.violet},${C.electric})`:’#1a1a2e’,color:records.length>=3?C.snow:C.ash,fontWeight:800,fontSize:13,cursor:records.length>=3?‘pointer’:‘not-allowed’}}>
{records.length<3?`أضف ${3-records.length} تحليلات للبدء`:‘شغّل التحليل الذاتي’}
</button>
</div>
)}
{tab===‘records’ && (
<div style={{animation:‘fadeIn .3s ease’}}>
{records.length===0
? <div style={{textAlign:‘center’,padding:‘40px 0’,color:C.smoke,fontSize:12}}>لا توجد سجلات بعد</div>
: records.map(r=><RecordCard key={r.id} record={r} onEvaluate={evaluateRecord} onDelete={deleteRecord}/>)
}
</div>
)}
{tab===‘add’ && (
<div style={{animation:‘fadeIn .3s ease’}}>
<div style={{background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,border:`1px solid ${C.edge}`,borderRadius:12,padding:‘14px’}}>
<div style={{fontSize:11,color:C.smoke,fontWeight:700,marginBottom:12}}>تسجيل تحليل جديد</div>
<div style={{display:‘grid’,gridTemplateColumns:‘1fr 1fr’,gap:8,marginBottom:8}}>
{[[‘sym’,‘رمز السهم’],[‘name’,‘اسم الشركة’],[‘current’,‘السعر الحالي’],[‘target’,‘السعر المستهدف’]].map(([k,ph])=>(
<input key={k} value={newRec[k]} onChange={e=>setNewRec(prev=>({…prev,[k]:e.target.value}))} placeholder={ph}
style={{background:C.layer2,border:`1px solid ${C.line}`,borderRadius:8,padding:‘9px 10px’,color:C.snow,fontSize:11}}/>
))}
</div>
<div style={{display:‘flex’,gap:6,marginBottom:8}}>
{[[‘buy’,‘شراء’,C.mint],[‘hold’,‘احتفاظ’,C.amber],[‘sell’,‘بيع’,C.coral]].map(([v,l,c])=>(
<button key={v} onClick={()=>setNewRec(p=>({…p,rec:v}))} style={{flex:1,padding:‘8px’,borderRadius:8,border:`1px solid ${newRec.rec===v?c:C.line}`,background:newRec.rec===v?`${c}20`:C.layer2,color:newRec.rec===v?c:C.smoke,fontSize:11,cursor:‘pointer’}}>{l}</button>
))}
</div>
<textarea value={newRec.text} onChange={e=>setNewRec(p=>({…p,text:e.target.value}))} placeholder=‘ملاحظات التحليل…’
style={{width:‘100%’,background:C.layer2,border:`1px solid ${C.line}`,borderRadius:8,padding:‘9px 10px’,color:C.snow,fontSize:11,minHeight:70,resize:‘none’,marginBottom:8}}/>
<button onClick={addRecord} disabled={!newRec.sym||!newRec.name} style={{width:‘100%’,padding:‘12px’,borderRadius:10,border:‘none’,background:newRec.sym&&newRec.name?C.electric:’#1a1a2e’,color:newRec.sym&&newRec.name?C.void:C.ash,fontWeight:800,fontSize:13,cursor:newRec.sym&&newRec.name?‘pointer’:‘not-allowed’}}>
حفظ + مزامنة السحابة
</button>
</div>
</div>
)}
{tab===‘insights’ && (
<div style={{animation:‘fadeIn .3s ease’}}>
<div style={{display:‘flex’,gap:8,marginBottom:12}}>
<button onClick={runAnalysis} disabled={loading||records.length<3} style={{flex:1,padding:‘12px 14px’,borderRadius:10,border:‘none’,background:records.length>=3?`linear-gradient(135deg,${C.violet},${C.electric})`:’#1a1a2e’,color:records.length>=3?C.snow:C.ash,fontWeight:700,fontSize:12,cursor:records.length>=3?‘pointer’:‘not-allowed’,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,gap:6}}>
{loading?<><div style={{width:14,height:14,borderRadius:‘50%’,border:‘2px solid rgba(255,255,255,0.3)’,borderTopColor:‘white’,animation:‘spin .8s linear infinite’}}/>‘جاري التحليل…’</>:<><IBrain/>تحليل ذاتي</>}
</button>
{analysis&&<button onClick={()=>setAnalysis(’’)} style={{padding:‘12px 14px’,borderRadius:10,border:`1px solid ${C.line}`,background:C.layer2,color:C.smoke,fontSize:11,cursor:‘pointer’}}>مسح</button>}
</div>
{loading&&!analysis&&(
<div style={{display:‘flex’,flexDirection:‘column’,gap:8}}>
{[80,95,70,85,60].map((w,i)=>(
<div key={i} style={{height:11,width:`${w}%`,borderRadius:6,background:`linear-gradient(90deg,${C.layer2},${C.layer3})`,animation:‘pulse 1.5s ease infinite’,animationDelay:`${i*0.1}s`}}/>
))}
</div>
)}
{analysis&&(
<div style={{background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,border:`1px solid ${C.edge}`,borderRadius:12,padding:‘14px’}}>
{analysis.split(’\n’).map((line,i)=>{
const t=line.trim();
if(!t) return <div key={i} style={{height:6}}/>;
if(/^**(.+)**/.test(t)) return <div key={i} style={{display:‘flex’,alignItems:‘center’,gap:6,margin:‘10px 0 4px’,fontSize:12,fontWeight:800,color:C.electric}}><IZap/>{t.replace(/**/g,’’)}</div>;
if(t.startsWith(’- ’)) return <div key={i} style={{display:‘flex’,gap:8,marginBottom:4,fontSize:11,color:C.mist,lineHeight:1.6}}><span style={{color:C.violet,flexShrink:0}}>•</span>{t.slice(2)}</div>;
return <p key={i} style={{fontSize:11,color:C.mist,lineHeight:1.7,margin:‘0 0 3px’}}>{t}</p>;
})}
{loading&&<span style={{display:‘inline-block’,width:2,height:13,background:C.electric,animation:‘pulse .8s infinite’}}/>}
</div>
)}
{!analysis&&!loading&&(
<div style={{textAlign:‘center’,padding:‘40px 16px’}}>
<div style={{width:60,height:60,borderRadius:16,margin:‘0 auto 12px’,background:`${C.violet}15`,border:`1px solid ${C.violet}30`,display:‘flex’,alignItems:‘center’,justifyContent:‘center’,color:C.violet}}><IBrain/></div>
<div style={{fontSize:13,fontWeight:700,color:C.mist,marginBottom:6}}>التحليل الذاتي</div>
<div style={{fontSize:11,color:C.smoke}}>{records.length<3?`أضف ${3-records.length} تحليلات للبدء`:‘اضغط لتشغيل التحليل’}</div>
</div>
)}
</div>
)}
</div>
</div>
);
}
