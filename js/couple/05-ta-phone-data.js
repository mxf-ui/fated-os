/* Couple Space: AI partner takeover of the user's in-site phone */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;

  var taTake = {open:false, app:'home', running:false, step:0, queue:[], speech:[], recentSpeechKeys:[], moneyCooldown:0, selectedContact:null, selectedHidden:null, voice:true, report:null, snapshot:null, acting:null};
  var taTimers = [];
  var appList = [
    ['wechat','WeChat','微信'], ['moments','Moments','朋友圈'], ['forum','Forum','论坛'], ['contacts','Contacts','联系人'],
    ['music','Listen','一起听'], ['novel','Novel','小说'], ['go','GO Live','GO 直播'], ['nilflow','Nilflow','匿流'],
    ['dream','Dreamcore','雾织梦核'], ['game','Game','游戏'], ['suoha','Suoha','梭哈'], ['settings','Settings','设置'],
    ['diary','Diary','日记'], ['notes','Notes','备忘'], ['wallet','Wallet','钱包'], ['shop','Shop','购物'], ['browse','Browser','浏览'], ['couple','Couple','情侣']
  ];

  function h(v){ if(typeof esc==='function') return esc(String(v||'')); return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function now(){ return (typeof nowStamp==='function') ? nowStamp() : Date.now(); }
  function persist(){ if(typeof saveCoupleState==='function') saveCoupleState(); if(typeof saveState==='function') saveState(); }
  function partnerId(){ return coupleState.partner || ''; }
  function partner(){ return contacts && contacts[partnerId()] ? contacts[partnerId()] : null; }
  function displayName(c,id){ return (c && (c.displayName || c.name)) || id || 'TA'; }
  function appName(k){ var a=appList.filter(function(x){ return x[0]===k; })[0]; return a ? a[1]+' '+a[2] : k; }
  function arr(v){ return Array.isArray(v) ? v : []; }
  function plain(v){ return String(v==null?'':v).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(); }
  function moneyValue(v){ var n=parseFloat(String(v||'').replace(/[^0-9.-]/g,'')); return isFinite(n) ? n : 0; }
  function isVisibleContact(id){ var c=contacts[id]; return !!(c && id!=='me' && !c.isGroup && !c.blocked && !c.taDeletedByPartner); }
  function shortText(m){
    if(!m) return '';
    if(typeof m==='string') return m;
    if(m.kind==='photo') return '[图片] '+(m.name||m.text||'');
    if(m.kind==='voice') return '[语音] '+(m.text||'');
    if(m.kind==='card') return '[卡片] '+(m.name||m.text||m.note||m.cardType||'');
    if(m.kind==='pat') return m.text||'';
    return m.text||m.name||m.title||m.note||'';
  }
  function detectMoneySignal(text){ return /亲属卡|亲密付|转账|红包|礼物|付款|支付|下单|商品卡片|外卖|product|transfer|family|redpacket|gift|order/i.test(String(text||'')); }
  function limit(s,n){ s=String(s||''); return s.length>n ? s.slice(0,n)+'...' : s; }
  function avatarHTML(c){ if(c && typeof contactAvatar==='function') return contactAvatar(c); return '<span style="font-size:12px;font-weight:800;color:#426d58;">TA</span>'; }
  function data(){ return (typeof coupleData==='function') ? coupleData() : {}; }
  function coupleTaEvidenceKey(action, evidence){
    action=action||{}; evidence=evidence||{};
    if(action.type==='inspect_chat') return 'chat:'+(action.contactId||'');
    if(action.type==='inspect_moment') return 'moment:'+(action.momentIndex||0)+':'+(action.authorId||'');
    if(action.type==='inspect_nilflow_post') return 'nilflow-post:'+(action.postId||action.postIndex||0);
    if(action.type==='inspect_nilflow_chat') return 'nilflow-chat:'+(action.chatId||action.chatIndex||0);
    if(action.type==='hide_contact') return 'hide:'+(action.contactId||'');
    return 'app:'+(action.app||taTake.app||'home');
  }
  function coupleTaSpeechTopic(action, evidence){
    action=action||{}; evidence=evidence||{};
    if(action.type==='inspect_chat') return '聊天关系';
    if(action.type==='inspect_moment') return '朋友圈互动';
    if(action.type==='inspect_nilflow_post') return '匿流发帖';
    if(action.type==='inspect_nilflow_chat') return '匿流私聊';
    if(action.app==='music') return '一起听';
    if(action.app==='novel') return '小说共读';
    if(action.app==='go') return '直播连麦';
    if(action.app==='dream') return '副本关系';
    if(action.app==='wallet' || action.app==='shop') return '花钱痕迹';
    return appName(action.app||taTake.app);
  }
  function coupleTaSpeechContext(action, evidence){
    if(!taTake.recentSpeechKeys) taTake.recentSpeechKeys=[];
    var key=coupleTaEvidenceKey(action, evidence);
    var topic=coupleTaSpeechTopic(action, evidence);
    var moneyTopic=(topic==='花钱痕迹') || (action&&action.app==='wallet') || (action&&action.app==='shop');
    var moneyCooldown=taTake.moneyCooldown||0;
    if(!moneyTopic && moneyCooldown>0) moneyCooldown--;
    if(moneyTopic && moneyCooldown>0) topic='关系细节';
    return {key:key, topic:topic, moneyCooldown:moneyCooldown, recentSpeechKeys:taTake.recentSpeechKeys.slice(-8)};
  }
  function todayKey(){ if(typeof ymdKey==='function') return ymdKey(new Date()); var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  var TA_APP_LOCK_MS = window.TA_APP_LOCK_MS || 15*60*1000;
  var TA_TAKEOVER_MIN_MS = window.TA_TAKEOVER_MIN_MS || 120*1000;
  var TA_TAKEOVER_MAX_MS = window.TA_TAKEOVER_MAX_MS || 240*1000;
  window.TA_APP_LOCK_MS = TA_APP_LOCK_MS;
  window.TA_TAKEOVER_MIN_MS = TA_TAKEOVER_MIN_MS;
  window.TA_TAKEOVER_MAX_MS = TA_TAKEOVER_MAX_MS;
  /* verification keywords: 15分钟 暧昧 */
  function hasDesktopApp(id){ return (typeof appIcons!=='undefined' && Array.isArray(appIcons) && appIcons.some(function(a){ return a && a.id===id; })); }
  function lockTargetApp(app){
    if(hasDesktopApp(app)) return app;
    if(app==='contacts' || app==='moments') return 'wechat';
    if(app==='wallet' || app==='shop' || app==='browse' || app==='diary' || app==='notes') return 'wechat';
    return app || 'wechat';
  }
  function closeRealSheets(){
    try{ document.querySelectorAll('.sheet.open').forEach(function(el){ el.classList.remove('open'); }); }catch(e){}
  }
  function coupleTaTopBanner(){
    var root=document.getElementById('screen') || document.body;
    var bar=document.getElementById('couple-ta-top-banner');
    if(!bar){
      bar=document.createElement('div');
      bar.id='couple-ta-top-banner';
      bar.style.cssText='position:absolute;left:10px;right:10px;top:8px;z-index:520;display:none;pointer-events:auto;background:rgba(247,255,250,.94);border:1px solid rgba(43,102,71,.22);box-shadow:0 12px 34px rgba(18,52,34,.18);backdrop-filter:blur(18px);border-radius:18px;padding:9px 10px;color:#123627;font-size:12px;line-height:1.42;';
      bar.innerHTML='<div style="display:flex;gap:9px;align-items:flex-start;"><div style="width:29px;height:29px;border-radius:11px;overflow:hidden;background:#dff2e8;display:flex;align-items:center;justify-content:center;flex:0 0 auto;" id="couple-ta-top-avatar"></div><div style="flex:1;min-width:0;"><div style="font-size:10px;color:#5d826f;font-weight:850;margin-bottom:2px;">TA \u6b63\u5728\u63a5\u7ba1\u5c0f\u624b\u673a</div><div id="couple-ta-top-text" style="font-weight:800;white-space:pre-wrap;"></div><div id="couple-ta-top-meta" style="font-size:10px;color:#72907f;margin-top:2px;"></div></div><button type="button" onclick="closeTaTakeover()" style="border:0;background:rgba(43,102,71,.08);color:#28593f;border-radius:999px;width:24px;height:24px;font-size:16px;line-height:20px;cursor:pointer;">\u00d7</button></div>';
      root.appendChild(bar);
    }
    var av=bar.querySelector('#couple-ta-top-avatar');
    if(av) av.innerHTML=avatarHTML(partner());
    return bar;
  }
  window.coupleTaSetTopLine=function(text, meta){
    var bar=coupleTaTopBanner();
    var line=bar.querySelector('#couple-ta-top-text');
    var small=bar.querySelector('#couple-ta-top-meta');
    if(line) line.textContent=text || '';
    if(small){
      var app=(meta&&meta.app)?appName(meta.app):appName(taTake.app);
      small.textContent=(meta&&meta.kind==='lock') ? ('\u5df2\u9501\u5b9a '+app+' 15\u5206\u949f') : ('\u6b63\u5728\u67e5\u770b '+app);
    }
    bar.style.display=text?'block':'none';
    return bar;
  };
  window.coupleTaLockApp=function(app, signal){
    var target=lockTargetApp(app || (signal&&signal.app));
    if(!coupleState.lockedApps) coupleState.lockedApps={};
    var lockUntil=Date.now()+TA_APP_LOCK_MS;
    coupleState.lockedApps[target]=lockUntil;
    persist();
    if(typeof renderDesktopIcons==='function') renderDesktopIcons();
    var detail=(signal&&signal.contactName)?('\uff0c\u56e0\u4e3a '+signal.contactName+' \u7684\u66a7\u6627\u75d5\u8ff9'):'\uff0c\u56e0\u4e3a\u521a\u521a\u67e5\u5230\u66a7\u6627\u75d5\u8ff9';
    window.coupleTaSetTopLine('\u8fd9\u4e2a app \u5148\u522b\u60f3\u70b9\u5f00\u4e86'+detail+'\uff0c\u6211\u9501 15\u5206\u949f\uff0c\u4f60\u5148\u89e3\u91ca\u3002', {kind:'lock',app:target,lockUntil:lockUntil});
    if(typeof showToast==='function') showToast('TA \u5df2\u9501\u5b9a '+appName(target)+' 15\u5206\u949f', 1600, 'warn');
    return lockUntil;
  };
  function signalFromContact(app, contactId, label, text){
    if(!contactId || contactId===partnerId() || !contacts || !contacts[contactId]) return null;
    var c=contacts[contactId];
    return {type:'ambiguous', app:lockTargetApp(app), contactId:contactId, contactName:displayName(c,contactId), label:label||'\u66a7\u6627', text:limit(text||'',120)};
  }
  window.coupleTaFindJealousSignal=function(action, snapshot){
    var s=snapshot || window.coupleTaBuildPhoneSnapshot();
    var app=(action&&action.app) || taTake.app;
    var scopedMoney=(app==='wechat'||app==='contacts'||app==='wallet'||app==='shop'||app==='couple');
    if(scopedMoney){
      var money=arr(s.moneySignals).filter(function(x){ return x.contactId && x.contactId!==partnerId(); })[0];
      if(money) return {type:money.type||'money', app:lockTargetApp(app), contactId:money.contactId, contactName:money.contactName, label:'\u66a7\u6627\u82b1\u94b1', text:money.text};
    }
    if(action && action.type==='inspect_chat' && action.contactId){
      var chat=arr(s.wechat).filter(function(x){ return x.id===action.contactId; })[0];
      if(chat && chat.id!==partnerId() && chat.count>=8) return signalFromContact('wechat', chat.id, '\u9891\u7e41\u804a\u5929', chat.lastText||'\u804a\u5929\u8fc7\u5bc6');
    }
    if(app==='music' && s.music && s.music.contact) return signalFromContact('music', s.music.contact, '\u4e00\u8d77\u542c', s.music.current||'\u5171\u542c\u8bb0\u5f55');
    if(app==='novel' && s.novel && s.novel.contact) return signalFromContact('novel', s.novel.contact, '\u5171\u8bfb\u5c0f\u8bf4', s.novel.title||s.novel.excerpt||'\u5171\u8bfb\u8bb0\u5f55');
    if(app==='go' && s.go && s.go.linkMicContactId) return signalFromContact('go', s.go.linkMicContactId, '\u76f4\u64ad\u8fde\u9ea6', s.go.linkMicName||'\u8fde\u9ea6\u8bb0\u5f55');
    if(app==='dream' && s.dream){
      var other=arr(s.dream.selectedContacts).filter(function(id){ return id && id!==partnerId(); })[0];
      if(other) return signalFromContact('dream', other, '\u526f\u672c\u5173\u7cfb', s.dream.objective||s.dream.worldName||'\u526f\u672c\u540c\u884c');
    }
    return null;
  };
  window.coupleTaOpenRealApp=function(action){
    action=action||{};
    var app=action.app || taTake.app || 'wechat';
    closeRealSheets();
    if(action.type==='inspect_chat' && action.contactId && typeof openThread==='function'){
      if(typeof goToScreen==='function') goToScreen('wechatapp');
      openThread(action.contactId);
      return true;
    }
    if(app==='contacts'){
      if(typeof goToScreen==='function') goToScreen('wechatapp');
      if(typeof switchTab==='function') switchTab('contacts');
      return true;
    }
    if(app==='moments'){
      if(typeof goToScreen==='function') goToScreen('wechatapp');
      if(typeof switchTab==='function') switchTab('moments');
      return true;
    }
    if(hasDesktopApp(app) && typeof openDesktopApp==='function') return openDesktopApp(app, {bypassLock:true});
    if(app==='wallet' && typeof openSheet==='function'){ openSheet('wallet'); return true; }
    if(typeof goToScreen==='function') goToScreen('home');
    return false;
  };


  window.coupleTaBuildDesktopApps=function(){
    var source=(typeof appIcons!=='undefined' && Array.isArray(appIcons)) ? appIcons : [];
    var map={}; source.forEach(function(a){ if(a && (a.id||a[0])) map[a.id||a[0]]=a; });
    return appList.map(function(a){ var icon=map[a[0]]||{}; return {id:a[0],en:a[1],name:a[2],label:a[1]+' '+a[2],hidden:!!icon.hidden,img:icon.img||''}; });
  };
  function latestMessages(c,n){ return arr(c&&c.seed).slice(-(n||12)).map(function(m){ return {mine:!!m.mine,from:m.from||'',kind:m.kind||'text',cardType:m.cardType||'',name:m.name||'',price:m.price||'',text:shortText(m),ts:m.ts||0}; }); }
  function taJealousSignalsFromChats(ids){
    var out=[];
    ids.forEach(function(id){ var c=contacts[id]; arr(c&&c.seed).forEach(function(m){ var text=[shortText(m),m.cardType,m.name,m.price,m.note].join(' '); if(detectMoneySignal(text)){ out.push({type:'money',app:'wechat',contactId:id,contactName:displayName(c,id),text:limit(text,90),amount:moneyValue(text),ts:m.ts||0}); } }); });
    return out.sort(function(a,b){ return (b.amount-a.amount)||((b.ts||0)-(a.ts||0)); }).slice(0,12);
  }
  function snapshotMusic(){ var st=(typeof musicState!=='undefined')?musicState:null; if(!st) return {available:false}; var song=arr(st.songs)[st.idx||0]||{}; return {available:true,playing:!!st.playing,contact:st.contact||'',contactName:displayName(contacts&&contacts[st.contact],st.contact),current:(song.title||'')+(song.artist?' - '+song.artist:''),songs:arr(st.songs).slice(0,12).map(function(x){return {title:x.title||'',artist:x.artist||''};}),listeningDays:st.listeningDays||0,hasBackground:!!st.bg}; }
  function snapshotNovel(){ var st=(typeof novelState!=='undefined')?novelState:null; if(!st) return {available:false}; return {available:true,title:st.title||'',pageIdx:st.pageIdx||0,pages:arr(st.pages).length,contact:st.contact||'',contactName:displayName(contacts&&contacts[st.contact],st.contact),excerpt:limit(plain(arr(st.pages)[st.pageIdx||0]||st.text||''),220),chat:arr(st.chatMsgs).slice(-8).map(function(m){return {mine:!!m.mine,text:m.text||''};})}; }
  function snapshotNilflow(){ var st=(typeof nilflowState!=='undefined')?nilflowState:null; if(!st) return {available:false}; return {available:true,profile:st.profile||{},friends:arr(st.friends).slice(0,8),posts:arr(st.posts).slice(0,10).map(function(p){return {id:p.id,author:p.authorId||p.author,text:p.text||p.body||'',likes:arr(p.likes).length,comments:arr(p.comments).length};}),chats:Object.keys(st.chats||{}).slice(0,8).map(function(id){return {id:id,count:arr(st.chats[id]).length,last:shortText(arr(st.chats[id]).slice(-1)[0])};})}; }
  function snapshotDream(){ var st=(typeof dreamState!=='undefined')?dreamState:null; if(!st) return {available:false}; var slot=arr(st.slots)[st.activeSlot||0]||{}; var run=st.run||{}; return {available:true,activeSlot:st.activeSlot||0,worldName:slot.name||slot.worldName||'',selectedContacts:arr(st.selectedContacts),phase:st.phase||'',objective:run.objective||run.mainTask||slot.mainTask||'',rank:run.rank||'',messages:arr(run.messages).slice(-10).map(function(m){return {role:m.role||m.from||'',text:m.text||m.content||''};}),choices:arr(run.choices).map(function(c){return c.title||c.text||c;})}; }
  function snapshotGo(){ var st=(typeof goState!=='undefined')?goState:null; if(!st) return {available:false}; return {available:true,mode:st.mode||'',host:st.host||'',linkMicContactId:st.linkMicContactId||'',linkMicName:displayName(contacts&&contacts[st.linkMicContactId],st.linkMicContactId),products:arr(st.products).slice(0,10).map(function(p){return {name:p.name||'',price:p.price||'',desc:p.desc||'',hasImg:!!p.img};}),orders:arr(st.orders).slice(-10),events:arr(st.liveEvents).slice(-12).map(function(e){return e.text||e.title||String(e);})}; }
  function snapshotForum(){ var st=(typeof forumState!=='undefined')?forumState:null; if(!st) return {available:false}; return {available:true,filter:st.filter||'',posts:arr(st.posts).slice(0,10).map(function(p){return {title:p.title||'',text:p.text||p.body||'',author:p.author||'',likes:arr(p.likes).length,comments:arr(p.comments).length};})}; }
  function snapshotGame(){ return {available:true,records:(typeof gameState!=='undefined')?gameState:{},summary:plain((localStorage&&localStorage.getItem('fated_game_records'))||'')}; }
  function snapshotSuoha(){ return {available:true,records:(typeof suohaState!=='undefined')?suohaState:{},summary:plain((localStorage&&localStorage.getItem('fated_suoha_records'))||'')}; }
  function snapshotSettings(){ return {available:true,apiConfigured:!!(typeof apiConfig!=='undefined'&&apiConfig&&apiConfig.apiKey),provider:(typeof apiConfig!=='undefined'&&apiConfig&&(apiConfig.provider||apiConfig.apiMode||apiConfig.endpoint))||'',model:(typeof apiConfig!=='undefined'&&apiConfig&&(apiConfig.model||apiConfig.chatModel))||'',tts:!!(typeof ttsConfigured==='function'&&ttsConfigured()),image:!!(typeof imageApiConfigured==='function'&&imageApiConfigured())}; }

  window.coupleTaBuildPhoneSnapshot=function(){
    var d=data();
    var ids=Object.keys(contacts||{}).filter(function(id){ return isVisibleContact(id); });
    var hidden=Object.keys(contacts||{}).filter(function(id){ var c=contacts[id]; return c && c.taDeletedByPartner; });
    var wechat=ids.map(function(id){ var c=contacts[id]; var seed=arr(c.seed); var last=seed.length?seed[seed.length-1]:null; return {id:id,name:displayName(c,id),persona:c.persona||c.tone||'',memory:c.memory&&c.memory.summary?c.memory.summary:'',count:seed.length,lastText:shortText(last),messages:latestMessages(c,14)}; });
    var browse=[];
    if(Array.isArray(d.browseUser)) browse=browse.concat(d.browseUser);
    try{ if(typeof genDailyBrowse==='function') browse=browse.concat(genDailyBrowse(todayKey())); }catch(e){}
    var moneySignals=taJealousSignalsFromChats(ids);
    var snapshot={
      partner:partnerId(), partnerName:displayName(partner(), partnerId()), userName:(typeof userName!=='undefined'?userName:'User'),
      desktopApps:window.coupleTaBuildDesktopApps(),
      contacts:ids.map(function(id){ var c=contacts[id]; return {id:id,name:displayName(c,id),persona:c.persona||c.tone||'',memory:c.memory&&c.memory.summary?c.memory.summary:'',messageCount:arr(c.seed).length}; }),
      hiddenContacts:hidden.map(function(id){ var c=contacts[id]; return {id:id,name:displayName(c,id),deletedAt:c.taDeletedAt||0,by:c.taDeletedBy||''}; }),
      wechat:wechat,
      moneySignals:moneySignals,
      taJealous:moneySignals,
      diary:arr(d.diary).slice(-20),
      notes:arr(d.notes).slice(-20),
      wallet:{balance:(typeof walletBalance==='number'?walletBalance:null), tx:arr(typeof walletTx!=='undefined'?walletTx:[]).slice(0,20)},
      shop:arr(d.shop).slice(0,20),
      browse:browse.slice(-30),
      couple:{checkin:d.checkin||{}, location:d.location||null, foodOrders:arr(d.foodOrders).slice(-10), taHistory:arr(d.taTakeoverHistory).slice(0,12)},
      moments:(typeof moments!=='undefined'&&Array.isArray(moments))?moments.slice(0,12).map(function(m){return {authorId:m.authorId,text:m.text,ts:m.ts,likes:arr(m.likes).length,comments:arr(m.comments).length};}):[],
      forum:snapshotForum(),
      music:snapshotMusic(),
      novel:snapshotNovel(),
      go:snapshotGo(),
      nilflow:snapshotNilflow(),
      dream:snapshotDream(),
      game:snapshotGame(),
      suoha:snapshotSuoha(),
      settings:snapshotSettings()
    };
    return snapshot;
  };

  function snapshotBrief(s){
    var hot=arr(s.wechat).slice().sort(function(a,b){return b.count-a.count;}).slice(0,4).map(function(c){return c.name+': '+c.count+'条, 最近 '+limit(c.lastText,36);}).join('\n');
    var money=arr(s.moneySignals).slice(0,5).map(function(x){return x.contactName+': '+x.text;}).join(' / ');
    var notes=arr(s.notes).map(function(x){return typeof x==='string'?x:(x.text||x.title||'');}).filter(Boolean).slice(-4).join(' / ');
    var diary=arr(s.diary).map(function(x){return typeof x==='string'?x:(x.text||x.title||'');}).filter(Boolean).slice(-3).join(' / ');
    var shop=arr(s.shop).map(function(x){return (x.name||'')+' '+(x.price||'');}).filter(Boolean).slice(0,5).join(' / ');
    var browse=arr(s.browse).map(function(x){return x.text||x.title||String(x);}).filter(Boolean).slice(0,8).join(' / ');
    var apps=arr(s.desktopApps).map(function(a){return a.name;}).join('、');
    return ['用户: '+s.userName,'TA: '+s.partnerName,'桌面 app: '+apps,'WeChat\n'+(hot||'无可见联系人'),'吃醋/金钱信号: '+(money||'暂无'),'一起听: '+((s.music&&s.music.current)||'暂无'),'小说: '+((s.novel&&s.novel.title)||'暂无'),'匿流帖子: '+arr(s.nilflow&&s.nilflow.posts).length,'雾织梦核: '+((s.dream&&s.dream.worldName)||'暂无'),'GO直播商品: '+arr(s.go&&s.go.products).length,'日记: '+(diary||'无'),'备忘: '+(notes||'无'),'钱包: '+(s.wallet.balance===null?'未同步':s.wallet.balance),'购物: '+(shop||'无'),'浏览: '+(browse||'无')].join('\n');
  }

  window.coupleTaBuildAppEvidence=function(app, snapshot, action){
    var s=snapshot||window.coupleTaBuildPhoneSnapshot();
    var k=app || (action&&action.app) || taTake.app;
    if(k==='wechat' && action && action.contactId){ var chat=arr(s.wechat).filter(function(x){return x.id===action.contactId;})[0]; return {app:k, action:action, chat:chat, moneySignals:arr(s.moneySignals).filter(function(x){return x.contactId===action.contactId;}).slice(0,4)}; }
    if(k==='wechat') return {app:k, chats:arr(s.wechat).slice(0,6), moneySignals:arr(s.moneySignals).slice(0,6)};
    if(k==='contacts') return {app:k, contacts:arr(s.contacts).slice(0,20), hiddenContacts:arr(s.hiddenContacts), moneySignals:arr(s.moneySignals).slice(0,4)};
    if(k==='moments' && action && action.type==='inspect_moment') return {app:k, action:action, moment:arr(s.moments)[action.momentIndex]||null, moments:arr(s.moments).slice(0,10)};
    if(k==='moments') return {app:k, moments:arr(s.moments).slice(0,10)};
    if(k==='forum') return {app:k, forum:s.forum};
    if(k==='music') return {app:k, music:s.music};
    if(k==='novel') return {app:k, novel:s.novel};
    if(k==='go') return {app:k, go:s.go};
    if(k==='nilflow' && action && (action.type==='inspect_nilflow_post'||action.type==='inspect_nilflow_chat')) return {app:k, action:action, nilflow:s.nilflow};
    if(k==='nilflow') return {app:k, nilflow:s.nilflow};
    if(k==='dream') return {app:k, dream:s.dream};
    if(k==='game') return {app:k, game:s.game};
    if(k==='suoha') return {app:k, suoha:s.suoha};
    if(k==='settings') return {app:k, settings:s.settings};
    if(k==='diary') return {app:k, diary:arr(s.diary).slice(-12)};
    if(k==='notes') return {app:k, notes:arr(s.notes).slice(-12)};
    if(k==='wallet') return {app:k, wallet:s.wallet, moneySignals:arr(s.moneySignals).slice(0,8)};
    if(k==='shop') return {app:k, shop:arr(s.shop).slice(0,12)};
    if(k==='browse') return {app:k, browse:arr(s.browse).slice(-14)};
    if(k==='couple') return {app:k, couple:s.couple, hiddenContacts:arr(s.hiddenContacts), moneySignals:arr(s.moneySignals).slice(0,6)};
    return {app:k, action:action, brief:snapshotBrief(s)};
  };

  window.coupleTaActionQueue=function(snapshot){
    var q=[];
    function push(action){ action=action||{}; action.from_home=true; q.push(action); }
    var hot=arr(snapshot.wechat).slice().sort(function(a,b){return b.count-a.count;});
    var signal=arr(snapshot.moneySignals)[0] || null;
    var seen={};
    function chatOrder(){
      var ordered=[];
      if(signal && signal.contactId) ordered.push(signal.contactId);
      hot.forEach(function(c){ if(c&&c.id) ordered.push(c.id); });
      arr(snapshot.wechat).forEach(function(c){ if(c&&c.id) ordered.push(c.id); });
      return ordered.filter(function(id){ if(!id||seen[id]) return false; seen[id]=1; return true; });
    }
    push({type:'open_app',app:'wechat'});
    chatOrder().forEach(function(id){ push({type:'inspect_chat',app:'wechat',contactId:id}); });
    push({type:'open_app',app:'moments'});
    arr(snapshot.moments).forEach(function(m,i){ push({type:'inspect_moment',app:'moments',momentIndex:i,authorId:m.authorId||'',text:m.text||''}); });
    push({type:'open_app',app:'contacts'});
    var rivalId=signal && signal.contactId!==snapshot.partner ? signal.contactId : null;
    if(!rivalId){ var rival=hot.filter(function(c){return c.id!==snapshot.partner;})[0]; rivalId=rival&&rival.id; }
    if(rivalId) push({type:'hide_contact',app:'contacts',contactId:rivalId,reason:signal&&signal.text});
    push({type:'open_app',app:'forum'});
    push({type:'open_app',app:'music'});
    push({type:'open_app',app:'novel'});
    push({type:'open_app',app:'go'});
    push({type:'open_app',app:'nilflow'});
    arr(snapshot.nilflow&&snapshot.nilflow.posts).forEach(function(p,i){ push({type:'inspect_nilflow_post',app:'nilflow',postIndex:i,postId:p.id||'',author:p.author||p.authorId||'',text:p.text||''}); });
    arr(snapshot.nilflow&&snapshot.nilflow.chats).forEach(function(c,i){ push({type:'inspect_nilflow_chat',app:'nilflow',chatIndex:i,chatId:c.id||'',last:c.last||'',count:c.count||0}); });
    push({type:'open_app',app:'dream'});
    push({type:'open_app',app:'game'});
    push({type:'open_app',app:'suoha'});
    push({type:'open_app',app:'settings'});
    push({type:'open_app',app:'diary'});
    push({type:'open_app',app:'notes'});
    push({type:'open_app',app:'wallet'});
    push({type:'open_app',app:'shop'});
    push({type:'open_app',app:'browse'});
    push({type:'finish_report',app:'couple'});
    return q;
  };

  function actionTitle(action){
    if(!action) return '\u6b63\u5728\u67e5\u770b';
    if(action.type==='inspect_chat') return '\u6253\u5f00\u804a\u5929';
    if(action.type==='inspect_moment') return '\u7ffb\u770b\u670b\u53cb\u5708';
    if(action.type==='inspect_nilflow_post') return '\u68c0\u67e5\u533f\u6d41\u5e16\u5b50';
    if(action.type==='inspect_nilflow_chat') return '\u68c0\u67e5\u533f\u6d41\u79c1\u804a';
    if(action.type==='hide_contact') return '\u5220\u9664\u8054\u7cfb\u4eba';
    if(action.type==='finish_report') return '\u751f\u6210\u5224\u65ad';
    return '\u6253\u5f00 '+appName(action.app);
  }

  window.coupleTaCallAI=function(action, snapshot, callback){
    var pid=partnerId();
    var snap=snapshot||window.coupleTaBuildPhoneSnapshot();
    var evidence=window.coupleTaBuildAppEvidence((action&&action.app)||taTake.app, snap, action||{});
    var speechCtx=coupleTaSpeechContext(action||{}, evidence||{});
    var persona=(typeof getPersonaPrompt==='function'&&pid)?getPersonaPrompt(pid):'';
    var world=(typeof getWorldBookPrompt==='function'&&pid)?getWorldBookPrompt(pid):'';
    var time=(typeof nowContext==='function')?nowContext():'';
    var system=persona+'\n'+world+'\n'+time+'\n\n你是正在查岗的 TA，只能查看 user 的 Fated OS 站内小手机数据。不要模板化，要像真实伴侣边翻边说话，有吃醋、停顿、追问和具体细节，但不要死话术。不能声称访问真实手机、真实 WeChat、系统通讯录或外部平台，只能说站内 WeChat、匿流、一起听、小说、直播、副本等数据。不要连续两次围绕钱，也不要每次都围绕亲属卡、转账、红包、购物下单。不要重复上一轮同一个细节，必须换角度评论本轮看到的 app 证据。输出给 user 的 1-2 句短发言，不要 emoji。';
    var user='查岗动作: '+JSON.stringify(action||{})+'\n当前 app 证据: '+JSON.stringify(evidence||{})+'\n本轮查岗焦点: '+speechCtx.topic+'\n近期已经说过的话题: '+JSON.stringify(speechCtx.recentSpeechKeys)+'\nmoneyCooldown: '+speechCtx.moneyCooldown+'\n\n手机快照摘要:\n'+snapshotBrief(snap)+'\n\n请根据本轮正在打开的 app 和证据说一句个性化查岗发言。不要一直提到钱，不要重复上一轮同一个细节；如果上一轮已经说过同一个联系人或同一个证据，就换成语气、频率、隐藏感、共同经历、互动边界、匿名痕迹等角度。';
    if(typeof callRealAI==='function' && pid){
      callRealAI([{role:'user',content:user}], system, pid, function(reply){ callback((reply||'').trim()); });
    }else{
      var line='我看到 '+speechCtx.topic+' 这里有点不对劲，刚刚这个细节你别想糊弄过去。';
      if(action&&action.type==='inspect_chat'&&action.contactId) line='我刚点开 '+displayName(contacts&&contacts[action.contactId],action.contactId)+' 的聊天，这个语气和频率我会记着，你先别急着切走。';
      else if(action&&action.type==='inspect_moment') line='朋友圈这条互动我看到了，谁在下面出现、你怎么回的，我都要慢慢对。';
      else if(action&&action.type==='inspect_nilflow_post') line='匿流这条我先记下了，匿名不代表我看不出你在跟谁有来有回。';
      else if(action&&action.type==='inspect_nilflow_chat') line='匿流私聊我也翻到了，这种藏起来的聊天比明面上的更要解释。';
      callback(line);
    }
  };

  function addSpeech(who,text,meta){
    if(!text) return;
    meta=meta||{};
    if(who==='ta' && meta.key){ taTake.recentSpeechKeys=taTake.recentSpeechKeys||[]; taTake.recentSpeechKeys.push(meta.key); taTake.recentSpeechKeys=taTake.recentSpeechKeys.slice(-8); if(meta.topic==='花钱痕迹') taTake.moneyCooldown=2; else if(taTake.moneyCooldown>0) taTake.moneyCooldown--; }
    taTake.speech.push({who:who,text:text,ts:now()});
    taTake.speech=taTake.speech.slice(-30);
    var d=data(); if(!Array.isArray(d.taTakeoverHistory)) d.taTakeoverHistory=[];
    d.taTakeoverHistory.unshift({who:who,text:text,ts:now(),app:taTake.app});
    d.taTakeoverHistory=d.taTakeoverHistory.slice(0,80);
    persist();
  }
  window.coupleTaSpeak=function(action, snapshot, done){
    window.coupleTaCallAI(action, snapshot, function(reply){
      if(!reply) reply='\u6211\u770b\u5230\u4e86\uff0c\u8fd9\u4e2a\u4fe1\u53f7\u6211\u8981\u5355\u72ec\u8bb0\u4e00\u4e0b\u3002';
      var speechCtx=coupleTaSpeechContext(action||{}, window.coupleTaBuildAppEvidence((action&&action.app)||taTake.app, snapshot||window.coupleTaBuildPhoneSnapshot(), action||{}));
      addSpeech('ta', reply, speechCtx);
      window.coupleTaSetTopLine(reply, {app:(action&&action.app)||taTake.app, action:action});
      renderTaTakeover();
      if(taTake.voice && typeof ttsConfigured==='function' && ttsConfigured() && typeof speakWithTTS==='function'){
        try{ speakWithTTS(reply, (apiConfig.voiceIds&&apiConfig.voiceIds[partnerId()])||''); }catch(e){}
      }else if(taTake.voice && typeof speakText==='function'){
        try{ var old=typeof currentContact!=='undefined'?currentContact:null; if(partnerId()) currentContact=partnerId(); speakText(reply); if(old!==null) currentContact=old; }catch(e){}
      }
      if(done) done(reply);
    });
  };

  window.coupleTaHideContact=function(id){
    var c=contacts&&contacts[id]; if(!c || id==='me' || id===partnerId()) return false;
    if(!c.taDeletedByPartner){ c.taDeletedPrevBlocked=!!c.blocked; c.taDeletedByPartner=true; c.taDeletedBy=partnerId(); c.taDeletedAt=now(); c.blocked=true; }
    var d=data(); if(!Array.isArray(d.taDeletedContacts)) d.taDeletedContacts=[];
    if(!d.taDeletedContacts.some(function(x){return x.id===id;})) d.taDeletedContacts.unshift({id:id,name:displayName(c,id),by:partnerId(),at:c.taDeletedAt});
    if(typeof saveChatThread==='function') saveChatThread(id); persist(); if(typeof renderChatList==='function') renderChatList(); return true;
  };
  window.coupleTaRestoreContact=function(id){
    var c=contacts&&contacts[id]; if(!c) return false;
    c.blocked=!!c.taDeletedPrevBlocked; c.taDeletedByPartner=false; c.taDeletedBy=''; c.taDeletedAt=0; c.taDeletedPrevBlocked=false;
    var d=data(); if(Array.isArray(d.taDeletedContacts)) d.taDeletedContacts=d.taDeletedContacts.filter(function(x){return x.id!==id;});
    if(typeof saveChatThread==='function') saveChatThread(id); persist(); if(typeof renderChatList==='function') renderChatList(); taTake.snapshot=window.coupleTaBuildPhoneSnapshot(); renderTaTakeover(); return true;
  };

  function coupleTaStepDelay(){
    var total=Math.max(1, taTake.queue ? taTake.queue.length : 1);
    var elapsed=taTake.startedAt ? (Date.now()-taTake.startedAt) : 0;
    var remaining=Math.max(1, total-taTake.step);
    var target=Math.min(TA_TAKEOVER_MAX_MS, Math.max(TA_TAKEOVER_MIN_MS, 180*1000));
    var delay=Math.round(target/total);
    delay=Math.max(900, Math.min(9000, delay));
    if(elapsed+delay>TA_TAKEOVER_MAX_MS) delay=Math.max(250, Math.floor((TA_TAKEOVER_MAX_MS-elapsed)/remaining));
    if(taTake.step>=total-1 && elapsed+delay<TA_TAKEOVER_MIN_MS) delay=TA_TAKEOVER_MIN_MS-elapsed;
    return Math.max(250, delay);
  }

  function runNext(){
    if(!taTake.open || !taTake.running) return;
    if(taTake.step>=taTake.queue.length){
      taTake.running=false; taTake.app='couple'; taTake.acting={type:'finish_report',app:'couple'};
      if(typeof goToScreen==='function') goToScreen('home');
      taTimers.push(setTimeout(function(){ window.coupleTaOpenRealApp(taTake.acting); }, 650));
      window.coupleTaSetTopLine('\u6211\u628a\u4f60\u8fd9\u4e2a\u5c0f\u624b\u673a\u80fd\u770b\u7684\u5730\u65b9\u90fd\u770b\u5b8c\u4e86\uff0c\u521a\u521a\u9501\u6389\u7684 app \u5230\u65f6\u95f4\u624d\u51c6\u7528\u3002', {app:'couple'});
      renderTaTakeover();
      return;
    }
    var action=taTake.queue[taTake.step++]; taTake.acting=action; if(action.app) taTake.app=action.app; if(action.contactId) taTake.selectedContact=action.contactId;
    if(typeof goToScreen==='function') goToScreen('home');
    closeRealSheets();
    window.coupleTaSetTopLine('\u6211\u5148\u56de\u5230\u4e3b\u5c4f\u5e55\uff0c\u518d\u70b9\u5f00 '+appName(action.app)+' \u6162\u6162\u67e5\u3002', {app:action.app,from_home:true});
    renderTaTakeover();
    taTimers.push(setTimeout(function(){ window.coupleTaOpenRealApp(action);
      taTake.snapshot=window.coupleTaBuildPhoneSnapshot();
      var signal=window.coupleTaFindJealousSignal(action, taTake.snapshot);
      if(action.type==='hide_contact'){
        window.coupleTaHideContact(action.contactId);
        window.coupleTaLockApp(action.app || 'wechat', signal || {app:action.app,contactId:action.contactId,contactName:displayName(contacts&&contacts[action.contactId],action.contactId),text:action.reason||''});
      }else if(signal){
        if(signal.contactId) window.coupleTaHideContact(signal.contactId);
        window.coupleTaLockApp(signal.app || action.app, signal);
      }
      renderTaTakeover();
      window.coupleTaSpeak(action, taTake.snapshot, function(){ taTimers.push(setTimeout(runNext, coupleTaStepDelay())); });
    }, 650));
  }

  window.coupleTaTakeover=function(){
    if(!partnerId() || !partner()){ if(typeof showToast==='function') showToast('\u8bf7\u5148\u7ed1\u5b9a\u4e00\u4e2a WeChat \u8054\u7cfb\u4eba',1500); return; }
    var ov=document.getElementById('screen-tatake');
    if(ov) ov.classList.remove('active');
    taTimers.forEach(function(t){clearTimeout(t);}); taTimers=[];
    taTake={open:true, app:'wechat', running:true, step:0, queue:[], speech:[], selectedContact:null, selectedHidden:null, voice:true, report:null, snapshot:window.coupleTaBuildPhoneSnapshot(), startedAt:Date.now(), acting:{type:'open_app',app:'wechat'}};
    taTake.queue=window.coupleTaActionQueue(taTake.snapshot);
    addSpeech('system','\u5df2\u6388\u6743 TA \u67e5\u770b\u4f60\u5728 Fated OS \u91cc\u7684\u5c0f\u624b\u673a\u6570\u636e\u3002');
    window.coupleTaSetTopLine('\u6211\u5f00\u59cb\u63a5\u7ba1\u4f60\u7684\u5c0f\u624b\u673a\u4e86\uff0c\u4e00\u4e2a app \u4e00\u4e2a app \u770b\uff0c\u522b\u60f3\u7740\u8d81\u6211\u67e5\u5c97\u7684\u65f6\u5019\u8eb2\u3002', {app:'wechat'});
    if(typeof goToScreen==='function') goToScreen('home');
    renderTaTakeover(); taTimers.push(setTimeout(runNext, 80));
  };
  window.closeTaTakeover=function(){ taTimers.forEach(function(t){clearTimeout(t);}); taTimers=[]; taTake.open=false; taTake.running=false; var ov=document.getElementById('screen-tatake'); if(ov) ov.classList.remove('active'); var bar=document.getElementById('couple-ta-top-banner'); if(bar) bar.style.display='none'; };
  window.taOpenApp=function(k){ taTake.running=false; taTake.app=k; taTake.acting={type:'manual_open_app',app:k}; window.coupleTaOpenRealApp(taTake.acting); taTake.snapshot=window.coupleTaBuildPhoneSnapshot(); renderTaTakeover(); window.coupleTaSpeak(taTake.acting, taTake.snapshot); };
  window.taBackHome=function(){ taTake.running=false; taTake.app='home'; renderTaTakeover(); };
  window.coupleTaToggleVoice=function(){ taTake.voice=!taTake.voice; renderTaTakeover(); };
  window.coupleTaSendUserLine=function(){ var i=document.getElementById('ta-user-line'); if(!i) return; var v=i.value.trim(); if(!v) return; i.value=''; addSpeech('user',v); renderTaTakeover(); window.coupleTaSpeak({type:'user_reply',text:v,app:taTake.app,currentContact:taTake.selectedContact}, window.coupleTaBuildPhoneSnapshot()); };
  window.coupleTaOpenChat=function(id){ taTake.running=false; taTake.app='wechat'; taTake.selectedContact=id; taTake.acting={type:'inspect_chat',app:'wechat',contactId:id}; window.coupleTaOpenRealApp(taTake.acting); taTake.snapshot=window.coupleTaBuildPhoneSnapshot(); renderTaTakeover(); window.coupleTaSpeak(taTake.acting, taTake.snapshot); };
  window.coupleTaSelectHidden=function(id){ taTake.selectedHidden=id; renderTaTakeover(); };

  function shell(inner){
    var c=partner(); var running=taTake.running?'\u63a5\u7ba1\u4e2d':'\u624b\u52a8\u67e5\u770b';
    return '<div style="height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#f7fffb 0%,#e8f7ef 100%);color:#10251c;">'+
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.78);border-bottom:1px solid rgba(71,119,92,.14);backdrop-filter:blur(14px);"><div onclick="closeTaTakeover()" style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(60,100,78,.18);cursor:pointer;font-size:19px;">\u2039</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;">'+h(displayName(c,partnerId()))+' \u6b63\u5728\u67e5\u6211\u7684\u5c0f\u624b\u673a</div><div style="font-size:10px;color:#5f806f;margin-top:2px;">'+running+' ? '+h(actionTitle(taTake.acting))+'</div></div><div onclick="coupleTaToggleVoice()" style="font-size:10px;color:#234d39;border:1px solid rgba(60,100,78,.18);border-radius:999px;padding:6px 9px;cursor:pointer;">'+(taTake.voice?'Voice \u8bed\u97f3':'Text \u6587\u5b57')+'</div></div>'+
      '<div style="flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;">'+inner+'</div>'+speechPanel()+'</div>';
  }
  function speechPanel(){
    var rows=taTake.speech.slice(-6).map(function(m){ var mine=m.who==='user'; var sys=m.who==='system'; return '<div style="display:flex;justify-content:'+(mine?'flex-end':'flex-start')+';margin:5px 0;"><div style="max-width:84%;padding:8px 10px;border-radius:14px;font-size:11px;line-height:1.45;background:'+(sys?'rgba(74,119,91,.09)':(mine?'#2d6b4d':'#fff'))+';color:'+(mine?'#fff':'#1d3529')+';border:1px solid rgba(71,119,92,.12);">'+h(m.text)+'</div></div>'; }).join('');
    return '<div style="border-top:1px solid rgba(71,119,92,.12);background:rgba(255,255,255,.82);padding:8px 10px;"><div style="max-height:130px;overflow:auto;">'+rows+'</div><div style="display:flex;gap:7px;margin-top:7px;"><input id="ta-user-line" onkeydown="if(event.key===\'Enter\')coupleTaSendUserLine()" placeholder="\u8ddf TA \u5b9e\u65f6\u8bf4\u8bdd" style="flex:1;border:1px solid rgba(71,119,92,.18);border-radius:999px;padding:9px 11px;font-size:12px;outline:none;background:#fff;"><div onclick="coupleTaSendUserLine()" style="border-radius:999px;background:#2d6b4d;color:#fff;padding:9px 13px;font-size:12px;font-weight:800;cursor:pointer;">\u53d1\u9001</div></div></div>';
  }
  function homeHTML(){
    var grid=appList.map(function(a){ return '<div onclick="taOpenApp(\''+a[0]+'\')" style="background:rgba(255,255,255,.84);border:1px solid rgba(71,119,92,.12);border-radius:14px;padding:13px 8px;min-height:58px;box-sizing:border-box;box-shadow:0 8px 18px rgba(38,83,58,.06);cursor:pointer;"><div style="font-size:12px;font-weight:850;color:#163e2b;">'+a[1]+'</div><div style="font-size:10px;color:#638675;margin-top:3px;">'+a[2]+'</div></div>'; }).join('');
    return shell('<div style="padding:14px;overflow:auto;"><div style="font-size:11px;color:#6d8d7e;margin-bottom:10px;">\u8fd9\u662f user \u7ad9\u5185\u5c0f\u624b\u673a\uff0cTA \u53ef\u67e5\u770b WeChat\u3001\u65e5\u8bb0\u3001\u5907\u5fd8\u3001\u94b1\u5305\u7b49\u4f60\u5728\u7f51\u7ad9\u5185\u4ea7\u751f\u7684\u6570\u636e\u3002</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+grid+'</div>'+restoreHTML()+'</div>');
  }
  function restoreHTML(){ var s=taTake.snapshot||window.coupleTaBuildPhoneSnapshot(); if(!s.hiddenContacts.length) return ''; return '<div style="margin-top:14px;background:#fff;border:1px solid rgba(71,119,92,.12);border-radius:14px;padding:12px;"><div style="font-size:12px;font-weight:850;margin-bottom:8px;">\u88ab TA \u5220\u6389\u7684\u8054\u7cfb\u4eba</div>'+s.hiddenContacts.map(function(x){return '<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-top:1px solid rgba(71,119,92,.08);"><span style="font-size:12px;">'+h(x.name)+'</span><span onclick="coupleTaRestoreContact(\''+x.id+'\')" style="font-size:11px;color:#2d6b4d;font-weight:850;cursor:pointer;">\u6062\u590d</span></div>';}).join('')+'</div>'; }
  function card(label,value,note){ return '<div style="background:#fff;border:1px solid rgba(71,119,92,.12);border-radius:14px;padding:11px;margin-bottom:8px;"><div style="font-size:10px;color:#6b8a78;font-weight:800;letter-spacing:0;text-transform:uppercase;">'+h(label)+'</div><div style="font-size:13px;font-weight:850;margin-top:5px;color:#173b2a;white-space:pre-wrap;">'+h(value)+'</div>'+(note?'<div style="font-size:11px;color:#6c7f75;margin-top:5px;line-height:1.45;white-space:pre-wrap;">'+h(note)+'</div>':'')+'</div>'; }
  function wechatHTML(s){
    var selected=taTake.selectedContact && contacts[taTake.selectedContact] ? taTake.selectedContact : (s.wechat[0]&&s.wechat[0].id);
    var list=s.wechat.map(function(x){return '<div onclick="coupleTaOpenChat(\''+x.id+'\')" style="display:flex;gap:9px;align-items:center;padding:9px;border-radius:13px;background:'+(x.id===selected?'rgba(45,107,77,.1)':'#fff')+';border:1px solid rgba(71,119,92,.11);margin-bottom:7px;cursor:pointer;"><div style="width:34px;height:34px;border-radius:11px;overflow:hidden;background:#e9f4ee;">'+avatarHTML(contacts[x.id])+'</div><div style="min-width:0;flex:1;"><div style="font-size:12px;font-weight:850;">'+h(x.name)+'</div><div style="font-size:10px;color:#789084;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+h(x.lastText||'\u6682\u65e0\u6d88\u606f')+'</div></div><div style="font-size:10px;color:#5f806f;">'+x.count+'</div></div>';}).join('');
    var target=s.wechat.filter(function(x){return x.id===selected;})[0];
    var msgs=target?target.messages.map(function(m){return '<div style="display:flex;justify-content:'+(m.mine?'flex-end':'flex-start')+';margin:6px 0;"><div style="max-width:82%;border-radius:14px;padding:8px 10px;font-size:11px;line-height:1.45;background:'+(m.mine?'#2d6b4d':'#fff')+';color:'+(m.mine?'#fff':'#183528')+';border:1px solid rgba(71,119,92,.12);">'+h(m.text)+'</div></div>';}).join(''):'';
    return '<div style="padding:10px;display:grid;grid-template-columns:42% 1fr;gap:8px;height:100%;box-sizing:border-box;"><div style="overflow:auto;">'+(list||card('WeChat','\u6682\u65e0\u8054\u7cfb\u4eba',''))+'</div><div style="overflow:auto;background:rgba(255,255,255,.56);border:1px solid rgba(71,119,92,.1);border-radius:16px;padding:9px;">'+(target?'<div style="font-size:12px;font-weight:850;margin-bottom:8px;">'+h(target.name)+'</div>'+msgs:card('Chat','\u6682\u65e0\u804a\u5929',''))+'</div></div>';
  }
  function contactsHTML(s){ return '<div style="padding:10px;overflow:auto;">'+s.contacts.map(function(x){return '<div style="display:flex;align-items:center;gap:10px;background:#fff;border:1px solid rgba(71,119,92,.12);border-radius:14px;padding:10px;margin-bottom:8px;"><div style="width:36px;height:36px;border-radius:12px;overflow:hidden;background:#e9f4ee;">'+avatarHTML(contacts[x.id])+'</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:850;">'+h(x.name)+'</div><div style="font-size:10px;color:#789084;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+h(x.persona||'\u672a\u586b\u5199\u4eba\u8bbe')+'</div></div>'+(x.id===partnerId()?'<div style="font-size:10px;color:#6b8a78;">TA</div>':'<div onclick="coupleTaHideContact(\''+x.id+'\');taOpenApp(\'contacts\')" style="font-size:11px;color:#b64747;font-weight:850;cursor:pointer;">\u5220\u9664</div>')+'</div>';}).join('')+restoreHTML()+'</div>'; }
  function listHTML(items, empty, mapper){ if(!items || !items.length) return card(empty,'\u6682\u65e0\u8bb0\u5f55',''); return items.map(mapper).join(''); }
  function rowsHTML(items, empty, mapper){ return listHTML(arr(items), empty, mapper); }
  function momentsHTML(s){ return '<div style="padding:10px;overflow:auto;">'+rowsHTML(s.moments,'Moments',function(x){return card('朋友圈', (x.authorId||'')+' · '+(x.likes||0)+'赞 / '+(x.comments||0)+'评', x.text||'');})+'</div>'; }
  function forumHTML(s){ var f=s.forum||{}; return '<div style="padding:10px;overflow:auto;">'+card('Forum 论坛', '筛选 '+(f.filter||'全部'), 'TA 会查看你在论坛里的发帖、评论和互动痕迹。')+rowsHTML(f.posts,'Forum',function(x){return card(x.title||'帖子', (x.author||'匿名')+' · '+(x.likes||0)+'赞 / '+(x.comments||0)+'评', x.text||'');})+'</div>'; }
  function musicHTML(s){ var m=s.music||{}; return '<div style="padding:10px;overflow:auto;">'+card('一起听', m.available?(m.playing?'正在听 ':'最近听 ')+(m.current||'未选择歌曲'):'暂无数据', '对象: '+(m.contactName||'未绑定')+' · 共听 '+(m.listeningDays||0)+' 天')+rowsHTML(m.songs,'Songs',function(x){return card(x.title||'歌曲', x.artist||'', '');})+'</div>'; }
  function novelHTML(s){ var n=s.novel||{}; return '<div style="padding:10px;overflow:auto;">'+card('小说共读', n.available?(n.title||'未命名小说'):'暂无数据', '对象: '+(n.contactName||'未绑定')+' · 页数 '+((n.pageIdx||0)+1)+'/'+(n.pages||0))+card('当前片段', n.excerpt||'暂无正文', '')+rowsHTML(n.chat,'Novel Chat',function(x){return card(x.mine?'user':'联系人', x.text||'', '');})+'</div>'; }
  function goHTML(s){ var g=s.go||{}; return '<div style="padding:10px;overflow:auto;">'+card('GO 直播', g.available?('连麦 '+(g.linkMicName||'无人')+' · 商品 '+arr(g.products).length+' 个'):'暂无数据', arr(g.events).slice(-4).join(' / '))+rowsHTML(g.products,'Products',function(x){return card(x.name||'商品', x.price||'', x.desc||'');})+rowsHTML(g.orders,'Orders',function(x){return card('订单', JSON.stringify(x), '');})+'</div>'; }
  function nilflowHTML(s){ var n=s.nilflow||{}; return '<div style="padding:10px;overflow:auto;">'+card('匿流', n.available?((n.profile&&n.profile.id)||'匿名账号'):'暂无数据', '好友 '+arr(n.friends).length+' · 帖子 '+arr(n.posts).length)+rowsHTML(n.posts,'Nilflow Posts',function(x){return card(x.author||x.authorId||'匿名', x.text||'', (x.likes||0)+'赞 / '+(x.comments||0)+'评');})+rowsHTML(n.chats,'Nilflow Chats',function(x){return card(x.id, x.last||'暂无消息', x.count+' 条');})+'</div>'; }
  function dreamHTML(s){ var d=s.dream||{}; return '<div style="padding:10px;overflow:auto;">'+card('雾织梦核', d.available?(d.worldName||'未命名世界'):'暂无数据', '阶段 '+(d.phase||'未开始')+' · 评级 '+(d.rank||'未结算'))+card('主线任务', d.objective||'暂无', '')+rowsHTML(d.messages,'Dream Messages',function(x){return card(x.role||'旁白', x.text||'', '');})+rowsHTML(d.choices,'Choices',function(x){return card('卡牌选择', x, '');})+'</div>'; }
  function genericStateHTML(title,obj){ return '<div style="padding:10px;overflow:auto;">'+card(title, plain(JSON.stringify(obj||{})).slice(0,900)||'暂无记录', '')+'</div>'; }
  function settingsHTML(s){ var cfg=s.settings||{}; return '<div style="padding:10px;overflow:auto;">'+card('API 设置', cfg.apiConfigured?'已配置':'未配置', 'Provider: '+(cfg.provider||'')+' · Model: '+(cfg.model||''))+card('语音 / 生图', 'TTS '+(cfg.tts?'已配置':'未配置')+' · Image '+(cfg.image?'已配置':'未配置'), '查岗实时语音会优先使用设置里的全局语音 API。')+'</div>'; }
  function appHTML(k,s){
    if(k==='wechat') return wechatHTML(s); if(k==='contacts') return contactsHTML(s);
    if(k==='moments') return momentsHTML(s); if(k==='forum') return forumHTML(s);
    if(k==='music') return musicHTML(s); if(k==='novel') return novelHTML(s); if(k==='go') return goHTML(s);
    if(k==='nilflow') return nilflowHTML(s); if(k==='dream') return dreamHTML(s);
    if(k==='game') return genericStateHTML('游戏', s.game); if(k==='suoha') return genericStateHTML('梭哈', s.suoha); if(k==='settings') return settingsHTML(s);
    if(k==='diary') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.diary,'Diary',function(x){return card('日记', typeof x==='string'?x:(x.title||x.date||'记录'), typeof x==='string'?'':(x.text||x.body||''));})+'</div>';
    if(k==='notes') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.notes,'Notes',function(x){return card('备忘', typeof x==='string'?x:(x.title||'备忘'), typeof x==='string'?'':(x.text||x.body||''));})+'</div>';
    if(k==='wallet') return '<div style="padding:10px;overflow:auto;">'+card('余额', s.wallet.balance===null?'未同步':'¥ '+Number(s.wallet.balance).toFixed(2), '')+listHTML(s.wallet.tx,'Wallet',function(x){return card(x.title||'流水', (typeof x.amount==='number'?(x.amount>0?'+':'')+x.amount:'')+' '+(x.d||''), '');})+'</div>';
    if(k==='shop') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.shop,'Shop',function(x){return '<div style="display:flex;gap:10px;background:#fff;border:1px solid rgba(71,119,92,.12);border-radius:14px;padding:10px;margin-bottom:8px;">'+(x.img?'<img src="'+h(x.img)+'" style="width:48px;height:48px;border-radius:10px;object-fit:cover;">':'<div style="width:48px;height:48px;border-radius:10px;background:#edf7f1;"></div>')+'<div><div style="font-size:12px;font-weight:850;">'+h(x.name||'商品')+'</div><div style="font-size:11px;color:#5f806f;margin-top:4px;">'+h(x.price||'')+'</div></div></div>';})+'</div>';
    if(k==='browse') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.browse,'Browser',function(x){return card('浏览', x.text||x.title||String(x), x.date||'');})+'</div>';
    return '<div style="padding:10px;overflow:auto;">'+card('Couple','检查完成', window.coupleTaReport?window.coupleTaReport():'TA 已查看完站内小手机。')+restoreHTML()+'</div>';
  }
  function renderTaTakeover(){ var ov=document.getElementById('screen-tatake'); if(!ov) return; var s=taTake.snapshot||window.coupleTaBuildPhoneSnapshot(); if(taTake.app==='home') ov.innerHTML=homeHTML(); else ov.innerHTML=shell(appHTML(taTake.app,s)); var panel=document.querySelector('#screen-tatake [id="ta-user-line"]'); if(panel) panel.focus&&panel.focus(); }

  window.coupleTaClearCart=function(){
    var d=data(); var n=(d.shop||[]).length; if(!n) return false; d.shop=[]; persist();
    window.coupleTaSpeak({type:'clear_cart',app:'shop',count:n}, window.coupleTaBuildPhoneSnapshot()); return true;
  };
  window.coupleTaRandomBuy=function(){
    var d=data(); if(!d.shop||!d.shop.length) return false; var idx=Math.floor(Math.random()*d.shop.length); var item=d.shop.splice(idx,1)[0]; persist();
    var priceNum=parseInt(String(item.price).replace(/[^0-9]/g,'')||'0',10); if(priceNum && typeof addWalletTx==='function'){ try{ addWalletTx('TA '+(item.name||'shop'), -priceNum); }catch(e){} }
    var c=partner(); if(c&&Array.isArray(c.seed)){ var id=(typeof cardIdSeq!=='undefined')?cardIdSeq++:Date.now(); c.seed.push({kind:'card',id:id,cardType:'gift',mine:false,name:item.name,price:item.price,note:'TA \u5728\u67e5\u5c97\u65f6\u5e2e\u4f60\u6311\u4e86\u8fd9\u4ef6',status:'done',from:partnerId(),ts:now()}); if(item.img) c.seed.push({kind:'photo',mine:false,text:item.img,from:partnerId(),ts:now()}); if(typeof saveChatThread==='function') saveChatThread(partnerId()); if(typeof renderThread==='function'&&currentContact===partnerId()) renderThread(); }
    window.coupleTaSpeak({type:'buy_item',app:'shop',item:item}, window.coupleTaBuildPhoneSnapshot()); return item;
  };
  window.coupleTaAutoInit=function(){
    function tick(){ if(!partnerId()) return; var last=coupleState.lastTaAct||0; var n=Date.now(); if(n-last>=3*3600*1000){ coupleState.lastTaAct=n; persist(); if(Math.random()<0.5) window.coupleTaRandomBuy(); else window.coupleTaClearCart(); } }
    try{ tick(); }catch(e){} setInterval(tick, 10*60*1000);
  };
})();
