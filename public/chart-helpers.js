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
// ── Candle Normalizer for API integration ────────────────────────
// Call this when loading candles from any external API
// Handles: Tadawul API, Alpha Vantage, Binance, Yahoo Finance formats

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
  
  