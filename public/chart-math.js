// ═══════════════════════════════════════════════
// chart-math.js -- Indicators & Calculations
// ═══════════════════════════════════════════════

// INDICATORS (math)
// 
const sma=(d,n)=>d.map((_,i)=>i<n-1?null:d.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n);
 
const ema=(d,n)=>{const k=2/(n+1);const e=[];d.forEach((v,i)=>{if(i<n-1)e.push(null);else if(i===n-1)e.push(d.slice(0,n).reduce((a,b)=>a+b,0)/n);else e.push(v*k+e[i-1]*(1-k));});return e;}
const rsi=(c,n=14)=>{
  // Wilder's smoothing (RMA) -- standard RSI (Welles Wilder 1978)
  const r=[];let ag=0,al=0,seeded=false;
  for(let i=1;i<c.length;i++){
    const d=c[i]-c[i-1];
    const gn=d>0?d:0, ln=d<0?-d:0;
    if(i<n){ag+=gn;al+=ln;r.push(null);}
    else if(i===n){
      ag=(ag+gn)/n; al=(al+ln)/n; seeded=true;
      r.push(al===0?100:100-100/(1+ag/al));
    } else {
      ag=(ag*(n-1)+gn)/n; al=(al*(n-1)+ln)/n;
      r.push(al===0?100:100-100/(1+ag/al));
    }
  }
  r.unshift(null); return r;
};
const macd=(c,fast=12,slow=26,sigLen=9)=>{const e12=ema(c,fast),e26=ema(c,slow);const m=c.map((_,i)=>e12[i]!=null&&e26[i]!=null?e12[i]-e26[i]:null);const sig=ema(m.filter(v=>v!=null),sigLen);let si=0;const fs=m.map(v=>v==null?null:sig[si++]??null);return{macd:m,signal:fs,hist:m.map((v,i)=>v!=null&&fs[i]!=null?v-fs[i]:null)};};
const bb=(c,n=20,k=2)=>{const ma=sma(c,n);return c.map((_,i)=>{if(ma[i]==null)return null;const sl=c.slice(i-n+1,i+1),std=Math.sqrt(sl.reduce((a,v)=>a+(v-ma[i])**2,0)/n);return{mid:ma[i],up:ma[i]+k*std,dn:ma[i]-k*std};});};
const stoch=(h,l,c,n=14)=>c.map((_,i)=>{if(i<n-1)return null;const hh=Math.max(...h.slice(i-n+1,i+1)),ll=Math.min(...l.slice(i-n+1,i+1));return hh===ll?50:((c[i]-ll)/(hh-ll))*100;});
const atr=(data,n=14)=>{const tr=data.map((d,i)=>i===0?d.hi-d.lo:Math.max(d.hi-d.lo,Math.abs(d.hi-data[i-1].c),Math.abs(d.lo-data[i-1].c)));return sma(tr,n);};
const obv=(c,v)=>{let o=[0];for(let i=1;i<c.length;i++)o.push(o[i-1]+(c[i]>c[i-1]?v[i]:c[i]<c[i-1]?-v[i]:0));return o;};
const vwap=(h,l,c2,v,candles)=>{let ct=0,cVol=0,ct2=0;return c2.map((_,i)=>{const tp=(h[i]+l[i]+c2[i])/3;ct+=tp*v[i];cVol+=v[i];ct2+=tp*tp*v[i];const vw=cVol?ct/cVol:null;if(vw==null)return null;const variance=(ct2/cVol)-(vw*vw);const std=Math.sqrt(Math.max(0,variance));return{v:vw,u1:vw+std,u2:vw+2*std,d1:vw-std,d2:vw-2*std};});};
const vwap_d=(h,l,c2,v,candles)=>{let ct=0,cVol=0,ct2=0,prevD=null;return c2.map((_,i)=>{const t=candles&&candles[i]?new Date(candles[i].t):null;const ds=t?t.toDateString():null;if(ds&&ds!==prevD){ct=0;cVol=0;ct2=0;prevD=ds;}const tp=(h[i]+l[i]+c2[i])/3;ct+=tp*v[i];cVol+=v[i];ct2+=tp*tp*v[i];const vw=cVol?ct/cVol:null;if(vw==null)return null;const variance=(ct2/cVol)-(vw*vw);const std=Math.sqrt(Math.max(0,variance));return{v:vw,u1:vw+std,u2:vw+2*std,d1:vw-std,d2:vw-2*std};});};
const adx=(h,l,c,n=14)=>{
  // Wilder's ADX -- proper RMA with correct array alignment
  const N=c.length;
  const result=new Array(N).fill(null);
  if(N<n*2)return result;
  // Build TR, +DM, -DM arrays (length N-1, index 0 = bar 1)
  const tr=[],pdm=[],ndm=[];
  for(let i=1;i<N;i++){
    tr.push(Math.max(h[i]-l[i],Math.abs(h[i]-c[i-1]),Math.abs(l[i]-c[i-1])));
    const up=h[i]-h[i-1], dn=l[i-1]-l[i];
    pdm.push(up>dn&&up>0?up:0);
    ndm.push(dn>up&&dn>0?dn:0);
  }
  // Wilder smoothing (period=n) in-place
  const wma=(arr)=>{
    const out=new Array(arr.length).fill(0);
    let s=arr.slice(0,n).reduce((a,b)=>a+b,0);
    out[n-1]=s;
    for(let i=n;i<arr.length;i++){s=s-s/n+arr[i];out[i]=s;}
    return out;
  };
  const smoothTR=wma(tr), smoothPDM=wma(pdm), smoothNDM=wma(ndm);
  // DX and ADX
  const dx=new Array(tr.length).fill(null);
  for(let i=n-1;i<tr.length;i++){
    if(!smoothTR[i])continue;
    const pdi=(smoothPDM[i]/smoothTR[i])*100;
    const ndi2=(smoothNDM[i]/smoothTR[i])*100;
    dx[i]=Math.abs(pdi-ndi2)/(pdi+ndi2||1)*100;
    // Map back to result (tr[i] corresponds to bar i+1)
    result[i+1]={pdi,ndi:ndi2,adx:0};
  }
  // Smooth DX into ADX
  let adxSum=0,adxCount=0;
  for(let i=n-1;i<dx.length;i++){
    if(dx[i]===null)continue;
    adxSum+=dx[i];adxCount++;
    if(adxCount>=n){
      const adxVal=adxCount===n?adxSum/n:(result[i]?.adx||0)*(n-1)/n+dx[i]/n;
      if(result[i+1])result[i+1].adx=adxVal;
    }
  }
  return result;
};

