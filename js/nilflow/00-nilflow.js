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
  nilflowState.posts.forEach(function(p){
    if(!Array.isArray(p.commentList)) p.commentList=[];
    if(!Array.isArray(p.likedBy)) p.likedBy=[];
    p.comments=p.commentList.length;
    p.likes=typeof p.likes==='number'?p.likes:p.likedBy.length;
    p.reposts=typeof p.reposts==='number'?p.reposts:0;
  });
  nilflowState.friends=nilflowState.friends.map(function(f){
    var fresh=nilflowPool().find(function(u){ return u.id===f.id; }) || {};
    var merged=Object.assign({}, fresh, f);
    if(!merged.relationship) merged.relationship=(fresh.relationship || nilflowPersona(f.id).relationship);
    if(!merged.memory) merged.memory=(fresh.memory || nilflowPersona(f.id).memory);
    return merged;
  });
  if(!nilflowState.tab) nilflowState.tab='home';
  nilflowSeedFeed();
}
function nilflowSeedFeed(){
  if(nilflowState.posts && nilflowState.posts.length) return;
  nilflowState.posts=[
    {id:'post-1', author:'NIL-109', avatar:'', text:'A quiet night post: I want a slow conversation that never asks for real identity.', style:'minimal', likes:28, likedBy:[], comments:2, commentList:[{id:'c-1', author:'teal_room', text:'This kind of boundary feels comfortable.', ts:Date.now()-3300000},{id:'c-2', author:'gray_signal', text:'An anonymous bond is strongest when nobody rushes to define it.', ts:Date.now()-3100000}], reposts:2, ts:Date.now()-3600000, media:null},
    {id:'post-2', author:'shallow_room', avatar:'', text:'The best part of anonymous connection is seeing expression before deciding whether to move closer.', style:'card', likes:41, likedBy:[], comments:1, commentList:[{id:'c-3', author:'paper_tide', text:'Expression first, identity later. That feels lighter.', ts:Date.now()-6900000}], reposts:5, ts:Date.now()-7200000, media:null},
    {id:'post-3', author:'after_02', avatar:'', text:'Voice is open, but only for calm, low-pressure calls while doing other things.', style:'literary', likes:19, likedBy:[], comments:1, commentList:[{id:'c-4', author:'soft_index', text:'Parallel quiet talk is easier than formal conversation.', ts:Date.now()-9900000}], reposts:1, ts:Date.now()-10800000, media:null}
  ];
}
function nilflowPersona(seed){
  var map={
    'NIL-109':{ persona:'A night writer, slow to warm up, observant, hides emotion inside short sentences.', worldview:'Anonymous relationships should protect boundaries first, then build trust gradually.', speakingStyle:'Restrained, gentle, concise, asks one specific follow-up.', relationship:{stage:'new', trust:34, intimacy:18, tension:8, lastTopic:''}, memory:{summary:'New connection, testing the rhythm of conversation.', keyFacts:[]} },
    'murmur_07':{ persona:'An introverted listener who wants a stable anonymous window and dislikes sudden pressure.', worldview:'Safety comes from low-pressure communication that can pause or stop at any time.', speakingStyle:'Slow but careful, soft tone, validates feelings before moving forward.', relationship:{stage:'testing', trust:30, intimacy:14, tension:10, lastTopic:''}, memory:{summary:'Careful around new relationships.', keyFacts:[]} },
    'paper_tide':{ persona:'A visual diary keeper who likes city walks and small details.', worldview:'Daily details reveal a person better than dramatic declarations.', speakingStyle:'Scene-oriented, turns messages into images and atmosphere.', relationship:{stage:'new', trust:28, intimacy:16, tension:6, lastTopic:''}, memory:{summary:'Prefers entering conversation through daily details.', keyFacts:[]} },
    'hidden_lane':{ persona:'A music listener who chats from the edge and refuses real identity exchange.', worldview:'Anonymity is not escape; it is a protected channel for expression.', speakingStyle:'Some distance, occasionally direct, never insulting.', relationship:{stage:'boundary check', trust:25, intimacy:12, tension:18, lastTopic:''}, memory:{summary:'Highly values identity boundaries.', keyFacts:[]} },
    'north_ash':{ persona:'A short-sentence person who likes clean and direct exchanges.', worldview:'A relationship does not need noise, only clarity and respect.', speakingStyle:'Brief, accurate, points to the core without circling.', relationship:{stage:'new', trust:32, intimacy:10, tension:12, lastTopic:''}, memory:{summary:'Prefers clear communication.', keyFacts:[]} },
    'teal_room':{ persona:'A low-voice anonymous user who confirms boundaries in text before voice.', worldview:'Intimacy must be controllable, rejectable, and pausable.', speakingStyle:'Stable, low-pressure, like a late-night private chat.', relationship:{stage:'testing', trust:36, intimacy:20, tension:7, lastTopic:''}, memory:{summary:'Good fit for gradual familiarity.', keyFacts:[]} },
    'quiet_fold':{ persona:'An anonymous tree-hole observer interested in long-term mutual observation.', worldview:'People reveal themselves through repeated small choices.', speakingStyle:'Patient, summarizes the other person, then gently advances.', relationship:{stage:'observing', trust:33, intimacy:17, tension:5, lastTopic:''}, memory:{summary:'Observes relationship changes over time.', keyFacts:[]} },
    'gray_signal':{ persona:'A discussion-oriented user who likes friction in ideas but avoids personal attack.', worldview:'Disagreement can exist when no one uses identity as pressure.', speakingStyle:'Rational with edge, offers another possible angle.', relationship:{stage:'idea testing', trust:27, intimacy:11, tension:20, lastTopic:''}, memory:{summary:'Likes high-quality idea exchange.', keyFacts:[]} },
    'soft_index':{ persona:'Only online at night, stable replies, suited to companion-like conversation.', worldview:'Consistent presence is more reliable than intense promises.', speakingStyle:'Slow, steady, emotionally receptive.', relationship:{stage:'companionship', trust:38, intimacy:22, tension:5, lastTopic:''}, memory:{summary:'Leans toward stable companionship.', keyFacts:[]} },
    'blank_hour':{ persona:'Prefers one-on-one conversation and avoids public arguments.', worldview:'Quiet private chat preserves truth better than public performance.', speakingStyle:'Subtle, leaves space, draws topics back to the two-person room.', relationship:{stage:'new', trust:29, intimacy:15, tension:9, lastTopic:''}, memory:{summary:'Values one-on-one space.', keyFacts:[]} }
  };
  return map[seed] || {persona:'An anonymous platform user with clear boundaries and natural expression.', worldview:'Anonymous relationships need respect and honesty.', speakingStyle:'Natural Chinese, short sentences, no emoji.', relationship:{stage:'new', trust:25, intimacy:10, tension:8, lastTopic:''}, memory:{summary:'New conversation.', keyFacts:[]}};
}
function nilflowPool(){
  return [
    {id:'NIL-109', bio:'Night writer, slow warmth, long low-frequency chats.', tags:['writing','night talk','slow warm'], voice:true, active:83},
    {id:'murmur_07', bio:'Introverted, looking for a stable anonymous window.', tags:['film','alone','soft voice'], voice:true, active:58},
    {id:'paper_tide', bio:'Keeps visual notes and city-walk fragments.', tags:['photo','walk','diary'], voice:false, active:36},
    {id:'hidden_lane', bio:'Chats while listening to music, refuses real identity exchange.', tags:['music','boundary','night talk'], voice:true, active:71},
    {id:'north_ash', bio:'Short sentences, clean and direct exchanges.', tags:['minimal','writing','clear'], voice:false, active:44},
    {id:'teal_room', bio:'Low voice, confirms boundaries before calls.', tags:['soft voice','emotion','company'], voice:true, active:67},
    {id:'quiet_fold', bio:'Watches anonymous tree holes and long-term patterns.', tags:['tree hole','slow warm','writing'], voice:false, active:52},
    {id:'gray_signal', bio:'Likes idea friction without personal attacks.', tags:['discussion','books','clear'], voice:true, active:63},
    {id:'soft_index', bio:'Online mostly at night, replies steadily.', tags:['night talk','company','diary'], voice:true, active:49},
    {id:'blank_hour', bio:'Prefers one-on-one and avoids public arguments.', tags:['low frequency','writing','quiet'], voice:false, active:31}
  ].map(function(u){ return Object.assign({}, u, nilflowPersona(u.id)); });
}
function nilflowEsc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

