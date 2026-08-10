// ═══════════════════════════════════════════════
// chart-layout.js -- Layout & Coordinate Helpers
// ═══════════════════════════════════════════════

// LAYOUT
// 
const FUTURE_PAD=26; // مساحة ثابتة يمين الشارت لغيمة إيشيموكو المستقبلية -- ثابت عام مشترك

function chartBounds(forceN){
 const W=cv.offsetWidth||1,H=cv.offsetHeight||1,YW=38,CW=W-YW;
 const SUB_IDS=['RSI','MACD','STOCH','STOCHRSI','OBV','MFI','ADX','ATR','STD','ROC','CMF'];
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
 const ppx=(b.drawW-b.bw*2)/Math.max(1,b.totalSlots);
 state.offset=Math.min(maxOff,Math.max(0,drag.off0+Math.round(dx/(ppx||8))));
}


function getPanelH(key, H, defaultPct){
 const pct = panelSizes[key] !== undefined ? panelSizes[key] : defaultPct;
 return Math.round(H * Math.max(PANEL_MIN_PCT, Math.min(PANEL_MAX_PCT, pct)));
}

function _drawPanelHandle(ctx, x, y, CW){
 // Small grey square centered ON the separator line (half above, half below)
 const hw=14, hh=8, hx=x+4, hy=y-hh/2;
 ctx.fillStyle='rgba(90,105,125,0.85)';
 ctx.beginPath();
 ctx.roundRect(hx, hy, hw, hh, 2);
 ctx.fill();
 // 3 horizontal dots centered vertically
 ctx.fillStyle='rgba(190,200,220,0.8)';
 for(let i=0;i<3;i++){
  ctx.beginPath();
  ctx.arc(hx+3+i*4, y, 1.2, 0, Math.PI*2);
  ctx.fill();
 }
}

function _hitPanelHandle(px, py, hx, hy){
 // Hit area: wider for easy touch
 return px>=hx && px<=hx+40 && py>=hy-10 && py<=hy+10;
}

function _startPanelDrag(panel, startY, H){
 _panelDrag = {panel, startY, H,
  startPct: panelSizes[panel] !== undefined ? panelSizes[panel] :
   (panel==='vol' ? 0.14 : 0.09)
 };
}
function _movePanelDrag(currentY){
 if(!_panelDrag) return false;
 const {panel, startY, H, startPct} = _panelDrag;
 const dy = startY - currentY; // dragging up = increase, down = decrease
 const dpct = dy / H;
 const newPct = Math.max(PANEL_MIN_PCT, Math.min(PANEL_MAX_PCT, startPct + dpct));
 panelSizes[panel] = newPct;
 invalidateChart();
 render();
 return true;
}

function _endPanelDrag(){
 if(_panelDrag){
  _panelDrag = null;
  saveSettings();
  return true;
 }
 return false;
}


// ── Dynamic Zoom Controls Position ──────────────────
function _updateZoomCtrlPos(){
 const zc = document.getElementById('zoom-ctrl');
 if(!zc) return;
 const H = cv.offsetHeight || 400;
 const VOL_H = _isCurrentIndexMode()?0:getPanelH('vol', H, 0.14);
 const _subIds = [...['RSI','MACD','STOCH','STOCHRSI','OBV','MFI','ADX','ATR','STD','ROC','CMF'].filter(id=>state.inds.includes(id)),...customInds.filter(ci=>ci.type==='subpanel').map(ci=>ci.id)];
 const hasSub = _subIds.length > 0;
 const SUB_H = hasSub ? _subIds.reduce((a,_,pi)=>a+getPanelH('sub_'+pi,H,0.09),0) : 0;
 const OF_H = showOrderFlow ? getPanelH('of',H,0.10) : 0;
 const cBot = H - 22 - 3 - VOL_H - (hasSub?SUB_H+3:0) - (OF_H?OF_H+3:0);
 // Position buttons ON the separator line between chart and volume panel
 const btnH = 48;
 const topPos = cBot - btnH/2 + 3;
 zc.style.top = Math.max(10, topPos) + 'px';
 zc.style.bottom = 'auto';
}

