/* ============ PERSISTENCE ============ */
var bubbleMineColor = '#1a1a1a', bubbleTheirsColor = '#ffffff';
var widgetCustom = {}; var removedPlugins = [];
var lastPersistenceWarningAt = 0;
var persistenceBooting = true;
var localPersistenceHadSavedData = false;
var localPersistenceLastChangedAt = 0;
var savedPluginTypes = null;
var fatedDeletedTombstones = {contacts:{}, plugins:{}, images:{}, appearance:{}};
var FATED_LEGACY_DEFAULT_CONTACT_IDS = ['test'+'er1', 'fated_'+'default_contact'];
var FATED_LEGACY_DEFAULT_WORLD_BOOK_IDS = ['wb1'];

function fatedNowDeletedAt(){ return Date.now(); }
function fatedNormalizeDeletedAt(value){
  if(value && typeof value==='object') value = value.deletedAt || value.ts || value.updatedAt || 0;
  if(typeof value==='string'){ var parsed=Date.parse(value); if(isFinite(parsed)) return parsed; }
  value=Number(value)||0;
  return value>0 ? value : 0;
}
function fatedEnsureTombstones(map){
  map = map && typeof map==='object' ? map : {};
  ['contacts','plugins','images','appearance'].forEach(function(kind){
    if(!map[kind] || typeof map[kind]!=='object' || Array.isArray(map[kind])) map[kind]={};
  });
  return map;
}
function fatedCloneTombstones(){
  var src=fatedEnsureTombstones(fatedDeletedTombstones), out={contacts:{}, plugins:{}, images:{}, appearance:{}};
  ['contacts','plugins','images','appearance'].forEach(function(kind){
    Object.keys(src[kind]||{}).forEach(function(id){ var ts=fatedNormalizeDeletedAt(src[kind][id]); if(ts) out[kind][id]=ts; });
  });
  return out;
}
function fatedMergeTombstones(){
  var merged=fatedEnsureTombstones({});
  Array.prototype.slice.call(arguments).forEach(function(src){
    src=fatedEnsureTombstones(src);
    ['contacts','plugins','images','appearance'].forEach(function(kind){
      Object.keys(src[kind]||{}).forEach(function(id){ var ts=fatedNormalizeDeletedAt(src[kind][id]); if(ts && ts>(merged[kind][id]||0)) merged[kind][id]=ts; });
    });
  });
  fatedDeletedTombstones=merged;
  return fatedCloneTombstones();
}
function fatedMarkDeleted(kind, id, ts){
  kind=String(kind||''); id=String(id||'');
  if(!kind || !id) return 0;
  fatedEnsureTombstones(fatedDeletedTombstones);
  if(!fatedDeletedTombstones[kind]) fatedDeletedTombstones[kind]={};
  ts=fatedNormalizeDeletedAt(ts)||fatedNowDeletedAt();
  fatedDeletedTombstones[kind][id]=Math.max(fatedDeletedTombstones[kind][id]||0, ts);
  return fatedDeletedTombstones[kind][id];
}
function fatedClearDeleted(kind, id, updatedAt){
  kind=String(kind||''); id=String(id||'');
  if(!kind || !id) return;
  fatedEnsureTombstones(fatedDeletedTombstones);
  if(!fatedDeletedTombstones[kind]) return;
  var deletedAt=fatedDeletedTombstones[kind][id]||0;
  var next=fatedNormalizeDeletedAt(updatedAt);
  if(!next || next>=deletedAt) delete fatedDeletedTombstones[kind][id];
}
function fatedIsDeleted(kind, id, updatedAt){
  kind=String(kind||''); id=String(id||'');
  if(!kind || !id) return false;
  fatedEnsureTombstones(fatedDeletedTombstones);
  var deletedAt=fatedNormalizeDeletedAt(fatedDeletedTombstones[kind] && fatedDeletedTombstones[kind][id]);
  if(!deletedAt) return false;
  var next=fatedNormalizeDeletedAt(updatedAt);
  return !next || deletedAt>=next;
}
function fatedImageAssetDeleted(id, row){ row=row||{}; return fatedIsDeleted('images', id, row.updatedAt || row.createdAt || 0); }
function fatedTouchEntity(obj, ts){ if(obj && typeof obj==='object') obj.updatedAt=fatedNormalizeDeletedAt(ts)||Date.now(); return obj; }
function fatedContactImageId(contactId, key){ return 'contact:'+String(contactId||'')+':'+key; }
function fatedWidgetImageId(type, idx){ return 'widget:'+String(type||'')+':img'+(idx!==undefined && idx!==null ? ':'+idx : ''); }
function fatedApplyTombstonesToPayload(payload){
  if(!payload || typeof payload!=='object') return payload;
  var state=payload.state||{};
  var merged=fatedMergeTombstones(fatedDeletedTombstones, payload.deletedTombstones, state.deletedTombstones);
  state.deletedTombstones=merged;
  if(Array.isArray(state.contactsExtra)) state.contactsExtra=state.contactsExtra.filter(function(c){ return c && c.id && !fatedIsDeleted('contacts', c.id, c.updatedAt || c.createdAt || 0); });
  if(Array.isArray(state.activePlugins)) state.activePlugins=state.activePlugins.filter(function(t){ return !fatedIsDeleted('plugins', t, 0); });
  var removedMap={};
  (Array.isArray(state.removedPlugins)?state.removedPlugins:[]).forEach(function(t){ removedMap[t]=1; });
  Object.keys(merged.plugins||{}).forEach(function(t){ removedMap[t]=1; });
  state.removedPlugins=Object.keys(removedMap);
  var a=payload.assets||{};
  if(Array.isArray(a.contacts)) a.contacts=a.contacts.filter(function(row){ return row && row.id && !fatedIsDeleted('contacts', row.id, row.updatedAt || row.createdAt || 0); });
  if(a.profile){
    if(fatedImageAssetDeleted('profile:userAvatar', {updatedAt:a.profile.userAvatarUpdatedAt||a.profile.updatedAt})) delete a.profile.userAvatar;
    if(fatedImageAssetDeleted('profile:userCover', {updatedAt:a.profile.userCoverUpdatedAt||a.profile.updatedAt})) delete a.profile.userCover;
    if(fatedImageAssetDeleted('profile:chatBg', {updatedAt:a.profile.chatBgUpdatedAt||a.profile.updatedAt})) delete a.profile.chatBg;
  }
  if(a.moments){
    if(fatedImageAssetDeleted('momentsBg', {updatedAt:a.moments.momentsBgUpdatedAt||a.moments.updatedAt})) delete a.moments.momentsBg;
    if(Array.isArray(a.moments.images)) a.moments.images=a.moments.images.filter(function(row){ return row && !fatedImageAssetDeleted('moment:'+row.id+':img', row); });
  }
  if(Array.isArray(a.appIconImgs)) a.appIconImgs=a.appIconImgs.filter(function(row){ return row && !fatedImageAssetDeleted('appIcon:'+row.id, row); });
  if(a.widgetCustom && typeof a.widgetCustom==='object'){
    Object.keys(a.widgetCustom).forEach(function(type){
      var cfg=a.widgetCustom[type];
      if(!cfg || typeof cfg!=='object') return;
      if(fatedImageAssetDeleted(fatedWidgetImageId(type), {updatedAt:cfg.updatedAt})) delete cfg.img;
      if(Array.isArray(cfg.imgs)){
        cfg.imgs=cfg.imgs.map(function(img, idx){
          return fatedImageAssetDeleted(fatedWidgetImageId(type, idx), {updatedAt:cfg.updatedAt}) ? null : img;
        });
      }
    });
  }
  if(fatedIsDeleted('appearance', 'wallpaper:lock', a.lockWp && a.lockWp.updatedAt)) delete a.lockWp;
  if(fatedIsDeleted('appearance', 'wallpaper:home', a.homeWp && a.homeWp.updatedAt)) delete a.homeWp;
  if(Array.isArray(payload.chats)) payload.chats=payload.chats.filter(function(row){ return row && row.id && !fatedIsDeleted('contacts', row.id, row.updatedAt || row.createdAt || 0); });
  payload.state=state; payload.assets=a; payload.deletedTombstones=merged;
  return payload;
}

