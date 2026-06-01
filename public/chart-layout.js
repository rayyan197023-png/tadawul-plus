// ═══════════════════════════════════════════════
// chart-layout.js -- Layout & Coordinate Helpers
// ═══════════════════════════════════════════════


// LAYOUT
// 
function chartBounds(){
 // ── مطابق تماماً لـ render() في chart.html ──
 // أيّ تعديل هنا يجب أن يُطابَق في render() والعكس صحيح
 const W=cv.offsetWidth||1,H=cv.offsetHeight||1,YW=38,CW=W-YW;
 // قائمة الـ sub-indicators مطابقة لـ SUB_INDS_BASE في render()
 const SUB_IDS=['RSI','MACD','STOCH','STOCHRSI','OBV','MFI','ADX','ATR','STD'];
 const subInds=SUB_IDS.filter(id=>state.inds.includes(id));
 // أضف custom sub-panel indicators إن وُجدت
 const customSubInds=(typeof customInds!=='undefined'&&Array.isArray(customInds))
   ?customInds.filter(ci=>ci.type==='subpanel').map(ci=>ci.id):[];
 const allSubs=[...subInds,...customSubInds];
 const hasSub=allSubs.length>0;
 // استخدم getPanelH إن كانت متوفّرة (مع user resize)، وإلا fallback ثابت
 const getPH=(typeof getPanelH==='function')
   ?getPanelH
   :(_key,h,frac)=>Math.round(h*frac);
 const VOL_H=getPH('vol',H,0.14);
 const SUB_H=hasSub?allSubs.reduce((sum,_,pi)=>sum+getPH('sub_'+pi,H,0.09),0):0;
 // Order Flow panel إن كان مُفعَّلاً
 const OF_H=(typeof showOrderFlow!=='undefined'&&showOrderFlow)?getPH('of',H,0.10):0;
 const cTop=12;
 const cBot=H-22-3-VOL_H-(hasSub?SUB_H+3:0)-(OF_H?OF_H+3:0);
 const bw=Math.max(1.5,(CW/Math.max(1,state.visible))*0.72);
 return{W,H,YW,CW,cTop,cBot,cH:cBot-cTop,bw,vTop:cBot+3,vBot:cBot+3+VOL_H,SUB_H,OF_H};
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