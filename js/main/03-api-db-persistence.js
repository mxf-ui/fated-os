/* ============ API & MODEL CONFIG ============ */
var apiConfig = {
  activeModel:'deepseek',
  capabilities:{vision:true,audio:true,video:true,tools:true},
  ttsProvider:'elevenlabs',
  memoryWindow:65536, maxContext:307200,
  models:{deepseek:{key:'',endpoint:'https://api.deepseek.com/v1/chat/completions',model:'deepseek-chat'},claude:{key:'',endpoint:'https://api.anthropic.com/v1/messages',model:'claude-sonnet-4-20250514'},gemini:{key:'',endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',model:'gemini-2.5-pro'},chatgpt:{key:'',endpoint:'https://api.openai.com/v1/chat/completions',model:'gpt-4o'},custom:{name:'',key:'',endpoint:'',model:'',apiFormat:'openai'}},
  tts:{elevenlabs:{key:'',model:'eleven_multilingual_v2'},minimax:{key:'',groupId:'',model:'speech-01'},custom:{key:'',endpoint:'',voice:''}},
  voiceIds:{tester1:''},
  memoryBooks:{tester1:''},
  proxyUrl:'http://127.0.0.1:8080',
  webSearch:true
};

/* ============ FONT & COLOR CONFIG ============ */
var fontConfig = { family:'', color:'#1a1a1a', customName:'', customDataUrl:'' };
function applyFontConfig(){
  try{
    var fam = fontConfig.family;
    if(fontConfig.customDataUrl && fontConfig.family==='__custom__'){
      // 自定义上传字体已在 loadState 时注册过；此处仅套用变量
      fam = "'FatedCustomFont', " + getComputedStyle(document.documentElement).getPropertyValue('--app-font');
    }
    document.documentElement.style.setProperty('--app-font', fam || "'Inter','Nunito',-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif");
    document.documentElement.style.setProperty('--app-text-color', fontConfig.color || '#1a1a1a');
    var prev = document.getElementById('cfg-font-preview');
    if(prev) prev.style.color = fontConfig.color || '#1a1a1a';
  }catch(e){}
}
function cfgInitFont(){
  var sel = document.getElementById('cfg-font-family');
  if(sel){
    sel.value = fontConfig.family || '';
    document.getElementById('cfg-font-name').textContent = fontConfig.customName ? ('已加载自定义字体：'+fontConfig.customName) : (fontConfig.family ? '当前：'+fontConfig.family : '当前：系统默认');
  }
  var col = document.getElementById('cfg-font-color');
  if(col) col.value = (fontConfig.color && /^#[0-9a-fA-F]{6}$/.test(fontConfig.color)) ? fontConfig.color : '#1a1a1a';
  cfgFontPreview();
}
function cfgFontPreview(){
  var fam = document.getElementById('cfg-font-family').value;
  var col = document.getElementById('cfg-font-color').value;
  if(fam==='__custom__'){ document.getElementById('cfg-font-upload').click(); }
  else {
    var famCss = fam || "'Inter','Nunito',-apple-system,sans-serif";
    document.documentElement.style.setProperty('--app-font', famCss);
  }
  document.documentElement.style.setProperty('--app-text-color', col);
  var prev = document.getElementById('cfg-font-preview');
  if(prev) prev.style.color = col;
}
function uploadFontFile(e){
  var file = e.target.files[0]; if(!file) return;
  var r = new FileReader();
  r.onload = function(){
    try{
      var ff = new FontFace('FatedCustomFont', 'url('+r.result+')');
      ff.load().then(function(loaded){
        document.fonts.add(loaded);
        fontConfig.family='__custom__';
        fontConfig.customName=file.name;
        fontConfig.customDataUrl=r.result;
        document.documentElement.style.setProperty('--app-font', "'FatedCustomFont', 'Inter',sans-serif");
        document.getElementById('cfg-font-name').textContent='已加载自定义字体：'+file.name;
        document.getElementById('cfg-font-family').value='__custom__';
        var prev=document.getElementById('cfg-font-preview'); if(prev) prev.style.fontFamily="'FatedCustomFont', sans-serif";
        showToast('字体已加载 ✓ 点保存生效', 1800, 'ok');
      }).catch(function(){ showToast('字体加载失败，请换一个 .ttf/.otf 文件', 2600, 'err'); });
    }catch(err){ showToast('当前浏览器不支持上传字体', 2600, 'err'); }
  };
  r.readAsDataURL(file);
}
function cfgSaveFont(){
  if(document.getElementById('cfg-font-family').value!=='__custom__'){
    // 若切换回非自定义，清掉自定义数据
    if(document.getElementById('cfg-font-family').value==='') fontConfig.customDataUrl='';
  }
  fontConfig.color = document.getElementById('cfg-font-color').value || '#1a1a1a';
  applyFontConfig();
  saveState();
  showToast('字体 & 颜色已保存 ✓', 1800, 'ok');
}

// 代理服务器基地址 — 始终走同源 /api，由 Cloudflare Pages Functions 转发
// 解决浏览器直接调 AI API 被 CORS 拦截的问题
function proxyBase(){
  return '';
}

/* 端点地址智能补全：中转站只需填基础地址，自动补全到正确请求路径，告别"地址太复杂填错" */
function normEp(endpoint, fmt){
  if(!endpoint) return '';
  var ep = String(endpoint).trim();
  if(!ep) return '';
  // 防御性清理：修复重复协议前缀（如 https://https://...）
  var m = ep.match(/^(https?:\/\/)(.*)/);
  if(m) ep = m[1] + m[2].replace(/^(https?:\/\/)+/, '');
  if(ep.indexOf('http://')!==0 && ep.indexOf('https://')!==0) ep = 'https://'+ep;
  ep = ep.replace(/\/+$/,'');                       // 去掉末尾斜杠
  fmt = fmt || 'openai';
  if(fmt==='gemini'){
    if(/:generateContent$/i.test(ep)) return ep;            // 已完整
    if(/\/models\/[^/]+$/i.test(ep)) return ep+':generateContent'; // 有模型名缺后缀
    return ep;                                              // 无法推断模型，保持原样
  }
  if(fmt==='claude'){
    if(/\/messages$/i.test(ep)) return ep;                  // 已含 /messages
    if(/\/v1$/i.test(ep)) return ep+'/messages';
    return ep+'/v1/messages';
  }
  // OpenAI 兼容（默认，绝大多数中转站）
  if(/\/chat\/completions$/i.test(ep)) return ep;           // 已完整
  if(/\/v1\/chat$/i.test(ep)) return ep+'/completions';
  if(/\/v1$/i.test(ep)) return ep+'/chat/completions';
  return ep+'/v1/chat/completions';
}
/* 取当前模型的规范化端点（供直连/代理/测试/状态统一调用） */
function modelEndpoint(m, model){
  var fmt = (model==='claude') ? 'claude' : (model==='gemini') ? 'gemini' : (model==='custom' ? (m.apiFormat||'openai') : 'openai');
  return normEp(m && m.endpoint, fmt);
}

function cfgInit(){
  document.getElementById('cfg-active-model').value=apiConfig.activeModel;
  document.getElementById('cfg-ds-key').value=apiConfig.models.deepseek.key;
  document.getElementById('cfg-ds-endpoint').value=apiConfig.models.deepseek.endpoint;
  document.getElementById('cfg-ds-model').value=apiConfig.models.deepseek.model;
  document.getElementById('cfg-claude-key').value=apiConfig.models.claude.key;
  document.getElementById('cfg-claude-endpoint').value=apiConfig.models.claude.endpoint;
  document.getElementById('cfg-claude-model').value=apiConfig.models.claude.model;
  document.getElementById('cfg-gemini-key').value=apiConfig.models.gemini.key;
  document.getElementById('cfg-gemini-endpoint').value=apiConfig.models.gemini.endpoint;
  document.getElementById('cfg-gemini-model').value=apiConfig.models.gemini.model;
  document.getElementById('cfg-gpt-key').value=apiConfig.models.chatgpt.key;
  document.getElementById('cfg-gpt-endpoint').value=apiConfig.models.chatgpt.endpoint;
  document.getElementById('cfg-gpt-model').value=apiConfig.models.chatgpt.model;
  document.getElementById('cfg-custom-name').value=apiConfig.models.custom.name;
  document.getElementById('cfg-custom-endpoint').value=apiConfig.models.custom.endpoint;
  document.getElementById('cfg-custom-key').value=apiConfig.models.custom.key;
  document.getElementById('cfg-custom-modelid').value=apiConfig.models.custom.model;
  document.getElementById('cfg-custom-format').value=apiConfig.models.custom.apiFormat||'openai';
  document.getElementById('cfg-tts-provider').value=apiConfig.ttsProvider;
  document.getElementById('cfg-11l-key').value=apiConfig.tts.elevenlabs.key;
  document.getElementById('cfg-11l-model').value=apiConfig.tts.elevenlabs.model;
  document.getElementById('cfg-mm-key').value=apiConfig.tts.minimax.key;
  document.getElementById('cfg-mm-group').value=apiConfig.tts.minimax.groupId;
  document.getElementById('cfg-mm-model').value=apiConfig.tts.minimax.model;
  document.getElementById('cfg-tts-custom-endpoint').value=apiConfig.tts.custom.endpoint;
  document.getElementById('cfg-tts-custom-key').value=apiConfig.tts.custom.key;
  document.getElementById('cfg-tts-custom-voice').value=apiConfig.tts.custom.voice;
  document.getElementById('cfg-mem-window').value=apiConfig.memoryWindow;
  document.getElementById('cfg-max-ctx').value=apiConfig.maxContext;
  cfgSwitchTTS();
  cfgRenderVoiceIds();
  cfgRenderMemoryBooks();
  document.getElementById('cfg-web-search').checked=apiConfig.webSearch!==false;
  updateCfgStatus();
}

function cfgSwitchModel(){
  apiConfig.activeModel=document.getElementById('cfg-active-model').value;
  document.getElementById('cfg-custom-model').style.display=apiConfig.activeModel==='custom'?'block':'none';
  cfgSwitchCustomFormat();
}
function cfgSwitchCustomFormat(){
  var fmt=document.getElementById('cfg-custom-format');
  if(!fmt) return;
  apiConfig.models.custom.apiFormat=fmt.value;
  var ep=document.getElementById('cfg-custom-endpoint');
  var mi=document.getElementById('cfg-custom-modelid');
  if(!ep.value || ep.value.indexOf('your-relay')>=0){
    if(fmt.value==='openai') ep.placeholder='中转站域名（如 https://api.xxx.com，自动补全）';
    else if(fmt.value==='claude') ep.placeholder='中转站域名（如 https://api.xxx.com，自动补全）';
    else if(fmt.value==='gemini') ep.placeholder='Gemini 中转站域名（如 https://xxx.com，自动补全）';
  }
  if(fmt.value==='openai') mi.placeholder='Model ID (如 gpt-4o / deepseek-chat)';
  else if(fmt.value==='claude') mi.placeholder='Model ID (如 claude-sonnet-4-20250514)';
  else if(fmt.value==='gemini') mi.placeholder='Model ID (如 gemini-2.5-pro)';
}
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

function cfgSaveAll(){
  apiConfig.activeModel=document.getElementById('cfg-active-model').value;
  apiConfig.models.deepseek.key=document.getElementById('cfg-ds-key').value;
  apiConfig.models.deepseek.endpoint=normEp(document.getElementById('cfg-ds-endpoint').value,'openai');
  apiConfig.models.deepseek.model=document.getElementById('cfg-ds-model').value;
  apiConfig.models.claude.key=document.getElementById('cfg-claude-key').value;
  apiConfig.models.claude.endpoint=normEp(document.getElementById('cfg-claude-endpoint').value,'claude');
  apiConfig.models.claude.model=document.getElementById('cfg-claude-model').value;
  apiConfig.models.gemini.key=document.getElementById('cfg-gemini-key').value;
  apiConfig.models.gemini.endpoint=normEp(document.getElementById('cfg-gemini-endpoint').value,'gemini');
  apiConfig.models.gemini.model=document.getElementById('cfg-gemini-model').value;
  apiConfig.models.chatgpt.key=document.getElementById('cfg-gpt-key').value;
  apiConfig.models.chatgpt.endpoint=normEp(document.getElementById('cfg-gpt-endpoint').value,'openai');
  apiConfig.models.chatgpt.model=document.getElementById('cfg-gpt-model').value;
  apiConfig.models.custom.name=document.getElementById('cfg-custom-name').value;
  var cFmt=document.getElementById('cfg-custom-format').value;
  apiConfig.models.custom.endpoint=normEp(document.getElementById('cfg-custom-endpoint').value,cFmt);
  apiConfig.models.custom.key=document.getElementById('cfg-custom-key').value;
  apiConfig.models.custom.model=document.getElementById('cfg-custom-modelid').value;
  apiConfig.models.custom.apiFormat=cFmt;
  apiConfig.ttsProvider=document.getElementById('cfg-tts-provider').value;
  apiConfig.tts.elevenlabs.key=document.getElementById('cfg-11l-key').value;
  apiConfig.tts.elevenlabs.model=document.getElementById('cfg-11l-model').value;
  apiConfig.tts.minimax.key=document.getElementById('cfg-mm-key').value;
  apiConfig.tts.minimax.groupId=document.getElementById('cfg-mm-group').value;
  apiConfig.tts.minimax.model=document.getElementById('cfg-mm-model').value;
  apiConfig.tts.custom.endpoint=document.getElementById('cfg-tts-custom-endpoint').value;
  apiConfig.tts.custom.key=document.getElementById('cfg-tts-custom-key').value;
  apiConfig.tts.custom.voice=document.getElementById('cfg-tts-custom-voice').value;
  apiConfig.memoryWindow=parseInt(document.getElementById('cfg-mem-window').value)||65536;
  apiConfig.maxContext=parseInt(document.getElementById('cfg-max-ctx').value)||307200;
  apiConfig.webSearch=document.getElementById('cfg-web-search').checked;
  // Voice IDs & memory books
  Object.keys(contacts).filter(function(k){return !contacts[k].isGroup;}).forEach(function(k){
    var vi=document.getElementById('cfg-voice-'+k); if(vi) apiConfig.voiceIds[k]=vi.value;
    var mb=document.getElementById('cfg-mem-'+k); if(mb) apiConfig.memoryBooks[k]=mb.value;
  });
  saveState();
  updateCfgStatus();
  showToast('已保存 ✓ 配置全局生效', 2000, 'ok');
}

/* 全局轻提示（替代原生 alert，避免被部分浏览器拦截/不弹） */
function showToast(msg, ms, kind){
  ms = ms || 1800; kind = kind || '';
  var phone = document.querySelector('.phone') || document.body;
  var t = document.getElementById('fated-toast');
  if(!t){ t = document.createElement('div'); t.id='fated-toast'; t.className='toast'; phone.appendChild(t); }
  t.className = 'toast' + (kind?(' '+kind):'');
  t.textContent = msg;
  // 强制重绘以重新触发 transition
  void t.offsetWidth;
  t.classList.add('show');
  if(t._timer) clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, ms);
}

/* 检测代理(中转站)是否在线，并刷新状态条 */
function updateCfgStatus(){
  var el = document.getElementById('cfg-status');
  if(!el) return;
  var m = apiConfig.models[apiConfig.activeModel];
  if(!m || !m.key){
    el.style.color = '#e15555';
    el.textContent = '● 未填写 API Key';
    return;
  }
  el.style.color = '#888';
  el.textContent = '● 检测连接中…';
  // 直连优先检测（端点自动补全）
  var model = apiConfig.activeModel;
  var url, hdrs, bd;
  var ep = modelEndpoint(m, model);
  var pingMsgs = [{role:'user',content:'hi'}];
  if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8,temperature:0.3}); }
  else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8}); }
  else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'hi'}]}],generationConfig:{maxOutputTokens:8}}); }
  else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8,temperature:0.3}); }
  fetch(url,{method:'POST',headers:hdrs,body:bd})
    .then(function(r){
      if(r.ok){ el.style.color='#1a9e4b'; el.textContent='● API 直连已连接 ✓'; }
      else { el.style.color='#e15555'; el.textContent='● API 返回错误 '+r.status+'（检查 Key/模型/地址）'; }
    })
    .catch(function(){
      // 直连被 CORS 拦截（多数中转站情况），改走代理做真实探测
      var pb = JSON.stringify({messages:pingMsgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, apiFormat:(m.apiFormat||'openai'), max_tokens:8});
      fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:pb}).then(function(r){
        if(r.ok){
          return r.json().then(function(d){
            var rep=d.content||d.reply||'';
            if(rep && !/API Error|401|403|Proxy error|无法访问|请在设置/i.test(rep)){ el.style.color='#1a9e4b'; el.textContent='● 云端代理已连接 ✓（直连被拦截，已自动走代理）'; }
            else { el.style.color='#e15555'; el.textContent='● 代理可达但 API 报错（检查 Key/模型）'; }
          });
        }
        el.style.color='#e15555'; el.textContent='● 直连被拦截且代理未就绪（HTTP '+r.status+'）';
      }).catch(function(){
        el.style.color='#e15555'; el.textContent='● 直连被拦截且代理未就绪';
      });
    });
}

