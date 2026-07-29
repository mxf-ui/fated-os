/* ---- drawers ---- */
function openDrawer(which){
  document.getElementById('drawer-backdrop').classList.add('open');
  document.getElementById(which+'-drawer').classList.add('open');
  if(which==='sticker') renderStickerPicker();
}
function closeDrawers(){
  document.getElementById('drawer-backdrop').classList.remove('open');
  document.getElementById('action-drawer').classList.remove('open');
  document.getElementById('sticker-drawer').classList.remove('open');
}
function stickerVisualHTML(s){
  return s.type==='image'
    ? '<img src="'+s.value+'" style="width:100%;height:100%;object-fit:contain;border-radius:8px;max-height:60px;">'
    : '<div class="glyph">'+s.value+'</div>';
}
var pickerTab = 'kaomoji';
function setPickerTab(tab){
  pickerTab = tab;
  var k=document.getElementById('picker-kaomoji');
  var m=document.getElementById('picker-image');
  if(k) k.classList.toggle('active', tab==='kaomoji');
  if(m) m.classList.toggle('active', tab==='image');
  renderStickerPicker();
}
function renderStickerPicker(){
  const grid = document.getElementById('sticker-grid-picker');
  var filtered = stickers.filter(function(s){ return s.type === pickerTab; });
  if(filtered.length === 0){
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--ink-faint); font-size:12px; padding:20px 0;">还没有'+(pickerTab==='kaomoji'?'颜文字':'图片')+'表情，去表情包库添加吧</div>';
    return;
  }
  grid.innerHTML = filtered.map(function(s){
    var i = stickers.indexOf(s);
    return '<div class="sticker-item" onclick="sendSticker('+i+')">'+stickerVisualHTML(s)+'<div class="tag">'+s.tag+'</div></div>';
  }).join('');
}
function sendSticker(i){
  const c = contacts[currentContact];
  if(c.pendingCount >= MAX_STREAK) return;
  const s = stickers[i];
  c.seed.push({mine:true, kind:'sticker', stype:s.type, text:s.value, from:'me', ts:nowStamp()});
  c.pendingCount++;
  closeDrawers();
  renderThread();
  saveChatThread();
  resetIdleTimer();
  setTimeout(()=>{ aiAutoReply(c); }, 500);
}

/* ---- sticker library (Me tab) ---- */
function setStickerTab(tab){
  stickerTab = tab;
  document.getElementById('seg-kaomoji').classList.toggle('active', tab==='kaomoji');
  document.getElementById('seg-image').classList.toggle('active', tab==='image');
  document.getElementById('new-kaomoji-row').style.display = tab==='kaomoji' ? 'block' : 'none';
  document.getElementById('new-image-row').style.display = tab==='image' ? 'block' : 'none';
}
function previewStickerImage(e){
  const file = e.target.files[0];
  if(!file) return;
  // 使用compressImage压缩图片，避免localStorage溢出
  compressImage(file, 200, 0.8, function(res){
    if(!res) return;
    pendingImageData = res;
    const img = document.getElementById('new-sticker-preview');
    img.src = pendingImageData; img.style.display='block';
    document.getElementById('new-sticker-plus').style.display='none';
  });
  e.target.value='';
}
function renderStickerLib(){
  const filter = document.getElementById('lib-filter').value;
  const grid = document.getElementById('sticker-grid-lib');
  // 更新分组下拉
  var grpSel = document.getElementById('lib-group-filter');
  if(grpSel){
    var groups = {};
    stickers.forEach(function(s){ if(s.group) groups[s.group]=1; });
    var curGrp = grpSel.value || 'all';
    grpSel.innerHTML = '<option value="all">全部分组</option>' + Object.keys(groups).map(function(g){ return '<option value="'+esc(g)+'"'+(g===curGrp?' selected':'')+'>'+esc(g)+'</option>'; }).join('');
    grpSel.value = curGrp;
  }
  var grpFilter = grpSel ? grpSel.value : 'all';
  var list = stickers.filter(function(s){
    var moodOk = (filter==='all' || s.mood===filter);
    var grpOk = (grpFilter==='all' || s.group===grpFilter);
    return moodOk && grpOk;
  });
  if(list.length===0){
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--ink-faint); font-size:12px; padding:20px 0;">这个分类还没有表情包</div>';
    return;
  }
  // 如果有分组，按分组显示
  var grouped = {};
  var ungrouped = [];
  list.forEach(function(s){
    if(s.group){
      if(!grouped[s.group]) grouped[s.group]=[];
      grouped[s.group].push(s);
    } else {
      ungrouped.push(s);
    }
  });
  var html = '';
  Object.keys(grouped).forEach(function(g){
    html += '<div style="grid-column:1/-1; font-size:11px; font-weight:700; color:var(--ink-soft); padding:4px 0 0;">📁 '+esc(g)+'</div>';
    grouped[g].forEach(function(s){
      var i = stickers.indexOf(s);
      html += '<div class="sticker-item"><div class="del" onclick="removeSticker('+i+')"><div class="ico-x"></div></div>'+stickerVisualHTML(s)+'<div class="tag">'+esc(s.tag)+'</div></div>';
    });
  });
  if(ungrouped.length>0){
    if(Object.keys(grouped).length>0) html += '<div style="grid-column:1/-1; font-size:11px; font-weight:700; color:var(--ink-soft); padding:4px 0 0;">未分组</div>';
    ungrouped.forEach(function(s){
      var i = stickers.indexOf(s);
      html += '<div class="sticker-item"><div class="del" onclick="removeSticker('+i+')"><div class="ico-x"></div></div>'+stickerVisualHTML(s)+'<div class="tag">'+esc(s.tag)+'</div></div>';
    });
  }
  grid.innerHTML = html;
}
function addSticker(){
  const tag = document.getElementById('new-sticker-tag').value.trim();
  const mood = document.getElementById('new-sticker-mood').value;
  if(!tag){ showToast('请填写含义标签', 1500); return; }
  if(stickerTab==='kaomoji'){
    const g = document.getElementById('new-sticker-glyph').value.trim();
    if(!g){ showToast('请输入颜文字内容', 1500); return; }
    stickers.push({type:'kaomoji', value:g, tag, mood, group:''});
    document.getElementById('new-sticker-glyph').value='';
  } else {
    if(!pendingImageData){ showToast('请先上传一张图片', 1500); return; }
    var grp = '';
    var grpEl = document.getElementById('new-sticker-group');
    if(grpEl) grp = grpEl.value.trim();
    stickers.push({type:'image', value:pendingImageData, tag, mood, group:grp});
    pendingImageData = null;
    document.getElementById('new-sticker-preview').style.display='none';
    document.getElementById('new-sticker-plus').style.display='block';
    document.getElementById('new-sticker-file').value='';
    if(grpEl) grpEl.value='';
    var hint=document.getElementById('new-sticker-hint'); if(hint) hint.textContent='点击上传图片';
  }
  document.getElementById('new-sticker-tag').value='';
  renderStickerLib(); saveStickersDB(); saveState();
  showToast('表情包已保存到库', 1200);
}
function removeSticker(i){ stickers.splice(i,1); renderStickerLib(); saveStickersDB(); saveState(); }

