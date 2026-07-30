/* ============ NILFLOW ANONYMOUS SOCIAL APP ============ */
var nilflowState = null;
var nilflowInited = false;
var nilflowActiveChat = '';
var nilflowPostMedia = null;
var nilflowVoiceSession = null;

function nilflowToday(){ return new Date().toISOString().slice(0,10); }
function nilflowId(){ return 'nf-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7); }
function nilflowDefault(){
  return {
    profile:{ id:'', avatar:'', bio:'', tags:['低频社交'], interests:['文字','夜谈'] },
    privacy:{ hideOnline:false, blockStrangers:false, voiceEnabled:true },
    tab:'home',
    match:{ dailyLimit:8, usedToday:0, date:nilflowToday(), filters:{ interest:'', voiceOnly:false }, candidates:[], accepted:{} },
    friends:[],
    chats:{},
    posts:[],
    blocked:[],
    reports:[],
    history:[],
    notices:[]
  };
}
function nilflowEnsureStateShape(){
  if(!nilflowState || typeof nilflowState!=='object') nilflowState=nilflowDefault();
  var d=nilflowDefault();
  nilflowState.profile=Object.assign(d.profile, nilflowState.profile||{});
  nilflowState.privacy=Object.assign(d.privacy, nilflowState.privacy||{});
  nilflowState.match=Object.assign(d.match, nilflowState.match||{});
  nilflowState.match.filters=Object.assign(d.match.filters, nilflowState.match.filters||{});
  ['friends','posts','blocked','reports','history','notices'].forEach(function(k){ if(!Array.isArray(nilflowState[k])) nilflowState[k]=[]; });
  if(!nilflowState.chats || typeof nilflowState.chats!=='object') nilflowState.chats={};
  if(nilflowState.match.date!==nilflowToday()){ nilflowState.match.date=nilflowToday(); nilflowState.match.usedToday=0; }
  if(!nilflowState.tab) nilflowState.tab='home';
  nilflowSeedFeed();
}
function nilflowSeedFeed(){
  if(nilflowState.posts && nilflowState.posts.length) return;
  nilflowState.posts=[
    {id:'post-1', author:'NIL-109', avatar:'', text:'今晚只想找一个不会追问现实身份的人，慢慢聊完一段没说出口的话。', style:'minimal', likes:28, comments:6, reposts:2, ts:Date.now()-3600000, media:null},
    {id:'post-2', author:'shallow_room', avatar:'', text:'匿名关系最好的部分，是可以先看见表达，再决定要不要靠近。', style:'card', likes:41, comments:11, reposts:5, ts:Date.now()-7200000, media:null},
    {id:'post-3', author:'after_02', avatar:'', text:'开放语音，但只接受安静、低压、边做事边聊的通话。', style:'literary', likes:19, comments:3, reposts:1, ts:Date.now()-10800000, media:null}
  ];
}
function nilflowPool(){
  return [
    {id:'NIL-109', bio:'夜间写作者，慢热，喜欢低频长聊。', tags:['文字','夜谈','慢热'], voice:true, active:83},
    {id:'murmur_07', bio:'偏内向，只想找稳定匿名窗口。', tags:['电影','独处','轻语音'], voice:true, active:58},
    {id:'paper_tide', bio:'喜欢图文记录和城市散步。', tags:['摄影','散步','日记'], voice:false, active:36},
    {id:'hidden_lane', bio:'边听歌边聊天，拒绝现实身份交换。', tags:['音乐','边界感','夜谈'], voice:true, active:71},
    {id:'north_ash', bio:'短句派，喜欢干净直接的交流。', tags:['极简','文字','清醒'], voice:false, active:44},
    {id:'teal_room', bio:'声音低，通话前会先文字确认。', tags:['轻语音','情绪','陪伴'], voice:true, active:67},
    {id:'quiet_fold', bio:'关注匿名树洞和长期互相观察。', tags:['树洞','慢热','文字'], voice:false, active:52},
    {id:'gray_signal', bio:'喜欢观点碰撞，但不攻击人。', tags:['讨论','书影音','清醒'], voice:true, active:63},
    {id:'soft_index', bio:'只在晚上在线，回复稳定。', tags:['夜谈','陪伴','日记'], voice:true, active:49},
    {id:'blank_hour', bio:'偏爱一对一，不参与公开争论。', tags:['低频社交','文字','安静'], voice:false, active:31}
  ];
}
function nilflowEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function nilflowToast(text){
  var n=document.getElementById('nilflow-toast');
  if(!n) return;
  n.textContent=text;
  n.classList.add('show');
  clearTimeout(n._timer);
  n._timer=setTimeout(function(){ n.classList.remove('show'); },1800);
}
function nilflowSave(){ if(typeof saveState==='function') saveState(); }
function initNilflow(){
  nilflowEnsureStateShape();
  if(!nilflowInited){
    var avatarInput=document.getElementById('nilflow-avatar-input');
    var mediaInput=document.getElementById('nilflow-post-media-input');
    if(avatarInput){ avatarInput.addEventListener('change', nilflowHandleAvatar); }
    if(mediaInput){ mediaInput.addEventListener('change', nilflowHandlePostMedia); }
    nilflowInited=true;
  }
  nilflowRender();
}
function nilflowAvatarHtml(user, cls){
  user=user||{};
  var label=(user.id||'NL').slice(0,2).toUpperCase();
  if(user.avatar) return '<div class="nilflow-avatar '+(cls||'')+'" style="background-image:url('+nilflowEsc(user.avatar)+')"></div>';
  return '<div class="nilflow-avatar '+(cls||'')+'"><span>'+nilflowEsc(label)+'</span></div>';
}
function nilflowProfileReady(){ return !!(nilflowState.profile.id && nilflowState.profile.id.trim()); }
function nilflowSetTab(tab){ nilflowEnsureStateShape(); nilflowState.tab=tab; nilflowSave(); nilflowRender(); }
function nilflowRender(){
  nilflowEnsureStateShape();
  var root=document.getElementById('nilflow-root');
  if(!root) return;
  var tabs=[['home','首页'],['match','匹配'],['messages','消息'],['publish','发布'],['mine','我的']];
  root.innerHTML='<div class="nilflow-shell">'
    + '<div class="nilflow-top"><button type="button" class="nilflow-back" onclick="closeSheet(\'nilflow\')">&#8249;</button><div><b>匿流</b><small>NilFlow Anonymous</small></div><span>'+ (nilflowState.privacy.hideOnline?'隐身':'匿名在线') +'</span></div>'
    + '<div class="nilflow-main">'+nilflowRenderActiveView()+'</div>'
    + '<div class="nilflow-tabs">'+tabs.map(function(t){ return '<button type="button" class="'+(nilflowState.tab===t[0]?'active':'')+'" onclick="nilflowSetTab(\''+t[0]+'\')"><b>'+t[1]+'</b></button>'; }).join('')+'</div>'
    + '</div>';
}
function nilflowRenderActiveView(){
  if(nilflowState.tab==='match') return nilflowRenderMatch();
  if(nilflowState.tab==='messages') return nilflowRenderMessages();
  if(nilflowState.tab==='publish') return nilflowRenderPublish();
  if(nilflowState.tab==='mine') return nilflowRenderMine();
  return nilflowRenderHome();
}
function nilflowRenderHome(){
  var posts=nilflowState.posts.filter(function(p){ return nilflowState.blocked.indexOf(p.author)<0; }).sort(function(a,b){ return b.ts-a.ts; });
  return '<section class="nilflow-page"><div class="nilflow-search"><input id="nilflow-search-input" placeholder="搜索匿名ID、标签或内容"></div>'
    + '<div class="nilflow-feed">'+posts.map(nilflowRenderPost).join('')+'</div></section>';
}
function nilflowRenderPost(p){
  return '<article class="nilflow-feed-card '+nilflowEsc(p.style||'minimal')+'">'
    + '<div class="nilflow-post-head">'+nilflowAvatarHtml({id:p.author,avatar:p.avatar},'small')+'<div><b>'+nilflowEsc(p.author)+'</b><small>'+nilflowTime(p.ts)+' · 平台匿名ID</small></div></div>'
    + '<p>'+nilflowEsc(p.text)+'</p>'
    + (p.media?'<div class="nilflow-media '+(p.mediaType&&p.mediaType.indexOf('video')===0?'video':'')+'">'+(p.mediaType&&p.mediaType.indexOf('video')===0?'<video controls src="'+nilflowEsc(p.media)+'"></video>':'<img src="'+nilflowEsc(p.media)+'" alt="">')+'</div>':'')
    + '<div class="nilflow-post-actions"><button onclick="nilflowReactPost(\''+p.id+'\',\'likes\')">喜欢 '+(p.likes||0)+'</button><button onclick="nilflowReactPost(\''+p.id+'\',\'comments\')">评论 '+(p.comments||0)+'</button><button onclick="nilflowReactPost(\''+p.id+'\',\'reposts\')">转发 '+(p.reposts||0)+'</button><button onclick="nilflowReportUser(\''+nilflowEsc(p.author)+'\')">举报</button><button onclick="nilflowBlockUser(\''+nilflowEsc(p.author)+'\')">拉黑</button></div>'
    + '</article>';
}
function nilflowTime(ts){
  var mins=Math.max(1, Math.round((Date.now()-ts)/60000));
  if(mins<60) return mins+'分钟前';
  var hrs=Math.round(mins/60);
  return hrs+'小时前';
}
function nilflowRenderMatch(){
  var m=nilflowState.match;
  var left=Math.max(0,(m.dailyLimit||8)-(m.usedToday||0));
  return '<section class="nilflow-page"><div class="nilflow-panel"><div class="nilflow-panel-title"><b>5人随机匹配</b><small>只使用平台匿名资料，不读取现实社交信息</small></div>'
    + '<div class="nilflow-filter-row"><input id="nilflow-filter-interest" value="'+nilflowEsc(m.filters.interest||'')+'" placeholder="兴趣偏好，例如文字、夜谈"><label><input type="checkbox" '+(m.filters.voiceOnly?'checked':'')+' onchange="nilflowSetVoiceFilter(this.checked)"> 只看可语音</label></div>'
    + '<button class="nilflow-primary" onclick="nilflowStartMatch()">一键匹配</button><small class="nilflow-hint">今日剩余 '+left+' 次，双向通过后解锁私聊。</small></div>'
    + '<div class="nilflow-match-strip">'+(m.candidates||[]).map(nilflowRenderMatchCard).join('')+'</div>'
    + '<div class="nilflow-panel"><div class="nilflow-panel-title"><b>匹配记录</b><small>仅保存在匿流内部</small></div><div class="nilflow-history">'+(nilflowState.history.slice(-8).reverse().map(function(h){ return '<div><b>'+nilflowEsc(h.id)+'</b><small>'+nilflowEsc(h.action)+' · '+nilflowTime(h.ts)+'</small></div>'; }).join('') || '<p>还没有匹配记录。</p>')+'</div></div></section>';
}
function nilflowRenderMatchCard(u){
  var passed=!!nilflowState.match.accepted[u.id];
  return '<article class="nilflow-match-card">'+nilflowAvatarHtml(u,'large')+'<b>'+nilflowEsc(u.id)+'</b><p>'+nilflowEsc(u.bio)+'</p><div class="nilflow-tags">'+(u.tags||[]).map(function(t){ return '<span>'+nilflowEsc(t)+'</span>'; }).join('')+'</div><small>'+(u.voice?'可语音':'仅文字')+' · 活跃度 '+u.active+'</small><div class="nilflow-card-actions"><button onclick="nilflowRejectMatch(\''+u.id+'\')">拒绝跳过</button><button class="ok" onclick="nilflowAcceptMatch(\''+u.id+'\')">'+(passed?'已通过':'同意申请')+'</button></div></article>';
}
function nilflowSetVoiceFilter(checked){ nilflowState.match.filters.voiceOnly=!!checked; nilflowSave(); }
function nilflowStartMatch(){
  nilflowEnsureStateShape();
  var interestEl=document.getElementById('nilflow-filter-interest');
  nilflowState.match.filters.interest=interestEl?interestEl.value.trim():nilflowState.match.filters.interest;
  if(!nilflowProfileReady()){ nilflowToast('请先在“我的”设置匿名ID'); nilflowState.tab='mine'; nilflowRender(); return; }
  if((nilflowState.match.usedToday||0)>=(nilflowState.match.dailyLimit||8)){ nilflowToast('今日匹配次数已用完'); return; }
  var friendIds=nilflowState.friends.map(function(f){ return f.id; });
  var q=(nilflowState.match.filters.interest||'').toLowerCase();
  var pool=nilflowPool().filter(function(u){
    if(nilflowState.blocked.indexOf(u.id)>=0 || friendIds.indexOf(u.id)>=0) return false;
    if(nilflowState.match.filters.voiceOnly && !u.voice) return false;
    if(q && (u.tags.join(' ').toLowerCase().indexOf(q)<0 && u.bio.toLowerCase().indexOf(q)<0 && u.id.toLowerCase().indexOf(q)<0)) return false;
    return true;
  });
  pool=pool.sort(function(){ return Math.random()-0.5; }).slice(0,5);
  nilflowState.match.candidates=pool;
  nilflowState.match.usedToday=(nilflowState.match.usedToday||0)+1;
  nilflowSave();
  nilflowRender();
}
function nilflowAcceptMatch(id){
  var user=nilflowFindUser(id);
  if(!user) return;
  nilflowState.match.accepted[id]=true;
  if(!nilflowState.friends.some(function(f){ return f.id===id; })) nilflowState.friends.unshift(user);
  if(!nilflowState.chats[id]) nilflowState.chats[id]=[{from:'system', text:'双方申请已通过，匿名私聊已解锁。', ts:Date.now()}];
  nilflowState.history.push({id:id, action:'已通过并解锁私聊', ts:Date.now()});
  nilflowActiveChat=id;
  nilflowState.tab='messages';
  nilflowSave();
  nilflowRender();
}
function nilflowRejectMatch(id){
  nilflowState.match.candidates=(nilflowState.match.candidates||[]).filter(function(u){ return u.id!==id; });
  nilflowState.history.push({id:id, action:'已跳过', ts:Date.now()});
  nilflowSave();
  nilflowRender();
}
function nilflowFindUser(id){
  return nilflowState.friends.find(function(f){ return f.id===id; }) || (nilflowState.match.candidates||[]).find(function(u){ return u.id===id; }) || nilflowPool().find(function(u){ return u.id===id; }) || null;
}
function nilflowRenderMessages(){
  if(!nilflowActiveChat && nilflowState.friends[0]) nilflowActiveChat=nilflowState.friends[0].id;
  var list=nilflowState.friends.map(function(f){ var msgs=nilflowState.chats[f.id]||[]; var last=msgs[msgs.length-1]; return '<button class="nilflow-session '+(nilflowActiveChat===f.id?'active':'')+'" onclick="nilflowOpenChat(\''+f.id+'\')">'+nilflowAvatarHtml(f,'small')+'<span><b>'+nilflowEsc(f.id)+'</b><small>'+(last?nilflowEsc(last.text):'尚未开始对话')+'</small></span></button>'; }).join('');
  return '<section class="nilflow-page nilflow-message-layout"><div class="nilflow-session-list">'+(list||'<div class="nilflow-empty">完成双向匹配后，这里会出现匿名私聊。</div>')+'</div>'+nilflowRenderChatPanel()+'</section>';
}
function nilflowOpenChat(id){ nilflowActiveChat=id; nilflowRender(); }
function nilflowRenderChatPanel(){
  if(!nilflowActiveChat) return '<div class="nilflow-chat-panel"><div class="nilflow-empty">选择一个匿名会话。</div></div>';
  var user=nilflowFindUser(nilflowActiveChat)||{id:nilflowActiveChat};
  var msgs=nilflowState.chats[nilflowActiveChat]||[];
  return '<div class="nilflow-chat-panel"><div class="nilflow-chat-head">'+nilflowAvatarHtml(user,'small')+'<div><b>'+nilflowEsc(user.id)+'</b><small>只展示平台匿名ID</small></div><button onclick="nilflowStartVoice(\''+user.id+'\')">语音</button></div>'
    + '<div class="nilflow-chat-log">'+msgs.map(function(m){ return '<div class="nilflow-bubble '+(m.from==='me'?'me':m.from==='system'?'system':'them')+'">'+nilflowEsc(m.text)+'</div>'; }).join('')+'</div>'
    + nilflowRenderVoicePanel()
    + '<div class="nilflow-chat-input"><input id="nilflow-chat-text" maxlength="300" placeholder="输入匿名消息"><button onclick="nilflowSendMessage()">发送</button></div></div>';
}
function nilflowRenderVoicePanel(){
  if(!nilflowVoiceSession || nilflowVoiceSession.id!==nilflowActiveChat) return '';
  return '<div class="nilflow-voice-panel"><b>匿名语音连接中</b><small>'+nilflowEsc(nilflowVoiceSession.status||'等待麦克风权限')+'</small><div><button onclick="nilflowToggleMute()">'+(nilflowVoiceSession.muted?'取消静音':'静音')+'</button><button onclick="nilflowEndVoice()">挂断</button></div><small>已启用降噪和本地音色保护界面；跨设备实时通话需要后端信令服务。</small></div>';
}
function nilflowSendMessage(){
  if(!nilflowActiveChat) return;
  var input=document.getElementById('nilflow-chat-text');
  var text=input?input.value.trim():'';
  if(!text) return;
  var list=nilflowState.chats[nilflowActiveChat] || (nilflowState.chats[nilflowActiveChat]=[]);
  list.push({from:'me', text:text, ts:Date.now()});
  if(input) input.value='';
  nilflowSave();
  nilflowRender();
  var id=nilflowActiveChat;
  setTimeout(function(){
    if(!nilflowState || !nilflowState.chats[id]) return;
    var user=nilflowFindUser(id)||{id:id};
    nilflowState.chats[id].push({from:'them', text:nilflowAutoReply(user, text), ts:Date.now()});
    nilflowSave();
    if(nilflowState.tab==='messages' && nilflowActiveChat===id) nilflowRender();
  },700);
}
function nilflowAutoReply(user, text){
  var samples=['我会只留在这个匿名窗口里回应你。','这个说法我能理解，你想继续说细一点吗？','先不用解释现实身份，我们只处理当下这句话。','我在，慢慢发也可以。'];
  var pick=samples[Math.floor(Math.random()*samples.length)];
  if(text.length>40) pick='我读完了，你的重点像是在后半段。我们可以先从那里聊。';
  return pick;
}
function nilflowStartVoice(id){
  if(!nilflowState.privacy.voiceEnabled){ nilflowToast('你已关闭语音通话权限'); return; }
  nilflowVoiceSession={id:id, muted:false, status:'正在请求麦克风权限'};
  nilflowRender();
  if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      stream.getTracks().forEach(function(track){ track.stop(); });
      if(nilflowVoiceSession && nilflowVoiceSession.id===id){ nilflowVoiceSession.status='麦克风可用，等待匿名信令接入'; nilflowRender(); }
    }).catch(function(){ if(nilflowVoiceSession && nilflowVoiceSession.id===id){ nilflowVoiceSession.status='麦克风未授权'; nilflowRender(); } });
  }else{
    nilflowVoiceSession.status='当前浏览器不支持网页语音权限';
    nilflowRender();
  }
}
function nilflowToggleMute(){ if(nilflowVoiceSession){ nilflowVoiceSession.muted=!nilflowVoiceSession.muted; nilflowRender(); } }
function nilflowEndVoice(){ nilflowVoiceSession=null; nilflowRender(); }
function nilflowRenderPublish(){
  return '<section class="nilflow-page"><div class="nilflow-panel nilflow-compose"><div class="nilflow-panel-title"><b>发布匿名帖子</b><small>支持文字、图文、短视频入口</small></div><textarea id="nilflow-post-text" maxlength="800" placeholder="写下只属于平台匿名ID的内容"></textarea><div class="nilflow-filter-row"><select id="nilflow-post-style"><option value="minimal">极简黑白</option><option value="card">卡片分栏</option><option value="literary">文艺版式</option></select><button onclick="nilflowPickPostMedia()">上传图片/视频</button></div><div id="nilflow-media-preview">'+(nilflowPostMedia?'<span>已选择媒体：'+nilflowEsc(nilflowPostMedia.type||'file')+'</span>':'')+'</div><button class="nilflow-primary" onclick="nilflowCreatePost()">发布</button></div></section>';
}
function nilflowCreatePost(){
  if(!nilflowProfileReady()){ nilflowToast('请先设置匿名ID'); nilflowState.tab='mine'; nilflowRender(); return; }
  var textEl=document.getElementById('nilflow-post-text');
  var styleEl=document.getElementById('nilflow-post-style');
  var text=textEl?textEl.value.trim():'';
  if(!text){ nilflowToast('先写一点内容'); return; }
  nilflowState.posts.unshift({id:nilflowId(), author:nilflowState.profile.id.trim(), avatar:nilflowState.profile.avatar||'', text:text, style:styleEl?styleEl.value:'minimal', likes:0, comments:0, reposts:0, ts:Date.now(), media:nilflowPostMedia?nilflowPostMedia.data:null, mediaType:nilflowPostMedia?nilflowPostMedia.type:''});
  nilflowPostMedia=null;
  nilflowState.tab='home';
  nilflowSave();
  nilflowRender();
}
function nilflowRenderMine(){
  var p=nilflowState.profile;
  return '<section class="nilflow-page"><div class="nilflow-panel"><div class="nilflow-panel-title"><b>匿名身份</b><small>不与现实社交资料互通</small></div><div class="nilflow-profile-row">'+nilflowAvatarHtml(p,'large')+'<button onclick="nilflowPickAvatar()">上传匿名头像</button></div><label class="nilflow-field">匿名ID<input id="nilflow-profile-id" value="'+nilflowEsc(p.id||'')+'" maxlength="24" placeholder="例如 teal_room"></label><label class="nilflow-field">个人简介<textarea id="nilflow-profile-bio" maxlength="160" placeholder="只描述你想展示给平台的匿名人格">'+nilflowEsc(p.bio||'')+'</textarea></label><label class="nilflow-field">人设标签<input id="nilflow-profile-tags" value="'+nilflowEsc((p.tags||[]).join('，'))+'" placeholder="慢热，低频社交，树洞"></label><label class="nilflow-field">兴趣分类<input id="nilflow-profile-interests" value="'+nilflowEsc((p.interests||[]).join('，'))+'" placeholder="文字，电影，夜谈"></label><button class="nilflow-primary" onclick="nilflowSaveProfile()">保存资料</button></div>'
    + '<div class="nilflow-panel"><div class="nilflow-panel-title"><b>隐私设置</b><small>平台内匿名权限</small></div>'+nilflowSwitch('hideOnline','隐藏在线状态')+nilflowSwitch('blockStrangers','禁止陌生人匹配')+nilflowSwitch('voiceEnabled','允许一对一语音通话')+'</div>'
    + '<div class="nilflow-panel danger"><div class="nilflow-panel-title"><b>数据管理</b><small>只清理匿流模块数据</small></div><button onclick="nilflowClearChats()">一键清空聊天记录</button><button onclick="nilflowDeletePosts()">删除全部发帖内容</button><button onclick="nilflowDeactivateAccount()">注销匿名账号</button></div></section>';
}
function nilflowSwitch(key,label){ return '<label class="nilflow-privacy-row"><span>'+label+'</span><input type="checkbox" '+(nilflowState.privacy[key]?'checked':'')+' onchange="nilflowSetPrivacy(\''+key+'\',this.checked)"></label>'; }
function nilflowPickAvatar(){ var n=document.getElementById('nilflow-avatar-input'); if(n) n.click(); }
function nilflowHandleAvatar(e){
  var file=e.target.files&&e.target.files[0];
  if(!file) return;
  nilflowReadFile(file, function(data){ nilflowState.profile.avatar=data; nilflowSave(); nilflowRender(); });
  e.target.value='';
}
function nilflowPickPostMedia(){ var n=document.getElementById('nilflow-post-media-input'); if(n) n.click(); }
function nilflowHandlePostMedia(e){
  var file=e.target.files&&e.target.files[0];
  if(!file) return;
  nilflowReadFile(file, function(data){ nilflowPostMedia={data:data,type:file.type||'file'}; nilflowRender(); });
  e.target.value='';
}
function nilflowReadFile(file, done){
  if(file.type && file.type.indexOf('image/')===0 && typeof compressImage==='function'){
    compressImage(file, 960, 0.82, function(res){ done(res); });
    return;
  }
  var reader=new FileReader();
  reader.onload=function(){ done(reader.result); };
  reader.readAsDataURL(file);
}
function nilflowSaveProfile(){
  var id=document.getElementById('nilflow-profile-id');
  var bio=document.getElementById('nilflow-profile-bio');
  var tags=document.getElementById('nilflow-profile-tags');
  var interests=document.getElementById('nilflow-profile-interests');
  var nextId=id?id.value.trim():'';
  if(!/^[A-Za-z0-9_\-]{3,24}$/.test(nextId)){ nilflowToast('匿名ID需为3-24位字母、数字、横线或下划线'); return; }
  var used=nilflowPool().some(function(u){ return u.id.toLowerCase()===nextId.toLowerCase(); });
  if(used){ nilflowToast('这个匿名ID已被占用'); return; }
  nilflowState.profile.id=nextId;
  nilflowState.profile.bio=bio?bio.value.trim():'';
  nilflowState.profile.tags=nilflowSplit(tags?tags.value:'');
  nilflowState.profile.interests=nilflowSplit(interests?interests.value:'');
  nilflowSave();
  nilflowToast('资料已保存');
  nilflowRender();
}
function nilflowSplit(v){ return String(v||'').split(/[，,]/).map(function(x){ return x.trim(); }).filter(Boolean).slice(0,8); }
function nilflowSetPrivacy(key,val){ nilflowState.privacy[key]=!!val; nilflowSave(); nilflowRender(); }
function nilflowReactPost(id,key){ var p=nilflowState.posts.find(function(x){ return x.id===id; }); if(p){ p[key]=(p[key]||0)+1; nilflowSave(); nilflowRender(); } }
function nilflowClearChats(){ if(!confirm('确定清空匿流聊天记录？')) return; nilflowState.chats={}; nilflowSave(); nilflowRender(); }
function nilflowDeletePosts(){ if(!confirm('确定删除你发布的匿流帖子？')) return; var me=(nilflowState.profile.id||'').trim(); nilflowState.posts=nilflowState.posts.filter(function(p){ return p.author!==me; }); nilflowSave(); nilflowRender(); }
function nilflowDeactivateAccount(){ if(!confirm('确定注销匿流匿名账号并清空本模块数据？')) return; nilflowState=nilflowDefault(); nilflowActiveChat=''; nilflowVoiceSession=null; nilflowPostMedia=null; nilflowSave(); nilflowRender(); }
function nilflowBlockUser(id){ if(!id) return; if(nilflowState.blocked.indexOf(id)<0) nilflowState.blocked.push(id); nilflowState.friends=nilflowState.friends.filter(function(f){ return f.id!==id; }); delete nilflowState.chats[id]; nilflowSave(); nilflowToast('已拉黑 '+id); nilflowRender(); }
function nilflowReportUser(id){ if(!id) return; nilflowState.reports.push({id:id, ts:Date.now(), reason:'用户举报'}); nilflowSave(); nilflowToast('已提交举报'); }