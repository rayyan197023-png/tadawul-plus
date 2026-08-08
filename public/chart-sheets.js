// SHEETS
// 
function openSheet(id){
 closeMenus();
 if(id==='strat')buildStratList();
 if(id==='draw')buildDrawSheet();
 if(id==='stock'){
  _stkSearchQuery='';
  buildStkList();
  setTimeout(()=>{
   const inp=document.getElementById('stk-search-inp');
   if(inp)inp.value='';
   _initStkSearch();
  },50);
 }
 if(id==='ind')buildIndList();
 if(id==='alert'){
 // Use last traded price from candles (most accurate)
 const _lastC=state.allCandles;
 const _lastP=_lastC&&_lastC.length?_lastC[_lastC.length-1].c:state.stk.p;
 document.getElementById('alert-disp').textContent=_lastP.toFixed(2);
 _buildAlertShortcuts();
 _setAlertType(state._alertType||'above');
 const ar=document.getElementById('alert-active-row');
 const at=document.getElementById('alert-active-text');
 if(state.alert!=null&&ar&&at){
   ar.style.display='block';
   at.textContent=((state._alertType||'above')==='above'?'▲ اختراق صعود فوق ':'▼ هبوط تحت ')+state.alert.toFixed(2)+' ر.س';
 } else if(ar){ ar.style.display='none'; }
 }
 document.getElementById('sbg').classList.add('show');
 document.getElementById('sheet-'+id).classList.add('show');
 openSht=id;
}
function closeSheet(){
 if(openSht)document.getElementById('sheet-'+openSht)?.classList.remove('show');
 document.getElementById('sbg').classList.remove('show');
 openSht=null;
}

// STOCKS
// 
function buildStkList(){
 const el=document.getElementById('stk-list');
 if(!el)return;
 el.innerHTML='';

 const q=(_stkSearchQuery||'').trim().toLowerCase();
 const list=!q?STOCKS:STOCKS.filter(s=>{
  const name=(s.name||'').toLowerCase();
  const nameEn=(s.name_en||'').toLowerCase();
  const sym=(s.sym||'').toLowerCase();
  return name.includes(q)||nameEn.includes(q)||sym.includes(q);
 });

 if(!list.length){
  el.innerHTML='<div style="text-align:center;padding:30px 16px;color:#3a4060;font-size:12px;font-family:Cairo,sans-serif">لا توجد نتائج مطابقة</div>';
  return;
 }

 list.forEach(s=>{
  const row=document.createElement('button');row.className='srow';
  row.style.background=state.stk.sym===s.sym?'rgba(59,158,255,0.06)':'transparent';
row.innerHTML=`<div style="display:flex;width:100%;align-items:center;justify-content:space-between;direction:rtl"><span style="font-size:15px;font-weight:800;color:#f0f2f8">${s.name}</span><span style="font-size:12px;color:#3b9eff;font-family:monospace">${s.sym}</span></div>`;
  row.onclick=()=>{state.stk=s;chartReady=false;showLoader(s.name);loadStk();closeSheet();};
  el.appendChild(row);
 });
}

function _initStkSearch(){
 const inp=document.getElementById('stk-search-inp');
 if(!inp||inp._bound)return;
 inp._bound=true;
 inp.addEventListener('input',()=>{
  _stkSearchQuery=inp.value;
  buildStkList();
 });
}

function buildIndList(){
 const cats=[...new Set(ALL_IND.map(i=>i.cat))];
 const el=document.getElementById('ind-list');el.innerHTML='';
 cats.forEach(cat=>{
  const ch=document.createElement('div');ch.className='icat';ch.textContent=cat;el.appendChild(ch);
  ALL_IND.filter(i=>i.cat===cat).forEach(ind=>{
   const active=state.inds.includes(ind.id);
   const cfg=getIS(ind.id);
   const row=document.createElement('div');
   row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:10px;margin-bottom:3px;background:'+(active?ind.c+'08':'transparent')+';border:1px solid '+(active?ind.c+'20':'transparent');
   // Left: toggle area
   const left=document.createElement('button');
   left.style.cssText='display:flex;align-items:center;gap:8px;flex:1;background:transparent;border:none;cursor:pointer;padding:0;text-align:right';
   left.innerHTML=`<div class="ichk" style="${active?'background:'+ind.c+'20;border-color:'+ind.c+'50':''}"><span style="color:${ind.c};font-size:12px">${active?'✓':''}</span></div><div class="idot" style="background:${active?ind.c:ind.c+'20'}"></div><span class="ilbl" style="${active?'color:'+ind.c+';font-weight:700':''}">${ind.l}</span>`;
   left.onclick=()=>{
    if(state.inds.includes(ind.id))state.inds=state.inds.filter(x=>x!==ind.id);
    else state.inds.push(ind.id);
    saveSettings();updateIndBadge();buildIndList();invalidateChart();render();
   };
   row.appendChild(left);
   // Right: settings gear (only if indicator has configurable params)
   const hasCfg=IND_DEFAULTS[ind.id]&&Object.keys(IND_DEFAULTS[ind.id]).length>1;
   if(hasCfg){
    const gear=document.createElement('button');
    gear.style.cssText='background:rgba(59,158,255,0.08);border:1px solid rgba(59,158,255,0.2);border-radius:7px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;font-size:14px;margin-right:4px;opacity:'+(active?'1':'0.4');
    gear.textContent='⚙';
    gear.title='إعدادات '+ind.l;
    gear.onclick=(e)=>{e.stopPropagation();showIndSettings(ind.id,ind.l,ind.c);};
    row.appendChild(gear);
   }
   el.appendChild(row);
  });
 });
}

function updateIndBadge(){
 const n=state.inds.length;
 const b=document.getElementById('ind-n');b.style.display=n?'inline-block':'none';b.textContent=n;
 document.getElementById('ind-apply').textContent='تطبيق ('+n+')';
 document.getElementById('btn-ind').classList.toggle('active',n>0);
}
function clearInds(){state.inds=[];updateIndBadge();buildIndList();invalidateChart();render();}

