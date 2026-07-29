/* ============ GROUP CHAT ============ */
function addChatRow(id, isGroup){
  renderChatList();
}
function addContactRow(id, isGroup){
  const c = contacts[id];
  const av = isGroup ? '<div class="chibi"></div>' : contactAvatar(c);
  const row = document.createElement('div');
  row.className='contact-row';
  row.setAttribute('data-cid', id);
  row.setAttribute('onclick', "openThread('"+id+"')");
  var avClick = isGroup ? '' : ' onclick="event.stopPropagation();changeContactAvatar(\''+id+'\')" title="点击更换头像" style="cursor:pointer;"';
  row.innerHTML = '<div class="av glass-strong"'+avClick+'>'+av+'</div><div style="flex:1;min-width:0;"><div class="name">'+esc(c.displayName||c.name)+'</div><div class="habit">'+(isGroup?('群成员 '+c.members.length+' 人'):'已添加的人设')+'</div></div><div class="del-contact" onclick="event.stopPropagation();deleteContact(\''+id+'\')" title="删除联系人">×</div>';
  const box = document.getElementById('contact-items');
  if(box) box.appendChild(row);
}
function deleteContact(id){
  if(id==='tester1'){ showToast('测试员1 是默认联系人，不能删除', 1600); return; }
  var nm = contacts[id] ? contacts[id].name : id;
  // 清除空闲计时器
  if(contacts[id] && contacts[id].idleTimer){ clearTimeout(contacts[id].idleTimer); }
  // 彻底删除联系人数据
  delete contacts[id];
  // 清理API配置
  if(apiConfig.voiceIds) delete apiConfig.voiceIds[id];
  if(apiConfig.memoryBooks) delete apiConfig.memoryBooks[id];
  // 从 IndexedDB 删除聊天记录
  fatedDBDeleteChat(id);
  // 从联系人列表DOM中移除
  var cr=document.querySelector('#contact-items [data-cid="'+id+'"]'); if(cr) cr.remove();
  // 重建聊天列表（会自动排除已删除的联系人）
  renderChatList();
  // 如果当前正在和被删除的联系人聊天，切回测试员1
  if(currentContact===id){
    currentContact='tester1';
    closeSheet('thread');
  }
  saveState();
  showToast('已删除「'+nm+'」及其所有聊天记录', 1600);
}
function openGroupSheet(){
  const list = document.getElementById('group-picker');
  const ids = Object.keys(contacts).filter(k=>!contacts[k].isGroup && k!=='me');
  list.innerHTML = ids.map(id=>{
    const c = contacts[id];
    return '<label class="me-row" style="cursor:pointer;"><div class="av" style="width:34px;height:34px;">'+contactAvatar(c)+'</div><div class="t">'+esc(c.name)+'</div><input type="checkbox" class="gp-chk" value="'+id+'" style="margin-left:auto;"></label>';
  }).join('');
  document.getElementById('gp-name').value='';
  renderWorldBookChips('gp-worldbooks', []);
  openSheet('group');
}
function createGroup(){
  const chks = Array.from(document.querySelectorAll('#group-picker .gp-chk:checked')).map(c=>c.value);
  if(chks.length<2){ showToast('至少选择 2 个人设才能建群', 1500); return; }
  const id = 'g'+(personaSeq++);
  const gname = document.getElementById('gp-name').value.trim();
  const names = chks.map(k=>contacts[k].name).join('、');
  const wbIds = Array.from(document.querySelectorAll('#gp-worldbooks .wb-chk:checked')).map(c=>c.value);
  contacts[id] = { name:gname||('群聊 · '+names.slice(0,10)), displayName:'', isGroup:true, members:chks, pendingCount:0, idleTimer:null, avatar:null, avatarColor:null, blocked:false, worldBooks:wbIds, memory:{enabled:true, threshold:20, summary:'', lastMsgCount:0}, groupUserPrompt:userPrefs||'', seed:[] };
  addChatRow(id, true); addContactRow(id, true);
  closeSheet('group');
  openThread(id);
  saveState();
  saveChatThread(id);
}

