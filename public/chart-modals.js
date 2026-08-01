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


