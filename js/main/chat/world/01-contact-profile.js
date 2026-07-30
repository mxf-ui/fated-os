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
  var imgTog=document.getElementById('cp-imagegen-toggle'); if(imgTog) imgTog.classList.toggle('on', c.imageGenEnabled===true);
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
  var imgTog=document.getElementById('cp-imagegen-toggle'); c.imageGenEnabled=!!(imgTog && imgTog.classList.contains('on'));
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