// WMA - Weighted Moving Average
const wma=(d,n)=>d.map((_,i)=>{if(i<n-1)return null;const sl=d.slice(i-n+1,i+1);const w=sl.reduce((s,v,j)=>s+(j+1)*v,0);const ws=(n*(n+1))/2;return w/ws;});
// DEMA - Double EMA
const dema=(d,n)=>{const e1=ema(d,n);const e2=ema(e1.filter(v=>v!=null),n);let si=0;return e1.map(v=>v==null?null:2*v-(e2[si++]??v));};
// TEMA - Triple EMA
const tema=(d,n)=>{const e1=ema(d,n);const e1f=e1.filter(v=>v!=null);const e2=ema(e1f,n);const e2f=e2.filter(v=>v!=null);const e3=ema(e2f,n);let s2=0,s3=0;return e1.map(v=>{if(v==null)return null;const v2=e2[s2++]??v;const v3=e3[s3++]??v2;return 3*v-3*v2+v3;});};
// HMA - Hull Moving Average
const hma=(d,n)=>{const half=Math.floor(n/2);const sq=Math.round(Math.sqrt(n));const w1=wma(d,half);const w2=wma(d,n);const diff=d.map((_,i)=>w1[i]!=null&&w2[i]!=null?2*w1[i]-w2[i]:null);return wma(diff.filter(v=>v!=null),sq).reduce((arr,v,i)=>{arr[i+diff.filter(v=>v==null).length]=v;return arr;},Array(d.length).fill(null));};
// VWMA
const vwma=(p,v,n)=>p.map((_,i)=>{if(i<n-1)return null;const ps=p.slice(i-n+1,i+1),vs=v.slice(i-n+1,i+1);return ps.reduce((s,pv,j)=>s+pv*vs[j],0)/vs.reduce((s,vv)=>s+vv,0);});
// CCI
const calcCCI=(h,l,c2,n=20)=>c2.map((_,i)=>{if(i<n-1)return null;const tp=c2.slice(i-n+1,i+1).map((_2,j)=>(h[i-n+1+j]+l[i-n+1+j]+c2[i-n+1+j])/3);const m=tp.reduce((s,v)=>s+v,0)/n;const d2=tp.reduce((s,v)=>s+Math.abs(v-m),0)/n;return d2===0?0:(tp[n-1]-m)/(0.015*d2);});
// Williams %R
const calcWR=(h,l,c2,n=14)=>c2.map((_,i)=>{if(i<n-1)return null;const hh=Math.max(...h.slice(i-n+1,i+1)),ll=Math.min(...l.slice(i-n+1,i+1));return hh===ll?-50:((hh-c2[i])/(hh-ll))*-100;});
// ROC
const calcROC=(d,n=10)=>d.map((v,i)=>i<n||!d[i-n]?null:((v-d[i-n])/d[i-n])*100);
// Momentum
const calcMOM=(d,n=10)=>d.map((v,i)=>i<n?null:v-d[i-n]);
// Awesome Oscillator
const calcAO=(h,l)=>{const mp=h.map((v,i)=>(v+l[i])/2);const s5=sma(mp,5),s34=sma(mp,34);return mp.map((_,i)=>s5[i]!=null&&s34[i]!=null?s5[i]-s34[i]:null);};
// MFI
const calcMFI=(h,l,c2,v,n=14)=>{const tp=c2.map((_,i)=>(h[i]+l[i]+c2[i])/3);const mf=tp.map((t,i)=>({p:t*v[i],up:i>0&&t>tp[i-1]}));return c2.map((_,i)=>{if(i<n)return null;const sl=mf.slice(i-n+1,i+1);const pmf=sl.filter(x=>x.up).reduce((s,x)=>s+x.p,0);const nmf=sl.filter(x=>!x.up).reduce((s,x)=>s+x.p,0);return nmf===0?100:100-(100/(1+(pmf/nmf)));});};
// CMF
const calcCMF=(h,l,c2,v,n=20)=>c2.map((_,i)=>{if(i<n-1)return null;let mfv=0,tv=0;for(let j=i-n+1;j<=i;j++){const hl=h[j]-l[j];if(hl>0)mfv+=((c2[j]-l[j])-(h[j]-c2[j]))/hl*v[j];tv+=v[j];}return tv?mfv/tv:0;});
// Keltner Channel
const calcKC=(h,l,c2,n=20,m=1.5)=>{const ma=ema(c2,n);const a=calcATR_data(h.map((_,i)=>({hi:h[i],lo:l[i],c:c2[i]})),n);return c2.map((_,i)=>ma[i]==null?null:{mid:ma[i],up:ma[i]+m*a[i],dn:ma[i]-m*a[i]});};
const calcATR_data=(data,n=14)=>{const tr=data.map((d,i)=>i===0?d.hi-d.lo:Math.max(d.hi-d.lo,Math.abs(d.hi-data[i-1].c),Math.abs(d.lo-data[i-1].c)));return sma(tr,n);};
// Donchian Channel
const calcDC=(h,l,n=20)=>h.map((_,i)=>{if(i<n-1)return null;return{up:Math.max(...h.slice(i-n+1,i+1)),dn:Math.min(...l.slice(i-n+1,i+1))};});
// StochRSI -- يرجع {k, d} حسب المعيار الأكاديمي القياسي (خطان: %K سريع، %D بطيء)
const calcStochRSI=(c2,n=14,sk=3,sd=3)=>{
 const r=rsi(c2,n);
 const raw=r.map((_,i)=>{if(i<n-1)return null;const sl=r.slice(i-n+1,i+1).filter(v=>v!=null);if(!sl.length)return null;const mn=Math.min(...sl),mx=Math.max(...sl);return mx===mn?50:(r[i]-mn)/(mx-mn)*100;});
 const rVals=raw.filter(v=>v!=null);
 const kSmooth=sma(rVals,sk);let ki=0;
 const k=raw.map(v=>v==null?null:(kSmooth[ki++]??null));
 const kVals=k.filter(v=>v!=null);
 const dSmooth=sma(kVals,sd);let di=0;
 const d=k.map(v=>v==null?null:(dSmooth[di++]??null));
 return {k,d};
};

