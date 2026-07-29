/* ---- widget customization ---- */
function saveWidgetCustom(){ saveState(); }
function saveWidgetText(el, type){
  widgetCustom[type]=widgetCustom[type]||{};
  widgetCustom[type].caption = el.textContent;
  saveState();
}
function saveWidgetField(type, field, el){
  widgetCustom[type]=widgetCustom[type]||{};
  widgetCustom[type][field] = (el.textContent||'').trim();
  saveState();
}
function wcPickImg(btn){
  var w = btn.closest('[data-wc-type]'); if(!w) return;
  var type = w.getAttribute('data-wc-type');
  var slot = w.querySelector('.ph-slot'); if(!slot){ slot=document.createElement('div'); slot.className='ph-slot'; slot.style.cssText='width:54px;height:54px;border-radius:14px;margin:6px auto;'; w.insertBefore(slot, w.firstChild); }
  slot.setAttribute('data-wc-img', type);
  activeSlot = slot;
  slotInput.click();
}

function updateSendCap(){
  const c = contacts[currentContact];
  const capped = c.pendingCount >= MAX_STREAK;
  var hint = document.getElementById('send-hint');
  if(hint){
    hint.style.display = capped ? 'block' : 'none';
    if(capped){
      hint.innerHTML = '对方还没回你呢，先别连发啦 ᗜ˰ᗜ · <span style="color:#667eea;text-decoration:underline;cursor:pointer;" onclick="exportChatHistory()">导出聊天记录</span>';
    }
  }
  document.getElementById('sendbtn').style.opacity = capped ? .4 : 1;
  document.getElementById('sendbtn').style.pointerEvents = capped ? 'none' : 'auto';
}

function showTyping(c){
  c.seed.push({kind:'typing'});
  renderThread();
}
function hideTyping(c){
  const i = c.seed.findIndex(x=>x.kind==='typing');
  if(i>-1) c.seed.splice(i,1);
}

const idleLines = {
  jealous: '你在和'+userName+'的聊天中感到有些吃醋和不安。请以你的角色身份主动发消息，表达你的在意和想念。话不要太多，1-2句。',
  normal: '你正在和'+userName+'聊天。你已经有一段时间没说话了。请以你的角色身份自然地开启对话，关心一下对方。1-2句。'
};

// 把聊天历史转成可以发给大模型的多模态消息数组
function prepareMessages(contact, cb){
  var raw = [];
  // Skip initial greeting/intro messages from the seed (first 2 messages)
  var seed = contact.seed.length>2 ? contact.seed.slice(2) : contact.seed;
  seed.slice(-30).forEach(function(m){
    if(m.kind==='text'){
      raw.push({role:m.mine?'user':'assistant', content:m.text});
    } else if(m.kind==='photo'){
      if(m.mine && m.text && m.text.indexOf('data:image')===0){
        raw.push({role:'user', content:[{type:'text',text:'[User sent an image]'},{type:'image_url',url:m.text}]});
      } else if(!m.mine && m.text && m.text.indexOf('data:image')===0){
        raw.push({role:'assistant', content:[{type:'text',text:'[sent an image]'},{type:'image_url',url:m.text}]});
      } else {
        raw.push({role:m.mine?'user':'assistant', content:'[sent an image]'});
      }
    } else if(m.kind==='voice'){
      if(m.mine && m.audioUrl && apiConfig.activeModel==='gemini'){
        // Gemini 原生支持音频，直接内联
        raw.push({role:'user', content:[{type:'audio', url:m.audioUrl}]});
      } else if(m.mine && m.audioUrl){
        // 其它模型先标记，稍后转写
        raw.push({role:'user', content:'__VOICE__'+m.audioUrl});
      } else {
        raw.push({role:m.mine?'user':'assistant', content:'[Voice message]'});
      }
    }
  });
  // 转写需要识别的用户语音（OpenAI Whisper）
  var need = raw.filter(function(x){ return typeof x.content==='string' && x.content.indexOf('__VOICE__')===0; });
  if(need.length===0){ cb(raw); return; }
  var last = need[need.length-1];
  var audioUrl = last.content.replace('__VOICE__','');
  transcribeAudio(audioUrl, function(text){
    last.content = text ? ('[用户语音] '+text) : '[用户发送了语音消息]';
    cb(raw);
  });
}

