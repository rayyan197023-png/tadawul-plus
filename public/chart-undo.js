function _updateUndoButtons(){
  const bu=document.getElementById('btn-undo'),br=document.getElementById('btn-redo');
  if(bu)bu.style.opacity=_undo.length?'1':'0.35';
  if(br)br.style.opacity=_redo.length?'1':'0.35';
}
function undoDraw(){
 if(!_undo.length)return;
 // Save current non-_ai drawings to redo
 _redo.push(JSON.stringify(state.drawings.filter(d=>!d._ai)));
 // Restore non-_ai drawings from undo, keep current _ai drawings
 const aiDr=state.drawings.filter(d=>d._ai);
 const restored=JSON.parse(_undo.pop());
 state.drawings=[...restored,...aiDr];
 drSelId=null;cmHide();saveDrawings();_updateUndoButtons();render();
}
function redoDraw(){
 if(!_redo.length)return;
 _undo.push(JSON.stringify(state.drawings.filter(d=>!d._ai)));
 const aiDr=state.drawings.filter(d=>d._ai);
 const restored=JSON.parse(_redo.pop());
 state.drawings=[...restored,...aiDr];
 drSelId=null;cmHide();saveDrawings();_updateUndoButtons();render();
}
function clearDrawings(){_hist();state.drawings=[];drSelId=null;state.tool=null;saveDrawings();updateDrawBtn();cmHide();render();}

