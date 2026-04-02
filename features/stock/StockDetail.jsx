'use client';
/**
 * @module features/stock/StockDetail
 * @description صفحة تفاصيل السهم — بعد إعادة الهيكلة
 *
 * هذا الملف يحتوي على:
 * - الثوابت المشتركة (C palette, DEMO_STK, Skeleton, etc.)
 * - useSahmkData hook (جلب بيانات السهم الحية)
 * - StockDetail component (المكوّن الرئيسي)
 *
 * تبويبات السهم مستخرجة إلى:
 * - tabs/SDOverviewTab.jsx    → نظرة عامة + شارت + درجات
 * - tabs/SDTechnicalTab.jsx   → التحليل التقني
 * - tabs/SDFundamentalTab.jsx → التحليل الأساسي
 * - tabs/SDShareholdersTab.jsx → المساهمون
 * - tabs/SDSubComponents.jsx  → دفتر الأوامر + صفقات + أخبار
 * - tabs/SDApiEnginesTab.jsx  → محركات التحليل
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNav } from '../../store';

// ── تبويبات السهم (مستخرجة)
import { SDOverview }        from './tabs/SDOverviewTab';
import { TechLoader }        from './tabs/SDTechnicalTab';
import { SDFundamental }     from './tabs/SDFundamentalTab';
import { ShareholdersLoader } from './tabs/SDShareholdersTab';
import { SDApiEngines }      from './tabs/SDApiEnginesTab';

/**
 * STOCK DETAIL — معلومات السهم الكاملة
 * تداول+ — مطابق 100٪ للملف الأصلي
 * يشمل: CChart, SDOverview, SDTechnical, SDFundamental,
 *        SDShareholders, HealthScores, SnowflakeCard,
 *        OrderBookPanel, TickDataPanel, NLPNewsPanel
 */


/* ================================================================
   StockDetail.jsx — مستوى عالمي | Terminal Obsidian x Saudi Gold
   يضاهي Bloomberg Terminal + TradingView + Simply Wall St
================================================================ */

const C = {
  ink:"#06080f", deep:"#090c16", void:"#0c1020",
  layer1:"#141d2b", layer2:"#1e2d42", layer3:"#243352",
  edge:"#2e3e60", line:"#32426a",
  snow:"#f0f6ff", mist:"#c8d8f0", smoke:"#90a4c8", ash:"#5a6e94",
  gold:"#f0c050", goldL:"#ffd878", goldD:"#c09030",
  electric:"#4d9fff", electricL:"#82c0ff",
  plasma:"#a78bfa", mint:"#1ee68a", coral:"#ff5f6a", coralL:"#ff7a84",
  amber:"#fbbf24", teal:"#22d3ee",
};

const haptic = () => {};
const nowStr = () => { const d=new Date(),p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };

