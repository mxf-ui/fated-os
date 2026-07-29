/* ============ CLOUD ACCOUNT + ENCRYPTED SYNC ============ */
var cloudSyncState = { user:null, key:null, email:'', lastRemote:null, busy:false };

function cloudSetStatus(text, tone){
  var el=document.getElementById('cloud-sync-status');
  if(!el) return;
  el.textContent=text||'';
  el.className='cloud-sync-status '+(tone||'');
}
function cloudSetBusy(on){
  cloudSyncState.busy=!!on;
  ['cloud-login-btn','cloud-register-btn','cloud-upload-btn','cloud-restore-btn','cloud-logout-btn'].forEach(function(id){
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
    email:(document.getElementById('cloud-email')||{}).value||'',
    password:(document.getElementById('cloud-password')||{}).value||''
  };
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
  if(emailEl) emailEl.textContent=signed ? cloudSyncState.user.email : 'Not signed in';
  if(authBox) authBox.style.display=signed && cloudSyncState.key ? 'none' : 'block';
  if(actionBox) actionBox.style.display=signed && cloudSyncState.key ? 'block' : 'none';
  var savedEmail=''; try{ savedEmail=localStorage.getItem('fated_cloud_email')||''; }catch(e){}
  var emailInput=document.getElementById('cloud-email'); if(emailInput && !emailInput.value) emailInput.value=cloudSyncState.email||savedEmail;
}
async function cloudSyncInit(){
  cloudRenderAuthState();
  cloudSetStatus('Checking account...', '');
  try{
    var me=await cloudApi('/api/auth/me');
    cloudApplyUser(me.user, null);
    cloudSetStatus(cloudSyncState.key ? 'Cloud sync is unlocked.' : 'Signed in. Enter password once to unlock encrypted sync.', '');
  }catch(e){
    cloudSyncState.user=null; cloudSyncState.key=null; cloudRenderAuthState();
    cloudSetStatus(e.data && e.data.setupRequired ? 'Cloud database is not configured yet.' : 'Sign in or create an account to enable cloud save.', e.data && e.data.setupRequired ? 'warn' : '');
  }
}
async function cloudLogin(){
  var input=cloudReadInputs();
  if(!input.email || !input.password) return cloudSetStatus('Email and password are required.', 'warn');
  cloudSetBusy(true); cloudSetStatus('Signing in...', '');
  try{
    var data=await cloudApi('/api/auth/login', {method:'POST', body:JSON.stringify(input)});
    var key=await cloudDeriveKey(input.password, data.user.encryptionSalt);
    cloudApplyUser(data.user, key);
    cloudSetStatus('Signed in. You can upload or restore cloud save now.', 'ok');
  }catch(e){ cloudSetStatus(e.message, 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudRegister(){
  var input=cloudReadInputs();
  if(!input.email || !input.password) return cloudSetStatus('Email and password are required.', 'warn');
  if(input.password.length<8) return cloudSetStatus('Password needs at least 8 characters.', 'warn');
  cloudSetBusy(true); cloudSetStatus('Creating account...', '');
  try{
    var data=await cloudApi('/api/auth/register', {method:'POST', body:JSON.stringify(input)});
    var key=await cloudDeriveKey(input.password, data.user.encryptionSalt);
    cloudApplyUser(data.user, key);
    cloudSetStatus('Account created. Upload your current local save to cloud.', 'ok');
  }catch(e){ cloudSetStatus(e.message, 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudLogout(){
  cloudSetBusy(true);
  try{ await cloudApi('/api/auth/logout', {method:'POST', body:'{}'}); }catch(e){}
  cloudSyncState.user=null; cloudSyncState.key=null; cloudRenderAuthState();
  cloudSetStatus('Signed out. Local data is still on this device.', '');
  cloudSetBusy(false);
}
function cloudCollectChats(){
  return Object.keys(contacts||{}).filter(function(id){ return id!=='me'; }).map(function(id){
    var c=contacts[id]||{};
    return { id:id, seed:c.seed||[], pendingCount:c.pendingCount||0, blocked:!!c.blocked, unread:c.unread||0, memory:c.memory||null, worldBooks:c.worldBooks||[], groupUserPrompt:c.groupUserPrompt||'' };
  });
}
function cloudApplyChats(rows){
  if(!Array.isArray(rows)) return;
  rows.forEach(function(row){
    if(!row || !row.id || !contacts[row.id]) return;
    if(Array.isArray(row.seed)) contacts[row.id].seed=row.seed;
    if(typeof row.pendingCount==='number') contacts[row.id].pendingCount=row.pendingCount;
    if(typeof row.unread==='number') contacts[row.id].unread=row.unread;
    contacts[row.id].blocked=!!row.blocked;
    if(row.memory) contacts[row.id].memory=row.memory;
    if(Array.isArray(row.worldBooks)) contacts[row.id].worldBooks=row.worldBooks;
    if(typeof row.groupUserPrompt==='string') contacts[row.id].groupUserPrompt=row.groupUserPrompt;
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
  saveState();
  await cloudSaveAllChats();
  await cloudSaveStickers();
  return {
    schemaVersion:1,
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
async function cloudRestoreSnapshotPayload(payload){
  if(!payload || !payload.state) throw new Error('Cloud save is empty or invalid.');
  applyStateSnapshot(payload.state);
  var a=payload.assets||{};
  applyProfileAssets(a.profile); applyMomentsAssets(a.moments); applyContactAssets(a.contacts); applyFontSnapshot(a.font);
  if(a.widgetCustom && typeof a.widgetCustom==='object') widgetCustom=a.widgetCustom;
  if(Array.isArray(a.appIconImgs)) applyAppIconAssets(a.appIconImgs);
  if(a.lockWp && typeof a.lockWp==='object') lockWp=a.lockWp;
  if(a.homeWp && typeof a.homeWp==='object') homeWp=a.homeWp;
  if(Array.isArray(a.stickers)) stickers=a.stickers;
  cloudApplyChats(payload.chats);
  await cloudWriteKV('fated_state_core_backup', buildLightState());
  await cloudWriteKV('profileAssets', buildProfileAssets());
  await cloudWriteKV('momentsAssets', buildMomentsAssets());
  await cloudWriteKV('contactAssets', buildContactAssets());
  await cloudWriteKV('fontConfigAssets', buildFontAssets());
  await cloudWriteKV('widgetCustom', widgetCustom);
  await cloudWriteKV('appIconImgs', appIcons.map(function(icon){ return {id:icon.id, img:icon.img}; }));
  await cloudWriteKV('lockWp', lockWp);
  await cloudWriteKV('homeWp', homeWp);
  await cloudSaveAllChats();
  await cloudSaveStickers();
  saveState();
  repaintPersistentAssets();
  renderChatList(); renderThread(); populateViewAs();
}
async function cloudUploadNow(){
  if(!cloudSyncState.user || !cloudSyncState.key) return cloudSetStatus('Sign in with password first.', 'warn');
  cloudSetBusy(true); cloudSetStatus('Encrypting local save...', '');
  try{
    var snapshot=await cloudBuildLocalSnapshot();
    var encrypted=await cloudEncryptSnapshot(snapshot, cloudSyncState.key);
    var data=await cloudApi('/api/sync', {method:'PUT', body:JSON.stringify({ciphertext:encrypted.ciphertext, iv:encrypted.iv, schemaVersion:1, clientUpdatedAt:snapshot.savedAt, meta:{device:navigator.userAgent, appVersion:'fated-os-split'}})});
    cloudSyncState.lastRemote=data.updatedAt;
    cloudSetStatus('Uploaded encrypted cloud save at '+new Date(data.updatedAt).toLocaleString()+'.', 'ok');
  }catch(e){ cloudSetStatus(e.message, 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudRestoreNow(){
  if(!cloudSyncState.user || !cloudSyncState.key) return cloudSetStatus('Sign in with password first.', 'warn');
  if(!confirm('Restore cloud save to this device? Current local data will be replaced by the cloud snapshot.')) return;
  cloudSetBusy(true); cloudSetStatus('Downloading cloud save...', '');
  try{
    var data=await cloudApi('/api/sync');
    if(!data.snapshot) throw new Error('No cloud save found. Upload once from your main device first.');
    cloudSetStatus('Decrypting cloud save...', '');
    var payload=await cloudDecryptSnapshot(data.snapshot, cloudSyncState.key);
    await cloudRestoreSnapshotPayload(payload);
    cloudSetStatus('Cloud save restored. Local data has been refreshed.', 'ok');
  }catch(e){ cloudSetStatus(e.message || 'Restore failed', 'warn'); }
  finally{ cloudSetBusy(false); }
}
