"use client";
import { useState, useRef, useCallback } from “react”;

const C = {
ink:”#06080f”,deep:”#090c16”,void:”#0c1020”,
layer1:”#16202e”,layer2:”#1c2640”,layer3:”#222d4a”,
edge:”#2a3858”,line:”#32426a”,
snow:”#f0f6ff”,mist:”#c8d8f0”,smoke:”#90a4c8”,ash:”#5a6e94”,
gold:”#f0c050”,goldL:”#ffd878”,goldD:”#c09030”,
electric:”#4d9fff”,electricL:”#82c0ff”,
plasma:”#a78bfa”,mint:”#1ee68a”,coral:”#ff5f6a”,
amber:”#fbbf24”,teal:”#22d3ee”,
};

const SEC: Record<string,string> = {
“طاقة”:C.amber,“بنوك”:C.electric,“بتروكيم”:C.plasma,
“تقنية”:C.teal,“غذاء”:C.mint,“تعدين”:C.gold,
“عقارات”:C.coral,“بناء”:”#84cc16”,“تأمين”:C.electricL,
};

const STOCKS = [
{sym:“2222”,name:“أرامكو”,sec:“طاقة”,p:27.08,ch:-0.18,pe:19.9,eps:1.36,pb:3.8,div:4.2,roe:25.8,net_margin:26.4,fcf:85,debt_eq:0.31,rev:1300,beta:0.72,hi52:32.40,lo52:24.64,avgVol:“18.2M”,vol:“12.4M”,cap:“6.7T”,desc:“أكبر شركة نفط في العالم. إيرادات مرتبطة بأسعار النفط. توزيعات ثابتة 4%+.”},
{sym:“1120”,name:“الراجحي”,sec:“بنوك”,p:102.0,ch:1.20,pe:16.6,eps:6.14,pb:3.5,div:3.1,roe:23.1,net_margin:42.8,fcf:null,debt_eq:null,rev:22.4,beta:0.91,hi52:115.6,lo52:84.2,avgVol:“5.8M”,vol:“4.1M”,cap:“384B”,desc:“أكبر بنك إسلامي عالمياً. حصة 30%+ في التجزئة السعودية.”},
{sym:“2010”,name:“سابك”,sec:“بتروكيم”,p:63.10,ch:-0.48,pe:123.7,eps:0.51,pb:1.4,div:1.6,roe:1.8,net_margin:2.1,fcf:-2.4,debt_eq:0.68,rev:148,beta:1.12,hi52:84.5,lo52:58.2,avgVol:“2.4M”,vol:“1.8M”,cap:“252B”,desc:“ثاني أكبر بتروكيماويات عالمياً. ضغط هوامش شديد. FCF سلبي.”},
{sym:“1010”,name:“الرياض”,sec:“بنوك”,p:28.40,ch:0.35,pe:10.0,eps:2.84,pb:1.5,div:4.2,roe:15.8,net_margin:37.2,fcf:null,debt_eq:null,rev:12.1,beta:0.88,hi52:33.8,lo52:24.1,avgVol:“4.1M”,vol:“3.2M”,cap:“213B”,desc:“أحد أقدم البنوك السعودية. نمو في محفظة القروض العقارية.”},
{sym:“2350”,name:“المراعي”,sec:“غذاء”,p:42.44,ch:0.24,pe:23.3,eps:1.82,pb:3.9,div:2.4,roe:17.4,net_margin:11.8,fcf:1.2,debt_eq:0.44,rev:18.2,beta:0.54,hi52:48.2,lo52:36.6,avgVol:“3.1M”,vol:“2.8M”,cap:“159B”,desc:“الشركة الغذائية الأولى في الشرق الأوسط. طبيعة دفاعية.”},
{sym:“7010”,name:“STC”,sec:“تقنية”,p:42.44,ch:0.52,pe:13.6,eps:3.12,pb:2.8,div:5.8,roe:22.4,net_margin:18.4,fcf:8.2,debt_eq:0.52,rev:69.8,beta:0.67,hi52:51.4,lo52:38.2,avgVol:“5.2M”,vol:“4.2M”,cap:“952B”,desc:“أكبر شركة اتصالات سعودية. استثمارات 5G. توزيعات 5.8%.”},
{sym:“1211”,name:“معادن”,sec:“تعدين”,p:69.55,ch:0.07,pe:24.5,eps:2.84,pb:2.6,div:1.8,roe:11.2,net_margin:14.2,fcf:2.1,debt_eq:0.71,rev:28.4,beta:1.24,hi52:82.4,lo52:58.4,avgVol:“2.8M”,vol:“2.1M”,cap:“262B”,desc:“أكبر شركة تعدين في الشرق الأوسط. ذهب + فوسفات + ألومنيوم.”},
{sym:“2082”,name:“أكوا باور”,sec:“طاقة”,p:167.1,ch:0.80,pe:54.9,eps:3.04,pb:6.4,div:0.9,roe:12.5,net_margin:28.6,fcf:1.8,debt_eq:2.84,rev:12.8,beta:0.82,hi52:214.0,lo52:140.2,avgVol:“1.4M”,vol:“0.98M”,cap:“122B”,desc:“رائدة في تحلية المياه والطاقة المتجددة. عقود طويلة الأمد.”},
{sym:“4030”,name:“دار الأركان”,sec:“عقارات”,p:14.20,ch:-0.30,pe:12.0,eps:1.18,pb:1.0,div:5.6,roe:9.2,net_margin:22.4,fcf:0.8,debt_eq:1.12,rev:6.8,beta:1.38,hi52:18.8,lo52:11.6,avgVol:“7.2M”,vol:“5.6M”,cap:“48B”,desc:“أكبر مطور عقاري مدرج. مشاريع في الرياض ومكة وجدة.”},
{sym:“4200”,name:“أسمنت العربية”,sec:“بناء”,p:52.00,ch:1.10,pe:18.5,eps:2.81,pb:2.6,div:3.8,roe:14.6,net_margin:38.2,fcf:0.6,debt_eq:0.18,rev:2.4,beta:0.94,hi52:61.4,lo52:42.8,avgVol:“1.6M”,vol:“1.2M”,cap:“52B”,desc:“أكفأ شركات الأسمنت في السعودية. هامش 38% استثنائي.”},
];

