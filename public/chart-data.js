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
  {id:'ROC', l:'ROC معدل التغير', cat:'الزخم',c:'#7c3aed'},

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
  {id:'CMF', l:'CMF تدفق الأموال', cat:'الحجم',c:'#0ea5e9'},
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
 PIVOT:    {period:0,  color:'#f59e0b'},  // Pivot Points (period=0 → daily auto)
 HTF_EMA:  {period:50, color:'#f472b6'},  // Higher Timeframe EMA
 VP:       {period:50, color:'#22d3ee'},  // Volume Profile lookback bars
 ICHIMOKU: {period:0,  color:'#34d399'},  // Ichimoku (fixed 9/26/52)
};

 const TF_MINS={'1m':1,'5m':5,'15m':15,'30m':30,'1H':60,'4H':240,'1D':1440,'1W':10080,'1M':43200};
const PER_COUNT={'1m':200,'5m':180,'15m':160,'30m':150,'1H':140,'4H':130,'1D':130,'1W':104,'1M':96};

 // Drawing tool SVG icon map
const DRAW_ICON_MAP = {
 'trend': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="3" y1="16" x2="17" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="12,4 17,4 17,9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'hline': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="2" cy="10" r="1.5" fill="currentColor"/><circle cx="18" cy="10" r="1.5" fill="currentColor"/></svg>',
 'vline': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="2" r="1.5" fill="currentColor"/><circle cx="10" cy="18" r="1.5" fill="currentColor"/></svg>',
 'ray': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="3" y1="15" x2="18" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="3" cy="15" r="1.8" fill="currentColor"/><polyline points="13,5 18,5 18,10" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'extended': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="1" y1="13" x2="19" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="1,10 1,13 4,13" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16,7 19,7 19,10" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="1.5" fill="currentColor" opacity="0.6"/></svg>',
 'extline': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="2" y1="14" x2="18" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="2,9 2,14 7,14" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="13,6 18,6 18,11" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'rect': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><rect x="3" y="5" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
 'triangle': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><polygon points="10,3 18,17 2,17" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>',
 'ellipse': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><ellipse cx="10" cy="10" rx="8" ry="6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
 'fib': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="2" y1="4" x2="18" y2="4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="2" y1="11" x2="18" y2="11" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="2" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/><line x1="2" y1="17" x2="18" y2="17" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="4" y1="4" x2="4" y2="17" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
 'fibext': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="2" y1="16" x2="18" y2="16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="2" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="2" y1="4" x2="18" y2="4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="3,2"/><line x1="4" y1="4" x2="4" y2="16" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><polyline points="4,4 4,2 6,2" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'fibcircle': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.3" fill="none"/><circle cx="10" cy="10" r="4.5" stroke="currentColor" stroke-width="1" fill="none" opacity="0.7"/><circle cx="10" cy="10" r="2" stroke="currentColor" stroke-width="1" fill="none" opacity="0.5"/><circle cx="10" cy="10" r="0.8" fill="currentColor"/></svg>',
 'eqchan': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="2" y1="5" x2="18" y2="9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="2" y1="11" x2="18" y2="15" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="2" y1="5" x2="2" y2="11" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" opacity="0.4"/><line x1="18" y1="9" x2="18" y2="15" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2" opacity="0.4"/></svg>',
 'regchan': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="2" y1="14" x2="18" y2="6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="2" y1="17" x2="18" y2="9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3,2"/><line x1="2" y1="11" x2="18" y2="3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3,2"/></svg>',
 'stddev': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="2" y1="6" x2="18" y2="6" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.7"/><line x1="2" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.7"/><line x1="2" y1="3" x2="18" y2="3" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-dasharray="2,3" opacity="0.4"/><line x1="2" y1="17" x2="18" y2="17" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-dasharray="2,3" opacity="0.4"/></svg>',
 'measure': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="3" y1="7" x2="3" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="17" y1="7" x2="17" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10" y1="6" x2="10" y2="9" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/></svg>',
 'timemeas': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="11" r="6" stroke="currentColor" stroke-width="1.4" fill="none"/><line x1="10" y1="11" x2="10" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10" y1="11" x2="13" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="7" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="10" y1="3" x2="10" y2="5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
 'daterange': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="4" y1="3" x2="4" y2="17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="16" y1="3" x2="16" y2="17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2,2" opacity="0.5"/><line x1="4" y1="6" x2="16" y2="6" stroke="currentColor" stroke-width="0.8" opacity="0.3"/><line x1="4" y1="14" x2="16" y2="14" stroke="currentColor" stroke-width="0.8" opacity="0.3"/></svg>',
 'fibfan': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="3" y1="17" x2="17" y2="7" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="3" y1="17" x2="17" y2="11" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.6"/><line x1="3" y1="17" x2="17" y2="15" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/><circle cx="3" cy="17" r="1.5" fill="currentColor"/></svg>',
 'brush': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M3 14 L8 6 L17 4 L15 13 L7 16 Z" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><line x1="8" y1="6" x2="15" y2="13" stroke="currentColor" stroke-width="0.8" opacity="0.5"/></svg>',
 'hbrush': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><rect x="2" y="7" width="16" height="6" rx="1" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="1.2"/><line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" stroke-width="0.6" stroke-dasharray="2,2" opacity="0.5"/></svg>',
 'pitchfork': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10" y1="3" x2="3" y2="17" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.8"/><line x1="10" y1="3" x2="17" y2="17" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.8"/><line x1="3" y1="11" x2="17" y2="11" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.5"/><circle cx="10" cy="3" r="1.5" fill="currentColor"/><circle cx="3" cy="17" r="1.5" fill="currentColor" opacity="0.7"/><circle cx="17" cy="17" r="1.5" fill="currentColor" opacity="0.7"/></svg>',
 'schiff': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="10" y1="3" x2="10" y2="17" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10" y1="10" x2="3" y2="17" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.8"/><line x1="10" y1="10" x2="17" y2="17" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.8"/><line x1="3" y1="13" x2="17" y2="13" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.5"/><circle cx="10" cy="3" r="1.5" fill="currentColor"/></svg>',
 'ganfan': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="3" y1="17" x2="17" y2="9" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.7"/><line x1="3" y1="17" x2="17" y2="14" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.5"/><line x1="3" y1="17" x2="10" y2="3" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/><circle cx="3" cy="17" r="1.5" fill="currentColor"/></svg>',
 'angfan': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="3" y1="17" x2="17" y2="3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="3" y1="17" x2="17" y2="17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M3 17 Q10 17 17 3" stroke="currentColor" stroke-width="0.8" fill="none" stroke-dasharray="2,2" opacity="0.5"/><circle cx="3" cy="17" r="1.5" fill="currentColor"/></svg>',
 'xabcd': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><polyline points="2,15 6,5 10,12 14,4 18,10" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="2" cy="15" r="1.3" fill="currentColor"/><circle cx="6" cy="5" r="1.3" fill="currentColor"/><circle cx="10" cy="12" r="1.3" fill="currentColor"/><circle cx="14" cy="4" r="1.3" fill="currentColor"/><circle cx="18" cy="10" r="1.3" fill="currentColor"/></svg>',
 'abcd': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><polyline points="3,15 8,5 13,12 18,4" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="3" cy="15" r="1.5" fill="currentColor"/><circle cx="8" cy="5" r="1.5" fill="currentColor"/><circle cx="13" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="4" r="1.5" fill="currentColor"/></svg>',
 'hs': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><polyline points="2,14 5,9 8,12 10,4 12,12 15,9 18,14" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="1" stroke-dasharray="3,2" opacity="0.5"/></svg>',
 'elliott': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><polyline points="2,16 5,8 8,13 11,5 14,11 17,7" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="2" cy="16" r="1.2" fill="currentColor" opacity="0.6"/><circle cx="5" cy="8" r="1.2" fill="currentColor" opacity="0.6"/><circle cx="8" cy="13" r="1.2" fill="currentColor" opacity="0.6"/><circle cx="11" cy="5" r="1.2" fill="currentColor" opacity="0.6"/><circle cx="14" cy="11" r="1.2" fill="currentColor" opacity="0.6"/></svg>',
 'cypher': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><polyline points="2,14 6,5 11,11 15,4 18,13" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="2" y1="14" x2="18" y2="13" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.4"/><circle cx="2" cy="14" r="1.3" fill="currentColor"/><circle cx="18" cy="13" r="1.3" fill="currentColor"/></svg>',
 'text': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><line x1="4" y1="5" x2="16" y2="5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10" y1="5" x2="10" y2="16" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
 'callout': '<svg viewBox="0 0 20 20" fill="none" width="16" height="16"><rect x="2" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><polyline points="5,13 5,17 9,13" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="5" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/><line x1="5" y1="10" x2="10" y2="10" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.5"/></svg>',
};

