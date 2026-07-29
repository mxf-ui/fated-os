function goStartLive(){
  var s = goState;
  s.liveId = (document.getElementById('go-live-id').value || '').trim();
  s.danmakuCustom = (document.getElementById('go-dm-custom').value || '').trim();
  s.worldBookBind = document.getElementById('go-wb-bind').value;
  if(!s.liveType){ goToast('请选择直播类型'); return; }
  if(!s.liveId){ goToast('请输入直播ID'); return; }
  s.isLive = true;
  s.liveStartTime = Date.now();
  goLiveSeconds = 0;
  s.orders = 0;
  s.asmrProgress = 0;
  s.qaCurrent = 0;
  s.qaQuestions = [];
  s.qaPartner = '';
  s.qaRoundSeed = 'round-' + Date.now() + '-' + Math.floor(Math.random()*100000);
  s.liveEvents = [];
  document.getElementById('go-page-setup').classList.remove('active');
  document.getElementById('go-page-live').classList.add('active');
  var tn = {ecommerce:'带货直播',game:'游戏直播',couple:'情侣Q&A',asmr:'ASMR直播',voice:'语音厅',beauty:'美妆直播'};
  document.getElementById('go-live-title').textContent = tn[s.liveType] || '直播中';
  if(goLiveTimer) clearInterval(goLiveTimer);
  goLiveTimer = setInterval(function(){
    goLiveSeconds++;
    var m = Math.floor(goLiveSeconds/60), sec = goLiveSeconds%60;
    var el = document.getElementById('go-live-timer');
    if(el) el.textContent = (m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
  }, 1000);
  goRenderLive();
  saveState();
}

/* ---- Render Live Page ---- */
function goRenderLive(){
  var s = goState;
  var c = document.getElementById('go-live-content');
  if(!c) return;
  var avHtml = s.liveAvatar
    ? '<div class="go-live-avatar go-avatar-float" style="background-image:url('+s.liveAvatar+')"></div>'
    : '<div class="go-live-avatar go-avatar-float" style="background:#444;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;">'+(s.liveId[0]||'G')+'</div>';
  var stage = '<div class="go-live-stage" id="go-live-stage">'+
    '<div class="go-live-bg" id="go-live-bg"></div>'+
    '<div class="go-live-type-badge">'+({ecommerce:'带货',game:'游戏',couple:'情侣Q&A',asmr:'ASMR',voice:'语音厅',beauty:'美妆'}[s.liveType]||'')+'</div>'+
    '<div class="go-live-viewers"><span id="go-viewer-count">'+Math.floor(Math.random()*200+80)+'</span> 观看</div>'+
    '<div class="go-live-overlay">'+avHtml+'<div class="go-live-id">'+s.liveId+'</div><div class="go-live-ai-chip">'+(goApiReady()?'AI\u5df2\u63a5\u5165':'\u5f85\u914d\u7f6eAPI')+'</div></div>'+
    '<div class="go-danmaku-area" id="go-danmaku-area"></div>'+
    '</div>';
  var bgHtml = '<div class="go-card" style="margin-top:12px;"><div class="go-label">直播背景</div><div class="go-bg-picker" id="go-bg-picker"></div></div>';
  var typeHtml = '';
  if(s.liveType==='ecommerce') typeHtml = goRenderEcommerce();
  else if(s.liveType==='game') typeHtml = goRenderGame();
  else if(s.liveType==='couple') typeHtml = goRenderCouple();
  else typeHtml = goRenderVoice(s.liveType);
  var dashHtml = '<div class="go-live-dashboard">'+
    '<div><b id="go-live-events">'+((s.liveEvents && s.liveEvents.length) || 0)+'</b><small>AI\u5f39\u5e55</small></div>'+
    '<div><b>'+((s.qaUsedQuestions && s.qaUsedQuestions.length) || 0)+'</b><small>\u95ee\u7b54\u53bb\u91cd</small></div>'+
    '<div><b>'+(goApiReady()?'ON':'OFF')+'</b><small>\u5168\u5c40API</small></div>'+
    '</div>';
  c.innerHTML = stage + dashHtml + bgHtml + typeHtml;
  var bgs = ['linear-gradient(135deg,#2a2a2a,#1a1a1a)','linear-gradient(135deg,#1a3a5a,#0d1f3a)','linear-gradient(135deg,#3a1a3a,#1a0d2a)','linear-gradient(135deg,#1a3a1a,#0d2a0d)','linear-gradient(135deg,#3a2a1a,#2a1a0d)'];
  var bp = document.getElementById('go-bg-picker');
  if(bp) bp.innerHTML = bgs.map(function(bg,i){
    return '<div class="go-bg-swatch'+(s.liveBg===i?' selected':'')+'" style="background:'+bg+'" onclick="goSwitchBg('+i+')"></div>';
  }).join('');
  goSwitchBg(s.liveBg);
  goStartDanmaku();
}

function goSwitchBg(idx){
  goState.liveBg = idx;
  var bgs = ['linear-gradient(135deg,#2a2a2a,#1a1a1a)','linear-gradient(135deg,#1a3a5a,#0d1f3a)','linear-gradient(135deg,#3a1a3a,#1a0d2a)','linear-gradient(135deg,#1a3a1a,#0d2a0d)','linear-gradient(135deg,#3a2a1a,#2a1a0d)'];
  var bg = document.getElementById('go-live-bg');
  if(bg) bg.style.background = bgs[idx]||bgs[0];
  document.querySelectorAll('.go-bg-swatch').forEach(function(sw,i){ sw.classList.toggle('selected', i===idx); });
}

/* ---- Danmaku ---- */
function goStartDanmaku(){
  goStopDanmaku();
  goDanmakuTimer = setInterval(function(){ goGenerateDanmaku(); }, 2800 + Math.random()*2500);
}
function goStopDanmaku(){
  if(goDanmakuTimer){ clearInterval(goDanmakuTimer); goDanmakuTimer = null; }
}
function goGenerateDanmaku(){
  var s = goState;
  var area = document.getElementById('go-danmaku-area');
  if(!area) return;
  var catMap = {
    auto:'自动混合风格，可以是搞笑的、专业的、或随意评论',
    funny:'搞笑抽象风格，用网络梗、无厘头的方式评论',
    pro:'专业风格，从专业角度分析评价',
    simp:'舔狗风格，疯狂夸赞主播',
    hate:'黑粉风格，故意挑刺找茬但不太过分',
    custom: s.danmakuCustom || '随意评论'
  };
  var typeMap = {ecommerce:'带货直播',game:'游戏直播',couple:'情侣Q&A直播',asmr:'ASMR直播',voice:'语音厅直播',beauty:'美妆直播'};
  var wbCtx = '';
  if(s.worldBookBind && typeof worldBooks!=='undefined' && worldBooks[s.worldBookBind]){
    wbCtx = '参考世界书: ' + (worldBooks[s.worldBookBind].content||'').substring(0,200);
  }
  var npcNames = ['游客'+Math.floor(Math.random()*9999),'路人甲','小可爱','吃瓜群众','大佬666','潜水员','路过的','粉丝'+Math.floor(Math.random()*99),'萌新','老粉'];
  var npcName = npcNames[Math.floor(Math.random()*npcNames.length)];
  var fbPool = ['主播好厉害','666','来了来了','哈哈哈哈','声音好好听','学习了','已下单','冲冲冲','太牛了','主播多大了','关注了','第一次来','好可爱','这操作我服了','主播加油','好专业','学到了','笑死','强无敌','冲鸭','主播好好看','我酸了','慕名而来','主播声音好甜','这也能行','绝了','主播棒棒','已三连','泪目了','主播好温柔'];
  goCallAI(
    '你正在观看一个'+typeMap[s.liveType]+'，主播ID是'+s.liveId+'。请用'+catMap[s.danmakuCat]+'发一条弹幕，不超过20字。'+wbCtx+'只输出弹幕内容。',
    '你是一个直播观众，用口语化方式发弹幕。',
    function(text){
      var dm = (text||'').replace(/\n/g,'').substring(0,30) || fbPool[Math.floor(Math.random()*fbPool.length)];
      s.liveEvents = Array.isArray(s.liveEvents) ? s.liveEvents : [];
      s.liveEvents.push({type:'danmaku', text:dm, at:Date.now()});
      if(s.liveEvents.length>80) s.liveEvents = s.liveEvents.slice(-80);
      var ev = document.getElementById('go-live-events'); if(ev) ev.textContent = s.liveEvents.length;
      var div = document.createElement('div');
      div.className = 'go-danmaku-item';
      div.textContent = npcName+': '+dm;
      area.appendChild(div);
      while(area.children.length>8) area.removeChild(area.firstChild);
      setTimeout(function(){ if(div.parentNode) div.remove(); }, 5000);
    }
  );
  var vc = document.getElementById('go-viewer-count');
  if(vc){
    var cur = parseInt(vc.textContent)||100;
    cur += Math.floor(Math.random()*8-3);
    if(cur<30) cur=30;
    vc.textContent = cur;
  }
}
