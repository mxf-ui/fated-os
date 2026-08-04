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

var CLOUD_MSG = {
  SIGN_IN_UNLOCK:'Sign in to unlock cloud save. / \u8bf7\u767b\u5f55\u540e\u540c\u6b65\u5b58\u6863\u3002',
  CHECKING:'Checking account... / \u6b63\u5728\u68c0\u67e5\u8d26\u53f7\u3002',
  ENTER_UNLOCK:'Enter password and invite code to unlock encrypted cloud save. / \u8bf7\u8f93\u5165\u5bc6\u7801\u548c\u9080\u8bf7\u7801\u89e3\u9501\u4e91\u5b58\u6863\u3002',
    SIGN_IN_CREATE_ENTER:'New users tap Register first; existing users tap Login. / \u65b0\u7528\u6237\u8bf7\u5148\u70b9\u6ce8\u518c\uff0c\u8001\u7528\u6237\u76f4\u63a5\u767b\u5f55\u3002',
  SIGN_IN_ENTER:'Sign in to enter. / \u8bf7\u767b\u5f55\u540e\u8fdb\u5165\u3002',
  SYNC_UNLOCKED:'Cloud sync is unlocked. / \u4e91\u7aef\u540c\u6b65\u5df2\u89e3\u9501\u3002',
  SIGNED_IN_UNLOCK:'Signed in. Enter password and invite code once to unlock encrypted sync. / \u5df2\u767b\u5f55\uff0c\u8bf7\u8f93\u5165\u5bc6\u7801\u548c\u9080\u8bf7\u7801\u89e3\u9501\u52a0\u5bc6\u540c\u6b65\u3002',
  D1_MISSING:'Cloud database is not configured yet. / \u4e91\u7aef\u6570\u636e\u5e93\u8fd8\u672a\u914d\u7f6e\u3002',
    SIGN_IN_CREATE_SYNC:'New users tap Register first; existing users tap Login. / \u65b0\u7528\u6237\u8bf7\u5148\u70b9\u6ce8\u518c\uff0c\u8001\u7528\u6237\u76f4\u63a5\u767b\u5f55\u3002',
  EMAIL_PASSWORD_REQUIRED:'Email and password are required. / \u8bf7\u586b\u5199\u90ae\u7bb1\u548c\u5bc6\u7801\u3002',
  INVITE_REQUIRED:'Invite code is required. / \u8bf7\u586b\u5199\u9080\u8bf7\u7801\u3002',
  SIGNING_IN:'Signing in... / \u6b63\u5728\u767b\u5f55\u3002',
  SIGNED_SYNCING:'Signed in. Syncing save... / \u5df2\u767b\u5f55\uff0c\u6b63\u5728\u540c\u6b65\u5b58\u6863\u3002',
  SYNCING_SAVE:'Syncing cloud save... / \u6b63\u5728\u540c\u6b65\u4e91\u5b58\u6863\u3002',
  SIGN_IN_FAILED:'Sign in failed. / \u767b\u5f55\u5931\u8d25\u3002',
  PASSWORD_LENGTH:'Password needs at least 8 characters. / \u5bc6\u7801\u81f3\u5c11\u9700\u8981 8 \u4f4d\u3002',
  CREATING_ACCOUNT:'Creating account... / \u6b63\u5728\u521b\u5efa\u8d26\u53f7\u3002',
  ACCOUNT_CREATED:'Account created. Uploading current save... / \u8d26\u53f7\u5df2\u521b\u5efa\uff0c\u6b63\u5728\u4e0a\u4f20\u5f53\u524d\u5b58\u6863\u3002',
  UPLOADING_SAVE:'Uploading current save... / \u6b63\u5728\u4e0a\u4f20\u5f53\u524d\u5b58\u6863\u3002',
  CREATE_FAILED:'Create account failed. / \u6ce8\u518c\u5931\u8d25\u3002',
  SIGNED_OUT_ENTER:'Signed out. Sign in again to enter. / \u5df2\u9000\u51fa\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55\u540e\u8fdb\u5165\u3002',
  SIGNED_OUT_LOCAL:'Signed out. Local data is still on this device. / \u5df2\u9000\u51fa\uff0c\u672c\u673a\u6570\u636e\u4ecd\u4fdd\u7559\u3002'
};

