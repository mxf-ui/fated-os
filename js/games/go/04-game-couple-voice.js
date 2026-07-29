/* ---- Game Live ---- */
function goRenderGame(){
  var games = [
    {name:'\u738b\u8005\u8363\u8000', color:'#1e3a5f'},
    {name:'\u7b2c\u4e94\u4eba\u683c', color:'#5f1e3a'},
    {name:'\u5149\u9047', color:'#3a5f1e'}
  ];
  var gHtml = games.map(function(g){
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'+
      '<div class="go-game-icon" style="background:'+g.color+';" onclick="goToast(\'\u53bb'+g.name+'\u6253\u6e38\u620f\u5427\uff0c\u6253\u5b8c\u4e0a\u4f20\u6218\u7ee9\u622a\u56fe\')"><span>'+esc(g.name.slice(0,1))+'</span></div>'+
      '<div style="font-size:12px;font-weight:600;color:#1a1a1a;">'+esc(g.name)+'</div></div>';
  }).join('');
  return '<div class="go-card"><div class="go-label">\u6e38\u620f\u76f4\u64ad</div><div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">\u9009\u62e9\u6e38\u620f\u5f00\u59cb\u6e38\u73a9\uff0c\u7ed3\u675f\u540e\u4e0a\u4f20\u6218\u7ee9\u622a\u56fe\u3002\u80dc\u5229\u5956\u52b11000\u3002</div><div class="go-game-launch">'+gHtml+'</div></div>'+
    '<div class="go-card"><div class="go-label">\u4e0a\u4f20\u6218\u7ee9\u622a\u56fe</div><div id="go-game-upload" style="border:1.5px dashed rgba(0,0,0,0.15);border-radius:12px;padding:24px;text-align:center;cursor:pointer;" onclick="goUploadGameScreenshot()"><div style="font-size:14px;color:#888;">\u70b9\u51fb\u4e0a\u4f20\u6218\u7ee9\u622a\u56fe</div></div></div>';
}
function goUploadGameScreenshot(){ goFileContext='game'; var fi=document.getElementById('go-file-input'); if(fi) fi.click(); }
function goAICheckGameResult(img){
  goToast('\u6b63\u5728\u5206\u6790\u6218\u7ee9...');
  var upload = document.getElementById('go-game-upload');
  if(upload){ upload.innerHTML = '<div style="font-size:14px;color:#555;">\u5206\u6790\u4e2d...</div>'; upload.style.cursor = 'default'; }
  goCallAIVision('\u8bf7\u5206\u6790\u8fd9\u5f20\u6e38\u620f\u622a\u56fe\uff0c\u5224\u65ad\u662f\u80dc\u5229\u8fd8\u662f\u5931\u8d25\u3002\u53ea\u56de\u7b54"\u80dc\u5229"\u6216"\u5931\u8d25"\u3002', img, function(text){
    if(!text){ var win = Math.random()>0.4; goToast(win?'\u5224\u5b9a: \u80dc\u5229! \u5956\u52b11000':'\u5224\u5b9a: \u5931\u8d25\uff0c\u518d\u63a5\u518d\u5389'); if(win) goEndLive(true,1000); else if(upload) upload.innerHTML = '<div style="font-size:14px;color:#888;">\u5224\u5b9a\u5931\u8d25\uff0c\u91cd\u65b0\u4e0a\u4f20</div>'; return; }
    var win = text.indexOf('\u80dc') >= 0 || text.indexOf('\u8d62') >= 0 || text.toLowerCase().indexOf('win') >= 0 || text.toLowerCase().indexOf('victor') >= 0;
    goToast(win?'\u5224\u5b9a: \u80dc\u5229! \u5956\u52b11000':'\u5224\u5b9a: \u5931\u8d25\uff0c\u518d\u63a5\u518d\u5389');
    if(win) goEndLive(true,1000); else if(upload){ upload.style.cursor='pointer'; upload.innerHTML='<div style="font-size:14px;color:#888;">\u5224\u5b9a\u5931\u8d25\uff0c\u70b9\u51fb\u91cd\u65b0\u4e0a\u4f20</div>'; }
  });
}