/* ============ REAL VOICE (TTS + recording) ============ */
function ttsConfigured(){
  var p=apiConfig.ttsProvider, t=apiConfig.tts;
  if(p==='elevenlabs') return !!t.elevenlabs.key;
  if(p==='minimax') return !!(t.minimax.key && t.minimax.groupId);
  if(p==='custom') return !!(t.custom.endpoint && t.custom.key);
  return false;
}
function playAudioBlob(blob){ var url=URL.createObjectURL(blob); var a=new Audio(url); a.play().catch(function(){}); a.onended=function(){ try{URL.revokeObjectURL(url);}catch(e){} }; }
function speakText(t){
  if(!t) return;
  if(ttsConfigured()){ speakWithTTS(t, apiConfig.voiceIds[currentContact]||''); return; }
  try{
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang='zh-CN'; u.rate=1.02; u.pitch=1.08;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}
/* 通过配置的 TTS 服务商（含自定义国内中转站）朗读文本 */
function speakWithTTS(text, voiceId){
  var p=apiConfig.ttsProvider, t=apiConfig.tts;
  function fallback(){ try{ if('speechSynthesis' in window){ var u=new SpeechSynthesisUtterance(text); u.lang='zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u);} }catch(e){} }
  try{
    if(p==='elevenlabs'){
      var vid=voiceId||'21m00Tcm4TlvDq8ikWAM';
      fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(vid), {method:'POST', headers:{'Content-Type':'application/json','xi-api-key':t.elevenlabs.key}, body:JSON.stringify({text:text, model_id:t.elevenlabs.model||'eleven_multilingual_v2'})})
        .then(function(r){ return r.blob(); }).then(function(b){ playAudioBlob(b); }).catch(fallback);
    } else if(p==='minimax'){
      var url='https://api.minimax.chat/v1/t2a_v2?GroupId='+encodeURIComponent(t.minimax.groupId);
      fetch(url, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+t.minimax.key}, body:JSON.stringify({model:t.minimax.model||'speech-01', text:text, voice_setting:{voice_id:(voiceId||'female-qn-qingse'), speed:1, vol:1, pitch:0}})})
        .then(function(r){return r.json();}).then(function(d){ var b64=d&&d.data&&d.data.audio; if(b64){ var bin=atob(b64); var arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); playAudioBlob(new Blob([arr],{type:'audio/mp3'})); } else fallback(); }).catch(fallback);
    } else if(p==='custom'){
      fetch(t.custom.endpoint, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+t.custom.key}, body:JSON.stringify({text:text, voice:(t.custom.voice||voiceId||''), model:''})})
        .then(function(r){ var ct=r.headers.get('content-type')||''; if(ct.indexOf('audio')>-1){ return r.blob().then(playAudioBlob); } return r.json().then(function(d){ var b64=d&&(d.audio||(d.data&&d.data.audio)||d.data); if(b64){ if(typeof b64==='string'&&b64.indexOf(',')>-1) b64=b64.split(',')[1]; var bin=atob(b64); var arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); playAudioBlob(new Blob([arr],{type:'audio/mpeg'})); } else fallback(); }); }).catch(fallback);
    } else fallback();
  }catch(e){ fallback(); }
}
function startRecord(){
  if(isRecording){ stopRecord(); return; }
  if(!navigator.mediaDevices || !window.MediaRecorder){ alert('当前环境不支持录音，已用模拟语音代替'); sendVoice(); return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    mediaChunks=[]; mediaRec=new MediaRecorder(stream);
    mediaRec.ondataavailable = e=>{ if(e.data.size) mediaChunks.push(e.data); };
    mediaRec.onstop = ()=>{
      const blob = new Blob(mediaChunks, {type: mediaChunks[0]?mediaChunks[0].type:'audio/webm'});
      const dur = Math.max(1, Math.round((Date.now()-recStart)/1000));
      const c = contacts[currentContact];
      stream.getTracks().forEach(t=>t.stop());
      // 关键修复：必须转成 data: URL（base64）才能发给代理服务器让 AI 真正“听到”语音。
      // 原来的 URL.createObjectURL(blob) 是浏览器本地引用，代理服务器无法读取。
      const reader = new FileReader();
      reader.onload = function(){
        c.seed.push({mine:true, kind:'voice', audioUrl:reader.result, dur, from:'me', ts:nowStamp()});
        c.pendingCount++; renderThread(); saveChatThread(); resetIdleTimer();
        aiAutoReply(c);
      };
      reader.readAsDataURL(blob);
    };
    mediaRec.start(); isRecording=true; recStart=Date.now();
    document.querySelectorAll('#sheet-thread .icobtn').forEach(b=>{ if(b.getAttribute('onclick')&&b.getAttribute('onclick').indexOf('startRecord')>-1) b.classList.add('recording'); });
  }).catch(()=>{ showToast('无法访问麦克风，已用模拟语音代替', 1500); sendVoice(); });
}
function stopRecord(){
  isRecording=false;
  document.querySelectorAll('#sheet-thread .icobtn.recording').forEach(b=>b.classList.remove('recording'));
  if(mediaRec && mediaRec.state!=='inactive') mediaRec.stop();
}
/* ============ REAL AI API CALLER ============ */
function callRealAI(messages, systemPrompt, contactId, callback){
  var cfg = apiConfig;
  var model = cfg.activeModel || 'deepseek';
  var m = cfg.models[model];
  var sp = (systemPrompt||'You are a helpful assistant. Never prefix with your name.');
  if(contactId) sp += buildContextAddons(contactId);
  var msgs = [{role:'system',content:sp}];
  // Add legacy memory book if available
  if(contactId && cfg.memoryBooks[contactId]){
    var mb = cfg.memoryBooks[contactId];
    if(mb.trim()) msgs.push({role:'system',content:'[Legacy Memory Book]\n'+mb.trim()});
  }
  msgs = msgs.concat(messages.slice(-Math.floor(cfg.memoryWindow/200)));
  var hasKey = !!(m&&m.key), hasEndpoint = !!(m&&m.endpoint);
  console.log('=== AI REQUEST ===');
  console.log('Model:',model,'HasKey:',hasKey,'Messages:',msgs.length);
  msgs.forEach(function(x,i){ console.log('  ['+i+'] '+x.role+': '+x.content.substring(0,80)); });

  // 构造直连请求体（按 provider 拼装，端点自动补全）
  function buildDirect(){
    var url,hdrs,bd;
    var ep = modelEndpoint(m, model);            // 规范化端点
    if(!ep) return null;
    if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:1024,temperature:0.8}); }
    else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; var sys=msgs.filter(function(x){return x.role==='system';}).map(function(x){return x.content;}).join('\n\n'); bd=JSON.stringify({model:m.model,system:sys,messages:msgs.filter(function(x){return x.role!=='system';}),max_tokens:1024}); }
    else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:msgs.map(function(x){return {role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]};}),generationConfig:{maxOutputTokens:1024,temperature:0.8}}); }
    else if(model==='custom'){
      var cf=m.apiFormat||'openai';
      if(cf==='claude'){
        url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'};
        var sys=msgs.filter(function(x){return x.role==='system';}).map(function(x){return x.content;}).join('\n\n');
        bd=JSON.stringify({model:m.model,system:sys,messages:msgs.filter(function(x){return x.role!=='system';}),max_tokens:1024});
      } else if(cf==='gemini'){
        url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'};
        bd=JSON.stringify({contents:msgs.map(function(x){return {role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]};}),generationConfig:{maxOutputTokens:1024,temperature:0.8}});
      } else {
        url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:1024,temperature:0.8});
      }
    }
    else { return null; }
    return {url:url,hdrs:hdrs,bd:bd};
  }
  function parseReply(data){
    if(model==='deepseek'||model==='chatgpt') return (data.choices&&data.choices[0])?data.choices[0].message.content:'';
    if(model==='custom'){
      var cf=(m.apiFormat||'openai');
      if(cf==='claude') return (data.content&&data.content[0])?data.content[0].text:'';
      if(cf==='gemini') return (data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
      return (data.choices&&data.choices[0])?data.choices[0].message.content:'';
    }
    if(model==='claude') return (data.content&&data.content[0])?data.content[0].text:'';
    if(model==='gemini') return (data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
    return '';
  }

  // 1) 优先直连：DeepSeek/OpenAI 支持 file:// 跨域，通常无需代理即可成功
  function tryDirect(cb){
    if(!m||!m.key||!m.endpoint){ cb(null); return; }
    var d = buildDirect(); if(!d){ cb(null); return; }
    fetch(d.url,{method:'POST',headers:d.hdrs,body:d.bd}).then(function(r){
      // CORS 被拦截时 r 不可读会抛错走 catch；能读到则继续
      return r.text().then(function(t){ return {ok:r.ok, status:r.status, text:t}; });
    }).then(function(res){
      if(!res){ cb(null); return; }
      var data; try{ data = JSON.parse(res.text); }catch(e){ data = null; }
      if(!data){ cb(null); return; }
      var reply = parseReply(data);
      // 只有拿到真实有效回复才算直连成功；API 错误（Key/模型/额度）一律交给代理兜底统一报错
      if(reply && !data.error){ cb(reply); }
      else { cb(null); }
    }).catch(function(){ cb(null); });
  }

  // 2) 代理兜底（Cloudflare Pages Function），解决 CORS 限制，并回传具体错误原因
  function tryProxy(cb){
    if(!m||!m.key){ cb(null); return; }
    var ep = modelEndpoint(m, model);
    var proxyBody = JSON.stringify({messages:msgs, model:(m?m.model:'deepseek-chat'), provider:model, key:(m?m.key:''), endpoint:ep, dataModel:(m?m.model:'deepseek-chat'), apiFormat:(m?(m.apiFormat||'openai'):'openai'), max_tokens:1024});
    var apiUrl = proxyBase()+'/api/chat';
    fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:proxyBody})
      .then(function(r){
        return r.text().then(function(t){ return {ok:r.ok, status:r.status, text:t}; });
      })
      .then(function(res){
        if(!res || !res.text){ cb(null, null); return; }
        var data; try{ data = JSON.parse(res.text); }catch(e){ data = null; }
        if(!data){ cb(null, '代理返回非 JSON (HTTP '+res.status+')'); return; }
        var reply=data.content||data.reply||'';
        var isErrReply = /API连接失败|API Error|Invalid API|401|403|unauthorized|forbidden|请在设置|填入 API Key|请先在设置|缺(少)?\s*API|Proxy error|无法访问|timed out|timeout/i.test(reply);
        if(reply && !isErrReply && !data.error){ cb(reply); return; }
        // 提取代理回传的具体错误，供最终提示使用
        var errMsg = data.error || (isErrReply ? reply : '') || ('HTTP '+res.status);
        cb(null, errMsg);
      })
      .catch(function(){ cb(null, '代理请求失败（Functions 可能未部署）'); });
  }

  if(!m||!m.key){
    showToast('未填写 API Key：请去 设置→API Config 填写', 2600, 'err');
    callback(generateLocalReply(messages,contactId)+' [need API key]');
    return;
  }
  // 直连优先（DeepSeek/OpenAI 等 API 本身支持 CORS）→ 代理兜底 → 离线回复
  tryDirect(function(directReply){
    if(directReply){ callback(directReply); return; }
    tryProxy(function(proxyReply, errMsg){
      if(proxyReply){ callback(proxyReply); return; }
      var hint = errMsg ? ('：'+String(errMsg).replace(/^(API Error \(HTTP \d+\):\s*|Proxy error:\s*)/i,'').substring(0,90)) : '：请检查 API Key 和 Endpoint';
      showToast('AI 连接失败'+hint, 3600, 'err');
      callback(generateLocalReply(messages,contactId)+' [无法连接 AI]');
    });
  });
}

