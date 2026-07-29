/* ============ FORUM (拾光论坛) ============ */
var forumState = { posts:[], filter:'reco', detailIdx:-1, day:'', loading:false };

function stripEmoji(s){ try{ return String(s).replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,''); }catch(e){ return String(s); } }
function forumInitial(name){ return esc(String(name||'匿').trim().charAt(0)||'匿'); }
function forumDayKey(){ var d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate(); }
function forumSaveDaily(){ try{ localStorage.setItem('forum_daily', JSON.stringify({day:forumState.day, posts:forumState.posts})); }catch(e){} }

/* 论坛专用 LLM 调用（大 token 上限）：代理优先，直连兜底 */
function forumCallLLM(userPrompt, sysPrompt, cb){
  var cfg=apiConfig, model=cfg.activeModel||'deepseek', m=cfg.models[model];
  if(!m||!m.key){ cb(null); return; }
  var msgs=[{role:'system',content:sysPrompt},{role:'user',content:userPrompt}];
  function tryDirect(done){
    var url,hdrs,bd;
    var ep = modelEndpoint(m, model);
    if(!ep){ done(null); return; }
    if(model==='deepseek'||model==='chatgpt'){ url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:4096,temperature:0.95}); }
    else if(model==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:sysPrompt,messages:[{role:'user',content:userPrompt}],max_tokens:4096}); }
    else if(model==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:sysPrompt+'\n\n'+userPrompt}]}],generationConfig:{maxOutputTokens:8192,temperature:0.95}}); }
    else if(model==='custom'){
      var cf=m.apiFormat||'openai';
      if(cf==='claude'){ url=ep; hdrs={'Content-Type':'application/json','x-api-key':m.key,'anthropic-version':'2023-06-01'}; bd=JSON.stringify({model:m.model,system:sysPrompt,messages:[{role:'user',content:userPrompt}],max_tokens:4096}); }
      else if(cf==='gemini'){ url=ep+'?key='+m.key; hdrs={'Content-Type':'application/json'}; bd=JSON.stringify({contents:[{role:'user',parts:[{text:sysPrompt+'\n\n'+userPrompt}]}],generationConfig:{maxOutputTokens:8192,temperature:0.95}}); }
      else { url=ep; hdrs={'Content-Type':'application/json','Authorization':'Bearer '+m.key}; bd=JSON.stringify({model:m.model,messages:msgs,max_tokens:4096,temperature:0.95}); }
    }
    else { done(null); return; }
    fetch(url,{method:'POST',headers:hdrs,body:bd}).then(function(r){return r.json();}).then(function(data){
      var reply='';
      if(model==='deepseek'||model==='chatgpt') reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      else if(model==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
      else if(model==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
      else if(model==='custom'){
        var cf2=m.apiFormat||'openai';
        if(cf2==='claude') reply=(data.content&&data.content[0])?data.content[0].text:'';
        else if(cf2==='gemini') reply=(data.candidates&&data.candidates[0])?data.candidates[0].content.parts[0].text:'';
        else reply=(data.choices&&data.choices[0])?data.choices[0].message.content:'';
      }
      done((reply && !data.error) ? reply : null);
    }).catch(function(){ done(null); });
  }
  function tryProxy(done){
    var ep = modelEndpoint(m, model);
    var bd=JSON.stringify({messages:msgs, model:m.model, provider:model, key:m.key, endpoint:ep, dataModel:m.model, max_tokens:4096, apiFormat:(m.apiFormat||'openai')});
    fetch(proxyBase()+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:bd}).then(function(r){
      if(!r.ok){ done(null); return; }
      return r.json();
    }).then(function(data){
      if(!data){ done(null); return; }
      var reply=data.content||data.reply||'';
      if(/API连接失败|API Error|Invalid API|401|403|unauthorized|forbidden|请在设置|填入 API Key|请先在设置|缺(少)?\s*API|Proxy error|无法访问/i.test(reply)){ done(null); return; }
      done(reply||null);
    }).catch(function(){ done(null); });
  }
  tryProxy(function(r){ if(r){ cb(r); return; } tryDirect(cb); });
}

