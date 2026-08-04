/* ============ TOP-LEVEL SCREEN NAVIGATION ============ */
function goToScreen(id){
  document.querySelectorAll('.topview').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+id).classList.add('active');
  var sb=document.querySelector('.statusbar');
  if(id==='lock'||id==='standby'){ sb.style.color='#fff'; sb.style.background='transparent'; sb.style.backdropFilter='none'; }
  else { sb.style.color='var(--ink)'; sb.style.background='linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.05) 90%,transparent)'; sb.style.backdropFilter='blur(14px)'; }
  if(id==='settings') updatePasscodeSettingsUI();
  if(id==='lock') hidePasscodeOverlay();
  tick();
}

function updatePasscodeSettingsUI(){
  const statusText = document.getElementById('passcode-status-text');
  const removeRow = document.getElementById('passcode-remove-row');
  if(!statusText || !removeRow) return;
  if(userPasscode){
    statusText.innerHTML = '<b>Change Passcode</b><small>修改密码 / 更新锁屏保护</small>';
    removeRow.style.display = 'flex';
  } else {
    statusText.innerHTML = '<b>Passcode</b><small>密码 / 解锁保护</small>';
    removeRow.style.display = 'none';
  }
}

function removePasscodeConfirm(){
  /* verify current passcode before removing */
  showPasscodeOverlay('remove');
  document.getElementById('pc-title').textContent = '输入密码以关闭';
}