function summarizeMemory(contactId){
  var c=contacts[contactId]; if(!c) return;
  if(!c.memory) c.memory={enabled:true, threshold:20, summary:'', lastMsgCount:0};
  if(c.memory.enabled===false) return;
  var seed=c.seed||[];
  var th=c.memory.threshold||20;
  if(seed.length < c.memory.lastMsgCount + th) return;
  // 取最近 th 条消息作为本次总结增量
  var recent=seed.slice(-th);
  var log=recent.map(function(m){
    var who=m.mine?userName:(contacts[m.from]?contacts[m.from].name:c.name);
    var txt='';
    if(m.kind==='text' || !m.kind) txt=m.text||'';
    else if(m.kind==='photo') txt='[图片]';
    else if(m.kind==='voice') txt='[语音]';
    else if(m.kind==='sticker') txt='[表情]';
    else if(m.kind==='pat') txt=m.text||'[拍一拍]';
    else if(m.kind==='card') txt='[卡片]';
    return who+'：'+txt;
  }).join('\n');
  var prompt='请根据以下聊天记录，提炼关键信息并更新记忆总结。要求：\n1. 保留用户'+userName+'的偏好、习惯、重要事件、情感状态。\n2. 保留 '+c.name+' 的关键信息和态度。\n3. 用简洁中文条目列出，不要编造。\n4. 如果已有记忆，请合并去重。\n\n【已有记忆】\n'+(c.memory.summary||'(无)')+'\n\n【新增聊天记录】\n'+log+'\n\n请输出新的记忆总结：';
  callRealAI([{role:'user',content:prompt}], '你是记忆整理助手。请用中文输出简洁的记忆总结条目。', null, function(summary){
    if(summary){
      c.memory.summary=summary.trim();
      c.memory.lastMsgCount=seed.length;
      saveChatThread(contactId);
      // 如果正在看该联系人/群聊的资料页，刷新显示
      if(currentContact===contactId){
        var cp=document.getElementById('cp-memory-summary'); if(cp) cp.textContent=c.memory.summary||'(暂无记忆)';
        var gi=document.getElementById('gi-memory-summary'); if(gi) gi.textContent=c.memory.summary||'(暂无群聊记忆)';
      }
    }
  });
}

function maybeSummarizeAfter(contactId){
  setTimeout(function(){ summarizeMemory(contactId); }, 2000);
}

function aiAutoReply(c){
  if(c.isGroup){
    // 群聊：每个成员按随机顺序只回复 1 条
    var members=shuffleArray((c.members||[]).slice());
    var delay=500;
    members.forEach(function(mid, idx){
      var mc=contacts[mid]; if(!mc || mc.blocked) return;
      setTimeout(function(){ realAISpeak(mc,mid,null,c); }, delay);
      delay += 1200 + Math.floor(Math.random()*1500);
    });
  } else if(c.pendingCount < MAX_STREAK){ setTimeout(function(){ realAISpeak(c); },500); }
}
function shuffleArray(arr){
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
  return arr;
}
function callUserSpeak(){
  try{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const st = document.getElementById('call-status');
    // 通话也走真实 AI：把用户说的话（或“打来电话”）作为真实输入，让 AI 思考后回复并朗读
    const replyAndSpeak = function(userText){
      callRealAI([{role:'user',content:userText||'（打来电话，随便聊两句）'}], getPersonaPrompt(currentContact)+nowContext(), currentContact, function(reply){ st.textContent='通话中'; speakText(reply||'嗯，我在听。'); });
    };
    if(!SR){ st.textContent='通话中'; replyAndSpeak('（打来电话）'); return; }
    const rec = new SR(); rec.lang='zh-CN'; rec.interimResults=false;
    st.textContent='聆听中…';
    rec.onresult = e=>{ const txt=e.results[0][0].transcript; replyAndSpeak(txt); };
    rec.onerror = ()=>{ st.textContent='通话中'; replyAndSpeak('（没听清，请你再说一遍）'); };
    rec.start();
  }catch(e){ speakText('喂？'); }
}


