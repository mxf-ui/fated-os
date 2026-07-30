// Same-origin API proxy base. Cloudflare Pages Functions handle /api/chat and /api/models.
function proxyBase(){ return ''; }

function normEp(endpoint, fmt){
  if(!endpoint) return '';
  var ep = String(endpoint).trim();
  if(!ep) return '';
  var m = ep.match(/^(https?:\/\/)(.*)/);
  if(m) ep = m[1] + m[2].replace(/^(https?:\/\/)+/, '');
  if(ep.indexOf('http://')!==0 && ep.indexOf('https://')!==0) ep = 'https://'+ep;
  ep = ep.replace(/\/+$/,'');
  fmt = fmt || 'openai';
  if(fmt==='gemini'){
    if(/:generateContent$/i.test(ep)) return ep;
    if(/\/models\/[^/]+$/i.test(ep)) return ep+':generateContent';
    return ep;
  }
  if(fmt==='claude'){
    if(/\/messages$/i.test(ep)) return ep;
    if(/\/v1$/i.test(ep)) return ep+'/messages';
    return ep+'/v1/messages';
  }
  if(/\/chat\/completions$/i.test(ep)) return ep;
  if(/\/v1\/chat$/i.test(ep)) return ep+'/completions';
  if(/\/v1$/i.test(ep)) return ep+'/chat/completions';
  return ep+'/v1/chat/completions';
}
function modelEndpoint(m, model){
  var fmt = (m && m.apiFormat) || (model==='claude' ? 'claude' : model==='gemini' ? 'gemini' : 'openai');
  var ep = normEp(m && m.endpoint, fmt);
  if(fmt==='gemini' && ep && !/\/models\/[^/]+(?::generateContent)?$/i.test(ep)){
    var mid = String((m && m.model) || 'gemini-2.5-pro').replace(/^models\//i,'');
    ep = ep.replace(/\/models$/i,'').replace(/\/+$/,'') + '/models/' + encodeURIComponent(mid) + ':generateContent';
  }
  return ep;
}
function modelListEndpoint(endpoint, fmt){
  var ep = String(endpoint||'').trim();
  if(!ep) return '';
  var m = ep.match(/^(https?:\/\/)(.*)/);
  if(m) ep = m[1] + m[2].replace(/^(https?:\/\/)+/, '');
  if(ep.indexOf('http://')!==0 && ep.indexOf('https://')!==0) ep = 'https://'+ep;
  ep = ep.replace(/\/+$/,'');
  fmt = fmt || 'openai';
  if(fmt==='gemini'){
    ep = ep.replace(/\/models\/[^/]+(?::generateContent)?$/i, '');
    return ep.replace(/\/+$/,'') + '/models';
  }
  if(fmt==='claude') return ep.replace(/\/v1\/messages$/i,'/v1').replace(/\/messages$/i,'/v1');
  return ep.replace(/\/v1\/chat\/completions$/i,'/v1').replace(/\/chat\/completions$/i,'/v1').replace(/\/v1\/chat$/i,'/v1').replace(/\/+$/,'') + '/models';
}
function ensureApiProfiles(){
  if(!Array.isArray(apiConfig.profiles)) apiConfig.profiles=[];
  if(apiConfig.profiles.length===0){
    var legacy = apiConfig.models && apiConfig.models[apiConfig.activeModel] ? apiConfig.models[apiConfig.activeModel] : (apiConfig.models && apiConfig.models.custom) || {};
    var fmt = legacy.apiFormat || (apiConfig.activeModel==='claude'?'claude':apiConfig.activeModel==='gemini'?'gemini':'openai');
    apiConfig.profiles.push(createApiProfile('profile-'+Date.now(), legacy.name || '我的 API 配置', legacy.endpoint || '', legacy.key || '', legacy.model || '', fmt, legacy.temperature, legacy.stream));
  }
  apiConfig.profiles.forEach(function(p, i){
    if(!p.id) p.id='profile-'+Date.now()+'-'+i;
    if(!p.name) p.name='API 配置 '+(i+1);
    if(!p.apiFormat) p.apiFormat='openai';
    if(typeof p.temperature!=='number') p.temperature=0.7;
    if(typeof p.stream!=='boolean') p.stream=false;
    if(!Array.isArray(p.models)) p.models=[];
  });
  if(!apiConfig.activeProfileId || !apiConfig.profiles.some(function(p){return p.id===apiConfig.activeProfileId;})) apiConfig.activeProfileId=apiConfig.profiles[0].id;
  syncLegacyApiConfigFromProfile();
}
function getActiveApiProfile(){
  ensureApiProfiles();
  return apiConfig.profiles.find(function(p){ return p.id===apiConfig.activeProfileId; }) || apiConfig.profiles[0];
}
function syncLegacyApiConfigFromProfile(){
  if(!Array.isArray(apiConfig.profiles) || !apiConfig.profiles.length) return;
  var p = apiConfig.profiles.find(function(x){return x.id===apiConfig.activeProfileId;}) || apiConfig.profiles[0];
  apiConfig.activeProfileId = p.id;
  apiConfig.activeModel = 'custom';
  apiConfig.models = apiConfig.models || {};
  apiConfig.models.custom = apiConfig.models.custom || {};
  apiConfig.models.custom.name = p.name || '';
  apiConfig.models.custom.endpoint = p.endpoint || '';
  apiConfig.models.custom.key = p.key || '';
  apiConfig.models.custom.model = p.model || '';
  apiConfig.models.custom.apiFormat = p.apiFormat || 'openai';
  apiConfig.models.custom.temperature = typeof p.temperature==='number' ? p.temperature : 0.7;
  apiConfig.models.custom.stream = p.stream===true;
}
function cfgEl(id){ return document.getElementById(id); }
function cfgSetText(id, text){ var el=cfgEl(id); if(el) el.textContent=text; }
function cfgRenderProfiles(){
  var sel=cfgEl('cfg-profile-select'); if(!sel) return;
  ensureApiProfiles();
  sel.innerHTML = apiConfig.profiles.map(function(p){ return '<option value="'+esc(p.id)+'">'+esc(p.name||'API 配置')+'</option>'; }).join('') + '<option value="__new__">+ 新建配置</option>';
  sel.value = apiConfig.activeProfileId;
}
function cfgRenderModelOptions(models){
  var box=cfgEl('cfg-model-options'); if(!box) return;
  var p=getActiveApiProfile();
  var list = Array.isArray(models) ? models : (p.models||[]);
  if(!list.length){ box.innerHTML=''; return; }
  box.innerHTML = list.slice(0,80).map(function(id){ return '<button type="button" class="api-model-option" onclick="cfgPickModel(\''+esc(String(id)).replace(/'/g,'&#39;')+'\')">'+esc(String(id))+'</button>'; }).join('');
}
function cfgInit(){
  ensureApiProfiles();
  cfgRenderProfiles();
  var p=getActiveApiProfile();
  cfgEl('cfg-profile-name').value=p.name||'';
  cfgEl('cfg-api-format').value=p.apiFormat||'openai';
  cfgEl('cfg-endpoint').value=p.endpoint||'';
  cfgEl('cfg-key').value=p.key||'';
  cfgEl('cfg-model').value=p.model||'';
  cfgEl('cfg-temperature').value=typeof p.temperature==='number'?p.temperature:0.7;
  cfgSetText('cfg-temperature-value', Number(cfgEl('cfg-temperature').value).toFixed(1));
  var st=cfgEl('cfg-stream-toggle'); if(st) st.classList.toggle('on', p.stream===true);
  var ws=cfgEl('cfg-web-search'); if(ws) ws.checked=apiConfig.webSearch!==false;
  var mem=cfgEl('cfg-mem-window'); if(mem) mem.value=apiConfig.memoryWindow;
  var max=cfgEl('cfg-max-ctx'); if(max) max.value=apiConfig.maxContext;
  cfgRenderModelOptions();
  cfgRenderVoiceIds();
  cfgRenderMemoryBooks();
  cfgRenderTTSForm();
  updateCfgStatus();
}
function cfgSelectProfile(){
  var sel=cfgEl('cfg-profile-select'); if(!sel) return;
  if(sel.value==='__new__'){
    var id='profile-'+Date.now();
    apiConfig.profiles.push(createApiProfile(id,'新建配置','','','', 'openai',0.7,false));
    apiConfig.activeProfileId=id;
  }else apiConfig.activeProfileId=sel.value;
  syncLegacyApiConfigFromProfile();
  cfgInit();
}
function cfgReadProfileForm(){
  var p=getActiveApiProfile();
  p.name=(cfgEl('cfg-profile-name').value||'').trim()||'未命名配置';
  p.apiFormat=cfgEl('cfg-api-format').value||'openai';
  p.endpoint=(cfgEl('cfg-endpoint').value||'').trim();
  p.key=(cfgEl('cfg-key').value||'').trim();
  p.model=(cfgEl('cfg-model').value||'').trim();
  p.temperature=parseFloat(cfgEl('cfg-temperature').value);
  if(isNaN(p.temperature)) p.temperature=0.7;
  p.stream=cfgEl('cfg-stream-toggle').classList.contains('on');
  apiConfig.webSearch=cfgEl('cfg-web-search') ? cfgEl('cfg-web-search').checked : apiConfig.webSearch;
  var mem=parseInt(cfgEl('cfg-mem-window') && cfgEl('cfg-mem-window').value,10); if(mem) apiConfig.memoryWindow=mem;
  var max=parseInt(cfgEl('cfg-max-ctx') && cfgEl('cfg-max-ctx').value,10); if(max) apiConfig.maxContext=max;
  syncLegacyApiConfigFromProfile();
  return p;
}
function cfgTemperatureInput(){ cfgSetText('cfg-temperature-value', Number(cfgEl('cfg-temperature').value).toFixed(1)); }
function cfgToggleStream(){ var el=cfgEl('cfg-stream-toggle'); if(el) el.classList.toggle('on'); }
function cfgPickModel(model){ cfgEl('cfg-model').value=model; cfgReadProfileForm(); cfgSetText('cfg-model-fetch-status','已选择 '+model); }
function cfgDeleteProfile(){
  ensureApiProfiles();
  if(apiConfig.profiles.length<=1){ showToast('至少保留一个 API 配置', 1600, 'err'); return; }
  var id=apiConfig.activeProfileId;
  apiConfig.profiles=apiConfig.profiles.filter(function(p){ return p.id!==id; });
  apiConfig.activeProfileId=apiConfig.profiles[0].id;
  syncLegacyApiConfigFromProfile();
  saveState();
  cfgInit();
  showToast('已删除此配置', 1400);
}
function cfgSaveAll(){
  cfgReadProfileForm();
  cfgReadTTSForm();
  Object.keys(contacts).filter(function(k){return !contacts[k].isGroup;}).forEach(function(k){
    var vi=cfgEl('cfg-voice-'+k); if(vi) apiConfig.voiceIds[k]=vi.value;
    var mb=cfgEl('cfg-mem-'+k); if(mb) apiConfig.memoryBooks[k]=mb.value;
  });
  var saveOk = saveState();
  cfgRenderProfiles();
  updateCfgStatus();
  if(saveOk) showToast('已保存配置', 1600, 'ok');
  else showToast('本地空间不足，配置已转存到 IndexedDB', 2400, 'warn');
}
function cfgFetchModels(){
  var p=cfgReadProfileForm();
  if(!p.endpoint || !p.key){ showToast('请先填写 Endpoint 和 Key', 1800, 'err'); return; }
  cfgSetText('cfg-model-fetch-status','正在拉取模型列表...');
  fetch('/api/models',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:p.endpoint,key:p.key,apiFormat:p.apiFormat})})
    .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,status:r.status,data:d}; }); })
    .then(function(res){
      if(!res.ok || !res.data || !Array.isArray(res.data.models)) throw new Error((res.data && res.data.error) || ('HTTP '+res.status));
      p.models=res.data.models;
      cfgRenderModelOptions(p.models);
      if(!p.model && p.models.length) cfgPickModel(p.models[0]);
      saveState();
      cfgSetText('cfg-model-fetch-status','已拉取 '+p.models.length+' 个模型');
    })
    .catch(function(e){ cfgSetText('cfg-model-fetch-status','拉取失败：'+String(e.message||e).substring(0,80)); showToast('模型列表拉取失败', 2200, 'err'); });
}
function cfgSwitchModel(){ cfgSelectProfile(); }
function cfgSwitchCustomFormat(){ cfgReadProfileForm(); }
function cfgEnsureTTSShape(){
  apiConfig.ttsProvider = apiConfig.ttsProvider || 'elevenlabs';
  apiConfig.tts = apiConfig.tts || {};
  apiConfig.tts.elevenlabs = apiConfig.tts.elevenlabs || {};
  apiConfig.tts.minimax = apiConfig.tts.minimax || {};
  apiConfig.tts.custom = apiConfig.tts.custom || {};
  if(!apiConfig.tts.elevenlabs.model) apiConfig.tts.elevenlabs.model = 'eleven_multilingual_v2';
  if(!apiConfig.tts.minimax.model) apiConfig.tts.minimax.model = 'speech-01';
}
function cfgInputValue(id){ var el=cfgEl(id); return el ? (el.value || '').trim() : ''; }
function cfgSetInputValue(id, value){ var el=cfgEl(id); if(el) el.value = value || ''; }
function cfgReadTTSForm(){
  cfgEnsureTTSShape();
  var provider = cfgEl('cfg-tts-provider');
  if(provider) apiConfig.ttsProvider = provider.value || 'elevenlabs';
  apiConfig.tts.elevenlabs.key = cfgInputValue('cfg-11l-key');
  apiConfig.tts.elevenlabs.model = cfgInputValue('cfg-11l-model') || 'eleven_multilingual_v2';
  apiConfig.tts.minimax.key = cfgInputValue('cfg-mm-key');
  apiConfig.tts.minimax.groupId = cfgInputValue('cfg-mm-group');
  apiConfig.tts.minimax.model = cfgInputValue('cfg-mm-model') || 'speech-01';
  apiConfig.tts.custom.endpoint = cfgInputValue('cfg-tts-custom-endpoint');
  apiConfig.tts.custom.key = cfgInputValue('cfg-tts-custom-key');
  apiConfig.tts.custom.voice = cfgInputValue('cfg-tts-custom-voice');
  return apiConfig.tts;
}
function cfgRenderTTSForm(){
  cfgEnsureTTSShape();
  var provider = cfgEl('cfg-tts-provider');
  if(provider) provider.value = apiConfig.ttsProvider || 'elevenlabs';
  cfgSetInputValue('cfg-11l-key', apiConfig.tts.elevenlabs.key);
  cfgSetInputValue('cfg-11l-model', apiConfig.tts.elevenlabs.model || 'eleven_multilingual_v2');
  cfgSetInputValue('cfg-mm-key', apiConfig.tts.minimax.key);
  cfgSetInputValue('cfg-mm-group', apiConfig.tts.minimax.groupId);
  cfgSetInputValue('cfg-mm-model', apiConfig.tts.minimax.model || 'speech-01');
  cfgSetInputValue('cfg-tts-custom-endpoint', apiConfig.tts.custom.endpoint);
  cfgSetInputValue('cfg-tts-custom-key', apiConfig.tts.custom.key);
  cfgSetInputValue('cfg-tts-custom-voice', apiConfig.tts.custom.voice);
  cfgShowTTSProvider();
}
function cfgShowTTSProvider(){
  cfgEnsureTTSShape();
  var p = apiConfig.ttsProvider || 'elevenlabs';
  var eleven = cfgEl('cfg-tts-eleven'); if(eleven) eleven.style.display = p === 'elevenlabs' ? 'block' : 'none';
  var minimax = cfgEl('cfg-tts-minimax'); if(minimax) minimax.style.display = p === 'minimax' ? 'block' : 'none';
  var custom = cfgEl('cfg-tts-custom'); if(custom) custom.style.display = p === 'custom' ? 'block' : 'none';
}
function cfgSwitchTTS(){
  cfgReadTTSForm();
  cfgShowTTSProvider();
  cfgSetText('cfg-tts-test-status', '\u5207\u6362\u5df2\u5e94\u7528\uff0c\u4fdd\u5b58\u540e\u5bf9\u804a\u5929\u548c GO \u76f4\u64ad\u5168\u5c40\u751f\u6548');
}
function cfgValidateTTS(){
  cfgReadTTSForm();
  var p = apiConfig.ttsProvider, t = apiConfig.tts;
  if(p === 'elevenlabs' && !t.elevenlabs.key) return {ok:false, msg:'\u8bf7\u586b\u5199 ElevenLabs API Key'};
  if(p === 'minimax' && (!t.minimax.key || !t.minimax.groupId)) return {ok:false, msg:'\u8bf7\u586b\u5199 MiniMax API Key \u548c Group ID'};
  if(p === 'custom' && (!t.custom.endpoint || !t.custom.key)) return {ok:false, msg:'\u8bf7\u586b\u5199\u81ea\u5b9a\u4e49 TTS \u5730\u5740\u548c API Key'};
  return {ok:true, msg:'\u8bed\u97f3\u914d\u7f6e\u53ef\u7528'};
}
function cfgGetTTSTestVoice(){
  var first = Object.keys(apiConfig.voiceIds || {}).find(function(k){ return apiConfig.voiceIds[k]; });
  return first ? apiConfig.voiceIds[first] : (apiConfig.tts && apiConfig.tts.custom && apiConfig.tts.custom.voice) || '';
}
function cfgTestTTS(){
  var valid = cfgValidateTTS();
  cfgShowTTSProvider();
  if(!valid.ok){ cfgSetText('cfg-tts-test-status', valid.msg); showToast(valid.msg, 2200, 'err'); return; }
  saveState();
  cfgSetText('cfg-tts-test-status', '\u6b63\u5728\u6d4b\u8bd5\u8bed\u97f3\u8fde\u63a5\uff0c\u8bf7\u542c\u662f\u5426\u64ad\u653e\u6d4b\u8bd5\u97f3\u9891...');
  showToast('\u6b63\u5728\u6d4b\u8bd5\u8bed\u97f3\u8fde\u63a5', 1400, 'ok');
  try{
    if(typeof speakWithTTS !== 'function') throw new Error('TTS player unavailable');
    speakWithTTS('\u8bed\u97f3\u6d4b\u8bd5\u6210\u529f\u3002GO \u76f4\u64ad\u8fde\u9ea6\u4f1a\u4f7f\u7528\u8fd9\u91cc\u7684\u8bed\u97f3\u914d\u7f6e\u3002', cfgGetTTSTestVoice(), {noFallback:true})
      .then(function(){ cfgSetText('cfg-tts-test-status', '\u8bed\u97f3 API \u8fde\u63a5\u6210\u529f\uff0c\u5df2\u64ad\u653e\u6d4b\u8bd5\u97f3\u9891\u3002'); showToast('\u8bed\u97f3 API \u8fde\u63a5\u6210\u529f', 1800, 'ok'); })
      .catch(function(e){ cfgSetText('cfg-tts-test-status', '\u8bed\u97f3 API \u8fde\u63a5\u5931\u8d25\uff1a'+String(e.message||e).substring(0,80)); showToast('\u8bed\u97f3 API \u8fde\u63a5\u5931\u8d25', 2200, 'err'); });
  }catch(e){
    cfgSetText('cfg-tts-test-status', '\u8bed\u97f3\u6d4b\u8bd5\u5931\u8d25\uff1a'+String(e.message||e).substring(0,80));
    showToast('\u8bed\u97f3\u6d4b\u8bd5\u5931\u8d25', 2200, 'err');
  }
}
function cfgToggleCap(el,cap){ apiConfig.capabilities[cap]=el.querySelector('input').checked; el.classList.toggle('picked',apiConfig.capabilities[cap]); }
function cfgRenderVoiceIds(){
  var box=document.getElementById('cfg-voice-ids');
  if(!box) return;
  var ids=Object.keys(contacts).filter(function(k){return !contacts[k].isGroup;});
  box.innerHTML=ids.map(function(k){
    var c=contacts[k];
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div style="font-size:12px;font-weight:700;width:60px;">'+c.name+'</div><input class="field-input" id="cfg-voice-'+k+'" placeholder="Voice ID" value="'+(apiConfig.voiceIds[k]||'')+'" style="flex:1;margin:0;"></div>';
  }).join('');
}
function cfgRenderMemoryBooks(){
  var box=document.getElementById('cfg-memory-books');
  if(!box) return;
  var ids=Object.keys(contacts).filter(function(k){return !contacts[k].isGroup;});
  box.innerHTML=ids.map(function(k){
    var c=contacts[k];
    var len=(apiConfig.memoryBooks[k]||'').length;
    return '<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:700;margin-bottom:2px;">'+c.name+' ('+len+' chars)</div><textarea class="field-input" id="cfg-mem-'+k+'" placeholder="Memory book: 对话总结+关键记忆" style="height:60px;">'+(apiConfig.memoryBooks[k]||'')+'</textarea></div>';
  }).join('');
}