/* ============ CUSTOM APP ICONS (shared: desktop + settings) ============ */
var svgChat = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
var svgBook = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>';
var svgMusic = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
var svgForum = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M7 7h10M7 11h6"/></svg>';
var svgHeart = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M20.8 4.6a5.5 5.5 0 00-7.7 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1.1L12 21l7.8-7.8 1.1-1.1a5.5 5.5 0 000-7.7z"/></svg>';
var svgGame = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4"/><circle cx="15" cy="11" r="1" fill="#fff"/><circle cx="17" cy="13" r="1" fill="#fff"/></svg>';
var svgGear = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>';
var svgSuoha = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5" fill="#fff"/><circle cx="16" cy="16" r="1.5" fill="#fff"/><circle cx="16" cy="8" r="1.5" fill="#fff"/><circle cx="8" cy="16" r="1.5" fill="#fff"/><circle cx="12" cy="12" r="1.5" fill="#fff"/></svg>';
var svgGo = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7l3.5 5L12 17l-3.5-5L12 7z" fill="#fff" stroke="none"/></svg>';
var svgDream = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 109 9"/><path d="M12 6a6 6 0 106 6"/><path d="M12 9a3 3 0 103 3"/><path d="M12 12l5-8"/></svg>';
var svgNilflow = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16"/><path d="M4 12h10"/><path d="M4 17.5h16"/><circle cx="17" cy="12" r="3"/><path d="M17 9v6"/></svg>';
var appIcons = [
  {id:'wechat', name:'Messages', ico:svgChat, img:null, action:"goToScreen('wechatapp')"},
  {id:'novel', name:'Books', ico:svgBook, img:null, action:"openSheet('novel');renderNovelPick();"},
  {id:'music', name:'Music', ico:svgMusic, img:null, action:"openSheet('music');initMusicPlayer();"},
  {id:'forum', name:'Forum', ico:svgForum, img:null, action:"openSheet('forum');initForum();"},
  {id:'couple', name:'Heart', ico:svgHeart, img:null, action:"openSheet('couple');initCouple();"},
  {id:'game', name:'Games', ico:svgGame, img:null, action:"openSheet('game');initGame();"},
  {id:'suoha', name:'Suoha', ico:svgSuoha, img:null, action:"openSheet('suoha');initSuoha();"},
  {id:'go', name:'GO', ico:svgGo, img:null, action:"openSheet('go');initGo();"},
  {id:'dream', name:'\u96fe\u7ec7\u68a6\u6838', ico:svgDream, img:null, action:"openSheet('dream');initDreamCore();"},
  {id:'nilflow', name:'\u533f\u6d41', ico:svgNilflow, img:null, action:"openSheet('nilflow');initNilflow();"},
  {id:'settings', name:'Settings', ico:svgGear, img:null, action:"goToScreen('settings')"}
];
let activeIconId = null;
const iconInput = document.createElement('input');
iconInput.type='file'; iconInput.accept='image/*'; iconInput.style.display='none';
document.body.appendChild(iconInput);
iconInput.addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file || !activeIconId) return;
  compressImage(file, 256, 0.85, function(res){
    if(!res) return;
    const def = appIcons.find(a=>a.id===activeIconId);
    def.img = res; def.updatedAt = Date.now();
    if(typeof fatedClearDeleted==='function') fatedClearDeleted('images', 'appIcon:'+activeIconId, def.updatedAt);
    renderDesktopIcons(); renderIconGrid(); saveState();
  });
});
function pickIcon(id){ activeIconId=id; iconInput.click(); }
function resetIcon(e, id){ e.stopPropagation(); const def=appIcons.find(a=>a.id===id); if(def){ def.img=null; def.updatedAt=Date.now(); } if(typeof fatedMarkDeleted==='function') fatedMarkDeleted('images', 'appIcon:'+id); renderDesktopIcons(); renderIconGrid(); saveState(); }
var TA_APP_LOCK_MS = window.TA_APP_LOCK_MS || 15*60*1000;
function couplePersistAppLocks(){
  if(typeof saveCoupleState==='function') saveCoupleState();
  if(typeof saveState==='function') saveState();
}
function couplePruneAppLocks(){
  try{
    if(typeof coupleState==='undefined' || !coupleState || !coupleState.lockedApps) return;
    var changed=false, now=Date.now();
    Object.keys(coupleState.lockedApps).forEach(function(k){
      var until=Number(coupleState.lockedApps[k]||0);
      if(!until || until<=now || k==='settings'){
        delete coupleState.lockedApps[k];
        changed=true;
      }
    });
    var activeLocks = Object.keys(coupleState.lockedApps).filter(function(k){
      return Number(coupleState.lockedApps[k]||0)>now && k!=='settings';
    });
    if(activeLocks.length>2){
      coupleState.lockedApps = {};
      changed = true;
      if(typeof showToast==='function') showToast('???????', 1400, 'ok');
    }
    if(changed) couplePersistAppLocks();
  }catch(e){}
}
function coupleAppLockRemaining(id){
  try{
    couplePruneAppLocks();
    var until = coupleState && coupleState.lockedApps ? Number(coupleState.lockedApps[id]||0) : 0;
    var left = Math.max(0, until-Date.now());
    if(until && left<=0 && coupleState && coupleState.lockedApps){ delete coupleState.lockedApps[id]; couplePersistAppLocks(); }
    return left;
  }catch(e){ return 0; }
}
function coupleUnlockAllApps(reason){
  try{
    if(typeof coupleState==='undefined' || !coupleState) return false;
    coupleState.lockedApps = {};
    couplePersistAppLocks();
    if(typeof renderDesktopIcons==='function') renderDesktopIcons();
    if(typeof showToast==='function') showToast(reason || 'App locks cleared', 1400, 'ok');
    return true;
  }catch(e){ return false; }
}
window.fatedUnlockApps = coupleUnlockAllApps;
var FATED_DESKTOP_SHEET_IDS = ['novel','music','forum','couple','game','suoha','go','dream','nilflow'];
function fatedIsDesktopSheet(id){ return FATED_DESKTOP_SHEET_IDS.indexOf(id)>=0; }
function fatedCloseDesktopAppSurfaces(exceptId){
  try{
    var shouldCloseRootSheets = !exceptId || fatedIsDesktopSheet(exceptId);
    if(shouldCloseRootSheets){
      FATED_DESKTOP_SHEET_IDS.forEach(function(sid){
        if(sid===exceptId) return;
        var el=document.getElementById('sheet-'+sid);
        if(el){ el.classList.remove('open'); el.style.pointerEvents=''; }
      });
    }
    document.querySelectorAll('.drawer-backdrop.open,.music-menu.show,.music-menu-back.show').forEach(function(el){ el.classList.remove('open','show'); });
    document.querySelectorAll('.go-modal.open,.suoha-modal.open').forEach(function(el){ el.classList.remove('open'); });
    var cp=document.getElementById('cp-modal'); if(cp){ cp.classList.remove('active'); cp.style.display='none'; }
  }catch(e){}
}
window.fatedCloseDesktopAppSurfaces = fatedCloseDesktopAppSurfaces;
function coupleCheckAppLocked(id, opts){
  opts = opts || {};
  if(opts.bypassLock || id==='settings') return false;
  var left = coupleAppLockRemaining(id);
  if(left<=0) return false;
  var min = Math.max(1, Math.ceil(left/60000));
  var msg = 'TA 刚刚查岗后锁定了这个 app，约 '+min+' 分钟后可用。';
  if(typeof coupleTaSetTopLine==='function') coupleTaSetTopLine(msg, {kind:'lock',app:id});
  if(typeof showToast==='function') showToast(msg, 1800, 'warn');
  return true;
}
function runDesktopAction(action){
  try{
    if(typeof action==='function') return action();
    if(typeof action==='string') return (new Function(action))();
    throw new Error('empty action');
  }catch(e){
    console.error('Desktop app failed:', e);
    if(typeof showToast==='function') showToast('打开失败：'+(e && e.message ? e.message : 'unknown'), 2200, 'err');
    return false;
  }
}
function openDesktopApp(id, opts){
  opts = opts || {};
  couplePruneAppLocks();
  var a = appIcons.find(function(x){ return x.id===id; });
  if(!a){ if(typeof showToast==='function') showToast('App not found: '+id, 1600, 'err'); return false; }
  if(coupleCheckAppLocked(id, opts)) return false;
  if(typeof fatedLogEvent==='function') fatedLogEvent('app.open', {app:id, title:a.name || id, actor:'user'}, {app:id});
  fatedCloseDesktopAppSurfaces(id);
  return runDesktopAction(a.action) !== false;
}
function renderDesktopIcons(){
  var board=document.getElementById('desktop-board');
  if(!board) return;
  board.innerHTML=appIcons.map(function(a){
    var bg=a.img?' style="background-image:url('+a.img+');background-size:cover;"':'';
    var inner=a.img?'':'<div class="d-icon-glyph">'+a.ico+'</div>';
    var locked=coupleAppLockRemaining(a.id);
    var lockedStyle=locked?'filter:saturate(.55);opacity:.72;':'';
    var badge=locked?'<span class="d-lock-badge">'+Math.ceil(locked/60000)+'m</span>':'';
    return '<div class="d-app" data-ta-app-id="'+a.id+'" onclick="openDesktopApp(\''+a.id+'\')" style="'+lockedStyle+'"><div class="d-tile"'+bg+'>'+inner+badge+'</div><div class="d-label">'+a.name+'</div></div>';
  }).join('');
  var dock=document.getElementById('desktop-dock');
  if(!dock) return;
  var dockIds=['wechat','couple','settings'];
  dock.innerHTML=dockIds.map(function(id){
    var a=appIcons.find(function(x){return x.id===id;});
    if(!a) return '';
    var bg=a.img?' style="background-image:url('+a.img+');background-size:cover;"':'';
    var inner=a.img?'':'<div class="d-icon-glyph">'+a.ico+'</div>';
    var locked=coupleAppLockRemaining(a.id);
    var badge=locked?'<span class="d-lock-badge dock">'+Math.ceil(locked/60000)+'m</span>':'';
    return '<div class="tile" data-ta-app-id="'+a.id+'"'+bg+' onclick="openDesktopApp(\''+a.id+'\')" style="position:relative;'+(locked?'filter:saturate(.55);opacity:.72;':'')+'">'+inner+badge+'</div>';
  }).join('');
}
function renderIconGrid(){
  const grid = document.getElementById('icon-grid'); if(!grid) return;
  grid.innerHTML = appIcons.map(a=>{
    const style = a.img ? ' style="background-image:url('+a.img+');"' : '';
    const inner = a.img ? '' : a.ico;
    return '<div class="icon-cell"><div class="icon-tile'+(a.img?' filled':'')+'"'+style+' onclick="pickIcon(\''+a.id+'\')">'+inner+
      '<div class="reset" onclick="resetIcon(event,\''+a.id+'\')"><div class="ico-x"></div></div></div><div class="lbl">'+a.name+'</div></div>';
  }).join('');
}

