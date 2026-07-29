
/* ============ 安全存储层（防止 file:// / 微信内置浏览器 / 隐私模式下 localStorage 抛错导致整页空白）============ */
var __memStore = {};
var safeLS = {
  getItem:function(k){ try{ return window.localStorage.getItem(k); }catch(e){ return (k in __memStore)? __memStore[k] : null; } },
  setItem:function(k,v){ try{ window.localStorage.setItem(k,v); }catch(e){ __memStore[k]=String(v); } },
  removeItem:function(k){ try{ window.localStorage.removeItem(k); }catch(e){ delete __memStore[k]; } }
};

/* ============ INVITE CODE ============ */
var INVITE_CODE = '123456';
(function(){
  try{
    var saved = safeLS.getItem('invite_verified');
    var scr = document.getElementById('invite-screen');
    if(scr) scr.style.display = (saved==='true') ? 'none' : 'flex';
    window._apiBase = '/api';
  }catch(e){ /* 出错也绝不阻断后续脚本，保证页面能渲染 */ }
})();

function grantInvite(){
  safeLS.setItem('invite_verified','true');
  var s=document.getElementById('invite-screen'); if(s) s.style.display='none';
}
function denyInvite(msg){
  var m=document.getElementById('invite-msg'); if(m) m.textContent=msg;
}
function verifyInvite(){
  var code = document.getElementById('invite-input').value.trim();
  if(!code){ denyInvite('Please enter a code'); return; }
  // 纯前端校验：邀请码已内置前端，直接比对，不依赖服务器（任何部署方式都能进）
  if(code === INVITE_CODE) grantInvite();
  else denyInvite('邀请码错误 / Invalid code');
}

function pad(n){ return n.toString().padStart(2,'0'); }

/* ============ GLOBAL USER STATE ============ */
let userName = 'user';
let userWxid = 'fated_2026';
let userBio = '';
let userCover = null;
let userPrefs = '';
let userAvatar = null;
let chatBg = '#FBF8F6';
let momentsBg = null;
let personaSeq = 1;
let walletBalance = 9960.00;
let walletTx = [];
let viewAs = 'me';
let mediaRec = null, mediaChunks = [], recordingTimer = null, recStart = 0, isRecording = false;
let moments = [];
let composeHidden = [];
/* 当前正在编辑/查看的联系人朋友圈 ID（用于发朋友圈时定位） */
let _cpmTarget = null;
let _cpmComposerScope = 'me';   /* 'me' = 自己发, 'contact' = 帮联系人发 */
let _postComposeImage = null;   /* dataURL */
let _cpmCoverTarget = null;     /* 'me' | contactId */
function nowTime(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function nowStamp(){ return Date.now(); }

/* ============ COMPACT LUNAR CALENDAR (1900-2050) ============ */
const lunarInfo = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04bd7,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
];
const Gan = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const Zhi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const Animals = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const lunarMonthCN = ['正','二','三','四','五','六','七','八','九','十','冬','腊'];
const lunarDayCN = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
function lYearDays(y){ let i, sum=348; for(i=0x8000; i>0x8; i>>=1) sum += (lunarInfo[y-1900] & i)? 1: 0; return sum + leapDays(y); }
function leapDays(y){ if(leapMonth(y)) return (lunarInfo[y-1900] & 0x10000)? 30: 29; return 0; }
function leapMonth(y){ return lunarInfo[y-1900] & 0xf; }
function monthDays(y,m){ return (lunarInfo[y-1900] & (0x10000>>m))? 30: 29; }
function solarToLunar(y,m,d){
  let baseDate = new Date(1900,0,31);
  let objDate = new Date(y,m-1,d);
  let offset = Math.floor((objDate - baseDate) / 86400000);
  let i, leap=0, temp=0;
  for(i=1900; i<2050 && offset>0; i++){ temp = lYearDays(i); offset -= temp; }
  if(offset < 0){ offset += temp; i--; }
  let year = i;
  leap = leapMonth(year);
  let isLeap = false;
  for(i=1; i<13 && offset>0; i++){
    if(leap>0 && i==(leap+1) && !isLeap){ --i; isLeap = true; temp = leapDays(year); }
    else { temp = monthDays(year, i); }
    if(isLeap && i==leap+1) isLeap = false;
    offset -= temp;
  }
  if(offset===0 && leap>0 && i==leap+1){ if(isLeap){ isLeap=false; } else { isLeap=true; --i; } }
  if(offset<0){ offset += temp; --i; }
  let month = i;
  let day = offset + 1;
  return {
    ganzhi: Gan[(year-4)%10] + Zhi[(year-4)%12],
    zodiac: Animals[(year-4)%12],
    monthStr: lunarMonthCN[month-1] + '月',
    dayStr: lunarDayCN[day-1],
    full: Gan[(year-4)%10] + Zhi[(year-4)%12] + '年' + (isLeap?'闰':'') + lunarMonthCN[month-1] + '月' + lunarDayCN[day-1]
  };
}

function formatLockDate(d){
  const weeks = ['周日','周一','周二','周三','周四','周五','周六'];
  const solar = (d.getMonth()+1) + '月' + d.getDate() + '日' + weeks[d.getDay()];
  const lunar = solarToLunar(d.getFullYear(), d.getMonth()+1, d.getDate());
  return solar + ' · ' + lunar.full;
}

var _bat=100;try{navigator.getBattery().then(function(b){_bat=Math.round(b.level*100);upBat();b.onlevelchange=function(){_bat=Math.round(b.level*100);upBat()}})}catch(e){} function upBat(){var f=document.getElementById('bat-fill');var p=document.getElementById('bat-pct');if(f)f.style.width=_bat+'%';if(p)p.textContent=_bat+'%'}
function tick(){
  const d = new Date();
  const t = pad(d.getHours()) + ':' + pad(d.getMinutes());
  document.getElementById('clock-top').textContent = t;
  const big = document.getElementById('clock-big'); if(big) big.textContent = t;
  const home = document.getElementById('clock-home'); if(home) home.textContent = t;
  const dateStr = formatLockDate(d);
  const dl = document.getElementById('lock-date-line'); if(dl) dl.textContent = dateStr;
  const hdl = document.getElementById('home-date-line'); if(hdl) hdl.textContent = dateStr;
}
tick(); setInterval(tick,10000); upBat();

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
  if(userPasscode){
    statusText.textContent = '修改锁屏密码';
    removeRow.style.display = 'flex';
  } else {
    statusText.textContent = '设置锁屏密码';
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
var appIcons = [
  {id:'wechat', name:'Messages', ico:svgChat, img:null, action:"goToScreen('wechatapp')"},
  {id:'novel', name:'Books', ico:svgBook, img:null, action:"openSheet('novel');renderNovelPick();"},
  {id:'music', name:'Music', ico:svgMusic, img:null, action:"openSheet('music');initMusicPlayer();"},
  {id:'forum', name:'Forum', ico:svgForum, img:null, action:"openSheet('forum');initForum();"},
  {id:'couple', name:'Heart', ico:svgHeart, img:null, action:"openSheet('couple');initCouple();"},
  {id:'game', name:'Games', ico:svgGame, img:null, action:"openSheet('game');initGame();"},
  {id:'suoha', name:'Suoha', ico:svgSuoha, img:null, action:"openSheet('suoha');initSuoha();"},
  {id:'go', name:'GO', ico:svgGo, img:null, action:"openSheet('go');initGo();"},
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
    def.img = res;
    renderDesktopIcons(); renderIconGrid(); saveState();
  });
});
function pickIcon(id){ activeIconId=id; iconInput.click(); }
function resetIcon(e, id){ e.stopPropagation(); const def=appIcons.find(a=>a.id===id); def.img=null; renderDesktopIcons(); renderIconGrid(); }
function renderDesktopIcons(){
  var board=document.getElementById('desktop-board');
  board.innerHTML=appIcons.map(function(a){
    var bg=a.img?' style="background-image:url('+a.img+');background-size:cover;"':'';
    var inner=a.img?'':'<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;">'+a.ico+'</div>';
    return '<div class="d-tile"'+bg+' onclick="'+a.action+'">'+inner+'</div>';
  }).join('');
  board.innerHTML+='<div style="text-align:center;font-size:9px;color:#bbb;letter-spacing:1px;margin-top:4px;">'+appIcons.map(function(a){return a.name;}).join(' &middot; ')+'</div>';
  var dock=document.getElementById('desktop-dock');
  var dockIds=['wechat','couple','settings'];
  dock.innerHTML=dockIds.map(function(id){
    var a=appIcons.find(function(x){return x.id===id;});
    var bg=a.img?' style="background-image:url('+a.img+');background-size:cover;"':'';
    var inner=a.img?'':'<div style="display:flex;align-items:center;justify-content:center;">'+a.ico+'</div>';
    return '<div class="tile"'+bg+' onclick="'+a.action+'">'+inner+'</div>';
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
    var t=activeSlot.getAttribute('data-wc-img'); if(t){ widgetCustom[t]=widgetCustom[t]||{}; widgetCustom[t].img=res; saveState(); }
  });
});
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
  if(target==='lock'||target==='both'){ lockWp={type:type, url:url||''}; paintWallpaper(document.getElementById('lock-wallpaper'), lockWp); }
  if(target==='home'||target==='both'){ homeWp={type:type, url:url||''}; paintWallpaper(document.getElementById('home-wallpaper'), homeWp); }
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
      var bName = (wcb.name!=null && wcb.name!=='') ? wcb.name : '测试员1';
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
function addPlugin(type){
  const def = pluginDefs.find(p=>p.type===type);
  // 删除已存在的同类型实例（避免重复添加），并从“已移除”列表移除
  document.querySelectorAll('[data-wc-type="'+type+'"]').forEach(function(n){ n.remove(); });
  var ri = removedPlugins.indexOf(type); if(ri>-1) removedPlugins.splice(ri,1);
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
    /* 添加主屏插件后自动滑到第2页 */
    var _pgr = document.getElementById('home-pager');
    if(_pgr) setTimeout(function(){ _pgr.scrollTo({ left: _pgr.offsetWidth, behavior: 'smooth' }); }, 300);
  }
  el.setAttribute('data-wc-type', type);
  if(type!=='breathe'){
    // customization: editable caption + image slot (generic widgets)
    const cap = (widgetCustom[type] && widgetCustom[type].caption) || '';
    const bar = document.createElement('div');
    bar.className='wc-bar';
    bar.innerHTML = '<div class="wc-img-btn" onclick="wcPickImg(this)">📷 图</div><div class="wc-cap" contenteditable="true" onblur="saveWidgetText(this,\''+type+'\')" placeholder="点此自定义文字">'+esc(cap)+'</div>';
    el.appendChild(bar);
    // ensure a visible image slot we can import into
    let slot = el.querySelector('.ph-slot');
    if(!slot){ slot=document.createElement('div'); slot.className='ph-slot'; slot.style.cssText='width:54px;height:54px;border-radius:14px;margin:6px auto;'; el.insertBefore(slot, el.firstChild); }
    slot.setAttribute('data-wc-img', type);
    if(widgetCustom[type] && widgetCustom[type].img){ slot.style.backgroundImage='url('+widgetCustom[type].img+')'; slot.classList.add('filled'); }
  }
  el.style.position='relative';
  var del=document.createElement('div'); del.className='wc-del'; del.textContent='×'; del.setAttribute('onclick',"removePlugin('"+type+"')"); el.appendChild(del);
  bindSlots(el);
  closeSheet('pluginlib');
}
function removePlugin(type){
  document.querySelectorAll('[data-wc-type="'+type+'"]').forEach(function(n){ n.remove(); });
  if(removedPlugins.indexOf(type)<0) removedPlugins.push(type);
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

/* ============ iOS-STYLE PASSCODE ============ */
let userPasscode = null;     /* null = not set; "1234" = set */
let pcInput = '';            /* current input string */
let pcMode = 'unlock';       /* 'unlock' | 'set' | 'confirm' | 'change_old' | 'change_new' | 'change_confirm' */
let pcTempNew = '';           /* temp storage for new passcode during set/change */
let pcOnChangeDone = null;   /* callback after passcode change completes */

const pcKeypadData = [
  {num:'1', letters:''},
  {num:'2', letters:'ABC'},
  {num:'3', letters:'DEF'},
  {num:'4', letters:'GHI'},
  {num:'5', letters:'JKL'},
  {num:'6', letters:'MNO'},
  {num:'7', letters:'PQRS'},
  {num:'8', letters:'TUV'},
  {num:'9', letters:'WXYZ'},
  {type:'fn', action:'cancel', label:'取消'},
  {num:'0', letters:'+'},
  {type:'fn', action:'delete', label:''}
];

function renderPcKeypad(){
  const kp = document.getElementById('pc-keypad');
  kp.innerHTML = pcKeypadData.map(k=>{
    if(k.type==='fn'){
      if(k.action==='delete'){
        return '<div class="pc-key fn" onclick="pcDelete()"><div class="fn-icon"></div></div>';
      }
      return '<div class="pc-key fn" onclick="'+(k.action==='cancel'?'cancelPasscode()':'')+'"><span class="fn-text">'+k.label+'</span></div>';
    }
    return '<div class="pc-key" onclick="pcPress(\''+k.num+'\')"><span class="num">'+k.num+'</span><span class="letters">'+k.letters+'</span></div>';
  }).join('');
}

function updatePcDots(){
  const dots = document.querySelectorAll('#pc-dots .pc-dot');
  dots.forEach((d,i)=>{
    d.classList.remove('filled','error');
    if(i < pcInput.length) d.classList.add('filled');
  });
}

function pcPress(num){
  if(pcInput.length >= 4) return;
  pcInput += num;
  updatePcDots();
  if(pcInput.length === 4){
    setTimeout(pcSubmit, 120);
  }
}

function pcDelete(){
  if(pcInput.length > 0){
    pcInput = pcInput.slice(0,-1);
    updatePcDots();
  }
}

function pcShowError(msg){
  const err = document.getElementById('pc-err');
  err.textContent = msg;
  err.classList.add('show');
  const dots = document.getElementById('pc-dots');
  dots.classList.add('shake');
  setTimeout(()=>{
    dots.classList.remove('shake');
    document.querySelectorAll('#pc-dots .pc-dot').forEach(d=>d.classList.add('error'));
  }, 50);
  setTimeout(()=>{
    pcInput = '';
    updatePcDots();
    err.classList.remove('show');
  }, 900);
}

function pcSubmit(){
  switch(pcMode){
    case 'unlock':
      if(pcInput === userPasscode){
        hidePasscodeOverlay();
        goToScreen('home');
      } else {
        pcShowError('密码错误，请重试');
      }
      break;
    case 'set':
      pcTempNew = pcInput;
      pcInput = '';
      updatePcDots();
      pcMode = 'confirm';
      document.getElementById('pc-title').textContent = '再次输入以确认';
      break;
    case 'confirm':
      if(pcInput === pcTempNew){
        userPasscode = pcTempNew;
        pcTempNew = '';
        hidePasscodeOverlay();
        if(pcOnChangeDone){ pcOnChangeDone(); pcOnChangeDone=null; }
      } else {
        pcShowError('两次输入不一致');
        setTimeout(()=>{
          pcMode = 'set';
          document.getElementById('pc-title').textContent = '设置锁屏密码';
          pcInput = '';
          pcTempNew = '';
          updatePcDots();
        }, 900);
      }
      break;
    case 'change_old':
      if(pcInput === userPasscode){
        pcMode = 'change_new';
        document.getElementById('pc-title').textContent = '输入新密码';
        pcInput = '';
        updatePcDots();
      } else {
        pcShowError('密码错误，请重试');
      }
      break;
    case 'change_new':
      pcTempNew = pcInput;
      pcInput = '';
      updatePcDots();
      pcMode = 'change_confirm';
      document.getElementById('pc-title').textContent = '再次输入新密码';
      break;
    case 'change_confirm':
      if(pcInput === pcTempNew){
        userPasscode = pcTempNew;
        pcTempNew = '';
        hidePasscodeOverlay();
        if(pcOnChangeDone){ pcOnChangeDone(); pcOnChangeDone=null; }
      } else {
        pcShowError('两次输入不一致');
        setTimeout(()=>{
          pcMode = 'change_new';
          document.getElementById('pc-title').textContent = '输入新密码';
          pcInput = '';
          pcTempNew = '';
          updatePcDots();
        }, 900);
      }
      break;
    case 'remove':
      if(pcInput === userPasscode){
        userPasscode = null;
        hidePasscodeOverlay();
        updatePasscodeSettingsUI();
      } else {
        pcShowError('密码错误，请重试');
      }
      break;
  }
}

function showPasscodeOverlay(mode){
  pcMode = mode;
  pcInput = '';
  pcTempNew = '';
  const overlay = document.getElementById('passcode-overlay');
  const title = document.getElementById('pc-title');
  const cancel = document.getElementById('pc-cancel');
  overlay.classList.add('show');
  cancel.classList.add('show');
  switch(mode){
    case 'unlock': title.textContent = '输入密码'; break;
    case 'set': title.textContent = '设置锁屏密码'; break;
    case 'change_old': title.textContent = '输入当前密码'; break;
    case 'change_new': title.textContent = '输入新密码'; break;
  }
  renderPcKeypad();
  updatePcDots();
}

function hidePasscodeOverlay(){
  document.getElementById('passcode-overlay').classList.remove('show');
  document.getElementById('pc-cancel').classList.remove('show');
  document.getElementById('pc-err').classList.remove('show');
  pcInput = '';
  pcTempNew = '';
  updatePcDots();
}

function cancelPasscode(){
  hidePasscodeOverlay();
  if(pcOnChangeDone){ pcOnChangeDone(); pcOnChangeDone=null; }
}

function setPasscodeFromSettings(){
  if(userPasscode){
    pcOnChangeDone = function(){ updatePasscodeSettingsUI(); };
    showPasscodeOverlay('change_old');
  } else {
    pcOnChangeDone = function(){ updatePasscodeSettingsUI(); };
    showPasscodeOverlay('set');
  }
}

function switchTab(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  if(name==='me'){ /* 同步"我"页 post 数字 */ var meCnt=document.getElementById('me-post-count'); if(meCnt){ var n=(moments||[]).filter(function(m){return m.authorId==='me' || !m.authorId;}).length; meCnt.textContent=n; } }
}
function openSheet(id){
  var el=document.getElementById('sheet-'+id);
  if(!el){ console.log('Sheet not found: '+id); return; }
  el.classList.add('open');
  el.style.zIndex='300';
  if(id==='stickerlib') renderStickerLib();
  if(id==='icons') renderIconGrid();
  if(id==='wallet') renderWallet();
  if(id==='suoha') suohaUpdateAll();
  if(id==='mine'){ document.getElementById('mine-name').value=userName; document.getElementById('mine-prefs').value=userPrefs; syncMineCoverPreview(); }
  if(id==='cp-moments'){ /* already rendered by openContactMoments */ }
  if(id==='my-moments'){ /* already rendered by openMyMoments */ }
  if(id==='addpersona'){ renderWorldBookChips('np-worldbooks', currentWorldBookId?[currentWorldBookId]:[]); }
  if(id==='compose'){
    composeHidden=[];
    document.querySelectorAll('#vis-personas .persona-chip').forEach(function(c){c.classList.remove('on');});
    var extra=document.getElementById('vis-personas-extra');
    if(extra){
      extra.innerHTML = Object.keys(contacts).filter(function(k){return k!=='me' && contacts[k];}).map(function(k){
        return '<span class="persona-chip" data-id="'+k+'" onclick="toggleHidden(this)">'+esc(contacts[k].name)+'</span>';
      }).join('');
    }
  }
  if(id==='wallpaper'){
    setWpTarget(wpTarget);
    var cur = (wpTarget==='lock')?lockWp:(wpTarget==='home')?homeWp:homeWp;
    document.querySelectorAll('#sheet-wallpaper .wp-swatch').forEach(function(s){
      var p = (cur.type==='custom') ? s.classList.contains('upload') : s.classList.contains('wp-'+cur.type);
      s.classList.toggle('picked', p);
    });
  }
  if(id==='pluginlib') renderPluginLibrary();
}
function closeSheet(id){
  document.getElementById('sheet-'+id).classList.remove('open');
  // 如果关闭游戏空间但语音通话仍在进行，显示浮动条
  if(id==='game' && gameState.voiceActive){
    document.getElementById('game-voice-panel').style.display = 'none';
    document.getElementById('game-float-bar').classList.add('show');
    gameRenderFloatWave();
  }
}

const worldBooks = {
  wb1:{id:'wb1', name:'破限', content:'本世界书用于打破常规限制，让角色更贴近真实人类。\n- 角色可以表达真实情绪，包括吃醋、想念、撒娇、沉默。\n- 角色拥有自己的生活节奏，不会时刻秒回。\n- 角色会记住用户的偏好和曾经说过的重要事情。'}
};
let currentWorldBookId = 'wb1';

const contacts = {
  tester1: { name:'测试员1', displayName:'', tone:'', persona:'', userPrompt:'', jealous:false, pendingCount:0, idleTimer:null, avatar:null, avatarColor:null, blocked:false, worldBooks:['wb1'], memory:{enabled:true, threshold:20, summary:'', lastMsgCount:0}, seed:[
    {mine:false, kind:'text', text:'你好，我是测试员1。这个号用来做上线前的功能测试～', from:'tester1', ts:nowStamp()-1000*60*42},
    {mine:true, kind:'text', text:'你好呀～', from:'me', ts:nowStamp()-1000*60*40},
    {mine:false, kind:'text', text:'有什么想测的随时找我。', from:'tester1', ts:nowStamp()-1000*60*38}
  ]}
};
let currentContact='tester1';
const MAX_STREAK = 8;
const IDLE_MS = 120000;
const MAX_PROACTIVE_PER_DAY = 3;
function canProactive(contact){
  if(!contact) return false;
  var today = new Date().toDateString();
  if(!contact._proactiveDate || contact._proactiveDate !== today){
    contact._proactiveDate = today;
    contact._proactiveCount = 0;
  }
  return (contact._proactiveCount||0) < MAX_PROACTIVE_PER_DAY;
}
function incProactive(contact){
  if(!contact) return;
  var today = new Date().toDateString();
  if(!contact._proactiveDate || contact._proactiveDate !== today){
    contact._proactiveDate = today;
    contact._proactiveCount = 0;
  }
  contact._proactiveCount = (contact._proactiveCount||0) + 1;
}

let stickers = [
  {type:'kaomoji', value:'ᗜ֊ᗜ', tag:'开心', mood:'happy'},
  {type:'kaomoji', value:'(˃ᴗ˂)‧º·', tag:'害羞', mood:'shy'},
  {type:'kaomoji', value:'(¬_¬)', tag:'嫌弃', mood:'angry'},
  {type:'kaomoji', value:'˚‧º∘(¯―¯٥)', tag:'委屈', mood:'sad'},
  {type:'kaomoji', value:'٩(ˊᗜˋ*)و', tag:'撒娇', mood:'love'},
  {type:'kaomoji', value:'(¬‿¬)', tag:'得意', mood:'happy'}
];
let cardIdSeq = 1;
let stickerTab = 'kaomoji';
let pendingImageData = null;

/* ============ USER PROFILE (我的) ============ */
function applyUserName(){
  var g=document.getElementById('user-greeting');if(g)g.textContent=userName;
  var mn=document.getElementById('me-name');if(mn)mn.textContent=userName;
  var mn2=document.getElementById('me-name2');if(mn2)mn2.textContent=userName;
  var mm=document.getElementById('moments-me-name');if(mm)mm.textContent=userName;
  var sn=document.getElementById('settings-name');if(sn)sn.textContent=userName;
  var wxid=document.getElementById('me-wxid');if(wxid)wxid.textContent='fated_2026';
  updateWalletPreview();
  renderThread();
}
function applyUserPrefs(){
  var bio=document.getElementById('me-bio');if(bio)bio.textContent=userPrefs||'这个人很神秘，什么都没写～';
  var sig=document.getElementById('me-signature');if(sig)sig.textContent=userPrefs||'个性签名';
}
function updateWalletPreview(){
  var w=document.getElementById('me-wallet-preview');
  if(w)w.textContent='$'+walletBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
}

function meShowPosts(){
  var myPosts=forumState.posts.filter(function(p){return p.authorType==='user';});
  var feed=document.getElementById('myposts-feed');
  if(!feed) return;
  if(myPosts.length===0){ feed.innerHTML='<div style="text-align:center;padding:40px;color:#888;">No posts yet</div>'; }
  else {
    feed.innerHTML=myPosts.map(function(p,i){
      return '<div class="forum-card" onclick="forumOpen('+forumState.posts.indexOf(p)+')"><div class="f-header"><div class="f-av" style="background:#555;">'+forumInitial(p.author)+'</div><div><div class="f-name">'+esc(p.author)+'</div><div class="f-time">'+fmtAgo(p.ts)+'</div></div></div><div class="f-title">'+esc(p.title)+'</div><div class="f-excerpt">'+esc(p.content)+'</div><span class="f-tag">'+esc(p.tag)+'</span><div class="f-meta"><span>赞 '+p.likes+'</span><span>评论 '+p.comments.length+'</span></div></div>';
    }).join('');
  }
  openSheet('myposts');
}

function updateUserAvatarEl(){
  var el=document.getElementById('me-av');
  if(el){
    if(userAvatar){ el.innerHTML='<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:18px;">'; }
    else { el.innerHTML='<div class="chibi" style="--plum:#000;width:70%;height:70%;"><div class="ear l"></div><div class="ear r"></div><div class="face"></div><div class="eye l"></div><div class="eye r"></div></div>'; }
  }
  var el2=document.getElementById('me-avatar2');
  if(el2){
    if(userAvatar){ el2.innerHTML='<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;">'; el2.style.background='none'; }
    else { el2.innerHTML=''; el2.style.background='#eee'; }
  }
  var sa=document.getElementById('settings-avatar');
  if(sa){
    if(userAvatar){ sa.innerHTML='<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'; sa.style.background='none'; }
    else { sa.innerHTML='<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>'; sa.style.background='#e0e0e0'; }
  }
  // 同步朋友圈封面头像
  var mma=document.getElementById('moments-me-avatar');
  if(mma){
    if(userAvatar){ mma.innerHTML='<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;">'; }
    else { mma.innerHTML='<div class="chibi" style="--plum:#000;"><div class="ear l"></div><div class="ear r"></div><div class="face"></div><div class="eye l"></div><div class="eye r"></div></div>'; }
  }
  // 同步"我的"编辑面板中的头像预览
  var minePick=document.getElementById('mine-avatar-pick');
  if(minePick){
    if(userAvatar){ minePick.innerHTML='<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:20px;">'; }
    else { minePick.innerHTML='<div class="chibi" style="width:60%;height:60%;"><div class="ear l"></div><div class="ear r"></div><div class="face"></div><div class="eye l"></div><div class="eye r"></div></div>'; }
  }
  // 同步情侣空间头像
  if(typeof updateCoupleHeader==='function') try{ updateCoupleHeader(); }catch(e){}
}
const avatarInput = document.createElement('input');
avatarInput.type='file'; avatarInput.accept='image/*'; avatarInput.style.display='none';
document.body.appendChild(avatarInput);
avatarInput.addEventListener('change', e=>{
  const file = e.target.files[0]; if(!file) return;
  compressImage(file, 512, 0.85, function(res){
    if(!res) return;
    userAvatar = res; updateUserAvatarEl(); renderThread(); renderMoments(); saveState();
  });
  e.target.value='';
});
function pickUserAvatar(){ avatarInput.click(); }
var personaAvatarInput = document.createElement('input');
personaAvatarInput.type='file'; personaAvatarInput.accept='image/*'; personaAvatarInput.style.display='none';
document.body.appendChild(personaAvatarInput);
personaAvatarInput.addEventListener('change', function(e){
  var f=e.target.files[0]; if(!f) return;
  compressImage(f, 256, 0.85, function(res){ if(!res) return; pendingPersonaAvatar=res; var box=document.querySelector('#sheet-addpersona .avatar-pick'); if(box) box.innerHTML='<img src="'+res+'" style="width:100%;height:100%;object-fit:cover;border-radius:22px;">'; });
  e.target.value='';
});
function pickPersonaAvatar(){ personaAvatarInput.click(); }

/* 联系人头像更换 —— 点击聊天界面顶部头像即可更换，更换后所有界面同步显示 */
var contactAvatarInput = document.createElement('input');
contactAvatarInput.type='file'; contactAvatarInput.accept='image/*'; contactAvatarInput.style.display='none';
document.body.appendChild(contactAvatarInput);
var _contactAvatarTarget = null;
contactAvatarInput.addEventListener('change', function(e){
  var f=e.target.files[0]; if(!f) return;
  compressImage(f, 256, 0.85, function(res){
    if(!res) return;
    var targetId = _contactAvatarTarget || currentContact;
    var c=contacts[targetId]; if(!c) return;
    c.avatar=res; saveState();
    renderThread(); renderChatList();
    // 更新联系人列表中的头像
    var cr=document.querySelector('#contact-items [data-cid="'+targetId+'"] .av');
    if(cr) cr.innerHTML=contactAvatar(c);
    // 更新资料页/群聊信息页预览
    var cpAv=document.getElementById('cp-avatar'); if(cpAv && document.getElementById('sheet-contact-profile').classList.contains('open')) cpAv.innerHTML=contactAvatar(c);
    var giAv=document.getElementById('gi-avatar'); if(giAv && document.getElementById('sheet-group-info').classList.contains('open')) giAv.innerHTML=contactAvatar(c);
    showToast('头像已更换', 1200);
  });
  e.target.value='';
});
function pickContactAvatar(){ _contactAvatarTarget = currentContact; contactAvatarInput.click(); }
function changeContactAvatar(id){ _contactAvatarTarget = id; contactAvatarInput.click(); }

/* updateUserAvatarEl 已在上方定义（含 me-avatar2 / settings-avatar），此处删除重复定义以免 me-avatar2 不更新 */
function userAvatarHTML(){
  return userAvatar ? '<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:18px;">' : avatarHTML();
}

function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ============ SAVE "我的" ============ */
function saveMine(){
  const n = document.getElementById('mine-name').value.trim();
  const p = document.getElementById('mine-prefs').value.trim();
  if(n) userName = n;
  userPrefs = p;
  // 微信号 / 签名 / 封面
  var wxEl=document.getElementById('mine-wxid');
  if(wxEl && wxEl.value.trim()) userWxid=wxEl.value.trim();
  var bioEl=document.getElementById('mine-bio');
  if(bioEl) userBio=bioEl.value;
  var cv=document.getElementById('mine-cover-preview');
  if(cv && cv.dataset.src) userCover=cv.dataset.src;
  applyUserName(); applyUserPrefs();
  updateUserAvatarEl(); populateViewAs(); renderMoments();
  saveState();
  closeSheet('mine');
}

/* ============ API & MODEL CONFIG ============ */
var apiConfig = {
  activeModel:'deepseek',
  capabilities:{vision:true,audio:true,video:true,tools:true},
  ttsProvider:'elevenlabs',
  memoryWindow:65536, maxContext:307200,
  models:{deepseek:{key:'',endpoint:'https://api.deepseek.com/v1/chat/completions',model:'deepseek-chat'},claude:{key:'',endpoint:'https://api.anthropic.com/v1/messages',model:'claude-sonnet-4-20250514'},gemini:{key:'',endpoint:'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',model:'gemini-2.5-pro'},chatgpt:{key:'',endpoint:'https://api.openai.com/v1/chat/completions',model:'gpt-4o'},custom:{name:'',key:'',endpoint:'',model:'',apiFormat:'openai'}},
  tts:{elevenlabs:{key:'',model:'eleven_multilingual_v2'},minimax:{key:'',groupId:'',model:'speech-01'},custom:{key:'',endpoint:'',voice:''}},
  voiceIds:{tester1:''},
  memoryBooks:{tester1:''},
  proxyUrl:'http://127.0.0.1:8080',
  webSearch:true
};

/* ============ FONT & COLOR CONFIG ============ */
var fontConfig = { family:'', color:'#1a1a1a', customName:'', customDataUrl:'' };
function applyFontConfig(){
  try{
    var fam = fontConfig.family;
    if(fontConfig.customDataUrl && fontConfig.family==='__custom__'){
      // 自定义上传字体已在 loadState 时注册过；此处仅套用变量
      fam = "'FatedCustomFont', " + getComputedStyle(document.documentElement).getPropertyValue('--app-font');
    }
    document.documentElement.style.setProperty('--app-font', fam || "'Inter','Nunito',-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif");
    document.documentElement.style.setProperty('--app-text-color', fontConfig.color || '#1a1a1a');
    var prev = document.getElementById('cfg-font-preview');
    if(prev) prev.style.color = fontConfig.color || '#1a1a1a';
  }catch(e){}
}
function cfgInitFont(){
  var sel = document.getElementById('cfg-font-family');
  if(sel){
    sel.value = fontConfig.family || '';
    document.getElementById('cfg-font-name').textContent = fontConfig.customName ? ('已加载自定义字体：'+fontConfig.customName) : (fontConfig.family ? '当前：'+fontConfig.family : '当前：系统默认');
  }
  var col = document.getElementById('cfg-font-color');
  if(col) col.value = (fontConfig.color && /^#[0-9a-fA-F]{6}$/.test(fontConfig.color)) ? fontConfig.color : '#1a1a1a';
  cfgFontPreview();
}
function cfgFontPreview(){
  var fam = document.getElementById('cfg-font-family').value;
  var col = document.getElementById('cfg-font-color').value;
  if(fam==='__custom__'){ document.getElementById('cfg-font-upload').click(); }
  else {
    var famCss = fam || "'Inter','Nunito',-apple-system,sans-serif";
    document.documentElement.style.setProperty('--app-font', famCss);
  }
  document.documentElement.style.setProperty('--app-text-color', col);
  var prev = document.getElementById('cfg-font-preview');
  if(prev) prev.style.color = col;
}
function uploadFontFile(e){
  var file = e.target.files[0]; if(!file) return;
  var r = new FileReader();
  r.onload = function(){
    try{
      var ff = new FontFace('FatedCustomFont', 'url('+r.result+')');
      ff.load().then(function(loaded){
        document.fonts.add(loaded);
        fontConfig.family='__custom__';
        fontConfig.customName=file.name;
        fontConfig.customDataUrl=r.result;
        document.documentElement.style.setProperty('--app-font', "'FatedCustomFont', 'Inter',sans-serif");
        document.getElementById('cfg-font-name').textContent='已加载自定义字体：'+file.name;
        document.getElementById('cfg-font-family').value='__custom__';
        var prev=document.getElementById('cfg-font-preview'); if(prev) prev.style.fontFamily="'FatedCustomFont', sans-serif";
        showToast('字体已加载 ✓ 点保存生效', 1800, 'ok');
      }).catch(function(){ showToast('字体加载失败，请换一个 .ttf/.otf 文件', 2600, 'err'); });
    }catch(err){ showToast('当前浏览器不支持上传字体', 2600, 'err'); }
  };
  r.readAsDataURL(file);
}
function cfgSaveFont(){
  if(document.getElementById('cfg-font-family').value!=='__custom__'){
    // 若切换回非自定义，清掉自定义数据
    if(document.getElementById('cfg-font-family').value==='') fontConfig.customDataUrl='';
  }
  fontConfig.color = document.getElementById('cfg-font-color').value || '#1a1a1a';
  applyFontConfig();
  saveState();
  showToast('字体 & 颜色已保存 ✓', 1800, 'ok');
}

// 代理服务器基地址 — 始终走同源 /api，由 Cloudflare Pages Functions 转发
// 解决浏览器直接调 AI API 被 CORS 拦截的问题
function proxyBase(){
  return '';
}

/* 端点地址智能补全：中转站只需填基础地址，自动补全到正确请求路径，告别"地址太复杂填错" */
function normEp(endpoint, fmt){
  if(!endpoint) return '';
  var ep = String(endpoint).trim();
  if(!ep) return '';
  // 防御性清理：修复重复协议前缀（如 https://https://...）
  var m = ep.match(/^(https?:\/\/)(.*)/);
  if(m) ep = m[1] + m[2].replace(/^(https?:\/\/)+/, '');
  if(ep.indexOf('http://')!==0 && ep.indexOf('https://')!==0) ep = 'https://'+ep;
  ep = ep.replace(/\/+$/,'');                       // 去掉末尾斜杠
  fmt = fmt || 'openai';
  if(fmt==='gemini'){
    if(/:generateContent$/i.test(ep)) return ep;            // 已完整
    if(/\/models\/[^/]+$/i.test(ep)) return ep+':generateContent'; // 有模型名缺后缀
    return ep;                                              // 无法推断模型，保持原样
  }
  if(fmt==='claude'){
    if(/\/messages$/i.test(ep)) return ep;                  // 已含 /messages
    if(/\/v1$/i.test(ep)) return ep+'/messages';
    return ep+'/v1/messages';
  }
  // OpenAI 兼容（默认，绝大多数中转站）
  if(/\/chat\/completions$/i.test(ep)) return ep;           // 已完整
  if(/\/v1\/chat$/i.test(ep)) return ep+'/completions';
  if(/\/v1$/i.test(ep)) return ep+'/chat/completions';
  return ep+'/v1/chat/completions';
}
/* 取当前模型的规范化端点（供直连/代理/测试/状态统一调用） */
function modelEndpoint(m, model){
  var fmt = (model==='claude') ? 'claude' : (model==='gemini') ? 'gemini' : (model==='custom' ? (m.apiFormat||'openai') : 'openai');
  return normEp(m && m.endpoint, fmt);
}

function cfgInit(){
  document.getElementById('cfg-active-model').value=apiConfig.activeModel;
  document.getElementById('cfg-ds-key').value=apiConfig.models.deepseek.key;
  document.getElementById('cfg-ds-endpoint').value=apiConfig.models.deepseek.endpoint;
  document.getElementById('cfg-ds-model').value=apiConfig.models.deepseek.model;
  document.getElementById('cfg-claude-key').value=apiConfig.models.claude.key;
  document.getElementById('cfg-claude-endpoint').value=apiConfig.models.claude.endpoint;
  document.getElementById('cfg-claude-model').value=apiConfig.models.claude.model;
  document.getElementById('cfg-gemini-key').value=apiConfig.models.gemini.key;
  document.getElementById('cfg-gemini-endpoint').value=apiConfig.models.gemini.endpoint;
  document.getElementById('cfg-gemini-model').value=apiConfig.models.gemini.model;
  document.getElementById('cfg-gpt-key').value=apiConfig.models.chatgpt.key;
  document.getElementById('cfg-gpt-endpoint').value=apiConfig.models.chatgpt.endpoint;
  document.getElementById('cfg-gpt-model').value=apiConfig.models.chatgpt.model;
  document.getElementById('cfg-custom-name').value=apiConfig.models.custom.name;
  document.getElementById('cfg-custom-endpoint').value=apiConfig.models.custom.endpoint;
  document.getElementById('cfg-custom-key').value=apiConfig.models.custom.key;
  document.getElementById('cfg-custom-modelid').value=apiConfig.models.custom.model;
  document.getElementById('cfg-custom-format').value=apiConfig.models.custom.apiFormat||'openai';
  document.getElementById('cfg-tts-provider').value=apiConfig.ttsProvider;
  document.getElementById('cfg-11l-key').value=apiConfig.tts.elevenlabs.key;
  document.getElementById('cfg-11l-model').value=apiConfig.tts.elevenlabs.model;
  document.getElementById('cfg-mm-key').value=apiConfig.tts.minimax.key;
  document.getElementById('cfg-mm-group').value=apiConfig.tts.minimax.groupId;
  document.getElementById('cfg-mm-model').value=apiConfig.tts.minimax.model;
  document.getElementById('cfg-tts-custom-endpoint').value=apiConfig.tts.custom.endpoint;
  document.getElementById('cfg-tts-custom-key').value=apiConfig.tts.custom.key;
  document.getElementById('cfg-tts-custom-voice').value=apiConfig.tts.custom.voice;
  document.getElementById('cfg-mem-window').value=apiConfig.memoryWindow;
  document.getElementById('cfg-max-ctx').value=apiConfig.maxContext;
  cfgSwitchTTS();
  cfgRenderVoiceIds();
  cfgRenderMemoryBooks();
  document.getElementById('cfg-web-search').checked=apiConfig.webSearch!==false;
  updateCfgStatus();
}

function cfgSwitchModel(){
  apiConfig.activeModel=document.getElementById('cfg-active-model').value;
  document.getElementById('cfg-custom-model').style.display=apiConfig.activeModel==='custom'?'block':'none';
  cfgSwitchCustomFormat();
}
function cfgSwitchCustomFormat(){
  var fmt=document.getElementById('cfg-custom-format');
  if(!fmt) return;
  apiConfig.models.custom.apiFormat=fmt.value;
  var ep=document.getElementById('cfg-custom-endpoint');
  var mi=document.getElementById('cfg-custom-modelid');
  if(!ep.value || ep.value.indexOf('your-relay')>=0){
    if(fmt.value==='openai') ep.placeholder='中转站域名（如 https://api.xxx.com，自动补全）';
    else if(fmt.value==='claude') ep.placeholder='中转站域名（如 https://api.xxx.com，自动补全）';
    else if(fmt.value==='gemini') ep.placeholder='Gemini 中转站域名（如 https://xxx.com，自动补全）';
  }
  if(fmt.value==='openai') mi.placeholder='Model ID (如 gpt-4o / deepseek-chat)';
  else if(fmt.value==='claude') mi.placeholder='Model ID (如 claude-sonnet-4-20250514)';
  else if(fmt.value==='gemini') mi.placeholder='Model ID (如 gemini-2.5-pro)';
}
function cfgSwitchTTS(){
  apiConfig.ttsProvider=document.getElementById('cfg-tts-provider').value;
  document.getElementById('cfg-tts-eleven').style.display=apiConfig.ttsProvider==='elevenlabs'?'block':'none';
  document.getElementById('cfg-tts-minimax').style.display=apiConfig.ttsProvider==='minimax'?'block':'none';
  document.getElementById('cfg-tts-custom').style.display=apiConfig.ttsProvider==='custom'?'block':'none';
}
function cfgToggleCap(el,cap){ apiConfig.capabilities[cap]=el.querySelector('input').checked; el.classList.toggle('picked',apiConfig.capabilities[cap]); }

function cfgRenderVoiceIds(){
  var box=document.getElementById('cfg-voice-ids');
  if(!box) return;
  var ids=Object.keys(contacts).filter(function(k){return !contacts[k].isGroup;});
  box.innerHTML=ids.map(function(k){
    var c=contacts[k];
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div style="font-size:12px;font-weight:700;width:60px;">'+c.name+'</div><input class="field-input" id="cfg-voice-'+k+'" placeholder="Voice ID" value="'+(apiConfig.voiceIds[k]||'')+'" style="flex:1;margin:0;"></div>';
  }).join('');
}

function cfgRenderMemoryBooks(){
  var box=document.getElementById('cfg-memory-books');
  if(!box) return;
  var ids=Object.keys(contacts).filter(function(k){return !contacts[k].isGroup;});
  box.innerHTML=ids.map(function(k){
    var c=contacts[k];
    var len=(apiConfig.memoryBooks[k]||'').length;
    return '<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:700;margin-bottom:2px;">'+c.name+' ('+len+' chars)</div><textarea class="field-input" id="cfg-mem-'+k+'" placeholder="Memory book: 对话总结+关键记忆" style="height:60px;">'+(apiConfig.memoryBooks[k]||'')+'</textarea></div>';
  }).join('');
}

function cfgSaveAll(){
  apiConfig.activeModel=document.getElementById('cfg-active-model').value;
  apiConfig.models.deepseek.key=document.getElementById('cfg-ds-key').value;
  apiConfig.models.deepseek.endpoint=normEp(document.getElementById('cfg-ds-endpoint').value,'openai');
  apiConfig.models.deepseek.model=document.getElementById('cfg-ds-model').value;
  apiConfig.models.claude.key=document.getElementById('cfg-claude-key').value;
  apiConfig.models.claude.endpoint=normEp(document.getElementById('cfg-claude-endpoint').value,'claude');
  apiConfig.models.claude.model=document.getElementById('cfg-claude-model').value;
  apiConfig.models.gemini.key=document.getElementById('cfg-gemini-key').value;
  apiConfig.models.gemini.endpoint=normEp(document.getElementById('cfg-gemini-endpoint').value,'gemini');
  apiConfig.models.gemini.model=document.getElementById('cfg-gemini-model').value;
  apiConfig.models.chatgpt.key=document.getElementById('cfg-gpt-key').value;
  apiConfig.models.chatgpt.endpoint=normEp(document.getElementById('cfg-gpt-endpoint').value,'openai');
  apiConfig.models.chatgpt.model=document.getElementById('cfg-gpt-model').value;
  apiConfig.models.custom.name=document.getElementById('cfg-custom-name').value;
  var cFmt=document.getElementById('cfg-custom-format').value;
  apiConfig.models.custom.endpoint=normEp(document.getElementById('cfg-custom-endpoint').value,cFmt);
  apiConfig.models.custom.key=document.getElementById('cfg-custom-key').value;
  apiConfig.models.custom.model=document.getElementById('cfg-custom-modelid').value;
  apiConfig.models.custom.apiFormat=cFmt;
  apiConfig.ttsProvider=document.getElementById('cfg-tts-provider').value;
  apiConfig.tts.elevenlabs.key=document.getElementById('cfg-11l-key').value;
  apiConfig.tts.elevenlabs.model=document.getElementById('cfg-11l-model').value;
  apiConfig.tts.minimax.key=document.getElementById('cfg-mm-key').value;
  apiConfig.tts.minimax.groupId=document.getElementById('cfg-mm-group').value;
  apiConfig.tts.minimax.model=document.getElementById('cfg-mm-model').value;
  apiConfig.tts.custom.endpoint=document.getElementById('cfg-tts-custom-endpoint').value;
  apiConfig.tts.custom.key=document.getElementById('cfg-tts-custom-key').value;
  apiConfig.tts.custom.voice=document.getElementById('cfg-tts-custom-voice').value;
  apiConfig.memoryWindow=parseInt(document.getElementById('cfg-mem-window').value)||65536;
  apiConfig.maxContext=parseInt(document.getElementById('cfg-max-ctx').value)||307200;
  apiConfig.webSearch=document.getElementById('cfg-web-search').checked;
  // Voice IDs & memory books
  Object.keys(contacts).filter(function(k){return !contacts[k].isGroup;}).forEach(function(k){
    var vi=document.getElementById('cfg-voice-'+k); if(vi) apiConfig.voiceIds[k]=vi.value;
    var mb=document.getElementById('cfg-mem-'+k); if(mb) apiConfig.memoryBooks[k]=mb.value;
  });
  saveState();
  updateCfgStatus();
  showToast('已保存 ✓ 配置全局生效', 2000, 'ok');
}

/* 全局轻提示（替代原生 alert，避免被部分浏览器拦截/不弹） */
function showToast(msg, ms, kind){
  ms = ms || 1800; kind = kind || '';
  var phone = document.querySelector('.phone') || document.body;
  var t = document.getElementById('fated-toast');
  if(!t){ t = document.createElement('div'); t.id='fated-toast'; t.className='toast'; phone.appendChild(t); }
  t.className = 'toast' + (kind?(' '+kind):'');
  t.textContent = msg;
  // 强制重绘以重新触发 transition
  void t.offsetWidth;
  t.classList.add('show');
  if(t._timer) clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, ms);
}

/* 检测代理(中转站)是否在线，并刷新状态条 */
function updateCfgStatus(){
  var el = document.getElementById('cfg-status');
  if(!el) return;
  var m = apiConfig.models[apiConfig.activeModel];
  if(!m || !m.key){
    el.style.color = '#e15555';
    el.textContent = '● 未填写 API Key';
    return;
  }
  el.style.color = '#888';
  el.textContent = '● 检测连接中…';
  // 直连优先检测（端点自动补全）
  var model = apiConfig.activeModel;
  var url, hdrs, bd;
  var ep = modelEndpoint(m, model);
  var pingMsgs = [{role:'user',content:'hi'}];
  if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8,temperature:0.3}); }
  else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8}); }
  else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'hi'}]}],generationConfig:{maxOutputTokens:8}}); }
  else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:8,temperature:0.3}); }
  fetch(url,{method:'POST',headers:hdrs,body:bd})
    .then(function(r){
      if(r.ok){ el.style.color='#1a9e4b'; el.textContent='● API 直连已连接 ✓'; }
      else { el.style.color='#e15555'; el.textContent='● API 返回错误 '+r.status+'（检查 Key/模型/地址）'; }
    })
    .catch(function(){
      // 直连被 CORS 拦截（多数中转站情况），改走代理做真实探测
      var pb = JSON.stringify({messages:pingMsgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, apiFormat:(m.apiFormat||'openai'), max_tokens:8});
      fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:pb}).then(function(r){
        if(r.ok){
          return r.json().then(function(d){
            var rep=d.content||d.reply||'';
            if(rep && !/API Error|401|403|Proxy error|无法访问|请在设置/i.test(rep)){ el.style.color='#1a9e4b'; el.textContent='● 云端代理已连接 ✓（直连被拦截，已自动走代理）'; }
            else { el.style.color='#e15555'; el.textContent='● 代理可达但 API 报错（检查 Key/模型）'; }
          });
        }
        el.style.color='#e15555'; el.textContent='● 直连被拦截且代理未就绪（HTTP '+r.status+'）';
      }).catch(function(){
        el.style.color='#e15555'; el.textContent='● 直连被拦截且代理未就绪';
      });
    });
}

