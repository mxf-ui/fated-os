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
  setTimeout(()=>{ const prompt='（'+userName+'刚刚拍了拍你的肩膀，请用1句中文自然地回应，可以带点可爱或傲娇，符合你的人设，不要加自己的名字前缀）'; if(c.isGroup){ const m=c.members[0]; realAISpeak(contacts[m], m, prompt, c); } else realAISpeak(c, null, prompt); maybeSummarizeAfter(currentContact); }, 500);
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

