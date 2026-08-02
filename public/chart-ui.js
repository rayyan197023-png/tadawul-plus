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