'use client';
/**
 * AI SCREEN — تحليل الذكاء الاصطناعي
 * AILabTab v17 · 7 أنواع تحليل مؤسسي
 * مطابق 100٪ للملف الأصلي
 */

import { useState, useRef, useCallback } from "react";
import { STOCKS } from '../constants/stocksData';

// SVG Icons
const IconMicroscope = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
  </svg>
);
const IconTrendUp = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IconGem = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 18 3 22 9 12 22 2 9"/><polyline points="2 9 6 3"/><polyline points="22 9 18 3"/><line x1="12" y1="22" x2="12" y2="9"/><polyline points="2 9 12 9 22 9"/>
  </svg>
);
const IconTarget = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconGlobe = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconBrain = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.07-4.35A3 3 0 0 1 4.5 9.5a2.5 2.5 0 0 1 5-1Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.07-4.35A3 3 0 0 0 19.5 9.5a2.5 2.5 0 0 0-5-1Z"/>
  </svg>
);
const IconBarChart = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconLightbulb = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);
const IconSearch = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconCheck = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconWarn = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconClock = ({size=16,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const ICON_MAP = {
  "comprehensive": IconMicroscope,
  "technical": IconTrendUp,
  "fundamental": IconGem,
  "smart_money": IconTarget,
  "macro": IconGlobe,
  "sentiment": IconBrain,
};



/* ══════════════════════════════════════════════════════
   تداول+ · AILabTab v17
   Terminal Obsidian × Saudi Gold Design System
══════════════════════════════════════════════════════ */

/* ── palette ── */
const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#16202e", layer2:"#1c2640", layer3:"#222d4a",
  edge:"#2a3858", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878", goldD:"#c09030",
  electric:"#4d9fff", electricL:"#82c0ff",
  plasma:"#a78bfa", mint:"#1ee68a", coral:"#ff5f6a",
  amber:"#fbbf24", teal:"#22d3ee",
};

/* ── sector colors ── */
const SEC = {
  "طاقة":C.amber, "بنوك":C.electric, "بتروكيم":C.plasma,
  "تقنية":C.teal, "غذاء":C.mint, "تعدين":C.gold,
  "عقارات":C.coral, "بناء":"#84cc16", "تأمين":C.electricL,
};

/* ── stocks ── */


/* ── analysis types ── */
const TYPES = [
  {id:"comprehensive", label:"تحليل شامل",         icon:"comprehensive", badge:"PRO", desc:"GS · MS · BW · JPM · CIT · مشاعر",              color:C.gold},
  {id:"fundamental_combined", label:"التحليل الأساسي",   icon:"fundamental",   badge:"سا",  desc:"تقييم · قيمة عادلة · ميزة تنافسية · توزيعات", color:"#1a7fd4"},
  {id:"technical_combined",   label:"التحليل الفني",     icon:"technical",     badge:"مس",  desc:"مؤشرات · سيولة · دعوم · خطة تداول",      color:"#00b4d8"},
  {id:"risk_combined",        label:"إدارة المخاطر",       icon:"smart_money",   badge:"بر",  desc:"بيتا · أقصى هبوط · سيولة · تحوط",      color:"#9d4edd"},
  {id:"jpm_earnings",         label:"تحليل الأرباح",       icon:"macro",         badge:"جب", desc:"توقعات · تموضع · خطة الأرباح",              color:"#e63946"},
  {id:"macro_combined",       label:"الكلي والقطاعات",  icon:"macro",         badge:"سي", desc:"دورة اقتصادية · 11 قطاع · رؤية 2030",       color:"#ff9f1c"},
  {id:"sentiment",            label:"مشاعر السوق",       icon:"sentiment",              desc:"دورة عواطف · سلوك معاكس · تحيزات",   color:C.amber},
];

/* ══ PROMPT ENGINEERING ══ */
function dataBlock(s) {
  const pos  = Math.round((s.p - s.lo52) / (s.hi52 - s.lo52) * 100);
  const volR = Math.round(parseFloat(s.vol) / parseFloat(s.avgVol) * 100);
  return `═══ ${s.name} (${s.sym}) - ${s.sec} ═══
${s.desc}
▸ السعر: ${s.p} ريال | ${s.ch>0?"+":""}${s.ch}% | 52أسبوع: ${s.lo52}→${s.hi52} | موقع: ${pos}%
▸ تقييم: P/E ${s.pe} | P/B ${s.pb} | EPS ${s.eps} | القيمة السوقية ${s.cap}
▸ جودة: ROE ${s.roe}% | هامش ${s.net_margin}% | إيرادات ${s.rev}B | FCF ${s.fcf??'غير متاح'} | D/E ${s.debt_eq??'بنوك'} | Beta ${s.beta}
▸ توزيعات: ${s.div}% | حجم: ${s.vol} (${volR}% من متوسط ${s.avgVol})`;
}

const SYSTEMS = {
  // INSTITUTIONAL
  gs_fundamental:`You are a Senior Equity Research Analyst at Goldman Sachs Asset Management with 20 years experience covering $2T AUM. Write a comprehensive equity research note in the style of Goldman Sachs institutional research. Format as a research memo with an executive summary scorecard at the top. Be quantitative, cite specific numbers, state your assumptions clearly, and provide a conviction rating. Write in Arabic.`,
  ms_technical:`You are a Chief Technical Strategist at Morgan Stanley directing the largest trading desk. Write a complete technical analysis note in Morgan Stanley style with a clear trade plan summary at the top. Cover trend, support/resistance, moving averages, RSI, MACD, Bollinger Bands, volume, Fibonacci, and chart patterns. Provide specific entry, stop-loss, and two profit targets with R:R ratio. Write in Arabic.`,
  bw_risk:`You are a Senior Portfolio Risk Analyst at Bridgewater Associates trained on Ray Dalio's All Weather principles, managing risk for the world's largest hedge fund with $150B+ AUM. Write a comprehensive risk assessment memo in Bridgewater style with a risk dashboard table and portfolio-level recommendations. Write in Arabic.`,
  jpm_earnings:`You are a Senior Equity Research Analyst at JPMorgan Chase writing pre/post earnings analysis for institutional trading clients managing billions. Write a complete earnings analysis note in JPMorgan style with a decision summary and trading plan at the top. Write in Arabic.`,
  br_dividends:`You are a Senior Income Portfolio Strategist at BlackRock building dividend portfolios for pension funds and retirees seeking income that grows faster than inflation. Write a complete dividend income analysis in BlackRock style with a safety scorecard and 10-year income projection table. Write in Arabic.`,
  cit_rotation:`You are a Senior Macro Strategist at Citadel managing sector rotation strategies based on economic cycles, Fed policy, and relative strength across all 11 S&P 500 sectors. Write a comprehensive sector rotation memo in Citadel style with a ranking table, allocation recommendation, and ETF implementation guide. Write in Arabic.`,
  // ORIGINAL
  comprehensive:`أنت فريق تحليل متكامل يجمع خبرات Goldman Sachs وMorgan Stanley وBridgewater وJPMorgan وCitadel. قدّم تحليلاً شاملاً متكاملاً يغطي جميع الأبعاد: الأساسي + الفني + المخاطر + الأرباح + الكلي + المشاعر. أسلوبك موضوعي ولكل قسم استنتاج وأرقام وتوصية واضحة.`,
  technical:`أنت محلل فني متخصص في تداول السعودي يستخدم SMC. حلّل هيكل السوق ومناطق الطلب/العرض وفيبوناتشي. فرّق بين الاستنتاجات والتوقعات.`,
  fundamental:`أنت محلل أساسي متخصص بتقييم شركات تداول. طبّق DCF بافتراضات محافظة، قيّم Moat، قارن بالقطاع. وضّح افتراضاتك دائماً.`,
  smart_money:`أنت محلل تدفقات رأس المال. طبّق Wyckoff وحلّل نشاط الأموال الكبيرة. حدد OB وFVG المحتملة.`,
  macro:`أنت محلل اقتصادي كلي متخصص بالاقتصاد السعودي. اربط النفط وأوبك+ ورؤية 2030 والساما. قدّر الأثر الكمي على الشركة.`,
  sentiment:`أنت محلل مشاعر السوق. اقرأ الحالة النفسية من البيانات الكمية وطبّق نظريات التمويل السلوكي. حدد موقع السهم في دورة المشاعر.`,
};

function buildPrompt(s, type) {
  const base = dataBlock(s);
  const pos  = Math.round((s.p - s.lo52) / (s.hi52 - s.lo52) * 100);
  const volR = Math.round(parseFloat(s.vol) / parseFloat(s.avgVol) * 100);
  const fib  = s.hi52 - s.lo52;
  const f = (r) => (s.lo52 + fib * r).toFixed(2);

  const prompts = {
    // COMBINED TYPES
    fundamental_combined: `${base}

== تحليل أساسي متكامل ==
Goldman Sachs المستوى المؤسسي + تحليل أساسي تفصيلي

**[مربع GS Scorecard]**
| المؤشر | القيمة | التقييم |
|--------|--------|---------|
| التوصية | شراء/احتفاظ/تجنب | درجة القناعة % |
| P/E | ${s.pe} | رخيص/عادل/غالٍ |
| ROE | ${s.roe}% | قوي/متوسط/ضعيف |
| السعر المستهدف 12ش | ... ريال | هامش: ...% |

**1. نموذج العمل**
${s.name}: كيف تولد إيرادات ${s.rev}B وأين تكمن قوتها الحقيقية

**2. Moat الاقتصادي (قيّم 1-10)**
- قوة التسعير: ... | العلامة التجارية: ...
- صعوبة الاستبدال: ... | تأثير الشبكة: ...
- النتيجة: .../10

**3. تحليل الربحية**
- ROE ${s.roe}%: هل مستدام مقارنة بقطاع ${s.sec}?
- هامش صافي ${s.net_margin}%: قوي/متوسط/ضعيف للقطاع?
- EPS ${s.eps}: توجه النمو واستداميته

**4. قوة الميزانية**
- D/E: ${s.debt_eq ?? 'بنوك - P/B أنسب'}
- FCF: ${s.fcf ?? 'غير متاح'} | توزيعات ${s.div}%

**5. تحليل DCF وGraham**
- FCF Yield التقديري: ${s.fcf ?? 'N/A'} / القيمة السوقية ${s.cap}
- Graham Number: تقدير القيمة العادلة بنموذج Benjamin Graham
- P/E ${s.pe} × P/B ${s.pb}: العلاقة Graham (يجب < 22.5)

**6. التقييم مقارنة بالقطاع**
P/E ${s.pe} | P/B ${s.pb} | موقع ${pos}% في النطاق السنوي

**7. السيناريوهات (12 شهر)**
- متفائل: السعر المستهدف + المحفزات
- أساسي: السعر المستهدف + الافتراضات
- متشائم: سعر الدعم + المخاطر

**8. توصية GS النهائية**
شراء / احتفاظ / تجنب - درجة قناعة % - الأفق الزمني`,

    technical_combined: `${base}

== تحليل فني متكامل ==
Morgan Stanley المؤشرات الكلاسيكية + SMC والأموال الذكية

**[خطة التداول - MS Trade Plan]**
| | السعر | النسبة |
|--|------|--------|
| الدخول المقترح | ... | ... |
| وقف الخسارة | ... | ...% |
| هدف 1 | ... | ...% |
| هدف 2 | ... | ...% |
| R:R | | 1:... |

**1. هيكل السوق والاتجاه**
الموقع: ${pos}% من النطاق ${s.lo52}→${s.hi52}
اتجاه اليومي / الأسبوعي / الشهري

**2. الدعوم والمقاومات**
مستويات سعرية دقيقة مع أسباب أهميتها

**3. المتوسطات المتحركة**
MA20 / MA50 / MA100 / MA200 ومواقعها من السعر ${s.p}

**4. المؤشرات (RSI + MACD + Bollinger)**
- RSI: القراءة + تشبع شراء/بيع + Divergence?
- MACD: التقاطعات + زخم الهيستوغرام
- Bollinger: ضغط أم توسع؟ موقع السعر ${s.p}

**5. تحليل الحجم**
${s.vol} vs ${s.avgVol} = ${volR}%
الحجم يؤكد الاتجاه أم يناقضه؟

**6. فيبوناتشي الكامل**
النطاق: ${s.lo52}→${s.hi52} = ${(s.hi52-s.lo52).toFixed(2)} ريال
23.6%=${f(.236)} | 38.2%=${f(.382)} | 50%=${f(.5)} | 61.8%=${f(.618)} | 78.6%=${f(.786)}

**7. تحليل SMC والأموال الذكية**
- نقاط السيولة: BSL فوق ${s.hi52} | SSL تحت ${s.lo52}
- OB صعودي محتمل: ${f(.236)} | OB هبوطي: ${f(.786)}
- مرحلة Wyckoff المحتملة بناء على الموقع ${pos}%

**8. نموذج الشارت + خطة التداول**
تحديد النموذج إن وجد + دخول | وقف | هدف 1 | هدف 2 | R:R`,

    risk_combined: `${base}

== إدارة المخاطر - Bridgewater All Weather ==
تقييم مخاطر شامل بمبادئ Ray Dalio

**[داشبورد المخاطر]**
| مؤشر | القيمة | التقييم |
|--------|--------|---------|
| Beta | ${s.beta} | حساسية عالية/متوسطة/منخفضة |
| التذبذب | ... | مرتفع/متوسط/منخفض |
| درجة المخاطر | .../10 | |

**1. تحليل البيتا**
Beta ${s.beta}: تحرك ${s.beta}x مع السوق
صعودا: كم يكسب مقارنة بالسوق? | هبوطا: كم يخسر?

**2. تاريخ أقصى هبوط (Drawdown)**
السهم في ${pos}% من القاع ${s.lo52} - تقدير أسوأ سيناريو تاريخي

**3. مخاطر القطاع والتركز**
مخاطر الاعتماد على قطاع ${s.sec} - تنويع أم تركيز?

**4. حساسية الفائدة والساما**
Beta ${s.beta} وأثر تغييرات الفائدة على التقييم

**5. اختبار الركود**
تقدير الأثر في سيناريو انهيار مثل 2008 أو كوفيد
القاع التاريخي ${s.lo52} - هل يمكن الكسر?

**6. مخاطر السيولة**
الحجم ${s.vol} vs ${s.avgVol} - سهولة الخروج من المركز

**7. استراتيجيات التحوط**
توصيات Bridgewater: مراكز عكسية وخيارات حماية من النزول`,

    macro_combined: `${base}

== الاقتصاد الكلي وتدوير القطاعات ==
Citadel تدوير القطاعات + تحليل اقتصادي سعودي شامل

**[جدول ترتيب القطاعات]**
| القطاع | التوصية | السبب |
|--------|---------|-------|
| ${s.sec} | زيادة/محايد/تخفيض | ... |
| ... | ... | ... |

**1. وضع الدورة الاقتصادية**
أين نحن الآن: توسع / قمة / انكماش / قاع?
أثر ذلك على قطاع ${s.sec}

**2. محركات ${s.name} الكلية**
- الارتباط بأسعار النفط (مباشر/غير مباشر)
- حساسية الفائدة (Beta ${s.beta})
- تأثير الدولار والتضخم

**3. رؤية 2030 والقطاعات المستفيدة**
موقع ${s.name} في منظومة التحول الاقتصادي

**4. تحليل القطاعات السعودية الـ 11**
طاقة / بنوك / بتروكيم / تقنية / غذاء / تعدين / عقارات / بناء / تأمين / رعاية / ترفيه
لكل قطاع: توصية الوزن الآن

**5. سيناريوهات الاقتصاد الكلي**
نفط ↑ / نفط ↓ / رفع فائدة / خفض فائدة: أثر كل سيناريو على ${s.name}

**6. نموذج توزيع قطاعي Citadel مقترح**
نسب دقيقة لمحفظة سعودية محسّنة مع أفضل ETF لكل قطاع`,

    gs_fundamental: `${base}

-- GOLDMAN SACHS EQUITY RESEARCH NOTE --
ستايل: تقرير بحثي مؤسسي مختصر ومركّز للمؤسسات الكبيرة

**[مربع التقييم المختصر - GS Scorecard]**
| المؤشر | القيمة | التقييم |
|--------|--------|---------|
| التوصية | شراء/احتفاظ/تجنب | درجة القناعة % |
| السعر المستهدف 12 شهر | ... ريال | هامش: ...% |
| التقييم مقارنة بالقطاع | P/E ${s.pe} | رخيص/عادل/غالٍ |
| جودة الأرباح | EPS ${s.eps} | مستدام/معرض للخطر |

**1. ملخص نموذج العمل (3 أسطر فقط)**
${s.name}: كيف تولّد الإيرادات ${s.rev}B وأين تكمن قوتها الحقيقية

**2. Moat الاقتصادي (قيّم 1-10)**
- قوة التسعير: ...
- الميزة التنافسية: ...
- صعوبة الاستبدال: ...
- النتيجة: .../10

**3. جودة الإدارة**
- كفاءة توزيع رأس المال: ROE ${s.roe}% + توزيعات ${s.div}%
- هل التعويضات متوافقة مع مصالح المساهمين؟

**4. التقييم vs المنافسين**
- P/E ${s.pe} vs متوسط قطاع ${s.sec}
- P/B ${s.pb} مع ROE ${s.roe}%: هل العلاقة منطقية؟
- EV/EBITDA التقديري

**5. السيناريوهات (12 شهر)**
- متفائل: هدف سعر + المحفزات
- أساسي: هدف سعر + الافتراضات
- متشائم: هدف سعر + المخاطر الرئيسية

**6. توصية GS النهائية**
شراء / احتفاظ / تجنب - درجة قناعة % - الأفق الزمني`,

ms_technical: `${base}

-- MORGAN STANLEY TECHNICAL ANALYSIS --
ستايل: تحليل فني كلاسيكي بالمؤشرات + خطة تداول واضحة

**[خطة التداول - MS Trade Plan]**
| | السعر | النسبة |
|--|------|--------|
| الدخول المقترح | ... | ... |
| وقف الخسارة | ... | ...% |
| هدف 1 | ... | ...% |
| هدف 2 | ... | ...% |
| R:R | | 1:... |

**1. الاتجاه العام**
اليومي / الأسبوعي / الشهري - والموقع ${pos}% في النطاق السنوي

**2. المتوسطات المتحركة**
MA20 / MA50 / MA100 / MA200 ومواقعها من السعر ${s.p}
أي تقاطعات قادمة؟ (Golden Cross / Death Cross)

**3. RSI**
القراءة الحالية وتفسيرها
هل يوجد Divergence إيجابي أو سلبي؟

**4. MACD**
خط MACD vs Signal - الزخم الحالي
قراءة الهيستوغرام: تسارع أم تباطؤ؟

**5. Bollinger Bands**
موقع السعر ${s.p} - هل قريب من الحافة العلوية أم السفلية؟
ضغط (Squeeze) أم توسع؟

**6. تحليل الحجم**
${s.vol} vs ${s.avgVol} = ${volR}%
الحجم يؤكد الاتجاه أم يناقضه؟

**7. الدعوم والمقاومات الرئيسية**
مستويات دقيقة مع أسباب قوتها

**8. نموذج الشارت**
هل يوجد نموذج محدد يتشكل؟ (رأس وكتفين، قمتين، كوب...)`,

bw_risk: `${base}

-- BRIDGEWATER RISK ASSESSMENT MEMO --
-- All Weather Framework by Ray Dalio --

اكتب تقييم مخاطر كامل على ستايل Bridgewater:

**[داشبورد المخاطر]**
| مؤشر المخاطر | القيمة | التقييم |
|-------------|--------|---------|
| Beta | ${s.beta} | ... |
| التذبذب التاريخي | ... | مرتفع/متوسط/منخفض |
| درجة المخاطر الكلية | .../10 | ... |

**1. ملف التذبذب**
Beta ${s.beta}: تحرك ${s.beta}x مع السوق
مقارنة بمنافسي ${s.sec} - أين يقع؟

**2. تحليل البيتا**
صعوداً: كم يكسب مقارنة بالسوق؟
هبوطاً: كم يخسر مقارنة بالسوق؟

**3. تاريخ أقصى هبوط (Drawdown)**
السهم في ${pos}% من القاع ${s.lo52} - ماذا يعني؟
تقدير أسوأ سيناريو تاريخي

**4. تحليل الارتباط**
الارتباط مع قطاع ${s.sec} والسوق السعودي

**5. مخاطر تركز القطاع**
مخاطر الاعتماد على ${s.sec} - تنويع أم تركيز؟

**6. حساسية الفائدة**
Beta ${s.beta} وعلاقته بقرارات الفائدة والساما

**7. اختبار الركود**
تقدير الأثر في سيناريو انهيار مثل كوفيد أو 2008
نطاق: ${s.lo52} قاع تاريخي - هل يمكن الكسر؟

**8. مخاطر الأرباح**
EPS ${s.eps} - هشاشة الأرباح ومخاطر خيبة التوقعات

**9. مخاطر السيولة**
الحجم ${s.vol} vs المتوسط ${s.avgVol}: سهولة الخروج من المركز

**10. توصيات التحوط**
استراتيجيات تحمي المحفظة من مخاطر ${s.name}`,

    jpm_earnings: `${base}

-- JPMORGAN EARNINGS ANALYSIS NOTE --

اكتب تحليل أرباح كامل على ستايل JPMorgan:

**[ملخص القرار وخطة التداول]**
التموضع المقترح: اشتري/بع/انتظر قبل الأرباح
توقع الحركة: +/-...%

**1. سجل الأرباح التاريخي**
آخر 6 أرباع: EPS الفعلي vs المتوقع وردة فعل السهم

**2. تقديرات الربع القادم**
إجماع المحللين على EPS والإيرادات
مقارنة بـ EPS الحالي ${s.eps}

**3. أهم المؤشرات التي ننظر إليها**
3-5 مؤشرات تحدد اتجاه السهم بعد الأرباح

**4. تحليل القطاعات والمصادر**
توزيع إيرادات ${s.rev}B وتوقعات كل قطاع

**5. توجيه الإدارة**
ما المتوقع إعلانه بخصوص التوجيه المستقبلي

**6. الحركة الضمنية**
تقدير التذبذب المتوقع بناءً على Beta ${s.beta} وتاريخ السهم

**7. الأنماط التاريخية يوم الأرباح**
متوسط الحركة في آخر 8 تقارير

**8. التموضع قبل الأرباح**
اشتري قبلها / بع قبلها / انتظر ردة الفعل - مع المبررات

**9. خطة التداول بعد الأرباح**
- Gap Up: كيف أتداول؟
- Gap Down: كيف أتداول؟
- حركة محدودة: ماذا أفعل؟`,

    br_dividends: `${base}

-- BLACKROCK DIVIDEND INCOME ANALYSIS --

اكتب تحليل توزيعات كامل على ستايل BlackRock:

**[بطاقة درجة أمان التوزيعات]**
| المعيار | القيمة | الدرجة |
|---------|--------|--------|
| عائد التوزيع | ${s.div}% | .../10 |
| استدامة الكاش فلو | ... | .../10 |
| نسبة التوزيع من الأرباح | ... | .../10 |
| **الدرجة الكلية** | | **/10** |

**1. تحليل العائد**
عائد ${s.div}% مقارنة بمتوسط القطاع ${s.sec}
هل هو جذاب أم فخ؟

**2. معدل نمو التوزيعات**
نمو الـ EPS ${s.eps} مقارنة بنسبة التوزيع ${s.div}%

**3. استدامة التوزيع**
- نسبة التوزيع من EPS: ${s.div}% / ${s.eps * 100 / s.div > 0 ? (s.div / s.eps).toFixed(0) : 'احسب'}%
- FCF يدعم التوزيعات؟ FCF ${s.fcf ?? 'غير متاح'}
- الديون D/E ${s.debt_eq ?? 'بنوك'}: هل تهدد الاستدامة؟

**4. درجة أمان التوزيعات (1-10)**
بناءً على Payout Ratio وFCF والديون

**5. [جدول دخل 10 سنوات]**
افترض استثمار 100,000 ريال مع نمو ${s.div}% سنوياً
السنة 1-5-10: الدخل السنوي والرصيد

**6. تراكم DRIP**
العائد الكلي لو أُعيد استثمار ${s.div}% تلقائياً

**7. مواعيد الاستحقاق القادمة**
توقعات تواريخ الـ Ex-Dividend

**8. فحص فخ العائد**
هل ${s.div}% مستدام أم إنذار بالقطع؟`,

    cit_rotation: `${base}

-- CITADEL SECTOR ROTATION STRATEGY --

اكتب تحليل تدوير قطاعات كامل على ستايل Citadel:

**[جدول ترتيب القطاعات السعودية]**
| القطاع | الوضع الحالي | التوصية |
|--------|-------------|---------|
| ${s.sec} | ... | زيادة/تخفيض/محايد |
| ... | ... | ... |

**1. وضع الدورة الاقتصادية**
أين نحن الآن: توسع / قمة / انكماش / قاع؟
الأثر على قطاع ${s.sec}

**2. القطاع ${s.sec}: الموقف التكتيكي**
${s.name} (${s.sym}) كممثل للقطاع
- القوة النسبية: الموقع ${pos}% في النطاق السنوي
- الزخم: الحجم ${volR}% من المتوسط
- التقييم: P/E ${s.pe} مقارنة بالقطاع

**3. تحليل القطاعات السعودية الـ 11**
طاقة / بنوك / بتروكيم / تقنية / غذاء / تعدين / عقارات / بناء / تأمين / رعاية / ترفيه
لكل قطاع: توصية الوزن الآن

**4. أثر الفائدة والساما**
من يستفيد ومن يتضرر من السياسة النقدية الحالية

**5. رؤية 2030 والقطاعات المستفيدة**
تدفق الاستثمار المتوقع حسب مشاريع رؤية 2030

**6. نموذج التوزيع القطاعي المقترح**
نسب دقيقة لمحفظة سعودية محسّنة الآن مع ETFs مقترحة

**7. مؤشرات المراقبة**
ما الأرقام التي تدفع للتحول من قطاع لآخر`,

    comprehensive: `${base}

== تحليل شامل متكامل - مستوى المؤسسات الكبيرة ==

**[لوحة القرار التنفيذي]**
| البعد | التقييم | الدرجة |
|-------|---------|--------|
| الأساسي (GS) | شراء/احتفاظ/تجنب | .../10 |
| الفني (MS) | صاعد/هابط/محايد | .../10 |
| المخاطر (BW) | منخفض/متوسط/مرتفع | .../10 |
| الأرباح (JPM) | إيجابي/محايد/سلبي | .../10 |
| الكلي (CIT) | مواتٍ/محايد/غير مواتٍ | .../10 |
| **التوصية الكلية** | | **/10** |

**1. التحليل الأساسي (Goldman Sachs)**
- Moat وجودة نموذج العمل: كيف تولد ${s.name} إيراداتها ${s.rev}B
- P/E ${s.pe} | P/B ${s.pb} | ROE ${s.roe}% | EPS ${s.eps}: رخيص/عادل/غالٍ؟
- FCF ${s.fcf ?? 'N/A'} | D/E ${s.debt_eq ?? 'بنوك'}: قوة الميزانية
- التوزيعات ${s.div}%: مستدامة أم فخ؟ توقع الدخل على 100,000 ريال
- السعر المستهدف 12 شهر: متفائل/أساسي/متشائم

**2. التحليل الفني (Morgan Stanley + SMC)**
- الموقع: ${pos}% من النطاق ${s.lo52}→${s.hi52}
- المتوسطات المتحركة + RSI + MACD + Bollinger Bands
- فيبوناتشي: 38.2%=${f(.382)} | 50%=${f(.5)} | 61.8%=${f(.618)}
- نقاط السيولة BSL: ${s.hi52} | SSL: ${s.lo52} | OB: ${f(.236)}
- خطة التداول: دخول | وقف | هدف 1 | هدف 2 | R:R

**3. إدارة المخاطر (Bridgewater)**
- Beta ${s.beta}: حساسية السهم للسوق
- أقصى هبوط محتمل + سرعة التعافي
- اختبار ركود: سيناريو انهيار 2008 أو كوفيد
- استراتيجيات التحوط المقترحة

**4. تحليل الأرباح (JPMorgan)**
- EPS ${s.eps}: في خط النمو أم منحرف؟
- التموضع قبل/بعد النتائج القادمة
- سيناريو Gap Up / Gap Down

**5. الاقتصاد الكلي والقطاعات (Citadel)**
- وضع الدورة الاقتصادية وأثره على ${s.sec}
- رؤية 2030: هل ${s.name} مستفيد مباشر؟
- ترتيب قطاع ${s.sec} الآن بين القطاعات الـ 11

**6. مشاعر السوق**
- الحجم ${volR}% + موقع ${pos}%: خوف أم طمع؟
- موقع السهم في دورة العواطف
- التحيزات السلوكية السائدة

**7. الخلاصة والتوصية النهائية**
- الصورة الكاملة في فقرة واحدة
- شراء / احتفاظ / تجنب - درجة قناعة % - الأفق الزمني
- أهم 3 محفزات صعود + أهم 3 مخاطر هبوط`,
  };
  return prompts[type] || prompts.comprehensive;
}

/* ══ AI CALL - Claude Artifacts API (no auth header needed) ══ */
async function callAI(stock, type, onChunk, signal, chartContext) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    signal,
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: type === "comprehensive" ? 8000 : 4000,
      stream: true,
      system: SYSTEMS[type] || SYSTEMS.comprehensive,
      messages: [{ role: "user", content: (function(){
        let ctx = '';
        if (chartContext) {
          const c = chartContext;
          ctx = `\n\n═══ بيانات الشارت التفاعلي ═══
الفريم: ${c.per} | قوة الإشارة: ${c.signal?.score}/100 (${c.signal?.label})
الاتجاه: ${c.trend?.direction} | MA20: ${c.trend?.ma20} | MA50: ${c.trend?.ma50}
RSI(14): ${c.indicators?.rsi?.value} — ${c.indicators?.rsi?.signal}
MACD: ${c.indicators?.macd?.hist} — ${c.indicators?.macd?.signal}
ATR(14): ${c.indicators?.atr?.value} | BB%: ${c.indicators?.bb?.pct}%
الحجم: ${c.indicators?.volume?.ratio}× — ${c.indicators?.volume?.status}
موجة إليوت: ${c.elliottWave?.wave} — ${c.elliottWave?.desc}
النموذج الفني: ${c.bestPattern?.name||'لا نموذج'} (${c.bestPattern?.pct||0}% ثقة)
الأهداف: T1=${c.targets?.t1} T2=${c.targets?.t2} T3=${c.targets?.t3} | SL=${c.targets?.sl}
المستويات: R1=${c.pivots?.R1} R2=${c.pivots?.R2} S1=${c.pivots?.S1} S2=${c.pivots?.S2}
دعم مؤسسي: ${c.institutional?.support}${c.institutional?.hasZone?' (تراكم مؤكد)':''}`;
        }
        // ── إضافة أسعار السلع الحية للـ prompt ──────────────────────
        let commCtx = '';
        if (commData && commData.length > 0) {
          const oil  = commData.find(function(c){return c.sym==='خام برنت'||c.sym==='خام WTI';});
          const gold = commData.find(function(c){return c.sym==='الذهب';});
          const dxy  = commData.find(function(c){return c.sym==='الدولار';});
          const sp   = commData.find(function(c){return c.sym==='S&P 500';});
          commCtx = '\n\n═══ الأسعار العالمية الحية ═══\n' +
            (oil  ? 'النفط (برنت): '  + oil.price  + '$ (' + (oil.pct>0?'+':'')  + oil.pct  + '%)\n' : '') +
            (gold ? 'الذهب: '         + gold.price + '$ (' + (gold.pct>0?'+':'') + gold.pct + '%)\n' : '') +
            (dxy  ? 'الدولار (DXY): ' + dxy.price  + ' ('  + (dxy.pct>0?'+':'')  + dxy.pct  + '%)\n' : '') +
            (sp   ? 'S&P 500: '       + sp.price   + ' ('  + (sp.pct>0?'+':'')   + sp.pct   + '%)\n' : '');
        }
        return buildPrompt(stock, type) + ctx + commCtx;
      })() }],
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 401) throw new Error("AUTH");
    const t = await res.text().catch(()=>"");
    throw new Error("HTTP " + res.status + ": " + t.slice(0,200));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "", buf = "";

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    buf += decoder.decode(value, {stream: true});
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (raw === "[DONE]") continue;
      try {
        const t = JSON.parse(raw)?.delta?.text || "";
        if (t) { full += t; onChunk(full); }
      } catch {}
    }
  }
  if (!full) throw new Error("لم يصل رد");
  return full;
}

