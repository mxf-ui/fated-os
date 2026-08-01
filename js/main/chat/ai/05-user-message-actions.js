function profileMsgText(m, fallbackName){
  if(!m) return '';
  if(m.kind==='text' || !m.kind) return m.text || '';
  if(m.kind==='photo') return '[\u56fe\u7247]';
  if(m.kind==='voice') return '[\u8bed\u97f3]';
  if(m.kind==='card') return '[\u5361\u7247] ' + (m.title || m.name || m.cardType || '');
  if(m.kind==='sticker') return '[\u8868\u60c5]';
  return m.text || '[' + (m.kind || fallbackName || 'message') + ']';
}
function coupleUserProfile(contactId, force){
  var c=contacts[contactId]; if(!c || c.isGroup) return;
  var seed=Array.isArray(c.seed) ? c.seed : [];
  if(seed.length < 4) return;
  if(!force && seed.length < (c.userProfileLastMsgCount||0) + 6) return;
  var name=c.displayName||c.name||'TA';
  var recent=seed.slice(-28).map(function(m){
    var who=m.mine ? userName : (contacts[m.from] ? (contacts[m.from].displayName||contacts[m.from].name) : name);
    return who + ': ' + profileMsgText(m, name);
  }).join('\n');
  var persona = typeof getPersonaPrompt === 'function' ? getPersonaPrompt(contactId) : '';
  var world = typeof getWorldBookPrompt === 'function' ? getWorldBookPrompt(contactId) : '';
  var time = typeof nowContext === 'function' ? nowContext() : '';
  var prompt='\u8bf7\u4ee5 '+name+' \u7684\u89c6\u89d2\uff0c\u4e3a '+userName+' \u66f4\u65b0\u4e00\u4efd\u201c\u4eba\u7269\u4fa7\u5199\u201d\u3002\u8981\u6c42\uff1a\n'
    +'1. \u5b8c\u5168\u9075\u5faa '+name+' \u7684\u4eba\u8bbe\u3001\u4e16\u754c\u4e66\u3001\u5173\u7cfb\u8bb0\u5fc6\u548c\u6700\u8fd1\u804a\u5929\uff0c\u4e0d\u8981\u8df3\u51fa\u89d2\u8272\u3002\n'
    +'2. \u5199\u51fa '+name+' \u773c\u4e2d\u7684\u7528\u6237\u6027\u683c\u3001\u4e60\u60ef\u3001\u8f6f\u808b\u3001\u5728\u610f\u70b9\u3001\u76f8\u5904\u96f7\u533a\u3001\u4eb2\u5bc6\u4fe1\u53f7\u3002\n'
    +'3. \u4e0d\u8981\u7f16\u9020\u804a\u5929\u91cc\u6ca1\u6709\u4f9d\u636e\u7684\u4e8b\u5b9e\uff1b\u53ef\u4ee5\u5199\u201c\u6682\u4e0d\u786e\u5b9a\u201d\u3002\n'
    +'4. \u8f93\u51fa 5-8 \u6761\u4e2d\u6587\u77ed\u53e5\uff0c\u50cf\u771f\u5b9e\u719f\u4eba\u9010\u6e10\u5f62\u6210\u7684\u89c2\u5bdf\uff0c\u4e0d\u8981\u6a21\u677f\u5473\uff0c\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\u3002\n\n'
    +'\u3010\u5df2\u6709\u4eba\u7269\u4fa7\u5199\u3011\n'+(c.userProfile||'(\u6682\u65e0)')+'\n\n'
    +'\u3010\u8054\u7cfb\u4eba\u957f\u671f\u8bb0\u5fc6\u3011\n'+(c.memory&&c.memory.summary?c.memory.summary:'(\u6682\u65e0)')+'\n\n'
    +'\u3010\u6700\u8fd1\u804a\u5929\u3011\n'+recent;
  callRealAI([{role:'user', content:prompt}], persona + world + time, contactId, function(profile){
    if(!profile) return;
    c.userProfile=String(profile).trim();
    c.userProfileUpdatedAt=Date.now();
    c.userProfileLastMsgCount=seed.length;
    saveChatThread(contactId);
    if(typeof saveState === 'function') saveState();
    if(currentContact===contactId){
      var el=document.getElementById('cp-user-profile'); if(el) el.textContent=c.userProfile||'(\u6682\u65e0\u4eba\u7269\u4fa7\u5199)';
    }
  });
}
function maybeUpdateUserProfileAfter(contactId){
  setTimeout(function(){ coupleUserProfile(contactId, false); }, 2600);
}

