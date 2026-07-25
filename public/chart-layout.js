// ═══════════════════════════════════════════════
// chart-layout.js -- Layout & Coordinate Helpers
// ═══════════════════════════════════════════════


// LAYOUT
// 
const FUTURE_PAD=26; // مساحة ثابتة يمين الشارت لغيمة إيشيموكو المستقبلية -- ثابت عام مشترك

function chartBounds(forceN){
 const W=cv.offsetWidth||1,H=cv.offsetHeight||1,YW=38,CW=W-YW;
 const SUB_IDS=['RSI','MACD','STOCH','STOCHRSI','OBV','MFI','ADX','ATR','STD'];
 const subInds=SUB_IDS.filter(id=>state.inds.includes(id));
 const customSubInds=(typeof customInds!=='undefined'&&Array.isArray(customInds))
   ?customInds.filter(ci=>ci.type==='subpanel').map(ci=>ci.id):[];
 const allSubs=[...subInds,...customSubInds];
 const hasSub=allSubs.length>0;
 const getPH=(typeof getPanelH==='function')
   ?getPanelH
   :(_key,h,frac)=>Math.round(h*frac);
 // بانل الحجم يُخفى بالكامل لمؤشر تاسي -- يجب مطابقة نفس الاستثناء الموجود في render()
 // وإلا يصير فرق ثابت في cBot بين وقت حفظ الرسمة ووقت رسمها، فتنزاح عمودياً بمقدار ثابت
 const _isTasiMode=(typeof _isCurrentIndexMode==='function')?_isCurrentIndexMode():false;
 const VOL_H=_isTasiMode?0:getPH('vol',H,0.14);
 const SUB_H=hasSub?allSubs.reduce((sum,_,pi)=>sum+getPH('sub_'+pi,H,0.09),0):0;
 const OF_H=(typeof showOrderFlow!=='undefined'&&showOrderFlow)?getPH('of',H,0.10):0;
 const cTop=12;
 const cBot=H-22-3-VOL_H-(hasSub?SUB_H+3:0)-(OF_H?OF_H+3:0);

 // إذا مُرِّر forceN (طول sub.length الفعلي من render())، نستخدمه كمصدر وحيد للحقيقة
 // بدل إعادة اشتقاق VIS من state.visible، لأن الاثنين قد يختلفا عند حواف البيانات
 const VIS=(forceN!=null)?Math.max(1,forceN):Math.min(Math.max(8,state.visible),Math.max(1,state.allCandles.length));
 // نفس منطق حجز مساحة الغيمة المستقبلية -- شرطي بـ offset===0 وتفعيل المؤشر
 const _ichiActive=(typeof state!=='undefined'&&Array.isArray(state.inds)&&state.inds.includes('ICHIMOKU'));
 const _atRightEdge=(state.offset===0);
 const _cloudPad=(_ichiActive&&_atRightEdge)?26:0;

 const bw=Math.max(1.5,(CW/(VIS+_cloudPad))*0.72);
 const drawW=CW-bw*2-16;
 const totalSlots=VIS+_cloudPad-1;
 const tx=i=>bw*0.5+(totalSlots<=0?drawW/2:(i/totalSlots)*(drawW-bw*2));
 const px2idx=px=>totalSlots<=0?0:((px-bw*0.5)/(drawW-bw*2))*totalSlots;

 return{W,H,YW,CW,cTop,cBot,cH:cBot-cTop,bw,drawW,VIS,totalSlots,tx,px2idx,
   vTop:cBot+3,vBot:cBot+3+VOL_H,SUB_H,OF_H};
}

function inChart(pt){
 const b=chartBounds();
 return pt.x>0&&pt.x<b.CW&&pt.y>b.cTop&&pt.y<b.cBot;
}
function getPt(e,i=0){
 const r=cv.getBoundingClientRect();
 const s=e.touches?e.touches[i]:e;
 return{x:s.clientX-r.left,y:s.clientY-r.top};
}


function getTD(e){
 return Math.hypot(
 e.touches[0].clientX-e.touches[1].clientX,
 e.touches[0].clientY-e.touches[1].clientY);
}
function doPan(dx){
 const b=chartBounds();
 const VIS=Math.min(Math.max(8,state.visible),state.allCandles.length);
 const maxOff=Math.max(0,state.allCandles.length-VIS);
 const drawW=b.CW-b.bw*2-16, ppx=drawW/(VIS-1||1);
 state.offset=Math.min(maxOff,Math.max(0,drag.off0+Math.round(dx/(ppx||8))));
}