function fatedIsLegacyDefaultContactId(id){
  return FATED_LEGACY_DEFAULT_CONTACT_IDS.indexOf(String(id||'')) >= 0;
}
function fatedIsLegacyDefaultWorldBookId(id){
  return FATED_LEGACY_DEFAULT_WORLD_BOOK_IDS.indexOf(String(id||'')) >= 0;
}
function fatedFilterLegacyIds(list){
  return Array.isArray(list) ? list.filter(function(id){ return !fatedIsLegacyDefaultContactId(id); }) : list;
}
function fatedSanitizeApiConfig(cfg){
  if(!cfg || typeof cfg!=='object') return cfg;
  ['voiceIds','memoryBooks'].forEach(function(k){
    if(cfg[k] && typeof cfg[k]==='object') FATED_LEGACY_DEFAULT_CONTACT_IDS.forEach(function(id){ delete cfg[k][id]; });
  });
  return cfg;
}
function fatedSanitizeMomentsList(list){
  if(!Array.isArray(list)) return list;
  return list.filter(function(m){ return m && !fatedIsLegacyDefaultContactId(m.authorId); }).map(function(m){
    if(Array.isArray(m.comments)) m.comments = m.comments.filter(function(c){ return c && !fatedIsLegacyDefaultContactId(c.who); });
    if(Array.isArray(m.hidden)) m.hidden = fatedFilterLegacyIds(m.hidden);
    return m;
  });
}
function fatedSanitizeContactsList(list){
  if(!Array.isArray(list)) return list;
  return list.filter(function(c){ return c && c.id && !fatedIsLegacyDefaultContactId(c.id); }).map(function(c){
    if(Array.isArray(c.members)) c.members = fatedFilterLegacyIds(c.members);
    if(Array.isArray(c.worldBooks)) c.worldBooks = c.worldBooks.filter(function(id){ return !fatedIsLegacyDefaultWorldBookId(id); });
    return c;
  });
}
function fatedSanitizeWorldBooksMap(map){
  if(!map || typeof map!=='object') return map;
  FATED_LEGACY_DEFAULT_WORLD_BOOK_IDS.forEach(function(id){ delete map[id]; });
  return map;
}
function fatedSanitizeMomentsAssets(a){
  if(!a || typeof a!=='object') return a;
  if(Array.isArray(a.images)) a.images = a.images.filter(function(row){ return row && !fatedIsLegacyDefaultContactId(row.authorId); });
  return a;
}
function fatedSanitizeLegacyDefaultStateSnapshot(s){
  if(!s || typeof s!=='object') return s;
  s.contactsExtra = fatedSanitizeContactsList(s.contactsExtra);
  s.moments = fatedSanitizeMomentsList(s.moments);
  s.apiConfig = fatedSanitizeApiConfig(s.apiConfig);
  s.worldBooks = fatedSanitizeWorldBooksMap(s.worldBooks);
  if(fatedIsLegacyDefaultContactId(s.currentContact)) s.currentContact = '';
  if(fatedIsLegacyDefaultContactId(s.viewAs)) s.viewAs = 'me';
  if(Array.isArray(s.composeHidden)) s.composeHidden = fatedFilterLegacyIds(s.composeHidden);
  return s;
}
function fatedSanitizeLegacyDefaultCloudPayload(payload){
  if(!payload || typeof payload!=='object') return payload;
  if(payload.state) fatedSanitizeLegacyDefaultStateSnapshot(payload.state);
  if(payload.assets){
    if(Array.isArray(payload.assets.contacts)) payload.assets.contacts = fatedSanitizeContactsList(payload.assets.contacts);
    if(payload.assets.moments) fatedSanitizeMomentsAssets(payload.assets.moments);
  }
  if(Array.isArray(payload.chats)) payload.chats = fatedSanitizeContactsList(payload.chats);
  return payload;
}
function fatedSanitizeLegacyDefaultRuntimeState(){
  FATED_LEGACY_DEFAULT_CONTACT_IDS.forEach(function(id){
    if(contacts && contacts[id]) delete contacts[id];
    if(typeof fatedDBDeleteChat==='function') fatedDBDeleteChat(id);
  });
  if(typeof currentContact!=='undefined' && fatedIsLegacyDefaultContactId(currentContact)) currentContact='';
  if(typeof viewAs!=='undefined' && fatedIsLegacyDefaultContactId(viewAs)) viewAs='me';
  if(typeof composeHidden!=='undefined' && Array.isArray(composeHidden)) composeHidden=fatedFilterLegacyIds(composeHidden);
  if(typeof moments!=='undefined') moments=fatedSanitizeMomentsList(moments)||[];
  if(typeof worldBooks!=='undefined') fatedSanitizeWorldBooksMap(worldBooks);
  if(typeof apiConfig!=='undefined') fatedSanitizeApiConfig(apiConfig);
}


