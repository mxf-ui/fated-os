/* ===== TETRIS (搬砖) ===== */
var suohaTetris = { board:[], piece:null, next:null, lines:0, score:0, running:false, timer:null, dropInterval:800 };
var suohaTetrisShapes = [
  {s:[[1,1,1,1]], c:'#00f0f0'}, // I
  {s:[[1,1],[1,1]], c:'#f0f000'}, // O
  {s:[[0,1,0],[1,1,1]], c:'#a000f0'}, // T
  {s:[[0,1,1],[1,1,0]], c:'#00f000'}, // S
  {s:[[1,1,0],[0,1,1]], c:'#f00000'}, // Z
  {s:[[1,0,0],[1,1,1]], c:'#0000f0'}, // J
  {s:[[0,0,1],[1,1,1]], c:'#f0a000'}  // L
];
function suohaOpenTetris(){
  document.getElementById('suoha-m-tetris').classList.add('open');
  suohaStartTetris();
}
function suohaCloseTetris(){
  if(suohaTetris.timer){ clearInterval(suohaTetris.timer); suohaTetris.timer=null; }
  suohaTetris.running=false;
  suohaCloseModal('suoha-m-tetris');
}
function suohaStartTetris(){
  document.getElementById('suoha-tetris-result').classList.add('suoha-hidden');
  document.getElementById('suoha-tetris-start-btn').classList.add('suoha-hidden');
  suohaTetris.board = [];
  for(var r=0;r<20;r++){ suohaTetris.board.push(new Array(10).fill(null)); }
  suohaTetris.lines=0; suohaTetris.score=0; suohaTetris.running=true;
  suohaTetris.dropInterval=800;
  suohaTetris.piece = suohaTetrisNewPiece();
  suohaTetris.next = suohaTetrisNewPiece();
  suohaTetrisUpdateUI();
  suohaTetrisDraw();
  if(suohaTetris.timer) clearInterval(suohaTetris.timer);
  suohaTetris.timer = setInterval(suohaTetrisTick, suohaTetris.dropInterval);
}
function suohaTetrisNewPiece(){
  var idx = Math.floor(Math.random()*7);
  var sh = suohaTetrisShapes[idx];
  return { shape: sh.s.map(function(r){return r.slice();}), color: sh.c, x: 3, y: 0 };
}
function suohaTetrisCollide(shape, x, y){
  for(var r=0;r<shape.length;r++){
    for(var c=0;c<shape[r].length;c++){
      if(!shape[r][c]) continue;
      var nx=x+c, ny=y+r;
      if(nx<0||nx>=10||ny>=20) return true;
      if(ny>=0 && suohaTetris.board[ny][nx]) return true;
    }
  }
  return false;
}
function suohaTetrisMerge(){
  var p=suohaTetris.piece;
  for(var r=0;r<p.shape.length;r++){
    for(var c=0;c<p.shape[r].length;c++){
      if(p.shape[r][c] && p.y+r>=0) suohaTetris.board[p.y+r][p.x+c]=p.color;
    }
  }
}
function suohaTetrisClearLines(){
  var cleared=0;
  for(var r=19;r>=0;r--){
    var full=true;
    for(var c=0;c<10;c++){ if(!suohaTetris.board[r][c]){ full=false; break; } }
    if(full){
      suohaTetris.board.splice(r,1);
      suohaTetris.board.unshift(new Array(10).fill(null));
      cleared++; r++;
    }
  }
  if(cleared>0){
    suohaTetris.lines += cleared;
    suohaTetris.score += cleared*100;
    suohaTetrisUpdateUI();
    if(suohaTetris.lines >= 3){
      suohaTetrisWin();
    }
  }
}
function suohaTetrisWin(){
  suohaTetris.running=false;
  if(suohaTetris.timer){ clearInterval(suohaTetris.timer); suohaTetris.timer=null; }
  suohaSetWechat(suohaGetWechat() + 200);
  suohaState.workLast = suohaNow();
  saveState(); suohaUpdateAll();
  var el=document.getElementById('suoha-tetris-result');
  el.classList.remove('suoha-hidden');
  document.getElementById('suoha-tetris-result-text').textContent = '🎉 完美拼三行！赚了 ¥200！';
  document.getElementById('suoha-tetris-start-btn').classList.remove('suoha-hidden');
}
function suohaTetrisGameOver(){
  suohaTetris.running=false;
  if(suohaTetris.timer){ clearInterval(suohaTetris.timer); suohaTetris.timer=null; }
  var el=document.getElementById('suoha-tetris-result');
  el.classList.remove('suoha-hidden');
  document.getElementById('suoha-tetris-result-text').textContent = '💀 堆满了！消除 '+suohaTetris.lines+' 行，没赚到钱';
  document.getElementById('suoha-tetris-start-btn').classList.remove('suoha-hidden');
}
function suohaTetrisTick(){
  if(!suohaTetris.running) return;
  var p=suohaTetris.piece;
  if(!suohaTetrisCollide(p.shape, p.x, p.y+1)){
    p.y++;
  } else {
    suohaTetrisMerge();
    suohaTetrisClearLines();
    if(suohaTetris.running){
      suohaTetris.piece = suohaTetris.next;
      suohaTetris.next = suohaTetrisNewPiece();
      if(suohaTetrisCollide(suohaTetris.piece.shape, suohaTetris.piece.x, suohaTetris.piece.y)){
        suohaTetrisGameOver();
      }
    }
  }
  suohaTetrisDraw();
}
function suohaTetrisLeft(){ if(!suohaTetris.running) return; var p=suohaTetris.piece; if(!suohaTetrisCollide(p.shape,p.x-1,p.y)){ p.x--; suohaTetrisDraw(); } }
function suohaTetrisRight(){ if(!suohaTetris.running) return; var p=suohaTetris.piece; if(!suohaTetrisCollide(p.shape,p.x+1,p.y)){ p.x++; suohaTetrisDraw(); } }
function suohaTetrisDown(){ if(!suohaTetris.running) return; var p=suohaTetris.piece; if(!suohaTetrisCollide(p.shape,p.x,p.y+1)){ p.y++; } else { suohaTetrisMerge(); suohaTetrisClearLines(); if(suohaTetris.running){ suohaTetris.piece=suohaTetris.next; suohaTetris.next=suohaTetrisNewPiece(); if(suohaTetrisCollide(suohaTetris.piece.shape,suohaTetris.piece.x,suohaTetris.piece.y)) suohaTetrisGameOver(); } } suohaTetrisDraw(); }
function suohaTetrisRotate(){
  if(!suohaTetris.running) return;
  var p=suohaTetris.piece;
  var rows=p.shape.length, cols=p.shape[0].length;
  var rot=[];
  for(var c=0;c<cols;c++){ rot.push([]); for(var r=rows-1;r>=0;r--){ rot[c].push(p.shape[r][c]); } }
  if(!suohaTetrisCollide(rot,p.x,p.y)){ p.shape=rot; suohaTetrisDraw(); }
}
function suohaTetrisDraw(){
  var cv=document.getElementById('suoha-tetris-canvas'); if(!cv) return;
  var ctx=cv.getContext('2d');
  var cell=20;
  ctx.fillStyle='#111'; ctx.fillRect(0,0,cv.width,cv.height);
  // board
  for(var r=0;r<20;r++){
    for(var c=0;c<10;c++){
      if(suohaTetris.board[r][c]){
        ctx.fillStyle=suohaTetris.board[r][c];
        ctx.fillRect(c*cell,r*cell,cell-1,cell-1);
      }
    }
  }
  // piece
  if(suohaTetris.piece && suohaTetris.running){
    var p=suohaTetris.piece;
    ctx.fillStyle=p.color;
    for(var r=0;r<p.shape.length;r++){
      for(var c=0;c<p.shape[r].length;c++){
        if(p.shape[r][c]) ctx.fillRect((p.x+c)*cell,(p.y+r)*cell,cell-1,cell-1);
      }
    }
  }
  // next piece
  var nv=document.getElementById('suoha-tetris-next');
  if(nv){
    var nctx=nv.getContext('2d');
    nctx.fillStyle='#111'; nctx.fillRect(0,0,nv.width,nv.height);
    if(suohaTetris.next){
      var n=suohaTetris.next;
      nctx.fillStyle=n.color;
      var nc=20, ox=(nv.width-n.shape[0].length*nc)/2, oy=(nv.height-n.shape.length*nc)/2;
      for(var r=0;r<n.shape.length;r++){
        for(var c=0;c<n.shape[r].length;c++){
          if(n.shape[r][c]) nctx.fillRect(ox+c*nc,oy+r*nc,nc-1,nc-1);
        }
      }
    }
  }
}
function suohaTetrisUpdateUI(){
  var el=document.getElementById('suoha-tetris-lines');
  if(el) el.textContent='消除 '+suohaTetris.lines+' 行';
  var sc=document.getElementById('suoha-tetris-score');
  if(sc) sc.textContent=suohaTetris.score;
}
/* 键盘控制 */
document.addEventListener('keydown', function(e){
  if(!suohaTetris.running) return;
  var tetrisModal = document.getElementById('suoha-m-tetris');
  if(!tetrisModal || !tetrisModal.classList.contains('open')) return;
  switch(e.key){
    case 'ArrowLeft': e.preventDefault(); suohaTetrisLeft(); break;
    case 'ArrowRight': e.preventDefault(); suohaTetrisRight(); break;
    case 'ArrowDown': e.preventDefault(); suohaTetrisDown(); break;
    case 'ArrowUp': e.preventDefault(); suohaTetrisRotate(); break;
  }
});
