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

