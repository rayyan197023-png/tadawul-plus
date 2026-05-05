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