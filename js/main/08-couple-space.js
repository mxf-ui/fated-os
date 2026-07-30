/* ============ COUPLE SPACE (情侣空间) ============ */
var coupleState = { partner:'', lockedApps:{}, notes:[], diary:[], shop:[], foodOrders:[], phoneTab:'wechat', lastCheckin:0, jealousHistory:[], partnerHistory:[] };
var screenTimeData = { totalSec:0, todaySec:0, lastDate:'', sessionStart:0, active:true };

/* 屏幕使用时长追踪 */
function screenTimeTrack(){
  var now = Date.now();
  var today = new Date().toDateString();
  if(screenTimeData.lastDate !== today){
    screenTimeData.lastDate = today;
    screenTimeData.todaySec = 0;
  }
  if(screenTimeData.sessionStart > 0){
    var delta = Math.floor((now - screenTimeData.sessionStart) / 1000);
    if(delta > 0 && delta < 3600){ // 单次最多计1小时，防异常
      screenTimeData.todaySec += delta;
      screenTimeData.totalSec += delta;
    }
  }
  screenTimeData.sessionStart = now;
}
function screenTimeFormat(sec){
  if(sec < 60) return sec + ' 秒';
  if(sec < 3600) return Math.floor(sec/60) + ' 分 ' + (sec%60) + ' 秒';
  return Math.floor(sec/3600) + ' 小时 ' + Math.floor((sec%3600)/60) + ' 分';
}
setInterval(screenTimeTrack, 30000); // 每30秒记录一次
document.addEventListener('visibilitychange', function(){
  if(document.hidden){ screenTimeTrack(); screenTimeData.sessionStart = 0; }
  else { screenTimeData.sessionStart = Date.now(); }
});

function initCouple(){
  if(!coupleState.partner){
    var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k!=='me'; });
    if(ids.length>0) coupleState.partner = ids[0];
  }
  if(!coupleState.partnerHistory) coupleState.partnerHistory = [];
  if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner)===-1){
    coupleState.partnerHistory.push(coupleState.partner);
  }
  updateCoupleHeader();
  coupleGenData();
  if(window.coupleGenData) window.coupleGenData();
  coupleShowMain();
  if(screenTimeData.sessionStart === 0) screenTimeData.sessionStart = Date.now();
}

/* 切换绑定联系人 */
function coupleSwitchPartner(){
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k!=='me'; });
  if(ids.length === 0){ showToast('没有可绑定的联系人', 1500); return; }
  var html = '<div style="font-size:12px;color:#888;margin-bottom:8px;">选择情侣空间绑定的联系人：</div>';
  ids.forEach(function(k){
    var c = contacts[k];
    var isCurrent = (k === coupleState.partner);
    html += '<div class="ios-section" style="margin:0 0 6px;cursor:pointer;' + (isCurrent ? 'border:2px solid #e94560;' : '') + '" onclick="coupleSetPartner(\'' + k + '\')">';
    html += '<div class="ios-row"><div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;flex:none;">' + contactAvatar(c) + '</div>';
    html += '<div style="flex:1;"><div style="font-size:13px;font-weight:700;">' + esc(c.name) + (isCurrent ? ' ✅' : '') + '</div>';
    html += '<div style="font-size:11px;color:#888;">' + esc(c.tone || c.persona || '') + '</div></div></div></div>';
  });
  coupleShowSub('切换联系人', html);
}

function coupleSetPartner(id){
  if(!contacts[id]) return;
  if(id === coupleState.partner){ coupleShowMain(); return; }
  // 记录历史绑定
  if(!coupleState.partnerHistory) coupleState.partnerHistory = [];
  if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner)===-1){
    coupleState.partnerHistory.push(coupleState.partner);
  }
  coupleState.partner = id;
  if(coupleState.partnerHistory.indexOf(id)===-1){
    coupleState.partnerHistory.push(id);
  }
  saveState();
  updateCoupleHeader();
  coupleGenData();
  coupleShowMain();
  showToast('已切换到 ' + contacts[id].name, 1500);
}

