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

function renderEmptyThread(){
  var name=document.getElementById('thread-name'); if(name) name.textContent='??';
  var call=document.getElementById('call-name'); if(call) call.textContent='????';
  var av=document.getElementById('thread-avatar'); if(av) av.innerHTML='';
  var wrap=document.getElementById('thread-msgs'); if(wrap) wrap.innerHTML='<div class="daydivider">????</div>';
  var ib=document.getElementById('msg-input'), sb=document.getElementById('sendbtn');
  if(ib){ ib.disabled=true; ib.placeholder='?????????'; }
  if(sb){ sb.style.opacity=.4; sb.style.pointerEvents='none'; }
}

function renderThread(){
  const c = contacts[currentContact];
  if(!c){ renderEmptyThread(); return; }
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
  if(m.cardType==='product'){
    var img = m.img ? '<div class="product-card-img" style="background-image:url('+m.img+')"></div>' : '<div class="product-card-img empty"></div>';
    body='<div class="card-row product-card-row">'+img+'<div><div class="card-title">'+esc(m.title||'\u76f4\u64ad\u63a8\u8350')+'</div><div class="card-sub"><b>'+esc(m.name||'\u5546\u54c1')+'</b><br><span class="card-amount">\u00a5'+esc(String(m.price||'0'))+'</span>'+(m.note?(' \u00b7 '+esc(m.note)):'')+'</div></div></div>';
    status='<div class="card-status '+(m.status==='done'?'done':'wait')+'">'+(m.status==='done'?'\u5df2\u4e0b\u5355':'\u70b9\u5f00\u770b\u76f4\u64ad')+'</div>';
  } else if(m.cardType==='transfer' || m.cardType==='family'){
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

function openThread(id){ if(!id || !contacts[id]){ if(typeof showToast==='function') showToast('?????????????', 1600, 'warn'); renderChatList(); renderEmptyThread(); return; } currentContact=id; contacts[id].unread=0; renderChatList(); renderThread(); saveChatThread(id); openSheet('thread'); resetIdleTimer(); }

