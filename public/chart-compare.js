// ── Multi-Chart Compare Mode ─────────────────────────────────
let _compareMode=false,_compareStk=null,_compareData=[];

function toggleMultiChart(){
 if(_compareMode){
  _compareMode=false;_compareStk=null;_compareData=[];
  document.getElementById('btn-multichart')?.classList.remove('active');
  invalidateChart();render();return;
 }
 _showComparePicker();
}

function _showComparePicker(){
 const ex=document.getElementById('compare-picker');if(ex)ex.remove();
 const ov=document.createElement('div');
 ov.id='compare-picker';
 ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;z-index:9998;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
 const _cmpRow=s=>`<button onclick="_startCompare('${s.sym}','${(s.name||'').replace(/'/g,"\\'")}')" style="display:flex;align-items:center;justify-content:space-between;width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,0.04);padding:11px 16px;cursor:pointer;direction:rtl"><span style="font-size:12px;color:#e0eaf8;font-family:Cairo,sans-serif">${s.name}</span><span style="font-size:11px;color:#4a6080;font-family:monospace">${s.sym}</span></button>`;
 const _cmpAll=STOCKS.filter(s=>s.sym!==state.stk.sym);
 const rows=_cmpAll.map(_cmpRow).join('');
 ov.innerHTML=`<div style="background:rgba(6,10,22,0.98);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:70vh;display:flex;flex-direction:column"><div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between"><button onclick="document.getElementById('compare-picker').remove()" style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.25);border-radius:8px;color:#ef4444;font-size:13px;width:28px;height:28px;cursor:pointer">×</button><span style="font-family:Cairo,sans-serif;font-size:14px;font-weight:700;color:#e0eaf8">اختر سهم للمقارنة</span><div style="width:28px"></div></div><div style="overflow-y:auto;flex:1">${rows}</div></div>`;
 document.body.appendChild(ov);
 ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
}

async function _startCompare(sym,name){
 document.getElementById('compare-picker')?.remove();
 const base=state.allCandles;
 if(!base.length)return;
 // جلب شموع حقيقية للسهم من سهمك
 const t=document.getElementById('toast');
 if(t){t.textContent='جاري تحميل '+name+' للمقارنة…';t.style.display='block';t.classList.add('show');}
 let cmp=null;
 try{
  if(API_CONFIG.enabled && API_CONFIG.endpoints.candles){
   const tf=API_CONFIG.tfMap[state.per]||state.per;
      const PER_COUNT={'1m':200,'5m':180,'15m':160,'30m':150,'1H':140,'4H':130,'1D':130,'1W':104,'1M':96};
   const raw=await API_CONFIG.fetch('candles',{symbol:sym,interval:tf,limit:PER_COUNT[state.per]||130});
   if(raw && Array.isArray(raw) && raw.length>5) cmp=normalizeCandles(raw);
  }
 }catch(e){ console.warn('[_startCompare]',e); }
 if(!cmp || !cmp.length){
  // فشل الجلب -- لا نولّد بيانات وهمية
  if(t){t.textContent='تعذّر تحميل بيانات '+name+' للمقارنة';t.style.display='block';t.classList.add('show');setTimeout(()=>{t.classList.remove('show');t.style.display='none';},2500);}
  return;
 }
 if(t){t.classList.remove('show');t.style.display='none';}
 _compareStk={sym,name};
 _compareData=cmp;
 _compareMode=true;
 document.getElementById('btn-multichart')?.classList.add('active');
 invalidateChart();render();
}