/* ============ SHARED PHOTO-SLOT UPLOAD (widgets) ============ */
let activeSlot = null;
const slotInput = document.createElement('input');
slotInput.type='file'; slotInput.accept='image/*'; slotInput.style.display='none';
document.body.appendChild(slotInput);
slotInput.addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file || !activeSlot) return;
  compressImage(file, 720, 0.82, function(res){
    if(!res) return;
    if(activeSlot.querySelector('.chibi')) activeSlot.innerHTML='';
    activeSlot.style.backgroundImage='url('+res+')'; activeSlot.style.backgroundSize='cover'; activeSlot.style.backgroundPosition='center'; activeSlot.classList.add('filled');
    var t=activeSlot.getAttribute('data-wc-img');
    if(t){
      var parts=String(t).split(':'), wt=parts[0], idx=parts.length>1 ? parseInt(parts[1],10) : null;
      widgetCustom[wt]=widgetCustom[wt]||{};
      if(idx!==null && isFinite(idx)){
        widgetCustom[wt].imgs=Array.isArray(widgetCustom[wt].imgs) ? widgetCustom[wt].imgs : [];
        widgetCustom[wt].imgs[idx]=res;
        widgetCustom[wt].updatedAt=Date.now();
        if(typeof fatedClearDeleted==='function') fatedClearDeleted('images', 'widget:'+wt+':img:'+idx, widgetCustom[wt].updatedAt);
        if(idx===0) widgetCustom[wt].img=res;
      } else {
        widgetCustom[wt].img=res;
        widgetCustom[wt].updatedAt=Date.now();
        if(typeof fatedClearDeleted==='function') fatedClearDeleted('images', 'widget:'+wt+':img', widgetCustom[wt].updatedAt);
      }
      saveState();
    }
  });
});
function restoreWidgetSlotImages(container, type){
  if(!container) return;
  var cfg=widgetCustom[type]||{};
  var slots=container.querySelectorAll('.ph-slot');
  slots.forEach(function(slot, i){
    slot.setAttribute('data-wc-img', type+':'+i);
    var img=(Array.isArray(cfg.imgs) && cfg.imgs[i]) ? cfg.imgs[i] : (i===0 ? cfg.img : '');
    if(img){
      if(slot.querySelector('.chibi')) slot.innerHTML='';
      slot.style.backgroundImage='url('+img+')';
      slot.style.backgroundSize='cover';
      slot.style.backgroundPosition='center';
      slot.classList.add('filled');
    }
  });
}
function bindSlots(container){ container.querySelectorAll('.ph-slot').forEach(el=>{ el.addEventListener('click', ()=>{ activeSlot=el; slotInput.click(); }); }); }

/* ============ IMAGE COMPRESS (keep localStorage small & persistent) ============ */
function compressImage(file, maxDim, quality, cb){
  try{
    var reader = new FileReader();
    reader.onload = function(){
      var img = new Image();
      img.onload = function(){
        var w=img.width, h=img.height;
        var scale = Math.min(1, maxDim/Math.max(w,h));
        var cw=Math.max(1,Math.round(w*scale)), ch=Math.max(1,Math.round(h*scale));
        var cv=document.createElement('canvas'); cv.width=cw; cv.height=ch;
        var ctx=cv.getContext('2d'); ctx.drawImage(img,0,0,cw,ch);
        try{ cb(cv.toDataURL('image/jpeg', quality)); }catch(e2){ cb(reader.result); }
      };
      img.onerror=function(){ cb(reader.result); };
      img.src=reader.result;
    };
    reader.onerror=function(){ cb(null); };
    reader.readAsDataURL(file);
  }catch(e){ cb(null); }
}

