function goSyncBalanceFromWallet(){
  if(typeof walletBalance === 'number') goState.balance = walletBalance;
}
function goPayWageToWallet(title, reward){
  reward = Number(reward) || 0;
  if(reward <= 0) return;
  if(typeof addWalletTx === 'function') addWalletTx(title, reward);
  else if(typeof walletBalance !== 'undefined') walletBalance += reward;
  if(typeof updateWalletPreview === 'function') updateWalletPreview();
  goSyncBalanceFromWallet();
}

/* ---- Voice Input ---- */
function goVoiceInput(ctx){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ goToast('浏览器不支持语音输入'); return; }
  if(goVoiceRec){ goVoiceRec.stop(); goVoiceRec=null; return; }
  goVoiceRec = new SR();
  goVoiceRec.lang = 'zh-CN';
  goVoiceRec.continuous = false;
  goVoiceRec.interimResults = false;
  goVoiceRec.onstart = function(){
    goToast('正在录音... 再次点击停止');
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '停止录音'; btn.style.background = '#c0392b'; }
  };
  goVoiceRec.onresult = function(e){
    var text = e.results[0][0].transcript;
    goVoiceRec = null;
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '开始语音'; btn.style.background = ''; }
    if(ctx==='product'){
      var pn = document.getElementById('go-prod-name');
      if(pn) pn.value = text;
      goToast('识别: '+text);
    } else if(ctx==='ecommerce'){
      goCheckPitch(text);
    } else if(ctx==='asmr'||ctx==='voice'||ctx==='beauty'){
      goCompleteVoiceSession(text);
    }
  };
  goVoiceRec.onerror = function(){
    goVoiceRec = null;
    goToast('语音识别失败');
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '开始语音'; btn.style.background = ''; }
  };
  goVoiceRec.onend = function(){
    goVoiceRec = null;
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '开始语音'; btn.style.background = ''; }
  };
  goVoiceRec.start();
}

/* ---- End Live ---- */
function goEndLive(success, reward){
  var s = goState;
  goStopDanmaku();
  if(goLiveTimer){ clearInterval(goLiveTimer); goLiveTimer=null; }
  if(success && reward>0){
    s.balance += reward;
    s.history.push({type:s.liveType, reward:reward, time:Date.now(), success:true});
    goToast('直播完成! 获得 ¥'+reward);
    if(typeof walletBalance!=='undefined'){ walletBalance += reward; }
  } else {
    s.history.push({type:s.liveType, reward:0, time:Date.now(), success:false});
    goToast('已结束直播');
  }
  s.isLive = false;
  document.getElementById('go-page-live').classList.remove('active');
  document.getElementById('go-page-setup').classList.add('active');
  goRenderSetup();
  saveState();
}