// Aroon
const calcAroon=(h,l,n=25)=>h.map((_,i)=>{if(i<n)return null;const hIdx=h.slice(i-n,i+1).reduce((bi,v,j)=>v>h[i-n+bi]?j:bi,0);const lIdx=l.slice(i-n,i+1).reduce((bi,v,j)=>v<l[i-n+bi]?j:bi,0);return{up:((n-((n)-hIdx))/n)*100,dn:((n-((n)-lIdx))/n)*100};});
// TSI
const calcTSI=(c2,r=25,s=13)=>{const mtm=c2.map((v,i)=>i?v-c2[i-1]:0);const ema1=ema(mtm,r),ema2=ema(ema1.filter(v=>v!=null),s);const abs1=ema(mtm.map(Math.abs),r),abs2=ema(abs1.filter(v=>v!=null),s);let s2=0;return ema1.map((v,i)=>{if(v==null)return null;const a=abs2[s2]??1;return a?100*(ema2[s2++]??0)/a:null;});};
// DPO
const calcDPO=(d,n=20)=>{const m=sma(d,n);const shift=Math.floor(n/2)+1;return d.map((v,i)=>m[i-shift]!=null?v-m[i-shift]:null);};
// Supertrend
const calcSupertrend=(h,l,c2,n=10,m=3)=>{const atr2=calcATR_data(h.map((_,i)=>({hi:h[i],lo:l[i],c:c2[i]})),n);let dir=1,up=null,dn=null;return c2.map((v,i)=>{if(atr2[i]==null)return null;const mid=(h[i]+l[i])/2,nu=mid-m*atr2[i],nd=mid+m*atr2[i];if(i===0){up=nu;dn=nd;return{val:dn,bull:false};}const pu=up,pd=dn;up=nu>pu||c2[i-1]<pu?nu:pu;dn=nd<pd||c2[i-1]>pd?nd:pd;if(dir===1&&v<up)dir=-1;else if(dir===-1&&v>dn)dir=1;return{val:dir===1?up:dn,bull:dir===1};});};
// PSAR
const calcPSAR=(h,l,step=0.02,maxA=0.2)=>{if(h.length<2)return h.map(()=>null);let bull=true,af=step,ep=h[0],sar=l[0];return h.map((_,i)=>{if(i===0)return{val:sar,bull};let ns=sar+af*(ep-sar);if(bull){ns=Math.min(ns,l[i-1],i>1?l[i-2]:l[i-1]);}else{ns=Math.max(ns,h[i-1],i>1?h[i-2]:h[i-1]);}if(bull&&l[i]<ns){bull=false;ns=ep;ep=l[i];af=step;}else if(!bull&&h[i]>ns){bull=true;ns=ep;ep=h[i];af=step;}else{if(bull&&h[i]>ep){ep=h[i];af=Math.min(af+step,maxA);}else if(!bull&&l[i]<ep){ep=l[i];af=Math.min(af+step,maxA);}}sar=ns;return{val:sar,bull};});};

