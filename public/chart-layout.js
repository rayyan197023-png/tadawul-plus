// ═══════════════════════════════════════════════
// chart-layout.js -- Layout & Coordinate Helpers
// ═══════════════════════════════════════════════


// LAYOUT
// 
function chartBounds(){
 const W=cv.offsetWidth||1,H=cv.offsetHeight||1,YW=38,CW=W-YW;
 const hasSub=state.inds.some(id=>
 ['RSI','MACD','STOCH','STOCHRSI','ROC','MOM','AO','TSI','OBV','MFI','CMF','ADX','DPO','ATR','STD'].includes(id));
 const VOL_H=Math.round(H*0.11);
 const SUB_H=hasSub?Math.round(H*0.22):0;
 const cTop=12, cBot=H-22-3-VOL_H-(hasSub?SUB_H+3:0);
 const bw=Math.max(1.5,(CW/Math.max(1,state.visible))*0.72);
 return{W,H,YW,CW,cTop,cBot,cH:cBot-cTop,bw};
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