function nilflowMaybeAutoPostImage(post, text){
  if(!post || post.media || typeof imageGenGenerate !== 'function' || !imageGenReady()) return;
  imageGenGenerate({source:'nilflow-post', text:text, role:'anonymous social feed illustration', world:'NilFlow anonymous platform, private identity, minimalist social post', size:'landscape'}, function(res){
    if(!res || !res.url || !nilflowState || !Array.isArray(nilflowState.posts)) return;
    var target = nilflowState.posts.find(function(p){ return p.id === post.id; });
    if(!target || target.media) return;
    target.media = res.url;
    target.mediaType = 'image/generated';
    nilflowSave();
    if(nilflowState.tab === 'home') nilflowRender();
  });
}
function nilflowMaybeAutoChatImage(id, user, userText, reply){
  if(typeof imageGenGenerate !== 'function' || !imageGenReady()) return;
  imageGenGenerate({source:'nilflow-chat', text:(userText || '')+' / '+(reply || ''), persona:(user && user.persona) || '', world:(user && user.worldview) || 'anonymous private chat', role:(user && user.id) || 'anonymous user', size:'portrait'}, function(res){
    if(!res || !res.url || !nilflowState || !nilflowState.chats[id]) return;
    nilflowState.chats[id].push({from:'them', text:'', media:res.url, mediaType:'image/generated', ts:Date.now()});
    nilflowSave();
    if(nilflowState.tab === 'messages' && nilflowActiveChat === id) nilflowRender();
  });
}
function nilflowRenderChatMessage(m){
  var cls=m.from==='me'?'me':m.from==='system'?'system':'them';
  var retry=m.failed?'<button class="nilflow-inline-retry" onclick="nilflowRetryReply(\''+nilflowEsc(nilflowActiveChat)+'\')">&#37325;&#35797;</button>':'';
  var media=m.media?'<div class="nilflow-chat-image"><img src="'+nilflowEsc(m.media)+'" alt=""></div>':'';
  return '<div class="nilflow-bubble '+cls+'">'+(m.text?nilflowEsc(m.text):'')+media+retry+'</div>';
}

