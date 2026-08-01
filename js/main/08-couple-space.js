/* Couple Space core shell. Split feature modules override feature pages below this file. */
var coupleState = window.coupleState || { partner:'', lockedApps:{}, notes:[], diary:[], shop:[], foodOrders:[], phoneTab:'wechat', lastCheckin:0, jealousHistory:[], partnerHistory:[], byPartner:{} };
window.coupleState = coupleState;
var screenTimeData = window.screenTimeData || { totalSec:0, todaySec:0, lastDate:'', sessionStart:0, active:true };
window.screenTimeData = screenTimeData;

function coupleEsc(v){
  if(typeof esc === 'function') return esc(String(v || ''));
  return String(v || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function coupleContactName(c, fallback){ return (c && (c.displayName || c.name)) || fallback || 'TA'; }
function coupleContactAvatar(c){
  if(c && typeof contactAvatar === 'function') return contactAvatar(c);
  if(c && typeof avatarHTML === 'function') return avatarHTML(c.tone || c.name || '');
  return '<span style="font-size:12px;font-weight:800;color:#3d9d68;">TA</span>';
}
function coupleAllContactIds(){
  return Object.keys(window.contacts || {}).filter(function(k){ return k !== 'me' && contacts[k] && !contacts[k].isGroup && !contacts[k].taDeletedByPartner; });
}
function couplePersist(){
  if(typeof saveCoupleState === 'function') saveCoupleState();
  else if(typeof saveState === 'function') saveState();
}
function screenTimeTrack(){
  var now = Date.now();
  var today = new Date().toDateString();
  if(screenTimeData.lastDate !== today){
    screenTimeData.lastDate = today;
    screenTimeData.todaySec = 0;
  }
  if(screenTimeData.sessionStart > 0){
    var delta = Math.floor((now - screenTimeData.sessionStart) / 1000);
    if(delta > 0 && delta < 3600){
      screenTimeData.todaySec += delta;
      screenTimeData.totalSec += delta;
    }
  }
  screenTimeData.sessionStart = now;
}
function screenTimeFormat(sec){
  sec = Math.max(0, Number(sec) || 0);
  if(sec < 60) return sec + 's';
  if(sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
}
if(!window.__coupleScreenTimer){
  window.__coupleScreenTimer = setInterval(screenTimeTrack, 30000);
  document.addEventListener('visibilitychange', function(){
    if(document.hidden){ screenTimeTrack(); screenTimeData.sessionStart = 0; }
    else { screenTimeData.sessionStart = Date.now(); }
  });
}
function initCouple(){
  if(!coupleState.partner){
    var ids = coupleAllContactIds();
    if(ids.length) coupleState.partner = ids[0];
  }
  if(!Array.isArray(coupleState.partnerHistory)) coupleState.partnerHistory = [];
  if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner) === -1) coupleState.partnerHistory.push(coupleState.partner);
  updateCoupleHeader();
  coupleGenData();
  if(window.coupleGenData && window.coupleGenData !== coupleGenData) window.coupleGenData();
  coupleShowMain();
  if(screenTimeData.sessionStart === 0) screenTimeData.sessionStart = Date.now();
}
function coupleSwitchPartner(){
  var ids = coupleAllContactIds();
  if(!ids.length){ if(typeof showToast === 'function') showToast('\u6ca1\u6709\u53ef\u7ed1\u5b9a\u7684\u8054\u7cfb\u4eba', 1500); return; }
  var html = '<div style="font-size:12px;color:#6e8b80;margin-bottom:10px;">\u9009\u62e9\u60c5\u4fa3\u7a7a\u95f4\u7ed1\u5b9a\u7684 WeChat \u8054\u7cfb\u4eba</div>';
  ids.forEach(function(k){
    var c = contacts[k];
    var on = k === coupleState.partner;
    html += '<div class="ios-section" style="margin:0 0 8px;cursor:pointer;'+(on?'border:2px solid #4fb895;background:#f1fff9;':'')+'" onclick="coupleSetPartner(\''+k+'\')"><div class="ios-row"><div style="width:38px;height:38px;border-radius:50%;background:#eef8f4;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none;">'+coupleContactAvatar(c)+'</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;">'+coupleEsc(coupleContactName(c,k))+'</div><div style="font-size:11px;color:#7b8f89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(on?'\u5f53\u524d\u5bf9\u8c61':'\u70b9\u51fb\u5207\u6362')+'</div></div></div></div>';
  });
  coupleShowSub('\u5207\u6362\u8054\u7cfb\u4eba', html);
}
function coupleSetPartner(id){
  if(!contacts || !contacts[id]) return;
  if(!Array.isArray(coupleState.partnerHistory)) coupleState.partnerHistory = [];
  if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner) === -1) coupleState.partnerHistory.push(coupleState.partner);
  coupleState.partner = id;
  if(coupleState.partnerHistory.indexOf(id) === -1) coupleState.partnerHistory.push(id);
  couplePersist();
  updateCoupleHeader();
  if(window.coupleGenData && window.coupleGenData !== coupleGenData) window.coupleGenData();
  coupleShowMain();
  if(typeof showToast === 'function') showToast('\u5df2\u5207\u6362\u5230 ' + coupleContactName(contacts[id], id), 1400);
}
function coupleGenData(){
  if(typeof window.coupleData === 'function'){
    var d = window.coupleData();
    coupleState.notes = d.notes || [];
    coupleState.diary = d.diary || [];
    coupleState.shop = d.partnerWishlist || [];
    coupleState.foodOrders = d.foodOrders || [];
    return;
  }
  coupleState.notes = Array.isArray(coupleState.notes) ? coupleState.notes : [];
  coupleState.diary = Array.isArray(coupleState.diary) ? coupleState.diary : [];
  coupleState.shop = Array.isArray(coupleState.shop) ? coupleState.shop : [];
  coupleState.foodOrders = Array.isArray(coupleState.foodOrders) ? coupleState.foodOrders : [];
}
function updateCoupleHeader(){
  var c = contacts && contacts[coupleState.partner];
  var namesEl = document.getElementById('couple-names');
  if(namesEl) namesEl.textContent = (typeof userName !== 'undefined' ? userName : 'You') + ' & ' + coupleContactName(c, 'Partner');
  var meAv = document.getElementById('couple-av-me');
  if(meAv){
    if(typeof userAvatar !== 'undefined' && userAvatar) meAv.innerHTML = '<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    else meAv.innerHTML = '<span style="font-size:12px;font-weight:800;color:#3d9d68;">ME</span>';
  }
  var pAv = document.getElementById('couple-av-partner');
  if(pAv) pAv.innerHTML = coupleContactAvatar(c);
  var days = Math.max(0, Math.floor((Date.now() - new Date('2026-04-12').getTime()) / 86400000));
  var daysEl = document.getElementById('couple-days');
  if(daysEl) daysEl.textContent = 'Together ' + days + ' days';
}
function coupleShowMain(){
  var main = document.getElementById('couple-main');
  var sub = document.getElementById('couple-subview');
  var phone = document.getElementById('couple-phone');
  if(main){ main.style.display = 'block'; main.classList.add('couple-shell-green'); }
  if(sub){ sub.style.display = 'none'; sub.classList.add('couple-shell-green'); }
  if(phone){ phone.style.display = 'none'; phone.classList.add('couple-shell-green'); }
  if(window.coupleRenderMainShell) window.coupleRenderMainShell();
}
function coupleBack(){ coupleShowMain(); }
function coupleShowSub(title, html){
  var main = document.getElementById('couple-main');
  var phone = document.getElementById('couple-phone');
  var sub = document.getElementById('couple-subview');
  if(main){ main.style.display = 'none'; main.classList.add('couple-shell-green'); }
  if(phone){ phone.style.display = 'none'; phone.classList.add('couple-shell-green'); }
  if(sub){ sub.style.display = 'block'; sub.classList.add('couple-shell-green'); }
  var t = document.getElementById('couple-subtitle');
  var box = document.getElementById('couple-subcontent');
  if(t) t.textContent = title || '';
  if(box) box.innerHTML = html || '';
}
function coupleCheckPhone(){
  var main = document.getElementById('couple-main');
  var sub = document.getElementById('couple-subview');
  var phone = document.getElementById('couple-phone');
  if(main) main.style.display = 'none';
  if(sub) sub.style.display = 'none';
  if(phone) phone.style.display = 'block';
  var c = contacts && contacts[coupleState.partner];
  var title = document.getElementById('couple-phone-title');
  if(title) title.textContent = coupleContactName(c, 'Partner') + "'s Phone";
  coupleState.phoneTab = 'wechat';
  couplePhoneTab('wechat');
}
function couplePhoneTab(tab){
  coupleState.phoneTab = tab;
  var content = document.getElementById('couple-phone-content');
  if(!content) return;
  var c = contacts && contacts[coupleState.partner];
  if(!c){ content.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">No partner selected</div>'; return; }
  var ids = coupleAllContactIds().filter(function(k){ return k !== coupleState.partner; });
  if(tab === 'wechat'){
    var html = '<div style="font-size:12px;color:#789084;padding:4px 0 8px;">Recent chats on '+coupleEsc(coupleContactName(c,'TA'))+' WeChat</div>';
    html += ids.map(function(k){
      var ct = contacts[k];
      var seed = Array.isArray(ct.seed) ? ct.seed : [];
      var last = seed.length ? seed[seed.length - 1] : null;
      var preview = last ? (last.text || last.name || '[message]') : 'No messages';
      return '<div class="ios-section" style="margin:0 0 7px;"><div class="ios-row"><div style="width:36px;height:36px;border-radius:50%;background:#eef8f4;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none;">'+coupleContactAvatar(ct)+'</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:800;">'+coupleEsc(coupleContactName(ct,k))+'</div><div style="font-size:11px;color:#7b8f89;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+coupleEsc(preview).slice(0,80)+'</div></div></div></div>';
    }).join('');
    content.innerHTML = html || '<div style="text-align:center;padding:30px;color:#9aa9a5;">No chats</div>';
    return;
  }
  if(tab === 'moments'){
    var moments = Array.isArray(window.moments) ? window.moments.slice(-10).reverse() : [];
    content.innerHTML = moments.length ? moments.map(function(m){ return '<div class="ios-section" style="margin:0 0 7px;padding:12px;font-size:12px;line-height:1.55;">'+coupleEsc(m.text || m.content || '')+'</div>'; }).join('') : '<div style="text-align:center;padding:30px;color:#9aa9a5;">No moments</div>';
    return;
  }
  if(tab === 'forum'){
    var posts = Array.isArray(window.forumPosts) ? window.forumPosts.slice(-10).reverse() : [];
    content.innerHTML = posts.length ? posts.map(function(p){ return '<div class="ios-section" style="margin:0 0 7px;padding:12px;font-size:12px;line-height:1.55;">'+coupleEsc(p.text || p.content || p.title || '')+'</div>'; }).join('') : '<div style="text-align:center;padding:30px;color:#9aa9a5;">No forum data</div>';
  }
}
function coupleScreenTime(){
  screenTimeTrack();
  var today = screenTimeFormat(screenTimeData.todaySec || 0);
  var total = screenTimeFormat(screenTimeData.totalSec || 0);
  var html = '<div class="couple-check-wrap"><div class="couple-line-card" style="padding:18px;text-align:center;"><div style="font-size:28px;font-weight:900;color:#2d6b4d;">'+today+'</div><div style="font-size:12px;color:#789084;margin-top:5px;">\u4eca\u65e5\u5c4f\u5e55\u4f7f\u7528\u65f6\u957f</div></div><div class="couple-line-card" style="padding:14px;"><div style="display:flex;justify-content:space-between;font-size:13px;"><span>\u7d2f\u8ba1\u4f7f\u7528</span><b>'+total+'</b></div><div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px;"><span>\u5f53\u524d\u5e94\u7528</span><b>Fated OS</b></div></div></div>';
  coupleShowSub('\u5c4f\u5e55\u4f7f\u7528\u65f6\u957f', html);
}