function forumParsePosts(raw){
  if(!raw) return null;
  var s=String(raw).replace(/```json|```/g,'').trim();
  var a=s.indexOf('['), b=s.lastIndexOf(']');
  if(a<0||b<=a) return null;
  var arr; try{ arr=JSON.parse(s.slice(a,b+1)); }catch(e){ return null; }
  if(!Array.isArray(arr)||arr.length===0) return null;
  var now=Date.now(), out=[];
  arr.forEach(function(p,i){
    var title=stripEmoji(String(p&&p.title||'')).trim(), content=stripEmoji(String(p&&p.content||'')).trim();
    if(!title||!content) return;
    out.push({
      id:'fp-ai-'+now+'-'+i,
      author:stripEmoji(String(p.author||'匿名')).trim()||'匿名',
      authorType:'netizen',
      title:title, content:content,
      tag:stripEmoji(String(p.tag||'杂谈')).trim()||'杂谈',
      likes:parseInt(p.likes,10)||(Math.floor(Math.random()*900)+50),
      comments:(Array.isArray(p.comments)?p.comments:[]).map(function(c){ return {who:'netizen', name:stripEmoji(String(c&&c.name||'路人')).trim()||'路人', text:stripEmoji(String(c&&c.text||'')).trim(), ts:now-Math.floor(Math.random()*43200000)}; }).filter(function(c){ return c.text; }),
      ts:now-Math.floor(Math.random()*77760000)
    });
  });
  return out.length?out:null;
}

function forumEnsureDaily(){
  if(forumState.posts.length===0){
    try{ var c=JSON.parse(localStorage.getItem('forum_daily')); if(c&&Array.isArray(c.posts)&&c.posts.length){ forumState.posts=c.posts; forumState.day=c.day||''; } }catch(e){}
  }
  if(forumState.posts.length===0) forumLocalSeed();
  if(forumState.day!==forumDayKey()) forumAIRefresh(false);
}

function forumAIRefresh(manual){
  if(forumState.loading) return;
  var m=apiConfig.models[apiConfig.activeModel];
  if(!m||!m.key){ if(manual) showToast('未填写 API Key：请去 设置 → API Config 填写',2600,'err'); return; }
  forumState.loading=true;
  var feed=document.getElementById('forum-feed');
  if(feed && !document.getElementById('forum-loading-tip')) feed.insertAdjacentHTML('afterbegin','<div class="forum-loading" id="forum-loading-tip">正在从全网搬运今日新帖…</div>');
  var pname='测试员1';
  try{ if(window.coupleState&&window.coupleState.partner&&contacts[window.coupleState.partner]) pname=contacts[window.coupleState.partner].name; }catch(e){}
  var sys='你是一个中文论坛的内容搬运工，每天在微博、豆瓣、贴吧、虎扑、晋江、B站评论区闲逛，把看到的帖子搬运到一个小论坛。写作铁律：口语化、有网感，像真人随手敲出来的；每条帖子的句式、长短、语气必须各不相同；绝对禁止使用任何emoji和颜文字；绝对禁止AI腔和模板腔（不许出现"首先/其次/总之/不得不说"这类结构，不许排比堆砌，不许小编腔）。只输出JSON数组，不输出其他任何文字。';
  var up='今天是'+forumDayKey()+'。搬运15条帖子，输出严格JSON数组，元素格式：{"author":"发帖人网名","title":"标题","content":"正文100到260字","tag":"分类词","likes":37到4800的整数,"comments":[{"name":"评论人网名","text":"评论"}]}。每帖配3到6条评论，评论要像真实网友：有抬杠的、有吃瓜追问的、有歪楼的、有只回两三个字的。\n内容分配：其中5条必须围绕「'+userName+'」展开——论坛路人视角的八卦，比如有人偶遇'+userName+'和'+pname+'、讨论两人的关系、关于'+userName+'的传闻、被夸或被议论等，口吻是不认识本人的吃瓜网友；其余10条从这些方向混着来：娱乐圈八卦和塌房吃瓜、小说安利或吐槽（言情、原耽、网文）、电竞赛事和选手讨论、游戏版本吐槽、综艺、生活牢骚。网名要多样自然，不要都是四字文艺风。';
  forumCallLLM(up, sys, function(reply){
    forumState.loading=false;
    var tip=document.getElementById('forum-loading-tip'); if(tip&&tip.parentNode) tip.parentNode.removeChild(tip);
    var aiPosts=forumParsePosts(reply);
    if(!aiPosts){ if(manual) showToast('搬运失败：AI 返回内容无法解析，稍后再试',2600,'err'); return; }
    var keep=forumState.posts.filter(function(p){ return p.authorType==='user'||p.authorType==='contact'; });
    forumState.posts=keep.concat(aiPosts).sort(function(a,b){ return b.ts-a.ts; });
    forumState.day=forumDayKey();
    forumSaveDaily();
    if(forumState.detailIdx<0 && document.getElementById('forum-feed')) forumShowFeed();
    showToast('今日 15 条新帖已搬运',1800);
  });
}

