/* ============ GAME SPACE (游戏空间) ============ */
var gameState = { contact:'', voiceActive:false, voiceTimer:null, ttsKey:'', ttsVoice:'', chatLog:[], currentGame:'' };

function initGame(){
  gameLoadTTS();
  gameRenderVWave();
  updateGamePerms();
}

function gameReqNotif(){
  if(!('Notification' in window)){ alert('你的浏览器不支持通知功能'); return; }
  Notification.requestPermission().then(function(p){
    updateGamePerms();
    if(p==='granted') gameAddChat('system','✅ 通知权限已开启');
  });
}

function gameReqOverlay(){
  showToast('浮窗权限已模拟开启，通话可在后台进行', 1500);
  document.getElementById('perm-overlay').classList.add('granted');
  gameAddChat('system','✅ 浮窗权限已开启，通话可后台运行');
}

function updateGamePerms(){
  if('Notification' in window && Notification.permission==='granted'){
    document.getElementById('perm-notif').classList.add('granted');
  }
}

function gamePickContact(){
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup; });
  if(ids.length===0){ showToast('没有可选的联系人', 1500); return; }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:flex-end;justify-content:center;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:420px;padding:16px 16px calc(env(safe-area-inset-bottom) + 20px);max-height:70vh;overflow-y:auto;';
  var html = '<div style="font-size:15px;font-weight:800;margin-bottom:12px;text-align:center;color:#fff;">选择开黑队友</div>';
  ids.forEach(function(k){
    var c = contacts[k];
    var sel = gameState.contact===k;
    html += '<div onclick="gameSetContact(\''+k+'\')" style="cursor:pointer;padding:10px;border-radius:12px;display:flex;align-items:center;gap:10px;'+(sel?'background:rgba(74,222,128,0.15);':'background:rgba(255,255,255,0.05);')+'margin-bottom:6px;">'+
      '<div class="av glass-strong" style="overflow:hidden;width:40px;height:40px;border-radius:14px;flex:none;">'+contactAvatar(c)+'</div>'+
      '<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#fff;">'+esc(c.name)+'</div><div style="font-size:10px;opacity:.5;color:#fff;">'+(sel?'已选择':'点击选择')+'</div></div>'+
      (sel?'<span style="color:#4ade80;font-weight:800;">✓</span>':'')+
      '</div>';
  });
  html += '<div class="buy-btn" style="margin-top:12px;background:rgba(255,255,255,0.1);text-align:center;color:#fff;" onclick="this.parentElement.parentElement.remove()">关闭</div>';
  sheet.innerHTML = html;
  overlay.appendChild(sheet);
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
function gameSetContact(k){
  if(!contacts[k]) return;
  gameState.contact = k;
  var c = contacts[k];
  document.getElementById('game-contact-name').textContent = c.name;
  document.getElementById('game-contact-av').innerHTML = contactAvatar(c);
  document.getElementById('game-contact-av').style.background = 'transparent';
  gameAddChat('system','👥 '+c.name+' 加入队伍！准备开黑！');
  var overlay = document.querySelector('div[style*="z-index:300"]');
  if(overlay) overlay.remove();
}

var gameSchemes = {
  wzry:{scheme:'tencent://',web:'https://pvp.qq.com/',pkg:'com.tencent.tmgp.sgame'},
  hpjy:{scheme:'pubgmhd://',web:'https://gp.qq.com/',pkg:'com.tencent.tmgp.pubgmhd'},
  ys:{scheme:'yuanshen://',web:'https://ys.mihoyo.com/',pkg:'com.miHoYo.Yuanshen'},
  jcc:{scheme:'jcc://',web:'https://jcc.qq.com/',pkg:'com.tencent.jkchess'},
  dwrg:{scheme:'dwrg://',web:'https://id5.163.com/',pkg:'com.netease.id5'},
  gy:{scheme:'sky://',web:'https://sky.thatgamecompany.com/',pkg:'com.tgc.sky'},
  tss:{scheme:'tcsdzz://',web:'https://tcsdzz.com/',pkg:'com.wepie.snakebattle'}
};

