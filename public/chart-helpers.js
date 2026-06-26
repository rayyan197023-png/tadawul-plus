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

  return candles;
}


// ── Divergence Detection ────────────────────────────────
function _findPivots(arr, lookback=5){
 // Find local highs and lows in array
 const highs=[], lows=[];
 for(let i=lookback; i<arr.length-lookback; i++){
  if(arr[i]==null) continue;
  let isHigh=true, isLow=true;
  for(let j=i-lookback; j<=i+lookback; j++){
   if(j===i||arr[j]==null) continue;
   if(arr[j]>=arr[i]) isHigh=false;
   if(arr[j]<=arr[i]) isLow=false;
  }
  if(isHigh) highs.push({i, v:arr[i]});
  if(isLow)  lows.push({i, v:arr[i]});
 }
 return {highs, lows};
}

function _calcDivergences(prices, indArr, label, color){
 if(!prices||!indArr||prices.length<20) return [];
 const LB=5;
 const MATCH_WIN=LB+3;
 const MIN_GAP=8; // minimum candles between divergences
 const pPivots=_findPivots(prices, LB);
 const iPivots=_findPivots(indArr, LB);

 const nearest=(arr,idx,win)=>{
  let best=null,bestD=win+1;
  arr.forEach(p=>{const d=Math.abs(p.i-idx);if(d<=win&&d<bestD){bestD=d;best=p;}});
  return best;
 };

 // Score divergence strength (bigger gap = stronger signal)
 const score=(v1,v2,type)=>type==='bearish'?(v1-v2)/Math.abs(v1||1):(v2-v1)/Math.abs(v1||1);

 const rawDivs=[];

 // Bearish
 for(let a=0;a<pPivots.highs.length-1;a++){
  const pH1=pPivots.highs[a],pH2=pPivots.highs[a+1];
  if(pH2.i-pH1.i<6||pH2.i-pH1.i>100) continue;
  if(pH2.v<=pH1.v*0.998) continue;
  const iH2=nearest(iPivots.highs,pH2.i,MATCH_WIN);
  const iH1=nearest(iPivots.highs,pH1.i,MATCH_WIN);
  if(!iH2||!iH1||iH2===iH1) continue;
  if(iH2.v>=iH1.v*0.998) continue;
  rawDivs.push({type:'bearish',i1:pH1.i,i2:pH2.i,
   ii1:iH1.v,ii2:iH2.v,
   score:score(iH1.v,iH2.v,'bearish'),
   label:'هبوط '+label,color:'#ef4444'});
 }

 // Bullish
 for(let a=0;a<pPivots.lows.length-1;a++){
  const pL1=pPivots.lows[a],pL2=pPivots.lows[a+1];
  if(pL2.i-pL1.i<6||pL2.i-pL1.i>100) continue;
  if(pL2.v>=pL1.v*1.002) continue;
  const iL2=nearest(iPivots.lows,pL2.i,MATCH_WIN);
  const iL1=nearest(iPivots.lows,pL1.i,MATCH_WIN);
  if(!iL2||!iL1||iL2===iL1) continue;
  if(iL2.v<=iL1.v*1.002) continue;
  rawDivs.push({type:'bullish',i1:pL1.i,i2:pL2.i,
   ii1:iL1.v,ii2:iL2.v,
   score:score(iL1.v,iL2.v,'bullish'),
   label:'صعود '+label,color:'#22c55e'});
 }

 // Sort by score descending, then deduplicate by proximity
 rawDivs.sort((a,b)=>b.score-a.score);
 const final=[];
 rawDivs.forEach(dv=>{
  // Skip if another stronger divergence already covers this range
  const overlap=final.find(f=>
   f.type===dv.type &&
   !(dv.i2+MIN_GAP<f.i1 || dv.i1>f.i2+MIN_GAP)
  );
  if(!overlap) final.push(dv);
 });

 // Return sorted by position (earliest first)
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
    tickerMode: 'poll',
    stocks:     '/api/sahmkdata',
    orderflow:  null,
    calendar:   null,
    news:       null,
    info:       '/api/sahmkdata',
  },

  // ── Auth (sahmk public, no auth needed) ──────────────────────
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
        const days = params.rangeDays || 365;
        const toD = new Date();
        const fromD = new Date(Date.now() - days*86400000);
        const fmt = d => d.toISOString().slice(0,10);
        const _per = params.period || '1D';
        const _intradayPers = ['1H','4H'];
        if(_intradayPers.includes(_per)){
          qs = `?endpoint=intraday&sym=${params.symbol}&interval=60m`;
        } else {
          // سهمك يُرجع حد أقصى ~1000 شمعة لكل طلب بدءاً من from --
          // نجلب على دفعات حتى نوصل لتاريخ "to" المطلوب
          const qs5y = `?endpoint=ohlcv&sym=${params.symbol}&period=5Y`;
          const r5y = await fetch(this.endpoints.candles + qs5y, {
            headers: this.headers,
            signal: AbortSignal.timeout(10000)
          });
          if(!r5y.ok) return [];
          const d5y = await r5y.json();
          return d5y.data || d5y.bars || [];

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
        ticker:  d => d.quote || d.data || d,
        stocks:  d => d.results || d.companies || d.data || d,
        info:    d => d.company || d.data || d,
      };
      return (unwrap[type] || (d => d))(data);
    } catch(e) {
      console.warn('[sahmk API]', type, e.message);
      return null;
    }
  },

  // ── جلب شموع OHLCV على دفعات لتجاوز حد 1000 سجل لكل طلب ─────
  async _fetchCandlesPaginated(symbol, fromD, toD) {
    const fmt = d => d.toISOString().slice(0,10);
    const toStr = fmt(toD);
    let curFrom = fromD;
    let merged = [];
    let lastSeen = null;
    const MAX_LOOPS = 8; // حماية من حلقة لا نهائية (8×1000 = 8000 شمعة كحد أقصى)

    for (let i = 0; i < MAX_LOOPS; i++) {
      const qs = `?endpoint=ohlcv&sym=${symbol}&period=5Y`;

      let data;
      try {
        const r = await fetch(this.endpoints.candles + qs, {
          headers: this.headers,
          signal: AbortSignal.timeout(10000)
        });
        if (!r.ok) break;
        data = await r.json();
      } catch (e) {
        console.warn('[sahmk API] candles page', e.message);
        break;
      }

      const arr = data.bars || data.data || data.ohlcv || (Array.isArray(data) ? data : []);
      if (!Array.isArray(arr) || !arr.length) break;
      merged = merged.concat(arr);

      break; // sahmk يرجع كل البيانات المتاحة في طلب واحد
    }
    // إزالة التكرارات (تواريخ متطابقة من تداخل الدفعات) وترتيب زمني تصاعدي
    const seen = new Set();
    merged = merged
      .filter(d => {
        const key = d.date || d.t || (d.timestamp ?? JSON.stringify(d));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a,b) => new Date(a.date||a.t||a.timestamp) - new Date(b.date||b.t||b.timestamp));

    return merged;
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
function _renderDivOnPanel(ctx,indArr,priceArr,indColor,tyS,tx,top,ph,start,end,mn2,mx2){
  if(!indArr||!priceArr||indArr.length<20)return;
  const fullPrices=priceArr;
  const divs=_calcDivergences(fullPrices,indArr,'',indColor);
  if(!divs.length)return;
  const vis=divs.filter(dv=>dv.i1>=start&&dv.i2<end)
    .map(dv=>({...dv,i1:dv.i1-start,i2:dv.i2-start}));
  if(!vis.length)return;
  vis.slice(-3).forEach(dv=>{
    const x1=tx(dv.i1),x2=tx(dv.i2);
    const iy1=tyS(dv.ii1,mn2,mx2), iy2=tyS(dv.ii2,mn2,mx2);
    const clr=dv.color;
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
    const mx=(x1+x2)/2, labelY=Math.min(iy1,iy2)-10;
    const lbl=dv.type==='bullish'?'↑ تباعد إيجابي':'↓ تباعد سلبي';
    ctx.font='bold 7px Cairo,sans-serif';
    const tw=ctx.measureText(lbl).width+10;
    ctx.fillStyle=clr+'30';ctx.strokeStyle=clr+'70';ctx.lineWidth=0.7;
    ctx.beginPath();ctx.roundRect(mx-tw/2,labelY-7,tw,13,3);ctx.fill();ctx.stroke();
    ctx.fillStyle=clr;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(lbl,mx,labelY);ctx.textBaseline='alphabetic';
  });
}


  