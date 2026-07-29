/* ---- Game Live ---- */
function goRenderGame(){
  var games = [
    {name:'王者荣耀', color:'#1e3a5f', ico:'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L4 6v6c0 4 3 7 8 10 5-3 8-6 8-10V6l-8-4z"/></svg>'},
    {name:'第五人格', color:'#5f1e3a', ico:'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 10l2 2 4-4M8 16h8"/></svg>'},
    {name:'光遇', color:'#3a5f1e', ico:'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>'}
  ];
  var gHtml = games.map(function(g){
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'+
      '<div class="go-game-icon" style="background:'+g.color+';" onclick="goToast(\'去'+g.name+'打游戏吧，打完上传战绩截图\')">'+g.ico+'</div>'+
      '<div style="font-size:12px;font-weight:600;color:#1a1a1a;">'+g.name+'</div></div>';
  }).join('');
  return '<div class="go-card">'+
    '<div class="go-label">游戏直播</div>'+
    '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">选择游戏开始游玩，结束后上传战绩截图。AI将自动判定胜负，胜利奖励1000。</div>'+
    '<div class="go-game-launch">'+gHtml+'</div></div>'+
    '<div class="go-card"><div class="go-label">上传战绩截图</div>'+
    '<div id="go-game-upload" style="border:1.5px dashed rgba(0,0,0,0.15);border-radius:12px;padding:24px;text-align:center;cursor:pointer;" onclick="goUploadGameScreenshot()">'+
    '<div style="font-size:14px;color:#888;">点击上传战绩截图</div></div></div>';
}
function goUploadGameScreenshot(){ goFileContext='game'; document.getElementById('go-file-input').click(); }
function goAICheckGameResult(img){
  goToast('AI正在分析战绩...');
  var upload = document.getElementById('go-game-upload');
  if(upload){
    upload.innerHTML = '<div style="font-size:14px;color:#555;">AI分析中...</div>';
    upload.style.cursor = 'default';
  }
  goCallAIVision(
    '请分析这张游戏截图，判断是胜利还是失败。只回答"胜利"或"失败"。',
    img,
    function(text){
      if(!text){
        var win = Math.random()>0.4;
        goToast(win?'AI判定: 胜利! 奖励1000':'AI判定: 失败，再接再厉');
        if(win) goEndLive(true,1000);
        else if(upload) upload.innerHTML = '<div style="font-size:14px;color:#888;">AI判定失败，重新上传</div>';
        return;
      }
      var win = text.indexOf('胜')>=0||text.indexOf('赢')>=0||text.toLowerCase().indexOf('win')>=0||text.indexOf('victor')>=0;
      goToast(win?'AI判定: 胜利! 奖励1000':'AI判定: 失败，再接再厉');
      if(win) goEndLive(true,1000);
      else if(upload){ upload.style.cursor='pointer'; upload.innerHTML='<div style="font-size:14px;color:#888;">AI判定失败，点击重新上传</div>'; }
    }
  );
}

