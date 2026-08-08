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

// 
function buildDrawSheet(){

 // Active bar
 // Clear all button
 const clearBtn=document.getElementById('draw-clear-all');
 if(clearBtn)clearBtn.onclick=()=>{if(confirm('حذف جميع الرسومات؟ لا يمكن التراجع بعد المسح الكامل.')){_hist();clearDrawings();}};
 const ab=document.getElementById('draw-active-bar');
 if(state.tool){
 const t=DRAW_TOOLS_LIST.find(t=>t.id===state.tool);
 ab.style.display='block';
 ab.textContent='الأداة النشطة: '+(t?t.l:state.tool);
 } else ab.style.display='none';
 // Categories
 const el=document.getElementById('draw-cats-el');el.innerHTML='';
 DRAW_CATS.forEach(cat=>{
 const hasActive=cat.tools.some(t=>t.id===state.tool);
 const hdr=document.createElement('button');hdr.className='dcat'+(hasActive?' open':'');
 hdr.innerHTML='<span class="dcat-a">‹</span><span class="dcat-t">'+(hasActive?'<span style="color:#3b9eff"></span>':'')+cat.title+'</span>';
 const items=document.createElement('div');items.className='ditems'+(hasActive?' open':'');
 cat.tools.forEach(t=>{
 const active=state.tool===t.id;
 const btn=document.createElement('button');btn.className='dtool'+(active?' active':'');
 btn.innerHTML='<div class="dtool-l"><span class="dtool-ic" style="display:flex;align-items:center;justify-content:center;color:'+(active?'#3b9eff':'#7090b0')+';width:18px;height:18px">'+(DRAW_ICON_MAP[t.id]||'<span style="font-size:13px">'+t.icon+'</span>')+'</span><span class="dtool-n">'+t.l+'</span></div><span style="color:#3b9eff;font-size:12px">'+(active?'✓':'')+'</span>';
 btn.onclick=()=>{state.tool=active?null:t.id;updateDrawBtn();if(!active)closeSheet();else buildDrawSheet();};
 items.appendChild(btn);
 });
 hdr.onclick=()=>{hdr.classList.toggle('open');items.classList.toggle('open');};
 el.appendChild(hdr);el.appendChild(items);
 });
}
function updateDrawBtn(){
  // Update draw badge count
  const db=document.getElementById('draw-badge');
  if(db){
    const n=state.drawings.length;
    db.textContent=n;
    db.style.display=n>0?'inline':'none';
  }

 const btnDraw=document.getElementById('btn-draw');
 btnDraw.classList.toggle('active',!!state.tool);
 // Show drawing count badge
 const cnt=state.drawings.length;
 let badge=document.getElementById('draw-count-badge');
 if(!badge){badge=document.createElement('span');badge.id='draw-count-badge';badge.style.cssText='position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:14px;height:14px;font-size:8px;display:flex;align-items:center;justify-content:center;font-weight:700';btnDraw.style.position='relative';btnDraw.appendChild(badge);}
 badge.style.display=cnt>0?'flex':'none';
 badge.textContent=cnt>9?'9+':cnt;
 const ind=document.getElementById('draw-indicator');
 const nm=document.getElementById('draw-tool-name');
 if(state.tool){
 const t=DRAW_TOOLS_LIST.find(t=>t.id===state.tool);
 let ph='';
 if(isPatternTool(state.tool)){
 const total=(PATTERN_PTS[state.tool]||2);
 const lbls=(PATTERN_LBL[state.tool]||[]);
 const done=patPts.length;
 ph=' -- نقطة '+(done+1)+'/'+total+(lbls[done]?' ('+lbls[done]+')':'');
 } else if(drawPhase===1) ph=' ← اضغط النقطة الثانية';
 if(nm)nm.textContent=(t?t.l:state.tool)+ph;
 if(ind)ind.style.display='block';
 } else {if(ind)ind.style.display='none';}
}


// MENUS
// 
function closeMenus(){
 if(openPer){document.getElementById('per-menu').classList.remove('open');document.getElementById('per-btn').classList.remove('open');openPer=false;}
 if(openCT){document.getElementById('ct-menu').classList.remove('open');document.getElementById('ct-btn').classList.remove('open');openCT=false;}
 if(openRange){document.getElementById('range-menu').classList.remove('open');document.getElementById('range-btn').classList.remove('open');openRange=false;}
}
function togglePerMenu(){
 const m=document.getElementById('per-menu'),b=document.getElementById('per-btn');
 if(openPer){m.classList.remove('open');b.classList.remove('open');openPer=false;return;}
 closeMenus();
 const r=b.getBoundingClientRect();
 m.style.top=(r.bottom+6)+'px';m.style.right=Math.max(4,window.innerWidth-r.right)+'px';m.style.left='auto';
 m.classList.add('open');b.classList.add('open');openPer=true;
}

const RANGE_DAYS={'أسبوع':7,'شهر':30,'3أشهر':90,'6أشهر':182,'سنة':365,'سنتين':730,'5سنوات':1825,'الكل':3650};


function toggleRangeMenu(){
 const m=document.getElementById('range-menu'),b=document.getElementById('range-btn');
 if(openRange){m.classList.remove('open');b.classList.remove('open');openRange=false;return;}
 closeMenus();
 const r=b.getBoundingClientRect();
 m.style.top=(r.bottom+6)+'px';m.style.right=Math.max(4,window.innerWidth-r.right)+'px';m.style.left='auto';
 m.classList.add('open');b.classList.add('open');openRange=true;
}