const TYPES = [
{id:“comprehensive”,label:“تحليل شامل”,icon:“🔬”,badge:“PRO”,desc:“كلي · أساسي · فني · مشاعر”,color:C.gold},
{id:“technical”,label:“تحليل فني”,icon:“📈”,desc:“SMC · فيبوناتشي · مستويات”,color:C.electric},
{id:“fundamental”,label:“أساسي”,icon:“💎”,desc:“DCF · Graham · Moat”,color:C.mint},
{id:“smart_money”,label:“أموال ذكية”,icon:“🎯”,desc:“Wyckoff · OB · FVG”,color:C.plasma},
{id:“macro”,label:“الكلي”,icon:“🌍”,desc:“رؤية 2030 · نفط · فائدة”,color:C.teal},
{id:“sentiment”,label:“المشاعر”,icon:“🧠”,desc:“دورة عواطف · Contrarian”,color:C.amber},
];

function dataBlock(s: any) {
const pos = Math.round((s.p - s.lo52) / (s.hi52 - s.lo52) * 100);
const volR = Math.round(parseFloat(s.vol) / parseFloat(s.avgVol) * 100);
return `═══ ${s.name} (${s.sym}) — ${s.sec} ═══\n${s.desc}\n▸ السعر: ${s.p} | ${s.ch > 0 ? "+" : ""}${s.ch}% | 52أسبوع: ${s.lo52}→${s.hi52} | موقع: ${pos}%\n▸ P/E ${s.pe} | P/B ${s.pb} | EPS ${s.eps} | Cap ${s.cap}\n▸ ROE ${s.roe}% | هامش ${s.net_margin}% | FCF ${s.fcf ?? "N/A"} | D/E ${s.debt_eq ?? "بنوك"} | Beta ${s.beta}\n▸ توزيعات: ${s.div}% | حجم: ${s.vol} (${volR}% من ${s.avgVol})`;
}

