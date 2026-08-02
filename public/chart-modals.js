// ── Delta Help Modal ────────────────────────────────────────
function showDeltaHelp(){
 const existing=document.getElementById('delta-help-overlay');
 if(existing){existing.remove();return;}
 const overlay=document.createElement('div');
 overlay.id='delta-help-overlay';
 overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;z-index:9999;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
 overlay.innerHTML=`
  <div style="background:rgba(6,10,20,0.98);border:1px solid rgba(59,158,255,0.2);border-radius:20px 20px 0 0;padding:20px 18px 36px;width:100%;max-width:480px;font-family:Cairo,sans-serif;max-height:80vh;overflow-y:auto">
   <div style="width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 16px"></div>
   <div style="text-align:center;font-size:16px;font-weight:700;color:#3b9eff;margin-bottom:4px">مؤشر دلتا -- دليل القراءة</div>
   <div style="text-align:center;font-size:10px;color:#4a6080;margin-bottom:18px">Order Flow Delta Analysis</div>
   
   <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:8px;text-align:right">📊 ما هو دلتا؟</div>
    <div style="font-size:11px;color:#94a3b8;line-height:1.7;text-align:right">دلتا = حجم الشراء العدواني − حجم البيع العدواني<br>يقيس الضغط الاتجاهي الحقيقي داخل كل شمعة</div>
   </div>

   <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:10px;text-align:right">📈 قراءة الأعمدة</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;direction:rtl">
     <div style="width:14px;height:20px;background:rgba(34,197,94,0.8);border-radius:2px;flex-shrink:0"></div>
     <div style="font-size:10px;color:#94a3b8;text-align:right">عمود أخضر = دلتا موجب (ضغط شراء أكبر من البيع)</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;direction:rtl">
     <div style="width:14px;height:20px;background:rgba(239,68,68,0.8);border-radius:2px;flex-shrink:0"></div>
     <div style="font-size:10px;color:#94a3b8;text-align:right">عمود أحمر = دلتا سالب (ضغط بيع أكبر من الشراء)</div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;direction:rtl">
     <div style="width:24px;height:3px;background:#fbbf24;border-radius:2px;flex-shrink:0"></div>
     <div style="font-size:10px;color:#94a3b8;text-align:right">الخط الذهبي Σ = الدلتا التراكمي (الاتجاه الحقيقي للسوق)</div>
    </div>
   </div>

   <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:12px">
    <div style="font-size:12px;font-weight:700;color:#e2e8f0;margin-bottom:10px;text-align:right">🎯 الإشارات الذكية</div>
    <div style="display:grid;gap:8px">
     <div style="display:flex;gap:10px;align-items:flex-start;direction:rtl">
      <span style="font-size:13px;flex-shrink:0">◆</span>
      <div style="text-align:right"><div style="font-size:10px;color:#00ffaa;font-weight:700">S -- انفجار دلتا (Spike)</div><div style="font-size:9px;color:#64748b">دلتا يتجاوز انحرافين معياريين -- ضغط استثنائي</div></div>
     </div>
     <div style="display:flex;gap:10px;align-items:flex-start;direction:rtl">
      <div style="background:rgba(255,80,80,0.2);border:1px solid #ff6666;border-radius:3px;padding:1px 4px;font-size:9px;color:#ff8888;flex-shrink:0">DIV</div>
      <div style="text-align:right"><div style="font-size:10px;color:#ff8888;font-weight:700">تباعد دلتا (Divergence)</div><div style="font-size:9px;color:#64748b">السعر والدلتا التراكمي في اتجاهين مختلفين -- تحذير انعكاس</div></div>
     </div>
     <div style="display:flex;gap:10px;align-items:flex-start;direction:rtl">
      <span style="font-size:14px;color:#22c55e;flex-shrink:0">⊗</span>
      <div style="text-align:right"><div style="font-size:10px;color:#22c55e;font-weight:700">إرهاق (Exhaustion)</div><div style="font-size:9px;color:#64748b">4+ شموع بنفس الاتجاه ثم انعكاس -- نهاية الزخم</div></div>
     </div>
     <div style="display:flex;gap:10px;align-items:flex-start;direction:rtl">
      <div style="width:14px;height:14px;border-radius:50%;background:rgba(180,160,255,0.9);border:1px solid #9080ff;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:7px;color:#000;font-weight:bold">A</span></div>
      <div style="text-align:right"><div style="font-size:10px;color:#b0a0ff;font-weight:700">امتصاص (Absorption)</div><div style="font-size:9px;color:#64748b">حجم ضخم + دلتا قريب من الصفر -- Smart Money يمتص الأوامر</div></div>
     </div>
    </div>
   </div>

   <div style="background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:12px;padding:12px;margin-bottom:16px">
    <div style="font-size:11px;font-weight:700;color:#3b9eff;margin-bottom:6px;text-align:right">💡 كيفية الاستخدام</div>
    <div style="font-size:10px;color:#94a3b8;line-height:1.8;text-align:right">• خط ذهبي صاعد + أعمدة خضراء = شراء حقيقي ✓<br>• خط ذهبي هابط مع ارتفاع السعر = تحذير (DIV↓)<br>• عمود امتصاص (A) = مؤسسات تراكم أو توزيع<br>• انفجار (S) يؤكد الاختراقات الحقيقية</div>
   </div>

   <button onclick="document.getElementById('delta-help-overlay').remove()" style="width:100%;height:44px;background:rgba(59,158,255,0.15);border:1px solid rgba(59,158,255,0.35);border-radius:12px;color:#3b9eff;font-size:14px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer">فهمت ✓</button>
  </div>
 `;
 document.body.appendChild(overlay);
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
 overlay.addEventListener('touchstart',e=>e.stopPropagation(),{passive:false});
}

// ── Camera Menu Help ────────────────────────────────────────
const _camHelpData={
 png:{
  icon:'📸',title:'تصدير PNG',color:'#22c55e',
  desc:'يصوّر الشارت الحالي كاملاً ويحفظه كصورة على جهازك.',
  steps:['يأخذ لقطة من الشارت مع كل الرسومات والمؤشرات','يضيف علامة مائية صغيرة: اسم السهم + الفريم + التاريخ','يحفظ الملف باسم: تداول_سابك_1D_2026-03-21.png'],
  tip:'مفيد لمشاركة تحليلك مع الآخرين أو حفظه كمرجع'
 },
 export:{
  icon:'☁',title:'تصدير الرسومات JSON',color:'#3b9eff',
  desc:'يحفظ جميع رسوماتك وتنبيهاتك ومؤشراتك في ملف JSON.',
  steps:['يجمع كل الرسومات (خطوط، مستويات، أشكال)','يضيف التنبيهات والمؤشرات المفعّلة ونوع الشارت','يحمّل ملف .json يمكن نقله بين الأجهزة'],
  tip:'احتفظ بنسخة احتياطية من تحليلاتك قبل تغيير الجهاز'
 },
 share:{
  icon:'🔗',title:'مشاركة الشارت',color:'#3b9eff',
  desc:'ينشئ رابطاً يحتوي على الشارت الكامل مع رسوماتك.',
  steps:['يُشفّر السهم والفريم والرسومات كـ Base64','يضعها في URL: tadawul.html#share=...','ينسخ الرابط تلقائياً إلى الحافظة (Clipboard)'],
  tip:'أي شخص يفتح هذا الرابط سيرى نفس شارتك مع نفس الرسومات'
 },
 save:{
  icon:'💾',title:'حفظ',color:'#a78bfa',
  desc:'يحفظ رسوماتك أو إعدادات مؤشراتك للاستخدام لاحقاً.',
  steps:['رسومات JSON -- يحفظ كل خطوطك ومستوياتك وأشكالك في ملف .json','قالب المؤشرات -- يحفظ المؤشرات المفعّلة ونوع الشارت كقالب','القالب محفوظ على الجهاز، الـ JSON يمكن نقله بين الأجهزة'],
  tip:'استخدم JSON للنسخ الاحتياطي، واستخدم القالب لتطبيق إعداداتك بسرعة'
 },
 import:{
  icon:'📂',title:'استيراد',color:'#f59e0b',
  desc:'يسترجع رسومات أو إعدادات محفوظة مسبقاً.',
  steps:['رسومات JSON -- يفتح ملف .json ويدمج رسوماته مع الشارت الحالي','قالب المؤشرات -- يعرض القوالب المحفوظة ويطبّق المختار فوراً','كلاهما يعمل بشكل مستقل -- يمكنك استيراد الرسومات دون تغيير المؤشرات'],
  tip:'شارك ملف JSON مع زميل ليرى نفس التحليل، أو حمّل قالب جلستك الجديدة'
 }
};
function showCamHelp(key){
 const d=_camHelpData[key];if(!d)return;
 const existing=document.getElementById('cam-help-overlay');
 if(existing)existing.remove();
 const ov=document.createElement('div');
 ov.id='cam-help-overlay';
 ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:flex-end;justify-content:center;z-index:10999;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
 const stepsHtml=d.steps.map((s,i)=>`<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;direction:rtl"><div style="width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;color:#94a3b8;font-family:monospace">${i+1}</div><div style="font-size:11px;color:#94a3b8;line-height:1.6;text-align:right">${s}</div></div>`).join('');
 ov.innerHTML=`<div style="background:rgba(6,10,22,0.98);border:1px solid rgba(255,255,255,0.1);border-radius:20px 20px 0 0;padding:20px 18px 36px;width:100%;max-width:480px;font-family:Cairo,sans-serif"><div style="width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 16px"></div><div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;direction:rtl"><div style="width:40px;height:40px;border-radius:12px;background:${d.color}18;border:1px solid ${d.color}35;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${d.icon}</div><div style="text-align:right"><div style="font-size:15px;font-weight:700;color:#f0f4ff">${d.title}</div></div></div><div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px 14px;margin-bottom:12px"><div style="font-size:11px;color:#c8d8f0;line-height:1.7;text-align:right">${d.desc}</div></div><div style="margin-bottom:12px"><div style="font-size:10px;color:#4a6080;margin-bottom:8px;text-align:right">كيف يعمل:</div>${stepsHtml}</div><div style="background:${d.color}10;border:1px solid ${d.color}25;border-radius:10px;padding:10px 14px;margin-bottom:16px;direction:rtl;display:flex;gap:8px;align-items:flex-start"><span style="font-size:14px;flex-shrink:0">💡</span><div style="font-size:10px;color:${d.color};line-height:1.6;text-align:right">${d.tip}</div></div><button onclick="document.getElementById('cam-help-overlay').remove()" style="width:100%;height:44px;background:rgba(59,158,255,0.12);border:1px solid rgba(59,158,255,0.3);border-radius:12px;color:#3b9eff;font-size:14px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer">فهمت ✓</button></div>`;
 document.body.appendChild(ov);
 ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
 ov.addEventListener('touchstart',e=>e.stopPropagation(),{passive:false});
}