const DRAW_CATS=[
 {
 id:'lines', title:'خطوط الاتجاه',
 tools:[
 {id:'trend', l:'خط اتجاه', icon:'↗'},
 {id:'hline', l:'خط أفقي', icon:'--'},
 {id:'vline', l:'خط عمودي', icon:'|'},
 {id:'extended', l:'خط ممتد', icon:''},
  {id:'ray', l:'خط مفتوح الطرف', icon:''},
 {id:'extline', l:'خط مفتوح الطرفين', icon:'↔'},
 ]
 },
 {
 id:'shapes', title:'أشكال',
 tools:[
 {id:'rect', l:'مستطيل', icon:''},
 {id:'triangle',l:'مثلث', icon:''},
 {id:'ellipse', l:'بيضاوي', icon:''},
 ]
 },
 {
 id:'fibs', title:'ارتدادات',
 tools:[
 {id:'fib', l:'فيبوناتشي ارتداد', icon:''},
 {id:'fibext', l:'امتداد فيبوناتشي', icon:''},
 {id:'fibcircle', l:'فيبوناتشي دائري', icon:'⊙'},
 ]
 },
 {
 id:'channels', title:'قنوات',
 tools:[
 {id:'eqchan', l:'قناة متوازية', icon:''},
 {id:'regchan', l:'قناة انحدار', icon:''},
 {id:'stddev', l:'قناة انحراف', icon:'⊠'},
 ]
 },
 {
 id:'measures', title:'فترات',
 tools:[
 {id:'measure', l:'قياس السعر', icon:''},
 {id:'timemeas', l:'قياس الوقت', icon:'⏱'},
 {id:'daterange', l:'نطاق تاريخ', icon:''},
 ]
 },
 {
 id:'fans', title:'مراوح',
 tools:[
 {id:'fibfan', l:'مروحة فيبوناتشي', icon:''},
 {id:'ganfan', l:'مروحة غان', icon:''},
 {id:'angfan', l:'مروحة زاوية', icon:''},
 ]
 },
   {
 id:'patterns', title:'الأنماط',
 tools:[
 {id:'xabcd', l:'نمط XABCD', icon:'X'},
 {id:'abcd', l:'نمط ABCD', icon:'A'},
 {id:'hs', l:'رأس وكتفين', icon:'⊓'},
 {id:'elliott', l:'موجة إليوت', icon:''},
 {id:'cypher', l:'نمط Cypher', icon:''},
 {id:'pitchfork', l:'شوكة أندروز', icon:'⫯'},
 {id:'schiff', l:'شوكة Schiff', icon:'⫰'},
 ]
 },

 {id:'notes', title:'ملاحظات',
 tools:[
 {id:'text', l:'نص', icon:'T'},
 {id:'callout', l:'مستطيل نص', icon:''},
 ]
 },
];
const DRAW_TOOLS_LIST = DRAW_CATS.flatMap(c => c.tools);