const SYSTEMS: Record<string,string> = {
comprehensive: “أنت كبير المحللين في صندوق استثماري سعودي. قدّم تحليلاً شاملاً يجمع الأساسي والفني والكلي والنفسي. أسلوبك موضوعي مدعوم بأرقام، وضّح افتراضاتك، حدد مستوى ثقتك %.”,
technical: “أنت محلل فني متخصص في تداول السعودي يستخدم SMC. حلّل هيكل السوق ومناطق الطلب/العرض وفيبوناتشي. فرّق بين الاستنتاجات والتوقعات.”,
fundamental: “أنت محلل أساسي متخصص بتقييم شركات تداول. طبّق DCF بافتراضات محافظة، قيّم Moat، قارن بالقطاع.”,
smart_money: “أنت محلل تدفقات رأس المال. طبّق Wyckoff وحلّل نشاط الأموال الكبيرة. حدد OB وFVG المحتملة.”,
macro: “أنت محلل اقتصادي كلي متخصص بالاقتصاد السعودي. اربط النفط وأوبك+ ورؤية 2030 والساما.”,
sentiment: “أنت محلل مشاعر السوق. اقرأ الحالة النفسية من البيانات الكمية وطبّق التمويل السلوكي.”,
};

function buildPrompt(s: any, type: string) {
const base = dataBlock(s);
const pos = Math.round((s.p - s.lo52) / (s.hi52 - s.lo52) * 100);
const volR = Math.round(parseFloat(s.vol) / parseFloat(s.avgVol) * 100);
const fib = s.hi52 - s.lo52;
const f = (r: number) => (s.lo52 + fib * r).toFixed(2);
const map: Record<string,string> = {
comprehensive: `${base}\n\n**الخلاصة التنفيذية** (التوصية + مستوى الثقة %)\n\n**التحليل الأساسي**\n- P/E ${s.pe} و P/B ${s.pb}: رخيص/عادل/غالٍ؟\n- ROE ${s.roe}% + هامش ${s.net_margin}%\n- القيمة العادلة: P/E مستهدف × EPS ${s.eps}\n\n**التحليل الفني**\n- موقع ${pos}% من القاع\n- فيبوناتشي: 23.6%=${f(.236)} | 38.2%=${f(.382)} | 61.8%=${f(.618)}\n- الحجم ${volR}%\n\n**المخاطر** (5 مرتبة)\n\n**التوصية** دخول | هدف 1 | هدف 2 | وقف | الأفق`,
technical: `${base}\n\n**هيكل السوق** موقع ${pos}%\n\n**فيبوناتشي**\n23.6%=${f(.236)} | 38.2%=${f(.382)} | 50%=${f(.5)} | 61.8%=${f(.618)} | 78.6%=${f(.786)}\n\n**مناطق الطلب والعرض**\n\n**الحجم** ${volR}%\n\n**نقاط التداول** دخول | وقف | هدف 1 | هدف 2`,
fundamental: `${base}\n\n**Moat الاقتصادي**\n\n**التقييم**\n- P/E ${s.pe} و P/B ${s.pb} مع ROE ${s.roe}%\n${s.fcf != null ? `- FCF ${s.fcf}B` : "- بنوك: Price/Book"}\n\n**جودة الأرباح** EPS ${s.eps} + توزيعات ${s.div}%\n\n**التوصية** القيمة العادلة | هامش الأمان`,
smart_money: `${base}\n\n**الحجم** ${volR}% — تراكم أم توزيع?\n\n**Wyckoff** موقع ${pos}%\nBSL: ${s.hi52} | SSL: ${s.lo52}\nOB صعودي: ${f(.236)} | OB هبوطي: ${f(.786)}\n\n**استراتيجية** دخول | وقف | R:R`,
macro: `${base}\n\n**محركات ${s.sec}** النفط، الفائدة، الدولار\n\n**رؤية 2030** موقع ${s.name}\n\n**سيناريوهات** نفط↑ / نفط↓ / رفع فائدة / خفض فائدة\n\n**التوقعات** أساسي | متفائل | متشائم`,
sentiment: `${base}\n\n**المشاعر** حجم ${volR}%، موقع ${pos}%\n\n**التحيزات** Anchoring/Herding\n\n**دورة العواطف** الموقع الحالي\n\n**التوصية السيكولوجية**`,
};
return map[type] || map.comprehensive;
}

function Skel({ w = “100%”, h = 10, r = 5 }: { w?: string|number, h?: number, r?: number }) {
return <div style={{ width: w, height: h, borderRadius: r, background: `linear-gradient(90deg,${C.layer2},${C.layer3},${C.layer2})`, backgroundSize: “200% 100%”, animation: “shimmer 1.4s ease-in-out infinite” }} />;
}

