function _updateThemeIcon(){
  const icon=document.getElementById('theme-icon');
  if(!icon)return;
  if(darkTheme){
    // Moon icon
    icon.setAttribute('viewBox','0 0 24 24');
    icon.innerHTML='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="#a5b4fc" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  } else {
    // Sun icon
    icon.setAttribute('viewBox','0 0 24 24');
    icon.innerHTML='<circle cx="12" cy="12" r="4" stroke="#fbbf24" stroke-width="1.5" fill="none"/><line x1="12" y1="2" x2="12" y2="5" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="12" x2="5" y2="12" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><line x1="19" y1="12" x2="22" y2="12" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><line x1="4.93" y1="4.93" x2="7.05" y2="7.05" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><line x1="16.95" y1="16.95" x2="19.07" y2="19.07" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><line x1="4.93" y1="19.07" x2="7.05" y2="16.95" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/><line x1="16.95" y1="7.05" x2="19.07" y2="4.93" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>';
  }
}
function toggleTheme(){
  darkTheme=!darkTheme;
  _updateThemeIcon();
  _applyTheme();
  saveSettings();render();
}

function _applyTheme(){
  const D=darkTheme;
  // Body & header
  document.body.style.background=D?'#070b12':'#f4f6fa';
  document.body.style.color=D?'#e8ecf4':'#1a2340';
  const hdr=document.getElementById('hdr');
  if(hdr){hdr.style.background=D?'#070a12':'#ffffff';hdr.style.borderColor=D?'rgba(255,255,255,0.06)':'#dde3ef';}
  // r2 buttons bar
  const r2=document.getElementById('r2');
  if(r2){r2.style.background=D?'#0a0f1c':'#eef1f6';r2.style.borderTop=D?'1px solid rgba(255,255,255,0.05)':'1px solid #dde3ef';}
  // Stock name
  const stkName=document.getElementById('stk-name');
  if(stkName){stkName.style.color=D?'#e8ecf4':'#1a2340';}
  // Main price
  const pmain=document.getElementById('pmain');
  if(pmain){pmain.style.color=D?'#ffffff':'#1a2340';}
  // Badge (stock code)
  const badge=document.getElementById('badge');
  if(badge){
    badge.style.background=D?'#081728':'#dbeafe';
    badge.style.borderColor=D?'#0f3860':'#93c5fd';
  }
  const symCode=document.getElementById('sym-code');
  if(symCode){symCode.style.color=D?'#4ab0ff':'#1d4ed8';}
  const symSar=document.getElementById('sym-sar');
  if(symSar){symSar.style.color=D?'#0e3560':'#6b7280';}
  // Per button
  const perBtn=document.getElementById('per-btn');
  if(perBtn){
    perBtn.style.background=D?'#1a2235':'#e2e8f2';
    perBtn.style.borderColor=D?'#2a3a55':'#c5d0e0';
    perBtn.style.color=D?'#c0d0e8':'#1a2340';
  }
  // ibtn buttons
  document.querySelectorAll('.ibtn').forEach(btn=>{
    btn.style.background=D?'#111827':'#e8edf5';
    btn.style.borderColor=D?'#1a2235':'#c5d0e0';
  });
  document.querySelectorAll('.ibtn span').forEach(sp=>{
    sp.style.color=D?'#4a6585':'#4a5568';
  });
  document.querySelectorAll('.ibtn svg').forEach(sv=>{
    sv.querySelectorAll('line,path,polyline,rect,circle,polygon').forEach(el=>{
      if(!el.closest('.ibtn.active'))el.setAttribute('stroke',D?'#94a3b8':'#4a5568');
    });
  });
  // Theme button itself
  const themeBtn=document.getElementById('btn-theme');
  if(themeBtn){
    themeBtn.style.background=D?'#1a2235':'#e2e8f2';
    themeBtn.style.borderColor=D?'#2a3a55':'#c5d0e0';
  }
}

