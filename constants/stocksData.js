/**
 * stocksData.js — SINGLE SOURCE OF TRUTH
 *
 * ⚠️  NEVER duplicate this in any screen file.
 * ALL screens import from here via:
 *   import { STOCKS, STOCKS_MAP } from '../constants/stocksData';
 *
 * Coverage: 30 stocks across all major Tadawul sectors
 * Fields: 28 per stock (price, fundamentals, technicals, Saudi-specific)
 *
 * Data refresh: static seed — updated quarterly
 * Live prices: injected at runtime via stockStore.priceCache
 */

// ── الشركات الكبرى (Large Cap) ──────────────────────────────────
const _STOCKS_LARGE = [
  { sym:"2222", name:"أرامكو السعودية",    sec:"طاقة",          p:27.08, ch:-0.18, pct:-0.66, v:12400000, avgVol:9000000,  hi:30,  lo:22,  w52h:32.40, w52l:20.80, target:31.50, eps:1.36, pe:19.9, mktCap:6700, rating:88, divY:6.9,  roe:25.8, debt:0.13, revGrw:5.0,  epsGrw:5.0,  sector_beta:0.67, bookValue:5.8,  freeCashFlow:1.10, eps_q1:0.34, eps_q2:0.33, eps_q3:0.35, oilCorr:0.72, sectorId:"energy" },
  { sym:"1120", name:"مصرف الراجحي",       sec:"بنوك",          p:102.0, ch:1.20,  pct:1.19,  v:4100000,  avgVol:3200000,  hi:110, lo:88,  w52h:118.0, w52l:82.0,  target:115.0, eps:6.16, pe:16.6, mktCap:384,  rating:82, divY:2.4,  roe:23.1, debt:0.15, revGrw:8.0,  epsGrw:7.0,  sector_beta:0.88, bookValue:28.5, freeCashFlow:null, eps_q1:1.55, eps_q2:1.52, eps_q3:1.58, oilCorr:0.31, sectorId:"banks" },
  { sym:"2010", name:"سابك",               sec:"بتروكيماويات",  p:72.0,  ch:0.50,  pct:0.70,  v:2100000,  avgVol:1800000,  hi:80,  lo:60,  w52h:85.0,  w52l:58.0,  target:82.0,  eps:3.20, pe:22.5, mktCap:215,  rating:71, divY:3.8,  roe:9.2,  debt:0.28, revGrw:-3.0, epsGrw:-5.0, sector_beta:1.12, bookValue:42.1, freeCashFlow:2.80, eps_q1:0.80, eps_q2:0.75, eps_q3:0.82, oilCorr:0.68, sectorId:"petrochem" },
  { sym:"1010", name:"الأهلي التجاري",     sec:"بنوك",          p:30.0,  ch:0.20,  pct:0.67,  v:3800000,  avgVol:2900000,  hi:35,  lo:26,  w52h:37.5,  w52l:25.0,  target:34.0,  eps:1.85, pe:16.2, mktCap:225,  rating:79, divY:3.5,  roe:18.4, debt:0.12, revGrw:6.0,  epsGrw:5.5,  sector_beta:0.91, bookValue:11.2, freeCashFlow:null, eps_q1:0.46, eps_q2:0.45, eps_q3:0.48, oilCorr:0.28, sectorId:"banks" },
  { sym:"2350", name:"السعودية للكهرباء",  sec:"طاقة",          p:18.50, ch:-0.10, pct:-0.54, v:1500000,  avgVol:1200000,  hi:22,  lo:16,  w52h:23.5,  w52l:15.5,  target:21.0,  eps:0.85, pe:21.8, mktCap:111,  rating:65, divY:2.8,  roe:6.2,  debt:0.55, revGrw:3.0,  epsGrw:2.5,  sector_beta:0.45, bookValue:18.9, freeCashFlow:0.20, eps_q1:0.21, eps_q2:0.20, eps_q3:0.22, oilCorr:0.38, sectorId:"energy" },
];

// ── البنوك والخدمات المالية ─────────────────────────────────────
const _STOCKS_BANKS = [
  { sym:"1180", name:"بنك الجزيرة",        sec:"بنوك",          p:22.0,  ch:0.30,  pct:1.38,  v:2200000,  avgVol:1800000,  hi:26,  lo:19,  w52h:27.5,  w52l:18.0,  target:25.0,  eps:1.42, pe:15.5, mktCap:44,   rating:72, divY:2.7,  roe:14.8, debt:0.14, revGrw:9.0,  epsGrw:8.0,  sector_beta:0.94, bookValue:10.2, freeCashFlow:null, eps_q1:0.35, eps_q2:0.34, eps_q3:0.36, oilCorr:0.29, sectorId:"banks" },
  { sym:"1050", name:"بنك البلاد",          sec:"بنوك",          p:37.5,  ch:-0.20, pct:-0.53, v:1900000,  avgVol:1500000,  hi:42,  lo:32,  w52h:44.0,  w52l:30.5,  target:41.0,  eps:2.28, pe:16.4, mktCap:56,   rating:74, divY:3.2,  roe:16.2, debt:0.11, revGrw:11.0, epsGrw:10.0, sector_beta:0.96, bookValue:15.5, freeCashFlow:null, eps_q1:0.57, eps_q2:0.55, eps_q3:0.59, oilCorr:0.26, sectorId:"banks" },
  { sym:"1060", name:"بنك الرياض",          sec:"بنوك",          p:27.0,  ch:0.15,  pct:0.56,  v:2500000,  avgVol:2000000,  hi:31,  lo:23,  w52h:33.0,  w52l:22.0,  target:30.0,  eps:1.68, pe:16.1, mktCap:81,   rating:76, divY:2.9,  roe:15.5, debt:0.13, revGrw:7.5,  epsGrw:7.0,  sector_beta:0.90, bookValue:12.8, freeCashFlow:null, eps_q1:0.42, eps_q2:0.40, eps_q3:0.44, oilCorr:0.27, sectorId:"banks" },
];

// ── التقنية والاتصالات ──────────────────────────────────────────
const _STOCKS_TECH = [
  { sym:"7010", name:"الاتصالات السعودية", sec:"تقنية",         p:42.44, ch:0.52,  pct:1.24,  v:1800000,  avgVol:1400000,  hi:50,  lo:36,  w52h:52.5,  w52l:35.0,  target:48.0,  eps:2.65, pe:16.0, mktCap:127,  rating:80, divY:5.6,  roe:28.5, debt:0.20, revGrw:4.0,  epsGrw:4.5,  sector_beta:0.62, bookValue:12.5, freeCashFlow:2.20, eps_q1:0.66, eps_q2:0.64, eps_q3:0.68, oilCorr:0.18, sectorId:"telecom" },
  { sym:"7020", name:"موبايلي",             sec:"تقنية",         p:16.80, ch:-0.10, pct:-0.59, v:3200000,  avgVol:2600000,  hi:20,  lo:14,  w52h:21.5,  w52l:13.5,  target:19.0,  eps:0.98, pe:17.1, mktCap:50,   rating:70, divY:0.0,  roe:17.8, debt:0.35, revGrw:6.0,  epsGrw:5.0,  sector_beta:0.78, bookValue:7.2,  freeCashFlow:0.85, eps_q1:0.24, eps_q2:0.23, eps_q3:0.25, oilCorr:0.15, sectorId:"telecom" },
  { sym:"7030", name:"زين السعودية",        sec:"تقنية",         p:12.0,  ch:0.08,  pct:0.67,  v:4100000,  avgVol:3500000,  hi:15,  lo:10,  w52h:16.0,  w52l:9.5,   target:13.5,  eps:0.62, pe:19.4, mktCap:36,   rating:64, divY:0.0,  roe:12.5, debt:0.42, revGrw:7.0,  epsGrw:6.0,  sector_beta:0.82, bookValue:5.8,  freeCashFlow:0.40, eps_q1:0.15, eps_q2:0.14, eps_q3:0.16, oilCorr:0.12, sectorId:"telecom" },
];

