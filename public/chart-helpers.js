// ═══════════════════════════════════════════════
// chart-helpers.js -- Helper Functions
// ═══════════════════════════════════════════════

// ── Candle Normalizer for API integration ────────────────────────
// Call this when loading candles from any external API
// Handles: Tadawul API, Alpha Vantage, Binance, Yahoo Finance formats
function normalizeCandles(rawData){
  if(!Array.isArray(rawData)||!rawData.length)return [];
  const sample=rawData[0];
  const isAlphaV  = '1. open' in sample;
  const isBinance = Array.isArray(sample);

  let candles = rawData.map((d,i)=>{
    let o,hi,lo,c,v,t;

    if(isBinance&&Array.isArray(d)){
      t=new Date(d[0]); o=+d[1]; hi=+d[2]; lo=+d[3]; c=+d[4]; v=+d[5];
    } else if(isAlphaV){
      t=new Date(d['date']||d['timestamp']||Object.keys(d)[0]);
      o=+d['1. open']; hi=+d['2. high']; lo=+d['3. low']; c=+d['4. close']; v=+(d['5. volume']||0);
    } else {
      t = d.t instanceof Date ? d.t
        : d.t ? new Date(typeof d.t==='number'&&d.t<1e12?d.t*1000:d.t)
        : d.timestamp ? new Date(typeof d.timestamp==='number'&&d.timestamp<1e12?d.timestamp*1000:d.timestamp)
        : d.date ? new Date(d.date)
        : d.time ? new Date(d.time)
        : new Date(Date.now()-(rawData.length-1-i)*86400000);
      if(!d.t && d.date) d.t = d.date;
      o  = +(d.o||d.open||d.Open||0);
      hi = +(d.hi||d.high||d.High||d.h||0);
      lo = +(d.lo||d.low||d.Low||d.l||0);
      c  = +(d.c||d.close||d.Close||d.last||d.lastTradedPrice||0);
      v  = +(d.v||d.volume||d.Volume||d.vol||d.tradeVolume||0);
    }

    if(!o)o=c;
    hi=Math.max(hi,o,c);
    lo=Math.min(lo,o,c);

    return{o,hi,lo,c,v,t};
  }).filter(d=>d.c>0);

  // ترتيب تصاعدي حسب التاريخ -- الأحدث في النهاية
  candles.sort((a,b)=>new Date(a.t)-new Date(b.t));
  return candles;
}


// ── Divergence Detection ────────────────────────────────
// ── ZigZag Pivot Detection: المعيار القياسي لتحديد swing points للتباعد ──
// يمشي عبر البيانات ويحدد قمة/قاع فقط عند انعكاس حقيقي بنسبة % معينة (deviation)
// هذا أدق من "أعلى من N جار" لأنه يلتقط القمم الحقيقية بغض النظر عن التذبذب المحلي
function _findPivots(arr, lookback=5){
 const validVals=arr.filter(v=>v!=null);
 if(validVals.length<10) return {highs:[],lows:[]};
 const range=Math.max(...validVals)-Math.min(...validVals)||1;
 const deviation=range*0.03; // أقل انعكاس معتبر = 3% من مدى القيم الكلي

 const highs=[],lows=[];
 let lastPivotIdx=-1, lastPivotVal=null, lastPivotType=null; // 'H' or 'L'
 let curExtreme=null, curExtremeIdx=-1, curDir=null; // 'up' or 'down'

 // ابحث عن أول قيمة صالحة لنبدأ منها
 let startIdx=arr.findIndex(v=>v!=null);
 if(startIdx===-1) return {highs,lows};
 curExtreme=arr[startIdx]; curExtremeIdx=startIdx;

 for(let i=startIdx+1;i<arr.length;i++){
  const v=arr[i];
  if(v==null) continue;

  if(curDir===null){
   // لسه ما تحدد الاتجاه الأول -- نحدده بأول انعكاس معتبر
   if(v>=curExtreme+deviation){ curDir='up'; curExtreme=v; curExtremeIdx=i; }
   else if(v<=curExtreme-deviation){ curDir='down'; curExtreme=v; curExtremeIdx=i; }
   else if(v>curExtreme){ curExtreme=v; curExtremeIdx=i; } // حدّث القمة المؤقتة
   else if(v<curExtreme){ curExtreme=v; curExtremeIdx=i; } // حدّث القاع المؤقت (بأي جهة أقرب)
   continue;
  }

  if(curDir==='up'){
   if(v>curExtreme){ curExtreme=v; curExtremeIdx=i; } // القمة المؤقتة تستمر بالارتفاع
   else if(v<=curExtreme-deviation){
    // انعكاس هبوطي معتبر -- القمة المؤقتة كانت قمة سوينغ حقيقية
    highs.push({i:curExtremeIdx,v:curExtreme});
    curDir='down'; curExtreme=v; curExtremeIdx=i;
   }
  } else { // curDir==='down'
   if(v<curExtreme){ curExtreme=v; curExtremeIdx=i; } // القاع المؤقت يستمر بالانخفاض
   else if(v>=curExtreme+deviation){
    // انعكاس صعودي معتبر -- القاع المؤقت كان قاع سوينغ حقيقي
    lows.push({i:curExtremeIdx,v:curExtreme});
    curDir='up'; curExtreme=v; curExtremeIdx=i;
   }
  }
 }
 // أضف آخر extreme لو كان له معنى
 if(curDir==='up') highs.push({i:curExtremeIdx,v:curExtreme});
 else if(curDir==='down') lows.push({i:curExtremeIdx,v:curExtreme});

 return {highs,lows};
}