var fakeUsers = [
  {name:'云端旅人'},{name:'深夜书店'},{name:'咖啡续命'},{name:'追光者'},
  {name:'北岛的诗'},{name:'拖延症晚期'},{name:'柠檬气泡水'},{name:'流浪的猫'},
  {name:'momo'},{name:'理想三旬'},{name:'橘子汽水'},{name:'风吹麦浪'},
  {name:'不想上班的第n天'},{name:'暮冬白桃'},{name:'半勺月光'},{name:'岛屿来信'},
  {name:'瓜田里的猹'},{name:'薄荷微光'},{name:'键盘侠克星'},{name:'深海未眠'}
];

var netizenComments = [
  '写得真好，感同身受。','赞同！我也遇到过类似的情况。','收藏了，以后慢慢看。','楼主说得太对了！','看到标题就点进来了，没让我失望。',
  '这篇质量好高啊，顶上去！','谢谢分享，学到了。','有同感，我也是这么想的。','能不能再写一篇类似的？','第一次评论，被这篇文章打动了。',
  '有点不同的看法，但尊重你的观点。','好文！已推荐给朋友。','看得出来是用心写的。','逻辑清晰，论点有力。','评论区好热闹，我也来留个言。',
  '这个话题太有共鸣了。','每天刷论坛就为了看这种优质内容。','不知道为什么看哭了。','写得真细腻，喜欢。',
  '最近也刚经历了类似的事情，看到这篇觉得很温暖。','内容翔实，分析到位。','这种有深度的帖子越多越好。',
  '第一次在这个论坛留言，献给楼主了。','熬夜看完的，不后悔。','希望论坛多一些这样的帖子。'
];

var forumTopics = [
  {title:'为什么越长大越难交到真心的朋友？',tag:'情感',content:'小时候觉得交朋友很简单，一起玩就是朋友。长大后发现人与人之间隔着太多东西了……'},
  {title:'推荐几本最近读的好书',tag:'书评',content:'最近读了三本非常不错的书，分享给大家。《百年孤独》重新读了一遍，感受完全不一样……'},
  {title:'一个人去旅行是一种怎样的体验？',tag:'生活',content:'上个月鼓起勇气一个人去了大理。出发前各种担心，到了之后才发现……'},
  {title:'你们觉得什么是真正的"成熟"？',tag:'思考',content:'不是年龄大了就成熟，也不是变得圆滑就叫成熟。我觉得真正的成熟是……'},
  {title:'深夜emo时间：你最遗憾的一件事是什么？',tag:'情感',content:'今天整理旧物，翻到了很多回忆。突然想起很多年前的一个选择……'},
  {title:'分享一组ins风手机壁纸',tag:'分享',content:'整理了最近收集的一些超好看的壁纸，风格偏韩系简约……'},
  {title:'异地恋真的能长久吗？',tag:'情感',content:'和男朋友异地两年了，说实话真的很难。但每次见面又觉得一切都值得……'},
  {title:'30岁之前一定要做的事',tag:'清单',content:'列了一份清单，希望在30岁之前完成。有些事不趁年轻做，以后可能就没机会了……'},
  {title:'咖啡馆打工日记',tag:'生活',content:'在咖啡馆打工一个月了，见到了各种各样的人。有人来约会，有人来工作……'},
  {title:'如何克服社交恐惧？',tag:'心理',content:'作为一个社恐人，每次参加聚会都痛苦到不行。最近试了一些方法……'},
  {title:'养猫一年的心得体会',tag:'生活',content:'一年前从救助站领养了一只橘猫，从此生活彻底被改变了。每天都有新惊喜……'},
  {title:'大家有没有后悔选择的专业/职业？',tag:'职场',content:'最近在思考转行的事情，当初学的专业和现在的工作完全不相关……'},
  {title:'安利一个私藏的宝藏歌单',tag:'音乐',content:'整理了这些年收藏的一些小众歌曲，每一首都循环过无数遍……'},
  {title:'和父母沟通好难，该怎么办？',tag:'家庭',content:'每次回家都想好好和父母交流，但总是聊着聊着就吵起来了……'},
  {title:'记录一下减肥30斤的心路历程',tag:'健康',content:'从去年开始下定决心减肥，到现在终于瘦了30斤。过程很痛苦但值得……'},
  {title:'聊聊你遇到过的最好的老师',tag:'教育',content:'高中语文老师对我影响特别大，她让我爱上了阅读和写作……'},
  {title:'共享单车、共享充电宝…共享经济还能走多远',tag:'商业',content:'这几年共享经济起起落落，有的成功了，大多数……'}
];