function toggleReplay(){
  if(replayMode){_stopReplay();return;}
  _startReplay();
}
function _startReplay(){
  replayMode=true;
  const total=state.allCandles.length;
  replayIdx=Math.max(10,Math.floor(total*0.35));
  const vis=Math.min(30,replayIdx);
  state.visible=vis;
  state.offset=total-replayIdx; // newest revealed candle on RIGHT
  const btn=document.getElementById('btn-replay');
  if(btn){btn.classList.add('active');btn.style.borderColor='#ef4444';}
  _showReplayBar();
  const pos=document.getElementById('replay-pos');
  if(pos){
   const d0=state.allCandles[replayIdx-1];
   const dt0=d0&&d0.t?new Date(d0.t).toLocaleDateString('ar-SA-u-nu-latn',{year:'numeric',month:'short',day:'numeric',weekday:'short'}):'-';
   pos.textContent=dt0+' | '+replayIdx+' / '+total;
   pos.style.cssText='font-size:9px;color:#a78bfa;font-family:Cairo,monospace;flex:1;text-align:center;font-weight:600';
  }
  render();
}
function _stopReplay(){
  if(replayTimer){clearInterval(replayTimer);replayTimer=null;}
  replayMode=false;
  // Restore full chart view
  state.visible=Math.min(50,state.allCandles.length);
  state.offset=0;
  const btn=document.getElementById('btn-replay');
  if(btn){btn.classList.remove('active');btn.style.borderColor='';}
  _hideReplayBar();render();
}
function _replayStep(dir){
  if(!replayMode)return;
  const total=state.allCandles.length;
  replayIdx=Math.max(10,Math.min(total,replayIdx+dir));
  // Show candles 0..replayIdx, anchored so newest revealed is on RIGHT
  const vis=Math.min(50,replayIdx);
  state.visible=vis;
  // offset = how many candles from END are hidden
  // We want to show up to candle[replayIdx-1] on right edge
  state.offset=total-replayIdx;
  // Update position label
  const pos=document.getElementById('replay-pos');
  if(pos){
   const d=state.allCandles[replayIdx-1];
   const dt=d&&d.t?new Date(d.t).toLocaleDateString('ar-SA-u-nu-latn',{year:'numeric',month:'short',day:'numeric',weekday:'short'}):'-';
   const tm=d&&d.t?new Date(d.t).toLocaleTimeString('ar-SA-u-nu-latn',{hour:'2-digit',minute:'2-digit',hour12:false}):'';
   pos.textContent=dt+(tm?' '+tm:'')+' | '+replayIdx+'/'+total;
   pos.style.cssText='font-size:9px;color:#a78bfa;font-family:Cairo,monospace;flex:1;text-align:center;font-weight:600';
  }
  // Stop at last candle
  if(replayIdx>=total&&replayTimer){
    clearInterval(replayTimer);replayTimer=null;
    const pauseBtn=document.getElementById('replay-pause');
    if(pauseBtn)pauseBtn.textContent='انتهى';
  }
  render();
}
function _replayPlay(spd){
  if(replayTimer){clearInterval(replayTimer);replayTimer=null;}
  const total=state.allCandles.length;
  replayTimer=setInterval(()=>{
    if(replayIdx>=total){
      clearInterval(replayTimer);replayTimer=null;
      return;
    }
    _replayStep(1);
  },spd);
}
function _showReplayBar(){
  let bar=document.getElementById('replay-bar');
  if(!bar){
    bar=document.createElement('div');
    bar.id='replay-bar';
    bar.style.cssText='position:fixed;bottom:0;left:0;right:0;background:rgba(6,10,22,0.97);border-top:1px solid rgba(167,139,250,0.3);padding:6px 12px;z-index:800;display:flex;align-items:center;gap:8px;-webkit-user-select:none';
    // Step buttons
    const stepBack=document.createElement('button');
    stepBack.textContent='‹';
    stepBack.style.cssText='background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e0eaf8;font-size:16px;width:36px;height:34px;cursor:pointer;flex-shrink:0';
    stepBack.onclick=()=>_replayStep(1);
    bar.appendChild(stepBack);

    // Speed selector
    const speeds=[{l:'×½',v:1200},{l:'×1',v:700},{l:'×2',v:350},{l:'×4',v:150}];
    let activeSpd=speeds[1];
    const spdWrap=document.createElement('div');
    spdWrap.style.cssText='display:flex;gap:4px;flex-shrink:0';
    speeds.forEach(spd=>{
      const b=document.createElement('button');
      b.textContent=spd.l;
      b.style.cssText='background:'+(spd===activeSpd?'rgba(167,139,250,0.25)':'rgba(167,139,250,0.08)')+';border:1px solid rgba(167,139,250,'+(spd===activeSpd?'0.5':'0.2')+');border-radius:8px;color:#a78bfa;font-size:11px;width:36px;height:34px;cursor:pointer;font-family:monospace;flex-shrink:0;font-weight:700';
      b.id='replay-spd-'+spd.v;
      b.onclick=()=>{
        activeSpd=spd;
        spdWrap.querySelectorAll('button').forEach(bb=>{
          const isActive=bb.id==='replay-spd-'+spd.v;
          bb.style.background=isActive?'rgba(167,139,250,0.25)':'rgba(167,139,250,0.08)';
          bb.style.borderColor=isActive?'rgba(167,139,250,0.5)':'rgba(167,139,250,0.2)';
        });
        if(replayTimer)_replayPlay(spd.v);
      };
      spdWrap.appendChild(b);
    });
    bar.appendChild(spdWrap);

    // Play / Pause
    const playBtn=document.createElement('button');
    playBtn.id='replay-playbtn';
    playBtn.innerHTML='<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><polygon points="3,2 13,8 3,14" fill="currentColor"/></svg>';
    playBtn.style.cssText='background:rgba(167,139,250,0.15);border:1px solid rgba(167,139,250,0.3);border-radius:8px;color:#a78bfa;font-size:12px;width:36px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0';
    let _playing=false;
    playBtn.onclick=()=>{
      _playing=!_playing;
      if(_playing){
        _replayPlay(activeSpd.v);
        playBtn.innerHTML='<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="2" width="4" height="12" fill="currentColor"/><rect x="10" y="2" width="4" height="12" fill="currentColor"/></svg>';
      } else {
        if(replayTimer){clearInterval(replayTimer);replayTimer=null;}
        playBtn.innerHTML='<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><polygon points="3,2 13,8 3,14" fill="currentColor"/></svg>';
      }
    };
    bar.appendChild(playBtn);

    // Step forward
    const stepFwd=document.createElement('button');
    stepFwd.textContent='›';
    stepFwd.style.cssText='background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#e0eaf8;font-size:16px;width:36px;height:34px;cursor:pointer;flex-shrink:0';
    stepFwd.onclick=()=>_replayStep(-1);
    bar.appendChild(stepFwd);
    const pos=document.createElement('span');
    pos.id='replay-pos';
    pos.style.cssText='font-size:9px;color:#4a6080;font-family:monospace;flex:1;text-align:center';
    bar.appendChild(pos);
    const stopB=document.createElement('button');
    stopB.textContent='إنهاء';
    stopB.onclick=_stopReplay;
    stopB.style.cssText='background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:8px;color:#ef4444;font-size:11px;padding:0 12px;height:34px;cursor:pointer;font-family:Cairo,sans-serif;flex-shrink:0';
    bar.appendChild(stopB);
    document.body.appendChild(bar);
  }
  bar.style.display='flex';
}
function _hideReplayBar(){
  const bar=document.getElementById('replay-bar');
  if(bar)bar.style.display='none';
}