// ── كشف التباعد (Divergence) وفق المعيار الأكاديمي القياسي ──
// Bearish: قمة سعر أعلى (HH) + قمة مؤشر أدنى (LH) -- خط يربط قمة بقمة فقط
// Bullish: قاع سعر أدنى (LL) + قاع مؤشر أعلى (HL) -- خط يربط قاع بقاع فقط
function _calcDivergences(prices, indArr, label){
 if(!prices||!indArr||prices.length<20) return [];

 // ── محاذاة إجبارية بين مصفوفتي السعر والمؤشر ──
 // لو المؤشر أقصر (بسبب warm-up period مثل RSI الذي يبدأ من index 14)،
 // أو لو فيه فرق طول لأي سبب، نحاذي المصفوفتين من النهاية (الأحدث) بحيث
 // يتطابق كل index تماماً بين prices[i] و indArr[i] لنفس التاريخ فعلياً.
 // بدون هذي الخطوة، أي فرق طول يجعل الـ index يشاور لتاريخين مختلفين
 // بين السعر والمؤشر، وهذا يفسّر ربط قمة سعر بقاع مؤشر (خطأ ظاهر بالرسم).
 let alignedPrices=prices, alignedInd=indArr, _offsetShift=0;
 if(prices.length!==indArr.length){
  const minLen=Math.min(prices.length,indArr.length);
  _offsetShift=prices.length-minLen; // كم شمعة نزحنا من بداية prices
  alignedPrices=prices.slice(_offsetShift);
  alignedInd=indArr.slice(indArr.length-minLen);
 }

 const LB=7;         // نافذة أوسع لتقليل التقاط تذبذبات صغيرة كقمم/قيعان وهمية
 const MATCH_WIN=8;  // أقصى فرق بالمواضع بين قمة السعر وقمة المؤشر المقابلة لها
 const MIN_GAP=6;    // أقل مسافة زمنية مسموحة بين نقطتي التباعد
 const MAX_GAP=120; // أقصى مسافة زمنية منطقية (شمعة) -- تم توسيعها لتشمل تباعدات متوسطة المدى

 const pPivots=_findPivots(alignedPrices,LB);
 const iPivots=_findPivots(alignedInd,LB);

 const validPrices=alignedPrices.filter(v=>v!=null);
 const priceRange=Math.max(...validPrices)-Math.min(...validPrices)||1;

 // أقرب pivot على المؤشر لموضع معيّن من السعر (بحد أقصى MATCH_WIN)
 const nearest=(list,idx)=>{
  let best=null,bestD=MATCH_WIN+1;
  for(const p of list){
   const d=Math.abs(p.i-idx);
   if(d<=MATCH_WIN&&d<bestD){bestD=d;best=p;}
  }
  return best;
 };

 const results=[];

 // ── Bearish divergence: قمة سعر ↔ قمة سعر فقط، بدون أي قمة أعلى تتوسط بينهما ──
 for(let a=0;a<pPivots.highs.length;a++){
  for(let b=a+1;b<pPivots.highs.length;b++){
   const pA=pPivots.highs[a], pB=pPivots.highs[b];
   const _gapAB=pB.i-pA.i;
   if(_gapAB<MIN_GAP||_gapAB>MAX_GAP) continue; // مسافة زمنية منطقية فقط -- يمنع ربط قمم بعيدة جداً
   if(pB.v<=pA.v) continue; // يجب أن تكون القمة الثانية أعلى فعلياً (Higher High)
   // تقارب نسبي بالمستوى: لا نربط قمة صغيرة جداً بقمة ضخمة بعيدة عنها بمستوى مختلف كلياً
   if(pB.v/pA.v>1.35) continue; // فرق أكبر من 35% بين القمتين = غير منطقي كزوج تباعد واحد
   // لا يوجد pivot قمة آخر بينهما أعلى من كلا النقطتين (يكسر التسلسل المنطقي)
   let _brokenByHigher=false;
   for(let m=a+1;m<b;m++){
    if(pPivots.highs[m].v>pB.v){_brokenByHigher=true;break;}
   }
   if(_brokenByHigher) continue;

   const iA=nearest(iPivots.highs,pA.i);
   const iB=nearest(iPivots.highs,pB.i);
   if(!iA||!iB||iA===iB) continue;
   if(iB.v>=iA.v) continue; // المؤشر يجب يكون أدنى (Lower High) = تباعد حقيقي

   const priceMovePct=(pB.v-pA.v)/priceRange;
   const indMovePct=Math.abs(iB.v-iA.v)/(Math.abs(iA.v)||1);
   results.push({
    type:'bearish', i1:pA.i, i2:pB.i, ii1:iA.v, ii2:iB.v,
    score:priceMovePct*3+indMovePct,
    label:'هبوط '+label, color:'#ef4444'
   });
  }
 }

 // ── Bullish divergence: قاع سعر ↔ قاع سعر فقط، بدون أي قاع أدنى يتوسط بينهما ──
 for(let a=0;a<pPivots.lows.length;a++){
  for(let b=a+1;b<pPivots.lows.length;b++){
   const pA=pPivots.lows[a], pB=pPivots.lows[b];
   const _gapAB2=pB.i-pA.i;
   if(_gapAB2<MIN_GAP||_gapAB2>MAX_GAP) continue;
   if(pB.v>=pA.v) continue; // يجب أن يكون القاع الثاني أدنى فعلياً (Lower Low)
   // تقارب نسبي بالمستوى: لا نربط قاعاً ضحلاً بقاع عميق جداً بعيد عنه بمستوى مختلف كلياً
   if(pA.v/pB.v>1.35) continue; // فرق أكبر من 35% بين القاعين = غير منطقي كزوج تباعد واحد
   // لا يوجد pivot قاع آخر بينهما أدنى من كلا النقطتين (يكسر التسلسل المنطقي)
   let _brokenByLower=false;
   for(let m=a+1;m<b;m++){
    if(pPivots.lows[m].v<pB.v){_brokenByLower=true;break;}
   }
   if(_brokenByLower) continue;

   const iA=nearest(iPivots.lows,pA.i);
   const iB=nearest(iPivots.lows,pB.i);
   if(!iA||!iB||iA===iB) continue;
   if(iB.v<=iA.v) continue; // المؤشر يجب يكون أعلى (Higher Low) = تباعد حقيقي

   const priceMovePct=(pA.v-pB.v)/priceRange;
   const indMovePct=Math.abs(iB.v-iA.v)/(Math.abs(iA.v)||1);
   results.push({
    type:'bullish', i1:pA.i, i2:pB.i, ii1:iA.v, ii2:iB.v,
    score:priceMovePct*3+indMovePct,
    label:'صعود '+label, color:'#22c55e'
   });
  }
 }

 // رتّب حسب القوة تنازلياً، وأزل التداخل الزمني (احتفظ بالأقوى لكل نطاق)
 results.sort((a,b)=>b.score-a.score);
 const final=[];
 for(const r of results){
  const overlap=final.find(f=>
   f.type===r.type && !(r.i2+MIN_GAP<f.i1 || r.i1>f.i2+MIN_GAP)
  );
  if(!overlap) final.push(r);
 }

 // إعادة إضافة الإزاحة (_offsetShift) حتى تشاور النتائج لنفس index الصحيح
 // بمصفوفة الأسعار الأصلية الكاملة (state.allCandles) المستخدمة بالرسم
 if(_offsetShift>0){
  final.forEach(r=>{ r.i1+=_offsetShift; r.i2+=_offsetShift; });
 }

 return final.sort((a,b)=>a.i2-b.i2);
}

