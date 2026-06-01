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
const vwap_d=(h,l,c2,v,candles)=>{let ct=0,cv=0,ct2=0,prevD=null;return c2.map((_,i)=>{const t=candles&&candles[i]?new Date(candles[i].t):null;const ds=t?t.toDateString():null;if(ds&&ds!==prevD){ct=0;cv=0;ct2=0;prevD=ds;}const tp=(h[i]+l[i]+c2[i])/3;ct+=tp*v[i];cv+=v[i];ct2+=tp*tp*v[i];const vw=cv?ct/cv:null;if(vw==null)return null;const variance=(ct2/cv)-(vw*vw);const std=Math.sqrt(Math.max(0,variance));return{v:vw,u1:vw+std,u2:vw+2*std,d1:vw-std,d2:vw-2*std};});};
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
// StochRSI
const calcStochRSI=(c2,n=14,sk=3,sd=3)=>{
 const r=rsi(c2,n);
 const raw=r.map((_,i)=>{if(i<n-1)return null;const sl=r.slice(i-n+1,i+1).filter(v=>v!=null);if(!sl.length)return null;const mn=Math.min(...sl),mx=Math.max(...sl);return mx===mn?50:(r[i]-mn)/(mx-mn)*100;});
 const rVals=raw.filter(v=>v!=null);
 const kSmooth=sma(rVals,sk);let ki=0;
 return raw.map(v=>v==null?null:(kSmooth[ki++]??null));
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
// Ichimoku
const calcIchi=(h,l,c2)=>{const n=h.length;const mid=(per,i)=>{if(i<per-1)return null;return(Math.max(...h.slice(i-per+1,i+1))+Math.min(...l.slice(i-per+1,i+1)))/2;};const tenkan=h.map((_,i)=>mid(9,i));const kijun=h.map((_,i)=>mid(26,i));const senkouA=new Array(n).fill(null);tenkan.forEach((t,i)=>{if(t==null||kijun[i]==null)return;const fi=i+26;if(fi<n)senkouA[fi]=(t+kijun[i])/2;});const senkouB=new Array(n).fill(null);h.forEach((_,i)=>{const v=mid(52,i);if(v==null)return;const fi=i+26;if(fi<n)senkouB[fi]=v;});const chikou=c2?c2.slice():null;return{tenkan,kijun,senkouA,senkouB,chikou};};;
// STD
const calcSTD=(d,n=20)=>{const ma=sma(d,n);return d.map((_,i)=>ma[i]==null?null:Math.sqrt(d.slice(i-n+1,i+1).reduce((s,v)=>s+(v-ma[i])**2,0)/n));};