function Sparkline({ pos, color }: { pos: number, color: string }) {
const pts = [0.78,0.82,0.80,0.85,0.83,0.87,0.85,0.90,0.88,0.92,0.89,0.94,pos/100];
const mn = Math.min(…pts), mx = Math.max(…pts), rng = mx - mn || 0.01;
const W = 100, H = 24, pad = 2;
const px = (i: number) => pad + (i / (pts.length - 1)) * (W - pad * 2);
const py = (v: number) => H - pad - ((v - mn) / rng) * (H - pad * 2);
const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(” “);
const lx = px(pts.length - 1), ly = py(pts[pts.length - 1]);
return (
<svg width={W} height={H} style={{ overflow: “visible” }}>
<defs>
<linearGradient id={`sg${pos}`} x1=“0” y1=“0” x2=“0” y2=“1”>
<stop offset="0%" stopColor={color} stopOpacity="0.25" />
<stop offset="100%" stopColor={color} stopOpacity="0" />
</linearGradient>
</defs>
<path d={`${d} L${lx},${H} L${pad},${H} Z`} fill={`url(#sg${pos})`} />
<path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
<circle cx={lx} cy={ly} r="3" fill={color} />
</svg>
);
}

function Result({ text, streaming }: { text: string, streaming: boolean }) {
if (!text) return null;
return (
<div style={{ direction: “rtl”, fontFamily: “Cairo,sans-serif” }}>
{text.split(”\n”).map((line, i) => {
const t = line.trim();
if (!t) return <div key={i} style={{ height: 8 }} />;
if (/^**(.+)**$/.test(t)) return (
<div key={i} style={{ display: “flex”, alignItems: “center”, gap: 8, marginTop: i > 0 ? 18 : 0, marginBottom: 6 }}>
<div style={{ width: 3, height: 16, borderRadius: 2, background: `linear-gradient(${C.gold},${C.goldD})`, flexShrink: 0 }} />
<span style={{ fontSize: 13, fontWeight: 900, color: C.gold }}>{t.replace(/**/g, “”)}</span>
</div>
);
if (t.startsWith(”- “) || t.startsWith(”• “)) return (
<div key={i} style={{ display: “flex”, gap: 8, marginBottom: 5 }}>
<div style={{ width: 4, height: 4, borderRadius: “50%”, background: C.electric, marginTop: 8, flexShrink: 0 }} />
<span style={{ fontSize: 12, color: C.mist, lineHeight: 1.65 }}>{t.slice(2)}</span>
</div>
);
return <p key={i} style={{ fontSize: 12, color: C.mist, lineHeight: 1.7, margin: “0 0 4px” }}>{t}</p>;
})}
{streaming && <span style={{ display: “inline-block”, width: 2, height: 14, background: C.electric, marginRight: 4, verticalAlign: “middle”, animation: “blink .7s ease-in-out infinite” }} />}
</div>
);
}

export default function Home() {
const [stock, setStock] = useState(STOCKS[0]);
const [type, setType] = useState(“comprehensive”);
const [result, setResult] = useState(””);
const [status, setStatus] = useState(“idle”);
const [errMsg, setErrMsg] = useState(””);
const [open, setOpen] = useState(false);
const [srchQ, setSrchQ] = useState(””);
const [words, setWords] = useState(0);
const abortRef = useRef<AbortController | null>(null);

const selType = TYPES.find(t => t.id === type) || TYPES[0];
const sc = SEC[stock.sec] || C.electric;
const isUp = stock.ch >= 0;
const chColor = isUp ? C.mint : C.coral;
const isLoad = status === “loading”;
const isDone = status === “done”;
const isErr = status === “error”;
const hasRes = result.length > 0;
const pos = Math.round((stock.p - stock.lo52) / (stock.hi52 - stock.lo52) * 100);

const cancel = () => { if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; } };