/* ============ CHAT BACKGROUND ============ */
function applyChatBgToDOM(val){
  var bg=document.getElementById('thread-bg');
  if(!bg) return;
  // 判断是图片URL还是纯色/渐变
  if(typeof val==='string' && val.indexOf('url(')===0){
    bg.style.background=val;
    bg.style.backgroundSize='cover';
    bg.style.backgroundPosition='center';
    bg.style.backgroundRepeat='no-repeat';
  } else {
    bg.style.background=val;
  }
  // 同时设置sheet背景（状态栏区域）
  var sheet=document.getElementById('sheet-thread');
  if(sheet) sheet.style.background=val;
}
function setChatBg(el, val){
  chatBg = val;
  document.querySelectorAll('#chat-bg-swatches .swatch').forEach(function(s){s.style.border='2px solid transparent';});
  if(el&&el.style) el.style.border='2px solid #1a1a1a';
  applyChatBgToDOM(val);
  saveState();
}
function uploadChatBg(e){
  var file=e.target.files[0]; if(!file) return;
  compressImage(file, 800, 0.85, function(res){
    if(!res) return;
    chatBg='url('+res+') center/cover no-repeat';
    applyChatBgToDOM(chatBg);
    document.querySelectorAll('#chat-bg-swatches .swatch').forEach(function(s){s.style.border='2px solid transparent';});
    saveState();
    showToast('聊天壁纸已更换', 1200);
  });
  e.target.value='';
}
function applyChatBgHex(){
  var v=(document.getElementById('chatbg-hex').value||'').trim();
  if(!v) return;
  if(v[0]!=='#' && !/^(rgb|hsl)/i.test(v)) v='#'+v;
  setChatBg(null, v);
  document.querySelectorAll('#chat-bg-swatches .swatch').forEach(function(s){s.style.border='2px solid transparent';});
  showToast('聊天背景已更新', 1200);
}

/* ============ BLOCK CONTACT ============ */
function blockContact(){
  const c = contacts[currentContact];
  c.blocked = true;
  closeSheet('chatsettings');
  // 在聊天中添加一条系统消息记录拉黑时间
  c.seed.push({kind:'pat', text:'—— 你已拉黑 '+c.name+'，双方都无法发送消息 ——', ts:nowStamp()});
  renderThread();
  saveChatThread(); saveState();
  showToast('已拉黑 '+c.name, 1400);
}
function unblockContact(){
  const c = contacts[currentContact];
  c.blocked = false;
  // 添加一条系统消息记录解除拉黑
  c.seed.push({kind:'pat', text:'—— 你已解除拉黑 '+c.name+'，可以正常聊天了 ——', ts:nowStamp()});
  renderThread();
  saveChatThread(); saveState();
  showToast('已解除拉黑', 1200);
  // 解除拉黑后AI自然回复一条消息
  setTimeout(function(){ realAISpeak(c,null,'You just got unblocked by '+userName+'. Express sincere apology and relief. Keep it short, 1-2 sentences in Chinese.'); },400);
}
function blockDrawer(){
  var c=contacts[currentContact];
  if(c.blocked){
    // 已拉黑，直接解除
    unblockContact();
  } else {
    // 未拉黑，直接拉黑
    blockContact();
  }
}
function sendPic(e){var f=e.target.files[0];if(!f)return;var c=contacts[currentContact];if(c.blocked){showToast('已拉黑，无法发送消息',1200);return;}if(c.pendingCount>=MAX_STREAK)return;var r=new FileReader();r.onload=function(){c.seed.push({mine:true,kind:'photo',text:r.result,from:'me',ts:nowStamp()});c.pendingCount++;closeDrawers();renderThread();saveChatThread();resetIdleTimer();aiAutoReply(c);maybeSummarizeAfter(currentContact);};r.readAsDataURL(f);e.target.value='';}
function toggleBlock(){ const c = contacts[currentContact]; if(c.blocked) unblockContact(); else blockContact(); }

var AVATAR_PALETTE = ['#e98a9c','#9bb37a','#7d9bd1','#c9a4e0','#e0b26a','#79c2c9','#d98aa6','#8ab0e0'];
function randAvatarColor(){ return AVATAR_PALETTE[Math.floor(Math.random()*AVATAR_PALETTE.length)]; }
function avatarHTML(tone, color){
  var st = color ? ' style="--avbg:'+color+'"' : '';
  return '<div class="chibi '+(tone||'')+'"'+st+'><div class="ear l"></div><div class="ear r"></div><div class="face"></div><div class="eye l"></div><div class="eye r"></div><div class="blush l"></div><div class="blush r"></div></div>';
}
function contactAvatar(c){
  if(c && c.avatar) return '<img class="av-img" src="'+c.avatar+'" alt="">';
  return avatarHTML(c?c.tone:'', c?c.avatarColor:null);
}

