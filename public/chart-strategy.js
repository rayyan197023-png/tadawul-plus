
function runBacktest(stratId){
  const all=state.allCandles;
  const n=all.length;
  if(n<30)return{trades:0,winRate:0,avgPnl:0,totalPnl:0,wfScore:0,maxDrawdown:0};
  const closes=all.map(d=>d.c);
  const highs=all.map(d=>d.hi);
  const lows=all.map(d=>d.lo);
  const opens=all.map(d=>d.o||d.c);
  const vols=all.map(d=>d.v);

  // ── Indicator helpers ──────────────────────────────────
  const _sma=(arr,p)=>arr.map((_,i)=>i<p-1?null:arr.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p);
  const _ema=(arr,p)=>{const k=2/(p+1);let pv=null;return arr.map(v=>{pv=pv==null?v:v*k+pv*(1-k);return pv;});};
  const _rsi=(arr,p=14)=>{
    let g=0,l=0;
    for(let i=1;i<=p&&i<arr.length;i++){const d=arr[i]-arr[i-1];d>0?g+=d:l-=d;}
    let ag=g/p,al=l/p;
    const r=new Array(Math.min(p,arr.length)).fill(null);
    for(let i=p;i<arr.length;i++){
      const d=arr[i]-arr[i-1];
      ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;
      r.push(al===0?100:100-100/(1+ag/al));
    }
    return r;
  };
  const _atr=(h,l,c,p=14)=>{
    const tr=h.map((v,i)=>i===0?v-l[i]:Math.max(v-l[i],Math.abs(v-c[i-1]),Math.abs(l[i]-c[i-1])));
    return _sma(tr,p);
  };
  const _macd=(arr,f=12,s=26,sig=9)=>{
    const fast=_ema(arr,f),slow=_ema(arr,s);
    const line=arr.map((_,i)=>fast[i]!=null&&slow[i]!=null?fast[i]-slow[i]:null);
    const signal=_ema(line.map(v=>v??0),sig);
    const hist=line.map((v,i)=>v!=null&&signal[i]!=null?v-signal[i]:null);
    return{line,signal,hist};
  };
  const _supertrend=(h,l,c,p=10,mult=3)=>{
    const atr=_atr(h,l,c,p);
    const upper=[],lower=[],trend=[];
    let prevT=1,prevU=null,prevL=null;
    for(let i=0;i<c.length;i++){
      const mid=(h[i]+l[i])/2;
      const a=atr[i]||0;
      let u=mid+mult*a, lo2=mid-mult*a;
      if(prevU!==null) u=Math.min(u,prevU);
      if(prevL!==null) lo2=Math.max(lo2,prevL);
      let t=prevT;
      if(prevT===1&&c[i]<lo2) t=-1;
      else if(prevT===-1&&c[i]>u) t=1;
      if(t!==prevT){u=mid+mult*a;lo2=mid-mult*a;}
      upper.push(u);lower.push(lo2);trend.push(t);
      prevU=u;prevL=lo2;prevT=t;
    }
    return trend;
  };
  const _psar=(h,l,step=0.02,maxA=0.2)=>{
    let bull=true,af=step,ep=h[0],sar=l[0];
    const trend=[1];
    for(let i=1;i<h.length;i++){
      let ns=sar+af*(ep-sar);
      if(bull){
        ns=Math.min(ns,l[i-1],i>1?l[i-2]:l[i-1]);
        if(l[i]<ns){bull=false;ns=ep;ep=l[i];af=step;}
        else if(h[i]>ep){ep=h[i];af=Math.min(af+step,maxA);}
      } else {
        ns=Math.max(ns,h[i-1],i>1?h[i-2]:h[i-1]);
        if(h[i]>ns){bull=true;ns=ep;ep=h[i];af=step;}
        else if(l[i]<ep){ep=l[i];af=Math.min(af+step,maxA);}
      }
      sar=ns;trend.push(bull?1:-1);
    }
    return trend;
  };

  // Walk-Forward: 2 windows (IS=60%, OOS=40%)
  const periods=[
    {is:[0,Math.floor(n*0.45)],oos:[Math.floor(n*0.45),Math.floor(n*0.70)]},
    {is:[Math.floor(n*0.30),Math.floor(n*0.70)],oos:[Math.floor(n*0.70),n]},
  ];

  const _evalPeriod=(s0,s1)=>{
    const sl=closes.slice(s0,s1);
    const hl=highs.slice(s0,s1);
    const ll=lows.slice(s0,s1);
    const ol=opens.slice(s0,s1);
    const vl=vols.slice(s0,s1);
    const L=sl.length;
    if(L<15)return[];
    const trades=[];let pos=null;

    // Pre-compute indicators
    const ma20=_sma(sl,Math.min(20,L));
    const ma50=_sma(sl,Math.min(50,L));
    const rsi=_rsi(sl,14);
    const volMA=_sma(vl,20);
    const atrArr=_atr(hl,ll,sl,14);
    const stTrend=['SUPERTREND'].includes(stratId)?_supertrend(hl,ll,sl,10,3):null;
    const psarTrend=['PSAR_STR'].includes(stratId)?_psar(hl,ll):null;
    const macdData=['MACD_STR'].includes(stratId)?_macd(sl,12,26,9):null;

    for(let i=2;i<L-1;i++){
      let buy=false,sell=false;
      const atr=atrArr[i]||0.001;
      const vma=volMA[i]||1;

      // ── Each strategy's signal logic (matches render logic) ──
      if(stratId==='TURTLE'){
        const hi20=Math.max(...hl.slice(Math.max(0,i-20),i));
        const lo10=Math.min(...ll.slice(Math.max(0,i-10),i));
        buy=sl[i]>hi20&&sl[i-1]<=hi20;
        sell=sl[i]<lo10;

      } else if(stratId==='ICHIMOKU_STR'){
        buy=rsi[i]>52&&rsi[i]<70&&sl[i]>sl[i-1]&&vl[i]>vma*1.1;
        sell=rsi[i]<48&&sl[i]<sl[i-1];

      } else if(stratId==='WYCKOFF_ACC'){
        const bigUp=sl[i]>ol[i]&&(sl[i]-ol[i])>atr*0.5;
        const bigDown=sl[i]<ol[i]&&(ol[i]-sl[i])>atr*0.5;
        const bigVol=vl[i]>vma*1.4;
        const weakVol=vl[i]<vma*1.0;
        const lo30=Math.min(...ll.slice(Math.max(0,i-30),i));
        const nearLow=ll[i]<=lo30*1.03;
        buy=bigUp&&bigVol&&sl[i]>sl[i-2];
        sell=bigDown&&bigVol&&nearLow;

      } else if(stratId==='SUPPLY_DEMAND'){
        const move=Math.abs(sl[i]-sl[i-1]);
        buy=sl[i]>sl[i-1]&&move>atr*1.5&&vl[i]>vma*1.4;
        sell=sl[i]<sl[i-1]&&move>atr*1.5&&vl[i]>vma*1.4;

      } else if(stratId==='MOMENTUM_PRO'){
        const r=rsi[i];
        const em9=_ema(sl,9),em21=_ema(sl,21);
        const emaOk=em9[i]&&em21[i]&&em9[i]>em21[i];
        buy=r>55&&r<75&&sl[i]>sl[i-1]&&vl[i]>vma*1.1&&emaOk;
        sell=r<45||(r>80&&sl[i]<sl[i-1]);

      } else if(stratId==='SUPERTREND'){
        if(stTrend){
          buy=stTrend[i]===1&&stTrend[i-1]===-1;
          sell=stTrend[i]===-1&&stTrend[i-1]===1;
        }

      } else if(stratId==='MACD_STR'){
        if(macdData){
          const h1=macdData.hist[i],h0=macdData.hist[i-1];
          buy=h1!=null&&h0!=null&&h1>0&&h0<=0;
          sell=h1!=null&&h0!=null&&h1<0&&h0>=0;
        }

      } else if(stratId==='MA_CROSS'){
        if(ma20[i]&&ma50[i]&&ma20[i-1]&&ma50[i-1]){
          buy=ma20[i]>ma50[i]&&ma20[i-1]<=ma50[i-1];
          sell=ma20[i]<ma50[i]&&ma20[i-1]>=ma50[i-1];
        }

      } else if(stratId==='PSAR_STR'){
        if(psarTrend){
          buy=psarTrend[i]===1&&psarTrend[i-1]===-1;
          sell=psarTrend[i]===-1&&psarTrend[i-1]===1;
        }

      } else if(stratId==='PRICE_CHANNEL'){
        const hi20=Math.max(...hl.slice(Math.max(0,i-20),i));
        const lo20=Math.min(...ll.slice(Math.max(0,i-20),i));
        buy=sl[i]>hi20&&sl[i-1]<=hi20;
        sell=sl[i]<lo20&&sl[i-1]>=lo20;

      } else if(stratId==='PIVOT_REV'){
        // Swing high/low reversal
        const isSwingHi=hl[i-1]>=Math.max(hl[i-2],hl[i-3],hl[i],hl[i+1]||0);
        const isSwingLo=ll[i-1]<=Math.min(ll[i-2],ll[i-3],ll[i],ll[i+1]||999);
        buy=isSwingLo&&rsi[i]<50;
        sell=isSwingHi&&rsi[i]>50;

      } else if(stratId==='ROB_ADX'){
        // ADX>20 + DMI crossover
        const a=atrArr[i]||0.01;
        const a1=atrArr[i-1]||0.01;
        const upMove=hl[i]-hl[i-1], downMove=ll[i-1]-ll[i];
        const pdm=upMove>downMove&&upMove>0?upMove:0;
        const ndm=downMove>upMove&&downMove>0?downMove:0;
        const pdi=pdm/(a||1)*100, ndi=ndm/(a||1)*100;
        const pdi1=(hl[i-1]-hl[i-2]>ll[i-2]-ll[i-1]&&hl[i-1]-hl[i-2]>0?hl[i-1]-hl[i-2]:0)/(a1||1)*100;
        const ndi1=(ll[i-2]-ll[i-1]>hl[i-1]-hl[i-2]&&ll[i-2]-ll[i-1]>0?ll[i-2]-ll[i-1]:0)/(a1||1)*100;
        buy=pdi>ndi&&pdi1<=ndi1;
        sell=pdi<ndi&&pdi1>=ndi1;

      } else {
        // Default: momentum
        buy=rsi[i]<35&&sl[i]>sl[i-1];
        sell=rsi[i]>65&&sl[i]<sl[i-1];
      }

      // ATR-based stop: 2x ATR stop loss
      if(buy&&!pos){pos={entry:sl[i],hi:sl[i],stop:sl[i]-atr*2,idx:i};}
      else if(pos){
        // Update trailing stop
        if(sl[i]>pos.hi){pos.hi=sl[i];pos.stop=Math.max(pos.stop,pos.hi-atr*2);}
        if(sell||sl[i]<=pos.stop){
          const pnl=(sl[i]-pos.entry)/pos.entry*100-0.2; // 0.2% commission
          trades.push({pnl,win:pnl>0,entry:pos.entry,exit:sl[i],bars:i-pos.idx});
          pos=null;
        }
      }
    }
    if(pos){const pnl=(sl[L-1]-pos.entry)/pos.entry*100-0.2;trades.push({pnl,win:pnl>0,entry:pos.entry,exit:sl[L-1],bars:L-1-pos.idx});}
    return trades;
  };


  // Walk-forward
  const allOOSTrades=[];let wfConsistency=0;
  periods.forEach(per=>{
    const isTrades=_evalPeriod(per.is[0],per.is[1]);
    const oosTrades=_evalPeriod(per.oos[0],per.oos[1]);
    allOOSTrades.push(...oosTrades);
    const isWR=isTrades.length?isTrades.filter(t=>t.win).length/isTrades.length:0;
    const oosWR=oosTrades.length?oosTrades.filter(t=>t.win).length/oosTrades.length:0;
    if(Math.abs(isWR-oosWR)<0.18)wfConsistency++;
  });
  const wfScore=Math.round((wfConsistency/periods.length)*100);

  const trades=allOOSTrades.length;
  const wins=allOOSTrades.filter(t=>t.win).length;
  const winRate=trades?Math.round(wins/trades*100):0;
  const totalPnl=allOOSTrades.reduce((s,t)=>s+t.pnl,0);
  const avgPnl=trades?totalPnl/trades:0;
  let peak=100,equity=100,maxDD=0;
  allOOSTrades.forEach(t=>{equity+=t.pnl;if(equity>peak)peak=equity;const dd=peak-equity;if(dd>maxDD)maxDD=dd;});
  return{trades,winRate,avgPnl:+avgPnl.toFixed(2),totalPnl:+totalPnl.toFixed(2),wfScore,maxDrawdown:+maxDD.toFixed(2)};
}