const run = useCallback(async () => {
cancel();
const ctrl = new AbortController();
abortRef.current = ctrl;
setStatus(“loading”); setResult(””); setErrMsg(””); setWords(0);
try {
const response = await fetch(”/api/claude”, {
method: “POST”,
headers: { “content-type”: “application/json” },
signal: ctrl.signal,
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 2000,
stream: true,
system: SYSTEMS[type] || SYSTEMS.comprehensive,
messages: [{ role: “user”, content: buildPrompt(stock, type) }],
}),
});
if (!response.ok) {
const t = await response.text().catch(() => “”);
if (response.status === 429) throw new Error(“RATE_LIMIT”);
throw new Error(“HTTP “ + response.status + “: “ + t.slice(0, 150));
}
const reader = response.body!.getReader();
const decoder = new TextDecoder();
let full = “”, buf = “”;
while (true) {
const { done, value } = await reader.read();
if (done) break;
buf += decoder.decode(value, { stream: true });
const lines = buf.split(”\n”);
buf = lines.pop() || “”;
for (const line of lines) {
if (!line.startsWith(“data:”)) continue;
const raw = line.slice(5).trim();
if (raw === “[DONE]”) continue;
try {
const t = JSON.parse(raw)?.delta?.text || “”;
if (t) { full += t; setResult(full); setWords(Math.round(full.length / 4)); }
} catch {}
}
}
setStatus(“done”);
} catch (e: any) {
if (e.name === “AbortError”) { setStatus(“idle”); return; }
setErrMsg(e.message === “RATE_LIMIT” ? “وصلت للحد الأقصى. انتظر دقيقة.” : `خطأ: ${e.message}`);
setStatus(“error”);
}
}, [stock, type]);

const changeStock = (s: any) => { cancel(); setStock(s); setResult(””); setStatus(“idle”); setErrMsg(””); setOpen(false); setSrchQ(””); setWords(0); };
const changeType = (id: string) => { cancel(); setType(id); setResult(””); setStatus(“idle”); setErrMsg(””); setWords(0); };
const reset = () => { cancel(); setResult(””); setStatus(“idle”); setErrMsg(””); setWords(0); };
const filtered = srchQ.trim() ? STOCKS.filter(s => s.name.includes(srchQ) || s.sym.includes(srchQ)) : STOCKS;