/* 用真实请求测试当前模型是否可用（验证 Key / Endpoint / 代理） */
function testAPIConnection(){
  var m = apiConfig.models[apiConfig.activeModel];
  if(!m || !m.key){ showToast('请先填写 API Key 再测试', 2200, 'err'); updateCfgStatus(); return; }
  showToast('正在测试连接…', 1500);
  var model = apiConfig.activeModel;
  var pingMsgs = [{role:'system',content:'Reply with exactly: OK'},{role:'user',content:'ping'}];
  var url,hdrs,bd;
  var ep = modelEndpoint(m, model);
  console.log('[testAPI] activeModel:', model, 'apiFormat:', (m.apiFormat||'openai'), 'rawEndpoint:', m.endpoint, 'normEp:', ep);
  if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:0.3}); }
  else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:'Reply with exactly: OK',messages:[{role:'user',content:'ping'}],max_tokens:64}); }
  else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'ping'}]}],generationConfig:{maxOutputTokens:64,temperature:0.3}}); }
  else if(model==='custom'){
    var cf=m.apiFormat||'openai';
    if(cf==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:'Reply with exactly: OK',messages:[{role:'user',content:'ping'}],max_tokens:64}); }
    else if(cf==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'ping'}]}],generationConfig:{maxOutputTokens:64,temperature:0.3}}); }
    else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:0.3}); }
  }
  else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:0.3}); }
  console.log('[testAPI] direct URL:', url, 'headers:', Object.keys(hdrs), 'body:', bd);
  var isErr = function(t){ return /API Error|API连接失败|Invalid|401|403|unauthorized|forbidden|not found|模型|model|Proxy error/i.test(t); };
  // 直连优先测试（DeepSeek/OpenAI 等本身支持 CORS）
  fetch(url,{method:'POST',headers:hdrs,body:bd})
    .then(function(r){ return r.text().then(function(t){ return {ok:r.ok,status:r.status,text:t}; }); })
    .then(function(res){
      if(!res){ tryProxyTest(); return; }
      var data; try{ data = JSON.parse(res.text); }catch(e){ data=null; }
      if(!data){ tryProxyTest(); return; }
      var reply='';
      if(model==='deepseek'||model==='chatgpt') reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      else if(model==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
      else if(model==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
      else if(model==='custom'){
        var cf2=(m.apiFormat||'openai');
        if(cf2==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
        else if(cf2==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
        else reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      }
      if(!reply && data.error) reply='API Error: '+(data.error.message||JSON.stringify(data.error));
      // 只有真实有效回复才算直连成功；含 error 一律交给代理兜底
      if(reply && !isErr(reply) && !data.error){ showToast('连接成功 ✓ (直连) 模型已响应', 2600, 'ok'); updateCfgStatus(); return; }
      if(data.error){ showToast('直连报错：'+String(data.error.message||JSON.stringify(data.error)).substring(0,60)+'，尝试代理…', 2600, 'err'); }
      tryProxyTest();
    })
    .catch(function(){ tryProxyTest(); });

  function tryProxyTest(){
    var proxyBody = JSON.stringify({messages:pingMsgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, apiFormat:(m.apiFormat||'openai'), max_tokens:64});
    console.log('[testAPI] proxy body:', proxyBody);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:proxyBody})
      .then(function(r){
        return r.text().then(function(t){ return {ok:r.ok,status:r.status,text:t}; });
      })
      .then(function(res){
        console.log('[testAPI] proxy response:', res.status, res.text.substring(0,300));
        if(!res || !res.text){ showToast('连接失败：代理无响应（请确认已部署 Functions）', 3600, 'err'); updateCfgStatus(); return; }
        var d1; try{ d1=JSON.parse(res.text); }catch(e){ d1=null; }
        if(!d1){ showToast('连接失败：代理返回异常 (HTTP '+res.status+')', 3600, 'err'); updateCfgStatus(); return; }
        var r1 = d1.content||d1.reply||'';
        if(r1 && !isErr(r1) && !d1.error){ showToast('连接成功 ✓ (代理) 模型已响应', 2600, 'ok'); updateCfgStatus(); return; }
        var msg = d1.error || (isErr(r1)?r1:'') || ('HTTP '+res.status);
        showToast('连接失败：'+String(msg).replace(/^(API Error \(HTTP \d+\):\s*|Proxy error:\s*)/i,'').substring(0,70), 3600, 'err'); updateCfgStatus();
      })
      .catch(function(e){ console.error('[testAPI] proxy fetch error:', e); showToast('连接失败：代理请求失败（Functions 可能未部署）', 3600, 'err'); updateCfgStatus(); });
  }
}

/* ============ FATED DB (IndexedDB 持久化 - 记忆模式) ============ */
/* 用 IndexedDB 存聊天记录和表情包，避免 localStorage 5MB 限制导致数据丢失 */
var fatedDB = null;
var fatedDBReady = false;
function fatedDBOpen(cb){
  if(fatedDB) return cb(fatedDB);
  try{
    var req = indexedDB.open('FatedDB', 1);
    req.onupgradeneeded = function(e){
      var db = e.target.result;
      if(!db.objectStoreNames.contains('chats')) db.createObjectStore('chats',{keyPath:'id'});
      if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv',{keyPath:'key'});
    };
    req.onsuccess = function(e){ fatedDB = e.target.result; fatedDBReady = true; cb(fatedDB); };
    req.onerror = function(){ fatedDBReady = false; cb(null); };
  }catch(e){ cb(null); }
}
/* 保存单个联系人的聊天记录到 IndexedDB */
function fatedDBSaveChat(contactId, cb){
  var c = contacts[contactId]; if(!c) return cb&&cb();
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('chats','readwrite');
      tx.objectStore('chats').put({
        id: contactId,
        seed: c.seed,
        pendingCount: c.pendingCount||0,
        blocked: !!c.blocked,
        unread: c.unread||0,
        memory: c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0},
        worldBooks: c.worldBooks||[],
        groupUserPrompt: c.groupUserPrompt||''
      });
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}
/* 批量保存所有联系人聊天记录 */
function fatedDBSaveAllChats(cb){
  var ids = Object.keys(contacts).filter(function(k){ return k!=='me'; });
  var done = 0, total = ids.length;
  if(total===0) return cb&&cb();
  ids.forEach(function(id){
    fatedDBSaveChat(id, function(){ done++; if(done>=total) cb&&cb(); });
  });
}
/* 加载所有联系人聊天记录 */
function fatedDBLoadAllChats(cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb(false);
    try{
      var tx = db.transaction('chats','readonly');
      var req = tx.objectStore('chats').getAll();
      req.onsuccess = function(e){
        var rows = e.target.result||[];
        rows.forEach(function(row){
          if(contacts[row.id]){
            if(row.seed && Array.isArray(row.seed) && row.seed.length>0){
              contacts[row.id].seed = row.seed;
            }
            if(typeof row.pendingCount==='number') contacts[row.id].pendingCount = row.pendingCount;
            contacts[row.id].blocked = !!row.blocked;
            if(typeof row.unread==='number') contacts[row.id].unread = row.unread;
            if(row.memory) contacts[row.id].memory = row.memory;
            if(Array.isArray(row.worldBooks)) contacts[row.id].worldBooks = row.worldBooks;
            if(typeof row.groupUserPrompt==='string') contacts[row.id].groupUserPrompt = row.groupUserPrompt;
          }
        });
        cb&&cb(true);
      };
      req.onerror = function(){ cb&&cb(false); };
    }catch(e){ cb&&cb(false); }
  });
}
/* 保存表情包到 IndexedDB */
function fatedDBSaveStickers(cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('kv','readwrite');
      tx.objectStore('kv').put({key:'stickers', data:stickers});
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}
/* 加载表情包 */
function fatedDBLoadStickers(cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb(false);
    try{
      var tx = db.transaction('kv','readonly');
      var req = tx.objectStore('kv').get('stickers');
      req.onsuccess = function(e){
        var row = e.target.result;
        if(row && Array.isArray(row.data) && row.data.length>0){
          stickers = row.data;
          cb&&cb(true);
        } else {
          cb&&cb(false);
        }
      };
      req.onerror = function(){ cb&&cb(false); };
    }catch(e){ cb&&cb(false); }
  });
}
/* 通用的 KV 保存到 IndexedDB（用于存储大图片数据，避免 localStorage 溢出）*/
function fatedDBSaveKV(key, data, cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('kv','readwrite');
      tx.objectStore('kv').put({key:key, data:data});
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}
/* 通用的 KV 从 IndexedDB 加载 */
function fatedDBLoadKV(key, cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb(null);
    try{
      var tx = db.transaction('kv','readonly');
      var req = tx.objectStore('kv').get(key);
      req.onsuccess = function(e){
        var row = e.target.result;
        cb&&cb(row?row.data:null);
      };
      req.onerror = function(){ cb&&cb(null); };
    }catch(e){ cb&&cb(null); }
  });
}
/* 删除联系人的聊天记录 */
function fatedDBDeleteChat(contactId, cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('chats','readwrite');
      tx.objectStore('chats').delete(contactId);
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}

