function renderWorldBooks(){
  var el=document.getElementById('wb-list'); if(!el) return;
  var ids=Object.keys(worldBooks);
  if(ids.length===0){ el.innerHTML='<div style="text-align:center;color:#999;padding:40px 0;font-size:14px;">还没有世界书<br>点击右上角新建</div>'; return; }
  el.innerHTML=ids.map(function(k){
    var wb=worldBooks[k];
    return '<div class="ios-row" onclick="openWorldBookEdit(\''+k+'\')" style="flex-direction:column;align-items:flex-start;gap:4px;"><div style="font-weight:700;">'+esc(wb.name)+'</div><div style="font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">'+esc((wb.content||'').slice(0,80))+'</div></div>';
  }).join('');
}
function openWorldBookEdit(id){
  var isNew=!id;
  var wb=isNew?{id:'wb'+(Date.now()),name:'',content:''}:worldBooks[id];
  if(!wb) return;
  document.getElementById('wbe-title').textContent=isNew?'新建世界书':'编辑世界书';
  document.getElementById('wbe-id').value=wb.id;
  document.getElementById('wbe-name').value=wb.name;
  document.getElementById('wbe-content').value=wb.content;
  document.getElementById('wbe-delete').style.display=isNew?'none':'block';
  openSheet('worldbook-edit');
}
function saveWorldBook(){
  var id=document.getElementById('wbe-id').value;
  var name=document.getElementById('wbe-name').value.trim()||'未命名';
  var content=document.getElementById('wbe-content').value.trim();
  worldBooks[id]={id:id,name:name,content:content};
  saveState(); renderWorldBooks(); closeSheet('worldbook-edit'); showToast('世界书已保存',1200);
}
function deleteWorldBook(){
  var id=document.getElementById('wbe-id').value;
  if(!worldBooks[id]) return;
  if(!confirm('确定删除《'+esc(worldBooks[id].name)+'》？已绑定到联系人/群聊的设定将失效。')) return;
  delete worldBooks[id];
  Object.keys(contacts).forEach(function(k){ var c=contacts[k]; if(c.worldBooks) c.worldBooks=c.worldBooks.filter(function(x){return x!==id;}); });
  saveState(); renderWorldBooks(); closeSheet('worldbook-edit'); showToast('已删除',1200);
}

/* 导入 TXT / Word 文件到世界书 */
function importWorldBookFile(e){
  var file = e.target.files[0]; if(!file) return;
  var name = file.name.replace(/\.[^.]+$/, '');
  var ext = file.name.split('.').pop().toLowerCase();
  var statusEl = document.getElementById('wbe-import-status');
  var ta = document.getElementById('wbe-content');
  var nameInput = document.getElementById('wbe-name');

  if(ext === 'txt'){
    var r = new FileReader();
    r.onload = function(){
      ta.value = r.result;
      if(!nameInput.value.trim()) nameInput.value = name;
      if(statusEl) statusEl.textContent = '✓ TXT 导入成功 (' + r.result.length + ' 字)';
      showToast('TXT 导入成功', 1200);
    };
    r.onerror = function(){ if(statusEl) statusEl.textContent = '✗ 读取失败'; };
    r.readAsText(file, 'UTF-8');
  } else if(ext === 'docx'){
    if(statusEl) statusEl.textContent = '正在解析 Word 文件…';
    // 动态加载 mammoth.js
    if(typeof mammoth === 'undefined'){
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
      s.onload = function(){ doParseDocx(file, name, ta, nameInput, statusEl); };
      s.onerror = function(){ if(statusEl) statusEl.textContent = '✗ 无法加载 Word 解析库，请检查网络'; };
      document.head.appendChild(s);
    } else {
      doParseDocx(file, name, ta, nameInput, statusEl);
    }
  } else if(ext === 'doc'){
    if(statusEl) statusEl.textContent = '⚠ .doc 格式不支持，请另存为 .docx 或 .txt 后导入';
    showToast('.doc 格式不支持，请转成 .docx', 2000);
  } else {
    if(statusEl) statusEl.textContent = '⚠ 不支持的文件格式';
  }
  e.target.value = '';
}
function doParseDocx(file, name, ta, nameInput, statusEl){
  var r = new FileReader();
  r.onload = function(){
    mammoth.extractRawText({ arrayBuffer: r.result })
      .then(function(result){
        var text = result.value || '';
        ta.value = text;
        if(!nameInput.value.trim()) nameInput.value = name;
        if(statusEl) statusEl.textContent = '✓ Word 导入成功 (' + text.length + ' 字)';
        showToast('Word 导入成功', 1200);
      })
      .catch(function(err){
        if(statusEl) statusEl.textContent = '✗ 解析失败: ' + (err.message || '未知错误');
        showToast('Word 解析失败', 1500);
      });
  };
  r.onerror = function(){ if(statusEl) statusEl.textContent = '✗ 读取失败'; };
  r.readAsArrayBuffer(file);
}