// ── Brush Editor ─────────────────────────────────────────────
function showBrushEditor(dr){
 const ex=document.getElementById('brush-editor-ov');if(ex)ex.remove();
 const ov=document.createElement('div');
 ov.id='brush-editor-ov';
 ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;z-index:9999;backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px);';
 const colors=['#fbbf24','#22c55e','#ef4444','#3b9eff','#a78bfa','#f472b6','#67e8f9','#fb923c','#ffffff','#64748b'];
 const curCol=dr.brushColor||'#fbbf24';
 const curAlpha=dr.brushAlpha||0.15;
 const colBtns=colors.map(c=>`<button onclick="document.getElementById('be-col').value='${c}';document.querySelectorAll('.be-cb').forEach(b=>{b.style.outline='none';b.style.transform='scale(1)'});this.style.outline='2px solid #fff';this.style.transform='scale(1.3)'" class="be-cb" style="width:28px;height:28px;border-radius:6px;background:${c};border:none;cursor:pointer;transform:${c===curCol?'scale(1.3)':'scale(1)'};outline:${c===curCol?'2px solid #fff':'none'};transition:transform 0.15s;flex-shrink:0"></button>`).join('');
 ov.innerHTML=`
  <div style="background:rgba(6,10,22,0.98);border-radius:20px 20px 0 0;padding:20px 16px 36px;width:100%;max-width:480px;font-family:Cairo,sans-serif">
   <div style="width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 14px"></div>
   <div style="text-align:center;font-size:14px;font-weight:700;color:#e0eaf8;margin-bottom:16px">${dr.tool==='hbrush'?'🎨 تمييز أفقي':'🎨 تمييز منطقة'}</div>
   <div style="margin-bottom:14px">
    <div style="font-size:10px;color:#4a6080;margin-bottom:8px;text-align:right">اللون</div>
    <div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end">${colBtns}</div>
    <input type="hidden" id="be-col" value="${curCol}">
   </div>
   <div style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
     <span id="be-alpha-val" style="font-size:11px;color:#3b9eff;font-family:monospace">${Math.round(curAlpha*100)}%</span>
     <span style="font-size:10px;color:#4a6080">الشفافية</span>
    </div>
    <input id="be-alpha" type="range" min="5" max="60" value="${Math.round(curAlpha*100)}" oninput="document.getElementById('be-alpha-val').textContent=this.value+'%'" style="width:100%;accent-color:#3b9eff">
   </div>
   <div style="display:flex;gap:10px">
    <button onclick="document.getElementById('brush-editor-ov').remove()" style="flex:1;height:44px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-size:13px;font-family:Cairo,sans-serif;cursor:pointer">إلغاء</button>
    <button id="be-save" style="flex:2;height:44px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);border-radius:12px;color:#fbbf24;font-size:14px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer">تطبيق ✓</button>
   </div>
  </div>
 `;
 document.body.appendChild(ov);
 document.getElementById('be-save').onclick=()=>{
  dr.brushColor=document.getElementById('be-col').value;
  dr.brushAlpha=parseInt(document.getElementById('be-alpha').value)/100;
  dr.color=dr.brushColor;
  saveDrawings();render();ov.remove();
 };
 ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
 ov.addEventListener('touchstart',e=>e.stopPropagation(),{passive:false});
}



