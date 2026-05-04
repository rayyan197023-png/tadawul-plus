// ═══════════════════════════════════════════════
// chart-data.js -- Constants
// ═══════════════════════════════════════════════

const STOCKS=[
 {sym:'2010',name:'سابك',sec:'البتروكيماويات',p:103.20,pct:2.38,ch:2.46,avgVol:1400000,shariah:true},
 {sym:'2222',name:'أرامكو',sec:'الطاقة',p:28.15,pct:-0.84,ch:-0.24,avgVol:9000000,shariah:true},
 {sym:'1120',name:'الراجحي',sec:'البنوك',p:87.30,pct:-1.37,ch:-1.21,avgVol:3200000,shariah:true},
 {sym:'1010',name:'الرياض',sec:'البنوك',p:24.56,pct:0.49,ch:0.12,avgVol:2800000,shariah:false},
 {sym:'2350',name:'المراعي',sec:'الغذاء',p:14.22,pct:3.18,ch:0.44,avgVol:1200000},
 {sym:'7010',name:'الاتصالات',sec:'الاتصالات',p:11.20,pct:1.76,ch:0.20,avgVol:3500000},
 {sym:'2082',name:'معادن',sec:'التعدين',p:52.80,pct:-1.60,ch:-0.86,avgVol:1600000},
 {sym:'4280',name:'التجزئة',sec:'التجزئة',p:38.70,pct:1.90,ch:0.72,avgVol:800000},
];
 const ALL_IND=[
 // المتوسطات المتحركة
 {id:'MA5', l:'MA 5', cat:'المتوسطات',c:'#fcd34d'},
 {id:'MA10', l:'MA 10', cat:'المتوسطات',c:'#fbbf24'},
 {id:'MA20', l:'MA 20', cat:'المتوسطات',c:'#f59e0b'},
 {id:'MA50', l:'MA 50', cat:'المتوسطات',c:'#3b9eff'},
 {id:'MA100', l:'MA 100', cat:'المتوسطات',c:'#60a5fa'},
 {id:'MA200', l:'MA 200', cat:'المتوسطات',c:'#a78bfa'},
 {id:'EMA9', l:'EMA 9', cat:'المتوسطات',c:'#fb923c'},
 {id:'EMA20', l:'EMA 20', cat:'المتوسطات',c:'#f97316'},
 {id:'EMA50', l:'EMA 50', cat:'المتوسطات',c:'#ea580c'},
 {id:'EMA200',l:'EMA 200',cat:'المتوسطات',c:'#c2410c'},
 {id:'EMA_RIBBON',l:'EMA Ribbon',cat:'المتوسطات',c:'#6366f1'},
 {id:'VWAP', l:'VWAP', cat:'المتوسطات',c:'#fdba74'},
 // التقلب
 {id:'BB', l:'بولينجر باندز', cat:'التقلب',c:'#818cf8'},
 {id:'ATR', l:'ATR', cat:'التقلب',c:'#facc15'},
 {id:'STD', l:'الانحراف المعياري',cat:'التقلب',c:'#fde68a'},
 // الزخم
 {id:'RSI', l:'RSI', cat:'الزخم',c:'#22c55e'},
 {id:'MACD', l:'MACD', cat:'الزخم',c:'#38bdf8'},
 {id:'STOCH', l:'Stochastic', cat:'الزخم',c:'#f472b6'},
 {id:'STOCHRSI',l:'Stoch RSI', cat:'الزخم',c:'#ec4899'},
 // الاتجاه
 {id:'ADX', l:'ADX', cat:'الاتجاه',c:'#e879f9'},
 {id:'PSAR', l:'Parabolic SAR',cat:'الاتجاه',c:'#f0abfc'},
 {id:'SUPERTREND',l:'Supertrend', cat:'الاتجاه',c:'#4ade80'},
 {id:'ICHIMOKU', l:'إيشيموكو', cat:'الاتجاه',c:'#34d399'},
 // الحجم
 {id:'OBV', l:'OBV', cat:'الحجم',c:'#67e8f9'},
 {id:'VP', l:'Volume Profile', cat:'الحجم',c:'#22d3ee'},
 {id:'VOL_MA',l:'Vol MA', cat:'الحجم',c:'#94a3b8'},
 {id:'MFI', l:'MFI', cat:'الحجم',c:'#38bdf8'},
 {id:'PIVOT', l:'Pivot Points', cat:'الاتجاه',c:'#f59e0b'},
 {id:'KC', l:'Keltner Channel',cat:'التقلب', c:'#22d3ee'},
 {id:'DC', l:'Donchian Channel',cat:'التقلب',c:'#818cf8'},
 {id:'HTF_EMA',l:'EMA متعدد الأطر',cat:'المتوسطات',c:'#f472b6'},
 {id:'VWAP_D', l:'VWAP اليومي', cat:'المتوسطات',c:'#fb923c'},
];

// ── Indicator Settings (user-editable params) ──────────
const IND_DEFAULTS = {
 RSI:  {period:14, color:'#22c55e'},
 MACD: {fast:12, slow:26, signal:9, color:'#38bdf8'},
 BB:   {period:20, stddev:2, color:'#818cf8'},
 MA5:  {period:5,  color:'#fcd34d'},
 MA10: {period:10, color:'#fbbf24'},
 MA20: {period:20, color:'#f59e0b'},
 MA50: {period:50, color:'#3b9eff'},
 MA100:{period:100, color:'#60a5fa'},
 MA200:{period:200, color:'#a78bfa'},
 EMA9: {period:9,  color:'#fb923c'},
 EMA20:{period:20, color:'#f97316'},
 EMA50:{period:50, color:'#ea580c'},
 EMA200:{period:200, color:'#c2410c'},
 ATR:  {period:14, color:'#facc15'},
 ADX:  {period:14, color:'#e879f9'},
 STOCH:{period:14, color:'#f472b6'},
 STOCHRSI:{period:14, color:'#ec4899'},
 MFI:  {period:14, color:'#38bdf8'},
 OBV:   {period:0,  color:'#67e8f9'},
 STD:   {period:20, color:'#fde68a'},
 VWAP:  {period:0,  color:'#fdba74'},
 VWAP_D:{period:0,  color:'#fb923c'},
 VOL_MA:{period:20, color:'#94a3b8'},
 KC:    {period:20, color:'#22d3ee'},
 DC:    {period:20, color:'#818cf8'},
 PSAR:  {period:0,  color:'#f0abfc'},
 SUPERTREND:{period:10, color:'#4ade80'},
 EMA_RIBBON:{period:0, color:'#6366f1'},
};