function initForum(){
  forumEnsureDaily();
  forumState.filter = 'reco';
  forumState.detailIdx = -1;
  forumShowFeed();
}

/* 本地兜底帖（无 API Key 或加载失败时用），日期标记为空以便 AI 到位后覆盖 */
function forumLocalSeed(){
  var posts = [];
  // Generate 15+ posts from netizens
  for(var i=0; i<15; i++){
    var topic = forumTopics[i % forumTopics.length];
    var user = fakeUsers[i % fakeUsers.length];
    var post = {
      id:'fp-'+i,
      author:user.name,
      authorType:'netizen',
      title:topic.title,
      content:topic.content,
      tag:topic.tag,
      likes:Math.floor(Math.random()*800)+50,
      comments:[],
      ts:Date.now() - Math.floor(Math.random()*86400000*3)
    };
    // Generate 20-30 comments
    var commentCount = 20 + Math.floor(Math.random()*11);
    // 1-3 comments from WeChat contacts
    if(Math.random()<0.7) post.comments.push({who:'tester1',text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:post.ts+3600000});
    if(Math.random()<0.5) post.comments.push({who:'me',text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:post.ts+7200000});
    // Rest from netizens
    for(var j=post.comments.length; j<commentCount; j++){
      var u = fakeUsers[Math.floor(Math.random()*fakeUsers.length)];
      post.comments.push({who:'netizen',name:u.name,text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:post.ts+Math.random()*86400000});
    }
    posts.push(post);
  }
  // 2-3 posts from WeChat contacts
  var contactPosts = [
    {who:'tester1',title:'今天处理了一整天的危机公关',content:'累是真的累，但只要想到她还在等我，就觉得一切都值得了。工作再忙也不能忘了重要的人。',tag:'日常'},
    {who:'me',title:'嘴硬的人也会心软',content:'嘴上说着不在乎，其实每次看到她的时候都会紧张。不是不想表现出来，只是不习惯。最近在学着改变。',tag:'心情'},
    {who:'tester1',title:'夜晚的碎碎念',content:'其实每个人都有脆弱的一面。我也有。只是不想让她看到。想让自己在她面前一直是强大的样子。',tag:'情感'}
  ];
  contactPosts.forEach(function(cp,i){
    var c = contacts[cp.who];
    posts.push({
      id:'fp-contact-'+i,
      author:c?c.name:cp.who,
      authorType:'contact',
      title:cp.title,
      content:cp.content,
      tag:cp.tag,
      likes:Math.floor(Math.random()*500)+100,
      comments:genComments(22+Math.floor(Math.random()*8)),
      ts:Date.now()-Math.floor(Math.random()*86400000*2)
    });
  });
  forumState.posts = posts.sort(function(){return Math.random()-0.5;});
  forumState.day = '';
}

function genComments(n){
  var cs=[];
  for(var i=0;i<n;i++){
    var u=fakeUsers[i%fakeUsers.length];
    cs.push({who:'netizen',name:u.name,text:netizenComments[Math.floor(Math.random()*netizenComments.length)],ts:Date.now()});
  }
  return cs;
}

function forumTab(t){
  forumState.filter = t;
  document.getElementById('ft-reco').classList.toggle('active',t==='reco');
  document.getElementById('ft-follow').classList.toggle('active',t==='follow');
  forumShowFeed();
}

