/* ============ WORLD BOOKS & CONTACT/GROUP PROFILE ============ */
function renderWorldBookChips(containerId, selectedIds){
  var el=document.getElementById(containerId); if(!el) return;
  var ids=Object.keys(worldBooks);
  if(ids.length===0){ el.innerHTML='<div style="font-size:12px;color:#999;">暂无世界书，可到设置里新建</div>'; return; }
  el.innerHTML=ids.map(function(k){
    var wb=worldBooks[k];
    var on=(selectedIds||[]).indexOf(k)>-1;
    return '<label class="persona-chip '+(on?'on':'')+'" style="cursor:pointer;"><input type="checkbox" class="wb-chk" value="'+k+'" '+(on?'checked':'')+' style="display:none;" onchange="this.parentNode.classList.toggle(\'on\',this.checked)">'+esc(wb.name)+'</label>';
  }).join('');
}
function getSelectedWorldBookIds(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' .wb-chk:checked')).map(function(c){ return c.value; });
}
function getWorldBookPrompt(contactId){
  var c=contacts[contactId]; if(!c) return '';
  var wbs=c.worldBooks||[];
  var texts=[];
  wbs.forEach(function(id){ if(worldBooks[id] && worldBooks[id].content) texts.push('【'+worldBooks[id].name+'】\n'+worldBooks[id].content); });
  if(texts.length===0) return '';
  return '\n\n[绑定世界书]\n'+texts.join('\n\n');
}

function pickProfileAvatar(){ contactAvatarInput.click(); }
function pickGroupAvatar(){ contactAvatarInput.click(); }

function openContactProfile(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup){ openGroupInfo(); return; }
  _profileAvatarTarget=id; _groupAvatarTarget=null;
  document.getElementById('cp-title').textContent='联系人信息';
  document.getElementById('cp-name').textContent=c.displayName||c.name;
  document.getElementById('cp-id').textContent='微信号: '+(c.wxid||id);
  document.getElementById('cp-avatar').innerHTML=contactAvatar(c);
  document.getElementById('cp-displayName').value=c.displayName||'';
  document.getElementById('cp-bio').value=c.bio||'';
  document.getElementById('cp-persona').value=c.persona||c.tone||'';
  document.getElementById('cp-userPrompt').value=c.userPrompt||'';
  var cvPrev=document.getElementById('cp-cover-preview');
  if(cvPrev){ if(c.cover) cvPrev.style.backgroundImage='url('+c.cover+')'; else cvPrev.style.backgroundImage='linear-gradient(160deg,#E7B9C4,#CFC0D6)'; cvPrev.dataset.src=c.cover||''; }
  // 该联系人发的朋友圈数量
  var num=(moments||[]).filter(function(m){return m.authorId===id;}).length;
  var numEl=document.getElementById('cp-moments-count'); if(numEl) numEl.textContent=num;
  renderWorldBookChips('cp-worldbooks', c.worldBooks||[]);
  var mem=c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0};
  var tog=document.getElementById('cp-memory-toggle'); tog.classList.toggle('on', mem.enabled!==false);
  document.getElementById('cp-memory-threshold').value=mem.threshold||20;
  document.getElementById('cp-memory-summary').textContent=mem.summary||'(暂无记忆)';
  var proTog=document.getElementById('cp-proactive-toggle'); proTog.classList.toggle('on', c.proactive!==false);
  document.getElementById('cp-block-btn').textContent=c.blocked?'取消拉黑':'拉黑';
  openSheet('contact-profile');
}
function saveContactProfile(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup) return;
  c.displayName=document.getElementById('cp-displayName').value.trim();
  c.bio=document.getElementById('cp-bio').value;
  var cvPrev=document.getElementById('cp-cover-preview');
  if(cvPrev && cvPrev.dataset.src) c.cover=cvPrev.dataset.src;
  if(!c.cover) c.cover='';
  c.persona=document.getElementById('cp-persona').value.trim();
  c.tone=c.persona;
  c.userPrompt=document.getElementById('cp-userPrompt').value.trim();
  c.worldBooks=getSelectedWorldBookIds('cp-worldbooks');
  if(!c.memory) c.memory={enabled:true, threshold:20, summary:'', lastMsgCount:0};
  c.memory.enabled=document.getElementById('cp-memory-toggle').classList.contains('on');
  c.memory.threshold=parseInt(document.getElementById('cp-memory-threshold').value,10)||20;
  c.proactive=document.getElementById('cp-proactive-toggle').classList.contains('on');
  renderChatList(); renderThread(); saveState(); saveChatThread(id); closeSheet('contact-profile'); showToast('已保存',1200);
}
function clearCurrentChatFromProfile(){
  var id=currentContact; var c=contacts[id]; if(!c) return;
  if(!confirm('确定清空 '+esc(c.name)+' 的聊天记录？')) return;
  c.seed=[]; c.pendingCount=0; if(c.memory){ c.memory.summary=''; c.memory.lastMsgCount=0; }
  renderThread(); renderChatList(); saveChatThread(id); saveState(); closeSheet('contact-profile'); closeSheet('group-info'); showToast('聊天记录已清空',1400);
}
function toggleBlockContact(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup) return;
  c.blocked=!c.blocked; renderThread(); renderChatList(); saveChatThread(id); saveState(); closeSheet('contact-profile'); showToast(c.blocked?'已拉黑':'已取消拉黑',1200);
}

