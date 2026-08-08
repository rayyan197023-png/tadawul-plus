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