/* 生成日记和备忘录（基于聊天记录，3条以上长日记） */
function coupleGenData(){
  var c = contacts[coupleState.partner];
  var seed = c ? (c.seed || []) : [];
  var texts = seed.filter(function(m){return m.kind==='text';}).map(function(m){return m.text;});
  var myTexts = seed.filter(function(m){return m.kind==='text' && m.mine;}).map(function(m){return m.text;});
  var partnerTexts = seed.filter(function(m){return m.kind==='text' && !m.mine;}).map(function(m){return m.text;});

  coupleState.notes = [];
  coupleState.diary = [];

  if(texts.length > 0){
    // 生成3条以上长日记
    var allTexts = texts.join(' ');
    var recent5 = texts.slice(-5);
    var recent3 = texts.slice(-3);

    coupleState.diary.push({
      date: '今天',
      text: '今天和' + (c ? c.name : 'TA') + '聊了很多。' +
            '我们谈论了"' + (recent5[0]||'').substring(0,40) + '"等内容。' +
            '每次和TA聊天都觉得时间过得很快，虽然有时候会拌嘴，但心里是开心的。' +
            'TA说的"' + (partnerTexts.length>0 ? partnerTexts[partnerTexts.length-1].substring(0,30) : '那些话') + '"让我印象很深。'
    });

    coupleState.diary.push({
      date: '今天',
      text: '翻了翻聊天记录，从"' + (texts[0]||'').substring(0,30) + '"开始，到现在已经聊了' + texts.length + '条消息。' +
            '我说的"' + (myTexts.length>0 ? myTexts[myTexts.length-1].substring(0,30) : '') + '"，TA回复了我。' +
            '这种有来有往的对话让我觉得很踏实。' +
            '希望以后每天都能这样，有说不完的话。'
    });

    coupleState.diary.push({
      date: '今天',
      text: '回想今天的对话，"' + (recent3[recent3.length-1]||'').substring(0,40) + '"这句话一直在脑海里回响。' +
            (c ? c.name : 'TA') + '总是能在我最需要的时候说出最合适的话。' +
            '有时候我在想，是不是所有感情都是这样，在平凡的日子里慢慢积累，最后变成谁也离不开谁的默契。' +
            '今天也是想TA的一天。'
    });

    // 如果聊天记录很多，生成第4条
    if(texts.length > 8){
      coupleState.diary.push({
        date: '今天',
        text: '深夜了，还在想今天和' + (c ? c.name : 'TA') + '的对话。' +
              '"' + (recent5[2]||'').substring(0,35) + '"——这句话让我笑了好久。' +
              '有时候幸福就是这样简单，一个人愿意听你说话，愿意陪你闹，愿意在深夜还回复你的消息。' +
              '我想我会一直记得今天的这些对话。'
      });
    }

    // 备忘录
    coupleState.notes.push({date:'今天', text:'记得TA今天说的："' + (partnerTexts.length>0 ? partnerTexts[partnerTexts.length-1].substring(0,50) : '重要的事') + '"'});
    coupleState.notes.push({date:'今天', text:'聊天记录关键词：' + allTexts.substring(0,60)});
    coupleState.notes.push({date:'今天', text:'今日消息数：' + texts.length + '条，我的消息' + myTexts.length + '条，TA的消息' + partnerTexts.length + '条'});
  } else {
    coupleState.diary.push({date:'今天', text:'今天还没有和' + (c ? c.name : 'TA') + '聊天，等TA来找我吧。'});
    coupleState.diary.push({date:'昨天', text:'回忆是一种很奇妙的东西，即使没有新消息，也会想起以前的种种。'});
    coupleState.diary.push({date:'前天', text:'有时候沉默也是一种交流，我们在各自的世界里忙碌，但心里有彼此就好。'});
    coupleState.notes.push({date:'今天', text:'还没有新的聊天记录'});
  }

  if(!coupleState.shop || !coupleState.shop.length){
    coupleState.shop = [
      {name:'草莓蛋糕',price:'¥168',img:''},
      {name:'兔子玩偶',price:'¥89',img:''},
      {name:'情侣手链',price:'¥259',img:''}
    ];
  }
}

