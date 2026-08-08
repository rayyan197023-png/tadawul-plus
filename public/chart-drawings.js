// ═══════════════════════════════════════════════
// chart-drawings.js -- Drawing Hit Test & Helpers
// ═══════════════════════════════════════════════

// DRAWING HIT TEST
// 
function dPtSeg(px,py,x1,y1,x2,y2){
 const dx=x2-x1,dy=y2-y1,L=dx*dx+dy*dy;
 if(!L) return Math.hypot(px-x1,py-y1);
 const t=Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/L));
 return Math.hypot(px-x1-t*dx,py-y1-t*dy);
}
function dHit(dr,px,py){
 const{p1,p2,tool}=dr; if(!p1) return false;
 const R=14;
 if(tool==='hline') return Math.abs(py-p1.y)<R;
 if(tool==='vline') return Math.abs(px-p1.x)<R;
 // Pattern tools: hit near any point or any segment
 if(isPatternTool(tool)&&dr.pts&&dr.pts.length>0){
 for(const pt of dr.pts)
 if(Math.hypot(px-pt.x,py-pt.y)<R*2.5) return true;
 for(let i=0;i<dr.pts.length-1;i++)
 if(dPtSeg(px,py,dr.pts[i].x,dr.pts[i].y,dr.pts[i+1].x,dr.pts[i+1].y)<R) return true;
 return false;
 }
 if(!p2) return Math.hypot(px-p1.x,py-p1.y)<R;
 if(['rect','triangle','measure','daterange','eqchan','regchan','stddev'].includes(tool)){
 const rx=Math.min(p1.x,p2.x),ry=Math.min(p1.y,p2.y);
 const rw=Math.abs(p2.x-p1.x),rh=Math.abs(p2.y-p1.y);
 return px>rx-R&&px<rx+rw+R&&py>ry-R&&py<ry+rh+R;
 }
 // Fan tools: hit if near origin point OR near p2
 if(['fibfan','ganfan','angfan'].includes(tool)){
 if(Math.hypot(px-p1.x,py-p1.y)<R*3) return true; // near origin
 if(p2&&Math.hypot(px-p2.x,py-p2.y)<R*3) return true; // near p2
 // Check along the main (100%) line
 if(p2) return dPtSeg(px,py,p1.x,p1.y,p2.x,p2.y)<R*2;
 return false;
 }
 return dPtSeg(px,py,p1.x,p1.y,p2.x,p2.y)<R;
}
function dFind(px,py){
 for(let i=state.drawings.length-1;i>=0;i--){
  const dr=state.drawings[i];
  // Skip AI drawings and wave dots -- handled by _checkWaveDotTap
  if(dr._ai) continue;
  if(dHit(dr,px,py)) return i;
 }
 return -1;
}
function dHandles(dr){
 if(!dr.p1) return[];
 // Pattern tools: return all pts as handles
 if(dr.pts&&dr.pts.length>0&&isPatternTool(dr.tool)){
 return dr.pts.map((p,i)=>({x:p.x,y:p.y,i}));
 }
 if(!dr.p2) return[{x:dr.p1.x,y:dr.p1.y,i:0}];
 if(dr.tool==='hline'){
  // Handles responsive: 15% و 60% من عرض الرسم (بدل قيم ثابتة)
  const W=(cv&&cv.offsetWidth)?cv.offsetWidth-38:300;
  return[{x:Math.max(40,W*0.15),y:dr.p1.y,i:0},{x:Math.max(120,W*0.60),y:dr.p1.y,i:1}];
 }
 if(['eqchan','regchan','stddev'].includes(dr.tool)){
 const dx=dr.p2.x-dr.p1.x, dy=dr.p2.y-dr.p1.y;
 const len=Math.sqrt(dx*dx+dy*dy)||1;
 const nx=-dy/len, ny=dx/len; // perpendicular unit vector
 const w=dr.width||30;
 const mx=(dr.p1.x+dr.p2.x)/2, my=(dr.p1.y+dr.p2.y)/2;
 return[
 {x:dr.p1.x,y:dr.p1.y,i:0},
 {x:dr.p2.x,y:dr.p2.y,i:1},
 {x:mx+nx*w, y:my+ny*w, i:2} // width handle (perpendicular from midpoint)
 ];
 }
 return[{x:dr.p1.x,y:dr.p1.y,i:0},{x:dr.p2.x,y:dr.p2.y,i:1}];
}
function dNearHandle(dr,px,py){
 const R=isPatternTool(dr.tool)?44:22;
 let best=-1,bestD=R;
 for(const h of dHandles(dr)){
 const d=Math.hypot(px-h.x,py-h.y);
 if(d<bestD){bestD=d;best=h.i;}
 }
 return best;
}