function gameLaunch(name,id){
  if(!gameState.contact){ showToast('请先选择队友！', 1500); return; }
  gameState.currentGame = name;
  var c = contacts[gameState.contact];
  var info = gameSchemes[id];
  gameAddChat('system','🎮 正在启动《'+name+'》…');
  gameAddChat('ai',c.name+'：来了！这把看我的。');

  // Try to open the app via URL scheme
  if(info){
    var startTime = Date.now();
    // Try deep link
    if(info.scheme){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = info.scheme;
      document.body.appendChild(iframe);
      setTimeout(function(){ document.body.removeChild(iframe); },2000);
    }
    // After 2.5s, check if app opened. If not, offer web fallback
    setTimeout(function(){
      if(Date.now() - startTime < 3000){
        // App likely not installed, open official site directly (avoid popup-blocker issues on mobile)
        gameAddChat('system','⚠ 未检测到《'+name+'》已安装，正在打开官网…');
        if(info.web) window.open(info.web,'_blank');
      } else {
        gameAddChat('system','✅ 已跳转到《'+name+'》');
      }
    },2500);
  }

  setTimeout(function(){
    gameAddChat('ai',c.name+'：准备就绪，开始吧！');
    if('Notification' in window && Notification.permission==='granted'){
      new Notification('🎮 游戏空间',{body:'《'+name+'》已启动，'+c.name+' 已就位！'});
    }
  },800);
  gameRenderVWave();
}

function gameToggleVoice(){
  if(gameState.voiceActive){
    gameState.voiceActive = false;
    clearInterval(gameState.voiceTimer);
    document.getElementById('game-voice-panel').style.display = 'none';
    document.getElementById('game-float-bar').classList.remove('show');
    try{ speechSynthesis.cancel(); }catch(e){}
    gameAddChat('system','🔇 语音通话已结束');
  } else {
    if(!gameState.contact){ showToast('请先选择队友！', 1500); return; }
    gameState.voiceActive = true;
    var c = contacts[gameState.contact];
    document.getElementById('game-voice-panel').style.display = 'block';
    document.getElementById('game-v-contact-name').textContent = c.name;
    document.getElementById('game-v-status').textContent = '已连接 · 延迟 32ms';
    // 更新浮动条
    document.getElementById('game-float-name').textContent = c.name + ' · 通话中';
    document.getElementById('game-float-av').innerHTML = contactAvatar(c);
    gameRenderVWave();
    gameRenderFloatWave();
    gameStartVoiceSim();
    gameAddChat('system','🎙 语音通话已连接');
    // AI先说一句
    setTimeout(function(){ gameAISpeak(); }, 1500);
  }
}

function gameMinimizeVoice(){
  document.getElementById('game-voice-panel').style.display = 'none';
  document.getElementById('game-float-bar').classList.add('show');
  gameRenderFloatWave();
}
function gameRestoreVoice(){
  document.getElementById('game-float-bar').classList.remove('show');
  document.getElementById('game-voice-panel').style.display = 'block';
}

function gameStartVoiceSim(){
  clearInterval(gameState.voiceTimer);
  // 每8-12秒AI说一句话
  gameState.voiceTimer = setInterval(function(){
    if(!gameState.voiceActive) return;
    if(gameState.contact && contacts[gameState.contact]){
      gameAISpeak();
    }
  }, 8000 + Math.random()*4000);
}

function gameAISpeak(){
  if(!gameState.voiceActive || !gameState.contact) return;
  var c = contacts[gameState.contact];
  if(!c) return;
  // 用AI生成对话，如果没有API key则用预设台词
  var lastMsg = gameState.chatLog.length>0 ? gameState.chatLog[gameState.chatLog.length-1] : null;
  var context = lastMsg ? '上一句你说的是：'+lastMsg.msg+'。' : '';
  var phrases = [
    '跟紧我，别走散了。','好的，我掩护你。','这波可以上！','小心左边！',
    '漂亮！这波操作可以。','等我大招CD…','对面打野下来了。','你去带线，我来守塔。',
    '稳住，我们能赢。','Nice！干得漂亮！','集合集合，准备打团！','我去拿个龙，你们牵制一下。',
    '小心！对面在草丛里！','这波我扛，你们输出。','别浪了，稳一点打。','我先手开团，你们跟上！'
  ];
  var p = phrases[Math.floor(Math.random()*phrases.length)];
  document.getElementById('game-v-status').textContent = '💬 '+p;
  document.getElementById('game-float-status').textContent = p;
  gameAddChat('ai', c.name+'：'+p);
  // 用语音合成朗读
  try{
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(p);
    u.lang = 'zh-CN';
    u.rate = 1.1;
    u.pitch = 1.0;
    speechSynthesis.speak(u);
  }catch(e){}
}

