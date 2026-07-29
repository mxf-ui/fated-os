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

