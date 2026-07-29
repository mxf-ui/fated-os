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
  if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8,temperature:m.temperature}); }
  else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8,temperature:m.temperature}); }
  else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'hi'}]}],generationConfig:{maxOutputTokens:8,temperature:m.temperature}}); }
  else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8,temperature:m.temperature}); }
  fetch(url,{method:'POST',headers:hdrs,body:bd})
    .then(function(r){
      if(r.ok){ el.style.color='#1a9e4b'; el.textContent='● API 直连已连接 ✓'; }
      else { el.style.color='#e15555'; el.textContent='● API 返回错误 '+r.status+'（检查 Key/模型/地址）'; }
    })
    .catch(function(){
      // 直连被 CORS 拦截（多数中转站情况），改走代理做真实探测
      var pb = JSON.stringify({messages:pingMsgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, apiFormat:(m.apiFormat||'openai'), max_tokens:8,temperature:m.temperature,stream:m.stream});
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
  if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:m.temperature}); }
  else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:'Reply with exactly: OK',messages:[{role:'user',content:'ping'}],max_tokens:64,temperature:m.temperature}); }
  else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'ping'}]}],generationConfig:{maxOutputTokens:64,temperature:m.temperature}}); }
  else if(model==='custom'){
    var cf=m.apiFormat||'openai';
    if(cf==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:'Reply with exactly: OK',messages:[{role:'user',content:'ping'}],max_tokens:64,temperature:m.temperature}); }
    else if(cf==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'ping'}]}],generationConfig:{maxOutputTokens:64,temperature:m.temperature}}); }
    else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:m.temperature}); }
  }
  else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:m.temperature}); }
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
    var proxyBody = JSON.stringify({messages:pingMsgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, apiFormat:(m.apiFormat||'openai'), max_tokens:64,temperature:m.temperature,stream:m.stream});
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

