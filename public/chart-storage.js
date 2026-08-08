function saveTemplate(){
  const name=prompt('اسم القالب:','قالبي');if(!name||!name.trim())return;
  try{
    const tpls=JSON.parse(localStorage.getItem('tadawul_templates_v1')||'[]');
    tpls.unshift({name:name.trim(),date:new Date().toLocaleDateString('ar-SA'),inds:[...state.inds],ct:state.chartType,per:state.per,drawings:state.drawings.map(d=>({...d,pts:d.pts?[...d.pts]:undefined})),id:Date.now()});
    localStorage.setItem('tadawul_templates_v1',JSON.stringify(tpls.slice(0,10)));
    const t=document.getElementById('toast');t.textContent='حُفظ القالب: '+name;t.classList.add('show');setTimeout(()=>{t.classList.remove('show');t.textContent='تم';},2000);
  }catch(e){}
}
function loadTemplateMenu(){
  try{
    const tpls=JSON.parse(localStorage.getItem('tadawul_templates_v1')||'[]');
    if(!tpls.length){const t=document.getElementById('toast');t.textContent='لا توجد قوالب';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000);return;}
    const names=tpls.map((t,i)=>(i+1)+'. '+t.name).join('\n');
    const idx=parseInt(prompt('اختر رقم القالب:\n'+names));
    if(!idx||isNaN(idx))return;
    const tpl=tpls[idx-1];if(!tpl)return;
    _hist();
    if(tpl.inds)state.inds=[...tpl.inds];
    if(tpl.ct)state.chartType=tpl.ct;
    if(tpl.drawings)state.drawings=tpl.drawings;
    updateIndBadge();saveSettings();saveDrawings();render();
    const t=document.getElementById('toast');t.textContent='تطبيق: '+tpl.name;t.classList.add('show');setTimeout(()=>{t.classList.remove('show');t.textContent='تم';},2000);
  }catch(e){}
}

// ── Cloud Sync (Export/Import) ─────────────────────────────────
function exportDrawings(){
 try{
  const data={
   version:'tadawul_v247',
   sym:state.stk.sym,
   per:state.per,
   drawings:state.drawings.filter(d=>!d._ai),
   alerts:state.alerts||[],
   inds:state.inds,
   chartType:state.chartType,
   exported:new Date().toISOString()
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`تداول_${state.stk.sym}_${new Date().toLocaleDateString('ar')}.json`;
  a.click();URL.revokeObjectURL(url);
  const t=document.getElementById('toast');
  if(t){t.textContent='✓ تم تصدير الرسومات';t.style.display='block';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',2000);}
 }catch(e){console.error('Export error:',e);}
}

function importDrawings(){
 const inp=document.createElement('input');
 inp.type='file';inp.accept='.json';
 inp.onchange=e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
   try{
    const data=JSON.parse(ev.target.result);
    if(data.version&&data.drawings){
     _hist();
     // Merge or replace
     const existing=state.drawings.filter(d=>d._ai);
     state.drawings=[...existing,...data.drawings.map(d=>({...d,id:Date.now()+Math.random()}))];
     if(data.inds&&Array.isArray(data.inds))state.inds=data.inds;
     if(data.chartType)state.chartType=data.chartType;
     saveDrawings();_updateUndoButtons();invalidateChart();render();
     const t=document.getElementById('toast');
     if(t){t.textContent='✓ تم استيراد '+(data.drawings.length)+' رسمة';t.style.display='block';t.style.opacity='1';setTimeout(()=>t.style.opacity='0',2500);}
    }
   }catch(err){alert('ملف غير صالح');}
  };
  reader.readAsText(file);
 };
 inp.click();
}


// Load shared chart from URL on startup
function loadShareFromURL(){
 try{
  const params=new URLSearchParams(window.location.search);
  const symParam=params.get('sym');
  if(symParam){
   const stk=STOCKS.find(s=>s.sym===symParam);
   if(stk){state.stk=stk;}
  }
 }catch(e){}
 const hash=window.location.hash;
 if(!hash.startsWith('#share='))return;
 try{
  const data=JSON.parse(decodeURIComponent(atob(hash.slice(7))));
  if(data.sym){
   const stk=STOCKS.find(s=>s.sym===data.sym);
   if(stk)state.stk=stk;
  }
  if(data.per)state.per=data.per;
  if(data.drawings&&Array.isArray(data.drawings)){
   setTimeout(()=>{
    state.drawings=[...state.drawings,...data.drawings.map(d=>({...d,id:Date.now()+Math.random()}))];
    saveDrawings();invalidateChart();render();
   },500);
  }
 }catch(e){}
}

function saveSettings(){try{localStorage.setItem(LS_SET,JSON.stringify({inds:state.inds,per:state.per,ct:state.chartType,drawColor:state.drawColor,logScale,yScale,darkTheme,activeStrategy,indSettings,customInds,drawingTemplates,panelSizes}));}catch(e){}}
function loadSettings(){try{const s=JSON.parse(localStorage.getItem(LS_SET)||'{}');if(s.inds)state.inds=s.inds;if(s.per)state.per=s.per;if(s.ct)state.chartType=s.ct;if(s.drawColor)state.drawColor=s.drawColor;if(typeof s.logScale==='boolean')logScale=s.logScale;if(typeof s.yScale==='number')yScale=s.yScale;
 if(typeof s.darkTheme==='boolean')darkTheme=s.darkTheme;
 if(s.activeStrategy)activeStrategy=s.activeStrategy;
 if(s.indSettings&&typeof s.indSettings==='object')indSettings={...s.indSettings}; if(s.customInds&&Array.isArray(s.customInds))customInds=s.customInds; if(s.drawingTemplates&&Array.isArray(s.drawingTemplates))drawingTemplates=s.drawingTemplates; if(s.panelSizes&&typeof s.panelSizes==='object')panelSizes={...s.panelSizes};}catch(e){}}
 
 