const API_CONFIG = {
  // تداول+ -- SAHMK API Integration via Next.js proxy
  // Proxy route: /api/sahmkdata?endpoint=<type>&sym=<symbol>...
  
  enabled: true,

  // ── SAHMK endpoints (all via /api/sahmkdata proxy) ────────────
endpoints: {
    candles:    '/api/sahmkdata',
    ticker:     '/api/sahmkdata',
    stocks:     '/api/sahmkdata',
    orderflow:  null,
    calendar:   null,
    news:       null,
    info:       '/api/sahmkdata',
  },

  // ── Auth (sahmk public, no auth needed) ──────────────────────
    tickerMode: 'poll',
  headers: {},

  // ── Timeframe mapping: app → sahmk ohlcv period ──────────────
  tfMap: {
    '1m':'1M',   '5m':'5M',   '15m':'15M', '30m':'30M',
    '1H':'1H',   '4H':'4H',   '1D':'1D',
    '1W':'1W',   '1M':'1Mo'
  },

  // Map app period → sahmk period query param
    // sahmk supports only: 1D, 1W, 1Y -- everything else → 3Mo default
    periodMap: {
    '1m':'1Y',   '5m':'1Y',   '15m':'1Y',  '30m':'1Y',
    '1H':'1Y',   '4H':'1Y',   '1D':'1Y',
    '1W':'1Y',   '1M':'5Y'
  },

  // ── HTTP Fetch with sahmk endpoint routing ───────────────────
async fetch(type, params={}) {
    const base = this.endpoints[type];
    if(!base || !this.enabled) return null;
    try {
      let qs = '';

      if(type === 'candles') {
        const _per = params.period || '1D';
        const _intradayPers = ['1H','4H'];
        if(_intradayPers.includes(_per)){
          qs = `?endpoint=intraday&sym=${params.symbol}&interval=60m`;
        } else {
          // سهمك يُرجع حد أقصى ~1000 شمعة لكل طلب بدءاً من from --
          // نجلب على دفعات حتى نوصل لتاريخ "to" المطلوب

const qs1y = `?endpoint=ohlcv&sym=${params.symbol}&period=1Y`;
const qs5y = `?endpoint=ohlcv&sym=${params.symbol}&period=5Y`;
const [r1y, r5y] = await Promise.all([
  fetch(this.endpoints.candles + qs1y, {headers:this.headers, signal:AbortSignal.timeout(10000)}),
  fetch(this.endpoints.candles + qs5y, {headers:this.headers, signal:AbortSignal.timeout(10000)})
]);
const [d1y, d5y] = await Promise.all([r1y.json(), r5y.json()]);
const raw1y = d1y.data || d1y.bars || [];
const raw5y = d5y.data || d5y.bars || [];
const merged = [...raw5y, ...raw1y];
const seen = new Set();
return merged.filter(d=>{
  const k = d.date||d.t||d.timestamp||'';
  if(seen.has(k)) return false;
  seen.add(k); return true;
}).sort((a,b)=>new Date(a.date||a.t||a.timestamp)-new Date(b.date||b.t||b.timestamp));

        }
} else if(type === 'ticker') {
        qs = `?endpoint=quote&sym=${params.symbol}`;

      } else if(type === 'stocks') {
        qs = `?endpoint=companies&market=TASI`;
      } else if(type === 'info') {
        qs = `?endpoint=company&sym=${params.symbol}`;
      }

      const r = await fetch(base + qs, {
        headers: this.headers,
        signal: AbortSignal.timeout(10000)
      });

      if(!r.ok) throw new Error('HTTP '+r.status);
      const data = await r.json();

      const unwrap = {
        candles: d => d.bars || d.data || d.ohlcv || d,
        ticker:  d => d.quote || d.data || d.results || d,
        stocks:  d => d.results || d.companies || d.data || d,
        info:    d => d.company || d.data || d,
      };
      return (unwrap[type] || (d => d))(data);
    } catch(e) {
      return null;
    }
  },


  // ── WebSocket (sahmk doesn't support WS -- polling only) ─────
  _ws: null,
  _wsCb: null,
  wsConnect(onTick) { /* sahmk uses polling */ },
  wsDisconnect() { /* no-op */ }
}

