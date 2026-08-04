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
  var ids = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].blocked && !contacts[k].taDeletedByPartner; });
  if(!ids.length){ list.innerHTML='<div style="text-align:center;color:var(--ink-faint);font-size:12px;padding:32px 0;">?????</div>'; return; }
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