//
const DEMO_STK = {
  sym:"2222", name:"أرامكو السعودية", sec:"طاقة", subsec:"النفط والغاز المتكامل",
  p:27.80, ch:0.62, pct:2.28,
  o:27.20, dayHi:28.10, dayLo:27.05, prev:27.18,
  hi52:32.40, lo52:23.90,
  v:142_500_000, avgVol30:118_000_000, avgVol10:134_000_000,
  vwap:27.65,
  mc:"7.17T", mcNum:7170000000000,
  ev:"7.42T",

  // ─── مضاعفات التقييم (محسوبة على أساس سنوي) ───
  pe:15.1,          // p(27.80) / eps(1.84) = 15.1 ✅
  forwardPE:13.1,   // p(27.80) / epsForward(2.12) ≈ 13.1 ✅
  pegRatio:1.22,    // pe(15.1) / revGrowth3y(12.4%) = 1.22 ✅ (YoY سلبي → نستخدم 3y)
  pb:5.26,          // p(27.80) / bvps(5.28) = 5.26 ✅
  ps:4.4,           // mc(7170B) / rev_annual(1629B) = 4.40 ✅
  pcf:16.3,         // p(27.80) / fcfps(364000/214000=1.70) = 16.3 ✅
  evebitda:11.9,    // ev(7420B) / ebitda_annual(626B) = 11.85 ✅ (كان 8.4 خطأ)
  evEbit:15.0,      // ev(7420B) / ebit_annual(494B) = 15.02 ✅ (كان 9.8 خطأ)
  evSales:4.6,      // ev(7420B) / rev_annual(1629B) = 4.55 ✅

  // ─── EPS ───
  eps:1.84,         // مجموع EPS سنوي 2024: 0.46+0.43+0.46+0.49 = 1.84 ✅
  epsForward:2.12,
  epsTTM:1.84,

  // ─── بيانات السهم ───
  bvps:5.28,        // equity(1130000M) / shares(214000M) = 5.28 ريال ✅
  cfps:2.54,        // cfo_annual(543000M) / shares(214000M) = 2.54 ✅
  salesps:7.61,     // rev_annual(1629B) / shares(214B) = 7.61 ✅ (كان 6.32)
  beta:0.72, beta3y:0.68,

  // ─── الهوامش (سنوية 2024) ───
  roe:35.1,         // net(393000) / avg_equity((1108000+1130000)/2=1119000) = 35.1% ✅
  roa:22.0,         // net(393000) / avg_assets((1750000+1820000)/2=1785000) = 22.0% ✅
  roic:18.6, roce:21.1,
  grossMargin:50.9,  // gross_annual(830B) / rev_annual(1629B) = 50.95% ✅ (كان 51.2)
  opMargin:30.3,     // ebit_annual(494B) / rev_annual(1629B) = 30.3% ✅ (كان 28.4 خطأ)
  netMargin:24.1,    // net_annual(393B) / rev_annual(1629B) = 24.1% ✅
  ebitdaMargin:38.4, // ebitda_annual(626B) / rev_annual(1629B) = 38.4% ✅

  // ─── أرقام الدخل (سنوية 2024 — بالمليون ريال) ───
  rev:1629000,       // سنوي 2024 ✅ (كان 429000 — ربع واحد فقط خطأ)
  revGrowthYoY:-1.7, // (1629-1657)/1657 = -1.7% (انخفاض طفيف من 2023)
  revGrowth3y:12.4,
  net:393000,        // سنوي 2024 ✅ (كان 105000 خطأ)
  netGrowthYoY:-2.2, // (393-402)/402 = -2.2%
  ebitda:626000,     // سنوي 2024 ✅ (كان 166000 خطأ)
  ebit:494000,       // سنوي 2024 ✅ (كان 132000 خطأ)
  grossProfit:830000, // سنوي 2024 ✅ (كان 220000 خطأ)
  cogs:799000,       // سنوي 2024 ✅ (كان 209000 خطأ)
  da:132000,         // سنوي 2024 ✅ (كان 34000 خطأ)
  capex:179000,      // سنوي 2024 ✅
  fcf:364000,        // سنوي 2024 ✅ (كان 88000 خطأ)
  fcfYield:5.08,     // fcf(364B)/mc(7170B) = 5.08% ✅ (كان 3.21 خطأ)

  // ─── الميزانية العمومية ───
  totalAssets:1820000, totalDebt:247000, netDebt:189000, equity:1130000,
  cash:58000, currentAssets:420000, currentLiab:280000,
  currentRatio:1.5,   // 420/280 = 1.5 ✅
  quickRatio:1.35,   // (curA(420000)-inv(42000))/curL(280000) = 1.35 ✅
  debtEquity:0.22,    // debt(247B)/equity(1130B) = 0.22 ✅ (كان 0.42 خطأ)

  // ─── التوزيعات ───
  div:0.98,           // سنوي (4×0.12 + 0.50 خاص)
  divYld:3.52,        // 0.98/27.80 = 3.53% ✅
  divStreak:5, payoutRatio:53, // 0.98/1.84 = 53% ✅ (كان 50)
  divGrowth3y:4.2,
  exDivDate:"2024/09/01", payDate:"2024/09/15",

  nextEarnings:"2025/03/12", earningsSurprise:4.3,
  priceReturn1y:"+14.2%", priceReturn3m:"+6.8%", priceReturnYTD:"+9.1%",
  shares:"21.2B", sharesFloat:"2.05B", floatPct:6.81,
  shortInterest:0.8, shortRatio:1.2,
  insiderOwn:93.19, instOwn:1.0,

  // ─── نقاط مالية ───
  altmanZ:3.8, piotroski:7, beneish:-2.7,
  fv:31.5, fvMethod:"DCF + مضاعفات قطاعية",
  bid:27.78, ask:27.82, listedYear:2019,
  sectorPE:11.8, sectorPB:1.9, sectorROE:18.2, sectorDebtEq:0.61,
  //
  priceHistory: (() => {
    //
    let lcg=1664525*2222+1013904223; lcg=lcg&0xffffffff;
    const rand=()=>{ lcg=(lcg*1664525+1013904223)&0xffffffff; return (lcg>>>0)/0xffffffff; };
    let p2=27.80; const h=[];
    for(let i=89;i>=0;i--){
      const o=p2;
      p2=Math.max(23,Math.min(34,p2+(rand()-0.49)*0.3));
      const c=parseFloat(p2.toFixed(2));
      const rng2=Math.abs(c-o)*0.4+rand()*0.15;
      const hi=parseFloat((Math.max(o,c)+rng2).toFixed(2));
      const lo=parseFloat((Math.min(o,c)-rng2).toFixed(2));
      h.push({o:parseFloat(o.toFixed(2)),h:hi,l:lo,c,v:Math.floor(80e6+rand()*120e6)});
    }
    return h;
  })(),
};

const SHAREHOLDERS = {
  "2222": [
    { n:"حكومة المملكة العربية السعودية", pct:90.19, ch:0,     type:"حكومي",   since:"2019" },
    { n:"السوق العام (أسهم حرة)",          pct:6.81,  ch:-0.12, type:"أسواق",   since:"2019" },
    { n:"صندوق الاستثمارات العامة (PIF)",  pct:2.00,  ch:0,     type:"مؤسسي",   since:"2021" },
    { n:"مستثمرون مؤسسيون أجانب",         pct:0.72,  ch:0.04,  type:"مؤسسي",   since:"2019" },
    { n:"مستثمرون مؤسسيون محليون",        pct:0.28,  ch:0.02,  type:"مؤسسي",   since:"2019" },
  ],
  default:[{ n:"مساهمون متنوعون", pct:100, ch:0, type:"متنوع", since:"—" }],
};

const INSIDER_TX = {
  "2222": [
    { name:"أمين الناصر (CEO)",      action:"شراء",  shares:500000,  price:26.40, date:"2024/03/15", value:"13.2M" },
    { name:"Nassir Al-Mahasher",    action:"شراء",  shares:250000,  price:25.80, date:"2024/01/10", value:"6.45M" },
    { name:"عضو مجلس إدارة",        action:"بيع",   shares:100000,  price:29.10, date:"2023/11/20", value:"2.91M" },
  ],
  default:[],
};