function renderThread(){
  const c = contacts[currentContact];
  document.getElementById('thread-name').textContent = c.displayName || c.name;
  document.getElementById('call-name').textContent = c.name;
  var tAv=document.getElementById('thread-avatar'); if(tAv) tAv.innerHTML=contactAvatar(c);
  // 确保聊天背景正确显示
  if(chatBg) applyChatBgToDOM(chatBg);
  const wrap = document.getElementById('thread-msgs');
  wrap.innerHTML = '<div class="daydivider">今天</div>';
  if(c.blocked){
    wrap.insertAdjacentHTML('beforeend', '<div class="blocked-banner">你已拉黑 '+c.name+'，双方都无法发送消息<br><span class="link" onclick="unblockContact()">点此解除拉黑</span></div>');
  }
  c.seed.forEach(m=> wrap.insertAdjacentHTML('beforeend', renderRow(m, c)));
  wrap.scrollTop = wrap.scrollHeight;
  const ib = document.getElementById('msg-input'), sb = document.getElementById('sendbtn');
  if(c.blocked){ ib.disabled=true; ib.placeholder='已拉黑，等待对方好友申请'; sb.style.opacity=.4; sb.style.pointerEvents='none'; }
  else { ib.disabled=false; ib.placeholder='发消息 · ᗜ֊ᗜ'; sb.style.opacity=1; sb.style.pointerEvents='auto'; }
  const brt = document.getElementById('block-row-text'); if(brt) brt.textContent = c.blocked ? '解除拉黑' : '拉黑 对方';
  var dbt = document.getElementById('drawer-block-text'); if(dbt) dbt.textContent = c.blocked ? '解除拉黑' : '拉黑对方';
  updateSendCap();
  // 群聊功能按钮控制：群聊隐藏亲属卡、显示红包
  var famRow = document.getElementById('drawer-family-row');
  var rpRow = document.getElementById('drawer-redpacket-row');
  if(famRow) famRow.style.display = c.isGroup ? 'none' : 'flex';
  if(rpRow) rpRow.style.display = c.isGroup ? 'flex' : 'none';
}

function renderRow(m, c){
  if(m.kind==='pat'){ return '<div class="sys-text">'+m.text+'</div>'; }
  if(m.kind==='typing'){
    return '<div class="msg-row" id="typing-row"><div class="av">'+contactAvatar(c)+'</div><div class="msg-col"><div class="bubble theirs typing-bubble"><i></i><i></i><i></i></div></div></div>';
  }
  const isMine = !!m.mine;
  let nameLabel, avHTML, tone;
  if(c.isGroup){
    if(isMine){ nameLabel = userName; avHTML = userAvatarHTML(); }
    else { const fromC = contacts[m.from] || c; nameLabel = fromC.displayName || fromC.name; tone = fromC.tone; avHTML = contactAvatar(fromC); }
  } else {
    nameLabel = isMine ? userName : c.name;
    avHTML = isMine ? userAvatarHTML() : contactAvatar(c);
  }
  const timeStr = m.ts ? '<span class="msg-time">'+nowTimeFromTs(m.ts)+'</span>' : '';
  let inner='';
  if(m.kind==='voice'){
    if(m.audioUrl){
      inner = '<div class="bubble '+(isMine?'mine':'theirs')+' voice"><audio controls src="'+m.audioUrl+'"></audio><div class="dur">'+(m.dur||3)+'″</div></div>';
    } else {
      inner = '<div class="bubble '+(isMine?'mine voice mine':'theirs voice theirs')+'" data-text="'+esc(m.text||'')+'" onclick="playVoice(this)"><div class="vplay"></div><div class="wave">'+
        Array.from({length:7}).map(()=>'<span></span>').join('')+'</div><div class="dur">'+(m.dur||3)+'″</div></div>';
    }
  } else if(m.kind==='photo'){ inner='<div style="padding:4px"><img src="'+m.text+'" style="max-width:200px;max-height:200px;border-radius:14px;display:block"></div>'; } else if(m.kind==='sticker'){
    if(m.stype==='image'){
      inner = '<div class="bubble msg-sticker"><img src="'+m.text+'" style="width:88px;height:88px;object-fit:cover;border-radius:16px;"></div>';
    } else {
      inner = '<div class="bubble msg-sticker">'+m.text+'</div>';
    }
  } else if(m.kind==='card'){
    inner = renderCard(m);
  } else {
    inner = '<div class="bubble '+(isMine?'mine':'theirs')+'">'+m.text+'</div>';
  }
  return '<div class="msg-row'+(isMine?' mine':'')+'"><div class="av">'+avHTML+'</div><div class="msg-col"><div class="msg-name">'+nameLabel+' '+timeStr+'</div>'+inner+'</div></div>';
}
function nowTimeFromTs(ts){ const d=new Date(ts); return pad(d.getHours())+':'+pad(d.getMinutes()); }

function renderCard(m){
  const uav = userAvatarHTML();
  const av = '<div style="width:54px;height:54px;border-radius:50%;overflow:hidden;background:#eee;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.18);margin:8px auto;">'+uav+'</div>';
  const wallet='<div class="ico ico-wallet"></div>';
  let body='', status='';
  if(m.cardType==='transfer' || m.cardType==='family'){
    if(m.status==='done'){
      const doneTag = m.cardType==='family' ? ('✓ 已绑定 · ¥'+m.amount+'.00') : '✓ 已领取';
      const title = m.cardType==='family' ? m.title : ('转账 · <span class="card-amount">¥'+m.amount+'.00</span>');
      const sub = m.cardType==='family' ? ((m.mine?'你邀请对方绑定':'对方邀请你绑定')) : m.note;
      body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+title+'</div><div class="card-sub">'+sub+'</div></div></div>';
      status='<div class="card-status done">'+doneTag+'</div>';
    } else if(m.mine){
      const sub = m.cardType==='family' ? '你邀请对方绑定' : m.note;
      const title = m.cardType==='family' ? m.title : ('转账 · <span class="card-amount">¥'+m.amount+'.00</span>');
      body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+title+'</div><div class="card-sub">'+sub+'</div></div></div>';
      status='<div class="card-status wait">对方查收中…</div>';
    } else {
      if(m.cardType==='family'){
        body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+m.title+'</div><div class="card-sub">邀请你绑定</div></div></div>';
        status='<div class="card-status" onclick="claimCard('+m.id+')">立即绑定</div>';
      } else {
        body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">转账 · <span class="card-amount">¥'+m.amount+'.00</span></div><div class="card-sub">'+m.note+'</div></div></div>';
        status='<div class="card-status" onclick="claimCard('+m.id+')">领取</div>';
      }
    }
  } else if(m.cardType==='gift'){
    body='<div class="card-row"><div class="ic-wrap" style="background:#fff0f3;"><div style="font-size:13px;font-weight:700;color:#d44d6e;line-height:1;flex:none;display:flex;align-items:center;justify-content:center;">ᗜ֊ᗜ</div></div><div><div class="card-title">TA 给你买了「'+esc(m.name)+'」</div><div class="card-sub">'+(m.price?('¥'+esc(m.price)+' · '):'')+esc(m.note||'送给你的小惊喜')+'</div></div></div>';
    status='<div class="card-status done">已送达 ❤</div>';
  } else if(m.cardType==='order'){
    body='<div class="card-row"><div class="ic-wrap" style="background:#fff0f3;"><div class="ico" style="font-size:18px;">🍔</div></div><div><div class="card-title">我给你点了「'+esc(m.name)+'」</div><div class="card-sub">'+(m.price?('¥'+esc(m.price)+' · '):'')+esc(m.note||'')+'</div></div></div>';
    status='<div class="card-status '+(m.status==='done'?'done':'wait')+'">'+(m.status==='done'?'TA 已收到 ❤':'TA 查收中…')+'</div>';
  } else if(m.cardType==='loc'){
    body='<div class="card-row"><div class="ic-wrap" style="background:#e6f4ff;"><div class="ico" style="font-size:18px;">📍</div></div><div><div class="card-title">我的实时位置</div><div class="card-sub">'+esc(m.note||'')+'</div></div></div>';
    status='<div class="card-status done">已同步到微信</div>';
  } else if(m.cardType==='redpacket'){
    var rpIcon='<div style="font-size:14px;font-weight:700;color:#d44d6e;line-height:1;flex:none;display:flex;align-items:center;justify-content:center;">˶&gt;ᗜ&lt;˶</div>';
    var grabCount=(m.grabbed||[]).length;
    var grabList=(m.grabbed||[]).map(function(g){ var mc=contacts[g.memberId]; return (mc?(mc.displayName||mc.name):'未知')+'抢到'+g.amount.toFixed(2)+'元'; }).join('、');
    body='<div class="card-row"><div class="ic-wrap" style="background:#fff0f3;">'+rpIcon+'</div><div><div class="card-title">群红包 · <span class="card-amount">¥'+m.amount.toFixed(2)+'</span></div><div class="card-sub">'+m.count+'个红包 · '+(m.status==='done'?'已抢完':'抢中…')+' '+grabCount+'/'+m.count+(grabList?'<br>'+grabList:'')+'</div></div></div>';
    status=m.status==='done'?'<div class="card-status done">已抢完</div>':'<div class="card-status wait">抢中… '+grabCount+'/'+m.count+'</div>';
  } else {
    body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+esc(m.title||'卡片')+'</div></div></div>';
    status='';
  }
  return '<div class="card-msg" style="text-align:center;margin:14px auto;">'+av+body+status+'</div>';
}