// Ichimoku -- مع دعم الغيمة المستقبلية (26 شمعة قدام آخر شمعة)
const calcIchi=(h,l,c2)=>{
  const n=h.length;
  const FUTURE=26;
  const mid=(per,i)=>{if(i<per-1||i>=n)return null;return(Math.max(...h.slice(i-per+1,i+1))+Math.min(...l.slice(i-per+1,i+1)))/2;};
  const tenkan=h.map((_,i)=>mid(9,i));
  const kijun=h.map((_,i)=>mid(26,i));
  const totalLen=n+FUTURE;
  const senkouA=new Array(totalLen).fill(null);
  const senkouB=new Array(totalLen).fill(null);
  for(let i=0;i<n;i++){
    const t=tenkan[i], k=kijun[i];
    if(t!=null&&k!=null) senkouA[i+FUTURE]=(t+k)/2;
    const b=mid(52,i);
    if(b!=null) senkouB[i+FUTURE]=b;
  }
  const chikou=c2?c2.slice():null;
  return{tenkan,kijun,senkouA,senkouB,chikou,future:FUTURE,baseLen:n};
};


// STD
const calcSTD=(d,n=20)=>{const ma=sma(d,n);return d.map((_,i)=>ma[i]==null?null:Math.sqrt(d.slice(i-n+1,i+1).reduce((s,v)=>s+(v-ma[i])**2,0)/n));};

// ── Custom Indicator System ─────────────────────────────
let customInds = []; // [{id,name,color,formula,type,lineWidth}]

