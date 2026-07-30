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
    if(typeof dreamState.run.turns !== 'number') dreamState.run.turns = 0;
    if(typeof dreamState.run.maxStages !== 'number') dreamState.run.maxStages = 4;
    if(typeof dreamState.run.awaitingCards !== 'boolean') dreamState.run.awaitingCards = false;
    if(typeof dreamState.run.mainTask !== 'string') dreamState.run.mainTask = dreamState.run.objective || '';
    if(typeof dreamState.run.briefed !== 'boolean') dreamState.run.briefed = false;
    if(!Array.isArray(dreamState.run.dreamMemories)) dreamState.run.dreamMemories = [];
    if(!dreamState.run.contactDreamMemory || typeof dreamState.run.contactDreamMemory !== 'object') dreamState.run.contactDreamMemory = {};
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
      dreamApplyDocToWorld(slot, text, file.name || '\u4e16\u754c\u4e66');
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

function dreamPlainLines(text){
  return String(text || '').replace(/\r/g, '\n').split(/\n+/).map(function(x){ return dreamCleanText(x); }).filter(Boolean);
}
function dreamFirstWords(text, max){
  return dreamCleanText(text).slice(0, max || 900);
}
function dreamApplyDocToWorld(slot, text, name){
  slot = slot || dreamSlot();
  var cfg = Object.assign(dreamDefaultWorldConfig(), slot.worldConfig || {});
  var lines = dreamPlainLines(text);
  var baseName = String(name || '').replace(/\.(txt|md|doc|docx)$/i, '').trim();
  var first = lines[0] || baseName || '\u672a\u547d\u540d\u4e16\u754c';
  if(!cfg.name) cfg.name = first.slice(0, 18);
  if(!cfg.background) cfg.background = dreamFirstWords(text, 1200) || ('\u6839\u636e\u6587\u6863\u300c'+baseName+'\u300d\u751f\u6210\u7684\u81ea\u5b9a\u4e49\u526f\u672c\u4e16\u754c\u3002');
  if(!cfg.era) cfg.era = '\u6587\u6863\u81ea\u5b9a\u4e49';
  if(!cfg.rules) cfg.rules = '\u5fc5\u987b\u9075\u5faa\u5bfc\u5165\u4e16\u754c\u4e66\uff0cWeChat \u8054\u7cfb\u4eba\u4fdd\u6301\u539f\u672c\u4eba\u8bbe\uff0c\u4e3b\u8981\u901a\u8fc7\u4f60\u4e0e\u8054\u7cfb\u4eba\u7684\u804a\u5929\u63a8\u8fdb\u5267\u60c5';
  if(!slot.templateLibrary){
    var taskLines = lines.filter(function(line){ return /\u4efb\u52a1|\u76ee\u6807|\u5361\u724c|\u9009\u62e9|\u63a2\u7d22|\u6218\u6597|\u4ea4\u6d89|\u7ebf\u7d22|task|card|choice/i.test(line); }).slice(0, 6);
    slot.templateLibrary = (taskLines.length ? taskLines : lines.slice(1, 5)).join('\n');
    if(!slot.templateLibrary) slot.templateLibrary = '\u63a2\u7d22\u6838\u5fc3\u573a\u666f|\u83b7\u5f97\u7b2c\u4e00\u6761\u4e3b\u7ebf\u7ebf\u7d22|\u53ef\u80fd\u66b4\u9732\u961f\u4f0d\u7acb\u573a\n\u4e0e\u5173\u952e\u5bf9\u8c61\u4ea4\u6d89|\u63a8\u8fdb\u8eab\u4efd\u548c\u4efb\u52a1\u771f\u76f8|\u53ef\u80fd\u89e6\u53d1\u9690\u85cf\u4ee3\u4ef7\n\u5206\u6790\u5f02\u5e38\u7ebf\u7d22|\u89e3\u9501\u4e0b\u4e00\u4e2a\u526f\u672c\u8282\u70b9|\u9519\u8bef\u63a8\u7406\u4f1a\u964d\u4f4e\u8bc4\u7ea7';
  }
  if(!slot.rewardPool) slot.rewardPool = 'S+\uff1a\u89e3\u9501\u9ad8\u96be\u5ea6\u526f\u672c\u4e0e\u81ea\u5b9a\u4e49\u5361\u724c\u6743\u9650\nS\uff1a\u89e3\u9501\u4e16\u754c\u9650\u5b9a\u5267\u60c5\nA\uff1a\u7a00\u6709\u9053\u5177\u4e0e\u652f\u7ebf\u7ebf\u7d22\nB\uff1a\u57fa\u7840\u8d44\u6e90\u5956\u52b1\nC\uff1a\u526f\u672c\u91cd\u7f6e\u8d44\u683c';
  slot.worldConfig = cfg;
  slot.world = cfg.background;
  return cfg;
}
function dreamReadWorldForm(){
  dreamEnsureStateShape();
  var slot = dreamSlot();
  var cfg = Object.assign(dreamDefaultWorldConfig(), slot.worldConfig || {});
  cfg.name = dreamInputValue('dream-world-name') || cfg.name;
  cfg.background = dreamInputValue('dream-world-input') || cfg.background;
  cfg.era = dreamInputValue('dream-era-input') || cfg.era;
  cfg.rules = dreamInputValue('dream-rules-input') || cfg.rules;
  cfg.npc = dreamInputValue('dream-npc-input') || cfg.npc;
  cfg.factions = dreamInputValue('dream-factions-input') || cfg.factions;
  cfg.resources = dreamInputValue('dream-resources-input') || cfg.resources;
  slot.rewardPool = dreamInputValue('dream-rewards-input') || slot.rewardPool;
  slot.templateLibrary = dreamInputValue('dream-templates-input') || slot.templateLibrary;
  cfg.docText = (slot.docs || []).map(function(d){ return d.name+'\n'+d.text; }).join('\n\n').slice(0, 20000);
  if(!cfg.background && cfg.docText) cfg.background = dreamFirstWords(cfg.docText, 1200);
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
  api.innerHTML = ready ? '<b>\u5168\u5c40 API \u5df2\u8fde\u63a5</b><small>'+esc(p.name || p.model || '\u5f53\u524d\u6a21\u578b')+'</small>' : '<b>\u5168\u5c40 API \u672a\u914d\u7f6e</b><small>\u96fe\u7ec7\u68a6\u6838\u9700\u8981\u8bbe\u7f6e\u91cc\u7684 API \u6d4b\u8bd5\u901a\u8fc7\u540e\u624d\u80fd\u5f00\u59cb\u526f\u672c</small>';
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
function dreamContactWorldBookPrompt(id){
  var c = contacts && contacts[id] ? contacts[id] : {};
  var parts = [];
  if(typeof getWorldBookPrompt === 'function'){
    var bound = getWorldBookPrompt(id);
    if(bound) parts.push(bound);
  }
  var ids = Array.isArray(c.worldBooks) ? c.worldBooks : [];
  ids.forEach(function(wid){
    if(typeof worldBooks !== 'undefined' && worldBooks && worldBooks[wid] && worldBooks[wid].content){
      parts.push('[Bound worldBooks] '+(worldBooks[wid].name || wid)+'\n'+worldBooks[wid].content);
    }
  });
  return parts.join('\n\n').slice(0, 9000);
}
function dreamMemoryLine(m, ownerId){
  if(!m || m.kind === 'typing') return '';
  var from = m.from || (m.mine ? 'me' : ownerId);
  var name = from === 'me' ? dreamPlayerName() : dreamContactName(from);
  var text = m.text || m.note || m.title || m.name || (m.kind ? '['+m.kind+']' : '');
  if(!text) return '';
  return name+': '+dreamCleanText(text).slice(0, 180);
}
function dreamBuildContactMemoryPrompt(id){
  var c = contacts && contacts[id] ? contacts[id] : {};
  var setting = dreamContactSetting(id);
  var parts = [
    '[WeChat contact sync]',
    'id: '+id,
    'name: '+dreamContactName(id),
    'dungeon role: '+(setting.role || 'unset'),
    'persona: '+(c.persona || c.tone || c.bio || 'unset'),
    'userPrompt: '+(c.userPrompt || 'unset'),
    'tone: '+(c.tone || 'unset')
  ];
  if(c.memory && c.memory.enabled !== false && c.memory.summary) parts.push('memory.summary: '+c.memory.summary);
  if(c.relations && c.relations.length) parts.push('relations: '+JSON.stringify(c.relations).slice(0, 1600));
  var seed = Array.isArray(c.seed) ? c.seed.slice(-30) : [];
  if(seed.length) parts.push('recent seed.slice(-30):\n'+seed.map(function(m){ return dreamMemoryLine(m, id); }).filter(Boolean).join('\n'));
  var wb = dreamContactWorldBookPrompt(id);
  if(wb) parts.push('worldBooks:\n'+wb);
  return parts.join('\n').slice(0, 12000);
}
function dreamBuildRelationshipMemoryPrompt(run){
  run = run || dreamState.run;
  var ids = run && Array.isArray(run.contacts) ? run.contacts : [];
  var parts = ['[Relationship memory between selected WeChat contacts]'];
  ids.forEach(function(id){
    var c = contacts && contacts[id] ? contacts[id] : null;
    if(c && c.relations && c.relations.length) parts.push(dreamContactName(id)+' relations: '+JSON.stringify(c.relations).slice(0, 1000));
  });
  Object.keys(contacts || {}).forEach(function(gid){
    var g = contacts[gid];
    if(!g || !g.isGroup || !Array.isArray(g.members)) return;
    var overlap = g.members.filter(function(mid){ return ids.indexOf(mid) >= 0; });
    if(overlap.length < 2) return;
    parts.push('group: '+(g.displayName || g.name || gid)+' members: '+overlap.map(dreamContactName).join(', '));
    if(g.groupUserPrompt) parts.push('groupUserPrompt: '+g.groupUserPrompt);
    if(g.memory && g.memory.enabled !== false && g.memory.summary) parts.push('memory.summary: '+g.memory.summary);
    var seed = Array.isArray(g.seed) ? g.seed.slice(-24) : [];
    if(seed.length) parts.push('group seed.slice(-24):\n'+seed.map(function(m){ return dreamMemoryLine(m, m.from || gid); }).filter(Boolean).join('\n'));
    if(typeof getWorldBookPrompt === 'function'){
      var wb = getWorldBookPrompt(gid);
      if(wb) parts.push('group worldBooks:\n'+wb);
    }
  });
  return parts.join('\n').slice(0, 14000);
}
function dreamBuildRunLogPrompt(run){
  run = run || dreamState.run;
  if(!run) return '';
  var lines = (run.messages || []).slice(-24).map(function(m){
    var who = m.role === 'contact' ? dreamContactName(m.contactId) : (m.role === 'user' ? dreamPlayerName() : m.role);
    return who+': '+dreamCleanText(m.text || '').slice(0, 240);
  }).filter(Boolean);
  var memories = (run.dreamMemories || []).slice(-18).map(function(x){ return (x.speaker || x.role || 'memory')+': '+dreamCleanText(x.text || '').slice(0, 180); });
  return [
    '[Current dungeon run log]',
    'objective: '+(run.mainTask || run.objective || ''),
    'progress: '+(run.progress || 0)+'/'+(run.maxStages || 4),
    'inventory: '+(run.inventory || []).map(function(x){ return x.name || x.title || x.rank || ''; }).filter(Boolean).join(', '),
    'usedCards: '+(run.usedCards || []).join(', '),
    lines.join('\n'),
    memories.length ? '[Dream run memories]\n'+memories.join('\n') : ''
  ].filter(Boolean).join('\n').slice(0, 12000);
}
function dreamBuildScriptMurderSystem(mode){
  return [
    'You are the live engine for Fated OS Dreamcore, a script-murder interactive dungeon. Reply in Chinese unless quoted canon says otherwise.',
    'Hard canon: uploaded dungeon documents, world book, contact persona, userPrompt, tone, memory.summary, seed.slice chat history, and relationship memory are binding.',
    'WeChat contacts must feel alive: use their private motives, habits, relationship history, hesitations, jealousy, trust, conflicts, and speaking rhythm. Never write generic template lines.',
    'NPCs may appear when the uploaded setting allows it. The narrator may control NPCs, clues, rules, scenes, threats, and rewards. Do not overwrite contact identity.',
    'Give user and WeChat contacts enough time to roleplay and investigate. Do not rush card tasks; cards appear only at meaningful pressure points.',
    'No emoji. Do not mention AI, model, prompt, system, fallback, or local generation in character.',
    'no local fallback: if there is not enough canon, ask the scene to reveal uncertainty through clues instead of inventing unrelated setting.',
    mode ? ('mode: '+mode) : ''
  ].filter(Boolean).join('\n');
}
function dreamBuildContactActionPrompt(id, trigger){
  var run = dreamState.run;
  return [
    dreamBuildWorldPrompt(run),
    dreamBuildContactMemoryPrompt(id),
    dreamBuildRelationshipMemoryPrompt(run),
    dreamBuildRunLogPrompt(run),
    '[Trigger]',
    trigger || 'continue',
    'Write only what '+dreamContactName(id)+' says or does now, 1-3 natural lines. Keep the original persona, relationship memory, tone, and current dungeon fear/desire. The contact may question, hide information, accuse, cooperate, hesitate, or reveal clues according to memory. No narrator voice. No emoji.'
  ].join('\n\n');
}
function dreamBuildNarratorPrompt(includeCards){
  var run = dreamState.run;
  var profiles = (run.contacts || []).map(dreamBuildContactMemoryPrompt).join('\n\n---\n\n');
  var cardFormat = includeCards ? '\nCARD|title|effect|risk\nCARD|title|effect|risk\nCARD|title|effect|risk' : '';
  var cardRule = includeCards ? 'Generate 2-4 card tasks from the uploaded dungeon template or world rules. They must be concrete actions the players can choose, not generic choices.' : 'Do not generate cards yet. Continue scene pressure and clues while leaving room for user/contact dialogue.';
  return [
    dreamBuildWorldPrompt(run),
    '[Participants]',
    profiles,
    dreamBuildRelationshipMemoryPrompt(run),
    dreamBuildRunLogPrompt(run),
    '[Narrator rules]',
    cardRule,
    'The story is mainly advanced by user and WeChat contacts talking and investigating. NPCs are allowed. The narrator should create scene, clue, danger, motive, and task pressure, but should not speak as selected contacts.',
    'Strict output format:',
    'OBJECTIVE|current main objective',
    'SCENE|immersive narrator scene with identity, clue, task pressure, and enough room for roleplay'+cardFormat,
    'No emoji.'
  ].join('\n\n');
}
function dreamAppendDreamMemory(run, speakerId, text){
  if(!run || !text) return;
  if(!Array.isArray(run.dreamMemories)) run.dreamMemories = [];
  var speaker = speakerId === 'user' ? dreamPlayerName() : (speakerId === 'narrator' || speakerId === 'system' ? speakerId : dreamContactName(speakerId));
  run.dreamMemories.push({speaker:speaker, role:speakerId || '', text:dreamCleanText(text).slice(0, 240), at:Date.now()});
  if(run.dreamMemories.length > 80) run.dreamMemories = run.dreamMemories.slice(-80);
  if(speakerId && speakerId !== 'user' && speakerId !== 'narrator' && speakerId !== 'system'){
    if(!run.contactDreamMemory) run.contactDreamMemory = {};
    if(!Array.isArray(run.contactDreamMemory[speakerId])) run.contactDreamMemory[speakerId] = [];
    run.contactDreamMemory[speakerId].push({text:dreamCleanText(text).slice(0, 220), at:Date.now()});
    if(run.contactDreamMemory[speakerId].length > 30) run.contactDreamMemory[speakerId] = run.contactDreamMemory[speakerId].slice(-30);
  }
}
function dreamPushMessage(run, msg){
  if(!run || !msg) return;
  run.messages.push(msg);
  dreamAppendDreamMemory(run, msg.role === 'contact' ? msg.contactId : msg.role, msg.text || '');
}
function dreamMarkApiFailure(text){
  dreamBusy = false;
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(run) dreamPushMessage(run, {role:'system', text:text || 'Dreamcore API failed. Please test the global API in Settings and retry.', at:Date.now()});
  dreamState.phase = run ? 'run' : dreamState.phase;
  dreamRenderRun();
  saveState();
}
function dreamContactProfile(id){
  return dreamBuildContactMemoryPrompt(id);
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

function dreamSlotIsEmpty(slot){
  slot = slot || dreamSlot();
  return !(slot.updatedAt || slot.world || slot.wallpaper || slot.sceneImage || (slot.docs && slot.docs.length) || (slot.runs && slot.runs.length) || (slot.inventory && slot.inventory.length));
}
function dreamNewSlot(){
  dreamEnsureStateShape();
  var target = dreamState.slots.findIndex(function(s){ return dreamSlotIsEmpty(s); });
  if(target < 0) target = dreamState.activeSlot;
  if(!dreamSlotIsEmpty(dreamState.slots[target]) && typeof confirm === 'function' && !confirm('\u5f53\u524d\u6ca1\u6709\u7a7a\u5b58\u6863\uff0c\u662f\u5426\u8986\u76d6\u5f53\u524d\u5b58\u6863\uff1f')) return;
  dreamState.activeSlot = target;
  dreamState.slots[target] = dreamDefaultSlot(target);
  dreamState.view = 'setup';
  dreamState.phase = 'setup';
  dreamState.run = null;
  dreamState.selectedContacts = [];
  dreamRenderSaveBurst('\u65b0\u5b58\u6863\u5df2\u5efa\u7acb');
  dreamRenderSetup();
  dreamRenderRun();
  dreamRenderView();
  saveState();
}
function dreamDeleteSlot(){
  dreamEnsureStateShape();
  var i = dreamState.activeSlot;
  if(!dreamSlotIsEmpty(dreamState.slots[i]) && typeof confirm === 'function' && !confirm('\u5220\u9664\u5f53\u524d\u5b58\u6863\uff1f\u5df2\u5bfc\u5165\u6587\u6863\u3001\u80cc\u5305\u548c\u526f\u672c\u8bb0\u5f55\u90fd\u4f1a\u6e05\u7a7a\u3002')) return;
  dreamState.slots[i] = dreamDefaultSlot(i);
  dreamState.selectedContacts = [];
  dreamState.view = 'setup';
  dreamState.phase = 'setup';
  dreamState.run = null;
  dreamRenderSaveBurst('\u5b58\u6863\u5df2\u5220\u9664');
  dreamRenderSetup();
  dreamRenderRun();
  dreamRenderView();
  saveState();
}
function dreamPlayerName(){
  return (typeof userName === 'string' && userName) || (contacts && contacts.me && (contacts.me.displayName || contacts.me.name)) || 'User';
}
function dreamDeriveMainTask(cfg, slot){
  var lines = dreamPlainLines((slot && slot.templateLibrary) || '');
  var explicit = lines.find(function(line){ return /\u4e3b\u7ebf|\u4efb\u52a1|\u76ee\u6807|main|task|objective/i.test(line); });
  if(explicit) return explicit.replace(/^[-*\d.\s]+/, '').slice(0, 90);
  var docLines = dreamPlainLines((cfg && cfg.docText) || (cfg && cfg.background) || '');
  if(docLines.length) return '\u6839\u636e\u300c'+((cfg && cfg.name) || '\u5bfc\u5165\u4e16\u754c')+'\u300d\u7684\u89c4\u5219\uff0c\u5728\u526f\u672c\u4e2d\u627e\u5230\u6838\u5fc3\u51b2\u7a81\u7684\u89e3\u6cd5';
  return '\u63a2\u7d22\u5f53\u524d\u4e16\u754c\uff0c\u786e\u8ba4\u4f60\u4e0e WeChat \u8054\u7cfb\u4eba\u7684\u8eab\u4efd\uff0c\u5b8c\u6210\u65c1\u767d\u53d1\u5e03\u7684\u4e3b\u7ebf\u4efb\u52a1';
}
function dreamBuildIdentityBrief(run){
  var cfg = Object.assign(dreamDefaultWorldConfig(), (run && run.worldConfig) || {});
  var task = run.mainTask || dreamDeriveMainTask(cfg, dreamSlot());
  var contactLines = (run.contacts || []).map(function(id){
    var setting = run.contactSettings && run.contactSettings[id] ? run.contactSettings[id] : dreamContactSetting(id);
    var role = setting.role || '\u672a\u6307\u5b9a\u8eab\u4efd';
    return dreamContactName(id)+'\uff1a'+role;
  }).join('\n');
  return '\u65c1\u767d\uff1a\u526f\u672c\u5df2\u7a33\u5b9a\u3002\n\u4f60\u7684\u8eab\u4efd\uff1a'+dreamPlayerName()+'\uff0c\u623f\u4e3b\u4e0e\u5267\u60c5\u53c2\u4e0e\u8005\uff0c\u53ef\u4ee5\u901a\u8fc7\u804a\u5929\u63a8\u8fdb\u526f\u672c\u3002\nWeChat \u8054\u7cfb\u4eba\u8eab\u4efd\uff1a\n'+contactLines+'\n\u4e3b\u7ebf\u4efb\u52a1\uff1a'+task+'\n\u89c4\u5219\uff1a\u5148\u7531\u8054\u7cfb\u4eba\u5f00\u53e3\uff0c\u4f60\u4eec\u901a\u8fc7\u5bf9\u8bdd\u81ea\u884c\u63a2\u7d22\uff0c\u65c1\u767d\u4f1a\u5728\u5173\u952e\u8282\u70b9\u653e\u51fa\u5361\u724c\u4efb\u52a1\u3002';
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
function dreamApiReady(){
  var p = dreamActiveApiProfile();
  return !!(p && p.key && p.endpoint && p.model);
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
  var finish = dreamTimeout(9000, cb);
  if(!dreamApiReady()){ finish(null); return; }
  var msgs = [];
  if(systemPrompt) msgs.push({role:'system', content:systemPrompt});
  msgs.push({role:'user', content:prompt});
  fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:msgs, provider:'custom', key:p.key, endpoint:p.endpoint, dataModel:p.model, model:p.model, apiFormat:p.apiFormat || 'openai', max_tokens:1000, temperature:typeof p.temperature === 'number' ? p.temperature : 0.82, stream:false})}).then(function(r){ return r.json(); }).then(function(d){ finish(dreamCleanText(dreamParseAIText(d))); }).catch(function(){ finish(null); });
}
function dreamCleanText(text){ return String(text || '').replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/\s+/g, ' ').trim(); }
function dreamStartRun(){
  dreamEnsureStateShape();
  var slot = dreamSlot();
  var cfg = dreamReadWorldForm();
  if(!cfg.docText && slot.docs && slot.docs.length) cfg.docText = slot.docs.map(function(d){ return d.name+'\n'+d.text; }).join('\n\n').slice(0, 20000);
  if(!cfg.background && cfg.docText) cfg.background = dreamFirstWords(cfg.docText, 1200);
  if(!cfg.name) cfg.name = cfg.background ? cfg.background.slice(0, 12) : '\u672a\u547d\u540d\u4e16\u754c';
  if(!cfg.background){ dreamToast('\u8bf7\u5148\u5bfc\u5165\u4e16\u754c\u6587\u6863\u6216\u5199\u5165\u4e16\u754c\u89c2'); return; }
  if(!dreamApiReady()){ dreamToast('\u8bf7\u5148\u5230\u8bbe\u7f6e\u91cc\u914d\u7f6e\u5e76\u6d4b\u8bd5\u901a\u8fc7 API'); return; }
  slot.worldConfig = cfg;
  slot.world = cfg.background;
  var enabled = dreamContactIds().filter(dreamContactEnabled);
  dreamState.selectedContacts = enabled.slice();
  if(!enabled.length){ dreamToast('\u8bf7\u9009\u62e9\u81f3\u5c11\u4e00\u4f4d WeChat \u8054\u7cfb\u4eba'); return; }
  var mainTask = dreamDeriveMainTask(cfg, slot);
  dreamState.view = 'run';
  dreamState.phase = 'vortex';
  dreamState.run = {id:'dream-'+Date.now().toString(36), startedAt:Date.now(), world:cfg.background, worldConfig:Object.assign({}, cfg), rewardPool:slot.rewardPool || '', templateLibrary:slot.templateLibrary || '', sceneImage:slot.sceneImage || '', contacts:enabled, contactSettings:JSON.parse(JSON.stringify(slot.contactSettings || {})), inventory:(slot.inventory || []).slice(), progress:0, maxStages:4, turns:0, score:0, rank:'', rewards:[], messages:[], choices:[], usedCards:[], dreamMemories:[], contactDreamMemory:{}, awaitingCards:false, briefed:false, mainTask:mainTask, objective:mainTask};
  dreamOpenRunView();
  dreamRenderSetup();
  saveState();
  dreamRenderVortex(function(){
    dreamState.phase = 'run';
    dreamRenderRun();
    saveState();
    dreamContactFirstMessage(function(){ dreamGenerateOpeningBrief(); });
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
  var prompt = dreamBuildContactActionPrompt(first, 'The portal has just pulled everyone into the dungeon. Rule: the WeChat contact must send the first message before narrator briefing. Start with a living, memory-aware first line, under 80 Chinese characters.');
  dreamCallAI(prompt, dreamBuildScriptMurderSystem('contact-first-message'), function(text){
    if(!dreamState.run || dreamState.run.id !== run.id) return;
    if(!text){ dreamMarkApiFailure('\u5168\u5c40 API \u672a\u914d\u7f6e\u6216\u8c03\u7528\u5931\u8d25\uff0c\u8bf7\u5148\u5728\u8bbe\u7f6e\u91cc\u5b8c\u6210 API \u6d4b\u8bd5\u540e\u91cd\u8bd5\u526f\u672c\u3002'); return; }
    dreamBusy = false;
    dreamPushMessage(run, {role:'contact', contactId:first, text:text, at:Date.now()});
    dreamState.phase = 'run';
    dreamRenderRun();
    saveState();
    if(done) done();
  });
}
function dreamGenerateOpeningBrief(){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run || run.briefed) return;
  run.briefed = true;
  dreamPushMessage(run, {role:'narrator', text:dreamBuildIdentityBrief(run), at:Date.now()});
  run.choices = [];
  run.awaitingCards = false;
  dreamRenderRun();
  saveState();
}
function dreamGenerateScene(){
  dreamEnsureStateShape();
  var run = dreamState.run;
  if(!run) return;
  var cardReady = dreamShouldGenerateCards(run);
  dreamBusy = true;
  dreamRenderRun();
  var prompt = dreamBuildNarratorPrompt(cardReady);
  dreamCallAI(prompt, dreamBuildScriptMurderSystem('narrator'), function(text){
    if(!dreamState.run || dreamState.run.id !== run.id) return;
    if(!text){ dreamMarkApiFailure('\u65c1\u767d\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u5728\u8bbe\u7f6e\u91cc\u786e\u8ba4\u5168\u5c40 API \u6d4b\u8bd5\u901a\u8fc7\u540e\u7ee7\u7eed\u526f\u672c\u3002'); return; }
    dreamBusy = false;
    var parsed = dreamParseScene(text, cardReady, run);
    dreamPushMessage(run, {role:'narrator', text:parsed.scene, at:Date.now()});
    run.objective = parsed.objective || run.objective;
    run.choices = cardReady ? parsed.cards : [];
    run.awaitingCards = cardReady;
    dreamRenderRun();
    saveState();
  });
}
function dreamParseScene(text, includeCards, run){
  var out = {scene:'', objective:'', cards:[]};
  var lines = String(text || '').split(/\n+/).map(dreamCleanText).filter(Boolean);
  lines.forEach(function(line){
    if(line.indexOf('OBJECTIVE|') === 0) out.objective = line.split('|').slice(1).join('|').trim();
    if(line.indexOf('SCENE|') === 0) out.scene = line.split('|').slice(1).join('|').trim();
    if(includeCards && line.indexOf('CARD|') === 0){ var p = line.split('|'); out.cards.push({id:'card-'+Date.now().toString(36)+'-'+out.cards.length, title:p[1] || '\u672a\u77e5\u9009\u9879', effect:p[2] || '\u6539\u53d8\u526f\u672c\u8d70\u5411', risk:p[3] || '\u98ce\u9669\u672a\u660e'}); }
  });
  if(!out.objective) out.objective = (run && (run.mainTask || run.objective)) || '\u5b8c\u6210\u65c1\u767d\u53d1\u5e03\u7684\u6838\u5fc3\u4efb\u52a1';
  if(!out.scene) out.scene = dreamCleanText(text).slice(0, 900) || ((run && (run.mainTask || run.objective)) || '\u65c1\u767d\u6b63\u5728\u7b49\u5f85\u66f4\u6e05\u6670\u7684\u526f\u672c\u56de\u5e94');
  if(includeCards && out.cards.length < 2){
    var templated = dreamTemplateCards(run).concat(out.cards || []);
    out.cards = templated.length >= 2 ? templated.slice(0, 4) : out.cards;
  }
  return out;
}
function dreamFallbackScene(){
  var list = ['\u6f29\u6da1\u7684\u8fb9\u754c\u5728\u8eab\u540e\u95ed\u5408\uff0c\u4e00\u6761\u6ca1\u6709\u706f\u7684\u957f\u5eca\u5411\u524d\u5ef6\u4f38\u3002\u65c1\u767d\u5ba3\u544a\uff1a\u627e\u5230\u7b2c\u4e00\u4e2a\u80fd\u8bc1\u660e\u4f60\u4eec\u5b58\u5728\u7684\u7269\u4ef6\u3002','\u4e16\u754c\u4e66\u5728\u7a7a\u6c14\u91cc\u7ffb\u9875\uff0c\u6240\u6709\u540d\u5b57\u88ab\u8584\u96fe\u91cd\u5199\u3002\u4efb\u52a1\u662f\u5728\u9519\u8bef\u7684\u8bb0\u5fc6\u4e2d\u627e\u51fa\u771f\u6b63\u7684\u51fa\u53e3\u3002','\u5b58\u6863\u53e3\u7684\u5149\u6c89\u5165\u5730\u9762\uff0c\u4e09\u5f20\u672a\u7b7e\u540d\u7684\u5361\u724c\u9646\u7eed\u9192\u6765\u3002\u4f60\u4eec\u9700\u8981\u5148\u786e\u8ba4\u8c01\u5728\u8bf4\u8c0e\u3002'];
  return list[Math.floor(Math.random()*list.length)];
}
function dreamFallbackCards(existing, run){
  var cards = dreamTemplateCards(run).concat(existing || []);
  var pool = [
    {title:'\u63a2\u67e5\u4e3b\u7ebf\u7ebf\u7d22', effect:'\u901a\u8fc7\u73b0\u573a\u7ec6\u8282\u63a8\u8fdb\u4efb\u52a1', risk:'\u53ef\u80fd\u66b4\u9732\u961f\u4f0d\u610f\u56fe'},
    {title:'\u4e0e\u5173\u952e\u5bf9\u8c61\u4ea4\u6d89', effect:'\u83b7\u53d6\u9690\u85cf\u60c5\u62a5\u6216\u652f\u7ebf\u5165\u53e3', risk:'\u5bf9\u65b9\u4f1a\u7d22\u8981\u4ee3\u4ef7'},
    {title:'\u8bd5\u63a2\u4e16\u754c\u89c4\u5219', effect:'\u786e\u8ba4\u5f53\u524d\u526f\u672c\u7684\u9690\u6027\u9650\u5236', risk:'\u89c4\u5219\u53ef\u80fd\u88ab\u53cd\u5411\u6fc0\u6d3b'},
    {title:'\u4fdd\u7559\u5bf9\u8bdd\u65f6\u95f4', effect:'\u8ba9\u8054\u7cfb\u4eba\u7ee7\u7eed\u6f14\u7ece\u5e76\u81ea\u884c\u53d1\u73b0\u7ebf\u7d22', risk:'\u8fdb\u5ea6\u53d8\u6162\u4f46\u53ef\u80fd\u63d0\u5347\u8bc4\u7ea7'}
  ];
  while(cards.length < 3) cards.push(pool[cards.length % pool.length]);
  return cards.slice(0,4).map(function(c, i){ c.id = c.id || 'fallback-'+i; return c; });
}
function dreamTemplateCards(run){
  var raw = (run && run.templateLibrary) || dreamSlot().templateLibrary || '';
  return dreamPlainLines(raw).slice(0, 4).map(function(line, i){
    var parts = line.split('|').map(function(x){ return dreamCleanText(x); }).filter(Boolean);
    if(parts.length >= 2) return {id:'template-'+i, title:parts[0].slice(0, 28), effect:(parts[1] || '\u63a8\u8fdb\u526f\u672c\u4efb\u52a1').slice(0, 80), risk:(parts[2] || '\u4ee3\u4ef7\u7531\u5267\u60c5\u5224\u5b9a').slice(0, 80)};
    return {id:'template-'+i, title:line.slice(0, 28), effect:'\u6267\u884c\u526f\u672c\u8bbe\u7f6e\u4e2d\u7684\u81ea\u5b9a\u4e49\u4efb\u52a1', risk:'\u7ed3\u679c\u4f9d\u636e\u4f60\u4e0e\u8054\u7cfb\u4eba\u7684\u6f14\u7ece\u5224\u5b9a'};
  });
}
function dreamShouldGenerateCards(run){
  if(!run || run.rank) return false;
  if(run.awaitingCards && run.choices && run.choices.length) return true;
  var neededTurns = Math.min(4, 2 + Math.max(0, run.progress));
  return !!run.briefed && !dreamBusy && (!run.choices || !run.choices.length) && run.turns >= neededTurns;
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
  dreamPushMessage(run, {role:'user', text:'\u5361\u724c '+(i+1)+'\uff1a'+card.title+'\u3002'+card.effect+'\u3002\u98ce\u9669\uff1a'+card.risk, at:Date.now()});
  run.progress += 1;
  run.turns = 0;
  run.awaitingCards = false;
  run.score += dreamCardScore(card, run.progress);
  run.choices = [];
  saveState();
  dreamRenderRun();
  if(run.progress >= (run.maxStages || 4)){ dreamCompleteRun(); return; }
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
  if(run.choices && run.choices.length){
    if(cardIndex >= 0 && cardIndex < run.choices.length){ dreamChooseCard(cardIndex); return; }
    dreamToast('\u5f53\u524d\u662f\u5361\u724c\u8282\u70b9\uff0c\u8bf7\u8f93\u5165\u5bf9\u5e94\u5361\u724c\u7f16\u53f7');
    return;
  }
  dreamPushMessage(run, {role:'user', text:text, at:Date.now()});
  run.turns = (run.turns || 0) + 1;
  run.score += Math.min(4, Math.max(1, Math.round(text.length / 28)));
  saveState();
  dreamRenderRun();
  dreamContactReact({title:'\u81ea\u7531\u804a\u5929', effect:text, risk:'\u526f\u672c\u4f1a\u6839\u636e\u5bf9\u8bdd\u504f\u79fb'}, function(){ dreamGenerateScene(); });
}
function dreamContactReact(card, done){
  var run = dreamState.run;
  if(!run) return;
  var id = run.contacts[Math.max(0, run.progress + run.turns) % run.contacts.length];
  dreamBusy = true;
  dreamRenderRun();
  var trigger = 'Current player event or card: '+(card.title || '')+' / '+(card.effect || '')+' / '+(card.risk || '')+'. Continue as this contact with memory-aware roleplay. If another selected contact has relevant shared memory, react to it naturally.';
  dreamCallAI(dreamBuildContactActionPrompt(id, trigger), dreamBuildScriptMurderSystem('contact-reaction'), function(text){
    if(!dreamState.run || dreamState.run.id !== run.id) return;
    if(!text){ dreamMarkApiFailure('\u8054\u7cfb\u4eba\u6f14\u7ece\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u8bbe\u7f6e\u91cc\u7684\u5168\u5c40 API \u53ef\u6b63\u5e38\u8c03\u7528\u3002'); return; }
    dreamBusy = false;
    dreamPushMessage(run, {role:'contact', contactId:id, text:text, at:Date.now()});
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
  dreamPushMessage(run, {role:'system', text:'\u526f\u672c\u7ed3\u7b97\uff1a'+rank+' / '+reward.name, at:Date.now()});
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
  var maxStages = run.maxStages || 4;
  var vortexHTML = dreamState.phase === 'vortex' ? '<div id="dream-vortex" class="dream-vortex dream-transition"><span></span></div>' : '<div id="dream-vortex" class="dream-vortex" style="display:none"><span></span></div>';
  wrap.innerHTML = '<div class="dream-run-page">'+vortexHTML+'<div class="dream-run-bar"><button type="button" class="dream-run-back" onclick="dreamBackToSetup()">&#8249;</button><div><b>'+esc(title)+'</b><small>'+esc(names)+'</small></div><span>'+esc(run.rank || (run.progress+'/'+maxStages))+'</span></div>'+dreamSceneImageHTML(run)+'<div class="dream-stage-head"><div><b>'+esc(run.objective || '\u7b49\u5f85\u4efb\u52a1')+'</b><small>\u5148\u770b\u8eab\u4efd\u4e0e\u4e3b\u7ebf\u4efb\u52a1\uff0c\u518d\u901a\u8fc7\u804a\u5929\u63a2\u7d22\u5230\u5361\u724c\u8282\u70b9</small></div><span>'+esc(run.progress+'/'+maxStages)+'</span></div><div class="dream-progress-track"><i style="width:'+Math.min(100, run.progress*(100/maxStages))+'%"></i></div><div id="dream-chat" class="dream-chat">'+run.messages.map(dreamMessageHTML).join('')+(dreamBusy?'<div class="dream-thinking">\u68a6\u6838\u6b63\u5728\u6f14\u7b97...</div>':'')+'</div><div id="dream-choice-card" class="dream-choice-card">'+dreamChoicesHTML(run)+'</div><div class="dream-chat-composer"><input id="dream-chat-input" maxlength="160" placeholder="\u5148\u548c WeChat \u8054\u7cfb\u4eba\u6f14\u7ece\uff0c\u5361\u724c\u51fa\u73b0\u540e\u8f93\u5165\u7f16\u53f7"><button type="button" onclick="dreamSendPlayerMessage()">\u53d1\u9001</button></div><div id="dream-result" class="dream-result">'+dreamResultHTML(run)+'</div></div>';
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
  if(!run.choices || !run.choices.length) return '<div class="dream-choice-wait">\u7ee7\u7eed\u548c WeChat \u8054\u7cfb\u4eba\u804a\u5929\u6f14\u7ece\uff0c\u65c1\u767d\u4f1a\u5728\u5173\u952e\u8282\u70b9\u653e\u51fa\u5361\u724c\u4efb\u52a1</div>';
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