// ── التعدين والمواد الأساسية ────────────────────────────────────
const _STOCKS_MATERIALS = [
  { sym:"1211", name:"معادن",               sec:"تعدين",         p:69.55, ch:0.07,  pct:0.10,  v:980000,   avgVol:800000,   hi:78,  lo:58,  w52h:80.0,  w52l:55.0,  target:76.0,  eps:2.18, pe:31.9, mktCap:209,  rating:74, divY:1.8,  roe:7.8,  debt:0.22, revGrw:8.0,  epsGrw:6.0,  sector_beta:1.08, bookValue:38.5, freeCashFlow:0.90, eps_q1:0.54, eps_q2:0.52, eps_q3:0.56, oilCorr:0.45, sectorId:"materials" },
  { sym:"2060", name:"سيرا",                sec:"بتروكيماويات",  p:55.0,  ch:0.30,  pct:0.55,  v:750000,   avgVol:600000,   hi:65,  lo:44,  w52h:68.0,  w52l:42.0,  target:62.0,  eps:2.40, pe:22.9, mktCap:33,   rating:69, divY:2.5,  roe:10.2, debt:0.30, revGrw:5.0,  epsGrw:4.0,  sector_beta:1.05, bookValue:28.0, freeCashFlow:1.50, eps_q1:0.60, eps_q2:0.58, eps_q3:0.62, oilCorr:0.60, sectorId:"petrochem" },
];

// ── الرعاية الصحية والأغذية ─────────────────────────────────────
const _STOCKS_CONSUMER = [
  { sym:"4001", name:"بن داود",             sec:"تجزئة",         p:155.0, ch:1.20,  pct:0.78,  v:180000,   avgVol:150000,   hi:175, lo:125, w52h:180.0, w52l:120.0, target:165.0, eps:7.80, pe:19.9, mktCap:31,   rating:78, divY:3.2,  roe:22.5, debt:0.10, revGrw:9.0,  epsGrw:8.5,  sector_beta:0.55, bookValue:42.0, freeCashFlow:5.50, eps_q1:1.95, eps_q2:1.90, eps_q3:1.98, oilCorr:0.08, sectorId:"retail" },
  { sym:"4008", name:"التميمي للمواد الغذائية",sec:"أغذية",      p:82.0,  ch:-0.40, pct:-0.49, v:220000,   avgVol:180000,   hi:95,  lo:68,  w52h:98.0,  w52l:65.0,  target:90.0,  eps:4.20, pe:19.5, mktCap:16,   rating:72, divY:2.8,  roe:19.8, debt:0.15, revGrw:7.0,  epsGrw:6.0,  sector_beta:0.48, bookValue:26.5, freeCashFlow:3.10, eps_q1:1.05, eps_q2:1.02, eps_q3:1.08, oilCorr:0.05, sectorId:"food" },
  { sym:"4007", name:"الوطنية للتنمية",     sec:"أغذية",         p:45.0,  ch:0.15,  pct:0.33,  v:350000,   avgVol:280000,   hi:52,  lo:38,  w52h:55.0,  w52l:36.0,  target:50.0,  eps:2.20, pe:20.5, mktCap:18,   rating:68, divY:3.5,  roe:15.5, debt:0.20, revGrw:5.5,  epsGrw:5.0,  sector_beta:0.52, bookValue:16.2, freeCashFlow:1.80, eps_q1:0.55, eps_q2:0.53, eps_q3:0.57, oilCorr:0.06, sectorId:"food" },
];

// ── الطاقة المتجددة والمرافق ────────────────────────────────────
const _STOCKS_UTILITIES = [
  { sym:"2082", name:"أكوا باور",           sec:"طاقة متجددة",  p:68.0,  ch:0.80,  pct:1.19,  v:420000,   avgVol:350000,   hi:82,  lo:55,  w52h:85.0,  w52l:52.0,  target:78.0,  eps:2.45, pe:27.8, mktCap:68,   rating:83, divY:1.5,  roe:14.2, debt:0.65, revGrw:22.0, epsGrw:18.0, sector_beta:0.72, bookValue:22.5, freeCashFlow:0.80, eps_q1:0.61, eps_q2:0.59, eps_q3:0.63, oilCorr:0.25, sectorId:"utilities" },
];

// ── العقارات والبنية التحتية ────────────────────────────────────
const _STOCKS_REALESTATE = [
  { sym:"4150", name:"دار الأركان",         sec:"عقارات",        p:11.0,  ch:-0.08, pct:-0.72, v:8500000,  avgVol:7000000,  hi:14,  lo:9,   w52h:15.0,  w52l:8.5,   target:12.5,  eps:0.58, pe:19.0, mktCap:44,   rating:60, divY:4.5,  roe:8.5,  debt:0.48, revGrw:4.0,  epsGrw:3.0,  sector_beta:1.15, bookValue:8.2,  freeCashFlow:0.35, eps_q1:0.14, eps_q2:0.13, eps_q3:0.15, oilCorr:0.22, sectorId:"realestate" },
  { sym:"4020", name:"إعمار المدينة",       sec:"عقارات",        p:22.0,  ch:0.10,  pct:0.46,  v:1200000,  avgVol:1000000,  hi:26,  lo:18,  w52h:28.0,  w52l:17.0,  target:25.0,  eps:1.10, pe:20.0, mktCap:22,   rating:65, divY:3.6,  roe:9.8,  debt:0.38, revGrw:6.0,  epsGrw:5.0,  sector_beta:1.10, bookValue:12.5, freeCashFlow:0.60, eps_q1:0.27, eps_q2:0.26, eps_q3:0.28, oilCorr:0.20, sectorId:"realestate" },
];

// ── التأمين ─────────────────────────────────────────────────────
const _STOCKS_INSURANCE = [
  { sym:"8230", name:"تاعمين",              sec:"تأمين",         p:88.0,  ch:-0.50, pct:-0.57, v:280000,   avgVol:220000,   hi:102, lo:74,  w52h:105.0, w52l:70.0,  target:96.0,  eps:4.85, pe:18.1, mktCap:22,   rating:77, divY:3.4,  roe:20.5, debt:0.08, revGrw:12.0, epsGrw:10.0, sector_beta:0.78, bookValue:28.5, freeCashFlow:3.80, eps_q1:1.21, eps_q2:1.18, eps_q3:1.25, oilCorr:0.15, sectorId:"insurance" },
];

// ── السياحة والترفيه ────────────────────────────────────────────
const _STOCKS_TOURISM = [
  { sym:"6010", name:"مدائن",               sec:"سياحة",         p:48.0,  ch:0.40,  pct:0.84,  v:650000,   avgVol:500000,   hi:58,  lo:40,  w52h:62.0,  w52l:38.0,  target:55.0,  eps:1.80, pe:26.7, mktCap:48,   rating:71, divY:1.8,  roe:11.5, debt:0.32, revGrw:18.0, epsGrw:15.0, sector_beta:0.88, bookValue:20.5, freeCashFlow:0.90, eps_q1:0.45, eps_q2:0.43, eps_q3:0.47, oilCorr:0.12, sectorId:"tourism" },
];

// ── الصناعة والخدمات ────────────────────────────────────────────
const _STOCKS_INDUSTRIAL = [
  { sym:"2381", name:"صافولا",              sec:"أغذية",         p:34.0,  ch:-0.20, pct:-0.58, v:420000,   avgVol:350000,   hi:40,  lo:28,  w52h:43.0,  w52l:27.0,  target:38.0,  eps:1.65, pe:20.6, mktCap:34,   rating:68, divY:2.9,  roe:11.2, debt:0.25, revGrw:3.5,  epsGrw:3.0,  sector_beta:0.58, bookValue:16.8, freeCashFlow:1.20, eps_q1:0.41, eps_q2:0.40, eps_q3:0.42, oilCorr:0.10, sectorId:"food" },
  { sym:"2280", name:"أجيليتي",             sec:"لوجستية",       p:28.0,  ch:0.20,  pct:0.72,  v:380000,   avgVol:310000,   hi:34,  lo:23,  w52h:36.0,  w52l:22.0,  target:32.0,  eps:1.40, pe:20.0, mktCap:28,   rating:70, divY:2.5,  roe:13.5, debt:0.18, revGrw:10.0, epsGrw:9.0,  sector_beta:0.72, bookValue:12.5, freeCashFlow:0.90, eps_q1:0.35, eps_q2:0.34, eps_q3:0.36, oilCorr:0.18, sectorId:"logistics" },
];