/* ============ WALLPAPER (lock / home separate) ============ */
var lockWp = {type:'mono', url:''};
var homeWp = {type:'mono', url:''};
var widgetBgMode = 'frosted'; /* 'frosted' | 'transparent' — 插件背景效果 */
var wpTarget = 'both';
function setWpTarget(t){
  wpTarget=t;
  document.querySelectorAll('#wp-targets .seg').forEach(function(s){
    var on = s.getAttribute('data-t')===t;
    s.style.background = on ? 'var(--plum-deep)' : 'rgba(255,255,255,0.5)';
    s.style.color = on ? '#fff' : '#8B6899';
  });
}
function setWidgetBgMode(mode){
  widgetBgMode = mode;
  document.body.classList.remove('widget-bg-frosted','widget-bg-transparent');
  document.body.classList.add('widget-bg-'+mode);
  /* 更新按钮高亮 */
  document.querySelectorAll('#wbg-targets .seg').forEach(function(s){
    var on = s.getAttribute('data-m')===mode;
    s.style.background = on ? 'var(--plum-deep)' : 'rgba(255,255,255,0.5)';
    s.style.color = on ? '#fff' : '#8B6899';
  });
  saveState();
}
function initWidgetBgMode(){
  document.body.classList.remove('widget-bg-frosted','widget-bg-transparent');
  document.body.classList.add('widget-bg-'+(widgetBgMode||'frosted'));
  document.querySelectorAll('#wbg-targets .seg').forEach(function(s){
    var on = s.getAttribute('data-m')===(widgetBgMode||'frosted');
    s.style.background = on ? 'var(--plum-deep)' : 'rgba(255,255,255,0.5)';
    s.style.color = on ? '#fff' : '#8B6899';
  });
}
function paintWallpaper(el, wp){
  if(!el) return;
  el.className='wallpaper wp-'+(wp.type||'mono');
  el.style.backgroundImage = wp.url||'';
  if(wp.type==='mono'){
    el.innerHTML='<div class="doodle dstar" style="width:14px;height:14px; top:110px; left:30px;"></div><div class="doodle dstar" style="width:20px;height:20px; top:160px; right:36px;"></div><div class="doodle dstar" style="width:10px;height:10px; bottom:260px; left:60px;"></div><div class="quote">love is the enduring gaze into your eyes as you look into mine.</div>';
  } else { el.innerHTML=''; }
}
function applyWallpaper(target, type, url){
  var ts=Date.now();
  if(target==='lock'||target==='both'){ if(typeof fatedMarkDeleted==='function') fatedMarkDeleted('appearance', 'wallpaper:lock', ts); lockWp={type:type, url:url||'', updatedAt:ts, deletedAt:fatedDeletedTombstones.appearance['wallpaper:lock']||0}; if(type==='custom' && typeof fatedClearDeleted==='function') fatedClearDeleted('appearance', 'wallpaper:lock', ts); paintWallpaper(document.getElementById('lock-wallpaper'), lockWp); }
  if(target==='home'||target==='both'){ if(typeof fatedMarkDeleted==='function') fatedMarkDeleted('appearance', 'wallpaper:home', ts); homeWp={type:type, url:url||'', updatedAt:ts, deletedAt:fatedDeletedTombstones.appearance['wallpaper:home']||0}; if(type==='custom' && typeof fatedClearDeleted==='function') fatedClearDeleted('appearance', 'wallpaper:home', ts); paintWallpaper(document.getElementById('home-wallpaper'), homeWp); }
  saveState();
}
function pickWallpaper(el,type){
  document.querySelectorAll('#sheet-wallpaper .wp-swatch').forEach(s=>s.classList.remove('picked'));
  el.classList.add('picked');
  applyWallpaper(wpTarget, type);
  closeSheet('wallpaper');
}
function uploadWallpaper(e){
  const file = e.target.files[0]; if(!file) return;
  compressImage(file, 1280, 0.82, function(res){
    if(!res) return;
    applyWallpaper(wpTarget, 'custom', 'url('+res+')');
    document.querySelectorAll('#sheet-wallpaper .wp-swatch').forEach(s=>s.classList.remove('picked'));
    closeSheet('wallpaper');
  });
}