/* ---- Couple Q&A Live ---- */
function goNormalizeQuestion(q){ return String(q||'').replace(/^\s*\d+[.\u3001)\uff09-]?\s*/, '').replace(/[\uFF1F?\u3002\uFF01!\s]+$/g, '').trim(); }
function goQuestionKey(q){ return goNormalizeQuestion(q).replace(/\s+/g,'').toLowerCase(); }
function goWechatContactKeys(){
  if(typeof contacts === 'undefined') return [];
  return Object.keys(contacts).filter(function(k){ var c = contacts[k]; return k !== 'me' && c && !c.blocked && !c.isGroup; });
}
function goLocalQuestionPool(){
  return [
    '\u5982\u679c\u4eca\u5929\u53ea\u80fd\u4fdd\u7559\u4e00\u4e2a\u5173\u4e8e\u6211\u4eec\u7684\u8bb0\u5fc6\uff0c\u4f60\u4f1a\u9009\u54ea\u4e00\u4e2a\uff1f',
    '\u4f60\u89c9\u5f97\u6211\u4eec\u6700\u50cf\u60c5\u4fa3\u7684\u77ac\u95f4\u662f\u4ec0\u4e48\uff1f',
    '\u5982\u679c\u628a\u6211\u5199\u8fdb\u4f60\u7684\u4e16\u754c\u89c2\uff0c\u6211\u4f1a\u662f\u4ec0\u4e48\u8eab\u4efd\uff1f',
    '\u4f60\u6700\u5e0c\u671b\u6211\u4ee5\u540e\u6539\u6389\u7684\u4e00\u4e2a\u5c0f\u4e60\u60ef\u662f\u4ec0\u4e48\uff1f',
    '\u4f60\u89c9\u5f97\u6211\u4eec\u5435\u67b6\u540e\u6700\u9700\u8981\u5148\u505a\u4ec0\u4e48\uff1f',
    '\u5982\u679c\u7ed9\u6211\u4eec\u7684\u5173\u7cfb\u8bbe\u7f6e\u4e00\u4e2a\u5b89\u5168\u8bcd\uff0c\u4f1a\u662f\u4ec0\u4e48\uff1f',
    '\u4f60\u6700\u8fd1\u4e00\u6b21\u88ab\u6211\u6253\u52a8\u662f\u4ec0\u4e48\u65f6\u5019\uff1f',
    '\u4f60\u89c9\u5f97\u6211\u6700\u9700\u8981\u88ab\u504f\u7231\u7684\u5730\u65b9\u662f\u4ec0\u4e48\uff1f',
    '\u5982\u679c\u6211\u4eec\u4e00\u8d77\u642c\u5bb6\uff0c\u7b2c\u4e00\u4ef6\u8981\u4e70\u7684\u4e1c\u897f\u662f\u4ec0\u4e48\uff1f',
    '\u4f60\u89c9\u5f97\u6211\u4eec\u6700\u4e92\u8865\u7684\u5730\u65b9\u5728\u54ea\u91cc\uff1f',
    '\u5982\u679c\u672a\u6765\u4e00\u5e74\u53ea\u80fd\u5b8c\u6210\u4e00\u4e2a\u5171\u540c\u8ba1\u5212\uff0c\u4f60\u60f3\u9009\u4ec0\u4e48\uff1f',
    '\u4f60\u5e0c\u671b\u6211\u600e\u4e48\u54c4\u4f60\u624d\u6700\u6709\u6548\uff1f',
    '\u4f60\u89c9\u5f97\u6211\u4eec\u4ec0\u4e48\u65f6\u5019\u6700\u6709\u9b45\u529b\uff1f',
    '\u5982\u679c\u4eca\u5929\u4e92\u6362\u8eab\u4efd\uff0c\u4f60\u6700\u60f3\u4f53\u9a8c\u6211\u7684\u54ea\u90e8\u5206\u751f\u6d3b\uff1f',
    '\u6b64\u523b\u4f60\u6700\u60f3\u8ba9\u6211\u77e5\u9053\u7684\u4e00\u4ef6\u5c0f\u4e8b\u662f\u4ec0\u4e48\uff1f'
  ];
}
function goBuildUniqueQuestions(text, need){
  var used = Array.isArray(goState.qaUsedQuestions) ? goState.qaUsedQuestions : [];
  var seen = {};
  used.forEach(function(q){ seen[goQuestionKey(q)] = true; });
  var raw = String(text || '').split(/\n+/).map(goNormalizeQuestion).filter(function(q){ return q.length > 4; });
  var out = [];
  raw.concat(goLocalQuestionPool().sort(function(){ return Math.random()-0.5; })).forEach(function(q){
    var key = goQuestionKey(q);
    if(!key || seen[key]) return;
    seen[key] = true;
    out.push(/[\uFF1F?]$/.test(q) ? q : q + '\uff1f');
  });
  if(out.length < need){
    goState.qaUsedQuestions = [];
    seen = {};
    goLocalQuestionPool().sort(function(){ return Math.random()-0.5; }).forEach(function(q){ var key = goQuestionKey(q); if(!seen[key]){ seen[key]=true; out.push(q); } });
  }
  return out.slice(0, need);
}
function goContactPersonaText(id){
  var c = typeof contacts !== 'undefined' && contacts[id] ? contacts[id] : null;
  if(!c) return '';
  return [c.name, c.wxid ? 'WeChat ID: '+c.wxid : '', c.bio || '', c.persona || c.tone || '', c.userPrompt || '', c.memory && c.memory.summary ? '\u8bb0\u5fc6: '+c.memory.summary : ''].filter(Boolean).join('\n');
}
function goRenderCouple(){
  var s = goState;
  var pid = s.qaPartner || s.livePartner;
  var pName = pid && typeof contacts !== 'undefined' && contacts[pid] ? contacts[pid].name : '';
  if(!pid){
    return '<div class="go-card"><div class="go-label">\u60c5\u4fa3Q&A</div><div style="font-size:13px;color:#45685a;line-height:1.5;margin-bottom:12px;">\u9009\u62e9\u4e00\u4f4d WeChat \u8054\u7cfb\u4eba\u8fde\u9ea6\u3002\u95ee\u9898\u7531\u8bbe\u7f6e\u91cc\u7684 API \u751f\u6210\uff0c\u5e76\u907f\u5f00\u5386\u53f2\u9898\u76ee\u548c\u672c\u8f6e\u91cd\u590d\u3002</div><button class="go-btn primary" onclick="goOpenPartnerModal()">\u9009\u62e9\u8fde\u9ea6\u5bf9\u8c61</button></div>';
  }
  if(s.qaQuestions.length === 0){
    return '<div class="go-card"><div class="go-label">\u60c5\u4fa3Q&A - \u8fde\u9ea6: '+esc(pName)+'</div><div style="text-align:center;padding:20px;font-size:14px;color:#78a392;">\u6b63\u5728\u751f\u6210\u4e0d\u91cd\u590d\u95ee\u9898...</div></div>';
  }
  if(s.qaCurrent >= s.qaQuestions.length){
    return '<div class="go-card" style="text-align:center;padding:24px;"><div style="font-size:20px;font-weight:700;margin-bottom:8px;color:#17392d;">\u7b54\u9898\u5b8c\u6210</div><div style="font-size:14px;color:#78a392;margin-bottom:16px;">\u4f60\u4eec\u5b8c\u6210\u4e86 '+s.qaQuestions.length+' \u9053\u4e0d\u91cd\u590d\u95ee\u9898</div><button class="go-btn primary" onclick="goEndLive(true,1000)">\u9886\u53d6\u5de5\u8d44 \u00a51000</button></div>';
  }
  var q = s.qaQuestions[s.qaCurrent];
  var prog = (s.qaCurrent/s.qaQuestions.length)*100;
  return '<div class="go-card"><div class="go-label">Q'+(s.qaCurrent+1)+'/'+s.qaQuestions.length+' ? WeChat \u8fde\u9ea6: '+esc(pName)+'</div><div class="go-progress"><div class="go-progress-bar" style="width:'+prog+'%"></div></div><div class="go-qa-card" style="margin-top:12px;"><div class="go-qa-q">'+esc(q)+'</div><input class="go-qa-input" id="go-qa-answer" placeholder="\u8f93\u5165\u4f60\u7684\u56de\u7b54" onkeydown="if(event.key===\'Enter\')goAnswerQA()"></div><div id="go-qa-partner" style="margin-top:10px;"></div><button class="go-btn primary" style="margin-top:10px;" onclick="goAnswerQA()">\u63d0\u4ea4\u56de\u7b54</button></div>';
}
function goOpenPartnerModal(){
  var list = document.getElementById('go-partner-list');
  var cs = goWechatContactKeys();
  if(!list) return;
  if(cs.length === 0){ list.innerHTML = '<div style="text-align:center;color:#78a392;padding:12px;">\u6682\u65e0\u53ef\u7528 WeChat \u8054\u7cfb\u4eba</div>'; }
  else {
    list.innerHTML = cs.map(function(k){
      var c = contacts[k];
      return '<div class="go-buyer-row go-partner-row" style="cursor:pointer;" onclick="goSelectPartner(\''+k+'\')"><div class="av" style="'+goContactAvatarStyle(k)+'"></div><div style="flex:1;"><div style="font-size:14px;font-weight:700;color:#17392d;">'+esc(c.name||'\u8054\u7cfb\u4eba')+'</div><div style="font-size:11px;color:#78a392;margin-top:2px;">'+esc(c.wxid||k)+' ? WeChat \u540c\u6b65</div></div><div class="go-link-dot"></div></div>';
    }).join('');
  }
  goOpenModal('go-modal-partner');
}
function goSelectPartner(id){
  if(!id || typeof contacts === 'undefined' || !contacts[id]) return;
  goState.livePartner = id;
  if(goState.liveType === 'couple') goState.qaPartner = id;
  goCloseModal('go-modal-partner');
  goToast('\u5df2\u9009\u62e9 '+contacts[id].name+' \u8fde\u9ea6');
  if(goState.isLive && goState.liveType === 'couple') goGenerateQA();
  else if(goState.isLive) goRenderLive();
  else goRenderSetup();
  saveState();
}
function goGenerateQA(){
  var s = goState;
  s.qaPartner = s.livePartner || s.qaPartner;
  var avoid = (Array.isArray(s.qaUsedQuestions) ? s.qaUsedQuestions.slice(-80) : []).join('\uff1b');
  goCallAI('\u8bf7\u751f\u621020\u4e2a\u60c5\u4fa3Q&A\u95ee\u9898\uff0c\u6bcf\u884c\u4e00\u4e2a\u3002\u8981\u6c42\uff1a\u6709\u604b\u7231\u5f20\u529b\u3001\u6709\u751f\u6d3b\u7ec6\u8282\u3001\u6709\u672a\u6765\u89c4\u5212\uff1b\u4e0d\u8981\u7f16\u53f7\uff1b\u4e0d\u8981\u91cd\u590d\u8fd9\u4e9b\u5386\u53f2\u9898\u76ee\uff1a'+avoid+'\u3002\u672c\u8f6eID\uff1a'+(s.qaRoundSeed||Date.now())+'\u3002', '\u4f60\u662f\u60c5\u4fa3\u4e92\u52a8\u6e38\u620f\u7b56\u5212\uff0c\u5fc5\u987b\u4fdd\u8bc1\u6bcf\u9053\u9898\u5f7c\u6b64\u4e0d\u540c\uff0c\u5e76\u5c3d\u91cf\u907f\u5f00\u5386\u53f2\u9898\u76ee\u3002', function(text){
    s.qaQuestions = goBuildUniqueQuestions(text, 20);
    s.qaUsedQuestions = (Array.isArray(s.qaUsedQuestions) ? s.qaUsedQuestions : []).concat(s.qaQuestions).slice(-220);
    goRenderLive();
    saveState();
  });
  goRenderLive();
}
function goAnswerQA(){
  var s = goState, inp = document.getElementById('go-qa-answer');
  if(!inp) return;
  var text = inp.value.trim();
  if(!text){ goToast('\u8bf7\u8f93\u5165\u56de\u7b54'); return; }
  var pid = s.qaPartner || s.livePartner;
  var pName = typeof contacts !== 'undefined' && contacts[pid] ? contacts[pid].name : '\u5bf9\u65b9';
  var pDiv = document.getElementById('go-qa-partner');
  if(pDiv) pDiv.innerHTML = '<div class="go-qa-card"><div class="go-label">\u4f60\u7684\u56de\u7b54</div><div class="go-qa-a">'+esc(text)+'</div></div>';
  var q = s.qaQuestions[s.qaCurrent];
  var btn = document.querySelector('#go-live-content .go-btn.primary'); if(btn) btn.style.display='none';
  goCallAI('\u4f60\u73b0\u5728\u662f'+pName+'\uff0c\u6b63\u5728\u548c\u4f34\u4fa3\u505a\u60c5\u4fa3Q&A\u3002\u95ee\u9898\u662f:"'+q+'"\u3002\u5bf9\u65b9\u7684\u56de\u7b54\u662f:"'+text+'"\u3002\n\u8054\u7cfb\u4eba\u8d44\u6599\uff1a\n'+goContactPersonaText(pid)+'\n\u8bf7\u4ee5'+pName+'\u7684\u8eab\u4efd\u56de\u7b54\u8fd9\u4e2a\u95ee\u9898\uff0c\u81ea\u7136\u3001\u6709\u4e2a\u6027\uff0c\u4e0d\u8d85\u8fc750\u5b57\u3002', '\u4f60\u662f WeChat \u8054\u7cfb\u4eba\u8fde\u9ea6\u89d2\u8272\uff0c\u8bf7\u4e25\u683c\u4ee3\u5165\u8054\u7cfb\u4eba\u8d44\u6599\u548c\u5386\u53f2\u8bb0\u5fc6\u56de\u7b54\u3002', function(result){
    if(!result) result = '\u6211\u8fd8\u5728\u60f3\uff0c\u4f46\u8fd9\u4e2a\u95ee\u9898\u771f\u7684\u5f88\u50cf\u6211\u4eec\u4f1a\u804a\u7684\u4e8b\u3002';
    if(pDiv) pDiv.innerHTML += '<div class="go-qa-card" style="margin-top:8px;"><div class="go-label">'+esc(pName)+'\u7684\u56de\u7b54</div><div class="go-qa-a">'+esc(result)+'</div></div><button class="go-btn primary" style="margin-top:8px;" onclick="goNextQA()">\u4e0b\u4e00\u9898</button>';
  });
}
function goNextQA(){ goState.qaCurrent++; goRenderLive(); saveState(); }

