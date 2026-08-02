// AI
// 
function clearAIDrawings(){
  state.drawings = state.drawings.filter(d => !d._ai);
  saveDrawings();
  _updateUndoButtons();
  render();
  // إخفاء الزرّ بعد المسح
  const _cb=document.getElementById('btn-ai-clear');
  if(_cb)_cb.style.display='none';
  // إغلاق الـ modal
  const aip = document.getElementById('aip');
  if(aip) aip.classList.remove('show');
  // Toast تأكيد
  const toast=document.getElementById('toast');
  if(toast){
    toast.textContent='تم مسح رسومات AI من الشارت';
    toast.style.opacity='1';
    setTimeout(()=>toast.style.opacity='0',2500);
  }
}
// إظهار/إخفاء زرّ المسح حسب وجود رسومات AI
function _updateAIClearBtn(){
  const _cb=document.getElementById('btn-ai-clear');
  if(!_cb)return;
  const _cnt=state.drawings.filter(d=>d._ai).length;
  if(_cnt>0){
    _cb.style.display='flex';
    const _lbl=document.getElementById('ai-clear-label');
    if(_lbl)_lbl.textContent='مسح رسومات AI ('+_cnt+')';
  } else {
    _cb.style.display='none';
  }
}

function showAI(){
  const s=state.stk;
  document.getElementById('ai-title').textContent='التحليل الفني الشامل -- '+s.name;
  document.getElementById('ai-sub').textContent=s.sym+' · '+state.per;
  const body=document.getElementById('ai-body');
  body.innerHTML='<div style="height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px"><div class="spin"></div><span style="color:#7a8298;font-size:13px;font-family:Cairo,sans-serif">جارٍ تحليل الشارت بعمق...</span></div>';
  document.getElementById('ai-foot').style.display='none';
  document.getElementById('aip').classList.add('show');
  _updateAIClearBtn();


  setTimeout(()=>{
    // === COMPUTE REAL INDICATORS FROM CHART DATA ===
    const all=state.allCandles;
    const n=all.length;
    if(n<30){body.innerHTML='<p style="color:#7a8298;text-align:center;padding:30px">بيانات غير كافية</p>';return;}

    const closes=all.map(d=>d.c);
    const highs=all.map(d=>d.hi);
    const lows=all.map(d=>d.lo);
    const vols=all.map(d=>d.v);
    const price=closes[n-1];

    // SMA
    const _sma=(arr,p)=>{
      const r=[];
      for(let i=0;i<arr.length;i++){
        if(i<p-1){r.push(null);continue;}
        r.push(arr.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p);
      }
      return r;
    };
    // EMA
    const _ema=(arr,p)=>{
      const k=2/(p+1);const r=[];let prev=null;
      for(let i=0;i<arr.length;i++){
        if(arr[i]==null){r.push(null);continue;}
        prev=prev==null?arr[i]:arr[i]*k+prev*(1-k);r.push(prev);
      }
      return r;
    };
    // RSI
    const _rsi=(arr,p=14)=>{
      let g=0,l=0;
      for(let i=1;i<=p;i++){const d=arr[i]-arr[i-1];d>0?g+=d:l-=d;}
      let ag=g/p,al=l/p;
      const r=new Array(p).fill(null);
      for(let i=p;i<arr.length;i++){
        const d=arr[i]-arr[i-1];
        ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;
        r.push(al===0?100:100-100/(1+ag/al));
      }
      return r;
    };
    // MACD
    const _macd=(arr)=>{
      const e12=_ema(arr,12),e26=_ema(arr,26);
      const ml=e12.map((v,i)=>v&&e26[i]?v-e26[i]:null);
      const sig=_ema(ml,9);
      return{line:ml,signal:sig,hist:ml.map((v,i)=>v&&sig[i]?v-sig[i]:null)};
    };
    // ATR
    const _atr=(p=14)=>{
      const tr=all.map((d,i)=>i===0?d.hi-d.lo:Math.max(d.hi-d.lo,Math.abs(d.hi-all[i-1].c),Math.abs(d.lo-all[i-1].c)));
      return _sma(tr,p);
    };
    // Pivot levels from full visible range
    const pH=Math.max(...highs.slice(-30));
    const pL=Math.min(...lows.slice(-30));
    const pC=closes[n-2]||price;
    const P=(pH+pL+pC)/3;
    const R1=2*P-pL,R2=P+(pH-pL),R3=R1+(pH-pL);
    const S1=2*P-pH,S2=P-(pH-pL),S3=S1-(pH-pL);

    // Current values
    const ma20=_sma(closes,20),ma50=_sma(closes,50),ma200=_sma(closes,200);
    const ema9=_ema(closes,9),ema20=_ema(closes,20);
    const rsi14=_rsi(closes,14);
    const mc=_macd(closes);
    const _atrAI=_atr(14);
    const cur_ma20=ma20[n-1],cur_ma50=ma50[n-1],cur_ma200=ma200[n-1];
    // تصدير قيم المؤشرات للقطة
    try {
      const _rsiArr=rsi14||[];
      window._lastRSI = _rsiArr.length ? Math.round(_rsiArr[_rsiArr.length-1]) : null;
      window._lastMACDSig = mc && mc.hist && mc.hist.length ? (mc.hist[mc.hist.length-1] >= 0 ? 'صعودي' : 'هبوطي') : null;
    } catch(ex) {}
    const cur_ema9=ema9[n-1],cur_rsi=rsi14[n-1],cur_atr=_atrAI[n-1];

    const cur_macd=mc.hist[n-1];

    // BB
    const bb_mid=cur_ma20||closes.slice(n-20).reduce((a,b)=>a+b,0)/20; 
    const stdArr=closes.slice(n-20).map(v=>(v-bb_mid)**2);
        const std=Math.sqrt(stdArr.reduce((a,b)=>a+b,0)/20);
    const bb_up=bb_mid+2*std,bb_dn=bb_mid-2*std;
    const bb_pct=bb_mid?(price-bb_dn)/(bb_up-bb_dn)*100:50;

    // Trend
    const above20=cur_ma20&&price>cur_ma20;
    const     above50=cur_ma50&&price>cur_ma50;
    const above200=cur_ma200&&price>cur_ma200;
    const trendScore=(above20?1:0)+(above50?1:0)+(above200?1:0);
    const trend=trendScore>=2?'صاعد':'هابط';
    const trendClr=trendScore>=2?'#22c55e':'#ef4444';

    // Momentum signals
    const rsiSignal=cur_rsi>70?'ذروة شراء':cur_rsi<30?'ذروة بيع':cur_rsi>55?'زخم إيجابي':'محايد';
    const macdSignal=cur_macd>0?'إيجابي':'سلبي';

    // Elliott Wave analysis (simplified but accurate)
    // ── Elliott Wave Analysis (Neely/Prechter Method) ──────────────
    const _ewZigzag=(h,l,minSwing)=>{
      const pts=[];let dir=0,lastV=null;
      for(let i=2;i<h.length-2;i++){
        const isH=h[i]>h[i-1]&&h[i]>h[i-2]&&h[i]>h[i+1]&&h[i]>h[i+2];
        const isL=l[i]<l[i-1]&&l[i]<l[i-2]&&l[i]<l[i+1]&&l[i]<l[i+2];
        if(isH&&dir!==1&&(lastV==null||Math.abs(h[i]-lastV)>=minSwing)){
          if(dir===1&&pts.length)pts.pop();pts.push({i,v:h[i],t:'H'});dir=1;lastV=h[i];
        }else if(isL&&dir!==-1&&(lastV==null||Math.abs(l[i]-lastV)>=minSwing)){
          if(dir===-1&&pts.length)pts.pop();pts.push({i,v:l[i],t:'L'});dir=-1;lastV=l[i];
        }
      }
      return pts;
    };
    const ewLen=Math.min(60,n-1);
    const ewH=highs.slice(-ewLen),ewL=lows.slice(-ewLen);
    const _ewAtrArr=all.map((d,i)=>i<13?null:all.slice(i-13,i+1).reduce((s,dd,j,arr)=>s+(j===0?dd.hi-dd.lo:Math.max(dd.hi-dd.lo,Math.abs(dd.hi-arr[j-1].c),Math.abs(dd.lo-arr[j-1].c))),0)/14);const ewAtr=_ewAtrArr[n-1]||price*0.015;
    const ewPts=_ewZigzag(ewH,ewL,ewAtr*1.2);
    // Identify 5-wave impulse or 3-wave correction
    let elliottWave='',elliottDesc='',elliottClr='#f59e0b',elliottSubWaves='';
    let recentHi=Math.max(...ewH),recentLo=Math.min(...ewL);
    const wavePct=(price-recentLo)/(recentHi-recentLo||1)*100;
    // Check 5-wave impulse: L-H-L-H-L-H (trough,peak alternating, 5 pivots min)
    const pks5=ewPts.filter(p=>p.t==='H');const trs5=ewPts.filter(p=>p.t==='L');
    let waveNum=0,waveStruct='';
    if(ewPts.length>=5){
      // Check if current price is in impulse or corrective
      const lastPk=pks5[pks5.length-1],lastTr=trs5[trs5.length-1];
      const inUpImpulse=lastTr&&lastPk&&lastTr.i<lastPk.i&&pks5.length>=2&&trs5.length>=2;
      const w3isLongest=pks5.length>=3&&(pks5[pks5.length-1].v-trs5[trs5.length-1].v)>=(pks5[pks5.length-2].v-(trs5[trs5.length-2]?.v||0));
      if(inUpImpulse&&w3isLongest){
        // Impulse wave -- determine which wave we're in
        if(wavePct<18){waveNum=1;elliottWave='موجة (1)';elliottDesc='بداية الدفعة الأولى -- مرحلة تراكم';elliottClr='#3b9eff';elliottSubWaves='الداخلية: 5 موجات صاعدة صغيرة';}
        else if(wavePct<32){waveNum=2;elliottWave='موجة (2)';elliottDesc='تصحيح الدفعة الأولى -- 38.2% أو 61.8%';elliottClr='#f59e0b';elliottSubWaves='الداخلية: ABC تصحيحية';}
        else if(wavePct<62){waveNum=3;elliottWave='موجة (3)';elliottDesc='أقوى وأطول موجة -- لا تقل عن 161.8% من الموجة 1';elliottClr='#22c55e';elliottSubWaves='الداخلية: 5 موجات دافعة -- زخم قوي';}
        else if(wavePct<78){waveNum=4;elliottWave='موجة (4)';elliottDesc='تصحيح مثلثي أو مسطح -- لا تتداخل مع قمة موجة 1';elliottClr='#f59e0b';elliottSubWaves='الداخلية: ABCDE أو ABC مسطح';}
        else{waveNum=5;elliottWave='موجة (5)';elliottDesc='الموجة الختامية -- ضعف في الزخم وتباعد في RSI';elliottClr='#ef4444';elliottSubWaves='الداخلية: 5 موجات صاعدة مع تباعد';}
        waveStruct='دفعة (Impulse) '+ewPts.length+' محاور';
      } else {
        // Corrective ABC
        const abcPct=wavePct;
        if(abcPct<35){waveNum=0;elliottWave='موجة A';elliottDesc='بداية التصحيح -- عادةً 3 موجات هابطة';elliottClr='#ef4444';elliottSubWaves='الداخلية: 5 موجات هابطة';}
        else if(abcPct<65){waveNum=0;elliottWave='موجة B';elliottDesc='ارتداد تصحيحي -- قد يُقفل 61.8% من A';elliottClr='#f59e0b';elliottSubWaves='الداخلية: 3 موجات ABC';}
        else{waveNum=0;elliottWave='موجة C';elliottDesc='إكمال التصحيح -- مساوية لـ A أو 161.8%';elliottClr='#3b9eff';elliottSubWaves='الداخلية: 5 موجات هابطة';}
        waveStruct='تصحيح (Corrective) ABC';
      }
    } else {
      // Not enough pivots
      if(wavePct<30){elliottWave='مرحلة تراكم';elliottDesc='بيانات غير كافية لتحديد الموجة بدقة';elliottClr='#4a6080';}
      else if(wavePct<70){elliottWave='منتصف النطاق';elliottDesc='يحتاج مزيداً من البيانات';elliottClr='#f59e0b';}
      else{elliottWave='قرب القمة';elliottDesc='مراقبة أنماط الانعكاس';elliottClr='#ef4444';}
      waveStruct='';elliottSubWaves='';
    }
    // Fibonacci projections based on wave
    const w1Size=ewPts.length>=2?(ewPts[1]?.v-ewPts[0]?.v):0;
    const w3Target=waveNum>=3?recentLo+w1Size*1.618:null;
    const w5Target=waveNum>=5?recentHi+w1Size*0.618:null;

    // ═══ CHART PATTERN DETECTION (Standard technical analysis rules) ═══
    const _findPeaks=(arr,win=5)=>{const peaks=[],troughs=[];for(let i=win;i<arr.length-win;i++){const sl=arr.slice(i-win,i),sr=arr.slice(i+1,i+win+1);if(arr[i]>Math.max(...sl,0)&&arr[i]>Math.max(...sr,0))peaks.push({i,v:arr[i]});if(arr[i]<Math.min(...sl,Infinity)&&arr[i]<Math.min(...sr,Infinity))troughs.push({i,v:arr[i]});}return{peaks,troughs};};
    const pw=_findPeaks(highs,4),pt=_findPeaks(lows,4);
    const recentPks=pw.peaks.slice(-6),recentTrs=pt.troughs.slice(-6);
    const tol=cur_atr*0.5||price*0.015; // tolerance = 0.5 ATR

    let detectedPatterns=[];

    // 1. HEAD AND SHOULDERS (bearish reversal)
    // 3 peaks: left shoulder < head > right shoulder, neckline connects troughs between
    if(recentPks.length>=3){
      const [ls,hd,rs]=recentPks.slice(-3);
      if(hd.v>ls.v*1.01&&hd.v>rs.v*1.01&&Math.abs(ls.v-rs.v)<tol*2){
        const neckL=Math.min(...lows.slice(ls.i,hd.i+1));
        const neckR=Math.min(...lows.slice(hd.i,rs.i+1));
        const neckDiff=Math.abs(neckL-neckR);
        const neckline=(neckL+neckR)/2;
        const pct=Math.min(95,70+(hd.v-Math.max(ls.v,rs.v))/tol*5);
        if(neckDiff<tol*2&&price<=neckline*1.02){
          detectedPatterns.push({name:'رأس وكتفين',dir:'هابط',pct:Math.round(pct),clr:'#ef4444',
            desc:`الرأس عند ${hd.v.toFixed(2)} · الخط العاتق ${neckline.toFixed(2)}`});
        }
      }
    }

    // 2. INVERSE HEAD AND SHOULDERS (bullish reversal)
    if(recentTrs.length>=3){
      const [ls,hd,rs]=recentTrs.slice(-3);
      if(hd.v<ls.v*0.99&&hd.v<rs.v*0.99&&Math.abs(ls.v-rs.v)<tol*2){
        const neckL=Math.max(...highs.slice(ls.i,hd.i+1));
        const neckR=Math.max(...highs.slice(hd.i,rs.i+1));
        const neckline=(neckL+neckR)/2;
        const pct=Math.min(95,70+(Math.min(ls.v,rs.v)-hd.v)/tol*5);
        if(Math.abs(neckL-neckR)<tol*2&&price>=neckline*0.98){
          detectedPatterns.push({name:'رأس وكتفين مقلوب',dir:'صاعد',pct:Math.round(pct),clr:'#22c55e',
            desc:`القاع عند ${hd.v.toFixed(2)} · الخط العاتق ${neckline.toFixed(2)}`});
        }
      }
    }

    // 3. DOUBLE TOP (bearish)
    if(recentPks.length>=2){
      const [p1,p2]=recentPks.slice(-2);
      if(Math.abs(p1.v-p2.v)<tol&&p2.i-p1.i>=5){
        const valley=Math.min(...lows.slice(p1.i,p2.i+1));
        const pct=75+(Math.min(p1.v,p2.v)-valley)/tol*3;
        if(price<=valley*1.01){
          detectedPatterns.push({name:'قمة مزدوجة (M)',dir:'هابط',pct:Math.min(92,Math.round(pct)),clr:'#ef4444',
            desc:`قمتان عند ≈${((p1.v+p2.v)/2).toFixed(2)} · الدعم ${valley.toFixed(2)}`});
        }
      }
    }

    // 4. DOUBLE BOTTOM (bullish)
    if(recentTrs.length>=2){
      const [t1,t2]=recentTrs.slice(-2);
      if(Math.abs(t1.v-t2.v)<tol&&t2.i-t1.i>=5){
        const peak=Math.max(...highs.slice(t1.i,t2.i+1));
        const pct=75+(peak-Math.max(t1.v,t2.v))/tol*3;
        if(price>=peak*0.99){
          detectedPatterns.push({name:'قاع مزدوج (W)',dir:'صاعد',pct:Math.min(92,Math.round(pct)),clr:'#22c55e',
            desc:`قاعان عند ≈${((t1.v+t2.v)/2).toFixed(2)} · المقاومة ${peak.toFixed(2)}`});
        }
      }
    }

    // 5. CUP AND HANDLE (bullish)
    if(n>=30&&recentTrs.length>=1){
      const rimL=Math.max(...highs.slice(n-30,n-20));
      const cup=Math.min(...lows.slice(n-25,n-5));
      const rimR=Math.max(...highs.slice(n-8,n));
      const handleLow=Math.min(...lows.slice(n-8,n));
      const cupDepth=(Math.min(rimL,rimR)-cup)/Math.min(rimL,rimR);
      if(Math.abs(rimL-rimR)<tol*3&&cupDepth>0.1&&cupDepth<0.5&&handleLow>cup&&handleLow<Math.min(rimL,rimR)){
        detectedPatterns.push({name:'كوب وعروة',dir:'صاعد',pct:82,clr:'#22c55e',
          desc:`الحافة ${rimR.toFixed(2)} · عمق الكوب ${(cupDepth*100).toFixed(0)}%`});
      }
    }

    // 6. ASCENDING TRIANGLE (bullish)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const [ph1,ph2]=recentPks.slice(-2);
      const [tl1,tl2]=recentTrs.slice(-2);
      const flatTop=Math.abs(ph1.v-ph2.v)<tol;
      const risingBottom=tl2.v>tl1.v+tol*0.3;
      if(flatTop&&risingBottom){
        detectedPatterns.push({name:'مثلث صاعد',dir:'صاعد',pct:78,clr:'#22c55e',
          desc:`مقاومة أفقية ${ph2.v.toFixed(2)} · قواع صاعدة`});
      }
    }

    // 7. DESCENDING TRIANGLE (bearish)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const [ph1,ph2]=recentPks.slice(-2);
      const [tl1,tl2]=recentTrs.slice(-2);
      const flatBottom=Math.abs(tl1.v-tl2.v)<tol;
      const fallingTop=ph2.v<ph1.v-tol*0.3;
      if(flatBottom&&fallingTop){
        detectedPatterns.push({name:'مثلث هابط',dir:'هابط',pct:76,clr:'#ef4444',
          desc:`دعم أفقي ${tl2.v.toFixed(2)} · قمم هابطة`});
      }
    }

    // 8. SYMMETRICAL TRIANGLE (neutral/breakout)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const [ph1,ph2]=recentPks.slice(-2);
      const [tl1,tl2]=recentTrs.slice(-2);
      const fallingTop=ph2.v<ph1.v-tol*0.3;
      const risingBottom=tl2.v>tl1.v+tol*0.3;
      if(fallingTop&&risingBottom){
        detectedPatterns.push({name:'مثلث متماثل',dir:'اختراق',pct:70,clr:'#f59e0b',
          desc:`تقارب نحو ${((ph2.v+tl2.v)/2).toFixed(2)}`});
      }
    }

    // 9. RISING WEDGE (bearish)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const [ph1,ph2]=recentPks.slice(-2);
      const [tl1,tl2]=recentTrs.slice(-2);
      const topRise=(ph2.v-ph1.v)/(ph2.i-ph1.i)||0;
      const botRise=(tl2.v-tl1.v)/(tl2.i-tl1.i)||0;
      if(topRise>0&&botRise>0&&botRise>topRise*1.3){
        detectedPatterns.push({name:'إسفين صاعد',dir:'هابط',pct:74,clr:'#ef4444',
          desc:'الارتفاع يضيق -- ضغط بيع محتمل'});
      }
    }

    // 10. FALLING WEDGE (bullish)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const [ph1,ph2]=recentPks.slice(-2);
      const [tl1,tl2]=recentTrs.slice(-2);
      const topFall=(ph2.v-ph1.v)/(ph2.i-ph1.i)||0;
      const botFall=(tl2.v-tl1.v)/(tl2.i-tl1.i)||0;
      if(topFall<0&&botFall<0&&botFall<topFall*1.3){
        detectedPatterns.push({name:'إسفين هابط',dir:'صاعد',pct:74,clr:'#22c55e',
          desc:'الهبوط يضيق -- اختراق صاعد محتمل'});
      }
    }

    // 11. FLAG / PENNANT (continuation)
    if(n>=10){
      const flagPole=Math.abs(closes[n-10]-closes[n-5]);
      const flagRange=Math.max(...highs.slice(n-5))-Math.min(...lows.slice(n-5));
      const isPole=flagPole>cur_atr*2.5;
      const isFlag=flagRange<flagPole*0.35;
      if(isPole&&isFlag){
        const bullish=closes[n-5]>closes[n-10];
        detectedPatterns.push({name:bullish?'راية صاعدة':'راية هابطة',dir:bullish?'صاعد':'هابط',pct:80,
          clr:bullish?'#22c55e':'#ef4444',desc:`عمود الراية ${flagPole.toFixed(2)} · تماسك ${flagRange.toFixed(2)}`});
      }
    }

    // 12. TRIPLE TOP (bearish)
    if(recentPks.length>=3){
      const [p1,p2,p3]=recentPks.slice(-3);
      if(Math.abs(p1.v-p2.v)<tol*1.5&&Math.abs(p2.v-p3.v)<tol*1.5&&Math.abs(p1.v-p3.v)<tol*1.5){
        const support=Math.min(...lows.slice(p1.i,p3.i+1));
        if(price<=support*1.015)
          detectedPatterns.push({name:'قمة ثلاثية',dir:'هابط',pct:85,clr:'#ef4444',
            desc:`3 قمم عند ≈${p2.v.toFixed(2)} · كسر الدعم ${support.toFixed(2)}`});
      }
    }

    // 13. TRIPLE BOTTOM (bullish)
    if(recentTrs.length>=3){
      const [t1,t2,t3]=recentTrs.slice(-3);
      if(Math.abs(t1.v-t2.v)<tol*1.5&&Math.abs(t2.v-t3.v)<tol*1.5&&Math.abs(t1.v-t3.v)<tol*1.5){
        const resistance=Math.max(...highs.slice(t1.i,t3.i+1));
        if(price>=resistance*0.985)
          detectedPatterns.push({name:'قاع ثلاثي',dir:'صاعد',pct:85,clr:'#22c55e',
            desc:`3 قيعان عند ≈${t2.v.toFixed(2)} · كسر المقاومة ${resistance.toFixed(2)}`});
      }
    }

    // 14. ROUNDING BOTTOM / SAUCER (bullish)
    if(n>=20){
      const seg=closes.slice(n-20);
      const midIdx=Math.floor(seg.length/2);
      const leftAvg=seg.slice(0,5).reduce((s,v)=>s+v,0)/5;
      const midAvg=seg.slice(midIdx-2,midIdx+3).reduce((s,v)=>s+v,0)/5;
      const rightAvg=seg.slice(-5).reduce((s,v)=>s+v,0)/5;
      if(leftAvg>midAvg+cur_atr*0.5&&rightAvg>midAvg+cur_atr*0.5&&rightAvg>leftAvg*0.98)
        detectedPatterns.push({name:'قاع مستدير (طبق)',dir:'صاعد',pct:76,clr:'#22c55e',
          desc:`قاع تدريجي · الحد ${midAvg.toFixed(2)}`});
    }

    // 15. ROUNDING TOP (bearish)
    if(n>=20){
      const seg=closes.slice(n-20);
      const midIdx=Math.floor(seg.length/2);
      const leftAvg=seg.slice(0,5).reduce((s,v)=>s+v,0)/5;
      const midAvg=seg.slice(midIdx-2,midIdx+3).reduce((s,v)=>s+v,0)/5;
      const rightAvg=seg.slice(-5).reduce((s,v)=>s+v,0)/5;
      if(leftAvg<midAvg-cur_atr*0.5&&rightAvg<midAvg-cur_atr*0.5&&rightAvg<leftAvg*1.02)
        detectedPatterns.push({name:'قمة مستديرة',dir:'هابط',pct:74,clr:'#ef4444',
          desc:`قمة تدريجية · الذروة ${midAvg.toFixed(2)}`});
    }

    // 16. RECTANGLE / CHANNEL (continuation or breakout)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const topLine=recentPks.slice(-2).reduce((s,p)=>s+p.v,0)/2;
      const botLine=recentTrs.slice(-2).reduce((s,t)=>s+t.v,0)/2;
      const topFlat=Math.abs(recentPks.slice(-2)[0].v-recentPks.slice(-2)[1].v)<tol*1.5;
      const botFlat=Math.abs(recentTrs.slice(-2)[0].v-recentTrs.slice(-2)[1].v)<tol*1.5;
      if(topFlat&&botFlat&&(topLine-botLine)>cur_atr*1.5){
        const nearTop=price>topLine-tol;
        const nearBot=price<botLine+tol;
        detectedPatterns.push({name:'مستطيل (قناة أفقية)',dir:nearTop?'كسر صاعد محتمل':nearBot?'كسر هابط محتمل':'داخل القناة',
          pct:68,clr:'#3b9eff',
          desc:`أعلى ${topLine.toFixed(2)} · أدنى ${botLine.toFixed(2)}`});
      }
    }

    // 17. BULLISH CHANNEL (ascending)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const [ph1,ph2]=recentPks.slice(-2);
      const [tl1,tl2]=recentTrs.slice(-2);
      const topSlope=(ph2.v-ph1.v)/(ph2.i-ph1.i+1);
      const botSlope=(tl2.v-tl1.v)/(tl2.i-tl1.i+1);
      if(topSlope>0&&botSlope>0&&Math.abs(topSlope-botSlope)<topSlope*0.5&&ph2.v>tl2.v)
        detectedPatterns.push({name:'قناة صاعدة',dir:'صاعد',pct:72,clr:'#22c55e',
          desc:`دعم القناة ${tl2.v.toFixed(2)} · سقف ${ph2.v.toFixed(2)}`});
    }

    // 18. BEARISH CHANNEL (descending)
    if(recentPks.length>=2&&recentTrs.length>=2){
      const [ph1,ph2]=recentPks.slice(-2);
      const [tl1,tl2]=recentTrs.slice(-2);
      const topSlope=(ph2.v-ph1.v)/(ph2.i-ph1.i+1);
      const botSlope=(tl2.v-tl1.v)/(tl2.i-tl1.i+1);
      if(topSlope<0&&botSlope<0&&Math.abs(topSlope-botSlope)<Math.abs(topSlope)*0.5)
        detectedPatterns.push({name:'قناة هابطة',dir:'هابط',pct:72,clr:'#ef4444',
          desc:`مقاومة القناة ${ph2.v.toFixed(2)} · دعم ${tl2.v.toFixed(2)}`});
    }

    // 19. DIAMOND TOP (bearish reversal - rare)
    if(recentPks.length>=3&&recentTrs.length>=2){
      const pks3=recentPks.slice(-3);
      const trs2=recentTrs.slice(-2);
      const expand=pks3[1].v>pks3[0].v&&trs2[0].v<trs2[1].v;
      const contract=pks3[2].v<pks3[1].v&&trs2[1].v>trs2[0].v;
      if(expand&&contract&&!closes.slice(-3).every((v,i,a)=>i===0||v>a[i-1]))
        detectedPatterns.push({name:'ماسة هابطة',dir:'هابط',pct:82,clr:'#ef4444',
          desc:`نموذج نادر عالي الدقة`});
    }

    // 20. BUMP AND RUN (bearish)
    if(n>=15){
      const baseline=closes.slice(n-15,n-8);
      const bump=closes.slice(n-8,n);
      const baseAngle=(baseline[baseline.length-1]-baseline[0])/baseline.length;
      const bumpAngle=(bump[bump.length-1]-bump[0])/bump.length;
      if(bumpAngle>baseAngle*2.5&&bumpAngle>cur_atr*0.5&&bump[bump.length-1]<Math.max(...bump)*0.98)
        detectedPatterns.push({name:'ارتفاع ثم هبوط',dir:'هابط',pct:70,clr:'#ef4444',
          desc:'ارتفاع حاد يعقبه ضغط'});
    }

    // Pick best pattern (highest confidence)
    detectedPatterns.sort((a,b)=>b.pct-a.pct);
    const best=detectedPatterns[0];
    const pattern=best?best.name:'لا نموذج واضح حالياً';
    const patternPct=best?best.pct:0;
    const patternClr=best?best.clr:'#4a6080';
    const patternDir=best?best.dir:'محايد';
    const patternDesc=best?best.desc:'';
    const allPatterns=detectedPatterns.slice(0,3); // top 3

    // Smart money / institutional support zones
    const volMA=_sma(vols,20);
    let instZones=[];
    for(let i=n-30;i<n-1;i++){
      if(vols[i]>volMA[i]*1.8){
        instZones.push({p:(highs[i]+lows[i])/2,v:vols[i]});
      }
    }
    instZones.sort((a,b)=>b.v-a.v);
    const topZone=instZones[0];
    const instSupport=topZone?+(topZone.p.toFixed(2)):+(S1.toFixed(2));

    // ATR-based targets
    const atrV=cur_atr||price*0.02;
    const t1=+(price+atrV*1.5).toFixed(2);
    const t2=+(price+atrV*3.0).toFixed(2);
    const t3=+(price+atrV*5.0).toFixed(2);
    const sl=+(price-atrV*1.2).toFixed(2);

    // ── ML-Style Multi-Factor Signal Strength ────────────────────
    // Weighted scoring model (inspired by XGBoost feature importance)
    const _norm=(v,mn2,mx2)=>Math.max(0,Math.min(1,(v-mn2)/(mx2-mn2||1)));
    const factors=[];
    // 1. Trend alignment (weight: 25%)
    const trendScore3=(above20?1:0)+(above50?1:0)+(above200?1:0);
    factors.push({w:25,v:trendScore3/3});
    // 2. RSI momentum (weight: 18%)
    if(cur_rsi!=null){
      const rsiScore=cur_rsi<30?0.9:cur_rsi<45?0.6:cur_rsi<60?0.75:cur_rsi<70?0.55:0.2;
      factors.push({w:18,v:rsiScore});
    }
    // 3. MACD signal (weight: 15%)
    if(cur_macd!=null){
      const macdHist=mc.hist[n-1]||0,macdPrev=mc.hist[n-2]||0;
      const macdMomentum=macdHist>0&&macdHist>macdPrev?1:macdHist>0?0.65:macdHist<0&&macdHist<macdPrev?0:0.35;
      factors.push({w:15,v:macdMomentum});
    }
    // 4. Bollinger Band position (weight: 12%)
    {const bbScore=bb_pct<15?0.85:bb_pct<35?0.7:bb_pct<65?0.5:bb_pct<85?0.35:0.15;factors.push({w:12,v:bbScore});}
    // 5. Volume confirmation (weight: 12%)
    const _avgVol2=volMA[n-1]||1;const _vRatio=vols[n-1]/_avgVol2;
    {const volScore=_norm(_vRatio,0.5,2.5);factors.push({w:12,v:volScore});}
    // 6. Price vs EMA9 (weight: 10%)
    if(cur_ema9){const ema9Score=price>cur_ema9?_norm((price-cur_ema9)/cur_ema9,0,0.03):1-_norm((cur_ema9-price)/cur_ema9,0,0.03);factors.push({w:10,v:ema9Score});}
    // 7. ATR relative (volatility) (weight: 8%)
    if(cur_atr){const atrRel=cur_atr/price;const atrScore=atrRel<0.01?0.6:atrRel<0.02?0.75:atrRel<0.035?0.5:0.3;factors.push({w:8,v:atrScore});}
    // Weighted sum
    const totalW=factors.reduce((s,f)=>s+f.w,0);
    const rawSig=factors.reduce((s,f)=>s+f.v*f.w,0)/totalW;
    // Calibrate to 0-100 with sigmoid-like stretch
    const sig=Math.min(96,Math.max(12,Math.round(rawSig*100)));
    const sigClr=sig>=68?'#22c55e':sig>=45?'#f59e0b':'#ef4444';
    const sigLabel=sig>=75?'قوي جداً':sig>=60?'إيجابي':sig>=45?'محايد':sig>=30?'ضعيف':'سلبي';

    // Volume trend
    const avgVol=volMA[n-1]||1;
    const volRatio=vols[n-1]/avgVol;
    const volStatus=volRatio>1.5?'حجم استثنائي مرتفع':volRatio>1.1?'حجم فوق المتوسط':'حجم منخفض';

    body.innerHTML=`
<div style="display:flex;flex-direction:column;gap:11px;padding-bottom:8px">

  <!-- Signal Score -->
  <div style="background:linear-gradient(135deg,rgba(14,22,40,0.9),rgba(20,30,55,0.9));border:1px solid ${sigClr}30;border-radius:14px;padding:14px;display:flex;justify-content:space-between;align-items:center">
    <div style="text-align:center">
      <div style="font-size:9px;color:#4a6080;margin-bottom:4px">قوة الإشارة</div>
      <div style="font-size:36px;font-weight:900;color:${sigClr};line-height:1">${sig}</div>
      <div style="font-size:9px;color:${sigClr};font-weight:700">${sigLabel}</div>
    </div>
    <div style="text-align:right;flex:1;padding-right:14px">
      <div style="font-size:18px;font-weight:900;color:${trendClr}">${trend} ${trendScore>=2?'↑':'↓'}</div>
      <div style="font-size:10px;color:#7a8298;margin-top:4px">
        ${cur_ma20?'MA20: '+cur_ma20.toFixed(2):''}
        ${cur_ma50?' · MA50: '+cur_ma50.toFixed(2):''}
      </div>
      <div style="font-size:10px;color:#7a8298;margin-top:2px">RSI: ${cur_rsi?cur_rsi.toFixed(1):'-'} · ${rsiSignal}</div>
    </div>
  </div>

  <!-- Elliott Wave -->
  <div class="aic">
    <div class="aich">موجات إليوت</div>
    <div class="aib" style="padding:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:15px;font-weight:800;color:${elliottClr}">${elliottWave}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <div style="font-size:9px;color:#4a6080">${wavePct.toFixed(0)}% من النطاق</div>
          ${waveStruct?`<div style="font-size:8px;color:#3a5070;background:#0d1320;padding:2px 6px;border-radius:5px">${waveStruct}</div>`:''}
        </div>
      </div>
      <div style="font-size:10px;color:#7a8298;margin-bottom:8px">${elliottDesc}</div>
      <!-- Wave progress bar -->
      <div style="background:#0d1320;border-radius:6px;height:6px;overflow:hidden">
        <div style="width:${Math.min(100,wavePct)}%;height:100%;background:linear-gradient(90deg,#3b9eff,${elliottClr});border-radius:6px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        <span style="font-size:8px;color:#2a3a55">قاع ${recentLo.toFixed(2)}</span>
        <span style="font-size:8px;color:#2a3a55">قمة ${recentHi.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <!-- Chart Pattern -->
  <div class="aic">
    <div class="aich">النموذج الفني</div>
    <div class="aib" style="padding:10px">
      ${best?`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-size:14px;font-weight:800;color:${patternClr}">${pattern}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:10px;color:${patternClr};background:${patternClr}18;padding:2px 7px;border-radius:6px">${patternDir}</span>
          <span style="font-size:12px;font-weight:700;color:${patternClr}">${patternPct}%</span>
        </div>
      </div>
      <div style="font-size:10px;color:#4a6080;margin-bottom:8px">${patternDesc}</div>
      <div style="background:#0d1320;border-radius:6px;height:5px;margin-bottom:8px">
        <div style="width:${patternPct}%;height:100%;background:${patternClr};border-radius:6px"></div>
      </div>
      ${allPatterns.length>1?`<div style="font-size:9px;color:#3a5070">أيضاً: ${allPatterns.slice(1).map(p=>p.name+' ('+p.pct+'%)').join(' · ')}</div>`:''}
      `:'<div style="color:#4a6080;font-size:11px;text-align:center;padding:8px">لا نموذج فني مكتمل حالياً</div>'}
    </div>
  </div>

  <!-- Institutional Support -->
  <div class="aic">
    <div class="aich">دعم المحافظ الكبيرة</div>
    <div class="aib" style="padding:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:10px;color:#7a8298">أقوى منطقة تراكم مؤسسي</span>
        <span style="font-size:16px;font-weight:900;color:#22c55e">${instSupport}</span>
      </div>
      <div style="font-size:9px;color:#4a6080">${topZone?`حجم ${(topZone.v/1e6).toFixed(1)}M · تراكم استثنائي`:'بناءً على Pivot S1'}</div>
      <div style="margin-top:8px;display:flex;gap:6px">
        <div style="flex:1;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:6px;text-align:center">
          <div style="font-size:8px;color:#4a6080">دعم 1</div>
          <div style="font-size:12px;font-weight:700;color:#22c55e">${S1.toFixed(2)}</div>
        </div>
        <div style="flex:1;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:6px;text-align:center">
          <div style="font-size:8px;color:#4a6080">دعم 2</div>
          <div style="font-size:12px;font-weight:700;color:#22c55e">${S2.toFixed(2)}</div>
        </div>
        <div style="flex:1;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:6px;text-align:center">
          <div style="font-size:8px;color:#4a6080">دعم 3</div>
          <div style="font-size:12px;font-weight:700;color:#22c55e">${S3.toFixed(2)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Resistance levels -->
  <div class="aic">
    <div class="aich">مستويات المقاومة</div>
    <div class="aib" style="padding:10px">
      <div style="display:flex;gap:6px">
        ${[R1,R2,R3].map((r,i)=>`
        <div style="flex:1;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:6px;text-align:center">
          <div style="font-size:8px;color:#4a6080">مقاومة ${i+1}</div>
          <div style="font-size:12px;font-weight:700;color:#ef4444">${r.toFixed(2)}</div>
          <div style="font-size:8px;color:rgba(239,68,68,0.5)">+${((r-price)/price*100).toFixed(1)}%</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- Targets & SL -->
  <div class="aic">
    <div class="aich">الأهداف السعرية (ATR × معامل)</div>
    <div class="aib" style="padding:10px">
      <div style="display:flex;gap:6px;margin-bottom:8px">
        ${[t1,t2,t3].map((t,i)=>`
        <div style="flex:1;background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:7px 4px;text-align:center">
          <div style="font-size:8px;color:#4a6080">هدف ${i+1}</div>
          <div style="font-size:13px;font-weight:800;color:#22c55e">${t}</div>
          <div style="font-size:8px;color:rgba(34,197,94,0.6)">+${((t-price)/price*100).toFixed(1)}%</div>
        </div>`).join('')}
      </div>
      <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:9px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:10px;color:#7a8298">وقف الخسارة (1.2× ATR)</span>
        <span style="font-size:15px;font-weight:800;color:#ef4444">${sl}</span>
      </div>
    </div>
  </div>

  <!-- Indicators Summary -->
  <div class="aic">
    <div class="aich">ملخص المؤشرات</div>
    <div class="aib" style="padding:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        ${[
          {l:'MACD',v:mc.hist[n-1]?mc.hist[n-1].toFixed(3):'--',c:cur_macd>0?'#22c55e':'#ef4444',s:macdSignal},
          {l:'RSI(14)',v:cur_rsi?cur_rsi.toFixed(1):'--',c:cur_rsi>70?'#ef4444':cur_rsi<30?'#22c55e':'#f59e0b',s:rsiSignal},
          {l:'ATR(14)',v:cur_atr?cur_atr.toFixed(2):'--',c:'#f59e0b',s:'تقلب السوق'},
          {l:'BB %',v:bb_pct.toFixed(0)+'%',c:bb_pct>80?'#ef4444':bb_pct<20?'#22c55e':'#94a3b8',s:bb_pct>80?'قرب القمة':bb_pct<20?'قرب القاع':'منتصف الباند'},
          {l:'الحجم',v:(volRatio).toFixed(1)+'×',c:volRatio>1.5?'#22c55e':'#94a3b8',s:volStatus},
          {l:'EMA9',v:cur_ema9?cur_ema9.toFixed(2):'--',c:price>cur_ema9?'#22c55e':'#ef4444',s:price>cur_ema9?'فوق EMA9':'تحت EMA9'},
        ].map(({l,v,c:ic,s})=>`
        <div style="background:#0d1320;border:1px solid #1a2235;border-radius:8px;padding:7px">
          <div style="font-size:8px;color:#4a6080;margin-bottom:3px">${l}</div>
          <div style="font-size:13px;font-weight:700;color:${ic}">${v}</div>
          <div style="font-size:8px;color:#3a5070;margin-top:2px">${s}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

</div>`;
    document.getElementById('ai-foot').style.display='block';
  },600);
}
function closeAI(){document.getElementById('aip').classList.remove('show');}
function runAI(){showAI();}

