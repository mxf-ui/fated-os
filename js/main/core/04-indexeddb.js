/* ============ FATED DB (IndexedDB 持久化 - 记忆模式) ============ */
/* 用 IndexedDB 存聊天记录和表情包，避免 localStorage 5MB 限制导致数据丢失 */
var fatedDB = null;
var fatedDBReady = false;
function fatedDBOpen(cb){
  if(fatedDB) return cb(fatedDB);
  try{
    var req = indexedDB.open('FatedDB', 1);
    req.onupgradeneeded = function(e){
      var db = e.target.result;
      if(!db.objectStoreNames.contains('chats')) db.createObjectStore('chats',{keyPath:'id'});
      if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv',{keyPath:'key'});
    };
    req.onsuccess = function(e){ fatedDB = e.target.result; fatedDBReady = true; cb(fatedDB); };
    req.onerror = function(){ fatedDBReady = false; cb(null); };
  }catch(e){ cb(null); }
}
/* 保存单个联系人的聊天记录到 IndexedDB */
function fatedDBSaveChat(contactId, cb){
  if(typeof fatedIsLegacyDefaultContactId==='function' && fatedIsLegacyDefaultContactId(contactId)) return cb&&cb();
  var c = contacts[contactId]; if(!c) return cb&&cb();
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('chats','readwrite');
      tx.objectStore('chats').put({
        id: contactId,
        name: c.name||contactId,
        displayName: c.displayName||'',
        tone: c.tone||'',
        persona: c.persona||'',
        userPrompt: c.userPrompt||'',
        isGroup: !!c.isGroup,
        members: c.members||null,
        avatarColor: c.avatarColor||null,
        avatar: c.avatar||null,
        cover: c.cover||'',
        wxid: c.wxid||contactId,
        bio: c.bio||'',
        relations: c.relations||[],
        proactive: c.proactive!==false,
        imageGenEnabled: c.imageGenEnabled===true,
        seed: c.seed,
        pendingCount: c.pendingCount||0,
        blocked: !!c.blocked,
        taDeletedByPartner: !!c.taDeletedByPartner,
        taDeletedBy: c.taDeletedBy||'',
        taDeletedAt: c.taDeletedAt||0,
        taDeletedPrevBlocked: !!c.taDeletedPrevBlocked,
        unread: c.unread||0,
        memory: c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0},
        userProfile: c.userProfile||'',
        userProfileUpdatedAt: c.userProfileUpdatedAt||0,
        userProfileLastMsgCount: c.userProfileLastMsgCount||0,
        worldBooks: c.worldBooks||[],
        groupUserPrompt: c.groupUserPrompt||''
      });
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}
/* 批量保存所有联系人聊天记录 */
function fatedDBSaveAllChats(cb){
  var ids = Object.keys(contacts).filter(function(k){ return typeof isPersistableContactId==='function' ? isPersistableContactId(k) : k!=='me'; });
  var done = 0, total = ids.length;
  if(total===0) return cb&&cb();
  ids.forEach(function(id){
    fatedDBSaveChat(id, function(){ done++; if(done>=total) cb&&cb(); });
  });
}
/* 加载所有联系人聊天记录 */
function fatedDBLoadAllChats(cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb(false);
    try{
      var tx = db.transaction('chats','readonly');
      var req = tx.objectStore('chats').getAll();
      req.onsuccess = function(e){
        var rows = e.target.result||[];
        rows.forEach(function(row){
          if(!row || !row.id) return;
          if(typeof fatedIsLegacyDefaultContactId==='function' && fatedIsLegacyDefaultContactId(row.id)){ fatedDBDeleteChat(row.id); return; }
          var c = (typeof ensureRestoredContact==='function') ? ensureRestoredContact(row.id, row) : contacts[row.id];
          if(!c) return;
          ['name','displayName','tone','persona','userPrompt','wxid','bio','cover','groupUserPrompt','userProfile','taDeletedBy'].forEach(function(k){ if(typeof row[k]==='string') c[k]=row[k]; });
          if(row.avatar!==undefined) c.avatar=row.avatar;
          if(row.avatarColor!==undefined) c.avatarColor=row.avatarColor;
          if(typeof row.isGroup==='boolean') c.isGroup=row.isGroup;
          if(Array.isArray(row.members)) c.members=row.members;
          if(Array.isArray(row.relations)) c.relations=row.relations;
          if(typeof row.proactive==='boolean') c.proactive=row.proactive;
          if(typeof row.imageGenEnabled==='boolean') c.imageGenEnabled=row.imageGenEnabled;
          if(row.seed && Array.isArray(row.seed) && row.seed.length>0) c.seed = row.seed;
          if(typeof row.pendingCount==='number') c.pendingCount = row.pendingCount;
          c.blocked = !!row.blocked;
          c.taDeletedByPartner = !!row.taDeletedByPartner;
          c.taDeletedAt = row.taDeletedAt||0;
          c.taDeletedPrevBlocked = !!row.taDeletedPrevBlocked;
          if(typeof row.unread==='number') c.unread = row.unread;
          if(row.memory) c.memory = row.memory;
          if(typeof row.userProfileUpdatedAt==='number') c.userProfileUpdatedAt = row.userProfileUpdatedAt;
          if(typeof row.userProfileLastMsgCount==='number') c.userProfileLastMsgCount = row.userProfileLastMsgCount;
          if(Array.isArray(row.worldBooks)) c.worldBooks = row.worldBooks;
        });
        if(typeof syncRenderedContactRows==='function') syncRenderedContactRows();
        cb&&cb(true);
      };
      req.onerror = function(){ cb&&cb(false); };
    }catch(e){ cb&&cb(false); }
  });
}
/* 保存表情包到 IndexedDB */
function fatedDBSaveStickers(cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('kv','readwrite');
      tx.objectStore('kv').put({key:'stickers', data:stickers});
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}
/* 加载表情包 */
function fatedDBLoadStickers(cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb(false);
    try{
      var tx = db.transaction('kv','readonly');
      var req = tx.objectStore('kv').get('stickers');
      req.onsuccess = function(e){
        var row = e.target.result;
        if(row && Array.isArray(row.data) && row.data.length>0){
          stickers = row.data;
          cb&&cb(true);
        } else {
          cb&&cb(false);
        }
      };
      req.onerror = function(){ cb&&cb(false); };
    }catch(e){ cb&&cb(false); }
  });
}
/* 通用的 KV 保存到 IndexedDB（用于存储大图片数据，避免 localStorage 溢出）*/
function fatedDBSaveKV(key, data, cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('kv','readwrite');
      tx.objectStore('kv').put({key:key, data:data});
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}
/* 通用的 KV 从 IndexedDB 加载 */
function fatedDBLoadKV(key, cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb(null);
    try{
      var tx = db.transaction('kv','readonly');
      var req = tx.objectStore('kv').get(key);
      req.onsuccess = function(e){
        var row = e.target.result;
        cb&&cb(row?row.data:null);
      };
      req.onerror = function(){ cb&&cb(null); };
    }catch(e){ cb&&cb(null); }
  });
}
/* 删除联系人的聊天记录 */
function fatedDBDeleteChat(contactId, cb){
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('chats','readwrite');
      tx.objectStore('chats').delete(contactId);
      tx.oncomplete = function(){ cb&&cb(); };
      tx.onerror = function(){ cb&&cb(); };
    }catch(e){ cb&&cb(); }
  });
}