/* ============ UNIFIED PLUGIN LIBRARY (lock widgets + standby dynamic widgets) ============ */
const pluginDefs = [
  {type:'player', name:'ins风播放器相框', surface:'lock', dynamic:false},
  {type:'glasstext', name:'ins风毛玻璃文字', surface:'lock', dynamic:false},
  {type:'console', name:'游戏机相框', surface:'lock', dynamic:false},
  {type:'idol', name:'ins风爱豆主页', surface:'lock', dynamic:false},
  {type:'note', name:'ins简约便签', surface:'lock', dynamic:false},
  {type:'avatarframe', name:'头像相框', surface:'lock', dynamic:false},
  {type:'vinyl', name:'异形唱片', surface:'lock', dynamic:false},
  {type:'dotheart', name:'ins波点爱心', surface:'lock', dynamic:false},
  {type:'caption', name:'黑白ins文案', surface:'lock', dynamic:false},
  {type:'scrapbook', name:'ins风属性本', surface:'lock', dynamic:false},
  {type:'profilecard', name:'ins风头像', surface:'lock', dynamic:false},
  {type:'viz', name:'实时音乐可视化', surface:'home', dynamic:true},
  {type:'breathe', name:'AI 陪伴呼吸感应', surface:'home', dynamic:true},
  {type:'countdown', name:'在一起实时计时', surface:'home', dynamic:true},
  {type:'affection', name:'好感度实时波动条', surface:'home', dynamic:true}
];
function pluginPreviewHTML(type){
  switch(type){
    case 'player': return '<div class="ph-slot"></div><div class="p-info"><div class="p-title">Just Like That</div><div class="p-sub">in the moment ﹅˚⋆</div></div><div class="p-ctrl"><div class="ctrl-tri rev"></div><div class="ctrl-pause"></div><div class="ctrl-tri"></div></div>';
    case 'glasstext': return '<div class="avs"><div class="av ph-slot"></div><div class="av ph-slot"></div></div><div class="msg">我和你 ٩(ˊᗜˋ*)و</div>';
    case 'console': return '<div class="frame"><div class="knob l"></div><div class="knob r"></div><div class="ph-slot"></div></div>';
    case 'idol': return '<div class="ph-slot"></div><div class="tags"><span class="tag">liquidtea</span><span class="tag">ilove</span><span class="tag">imissu</span></div>';
    case 'note': return '<div class="n-row"><div class="av ph-slot"></div>i love u ‧₊˚⊹</div><div class="n-row"><div class="av ph-slot"></div>i miss u so much</div><div class="n-row"><div class="av ph-slot"></div>m 2 luv u ᐟ</div>';
    case 'avatarframe': return '<div class="ph-slot"></div><div class="id">@fated_2026</div>';
    case 'vinyl': return '<div class="disc"><div class="ph-slot"></div></div>';
    case 'dotheart': return '<div class="heart-wrap"><div class="ph-slot"></div></div>';
    case 'caption': return '“淡淡的，就会顺顺的。”';
    case 'scrapbook': return '<div class="ph-slot"></div><div class="note-sq">二人三脚的日子过<br>得再糟糕，也胜过一个人。</div><div class="note-sq">想把这一刻<br>好好记下来。</div><div class="ph-slot"></div>';
    case 'profilecard': return '<div class="top"><div class="ph-slot"></div><div><div class="p-title">Roxo7</div><div class="p-sub">@fated_2026</div></div></div><div class="quote">爱是两颗相拥的透明心脏</div><div class="loc">· 首尔</div>';
    case 'viz': return '<div class="viz-title">Now Playing · Live</div><div class="viz-song">Lover · Taylor Swift</div><div class="viz-bars">'+Array.from({length:9}).map((_,i)=>'<span style="animation-delay:'+(i*0.09)+'s;"></span>').join('')+'</div>';
    case 'breathe': {
      var wcb = (typeof widgetCustom!=='undefined' && widgetCustom['breathe']) || {};
      var bImg = wcb.img || '';
      var bName = (wcb.name!=null && wcb.name!=='') ? wcb.name : 'Fated';
      var bStatus = (wcb.status!=null && wcb.status!=='') ? wcb.status : '正在陪着你';
      var bCore = bImg
        ? '<div class="ph-slot filled" data-wc-img="breathe" style="width:100%;height:100%;background-image:url('+bImg+');"></div>'
        : '<div class="ph-slot" data-wc-img="breathe" style="width:100%;height:100%;background-image:none;">'+avatarHTML()+'</div>';
      return '<div class="breathe-wrap"><div class="breathe-ring"><div class="ring"></div><div class="ring r2"></div><div class="core">'+bCore+'</div></div><div class="breathe-name" contenteditable="true" onblur="saveWidgetField(\'breathe\',\'name\',this)" title="点此改名字">'+esc(bName)+'</div><div class="breathe-status"><span class="dot"></span><span contenteditable="true" onblur="saveWidgetField(\'breathe\',\'status\',this)" title="点此改状态">'+esc(bStatus)+'</span></div></div>';
    }
    case 'countdown': return '<div class="cd-title">在一起已经</div><div class="cd-name" id="together-sub">在一起 0 天 0 时 1 分</div><div class="cd-nums"><div class="cd-cell"><div class="n cd-d">--</div><div class="u">天</div></div><div class="cd-cell"><div class="n cd-h">--</div><div class="u">时</div></div><div class="cd-cell"><div class="n cd-m">--</div><div class="u">分</div></div><div class="cd-cell"><div class="n cd-s">--</div><div class="u">秒</div></div></div>';
    case 'affection': return '<div class="aff-title">好感度 · 实时</div><div class="aff-row"><div class="aff-track"><i></i></div><div class="aff-num">78%</div></div>';
  }
}
function addPlugin(type, opts){
  opts = opts || {};
  const def = pluginDefs.find(p=>p.type===type);
  // ???????????????????????????????
  document.querySelectorAll('[data-wc-type="'+type+'"]').forEach(function(n){ n.remove(); });
  var ri = removedPlugins.indexOf(type); if(ri>-1) removedPlugins.splice(ri,1);
  if(typeof fatedClearDeleted==='function') fatedClearDeleted('plugins', type, Date.now());
  let el;
  if(def.surface==='lock'){
    const stack = document.getElementById('widget-stack');
    el = document.createElement('div');
    el.className = 'widget glass-liquid w-'+type;
    el.innerHTML = pluginPreviewHTML(type);
    stack.appendChild(el);
  } else {
    const grid = document.getElementById('sb-grid');
    el = document.createElement('div');
    el.className = 'sb-widget glass-liquid'+(type==='countdown'||type==='affection' ? ' full':'');
    el.innerHTML = pluginPreviewHTML(type);
    grid.appendChild(el);
    if(type==='countdown') startTogetherTimer();
    var _pgr = document.getElementById('home-pager');
    if(_pgr) setTimeout(function(){ _pgr.scrollTo({ left: _pgr.offsetWidth, behavior: 'smooth' }); }, 300);
  }
  el.setAttribute('data-wc-type', type);
  if(type!=='breathe'){
    const cap = (widgetCustom[type] && widgetCustom[type].caption) || '';
    const bar = document.createElement('div');
    bar.className='wc-bar';
    var imgBtn=document.createElement('div');
    imgBtn.className='wc-img-btn';
    imgBtn.textContent='Image';
    imgBtn.onclick=function(){ wcPickImg(imgBtn); };
    var capEl=document.createElement('div');
    capEl.className='wc-cap';
    capEl.contentEditable='true';
    capEl.setAttribute('placeholder','Custom text');
    capEl.textContent=cap;
    capEl.onblur=function(){ saveWidgetText(capEl, type); };
    bar.appendChild(imgBtn);
    bar.appendChild(capEl);
    el.appendChild(bar);
    if(!el.querySelector('.ph-slot')){
      let slot=document.createElement('div'); slot.className='ph-slot'; slot.style.cssText='width:54px;height:54px;border-radius:14px;margin:6px auto;'; el.insertBefore(slot, el.firstChild);
    }
    restoreWidgetSlotImages(el, type);
  } else {
    restoreWidgetSlotImages(el, type);
  }
  el.style.position='relative';
  var del=document.createElement('div'); del.className='wc-del'; del.textContent='?'; del.setAttribute('onclick',"removePlugin('"+type+"')"); el.appendChild(del);
  bindSlots(el);
  closeSheet('pluginlib');
  if(!opts.skipSave && (typeof isPersistenceBooting!=='function' || !isPersistenceBooting())) saveState();
}
function remountPluginsFromSavedState(){
  if(typeof document==='undefined' || !document.querySelectorAll) return;
  var saved = (typeof getSavedPluginTypes==='function') ? getSavedPluginTypes() : null;
  var current = (typeof buildActivePluginsSnapshot==='function') ? buildActivePluginsSnapshot() : [];
  var list = Array.isArray(saved) && saved.length ? saved : current;
  if(!list.length) return;
  document.querySelectorAll('[data-wc-type]').forEach(function(n){ n.remove(); });
  list.forEach(function(t){ if(removedPlugins.indexOf(t)<0 && !(typeof fatedIsDeleted==='function' && fatedIsDeleted('plugins', t, 0))) addPlugin(t, {skipSave:true}); });
}
function removePlugin(type){
  document.querySelectorAll('[data-wc-type="'+type+'"]').forEach(function(n){ n.remove(); });
  if(removedPlugins.indexOf(type)<0) removedPlugins.push(type);
  if(typeof fatedMarkDeleted==='function') fatedMarkDeleted('plugins', type);
  if(typeof fatedMarkDeleted==='function'){
    fatedMarkDeleted('images', 'widget:'+type+':img');
    for(var i=0;i<12;i++) fatedMarkDeleted('images', 'widget:'+type+':img:'+i);
  }
  renderPluginLibrary();
  saveState();
}
let plibFilter = 'all';
function setPlibFilter(f){
  plibFilter = f;
  ['all','lock','home'].forEach(k=>document.getElementById('plib-tab-'+k).classList.toggle('active', k===f));
  renderPluginLibrary();
}
function renderPluginLibrary(){
  const list = document.getElementById('plugin-list');
  const items = pluginDefs.filter(p=> plibFilter==='all' ? true : p.surface===plibFilter);
  if(!items.length){ list.innerHTML='<div style="font-size:12px;color:var(--ink-faint);text-align:center;padding:24px;">暂无插件</div>'; return; }
  // iOS 风格：每页 6 个（2 列 × 3 行），放不下的自动进下一页
  const PER_PAGE = 6;
  const pages = [];
  for(let i=0;i<items.length;i+=PER_PAGE){ pages.push(items.slice(i,i+PER_PAGE)); }
  list.innerHTML = '<div class="plib-pager" id="plib-pager">'+pages.map(function(pg){
    return '<div class="plib-page">'+pg.map(function(p){
      const w = p.surface==='standby' ? 200 : 180;
      const inner = '<div class="glass-liquid" style="position:absolute; top:50%; left:50%; width:'+w+'px; transform:translate(-50%,-50%) scale(.34); border-radius:20px; padding:14px;">'+pluginPreviewHTML(p.type)+'</div>';
      const tag = p.dynamic ? '<span class="tag-live">动态</span>' : '';
      const target = p.surface==='lock' ? '→ 锁屏' : '→ 主屏幕';
      var present = document.querySelector('[data-wc-type="'+p.type+'"]');
      var btn = present
        ? '<div class="add-btn remove" onclick="removePlugin(\''+p.type+'\')">移除</div>'
        : '<div class="add-btn" onclick="addPlugin(\''+p.type+'\')">添加</div>';
      return '<div class="plib-cell"><div class="prev">'+inner+'</div><div class="name">'+p.name+tag+'</div><div class="target">'+target+'</div>'+btn+'</div>';
    }).join('')+'</div>';
  }).join('')+'</div>'+(pages.length>1?'<div class="plib-dots" id="plib-dots">'+pages.map(function(_,i){return '<div class="plib-dot'+(i===0?' active':'')+'"></div>';}).join('')+'</div>':'');
  // 滑动翻页时高亮对应指示点
  const pager = document.getElementById('plib-pager');
  const dots = document.getElementById('plib-dots');
  if(pager){
    let ticking=false;
    pager.onscroll = function(){
      if(ticking) return; ticking=true;
      requestAnimationFrame(function(){
        const idx = Math.round(pager.scrollLeft / pager.clientWidth);
        if(dots) Array.from(dots.children).forEach(function(d,i){ d.classList.toggle('active', i===idx); });
        ticking=false;
      });
    };
  }
}