function openGroupInfo(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  _groupAvatarTarget=id; _profileAvatarTarget=null;
  document.getElementById('gi-title').textContent='群聊信息';
  document.getElementById('gi-name').textContent=c.name;
  document.getElementById('gi-member-count').textContent=(c.members?c.members.length:0)+' 位成员';
  document.getElementById('gi-avatar').innerHTML=contactAvatar(c);
  document.getElementById('gi-groupName').value=c.name||'';
  document.getElementById('gi-userPrompt').value=c.groupUserPrompt||'';
  renderWorldBookChips('gi-worldbooks', c.worldBooks||[]);
  var mem=c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0};
  var tog=document.getElementById('gi-memory-toggle'); tog.classList.toggle('on', mem.enabled!==false);
  document.getElementById('gi-memory-threshold').value=mem.threshold||20;
  document.getElementById('gi-memory-summary').textContent=mem.summary||'(暂无群聊记忆)';
  var gproTog=document.getElementById('gi-proactive-toggle'); gproTog.classList.toggle('on', c.proactive!==false);
  // render members
  var mEl=document.getElementById('gi-members');
  mEl.innerHTML=(c.members||[]).map(function(mid){
    var mc=contacts[mid]; if(!mc) return '';
    return '<div class="ios-row" style="justify-content:space-between;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:34px;height:34px;border-radius:10px;overflow:hidden;">'+contactAvatar(mc)+'</div><div>'+esc(mc.name)+'</div></div><div style="font-size:12px;color:#ff3b30;cursor:pointer;padding:4px 8px;" onclick="removeGroupMember(\''+mid+'\')">移除</div></div>';
  }).join('');
  // 关系下拉框填充
  var memberOpts=(c.members||[]).map(function(mid){
    var mc=contacts[mid]; if(!mc) return '';
    return '<option value="'+mid+'">'+esc(mc.name)+'</option>';
  }).join('');
  var relA=document.getElementById('gi-rel-a'); var relB=document.getElementById('gi-rel-b');
  if(relA) relA.innerHTML=memberOpts;
  if(relB) relB.innerHTML=memberOpts;
  if(c.relations && c.relations.length && c.members && c.members.length>=2){
    relA.value=c.relations[0].a; relB.value=c.relations[0].b;
  }
  renderGroupRelations();
  openSheet('group-info');
}
function saveGroupInfo(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  c.name=document.getElementById('gi-groupName').value.trim()||c.name;
  c.groupUserPrompt=document.getElementById('gi-userPrompt').value.trim();
  c.worldBooks=getSelectedWorldBookIds('gi-worldbooks');
  if(!c.memory) c.memory={enabled:true, threshold:20, summary:'', lastMsgCount:0};
  c.memory.enabled=document.getElementById('gi-memory-toggle').classList.contains('on');
  c.memory.threshold=parseInt(document.getElementById('gi-memory-threshold').value,10)||20;
  c.proactive=document.getElementById('gi-proactive-toggle').classList.contains('on');
  renderChatList(); renderThread(); saveState(); saveChatThread(id); closeSheet('group-info'); showToast('已保存',1200);
}
function disbandCurrentGroup(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  if(!confirm('确定解散群聊 '+esc(c.name)+'？')) return;
  closeSheet('group-info'); closeSheet('thread');
  delete contacts[id]; renderChatList(); saveState(); fatedDBDeleteChat(id); showToast('群聊已解散',1400);
}
function removeGroupMember(mid){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  c.members=(c.members||[]).filter(function(x){ return x!==mid; });
  if(c.members.length<2){ showToast('群聊至少需要 2 人',1200); c.members.push(mid); return; }
  openGroupInfo(); saveState(); saveChatThread(id);
}

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