const FINANCIALS_FULL = {
  "2222": {
    income: {
      quarterly:[
        { p:"Q4 2024", rev:429, cogs:209, gross:220, grossM:51.2, da:34, ebitda:166, ebitdaM:38.7, ebit:132, interest:8, tax:18, net:105, eps:0.49, shares:214 },
        { p:"Q3 2024", rev:411, cogs:201, gross:210, grossM:51.1, da:33, ebitda:159, ebitdaM:38.7, ebit:126, interest:7, tax:17, net:99,  eps:0.46, shares:214 },
        { p:"Q2 2024", rev:388, cogs:191, gross:197, grossM:50.8, da:32, ebitda:148, ebitdaM:38.1, ebit:116, interest:7, tax:16, net:91,  eps:0.43, shares:214 },
        { p:"Q1 2024", rev:401, cogs:198, gross:203, grossM:50.6, da:33, ebitda:153, ebitdaM:38.2, ebit:120, interest:7, tax:16, net:98,  eps:0.46, shares:214 },
        { p:"Q4 2023", rev:392, cogs:196, gross:196, grossM:50.0, da:31, ebitda:148, ebitdaM:37.8, ebit:117, interest:6, tax:16, net:95,  eps:0.44, shares:214 },
        { p:"Q3 2023", rev:403, cogs:202, gross:201, grossM:49.9, da:30, ebitda:150, ebitdaM:37.2, ebit:120, interest:6, tax:16, net:96,  eps:0.45, shares:214 },
        { p:"Q2 2023", rev:421, cogs:208, gross:213, grossM:50.6, da:30, ebitda:157, ebitdaM:37.3, ebit:127, interest:6, tax:17, net:101, eps:0.47, shares:214 },
        { p:"Q1 2023", rev:441, cogs:214, gross:227, grossM:51.5, da:29, ebitda:168, ebitdaM:38.1, ebit:139, interest:5, tax:19, net:110, eps:0.51, shares:214 },
      ],
      annual:[
        { p:"2024", rev:1629, cogs:799, gross:830, grossM:50.9, da:132, ebitda:626, ebitdaM:38.4, ebit:494, interest:28, tax:67, net:393, eps:1.84, shares:214 },
        { p:"2023", rev:1657, cogs:820, gross:837, grossM:50.5, da:120, ebitda:623, ebitdaM:37.6, ebit:503, interest:23, tax:68, net:402, eps:1.88, shares:214 },
        { p:"2022", rev:1811, cogs:860, gross:951, grossM:52.5, da:110, ebitda:710, ebitdaM:39.2, ebit:600, interest:18, tax:84, net:488, eps:2.28, shares:214 },
        { p:"2021", rev:1224, cogs:631, gross:593, grossM:48.4, da:102, ebitda:488, ebitdaM:39.9, ebit:386, interest:14, tax:52, net:310, eps:1.45, shares:214 },
        { p:"2020", rev:864,  cogs:490, gross:374, grossM:43.3, da:98,  ebitda:338, ebitdaM:39.1, ebit:240, interest:12, tax:28, net:185, eps:0.87, shares:214 },
      ],
    },
    balance: {
      quarterly:[
        { p:"Q4 2024", cash:58,  ar:89,  inv:42,  curA:420,  totalA:1820, curL:280,  totalL:690,  debt:247, netDebt:189, eq:1130, bvps:5.28 },
        { p:"Q3 2024", cash:52,  ar:85,  inv:40,  curA:408,  totalA:1798, curL:271,  totalL:672,  debt:240, netDebt:188, eq:1126, bvps:5.26 },
        { p:"Q2 2024", cash:61,  ar:82,  inv:38,  curA:412,  totalA:1780, curL:265,  totalL:658,  debt:238, netDebt:177, eq:1122, bvps:5.24 },
        { p:"Q1 2024", cash:55,  ar:88,  inv:41,  curA:418,  totalA:1762, curL:269,  totalL:643,  debt:232, netDebt:177, eq:1119, bvps:5.23 },
      ],
      annual:[
        { p:"2024", cash:58,  ar:89,  inv:42,  curA:420,  totalA:1820, curL:280,  totalL:690,  debt:247, netDebt:189, eq:1130, bvps:5.28 },
        { p:"2023", cash:48,  ar:82,  inv:39,  curA:398,  totalA:1750, curL:261,  totalL:642,  debt:222, netDebt:174, eq:1108, bvps:5.18 },
        { p:"2022", cash:65,  ar:90,  inv:44,  curA:445,  totalA:1710, curL:285,  totalL:610,  debt:198, netDebt:133, eq:1100, bvps:5.14 },
        { p:"2021", cash:42,  ar:71,  inv:36,  curA:390,  totalA:1620, curL:250,  totalL:568,  debt:182, netDebt:140, eq:1052, bvps:4.92 },
        { p:"2020", cash:38,  ar:60,  inv:32,  curA:342,  totalA:1540, curL:228,  totalL:540,  debt:170, netDebt:132, eq:1000, bvps:4.67 },
      ],
    },
    cashflow: {
      quarterly:[
        { p:"Q4 2024", cfo:144, capex:-47, fcf:97,  cfi:-58, cff:-70, netCash:16,  div:-52 },
        { p:"Q3 2024", cfo:138, capex:-45, fcf:93,  cfi:-54, cff:-67, netCash:17,  div:-51 },
        { p:"Q2 2024", cfo:128, capex:-44, fcf:84,  cfi:-52, cff:-70, netCash:6,   div:-51 },
        { p:"Q1 2024", cfo:133, capex:-43, fcf:90,  cfi:-50, cff:-65, netCash:18,  div:-51 },
      ],
      annual:[
        { p:"2024", cfo:543, capex:-179, fcf:364, cfi:-214, cff:-468, netCash:32,  div:-204 },
        { p:"2023", cfo:521, capex:-165, fcf:356, cfi:-202, cff:-445, netCash:26,  div:-198 },
        { p:"2022", cfo:622, capex:-148, fcf:474, cfi:-188, cff:-512, netCash:78,  div:-221 },
        { p:"2021", cfo:444, capex:-128, fcf:316, cfi:-162, cff:-390, netCash:36,  div:-178 },
        { p:"2020", cfo:298, capex:-119, fcf:179, cfi:-148, cff:-282, netCash:24,  div:-143 },
      ],
    },
  },
};

const EARNINGS_DATA = {
  "2222":[
    { date:"2025/03/12", period:"Q4 2025", eps:null,  epsEst:0.54, rev:null,  revEst:445, surprise:null,  future:true  },
    { date:"2024/11/10", period:"Q3 2024", eps:0.49,  epsEst:0.47, rev:429,   revEst:420, surprise:4.3,   future:false },
    { date:"2024/08/07", period:"Q2 2024", eps:0.46,  epsEst:0.44, rev:411,   revEst:405, surprise:4.5,   future:false },
    { date:"2024/05/08", period:"Q1 2024", eps:0.43,  epsEst:0.42, rev:388,   revEst:385, surprise:2.4,   future:false },
    { date:"2024/03/10", period:"Q4 2023", eps:0.46,  epsEst:0.48, rev:401,   revEst:415, surprise:-4.2,  future:false },
    { date:"2023/11/12", period:"Q3 2023", eps:0.45,  epsEst:0.43, rev:403,   revEst:398, surprise:4.7,   future:false },
    { date:"2023/08/09", period:"Q2 2023", eps:0.47,  epsEst:0.46, rev:421,   revEst:418, surprise:2.2,   future:false },
    { date:"2023/05/10", period:"Q1 2023", eps:0.51,  epsEst:0.50, rev:441,   revEst:438, surprise:2.0,   future:false },
  ],
  default:[
    { date:"2025/03/15", period:"Q4 2025", eps:null,  epsEst:0.52, rev:null,  revEst:122, surprise:null,  future:true  },
    { date:"2024/11/12", period:"Q3 2024", eps:0.47,  epsEst:0.45, rev:115,   revEst:113, surprise:4.4,   future:false },
    { date:"2024/08/10", period:"Q2 2024", eps:0.43,  epsEst:0.42, rev:110,   revEst:109, surprise:2.4,   future:false },
  ],
};

