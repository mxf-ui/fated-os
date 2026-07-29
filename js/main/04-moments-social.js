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