/* ══ PERSISTENCE ══ */
const tryLS = (fn, fb) => { try { return fn(); } catch { return fb; } };
const LS = { sym:"td_sym", type:"td_type", hist:"td_hist", ob:"td_ob" };

/* ══ SKELETON PULSE ══ */
function Skel({ w = "100%", h = 10, r = 5 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: `linear-gradient(90deg,${C.layer2} 0%,${C.layer3} 50%,${C.layer2} 100%)`,
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s ease-in-out infinite",
    }} />
  );
}

/* ══ RESULT RENDERER ══ */
function parseBlocks(text) {
  // Split text into blocks based on **Section Title** headers
  const lines = text.split("\n");
  const blocks = [];
  let currentBlock = null;
  let currentLines = [];

  for (const line of lines) {
    const t = line.trim();
    // Detect section headers: **Title** or **[Title]** or numbered **1. Title**
    const isHeader = /^\*\*(.+)\*\*$/.test(t) || /^\*\*\[.+\]\*\*$/.test(t);
    if (isHeader) {
      if (currentBlock !== null || currentLines.length > 0) {
        blocks.push({ title: currentBlock, lines: currentLines });
      }
      currentBlock = t.replace(/\*\*/g, "").replace(/^\[|\]$/g, "");
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentBlock !== null || currentLines.length > 0) {
    blocks.push({ title: currentBlock, lines: currentLines });
  }
  return blocks;
}

function BlockSection({ title, lines, color, idx }) {
  const hasContent = lines.some(l => l.trim());
  return (
    <div style={{
      marginBottom: 10,
      borderRadius: 12,
      overflow: "hidden",
      border: `1px solid ${color}30`,
      background: `linear-gradient(135deg,${C.layer1},${C.layer2})`,
      animation: `cardIn .3s ease ${idx * 0.05}s both`,
    }}>
      {title && (
        <div style={{
          padding: "8px 12px",
          background: `linear-gradient(135deg,${color}22,${color}0a)`,
          borderBottom: hasContent ? `1px solid ${color}25` : "none",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: `linear-gradient(${color},${color}80)`, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: color, letterSpacing: ".3px" }}>{title}</span>
        </div>
      )}
      {hasContent && (
        <div style={{ padding: "10px 12px" }}>
          {lines.map((line, i) => {
            const t = line.trim();
            if (!t) return <div key={i} style={{ height: 4 }} />;
            // Table row
            if (t.startsWith("|")) {
              const cells = t.split("|").filter(c => c.trim() !== "" && c.trim() !== "---" && !/^-+$/.test(c.trim()));
              if (cells.length === 0) return null;
              const isHeader = lines[i+1] && lines[i+1].includes("---");
              return (
                <div key={i} style={{
                  display: "flex", gap: 4, marginBottom: 3,
                  background: isHeader ? `${color}18` : "transparent",
                  borderRadius: 4, padding: "3px 4px",
                }}>
                  {cells.map((cell, ci) => (
                    <div key={ci} style={{
                      flex: 1, fontSize: 11,
                      color: isHeader ? color : C.mist,
                      fontWeight: isHeader ? 700 : 400,
                      lineHeight: 1.5,
                    }}>{cell.trim()}</div>
                  ))}
                </div>
              );
            }
            // Table separator row
            if (/^[|\-\s]+$/.test(t) && t.includes("|")) return null;
            // Bullet point
            if (t.startsWith("- ") || t.startsWith("* ")) return (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: color, marginTop: 8, flexShrink: 0, opacity: 0.8 }} />
                <span style={{ fontSize: 12, color: C.mist, lineHeight: 1.65 }}>{t.slice(2)}</span>
              </div>
            );
            // Sub-header (numbered like "1. Title" already stripped of **)
            if (/^\d+\.\s/.test(t)) return (
              <div key={i} style={{ fontSize: 11, fontWeight: 700, color: C.smoke, marginTop: 6, marginBottom: 3 }}>{t}</div>
            );
            return <p key={i} style={{ fontSize: 12, color: C.mist, lineHeight: 1.7, margin: "0 0 3px" }}>{t}</p>;
          })}
        </div>
      )}
    </div>
  );
}

