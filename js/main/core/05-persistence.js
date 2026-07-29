/* ============ PERSISTENCE ============ */
var bubbleMineColor = '#1a1a1a', bubbleTheirsColor = '#ffffff';
var widgetCustom = {}; var removedPlugins = [];
var lastPersistenceWarningAt = 0;
var persistenceBooting = true;
var savedPluginTypes = null;

function isPersistenceBooting(){ return !!persistenceBooting; }
function markPersistenceReady(){ persistenceBooting = false; }
function buildActivePluginsSnapshot(){
  var list = [], seen = {};
  if(typeof document==='undefined' || !document.querySelectorAll) return list;
  document.querySelectorAll('[data-wc-type]').forEach(function(n){
    var t = n.getAttribute('data-wc-type');
    if(t && !seen[t]){ seen[t]=true; list.push(t); }
  });
  return list;
}
function getSavedPluginTypes(){ return Array.isArray(savedPluginTypes) ? savedPluginTypes.slice() : null; }
function syncPersonaSeqFromContacts(){
  var max = 0;
  Object.keys(contacts||{}).forEach(function(id){
    var m = /^[pg](\d+)$/.exec(id);
    if(m) max = Math.max(max, parseInt(m[1], 10));
  });
  if(max >= personaSeq) personaSeq = max + 1;
}

