/* Couple Space: AI partner takeover of the user's in-site phone */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;

  var taTake = {open:false, app:'home', running:false, step:0, queue:[], speech:[], selectedContact:null, selectedHidden:null, voice:true, report:null, snapshot:null, acting:null};
  var taTimers = [];
  var appList = [
    ['wechat','WeChat','\u5fae\u4fe1'], ['contacts','Contacts','\u8054\u7cfb\u4eba'], ['diary','Diary','\u65e5\u8bb0'], ['notes','Notes','\u5907\u5fd8'],
    ['wallet','Wallet','\u94b1\u5305'], ['shop','Shop','\u8d2d\u7269'], ['browse','Browser','\u6d4f\u89c8'], ['couple','Couple','\u60c5\u4fa3']
  ];

  function h(v){ if(typeof esc==='function') return esc(String(v||'')); return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function now(){ return (typeof nowStamp==='function') ? nowStamp() : Date.now(); }
  function persist(){ if(typeof saveCoupleState==='function') saveCoupleState(); if(typeof saveState==='function') saveState(); }
  function partnerId(){ return coupleState.partner || ''; }
  function partner(){ return contacts && contacts[partnerId()] ? contacts[partnerId()] : null; }
  function displayName(c,id){ return (c && (c.displayName || c.name)) || id || 'TA'; }
  function appName(k){ var a=appList.filter(function(x){ return x[0]===k; })[0]; return a ? a[1]+' '+a[2] : k; }
  function isVisibleContact(id){ var c=contacts[id]; return !!(c && id!=='me' && !c.isGroup && !c.blocked && !c.taDeletedByPartner); }
  function shortText(m){ if(!m) return ''; if(m.kind==='photo') return '['+'\u56fe\u7247'+']'; if(m.kind==='voice') return '['+'\u8bed\u97f3'+'] '+(m.text||''); if(m.kind==='card') return '['+'\u5361\u7247'+'] '+(m.name||m.text||m.note||''); if(m.kind==='pat') return m.text||''; return m.text||''; }
  function limit(s,n){ s=String(s||''); return s.length>n ? s.slice(0,n)+'...' : s; }
  function avatarHTML(c){ if(c && typeof contactAvatar==='function') return contactAvatar(c); return '<span style="font-size:12px;font-weight:800;color:#426d58;">TA</span>'; }
  function data(){ return (typeof coupleData==='function') ? coupleData() : {}; }
  function todayKey(){ if(typeof ymdKey==='function') return ymdKey(new Date()); var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  window.coupleTaBuildPhoneSnapshot=function(){
    var d=data();
    var ids=Object.keys(contacts||{}).filter(function(id){ return isVisibleContact(id); });
    var hidden=Object.keys(contacts||{}).filter(function(id){ var c=contacts[id]; return c && c.taDeletedByPartner; });
    var wechat=ids.map(function(id){ var c=contacts[id]; var seed=Array.isArray(c.seed)?c.seed:[]; var last=seed.length?seed[seed.length-1]:null; return {id:id,name:displayName(c,id),persona:c.persona||c.tone||'',memory:c.memory&&c.memory.summary?c.memory.summary:'',count:seed.length,lastText:shortText(last),messages:seed.slice(-12).map(function(m){ return {mine:!!m.mine,from:m.from||'',kind:m.kind||'text',text:shortText(m),ts:m.ts||0}; })}; });
    var browse=[];
    if(Array.isArray(d.browseUser)) browse=browse.concat(d.browseUser);
    try{ if(typeof genDailyBrowse==='function') browse=browse.concat(genDailyBrowse(todayKey())); }catch(e){}
    var snapshot={
      partner:partnerId(), partnerName:displayName(partner(), partnerId()), userName:(typeof userName!=='undefined'?userName:'User'),
      contacts:ids.map(function(id){ var c=contacts[id]; return {id:id,name:displayName(c,id),persona:c.persona||c.tone||'',messageCount:Array.isArray(c.seed)?c.seed.length:0}; }),
      hiddenContacts:hidden.map(function(id){ var c=contacts[id]; return {id:id,name:displayName(c,id),deletedAt:c.taDeletedAt||0,by:c.taDeletedBy||''}; }),
      wechat:wechat,
      diary:Array.isArray(d.diary)?d.diary.slice(-20):[],
      notes:Array.isArray(d.notes)?d.notes.slice(-20):[],
      wallet:{balance:(typeof walletBalance==='number'?walletBalance:null), tx:Array.isArray(walletTx)?walletTx.slice(0,20):[]},
      shop:Array.isArray(d.shop)?d.shop.slice(0,20):[],
      browse:browse.slice(-30),
      couple:{checkin:d.checkin||{}, location:d.location||null, foodOrders:Array.isArray(d.foodOrders)?d.foodOrders.slice(-10):[]},
      moments:(typeof moments!=='undefined'&&Array.isArray(moments))?moments.slice(0,12).map(function(m){return {authorId:m.authorId,text:m.text,ts:m.ts,likes:m.likes&&m.likes.length||0,comments:m.comments&&m.comments.length||0};}):[]
    };
    return snapshot;
  };

  function snapshotBrief(s){
    var hot=s.wechat.slice().sort(function(a,b){return b.count-a.count;}).slice(0,4).map(function(c){return c.name+': '+c.count+'\u6761, \u6700\u8fd1 '+limit(c.lastText,36);}).join('\n');
    var notes=s.notes.map(function(x){return typeof x==='string'?x:(x.text||x.title||'');}).filter(Boolean).slice(-4).join(' / ');
    var diary=s.diary.map(function(x){return typeof x==='string'?x:(x.text||x.title||'');}).filter(Boolean).slice(-3).join(' / ');
    var shop=s.shop.map(function(x){return (x.name||'')+' '+(x.price||'');}).filter(Boolean).slice(0,5).join(' / ');
    var browse=s.browse.map(function(x){return x.text||x.title||String(x);}).filter(Boolean).slice(0,8).join(' / ');
    return ['\u7528\u6237: '+s.userName,'TA: '+s.partnerName,'WeChat\n'+(hot||'\u65e0\u53ef\u89c1\u8054\u7cfb\u4eba'),'\u65e5\u8bb0: '+(diary||'\u65e0'),'\u5907\u5fd8: '+(notes||'\u65e0'),'\u94b1\u5305: '+(s.wallet.balance===null?'\u672a\u540c\u6b65':s.wallet.balance),'\u8d2d\u7269: '+(shop||'\u65e0'),'\u6d4f\u89c8: '+(browse||'\u65e0')].join('\n');
  }

  window.coupleTaActionQueue=function(snapshot){
    var hot=snapshot.wechat.slice().sort(function(a,b){return b.count-a.count;});
    var rival=hot.filter(function(c){return c.id!==snapshot.partner;})[0] || null;
    var q=[{type:'open_app',app:'wechat'},{type:'inspect_chat',app:'wechat',contactId:hot[0]&&hot[0].id},{type:'open_app',app:'contacts'}];
    if(rival) q.push({type:'hide_contact',app:'contacts',contactId:rival.id});
    q=q.concat([{type:'open_app',app:'diary'},{type:'open_app',app:'notes'},{type:'open_app',app:'wallet'},{type:'open_app',app:'shop'},{type:'open_app',app:'browse'},{type:'finish_report',app:'couple'}]);
    return q;
  };

  function actionTitle(action){
    if(!action) return '\u6b63\u5728\u67e5\u770b';
    if(action.type==='inspect_chat') return '\u6253\u5f00\u804a\u5929';
    if(action.type==='hide_contact') return '\u5220\u9664\u8054\u7cfb\u4eba';
    if(action.type==='finish_report') return '\u751f\u6210\u5224\u65ad';
    return '\u6253\u5f00 '+appName(action.app);
  }

  window.coupleTaCallAI=function(action, snapshot, callback){
    var pid=partnerId();
    var persona=(typeof getPersonaPrompt==='function'&&pid)?getPersonaPrompt(pid):'';
    var world=(typeof getWorldBookPrompt==='function'&&pid)?getWorldBookPrompt(pid):'';
    var time=(typeof nowContext==='function')?nowContext():'';
    var system=persona+'\n'+world+'\n'+time+'\n\n\u4f60\u73b0\u5728\u662f\u604b\u4eba TA\uff0c\u6b63\u5728\u67e5\u770b user \u5728 Fated OS \u5c0f\u624b\u673a\u91cc\u7684\u7ad9\u5185\u6570\u636e\u3002\u4f60\u53ea\u80fd\u6839\u636e\u8fd9\u4e2a\u7f51\u7ad9\u5185\u6570\u636e\u8bf4\u8bdd\uff0c\u4e0d\u8981\u58f0\u79f0\u8bbf\u95ee\u771f\u5b9e\u624b\u673a\u3001\u771f\u5b9e WeChat \u6216\u7cfb\u7edf\u9690\u79c1\u3002\u4fdd\u6301\u4f60\u7684\u4eba\u8bbe\u3001\u4f60\u4eec\u7684\u8bb0\u5fc6\u548c\u5173\u7cfb\u8bed\u6c14\u3002\u53ea\u8f93\u51fa\u4f60\u6b64\u523b\u5bf9 user \u8bf4\u7684\u4e2d\u6587\uff0c1-2\u53e5\uff0c\u4e0d\u8981\u540d\u5b57\u524d\u7f00\uff0c\u4e0d\u8981 emoji\uff0c\u4e0d\u8981\u89e3\u91ca\u7cfb\u7edf\u3002';
    var user='\u5f53\u524d\u52a8\u4f5c: '+JSON.stringify(action||{})+'\n\n\u7ad9\u5185\u5c0f\u624b\u673a\u5feb\u7167:\n'+snapshotBrief(snapshot||window.coupleTaBuildPhoneSnapshot());
    if(typeof callRealAI==='function' && pid){
      callRealAI([{role:'user',content:user}], system, pid, function(reply){ callback((reply||'').trim()); });
    }else{
      callback('\u6211\u5148\u770b\u4f60\u5728\u8fd9\u4e2a\u5c0f\u624b\u673a\u91cc\u7559\u4e0b\u7684\u8bb0\u5f55\uff0c\u7b49 API \u914d\u597d\u540e\u6211\u4f1a\u6309\u6211\u7684\u4eba\u8bbe\u66f4\u7ec6\u5730\u8bf4\u7ed9\u4f60\u542c\u3002');
    }
  };

  function addSpeech(who,text){
    if(!text) return;
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
      addSpeech('ta', reply);
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

  function runNext(){
    if(!taTake.open || !taTake.running) return;
    if(taTake.step>=taTake.queue.length){ taTake.running=false; taTake.app='couple'; taTake.acting={type:'finish_report',app:'couple'}; renderTaTakeover(); return; }
    var action=taTake.queue[taTake.step++]; taTake.acting=action; if(action.app) taTake.app=action.app; if(action.contactId) taTake.selectedContact=action.contactId;
    if(action.type==='hide_contact') window.coupleTaHideContact(action.contactId);
    taTake.snapshot=window.coupleTaBuildPhoneSnapshot(); renderTaTakeover(); window.coupleTaSpeak(action, taTake.snapshot, function(){ taTimers.push(setTimeout(runNext, 1200)); });
  }

  window.coupleTaTakeover=function(){
    if(!partnerId() || !partner()){ if(typeof showToast==='function') showToast('\u8bf7\u5148\u7ed1\u5b9a\u4e00\u4e2a WeChat \u8054\u7cfb\u4eba',1500); return; }
    var ov=document.getElementById('screen-tatake');
    if(!ov){ ov=document.createElement('div'); ov.id='screen-tatake'; ov.className='topview'; var root=document.getElementById('screen')||document.body; root.appendChild(ov); }
    taTimers.forEach(function(t){clearTimeout(t);}); taTimers=[];
    taTake={open:true, app:'home', running:true, step:0, queue:[], speech:[], selectedContact:null, selectedHidden:null, voice:true, report:null, snapshot:window.coupleTaBuildPhoneSnapshot(), acting:null};
    taTake.queue=window.coupleTaActionQueue(taTake.snapshot);
    ov.classList.add('active'); ov.style.background='#f6fbf8'; ov.style.color='#10251c'; ov.style.zIndex='90';
    addSpeech('system','\u5df2\u6388\u6743 TA \u67e5\u770b\u4f60\u5728 Fated OS \u91cc\u7684\u5c0f\u624b\u673a\u6570\u636e\u3002');
    renderTaTakeover(); taTimers.push(setTimeout(runNext, 420));
  };
  window.closeTaTakeover=function(){ taTimers.forEach(function(t){clearTimeout(t);}); taTimers=[]; taTake.open=false; taTake.running=false; var ov=document.getElementById('screen-tatake'); if(ov) ov.classList.remove('active'); };
  window.taOpenApp=function(k){ taTake.running=false; taTake.app=k; taTake.snapshot=window.coupleTaBuildPhoneSnapshot(); renderTaTakeover(); };
  window.taBackHome=function(){ taTake.running=false; taTake.app='home'; renderTaTakeover(); };
  window.coupleTaToggleVoice=function(){ taTake.voice=!taTake.voice; renderTaTakeover(); };
  window.coupleTaSendUserLine=function(){ var i=document.getElementById('ta-user-line'); if(!i) return; var v=i.value.trim(); if(!v) return; i.value=''; addSpeech('user',v); renderTaTakeover(); window.coupleTaSpeak({type:'user_reply',text:v,app:taTake.app,currentContact:taTake.selectedContact}, window.coupleTaBuildPhoneSnapshot()); };
  window.coupleTaOpenChat=function(id){ taTake.running=false; taTake.app='wechat'; taTake.selectedContact=id; taTake.acting={type:'inspect_chat',app:'wechat',contactId:id}; renderTaTakeover(); };
  window.coupleTaSelectHidden=function(id){ taTake.selectedHidden=id; renderTaTakeover(); };

  function shell(inner){
    var c=partner(); var running=taTake.running?'\u63a5\u7ba1\u4e2d':'\u624b\u52a8\u67e5\u770b';
    return '<div style="height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#f7fffb 0%,#e8f7ef 100%);color:#10251c;">'+
      '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,.78);border-bottom:1px solid rgba(71,119,92,.14);backdrop-filter:blur(14px);"><div onclick="closeTaTakeover()" style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(60,100,78,.18);cursor:pointer;font-size:19px;">\u2039</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;">'+h(displayName(c,partnerId()))+' \u6b63\u5728\u67e5\u6211\u7684\u5c0f\u624b\u673a</div><div style="font-size:10px;color:#5f806f;margin-top:2px;">'+running+' ? '+h(actionTitle(taTake.acting))+'</div></div><div onclick="coupleTaToggleVoice()" style="font-size:10px;color:#234d39;border:1px solid rgba(60,100,78,.18);border-radius:999px;padding:6px 9px;cursor:pointer;">'+(taTake.voice?'Voice \u8bed\u97f3':'Text \u6587\u5b57')+'</div></div>'+
      '<div style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;">'+inner+'</div>'+speechPanel()+'</div>';
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
  function appHTML(k,s){
    if(k==='wechat') return wechatHTML(s); if(k==='contacts') return contactsHTML(s);
    if(k==='diary') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.diary,'Diary',function(x){return card('\u65e5\u8bb0', typeof x==='string'?x:(x.title||x.date||'\u8bb0\u5f55'), typeof x==='string'?'':(x.text||x.body||''));})+'</div>';
    if(k==='notes') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.notes,'Notes',function(x){return card('\u5907\u5fd8', typeof x==='string'?x:(x.title||'\u5907\u5fd8'), typeof x==='string'?'':(x.text||x.body||''));})+'</div>';
    if(k==='wallet') return '<div style="padding:10px;overflow:auto;">'+card('\u4f59\u989d', s.wallet.balance===null?'\u672a\u540c\u6b65':'? '+Number(s.wallet.balance).toFixed(2),'')+listHTML(s.wallet.tx,'Wallet',function(x){return card(x.title||'\u6d41\u6c34', (typeof x.amount==='number'?(x.amount>0?'+':'')+x.amount:'')+' '+(x.d||''),'');})+'</div>';
    if(k==='shop') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.shop,'Shop',function(x){return '<div style="display:flex;gap:10px;background:#fff;border:1px solid rgba(71,119,92,.12);border-radius:14px;padding:10px;margin-bottom:8px;">'+(x.img?'<img src="'+h(x.img)+'" style="width:48px;height:48px;border-radius:10px;object-fit:cover;">':'<div style="width:48px;height:48px;border-radius:10px;background:#edf7f1;"></div>')+'<div><div style="font-size:12px;font-weight:850;">'+h(x.name||'\u5546\u54c1')+'</div><div style="font-size:11px;color:#5f806f;margin-top:4px;">'+h(x.price||'')+'</div></div></div>';})+'</div>';
    if(k==='browse') return '<div style="padding:10px;overflow:auto;">'+listHTML(s.browse,'Browser',function(x){return card('\u6d4f\u89c8', x.text||x.title||String(x), x.date||'');})+'</div>';
    return '<div style="padding:10px;overflow:auto;">'+card('Couple','\u68c0\u67e5\u5b8c\u6210', window.coupleTaReport?window.coupleTaReport():'')+'</div>';
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
