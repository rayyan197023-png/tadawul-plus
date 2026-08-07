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