function toggleCamMenu(){
  const m=document.getElementById('cam-menu');
  if(!m)return;
  if(m.style.display==='block'){m.style.display='none';return;}
  const btn=document.getElementById('btn-cam');
  if(btn){
    const r=btn.getBoundingClientRect();
    const mw=160;
    const top=r.bottom+6;
    // Calculate left so menu doesn't go off screen
    let left=r.left+r.width/2-mw/2; // center under button
    left=Math.max(6, Math.min(window.innerWidth-mw-6, left));
    m.style.top=top+'px';
    m.style.left=left+'px';
    m.style.right='auto';
    m.style.width=mw+'px';
  }
  m.style.display='block';
  setTimeout(()=>document.addEventListener('click',_closeCamOnOutside,{once:true}),10);
}
function _closeCamOnOutside(e){
  const m=document.getElementById('cam-menu');
  if(m&&!m.contains(e.target))m.style.display='none';
}
function closeCamMenu(){
  const m=document.getElementById('cam-menu');
  if(m)m.style.display='none';
}
function doSnap(){
 try{
  const dpr=window.devicePixelRatio||1;
  const barH=64*dpr; // ارتفاع شريط المعلومات (مساحة إضافية أسفل الشارت، بدون تراكب)
  const tmp=document.createElement('canvas');
  tmp.width=cv.width;
  tmp.height=cv.height+barH;
  const tc=tmp.getContext('2d');
  // خلفية كاملة أولاً (تغطي كامل الكانفس الجديد بما فيه المساحة الإضافية)
  tc.fillStyle='#070b12';
  tc.fillRect(0,0,tmp.width,tmp.height);
  // انسخ الشارت الأصلي كما هو بأعلى الصورة (بدون أي scale إضافي)
  tc.drawImage(cv,0,0);

  const sym=state.stk?.sym||'';
  const per=state.per||'';
  const name=state.stk?.name||'';
  const now=new Date();
  const dateStr=now.getFullYear()+'/'+(now.getMonth()+1)+'/'+now.getDate()+' '+now.getHours()+':'+(now.getMinutes()<10?'0':'')+now.getMinutes();

  // ── شريط المعلومات: يبدأ فوراً بعد نهاية الشارت الأصلي (منطقة منفصلة تماماً، بدون تراكب) ──
  const barY=cv.height;
  tc.fillStyle='rgba(6,10,20,0.97)';
  tc.fillRect(0,barY,tmp.width,barH);
  tc.strokeStyle='rgba(59,158,255,0.25)';
  tc.lineWidth=1*dpr;
  tc.beginPath();tc.moveTo(0,barY);tc.lineTo(tmp.width,barY);tc.stroke();

  const pad=16*dpr;
  const rowY1=barY+12*dpr;
  const rowY2=barY+36*dpr;

  // السطر العلوي يمين: الاسم مع الرمز بجانب بعض
  tc.textAlign='right';tc.textBaseline='top';
  tc.font=`700 ${14*dpr}px Cairo,sans-serif`;
  tc.fillStyle='rgba(240,244,255,0.98)';
  const nameAndSym=name?`${name} (${sym})`:sym;
  tc.fillText(nameAndSym,tmp.width-pad,rowY1);

  // السطر العلوي يسار: الفريم
  tc.textAlign='left';
  tc.font=`600 ${12*dpr}px Cairo,sans-serif`;
  tc.fillStyle='rgba(150,165,190,0.9)';
  tc.fillText(per,pad,rowY1);

  // السطر السفلي يمين: السعر
  const priceStr=state.stk?.p?state.stk.p.toFixed(2):'';
  tc.textAlign='right';
  tc.font=`700 ${13*dpr}px Cairo,monospace`;
  tc.fillStyle='rgba(59,158,255,0.95)';
  tc.fillText(priceStr,tmp.width-pad,rowY2);

  // السطر السفلي، يمين قبل السعر مباشرة: المؤشرات المفعّلة
  const indsStr=(state.inds&&state.inds.length)?state.inds.join(' · '):'';
  if(indsStr){
   tc.font=`700 ${13*dpr}px Cairo,monospace`;
   const priceActualW=tc.measureText(priceStr).width;
   tc.font=`500 ${10*dpr}px Cairo,monospace`;
   tc.fillStyle='rgba(120,200,150,0.85)';
   tc.fillText(indsStr,tmp.width-pad-priceActualW-10*dpr,rowY2+2*dpr);
  }

  // السطر السفلي يسار: التاريخ والوقت
  tc.textAlign='left';
  tc.font=`500 ${10*dpr}px Cairo,monospace`;
  tc.fillStyle='rgba(130,145,165,0.8)';
  tc.fillText(dateStr,pad,rowY2);

  tmp.toBlob(blob=>{
   const t=document.getElementById('toast');
   t.textContent='📸 تم حفظ الصورة';
   t.style.display='block';
   t.classList.add('show');
   setTimeout(()=>{t.classList.remove('show');t.style.display='none';},2500);
   try{
    let chartImage='';
    try{ chartImage=tmp.toDataURL('image/jpeg',0.5); }catch(imgErr){
      const t=document.getElementById('toast');
      t.textContent='❌ toDataURL: '+imgErr.message;
      t.style.display='block';t.classList.add('show');
      setTimeout(()=>{t.classList.remove('show');t.style.display='none';},4000);
      return;
    }
    const snapData={
     type:'TADAWUL_SNAPSHOT',
     sym:state.stk?.sym||'',
     name:state.stk?.name||'',
     price:state.stk?.p||0,
     per:state.per||'',
     date:new Date().toISOString().slice(0,16).replace('T',' '),
     pct:state.stk?.pct||0,
     rsi:window._lastRSI||null,
     macd:window._lastMACDSig||null,
     indicators: state.inds||[],
     vol:state.stk?.vol||null,
     note:(state.stk?.name||'')+' -- '+(state.per||''),
     chartImage,
    };
    try{
  var existing=JSON.parse(localStorage.getItem('tadawul_snapshots')||'[]');
  existing.unshift(snapData);
  localStorage.setItem('tadawul_snapshots', JSON.stringify(existing.slice(0,20)));
  const t2=document.getElementById('toast');
  t2.textContent='✅ حُفظت';
  t2.style.display='block';t2.classList.add('show');
  setTimeout(()=>{t2.classList.remove('show');t2.style.display='none';},3000);
}catch(ex){
  const t2=document.getElementById('toast');
  t2.textContent='❌ '+ex.message;
  t2.style.display='block';t2.classList.add('show');
  setTimeout(()=>{t2.classList.remove('show');t2.style.display='none';},3000);
}

    window.postMessage(snapData,'*');
  
    window.dispatchEvent(new CustomEvent('tadawulSnapshot',{detail:snapData}));
   }catch(ex){}
  },'image/png');
 }catch(e){
  const t=document.getElementById('toast');
  t.textContent='خطأ في الحفظ';
  t.style.display='block';
  t.classList.add('show');
  setTimeout(()=>{t.classList.remove('show');t.style.display='none';},2000);
 }
}

