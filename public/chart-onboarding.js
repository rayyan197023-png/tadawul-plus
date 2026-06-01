// ═══════════════════════════════════════════════
// chart-onboarding.js -- Onboarding Tour
// ═══════════════════════════════════════════════

// ── Onboarding Tour ──────────────────────────────────
const ONBOARDING_KEY = 'tadawul_onboarded_v1';

const ONBOARDING_STEPS = [
 {
  target: 'btn-ind',
  title: 'المؤشرات الفنية',
  body: 'اضغط هنا لإضافة مؤشرات على الشارت مثل RSI وMACD والمتوسطات المتحركة',
  icon: '<svg viewBox="0 0 28 20" fill="none" width="24" height="24"><polyline points="2,16 8,8 14,11 20,4 26,6" stroke="#3b9eff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pos: 'bottom'
 },
 {
  target: 'btn-draw',
  title: 'أدوات الرسم',
  body: 'ارسم خطوط الاتجاه، مستويات فيبوناتشي، والأنماط الفنية مباشرة على الشارت',
  icon: '<svg viewBox="0 0 28 22" fill="none" width="24" height="24"><path d="M5 17 L10 7 L18 14 L23 5" stroke="#3b9eff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pos: 'bottom'
 },
 {
  target: 'btn-alert',
  title: 'التنبيهات',
  body: 'ضع تنبيهاً على أي سعر أو مؤشر -- يُرسل إشعاراً فور الوصول',
  icon: '<svg viewBox="0 0 28 22" fill="none" width="24" height="24"><path d="M14 3 C9 3 6 7 6 11 L6 15 L4 17 L24 17 L22 15 L22 11 C22 7 19 3 14 3Z" stroke="#3b9eff" stroke-width="1.4" fill="none"/></svg>',
  pos: 'bottom'
 },
 {
  target: null,
  title: 'جاهز للتداول!',
  body: 'اضغط مطولاً على الشارت للحصول على بيانات الشمعة · انقر مرتين على المحور لاستعادة الحجم',
  icon: '<svg viewBox="0 0 40 40" fill="none" width="40" height="40"><circle cx="20" cy="20" r="18" stroke="#22c55e" stroke-width="1.5" fill="rgba(34,197,94,0.1)"/><polyline points="12,20 17,25 28,14" stroke="#22c55e" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pos: 'center'
 },
];

let _obStep = 0;

// حقن @keyframes للـ pulse animation (مرّة واحدة فقط)
function _injectObStyles(){
 if(document.getElementById('ob-styles'))return;
 const style=document.createElement('style');
 style.id='ob-styles';
 style.textContent=`
  @keyframes obPulse {
   0%   { box-shadow: 0 0 0 4px rgba(59,158,255,0.25), 0 0 20px rgba(59,158,255,0.4); }
   50%  { box-shadow: 0 0 0 8px rgba(59,158,255,0.15), 0 0 30px rgba(59,158,255,0.6); }
   100% { box-shadow: 0 0 0 4px rgba(59,158,255,0.25), 0 0 20px rgba(59,158,255,0.4); }
  }
 `;
 document.head.appendChild(style);
}

function startOnboarding(){
 if(localStorage.getItem(ONBOARDING_KEY)) return;
 // انتظر تحميل البيانات قبل البدء
 if(typeof chartReady!=='undefined'&&!chartReady){
  setTimeout(startOnboarding, 500);
  return;
 }
 _injectObStyles();
 _obStep = 0;
 _showObStep();
}