// ── Professional Text Editor ─────────────────────────────────
function showTextEditor(dr){
 const existing=document.getElementById('text-editor-overlay');
 if(existing)existing.remove();
 const overlay=document.createElement('div');
 overlay.id='text-editor-overlay';
 overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;z-index:9999;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
 const colors=['#ffffff','#3b9eff','#22c55e','#ef4444','#f59e0b','#a78bfa','#f472b6','#67e8f9','#fde68a','#000000'];
 const sizes=[10,12,14,16,18,22,28,36];
 const curText=dr.text||'';
 const curColor=dr.color||'#ffffff';
 const curSize=dr.fontSize||14;
 const curBold=dr.textBold!==false;
 const colBtns=colors.map(c=>`<button onclick="document.getElementById('te-sel-color').value='${c}';document.querySelectorAll('.te-col-btn').forEach(b=>{b.style.transform='scale(1)';b.style.outline='none';});this.style.transform='scale(1.3)';this.style.outline='2px solid #fff';document.getElementById('te-input').style.color='${c}'" class="te-col-btn" style="width:26px;height:26px;border-radius:50%;background:${c};border:2px solid ${c===curColor?'#fff':'rgba(255,255,255,0.2)'};cursor:pointer;transform:${c===curColor?'scale(1.3)':'scale(1)'};transition:transform 0.15s;outline:${c===curColor?'2px solid #fff':'none'};flex-shrink:0"></button>`).join('');
 const szBtns=sizes.map(s=>`<button onclick="document.querySelectorAll('.te-sz-btn').forEach(b=>{b.style.background='rgba(255,255,255,0.06)';b.style.color='#94a3b8';b.style.borderColor='rgba(255,255,255,0.1)';});this.style.background='rgba(59,158,255,0.2)';this.style.color='#3b9eff';this.style.borderColor='rgba(59,158,255,0.5)';document.getElementById('te-sel-size').value=${s};document.getElementById('te-input').style.fontSize='${s}px'" class="te-sz-btn" style="width:30px;height:26px;border-radius:8px;font-size:10px;font-family:monospace;cursor:pointer;background:${s===curSize?'rgba(59,158,255,0.2)':'rgba(255,255,255,0.06)'};color:${s===curSize?'#3b9eff':'#94a3b8'};border:1px solid ${s===curSize?'rgba(59,158,255,0.5)':'rgba(255,255,255,0.1)'}">${s}</button>`).join('');
 overlay.innerHTML=`<div style="background:rgba(8,14,28,0.97);border:1px solid rgba(59,158,255,0.2);border-radius:20px 20px 0 0;padding:20px 16px 34px;width:100%;max-width:480px;font-family:Cairo,sans-serif"><div style="width:36px;height:4px;background:rgba(255,255,255,0.15);border-radius:2px;margin:0 auto 14px"></div><div style="text-align:center;font-size:13px;color:#94a3b8;margin-bottom:14px">تعديل النص</div><textarea id="te-input" dir="rtl" placeholder="اكتب نصك هنا..." style="width:100%;min-height:72px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:12px;color:${curColor};font-size:${curSize}px;font-family:Cairo,sans-serif;padding:12px;resize:none;outline:none;box-sizing:border-box;line-height:1.5;direction:rtl;text-align:right;font-weight:${curBold?'bold':'normal'}">${curText}</textarea><div style="margin:12px 0 8px;font-size:10px;color:#4a6080;text-align:right">لون النص</div><div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;margin-bottom:12px">${colBtns}</div><input type="hidden" id="te-sel-color" value="${curColor}"><div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:16px"><div style="flex:1"><div style="font-size:10px;color:#4a6080;margin-bottom:6px;text-align:right">حجم الخط</div><div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end">${szBtns}</div><input type="hidden" id="te-sel-size" value="${curSize}"></div><div style="text-align:center"><div style="font-size:10px;color:#4a6080;margin-bottom:6px">عريض</div><button id="te-bold-btn" data-on="${curBold?'1':''}" onclick="const b=this.dataset.on!='1';this.dataset.on=b?'1':'';this.style.background=b?'rgba(59,158,255,0.2)':'rgba(255,255,255,0.06)';this.style.borderColor=b?'rgba(59,158,255,0.5)':'rgba(255,255,255,0.1)';this.style.color=b?'#3b9eff':'#94a3b8';document.getElementById('te-input').style.fontWeight=b?'bold':'normal'" style="width:40px;height:34px;border-radius:10px;font-size:15px;font-weight:bold;cursor:pointer;background:${curBold?'rgba(59,158,255,0.2)':'rgba(255,255,255,0.06)'};color:${curBold?'#3b9eff':'#94a3b8'};border:1px solid ${curBold?'rgba(59,158,255,0.5)':'rgba(255,255,255,0.1)'}">B</button></div></div><div style="display:flex;gap:10px"><button onclick="document.getElementById('text-editor-overlay').remove()" style="flex:1;height:44px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;color:#94a3b8;font-size:13px;font-family:Cairo,sans-serif;cursor:pointer">إلغاء</button><button id="te-save-btn" style="flex:2;height:44px;background:rgba(59,158,255,0.15);border:1px solid rgba(59,158,255,0.35);border-radius:12px;color:#3b9eff;font-size:14px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer">حفظ ✓</button></div></div>`;
 document.body.appendChild(overlay);
 const inp=document.getElementById('te-input');
 setTimeout(()=>{inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);},80);
 document.getElementById('te-save-btn').onclick=()=>{
  const t=inp.value.trim();
  const c=document.getElementById('te-sel-color').value;
  const s=parseInt(document.getElementById('te-sel-size').value)||14;
  const b=document.getElementById('te-bold-btn').dataset.on==='1';
  if(t){_hist();dr.text=t;dr.color=c;dr.fontSize=s;dr.textBold=b;saveDrawings();render();}
  overlay.remove();
 };
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
 overlay.addEventListener('touchstart',e=>e.stopPropagation(),{passive:false});
}

function _dtplClose(){const _m=document.getElementById('draw-tpl-modal');if(_m)_m._close();}
function showDrawingTemplates(){
 let m=document.getElementById('draw-tpl-modal');
 if(m)m.remove();
 m=document.createElement('div');
 m.id='draw-tpl-modal';
 m.style.cssText='position:fixed;inset:0;background:rgba(4,7,18,0.88);z-index:10002;display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px';
 const _sbg=document.getElementById('sbg');if(_sbg)_sbg.style.pointerEvents='none';
 const closeM=()=>{const _s=document.getElementById('sbg');if(_s)_s.style.pointerEvents='';m.remove();};

 const card=document.createElement('div');
 card.style.cssText='background:linear-gradient(145deg,#0d1628,#060c18);border:1.5px solid rgba(59,158,255,0.3);border-radius:20px;padding:20px;width:calc(100% - 32px);max-width:380px;max-height:70vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(0,0,0,0.9)';
 card.onclick=e=>e.stopPropagation();

 const hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML='<button onclick="_dtplClose()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;width:28px;height:28px;color:#ef4444;font-size:16px;cursor:pointer">×</button><span style="font-family:Cairo,sans-serif;font-size:15px;font-weight:800;color:#e0eaf8">قوالب الرسومات</span>';
 card.appendChild(hdr);
 m._close=closeM;

 const rebuild=()=>{
  const list=card.querySelector('#dtpl-list')||document.createElement('div');
  list.id='dtpl-list';list.innerHTML='';
  if(!drawingTemplates.length){
   list.innerHTML='<div style="font-size:11px;color:#2a3a5a;font-family:Cairo,sans-serif;text-align:center;padding:16px">لا توجد قوالب محفوظة</div>';
  } else {
   drawingTemplates.forEach((tpl,i)=>{
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.07);margin-bottom:6px';
    row.innerHTML=`
     <div style="flex:1">
      <div style="font-size:12px;color:#c0d0e8;font-family:Cairo,sans-serif;font-weight:700">${tpl.name}</div>
      <div style="font-size:9px;color:#3a4a6a;font-family:monospace;margin-top:2px">${tpl.drawings.length} رسمة · ${tpl.date}</div>
     </div>
     <button data-load="${i}" style="background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.25);border-radius:7px;color:#3b9eff;font-size:10px;padding:4px 10px;cursor:pointer;font-family:Cairo,sans-serif">تحميل</button>
     <button data-del="${i}" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:7px;color:#ef4444;font-size:10px;padding:4px 8px;cursor:pointer">×</button>
    `;
    list.appendChild(row);
   });
  }
  list.onclick=e=>{
   const lb=e.target.closest('[data-load]');
   const db=e.target.closest('[data-del]');
   if(lb){
    const idx=parseInt(lb.dataset.load);
    const tpl=drawingTemplates[idx];
    if(tpl){
     _hist();
     state.drawings=[...state.drawings,...tpl.drawings.map(d=>({...d,id:Date.now()+Math.random(),pts:d.pts?[...d.pts]:undefined}))];
     saveDrawings();updateDrawBtn();invalidateChart();render();
     const t=document.getElementById('toast');
     if(t){t.textContent='✓ تم تحميل: '+tpl.name;t.style.display='block';t.classList.add('show');setTimeout(()=>{t.classList.remove('show');t.style.display='none';},2000);}
     closeM();
    }
   }
   if(db){drawingTemplates.splice(parseInt(db.dataset.del),1);saveSettings();rebuild();}
  };
  if(!card.querySelector('#dtpl-list'))card.appendChild(list);
 };
 rebuild();

 // Save current button
 const saveBtn=document.createElement('button');
 saveBtn.style.cssText='width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#1a3a6e,#0d2248);border:1.5px solid rgba(59,158,255,0.4);border-radius:12px;color:#3b9eff;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer';
 saveBtn.textContent='حفظ الرسومات الحالية كقالب';
 saveBtn.onclick=()=>{closeM();setTimeout(saveDrawingTemplate,100);};
 card.appendChild(saveBtn);

 m.appendChild(card);
 m.onclick=e=>{if(e.target===m)closeM();};
 document.body.appendChild(m);
}

 function _cmpClose(){const _m=document.getElementById('compare-modal');if(_m)_m._close();}