function clonePlain(value, fallback){
  try{ return JSON.parse(JSON.stringify(value)); }catch(e){ return fallback; }
}
function lightFontConfig(){
  return {
    family: fontConfig && fontConfig.family ? fontConfig.family : '',
    color: fontConfig && fontConfig.color ? fontConfig.color : '#1a1a1a',
    customName: fontConfig && fontConfig.customName ? fontConfig.customName : ''
  };
}
function buildContactsSnapshot(){
  return Object.keys(contacts).filter(function(k){ return k[0]==='p'||k[0]==='g'||k==='tester1'; }).map(function(k){
    var c=contacts[k];
    return {
      id:k,
      name:c.name,
      displayName:c.displayName||'',
      tone:c.tone||'',
      persona:c.persona||'',
      userPrompt:c.userPrompt||'',
      jealous:!!c.jealous,
      isGroup:!!c.isGroup,
      members:c.members||null,
      avatarColor:c.avatarColor||null,
      blocked:!!c.blocked,
      worldBooks:c.worldBooks||[],
      memory:c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0},
      groupUserPrompt:c.groupUserPrompt||'',
      proactive:c.proactive!==false,
      bio:c.bio||'',
      wxid:c.wxid||'',
      relations:c.relations||[]
    };
  });
}
function buildLightState(){
  return {
    userName:userName,
    userWxid:userWxid,
    userBio:userBio,
    userPrefs:userPrefs,
    walletBalance:walletBalance,
    walletTx:walletTx,
    apiConfig:apiConfig,
    worldBooks:worldBooks,
    moments:moments.map(function(m){
      return {id:m.id, authorId:m.authorId, text:m.text, vis:m.vis, hidden:m.hidden, ts:m.ts, place:m.place||'', likes:m.likes, liked:m.liked, comments:m.comments};
    }),
    contactsExtra:buildContactsSnapshot(),
    viewAs:viewAs,
    bubbleMineColor:bubbleMineColor,
    bubbleTheirsColor:bubbleTheirsColor,
    fontPrefs:lightFontConfig(),
    widgetBgMode:widgetBgMode,
    removedPlugins:removedPlugins,
    activePlugins:buildActivePluginsSnapshot(),
    personaSeq:personaSeq,
    suoha: typeof suohaState!=='undefined' ? suohaState : null,
    momentsLastGenDate:momentsLastGenDate||'',
    coupleState: typeof coupleState!=='undefined' ? coupleState : null,
    screenTime: typeof screenTimeData!=='undefined' ? screenTimeData : null,
    go: typeof goState!=='undefined' && goState ? goState : null
  };
}
function buildProfileAssets(){
  return {userAvatar:userAvatar||null, userCover:userCover||'', chatBg:chatBg||null};
}
function buildMomentsAssets(){
  return {
    momentsBg:momentsBg||null,
    images:moments.map(function(m){ return {id:m.id, img:m.img||null}; }).filter(function(m){ return !!m.img; })
  };
}
function buildContactAssets(){
  return Object.keys(contacts).filter(function(k){ return k[0]==='p'||k[0]==='g'||k==='tester1'; }).map(function(k){
    var c=contacts[k];
    return {id:k, avatar:c.avatar||null, cover:c.cover||''};
  });
}
function buildFontAssets(){
  return {customDataUrl:fontConfig && fontConfig.customDataUrl ? fontConfig.customDataUrl : ''};
}
function warnPersistenceSave(e){
  try{ console.warn('[Fated persistence] localStorage save failed', e); }catch(_e){}
  var now = Date.now();
  if(now-lastPersistenceWarningAt>15000){
    lastPersistenceWarningAt = now;
    try{ if(typeof showToast==='function') showToast('\\u672c\\u5730\\u7a7a\\u95f4\\u4e0d\\u8db3\\uff0c\\u5df2\\u8f6c\\u5b58\\u5230 IndexedDB', 2200, 'warn'); }catch(_e){}
  }
}
function saveState(){
  if(isPersistenceBooting()) return false;
  var lightState = buildLightState();
  var savedLocal = true;
  try{
    localStorage.setItem('fated_state', JSON.stringify(lightState));
  }catch(e){
    savedLocal = false;
    warnPersistenceSave(e);
  }
  fatedDBSaveKV('fated_state_core_backup', lightState);
  fatedDBSaveKV('profileAssets', buildProfileAssets());
  fatedDBSaveKV('momentsAssets', buildMomentsAssets());
  fatedDBSaveKV('contactAssets', buildContactAssets());
  fatedDBSaveKV('fontConfigAssets', buildFontAssets());
  fatedDBSaveKV('widgetCustom', widgetCustom);
  fatedDBSaveKV('appIconImgs', appIcons.map(function(a){ return {id:a.id, img:a.img}; }));
  fatedDBSaveKV('lockWp', lockWp);
  fatedDBSaveKV('homeWp', homeWp);
  fatedDBSaveAllChats();
  fatedDBSaveStickers();
  return savedLocal;
}
function mergeApiConfig(saved){
  if(!saved) return;
  var dflt=clonePlain(apiConfig, {});
  var hasSavedProfiles = Array.isArray(saved.profiles) && saved.profiles.length>0;
  for(var k in saved){ apiConfig[k]=saved[k]; }
  apiConfig.models = apiConfig.models || {};
  if(saved.models){
    for(var mk in dflt.models){
      if(!apiConfig.models[mk]) apiConfig.models[mk]=dflt.models[mk];
      else for(var fk in dflt.models[mk]){ if(!(fk in apiConfig.models[mk])) apiConfig.models[mk][fk]=dflt.models[mk][fk]; }
    }
  }
  if(!hasSavedProfiles && typeof createApiProfile==='function'){
    var legacy = apiConfig.models && apiConfig.models[apiConfig.activeModel] ? apiConfig.models[apiConfig.activeModel] : apiConfig.models.custom;
    legacy = legacy || {};
    var fmt = legacy.apiFormat || (apiConfig.activeModel==='claude'?'claude':apiConfig.activeModel==='gemini'?'gemini':'openai');
    apiConfig.profiles = [createApiProfile('profile-'+Date.now(), legacy.name || '?? API ??', legacy.endpoint || '', legacy.key || '', legacy.model || '', fmt, legacy.temperature, legacy.stream)];
    apiConfig.activeProfileId = apiConfig.profiles[0].id;
  }
  if(typeof ensureApiProfiles==='function') ensureApiProfiles();
}
function applyContactsSnapshot(list){
  if(!Array.isArray(list)) return;
  list.forEach(function(c){
    var id=c.id;
    if(!id) return;
    var rest={};
    Object.keys(c).forEach(function(k){ if(k!=='id' && k!=='avatar' && k!=='cover') rest[k]=c[k]; });
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
  syncPersonaSeqFromContacts();
}
function applyFontSnapshot(saved){
  if(!saved || typeof saved!=='object') return;
  fontConfig=Object.assign(fontConfig||{}, saved);
  if(fontConfig.customDataUrl){
    try{ var ff=new FontFace('FatedCustomFont','url('+fontConfig.customDataUrl+')'); ff.load().then(function(l){ document.fonts.add(l); }); }catch(e){}
  }
  applyFontConfig();
}
function applyStateSnapshot(s){
  if(!s || typeof s!=='object') return false;
  if(s.userName) userName=s.userName;
  if(s.userWxid) userWxid=s.userWxid;
  if(typeof s.userBio==='string') userBio=s.userBio;
  if(typeof s.userPrefs==='string') userPrefs=s.userPrefs;
  if(typeof s.walletBalance==='number') walletBalance=s.walletBalance;
  if(Array.isArray(s.walletTx)) walletTx=s.walletTx;
  if(Array.isArray(s.moments) && s.moments.length) moments=s.moments;
  if(s.viewAs) viewAs=s.viewAs;
  if(typeof s.personaSeq==='number' && isFinite(s.personaSeq)) personaSeq=Math.max(1, Math.floor(s.personaSeq));
  if(Array.isArray(s.activePlugins)) savedPluginTypes=s.activePlugins.filter(function(t){ return typeof t==='string' && t; });
  applyContactsSnapshot(s.contactsExtra);
  if(s.worldBooks && typeof s.worldBooks==='object'){
    Object.keys(s.worldBooks).forEach(function(k){ worldBooks[k]=s.worldBooks[k]; });
  }
  if(typeof s.bubbleMineColor==='string') bubbleMineColor=s.bubbleMineColor;
  if(typeof s.bubbleTheirsColor==='string') bubbleTheirsColor=s.bubbleTheirsColor;
  if(Array.isArray(s.removedPlugins)) removedPlugins=s.removedPlugins;
  if(typeof s.widgetBgMode==='string') widgetBgMode=s.widgetBgMode;
  if(s.suoha && typeof s.suoha==='object'){ suohaState=Object.assign(suohaDefault(), s.suoha); }
  mergeApiConfig(s.apiConfig);
  applyFontSnapshot(s.fontPrefs || s.fontConfig);
  if(typeof s.momentsLastGenDate==='string') momentsLastGenDate=s.momentsLastGenDate;
  if(s.coupleState && typeof s.coupleState==='object') coupleState=Object.assign(coupleState, s.coupleState);
  if(s.screenTime && typeof s.screenTime==='object') screenTimeData=Object.assign(screenTimeData, s.screenTime);
  if(s.go && typeof s.go==='object') goState=Object.assign(goDefault(), s.go);

  if(s.userCover!==undefined) userCover=s.userCover;
  if(s.userAvatar!==undefined) userAvatar=s.userAvatar;
  if(s.chatBg) chatBg=s.chatBg;
  if(s.momentsBg) momentsBg=s.momentsBg;
  if(Array.isArray(s.moments)){
    s.moments.forEach(function(m){
      if(!m || !m.img) return;
      var target=moments.find(function(x){ return String(x.id)===String(m.id); });
      if(target) target.img=m.img;
    });
  }
  if(Array.isArray(s.contactsExtra)){
    s.contactsExtra.forEach(function(c){
      if(!c || !c.id || !contacts[c.id]) return;
      if(c.avatar!==undefined) contacts[c.id].avatar=c.avatar;
      if(c.cover!==undefined) contacts[c.id].cover=c.cover;
    });
  }
  if(s.widgetCustom && typeof s.widgetCustom==='object') widgetCustom=s.widgetCustom;
  if(s.lockWp && typeof s.lockWp==='object') lockWp=s.lockWp;
  if(s.homeWp && typeof s.homeWp==='object') homeWp=s.homeWp;
  if(Array.isArray(s.appIconImgs)) applyAppIconAssets(s.appIconImgs);
  syncPersonaSeqFromContacts();
  return true;
}
function applyAppIconAssets(icons){
  if(!Array.isArray(icons)) return;
  icons.forEach(function(o){ var a=appIcons.find(function(x){return x.id===o.id;}); if(a) a.img=o.img; });
  renderDesktopIcons(); renderIconGrid();
}
function applyProfileAssets(a){
  if(!a || typeof a!=='object') return false;
  if(a.userAvatar!==undefined) userAvatar=a.userAvatar;
  if(a.userCover!==undefined) userCover=a.userCover;
  if(a.chatBg!==undefined) chatBg=a.chatBg;
  return true;
}
function applyMomentsAssets(a){
  if(!a || typeof a!=='object') return false;
  if(a.momentsBg!==undefined) momentsBg=a.momentsBg;
  if(Array.isArray(a.images)){
    a.images.forEach(function(row){
      var target=moments.find(function(m){ return String(m.id)===String(row.id); });
      if(target) target.img=row.img||null;
    });
  }
  return true;
}
function applyContactAssets(list){
  if(!Array.isArray(list)) return false;
  list.forEach(function(row){
    if(!row || !row.id || !contacts[row.id]) return;
    if(row.avatar!==undefined) contacts[row.id].avatar=row.avatar;
    if(row.cover!==undefined) contacts[row.id].cover=row.cover;
  });
  return true;
}
function repaintPersistentAssets(){
  applyUserName(); applyUserPrefs(); updateUserAvatarEl();
  applyMomentsBg(); renderMoments(); refreshAllMomentsViews();
  if(chatBg){ applyChatBgToDOM(chatBg); }
  paintWallpaper(document.getElementById('lock-wallpaper'), lockWp);
  paintWallpaper(document.getElementById('home-wallpaper'), homeWp);
  renderThread(); renderChatList(); renderDesktopIcons(); renderIconGrid(); applyBubbleColors(); applyFontConfig();
}
function loadState(){
  try{
    var raw = localStorage.getItem('fated_state');
    if(!raw) return false;
    return applyStateSnapshot(JSON.parse(raw));
  }catch(e){
    try{ console.warn('[Fated persistence] localStorage load failed', e); }catch(_e){}
    return false;
  }
}
function loadStateBackupFromDB(cb){
  fatedDBLoadKV('fated_state_core_backup', function(s){
    var ok = applyStateSnapshot(s);
    cb&&cb(!!ok);
  });
}
function loadStateAssetsFromDB(cb){
  fatedDBLoadKV('profileAssets', function(profileAssets){
    var changed = !!applyProfileAssets(profileAssets);
    fatedDBLoadKV('momentsAssets', function(momentsAssets){
      changed = !!applyMomentsAssets(momentsAssets) || changed;
      fatedDBLoadKV('contactAssets', function(contactAssets){
        changed = !!applyContactAssets(contactAssets) || changed;
        fatedDBLoadKV('fontConfigAssets', function(fontAssets){
          if(fontAssets && typeof fontAssets==='object'){
            applyFontSnapshot(Object.assign({}, fontConfig, {customDataUrl:fontAssets.customDataUrl||''}));
            changed = true;
          }
          fatedDBLoadKV('widgetCustom', function(wc){
            if(wc && typeof wc==='object'){ widgetCustom=wc; changed=true; }
            fatedDBLoadKV('appIconImgs', function(icons){
              if(Array.isArray(icons)){ applyAppIconAssets(icons); changed=true; }
              fatedDBLoadKV('lockWp', function(lwp){
                if(lwp && typeof lwp==='object'){ lockWp=lwp; changed=true; }
                fatedDBLoadKV('homeWp', function(hwp){
                  if(hwp && typeof hwp==='object'){ homeWp=hwp; changed=true; }
                  if(changed) repaintPersistentAssets();
                  cb&&cb(changed);
                });
              });
            });
          });
        });
      });
    });
  });
}

function saveChatThread(contactId){
  var id = contactId || currentContact;
  if(!id || !contacts[id]) return;
  fatedDBSaveChat(id);
}
function saveStickersDB(){ fatedDBSaveStickers(); }