// Strategy SVG icon map
const STRAT_ICON_MAP = {
 'TURTLE':       '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="3" y="8" width="16" height="9" rx="4.5" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M7 8 C7 5 9 3 11 3 C13 3 15 5 15 8" stroke="currentColor" stroke-width="1.4" fill="none"/><line x1="7" y1="17" x2="5" y2="20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="15" y1="17" x2="17" y2="20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="9" y1="17" x2="9" y2="20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="13" y1="17" x2="13" y2="20" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
 'ICHIMOKU_STR': '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><path d="M2 14 Q6 6 11 10 Q16 14 20 6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M2 17 Q6 10 11 13 Q16 17 20 10" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="3,2"/><line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" stroke-width="0.7" stroke-dasharray="2,3" opacity="0.5"/></svg>',
 'WYCKOFF_ACC':  '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><polyline points="2,18 5,12 8,15 11,7 14,10 17,5 20,8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="7" r="2.5" stroke="currentColor" stroke-width="1.3" fill="none"/><line x1="2" y1="18" x2="20" y2="18" stroke="currentColor" stroke-width="0.8" opacity="0.4"/></svg>',
 'SUPPLY_DEMAND':'<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="2" y="5" width="18" height="4" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none" stroke-dasharray="3,2"/><rect x="2" y="13" width="18" height="4" rx="1.5" stroke="currentColor" stroke-width="1.3" fill="none" stroke-dasharray="3,2"/><line x1="11" y1="9" x2="11" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><polyline points="8,12 11,15 14,12" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 'MOMENTUM_PRO': '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><path d="M11 19 L11 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="7,12 11,7 15,12" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 17 C5 17 7 15 11 15 C15 15 17 17 17 17" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.5"/></svg>',
 'CROSS_MA':     '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><path d="M2 16 Q7 6 20 8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M2 8 Q7 16 20 14" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="3,2"/><circle cx="11" cy="11" r="2" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
 'MEAN_REV':     '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3,2"/><path d="M2 11 Q5 5 8 11 Q11 17 14 11 Q17 5 20 11" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>',
 'BREAKOUT':     '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><line x1="2" y1="14" x2="20" y2="14" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4,2"/><polyline points="2,18 8,14 14,10 20,4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="16,4 20,4 20,8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>',
 'VOL_BREAK':    '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="3" y="12" width="3" height="7" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/><rect x="8" y="8" width="3" height="11" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/><rect x="13" y="4" width="3" height="15" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/><rect x="18" y="9" width="3" height="10" rx="1" stroke="currentColor" stroke-width="1.3" fill="none"/></svg>',
 'TRIPLE_SCR':   '<svg viewBox="0 0 22 22" fill="none" width="22" height="22"><rect x="2" y="3" width="5" height="7" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="9" y="3" width="5" height="7" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="16" y="3" width="4" height="7" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><polyline points="4.5,10 4.5,14 11.5,14 11.5,18" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.5" cy="19" r="1.5" fill="currentColor" opacity="0.7"/></svg>',
};