function claimCard(id){
  const c = contacts[currentContact];
  const target = c.seed.find(x=>x.kind==='card' && x.id===id);
  if(!target) return;
  target.status='done';
  renderThread();
  if(target.cardType==='family'){
    addWalletTx('亲属卡 · '+c.name+' 绑定', 9960);
    setTimeout(()=>{ c.seed.push({kind:'pat', text:'亲属卡绑定成功 · 初始额度 ¥'+target.amount+'.00', ts:nowStamp()}); renderThread(); saveChatThread(); }, 300);
  } else {
    addWalletTx('收到转账 · '+c.name, target.amount);
    setTimeout(()=>{ c.seed.push({kind:'pat', text:'你领取了 ¥'+target.amount+'.00', ts:nowStamp()}); renderThread(); saveChatThread(); }, 300);
  }
  saveChatThread();
}

function userSendCard(type, amount, note){
  const c = contacts[currentContact];
  closeDrawers();
  if(amount==null || isNaN(amount) || amount<=0){ amount = (type==='family'?9960:200); }
  const id = cardIdSeq++;
  if(type==='family'){ c.seed.push({kind:'card', id, mine:true, cardType:'family', title:userName+'的亲属卡', amount:amount, status:'pending', from:'me', ts:nowStamp()}); addWalletTx('亲属卡邀请 · '+c.name, -amount); }
  else { c.seed.push({kind:'card', id, mine:true, cardType:'transfer', amount:amount, note:note||'给你买点好吃的', status:'pending', from:'me', ts:nowStamp()}); addWalletTx('转账给 '+c.name, -amount); }
  renderThread();
  saveChatThread();
  setTimeout(()=>{
    const target = c.seed.find(x=>x.id===id);
    if(!target) return;
    target.status='done';
    renderThread();
    saveChatThread();
    setTimeout(()=>{
      const prompt = '（你刚刚收到了'+userName+'发来的'+(type==='family'?'亲属卡':'转账')+'，金额 '+amount+'.00 已收到。请用1-2句中文自然地回应，表达感谢和开心，符合你的人设，不要加自己的名字前缀，可偶尔用ᗜ֊ᗜ）';
      if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; realAISpeak(contacts[m], m, prompt, c); }
      else realAISpeak(c, null, prompt);
    }, 200);
  }, 1400);
}

function playVoice(el){
  el.classList.add('playing');
  setTimeout(()=>el.classList.remove('playing'), 1600);
  const t = el.getAttribute('data-text');
  if(t) speakText(t);
}

function openThread(id){ currentContact=id; if(contacts[id]) contacts[id].unread=0; renderChatList(); renderThread(); saveChatThread(id); openSheet('thread'); resetIdleTimer(); }

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