// Safe formula evaluator -- sandboxed, only math + indicator functions
function _evalCustomInd(formula, allC, allH, allL, allV){
 try {
  // Build sandbox with available data + functions
  const _sandbox = {
   close: allC, high: allH, low: allL, volume: allV,
   // Math helpers
   abs: Math.abs, max: Math.max, min: Math.min,
   sqrt: Math.sqrt, pow: Math.pow, log: Math.log,
   // Indicator functions (all return arrays same length as input)
   SMA: (src,n)=>sma(src,n),
   EMA: (src,n)=>ema(src,n),
   RSI: (src,n=14)=>rsi(src,n),
   BB:  (src,n=20,k=2)=>bb(src,n,k),
   ATR: (n=14)=>calcATR_data({map:(fn)=>allC.map((_,i)=>({c:allC[i],hi:allH[i],lo:allL[i]}))},n),
   OBV: ()=>obv(allC,allV),
   MACD:(src,f=12,s=26,sg=9)=>macd(src,f,s,sg),
   // Arithmetic on arrays
   ADD: (a,b)=>a.map((v,i)=>v==null||b[i]==null?null:v+b[i]),
   SUB: (a,b)=>a.map((v,i)=>v==null||b[i]==null?null:v-b[i]),
   MUL: (a,b)=>a.map((v,i)=>v==null||b[i]==null?null:v*b[i]),
   DIV: (a,b)=>a.map((v,i)=>v==null||b[i]==null||b[i]===0?null:v/b[i]),
   // Scalar operations
   ADDK: (a,k)=>a.map(v=>v==null?null:v+k),
   MULK: (a,k)=>a.map(v=>v==null?null:v*k),
   // Shift array
   SHIFT: (a,n)=>a.map((_,i)=>i<n?null:a[i-n]),
   // Cross detection (returns 1 on cross up, -1 on cross down, 0 otherwise)
   CROSS: (a,b)=>a.map((_,i)=>{
    if(i===0||a[i]==null||b[i]==null||a[i-1]==null||b[i-1]==null)return 0;
    if(a[i-1]<=b[i-1]&&a[i]>b[i])return 1;
    if(a[i-1]>=b[i-1]&&a[i]<b[i])return -1;
    return 0;
   }),
   // Clamp array values
   CLAMP: (a,mn,mx)=>a.map(v=>v==null?null:Math.max(mn,Math.min(mx,v))),
   // Number of candles
   N: allC.length,
   // Derived price sources
   hl2: allH.map((h,i)=>(h+allL[i])/2),
   hlc3: allH.map((h,i)=>(h+allL[i]+allC[i])/3),
ohlc4: allH.map((h,i)=>((allC[i-1]??allC[i])+h+allL[i]+allC[i])/4),

   // More MA types
   WMA: (src,n)=>src.map((_,i)=>i<n-1?null:src.slice(i-n+1,i+1).reduce((s,v,j)=>s+v*(j+1),0)/(n*(n+1)/2)),
   DEMA: (src,n)=>{const e1=ema(src,n);const e2=ema(e1,n);return e1.map((v,i)=>v==null||e2[i]==null?null:2*v-e2[i]);},
   TEMA: (src,n)=>{const e1=ema(src,n);const e2=ema(e1,n);const e3=ema(e2,n);return e1.map((v,i)=>v==null||e2[i]==null||e3[i]==null?null:3*v-3*e2[i]+e3[i]);},
   HULL: (src,n)=>{const w=Math.round(Math.sqrt(n));const h=ema(src.map((_,i)=>i<n-1?null:2*(ema(src,Math.floor(n/2))[i]??0)-(ema(src,n)[i]??0)),w);return h;},
   // Momentum indicators
   MOM: (src,n=10)=>src.map((v,i)=>i<n||v==null||src[i-n]==null?null:v-src[i-n]),
   ROC: (src,n=10)=>src.map((v,i)=>i<n||v==null||src[i-n]==null||src[i-n]===0?null:(v-src[i-n])/src[i-n]*100),
   CCI: (n=20)=>{const tp=allH.map((h,i)=>(h+allL[i]+allC[i])/3);return tp.map((_,i)=>{if(i<n-1)return null;const sl=tp.slice(i-n+1,i+1);const m=sl.reduce((a,b)=>a+b,0)/n;const d=sl.reduce((a,v)=>a+Math.abs(v-m),0)/n;return d===0?0:(tp[i]-m)/(0.015*d);});},
   CMO: (src,n=14)=>src.map((_,i)=>{if(i<n)return null;let u=0,d=0;for(let k=i-n+1;k<=i;k++){const diff=src[k]-(src[k-1]??src[k]);diff>0?u+=diff:d-=diff;}return u+d===0?0:(u-d)/(u+d)*100;}),
   // Volume indicators
   CMF: (n=20)=>{const mf=allH.map((h,i)=>{const r=h-allL[i]||0.001;return((allC[i]-allL[i])-(h-allC[i]))/r*allV[i];});return mf.map((_,i)=>{if(i<n-1)return null;const sv=allV.slice(i-n+1,i+1).reduce((a,b)=>a+b,0);return sv===0?0:mf.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/sv;});},
   // Statistical
   STDEV: (src,n=20)=>src.map((_,i)=>{if(i<n-1)return null;const sl=src.slice(i-n+1,i+1).filter(v=>v!=null);const m=sl.reduce((a,b)=>a+b,0)/sl.length;return Math.sqrt(sl.reduce((a,v)=>a+(v-m)**2,0)/sl.length);}),
   HIGHEST: (src,n=20)=>src.map((_,i)=>i<n-1?null:Math.max(...src.slice(i-n+1,i+1).filter(v=>v!=null))),
   LOWEST: (src,n=20)=>src.map((_,i)=>i<n-1?null:Math.min(...src.slice(i-n+1,i+1).filter(v=>v!=null))),
   ABS: (a)=>Array.isArray(a)?a.map(v=>v==null?null:Math.abs(v)):Math.abs(a),
   SQRT: (a)=>Array.isArray(a)?a.map(v=>v==null?null:Math.sqrt(Math.abs(v))):Math.sqrt(Math.abs(a)),
   MAX: (a,b)=>Array.isArray(a)?a.map((v,i)=>v==null||(Array.isArray(b)&&b[i]==null)?null:Math.max(v,Array.isArray(b)?b[i]:b)):Math.max(a,b),
   MIN: (a,b)=>Array.isArray(a)?a.map((v,i)=>v==null||(Array.isArray(b)&&b[i]==null)?null:Math.min(v,Array.isArray(b)?b[i]:b)):Math.min(a,b),
  };

  // Build function from formula
  // ── Security: blacklist dangerous patterns ──
  const dangerousPatterns = /\b(fetch|XMLHttpRequest|import|eval|Function|require|process|window|document|globalThis|self|parent|top|location|navigator|localStorage|sessionStorage|indexedDB|cookie|alert|prompt|confirm|setTimeout|setInterval|Worker|postMessage|FileReader|Blob)\b/i;
  if(dangerousPatterns.test(formula)) return null;
  // Limit formula length
  if(formula.length > 500) return null;
  
  const keys = Object.keys(_sandbox);
  const vals = Object.keys(_sandbox).map(k=>_sandbox[k]);
  const fn = new Function(...keys, `"use strict"; return (${formula});`);
  const result = fn(...vals);

  // Result must be an array
  if(!Array.isArray(result)) return null;
  return result;
 } catch(e) {
  return null; // silent fail
 }
}