function forumShowFeed(){
  forumState.detailIdx = -1;
  var feedEl = document.getElementById('forum-feed');
  if(!feedEl) return;
  feedEl.style.display = 'block';
  document.getElementById('forum-detail').style.display = 'none';
  document.getElementById('forum-compose').style.display = 'none';
  var posts = forumState.posts;
  if(forumState.filter==='follow'){
    posts = posts.filter(function(p){ return p.authorType==='user'||p.authorType==='contact'; });
  }
  var html = forumState.loading ? '<div class="forum-loading" id="forum-loading-tip">正在从全网搬运今日新帖…</div>' : '';
  posts.forEach(function(p){
    var i = forumState.posts.indexOf(p);
    html += '<div class="forum-card" onclick="forumOpen('+i+')">';
    html += '<div class="f-header"><div class="f-av" style="background:'+randomColor(p.author)+';">'+forumInitial(p.author)+'</div><div><div class="f-name">'+esc(p.author)+'</div><div class="f-time">'+fmtAgo(p.ts)+'</div></div></div>';
    html += '<div class="f-title">'+esc(p.title)+'</div>';
    html += '<div class="f-excerpt">'+esc(p.content)+'</div>';
    html += '<span class="f-tag">'+esc(p.tag)+'</span>';
    html += '<div class="f-meta"><span>赞 '+p.likes+'</span><span>评论 '+p.comments.length+'</span></div>';
    html += '</div>';
  });
  feedEl.innerHTML = html;
}

function forumOpen(i){
  forumState.detailIdx = i;
  var p = forumState.posts[i];
  if(!p) return;
  document.getElementById('forum-feed').style.display = 'none';
  document.getElementById('forum-compose').style.display = 'none';
  var detail = document.getElementById('forum-detail');
  detail.style.display = 'block';
  var html = '<div class="fd-title">'+esc(p.title)+'</div>';
  html += '<div class="fd-author"><div class="f-av" style="background:'+randomColor(p.author)+';">'+forumInitial(p.author)+'</div><div><div class="f-name">'+esc(p.author)+'</div><div class="f-time">'+fmtAgo(p.ts)+' · 赞 '+p.likes+'</div></div>';
  if(p.authorType==='user') html += '<div class="forum-actions"><span class="del" onclick="forumDelete('+i+')">删除</span></div>';
  html += '</div>';
  html += '<div class="fd-content">'+esc(p.content)+'</div>';
  html += '<div class="fd-divider">评论 '+p.comments.length+'</div>';
  p.comments.forEach(function(c){
    var name = c.name||(c.who==='me'?userName:(contacts[c.who]?contacts[c.who].name:c.who));
    html += '<div class="forum-comment"><div class="fc-header"><div class="fc-av" style="background:'+randomColor(name)+';">'+forumInitial(name)+'</div><span class="fc-name">'+esc(name)+'</span><span class="fc-time">'+fmtAgo(c.ts)+'</span></div><div class="fc-text">'+esc(c.text)+'</div></div>';
  });
  html += '<div style="margin-top:16px;display:flex;gap:8px;"><input id="fc-reply" placeholder="写下你的评论…" style="flex:1;border:1px solid #e8e0dc;border-radius:20px;padding:10px 14px;font-size:13px;outline:none;"><div class="big-btn" style="margin:0;padding:10px 20px;font-size:12px;" onclick="forumReply('+i+')">发送</div></div>';
  detail.innerHTML = html;
  detail.scrollTop = 0;
}

function forumReply(i){
  var inp = document.getElementById('fc-reply');
  var text = inp.value.trim();
  if(!text) return;
  var p = forumState.posts[i];
  p.comments.push({who:'me',name:userName,text:text,ts:Date.now()});
  inp.value = '';
  forumOpen(i);
  forumSaveDaily();
  /* 楼层回复全部走 AI 模型 */
  var asOwner = Math.random()<0.55;
  var replier = asOwner ? p.author : fakeUsers[Math.floor(Math.random()*fakeUsers.length)].name;
  var sys = '你在中文论坛里扮演网友「'+replier+'」回帖。要求：口语化、简短、有网感，禁止使用emoji和颜文字，禁止AI腔和客服腔。只输出回帖内容本身，不要带名字前缀。';
  var ctx = '帖子标题：'+p.title+'\n帖子正文：'+p.content+'\n刚才「'+userName+'」在评论区回复："'+text+'"\n你'+(asOwner?'是发帖人':'是路过的网友')+'，回应这条评论，一两句话。';
  forumCallLLM(ctx, sys, function(reply){
    if(!reply) return;
    reply = stripEmoji(reply).trim();
    if(!reply) return;
    p.comments.push({who:'netizen', name:replier, text:reply, ts:Date.now()});
    forumSaveDaily();
    if(forumState.detailIdx===i) forumOpen(i);
  });
}