function gameRenderFloatWave(){
  var w = document.getElementById('game-float-wave');
  if(!w) return;
  var html = '';
  for(var i=0;i<8;i++) html += '<span style="animation-delay:'+(i*0.06)+'s;height:'+(4+Math.random()*12)+'px;"></span>';
  w.innerHTML = html;
}

function gameRenderVWave(){
  var w = document.getElementById('game-v-wave');
  if(!w) return;
  var html = '';
  for(var i=0;i<20;i++) html += '<span style="animation-delay:'+(i*0.04)+'s;height:'+(8+Math.random()*22)+'px;"></span>';
  w.innerHTML = html;
}

function gameComplain(){
  var c = contacts[gameState.contact];
  var complaints = [
    '这队友简直了，站着不动让人打！','打野全程梦游，服了。','对面怎么这么强，是不是开挂了？',
    '我这把发挥还行，就是队友太坑了。','辅助不跟团，心态崩了。','刚才那波团战我要是再快一点就好了。',
    '太气了！下一把一定要赢回来！','我大招放空了，好丢人…','这个版本平衡性太差了。'
  ];
  var msg = complaints[Math.floor(Math.random()*complaints.length)];
  gameAddChat('me','😤 '+msg);
  setTimeout(function(){
    var replies = ['确实，这把队友太坑了。','别气了，下把我带你飞。','刚刚那波不是你问题，是对面太强了。','哈哈，你吐槽的样子真可爱。','输了就输了，我陪你继续打。'];
    var reply = replies[Math.floor(Math.random()*replies.length)];
    gameAddChat('ai',c?c.name+'：'+reply:'');
    document.getElementById('game-v-status').textContent = '💬 '+reply;
    document.getElementById('game-float-status').textContent = reply;
    try{ speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(reply); u.lang='zh-CN'; u.rate=1.1; speechSynthesis.speak(u); }catch(e){}
  },600);
}

function gameAddChat(who,msg){
  gameState.chatLog.push({who:who,msg:msg,ts:Date.now()});
  var el = document.getElementById('game-chat-log');
  if(!el) return;
  var cls = who==='me'?'mine':who==='ai'?'ai':'';
  el.innerHTML += '<div class="'+cls+'">['+('0'+new Date().getHours()).slice(-2)+':'+('0'+new Date().getMinutes()).slice(-2)+'] <b>'+(who==='me'?'你':who==='ai'?(contacts[gameState.contact]?contacts[gameState.contact].name:'AI'):'系统')+'</b>：'+msg+'</div>';
  el.scrollTop = el.scrollHeight;
}

function gameSaveTTS(){
  gameState.ttsKey = document.getElementById('tts-api-key').value.trim();
  gameState.ttsVoice = document.getElementById('tts-voice-id').value.trim();
  try{ localStorage.setItem('game_tts',JSON.stringify({key:gameState.ttsKey,voice:gameState.ttsVoice})); }catch(e){}
  showToast('TTS 配置已保存，语音通话将使用系统语音', 1500);
}

function gameLoadTTS(){
  try{
    var saved = JSON.parse(localStorage.getItem('game_tts'));
    if(saved){
      gameState.ttsKey = saved.key||'';
      gameState.ttsVoice = saved.voice||'';
      document.getElementById('tts-api-key').value = gameState.ttsKey;
      document.getElementById('tts-voice-id').value = gameState.ttsVoice;
    }
  }catch(e){}
}

/* ---- sub games: truth/dare + gomoku ---- */
var truthData = {
  truths:['你上一次心动的瞬间是什么？','如果可以选择超能力，你最想要什么？','你觉得自己最大的魅力点是什么？','有没有偷偷做过什么不敢告诉别人的事？','如果世界只剩24小时，你会怎么过？','你觉得爱情中最重要的是什么？','有没有一个人，你一直想对他说对不起？','你最喜欢自己身体的哪个部位？','最近一次哭是因为什么？','如果有人跟你表白你会怎么回应？'],
  dares:['对手机对面的TA说一句最肉麻的话','模仿一种动物叫10秒钟','用唱歌的方式说三句话','闭眼30秒，想象TA就在身边','用三个词夸你现在的队友','发一段10秒的语音给TA','做10个仰卧起坐','倒着念你的名字三遍','用撒娇的语气说"我错了"','给TA取一个专属昵称'],
  reactions:['这个答案我喜欢。ᗜ֊ᗜ','好真诚的回答，心动了。','没想到你是这样的…不过很可爱。','哇，这个答案让我对你刮目相看。','哈哈，你认真的样子好有趣。','听完你的回答，感觉离你又近了一步。'],
  dareReactions:['你还真敢做啊！佩服佩服。','哈哈哈，你做这个太好笑了！','不愧是你，完成得很棒。','我帮你记下来了，以后可以拿出来笑话你。','做完了？那轮到我了。']
};