function sendMsg(){
  const c = contacts[currentContact];
  if(c.blocked){ showToast('已拉黑，无法发送消息', 1200); return; }
  if(c.pendingCount >= MAX_STREAK){ showToast('达到上限，点击导出聊天记录或等待回复', 1500); return; }
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if(!text) return;
  c.seed.push({mine:true, kind:'text', text, from:'me', ts:nowStamp()});
  c.pendingCount++;
  input.value='';
  renderThread();
  saveChatThread();
  resetIdleTimer();
  aiAutoReply(c);
  maybeSummarizeAfter(currentContact);
  maybeUpdateUserProfileAfter(currentContact);
}

function sendVoice(){
  const c = contacts[currentContact];
  if(c.pendingCount >= MAX_STREAK) return;
  const dur = Math.floor(3 + Math.random()*10);
  c.seed.push({mine:true, kind:'voice', dur, from:'me', ts:nowStamp()});
  c.pendingCount++;
  renderThread();
  saveChatThread();
  resetIdleTimer();
  // 走真实 AI：若用户语音含音频数据则会被转写/内联，否则作为语音消息触发真实回复
  aiAutoReply(c);
  maybeSummarizeAfter(currentContact);
  maybeUpdateUserProfileAfter(currentContact);
}
function aiPushVoice(c, text, fromId){
  showTyping(c);
  setTimeout(()=>{ hideTyping(c); c.seed.push({mine:false, kind:'voice', dur:Math.floor(2+Math.random()*8), text:text, from:fromId||currentContact, ts:nowStamp()}); c.pendingCount=0; renderThread(); saveChatThread(fromId||currentContact); speakText(text); }, 550);
}

function patContact(){
  const c = contacts[currentContact];
  c.seed.push({kind:'pat', text:'你拍了拍 "'+c.name+'" 的肩膀', ts:nowStamp()});
  renderThread();
  saveChatThread();
  closeDrawers();
  setTimeout(()=>{ const prompt='（'+userName+'刚刚拍了拍你的肩膀，请用1句中文自然地回应，可以带点可爱或傲娇，符合你的人设，不要加自己的名字前缀）'; if(c.isGroup){ const m=c.members[0]; realAISpeak(contacts[m], m, prompt, c); } else realAISpeak(c, null, prompt); maybeSummarizeAfter(currentContact);
  maybeUpdateUserProfileAfter(currentContact); }, 500);
}

function aiSendCard(type, fromId){
  const c = contacts[currentContact];
  const from = fromId || currentContact;
  const fromC = contacts[from] || c;
  const id = cardIdSeq++;
  if(type==='family'){
    c.seed.push({kind:'card', id, mine:false, cardType:'family', title:fromC.name+'的亲属卡', amount:9960, status:'pending', from, ts:nowStamp()});
  } else {
    c.seed.push({kind:'card', id, mine:false, cardType:'transfer', amount:200, note:'淋雨也要记得吃饭', status:'pending', from, ts:nowStamp()});
  }
  renderThread();
  saveChatThread();
  maybeSummarizeAfter(currentContact);
  maybeUpdateUserProfileAfter(currentContact);
}

function aiSendStickerDemo(contact, fromId){
  const c = contact || contacts[currentContact];
  const from = fromId || currentContact;
  const pool = stickers.filter(s => c.jealous ? (s.mood==='sad'||s.mood==='angry') : (s.mood==='happy'||s.mood==='love'));
  const list = pool.length ? pool : stickers;
  if(!list.length) return;
  const s = list[Math.floor(Math.random()*list.length)];
  showTyping(c);
  setTimeout(()=>{
    hideTyping(c);
    c.seed.push({mine:false, kind:'sticker', stype:s.type, text:s.value, from, ts:nowStamp()});
    c.pendingCount = 0;
    renderThread();
    saveChatThread(from);
    if(typeof notifyIncoming==='function') notifyIncoming(c, '[表情]');
  }, 550);
}

