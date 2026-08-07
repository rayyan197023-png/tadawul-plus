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