/* 用真实请求测试当前模型是否可用（验证 Key / Endpoint / 代理） */
function testAPIConnection(){
  var m = apiConfig.models[apiConfig.activeModel];
  if(!m || !m.key){ showToast('请先填写 API Key 再测试', 2200, 'err'); updateCfgStatus(); return; }
  showToast('正在测试连接…', 1500);
  var model = apiConfig.activeModel;
  var pingMsgs = [{role:'system',content:'Reply with exactly: OK'},{role:'user',content:'ping'}];
  var url,hdrs,bd;
  var ep = modelEndpoint(m, model);
  console.log('[testAPI] activeModel:', model, 'apiFormat:', (m.apiFormat||'openai'), 'rawEndpoint:', m.endpoint, 'normEp:', ep);
  if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:0.3}); }
  else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:'Reply with exactly: OK',messages:[{role:'user',content:'ping'}],max_tokens:64}); }
  else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'ping'}]}],generationConfig:{maxOutputTokens:64,temperature:0.3}}); }
  else if(model==='custom'){
    var cf=m.apiFormat||'openai';
    if(cf==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:'Reply with exactly: OK',messages:[{role:'user',content:'ping'}],max_tokens:64}); }
    else if(cf==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:'ping'}]}],generationConfig:{maxOutputTokens:64,temperature:0.3}}); }
    else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:0.3}); }
  }
  else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:pingMsgs,max_tokens:64,temperature:0.3}); }
  console.log('[testAPI] direct URL:', url, 'headers:', Object.keys(hdrs), 'body:', bd);
  var isErr = function(t){ return /API Error|API连接失败|Invalid|401|403|unauthorized|forbidden|not found|模型|model|Proxy error/i.test(t); };
  // 直连优先测试（DeepSeek/OpenAI 等本身支持 CORS）
  fetch(url,{method:'POST',headers:hdrs,body:bd})
    .then(function(r){ return r.text().then(function(t){ return {ok:r.ok,status:r.status,text:t}; }); })
    .then(function(res){
      if(!res){ tryProxyTest(); return; }
      var data; try{ data = JSON.parse(res.text); }catch(e){ data=null; }
      if(!data){ tryProxyTest(); return; }
      var reply='';
      if(model==='deepseek'||model==='chatgpt') reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      else if(model==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
      else if(model==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
      else if(model==='custom'){
        var cf2=(m.apiFormat||'openai');
        if(cf2==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
        else if(cf2==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
        else reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      }
      if(!reply && data.error) reply='API Error: '+(data.error.message||JSON.stringify(data.error));
      // 只有真实有效回复才算直连成功；含 error 一律交给代理兜底
      if(reply && !isErr(reply) && !data.error){ showToast('连接成功 ✓ (直连) 模型已响应', 2600, 'ok'); updateCfgStatus(); return; }
      if(data.error){ showToast('直连报错：'+String(data.error.message||JSON.stringify(data.error)).substring(0,60)+'，尝试代理…', 2600, 'err'); }
      tryProxyTest();
    })
    .catch(function(){ tryProxyTest(); });

  function tryProxyTest(){
    var proxyBody = JSON.stringify({messages:pingMsgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, apiFormat:(m.apiFormat||'openai'), max_tokens:64});
    console.log('[testAPI] proxy body:', proxyBody);
    fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:proxyBody})
      .then(function(r){
        return r.text().then(function(t){ return {ok:r.ok,status:r.status,text:t}; });
      })
      .then(function(res){
        console.log('[testAPI] proxy response:', res.status, res.text.substring(0,300));
        if(!res || !res.text){ showToast('连接失败：代理无响应（请确认已部署 Functions）', 3600, 'err'); updateCfgStatus(); return; }
        var d1; try{ d1=JSON.parse(res.text); }catch(e){ d1=null; }
        if(!d1){ showToast('连接失败：代理返回异常 (HTTP '+res.status+')', 3600, 'err'); updateCfgStatus(); return; }
        var r1 = d1.content||d1.reply||'';
        if(r1 && !isErr(r1) && !d1.error){ showToast('连接成功 ✓ (代理) 模型已响应', 2600, 'ok'); updateCfgStatus(); return; }
        var msg = d1.error || (isErr(r1)?r1:'') || ('HTTP '+res.status);
        showToast('连接失败：'+String(msg).replace(/^(API Error \(HTTP \d+\):\s*|Proxy error:\s*)/i,'').substring(0,70), 3600, 'err'); updateCfgStatus();
      })
      .catch(function(e){ console.error('[testAPI] proxy fetch error:', e); showToast('连接失败：代理请求失败（Functions 可能未部署）', 3600, 'err'); updateCfgStatus(); });
  }
}

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
        unread: c.unread||0,
        memory: c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0},
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
            if(typeof row.unread==='number') contacts[row.id].unread = row.unread;
            if(row.memory) contacts[row.id].memory = row.memory;
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