function forumDelete(i){
  if(!confirm('确定删除这条帖子吗？')) return;
  forumState.posts.splice(i,1);
  forumSaveDaily();
  forumShowFeed();
}

function forumShowCompose(){
  document.getElementById('forum-feed').style.display = 'none';
  document.getElementById('forum-detail').style.display = 'none';
  document.getElementById('forum-compose').style.display = 'block';
  document.getElementById('fc-title').value = '';
  document.getElementById('fc-content').value = '';
  document.getElementById('fc-tag').value = '';
}

function forumPost(){
  var title = document.getElementById('fc-title').value.trim();
  var content = document.getElementById('fc-content').value.trim();
  var tag = document.getElementById('fc-tag').value.trim() || '日常';
  if(!title){ alert('请填写标题'); return; }
  if(!content){ alert('请填写内容'); return; }
  var post = {
    id:'fp-user-'+Date.now(),
    author:userName,
    authorType:'user',
    title:title,
    content:content,
    tag:tag,
    likes:0,
    comments:[],
    ts:Date.now()
  };
  forumState.posts.unshift(post);
  forumShowFeed();
  forumSaveDaily();
  /* 帖子下的网友评论全部由 AI 生成 */
  forumCallLLM(
    '「'+userName+'」刚在论坛发帖。\n标题：'+title+'\n正文：'+content+'\n请生成5条真实网友风格的评论，输出严格JSON数组：[{"name":"网名","text":"评论"}]。有捧场的、有追问细节的、有轻微抬杠的、有只回几个字的。禁止emoji和颜文字，禁止AI腔。',
    '你负责给论坛帖子生成真实网友评论，只输出JSON数组，不输出其他文字。',
    function(reply){
      if(!reply) return;
      var s = String(reply).replace(/```json|```/g,'').trim();
      var a = s.indexOf('['), b = s.lastIndexOf(']');
      if(a<0||b<=a) return;
      var arr; try{ arr = JSON.parse(s.slice(a,b+1)); }catch(e){ return; }
      if(!Array.isArray(arr)) return;
      arr.forEach(function(c){
        var t = stripEmoji(String(c&&c.text||'')).trim();
        if(t) post.comments.push({who:'netizen', name:stripEmoji(String(c&&c.name||'路人')).trim()||'路人', text:t, ts:Date.now()+Math.floor(Math.random()*600000)});
      });
      forumSaveDaily();
      if(forumState.detailIdx>=0 && forumState.posts[forumState.detailIdx]===post) forumOpen(forumState.detailIdx);
      else if(forumState.detailIdx<0) forumShowFeed();
    });
  /* 伴侣也会来评论（走人设 AI） */
  try{
    var pid = window.coupleState && window.coupleState.partner;
    if(pid && contacts[pid] && typeof callRealAI==='function' && typeof getPersonaPrompt==='function'){
      callRealAI([{role:'user',content:'（你在拾光论坛刷到我刚发的帖子《'+title+'》，内容是："'+content+'"。请以你的身份在评论区留一条评论，一两句话，符合你的性格，不要用emoji。只输出评论内容本身）'}], getPersonaPrompt(pid), pid, function(r){
        r = stripEmoji(r||'').replace(/\[[^\]]*\]\s*$/,'').trim();
        if(!r) return;
        post.comments.unshift({who:pid, name:contacts[pid].name, text:r, ts:Date.now()+1000});
        forumSaveDaily();
        if(forumState.detailIdx>=0 && forumState.posts[forumState.detailIdx]===post) forumOpen(forumState.detailIdx);
      });
    }
  }catch(e){}
}

function randomColor(s){ var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return 'hsl('+h+',50%,55%)';}