/* ============ TOGETHER ELAPSED (standby, 正向计时) ============ */
let togetherStart = null, togetherInt = null;
function getTogetherStart(){
  try{
    var k='fated_together_start';
    var v=localStorage.getItem(k);
    if(!v){
      // 默认从「第一分钟」开始：点进来即视为已在一起 1 分钟
      v=new Date(Date.now()-60000).toISOString();
      localStorage.setItem(k,v);
    }
    return new Date(v).getTime();
  }catch(e){ return Date.now()-60000; }
}
function startTogetherTimer(){
  if(togetherInt) return;
  togetherStart=getTogetherStart();
  togetherInt=setInterval(()=>{
    const now=Date.now();
    let diff=Math.max(0, now-togetherStart);
    const d=Math.floor(diff/86400000); diff-=d*86400000;
    const h=Math.floor(diff/3600000); diff-=h*3600000;
    const m=Math.floor(diff/60000); diff-=m*60000;
    const s=Math.floor(diff/1000);
    const dds=document.querySelectorAll('.cd-d'), hhs=document.querySelectorAll('.cd-h'), mms=document.querySelectorAll('.cd-m'), sss=document.querySelectorAll('.cd-s');
    if(!sss.length) return;
    dds.forEach(e=>e.textContent=pad(d)); hhs.forEach(e=>e.textContent=pad(h)); mms.forEach(e=>e.textContent=pad(m)); sss.forEach(e=>e.textContent=pad(s));
    sss.forEach(e=>{ e.classList.add('tick'); setTimeout(()=>e.classList.remove('tick'),250); });
    const sub=document.getElementById('together-sub');
    if(sub) sub.textContent='在一起 '+d+' 天 '+h+' 时 '+m+' 分';
  },1000);
}

/* ============ LOCK SCREEN: swipe up to unlock ============ */
const lockInner = document.getElementById('lock-inner');
let lockStartY=null, lockDragging=false, lockCurrentY=0;
const LOCK_MAX=520, LOCK_THRESH=150;
function lockOnDown(e){ lockDragging=true; lockStartY=(e.touches?e.touches[0].clientY:e.clientY); lockInner.style.transition='none'; }
function lockOnMove(e){
  if(!lockDragging) return;
  const y=(e.touches?e.touches[0].clientY:e.clientY);
  let delta=y-lockStartY; if(delta>0) delta*=0.15;
  lockCurrentY=Math.max(delta, -LOCK_MAX);
  lockInner.style.transform='translateY('+lockCurrentY+'px)';
  lockInner.style.opacity=1-Math.min(Math.abs(lockCurrentY)/LOCK_MAX,1)*0.9;
}
function lockOnUp(){
  if(!lockDragging) return;
  lockDragging=false;
  lockInner.style.transition='transform .45s cubic-bezier(.6,0,.2,1), opacity .4s ease';
  if(lockCurrentY < -LOCK_THRESH){
    lockInner.style.transform='translateY(0)'; lockInner.style.opacity=1;
    /* If passcode is set, show passcode overlay; otherwise go to desktop */
    if(userPasscode){
      showPasscodeOverlay('unlock');
    } else {
      goToScreen('home');
    }
  } else {
    lockInner.style.transform='translateY(0)'; lockInner.style.opacity=1;
  }
  lockCurrentY=0;
}
lockInner.addEventListener('pointerdown', lockOnDown);
window.addEventListener('pointermove', lockOnMove);
window.addEventListener('pointerup', lockOnUp);
lockInner.addEventListener('touchstart', lockOnDown, {passive:true});
window.addEventListener('touchmove', lockOnMove, {passive:true});
window.addEventListener('touchend', lockOnUp);