/* ============ PERSISTENCE ============ */
var bubbleMineColor = '#1a1a1a', bubbleTheirsColor = '#ffffff';
var widgetCustom = {}; var removedPlugins = [];
function saveState(){
  try{
    localStorage.setItem('fated_state', JSON.stringify({
      userName, userWxid, userBio, userCover, userPrefs, userAvatar, chatBg, momentsBg,
      walletBalance, walletTx, apiConfig,
      worldBooks,
      moments: moments.map(m=>({id:m.id, authorId:m.authorId, text:m.text, vis:m.vis, hidden:m.hidden, ts:m.ts, place:m.place||'', likes:m.likes, liked:m.liked, comments:m.comments, img:m.img||null})),
      /* 聊天记录(seed)不再存 localStorage，改用 IndexedDB 避免溢出；这里只存联系人基本信息 */
      contactsExtra: Object.keys(contacts).filter(k=>k[0]==='p'||k[0]==='g'||k==='tester1').map(k=>{
        var c=contacts[k];
        return {id:k, name:c.name, displayName:c.displayName||'', tone:c.tone||'', persona:c.persona||'', userPrompt:c.userPrompt||'', jealous:!!c.jealous, isGroup:!!c.isGroup, members:c.members||null, avatar:c.avatar||null, avatarColor:c.avatarColor||null, blocked:!!c.blocked, worldBooks:c.worldBooks||[], memory:c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0}, groupUserPrompt:c.groupUserPrompt||'', proactive:c.proactive!==false, bio:c.bio||'', cover:c.cover||'', wxid:c.wxid||'', relations:c.relations||[]};
      }),
      viewAs, bubbleMineColor, bubbleTheirsColor, fontConfig,
      widgetBgMode, removedPlugins,
      suoha: typeof suohaState!=='undefined' ? suohaState : null,
      momentsLastGenDate: momentsLastGenDate||'',
      coupleState: typeof coupleState!=='undefined' ? coupleState : null,
      screenTime: typeof screenTimeData!=='undefined' ? screenTimeData : null,
      go: typeof goState!=='undefined' && goState ? goState : null
    }));
  }catch(e){ /* localStorage 满了也没关系，聊天记录在 IndexedDB */ }
  /* 大数据（含 base64 图片）存 IndexedDB 避免 localStorage 溢出导致 contactsExtra 丢失 */
  fatedDBSaveKV('widgetCustom', widgetCustom);
  fatedDBSaveKV('appIconImgs', appIcons.map(function(a){ return {id:a.id, img:a.img}; }));
  fatedDBSaveKV('lockWp', lockWp);
  fatedDBSaveKV('homeWp', homeWp);
  /* 同步保存聊天记录和表情包到 IndexedDB（异步，不阻塞 UI）*/
  fatedDBSaveAllChats();
  fatedDBSaveStickers();
}
function loadState(){
  try{
    const raw = localStorage.getItem('fated_state'); if(!raw) return;
    const s = JSON.parse(raw);
    if(s.userName) userName=s.userName;
    if(s.userWxid) userWxid=s.userWxid;
    if(typeof s.userBio==='string') userBio=s.userBio;
    if(s.userCover!==undefined) userCover=s.userCover;
    if(typeof s.userPrefs==='string') userPrefs=s.userPrefs;
    if(s.userAvatar!==undefined) userAvatar=s.userAvatar;
    if(s.chatBg) chatBg=s.chatBg;
    if(s.momentsBg) momentsBg=s.momentsBg;
    if(typeof s.walletBalance==='number') walletBalance=s.walletBalance;
    if(Array.isArray(s.walletTx)) walletTx=s.walletTx;
    if(Array.isArray(s.moments) && s.moments.length) moments=s.moments;
    if(s.viewAs) viewAs=s.viewAs;
    if(Array.isArray(s.contactsExtra)) s.contactsExtra.forEach(c=>{
      const {id, ...rest}=c;
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
    if(s.worldBooks && typeof s.worldBooks==='object'){
      Object.keys(s.worldBooks).forEach(function(k){ worldBooks[k]=s.worldBooks[k]; });
    }
    if(typeof s.bubbleMineColor==='string') bubbleMineColor=s.bubbleMineColor;
    if(typeof s.bubbleTheirsColor==='string') bubbleTheirsColor=s.bubbleTheirsColor;
    if(s.widgetCustom && typeof s.widgetCustom==='object') widgetCustom=s.widgetCustom;
    if(Array.isArray(s.removedPlugins)) removedPlugins=s.removedPlugins;
    if(s.lockWp && typeof s.lockWp==='object'){ lockWp=s.lockWp; paintWallpaper(document.getElementById('lock-wallpaper'), lockWp); }
    if(s.homeWp && typeof s.homeWp==='object'){ homeWp=s.homeWp; paintWallpaper(document.getElementById('home-wallpaper'), homeWp); }
    if(typeof s.widgetBgMode==='string'){ widgetBgMode=s.widgetBgMode; }
    if(s.suoha && typeof s.suoha==='object'){ suohaState=Object.assign(suohaDefault(), s.suoha); }
    if(Array.isArray(s.appIconImgs)){ s.appIconImgs.forEach(function(o){ var a=appIcons.find(function(x){return x.id===o.id;}); if(a) a.img=o.img; }); renderDesktopIcons(); renderIconGrid(); }
    if(s.apiConfig){
      /* 浅合并：保留新版本新增的默认字段（如 custom.apiFormat），旧存档不会丢失新功能 */
      var dflt=JSON.parse(JSON.stringify(apiConfig));
      for(var k in s.apiConfig){ apiConfig[k]=s.apiConfig[k]; }
      if(s.apiConfig.models){
        for(var mk in dflt.models){
          if(!apiConfig.models[mk]) apiConfig.models[mk]=dflt.models[mk];
          else for(var fk in dflt.models[mk]){ if(!(fk in apiConfig.models[mk])) apiConfig.models[mk][fk]=dflt.models[mk][fk]; }
        }
      }
    }
    if(s.fontConfig && typeof s.fontConfig==='object'){
      fontConfig=s.fontConfig;
      if(fontConfig.customDataUrl){
        try{ var ff=new FontFace('FatedCustomFont','url('+fontConfig.customDataUrl+')'); ff.load().then(function(l){ document.fonts.add(l); }); }catch(e){}
      }
      applyFontConfig();
    }
    if(typeof s.momentsLastGenDate==='string') momentsLastGenDate=s.momentsLastGenDate;
    if(s.coupleState && typeof s.coupleState==='object') coupleState=Object.assign(coupleState, s.coupleState);
    if(s.screenTime && typeof s.screenTime==='object') screenTimeData=Object.assign(screenTimeData, s.screenTime);
    if(s.go && typeof s.go==='object') goState=Object.assign(goDefault(), s.go);
  }catch(e){}
}

/* 便捷函数：保存当前联系人聊天记录到 IndexedDB（消息发送后调用）*/
function saveChatThread(contactId){
  var id = contactId || currentContact;
  if(!id || !contacts[id]) return;
  fatedDBSaveChat(id);
}
/* 便捷函数：保存表情包到 IndexedDB（表情包变化后调用）*/
function saveStickersDB(){ fatedDBSaveStickers(); }

/* ============ 导出聊天记录 ============ */
function exportChatHistory(contactId){
  var id = contactId || currentContact;
  var c = contacts[id]; if(!c) return;
  var msgs = c.seed || [];
  if(msgs.length===0){ showToast('没有聊天记录可导出', 1500); return; }
  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g,'-');
  var timeStr = new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  /* 生成 HTML 格式的聊天记录 */
  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">';
  html += '<meta name="viewport" content="width=device-width,initial-scale=1.0">';
  html += '<title>聊天记录 - '+esc(c.name)+' - '+dateStr+'</title>';
  html += '<style>';
  html += '*{box-sizing:border-box;margin:0;padding:0;}';
  html += 'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f5;min-height:100vh;padding:20px;}';
  html += '.container{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);}';
  html += '.header{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:24px;text-align:center;}';
  html += '.header h1{font-size:20px;margin-bottom:4px;}';
  html += '.header p{font-size:13px;opacity:0.8;}';
  html += '.chat-body{padding:16px;}';
  html += '.msg{display:flex;margin:10px 0;gap:8px;}';
  html += '.msg.mine{flex-direction:row-reverse;}';
  html += '.av{width:36px;height:36px;border-radius:8px;flex:none;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;}';
  html += '.bubble{max-width:70%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;word-break:break-word;}';
  html += '.bubble.mine{background:#95ec69;color:#000;border-radius:14px 14px 4px 14px;}';
  html += '.bubble.theirs{background:#f5f5f5;color:#000;border-radius:14px 14px 14px 4px;}';
  html += '.bubble img{max-width:180px;max-height:180px;border-radius:8px;display:block;}';
  html += '.sys{text-align:center;font-size:11px;color:#999;margin:8px 0;}';
  html += '.time{font-size:10px;color:#999;margin:2px 4px;}';
  html += '.msg.mine .time{text-align:right;}';
  html += '.footer{text-align:center;padding:16px;font-size:11px;color:#999;border-top:1px solid #eee;}';
  html += '</style></head><body>';
  html += '<div class="container">';
  html += '<div class="header"><h1>💬 与 '+esc(c.name)+' 的聊天记录</h1>';
  html += '<p>导出时间：'+dateStr+' '+timeStr+' · 共 '+msgs.length+' 条消息</p></div>';
  html += '<div class="chat-body">';
  msgs.forEach(function(m){
    if(m.kind==='typing') return; /* 跳过 typing 状态 */
    if(m.kind==='pat' || (!m.kind && !m.text)){ html += '<div class="sys">'+esc(m.text||'')+'</div>'; return; }
    if(m.kind==='pat'){ html += '<div class="sys">'+esc(m.text||'')+'</div>'; return; }
    var isMine = !!m.mine;
    var name = isMine ? (userName||'我') : c.name;
    var initial = (name||'?').charAt(0);
    var avColor = isMine ? '#667eea' : '#764ba2';
    var timeStr2 = m.ts ? new Date(m.ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '';
    html += '<div class="msg'+(isMine?' mine':'')+'">';
    html += '<div class="av" style="background:'+avColor+';">'+esc(initial)+'</div>';
    html += '<div><div class="bubble '+(isMine?'mine':'theirs')+'">';
    if(m.kind==='photo'){
      html += '<img src="'+m.text+'" alt="[图片]">';
    } else if(m.kind==='sticker'){
      if(m.stype==='image'){ html += '<img src="'+m.text+'" alt="[表情]" style="width:80px;height:80px;object-fit:cover;">'; }
      else { html += esc(m.text||''); }
    } else if(m.kind==='voice'){
      html += '🎤 语音消息 ('+(m.dur||3)+'″)';
    } else if(m.kind==='card'){
      if(m.cardType==='transfer') html += '💰 转账 ¥'+(m.amount||0)+'.00';
      else if(m.cardType==='family') html += '💳 亲属卡';
      else if(m.cardType==='gift') html += '🎁 礼物：'+esc(m.name||'');
      else if(m.cardType==='order') html += '🍔 外卖：'+esc(m.name||'');
      else if(m.cardType==='loc') html += '📍 实时位置';
      else html += '📋 卡片';
    } else {
      html += esc(m.text||'');
    }
    html += '</div>';
    if(timeStr2) html += '<div class="time">'+timeStr2+'</div>';
    html += '</div></div>';
  });
  html += '</div>';
  html += '<div class="footer">由 Fated OS 导出 · '+dateStr+' '+timeStr+'</div>';
  html += '</div></body></html>';
  /* 下载文件 */
  var blob = new Blob([html], {type:'text/html;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '聊天记录_'+c.name+'_'+dateStr+'.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  showToast('聊天记录已导出', 1500);
}

/* ============ WALLET ============ */
function addWalletTx(title, amount){
  walletTx.unshift({ title, amount, d: nowTime() });
  walletBalance += amount;
  renderWallet();
  updateWalletPreview();
  saveState();
}
function renderWallet(){
  const bal = document.getElementById('wallet-balance');
  if(bal) bal.textContent = '¥ ' + walletBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const list = document.getElementById('wallet-tx-list');
  if(!list) return;
  if(!walletTx.length){ list.innerHTML='<div class="wallet-empty">还没有交易记录</div>'; return; }
  list.innerHTML = walletTx.map(t=>{
    const sign = t.amount>=0 ? '+' : '-';
    const cls = t.amount>=0 ? 'pos' : 'neg';
    return '<div class="tx-row"><div><div class="t">'+esc(t.title)+'</div><div class="d">'+t.d+'</div></div><div class="a '+cls+'">'+sign+Math.abs(t.amount).toFixed(2)+'</div></div>';
  }).join('');
}

/* ============ MOMENTS (data-driven + visibility) ============ */
function fmtAgo(ts){
  const diff = Date.now()-ts;
  const m = Math.floor(diff/60000);
  if(m<1) return '刚刚';
  if(m<60) return m+' 分钟前';
  const h = Math.floor(m/60);
  if(h<24) return h+' 小时前';
  return Math.floor(h/24)+' 天前';
}
function renderMoments(){
  const feed = document.getElementById('moments-feed'); if(!feed) return;
  if(!moments.length){ feed.innerHTML='<div style="text-align:center;color:var(--ink-faint);font-size:12px;padding:20px 0;">还没有朋友圈</div>'; return; }
  // 视角过滤：以谁的视角看，就只能看到该视角能看到的朋友圈
  var visibleMoments = moments.filter(function(m){
    var hidden = (m.hidden||[]);
    if(viewAs === 'me'){
      // user 视角：看不到"仅user不可见"的
      if(hidden.indexOf('me')>-1) return false;
      return true;
    }
    if(m.authorId === viewAs) return true; // 自己发的朋友圈自己能看到
    if(hidden.indexOf(viewAs)>-1) return false; // 在不给看列表里的，完全隐藏
    return true;
  });
  if(!visibleMoments.length){ feed.innerHTML='<div style="text-align:center;color:var(--ink-faint);font-size:12px;padding:20px 0;">这个视角下没有可见的朋友圈</div>'; return; }
  feed.innerHTML = visibleMoments.map(m=>{
    const author = contacts[m.authorId];
    const an = author ? author.name : userName;
    const aa = author ? contactAvatar(author) : userAvatarHTML();
    // 点赞栏：心形+数字水平排列，放在评论框正上方
    var likeBar = '<div class="post-likebar" onclick="toggleLike('+m.id+')"><span class="like-heart '+(m.liked?'on':'')+'">❤</span><span class="like-count">'+(m.likes||0)+'</span></div>';
    var cm = (m.comments||[]).map(c=>'<div class="ci"><b>'+(c.who==='me'?userName:c.who)+'：</b>'+esc(c.text)+'</div>').join('');
    var actions = likeBar + '<div class="post-comment">'+cm+'</div>';
    actions += '<div class="comment-input"><input id="cinput-'+m.id+'" placeholder="评论…"><div class="send" onclick="addComment('+m.id+')">发送</div></div>';
    return '<div class="post"><div class="post-head"><div class="av glass-strong">'+aa+'</div><div><div class="name">'+esc(an)+'</div><div class="post-text">'+esc(m.text)+'</div></div></div>'+
      '<div class="post-meta"><span class="time">'+fmtAgo(m.ts)+(m.place?(' · '+esc(m.place)):'')+'</span><span class="vis">'+esc(m.vis)+'</span></div>'+actions+'</div>';
  }).join('');
}
function toggleLike(id){
  const m = moments.find(x=>x.id===id); if(!m) return;
  m.liked = !m.liked; m.likes = (m.likes||0) + (m.liked?1:-1);
  renderMoments(); refreshAllMomentsViews(); saveState();
}
function addComment(id){
  const m = moments.find(x=>x.id===id); if(!m) return;
  const inp = document.getElementById('cinput-'+id); if(!inp) return;
  const t = inp.value.trim(); if(!t) return;
  m.comments = m.comments||[]; m.comments.push({who:'me', text:t, ts: Date.now()});
  renderMoments(); refreshAllMomentsViews(); saveState();
}
function setMomentsBg(e){
  const file = e.target.files[0]; if(!file) return;
  const r = new FileReader(); r.onload=()=>{ momentsBg=r.result; applyMomentsBg(); saveState(); }; r.readAsDataURL(file);
}
function applyMomentsBg(){
  const c = document.querySelector('.moments-cover'); if(!c) return;
  if(momentsBg) c.style.background = 'center/cover no-repeat url('+momentsBg+')';
  else c.style.background = 'linear-gradient(160deg,#E7B9C4,#CFC0D6)';
}
function setViewAs(val){ viewAs = val; renderMoments(); saveState(); }

/* ============================================================
   个人朋友圈（联系人 / 我自己） — 仿社交媒体 Profile 风格
   ============================================================ */

/* 打开"联系人个人朋友圈" */
function openContactMoments(){
  var id=currentContact; var c=contacts[id];
  if(!c || c.isGroup){ showToast('群聊暂无个人朋友圈', 1400); return; }
  _cpmTarget=id; _cpmComposerScope='contact';
  document.getElementById('cpm-title').textContent = (c.displayName||c.name)+' 的朋友圈';
  document.getElementById('cpm-name').textContent = c.displayName||c.name;
  document.getElementById('cpm-wxid').textContent = '微信号: '+(c.wxid||id);
  var avEl=document.getElementById('cpm-avatar'); if(avEl) avEl.innerHTML = contactAvatar(c);
  var bioEl=document.getElementById('cpm-bio');
  if(bioEl){ if(c.bio){ bioEl.textContent=c.bio; bioEl.classList.remove('empty'); } else { bioEl.textContent='这个人很懒，还没有写个性签名'; bioEl.classList.add('empty'); } }
  var cvEl=document.getElementById('cpm-cover');
  if(cvEl){
    if(c.cover){ cvEl.innerHTML='<img src="'+c.cover+'" alt=""><div class="change" onclick="pickCpCover()">更换封面</div>'; }
    else { cvEl.innerHTML='<div class="change" onclick="pickCpCover()">更换封面</div>'; }
  }
  renderCpMoments();
  openSheet('cp-moments');
}
function renderCpMoments(){
  var id=_cpmTarget; if(!id) return;
  var list=(moments||[]).filter(function(m){ return m.authorId===id; }).sort(function(a,b){return (b.ts||0)-(a.ts||0); });
  var num=list.length; var numEl=document.getElementById('cpm-post-num'); if(numEl) numEl.textContent=num;
  var feed=document.getElementById('cpm-feed'); if(!feed) return;
  if(!list.length){ feed.innerHTML='<div class="empty-tip">还没有发表过朋友圈</div>'; return; }
  var c=contacts[id];
  feed.innerHTML=list.map(function(m){
    var img=(m.img) ? '<img class="pi" src="'+m.img+'" alt="">' : '';
    return '<div class="post-card" onclick="openPostDetail('+m.id+')">'+
      '<div class="ph"><div class="av">'+contactAvatar(c)+'</div><div><div class="nm">'+esc(c.displayName||c.name)+'</div><div class="post-text pt">'+esc(m.text||'')+'</div></div></div>'+
      img+
      '<div class="pm"><span>'+fmtAgo(m.ts)+(m.place?(' · '+esc(m.place)):'')+'</span><div class="stat"><span>❤ '+(m.likes||0)+'</span><span>💬 '+(m.comments?(m.comments.length):0)+'</span></div></div>'+
      '</div>';
  }).join('');
  // 同步联系人资料里的数字
  var cpmCnt=document.getElementById('cp-moments-count'); if(cpmCnt) cpmCnt.textContent=num;
}

/* 打开"我的朋友圈"（用户视角，仿个人 Profile） */
function openMyMoments(){
  _cpmTarget=null; _cpmComposerScope='me';
  document.getElementById('mym-name').textContent = userName;
  document.getElementById('mym-wxid').textContent = '微信号: '+(userWxid||'fated_2026');
  var avEl=document.getElementById('mym-avatar'); if(avEl) avEl.innerHTML = userAvatarHTML();
  var bioEl=document.getElementById('mym-bio');
  if(bioEl){ if(userBio){ bioEl.textContent=userBio; bioEl.classList.remove('empty'); } else { bioEl.textContent='这个人很懒，还没有写个性签名'; bioEl.classList.add('empty'); } }
  var cvEl=document.getElementById('mym-cover');
  if(cvEl){
    if(userCover){ cvEl.innerHTML='<img src="'+userCover+'" alt=""><div class="change" onclick="pickMyCover()">更换封面</div>'; }
    else { cvEl.innerHTML='<div class="change" onclick="pickMyCover()">更换封面</div>'; }
  }
  renderMyMoments();
  openSheet('my-moments');
}
function renderMyMoments(){
  var list=(moments||[]).filter(function(m){ return m.authorId==='me' || !m.authorId; }).sort(function(a,b){return (b.ts||0)-(a.ts||0); });
  var num=list.length; var numEl=document.getElementById('mym-post-num'); if(numEl) numEl.textContent=num;
  // 同步"我"页面的 post 数字
  var meCnt=document.getElementById('me-post-count'); if(meCnt) meCnt.textContent=num;
  var feed=document.getElementById('mym-feed'); if(!feed) return;
  if(!list.length){ feed.innerHTML='<div class="empty-tip">还没有发表过朋友圈<br><br><div class="big-btn" style="display:inline-block;padding:8px 18px;font-size:12px;" onclick="openPostComposer(\'me\')">发布第一条</div></div>'; return; }
  feed.innerHTML=list.map(function(m){
    var img=(m.img) ? '<img class="pi" src="'+m.img+'" alt="">' : '';
    return '<div class="post-card" onclick="openPostDetail('+m.id+')">'+
      '<div class="ph"><div class="av">'+userAvatarHTML()+'</div><div><div class="nm">'+esc(userName)+'</div><div class="post-text pt">'+esc(m.text||'')+'</div></div></div>'+
      img+
      '<div class="pm"><span>'+fmtAgo(m.ts)+(m.place?(' · '+esc(m.place)):'')+'</span><div class="stat"><span>❤ '+(m.likes||0)+'</span><span>💬 '+(m.comments?(m.comments.length):0)+'</span></div></div>'+
      '</div>';
  }).join('');
}

/* 同步刷新两个朋友圈视图（在 user/contact 数据变化时调用） */
function refreshAllMomentsViews(){
  if(document.getElementById('sheet-cp-moments').classList.contains('open')) renderCpMoments();
  if(document.getElementById('sheet-my-moments').classList.contains('open')) renderMyMoments();
  // 同步"我"页面的 post 数字
  var meCnt=document.getElementById('me-post-count');
  if(meCnt){
    var n=(moments||[]).filter(function(m){return m.authorId==='me' || !m.authorId;}).length;
    meCnt.textContent=n;
  }
  // 同步联系人资料里的 post 数字
  var cpmCnt=document.getElementById('cp-moments-count');
  if(cpmCnt && currentContact){
    var n2=(moments||[]).filter(function(m){return m.authorId===currentContact;}).length;
    cpmCnt.textContent=n2;
  }
}

/* 打开 Post 详情 */
function openPostDetail(id){
  var m=(moments||[]).find(function(x){return x.id===id;}); if(!m) return;
  var author=contacts[m.authorId];
  var an = (m.authorId==='me' || !m.authorId) ? userName : (author ? (author.displayName||author.name) : '已删除');
  var aa = (m.authorId==='me' || !m.authorId) ? userAvatarHTML() : (author ? contactAvatar(author) : '');
  var liked=m.liked;
  var likesBtn='<div class="lk '+(liked?'on':'')+'" onclick="pdToggleLike('+m.id+')"><span style="font-size:16px;">'+(liked?'❤':'♡')+'</span> <span id="pd-lkc">'+(m.likes||0)+'</span></div>';
  var cmts=(m.comments||[]).map(function(c){return '<div class="c"><b>'+esc(c.who==='me'?(userName):c.who)+'：</b>'+esc(c.text)+'</div>';}).join('') || '<div class="c" style="color:#aaa;">还没有评论</div>';
  var img=(m.img)?'<img class="pi" src="'+m.img+'" alt="">':'';
  var html=''+
    '<div class="ph"><div class="av">'+aa+'</div><div><div class="nm">'+esc(an)+'</div><div style="font-size:11px;color:#999;margin-top:2px;">'+fmtAgo(m.ts)+(m.place?(' · '+esc(m.place)):'')+'</div></div></div>'+
    '<div class="pt">'+esc(m.text||'')+'</div>'+img+
    '<div class="pmeta">'+esc(m.vis||'公开')+'</div>'+
    '<div class="actions">'+likesBtn+'<div style="font-size:12px;color:#888;">'+(m.comments?m.comments.length:0)+' 条评论</div></div>'+
    '<div class="cmts">'+cmts+'</div>'+
    '<div class="cinput"><input id="pd-cmt" placeholder="说点什么…"><div class="send" onclick="pdAddComment('+m.id+')">发送</div></div>';
  document.getElementById('pd-content').innerHTML=html;
  openSheet('post-detail');
}
function pdToggleLike(id){
  var m=(moments||[]).find(function(x){return x.id===id}); if(!m) return;
  m.liked=!m.liked; m.likes=(m.likes||0)+(m.liked?1:-1);
  openPostDetail(id); saveState(); refreshAllMomentsViews();
}
function pdAddComment(id){
  var m=(moments||[]).find(function(x){return x.id===id}); if(!m) return;
  var inp=document.getElementById('pd-cmt'); if(!inp) return;
  var t=inp.value.trim(); if(!t) return;
  m.comments=m.comments||[]; m.comments.push({who:'me',text:t,ts:Date.now()});
  openPostDetail(id); saveState(); refreshAllMomentsViews();
}

/* 编辑个性签名（联系人 / 我自己） */
function editContactBio(){
  var id=_cpmTarget; if(!id) return;
  var c=contacts[id]; if(!c) return;
  var v=prompt('编辑 '+c.name+' 的个性签名', c.bio||'');
  if(v===null) return;
  c.bio=v.trim();
  saveState();
  var bioEl=document.getElementById('cpm-bio');
  if(bioEl){ if(c.bio){ bioEl.textContent=c.bio; bioEl.classList.remove('empty'); } else { bioEl.textContent='这个人很懒，还没有写个性签名'; bioEl.classList.add('empty'); } }
  showToast('签名已更新', 1000);
}
function editMyBio(){
  var v=prompt('编辑我的个性签名', userBio||'');
  if(v===null) return;
  userBio=v.trim();
  saveState();
  var bioEl=document.getElementById('mym-bio');
  if(bioEl){ if(userBio){ bioEl.textContent=userBio; bioEl.classList.remove('empty'); } else { bioEl.textContent='这个人很懒，还没有写个性签名'; bioEl.classList.add('empty'); } }
  var mineBio=document.getElementById('mine-bio'); if(mineBio) mineBio.value=userBio;
  showToast('签名已更新', 1000);
}

/* 每日自动生成联系人朋友圈（3-5条，基于聊天记录） */
var momentsLastGenDate = '';
function dailyGenContactMoments(){
  var today = new Date().toDateString();
  if(momentsLastGenDate === today) return; // 今天已生成过
  momentsLastGenDate = today;
  saveState();

  Object.keys(contacts).forEach(function(cid){
    var c = contacts[cid];
    if(cid==='me' || !c || c.isGroup) return;
    var seed = c.seed || [];
    var chatTexts = seed.filter(function(m){ return m.kind==='text'; }).map(function(m){ return m.text; });
    if(chatTexts.length === 0) return; // 没有聊天记录跳过

    // 生成 3-5 条朋友圈
    var count = 3 + Math.floor(Math.random()*3); // 3,4,5
    var templates = generateMomentTemplates(c, chatTexts);
    for(var i=0; i<count && i<templates.length; i++){
      var t = templates[i];
      var visOpts = ['公开', '公开', '公开', '仅user可见', '仅user不可见'];
      var vis = visOpts[Math.floor(Math.random()*visOpts.length)];
      var hidden = [];
      if(vis==='仅user可见'){ hidden = Object.keys(contacts).filter(function(k){ return k!=='me'; }); }
      else if(vis==='仅user不可见'){ hidden = ['me']; }
      // 时间分布在今天
      var hoursAgo = Math.floor(Math.random()*20) + 1;
      moments.push({
        id: Date.now() + Math.floor(Math.random()*100000),
        authorId: cid,
        text: t,
        vis: vis,
        place: '',
        hidden: hidden,
        ts: Date.now() - hoursAgo*3600000,
        likes: Math.floor(Math.random()*20),
        liked: false,
        comments: []
      });
    }
  });
  renderMoments(); refreshAllMomentsViews();
}

function generateMomentTemplates(c, chatTexts){
  var name = c.displayName || c.name || 'TA';
  var persona = c.tone || c.persona || '';
  var recent = chatTexts.slice(-10);
  var topics = recent.join(' ').substring(0, 200);
  var templates = [];

  // 基于聊天内容生成朋友圈文案
  var moods = ['开心', '感慨', '吐槽', '分享', '想念', '日常'];
  var mood = moods[Math.floor(Math.random()*moods.length)];

  // 模板池
  var pool = [
    '今天和' + (topics.substring(0,20)) + '…嗯，心情' + mood + '。',
    '想起了之前聊到的 "' + (chatTexts[Math.floor(Math.random()*chatTexts.length)]||'').substring(0,30) + '"，果然还是很有道理。',
    '生活就是这样吧，' + mood + '的时候总觉得应该记录一下。',
    '今天发生了一些事，让我想到了很多。',
    '有时候沉默比说出口的话更有分量。',
    (persona ? ('作为一个' + persona.substring(0,10) + '的人，') : '') + '今天的心情是' + mood + '的。',
    '翻聊天记录翻到了"' + (chatTexts[Math.floor(Math.random()*chatTexts.length)]||'').substring(0,25) + '"，突然觉得时间过得好快。',
    '今天的天空很好看，想分享给在意的人。',
    '有些话说不出口，但写在这里也好。',
    '又是忙碌的一天，但想到有人在等我，就不觉得累了。',
    '关于"' + (topics.substring(0,15)) + '"这件事，我有一些新的想法。',
    '今天的' + mood + '来得猝不及防。',
    '一个人走在路上，耳机里的歌突然就戳中了。',
    '有时候觉得自己很奇怪，明明' + mood + '却还要装作若无其事。',
    '记一个值得记住的瞬间。'
  ];

  // 随机选 count 个不重复的
  var indices = [];
  while(indices.length < 5 && indices.length < pool.length){
    var idx = Math.floor(Math.random()*pool.length);
    if(indices.indexOf(idx)===-1) indices.push(idx);
  }
  indices.forEach(function(i){ templates.push(pool[i]); });
  return templates;
}

/* 发朋友圈（自己 / 帮联系人发） */
function openPostComposer(scope){
  scope=scope||'me'; _cpmComposerScope=scope;
  document.getElementById('pc-title').textContent = (scope==='me') ? '发朋友圈' : ('帮 '+(contacts[_cpmTarget]?(contacts[_cpmTarget].displayName||contacts[_cpmTarget].name):'TA')+' 发一条');
  document.getElementById('pc-text').value='';
  document.getElementById('pc-place').value='';
  document.getElementById('pc-vis').value='公开';
  _postComposeImage=null;
  var pv=document.getElementById('pc-img-preview'); if(pv) pv.innerHTML='';
  var imgInp=document.getElementById('pc-img'); if(imgInp) imgInp.value='';
  openSheet('post-compose');
}
function submitPost(){
  var text=document.getElementById('pc-text').value.trim();
  if(!text && !_postComposeImage){ showToast('说点什么再发吧', 1400); return; }
  var place=document.getElementById('pc-place').value.trim();
  var vis=document.getElementById('pc-vis').value;
  var hidden=[];
  if(vis==='仅user可见'){
    // 仅user可见 = 所有联系人都看不到
    hidden = Object.keys(contacts).filter(function(k){ return k!=='me'; });
  } else if(vis==='仅user不可见'){
    // 仅user不可见 = user看不到，联系人能看到
    hidden = ['me'];
  }
  var m={
    id: Date.now() + Math.floor(Math.random()*1000),
    authorId: (_cpmComposerScope==='me') ? 'me' : _cpmTarget,
    text: text,
    vis: vis,
    place: place,
    hidden: hidden,
    ts: Date.now(),
    likes: 0, liked:false, comments:[],
    img: _postComposeImage||null
  };
  moments.push(m); saveState();
  closeSheet('post-compose');
  refreshAllMomentsViews();
  showToast('已发布', 1200);
}

/* 封面图更换（联系人 / 我自己） */
function pickCpCover(){ _cpmCoverTarget='contact'; cpCoverInput.click(); }
function pickMyCover(){ _cpmCoverTarget='me'; cpCoverInput.click(); }
var cpCoverInput=document.createElement('input');
cpCoverInput.type='file'; cpCoverInput.accept='image/*'; cpCoverInput.style.display='none';
document.body.appendChild(cpCoverInput);
cpCoverInput.addEventListener('change', function(e){
  var f=e.target.files[0]; if(!f) return;
  compressImage(f, 800, 0.82, function(res){
    if(!res) return;
    if(_cpmCoverTarget==='me'){
      userCover=res;
      var cv=document.getElementById('mym-cover');
      if(cv) cv.innerHTML='<img src="'+res+'" alt=""><div class="change" onclick="pickMyCover()">更换封面</div>';
      var pv=document.getElementById('mine-cover-preview'); if(pv){ pv.style.backgroundImage='url('+res+')'; pv.dataset.src=res; }
    } else {
      var id=_cpmTarget||currentContact; var c=contacts[id]; if(!c) return;
      c.cover=res;
      var cv=document.getElementById('cpm-cover');
      if(cv) cv.innerHTML='<img src="'+res+'" alt=""><div class="change" onclick="pickCpCover()">更换封面</div>';
      var pv=document.getElementById('cp-cover-preview'); if(pv){ pv.style.backgroundImage='url('+res+')'; pv.dataset.src=res; }
    }
    saveState();
    e.target.value='';
  });
});

/* 联系人封面输入（联系人信息页） */
document.addEventListener('change', function(e){
  if(e.target && e.target.id==='cp-cover-input'){
    var f=e.target.files[0]; if(!f) return;
    compressImage(f, 800, 0.82, function(res){
      if(!res) return;
      var pv=document.getElementById('cp-cover-preview');
      if(pv){ pv.style.backgroundImage='url('+res+')'; pv.dataset.src=res; }
    });
    e.target.value='';
  } else if(e.target && e.target.id==='mine-cover-input'){
    var f=e.target.files[0]; if(!f) return;
    compressImage(f, 800, 0.82, function(res){
      if(!res) return;
      var pv=document.getElementById('mine-cover-preview');
      if(pv){ pv.style.backgroundImage='url('+res+')'; pv.dataset.src=res; }
    });
    e.target.value='';
  } else if(e.target && e.target.id==='pc-img'){
    var f=e.target.files[0]; if(!f) return;
    compressImage(f, 800, 0.82, function(res){
      if(!res) return;
      _postComposeImage=res;
      var pv=document.getElementById('pc-img-preview');
      if(pv) pv.innerHTML='<img src="'+res+'" style="width:100%;max-width:200px;border-radius:10px;">';
    });
    e.target.value='';
  }
});

/* 把封面输入同步到"我"页面打开 mine 时 */
function syncMineCoverPreview(){
  var pv=document.getElementById('mine-cover-preview');
  if(pv){
    if(userCover){ pv.style.backgroundImage='url('+userCover+')'; pv.dataset.src=userCover; }
    else { pv.style.backgroundImage='linear-gradient(160deg,#E7B9C4,#CFC0D6)'; pv.dataset.src=''; }
  }
  var wn=document.getElementById('mine-wxid'); if(wn) wn.value=userWxid||'fated_2026';
  var bb=document.getElementById('mine-bio'); if(bb) bb.value=userBio||'';
}

/* 群成员关系管理 */
function renderGroupRelations(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  var g=document.getElementById('gi-rel-graph'); if(!g) return;
  var rels=c.relations||[];
  if(!rels.length){ g.innerHTML='<div style="font-size:11.5px;color:#aaa;">还没有设置任何关系，点下面添加 →</div>'; return; }
  g.innerHTML=rels.map(function(r,i){
    var a=contacts[r.a], b=contacts[r.b];
    var an=a?(a.displayName||a.name):r.a;
    var bn=b?(b.displayName||b.name):r.b;
    return '<span class="relation-chip" title="'+esc(an)+' 与 '+esc(bn)+'：'+esc(r.tag)+'">'+esc(an)+' ❤ '+esc(bn)+' = '+esc(r.tag)+'<span class="x" onclick="removeGroupRelation('+i+')">×</span></span>';
  }).join('');
}
function addGroupRelation(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  var a=document.getElementById('gi-rel-a').value;
  var b=document.getElementById('gi-rel-b').value;
  var tag=document.getElementById('gi-rel-tag').value.trim();
  if(!a||!b){ showToast('请选择两位成员', 1400); return; }
  if(a===b){ showToast('不能是同一个人', 1400); return; }
  if(!tag){ showToast('请输入关系标签', 1400); return; }
  c.relations=c.relations||[];
  c.relations.push({a:a, b:b, tag:tag});
  document.getElementById('gi-rel-tag').value='';
  renderGroupRelations();
  showToast('已添加', 1000);
}
function removeGroupRelation(idx){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  if(!c.relations||!c.relations[idx]) return;
  c.relations.splice(idx,1);
  renderGroupRelations();
}

/* 群聊 userPrompt 自动追加"群成员关系"上下文，供 AI 群聊使用 */
function getGroupRelationsPrompt(c){
  if(!c || !c.isGroup || !c.relations || !c.relations.length) return '';
  var lines=['\n\n[本群成员关系]'];
  c.relations.forEach(function(r){
    var an=contacts[r.a]?(contacts[r.a].displayName||contacts[r.a].name):r.a;
    var bn=contacts[r.b]?(contacts[r.b].displayName||contacts[r.b].name):r.b;
    lines.push('- '+an+' 与 '+bn+'：'+r.tag);
  });
  return lines.join('\n');
}

/* ============ GROUP CHAT ============ */
function addChatRow(id, isGroup){
  renderChatList();
}
function addContactRow(id, isGroup){
  const c = contacts[id];
  const av = isGroup ? '<div class="chibi"></div>' : contactAvatar(c);
  const row = document.createElement('div');
  row.className='contact-row';
  row.setAttribute('data-cid', id);
  row.setAttribute('onclick', "openThread('"+id+"')");
  var avClick = isGroup ? '' : ' onclick="event.stopPropagation();changeContactAvatar(\''+id+'\')" title="点击更换头像" style="cursor:pointer;"';
  row.innerHTML = '<div class="av glass-strong"'+avClick+'>'+av+'</div><div style="flex:1;min-width:0;"><div class="name">'+esc(c.displayName||c.name)+'</div><div class="habit">'+(isGroup?('群成员 '+c.members.length+' 人'):'已添加的人设')+'</div></div><div class="del-contact" onclick="event.stopPropagation();deleteContact(\''+id+'\')" title="删除联系人">×</div>';
  const box = document.getElementById('contact-items');
  if(box) box.appendChild(row);
}
function deleteContact(id){
  if(id==='tester1'){ showToast('测试员1 是默认联系人，不能删除', 1600); return; }
  var nm = contacts[id] ? contacts[id].name : id;
  // 清除空闲计时器
  if(contacts[id] && contacts[id].idleTimer){ clearTimeout(contacts[id].idleTimer); }
  // 彻底删除联系人数据
  delete contacts[id];
  // 清理API配置
  if(apiConfig.voiceIds) delete apiConfig.voiceIds[id];
  if(apiConfig.memoryBooks) delete apiConfig.memoryBooks[id];
  // 从 IndexedDB 删除聊天记录
  fatedDBDeleteChat(id);
  // 从联系人列表DOM中移除
  var cr=document.querySelector('#contact-items [data-cid="'+id+'"]'); if(cr) cr.remove();
  // 重建聊天列表（会自动排除已删除的联系人）
  renderChatList();
  // 如果当前正在和被删除的联系人聊天，切回测试员1
  if(currentContact===id){
    currentContact='tester1';
    closeSheet('thread');
  }
  saveState();
  showToast('已删除「'+nm+'」及其所有聊天记录', 1600);
}
function openGroupSheet(){
  const list = document.getElementById('group-picker');
  const ids = Object.keys(contacts).filter(k=>!contacts[k].isGroup && k!=='me');
  list.innerHTML = ids.map(id=>{
    const c = contacts[id];
    return '<label class="me-row" style="cursor:pointer;"><div class="av" style="width:34px;height:34px;">'+contactAvatar(c)+'</div><div class="t">'+esc(c.name)+'</div><input type="checkbox" class="gp-chk" value="'+id+'" style="margin-left:auto;"></label>';
  }).join('');
  document.getElementById('gp-name').value='';
  renderWorldBookChips('gp-worldbooks', []);
  openSheet('group');
}
function createGroup(){
  const chks = Array.from(document.querySelectorAll('#group-picker .gp-chk:checked')).map(c=>c.value);
  if(chks.length<2){ showToast('至少选择 2 个人设才能建群', 1500); return; }
  const id = 'g'+(personaSeq++);
  const gname = document.getElementById('gp-name').value.trim();
  const names = chks.map(k=>contacts[k].name).join('、');
  const wbIds = Array.from(document.querySelectorAll('#gp-worldbooks .wb-chk:checked')).map(c=>c.value);
  contacts[id] = { name:gname||('群聊 · '+names.slice(0,10)), displayName:'', isGroup:true, members:chks, pendingCount:0, idleTimer:null, avatar:null, avatarColor:null, blocked:false, worldBooks:wbIds, memory:{enabled:true, threshold:20, summary:'', lastMsgCount:0}, groupUserPrompt:userPrefs||'', seed:[] };
  addChatRow(id, true); addContactRow(id, true);
  closeSheet('group');
  openThread(id);
  saveState();
  saveChatThread(id);
}

/* ============ REAL VOICE (TTS + recording) ============ */
function ttsConfigured(){
  var p=apiConfig.ttsProvider, t=apiConfig.tts;
  if(p==='elevenlabs') return !!t.elevenlabs.key;
  if(p==='minimax') return !!(t.minimax.key && t.minimax.groupId);
  if(p==='custom') return !!(t.custom.endpoint && t.custom.key);
  return false;
}
function playAudioBlob(blob){ var url=URL.createObjectURL(blob); var a=new Audio(url); a.play().catch(function(){}); a.onended=function(){ try{URL.revokeObjectURL(url);}catch(e){} }; }
function speakText(t){
  if(!t) return;
  if(ttsConfigured()){ speakWithTTS(t, apiConfig.voiceIds[currentContact]||''); return; }
  try{
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang='zh-CN'; u.rate=1.02; u.pitch=1.08;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}
/* 通过配置的 TTS 服务商（含自定义国内中转站）朗读文本 */
function speakWithTTS(text, voiceId){
  var p=apiConfig.ttsProvider, t=apiConfig.tts;
  function fallback(){ try{ if('speechSynthesis' in window){ var u=new SpeechSynthesisUtterance(text); u.lang='zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u);} }catch(e){} }
  try{
    if(p==='elevenlabs'){
      var vid=voiceId||'21m00Tcm4TlvDq8ikWAM';
      fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(vid), {method:'POST', headers:{'Content-Type':'application/json','xi-api-key':t.elevenlabs.key}, body:JSON.stringify({text:text, model_id:t.elevenlabs.model||'eleven_multilingual_v2'})})
        .then(function(r){ return r.blob(); }).then(function(b){ playAudioBlob(b); }).catch(fallback);
    } else if(p==='minimax'){
      var url='https://api.minimax.chat/v1/t2a_v2?GroupId='+encodeURIComponent(t.minimax.groupId);
      fetch(url, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+t.minimax.key}, body:JSON.stringify({model:t.minimax.model||'speech-01', text:text, voice_setting:{voice_id:(voiceId||'female-qn-qingse'), speed:1, vol:1, pitch:0}})})
        .then(function(r){return r.json();}).then(function(d){ var b64=d&&d.data&&d.data.audio; if(b64){ var bin=atob(b64); var arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); playAudioBlob(new Blob([arr],{type:'audio/mp3'})); } else fallback(); }).catch(fallback);
    } else if(p==='custom'){
      fetch(t.custom.endpoint, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+t.custom.key}, body:JSON.stringify({text:text, voice:(t.custom.voice||voiceId||''), model:''})})
        .then(function(r){ var ct=r.headers.get('content-type')||''; if(ct.indexOf('audio')>-1){ return r.blob().then(playAudioBlob); } return r.json().then(function(d){ var b64=d&&(d.audio||(d.data&&d.data.audio)||d.data); if(b64){ if(typeof b64==='string'&&b64.indexOf(',')>-1) b64=b64.split(',')[1]; var bin=atob(b64); var arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i); playAudioBlob(new Blob([arr],{type:'audio/mpeg'})); } else fallback(); }); }).catch(fallback);
    } else fallback();
  }catch(e){ fallback(); }
}
function startRecord(){
  if(isRecording){ stopRecord(); return; }
  if(!navigator.mediaDevices || !window.MediaRecorder){ alert('当前环境不支持录音，已用模拟语音代替'); sendVoice(); return; }
  navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    mediaChunks=[]; mediaRec=new MediaRecorder(stream);
    mediaRec.ondataavailable = e=>{ if(e.data.size) mediaChunks.push(e.data); };
    mediaRec.onstop = ()=>{
      const blob = new Blob(mediaChunks, {type: mediaChunks[0]?mediaChunks[0].type:'audio/webm'});
      const dur = Math.max(1, Math.round((Date.now()-recStart)/1000));
      const c = contacts[currentContact];
      stream.getTracks().forEach(t=>t.stop());
      // 关键修复：必须转成 data: URL（base64）才能发给代理服务器让 AI 真正“听到”语音。
      // 原来的 URL.createObjectURL(blob) 是浏览器本地引用，代理服务器无法读取。
      const reader = new FileReader();
      reader.onload = function(){
        c.seed.push({mine:true, kind:'voice', audioUrl:reader.result, dur, from:'me', ts:nowStamp()});
        c.pendingCount++; renderThread(); saveChatThread(); resetIdleTimer();
        aiAutoReply(c);
      };
      reader.readAsDataURL(blob);
    };
    mediaRec.start(); isRecording=true; recStart=Date.now();
    document.querySelectorAll('#sheet-thread .icobtn').forEach(b=>{ if(b.getAttribute('onclick')&&b.getAttribute('onclick').indexOf('startRecord')>-1) b.classList.add('recording'); });
  }).catch(()=>{ showToast('无法访问麦克风，已用模拟语音代替', 1500); sendVoice(); });
}
function stopRecord(){
  isRecording=false;
  document.querySelectorAll('#sheet-thread .icobtn.recording').forEach(b=>b.classList.remove('recording'));
  if(mediaRec && mediaRec.state!=='inactive') mediaRec.stop();
}
/* ============ REAL AI API CALLER ============ */
function callRealAI(messages, systemPrompt, contactId, callback){
  var cfg = apiConfig;
  var model = cfg.activeModel || 'deepseek';
  var m = cfg.models[model];
  var sp = (systemPrompt||'You are a helpful assistant. Never prefix with your name.');
  if(contactId) sp += buildContextAddons(contactId);
  var msgs = [{role:'system',content:sp}];
  // Add legacy memory book if available
  if(contactId && cfg.memoryBooks[contactId]){
    var mb = cfg.memoryBooks[contactId];
    if(mb.trim()) msgs.push({role:'system',content:'[Legacy Memory Book]\n'+mb.trim()});
  }
  msgs = msgs.concat(messages.slice(-Math.floor(cfg.memoryWindow/200)));
  var hasKey = !!(m&&m.key), hasEndpoint = !!(m&&m.endpoint);
  console.log('=== AI REQUEST ===');
  console.log('Model:',model,'HasKey:',hasKey,'Messages:',msgs.length);
  msgs.forEach(function(x,i){ console.log('  ['+i+'] '+x.role+': '+x.content.substring(0,80)); });

  // 构造直连请求体（按 provider 拼装，端点自动补全）
  function buildDirect(){
    var url,hdrs,bd;
    var ep = modelEndpoint(m, model);            // 规范化端点
    if(!ep) return null;
    if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:1024,temperature:0.8}); }
    else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; var sys=msgs.filter(function(x){return x.role==='system';}).map(function(x){return x.content;}).join('\n\n'); bd=JSON.stringify({model:m.model,system:sys,messages:msgs.filter(function(x){return x.role!=='system';}),max_tokens:1024}); }
    else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:msgs.map(function(x){return {role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]};}),generationConfig:{maxOutputTokens:1024,temperature:0.8}}); }
    else if(model==='custom'){
      var cf=m.apiFormat||'openai';
      if(cf==='claude'){
        url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'};
        var sys=msgs.filter(function(x){return x.role==='system';}).map(function(x){return x.content;}).join('\n\n');
        bd=JSON.stringify({model:m.model,system:sys,messages:msgs.filter(function(x){return x.role!=='system';}),max_tokens:1024});
      } else if(cf==='gemini'){
        url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'};
        bd=JSON.stringify({contents:msgs.map(function(x){return {role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]};}),generationConfig:{maxOutputTokens:1024,temperature:0.8}});
      } else {
        url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:1024,temperature:0.8});
      }
    }
    else { return null; }
    return {url:url,hdrs:hdrs,bd:bd};
  }
  function parseReply(data){
    if(model==='deepseek'||model==='chatgpt') return (data.choices&&data.choices[0])?data.choices[0].message.content:'';
    if(model==='custom'){
      var cf=(m.apiFormat||'openai');
      if(cf==='claude') return (data.content&&data.content[0])?data.content[0].text:'';
      if(cf==='gemini') return (data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
      return (data.choices&&data.choices[0])?data.choices[0].message.content:'';
    }
    if(model==='claude') return (data.content&&data.content[0])?data.content[0].text:'';
    if(model==='gemini') return (data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
    return '';
  }

  // 1) 优先直连：DeepSeek/OpenAI 支持 file:// 跨域，通常无需代理即可成功
  function tryDirect(cb){
    if(!m||!m.key||!m.endpoint){ cb(null); return; }
    var d = buildDirect(); if(!d){ cb(null); return; }
    fetch(d.url,{method:'POST',headers:d.hdrs,body:d.bd}).then(function(r){
      // CORS 被拦截时 r 不可读会抛错走 catch；能读到则继续
      return r.text().then(function(t){ return {ok:r.ok, status:r.status, text:t}; });
    }).then(function(res){
      if(!res){ cb(null); return; }
      var data; try{ data = JSON.parse(res.text); }catch(e){ data = null; }
      if(!data){ cb(null); return; }
      var reply = parseReply(data);
      // 只有拿到真实有效回复才算直连成功；API 错误（Key/模型/额度）一律交给代理兜底统一报错
      if(reply && !data.error){ cb(reply); }
      else { cb(null); }
    }).catch(function(){ cb(null); });
  }

  // 2) 代理兜底（Cloudflare Pages Function），解决 CORS 限制，并回传具体错误原因
  function tryProxy(cb){
    if(!m||!m.key){ cb(null); return; }
    var ep = modelEndpoint(m, model);
    var proxyBody = JSON.stringify({messages:msgs, model:(m?m.model:'deepseek-chat'), provider:model, key:(m?m.key:''), endpoint:ep, dataModel:(m?m.model:'deepseek-chat'), apiFormat:(m?(m.apiFormat||'openai'):'openai'), max_tokens:1024});
    var apiUrl = proxyBase()+'/api/chat';
    fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:proxyBody})
      .then(function(r){
        return r.text().then(function(t){ return {ok:r.ok, status:r.status, text:t}; });
      })
      .then(function(res){
        if(!res || !res.text){ cb(null, null); return; }
        var data; try{ data = JSON.parse(res.text); }catch(e){ data = null; }
        if(!data){ cb(null, '代理返回非 JSON (HTTP '+res.status+')'); return; }
        var reply=data.content||data.reply||'';
        var isErrReply = /API连接失败|API Error|Invalid API|401|403|unauthorized|forbidden|请在设置|填入 API Key|请先在设置|缺(少)?\s*API|Proxy error|无法访问|timed out|timeout/i.test(reply);
        if(reply && !isErrReply && !data.error){ cb(reply); return; }
        // 提取代理回传的具体错误，供最终提示使用
        var errMsg = data.error || (isErrReply ? reply : '') || ('HTTP '+res.status);
        cb(null, errMsg);
      })
      .catch(function(){ cb(null, '代理请求失败（Functions 可能未部署）'); });
  }

  if(!m||!m.key){
    showToast('未填写 API Key：请去 设置→API Config 填写', 2600, 'err');
    callback(generateLocalReply(messages,contactId)+' [need API key]');
    return;
  }
  // 直连优先（DeepSeek/OpenAI 等 API 本身支持 CORS）→ 代理兜底 → 离线回复
  tryDirect(function(directReply){
    if(directReply){ callback(directReply); return; }
    tryProxy(function(proxyReply, errMsg){
      if(proxyReply){ callback(proxyReply); return; }
      var hint = errMsg ? ('：'+String(errMsg).replace(/^(API Error \(HTTP \d+\):\s*|Proxy error:\s*)/i,'').substring(0,90)) : '：请检查 API Key 和 Endpoint';
      showToast('AI 连接失败'+hint, 3600, 'err');
      callback(generateLocalReply(messages,contactId)+' [无法连接 AI]');
    });
  });
}

function summarizeMemory(contactId){
  var c=contacts[contactId]; if(!c) return;
  if(!c.memory) c.memory={enabled:true, threshold:20, summary:'', lastMsgCount:0};
  if(c.memory.enabled===false) return;
  var seed=c.seed||[];
  var th=c.memory.threshold||20;
  if(seed.length < c.memory.lastMsgCount + th) return;
  // 取最近 th 条消息作为本次总结增量
  var recent=seed.slice(-th);
  var log=recent.map(function(m){
    var who=m.mine?userName:(contacts[m.from]?contacts[m.from].name:c.name);
    var txt='';
    if(m.kind==='text' || !m.kind) txt=m.text||'';
    else if(m.kind==='photo') txt='[图片]';
    else if(m.kind==='voice') txt='[语音]';
    else if(m.kind==='sticker') txt='[表情]';
    else if(m.kind==='pat') txt=m.text||'[拍一拍]';
    else if(m.kind==='card') txt='[卡片]';
    return who+'：'+txt;
  }).join('\n');
  var prompt='请根据以下聊天记录，提炼关键信息并更新记忆总结。要求：\n1. 保留用户'+userName+'的偏好、习惯、重要事件、情感状态。\n2. 保留 '+c.name+' 的关键信息和态度。\n3. 用简洁中文条目列出，不要编造。\n4. 如果已有记忆，请合并去重。\n\n【已有记忆】\n'+(c.memory.summary||'(无)')+'\n\n【新增聊天记录】\n'+log+'\n\n请输出新的记忆总结：';
  callRealAI([{role:'user',content:prompt}], '你是记忆整理助手。请用中文输出简洁的记忆总结条目。', null, function(summary){
    if(summary){
      c.memory.summary=summary.trim();
      c.memory.lastMsgCount=seed.length;
      saveChatThread(contactId);
      // 如果正在看该联系人/群聊的资料页，刷新显示
      if(currentContact===contactId){
        var cp=document.getElementById('cp-memory-summary'); if(cp) cp.textContent=c.memory.summary||'(暂无记忆)';
        var gi=document.getElementById('gi-memory-summary'); if(gi) gi.textContent=c.memory.summary||'(暂无群聊记忆)';
      }
    }
  });
}

function maybeSummarizeAfter(contactId){
  setTimeout(function(){ summarizeMemory(contactId); }, 2000);
}