const STRATEGIES=[
{id:'TURTLE',l:'Turtle Trading',icon:'🐢',power:88,risk:'متوسط',market:'اتجاهي',color:'#22c55e',accuracy:88,
 desc:'نظام الاختراق الكلاسيكي -- دخول عند تجاوز 20 شمعة مع ATR للوقف',
 howWorks:'يشتري عند تجاوز أعلى 20 شمعة ويبيع عند كسر أدنى 10 شمعات',
 howRead:'▲ أخضر = دخول شراء · ▼ أحمر = إغلاق · الخطوط = نطاق الاختراق',
 tags:['اختراق','ATR','قناة دونشيان']},
{id:'ICHIMOKU_STR',l:'إيشيموكو الكامل',icon:'☁',power:91,risk:'منخفض',market:'اتجاهي وجانبي',color:'#3b9eff',accuracy:91,
 desc:'نظام إيشيموكو الشامل -- 5 شروط متزامنة للدخول بدقة عالية',
 howWorks:'السعر فوق السحابة + تقاطع تنكان/كيجون + RSI > 50 + حجم مرتفع',
 howRead:'☁ أخضر = سحابة صاعدة · ☁ أحمر = سحابة هابطة · ▲/▼ = إشارات دخول',
 tags:['إيشيموكو','MACD','RSI','حجم']},
{id:'WYCKOFF_ACC',l:'تراكم وايكوف',icon:'🏛',power:90,risk:'منخفض',market:'تراكمي',color:'#a78bfa',accuracy:90,
 desc:'اكتشاف مراحل التراكم والتوزيع بناءً على الحجم والسعر',
 howWorks:'يحدد مراحل: SC → AR → Spring → SOS بناءً على حجم/تحرك سعري',
 howRead:'SC=بيع ذعر · AR=ارتداد · Spring=فرصة شراء · SOS=قوة',
 tags:['وايكوف','حجم','مؤسسي','Smart Money']},
{id:'SUPPLY_DEMAND',l:'العرض والطلب',icon:'⚡',power:92,risk:'منخفض جداً',market:'كل الأسواق',color:'#f59e0b',accuracy:92,
 desc:'مناطق العرض والطلب القوية بناءً على الانفجارات السعرية والحجم',
 howWorks:'يكتشف مناطق حيث تحرك السعر بسرعة كبيرة مع حجم استثنائي -- دليل مؤسسي',
 howRead:'🟡 منطقة طلب = دعم · 🔴 منطقة عرض = مقاومة · السعر يرتد منها',
 tags:['عرض','طلب','مؤسسي','نطاقات']},
{id:'MOMENTUM_PRO',l:'الزخم المتكامل',icon:'🚀',power:89,risk:'متوسط',market:'اتجاهي قوي',color:'#22d3ee',accuracy:89,
 desc:'نظام زخم متعدد العوامل: RSI + MACD + حجم + EMA9/21',
 howWorks:'RSI بين 55-75 + MACD hist متصاعد + حجم فوق المتوسط + سعر فوق EMA9/21',
 howRead:'🚀 = إشارة قوية 4 شروط معاً · اللون يعبر عن الزخم',
 tags:['RSI','MACD','EMA','حجم']},
{id:'SUPERTREND',l:'Supertrend',icon:'🌊',power:87,risk:'منخفض',market:'اتجاهي',color:'#22c55e',accuracy:87,
 desc:'مؤشر Supertrend المبني على ATR -- يرسم خطاً يتبع الترند ويتغير لونه عند الانعكاس',
 howWorks:'يحسب ATR × المضاعف، يرسم خطاً فوق/تحت السعر، يتقاطع مع السعر = إشارة',
 howRead:'▲ أخضر = اتجاه صاعد · ▼ أحمر = اتجاه هابط · الخط = وقف الخسارة المتحرك',
 tags:['ATR','ترند','وقف متحرك']},
{id:'MACD_STR',l:'استراتيجية MACD',icon:'📊',power:82,risk:'متوسط',market:'اتجاهي متوسط',color:'#38bdf8',accuracy:82,
 desc:'تقاطع MACD الكلاسيكي 12/26/9 -- من أكثر الاستراتيجيات موثوقية تاريخياً',
 howWorks:'MACD يتقاطع مع خط الإشارة صعوداً = شراء · هبوطاً = بيع · الهيستوغرام يؤكد الزخم',
 howRead:'▲ أخضر = MACD يتجاوز خط الإشارة · ▼ أحمر = يكسره · قضبان الهيستوغرام = الزخم',
 tags:['MACD','EMA','زخم']},
{id:'MA_CROSS',l:'تقاطع المتوسطات',icon:'✂️',power:80,risk:'منخفض',market:'اتجاهي',color:'#f59e0b',accuracy:80,
 desc:'تقاطع المتوسط السريع والبطيء -- الاستراتيجية الأساسية الأكثر استخداماً في العالم',
 howWorks:'MA20 يتقاطع فوق MA50 = ذهبي (شراء) · يتقاطع تحته = ميت (بيع)',
 howRead:'▲ = Golden Cross (تقاطع ذهبي) · ▼ = Death Cross (تقاطع ميت)',
 tags:['MA20','MA50','تقاطع']},
{id:'PSAR_STR',l:'Parabolic SAR',icon:'🌀',power:81,risk:'متوسط',market:'اتجاهي واضح',color:'#e879f9',accuracy:81,
 desc:'نقاط Parabolic SAR تتبع الترند -- عندما تنعكس = تغيير الاتجاه. تفشل في السوق الجانبي.',
 howWorks:'نقاط تحت السعر = صاعد · فوق السعر = هابط · الانعكاس = إشارة دخول/خروج',
 howRead:'🟢 نقطة تحت = شراء · 🔴 نقطة فوق = بيع · احذر الإشارات الكثيرة في التوطيد',
 tags:['SAR','وقف متحرك','انعكاس']},
{id:'PRICE_CHANNEL',l:'قناة الأسعار',icon:'📐',power:83,risk:'منخفض',market:'اتجاهي',color:'#818cf8',accuracy:83,
 desc:'قناة دونشيان -- اختراق أعلى 20 شمعة = دخول شراء · كسر أدنى 20 شمعة = بيع',
 howWorks:'يرسم أعلى وأدنى 20 شمعة · الاختراق فوق = قوة · الاختراق تحت = ضعف',
 howRead:'▲ عند اختراق القناة العلوية · ▼ عند كسر القناة السفلية · المنتصف = الهدف',
 tags:['دونشيان','قناة','اختراق']},
{id:'PIVOT_REV',l:'الانعكاس المحوري',icon:'🔄',power:84,risk:'متوسط',market:'كل الأسواق',color:'#fb923c',accuracy:84,
 desc:'يكتشف نقاط التحول في الترند باستخدام Pivot Points -- دخول عند الارتداد من المستويات',
 howWorks:'يحدد PP/R1/R2/S1/S2 · عند ارتداد السعر من المستوى مع شمعة انعكاسية = إشارة',
 howRead:'▲ عند الارتداد من S1/S2 · ▼ عند الرفض من R1/R2 · P = مستوى التعادل',
 tags:['Pivot','انعكاس','دعم مقاومة']},
{id:'ROB_ADX',l:'اختراق ADX (Rob Booker)',icon:'⚡',power:86,risk:'منخفض',market:'اتجاهي قوي',color:'#ef4444',accuracy:86,
 desc:'استراتيجية Rob Booker -- تجمع ADX مع الزخم لتأكيد الترند القوي قبل الدخول',
 howWorks:'ADX > 25 = ترند قوي · +DI فوق -DI = صاعد · الدخول عند تأكيد الزخم',
 howRead:'▲ أخضر = ADX قوي + ترند صاعد · ▼ أحمر = ADX قوي + ترند هابط · ADX < 20 = تجنب',
 tags:['ADX','DMI','ترند قوي']},

{id:'CROSS_MA',l:'تقاطع المتوسطين',icon:'⚔',power:78,risk:'منخفض',market:'اتجاهي',color:'#22c55e',accuracy:78,
 desc:'تقاطع MA20 و MA50 مع إشارات B/S واضحة على الشارت',
 howWorks:'MA20 يتقاطع فوق MA50 = شراء (B) · يتقاطع تحته = بيع (S)',
 howRead:'▲ B أخضر = تقاطع صاعد · ▼ S أحمر = تقاطع هابط · الخطوط أصفر/أرجواني',
 tags:['MA20','MA50','تقاطع','بسيطة']},

{id:'MEAN_REV',l:'الارتداد من بولينجر',icon:'🎯',power:79,risk:'متوسط',market:'جانبي',color:'#818cf8',accuracy:79,
 desc:'يكتشف فرص الارتداد من حدود بولينجر باندز -- مثاليّة للسوق الجانبي',
 howWorks:'السعر يلمس الحدّ السفلي = شراء محتمل · يلمس الحدّ العلوي = بيع محتمل',
 howRead:'▲ أخضر عند الحدّ السفلي · ▼ أحمر عند الحدّ العلوي · الباند الوسطى = هدف',
 tags:['بولينجر','ارتداد','جانبي']},

{id:'TRIPLE_SCR',l:'الشاشة الثلاثية (Elder)',icon:'📺',power:88,risk:'منخفض',market:'اتجاهي',color:'#3b9eff',accuracy:88,
 desc:'استراتيجية Alexander Elder -- 3 شاشات: ترند + زخم + توقيت',
 howWorks:'MA20/MA50 لتحديد الترند + MACD hist للزخم + دخول عند التقاء الشروط',
 howRead:'B أخضر = شراء عند تقاطع MACD صاعد فوق MA50 · S أحمر = العكس',
 tags:['Elder','MACD','MA','زخم']},

{id:'BREAKOUT',l:'اختراق دونشيان',icon:'🚪',power:84,risk:'متوسط',market:'اتجاهي قوي',color:'#22d3ee',accuracy:84,
 desc:'اختراق قنوات دونشيان 20 بار -- يلتقط بدايات الترندات القوية',
 howWorks:'السعر يكسر أعلى 20 شمعة = شراء · يكسر أدنى 20 شمعة = بيع',
 howRead:'▲ أخضر عند اختراق القناة العلوية · ▼ أحمر عند كسر القناة السفلية',
 tags:['دونشيان','اختراق','قناة']},

{id:'CANDLE_PAT',l:'نماذج الشموع اليابانية',icon:'🕯',power:87,risk:'منخفض',market:'كل الأسواق',color:'#fbbf24',accuracy:87,
 desc:'يكتشف 14 نموذج شمعي عالي الدقّة (>90%): نجمة الصباح/المساء، الابتلاع، المطرقة، إلخ',
 howWorks:'يحلّل كل شمعة ضمن سياق الترند ويكتشف الأنماط الانعكاسيّة القويّة فقط',
 howRead:'☀ نجمة صباح · ▲ ابتلاع صاعد · ⌂ مطرقة · ★ نجمة مساء · ▼ ابتلاع هابط',
 tags:['شموع يابانية','نماذج','انعكاس']},

{id:'VOL_BREAK',l:'انفجار الحجم',icon:'💥',power:85,risk:'متوسط',market:'كل الأسواق',color:'#f97316',accuracy:85,
 desc:'يكتشف الشموع ذات حجم استثنائي (>1.3× المتوسط) كإشارات قويّة على الدخول',
 howWorks:'إذا كان الحجم >1.3× متوسط 20 بار = إشارة قويّة في اتجاه الشمعة',
 howRead:'▲ أخضر مع شارة الحجم (1.5× مثلاً) = شراء · ▼ أحمر = بيع · خلفيّة ملونة',
 tags:['حجم','اختراق','زخم']}
];

