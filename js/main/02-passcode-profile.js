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
function fatedHoistSheetToScreen(el){
  try{
    var screen=document.getElementById('screen');
    if(!screen || !el) return;
    var parent=el.parentElement;
    while(parent && parent!==screen){
      if(parent.classList && parent.classList.contains('sheet')){
        screen.appendChild(el);
        return;
      }
      parent=parent.parentElement;
    }
  }catch(e){}
}function openSheet(id){
  if(typeof fatedCloseDesktopAppSurfaces==='function') fatedCloseDesktopAppSurfaces(id);
  var el=document.getElementById('sheet-'+id);
  if(!el){ console.log('Sheet not found: '+id); return; }
  fatedHoistSheetToScreen(el);
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