// ── إضافة أسهم لإكمال 30 ────────────────────────────────────
const _STOCKS_MORE = [
  { sym:"4030", name:"الصحة العالمية",      sec:"رعاية صحية",   p:52.0,  ch:0.30,  pct:0.58,  v:480000,   avgVol:390000,   hi:62,  lo:42,  w52h:65.0,  w52l:40.0,  target:58.0,  eps:2.60, pe:20.0, mktCap:26,   rating:73, divY:2.2,  roe:16.5, debt:0.12, revGrw:14.0, epsGrw:12.0, sector_beta:0.60, bookValue:18.5, freeCashFlow:1.80, eps_q1:0.65, eps_q2:0.63, eps_q3:0.67, oilCorr:0.08, sectorId:"healthcare" },
  { sym:"4164", name:"الخزف السعودي",        sec:"مواد بناء",    p:95.0,  ch:-0.50, pct:-0.52, v:250000,   avgVol:200000,   hi:108, lo:78,  w52h:112.0, w52l:75.0,  target:102.0, eps:4.80, pe:19.8, mktCap:57,   rating:71, divY:3.8,  roe:18.2, debt:0.08, revGrw:7.0,  epsGrw:6.5,  sector_beta:0.65, bookValue:35.0, freeCashFlow:3.50, eps_q1:1.20, eps_q2:1.18, eps_q3:1.22, oilCorr:0.14, sectorId:"materials" },
  { sym:"2040", name:"البابطين للطاقة",      sec:"صناعة",        p:38.0,  ch:0.25,  pct:0.66,  v:580000,   avgVol:470000,   hi:45,  lo:31,  w52h:47.0,  w52l:30.0,  target:43.0,  eps:1.90, pe:20.0, mktCap:38,   rating:67, divY:2.6,  roe:12.8, debt:0.22, revGrw:8.0,  epsGrw:7.0,  sector_beta:0.80, bookValue:16.5, freeCashFlow:1.20, eps_q1:0.47, eps_q2:0.46, eps_q3:0.49, oilCorr:0.28, sectorId:"industrial" },
  { sym:"9200", name:"جاهز للدجاج",         sec:"مطاعم",        p:42.0,  ch:0.20,  pct:0.48,  v:320000,   avgVol:260000,   hi:50,  lo:34,  w52h:52.0,  w52l:32.0,  target:47.0,  eps:2.10, pe:20.0, mktCap:21,   rating:69, divY:2.4,  roe:28.5, debt:0.18, revGrw:15.0, epsGrw:12.0, sector_beta:0.55, bookValue:10.5, freeCashFlow:1.50, eps_q1:0.52, eps_q2:0.51, eps_q3:0.54, oilCorr:0.06, sectorId:"restaurant" },
  { sym:"1304", name:"بيبكو",               sec:"بتروكيماويات",  p:28.0,  ch:-0.15, pct:-0.53, v:680000,   avgVol:560000,   hi:34,  lo:23,  w52h:36.0,  w52l:22.0,  target:31.0,  eps:1.42, pe:19.7, mktCap:42,   rating:66, divY:3.2,  roe:10.5, debt:0.32, revGrw:4.0,  epsGrw:3.5,  sector_beta:1.02, bookValue:14.2, freeCashFlow:0.80, eps_q1:0.35, eps_q2:0.34, eps_q3:0.37, oilCorr:0.55, sectorId:"petrochem" },
  { sym:"4180", name:"المواشي والأعلاف",    sec:"زراعة",        p:48.0,  ch:0.35,  pct:0.73,  v:190000,   avgVol:155000,   hi:58,  lo:39,  w52h:60.0,  w52l:37.0,  target:54.0,  eps:2.40, pe:20.0, mktCap:14,   rating:64, divY:3.1,  roe:14.2, debt:0.15, revGrw:11.0, epsGrw:9.0,  sector_beta:0.50, bookValue:18.5, freeCashFlow:1.60, eps_q1:0.60, eps_q2:0.58, eps_q3:0.62, oilCorr:0.04, sectorId:"agriculture" },
  { sym:"3050", name:"هرفي للغذاء",         sec:"توزيع غذائي",  p:118.0, ch:-1.00, pct:-0.84, v:145000,   avgVol:120000,   hi:135, lo:96,  w52h:140.0, w52l:92.0,  target:128.0, eps:5.90, pe:20.0, mktCap:35,   rating:75, divY:2.5,  roe:22.5, debt:0.20, revGrw:8.5,  epsGrw:7.5,  sector_beta:0.58, bookValue:38.5, freeCashFlow:4.20, eps_q1:1.47, eps_q2:1.44, eps_q3:1.50, oilCorr:0.07, sectorId:"food" },
];