/* ---- ASMR / Voice Hall / Beauty Live ---- */
function goRenderVoice(type){
  var s = goState;
  var tn = {asmr:'ASMR', voice:'\u8bed\u97f3\u5385', beauty:'\u7f8e\u5986'};
  var desc = {
    asmr:'\u70b9\u51fb\u6309\u94ae\u5f00\u59cb\u4f60\u7684ASMR\u8868\u6f14\uff0c\u89c2\u4f17\u4f1a\u7ed9\u51fa\u53cd\u9988\u3002\u5b8c\u62103\u6b21\u8bed\u97f3\u4e92\u52a8\u5373\u53ef\u83b7\u5f97\u5956\u52b1\u3002',
    voice:'\u70b9\u51fb\u6309\u94ae\u5f00\u59cb\u5531\u6b4c\u6216\u8bed\u97f3\u804a\u5929\uff0c\u89c2\u4f17\u4f1a\u4e0e\u4f60\u4e92\u52a8\u3002\u5b8c\u62103\u6b21\u8bed\u97f3\u4e92\u52a8\u5373\u53ef\u83b7\u5f97\u5956\u52b1\u3002',
    beauty:'\u70b9\u51fb\u6309\u94ae\u5f00\u59cb\u7f8e\u5986\u6559\u7a0b\u8bb2\u89e3\uff0c\u89c2\u4f17\u4f1a\u6839\u636e\u8bb2\u89e3\u53cd\u9988\u3002\u5b8c\u62103\u6b21\u8bed\u97f3\u4e92\u52a8\u5373\u53ef\u83b7\u5f97\u5956\u52b1\u3002'
  };
  var prog = s.asmrProgress, need = 3;
  return '<div class="go-card"><div class="go-label">'+tn[type]+'\u76f4\u64ad</div><div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">'+desc[type]+'</div><div class="go-progress"><div class="go-progress-bar" style="width:'+(prog/need*100)+'%"></div></div><div style="text-align:center;font-size:12px;color:#888;margin-top:6px;">'+prog+'/'+need+' \u6b21\u8bed\u97f3\u4e92\u52a8</div><div style="text-align:center;margin-top:16px;"><button class="go-btn primary" id="go-voice-btn" onclick="goVoiceInput(\''+type+'\')">'+(prog>=need?'\u5df2\u5b8c\u6210':'\u5f00\u59cb\u8bed\u97f3')+'</button></div><div id="go-voice-feedback" style="margin-top:12px;"></div></div>';
}
function goCompleteVoiceSession(text){
  var s = goState;
  var pm = {
    asmr:'\u4e00\u4e2aASMR\u4e3b\u64ad\u6b63\u5728\u8868\u6f14\uff0c\u5185\u5bb9\u662f:"'+text+'"\u3002\u8bf7\u4ee5\u542c\u4f17\u8eab\u4efd\u7ed9\u51fa\u81ea\u7136\u53cd\u5e94\uff0c\u4e0d\u8d85\u8fc730\u5b57\u3002',
    voice:'\u4e00\u4e2a\u8bed\u97f3\u5385\u4e3b\u64ad\u6b63\u5728\u5531\u6b4c/\u8bf4\u8bdd\uff0c\u5185\u5bb9\u662f:"'+text+'"\u3002\u8bf7\u4ee5\u542c\u4f17\u8eab\u4efd\u7ed9\u51fa\u81ea\u7136\u53cd\u5e94\uff0c\u4e0d\u8d85\u8fc730\u5b57\u3002',
    beauty:'\u4e00\u4e2a\u7f8e\u5986\u4e3b\u64ad\u6b63\u5728\u8bb2\u89e3\uff0c\u5185\u5bb9\u662f:"'+text+'"\u3002\u8bf7\u4ee5\u89c2\u4f17\u8eab\u4efd\u7ed9\u51fa\u81ea\u7136\u53cd\u5e94\uff0c\u4e0d\u8d85\u8fc730\u5b57\u3002'
  };
  goToast('\u6b63\u5728\u503e\u542c...');
  goCallAI(pm[s.liveType] || pm.voice, '\u4f60\u662f\u4e00\u4e2a\u76f4\u64ad\u542c\u4f17\u3002', function(result){
    if(!result) result = '\u4e3b\u64ad\u597d\u68d2\u554a\uff01';
    s.asmrProgress++;
    var fb = document.getElementById('go-voice-feedback');
    if(fb) fb.innerHTML = '<div class="go-qa-card"><div class="go-qa-a">'+esc(result)+'</div></div>';
    goToast('\u4e92\u52a8 '+s.asmrProgress+'/3');
    if(s.asmrProgress >= 3) setTimeout(function(){ goEndLive(true,1000); }, 1500); else goRenderLive();
    saveState();
  });
}