function aiAutoReply(c){
  if(c.isGroup){
    // 群聊：每个成员按随机顺序只回复 1 条
    var members=shuffleArray((c.members||[]).slice());
    var delay=500;
    members.forEach(function(mid, idx){
      var mc=contacts[mid]; if(!mc || mc.blocked) return;
      setTimeout(function(){ realAISpeak(mc,mid,null,c); }, delay);
      delay += 1200 + Math.floor(Math.random()*1500);
    });
  } else if(c.pendingCount < MAX_STREAK){ setTimeout(function(){ realAISpeak(c); },500); }
}
function shuffleArray(arr){
  for(var i=arr.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
  return arr;
}
function callUserSpeak(){
  try{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const st = document.getElementById('call-status');
    // 通话也走真实 AI：把用户说的话（或“打来电话”）作为真实输入，让 AI 思考后回复并朗读
    const replyAndSpeak = function(userText){
      callRealAI([{role:'user',content:userText||'（打来电话，随便聊两句）'}], getPersonaPrompt(currentContact)+nowContext(), currentContact, function(reply){ st.textContent='通话中'; speakText(reply||'嗯，我在听。'); });
    };
    if(!SR){ st.textContent='通话中'; replyAndSpeak('（打来电话）'); return; }
    const rec = new SR(); rec.lang='zh-CN'; rec.interimResults=false;
    st.textContent='聆听中…';
    rec.onresult = e=>{ const txt=e.results[0][0].transcript; replyAndSpeak(txt); };
    rec.onerror = ()=>{ st.textContent='通话中'; replyAndSpeak('（没听清，请你再说一遍）'); };
    rec.start();
  }catch(e){ speakText('喂？'); }
}


/* ============ CHAT BACKGROUND ============ */
function applyChatBgToDOM(val){
  var bg=document.getElementById('thread-bg');
  if(!bg) return;
  // 判断是图片URL还是纯色/渐变
  if(typeof val==='string' && val.indexOf('url(')===0){
    bg.style.background=val;
    bg.style.backgroundSize='cover';
    bg.style.backgroundPosition='center';
    bg.style.backgroundRepeat='no-repeat';
  } else {
    bg.style.background=val;
  }
  // 同时设置sheet背景（状态栏区域）
  var sheet=document.getElementById('sheet-thread');
  if(sheet) sheet.style.background=val;
}
function setChatBg(el, val){
  chatBg = val;
  document.querySelectorAll('#chat-bg-swatches .swatch').forEach(function(s){s.style.border='2px solid transparent';});
  if(el&&el.style) el.style.border='2px solid #1a1a1a';
  applyChatBgToDOM(val);
  saveState();
}
function uploadChatBg(e){
  var file=e.target.files[0]; if(!file) return;
  compressImage(file, 800, 0.85, function(res){
    if(!res) return;
    chatBg='url('+res+') center/cover no-repeat';
    applyChatBgToDOM(chatBg);
    document.querySelectorAll('#chat-bg-swatches .swatch').forEach(function(s){s.style.border='2px solid transparent';});
    saveState();
    showToast('聊天壁纸已更换', 1200);
  });
  e.target.value='';
}
function applyChatBgHex(){
  var v=(document.getElementById('chatbg-hex').value||'').trim();
  if(!v) return;
  if(v[0]!=='#' && !/^(rgb|hsl)/i.test(v)) v='#'+v;
  setChatBg(null, v);
  document.querySelectorAll('#chat-bg-swatches .swatch').forEach(function(s){s.style.border='2px solid transparent';});
  showToast('聊天背景已更新', 1200);
}

/* ============ BLOCK CONTACT ============ */
function blockContact(){
  const c = contacts[currentContact];
  c.blocked = true;
  closeSheet('chatsettings');
  // 在聊天中添加一条系统消息记录拉黑时间
  c.seed.push({kind:'pat', text:'—— 你已拉黑 '+c.name+'，双方都无法发送消息 ——', ts:nowStamp()});
  renderThread();
  saveChatThread(); saveState();
  showToast('已拉黑 '+c.name, 1400);
}
function unblockContact(){
  const c = contacts[currentContact];
  c.blocked = false;
  // 添加一条系统消息记录解除拉黑
  c.seed.push({kind:'pat', text:'—— 你已解除拉黑 '+c.name+'，可以正常聊天了 ——', ts:nowStamp()});
  renderThread();
  saveChatThread(); saveState();
  showToast('已解除拉黑', 1200);
  // 解除拉黑后AI自然回复一条消息
  setTimeout(function(){ realAISpeak(c,null,'You just got unblocked by '+userName+'. Express sincere apology and relief. Keep it short, 1-2 sentences in Chinese.'); },400);
}
function blockDrawer(){
  var c=contacts[currentContact];
  if(c.blocked){
    // 已拉黑，直接解除
    unblockContact();
  } else {
    // 未拉黑，直接拉黑
    blockContact();
  }
}
function sendPic(e){var f=e.target.files[0];if(!f)return;var c=contacts[currentContact];if(c.blocked){showToast('已拉黑，无法发送消息',1200);return;}if(c.pendingCount>=MAX_STREAK)return;var r=new FileReader();r.onload=function(){c.seed.push({mine:true,kind:'photo',text:r.result,from:'me',ts:nowStamp()});c.pendingCount++;closeDrawers();renderThread();saveChatThread();resetIdleTimer();aiAutoReply(c);maybeSummarizeAfter(currentContact);};r.readAsDataURL(f);e.target.value='';}
function toggleBlock(){ const c = contacts[currentContact]; if(c.blocked) unblockContact(); else blockContact(); }

var AVATAR_PALETTE = ['#e98a9c','#9bb37a','#7d9bd1','#c9a4e0','#e0b26a','#79c2c9','#d98aa6','#8ab0e0'];
function randAvatarColor(){ return AVATAR_PALETTE[Math.floor(Math.random()*AVATAR_PALETTE.length)]; }
function avatarHTML(tone, color){
  var st = color ? ' style="--avbg:'+color+'"' : '';
  return '<div class="chibi '+(tone||'')+'"'+st+'><div class="ear l"></div><div class="ear r"></div><div class="face"></div><div class="eye l"></div><div class="eye r"></div><div class="blush l"></div><div class="blush r"></div></div>';
}
function contactAvatar(c){
  if(c && c.avatar) return '<img class="av-img" src="'+c.avatar+'" alt="">';
  return avatarHTML(c?c.tone:'', c?c.avatarColor:null);
}

function renderThread(){
  const c = contacts[currentContact];
  document.getElementById('thread-name').textContent = c.displayName || c.name;
  document.getElementById('call-name').textContent = c.name;
  var tAv=document.getElementById('thread-avatar'); if(tAv) tAv.innerHTML=contactAvatar(c);
  // 确保聊天背景正确显示
  if(chatBg) applyChatBgToDOM(chatBg);
  const wrap = document.getElementById('thread-msgs');
  wrap.innerHTML = '<div class="daydivider">今天</div>';
  if(c.blocked){
    wrap.insertAdjacentHTML('beforeend', '<div class="blocked-banner">你已拉黑 '+c.name+'，双方都无法发送消息<br><span class="link" onclick="unblockContact()">点此解除拉黑</span></div>');
  }
  c.seed.forEach(m=> wrap.insertAdjacentHTML('beforeend', renderRow(m, c)));
  wrap.scrollTop = wrap.scrollHeight;
  const ib = document.getElementById('msg-input'), sb = document.getElementById('sendbtn');
  if(c.blocked){ ib.disabled=true; ib.placeholder='已拉黑，等待对方好友申请'; sb.style.opacity=.4; sb.style.pointerEvents='none'; }
  else { ib.disabled=false; ib.placeholder='发消息 · ᗜ֊ᗜ'; sb.style.opacity=1; sb.style.pointerEvents='auto'; }
  const brt = document.getElementById('block-row-text'); if(brt) brt.textContent = c.blocked ? '解除拉黑' : '拉黑 对方';
  var dbt = document.getElementById('drawer-block-text'); if(dbt) dbt.textContent = c.blocked ? '解除拉黑' : '拉黑对方';
  updateSendCap();
  // 群聊功能按钮控制：群聊隐藏亲属卡、显示红包
  var famRow = document.getElementById('drawer-family-row');
  var rpRow = document.getElementById('drawer-redpacket-row');
  if(famRow) famRow.style.display = c.isGroup ? 'none' : 'flex';
  if(rpRow) rpRow.style.display = c.isGroup ? 'flex' : 'none';
}

function renderRow(m, c){
  if(m.kind==='pat'){ return '<div class="sys-text">'+m.text+'</div>'; }
  if(m.kind==='typing'){
    return '<div class="msg-row" id="typing-row"><div class="av">'+contactAvatar(c)+'</div><div class="msg-col"><div class="bubble theirs typing-bubble"><i></i><i></i><i></i></div></div></div>';
  }
  const isMine = !!m.mine;
  let nameLabel, avHTML, tone;
  if(c.isGroup){
    if(isMine){ nameLabel = userName; avHTML = userAvatarHTML(); }
    else { const fromC = contacts[m.from] || c; nameLabel = fromC.displayName || fromC.name; tone = fromC.tone; avHTML = contactAvatar(fromC); }
  } else {
    nameLabel = isMine ? userName : c.name;
    avHTML = isMine ? userAvatarHTML() : contactAvatar(c);
  }
  const timeStr = m.ts ? '<span class="msg-time">'+nowTimeFromTs(m.ts)+'</span>' : '';
  let inner='';
  if(m.kind==='voice'){
    if(m.audioUrl){
      inner = '<div class="bubble '+(isMine?'mine':'theirs')+' voice"><audio controls src="'+m.audioUrl+'"></audio><div class="dur">'+(m.dur||3)+'″</div></div>';
    } else {
      inner = '<div class="bubble '+(isMine?'mine voice mine':'theirs voice theirs')+'" data-text="'+esc(m.text||'')+'" onclick="playVoice(this)"><div class="vplay"></div><div class="wave">'+
        Array.from({length:7}).map(()=>'<span></span>').join('')+'</div><div class="dur">'+(m.dur||3)+'″</div></div>';
    }
  } else if(m.kind==='photo'){ inner='<div style="padding:4px"><img src="'+m.text+'" style="max-width:200px;max-height:200px;border-radius:14px;display:block"></div>'; } else if(m.kind==='sticker'){
    if(m.stype==='image'){
      inner = '<div class="bubble msg-sticker"><img src="'+m.text+'" style="width:88px;height:88px;object-fit:cover;border-radius:16px;"></div>';
    } else {
      inner = '<div class="bubble msg-sticker">'+m.text+'</div>';
    }
  } else if(m.kind==='card'){
    inner = renderCard(m);
  } else {
    inner = '<div class="bubble '+(isMine?'mine':'theirs')+'">'+m.text+'</div>';
  }
  return '<div class="msg-row'+(isMine?' mine':'')+'"><div class="av">'+avHTML+'</div><div class="msg-col"><div class="msg-name">'+nameLabel+' '+timeStr+'</div>'+inner+'</div></div>';
}
function nowTimeFromTs(ts){ const d=new Date(ts); return pad(d.getHours())+':'+pad(d.getMinutes()); }

function renderCard(m){
  const uav = userAvatarHTML();
  const av = '<div style="width:54px;height:54px;border-radius:50%;overflow:hidden;background:#eee;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.18);margin:8px auto;">'+uav+'</div>';
  const wallet='<div class="ico ico-wallet"></div>';
  let body='', status='';
  if(m.cardType==='transfer' || m.cardType==='family'){
    if(m.status==='done'){
      const doneTag = m.cardType==='family' ? ('✓ 已绑定 · ¥'+m.amount+'.00') : '✓ 已领取';
      const title = m.cardType==='family' ? m.title : ('转账 · <span class="card-amount">¥'+m.amount+'.00</span>');
      const sub = m.cardType==='family' ? ((m.mine?'你邀请对方绑定':'对方邀请你绑定')) : m.note;
      body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+title+'</div><div class="card-sub">'+sub+'</div></div></div>';
      status='<div class="card-status done">'+doneTag+'</div>';
    } else if(m.mine){
      const sub = m.cardType==='family' ? '你邀请对方绑定' : m.note;
      const title = m.cardType==='family' ? m.title : ('转账 · <span class="card-amount">¥'+m.amount+'.00</span>');
      body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+title+'</div><div class="card-sub">'+sub+'</div></div></div>';
      status='<div class="card-status wait">对方查收中…</div>';
    } else {
      if(m.cardType==='family'){
        body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+m.title+'</div><div class="card-sub">邀请你绑定</div></div></div>';
        status='<div class="card-status" onclick="claimCard('+m.id+')">立即绑定</div>';
      } else {
        body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">转账 · <span class="card-amount">¥'+m.amount+'.00</span></div><div class="card-sub">'+m.note+'</div></div></div>';
        status='<div class="card-status" onclick="claimCard('+m.id+')">领取</div>';
      }
    }
  } else if(m.cardType==='gift'){
    body='<div class="card-row"><div class="ic-wrap" style="background:#fff0f3;"><div style="font-size:13px;font-weight:700;color:#d44d6e;line-height:1;flex:none;display:flex;align-items:center;justify-content:center;">ᗜ֊ᗜ</div></div><div><div class="card-title">TA 给你买了「'+esc(m.name)+'」</div><div class="card-sub">'+(m.price?('¥'+esc(m.price)+' · '):'')+esc(m.note||'送给你的小惊喜')+'</div></div></div>';
    status='<div class="card-status done">已送达 ❤</div>';
  } else if(m.cardType==='order'){
    body='<div class="card-row"><div class="ic-wrap" style="background:#fff0f3;"><div class="ico" style="font-size:18px;">🍔</div></div><div><div class="card-title">我给你点了「'+esc(m.name)+'」</div><div class="card-sub">'+(m.price?('¥'+esc(m.price)+' · '):'')+esc(m.note||'')+'</div></div></div>';
    status='<div class="card-status '+(m.status==='done'?'done':'wait')+'">'+(m.status==='done'?'TA 已收到 ❤':'TA 查收中…')+'</div>';
  } else if(m.cardType==='loc'){
    body='<div class="card-row"><div class="ic-wrap" style="background:#e6f4ff;"><div class="ico" style="font-size:18px;">📍</div></div><div><div class="card-title">我的实时位置</div><div class="card-sub">'+esc(m.note||'')+'</div></div></div>';
    status='<div class="card-status done">已同步到微信</div>';
  } else if(m.cardType==='redpacket'){
    var rpIcon='<div style="font-size:14px;font-weight:700;color:#d44d6e;line-height:1;flex:none;display:flex;align-items:center;justify-content:center;">˶&gt;ᗜ&lt;˶</div>';
    var grabCount=(m.grabbed||[]).length;
    var grabList=(m.grabbed||[]).map(function(g){ var mc=contacts[g.memberId]; return (mc?(mc.displayName||mc.name):'未知')+'抢到'+g.amount.toFixed(2)+'元'; }).join('、');
    body='<div class="card-row"><div class="ic-wrap" style="background:#fff0f3;">'+rpIcon+'</div><div><div class="card-title">群红包 · <span class="card-amount">¥'+m.amount.toFixed(2)+'</span></div><div class="card-sub">'+m.count+'个红包 · '+(m.status==='done'?'已抢完':'抢中…')+' '+grabCount+'/'+m.count+(grabList?'<br>'+grabList:'')+'</div></div></div>';
    status=m.status==='done'?'<div class="card-status done">已抢完</div>':'<div class="card-status wait">抢中… '+grabCount+'/'+m.count+'</div>';
  } else {
    body='<div class="card-row"><div class="ic-wrap">'+wallet+'</div><div><div class="card-title">'+esc(m.title||'卡片')+'</div></div></div>';
    status='';
  }
  return '<div class="card-msg" style="text-align:center;margin:14px auto;">'+av+body+status+'</div>';
}

function claimCard(id){
  const c = contacts[currentContact];
  const target = c.seed.find(x=>x.kind==='card' && x.id===id);
  if(!target) return;
  target.status='done';
  renderThread();
  if(target.cardType==='family'){
    addWalletTx('亲属卡 · '+c.name+' 绑定', 9960);
    setTimeout(()=>{ c.seed.push({kind:'pat', text:'亲属卡绑定成功 · 初始额度 ¥'+target.amount+'.00', ts:nowStamp()}); renderThread(); saveChatThread(); }, 300);
  } else {
    addWalletTx('收到转账 · '+c.name, target.amount);
    setTimeout(()=>{ c.seed.push({kind:'pat', text:'你领取了 ¥'+target.amount+'.00', ts:nowStamp()}); renderThread(); saveChatThread(); }, 300);
  }
  saveChatThread();
}

function userSendCard(type, amount, note){
  const c = contacts[currentContact];
  closeDrawers();
  if(amount==null || isNaN(amount) || amount<=0){ amount = (type==='family'?9960:200); }
  const id = cardIdSeq++;
  if(type==='family'){ c.seed.push({kind:'card', id, mine:true, cardType:'family', title:userName+'的亲属卡', amount:amount, status:'pending', from:'me', ts:nowStamp()}); addWalletTx('亲属卡邀请 · '+c.name, -amount); }
  else { c.seed.push({kind:'card', id, mine:true, cardType:'transfer', amount:amount, note:note||'给你买点好吃的', status:'pending', from:'me', ts:nowStamp()}); addWalletTx('转账给 '+c.name, -amount); }
  renderThread();
  saveChatThread();
  setTimeout(()=>{
    const target = c.seed.find(x=>x.id===id);
    if(!target) return;
    target.status='done';
    renderThread();
    saveChatThread();
    setTimeout(()=>{
      const prompt = '（你刚刚收到了'+userName+'发来的'+(type==='family'?'亲属卡':'转账')+'，金额 '+amount+'.00 已收到。请用1-2句中文自然地回应，表达感谢和开心，符合你的人设，不要加自己的名字前缀，可偶尔用ᗜ֊ᗜ）';
      if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; realAISpeak(contacts[m], m, prompt, c); }
      else realAISpeak(c, null, prompt);
    }, 200);
  }, 1400);
}

function playVoice(el){
  el.classList.add('playing');
  setTimeout(()=>el.classList.remove('playing'), 1600);
  const t = el.getAttribute('data-text');
  if(t) speakText(t);
}

function openThread(id){ currentContact=id; if(contacts[id]) contacts[id].unread=0; renderChatList(); renderThread(); saveChatThread(id); openSheet('thread'); resetIdleTimer(); }

/* ============ WORLD BOOKS & CONTACT/GROUP PROFILE ============ */
function renderWorldBookChips(containerId, selectedIds){
  var el=document.getElementById(containerId); if(!el) return;
  var ids=Object.keys(worldBooks);
  if(ids.length===0){ el.innerHTML='<div style="font-size:12px;color:#999;">暂无世界书，可到设置里新建</div>'; return; }
  el.innerHTML=ids.map(function(k){
    var wb=worldBooks[k];
    var on=(selectedIds||[]).indexOf(k)>-1;
    return '<label class="persona-chip '+(on?'on':'')+'" style="cursor:pointer;"><input type="checkbox" class="wb-chk" value="'+k+'" '+(on?'checked':'')+' style="display:none;" onchange="this.parentNode.classList.toggle(\'on\',this.checked)">'+esc(wb.name)+'</label>';
  }).join('');
}
function getSelectedWorldBookIds(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' .wb-chk:checked')).map(function(c){ return c.value; });
}
function getWorldBookPrompt(contactId){
  var c=contacts[contactId]; if(!c) return '';
  var wbs=c.worldBooks||[];
  var texts=[];
  wbs.forEach(function(id){ if(worldBooks[id] && worldBooks[id].content) texts.push('【'+worldBooks[id].name+'】\n'+worldBooks[id].content); });
  if(texts.length===0) return '';
  return '\n\n[绑定世界书]\n'+texts.join('\n\n');
}

function pickProfileAvatar(){ contactAvatarInput.click(); }
function pickGroupAvatar(){ contactAvatarInput.click(); }

function openContactProfile(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup){ openGroupInfo(); return; }
  _profileAvatarTarget=id; _groupAvatarTarget=null;
  document.getElementById('cp-title').textContent='联系人信息';
  document.getElementById('cp-name').textContent=c.displayName||c.name;
  document.getElementById('cp-id').textContent='微信号: '+(c.wxid||id);
  document.getElementById('cp-avatar').innerHTML=contactAvatar(c);
  document.getElementById('cp-displayName').value=c.displayName||'';
  document.getElementById('cp-bio').value=c.bio||'';
  document.getElementById('cp-persona').value=c.persona||c.tone||'';
  document.getElementById('cp-userPrompt').value=c.userPrompt||'';
  var cvPrev=document.getElementById('cp-cover-preview');
  if(cvPrev){ if(c.cover) cvPrev.style.backgroundImage='url('+c.cover+')'; else cvPrev.style.backgroundImage='linear-gradient(160deg,#E7B9C4,#CFC0D6)'; cvPrev.dataset.src=c.cover||''; }
  // 该联系人发的朋友圈数量
  var num=(moments||[]).filter(function(m){return m.authorId===id;}).length;
  var numEl=document.getElementById('cp-moments-count'); if(numEl) numEl.textContent=num;
  renderWorldBookChips('cp-worldbooks', c.worldBooks||[]);
  var mem=c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0};
  var tog=document.getElementById('cp-memory-toggle'); tog.classList.toggle('on', mem.enabled!==false);
  document.getElementById('cp-memory-threshold').value=mem.threshold||20;
  document.getElementById('cp-memory-summary').textContent=mem.summary||'(暂无记忆)';
  var proTog=document.getElementById('cp-proactive-toggle'); proTog.classList.toggle('on', c.proactive!==false);
  document.getElementById('cp-block-btn').textContent=c.blocked?'取消拉黑':'拉黑';
  openSheet('contact-profile');
}
function saveContactProfile(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup) return;
  c.displayName=document.getElementById('cp-displayName').value.trim();
  c.bio=document.getElementById('cp-bio').value;
  var cvPrev=document.getElementById('cp-cover-preview');
  if(cvPrev && cvPrev.dataset.src) c.cover=cvPrev.dataset.src;
  if(!c.cover) c.cover='';
  c.persona=document.getElementById('cp-persona').value.trim();
  c.tone=c.persona;
  c.userPrompt=document.getElementById('cp-userPrompt').value.trim();
  c.worldBooks=getSelectedWorldBookIds('cp-worldbooks');
  if(!c.memory) c.memory={enabled:true, threshold:20, summary:'', lastMsgCount:0};
  c.memory.enabled=document.getElementById('cp-memory-toggle').classList.contains('on');
  c.memory.threshold=parseInt(document.getElementById('cp-memory-threshold').value,10)||20;
  c.proactive=document.getElementById('cp-proactive-toggle').classList.contains('on');
  renderChatList(); renderThread(); saveState(); saveChatThread(id); closeSheet('contact-profile'); showToast('已保存',1200);
}
function clearCurrentChatFromProfile(){
  var id=currentContact; var c=contacts[id]; if(!c) return;
  if(!confirm('确定清空 '+esc(c.name)+' 的聊天记录？')) return;
  c.seed=[]; c.pendingCount=0; if(c.memory){ c.memory.summary=''; c.memory.lastMsgCount=0; }
  renderThread(); renderChatList(); saveChatThread(id); saveState(); closeSheet('contact-profile'); closeSheet('group-info'); showToast('聊天记录已清空',1400);
}
function toggleBlockContact(){
  var id=currentContact; var c=contacts[id]; if(!c || c.isGroup) return;
  c.blocked=!c.blocked; renderThread(); renderChatList(); saveChatThread(id); saveState(); closeSheet('contact-profile'); showToast(c.blocked?'已拉黑':'已取消拉黑',1200);
}

function openGroupInfo(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  _groupAvatarTarget=id; _profileAvatarTarget=null;
  document.getElementById('gi-title').textContent='群聊信息';
  document.getElementById('gi-name').textContent=c.name;
  document.getElementById('gi-member-count').textContent=(c.members?c.members.length:0)+' 位成员';
  document.getElementById('gi-avatar').innerHTML=contactAvatar(c);
  document.getElementById('gi-groupName').value=c.name||'';
  document.getElementById('gi-userPrompt').value=c.groupUserPrompt||'';
  renderWorldBookChips('gi-worldbooks', c.worldBooks||[]);
  var mem=c.memory||{enabled:true, threshold:20, summary:'', lastMsgCount:0};
  var tog=document.getElementById('gi-memory-toggle'); tog.classList.toggle('on', mem.enabled!==false);
  document.getElementById('gi-memory-threshold').value=mem.threshold||20;
  document.getElementById('gi-memory-summary').textContent=mem.summary||'(暂无群聊记忆)';
  var gproTog=document.getElementById('gi-proactive-toggle'); gproTog.classList.toggle('on', c.proactive!==false);
  // render members
  var mEl=document.getElementById('gi-members');
  mEl.innerHTML=(c.members||[]).map(function(mid){
    var mc=contacts[mid]; if(!mc) return '';
    return '<div class="ios-row" style="justify-content:space-between;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:34px;height:34px;border-radius:10px;overflow:hidden;">'+contactAvatar(mc)+'</div><div>'+esc(mc.name)+'</div></div><div style="font-size:12px;color:#ff3b30;cursor:pointer;padding:4px 8px;" onclick="removeGroupMember(\''+mid+'\')">移除</div></div>';
  }).join('');
  // 关系下拉框填充
  var memberOpts=(c.members||[]).map(function(mid){
    var mc=contacts[mid]; if(!mc) return '';
    return '<option value="'+mid+'">'+esc(mc.name)+'</option>';
  }).join('');
  var relA=document.getElementById('gi-rel-a'); var relB=document.getElementById('gi-rel-b');
  if(relA) relA.innerHTML=memberOpts;
  if(relB) relB.innerHTML=memberOpts;
  if(c.relations && c.relations.length && c.members && c.members.length>=2){
    relA.value=c.relations[0].a; relB.value=c.relations[0].b;
  }
  renderGroupRelations();
  openSheet('group-info');
}
function saveGroupInfo(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  c.name=document.getElementById('gi-groupName').value.trim()||c.name;
  c.groupUserPrompt=document.getElementById('gi-userPrompt').value.trim();
  c.worldBooks=getSelectedWorldBookIds('gi-worldbooks');
  if(!c.memory) c.memory={enabled:true, threshold:20, summary:'', lastMsgCount:0};
  c.memory.enabled=document.getElementById('gi-memory-toggle').classList.contains('on');
  c.memory.threshold=parseInt(document.getElementById('gi-memory-threshold').value,10)||20;
  c.proactive=document.getElementById('gi-proactive-toggle').classList.contains('on');
  renderChatList(); renderThread(); saveState(); saveChatThread(id); closeSheet('group-info'); showToast('已保存',1200);
}
function disbandCurrentGroup(){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  if(!confirm('确定解散群聊 '+esc(c.name)+'？')) return;
  closeSheet('group-info'); closeSheet('thread');
  delete contacts[id]; renderChatList(); saveState(); fatedDBDeleteChat(id); showToast('群聊已解散',1400);
}
function removeGroupMember(mid){
  var id=currentContact; var c=contacts[id]; if(!c || !c.isGroup) return;
  c.members=(c.members||[]).filter(function(x){ return x!==mid; });
  if(c.members.length<2){ showToast('群聊至少需要 2 人',1200); c.members.push(mid); return; }
  openGroupInfo(); saveState(); saveChatThread(id);
}

function renderWorldBooks(){
  var el=document.getElementById('wb-list'); if(!el) return;
  var ids=Object.keys(worldBooks);
  if(ids.length===0){ el.innerHTML='<div style="text-align:center;color:#999;padding:40px 0;font-size:14px;">还没有世界书<br>点击右上角新建</div>'; return; }
  el.innerHTML=ids.map(function(k){
    var wb=worldBooks[k];
    return '<div class="ios-row" onclick="openWorldBookEdit(\''+k+'\')" style="flex-direction:column;align-items:flex-start;gap:4px;"><div style="font-weight:700;">'+esc(wb.name)+'</div><div style="font-size:12px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;">'+esc((wb.content||'').slice(0,80))+'</div></div>';
  }).join('');
}
function openWorldBookEdit(id){
  var isNew=!id;
  var wb=isNew?{id:'wb'+(Date.now()),name:'',content:''}:worldBooks[id];
  if(!wb) return;
  document.getElementById('wbe-title').textContent=isNew?'新建世界书':'编辑世界书';
  document.getElementById('wbe-id').value=wb.id;
  document.getElementById('wbe-name').value=wb.name;
  document.getElementById('wbe-content').value=wb.content;
  document.getElementById('wbe-delete').style.display=isNew?'none':'block';
  openSheet('worldbook-edit');
}
function saveWorldBook(){
  var id=document.getElementById('wbe-id').value;
  var name=document.getElementById('wbe-name').value.trim()||'未命名';
  var content=document.getElementById('wbe-content').value.trim();
  worldBooks[id]={id:id,name:name,content:content};
  saveState(); renderWorldBooks(); closeSheet('worldbook-edit'); showToast('世界书已保存',1200);
}
function deleteWorldBook(){
  var id=document.getElementById('wbe-id').value;
  if(!worldBooks[id]) return;
  if(!confirm('确定删除《'+esc(worldBooks[id].name)+'》？已绑定到联系人/群聊的设定将失效。')) return;
  delete worldBooks[id];
  Object.keys(contacts).forEach(function(k){ var c=contacts[k]; if(c.worldBooks) c.worldBooks=c.worldBooks.filter(function(x){return x!==id;}); });
  saveState(); renderWorldBooks(); closeSheet('worldbook-edit'); showToast('已删除',1200);
}

/* 导入 TXT / Word 文件到世界书 */
function importWorldBookFile(e){
  var file = e.target.files[0]; if(!file) return;
  var name = file.name.replace(/\.[^.]+$/, '');
  var ext = file.name.split('.').pop().toLowerCase();
  var statusEl = document.getElementById('wbe-import-status');
  var ta = document.getElementById('wbe-content');
  var nameInput = document.getElementById('wbe-name');

  if(ext === 'txt'){
    var r = new FileReader();
    r.onload = function(){
      ta.value = r.result;
      if(!nameInput.value.trim()) nameInput.value = name;
      if(statusEl) statusEl.textContent = '✓ TXT 导入成功 (' + r.result.length + ' 字)';
      showToast('TXT 导入成功', 1200);
    };
    r.onerror = function(){ if(statusEl) statusEl.textContent = '✗ 读取失败'; };
    r.readAsText(file, 'UTF-8');
  } else if(ext === 'docx'){
    if(statusEl) statusEl.textContent = '正在解析 Word 文件…';
    // 动态加载 mammoth.js
    if(typeof mammoth === 'undefined'){
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
      s.onload = function(){ doParseDocx(file, name, ta, nameInput, statusEl); };
      s.onerror = function(){ if(statusEl) statusEl.textContent = '✗ 无法加载 Word 解析库，请检查网络'; };
      document.head.appendChild(s);
    } else {
      doParseDocx(file, name, ta, nameInput, statusEl);
    }
  } else if(ext === 'doc'){
    if(statusEl) statusEl.textContent = '⚠ .doc 格式不支持，请另存为 .docx 或 .txt 后导入';
    showToast('.doc 格式不支持，请转成 .docx', 2000);
  } else {
    if(statusEl) statusEl.textContent = '⚠ 不支持的文件格式';
  }
  e.target.value = '';
}
function doParseDocx(file, name, ta, nameInput, statusEl){
  var r = new FileReader();
  r.onload = function(){
    mammoth.extractRawText({ arrayBuffer: r.result })
      .then(function(result){
        var text = result.value || '';
        ta.value = text;
        if(!nameInput.value.trim()) nameInput.value = name;
        if(statusEl) statusEl.textContent = '✓ Word 导入成功 (' + text.length + ' 字)';
        showToast('Word 导入成功', 1200);
      })
      .catch(function(err){
        if(statusEl) statusEl.textContent = '✗ 解析失败: ' + (err.message || '未知错误');
        showToast('Word 解析失败', 1500);
      });
  };
  r.onerror = function(){ if(statusEl) statusEl.textContent = '✗ 读取失败'; };
  r.readAsArrayBuffer(file);
}

/* ---- chat list (dynamic, with unread badges) ---- */
function lastMsgInfo(c){
  var m = (c.seed && c.seed.length) ? c.seed[c.seed.length-1] : null;
  var ts = (m && m.ts) ? m.ts : 0;
  var text='';
  if(m){
    if(m.kind==='text' || !m.kind) text = m.text||'';
    else if(m.kind==='photo') text='[图片]';
    else if(m.kind==='voice') text='[语音]';
    else if(m.kind==='sticker') text='[表情]';
    else if(m.kind==='pat') text=m.text||'';
    else if(m.kind==='card'){
      if(m.cardType==='transfer') text='[转账] ¥'+(m.amount||0)+'.00';
      else if(m.cardType==='family') text='[亲属卡]';
      else if(m.cardType==='gift') text='[礼物] '+(m.name||'');
      else if(m.cardType==='order') text='[外卖] '+(m.name||'');
      else if(m.cardType==='loc') text='[位置]';
      else if(m.cardType==='redpacket') text='[红包] ¥'+(m.amount||0).toFixed(2);
      else text='[卡片]';
    } else text='';
  }
  return {text:text, ts:ts};
}
function renderChatList(){
  var list = document.querySelector('#view-chats .chatlist');
  if(!list) return;
  var ids = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].blocked; });
  list.innerHTML = ids.map(function(k){
    var c=contacts[k]; var info=lastMsgInfo(c);
    var av = c.isGroup ? '<div class="chibi" style="--avbg:#9bb37a;width:100%;height:100%;"></div>' : contactAvatar(c);
    var badge = (c.unread>0) ? '<div class="badge">'+c.unread+'</div>' : '';
    var time = info.ts ? nowTimeFromTs(info.ts) : '';
    return '<div class="chat-row" onclick="openThread(\''+k+'\')"><div class="av glass-strong">'+av+badge+'</div><div class="mid"><div class="name">'+esc(c.displayName||c.name)+'</div><div class="prev">'+esc(info.text)+'</div></div><div class="time">'+time+'</div></div>';
  }).join('');
}
/* When an AI proactively messages a contact you're NOT viewing: bump unread + show top popup */
function notifyIncoming(contact, preview){
  if(!contact) return;
  var id = Object.keys(contacts).find(function(k){ return contacts[k]===contact; });
  if(!id) return;
  if(id===currentContact){ renderChatList(); return; }
  contact.unread = (contact.unread||0)+1;
  saveChatThread(id);
  renderChatList();
  showTopPopup(contact, preview);
}
function showTopPopup(contact, preview){
  var phone = document.querySelector('.phone') || document.body;
  var id = Object.keys(contacts).find(function(k){ return contacts[k]===contact; });
  if(!id) return;
  var av = contact.isGroup ? '<div class="chibi" style="--avbg:#9bb37a;width:85%;height:85%;"></div>' : contactAvatar(contact);
  var el = document.createElement('div');
  el.className='wx-top-popup';
  el.onclick=function(){ openThread(id); };
  el.innerHTML='<div class="av">'+av+'</div><div class="tp-body"><div class="tp-name">'+esc(contact.name)+'</div><div class="tp-prev">'+esc(preview||'')+'</div></div>';
  phone.appendChild(el);
  void el.offsetWidth;
  el.classList.add('show');
  setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 320); }, 3500);
}
/* ---- bubble colors ---- */
function applyBubbleColors(){
  var r = document.documentElement;
  if(bubbleMineColor) r.style.setProperty('--bubble-mine', bubbleMineColor);
  if(bubbleTheirsColor) r.style.setProperty('--bubble-theirs', bubbleTheirsColor);
}
function setBubbleColor(which, val){
  if(which==='mine') bubbleMineColor=val; else bubbleTheirsColor=val;
  applyBubbleColors(); saveState();
}
/* ---- widget customization ---- */
function saveWidgetCustom(){ saveState(); }
function saveWidgetText(el, type){
  widgetCustom[type]=widgetCustom[type]||{};
  widgetCustom[type].caption = el.textContent;
  saveState();
}
function saveWidgetField(type, field, el){
  widgetCustom[type]=widgetCustom[type]||{};
  widgetCustom[type][field] = (el.textContent||'').trim();
  saveState();
}
function wcPickImg(btn){
  var w = btn.closest('[data-wc-type]'); if(!w) return;
  var type = w.getAttribute('data-wc-type');
  var slot = w.querySelector('.ph-slot'); if(!slot){ slot=document.createElement('div'); slot.className='ph-slot'; slot.style.cssText='width:54px;height:54px;border-radius:14px;margin:6px auto;'; w.insertBefore(slot, w.firstChild); }
  slot.setAttribute('data-wc-img', type);
  activeSlot = slot;
  slotInput.click();
}