/* ============ PERSISTENCE ============ */
var bubbleMineColor = '#1a1a1a', bubbleTheirsColor = '#ffffff';
var widgetCustom = {}; var removedPlugins = [];
function saveState(){
  try{
    localStorage.setItem('fated_state', JSON.stringify({
      userName, userWxid, userBio, userCover, userPrefs, userAvatar, chatBg, momentsBg,
      walletBalance, walletTx, apiConfig,
      worldBooks,
      moments: moments.map(m=>({id:m.id, authorId:m.authorId, text:m.text, vis:m.vis, hidden:m.hidden, ts:m.ts, place:m.place||'', likes:m.likes, liked:m.liked, comments:m.comments, img:m.img||null})),
      /* 聊天记录(seed)不再存 localStorage，改用 IndexedDB 避免溢出；这里只存联系人基本信息 */
      contactsExtra: Object.keys(contacts).filter(k=>k[0]==='p'||k[0]==='g'||k==='tester1').map(k=>{
        var c=contacts[k];
        return {id:k, name:c.name, displayName:c.displayName||'', tone:c.tone||'', persona:c.persona||'', userPrompt:c.userPrompt||'', jealous:!!c.jealous, isGroup:!!c.isGroup, members:c.members||null, avatar:c.avatar||null, avatarColor:c.avatarColor||null, blocked:!!c.blocked, worldBooks:c.worldBooks||[], memory:c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0}, groupUserPrompt:c.groupUserPrompt||'', proactive:c.proactive!==false, bio:c.bio||'', cover:c.cover||'', wxid:c.wxid||'', relations:c.relations||[]};
      }),
      viewAs, bubbleMineColor, bubbleTheirsColor, fontConfig,
      widgetBgMode, removedPlugins,
      suoha: typeof suohaState!=='undefined' ? suohaState : null,
      momentsLastGenDate: momentsLastGenDate||'',
      coupleState: typeof coupleState!=='undefined' ? coupleState : null,
      screenTime: typeof screenTimeData!=='undefined' ? screenTimeData : null,
      go: typeof goState!=='undefined' && goState ? goState : null
    }));
  }catch(e){ /* localStorage 满了也没关系，聊天记录在 IndexedDB */ }
  /* 大数据（含 base64 图片）存 IndexedDB 避免 localStorage 溢出导致 contactsExtra 丢失 */
  fatedDBSaveKV('widgetCustom', widgetCustom);
  fatedDBSaveKV('appIconImgs', appIcons.map(function(a){ return {id:a.id, img:a.img}; }));
  fatedDBSaveKV('lockWp', lockWp);
  fatedDBSaveKV('homeWp', homeWp);
  /* 同步保存聊天记录和表情包到 IndexedDB（异步，不阻塞 UI）*/
  fatedDBSaveAllChats();
  fatedDBSaveStickers();
}
function loadState(){
  try{
    const raw = localStorage.getItem('fated_state'); if(!raw) return;
    const s = JSON.parse(raw);
    if(s.userName) userName=s.userName;
    if(s.userWxid) userWxid=s.userWxid;
    if(typeof s.userBio==='string') userBio=s.userBio;
    if(s.userCover!==undefined) userCover=s.userCover;
    if(typeof s.userPrefs==='string') userPrefs=s.userPrefs;
    if(s.userAvatar!==undefined) userAvatar=s.userAvatar;
    if(s.chatBg) chatBg=s.chatBg;
    if(s.momentsBg) momentsBg=s.momentsBg;
    if(typeof s.walletBalance==='number') walletBalance=s.walletBalance;
    if(Array.isArray(s.walletTx)) walletTx=s.walletTx;
    if(Array.isArray(s.moments) && s.moments.length) moments=s.moments;
    if(s.viewAs) viewAs=s.viewAs;
    if(Array.isArray(s.contactsExtra)) s.contactsExtra.forEach(c=>{
      const {id, ...rest}=c;
      contacts[id] = Object.assign(contacts[id]||{pendingCount:0,idleTimer:null}, rest);
      if(contacts[id].pendingCount===undefined) contacts[id].pendingCount=0;
      if(contacts[id].idleTimer===undefined) contacts[id].idleTimer=null;
      if(!contacts[id].worldBooks) contacts[id].worldBooks=[];
      if(!contacts[id].memory) contacts[id].memory={enabled:true, threshold:20, summary:'', lastMsgCount:0};
      if(contacts[id].memory.enabled===undefined) contacts[id].memory.enabled=true;
      if(!contacts[id].memory.threshold) contacts[id].memory.threshold=20;
      if(contacts[id].blocked===undefined) contacts[id].blocked=false;
      if(contacts[id].persona===undefined) contacts[id].persona=contacts[id].tone||'';
      if(contacts[id].userPrompt===undefined) contacts[id].userPrompt='';
      if(contacts[id].proactive===undefined) contacts[id].proactive=true;
      if(contacts[id].bio===undefined) contacts[id].bio='';
      if(contacts[id].cover===undefined) contacts[id].cover='';
      if(contacts[id].wxid===undefined) contacts[id].wxid=id;
      if(contacts[id].relations===undefined) contacts[id].relations=[];
    });
    if(s.worldBooks && typeof s.worldBooks==='object'){
      Object.keys(s.worldBooks).forEach(function(k){ worldBooks[k]=s.worldBooks[k]; });
    }
    if(typeof s.bubbleMineColor==='string') bubbleMineColor=s.bubbleMineColor;
    if(typeof s.bubbleTheirsColor==='string') bubbleTheirsColor=s.bubbleTheirsColor;
    if(s.widgetCustom && typeof s.widgetCustom==='object') widgetCustom=s.widgetCustom;
    if(Array.isArray(s.removedPlugins)) removedPlugins=s.removedPlugins;
    if(s.lockWp && typeof s.lockWp==='object'){ lockWp=s.lockWp; paintWallpaper(document.getElementById('lock-wallpaper'), lockWp); }
    if(s.homeWp && typeof s.homeWp==='object'){ homeWp=s.homeWp; paintWallpaper(document.getElementById('home-wallpaper'), homeWp); }
    if(typeof s.widgetBgMode==='string'){ widgetBgMode=s.widgetBgMode; }
    if(s.suoha && typeof s.suoha==='object'){ suohaState=Object.assign(suohaDefault(), s.suoha); }
    if(Array.isArray(s.appIconImgs)){ s.appIconImgs.forEach(function(o){ var a=appIcons.find(function(x){return x.id===o.id;}); if(a) a.img=o.img; }); renderDesktopIcons(); renderIconGrid(); }
    if(s.apiConfig){
      /* 浅合并：保留新版本新增的默认字段（如 custom.apiFormat），旧存档不会丢失新功能 */
      var dflt=JSON.parse(JSON.stringify(apiConfig));
      for(var k in s.apiConfig){ apiConfig[k]=s.apiConfig[k]; }
      if(s.apiConfig.models){
        for(var mk in dflt.models){
          if(!apiConfig.models[mk]) apiConfig.models[mk]=dflt.models[mk];
          else for(var fk in dflt.models[mk]){ if(!(fk in apiConfig.models[mk])) apiConfig.models[mk][fk]=dflt.models[mk][fk]; }
        }
      }
    }
    if(s.fontConfig && typeof s.fontConfig==='object'){
      fontConfig=s.fontConfig;
      if(fontConfig.customDataUrl){
        try{ var ff=new FontFace('FatedCustomFont','url('+fontConfig.customDataUrl+')'); ff.load().then(function(l){ document.fonts.add(l); }); }catch(e){}
      }
      applyFontConfig();
    }
    if(typeof s.momentsLastGenDate==='string') momentsLastGenDate=s.momentsLastGenDate;
    if(s.coupleState && typeof s.coupleState==='object') coupleState=Object.assign(coupleState, s.coupleState);
    if(s.screenTime && typeof s.screenTime==='object') screenTimeData=Object.assign(screenTimeData, s.screenTime);
    if(s.go && typeof s.go==='object') goState=Object.assign(goDefault(), s.go);
  }catch(e){}
}