function updateCoupleHeader(){
  var c = contacts[coupleState.partner];
  var namesEl = document.getElementById('couple-names');
  if(namesEl) namesEl.textContent = userName + ' & ' + (c?c.name:'Partner');
  // Update avatars
  var meAv = document.getElementById('couple-av-me');
  if(meAv){
    if(userAvatar) meAv.innerHTML = '<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    else meAv.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>';
  }
  var pAv = document.getElementById('couple-av-partner');
  if(pAv){
    pAv.innerHTML = c ? contactAvatar(c) : '';
    pAv.style.background = c ? 'transparent' : '#eee';
  }
  var days = Math.floor((Date.now()-new Date('2026-04-12').getTime())/86400000);
  var daysEl = document.getElementById('couple-days');
  if(daysEl) daysEl.textContent = 'Together '+days+' days';
}

function coupleShowMain(){
  var main=document.getElementById('couple-main');
  var sub=document.getElementById('couple-subview');
  var phone=document.getElementById('couple-phone');
  if(main){ main.style.display='block'; main.classList.add('couple-shell-green'); }
  if(sub){ sub.style.display='none'; sub.classList.add('couple-shell-green'); }
  if(phone){ phone.style.display='none'; phone.classList.add('couple-shell-green'); }
  if(window.coupleRenderMainShell) window.coupleRenderMainShell();
}
function coupleBack(){
  var main=document.getElementById('couple-main');
  var sub=document.getElementById('couple-subview');
  var phone=document.getElementById('couple-phone');
  if(main){ main.style.display='block'; main.classList.add('couple-shell-green'); }
  if(sub){ sub.style.display='none'; sub.classList.add('couple-shell-green'); }
  if(phone){ phone.style.display='none'; phone.classList.add('couple-shell-green'); }
  if(window.coupleRenderMainShell) window.coupleRenderMainShell();
}

// === CHECK PARTNER'S PHONE ===
function coupleCheckPhone(){
  document.getElementById('couple-main').style.display='none';
  document.getElementById('couple-subview').style.display='none';
  document.getElementById('couple-phone').style.display='block';
  var c = contacts[coupleState.partner];
  document.getElementById('couple-phone-title').textContent = (c?c.name:'Partner')+'\'s Phone';
  coupleState.phoneTab = 'wechat';
  couplePhoneTab('wechat');
}

