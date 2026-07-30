function goStartLive(){
  goEnsureStateShape();
  var s = goState;
  var idEl = document.getElementById('go-live-id');
  var dmEl = document.getElementById('go-dm-custom');
  var wbEl = document.getElementById('go-wb-bind');
  s.liveId = (idEl && idEl.value || '').trim();
  s.danmakuCustom = (dmEl && dmEl.value || '').trim();
  s.worldBookBind = wbEl ? wbEl.value : '';
  if(!s.liveType){ goToast('\u8bf7\u9009\u62e9\u76f4\u64ad\u7c7b\u578b'); return; }
  if(!s.liveId){ goToast('\u8bf7\u8f93\u5165\u76f4\u64adID'); return; }
  s.isLive = true;
  s.liveStartTime = Date.now();
  goLiveSeconds = 0;
  s.orders = 0;
  if(s.liveType === 'ecommerce') goEnsureProductIds();
  s.asmrProgress = 0;
  s.qaCurrent = 0;
  s.qaQuestions = [];
  s.qaPartner = s.livePartner || '';
  s.qaRoundSeed = 'round-' + Date.now() + '-' + Math.floor(Math.random()*100000);
  s.liveEvents = [];
  s.partnerChat = [];
  s.cameraOn = false;
  var setup = document.getElementById('go-page-setup');
  var live = document.getElementById('go-page-live');
  if(setup) setup.classList.remove('active');
  if(live) live.classList.add('active');
  var tn = {ecommerce:'\u5e26\u8d27\u76f4\u64ad',game:'\u6e38\u620f\u76f4\u64ad',couple:'\u60c5\u4fa3Q&A',asmr:'ASMR\u76f4\u64ad',voice:'\u8bed\u97f3\u5385',beauty:'\u7f8e\u5986\u76f4\u64ad'};
  var title = document.getElementById('go-live-title');
  if(title) title.textContent = tn[s.liveType] || '\u76f4\u64ad\u4e2d';
  if(goLiveTimer) clearInterval(goLiveTimer);
  goLiveTimer = setInterval(function(){
    goLiveSeconds++;
    var m = Math.floor(goLiveSeconds/60), sec = goLiveSeconds%60;
    var el = document.getElementById('go-live-timer');
    if(el) el.textContent = (m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
  }, 1000);
  goRenderLive();
  if(s.liveType === 'couple' && s.livePartner) goGenerateQA();
  saveState();
}

function goContactAvatarStyle(id){
  var c = typeof contacts !== 'undefined' && contacts[id] ? contacts[id] : null;
  if(!c) return 'background:#d8f5e5;';
  if(c.avatar) return 'background-image:url('+c.avatar+');background-size:cover;background-position:center;';
  return 'background:'+(c.avatarColor || '#bdebd4')+';';
}
function goContactName(id){ return (typeof contacts !== 'undefined' && contacts[id] && contacts[id].name) ? contacts[id].name : '\u672a\u9009\u62e9'; }
function goRenderLivePartnerBadge(){
  var id = goState.livePartner;
  if(!id || typeof contacts === 'undefined' || !contacts[id]) return '';
  return '<div class="go-live-partner-badge"><div class="go-live-partner-avatar" style="'+goContactAvatarStyle(id)+'"></div><div><b>'+esc(contacts[id].name||'WeChat')+'</b><small>WeChat \u8fde\u9ea6\u4e2d</small></div></div>';
}
function goRenderLiveControls(){
  var id = goState.livePartner;
  var partner = id && typeof contacts !== 'undefined' && contacts[id] ? contacts[id] : null;
  var camText = goState.cameraOn ? '\u5173\u95ed\u6444\u50cf\u5934' : '\u6253\u5f00\u6444\u50cf\u5934';
  var voiceText = partner ? '\u8bed\u97f3\u8fde\u9ea6\uff1a'+esc(partner.name||'WeChat') : '\u9009\u62e9\u8fde\u9ea6\u597d\u53cb';
  var note = partner ? '<div class="go-live-control-note">'+esc(partner.name||'WeChat')+' \u53ef\u4ee5\u770b\u5230\u4f60\u7684\u76f4\u64ad\u753b\u9762\uff1b\u6253\u5f00\u6444\u50cf\u5934\u540e\u9ed8\u8ba4\u53ef\u89c1\u3002</div>' : '<div class="go-live-control-note">\u6240\u6709\u76f4\u64ad\u7c7b\u578b\u90fd\u53ef\u4ee5\u4ece WeChat \u8054\u7cfb\u4eba\u9009\u62e9\u8fde\u9ea6\u5bf9\u8c61\u3002</div>';
  var voiceState = typeof goTtsReady === 'function' && goTtsReady() ? '\u8bed\u97f3API\u5df2\u8fde\u63a5' : '\u8bed\u97f3API\u672a\u914d\u7f6e';
  return '<div class="go-card go-live-controls"><div class="go-label">\u76f4\u64ad\u5de5\u5177</div><div class="go-live-control-grid">'+
    '<button class="go-btn sm ghost" onclick="goPickBackground()">\u4e0a\u4f20\u80cc\u666f</button>'+
    '<button class="go-btn sm ghost" onclick="goOpenPartnerModal()">\u8fde\u9ea6\u597d\u53cb</button>'+
    '<button class="go-btn sm ghost" onclick="goToggleCamera()">'+camText+'</button>'+
    '<button id="go-partner-voice-btn" class="go-btn sm primary" onclick="goVoiceInput(\'partner\')">'+voiceText+'</button>'+
    '</div>'+note+'<div class="go-voice-status">'+voiceState+'</div><div class="go-partner-compose"><input id="go-partner-text" class="go-partner-input" placeholder="\u8bed\u97f3\u8bc6\u522b\u5931\u8d25\u65f6\uff0c\u8f93\u5165\u4f60\u8981\u8bf4\u7684\u8bdd"><button class="go-btn sm primary" onclick="goSendPartnerText()">\u53d1\u9001\u5e76\u8bed\u97f3\u56de\u590d</button></div><div id="go-partner-chat" class="go-partner-chat">'+goRenderPartnerChat()+'</div></div>';
}
function goRenderPartnerChat(){
  var list = Array.isArray(goState.partnerChat) ? goState.partnerChat.slice(-5) : [];
  if(!list.length) return '<div class="go-partner-empty">\u8bed\u97f3\u8fde\u9ea6\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u4f60\u548c\u597d\u53cb\u7684\u5bf9\u8bdd\u3002</div>';
  return list.map(function(m){ return '<div class="go-partner-msg '+(m.mine?'mine':'other')+'"><span>'+esc(m.name||'')+'</span><p>'+esc(m.text||'')+'</p></div>'; }).join('');
}

function goRenderLive(){
  goEnsureStateShape();
  var s = goState;
  var c = document.getElementById('go-live-content');
  if(!c) return;
  var avHtml = s.liveAvatar
    ? '<div class="go-live-avatar go-avatar-float" style="background-image:url('+s.liveAvatar+')"></div>'
    : '<div class="go-live-avatar go-avatar-float go-live-avatar-fallback">'+esc((s.liveId && s.liveId[0]) || 'G')+'</div>';
  var typeName = {ecommerce:'\u5e26\u8d27',game:'\u6e38\u620f',couple:'\u60c5\u4fa3Q&A',asmr:'ASMR',voice:'\u8bed\u97f3\u5385',beauty:'\u7f8e\u5986'}[s.liveType] || '';
  var bgStyle = s.liveBgCustom ? ' style="background-image:url('+s.liveBgCustom+')"' : '';
  var cameraClass = s.cameraOn ? ' camera-on' : '';
  var stage = '<div class="go-live-stage'+cameraClass+'" id="go-live-stage">'+
    '<div class="go-live-bg" id="go-live-bg"'+bgStyle+'></div>'+
    '<video id="go-camera-video" class="go-camera-video" autoplay muted playsinline></video>'+
    '<div class="go-live-type-badge">'+typeName+'</div>'+
    '<div class="go-live-viewers"><span id="go-viewer-count">'+Math.floor(Math.random()*200+80)+'</span> \u89c2\u770b</div>'+
    goRenderLivePartnerBadge()+
    goRenderTalkingProductBadge()+
    '<div class="go-live-overlay">'+avHtml+'<div class="go-live-id">'+esc(s.liveId)+'</div><div class="go-live-api-chip">'+(goApiReady()?'\u5df2\u63a5\u5165':'\u5f85\u914d\u7f6eAPI')+'</div></div>'+
    '<div class="go-danmaku-area" id="go-danmaku-area"></div>'+
    '</div>';
  var typeHtml = '';
  if(s.liveType === 'ecommerce') typeHtml = goRenderEcommerce();
  else if(s.liveType === 'game') typeHtml = goRenderGame();
  else if(s.liveType === 'couple') typeHtml = goRenderCouple();
  else typeHtml = goRenderVoice(s.liveType);
  var dashHtml = '<div class="go-live-dashboard">'+
    '<div><b id="go-live-events">'+((s.liveEvents && s.liveEvents.length) || 0)+'</b><small>\u5f39\u5e55</small></div>'+
    '<div><b>'+((s.qaUsedQuestions && s.qaUsedQuestions.length) || 0)+'</b><small>\u95ee\u7b54\u53bb\u91cd</small></div>'+
    '<div><b>'+(goApiReady()?'ON':'OFF')+'</b><small>\u5168\u5c40API</small></div>'+
    '</div>';
  var ecommerceShelf = s.liveType === 'ecommerce' ? goRenderProductShelf() : '';
  c.innerHTML = stage + ecommerceShelf + dashHtml + goRenderLiveControls() + typeHtml;
  if(s.liveType === 'ecommerce') goUpdateProductDisplay();
  goApplyCamera();
  goStartDanmaku();
}
function goSwitchBg(){ goToast('\u5df2\u6539\u4e3a\u4e0a\u4f20\u81ea\u5b9a\u4e49\u80cc\u666f'); }

function goToggleCamera(){
  if(goState.cameraOn){ goStopCamera(); goState.cameraOn = false; goRenderLive(); saveState(); return; }
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ goToast('\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u6444\u50cf\u5934'); return; }
  navigator.mediaDevices.getUserMedia({video:true,audio:false}).then(function(stream){
    goCameraStream = stream;
    goState.cameraOn = true;
    goToast('\u6444\u50cf\u5934\u5df2\u6253\u5f00');
    goRenderLive();
    saveState();
  }).catch(function(){ goToast('\u65e0\u6cd5\u8bbf\u95ee\u6444\u50cf\u5934'); });
}
function goApplyCamera(){
  var video = document.getElementById('go-camera-video');
  if(!video) return;
  if(goState.cameraOn && goCameraStream){
    video.srcObject = goCameraStream;
    video.play().catch(function(){});
  } else {
    video.srcObject = null;
  }
}
function goStopCamera(){
  if(goCameraStream){
    goCameraStream.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
    goCameraStream = null;
  }
}