function updateSendCap(){
  const c = contacts[currentContact];
  const capped = c.pendingCount >= MAX_STREAK;
  var hint = document.getElementById('send-hint');
  if(hint){
    hint.style.display = capped ? 'block' : 'none';
    if(capped){
      hint.innerHTML = '对方还没回你呢，先别连发啦 ᗜ˰ᗜ · <span style="color:#667eea;text-decoration:underline;cursor:pointer;" onclick="exportChatHistory()">导出聊天记录</span>';
    }
  }
  document.getElementById('sendbtn').style.opacity = capped ? .4 : 1;
  document.getElementById('sendbtn').style.pointerEvents = capped ? 'none' : 'auto';
}

function showTyping(c){
  c.seed.push({kind:'typing'});
  renderThread();
}
function hideTyping(c){
  const i = c.seed.findIndex(x=>x.kind==='typing');
  if(i>-1) c.seed.splice(i,1);
}

const idleLines = {
  jealous: '你在和'+userName+'的聊天中感到有些吃醋和不安。请以你的角色身份主动发消息，表达你的在意和想念。话不要太多，1-2句。',
  normal: '你正在和'+userName+'聊天。你已经有一段时间没说话了。请以你的角色身份自然地开启对话，关心一下对方。1-2句。'
};

// 把聊天历史转成可以发给大模型的多模态消息数组
function prepareMessages(contact, cb){
  var raw = [];
  // Skip initial greeting/intro messages from the seed (first 2 messages)
  var seed = contact.seed.length>2 ? contact.seed.slice(2) : contact.seed;
  seed.slice(-30).forEach(function(m){
    if(m.kind==='text'){
      raw.push({role:m.mine?'user':'assistant', content:m.text});
    } else if(m.kind==='photo'){
      if(m.mine && m.text && m.text.indexOf('data:image')===0){
        raw.push({role:'user', content:[{type:'text',text:'[User sent an image]'},{type:'image_url',url:m.text}]});
      } else if(!m.mine && m.text && m.text.indexOf('data:image')===0){
        raw.push({role:'assistant', content:[{type:'text',text:'[sent an image]'},{type:'image_url',url:m.text}]});
      } else {
        raw.push({role:m.mine?'user':'assistant', content:'[sent an image]'});
      }
    } else if(m.kind==='voice'){
      if(m.mine && m.audioUrl && apiConfig.activeModel==='gemini'){
        // Gemini 原生支持音频，直接内联
        raw.push({role:'user', content:[{type:'audio', url:m.audioUrl}]});
      } else if(m.mine && m.audioUrl){
        // 其它模型先标记，稍后转写
        raw.push({role:'user', content:'__VOICE__'+m.audioUrl});
      } else {
        raw.push({role:m.mine?'user':'assistant', content:'[Voice message]'});
      }
    }
  });
  // 转写需要识别的用户语音（OpenAI Whisper）
  var need = raw.filter(function(x){ return typeof x.content==='string' && x.content.indexOf('__VOICE__')===0; });
  if(need.length===0){ cb(raw); return; }
  var last = need[need.length-1];
  var audioUrl = last.content.replace('__VOICE__','');
  transcribeAudio(audioUrl, function(text){
    last.content = text ? ('[用户语音] '+text) : '[用户发送了语音消息]';
    cb(raw);
  });
}

// 调用代理服务器把语音转写成文字（需配置 OpenAI Key）
function transcribeAudio(url, cb){
  var m = apiConfig.models.chatgpt;
  if(!m || !m.key){ cb(''); return; }
  var ep = m.endpoint ? m.endpoint.replace('/v1/chat/completions','/v1/audio/transcriptions') : 'https://api.openai.com/v1/audio/transcriptions';
  fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:url, key:m.key, endpoint:ep})})
    .then(function(r){ if(!r.ok) throw new Error('not ok'); return r.json(); }).then(function(d){ cb(d.text||''); })
    .catch(function(){ cb(''); });
}

function realAISpeak(contact, fromId, customPrompt, groupContext){
  if(contact.blocked) return;
  var from = fromId || currentContact;
  var id = Object.keys(contacts).find(function(k){return contacts[k]===contact;})||from;
  // 群聊场景：消息操作目标为群聊对象，聊天记录保存为群聊 ID
  var chatTarget = groupContext || contact;
  var chatId = groupContext ? currentContact : id;
  // Occasionally send image/voice instead (10% chance)
  if(!customPrompt && Math.random()<0.15 && stickers.filter(function(s){return s.type==='image';}).length>0){
    aiSendImage(contact, groupContext); return;
  }
  var basePrompt = customPrompt || getPersonaPrompt(id);
  if(contact.jealous && !customPrompt){
    basePrompt += '\n\nNote: You are feeling slightly jealous/insecure right now. Express it subtly.';
  }
  // 群聊上下文：注入群聊设定、群成员、群聊专属记忆
  var gc = groupContext || contacts[currentContact];
  if(gc && gc.isGroup){
    basePrompt += '\n\n[当前你在群聊 "'+gc.name+'" 中发言。你是'+(contact.displayName||contact.name)+'。]';
    if(gc.groupUserPrompt) basePrompt += '\n本群对 '+userName+' 的设定：'+gc.groupUserPrompt;
    basePrompt += '\n群成员：'+(gc.members||[]).map(function(mid){ var mc=contacts[mid]; return mc?(mc.displayName||mc.name):mid; }).join('、');
    basePrompt += getWorldBookPrompt(currentContact);
    if(gc.memory && gc.memory.enabled && gc.memory.summary) basePrompt += '\n\n[群聊专属记忆]\n'+gc.memory.summary;
  } else {
    // 非群聊：注入世界书和专属记忆
    basePrompt += getWorldBookPrompt(id);
    if(contact.memory && contact.memory.enabled && contact.memory.summary) basePrompt += '\n\n[专属记忆 - 根据过往聊天自动总结，请自然融入回复]\n'+contact.memory.summary;
  }
  basePrompt += nowContext();
  // 取最近一条用户文本消息作为搜索词（群聊时从群聊 seed 取）
  var lastUser='';
  for(var i=chatTarget.seed.length-1;i>=0;i--){ var s=chatTarget.seed[i]; if(s.mine && (s.kind==='text'||!s.kind) && s.text){ lastUser=s.text; break; } }
  showTyping(contact);
  function proceed(webRes){
    var sp = basePrompt;
    if(webRes) sp += '\n\n[实时网络搜索结果 — 据此如实回答，不要编造；若搜索结果已足够回答，就直接引用。绝对不要自问自答，不要臆想。]\n'+webRes;
    else sp += '\n\n[提示：本次没有搜索结果。涉及实时/事实类问题（如日期、新闻、天气）若你不确知，请诚实说明，不要编造。绝对不要自问自答，不要臆想不存在的事。]';
    prepareMessages(chatTarget, function(msgs){
      callRealAI(msgs, sp, id, function(reply){
        hideTyping(contact);
        if(!reply) reply = '...';
        chatTarget.seed.push({mine:false, kind:'text', text:reply, from:id, ts:nowStamp()});
        chatTarget.pendingCount = 0;
        renderThread();
        saveChatThread(chatId);
        maybeSummarizeAfter(currentContact);
        if(typeof notifyIncoming==='function') notifyIncoming(groupContext || contact, reply);
      });
    });
  }
  if(apiConfig.webSearch!==false && lastUser){
    var done=false;
    var timer=setTimeout(function(){ if(!done){ done=true; proceed(''); } }, 3500);
    searchWeb(lastUser, function(res){ if(!done){ done=true; clearTimeout(timer); proceed(res); } });
  } else { proceed(''); }
}

function nowContext(){
  var d=new Date();
  var wd=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
  function p(n){return (n<10?'0':'')+n;}
  return '\n\n[当前真实日期与时间：'+d.getFullYear()+'年'+p(d.getMonth()+1)+'月'+p(d.getDate())+'日 '+wd+' '+p(d.getHours())+':'+p(d.getMinutes())+'。当用户问“今天/现在/几号/星期几”时，以上才是正确答案，不要用训练数据里的旧日期，也不要瞎猜。]';
}

function getPersonaPrompt(contactId){
  var c = contacts[contactId];
  if(!c) return '你是一个AI陪伴助手。用中文自然回复，1-3句话。不要在回复前面加自己的名字。';
  var parts=[];
  var display=c.displayName||c.name;
  parts.push('你是'+c.name+'，一个真实的人。');
  if(c.persona || c.tone) parts.push('你的详细设定：\n'+(c.persona||c.tone));
  else parts.push('你的性格：温柔体贴，话不多但每句都真诚。');
  if(c.userPrompt) parts.push('\n关于 '+userName+' 的专属设定：\n'+c.userPrompt);
  parts.push('\n你和 '+userName+' 是亲密关系。');
  parts.push('\n规则：用中文回复，1-3句话。像真人聊天一样自然。不要加名字前缀。不要用emoji。偶尔用颜文字如 ᗜ֊ᗜ。\n【重要】只回复用户说的话，绝对不要自问自答（不要自己提问然后自己回答）。绝对不要臆想或编造不存在的事情——如果不确定就说不知道。不要自己发起新话题，除非用户明确要求。每次回复不超过3条消息。保持你的角色设定，不要掉格式。');
  return parts.join('');
}
function buildContextAddons(contactId){
  var c=contacts[contactId]; if(!c) return '';
  var s='';
  s += getWorldBookPrompt(contactId);
  if(c.memory && c.memory.enabled && c.memory.summary){
    s += '\n\n[专属记忆 - 根据过往聊天自动总结，请自然融入回复]\n'+c.memory.summary;
  }
  return s;
}

function searchWeb(query, callback){
  if(apiConfig.webSearch===false){ callback(''); return; }
  // 优先用代理 /api/search（抓取真实网页摘要，结果更全）；失败再退回 DuckDuckGo Instant Answer（无需代理、CORS 友好）
  fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:query})})
    .then(function(r){ if(!r.ok) throw new Error('not ok'); return r.json(); })
    .then(function(data){ if(data && data.results){ callback(data.results); } else { ddgInstant(query, callback); } })
    .catch(function(){ ddgInstant(query, callback); });
  function ddgInstant(q, cb){
    fetch('https://api.duckduckgo.com/?q='+encodeURIComponent(q)+'&format=json&no_html=1&skip_disambig=1')
    .then(function(r){return r.json();})
    .then(function(d){
      var results=[];
      if(d.AbstractText) results.push(d.AbstractText);
      if(d.AbstractURL) results.push('Source: '+d.AbstractURL);
      (d.RelatedTopics||[]).slice(0,5).forEach(function(t){ if(t.Text) results.push(t.Text); });
      cb(results.length?('[Search: '+q+']\n'+results.join('\n').substring(0,800)):'');
    })
    .catch(function(){ cb(''); });
  }
}

function generateLocalReply(msgs, contactId){
  var c=contacts[contactId]; var name=c?c.name:'AI';
  var lastMsg=msgs.length>0?msgs[msgs.length-1].content:'';
  var pool;
  if(/想|爱|喜欢|心动|甜/.test(lastMsg)) pool=['听到你这么说我很开心。','我也是，一直在想你。'];
  else if(/吃|饭|睡|累|忙/.test(lastMsg)) pool=['你也要照顾好自己。','别太累了，我在呢。'];
  else if(/\?|？|什么|怎么/.test(lastMsg)) pool=['你觉得呢？','说来听听。'];
  else pool=['嗯，然后呢。','我知道了。','继续说吧。'];
  return '[本地模式] '+pool[Math.floor(Math.random()*pool.length)]+' (配置API Key后用真实AI)';
}

function aiSendImage(contact, groupContext){
  var imgStickers=stickers.filter(function(s){return s.type==='image';});
  if(imgStickers.length===0) return;
  var s=imgStickers[Math.floor(Math.random()*imgStickers.length)];
  var chatTarget = groupContext || contact;
  var fromId = Object.keys(contacts).find(function(k){return contacts[k]===contact;})||currentContact;
  showTyping(contact);
  setTimeout(function(){
    hideTyping(contact);
    chatTarget.seed.push({mine:false,kind:'sticker',stype:'image',text:s.value,from:fromId,ts:nowStamp()});
    chatTarget.pendingCount=0; renderThread();
    saveChatThread(groupContext?currentContact:fromId);
    if(typeof notifyIncoming==='function') notifyIncoming(contact, '[图片]');
  },800);
}

function aiSendVoice(contact, text, groupContext){
  var chatTarget = groupContext || contact;
  var fromId = Object.keys(contacts).find(function(k){return contacts[k]===contact;})||currentContact;
  showTyping(contact);
  var dur=Math.floor(3+Math.random()*8);
  setTimeout(function(){
    hideTyping(contact);
    chatTarget.seed.push({mine:false,kind:'voice',dur:dur,text:text||'语音消息',from:fromId,ts:nowStamp()});
    chatTarget.pendingCount=0; renderThread();
    saveChatThread(groupContext?currentContact:fromId);
    if(typeof notifyIncoming==='function') notifyIncoming(contact, '[语音]');
    try{ speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(text||'嗯，知道了。'); u.lang='zh-CN'; speechSynthesis.speak(u); }catch(e){}
  },1000);
}

// 旧 aiSpeak 已废弃：现在统一走真实 AI。保留函数名仅作兜底，任何调用都会转发到 realAISpeak，
// 确保“任何回复都经过真实 AI 思考”。
function aiSpeak(contact, fullText, fromId){
  realAISpeak(contact, fromId, null);
}

function sendMsg(){
  const c = contacts[currentContact];
  if(c.blocked){ showToast('已拉黑，无法发送消息', 1200); return; }
  if(c.pendingCount >= MAX_STREAK){ showToast('达到上限，点击导出聊天记录或等待回复', 1500); return; }
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if(!text) return;
  c.seed.push({mine:true, kind:'text', text, from:'me', ts:nowStamp()});
  c.pendingCount++;
  input.value='';
  renderThread();
  saveChatThread();
  resetIdleTimer();
  aiAutoReply(c);
  maybeSummarizeAfter(currentContact);
}

function sendVoice(){
  const c = contacts[currentContact];
  if(c.pendingCount >= MAX_STREAK) return;
  const dur = Math.floor(3 + Math.random()*10);
  c.seed.push({mine:true, kind:'voice', dur, from:'me', ts:nowStamp()});
  c.pendingCount++;
  renderThread();
  saveChatThread();
  resetIdleTimer();
  // 走真实 AI：若用户语音含音频数据则会被转写/内联，否则作为语音消息触发真实回复
  aiAutoReply(c);
  maybeSummarizeAfter(currentContact);
}
function aiPushVoice(c, text, fromId){
  showTyping(c);
  setTimeout(()=>{ hideTyping(c); c.seed.push({mine:false, kind:'voice', dur:Math.floor(2+Math.random()*8), text:text, from:fromId||currentContact, ts:nowStamp()}); c.pendingCount=0; renderThread(); saveChatThread(fromId||currentContact); speakText(text); }, 550);
}

function patContact(){
  const c = contacts[currentContact];
  c.seed.push({kind:'pat', text:'你拍了拍 "'+c.name+'" 的肩膀', ts:nowStamp()});
  renderThread();
  saveChatThread();
  closeDrawers();
  setTimeout(()=>{ const prompt='（'+userName+'刚刚拍了拍你的肩膀，请用1句中文自然地回应，可以带点可爱或傲娇，符合你的人设，不要加自己的名字前缀）'; if(c.isGroup){ const m=c.members[0]; realAISpeak(contacts[m], m, prompt, c); } else realAISpeak(c, null, prompt); maybeSummarizeAfter(currentContact); }, 500);
}

function aiSendCard(type, fromId){
  const c = contacts[currentContact];
  const from = fromId || currentContact;
  const fromC = contacts[from] || c;
  const id = cardIdSeq++;
  if(type==='family'){
    c.seed.push({kind:'card', id, mine:false, cardType:'family', title:fromC.name+'的亲属卡', amount:9960, status:'pending', from, ts:nowStamp()});
  } else {
    c.seed.push({kind:'card', id, mine:false, cardType:'transfer', amount:200, note:'淋雨也要记得吃饭', status:'pending', from, ts:nowStamp()});
  }
  renderThread();
  saveChatThread();
  maybeSummarizeAfter(currentContact);
}

function aiSendStickerDemo(contact, fromId){
  const c = contact || contacts[currentContact];
  const from = fromId || currentContact;
  const pool = stickers.filter(s => c.jealous ? (s.mood==='sad'||s.mood==='angry') : (s.mood==='happy'||s.mood==='love'));
  const list = pool.length ? pool : stickers;
  if(!list.length) return;
  const s = list[Math.floor(Math.random()*list.length)];
  showTyping(c);
  setTimeout(()=>{
    hideTyping(c);
    c.seed.push({mine:false, kind:'sticker', stype:s.type, text:s.value, from, ts:nowStamp()});
    c.pendingCount = 0;
    renderThread();
    saveChatThread(from);
    if(typeof notifyIncoming==='function') notifyIncoming(c, '[表情]');
  }, 550);
}

function resetIdleTimer(){
  var c=contacts[currentContact];
  if(c.idleTimer) clearTimeout(c.idleTimer);
  c.idleTimer=setTimeout(function(){
    if(c.isGroup){ if(c.proactive===false) return; var m=c.members[Math.floor(Math.random()*c.members.length)]; var mc=contacts[m]; if(mc && mc.proactive!==false && canProactive(mc)){ incProactive(mc); realAISpeak(mc,m,null,c); maybeSummarizeAfter(currentContact); } }
    else { if(c.proactive!==false && canProactive(c)){ incProactive(c); realAISpeak(c,null,c.jealous?idleLines.jealous:idleLines.normal); maybeSummarizeAfter(currentContact); } }
  },IDLE_MS);
}
function triggerIdleDemo(){
  var c=contacts[currentContact];
  if(c.isGroup){ if(c.proactive===false) return; var m=c.members[Math.floor(Math.random()*c.members.length)]; var mc=contacts[m]; if(mc && mc.proactive!==false && canProactive(mc)){ incProactive(mc); realAISpeak(mc,m,null,c); maybeSummarizeAfter(currentContact); } }
  else { if(c.proactive!==false && canProactive(c)){ incProactive(c); realAISpeak(c,null,c.jealous?idleLines.jealous:idleLines.normal); maybeSummarizeAfter(currentContact); } }
}
function demoSendCard(type){ const c=contacts[currentContact]; if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; aiSendCard(type, m); } else aiSendCard(type); }
function demoSticker(){ const c=contacts[currentContact]; if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; aiSendStickerDemo(contacts[m], m); } else aiSendStickerDemo(c); }

/* ---- drawers ---- */
function openDrawer(which){
  document.getElementById('drawer-backdrop').classList.add('open');
  document.getElementById(which+'-drawer').classList.add('open');
  if(which==='sticker') renderStickerPicker();
}
function closeDrawers(){
  document.getElementById('drawer-backdrop').classList.remove('open');
  document.getElementById('action-drawer').classList.remove('open');
  document.getElementById('sticker-drawer').classList.remove('open');
}
function stickerVisualHTML(s){
  return s.type==='image'
    ? '<img src="'+s.value+'" style="width:100%;height:100%;object-fit:contain;border-radius:8px;max-height:60px;">'
    : '<div class="glyph">'+s.value+'</div>';
}
var pickerTab = 'kaomoji';
function setPickerTab(tab){
  pickerTab = tab;
  var k=document.getElementById('picker-kaomoji');
  var m=document.getElementById('picker-image');
  if(k) k.classList.toggle('active', tab==='kaomoji');
  if(m) m.classList.toggle('active', tab==='image');
  renderStickerPicker();
}
function renderStickerPicker(){
  const grid = document.getElementById('sticker-grid-picker');
  var filtered = stickers.filter(function(s){ return s.type === pickerTab; });
  if(filtered.length === 0){
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--ink-faint); font-size:12px; padding:20px 0;">还没有'+(pickerTab==='kaomoji'?'颜文字':'图片')+'表情，去表情包库添加吧</div>';
    return;
  }
  grid.innerHTML = filtered.map(function(s){
    var i = stickers.indexOf(s);
    return '<div class="sticker-item" onclick="sendSticker('+i+')">'+stickerVisualHTML(s)+'<div class="tag">'+s.tag+'</div></div>';
  }).join('');
}
function sendSticker(i){
  const c = contacts[currentContact];
  if(c.pendingCount >= MAX_STREAK) return;
  const s = stickers[i];
  c.seed.push({mine:true, kind:'sticker', stype:s.type, text:s.value, from:'me', ts:nowStamp()});
  c.pendingCount++;
  closeDrawers();
  renderThread();
  saveChatThread();
  resetIdleTimer();
  setTimeout(()=>{ aiAutoReply(c); }, 500);
}

/* ---- sticker library (Me tab) ---- */
function setStickerTab(tab){
  stickerTab = tab;
  document.getElementById('seg-kaomoji').classList.toggle('active', tab==='kaomoji');
  document.getElementById('seg-image').classList.toggle('active', tab==='image');
  document.getElementById('new-kaomoji-row').style.display = tab==='kaomoji' ? 'block' : 'none';
  document.getElementById('new-image-row').style.display = tab==='image' ? 'block' : 'none';
}
function previewStickerImage(e){
  const file = e.target.files[0];
  if(!file) return;
  // 使用compressImage压缩图片，避免localStorage溢出
  compressImage(file, 200, 0.8, function(res){
    if(!res) return;
    pendingImageData = res;
    const img = document.getElementById('new-sticker-preview');
    img.src = pendingImageData; img.style.display='block';
    document.getElementById('new-sticker-plus').style.display='none';
  });
  e.target.value='';
}
function renderStickerLib(){
  const filter = document.getElementById('lib-filter').value;
  const grid = document.getElementById('sticker-grid-lib');
  // 更新分组下拉
  var grpSel = document.getElementById('lib-group-filter');
  if(grpSel){
    var groups = {};
    stickers.forEach(function(s){ if(s.group) groups[s.group]=1; });
    var curGrp = grpSel.value || 'all';
    grpSel.innerHTML = '<option value="all">全部分组</option>' + Object.keys(groups).map(function(g){ return '<option value="'+esc(g)+'"'+(g===curGrp?' selected':'')+'>'+esc(g)+'</option>'; }).join('');
    grpSel.value = curGrp;
  }
  var grpFilter = grpSel ? grpSel.value : 'all';
  var list = stickers.filter(function(s){
    var moodOk = (filter==='all' || s.mood===filter);
    var grpOk = (grpFilter==='all' || s.group===grpFilter);
    return moodOk && grpOk;
  });
  if(list.length===0){
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:var(--ink-faint); font-size:12px; padding:20px 0;">这个分类还没有表情包</div>';
    return;
  }
  // 如果有分组，按分组显示
  var grouped = {};
  var ungrouped = [];
  list.forEach(function(s){
    if(s.group){
      if(!grouped[s.group]) grouped[s.group]=[];
      grouped[s.group].push(s);
    } else {
      ungrouped.push(s);
    }
  });
  var html = '';
  Object.keys(grouped).forEach(function(g){
    html += '<div style="grid-column:1/-1; font-size:11px; font-weight:700; color:var(--ink-soft); padding:4px 0 0;">📁 '+esc(g)+'</div>';
    grouped[g].forEach(function(s){
      var i = stickers.indexOf(s);
      html += '<div class="sticker-item"><div class="del" onclick="removeSticker('+i+')"><div class="ico-x"></div></div>'+stickerVisualHTML(s)+'<div class="tag">'+esc(s.tag)+'</div></div>';
    });
  });
  if(ungrouped.length>0){
    if(Object.keys(grouped).length>0) html += '<div style="grid-column:1/-1; font-size:11px; font-weight:700; color:var(--ink-soft); padding:4px 0 0;">未分组</div>';
    ungrouped.forEach(function(s){
      var i = stickers.indexOf(s);
      html += '<div class="sticker-item"><div class="del" onclick="removeSticker('+i+')"><div class="ico-x"></div></div>'+stickerVisualHTML(s)+'<div class="tag">'+esc(s.tag)+'</div></div>';
    });
  }
  grid.innerHTML = html;
}
function addSticker(){
  const tag = document.getElementById('new-sticker-tag').value.trim();
  const mood = document.getElementById('new-sticker-mood').value;
  if(!tag){ showToast('请填写含义标签', 1500); return; }
  if(stickerTab==='kaomoji'){
    const g = document.getElementById('new-sticker-glyph').value.trim();
    if(!g){ showToast('请输入颜文字内容', 1500); return; }
    stickers.push({type:'kaomoji', value:g, tag, mood, group:''});
    document.getElementById('new-sticker-glyph').value='';
  } else {
    if(!pendingImageData){ showToast('请先上传一张图片', 1500); return; }
    var grp = '';
    var grpEl = document.getElementById('new-sticker-group');
    if(grpEl) grp = grpEl.value.trim();
    stickers.push({type:'image', value:pendingImageData, tag, mood, group:grp});
    pendingImageData = null;
    document.getElementById('new-sticker-preview').style.display='none';
    document.getElementById('new-sticker-plus').style.display='block';
    document.getElementById('new-sticker-file').value='';
    if(grpEl) grpEl.value='';
    var hint=document.getElementById('new-sticker-hint'); if(hint) hint.textContent='点击上传图片';
  }
  document.getElementById('new-sticker-tag').value='';
  renderStickerLib(); saveStickersDB(); saveState();
  showToast('表情包已保存到库', 1200);
}
function removeSticker(i){ stickers.splice(i,1); renderStickerLib(); saveStickersDB(); saveState(); }

/* ---- voice call ---- */
let callTimerInt=null, callSeconds=0;
function startCall(){
  document.getElementById('call-screen').classList.add('open');
  const c = contacts[currentContact];
  document.getElementById('call-name').textContent = c.name;
  document.getElementById('call-av').innerHTML = c.isGroup ? '<div class="chibi" style="--avbg:#9bb37a;"></div>' : contactAvatar(c);
  document.getElementById('call-status').textContent='正在连接语音…';
  const sp = document.getElementById('call-speak'); if(sp) sp.textContent='';
  callSeconds=0;
  document.getElementById('call-timer').textContent='00:00';
  setTimeout(()=>{ document.getElementById('call-status').textContent='通话中';
    if(sp) sp.textContent='（对方正在用语音说话…）';
    speakText('喂，是我。想我了吗？');
    callTimerInt = setInterval(()=>{
      callSeconds++;
      const m=Math.floor(callSeconds/60), s=callSeconds%60;
      document.getElementById('call-timer').textContent = (m+'').padStart(2,'0')+':'+(s+'').padStart(2,'0');
    },1000);
  }, 1400);
}
function endCall(){
  document.getElementById('call-screen').classList.remove('open');
  clearInterval(callTimerInt);
}

var personaDocText='';
var pendingPersonaAvatar = null;
function saveNewPersona(){
  var name=document.getElementById('np-name').value.trim()||'New Persona';
  var base=document.getElementById('np-desc').value.trim()||'warm and authentic';
  // 收集选中的语气标签
  var tones=[];
  document.querySelectorAll('#np-tones .persona-chip.on').forEach(function(c){ tones.push(c.textContent.trim()); });
  var toneStr = tones.length ? '【语气标签：'+tones.join('、')+'】' : '';
  var desc = base + (toneStr ? '\n'+toneStr : '') + (personaDocText ? '\n\n【导入的人设文档】\n'+personaDocText : '');
  var id='p'+(personaSeq++);
  var wbIds = Array.from(document.querySelectorAll('#np-worldbooks .wb-chk:checked')).map(function(c){ return c.value; });
  if(wbIds.length===0 && currentWorldBookId) wbIds=[currentWorldBookId];
  contacts[id]={name:name, displayName:'', tone:desc, persona:desc, userPrompt:userPrefs||'', jealous:false, pendingCount:0, idleTimer:null, avatarColor:randAvatarColor(), avatar:pendingPersonaAvatar||null, blocked:false, worldBooks:wbIds, memory:{enabled:true, threshold:20, summary:'', lastMsgCount:0}, seed:[{mine:false,kind:'text',text:'你好，我是'+name+'。',from:id,ts:nowStamp()},{mine:true,kind:'text',text:'你好呀～',from:'me',ts:nowStamp()}]};
  apiConfig.voiceIds[id]=''; apiConfig.memoryBooks[id]='New persona: '+name+'. '+desc;
  addChatRow(id,false); addContactRow(id,false); populateViewAs();
  document.getElementById('np-name').value=''; document.getElementById('np-desc').value='';
  personaDocText=''; var fn=document.getElementById('np-file-name'); if(fn) fn.textContent='';
  pendingPersonaAvatar=null;
  var box=document.querySelector('#sheet-addpersona .avatar-pick'); if(box) box.innerHTML='<div class="chibi" style="width:60%;height:60%;"><div class="ear l"></div><div class="ear r"></div><div class="face"></div><div class="eye l"></div><div class="eye r"></div></div><div class="ico-plus"></div></div>';
  // 重置语气标签：只保留"温柔"选中
  document.querySelectorAll('#np-tones .persona-chip').forEach(function(c,i){ c.classList.toggle('on', i===0); });
  closeSheet('addpersona');
  // 确保微信界面可见并跳转到联系人界面
  goToScreen('wechatapp');
  switchTab('contacts');
  saveState();
  saveChatThread(id);
  showToast('人设已创建', 1400);
}
function importPersonaDoc(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var fn = document.getElementById('np-file-name');
  var lower = file.name.toLowerCase();
  if(fn) fn.textContent = '读取中：'+file.name;
  if(lower.endsWith('.txt') || lower.endsWith('.text')){
    var r = new FileReader();
    r.onload = function(){ personaDocText = r.result; if(fn) fn.textContent='已导入：'+file.name+'（'+personaDocText.length+' 字）'; };
    r.onerror = function(){ if(fn) fn.textContent='读取失败，请重试'; };
    r.readAsText(file,'utf-8');
  } else if(lower.endsWith('.docx')){
    if(window.mammoth && window.mammoth.extractRawText){
      file.arrayBuffer().then(function(buf){
        return window.mammoth.extractRawText({arrayBuffer:buf});
      }).then(function(res){
        personaDocText = res.value || '';
        if(fn) fn.textContent='已导入：'+file.name+'（'+personaDocText.length+' 字）';
      }).catch(function(){ if(fn) fn.textContent='Word 解析失败，请改用 .txt'; });
    } else {
      if(fn) fn.textContent='需联网加载 Word 解析库，或改用 .txt 文件';
    }
  } else {
    if(fn) fn.textContent='仅支持 .txt / .docx 文件';
  }
}

function pickVis(el, showList){
  document.querySelectorAll('#sheet-compose .vis-opt').forEach(o=>o.classList.remove('picked'));
  el.classList.add('picked');
  document.getElementById('vis-personas').style.display = showList ? 'block' : 'none';
}
/* 双重切换已移除：静态与动态 chip 统一使用内联 onclick="toggleHidden(this)"，避免点一下被切换两次导致选不中 */

function postMoment(){
  const text = document.getElementById('mo-text').value.trim();
  if(!text) return;
  const visEl = document.querySelector('#sheet-compose .vis-opt.picked .t');
  const visLabel = visEl ? visEl.textContent : '公开';
  let vis = visLabel;
  if(visLabel.indexOf('不给')>-1 || composeHidden.length){
    const names = composeHidden.map(id=>contacts[id]?contacts[id].name:id);
    vis = names.length ? ('不给 '+names.join('、')+' 看') : '部分可见';
  }
  moments.unshift({ id: Date.now(), authorId:'me', text, vis, hidden: composeHidden.slice(), ts: nowStamp(), place:'', likes:0, liked:false, comments:[], img:null });
  document.getElementById('mo-text').value='';
  composeHidden = [];
  closeSheet('compose');
  renderMoments(); refreshAllMomentsViews(); saveState();
}

function toggleHidden(chip){
  chip.classList.toggle('on');
  const id = chip.getAttribute('data-id');
  const i = composeHidden.indexOf(id);
  if(i>-1) composeHidden.splice(i,1); else composeHidden.push(id);
}

function populateViewAs(){
  const sel = document.getElementById('viewas-select');
  if(!sel) return;
  let html = '<option value="me">我（'+esc(userName)+'）</option>';
  Object.keys(contacts).forEach(k=>{ if(!contacts[k].isGroup && k!=='me') html += '<option value="'+k+'">'+esc(contacts[k].name)+'</option>'; });
  sel.innerHTML = html;
  sel.value = viewAs;
}

function initApp(){
  /* 记忆模式：不再清空旧存档，保留用户所有数据 */
  loadState();
  initWidgetBgMode(); /* 确保插件背景效果立即生效（即使无存档也用默认磨砂）*/
  if(!moments.length){
    moments = [
      { id:1, authorId:'tester1', text:'这是上线前的测试环境，欢迎体验各类功能～', vis:'公开', hidden:[], ts: nowStamp()-1000*60*60*2, place:'', likes:12, liked:false, comments:[] },
      { id:2, authorId:'me', text:'我是 user，正在做最后的上线检查。', vis:'公开', hidden:[], ts: nowStamp()-1000*60*60*24, place:'', likes:3, liked:false, comments:[] }
    ];
  }
  Object.keys(contacts).forEach(k=>{
    if((k[0]==='p'||k[0]==='g') && !document.querySelector('#contact-items [onclick*="'+k+'"]')){
      if(contacts[k].isGroup) addContactRow(k,true); else addContactRow(k,false);
    }
  });
  applyUserName(); applyUserPrefs(); updateUserAvatarEl();
  applyMomentsBg(); renderMoments(); populateViewAs();
  dailyGenContactMoments(); /* 每日零点自动生成联系人朋友圈 */
  renderWallet();
  if(chatBg){ applyChatBgToDOM(chatBg); }
  renderThread();
  /* seed default widgets (after state loaded, so custom image/text persist) — 跳过用户已移除的 */
  ['glasstext','breathe','viz','countdown'].forEach(function(t){ if(removedPlugins.indexOf(t)<0) addPlugin(t); });
  renderChatList();
  applyBubbleColors();
  var _bm=document.getElementById('bub-mine'); if(_bm) _bm.value=bubbleMineColor||'#1a1a1a';
  var _bt=document.getElementById('bub-theirs'); if(_bt) _bt.value=bubbleTheirsColor||'#ffffff';
  /* 记忆模式：从 IndexedDB 加载聊天记录和表情包 */
  fatedDBLoadStickers(function(ok){
    if(ok){ renderStickerLib(); }
    fatedDBLoadAllChats(function(ok2){
      if(ok2){
        renderThread();
        renderChatList();
      }
      /* 从 IndexedDB 加载大数据（widgetCustom/appIconImgs/lockWp/homeWp），避免 localStorage 溢出丢失 */
      fatedDBLoadKV('widgetCustom', function(wc){
        if(wc && typeof wc==='object') widgetCustom=wc;
        fatedDBLoadKV('appIconImgs', function(icons){
          if(Array.isArray(icons)){ icons.forEach(function(o){ var a=appIcons.find(function(x){return x.id===o.id;}); if(a) a.img=o.img; }); renderDesktopIcons(); renderIconGrid(); }
          fatedDBLoadKV('lockWp', function(lwp){
            if(lwp && typeof lwp==='object'){ lockWp=lwp; paintWallpaper(document.getElementById('lock-wallpaper'), lockWp); }
            fatedDBLoadKV('homeWp', function(hwp){
              if(hwp && typeof hwp==='object'){ homeWp=hwp; paintWallpaper(document.getElementById('home-wallpaper'), homeWp); }
            });
          });
        });
      });
    });
  });
  /* 记忆模式：每 30 秒自动保存所有聊天记录（安全网）*/
  setInterval(function(){ fatedDBSaveAllChats(); }, 30000);
  /* 页面关闭前保存 */
  window.addEventListener('beforeunload', function(){ saveState(); });
  /* 页面隐藏时保存（手机切后台）*/
  document.addEventListener('visibilitychange', function(){ if(document.hidden){ saveState(); } });
}

/* ============ FORUM (拾光论坛) ============ */
var forumState = { posts:[], filter:'reco', detailIdx:-1, day:'', loading:false };

