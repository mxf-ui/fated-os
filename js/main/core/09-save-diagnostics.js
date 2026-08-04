(function(){
  var LOG_KEY='fated_save_diagnostics_logs_v1';
  var MAX_LOGS=80;

  function safeJsonParse(text, fallback){ try{ return JSON.parse(text); }catch(e){ return fallback; } }
  function now(){ return Date.now(); }
  function pad(n){ return String(n).padStart(2,'0'); }
  function timeLabel(ts){
    if(!ts) return '无记录';
    var d=new Date(ts);
    return pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
  }
  function escapeHtml(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; });
  }
  function readLogs(){
    try{
      var list=safeJsonParse(localStorage.getItem(LOG_KEY)||'[]', []);
      return Array.isArray(list) ? list.filter(Boolean) : [];
    }catch(e){ return []; }
  }
  function writeLogs(list){
    try{ localStorage.setItem(LOG_KEY, JSON.stringify((list||[]).slice(-MAX_LOGS))); }catch(e){}
  }
  function byteSize(value){
    try{ return new Blob([JSON.stringify(value||{})]).size; }
    catch(e){ try{ return JSON.stringify(value||{}).length; }catch(_e){ return 0; } }
  }
  function formatSize(bytes){
    bytes=Number(bytes)||0;
    if(bytes<1024) return bytes+' B';
    if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB';
    return (bytes/1024/1024).toFixed(2)+' MB';
  }
  function probeLocalStorage(){
    try{ localStorage.setItem('fated_save_diag_probe','1'); localStorage.removeItem('fated_save_diag_probe'); return true; }
    catch(e){ return false; }
  }
  function ownContactIds(){
    try{
      return Object.keys(window.contacts||{}).filter(function(id){
        return typeof window.isPersistableContactId==='function' ? window.isPersistableContactId(id) : id !== 'me';
      });
    }catch(e){ return []; }
  }
  function dataStats(){
    var ids=ownContactIds();
    var chats=0;
    ids.forEach(function(id){
      var c=(window.contacts||{})[id]||{};
      if(Array.isArray(c.seed)) chats+=c.seed.length;
    });
    var assetBytes=0;
    try{ if(typeof window.buildProfileAssets==='function') assetBytes+=byteSize(window.buildProfileAssets()); }catch(e){}
    try{ if(typeof window.buildMomentsAssets==='function') assetBytes+=byteSize(window.buildMomentsAssets()); }catch(e){}
    try{ if(typeof window.buildContactAssets==='function') assetBytes+=byteSize(window.buildContactAssets()); }catch(e){}
    try{ if(typeof window.buildFontAssets==='function') assetBytes+=byteSize(window.buildFontAssets()); }catch(e){}
    try{ assetBytes+=byteSize(window.widgetCustom||{}); }catch(e){}
    try{ assetBytes+=byteSize((window.appIcons||[]).map(function(a){ return {id:a.id,img:a.img}; })); }catch(e){}
    try{ assetBytes+=byteSize(window.lockWp||{}); }catch(e){}
    try{ assetBytes+=byteSize(window.homeWp||{}); }catch(e){}
    return {contacts:ids.length, chats:chats, assetSize:assetBytes};
  }
  function cloudConfigStatus(){
    var cfg={};
    try{ cfg=typeof window.cloudSupabaseConfig==='function' ? window.cloudSupabaseConfig() : (window.FATED_SUPABASE_CONFIG||{}); }catch(e){}
    var configured=!!(cfg.url && cfg.anonKey && String(cfg.url).indexOf('YOUR_')<0 && String(cfg.anonKey).indexOf('YOUR_')<0);
    return {configured:configured, url:cfg.url||'', bucket:cfg.assetBucket||'fated-assets'};
  }
  function saveDiagnosticsCollect(){
    var stats=dataStats();
    var cloud=window.cloudSyncState||{};
    var cfg=cloudConfigStatus();
    var booting=false;
    try{ booting=typeof window.isPersistenceBooting==='function' ? !!window.isPersistenceBooting() : false; }catch(e){}
    return {
      collectedAt:now(),
      localStorageOk:probeLocalStorage(),
      indexedDbOk:!!window.indexedDB,
      fatedDbReady:!!window.fatedDBReady,
      persistenceBooting:booting,
      supabaseSdk:!!(window.supabase && window.supabase.createClient),
      supabaseConfigured:cfg.configured,
      supabaseUrl:cfg.url,
      assetBucket:cfg.bucket,
      signedIn:!!cloud.user,
      unlocked:!!(cloud.user && cloud.key),
      email:(cloud.user && cloud.user.email) || cloud.email || '',
      lastRemote:Number(cloud.lastRemote)||0,
      lastLocalSaveAt:Number(cloud.lastLocalSaveAt)||0,
      lastUploadedLocalSaveAt:Number(cloud.lastUploadedLocalSaveAt)||0,
      autosaveInFlight:!!cloud.autosaveInFlight,
      autosavePending:!!cloud.autosavePending,
      contacts:stats.contacts,
      chats:stats.chats,
      assetSize:stats.assetSize,
      logs:readLogs()
    };
  }
  function statusTone(ok, warn){ return ok ? 'ok' : (warn ? 'warn' : 'bad'); }
  function statusItem(label, value, sub, tone){
    return '<div class="save-diagnostic-item '+escapeHtml(tone||'')+'"><b>'+escapeHtml(value)+'</b><small>'+escapeHtml(label)+'</small><em>'+escapeHtml(sub||'')+'</em></div>';
  }
  function logSummary(logs){
    var total=logs.length;
    var warn=logs.filter(function(x){ return x.tone==='warn' || x.tone==='bad'; }).length;
    var ok=logs.filter(function(x){ return x.tone==='ok'; }).length;
    var last=logs[logs.length-1];
    return '共 '+total+' 条 / 成功 '+ok+' / 异常 '+warn+' / 最近：'+(last ? timeLabel(last.ts)+' '+last.type : '无');
  }
  function saveDiagnosticsRender(){
    var d=saveDiagnosticsCollect();
    var grid=document.getElementById('save-diagnostics-grid');
    if(grid){
      grid.innerHTML=[
        statusItem('账号状态', d.signedIn ? '已登录' : '未登录', d.email || '等待登录', statusTone(d.signedIn,false)),
        statusItem('加密同步', d.unlocked ? '已解锁' : '未解锁', d.unlocked ? '可自动云保存' : '需要密码解锁', statusTone(d.unlocked,d.signedIn)),
        statusItem('本地保存', d.localStorageOk && d.indexedDbOk ? '正常' : '受限', 'localStorage '+(d.localStorageOk?'OK':'FAIL')+' / IndexedDB '+(d.indexedDbOk?'OK':'FAIL'), statusTone(d.localStorageOk&&d.indexedDbOk,true)),
        statusItem('本地加载', d.persistenceBooting ? '加载中' : '完成', d.fatedDbReady ? 'FatedDB ready' : '等待 IndexedDB', d.persistenceBooting?'warn':'ok'),
        statusItem('Supabase', d.supabaseSdk && d.supabaseConfigured ? '已配置' : '异常', d.assetBucket || 'fated-assets', statusTone(d.supabaseSdk&&d.supabaseConfigured,true)),
        statusItem('最近云保存', d.lastRemote ? timeLabel(d.lastRemote) : '无记录', d.autosaveInFlight ? '正在上传' : (d.autosavePending ? '等待重试' : '空闲'), d.lastRemote?'ok':'warn'),
        statusItem('用户数据', d.contacts+' 联系人', d.chats+' 条聊天', d.contacts||d.chats?'ok':'warn'),
        statusItem('图片资源', formatSize(d.assetSize), '头像/插件/壁纸/贴纸估算', d.assetSize?'ok':'warn')
      ].join('');
    }
    var summary=document.getElementById('save-log-summary');
    if(summary) summary.textContent=logSummary(d.logs);
    var list=document.getElementById('save-log-list');
    if(list){
      var recent=d.logs.slice(-12).reverse();
      list.innerHTML=recent.length ? recent.map(function(item){
        return '<div class="save-log-row '+escapeHtml(item.tone||'')+'"><b>'+escapeHtml(timeLabel(item.ts))+' · '+escapeHtml(item.type||'event')+'</b><small>'+escapeHtml(item.message||'')+'</small></div>';
      }).join('') : '<div class="save-log-empty">还没有保存日志。完成登录、上传、恢复或本机保存后会自动记录。</div>';
    }
    var status=document.getElementById('dm-status');
    if(status) status.textContent='保存诊断已刷新：'+timeLabel(d.collectedAt);
    return d;
  }
  function saveDiagnosticsLog(type, message, meta, tone){
    var item={
      ts:now(),
      type:String(type||'event').slice(0,48),
      message:String(message||'').slice(0,220),
      tone:String(tone||'').slice(0,12),
      meta:meta && typeof meta==='object' ? meta : {}
    };
    var logs=readLogs();
    logs.push(item);
    writeLogs(logs);
    try{ if(typeof window.fatedDBSaveKV==='function') window.fatedDBSaveKV(LOG_KEY, logs); }catch(e){}
    if(document.getElementById('save-diagnostics-panel')) saveDiagnosticsRender();
    return item;
  }
  function saveDiagnosticsRefresh(manual){
    var d=saveDiagnosticsRender();
    if(manual) saveDiagnosticsLog('manual-refresh', '用户手动刷新保存诊断面板。', {contacts:d.contacts, chats:d.chats}, 'ok');
    return d;
  }
  function saveDiagnosticsClearLogs(){
    writeLogs([]);
    try{ if(typeof window.fatedDBSaveKV==='function') window.fatedDBSaveKV(LOG_KEY, []); }catch(e){}
    saveDiagnosticsRender();
    if(typeof window.showToast==='function') window.showToast('保存日志已清空', 1300, 'ok');
  }

  window.saveDiagnosticsCollect=saveDiagnosticsCollect;
  window.saveDiagnosticsRender=saveDiagnosticsRender;
  window.saveDiagnosticsLog=saveDiagnosticsLog;
  window.saveDiagnosticsRefresh=saveDiagnosticsRefresh;
  window.saveDiagnosticsClearLogs=saveDiagnosticsClearLogs;
  window.addEventListener('load', function(){ setTimeout(function(){ if(document.getElementById('save-diagnostics-panel')) saveDiagnosticsRender(); }, 600); });
})();