/* ---- Couple Q&A Live ---- */
function goNormalizeQuestion(q){
  return String(q||'').replace(/^\s*\d+[.\u3001)\uff09-]?\s*/, '').replace(/[\uFF1F?\u3002\uFF01!\s]+$/g, '').trim();
}
function goQuestionKey(q){ return goNormalizeQuestion(q).replace(/\s+/g,'').toLowerCase(); }
function goWechatContactKeys(){
  if(typeof contacts === 'undefined') return [];
  return Object.keys(contacts).filter(function(k){
    var c = contacts[k];
    return k !== 'me' && c && !c.blocked && !c.isGroup;
  });
}
function goLocalQuestionPool(){
  return [
    '如果今天只能保留一个关于我们的记忆，你会选哪一个？',
    '你觉得我们最像情侣的瞬间是什么？',
    '如果把我写进你的世界观，我会是什么身份？',
    '你最希望我以后改掉的一个小习惯是什么？',
    '你觉得我们吵架后最需要先做什么？',
    '如果给我们的关系设置一个安全词，会是什么？',
    '你最近一次被我打动是什么时候？',
    '你觉得我最需要被偏爱的地方是什么？',
    '如果我们一起搬家，第一件要买的东西是什么？',
    '你觉得我们最互补的地方在哪里？',
    '如果未来一年只能完成一个共同计划，你想选什么？',
    '你希望我怎么哄你才最有效？',
    '你觉得我什么时候最有魅力？',
    '如果今天互换身份，你最想体验我的哪部分生活？',
    '你觉得我们之间最不能丢掉的默契是什么？',
    '如果我们的聊天记录变成一本书，标题叫什么？',
    '你最想和我一起重复一百次的日常是什么？',
    '你觉得我对你的了解有几分？为什么？',
    '如果我们要定一个只属于彼此的节日，会是哪天？',
    '此刻你最想让我知道的一件小事是什么？',
    '你觉得爱里最需要被认真回答的问题是什么？',
    '如果给我们的关系做一次升级，你会升级什么功能？'
  ];
}
function goBuildUniqueQuestions(text, need){
  var used = Array.isArray(goState.qaUsedQuestions) ? goState.qaUsedQuestions : [];
  var seen = {};
  used.forEach(function(q){ seen[goQuestionKey(q)] = true; });
  var raw = String(text||'').split(/\n+/).map(goNormalizeQuestion).filter(function(q){ return q.length > 4; });
  var out = [];
  raw.concat(goLocalQuestionPool().sort(function(){ return Math.random()-0.5; })).forEach(function(q){
    var key = goQuestionKey(q);
    if(!key || seen[key]) return;
    seen[key] = true;
    out.push(/[\uFF1F?]$/.test(q) ? q : q + '？');
  });
  if(out.length < need){
    goState.qaUsedQuestions = [];
    seen = {};
    goLocalQuestionPool().sort(function(){ return Math.random()-0.5; }).forEach(function(q){
      var key = goQuestionKey(q);
      if(!seen[key]){ seen[key] = true; out.push(q); }
    });
  }
  return out.slice(0, need);
}
function goContactPersonaText(id){
  var c = contacts && contacts[id] ? contacts[id] : null;
  if(!c) return '';
  return [c.name, c.wxid ? 'WeChat ID: '+c.wxid : '', c.bio || '', c.persona || c.tone || '', c.userPrompt || '', c.memory && c.memory.summary ? '记忆: '+c.memory.summary : ''].filter(Boolean).join('\n');
}
function goRenderCouple(){
  var s = goState;
  var pName = s.qaPartner && contacts[s.qaPartner] ? contacts[s.qaPartner].name : '';
  if(!s.qaPartner){
    return '<div class="go-card"><div class="go-label">情侣Q&A</div>'+ 
      '<div style="font-size:13px;color:#45685a;line-height:1.5;margin-bottom:12px;">选择一位 WeChat 联系人连麦。问题由设置里的 API 生成，并避开历史题目与本轮重复。</div>'+ 
      '<button class="go-btn primary" onclick="goOpenPartnerModal()">选择连麦对象</button></div>';
  }
  if(s.qaQuestions.length===0){
    return '<div class="go-card"><div class="go-label">情侣Q&A - 连麦: '+esc(pName)+'</div><div style="text-align:center;padding:20px;font-size:14px;color:#78a392;">AI 正在生成不重复问题...</div></div>';
  }
  if(s.qaCurrent>=s.qaQuestions.length){
    return '<div class="go-card" style="text-align:center;padding:24px;">'+
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px;color:#17392d;">答题完成</div>'+
      '<div style="font-size:14px;color:#78a392;margin-bottom:16px;">你们完成了 '+s.qaQuestions.length+' 道不重复问题</div>'+
      '<button class="go-btn primary" onclick="goEndLive(true,1000)">领取工资 ¥1000</button></div>';
  }
  var q = s.qaQuestions[s.qaCurrent];
  var prog = (s.qaCurrent/s.qaQuestions.length)*100;
  return '<div class="go-card">'+
    '<div class="go-label">Q'+(s.qaCurrent+1)+'/'+s.qaQuestions.length+' ? WeChat 连麦: '+esc(pName)+'</div>'+
    '<div class="go-progress"><div class="go-progress-bar" style="width:'+prog+'%"></div></div>'+
    '<div class="go-qa-card" style="margin-top:12px;"><div class="go-qa-q">'+esc(q)+'</div>'+ 
    '<input class="go-qa-input" id="go-qa-answer" placeholder="输入你的回答" onkeydown="if(event.key===\'Enter\')goAnswerQA()"></div>'+ 
    '<div id="go-qa-partner" style="margin-top:10px;"></div>'+ 
    '<button class="go-btn primary" style="margin-top:10px;" onclick="goAnswerQA()">提交回答</button></div>';
}
function goOpenPartnerModal(){
  var list = document.getElementById('go-partner-list');
  var cs = goWechatContactKeys();
  if(cs.length===0){ list.innerHTML = '<div style="text-align:center;color:#78a392;padding:12px;">暂无可用 WeChat 联系人</div>'; }
  else {
    list.innerHTML = cs.map(function(k){
      var c = contacts[k];
      var avSt = c.avatar ? 'background-image:url('+c.avatar+');background-size:cover;background-position:center;' : 'background:'+(c.avatarColor||'#9bd9bf');
      return '<div class="go-buyer-row go-partner-row" style="cursor:pointer;" onclick="goSelectPartner(\''+k+'\')"><div class="av" style="'+avSt+'"></div><div style="flex:1;"><div style="font-size:14px;font-weight:700;color:#17392d;">'+esc(c.name||'联系人')+'</div><div style="font-size:11px;color:#78a392;margin-top:2px;">'+esc(c.wxid||k)+' ? WeChat 同步</div></div><div class="go-link-dot"></div></div>';
    }).join('');
  }
  goOpenModal('go-modal-partner');
}
function goSelectPartner(id){
  goState.qaPartner = id;
  goCloseModal('go-modal-partner');
  goToast('已选择 '+contacts[id].name+' 连麦');
  goGenerateQA();
}
function goGenerateQA(){
  var s = goState;
  var avoid = (Array.isArray(s.qaUsedQuestions) ? s.qaUsedQuestions.slice(-80) : []).join('；');
  goCallAI(
    '请生成20个情侣Q&A问题，每行一个。要求：有恋爱张力、有生活细节、有未来规划；不要编号；不要重复这些历史题目：'+avoid+'。本轮ID：'+(s.qaRoundSeed||Date.now())+'。',
    '你是情侣互动游戏AI，必须保证每道题彼此不同，并且尽量避开历史题目。',
    function(text){
      s.qaQuestions = goBuildUniqueQuestions(text, 20);
      s.qaUsedQuestions = (Array.isArray(s.qaUsedQuestions) ? s.qaUsedQuestions : []).concat(s.qaQuestions).slice(-220);
      goRenderLive();
      saveState();
    }
  );
  goRenderLive();
}
function goAnswerQA(){
  var s = goState;
  var inp = document.getElementById('go-qa-answer');
  if(!inp) return;
  var text = inp.value.trim();
  if(!text){ goToast('请输入回答'); return; }
  var pDiv = document.getElementById('go-qa-partner');
  if(pDiv) pDiv.innerHTML = '<div class="go-qa-card"><div class="go-label">你的回答</div><div class="go-qa-a">'+esc(text)+'</div></div>';
  var pName = contacts[s.qaPartner] ? contacts[s.qaPartner].name : '对方';
  var q = s.qaQuestions[s.qaCurrent];
  var btn = document.querySelector('#go-live-content .go-btn.primary');
  if(btn){ btn.style.display='none'; }
  goCallAI(
    '你现在是'+pName+'，正在和伴侣做情侣Q&A。问题是: "'+q+'"。对方的回答是: "'+text+'"。\n联系人资料：\n'+goContactPersonaText(s.qaPartner)+'\n请以'+pName+'的身份回答这个问题，回答要自然、有个性、不超过50字。',
    '你是 WeChat 联系人连麦角色，请严格代入联系人资料和历史记忆回答。',
    function(result){
      if(!result) result = '我还在想，但这个问题真的很像我们会聊的事。';
      if(pDiv) pDiv.innerHTML += '<div class="go-qa-card" style="margin-top:8px;"><div class="go-label">'+esc(pName)+'的回答</div><div class="go-qa-a">'+esc(result)+'</div></div>'+ 
        '<button class="go-btn primary" style="margin-top:8px;" onclick="goNextQA()">下一题</button>';
    }
  );
}
function goNextQA(){
  goState.qaCurrent++;
  goRenderLive();
  saveState();
}