// ══ الأسهم المضافة — توسيع التغطية إلى 97 سهم ══════════════════
const _STOCKS_EXPANDED = [
  { sym:"1020", name:"بنك الجزيرة",           sec:"بنوك",         p:21.84, ch:0.12,  pct:0.55,  v:2100000, avgVol:1800000, hi:25,  lo:18,  w52h:26.5, w52l:17.0, target:24.0,  eps:1.38, pe:15.8, mktCap:43,  rating:70, divY:2.7,  roe:14.2, debt:0.14, revGrw:9.0,  epsGrw:8.0,  sector_beta:0.94, bookValue:10.1, freeCashFlow:null, eps_q1:0.34, eps_q2:0.33, eps_q3:0.35, oilCorr:0.28, sectorId:"banks" },
  { sym:"1030", name:"بنك الإنماء",             sec:"بنوك",         p:29.50, ch:0.20,  pct:0.68,  v:3500000, avgVol:2800000, hi:34,  lo:25,  w52h:35.5, w52l:24.0, target:33.0,  eps:1.82, pe:16.2, mktCap:89,  rating:74, divY:3.0,  roe:16.8, debt:0.12, revGrw:10.0, epsGrw:9.0,  sector_beta:0.92, bookValue:12.5, freeCashFlow:null, eps_q1:0.45, eps_q2:0.44, eps_q3:0.47, oilCorr:0.27, sectorId:"banks" },
  { sym:"1080", name:"بنك ساب",                 sec:"بنوك",         p:38.10, ch:0.25,  pct:0.66,  v:2200000, avgVol:1900000, hi:44,  lo:32,  w52h:46.0, w52l:31.0, target:43.0,  eps:2.35, pe:16.2, mktCap:95,  rating:76, divY:3.8,  roe:17.5, debt:0.11, revGrw:8.0,  epsGrw:7.5,  sector_beta:0.89, bookValue:16.2, freeCashFlow:null, eps_q1:0.58, eps_q2:0.57, eps_q3:0.60, oilCorr:0.26, sectorId:"banks" },
  { sym:"1090", name:"البنك العربي الوطني",      sec:"بنوك",         p:26.80, ch:-0.10, pct:-0.37, v:1800000, avgVol:1500000, hi:31,  lo:23,  w52h:32.5, w52l:22.0, target:30.0,  eps:1.65, pe:16.2, mktCap:80,  rating:73, divY:2.8,  roe:15.2, debt:0.13, revGrw:7.5,  epsGrw:7.0,  sector_beta:0.91, bookValue:13.5, freeCashFlow:null, eps_q1:0.41, eps_q2:0.40, eps_q3:0.43, oilCorr:0.26, sectorId:"banks" },
  { sym:"1100", name:"بنك اليمامة",              sec:"بنوك",         p:22.50, ch:0.15,  pct:0.67,  v:1500000, avgVol:1200000, hi:26,  lo:19,  w52h:27.0, w52l:18.5, target:25.0,  eps:1.40, pe:16.1, mktCap:45,  rating:71, divY:2.5,  roe:14.5, debt:0.14, revGrw:8.0,  epsGrw:7.0,  sector_beta:0.93, bookValue:11.2, freeCashFlow:null, eps_q1:0.35, eps_q2:0.34, eps_q3:0.36, oilCorr:0.27, sectorId:"banks" },
  { sym:"1140", name:"بنك الرياض",               sec:"بنوك",         p:27.00, ch:0.10,  pct:0.37,  v:2400000, avgVol:2000000, hi:31,  lo:23,  w52h:32.5, w52l:22.5, target:30.5,  eps:1.68, pe:16.1, mktCap:81,  rating:75, divY:2.9,  roe:15.5, debt:0.13, revGrw:7.5,  epsGrw:7.0,  sector_beta:0.90, bookValue:12.8, freeCashFlow:null, eps_q1:0.42, eps_q2:0.41, eps_q3:0.43, oilCorr:0.27, sectorId:"banks" },
  { sym:"1150", name:"بنك الاستثمار",            sec:"بنوك",         p:35.40, ch:-0.20, pct:-0.56, v:900000,  avgVol:750000,  hi:41,  lo:30,  w52h:43.0, w52l:29.0, target:39.0,  eps:2.18, pe:16.2, mktCap:35,  rating:72, divY:3.1,  roe:15.8, debt:0.12, revGrw:8.5,  epsGrw:7.5,  sector_beta:0.90, bookValue:14.8, freeCashFlow:null, eps_q1:0.54, eps_q2:0.53, eps_q3:0.56, oilCorr:0.26, sectorId:"banks" },
  { sym:"1160", name:"البنك السعودي للاستثمار",  sec:"بنوك",         p:42.00, ch:0.30,  pct:0.72,  v:1100000, avgVol:900000,  hi:49,  lo:36,  w52h:51.0, w52l:35.0, target:47.0,  eps:2.60, pe:16.2, mktCap:63,  rating:74, divY:3.2,  roe:16.2, debt:0.11, revGrw:9.0,  epsGrw:8.0,  sector_beta:0.89, bookValue:17.5, freeCashFlow:null, eps_q1:0.65, eps_q2:0.63, eps_q3:0.67, oilCorr:0.26, sectorId:"banks" },
  { sym:"2020", name:"المتقدمة للبتروكيماويات", sec:"بتروكيماويات", p:62.00, ch:-0.40, pct:-0.64, v:480000,  avgVol:400000,  hi:72,  lo:52,  w52h:75.0, w52l:50.0, target:70.0,  eps:3.10, pe:20.0, mktCap:62,  rating:68, divY:2.4,  roe:10.5, debt:0.28, revGrw:3.0,  epsGrw:2.5,  sector_beta:1.10, bookValue:32.5, freeCashFlow:1.80, eps_q1:0.77, eps_q2:0.75, eps_q3:0.79, oilCorr:0.65, sectorId:"petrochem" },
  { sym:"2030", name:"المصافي",                  sec:"بتروكيماويات", p:44.00, ch:0.20,  pct:0.46,  v:350000,  avgVol:280000,  hi:52,  lo:36,  w52h:55.0, w52l:35.0, target:50.0,  eps:2.20, pe:20.0, mktCap:44,  rating:66, divY:2.7,  roe:9.8,  debt:0.30, revGrw:4.0,  epsGrw:3.5,  sector_beta:1.08, bookValue:25.5, freeCashFlow:1.40, eps_q1:0.55, eps_q2:0.53, eps_q3:0.57, oilCorr:0.68, sectorId:"petrochem" },
  { sym:"2070", name:"صناعات بترول أرامكو",      sec:"بتروكيماويات", p:27.50, ch:0.15,  pct:0.55,  v:1800000, avgVol:1500000, hi:32,  lo:23,  w52h:34.0, w52l:22.0, target:31.0,  eps:1.38, pe:19.9, mktCap:55,  rating:67, divY:2.9,  roe:9.5,  debt:0.25, revGrw:5.0,  epsGrw:4.5,  sector_beta:1.05, bookValue:16.8, freeCashFlow:0.90, eps_q1:0.34, eps_q2:0.33, eps_q3:0.35, oilCorr:0.70, sectorId:"petrochem" },
  { sym:"2080", name:"أنابيب الشرق",             sec:"بتروكيماويات", p:38.50, ch:-0.25, pct:-0.65, v:620000,  avgVol:520000,  hi:46,  lo:32,  w52h:48.0, w52l:31.0, target:44.0,  eps:1.93, pe:20.0, mktCap:23,  rating:65, divY:3.1,  roe:11.2, debt:0.22, revGrw:4.5,  epsGrw:4.0,  sector_beta:1.02, bookValue:21.5, freeCashFlow:1.20, eps_q1:0.48, eps_q2:0.47, eps_q3:0.50, oilCorr:0.62, sectorId:"petrochem" },
  { sym:"2090", name:"الغاز والتصنيع الأهلية",   sec:"بتروكيماويات", p:155.0, ch:1.00,  pct:0.65,  v:180000,  avgVol:150000,  hi:175, lo:128, w52h:180.0,w52l:125.0,target:168.0, eps:7.75, pe:20.0, mktCap:31,  rating:70, divY:3.5,  roe:13.5, debt:0.15, revGrw:6.0,  epsGrw:5.5,  sector_beta:0.98, bookValue:68.5, freeCashFlow:5.20, eps_q1:1.94, eps_q2:1.90, eps_q3:1.98, oilCorr:0.58, sectorId:"petrochem" },
  { sym:"2100", name:"نماء للكيماويات",           sec:"بتروكيماويات", p:18.50, ch:-0.10, pct:-0.54, v:950000,  avgVol:800000,  hi:22,  lo:15,  w52h:24.0, w52l:14.5, target:21.0,  eps:0.93, pe:19.9, mktCap:28,  rating:63, divY:2.7,  roe:8.5,  debt:0.32, revGrw:3.0,  epsGrw:2.5,  sector_beta:1.12, bookValue:12.5, freeCashFlow:0.55, eps_q1:0.23, eps_q2:0.22, eps_q3:0.24, oilCorr:0.63, sectorId:"petrochem" },
  { sym:"2110", name:"الكيمائية السعودية",        sec:"بتروكيماويات", p:52.00, ch:0.30,  pct:0.58,  v:420000,  avgVol:360000,  hi:62,  lo:44,  w52h:65.0, w52l:42.0, target:58.0,  eps:2.60, pe:20.0, mktCap:21,  rating:66, divY:2.3,  roe:10.8, debt:0.26, revGrw:4.0,  epsGrw:3.5,  sector_beta:1.06, bookValue:28.5, freeCashFlow:1.60, eps_q1:0.65, eps_q2:0.63, eps_q3:0.67, oilCorr:0.66, sectorId:"petrochem" },
  { sym:"2120", name:"المجموعة السعودية للكيماويات",sec:"بتروكيماويات",p:24.00,ch:0.12, pct:0.50,  v:680000,  avgVol:580000,  hi:29,  lo:20,  w52h:30.5, w52l:19.5, target:27.0,  eps:1.20, pe:20.0, mktCap:48,  rating:64, divY:2.5,  roe:9.2,  debt:0.29, revGrw:3.5,  epsGrw:3.0,  sector_beta:1.08, bookValue:14.8, freeCashFlow:0.75, eps_q1:0.30, eps_q2:0.29, eps_q3:0.31, oilCorr:0.64, sectorId:"petrochem" },
  { sym:"2250", name:"كيمانول",                   sec:"بتروكيماويات", p:19.20, ch:-0.08, pct:-0.42, v:820000,  avgVol:700000,  hi:23,  lo:16,  w52h:24.5, w52l:15.5, target:21.5,  eps:0.96, pe:20.0, mktCap:29,  rating:62, divY:2.6,  roe:8.8,  debt:0.31, revGrw:3.0,  epsGrw:2.5,  sector_beta:1.10, bookValue:12.8, freeCashFlow:0.58, eps_q1:0.24, eps_q2:0.23, eps_q3:0.25, oilCorr:0.62, sectorId:"petrochem" },
  { sym:"2290", name:"أسلاك",                    sec:"صناعة",        p:26.50, ch:0.15,  pct:0.57,  v:580000,  avgVol:495000,  hi:32,  lo:22,  w52h:34.0, w52l:21.0, target:30.0,  eps:1.33, pe:19.9, mktCap:53,  rating:65, divY:2.6,  roe:11.8, debt:0.24, revGrw:5.5,  epsGrw:5.0,  sector_beta:0.82, bookValue:13.5, freeCashFlow:0.85, eps_q1:0.33, eps_q2:0.32, eps_q3:0.34, oilCorr:0.25, sectorId:"industrial" },
  { sym:"2300", name:"السعودية للصناعات الأساسية",sec:"صناعة",        p:34.00, ch:-0.20, pct:-0.58, v:420000,  avgVol:360000,  hi:40,  lo:28,  w52h:42.0, w52l:27.0, target:38.0,  eps:1.70, pe:20.0, mktCap:34,  rating:64, divY:2.9,  roe:11.5, debt:0.26, revGrw:5.0,  epsGrw:4.5,  sector_beta:0.85, bookValue:17.5, freeCashFlow:1.10, eps_q1:0.42, eps_q2:0.41, eps_q3:0.44, oilCorr:0.30, sectorId:"industrial" },
  { sym:"2310", name:"المواد العازلة",             sec:"صناعة",        p:48.00, ch:0.30,  pct:0.63,  v:245000,  avgVol:210000,  hi:57,  lo:40,  w52h:60.0, w52l:39.0, target:54.0,  eps:2.40, pe:20.0, mktCap:24,  rating:67, divY:2.5,  roe:14.5, debt:0.18, revGrw:7.0,  epsGrw:6.0,  sector_beta:0.78, bookValue:20.5, freeCashFlow:1.82, eps_q1:0.60, eps_q2:0.58, eps_q3:0.62, oilCorr:0.22, sectorId:"industrial" },
  { sym:"2320", name:"المركز المالي",             sec:"خدمات مالية",  p:29.00, ch:0.18,  pct:0.62,  v:380000,  avgVol:325000,  hi:34,  lo:24,  w52h:36.0, w52l:23.5, target:32.5,  eps:1.45, pe:20.0, mktCap:29,  rating:67, divY:2.4,  roe:13.5, debt:0.12, revGrw:9.0,  epsGrw:7.5,  sector_beta:0.85, bookValue:12.8, freeCashFlow:1.12, eps_q1:0.36, eps_q2:0.35, eps_q3:0.37, oilCorr:0.20, sectorId:"financial" },
  { sym:"2340", name:"وفا للتأمين",               sec:"تأمين",        p:35.00, ch:-0.20, pct:-0.57, v:290000,  avgVol:248000,  hi:42,  lo:29,  w52h:44.0, w52l:28.0, target:39.0,  eps:1.75, pe:20.0, mktCap:18,  rating:64, divY:2.6,  roe:13.2, debt:0.09, revGrw:8.0,  epsGrw:6.5,  sector_beta:0.82, bookValue:14.5, freeCashFlow:1.35, eps_q1:0.44, eps_q2:0.43, eps_q3:0.45, oilCorr:0.13, sectorId:"insurance" },
  { sym:"2360", name:"بن لادن للمقاولات",         sec:"مقاولات",      p:18.00, ch:0.10,  pct:0.56,  v:680000,  avgVol:580000,  hi:22,  lo:15,  w52h:23.5, w52l:14.5, target:20.5,  eps:0.90, pe:20.0, mktCap:18,  rating:60, divY:2.8,  roe:9.5,  debt:0.42, revGrw:8.0,  epsGrw:6.5,  sector_beta:0.95, bookValue:9.5,  freeCashFlow:0.58, eps_q1:0.22, eps_q2:0.22, eps_q3:0.23, oilCorr:0.25, sectorId:"construction" },
  { sym:"2370", name:"المياه الوطنية",            sec:"مرافق",        p:52.00, ch:0.30,  pct:0.58,  v:180000,  avgVol:155000,  hi:62,  lo:44,  w52h:65.0, w52l:43.0, target:58.0,  eps:2.60, pe:20.0, mktCap:52,  rating:69, divY:3.5,  roe:12.5, debt:0.45, revGrw:10.0, epsGrw:8.0,  sector_beta:0.48, bookValue:24.5, freeCashFlow:1.80, eps_q1:0.65, eps_q2:0.63, eps_q3:0.67, oilCorr:0.32, sectorId:"utilities" },
  { sym:"2380", name:"بترو رابغ",                 sec:"بتروكيماويات", p:14.80, ch:-0.08, pct:-0.54, v:2400000, avgVol:2100000, hi:18,  lo:12,  w52h:19.5, w52l:11.5, target:16.5,  eps:0.74, pe:20.0, mktCap:45,  rating:60, divY:0.0,  roe:7.2,  debt:0.65, revGrw:6.0,  epsGrw:5.0,  sector_beta:1.15, bookValue:10.5, freeCashFlow:0.38, eps_q1:0.18, eps_q2:0.18, eps_q3:0.19, oilCorr:0.72, sectorId:"petrochem" },
  { sym:"1302", name:"المعادن والتعدين",           sec:"تعدين",        p:78.00, ch:0.50,  pct:0.65,  v:320000,  avgVol:270000,  hi:90,  lo:64,  w52h:95.0, w52l:62.0, target:86.0,  eps:3.90, pe:20.0, mktCap:156, rating:72, divY:2.0,  roe:8.2,  debt:0.20, revGrw:9.0,  epsGrw:7.5,  sector_beta:1.05, bookValue:42.5, freeCashFlow:2.10, eps_q1:0.97, eps_q2:0.95, eps_q3:0.99, oilCorr:0.42, sectorId:"materials" },
  { sym:"2160", name:"الزجاج السعودي",            sec:"مواد بناء",    p:88.00, ch:-0.60, pct:-0.68, v:145000,  avgVol:120000,  hi:102, lo:74,  w52h:106.0,w52l:72.0, target:96.0,  eps:4.40, pe:20.0, mktCap:53,  rating:70, divY:3.4,  roe:17.5, debt:0.10, revGrw:6.5,  epsGrw:6.0,  sector_beta:0.68, bookValue:32.5, freeCashFlow:3.20, eps_q1:1.10, eps_q2:1.08, eps_q3:1.12, oilCorr:0.15, sectorId:"materials" },
  { sym:"2170", name:"الأسمنت السعودية",          sec:"مواد بناء",    p:62.00, ch:0.40,  pct:0.65,  v:280000,  avgVol:240000,  hi:72,  lo:52,  w52h:76.0, w52l:50.0, target:68.0,  eps:3.10, pe:20.0, mktCap:62,  rating:68, divY:3.2,  roe:15.8, debt:0.08, revGrw:5.0,  epsGrw:4.5,  sector_beta:0.62, bookValue:25.5, freeCashFlow:2.40, eps_q1:0.77, eps_q2:0.75, eps_q3:0.79, oilCorr:0.12, sectorId:"materials" },
  { sym:"2190", name:"أسمنت القصيم",              sec:"مواد بناء",    p:45.00, ch:-0.30, pct:-0.66, v:220000,  avgVol:185000,  hi:53,  lo:38,  w52h:56.0, w52l:37.0, target:50.0,  eps:2.25, pe:20.0, mktCap:45,  rating:67, divY:3.3,  roe:14.5, debt:0.09, revGrw:4.5,  epsGrw:4.0,  sector_beta:0.63, bookValue:20.5, freeCashFlow:1.75, eps_q1:0.56, eps_q2:0.55, eps_q3:0.57, oilCorr:0.11, sectorId:"materials" },
  { sym:"2200", name:"أسمنت اليمامة",             sec:"مواد بناء",    p:56.00, ch:0.35,  pct:0.63,  v:190000,  avgVol:160000,  hi:65,  lo:47,  w52h:68.0, w52l:45.0, target:62.0,  eps:2.80, pe:20.0, mktCap:28,  rating:67, divY:3.0,  roe:15.2, debt:0.09, revGrw:5.0,  epsGrw:4.5,  sector_beta:0.63, bookValue:22.5, freeCashFlow:2.10, eps_q1:0.70, eps_q2:0.68, eps_q3:0.72, oilCorr:0.11, sectorId:"materials" },
  { sym:"2210", name:"أسمنت الجنوب",              sec:"مواد بناء",    p:40.00, ch:-0.20, pct:-0.50, v:165000,  avgVol:140000,  hi:47,  lo:34,  w52h:50.0, w52l:33.0, target:44.0,  eps:2.00, pe:20.0, mktCap:20,  rating:65, divY:3.5,  roe:14.0, debt:0.10, revGrw:4.0,  epsGrw:3.5,  sector_beta:0.65, bookValue:18.5, freeCashFlow:1.55, eps_q1:0.50, eps_q2:0.49, eps_q3:0.51, oilCorr:0.11, sectorId:"materials" },
  { sym:"4003", name:"اتحاد عطارين",             sec:"تجزئة",        p:32.00, ch:0.15,  pct:0.47,  v:280000,  avgVol:240000,  hi:38,  lo:27,  w52h:40.0, w52l:26.0, target:36.0,  eps:1.60, pe:20.0, mktCap:16,  rating:66, divY:3.1,  roe:18.5, debt:0.12, revGrw:8.0,  epsGrw:7.0,  sector_beta:0.55, bookValue:11.5, freeCashFlow:1.20, eps_q1:0.40, eps_q2:0.39, eps_q3:0.41, oilCorr:0.07, sectorId:"retail" },
  { sym:"4006", name:"بنده",                      sec:"تجزئة",        p:128.0, ch:0.80,  pct:0.63,  v:220000,  avgVol:190000,  hi:148, lo:108, w52h:152.0,w52l:105.0,target:140.0, eps:6.40, pe:20.0, mktCap:64,  rating:76, divY:2.5,  roe:24.5, debt:0.20, revGrw:7.0,  epsGrw:6.5,  sector_beta:0.52, bookValue:36.5, freeCashFlow:4.80, eps_q1:1.60, eps_q2:1.58, eps_q3:1.62, oilCorr:0.06, sectorId:"retail" },
  { sym:"4050", name:"سكو",                       sec:"تجزئة",        p:188.0, ch:1.20,  pct:0.64,  v:95000,   avgVol:80000,   hi:218, lo:158, w52h:225.0,w52l:155.0,target:205.0, eps:9.40, pe:20.0, mktCap:28,  rating:77, divY:2.4,  roe:26.5, debt:0.08, revGrw:9.0,  epsGrw:8.0,  sector_beta:0.50, bookValue:48.5, freeCashFlow:7.20, eps_q1:2.35, eps_q2:2.32, eps_q3:2.38, oilCorr:0.05, sectorId:"retail" },
  { sym:"4160", name:"شركة التعليم",              sec:"تعليم",        p:22.00, ch:0.10,  pct:0.46,  v:520000,  avgVol:440000,  hi:26,  lo:18,  w52h:27.5, w52l:17.5, target:25.0,  eps:1.10, pe:20.0, mktCap:22,  rating:68, divY:2.3,  roe:20.5, debt:0.15, revGrw:12.0, epsGrw:10.0, sector_beta:0.58, bookValue:8.5,  freeCashFlow:0.80, eps_q1:0.27, eps_q2:0.26, eps_q3:0.28, oilCorr:0.04, sectorId:"education" },
  { sym:"4190", name:"جرير للتسويق",              sec:"تجزئة",        p:168.0, ch:1.00,  pct:0.60,  v:185000,  avgVol:160000,  hi:195, lo:142, w52h:200.0,w52l:140.0,target:182.0, eps:8.40, pe:20.0, mktCap:84,  rating:80, divY:3.5,  roe:38.5, debt:0.05, revGrw:6.0,  epsGrw:5.5,  sector_beta:0.48, bookValue:28.5, freeCashFlow:6.80, eps_q1:2.10, eps_q2:2.08, eps_q3:2.12, oilCorr:0.05, sectorId:"retail" },
  { sym:"4200", name:"أسواق عبدالله العثيم",      sec:"تجزئة",        p:145.0, ch:-0.80, pct:-0.55, v:125000,  avgVol:105000,  hi:168, lo:122, w52h:172.0,w52l:120.0,target:158.0, eps:7.25, pe:20.0, mktCap:36,  rating:75, divY:3.1,  roe:29.5, debt:0.10, revGrw:7.0,  epsGrw:6.0,  sector_beta:0.50, bookValue:32.5, freeCashFlow:5.80, eps_q1:1.81, eps_q2:1.79, eps_q3:1.83, oilCorr:0.05, sectorId:"retail" },
  { sym:"4210", name:"المواساة للخدمات الطبية",   sec:"رعاية صحية",  p:85.00, ch:0.50,  pct:0.59,  v:240000,  avgVol:200000,  hi:99,  lo:72,  w52h:103.0,w52l:70.0, target:93.0,  eps:4.25, pe:20.0, mktCap:85,  rating:74, divY:2.8,  roe:18.5, debt:0.18, revGrw:11.0, epsGrw:9.5,  sector_beta:0.62, bookValue:28.5, freeCashFlow:3.20, eps_q1:1.06, eps_q2:1.04, eps_q3:1.08, oilCorr:0.07, sectorId:"healthcare" },
  { sym:"4220", name:"نجم للتأمين",               sec:"تأمين",        p:38.00, ch:-0.25, pct:-0.65, v:380000,  avgVol:320000,  hi:45,  lo:32,  w52h:47.0, w52l:31.0, target:42.0,  eps:1.90, pe:20.0, mktCap:19,  rating:66, divY:2.6,  roe:15.5, debt:0.08, revGrw:10.0, epsGrw:8.5,  sector_beta:0.78, bookValue:14.5, freeCashFlow:1.50, eps_q1:0.47, eps_q2:0.46, eps_q3:0.49, oilCorr:0.14, sectorId:"insurance" },
  { sym:"7040", name:"سيرا للاتصالات",           sec:"تقنية",        p:14.50, ch:0.08,  pct:0.55,  v:2800000, avgVol:2400000, hi:18,  lo:12,  w52h:19.5, w52l:11.5, target:16.5,  eps:0.73, pe:19.9, mktCap:22,  rating:62, divY:0.0,  roe:10.5, debt:0.45, revGrw:8.0,  epsGrw:6.0,  sector_beta:0.84, bookValue:6.2,  freeCashFlow:0.42, eps_q1:0.18, eps_q2:0.17, eps_q3:0.19, oilCorr:0.13, sectorId:"telecom" },
  { sym:"7200", name:"بيانات للاتصالات",          sec:"تقنية",        p:12.80, ch:-0.06, pct:-0.47, v:1800000, avgVol:1550000, hi:16,  lo:11,  w52h:17.0, w52l:10.5, target:14.5,  eps:0.64, pe:20.0, mktCap:19,  rating:60, divY:0.0,  roe:9.8,  debt:0.48, revGrw:6.0,  epsGrw:5.0,  sector_beta:0.86, bookValue:5.8,  freeCashFlow:0.35, eps_q1:0.16, eps_q2:0.15, eps_q3:0.17, oilCorr:0.12, sectorId:"telecom" },
  { sym:"7203", name:"اتحاد خدمات الاتصالات",    sec:"تقنية",        p:18.00, ch:0.10,  pct:0.56,  v:650000,  avgVol:550000,  hi:22,  lo:15,  w52h:23.5, w52l:14.5, target:20.5,  eps:0.90, pe:20.0, mktCap:18,  rating:63, divY:2.2,  roe:11.5, debt:0.32, revGrw:9.0,  epsGrw:7.5,  sector_beta:0.80, bookValue:8.5,  freeCashFlow:0.62, eps_q1:0.22, eps_q2:0.22, eps_q3:0.23, oilCorr:0.11, sectorId:"telecom" },
  { sym:"7204", name:"إنفورماتيكس",               sec:"تقنية",        p:38.50, ch:0.25,  pct:0.65,  v:420000,  avgVol:360000,  hi:46,  lo:32,  w52h:48.5, w52l:31.0, target:43.0,  eps:1.93, pe:20.0, mktCap:23,  rating:67, divY:2.6,  roe:16.5, debt:0.18, revGrw:12.0, epsGrw:10.0, sector_beta:0.75, bookValue:14.5, freeCashFlow:1.42, eps_q1:0.48, eps_q2:0.47, eps_q3:0.50, oilCorr:0.10, sectorId:"telecom" },
  { sym:"7240", name:"موضوع",                     sec:"تقنية",        p:128.0, ch:1.50,  pct:1.18,  v:180000,  avgVol:155000,  hi:148, lo:105, w52h:152.0,w52l:102.0,target:140.0, eps:6.40, pe:20.0, mktCap:32,  rating:78, divY:1.8,  roe:32.5, debt:0.08, revGrw:25.0, epsGrw:22.0, sector_beta:0.90, bookValue:26.5, freeCashFlow:5.20, eps_q1:1.60, eps_q2:1.58, eps_q3:1.62, oilCorr:0.08, sectorId:"tech" },
  { sym:"7241", name:"المختبرات الوطنية",         sec:"رعاية صحية",  p:52.00, ch:0.30,  pct:0.58,  v:285000,  avgVol:240000,  hi:62,  lo:44,  w52h:65.0, w52l:42.0, target:58.0,  eps:2.60, pe:20.0, mktCap:26,  rating:71, divY:2.3,  roe:20.5, debt:0.12, revGrw:14.0, epsGrw:12.0, sector_beta:0.60, bookValue:16.5, freeCashFlow:2.00, eps_q1:0.65, eps_q2:0.63, eps_q3:0.67, oilCorr:0.06, sectorId:"healthcare" },
  { sym:"4040", name:"دار الأوراق المالية",       sec:"خدمات مالية",  p:24.00, ch:0.12,  pct:0.50,  v:580000,  avgVol:490000,  hi:28,  lo:20,  w52h:30.0, w52l:19.5, target:27.0,  eps:1.20, pe:20.0, mktCap:24,  rating:65, divY:2.5,  roe:14.5, debt:0.10, revGrw:10.0, epsGrw:8.5,  sector_beta:0.82, bookValue:10.5, freeCashFlow:0.90, eps_q1:0.30, eps_q2:0.29, eps_q3:0.31, oilCorr:0.18, sectorId:"financial" },
  { sym:"4100", name:"إيقاع",                     sec:"عقارات",       p:15.20, ch:-0.08, pct:-0.52, v:1200000, avgVol:1050000, hi:18,  lo:13,  w52h:19.5, w52l:12.5, target:17.0,  eps:0.76, pe:20.0, mktCap:46,  rating:58, divY:3.9,  roe:7.5,  debt:0.52, revGrw:5.0,  epsGrw:4.0,  sector_beta:1.18, bookValue:10.5, freeCashFlow:0.42, eps_q1:0.19, eps_q2:0.18, eps_q3:0.20, oilCorr:0.20, sectorId:"realestate" },
  { sym:"4130", name:"السياحة",                   sec:"سياحة",        p:42.00, ch:0.20,  pct:0.48,  v:480000,  avgVol:400000,  hi:50,  lo:35,  w52h:53.0, w52l:34.0, target:47.0,  eps:2.10, pe:20.0, mktCap:21,  rating:63, divY:2.4,  roe:10.5, debt:0.38, revGrw:15.0, epsGrw:12.0, sector_beta:0.92, bookValue:18.5, freeCashFlow:1.40, eps_q1:0.52, eps_q2:0.51, eps_q3:0.54, oilCorr:0.14, sectorId:"tourism" },
  { sym:"4140", name:"طيران أديل",                sec:"نقل وخدمات",  p:16.50, ch:0.10,  pct:0.61,  v:2200000, avgVol:1900000, hi:20,  lo:14,  w52h:21.5, w52l:13.5, target:18.5,  eps:0.83, pe:19.9, mktCap:33,  rating:62, divY:0.0,  roe:12.5, debt:0.55, revGrw:20.0, epsGrw:18.0, sector_beta:1.02, bookValue:6.8,  freeCashFlow:0.48, eps_q1:0.20, eps_q2:0.20, eps_q3:0.21, oilCorr:0.28, sectorId:"transport" },
  { sym:"8010", name:"ميدغلف للتأمين",           sec:"تأمين",        p:32.00, ch:0.15,  pct:0.47,  v:320000,  avgVol:270000,  hi:38,  lo:27,  w52h:40.0, w52l:26.0, target:36.0,  eps:1.60, pe:20.0, mktCap:32,  rating:67, divY:2.5,  roe:14.5, debt:0.09, revGrw:9.0,  epsGrw:7.5,  sector_beta:0.80, bookValue:13.5, freeCashFlow:1.25, eps_q1:0.40, eps_q2:0.39, eps_q3:0.41, oilCorr:0.13, sectorId:"insurance" },
  { sym:"8020", name:"ملاذ للتأمين",              sec:"تأمين",        p:28.50, ch:-0.15, pct:-0.52, v:280000,  avgVol:240000,  hi:34,  lo:24,  w52h:36.0, w52l:23.0, target:32.0,  eps:1.43, pe:19.9, mktCap:14,  rating:65, divY:2.8,  roe:13.5, debt:0.09, revGrw:8.5,  epsGrw:7.0,  sector_beta:0.82, bookValue:12.8, freeCashFlow:1.10, eps_q1:0.36, eps_q2:0.35, eps_q3:0.37, oilCorr:0.13, sectorId:"insurance" },
  { sym:"8040", name:"الدرع العربي للتأمين",      sec:"تأمين",        p:22.00, ch:0.10,  pct:0.46,  v:420000,  avgVol:360000,  hi:26,  lo:19,  w52h:28.0, w52l:18.0, target:25.0,  eps:1.10, pe:20.0, mktCap:22,  rating:63, divY:2.3,  roe:12.5, debt:0.10, revGrw:7.5,  epsGrw:6.0,  sector_beta:0.82, bookValue:10.5, freeCashFlow:0.85, eps_q1:0.27, eps_q2:0.27, eps_q3:0.28, oilCorr:0.13, sectorId:"insurance" },
  { sym:"8050", name:"ولاء للتأمين التعاوني",     sec:"تأمين",        p:18.80, ch:-0.10, pct:-0.53, v:380000,  avgVol:325000,  hi:23,  lo:16,  w52h:24.5, w52l:15.5, target:21.5,  eps:0.94, pe:20.0, mktCap:9,   rating:62, divY:2.7,  roe:11.8, debt:0.10, revGrw:7.0,  epsGrw:5.5,  sector_beta:0.84, bookValue:9.5,  freeCashFlow:0.72, eps_q1:0.23, eps_q2:0.23, eps_q3:0.24, oilCorr:0.12, sectorId:"insurance" },
  { sym:"8060", name:"الأهلية للتأمين",           sec:"تأمين",        p:56.00, ch:0.35,  pct:0.63,  v:180000,  avgVol:155000,  hi:66,  lo:47,  w52h:69.0, w52l:45.0, target:62.0,  eps:2.80, pe:20.0, mktCap:28,  rating:68, divY:2.9,  roe:16.5, debt:0.08, revGrw:10.5, epsGrw:9.0,  sector_beta:0.79, bookValue:20.5, freeCashFlow:2.20, eps_q1:0.70, eps_q2:0.68, eps_q3:0.72, oilCorr:0.13, sectorId:"insurance" },
  { sym:"8070", name:"المتحدة للتأمين",           sec:"تأمين",        p:42.00, ch:0.20,  pct:0.48,  v:215000,  avgVol:185000,  hi:50,  lo:35,  w52h:52.0, w52l:34.0, target:46.0,  eps:2.10, pe:20.0, mktCap:21,  rating:66, divY:2.4,  roe:14.5, debt:0.09, revGrw:9.0,  epsGrw:7.5,  sector_beta:0.80, bookValue:16.5, freeCashFlow:1.62, eps_q1:0.52, eps_q2:0.51, eps_q3:0.54, oilCorr:0.13, sectorId:"insurance" },
  { sym:"8100", name:"بوبا العربية",              sec:"تأمين",        p:138.0, ch:1.00,  pct:0.73,  v:125000,  avgVol:108000,  hi:160, lo:118, w52h:165.0,w52l:115.0,target:150.0, eps:6.90, pe:20.0, mktCap:138, rating:77, divY:2.9,  roe:22.5, debt:0.07, revGrw:12.0, epsGrw:10.0, sector_beta:0.76, bookValue:42.5, freeCashFlow:5.50, eps_q1:1.72, eps_q2:1.70, eps_q3:1.74, oilCorr:0.12, sectorId:"insurance" },
  { sym:"4002", name:"دله للخدمات الصحية",       sec:"رعاية صحية",  p:152.0, ch:1.00,  pct:0.66,  v:88000,   avgVol:75000,   hi:176, lo:128, w52h:180.0,w52l:125.0,target:165.0, eps:7.60, pe:20.0, mktCap:228, rating:78, divY:2.3,  roe:20.5, debt:0.14, revGrw:12.0, epsGrw:10.5, sector_beta:0.60, bookValue:48.5, freeCashFlow:5.80, eps_q1:1.90, eps_q2:1.88, eps_q3:1.92, oilCorr:0.06, sectorId:"healthcare" },
  { sym:"4009", name:"حمد الطبية",                sec:"رعاية صحية",  p:46.00, ch:0.25,  pct:0.55,  v:320000,  avgVol:275000,  hi:54,  lo:39,  w52h:57.0, w52l:38.0, target:51.0,  eps:2.30, pe:20.0, mktCap:46,  rating:72, divY:2.2,  roe:18.5, debt:0.15, revGrw:13.0, epsGrw:11.0, sector_beta:0.62, bookValue:16.5, freeCashFlow:1.75, eps_q1:0.57, eps_q2:0.56, eps_q3:0.59, oilCorr:0.06, sectorId:"healthcare" },
  { sym:"4015", name:"النهدي الطبي",              sec:"رعاية صحية",  p:188.0, ch:1.20,  pct:0.64,  v:65000,   avgVol:56000,   hi:218, lo:158, w52h:225.0,w52l:155.0,target:205.0, eps:9.40, pe:20.0, mktCap:376, rating:80, divY:2.7,  roe:35.5, debt:0.08, revGrw:10.0, epsGrw:9.0,  sector_beta:0.55, bookValue:36.5, freeCashFlow:7.50, eps_q1:2.35, eps_q2:2.32, eps_q3:2.38, oilCorr:0.06, sectorId:"healthcare" },
  { sym:"2083", name:"أكوا باور إنترناشيونال",    sec:"طاقة متجددة",  p:72.50, ch:0.80,  pct:1.12,  v:380000,  avgVol:320000,  hi:88,  lo:58,  w52h:92.0, w52l:56.0, target:82.0,  eps:3.63, pe:20.0, mktCap:218, rating:84, divY:1.4,  roe:13.8, debt:0.68, revGrw:24.0, epsGrw:20.0, sector_beta:0.72, bookValue:24.5, freeCashFlow:0.78, eps_q1:0.90, eps_q2:0.88, eps_q3:0.92, oilCorr:0.24, sectorId:"utilities" },
  { sym:"2084", name:"الشركة السعودية للمياه",    sec:"مرافق",        p:22.00, ch:0.12,  pct:0.55,  v:820000,  avgVol:700000,  hi:26,  lo:18,  w52h:28.0, w52l:17.5, target:24.5,  eps:1.10, pe:20.0, mktCap:44,  rating:64, divY:3.2,  roe:8.5,  debt:0.58, revGrw:6.0,  epsGrw:5.0,  sector_beta:0.48, bookValue:14.8, freeCashFlow:0.55, eps_q1:0.27, eps_q2:0.27, eps_q3:0.28, oilCorr:0.35, sectorId:"utilities" },
  { sym:"4261", name:"الناقلون",                  sec:"نقل وخدمات",  p:48.00, ch:0.30,  pct:0.63,  v:280000,  avgVol:240000,  hi:57,  lo:40,  w52h:60.0, w52l:39.0, target:54.0,  eps:2.40, pe:20.0, mktCap:48,  rating:70, divY:2.5,  roe:14.5, debt:0.30, revGrw:12.0, epsGrw:10.0, sector_beta:0.88, bookValue:20.5, freeCashFlow:1.82, eps_q1:0.60, eps_q2:0.58, eps_q3:0.62, oilCorr:0.22, sectorId:"transport" },
  { sym:"4263", name:"أرامكس السعودية",           sec:"نقل وخدمات",  p:12.80, ch:0.08,  pct:0.63,  v:1800000, avgVol:1560000, hi:16,  lo:11,  w52h:17.5, w52l:10.5, target:14.5,  eps:0.64, pe:20.0, mktCap:64,  rating:65, divY:1.6,  roe:12.5, debt:0.28, revGrw:10.0, epsGrw:8.5,  sector_beta:0.85, bookValue:6.2,  freeCashFlow:0.45, eps_q1:0.16, eps_q2:0.15, eps_q3:0.17, oilCorr:0.18, sectorId:"transport" },
  { sym:"6090", name:"نادك",                      sec:"زراعة",        p:38.00, ch:0.25,  pct:0.66,  v:285000,  avgVol:245000,  hi:45,  lo:32,  w52h:47.5, w52l:31.0, target:43.0,  eps:1.90, pe:20.0, mktCap:38,  rating:66, divY:2.6,  roe:12.5, debt:0.22, revGrw:8.0,  epsGrw:7.0,  sector_beta:0.55, bookValue:18.5, freeCashFlow:1.42, eps_q1:0.47, eps_q2:0.46, eps_q3:0.49, oilCorr:0.05, sectorId:"agriculture" },
  { sym:"6001", name:"الجوف للتنمية الزراعية",    sec:"زراعة",        p:58.00, ch:-0.40, pct:-0.68, v:155000,  avgVol:132000,  hi:69,  lo:49,  w52h:72.0, w52l:47.0, target:65.0,  eps:2.90, pe:20.0, mktCap:29,  rating:65, divY:2.8,  roe:11.5, debt:0.18, revGrw:9.0,  epsGrw:7.5,  sector_beta:0.52, bookValue:28.5, freeCashFlow:2.10, eps_q1:0.72, eps_q2:0.71, eps_q3:0.73, oilCorr:0.04, sectorId:"agriculture" },
  { sym:"6002", name:"المراعي",                   sec:"أغذية",        p:56.00, ch:0.30,  pct:0.54,  v:380000,  avgVol:330000,  hi:66,  lo:48,  w52h:70.0, w52l:46.0, target:62.0,  eps:2.80, pe:20.0, mktCap:56,  rating:74, divY:3.6,  roe:22.5, debt:0.12, revGrw:6.0,  epsGrw:5.5,  sector_beta:0.50, bookValue:18.5, freeCashFlow:2.20, eps_q1:0.70, eps_q2:0.68, eps_q3:0.72, oilCorr:0.05, sectorId:"food" },
  { sym:"6020", name:"الإنماء الزراعي",           sec:"زراعة",        p:22.00, ch:0.12,  pct:0.55,  v:420000,  avgVol:360000,  hi:26,  lo:18,  w52h:28.0, w52l:17.5, target:25.0,  eps:1.10, pe:20.0, mktCap:22,  rating:63, divY:2.7,  roe:10.5, debt:0.25, revGrw:7.0,  epsGrw:6.0,  sector_beta:0.55, bookValue:12.5, freeCashFlow:0.82, eps_q1:0.27, eps_q2:0.27, eps_q3:0.28, oilCorr:0.04, sectorId:"agriculture" },
];

