/* ---- AI Call Helper ---- */
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
  }).then(function(r){ return r.json(); }).then(function(d){
    cb(goParseAIText(d));
  }).catch(function(){ cb(null); });
}
function goCallAIVision(prompt, imgB64, cb){
  var p = goActiveApiProfile();
  if(!p || !p.key || !p.endpoint || !p.model){ cb(null); return; }
  var fmt = p.apiFormat || 'openai';
  if(fmt !== 'openai'){
    goCallAI(prompt + '\n用户已上传一张截图，但当前模型格式不支持前端视觉直连；请根据文字要求给出保守判断。', '你是一个直播平台审核 AI。', cb);
    return;
  }
  var ep = typeof normEp === 'function' ? normEp(p.endpoint, fmt) : p.endpoint;
  var body = {
    model: p.model,
    messages: [
      {role:'system', content:'You are an AI that analyzes livestream screenshots.'},
      {role:'user', content:[
        {type:'text', text:prompt},
        {type:'image_url', image_url:{url:imgB64}}
      ]}
    ],
    stream:false,
    max_tokens:80,
    temperature:0.2
  };
  fetch(ep, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+p.key},
    body:JSON.stringify(body)
  }).then(function(r){ return r.json(); }).then(function(d){
    cb(goParseAIText(d));
  }).catch(function(){ cb(null); });
}

/* ---- Setup Page ---- */
function goRenderSetup(){
  var s = goState;
  if(typeof goSyncBalanceFromWallet === 'function') goSyncBalanceFromWallet();
  var bal = document.getElementById('go-balance-display');
  if(bal) bal.textContent = '钱包 ¥' + Number(s.balance || 0).toFixed(2);
  var api = document.getElementById('go-api-status');
  if(api){
    var p = goActiveApiProfile();
    api.innerHTML = goApiReady()
      ? '<b>AI 已连接</b><small>'+esc((p.name || p.model || '当前模型'))+' ? 弹幕 / 问答 / 评分会走设置 API</small>'
      : '<b>AI 未配置</b><small>请到设置里的 API Config 保存模型，GO 不单独配置 API</small>';
    api.classList.toggle('warn', !goApiReady());
  }
  var types = [
    {id:'ecommerce', t:'带货', s:'AI 审稿 + 小黄车订单'},
    {id:'game', t:'游戏', s:'上传战绩，AI 判定'},
    {id:'couple', t:'情侣Q&A', s:'WeChat 好友连麦答题'},
    {id:'asmr', t:'ASMR', s:'语音互动收听反馈'},
    {id:'voice', t:'语音厅', s:'连麦观众实时反应'},
    {id:'beauty', t:'美妆', s:'教程讲解评分'}
  ];
  var grid = document.getElementById('go-type-grid');
  if(grid) grid.innerHTML = types.map(function(tp){
    var sel = s.liveType === tp.id ? ' selected' : '';
    return '<div class="go-type-card'+sel+'" onclick="goSelectType(\''+tp.id+'\')"><div class="go-type-orb">'+tp.t.slice(0,1)+'</div><div class="t">'+tp.t+'</div><div class="s">'+tp.s+'</div></div>';
  }).join('');
  var cats = [
    {id:'auto', t:'自动混合'}, {id:'funny', t:'搞笑抽象'}, {id:'pro', t:'专业'},
    {id:'simp', t:'夸夸'}, {id:'hate', t:'毒舌'}, {id:'custom', t:'自定义'}
  ];
  var dmWrap = document.getElementById('go-dm-cats');
  if(dmWrap) dmWrap.innerHTML = cats.map(function(c){
    var sel = s.danmakuCat === c.id;
    return '<button class="go-btn sm'+(sel?' selected':'')+'" onclick="goSelectDmCat(\''+c.id+'\')">'+c.t+'</button>';
  }).join('');
  var wbSel = document.getElementById('go-wb-bind');
  if(wbSel){
    var opts = '<option value="">不绑定</option>';
    if(typeof worldBooks !== 'undefined'){
      Object.keys(worldBooks).forEach(function(k){
        opts += '<option value="'+esc(k)+'"'+(s.worldBookBind===k?' selected':'')+'>'+esc(worldBooks[k].name||k)+'</option>';
      });
    }
    wbSel.innerHTML = opts;
  }
  var idEl = document.getElementById('go-live-id');
  if(idEl) idEl.value = s.liveId || '';
  var av = document.getElementById('go-avatar-preview');
  if(av){ av.style.backgroundImage = s.liveAvatar ? 'url('+s.liveAvatar+')' : ''; }
  var dmC = document.getElementById('go-dm-custom');
  if(dmC) dmC.value = s.danmakuCustom || '';
  var hist = document.getElementById('go-history-list');
  if(hist && s.history.length > 0){
    var typeNames = {ecommerce:'带货',game:'游戏',couple:'情侣Q&A',asmr:'ASMR',voice:'语音厅',beauty:'美妆'};
    hist.innerHTML = '<div class="go-label">直播记录</div>' + s.history.slice(-5).reverse().map(function(h){
      var d = new Date(h.time);
      var ts = (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes();
      return '<div class="go-card soft" style="padding:10px 14px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:#45685a;">'+typeNames[h.type]+' '+ts+'</span><span style="font-size:13px;font-weight:700;color:'+(h.success?'#198f60':'#888')+';">'+(h.success?'+?'+h.reward:'未完成')+'</span></div></div>';
    }).join('');
  } else if(hist){
    hist.innerHTML = '';
  }
}
function goSelectType(type){ goState.liveType = type; goRenderSetup(); saveState(); }
function goSelectDmCat(cat){ goState.danmakuCat = cat; goRenderSetup(); saveState(); }
function goPickAvatar(){ goFileContext = 'avatar'; document.getElementById('go-file-input').click(); }
