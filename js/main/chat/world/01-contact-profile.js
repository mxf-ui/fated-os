/* 人物侧写 */
function openContactProfile(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup){ openGroupInfo(); return; }
  _profileAvatarTarget=id; _groupAvatarTarget=null;
  document.getElementById('cp-title').textContent='\u8054\u7cfb\u4eba\u4fe1\u606f';
  document.getElementById('cp-name').textContent=c.displayName||c.name;
  document.getElementById('cp-id').textContent='\u5fae\u4fe1\u53f7 ' + (c.wxid||id);
  document.getElementById('cp-avatar').innerHTML=contactAvatar(c);
  document.getElementById('cp-displayName').value=c.displayName||'';
  document.getElementById('cp-bio').value=c.bio||'';
  document.getElementById('cp-persona').value=c.persona||c.tone||'';
  document.getElementById('cp-userPrompt').value=c.userPrompt||'';
  var cvPrev=document.getElementById('cp-cover-preview');
  if(cvPrev){ if(c.cover) cvPrev.style.backgroundImage='url('+c.cover+')'; else cvPrev.style.backgroundImage='linear-gradient(160deg,#dff8ed,#f7fffb)'; cvPrev.dataset.src=c.cover||''; }
  var num=(moments||[]).filter(function(m){return m.authorId===id;}).length;
  var numEl=document.getElementById('cp-moments-count'); if(numEl) numEl.textContent=num;
  renderWorldBookChips('cp-worldbooks', c.worldBooks||[]);
  var mem=c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0};
  var tog=document.getElementById('cp-memory-toggle'); if(tog) tog.classList.toggle('on', mem.enabled!==false);
  var th=document.getElementById('cp-memory-threshold'); if(th) th.value=mem.threshold||20;
  var ms=document.getElementById('cp-memory-summary'); if(ms) ms.textContent=mem.summary||'(\u6682\u65e0\u8bb0\u5fc6)';
  var up=document.getElementById('cp-user-profile'); if(up) up.textContent=c.userProfile||'(\u6682\u65e0\u4eba\u7269\u4fa7\u5199\uff0c\u7ee7\u7eed\u804a\u5929\u540e\u4f1a\u6309\u8fd9\u4e2a\u8054\u7cfb\u4eba\u7684\u4eba\u8bbe\u81ea\u52a8\u751f\u6210)';
  var proTog=document.getElementById('cp-proactive-toggle'); if(proTog) proTog.classList.toggle('on', c.proactive!==false);
  var imgTog=document.getElementById('cp-imagegen-toggle'); if(imgTog) imgTog.classList.toggle('on', c.imageGenEnabled===true);
  document.getElementById('cp-block-btn').textContent=c.blocked?'\u53d6\u6d88\u62c9\u9ed1':'\u62c9\u9ed1';
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
  renderChatList(); renderThread(); saveState(); saveChatThread(id); closeSheet('contact-profile'); showToast('\u5df2\u4fdd\u5b58',1200);
}
function clearCurrentChatFromProfile(){
  var id=currentContact; var c=contacts[id]; if(!c) return;
  if(!confirm('\u786e\u5b9a\u6e05\u7a7a '+esc(c.name)+' \u7684\u804a\u5929\u8bb0\u5f55\uff1f')) return;
  c.seed=[]; c.pendingCount=0; if(c.memory){ c.memory.summary=''; c.memory.lastMsgCount=0; }
  c.userProfile=''; c.userProfileUpdatedAt=0; c.userProfileLastMsgCount=0;
  renderThread(); renderChatList(); saveChatThread(id); saveState(); closeSheet('contact-profile'); closeSheet('group-info'); showToast('\u804a\u5929\u8bb0\u5f55\u5df2\u6e05\u7a7a',1400);
}
function toggleBlockContact(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup) return;
  c.blocked=!c.blocked; renderThread(); renderChatList(); saveChatThread(id); saveState(); closeSheet('contact-profile'); showToast(c.blocked?'\u5df2\u62c9\u9ed1':'\u5df2\u53d6\u6d88\u62c9\u9ed1',1200);
}