// ── Zoom Controls ────────────────────────────────────
// Initialize default pivot type if not set
if(typeof state!=='undefined'&&!state.pivotType){
  state.pivotType='traditional';
}

function cyclePivotType(){
  const types=['traditional','fibonacci','camarilla'];
  const cur=types.indexOf(state.pivotType||'traditional');
  state.pivotType=types[(cur+1)%types.length];
  saveSettings&&saveSettings();
  const lbl={'traditional':'تقليدي','fibonacci':'فيبوناتشي','camarilla':'كامارا'};
  const t=document.getElementById('toast');
  if(t){t.textContent='Pivot Points: '+lbl[state.pivotType];t.style.display='block';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',2000);}
  invalidateChart();render();
}
function _zoomIn(){
 state.visible=Math.max(8,Math.floor(state.visible*0.75));
 if(navigator.vibrate)navigator.vibrate(15);
 invalidateChart();render();
}
function _zoomOut(){
 state.visible=Math.min(state.allCandles.length,Math.ceil(state.visible*1.35));
 if(navigator.vibrate)navigator.vibrate(15);
 invalidateChart();render();
}
function _zoomReset(){
 const dv={'1m':80,'5m':70,'15m':65,'30m':60,'1H':55,'4H':50,'1D':55,'1W':40,'1M':45};
 state.visible=dv[state.per]||48;
 state.offset=0;
 yScale=1.0;
 if(navigator.vibrate)navigator.vibrate(20);
 invalidateChart();render();
}


// ── Sub-Panel Y-Axis Helper ───────────────────────────
function _drawSubYAxis(ctx, top, ph, mn2, mx2, CW, YW, color, darkTheme, panKey){
 // Apply same zoom as tyS so labels match drawing positions
 const _pz = panKey ? (panelYZoom[panKey]||1) : 1;
 const _mid = (mn2+mx2)/2;
 const _half = (mx2-mn2)/2/_pz;
 const zmn = _mid - _half; // zoomed min
 const zmx = _mid + _half; // zoomed max
 const rng = zmx - zmn || 1;
 const steps = ph < 60 ? 2 : ph < 100 ? 3 : 4;
 ctx.save();
 // Separator line
 ctx.strokeStyle='#141e2e';ctx.lineWidth=0.6;
 ctx.beginPath();ctx.moveTo(CW,top);ctx.lineTo(CW,top+ph);ctx.stroke();
 for(let i=0;i<=steps;i++){
  const frac = i/steps;
  const v = zmn + rng*frac; // value in zoomed range
  const y = top + ph - frac*ph;
  if(y < top+4 || y > top+ph-2) continue;
  // Tick mark
  ctx.strokeStyle='#1e2c3e';ctx.lineWidth=0.6;
  ctx.beginPath();ctx.moveTo(CW,y);ctx.lineTo(CW+3,y);ctx.stroke();
  // Label
  ctx.fillStyle=darkTheme?'#4a6080':'#64748b';
  ctx.font='6.5px monospace';ctx.textAlign='right';ctx.textBaseline='middle';
  const absV=Math.abs(v);
  const lbl=absV>=1000000?((v/1000000).toFixed(1)+'M'):absV>=1000?((v/1000).toFixed(0)+'K'):absV<0.01?v.toExponential(1):v.toFixed(absV<1?2:absV<10?1:0);
  ctx.fillText(lbl,CW+YW-2,y);
  ctx.textBaseline='alphabetic';
 }
 ctx.restore();
}

// ── Auto Divergence Helper for Sub-Panels ─────────────────────
function _renderDivOnPanel(ctx,indArr,priceArr,indColor,tyS,tx,top,ph,start,end,mn2,mx2,mirror,preDivs){
  if(!indArr||!priceArr||indArr.length<20)return;
  const divs=preDivs||_calcDivergences(priceArr,indArr,'');
  if(!divs.length)return;

  const vis=divs.filter(dv=>dv.i1>=start&&dv.i2<end)
    .map(dv=>({...dv,i1:dv.i1-start,i2:dv.i2-start}));
  if(!vis.length)return;
  // فصل صارم: أقوى إشارة هبوطية + أقوى إشارة صعودية فقط -- لا اختلاط بين النوعين
  const bestBear=vis.filter(dv=>dv.type==='bearish').sort((a,b)=>b.score-a.score)[0];
  const bestBull=vis.filter(dv=>dv.type==='bullish').sort((a,b)=>b.score-a.score)[0];
  ctx.save();ctx.beginPath();ctx.rect(0,top,ctx.canvas.width,ph);ctx.clip();
  [bestBear,bestBull].filter(Boolean).forEach(dv=>{

    const x1=tx(dv.i1),x2=tx(dv.i2);
    const iy1=tyS(dv.ii1,mn2,mx2), iy2=tyS(dv.ii2,mn2,mx2);
    const clr=dv.type==='bullish'?'#22c55e':'#ef4444';
    // Shaded area on indicator
    ctx.fillStyle=clr+'18';
    ctx.beginPath();ctx.moveTo(x1,iy1);ctx.lineTo(x2,iy2);
    ctx.lineTo(x2,top+ph);ctx.lineTo(x1,top+ph);ctx.closePath();ctx.fill();
    // Dashed divergence line on indicator
    ctx.strokeStyle=clr+'cc';ctx.lineWidth=1.4;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(x1,iy1);ctx.lineTo(x2,iy2);ctx.stroke();
    ctx.setLineDash([]);
    // Dots at pivots
    [[[x1,iy1],[x2,iy2]]].forEach(([[ax,ay],[bx,by]])=>{
      [ax,bx].forEach((px,pi)=>{
        const py=pi===0?ay:by;
        ctx.beginPath();ctx.arc(px,py,3.5,0,Math.PI*2);
        ctx.fillStyle=clr;ctx.fill();
      });
    });
    // Label
    const mx=(x1+x2)/2;
    const labelY=Math.max(top+9,Math.min(top+ph-9,(dv.type==='bearish'?Math.max(iy1,iy2)+12:Math.min(iy1,iy2)-10)));

    const lbl=dv.type==='bullish'?'↑ تباعد إيجابي':'↓ تباعد سلبي';
    ctx.font='bold 7px Cairo,sans-serif';
    const tw=ctx.measureText(lbl).width+10;
    ctx.fillStyle=clr+'30';ctx.strokeStyle=clr+'70';ctx.lineWidth=0.7;
    ctx.beginPath();ctx.roundRect(mx-tw/2,labelY-7,tw,13,3);ctx.fill();ctx.stroke();
    ctx.fillStyle=clr;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(lbl,mx,labelY);ctx.textBaseline='alphabetic';

    if(mirror&&mirror.sub&&mirror.ty){
      const _k=dv.type==='bearish'?'hi':'lo';
      const _c1=mirror.sub[dv.i1],_c2=mirror.sub[dv.i2];
      const _v1=_c1?(_c1[_k]??_c1.c):null,_v2=_c2?(_c2[_k]??_c2.c):null;
      if(_v1&&_v2){
        const _y1=mirror.ty(_v1),_y2=mirror.ty(_v2);
        ctx.save();ctx.beginPath();ctx.rect(0,mirror.cTop,mirror.CW,mirror.cH);ctx.clip();
        ctx.strokeStyle=clr+'99';ctx.lineWidth=1.5;ctx.setLineDash([6,3]);
        ctx.beginPath();ctx.moveTo(x1,_y1);ctx.lineTo(x2,_y2);ctx.stroke();ctx.setLineDash([]);
        const _ang=Math.atan2(_y2-_y1,x2-x1);
        ctx.beginPath();ctx.moveTo(x2,_y2);
        ctx.lineTo(x2-8*Math.cos(_ang-0.4),_y2-8*Math.sin(_ang-0.4));
        ctx.lineTo(x2-8*Math.cos(_ang+0.4),_y2-8*Math.sin(_ang+0.4));
        ctx.closePath();ctx.fillStyle=clr+'99';ctx.fill();
        ctx.restore();
      }
    }
  });
  ctx.restore();
}


// ── Chart Loading Indicator ──────────────────────────
function showLoader(txt='جاري التحميل...'){
 const l=document.getElementById('chart-loader');
 const t=document.getElementById('chart-loader-txt');
 if(l){l.classList.add('visible');if(t)t.textContent=txt;}
}
function hideLoader(){
 const l=document.getElementById('chart-loader');
 if(l)l.classList.remove('visible');
}

// LIVE DATA SYSTEM -- activates when API_CONFIG.enabled = true

let _liveTimer = null;
const LIVE_INTERVAL_MS = 120000; // تحديث لحظي كل دقيقتين

function _startLiveTicker(){
  _stopLiveTicker();
  if(!API_CONFIG.enabled) return;

  if(API_CONFIG.tickerMode === 'ws' && API_CONFIG.endpoints.ticker){
    API_CONFIG.wsConnect(tick => _applyTick(tick));
  } else if(API_CONFIG.endpoints.ticker){

    _liveTimer = setInterval(_pollLivePrice, LIVE_INTERVAL_MS);
    _pollLivePrice();
  }
}


function _stopLiveTicker(){
  if(_liveTimer){ clearInterval(_liveTimer); _liveTimer=null; }
  API_CONFIG.wsDisconnect();
}

async function _pollLivePrice(){
  if(!API_CONFIG.enabled || !API_CONFIG.endpoints.ticker) return;
const raw = await API_CONFIG.fetch('ticker', {symbol: state.stk.sym});

if(!raw) return;

  // Normalize tick: accept {price/last/close/c, volume/v, change/ch, changePct/pct}
  const tick = {
    c:   +(raw.price || raw.last || raw.close || raw.c || raw.lastTradedPrice || raw.ltp || 0),
    v:   +(raw.volume || raw.vol || raw.v || 0),
    ch:  +(raw.change || raw.ch || 0),
    pct: +(raw.changePct || raw.changePercent || raw.pct || 0),
  };

  if(tick.c > 0) _applyTick(tick);
}

// السوق السعودي: الأحد–الخميس، 10:00–15:00 بتوقيت الرياض
// السوق السعودي: الأحد–الخميس، 10:00–15:00 بتوقيت الرياض
function _isMarketOpen(){
 try{
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Riyadh',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
  const g=t=>p.find(x=>x.type===t)?.value;
  const wd=g('weekday');
  if(wd==='Fri'||wd==='Sat')return false;
  const mins=(+g('hour'))*60+(+g('minute'));
  return mins>=600&&mins<=900; // 10:00 إلى 15:00
 }catch(e){
  const n=new Date(),d=n.getDay();
  if(d===5||d===6)return false;
  const mins=n.getHours()*60+n.getMinutes();
  return mins>=600&&mins<=900;
 }
}

function _applyTick(tick){
  if(!tick || !tick.c || tick.c <= 0) return;
  const prev = state.stk.p;
  state.stk.p = tick.c;
  if(tick.ch !== undefined) state.stk.ch = tick.ch;
  if(tick.pct !== undefined) state.stk.pct = tick.pct;

  // Update last candle with new price
  if(state.allCandles.length > 0){
    const last = state.allCandles[state.allCandles.length - 1];
    const lastDate = last.t instanceof Date ? last.t : new Date(last.t);
    const today = new Date();
    const isSameDay = lastDate.getFullYear()===today.getFullYear() &&
                       lastDate.getMonth()===today.getMonth() &&
                       lastDate.getDate()===today.getDate();

    if(isSameDay){
      // شمعة اليوم فعلاً -- حدّثها عادي
      last.c = tick.c;
      last.hi = Math.max(last.hi, tick.c);
      last.lo = Math.min(last.lo, tick.c);
      if(tick.v) last.v = tick.v;
    } else if(_isMarketOpen()){
      // آخر شمعة قديمة (بيانات 5Y/الكل غير محدّثة حتى اليوم)
      // افتتاح شمعة اليوم الجديدة: نستخدم إغلاق آخر شمعة كسعر افتتاح
      // (أدق من افتراض o=hi=lo=c، ويمنع ظهور الشمعة كخط رفيع بلا جسم)
      const prevClose = last.c;
      const openPrice = prevClose>0 ? prevClose : tick.c;
      state.allCandles.push({
        o: openPrice,
        hi: Math.max(openPrice, tick.c),
        lo: Math.min(openPrice, tick.c),
        c: tick.c,
        v: tick.v || 0,
        t: today
      });
      state.offset=0;
    }
  }
 

  // Update header price display
  const pEl = document.getElementById('pmain');
  if(pEl){
    pEl.textContent = tick.c.toFixed(2);
    const up = tick.c >= prev;
    pEl.style.color = up ? '#22c55e' : '#ef4444';
    setTimeout(()=>pEl.style.color='', 600);
  }
  const up = (tick.pct || tick.ch || 0) >= 0;
  const chEl = document.getElementById('pch');
  const pctEl = document.getElementById('ppct');
  if(chEl) { chEl.textContent=(up?'+':'')+Math.abs(tick.ch||0).toFixed(2); chEl.style.color=up?'#22c55e':'#ef4444'; }
  // احسب النسبة المئوية يدوياً من (التغيّر / الإغلاق السابق الحقيقي) كاحتياطي
  // نعتمد على state.stk.prevClose أو state.stk.close كمصدر موثوق، بدل prev المحلي
  let pctVal = tick.pct;
  if(!pctVal){
   const realPrev = state.stk?.prevClose || state.stk?.close || (tick.c - (tick.ch||0));
   if(realPrev>0){
    const chVal = tick.ch!=null ? tick.ch : (tick.c - realPrev);
    pctVal = (chVal/realPrev)*100;
   }
  }
  if(pctEl) { pctEl.textContent=(up?'+':'')+Math.abs(pctVal||0).toFixed(2)+'%'; pctEl.style.color=up?'#22c55e':'#ef4444'; }

  invalidateChart();
  render();
}

// ── Load full stock list from API ─────────────────────────────
async function loadStockList(){
  if(!API_CONFIG.enabled || !API_CONFIG.endpoints.stocks) return;
  const raw = await API_CONFIG.fetch('stocks');

  if(!raw || !Array.isArray(raw)) return;

    // تطبيع قائمة شركات سهمك -- الحقول: symbol, name_ar, name_en, market, status
    // استبعاد صناديق الريت وحقوق الأولوية من قائمة الشارت
  const _isReitOrRights=(s)=>{
   const ar=' '+(s.name_ar||'')+' ';
   const en=(s.name_en||'').toLowerCase();
   // ريت ككلمة منفصلة (يتجنّب "ريتيل") أو REIT بالإنجليزية
   const isReit=/\sريت\s/.test(ar) || /\breit\b/.test(en);
   // حقوق الأولوية: "حقوق" أو "أولوية" بالعربية، rights بالإنجليزية
   const isRights=/حقوق|أولوية|اولوية/.test(ar) || /\brights?\b/.test(en);
   return isReit || isRights;
  };
  const normalized = raw
    .filter(s=>s.status!=='suspended' && (s.symbol||s.sym) && !_isReitOrRights(s))
    .map(s=>({
      sym:  s.symbol || s.sym || '',
      name: s.name_ar || s.nameAr || s.name || s.name_en || s.symbol || '',
      name_en: s.name_en || '',
      sec:  s.sector || s.market || 'عام',
      p:    0, ch:0, pct:0, // الأسعار تأتي عند فتح السهم عبر loadStk
    }))
    .filter(s=>s.sym);
  if(normalized.length > 0){ 
    // Merge with STOCKS array (API takes priority)
    normalized.forEach(ns=>{
      const existing = STOCKS.findIndex(s=>s.sym===ns.sym);
      if(existing>=0) STOCKS[existing]={...STOCKS[existing],...ns};
      else STOCKS.push(ns);
    });
    // Refresh stock list UI if open
    if(typeof buildStkList==='function' && openSht==='stock') buildStkList();
  }
}


async function loadStk(){

  showLoader(state.stk.name+' -- '+state.per);
  const s=state.stk, up=s.pct>=0;
  document.getElementById('sym-code').textContent=s.sym;
  document.getElementById('stk-name').textContent=s.name;
  document.getElementById('pmain').textContent=s.p.toFixed(2);
  const ch=document.getElementById('pch');
  ch.textContent=(up?'+':'')+Math.abs(s.ch).toFixed(2);
  ch.style.color=up?'#22c55e':'#ef4444';
  const pct=document.getElementById('ppct');
  pct.textContent=(up?'+':'')+s.pct+'%';
  pct.style.color=up?'#22c55e':'#ef4444';
  pct.style.background=up?'rgba(34,197,94,0.12)':'rgba(239,68,68,0.12)';
  pct.style.borderColor=up?'rgba(34,197,94,0.28)':'rgba(239,68,68,0.28)';

  const TF_MINS={'1m':1,'5m':5,'15m':15,'30m':30,'1H':60,'4H':240,'1D':1440,'1W':10080,'1M':43200};
    const PER_COUNT={'1m':200,'5m':180,'15m':160,'30m':150,'1H':140,'4H':130,'1D':130,'1W':104,'1M':96};
  const dv={'1m':80,'5m':70,'15m':65,'30m':60,'1H':55,'4H':50,'1D':55,'1W':40,'1M':45};

  // ── API path ──────────────────────────────────────────────────
  if(API_CONFIG.enabled && API_CONFIG.endpoints.candles){
    try{
      const tf=API_CONFIG.tfMap[state.per]||state.per;
      const _rangeDays=RANGE_DAYS[state.range]||365;
       const raw=await API_CONFIG.fetch('candles',{
        symbol:s.sym, interval:tf,
        period:state.per,
        rangeDays:_rangeDays,
        limit:PER_COUNT[state.per]||130
      });


if(raw&&Array.isArray(raw)&&raw.length>5){
        let candles=normalizeCandles(raw);
        candles=_aggregateCandles(candles, state.per);

 
state.allCandles=candles;

        // Update live price from freshest candle
        const last=state.allCandles[state.allCandles.length-1];
        if(last){
          s.p=last.c;
          document.getElementById('pmain').textContent=last.c.toFixed(2);
        }
const rangeToVis={'أسبوع':7,'شهر':22,'3أشهر':65,'6أشهر':130,'سنة':248,'سنتين':496,'5سنوات':1000,'الكل':1000};
const _vis=Math.min(rangeToVis[state.range]||dv[state.per]||48, candles.length);
state.visible=_vis;

state.offset=0;
chartReady=true;

// جلب أول تحديث لحظي فوراً (بدون انتظار setInterval) قبل الرندر الأول
// حتى تظهر شمعة اليوم الحالي مباشرة بدل ما تنتظر التحديث الدوري
if(API_CONFIG.enabled && API_CONFIG.endpoints.ticker){
  try{
    const _raw0=await API_CONFIG.fetch('ticker',{symbol:s.sym});
    if(_raw0){
      const _t0={
        c: +(_raw0.price||_raw0.last||_raw0.close||_raw0.c||_raw0.lastTradedPrice||_raw0.ltp||0),
        v: +(_raw0.volume||_raw0.vol||_raw0.v||0),
        ch: +(_raw0.change||_raw0.ch||0),
        pct: +(_raw0.changePct||_raw0.changePercent||_raw0.pct||0),
      };
      if(_t0.c>0) _applyTick(_t0);
    }
  }catch(e){ console.warn('[loadStk initial tick]',e); }
}

invalidateChart();render();
setTimeout(hideLoader,120);
_startLiveTicker();
if(_aiDrawMode) setTimeout(()=>_buildAndDrawAIAnnotations(_aiDrawMode),400);
return;
      }
      } catch(e){ console.warn('[loadStk API]',e); }
  }




  // ── لا توجد بيانات حقيقية ─────────────────────────────────────
  // فشل الـ API أو لم يُرجع بيانات كافية. لا نولّد بيانات وهمية.
  // نحتفظ بآخر شموع ناجحة إن وُجدت، وإلا نعرض حالة "تعذّر التحميل".
  if(state.allCandles && state.allCandles.length > 5){
    // لدينا بيانات سابقة ناجحة -- أبقِها واكتفِ بتنبيه خفيف
    state.dataError = null;
    hideLoader();
        { const t=document.getElementById('toast'); if(t){ t.textContent='تعذّر تحديث البيانات -- عرض آخر بيانات متاحة'; t.style.display='block'; t.classList.add('show'); setTimeout(()=>{t.classList.remove('show');t.style.display='none';},3000); } }
    return;
  }
  // لا بيانات إطلاقاً -- حالة خطأ
  state.allCandles = [];
  state.dataError = 'تعذّر تحميل بيانات السهم -- تأكد من الاتصال وأعد المحاولة';
  chartReady = true;
  invalidateChart(); render();
  hideLoader(); _updateUndoButtons();
}


  