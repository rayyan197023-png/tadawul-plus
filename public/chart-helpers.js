// ═══════════════════════════════════════════════
// chart-helpers.js -- Helper Functions
// ═══════════════════════════════════════════════

// CANDLE GENERATOR
// 
function seedRng(s){return()=>{s=(s*1664525+1013904223)&0xffffffff;return(s>>>0)/0xffffffff;};}
function genCandles(sym,base,count,tfMins){
 const seed=sym.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
 const rng=seedRng(seed*31+tfMins);
 const avgVol=STOCKS.find(s=>s.sym===sym)?.avgVol||1e6;
 const out=[];let p=base*(0.88+rng()*0.15);
 const now=new Date();
 for(let i=count-1;i>=0;i--){
 const drift=(base-p)/(p*count)*0.5,noise=(rng()-0.49)*0.018;
 const close=Math.max(p*0.5,p*(1+drift+noise));
 const range=close*(0.008+rng()*0.014);
 const _hi=Math.max(p,close)+range*rng();
 const _lo=Math.min(p,close)-range*rng();
 out.push({o:p,hi:_hi,lo:_lo,c:close,v:Math.round(avgVol*(rng()<0.1?2.5+rng()*2.5:0.4+rng()*1.1)),t:new Date(now.getTime()-(i*tfMins*60000))});
 p=close;
 }
 return out;
}

// ── Candle Normalizer for API integration ────────────────────────
// Call this when loading candles from any external API
// Handles: Tadawul API, Alpha Vantage, Binance, Yahoo Finance formats
function normalizeCandles(rawData){
  if(!Array.isArray(rawData)||!rawData.length)return [];
  const sample=rawData[0];
  // Detect format by field names
  const isYahoo   = 'adjclose' in sample||'Adj Close' in sample;
  const isAlphaV  = '1. open' in sample;
  const isBinance = Array.isArray(sample); // Binance returns arrays
  const isTadawul = 'lastTradedPrice' in sample||'close' in sample;
  
  return rawData.map((d,i)=>{
    let o,hi,lo,c,v,t;
    
    if(isBinance&&Array.isArray(d)){
      // Binance: [openTime,open,high,low,close,volume,...]
      t=new Date(d[0]); o=+d[1]; hi=+d[2]; lo=+d[3]; c=+d[4]; v=+d[5];
    } else if(isAlphaV){
      t=new Date(d['date']||d['timestamp']||Object.keys(d)[0]);
      o=+d['1. open']; hi=+d['2. high']; lo=+d['3. low']; c=+d['4. close']; v=+(d['5. volume']||0);
    } else {
      // Generic: try common field names
      t = d.t instanceof Date ? d.t
        : d.t ? new Date(typeof d.t==='number'&&d.t<1e12?d.t*1000:d.t)
        : d.timestamp ? new Date(typeof d.timestamp==='number'&&d.timestamp<1e12?d.timestamp*1000:d.timestamp)
        : d.date ? new Date(d.date)
        : d.time ? new Date(d.time)
        : new Date(Date.now()-(rawData.length-1-i)*86400000);
      
      o  = +(d.o||d.open||d.Open||0);
      hi = +(d.hi||d.high||d.High||d.h||0);
      lo = +(d.lo||d.low||d.Low||d.l||0);
      c  = +(d.c||d.close||d.Close||d.last||d.lastTradedPrice||0);
      v  = +(d.v||d.volume||d.Volume||d.vol||d.tradeVolume||0);
    }
    
    // Ensure valid OHLC: hi>=max(o,c), lo<=min(o,c)
    hi=Math.max(hi,o,c);
    lo=Math.min(lo,o,c);
    if(!o)o=c;
    
    return{o,hi,lo,c,v,t};
  }).filter(d=>d.c>0); // remove invalid candles
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
  // تداول+ -- API Configuration Layer
  // To activate: set enabled=true and fill your endpoint URLs
  // All functions gracefully fall back to mock data when disabled

  enabled: false,

  // ── Endpoint Configuration ────────────────────────────────────
  // Fill these with your actual API base URLs
  endpoints: {
    // Candle/OHLCV data -- required for core functionality
    candles:   null, // 'https://your-api.com/candles'

    // Real-time price ticker (WebSocket or polling)
    ticker:    null, // 'wss://your-api.com/ticker' OR 'https://...'
    tickerMode:'poll', // 'ws' for WebSocket, 'poll' for HTTP polling

    // Stock list with prices
    stocks:    null, // 'https://your-api.com/stocks'

    // Order flow / tape data
    orderflow: null, // 'https://your-api.com/orderflow'

    // Economic calendar
    calendar:  null, // 'https://your-api.com/calendar'

    // News feed
    news:      null, // 'https://your-api.com/news'

    // Company info / fundamentals
    info:      null, // 'https://your-api.com/info'
  },

  // ── Auth ──────────────────────────────────────────────────────
  headers: {
    // 'Authorization': 'Bearer YOUR_TOKEN',
    // 'X-API-Key': 'YOUR_KEY',
  },

  // ── Timeframe mapping ─────────────────────────────────────────
  // Map app timeframes to your API's interval names
  tfMap: {
    '1m':'1',  '5m':'5',  '15m':'15', '30m':'30',
    '1H':'60', '4H':'240','1D':'D',   '1W':'W',   '1M':'M'
  },

  // ── HTTP Fetch ────────────────────────────────────────────────
  async fetch(type, params={}) {
    const url = this.endpoints[type];
    if(!url || !this.enabled) return null;
    try {
      const qs = new URLSearchParams(params).toString();
      const r = await fetch(url + (qs?'?'+qs:''), {
        headers: this.headers,
        signal: AbortSignal.timeout(8000)
      });
      if(!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    } catch(e) {
      console.warn('[API]', type, e.message);
      return null;
    }
  },

  // ── WebSocket for live prices ─────────────────────────────────
  _ws: null,
  _wsCb: null,
  wsConnect(onTick) {
    const url = this.endpoints.ticker;
    if(!url||!this.enabled||this.tickerMode!=='ws') return;
    if(this._ws) this._ws.close();
    this._ws = new WebSocket(url);
    this._wsCb = onTick;
    this._ws.onmessage = e => {
      try { const d=JSON.parse(e.data); onTick(d); } catch(_){}
    };
    this._ws.onclose = () => {
      // Auto-reconnect after 3s
      if(this.enabled) setTimeout(()=>this.wsConnect(onTick), 3000);
    };
  },
  wsDisconnect() {
    if(this._ws) { this._ws.close(); this._ws=null; }
  }
}


  