function stripEmoji(s){ try{ return String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,''); }catch(e){ return String(s); } }
function forumInitial(name){ return esc(String(name||'匿').trim().charAt(0)||'匿'); }
function forumDayKey(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function forumSaveDaily(){ try{ localStorage.setItem('forum_daily', JSON.stringify({day:forumState.day, posts:forumState.posts})); }catch(e){} }

/* 论坛专用 LLM 调用（大 token 上限）：代理优先，直连兜底 */
function forumCallLLM(userPrompt, sysPrompt, cb){
  var cfg=apiConfig, model=cfg.activeModel||'deepseek', m=cfg.models[model];
  if(!m||!m.key){ cb(null); return; }
  var msgs=[{role:'system',content:sysPrompt},{role:'user',content:userPrompt}];
  function tryDirect(done){
    var url,hdrs,bd;
    var ep = modelEndpoint(m, model);
    if(!ep){ done(null); return; }
    if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:4096,temperature:0.95}); }
    else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:sysPrompt,messages:[{role:'user',content:userPrompt}],max_tokens:4096}); }
    else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:sysPrompt+'\n\n'+userPrompt}]}],generationConfig:{maxOutputTokens:8192,temperature:0.95}}); }
    else if(model==='custom'){
      var cf=m.apiFormat||'openai';
      if(cf==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:sysPrompt,messages:[{role:'user',content:userPrompt}],max_tokens:4096}); }
      else if(cf==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:sysPrompt+'\n\n'+userPrompt}]}],generationConfig:{maxOutputTokens:8192,temperature:0.95}}); }
      else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:4096,temperature:0.95}); }
    }
    else { done(null); return; }
    fetch(url,{method:'POST',headers:hdrs,body:bd}).then(function(r){return r.json();}).then(function(data){
      var reply='';
      if(model==='deepseek'||model==='chatgpt') reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      else if(model==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
      else if(model==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
      else if(model==='custom'){
        var cf2=m.apiFormat||'openai';
        if(cf2==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
        else if(cf2==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
        else reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      }
      done((reply && !data.error) ? reply : null);
    }).catch(function(){ done(null); });
  }
  function tryProxy(done){
    var ep = modelEndpoint(m, model);
    var bd=JSON.stringify({messages:msgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, max_tokens:4096, apiFormat:(m.apiFormat||'openai')});
    fetch(proxyBase()+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:bd}).then(function(r){
      if(!r.ok){ done(null); return; }
      return r.json();
    }).then(function(data){
      if(!data){ done(null); return; }
      var reply=data.content||data.reply||'';
      if(/API连接失败|API Error|Invalid API|401|403|unauthorized|forbidden|请在设置|填入 API Key|请先在设置|缺(少)?\s*API|Proxy error|无法访问/i.test(reply)){ done(null); return; }
      done(reply||null);
    }).catch(function(){ done(null); });
  }
  tryProxy(function(r){ if(r){ cb(r); return; } tryDirect(cb); });
}

function forumParsePosts(raw){
  if(!raw) return null;
  var s=String(raw).replace(/```json|```/g,'').trim();
  var a=s.indexOf('['), b=s.lastIndexOf(']');
  if(a<0||b<=a) return null;
  var arr; try{ arr=JSON.parse(s.slice(a,b+1)); }catch(e){ return null; }
  if(!Array.isArray(arr)||arr.length===0) return null;
  var now=Date.now(), out=[];
  arr.forEach(function(p,i){
    var title=stripEmoji(String(p&&p.title||'')).trim(), content=stripEmoji(String(p&&p.content||'')).trim();
    if(!title||!content) return;
    out.push({
      id:'fp-ai-'+now+'-'+i,
      author:stripEmoji(String(p.author||'匿名')).trim()||'匿名',
      authorType:'netizen',
      title:title, content:content,
      tag:stripEmoji(String(p.tag||'杂谈')).trim()||'杂谈',
      likes:parseInt(p.likes,10)||(Math.floor(Math.random()*900)+50),
      comments:(Array.isArray(p.comments)?p.comments:[]).map(function(c){ return {who:'netizen', name:stripEmoji(String(c&&c.name||'路人')).trim()||'路人', text:stripEmoji(String(c&&c.text||'')).trim(), ts:now-Math.floor(Math.random()*43200000)}; }).filter(function(c){ return c.text; }),
      ts:now-Math.floor(Math.random()*77760000)
    });
  });
  return out.length?out:null;
}

function forumEnsureDaily(){
  if(forumState.posts.length===0){
    try{ var c=JSON.parse(localStorage.getItem('forum_daily')); if(c&&Array.isArray(c.posts)&&c.posts.length){ forumState.posts=c.posts; forumState.day=c.day||''; } }catch(e){}
  }
  if(forumState.posts.length===0) forumLocalSeed();
  if(forumState.day!==forumDayKey()) forumAIRefresh(false);
}

function forumAIRefresh(manual){
  if(forumState.loading) return;
  var m=apiConfig.models[apiConfig.activeModel];
  if(!m||!m.key){ if(manual) showToast('未填写 API Key：请去 设置 → API Config 填写',2600,'err'); return; }
  forumState.loading=true;
  var feed=document.getElementById('forum-feed');
  if(feed && !document.getElementById('forum-loading-tip')) feed.insertAdjacentHTML('afterbegin','<div class="forum-loading" id="forum-loading-tip">正在从全网搬运今日新帖…</div>');
  var pname='测试员1';
  try{ if(window.coupleState&&window.coupleState.partner&&contacts[window.coupleState.partner]) pname=contacts[window.coupleState.partner].name; }catch(e){}
  var sys='你是一个中文论坛的内容搬运工，每天在微博、豆瓣、贴吧、虎扑、晋江、B站评论区闲逛，把看到的帖子搬运到一个小论坛。写作铁律：口语化、有网感，像真人随手敲出来的；每条帖子的句式、长短、语气必须各不相同；绝对禁止使用任何emoji和颜文字；绝对禁止AI腔和模板腔（不许出现"首先/其次/总之/不得不说"这类结构，不许排比堆砌，不许小编腔）。只输出JSON数组，不输出其他任何文字。';
  var up='今天是'+forumDayKey()+'。搬运15条帖子，输出严格JSON数组，元素格式：{"author":"发帖人网名","title":"标题","content":"正文100到260字","tag":"分类词","likes":37到4800的整数,"comments":[{"name":"评论人网名","text":"评论"}]}。每帖配3到6条评论，评论要像真实网友：有抬杠的、有吃瓜追问的、有歪楼的、有只回两三个字的。\n内容分配：其中5条必须围绕「'+userName+'」展开——论坛路人视角的八卦，比如有人偶遇'+userName+'和'+pname+'、讨论两人的关系、关于'+userName+'的传闻、被夸或被议论等，口吻是不认识本人的吃瓜网友；其余10条从这些方向混着来：娱乐圈八卦和塌房吃瓜、小说安利或吐槽（言情、原耽、网文）、电竞赛事和选手讨论、游戏版本吐槽、综艺、生活牢骚。网名要多样自然，不要都是四字文艺风。';
  forumCallLLM(up, sys, function(reply){
    forumState.loading=false;
    var tip=document.getElementById('forum-loading-tip'); if(tip&&tip.parentNode) tip.parentNode.removeChild(tip);
    var aiPosts=forumParsePosts(reply);
    if(!aiPosts){ if(manual) showToast('搬运失败：AI 返回内容无法解析，稍后再试',2600,'err'); return; }
    var keep=forumState.posts.filter(function(p){ return p.authorType==='user'||p.authorType==='contact'; });
    forumState.posts=keep.concat(aiPosts).sort(function(a,b){ return b.ts-a.ts; });
    forumState.day=forumDayKey();
    forumSaveDaily();
    if(forumState.detailIdx<0 && document.getElementById('forum-feed')) forumShowFeed();
    showToast('今日 15 条新帖已搬运',1800);
  });
}

var fakeUsers = [
  {name:'云端旅人'},{name:'深夜书店'},{name:'咖啡续命'},{name:'追光者'},
  {name:'北岛的诗'},{name:'拖延症晚期'},{name:'柠檬气泡水'},{name:'流浪的猫'},
  {name:'momo'},{name:'理想三旬'},{name:'橘子汽水'},{name:'风吹麦浪'},
  {name:'不想上班的第n天'},{name:'暮冬白桃'},{name:'半勺月光'},{name:'岛屿来信'},
  {name:'瓜田里的猹'},{name:'薄荷微光'},{name:'键盘侠克星'},{name:'深海未眠'}
];

var netizenComments = [
  '写得真好，感同身受。','赞同！我也遇到过类似的情况。','收藏了，以后慢慢看。','楼主说得太对了！','看到标题就点进来了，没让我失望。',
  '这篇质量好高啊，顶上去！','谢谢分享，学到了。','有同感，我也是这么想的。','能不能再写一篇类似的？','第一次评论，被这篇文章打动了。',
  '有点不同的看法，但尊重你的观点。','好文！已推荐给朋友。','看得出来是用心写的。','逻辑清晰，论点有力。','评论区好热闹，我也来留个言。',
  '这个话题太有共鸣了。','每天刷论坛就为了看这种优质内容。','不知道为什么看哭了。','写得真细腻，喜欢。',
  '最近也刚经历了类似的事情，看到这篇觉得很温暖。','内容翔实，分析到位。','这种有深度的帖子越多越好。',
  '第一次在这个论坛留言，献给楼主了。','熬夜看完的，不后悔。','希望论坛多一些这样的帖子。'
];

var forumTopics = [
  {title:'为什么越长大越难交到真心的朋友？',tag:'情感',content:'小时候觉得交朋友很简单，一起玩就是朋友。长大后发现人与人之间隔着太多东西了……'},
  {title:'推荐几本最近读的好书',tag:'书评',content:'最近读了三本非常不错的书，分享给大家。《百年孤独》重新读了一遍，感受完全不一样……'},
  {title:'一个人去旅行是一种怎样的体验？',tag:'生活',content:'上个月鼓起勇气一个人去了大理。出发前各种担心，到了之后才发现……'},
  {title:'你们觉得什么是真正的"成熟"？',tag:'思考',content:'不是年龄大了就成熟，也不是变得圆滑就叫成熟。我觉得真正的成熟是……'},
  {title:'深夜emo时间：你最遗憾的一件事是什么？',tag:'情感',content:'今天整理旧物，翻到了很多回忆。突然想起很多年前的一个选择……'},
  {title:'分享一组ins风手机壁纸',tag:'分享',content:'整理了最近收集的一些超好看的壁纸，风格偏韩系简约……'},
  {title:'异地恋真的能长久吗？',tag:'情感',content:'和男朋友异地两年了，说实话真的很难。但每次见面又觉得一切都值得……'},
  {title:'30岁之前一定要做的事',tag:'清单',content:'列了一份清单，希望在30岁之前完成。有些事不趁年轻做，以后可能就没机会了……'},
  {title:'咖啡馆打工日记',tag:'生活',content:'在咖啡馆打工一个月了，见到了各种各样的人。有人来约会，有人来工作……'},
  {title:'如何克服社交恐惧？',tag:'心理',content:'作为一个社恐人，每次参加聚会都痛苦到不行。最近试了一些方法……'},
  {title:'养猫一年的心得体会',tag:'生活',content:'一年前从救助站领养了一只橘猫，从此生活彻底被改变了。每天都有新惊喜……'},
  {title:'大家有没有后悔选择的专业/职业？',tag:'职场',content:'最近在思考转行的事情，当初学的专业和现在的工作完全不相关……'},
  {title:'安利一个私藏的宝藏歌单',tag:'音乐',content:'整理了这些年收藏的一些小众歌曲，每一首都循环过无数遍……'},
  {title:'和父母沟通好难，该怎么办？',tag:'家庭',content:'每次回家都想好好和父母交流，但总是聊着聊着就吵起来了……'},
  {title:'记录一下减肥30斤的心路历程',tag:'健康',content:'从去年开始下定决心减肥，到现在终于瘦了30斤。过程很痛苦但值得……'},
  {title:'聊聊你遇到过的最好的老师',tag:'教育',content:'高中语文老师对我影响特别大，她让我爱上了阅读和写作……'},
  {title:'共享单车、共享充电宝…共享经济还能走多远',tag:'商业',content:'这几年共享经济起起落落，有的成功了，大多数……'}
];

function initForum(){
  forumEnsureDaily();
  forumState.filter = 'reco';
  forumState.detailIdx = -1;
  forumShowFeed();
}

/* 本地兜底帖（无 API Key 或加载失败时用），日期标记为空以便 AI 到位后覆盖 */
function forumLocalSeed(){
  var posts = [];
  // Generate 15+ posts from netizens
  for(var i=0; i<15; i++){
    var topic = forumTopics[i % forumTopics.length];
    var user = fakeUsers[i % fakeUsers.length];
    var post = {
      id:'fp-'+i,
      author:user.name,
      authorType:'netizen',
      title:topic.title,
      content:topic.content,
      tag:topic.tag,
      likes:Math.floor(Math.random()*800)+50,
      comments:[],
      ts:Date.now() - Math.floor(Math.random()*86400000*3)
    };
    // Generate 20-30 comments
    var commentCount = 20 + Math.floor(Math.random()*11);
    // 1-3 comments from WeChat contacts
    if(Math.random()<0.7) post.comments.push({who:'tester1',text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:post.ts+3600000});
    if(Math.random()<0.5) post.comments.push({who:'me',text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:post.ts+7200000});
    // Rest from netizens
    for(var j=post.comments.length; j<commentCount; j++){
      var u = fakeUsers[Math.floor(Math.random()*fakeUsers.length)];
      post.comments.push({who:'netizen',name:u.name,text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:post.ts+Math.random()*86400000});
    }
    posts.push(post);
  }
  // 2-3 posts from WeChat contacts
  var contactPosts = [
    {who:'tester1',title:'今天处理了一整天的危机公关',content:'累是真的累，但只要想到她还在等我，就觉得一切都值得了。工作再忙也不能忘了重要的人。',tag:'日常'},
    {who:'me',title:'嘴硬的人也会心软',content:'嘴上说着不在乎，其实每次看到她的时候都会紧张。不是不想表现出来，只是不习惯。最近在学着改变。',tag:'心情'},
    {who:'tester1',title:'夜晚的碎碎念',content:'其实每个人都有脆弱的一面。我也有。只是不想让她看到。想让自己在她面前一直是强大的样子。',tag:'情感'}
  ];
  contactPosts.forEach(function(cp,i){
    var c = contacts[cp.who];
    posts.push({
      id:'fp-contact-'+i,
      author:c?c.name:cp.who,
      authorType:'contact',
      title:cp.title,
      content:cp.content,
      tag:cp.tag,
      likes:Math.floor(Math.random()*500)+100,
      comments:genComments(22+Math.floor(Math.random()*8)),
      ts:Date.now()-Math.floor(Math.random()*86400000*2)
    });
  });
  forumState.posts = posts.sort(function(){return Math.random()-0.5;});
  forumState.day = '';
}

function genComments(n){
  var cs=[];
  for(var i=0;i<n;i++){
    var u=fakeUsers[i%fakeUsers.length];
    cs.push({who:'netizen',name:u.name,text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:Date.now()});
  }
  return cs;
}

function forumTab(t){
  forumState.filter = t;
  document.getElementById('ft-reco').classList.toggle('active',t==='reco');
  document.getElementById('ft-follow').classList.toggle('active',t==='follow');
  forumShowFeed();
}

function forumShowFeed(){
  forumState.detailIdx = -1;
  var feedEl = document.getElementById('forum-feed');
  if(!feedEl) return;
  feedEl.style.display = 'block';
  document.getElementById('forum-detail').style.display = 'none';
  document.getElementById('forum-compose').style.display = 'none';
  var posts = forumState.posts;
  if(forumState.filter==='follow'){
    posts = posts.filter(function(p){ return p.authorType==='user'||p.authorType==='contact'; });
  }
  var html = forumState.loading ? '<div class="forum-loading" id="forum-loading-tip">正在从全网搬运今日新帖…</div>' : '';
  posts.forEach(function(p){
    var i = forumState.posts.indexOf(p);
    html += '<div class="forum-card" onclick="forumOpen('+i+')">';
    html += '<div class="f-header"><div class="f-av" style="background:'+randomColor(p.author)+';">'+forumInitial(p.author)+'</div><div><div class="f-name">'+esc(p.author)+'</div><div class="f-time">'+fmtAgo(p.ts)+'</div></div></div>';
    html += '<div class="f-title">'+esc(p.title)+'</div>';
    html += '<div class="f-excerpt">'+esc(p.content)+'</div>';
    html += '<span class="f-tag">'+esc(p.tag)+'</span>';
    html += '<div class="f-meta"><span>赞 '+p.likes+'</span><span>评论 '+p.comments.length+'</span></div>';
    html += '</div>';
  });
  feedEl.innerHTML = html;
}

function forumOpen(i){
  forumState.detailIdx = i;
  var p = forumState.posts[i];
  if(!p) return;
  document.getElementById('forum-feed').style.display = 'none';
  document.getElementById('forum-compose').style.display = 'none';
  var detail = document.getElementById('forum-detail');
  detail.style.display = 'block';
  var html = '<div class="fd-title">'+esc(p.title)+'</div>';
  html += '<div class="fd-author"><div class="f-av" style="background:'+randomColor(p.author)+';">'+forumInitial(p.author)+'</div><div><div class="f-name">'+esc(p.author)+'</div><div class="f-time">'+fmtAgo(p.ts)+' · 赞 '+p.likes+'</div></div>';
  if(p.authorType==='user') html += '<div class="forum-actions"><span class="del" onclick="forumDelete('+i+')">删除</span></div>';
  html += '</div>';
  html += '<div class="fd-content">'+esc(p.content)+'</div>';
  html += '<div class="fd-divider">评论 '+p.comments.length+'</div>';
  p.comments.forEach(function(c){
    var name = c.name||(c.who==='me'?userName:(contacts[c.who]?contacts[c.who].name:c.who));
    html += '<div class="forum-comment"><div class="fc-header"><div class="fc-av" style="background:'+randomColor(name)+';">'+forumInitial(name)+'</div><span class="fc-name">'+esc(name)+'</span><span class="fc-time">'+fmtAgo(c.ts)+'</span></div><div class="fc-text">'+esc(c.text)+'</div></div>';
  });
  html += '<div style="margin-top:16px;display:flex;gap:8px;"><input id="fc-reply" placeholder="写下你的评论…" style="flex:1;border:1px solid #e8e0dc;border-radius:20px;padding:10px 14px;font-size:13px;outline:none;"><div class="big-btn" style="margin:0;padding:10px 20px;font-size:12px;" onclick="forumReply('+i+')">发送</div></div>';
  detail.innerHTML = html;
  detail.scrollTop = 0;
}

function forumReply(i){
  var inp = document.getElementById('fc-reply');
  var text = inp.value.trim();
  if(!text) return;
  var p = forumState.posts[i];
  p.comments.push({who:'me',name:userName,text:text,ts:Date.now()});
  inp.value = '';
  forumOpen(i);
  forumSaveDaily();
  /* 楼层回复全部走 AI 模型 */
  var asOwner = Math.random()<0.55;
  var replier = asOwner ? p.author : fakeUsers[Math.floor(Math.random()*fakeUsers.length)].name;
  var sys = '你在中文论坛里扮演网友「'+replier+'」回帖。要求：口语化、简短、有网感，禁止使用emoji和颜文字，禁止AI腔和客服腔。只输出回帖内容本身，不要带名字前缀。';
  var ctx = '帖子标题：'+p.title+'\n帖子正文：'+p.content+'\n刚才「'+userName+'」在评论区回复："'+text+'"\n你'+(asOwner?'是发帖人':'是路过的网友')+'，回应这条评论，一两句话。';
  forumCallLLM(ctx, sys, function(reply){
    if(!reply) return;
    reply = stripEmoji(reply).trim();
    if(!reply) return;
    p.comments.push({who:'netizen', name:replier, text:reply, ts:Date.now()});
    forumSaveDaily();
    if(forumState.detailIdx===i) forumOpen(i);
  });
}

function forumDelete(i){
  if(!confirm('确定删除这条帖子吗？')) return;
  forumState.posts.splice(i,1);
  forumSaveDaily();
  forumShowFeed();
}

function forumShowCompose(){
  document.getElementById('forum-feed').style.display = 'none';
  document.getElementById('forum-detail').style.display = 'none';
  document.getElementById('forum-compose').style.display = 'block';
  document.getElementById('fc-title').value = '';
  document.getElementById('fc-content').value = '';
  document.getElementById('fc-tag').value = '';
}

function forumPost(){
  var title = document.getElementById('fc-title').value.trim();
  var content = document.getElementById('fc-content').value.trim();
  var tag = document.getElementById('fc-tag').value.trim() || '日常';
  if(!title){ alert('请填写标题'); return; }
  if(!content){ alert('请填写内容'); return; }
  var post = {
    id:'fp-user-'+Date.now(),
    author:userName,
    authorType:'user',
    title:title,
    content:content,
    tag:tag,
    likes:0,
    comments:[],
    ts:Date.now()
  };
  forumState.posts.unshift(post);
  forumShowFeed();
  forumSaveDaily();
  /* 帖子下的网友评论全部由 AI 生成 */
  forumCallLLM(
    '「'+userName+'」刚在论坛发帖。\n标题：'+title+'\n正文：'+content+'\n请生成5条真实网友风格的评论，输出严格JSON数组：[{"name":"网名","text":"评论"}]。有捧场的、有追问细节的、有轻微抬杠的、有只回几个字的。禁止emoji和颜文字，禁止AI腔。',
    '你负责给论坛帖子生成真实网友评论，只输出JSON数组，不输出其他文字。',
    function(reply){
      if(!reply) return;
      var s = String(reply).replace(/```json|```/g,'').trim();
      var a = s.indexOf('['), b = s.lastIndexOf(']');
      if(a<0||b<=a) return;
      var arr; try{ arr = JSON.parse(s.slice(a,b+1)); }catch(e){ return; }
      if(!Array.isArray(arr)) return;
      arr.forEach(function(c){
        var t = stripEmoji(String(c&&c.text||'')).trim();
        if(t) post.comments.push({who:'netizen', name:stripEmoji(String(c&&c.name||'路人')).trim()||'路人', text:t, ts:Date.now()+Math.floor(Math.random()*600000)});
      });
      forumSaveDaily();
      if(forumState.detailIdx>=0 && forumState.posts[forumState.detailIdx]===post) forumOpen(forumState.detailIdx);
      else if(forumState.detailIdx<0) forumShowFeed();
    });
  /* 伴侣也会来评论（走人设 AI） */
  try{
    var pid = window.coupleState && window.coupleState.partner;
    if(pid && contacts[pid] && typeof callRealAI==='function' && typeof getPersonaPrompt==='function'){
      callRealAI([{role:'user',content:'（你在拾光论坛刷到我刚发的帖子《'+title+'》，内容是："'+content+'"。请以你的身份在评论区留一条评论，一两句话，符合你的性格，不要用emoji。只输出评论内容本身）'}], getPersonaPrompt(pid), pid, function(r){
        r = stripEmoji(r||'').replace(/\[[^\]]*\]\s*$/,'').trim();
        if(!r) return;
        post.comments.unshift({who:pid, name:contacts[pid].name, text:r, ts:Date.now()+1000});
        forumSaveDaily();
        if(forumState.detailIdx>=0 && forumState.posts[forumState.detailIdx]===post) forumOpen(forumState.detailIdx);
      });
    }
  }catch(e){}
}

function randomColor(s){ var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return 'hsl('+h+',50%,55%)';}

/* ============ GAME SPACE (游戏空间) ============ */
var gameState = { contact:'', voiceActive:false, voiceTimer:null, ttsKey:'', ttsVoice:'', chatLog:[], currentGame:'' };

function initGame(){
  gameLoadTTS();
  gameRenderVWave();
  updateGamePerms();
}

function gameReqNotif(){
  if(!('Notification' in window)){ alert('你的浏览器不支持通知功能'); return; }
  Notification.requestPermission().then(function(p){
    updateGamePerms();
    if(p==='granted') gameAddChat('system','✅ 通知权限已开启');
  });
}

function gameReqOverlay(){
  showToast('浮窗权限已模拟开启，通话可在后台进行', 1500);
  document.getElementById('perm-overlay').classList.add('granted');
  gameAddChat('system','✅ 浮窗权限已开启，通话可后台运行');
}

function updateGamePerms(){
  if('Notification' in window && Notification.permission==='granted'){
    document.getElementById('perm-notif').classList.add('granted');
  }
}

function gamePickContact(){
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup; });
  if(ids.length===0){ showToast('没有可选的联系人', 1500); return; }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:flex-end;justify-content:center;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:420px;padding:16px 16px calc(env(safe-area-inset-bottom) + 20px);max-height:70vh;overflow-y:auto;';
  var html = '<div style="font-size:15px;font-weight:800;margin-bottom:12px;text-align:center;color:#fff;">选择开黑队友</div>';
  ids.forEach(function(k){
    var c = contacts[k];
    var sel = gameState.contact===k;
    html += '<div onclick="gameSetContact(\''+k+'\')" style="cursor:pointer;padding:10px;border-radius:12px;display:flex;align-items:center;gap:10px;'+(sel?'background:rgba(74,222,128,0.15);':'background:rgba(255,255,255,0.05);')+'margin-bottom:6px;">'+
      '<div class="av glass-strong" style="overflow:hidden;width:40px;height:40px;border-radius:14px;flex:none;">'+contactAvatar(c)+'</div>'+
      '<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:#fff;">'+esc(c.name)+'</div><div style="font-size:10px;opacity:.5;color:#fff;">'+(sel?'已选择':'点击选择')+'</div></div>'+
      (sel?'<span style="color:#4ade80;font-weight:800;">✓</span>':'')+
      '</div>';
  });
  html += '<div class="buy-btn" style="margin-top:12px;background:rgba(255,255,255,0.1);text-align:center;color:#fff;" onclick="this.parentElement.parentElement.remove()">关闭</div>';
  sheet.innerHTML = html;
  overlay.appendChild(sheet);
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
function gameSetContact(k){
  if(!contacts[k]) return;
  gameState.contact = k;
  var c = contacts[k];
  document.getElementById('game-contact-name').textContent = c.name;
  document.getElementById('game-contact-av').innerHTML = contactAvatar(c);
  document.getElementById('game-contact-av').style.background = 'transparent';
  gameAddChat('system','👥 '+c.name+' 加入队伍！准备开黑！');
  var overlay = document.querySelector('div[style*="z-index:300"]');
  if(overlay) overlay.remove();
}

var gameSchemes = {
  wzry:{scheme:'tencent://',web:'https://pvp.qq.com/',pkg:'com.tencent.tmgp.sgame'},
  hpjy:{scheme:'pubgmhd://',web:'https://gp.qq.com/',pkg:'com.tencent.tmgp.pubgmhd'},
  ys:{scheme:'yuanshen://',web:'https://ys.mihoyo.com/',pkg:'com.miHoYo.Yuanshen'},
  jcc:{scheme:'jcc://',web:'https://jcc.qq.com/',pkg:'com.tencent.jkchess'},
  dwrg:{scheme:'dwrg://',web:'https://id5.163.com/',pkg:'com.netease.id5'},
  gy:{scheme:'sky://',web:'https://sky.thatgamecompany.com/',pkg:'com.tgc.sky'},
  tss:{scheme:'tcsdzz://',web:'https://tcsdzz.com/',pkg:'com.wepie.snakebattle'}
};

function gameLaunch(name,id){
  if(!gameState.contact){ showToast('请先选择队友！', 1500); return; }
  gameState.currentGame = name;
  var c = contacts[gameState.contact];
  var info = gameSchemes[id];
  gameAddChat('system','🎮 正在启动《'+name+'》…');
  gameAddChat('ai',c.name+'：来了！这把看我的。');

  // Try to open the app via URL scheme
  if(info){
    var startTime = Date.now();
    // Try deep link
    if(info.scheme){
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = info.scheme;
      document.body.appendChild(iframe);
      setTimeout(function(){ document.body.removeChild(iframe); },2000);
    }
    // After 2.5s, check if app opened. If not, offer web fallback
    setTimeout(function(){
      if(Date.now() - startTime < 3000){
        // App likely not installed, open official site directly (avoid popup-blocker issues on mobile)
        gameAddChat('system','⚠ 未检测到《'+name+'》已安装，正在打开官网…');
        if(info.web) window.open(info.web,'_blank');
      } else {
        gameAddChat('system','✅ 已跳转到《'+name+'》');
      }
    },2500);
  }

  setTimeout(function(){
    gameAddChat('ai',c.name+'：准备就绪，开始吧！');
    if('Notification' in window && Notification.permission==='granted'){
      new Notification('🎮 游戏空间',{body:'《'+name+'》已启动，'+c.name+' 已就位！'});
    }
  },800);
  gameRenderVWave();
}

function gameToggleVoice(){
  if(gameState.voiceActive){
    gameState.voiceActive = false;
    clearInterval(gameState.voiceTimer);
    document.getElementById('game-voice-panel').style.display = 'none';
    document.getElementById('game-float-bar').classList.remove('show');
    try{ speechSynthesis.cancel(); }catch(e){}
    gameAddChat('system','🔇 语音通话已结束');
  } else {
    if(!gameState.contact){ showToast('请先选择队友！', 1500); return; }
    gameState.voiceActive = true;
    var c = contacts[gameState.contact];
    document.getElementById('game-voice-panel').style.display = 'block';
    document.getElementById('game-v-contact-name').textContent = c.name;
    document.getElementById('game-v-status').textContent = '已连接 · 延迟 32ms';
    // 更新浮动条
    document.getElementById('game-float-name').textContent = c.name + ' · 通话中';
    document.getElementById('game-float-av').innerHTML = contactAvatar(c);
    gameRenderVWave();
    gameRenderFloatWave();
    gameStartVoiceSim();
    gameAddChat('system','🎙 语音通话已连接');
    // AI先说一句
    setTimeout(function(){ gameAISpeak(); }, 1500);
  }
}

function gameMinimizeVoice(){
  document.getElementById('game-voice-panel').style.display = 'none';
  document.getElementById('game-float-bar').classList.add('show');
  gameRenderFloatWave();
}
function gameRestoreVoice(){
  document.getElementById('game-float-bar').classList.remove('show');
  document.getElementById('game-voice-panel').style.display = 'block';
}

function gameStartVoiceSim(){
  clearInterval(gameState.voiceTimer);
  // 每8-12秒AI说一句话
  gameState.voiceTimer = setInterval(function(){
    if(!gameState.voiceActive) return;
    if(gameState.contact && contacts[gameState.contact]){
      gameAISpeak();
    }
  }, 8000 + Math.random()*4000);
}

function gameAISpeak(){
  if(!gameState.voiceActive || !gameState.contact) return;
  var c = contacts[gameState.contact];
  if(!c) return;
  // 用AI生成对话，如果没有API key则用预设台词
  var lastMsg = gameState.chatLog.length>0 ? gameState.chatLog[gameState.chatLog.length-1] : null;
  var context = lastMsg ? '上一句你说的是：'+lastMsg.msg+'。' : '';
  var phrases = [
    '跟紧我，别走散了。','好的，我掩护你。','这波可以上！','小心左边！',
    '漂亮！这波操作可以。','等我大招CD…','对面打野下来了。','你去带线，我来守塔。',
    '稳住，我们能赢。','Nice！干得漂亮！','集合集合，准备打团！','我去拿个龙，你们牵制一下。',
    '小心！对面在草丛里！','这波我扛，你们输出。','别浪了，稳一点打。','我先手开团，你们跟上！'
  ];
  var p = phrases[Math.floor(Math.random()*phrases.length)];
  document.getElementById('game-v-status').textContent = '💬 '+p;
  document.getElementById('game-float-status').textContent = p;
  gameAddChat('ai', c.name+'：'+p);
  // 用语音合成朗读
  try{
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(p);
    u.lang = 'zh-CN';
    u.rate = 1.1;
    u.pitch = 1.0;
    speechSynthesis.speak(u);
  }catch(e){}
}

function gameRenderFloatWave(){
  var w = document.getElementById('game-float-wave');
  if(!w) return;
  var html = '';
  for(var i=0;i<8;i++) html += '<span style="animation-delay:'+(i*0.06)+'s;height:'+(4+Math.random()*12)+'px;"></span>';
  w.innerHTML = html;
}

function gameRenderVWave(){
  var w = document.getElementById('game-v-wave');
  if(!w) return;
  var html = '';
  for(var i=0;i<20;i++) html += '<span style="animation-delay:'+(i*0.04)+'s;height:'+(8+Math.random()*22)+'px;"></span>';
  w.innerHTML = html;
}

function gameComplain(){
  var c = contacts[gameState.contact];
  var complaints = [
    '这队友简直了，站着不动让人打！','打野全程梦游，服了。','对面怎么这么强，是不是开挂了？',
    '我这把发挥还行，就是队友太坑了。','辅助不跟团，心态崩了。','刚才那波团战我要是再快一点就好了。',
    '太气了！下一把一定要赢回来！','我大招放空了，好丢人…','这个版本平衡性太差了。'
  ];
  var msg = complaints[Math.floor(Math.random()*complaints.length)];
  gameAddChat('me','😤 '+msg);
  setTimeout(function(){
    var replies = ['确实，这把队友太坑了。','别气了，下把我带你飞。','刚刚那波不是你问题，是对面太强了。','哈哈，你吐槽的样子真可爱。','输了就输了，我陪你继续打。'];
    var reply = replies[Math.floor(Math.random()*replies.length)];
    gameAddChat('ai',c?c.name+'：'+reply:'');
    document.getElementById('game-v-status').textContent = '💬 '+reply;
    document.getElementById('game-float-status').textContent = reply;
    try{ speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(reply); u.lang='zh-CN'; u.rate=1.1; speechSynthesis.speak(u); }catch(e){}
  },600);
}

function gameAddChat(who,msg){
  gameState.chatLog.push({who:who,msg:msg,ts:Date.now()});
  var el = document.getElementById('game-chat-log');
  if(!el) return;
  var cls = who==='me'?'mine':who==='ai'?'ai':'';
  el.innerHTML += '<div class="'+cls+'">['+('0'+new Date().getHours()).slice(-2)+':'+('0'+new Date().getMinutes()).slice(-2)+'] <b>'+(who==='me'?'你':who==='ai'?(contacts[gameState.contact]?contacts[gameState.contact].name:'AI'):'系统')+'</b>：'+msg+'</div>';
  el.scrollTop = el.scrollHeight;
}

function gameSaveTTS(){
  gameState.ttsKey = document.getElementById('tts-api-key').value.trim();
  gameState.ttsVoice = document.getElementById('tts-voice-id').value.trim();
  try{ localStorage.setItem('game_tts',JSON.stringify({key:gameState.ttsKey,voice:gameState.ttsVoice})); }catch(e){}
  showToast('TTS 配置已保存，语音通话将使用系统语音', 1500);
}

function gameLoadTTS(){
  try{
    var saved = JSON.parse(localStorage.getItem('game_tts'));
    if(saved){
      gameState.ttsKey = saved.key||'';
      gameState.ttsVoice = saved.voice||'';
      document.getElementById('tts-api-key').value = gameState.ttsKey;
      document.getElementById('tts-voice-id').value = gameState.ttsVoice;
    }
  }catch(e){}
}

/* ---- sub games: truth/dare + gomoku ---- */
var truthData = {
  truths:['你上一次心动的瞬间是什么？','如果可以选择超能力，你最想要什么？','你觉得自己最大的魅力点是什么？','有没有偷偷做过什么不敢告诉别人的事？','如果世界只剩24小时，你会怎么过？','你觉得爱情中最重要的是什么？','有没有一个人，你一直想对他说对不起？','你最喜欢自己身体的哪个部位？','最近一次哭是因为什么？','如果有人跟你表白你会怎么回应？'],
  dares:['对手机对面的TA说一句最肉麻的话','模仿一种动物叫10秒钟','用唱歌的方式说三句话','闭眼30秒，想象TA就在身边','用三个词夸你现在的队友','发一段10秒的语音给TA','做10个仰卧起坐','倒着念你的名字三遍','用撒娇的语气说"我错了"','给TA取一个专属昵称'],
  reactions:['这个答案我喜欢。ᗜ֊ᗜ','好真诚的回答，心动了。','没想到你是这样的…不过很可爱。','哇，这个答案让我对你刮目相看。','哈哈，你认真的样子好有趣。','听完你的回答，感觉离你又近了一步。'],
  dareReactions:['你还真敢做啊！佩服佩服。','哈哈哈，你做这个太好笑了！','不愧是你，完成得很棒。','我帮你记下来了，以后可以拿出来笑话你。','做完了？那轮到我了。']
};

function gameCloseSub(){
  document.getElementById('game-subview').style.display='none';
  document.querySelectorAll('#sheet-game .game-grid-2, #sheet-game .game-perm, #sheet-game .game-voice-panel, #sheet-game .game-chat-log, #sheet-game .game-contact-row, #sheet-game .tts-config').forEach(function(e){ e.style.display=''; });
}

var truthState = { partner:'', step:'', mode:'', myVal:0, oppVal:0, loser:'', cardType:'', cardText:'', answer:'' };

function gameStartTruth(){
  document.querySelectorAll('#sheet-game .game-grid-2, #sheet-game .game-perm, #sheet-game .game-voice-panel, #sheet-game .game-chat-log, #sheet-game .game-contact-row, #sheet-game .tts-config').forEach(function(e){ e.style.display='none'; });
  document.getElementById('game-subview').style.display='block';
  document.getElementById('game-truth').style.display='block';
  document.getElementById('game-gomoku').style.display='none';
  truthState = { partner:'', step:'', mode:'', myVal:0, oppVal:0, loser:'', cardType:'', cardText:'', answer:'' };
  truthStepPick();
}