/* ---- chat list (dynamic, with unread badges) ---- */
function lastMsgInfo(c){
  var m = (c.seed && c.seed.length) ? c.seed[c.seed.length-1] : null;
  var ts = (m && m.ts) ? m.ts : 0;
  var text='';
  if(m){
    if(m.kind==='text' || !m.kind) text = m.text||'';
    else if(m.kind==='photo') text='[图片]';
    else if(m.kind==='voice') text='[语音]';
    else if(m.kind==='sticker') text='[表情]';
    else if(m.kind==='pat') text=m.text||'';
    else if(m.kind==='card'){
      if(m.cardType==='transfer') text='[转账] ¥'+(m.amount||0)+'.00';
      else if(m.cardType==='family') text='[亲属卡]';
      else if(m.cardType==='gift') text='[礼物] '+(m.name||'');
      else if(m.cardType==='order') text='[外卖] '+(m.name||'');
      else if(m.cardType==='loc') text='[位置]';
      else if(m.cardType==='redpacket') text='[红包] ¥'+(m.amount||0).toFixed(2);
      else text='[卡片]';
    } else text='';
  }
  return {text:text, ts:ts};
}
function renderChatList(){
  var list = document.querySelector('#view-chats .chatlist');
  if(!list) return;
  var ids = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].blocked; });
  list.innerHTML = ids.map(function(k){
    var c=contacts[k]; var info=lastMsgInfo(c);
    var av = c.isGroup ? '<div class="chibi" style="--avbg:#9bb37a;width:100%;height:100%;"></div>' : contactAvatar(c);
    var badge = (c.unread>0) ? '<div class="badge">'+c.unread+'</div>' : '';
    var time = info.ts ? nowTimeFromTs(info.ts) : '';
    return '<div class="chat-row" onclick="openThread(\''+k+'\')"><div class="av glass-strong">'+av+badge+'</div><div class="mid"><div class="name">'+esc(c.displayName||c.name)+'</div><div class="prev">'+esc(info.text)+'</div></div><div class="time">'+time+'</div></div>';
  }).join('');
}
/* When an AI proactively messages a contact you're NOT viewing: bump unread + show top popup */
function notifyIncoming(contact, preview){
  if(!contact) return;
  var id = Object.keys(contacts).find(function(k){ return contacts[k]===contact; });
  if(!id) return;
  if(id===currentContact){ renderChatList(); return; }
  contact.unread = (contact.unread||0)+1;
  saveChatThread(id);
  renderChatList();
  showTopPopup(contact, preview);
}
function showTopPopup(contact, preview){
  var phone = document.querySelector('.phone') || document.body;
  var id = Object.keys(contacts).find(function(k){ return contacts[k]===contact; });
  if(!id) return;
  var av = contact.isGroup ? '<div class="chibi" style="--avbg:#9bb37a;width:85%;height:85%;"></div>' : contactAvatar(contact);
  var el = document.createElement('div');
  el.className='wx-top-popup';
  el.onclick=function(){ openThread(id); };
  el.innerHTML='<div class="av">'+av+'</div><div class="tp-body"><div class="tp-name">'+esc(contact.name)+'</div><div class="tp-prev">'+esc(preview||'')+'</div></div>';
  phone.appendChild(el);
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 320); }, 3500);
}
/* ---- bubble colors ---- */
function applyBubbleColors(){
  var r = document.documentElement;
  if(bubbleMineColor) r.style.setProperty('--bubble-mine', bubbleMineColor);
  if(bubbleTheirsColor) r.style.setProperty('--bubble-theirs', bubbleTheirsColor);
}
function setBubbleColor(which, val){
  if(which==='mine') bubbleMineColor=val; else bubbleTheirsColor=val;
  applyBubbleColors(); saveState();
}
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

/* ---- voice call ---- */
let callTimerInt=null, callSeconds=0;
function startCall(){
  document.getElementById('call-screen').classList.add('open');
  const c = contacts[currentContact];
  document.getElementById('call-name').textContent = c.name;
  document.getElementById('call-av').innerHTML = c.isGroup ? '<div class="chibi" style="--avbg:#9bb37a;"></div>' : contactAvatar(c);
  document.getElementById('call-status').textContent='正在连接语音…';
  const sp = document.getElementById('call-speak'); if(sp) sp.textContent='';
  callSeconds=0;
  document.getElementById('call-timer').textContent='00:00';
  setTimeout(()=>{ document.getElementById('call-status').textContent='通话中';
    if(sp) sp.textContent='（对方正在用语音说话…）';
    speakText('喂，是我。想我了吗？');
    callTimerInt = setInterval(()=>{
      callSeconds++;
      const m=Math.floor(callSeconds/60), s=callSeconds%60;
      document.getElementById('call-timer').textContent = (m+'').padStart(2,'0')+':'+(s+'').padStart(2,'0');
    },1000);
  }, 1400);
}
function endCall(){
  document.getElementById('call-screen').classList.remove('open');
  clearInterval(callTimerInt);
}

var personaDocText='';
var pendingPersonaAvatar = null;
function saveNewPersona(){
  var name=document.getElementById('np-name').value.trim()||'New Persona';
  var base=document.getElementById('np-desc').value.trim()||'warm and authentic';
  // 收集选中的语气标签
  var tones=[];
  document.querySelectorAll('#np-tones .persona-chip.on').forEach(function(c){ tones.push(c.textContent.trim()); });
  var toneStr = tones.length ? '【语气标签：'+tones.join('、')+'】' : '';
  var desc = base + (toneStr ? '\n'+toneStr : '') + (personaDocText ? '\n\n【导入的人设文档】\n'+personaDocText : '');
  var id='p'+(personaSeq++);
  var wbIds = Array.from(document.querySelectorAll('#np-worldbooks .wb-chk:checked')).map(function(c){ return c.value; });
  if(wbIds.length===0 && currentWorldBookId) wbIds=[currentWorldBookId];
  contacts[id]={name:name, displayName:'', tone:desc, persona:desc, userPrompt:userPrefs||'', jealous:false, pendingCount:0, idleTimer:null, avatarColor:randAvatarColor(), avatar:pendingPersonaAvatar||null, blocked:false, worldBooks:wbIds, memory:{enabled:true, threshold:20, summary:'', lastMsgCount:0}, seed:[{mine:false,kind:'text',text:'你好，我是'+name+'。',from:id,ts:nowStamp()},{mine:true,kind:'text',text:'你好呀～',from:'me',ts:nowStamp()}]};
  apiConfig.voiceIds[id]=''; apiConfig.memoryBooks[id]='New persona: '+name+'. '+desc;
  addChatRow(id,false); addContactRow(id,false); populateViewAs();
  document.getElementById('np-name').value=''; document.getElementById('np-desc').value='';
  personaDocText=''; var fn=document.getElementById('np-file-name'); if(fn) fn.textContent='';
  pendingPersonaAvatar=null;
  var box=document.querySelector('#sheet-addpersona .avatar-pick'); if(box) box.innerHTML='<div class="chibi" style="width:60%;height:60%;"><div class="ear l"></div><div class="ear r"></div><div class="face"></div><div class="eye l"></div><div class="eye r"></div></div><div class="ico-plus"></div></div>';
  // 重置语气标签：只保留"温柔"选中
  document.querySelectorAll('#np-tones .persona-chip').forEach(function(c,i){ c.classList.toggle('on', i===0); });
  closeSheet('addpersona');
  // 确保微信界面可见并跳转到联系人界面
  goToScreen('wechatapp');
  switchTab('contacts');
  saveState();
  saveChatThread(id);
  showToast('人设已创建', 1400);
}
function importPersonaDoc(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var fn = document.getElementById('np-file-name');
  var lower = file.name.toLowerCase();
  if(fn) fn.textContent = '读取中：'+file.name;
  if(lower.endsWith('.txt') || lower.endsWith('.text')){
    var r = new FileReader();
    r.onload = function(){ personaDocText = r.result; if(fn) fn.textContent='已导入：'+file.name+'（'+personaDocText.length+' 字）'; };
    r.onerror = function(){ if(fn) fn.textContent='读取失败，请重试'; };
    r.readAsText(file,'utf-8');
  } else if(lower.endsWith('.docx')){
    if(window.mammoth && window.mammoth.extractRawText){
      file.arrayBuffer().then(function(buf){
        return window.mammoth.extractRawText({arrayBuffer:buf});
      }).then(function(res){
        personaDocText = res.value || '';
        if(fn) fn.textContent='已导入：'+file.name+'（'+personaDocText.length+' 字）';
      }).catch(function(){ if(fn) fn.textContent='Word 解析失败，请改用 .txt'; });
    } else {
      if(fn) fn.textContent='需联网加载 Word 解析库，或改用 .txt 文件';
    }
  } else {
    if(fn) fn.textContent='仅支持 .txt / .docx 文件';
  }
}

