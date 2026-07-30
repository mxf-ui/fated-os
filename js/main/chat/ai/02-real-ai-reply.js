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
        if(typeof imageGenMaybeAttachChatIllustration==='function') imageGenMaybeAttachChatIllustration(contact, chatTarget, chatId, id, reply);
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

