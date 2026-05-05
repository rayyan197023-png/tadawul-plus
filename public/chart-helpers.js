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