function cmPos(d){
 // If user moved and it's the same drawing, keep position
 if(CM.userMoved&&CM.selId===drSelId)return;
 const p1=d&&d.p1?d.p1:{x:90,y:200};
 const p2=d&&d.p2?d.p2:p1;
 const ww=cv.offsetWidth||390,wh=cv.offsetHeight||600;
 let mx=(p1.x+p2.x)/2-CM.w/2,my=Math.min(p1.y,p2.y)-CM.h-14;
 if(my<4)my=Math.max(p1.y,p2.y)+14;
 mx=Math.max(4,Math.min(ww-CM.w-4,mx));
 my=Math.max(4,Math.min(wh-CM.h-4,my));
 CM.x=Math.round(mx);CM.y=Math.round(my);
 CM.cpX=CM.x;CM.cpY=CM.y-CM.cpH-8;
 if(CM.cpY<4)CM.cpY=CM.y+CM.h+8;
}

function cmHide(){CM.show=false;CM.colorOpen=false;render();}
function cmHit(px,py){
 if(!CM.show)return null;
 const{x,y,w,h}=CM;
 if(CM.colorOpen){
 if(px>=CM.cpX&&px<=CM.cpX+CM.cpW&&py>=CM.cpY&&py<=CM.cpY+CM.cpH){
 const cols=COLORS,ss=24,sg=6,cpr=Math.ceil(cols.length/2);
 for(let ci=0;ci<cols.length;ci++){
 const sx=CM.cpX+8+(ci%cpr)*(ss+sg),sy=CM.cpY+16+Math.floor(ci/cpr)*(ss+sg);
 if(Math.hypot(px-sx-ss/2,py-sy-ss/2)<=ss/2+8)return{act:'color_pick',col:cols[ci]};
 }
 return{act:'picker_bg'};
 }
 CM.colorOpen=false;render();return{act:'picker_close'};
 }
 if(px<x-4||px>x+w+4||py<y-4||py>y+h+4)return{act:'outside'};
 // Close button (circle, top-left)
 if(Math.hypot(px-(x+17),py-(y+18))<=14)return{act:'close'};
 // Buttons row
 if(py>=y+36){
 const pad=6,gap=5,bw=(w-pad*2-gap*2)/3;
 const bi=Math.min(2,Math.max(0,Math.floor((px-x-pad)/(bw+gap))));
 if(['color','dupe','del'][bi])return{act:['color','dupe','del'][bi]};
 }
 return{act:'drag'};
}
function _drawCM(){
 if(!CM.show)return;
 const{x,y,w,h}=CM;
 const d=state.drawings.find(d=>d&&d.id===(CM.selId||drSelId));
 const isTextTool=d&&['text','callout'].includes(d.tool);
 const dCol=d?d.color:'#3b9eff';
 const tool=d?DRAW_TOOLS_LIST.find(t=>t.id===d.tool):null;
 const R=12; // corner radius
 ctx.save();

 // Card shadow 
 ctx.shadowColor='rgba(0,10,30,0.95)';
 ctx.shadowBlur=28;ctx.shadowOffsetY=6;

 // Card background (glass morphism) 
 ctx.fillStyle='rgba(8,14,28,0.97)';
 ctx.strokeStyle='rgba(59,158,255,0.35)';
 ctx.lineWidth=1.3;
 ctx.beginPath();ctx.roundRect(x,y,w,h,R);ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;

 // Top accent line 
 const grad=ctx.createLinearGradient(x,y,x+w,y);
 grad.addColorStop(0,'rgba(59,158,255,0)');
 grad.addColorStop(0.4,'rgba(59,158,255,0.8)');
 grad.addColorStop(0.6,'rgba(59,158,255,0.8)');
 grad.addColorStop(1,'rgba(59,158,255,0)');
 ctx.fillStyle=grad;
 ctx.fillRect(x+R,y,w-R*2,1.5);

 // Title bar 
 ctx.fillStyle='rgba(59,158,255,0.06)';
 ctx.beginPath();ctx.roundRect(x,y,w,36,R);ctx.fill();


 // Separator 
 ctx.strokeStyle='rgba(59,158,255,0.14)';ctx.lineWidth=0.7;
 ctx.beginPath();ctx.moveTo(x+8,y+36);ctx.lineTo(x+w-8,y+36);ctx.stroke();

 // Drag dots 
 for(let di=0;di<3;di++){
 ctx.beginPath();ctx.arc(x+w/2-12+di*12,y+18,1.8,0,Math.PI*2);
 ctx.fillStyle='rgba(59,158,255,0.4)';ctx.fill();
 }

 // Tool name 
 ctx.fillStyle='rgba(255,255,255,0.7)';
 ctx.font='600 11px Cairo,sans-serif';
 ctx.textAlign='right';ctx.textBaseline='middle';
 ctx.fillText(tool?tool.l:'رسم',x+w-10,y+18);

 // Close button (X) 
 const cbx=x+8,cby=y+9,cbr=9;
 ctx.fillStyle='rgba(239,68,68,0.15)';
 ctx.strokeStyle='rgba(239,68,68,0.4)';ctx.lineWidth=1;
 ctx.beginPath();ctx.arc(cbx+cbr,cby+cbr,cbr,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#ef4444';ctx.font='bold 11px sans-serif';
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText('×',cbx+cbr,cby+cbr+0.5);

 // Action buttons 
 const btns=[
 {label:'لون', bg:[255,255,255], a:0.06, bc:[255,255,255], ba:0.12, tc:[200,210,230]},
 {label:'نسخ', bg:[59,158,255], a:0.1, bc:[59,158,255], ba:0.3, tc:[59,158,255]},
 {label:'حذف', bg:[239,68,68], a:0.1, bc:[239,68,68], ba:0.3, tc:[239,68,68]},
 ];

 const pad=6,gap=5;
 const totalGap=gap*(btns.length-1)+pad*2;
 const bw=(w-totalGap)/btns.length;
 const by2=y+40,bh2=h-44;

 btns.forEach((btn,bi)=>{
 const bx=x+pad+bi*(bw+gap);
 const[r2,g2,b2]=btn.bg;
 // Button bg
 ctx.fillStyle=`rgba(${r2},${g2},${b2},${btn.a})`;
 ctx.strokeStyle=`rgba(${btn.bc[0]},${btn.bc[1]},${btn.bc[2]},${btn.ba})`;
 ctx.lineWidth=1;
 ctx.beginPath();ctx.roundRect(bx,by2,bw,bh2,8);ctx.fill();ctx.stroke();

 // Icon (top area)
 if(bi===0){
 // Color button: draw a colored circle instead of icon
 const cr=12, cx2=bx+bw/2, cy2=by2+bh2*0.42;
 ctx.beginPath();ctx.arc(cx2,cy2,cr,0,Math.PI*2);
 ctx.fillStyle=dCol;ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=1.5;ctx.stroke();
 // Small palette icon inside
 
 } else if(bi===1){
 // Copy icon: two overlapping squares
 const _cx=bx+bw/2, _cy=by2+bh2*0.42, _s=8;
 ctx.strokeStyle=`rgba(${r2},${g2},${b2},0.9)`;ctx.lineWidth=1.3;ctx.setLineDash([]);
 ctx.beginPath();ctx.roundRect(_cx-_s*0.3,_cy-_s*0.3,_s*1.1,_s*1.1,1.5);ctx.stroke();
 ctx.beginPath();ctx.roundRect(_cx-_s*0.8,_cy-_s*0.8,_s*1.1,_s*1.1,1.5);
 ctx.fillStyle=`rgba(${r2},${g2},${b2},0.12)`;ctx.fill();ctx.stroke();
 } else if(bi===2){
 // Delete icon: trash bin
 const _cx=bx+bw/2, _cy=by2+bh2*0.42, _s=9;
 ctx.strokeStyle=`rgba(${r2},${g2},${b2},0.9)`;ctx.lineWidth=1.3;ctx.setLineDash([]);
 // Bin body
 ctx.beginPath();
 ctx.moveTo(_cx-_s*0.55,_cy-_s*0.1);
 ctx.lineTo(_cx-_s*0.4,_cy+_s*0.65);
 ctx.lineTo(_cx+_s*0.4,_cy+_s*0.65);
 ctx.lineTo(_cx+_s*0.55,_cy-_s*0.1);
 ctx.stroke();
 // Lid
 ctx.beginPath();ctx.moveTo(_cx-_s*0.65,_cy-_s*0.1);ctx.lineTo(_cx+_s*0.65,_cy-_s*0.1);ctx.stroke();
 // Handle
 ctx.beginPath();ctx.moveTo(_cx-_s*0.25,_cy-_s*0.1);ctx.lineTo(_cx-_s*0.25,_cy-_s*0.45);ctx.lineTo(_cx+_s*0.25,_cy-_s*0.45);ctx.lineTo(_cx+_s*0.25,_cy-_s*0.1);ctx.stroke();
 // Lines inside bin
 ctx.lineWidth=1;ctx.globalAlpha*=0.6;
 ctx.beginPath();ctx.moveTo(_cx,_cy+_s*0.55);ctx.lineTo(_cx,_cy+_s*0.05);ctx.stroke();
 ctx.globalAlpha=1;
 }

 // Label (bottom area)
 const[tr,tg,tb]=btn.tc;
 ctx.fillStyle=`rgba(${tr},${tg},${tb},0.9)`;
 ctx.font='bold 9px Cairo,sans-serif';ctx.textBaseline='bottom';
 ctx.fillText(btn.label,bx+bw/2,by2+bh2-3);
 });

 // Color picker popup 
 if(CM.colorOpen){
 ctx.shadowColor='rgba(0,10,30,0.95)';ctx.shadowBlur=20;
 ctx.fillStyle='rgba(8,14,28,0.97)';
 ctx.strokeStyle='rgba(59,158,255,0.3)';ctx.lineWidth=1.2;
 ctx.beginPath();ctx.roundRect(CM.cpX,CM.cpY,CM.cpW,CM.cpH,10);ctx.fill();ctx.stroke();
 ctx.shadowBlur=0;
 // Top accent
 ctx.fillStyle='rgba(59,158,255,0.6)';ctx.fillRect(CM.cpX+10,CM.cpY,CM.cpW-20,1);
 // Label
 ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='8px Cairo,sans-serif';
 ctx.textAlign='right';ctx.textBaseline='alphabetic';
 ctx.fillText('اختر اللون',CM.cpX+CM.cpW-8,CM.cpY+13);
 // Swatches
 const cols=COLORS,ss=24,sg=6,cpr=Math.ceil(cols.length/2);
 cols.forEach((col,ci)=>{
 const sx=CM.cpX+8+(ci%cpr)*(ss+sg);
 const sy=CM.cpY+16+Math.floor(ci/cpr)*(ss+sg);
 // Swatch
 ctx.beginPath();ctx.arc(sx+ss/2,sy+ss/2,ss/2,0,Math.PI*2);
 ctx.fillStyle=col;ctx.fill();
 const isA=d&&d.color===col;
 if(isA){
 ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();
 ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fill();
 ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText('✓',sx+ss/2,sy+ss/2+1);
 } else {
 ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;ctx.stroke();
 }
 });
 }

 ctx.restore();ctx.textBaseline='alphabetic';
}

