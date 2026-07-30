/* ============ DREAMCORE APP ============ */
var dreamState = null;
var dreamBusy = false;

function dreamDefaultSlot(i){
  return {id:'slot-'+(i+1), name:'SAVE '+(i+1), world:'', updatedAt:0, runs:[], rewards:[]};
}
function dreamDefault(){
  return {activeSlot:0, selectedContacts:[], phase:'setup', slots:[dreamDefaultSlot(0), dreamDefaultSlot(1), dreamDefaultSlot(2)], run:null};
}
function dreamEnsureStateShape(){
  if(!dreamState) dreamState = dreamDefault();
  var d = dreamDefault();
  if(!Array.isArray(dreamState.slots)) dreamState.slots = d.slots;
  for(var i=0;i<3;i++){
    dreamState.slots[i] = Object.assign(dreamDefaultSlot(i), dreamState.slots[i] || {});
    if(!Array.isArray(dreamState.slots[i].runs)) dreamState.slots[i].runs = [];
    if(!Array.isArray(dreamState.slots[i].rewards)) dreamState.slots[i].rewards = [];
  }
  if(typeof dreamState.activeSlot !== 'number') dreamState.activeSlot = 0;
  dreamState.activeSlot = Math.max(0, Math.min(2, dreamState.activeSlot));
  if(!Array.isArray(dreamState.selectedContacts)) dreamState.selectedContacts = [];
  dreamState.selectedContacts = dreamState.selectedContacts.filter(function(id){ return contacts && contacts[id] && id !== 'me' && !contacts[id].isGroup; });
  if(!dreamState.phase) dreamState.phase = 'setup';
  if(dreamState.run){
    if(!Array.isArray(dreamState.run.messages)) dreamState.run.messages = [];
    if(!Array.isArray(dreamState.run.choices)) dreamState.run.choices = [];
    if(!Array.isArray(dreamState.run.usedCards)) dreamState.run.usedCards = [];
    if(!Array.isArray(dreamState.run.rewards)) dreamState.run.rewards = [];
  }
  return dreamState;
}
function dreamSlot(){ dreamEnsureStateShape(); return dreamState.slots[dreamState.activeSlot]; }
function dreamContactIds(){
  return Object.keys(contacts || {}).filter(function(id){ return id !== 'me' && contacts[id] && !contacts[id].isGroup; });
}
function dreamContactName(id){ return contacts && contacts[id] ? (contacts[id].displayName || contacts[id].name || id) : id; }
function dreamAvatar(id){
  var c = contacts && contacts[id] ? contacts[id] : null;
  if(c && c.avatar) return '<div class="dream-avatar" style="background-image:url('+c.avatar+');"></div>';
  var n = dreamContactName(id).slice(0,1).toUpperCase();
  return '<div class="dream-avatar">'+esc(n)+'</div>';
}
function initDreamCore(){
  dreamEnsureStateShape();
  dreamRenderSetup();
  dreamRenderRun();
}
function dreamRenderSetup(){
  dreamEnsureStateShape();
  var slot = dreamSlot();
  var slots = document.getElementById('dream-save-slots');
  if(slots){
    slots.innerHTML = dreamState.slots.map(function(s, i){
      var active = i === dreamState.activeSlot ? ' active' : '';
      var filled = s.world ? ' filled' : '';
      var time = s.updatedAt ? dreamFormatTime(s.updatedAt) : '\u7a7a\u5b58\u6863';
      return '<button type="button" class="dream-slot'+active+filled+'" onclick="dreamSelectSlot('+i+')"><b>'+esc(s.name)+'</b><small>'+esc(time)+'</small></button>';
    }).join('');
  }
  var input = document.getElementById('dream-world-input');
  if(input) input.value = slot.world || '';
  var api = document.getElementById('dream-api-status');
  if(api){
    var p = dreamActiveApiProfile();
    var ready = !!(p && p.key && p.endpoint && p.model);
    api.innerHTML = ready ? '<b>\u5168\u5c40 API \u5df2\u8fde\u63a5</b><small>'+esc(p.name || p.model || '\u5f53\u524d\u6a21\u578b')+'</small>' : '<b>\u5168\u5c40 API \u672a\u914d\u7f6e</b><small>\u8bf7\u5230\u8bbe\u7f6e\u91cc\u7684 API Config \u4fdd\u5b58\u6a21\u578b</small>';
    api.classList.toggle('warn', !ready);
  }
  var list = document.getElementById('dream-contact-list');
  if(list){
    var ids = dreamContactIds();
    list.innerHTML = ids.length ? ids.map(function(id){
      var on = dreamState.selectedContacts.indexOf(id) >= 0 ? ' selected' : '';
      var c = contacts[id] || {};
      return '<button type="button" class="dream-contact'+on+'" onclick="dreamToggleContact(\''+esc(id).replace(/'/g,'&#39;')+'\')">'+dreamAvatar(id)+'<span><b>'+esc(dreamContactName(id))+'</b><small>'+esc(c.bio || c.persona || c.tone || '\u5fae\u4fe1\u8054\u7cfb\u4eba')+'</small></span></button>';
    }).join('') : '<div class="dream-empty">\u8fd8\u6ca1\u6709\u53ef\u7528\u7684 WeChat \u8054\u7cfb\u4eba</div>';
  }
  var meta = document.getElementById('dream-slot-meta');
  if(meta){
    meta.textContent = slot.runs.length ? ('\u5df2\u5b8c\u6210 '+slot.runs.length+' \u6b21\u526f\u672c / \u5956\u52b1 '+slot.rewards.length+' \u4ef6') : '\u8bbe\u5b9a\u4e16\u754c\u540e\u53ef\u4ee5\u542f\u52a8\u526f\u672c';
  }
}
function dreamFormatTime(ts){
  var d = new Date(ts);
  return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes());
}
function dreamSelectSlot(i){
  dreamEnsureStateShape();
  dreamState.activeSlot = Math.max(0, Math.min(2, i));
  dreamState.phase = 'setup';
  dreamState.run = null;
  dreamRenderSaveBurst('\u8bfb\u53d6\u5b58\u6863');
  dreamRenderSetup();
  dreamRenderRun();
  saveState();
}
function dreamSaveWorld(){
  dreamEnsureStateShape();
  var input = document.getElementById('dream-world-input');
  var slot = dreamSlot();
  slot.world = (input && input.value ? input.value : '').trim();
  slot.updatedAt = Date.now();
  dreamRenderSaveBurst('\u68a6\u6838\u5199\u5165');
  dreamRenderSetup();
  saveState();
}
function dreamRenderSaveBurst(text){
  var burst = document.getElementById('dream-save-burst');
  if(!burst) return;
  burst.innerHTML = '<div class="dream-save-ring"></div><div class="dream-save-text">'+esc(text || '\u4fdd\u5b58\u4e2d')+'</div>';
  burst.classList.remove('show');
  void burst.offsetWidth;
  burst.classList.add('show');
  clearTimeout(burst._timer);
  burst._timer = setTimeout(function(){ burst.classList.remove('show'); }, 1150);
}
function dreamToggleContact(id){
  dreamEnsureStateShape();
  var idx = dreamState.selectedContacts.indexOf(id);
  if(idx >= 0) dreamState.selectedContacts.splice(idx, 1);
  else dreamState.selectedContacts.push(id);
  dreamRenderSetup();
  saveState();
}
function dreamActiveApiProfile(){
  if(typeof getActiveApiProfile === 'function') return getActiveApiProfile();
  if(typeof apiConfig === 'undefined') return null;
  if(apiConfig.profiles && apiConfig.profiles.length) return apiConfig.profiles.find(function(p){ return p.id === apiConfig.activeProfileId; }) || apiConfig.profiles[0];
  return apiConfig.models && (apiConfig.models.custom || apiConfig.models[apiConfig.activeModel]);
}
function dreamParseAIText(data){
  if(!data) return '';
  if(typeof data.content === 'string') return data.content;
  if(typeof data.reply === 'string') return data.reply;
  if(data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content || '';
  if(data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) return data.candidates[0].content.parts.map(function(p){ return p.text || ''; }).join('');
  return '';
}
function dreamCallAI(prompt, systemPrompt, cb){
  var p = dreamActiveApiProfile();
  if(!p || !p.key || !p.endpoint || !p.model){ cb(null); return; }
  var msgs = [];
  if(systemPrompt) msgs.push({role:'system', content:systemPrompt});
  msgs.push({role:'user', content:prompt});
  fetch('/api/chat', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({messages:msgs, provider:'custom', key:p.key, endpoint:p.endpoint, dataModel:p.model, model:p.model, apiFormat:p.apiFormat || 'openai', max_tokens:560, temperature:typeof p.temperature === 'number' ? p.temperature : 0.86, stream:false})
  }).then(function(r){ return r.json(); }).then(function(d){ cb(dreamCleanText(dreamParseAIText(d))); }).catch(function(){ cb(null); });
}
function dreamCleanText(text){
  return String(text || '').replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/\s+/g, ' ').trim();
}
function dreamStartRun(){
  dreamEnsureStateShape();
  dreamSaveWorld();
  var slot = dreamSlot();
  if(!slot.world){ dreamToast('\u8bf7\u5148\u5199\u5165\u4e16\u754c\u8bbe\u5b9a'); return; }
  if(!dreamState.selectedContacts.length){ dreamToast('\u8bf7\u9009\u62e9\u81f3\u5c11\u4e00\u4f4d WeChat \u8054\u7cfb\u4eba'); return; }
  dreamState.phase = 'vortex';
  dreamState.run = {id:'dream-'+Date.now().toString(36), startedAt:Date.now(), world:slot.world, contacts:dreamState.selectedContacts.slice(), progress:0, score:0, rank:'', rewards:[], messages:[], choices:[], usedCards:[]};
  dreamRenderRun();
  saveState();
  dreamRenderVortex(function(){
    dreamContactFirstMessage(function(){ dreamGenerateScene(); });
  });
}
function dreamRenderVortex(done){
  var v = document.getElementById('dream-vortex');
  if(v) v.classList.add('active');
  setTimeout(function(){ if(v) v.classList.remove('active'); if(done) done(); }, 1700);
}
function dreamContactFirstMessage(done){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run) return;
  var first = run.contacts[0];
  var c = contacts[first] || {};
  var prompt = '\u4e16\u754c\u8bbe\u5b9a:\n'+run.world+'\n\n\u4f60\u662f WeChat \u8054\u7cfb\u4eba '+dreamContactName(first)+'\u3002\u4f60\u521a\u88ab\u62c9\u5165\u8fd9\u4e2a\u68a6\u6838\u526f\u672c\u3002\u8bf7\u4f60\u5fc5\u987b\u5148\u5f00\u53e3\u53d1\u8d77\u4e00\u53e5\u804a\u5929\uff0c\u4e0d\u8d85\u8fc745\u5b57\uff0c\u4e0d\u8981\u65c1\u767d\uff0c\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\u3002\n\u8054\u7cfb\u4eba\u8d44\u6599:\n'+(c.persona || c.userPrompt || c.tone || c.bio || '\u6682\u65e0');
  dreamBusy = true;
  dreamCallAI(prompt, '\u4f60\u662f\u4e00\u4f4d WeChat \u8054\u7cfb\u4eba\uff0c\u8bf7\u4ee5\u89d2\u8272\u672c\u4eba\u53e3\u543b\u8bf4\u8bdd\u3002', function(text){
    dreamBusy = false;
    text = text || dreamFallbackContact(first);
    run.messages.push({role:'contact', contactId:first, text:text, at:Date.now()});
    dreamState.phase = 'run';
    dreamRenderRun();
    saveState();
    if(done) done();
  });
}
function dreamFallbackContact(id){
  var pool = ['\u6211\u5148\u8bf4\uff0c\u8fd9\u5730\u65b9\u4e0d\u50cf\u666e\u901a\u7684\u68a6\u3002','\u522b\u6025\u7740\u5f80\u524d\u8d70\uff0c\u6211\u542c\u89c1\u6709\u4e1c\u897f\u5728\u53eb\u6211\u4eec\u3002','\u6211\u6765\u5f00\u5934\uff0c\u5148\u627e\u5230\u8fd9\u4e2a\u4e16\u754c\u7684\u89c4\u5219\u3002'];
  return dreamContactName(id)+'\uff1a'+pool[Math.floor(Math.random()*pool.length)];
}
function dreamGenerateScene(){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run) return;
  dreamBusy = true;
  dreamRenderRun();
  var log = run.messages.slice(-6).map(function(m){ return (m.role === 'contact' ? dreamContactName(m.contactId) : m.role)+'\uff1a'+m.text; }).join('\n');
  var prompt = '\u4e16\u754c\u8bbe\u5b9a:\n'+run.world+'\n\n\u5df2\u53d1\u751f:\n'+log+'\n\n\u8bf7\u751f\u6210\u4e00\u6bb5\u9ad8\u7ea7\u795e\u79d8\u98ce\u683c\u65c1\u767d\uff0c\u63a8\u8fdb\u526f\u672c\u4efb\u52a1\u3002\u540c\u65f6\u7ed9\u51fa3\u5f20\u9009\u62e9\u5361\u3002\u683c\u5f0f\uff1a\nSCENE|\u65c1\u767d\nCARD|\u6807\u9898|\u6548\u679c|\u98ce\u9669\nCARD|\u6807\u9898|\u6548\u679c|\u98ce\u9669\nCARD|\u6807\u9898|\u6548\u679c|\u98ce\u9669\n\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\u3002';
  dreamCallAI(prompt, '\u4f60\u662f\u65e0\u9650\u526f\u672c\u65c1\u767d\u548c\u9009\u62e9\u5361\u7b56\u5212\u3002\u53ea\u8f93\u51fa\u6307\u5b9a\u683c\u5f0f\u3002', function(text){
    dreamBusy = false;
    var parsed = dreamParseScene(text);
    run.messages.push({role:'narrator', text:parsed.scene, at:Date.now()});
    run.choices = parsed.cards;
    dreamRenderRun();
    saveState();
  });
}
function dreamParseScene(text){
  var out = {scene:'', cards:[]};
  var lines = String(text || '').split(/\n+/).map(dreamCleanText).filter(Boolean);
  lines.forEach(function(line){
    if(line.indexOf('SCENE|') === 0) out.scene = line.split('|').slice(1).join('|').trim();
    if(line.indexOf('CARD|') === 0){
      var p = line.split('|');
      out.cards.push({id:'card-'+Date.now().toString(36)+'-'+out.cards.length, title:p[1] || '\u672a\u77e5\u9009\u9879', effect:p[2] || '\u6539\u53d8\u526f\u672c\u8d70\u5411', risk:p[3] || '\u98ce\u9669\u672a\u660e'});
    }
  });
  if(!out.scene) out.scene = dreamFallbackScene();
  if(out.cards.length < 3) out.cards = dreamFallbackCards(out.cards);
  return out;
}
function dreamFallbackScene(){
  var list = ['\u96fe\u5c42\u5728\u811a\u4e0b\u5408\u62e2\uff0c\u8fdc\u5904\u7684\u95e8\u53ea\u5728\u88ab\u547c\u5524\u65f6\u51fa\u73b0\u3002\u4efb\u52a1\u662f\u627e\u5230\u95e8\u540e\u771f\u6b63\u7684\u540d\u5b57\u3002','\u6f29\u6da1\u7559\u4e0b\u7684\u5149\u7ebf\u5207\u5f00\u8bb0\u5fc6\uff0c\u4f60\u4eec\u5fc5\u987b\u5728\u5b83\u7184\u706d\u524d\u505a\u51fa\u5224\u65ad\u3002','\u4e00\u5ea7\u6ca1\u6709\u51fa\u53e3\u7684\u5385\u5802\u6d6e\u51fa\u6c34\u9762\uff0c\u5899\u4e0a\u7684\u7eb9\u7406\u6b63\u5728\u91cd\u5199\u4efb\u52a1\u3002'];
  return list[Math.floor(Math.random()*list.length)];
}
function dreamFallbackCards(existing){
  var cards = existing || [];
  var pool = [
    {title:'\u70b9\u4eae\u96fe\u706f', effect:'\u770b\u6e05\u4e0b\u4e00\u5c42\u901a\u9053', risk:'\u5438\u5f15\u5de1\u6e38\u8005'},
    {title:'\u4ea4\u51fa\u4e00\u6bb5\u8bb0\u5fc6', effect:'\u6362\u53d6\u4efb\u52a1\u7ebf\u7d22', risk:'\u8054\u7cfb\u4eba\u4f1a\u77ed\u6682\u5931\u795e'},
    {title:'\u8ffd\u968f\u56de\u58f0', effect:'\u8ba9\u526f\u672c\u81ea\u52a8\u5c55\u5f00', risk:'\u65c1\u767d\u4f1a\u63d0\u5347\u96be\u5ea6'},
    {title:'\u5c01\u5b58\u88c2\u7f1d', effect:'\u7a33\u5b9a\u5f53\u524d\u573a\u666f', risk:'\u5956\u52b1\u7b49\u7ea7\u53ef\u80fd\u4e0b\u964d'}
  ];
  while(cards.length < 3) cards.push(pool[cards.length % pool.length]);
  return cards.slice(0,3).map(function(c, i){ c.id = c.id || 'fallback-'+i; return c; });
}
function dreamChooseCard(i){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run || !run.choices || !run.choices[i] || dreamBusy) return;
  var card = run.choices[i];
  run.usedCards.push(card.title);
  run.messages.push({role:'user', text:'\u9009\u62e9\u5361\uff1a'+card.title+'\u3002'+card.effect+'\u3002\u98ce\u9669\uff1a'+card.risk, at:Date.now()});
  run.progress += 1;
  run.score += dreamCardScore(card, run.progress);
  run.choices = [];
  saveState();
  dreamRenderRun();
  if(run.progress >= 4){ dreamCompleteRun(); return; }
  dreamContactReact(card, function(){ dreamGenerateScene(); });
}
function dreamCardScore(card, step){
  var text = (card.title || '') + (card.effect || '') + (card.risk || '');
  var base = 16 + step * 3;
  if(/\u7ebf\u7d22|\u7a33\u5b9a|\u770b\u6e05/.test(text)) base += 6;
  if(/\u98ce\u9669|\u5438\u5f15|\u5931\u795e/.test(text)) base -= 2;
  return Math.max(8, base);
}
function dreamContactReact(card, done){
  var run = dreamState.run;
  var id = run.contacts[run.progress % run.contacts.length];
  dreamBusy = true;
  dreamCallAI('\u526f\u672c\u4e16\u754c:\n'+run.world+'\n\u7528\u6237\u9009\u4e86\u5361\u7247:\n'+card.title+' / '+card.effect+' / '+card.risk+'\n\u8bf7\u4ee5 '+dreamContactName(id)+' \u7684\u53e3\u543b\u56de\u590d\u4e00\u53e5\uff0c\u4e0d\u8d85\u8fc750\u5b57\uff0c\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\u3002', '\u4f60\u662f WeChat \u8054\u7cfb\u4eba\uff0c\u6b63\u5728\u68a6\u6838\u526f\u672c\u4e2d\u884c\u52a8\u3002', function(text){
    dreamBusy = false;
    run.messages.push({role:'contact', contactId:id, text:text || dreamFallbackContact(id), at:Date.now()});
    saveState();
    dreamRenderRun();
    if(done) done();
  });
}
function dreamCompleteRun(){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run) return;
  var ranks = ['S+','S','A','B','C'];
  var score = Math.max(0, Math.min(100, run.score + run.contacts.length * 4));
  var rank = score >= 88 ? ranks[0] : score >= 76 ? ranks[1] : score >= 62 ? ranks[2] : score >= 46 ? ranks[3] : ranks[4];
  var reward = dreamReward(rank);
  run.rank = rank;
  run.score = score;
  run.rewards = [reward];
  run.completedAt = Date.now();
  run.messages.push({role:'system', text:'\u526f\u672c\u7ed3\u7b97\uff1a'+rank+' / '+reward.name, at:Date.now()});
  var slot = dreamSlot();
  slot.runs.push({id:run.id, at:run.completedAt, rank:rank, score:score, reward:reward.name, contacts:run.contacts.slice()});
  slot.rewards.push(reward);
  slot.updatedAt = Date.now();
  dreamState.phase = 'result';
  dreamRenderRun();
  dreamRenderSetup();
  saveState();
}
function dreamReward(rank){
  var map = {
    'S+':{name:'\u96fe\u6838\u91d1\u5370', desc:'\u4e0b\u6b21\u526f\u672c\u5f00\u573a\u83b7\u5f97\u989d\u5916\u7ebf\u7d22'},
    'S':{name:'\u7a7a\u54cd\u94a5\u5319', desc:'\u53ef\u4ee5\u63d0\u524d\u6253\u5f00\u4e00\u5f20\u9009\u62e9\u5361'},
    'A':{name:'\u9752\u767d\u77f3\u7b26', desc:'\u7a33\u5b9a\u4e00\u6b21\u98ce\u9669\u5224\u5b9a'},
    'B':{name:'\u6b8b\u9875\u56de\u6267', desc:'\u4fdd\u7559\u672c\u8f6e\u5173\u952e\u8bb0\u5fc6'},
    'C':{name:'\u672a\u51dd\u96fe\u7247', desc:'\u4f5c\u4e3a\u4e0b\u6b21\u8fdb\u5165\u7684\u5750\u6807'}
  };
  return Object.assign({rank:rank, at:Date.now()}, map[rank] || map.C);
}
function dreamRenderRun(){
  dreamEnsureStateShape();
  var wrap = document.getElementById('dream-run-panel');
  if(!wrap) return;
  var run = dreamState.run;
  if(!run){
    wrap.innerHTML = '<div class="dream-portal-idle"><div id="dream-vortex" class="dream-vortex"><span></span></div><b>\u7b49\u5f85\u68a6\u6838\u542f\u52a8</b><small>\u9009\u62e9\u5b58\u6863\u3001\u5199\u5165\u4e16\u754c\u3001\u9080\u8bf7\u8054\u7cfb\u4eba\u540e\u8fdb\u5165</small></div>';
    return;
  }
  var names = run.contacts.map(dreamContactName).join(' / ');
  wrap.innerHTML = '<div id="dream-vortex" class="dream-vortex"><span></span></div><div class="dream-stage-head"><div><b>\u68a6\u6838\u526f\u672c</b><small>'+esc(names)+'</small></div><span>'+run.progress+'/4</span></div><div id="dream-chat" class="dream-chat">'+run.messages.map(dreamMessageHTML).join('')+(dreamBusy?'<div class="dream-thinking">\u68a6\u6838\u6b63\u5728\u6f14\u7b97...</div>':'')+'</div><div id="dream-choice-card" class="dream-choice-card">'+dreamChoicesHTML(run)+'</div><div id="dream-result" class="dream-result">'+dreamResultHTML(run)+'</div>';
  var chat = document.getElementById('dream-chat');
  if(chat) chat.scrollTop = chat.scrollHeight;
}
function dreamMessageHTML(m){
  if(m.role === 'contact') return '<div class="dream-msg contact">'+dreamAvatar(m.contactId)+'<div><b>'+esc(dreamContactName(m.contactId))+'</b><p>'+esc(m.text)+'</p></div></div>';
  if(m.role === 'narrator') return '<div class="dream-msg narrator"><i>\u65c1\u767d</i><p>'+esc(m.text)+'</p></div>';
  if(m.role === 'user') return '<div class="dream-msg user"><p>'+esc(m.text)+'</p></div>';
  return '<div class="dream-msg system"><p>'+esc(m.text)+'</p></div>';
}
function dreamChoicesHTML(run){
  if(dreamState.phase === 'result' || run.rank) return '';
  if(!run.choices || !run.choices.length) return '<div class="dream-choice-wait">\u7b49\u5f85\u9009\u62e9\u5361\u751f\u6210</div>';
  return run.choices.map(function(c, i){
    return '<button type="button" onclick="dreamChooseCard('+i+')"><b>'+esc(c.title)+'</b><small>'+esc(c.effect)+'</small><em>'+esc(c.risk)+'</em></button>';
  }).join('');
}
function dreamResultHTML(run){
  if(!run || !run.rank) return '';
  var r = run.rewards && run.rewards[0] ? run.rewards[0] : {name:'', desc:''};
  return '<div class="dream-result-card"><div class="rank">'+esc(run.rank)+'</div><div><b>\u526f\u672c\u4efb\u52a1\u5b8c\u6210</b><small>\u8bc4\u5206 '+run.score+'/100</small><p>\u5956\u52b1\uff1a'+esc(r.name)+'\u3002'+esc(r.desc)+'</p></div></div><button type="button" class="dream-primary" onclick="dreamResetRun()">\u5f00\u542f\u65b0\u526f\u672c</button>';
}
function dreamResetRun(){
  dreamEnsureStateShape();
  dreamState.phase = 'setup';
  dreamState.run = null;
  dreamRenderRun();
  dreamRenderSetup();
  saveState();
}
function dreamToast(text){
  var t = document.getElementById('dream-toast');
  if(!t){ if(typeof showToast === 'function') showToast(text, 1600, 'warn'); return; }
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, 2200);
}