function pickVis(el, showList){
  document.querySelectorAll('#sheet-compose .vis-opt').forEach(o=>o.classList.remove('picked'));
  el.classList.add('picked');
  document.getElementById('vis-personas').style.display = showList ? 'block' : 'none';
}
/* 双重切换已移除：静态与动态 chip 统一使用内联 onclick="toggleHidden(this)"，避免点一下被切换两次导致选不中 */

function postMoment(){
  const text = document.getElementById('mo-text').value.trim();
  if(!text) return;
  const visEl = document.querySelector('#sheet-compose .vis-opt.picked .t');
  const visLabel = visEl ? visEl.textContent : '公开';
  let vis = visLabel;
  if(visLabel.indexOf('不给')>-1 || composeHidden.length){
    const names = composeHidden.map(id=>contacts[id]?contacts[id].name:id);
    vis = names.length ? ('不给 '+names.join('、')+' 看') : '部分可见';
  }
  moments.unshift({ id: Date.now(), authorId:'me', text, vis, hidden: composeHidden.slice(), ts: nowStamp(), place:'', likes:0, liked:false, comments:[], img:null });
  document.getElementById('mo-text').value='';
  composeHidden = [];
  closeSheet('compose');
  renderMoments(); refreshAllMomentsViews(); saveState();
}

function toggleHidden(chip){
  chip.classList.toggle('on');
  const id = chip.getAttribute('data-id');
  const i = composeHidden.indexOf(id);
  if(i>-1) composeHidden.splice(i,1); else composeHidden.push(id);
}

function populateViewAs(){
  const sel = document.getElementById('viewas-select');
  if(!sel) return;
  let html = '<option value="me">我（'+esc(userName)+'）</option>';
  Object.keys(contacts).forEach(k=>{ if(!contacts[k].isGroup && k!=='me') html += '<option value="'+k+'">'+esc(contacts[k].name)+'</option>'; });
  sel.innerHTML = html;
  sel.value = viewAs;
}

function initApp(){
  /* 记忆模式：不再清空旧存档，保留用户所有数据 */
  loadState();
  initWidgetBgMode(); /* 确保插件背景效果立即生效（即使无存档也用默认磨砂）*/
  if(!moments.length){
    moments = [
      { id:1, authorId:'tester1', text:'这是上线前的测试环境，欢迎体验各类功能～', vis:'公开', hidden:[], ts: nowStamp()-1000*60*60*2, place:'', likes:12, liked:false, comments:[] },
      { id:2, authorId:'me', text:'我是 user，正在做最后的上线检查。', vis:'公开', hidden:[], ts: nowStamp()-1000*60*60*24, place:'', likes:3, liked:false, comments:[] }
    ];
  }
  Object.keys(contacts).forEach(k=>{
    if((k[0]==='p'||k[0]==='g') && !document.querySelector('#contact-items [onclick*="'+k+'"]')){
      if(contacts[k].isGroup) addContactRow(k,true); else addContactRow(k,false);
    }
  });
  applyUserName(); applyUserPrefs(); updateUserAvatarEl();
  applyMomentsBg(); renderMoments(); populateViewAs();
  dailyGenContactMoments(); /* 每日零点自动生成联系人朋友圈 */
  renderWallet();
  if(chatBg){ applyChatBgToDOM(chatBg); }
  renderThread();
  /* seed default widgets (after state loaded, so custom image/text persist) — 跳过用户已移除的 */
  ['glasstext','breathe','viz','countdown'].forEach(function(t){ if(removedPlugins.indexOf(t)<0) addPlugin(t); });
  renderChatList();
  applyBubbleColors();
  var _bm=document.getElementById('bub-mine'); if(_bm) _bm.value=bubbleMineColor||'#1a1a1a';
  var _bt=document.getElementById('bub-theirs'); if(_bt) _bt.value=bubbleTheirsColor||'#ffffff';
  /* 记忆模式：从 IndexedDB 加载聊天记录和表情包 */
  fatedDBLoadStickers(function(ok){
    if(ok){ renderStickerLib(); }
    fatedDBLoadAllChats(function(ok2){
      if(ok2){
        renderThread();
        renderChatList();
      }
      /* 从 IndexedDB 加载大数据（widgetCustom/appIconImgs/lockWp/homeWp），避免 localStorage 溢出丢失 */
      fatedDBLoadKV('widgetCustom', function(wc){
        if(wc && typeof wc==='object') widgetCustom=wc;
        fatedDBLoadKV('appIconImgs', function(icons){
          if(Array.isArray(icons)){ icons.forEach(function(o){ var a=appIcons.find(function(x){return x.id===o.id;}); if(a) a.img=o.img; }); renderDesktopIcons(); renderIconGrid(); }
          fatedDBLoadKV('lockWp', function(lwp){
            if(lwp && typeof lwp==='object'){ lockWp=lwp; paintWallpaper(document.getElementById('lock-wallpaper'), lockWp); }
            fatedDBLoadKV('homeWp', function(hwp){
              if(hwp && typeof hwp==='object'){ homeWp=hwp; paintWallpaper(document.getElementById('home-wallpaper'), homeWp); }
            });
          });
        });
      });
    });
  });
  /* 记忆模式：每 30 秒自动保存所有聊天记录（安全网）*/
  setInterval(function(){ fatedDBSaveAllChats(); }, 30000);
  /* 页面关闭前保存 */
  window.addEventListener('beforeunload', function(){ saveState(); });
  /* 页面隐藏时保存（手机切后台）*/
  document.addEventListener('visibilitychange', function(){ if(document.hidden){ saveState(); } });
}