return (
<div style={{ minHeight: “100vh”, background: C.ink, direction: “rtl”, fontFamily: “Cairo,‘Segoe UI’,sans-serif”, color: C.snow }}>
<style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap'); @keyframes spin{to{transform:rotate(360deg);}} @keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}} @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.7);}} @keyframes dropDown{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}} @keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}} @keyframes cardIn{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}} @keyframes fadeIn{from{opacity:0;}to{opacity:1;}} *{box-sizing:border-box;margin:0;padding:0;} button{font-family:inherit;} .run-btn:hover{filter:brightness(1.18);transform:translateY(-2px);} .run-btn:active{filter:brightness(.93);transform:translateY(0) scale(.98);} .tc-card:hover{filter:brightness(1.12);transform:translateY(-1px);} .tc-card:active{transform:scale(.97);} .dr-row:hover{background:rgba(240,192,80,.08)!important;} button:focus-visible{outline:2px solid ${C.gold}55;outline-offset:2px;} ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:${C.edge};border-radius:2px;} input::placeholder{color:${C.ash};}`}</style>

```
  {/* HEADER */}
  <div style={{ padding: "14px 16px 12px", background: `linear-gradient(160deg,${C.layer2},${C.layer1},${C.deep})`, borderBottom: `1px solid ${C.line}`, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle,${C.gold}15,transparent 70%)`, pointerEvents: "none" }} />
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${C.gold}50,${C.electric}50,transparent)`, pointerEvents: "none" }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${C.gold}35,${C.goldD}18)`, border: `1px solid ${C.gold}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, boxShadow: `0 4px 20px ${C.gold}35` }}>🔬</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.snow, letterSpacing: "-.3px" }}>تداول+ · تحليل AI</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.mint, boxShadow: `0 0 6px ${C.mint}`, animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, color: C.mint, fontWeight: 600 }}>Claude Sonnet · ذكاء اصطناعي</span>
          </div>
        </div>
      </div>
      <div style={{ background: `linear-gradient(135deg,${C.electric}22,${C.electric}0d)`, border: `1px solid ${C.electric}44`, borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: C.electric }}>6 أنواع</div>
    </div>
  </div>

  <div style={{ padding: "14px 14px 100px" }}>

    {/* PICKER */}
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: C.smoke, marginBottom: 7, fontWeight: 700, letterSpacing: "1.5px" }}>السهم</div>
      <div style={{ position: "relative" }}>
        <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `linear-gradient(135deg,${C.layer1},${C.layer2})`, border: `1px solid ${open ? sc + "60" : C.line}`, borderRadius: 14, cursor: "pointer", outline: "none", boxShadow: open ? `0 0 0 2px ${sc}20,0 8px 24px rgba(0,0,0,.35)` : `0 4px 14px rgba(0,0,0,.2)`, transition: "all .2s" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg,${sc}30,${sc}12)`, border: `1px solid ${sc}60`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: sc }}>{stock.sym}</span>
            <span style={{ fontSize: 8, color: C.smoke, marginTop: 1 }}>{stock.sec}</span>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.snow }}>{stock.name}</div>
            <div style={{ fontSize: 10, color: C.smoke, marginTop: 2 }}>P/E {stock.pe} · توزيع {stock.div}%</div>
          </div>
          <div style={{ textAlign: "left", flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.snow, direction: "ltr" }}>{stock.p}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: chColor, direction: "ltr" }}>{isUp ? "+" : ""}{stock.ch}%</div>
          </div>
          <div style={{ color: C.smoke, fontSize: 11, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▼</div>
        </button>
        {open && (<>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => { setOpen(false); setSrchQ(""); }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, background: C.layer1, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden", boxShadow: `0 20px 56px rgba(0,0,0,.7)`, animation: "dropDown .18s cubic-bezier(.16,1,.3,1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderBottom: `1px solid ${C.edge}`, background: C.void }}>
              <span style={{ fontSize: 12, color: C.smoke }}>🔍</span>
              <input value={srchQ} onChange={e => setSrchQ(e.target.value)} placeholder="ابحث..." autoFocus style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.snow, fontSize: 11, direction: "rtl", fontFamily: "Cairo,sans-serif" }} />
              {srchQ && <button onClick={() => setSrchQ("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.smoke, fontSize: 15 }}>×</button>}
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {filtered.map((s, i) => {
                const sc2 = SEC[s.sec] || C.electric;
                const active = s.sym === stock.sym;
                return (
                  <button key={s.sym} onClick={() => changeStock(s)} className="dr-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: active ? `${C.gold}10` : "none", borderBottom: i < filtered.length - 1 ? `1px solid ${C.edge}` : "none", border: "none", cursor: "pointer", textAlign: "right" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${sc2}20`, border: `1px solid ${sc2}44`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: sc2 }}>{s.sym}</span>
                      <span style={{ fontSize: 7, color: C.smoke, marginTop: 1 }}>{s.sec}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? C.gold : C.snow, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: C.smoke }}>P/E {s.pe} · {s.div}%</div>
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.snow }}>{s.p}</div>
                      <div style={{ fontSize: 10, color: s.ch >= 0 ? C.mint : C.coral, direction: "ltr" }}>{s.ch >= 0 ? "+" : ""}{s.ch}%</div>
                    </div>
                    {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </>)}
      </div>
    </div>

    {/* METRICS */}
    <div style={{ marginBottom: 16, borderRadius: 14, overflow: "hidden", background: `linear-gradient(135deg,${C.layer1},${C.layer2})`, border: `1px solid ${sc}35`, animation: "cardIn .28s cubic-bezier(.16,1,.3,1)" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${sc},${sc}55,transparent)` }} />
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: isUp ? `${C.mint}18` : `${C.coral}18`, border: `1px solid ${chColor}44`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 800, color: chColor }}>{isUp ? "▲" : "▼"} {Math.abs(stock.ch)}%</div>
            <div style={{ fontSize: 10, color: C.smoke }}>{stock.sec}</div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.snow, letterSpacing: "-1px", direction: "ltr" }}>{stock.p}</div>
            <div style={{ fontSize: 10, color: C.smoke }}>ريال سعودي</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "6px 8px", background: C.void, borderRadius: 8, border: `1px solid ${C.edge}` }}>
          <div style={{ fontSize: 10, color: C.ash }}>30 يوماً</div>
          <Sparkline pos={pos} color={pos > 50 ? C.mint : C.coral} />
          <div style={{ fontSize: 11, fontWeight: 700, color: pos > 50 ? C.mint : C.coral }}>{pos > 50 ? "↑" : "↓"} {pos}%</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: C.edge, borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
          {[{ l: "P/E", v: String(stock.pe), alert: stock.pe > 50 }, { l: "ROE", v: `${stock.roe}%` }, { l: "توزيع", v: `${stock.div}%` }, { l: "P/B", v: String(stock.pb) }, { l: "Beta", v: String(stock.beta) }, { l: "حجم", v: stock.vol }].map(m => (
            <div key={m.l} style={{ background: C.layer1, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: (m as any).alert ? C.coral : C.snow }}>{m.v}{(m as any).alert ? " ⚠" : ""}</div>
              <div style={{ fontSize: 10, color: C.ash, marginTop: 2 }}>{m.l}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: C.ash }}>أدنى {stock.lo52}</span>
            <span style={{ fontSize: 10, color: C.smoke, fontWeight: 600 }}>{pos}%</span>
            <span style={{ fontSize: 10, color: C.ash }}>أعلى {stock.hi52}</span>
          </div>
          <div style={{ height: 5, background: C.edge, borderRadius: 3, overflow: "hidden", direction: "ltr" }}>
            <div style={{ height: "100%", width: `${pos}%`, background: `linear-gradient(90deg,${sc}aa,${sc})`, borderRadius: 3, transition: "width .45s ease" }} />
          </div>
        </div>
      </div>
    </div>

    {/* TYPES */}
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: C.smoke, marginBottom: 8, fontWeight: 700, letterSpacing: "1.5px" }}>نوع التحليل</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {TYPES.map((t) => {
          const sel = type === t.id; const tc = t.color;
          return (
            <button key={t.id} onClick={() => changeType(t.id)} className="tc-card" style={{ ...(t.badge ? { gridColumn: "1/-1", flexDirection: "row" as const, alignItems: "center", gap: 12, padding: "11px 14px" } : { flexDirection: "column" as const, padding: "10px 8px" }), display: "flex", textAlign: "right", background: sel ? `linear-gradient(135deg,${tc}28,${tc}12)` : `linear-gradient(135deg,${C.layer1},${C.layer2})`, border: `1px solid ${sel ? tc + "55" : C.line}`, borderRadius: 12, cursor: "pointer", boxShadow: sel ? `0 4px 18px ${tc}25` : "none", transition: "all .15s", outline: "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: sel ? `${tc}28` : C.layer3, border: sel ? `1px solid ${tc}44` : `1px solid ${C.edge}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: t.badge ? 0 : 8 }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: sel ? 800 : 600, color: sel ? tc : C.mist }}>{t.label}</div>
                <div style={{ fontSize: 10, color: sel ? C.smoke : C.ash, marginTop: 2, lineHeight: 1.3 }}>{t.desc}</div>
              </div>
              {t.badge && <div style={{ flexShrink: 0, fontSize: 9, fontWeight: 900, color: C.gold, background: "rgba(60,42,0,.92)", padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.gold}55` }}>{t.badge}</div>}
            </button>
          );
        })}
      </div>
    </div>

    {/* RUN */}
    {status === "idle" && <button onClick={run} className="run-btn" style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg,${selType.color}40,${selType.color}22)`, border: `2px solid ${selType.color}80`, borderRadius: 14, cursor: "pointer", outline: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: `0 6px 28px ${selType.color}30`, transition: "all .15s", minHeight: 52 }}><span style={{ fontSize: 20 }}>{selType.icon}</span><span style={{ fontSize: 14, fontWeight: 800, color: selType.color }}>ابدأ {selType.label}</span><span style={{ fontSize: 13, color: selType.color, opacity: .6 }}>←</span></button>}

    {/* LOADING */}
    {isLoad && !hasRes && (
      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${selType.color}35`, background: `linear-gradient(135deg,${C.layer1},${C.layer2})` }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.edge}`, background: `linear-gradient(135deg,${C.void},${C.deep})`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid transparent", borderTopColor: selType.color, animation: "spin .65s linear infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: selType.color }}>يحلل Claude {stock.name}…</span>
          </div>
          <span style={{ fontSize: 10, color: selType.color, background: `${selType.color}15`, border: `1px solid ${selType.color}33`, padding: "2px 8px", borderRadius: 6 }}>{selType.label}</span>
        </div>
        <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Skel w="65%" h={14} /><Skel w="90%" h={10} /><Skel w="82%" h={10} /><Skel w="55%" h={10} />
          <div style={{ height: 6 }} /><Skel w="50%" h={14} /><Skel w="86%" h={10} /><Skel w="72%" h={10} />
        </div>
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.edge}`, display: "flex", justifyContent: "center" }}>
          <button onClick={() => { cancel(); setStatus("idle"); }} style={{ padding: "7px 24px", background: "none", border: `1px solid ${C.line}`, borderRadius: 8, cursor: "pointer", fontSize: 11, color: C.smoke, minHeight: 36 }}>⏹ إيقاف</button>
        </div>
      </div>
    )}

    {/* RESULT */}
    {hasRes && (
      <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${isLoad ? selType.color + "44" : C.line}`, background: `linear-gradient(135deg,${C.layer1},${C.layer2})`, transition: "border-color .3s" }}>
        <div style={{ height: 2, background: `linear-gradient(90deg,${selType.color},${selType.color}55,transparent)` }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${C.edge}`, background: `linear-gradient(135deg,${C.void},${C.deep})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isDone ? <span style={{ fontSize: 13 }}>✅</span> : <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid transparent", borderTopColor: selType.color, animation: "spin .65s linear infinite" }} />}
            <span style={{ fontSize: 11, fontWeight: 700, color: isDone ? C.mint : selType.color }}>{isDone ? `اكتمل · ${words} كلمة` : "يكتب..."}</span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ fontSize: 10, color: selType.color, background: `${selType.color}18`, border: `1px solid ${selType.color}33`, padding: "2px 8px", borderRadius: 6 }}>{selType.label}</span>
            <span style={{ fontSize: 10, color: C.smoke, background: C.layer3, border: `1px solid ${C.line}`, padding: "2px 8px", borderRadius: 6 }}>{stock.sym}</span>
          </div>
        </div>
        <div style={{ padding: "14px" }}><Result text={result} streaming={isLoad} /></div>
        {isDone && (
          <div style={{ display: "flex", gap: 8, padding: "10px 14px 14px", borderTop: `1px solid ${C.edge}` }}>
            <button onClick={reset} style={{ flex: 1, padding: "10px", background: C.layer3, border: `1px solid ${C.line}`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.smoke, minHeight: 40 }}>× جديد</button>
            <button onClick={run} style={{ flex: 2, padding: "10px", background: `linear-gradient(135deg,${selType.color}28,${selType.color}14)`, border: `1px solid ${selType.color}44`, borderRadius: 10, cursor: "pointer", fontSize: 11, fontWeight: 800, color: selType.color, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40 }}>↺ أعد التحليل</button>
          </div>
        )}
      </div>
    )}

    {/* ERROR */}
    {isErr && (
      <div style={{ padding: 14, background: `${C.coral}10`, border: `1px solid ${C.coral}33`, borderRadius: 12, display: "flex", gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.coral, marginBottom: 4 }}>خطأ في التحليل</div>
          <div style={{ fontSize: 11, color: C.smoke, lineHeight: 1.55, wordBreak: "break-all" }}>{errMsg}</div>
          <button onClick={run} style={{ marginTop: 10, padding: "6px 16px", background: `${C.coral}18`, border: `1px solid ${C.coral}33`, borderRadius: 8, cursor: "pointer", fontSize: 11, color: C.coral, fontWeight: 700, minHeight: 36 }}>↺ أعد المحاولة</button>
        </div>
      </div>
    )}

    {/* EMPTY */}
    {status === "idle" && !hasRes && (
      <div style={{ marginTop: 12, padding: "28px 16px 24px", background: `linear-gradient(135deg,${C.layer1},${C.layer2})`, borderRadius: 16, border: `1px dashed ${C.line}`, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 14px", background: `linear-gradient(135deg,${C.electric}22,${C.electric}08)`, border: `1px solid ${C.electric}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.mist, marginBottom: 6 }}>اختر السهم ونوع التحليل</div>
        <div style={{ fontSize: 11, color: C.smoke, lineHeight: 1.6, marginBottom: 18 }}>20 مؤشر مالي · 6 أنواع تحليل · Claude Sonnet</div>
        <div style={{ padding: "8px 12px", background: `${C.amber}08`, border: `1px solid ${C.amber}20`, borderRadius: 8 }}>
          <span style={{ fontSize: 10, color: C.smoke }}>⚠️ للأغراض التعليمية فقط · ليس نصيحة استثمارية · CMA</span>
        </div>
      </div>
    )}

  </div>
</div>
```

);
}