/* 便捷函数：保存当前联系人聊天记录到 IndexedDB（消息发送后调用）*/
function saveChatThread(contactId){
  var id = contactId || currentContact;
  if(!id || !contacts[id]) return;
  fatedDBSaveChat(id);
}
/* 便捷函数：保存表情包到 IndexedDB（表情包变化后调用）*/
function saveStickersDB(){ fatedDBSaveStickers(); }

/* ============ 导出聊天记录 ============ */
function exportChatHistory(contactId){
  var id = contactId || currentContact;
  var c = contacts[id]; if(!c) return;
  var msgs = c.seed || [];
  if(msgs.length===0){ showToast('没有聊天记录可导出', 1500); return; }
  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g,'-');
  var timeStr = new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  /* 生成 HTML 格式的聊天记录 */
  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">';
  html += '<meta name="viewport" content="width=device-width,initial-scale=1.0">';
  html += '<title>聊天记录 - '+esc(c.name)+' - '+dateStr+'</title>';
  html += '<style>';
  html += '*{box-sizing:border-box;margin:0;padding:0;}';
  html += 'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f5;min-height:100vh;padding:20px;}';
  html += '.container{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);}';
  html += '.header{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:24px;text-align:center;}';
  html += '.header h1{font-size:20px;margin-bottom:4px;}';
  html += '.header p{font-size:13px;opacity:0.8;}';
  html += '.chat-body{padding:16px;}';
  html += '.msg{display:flex;margin:10px 0;gap:8px;}';
  html += '.msg.mine{flex-direction:row-reverse;}';
  html += '.av{width:36px;height:36px;border-radius:8px;flex:none;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;}';
  html += '.bubble{max-width:70%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;word-break:break-word;}';
  html += '.bubble.mine{background:#95ec69;color:#000;border-radius:14px 14px 4px 14px;}';
  html += '.bubble.theirs{background:#f5f5f5;color:#000;border-radius:14px 14px 14px 4px;}';
  html += '.bubble img{max-width:180px;max-height:180px;border-radius:8px;display:block;}';
  html += '.sys{text-align:center;font-size:11px;color:#999;margin:8px 0;}';
  html += '.time{font-size:10px;color:#999;margin:2px 4px;}';
  html += '.msg.mine .time{text-align:right;}';
  html += '.footer{text-align:center;padding:16px;font-size:11px;color:#999;border-top:1px solid #eee;}';
  html += '</style></head><body>';
  html += '<div class="container">';
  html += '<div class="header"><h1>💬 与 '+esc(c.name)+' 的聊天记录</h1>';
  html += '<p>导出时间：'+dateStr+' '+timeStr+' · 共 '+msgs.length+' 条消息</p></div>';
  html += '<div class="chat-body">';
  msgs.forEach(function(m){
    if(m.kind==='typing') return; /* 跳过 typing 状态 */
    if(m.kind==='pat' || (!m.kind && !m.text)){ html += '<div class="sys">'+esc(m.text||'')+'</div>'; return; }
    if(m.kind==='pat'){ html += '<div class="sys">'+esc(m.text||'')+'</div>'; return; }
    var isMine = !!m.mine;
    var name = isMine ? (userName||'我') : c.name;
    var initial = (name||'?').charAt(0);
    var avColor = isMine ? '#667eea' : '#764ba2';
    var timeStr2 = m.ts ? new Date(m.ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '';
    html += '<div class="msg'+(isMine?' mine':'')+'">';
    html += '<div class="av" style="background:'+avColor+';">'+esc(initial)+'</div>';
    html += '<div><div class="bubble '+(isMine?'mine':'theirs')+'">';
    if(m.kind==='photo'){
      html += '<img src="'+m.text+'" alt="[图片]">';
    } else if(m.kind==='sticker'){
      if(m.stype==='image'){ html += '<img src="'+m.text+'" alt="[表情]" style="width:80px;height:80px;object-fit:cover;">'; }
      else { html += esc(m.text||''); }
    } else if(m.kind==='voice'){
      html += '🎤 语音消息 ('+(m.dur||3)+'″)';
    } else if(m.kind==='card'){
      if(m.cardType==='transfer') html += '💰 转账 ¥'+(m.amount||0)+'.00';
      else if(m.cardType==='family') html += '💳 亲属卡';
      else if(m.cardType==='gift') html += '🎁 礼物：'+esc(m.name||'');
      else if(m.cardType==='order') html += '🍔 外卖：'+esc(m.name||'');
      else if(m.cardType==='loc') html += '📍 实时位置';
      else html += '📋 卡片';
    } else {
      html += esc(m.text||'');
    }
    html += '</div>';
    if(timeStr2) html += '<div class="time">'+timeStr2+'</div>';
    html += '</div></div>';
  });
  html += '</div>';
  html += '<div class="footer">由 Fated OS 导出 · '+dateStr+' '+timeStr+'</div>';
  html += '</div></body></html>';
  /* 下载文件 */
  var blob = new Blob([html], {type:'text/html;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '聊天记录_'+c.name+'_'+dateStr+'.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  showToast('聊天记录已导出', 1500);
}

/* ============ WALLET ============ */
function addWalletTx(title, amount){
  walletTx.unshift({ title, amount, d: nowTime() });
  walletBalance += amount;
  renderWallet();
  updateWalletPreview();
  saveState();
}
function renderWallet(){
  const bal = document.getElementById('wallet-balance');
  if(bal) bal.textContent = '¥ ' + walletBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const list = document.getElementById('wallet-tx-list');
  if(!list) return;
  if(!walletTx.length){ list.innerHTML='<div class="wallet-empty">还没有交易记录</div>'; return; }
  list.innerHTML = walletTx.map(t=>{
    const sign = t.amount>=0 ? '+' : '-';
    const cls = t.amount>=0 ? 'pos' : 'neg';
    return '<div class="tx-row"><div><div class="t">'+esc(t.title)+'</div><div class="d">'+t.d+'</div></div><div class="a '+cls+'">'+sign+Math.abs(t.amount).toFixed(2)+'</div></div>';
  }).join('');
}

