// ── Audio Context Cache (iOS-friendly) ─────────────
let _sharedAudioCtx = null;
function getAudioContext(){
  if(!_sharedAudioCtx){
    try{
      _sharedAudioCtx = new(window.AudioContext||window.webkitAudioContext)();
    }catch(e){return null;}
  }
  return _sharedAudioCtx;
}


// ALERT
// 

function requestNotifPerm(){
 if('Notification' in window&&Notification.permission==='default'){
 Notification.requestPermission();
 }
}
function sendNotif(title,body){
 if('Notification' in window&&Notification.permission==='granted'){
 new Notification(title,{body,icon:'',dir:'rtl',lang:'ar'});
 }
}

function _setAlertType(t){
  _alertType=t;
  const ab=document.getElementById('alt-above');
  const bl=document.getElementById('alt-below');
  if(!ab||!bl)return;
  if(t==='above'){
    ab.style.background='rgba(34,197,94,0.2)';ab.style.borderColor='#22c55e';ab.style.color='#22c55e';
    bl.style.background='rgba(239,68,68,0.06)';bl.style.borderColor='rgba(239,68,68,0.2)';bl.style.color='#ef4444';
  } else {
    bl.style.background='rgba(239,68,68,0.2)';bl.style.borderColor='#ef4444';bl.style.color='#ef4444';
    ab.style.background='rgba(34,197,94,0.06)';ab.style.borderColor='rgba(34,197,94,0.2)';ab.style.color='#22c55e';
  }
}

function _buildAlertShortcuts(){
  const el=document.getElementById('alert-shortcuts');
  if(!el)return;
  // Use last traded price from candles (most accurate)
  const all=state.allCandles;
  const lastPrice=all&&all.length?all[all.length-1].c:state.stk.p;
  const opts=[
    {pct:+0.5},{pct:+1},{pct:+2},{pct:+3},{pct:+5},
    {pct:-0.5},{pct:-1},{pct:-2},{pct:-3},{pct:-5},
  ];
  el.innerHTML=opts.map(({pct})=>{
    const targetPrice=+(lastPrice*(1+pct/100)).toFixed(2);
    const diff=+(targetPrice-lastPrice).toFixed(2);
    const isUp=pct>0;
    const type=isUp?'above':'below';
    const clr=isUp?'34,197,94':'239,68,68';
    const diffStr=(isUp?'+':'')+diff.toFixed(2);
    return '<button onclick="_applyShortcut('+targetPrice+',\''+type+'\')" ontouchend="event.preventDefault();_applyShortcut('+targetPrice+',\''+type+'\')" style="flex:1;min-width:70px;padding:8px 4px;border-radius:10px;background:rgba('+clr+',0.08);border:1px solid rgba('+clr+',0.25);cursor:pointer;text-align:center">'
      +'<div style="font-size:9px;font-weight:700;color:rgb('+clr+');font-family:Cairo,sans-serif">'+(isUp?'▲':'▼')+' '+(isUp?'+':'')+pct+'%</div>'
      +'<div style="font-size:11px;font-weight:900;color:#f0f2f8;font-family:monospace;margin-top:2px">'+targetPrice+'</div>'
      +'<div style="font-size:8px;color:rgba('+clr+',0.8);font-family:monospace">'+diffStr+'</div>'
      +'</button>';
  }).join('');
}

function _applyShortcut(price,type){
  const inp=document.getElementById('alert-inp');
  if(inp)inp.value=price;
  _setAlertType(type);
}

function setAlert(){
  const v=parseFloat(document.getElementById('alert-inp').value);
  if(!v||isNaN(v)){
    const inp=document.getElementById('alert-inp');
    if(inp){inp.style.borderColor='#ef4444';setTimeout(()=>inp.style.borderColor='#1e2d45',1500);}
    return;
  }
  requestNotifPerm();
  state.alert=v;
  state._alertType=_alertType;
  state._alertFired=false;
  document.getElementById('btn-alert')?.classList.add('active');
  // Show active row
  const ar=document.getElementById('alert-active-row');
  const at=document.getElementById('alert-active-text');
  if(ar)ar.style.display='block';
  if(at)at.textContent=(_alertType==='above'?'▲ اختراق صعود فوق ':'▼ هبوط تحت ')+v.toFixed(2)+' ر.س';
  // Toast
  const toast=document.getElementById('toast');
  if(toast){toast.textContent='🔔 تنبيه نشط عند '+v.toFixed(2)+' ر.س';toast.style.display='block';toast.classList.add('show');setTimeout(()=>{toast.classList.remove('show');toast.style.display='none';},2500);}
  closeSheet();
  setTimeout(()=>{sizeChart();render();},280);
}
function cancelAlert(){
  state.alert=null;
  state.alerts=[];state._alertFired=false;state._alertType=null;
  document.getElementById('btn-alert')?.classList.remove('active');
  const ar=document.getElementById('alert-active-row');
  if(ar)ar.style.display='none';
  const toast=document.getElementById('toast');
  if(toast){toast.textContent='تم إلغاء التنبيه';toast.style.display='block';toast.classList.add('show');setTimeout(()=>{toast.classList.remove('show');toast.style.display='none';},2000);}
  closeSheet();
  setTimeout(()=>{sizeChart();render();},280);
}