function _showObStep(){
 // Remove existing
 const old = document.getElementById('ob-overlay');
 if(old) old.remove();

 const step = ONBOARDING_STEPS[_obStep];
 if(!step) { _endOnboarding(); return; }

 const overlay = document.createElement('div');
 overlay.id = 'ob-overlay';
 overlay.style.cssText = 'position:fixed;inset:0;z-index:20000;pointer-events:none';

 // Dim background
 const dim = document.createElement('div');
 dim.style.cssText = 'position:absolute;inset:0;background:rgba(4,7,18,0.75);pointer-events:auto';
 dim.onclick = () => _nextObStep();
 overlay.appendChild(dim);

 // Highlight target button
 if(step.target){
  const el = document.getElementById(step.target);
  if(el){
   const r = el.getBoundingClientRect();
   const pad = 6;
   const hl = document.createElement('div');
   hl.style.cssText = `position:absolute;left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;border:2px solid #3b9eff;border-radius:14px;box-shadow:0 0 0 4px rgba(59,158,255,0.25),0 0 20px rgba(59,158,255,0.4);pointer-events:none;animation:obPulse 1.5s ease-in-out infinite`;
   overlay.appendChild(hl);

   // Punch hole
   const hole = document.createElement('div');
   hole.style.cssText = `position:absolute;left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px;background:transparent;pointer-events:auto;border-radius:12px`;
   hole.onclick = e => { e.stopPropagation(); _nextObStep(); };
   overlay.appendChild(hole);
  }
 }

 // Tooltip card
 const card = document.createElement('div');
 const isCenter = step.pos === 'center';
 card.style.cssText = isCenter
  ? 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto'
  : 'position:absolute;left:50%;transform:translateX(-50%);pointer-events:auto';

 if(!isCenter){
  const el = step.target ? document.getElementById(step.target) : null;
  const r = el ? el.getBoundingClientRect() : {bottom: 80};
  card.style.top = (r.bottom + 16) + 'px';
 }

 card.innerHTML = `
  <div style="background:linear-gradient(145deg,#0d1628,#060c18);border:1.5px solid rgba(59,158,255,0.4);border-radius:18px;padding:20px;width:280px;box-shadow:0 8px 40px rgba(0,0,0,0.9);text-align:center">
   <div style="margin-bottom:12px">${step.icon}</div>
   <div style="font-size:15px;font-weight:800;color:#e0eaf8;font-family:Cairo,sans-serif;margin-bottom:8px">${step.title}</div>
   <div style="font-size:12px;color:#6080a0;font-family:Cairo,sans-serif;line-height:1.7;margin-bottom:16px">${step.body}</div>
   <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
    <button onclick="_endOnboarding()" style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#4a6080;font-size:11px;font-family:Cairo,sans-serif;padding:7px 14px;cursor:pointer">تخطي</button>
    <div style="display:flex;align-items:center;gap:6px">
     ${_obStep>0?`<button onclick="_prevObStep()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#7090b0;font-size:11px;font-family:Cairo,sans-serif;padding:7px 12px;cursor:pointer">‹ السابق</button>`:''}
     <div style="display:flex;gap:5px">
      ${ONBOARDING_STEPS.map((_,i)=>`<div style="width:6px;height:6px;border-radius:50%;background:${i===_obStep?'#3b9eff':'rgba(59,158,255,0.25)'}"></div>`).join('')}
     </div>
    </div>
    <button onclick="_nextObStep()" style="background:linear-gradient(135deg,#1a3a6e,#0d2248);border:1.5px solid rgba(59,158,255,0.5);border-radius:8px;color:#3b9eff;font-size:12px;font-weight:700;font-family:Cairo,sans-serif;padding:7px 16px;cursor:pointer">${_obStep===ONBOARDING_STEPS.length-1?'ابدأ!':'التالي'}</button>
   </div>
  </div>
 `;
 overlay.appendChild(card);
 document.body.appendChild(overlay);
}

function _nextObStep(){
 _obStep++;
 if(_obStep >= ONBOARDING_STEPS.length) _endOnboarding();
 else _showObStep();
}

function _endOnboarding(){
 const old = document.getElementById('ob-overlay');
 if(old){ old.style.opacity='0'; old.style.transition='opacity 0.3s'; setTimeout(()=>old.remove(),300); }
 localStorage.setItem(ONBOARDING_KEY, '1');
}