function gameCloseSub(){
  document.getElementById('game-subview').style.display='none';
  document.querySelectorAll('#sheet-game .game-grid-2, #sheet-game .game-perm, #sheet-game .game-voice-panel, #sheet-game .game-chat-log, #sheet-game .game-contact-row, #sheet-game .tts-config').forEach(function(e){ e.style.display=''; });
}

var truthState = { partner:'', step:'', mode:'', myVal:0, oppVal:0, loser:'', cardType:'', cardText:'', answer:'' };

function gameStartTruth(){
  document.querySelectorAll('#sheet-game .game-grid-2, #sheet-game .game-perm, #sheet-game .game-voice-panel, #sheet-game .game-chat-log, #sheet-game .game-contact-row, #sheet-game .tts-config').forEach(function(e){ e.style.display='none'; });
  document.getElementById('game-subview').style.display='block';
  document.getElementById('game-truth').style.display='block';
  document.getElementById('game-gomoku').style.display='none';
  truthState = { partner:'', step:'', mode:'', myVal:0, oppVal:0, loser:'', cardType:'', cardText:'', answer:'' };
  truthStepPick();
}

function truthStepPick(){
  truthState.step='pick';
  var ids = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].isGroup; });
  var html = '<div class="truth-step-title">选择和谁一起玩</div>';
  html += '<div class="truth-pick">';
  ids.forEach(function(k){
    var c = contacts[k];
    html += '<div class="pc" onclick="truthChoosePartner(\''+k+'\')"><div class="av">'+contactAvatar(c)+'</div><div class="nm">'+esc(c.name)+'</div></div>';
  });
  html += '</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthChoosePartner(id){
  truthState.partner = id;
  gameState.contact = id;
  var c = contacts[id];
  if(document.getElementById('game-contact-name')) document.getElementById('game-contact-name').textContent = c.name;
  gameAddChat('system', c.name+' 加入真心话大冒险！');
  truthStepDuel();
}

function truthStepDuel(){
  truthState.step='duel';
  var c = contacts[truthState.partner];
  var html = '<div class="truth-step-title">和 '+esc(c.name)+' 来一局</div>';
  html += '<div class="truth-duel-info">先分胜负：猜拳或掷骰子，输的人抽卡牌</div>';
  html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthRps()">猜拳</button><button class="truth-btn primary" onclick="truthDice()">掷骰子</button></div>';
  html += '<div class="truth-partner-line" onclick="truthStepPick()" style="cursor:pointer;">重新选择玩伴 ›</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthRps(){
  truthState.mode='rps';
  var html = '<div class="truth-step-title">猜拳 · 出什么？</div>';
  html += '<div class="truth-rps-icons">';
  html += '<div class="r" onclick="truthPlayRps(0)">石头</div>';
  html += '<div class="r" onclick="truthPlayRps(1)">剪刀</div>';
  html += '<div class="r" onclick="truthPlayRps(2)">布</div>';
  html += '</div>';
  html += '<div class="truth-partner-line" onclick="truthStepDuel()" style="cursor:pointer;">‹ 换个玩法</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthPlayRps(my){
  var opp = Math.floor(Math.random()*3);
  if(my===opp){ truthRpsTie(my, opp); return; }
  var myWins = ((opp+1)%3)===my;
  truthResolveDuel(my, opp, 'rps', myWins?'opp':'me');
}

