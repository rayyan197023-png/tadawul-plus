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