// ── توليد صورة الشارت مع العلامة المائية (نفس منطق doSnap، بدون التخزين الداخلي) ──
// تُستخدم من saveChartToDevice و shareChartImage
function _generateChartSnapshotBlob(){
 return new Promise((resolve,reject)=>{
  try{
   const dpr=window.devicePixelRatio||1;
   const barH=64*dpr; // ارتفاع شريط المعلومات (مساحة إضافية أسفل الشارت، بدون تراكب)
   const tmp=document.createElement('canvas');
   tmp.width=cv.width;
   tmp.height=cv.height+barH;
   const tc=tmp.getContext('2d');
   // خلفية كاملة أولاً (تغطي كامل الكانفس الجديد بما فيه المساحة الإضافية)
   tc.fillStyle='#070b12';
   tc.fillRect(0,0,tmp.width,tmp.height);
   // انسخ الشارت الأصلي كما هو بأعلى الصورة
   tc.drawImage(cv,0,0);

   const sym=state.stk?.sym||'';
   const per=state.per||'';
   const name=state.stk?.name||'';
   const now=new Date();
   const dateStr=now.getFullYear()+'/'+(now.getMonth()+1)+'/'+now.getDate()+' '+now.getHours()+':'+(now.getMinutes()<10?'0':'')+now.getMinutes();

   // ── شريط المعلومات: يبدأ فوراً بعد نهاية الشارت الأصلي (منطقة منفصلة تماماً) ──
   const barY=cv.height;
   tc.fillStyle='rgba(6,10,20,0.97)';
   tc.fillRect(0,barY,tmp.width,barH);
   tc.strokeStyle='rgba(59,158,255,0.25)';
   tc.lineWidth=1*dpr;
   tc.beginPath();tc.moveTo(0,barY);tc.lineTo(tmp.width,barY);tc.stroke();

   const pad=16*dpr;
   const rowY1=barY+12*dpr;
   const rowY2=barY+36*dpr;

   // السطر العلوي يمين: الاسم مع الرمز بجانب بعض
   tc.textAlign='right';tc.textBaseline='top';
   tc.font=`700 ${14*dpr}px Cairo,sans-serif`;
   tc.fillStyle='rgba(240,244,255,0.98)';
   const nameAndSym=name?`${name} (${sym})`:sym;
   tc.fillText(nameAndSym,tmp.width-pad,rowY1);

   // السطر العلوي يسار: الفريم
   tc.textAlign='left';
   tc.font=`600 ${12*dpr}px Cairo,sans-serif`;
   tc.fillStyle='rgba(150,165,190,0.9)';
   tc.fillText(per,pad,rowY1);

   // السطر السفلي يمين: السعر
   const priceStr=state.stk?.p?state.stk.p.toFixed(2):'';
   tc.textAlign='right';
   tc.font=`700 ${13*dpr}px Cairo,monospace`;
   tc.fillStyle='rgba(59,158,255,0.95)';
   tc.fillText(priceStr,tmp.width-pad,rowY2);

   // السطر السفلي، يمين قبل السعر مباشرة: المؤشرات المفعّلة
   const indsStr=(state.inds&&state.inds.length)?state.inds.join(' · '):'';
   if(indsStr){
    tc.font=`700 ${13*dpr}px Cairo,monospace`;
    const priceActualW=tc.measureText(priceStr).width;
    tc.font=`500 ${10*dpr}px Cairo,monospace`;
    tc.fillStyle='rgba(120,200,150,0.85)';
    tc.fillText(indsStr,tmp.width-pad-priceActualW-10*dpr,rowY2+2*dpr);
   }

   // السطر السفلي يسار: التاريخ والوقت
   tc.textAlign='left';
   tc.font=`500 ${10*dpr}px Cairo,monospace`;
   tc.fillStyle='rgba(130,145,165,0.8)';
   tc.fillText(dateStr,pad,rowY2);

   tmp.toBlob(blob=>{
    if(!blob){reject(new Error('فشل توليد الصورة'));return;}
    const filename='تداول_'+sym+'_'+per+'_'+now.toISOString().slice(0,10)+'.png';
    resolve(new File([blob],filename,{type:'image/png'}));
   },'image/png');
  }catch(e){reject(e);}
 });
}