function truthRpsTie(my, opp){
  var names=['石头','剪刀','布'];
  var html = '<div class="truth-step-title">平局！</div>';
  html += '<div class="truth-duel-info">你出 '+names[my]+' ，'+esc(contacts[truthState.partner].name)+' 也出 '+names[opp]+'</div>';
  html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthRps()">再猜一次</button></div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthDice(){
  truthState.mode='dice';
  var html = '<div class="truth-step-title">掷骰子 · 比大小</div>';
  html += '<div class="truth-duel-info">点数小的人输</div>';
  html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthPlayDice()">掷骰子</button></div>';
  html += '<div class="truth-partner-line" onclick="truthStepDuel()" style="cursor:pointer;">‹ 换个玩法</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthPlayDice(){
  var my = 1+Math.floor(Math.random()*6);
  var opp = 1+Math.floor(Math.random()*6);
  if(my===opp){
    var html = '<div class="truth-step-title">平局！</div>';
    html += '<div class="truth-duel-info">你掷出 '+my+' ，'+esc(contacts[truthState.partner].name)+' 也掷出 '+opp+'</div>';
    html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthPlayDice()">再掷一次</button></div>';
    document.getElementById('game-truth').innerHTML = html;
    return;
  }
  truthResolveDuel(my, opp, 'dice', my<opp?'me':'opp');
}

function truthResolveDuel(my, opp, mode, loser){
  truthState.myVal=my; truthState.oppVal=opp; truthState.loser=loser;
  var c = contacts[truthState.partner];
  var myLabel, oppLabel;
  if(mode==='rps'){ var names=['石头','剪刀','布']; myLabel=names[my]; oppLabel=names[opp]; }
  else { myLabel=String(my); oppLabel=String(opp); }
  var loserName = loser==='me' ? '你' : c.name;
  gameAddChat('system', '对决结果 — 你：'+myLabel+'，'+c.name+'：'+oppLabel+'。'+loserName+' 输了！');
  truthStepCard(loser);
}

function truthStepCard(loser){
  truthState.step='card';
  var isTruth = Math.random()>0.4;
  var text = (isTruth?truthData.truths:truthData.dares)[Math.floor(Math.random()*10)];
  truthState.cardType = isTruth?'truth':'dare';
  truthState.cardText = text;
  var c = contacts[truthState.partner];
  var loserName = loser==='me' ? '你' : c.name;
  var html = '<div class="truth-card"><div class="qtype">'+(isTruth?'真心话':'大冒险')+'</div>';
  html += '<div class="question">'+esc(text)+'</div>';
  html += '<div class="hint">'+loserName+' 抽到了这张卡牌</div></div>';

  if(isTruth){
    if(loser==='me'){
      html += '<div class="truth-answer"><textarea id="truth-input" placeholder="输入你的真心话…"></textarea><div class="send" onclick="truthSubmitTruth()">提交</div></div>';
    } else {
      html += '<div class="truth-duel-info">'+esc(c.name)+' 正在回答…</div><div id="truth-ai-wait" class="truth-step-title">…</div>';
      var sysT = getPersonaPrompt(truthState.partner) + '现在是真心话大冒险，你抽到了真心话卡，请用自己的口吻真诚地回答这个问题，1-2句话。不要加名字前缀。不要用emoji。';
      callRealAI([{role:'user',content:'真心话：'+text}], sysT, truthState.partner, function(reply){
        var ans = (reply||'').split('[')[0].trim();
        var node = document.getElementById('truth-ai-wait');
        if(node) node.textContent = ans || '（沉默了一下，脸红了）';
        if(node) node.insertAdjacentHTML('afterend', '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">再来一轮</button></div>');
      });
    }
  } else {
    if(loser==='me'){
      html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthCompleteDare()">完成任务</button></div>';
    } else {
      html += '<div class="truth-duel-info">'+esc(c.name)+' 正在完成大冒险…</div><div id="truth-ai-wait" class="truth-step-title">…</div>';
      var sysD = getPersonaPrompt(truthState.partner) + '现在是真心话大冒险，你抽到了大冒险卡，请描述你是怎么完成这个任务的，1-2句话，像真人聊天。不要加名字前缀。不要用emoji。';
      callRealAI([{role:'user',content:'大冒险：'+text}], sysD, truthState.partner, function(reply){
        var ans = (reply||'').split('[')[0].trim();
        var node = document.getElementById('truth-ai-wait');
        if(node) node.textContent = ans || '（眨眨眼，照做了）';
        if(node) node.insertAdjacentHTML('afterend', '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">再来一轮</button></div>');
      });
    }
  }
  html += '<div class="truth-partner-line" onclick="truthStepDuel()" style="cursor:pointer;margin-top:14px;">‹ 返回，换个玩法</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthSubmitTruth(){
  var el = document.getElementById('truth-input');
  var ans = el ? el.value.trim() : '';
  if(!ans){ showToast('先写点什么吧～', 1800); return; }
  truthState.answer = ans;
  var c = contacts[truthState.partner];
  gameAddChat('me', '真心话：'+ans);
  var html = '<div class="truth-card"><div class="qtype">你的回答</div><div class="question">'+esc(ans)+'</div></div>';
  html += '<div class="truth-duel-info" id="truth-react">'+esc(c.name)+' 正在回应…</div>';
  html += '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">完成 · 再来一轮</button></div>';
  document.getElementById('game-truth').innerHTML = html;
  var sys = getPersonaPrompt(truthState.partner) + '你的恋人刚才在真心话大冒险里坦诚说了真心话，请用你角色的口吻自然回应、表达感受，1-2句话。不要加名字前缀。不要用emoji。';
  callRealAI([{role:'user',content:'TA的真心话：'+ans}], sys, truthState.partner, function(reply){
    var r = (reply||'').split('[')[0].trim();
    var node = document.getElementById('truth-react');
    if(node) node.textContent = (c.name+'：'+(r||truthData.reactions[0])).replace(/\[需要 API Key\]|\[无法连接 AI\]/g,'');
  });
}

