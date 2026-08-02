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

