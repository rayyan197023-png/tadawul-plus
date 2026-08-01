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