const DIVIDENDS_DETAIL = {
  "2222":[
    { date:"2024/12/15", exDate:"2024/12/01", div:0.50, yld:1.80, type:"خاص", growth:0 },
    { date:"2024/09/15", exDate:"2024/09/01", div:0.12, yld:0.43, type:"ربعي", growth:0 },
    { date:"2024/06/15", exDate:"2024/06/01", div:0.12, yld:0.43, type:"ربعي", growth:0 },
    { date:"2024/03/15", exDate:"2024/03/01", div:0.12, yld:0.43, type:"ربعي", growth:0 },
    { date:"2023/12/15", exDate:"2023/12/01", div:0.50, yld:1.80, type:"خاص", growth:0 },
    { date:"2023/09/15", exDate:"2023/09/01", div:0.12, yld:0.44, type:"ربعي", growth:9.1 },
  ],
  default:[
    { date:"2024/09/15", exDate:"2024/09/01", div:0.50, yld:2.0, type:"نصف سنوي", growth:4.2 },
    { date:"2024/03/15", exDate:"2024/03/01", div:0.50, yld:2.1, type:"نصف سنوي", growth:0 },
  ],
};

const PROS_CONS = {
  "2222":{ pros:["أكبر شركة نفط في العالم بطاقة 12 مليون برميل/يوم","هامش EBITDA 38.4% من الأعلى عالمياً في القطاع","دعم حكومي استراتيجي — ضمان الاستمرارية","احتياطيات نفطية تكفي 50+ سنة","توزيعات ثابتة ومتنامية منذ 5 سنوات","ألتمان Z-Score 3.8 — قوة مالية استثنائية","بيوتروسكي F-Score 7/9 — جودة أرباح عالية"], cons:["حساسية عالية لأسعار النفط العالمية (OPEC+)","تركز في قطاع واحد يرفع مخاطر التحول الطاقوي","نسبة التداول الحر 6.81% — سيولة محدودة","ضغوط رسوم كربونية متصاعدة دولياً","نمو EPS محدود في بيئة أسعار نفط منخفضة"] },
  default:{ pros:["أداء مالي مستقر","قيادة سوقية في قطاعها","توزيعات ثابتة"], cons:["تنافسية متزايدة","مخاطر تنظيمية","اعتماد على الدورة الاقتصادية"] },
};

const DISCLOSURES = {
  "2222":[
    { title:"نتائج Q3 2024: صافي ربح 99 مليار ريال (+3.1% YoY)", date:"2024/11/10", type:"نتائج مالية", impact:"عالي" },
    { title:"توزيع أرباح ربعي 0.12 ريال/سهم — العائد السنوي 3.52%",  date:"2024/09/15", type:"توزيعات",    impact:"متوسط" },
    { title:"توقيع عقود توسعة Jafurah بقيمة 12 مليار دولار",          date:"2024/08/20", type:"إفصاح",       impact:"عالي"   },
    { title:"خفض أوبك+ الإنتاج يدعم أسعار النفط فوق 80$",            date:"2024/07/05", type:"أخبار قطاع",  impact:"عالي"   },
    { title:"Moody's يثبت تصنيف A1 مع نظرة مستقبلية مستقرة",         date:"2024/06/18", type:"تصنيف ائتماني", impact:"متوسط" },
  ],
  default:[
    { title:"نتائج الربع الثالث 2024", date:"2024/11/12", type:"نتائج مالية", impact:"عالي" },
    { title:"توزيعات أرباح نصف سنوية", date:"2024/09/15", type:"توزيعات",    impact:"متوسط" },
  ],
};

const ANALYST_BANKS = {
  "2222":[
    //
    { bank:"JPMorgan",          rating:"شراء",    target:32.0, prev:31.0, date:"2025/02/18", upside:15.1 },
    { bank:"Goldman Sachs",     rating:"شراء",    target:31.5, prev:30.0, date:"2025/02/10", upside:13.3 },
    { bank:"HSBC",              rating:"احتفاظ",  target:27.5, prev:27.0, date:"2025/02/05", upside:-1.1 },
    { bank:"Morgan Stanley",    rating:"شراء",    target:30.0, prev:29.5, date:"2025/01/28", upside:7.9  },
    { bank:"Citi",              rating:"تخفيض وزن",target:25.2,prev:26.0,date:"2025/01/20", upside:-9.4 },
    { bank:"UBS",               rating:"احتفاظ",  target:28.0, prev:28.0, date:"2025/01/15", upside:0.7  },
    { bank:"Jefferies",         rating:"شراء",    target:33.0, prev:31.0, date:"2024/12/20", upside:18.7 },
    { bank:"EFG Hermes",        rating:"شراء",    target:31.0, prev:30.0, date:"2024/12/10", upside:11.5 },
    //
    { bank:"الراجحي Capital",   rating:"شراء",    target:30.5, prev:29.0, date:"2025/02/12", upside:9.7  },
    { bank:"SNB Capital",       rating:"احتفاظ",  target:27.8, prev:27.5, date:"2025/01/30", upside:0.0  },
    { bank:"رياض كابيتال",      rating:"شراء",    target:31.0, prev:30.0, date:"2025/01/22", upside:11.5 },
    { bank:"الإنماء للاستثمار", rating:"احتفاظ",  target:28.2, prev:27.8, date:"2024/12/15", upside:1.4  },
  ],
  default:[
    { bank:"محلل 1", rating:"شراء",   target:null, prev:null, date:"2025/01/01", upside:null },
    { bank:"محلل 2", rating:"احتفاظ", target:null, prev:null, date:"2024/12/15", upside:null },
    { bank:"محلل 3", rating:"بيع",    target:null, prev:null, date:"2024/11/20", upside:null },
  ],
};