function _toastMsg(msg,ms=2500){
 const t=document.getElementById('toast');
 if(!t)return;
 t.textContent=msg;
 t.style.display='block';
 t.classList.add('show');
 setTimeout(()=>{t.classList.remove('show');t.style.display='none';},ms);
}

// ── حفظ الصورة على الجهاز ──
async function saveChartToDevice(){
 try{
  const file=await _generateChartSnapshotBlob();
  // على الجوال: افتح Share Sheet (يعطي خيار "حفظ الصورة" ضمن الخيارات مباشرة)
  if(navigator.canShare && navigator.canShare({files:[file]})){
   await navigator.share({files:[file],title:'لقطة الشارت'});
   _toastMsg('✓ تم');
   return;
  }
  // احتياطي: تنزيل تقليدي (كمبيوتر أو متصفح لا يدعم Web Share API)
  const link=document.createElement('a');
  link.download=file.name;
  link.href=URL.createObjectURL(file);
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),3000);
  _toastMsg('✓ تم حفظ الصورة');
 }catch(e){
  if(e.name!=='AbortError'){
   console.warn('Save error:',e);
   _toastMsg('⚠ حدث خطأ أثناء الحفظ');
  }
 }
}

// ── مشاركة الصورة عبر تطبيقات الجوال ──
async function shareChartImage(){
 try{
  const file=await _generateChartSnapshotBlob();
  if(navigator.canShare && navigator.canShare({files:[file]})){
   await navigator.share({
    files:[file],
    title:'تداول بلس -- '+(state.stk?.name||''),
    text:(state.stk?.name||'')+' · '+(state.per||'')
   });
   _toastMsg('✓ تم');
  }else{
   _toastMsg('⚠ المشاركة غير مدعومة على هذا المتصفح');
  }
 }catch(e){
  if(e.name!=='AbortError'){
   console.warn('Share error:',e);
   _toastMsg('⚠ حدث خطأ أثناء المشاركة');
  }
 }
}