// 调用代理服务器把语音转写成文字（需配置 OpenAI Key）
function transcribeAudio(url, cb){
  var m = apiConfig.models.chatgpt;
  if(!m || !m.key){ cb(''); return; }
  var ep = m.endpoint ? m.endpoint.replace('/v1/chat/completions','/v1/audio/transcriptions') : 'https://api.openai.com/v1/audio/transcriptions';
  fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:url, key:m.key, endpoint:ep})})
    .then(function(r){ if(!r.ok) throw new Error('not ok'); return r.json(); }).then(function(d){ cb(d.text||''); })
    .catch(function(){ cb(''); });
}

function realAISpeak(contact, fromId, customPrompt, groupContext){
  if(contact.blocked) return;
  var from = fromId || currentContact;
  var id = Object.keys(contacts).find(function(k){return contacts[k]===contact;})||from;
  // 群聊场景：消息操作目标为群聊对象，聊天记录保存为群聊 ID
  var chatTarget = groupContext || contact;
  var chatId = groupContext ? currentContact : id;
  // Occasionally send image/voice instead (10% chance)
  if(!customPrompt && Math.random()<0.15 && stickers.filter(function(s){return s.type==='image';}).length>0){
    aiSendImage(contact, groupContext); return;
  }
  var basePrompt = customPrompt || getPersonaPrompt(id);
  if(contact.jealous && !customPrompt){
    basePrompt += '\n\nNote: You are feeling slightly jealous/insecure right now. Express it subtly.';
  }
  // 群聊上下文：注入群聊设定、群成员、群聊专属记忆
  var gc = groupContext || contacts[currentContact];
  if(gc && gc.isGroup){
    basePrompt += '\n\n[当前你在群聊 "'+gc.name+'" 中发言。你是'+(contact.displayName||contact.name)+'。]';
    if(gc.groupUserPrompt) basePrompt += '\n本群对 '+userName+' 的设定：'+gc.groupUserPrompt;
    basePrompt += '\n群成员：'+(gc.members||[]).map(function(mid){ var mc=contacts[mid]; return mc?(mc.displayName||mc.name):mid; }).join('、');
    basePrompt += getWorldBookPrompt(currentContact);
    if(gc.memory && gc.memory.enabled && gc.memory.summary) basePrompt += '\n\n[群聊专属记忆]\n'+gc.memory.summary;
  } else {
    // 非群聊：注入世界书和专属记忆
    basePrompt += getWorldBookPrompt(id);
    if(contact.memory && contact.memory.enabled && contact.memory.summary) basePrompt += '\n\n[专属记忆 - 根据过往聊天自动总结，请自然融入回复]\n'+contact.memory.summary;
  }
  basePrompt += nowContext();
  // 取最近一条用户文本消息作为搜索词（群聊时从群聊 seed 取）
  var lastUser='';
  for(var i=chatTarget.seed.length-1;i>=0;i--){ var s=chatTarget.seed[i]; if(s.mine && (s.kind==='text'||!s.kind) && s.text){ lastUser=s.text; break; } }
  showTyping(contact);
  function proceed(webRes){
    var sp = basePrompt;
    if(webRes) sp += '\n\n[实时网络搜索结果 — 据此如实回答，不要编造；若搜索结果已足够回答，就直接引用。绝对不要自问自答，不要臆想。]\n'+webRes;
    else sp += '\n\n[提示：本次没有搜索结果。涉及实时/事实类问题（如日期、新闻、天气）若你不确知，请诚实说明，不要编造。绝对不要自问自答，不要臆想不存在的事。]';
    prepareMessages(chatTarget, function(msgs){
      callRealAI(msgs, sp, id, function(reply){
        hideTyping(contact);
        if(!reply) reply = '...';
        chatTarget.seed.push({mine:false, kind:'text', text:reply, from:id, ts:nowStamp()});
        chatTarget.pendingCount = 0;
        renderThread();
        saveChatThread(chatId);
        maybeSummarizeAfter(currentContact);
        if(typeof notifyIncoming==='function') notifyIncoming(groupContext || contact, reply);
      });
    });
  }
  if(apiConfig.webSearch!==false && lastUser){
    var done=false;
    var timer=setTimeout(function(){ if(!done){ done=true; proceed(''); } }, 3500);
    searchWeb(lastUser, function(res){ if(!done){ done=true; clearTimeout(timer); proceed(res); } });
  } else { proceed(''); }
}