/* ---- Danmaku ---- */
function goStartDanmaku(){ goStopDanmaku(); goDanmakuTimer = setInterval(function(){ goGenerateDanmaku(); }, 2800 + Math.random()*2500); }
function goStopDanmaku(){ if(goDanmakuTimer){ clearInterval(goDanmakuTimer); goDanmakuTimer = null; } }
function goGenerateDanmaku(){
  var s = goState;
  var area = document.getElementById('go-danmaku-area');
  if(!area) return;
  var catMap = {
    auto:'\u81ea\u52a8\u6df7\u5408\u98ce\u683c\uff0c\u53ef\u4ee5\u662f\u641e\u7b11\u3001\u4e13\u4e1a\u6216\u968f\u610f\u8bc4\u8bba',
    funny:'\u641e\u7b11\u62bd\u8c61\u98ce\u683c\uff0c\u7528\u7f51\u7edc\u68d7\u548c\u8f7b\u677e\u53e3\u543b\u8bc4\u8bba',
    pro:'\u4e13\u4e1a\u98ce\u683c\uff0c\u4ece\u4e13\u4e1a\u89d2\u5ea6\u5206\u6790\u8bc4\u4ef7',
    simp:'\u5938\u5938\u98ce\u683c\uff0c\u70ed\u60c5\u8d5e\u7f8e\u4e3b\u64ad',
    hate:'\u6bd2\u820c\u98ce\u683c\uff0c\u6311\u523a\u4f46\u4e0d\u4eba\u8eab\u653b\u51fb',
    custom: s.danmakuCustom || '\u968f\u610f\u8bc4\u8bba'
  };
  var typeMap = {ecommerce:'\u5e26\u8d27\u76f4\u64ad',game:'\u6e38\u620f\u76f4\u64ad',couple:'\u60c5\u4fa3Q&A\u76f4\u64ad',asmr:'ASMR\u76f4\u64ad',voice:'\u8bed\u97f3\u5385\u76f4\u64ad',beauty:'\u7f8e\u5986\u76f4\u64ad'};
  var wbCtx = '';
  if(s.worldBookBind && typeof worldBooks !== 'undefined' && worldBooks[s.worldBookBind]) wbCtx = '\n\u53c2\u8003\u4e16\u754c\u4e66: ' + (worldBooks[s.worldBookBind].content || '').substring(0,200);
  var npcNames = ['\u6e38\u5ba2'+Math.floor(Math.random()*9999),'\u8def\u4eba\u7532','\u5c0f\u53ef\u7231','\u5403\u74dc\u7fa4\u4f17','\u5927\u4f6c666','\u6f5c\u6c34\u5458','\u8def\u8fc7\u7684','\u7c89\u4e1d'+Math.floor(Math.random()*99),'\u840c\u65b0','\u8001\u7c89'];
  var npcName = npcNames[Math.floor(Math.random()*npcNames.length)];
  var fallback = ['\u4e3b\u64ad\u597d\u7a33','666','\u6765\u4e86\u6765\u4e86','\u54c8\u54c8\u54c8','\u58f0\u97f3\u597d\u597d\u542c','\u5b66\u5230\u4e86','\u51b2\u51b2\u51b2','\u592a\u725b\u4e86','\u5173\u6ce8\u4e86','\u7b11\u6b7b','\u8fd9\u4e5f\u80fd\u884c','\u7edd\u4e86','\u4e3b\u64ad\u68d2\u68d2','\u5df2\u4e09\u8fde','\u6cea\u76ee\u4e86','\u4e3b\u64ad\u58f0\u97f3\u597d\u751c'];
  goCallAI(
    '\u4f60\u6b63\u5728\u770b\u4e00\u4e2a'+typeMap[s.liveType]+'\uff0c\u4e3b\u64adID\u662f'+s.liveId+'\u3002\u8bf7\u7528'+catMap[s.danmakuCat]+'\u53d1\u4e00\u6761\u5f39\u5e55\uff0c\u4e0d\u8d85\u8fc730\u5b57\u3002'+wbCtx+'\n\u53ea\u8f93\u51fa\u5f39\u5e55\u5185\u5bb9\u3002',
    '\u4f60\u662f\u4e00\u4e2a\u76f4\u64ad\u89c2\u4f17\uff0c\u7528\u53e3\u8bed\u5316\u65b9\u5f0f\u53d1\u5f39\u5e55\u3002',
    function(text){
      var dm = (text || '').replace(/\n/g,'').substring(0,30) || fallback[Math.floor(Math.random()*fallback.length)];
      s.liveEvents = Array.isArray(s.liveEvents) ? s.liveEvents : [];
      s.liveEvents.push({type:'danmaku', text:dm, at:Date.now()});
      if(s.liveEvents.length > 80) s.liveEvents = s.liveEvents.slice(-80);
      var ev = document.getElementById('go-live-events'); if(ev) ev.textContent = s.liveEvents.length;
      var div = document.createElement('div');
      div.className = 'go-danmaku-item';
      div.textContent = npcName + ': ' + dm;
      area.appendChild(div);
      while(area.children.length > 8) area.removeChild(area.firstChild);
      setTimeout(function(){ if(div.parentNode) div.remove(); }, 5000);
      saveState();
    }
  );
  var vc = document.getElementById('go-viewer-count');
  if(vc){ var cur = parseInt(vc.textContent,10) || 100; cur += Math.floor(Math.random()*8-3); if(cur < 30) cur = 30; vc.textContent = cur; }
}