// ══════════════════════════════════════════════════════════
// المصفوفة الرئيسية — Single Source of Truth
// ══════════════════════════════════════════════════════════
export const STOCKS = [
  ..._STOCKS_LARGE,
  ..._STOCKS_BANKS,
  ..._STOCKS_TECH,
  ..._STOCKS_MATERIALS,
  ..._STOCKS_CONSUMER,
  ..._STOCKS_UTILITIES,
  ..._STOCKS_REALESTATE,
  ..._STOCKS_INSURANCE,
  ..._STOCKS_TOURISM,
  ..._STOCKS_INDUSTRIAL,
  ..._STOCKS_MORE,
  ..._STOCKS_EXPANDED,
];

// Map للوصول السريع
export const STOCKS_MAP = Object.fromEntries(STOCKS.map(s => [s.sym, s]));

// Sectors metadata
export const SECTORS = [
  { id:'energy',      name:'طاقة',              color:'#f97316' },
  { id:'banks',       name:'بنوك',              color:'#4d9fff' },
  { id:'petrochem',   name:'بتروكيماويات',      color:'#a78bfa' },
  { id:'telecom',     name:'تقنية واتصالات',    color:'#22d3ee' },
  { id:'materials',   name:'تعدين ومواد',       color:'#f0c050' },
  { id:'retail',      name:'تجزئة',             color:'#34d399' },
  { id:'food',        name:'أغذية',             color:'#10b981' },
  { id:'utilities',   name:'طاقة متجددة',       color:'#6ee7b7' },
  { id:'realestate',  name:'عقارات',            color:'#fb7185' },
  { id:'insurance',   name:'تأمين',             color:'#818cf8' },
  { id:'tourism',     name:'سياحة وترفيه',      color:'#fbbf24' },
  { id:'logistics',   name:'لوجستية',           color:'#94a3b8' },
];