// ── تجميع الشموع اليومية إلى أسبوعية/شهرية ──────────────────────
// سهمك يوفّر بيانات يومية فقط (endpoint: historical).
// للفريمات الأكبر نجمّع محلياً: فتح أول يوم، إغلاق آخر يوم، أعلى/أدنى الكل، مجموع الحجم.
function _aggregateCandles(daily, mode){
 if((mode!=='1W' && mode!=='1M') || !Array.isArray(daily) || daily.length<2) return daily;
 const groups={};
 const order=[];
 daily.forEach(c=>{
  const dt = c.t instanceof Date ? c.t : new Date(c.t);
  if(isNaN(dt)) return;
  let key;
  if(mode==='1W'){
   // مفتاح الأسبوع: السنة + رقم الأسبوع (ISO تقريبي)
   const onejan=new Date(dt.getFullYear(),0,1);
   const week=Math.ceil((((dt-onejan)/86400000)+onejan.getDay()+1)/7);
   key=dt.getFullYear()+'-W'+week;
  } else {
   key=dt.getFullYear()+'-'+dt.getMonth();
  }
  if(!groups[key]){ groups[key]=[]; order.push(key); }
  groups[key].push(c);
 });
 return order.map(k=>{
  const g=groups[k];
  return {
   o:  g[0].o,
   c:  g[g.length-1].c,
   hi: Math.max(...g.map(x=>x.hi)),
   lo: Math.min(...g.map(x=>x.lo)),
   v:  g.reduce((s,x)=>s+(x.v||0),0),
   t:  g[g.length-1].t
  };
 });
}