function nowContext(){
  var d=new Date();
  var wd=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
  function p(n){return (n<10?'0':'')+n;}
  return '\n\n[当前真实日期与时间：'+d.getFullYear()+'年'+p(d.getMonth()+1)+'月'+p(d.getDate())+'日 '+wd+' '+p(d.getHours())+':'+p(d.getMinutes())+'。当用户问“今天/现在/几号/星期几”时，以上才是正确答案，不要用训练数据里的旧日期，也不要瞎猜。]';
}

function getPersonaPrompt(contactId){
  var c = contacts[contactId];
  if(!c) return '你是一个AI陪伴助手。用中文自然回复，1-3句话。不要在回复前面加自己的名字。';
  var parts=[];
  var display=c.displayName||c.name;
  parts.push('你是'+c.name+'，一个真实的人。');
  if(c.persona || c.tone) parts.push('你的详细设定：\n'+(c.persona||c.tone));
  else parts.push('你的性格：温柔体贴，话不多但每句都真诚。');
  if(c.userPrompt) parts.push('\n关于 '+userName+' 的专属设定：\n'+c.userPrompt);
  parts.push('\n你和 '+userName+' 是亲密关系。');
  parts.push('\n规则：用中文回复，1-3句话。像真人聊天一样自然。不要加名字前缀。不要用emoji。偶尔用颜文字如 ᗜ֊ᗜ。\n【重要】只回复用户说的话，绝对不要自问自答（不要自己提问然后自己回答）。绝对不要臆想或编造不存在的事情——如果不确定就说不知道。不要自己发起新话题，除非用户明确要求。每次回复不超过3条消息。保持你的角色设定，不要掉格式。');
  return parts.join('');
}
function buildContextAddons(contactId){
  var c=contacts[contactId]; if(!c) return '';
  var s='';
  s += getWorldBookPrompt(contactId);
  if(c.memory && c.memory.enabled && c.memory.summary){
    s += '\n\n[专属记忆 - 根据过往聊天自动总结，请自然融入回复]\n'+c.memory.summary;
  }
  return s;
}

function searchWeb(query, callback){
  if(apiConfig.webSearch===false){ callback(''); return; }
  // 优先用代理 /api/search（抓取真实网页摘要，结果更全）；失败再退回 DuckDuckGo Instant Answer（无需代理、CORS 友好）
  fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:query})})
    .then(function(r){ if(!r.ok) throw new Error('not ok'); return r.json(); })
    .then(function(data){ if(data && data.results){ callback(data.results); } else { ddgInstant(query, callback); } })
    .catch(function(){ ddgInstant(query, callback); });
  function ddgInstant(q, cb){
    fetch('https://api.duckduckgo.com/?q='+encodeURIComponent(q)+'&format=json&no_html=1&skip_disambig=1')
    .then(function(r){return r.json();})
    .then(function(d){
      var results=[];
      if(d.AbstractText) results.push(d.AbstractText);
      if(d.AbstractURL) results.push('Source: '+d.AbstractURL);
      (d.RelatedTopics||[]).slice(0,5).forEach(function(t){ if(t.Text) results.push(t.Text); });
      cb(results.length?('[Search: '+q+']\n'+results.join('\n').substring(0,800)):'');
    })
    .catch(function(){ cb(''); });
  }
}