const PATTERN_PTS={xabcd:5,abcd:4,hs:7,elliott:5,cypher:5,pitchfork:3,schiff:3};
const PATTERN_LBL={
 xabcd:['X','A','B','C','D'],
 pitchfork:['A','B','C'],
 schiff:['A','B','C'],
 abcd:['A','B','C','D'],
 hs:['بداية الكتف الأيسر','قمة الكتف الأيسر','خط العنق الأيسر','الرأس','خط العنق الأيمن','قمة الكتف الأيمن','نهاية الكتف الأيمن'],
 elliott:['1','2','3','4','5'],
 cypher:['X','A','B','C','D']
};
const COLORS=['#3b9eff','#f59e0b','#22c55e','#ef4444','#a78bfa','#fff','#fb923c','#f472b6','#34d399','#67e8f9'];

// Built-in formula presets
const CUSTOM_PRESETS = [
 {name:'RSI Smoothed', desc:'RSI مُنعّم بـ EMA-3 لتقليل الضوضاء', shape:'oscillator', formula:'EMA(RSI(close,14),3)', type:'subpanel', color:'#a78bfa'},
 {name:'Price vs MA50', desc:'فرق السعر عن المتوسط 50 -- يقيس الانحراف', shape:'histogram', formula:'SUB(close, SMA(close,50))', type:'subpanel', color:'#38bdf8'},
 {name:'Volume MA Ratio', desc:'نسبة الحجم للمتوسط -- يكشف الأحجام غير العادية', shape:'histogram', formula:'DIV(volume, SMA(volume,20))', type:'subpanel', color:'#fbbf24'},
 {name:'Hull MA 20', desc:'متوسط Hull -- أسرع وأقل تأخراً من EMA', shape:'line', formula:'EMA(SUB(MUL(2,EMA(close,10)), EMA(close,20)), Math.round(Math.sqrt(20)))', type:'overlay', color:'#4ade80'},
 {name:'EMA Diff (9-21)', desc:'تقاطع EMA-9 و EMA-21 كهيستوغرام', shape:'histogram', formula:'SUB(EMA(close,9), EMA(close,21))', type:'subpanel', color:'#f97316'},
 {name:'Volatility Index', desc:'مؤشر التقلب: الانحراف المعياري نسبة للسعر', shape:'area', formula:'DIV(STDEV(close,20), SMA(close,20))', type:'subpanel', color:'#ef4444'},
 {name:'DEMA 20', desc:'متوسط DEMA أسرع من EMA التقليدي', shape:'line', formula:'DEMA(close,20)', type:'overlay', color:'#67e8f9'},
 {name:'MOM Oscillator', desc:'زخم السعر كمؤشر بانل', shape:'histogram', formula:'MOM(close,10)', type:'subpanel', color:'#f472b6'},
 {name:'CCI 20', desc:'Commodity Channel Index -- يكشف الذروات', shape:'oscillator', formula:'CCI(20)', type:'subpanel', color:'#22d3ee'},
 {name:'CMF 20', desc:'Chaikin Money Flow -- تدفق الأموال الذكية', shape:'histogram', formula:'CMF(20)', type:'subpanel', color:'#86efac'},
];

