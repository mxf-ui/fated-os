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
  /* Memory mode: recover core metadata before chats so custom personas exist first. */
  fatedDBLoadStickers(function(ok){
    if(ok){ renderStickerLib(); }
    loadStateBackupFromDB(function(restoredCore){
      if(restoredCore){
        Object.keys(contacts).forEach(function(k){
          if((k[0]==='p'||k[0]==='g') && !document.querySelector('#contact-items [onclick*="'+k+'"]')){
            if(contacts[k].isGroup) addContactRow(k,true); else addContactRow(k,false);
          }
        });
        populateViewAs();
        renderWallet();
        renderMoments();
      }
      fatedDBLoadAllChats(function(ok2){
        if(ok2){
          renderThread();
          renderChatList();
        }
        loadStateAssetsFromDB(function(){
          renderThread();
          renderChatList();
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