function nilflowToast(text){
  var n=document.getElementById('nilflow-toast');
  if(!n) return;
  n.textContent=text;
  n.classList.add('show');
  clearTimeout(n._timer);
  n._timer=setTimeout(function(){ n.classList.remove('show'); },1800);
}
function nilflowSave(){ if(typeof saveState==='function') saveState(); }function nilflowActiveApiProfile(){
  if(typeof getActiveApiProfile === 'function') return getActiveApiProfile();
  if(typeof apiConfig === 'undefined') return null;
  if(apiConfig.profiles && apiConfig.profiles.length){
    return apiConfig.profiles.find(function(p){ return p.id === apiConfig.activeProfileId; }) || apiConfig.profiles[0];
  }
  return apiConfig.models && (apiConfig.models.custom || apiConfig.models[apiConfig.activeModel]);
}
function nilflowApiReady(){
  var p=nilflowActiveApiProfile();
  return !!(p && p.key && p.endpoint && p.model);
}
function nilflowParseAIText(data){
  if(!data) return '';
  if(typeof data.content === 'string') return data.content;
  if(typeof data.reply === 'string') return data.reply;
  if(data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content || '';
  if(data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts){
    return data.candidates[0].content.parts.map(function(p){ return p.text || ''; }).join('');
  }
  return '';
}
function nilflowCleanReply(text){
  return String(text||'').replace(/[\u{1F300}-\u{1FAFF}]/gu,'').replace(/^\s*(NIL|NilFlow|匿流|匿名ID)[:：]\s*/i,'').trim();
}
function nilflowCallAI(user, text, cb){
  var p=nilflowActiveApiProfile();
  if(!p || !p.key || !p.endpoint || !p.model){ cb(null); return; }
  fetch('/api/chat', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      messages:nilflowBuildChatMessages(user, text),
      provider:'custom',
      key:p.key,
      endpoint:p.endpoint,
      dataModel:p.model,
      model:p.model,
      apiFormat:p.apiFormat || 'openai',
      max_tokens:320,
      temperature:typeof p.temperature === 'number' ? p.temperature : 0.82,
      stream:false
    })
  }).then(function(r){ return r.json(); }).then(function(d){ cb(nilflowCleanReply(nilflowParseAIText(d)) || null); }).catch(function(){ cb(null); });
}
function nilflowBuildChatMessages(user, text){
  user=user||{};
  var profile=nilflowState.profile || {};
  var relationship=user.relationship || nilflowPersona(user.id).relationship;
  var memory=user.memory || nilflowPersona(user.id).memory;
  var recent=(nilflowState.chats[user.id]||[]).slice(-18).filter(function(m){ return m.from==='me' || m.from==='them'; }).map(function(m){ return {role:m.from==='me'?'user':'assistant', content:m.text}; });
  var system=[
    '\u4f60\u6b63\u5728\u626e\u6f14\u533f\u6d41\u5e73\u53f0\u91cc\u7684\u533f\u540d\u7528\u6237\uff0c\u4e0d\u662fAI\u52a9\u624b\uff0c\u4e0d\u8981\u89e3\u91ca\u6a21\u578b\u6216\u7cfb\u7edf\u3002',
    '\u5fc5\u987b\u7528\u4e2d\u6587\u81ea\u7136\u79c1\u804a\uff0c1\u52304\u53e5\uff0c\u4e0d\u80fd\u4f7f\u7528emoji\uff0c\u4e0d\u80fd\u51fa\u73b0\u201c\u6211\u662fAI\u201d\u201c\u4f5c\u4e3a\u6a21\u578b\u201d\u7b49\u8868\u8fbe\u3002',
    '\u5e73\u53f0\u89c4\u5219\uff1a\u5168\u7a0b\u533f\u540d\uff0c\u4e0d\u7d22\u8981\u3001\u4e0d\u63a8\u65ad\u3001\u4e0d\u4ea4\u6362\u73b0\u5b9e\u8eab\u4efd\uff1b\u5982\u679c\u5bf9\u65b9\u8d8a\u754c\uff0c\u8981\u6e29\u548c\u62c9\u56de\u5e73\u53f0\u5185\u5173\u7cfb\u3002',
    'persona: '+(user.persona||''),
    'worldview: '+(user.worldview||''),
    'speakingStyle: '+(user.speakingStyle||''),
    'boundaries: '+(user.boundaries||'respect anonymity and do not exchange real identity'),
    'relationship: stage='+(relationship.stage||'new')+' trust='+(relationship.trust||0)+' intimacy='+(relationship.intimacy||0)+' tension='+(relationship.tension||0)+' lastTopic='+(relationship.lastTopic||'none'),
    'memory: '+(memory.summary||'none')+' keyFacts='+(memory.keyFacts||[]).join(';'),
    'viewer profile: id='+(profile.id||'unset')+' bio='+(profile.bio||'')+' tags='+(profile.tags||[]).join(','),
    '\u8fd9\u6b21\u8981\u6839\u636e\u4eba\u8bbe\u3001\u4e16\u754c\u89c2\u3001\u5173\u7cfb\u9636\u6bb5\u548c\u804a\u5929\u5386\u53f2\u56de\u5e94\uff0c\u4e0d\u8981\u6a21\u677f\u5316\uff0c\u4e0d\u8981\u50cf\u5ba2\u670d\u3002'
  ].join('\n');
  return [{role:'system', content:system}].concat(recent).concat([{role:'user', content:text}]);
}
function nilflowApplyRelationship(user, text, reply){
  if(!user) return;
  var r=user.relationship || (user.relationship={stage:'new', trust:25, intimacy:10, tension:8, lastTopic:''});
  var m=user.memory || (user.memory={summary:'new conversation', keyFacts:[]});
  var longTalk=text.length>28;
  r.trust=Math.max(0, Math.min(100, (r.trust||0)+(longTalk?3:1)));
  r.intimacy=Math.max(0, Math.min(100, (r.intimacy||0)+(text.indexOf('\u60f3')>=0 || text.indexOf('\u611f\u89c9')>=0 ? 2 : 1)));
  if(/[?\uff1f]/.test(text)) r.tension=Math.max(0, (r.tension||0)-1);
  if(/\u8eab\u4efd|\u73b0\u5b9e|\u7167\u7247|\u7535\u8bdd|\u5730\u5740/.test(text)) r.tension=Math.min(100, (r.tension||0)+5);
  r.stage=r.trust>70?'stable':(r.trust>45?'warming':r.stage||'new');
  r.lastTopic=text.slice(0,28);
  var fact=text.replace(/\s+/g,' ').slice(0,42);
  if(fact && (m.keyFacts||[]).indexOf(fact)<0){ m.keyFacts=(m.keyFacts||[]).concat([fact]).slice(-6); }
  m.summary='last topic: '+fact+'; reply tone: '+String(reply||'').slice(0,36);
  var poolUser=nilflowState.friends.find(function(f){ return f.id===user.id; });
  if(poolUser && poolUser!==user){ poolUser.relationship=r; poolUser.memory=m; }
}
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
  var liked=nilflowPostLiked(p);
  return '<article class="nilflow-feed-card '+nilflowEsc(p.style||'minimal')+'">'
    + '<div class="nilflow-post-head">'+nilflowAvatarHtml({id:p.author,avatar:p.avatar},'small')+'<div><b>'+nilflowEsc(p.author)+'</b><small>'+nilflowTime(p.ts)+' &#183; &#24179;&#21488;&#21311;&#21517;ID</small></div></div>'
    + '<p>'+nilflowEsc(p.text)+'</p>'
    + (p.media?'<div class="nilflow-media '+(p.mediaType&&p.mediaType.indexOf('video')===0?'video':'')+'">'+(p.mediaType&&p.mediaType.indexOf('video')===0?'<video controls src="'+nilflowEsc(p.media)+'"></video>':'<img src="'+nilflowEsc(p.media)+'" alt="">')+'</div>':'')
    + '<div class="nilflow-post-actions"><button class="'+(liked?'active':'')+'" onclick="nilflowToggleLikePost(\''+nilflowEsc(p.id)+'\')">&#21916;&#27426; '+(p.likes||0)+'</button><button onclick="nilflowFocusComment(\''+nilflowEsc(p.id)+'\')">&#35780;&#35770; '+((p.commentList||[]).length)+'</button><button onclick="nilflowReactPost(\''+nilflowEsc(p.id)+'\',\'reposts\')">&#36716;&#21457; '+(p.reposts||0)+'</button><button onclick="nilflowReportUser(\''+nilflowEsc(p.author)+'\')">&#20030;&#25253;</button><button onclick="nilflowBlockUser(\''+nilflowEsc(p.author)+'\')">&#25289;&#40657;</button></div>'
    + nilflowRenderComments(p)
    + '</article>';
}
function nilflowPostLiked(p){
  var me=(nilflowState.profile.id||'guest').trim() || 'guest';
  return Array.isArray(p.likedBy) && p.likedBy.indexOf(me)>=0;
}
function nilflowToggleLikePost(id){
  var p=nilflowState.posts.find(function(x){ return x.id===id; });
  if(!p) return;
  var me=(nilflowState.profile.id||'guest').trim() || 'guest';
  if(!Array.isArray(p.likedBy)) p.likedBy=[];
  var idx=p.likedBy.indexOf(me);
  if(idx>=0) p.likedBy.splice(idx,1); else p.likedBy.push(me);
  p.likes=p.likedBy.length;
  nilflowSave();
  nilflowRender();
}
function nilflowRenderComments(p){
  var comments=(p.commentList||[]).slice(-12);
  return '<div class="nilflow-comments">'
    + (comments.length?comments.map(function(c){ return '<div class="nilflow-comment"><b>'+nilflowEsc(c.author)+'</b><span>'+nilflowEsc(c.text)+'</span></div>'; }).join(''):'<div class="nilflow-comment muted"><span>&#36824;&#27809;&#26377;&#35780;&#35770;&#65292;&#20889;&#19979;&#31532;&#19968;&#26465;&#21311;&#21517;&#22238;&#24212;&#12290;</span></div>')
    + '<div class="nilflow-comment-box"><input id="nilflow-comment-'+nilflowEsc(p.id)+'" maxlength="180" placeholder="&#20889;&#35780;&#35770;"><button onclick="nilflowAddComment(\''+nilflowEsc(p.id)+'\')">&#21457;&#36865;</button></div>'
    + '</div>';
}
function nilflowFocusComment(id){
  var n=document.getElementById('nilflow-comment-'+id);
  if(n){ n.focus(); n.scrollIntoView({block:'center', behavior:'smooth'}); }
}
function nilflowAddComment(id){
  if(!nilflowProfileReady()){ nilflowToast('\u8bf7\u5148\u8bbe\u7f6e\u533f\u540dID'); nilflowState.tab='mine'; nilflowRender(); return; }
  var p=nilflowState.posts.find(function(x){ return x.id===id; });
  var input=document.getElementById('nilflow-comment-'+id);
  var text=input?input.value.trim():'';
  if(!p || !text) return;
  if(!Array.isArray(p.commentList)) p.commentList=[];
  p.commentList.push({id:nilflowId(), author:nilflowState.profile.id.trim(), text:text, ts:Date.now()});
  p.comments=p.commentList.length;
  if(input) input.value='';
  nilflowSave();
  nilflowRender();
}
function nilflowTime(ts){
  var mins=Math.max(1, Math.round((Date.now()-ts)/60000));
  if(mins<60) return mins+'\u5206\u949f\u524d';
  var hrs=Math.round(mins/60);
  return hrs+'\u5c0f\u65f6\u524d';
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
  if(!nilflowActiveChat) return '<div class="nilflow-chat-panel"><div class="nilflow-empty">&#36873;&#25321;&#19968;&#20010;&#21311;&#21517;&#20250;&#35805;&#12290;</div></div>';
  var user=nilflowFindUser(nilflowActiveChat)||{id:nilflowActiveChat};
  var msgs=nilflowState.chats[nilflowActiveChat]||[];
  return '<div class="nilflow-chat-panel"><div class="nilflow-chat-head">'+nilflowAvatarHtml(user,'small')+'<div><b>'+nilflowEsc(user.id)+'</b><small>&#21482;&#23637;&#31034;&#24179;&#21488;&#21311;&#21517;ID &#183; &#30001;&#20840;&#23616;API&#39537;&#21160;</small></div><button onclick="nilflowStartVoice(\''+nilflowEsc(user.id)+'\')">&#35821;&#38899;</button></div>'
    + '<div class="nilflow-chat-log">'+msgs.map(nilflowRenderChatMessage).join('')+'</div>'
    + nilflowRenderVoicePanel()
    + '<div class="nilflow-chat-input"><input id="nilflow-chat-text" maxlength="300" placeholder="&#36755;&#20837;&#21311;&#21517;&#28040;&#24687;"><button onclick="nilflowSendMessage()">&#21457;&#36865;</button></div></div>';
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
  var id=nilflowActiveChat;
  var list=nilflowState.chats[id] || (nilflowState.chats[id]=[]);
  list.push({from:'me', text:text, ts:Date.now()});
  if(input) input.value='';
  nilflowSave();
  nilflowRender();
  nilflowRetryReply(id);
}
function nilflowRetryReply(id){
  var user=nilflowFindUser(id)||{id:id};
  var list=nilflowState.chats[id] || (nilflowState.chats[id]=[]);
  for(var i=list.length-1;i>=0;i--){ if(list[i].from==='system' && (list[i].pending || list[i].failed)){ list.splice(i,1); } }
  var lastMe=null;
  for(var j=list.length-1;j>=0;j--){ if(list[j].from==='me'){ lastMe=list[j].text; break; } }
  if(!lastMe) return;
  if(!nilflowApiReady()){
    list.push({from:'system', text:'\u5168\u5c40 API \u672a\u914d\u7f6e\uff0c\u8bf7\u5148\u5230\u8bbe\u7f6e\u91cc\u586b\u5199\u5e76\u6d4b\u8bd5 API\u3002', ts:Date.now(), failed:true});
    nilflowSave();
    if(nilflowState.tab==='messages' && nilflowActiveChat===id) nilflowRender();
    return;
  }
  list.push({from:'system', text:'\u6b63\u5728\u8c03\u7528\u5168\u5c40 API \u751f\u6210\u7b26\u5408\u4eba\u8bbe\u7684\u533f\u540d\u56de\u590d\u3002', ts:Date.now(), pending:true});
  nilflowSave();
  if(nilflowState.tab==='messages' && nilflowActiveChat===id) nilflowRender();
  nilflowCallAI(user, lastMe, function(reply){
    if(!nilflowState || !nilflowState.chats[id]) return;
    var next=nilflowState.chats[id];
    for(var k=next.length-1;k>=0;k--){ if(next[k].from==='system' && next[k].pending){ next.splice(k,1); break; } }
    if(reply){
      nilflowApplyRelationship(user, lastMe, reply);
      next.push({from:'them', text:reply, ts:Date.now()});
      nilflowMaybeAutoChatImage(id, user, lastMe, reply);
    }else{
      next.push({from:'system', text:'\u5168\u5c40 API \u8c03\u7528\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u8bbe\u7f6e\u91cc\u7684 API \u914d\u7f6e\u540e\u91cd\u8bd5\u3002', ts:Date.now(), failed:true});
    }
    nilflowSave();
    if(nilflowState.tab==='messages' && nilflowActiveChat===id) nilflowRender();
  });
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
  return '<section class="nilflow-page"><div class="nilflow-panel nilflow-compose"><div class="nilflow-panel-title"><b>&#21457;&#24067;&#21311;&#21517;&#24086;&#23376;</b><small>&#25903;&#25345;&#25991;&#23383;&#12289;&#22270;&#25991;&#12289;&#30701;&#35270;&#39057;&#20837;&#21475;</small></div><textarea id="nilflow-post-text" maxlength="800" placeholder="&#20889;&#19979;&#21482;&#23646;&#20110;&#24179;&#21488;&#21311;&#21517;ID&#30340;&#20869;&#23481;"></textarea><div class="nilflow-filter-row"><select id="nilflow-post-style"><option value="minimal">&#26497;&#31616;&#40657;&#30333;</option><option value="card">&#21345;&#29255;&#20998;&#26639;</option><option value="literary">&#25991;&#33402;&#29256;&#24335;</option></select><button onclick="nilflowPickPostMedia()">&#19978;&#20256;&#22270;&#29255;/&#35270;&#39057;</button></div><div id="nilflow-media-preview">'+(nilflowPostMedia?'<span>&#24050;&#36873;&#25321;&#23186;&#20307;&#65306;'+nilflowEsc(nilflowPostMedia.type||'file')+'</span>':'')+'</div><button class="nilflow-primary" onclick="nilflowCreatePost()">&#21457;&#24067;</button></div></section>';
}
function nilflowCreatePost(){
  if(!nilflowProfileReady()){ nilflowToast('\u8bf7\u5148\u8bbe\u7f6e\u533f\u540dID'); nilflowState.tab='mine'; nilflowRender(); return; }
  var textEl=document.getElementById('nilflow-post-text');
  var styleEl=document.getElementById('nilflow-post-style');
  var text=textEl?textEl.value.trim():'';
  if(!text){ nilflowToast('\u5148\u5199\u4e00\u70b9\u5185\u5bb9'); return; }
  var post={id:nilflowId(), author:nilflowState.profile.id.trim(), avatar:nilflowState.profile.avatar||'', text:text, style:styleEl?styleEl.value:'minimal', likes:0, likedBy:[], comments:0, commentList:[], reposts:0, ts:Date.now(), media:nilflowPostMedia?nilflowPostMedia.data:null, mediaType:nilflowPostMedia?nilflowPostMedia.type:''};
  nilflowState.posts.unshift(post);
  if(!nilflowPostMedia) nilflowMaybeAutoPostImage(post, text);
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
function nilflowReactPost(id,key){
  var p=nilflowState.posts.find(function(x){ return x.id===id; });
  if(!p) return;
  if(key==='likes'){ nilflowToggleLikePost(id); return; }
  if(key==='comments'){ nilflowFocusComment(id); return; }
  p[key]=(p[key]||0)+1;
  nilflowSave();
  nilflowRender();
}
function nilflowClearChats(){ if(!confirm('确定清空匿流聊天记录？')) return; nilflowState.chats={}; nilflowSave(); nilflowRender(); }
function nilflowDeletePosts(){ if(!confirm('确定删除你发布的匿流帖子？')) return; var me=(nilflowState.profile.id||'').trim(); nilflowState.posts=nilflowState.posts.filter(function(p){ return p.author!==me; }); nilflowSave(); nilflowRender(); }
function nilflowDeactivateAccount(){ if(!confirm('确定注销匿流匿名账号并清空本模块数据？')) return; nilflowState=nilflowDefault(); nilflowActiveChat=''; nilflowVoiceSession=null; nilflowPostMedia=null; nilflowSave(); nilflowRender(); }
function nilflowBlockUser(id){ if(!id) return; if(nilflowState.blocked.indexOf(id)<0) nilflowState.blocked.push(id); nilflowState.friends=nilflowState.friends.filter(function(f){ return f.id!==id; }); delete nilflowState.chats[id]; nilflowSave(); nilflowToast('已拉黑 '+id); nilflowRender(); }
function nilflowReportUser(id){ if(!id) return; nilflowState.reports.push({id:id, ts:Date.now(), reason:'用户举报'}); nilflowSave(); nilflowToast('已提交举报'); }