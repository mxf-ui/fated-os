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