function truthCompleteDare(){
  var c = contacts[truthState.partner];
  gameAddChat('me', '完成了大冒险：'+truthState.cardText);
  var html = '<div class="truth-card"><div class="qtype">大冒险完成</div><div class="question">'+esc(truthState.cardText)+'</div></div>';
  html += '<div class="truth-duel-info" id="truth-react">'+esc(c.name)+' 正在回应…</div>';
  html += '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">完成 · 再来一轮</button></div>';
  document.getElementById('game-truth').innerHTML = html;
  var sys = getPersonaPrompt(truthState.partner) + '你的恋人刚才完成了大冒险卡上的任务，请用你角色的口吻自然回应，1-2句话，可以调侃或夸奖。不要加名字前缀。不要用emoji。';
  callRealAI([{role:'user',content:'TA完成了大冒险：'+truthState.cardText}], sys, truthState.partner, function(reply){
    var r = (reply||'').split('[')[0].trim();
    var node = document.getElementById('truth-react');
    if(node) node.textContent = (c.name+'：'+(r||truthData.dareReactions[0])).replace(/\[需要 API Key\]|\[无法连接 AI\]/g,'');
  });
}

function truthNewRound(){
  truthStepDuel();
  var c = contacts[truthState.partner];
  gameAddChat('system', '新一轮开始，和 '+ (c?c.name:'TA') +' 继续！');
}

/* ---- gomoku ---- */
var gomokuState = { board:[], turn:'black', over:false, score:{black:0,white:0} };

function gameStartGomoku(){
  if(!gameState.contact){ showToast('请先选择队友！', 1500); return; }
  document.querySelectorAll('#sheet-game .game-grid-2, #sheet-game .game-perm, #sheet-game .game-voice-panel, #sheet-game .game-chat-log, #sheet-game .game-contact-row, #sheet-game .tts-config').forEach(function(e){ e.style.display='none'; });
  document.getElementById('game-subview').style.display='block';
  document.getElementById('game-truth').style.display='none';
  document.getElementById('game-gomoku').style.display='block';
  gomokuState = {board:Array(15).fill().map(function(){return Array(15).fill(null);}), turn:'black', over:false, score:gomokuState.score||{black:0,white:0}};
  renderGomoku();
  document.getElementById('gscore-black').textContent = gomokuState.score.black;
  document.getElementById('gscore-white').textContent = gomokuState.score.white;
  document.getElementById('gomoku-status').textContent = '你的回合（⚫）';
  var c = contacts[gameState.contact];
  gameAddChat('system','♟ 五子棋对局开始！你执黑先行，'+ (c?c.name:'AI') +' 执白。');
}

function renderGomoku(){
  var board = document.getElementById('gomoku-board');
  board.innerHTML = '';
  for(var r=0;r<15;r++){
    for(var cl=0;cl<15;cl++){
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('data-r',r);
      cell.setAttribute('data-c',cl);
      cell.onclick = function(){ gomokuClick(parseInt(this.getAttribute('data-r')),parseInt(this.getAttribute('data-c'))); };
      if(gomokuState.board[r][cl]){
        var stone = document.createElement('div');
        stone.className = 'stone '+gomokuState.board[r][cl];
        cell.appendChild(stone);
      }
      board.appendChild(cell);
    }
  }
}