const PEERS = {
  //
  "2222":[
    { sym:"2222", name:"أرامكو",          pe:14.2, pb:2.4, roe:22.4, divYld:3.52, grossM:51.2, opM:28.4, mc:"7.17T", p:27.80, pct:2.28,  isCurrent:true  },
    { sym:"2010", name:"سابك",            pe:18.4, pb:1.8, roe:9.8,  divYld:2.80, grossM:22.1, opM:8.4,  mc:"0.32T", p:80.50, pct:-0.62, isCurrent:false },
    { sym:"2030", name:"البابطين",         pe:12.1, pb:1.6, roe:13.2, divYld:3.10, grossM:28.4, opM:11.2, mc:"0.18T", p:44.20, pct:0.44,  isCurrent:false },
    { sym:"2350", name:"أنابيب السعودية",  pe:11.8, pb:2.1, roe:17.8, divYld:4.20, grossM:45.2, opM:22.1, mc:"0.12T", p:62.40, pct:1.12,  isCurrent:false },
    { sym:"2381", name:"بتروكيم",          pe:16.2, pb:1.4, roe:8.6,  divYld:2.50, grossM:19.8, opM:6.8,  mc:"0.08T", p:18.90, pct:-0.28, isCurrent:false },
    { sym:"1010", name:"الرياض المالية",   pe:13.4, pb:1.9, roe:11.4, divYld:3.80, grossM:38.6, opM:18.2, mc:"0.22T", p:28.10, pct:0.72,  isCurrent:false },
  ],
  default:[
    { sym:"A", name:"الشركة",  pe:14, pb:2.0, roe:18, divYld:3.0, grossM:40, opM:20, mc:"100B", p:20, pct:1.2, isCurrent:true  },
    { sym:"B", name:"منافس 1", pe:12, pb:1.8, roe:15, divYld:3.5, grossM:35, opM:16, mc:"80B",  p:16, pct:-0.5,isCurrent:false },
    { sym:"C", name:"منافس 2", pe:16, pb:2.2, roe:20, divYld:2.8, grossM:42, opM:22, mc:"120B", p:24, pct:0.8, isCurrent:false },
  ],
};

const FIN_SCORES = {
  "2222":{ altmanZ:3.8, piotroski:7, beneish:-2.7, cashScore:88, profitScore:91, growthScore:72, debtScore:82, overallLabel:"ممتاز", overallColor:"mint" },
  default:{ altmanZ:2.4, piotroski:5, beneish:-1.8, cashScore:65, profitScore:70, growthScore:60, debtScore:68, overallLabel:"جيد", overallColor:"amber" },
};

