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
  if(cfgEl('cfg-tts-provider')) cfgSwitchTTS();
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
function cfgSwitchTTS(){
  apiConfig.ttsProvider=document.getElementById('cfg-tts-provider').value;
  document.getElementById('cfg-tts-eleven').style.display=apiConfig.ttsProvider==='elevenlabs'?'block':'none';
  document.getElementById('cfg-tts-minimax').style.display=apiConfig.ttsProvider==='minimax'?'block':'none';
  document.getElementById('cfg-tts-custom').style.display=apiConfig.ttsProvider==='custom'?'block':'none';
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