// Section color mapping per type
const SECTION_COLORS = {
  gs_fundamental: "#1a7fd4",
  ms_technical:   "#00b4d8",
  bw_risk:        "#9d4edd",
  jpm_earnings:   "#e63946",
  br_dividends:   "#2dc653",
  cit_rotation:   "#ff9f1c",
  comprehensive:  C.gold,
  technical:      C.electric,
  fundamental:    C.mint,
  smart_money:    C.plasma,
  macro:          C.teal,
  sentiment:      C.amber,
};

function Result({ text, streaming, analysisType }) {
  if (!text) return null;
  const blocks = parseBlocks(text);
  const baseColor = SECTION_COLORS[analysisType] || C.gold;

  // Alternate colors for blocks to differentiate sections
  const palette = [baseColor, C.electric, C.mint, C.plasma, C.teal, C.amber, C.coral, C.goldL];

  return (
    <div style={{ direction:"rtl", fontFamily:"Cairo,sans-serif" }}>
      {blocks.map((block, i) => (
        <BlockSection
          key={i}
          title={block.title}
          lines={block.lines}
          color={palette[i % palette.length]}
          idx={i}
        />
      ))}
      {streaming && (
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", marginTop:4 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:baseColor, animation:"pulse 1s ease-in-out infinite" }} />
          <span style={{ fontSize:11, color:baseColor, opacity:.8 }}>يكتب...</span>
        </div>
      )}
    </div>
  );
}