const TECH_DATA = {
  "2222":{ m5:"شراء قوي",m15:"شراء",m30:"شراء قوي",h1:"شراء",h5:"شراء",d1:"شراء قوي",w1:"شراء",mo1:"شراء",priceScore:72,maBuy:4,maSell:2,indBuy:3,indSell:2 },
  default:{ m5:"متعادل",m15:"مراقبة",m30:"شراء",h1:"شراء",h5:"متعادل",d1:"شراء",w1:"شراء",mo1:"متعادل",priceScore:55,maBuy:2,maSell:4,indBuy:2,indSell:4 },
};
//
const Skeleton = ({ w="100%", h=14, r=6, mb=0 }) => (
  <div style={{ width:w, height:h, borderRadius:r, marginBottom:mb,
    background:`linear-gradient(90deg,${C.layer3} 25%,${C.edge} 50%,${C.layer3} 75%)`,
    backgroundSize:"200% 100%", animation:"skeletonShimmer 1.4s ease infinite" }}/>
);
const SkeletonCard = ({ rows=3 }) => (
  <div style={{ background:`linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`, borderRadius:16, border:`1px solid ${C.line}`, boxShadow:`inset 0 1px 0 ${C.layer3}`, overflow:"hidden", marginBottom:10 }}>
    <div style={{ padding:"13px 16px", borderBottom:`1px solid ${C.line}44` }}><Skeleton h={13} w="50%"/></div>
    <div style={{ padding:"12px 16px" }}>{Array.from({length:rows}).map((_,i)=>(<div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:i<rows-1?10:0 }}><Skeleton h={11} w="40%"/><Skeleton h={11} w="25%"/></div>))}</div>
  </div>
);
const EmptyState = ({ icon="📭", title, subtitle, action, onAction }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px", textAlign:"center" }}>
    <div style={{ fontSize:40, marginBottom:16, opacity:0.5 }}>{icon}</div>
    <div style={{ fontSize:14, fontWeight:800, color:C.mist, marginBottom:8 }}>{title}</div>
    {subtitle && <div style={{ fontSize:12, color:C.smoke, lineHeight:1.6, maxWidth:260, marginBottom:action?20:0 }}>{subtitle}</div>}
    {action && onAction && <button onClick={onAction} style={{ background:`${C.electric}18`, border:`1px solid ${C.electric}44`, borderRadius:10, padding:"10px 20px", color:C.electric, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Cairo,sans-serif", minHeight:44 }}>{action}</button>}
  </div>
);
const ErrorState = ({ message, onRetry }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px 24px", textAlign:"center" }}>
    <div style={{ width:44, height:44, borderRadius:22, background:C.coral+"18", border:`1px solid ${C.coral}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:14 }}>⚠</div>
    <div style={{ fontSize:13, fontWeight:700, color:C.mist, marginBottom:6 }}>حدث خطأ</div>
    <div style={{ fontSize:11, color:C.smoke, lineHeight:1.6, marginBottom:onRetry?16:0 }}>{message||"تعذّر تحميل البيانات"}</div>
    {onRetry && <button onClick={onRetry} style={{ background:`${C.coral}15`, border:`1px solid ${C.coral}33`, borderRadius:10, padding:"9px 20px", color:C.coralL, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"Cairo,sans-serif", minHeight:44 }}>إعادة المحاولة</button>}
  </div>
);
const SectionCard = ({ title, children, accent, badge, infoBtn }) => (
  <div style={{ background:`linear-gradient(160deg,${C.layer2} 0%,${C.deep} 100%)`, borderRadius:16, border:`1px solid ${C.line}`, boxShadow:`inset 0 1px 0 ${C.layer3}`, overflow:"hidden", marginBottom:10 }}>
    {title && (
      <div style={{ padding:"13px 16px", borderBottom:`1px solid ${C.line}44`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {accent && <div style={{ width:3, height:16, background:accent, borderRadius:2, flexShrink:0 }}/>}
          <span style={{ fontSize:13, fontWeight:800, color:C.snow, letterSpacing:"-0.2px" }}>{title}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {badge && <span style={{ fontSize:11, fontWeight:700, color:badge.color, background:badge.color+"18", border:`1px solid ${badge.color}33`, borderRadius:20, padding:"2px 10px" }}>{badge.text}</span>}
          {infoBtn && <button onClick={infoBtn.onClick} style={{ width:20, height:20, borderRadius:"50%", background:C.layer3, border:`1px solid ${C.line}`, color:C.smoke, fontSize:11, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, lineHeight:1 }}>؟</button>}
        </div>
      </div>
    )}
    {children}
  </div>
);
const Row = ({ label, value, color, sub, even, section }) => {
  if(section) return (
    <div style={{ padding:"6px 16px 3px", background:C.layer3+"88", borderBottom:`1px solid ${C.line}33` }}>
      <span style={{ fontSize:10, fontWeight:700, color:C.electric, letterSpacing:"0.5px", textTransform:"uppercase" }}>{section}</span>
    </div>
  );
  return (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 16px", background:even?"rgba(255,255,255,.02)":"transparent", borderBottom:`1px solid ${C.line}22` }}>
    <div><div style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>{label}</div>{sub && <div style={{ fontSize:11, color:C.smoke, lineHeight:1.4 }}>{sub}</div>}</div>
    <span style={{ fontSize:11, fontWeight:700, color:color||C.mist, fontFamily:"IBM Plex Mono,monospace" }}>{value}</span>
  </div>
  );
};
const Tag = ({ text, color }) => (
  <span style={{ fontSize:11, fontWeight:700, color, background:color+"18", border:`1px solid ${color}33`, borderRadius:6, padding:"2px 10px" }}>{text}</span>
);

//

// ─── ChartLoader ─────────────────────────────────────────────────

const useSahmkData = (baseStkData) => {
  const [liveData,    setLiveData]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [lastFetch,   setLastFetch]   = useState(null);
  const [apiStatus,   setApiStatus]   = useState("loading");
  const [apiError,    setApiError]    = useState(null);

  useEffect(() => {
    let cancelled = false;
    const sym = baseStkData.sym;
    if (!sym) return;

    const fetchAll = async () => {
      setLoading(true);
      setApiStatus("loading");
      setApiError(null);
      try {
        const quote = await fetchSahmkQuote(sym);
        if (!quote || quote._apiErr) throw new Error(quote?._apiErr || "لا استجابة");
        const company = await fetchSahmkCompany(sym);
        if (!cancelled) {
          setLiveData({ ...quote, ...(company||{}) });
          setLastFetch(new Date().toLocaleTimeString("ar-SA"));
          setApiStatus(quote.isDelayed ? "delayed" : "live");
        }
      } catch(e) {
        if (!cancelled) {
          setApiStatus("error");
          setApiError(e.message);
          setLiveData({ _apiErr: e.message });
        }
      }
      if (!cancelled) setLoading(false);
    };

    fetchAll();

    const interval = setInterval(() => {
      fetchSahmkQuote(sym).then(q => {
        if (!cancelled && q) {
          setLiveData(prev => prev ? { ...prev, ...q } : q);
          setLastFetch(new Date().toLocaleTimeString("ar-SA"));
          setApiStatus(q.isDelayed ? "delayed" : "live");
        }
      });
    }, 30000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [baseStkData.sym]);

  const stk = liveData ? { ...baseStkData, ...liveData } : baseStkData;
  return { stk, loading, lastFetch, apiStatus, apiError };
};




export default function StockDetail({ stk: stkProp, wl=[], toggleStar, onClose, onExpand,
  apiConfig = null
}) {
  const baseStkData = stkProp || DEMO_STK;
  const { stk, loading, lastFetch, apiStatus, apiError } = useSahmkData(baseStkData);


  const [dtab, setDtab]       = useState("نظرة-عامة");
  const [prevTab, setPrevTab] = useState(null);
  const [per, setPer]         = useState("1M");
  const [starred, setStarred] = useState((wl||[]).includes(stk.sym));
  const isUp = (stk.pct||0) >= 0;

  const scrollRef  = useRef(null);
  const tabBarRef  = useRef(null);
  const swipeStart = useRef(null);

  useEffect(() => { setDtab("نظرة-عامة"); setPer("1M"); }, [stk.sym]);

  const goTab = useCallback((id) => {
    if(id===dtab) return;
    setPrevTab(dtab); setDtab(id);
    if(scrollRef.current) scrollRef.current.scrollTop=0;
    if(tabBarRef.current){ const btn=tabBarRef.current.querySelector(`[data-tab="${id}"]`); if(btn) btn.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"}); }
  }, [dtab]);

  const handleTouchStart = useCallback((e) => {
    let el=e.target;
    while(el&&el!==e.currentTarget){
      if(el.tagName==='CANVAS'||el.dataset?.noswipe==='1') return;
      const ox=window.getComputedStyle(el).overflowX;
      if((ox==='auto'||ox==='scroll')&&el.scrollWidth>el.clientWidth) return;
      el=el.parentElement;
    }
    swipeStart.current={x:e.touches[0].clientX,y:e.touches[0].clientY};
  }, []);
  const handleTouchEnd   = useCallback((e) => {
    if(!swipeStart.current) return;
    const dx=e.changedTouches[0].clientX-swipeStart.current.x;
    const dy=Math.abs(e.changedTouches[0].clientY-swipeStart.current.y);
    swipeStart.current=null;
    if(Math.abs(dx)<60||dy>40) return;
    const idx=DTABS.indexOf(dtab);
    if(dx>0&&idx<DTABS.length-1) goTab(DTABS[idx+1]);
    if(dx<0&&idx>0)              goTab(DTABS[idx-1]);
  }, [dtab, goTab]);

  useEffect(() => {
    if(!document.getElementById("sd-css-v5")){
      const s=document.createElement("style"); s.id="sd-css-v5";
      s.textContent=[
        "@keyframes skeletonShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}",
        "@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}",
        "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
        "@keyframes fadeIn{from{opacity:0}to{opacity:1}}",
        "@keyframes tabIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}",
        "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
        
        ".sd-tabIn{animation:tabIn .22s cubic-bezier(.16,1,.3,1) both}",
        ".sd-hs{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}",
        ".sd-hs::-webkit-scrollbar{display:none}",
        "button:active{opacity:0.75;transform:scale(0.97)}",
        "button{font-family:inherit;transition:opacity .12s,transform .12s}",
        ".sd-nosel{-webkit-user-select:none;user-select:none}",
      ].join(""); document.head.appendChild(s);
    }
    ["https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap",
     "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700;800;900&display=swap",
    ].forEach(href=>{ if(!document.querySelector(`link[href="${href}"]`)){ const l=document.createElement("link");l.rel="stylesheet";l.href=href;document.head.appendChild(l); } });
  }, []);

  const renderTab = (id) => {
    const wrap = (el) => <div key={id} className="sd-tabIn" style={{ padding:"14px 16px 48px" }}>{el}</div>;
    if(id==="نظرة-عامة")     return wrap(<SDOverview stk={stk} per={per} setPer={setPer} onNav={goTab} onExpand={onExpand}/>);
    if(id==="تقني")    return wrap(<TechLoader      stk={stk}/>);
    if(id==="أساسي")  return <div key={id} className="sd-tabIn"><SDFundamental stk={stk}/></div>;
    if(id==="محركات")   return wrap(<SDApiEngines    stk={stk}/>);
    if(id==="ملاك") return wrap(<ShareholdersLoader stk={stk}/>);
    return null;
  };

  const fmt = n => { if(!n) return "—"; const a=Math.abs(n); if(a>=1e12) return (n/1e12).toFixed(2)+"T"; if(a>=1e9) return (n/1e9).toFixed(1)+" مليار"; if(a>=1e6) return (n/1e6).toFixed(0)+" م"; return n.toLocaleString("en-US"); };

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, zIndex:300 }}>
      <div className="sd-nosel" dir="rtl" lang="ar" style={{ position:"absolute", top:0, left:0, right:0, bottom:0, margin:"0 auto", maxWidth:480, background:`linear-gradient(180deg,${C.layer2} 0%,${C.deep} 100%)`, display:"flex", flexDirection:"column" }}>


        {/* الهيدر */}
        <div style={{ padding:"4px 20px 8px", flexShrink:0 }}>
          {/* الاسم + الأزرار */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:`linear-gradient(135deg,${C.layer3},${C.layer2})`, border:`1px solid ${C.line}`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`inset 0 1px 0 ${C.edge}` }}>
                <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:900, color:C.snow, lineHeight:1 }}>{stk.sym}</span>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:C.snow, lineHeight:1.3 }}>{stk.name}</div>
                <div style={{ fontSize:11, color:C.smoke, marginTop:2, lineHeight:1.5 }}>{stk.sym} · <span style={{ color:C.electric }}>{stk.sec}</span>{stk.subsec&&` · ${stk.subsec}`}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={()=>{ setStarred(s=>!s); toggleStar&&toggleStar(stk.sym); }}
                style={{ width:44, height:44, background:starred?C.gold+"20":C.layer3, border:`1px solid ${starred?C.gold+"55":C.line}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:starred?C.gold:C.smoke, fontSize:18, cursor:"pointer", boxShadow:starred?`0 0 10px ${C.gold}22`:0 }}
                aria-label={starred?"إزالة من المفضلة":"إضافة للمفضلة"} aria-pressed={starred}>
                {starred?"★":"☆"}
              </button>
              {/* زر التنبيه السعري */}
              {(()=>{
                const [alertOpen2,  setAlertOpen2]  = useState(false);
                const [alertPrice2, setAlertPrice2] = useState(stk.p ? parseFloat((stk.p*1.05).toFixed(2)) : 0);
                const [alertType2,  setAlertType2]  = useState("فوق");
                const [alertSet2,   setAlertSet2]   = useState(false);
                const triggered2 = alertSet2 && (alertType2==="فوق" ? stk.p>=alertPrice2 : stk.p<=alertPrice2);
                const abRef = useRef(null);
                const [abRect, setAbRect] = useState(null);
                return (
                  <div>
                    <button ref={abRef}
                      onClick={()=>{ if(abRef.current) setAbRect(abRef.current.getBoundingClientRect()); setAlertOpen2(v=>!v); }}
                      style={{ width:44, height:44, background:triggered2?C.gold+"33":alertSet2?C.gold+"15":C.layer3, border:`1px solid ${triggered2?C.gold:alertSet2?C.gold+"55":C.line}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, cursor:"pointer", boxShadow:triggered2?`0 0 10px ${C.gold}44`:0 }}
                      aria-label="تنبيه سعري">
                      {triggered2?(
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          <circle cx="18" cy="8" r="3" fill={C.coral} stroke="none"/>
                        </svg>
                      ):alertSet2?(
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                          <circle cx="18" cy="8" r="3" fill={C.gold} stroke="none"/>
                        </svg>
                      ):(
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                        </svg>
                      )}
                    </button>
                    {alertOpen2 && abRect && (
                      <>
                        <div onClick={()=>setAlertOpen2(false)} style={{ position:"fixed", inset:0, zIndex:100 }}/>
                        <div style={{ position:"fixed", top:abRect.bottom+6, left:Math.max(8, Math.min(abRect.left, window.innerWidth-220)), background:C.layer1, border:`1px solid ${C.line}`, borderRadius:12, padding:14, boxShadow:"0 8px 28px rgba(0,0,0,.8)", zIndex:100, minWidth:210 }}>
                          <div style={{ fontSize:12, fontWeight:800, color:C.gold, marginBottom:10 }}>{"تنبيه سعري — "}{stk.sym}</div>
                          {triggered2 && (
                            <div style={{ padding:"7px 10px", background:C.gold+"22", border:`1px solid ${C.gold}`, borderRadius:8, marginBottom:10, fontSize:11, color:C.gold, fontWeight:700 }}>
                              ✓ تفعّل — السعر {alertType2==="فوق"?"تجاوز":"انخفض عن"} {alertPrice2} ر.س
                            </div>
                          )}
                          <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                            {["فوق","تحت"].map(t=>(
                              <button key={t} onClick={()=>setAlertType2(t)}
                                style={{ flex:1, padding:"6px", borderRadius:7, border:`1px solid ${alertType2===t?C.gold+"66":C.line}`, background:alertType2===t?C.gold+"18":"transparent", color:alertType2===t?C.gold:C.smoke, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>
                                {t}
                              </button>
                            ))}
                          </div>
                          <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:10 }}>
                            <input type="number" value={alertPrice2} step="0.1"
                              onChange={e=>setAlertPrice2(parseFloat(e.target.value))}
                              style={{ flex:1, background:C.layer3, border:`1px solid ${C.line}`, borderRadius:7, padding:"7px 10px", color:C.snow, fontSize:12, fontFamily:"IBM Plex Mono,monospace", textAlign:"center" }}/>
                            <span style={{ fontSize:11, color:C.smoke, flexShrink:0 }}>ر.س</span>
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            <button onClick={()=>{ setAlertSet2(true); setAlertOpen2(false); }}
                              style={{ flex:1, padding:"8px", borderRadius:8, background:C.gold+"22", border:`1px solid ${C.gold}44`, color:C.gold, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>
                              تفعيل
                            </button>
                            {alertSet2 && <button onClick={()=>{ setAlertSet2(false); setAlertOpen2(false); }}
                              style={{ padding:"8px 10px", borderRadius:8, background:C.layer3, border:`1px solid ${C.line}`, color:C.smoke, fontSize:11, cursor:"pointer", fontFamily:"Cairo,sans-serif" }}>
                              إلغاء
                            </button>}
                          </div>
                          {alertSet2 && !triggered2 && (
                            <div style={{ marginTop:8, fontSize:10, color:C.smoke, textAlign:"center", lineHeight:1.6 }}>
                              ⏳ مراقبة عند {alertType2} {alertPrice2} ر.س — الحالي {stk.p}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <button onClick={()=>onClose&&onClose()}
                style={{ width:44, height:44, background:C.layer3, border:`1px solid ${C.line}`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", color:C.smoke, fontSize:18, cursor:"pointer" }}
                aria-label="إغلاق">×</button>
            </div>
          </div>

          {/* السعر الرئيسي */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:10 }}>
            <span style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:36, fontWeight:900, color:C.snow, letterSpacing:"-2px", lineHeight:1, textShadow:`0 0 24px ${C.electric}33` }}>{stk.p.toFixed(2)}</span>
            <div style={{ paddingBottom:4 }}>
              <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:14, fontWeight:800, color:isUp?C.mint:C.coral, textShadow:`0 0 8px ${isUp?C.mint:C.coral}66`, marginBottom:2, lineHeight:1.5 }}>
                {isUp?"+":""}{stk.ch} ({isUp?"+":""}{stk.pct}%)
              </div>
              <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>{"الإغلاق السابق: "}{stk.prev}</div>
            </div>
            {stk.vwap && <div style={{ paddingBottom:4, marginRight:"auto" }}>
              <div style={{ fontSize:11, color:C.smoke, lineHeight:1.5 }}>VWAP</div>
              <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:12, fontWeight:700, color:C.amber, lineHeight:1.5 }}>{stk.vwap}</div>
            </div>}
          </div>

          {/* إحصائيات سريعة */}
          <div style={{ display:"flex", gap:0, background:C.layer3, borderRadius:10, overflow:"hidden", border:`1px solid ${C.line}`, marginBottom:6, boxShadow:`inset 0 1px 0 ${C.edge}` }}>
            {[
              {l:"الفتح",    v:stk.o},
              {l:"أعلى يومي",v:stk.dayHi},
              {l:"أدنى يومي",v:stk.dayLo},
              {l:"الحجم",   v:stk.v?(stk.v/1e6).toFixed(1)+"م":"—"},
            ].map((item,i)=>(
              <div key={i} style={{ padding:"7px 8px", borderLeft:i?`1px solid ${C.line}44`:0, flex:1, textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.smoke, marginBottom:3, letterSpacing:"0.4px", textTransform:"uppercase", lineHeight:1.5 }}>{item.l}</div>
                <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, fontWeight:800, color:C.mist, lineHeight:1.5 }}>{item.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* شريط التابات */}
        <div style={{ flexShrink:0 }}>
          <div ref={tabBarRef} className="sd-hs" role="tablist" aria-label="أقسام تفاصيل السهم" style={{ borderBottom:`1px solid ${C.line}55` }}>
            {DTABS.map((id,i)=>{
              const isAct=dtab===id;
              return (
                <button key={id} data-tab={id} onClick={()=>goTab(id)}
                  style={{ padding:"12px 15px", background:isAct?C.electric+"0a":"transparent", border:"none", borderBottom:`2px solid ${isAct?C.electric:"transparent"}`, color:isAct?C.electric:C.smoke, fontSize:11, fontWeight:isAct?800:500, fontFamily:"Cairo,sans-serif", whiteSpace:"nowrap", cursor:"pointer", flexShrink:0, transition:"color .2s,border-color .2s,background .2s", minHeight:44 }}
                  aria-selected={isAct} aria-label={DLABELS[i]} role="tab">
                  {DLABELS[i]}
                </button>
              );
            })}
          </div>
        </div>

        {/* المحتوى */}
        <div ref={scrollRef} style={{ overflowY:"auto", flex:1 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}>
          {renderTab(dtab)}
        </div>

      </div>
    </div>
  );
}