/* ============ NEGATIVE PAGE (负一屏 / Today View) ============ */
(function(){
  var neg = document.getElementById('neg-page');
  if(!neg) return;
  var home = document.getElementById('view-home');
  var open=false, drag=false, sx=0, dx=0, W=window.innerWidth;
  function getTogetherDays(){
    try{ var s=getTogetherStart(); return Math.max(0, Math.floor((Date.now()-s)/86400000)); }catch(e){ return 0; }
  }
  function updateNegPage(){
    var clk=document.getElementById('clock-home'); var c=document.getElementById('neg-clock'); if(c) c.textContent = clk?clk.textContent:'--:--';
    var dt=document.getElementById('home-date-line'); var d=document.getElementById('neg-date'); if(d) d.textContent = dt?dt.textContent:'';
    var t=document.getElementById('neg-together'); if(t) t.textContent = getTogetherDays()+' 天';
  }
  function onDown(e){ drag=true; sx=(e.touches?e.touches[0].clientX:e.clientX); dx=0; W=window.innerWidth; neg.style.transition='none'; }
  function onMove(e){
    if(!drag) return;
    var x=(e.touches?e.touches[0].clientX:e.clientX);
    var d=x-sx;
    if(!open){ if(d<0) d=0; if(d>W) d=W; } else { if(d>0) d*=0.25; }
    dx=d;
    var tx = open ? Math.min(d,0) : (d - W);
    neg.style.transform='translateX('+tx+'px)';
  }
  function onUp(){
    if(!drag) return; drag=false;
    neg.style.transition='transform .42s cubic-bezier(.32,.72,0,1)';
    if(open){
      if(dx < -W*0.3){ open=false; neg.style.transform='translateX(-100%)'; }
      else { neg.style.transform='translateX(0)'; }
    } else {
      if(dx > W*0.35){ open=true; neg.style.transform='translateX(0)'; updateNegPage(); }
      else { neg.style.transform='translateX(-100%)'; }
    }
  }
  home.addEventListener('touchstart', function(e){ if(open || (e.touches && e.touches[0].clientX<70)) onDown(e); }, {passive:true});
  home.addEventListener('touchmove', function(e){ if(drag){ if(e.cancelable) e.preventDefault(); onMove(e); } }, {passive:false});
  home.addEventListener('touchend', onUp);
  home.addEventListener('mousedown', function(e){ if(open || e.clientX<70) onDown(e); });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  window.closeNegPage = function(){ open=false; neg.style.transition='transform .42s cubic-bezier(.32,.72,0,1)'; neg.style.transform='translateX(-100%)'; };
  window.openNegPage = function(){ open=true; updateNegPage(); neg.style.transition='transform .42s cubic-bezier(.32,.72,0,1)'; neg.style.transform='translateX(0)'; };
})();
/* ============ KEYBOARD ADAPT (软键盘适配) ============ */
(function(){
  var root=document.documentElement;
  var prevKB=0;
  function updateKB(){
    if(!window.visualViewport) return;
    var vv=window.visualViewport;
    var kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty('--kb', kh+'px');
    var isOpen = kh>50;
    var wasOpen = document.body.classList.contains('kb-open');
    document.body.classList.toggle('kb-open', isOpen);
    // 键盘打开时：确保消息列表滚到底部，使输入栏始终可见
    if(isOpen && !wasOpen){
      setTimeout(function(){
        var msgs=document.getElementById('thread-msgs');
        if(msgs) msgs.scrollTop=msgs.scrollHeight;
      }, 100);
    }
    // 键盘关闭时：重置页面滚动，消除残留偏移
    if(wasOpen && !isOpen){
      setTimeout(function(){
        window.scrollTo(0,0);
        document.body.scrollTop=0;
        document.documentElement.scrollTop=0;
        var msgs=document.getElementById('thread-msgs');
        if(msgs) msgs.scrollTop=msgs.scrollHeight;
      }, 120);
    }
    prevKB=kh;
  }
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', updateKB);
    window.visualViewport.addEventListener('scroll', updateKB);
  }
  window.addEventListener('resize', updateKB);
  // 防止 iOS 聚焦时把 fixed/relative 容器滚出屏幕
  window.addEventListener('scroll', function(){
    if(document.body.classList.contains('kb-open')){
      window.scrollTo(0,0);
    }
  }, { passive:true });
  window.addEventListener('focusin', function(e){
    var el=e.target; if(!el || !el.closest) return;
    if(el.tagName==='TEXTAREA' || (el.tagName==='INPUT' && ['text','password','email','number','search','tel','url','date','datetime-local','time'].indexOf(el.type)>=0)){
      if(el.id==='invite-input') document.body.classList.add('kb-invite');
      // 聊天输入框：不调用 scrollIntoView（会导致页面整体位移、底部留白），
      // 改为让消息列表滚动到底部，使输入栏自然跟随键盘
      if(el.id==='msg-input'){
        setTimeout(function(){
          var msgs=document.getElementById('thread-msgs');
          if(msgs) msgs.scrollTop=msgs.scrollHeight;
        }, 250);
        return;
      }
      // 其他输入框：用 nearest 最小化页面位移
      setTimeout(function(){ try{ el.scrollIntoView({block:'nearest', behavior:'smooth'}); }catch(_){} }, 250);
    }
  });
  window.addEventListener('focusout', function(){
    document.body.classList.remove('kb-invite');
    setTimeout(function(){
      window.scrollTo(0,0);
      document.body.scrollTop=0;
      document.documentElement.scrollTop=0;
      var msgs=document.getElementById('thread-msgs');
      if(msgs) msgs.scrollTop=msgs.scrollHeight;
    }, 120);
  });
})();