function gomokuClick(r,c){
  if(gomokuState.over) return;
  if(gomokuState.turn!=='black') return;
  if(gomokuState.board[r][c]) return;
  gomokuState.board[r][c] = 'black';
  renderGomoku();
  if(checkGomokuWin('black')){
    gomokuState.over = true;
    gomokuState.score.black++;
    document.getElementById('gscore-black').textContent = gomokuState.score.black;
    document.getElementById('gomoku-status').textContent = '🎉 你赢了！';
    var ct = contacts[gameState.contact];
    gameAddChat('ai',(ct?ct.name:'AI')+'：厉害！这步棋我没想到。再来一局？');
    return;
  }
  gomokuState.turn = 'white';
  document.getElementById('gomoku-status').textContent = 'AI 思考中…';
  setTimeout(gomokuAIMove,400);
}

function gomokuAIMove(){
  if(gomokuState.over) return;
  // Simple AI: find best move near existing stones
  var best = gomokuFindBest();
  if(best){
    gomokuState.board[best.r][best.c] = 'white';
    renderGomoku();
    if(checkGomokuWin('white')){
      gomokuState.over = true;
      gomokuState.score.white++;
      document.getElementById('gscore-white').textContent = gomokuState.score.white;
      document.getElementById('gomoku-status').textContent = '😔 AI 赢了';
      var ct = contacts[gameState.contact];
      gameAddChat('ai',(ct?ct.name:'AI')+'：承让了。要不要再来一局？我等你。');
      return;
    }
  }
  gomokuState.turn = 'black';
  document.getElementById('gomoku-status').textContent = '你的回合（⚫）';
}

function gomokuFindBest(){
  var bestScore = -1, bestMove = null;
  for(var r=0;r<15;r++){
    for(var c=0;c<15;c++){
      if(gomokuState.board[r][c]) continue;
      // Check if near existing stones
      var near = false;
      for(var dr=-2;dr<=2;dr++){
        for(var dc=-2;dc<=2;dc++){
          var nr=r+dr, nc=c+dc;
          if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]){ near=true; break; }
        }
        if(near) break;
      }
      if(!near && gomokuState.board.some(function(row){return row.some(function(cell){return cell;});})) continue;
      var score = gomokuEval(r,c,'white') + gomokuEval(r,c,'black')*0.8 + (near?1:0);
      if(score>bestScore){ bestScore=score; bestMove={r:r,c:c}; }
    }
  }
  // Fallback: center if board empty
  if(!bestMove) bestMove = {r:7,c:7};
  return bestMove;
}

function gomokuEval(r,c,color){
  var dirs = [[1,0],[0,1],[1,1],[1,-1]];
  var score = 0;
  gomokuState.board[r][c] = color;
  for(var d=0;d<4;d++){
    var cnt = 1;
    for(var i=1;i<5;i++){ var nr=r+dirs[d][0]*i, nc=c+dirs[d][1]*i; if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]===color) cnt++; else break; }
    for(var i=1;i<5;i++){ var nr=r-dirs[d][0]*i, nc=c-dirs[d][1]*i; if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]===color) cnt++; else break; }
    if(cnt>=5) score += 100;
    else if(cnt===4) score += 10;
    else if(cnt===3) score += 3;
    else if(cnt===2) score += 1;
  }
  gomokuState.board[r][c] = null;
  return score;
}

function checkGomokuWin(color){
  var dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for(var r=0;r<15;r++){
    for(var c=0;c<15;c++){
      if(gomokuState.board[r][c]!==color) continue;
      for(var d=0;d<4;d++){
        var cnt=1;
        for(var i=1;i<5;i++){ var nr=r+dirs[d][0]*i, nc=c+dirs[d][1]*i; if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]===color) cnt++; else break; }
        if(cnt>=5) return true;
      }
    }
  }
  return false;
}

function gameTestTTS(){
  var key = document.getElementById('tts-api-key').value.trim();
  var voice = document.getElementById('tts-voice-id').value.trim();
  if(!key){ alert('请先填写 API Key'); return; }
  var testText = '你好，我是你的游戏队友。准备好了吗？我们一起开黑吧！';
  // Fallback to browser TTS
  try{ speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(testText); u.lang='zh-CN'; u.rate=1.05; speechSynthesis.speak(u); alert('🔊 正在播放测试语音（使用浏览器内置TTS）\n\nElevenLabs API 需要后端支持，当前使用浏览器语音引擎。'); }catch(e){ alert('TTS 不可用'); }
}

