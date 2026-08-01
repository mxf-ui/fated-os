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
  var c = contacts[contactId]; if(!c) return cb&&cb();
  fatedDBOpen(function(db){
    if(!db) return cb&&cb();
    try{
      var tx = db.transaction('chats','readwrite');
      tx.objectStore('chats').put({
        id: contactId,
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
  var ids = Object.keys(contacts).filter(function(k){ return k!=='me'; });
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
          if(contacts[row.id]){
            if(row.seed && Array.isArray(row.seed) && row.seed.length>0){
              contacts[row.id].seed = row.seed;
            }
            if(typeof row.pendingCount==='number') contacts[row.id].pendingCount = row.pendingCount;
            contacts[row.id].blocked = !!row.blocked;
            contacts[row.id].taDeletedByPartner = !!row.taDeletedByPartner;
            contacts[row.id].taDeletedBy = row.taDeletedBy||'';
            contacts[row.id].taDeletedAt = row.taDeletedAt||0;
            contacts[row.id].taDeletedPrevBlocked = !!row.taDeletedPrevBlocked;
            if(typeof row.unread==='number') contacts[row.id].unread = row.unread;
            if(row.memory) contacts[row.id].memory = row.memory;
            if(typeof row.userProfile==='string') contacts[row.id].userProfile = row.userProfile;
            if(typeof row.userProfileUpdatedAt==='number') contacts[row.id].userProfileUpdatedAt = row.userProfileUpdatedAt;
            if(typeof row.userProfileLastMsgCount==='number') contacts[row.id].userProfileLastMsgCount = row.userProfileLastMsgCount;
            if(Array.isArray(row.worldBooks)) contacts[row.id].worldBooks = row.worldBooks;
            if(typeof row.groupUserPrompt==='string') contacts[row.id].groupUserPrompt = row.groupUserPrompt;
          }
        });
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

