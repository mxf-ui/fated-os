var worldBookFilter = 'all';

function worldBookEscId(id){
  return String(id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
}
function worldBookCategory(wb){
  wb = wb || {};
  var cat = (wb.category || '').toLowerCase();
  if(['rules','lore','persona','memory'].indexOf(cat) >= 0) return cat;
  var text = ((wb.name || '') + '\n' + (wb.content || '')).toLowerCase();
  if(/rule|rules|system|forbid|must|cannot|\u89c4\u5219|\u7981\u6b62|\u5fc5\u987b|\u4e0d\u80fd/.test(text)) return 'rules';
  if(/persona|character|profile|role|\u4eba\u8bbe|\u89d2\u8272|\u6027\u683c|\u8eab\u4efd/.test(text)) return 'persona';
  if(/memory|history|past|remember|\u8bb0\u5fc6|\u56de\u5fc6|\u8fc7\u53bb|\u7ecf\u5386/.test(text)) return 'memory';
  return 'lore';
}
function worldBookFilterInfo(cat){
  var map = {
    all: { title:'Entries', desc:'\u5168\u90e8\u4e16\u754c\u4e66\u8bcd\u6761\uff0c\u7ed1\u5b9a\u5230\u89d2\u8272\u6216\u7fa4\u804a\u540e\u4f1a\u6ce8\u5165\u4e0a\u4e0b\u6587\u3002' },
    rules: { title:'Rules', desc:'\u89c4\u5219\u3001\u8fb9\u754c\u3001\u56de\u590d\u7981\u5fcc\u548c\u5fc5\u987b\u9075\u5b88\u7684\u957f\u8bbe\u5b9a\u3002' },
    lore: { title:'Lore', desc:'\u4e16\u754c\u89c2\u3001\u5730\u70b9\u3001\u52bf\u529b\u3001\u65f6\u95f4\u7ebf\u548c\u80cc\u666f\u8d44\u6599\u3002' },
    persona: { title:'Persona', desc:'\u89d2\u8272\u8eab\u4efd\u3001\u6027\u683c\u3001\u5173\u7cfb\u3001\u53e3\u7656\u548c\u8868\u8fbe\u4e60\u60ef\u3002' },
    memory: { title:'Memory', desc:'\u957f\u671f\u8bb0\u5fc6\u3001\u5171\u540c\u7ecf\u5386\u3001\u8fc7\u5f80\u4e8b\u4ef6\u548c\u91cd\u8981\u7ea6\u5b9a\u3002' }
  };
  return map[cat] || map.all;
}
function setWorldBookFilter(cat){
  worldBookFilter = cat || 'all';
  document.querySelectorAll('#sheet-worldbooks .worldbook-tabs button').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-wb-filter') === worldBookFilter);
  });
  renderWorldBooks();
}
function renderWorldBooks(){
  var el=document.getElementById('wb-list'); if(!el) return;
  var allIds=Object.keys(worldBooks||{});
  var active = worldBookFilter || 'all';
  var ids=allIds.filter(function(k){ return active==='all' || worldBookCategory(worldBooks[k])===active; });
  var count=document.getElementById('wb-count');
  if(count) count.textContent=ids.length;
  var info = worldBookFilterInfo(active);
  var title=document.getElementById('wb-filter-title'); if(title) title.textContent=info.title;
  var desc=document.getElementById('wb-filter-desc'); if(desc) desc.textContent=info.desc;
  document.querySelectorAll('#sheet-worldbooks .worldbook-tabs button').forEach(function(btn){
    btn.classList.toggle('active', btn.getAttribute('data-wb-filter') === active);
  });
  if(ids.length===0){
    var empty = active==='all' ? '\u6682\u65e0\u4e16\u754c\u4e66' : '\u8fd9\u4e2a\u5206\u7c7b\u8fd8\u6ca1\u6709\u5185\u5bb9';
    el.innerHTML='<div class="wb-empty"><b>'+empty+'</b><small>\u70b9\u51fb\u53f3\u4e0a\u89d2\u65b0\u5efa\uff0c\u7528\u4e8e\u4fdd\u5b58\u4e16\u754c\u89c2\u3001\u89c4\u5219\u3001\u4eba\u8bbe\u548c\u957f\u671f\u8bb0\u5fc6\u3002</small></div>';
    return;
  }
  el.innerHTML=ids.map(function(k){
    var wb=worldBooks[k]||{};
    var content=wb.content||'';
    var cat=worldBookCategory(wb);
    var preview=content.trim()?content.slice(0,140):'\u8fd8\u6ca1\u6709\u5185\u5bb9\uff0c\u70b9\u51fb\u8fdb\u5165\u7f16\u8f91\u3002';
    var lines=content.split(/\n+/).filter(function(x){return x.trim();}).length;
    var safeId=worldBookEscId(k);
    return '<div class="wb-card" data-wb-category="'+cat+'" onclick="openWorldBookEdit(\''+safeId+'\')">'
      + '<div class="wb-card-kicker">'+cat.toUpperCase()+'</div>'
      + '<div class="wb-card-title">'+esc(wb.name||'\u672a\u547d\u540d')+'</div>'
      + '<div class="wb-card-meta">WORLD BOOK / '+lines+' \u6761\u8bbe\u5b9a</div>'
      + '<div class="wb-card-preview">'+esc(preview)+'</div>'
      + '</div>';
  }).join('');
}
function openWorldBookEdit(id){
  var isNew=!id;
  var wb=isNew?{id:'wb'+Date.now(), name:'', content:'', category:(worldBookFilter && worldBookFilter!=='all') ? worldBookFilter : 'lore'}:worldBooks[id];
  if(!wb) return;
  document.getElementById('wbe-title').textContent=isNew?'\u65b0\u5efa\u4e16\u754c\u4e66':'\u7f16\u8f91\u4e16\u754c\u4e66';
  document.getElementById('wbe-id').value=wb.id;
  document.getElementById('wbe-name').value=wb.name||'';
  document.getElementById('wbe-content').value=wb.content||'';
  var cat=document.getElementById('wbe-category'); if(cat) cat.value=worldBookCategory(wb);
  document.getElementById('wbe-delete').style.display=isNew?'none':'block';
  openSheet('worldbook-edit');
}
function saveWorldBook(){
  var id=document.getElementById('wbe-id').value || ('wb'+Date.now());
  var name=document.getElementById('wbe-name').value.trim()||'\u672a\u547d\u540d';
  var content=document.getElementById('wbe-content').value.trim();
  var catEl=document.getElementById('wbe-category');
  var category=catEl ? catEl.value : 'lore';
  worldBooks[id]={id:id,name:name,content:content,category:category};
  saveState(); renderWorldBooks(); closeSheet('worldbook-edit'); showToast('\u4e16\u754c\u4e66\u5df2\u4fdd\u5b58',1200);
}
function deleteWorldBook(){
  var id=document.getElementById('wbe-id').value;
  if(!worldBooks[id]) return;
  if(!confirm('\u786e\u5b9a\u5220\u9664\u300a'+(worldBooks[id].name||'\u672a\u547d\u540d')+'\u300b\uff1f\u5df2\u7ed1\u5b9a\u5230\u8054\u7cfb\u4eba/\u7fa4\u804a\u7684\u8bbe\u5b9a\u5c06\u5931\u6548\u3002')) return;
  delete worldBooks[id];
  Object.keys(contacts||{}).forEach(function(k){ var c=contacts[k]; if(c.worldBooks) c.worldBooks=c.worldBooks.filter(function(x){return x!==id;}); });
  saveState(); renderWorldBooks(); closeSheet('worldbook-edit'); showToast('\u5df2\u5220\u9664',1200);
}

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
      if(statusEl) statusEl.textContent = 'TXT \u5bfc\u5165\u6210\u529f (' + r.result.length + ' \u5b57)';
      showToast('TXT \u5bfc\u5165\u6210\u529f', 1200);
    };
    r.onerror = function(){ if(statusEl) statusEl.textContent = '\u8bfb\u53d6\u5931\u8d25'; };
    r.readAsText(file, 'UTF-8');
  } else if(ext === 'docx'){
    if(statusEl) statusEl.textContent = '\u6b63\u5728\u89e3\u6790 Word \u6587\u4ef6...';
    if(typeof mammoth === 'undefined'){
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
      s.onload = function(){ doParseDocx(file, name, ta, nameInput, statusEl); };
      s.onerror = function(){ if(statusEl) statusEl.textContent = '\u65e0\u6cd5\u52a0\u8f7d Word \u89e3\u6790\u5e93\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc'; };
      document.head.appendChild(s);
    } else {
      doParseDocx(file, name, ta, nameInput, statusEl);
    }
  } else if(ext === 'doc'){
    if(statusEl) statusEl.textContent = '.doc \u683c\u5f0f\u4e0d\u652f\u6301\uff0c\u8bf7\u53e6\u5b58\u4e3a .docx \u6216 .txt \u540e\u5bfc\u5165';
    showToast('.doc \u683c\u5f0f\u4e0d\u652f\u6301\uff0c\u8bf7\u8f6c\u6210 .docx', 2000);
  } else {
    if(statusEl) statusEl.textContent = '\u4e0d\u652f\u6301\u7684\u6587\u4ef6\u683c\u5f0f';
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
        if(statusEl) statusEl.textContent = 'Word \u5bfc\u5165\u6210\u529f (' + text.length + ' \u5b57)';
        showToast('Word \u5bfc\u5165\u6210\u529f', 1200);
      })
      .catch(function(err){
        if(statusEl) statusEl.textContent = '\u89e3\u6790\u5931\u8d25: ' + (err.message || '\u672a\u77e5\u9519\u8bef');
        showToast('Word \u89e3\u6790\u5931\u8d25', 1500);
      });
  };
  r.onerror = function(){ if(statusEl) statusEl.textContent = '\u8bfb\u53d6\u5931\u8d25'; };
  r.readAsArrayBuffer(file);
}
