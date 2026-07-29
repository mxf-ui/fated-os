/* ---- API Call Helper ---- */
function goActiveApiProfile(){
  if(typeof getActiveApiProfile === 'function') return getActiveApiProfile();
  if(typeof apiConfig === 'undefined') return null;
  if(apiConfig.profiles && apiConfig.profiles.length){
    return apiConfig.profiles.find(function(p){ return p.id === apiConfig.activeProfileId; }) || apiConfig.profiles[0];
  }
  return apiConfig.models && (apiConfig.models.custom || apiConfig.models[apiConfig.activeModel]);
}
function goApiReady(){
  var p = goActiveApiProfile();
  return !!(p && p.key && p.endpoint && p.model);
}
function goParseAIText(data){
  if(!data) return '';
  if(typeof data.content === 'string') return data.content;
  if(typeof data.reply === 'string') return data.reply;
  if(data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content || '';
  if(data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts){
    return data.candidates[0].content.parts.map(function(p){ return p.text || ''; }).join('');
  }
  return '';
}
function goCallAI(prompt, systemPrompt, cb){
  var p = goActiveApiProfile();
  if(!p || !p.key || !p.endpoint || !p.model){ cb(null); return; }
  var msgs = [];
  if(systemPrompt) msgs.push({role:'system', content:systemPrompt});
  msgs.push({role:'user', content:prompt});
  fetch('/api/chat', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      messages:msgs,
      provider:'custom',
      key:p.key,
      endpoint:p.endpoint,
      dataModel:p.model,
      model:p.model,
      apiFormat:p.apiFormat || 'openai',
      max_tokens:420,
      temperature:typeof p.temperature === 'number' ? p.temperature : 0.8,
      stream:false
    })
  }).then(function(r){ return r.json(); }).then(function(d){ cb(goParseAIText(d)); }).catch(function(){ cb(null); });
}
function goCallAIVision(prompt, imgB64, cb){
  var p = goActiveApiProfile();
  if(!p || !p.key || !p.endpoint || !p.model){ cb(null); return; }
  var fmt = p.apiFormat || 'openai';
  if(fmt !== 'openai'){
    goCallAI(prompt + '\n\u7528\u6237\u5df2\u4e0a\u4f20\u4e00\u5f20\u622a\u56fe\uff0c\u8bf7\u6839\u636e\u6587\u5b57\u8981\u6c42\u7ed9\u51fa\u4fdd\u5b88\u5224\u65ad\u3002', '\u4f60\u662f\u76f4\u64ad\u5e73\u53f0\u5ba1\u6838\u5458\u3002', cb);
    return;
  }
  var ep = typeof normEp === 'function' ? normEp(p.endpoint, fmt) : p.endpoint;
  fetch(ep, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+p.key},
    body:JSON.stringify({
      model:p.model,
      messages:[
        {role:'system', content:'You analyze livestream screenshots.'},
        {role:'user', content:[{type:'text', text:prompt},{type:'image_url', image_url:{url:imgB64}}]}
      ],
      stream:false,
      max_tokens:80,
      temperature:0.2
    })
  }).then(function(r){ return r.json(); }).then(function(d){ cb(goParseAIText(d)); }).catch(function(){ cb(null); });
}

