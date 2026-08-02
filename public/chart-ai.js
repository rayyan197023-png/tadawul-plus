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

function applyAIDrawingsToChart(){
  // Show mode selector modal
  const modal=document.createElement('div');
  modal.id='ai-mode-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(4,7,18,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML=`
  <div style="background:#0d1320;border:1px solid #1a2235;border-radius:18px;padding:24px;width:100%;max-width:340px">
    <div style="font-size:15px;font-weight:900;color:#f0f2f8;font-family:Cairo,sans-serif;text-align:right;margin-bottom:6px">رسم التحليل على الشارت</div>
    <div style="font-size:11px;color:#4a6080;font-family:Cairo,sans-serif;text-align:right;margin-bottom:20px">اختر نمط التداول لتخصيص التحليل</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button id="mode-scalper" onclick="_selectAIMode('scalper')"
        style="background:#111827;border:1px solid #2a3a55;border-radius:14px;padding:14px;cursor:pointer;text-align:right;-webkit-tap-highlight-color:transparent">
        <div style="font-size:14px;font-weight:800;color:#22c55e;font-family:Cairo,sans-serif">تداول لحظي (Scalper)</div>
        <div style="font-size:10px;color:#4a6080;font-family:Cairo,sans-serif;margin-top:4px">تحليل ساعة + نصف ساعة · مناطق دخول سريعة</div>
      </button>
      <button id="mode-investor" onclick="_selectAIMode('investor')"
        style="background:#111827;border:1px solid #2a3a55;border-radius:14px;padding:14px;cursor:pointer;text-align:right;-webkit-tap-highlight-color:transparent">
        <div style="font-size:14px;font-weight:800;color:#3b9eff;font-family:Cairo,sans-serif">مستثمر (Investor)</div>
        <div style="font-size:10px;color:#4a6080;font-family:Cairo,sans-serif;margin-top:4px">تحليل يومي + أسبوعي · مستويات استراتيجية</div>
      </button>
    </div>
    <button onclick="document.getElementById('ai-mode-modal').remove()"
      style="margin-top:14px;width:100%;background:transparent;border:1px solid #1a2235;border-radius:10px;color:#4a6080;font-size:12px;font-family:Cairo,sans-serif;padding:10px;cursor:pointer">إلغاء</button>
  </div>`;
  document.body.appendChild(modal);
}

function _selectAIMode(mode){
  _aiDrawMode=mode;
  const modal=document.getElementById('ai-mode-modal');
  if(modal)modal.remove();
  closeAI();
  _buildAndDrawAIAnnotations(mode);
}

function _buildAndDrawAIAnnotations(mode){
  const all=state.allCandles;
  const n=all.length;
  if(n<30){alert('بيانات غير كافية');return;}
  _hist();

  const closes=all.map(d=>d.c);
  const highs=all.map(d=>d.hi);
  const lows=all.map(d=>d.lo);
  const vols=all.map(d=>d.v);
  const price=closes[n-1];
  const isInvestor=mode==='investor';

  // ── Math helpers ────────────────────────────────────────────────
  const _sma=(arr,p)=>arr.map((_,i)=>i<p-1?null:arr.slice(i-p+1,i+1).reduce((a,b)=>a+b,0)/p);
  const _ema=(arr,p)=>{const k=2/(p+1);let pv=null;return arr.map(v=>{pv=pv==null?v:v*k+pv*(1-k);return pv;});};
  const _atr=(arr,p=14)=>{
    const tr=arr.map((d,i)=>i===0?d.hi-d.lo:Math.max(d.hi-d.lo,Math.abs(d.hi-arr[i-1].c),Math.abs(d.lo-arr[i-1].c)));
    return _sma(tr,p);
  };

  const atrArr=_atr(all);
  const atr=atrArr[n-1]||price*0.015;

  // PART 1: SUPPORT & RESISTANCE -- Volume-weighted (Murphy method)
  // Criteria: price level tested 2+ times with high volume (liquidity)
  const _findLiquidSR=(win,minTests=2)=>{
    // ── John Murphy / Mark Douglas S/R Method ──────────────────────
    // A level is significant when price has REVERSED at it 2+ times.
    // Strength = number of reversals × volume weight × recency
    // Key: we look at CLOSES not just shadows -- Murphy rule
    const sliceAll=all.slice(n-win);
    const sN=sliceAll.length;
    const h=sliceAll.map(d=>d.hi);
    const l=sliceAll.map(d=>d.lo);
    const c=sliceAll.map(d=>d.c);
    const v=sliceAll.map(d=>d.v);
    const vma=_sma(v,20);
    const merge=atr*0.35; // levels within 0.35 ATR = same zone
    const levels=[];

    // Adaptive lookback: smaller for more bars, larger for fewer
    const lb=Math.max(2,Math.min(5,Math.round(sN/25)));

    for(let i=lb;i<sN-lb;i++){
      // Swing high: highest hi in [i-lb..i+lb]
      let isH=true,isL=true;
      for(let j=i-lb;j<=i+lb;j++){
        if(j===i)continue;
        if(h[j]>=h[i])isH=false;
        if(l[j]<=l[i])isL=false;
      }

      if(isH){
        // Resistance pivot: use the CLOSE of the pivot bar (Murphy: closes matter most)
        // Use high as the zone ceiling, close as the more reliable flip level
        const lvl=h[i]; // ceiling of resistance zone
        const closeStrength=c[i]/h[i]; // how close did it close to its high (1=strong reversal)
        const volW=vma[i]?Math.min(3,v[i]/vma[i]):1;
        const recency=Math.pow((i+1)/sN,0.5); // sqrt for less extreme recency bias
        const score=volW*1.5+recency*1.0+(closeStrength<0.95?0.5:0); // bonus if closed below high (reversal)

        const ex=levels.find(lv=>lv.type==='R'&&Math.abs(lv.v-lvl)<merge);
        if(ex){
          ex.tests++;
          ex.score+=score*0.7; // diminishing returns per additional test
          ex.lastI=i;
          if(volW>ex.maxVol){ex.maxVol=volW;ex.v=lvl;} // update to highest volume test
        } else {
          levels.push({v:lvl,type:'R',tests:1,score,maxVol:volW,lastI:i,zone:merge});
        }
      }

      if(isL){
        const lvl=l[i]; // floor of support zone
        const closeStrength=1-c[i]/l[i]; // how close did close come to the low
        const volW=vma[i]?Math.min(3,v[i]/vma[i]):1;
        const recency=Math.pow((i+1)/sN,0.5);
        const score=volW*1.5+recency*1.0+(c[i]/l[i]>1.05?0.5:0);

        const ex=levels.find(lv=>lv.type==='S'&&Math.abs(lv.v-lvl)<merge);
        if(ex){
          ex.tests++;
          ex.score+=score*0.7;
          ex.lastI=i;
          if(volW>ex.maxVol){ex.maxVol=volW;ex.v=lvl;}
        } else {
          levels.push({v:lvl,type:'S',tests:1,score,maxVol:volW,lastI:i,zone:merge});
        }
      }
    }

    return levels
      .filter(lv=>lv.tests>=minTests)
      .sort((a,b)=>b.score-a.score);
  };

  // INVESTOR: wider window (130 bars ~ 6 months daily), require 3 tests
  // SCALPER:  tighter window (60 bars), require 2 tests
  const WIN_SR=isInvestor?Math.min(n,130):Math.min(n,60);
  const allSR=_findLiquidSR(WIN_SR, isInvestor?3:2);
  const minGap=atr*0.1;
  // Filter by PRICE POSITION (not by original type label)
  // A swing high ABOVE current price = resistance (regardless of flip)
  // A swing low BELOW current price = support
  // Also apply S/R flip labeling for the drawing
  const srAbove=allSR
    .filter(s=>s.v>price+minGap)   // anything above price can act as resistance
    .sort((a,b)=>a.v-b.v)          // nearest first
    .slice(0,4)
    .map(s=>({...s, isFlip:s.type==='S', type:'R'})); // mark flipped supports

  const srBelow=allSR
    .filter(s=>s.v<price-minGap)   // anything below price can act as support
    .sort((a,b)=>b.v-a.v)          // nearest first
    .slice(0,4)
    .map(s=>({...s, isFlip:s.type==='R', type:'S'})); // mark flipped resistances

  // Fallback: if still empty, use single-test levels
  const allSRFallback=_findLiquidSR(WIN_SR, 1);
  const srAboveFB=srAbove.length>0?srAbove:allSRFallback.filter(s=>s.v>price+minGap).sort((a,b)=>a.v-b.v).slice(0,3).map(s=>({...s,type:'R'}));
  const srBelowFB=srBelow.length>0?srBelow:allSRFallback.filter(s=>s.v<price-minGap).sort((a,b)=>b.v-a.v).slice(0,3).map(s=>({...s,type:'S'}));

  // PART 2: TREND LINES -- Edwards & Magee method
  // Rule 1: Trendline connects at least 2 confirmed pivot points
  // Rule 2: 3rd touch = confirmed trendline
  // Rule 3: Steeper = weaker (ideal angle 30-45°)
  // INVESTOR: Daily pivots (last 60 bars, lb=3)
  // SCALPER:  30m-sim pivots (last 30 bars, lb=2)
  const WIN_TREND=isInvestor?Math.min(n,60):Math.min(n,30);
  const TREND_LB=isInvestor?3:2;
  const TREND_SWING=isInvestor?atr*0.8:atr*0.4;
  const tSlice=all.slice(n-WIN_TREND);
  const tH=tSlice.map(d=>d.hi), tL=tSlice.map(d=>d.lo);
  const tOff=n-WIN_TREND;

  // Strict ZigZag with minimum swing
  const _zz=(h,l,lb,off,minSw)=>{
    const pts=[];let dir=0,lastV=null;
    for(let i=lb;i<h.length-lb;i++){
      let iH=true,iL=true;
      for(let j=i-lb;j<=i+lb;j++){
        if(j===i)continue;
        if(h[j]>=h[i])iH=false;
        if(l[j]<=l[i])iL=false;
      }
      if(iH&&(dir!==1||h[i]>lastV)){
        if(lastV!==null&&Math.abs(h[i]-lastV)<minSw)continue;
        if(dir===1&&pts.length)pts.pop();
        pts.push({i:i+off,v:h[i],type:'H',raw_i:i});
        dir=1;lastV=h[i];
      } else if(iL&&(dir!==-1||l[i]<lastV)){
        if(lastV!==null&&Math.abs(l[i]-lastV)<minSw)continue;
        if(dir===-1&&pts.length)pts.pop();
        pts.push({i:i+off,v:l[i],type:'L',raw_i:i});
        dir=-1;lastV=l[i];
      }
    }
    return pts;
  };

  const trendZZ=_zz(tH,tL,TREND_LB,tOff,TREND_SWING);
  const tPeaks=trendZZ.filter(p=>p.type==='H');
  const tTroughs=trendZZ.filter(p=>p.type==='L');

  // Find BEST trendline through pivots:
  // Connect last 2 confirmed pivots, validate with 3rd touch
  // TRENDLINE ENGINE -- Edwards & Magee (11th Ed.) Standards
  // Rules applied:
  //   1. Uptrend = connect ascending REACTION LOWS (troughs)
  //   2. Downtrend = connect descending RALLY HIGHS (peaks)
  //   3. Valid line: 2 anchors minimum, score bonus for 3rd touch
  //   4. No price bar should CLOSE on the wrong side between anchors
  //   5. Steeper lines (>70°) are weaker -- penalise them
  //   6. Most RECENT confirmed pivots have priority
  //   7. Channel line: strict parallel through BEST opposite extreme
  //      between the two anchor pivots (Edwards & Magee ch.14)
  //   8. Line drawn ONLY from first anchor to last anchor (non-extended)
  const _buildTrendLine=(pivots,type,allCandles2)=>{
    if(pivots.length<2)return null;
    const isResist=type==='resist';
    const pool=pivots.slice(-Math.min(pivots.length,6));
    const sliceData=allCandles2; // for violation check
    const tol=atr*0.25;

    let bestLine=null, bestScore=-Infinity;

    for(let a=0;a<pool.length-1;a++){
      for(let b=a+1;b<pool.length;b++){
        const p1=pool[a], p2=pool[b];
        const di=p2.i-p1.i;
        if(di<3)continue; // need at least 3 bars between anchors

        const slope=(p2.v-p1.v)/di;
        const intercept=p1.v-slope*p1.i;

        // ── Rule 1: Direction must match trend type ──────────────
        // Uptrend support: slope ≥ 0 (ascending lows)
        // Downtrend resistance: slope ≤ 0 (descending highs)
        // Allow slight opposite slope (≤ 0.3 ATR per bar) for consolidation
        const slopeOk = isResist
          ? slope <= atr*0.3/di*di      // resist: flat or down
          : slope >= -atr*0.3/di*di;    // support: flat or up
        if(!slopeOk)continue;

        // ── Rule 2: No close should violate line between anchors ──
        // (A true trendline is never decisively crossed between pivots)
        let violations=0;
        const checkStart=p1.i, checkEnd=p2.i;
        for(let ci=checkStart+1;ci<checkEnd&&ci<sliceData.length;ci++){
          const d=sliceData[ci];
          if(!d)continue;
          const lineV=slope*ci+intercept;
          // Closing price violation (not just shadow)
          if(isResist&&d.c>lineV+tol*1.5)violations++;
          if(!isResist&&d.c<lineV-tol*1.5)violations++;
        }
        if(violations>1)continue; // max 1 false breach allowed

        // ── Rule 3: Count 3rd-touch confirmations ────────────────
        let touches=2, thirdTouch=false;
        for(let k=0;k<pool.length;k++){
          if(k===a||k===b)continue;
          const lineV=slope*pool[k].i+intercept;
          if(Math.abs(pool[k].v-lineV)<tol*1.2){
            touches++;
            if(pool[k].i>p2.i||pool[k].i>p1.i)thirdTouch=true;
          }
        }

        // ── Rule 4: Angle quality (30-55° ideal) ─────────────────
        // Use normalised slope as proxy (can't compute true angle without px/price ratio)
        const absSlope=Math.abs(slope);
        const anglePenalty=absSlope>atr*0.8?-1:absSlope<atr*0.02?-0.5:0;

        // ── Score ─────────────────────────────────────────────────
        const recencyBonus=(b/pool.length)*1.5;    // prefer recent pairs
        const coverBonus=Math.min(2,di/20)*0.5;    // prefer wider spans
        const touchBonus=thirdTouch?2:(touches>2?1:0);
        const violPenalty=violations*-1.5;
        const score=recencyBonus+coverBonus+touchBonus+violPenalty+anglePenalty;

        if(score>bestScore){
          bestScore=score;
          bestLine={p1,p2,slope,intercept,touches,score,
            isConfirmed:touches>=3,
            // Extend the line slightly past p2 toward current bar for visibility
            p2ext:{i:Math.min(n-1,p2.i+Math.round(di*0.25)),
                   v:slope*(p2.i+Math.round(di*0.25))+intercept}
          };
        }
      }
    }
    return bestLine;
  };

  const resistLine=_buildTrendLine(tPeaks,'resist',all);
  const supportLine=_buildTrendLine(tTroughs,'support',all);

  // Channel line: Edwards & Magee ch.14
  // pivot that lies BETWEEN the two anchor pivots (not outside them)
  const _buildChannel=(tl,oppPivots)=>{
    if(!tl||!oppPivots.length)return null;
    const {p1,p2,slope,intercept}=tl;
    const spanStart=Math.min(p1.i,p2.i);
    const spanEnd=Math.max(p1.i,p2.i);
    // Only use opposite pivots that fall INSIDE the anchor span
    const inside=oppPivots.filter(p=>p.i>=spanStart&&p.i<=spanEnd);
    if(!inside.length){
      // Fallback: use closest pivot outside span
      const nearest=oppPivots.reduce((best,p)=>{
        const d=Math.min(Math.abs(p.i-spanStart),Math.abs(p.i-spanEnd));
        return d<(best?Math.min(Math.abs(best.i-spanStart),Math.abs(best.i-spanEnd)):Infinity)?p:best;
      },null);
      if(!nearest)return null;
      inside.push(nearest);
    }
    // Find the pivot most offset from the line
    let maxDist=0, anchor=null;
    inside.forEach(p=>{
      const lineV=slope*p.i+intercept;
      const dist=Math.abs(p.v-lineV);
      if(dist>maxDist){maxDist=dist;anchor=p;}
    });
    if(!anchor||maxDist<atr*0.3)return null;
    const offset=anchor.v-(slope*anchor.i+intercept);
    return {
      p1:{i:p1.i, v:p1.v+offset},
      p2:{i:p2.i, v:p2.v+offset},
      p2ext:{i:tl.p2ext.i, v:tl.p2ext.v+offset},
      slope, intercept:intercept+offset, offset
    };
  };

  const resistChannel=resistLine?_buildChannel(resistLine,tTroughs):null;
  const supportChannel=supportLine?_buildChannel(supportLine,tPeaks):null;

  // PART 3: ELLIOTT WAVE -- Multi-Timeframe Cascade
  // Hierarchy: Monthly → Weekly → Daily → Intraday
  // Frost & Prechter rules applied strictly

  // ── Robust ZigZag: keeps lowering threshold until enough pivots ─
  const _zzEnough=(h,l,off,need=6)=>{
    for(let sw=1.5;sw>=0.1;sw-=0.2){
      for(let lb=Math.max(2,Math.floor(h.length/8));lb>=2;lb--){
        const pts=_zz(h,l,lb,off,atr*sw);
        if(pts.length>=need)return pts;
      }
    }
    // Absolute last resort -- lb=2, no swing minimum
    return _zz(h,l,2,off,0);
  };

  // ── Aggregate candles into higher timeframe ──────────────────
  const _aggregate=(candles,step)=>{
    const agg=[];
    for(let i=0;i<candles.length;i+=step){
      const chunk=candles.slice(i,Math.min(i+step,candles.length));
      if(!chunk.length)continue;
      agg.push({
        origI:i,  // index in original array
        hi:Math.max(...chunk.map(d=>d.hi)),
        lo:Math.min(...chunk.map(d=>d.lo)),
        o:chunk[0].o, c:chunk[chunk.length-1].c,
        v:chunk.reduce((s,d)=>s+d.v,0)
      });
    }
    return agg;
  };

  // ── Build ZigZag for simulated timeframe ────────────────────
  const _buildTFZZ=(candles,step,winBars)=>{
    const sl=candles.slice(-winBars);
    const agg=_aggregate(sl,step);
    if(agg.length<6)return [];
    const h2=agg.map(d=>d.hi), l2=agg.map(d=>d.lo);
    const raw=_zzEnough(h2,l2,0,6);
    // Map back to approximate original candle indices
    const origStart=candles.length-winBars;
    return raw.map(p=>{
      const aggItem=agg[Math.min(p.i,agg.length-1)];
      const origIdx=origStart+(aggItem?aggItem.origI:p.i*step);
      return{...p,i:origIdx};
    });
  };

  // ── Timeframe parameters ─────────────────────────────────────
  // Monthly (step=20), Weekly (step=5), Daily (step=1)
  const WIN_M=Math.min(n,200), WIN_W=Math.min(n,130), WIN_D=Math.min(n,60), WIN_I=Math.min(n,30);

  const zzMonthly  = WIN_M>=40 ? _buildTFZZ(all,20,WIN_M) : [];
  const zzWeekly   = WIN_W>=25 ? _buildTFZZ(all,5, WIN_W) : [];
  const zzDaily    = WIN_D>=12 ? (()=>{ const h=highs.slice(-WIN_D),l=lows.slice(-WIN_D); return _zzEnough(h,l,n-WIN_D,6); })() : [];
  const zzIntraday = WIN_I>=8  ? (()=>{ const h=highs.slice(-WIN_I),l=lows.slice(-WIN_I); return _zzEnough(h,l,n-WIN_I,4); })() : [];

  // ── HTF trend direction ──────────────────────────────────────
  const _trendDir=(zz)=>{
    const pk=zz.filter(p=>p.type==='H'),tr=zz.filter(p=>p.type==='L');
    if(pk.length<2||tr.length<2)return 0;
    const hhUp=pk[pk.length-1].v>pk[pk.length-2].v;
    const hlUp=tr[tr.length-1].v>tr[tr.length-2].v;
    if(hhUp&&hlUp)return 1;
    if(!hhUp&&!hlUp)return -1;
    return 0;
  };
  const htfTrendDir=_trendDir(zzWeekly.length?zzWeekly:zzMonthly.length?zzMonthly:zzDaily);
  const ltfTrendDir=_trendDir(zzDaily.length?zzDaily:zzIntraday);

  // ── Elliott rules ────────────────────────────────────────────
  // Level 0 = strict (Frost & Prechter)
  // Level 1 = relaxed (Neely NEoWave 3% R3 tolerance)
  // Level 2 = best-effort (alternating structure only)
  const _chk5=(pts,level=0)=>{
    if(pts.length<6)return null;
    const isBull=pts[0].type==='L';
    const v=pts.map(p=>p.v);
    const tol=level>=1?atr*0.5:0; // R3 tolerance
    if(isBull){
      const l1=v[1]-v[0],l3=v[3]-v[2],l5=v[5]-v[4];
      if(level<2){
        if(v[2]<=v[0])return null;           // R1: wave 2 > wave 0
        if(l1<=0||l3<=0||l5<=0)return null;  // all impulse legs positive
        if(l3<l1*0.3&&l3<l5*0.3)return null; // R2: wave 3 not shortest
        if(v[4]<v[1]-tol)return null;        // R3: wave 4 overlap (with tolerance)
        if(v[2]>=v[1]||v[4]>=v[3])return null; // corrections retrace
      } else {
        // Best effort: just needs alternating and generally upward
        if(v[1]<=v[0]||v[3]<=v[2]||v[5]<=v[4])return null;
        if(v[2]>=v[1]||v[4]>=v[3])return null;
      }
      return{isBull,l1:Math.abs(l1),l3:Math.abs(l3),l5:Math.abs(l5),
        w3Ext:l3>l1*1.618,w5Short:l5<l1*0.618,level};
    } else {
      const l1=v[0]-v[1],l3=v[2]-v[3],l5=v[4]-v[5];
      if(level<2){
        if(v[2]>=v[0])return null;
        if(l1<=0||l3<=0||l5<=0)return null;
        if(l3<l1*0.3&&l3<l5*0.3)return null;
        if(v[4]>v[1]+tol)return null;
        if(v[2]<=v[1]||v[4]<=v[3])return null;
      } else {
        if(v[1]>=v[0]||v[3]>=v[2]||v[5]>=v[4])return null;
        if(v[2]<=v[1]||v[4]<=v[3])return null;
      }
      return{isBull:false,l1:Math.abs(l1),l3:Math.abs(l3),l5:Math.abs(l5),
        w3Ext:l3>l1*1.618,w5Short:l5<l1*0.618,level};
    }
  };

  const _chkABC=(pts,level=0)=>{
    if(pts.length<3)return null;
    const v=pts.map(p=>p.v);
    const isBear=pts[0].type==='H';
    if(isBear){
      if(v[1]>=v[0])return null; // A must be down
      if(level<2&&v[2]>=v[1])return null; // C must go lower than B (strict)
      // Level 2: C just needs to be lower than A start
      if(level>=2&&v[2]>=v[0])return null;
      const la=v[0]-v[1],lc=Math.abs(v[1]-v[2]);
      return{isBull:false,cRatioA:lc/la,cEqA:Math.abs(lc/la-1)<0.3,c161:Math.abs(lc/la-1.618)<0.35,level};
    } else {
      if(v[1]<=v[0])return null;
      if(level<2&&v[2]<=v[1])return null;
      if(level>=2&&v[2]<=v[0])return null;
      const la=v[1]-v[0],lc=Math.abs(v[2]-v[1]);
      return{isBull:true,cRatioA:lc/la,cEqA:Math.abs(lc/la-1)<0.3,c161:Math.abs(lc/la-1.618)<0.35,level};
    }
  };

  // ── Find best Elliott in a zigzag (3-level fallback) ────────
  const _findEW=(zz)=>{
    if(!zz||zz.length<3)return null;
    const pool=zz.slice(-Math.min(zz.length,10));
    const wn=['1','2','3','4','5'];

    // Try 5-wave at levels 0,1,2
    for(let level=0;level<=2;level++){
      let best=null,bestS=-1;
      for(let s=0;s<=pool.length-6;s++){
        const sl=pool.slice(s,s+6);
        const r=_chk5(sl,level);
        if(!r)continue;
        const rec=(s+6)/pool.length*2;
        const span=Math.abs(sl[5].v-sl[0].v)/Math.max(atr,0.001);
        const score=rec+Math.min(span/5,2)+(r.w3Ext?1.5:0)-(level*0.5);
        if(score>bestS){
          bestS=score;
          const fibT=r.isBull?{
            t3_161:sl[0].v+r.l1*1.618,
            t3_261:sl[0].v+r.l1*2.618,
            t5_eq1:sl[4].v+r.l1,
            t5_618:sl[4].v+r.l1*0.618
          }:null;
          best={type:'impulse',isBull:r.isBull,w3Ext:r.w3Ext,w5Short:r.w5Short,
            level,estimated:level>0,
            pts:sl.slice(1).map((p,i)=>({...p,label:wn[i]})),
            anchor:sl[0],fibT,
            currentWave:r.w3Ext?'3 ممتدة':wn[sl.length-2]||'5'};
        }
      }
      if(best)return best;
    }

    // Try ABC at levels 0,1,2
    for(let level=0;level<=2;level++){
      let best=null,bestS=-1;
      for(let s=0;s<=pool.length-3;s++){
        const sl=pool.slice(s,s+3);
        const r=_chkABC(sl,level);
        if(!r)continue;
        const rec=(s+3)/pool.length*2;
        const span=Math.abs(sl[2].v-sl[0].v)/Math.max(atr,0.001);
        const score=rec+Math.min(span/3,2)+(r.cEqA||r.c161?1:0)-(level*0.5);
        if(score>bestS){
          bestS=score;
          best={type:'corrective',isBull:r.isBull,cEqA:r.cEqA,c161:r.c161,
            level,estimated:level>0,
            pts:sl.map((p,i)=>({...p,label:['A','B','C'][i]})),
            anchor:sl[0],fibT:null,currentWave:'C'};
        }
      }
      if(best)return best;
    }
    return null;
  };

  // ── Run on all timeframes ─────────────────────────────────────
  const ewMonthly  = _findEW(zzMonthly);
  const ewWeekly   = _findEW(zzWeekly);
  const ewDaily    = _findEW(zzDaily);
  const ewIntraday = _findEW(zzIntraday);

  // For drawing: best available by timeframe priority
  const elliott = isInvestor
    ? (ewWeekly||ewMonthly||ewDaily||ewIntraday)
    : (ewDaily||ewIntraday||ewWeekly);

  // Timeframe label for banner
  const ewTFLabel = isInvestor
    ? (ewWeekly?'أسبوعي':ewMonthly?'شهري':ewDaily?'يومي':'لحظي')
    : (ewDaily?'يومي':ewIntraday?'لحظي':'أسبوعي');

  // PART 4: CHART PATTERNS
  let chartPattern=null;
  if(tPeaks.length>=3){
    const [ls,hd,rs]=tPeaks.slice(-3);
    if(hd.v>ls.v&&hd.v>rs.v&&Math.abs(ls.v-rs.v)<atr*3){
      const nk=(tTroughs.find(t=>t.i>ls.i&&t.i<hd.i)||{v:price*0.98}).v;
      chartPattern={name:'رأس وكتفين',neckLine:nk,dir:-1,clr:'#ef4444'};
    }
  }
  if(!chartPattern&&tTroughs.length>=3){
    const [ls,hd,rs]=tTroughs.slice(-3);
    if(hd.v<ls.v&&hd.v<rs.v&&Math.abs(ls.v-rs.v)<atr*3){
      const nk=(tPeaks.find(t=>t.i>ls.i&&t.i<hd.i)||{v:price*1.02}).v;
      chartPattern={name:'رأس وكتفين مقلوب',neckLine:nk,dir:1,clr:'#22c55e'};
    }
  }
  if(!chartPattern&&tPeaks.length>=2){
    const [p1,p2]=tPeaks.slice(-2);
    if(Math.abs(p1.v-p2.v)<atr*1.5&&p2.i-p1.i>=4)
      chartPattern={name:'قمة مزدوجة',neckLine:Math.min(p1.v,p2.v)*0.998,dir:-1,clr:'#ef4444'};
  }
  if(!chartPattern&&tTroughs.length>=2){
    const [t1,t2]=tTroughs.slice(-2);
    if(Math.abs(t1.v-t2.v)<atr*1.5&&t2.i-t1.i>=4)
      chartPattern={name:'قاع مزدوج',neckLine:Math.max(t1.v,t2.v)*1.002,dir:1,clr:'#22c55e'};
  }

  // PART 5: BREAKOUT DETECTION (Edwards & Magee standards)
  const _checkBreakout=(tl,label)=>{
    if(!tl||n<5)return null;
    const vma20=_sma(vols,20);
    for(let k=n-1;k>=Math.max(0,n-3);k--){
      const lineY=tl.slope*k+tl.intercept;
      const d=all[k],prev=all[k-1];
      if(!d||!prev)continue;
      const prevLineY=tl.slope*(k-1)+tl.intercept;
      const crossedUp=prev.c<=prevLineY&&d.c>lineY;
      const crossedDn=prev.c>=prevLineY&&d.c<lineY;
      if(!crossedUp&&!crossedDn)continue;
      if(Math.abs(d.c-lineY)<atr*0.2)continue;
      const volOk=vma20[k]&&d.v>=vma20[k]*1.15;
      return{idx:k,dir:crossedUp?1:-1,price:d.c,lineY,volConfirmed:volOk,
        label:'اختراق '+(crossedUp?'صاعد ↑':'هابط ↓')+' ('+label+')'};
    }
    return null;
  };

  // PART 6: INSTITUTIONAL ENTRY (Point of Control -- Volume Profile)
  const _findPOC=(win)=>{
    const bins=50;
    const sl=all.slice(n-win);
    const pMin=Math.min(...sl.map(d=>d.lo)), pMax=Math.max(...sl.map(d=>d.hi));
    const bSize=(pMax-pMin)/bins||1;
    const vb=new Array(bins).fill(0);
    sl.forEach(d=>{const bi=Math.min(bins-1,Math.max(0,Math.floor(((d.hi+d.lo)/2-pMin)/bSize)));vb[bi]+=d.v;});
    let mx=0,poc=0;
    vb.forEach((v,i)=>{if(v>mx){mx=v;poc=i;}});
    return pMin+(poc+0.5)*bSize;
  };

  // DRAWING HELPERS
  state.drawings=state.drawings.filter(d=>!d._ai);

  const addH=(prc,label,color,dash=true,bold=false,thick=1.5)=>{
    const pr=+prc.toFixed(2);
    if(!isFinite(pr)||pr<=0)return;
    state.drawings.push({id:Date.now()+Math.random(),tool:'hline',
      p1:{x:0,y:0},p2:{x:cv.offsetWidth-38,y:0},_ai:true,_price:pr,
      _p1_price:pr,_p2_price:pr,_p1_idx:0,_p2_idx:n-1,
      _label:label,color,_dash:dash,_bold:bold,_thick:thick});
  };
  const addT=(p1pr,p1i,p2pr,p2i,label,color,dash=false)=>{
    if(!isFinite(p1pr)||!isFinite(p2pr))return;
    // Use 'trend' (not extline) so line is bounded by p1→p2 only
    state.drawings.push({id:Date.now()+Math.random(),tool:'trend',
      p1:{x:0,y:0},p2:{x:0,y:0},_ai:true,
      _p1price:p1pr,_p1idx:p1i,_p2price:p2pr,_p2idx:p2i,
      _label:label,color,_dash:dash});
  };
  const addDot=(prc,idx,lbl,color,waveKey='')=>{
    if(!isFinite(prc))return;
    state.drawings.push({id:Date.now()+Math.random(),tool:'wave_dot',
      p1:{x:0,y:0},p2:{x:0,y:0},_ai:true,_price:prc,
      _p1_price:prc,_p2_price:prc,_p1_idx:idx,_p2_idx:idx,
      _label:lbl,color,_dash:false,_bold:true,_dot:true,_dotOnly:true,
      _waveKey:waveKey});
  };
  const addBreakoutArrow=(bo,label)=>{
    if(!bo)return;
    const col=bo.dir===1?'#22c55e':'#ef4444';
    state.drawings.push({id:Date.now()+Math.random(),tool:'breakout_arrow',_ai:true,
      _boIdx:bo.idx,_boDir:bo.dir,_boPrice:bo.price,_boLineY:bo.lineY,
      _label:'اختراق '+(bo.dir===1?'صاعد ↑':'هابط ↓')+' -- '+label+(bo.volConfirmed?' ✓':''),
      color:col,_volOk:bo.volConfirmed});
  };

  if(isInvestor){

    // 1. S/R -- Volume-weighted (Murphy method), liquidity-based
    // مقاومات فوق السعر = أخضر | دعوم تحت السعر = أحمر
    srAboveFB.slice(0,3).forEach((s,i)=>{
      const flipLbl=s.isFlip?' ↕':'';
      const strength=s.tests>=4?'قوي جداً':s.tests>=3?'قوي':'متوسط';
      const lbl=i===0?'مقاومة رئيسية ↑'+flipLbl+' ['+strength+'] ×'+s.tests
                     :'مقاومة '+(i+1)+flipLbl+' ×'+s.tests;
      addH(s.v,lbl,'#22c55e',i!==0,i===0,i===0?2.5:1.5);
    });
    srBelowFB.slice(0,3).forEach((s,i)=>{
      const flipLbl=s.isFlip?' ↕':'';
      const strength=s.tests>=4?'قوي جداً':s.tests>=3?'قوي':'متوسط';
      const lbl=i===0?'دعم رئيسي ↓'+flipLbl+' ['+strength+'] ×'+s.tests
                     :'دعم '+(i+1)+flipLbl+' ×'+s.tests;
      addH(s.v,lbl,'#ef4444',i!==0,i===0,i===0?2.5:1.5);
    });

    // 2. Trend lines -- Daily pivots, validated touches
    if(resistLine){
      const rLbl=(resistLine.isConfirmed?'ترند مقاومة مؤكد ✓':'ترند مقاومة')+' يومي ×'+resistLine.touches;
      const rEnd=resistLine.p2ext||resistLine.p2;
      addT(resistLine.p1.v,resistLine.p1.i,rEnd.v,rEnd.i,rLbl,'#ffffff',false);
      addBreakoutArrow(_checkBreakout(resistLine,'ترند يومي'),'ترند مقاومة يومي');
      if(resistChannel){
        const rcEnd=resistChannel.p2ext||resistChannel.p2;
        addT(resistChannel.p1.v,resistLine.p1.i,rcEnd.v,rEnd.i,'قناة علوية يومي','rgba(255,255,255,0.35)',true);
      }
    }
    if(supportLine){
      const sLbl=(supportLine.isConfirmed?'ترند دعم مؤكد ✓':'ترند دعم')+' يومي ×'+supportLine.touches;
      const sEnd=supportLine.p2ext||supportLine.p2;
      addT(supportLine.p1.v,supportLine.p1.i,sEnd.v,sEnd.i,sLbl,'#ffffff',false);
      addBreakoutArrow(_checkBreakout(supportLine,'ترند يومي'),'ترند دعم يومي');
      if(supportChannel){
        const scEnd=supportChannel.p2ext||supportChannel.p2;
        addT(supportChannel.p1.v,supportLine.p1.i,scEnd.v,sEnd.i,'قناة سفلية يومي','rgba(255,255,255,0.35)',true);
      }
    }

    // 3. Elliott Wave -- Multi-timeframe cascade
    const wColorMap={'1':'#3b9eff','2':'#f59e0b','3':'#22c55e','4':'#f59e0b','5':'#ef4444',
      'A':'#ef4444','B':'#f59e0b','C':'#3b9eff','D':'#a78bfa','E':'#38bdf8'};

    if(elliott&&elliott.pts&&elliott.pts.length>=2){
      elliott.pts.forEach(pt=>{
        const isW3=(pt.label==='3');
        const lbl=pt.label+(isW3&&elliott.w3Ext?'*':'');
        addDot(pt.v,pt.i,lbl,wColorMap[pt.label]||'#a78bfa',pt.label);
      });

      // Timeframe context banner
      const tfSrc=ewTFLabel;
      const tLbl=htfTrendDir===1?'↑ صاعد':htfTrendDir===-1?'↓ هابط':'→ عرضي';
      const typeLbl=elliott.type==='impulse'?'دافعة':'تصحيحية';
      const extLbl=elliott.w3Ext?' ★ موجة 3 ممتدة':'';
      const wNow=typeof elliott.currentWave==='string'?elliott.currentWave:'?';
      addH(price*(htfTrendDir>=0?1.007:0.993),
        'يوت '+typeLbl+' ('+tfSrc+') | '+tLbl+' | موجة: '+wNow+extLbl,
        '#a78bfa',false,true,0);

      // Show Fibonacci targets if impulse
      if(elliott.type==='impulse'&&elliott.fibT){
        const f=elliott.fibT;
        if(f.t3_161&&Math.abs(f.t3_161-price)>atr*0.5)
          addH(f.t3_161,'هدف موجة 3 (161.8%)','#22c55e55',true,false,0.8);
        if(f.t5_eq1&&Math.abs(f.t5_eq1-price)>atr*0.5)
          addH(f.t5_eq1,'هدف موجة 5 (100%)','#ef444455',true,false,0.8);
      }
    }

    // Show monthly degree context (background wave)
    if(isInvestor&&ewMonthly&&ewMonthly.pts&&ewMonthly!==elliott){
      const mLast=ewMonthly.pts[ewMonthly.pts.length-1];
      if(mLast&&Math.abs(mLast.v-price)<atr*8){
        const mLbl='الدرجة الشهرية: موجة '+(mLast.label||'?');
        addH(mLast.v,mLbl,'rgba(167,139,250,0.4)',true,false,0.7);
      }
    }

    // 4. POC -- Institutional entry
    const poc=_findPOC(Math.min(n,130));
    const tooClose=[...srAbove,...srBelow].some(s=>Math.abs(s.v-poc)<atr*0.6);
    if(!tooClose&&Math.abs(poc-price)<atr*20)
      addH(poc,'دخول صناديق POC ×','#fbbf24',false,true,2);

    // 5. Chart pattern
    if(chartPattern)
      addH(chartPattern.neckLine,chartPattern.name+' -- العاتق',chartPattern.clr,false,true,2.5);

  } else {

    // 1. Daily S/R on intraday chart
    srAboveFB.slice(0,2).forEach((s,i)=>{
      const flipLbl=s.isFlip?' ↕':'';
      addH(s.v,i===0?'مقاومة يومية ↑'+flipLbl+' ×'+s.tests:'مقاومة 2 ×'+s.tests,'#22c55e',i!==0,i===0,i===0?2:1.5);
    });
    srBelowFB.slice(0,2).forEach((s,i)=>{
      const flipLbl=s.isFlip?' ↕':'';
      addH(s.v,i===0?'دعم يومي ↓'+flipLbl+' ×'+s.tests:'دعم 2 ×'+s.tests,'#ef4444',i!==0,i===0,i===0?2:1.5);
    });

    // 2. Trend lines -- 30m simulation
    if(resistLine){
      const rEnd2=resistLine.p2ext||resistLine.p2;
      addT(resistLine.p1.v,resistLine.p1.i,rEnd2.v,rEnd2.i,
        (resistLine.isConfirmed?'مقاومة مؤكدة ✓':'مقاومة')+' 30م ×'+resistLine.touches,'#ffffff',false);
      addBreakoutArrow(_checkBreakout(resistLine,'30م'),'مقاومة 30م');
      if(resistChannel){
        const rcEnd2=resistChannel.p2ext||resistChannel.p2;
        addT(resistChannel.p1.v,resistLine.p1.i,rcEnd2.v,rEnd2.i,'قناة علوية 30م','rgba(255,255,255,0.35)',true);
      }
    }
    if(supportLine){
      const sEnd2=supportLine.p2ext||supportLine.p2;
      addT(supportLine.p1.v,supportLine.p1.i,sEnd2.v,sEnd2.i,
        (supportLine.isConfirmed?'دعم مؤكد ✓':'دعم')+' 30م ×'+supportLine.touches,'#ffffff',false);
      addBreakoutArrow(_checkBreakout(supportLine,'30م'),'دعم 30م');
      if(supportChannel){
        const scEnd2=supportChannel.p2ext||supportChannel.p2;
        addT(supportChannel.p1.v,supportLine.p1.i,scEnd2.v,sEnd2.i,'قناة سفلية 30م','rgba(255,255,255,0.35)',true);
      }
    }

    // 3. EMAs for scalper
    const ma20=_sma(closes,20),ma50=_sma(closes,50);
    const ema9=_ema(closes,9),ema21=_ema(closes,21);
    if(ema9[n-1])addH(ema9[n-1],'EMA9','#f59e0b',false,false,1.2);
    if(ema21[n-1])addH(ema21[n-1],'EMA21','#3b9eff',false,false,1.2);

    // 4. Session range
    const rH=Math.max(...highs.slice(-Math.min(n,10)));
    const rL=Math.min(...lows.slice(-Math.min(n,10)));
    addH(rH,'أعلى النطاق ↑','#22c55e',true,false,1.2);
    addH(rL,'أدنى النطاق ↓','#ef4444',true,false,1.2);

    // 5. POC
    const poc=_findPOC(Math.min(n,30));
    addH(poc,'دخول صناديق POC','#fbbf24',false,true,2);

    // 6. Chart pattern
    if(chartPattern)
      addH(chartPattern.neckLine,chartPattern.name+' -- العاتق',chartPattern.clr,false,true,2);
  }
  saveDrawings();
  _updateUndoButtons();
  render();

  // Toast
  const toast=document.getElementById('toast');
  if(toast){
    const cnt=state.drawings.filter(d=>d._ai).length;
    toast.textContent='تم رسم '+cnt+' مستوى على الشارت';
    toast.style.opacity='1';
    setTimeout(()=>toast.style.opacity='0',3000);
  }
  _updateAIClearBtn();
}