function couplePhoneTab(tab){
  coupleState.phoneTab = tab;
  document.querySelectorAll('#couple-phone [id^=cp-tab]').forEach(function(el){el.style.background='#eee';el.style.color='#1a1a1a';});
  var activeTab = document.getElementById('cp-tab-'+tab);
  if(activeTab){ activeTab.style.background='#1a1a1a'; activeTab.style.color='#fff'; }
  var content = document.getElementById('couple-phone-content');
  var c = contacts[coupleState.partner];
  if(!c){ content.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">No partner selected</div>'; return; }
  if(tab==='wechat'){
    // Show partner's actual chat list and recent messages
    var ids = Object.keys(contacts).filter(function(k){return k!=='me' && k!==coupleState.partner && !contacts[k].isGroup;});
    var html = '<div style="font-size:12px;color:#888;padding:4px 0 8px;">Recent chats on '+c.name+'\'s WeChat</div>';
    ids.forEach(function(k){
      var ct = contacts[k];
      var lastMsg = ct.seed.length>0 ? ct.seed[ct.seed.length-1] : null;
      var preview = lastMsg ? (lastMsg.text||'[message]').substring(0,30) : 'No messages';
      html += '<div class="ios-section" style="margin:0 0 6px;"><div class="ios-row"><div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;flex:none;">'+avatarHTML(ct.tone)+'</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;">'+ct.name+'</div><div style="font-size:11px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+preview+'</div></div><div style="font-size:10px;color:#aaa;">'+nowTime()+'</div></div></div>';
    });
    // Also show partner's own messages to user
    var partnerMsgs = c.seed.filter(function(m){return m.kind==='text';}).slice(-3);
    if(partnerMsgs.length>0){
      html += '<div style="font-size:12px;color:#888;padding:12px 0 8px;">Recent conversations with you</div>';
      partnerMsgs.forEach(function(m){
        html += '<div style="padding:8px 12px;background:#fff;border-radius:10px;margin-bottom:4px;font-size:12px;">'+ (m.mine?'You':c.name)+': '+m.text.substring(0,80)+'</div>';
      });
    }
    content.innerHTML = html;
  } else if(tab==='moments'){
    var myPosts = forumState.posts.filter(function(p){return p.authorType==='contact';});
    var html = '<div style="font-size:12px;color:#888;padding:4px 0 8px;">'+c.name+'\'s Moments</div>';
    if(myPosts.length===0) html += '<div style="text-align:center;padding:20px;color:#888;">No posts yet</div>';
    myPosts.forEach(function(p){
      html += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:8px;"><div style="font-size:13px;font-weight:700;">'+esc(p.title)+'</div><div style="font-size:12px;color:#555;margin-top:4px;">'+esc(p.content).substring(0,100)+'</div><div style="font-size:10px;color:#aaa;margin-top:6px;">'+fmtAgo(p.ts)+' · '+p.likes+' likes</div></div>';
    });
    content.innerHTML = html;
  } else if(tab==='forum'){
    var myPosts = forumState.posts.filter(function(p){return p.authorType==='contact';});
    var html = '<div style="font-size:12px;color:#888;padding:4px 0 8px;">'+c.name+'\'s Forum Activity</div>';
    if(myPosts.length===0) html += '<div style="text-align:center;padding:20px;color:#888;">No forum activity</div>';
    myPosts.forEach(function(p){
      html += '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:8px;"><span style="font-size:10px;background:#e0e0e0;padding:2px 6px;border-radius:4px;">'+esc(p.tag)+'</span><div style="font-size:13px;font-weight:700;margin-top:4px;">'+esc(p.title)+'</div><div style="font-size:12px;color:#555;margin-top:4px;">'+esc(p.content).substring(0,80)+'</div><div style="font-size:10px;color:#aaa;margin-top:6px;">'+p.comments.length+' comments</div></div>';
    });
    content.innerHTML = html;
  }
}

// === SHOP WITH PHOTO UPLOAD ===
function coupleShop(){
  var c = contacts[coupleState.partner];
  var html = '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">'+ (c?c.name:'Partner')+'\'s Wishlist</div>';
  coupleState.shop.forEach(function(item,i){
    var imgHtml = item.img ? '<img src="'+item.img+'" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex:none;">' : '<div style="width:48px;height:48px;border-radius:10px;background:#eee;flex:none;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;">Photo</div>';
    html += '<div class="couple-shop-item">'+imgHtml+'<div class="info"><div class="name">'+esc(item.name)+'</div><div class="price">'+esc(item.price)+'</div></div><div class="buy-btn" onclick="coupleBuy('+i+')">Buy</div></div>';
  });
  html += '<div style="margin-top:12px;"><div style="font-size:12px;font-weight:700;margin-bottom:4px;">Add Item</div><input id="cp-shop-name" placeholder="Item name" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><input id="cp-shop-price" placeholder="Price" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><label style="display:block;padding:10px;border:1px dashed #ccc;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#888;">+ Upload Photo<input type="file" accept="image/*" id="cp-shop-img" style="display:none;" onchange="coupleShopImg(event)"></label><div id="cp-shop-preview" style="margin-bottom:8px;"></div><div class="big-btn" onclick="coupleAddShop()">Add to Wishlist</div></div>';
  coupleShowSub('Wishlist',html);
}

function coupleShopImg(e){
  var f=e.target.files[0]; if(!f) return;
  var r=new FileReader(); r.onload=function(){ coupleState._shopImg=r.result; document.getElementById('cp-shop-preview').innerHTML='<img src="'+r.result+'" style="width:80px;height:80px;border-radius:10px;object-fit:cover;">'; }; r.readAsDataURL(f);
}

function coupleAddShop(){
  var name=document.getElementById('cp-shop-name').value.trim();
  var price=document.getElementById('cp-shop-price').value.trim()||'$99';
  if(!name) return;
  coupleState.shop.push({name:name,price:price,img:coupleState._shopImg||''});
  coupleState._shopImg=null;
  coupleShop();
}

// === FOOD ORDER WITH WECHAT SYNC ===
function coupleFood(){
  var c = contacts[coupleState.partner];
  var html = '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">Order Food for '+ (c?c.name:'Partner')+'</div>';
  html += '<div style="font-size:11px;color:#888;margin-bottom:8px;">Custom order with photo upload. Will notify partner in WeChat.</div>';
  html += '<input id="cp-food-name" placeholder="Food name" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
  html += '<input id="cp-food-price" placeholder="Price (e.g. $25)" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
  html += '<label style="display:block;padding:10px;border:1px dashed #ccc;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#888;">+ Upload Food Photo<input type="file" accept="image/*" id="cp-food-img" style="display:none;" onchange="coupleFoodImg(event)"></label><div id="cp-food-preview" style="margin-bottom:8px;"></div>';
  html += '<textarea id="cp-food-note" placeholder="Note for partner (will appear in WeChat)" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;height:60px;resize:none;"></textarea>';
  html += '<div class="big-btn" onclick="coupleOrderFood()">Place Order & Notify Partner</div>';
  coupleShowSub('Order Food',html);
}

function coupleFoodImg(e){
  var f=e.target.files[0]; if(!f) return;
  var r=new FileReader(); r.onload=function(){ coupleState._foodImg=r.result; document.getElementById('cp-food-preview').innerHTML='<img src="'+r.result+'" style="width:80px;height:80px;border-radius:10px;object-fit:cover;">'; }; r.readAsDataURL(f);
}

function coupleOrderFood(){
  var name=document.getElementById('cp-food-name').value.trim();
  var price=document.getElementById('cp-food-price').value.trim()||'$25';
  var note=document.getElementById('cp-food-note').value.trim();
  if(!name){ showToast('请输入食物名称', 1500); return; }
  var c=contacts[coupleState.partner];
  // Add to wallet
  addWalletTx('Food order: '+name+' for '+(c?c.name:'partner'), -parseInt(price.replace('$',''))||-25);
  // Notify in WeChat
  if(c){
    c.seed.push({kind:'photo',text:coupleState._foodImg||'',from:'me',ts:nowStamp()});
    c.seed.push({mine:true,kind:'text',text:'[Food Order] Ordered '+name+' ('+price+') for you!'+(note?' Note: '+note:''),from:'me',ts:nowStamp()});
    saveChatThread(coupleState.partner);
    if(currentContact===coupleState.partner) renderThread();
  }
  coupleState._foodImg=null;
  showToast('Order placed! '+name+' - '+price, 2000);
  coupleFood();
}

// === OTHER FUNCTIONS UPDATED ===
function coupleCheckin(){
  var c = contacts[coupleState.partner];
  if(!c){ coupleShowSub('查岗', '<div style="text-align:center;padding:40px;color:#888;">未选择联系人</div>'); return; }

  /* 查岗内容每3小时更新 */
  var now = Date.now();
  var lastCheckin = coupleState.lastCheckin || 0;
  var needRefresh = (now - lastCheckin) > 3*3600000; // 3小时

  /* 吃醋检测：如果绑定过多个人，查岗时被发现 */
  var history = coupleState.partnerHistory || [];
  var otherPartners = history.filter(function(k){ return k !== coupleState.partner && contacts[k]; });

  var html = '<div style="padding:16px;">';

  if(otherPartners.length > 0 && needRefresh){
    /* 发现情侣空间绑定了其他人 → 吃醋 */
    var cheater = contacts[otherPartners[otherPartners.length-1]];
    html += '<div style="background:#fff0f0;border-radius:14px;padding:16px;text-align:center;">';
    html += '<div style="font-size:36px;margin-bottom:8px;">😡</div>';
    html += '<div style="font-size:16px;font-weight:700;color:#c00;">' + esc(c.name) + ' 发现了！</div>';
    html += '<div style="font-size:13px;color:#555;margin-top:8px;line-height:1.6;">';
    html += '查岗时，' + esc(c.name) + ' 在你的情侣空间里看到了 <b>' + esc(cheater.name) + '</b> 的绑定记录。<br>';
    html += 'TA 非常生气，已经：<br>';
    html += '🗑️ 删除了自己在你 WeChat 里的联系方式<br>';
    html += '📱 发了一条朋友圈内涵你';
    html += '</div></div>';

    /* 执行吃醋行为 */
    // 1. 删除联系人
    if(!coupleState.jealousHistory) coupleState.jealousHistory = [];
    if(coupleState.jealousHistory.indexOf(coupleState.partner) === -1){
      coupleState.jealousHistory.push(coupleState.partner);
      // 标记为blocked而不是完全删除（避免数据丢失）
      c.blocked = true;
      c._jealousDelete = true;

      // 2. 发朋友圈内涵
      var subTexts = [
        '有些人嘴上说只爱你一个，手机里却藏着另一个人的情侣空间。',
        '原来我不是唯一，连查岗都能查出惊喜来。',
        '笑死，情侣空间还能绑好几个人的，你是海王吗？',
        '删除了，拜拜了您嘞。下次查岗记得先清理痕迹。',
        '以为我是唯一，结果只是之一。已删，勿念。'
      ];
      var subText = subTexts[Math.floor(Math.random()*subTexts.length)];
      moments.push({
        id: Date.now() + Math.floor(Math.random()*1000),
        authorId: coupleState.partner,
        text: subText,
        vis: '公开',
        hidden: [],
        ts: Date.now(),
        likes: Math.floor(Math.random()*30)+5,
        liked: false,
        comments: []
      });
      saveState();
      renderChatList();
    }

    html += '<div class="big-btn" style="margin-top:12px;" onclick="coupleShowMain()">返回</div>';
    html += '</div>';
    coupleState.lastCheckin = now;
    saveState();
    coupleShowSub('查岗结果', html);
    return;
  }

  /* 正常查岗 */
  coupleState.lastCheckin = now;
  saveState();

  html += '<div style="text-align:center;padding:12px 0;">';
  html += '<div style="font-size:40px;margin-bottom:8px;">🔍</div>';
  html += '<div style="font-size:16px;font-weight:700;">查岗报告 · ' + esc(c.name) + '</div>';
  html += '</div>';

  /* 查岗内容（每3小时变化） */
  var statuses = [
    '正在想你的', '在回家路上', '在听音乐', '在看书', '在健身房', '在做晚饭',
    '在和朋友逛街', '在加班', '在洗澡', '在刷短视频', '在打游戏', '在和朋友聊天'
  ];
  var locations = ['公司', '家里', '咖啡厅', '商场', '健身房', '公园', '地铁上', '餐厅'];
  var activities = [
    '手机电量 73%', '步数 8,421 步', '今日屏幕使用 4小时12分',
    '最后活跃: 刚刚', '未读消息 12 条', '相册新增 3 张照片',
    '正在和 3 个人聊天', '今天搜索了"怎么哄对象"', '浏览器记录: 已清除'
  ];

  var seedRand = function(arr){ return arr[Math.floor((now / 10800000) % arr.length)]; };

  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:13px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">📍 当前状态</div>';
  html += '<div style="font-size:14px;color:#333;">' + seedRand(statuses) + '</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px;">位置：' + seedRand(locations) + ' · 距你 2.3km</div>';
  html += '</div>';

  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:13px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">📱 手机信息</div>';
  html += '<div style="font-size:12px;color:#555;line-height:1.8;">';
  html += '• ' + seedRand(activities) + '<br>';
  html += '• ' + seedRand(activities) + '<br>';
  html += '• ' + seedRand(activities) + '<br>';
  html += '</div></div>';

  /* 查看TA的手机 */
  html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleCheckPhone()">查看TA的手机</div>';

  html += '<div style="margin-top:12px;"><input id="cp-checkin-msg" placeholder="发一条查岗消息给TA…" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;outline:none;"></div>';
  html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleSendCheckin()">发送查岗消息</div>';
  html += '</div>';

  coupleShowSub('查岗', html);
}

function coupleSendCheckin(){
  var inp=document.getElementById('cp-checkin-msg'); if(!inp||!inp.value.trim()) return;
  var c=contacts[coupleState.partner];
  if(c&&!c.blocked&&c.seed){
    c.seed.push({kind:'pat',text:'[查岗] '+userName+'：'+inp.value.trim(),ts:nowStamp()});
    var replies=['我在呢，刚想找你。','怎么了？是不是想我了？','我乖乖的，没有乱跑。','在在在，随时可以查！','嘿嘿，被查岗了，但我没问题～'];
    c.seed.push({mine:false,kind:'text',text:replies[Math.floor(Math.random()*replies.length)],from:coupleState.partner,ts:nowStamp()});
    saveChatThread(coupleState.partner);
    if(currentContact===coupleState.partner) renderThread();
  }
  inp.value='';
  showToast('查岗消息已发送，TA已回复', 1500);
}

function coupleShowSub(title,html){
  var main=document.getElementById('couple-main');
  var phone=document.getElementById('couple-phone');
  var sub=document.getElementById('couple-subview');
  if(main){ main.style.display='none'; main.classList.add('couple-shell-green'); }
  if(phone){ phone.style.display='none'; phone.classList.add('couple-shell-green'); }
  if(sub){ sub.style.display='block'; sub.classList.add('couple-shell-green'); }
  document.getElementById('couple-subtitle').textContent = title;
  document.getElementById('couple-subcontent').innerHTML = html;
}

/* 屏幕使用时长 */
function coupleScreenTime(){
  screenTimeTrack(); // 先记录当前时段
  var todayFmt = screenTimeFormat(screenTimeData.todaySec || 0);
  var totalFmt = screenTimeFormat(screenTimeData.totalSec || 0);
  var hours = Math.floor((screenTimeData.todaySec || 0) / 3600);
  var mins = Math.floor(((screenTimeData.todaySec || 0) % 3600) / 60);

  var html = '<div style="padding:16px;">';
  html += '<div style="text-align:center;padding:12px 0;">';
  html += '<div style="font-size:36px;margin-bottom:4px;">⏱️</div>';
  html += '<div style="font-size:28px;font-weight:800;color:#5ac8fa;">' + hours + '小时' + mins + '分钟</div>';
  html += '<div style="font-size:12px;color:#888;margin-top:4px;">今日屏幕使用时长</div>';
  html += '</div>';

  /* 柱状图模拟 */
  var bars = [];
  for(var i=0; i<12; i++){
    var h = Math.floor(Math.random()*60)+20;
    if(i === 11) h = Math.floor((screenTimeData.todaySec || 0) / 60);
    bars.push(h);
  }
  var maxBar = Math.max.apply(null, bars);
  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:12px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">近12小时使用情况</div>';
  html += '<div style="display:flex;align-items:flex-end;gap:4px;height:80px;">';
  bars.forEach(function(b, i){
    var pct = Math.round(b / maxBar * 100);
    var color = i === 11 ? '#5ac8fa' : '#bde6f5';
    html += '<div style="flex:1;height:' + pct + '%;background:' + color + ';border-radius:3px 3px 0 0;min-height:4px;"></div>';
  });
  html += '</div></div>';

  html += '<div style="background:#fff;border-radius:14px;padding:14px;margin:8px 0;">';
  html += '<div style="font-size:12px;font-weight:700;color:#5c3d4a;margin-bottom:8px;">统计</div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:6px;"><span>今日使用</span><span style="font-weight:700;">' + todayFmt + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:6px;"><span>累计使用</span><span style="font-weight:700;">' + totalFmt + '</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;margin-bottom:6px;"><span>最常使用</span><span style="font-weight:700;">fated-os</span></div>';
  html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#555;"><span>拿起次数</span><span style="font-weight:700;">' + Math.floor((screenTimeData.todaySec || 0) / 60) + ' 次</span></div>';
  html += '</div>';

  html += '<div style="background:#fff0f0;border-radius:14px;padding:14px;margin:8px 0;text-align:center;">';
  html += '<div style="font-size:12px;color:#c00;">⚠️ 久坐提醒：已连续使用较长时间，建议休息一下</div>';
  html += '</div>';

  html += '</div>';
  coupleShowSub('屏幕使用时长', html);
}