function buildStratList(){
  const el=document.getElementById('strat-list');
  if(!el)return;
  el.innerHTML='';

  STRATEGIES.forEach(s=>{
    const isActive=activeStrategy===s.id;
    const card=document.createElement('div');
    card.style.cssText=`background:${isActive?s.color+'18':'rgba(14,22,40,0.9)'};border:1.5px solid ${isActive?s.color:'rgba(255,255,255,0.07)'};border-radius:16px;padding:16px;margin-bottom:12px;cursor:pointer;transition:border-color 0.2s`;

    // Accuracy gauge arc
    const arc=s.accuracy;
    const gaugeHTML=`<svg width="54" height="54" viewBox="0 0 54 54">
      <circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="5"/>
      <circle cx="27" cy="27" r="22" fill="none" stroke="${s.color}" stroke-width="5"
        stroke-dasharray="${(arc/100)*138.2} 138.2" stroke-dashoffset="34.6" stroke-linecap="round"/>
      <text x="27" y="31" text-anchor="middle" fill="${s.color}" font-size="11" font-weight="900" font-family="monospace">${arc}%</text>
    </svg>`;

    // Tags
    const tagsHTML=s.tags.map(t=>`<span style="background:rgba(255,255,255,0.06);border-radius:6px;padding:2px 7px;font-size:9px;color:#6080a0;font-family:Cairo,sans-serif">${t}</span>`).join('');

    // Risk badge
    const riskClr=s.risk==='منخفض جداً'?'#22c55e':s.risk==='منخفض'?'#34d399':s.risk==='متوسط'?'#f59e0b':'#ef4444';

    card.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <span style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:${s.color};flex-shrink:0">${STRAT_ICON_MAP[s.id]||'<span style=&quot;font-size:18px&quot;>'+s.icon+'</span>'}</span>
          <div>
            <div style="font-size:14px;font-weight:900;color:#f0f2f8;font-family:Cairo,sans-serif">${s.l}</div>
            <div style="font-size:9px;color:${riskClr};font-family:Cairo,sans-serif;margin-top:1px">خطورة ${s.risk} · ${s.market}</div>
          </div>
        </div>
        <div style="font-size:10px;color:#6080a0;font-family:Cairo,sans-serif;line-height:1.5;margin-bottom:8px">${s.desc}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">${tagsHTML}</div>
      </div>
      <div style="flex-shrink:0;margin-right:10px">${gaugeHTML}</div>
    </div>

    <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px;margin-bottom:10px">
      <div style="font-size:9px;color:#4a6080;font-family:Cairo,sans-serif;margin-bottom:4px">كيف تعمل؟</div>
      <div style="font-size:10px;color:#8090b0;font-family:Cairo,sans-serif;line-height:1.5">${s.howWorks}</div>
    </div>
    <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:10px;margin-bottom:12px">
      <div style="font-size:9px;color:#4a6080;font-family:Cairo,sans-serif;margin-bottom:4px">كيف تقرأها على الشارت؟</div>
      <div style="font-size:10px;color:#8090b0;font-family:Cairo,sans-serif;line-height:1.5">${s.howRead}</div>
    </div>

    <div style="display:flex;gap:8px">
      <button data-bt="${s.id}" style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#7090b0;font-size:11px;font-family:Cairo,sans-serif;padding:8px;cursor:pointer">اختبر</button>
      <button data-act="${s.id}" style="flex:2;background:${isActive?s.color+'30':'rgba(255,255,255,0.05)'};border:1.5px solid ${isActive?s.color:'rgba(255,255,255,0.12)'};border-radius:10px;color:${isActive?s.color:'#c0d0e8'};font-size:12px;font-weight:700;font-family:Cairo,sans-serif;padding:9px;cursor:pointer">
        ${isActive?'✓ مفعّلة -- إلغاء':'تفعيل الاستراتيجية'}
      </button>
    </div>
    <div id="bt-${s.id}" style="display:none;background:rgba(0,0,0,0.3);border-radius:10px;padding:10px;margin-top:10px">
      <div id="bt-data-${s.id}" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-around;text-align:center"></div>
    </div>`;

    // Backtest button
    card.querySelector(`[data-bt="${s.id}"]`).addEventListener('click',function(e){
      e.stopPropagation();
      const sid=this.dataset.bt;
      const result=runBacktest(sid);
      const panel=document.getElementById('bt-'+sid);
      const dataEl=document.getElementById('bt-data-'+sid);
      if(panel&&dataEl){
        panel.style.display='block';
        const wc=result.winRate>=60?'#22c55e':result.winRate>=45?'#f59e0b':'#ef4444';
        const tc=parseFloat(result.totalPnl)>=0?'#22c55e':'#ef4444';
        if(result.trades===0){
          dataEl.innerHTML=`<div style="grid-column:1/-1;text-align:center;color:#3b9eff;font-size:9px;font-family:Cairo,sans-serif;margin-bottom:4px">${state.per} · ${state.stk.name}</div><div style="grid-column:1/-1;text-align:center;color:#4a6080;font-size:11px;font-family:Cairo,sans-serif;padding:8px">لا توجد صفقات كافية في الفترة المختارة<br><span style="font-size:9px;color:#3a4060">جرب فترة زمنية أطول أو إطار زمني مختلف</span></div>`;
        } else {
          dataEl.innerHTML=`
          <div style="grid-column:1/-1;text-align:center;font-size:9px;color:#3b9eff;font-family:Cairo,sans-serif;margin-bottom:4px">${state.per} · ${state.stk.name} · ${result.trades} صفقة</div>
          <div><div style="font-size:18px;font-weight:900;color:${wc}">${result.winRate}%</div><div style="font-size:8px;color:#4a6080;font-family:Cairo,sans-serif">نسبة الفوز</div></div>
          <div><div style="font-size:18px;font-weight:900;color:${tc}">${result.totalPnl}%</div><div style="font-size:8px;color:#4a6080;font-family:Cairo,sans-serif">إجمالي الربح</div></div>
          <div><div style="font-size:18px;font-weight:900;color:#94a3b8">${result.trades}</div><div style="font-size:8px;color:#4a6080;font-family:Cairo,sans-serif">صفقة</div></div>
          <div><div style="font-size:18px;font-weight:900;color:${result.wfScore>=70?'#22c55e':'#f59e0b'}">${result.wfScore}%</div><div style="font-size:8px;color:#4a6080;font-family:Cairo,sans-serif">WF</div></div>
          <div><div style="font-size:18px;font-weight:900;color:#ef4444">${result.maxDrawdown}%</div><div style="font-size:8px;color:#4a6080;font-family:Cairo,sans-serif">Max DD</div></div>`;
        }
        this.textContent='إخفاء';
      } else if(panel&&panel.style.display==='block'){
        panel.style.display='none';this.textContent='اختبر';
      } else {
        this.textContent='بيانات غير كافية';setTimeout(()=>this.textContent='اختبر',2000);
      }
    });

    // Activate button
    card.querySelector(`[data-act="${s.id}"]`).addEventListener('click',function(e){
      e.stopPropagation();
      const sid=this.dataset.act;
      activeStrategy=activeStrategy===sid?null:sid;
      const sb=document.getElementById('btn-strat');
      if(sb)sb.classList.toggle('active',!!activeStrategy);
      buildStratList();closeSheet();sizeChart();invalidateChart();render();
    });

    el.appendChild(card);
  });
}

