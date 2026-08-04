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
function deleteContact(id){var nm = contacts[id] ? contacts[id].name : id;
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
  if(currentContact===id){
    currentContact='';
    closeSheet('thread');
    if(typeof renderEmptyThread==='function') renderEmptyThread();
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
function speakWithTTS(text, voiceId, opts){
  opts = opts || {};
  var p=apiConfig.ttsProvider, t=apiConfig.tts;
  function fallback(err){
    if(opts.noFallback) return Promise.reject(err || new Error('TTS request failed'));
    try{ if('speechSynthesis' in window){ var u=new SpeechSynthesisUtterance(text); u.lang='zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u);} }catch(e){}
    return Promise.resolve(false);
  }
  function ensureOk(r){ if(!r || !r.ok) throw new Error('HTTP '+(r ? r.status : 0)); return r; }
  try{
    if(p==='elevenlabs'){
      var vid=voiceId||'21m00Tcm4TlvDq8ikWAM';
      return fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(vid), {method:'POST', headers:{'Content-Type':'application/json','xi-api-key':t.elevenlabs.key}, body:JSON.stringify({text:text, model_id:t.elevenlabs.model||'eleven_multilingual_v2'})})
        .then(ensureOk).then(function(r){ return r.blob(); }).then(function(b){ playAudioBlob(b); return true; }).catch(fallback);
    } else if(p==='minimax'){
      var url='https://api.minimax.chat/v1/t2a_v2?GroupId='+encodeURIComponent(t.minimax.groupId);
      return fetch(url, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+t.minimax.key}, body:JSON.stringify({model:t.minimax.model||'speech-01', text:text, voice_setting:{voice_id:(voiceId||'female-qn-qingse'), speed:1, vol:1, pitch:0}})})
        .then(ensureOk).then(function(r){return r.json();}).then(function(d){ var b64=d&&d.data&&d.data.audio; if(!b64) throw new Error((d && d.msg) || 'No audio returned'); var bin=atob(b64); var arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); playAudioBlob(new Blob([arr],{type:'audio/mp3'})); return true; }).catch(fallback);
    } else if(p==='custom'){
      return fetch(t.custom.endpoint, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+t.custom.key}, body:JSON.stringify({text:text, voice:(t.custom.voice||voiceId||''), model:''})})
        .then(ensureOk).then(function(r){ var ct=r.headers.get('content-type')||''; if(ct.indexOf('audio')>-1){ return r.blob().then(function(b){ playAudioBlob(b); return true; }); } return r.json().then(function(d){ var b64=d&&(d.audio||(d.data&&d.data.audio)||d.data); if(!b64) throw new Error((d && d.error) || 'No audio returned'); if(typeof b64==='string'&&b64.indexOf(',')>-1) b64=b64.split(',')[1]; var bin=atob(b64); var arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); playAudioBlob(new Blob([arr],{type:'audio/mpeg'})); return true; }); }).catch(fallback);
    }
    return fallback(new Error('No TTS provider selected'));
  }catch(e){ return fallback(e); }
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
  if(m){ if(typeof m.temperature!=='number') m.temperature=0.7; if(typeof m.stream!=='boolean') m.stream=false; }
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
    if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:1024,temperature:m.temperature}); }
    else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; var sys=msgs.filter(function(x){return x.role==='system';}).map(function(x){return x.content;}).join('\n\n'); bd=JSON.stringify({model:m.model,system:sys,messages:msgs.filter(function(x){return x.role!=='system';}),max_tokens:1024,temperature:m.temperature}); }
    else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:msgs.map(function(x){return {role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]};}),generationConfig:{maxOutputTokens:1024,temperature:m.temperature}}); }
    else if(model==='custom'){
      var cf=m.apiFormat||'openai';
      if(cf==='claude'){
        url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'};
        var sys=msgs.filter(function(x){return x.role==='system';}).map(function(x){return x.content;}).join('\n\n');
        bd=JSON.stringify({model:m.model,system:sys,messages:msgs.filter(function(x){return x.role!=='system';}),max_tokens:1024,temperature:m.temperature});
      } else if(cf==='gemini'){
        url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'};
        bd=JSON.stringify({contents:msgs.map(function(x){return {role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]};}),generationConfig:{maxOutputTokens:1024,temperature:m.temperature}});
      } else {
        url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:1024,temperature:m.temperature});
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
    if(!m||!m.key||!m.endpoint||m.stream===true){ cb(null); return; }
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
    var proxyBody = JSON.stringify({messages:msgs, model:(m?m.model:'deepseek-chat'), provider:model, key:(m?m.key:''), endpoint:ep, dataModel:(m?m.model:'deepseek-chat'), apiFormat:(m?(m.apiFormat||'openai'):'openai'), max_tokens:1024,temperature:(m?m.temperature:0.7),stream:(m?m.stream:false)});
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

