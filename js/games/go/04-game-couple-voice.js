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
function goRenderCouple(){
  var s = goState;
  var pName = s.qaPartner && contacts[s.qaPartner] ? contacts[s.qaPartner].name : '';
  if(!s.qaPartner){
    return '<div class="go-card"><div class="go-label">情侣Q&A</div>'+
      '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">选择一位WeChat联系人连麦，一起回答AI生成的20个问题</div>'+
      '<button class="go-btn primary" onclick="goOpenPartnerModal()">选择连麦对象</button></div>';
  }
  if(s.qaQuestions.length===0){
    return '<div class="go-card"><div class="go-label">情侣Q&A - 连麦: '+pName+'</div><div style="text-align:center;padding:20px;font-size:14px;color:#888;">正在生成问题...</div></div>';
  }
  if(s.qaCurrent>=s.qaQuestions.length){
    return '<div class="go-card" style="text-align:center;padding:24px;">'+
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px;color:#1a1a1a;">答题完成</div>'+
      '<div style="font-size:14px;color:#888;margin-bottom:16px;">你们完成了'+s.qaQuestions.length+'道问题</div>'+
      '<button class="go-btn primary" onclick="goEndLive(true,1000)">领取奖励 ¥1000</button></div>';
  }
  var q = s.qaQuestions[s.qaCurrent];
  var prog = (s.qaCurrent/s.qaQuestions.length)*100;
  return '<div class="go-card">'+
    '<div class="go-label">Q'+(s.qaCurrent+1)+'/'+s.qaQuestions.length+' 连麦: '+pName+'</div>'+
    '<div class="go-progress"><div class="go-progress-bar" style="width:'+prog+'%"></div></div>'+
    '<div class="go-qa-card" style="margin-top:12px;"><div class="go-qa-q">'+q+'</div>'+
    '<input class="go-qa-input" id="go-qa-answer" placeholder="输入你的回答" onkeydown="if(event.key===\'Enter\')goAnswerQA()"></div>'+
    '<div id="go-qa-partner" style="margin-top:10px;"></div>'+
    '<button class="go-btn primary" style="margin-top:10px;" onclick="goAnswerQA()">提交回答</button></div>';
}
function goOpenPartnerModal(){
  var list = document.getElementById('go-partner-list');
  var cs = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].blocked && !contacts[k].isGroup; });
  if(cs.length===0){ list.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">暂无可用联系人</div>'; }
  else {
    list.innerHTML = cs.map(function(k){
      var c = contacts[k];
      var avSt = c.avatar ? 'background-image:url('+c.avatar+');background-size:cover;background-position:center;' : 'background:'+(c.avatarColor||'#999');
      return '<div class="go-buyer-row" style="cursor:pointer;" onclick="goSelectPartner(\''+k+'\')"><div class="av" style="'+avSt+'"></div><div style="flex:1;font-size:14px;font-weight:600;color:#1a1a1a;">'+c.name+'</div></div>';
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
  var pName = contacts[s.qaPartner] ? contacts[s.qaPartner].name : '对方';
  goCallAI(
    '请生成20个情侣Q&A问题，每行一个，问题要有趣、有深度，涵盖恋爱、生活、未来等方面。只输出问题，不要编号。',
    '你是一个情侣互动游戏AI。',
    function(text){
      if(!text){
        s.qaQuestions = ['如果用一道菜形容我们的关系，你觉得是什么？','你第一次见到我时心里在想什么？','如果我们可以穿越时空，你想回到哪一天？','你觉得我最大的优点是什么？','你最想和我一起去哪里旅行？','如果世界末日只能带一样东西，你带什么？','你觉得我们的默契度有多高？','最想对我说但一直没说出口的话是什么？','如果用一首歌形容我们，是哪首？','你觉得我什么时候最好看？','如果我们变成对方一天，你最想做什么？','你最珍惜和我的一张合照是哪张？','如果给我打分，你打几分？','你觉得我们最大的共同点是什么？','最想和我一起完成的事情是什么？','你觉得恋爱中最重要的品质是什么？','如果我们的故事写成书，书名叫什么？','你最怕我做什么？','你觉得我们会在一起多久？','此刻最想对我说什么？'];
      } else {
        s.qaQuestions = text.split('\n').map(function(l){ return l.replace(/^\d+[.、]\s*/,'').trim(); }).filter(function(l){ return l.length>0; }).slice(0,20);
        if(s.qaQuestions.length<5){
          s.qaQuestions = ['你觉得我怎么样？','最想和我做什么？','你觉得我们有默契吗？','最想对我说什么？','如果重来一次还会选择我吗？','你觉得我最大的魅力是什么？','最想和我去哪里？','你觉得我们之间最难忘的事是什么？'];
        }
      }
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
  if(pDiv) pDiv.innerHTML = '<div class="go-qa-card"><div class="go-label">你的回答</div><div class="go-qa-a">'+text+'</div></div>';
  var pName = contacts[s.qaPartner] ? contacts[s.qaPartner].name : '对方';
  var q = s.qaQuestions[s.qaCurrent];
  var btn = document.querySelector('#go-live-content .go-btn.primary');
  if(btn){ btn.style.display='none'; }
  goCallAI(
    '你现在是'+pName+'，正在和伴侣做情侣Q&A。问题是: "'+q+'"。对方的回答是: "'+text+'"。\n请以'+pName+'的身份回答这个问题，回答要自然、有个性、不超过50字。',
    '你是一个角色扮演AI，请代入角色回答。',
    function(result){
      if(!result) result = '我觉得这个问题很好，我的想法是...';
      if(pDiv) pDiv.innerHTML += '<div class="go-qa-card" style="margin-top:8px;"><div class="go-label">'+pName+'的回答</div><div class="go-qa-a">'+result+'</div></div>'+
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