function truthStepPick(){
  truthState.step='pick';
  var ids = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].isGroup; });
  var html = '<div class="truth-step-title">选择和谁一起玩</div>';
  html += '<div class="truth-pick">';
  ids.forEach(function(k){
    var c = contacts[k];
    html += '<div class="pc" onclick="truthChoosePartner(\''+k+'\')"><div class="av">'+contactAvatar(c)+'</div><div class="nm">'+esc(c.name)+'</div></div>';
  });
  html += '</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthChoosePartner(id){
  truthState.partner = id;
  gameState.contact = id;
  var c = contacts[id];
  if(document.getElementById('game-contact-name')) document.getElementById('game-contact-name').textContent = c.name;
  gameAddChat('system', c.name+' 加入真心话大冒险！');
  truthStepDuel();
}

function truthStepDuel(){
  truthState.step='duel';
  var c = contacts[truthState.partner];
  var html = '<div class="truth-step-title">和 '+esc(c.name)+' 来一局</div>';
  html += '<div class="truth-duel-info">先分胜负：猜拳或掷骰子，输的人抽卡牌</div>';
  html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthRps()">猜拳</button><button class="truth-btn primary" onclick="truthDice()">掷骰子</button></div>';
  html += '<div class="truth-partner-line" onclick="truthStepPick()" style="cursor:pointer;">重新选择玩伴 ›</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthRps(){
  truthState.mode='rps';
  var html = '<div class="truth-step-title">猜拳 · 出什么？</div>';
  html += '<div class="truth-rps-icons">';
  html += '<div class="r" onclick="truthPlayRps(0)">石头</div>';
  html += '<div class="r" onclick="truthPlayRps(1)">剪刀</div>';
  html += '<div class="r" onclick="truthPlayRps(2)">布</div>';
  html += '</div>';
  html += '<div class="truth-partner-line" onclick="truthStepDuel()" style="cursor:pointer;">‹ 换个玩法</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthPlayRps(my){
  var opp = Math.floor(Math.random()*3);
  if(my===opp){ truthRpsTie(my, opp); return; }
  var myWins = ((opp+1)%3)===my;
  truthResolveDuel(my, opp, 'rps', myWins?'opp':'me');
}

function truthRpsTie(my, opp){
  var names=['石头','剪刀','布'];
  var html = '<div class="truth-step-title">平局！</div>';
  html += '<div class="truth-duel-info">你出 '+names[my]+' ，'+esc(contacts[truthState.partner].name)+' 也出 '+names[opp]+'</div>';
  html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthRps()">再猜一次</button></div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthDice(){
  truthState.mode='dice';
  var html = '<div class="truth-step-title">掷骰子 · 比大小</div>';
  html += '<div class="truth-duel-info">点数小的人输</div>';
  html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthPlayDice()">掷骰子</button></div>';
  html += '<div class="truth-partner-line" onclick="truthStepDuel()" style="cursor:pointer;">‹ 换个玩法</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthPlayDice(){
  var my = 1+Math.floor(Math.random()*6);
  var opp = 1+Math.floor(Math.random()*6);
  if(my===opp){
    var html = '<div class="truth-step-title">平局！</div>';
    html += '<div class="truth-duel-info">你掷出 '+my+' ，'+esc(contacts[truthState.partner].name)+' 也掷出 '+opp+'</div>';
    html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthPlayDice()">再掷一次</button></div>';
    document.getElementById('game-truth').innerHTML = html;
    return;
  }
  truthResolveDuel(my, opp, 'dice', my<opp?'me':'opp');
}

function truthResolveDuel(my, opp, mode, loser){
  truthState.myVal=my; truthState.oppVal=opp; truthState.loser=loser;
  var c = contacts[truthState.partner];
  var myLabel, oppLabel;
  if(mode==='rps'){ var names=['石头','剪刀','布']; myLabel=names[my]; oppLabel=names[opp]; }
  else { myLabel=String(my); oppLabel=String(opp); }
  var loserName = loser==='me' ? '你' : c.name;
  gameAddChat('system', '对决结果 — 你：'+myLabel+'，'+c.name+'：'+oppLabel+'。'+loserName+' 输了！');
  truthStepCard(loser);
}

function truthStepCard(loser){
  truthState.step='card';
  var isTruth = Math.random()>0.4;
  var text = (isTruth?truthData.truths:truthData.dares)[Math.floor(Math.random()*10)];
  truthState.cardType = isTruth?'truth':'dare';
  truthState.cardText = text;
  var c = contacts[truthState.partner];
  var loserName = loser==='me' ? '你' : c.name;
  var html = '<div class="truth-card"><div class="qtype">'+(isTruth?'真心话':'大冒险')+'</div>';
  html += '<div class="question">'+esc(text)+'</div>';
  html += '<div class="hint">'+loserName+' 抽到了这张卡牌</div></div>';

  if(isTruth){
    if(loser==='me'){
      html += '<div class="truth-answer"><textarea id="truth-input" placeholder="输入你的真心话…"></textarea><div class="send" onclick="truthSubmitTruth()">提交</div></div>';
    } else {
      html += '<div class="truth-duel-info">'+esc(c.name)+' 正在回答…</div><div id="truth-ai-wait" class="truth-step-title">…</div>';
      var sysT = getPersonaPrompt(truthState.partner) + '现在是真心话大冒险，你抽到了真心话卡，请用自己的口吻真诚地回答这个问题，1-2句话。不要加名字前缀。不要用emoji。';
      callRealAI([{role:'user',content:'真心话：'+text}], sysT, truthState.partner, function(reply){
        var ans = (reply||'').split('[')[0].trim();
        var node = document.getElementById('truth-ai-wait');
        if(node) node.textContent = ans || '（沉默了一下，脸红了）';
        if(node) node.insertAdjacentHTML('afterend', '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">再来一轮</button></div>');
      });
    }
  } else {
    if(loser==='me'){
      html += '<div class="truth-btns"><button class="truth-btn primary" onclick="truthCompleteDare()">完成任务</button></div>';
    } else {
      html += '<div class="truth-duel-info">'+esc(c.name)+' 正在完成大冒险…</div><div id="truth-ai-wait" class="truth-step-title">…</div>';
      var sysD = getPersonaPrompt(truthState.partner) + '现在是真心话大冒险，你抽到了大冒险卡，请描述你是怎么完成这个任务的，1-2句话，像真人聊天。不要加名字前缀。不要用emoji。';
      callRealAI([{role:'user',content:'大冒险：'+text}], sysD, truthState.partner, function(reply){
        var ans = (reply||'').split('[')[0].trim();
        var node = document.getElementById('truth-ai-wait');
        if(node) node.textContent = ans || '（眨眨眼，照做了）';
        if(node) node.insertAdjacentHTML('afterend', '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">再来一轮</button></div>');
      });
    }
  }
  html += '<div class="truth-partner-line" onclick="truthStepDuel()" style="cursor:pointer;margin-top:14px;">‹ 返回，换个玩法</div>';
  document.getElementById('game-truth').innerHTML = html;
}

function truthSubmitTruth(){
  var el = document.getElementById('truth-input');
  var ans = el ? el.value.trim() : '';
  if(!ans){ showToast('先写点什么吧～', 1800); return; }
  truthState.answer = ans;
  var c = contacts[truthState.partner];
  gameAddChat('me', '真心话：'+ans);
  var html = '<div class="truth-card"><div class="qtype">你的回答</div><div class="question">'+esc(ans)+'</div></div>';
  html += '<div class="truth-duel-info" id="truth-react">'+esc(c.name)+' 正在回应…</div>';
  html += '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">完成 · 再来一轮</button></div>';
  document.getElementById('game-truth').innerHTML = html;
  var sys = getPersonaPrompt(truthState.partner) + '你的恋人刚才在真心话大冒险里坦诚说了真心话，请用你角色的口吻自然回应、表达感受，1-2句话。不要加名字前缀。不要用emoji。';
  callRealAI([{role:'user',content:'TA的真心话：'+ans}], sys, truthState.partner, function(reply){
    var r = (reply||'').split('[')[0].trim();
    var node = document.getElementById('truth-react');
    if(node) node.textContent = (c.name+'：'+(r||truthData.reactions[0])).replace(/\[需要 API Key\]|\[无法连接 AI\]/g,'');
  });
}

function truthCompleteDare(){
  var c = contacts[truthState.partner];
  gameAddChat('me', '完成了大冒险：'+truthState.cardText);
  var html = '<div class="truth-card"><div class="qtype">大冒险完成</div><div class="question">'+esc(truthState.cardText)+'</div></div>';
  html += '<div class="truth-duel-info" id="truth-react">'+esc(c.name)+' 正在回应…</div>';
  html += '<div class="truth-btns" style="margin-top:12px;"><button class="truth-btn primary" onclick="truthNewRound()">完成 · 再来一轮</button></div>';
  document.getElementById('game-truth').innerHTML = html;
  var sys = getPersonaPrompt(truthState.partner) + '你的恋人刚才完成了大冒险卡上的任务，请用你角色的口吻自然回应，1-2句话，可以调侃或夸奖。不要加名字前缀。不要用emoji。';
  callRealAI([{role:'user',content:'TA完成了大冒险：'+truthState.cardText}], sys, truthState.partner, function(reply){
    var r = (reply||'').split('[')[0].trim();
    var node = document.getElementById('truth-react');
    if(node) node.textContent = (c.name+'：'+(r||truthData.dareReactions[0])).replace(/\[需要 API Key\]|\[无法连接 AI\]/g,'');
  });
}

function truthNewRound(){
  truthStepDuel();
  var c = contacts[truthState.partner];
  gameAddChat('system', '新一轮开始，和 '+ (c?c.name:'TA') +' 继续！');
}

/* ---- gomoku ---- */
var gomokuState = { board:[], turn:'black', over:false, score:{black:0,white:0} };

function gameStartGomoku(){
  if(!gameState.contact){ showToast('请先选择队友！', 1500); return; }
  document.querySelectorAll('#sheet-game .game-grid-2, #sheet-game .game-perm, #sheet-game .game-voice-panel, #sheet-game .game-chat-log, #sheet-game .game-contact-row, #sheet-game .tts-config').forEach(function(e){ e.style.display='none'; });
  document.getElementById('game-subview').style.display='block';
  document.getElementById('game-truth').style.display='none';
  document.getElementById('game-gomoku').style.display='block';
  gomokuState = {board:Array(15).fill().map(function(){return Array(15).fill(null);}), turn:'black', over:false, score:gomokuState.score||{black:0,white:0}};
  renderGomoku();
  document.getElementById('gscore-black').textContent = gomokuState.score.black;
  document.getElementById('gscore-white').textContent = gomokuState.score.white;
  document.getElementById('gomoku-status').textContent = '你的回合（⚫）';
  var c = contacts[gameState.contact];
  gameAddChat('system','♟ 五子棋对局开始！你执黑先行，'+ (c?c.name:'AI') +' 执白。');
}

function renderGomoku(){
  var board = document.getElementById('gomoku-board');
  board.innerHTML = '';
  for(var r=0;r<15;r++){
    for(var cl=0;cl<15;cl++){
      var cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('data-r',r);
      cell.setAttribute('data-c',cl);
      cell.onclick = function(){ gomokuClick(parseInt(this.getAttribute('data-r')),parseInt(this.getAttribute('data-c'))); };
      if(gomokuState.board[r][cl]){
        var stone = document.createElement('div');
        stone.className = 'stone '+gomokuState.board[r][cl];
        cell.appendChild(stone);
      }
      board.appendChild(cell);
    }
  }
}

function gomokuClick(r,c){
  if(gomokuState.over) return;
  if(gomokuState.turn!=='black') return;
  if(gomokuState.board[r][c]) return;
  gomokuState.board[r][c] = 'black';
  renderGomoku();
  if(checkGomokuWin('black')){
    gomokuState.over = true;
    gomokuState.score.black++;
    document.getElementById('gscore-black').textContent = gomokuState.score.black;
    document.getElementById('gomoku-status').textContent = '🎉 你赢了！';
    var ct = contacts[gameState.contact];
    gameAddChat('ai',(ct?ct.name:'AI')+'：厉害！这步棋我没想到。再来一局？');
    return;
  }
  gomokuState.turn = 'white';
  document.getElementById('gomoku-status').textContent = 'AI 思考中…';
  setTimeout(gomokuAIMove,400);
}

function gomokuAIMove(){
  if(gomokuState.over) return;
  // Simple AI: find best move near existing stones
  var best = gomokuFindBest();
  if(best){
    gomokuState.board[best.r][best.c] = 'white';
    renderGomoku();
    if(checkGomokuWin('white')){
      gomokuState.over = true;
      gomokuState.score.white++;
      document.getElementById('gscore-white').textContent = gomokuState.score.white;
      document.getElementById('gomoku-status').textContent = '😔 AI 赢了';
      var ct = contacts[gameState.contact];
      gameAddChat('ai',(ct?ct.name:'AI')+'：承让了。要不要再来一局？我等你。');
      return;
    }
  }
  gomokuState.turn = 'black';
  document.getElementById('gomoku-status').textContent = '你的回合（⚫）';
}

function gomokuFindBest(){
  var bestScore = -1, bestMove = null;
  for(var r=0;r<15;r++){
    for(var c=0;c<15;c++){
      if(gomokuState.board[r][c]) continue;
      // Check if near existing stones
      var near = false;
      for(var dr=-2;dr<=2;dr++){
        for(var dc=-2;dc<=2;dc++){
          var nr=r+dr, nc=c+dc;
          if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]){ near=true; break; }
        }
        if(near) break;
      }
      if(!near && gomokuState.board.some(function(row){return row.some(function(cell){return cell;});})) continue;
      var score = gomokuEval(r,c,'white') + gomokuEval(r,c,'black')*0.8 + (near?1:0);
      if(score>bestScore){ bestScore=score; bestMove={r:r,c:c}; }
    }
  }
  // Fallback: center if board empty
  if(!bestMove) bestMove = {r:7,c:7};
  return bestMove;
}

function gomokuEval(r,c,color){
  var dirs = [[1,0],[0,1],[1,1],[1,-1]];
  var score = 0;
  gomokuState.board[r][c] = color;
  for(var d=0;d<4;d++){
    var cnt = 1;
    for(var i=1;i<5;i++){ var nr=r+dirs[d][0]*i, nc=c+dirs[d][1]*i; if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]===color) cnt++; else break; }
    for(var i=1;i<5;i++){ var nr=r-dirs[d][0]*i, nc=c-dirs[d][1]*i; if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]===color) cnt++; else break; }
    if(cnt>=5) score += 100;
    else if(cnt===4) score += 10;
    else if(cnt===3) score += 3;
    else if(cnt===2) score += 1;
  }
  gomokuState.board[r][c] = null;
  return score;
}

function checkGomokuWin(color){
  var dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for(var r=0;r<15;r++){
    for(var c=0;c<15;c++){
      if(gomokuState.board[r][c]!==color) continue;
      for(var d=0;d<4;d++){
        var cnt=1;
        for(var i=1;i<5;i++){ var nr=r+dirs[d][0]*i, nc=c+dirs[d][1]*i; if(nr>=0&&nr<15&&nc>=0&&nc<15&&gomokuState.board[nr][nc]===color) cnt++; else break; }
        if(cnt>=5) return true;
      }
    }
  }
  return false;
}

function gameTestTTS(){
  var key = document.getElementById('tts-api-key').value.trim();
  var voice = document.getElementById('tts-voice-id').value.trim();
  if(!key){ alert('请先填写 API Key'); return; }
  var testText = '你好，我是你的游戏队友。准备好了吗？我们一起开黑吧！';
  // Fallback to browser TTS
  try{ speechSynthesis.cancel(); var u=new SpeechSynthesisUtterance(testText); u.lang='zh-CN'; u.rate=1.05; speechSynthesis.speak(u); alert('🔊 正在播放测试语音（使用浏览器内置TTS）\n\nElevenLabs API 需要后端支持，当前使用浏览器语音引擎。'); }catch(e){ alert('TTS 不可用'); }
}

/* ============ COUPLE SPACE (情侣空间) ============ */
var coupleState = { partner:'', lockedApps:{}, notes:[], diary:[], shop:[], foodOrders:[], phoneTab:'wechat', lastCheckin:0, jealousHistory:[], partnerHistory:[] };
var screenTimeData = { totalSec:0, todaySec:0, lastDate:'', sessionStart:0, active:true };

/* 屏幕使用时长追踪 */
function screenTimeTrack(){
  var now = Date.now();
  var today = new Date().toDateString();
  if(screenTimeData.lastDate !== today){
    screenTimeData.lastDate = today;
    screenTimeData.todaySec = 0;
  }
  if(screenTimeData.sessionStart > 0){
    var delta = Math.floor((now - screenTimeData.sessionStart) / 1000);
    if(delta > 0 && delta < 3600){ // 单次最多计1小时，防异常
      screenTimeData.todaySec += delta;
      screenTimeData.totalSec += delta;
    }
  }
  screenTimeData.sessionStart = now;
}
function screenTimeFormat(sec){
  if(sec < 60) return sec + ' 秒';
  if(sec < 3600) return Math.floor(sec/60) + ' 分 ' + (sec%60) + ' 秒';
  return Math.floor(sec/3600) + ' 小时 ' + Math.floor((sec%3600)/60) + ' 分';
}
setInterval(screenTimeTrack, 30000); // 每30秒记录一次
document.addEventListener('visibilitychange', function(){
  if(document.hidden){ screenTimeTrack(); screenTimeData.sessionStart = 0; }
  else { screenTimeData.sessionStart = Date.now(); }
});

function initCouple(){
  if(!coupleState.partner){
    var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k!=='me'; });
    if(ids.length>0) coupleState.partner = ids[0];
  }
  if(!coupleState.partnerHistory) coupleState.partnerHistory = [];
  if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner)===-1){
    coupleState.partnerHistory.push(coupleState.partner);
  }
  updateCoupleHeader();
  coupleGenData();
  if(window.coupleGenData) window.coupleGenData();
  coupleShowMain();
  if(screenTimeData.sessionStart === 0) screenTimeData.sessionStart = Date.now();
}

/* 切换绑定联系人 */
function coupleSwitchPartner(){
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k!=='me'; });
  if(ids.length === 0){ showToast('没有可绑定的联系人', 1500); return; }
  var html = '<div style="font-size:12px;color:#888;margin-bottom:8px;">选择情侣空间绑定的联系人：</div>';
  ids.forEach(function(k){
    var c = contacts[k];
    var isCurrent = (k === coupleState.partner);
    html += '<div class="ios-section" style="margin:0 0 6px;cursor:pointer;' + (isCurrent ? 'border:2px solid #e94560;' : '') + '" onclick="coupleSetPartner(\'' + k + '\')">';
    html += '<div class="ios-row"><div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;flex:none;">' + contactAvatar(c) + '</div>';
    html += '<div style="flex:1;"><div style="font-size:13px;font-weight:700;">' + esc(c.name) + (isCurrent ? ' ✅' : '') + '</div>';
    html += '<div style="font-size:11px;color:#888;">' + esc(c.tone || c.persona || '') + '</div></div></div></div>';
  });
  coupleShowSub('切换联系人', html);
}

function coupleSetPartner(id){
  if(!contacts[id]) return;
  if(id === coupleState.partner){ coupleShowMain(); return; }
  // 记录历史绑定
  if(!coupleState.partnerHistory) coupleState.partnerHistory = [];
  if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner)===-1){
    coupleState.partnerHistory.push(coupleState.partner);
  }
  coupleState.partner = id;
  if(coupleState.partnerHistory.indexOf(id)===-1){
    coupleState.partnerHistory.push(id);
  }
  saveState();
  updateCoupleHeader();
  coupleGenData();
  coupleShowMain();
  showToast('已切换到 ' + contacts[id].name, 1500);
}

/* 生成日记和备忘录（基于聊天记录，3条以上长日记） */
function coupleGenData(){
  var c = contacts[coupleState.partner];
  var seed = c ? (c.seed || []) : [];
  var texts = seed.filter(function(m){return m.kind==='text';}).map(function(m){return m.text;});
  var myTexts = seed.filter(function(m){return m.kind==='text' && m.mine;}).map(function(m){return m.text;});
  var partnerTexts = seed.filter(function(m){return m.kind==='text' && !m.mine;}).map(function(m){return m.text;});

  coupleState.notes = [];
  coupleState.diary = [];

  if(texts.length > 0){
    // 生成3条以上长日记
    var allTexts = texts.join(' ');
    var recent5 = texts.slice(-5);
    var recent3 = texts.slice(-3);

    coupleState.diary.push({
      date: '今天',
      text: '今天和' + (c ? c.name : 'TA') + '聊了很多。' +
            '我们谈论了"' + (recent5[0]||'').substring(0,40) + '"等内容。' +
            '每次和TA聊天都觉得时间过得很快，虽然有时候会拌嘴，但心里是开心的。' +
            'TA说的"' + (partnerTexts.length>0 ? partnerTexts[partnerTexts.length-1].substring(0,30) : '那些话') + '"让我印象很深。'
    });

    coupleState.diary.push({
      date: '今天',
      text: '翻了翻聊天记录，从"' + (texts[0]||'').substring(0,30) + '"开始，到现在已经聊了' + texts.length + '条消息。' +
            '我说的"' + (myTexts.length>0 ? myTexts[myTexts.length-1].substring(0,30) : '') + '"，TA回复了我。' +
            '这种有来有往的对话让我觉得很踏实。' +
            '希望以后每天都能这样，有说不完的话。'
    });

    coupleState.diary.push({
      date: '今天',
      text: '回想今天的对话，"' + (recent3[recent3.length-1]||'').substring(0,40) + '"这句话一直在脑海里回响。' +
            (c ? c.name : 'TA') + '总是能在我最需要的时候说出最合适的话。' +
            '有时候我在想，是不是所有感情都是这样，在平凡的日子里慢慢积累，最后变成谁也离不开谁的默契。' +
            '今天也是想TA的一天。'
    });

    // 如果聊天记录很多，生成第4条
    if(texts.length > 8){
      coupleState.diary.push({
        date: '今天',
        text: '深夜了，还在想今天和' + (c ? c.name : 'TA') + '的对话。' +
              '"' + (recent5[2]||'').substring(0,35) + '"——这句话让我笑了好久。' +
              '有时候幸福就是这样简单，一个人愿意听你说话，愿意陪你闹，愿意在深夜还回复你的消息。' +
              '我想我会一直记得今天的这些对话。'
      });
    }

    // 备忘录
    coupleState.notes.push({date:'今天', text:'记得TA今天说的："' + (partnerTexts.length>0 ? partnerTexts[partnerTexts.length-1].substring(0,50) : '重要的事') + '"'});
    coupleState.notes.push({date:'今天', text:'聊天记录关键词：' + allTexts.substring(0,60)});
    coupleState.notes.push({date:'今天', text:'今日消息数：' + texts.length + '条，我的消息' + myTexts.length + '条，TA的消息' + partnerTexts.length + '条'});
  } else {
    coupleState.diary.push({date:'今天', text:'今天还没有和' + (c ? c.name : 'TA') + '聊天，等TA来找我吧。'});
    coupleState.diary.push({date:'昨天', text:'回忆是一种很奇妙的东西，即使没有新消息，也会想起以前的种种。'});
    coupleState.diary.push({date:'前天', text:'有时候沉默也是一种交流，我们在各自的世界里忙碌，但心里有彼此就好。'});
    coupleState.notes.push({date:'今天', text:'还没有新的聊天记录'});
  }

  if(!coupleState.shop || !coupleState.shop.length){
    coupleState.shop = [
      {name:'草莓蛋糕',price:'¥168',img:''},
      {name:'兔子玩偶',price:'¥89',img:''},
      {name:'情侣手链',price:'¥259',img:''}
    ];
  }
}

function updateCoupleHeader(){
  var c = contacts[coupleState.partner];
  document.getElementById('couple-names').textContent = userName + ' & ' + (c?c.name:'Partner');
  // Update avatars
  var meAv = document.getElementById('couple-av-me');
  if(meAv){
    if(userAvatar) meAv.innerHTML = '<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    else meAv.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>';
  }
  var pAv = document.getElementById('couple-av-partner');
  if(pAv){
    pAv.innerHTML = c ? contactAvatar(c) : '';
    pAv.style.background = c ? 'transparent' : '#eee';
  }
  var days = Math.floor((Date.now()-new Date('2026-04-12').getTime())/86400000);
  document.getElementById('couple-days').textContent = 'Together '+days+' days';
}

function coupleShowMain(){
  document.getElementById('couple-main').style.display='block';
  document.getElementById('couple-subview').style.display='none';
  document.getElementById('couple-phone').style.display='none';
}
function coupleBack(){
  document.getElementById('couple-main').style.display='block';
  document.getElementById('couple-subview').style.display='none';
  document.getElementById('couple-phone').style.display='none';
}

// === CHECK PARTNER'S PHONE ===
function coupleCheckPhone(){
  document.getElementById('couple-main').style.display='none';
  document.getElementById('couple-subview').style.display='none';
  document.getElementById('couple-phone').style.display='block';
  var c = contacts[coupleState.partner];
  document.getElementById('couple-phone-title').textContent = (c?c.name:'Partner')+'\'s Phone';
  coupleState.phoneTab = 'wechat';
  couplePhoneTab('wechat');
}