/* ══ SPARKLINE ══ */
function Sparkline({ pos, color }) {
  const pts = [0.78,0.82,0.80,0.85,0.83,0.87,0.85,0.90,0.88,0.92,0.89,0.94, pos/100];
  const mn = Math.min(...pts), mx = Math.max(...pts), rng = mx - mn || 0.01;
  const W = 100, H = 24, pad = 2;
  const px = i => pad + (i/(pts.length-1)) * (W-pad*2);
  const py = v => H - pad - ((v-mn)/rng) * (H-pad*2);
  const d  = pts.map((v,i) => `${i===0?"M":"L"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const lx = px(pts.length-1), ly = py(pts[pts.length-1]);
  return (
    <svg width={W} height={H} style={{ overflow:"visible" }}>
      <defs>
        <linearGradient id={`sg${pos}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${d} L${lx},${H} L${pad},${H} Z`} fill={`url(#sg${pos})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  );
}

/* ══ MAIN ══ */
export default function AIScreen({ aiAnalysis, onClearAnalysis, commData }) {

  /* state */
  const [stock,    setStock]    = useState(() => tryLS(() => STOCKS.find(s => s.sym === localStorage.getItem(LS.sym)) || STOCKS[0], STOCKS[0]));
  const [type,     setType]     = useState(() => tryLS(() => TYPES.find(t => t.id === localStorage.getItem(LS.type)) ? localStorage.getItem(LS.type) : "comprehensive", "comprehensive"));
  const [result,   setResult]   = useState("");
  const [status,   setStatus]   = useState("idle"); // idle | loading | done | error
  const [errMsg,   setErrMsg]   = useState("");
  const [open,     setOpen]     = useState(false);
  const [srchQ,    setSrchQ]    = useState("");
  const [showTip,  setShowTip]  = useState(() => tryLS(() => !localStorage.getItem(LS.ob), true));
  const [words,    setWords]    = useState(0);
  const [history,  setHistory]  = useState(() => tryLS(() => JSON.parse(localStorage.getItem(LS.hist) || "[]"), []));
  const [showHist, setShowHist] = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);

  // ── بيانات التحليل القادمة من الشارت ──────────────────────────
  const [chartData,    setChartData]    = useState(null);
  const [showChartAI,  setShowChartAI]  = useState(false);

  const abortRef = useRef(null);

  /* derived */
  const selType  = TYPES.find(t => t.id === type) || TYPES[0];
  const sc       = SEC[stock.sec] || C.electric;
  const isUp     = stock.ch >= 0;
  const chColor  = isUp ? C.mint : C.coral;
  const isLoad   = status === "loading";
  const isDone   = status === "done";
  const isErr    = status === "error";
  const hasRes   = result.length > 0;
  const pos      = Math.round((stock.p - stock.lo52) / (stock.hi52 - stock.lo52) * 100);
  const animKey  = stock.sym + type;

  /* actions */
  const cancel = () => { if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; } };

  const run = useCallback(async () => {
    cancel();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("loading"); setResult(""); setErrMsg(""); setWords(0); setShowHist(false); setSaved(false);
    try {
      await callAI(stock, type, chunk => {
        setResult(chunk);
        setWords(chunk.trim().split(/\s+/).filter(Boolean).length);
      }, ctrl.signal, chartData);
      setStatus("done");
      setHistory(prev => {
        const entry = { sym:stock.sym, name:stock.name, typeId:type, typeLabel:selType.label, ts:Date.now() };
        const next  = [entry, ...prev.filter(h => !(h.sym===stock.sym && h.typeId===type))].slice(0, 3);
        tryLS(() => localStorage.setItem(LS.hist, JSON.stringify(next)));
        return next;
      });
    } catch (e) {
      if (e.name === "AbortError") { setStatus("idle"); return; }
      setErrMsg(
        e.message === "RATE_LIMIT" ? "وصلت للحد الأقصى. انتظر دقيقة." :
        e.message === "AUTH"       ? "خطأ في المصادقة." :
        "تعذّر الاتصال. تحقق من شبكتك."
      );
      setStatus("error");
    }
  }, [stock, type, selType.label]);

  const changeStock = s => {
    cancel();
    tryLS(() => localStorage.setItem(LS.sym, s.sym));
    setStock(s); setResult(""); setStatus("idle"); setErrMsg("");
    setOpen(false); setSrchQ(""); setWords(0);
  };
  const changeType = id => {
    cancel();
    tryLS(() => localStorage.setItem(LS.type, id));
    setType(id); setResult(""); setStatus("idle"); setErrMsg(""); setWords(0);
  };
  const reset      = () => { cancel(); setResult(""); setStatus("idle"); setErrMsg(""); setWords(0); setShowHist(false); setSaved(false); };
  const saveToLearning = async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      const k = "tadawul_uid";
      let uid = localStorage.getItem(k);
      if (!uid) { uid = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); localStorage.setItem(k, uid); }
      const rid = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      const rec = { id:rid, user_id:uid, sym:stock.sym, name:stock.name, type, type_label:selType.label,
        recommendation:"hold", current_price:stock.p, analysis_text:result.slice(0,500),
        created_at:Date.now(), evaluate_at30:Date.now()+2592000000,
        evaluate_at90:Date.now()+7776000000, evaluate_at180:Date.now()+15552000000,
        outcome:null, error_patterns:[], notes:"" };
      const prev = JSON.parse(localStorage.getItem("tle_records_v1")||"[]");
      localStorage.setItem("tle_records_v1", JSON.stringify([{...rec, typeLabel:selType.label, targetPrice:null, currentPrice:stock.p, analysisText:rec.analysis_text, createdAt:rec.created_at, evaluateAt30:rec.evaluate_at30, evaluateAt90:rec.evaluate_at90, evaluateAt180:rec.evaluate_at180, actualPrice30:null, actualPrice90:null, actualPrice180:null, improvement:null, score:null}, ...prev]));
      const SURL = "https://kdgqncnmaifrmohjoemc.supabase.co/rest/v1/analysis_records";
      const SKEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
      await fetch(SURL, { method:"POST", headers:{"apikey":SKEY,"Authorization":"Bearer "+SKEY,"Content-Type":"application/json","Prefer":"return=minimal"}, body:JSON.stringify(rec) });
      setSaved(true);
    } catch(e) { setSaved(true); }
    setSaving(false);
  };

  const dismissTip = () => { tryLS(() => localStorage.setItem(LS.ob, "1")); setShowTip(false); };

  /* filtered stocks for search */
  const filteredStocks = srchQ.trim()
    ? STOCKS.filter(s => s.name.includes(srchQ) || s.sym.includes(srchQ))
    : STOCKS;

  return (
    <div style={{ minHeight:"100vh", background:C.ink, direction:"rtl", fontFamily:"Cairo,'Segoe UI',sans-serif", color:C.snow }}>

      {/* ══ CSS ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        @keyframes spin     { to { transform:rotate(360deg); } }
        @keyframes blink    { 0%,100%{opacity:1;} 50%{opacity:0;} }
        @keyframes pulse    { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.35;transform:scale(.7);} }
        @keyframes dropDown { from{opacity:0;transform:translateY(-8px);} to{opacity:1;transform:translateY(0);} }
        @keyframes shimmer  { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
        @keyframes cardIn   { from{opacity:0;transform:translateY(5px);} to{opacity:1;transform:translateY(0);} }
        @keyframes fadeIn   { from{opacity:0;} to{opacity:1;} }
        * { box-sizing:border-box; margin:0; padding:0; }
        button { font-family:inherit; }
        .run-btn:hover  { filter:brightness(1.18); transform:translateY(-2px); }
        .run-btn:active { filter:brightness(.93); transform:translateY(0) scale(.98); }
        .tc-card:hover  { filter:brightness(1.12); transform:translateY(-1px); }
        .tc-card:active { transform:scale(.97); }
        .dr-row:hover   { background:rgba(240,192,80,.08) !important; }
        button:focus-visible { outline:2px solid ${C.gold}55; outline-offset:2px; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:${C.edge}; border-radius:2px; }
        input::placeholder { color:${C.ash}; }
      `}</style>

      {/* ══ CHART AI ANALYSIS OVERLAY ══ */}
      {showChartAI && chartData && (
        <div style={{
          position:'fixed', inset:0, zIndex:300,
          background:C.ink, direction:'rtl',
          fontFamily:"'Cairo','Segoe UI',sans-serif",
          display:'flex', flexDirection:'column',
          overflowY:'auto',
        }}>
          {/* Header */}
          <div style={{
            padding:'12px 14px', background:C.layer1,
            borderBottom:`1px solid ${C.line}`,
            display:'flex', alignItems:'center', gap:10,
            position:'sticky', top:0, zIndex:10,
          }}>
            <button
              onClick={() => { setShowChartAI(false); if(onClearAnalysis) onClearAnalysis(); }}
              style={{width:34,height:34,borderRadius:10,background:C.layer2,border:`1px solid ${C.edge}`,color:C.snow,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
              ✕
            </button>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:C.snow}}>
                تحليل الشارت — {chartData.name} ({chartData.sym})
              </div>
              <div style={{fontSize:10,color:C.smoke}}>
                {chartData.per} · {chartData.date}
              </div>
            </div>
            <div style={{
              background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
              borderRadius:10, padding:'4px 12px',
              fontSize:11, fontWeight:800, color:'#000',
            }}>AI</div>
          </div>

          {/* Chart Image */}
          {chartData.chartImage && (
            <div style={{margin:'12px 12px 0', borderRadius:14, overflow:'hidden', border:`1px solid ${C.edge}`}}>
              <img
                src={chartData.chartImage}
                alt="الشارت"
                style={{width:'100%', height:'auto', display:'block', maxHeight:280, objectFit:'cover'}}
              />
            </div>
          )}

          {/* Signal Score */}
          <div style={{margin:'10px 12px 0', background:C.layer1, borderRadius:14, padding:'14px', border:`1px solid ${C.line}`}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:42, fontWeight:900, color:chartData.signal?.color || C.gold, lineHeight:1}}>
                  {chartData.signal?.score}
                </div>
                <div style={{fontSize:11, color:chartData.signal?.color, fontWeight:700}}>
                  {chartData.signal?.label}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:18, fontWeight:900, color:chartData.trend?.direction==='صاعد'?C.mint:C.coral}}>
                  {chartData.trend?.direction} {chartData.trend?.direction==='صاعد'?'↑':'↓'}
                </div>
                <div style={{fontSize:10, color:C.smoke, marginTop:4}}>
                  MA20: {chartData.trend?.ma20} · MA50: {chartData.trend?.ma50}
                </div>
                <div style={{fontSize:10, color:C.smoke}}>
                  RSI: {chartData.indicators?.rsi?.value} · {chartData.indicators?.rsi?.signal}
                </div>
              </div>
            </div>
          </div>

          {/* Elliott Wave */}
          {chartData.elliottWave?.wave && (
            <div style={{margin:'8px 12px 0', background:C.layer1, borderRadius:14, padding:'12px', border:`1px solid ${C.line}`}}>
              <div style={{fontSize:10, color:C.smoke, fontWeight:600, marginBottom:6}}>موجات إليوت</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontSize:16, fontWeight:800, color:C.gold}}>{chartData.elliottWave.wave}</div>
                <div style={{fontSize:10, color:C.ash}}>{chartData.elliottWave.pct}% من النطاق</div>
              </div>
              <div style={{fontSize:11, color:C.smoke, marginTop:4}}>{chartData.elliottWave.desc}</div>
              <div style={{height:4, background:C.layer2, borderRadius:2, marginTop:8, overflow:'hidden'}}>
                <div style={{width:`${Math.min(100,chartData.elliottWave.pct)}%`, height:'100%', background:C.gold, borderRadius:2}}/>
              </div>
            </div>
          )}

          {/* Best Pattern */}
          {chartData.bestPattern && (
            <div style={{margin:'8px 12px 0', background:C.layer1, borderRadius:14, padding:'12px', border:`1px solid ${C.line}`}}>
              <div style={{fontSize:10, color:C.smoke, fontWeight:600, marginBottom:6}}>النموذج الفني</div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontSize:15, fontWeight:800, color:chartData.bestPattern.clr}}>
                  {chartData.bestPattern.name}
                </div>
                <div style={{display:'flex', gap:6, alignItems:'center'}}>
                  <span style={{fontSize:10, color:chartData.bestPattern.clr, background:chartData.bestPattern.clr+'18', padding:'2px 8px', borderRadius:6}}>
                    {chartData.bestPattern.dir}
                  </span>
                  <span style={{fontSize:14, fontWeight:800, color:chartData.bestPattern.clr}}>
                    {chartData.bestPattern.pct}%
                  </span>
                </div>
              </div>
              <div style={{fontSize:10, color:C.ash, marginTop:4}}>{chartData.bestPattern.desc}</div>
              {chartData.patterns?.length > 1 && (
                <div style={{fontSize:9, color:C.ash, marginTop:6}}>
                  أيضاً: {chartData.patterns.slice(1).map(p => p.name + ' (' + p.pct + '%)').join(' · ')}
                </div>
              )}
            </div>
          )}

          {/* Support / Resistance */}
          {chartData.pivots && (
            <div style={{margin:'8px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              <div style={{background:C.layer1, borderRadius:14, padding:'12px', border:`1px solid rgba(30,230,138,0.2)`}}>
                <div style={{fontSize:10, color:C.mint, fontWeight:600, marginBottom:8}}>الدعم</div>
                {['S1','S2','S3'].map(k => (
                  <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${C.line}`}}>
                    <span style={{fontSize:10, color:C.ash}}>{k}</span>
                    <span style={{fontSize:12, fontWeight:700, color:C.mint}}>{chartData.pivots[k]}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.layer1, borderRadius:14, padding:'12px', border:`1px solid rgba(255,95,106,0.2)`}}>
                <div style={{fontSize:10, color:C.coral, fontWeight:600, marginBottom:8}}>المقاومة</div>
                {['R1','R2','R3'].map(k => (
                  <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:`1px solid ${C.line}`}}>
                    <span style={{fontSize:10, color:C.ash}}>{k}</span>
                    <span style={{fontSize:12, fontWeight:700, color:C.coral}}>{chartData.pivots[k]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Targets */}
          {chartData.targets && (
            <div style={{margin:'8px 12px 0', background:C.layer1, borderRadius:14, padding:'12px', border:`1px solid ${C.line}`}}>
              <div style={{fontSize:10, color:C.smoke, fontWeight:600, marginBottom:8}}>الأهداف ووقف الخسارة</div>
              <div style={{display:'flex', gap:6, marginBottom:8}}>
                {[chartData.targets.t1, chartData.targets.t2, chartData.targets.t3].map((t,i) => (
                  <div key={i} style={{flex:1, background:'rgba(30,230,138,0.06)', border:`1px solid rgba(30,230,138,0.2)`, borderRadius:10, padding:'8px 4px', textAlign:'center'}}>
                    <div style={{fontSize:8, color:C.ash}}>هدف {i+1}</div>
                    <div style={{fontSize:13, fontWeight:800, color:C.mint}}>{t}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(255,95,106,0.07)', border:`1px solid rgba(255,95,106,0.2)`, borderRadius:10, padding:'9px 12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:10, color:C.smoke}}>وقف الخسارة</span>
                <span style={{fontSize:16, fontWeight:800, color:C.coral}}>{chartData.targets.sl}</span>
              </div>
            </div>
          )}

          {/* Indicators Grid */}
          {chartData.indicators && (
            <div style={{margin:'8px 12px 0', background:C.layer1, borderRadius:14, padding:'12px', border:`1px solid ${C.line}`}}>
              <div style={{fontSize:10, color:C.smoke, fontWeight:600, marginBottom:8}}>المؤشرات التقنية</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:7}}>
                {[
                  {l:'RSI(14)', v:chartData.indicators.rsi?.value, s:chartData.indicators.rsi?.signal, c:parseFloat(chartData.indicators.rsi?.value)>70?C.coral:parseFloat(chartData.indicators.rsi?.value)<30?C.mint:C.amber},
                  {l:'MACD',    v:chartData.indicators.macd?.hist, s:chartData.indicators.macd?.signal, c:parseFloat(chartData.indicators.macd?.hist)>0?C.mint:C.coral},
                  {l:'ATR(14)', v:chartData.indicators.atr?.value, s:'التقلب', c:C.amber},
                  {l:'BB %',    v:chartData.indicators.bb?.pct+'%', s:parseFloat(chartData.indicators.bb?.pct)>80?'قرب القمة':parseFloat(chartData.indicators.bb?.pct)<20?'قرب القاع':'منتصف', c:parseFloat(chartData.indicators.bb?.pct)>80?C.coral:parseFloat(chartData.indicators.bb?.pct)<20?C.mint:C.ash},
                  {l:'الحجم',  v:chartData.indicators.volume?.ratio+'×', s:chartData.indicators.volume?.status, c:parseFloat(chartData.indicators.volume?.ratio)>1.5?C.mint:C.ash},
                  {l:'EMA9',   v:chartData.indicators.ema9?.value, s:chartData.indicators.ema9?.abovePrice?'فوق EMA9':'تحت EMA9', c:chartData.indicators.ema9?.abovePrice?C.mint:C.coral},
                ].map(({l,v,s,c},i) => (
                  <div key={i} style={{background:C.layer2, border:`1px solid ${C.edge}`, borderRadius:10, padding:'8px'}}>
                    <div style={{fontSize:8, color:C.ash, marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14, fontWeight:700, color:c}}>{v || '—'}</div>
                    <div style={{fontSize:8, color:C.ash, marginTop:2}}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send to Claude buttons */}
          <div style={{margin:'10px 12px 16px', display:'flex', flexDirection:'column', gap:8}}>
            <button
              onClick={() => {
                setShowChartAI(false);
                // Set the stock and trigger comprehensive analysis
                const found = STOCKS.find(s => s.sym === chartData.sym);
                if(found) setStock(found);
                setType('comprehensive');
                // Build prompt with chart data
                setTimeout(() => {
                  const btn = document.querySelector('[data-send-btn]');
                  if(btn) btn.click();
                }, 100);
              }}
              style={{
                width:'100%', padding:'14px',
                background:`linear-gradient(135deg,${C.gold},${C.goldL})`,
                border:'none', borderRadius:14,
                fontSize:14, fontWeight:800, color:'#000',
                cursor:'pointer', fontFamily:"inherit",
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              🤖 تحليل شامل بـ Claude AI
            </button>
            <button
              onClick={() => {
                setShowChartAI(false);
                const found = STOCKS.find(s => s.sym === chartData.sym);
                if(found) setStock(found);
                setType('technical_combined');
                setTimeout(() => {
                  const btn = document.querySelector('[data-send-btn]');
                  if(btn) btn.click();
                }, 100);
              }}
              style={{
                width:'100%', padding:'12px',
                background:`rgba(77,159,255,0.12)`,
                border:`1px solid rgba(77,159,255,0.3)`,
                borderRadius:14, fontSize:13, fontWeight:700, color:C.electric,
                cursor:'pointer', fontFamily:"inherit",
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              📈 تحليل فني تفصيلي
            </button>
          </div>
        </div>
      )}

      {/* ══ HEADER ══ */}
      <div style={{
        padding:"14px 16px 12px",
        background:`linear-gradient(160deg,${C.layer2} 0%,${C.layer1} 40%,${C.deep} 100%)`,
        borderBottom:`1px solid ${C.line}`,
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:-40, right:-40, width:140, height:140, borderRadius:"50%", background:`radial-gradient(circle,${C.gold}15 0%,transparent 70%)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${C.gold}50,${C.electric}50,transparent)`, pointerEvents:"none" }} />
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:40, height:40, borderRadius:12,
              background:`linear-gradient(135deg,${C.gold}35,${C.goldD}18)`,
              border:`1px solid ${C.gold}50`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:19,
              boxShadow:`0 4px 20px ${C.gold}35, inset 0 1px 0 ${C.goldL}25`,
            }}><IconMicroscope size={20} color={C.gold} /></div>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:C.snow, letterSpacing:"-.3px" }}>تحليل AI</div>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:C.mint, boxShadow:`0 0 6px ${C.mint}`, animation:"pulse 2s ease-in-out infinite" }} />
                <span style={{ fontSize:10, color:C.mint, fontWeight:600 }}>Claude Sonnet · ذكاء اصطناعي</span>
              </div>
            </div>
          </div>
          <div style={{
            background:`linear-gradient(135deg,${C.electric}22,${C.electric}0d)`,
            border:`1px solid ${C.electric}44`,
            borderRadius:8, padding:"4px 10px",
            fontSize:10, fontWeight:700, color:C.electric,
          }}>6 أنواع</div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ padding:"14px 14px 100px" }}>

        {/* onboarding */}
        {showTip && (
          <div style={{ marginBottom:14, padding:"9px 12px", background:`linear-gradient(135deg,${C.electric}15,${C.electric}08)`, border:`1px solid ${C.electric}30`, borderRadius:10, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
            <span style={{ fontSize:11, color:C.electricL, lineHeight:1.55 }}><IconLightbulb size={13} color={C.electricL} style={{marginLeft:4,flexShrink:0}} /> اختر السهم ونوع التحليل ثم اضغط "ابدأ التحليل" لتحصل على تحليل مدعوم بالذكاء الاصطناعي</span>
            <button onClick={dismissTip} style={{ background:"none", border:"none", cursor:"pointer", color:C.smoke, fontSize:16, lineHeight:1, flexShrink:0, padding:"2px 4px" }}>×</button>
          </div>
        )}

        {/* ══ STOCK PICKER ══ */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, color:C.smoke, marginBottom:7, fontWeight:700, letterSpacing:"1.5px" }}>السهم</div>
          <div style={{ position:"relative" }}>

            {/* trigger button */}
            <button onClick={() => setOpen(o => !o)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:10,
              padding:"10px 14px",
              background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
              border:`1px solid ${open ? sc+"60" : C.line}`,
              borderRadius:14, cursor:"pointer", outline:"none",
              boxShadow: open ? `0 0 0 2px ${sc}20, 0 8px 24px rgba(0,0,0,.35)` : `0 4px 14px rgba(0,0,0,.2)`,
              transition:"all .2s",
            }}>
              {/* sector badge */}
              <div style={{
                width:40, height:40, borderRadius:10, flexShrink:0,
                background:`linear-gradient(135deg,${sc}30,${sc}12)`,
                border:`1px solid ${sc}60`,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                boxShadow:`0 2px 8px ${sc}20`,
              }}>
                <span style={{ fontSize:10, fontWeight:900, color:sc, letterSpacing:"-.5px" }}>{stock.sym}</span>
                <span style={{ fontSize:8, color:C.smoke, marginTop:1 }}>{stock.sec}</span>
              </div>
              <div style={{ flex:1, textAlign:"right" }}>
                <div style={{ fontSize:14, fontWeight:800, color:C.snow }}>{stock.name}</div>
                <div style={{ fontSize:10, color:C.smoke, marginTop:2 }}>{stock.sym}</div>
              </div>
              <div style={{ textAlign:"left", flexShrink:0 }}>
                <div style={{ fontSize:20, fontWeight:900, color:C.snow, direction:"ltr", letterSpacing:"-.5px" }}>{stock.p}</div>
                <div style={{ fontSize:11, fontWeight:700, color:chColor, direction:"ltr" }}>{isUp?"+":""}{stock.ch}%</div>
              </div>
              <div style={{ color:C.smoke, fontSize:11, flexShrink:0, transform:open?"rotate(180deg)":"none", transition:"transform .2s" }}>▼</div>
            </button>

            {/* dropdown */}
            {open && (
              <>
                <div style={{ position:"fixed", inset:0, zIndex:40 }} onClick={() => { setOpen(false); setSrchQ(""); }} />
                <div style={{
                  position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:50,
                  background:C.layer1, border:`1px solid ${C.line}`, borderRadius:14,
                  overflow:"hidden", boxShadow:`0 20px 56px rgba(0,0,0,.7)`,
                  animation:"dropDown .18s cubic-bezier(.16,1,.3,1)",
                }}>
                  {/* search */}
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderBottom:`1px solid ${C.edge}`, background:C.void }}>
                    <span style={{ fontSize:12, color:C.smoke, flexShrink:0 }}><IconSearch size={13} color={C.smoke} /></span>
                    <input
                      value={srchQ}
                      onChange={e => setSrchQ(e.target.value)}
                      placeholder="ابحث بالاسم أو الرمز..."
                      autoFocus
                      style={{ flex:1, background:"none", border:"none", outline:"none", color:C.snow, fontSize:11, direction:"rtl", fontFamily:"Cairo,sans-serif" }}
                    />
                    {srchQ && (
                      <button onClick={() => setSrchQ("")} style={{ background:"none", border:"none", cursor:"pointer", color:C.smoke, fontSize:15, lineHeight:1, padding:"2px 4px", flexShrink:0 }}>×</button>
                    )}
                  </div>
                  {/* list */}
                  <div style={{ maxHeight:260, overflowY:"auto", overscrollBehavior:"contain" }}>
                    {filteredStocks.length === 0 ? (
                      <div style={{ padding:"16px", textAlign:"center", fontSize:11, color:C.smoke }}>لا توجد نتائج</div>
                    ) : filteredStocks.map((s, i) => {
                      const sc2 = SEC[s.sec] || C.electric;
                      const active = s.sym === stock.sym;
                      return (
                        <button key={s.sym} onClick={() => changeStock(s)} className="dr-row" style={{
                          width:"100%", display:"flex", alignItems:"center", gap:10,
                          padding:"9px 12px",
                          background: active ? `${C.gold}10` : "none",
                          borderBottom: i < filteredStocks.length-1 ? `1px solid ${C.edge}` : "none",
                          border:"none", cursor:"pointer", textAlign:"right", transition:"background .12s",
                        }}>
                          <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, background:`${sc2}20`, border:`1px solid ${sc2}44`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                            <span style={{ fontSize:9, fontWeight:900, color:sc2, letterSpacing:"-.5px" }}>{s.sym}</span>
                            <span style={{ fontSize:7, color:C.smoke, marginTop:1 }}>{s.sec}</span>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:active?C.gold:C.snow, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                            <div style={{ fontSize:10, color:C.smoke }}>P/E {s.pe} · توزيع {s.div}%</div>
                          </div>
                          <div style={{ textAlign:"left", flexShrink:0 }}>
                            <div style={{ fontSize:12, fontWeight:800, color:C.snow }}>{s.p}</div>
                            <div style={{ fontSize:10, fontWeight:700, color:s.ch>=0?C.mint:C.coral, direction:"ltr" }}>{s.ch>=0?"+":""}{s.ch}%</div>
                          </div>
                          {active && <div style={{ width:6, height:6, borderRadius:"50%", background:C.gold, flexShrink:0 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ══ METRICS CARD ══ */}
        <div key={animKey} style={{
          marginBottom:16, borderRadius:14, overflow:"hidden",
          background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
          border:`1px solid ${sc}35`,
          boxShadow:`0 4px 20px rgba(0,0,0,.3), inset 0 0 0 1px ${sc}08`,
          animation:"cardIn .28s cubic-bezier(.16,1,.3,1)",
        }}>
          {/* color stripe */}
          <div style={{ height:3, background:`linear-gradient(90deg,${sc},${sc}55,transparent)` }} />
          <div style={{ padding:"12px 14px" }}>

            {/* sparkline row */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"6px 8px", background:C.void, borderRadius:8, border:`1px solid ${C.edge}` }}>
              <div style={{ fontSize:10, color:C.ash }}>30 يوماً</div>
              <Sparkline pos={pos} color={pos > 50 ? C.mint : C.coral} />
              <div style={{ fontSize:11, fontWeight:700, color:pos>50?C.mint:C.coral }}>{pos>50?"↑":"↓"} {pos}%</div>
            </div>

            {/* metrics grid */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:C.edge, borderRadius:8, overflow:"hidden", marginBottom:10 }}>
              {[
                { l:"مكرر الربح",   v:String(stock.pe), alert:stock.pe>50 },
                { l:"عائد حقوق",   v:`${stock.roe}%` },
                { l:"توزيعات", v:`${stock.div}%` },
                { l:"سعر/دفتري",   v:String(stock.pb) },
                { l:"بيتا",  v:String(stock.beta) },
                { l:"حجم التداول",   v:stock.vol },
              ].map(m => (
                <div key={m.l} style={{ background:C.layer1, padding:"10px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:m.alert?C.coral:C.snow, letterSpacing:"-.3px" }}>{m.v}{m.alert ? <IconWarn size={12} color={C.coral} style={{marginRight:3}} /> : ""}</div>
                  <div style={{ fontSize:10, color:C.ash, marginTop:2 }}>{m.l}</div>
                </div>
              ))}
            </div>

            {/* 52-week bar */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5, direction:"ltr" }}>
                <span style={{ fontSize:10, color:C.ash }}>أدنى {stock.lo52}</span>
                <span style={{ fontSize:10, color:C.smoke, fontWeight:600 }}>النطاق السنوي · {pos}%</span>
                <span style={{ fontSize:10, color:C.ash }}>أعلى {stock.hi52}</span>
              </div>
              <div style={{ height:5, background:C.edge, borderRadius:3, overflow:"hidden", direction:"ltr" }}>
                <div style={{ height:"100%", width:`${pos}%`, background:`linear-gradient(90deg,${sc}aa,${sc})`, borderRadius:3, transition:"width .45s ease" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ══ TYPE CARDS ══ */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, color:C.smoke, marginBottom:8, fontWeight:700, letterSpacing:"1.5px" }}>نوع التحليل</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {TYPES.map((t, idx) => {
              const sel = type === t.id;
              const tc  = t.color;
              const IC  = ICON_MAP[t.icon] || ICON_MAP[t.id];
              return (
                <button
                  key={t.id}
                  onClick={() => changeType(t.id)}
                  className="tc-card"
                  style={{
                    ...(t.id === "comprehensive" ? { gridColumn:"1/-1" } : {}),
                    display:"flex", flexDirection:"row", alignItems:"center",
                    gap:10, padding:"11px 13px", textAlign:"right",
                    background: sel
                      ? `linear-gradient(135deg,${tc}28,${tc}0f)`
                      : `linear-gradient(135deg,${C.layer1},${C.layer2})`,
                    border:`1px solid ${sel ? tc+"60" : C.edge}`,
                    borderRadius:12, cursor:"pointer",
                    boxShadow: sel ? `0 4px 18px ${tc}22` : "none",
                    transition:"all .15s", outline:"none",
                  }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background: sel ? `${tc}25` : C.layer3,
                    border: sel ? `1px solid ${tc}44` : `1px solid ${C.edge}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all .2s",
                  }}>
                    {IC ? <IC size={17} color={sel?tc:C.ash} /> : null}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight:sel?800:600, color:sel?tc:C.mist }}>{t.label}</span>
                      {t.badge && (
                        <span style={{
                          fontSize:8, fontWeight:900,
                          color: sel ? tc : C.ash,
                          background: sel ? `${tc}20` : C.layer3,
                          padding:"2px 6px", borderRadius:4,
                          border:`1px solid ${sel ? tc+"40" : C.edge}`,
                          flexShrink:0,
                        }}>{t.badge}</span>
                      )}
                    </div>
                    {t.id === "comprehensive"
                      ? <div style={{ marginTop:3 }}>
                          <div style={{ fontSize:9, color:sel?C.smoke:C.ash, lineHeight:1.5 }}>
                            <span style={{ color:C.mint, fontWeight:600 }}>GS</span> أساسي · 
                            <span style={{ color:C.mint, fontWeight:600 }}>MS</span> فني · 
                            <span style={{ color:C.mint, fontWeight:600 }}>BW</span> مخاطر
                          </div>
                          <div style={{ fontSize:9, color:sel?C.smoke:C.ash, lineHeight:1.5 }}>
                            <span style={{ color:C.mint, fontWeight:600 }}>JPM</span> أرباح · 
                            <span style={{ color:C.mint, fontWeight:600 }}>CIT</span> كلي · 
                            <span style={{ color:sel?C.smoke:C.ash }}>مشاعر</span>
                          </div>
                        </div>
                      : <div style={{ fontSize:10, color:sel?C.smoke:C.ash, lineHeight:1.35 }}>{t.desc}</div>
                    }
                  </div>
                  {sel && <div style={{ width:5, height:5, borderRadius:"50%", background:tc, flexShrink:0 }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ RUN BUTTON ══ */}
        {status === "idle" && (
          <button onClick={run} data-send-btn="true" className="run-btn" style={{
            width:"100%", padding:"15px",
            background:`linear-gradient(135deg,${selType.color}40,${selType.color}22)`,
            border:`2px solid ${selType.color}80`,
            borderRadius:14, cursor:"pointer", outline:"none",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            boxShadow:`0 6px 28px ${selType.color}30, inset 0 1px 0 ${selType.color}28`,
            transition:"all .15s",
            minHeight:52,
          }}>
            <span style={{ display:"flex" }}>{(() => { const IC = ICON_MAP[selType.id]; return IC ? <IC size={20} color={selType.color} /> : null; })()}</span>
            <span style={{ fontSize:14, fontWeight:800, color:selType.color, letterSpacing:"-.2px" }}>ابدأ {selType.label}</span>
            <span style={{ fontSize:13, color:selType.color, opacity:.6 }}>←</span>
          </button>
        )}

        {/* ══ SKELETON LOADING ══ */}
        {isLoad && !hasRes && (
          <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${selType.color}35`, background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, animation:"fadeIn .2s ease" }}>
            {/* header */}
            <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.edge}`, background:`linear-gradient(135deg,${C.void},${C.deep})`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid transparent", borderTopColor:selType.color, animation:"spin .65s linear infinite" }} />
                <span style={{ fontSize:11, fontWeight:700, color:selType.color }}>يحلل Claude {stock.name}...</span>
              </div>
              <span style={{ fontSize:10, color:selType.color, background:`${selType.color}15`, border:`1px solid ${selType.color}33`, padding:"2px 8px", borderRadius:6 }}>{selType.label}</span>
            </div>
            {/* skeleton lines */}
            <div style={{ padding:"16px 14px", display:"flex", flexDirection:"column", gap:10 }}>
              <Skel w="65%" h={14} />
              <Skel w="90%" h={10} />
              <Skel w="82%" h={10} />
              <Skel w="55%" h={10} />
              <div style={{ height:6 }} />
              <Skel w="50%" h={14} />
              <Skel w="86%" h={10} />
              <Skel w="72%" h={10} />
              <div style={{ height:6 }} />
              <Skel w="42%" h={14} />
              <Skel w="91%" h={10} />
              <Skel w="64%" h={10} />
              <Skel w="48%" h={10} />
            </div>
            {/* cancel */}
            <div style={{ padding:"10px 14px 14px", borderTop:`1px solid ${C.edge}`, display:"flex", justifyContent:"center" }}>
              <button onClick={() => { cancel(); setStatus("idle"); }} style={{
                padding:"7px 24px", background:"none", border:`1px solid ${C.line}`,
                borderRadius:8, cursor:"pointer", fontSize:11, color:C.smoke,
                fontFamily:"Cairo,sans-serif", minHeight:36,
              }}>⏹ إيقاف التحليل</button>
            </div>
          </div>
        )}

        {/* ══ RESULT ══ */}
        {hasRes && (
          <div style={{
            borderRadius:14, overflow:"hidden",
            border:`1px solid ${isLoad ? selType.color+"44" : C.line}`,
            background:`linear-gradient(135deg,${C.layer1},${C.layer2})`,
            boxShadow:`0 4px 20px rgba(0,0,0,.3), 0 0 0 1px ${selType.color}06`,
            transition:"border-color .3s",
          }}>
            {/* top accent */}
            <div style={{ height:2, background:`linear-gradient(90deg,${selType.color},${selType.color}55,transparent)`, transition:"background .3s" }} />
            {/* header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:`1px solid ${C.edge}`, background:`linear-gradient(135deg,${C.void},${C.deep})` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {isDone
                  ? <span style={{ display:"flex", alignItems:"center" }}><IconCheck size={15} color={C.mint} /></span>
                  : <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid transparent", borderTopColor:selType.color, animation:"spin .65s linear infinite" }} />}
                <span style={{ fontSize:11, fontWeight:700, color:isDone?C.mint:selType.color }}>
                  {isDone ? `اكتمل التحليل · ${words} كلمة` : "يكتب التحليل..."}
                </span>
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <span style={{ fontSize:10, color:selType.color, background:`${selType.color}18`, border:`1px solid ${selType.color}33`, padding:"2px 8px", borderRadius:6 }}>{selType.label}</span>
                <span style={{ fontSize:10, color:C.smoke, background:C.layer3, border:`1px solid ${C.line}`, padding:"2px 8px", borderRadius:6 }}>{stock.sym}</span>
              </div>
            </div>
            {/* content */}
            <div style={{ padding:"14px" }} aria-live="polite">
              <Result text={result} streaming={isLoad} analysisType={type} />
            </div>
            {/* actions */}
            {isDone && (
              <div style={{ borderTop:`1px solid ${C.edge}` }}>
                <div style={{ display:"flex", gap:8, padding:"10px 14px" }}>
                  <button onClick={reset} style={{
                    flex:1, padding:"10px", background:C.layer3, border:`1px solid ${C.line}`,
                    borderRadius:10, cursor:"pointer", fontSize:11, fontWeight:700, color:C.smoke,
                    minHeight:40, transition:"background .15s",
                  }}>× جديد</button>
                  <button onClick={run} style={{
                    flex:2, padding:"10px",
                    background:`linear-gradient(135deg,${selType.color}28,${selType.color}14)`,
                    border:`1px solid ${selType.color}44`,
                    borderRadius:10, cursor:"pointer", fontSize:11, fontWeight:800, color:selType.color,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    minHeight:40,
                  }}>↺ أعد التحليل</button>
                  <button onClick={saveToLearning} disabled={saving||saved} style={{
                    flex:2, padding:"10px",
                    background: saved ? `${C.mint}20` : saving ? C.layer3 : `${C.plasma}18`,
                    border:`1px solid ${saved ? C.mint+"50" : saving ? C.edge : C.plasma+"44"}`,
                    borderRadius:10, cursor:saving||saved?"default":"pointer",
                    fontSize:11, fontWeight:800,
                    color: saved ? C.mint : saving ? C.ash : C.plasma,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                    minHeight:40, transition:"all .2s",
                  }}>
                    {saving
                      ? <><div style={{width:11,height:11,borderRadius:"50%",border:"1.5px solid transparent",borderTopColor:C.plasma,animation:"spin .6s linear infinite"}} /> حفظ...</>
                      : saved ? <span style={{color:C.mint}}>تم الحفظ</span>
                      : <span>+ سجل التعلم</span>
                    }
                  </button>
                  {history.length > 0 && (
                    <button onClick={() => setShowHist(h => !h)} style={{
                      width:40, minHeight:40,
                      background: showHist ? `${C.electric}22` : C.layer3,
                      border:`1px solid ${showHist ? C.electric+"55" : C.line}`,
                      borderRadius:10, cursor:"pointer", fontSize:14, color:showHist?C.electric:C.smoke,
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}><IconClock size={14} color={C.smoke} /></button>
                  )}
                </div>
                {/* history panel */}
                {showHist && history.length > 0 && (
                  <div style={{ padding:"0 14px 12px", display:"flex", flexDirection:"column", gap:6 }}>
                    <div style={{ fontSize:10, color:C.ash, fontWeight:700, letterSpacing:"1px", marginBottom:2 }}>آخر التحليلات</div>
                    {history.map((h, i) => {
                      const min = Math.round((Date.now() - h.ts) / 60000);
                      return (
                        <button key={i} onClick={() => { changeStock(STOCKS.find(s=>s.sym===h.sym)||STOCKS[0]); changeType(h.typeId); }} style={{
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"8px 10px", background:C.void, borderRadius:8, border:`1px solid ${C.edge}`,
                          cursor:"pointer", textAlign:"right",
                        }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:7, background:`${SEC[STOCKS.find(s=>s.sym===h.sym)?.sec]||C.electric}20`, border:`1px solid ${SEC[STOCKS.find(s=>s.sym===h.sym)?.sec]||C.electric}40`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              <span style={{ fontSize:8, fontWeight:800, color:SEC[STOCKS.find(s=>s.sym===h.sym)?.sec]||C.electric }}>{h.sym}</span>
                            </div>
                            <div>
                              <div style={{ fontSize:11, fontWeight:700, color:C.mist }}>{h.name}</div>
                              <div style={{ fontSize:10, color:C.smoke }}>{h.typeLabel}</div>
                            </div>
                          </div>
                          <span style={{ fontSize:10, color:C.ash }}>{min < 1 ? "الآن" : `${min} د`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ ERROR ══ */}
        {isErr && (
          <div style={{ padding:14, background:`${C.coral}10`, border:`1px solid ${C.coral}33`, borderRadius:12, display:"flex", gap:10, animation:"fadeIn .2s ease" }}>
            <span style={{ flexShrink:0 }}><IconWarn size={20} color={C.coral} /></span>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:C.coral, marginBottom:4 }}>خطأ في التحليل</div>
              <div style={{ fontSize:11, color:C.smoke, lineHeight:1.55 }}>{errMsg}</div>
              <button onClick={run} style={{
                marginTop:10, padding:"6px 16px",
                background:`${C.coral}18`, border:`1px solid ${C.coral}33`,
                borderRadius:8, cursor:"pointer", fontSize:11, color:C.coral, fontWeight:700,
                fontFamily:"Cairo,sans-serif", minHeight:36,
              }}>↺ أعد المحاولة</button>
            </div>
          </div>
        )}

        {/* ══ EMPTY STATE ══ */}
        {status === "idle" && !hasRes && (
          <div style={{ marginTop:12, padding:"28px 16px 24px", background:`linear-gradient(135deg,${C.layer1},${C.layer2})`, borderRadius:16, border:`1px dashed ${C.line}`, textAlign:"center", animation:"fadeIn .3s ease" }}>
            <div style={{
              width:64, height:64, borderRadius:18, margin:"0 auto 14px",
              background:`linear-gradient(135deg,${C.electric}22,${C.electric}08)`,
              border:`1px solid ${C.electric}33`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:28, boxShadow:`0 8px 24px ${C.electric}15`,
            }}><IconBarChart size={28} color={C.electric} /></div>
            <div style={{ fontSize:14, fontWeight:700, color:C.mist, marginBottom:6 }}>اختر السهم ونوع التحليل</div>
            <div style={{ fontSize:11, color:C.smoke, lineHeight:1.6, marginBottom:18 }}>
              7 تحليلات متخصصة · GS · MS · BW · JPM · CIT · تحليل عميق
            </div>
            {/* disclaimer */}
            <div style={{ padding:"8px 12px", background:`${C.amber}08`, border:`1px solid ${C.amber}20`, borderRadius:8 }}>
              <span style={{ fontSize:10, color:C.smoke, lineHeight:1.6 }}><IconWarn size={11} color={C.smoke} style={{marginLeft:4}} /> للأغراض التعليمية فقط · ليس نصيحة استثمارية · راجع مستشاراً مالياً مرخصاً من هيئة CMA</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
  // ── استقبال تحليل الشارت من AppShell ──────────────────────────
  useEffect(function() {
    if (!aiAnalysis) return;
    setChartData(aiAnalysis);
    setShowChartAI(true);
    // auto-select stock if matches
    const found = STOCKS.find(s => s.sym === aiAnalysis.sym);
    if (found) setStock(found);
    // auto-select analysis types
    setType('comprehensive');
  }, [aiAnalysis]);