const ELLIOTT_WAVE_INFO = {
 '1': {
  title:'الموجة الأولى (1)', mainCycle:'الدورة الدافعة -- موجة 1 من 5',
  position:'بداية الدورة الصاعدة الرئيسية', type:'impulse', color:'#3b9eff',
  desc:'أضعف الموجات الدافعة وأصعبها تمييزاً -- يظنها كثيرون ارتداداً في اتجاه هابط. تبدأ في هدوء مع تراكم الشراء.',
  subwaves:[{lbl:'1-1',d:'بداية خجولة -- صعود أولي'},{lbl:'1-2',d:'تصحيح سريع -- اختبار عزم المشترين'},{lbl:'1-3',d:'أقوى موجة فرعية -- تسارع حقيقي'},{lbl:'1-4',d:'تصحيح هادئ -- تمهيد للختام'},{lbl:'1-5',d:'ختام موجة 1 -- يليه تصحيح موجة 2'}],
  extended:'نادراً ما تمتد -- الامتداد يحدث في أسواق تنشأ من قيعان تاريخية',
  completion:'25-40%', completionDesc:'احتمالية منخفضة حتى تُكسر مقاومة رئيسية',
  conditions:['يجب ألا تتراجع تحت قاع موجة صفر','الحجم يتزايد تدريجياً','RSI يتحرك من منطقة تشبع بيع','تكسر مستوى مقاومة متوسط الأهمية'],
  nextWave:'تليها موجة 2 تصحيحية بنسبة 50%-78.6% من طول موجة 1'
 },
 '2': {
  title:'الموجة الثانية (2)', mainCycle:'الدورة الدافعة -- موجة 2 من 5',
  position:'تصحيح الموجة الأولى', type:'corrective', color:'#f59e0b',
  desc:'تصحيح عميق لموجة 1 -- يُوهم بأن الاتجاه الهابط استأنف. عادةً ABC بعمق 61.8% أو 78.6%.',
  subwaves:[{lbl:'A',d:'هبوط أول -- يُعيد جزءاً من مكاسب موجة 1'},{lbl:'B',d:'ارتداد ضعيف -- إيهام بالعودة الصاعدة'},{lbl:'C',d:'هبوط ختامي -- يختبر صبر المشترين'}],
  extended:'لا تمتد -- لكن قد تكون مسطحة (flat) أو متعرجة (zigzag)',
  completion:'60-75%', completionDesc:'التأكيد عند الارتداد من مستوى فيبوناتشي 61.8%',
  conditions:['يجب ألا تنكسر تحت بداية موجة 1 -- إذا انكسرت يُلغى الإحصاء','الحجم يتناقص مقارنة بموجة 1','تقف عند مستوى فيبوناتشي 50%-78.6%','قاعدة التناوب: إذا كانت 2 بسيطة فـ4 معقدة'],
  nextWave:'تليها موجة 3 الأقوى -- أطول الموجات وأكثرها ربحاً'
 },
 '3': {
  title:'الموجة الثالثة (3)', mainCycle:'الدورة الدافعة -- موجة 3 من 5',
  position:'قلب الدورة الدافعة -- الموجة الأقوى', type:'impulse', color:'#22c55e',
  desc:'أطول وأقوى موجة في الدورة -- يشترك فيها الجميع. حجم استثنائي وزخم غير عادي. يصعب تفويتها.',
  subwaves:[{lbl:'3-1',d:'اختراق قوي -- يتجاوز قمة موجة 1'},{lbl:'3-2',d:'تصحيح سريع وضحل -- لا يعيد كثيراً'},{lbl:'3-3',d:'قلب موجة 3 -- أشد الموجات الفرعية قوة'},{lbl:'3-4',d:'تصحيح هادئ منظم'},{lbl:'3-5',d:'ختام موجة 3 -- حجم قياسي'}],
  extended:'الأكثر امتداداً في الأسواق -- قد تصل 261.8% أو 423.6% من موجة 1',
  completion:'80-90%', completionDesc:'احتمالية عالية جداً -- الحجم والزخم يؤكدانها',
  conditions:['يجب أن تتجاوز قمة موجة 1','لا يجوز أن تكون أقصر الموجات الدافعة','الحجم أعلى من موجة 1 بشكل ملحوظ','تمتد عادةً 161.8% من موجة 1 كحد أدنى','MACD وRSI يسجلان أعلى قيمة في الدورة'],
  nextWave:'تليها موجة 4 تصحيحية أكثر تعقيداً من موجة 2'
 },
 '4': {
  title:'الموجة الرابعة (4)', mainCycle:'الدورة الدافعة -- موجة 4 من 5',
  position:'تصحيح موجة 3', type:'corrective', color:'#f59e0b',
  desc:'تصحيح أقل عمقاً من موجة 2 -- قاعدة التناوب تجعلها أكثر تعقيداً. مثلث أو حركة جانبية في الغالب.',
  subwaves:[{lbl:'A',d:'هبوط من قمة موجة 3'},{lbl:'B',d:'ارتداد -- قد يكون مرتفعاً'},{lbl:'C',d:'إكمال التصحيح'},{lbl:'D',d:'(في المثلث) موجة رابعة فرعية'},{lbl:'E',d:'(في المثلث) ختام التصحيح قبل موجة 5'}],
  extended:'لا تمتد -- لكن قد تكون مثلثاً أو حركة مركبة WXY',
  completion:'65-80%', completionDesc:'التأكيد عند الحفاظ على قمة موجة 1 كدعم',
  conditions:['القاعدة الذهبية: لا تنكسر تحت قمة موجة 1 أبداً','تصحيح 23.6%-38.2% من موجة 3 في الغالب','قاعدة التناوب مع موجة 2','الحجم يتراجع بشكل ملحوظ'],
  nextWave:'تليها موجة 5 الختامية -- فرصة أخيرة للدخول'
 },
 '5': {
  title:'الموجة الخامسة (5)', mainCycle:'الدورة الدافعة -- موجة 5 من 5',
  position:'الموجة الختامية للدورة الدافعة', type:'impulse', color:'#ef4444',
  desc:'الموجة الأخيرة الصاعدة -- ضعيفة الزخم مع تباعد سلبي في المؤشرات. يدخلها المتأخرون. تنتهي بانعكاس.',
  subwaves:[{lbl:'5-1',d:'بداية أقل قوة من 3-1'},{lbl:'5-2',d:'تصحيح سريع وضحل'},{lbl:'5-3',d:'أقوى موجة فرعية -- لكن أضعف من 3-3'},{lbl:'5-4',d:'تصحيح قصير'},{lbl:'5-5',d:'ختام الدورة -- غالباً مع تباعد سلبي'}],
  extended:'الامتداد في موجة 5 شائع عند الفشل -- قد تصل 61.8% فقط من موجة 3',
  completion:'50-70%', completionDesc:'التحقق بالتباعد السلبي في RSI وMACD',
  conditions:['تتجاوز قمة موجة 3 لتأكيد الدورة','الحجم أقل من موجة 3','تباعد سلبي في RSI وMACD','إذا فشلت في تجاوز موجة 3 → موجة 5 فاشلة (truncated)'],
  nextWave:'تليها دورة ABC تصحيحية كبرى -- نهاية الدورة الدافعة'
 },
 'A': {
  title:'موجة A التصحيحية', mainCycle:'الدورة التصحيحية ABC -- موجة A',
  position:'بداية التصحيح بعد 5 موجات دافعة', type:'corrective', color:'#ef4444',
  desc:'أول موجة هابطة في التصحيح الكبير -- يخطئ كثيرون في تفسيرها على أنها تصحيح عادي قبل الصعود.',
  subwaves:[{lbl:'A-1',d:'هبوط أول -- يكسر مستوى دعم'},{lbl:'A-2',d:'ارتداد مؤقت -- يُوهم بالعودة'},{lbl:'A-3',d:'تسارع الهبوط -- أقوى موجة فرعية'},{lbl:'A-4',d:'توقف قصير'},{lbl:'A-5',d:'ختام موجة A -- قاع مؤقت'}],
  extended:'قد تكون من 3 موجات (flat) أو 5 موجات (zigzag)',
  completion:'55-70%', completionDesc:'التأكيد عند كسر أول مستوى دعم رئيسي',
  conditions:['تكسر مستوى دعم واضح','في الزيكزاك: 5 موجات داخلية هابطة','في المسطح: 3 موجات فقط','تراجع 38.2%-61.8% من كامل الدورة الدافعة'],
  nextWave:'تليها موجة B ارتدادية مُضللة'
 },
 'B': {
  title:'موجة B التصحيحية', mainCycle:'الدورة التصحيحية ABC -- موجة B',
  position:'ارتداد وسطي في التصحيح', type:'corrective', color:'#f59e0b',
  desc:'الموجة الأكثر إيهاماً -- يعتقد المتداولون أن الصعود عاد. هي فقط تصحيح للتصحيح. خطيرة جداً.',
  subwaves:[{lbl:'B-a',d:'ارتداد أول -- يعطي أملاً زائفاً'},{lbl:'B-b',d:'تراجع خفيف'},{lbl:'B-c',d:'قد تصل لمستويات عالية جداً'}],
  extended:'موجة B قد تتجاوز بداية A أحياناً (B الممتدة) -- نادر لكن يحدث',
  completion:'40-55%', completionDesc:'صعبة التأكيد -- الحجم أقل من A هو أهم دليل',
  conditions:['حجمها أقل من موجة A دائماً','في الغالب لا تتجاوز قمة موجة 5 الدافعة','تُعيد 50%-78.6% من موجة A','مصاحبة بتفاؤل وأخبار إيجابية مُضللة'],
  nextWave:'تليها موجة C الهابطة الأقوى والأكثر ألماً'
 },
 'C': {
  title:'موجة C التصحيحية', mainCycle:'الدورة التصحيحية ABC -- موجة C',
  position:'إكمال الدورة التصحيحية الكبرى', type:'corrective', color:'#3b9eff',
  desc:'الموجة الأقوى في التصحيح -- مدمرة للمتفائلين. تساوي A أو 161.8% منها. فرصة شراء تاريخية عند اكتمالها.',
  subwaves:[{lbl:'C-1',d:'انهيار -- يكسر قاع موجة A'},{lbl:'C-2',d:'ارتداد ضعيف -- لا يثق به أحد'},{lbl:'C-3',d:'أقوى موجة في C -- يصاحبها ذعر'},{lbl:'C-4',d:'توقف قصير -- آخر فرصة للخروج'},{lbl:'C-5',d:'ختام الدورة التصحيحية -- قاع الدورة الكبرى'}],
  extended:'موجة C الممتدة تصل 261.8% من A -- نادرة لكن مؤلمة جداً',
  completion:'70-85%', completionDesc:'يؤكدها كسر قاع A وتصاعد الحجم مع تباعد إيجابي',
  conditions:['تكسر قاع موجة A دائماً','تساوي موجة A كحد أدنى (100%)','الحجم يرتفع في C-1 وC-3','RSI يسجل تشبع بيع مع تباعد إيجابي عند قاع C-5'],
  nextWave:'عند اكتمال C تبدأ دورة دافعة جديدة كبرى -- أفضل نقطة شراء استراتيجية'
 },
 'D': {
  title:'موجة D (المثلث)', mainCycle:'التصحيح المثلثي -- موجة D من ABCDE',
  position:'الموجة الرابعة في المثلث التصحيحي', type:'corrective', color:'#a78bfa',
  desc:'الموجة الرابعة في التصحيح المثلثي -- ارتداد داخل المثلث بعد موجة C. عادةً أقصر من B وتُشكّل ضلع المثلث العلوي.',
  subwaves:[{lbl:'D-a',d:'ارتداد أول داخل المثلث'},{lbl:'D-b',d:'تراجع خفيف -- حركة ضيقة'},{lbl:'D-c',d:'اكتمال موجة D عند ضلع المثلث العلوي'}],
  extended:'نادراً تمتد -- المثلث يضيق مع كل موجة',
  completion:'55-65%', completionDesc:'التأكيد عند وصولها لخط ضلع المثلث العلوي',
  conditions:['يجب أن تقع داخل حدود المثلث بين خطي الضلعين','أقصر من موجة B في الغالب','حجم متراجع ويستمر في التراجع','الخط الرابط بين B وD يُشكّل ضلع المثلث العلوي'],
  nextWave:'تليها موجة E الأخيرة قبل الاختراق -- أضيق موجة في المثلث'
 },
 'E': {
  title:'موجة E (المثلث)', mainCycle:'التصحيح المثلثي -- موجة E من ABCDE',
  position:'الموجة الأخيرة في المثلث -- قبل الاختراق', type:'corrective', color:'#38bdf8',
  desc:'الموجة الأخيرة والأضيق في المثلث -- تُكمل شكل المثلث وتسبق الاختراق المتفجر. أحياناً تتجاوز حد المثلث قبل الاختراق الحقيقي.',
  subwaves:[{lbl:'E-a',d:'هبوط أول داخل المثلث -- ضيق جداً'},{lbl:'E-b',d:'ارتداد صغير'},{lbl:'E-c',d:'ختام المثلث -- النقطة الأضيق'}],
  extended:'موجة E الممتدة نادرة -- إذا حدثت تُشير لاختراق مؤجل',
  completion:'70-80%', completionDesc:'احتمالية جيدة -- الاختراق بعدها شبه مؤكد مع حجم متزايد',
  conditions:['أضيق نقطة في المثلث عند التقاء الخطين','الحجم في أدنى مستوياته داخل المثلث','قد تتجاوز خط الضلع السفلي قليلاً ثم يرتد','بعدها اختراق بحجم استثنائي في اتجاه الموجة 5 أو C'],
  nextWave:'تليها موجة متفجرة 5 أو C -- الاختراق عادةً بنفس طول قاعدة المثلث'
 }
}
 
