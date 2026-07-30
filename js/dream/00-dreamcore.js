/* ============ DREAMCORE APP ============ */
var dreamState = null;
var dreamBusy = false;
var dreamUploadTarget = null;
var dreamFallbackTimers = [];

function dreamDefaultWorldConfig(){
  return {name:'', background:'', era:'', rules:'', npc:'', factions:'', resources:'', docText:''};
}
function dreamDefaultSlot(i){
  return {id:'slot-'+(i+1), name:'SAVE '+(i+1), world:'', worldConfig:dreamDefaultWorldConfig(), wallpaper:'', sceneImage:'', updatedAt:0, runs:[], rewards:[], rewardPool:'', templateLibrary:'', contactSettings:{}, inventory:[], docs:[]};
}
function dreamDefault(){
  return {activeSlot:0, selectedContacts:[], view:'setup', phase:'setup', slots:[dreamDefaultSlot(0), dreamDefaultSlot(1), dreamDefaultSlot(2)], run:null};
}
function dreamEnsureStateShape(){
  if(!dreamState) dreamState = dreamDefault();
  var d = dreamDefault();
  if(!Array.isArray(dreamState.slots)) dreamState.slots = d.slots;
  for(var i=0;i<3;i++){
    var slot = Object.assign(dreamDefaultSlot(i), dreamState.slots[i] || {});
    slot.worldConfig = Object.assign(dreamDefaultWorldConfig(), slot.worldConfig || {});
    if(slot.world && !slot.worldConfig.background) slot.worldConfig.background = slot.world;
    if(slot.worldConfig.background && !slot.world) slot.world = slot.worldConfig.background;
    if(!slot.contactSettings || typeof slot.contactSettings !== 'object') slot.contactSettings = {};
    if(!Array.isArray(slot.runs)) slot.runs = [];
    if(!Array.isArray(slot.rewards)) slot.rewards = [];
    if(!Array.isArray(slot.inventory)) slot.inventory = slot.rewards.slice();
    if(!Array.isArray(slot.docs)) slot.docs = [];
    if(typeof slot.rewardPool !== 'string') slot.rewardPool = '';
    if(typeof slot.templateLibrary !== 'string') slot.templateLibrary = '';
    dreamState.slots[i] = slot;
  }
  if(typeof dreamState.activeSlot !== 'number') dreamState.activeSlot = 0;
  dreamState.activeSlot = Math.max(0, Math.min(2, dreamState.activeSlot));
  if(!Array.isArray(dreamState.selectedContacts)) dreamState.selectedContacts = [];
  dreamState.selectedContacts = dreamState.selectedContacts.filter(function(id){ return contacts && contacts[id] && id !== 'me' && !contacts[id].isGroup; });
  var slotNow = dreamState.slots[dreamState.activeSlot];
  Object.keys(slotNow.contactSettings || {}).forEach(function(id){
    if(!contacts || !contacts[id] || contacts[id].isGroup || id === 'me') delete slotNow.contactSettings[id];
  });
  dreamState.selectedContacts.forEach(function(id){
    if(!slotNow.contactSettings[id]) slotNow.contactSettings[id] = {enabled:true, role:''};
    slotNow.contactSettings[id].enabled = true;
  });
  if(!dreamState.view) dreamState.view = dreamState.run ? 'run' : 'setup';
  if(!dreamState.phase) dreamState.phase = 'setup';
  if(dreamState.run){
    if(!Array.isArray(dreamState.run.messages)) dreamState.run.messages = [];
    if(!Array.isArray(dreamState.run.choices)) dreamState.run.choices = [];
    if(!Array.isArray(dreamState.run.usedCards)) dreamState.run.usedCards = [];
    if(!Array.isArray(dreamState.run.rewards)) dreamState.run.rewards = [];
    if(!Array.isArray(dreamState.run.contacts)) dreamState.run.contacts = [];
    dreamState.run.worldConfig = Object.assign(dreamDefaultWorldConfig(), dreamState.run.worldConfig || {});
    if(!Array.isArray(dreamState.run.inventory)) dreamState.run.inventory = [];
  }
  return dreamState;
}
function dreamSlot(){ dreamEnsureStateShape(); return dreamState.slots[dreamState.activeSlot]; }
function dreamContactIds(){ return Object.keys(contacts || {}).filter(function(id){ return id !== 'me' && contacts[id] && !contacts[id].isGroup; }); }
function dreamContactName(id){ return contacts && contacts[id] ? (contacts[id].displayName || contacts[id].name || id) : id; }
function dreamJSString(v){ return String(v || '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,''); }
function dreamInputValue(id){ var el = document.getElementById(id); return el && typeof el.value === 'string' ? el.value.trim() : ''; }
function dreamSetInput(id, value){ var el = document.getElementById(id); if(el && document.activeElement !== el) el.value = value || ''; }
function dreamAvatar(id){
  var c = contacts && contacts[id] ? contacts[id] : null;
  if(c && c.avatar) return '<div class="dream-avatar" style="background-image:url('+c.avatar+');"></div>';
  var n = dreamContactName(id).slice(0,1).toUpperCase();
  return '<div class="dream-avatar">'+esc(n)+'</div>';
}
function initDreamCore(){
  dreamEnsureStateShape();
  dreamBindFileInput();
  dreamBindDocInput();
  dreamRenderSetup();
  dreamRenderRun();
  dreamRenderView();
}
function dreamRenderView(){
  dreamEnsureStateShape();
  var setup = document.getElementById('dream-view-setup');
  var run = document.getElementById('dream-view-run');
  var isRun = dreamState.view === 'run';
  if(setup) setup.classList.toggle('active', !isRun);
  if(run) run.classList.toggle('active', isRun);
  var body = document.querySelector('#sheet-dream .dream-body');
  if(body) body.scrollTop = 0;
}
function dreamOpenRunView(){ dreamEnsureStateShape(); dreamState.view = 'run'; dreamRenderView(); dreamRenderRun(); }
function dreamBackToSetup(){ dreamEnsureStateShape(); dreamState.view = 'setup'; dreamRenderView(); dreamRenderSetup(); saveState(); }
function dreamBindFileInput(){
  var input = document.getElementById('dream-file-input');
  if(!input || input._dreamBound) return;
  input._dreamBound = true;
  input.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file || !dreamUploadTarget) return;
    var target = dreamUploadTarget;
    dreamUploadTarget = null;
    function done(res){
      if(!res) return;
      dreamEnsureStateShape();
      var slot = dreamSlot();
      if(target === 'slot') slot.wallpaper = res;
      if(target === 'scene') slot.sceneImage = res;
      slot.updatedAt = Date.now();
      if(dreamState.run && target === 'scene') dreamState.run.sceneImage = res;
      dreamRenderSaveBurst(target === 'slot' ? '\u5b58\u6863\u58c1\u7eb8\u5199\u5165' : '\u573a\u666f\u56fe\u5199\u5165');
      dreamRenderSetup();
      dreamRenderRun();
      saveState();
      input.value = '';
    }
    if(typeof compressImage === 'function') compressImage(file, target === 'slot' ? 720 : 1280, 0.82, done);
    else {
      var reader = new FileReader();
      reader.onload = function(){ done(reader.result); };
      reader.readAsDataURL(file);
    }
  });
}
function dreamBindDocInput(){
  var input = document.getElementById('dream-doc-input');
  if(!input || input._dreamBound) return;
  input._dreamBound = true;
  input.addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    if(!/\.(txt|md|doc|docx)$/i.test(file.name || '')){ dreamToast('\u8bf7\u5bfc\u5165 txt\u3001word \u6216 md \u6587\u4ef6'); input.value=''; return; }
    var reader = new FileReader();
    reader.onload = function(){
      dreamEnsureStateShape();
      var slot = dreamSlot();
      var text = String(reader.result || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim();
      if(!text && /\.docx?$/i.test(file.name || '')) text = '\u5df2\u5bfc\u5165 Word \u6587\u4ef6\uff1a'+file.name+'\u3002\u6d4f\u89c8\u5668\u7aef\u65e0\u6cd5\u89e3\u6790\u590d\u6742\u683c\u5f0f\uff0c\u8bf7\u5c06\u5173\u952e\u5185\u5bb9\u586b\u5165\u4e16\u754c\u89c2\u3002';
      slot.docs.push({name:file.name || '\u4e16\u754c\u4e66', size:file.size || 0, text:text.slice(0, 12000), at:Date.now()});
      slot.worldConfig.docText = slot.docs.map(function(d){ return d.name+'\n'+d.text; }).join('\n\n').slice(0, 20000);
      slot.updatedAt = Date.now();
      dreamRenderSaveBurst('\u4e16\u754c\u4e66\u5df2\u5199\u5165');
      dreamRenderSetup();
      saveState();
      input.value = '';
    };
    reader.readAsText(file, 'utf-8');
  });
}
function dreamPickSlotWallpaper(){ dreamBindFileInput(); dreamUploadTarget = 'slot'; var input = document.getElementById('dream-file-input'); if(input) input.click(); }
function dreamPickSceneImage(){ dreamBindFileInput(); dreamUploadTarget = 'scene'; var input = document.getElementById('dream-file-input'); if(input) input.click(); }
function dreamPickWorldDoc(){ dreamBindDocInput(); var input = document.getElementById('dream-doc-input'); if(input) input.click(); }
function dreamReadWorldForm(){
  dreamEnsureStateShape();
  var slot = dreamSlot();
  var cfg = Object.assign(dreamDefaultWorldConfig(), slot.worldConfig || {});
  cfg.name = dreamInputValue('dream-world-name');
  cfg.background = dreamInputValue('dream-world-input');
  cfg.era = dreamInputValue('dream-era-input');
  cfg.rules = dreamInputValue('dream-rules-input');
  cfg.npc = dreamInputValue('dream-npc-input');
  cfg.factions = dreamInputValue('dream-factions-input');
  cfg.resources = dreamInputValue('dream-resources-input');
  slot.rewardPool = dreamInputValue('dream-rewards-input');
  slot.templateLibrary = dreamInputValue('dream-templates-input');
  cfg.docText = (slot.docs || []).map(function(d){ return d.name+'\n'+d.text; }).join('\n\n').slice(0, 20000);
  slot.worldConfig = cfg;
  slot.world = cfg.background;
  slot.updatedAt = Date.now();
  return cfg;
}
function dreamBuildWorldPrompt(run){
  var cfg = Object.assign(dreamDefaultWorldConfig(), (run && run.worldConfig) || dreamSlot().worldConfig || {});
  var slot = dreamSlot();
  return [
    '\u4e16\u754c\u540d\u79f0: '+(cfg.name || '\u672a\u547d\u540d\u4e16\u754c'),
    '\u65f6\u4ee3\u80cc\u666f: '+(cfg.era || '\u672a\u8bbe\u5b9a'),
    '\u57fa\u7840\u89c4\u5219: '+(cfg.rules || '\u8054\u7cfb\u4eba\u5fc5\u987b\u9075\u5faa\u672c\u6765\u4eba\u8bbe\u548c\u4e16\u754c\u4e66'),
    '\u4e16\u754c\u89c2: '+(cfg.background || slot.world || ''),
    'NPC: '+(cfg.npc || '\u65e0'),
    '\u9635\u8425: '+(cfg.factions || '\u65e0'),
    '\u8d44\u6e90: '+(cfg.resources || '\u65e0'),
    '\u5956\u52b1\u6c60: '+(run && run.rewardPool || slot.rewardPool || '\u4f7f\u7528\u9ed8\u8ba4\u5956\u52b1'),
    '\u526f\u672c\u6a21\u677f: '+(run && run.templateLibrary || slot.templateLibrary || '\u65e0\u9650\u968f\u673a'),
    '\u4e16\u754c\u4e66: '+(cfg.docText || '\u65e0')
  ].join('\n');
}
function dreamRenderSetup(){
  dreamEnsureStateShape();
  var slot = dreamSlot();
  var slots = document.getElementById('dream-save-slots');
  if(slots){
    slots.innerHTML = dreamState.slots.map(function(s, i){
      var active = i === dreamState.activeSlot ? ' active' : '';
      var filled = (s.world || (s.worldConfig && s.worldConfig.name)) ? ' filled' : '';
      var time = s.updatedAt ? dreamFormatTime(s.updatedAt) : '\u7a7a\u5b58\u6863';
      var bg = s.wallpaper ? ' style="background-image:url('+s.wallpaper+');"' : '';
      return '<button type="button" class="dream-slot'+active+filled+'" onclick="dreamSelectSlot('+i+')"><span class="dream-slot-preview"'+bg+'></span><b>'+esc((s.worldConfig && s.worldConfig.name) || s.name)+'</b><small>'+esc(time)+'</small></button>';
    }).join('');
  }
  var cfg = Object.assign(dreamDefaultWorldConfig(), slot.worldConfig || {});
  dreamSetInput('dream-world-name', cfg.name);
  dreamSetInput('dream-world-input', cfg.background || slot.world);
  dreamSetInput('dream-era-input', cfg.era);
  dreamSetInput('dream-rules-input', cfg.rules);
  dreamSetInput('dream-npc-input', cfg.npc);
  dreamSetInput('dream-factions-input', cfg.factions);
  dreamSetInput('dream-resources-input', cfg.resources);
  dreamSetInput('dream-rewards-input', slot.rewardPool);
  dreamSetInput('dream-templates-input', slot.templateLibrary);
  dreamRenderApiStatus();
  dreamRenderContactList();
  dreamRenderDocs();
  dreamRenderInventory();
  var meta = document.getElementById('dream-slot-meta');
  if(meta) meta.textContent = slot.runs.length ? ('\u5df2\u5b8c\u6210 '+slot.runs.length+' \u6b21\u526f\u672c / \u5956\u52b1 '+slot.inventory.length+' \u4ef6') : '\u8bbe\u5b9a\u4e16\u754c\u540e\u53ef\u4ee5\u542f\u52a8\u526f\u672c';
}
function dreamRenderApiStatus(){
  var api = document.getElementById('dream-api-status');
  if(!api) return;
  var p = dreamActiveApiProfile();
  var ready = !!(p && p.key && p.endpoint && p.model);
  api.innerHTML = ready ? '<b>\u5168\u5c40 API \u5df2\u8fde\u63a5</b><small>'+esc(p.name || p.model || '\u5f53\u524d\u6a21\u578b')+'</small>' : '<b>\u5168\u5c40 API \u672a\u914d\u7f6e</b><small>\u4f1a\u5148\u7528\u672c\u5730\u4fdd\u5e95\u5267\u60c5\u542f\u52a8\uff0c\u914d\u597d API \u540e\u751f\u6210\u66f4\u7ec6\u7684\u65c1\u767d</small>';
  api.classList.toggle('warn', !ready);
}
function dreamRenderDocs(){
  var el = document.getElementById('dream-doc-list');
  if(!el) return;
  var docs = dreamSlot().docs || [];
  el.innerHTML = docs.length ? docs.map(function(d){ return '<span>'+esc(d.name)+'<small>'+Math.max(1, Math.round((d.size || 0)/1024))+'K</small></span>'; }).join('') : '<span>\u672a\u5bfc\u5165\u4e16\u754c\u4e66</span>';
}
function dreamRenderInventory(){
  var el = document.getElementById('dream-inventory-list');
  if(!el) return;
  var slot = dreamSlot();
  var inv = slot.inventory && slot.inventory.length ? slot.inventory : slot.rewards || [];
  el.innerHTML = inv.length ? inv.slice(-8).reverse().map(function(r){ return '<div><b>'+esc(r.rank || '')+' '+esc(r.name || '\u5956\u52b1')+'</b><small>'+esc(r.desc || '\u5df2\u5199\u5165\u5f53\u524d\u5b58\u6863')+'</small></div>'; }).join('') : '<div><b>\u7a7a\u80cc\u5305</b><small>\u5b8c\u6210\u526f\u672c\u540e\u4f1a\u81ea\u52a8\u83b7\u5f97\u5956\u52b1</small></div>';
}
function dreamContactSetting(id){
  var slot = dreamSlot();
  if(!slot.contactSettings[id]) slot.contactSettings[id] = {enabled:dreamState.selectedContacts.indexOf(id) >= 0, role:''};
  return slot.contactSettings[id];
}
function dreamContactEnabled(id){ return !!dreamContactSetting(id).enabled; }
function dreamToggleContactPermission(id){
  dreamEnsureStateShape();
  var setting = dreamContactSetting(id);
  setting.enabled = !setting.enabled;
  var idx = dreamState.selectedContacts.indexOf(id);
  if(setting.enabled && idx < 0) dreamState.selectedContacts.push(id);
  if(!setting.enabled && idx >= 0) dreamState.selectedContacts.splice(idx, 1);
  dreamRenderContactList();
  saveState();
}
function dreamToggleContact(id){ dreamToggleContactPermission(id); }
function dreamUpdateContactRole(id, value){
  dreamEnsureStateShape();
  dreamContactSetting(id).role = String(value || '').slice(0, 120);
  saveState();
}
function dreamRenderContactList(){
  var list = document.getElementById('dream-contact-list');
  if(!list) return;
  var ids = dreamContactIds();
  list.innerHTML = ids.length ? ids.map(function(id){
    var setting = dreamContactSetting(id);
    var on = setting.enabled ? ' selected' : '';
    var c = contacts[id] || {};
    var desc = setting.role || c.bio || c.persona || c.tone || '\u5fae\u4fe1\u8054\u7cfb\u4eba';
    return '<div class="dream-contact-card'+on+'"><button type="button" class="dream-contact'+on+'" onclick="dreamToggleContactPermission(\''+dreamJSString(id)+'\')">'+dreamAvatar(id)+'<span><b>'+esc(dreamContactName(id))+'</b><small>'+esc(setting.enabled ? '\u5df2\u5141\u8bb8\u8fdb\u5165\u526f\u672c' : '\u672a\u5f00\u542f\u6743\u9650')+'</small></span></button><input class="dream-contact-role" value="'+esc(desc)+'" oninput="dreamUpdateContactRole(\''+dreamJSString(id)+'\',this.value)" placeholder="\u7ed1\u5b9a\u526f\u672c\u8eab\u4efd"></div>';
  }).join('') : '<div class="dream-empty">\u8fd8\u6ca1\u6709\u53ef\u7528\u7684 WeChat \u8054\u7cfb\u4eba</div>';
}
function dreamContactProfile(id){
  var c = contacts && contacts[id] ? contacts[id] : {};
  var setting = dreamContactSetting(id);
  return [
    '\u59d3\u540d: '+dreamContactName(id),
    '\u526f\u672c\u8eab\u4efd: '+(setting.role || '\u672a\u6307\u5b9a'),
    '\u539f\u672c\u4eba\u8bbe: '+(c.persona || c.userPrompt || c.tone || c.bio || '\u6682\u65e0'),
    '\u4e16\u754c\u4e66\u7ea6\u675f: \u5fc5\u987b\u4fdd\u6301\u4ed6\u81ea\u5df1\u672c\u6765\u7684\u4eba\u8bbe\u548c\u5df2\u5199\u5165\u7684\u4e16\u754c\u89c4\u5219'
  ].join('\n');
}
function dreamFormatTime(ts){ var d = new Date(ts); return (d.getMonth()+1)+'/'+d.getDate()+' '+pad(d.getHours())+':'+pad(d.getMinutes()); }
function dreamSelectSlot(i){
  dreamEnsureStateShape();
  dreamState.activeSlot = Math.max(0, Math.min(2, i));
  dreamState.view = 'setup';
  dreamState.phase = 'setup';
  dreamState.run = null;
  dreamRenderSaveBurst('\u8bfb\u53d6\u5b58\u6863');
  dreamRenderSetup();
  dreamRenderRun();
  dreamRenderView();
  saveState();
}
function dreamSaveWorld(){
  dreamEnsureStateShape();
  var cfg = dreamReadWorldForm();
  if(!cfg.name && cfg.background) cfg.name = cfg.background.slice(0, 12);
  dreamRenderSaveBurst('\u68a6\u6838\u5199\u5165');
  dreamRenderSetup();
  saveState();
}
function dreamRenderSaveBurst(text){
  var burst = document.getElementById('dream-save-burst');
  if(!burst) return;
  burst.innerHTML = '<div class="dream-save-card"><div class="dream-save-ring"></div><div class="dream-save-lines"><i></i><i></i><i></i></div><div class="dream-save-text">'+esc(text || '\u4fdd\u5b58\u4e2d')+'</div></div>';
  burst.classList.remove('show');
  void burst.offsetWidth;
  burst.classList.add('show');
  clearTimeout(burst._timer);
  burst._timer = setTimeout(function(){ burst.classList.remove('show'); }, 1050);
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
function dreamTimeout(ms, cb){
  var done = false;
  var timer = setTimeout(function(){ if(done) return; done = true; cb(null); }, ms || 6500);
  dreamFallbackTimers.push(timer);
  return function(value){ if(done) return; done = true; clearTimeout(timer); cb(value); };
}
function dreamCallAI(prompt, systemPrompt, cb){
  var p = dreamActiveApiProfile();
  var finish = dreamTimeout(6500, cb);
  if(!p || !p.key || !p.endpoint || !p.model){ finish(null); return; }
  var msgs = [];
  if(systemPrompt) msgs.push({role:'system', content:systemPrompt});
  msgs.push({role:'user', content:prompt});
  fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:msgs, provider:'custom', key:p.key, endpoint:p.endpoint, dataModel:p.model, model:p.model, apiFormat:p.apiFormat || 'openai', max_tokens:680, temperature:typeof p.temperature === 'number' ? p.temperature : 0.86, stream:false})}).then(function(r){ return r.json(); }).then(function(d){ finish(dreamCleanText(dreamParseAIText(d))); }).catch(function(){ finish(null); });
}
function dreamCleanText(text){ return String(text || '').replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/\s+/g, ' ').trim(); }
function dreamStartRun(){
  dreamEnsureStateShape();
  var slot = dreamSlot();
  var cfg = dreamReadWorldForm();
  if(!cfg.name) cfg.name = '\u672a\u547d\u540d\u4e16\u754c';
  if(!cfg.background){ dreamToast('\u8bf7\u5148\u5199\u5165\u4e16\u754c\u89c2\u80cc\u666f'); return; }
  var enabled = dreamContactIds().filter(dreamContactEnabled);
  dreamState.selectedContacts = enabled.slice();
  if(!enabled.length){ dreamToast('\u8bf7\u9009\u62e9\u81f3\u5c11\u4e00\u4f4d WeChat \u8054\u7cfb\u4eba'); return; }
  dreamState.view = 'run';
  dreamState.phase = 'vortex';
  dreamState.run = {id:'dream-'+Date.now().toString(36), startedAt:Date.now(), world:cfg.background, worldConfig:Object.assign({}, cfg), rewardPool:slot.rewardPool || '', templateLibrary:slot.templateLibrary || '', sceneImage:slot.sceneImage || '', contacts:enabled, contactSettings:JSON.parse(JSON.stringify(slot.contactSettings || {})), inventory:(slot.inventory || []).slice(), progress:0, score:0, rank:'', rewards:[], messages:[], choices:[], usedCards:[], objective:'\u7b49\u5f85\u65c1\u767d\u53d1\u5e03\u4efb\u52a1'};
  dreamOpenRunView();
  dreamRenderSetup();
  saveState();
  dreamRenderVortex(function(){
    dreamState.phase = 'run';
    dreamRenderRun();
    saveState();
    dreamContactFirstMessage(function(){ dreamGenerateScene(); });
  });
}
function dreamEnterRunView(){ dreamOpenRunView(); }
function dreamRenderVortex(done){
  var v = document.getElementById('dream-vortex');
  if(v) v.classList.add('active');
  setTimeout(function(){ if(v) v.classList.remove('active'); if(done) done(); }, 980);
}
function dreamContactFirstMessage(done){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run) return;
  var first = run.contacts[0];
  dreamBusy = true;
  dreamRenderRun();
  var fallback = dreamFallbackContact(first);
  var fallbackTimer = setTimeout(function(){
    if(!dreamBusy || !dreamState.run || dreamState.run.id !== run.id) return;
    dreamBusy = false;
    run.messages.push({role:'contact', contactId:first, text:fallback, at:Date.now()});
    dreamState.phase = 'run';
    dreamRenderRun();
    saveState();
    if(done) done();
    done = null;
  }, 850);
  var prompt = dreamBuildWorldPrompt(run)+'\n\n'+dreamContactProfile(first)+'\n\n\u4f60\u521a\u88ab\u62c9\u5165\u8fd9\u4e2a\u81ea\u5b9a\u4e49\u4e16\u754c\u3002\u89c4\u5219\uff1a\u5fc5\u987b\u7531 WeChat \u8054\u7cfb\u4eba\u5148\u53d1\u8d77\u804a\u5929\u3002\u8bf7\u4ee5\u4f60\u672c\u4eba\u53e3\u543b\u8bf4\u7b2c\u4e00\u53e5\uff0c\u4e0d\u8d85\u8fc745\u5b57\uff0c\u4e0d\u8981\u65c1\u767d\uff0c\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\u3002';
  dreamCallAI(prompt, '\u4f60\u662f WeChat \u8054\u7cfb\u4eba\uff0c\u4e0d\u662f\u65c1\u767d\u3002\u4f60\u5fc5\u987b\u4fdd\u6301\u539f\u672c\u4eba\u8bbe\u3002', function(text){
    if(!dreamState.run || dreamState.run.id !== run.id) return;
    if(!dreamBusy && run.messages.some(function(m){ return m.role === 'contact' && m.contactId === first; })) return;
    clearTimeout(fallbackTimer);
    dreamBusy = false;
    run.messages.push({role:'contact', contactId:first, text:text || fallback, at:Date.now()});
    dreamState.phase = 'run';
    dreamRenderRun();
    saveState();
    if(done) done();
  });
}
function dreamFallbackContact(id){
  var pool = ['\u6211\u5148\u8bf4\uff0c\u8fd9\u91cc\u7684\u89c4\u5219\u548c\u5e73\u65f6\u4e0d\u4e00\u6837\u3002','\u5148\u522b\u5f80\u524d\u8d70\uff0c\u6211\u770b\u89c1\u4e00\u9053\u95e8\u5728\u7b49\u6211\u4eec\u3002','\u6211\u6765\u5f00\u5934\uff0c\u5148\u627e\u5230\u8fd9\u4e2a\u4e16\u754c\u8981\u6211\u4eec\u5b8c\u6210\u7684\u4efb\u52a1\u3002'];
  return pool[Math.floor(Math.random()*pool.length)];
}
function dreamGenerateScene(){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run) return;
  dreamBusy = true;
  dreamRenderRun();
  var immediate = dreamParseScene('');
  var fallbackTimer = setTimeout(function(){
    if(!dreamBusy || !dreamState.run || dreamState.run.id !== run.id) return;
    dreamBusy = false;
    run.messages.push({role:'narrator', text:immediate.scene, at:Date.now()});
    run.objective = immediate.objective || run.objective;
    run.choices = immediate.cards;
    dreamRenderRun();
    saveState();
  }, 900);
  var log = run.messages.slice(-8).map(function(m){ return (m.role === 'contact' ? dreamContactName(m.contactId) : m.role)+'\uff1a'+m.text; }).join('\n');
  var profiles = run.contacts.map(dreamContactProfile).join('\n\n');
  var prompt = dreamBuildWorldPrompt(run)+'\n\n\u53c2\u4e0e\u8005:\n'+profiles+'\n\n\u5df2\u53d1\u751f:\n'+log+'\n\n\u8bf7\u751f\u6210\u4e00\u6bb5\u9ad8\u7ea7\u795e\u79d8\u98ce\u683c\u65c1\u767d\uff0c\u53d1\u5e03\u6216\u63a8\u8fdb\u526f\u672c\u4efb\u52a1\uff0c\u5e76\u7ed9\u51fa2-4\u5f20\u9009\u62e9\u5361\u3002\u53c2\u4e0e\u8005\u53ea\u80fd\u56de\u590d\u5361\u724c\u7f16\u53f7\u3002\u683c\u5f0f:\nOBJECTIVE|\u4efb\u52a1\u76ee\u6807\nSCENE|\u65c1\u767d\nCARD|\u6807\u9898|\u6548\u679c|\u98ce\u9669\nCARD|\u6807\u9898|\u6548\u679c|\u98ce\u9669\nCARD|\u6807\u9898|\u6548\u679c|\u98ce\u9669\n\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\u3002';
  dreamCallAI(prompt, '\u4f60\u662f\u65e0\u9650\u526f\u672c\u65c1\u767d\u548c\u9009\u62e9\u5361\u7b56\u5212\u3002\u53ea\u8f93\u51fa\u6307\u5b9a\u683c\u5f0f\u3002', function(text){
    if(!dreamState.run || dreamState.run.id !== run.id) return;
    if(!dreamBusy && run.choices && run.choices.length) return;
    clearTimeout(fallbackTimer);
    dreamBusy = false;
    var parsed = dreamParseScene(text);
    run.messages.push({role:'narrator', text:parsed.scene, at:Date.now()});
    run.objective = parsed.objective || run.objective;
    run.choices = parsed.cards;
    dreamRenderRun();
    saveState();
  });
}
function dreamParseScene(text){
  var out = {scene:'', objective:'', cards:[]};
  var lines = String(text || '').split(/\n+/).map(dreamCleanText).filter(Boolean);
  lines.forEach(function(line){
    if(line.indexOf('OBJECTIVE|') === 0) out.objective = line.split('|').slice(1).join('|').trim();
    if(line.indexOf('SCENE|') === 0) out.scene = line.split('|').slice(1).join('|').trim();
    if(line.indexOf('CARD|') === 0){ var p = line.split('|'); out.cards.push({id:'card-'+Date.now().toString(36)+'-'+out.cards.length, title:p[1] || '\u672a\u77e5\u9009\u9879', effect:p[2] || '\u6539\u53d8\u526f\u672c\u8d70\u5411', risk:p[3] || '\u98ce\u9669\u672a\u660e'}); }
  });
  if(!out.objective) out.objective = '\u5b8c\u6210\u65c1\u767d\u53d1\u5e03\u7684\u6838\u5fc3\u4efb\u52a1';
  if(!out.scene) out.scene = dreamFallbackScene();
  if(out.cards.length < 2) out.cards = dreamFallbackCards(out.cards);
  return out;
}
function dreamFallbackScene(){
  var list = ['\u6f29\u6da1\u7684\u8fb9\u754c\u5728\u8eab\u540e\u95ed\u5408\uff0c\u4e00\u6761\u6ca1\u6709\u706f\u7684\u957f\u5eca\u5411\u524d\u5ef6\u4f38\u3002\u65c1\u767d\u5ba3\u544a\uff1a\u627e\u5230\u7b2c\u4e00\u4e2a\u80fd\u8bc1\u660e\u4f60\u4eec\u5b58\u5728\u7684\u7269\u4ef6\u3002','\u4e16\u754c\u4e66\u5728\u7a7a\u6c14\u91cc\u7ffb\u9875\uff0c\u6240\u6709\u540d\u5b57\u88ab\u8584\u96fe\u91cd\u5199\u3002\u4efb\u52a1\u662f\u5728\u9519\u8bef\u7684\u8bb0\u5fc6\u4e2d\u627e\u51fa\u771f\u6b63\u7684\u51fa\u53e3\u3002','\u5b58\u6863\u53e3\u7684\u5149\u6c89\u5165\u5730\u9762\uff0c\u4e09\u5f20\u672a\u7b7e\u540d\u7684\u5361\u724c\u9646\u7eed\u9192\u6765\u3002\u4f60\u4eec\u9700\u8981\u5148\u786e\u8ba4\u8c01\u5728\u8bf4\u8c0e\u3002'];
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
  return cards.slice(0,4).map(function(c, i){ c.id = c.id || 'fallback-'+i; return c; });
}
function dreamParseCardNumber(text){
  var n = parseInt(String(text || '').replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? -1 : n - 1;
}
function dreamChooseCard(i){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run || !run.choices || !run.choices[i] || dreamBusy) return;
  var card = run.choices[i];
  run.usedCards.push(card.title);
  run.messages.push({role:'user', text:'\u5361\u724c '+(i+1)+'\uff1a'+card.title+'\u3002'+card.effect+'\u3002\u98ce\u9669\uff1a'+card.risk, at:Date.now()});
  run.progress += 1;
  run.score += dreamCardScore(card, run.progress);
  run.choices = [];
  saveState();
  dreamRenderRun();
  if(run.progress >= 4){ dreamCompleteRun(); return; }
  dreamRenderVortex(function(){ dreamContactReact(card, function(){ dreamGenerateScene(); }); });
}
function dreamCardScore(card, step){
  var text = (card.title || '') + (card.effect || '') + (card.risk || '');
  var base = 16 + step * 3;
  if(/\u7ebf\u7d22|\u7a33\u5b9a|\u770b\u6e05|\u9690\u85cf|\u4ea4\u6d89/.test(text)) base += 6;
  if(/\u98ce\u9669|\u5438\u5f15|\u5931\u795e|\u964d\u4f4e/.test(text)) base -= 2;
  return Math.max(8, base);
}
function dreamSendPlayerMessage(){
  dreamEnsureStateShape();
  var run = dreamState.run;
  var input = document.getElementById('dream-chat-input');
  var text = input && input.value ? input.value.trim() : '';
  if(!run || !text || dreamBusy) return;
  input.value = '';
  var cardIndex = dreamParseCardNumber(text);
  if(run.choices && run.choices.length && cardIndex >= 0 && cardIndex < run.choices.length){ dreamChooseCard(cardIndex); return; }
  run.messages.push({role:'user', text:text, at:Date.now()});
  saveState();
  dreamRenderRun();
  dreamContactReact({title:'\u81ea\u7531\u804a\u5929', effect:text, risk:'\u526f\u672c\u4f1a\u6839\u636e\u5bf9\u8bdd\u504f\u79fb'}, null);
}
function dreamContactReact(card, done){
  var run = dreamState.run;
  if(!run) return;
  var id = run.contacts[Math.max(0, run.progress) % run.contacts.length];
  dreamBusy = true;
  dreamRenderRun();
  var fallback = dreamFallbackContact(id);
  var fallbackTimer = setTimeout(function(){
    if(!dreamBusy || !dreamState.run || dreamState.run.id !== run.id) return;
    dreamBusy = false;
    run.messages.push({role:'contact', contactId:id, text:fallback, at:Date.now()});
    saveState();
    dreamRenderRun();
    if(done) done();
  }, 900);
  dreamCallAI(dreamBuildWorldPrompt(run)+'\n\n'+dreamContactProfile(id)+'\n\n\u5f53\u524d\u5361\u724c\u6216\u4e8b\u4ef6:\n'+card.title+' / '+card.effect+' / '+card.risk+'\n\u8bf7\u4ee5 '+dreamContactName(id)+' \u7684\u53e3\u543b\u56de\u590d\u4e00\u53e5\uff0c\u4e0d\u8d85\u8fc750\u5b57\uff0c\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\u3002', '\u4f60\u662f WeChat \u8054\u7cfb\u4eba\uff0c\u6b63\u5728\u68a6\u6838\u526f\u672c\u4e2d\u884c\u52a8\u3002', function(text){
    if(!dreamState.run || dreamState.run.id !== run.id) return;
    if(!dreamBusy) return;
    clearTimeout(fallbackTimer);
    dreamBusy = false;
    run.messages.push({role:'contact', contactId:id, text:text || fallback, at:Date.now()});
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
  var score = Math.max(0, Math.min(100, run.score + run.contacts.length * 4 + Math.min(10, run.usedCards.length * 2)));
  var rank = score >= 88 ? ranks[0] : score >= 76 ? ranks[1] : score >= 62 ? ranks[2] : score >= 46 ? ranks[3] : ranks[4];
  var reward = dreamReward(rank);
  run.rank = rank;
  run.score = score;
  run.rewards = [reward];
  run.completedAt = Date.now();
  run.messages.push({role:'system', text:'\u526f\u672c\u7ed3\u7b97\uff1a'+rank+' / '+reward.name, at:Date.now()});
  var slot = dreamSlot();
  slot.runs.push({id:run.id, at:run.completedAt, rank:rank, score:score, reward:reward.name, contacts:run.contacts.slice(), world:(run.worldConfig && run.worldConfig.name) || run.world});
  slot.rewards.push(reward);
  slot.inventory.push(reward);
  slot.updatedAt = Date.now();
  dreamState.phase = 'result';
  dreamRenderRun();
  dreamRenderSetup();
  saveState();
}
function dreamReward(rank){
  var custom = (dreamSlot().rewardPool || '').split(/\n+/).map(function(x){ return x.trim(); }).filter(Boolean);
  var line = custom.find(function(x){ return x.indexOf(rank) === 0; });
  if(line){ return {rank:rank, at:Date.now(), name:line.replace(/^S\+|^S|^A|^B|^C/, '').replace(/^[:\uff1a\-\s]+/, '').slice(0, 28) || '\u81ea\u5b9a\u4e49\u5956\u52b1', desc:'\u6765\u81ea\u623f\u4e3b\u81ea\u5b9a\u4e49\u5956\u52b1\u6c60'}; }
  var map = {
    'S+':{name:'\u96fe\u6838\u91d1\u5370', desc:'\u6c38\u4e45\u89e3\u9501\u9ad8\u96be\u5ea6\u526f\u672c\u548c\u81ea\u5b9a\u4e49\u5361\u724c\u6743\u9650'},
    'S':{name:'\u7a7a\u54cd\u94a5\u5319', desc:'\u89e3\u9501\u4e16\u754c\u9650\u5b9a\u5185\u5bb9\u548c\u4e13\u5c5e\u8eab\u4efd\u7279\u6743'},
    'A':{name:'\u9752\u767d\u77f3\u7b26', desc:'\u83b7\u5f97\u7a00\u6709\u9053\u5177\u5e76\u89e3\u9501\u652f\u7ebf\u5267\u60c5'},
    'B':{name:'\u6b8b\u9875\u56de\u6267', desc:'\u83b7\u5f97\u57fa\u7840\u8d44\u6e90\u5956\u52b1'},
    'C':{name:'\u672a\u51dd\u96fe\u7247', desc:'\u4efb\u52a1\u5931\u8d25\uff0c\u53ef\u91cd\u7f6e\u526f\u672c\u518d\u6b21\u6311\u6218'}
  };
  return Object.assign({rank:rank, at:Date.now()}, map[rank] || map.C);
}
function dreamSceneImageHTML(run){
  var img = (run && run.sceneImage) || dreamSlot().sceneImage || '';
  var style = img ? ' style="background-image:url('+img+');"' : '';
  return '<div class="dream-scene-image'+(img?' filled':'')+'"'+style+'><button type="button" onclick="dreamPickSceneImage()">'+(img?'\u66f4\u6362\u573a\u666f':'\u4e0a\u4f20\u526f\u672c\u573a\u666f')+'</button></div>';
}
function dreamRenderRun(){
  dreamEnsureStateShape();
  var wrap = document.getElementById('dream-run-panel');
  if(!wrap) return;
  var run = dreamState.run;
  if(!run){
    wrap.innerHTML = '<div class="dream-run-page"><div class="dream-portal-idle"><div id="dream-vortex" class="dream-vortex"><span></span></div><b>\u7b49\u5f85\u68a6\u6838\u542f\u52a8</b><small>\u9009\u62e9\u5b58\u6863\u3001\u5199\u5165\u4e16\u754c\u3001\u9080\u8bf7\u8054\u7cfb\u4eba\u540e\u8fdb\u5165</small></div><div id="dream-choice-card" class="dream-choice-card"></div><div id="dream-chat" class="dream-chat"></div><div id="dream-result" class="dream-result"></div></div>';
    return;
  }
  var names = run.contacts.map(dreamContactName).join(' / ');
  var title = (run.worldConfig && run.worldConfig.name) || '\u68a6\u6838\u526f\u672c';
  var vortexHTML = dreamState.phase === 'vortex' ? '<div id="dream-vortex" class="dream-vortex dream-transition"><span></span></div>' : '<div id="dream-vortex" class="dream-vortex" style="display:none"><span></span></div>';
  wrap.innerHTML = '<div class="dream-run-page">'+vortexHTML+'<div class="dream-run-bar"><button type="button" class="dream-run-back" onclick="dreamBackToSetup()">&#8249;</button><div><b>'+esc(title)+'</b><small>'+esc(names)+'</small></div><span>'+esc(run.rank || (run.progress+'/4'))+'</span></div>'+dreamSceneImageHTML(run)+'<div class="dream-stage-head"><div><b>'+esc(run.objective || '\u7b49\u5f85\u4efb\u52a1')+'</b><small>\u8054\u7cfb\u4eba\u5148\u53d1\u8d77\u804a\u5929\uff0c\u65c1\u767d\u518d\u63a8\u8fdb\u5267\u60c5</small></div><span>'+esc(run.progress+'/4')+'</span></div><div class="dream-progress-track"><i style="width:'+Math.min(100, run.progress*25)+'%"></i></div><div id="dream-chat" class="dream-chat">'+run.messages.map(dreamMessageHTML).join('')+(dreamBusy?'<div class="dream-thinking">\u68a6\u6838\u6b63\u5728\u6f14\u7b97...</div>':'')+'</div><div id="dream-choice-card" class="dream-choice-card">'+dreamChoicesHTML(run)+'</div><div class="dream-chat-composer"><input id="dream-chat-input" maxlength="160" placeholder="\u8f93\u5165\u5361\u724c\u7f16\u53f7\u6216\u5bf9\u8054\u7cfb\u4eba\u8bf4\u7684\u8bdd"><button type="button" onclick="dreamSendPlayerMessage()">\u53d1\u9001</button></div><div id="dream-result" class="dream-result">'+dreamResultHTML(run)+'</div></div>';
  var chat = document.getElementById('dream-chat');
  if(chat) chat.scrollTop = chat.scrollHeight;
  var input = document.getElementById('dream-chat-input');
  if(input){ input.onkeydown = function(e){ if(e.key === 'Enter'){ e.preventDefault(); dreamSendPlayerMessage(); } }; }
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
  return run.choices.map(function(c, i){ return '<button type="button" onclick="dreamChooseCard('+i+')"><b>'+esc((i+1)+'. '+c.title)+'</b><small>'+esc(c.effect)+'</small><em>'+esc(c.risk)+'</em></button>'; }).join('');
}
function dreamResultHTML(run){
  if(!run || !run.rank) return '';
  var r = run.rewards && run.rewards[0] ? run.rewards[0] : {name:'', desc:''};
  return '<div class="dream-result-card"><div class="rank">'+esc(run.rank)+'</div><div><b>\u526f\u672c\u4efb\u52a1\u5b8c\u6210</b><small>\u8bc4\u5206 '+run.score+'/100</small><p>\u5956\u52b1\uff1a'+esc(r.name)+'\u3002'+esc(r.desc)+'</p></div></div><button type="button" class="dream-primary" onclick="dreamResetRun()">\u5f00\u542f\u65b0\u526f\u672c</button>';
}
function dreamResetRun(){
  dreamEnsureStateShape();
  dreamState.view = 'setup';
  dreamState.phase = 'setup';
  dreamState.run = null;
  dreamRenderRun();
  dreamRenderSetup();
  dreamRenderView();
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