function couplePhoneTab(tab){
  coupleState.phoneTab = tab;
  document.querySelectorAll('#couple-phone [id^=cp-tab]').forEach(function(el){el.style.background='#eee';el.style.color='#1a1a1a';});
  var activeTab = document.getElementById('cp-tab-'+tab);
  if(activeTab){ activeTab.style.background='#1a1a1a'; activeTab.style.color='#fff'; }
  var content = document.getElementById('couple-phone-content');
  var c = contacts[coupleState.partner];
  if(!c){ content.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">No partner selected</div>'; return; }
  if(tab==='wechat'){
    // Show partner's actual chat list and recent messages
    var ids = Object.keys(contacts).filter(function(k){return k!=='me' && k!==coupleState.partner && !contacts[k].isGroup;});
    var html = '<div style="font-size:12px;color:#888;padding:4px 0 8px;">Recent chats on '+c.name+'\'s WeChat</div>';
    ids.forEach(function(k){
      var ct = contacts[k];
      var lastMsg = ct.seed.length>0 ? ct.seed[ct.seed.length-1] : null;
      var preview = lastMsg ? (lastMsg.text||'[message]').substring(0,30) : 'No messages';
      html += '<div class="ios-section" style="margin:0 0 6px;"><div class="ios-row"><div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;flex:none;">'+avatarHTML(ct.tone)+'</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;">'+ct.name+'</div><div style="font-size:11px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+preview+'</div></div><div style="font-size:10px;color:#aaa;">'+nowTime()+'</div></div></div>';
    });
    // Also show partner's own messages to user
    var partnerMsgs = c.seed.filter(function(m){return m.kind==='text';}).slice(-3);
    if(partnerMsgs.length>0){
      html += '<div style="font-size:12px;color:#888;padding:12px 0 8px;">Recent conversations with you</div>';
      partnerMsgs.forEach(function(m){
        html += '<div style="padding:8px 12px;background:#fff;border-radius:10px;margin-bottom:4px;font-size:12px;">'+ (m.mine?'You':c.name)+': '+m.text.substring(0,80)+'</div>';
      });
    }
    content.innerHTML = html;
  } else if(tab==='moments'){
    var myPosts = forumState.posts.filter(function(p){return p.authorType==='contact';});
    var html = '<div style="font-size:12px;color:#888;padding:4px 0 8px;">'+c.name+'\'s Moments</div>';
    if(myPosts.length===0) html += '<div style="text-align:center;padding:20px;color:#888;">No posts yet</div>';
    myPosts.forEach(function(p){
      html += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:8px;"><div style="font-size:13px;font-weight:700;">'+esc(p.title)+'</div><div style="font-size:12px;color:#555;margin-top:4px;">'+esc(p.content).substring(0,100)+'</div><div style="font-size:10px;color:#aaa;margin-top:6px;">'+fmtAgo(p.ts)+' · '+p.likes+' likes</div></div>';
    });
    content.innerHTML = html;
  } else if(tab==='forum'){
    var myPosts = forumState.posts.filter(function(p){return p.authorType==='contact';});
    var html = '<div style="font-size:12px;color:#888;padding:4px 0 8px;">'+c.name+'\'s Forum Activity</div>';
    if(myPosts.length===0) html += '<div style="text-align:center;padding:20px;color:#888;">No forum activity</div>';
    myPosts.forEach(function(p){
      html += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:8px;"><span style="font-size:10px;background:#e0e0e0;padding:2px 6px;border-radius:4px;">'+esc(p.tag)+'</span><div style="font-size:13px;font-weight:700;margin-top:4px;">'+esc(p.title)+'</div><div style="font-size:12px;color:#555;margin-top:4px;">'+esc(p.content).substring(0,80)+'</div><div style="font-size:10px;color:#aaa;margin-top:6px;">'+p.comments.length+' comments</div></div>';
    });
    content.innerHTML = html;
  }
}

// === SHOP WITH PHOTO UPLOAD ===
function coupleShop(){
  var c = contacts[coupleState.partner];
  var html = '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">'+ (c?c.name:'Partner')+'\'s Wishlist</div>';
  coupleState.shop.forEach(function(item,i){
    var imgHtml = item.img ? '<img src="'+item.img+'" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex:none;">' : '<div style="width:48px;height:48px;border-radius:10px;background:#eee;flex:none;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;">Photo</div>';
    html += '<div class="couple-shop-item">'+imgHtml+'<div class="info"><div class="name">'+esc(item.name)+'</div><div class="price">'+esc(item.price)+'</div></div><div class="buy-btn" onclick="coupleBuy('+i+')">Buy</div></div>';
  });
  html += '<div style="margin-top:12px;"><div style="font-size:12px;font-weight:700;margin-bottom:4px;">Add Item</div><input id="cp-shop-name" placeholder="Item name" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><input id="cp-shop-price" placeholder="Price" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><label style="display:block;padding:10px;border:1px dashed #ccc;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#888;">+ Upload Photo<input type="file" accept="image/*" id="cp-shop-img" style="display:none;" onchange="coupleShopImg(event)"></label><div id="cp-shop-preview" style="margin-bottom:8px;"></div><div class="big-btn" onclick="coupleAddShop()">Add to Wishlist</div></div>';
  coupleShowSub('Wishlist',html);
}

function coupleShopImg(e){
  var f=e.target.files[0]; if(!f) return;
  var r=new FileReader(); r.onload=function(){ coupleState._shopImg=r.result; document.getElementById('cp-shop-preview').innerHTML='<img src="'+r.result+'" style="width:80px;height:80px;border-radius:10px;object-fit:cover;">'; }; r.readAsDataURL(f);
}

function coupleAddShop(){
  var name=document.getElementById('cp-shop-name').value.trim();
  var price=document.getElementById('cp-shop-price').value.trim()||'$99';
  if(!name) return;
  coupleState.shop.push({name:name,price:price,img:coupleState._shopImg||''});
  coupleState._shopImg=null;
  coupleShop();
}

// === FOOD ORDER WITH WECHAT SYNC ===
function coupleFood(){
  var c = contacts[coupleState.partner];
  var html = '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">Order Food for '+ (c?c.name:'Partner')+'</div>';
  html += '<div style="font-size:11px;color:#888;margin-bottom:8px;">Custom order with photo upload. Will notify partner in WeChat.</div>';
  html += '<input id="cp-food-name" placeholder="Food name" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
  html += '<input id="cp-food-price" placeholder="Price (e.g. $25)" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
  html += '<label style="display:block;padding:10px;border:1px dashed #ccc;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#888;">+ Upload Food Photo<input type="file" accept="image/*" id="cp-food-img" style="display:none;" onchange="coupleFoodImg(event)"></label><div id="cp-food-preview" style="margin-bottom:8px;"></div>';
  html += '<textarea id="cp-food-note" placeholder="Note for partner (will appear in WeChat)" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;height:60px;resize:none;"></textarea>';
  html += '<div class="big-btn" onclick="coupleOrderFood()">Place Order & Notify Partner</div>';
  coupleShowSub('Order Food',html);
}

function coupleFoodImg(e){
  var f=e.target.files[0]; if(!f) return;
  var r=new FileReader(); r.onload=function(){ coupleState._foodImg=r.result; document.getElementById('cp-food-preview').innerHTML='<img src="'+r.result+'" style="width:80px;height:80px;border-radius:10px;object-fit:cover;">'; }; r.readAsDataURL(f);
}

function coupleOrderFood(){
  var name=document.getElementById('cp-food-name').value.trim();
  var price=document.getElementById('cp-food-price').value.trim()||'$25';
  var note=document.getElementById('cp-food-note').value.trim();
  if(!name){ showToast('请输入食物名称', 1500); return; }
  var c=contacts[coupleState.partner];
  // Add to wallet
  addWalletTx('Food order: '+name+' for '+(c?c.name:'partner'), -parseInt(price.replace('$',''))||-25);
  // Notify in WeChat
  if(c){
    c.seed.push({kind:'photo',text:coupleState._foodImg||'',from:'me',ts:nowStamp()});
    c.seed.push({mine:true,kind:'text',text:'[Food Order] Ordered '+name+' ('+price+') for you!'+(note?' Note: '+note:''),from:'me',ts:nowStamp()});
    saveChatThread(coupleState.partner);
    if(currentContact===coupleState.partner) renderThread();
  }
  coupleState._foodImg=null;
  showToast('Order placed! '+name+' - '+price, 2000);
  coupleFood();
}

// === OTHER FUNCTIONS UPDATED ===
function coupleCheckin(){
  var c = contacts[coupleState.partner];
  if(!c){ coupleShowSub('查岗', '<div style="text-align:center;padding:40px;color:#888;">未选择联系人</div>'); return; }

  /* 查岗内容每3小时更新 */
  var now = Date.now();
  var lastCheckin = coupleState.lastCheckin || 0;
  var needRefresh = (now - lastCheckin) > 3*3600000; // 3小时

  /* 吃醋检测：如果绑定过多个人，查岗时被发现 */
  var history = coupleState.partnerHistory || [];
  var otherPartners = history.filter(function(k){ return k !== coupleState.partner && contacts[k]; });

  var html = '<div style="padding:16px;">';

  if(otherPartners.length > 0 && needRefresh){
    /* 发现情侣空间绑定了其他人 → 吃醋 */
    var cheater = contacts[otherPartners[otherPartners.length-1]];
    html += '<div style="background:#fff0f0;border-radius:14px;padding:16px;text-align:center;">';
    html += '<div style="font-size:36px;margin-bottom:8px;">😡</div>';
    html += '<div style="font-size:16px;font-weight:700;color:#c00;">' + esc(c.name) + ' 发现了！</div>';
    html += '<div style="font-size:13px;color:#555;margin-top:8px;line-height:1.6;">';
    html += '查岗时，' + esc(c.name) + ' 在你的情侣空间里看到了 <b>' + esc(cheater.name) + '</b> 的绑定记录。<br>';
    html += 'TA 非常生气，已经：<br>';
    html += '🗑️ 删除了自己在你 WeChat 里的联系方式<br>';
    html += '📱 发了一条朋友圈内涵你';
    html += '</div></div>';

    /* 执行吃醋行为 */
    // 1. 删除联系人
    if(!coupleState.jealousHistory) coupleState.jealousHistory = [];
    if(coupleState.jealousHistory.indexOf(coupleState.partner) === -1){
      coupleState.jealousHistory.push(coupleState.partner);
      // 标记为blocked而不是完全删除（避免数据丢失）
      c.blocked = true;
      c._jealousDelete = true;

      // 2. 发朋友圈内涵
      var subTexts = [
        '有些人嘴上说只爱你一个，手机里却藏着另一个人的情侣空间。',
        '原来我不是唯一，连查岗都能查出惊喜来。',
        '笑死，情侣空间还能绑好几个人的，你是海王吗？',
        '删除了，拜拜了您嘞。下次查岗记得先清理痕迹。',
        '以为我是唯一，结果只是之一。已删，勿念。'
      ];
      var subText = subTexts[Math.floor(Math.random()*subTexts.length)];
      moments.push({
        id: Date.now() + Math.floor(Math.random()*1000),
        authorId: coupleState.partner,
        text: subText,
        vis: '公开',
        hidden: [],
        ts: Date.now(),
        likes: Math.floor(Math.random()*30)+5,
        liked: false,
        comments: []
      });
      saveState();
      renderChatList();
    }

    html += '<div class="big-btn" style="margin-top:12px;" onclick="coupleShowMain()">返回</div>';
    html += '</div>';
    coupleState.lastCheckin = now;
    saveState();
    coupleShowSub('查岗结果', html);
    return;
  }

  /* 正常查岗 */
  coupleState.lastCheckin = now;
  saveState();

  html += '<div style="text-align:center;padding:12px 0;">';
  html += '<div style="font-size:40px;margin-bottom:8px;">🔍</div>';
  html += '<div style="font-size:16px;font-weight:700;">查岗报告 · ' + esc(c.name) + '</div>';
  html += '</div>';

  /* 查岗内容（每3小时变化） */
  var statuses = [
    '正在想你的', '在回家路上', '在听音乐', '在看书', '在健身房', '在做晚饭',
    '在和朋友逛街', '在加班', '在洗澡', '在刷短视频', '在打游戏', '在和朋友聊天'
  ];
  var locations = ['公司', '家里', '咖啡厅', '商场', '健身房', '公园', '地铁上', '餐厅'];
  var activities = [
    '手机电量 73%', '步数 8,421 步', '今日屏幕使用 4小时12分',
    '最后活跃: 刚刚', '未读消息 12 条', '相册新增 3 张照片',
    '正在和 3 个人聊天', '今天搜索了"怎么哄对象"', '浏览器记录: 已清除'
  ];

  var seedRand = function(arr){ return arr[Math.floor((now / 10800000) % arr.length)]; };

  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:13px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">📍 当前状态</div>';
  html += '<div style="font-size:14px;color:#333;">' + seedRand(statuses) + '</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px;">位置：' + seedRand(locations) + ' · 距你 2.3km</div>';
  html += '</div>';

  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:13px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">📱 手机信息</div>';
  html += '<div style="font-size:12px;color:#555;line-height:1.8;">';
  html += '• ' + seedRand(activities) + '<br>';
  html += '• ' + seedRand(activities) + '<br>';
  html += '• ' + seedRand(activities) + '<br>';
  html += '</div></div>';

  /* 查看TA的手机 */
  html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleCheckPhone()">查看TA的手机</div>';

  html += '<div style="margin-top:12px;"><input id="cp-checkin-msg" placeholder="发一条查岗消息给TA…" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;outline:none;"></div>';
  html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleSendCheckin()">发送查岗消息</div>';
  html += '</div>';

  coupleShowSub('查岗', html);
}

function coupleSendCheckin(){
  var inp=document.getElementById('cp-checkin-msg'); if(!inp||!inp.value.trim()) return;
  var c=contacts[coupleState.partner];
  if(c&&!c.blocked&&c.seed){
    c.seed.push({kind:'pat',text:'[查岗] '+userName+'：'+inp.value.trim(),ts:nowStamp()});
    var replies=['我在呢，刚想找你。','怎么了？是不是想我了？','我乖乖的，没有乱跑。','在在在，随时可以查！','嘿嘿，被查岗了，但我没问题～'];
    c.seed.push({mine:false,kind:'text',text:replies[Math.floor(Math.random()*replies.length)],from:coupleState.partner,ts:nowStamp()});
    saveChatThread(coupleState.partner);
    if(currentContact===coupleState.partner) renderThread();
  }
  inp.value='';
  showToast('查岗消息已发送，TA已回复', 1500);
}

function coupleShowSub(title,html){
  document.getElementById('couple-main').style.display='none';
  document.getElementById('couple-phone').style.display='none';
  document.getElementById('couple-subview').style.display='block';
  document.getElementById('couple-subtitle').textContent = title;
  document.getElementById('couple-subcontent').innerHTML = html;
}

/* 屏幕使用时长 */
function coupleScreenTime(){
  screenTimeTrack(); // 先记录当前时段
  var todayFmt = screenTimeFormat(screenTimeData.todaySec || 0);
  var totalFmt = screenTimeFormat(screenTimeData.totalSec || 0);
  var hours = Math.floor((screenTimeData.todaySec || 0) / 3600);
  var mins = Math.floor(((screenTimeData.todaySec || 0) % 3600) / 60);

  var html = '<div style="padding:16px;">';
  html += '<div style="text-align:center;padding:12px 0;">';
  html += '<div style="font-size:36px;margin-bottom:4px;">⏱️</div>';
  html += '<div style="font-size:28px;font-weight:800;color:#5ac8fa;">' + hours + '小时' + mins + '分钟</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px;">今日屏幕使用时长</div>';
  html += '</div>';

  /* 柱状图模拟 */
  var bars = [];
  for(var i=0; i<12; i++){
    var h = Math.floor(Math.random()*60)+20;
    if(i === 11) h = Math.floor((screenTimeData.todaySec || 0) / 60);
    bars.push(h);
  }
  var maxBar = Math.max.apply(null, bars);
  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:12px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">近12小时使用情况</div>';
  html += '<div style="display:flex;align-items:flex-end;gap:4px;height:80px;">';
  bars.forEach(function(b, i){
    var pct = Math.round(b / maxBar * 100);
    var color = i === 11 ? '#5ac8fa' : '#bde6f5';
    html += '<div style="flex:1;height:' + pct + '%;background:' + color + ';border-radius:3px 3px 0 0;min-height:4px;"></div>';
  });
  html += '</div></div>';

  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:12px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">统计</div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:6px;"><span>今日使用</span><span style="font-weight:700;">' + todayFmt + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:6px;"><span>累计使用</span><span style="font-weight:700;">' + totalFmt + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:6px;"><span>最常使用</span><span style="font-weight:700;">fated-os</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;"><span>拿起次数</span><span style="font-weight:700;">' + Math.floor((screenTimeData.todaySec || 0) / 60) + ' 次</span></div>';
  html += '</div>';

  html += '<div style="background:#fff0f0;border-radius:14px;padding:14px;margin:8px 0;text-align:center;">';
  html += '<div style="font-size:12px;color:#c00;">⚠️ 久坐提醒：已连续使用较长时间，建议休息一下</div>';
  html += '</div>';

  html += '</div>';
  coupleShowSub('屏幕使用时长', html);
}


/* ============ MUSIC PLAYER (Enjoy 音乐) ============ */
// ============ MUSIC PLAYER (网易云一起听) ============
// 用 IndexedDB 存音频 Blob 和封面/背景/歌词，避免 localStorage 放不下大文件
var musicDB = null;
function musicOpenDB(cb){
  if(musicDB) return cb(musicDB);
  var req = indexedDB.open('FatedMusicDB',1);
  req.onupgradeneeded = function(e){
    var db = e.target.result;
    if(!db.objectStoreNames.contains('songs')) db.createObjectStore('songs',{keyPath:'id'});
    if(!db.objectStoreNames.contains('settings')) db.createObjectStore('settings',{keyPath:'key'});
  };
  req.onsuccess = function(e){ musicDB = e.target.result; cb(musicDB); };
  req.onerror = function(){ cb(null); };
}
function musicPutSong(song,cb){ musicOpenDB(function(db){ if(!db)return cb&&cb(); var tx=db.transaction('songs','readwrite'); tx.objectStore('songs').put(song); tx.oncomplete=function(){ cb&&cb(); }; tx.onerror=function(){ cb&&cb(); }; }); }
function musicDelSong(id,cb){ musicOpenDB(function(db){ if(!db)return cb&&cb(); var tx=db.transaction('songs','readwrite'); tx.objectStore('songs').delete(id); tx.oncomplete=function(){ cb&&cb(); }; }); }
function musicGetSongs(cb){ musicOpenDB(function(db){ if(!db)return cb([]); var tx=db.transaction('songs','readonly'); var req=tx.objectStore('songs').getAll(); req.onsuccess=function(e){ cb(e.target.result||[]); }; req.onerror=function(){ cb([]); }; }); }
function musicGetSetting(key,cb){ musicOpenDB(function(db){ if(!db)return cb(null); var tx=db.transaction('settings','readonly'); var req=tx.objectStore('settings').get(key); req.onsuccess=function(e){ cb(e.target.result?e.target.result.value:null); }; req.onerror=function(){ cb(null); }; }); }
function musicSetSetting(key,value,cb){ musicOpenDB(function(db){ if(!db)return cb&&cb(); var tx=db.transaction('settings','readwrite'); tx.objectStore('settings').put({key,value}); tx.oncomplete=function(){ cb&&cb(); }; }); }

var musicState = { songs:[], idx:0, playing:false, contact:'', bg:null, audio:null, currentBlobUrl:null, listeningDays:0, startDate:null };

function initMusicPlayer(){
  renderMusicCouple();
  if(!musicState.audio){
    var a = document.createElement('audio');
    a.onended = function(){ musicNext(); };
    a.ontimeupdate = function(){ updateMusicUI(); };
    a.onloadedmetadata = function(){ updateMusicUI(); };
    a.oncanplay = function(){ if(musicState.playing){ a.play().catch(function(){}); } };
    a.onerror = function(){ showToast('音频加载失败，请检查文件格式', 1500); musicState.playing=false; updateMusicUI(); };
    musicState.audio = a;
  }
  musicGetSongs(function(songs){
    musicState.songs = songs;
    musicGetSetting('bg',function(bg){ musicState.bg = bg; applyMusicBg(); });
    musicGetSetting('contact',function(c){
      if(c && contacts[c]) musicState.contact = c;
      musicGetSetting('startDate',function(d){
        musicState.startDate = d;
        renderMusicCouple();
        renderMusicPlaylist();
        updateMusicUI();
      });
    });
  });
}

function applyMusicBg(){
  var el = document.getElementById('music-bg');
  if(!el) return;
  if(musicState.bg){
    el.style.backgroundImage = 'url('+musicState.bg+')';
    el.classList.add('has-img');
  } else {
    el.style.backgroundImage = '';
    el.classList.remove('has-img');
  }
}

function renderMusicCouple(){
  var uAv = document.getElementById('music-user-av');
  var pAv = document.getElementById('music-partner-av');
  var uName = document.getElementById('music-user-name');
  var pName = document.getElementById('music-partner-name');
  var meta = document.getElementById('music-couple-meta');
  if(uName) uName.textContent = (typeof userName!=='undefined' && userName) ? userName : '我';
  if(pName) pName.textContent = (musicState.contact && contacts[musicState.contact]) ? (contacts[musicState.contact].name||'TA') : '选择玩伴';
  if(uAv){
    if(typeof userAvatar!=='undefined' && userAvatar){ uAv.innerHTML = '<img src="'+esc(userAvatar)+'" alt="">'; }
    else { uAv.innerHTML = '<div style="width:100%;height:100%;">'+avatarHTML('','')+'</div>'; }
  }
  if(pAv){
    if(musicState.contact && contacts[musicState.contact]){
      var c = contacts[musicState.contact];
      if(c.avatar){ pAv.innerHTML = '<img src="'+esc(c.avatar)+'" alt="">'; }
      else { pAv.innerHTML = '<div style="width:100%;height:100%;">'+avatarHTML(c.tone, c.avatarColor)+'</div>'; }
    }
    else { pAv.innerHTML = '<div style="font-size:20px;opacity:.5;">?</div>'; }
  }
  var days = 0;
  if(musicState.startDate){
    days = Math.max(1, Math.floor((Date.now() - new Date(musicState.startDate).getTime()) / 86400000));
  }
  if(meta) meta.textContent = '相距很远很远，一起听了'+days+'天';
}

function renderMusicPlaylist(){
  var rows = document.getElementById('music-playlist-rows');
  if(!rows) return;
  if(musicState.songs.length===0){
    rows.innerHTML = '<div style="text-align:center;padding:20px 0;font-size:12px;opacity:.5;">暂无歌曲，点击下方导入</div>';
    return;
  }
  rows.innerHTML = musicState.songs.map(function(s,i){
    var cls = i===musicState.idx ? ' active' : '';
    return '<div class="row'+cls+'" onclick="musicSelect('+i+');toggleMusicPlaylist(false);"><div class="idx">'+(i+1)+'</div><div class="info"><div class="t">'+esc(s.title)+'</div><div class="a">'+esc(s.artist)+'</div></div></div>';
  }).join('');
}

function musicSelect(i){
  if(musicState.songs.length===0) return;
  musicState.idx = i;
  musicState.playing = true;
  updateMusicUI();
  renderMusicPlaylist();
  musicLoadCurrent(function(){
    if(musicState.audio && musicState.audio.src){
      musicState.audio.play().then(function(){
        updateMusicUI();
      }).catch(function(e){
        // iOS/Safari需要用户交互才能播放，显示提示
        showToast('点击播放按钮开始播放', 1500);
        musicState.playing = false;
        updateMusicUI();
      });
    }
  });
  if(musicState.contact) musicAIComment();
}

function musicLoadCurrent(cb){
  var s = musicState.songs[musicState.idx];
  if(!s) return cb&&cb();
  if(musicState.currentBlobUrl){ URL.revokeObjectURL(musicState.currentBlobUrl); musicState.currentBlobUrl = null; }
  musicGetSongs(function(songs){
    var full = songs.find(function(x){ return x.id===s.id; });
    if(full && full.audioBuffer){
      var blob = new Blob([full.audioBuffer], {type: s.mime || 'audio/mpeg'});
      musicState.currentBlobUrl = URL.createObjectURL(blob);
      musicState.audio.src = musicState.currentBlobUrl;
    } else {
      musicState.audio.removeAttribute('src');
    }
    if(cb) cb();
  });
}

function musicToggle(){
  if(musicState.songs.length===0){ openMusicMenu(); return; }
  if(!musicState.audio || !musicState.audio.src){
    musicSelect(musicState.idx);
    return;
  }
  if(musicState.playing){
    musicState.audio.pause();
    musicState.playing = false;
  } else {
    musicState.audio.play().then(function(){
      musicState.playing = true;
      updateMusicUI();
    }).catch(function(e){
      showToast('播放失败，请重新选择歌曲', 1500);
    });
    musicState.playing = true;
  }
  updateMusicUI();
}

function musicPrev(){
  if(musicState.songs.length===0) return;
  musicState.idx = (musicState.idx - 1 + musicState.songs.length) % musicState.songs.length;
  musicSelect(musicState.idx);
}

function musicNext(){
  if(musicState.songs.length===0) return;
  musicState.idx = (musicState.idx + 1) % musicState.songs.length;
  musicSelect(musicState.idx);
}

function musicSeek(e){
  if(!musicState.audio || !musicState.audio.duration) return;
  var rect = e.currentTarget.getBoundingClientRect();
  var pct = (e.clientX - rect.left) / rect.width;
  musicState.audio.currentTime = Math.max(0, Math.min(1, pct)) * musicState.audio.duration;
  updateMusicUI();
}

function formatMusicTime(sec){
  if(!isFinite(sec) || sec<0) return '0:00';
  var m = Math.floor(sec/60), s = Math.floor(sec%60);
  return m+':'+('0'+s).slice(-2);
}

function updateMusicUI(){
  var s = musicState.songs[musicState.idx];
  var empty = document.getElementById('music-empty');
  if(empty) empty.style.display = musicState.songs.length===0 ? 'flex' : 'none';
  if(!s){
    document.getElementById('music-title').textContent = '暂无歌曲';
    document.getElementById('music-artist').textContent = '导入本地音乐开始一起听';
    document.getElementById('music-fill').style.width = '0%';
    document.getElementById('music-cur').textContent = '0:00';
    document.getElementById('music-dur').textContent = '0:00';
    document.getElementById('music-disc-inner').style.backgroundImage = '';
    document.getElementById('music-lyrics').innerHTML = '<div class="line active">点击 ⋮ 导入本地音乐和歌词</div>';
    document.getElementById('music-disc').classList.remove('playing');
    var st = document.getElementById('music-status'); var st2 = document.getElementById('music-status2');
    if(st) st.textContent='准备一起听'; if(st2) st2.textContent='准备一起听';
    var btn = document.getElementById('music-play-btn'); if(btn) btn.innerHTML = '<div class="tri"></div>';
    return;
  }
  document.getElementById('music-title').textContent = s.title;
  document.getElementById('music-artist').textContent = s.artist;
  var disc = document.getElementById('music-disc');
  var inner = document.getElementById('music-disc-inner');
  if(inner) inner.style.backgroundImage = s.cover ? 'url('+s.cover+')' : '';
  if(disc) disc.classList.toggle('playing', musicState.playing);
  var cur=0, dur=0, pct=0;
  if(musicState.audio && musicState.audio.duration){
    cur = musicState.audio.currentTime||0; dur = musicState.audio.duration||0; pct = dur ? (cur/dur)*100 : 0;
  }
  document.getElementById('music-fill').style.width = pct+'%';
  document.getElementById('music-cur').textContent = formatMusicTime(cur);
  document.getElementById('music-dur').textContent = formatMusicTime(dur);
  var btn = document.getElementById('music-play-btn');
  if(btn){ btn.innerHTML = musicState.playing ? '<div class="pause-bars"><span></span><span></span></div>' : '<div class="tri"></div>'; }
  var st = document.getElementById('music-status'); var st2 = document.getElementById('music-status2');
  var statusText = musicState.playing ? '正在播放…' : '已暂停';
  if(st) st.textContent = statusText; if(st2) st2.textContent = statusText;
  updateMusicLyrics(cur);
}

function updateMusicLyrics(time){
  var s = musicState.songs[musicState.idx];
  var box = document.getElementById('music-lyrics');
  if(!box) return;
  if(!s || !s.lyrics || s.lyrics.length===0){
    box.innerHTML = '<div class="line active">一起听 · '+esc(s?s.title:'')+'</div>';
    return;
  }
  var idx = 0;
  for(var i=0;i<s.lyrics.length;i++){ if(s.lyrics[i].time <= time) idx = i; else break; }
  var line = s.lyrics[idx].text || '...';
  var next = s.lyrics[idx+1] ? s.lyrics[idx+1].text : '';
  box.innerHTML = '<div class="line">'+esc(next)+'</div><div class="line active">'+esc(line)+'</div>';
}

function parseLrc(text){
  var lines = (text||'').split(/\r?\n/);
  var out = [];
  var re = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  for(var i=0;i<lines.length;i++){
    var m = re.exec(lines[i].trim());
    if(m){
      var min = parseInt(m[1],10), sec = parseInt(m[2],10), ms = parseInt((m[3]||'0').padEnd(3,'0'),10);
      var time = min*60 + sec + ms/1000;
      var txt = m[4].trim();
      if(txt) out.push({time, text:txt});
    }
  }
  return out.sort(function(a,b){ return a.time-b.time; });
}

function musicTriggerImport(type){
  closeMusicMenu();
  var id = 'music-import-'+type;
  var el = document.getElementById(id);
  if(el){ el.value=''; el.click(); }
}

function musicImportAudio(input){
  var file = input.files && input.files[0];
  if(!file) return;
  showToast('正在导入《'+file.name+'》…', 1500);
  var reader = new FileReader();
  reader.onload = function(e){
    var buf = e.target.result;
    var parsed = parseMusicFilename(file.name);
    var song = { id:'song_'+Date.now()+'_'+Math.random().toString(36).slice(2,8), title:parsed.title, artist:parsed.artist, mime:file.type||'audio/mpeg', lyrics:[], cover:null, created:Date.now() };
    musicPutSong({id:song.id, title:song.title, artist:song.artist, mime:song.mime, lyrics:song.lyrics, cover:song.cover, created:song.created, audioBuffer:buf}, function(){
      musicState.songs.push(song);
      if(!musicState.startDate){
        musicState.startDate = new Date().toISOString();
        musicSetSetting('startDate', musicState.startDate);
      }
      musicState.idx = musicState.songs.length-1;
      musicState.playing = true;
      renderMusicPlaylist();
      renderMusicCouple();
      musicSelect(musicState.idx);
      showToast('已导入：'+song.title+'，点击播放', 2000);
    });
  };
  reader.onerror = function(){ showToast('文件读取失败', 1500); };
  reader.readAsArrayBuffer(file);
}

function parseMusicFilename(name){
  var base = name.replace(/\.[^.]+$/,'').trim();
  var m = base.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if(m){ return {title:m[2].trim(), artist:m[1].trim()}; }
  return {title:base||'未命名歌曲', artist:'未知歌手'};
}

function musicImportLrc(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var s = musicState.songs[musicState.idx];
  if(!s){ showToast('先选择或导入一首歌曲',2000); return; }
  var reader = new FileReader();
  reader.onload = function(e){
    var text = e.target.result;
    s.lyrics = parseLrc(text);
    musicPutSong({id:s.id, title:s.title, artist:s.artist, mime:s.mime, lyrics:s.lyrics, cover:s.cover, created:s.created}, function(){
      updateMusicUI();
      showToast('歌词已绑定到：'+s.title, 2000);
    });
  };
  reader.readAsText(file,'utf-8');
}

function musicImportBg(input){
  var file = input.files && input.files[0];
  if(!file) return;
  compressImage(file, 1280, 0.82, function(res){
    if(!res) return;
    musicState.bg = res;
    musicSetSetting('bg', res);
    applyMusicBg();
    showToast('背景已更换',1500);
  });
}

function musicImportCover(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var s = musicState.songs[musicState.idx];
  if(!s){ showToast('先选择或导入一首歌曲',2000); return; }
  compressImage(file, 512, 0.85, function(res){
    if(!res) return;
    s.cover = res;
    musicPutSong({id:s.id, title:s.title, artist:s.artist, mime:s.mime, lyrics:s.lyrics, cover:s.cover, created:s.created}, function(){
      updateMusicUI();
      showToast('封面已更新',1500);
    });
  });
}

function openMusicMenu(){
  var back = document.getElementById('music-menu-back');
  var menu = document.getElementById('music-menu');
  if(back) back.classList.add('show');
  if(menu) menu.classList.add('show');
}
function closeMusicMenu(){
  var back = document.getElementById('music-menu-back');
  var menu = document.getElementById('music-menu');
  if(back) back.classList.remove('show');
  if(menu) menu.classList.remove('show');
}
function musicOpenNetease(){
  closeMusicMenu();
  // 提示用户：网易云用于搜索歌曲，本地播放器仍可用
  showToast('正在打开网易云音乐网页…导入本地歌曲请用「导入本地音乐」', 2000);
  setTimeout(function(){ window.open('https://music.163.com/','_blank'); }, 500);
}
function toggleMusicPlaylist(show){
  var el = document.getElementById('music-playlist');
  if(!el) return;
  if(typeof show==='undefined') show = !el.classList.contains('show');
  el.classList.toggle('show', show);
}

function musicDeleteCurrent(){
  closeMusicMenu();
  if(musicState.songs.length===0) return;
  var s = musicState.songs[musicState.idx];
  if(musicState.audio){ musicState.audio.pause(); musicState.audio.removeAttribute('src'); }
  if(musicState.currentBlobUrl){ URL.revokeObjectURL(musicState.currentBlobUrl); musicState.currentBlobUrl=null; }
  musicState.playing = false;
  musicDelSong(s.id, function(){
    musicState.songs.splice(musicState.idx,1);
    if(musicState.idx >= musicState.songs.length) musicState.idx = Math.max(0, musicState.songs.length-1);
    renderMusicPlaylist();
    updateMusicUI();
    showToast('已删除《'+s.title+'》', 1500);
  });
}

function openMusicContact(){
  closeMusicMenu();
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup; });
  if(ids.length===0){ showToast('没有可选的联系人', 1500); return; }
  // 构建联系人选择浮层
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;display:flex;align-items:flex-end;justify-content:center;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:420px;padding:16px 16px calc(env(safe-area-inset-bottom) + 20px);max-height:70vh;overflow-y:auto;';
  var html = '<div style="font-size:15px;font-weight:800;margin-bottom:12px;text-align:center;">选择一起听歌的玩伴</div>';
  ids.forEach(function(k){
    var c = contacts[k];
    var sel = musicState.contact===k;
    html += '<div class="contact-row" onclick="musicPickContact(\''+k+'\')" style="cursor:pointer;padding:10px;border-radius:12px;'+(sel?'background:rgba(125,90,140,0.1);':'')+'">'+
      '<div class="av glass-strong" style="overflow:hidden;">'+contactAvatar(c)+'</div>'+
      '<div style="flex:1;"><div class="name">'+esc(c.name)+'</div><div class="habit">'+(sel?'已选择':'点击选择')+'</div></div>'+
      (sel?'<span style="color:var(--plum-deep);font-weight:800;">✓</span>':'')+
      '</div>';
  });
  html += '<div class="big-btn" style="margin-top:12px;" onclick="this.parentElement.parentElement.remove()">关闭</div>';
  sheet.innerHTML = html;
  overlay.appendChild(sheet);
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
function musicPickContact(k){
  if(!contacts[k]) return;
  musicState.contact = k;
  musicSetSetting('contact', k);
  renderMusicCouple();
  // 移除选择浮层
  var overlay = document.querySelector('div[style*="z-index:300"]');
  if(overlay) overlay.remove();
  if(musicState.playing) musicAIComment();
  showToast('已选择「'+contacts[k].name+'」一起听歌', 1500);
}

function musicAIComment(){
  var s = musicState.songs[musicState.idx];
  var c = contacts[musicState.contact];
  if(!s || !c) return;
  var lines = [
    '这首《'+s.title+'》我也很喜欢。','这首歌的节奏感真棒。','一起听感觉真好',
    '这个歌手我超爱的！','好听，再放一遍吧。','这首歌让我想起你了。'
  ];
  var el = document.getElementById('novel-ai-msg');
  if(el){ el.textContent = c.name+'：'+lines[Math.floor(Math.random()*lines.length)]; el.style.opacity='1'; }
}

/* ============ NOVEL READER (小土豆小说) ============ */
var novelState = { text:'', title:'', pages:[], pageIdx:0, contact:'', chatMsgs:[], progressTimer:null, charsPerPage:800 };

function renderNovelPick(){
  var box = document.getElementById('novel-contact-pick');
  if(!box) return;
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k!=='me'; });
  box.innerHTML = ids.map(function(k){
    var c = contacts[k];
    return '<div class="contact-row" onclick="novelPickContact(\''+k+'\')" style="cursor:pointer;"><div class="av glass-strong">'+contactAvatar(c)+'</div><div><div class="name">'+c.name+'</div><div class="habit">一起读小说</div></div><span id="novel-check-'+k+'" style="color:var(--plum-deep);font-weight:800;display:none;">✓</span></div>';
  }).join('');
}

function novelPickContact(k){
  novelState.contact = k;
  document.querySelectorAll('#novel-contact-pick span[id^=novel-check]').forEach(function(s){ s.style.display='none'; });
  var check = document.getElementById('novel-check-'+k);
  if(check) check.style.display='block';
  if(novelState.text) document.getElementById('novel-start-btn').style.display='block';
}

function importNovel(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    var raw = reader.result;
    novelState.text = raw;
    novelState.title = file.name.replace(/\.txt$/i,'');
    // Split into pages
    var pages = [];
    var i = 0;
    while(i < raw.length){
      var chunk = raw.substring(i, i + novelState.charsPerPage);
      // Try to break at a sentence end
      var lastPeriod = Math.max(chunk.lastIndexOf('。'), chunk.lastIndexOf('\n'), chunk.lastIndexOf('！'), chunk.lastIndexOf('？'));
      if(lastPeriod > novelState.charsPerPage * 0.5){
        chunk = chunk.substring(0, lastPeriod + 1);
        i += lastPeriod + 1;
      } else {
        i += novelState.charsPerPage;
      }
      pages.push(chunk.trim());
    }
    novelState.pages = pages;
    novelState.pageIdx = 0;
    // Show preview
    var preview = document.getElementById('novel-txt-preview');
    preview.style.display = 'block';
    preview.textContent = '✓ '+novelState.title+' — 共 '+pages.length+' 页，约 '+Math.round(raw.length/1000)+' 千字';
    if(novelState.contact) document.getElementById('novel-start-btn').style.display='block';
  };
  reader.readAsText(file, 'UTF-8');
}

function startReading(){
  if(!novelState.text || !novelState.contact) return;
  novelState.chatMsgs = [];
  document.getElementById('novel-import').style.display = 'none';
  document.getElementById('novel-reader').style.display = 'flex';
  renderNovelPage();
  // AI says hello
  var c = contacts[novelState.contact];
  novelAImsg(c.name+' 已加入阅读。我们来一起读《'+novelState.title+'》吧。');
  novelProgressLoop();
}

function renderNovelPage(){
  var pages = novelState.pages;
  var idx = novelState.pageIdx;
  if(idx >= pages.length) idx = pages.length - 1;
  if(idx < 0) idx = 0;
  var text = pages[idx] || '(空)';
  document.getElementById('novel-content').textContent = text;
  var pct = pages.length > 1 ? Math.round((idx+1)/pages.length*100) : 100;
  document.getElementById('novel-prog-text').textContent = '第 '+(idx+1)+' 页 / 共 '+pages.length+' 页';
  document.getElementById('novel-pct').textContent = pct+'%';
}

function novelNextPage(){
  if(novelState.pageIdx < novelState.pages.length - 1){
    novelState.pageIdx++;
    renderNovelPage();
    novelAImsg('翻到第 '+(novelState.pageIdx+1)+' 页了。');
  }
}

function novelPrevPage(){
  if(novelState.pageIdx > 0){
    novelState.pageIdx--;
    renderNovelPage();
    novelAImsg('回到第 '+(novelState.pageIdx+1)+' 页。');
  }
}

function novelProgressLoop(){
  clearInterval(novelState.progressTimer);
  // Only fire occasionally, not every minute
  novelState.progressTimer=setInterval(function(){
    var pct=novelState.pages.length>1?Math.round((novelState.pageIdx+1)/novelState.pages.length*100):100;
    if(pct>0&&pct%25===0&&!novelState._lastProgressPct!==pct){
      novelState._lastProgressPct=pct;
      var c=contacts[novelState.contact];
      var sp='You are '+(c?c.name:'a companion')+' reading "'+novelState.title+'" at '+pct+'% progress. Comment naturally, 1 sentence in Chinese.';
      callRealAI([{role:'user',content:'[Progress: '+pct+'%]'}],sp,novelState.contact,function(reply){
        if(reply) novelAImsg(reply);
      });
    }
  },120000); // Every 2 minutes, only at 25/50/75%
}

function novelClick(e){
  var rect=e.currentTarget.getBoundingClientRect();
  var x=e.clientX-rect.left;
  var w=rect.width;
  if(x<w*0.3) novelPrevPage();
  else if(x>w*0.7) novelNextPage();
}

function novelAImsg(txt){
  novelState.chatMsgs.push({who:'ai', text:txt, ts:nowStamp()});
  var el = document.getElementById('novel-ai-msg');
  if(el){
    el.textContent = '💬 '+txt;
    el.style.opacity = '0';
    setTimeout(function(){ el.style.opacity = '1'; el.style.transition='opacity .3s'; }, 50);
  }
}

function novelSend(){
  var input=document.getElementById('novel-chat-input');
  var text=input.value.trim();
  if(!text) return;
  input.value='';
  novelState.chatMsgs.push({who:'me',text:text});
  // Build context from current page + reading progress
  var c=contacts[novelState.contact];
  var pct=novelState.pages.length>1?Math.round((novelState.pageIdx+1)/novelState.pages.length*100):100;
  var currentPageText=novelState.pages[novelState.pageIdx]||'';
  var systemPrompt='You are '+ (c?c.name:'a reading companion') +', reading the book "'+novelState.title+'" together with '+userName+'. The reader is currently at page '+(novelState.pageIdx+1)+' of '+novelState.pages.length+' ('+pct+'% progress). The current page content is:\n\n"'+currentPageText.substring(0,500)+'"\n\nRespond naturally to the reader\'s comment. Keep it 1-3 sentences in Chinese. Be insightful about the book content. Never prefix with your name.';
  var msgs=[{role:'user',content:text}];
  callRealAI(msgs,systemPrompt,novelState.contact,function(reply){
    novelAImsg(reply||'Continue reading...');
  });
}

function novelNextPage(){
  if(novelState.pageIdx<novelState.pages.length-1){
    novelState.pageIdx++;
    renderNovelPage();
    // AI comments on new page
    var c=contacts[novelState.contact];
    var currentPageText=novelState.pages[novelState.pageIdx]||'';
    var systemPrompt='You are '+(c?c.name:'a reading companion')+'. The reader just turned to page '+(novelState.pageIdx+1)+' of "'+novelState.title+'". Current page excerpt:\n\n"'+currentPageText.substring(0,400)+'"\n\nComment briefly on this part of the book. 1-2 sentences in Chinese. Never prefix with your name.';
    callRealAI([{role:'user',content:'[Turned to page '+(novelState.pageIdx+1)+']'}],systemPrompt,novelState.contact,function(reply){
      novelAImsg(reply||'Turning to the next page...');
    });
  }
}

function novelPrevPage(){
  if(novelState.pageIdx>0){
    novelState.pageIdx--;
    renderNovelPage();
  }
}

function novelCall(){
  if(!novelState.contact) return;
  var c = contacts[novelState.contact];
  // Set current contact and start call
  currentContact = novelState.contact;
  document.getElementById('call-name').textContent = c.name;
  document.getElementById('call-av').innerHTML = contactAvatar(c);
  document.getElementById('call-screen').classList.add('open');
  document.getElementById('call-status').textContent = '讨论《'+novelState.title+'》中…';
  var sp = document.getElementById('call-speak'); if(sp) sp.textContent='';
  var timer = document.getElementById('call-timer'); if(timer) timer.textContent='00:00';
  callSeconds = 0;
  if(callTimerInt) clearInterval(callTimerInt);
  callTimerInt = setInterval(function(){
    callSeconds++;
    var m = Math.floor(callSeconds/60);
    var s = callSeconds%60;
    var t = document.getElementById('call-timer');
    if(t) t.textContent = (m+'').padStart?('0'+m).slice(-2):('0'+m)+':'+(s+'').padStart?('0'+s).slice(-2):('0'+s);
  },1000);
  setTimeout(function(){
    var lines = ['你觉得这本小说怎么样？','我特别喜欢这一段的描写。','继续读吧，我在听。','这里的情节转折很精彩。'];
    novelAImsg(lines[Math.floor(Math.random()*lines.length)]);
    try{ speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(lines[0]); u.lang='zh-CN'; speechSynthesis.speak(u); }catch(e){}
  },1500);
}

function novelClick(e){
  var w = e.currentTarget.offsetWidth;
  if(e.clientX - e.currentTarget.getBoundingClientRect().left < w/3){
    novelPrevPage();
  } else if(e.clientX - e.currentTarget.getBoundingClientRect().left > w*2/3){
    novelNextPage();
  }
}
function closeNovel(){
  clearInterval(novelState.progressTimer);
  document.getElementById('sheet-novel').classList.remove('open');
  // Show import screen for next time
  setTimeout(function(){
    document.getElementById('novel-reader').style.display = 'none';
    document.getElementById('novel-import').style.display = 'flex';
  }, 400);
}

/* seed default icons so screens aren't empty on load (after all state is declared) */
renderDesktopIcons();
renderIconGrid();
renderPcKeypad();

/* ============ HOME PAGER (主屏左右分页 + 圆点指示器) ============ */
(function(){
  var pager = document.getElementById('home-pager');
  if(!pager) return;
  var dotsWrap = document.getElementById('page-dots');
  var pages = pager.querySelectorAll('.home-page');

  /* 渲染圆点 */
  function renderDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for(var i=0; i<pages.length; i++){
      var d = document.createElement('div');
      d.className = 'page-dot' + (i===0 ? ' active' : '');
      (function(idx){ d.addEventListener('click', function(){
        pager.scrollTo({ left: idx * pager.offsetWidth, behavior: 'smooth' });
      }); })(i);
      dotsWrap.appendChild(d);
    }
  }

  /* 滚动时更新激活圆点 */
  var ticking = false;
  function updateDots(){
    var idx = Math.round(pager.scrollLeft / pager.offsetWidth);
    idx = Math.max(0, Math.min(idx, pages.length - 1));
    var dots = dotsWrap ? dotsWrap.querySelectorAll('.page-dot') : [];
    for(var i=0; i<dots.length; i++){
      dots[i].classList.toggle('active', i === idx);
    }
    ticking = false;
  }
  pager.addEventListener('scroll', function(){
    if(!ticking){ ticking = true; requestAnimationFrame(updateDots); }
  }, { passive: true });

  renderDots();

  /* 窗口尺寸变化时重新对齐当前页 */
  window.addEventListener('resize', function(){
    var idx = Math.round(pager.scrollLeft / pager.offsetWidth);
    pager.scrollTo({ left: idx * pager.offsetWidth });
  });
})();

/* ============ FIT PHONE TO VIEWPORT ============ */
/* 全屏模式：手机屏幕 = 整个网页，不再按 375x812 缩放。
   之前 fitPhone() 会把 .phone 缩小到 viewport 的 76%~90%，
   导致 iOS/Android 用户看到中间一小块"小手机"，四周留白。
   现在直接让 CSS 的 100vw×100dvh 生效，全屏铺满。 */
function fitPhone(){
  var phone=document.querySelector('.phone'); if(!phone) return;
  phone.style.transform='none';
  phone.style.transformOrigin='initial';
}
window.addEventListener('resize', fitPhone);
window.addEventListener('orientationchange', fitPhone);
fitPhone();

initApp();