function showCompareModal(){
 let m = document.getElementById('compare-modal');
 if(m) m.remove();
 m = document.createElement('div');
 m.id = 'compare-modal';
 m.style.cssText = 'position:fixed;inset:0;background:rgba(4,7,18,0.88);z-index:10002;display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px';
 const _sbg=document.getElementById('sbg');if(_sbg)_sbg.style.pointerEvents='none';
 const closeM=()=>{const _s=document.getElementById('sbg');if(_s)_s.style.pointerEvents='';m.remove();};

 const card=document.createElement('div');
 card.style.cssText='background:linear-gradient(145deg,#0d1628,#060c18);border:1.5px solid rgba(245,158,11,0.3);border-radius:20px;padding:20px;width:calc(100% - 32px);max-width:380px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,0.9)';

 card.onclick=e=>e.stopPropagation();

 card.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
   <button onclick="_cmpClose()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;width:28px;height:28px;color:#ef4444;font-size:16px;cursor:pointer">×</button>
   <span style="font-family:Cairo,sans-serif;font-size:15px;font-weight:800;color:#e0eaf8">مقارنة سهم</span>
   <svg viewBox="0 0 20 20" fill="none" width="18" height="18"><polyline points="2,14 6,7 10,10 14,4 18,6" stroke="#f59e0b" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="2,16 6,12 10,14 14,9 18,11" stroke="#3b9eff" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,2"/></svg>
  </div>
  <div style="font-size:10px;color:#4a6080;font-family:Cairo,sans-serif;margin-bottom:10px;text-align:right">اختر سهماً للمقارنة (خط منقط أصفر)</div>
  <div id="cmp-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-left:4px;touch-action:pan-y"></div>

  ${showCompare?'<button id="cmp-remove" style="width:100%;padding:10px;background:rgba(239,68,68,0.08);border:1.5px solid rgba(239,68,68,0.3);border-radius:12px;color:#ef4444;font-family:Cairo,sans-serif;font-size:12px;cursor:pointer">إزالة المقارنة</button>':''}
 `;
 m._close=closeM;

 // Build stock list
 const listEl=card.querySelector('#cmp-list');
 STOCKS.filter(s=>s.sym!==state.stk.sym).forEach(s=>{
  const b=document.createElement('button');
  const isActive=compareStk&&compareStk.sym===s.sym;
  b.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+(isActive?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.03)')+';border:1px solid '+(isActive?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.07)')+';border-radius:10px;cursor:pointer;width:100%;text-align:right';
  b.innerHTML=`
   <div style="text-align:right;flex:1">
    <div style="font-size:12px;color:${isActive?'#f59e0b':'#c0d0e8'};font-family:Cairo,sans-serif;font-weight:700">${s.name}</div>
    <div style="font-size:9px;color:#4a6080;font-family:monospace">${s.sym}</div>
   </div>
   <div style="font-size:12px;color:${s.pct>=0?'#22c55e':'#ef4444'};font-family:monospace">${s.p.toFixed(2)}</div>
  `;
    b.onclick=async()=>{
   // جلب شموع حقيقية للسهم من سهمك
   b.style.opacity='0.5';
   b.innerHTML='<div style="flex:1;text-align:center;color:#f59e0b;font-family:Cairo,sans-serif;font-size:11px">جاري التحميل…</div>';
   let cmp=null;
   try{
    if(API_CONFIG.enabled && API_CONFIG.endpoints.candles){
     const tf=API_CONFIG.tfMap[state.per]||state.per;
     const raw=await API_CONFIG.fetch('candles',{symbol:s.sym,interval:tf,limit:PER_COUNT[state.per]||130});
     if(raw && Array.isArray(raw) && raw.length>5) cmp=normalizeCandles(raw);
    }
   }catch(e){ console.warn('[compare fetch]',e); }
   if(!cmp || !cmp.length){
    // فشل الجلب -- لا نولّد بيانات وهمية
    const t=document.getElementById('toast');
    if(t){t.textContent='تعذّر تحميل بيانات '+s.name+' للمقارنة';t.style.display='block';t.classList.add('show');setTimeout(()=>{t.classList.remove('show');t.style.display='none';},2500);}
    closeM();
    return;
   }
   compareStk={sym:s.sym,name:s.name,candles:cmp};
   showCompare=true;
   invalidateChart();render();
   closeM();
  };
  listEl.appendChild(b);
 });

 const remBtn=card.querySelector('#cmp-remove');
 if(remBtn)remBtn.onclick=()=>{compareStk=null;showCompare=false;invalidateChart();render();closeM();};

 m.appendChild(card);
 m.onclick=e=>{if(e.target===m)closeM();};
 document.body.appendChild(m);
}

// ── Multi-Condition Alert System ─────────────────────────────
function showMultiAlertModal(){
 const ex=document.getElementById('multi-alert-ov');if(ex)ex.remove();
 const ov=document.createElement('div');
 ov.id='multi-alert-ov';
 ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;z-index:9999;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';
 if(!state.alerts)state.alerts=[];

 const buildList=()=>{
  const list=ov.querySelector('#ma-list');if(!list)return;
  if(!state.alerts.length){
   list.innerHTML='<div style="text-align:center;color:#2a3a5a;font-size:11px;font-family:Cairo,sans-serif;padding:14px">لا توجد تنبيهات متعددة بعد</div>';return;
  }
  list.innerHTML=state.alerts.map((a,i)=>`
   <div style="background:rgba(255,255,255,0.04);border:1px solid ${a.active?(a.fired?'rgba(34,197,94,0.4)':'rgba(251,191,36,0.3)'):'rgba(255,255,255,0.08)'};border-radius:10px;padding:10px 12px;margin-bottom:6px">
    <div style="display:flex;align-items:center;justify-content:space-between;direction:rtl">
     <div style="font-size:12px;font-weight:700;color:${a.fired?'#22c55e':a.active?'#fbbf24':'#64748b'};font-family:Cairo,sans-serif">${a.fired?'✓ ':''} ${a.name}</div>
     <div style="display:flex;gap:5px">
      <button onclick="_maToggle(${i})" style="background:rgba(59,158,255,0.1);border:1px solid rgba(59,158,255,0.2);border-radius:6px;color:#3b9eff;font-size:10px;padding:3px 8px;cursor:pointer;font-family:Cairo,sans-serif">${a.active?'إيقاف':'تفعيل'}</button>
      <button onclick="_maDel(${i})" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:6px;color:#ef4444;font-size:11px;padding:3px 7px;cursor:pointer">✕</button>
     </div>
    </div>
    <div style="font-size:9px;color:#4a6080;margin-top:4px;font-family:monospace;direction:ltr;text-align:left">${a.conditions.map(c=>c.type+' '+c.op+' '+c.value).join(' <span style="color:#a78bfa">'+a.logic+'</span> ')}</div>
   </div>
  `).join('');
 };

 ov.innerHTML=`
  <div style="background:rgba(6,10,22,0.98);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:82vh;display:flex;flex-direction:column;font-family:Cairo,sans-serif">
   <div style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
    <button onclick="document.getElementById('multi-alert-ov').remove()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;color:#ef4444;width:28px;height:28px;cursor:pointer;font-size:14px">×</button>
    <span style="font-size:14px;font-weight:700;color:#e0eaf8">تنبيهات متعددة الشروط</span>
    <div style="width:28px"></div>
   </div>
   <div style="flex:1;overflow-y:auto;padding:12px 14px">
    <div id="ma-list" style="margin-bottom:14px"></div>
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px">
     <div style="font-size:11px;font-weight:700;color:#c8d8f0;margin-bottom:12px;text-align:right">+ إضافة تنبيه جديد</div>
     <input id="ma-name" placeholder="اسم التنبيه (مثال: اختراق RSI 70)" style="width:100%;background:#070b14;border:1px solid #1e2d45;border-radius:8px;color:#f0f2f8;font-size:12px;padding:9px 12px;font-family:Cairo,sans-serif;text-align:right;outline:none;box-sizing:border-box;margin-bottom:10px">
     <div style="font-size:10px;color:#4a6080;margin-bottom:8px;text-align:right">الشروط</div>
     <div id="ma-conds"></div>
     <button onclick="_maAddRow()" style="width:100%;background:rgba(34,197,94,0.06);border:1px dashed rgba(34,197,94,0.25);border-radius:8px;color:#22c55e;font-size:11px;padding:7px;cursor:pointer;font-family:Cairo,sans-serif;margin-bottom:10px">+ إضافة شرط آخر</button>
     <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;direction:rtl">
      <div style="font-size:10px;color:#4a6080;flex-shrink:0">منطق الشروط:</div>
      <button id="ma-and-btn" onclick="window._maLogic='AND';this.style.background='rgba(59,158,255,0.2)';this.style.borderColor='rgba(59,158,255,0.4)';document.getElementById('ma-or-btn').style.background='transparent';document.getElementById('ma-or-btn').style.borderColor='rgba(255,255,255,0.1)'" style="background:rgba(59,158,255,0.2);border:1px solid rgba(59,158,255,0.4);border-radius:6px;color:#3b9eff;font-size:10px;padding:4px 12px;cursor:pointer;font-weight:700">AND</button>
      <button id="ma-or-btn" onclick="window._maLogic='OR';this.style.background='rgba(167,139,250,0.2)';this.style.borderColor='rgba(167,139,250,0.4)';document.getElementById('ma-and-btn').style.background='transparent';document.getElementById('ma-and-btn').style.borderColor='rgba(255,255,255,0.1)'" style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#a78bfa;font-size:10px;padding:4px 12px;cursor:pointer;font-weight:700">OR</button>
      <span style="font-size:9px;color:#2a3a5a;margin-right:auto">AND = كل الشروط يجب أن تتحقق</span>
     </div>
     <button onclick="_maSave()" style="width:100%;height:44px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35);border-radius:12px;color:#fbbf24;font-size:14px;font-weight:700;font-family:Cairo,sans-serif;cursor:pointer">🔔 حفظ التنبيه</button>
    </div>
   </div>
  </div>
 `;
 document.body.appendChild(ov);
 window._maLogic='AND';
 _maAddRow();
 buildList();
 ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
 ov.addEventListener('touchstart',e=>e.stopPropagation(),{passive:false});
 ov._refresh=buildList;
}

function _maRowHTML(){
 return `<div class="ma-row" style="display:grid;grid-template-columns:1fr auto 1fr auto;gap:5px;align-items:center;margin-bottom:6px">
  <select class="ma-type" style="background:#070b14;border:1px solid #1e2d45;border-radius:7px;color:#f0f2f8;font-size:11px;padding:7px 6px;font-family:Cairo,sans-serif;outline:none">
   <option value="price">السعر</option>
   <option value="rsi">RSI</option>
   <option value="macd_hist">MACD Hist</option>
   <option value="volume">الحجم</option>
   <option value="bb_upper">بولينجر أعلى</option>
   <option value="bb_lower">بولينجر أدنى</option>
   <option value="adx">ADX</option>
   <option value="pct_change">تغيير %</option>
  </select>
  <select class="ma-op" style="background:#070b14;border:1px solid #1e2d45;border-radius:7px;color:#f0f2f8;font-size:11px;padding:7px 4px;font-family:Cairo,sans-serif;outline:none">
   <option value="above">أعلى</option>
   <option value="below">أدنى</option>
   <option value="cross_up">يتجاوز↑</option>
   <option value="cross_dn">يهبط↓</option>
  </select>
  <input class="ma-val" type="number" placeholder="القيمة" style="background:#070b14;border:1px solid #1e2d45;border-radius:7px;color:#f0f2f8;font-size:12px;padding:7px 6px;text-align:center;outline:none;font-family:monospace">
  <button onclick="this.closest('.ma-row').remove()" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:6px;color:#ef4444;font-size:11px;width:26px;height:30px;cursor:pointer;flex-shrink:0">✕</button>
 </div>`;
}
function _maAddRow(){const c=document.getElementById('ma-conds');if(c)c.insertAdjacentHTML('beforeend',_maRowHTML());}
function _maToggle(i){if(!state.alerts)return;state.alerts[i].active=!state.alerts[i].active;state.alerts[i].fired=false;const ov=document.getElementById('multi-alert-ov');if(ov&&ov._refresh)ov._refresh();}
function _maDel(i){if(!state.alerts)return;state.alerts.splice(i,1);const ov=document.getElementById('multi-alert-ov');if(ov&&ov._refresh)ov._refresh();}
function _maSave(){
 const name=(document.getElementById('ma-name').value||'').trim()||'تنبيه '+(state.alerts.length+1);
 const rows=[...document.querySelectorAll('.ma-row')];
 const conditions=rows.map(r=>({
  type:r.querySelector('.ma-type').value,
  op:r.querySelector('.ma-op').value,
  value:parseFloat(r.querySelector('.ma-val').value)||0
 })).filter(c=>c.value||c.op.startsWith('cross'));
 if(!conditions.length){alert('أضف شرطاً واحداً على الأقل');return;}
 if(!state.alerts)state.alerts=[];
 state.alerts.push({id:Date.now(),name,conditions,logic:window._maLogic||'AND',active:true,fired:false,createdAt:new Date().toISOString()});
 document.getElementById('ma-name').value='';
 document.getElementById('ma-conds').innerHTML='';
 _maAddRow();
 const ov=document.getElementById('multi-alert-ov');
 if(ov&&ov._refresh)ov._refresh();
}

function _closeIndAlertModal(){const _s=document.getElementById('sbg');if(_s)_s.style.pointerEvents='';const _m=document.getElementById('ind-alert-modal');if(_m)_m.remove();}
function showIndAlertModal(){
 let m = document.getElementById('ind-alert-modal');
 if(m) m.remove();
 m = document.createElement('div');
 m.id = 'ind-alert-modal';
 m.style.cssText = 'position:fixed;inset:0;background:rgba(4,7,18,0.88);z-index:10001;display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px';
 const _sbg = document.getElementById('sbg');
 if(_sbg) _sbg.style.pointerEvents = 'none';

 const card = document.createElement('div');
 card.style.cssText = 'background:linear-gradient(145deg,#0d1628,#060c18);border:1.5px solid rgba(59,158,255,0.3);border-radius:20px;padding:20px;width:calc(100% - 32px);max-width:380px;box-shadow:0 -8px 40px rgba(0,0,0,0.9)';
 card.onclick = e => e.stopPropagation();

 // Header
 const hdr = document.createElement('div');
 hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML = '<span style="font-family:Cairo,sans-serif;font-size:15px;font-weight:800;color:#e0eaf8">تنبيه على مؤشر</span>' +
  '<button onclick="_closeIndAlertModal()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;width:28px;height:28px;color:#ef4444;font-size:16px;cursor:pointer">×</button>';
 card.appendChild(hdr);

 // Indicator select
 const indOpts = [
  {id:'RSI',    l:'RSI',          conditions:[{v:'above',l:'يتجاوز ↑'},{v:'below',l:'يهبط تحت ↓'}]},
  {id:'MACD',   l:'MACD Hist',    conditions:[{v:'cross_up',l:'يتقاطع صعوداً ↑'},{v:'cross_dn',l:'يتقاطع هبوطاً ↓'}]},
  {id:'STOCH',  l:'Stochastic',   conditions:[{v:'above',l:'يتجاوز ↑'},{v:'below',l:'يهبط تحت ↓'}]},
  {id:'MA_CROSS',l:'تقاطع MA9/21',conditions:[{v:'cross_up',l:'تقاطع صعودي (ذهبي) ↑'},{v:'cross_dn',l:'تقاطع هبوطي (ميت) ↓'}]},
  {id:'PRICE_MA',l:'السعر / MA50', conditions:[{v:'cross_up',l:'السعر يتجاوز MA50 ↑'},{v:'cross_dn',l:'السعر يهبط تحت MA50 ↓'}]},
 ];

 let selInd = indOpts[0], selCond = selInd.conditions[0], alertVal = 70;

 // Ind selector
 const indRow = document.createElement('div');
 indRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px';
 indOpts.forEach(opt => {
  const b = document.createElement('button');
  b.textContent = opt.l;
  b.style.cssText = 'flex:1;padding:8px;border-radius:10px;border:1.5px solid;font-family:Cairo,sans-serif;font-size:12px;cursor:pointer;transition:all 0.15s;' +
   (opt===selInd ? 'background:rgba(59,158,255,0.15);border-color:rgba(59,158,255,0.5);color:#3b9eff;' : 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#6080a0;');
  b.onclick = () => {
   selInd = opt; selCond = opt.conditions[0];
   // update cond buttons
   rebuildConds();
   indRow.querySelectorAll('button').forEach(bb => {
    bb.style.background=bb.textContent===opt.l?'rgba(59,158,255,0.15)':'rgba(255,255,255,0.05)';
    bb.style.borderColor=bb.textContent===opt.l?'rgba(59,158,255,0.5)':'rgba(255,255,255,0.1)';
    bb.style.color=bb.textContent===opt.l?'#3b9eff':'#6080a0';
   });
  };
  indRow.appendChild(b);
 });
 card.appendChild(indRow);

 // Condition selector
 const condRow = document.createElement('div');
 condRow.style.cssText = 'display:flex;gap:6px;margin-bottom:14px';
 const rebuildConds = () => {
  condRow.innerHTML = '';
  selInd.conditions.forEach(c => {
   const b = document.createElement('button');
   b.textContent = c.l;
   b.style.cssText = 'flex:1;padding:8px;border-radius:10px;border:1.5px solid;font-family:Cairo,sans-serif;font-size:11px;cursor:pointer;' +
    (c===selCond?'background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.4);color:#22c55e;':'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:#6080a0;');
   b.onclick = () => {
    selCond = c;
    condRow.querySelectorAll('button').forEach(bb => {
     const active = bb.textContent === c.l;
     bb.style.background = active?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.05)';
     bb.style.borderColor = active?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.1)';
     bb.style.color = active?'#22c55e':'#6080a0';
    });
    valRow.style.display = selCond.v.includes('cross') ? 'none' : 'flex';
   };
   condRow.appendChild(b);
  });
 };
 rebuildConds();
 card.appendChild(condRow);

 // Value input (for above/below conditions)
 const valRow = document.createElement('div');
 valRow.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:18px';
 const valLbl = document.createElement('span');
 valLbl.style.cssText = 'font-family:Cairo,sans-serif;font-size:12px;color:#8aa0c0;min-width:52px;text-align:right';
 valLbl.textContent = 'القيمة';
 const valDisp = document.createElement('span');
 valDisp.style.cssText = 'font-family:monospace;font-size:14px;font-weight:700;color:#3b9eff;min-width:32px;text-align:center';
 valDisp.textContent = alertVal;
 const valSlider = document.createElement('input');
 valSlider.type='range';valSlider.min=0;valSlider.max=100;valSlider.step=1;valSlider.value=alertVal;
 valSlider.style.cssText = 'flex:1;height:4px;accent-color:#3b9eff;cursor:pointer';
 valSlider.oninput = () => {alertVal=Number(valSlider.value);valDisp.textContent=alertVal;};
 valRow.appendChild(valLbl);valRow.appendChild(valDisp);valRow.appendChild(valSlider);
 card.appendChild(valRow);

 // Active alerts list
 const listDiv = document.createElement('div');
 listDiv.style.cssText = 'max-height:100px;overflow-y:auto;margin-bottom:14px';
 const refreshList = () => {
  listDiv.innerHTML = '';
  // Event delegation for delete buttons
  listDiv.onclick = e => {
   const btn = e.target.closest('.iadel-btn');
   if(btn){
    const idx2 = parseInt(btn.dataset.idx);
    if(!isNaN(idx2)){ indAlerts.splice(idx2,1); refreshList(); }
   }
  };
  if(!indAlerts.length){
   listDiv.innerHTML='<div style="font-size:10px;color:#3a4a6a;font-family:Cairo,sans-serif;text-align:center;padding:8px">لا توجد تنبيهات نشطة</div>';
   return;
  }
  indAlerts.forEach((al,i) => {
   const row = document.createElement('div');
   row.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:8px;margin-bottom:4px';
   const condLabel = al.condition.includes('cross') ? (al.condition==='cross_up'?'تقاطع ↑':'تقاطع ↓') : (al.condition==='above'?'فوق ':'تحت ')+al.value;
   row.innerHTML = '<span style="font-size:10px;color:#8aa0c0;font-family:monospace">'+al.indId+' '+condLabel+'</span>' +
    '<button class="iadel-btn" data-idx="'+i+'" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:6px;color:#ef4444;font-size:10px;padding:2px 8px;cursor:pointer;font-family:Cairo,sans-serif">حذف</button>';
   row.className='ind-alert-row';
   listDiv.appendChild(row);
  });
 };
 refreshList();
 card.appendChild(listDiv);

 // Add button
 const addBtn = document.createElement('button');
 addBtn.style.cssText = 'width:100%;padding:12px;background:linear-gradient(135deg,#1a3a6e,#0d2248);border:1.5px solid rgba(59,158,255,0.4);border-radius:12px;color:#3b9eff;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer';
 addBtn.textContent = 'إضافة تنبيه';
 addBtn.onclick = () => {
  indAlerts.push({id:Date.now(),indId:selInd.id,condition:selCond.v,value:alertVal,active:true,fired:false,_prev:null});
  refreshList();
  const _s=document.getElementById('sbg');if(_s)_s.style.pointerEvents='';
  m.remove();
 };
 card.appendChild(addBtn);
 m.appendChild(card);
 m.onclick = e => {if(e.target===m){const _s=document.getElementById('sbg');if(_s)_s.style.pointerEvents='';m.remove();}};
 document.body.appendChild(m);
}

function showIndSettings(id, label, defColor){
 const cfg={...IND_DEFAULTS[id],...(indSettings[id]||{})};
 // Build modal
 let existing=document.getElementById('ind-settings-modal');
 if(existing)existing.remove();
 const modal=document.createElement('div');
 modal.id='ind-settings-modal';
 modal.style.cssText='position:fixed;inset:0;background:rgba(4,7,18,0.88);z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px';
 // Disable sbg so sheet doesn't close when interacting with modal
 const _sbg=document.getElementById('sbg');
 if(_sbg)_sbg.style.pointerEvents='none';
 const card=document.createElement('div');
 card.style.cssText='background:linear-gradient(145deg,#0d1628,#060c18);border:1.5px solid rgba(59,158,255,0.3);border-radius:20px;padding:20px;width:calc(100% - 32px);max-width:380px;box-shadow:0 -8px 40px rgba(0,0,0,0.9)';
 card.onclick=(e)=>e.stopPropagation();
 // Header
 const hdr=document.createElement('div');
 hdr.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:16px';
 hdr.innerHTML=`<span style="font-family:Cairo,sans-serif;font-size:15px;font-weight:800;color:#e0eaf8">إعدادات ${label}</span><button onclick="const _sbg4=document.getElementById('sbg');if(_sbg4)_sbg4.style.pointerEvents='';document.getElementById('ind-settings-modal').remove()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;width:28px;height:28px;color:#ef4444;font-size:16px;cursor:pointer">×</button>`;
 card.appendChild(hdr);
 // Build fields
 const fields=[];
 if(cfg.period!=null)fields.push({key:'period',label:'الفترة',min:2,max:200,step:1,val:cfg.period});
 if(cfg.fast!=null)  fields.push({key:'fast',  label:'سريع',  min:2,max:50, step:1,val:cfg.fast});
 if(cfg.slow!=null)  fields.push({key:'slow',  label:'بطيء',  min:5,max:200,step:1,val:cfg.slow});
 if(cfg.signal!=null)fields.push({key:'signal',label:'إشارة', min:2,max:50, step:1,val:cfg.signal});
 if(cfg.stddev!=null)fields.push({key:'stddev',label:'الانحراف',min:0.5,max:4,step:0.5,val:cfg.stddev});
 const vals={...cfg};
 fields.forEach(f=>{
  const row=document.createElement('div');
  row.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px';
  const lbl=document.createElement('span');
  lbl.style.cssText='font-family:Cairo,sans-serif;font-size:12px;color:#8aa0c0;flex-shrink:0;min-width:52px;text-align:right';
  lbl.textContent=f.label;
  const numDisp=document.createElement('span');
  numDisp.style.cssText='font-family:monospace;font-size:13px;font-weight:700;color:#3b9eff;min-width:28px;text-align:center';
  numDisp.textContent=f.val;
  const slider=document.createElement('input');
  slider.type='range';slider.min=f.min;slider.max=f.max;slider.step=f.step;slider.value=f.val;
  slider.style.cssText='flex:1;height:4px;accent-color:#3b9eff;cursor:pointer';
  slider.oninput=()=>{numDisp.textContent=slider.value;vals[f.key]=Number(slider.value);};
  row.appendChild(lbl);row.appendChild(numDisp);row.appendChild(slider);
  card.appendChild(row);
 });
 // Color picker
 const colorRow=document.createElement('div');
 colorRow.style.cssText='display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;gap:12px';
 const colorLbl=document.createElement('span');
 colorLbl.style.cssText='font-family:Cairo,sans-serif;font-size:12px;color:#8aa0c0;flex-shrink:0;min-width:52px;text-align:right';
 colorLbl.textContent='اللون';
 const colorInp=document.createElement('input');
 colorInp.type='color';colorInp.value=cfg.color||defColor;
 colorInp.style.cssText='width:44px;height:28px;border-radius:6px;cursor:pointer;border:1px solid rgba(59,158,255,0.3);background:transparent;flex-shrink:0';
 colorInp.oninput=()=>{vals.color=colorInp.value;};
 colorRow.appendChild(colorLbl);colorRow.appendChild(colorInp);
 card.appendChild(colorRow);
 // Apply button
 const applyBtn=document.createElement('button');
 applyBtn.style.cssText='width:100%;padding:12px;background:linear-gradient(135deg,#1a3a6e,#0d2248);border:1.5px solid rgba(59,158,255,0.4);border-radius:12px;color:#3b9eff;font-family:Cairo,sans-serif;font-size:14px;font-weight:700;cursor:pointer';
 applyBtn.textContent='تطبيق';
 applyBtn.onclick=()=>{
  if(!indSettings[id])indSettings[id]={};
  Object.assign(indSettings[id],vals);
  saveSettings();invalidateChart();render();
  const _sbg3=document.getElementById('sbg');
  if(_sbg3)_sbg3.style.pointerEvents='';
  document.getElementById('ind-settings-modal').remove();
 };
 card.appendChild(applyBtn);
 modal.appendChild(card);
 modal.onclick=(e)=>{
  if(e.target===modal){
   const _sbg2=document.getElementById('sbg');
   if(_sbg2)_sbg2.style.pointerEvents='';
   modal.remove();
  }
 };
 document.body.appendChild(modal);
}

function showCustomIndModal(){
 let m = document.getElementById('custom-ind-modal');
 if(m) m.remove();
 m = document.createElement('div');
 m.id = 'custom-ind-modal';
 m.style.cssText = 'position:fixed;inset:0;background:rgba(4,7,18,0.92);z-index:10002;display:flex;flex-direction:column;padding:0';
 const _sbg = document.getElementById('sbg');
 if(_sbg) _sbg.style.pointerEvents = 'none';

 const closeModal = () => {
  const _s=document.getElementById('sbg');if(_s)_s.style.pointerEvents='';
  m.remove();
 };

 m.innerHTML = `
  <div style="background:linear-gradient(145deg,#0a0f1e,#050810);border-bottom:1px solid rgba(59,158,255,0.2);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
   <button onclick="document.getElementById('custom-ind-modal')._close()" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);border-radius:8px;width:28px;height:28px;color:#ef4444;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">×</button>
   <span style="font-family:Cairo,sans-serif;font-size:16px;font-weight:800;color:#e0eaf8">مؤشر مخصص</span>
   <svg viewBox="0 0 22 22" fill="none" width="20" height="20"><polyline points="2,16 6,8 10,11 14,4 18,8" stroke="#3b9eff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="8" r="2" stroke="#3b9eff" stroke-width="1.3" fill="none"/></svg>
  </div>
  <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:14px">

   <!-- Active custom indicators -->
   <div>
    <div style="font-size:10px;color:#4a6080;font-family:Cairo,sans-serif;margin-bottom:8px;text-align:right">المؤشرات النشطة</div>
    <div id="cind-active-list" style="display:flex;flex-direction:column;gap:6px"></div>
   </div>

   <!-- Separator -->
   <div style="height:1px;background:rgba(255,255,255,0.06)"></div>

   <!-- Presets -->
   <div>
    <div style="font-size:10px;color:#4a6080;font-family:Cairo,sans-serif;margin-bottom:8px;text-align:right">قوالب جاهزة</div>
    <div id="cind-presets" style="display:flex;flex-direction:column;gap:5px"></div>
   </div>

   <!-- Separator -->
   <div style="height:1px;background:rgba(255,255,255,0.06)"></div>

   <!-- New indicator form -->
   <div>
    <div style="font-size:10px;color:#4a6080;font-family:Cairo,sans-serif;margin-bottom:8px;text-align:right">إنشاء مؤشر جديد</div>
    <div style="display:flex;flex-direction:column;gap:10px">
     <input id="cind-name" placeholder="اسم المؤشر" style="background:#070b14;border:1.5px solid #1e2d45;border-radius:10px;color:#f0f2f8;font-size:13px;padding:10px 12px;font-family:Cairo,sans-serif;text-align:right;outline:none">
     <textarea id="cind-formula" placeholder="المعادلة -- مثال: EMA(RSI(close,14),3)" rows="3" style="background:#070b14;border:1.5px solid #1e2d45;border-radius:10px;color:#f0f2f8;font-size:12px;padding:10px 12px;font-family:monospace;direction:ltr;resize:none;outline:none;line-height:1.6"></textarea>
     <div style="display:flex;gap:8px;align-items:center">
      <select id="cind-type" style="flex:1;background:#070b14;border:1.5px solid #1e2d45;border-radius:10px;color:#f0f2f8;font-size:12px;padding:8px 10px;font-family:Cairo,sans-serif;outline:none">
       <option value="overlay">على الشارت الرئيسي</option>
       <option value="subpanel">بانل منفصل (أسفل)</option>
      </select>
      <input id="cind-color" type="color" value="#3b9eff" style="width:40px;height:38px;border-radius:8px;cursor:pointer;border:1.5px solid rgba(59,158,255,0.3);background:transparent;flex-shrink:0">
     </div>
     <!-- Reference guide -->
     <div style="background:rgba(59,158,255,0.06);border:1px solid rgba(59,158,255,0.15);border-radius:10px;padding:10px;font-size:10px;line-height:1.9;direction:ltr">
      <div style="color:#3b9eff;font-family:monospace;font-weight:700;margin-bottom:4px">📚 دوال المصادر</div>
      <div style="color:#67e8f9;font-family:monospace">close · open · high · low · volume · hl2 · hlc3 · ohlc4</div>
      <div style="color:#3b9eff;font-family:monospace;font-weight:700;margin:6px 0 4px">📈 المتوسطات</div>
      <div style="color:#a5f3fc;font-family:monospace">SMA(src,n) · EMA(src,n) · WMA(src,n) · DEMA(src,n) · TEMA(src,n) · HULL(src,n)</div>
      <div style="color:#3b9eff;font-family:monospace;font-weight:700;margin:6px 0 4px">⚡ مؤشرات الزخم</div>
      <div style="color:#a5f3fc;font-family:monospace">RSI(src,n) · STOCH(k,d) · CCI(n) · MOM(src,n) · ROC(src,n) · CMO(src,n)</div>
      <div style="color:#3b9eff;font-family:monospace;font-weight:700;margin:6px 0 4px">📊 مؤشرات الحجم</div>
      <div style="color:#a5f3fc;font-family:monospace">OBV() · MFI(n) · CMF(n) · VWAP() · PVI() · NVI()</div>
      <div style="color:#3b9eff;font-family:monospace;font-weight:700;margin:6px 0 4px">🔧 العمليات</div>
      <div style="color:#a5f3fc;font-family:monospace">ADD(a,b) · SUB(a,b) · MUL(a,b) · DIV(a,b) · ABS(a) · SQRT(a) · MAX(a,b) · MIN(a,b)</div>
      <div style="color:#3b9eff;font-family:monospace;font-weight:700;margin:6px 0 4px">🔀 التحويل</div>
      <div style="color:#a5f3fc;font-family:monospace">ADDK(a,k) · MULK(a,k) · SHIFT(a,n) · CROSS(a,b) · HIGHEST(src,n) · LOWEST(src,n) · STDEV(src,n)</div>
     </div>
     <div id="cind-error" style="display:none;color:#ef4444;font-size:10px;font-family:Cairo,sans-serif;text-align:right"></div>
     <div style="display:flex;gap:8px">
      <button id="cind-test" style="flex:1;padding:10px;background:rgba(59,158,255,0.08);border:1.5px solid rgba(59,158,255,0.25);border-radius:10px;color:#3b9eff;font-family:Cairo,sans-serif;font-size:12px;cursor:pointer">اختبار</button>
      <button id="cind-add" style="flex:2;padding:10px;background:linear-gradient(135deg,#1a3a6e,#0d2248);border:1.5px solid rgba(59,158,255,0.4);border-radius:10px;color:#3b9eff;font-family:Cairo,sans-serif;font-size:13px;font-weight:700;cursor:pointer">إضافة للشارت</button>
     </div>
    </div>
   </div>
  </div>
 `;

 m._close = closeModal;

 // Render active list
 const renderActive = () => {
  const el = document.getElementById('cind-active-list');
  if(!el) return;
  el.innerHTML = '';
  // Show ALL active indicators (built-in + custom)
  const IND_COLORS={RSI:'#22c55e',MACD:'#38bdf8',BB:'#818cf8',ATR:'#facc15',STD:'#fde68a',
   ADX:'#e879f9',PSAR:'#f0abfc',SUPERTREND:'#4ade80',ICHIMOKU:'#34d399',OBV:'#67e8f9',
   MFI:'#38bdf8',STOCH:'#f472b6',STOCHRSI:'#ec4899',VWAP:'#fb923c',KC:'#22d3ee',
   DC:'#818cf8',PIVOT:'#f59e0b',VOL_MA:'#94a3b8',HTF_EMA:'#f472b6',VWAP_D:'#fb923c',VP:'#22d3ee'};
  const activeBuiltIn=state.inds||[];
  const totalActive=activeBuiltIn.length+customInds.length;
  if(!totalActive){
   el.innerHTML='<div style="font-size:10px;color:#2a3a5a;font-family:Cairo,sans-serif;text-align:center;padding:10px">لا توجد مؤشرات نشطة</div>';
   return;
  }
  // Built-in indicators
  activeBuiltIn.forEach(id=>{
   const def=ALL_IND?.find(d=>d.id===id)||{id,l:id,c:IND_COLORS[id]||'#94a3b8'};
   const row=document.createElement('div');
   row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin-bottom:4px';
   row.innerHTML=`
    <div style="width:9px;height:9px;border-radius:50%;background:${def.c||IND_COLORS[id]||'#94a3b8'};flex-shrink:0"></div>
    <span style="flex:1;font-size:11px;color:#c0d0e8;font-family:Cairo,sans-serif">${def.l||id}</span>
    <span style="font-size:8px;color:#3a4a6a;background:rgba(255,255,255,0.04);border-radius:4px;padding:1px 5px">مدمج</span>
    <button data-blt="${id}" class="cind-blt-del" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:6px;color:#ef4444;font-size:10px;padding:2px 7px;cursor:pointer">✕</button>
   `;
   el.appendChild(row);
  });
  // Custom indicators
  customInds.forEach((ci,i)=>{
   const row=document.createElement('div');
   row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 10px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);margin-bottom:4px';
   row.innerHTML=`
    <div style="width:9px;height:9px;border-radius:50%;background:${ci.color};flex-shrink:0"></div>
    <span style="flex:1;font-size:11px;color:#c0d0e8;font-family:Cairo,sans-serif">${ci.name}</span>
    <span style="font-size:8px;color:#3a4a6a;background:rgba(59,158,255,0.08);border-radius:4px;padding:1px 5px;color:#3b9eff">مخصص</span>
    <button data-ci="${i}" class="cind-del" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:6px;color:#ef4444;font-size:10px;padding:2px 7px;cursor:pointer">✕</button>
   `;
   el.appendChild(row);
  });
  // Delete delegation
  el.onclick=e=>{
   const btn=e.target.closest('.cind-del');
   const blt=e.target.closest('.cind-blt-del');
   if(btn){customInds.splice(parseInt(btn.dataset.ci),1);saveSettings();invalidateChart();renderActive();render();}
   if(blt){
    const id=blt.dataset.blt;
    state.inds=state.inds.filter(x=>x!==id);
    saveSettings();updateIndBadge();invalidateChart();renderActive();render();
   }
  };
 };

 m.onclick = e => { if(e.target===m) closeModal(); };
 document.body.appendChild(m); // Must be in DOM before renderActive/presets
 renderActive();
 // Render presets
 const presetsEl = document.getElementById('cind-presets');
 if(presetsEl){
  CUSTOM_PRESETS.forEach(p=>{
   const b = document.createElement('button');
   b.style.cssText = 'display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;cursor:pointer;text-align:right;width:100%;box-sizing:border-box;direction:rtl;transition:border-color 0.15s';
   // Mini sparkline SVG based on shape type
   const sparklines={
    line:`<svg viewBox="0 0 40 20" width="40" height="20"><polyline points="2,14 8,10 14,12 20,6 26,8 32,4 38,7" stroke="${p.color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    oscillator:`<svg viewBox="0 0 40 20" width="40" height="20"><line x1="2" y1="10" x2="38" y2="10" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/><polyline points="2,16 6,8 10,14 14,4 18,12 22,6 26,14 30,8 34,12 38,10" stroke="${p.color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    histogram:`<svg viewBox="0 0 40 20" width="40" height="20"><line x1="2" y1="10" x2="38" y2="10" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/><rect x="3" y="6" width="4" height="4" fill="${p.color}" opacity="0.7"/><rect x="9" y="12" width="4" height="2" fill="${p.color}" opacity="0.4"/><rect x="15" y="5" width="4" height="5" fill="${p.color}" opacity="0.8"/><rect x="21" y="11" width="4" height="3" fill="${p.color}" opacity="0.5"/><rect x="27" y="4" width="4" height="6" fill="${p.color}" opacity="0.9"/><rect x="33" y="12" width="4" height="2" fill="${p.color}" opacity="0.4"/></svg>`,
    area:`<svg viewBox="0 0 40 20" width="40" height="20"><path d="M2,16 L8,10 L14,12 L20,5 L26,8 L32,4 L38,7 L38,18 L2,18 Z" fill="${p.color}" opacity="0.2"/><polyline points="2,16 8,10 14,12 20,5 26,8 32,4 38,7" stroke="${p.color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
   };
   const spark=sparklines[p.shape]||sparklines.line;
   const typeBadge=p.type==='overlay'?
    `<span style="font-size:8px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.25);border-radius:4px;padding:1px 5px">overlay</span>`:
    `<span style="font-size:8px;background:rgba(59,158,255,0.12);color:#3b9eff;border:1px solid rgba(59,158,255,0.25);border-radius:4px;padding:1px 5px">بانل</span>`;
   b.innerHTML = `
    <div style="flex:1;min-width:0">
     <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
      <div style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0"></div>
      <span style="font-size:12px;color:#c0d0e8;font-family:Cairo,sans-serif;font-weight:600">${p.name}</span>
      ${typeBadge}
     </div>
     <div style="font-size:10px;color:#4a6080;font-family:Cairo,sans-serif;line-height:1.4">${p.desc||''}</div>
    </div>
    <div style="flex-shrink:0;opacity:0.8;margin-top:2px">${spark}</div>
   `;
   b.onmouseenter=()=>{b.style.borderColor=p.color+'55';};
   b.onmouseleave=()=>{b.style.borderColor='rgba(255,255,255,0.08)';};
   b.onclick = () => {
    const nameEl = document.getElementById('cind-name');
    const fEl = document.getElementById('cind-formula');
    const tEl = document.getElementById('cind-type');
    const cEl = document.getElementById('cind-color');
    if(nameEl) nameEl.value = p.name;
    if(fEl) fEl.value = p.formula;
    if(tEl) tEl.value = p.type;
    if(cEl) cEl.value = p.color;
    // Highlight selected
    presetsEl.querySelectorAll('button').forEach(bb=>bb.style.borderColor='rgba(255,255,255,0.08)');
    b.style.borderColor=p.color;
    b.style.background='rgba(255,255,255,0.06)';
   };
   presetsEl.appendChild(b);
  });
 }

 const testBtn = document.getElementById('cind-test');
 if(testBtn) testBtn.onclick = () => {
  const formula = document.getElementById('cind-formula')?.value?.trim();
  const errEl = document.getElementById('cind-error');
  if(!formula){ if(errEl){errEl.style.display='block';errEl.textContent='أدخل معادلة أولاً';} return; }
  const all = state.allCandles;
  if(!all.length){ if(errEl){errEl.style.display='block';errEl.textContent='لا توجد بيانات';} return; }
  const allC2=all.map(d=>d.c), allH2=all.map(d=>d.hi), allL2=all.map(d=>d.lo), allV2=all.map(d=>d.v);
  const result = _evalCustomInd(formula, allC2, allH2, allL2, allV2);
  if(!result){ if(errEl){errEl.style.display='block';errEl.textContent='خطأ في المعادلة -- تحقق من الصيغة';} return; }
  const valid = result.filter(v=>v!=null);
  if(!valid.length){ if(errEl){errEl.style.display='block';errEl.textContent='المعادلة تعطي قيماً فارغة';} return; }
  if(errEl){errEl.style.display='block';errEl.style.color='#22c55e';errEl.textContent=`✓ صحيح -- ${valid.length} قيمة، آخرها: ${valid[valid.length-1].toFixed(4)}`;}
  setTimeout(()=>{if(errEl){errEl.style.color='#ef4444';}},3000);
 };

 // Add button
 const addBtn = document.getElementById('cind-add');
 if(addBtn) addBtn.onclick = () => {
  const name = document.getElementById('cind-name')?.value?.trim() || 'مؤشر مخصص';
  const formula = document.getElementById('cind-formula')?.value?.trim();
  const type = document.getElementById('cind-type')?.value || 'subpanel';
  const color = document.getElementById('cind-color')?.value || '#3b9eff';
  const errEl = document.getElementById('cind-error');
  if(!formula){ if(errEl){errEl.style.display='block';errEl.textContent='أدخل معادلة أولاً';} return; }
  // Quick validate
  const all = state.allCandles;
  if(all.length){
   const result = _evalCustomInd(formula, all.map(d=>d.c), all.map(d=>d.hi), all.map(d=>d.lo), all.map(d=>d.v));
   if(!result || !result.filter(v=>v!=null).length){
    if(errEl){errEl.style.display='block';errEl.textContent='خطأ في المعادلة';} return;
   }
  }
  customInds.push({id:'cind_'+Date.now(), name, formula, type, color, lineWidth:1.4});
  saveSettings(); invalidateChart(); renderActive(); render();
 };

}



