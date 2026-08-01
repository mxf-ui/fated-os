/* ============ CLOUD ACCOUNT + ENCRYPTED AUTO SYNC ============ */
var cloudSyncState = {
  user:null,
  key:null,
  email:'',
  lastRemote:null,
  busy:false,
  autosaveTimer:null,
  autosaveInFlight:false,
  autosavePending:false,
  suppressAutosave:false,
  lastLocalSaveAt:0,
  lastUploadedLocalSaveAt:0,
  autoRestoreDone:false
};

function cloudSetStatus(text, tone){
  var el=document.getElementById('cloud-sync-status');
  if(!el) return;
  el.textContent=text||'';
  el.className='cloud-sync-status '+(tone||'');
}
function cloudSetBusy(on){
  cloudSyncState.busy=!!on;
  ['cloud-login-btn','cloud-register-btn','cloud-upload-btn','cloud-restore-btn','cloud-logout-btn','cloud-entry-login-btn','cloud-entry-register-btn'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.disabled=!!on;
  });
}
function cloudB64ToBytes(value){
  var binary=atob(value||'');
  var bytes=new Uint8Array(binary.length);
  for(var i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return bytes;
}
function cloudBytesToB64(bytes){
  var chunk=0x8000, out='';
  for(var i=0;i<bytes.length;i+=chunk){
    out+=String.fromCharCode.apply(null, bytes.subarray(i,i+chunk));
  }
  return btoa(out);
}
async function cloudDeriveKey(password, saltBase64){
  var material=await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:cloudB64ToBytes(saltBase64), iterations:150000, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function cloudEncryptSnapshot(snapshot, key){
  var iv=new Uint8Array(12); crypto.getRandomValues(iv);
  var encoded=new TextEncoder().encode(JSON.stringify(snapshot));
  var cipher=await crypto.subtle.encrypt({name:'AES-GCM', iv:iv}, key, encoded);
  return { iv:cloudBytesToB64(iv), ciphertext:cloudBytesToB64(new Uint8Array(cipher)) };
}
async function cloudDecryptSnapshot(remote, key){
  var plain=await crypto.subtle.decrypt({name:'AES-GCM', iv:cloudB64ToBytes(remote.iv)}, key, cloudB64ToBytes(remote.ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}
async function cloudApi(path, options){
  var resp=await fetch(path, Object.assign({credentials:'include', headers:{'Content-Type':'application/json'}}, options||{}));
  var data=null;
  try{ data=await resp.json(); }catch(e){ data={error:'Invalid server response'}; }
  if(!resp.ok){
    var msg=data && data.setupRequired ? 'Cloudflare D1 is not configured yet' : (data && data.error ? data.error : ('HTTP '+resp.status));
    var err=new Error(msg); err.data=data; err.status=resp.status; throw err;
  }
  return data;
}
function cloudReadInputs(){
  return {
    email:((document.getElementById('cloud-email')||{}).value||'').trim(),
    password:(document.getElementById('cloud-password')||{}).value||'',
    inviteCode:((document.getElementById('cloud-invite')||{}).value||'').trim()
  };
}

function cloudReadEntryInputs(){
  return {
    email:((document.getElementById('cloud-entry-email')||{}).value||'').trim(),
    password:(document.getElementById('cloud-entry-password')||{}).value||'',
    inviteCode:((document.getElementById('cloud-entry-invite')||{}).value||'').trim()
  };
}
function cloudFillAuthInputsFromEntry(input){
  input=input||cloudReadEntryInputs();
  var email=document.getElementById('cloud-email'); if(email) email.value=input.email||'';
  var password=document.getElementById('cloud-password'); if(password) password.value=input.password||'';
  var invite=document.getElementById('cloud-invite'); if(invite) invite.value=input.inviteCode||'';
}
function cloudFillEntryFromAuth(input){
  input=input||cloudReadInputs();
  var email=document.getElementById('cloud-entry-email'); if(email && !email.value) email.value=input.email||cloudSyncState.email||'';
  var invite=document.getElementById('cloud-entry-invite'); if(invite && !invite.value) invite.value=input.inviteCode||'';
}
function cloudShowEntryGate(message, tone){
  var gate=document.getElementById('invite-screen');
  if(gate) gate.style.display='flex';
  var msg=document.getElementById('invite-msg');
  if(msg){ msg.textContent=message||'Sign in to unlock cloud save. / ???????????'; msg.className='cloud-entry-msg '+(tone||''); }
  cloudFillEntryFromAuth();
}
function cloudHideEntryGate(){
  var gate=document.getElementById('invite-screen');
  if(gate) gate.style.display='none';
  var msg=document.getElementById('invite-msg'); if(msg) msg.textContent='';
}
function cloudSetEntryBusy(on){ cloudSetBusy(on); }
async function cloudEntryLogin(){
  var input=cloudReadEntryInputs();
  cloudFillAuthInputsFromEntry(input);
  return cloudLogin({fromEntry:true});
}
async function cloudEntryRegister(){
  var input=cloudReadEntryInputs();
  cloudFillAuthInputsFromEntry(input);
  return cloudRegister({fromEntry:true});
}
async function cloudBootAuthGate(){
  cloudShowEntryGate('Checking account... / ???????');
  try{
    await cloudSyncInit();
    if(cloudHasSession()) cloudHideEntryGate();
    else cloudShowEntryGate(cloudSyncState.user ? 'Enter password and invite code to unlock encrypted cloud save. / ???????????????' : 'Sign in or create an account to enter Fated OS. / ?????????');
  }catch(e){
    cloudShowEntryGate((e && e.message) || 'Sign in to enter. / ???????', 'warn');
  }
}

function cloudApplyUser(user, key){
  cloudSyncState.user=user||null;
  if(user){ cloudSyncState.email=user.email||''; try{ localStorage.setItem('fated_cloud_email', user.email||''); }catch(e){} }
  if(key) cloudSyncState.key=key;
  cloudRenderAuthState();
}
function cloudRenderAuthState(){
  var signed=!!cloudSyncState.user;
  var emailEl=document.getElementById('cloud-current-email');
  var authBox=document.getElementById('cloud-auth-box');
  var actionBox=document.getElementById('cloud-action-box');
  if(emailEl) emailEl.textContent=signed ? cloudSyncState.user.email : 'Not signed in 未登录';
  if(authBox) authBox.style.display=signed && cloudSyncState.key ? 'none' : 'block';
  if(actionBox) actionBox.style.display=signed && cloudSyncState.key ? 'block' : 'none';
  var savedEmail=''; try{ savedEmail=localStorage.getItem('fated_cloud_email')||''; }catch(e){}
  var emailInput=document.getElementById('cloud-email'); if(emailInput && !emailInput.value) emailInput.value=cloudSyncState.email||savedEmail;
}
function cloudHasSession(){ return !!(cloudSyncState.user && cloudSyncState.key); }
function cloudTouchStatus(text, tone){
  if(document.getElementById('sheet-cloudsync') && document.getElementById('cloud-sync-status')) cloudSetStatus(text, tone);
}
async function cloudSyncInit(){
  cloudRenderAuthState();
  cloudSetStatus('Checking account...', '');
  try{
    var me=await cloudApi('/api/auth/me');
    cloudApplyUser(me.user, null);
    cloudSetStatus(cloudSyncState.key ? 'Cloud sync is unlocked. / ????????' : 'Signed in. Enter password and invite code once to unlock encrypted sync. / ???????????????????', '');
    if(!cloudHasSession()) cloudShowEntryGate('Enter password and invite code to unlock encrypted cloud save. / ???????????????');
  }catch(e){
    cloudSyncState.user=null; cloudSyncState.key=null; cloudRenderAuthState();
    cloudSetStatus(e.data && e.data.setupRequired ? 'Cloud database is not configured yet. / ??????????' : 'Sign in or create an account to enable cloud save. / ???????????????', e.data && e.data.setupRequired ? 'warn' : '');
    cloudShowEntryGate(e.data && e.data.setupRequired ? 'Cloud database is not configured yet. / ??????????' : 'Sign in or create an account to enter Fated OS. / ?????????', e.data && e.data.setupRequired ? 'warn' : '');
  }
}
async function cloudLogin(opts){
  opts=opts||{};
  var input=cloudReadInputs();
  if(!input.email || !input.password){ cloudShowEntryGate('Email and password are required. / ??????????', 'warn'); return cloudSetStatus('Email and password are required. / ??????????', 'warn'); }
  if(!input.inviteCode){ cloudShowEntryGate('Invite code is required. / ????????', 'warn'); return cloudSetStatus('Invite code is required. / ????????', 'warn'); }
  cloudSetBusy(true); cloudSetStatus('Signing in...', ''); cloudShowEntryGate('Signing in... / ?????');
  try{
    var data=await cloudApi('/api/auth/login', {method:'POST', body:JSON.stringify(input)});
    var key=await cloudDeriveKey(input.password, data.user.encryptionSalt);
    cloudApplyUser(data.user, key);
    cloudSetStatus('Signed in. Syncing save... / ???????????', '');
    cloudShowEntryGate('Syncing cloud save... / ?????????');
    await cloudAutoSyncAfterUnlock('login');
    cloudHideEntryGate();
  }catch(e){ cloudSetStatus(e.message, 'warn'); cloudShowEntryGate(e.message || 'Sign in failed. / ?????', 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudRegister(opts){
  opts=opts||{};
  var input=cloudReadInputs();
  if(!input.email || !input.password){ cloudShowEntryGate('Email and password are required. / ??????????', 'warn'); return cloudSetStatus('Email and password are required. / ??????????', 'warn'); }
  if(!input.inviteCode){ cloudShowEntryGate('Invite code is required. / ????????', 'warn'); return cloudSetStatus('Invite code is required. / ????????', 'warn'); }
  if(input.password.length<8){ cloudShowEntryGate('Password needs at least 8 characters. / ???? 8 ????', 'warn'); return cloudSetStatus('Password needs at least 8 characters. / ???? 8 ????', 'warn'); }
  cloudSetBusy(true); cloudSetStatus('Creating account...', ''); cloudShowEntryGate('Creating account... / ???????');
  try{
    var data=await cloudApi('/api/auth/register', {method:'POST', body:JSON.stringify(input)});
    var key=await cloudDeriveKey(input.password, data.user.encryptionSalt);
    cloudApplyUser(data.user, key);
    cloudSetStatus('Account created. Uploading current save... / ???????????????', '');
    cloudShowEntryGate('Uploading current save... / ?????????');
    await cloudUploadSnapshot({manual:false, reason:'register'});
    cloudHideEntryGate();
  }catch(e){ cloudSetStatus(e.message, 'warn'); cloudShowEntryGate(e.message || 'Create account failed. / ?????', 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudLogout(){
  cloudSetBusy(true);
  try{ await cloudApi('/api/auth/logout', {method:'POST', body:'{}'}); }catch(e){}
  if(cloudSyncState.autosaveTimer) clearTimeout(cloudSyncState.autosaveTimer);
  cloudSyncState.user=null; cloudSyncState.key=null; cloudSyncState.autosaveTimer=null; cloudSyncState.autosaveInFlight=false; cloudSyncState.autosavePending=false;
  cloudRenderAuthState();
  cloudShowEntryGate('Signed out. Sign in again to enter. / ????????????');
  cloudSetStatus('Signed out. Local data is still on this device. / ????????????????', '');
  cloudSetBusy(false);
}
function cloudCollectChats(){
  var ids=Object.keys(contacts||{}).filter(function(id){ return typeof isPersistableContactId==='function' ? isPersistableContactId(id) : id!=='me'; });
  return ids.map(function(id){
    var c=contacts[id]||{};
    return { id:id, name:c.name||id, displayName:c.displayName||'', tone:c.tone||'', persona:c.persona||'', userPrompt:c.userPrompt||'', isGroup:!!c.isGroup, members:c.members||null, avatarColor:c.avatarColor||null, avatar:c.avatar||null, cover:c.cover||'', wxid:c.wxid||id, bio:c.bio||'', relations:c.relations||[], proactive:c.proactive!==false, imageGenEnabled:c.imageGenEnabled===true, seed:c.seed||[], pendingCount:c.pendingCount||0, blocked:!!c.blocked, unread:c.unread||0, memory:c.memory||null, worldBooks:c.worldBooks||[], groupUserPrompt:c.groupUserPrompt||'', userProfile:c.userProfile||'', userProfileUpdatedAt:c.userProfileUpdatedAt||0, userProfileLastMsgCount:c.userProfileLastMsgCount||0, taDeletedByPartner:!!c.taDeletedByPartner, taDeletedBy:c.taDeletedBy||'', taDeletedAt:c.taDeletedAt||0, taDeletedPrevBlocked:!!c.taDeletedPrevBlocked };
  });
}
function cloudApplyChats(rows){
  if(!Array.isArray(rows)) return;
  rows.forEach(function(row){
    if(!row || !row.id) return;
    var c=(typeof ensureRestoredContact==='function') ? ensureRestoredContact(row.id, row) : contacts[row.id];
    if(!c) return;
    ['name','displayName','tone','persona','userPrompt','wxid','bio','cover','groupUserPrompt','userProfile','taDeletedBy'].forEach(function(k){ if(typeof row[k]==='string') c[k]=row[k]; });
    if(row.avatar!==undefined) c.avatar=row.avatar;
    if(row.avatarColor!==undefined) c.avatarColor=row.avatarColor;
    if(typeof row.isGroup==='boolean') c.isGroup=row.isGroup;
    if(Array.isArray(row.members)) c.members=row.members;
    if(Array.isArray(row.relations)) c.relations=row.relations;
    if(typeof row.proactive==='boolean') c.proactive=row.proactive;
    if(typeof row.imageGenEnabled==='boolean') c.imageGenEnabled=row.imageGenEnabled;
    if(Array.isArray(row.seed)) c.seed=row.seed;
    if(typeof row.pendingCount==='number') c.pendingCount=row.pendingCount;
    if(typeof row.unread==='number') c.unread=row.unread;
    c.blocked=!!row.blocked;
    if(row.memory) c.memory=row.memory;
    if(Array.isArray(row.worldBooks)) c.worldBooks=row.worldBooks;
    if(typeof row.userProfileUpdatedAt==='number') c.userProfileUpdatedAt=row.userProfileUpdatedAt;
    if(typeof row.userProfileLastMsgCount==='number') c.userProfileLastMsgCount=row.userProfileLastMsgCount;
    c.taDeletedByPartner=!!row.taDeletedByPartner;
    c.taDeletedAt=row.taDeletedAt||0;
    c.taDeletedPrevBlocked=!!row.taDeletedPrevBlocked;
  });
}
function cloudWriteKV(key, data){
  return new Promise(function(resolve){ if(typeof fatedDBSaveKV==='function') fatedDBSaveKV(key, data, resolve); else resolve(); });
}
function cloudSaveAllChats(){
  return new Promise(function(resolve){ if(typeof fatedDBSaveAllChats==='function') fatedDBSaveAllChats(resolve); else resolve(); });
}
function cloudSaveStickers(){
  return new Promise(function(resolve){ if(typeof fatedDBSaveStickers==='function') fatedDBSaveStickers(resolve); else resolve(); });
}
async function cloudBuildLocalSnapshot(){
  var oldSuppress=cloudSyncState.suppressAutosave;
  cloudSyncState.suppressAutosave=true;
  try{ if(typeof saveState==='function') saveState(); }
  finally{ cloudSyncState.suppressAutosave=oldSuppress; }
  await cloudSaveAllChats();
  await cloudSaveStickers();
  return {
    schemaVersion:2,
    savedAt:Date.now(),
    state:buildLightState(),
    assets:{
      profile:buildProfileAssets(),
      moments:buildMomentsAssets(),
      contacts:buildContactAssets(),
      font:buildFontAssets(),
      widgetCustom:widgetCustom,
      appIconImgs:appIcons.map(function(a){ return {id:a.id, img:a.img}; }),
      lockWp:lockWp,
      homeWp:homeWp,
      stickers:stickers
    },
    chats:cloudCollectChats()
  };
}
function cloudSnapshotWeight(payload){
  if(!payload) return 0;
  var s=payload.state||{}, score=0;
  if(Array.isArray(s.contactsExtra)) score += s.contactsExtra.length * 3;
  if(Array.isArray(payload.chats)) payload.chats.forEach(function(c){ if(Array.isArray(c.seed)) score += c.seed.length; });
  if(s.apiConfig && Array.isArray(s.apiConfig.profiles)) score += s.apiConfig.profiles.filter(function(p){ return p && (p.endpoint || p.key || p.model); }).length * 4;
  if(s.worldBooks && typeof s.worldBooks==='object') score += Object.keys(s.worldBooks).length * 4;
  if(Array.isArray(s.moments)) score += s.moments.length;
  if(s.coupleState) score += 3;
  if(s.dream) score += 3;
  if(s.nilflow) score += 3;
  var a=payload.assets||{};
  if(a.profile && (a.profile.userAvatar || a.profile.userCover || a.profile.chatBg)) score += 4;
  if(a.moments && Array.isArray(a.moments.images)) score += a.moments.images.length * 2;
  if(Array.isArray(a.contacts)) score += a.contacts.filter(function(c){ return c.avatar || c.cover; }).length * 2;
  if(a.widgetCustom && Object.keys(a.widgetCustom).length) score += Object.keys(a.widgetCustom).length;
  if(Array.isArray(a.appIconImgs)) score += a.appIconImgs.filter(function(i){ return i.img; }).length;
  if(a.lockWp || a.homeWp) score += 2;
  if(Array.isArray(a.stickers)) score += a.stickers.length;
  return score;
}
function cloudIsDataUrl(value){
  return typeof value==='string' && /^data:(image|audio)\/[a-z0-9.+-]+;base64,/i.test(value) && value.length>256;
}
function cloudParseDataUrl(value){
  var m=/^data:([^;,]+);base64,(.*)$/i.exec(value||'');
  return m ? {mimeType:m[1].toLowerCase(), base64:m[2]} : null;
}
async function cloudUploadDataUrlAsset(value){
  var parsed=cloudParseDataUrl(value);
  if(!parsed) return value;
  try{
    var data=await cloudApi('/api/assets', {method:'POST', body:JSON.stringify(parsed)});
    return data && data.url ? data.url : value;
  }catch(e){
    try{ console.warn('[Fated cloud assets] upload skipped', e && e.message ? e.message : e); }catch(_e){}
    return value;
  }
}
async function cloudExternalizeValueAssets(value, seen){
  if(cloudIsDataUrl(value)) return cloudUploadDataUrlAsset(value);
  if(!value || typeof value!=='object') return value;
  if(seen.indexOf(value)>=0) return value;
  seen.push(value);
  if(Array.isArray(value)){
    for(var i=0;i<value.length;i++) value[i]=await cloudExternalizeValueAssets(value[i], seen);
    return value;
  }
  var keys=Object.keys(value);
  for(var k=0;k<keys.length;k++){
    var key=keys[k];
    value[key]=await cloudExternalizeValueAssets(value[key], seen);
  }
  return value;
}
async function cloudExternalizeSnapshotAssets(snapshot){
  if(!snapshot || !snapshot.assets) return snapshot;
  await cloudExternalizeValueAssets(snapshot.assets, []);
  if(Array.isArray(snapshot.chats)) await cloudExternalizeValueAssets(snapshot.chats, []);
  return snapshot;
}
async function cloudRestoreSnapshotPayload(payload){
  if(!payload || !payload.state) throw new Error('Cloud save is empty or invalid. / 云端存档为空或无效。');
  cloudSyncState.suppressAutosave=true;
  try{
    applyStateSnapshot(payload.state);
    var a=payload.assets||{};
    applyProfileAssets(a.profile); applyMomentsAssets(a.moments); applyContactAssets(a.contacts); applyFontSnapshot(a.font);
    if(a.widgetCustom && typeof a.widgetCustom==='object') widgetCustom=a.widgetCustom;
    if(Array.isArray(a.appIconImgs)) applyAppIconAssets(a.appIconImgs);
    if(a.lockWp && typeof a.lockWp==='object') lockWp=a.lockWp;
    if(a.homeWp && typeof a.homeWp==='object') homeWp=a.homeWp;
    if(Array.isArray(a.stickers)) stickers=a.stickers;
    cloudApplyChats(payload.chats);
    if(typeof syncRenderedContactRows==='function') syncRenderedContactRows();
    await cloudWriteKV('fated_state_core_backup', buildLightState());
    await cloudWriteKV('profileAssets', buildProfileAssets());
    await cloudWriteKV('momentsAssets', buildMomentsAssets());
    await cloudWriteKV('contactAssets', buildContactAssets());
    await cloudWriteKV('fontConfigAssets', buildFontAssets());
    await cloudWriteKV('widgetCustom', widgetCustom);
    await cloudWriteKV('appIconImgs', appIcons.map(function(icon){ return {id:icon.id, img:icon.img}; }));
    await cloudWriteKV('lockWp', lockWp);
    await cloudWriteKV('homeWp', homeWp);
    if(typeof fatedEventState!=='undefined') await cloudWriteKV('fated_event_state', fatedEventState);
    await cloudSaveAllChats();
    await cloudSaveStickers();
    if(typeof saveState==='function') saveState();
  } finally {
    cloudSyncState.suppressAutosave=false;
  }
  if(typeof syncRenderedContactRows==='function') syncRenderedContactRows();
  repaintPersistentAssets();
  if(typeof renderChatList==='function') renderChatList();
  if(typeof renderThread==='function') renderThread();
  if(typeof populateViewAs==='function') populateViewAs();
}
async function cloudUploadSnapshot(opts){
  opts=opts||{};
  if(!cloudSyncState.user || !cloudSyncState.key) return null;
  if(opts.manual) cloudSetStatus('Encrypting local save... / 正在加密本机存档...', '');
  var snapshot=await cloudBuildLocalSnapshot();
  await cloudExternalizeSnapshotAssets(snapshot);
  var encrypted=await cloudEncryptSnapshot(snapshot, cloudSyncState.key);
  var data=await cloudApi('/api/sync', {method:'PUT', body:JSON.stringify({ciphertext:encrypted.ciphertext, iv:encrypted.iv, schemaVersion:snapshot.schemaVersion||2, clientUpdatedAt:snapshot.savedAt, meta:{device:navigator.userAgent, appVersion:'fated-os-split-autosync', reason:opts.reason||''}})});
  cloudSyncState.lastRemote=data.updatedAt;
  cloudSyncState.lastUploadedLocalSaveAt=snapshot.savedAt;
  var label='Saved to cloud at '+new Date(data.updatedAt).toLocaleString()+' / 已自动保存到云端。';
  if(opts.manual) label='Uploaded encrypted cloud save at '+new Date(data.updatedAt).toLocaleString()+' / 加密云端存档已上传。';
  cloudTouchStatus(label, 'ok');
  return data;
}
async function cloudUploadNow(){
  if(!cloudSyncState.user || !cloudSyncState.key) return cloudSetStatus('Sign in with password first. / 请先用密码登录。', 'warn');
  cloudSetBusy(true);
  try{ await cloudUploadSnapshot({manual:true, reason:'manual'}); }
  catch(e){ cloudSetStatus(e.message, 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudRestoreNow(){
  if(!cloudSyncState.user || !cloudSyncState.key) return cloudSetStatus('Sign in with password first. / 请先用密码登录。', 'warn');
  if(!confirm('Restore cloud save to this device? Current local data will be replaced by the cloud snapshot. / 确定恢复云端存档到本设备吗？当前本机数据会被云端快照替换。')) return;
  cloudSetBusy(true); cloudSetStatus('Downloading cloud save... / 正在下载云端存档...', '');
  try{
    var data=await cloudApi('/api/sync');
    if(!data.snapshot) throw new Error('No cloud save found. Upload once from your main device first. / 没有找到云端存档，请先在主设备上传一次。');
    cloudSetStatus('Decrypting cloud save... / 正在解密云端存档...', '');
    var payload=await cloudDecryptSnapshot(data.snapshot, cloudSyncState.key);
    await cloudRestoreSnapshotPayload(payload);
    cloudSetStatus('Cloud save restored. Local data has been refreshed. / 云端存档已恢复，本机数据已刷新。', 'ok');
  }catch(e){ cloudSetStatus(e.message || 'Restore failed / 恢复失败', 'warn'); }
  finally{ cloudSetBusy(false); }
}
function cloudNotifyLocalSave(reason){
  if(cloudSyncState.suppressAutosave) return;
  if(typeof isPersistenceBooting==='function' && isPersistenceBooting()) return;
  cloudSyncState.lastLocalSaveAt=Date.now();
  cloudScheduleAutosave(reason==='urgent' ? 800 : 3500);
}
function cloudScheduleAutosave(delay){
  if(!cloudHasSession()) return;
  if(cloudSyncState.autosaveTimer) clearTimeout(cloudSyncState.autosaveTimer);
  cloudSyncState.autosaveTimer=setTimeout(function(){ cloudRunAutosave(); }, delay||3500);
}
async function cloudRunAutosave(){
  if(!cloudHasSession()) return;
  if(cloudSyncState.autosaveInFlight){ cloudSyncState.autosavePending=true; return; }
  cloudSyncState.autosaveInFlight=true;
  cloudTouchStatus('Saving to cloud... / 正在自动保存云端...', '');
  try{ await cloudUploadSnapshot({manual:false, reason:'autosave'}); }
  catch(e){ cloudTouchStatus('Cloud autosave failed: '+(e.message||e), 'warn'); }
  finally{
    cloudSyncState.autosaveInFlight=false;
    if(cloudSyncState.autosavePending){ cloudSyncState.autosavePending=false; cloudScheduleAutosave(2500); }
  }
}
async function cloudAutoSyncAfterUnlock(reason){
  if(!cloudHasSession()) return;
  try{
    var remote=await cloudApi('/api/sync');
    var local=await cloudBuildLocalSnapshot();
    var localWeight=cloudSnapshotWeight(local);
    if(remote.snapshot){
      var remotePayload=await cloudDecryptSnapshot(remote.snapshot, cloudSyncState.key);
      var remoteWeight=cloudSnapshotWeight(remotePayload);
      var remoteTime=Number(remote.snapshot.clientUpdatedAt || remote.snapshot.updatedAt || 0);
      if((localWeight < 8 && remoteWeight >= localWeight) || remoteTime > (local.savedAt + 5000)){
        await cloudRestoreSnapshotPayload(remotePayload);
        cloudSetStatus('Cloud save restored automatically. / 已自动恢复云端存档。', 'ok');
        return;
      }
    }
    await cloudUploadSnapshot({manual:false, reason:reason||'unlock'});
    cloudSetStatus('Current device save is now protected in cloud. / 本机数据已保存到云端。', 'ok');
  }catch(e){
    cloudSetStatus(e.message || 'Auto sync failed / 自动同步失败', 'warn');
  }
}
window.addEventListener('beforeunload', function(){ if(cloudHasSession()) cloudNotifyLocalSave('urgent'); });
document.addEventListener('visibilitychange', function(){ if(document.hidden && cloudHasSession()) cloudNotifyLocalSave('urgent'); });


window.addEventListener('load', function(){ cloudBootAuthGate(); });