/* ---- ASMR / Voice Hall / Beauty Live ---- */
function goRenderVoice(type){
  var s = goState;
  var tn = {asmr:'ASMR', voice:'语音厅', beauty:'美妆'};
  var desc = {
    asmr:'点击按钮开始你的ASMR表演，AI会作为听众与你互动。完成3次语音互动即可获得奖励。',
    voice:'点击按钮开始唱歌或语音聊天，AI会作为听众与你互动。完成3次语音互动即可获得奖励。',
    beauty:'点击按钮开始你的美妆教程讲解，AI会作为听众与你互动。完成3次语音互动即可获得奖励。'
  };
  var prog = s.asmrProgress;
  var need = 3;
  return '<div class="go-card">'+
    '<div class="go-label">'+tn[type]+'直播</div>'+
    '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">'+desc[type]+'</div>'+
    '<div class="go-progress"><div class="go-progress-bar" style="width:'+(prog/need*100)+'%"></div></div>'+
    '<div style="text-align:center;font-size:12px;color:#888;margin-top:6px;">'+prog+'/'+need+' 次语音互动</div>'+
    '<div style="text-align:center;margin-top:16px;">'+
    '<button class="go-btn primary" id="go-voice-btn" onclick="goVoiceInput(\''+type+'\')">'+(prog>=need?'已完成':'开始语音')+'</button></div>'+
    '<div id="go-voice-feedback" style="margin-top:12px;"></div></div>';
}
function goCompleteVoiceSession(text){
  var s = goState;
  var tn = {asmr:'ASMR', voice:'语音厅', beauty:'美妆'};
  var pm = {
    asmr:'一个ASMR主播正在表演，内容是: "'+text+'"。请以听众身份给出自然反应，不超过30字。',
    voice:'一个语音厅主播正在唱歌/说话，内容是: "'+text+'"。请以听众身份给出自然反应，不超过30字。',
    beauty:'一个美妆主播正在讲解，内容是: "'+text+'"。请以听众身份给出自然反应，不超过30字。'
  };
  goToast('AI正在倾听...');
  goCallAI(pm[s.liveType]||pm.voice, '你是一个直播听众。',
    function(result){
      if(!result) result = '主播好棒啊！';
      s.asmrProgress++;
      var fb = document.getElementById('go-voice-feedback');
      if(fb) fb.innerHTML = '<div class="go-qa-card"><div class="go-qa-a">'+result+'</div></div>';
      goToast('互动 '+s.asmrProgress+'/3');
      if(s.asmrProgress>=3){
        setTimeout(function(){ goEndLive(true,1000); }, 1500);
      } else {
        goRenderLive();
      }
      saveState();
    }
  );
}