function cloudSetStatus(text, tone){
  var el=document.getElementById('cloud-sync-status');
  if(!el) return;
  el.textContent=text||'';
  el.className='cloud-sync-status '+(tone||'');
  if(typeof saveDiagnosticsRender==='function') saveDiagnosticsRender();
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
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:cloudB64ToBytes(saltBase64), iterations:150000, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, true, ['encrypt','decrypt']);
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
function cloudRememberKeyId(user){
  var id=(user && user.id) || (cloudSyncState.user && cloudSyncState.user.id) || '';
  return id ? 'fated_cloud_unlock_key_'+id : '';
}
async function cloudRememberUnlock(user, key){
  if(!user || !key || !crypto || !crypto.subtle) return false;
  try{
    var raw=await crypto.subtle.exportKey('raw', key);
    var storageKey=cloudRememberKeyId(user);
    if(!storageKey) return false;
    localStorage.setItem(storageKey, cloudBytesToB64(new Uint8Array(raw)));
    localStorage.setItem('fated_cloud_user_id', user.id||'');
    return true;
  }catch(e){ return false; }
}
async function cloudLoadRememberedUnlock(user){
  if(!user || !crypto || !crypto.subtle) return null;
  try{
    var storageKey=cloudRememberKeyId(user);
    var raw=storageKey ? localStorage.getItem(storageKey) : '';
    if(!raw) return null;
    return await crypto.subtle.importKey('raw', cloudB64ToBytes(raw), {name:'AES-GCM'}, true, ['encrypt','decrypt']);
  }catch(e){
    cloudForgetRememberedUnlock(user);
    return null;
  }
}
function cloudForgetRememberedUnlock(user){
  try{
    var storageKey=cloudRememberKeyId(user);
    if(storageKey) localStorage.removeItem(storageKey);
    var id=(user && user.id) || (cloudSyncState.user && cloudSyncState.user.id) || '';
    var rememberedId=localStorage.getItem('fated_cloud_user_id')||'';
    if(!id || rememberedId===id) localStorage.removeItem('fated_cloud_user_id');
  }catch(e){}
}
function cloudSupabaseConfig(){
  var c=window.FATED_SUPABASE_CONFIG||{};
  return {
    url:String(c.url||window.FATED_SUPABASE_URL||'').trim(),
    anonKey:String(c.anonKey||window.FATED_SUPABASE_ANON_KEY||'').trim(),
    assetBucket:String(c.assetBucket||window.FATED_SUPABASE_ASSET_BUCKET||'fated-assets').trim()||'fated-assets'
  };
}
var cloudSupabaseClientCache=null;
function cloudSetupError(){
  var err=new Error('Supabase is not configured yet. Fill js/main/core/08a-supabase-config.js first. / \u8bf7\u5148\u586b\u5199 Supabase \u914d\u7f6e\u6587\u4ef6\u3002');
  err.data={setupRequired:true};
  return err;
}
function cloudSupabaseClient(){
  var cfg=cloudSupabaseConfig();
  if(!cfg.url || !cfg.anonKey || cfg.url.indexOf('YOUR_')>=0 || cfg.anonKey.indexOf('YOUR_')>=0) throw cloudSetupError();
  if(!window.supabase || !window.supabase.createClient) throw new Error('Supabase SDK failed to load. / Supabase SDK \u52a0\u8f7d\u5931\u8d25\u3002');
  if(!cloudSupabaseClientCache){
    cloudSupabaseClientCache=window.supabase.createClient(cfg.url, cfg.anonKey, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
  }
  return cloudSupabaseClientCache;
}
function cloudFriendlyAuthMessage(error, fallback){
  var raw=String((error && (error.message || error.error_description || error.code)) || fallback || 'Supabase request failed');
  var lower=raw.toLowerCase();
  if(lower.indexOf('invalid login credentials')>=0 || lower.indexOf('invalid credentials')>=0){
    return 'Account not found or password is wrong. New users must tap Register first. / \u8d26\u53f7\u4e0d\u5b58\u5728\u6216\u5bc6\u7801\u9519\u8bef\u3002\u65b0\u7528\u6237\u8bf7\u5148\u70b9\u6ce8\u518c\u3002';
  }
  if(lower.indexOf('email not confirmed')>=0 || lower.indexOf('confirm')>=0){
    return 'Email is not confirmed. Please open the confirmation email, or turn off Supabase email confirmation for invite-only testing. / \u90ae\u7bb1\u8fd8\u6ca1\u6709\u786e\u8ba4\u3002';
  }
  if(lower.indexOf('email rate limit exceeded')>=0 || (lower.indexOf('rate limit')>=0 && lower.indexOf('email')>=0)){
    return 'Email registration is temporarily rate-limited. Wait a few minutes, change another email, or turn off Supabase email confirmation. / \u90ae\u4ef6\u6ce8\u518c\u89e6\u53d1\u9891\u7387\u9650\u5236\u3002';
  }
  if(lower.indexOf('user already registered')>=0 || lower.indexOf('already registered')>=0 || lower.indexOf('already exists')>=0){
    return 'This email is already registered. Please tap Login instead. / \u8fd9\u4e2a\u90ae\u7bb1\u5df2\u7ecf\u6ce8\u518c\u8fc7\u4e86\uff0c\u8bf7\u76f4\u63a5\u767b\u5f55\u3002';
  }
  if(lower.indexOf('password')>=0 && lower.indexOf('6')>=0){
    return CLOUD_MSG.PASSWORD_LENGTH;
  }
  if(lower.indexOf('invite_invalid')>=0 || lower.indexOf('invite code invalid')>=0){
    return 'Invite code is invalid. / \u9080\u8bf7\u7801\u65e0\u6548\u3002';
  }
  if(lower.indexOf('invite_exhausted')>=0){
    return 'Invite code has been used up. / \u9080\u8bf7\u7801\u6b21\u6570\u5df2\u7528\u5b8c\u3002';
  }
  if(lower.indexOf('not_authenticated')>=0){
    return 'Please log in or register first, then the invite code can be verified. / \u8bf7\u5148\u767b\u5f55\u6216\u6ce8\u518c\uff0c\u518d\u9a8c\u8bc1\u9080\u8bf7\u7801\u3002';
  }
  return raw;
}
function cloudThrowSupabase(error, fallback){
  if(!error) return;
  var err=new Error(cloudFriendlyAuthMessage(error, fallback));
  err.data=error;
  throw err;
}
function cloudNormalizeUser(authUser, profile){
  profile=profile||{};
  return {id:authUser.id, email:authUser.email||profile.email||'', encryptionSalt:profile.encryption_salt||profile.encryptionSalt||''};
}
function cloudRandomB64(length){
  var bytes=new Uint8Array(length||16);
  crypto.getRandomValues(bytes);
  return cloudBytesToB64(bytes);
}
async function cloudGetCurrentUser(){
  var sb=cloudSupabaseClient();
  var res=await sb.auth.getSession();
  cloudThrowSupabase(res.error, 'Unable to read session');
  var authUser=res.data && res.data.session && res.data.session.user;
  if(!authUser) return null;
  var profile=await cloudGetProfile(authUser.id);
  return cloudNormalizeUser(authUser, profile||{});
}
async function cloudGetProfile(userId){
  var sb=cloudSupabaseClient();
  var res=await sb.from('fated_profiles').select('id,email,encryption_salt,created_at,updated_at').eq('id', userId).maybeSingle();
  cloudThrowSupabase(res.error, 'Unable to read profile');
  return res.data||null;
}
async function cloudUpsertProfile(authUser, salt){
  var sb=cloudSupabaseClient();
  var row={id:authUser.id, email:authUser.email||'', encryption_salt:salt, updated_at:new Date().toISOString()};
  var res=await sb.from('fated_profiles').upsert(row, {onConflict:'id'}).select('id,email,encryption_salt').single();
  cloudThrowSupabase(res.error, 'Unable to save profile');
  return cloudNormalizeUser(authUser, res.data);
}
async function cloudRedeemInvite(inviteCode){
  var sb=cloudSupabaseClient();
  var res=await sb.rpc('redeem_fated_invite', {code_input:inviteCode});
  if(res.error) throw new Error((res.error.message||'Invite code invalid')+' / \u9080\u8bf7\u7801\u65e0\u6548\u6216\u5df2\u7528\u5b8c\u3002');
  if(res.data!==true) throw new Error('Invite code invalid or exhausted. / \u9080\u8bf7\u7801\u65e0\u6548\u6216\u5df2\u7528\u5b8c\u3002');
  return true;
}
async function cloudSignInWithPassword(email, password){
  var sb=cloudSupabaseClient();
  var res=await sb.auth.signInWithPassword({email:email, password:password});
  cloudThrowSupabase(res.error, 'Sign in failed');
  if(!res.data || !res.data.user) throw new Error('Sign in failed. / \u767b\u5f55\u5931\u8d25\u3002');
  return res.data.user;
}
async function cloudCreateAccount(email, password){
  var sb=cloudSupabaseClient();
  var res=await sb.auth.signUp({email:email, password:password});
  cloudThrowSupabase(res.error, 'Create account failed');
  var user=res.data && res.data.user;
  if(!user || !(res.data && res.data.session)) user=await cloudSignInWithPassword(email, password);
  return user;
}
async function cloudFetchRemoteSnapshot(){
  var sb=cloudSupabaseClient();
  var user=cloudSyncState.user;
  if(!user) return {snapshot:null};
  var res=await sb.from('fated_snapshots').select('ciphertext,iv,schema_version,client_updated_at,updated_at,meta').eq('user_id', user.id).maybeSingle();
  cloudThrowSupabase(res.error, 'Unable to download cloud save');
  if(!res.data) return {snapshot:null};
  var updatedAt=Date.parse(res.data.updated_at||'')||Number(res.data.client_updated_at)||0;
  return {snapshot:{ciphertext:res.data.ciphertext, iv:res.data.iv, schemaVersion:res.data.schema_version||2, clientUpdatedAt:Number(res.data.client_updated_at)||0, updatedAt:updatedAt, meta:res.data.meta||{}}, updatedAt:updatedAt};
}
async function cloudPutRemoteSnapshot(encrypted, snapshot, opts){
  var sb=cloudSupabaseClient();
  var user=cloudSyncState.user;
  if(!user) throw new Error('Not signed in. / \u672a\u767b\u5f55\u3002');
  var updatedIso=new Date().toISOString();
  var row={
    user_id:user.id,
    ciphertext:encrypted.ciphertext,
    iv:encrypted.iv,
    schema_version:snapshot.schemaVersion||2,
    client_updated_at:snapshot.savedAt,
    updated_at:updatedIso,
    meta:{device:navigator.userAgent, appVersion:'fated-os-supabase-autosync', reason:(opts&&opts.reason)||''}
  };
  var res=await sb.from('fated_snapshots').upsert(row, {onConflict:'user_id'}).select('updated_at,client_updated_at').single();
  cloudThrowSupabase(res.error, 'Unable to upload cloud save');
  var updatedAt=Date.parse((res.data&&res.data.updated_at)||updatedIso)||Date.now();
  return {updatedAt:updatedAt};
}
function cloudAssetExt(mime){
  if(mime==='image/jpeg') return '.jpg';
  if(mime==='image/png') return '.png';
  if(mime==='image/webp') return '.webp';
  if(mime==='image/gif') return '.gif';
  if(mime==='audio/mpeg') return '.mp3';
  if(mime==='audio/wav') return '.wav';
  if(mime==='audio/ogg') return '.ogg';
  return '';
}
function cloudHex(bytes){
  return Array.prototype.map.call(bytes, function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}
async function cloudUploadSupabaseAsset(parsed){
  if(!cloudSyncState.user) return null;
  var sb=cloudSupabaseClient();
  var cfg=cloudSupabaseConfig();
  var bytes=cloudB64ToBytes(parsed.base64);
  var hash=new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  var assetPath=cloudSyncState.user.id+'/assets/'+cloudHex(hash)+cloudAssetExt(parsed.mimeType);
  var blob=new Blob([bytes], {type:parsed.mimeType});
  var res=await sb.storage.from(cfg.assetBucket).upload(assetPath, blob, {cacheControl:'31536000', upsert:true, contentType:parsed.mimeType});
  cloudThrowSupabase(res.error, 'Unable to upload asset');
  var publicRes=sb.storage.from(cfg.assetBucket).getPublicUrl(assetPath);
  return publicRes && publicRes.data ? publicRes.data.publicUrl : null;
}
async function cloudApi(path, options){
  throw cloudSetupError();
}
function cloudClonePlain(value, fallback){
  try{ return JSON.parse(JSON.stringify(value)); }
  catch(e){ return fallback; }
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
  if(msg){ msg.textContent=message||CLOUD_MSG.SIGN_IN_UNLOCK; msg.className='cloud-entry-msg '+(tone||''); }
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
  return cloudLogin({fromEntry:true, input:input});
}
async function cloudEntryRegister(){
  var input=cloudReadEntryInputs();
  cloudFillAuthInputsFromEntry(input);
  return cloudRegister({fromEntry:true, input:input});
}
async function cloudBootAuthGate(){
  cloudShowEntryGate(CLOUD_MSG.CHECKING);
  try{
    await cloudSyncInit();
    if(cloudHasSession()) cloudHideEntryGate();
    else cloudShowEntryGate(cloudSyncState.user ? CLOUD_MSG.ENTER_UNLOCK : CLOUD_MSG.SIGN_IN_CREATE_ENTER);
  }catch(e){
    cloudShowEntryGate((e && e.message) || CLOUD_MSG.SIGN_IN_ENTER, 'warn');
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
    if(emailEl) emailEl.textContent=signed ? cloudSyncState.user.email : 'Not signed in / \u672a\u767b\u5f55';
  if(authBox) authBox.style.display=signed && cloudSyncState.key ? 'none' : 'block';
  if(actionBox) actionBox.style.display=signed && cloudSyncState.key ? 'block' : 'none';
  var savedEmail=''; try{ savedEmail=localStorage.getItem('fated_cloud_email')||''; }catch(e){}
  var emailInput=document.getElementById('cloud-email'); if(emailInput && !emailInput.value) emailInput.value=cloudSyncState.email||savedEmail;
}
function cloudHasSession(){ return !!(cloudSyncState.user && cloudSyncState.key); }
function cloudTouchStatus(text, tone){
  if(document.getElementById('sheet-cloudsync') && document.getElementById('cloud-sync-status')) cloudSetStatus(text, tone);
}

function cloudWaitForPersistenceReady(opts){
  opts=opts||{};
  var timeout=Number(opts.timeout||15000);
  var started=Date.now();
  if(typeof isPersistenceBooting!=='function' || !isPersistenceBooting()) return Promise.resolve(true);
  if(opts.status!==false) cloudSetStatus('Local data is still loading... / \u672c\u5730\u6570\u636e\u8fd8\u5728\u6062\u590d\uff0c\u7a0d\u7b49\u540e\u518d\u540c\u6b65\u3002', '');
  return new Promise(function(resolve, reject){
    function tick(){
      if(typeof isPersistenceBooting!=='function' || !isPersistenceBooting()) return resolve(true);
      if(Date.now()-started>timeout) return reject(new Error('Local data is still loading. Please wait a few seconds and try again. / \u672c\u5730\u6570\u636e\u8fd8\u6ca1\u6062\u590d\u5b8c\u6210\uff0c\u8bf7\u7a0d\u7b49\u51e0\u79d2\u540e\u91cd\u8bd5\u3002'));
      setTimeout(tick, 120);
    }
    tick();
  });
}
async function cloudSyncInit(){
  cloudRenderAuthState();
  cloudSetStatus('Checking account...', '');
  try{
    var user=await cloudGetCurrentUser();
    if(!user) throw new Error(CLOUD_MSG.SIGN_IN_CREATE_SYNC);
    var rememberedKey=await cloudLoadRememberedUnlock(user);
    cloudApplyUser(user, rememberedKey);
    if(cloudHasSession()){
      cloudHideEntryGate();
      cloudSetStatus(CLOUD_MSG.SYNC_UNLOCKED, '');
      if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-auth-ready', '已使用记住的密钥解锁云同步。', {}, 'ok');
      await cloudAutoSyncAfterUnlock('remembered');
    }else{
      cloudSetStatus(CLOUD_MSG.SIGNED_IN_UNLOCK, '');
      cloudShowEntryGate(CLOUD_MSG.ENTER_UNLOCK);
    }
  }catch(e){
    cloudSyncState.user=null; cloudSyncState.key=null; cloudRenderAuthState();
    cloudSetStatus(e.data && e.data.setupRequired ? 'Supabase is not configured. / \u8bf7\u5148\u914d\u7f6e Supabase\u3002' : CLOUD_MSG.SIGN_IN_CREATE_SYNC, e.data && e.data.setupRequired ? 'warn' : '');
    cloudShowEntryGate(e.data && e.data.setupRequired ? 'Supabase is not configured. / \u8bf7\u5148\u914d\u7f6e Supabase\u3002' : CLOUD_MSG.SIGN_IN_CREATE_ENTER, e.data && e.data.setupRequired ? 'warn' : '');
  }
}
async function cloudLogin(opts){
  opts=opts||{};
  var input=opts.input||cloudReadInputs();
  if(!input.email || !input.password){ cloudShowEntryGate(CLOUD_MSG.EMAIL_PASSWORD_REQUIRED, 'warn'); return cloudSetStatus(CLOUD_MSG.EMAIL_PASSWORD_REQUIRED, 'warn'); }
  if(!input.inviteCode){ cloudShowEntryGate(CLOUD_MSG.INVITE_REQUIRED, 'warn'); return cloudSetStatus(CLOUD_MSG.INVITE_REQUIRED, 'warn'); }
  cloudSetBusy(true); cloudSetStatus('Signing in...', ''); cloudShowEntryGate(CLOUD_MSG.SIGNING_IN);
  try{
    var authUser=await cloudSignInWithPassword(input.email, input.password);
    await cloudRedeemInvite(input.inviteCode);
    var profile=await cloudGetProfile(authUser.id);
    var user=profile && profile.encryption_salt ? cloudNormalizeUser(authUser, profile) : await cloudUpsertProfile(authUser, cloudRandomB64(16));
    var key=await cloudDeriveKey(input.password, user.encryptionSalt);
    cloudApplyUser(user, key);
    await cloudRememberUnlock(user, key);
    cloudSetStatus(CLOUD_MSG.SIGNED_SYNCING, '');
    cloudShowEntryGate(CLOUD_MSG.SYNCING_SAVE);
    if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-login-success', '账号登录成功，开始合并云端与本机数据。', {email:user.email||''}, 'ok');
    await cloudAutoSyncAfterUnlock('login');
    cloudHideEntryGate();
  }catch(e){ if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-login-failed', e.message || CLOUD_MSG.SIGN_IN_FAILED, {}, 'warn'); cloudSetStatus(e.message, 'warn'); cloudShowEntryGate(e.message || CLOUD_MSG.SIGN_IN_FAILED, 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudRegister(opts){
  opts=opts||{};
  var input=opts.input||cloudReadInputs();
  if(!input.email || !input.password){ cloudShowEntryGate(CLOUD_MSG.EMAIL_PASSWORD_REQUIRED, 'warn'); return cloudSetStatus(CLOUD_MSG.EMAIL_PASSWORD_REQUIRED, 'warn'); }
  if(!input.inviteCode){ cloudShowEntryGate(CLOUD_MSG.INVITE_REQUIRED, 'warn'); return cloudSetStatus(CLOUD_MSG.INVITE_REQUIRED, 'warn'); }
  if(input.password.length<8){ cloudShowEntryGate(CLOUD_MSG.PASSWORD_LENGTH, 'warn'); return cloudSetStatus(CLOUD_MSG.PASSWORD_LENGTH, 'warn'); }
  cloudSetBusy(true); cloudSetStatus('Creating account...', ''); cloudShowEntryGate(CLOUD_MSG.CREATING_ACCOUNT);
  try{
    var authUser=await cloudCreateAccount(input.email, input.password);
    await cloudRedeemInvite(input.inviteCode);
    var existingProfile=await cloudGetProfile(authUser.id);
    var user=existingProfile && existingProfile.encryption_salt ? cloudNormalizeUser(authUser, existingProfile) : await cloudUpsertProfile(authUser, cloudRandomB64(16));
    var key=await cloudDeriveKey(input.password, user.encryptionSalt);
    cloudApplyUser(user, key);
    await cloudRememberUnlock(user, key);
    cloudSetStatus(CLOUD_MSG.ACCOUNT_CREATED, '');
    cloudShowEntryGate(CLOUD_MSG.SYNCING_SAVE);
    if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-register-success', '账号创建成功，开始上传当前本机数据。', {email:user.email||''}, 'ok');
    await cloudAutoSyncAfterUnlock('register');
    cloudHideEntryGate();
  }catch(e){ if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-register-failed', e.message || CLOUD_MSG.CREATE_FAILED, {}, 'warn'); cloudSetStatus(e.message, 'warn'); cloudShowEntryGate(e.message || CLOUD_MSG.CREATE_FAILED, 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudLogout(){
  cloudSetBusy(true);
  try{ await cloudSupabaseClient().auth.signOut(); }catch(e){}
  if(cloudSyncState.autosaveTimer) clearTimeout(cloudSyncState.autosaveTimer);
  cloudForgetRememberedUnlock();
  cloudSyncState.user=null; cloudSyncState.key=null; cloudSyncState.autosaveTimer=null; cloudSyncState.autosaveInFlight=false; cloudSyncState.autosavePending=false;
  cloudRenderAuthState();
  cloudShowEntryGate(CLOUD_MSG.SIGNED_OUT_ENTER);
  if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-logout', '账号已退出，本机数据仍保留。', {}, 'warn');
  cloudSetStatus(CLOUD_MSG.SIGNED_OUT_LOCAL, '');
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
  await cloudWaitForPersistenceReady({status:false});
  await cloudSaveAllChats();
  await cloudSaveStickers();
  var changedAt = (typeof getLocalPersistenceLastChangedAt==='function') ? getLocalPersistenceLastChangedAt() : 0;
  var snapshot = {
    schemaVersion:2,
    savedAt:changedAt,
    state:buildLightState(),
    assets:{
      profile:buildProfileAssets(),
      moments:buildMomentsAssets(),
      contacts:buildContactAssets(),
      font:buildFontAssets(),
      widgetCustom:cloudClonePlain(widgetCustom, {}),
      appIconImgs:cloudClonePlain(appIcons.map(function(a){ return {id:a.id, img:a.img}; }), []),
      lockWp:cloudClonePlain(lockWp, {}),
      homeWp:cloudClonePlain(homeWp, {}),
      stickers:cloudClonePlain(stickers, [])
    },
    chats:cloudCollectChats()
  };
  return (typeof fatedSanitizeLegacyDefaultCloudPayload==='function') ? fatedSanitizeLegacyDefaultCloudPayload(snapshot) : snapshot;
}
function cloudHasConfiguredApiState(s){
  s = s || {};
  var cfg = s.apiConfig || {};
  if(Array.isArray(cfg.profiles) && cfg.profiles.some(function(p){ return p && String(p.key||'').trim(); })) return true;
  if(cfg.models && typeof cfg.models==='object' && Object.keys(cfg.models).some(function(k){ var m=cfg.models[k]; return m && String(m.key||'').trim(); })) return true;
  var t = cfg.tts || {};
  if(t.elevenlabs && String(t.elevenlabs.key||'').trim()) return true;
  if(t.minimax && (String(t.minimax.key||'').trim() || String(t.minimax.groupId||'').trim())) return true;
  if(t.custom && (String(t.custom.key||'').trim() || String(t.custom.endpoint||'').trim() || String(t.custom.voice||'').trim())) return true;
  var img = cfg.imageGen || {};
  if(img.enabled===true && (String(img.key||'').trim() || String(img.endpoint||'').trim() || String(img.model||'').trim())) return true;
  return false;
}
function cloudSnapshotWeight(payload){
  if(!payload) return 0;
  var s=payload.state||{}, score=0;
  if(Array.isArray(s.contactsExtra)) score += s.contactsExtra.length * 3;
  if(Array.isArray(payload.chats)) payload.chats.forEach(function(c){ if(Array.isArray(c.seed)) score += c.seed.length; });
  if(cloudHasConfiguredApiState(s)) score += 4;
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
function cloudUserDataWeight(payload){
  if(!payload) return 0;
  var s=payload.state||{}, a=payload.assets||{}, score=0;
  var contactsExtra=Array.isArray(s.contactsExtra) ? s.contactsExtra : [];
  contactsExtra.forEach(function(c){
    if(!c || !c.id || (typeof fatedIsLegacyDefaultContactId==='function' ? fatedIsLegacyDefaultContactId(c.id) : c.id===('fated_'+'default_contact'))) return;
    score += 4;
    if(c.avatar || c.cover) score += 2;
    if(c.tone || c.persona || c.bio || c.userPrompt) score += 2;
  });
  if(Array.isArray(payload.chats)){
    payload.chats.forEach(function(c){
      if(!c || !c.id || (typeof fatedIsLegacyDefaultContactId==='function' ? fatedIsLegacyDefaultContactId(c.id) : c.id===('fated_'+'default_contact'))) return;
      if(Array.isArray(c.seed) && c.seed.length) score += c.seed.length;
      if(c.avatar || c.cover) score += 2;
      if(c.tone || c.persona || c.bio || c.userPrompt) score += 2;
    });
  }
  if(cloudHasConfiguredApiState(s)) score += 4;
  if(s.worldBooks && typeof s.worldBooks==='object' && Object.keys(s.worldBooks).filter(function(k){ return k!=='wb1'; }).length) score += 4;
  if(s.coupleState) score += 3;
  if(s.dream) score += 3;
  if(s.nilflow) score += 3;
  if(a.profile && (a.profile.userAvatar || a.profile.userCover || a.profile.chatBg)) score += 4;
  if(a.moments && Array.isArray(a.moments.images) && a.moments.images.length) score += a.moments.images.length * 2;
  if(Array.isArray(a.contacts)) score += a.contacts.filter(function(c){ return c && c.id && c.id!=='me' && (c.avatar || c.cover); }).length * 2;
  if(a.widgetCustom && typeof a.widgetCustom==='object') score += Object.keys(a.widgetCustom).length * 2;
  if(Array.isArray(a.appIconImgs) && a.appIconImgs.some(function(i){ return i && i.img; })) score += 3;
  if(a.lockWp || a.homeWp) score += 2;
  if(Array.isArray(a.stickers) && a.stickers.length) score += 2;
  return score;
}
function cloudLocalHasRealSave(){
  if(typeof localPersistenceHasSavedData==='function' && localPersistenceHasSavedData()) return true;
  return false;
}
function cloudCanUploadSnapshot(snapshot, opts){
  opts = opts || {};
  if(cloudSnapshotHasMeaningfulUserData(snapshot)) return true;
  if(opts.manual===true){
    cloudTouchStatus('Local save is still empty, skipped blank cloud upload. / empty local save was not uploaded', 'warn');
    return false;
  }
  cloudTouchStatus('Local save is still empty, skipped blank cloud upload. / empty local save was not uploaded', 'warn');
  return false;
}
async function cloudFindBlockingRemoteSnapshot(snapshot, opts){
  opts = opts || {};
  if(!cloudHasSession()) return null;
  var remote = await cloudFetchRemoteSnapshot();
  if(!remote.snapshot) return null;
  var payload = await cloudDecryptSnapshot(remote.snapshot, cloudSyncState.key);
  payload = (typeof fatedSanitizeLegacyDefaultCloudPayload==='function') ? fatedSanitizeLegacyDefaultCloudPayload(payload) : payload;
  if(!cloudSnapshotHasMeaningfulUserData(payload)) return null;
  var remoteTime = Number(remote.snapshot.clientUpdatedAt || remote.snapshot.updatedAt || 0);
  var localTime = Number(snapshot && snapshot.savedAt || 0);
  var localMeaningful = cloudSnapshotHasMeaningfulUserData(snapshot);
  if(!localMeaningful || !localTime || remoteTime > localTime + 5000) return {remote:remote, payload:payload};
  return null;
}
function cloudSnapshotHasMeaningfulUserData(payload){
  if(!payload) return false;
  var s=payload.state||{}, a=payload.assets||{};
  if((s.userName&&String(s.userName).trim()) || (s.userWxid&&String(s.userWxid).trim()) || (s.userBio&&String(s.userBio).trim()) || (s.userPrefs&&String(s.userPrefs).trim())) return true;
  if(Array.isArray(s.contactsExtra) && s.contactsExtra.some(function(c){
    return c && c.id && c.id!=='me' && (c.avatar || c.cover || c.tone || c.persona || c.bio || c.userPrompt || c.wxid);
  })) return true;
  if(Array.isArray(payload.chats) && payload.chats.some(function(c){
    return c && c.id && c.id!=='me' && ((Array.isArray(c.seed) && c.seed.length>0) || c.avatar || c.cover || c.tone || c.persona || c.bio || c.userPrompt);
  })) return true;
  if(cloudHasConfiguredApiState(s)) return true;
  if(s.worldBooks && typeof s.worldBooks==='object' && Object.keys(s.worldBooks).filter(function(k){ return k!=='wb1'; }).length) return true;
  if(Array.isArray(s.moments) && s.moments.length>2) return true;
  if(a.profile && (a.profile.userAvatar || a.profile.userCover || a.profile.chatBg)) return true;
  if(a.moments && Array.isArray(a.moments.images) && a.moments.images.length) return true;
  if(Array.isArray(a.contacts) && a.contacts.some(function(c){ return c && c.id && c.id!=='me' && (c.avatar || c.cover); })) return true;
  if(a.widgetCustom && typeof a.widgetCustom==='object' && Object.keys(a.widgetCustom).length) return true;
  if(Array.isArray(a.appIconImgs) && a.appIconImgs.some(function(i){ return i && i.img; })) return true;
  if(a.lockWp || a.homeWp) return true;
  if(Array.isArray(a.stickers) && a.stickers.length) return true;
  return false;
}
function cloudShouldRestoreRemote(local, remotePayload, remoteSnapshot){
  var localWeight=cloudSnapshotWeight(local);
  var remoteWeight=cloudSnapshotWeight(remotePayload);
  var localUserWeight=cloudUserDataWeight(local);
  var remoteUserWeight=cloudUserDataWeight(remotePayload);
  var localMeaningful=cloudSnapshotHasMeaningfulUserData(local);
  var remoteMeaningful=cloudSnapshotHasMeaningfulUserData(remotePayload);
  var remoteTime=Number((remoteSnapshot && (remoteSnapshot.clientUpdatedAt || remoteSnapshot.updatedAt)) || 0);
  var localTime=Number((local && local.savedAt) || 0);
  if(remoteMeaningful && !localMeaningful) return true;
  if(remoteUserWeight>0 && localUserWeight===0) return true;
  if(!cloudLocalHasRealSave() && remoteWeight>0) return true;
  if(localWeight < 8 && remoteWeight >= localWeight) return true;
  if(remoteTime > (localTime + 5000)) return true;
  return false;
}

function cloudDataHasValue(value){
  if(value===undefined || value===null) return false;
  if(typeof value==='string') return value.trim()!=='';
  if(Array.isArray(value)) return value.length>0;
  if(typeof value==='object') return Object.keys(value).length>0;
  return true;
}
function cloudStableJson(value){
  try{ return JSON.stringify(value); }catch(e){ return String(value); }
}
function cloudMergePrimitiveArray(localArr, remoteArr){
  var out=[], seen={};
  (Array.isArray(remoteArr)?remoteArr:[]).concat(Array.isArray(localArr)?localArr:[]).forEach(function(item){
    var key=typeof item+'|'+String(item);
    if(seen[key]) return;
    seen[key]=1; out.push(item);
  });
  return out;
}
function cloudMergeArrayById(localArr, remoteArr, opts){
  opts=opts||{};
  var preferLocal=opts.preferLocal!==false;
  var out=[], map={};
  function add(item, fromLocal){
    if(!item || typeof item!=='object' || !item.id) return;
    var id=String(item.id);
    if(!map[id]){ map[id]=cloudClonePlain(item, {}); out.push(map[id]); return; }
    map[id]=cloudMergeDeep(fromLocal ? item : map[id], fromLocal ? map[id] : item, {preferLocal:preferLocal});
    for(var i=0;i<out.length;i++){ if(String(out[i].id)===id){ out[i]=map[id]; break; } }
  }
  (Array.isArray(remoteArr)?remoteArr:[]).forEach(function(item){ add(item, false); });
  (Array.isArray(localArr)?localArr:[]).forEach(function(item){ add(item, true); });
  return out;
}
function cloudMergeArrayValues(localArr, remoteArr, opts){
  localArr=Array.isArray(localArr)?localArr:[];
  remoteArr=Array.isArray(remoteArr)?remoteArr:[];
  var all=localArr.concat(remoteArr);
  if(!all.length) return [];
  if(all.every(function(v){ return !v || typeof v!=='object'; })) return cloudMergePrimitiveArray(localArr, remoteArr);
  if(all.some(function(v){ return v && typeof v==='object' && v.id; })) return cloudMergeArrayById(localArr, remoteArr, opts);
  var out=[], seen={};
  remoteArr.concat(localArr).forEach(function(item){
    var key=cloudStableJson(item);
    if(seen[key]) return;
    seen[key]=1; out.push(cloudClonePlain(item, item));
  });
  return out;
}
function cloudMergeDeep(localValue, remoteValue, opts){
  opts=opts||{};
  var preferLocal=opts.preferLocal!==false;
  if(Array.isArray(localValue) || Array.isArray(remoteValue)) return cloudMergeArrayValues(localValue, remoteValue, opts);
  var localObj=localValue && typeof localValue==='object';
  var remoteObj=remoteValue && typeof remoteValue==='object';
  if(localObj || remoteObj){
    var out={};
    var keys={};
    if(remoteObj) Object.keys(remoteValue).forEach(function(k){ keys[k]=1; });
    if(localObj) Object.keys(localValue).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out[k]=cloudMergeDeep(localObj?localValue[k]:undefined, remoteObj?remoteValue[k]:undefined, opts); });
    return out;
  }
  var preferred=preferLocal ? localValue : remoteValue;
  var fallback=preferLocal ? remoteValue : localValue;
  return cloudDataHasValue(preferred) ? preferred : fallback;
}
function cloudMergeApiConfig(localCfg, remoteCfg, opts){
  var merged=cloudMergeDeep(localCfg||{}, remoteCfg||{}, opts);
  if(Array.isArray(localCfg && localCfg.profiles) || Array.isArray(remoteCfg && remoteCfg.profiles)){
    merged.profiles=cloudMergeArrayById((localCfg&&localCfg.profiles)||[], (remoteCfg&&remoteCfg.profiles)||[], opts);
  }
  if(!cloudDataHasValue(merged.activeProfileId)){
    var profiles=Array.isArray(merged.profiles) ? merged.profiles : [];
    if(profiles[0] && profiles[0].id) merged.activeProfileId=profiles[0].id;
  }
  return merged;
}
function cloudMergeChatRows(localRows, remoteRows, opts){
  opts=opts||{};
  var out=[], map={};
  function add(row, fromLocal){
    if(!row || !row.id) return;
    var id=String(row.id);
    if(!map[id]){ map[id]=cloudClonePlain(row, {}); out.push(map[id]); return; }
    var base=fromLocal ? row : map[id];
    var other=fromLocal ? map[id] : row;
    var merged=cloudMergeDeep(base, other, opts);
    merged.seed=cloudMergeArrayValues(base.seed, other.seed, opts).filter(function(m){ return !m || m.kind!=='typing'; });
    map[id]=merged;
    for(var i=0;i<out.length;i++){ if(String(out[i].id)===id){ out[i]=merged; break; } }
  }
  (Array.isArray(remoteRows)?remoteRows:[]).forEach(function(row){ add(row, false); });
  (Array.isArray(localRows)?localRows:[]).forEach(function(row){ add(row, true); });
  return out;
}
function cloudMergeContacts(localContacts, remoteContacts, opts){
  var merged=cloudMergeArrayById(localContacts||[], remoteContacts||[], opts);
  return (typeof fatedSanitizeContactsList==='function') ? fatedSanitizeContactsList(merged) : merged;
}
function cloudMergeSnapshotPayloads(localPayload, remotePayload, opts){
  opts=opts||{};
  var preferLocal=opts.preferLocal!==false;
  var local=cloudClonePlain(localPayload||{}, {});
  var remote=cloudClonePlain(remotePayload||{}, {});
  var merged=cloudMergeDeep(local, remote, {preferLocal:preferLocal});
  merged.schemaVersion=Math.max(Number(local.schemaVersion)||2, Number(remote.schemaVersion)||2, 2);
  merged.savedAt=Math.max(Number(local.savedAt)||0, Number(remote.savedAt)||0, Date.now());
  merged.state=merged.state||{};
  var localState=local.state||{}, remoteState=remote.state||{};
  merged.state.contactsExtra=cloudMergeContacts(localState.contactsExtra||[], remoteState.contactsExtra||[], {preferLocal:preferLocal});
  merged.state.apiConfig=cloudMergeApiConfig(localState.apiConfig||{}, remoteState.apiConfig||{}, {preferLocal:preferLocal});
  merged.state.worldBooks=cloudMergeDeep(localState.worldBooks||{}, remoteState.worldBooks||{}, {preferLocal:preferLocal});
  merged.state.activePlugins=cloudMergePrimitiveArray(localState.activePlugins||[], remoteState.activePlugins||[]);
  merged.state.removedPlugins=cloudMergePrimitiveArray(localState.removedPlugins||[], remoteState.removedPlugins||[]);
  if(Array.isArray(localState.moments) || Array.isArray(remoteState.moments)) merged.state.moments=cloudMergeArrayValues(localState.moments||[], remoteState.moments||[], {preferLocal:preferLocal});
  merged.assets=merged.assets||{};
  var localAssets=local.assets||{}, remoteAssets=remote.assets||{};
  merged.assets.contacts=cloudMergeArrayById(localAssets.contacts||[], remoteAssets.contacts||[], {preferLocal:preferLocal});
  merged.assets.widgetCustom=cloudMergeDeep(localAssets.widgetCustom||{}, remoteAssets.widgetCustom||{}, {preferLocal:preferLocal});
  merged.assets.appIconImgs=cloudMergeArrayById(localAssets.appIconImgs||[], remoteAssets.appIconImgs||[], {preferLocal:preferLocal});
  merged.assets.lockWp=cloudMergeDeep(localAssets.lockWp||{}, remoteAssets.lockWp||{}, {preferLocal:preferLocal});
  merged.assets.homeWp=cloudMergeDeep(localAssets.homeWp||{}, remoteAssets.homeWp||{}, {preferLocal:preferLocal});
  merged.assets.stickers=cloudMergeArrayValues(localAssets.stickers||[], remoteAssets.stickers||[], {preferLocal:preferLocal});
  merged.chats=cloudMergeChatRows(local.chats||[], remote.chats||[], {preferLocal:preferLocal});
  return (typeof fatedSanitizeLegacyDefaultCloudPayload==='function') ? fatedSanitizeLegacyDefaultCloudPayload(merged) : merged;
}
function cloudSnapshotsEqual(a, b){ return cloudStableJson(a)===cloudStableJson(b); }
async function cloudReadRemoteSnapshotPayload(){
  if(!cloudHasSession()) return null;
  var remote=await cloudFetchRemoteSnapshot();
  if(!remote.snapshot) return null;
  var payload=await cloudDecryptSnapshot(remote.snapshot, cloudSyncState.key);
  payload=(typeof fatedSanitizeLegacyDefaultCloudPayload==='function') ? fatedSanitizeLegacyDefaultCloudPayload(payload) : payload;
  return {remote:remote, payload:payload};
}
async function cloudPrepareSnapshotForUpload(snapshot, opts){
  opts=opts||{};
  var remoteData=await cloudReadRemoteSnapshotPayload();
  if(!remoteData || !cloudSnapshotHasMeaningfulUserData(remoteData.payload)) return {snapshot:snapshot, remote:null, merged:false, restored:false};
  var remotePayload=remoteData.payload;
  var preferRemote=cloudShouldRestoreRemote(snapshot, remotePayload, remoteData.remote.snapshot);
  var merged=preferRemote ? cloudMergeSnapshotPayloads(remotePayload, snapshot, {preferLocal:true}) : cloudMergeSnapshotPayloads(snapshot, remotePayload, {preferLocal:true});
  var changed=!cloudSnapshotsEqual(merged, snapshot);
  if(changed){
    await cloudRestoreSnapshotPayload(merged);
  }
  return {snapshot:merged, remote:remoteData.remote, merged:changed, restored:preferRemote};
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
    var url=await cloudUploadSupabaseAsset(parsed);
    return url||value;
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
  payload = (typeof fatedSanitizeLegacyDefaultCloudPayload==='function') ? fatedSanitizeLegacyDefaultCloudPayload(payload) : payload;
    if(!payload || !payload.state) throw new Error('Cloud save is empty or invalid. / \u4e91\u7aef\u5b58\u6863\u4e3a\u7a7a\u6216\u65e0\u6548\u3002');
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
  await cloudWaitForPersistenceReady({status:opts.manual!==false});
  if(opts.manual) cloudSetStatus('Encrypting local save... / \u6b63\u5728\u52a0\u5bc6\u672c\u5730\u5b58\u6863...', '');
  var snapshot=await cloudBuildLocalSnapshot();
  var prepared=await cloudPrepareSnapshotForUpload(snapshot, opts);
  snapshot=(prepared && prepared.snapshot) || snapshot;
  if(!cloudCanUploadSnapshot(snapshot, opts)) return null;
  await cloudExternalizeSnapshotAssets(snapshot);
  var encrypted=await cloudEncryptSnapshot(snapshot, cloudSyncState.key);
  var data=await cloudPutRemoteSnapshot(encrypted, snapshot, opts);
  cloudSyncState.lastRemote=data.updatedAt;
  cloudSyncState.lastUploadedLocalSaveAt=snapshot.savedAt;
  var label='Saved to cloud at '+new Date(data.updatedAt).toLocaleString()+' / cloud save merged and protected';
  if(opts.manual) label='Uploaded encrypted cloud save at '+new Date(data.updatedAt).toLocaleString()+' / cloud save merged and protected';
  if(prepared && prepared.merged) label='Merged local and cloud save at '+new Date(data.updatedAt).toLocaleString()+' / local and cloud data are both kept';
  cloudTouchStatus(label, 'ok');
  if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-upload-success', label, {reason:(opts&&opts.reason)||'', savedAt:snapshot.savedAt, updatedAt:data.updatedAt}, 'ok');
  return data;
}
async function cloudUploadNow(){
    if(!cloudSyncState.user || !cloudSyncState.key) return cloudSetStatus('Sign in with password first. / \u8bf7\u5148\u7528\u5bc6\u7801\u767b\u5f55\u3002', 'warn');
  cloudSetBusy(true);
  try{ await cloudUploadSnapshot({manual:true, reason:'manual'}); }
  catch(e){ if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-upload-failed', e.message || 'Upload failed', {manual:true}, 'warn'); cloudSetStatus(e.message, 'warn'); }
  finally{ cloudSetBusy(false); }
}
async function cloudRestoreNow(){
  if(!cloudSyncState.user || !cloudSyncState.key) return cloudSetStatus('Sign in with password first. / \u8bf7\u5148\u7528\u5bc6\u7801\u767b\u5f55\u3002', 'warn');
  if(!confirm('Restore cloud save to this device? Local-only data will be merged and kept. / \u6062\u590d\u4e91\u7aef\u5b58\u6863\u5230\u672c\u8bbe\u5907\uff1f\u672c\u673a\u72ec\u6709\u6570\u636e\u4f1a\u5408\u5e76\u4fdd\u7559\u3002')) return;
  cloudSetBusy(true); cloudSetStatus('Downloading cloud save... / \u6b63\u5728\u4e0b\u8f7d\u4e91\u7aef\u5b58\u6863...', '');
  try{
    var data=await cloudFetchRemoteSnapshot();
    if(!data.snapshot) throw new Error('No cloud save found. Upload once from your main device first. / \u6ca1\u6709\u627e\u5230\u4e91\u7aef\u5b58\u6863\uff0c\u8bf7\u5148\u5728\u4e3b\u8bbe\u5907\u4e0a\u4f20\u4e00\u6b21\u3002');
    cloudSetStatus('Decrypting cloud save... / \u6b63\u5728\u89e3\u5bc6\u4e91\u7aef\u5b58\u6863...', '');
    var remotePayload=await cloudDecryptSnapshot(data.snapshot, cloudSyncState.key);
    remotePayload=(typeof fatedSanitizeLegacyDefaultCloudPayload==='function') ? fatedSanitizeLegacyDefaultCloudPayload(remotePayload) : remotePayload;
    var localPayload=await cloudBuildLocalSnapshot();
    var merged=cloudMergeSnapshotPayloads(remotePayload, localPayload, {preferLocal:true});
    await cloudRestoreSnapshotPayload(merged);
    await cloudExternalizeSnapshotAssets(merged);
    var encrypted=await cloudEncryptSnapshot(merged, cloudSyncState.key);
    await cloudPutRemoteSnapshot(encrypted, merged, {manual:false, reason:'manual-restore-merge'});
    cloudSetStatus('Cloud save restored and merged. Local-only data was kept. / \u4e91\u7aef\u5b58\u6863\u5df2\u6062\u590d\u5e76\u5408\u5e76\uff0c\u672c\u673a\u72ec\u6709\u6570\u636e\u5df2\u4fdd\u7559\u3002', 'ok');
    if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-restore-success', '\u4e91\u7aef\u6570\u636e\u5df2\u6062\u590d\u5e76\u4e0e\u672c\u673a\u6570\u636e\u5408\u5e76\u3002', {}, 'ok');
  }catch(e){ if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-restore-failed', e.message || 'Restore failed', {}, 'warn'); cloudSetStatus(e.message || 'Restore failed / \u6062\u590d\u5931\u8d25', 'warn'); }
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
    cloudTouchStatus('Saving to cloud... / \u6b63\u5728\u81ea\u52a8\u4fdd\u5b58\u4e91\u7aef...', '');
  try{ await cloudUploadSnapshot({manual:false, reason:'autosave'}); }
  catch(e){ if(typeof saveDiagnosticsLog==='function') saveDiagnosticsLog('cloud-autosave-failed', e.message || String(e), {}, 'warn'); cloudTouchStatus('Cloud autosave failed: '+(e.message||e), 'warn'); }
  finally{
    cloudSyncState.autosaveInFlight=false;
    if(cloudSyncState.autosavePending){ cloudSyncState.autosavePending=false; cloudScheduleAutosave(2500); }
  }
}
async function cloudAutoSyncAfterUnlock(reason){
  if(!cloudHasSession()) return;
  try{
    await cloudWaitForPersistenceReady({status:true});
    var remote=await cloudFetchRemoteSnapshot();
    var local=await cloudBuildLocalSnapshot();
    if(remote.snapshot){
      var remotePayload=await cloudDecryptSnapshot(remote.snapshot, cloudSyncState.key);
      remotePayload=(typeof fatedSanitizeLegacyDefaultCloudPayload==='function') ? fatedSanitizeLegacyDefaultCloudPayload(remotePayload) : remotePayload;
      if(cloudSnapshotHasMeaningfulUserData(remotePayload)){
        var preferRemote=cloudShouldRestoreRemote(local, remotePayload, remote.snapshot);
        var merged=preferRemote ? cloudMergeSnapshotPayloads(remotePayload, local, {preferLocal:true}) : cloudMergeSnapshotPayloads(local, remotePayload, {preferLocal:true});
        await cloudRestoreSnapshotPayload(merged);
        await cloudUploadSnapshot({manual:false, reason:(preferRemote?'remote-merge':'unlock-merge')});
        cloudSetStatus('Local and cloud save were merged. No side was overwritten. / \u672c\u5730\u548c\u4e91\u7aef\u5b58\u6863\u5df2\u5408\u5e76\uff0c\u4e0d\u4f1a\u5355\u5411\u8986\u76d6\u3002', 'ok');
        return;
      }
    }
    if(!cloudCanUploadSnapshot(local, {manual:false, reason:reason||'unlock'})) return cloudSetStatus('No local save yet. Start using Fated OS and it will save automatically. / no local save yet', '');
    await cloudUploadSnapshot({manual:false, reason:reason||'unlock'});
    cloudSetStatus('Current device save is now protected in cloud. / current device save protected', 'ok');
  }catch(e){
    cloudSetStatus(e.message || 'Auto sync failed / auto sync failed', 'warn');
  }
}
window.addEventListener('beforeunload', function(){ if(cloudHasSession()) cloudNotifyLocalSave('urgent'); });
document.addEventListener('visibilitychange', function(){ if(document.hidden && cloudHasSession()) cloudNotifyLocalSave('urgent'); });


window.addEventListener('load', function(){ cloudBootAuthGate(); });





