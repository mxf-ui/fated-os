function goSyncBalanceFromWallet(){ if(typeof walletBalance === 'number') goState.balance = walletBalance; }
function goPayWageToWallet(title, reward){
  reward = Number(reward) || 0;
  if(reward <= 0) return;
  if(typeof addWalletTx === 'function') addWalletTx(title, reward);
  else if(typeof walletBalance !== 'undefined') walletBalance += reward;
  if(typeof updateWalletPreview === 'function') updateWalletPreview();
  goSyncBalanceFromWallet();
}
function goTtsReady(){ return typeof ttsConfigured === 'function' && ttsConfigured(); }
function goSpeakPartnerText(text, partnerId){
  if(!text || !goTtsReady()) return;
  try{
    var voiceId = (typeof apiConfig !== 'undefined' && apiConfig.voiceIds) ? (apiConfig.voiceIds[partnerId] || '') : '';
    if(typeof speakWithTTS === 'function') speakWithTTS(text, voiceId);
  }catch(e){}
}

/* ---- Voice Input ---- */
function goFocusPartnerText(){ var el = document.getElementById('go-partner-text'); if(el){ el.focus(); el.select && el.select(); } }
function goCanPartnerVoice(){
  if(!goState.livePartner){ goToast('\u8bf7\u5148\u9009\u62e9 WeChat \u8fde\u9ea6\u597d\u53cb'); return false; }
  if(!goTtsReady()){ goToast('\u8bf7\u5148\u5728\u8bbe\u7f6e\u91cc\u914d\u7f6e\u8bed\u97f3 API'); goFocusPartnerText(); return false; }
  return true;
}
function goSendPartnerText(){
  if(!goCanPartnerVoice()) return;
  var el = document.getElementById('go-partner-text');
  var text = (el && el.value || '').trim();
  if(!text){ goToast('\u8bf7\u8f93\u5165\u8981\u548c\u8fde\u9ea6\u597d\u53cb\u8bf4\u7684\u8bdd'); goFocusPartnerText(); return; }
  if(el) el.value = '';
  goCompletePartnerVoice(text);
}
function goVoiceInput(ctx){
  if(ctx === 'partner' && !goCanPartnerVoice()) return;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    if(ctx === 'partner'){ goToast('\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u8bed\u97f3\u8bc6\u522b\uff0c\u53ef\u4ee5\u8f93\u5165\u6587\u5b57\u8fde\u9ea6'); goFocusPartnerText(); return; }
    goToast('\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u8bed\u97f3\u8f93\u5165'); return;
  }
  if(goVoiceRec){ goVoiceRec.stop(); goVoiceRec = null; return; }
  goVoiceRec = new SR();
  goVoiceRec.lang = 'zh-CN';
  goVoiceRec.continuous = false;
  goVoiceRec.interimResults = false;
  goVoiceRec.onstart = function(){
    goToast('\u6b63\u5728\u5f55\u97f3... \u518d\u6b21\u70b9\u51fb\u505c\u6b62');
    var btnId = ctx === 'partner' ? 'go-partner-voice-btn' : (ctx === 'ecommerce' || ctx === 'product' ? 'go-pitch-btn' : 'go-voice-btn');
    var btn = document.getElementById(btnId);
    if(btn){ btn.textContent = '\u505c\u6b62\u5f55\u97f3'; btn.style.background = '#c0392b'; }
  };
  goVoiceRec.onresult = function(e){
    var text = e.results[0][0].transcript;
    goVoiceRec = null;
    goResetVoiceButtons();
    if(ctx === 'product'){
      var pn = document.getElementById('go-prod-name'); if(pn) pn.value = text;
      goToast('\u8bc6\u522b: '+text);
    } else if(ctx === 'ecommerce') goCheckPitch(text);
    else if(ctx === 'asmr' || ctx === 'voice' || ctx === 'beauty') goCompleteVoiceSession(text);
    else if(ctx === 'partner') goCompletePartnerVoice(text);
  };
  goVoiceRec.onerror = function(){
    goVoiceRec = null;
    goResetVoiceButtons();
    if(ctx === 'partner'){ goToast('\u8bed\u97f3\u8bc6\u522b\u5931\u8d25\uff0c\u53ef\u4ee5\u5148\u8f93\u5165\u6587\u5b57\u8ba9\u5bf9\u65b9\u8bed\u97f3\u56de\u590d'); goFocusPartnerText(); return; }
    goToast('\u8bed\u97f3\u8bc6\u522b\u5931\u8d25');
  };
  goVoiceRec.onend = function(){ goVoiceRec = null; goResetVoiceButtons(); };
  goVoiceRec.start();
}
function goResetVoiceButtons(){
  var btns = [document.getElementById('go-pitch-btn'), document.getElementById('go-voice-btn'), document.getElementById('go-partner-voice-btn')];
  btns.forEach(function(btn){
    if(!btn) return;
    if(btn.id === 'go-pitch-btn') btn.textContent = '\u5f00\u59cb\u8bed\u97f3\u8bb2\u89e3';
    else if(btn.id === 'go-partner-voice-btn') btn.textContent = goState.livePartner ? ('\u8bed\u97f3\u8fde\u9ea6\uff1a' + goContactName(goState.livePartner)) : '\u9009\u62e9\u8fde\u9ea6\u597d\u53cb';
    else btn.textContent = '\u5f00\u59cb\u8bed\u97f3';
    btn.style.background = '';
  });
}
function goCompletePartnerVoice(userText){
  var pid = goState.livePartner;
  if(!pid || typeof contacts === 'undefined' || !contacts[pid]){ goToast('\u8fde\u9ea6\u597d\u53cb\u4e0d\u5b58\u5728'); return; }
  var c = contacts[pid];
  goState.partnerChat = Array.isArray(goState.partnerChat) ? goState.partnerChat : [];
  goState.partnerChat.push({mine:true, name:'\u6211', text:userText, at:Date.now()});
  var box = document.getElementById('go-partner-chat');
  if(box) box.innerHTML = goRenderPartnerChat();
  goToast('\u8fde\u9ea6\u4e2d\uff0c'+c.name+'\u6b63\u5728\u56de\u5e94...');
  goCallAI('\u4f60\u6b63\u5728\u548c\u4e3b\u64ad\u8fde\u9ea6\u8bed\u97f3\u804a\u5929\u3002\u4e3b\u64ad\u8bf4:"'+userText+'"\u3002\n\u4f60\u7684\u8d44\u6599\uff1a\n'+goContactPersonaText(pid)+'\n\u8bf7\u7528\u8fd9\u4e2a\u8054\u7cfb\u4eba\u7684\u8bed\u6c14\u81ea\u7136\u56de\u590d\uff0c\u9002\u5408\u8bed\u97f3\u64ad\u653e\uff0c\u4e0d\u8d85\u8fc760\u5b57\u3002', '\u4f60\u662f WeChat \u8054\u7cfb\u4eba\uff0c\u6b63\u5728\u548c\u4e3b\u64ad\u8fde\u9ea6\u3002\u4e0d\u8981\u5199\u65c1\u767d\uff0c\u53ea\u56de\u590d\u8981\u8bf4\u7684\u8bdd\u3002', function(reply){
    reply = (reply || '\u6211\u542c\u5230\u4e86\uff0c\u4f60\u7ee7\u7eed\u8bf4\uff0c\u6211\u5728\u8fd9\u91cc\u966a\u4f60\u8fde\u9ea6\u3002').replace(/\n+/g,' ').trim();
    goState.partnerChat.push({mine:false, name:c.name || 'WeChat', text:reply, at:Date.now()});
    if(goState.partnerChat.length > 30) goState.partnerChat = goState.partnerChat.slice(-30);
    var chat = document.getElementById('go-partner-chat');
    if(chat) chat.innerHTML = goRenderPartnerChat();
    goSpeakPartnerText(reply, pid);
    saveState();
  });
  saveState();
}

/* ---- End Live ---- */
function goEndLive(success, reward){
  var s = goState;
  goStopDanmaku();
  goStopCamera();
  s.cameraOn = false;
  if(goVoiceRec){ try{ goVoiceRec.stop(); }catch(e){} goVoiceRec = null; }
  if(goLiveTimer){ clearInterval(goLiveTimer); goLiveTimer = null; }
  if(success && reward > 0){
    goPayWageToWallet('GO Live \u5de5\u8d44', reward);
    s.history.push({type:s.liveType, reward:reward, time:Date.now(), success:true});
    goToast('\u76f4\u64ad\u5b8c\u6210! \u83b7\u5f97 \u00a5'+reward);
  } else {
    s.history.push({type:s.liveType, reward:0, time:Date.now(), success:false});
    goToast('\u5df2\u7ed3\u675f\u76f4\u64ad');
  }
  s.isLive = false;
  var live = document.getElementById('go-page-live');
  var setup = document.getElementById('go-page-setup');
  if(live) live.classList.remove('active');
  if(setup) setup.classList.add('active');
  goRenderSetup();
  saveState();
}