function _calcOrderFlow(candles){
 // Delta estimation using CLV (Close Location Value) -- industry standard for OHLCV
 // buyRatio = (close - low) / (high - low)
 // Ranges 0 (close at low = all selling) to 1 (close at high = all buying)
 // Bias < 1.5% on random data -- academically accepted method
 return candles.map(d=>{
  const range = d.hi - d.lo || 0.001;
  const o = d.o || d.c;
  // CLV: primary signal from close position
  const clv = (d.c - d.lo) / range;
  // Blend with open position for direction bias
  const openLoc = (o - d.lo) / range;
  // Weighted: 60% close location, 40% open location (open shows intent)
  const buyRatio = Math.min(0.95, Math.max(0.05, clv * 0.6 + openLoc * 0.4));
  const buyVol = Math.round(d.v * buyRatio);
  const sellVol = d.v - buyVol;
  const delta = buyVol - sellVol;
  const deltaPct = delta / (d.v || 1) * 100;
  return { buyVol, sellVol, delta, deltaPct, cumDelta: 0 };
 }).map((d,i,arr)=>{
  d.cumDelta = i===0 ? d.delta : arr[i-1].cumDelta + d.delta;
  return d;
 });
}

function _renderOrderFlow(ctx, sub, tx, top, ph, CW, bw){
 if(!showOrderFlow) return;
 const of = _calcOrderFlow(sub);
 if(!of.length) return;

 const maxAbs = Math.max(...of.map(d=>Math.abs(d.delta)), 1);
 const midY = top + ph*0.42; // zero line slightly above center (more room for negatives)
 const posH = midY - top - 4;   // space above zero line
 const negH = top + ph - midY - 4; // space below zero line
 const n = of.length;

 ctx.save();

 // Background
 ctx.fillStyle='rgba(4,7,16,0.75)';
 ctx.fillRect(0,top,CW,ph);

 // Grid lines at 25%, 50%, 75%
 [0.25,0.5,0.75,1.0].forEach(f=>{
  const py=midY-posH*f;
  const ny=midY+negH*f;
  ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.5;
  ctx.beginPath();ctx.moveTo(0,py);ctx.lineTo(CW,py);ctx.stroke();
  if(f<1){ctx.beginPath();ctx.moveTo(0,ny);ctx.lineTo(CW,ny);ctx.stroke();}
 });

 // Zero line -- stronger
 ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(0,midY);ctx.lineTo(CW,midY);ctx.stroke();

 // Find threshold for label display (top 30% bars)
 const sortedAbs=[...of.map(d=>Math.abs(d.delta))].sort((a,b)=>b-a);
 const labelThreshold=sortedAbs[Math.max(0,Math.floor(n*0.08))]||maxAbs*0.7; // top 8% only

 // Delta bars with + / - labels
 const barW=Math.max(1,bw-0.5);
 of.forEach((d,i)=>{
  const x=tx(i)-bw/2;
  const absD=Math.abs(d.delta);
  const isPos=d.delta>=0;

  // Bar height proportional, capped at available space
  const barH=isPos
   ? Math.min(posH, absD/maxAbs*posH)
   : Math.min(negH, absD/maxAbs*negH);

  // Color intensity based on strength
  const strength=absD/maxAbs;
  if(isPos){
   const alpha=0.35+strength*0.6;
   ctx.fillStyle=`rgba(34,197,94,${alpha})`;
   ctx.fillRect(x,midY-barH,barW,barH);
   // Top border line for strong bars
   if(strength>0.4){
    ctx.fillStyle=`rgba(34,197,94,${Math.min(1,alpha+0.3)})`;
    ctx.fillRect(x,midY-barH,barW,1.5);
   }
  } else {
   const alpha=0.35+strength*0.6;
   ctx.fillStyle=`rgba(239,68,68,${alpha})`;
   ctx.fillRect(x,midY,barW,barH);
   if(strength>0.4){
    ctx.fillStyle=`rgba(239,68,68,${Math.min(1,alpha+0.3)})`;
    ctx.fillRect(x,midY+barH-1.5,barW,1.5);
   }
  }

  // + / - label on significant bars
  if(absD>=labelThreshold&&barW>=6&&barH>=10){
   const lbl=isPos?'+':'-';
   ctx.fillStyle=isPos?'rgba(34,255,120,0.9)':'rgba(255,100,100,0.9)';
   ctx.font=`bold ${Math.min(9,barW*0.7)}px monospace`;
   ctx.textAlign='center';ctx.textBaseline='middle';
   const ly=isPos?midY-barH/2:midY+barH/2;
   ctx.fillText(lbl,tx(i),ly);
   ctx.textBaseline='alphabetic';
  }

  // No per-bar markers here -- handled by smart signal system below
 });

 // ── Smart Delta Signals (clipped to panel) ─────────
 ctx.save();ctx.beginPath();ctx.rect(0,top,CW,ph);ctx.clip();
 // ── Smart Delta Signals ─────────────────────────────
 // Statistical analysis: find significant events only
 const deltas=of.map(d=>d.delta);
 const absDeltas=deltas.map(Math.abs);
 const mean=absDeltas.reduce((a,b)=>a+b,0)/absDeltas.length||1;
 const variance=absDeltas.reduce((a,b)=>a+(b-mean)**2,0)/absDeltas.length;
 const sigma=Math.sqrt(variance)||mean;
 const spikeThresh=mean+2*sigma;     // 2σ spike threshold
 const volMean=of.reduce((a,d)=>a+(d.buyVol+d.sellVol),0)/of.length||1;
 const absorbThresh=volMean*1.5;     // 1.5x avg volume
 const absorbDeltaPct=0.08;          // delta < 8% of volume = absorption
 
 // Min gap between same-type signals (avoid clustering)
 const lastSig={spike:-20,diverge:-20,exhaust:-20,absorb:-20};
 
 of.forEach((d,i)=>{
  if(i<3)return;
  const absD=Math.abs(d.delta);
  const isPos=d.delta>=0;
  const x=tx(i), vol=d.buyVol+d.sellVol;
  const barH=isPos?Math.min(posH,absD/maxAbs*posH):Math.min(negH,absD/maxAbs*negH);

  // ── 1. SPIKE ◆ -- |delta| > 2σ (statistical outlier) ──────────
  if(absD>spikeThresh&&i-lastSig.spike>=8){
   lastSig.spike=i;
   const sy=Math.max(top+8,Math.min(top+ph-8,isPos?midY-barH-14:midY+barH+14));
   const sc=isPos?'#00ffaa':'#ff4466';
   // Diamond shape
   ctx.fillStyle=sc;
   ctx.beginPath();ctx.moveTo(x,sy-7);ctx.lineTo(x+5,sy);ctx.lineTo(x,sy+7);ctx.lineTo(x-5,sy);ctx.closePath();ctx.fill();
   ctx.fillStyle='rgba(0,0,0,0.7)';ctx.font='bold 5px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText('S',x,sy);ctx.textBaseline='alphabetic';
   // Subtle glow line down to bar
   ctx.strokeStyle=sc+'50';ctx.lineWidth=0.6;ctx.setLineDash([2,2]);
   ctx.beginPath();ctx.moveTo(x,sy+(isPos?7:-7));ctx.lineTo(x,isPos?midY-barH:midY+barH);ctx.stroke();ctx.setLineDash([]);
  }

  // ── 2. DIVERGENCE ▲▼ -- cumulative delta diverges from price ───
  // Price higher high but cumDelta lower high = bearish divergence
  // Price lower low but cumDelta higher low = bullish divergence
  if(i>=5&&i-lastSig.diverge>=10){
   const lookback=Math.min(i,15);
   const priceSlice=sub.slice(i-lookback,i+1).map(c=>c.c);
   const cumSlice=of.slice(i-lookback,i+1).map(d=>d.cumDelta);
   const priceHigh=Math.max(...priceSlice),priceLow=Math.min(...priceSlice);
   const cumHigh=Math.max(...cumSlice),cumLow=Math.min(...cumSlice);
   const priceRange=priceHigh-priceLow||0.001;
   const cumRange=cumHigh-cumLow||1;
   // Normalize trend direction
   const priceDir=(sub[i].c-sub[i-lookback].c)/priceRange;
   const cumDir=(of[i].cumDelta-of[i-lookback].cumDelta)/cumRange;
   // Strong divergence: directions clearly opposite
   if(priceDir>0.3&&cumDir<-0.3){
    // Bearish divergence: price up, delta down
    lastSig.diverge=i;
    const dy=Math.max(top+8,midY-posH-18);
    ctx.fillStyle='#ff6666';ctx.strokeStyle='#ff6666';
    ctx.font='bold 6px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='rgba(255,80,80,0.15)';ctx.strokeStyle='#ff6666';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.roundRect(x-9,dy-7,18,14,3);ctx.fill();ctx.stroke();
    ctx.fillStyle='#ff8888';ctx.fillText('DIV↓',x,dy);ctx.textBaseline='alphabetic';
   } else if(priceDir<-0.3&&cumDir>0.3){
    // Bullish divergence: price down, delta up
    lastSig.diverge=i;
    const dy=Math.min(top+ph-8,midY+negH+18);
    ctx.fillStyle='rgba(80,255,160,0.15)';ctx.strokeStyle='#00ff88';ctx.lineWidth=0.8;
    ctx.beginPath();ctx.roundRect(x-9,dy-7,18,14,3);ctx.fill();ctx.stroke();
    ctx.fillStyle='#00ff88';ctx.font='bold 6px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('DIV↑',x,dy);ctx.textBaseline='alphabetic';
   }
  }

  // ── 3. EXHAUSTION ⊗ -- 4+ same-direction bars then reversal ───
  if(i>=4&&i-lastSig.exhaust>=8){
   const streak=4;
   let sameDir=true;
   const dir0=of[i-streak].delta>=0;
   for(let k=i-streak+1;k<i;k++){if((of[k].delta>=0)!==dir0)sameDir=false;}
   if(sameDir&&(d.delta>=0)!==dir0){
    lastSig.exhaust=i;
    const ey=Math.max(top+8,Math.min(top+ph-8,dir0?(midY+negH+12):(midY-posH-12)));
    const ec=d.delta>=0?'#22c55e':'#ef4444';
    ctx.strokeStyle=ec;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(x,ey,6,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x-4,ey-4);ctx.lineTo(x+4,ey+4);ctx.moveTo(x+4,ey-4);ctx.lineTo(x-4,ey+4);ctx.stroke();
    ctx.fillStyle=ec+'22';ctx.beginPath();ctx.arc(x,ey,6,0,Math.PI*2);ctx.fill();
   }
  }

  // ── 4. ABSORPTION ● -- high volume, near-zero delta ─────────────
  if(vol>absorbThresh&&Math.abs(d.deltaPct)<absorbDeltaPct*100&&i-lastSig.absorb>=8){
   lastSig.absorb=i;
   const ay=midY; // right on zero line
   ctx.fillStyle='rgba(180,160,255,0.9)';
   ctx.beginPath();ctx.arc(x,ay,4,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#9080ff';ctx.lineWidth=1;
   ctx.beginPath();ctx.arc(x,ay,6,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='rgba(0,0,0,0.8)';ctx.font='bold 4px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText('A',x,ay);ctx.textBaseline='alphabetic';
  }
 });

 ctx.restore(); // end signals clip

 // Cumulative delta line
 const cumVals=of.map(d=>d.cumDelta);
 const cumMin=Math.min(...cumVals),cumMax=Math.max(...cumVals);
 const cumRng=cumMax-cumMin||1;
 ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.4;
 ctx.shadowColor='rgba(251,191,36,0.3)';ctx.shadowBlur=3;
 ctx.beginPath();let ff=true;
 of.forEach((d,i)=>{
  const cy=top+4+(1-(d.cumDelta-cumMin)/cumRng)*(ph-8);
  ff?(ctx.moveTo(tx(i),cy),ff=false):ctx.lineTo(tx(i),cy);
 });
 ctx.stroke();
 ctx.shadowBlur=0;

 // DELTA label + last value
 ctx.fillStyle='#4a6080';ctx.font='bold 7px monospace';ctx.textAlign='left';
 ctx.fillText('DELTA',4,top+9);
 // ? button bottom-left corner
 const _qx=10,_qy=top+ph-10,_qr=7;
 ctx.fillStyle='rgba(59,158,255,0.18)';
 ctx.strokeStyle='rgba(59,158,255,0.5)';ctx.lineWidth=0.8;
 ctx.beginPath();ctx.arc(_qx,_qy,_qr,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.fillStyle='#3b9eff';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText('?',_qx,_qy);ctx.textBaseline='alphabetic';
 // Store ? button hit area for tap detection
 ctx._ofHelpBtn={x:_qx,y:_qy,r:_qr+4};
 const last=of[of.length-1];
 const lv=last.delta;
 const lc=lv>=0?'#22c55e':'#ef4444';
 // Format number: K for thousands, M for millions
 const fmt=v=>{const a=Math.abs(v);return a>=1000000?(v/1000000).toFixed(2)+'M':a>=1000?(v/1000).toFixed(1)+'K':v.toLocaleString();}
 ctx.fillStyle=lc;ctx.font='bold 7.5px monospace';ctx.textAlign='right';
 ctx.fillText((lv>=0?'+':'')+fmt(lv),CW-4,top+9);

 // Cumulative delta value (bottom right)
 const cumLast=of[of.length-1].cumDelta;
 const cc='rgba(251,191,36,0.8)';
 ctx.fillStyle=cc;ctx.font='6.5px monospace';ctx.textAlign='right';
 ctx.fillText('Σ'+(cumLast>=0?'+':'')+fmt(cumLast),CW-4,top+ph-4);

 ctx.restore();
}