/* ============ DATA MANAGER UI ============ */
function dataManagerOwnContactIds(){
  return Object.keys(contacts||{}).filter(function(k){
    return typeof isPersistableContactId==='function' ? isPersistableContactId(k) : k!=='me';
  });
}
function dataManagerByteSize(value){
  try{ return new Blob([JSON.stringify(value||{})]).size; }catch(e){ return 0; }
}
function dataManagerFormatSize(bytes){
  bytes = Number(bytes)||0;
  if(bytes < 1024) return bytes + ' B';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(2) + ' MB';
}
function dataManagerAssetSize(){
  var total = 0;
  try{
    if(typeof buildProfileAssets==='function') total += dataManagerByteSize(buildProfileAssets());
    if(typeof buildMomentsAssets==='function') total += dataManagerByteSize(buildMomentsAssets());
    if(typeof buildContactAssets==='function') total += dataManagerByteSize(buildContactAssets());
    if(typeof buildFontAssets==='function') total += dataManagerByteSize(buildFontAssets());
    total += dataManagerByteSize(widgetCustom||{});
    total += dataManagerByteSize((appIcons||[]).map(function(a){ return {id:a.id,img:a.img}; }));
    total += dataManagerByteSize(lockWp||{});
    total += dataManagerByteSize(homeWp||{});
  }catch(e){}
  return total;
}
function renderDataManager(){
  var ids = dataManagerOwnContactIds();
  var apiProfiles = (apiConfig && Array.isArray(apiConfig.profiles)) ? apiConfig.profiles.length : ((apiConfig && apiConfig.models) ? Object.keys(apiConfig.models).length : 0);
  var chatCount = ids.reduce(function(sum,id){ var c=contacts[id]; return sum + ((c && Array.isArray(c.seed)) ? c.seed.length : 0); }, 0);
  var set = function(id, text){ var el=document.getElementById(id); if(el) el.textContent=text; };
  set('dm-api-count', String(apiProfiles));
  set('dm-contact-count', String(ids.length));
  set('dm-chat-count', String(chatCount));
  set('dm-asset-size', dataManagerFormatSize(dataManagerAssetSize()));
  set('dm-status', '\u672c\u673a\u6570\u636e\u7edf\u8ba1\u5df2\u5237\u65b0\u3002');
}
function dataManagerSaveNow(){
  var ok = typeof saveState==='function' ? saveState() : false;
  renderDataManager();
  var msg = ok ? '\u5df2\u5199\u5165\u672c\u673a\u4fdd\u5b58\u3002' : '\u5df2\u5c1d\u8bd5\u5199\u5165 IndexedDB \u5907\u4efd\u3002';
  var el=document.getElementById('dm-status'); if(el) el.textContent=msg;
  if(typeof showToast==='function') showToast(msg, 1400, ok?'ok':'warn');
}
function dataManagerExportSnapshot(){
  try{
    var payload = {
      app:'Fated OS',
      schemaVersion:1,
      exportedAt:new Date().toISOString(),
      lightState: typeof buildLightState==='function' ? buildLightState() : {},
      assets:{
        profile: typeof buildProfileAssets==='function' ? buildProfileAssets() : {},
        moments: typeof buildMomentsAssets==='function' ? buildMomentsAssets() : {},
        contacts: typeof buildContactAssets==='function' ? buildContactAssets() : [],
        font: typeof buildFontAssets==='function' ? buildFontAssets() : {},
        widgets: widgetCustom||{},
        appIcons: (appIcons||[]).map(function(a){ return {id:a.id,img:a.img}; }),
        lockWp: lockWp||{},
        homeWp: homeWp||{}
      }
    };
    var blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var day = new Date().toISOString().slice(0,10);
    a.href = url; a.download = 'fated-os-backup-'+day+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    var el=document.getElementById('dm-status'); if(el) el.textContent='\u5bfc\u51fa\u5df2\u5f00\u59cb\uff0c\u8bf7\u4fdd\u7559\u4e0b\u8f7d\u7684 JSON \u5907\u4efd\u3002';
    if(typeof showToast==='function') showToast('\u5907\u4efd\u5df2\u5bfc\u51fa', 1400, 'ok');
  }catch(e){
    var el=document.getElementById('dm-status'); if(el) el.textContent='\u5bfc\u51fa\u5931\u8d25\uff1a'+(e.message||'unknown');
    if(typeof showToast==='function') showToast('\u5bfc\u51fa\u5931\u8d25', 1600, 'err');
  }
}
function dataManagerCheckStorage(){
  var localOk=false, dbOk=!!(window.indexedDB);
  try{ localStorage.setItem('fated_storage_probe','1'); localStorage.removeItem('fated_storage_probe'); localOk=true; }catch(e){}
  var msg = 'localStorage: '+(localOk?'OK':'LIMITED')+' / IndexedDB: '+(dbOk?'OK':'UNAVAILABLE');
  var el=document.getElementById('dm-status'); if(el) el.textContent=msg;
  if(typeof showToast==='function') showToast(msg, 1800, localOk&&dbOk?'ok':'warn');
}
function dataManagerOpenCloud(){
  closeSheet('datamgr');
  openSheet('cloudsync');
  if(typeof cloudSyncInit==='function') cloudSyncInit();
}


function bootHashRoute(){
  try{
    var h = String(location.hash || '').replace(/^#/, '').toLowerCase();
    if(h === 'go'){
      setTimeout(function(){ openSheet('go'); initGo(); }, 350);
    }
  }catch(e){}
}
window.addEventListener('load', bootHashRoute);