function isPersistenceBooting(){ return !!persistenceBooting; }
function markPersistenceReady(){ persistenceBooting = false; }
function markLocalPersistenceHadSavedData(){ localPersistenceHadSavedData = true; }
function localPersistenceHasSavedData(){ return !!localPersistenceHadSavedData; }
function markLocalPersistenceChanged(reason){
  localPersistenceLastChangedAt = Date.now();
  try{ localStorage.setItem('fated_local_changed_at', String(localPersistenceLastChangedAt)); }catch(e){}
  return localPersistenceLastChangedAt;
}
function getLocalPersistenceLastChangedAt(){
  if(localPersistenceLastChangedAt) return localPersistenceLastChangedAt;
  try{ localPersistenceLastChangedAt = Number(localStorage.getItem('fated_local_changed_at')||0)||0; }catch(e){}
  return localPersistenceLastChangedAt;
}
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
function isPersistableContactId(id){
  if(!id || id==='me') return false;
  if(typeof fatedIsLegacyDefaultContactId==='function' && fatedIsLegacyDefaultContactId(id)) return false;
  if(/^tmp[-_]/.test(id) || /^draft[-_]/.test(id)) return false;
  if(contacts && contacts[id] && typeof fatedIsDeleted==='function' && fatedIsDeleted('contacts', id, contacts[id].updatedAt || contacts[id].createdAt || 0)) return false;
  return !!(contacts && contacts[id]);
}
function normalizeRestoredContactShape(id, c, seedRow){
  seedRow=seedRow||{}; c=c||{};
  c.name = c.name || seedRow.name || seedRow.displayName || id;
  c.displayName = c.displayName || seedRow.displayName || '';
  c.tone = c.tone || seedRow.tone || seedRow.persona || '';
  c.persona = c.persona || seedRow.persona || c.tone || '';
  c.userPrompt = c.userPrompt || seedRow.userPrompt || '';
  c.pendingCount = typeof c.pendingCount==='number' ? c.pendingCount : (seedRow.pendingCount||0);
  c.idleTimer = null;
  c.avatarColor = c.avatarColor || seedRow.avatarColor || (typeof randAvatarColor==='function' ? randAvatarColor() : '#9bb37a');
  c.avatar = c.avatar!==undefined ? c.avatar : (seedRow.avatar||null);
  c.cover = c.cover!==undefined ? c.cover : (seedRow.cover||'');
  c.blocked = c.blocked!==undefined ? !!c.blocked : !!seedRow.blocked;
  c.isGroup = c.isGroup!==undefined ? !!c.isGroup : !!seedRow.isGroup;
  if(seedRow.members && !c.members) c.members = seedRow.members;
  c.worldBooks = Array.isArray(c.worldBooks) ? c.worldBooks : (Array.isArray(seedRow.worldBooks) ? seedRow.worldBooks : []);
  c.memory = c.memory || seedRow.memory || {enabled:true, threshold:20, summary:'', lastMsgCount:0};
  if(c.memory.enabled===undefined) c.memory.enabled=true;
  if(!c.memory.threshold) c.memory.threshold=20;
  c.seed = Array.isArray(c.seed) ? c.seed : (Array.isArray(seedRow.seed) ? seedRow.seed : []);
  c.unread = typeof c.unread==='number' ? c.unread : (seedRow.unread||0);
  c.wxid = c.wxid || seedRow.wxid || id;
  c.bio = c.bio || seedRow.bio || '';
  c.relations = Array.isArray(c.relations) ? c.relations : (Array.isArray(seedRow.relations) ? seedRow.relations : []);
  c.proactive = c.proactive!==undefined ? c.proactive : (seedRow.proactive!==false);
  c.imageGenEnabled = c.imageGenEnabled===true || seedRow.imageGenEnabled===true;
  c.userProfile = c.userProfile || seedRow.userProfile || '';
  c.userProfileUpdatedAt = c.userProfileUpdatedAt || seedRow.userProfileUpdatedAt || 0;
  c.userProfileLastMsgCount = c.userProfileLastMsgCount || seedRow.userProfileLastMsgCount || 0;
  c.groupUserPrompt = c.groupUserPrompt || seedRow.groupUserPrompt || '';
  c.taDeletedByPartner = c.taDeletedByPartner!==undefined ? !!c.taDeletedByPartner : !!seedRow.taDeletedByPartner;
  c.taDeletedBy = c.taDeletedBy || seedRow.taDeletedBy || '';
  c.taDeletedAt = c.taDeletedAt || seedRow.taDeletedAt || 0;
  c.taDeletedPrevBlocked = c.taDeletedPrevBlocked!==undefined ? !!c.taDeletedPrevBlocked : !!seedRow.taDeletedPrevBlocked;
  c.createdAt = c.createdAt || seedRow.createdAt || Date.now();
  c.updatedAt = fatedNormalizeDeletedAt(c.updatedAt || seedRow.updatedAt || seedRow.createdAt) || c.createdAt;
  c.deletedAt = fatedNormalizeDeletedAt(c.deletedAt || seedRow.deletedAt);
  return c;
}
function ensureRestoredContact(id, seedRow){
  if(!id || id==='me') return null;
  if(typeof fatedIsLegacyDefaultContactId==='function' && fatedIsLegacyDefaultContactId(id)) return null;
  seedRow=seedRow||{};
  if(typeof fatedIsDeleted==='function' && fatedIsDeleted('contacts', id, seedRow.updatedAt || seedRow.createdAt || 0)) return null;
  contacts[id] = normalizeRestoredContactShape(id, contacts[id]||{}, seedRow);
  if(seedRow.updatedAt || seedRow.createdAt) fatedClearDeleted('contacts', id, contacts[id].updatedAt);
  return contacts[id];
}
function syncRenderedContactRows(){
  if(typeof document==='undefined' || typeof addContactRow!=='function') return;
  Object.keys(contacts||{}).forEach(function(id){
    if(!isPersistableContactId(id)) return;
    if(!document.querySelector('#contact-items [onclick*="'+id+'"]')) addContactRow(id, !!contacts[id].isGroup);
  });
  if(typeof populateViewAs==='function') populateViewAs();
}

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
  return Object.keys(contacts).filter(function(k){ return isPersistableContactId(k); }).map(function(k){
    var c=contacts[k];
    return {
      id:k,
      updatedAt:c.updatedAt||c.createdAt||0,
      deletedAt:fatedDeletedTombstones.contacts[k]||c.deletedAt||0,
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
      taDeletedByPartner:!!c.taDeletedByPartner,
      taDeletedBy:c.taDeletedBy||'',
      taDeletedAt:c.taDeletedAt||0,
      taDeletedPrevBlocked:!!c.taDeletedPrevBlocked,
      worldBooks:c.worldBooks||[],
      memory:c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0},
      userProfile:c.userProfile||'',
      userProfileUpdatedAt:c.userProfileUpdatedAt||0,
      userProfileLastMsgCount:c.userProfileLastMsgCount||0,
      groupUserPrompt:c.groupUserPrompt||'',
      proactive:c.proactive!==false,
      imageGenEnabled:c.imageGenEnabled===true,
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
    deletedTombstones:fatedCloneTombstones(),
    activePlugins:buildActivePluginsSnapshot(),
    personaSeq:personaSeq,
    suoha: typeof suohaState!=='undefined' ? suohaState : null,
    momentsLastGenDate:momentsLastGenDate||'',
    coupleState: typeof coupleState!=='undefined' ? coupleState : null,
    screenTime: typeof screenTimeData!=='undefined' ? screenTimeData : null,
    go: typeof goState!=='undefined' && goState ? goState : null,
    dream: typeof dreamState!=='undefined' && dreamState ? dreamState : null,
    nilflow: typeof nilflowState!=='undefined' && nilflowState ? nilflowState : null,
    fatedEventState: typeof fatedEventState!=='undefined' && fatedEventState ? fatedEventState : null
  };
}
function buildProfileAssets(){
  var ts=getLocalPersistenceLastChangedAt()||Date.now();
  return {userAvatar:userAvatar||null, userCover:userCover||'', chatBg:chatBg||null, updatedAt:ts, userAvatarUpdatedAt:ts, userCoverUpdatedAt:ts, chatBgUpdatedAt:ts, deletedAt:{userAvatar:fatedDeletedTombstones.images['profile:userAvatar']||0, userCover:fatedDeletedTombstones.images['profile:userCover']||0, chatBg:fatedDeletedTombstones.images['profile:chatBg']||0}};
}
function buildMomentsAssets(){
  var ts=getLocalPersistenceLastChangedAt()||Date.now();
  return {
    momentsBg:momentsBg||null,
    updatedAt:ts,
    momentsBgUpdatedAt:ts,
    deletedAt:{momentsBg:fatedDeletedTombstones.images.momentsBg||0},
    images:moments.map(function(m){ return {id:m.id, img:m.img||null, updatedAt:m.updatedAt||m.ts||ts, deletedAt:fatedDeletedTombstones.images['moment:'+m.id+':img']||0}; }).filter(function(m){ return !!m.img; })
  };
}
function buildContactAssets(){
  return Object.keys(contacts).filter(function(k){ return isPersistableContactId(k); }).map(function(k){
    var c=contacts[k];
    return {id:k, avatar:c.avatar||null, cover:c.cover||'', updatedAt:c.updatedAt||c.createdAt||0, deletedAt:fatedDeletedTombstones.contacts[k]||0, avatarDeletedAt:fatedDeletedTombstones.images[fatedContactImageId(k,'avatar')]||0, coverDeletedAt:fatedDeletedTombstones.images[fatedContactImageId(k,'cover')]||0};
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
  if(!(typeof cloudSyncState!=='undefined' && cloudSyncState.suppressAutosave)) markLocalPersistenceChanged('state');
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
  fatedDBSaveKV('deletedTombstones', fatedCloneTombstones());
  fatedDBSaveKV('appIconImgs', appIcons.map(function(a){ return {id:a.id, img:a.img, updatedAt:a.updatedAt||0, deletedAt:fatedDeletedTombstones.images['appIcon:'+a.id]||0}; }));
  fatedDBSaveKV('lockWp', lockWp);
  fatedDBSaveKV('homeWp', homeWp);
  fatedDBSaveAllChats();
  fatedDBSaveStickers();
  if(typeof cloudNotifyLocalSave==='function') cloudNotifyLocalSave('saveState');
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
  if(typeof cfgEnsureImageGenShape==='function') cfgEnsureImageGenShape();
  else if(typeof imageGenEnsureConfig==='function') imageGenEnsureConfig();
}
function applyContactsSnapshot(list){
  list = fatedSanitizeContactsList(list);
  if(!Array.isArray(list)) return;
  list.forEach(function(c){
    if(!c || !c.id) return;
    var id=c.id;
    if(typeof fatedIsDeleted==='function' && fatedIsDeleted('contacts', id, c.updatedAt || c.createdAt || 0)) return;
    var target=ensureRestoredContact(id, c);
    if(!target) return;
    Object.keys(c).forEach(function(k){ if(k!=='id' && k!=='avatar' && k!=='cover') target[k]=c[k]; });
    normalizeRestoredContactShape(id, target, c);
    fatedClearDeleted('contacts', id, target.updatedAt);
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
  markLocalPersistenceHadSavedData();
  if(s.userName) userName=s.userName;
  if(s.userWxid) userWxid=s.userWxid;
  if(typeof s.userBio==='string') userBio=s.userBio;
  if(typeof s.userPrefs==='string') userPrefs=s.userPrefs;
  if(typeof s.walletBalance==='number') walletBalance=s.walletBalance;
  if(Array.isArray(s.walletTx)) walletTx=s.walletTx;
  if(Array.isArray(s.moments) && s.moments.length) moments=s.moments;
  if(s.viewAs) viewAs=s.viewAs;
  if(typeof s.personaSeq==='number' && isFinite(s.personaSeq)) personaSeq=Math.max(1, Math.floor(s.personaSeq));
  fatedMergeTombstones(fatedDeletedTombstones, s.deletedTombstones);
  if(Array.isArray(s.removedPlugins)) s.removedPlugins.forEach(function(t){ fatedMarkDeleted('plugins', t, fatedDeletedTombstones.plugins[t]||Date.now()); });
  if(Array.isArray(s.activePlugins)) savedPluginTypes=s.activePlugins.filter(function(t){ return typeof t==='string' && t && !fatedIsDeleted('plugins', t, 0); });
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
  if(s.dream && typeof s.dream==='object'){ dreamState=Object.assign(dreamDefault(), s.dream); if(typeof dreamEnsureStateShape==='function') dreamEnsureStateShape(); }
  if(s.nilflow && typeof s.nilflow==='object'){ nilflowState=Object.assign(nilflowDefault(), s.nilflow); if(typeof nilflowEnsureStateShape==='function') nilflowEnsureStateShape(); }
  if(s.fatedEventState && typeof s.fatedEventState==='object'){ fatedEventState=s.fatedEventState; if(typeof fatedEnsureEventState==='function') fatedEnsureEventState(); }

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
  icons.forEach(function(o){ if(!o || fatedImageAssetDeleted('appIcon:'+o.id, o)) return; var a=appIcons.find(function(x){return x.id===o.id;}); if(a){ a.img=o.img; a.updatedAt=o.updatedAt||Date.now(); fatedClearDeleted('images', 'appIcon:'+o.id, a.updatedAt); } });
  renderDesktopIcons(); renderIconGrid();
}
function applyProfileAssets(a){
  if(!a || typeof a!=='object') return false;
  if(a.userAvatar!==undefined && !fatedImageAssetDeleted('profile:userAvatar', {updatedAt:a.userAvatarUpdatedAt||a.updatedAt})) userAvatar=a.userAvatar;
  if(a.userCover!==undefined && !fatedImageAssetDeleted('profile:userCover', {updatedAt:a.userCoverUpdatedAt||a.updatedAt})) userCover=a.userCover;
  if(a.chatBg!==undefined && !fatedImageAssetDeleted('profile:chatBg', {updatedAt:a.chatBgUpdatedAt||a.updatedAt})) chatBg=a.chatBg;
  return true;
}
function applyMomentsAssets(a){
  if(!a || typeof a!=='object') return false;
  if(a.momentsBg!==undefined && !fatedImageAssetDeleted('momentsBg', {updatedAt:a.momentsBgUpdatedAt||a.updatedAt})) momentsBg=a.momentsBg;
  if(Array.isArray(a.images)){
    a.images.forEach(function(row){
      if(!row || fatedImageAssetDeleted('moment:'+row.id+':img', row)) return;
      var target=moments.find(function(m){ return String(m.id)===String(row.id); });
      if(target) target.img=row.img||null;
    });
  }
  return true;
}
function applyContactAssets(list){
  list = fatedSanitizeContactsList(list);
  if(!Array.isArray(list)) return false;
  list.forEach(function(row){
    if(!row || !row.id) return;
    if(fatedIsDeleted('contacts', row.id, row.updatedAt || row.createdAt || 0)) return;
    var c=ensureRestoredContact(row.id, row);
    if(!c) return;
    if(row.avatar!==undefined && !fatedImageAssetDeleted(fatedContactImageId(row.id,'avatar'), {updatedAt:row.avatarUpdatedAt||row.updatedAt})) c.avatar=row.avatar;
    if(row.cover!==undefined && !fatedImageAssetDeleted(fatedContactImageId(row.id,'cover'), {updatedAt:row.coverUpdatedAt||row.updatedAt})) c.cover=row.cover;
  });
  return true;
}
function repaintPersistentAssets(){
  applyUserName(); applyUserPrefs(); updateUserAvatarEl();
  applyMomentsBg(); renderMoments(); refreshAllMomentsViews();
  if(chatBg){ applyChatBgToDOM(chatBg); }
  paintWallpaper(document.getElementById('lock-wallpaper'), lockWp);
  paintWallpaper(document.getElementById('home-wallpaper'), homeWp);
  if(typeof remountPluginsFromSavedState==='function') remountPluginsFromSavedState();
  if(typeof syncRenderedContactRows==='function') syncRenderedContactRows();
  renderThread(); renderChatList(); renderDesktopIcons(); renderIconGrid(); applyBubbleColors(); applyFontConfig();
}
function loadState(){
  try{
    var raw = localStorage.getItem('fated_state');
    if(!raw) return false;
    var ok = applyStateSnapshot(JSON.parse(raw));
    if(ok) markLocalPersistenceHadSavedData();
    return ok;
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
  fatedDBLoadKV('deletedTombstones', function(ts){ if(ts && typeof ts==='object') fatedMergeTombstones(fatedDeletedTombstones, ts); });
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
                  fatedDBLoadKV('fated_event_state', function(evState){
                    if(evState && typeof evState==='object'){ fatedEventState=evState; if(typeof fatedEnsureEventState==='function') fatedEnsureEventState(); changed=true; }
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
  });
}

function saveChatThread(contactId){
  var id = contactId || currentContact;
  if(!id || !contacts[id]) return;
  markLocalPersistenceChanged('chat');
  fatedDBSaveChat(id, function(){
    if(typeof cloudNotifyLocalSave==='function') cloudNotifyLocalSave('chat');
  });
}
function saveStickersDB(){ fatedDBSaveStickers(); }




