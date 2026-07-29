/* ---- AI Call Helper ---- */
function goCallAI(prompt, systemPrompt, cb){
  var m = apiConfig.models[apiConfig.active];
  if(!m || !m.key){ cb(null); return; }
  var ep = normEp(m.endpoint, m.apiFormat);
  var msgs = [];
  if(systemPrompt) msgs.push({role:'system', content:systemPrompt});
  msgs.push({role:'user', content:prompt});
  fetch(ep, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+m.key},
    body:JSON.stringify({model:m.model, messages:msgs, stream:false, max_tokens:300})
  }).then(function(r){ return r.json(); }).then(function(d){
    var txt = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    cb(txt);
  }).catch(function(e){ cb(null); });
}

function goCallAIVision(prompt, imgB64, cb){
  var m = apiConfig.models[apiConfig.active];
  if(!m || !m.key){ cb(null); return; }
  var ep = normEp(m.endpoint, m.apiFormat);
  var body = {
    model: m.model,
    messages: [
      {role:'system', content:'You are an AI that analyzes screenshots.'},
      {role:'user', content:[
        {type:'text', text:prompt},
        {type:'image_url', image_url:{url:imgB64}}
      ]}
    ],
    stream:false, max_tokens:80
  };
  fetch(ep, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+m.key},
    body:JSON.stringify(body)
  }).then(function(r){ return r.json(); }).then(function(d){
    var txt = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    cb(txt);
  }).catch(function(e){ cb(null); });
}

/* ---- Setup Page ---- */
function goRenderSetup(){
  var s = goState;
  var bal = document.getElementById('go-balance-display');
  if(bal) bal.textContent = '余额 ' + s.balance;
  var types = [
    {id:'ecommerce', t:'带货', s:'卖货赚佣金', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="8" cy="14" r="1" fill="#1a1a1a"/><circle cx="16" cy="14" r="1" fill="#1a1a1a"/></svg>'},
    {id:'game', t:'游戏', s:'战绩换奖励', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="7" width="20" height="11" rx="3"/><path d="M7 12h4M9 10v4" stroke-linecap="round"/><circle cx="16" cy="11" r="1" fill="#1a1a1a"/><circle cx="18" cy="14" r="1" fill="#1a1a1a"/></svg>'},
    {id:'couple', t:'情侣Q&A', s:'连麦答题', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/><path d="M9 11h6"/></svg>'},
    {id:'asmr', t:'ASMR', s:'语音助眠', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><path d="M3 12h2l2-6 4 14 3-10 2 6h5"/></svg>'},
    {id:'voice', t:'语音厅', s:'唱歌语音', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>'},
    {id:'beauty', t:'美妆', s:'美妆教程', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="9" r="5"/><path d="M12 14v6M9 20h6"/></svg>'}
  ];
  var grid = document.getElementById('go-type-grid');
  if(grid) grid.innerHTML = types.map(function(tp){
    var sel = s.liveType === tp.id ? ' selected' : '';
    return '<div class="go-type-card'+sel+'" onclick="goSelectType(\''+tp.id+'\')">'+tp.ico+'<div class="t">'+tp.t+'</div><div class="s">'+tp.s+'</div></div>';
  }).join('');
  var cats = [
    {id:'auto', t:'自动混合'}, {id:'funny', t:'搞笑抽象'}, {id:'pro', t:'专业'},
    {id:'simp', t:'舔狗'}, {id:'hate', t:'黑粉'}, {id:'custom', t:'自定义'}
  ];
  var dmWrap = document.getElementById('go-dm-cats');
  if(dmWrap) dmWrap.innerHTML = cats.map(function(c){
    var sel = s.danmakuCat === c.id;
    var st = sel ? 'border:1.5px solid #1a1a1a;color:#1a1a1a;background:#fff;' : 'border:1px solid rgba(0,0,0,0.12);color:#888;background:transparent;';
    return '<button class="go-btn sm" style="'+st+'" onclick="goSelectDmCat(\''+c.id+'\')">'+c.t+'</button>';
  }).join('');
  var wbSel = document.getElementById('go-wb-bind');
  if(wbSel){
    var opts = '<option value="">不绑定</option>';
    if(typeof worldBooks !== 'undefined'){
      Object.keys(worldBooks).forEach(function(k){
        opts += '<option value="'+k+'"'+(s.worldBookBind===k?' selected':'')+'>'+worldBooks[k].name+'</option>';
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
  // History
  var hist = document.getElementById('go-history-list');
  if(hist && s.history.length > 0){
    var typeNames = {ecommerce:'带货',game:'游戏',couple:'情侣Q&A',asmr:'ASMR',voice:'语音厅',beauty:'美妆'};
    hist.innerHTML = '<div class="go-label">直播记录</div>' + s.history.slice(-5).reverse().map(function(h){
      var d = new Date(h.time);
      var ts = (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes();
      return '<div class="go-card soft" style="padding:10px 14px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:#555;">'+typeNames[h.type]+' '+ts+'</span><span style="font-size:13px;font-weight:600;color:'+(h.success?'#1a8a3a':'#888')+';">'+(h.success?'+¥'+h.reward:'未完成')+'</span></div></div>';
    }).join('');
  } else if(hist){
    hist.innerHTML = '';
  }
}

function goSelectType(type){ goState.liveType = type; goRenderSetup(); }
function goSelectDmCat(cat){ goState.danmakuCat = cat; goRenderSetup(); }
function goPickAvatar(){ goFileContext = 'avatar'; document.getElementById('go-file-input').click(); }