// Additional sectors for expanded coverage
export const SECTORS_EXTENDED = [
  ...SECTORS,
  { id:'education',    name:'تعليم',             color:'#f472b6' },
  { id:'financial',    name:'خدمات مالية',       color:'#a78bfa' },
  { id:'construction', name:'مقاولات وبناء',     color:'#78716c' },
  { id:'transport',    name:'نقل ولوجستية',      color:'#60a5fa' },
  { id:'tech',         name:'تقنية متقدمة',      color:'#34d399' },
  { id:'agriculture',  name:'زراعة وأغذية',      color:'#4ade80' },
];

// ── مؤشرات تداول الرئيسية
export const INDICES = [
  { id: 'TASI',    name: 'تاسي',              sym: 'TASI.SR',  type: 'main'  },
  { id: 'NOMU',    name: 'نمو',               sym: 'NOMU.SR',  type: 'main'  },
  { id: 'MT30',    name: 'مؤشر الـ 30',        sym: 'MT30.SR',  type: 'sector'},
  { id: 'BANKS',   name: 'مؤشر البنوك',        sym: 'TADBANK',  type: 'sector'},
  { id: 'ENERGY',  name: 'مؤشر الطاقة',        sym: 'TADENER',  type: 'sector'},
  { id: 'PETRO',   name: 'مؤشر البتروكيماويات', sym: 'TADPETRO', type: 'sector'},
];

export default STOCKS;