/* ---- Setup Page ---- */
function goRenderSetup(){
  goEnsureStateShape();
  var s = goState;
  if(typeof goSyncBalanceFromWallet === 'function') goSyncBalanceFromWallet();
  var bal = document.getElementById('go-balance-display');
  if(bal) bal.textContent = '\u94b1\u5305 \u00a5' + Number(s.balance || 0).toFixed(2);
  var api = document.getElementById('go-api-status');
  if(api){
    var p = goActiveApiProfile();
    api.innerHTML = goApiReady()
      ? '<b>\u5168\u5c40 API \u5df2\u8fde\u63a5</b><small>'+esc((p.name || p.model || '\u5f53\u524d\u6a21\u578b'))+' ? \u5f39\u5e55 / \u95ee\u7b54 / \u8bc4\u5206\u7edf\u4e00\u8bfb\u53d6\u8bbe\u7f6e</small>'
      : '<b>\u5168\u5c40 API \u672a\u914d\u7f6e</b><small>\u8bf7\u5230\u8bbe\u7f6e\u91cc\u7684 API Config \u4fdd\u5b58\u6a21\u578b\uff0cGO \u4e0d\u5355\u72ec\u914d\u7f6e API</small>';
    api.classList.toggle('warn', !goApiReady());
  }
  var types = [
    {id:'ecommerce', t:'\u5e26\u8d27', s:'\u8bb2\u89e3\u8bc4\u5206 + \u5c0f\u9ec4\u8f66\u8ba2\u5355'},
    {id:'game', t:'\u6e38\u620f', s:'\u4e0a\u4f20\u6218\u7ee9\uff0c\u81ea\u52a8\u5224\u5b9a'},
    {id:'couple', t:'\u60c5\u4fa3Q&A', s:'WeChat \u597d\u53cb\u8fde\u9ea6\u7b54\u9898'},
    {id:'asmr', t:'ASMR', s:'\u8bed\u97f3\u4e92\u52a8\u548c\u6536\u542c\u53cd\u9988'},
    {id:'voice', t:'\u8bed\u97f3\u5385', s:'\u8fde\u9ea6\u89c2\u4f17\u5b9e\u65f6\u53cd\u5e94'},
    {id:'beauty', t:'\u7f8e\u5986', s:'\u6559\u7a0b\u8bb2\u89e3\u548c\u8bc4\u5206'}
  ];
  var grid = document.getElementById('go-type-grid');
  if(grid) grid.innerHTML = types.map(function(tp){
    var sel = s.liveType === tp.id ? ' selected' : '';
    return '<div class="go-type-card'+sel+'" onclick="goSelectType(\''+tp.id+'\')"><div class="t">'+tp.t+'</div><div class="s">'+tp.s+'</div></div>';
  }).join('');
  var cats = [
    {id:'auto', t:'\u81ea\u52a8\u6df7\u5408'}, {id:'funny', t:'\u641e\u7b11\u62bd\u8c61'}, {id:'pro', t:'\u4e13\u4e1a'},
    {id:'simp', t:'\u5938\u5938'}, {id:'hate', t:'\u6bd2\u820c'}, {id:'custom', t:'\u81ea\u5b9a\u4e49'}
  ];
  var dmWrap = document.getElementById('go-dm-cats');
  if(dmWrap) dmWrap.innerHTML = cats.map(function(c){
    return '<button class="go-btn sm'+(s.danmakuCat === c.id ? ' selected' : '')+'" onclick="goSelectDmCat(\''+c.id+'\')">'+c.t+'</button>';
  }).join('');
  var wbSel = document.getElementById('go-wb-bind');
  if(wbSel){
    var opts = '<option value="">\u4e0d\u7ed1\u5b9a</option>';
    if(typeof worldBooks !== 'undefined'){
      Object.keys(worldBooks).forEach(function(k){ opts += '<option value="'+esc(k)+'"'+(s.worldBookBind===k?' selected':'')+'>'+esc(worldBooks[k].name||k)+'</option>'; });
    }
    wbSel.innerHTML = opts;
  }
  var idEl = document.getElementById('go-live-id'); if(idEl) idEl.value = s.liveId || '';
  var av = document.getElementById('go-avatar-preview'); if(av) av.style.backgroundImage = s.liveAvatar ? 'url('+s.liveAvatar+')' : '';
  var dmC = document.getElementById('go-dm-custom'); if(dmC) dmC.value = s.danmakuCustom || '';
  var hist = document.getElementById('go-history-list');
  if(hist && s.history.length > 0){
    var typeNames = {ecommerce:'\u5e26\u8d27',game:'\u6e38\u620f',couple:'\u60c5\u4fa3Q&A',asmr:'ASMR',voice:'\u8bed\u97f3\u5385',beauty:'\u7f8e\u5986'};
    hist.innerHTML = '<div class="go-label">\u76f4\u64ad\u8bb0\u5f55</div>' + s.history.slice(-5).reverse().map(function(h){
      var d = new Date(h.time), ts = (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes();
      return '<div class="go-card soft" style="padding:10px 14px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:#45685a;">'+typeNames[h.type]+' '+ts+'</span><span style="font-size:13px;font-weight:700;color:'+(h.success?'#198f60':'#888')+';">'+(h.success?'+\u00a5'+h.reward:'\u672a\u5b8c\u6210')+'</span></div></div>';
    }).join('');
  } else if(hist){ hist.innerHTML = ''; }
}
function goSelectType(type){ goState.liveType = type; goRenderSetup(); saveState(); }
function goSelectDmCat(cat){ goState.danmakuCat = cat; goRenderSetup(); saveState(); }