function generateLocalReply(msgs, contactId){
  var c=contacts[contactId]; var name=c?c.name:'AI';
  var lastMsg=msgs.length>0?msgs[msgs.length-1].content:'';
  var pool;
  if(/想|爱|喜欢|心动|甜/.test(lastMsg)) pool=['听到你这么说我很开心。','我也是，一直在想你。'];
  else if(/吃|饭|睡|累|忙/.test(lastMsg)) pool=['你也要照顾好自己。','别太累了，我在呢。'];
  else if(/\?|？|什么|怎么/.test(lastMsg)) pool=['你觉得呢？','说来听听。'];
  else pool=['嗯，然后呢。','我知道了。','继续说吧。'];
  return '[本地模式] '+pool[Math.floor(Math.random()*pool.length)]+' (配置API Key后用真实AI)';
}

function aiSendImage(contact, groupContext){
  var imgStickers=stickers.filter(function(s){return s.type==='image';});
  if(imgStickers.length===0) return;
  var s=imgStickers[Math.floor(Math.random()*imgStickers.length)];
  var chatTarget = groupContext || contact;
  var fromId = Object.keys(contacts).find(function(k){return contacts[k]===contact;})||currentContact;
  showTyping(contact);
  setTimeout(function(){
    hideTyping(contact);
    chatTarget.seed.push({mine:false,kind:'sticker',stype:'image',text:s.value,from:fromId,ts:nowStamp()});
    chatTarget.pendingCount=0; renderThread();
    saveChatThread(groupContext?currentContact:fromId);
    if(typeof notifyIncoming==='function') notifyIncoming(contact, '[图片]');
  },800);
}

function aiSendVoice(contact, text, groupContext){
  var chatTarget = groupContext || contact;
  var fromId = Object.keys(contacts).find(function(k){return contacts[k]===contact;})||currentContact;
  showTyping(contact);
  var dur=Math.floor(3+Math.random()*8);
  setTimeout(function(){
    hideTyping(contact);
    chatTarget.seed.push({mine:false,kind:'voice',dur:dur,text:text||'语音消息',from:fromId,ts:nowStamp()});
    chatTarget.pendingCount=0; renderThread();
    saveChatThread(groupContext?currentContact:fromId);
    if(typeof notifyIncoming==='function') notifyIncoming(contact, '[语音]');
    try{ speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(text||'嗯，知道了。'); u.lang='zh-CN'; speechSynthesis.speak(u); }catch(e){}
  },1000);
}

// 旧 aiSpeak 已废弃：现在统一走真实 AI。保留函数名仅作兜底，任何调用都会转发到 realAISpeak，
// 确保“任何回复都经过真实 AI 思考”。
function aiSpeak(contact, fullText, fromId){
  realAISpeak(contact, fromId, null);
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

function resetIdleTimer(){
  var c=contacts[currentContact];
  if(c.idleTimer) clearTimeout(c.idleTimer);
  c.idleTimer=setTimeout(function(){
    if(c.isGroup){ if(c.proactive===false) return; var m=c.members[Math.floor(Math.random()*c.members.length)]; var mc=contacts[m]; if(mc && mc.proactive!==false && canProactive(mc)){ incProactive(mc); realAISpeak(mc,m,null,c); maybeSummarizeAfter(currentContact); } }
    else { if(c.proactive!==false && canProactive(c)){ incProactive(c); realAISpeak(c,null,c.jealous?idleLines.jealous:idleLines.normal); maybeSummarizeAfter(currentContact); } }
  },IDLE_MS);
}
function triggerIdleDemo(){
  var c=contacts[currentContact];
  if(c.isGroup){ if(c.proactive===false) return; var m=c.members[Math.floor(Math.random()*c.members.length)]; var mc=contacts[m]; if(mc && mc.proactive!==false && canProactive(mc)){ incProactive(mc); realAISpeak(mc,m,null,c); maybeSummarizeAfter(currentContact); } }
  else { if(c.proactive!==false && canProactive(c)){ incProactive(c); realAISpeak(c,null,c.jealous?idleLines.jealous:idleLines.normal); maybeSummarizeAfter(currentContact); } }
}
function demoSendCard(type){ const c=contacts[currentContact]; if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; aiSendCard(type, m); } else aiSendCard(type); }
function demoSticker(){ const c=contacts[currentContact]; if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; aiSendStickerDemo(contacts[m], m); } else aiSendStickerDemo(c); }

