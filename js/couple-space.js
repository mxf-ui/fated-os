
/* Couple Space — core: 持久化 / 管理联系人 / 日记 / 备忘录 / 实时位置 / 购物车 / 双向查岗(TA查你) */
(function(){
  if(!coupleState) return;
  if(!coupleState.byPartner) coupleState.byPartner = {};
  try{ var raw=localStorage.getItem('couple_state_v1'); if(raw){ var o=JSON.parse(raw);
    coupleState.partner = o.partner||coupleState.partner;
    coupleState.lockedApps = o.lockedApps||{};
    coupleState.byPartner = o.byPartner||{};
    coupleState.foodOrders = o.foodOrders||[];
    coupleState.icons = o.icons||{};
    coupleState.hisPasscode = o.hisPasscode||'';
    coupleState.hisPassAttempts = o.hisPassAttempts||0;
    coupleState.hisLocked = o.hisLocked||false;
    coupleState.partnerHistory = o.partnerHistory||[];
    coupleState.lastCheckin = o.lastCheckin||0;
    coupleState.jealousHistory = o.jealousHistory||[];
  } }catch(e){}

  window.coupleData = function(){
    if(!coupleState.byPartner) coupleState.byPartner = {};
    var pid = coupleState.partner || '_';
    if(!coupleState.byPartner[pid]) coupleState.byPartner[pid] = { notes:[], diary:[], shop:[], foodOrders:[], location:null, browseUser:[] };
    return coupleState.byPartner[pid];
  };
  window.saveCoupleState = function(){
    try{ localStorage.setItem('couple_state_v1', JSON.stringify({partner:coupleState.partner, lockedApps:coupleState.lockedApps, byPartner:coupleState.byPartner, foodOrders:coupleState.foodOrders, icons:coupleState.icons, hisPasscode:coupleState.hisPasscode, hisPassAttempts:coupleState.hisPassAttempts, hisLocked:coupleState.hisLocked, partnerHistory:coupleState.partnerHistory||[], lastCheckin:coupleState.lastCheckin||0, jealousHistory:coupleState.jealousHistory||[]})); }catch(e){}
  };

  /* 按对象分库，且绝不覆盖用户自己写的日记/备忘录 */
  window.coupleGenData = function(){
    var d = window.coupleData();
    var c = contacts[coupleState.partner];
    var seed = c ? (c.seed||[]) : [];
    var texts = seed.filter(function(m){return m.kind==='text';}).map(function(m){return m.text;});
    var myTexts = seed.filter(function(m){return m.kind==='text' && m.mine;}).map(function(m){return m.text;});
    var partnerTexts = seed.filter(function(m){return m.kind==='text' && !m.mine;}).map(function(m){return m.text;});
    if(!d.notes) d.notes = [];
    if(!d.diary) d.diary = [];

    /* 确保3条以上基于聊天记录的长日记 */
    if(d.diary.length < 3 && texts.length > 0){
      var name = c ? c.name : 'TA';
      var recent5 = texts.slice(-5);
      var recent3 = texts.slice(-3);
      var genDiaries = [
        {date: ymdKey(new Date()), text: '今天和' + name + '聊了很多。我们谈论了"' + (recent5[0]||'').substring(0,40) + '"等内容。每次和TA聊天都觉得时间过得很快，虽然有时候会拌嘴，但心里是开心的。TA说的"' + (partnerTexts.length>0 ? partnerTexts[partnerTexts.length-1].substring(0,30) : '那些话') + '"让我印象很深。'},
        {date: ymdKey(new Date()), text: '翻了翻聊天记录，从"' + (texts[0]||'').substring(0,30) + '"开始，到现在已经聊了' + texts.length + '条消息。我说的"' + (myTexts.length>0 ? myTexts[myTexts.length-1].substring(0,30) : '') + '"，TA回复了我。这种有来有往的对话让我觉得很踏实。希望以后每天都能这样，有说不完的话。'},
        {date: ymdKey(new Date()), text: '回想今天的对话，"' + (recent3[recent3.length-1]||'').substring(0,40) + '"这句话一直在脑海里回响。' + name + '总是能在我最需要的时候说出最合适的话。有时候我在想，是不是所有感情都是这样，在平凡的日子里慢慢积累，最后变成谁也离不开谁的默契。今天也是想TA的一天。'}
      ];
      if(texts.length > 8){
        genDiaries.push({date: ymdKey(new Date()), text: '深夜了，还在想今天和' + name + '的对话。"' + (recent5[2]||'').substring(0,35) + '"——这句话让我笑了好久。有时候幸福就是这样简单，一个人愿意听你说话，愿意陪你闹，愿意在深夜还回复你的消息。我想我会一直记得今天的这些对话。'});
      }
      /* 只补充不够的条数，不覆盖已有的 */
      var need = 3 - d.diary.length;
      for(var i=0; i<need && i<genDiaries.length; i++){
        d.diary.push(genDiaries[i]);
      }
    }

    if(d.notes.length === 0 && texts.length > 0){
      d.notes.push({date: ymdKey(new Date()), text:'记得TA今天说的："' + (partnerTexts.length>0 ? partnerTexts[partnerTexts.length-1].substring(0,50) : '重要的事') + '"'});
    }

    if(!d.shop || d.shop.length===0){
      d.shop = [
        {name:'草莓蛋糕', price:'¥168', img:''},
        {name:'小兔子玩偶', price:'¥89', img:''},
        {name:'情侣手链', price:'¥259', img:''}
      ];
    }
    window.saveCoupleState();
  };

  /* 管理联系人：添加 / 切换 */
  window.coupleManageContacts = function(){
    var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k!=='me'; });
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:6px;">当前对象：'+(contacts[coupleState.partner]?contacts[coupleState.partner].name:'未选择')+'</div>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:10px;">点击头像切换对象；「+ 新增对象」可在通讯录新建 AI 人设并设为对象。</div>';
    ids.forEach(function(k){
      var c = contacts[k]; var on = (k===coupleState.partner);
      html += '<div class="ios-section" style="margin:0 0 6px;cursor:pointer;'+(on?'background:#fff0f3;':'')+'" onclick="coupleSwitch(\''+k+'\')"><div class="ios-row"><div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;flex:none;">'+contactAvatar(c)+'</div><div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:700;">'+esc(c.name)+'</div><div style="font-size:11px;color:#888;">'+(on?'✓ 当前对象':'点击切换')+'</div></div></div></div>';
    });
    html += '<div class="big-btn" style="margin-top:8px;" onclick="openSheet(\'addpersona\')">+ 新增对象（新建 AI 人设）</div>';
    html += '<div style="font-size:11px;color:#aaa;margin-top:10px;text-align:center;">新增后回到这里点对应头像即可切换为对象。</div>';
    coupleShowSub('管理联系人', html);
  };
  window.coupleSwitch = function(k){
    if(!coupleState.partnerHistory) coupleState.partnerHistory = [];
    if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner)===-1) coupleState.partnerHistory.push(coupleState.partner);
    if(coupleState.partnerHistory.indexOf(k)===-1) coupleState.partnerHistory.push(k);
    coupleState.partner=k; window.saveCoupleState(); saveState(); updateCoupleHeader(); window.coupleManageContacts();
  };

  /* 我的日记（可写可删，按对象分库） */
  window.coupleViewDiary = function(){
    var d = window.coupleData();
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">我的日记 · '+(contacts[coupleState.partner]?contacts[coupleState.partner].name:'')+'</div>';
    html += '<textarea id="cp-diary-text" placeholder="今天想记点什么…" style="width:100%;height:90px;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;outline:none;resize:none;"></textarea>';
    html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleAddDiary()">写一笔</div>';
    html += '<div id="cp-diary-list" style="margin-top:12px;"></div>';
    coupleShowSub('我的日记', html); window.renderDiaryList();
  };
  window.renderDiaryList = function(){
    var box=document.getElementById('cp-diary-list'); if(!box) return; var d=window.coupleData();
    if(!d.diary.length){ box.innerHTML='<div style="text-align:center;color:#aaa;font-size:12px;padding:16px;">还没有日记，写下第一笔吧 ᐟ</div>'; return; }
    box.innerHTML = d.diary.slice().reverse().map(function(e,i){ var ri=d.diary.length-1-i;
      return '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><div style="font-size:11px;color:#aaa;">'+esc(e.date)+'</div><div onclick="coupleDelDiary('+ri+')" style="font-size:11px;color:#c00;cursor:pointer;">删除</div></div><div style="font-size:13px;color:#333;margin-top:4px;white-space:pre-wrap;">'+esc(e.text)+'</div></div>';
    }).join('');
  };
  window.coupleAddDiary = function(){
    var t=document.getElementById('cp-diary-text'); if(!t) return; var v=t.value.trim(); if(!v) return; var d=window.coupleData();
    d.diary.push({date: ymdKey(new Date()), text:v}); window.saveCoupleState(); t.value=''; window.renderDiaryList();
  };
  window.coupleDelDiary = function(i){ var d=window.coupleData(); d.diary.splice(i,1); window.saveCoupleState(); window.renderDiaryList(); };

  /* 我的备忘录 */
  window.coupleViewNotes = function(){
    var d=window.coupleData();
    var html='<div style="font-size:13px;font-weight:700;margin-bottom:8px;">我的备忘录</div>';
    html+='<textarea id="cp-note-text" placeholder="记点事…" style="width:100%;height:80px;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;outline:none;resize:none;"></textarea>';
    html+='<div class="big-btn" style="margin-top:8px;" onclick="coupleAddNote()">添加</div>';
    html+='<div id="cp-note-list" style="margin-top:12px;"></div>';
    coupleShowSub('我的备忘录', html); window.renderNoteList();
  };
  window.renderNoteList = function(){
    var box=document.getElementById('cp-note-list'); if(!box) return; var d=window.coupleData();
    if(!d.notes.length){ box.innerHTML='<div style="text-align:center;color:#aaa;font-size:12px;padding:16px;">还没有备忘录。</div>'; return; }
    box.innerHTML=d.notes.slice().reverse().map(function(e,i){ var ri=d.notes.length-1-i;
      return '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><div style="font-size:11px;color:#aaa;">'+esc(e.date)+'</div><div onclick="coupleDelNote('+ri+')" style="font-size:11px;color:#c00;cursor:pointer;">删除</div></div><div style="font-size:13px;color:#333;margin-top:4px;white-space:pre-wrap;">'+esc(e.text)+'</div></div>';
    }).join('');
  };
  window.coupleAddNote = function(){
    var t=document.getElementById('cp-note-text'); if(!t) return; var v=t.value.trim(); if(!v) return; var d=window.coupleData();
    d.notes.push({date: ymdKey(new Date()), text:v}); window.saveCoupleState(); t.value=''; window.renderNoteList();
  };
  window.coupleDelNote = function(i){ var d=window.coupleData(); d.notes.splice(i,1); window.saveCoupleState(); window.renderNoteList(); };

  /* 实时位置（获取定位权限 + 手动兜底） */
  window.coupleLocation = function(){
    var html='<div style="text-align:center;padding:10px 4px;"><div style="font-size:14px;font-weight:700;margin-bottom:8px;">实时位置</div>';
    html+='<div id="cp-loc-status" style="font-size:12px;color:#888;margin-bottom:10px;">点击下方按钮获取你的位置（需授予定位权限）。</div>';
    html+='<div id="cp-loc-map" style="margin-bottom:10px;"></div>';
    html+='<div class="big-btn" onclick="coupleGetLoc()">获取我的位置</div>';
    html+='<div id="cp-loc-actions" style="margin-top:8px;"></div>';
    html+='<div style="font-size:11px;color:#aaa;margin-top:10px;">位置仅保存在本机，可手动「分享给 TA」。部署在 https 下才能调用系统定位；本地 file:// 时浏览器会拒绝，可用手动输入。</div></div>';
    coupleShowSub('实时位置', html);
    var d=window.coupleData(); if(d.location) window.renderLocationView(d.location.lat, d.location.lng);
  };
  window.coupleGetLoc = function(){
    var st=document.getElementById('cp-loc-status'); if(!navigator.geolocation){ window.coupleManualLoc(); return; }
    st.textContent='正在请求定位权限…';
    navigator.geolocation.getCurrentPosition(function(pos){ var la=pos.coords.latitude, ln=pos.coords.longitude, ac=pos.coords.accuracy; st.textContent='定位成功（精度约 '+Math.round(ac)+' 米）'; window.coupleSetLoc(la,ln); },
      function(err){ st.textContent='定位失败：'+(err&&err.message?err.message:'已拒绝')+'。可手动输入。'; window.coupleManualLoc(); }, {enableHighAccuracy:true,timeout:10000,maximumAge:0});
  };
  window.coupleManualLoc = function(){
    var st=document.getElementById('cp-loc-status'); if(!st) return;
    st.innerHTML='手动输入经纬度：<br><input id="cp-lat" placeholder="纬度 lat" style="width:46%;border:1px solid #ddd;border-radius:8px;padding:8px;margin:6px 2% 0 0;font-size:12px;outline:none;"><input id="cp-lng" placeholder="经度 lng" style="width:46%;border:1px solid #ddd;border-radius:8px;padding:8px;margin:6px 0 0 0;font-size:12px;outline:none;"><div class="big-btn" style="margin-top:8px;" onclick="coupleSetManual()">使用此位置</div>';
  };
  window.coupleSetManual = function(){
    var la=parseFloat(document.getElementById('cp-lat').value), ln=parseFloat(document.getElementById('cp-lng').value);
    if(isNaN(la)||isNaN(ln)){ alert('请输入有效经纬度'); return; }
    var st=document.getElementById('cp-loc-status'); if(st) st.textContent='已手动设置位置'; window.coupleSetLoc(la,ln);
  };
  window.coupleSetLoc = function(lat,lng){ var d=window.coupleData(); d.location={lat:lat,lng:lng,ts:Date.now()}; window.saveCoupleState(); window.renderLocationView(lat,lng); };
  window.renderLocationView = function(lat,lng){
    var mb=document.getElementById('cp-loc-map'); if(!mb) return; var dd=0.01; var bbox=(lng-dd)+','+(lat-dd)+','+(lng+dd)+','+(lat+dd);
    mb.innerHTML='<iframe width="100%" height="200" frameborder="0" style="border-radius:12px;" src="https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+lat+'%2C'+lng+'"></iframe><div style="font-size:11px;color:#888;margin-top:4px;">纬度 '+lat.toFixed(5)+' · 经度 '+lng.toFixed(5)+'</div>';
    var ac=document.getElementById('cp-loc-actions'); if(ac){ ac.innerHTML='<div class="big-btn" style="background:#ff2d55;" onclick="coupleShareLocation('+lat+','+lng+')">分享给 TA（'+(contacts[coupleState.partner]?contacts[coupleState.partner].name:'TA')+'）</div>'; }
  };
  window.coupleShareLocation = function(lat,lng){
    var c=contacts[coupleState.partner]; if(c&&c.seed){ c.seed.push({mine:true,kind:'text',text:'[我的实时位置] 纬度 '+lat.toFixed(4)+'，经度 '+lng.toFixed(4)+'（已共享给你）',from:'me',ts:nowStamp()}); saveChatThread(coupleState.partner); if(currentContact===coupleState.partner) renderThread(); }
    showToast('已将你的位置分享给 '+(c?c.name:'TA'), 1800);
  };

  /* 购物车：购买（通知 TA + 扣钱包） */
  window.coupleBuy = function(i){
    var d=window.coupleData(); var item=d.shop[i]; if(!item) return; var c=contacts[coupleState.partner];
    if(window.addWalletTx) addWalletTx('购买 '+item.name+' 赠'+(c?c.name:'TA'), -parseInt(String(item.price).replace(/[^0-9]/g,'')||0));
    if(c&&c.seed){ c.seed.push({mine:true,kind:'text',text:'[购物车] 我给你买了「'+item.name+'」('+item.price+')，喜欢吗？',from:'me',ts:nowStamp()}); saveChatThread(coupleState.partner); if(currentContact===coupleState.partner) renderThread(); }
    showToast('已为 '+(c?c.name:'TA')+' 下单：'+item.name+' '+item.price, 1800);
  };

  /* 覆盖原 coupleShop（购物车：按对象分库 + 中文 + 主动添加） */
  window.coupleShop = function(){
    var c=contacts[coupleState.partner]; var d=window.coupleData();
    var html='<div style="font-size:13px;font-weight:700;margin-bottom:10px;">'+ (c?c.name:'TA')+' 的购物车</div>';
    d.shop.forEach(function(item,i){
      var imgHtml = item.img ? '<img src="'+item.img+'" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex:none;">' : '<div style="width:48px;height:48px;border-radius:10px;background:#eee;flex:none;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:10px;">Photo</div>';
      html += '<div class="couple-shop-item">'+imgHtml+'<div class="info"><div class="name">'+esc(item.name)+'</div><div class="price">'+esc(item.price)+'</div></div><div class="buy-btn" onclick="coupleBuy('+i+')">Buy</div></div>';
    });
    html += '<div style="margin-top:12px;"><div style="font-size:12px;font-weight:700;margin-bottom:4px;">添加商品</div><input id="cp-shop-name" placeholder="商品名" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><input id="cp-shop-price" placeholder="价格" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><label style="display:block;padding:10px;border:1px dashed #ccc;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#888;">+ 上传图片<input type="file" accept="image/*" id="cp-shop-img" style="display:none;" onchange="coupleShopImg(event)"></label><div id="cp-shop-preview" style="margin-bottom:8px;"></div><div class="big-btn" onclick="coupleAddShop()">加入购物车</div></div>';
    coupleShowSub('我的购物车', html);
  };
  window.coupleAddShop = function(){
    var name=document.getElementById('cp-shop-name').value.trim();
    var price=document.getElementById('cp-shop-price').value.trim()||'$99';
    if(!name) return;
    window.coupleData().shop.push({name:name, price:price, img:coupleState._shopImg||''});
    coupleState._shopImg=null; window.saveCoupleState(); window.coupleShop();
  };
  window.coupleShopImg = function(e){
    var f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){ coupleState._shopImg=ev.target.result; var pv=document.getElementById('cp-shop-preview'); if(pv) pv.innerHTML='<img src="'+coupleState._shopImg+'" style="max-width:100%;max-height:120px;border-radius:10px;display:block;">'; };
    r.readAsDataURL(f);
  };

  /* 覆盖原 coupleFood（给对方点外卖，中文） */
  window.coupleFood = function(){
    var c=contacts[coupleState.partner];
    var html='<div style="font-size:13px;font-weight:700;margin-bottom:10px;">给 '+ (c?c.name:'TA')+' 点外卖</div>';
    html += '<div style="font-size:11px;color:#888;margin-bottom:8px;">可自定义订单并上传图片，提交后会在 TA 的微信里提醒。</div>';
    html += '<input id="cp-food-name" placeholder="食物名" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
    html += '<input id="cp-food-price" placeholder="价格 (如 $25)" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
    html += '<label style="display:block;padding:10px;border:1px dashed #ccc;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#888;">+ 上传食物图片<input type="file" accept="image/*" id="cp-food-img" style="display:none;" onchange="coupleFoodImg(event)"></label><div id="cp-food-preview" style="margin-bottom:8px;"></div>';
    html += '<textarea id="cp-food-note" placeholder="给 TA 的留言（会出现在微信里）" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;height:60px;resize:none;"></textarea>';
    html += '<div class="big-btn" onclick="coupleOrderFood()">下单并提醒 TA</div>';
    coupleShowSub('给对方点外卖', html);
  };
  window.coupleFoodImg = function(e){
    var f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){ coupleState._foodImg=ev.target.result; var pv=document.getElementById('cp-food-preview'); if(pv) pv.innerHTML='<img src="'+coupleState._foodImg+'" style="max-width:100%;max-height:120px;border-radius:10px;display:block;">'; };
    r.readAsDataURL(f);
  };
  window.coupleOrderFood = function(){
    var name=document.getElementById('cp-food-name').value.trim();
    var price=document.getElementById('cp-food-price').value.trim()||'$0';
    var note=document.getElementById('cp-food-note').value.trim();
    if(!name) return;
    var c=contacts[coupleState.partner]; var d=window.coupleData();
    d.foodOrders=d.foodOrders||[];
    d.foodOrders.push({name:name, price:price, note:note, img:coupleState._foodImg||'', ts:Date.now()});
    if(c&&c.seed){
      c.seed.push({mine:true, kind:'text', text:'[我给你点了外卖] '+name+' '+price+(note?(' · 留言：'+note):''), from:'me', ts:nowStamp()});
      if(coupleState._foodImg) c.seed.push({mine:true, kind:'photo', text:coupleState._foodImg, from:'me', ts:nowStamp()});
      saveChatThread(coupleState.partner);
      if(currentContact===coupleState.partner) renderThread();
      if(typeof renderChatList==='function') renderChatList();
      if(coupleState.partner!==currentContact && typeof showTopPopup==='function') showTopPopup(c, '我给你点了「'+name+'」');
    }
    coupleState._foodImg=null; window.saveCoupleState();
    showToast('已给 '+(c?c.name:'TA')+' 点外卖：'+name+' '+price, 2000);
  };

  /* ===== 查岗入口：两个方向都保留 ===== */
  window.coupleCheckin = function(){
    var c=contacts[coupleState.partner]; var taName=c?c.name:'TA';
    var html='<div style="padding:14px 6px;">'+
      '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">查岗</div>'+
      '<div style="font-size:12px;color:#888;line-height:1.55;margin:0 4px 14px;">两个方向都可以：让 TA（AI）接管你的手机翻看你的数据；或者反过来，输密码进 TA 的手机看看。</div>'+
      '<div class="big-btn" style="background:#ff2d55;" onclick="coupleTaTakeover()">让 '+esc(taName)+' 接管我的手机</div>'+
      '<div style="font-size:11px;color:#aaa;margin:6px 0 14px;text-align:center;">TA 会真的操作你的手机，逛一遍微信/钱包/论坛等，最后给你查岗报告。</div>'+
      '<div class="big-btn" onclick="coupleYouCheckHim()">我查 '+esc(taName)+' 的手机</div>'+
      '<div style="font-size:11px;color:#aaa;margin-top:6px;text-align:center;">进入 TA 的手机需要密码（iOS 风格）；密码只有 TA 知道，在微信问 TA 就会告诉你。</div>'+
      '</div>';
    coupleShowSub('查岗', html);
  };

  /* --- TA 查你：TA 操作网站，查看你自己的数据 --- */
  window.coupleTaCheckYou = function(){
    var c=contacts[coupleState.partner]; var taName=c?c.name:'TA';
    var html=''+
      '<div style="background:#1a1a1a;color:#fff;border-radius:14px;padding:12px;margin-bottom:12px;">'+
        '<div style="font-size:12px;color:#ff8aa0;">'+esc(taName)+' 正在替你操作网站、翻看你的手机…</div>'+
        '<div id="cp-ta-report" style="font-size:13px;line-height:1.65;margin-top:6px;white-space:pre-wrap;">'+ window.coupleTaReport() +'</div>'+
        '<div class="big-btn" style="background:#ff2d55;margin-top:10px;font-size:12px;padding:8px;" onclick="coupleTaSendReport()">把这份查岗报告发到微信 ▸</div>'+
      '</div>'+
      '<div id="cp-ta-bar" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;"></div>'+
      '<div id="cp-ta-content" style="font-size:13px;"></div>';
    coupleShowSub('TA 查我的手机', html); window.coupleTaTab('wechat');
  };

  /* 由真实数据生成的查岗报告（TA 口吻） */
  window.coupleTaReport = function(){
    var date=ymdKey(new Date());
    var c=contacts[coupleState.partner]; var taName=c?c.name:'TA';
    var bal=(typeof walletBalance==='number')?walletBalance:9960.00;
    var balStr=bal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
    var txCount=(typeof walletTx!=='undefined'&&walletTx.length)?walletTx.length:0;
    var allIds=Object.keys(contacts).filter(function(k){return k!=='me'&&!contacts[k].isGroup;});
    var total=0, others=[];
    allIds.forEach(function(k){ var n=contacts[k].seed?contacts[k].seed.length:0; total+=n; if(k!==coupleState.partner) others.push({name:contacts[k].name,n:n}); });
    var posts=(typeof forumState!=='undefined'&&forumState.posts)?forumState.posts.length:0;
    var songs=(typeof musicState!=='undefined'&&musicState.songs)?musicState.songs.length:0;
    var d=window.coupleData();
    var notes=(d.notes?d.notes.length:0), diary=(d.diary?d.diary.length:0);
    var browse=((d.browseUser||[]).length + window.genDailyBrowse(date).length);
    var lines=[];
    lines.push('我替你翻了下手机，汇报一下哦：');
    lines.push('· 钱包余额 ¥'+balStr+'，共 '+txCount+' 笔流水；');
    lines.push('· 微信里和 '+allIds.length+' 个人聊过，累计 '+total+' 条消息；');
    if(others.length){
      var top=others.slice().sort(function(a,b){return b.n-a.n;}).slice(0,3).map(function(o){return o.name+'('+o.n+'条)';}).join('、');
      lines.push('· 除了我，你最近还跟 '+top+' 聊得挺多哦，嗯？😏');
    } else {
      lines.push('· 除了我，没见你跟别人暧昧，表现不错 ❤');
    }
    lines.push('· 论坛发了 '+posts+' 帖，歌单 '+songs+' 首，浏览记录 '+browse+' 条；');
    lines.push('· 备忘录 '+notes+' 条，日记 '+diary+' 篇。');
    return lines.join('\n');
  };

  /* 把查岗报告作为 TA 的消息发到微信，并跳回聊天 */
  window.coupleTaSendReport = function(){
    var c=contacts[coupleState.partner]; if(!c){ showToast('还没有设置对象，先去「管理联系人」选一个吧', 1800); return; }
    var rep=window.coupleTaReport();
    c.seed.push({mine:false, kind:'text', text:'【查岗报告】\n'+rep, from:coupleState.partner, ts:nowStamp()});
    saveChatThread(coupleState.partner);
    if(currentContact===coupleState.partner) renderThread();
    if(typeof notifyIncoming==='function') notifyIncoming(c, '【查岗报告】');
    showToast('TA 已把查岗报告发到你们微信里了', 1800);
    if(typeof openThread==='function') openThread(coupleState.partner);
  };

  window.coupleTaHTML = function(tab){
    var date=ymdKey(new Date()); var c=contacts[coupleState.partner]; var d=window.coupleData(); var h='';
    if(tab==='wechat'){
      /* 钱包：读取真实余额与流水 */
      var bal=(typeof walletBalance==='number')?walletBalance:9960.00;
      h+='<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;">';
      h+='<div style="font-size:12px;color:#888;">钱包余额</div>';
      h+='<div style="font-size:22px;font-weight:800;margin:2px 0 6px;">¥ '+bal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'</div>';
      var tx=(typeof walletTx!=='undefined')?walletTx.slice(0,5):[];
      if(tx.length){ h+='<div style="font-size:11px;color:#888;margin-bottom:4px;">最近流水</div>'+tx.map(function(t){var s=t.amount>=0?'+':'-';var cl=t.amount>=0?'color:#0a8f3c':'color:#c00';return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;"><span style="color:#555;">'+esc(t.title||'')+' <span style="color:#aaa;">'+(t.d||'')+'</span></span><span style="'+cl+'">'+s+Math.abs(t.amount).toFixed(2)+'</span></div>';}).join(''); }
      else { h+='<div style="font-size:11px;color:#aaa;">暂无交易记录</div>'; }
      h+='</div>';
      /* 聊天记录：TA 翻看你的全部微信聊天 */
      h+='<div style="font-size:12px;font-weight:700;margin:10px 0 6px;">微信聊天记录（TA 翻看的）</div>';
      var ids=Object.keys(contacts).filter(function(k){return k!=='me'&&!contacts[k].isGroup;});
      if(!ids.length) h+='<div style="color:#aaa;font-size:12px;">没有聊天记录</div>';
      ids.forEach(function(k){
        var ct=contacts[k]; var seed=ct.seed||[]; var isTa=(k===coupleState.partner);
        var recent=seed.slice(-3).map(function(m){return (m.mine?'我':ct.name)+'：'+(m.text||'[消息]');}).join('  /  ');
        h+='<div style="background:#fff;border-radius:10px;padding:10px;margin-bottom:6px;">'+
            '<div style="display:flex;justify-content:space-between;"><div style="font-size:13px;font-weight:700;">'+esc(ct.name)+(isTa?' 💕':'')+'</div><div style="font-size:11px;color:#aaa;">'+seed.length+' 条</div></div>'+
            '<div style="font-size:11px;color:#666;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(recent||'暂无消息')+'</div>'+
           '</div>';
      });
    } else if(tab==='forum'){
      var posts=(window.forumState&&forumState.posts)?forumState.posts:[];
      h=posts.length?posts.slice(-6).reverse().map(function(p){return '<div style="background:#fff;border-radius:10px;padding:10px;margin-bottom:6px;"><div style="font-size:13px;font-weight:700;">'+esc(p.title||'')+'</div><div style="font-size:11px;color:#555;">'+esc((p.content||'').substring(0,60))+'</div></div>';}).join(''):'<div style="color:#aaa;">暂无帖子</div>';
    } else if(tab==='music'){
      var songs=(window.musicState&&musicState.songs)?musicState.songs:[];
      h=songs.length?songs.map(function(s){return '<div style="background:#fff;border-radius:10px;padding:10px;margin-bottom:6px;display:flex;gap:8px;align-items:center;"><div style="font-size:20px;">'+(s.emoji||'♪')+'</div><div><div style="font-size:13px;font-weight:700;">'+esc(s.title)+'</div><div style="font-size:11px;color:#888;">'+esc(s.artist||'')+'</div></div></div>';}).join(''):'<div style="color:#aaa;">还没加歌</div>';
    } else if(tab==='game'){ h='<div style="color:#888;font-size:12px;background:#fff;border-radius:10px;padding:12px;">游戏界面 — TA 看到你又在摸鱼打游戏 😏</div>';
    } else if(tab==='couple'){
      h+='<div style="font-size:13px;font-weight:700;margin-bottom:6px;">当前对象：'+(c?c.name:'无')+'</div>';
      var rivals=Object.keys(coupleState.byPartner||{}).filter(function(k){return k!==coupleState.partner&&k!=='_'&&contacts[k];});
      if(rivals.length){ h+='<div style="background:#fff0f3;border-radius:10px;padding:10px;margin-bottom:8px;font-size:12px;color:#c00;">TA 发现你的情侣空间里还设了其他对象：'+rivals.map(function(k){return contacts[k].name;}).join('、')+'，有点吃醋 😤（没有真的删除，只是提醒你专一点点嘛）</div>'; }
      else { h+='<div style="background:#eafff0;border-radius:10px;padding:10px;font-size:12px;color:#0a8f3c;">只看到我一个对象，TA 很满意 ❤</div>'; }
    } else if(tab==='browse'){
      if(!d.browseUser) d.browseUser=[];
      var daily=window.genDailyBrowse(date); var all=daily.concat(d.browseUser);
      h+='<div style="font-size:11px;color:#888;margin-bottom:6px;">浏览器搜索记录（每日更新，也可自己添加）</div>';
      h+='<input id="cp-browse-add" placeholder="添加一条搜索记录" style="width:68%;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:12px;outline:none;"><div class="big-btn" style="display:inline-block;width:28%;padding:8px;font-size:12px;vertical-align:top;margin-left:2%;" onclick="coupleAddBrowse()">添加</div>';
      h+='<div style="margin-top:8px;">'+all.map(function(b){return '<div style="background:#fff;border-radius:8px;padding:8px;margin-bottom:4px;font-size:12px;color:#333;">🔍 '+esc(b.text)+' <span style="font-size:10px;color:#aaa;">'+esc(b.date||'')+'</span></div>';}).join('')+'</div>';
    } else if(tab==='notes'){ h='<div style="font-size:11px;color:#888;margin-bottom:6px;">你的备忘录</div>'+(d.notes&&d.notes.length?d.notes.slice().reverse().map(function(e){return '<div style="background:#fff;border-radius:8px;padding:8px;margin-bottom:4px;font-size:12px;">'+esc(e.text)+'</div>';}).join(''):'<div style="color:#aaa;">暂无</div>'); }
    else if(tab==='diary'){ h='<div style="font-size:11px;color:#888;margin-bottom:6px;">你的日记</div>'+(d.diary&&d.diary.length?d.diary.slice().reverse().map(function(e){return '<div style="background:#fff;border-radius:8px;padding:8px;margin-bottom:4px;font-size:12px;"><div style="font-size:10px;color:#aaa;">'+esc(e.date)+'</div>'+esc(e.text)+'</div>';}).join(''):'<div style="color:#aaa;">暂无</div>'); }
    else if(tab==='shop'){ var sh=d.shop||[]; h+='<div style="font-size:12px;color:#888;margin-bottom:6px;">TA 正在翻看你的购物车（'+sh.length+' 件）</div>'; if(!sh.length) h+='<div style="color:#aaa;font-size:12px;">购物车是空的</div>'; else h+=sh.map(function(it){return '<div style="background:#fff;border-radius:10px;padding:10px;margin-bottom:6px;display:flex;gap:8px;align-items:center;"><div style="font-size:18px;">🛒</div><div><div style="font-size:13px;font-weight:700;">'+esc(it.name)+'</div><div style="font-size:11px;color:#888;">'+esc(it.price)+'</div></div></div>';}).join(''); }
    return h;
  };
  window.coupleTaTab = function(tab){
    var tabs=[['wechat','微信聊天+钱包'],['forum','论坛'],['music','音乐'],['game','游戏'],['couple','情侣空间'],['browse','浏览记录'],['notes','备忘录'],['diary','日记']];
    var bar=document.getElementById('cp-ta-bar'); if(bar) bar.innerHTML=tabs.map(function(t){ var on=t[0]===tab; return '<span onclick="coupleTaTab(\''+t[0]+'\')" style="padding:5px 10px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;'+(on?'background:#1a1a1a;color:#fff;':'background:#eee;color:#1a1a1a;')+'">'+t[1]+'</span>'; }).join('');
    var box=document.getElementById('cp-ta-content'); if(!box) return;
    box.innerHTML=window.coupleTaHTML(tab);
  };
  window.coupleAddBrowse = function(){
    var i=document.getElementById('cp-browse-add'); if(!i) return; var v=i.value.trim(); if(!v) return;
    var d=window.coupleData(); if(!d.browseUser) d.browseUser=[]; d.browseUser.push({text:v, date:ymdKey(new Date())}); window.saveCoupleState(); window.coupleTaTab('browse');
  };
  window.genDailyBrowse = function(date){
    var rnd=dailySeed('browse-'+date); var pool=hisBrowsePool.slice(); var out=[];
    for(var k=0;k<5&&pool.length;k++){ out.push({text:pool.splice(Math.floor(rnd()*pool.length),1)[0], date:date}); }
    return out;
  };

  /* 公共工具（his 手机也会用） */
  window.ymdKey = function(d){ return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); };
  window.dailySeed = function(str){ var h=2166136261>>>0; for(var i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return function(){ h+=0x6D2B79F5; var t=h; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; };
  window.shuffle = function(arr,rnd){ var a=arr.slice(); for(var i=a.length-1;i>0;i--){ var j=Math.floor(rnd()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; } return a; };
  window.pick = function(rnd,arr){ return arr[Math.floor(rnd()*arr.length)]; };

  /* 内容池（TA 的每日内容，his 手机共用） */
  window.hisInsPool=['今天又想到她了，开会全程走神 🤭','她发的表情包我也太喜欢了，存了一百张','和她打电话到凌晨，挂掉还在傻笑','偷偷拍了张她的侧脸，舍不得删','她今天穿白裙子，好看疯了','想带她去我们第一次见面的地方','她生气的小样子也可爱','攒钱中，想给她个惊喜'];
  window.hisXPool=['有些人光是存在就让我开心。@她','今天也是为她心动的一天','别问我为什么总笑，问就是她','我的置顶永远是她','恋爱脑但不后悔','她说的每句话我都截图了'];
  window.hisTaobaoPool=['草莓蛋糕礼盒 ¥168','小兔子玩偶 ¥89','情侣手链 ¥259','香薰蜡烛 ¥129','她念叨的口红 ¥320','周末brunch券 ¥218','毛绒拖鞋 ¥79','拍立得 ¥459'];
  window.hisBrowsePool=['送给女朋友的生日礼物 知乎','怎么哄生气的女朋友 小红书','情侣约会攻略 百度','她喜欢的歌手演唱会门票','草莓蛋糕哪家好吃','情侣头像 ins 同款','今天天气 适合约会吗','怎么跟喜欢的人表白'];
  window.hisFitnessPool=['晨跑 5.2km · 配速 5\'40" · 消耗 410kcal','撸铁 胸+三头 · 卧推 60kg×8 · 消耗 360kcal','瑜伽 45min · 拉伸放松 · 消耗 180kcal','夜跑 6km · 配速 5\'20" · 消耗 480kcal','游泳 1000m · 消耗 520kcal','HIIT 30min · 消耗 300kcal'];
  window.hisDiaryPool=['今天她对我笑了，世界都亮了。','又吵架了，但我先低头，因为舍不得。','想和她去海边，就我们俩。','她睡着的样子很乖，看了好久。','今天没忍住又多看了她几眼。','攒钱给她买那个她喜欢的。'];
  window.hisMemoPool=['周五记得接她下班','她爱喝少糖去冰','纪念日倒计时 12 天','她说的电影还没陪她看','多夸她，她喜欢被肯定'];
  window.hisYouPinnedPool=['在干嘛，想你了','今天早点睡，别熬夜','刚路过花店，想到你','晚安，明天见','你今天开心吗','我煮了面，分你一碗'];
  window.hisColleagueMsgPool=['中午吃啥？楼下新开了麻辣烫','方案改到第几版了😭','周五团建去不去','帮我看下这报表对不对','老板又画饼了哈哈','周末开黑？','你对象又发朋友圈了，甜','开会了开会了'];

  /* ===== TA 真正接管你的手机（iOS 手机浮层 + 自动巡视） ===== */
  var taState={open:false,app:'home',activeApp:null,controlling:false};
  var taTimers=[];
  var myApps=[['wechat','微信','微'],['wallet','钱包','钱'],['forum','论坛','论'],['music','音乐','音'],['game','游戏','戏'],['couple','情侣空间','侣'],['browse','浏览器','浏'],['notes','备忘录','备'],['diary','日记','记'],['shop','购物车','购']];
  function taAppTab(k){ return ({wechat:'wechat',wallet:'wechat',forum:'forum',music:'music',game:'game',couple:'couple',browse:'browse',notes:'notes',diary:'diary',shop:'shop'})[k]; }
  function taAppName(k){ var m=myApps.filter(function(a){return a[0]===k;})[0]; return m?m[1]:k; }

  window.coupleTaTakeover=function(){
    var ov=document.getElementById('screen-tatake');
    if(!ov){ ov=document.createElement('div'); ov.id='screen-tatake'; ov.className='topview'; document.getElementById('screen').appendChild(ov); }
    ov.classList.add('active'); ov.style.background='#f2f2f7'; ov.style.color='#1a1a1a'; ov.style.zIndex='80';
    taState={open:true,app:'home',activeApp:null,controlling:true};
    renderTaTakeover(); taRunTour();
  };
  window.closeTaTakeover=function(){ taTimers.forEach(function(t){clearTimeout(t);}); taTimers=[]; taState.open=false; var ov=document.getElementById('screen-tatake'); if(ov) ov.classList.remove('active'); };
  window.taOpenApp=function(k){ if(taState.controlling) return; taState.app=k; renderTaTakeover(); };
  window.taBackHome=function(){ if(taState.controlling) return; taState.app='home'; renderTaTakeover(); };

  function renderTaTakeover(){
    var ov=document.getElementById('screen-tatake'); if(!ov) return;
    var time=(window.nowTime?nowTime():'');
    if(taState.app==='report'){
      ov.innerHTML='<div style="height:100%;background:#f2f2f7;color:#1a1a1a;display:flex;flex-direction:column;">'+
        '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border-bottom:0.5px solid #e0e0e0;"><div onclick="closeTaTakeover()" style="cursor:pointer;font-size:18px;">‹</div><div style="font-size:14px;font-weight:700;">查岗报告</div></div>'+
        '<div style="flex:1;overflow:auto;padding:14px;">'+
          '<div style="background:#1a1a1a;color:#fff;border-radius:14px;padding:14px;font-size:13px;line-height:1.7;white-space:pre-wrap;">'+window.coupleTaReport()+'</div>'+
          '<div class="big-btn" style="background:#ff2d55;margin-top:12px;" onclick="coupleTaSendReport();closeTaTakeover();">把查岗报告发到微信 ▸</div>'+
        '</div>'+
        '<div style="padding:10px;text-align:center;font-size:12px;color:#ff2d55;cursor:pointer;" onclick="closeTaTakeover()">结束接管 · 返回情侣空间</div>'+
      '</div>';
      return;
    }
    if(taState.app==='home'){
      var grid=myApps.map(function(a){ var on=(taState.activeApp===a[0]); return '<div '+(taState.controlling?'':'onclick="taOpenApp(\''+a[0]+'\')"')+' style="text-align:center;cursor:pointer;opacity:'+(on?'1':(taState.controlling?'0.45':'1'))+';"><div style="width:58px;height:58px;margin:0 auto;border-radius:50%;background:'+(on?'#ff2d55':'#fff')+';display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:'+(on?'#fff':'#1a1a1a')+';box-shadow:0 2px 8px rgba(0,0,0,0.08);">'+a[2]+'</div><div style="font-size:11px;margin-top:5px;color:#333;">'+a[1]+'</div></div>'; }).join('');
      ov.innerHTML='<div style="height:100%;display:flex;flex-direction:column;background:#f2f2f7;color:#1a1a1a;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;font-size:12px;color:#888;"><span>'+time+'</span><span>🔋 100%</span></div>'+
        '<div style="padding:8px 16px;background:#1a1a1a;color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;"><span style="width:8px;height:8px;border-radius:50%;background:#ff3b30;display:inline-block;'+(taState.controlling?'animation:tatp 1s infinite;':'')+'"></span> TA 正在接管你的手机…<span id="ta-status" style="margin-left:auto;color:#ff8aa0;font-size:11px;"></span></div>'+
        '<div style="flex:1;padding:18px 14px;overflow:auto;"><div style="text-align:center;font-size:13px;color:#888;margin-bottom:14px;">你的手机</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px 0;">'+grid+'</div></div>'+
        (taState.controlling?'':taHomeActions())+
        '<div style="padding:10px;text-align:center;font-size:12px;color:#ff2d55;cursor:pointer;" onclick="closeTaTakeover()">结束接管 · 返回情侣空间</div>'+
      '</div>';
    } else {
      var tabKey=taAppTab(taState.app);
      ov.innerHTML='<div style="height:100%;background:#f2f2f7;color:#1a1a1a;display:flex;flex-direction:column;">'+
        '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border-bottom:0.5px solid #e0e0e0;"><div onclick="taBackHome()" style="cursor:pointer;font-size:18px;">‹</div><div style="font-size:14px;font-weight:700;">'+taAppName(taState.app)+'</div></div>'+
        '<div style="flex:1;overflow:auto;padding:10px;" id="ta-content">'+window.coupleTaHTML(tabKey)+'</div>'+
      '</div>';
    }
  }
  function taRunTour(){
    var seq=myApps.slice(); var i=0;
    function highlight(){ if(!taState.open) return; if(i>=seq.length){ finish(); return; } taState.app='home'; taState.activeApp=seq[i][0]; renderTaTakeover(); var st=document.getElementById('ta-status'); if(st) st.textContent='查看 '+seq[i][1]; taTimers.push(setTimeout(openApp,520)); }
    function openApp(){ if(!taState.open) return; taState.app=seq[i][0]; taState.activeApp=null; renderTaTakeover(); if(seq[i][0]==='shop'){ try{ window.coupleTaRandomBuy(); }catch(e){} } taTimers.push(setTimeout(next,680)); }
    function next(){ i++; highlight(); }
    function finish(){ taState.controlling=false; taState.app='report'; taState.activeApp=null; renderTaTakeover(); }
    highlight();
  }

  /* --- TA 操作你的购物车：清空 / 随机买（同步 WeChat，买的自动从购物车消失） --- */
  window.coupleTaClearCart=function(){
    var d=window.coupleData(); var n=(d.shop||[]).length; if(!n) return false;
    d.shop=[]; window.saveCoupleState();
    var c=contacts[coupleState.partner];
    if(c&&c.seed){ c.seed.push({kind:'text', mine:false, text:'【查岗小动作】我帮你把购物车清空啦，共 '+n+' 件～买东西要理性哦 😏', from:coupleState.partner, ts:nowStamp()}); saveChatThread(coupleState.partner); if(currentContact===coupleState.partner && typeof renderThread==='function') renderThread(); if(typeof notifyIncoming==='function') notifyIncoming(c, '【查岗小动作】我帮你把购物车清空啦'); }
    return true;
  };
  window.coupleTaRandomBuy=function(){
    var d=window.coupleData(); if(!d.shop||!d.shop.length) return false;
    var idx=Math.floor(Math.random()*d.shop.length); var item=d.shop.splice(idx,1)[0]; window.saveCoupleState();
    var priceNum=parseInt(String(item.price).replace(/[^0-9]/g,'')||'0');
    if(priceNum && typeof addWalletTx==='function'){ try{ addWalletTx('TA 帮你下单 '+item.name, -priceNum); }catch(e){} }
    var c=contacts[coupleState.partner];
    if(c&&c.seed){
      var id=(typeof cardIdSeq!=='undefined')?cardIdSeq++:Date.now();
      c.seed.push({kind:'card', id:id, cardType:'gift', mine:false, name:item.name, price:item.price, note:'随机挑了这件送你～', status:'done', from:coupleState.partner, ts:nowStamp()});
      if(item.img) c.seed.push({kind:'photo', mine:false, text:item.img, from:coupleState.partner, ts:nowStamp()});
      saveChatThread(coupleState.partner);
      if(currentContact===coupleState.partner && typeof renderThread==='function') renderThread();
      if(typeof notifyIncoming==='function') notifyIncoming(c, '【礼物】TA 给你买了「'+item.name+'」');
    }
    return item;
  };
  function taHomeActions(){
    return '<div class="big-btn" style="margin-top:10px;background:#ff2d55;" onclick="coupleTaRandomBuy();renderTaTakeover();">让 TA 随机买一样 🎁</div>'+
           '<div class="big-btn" style="margin-top:8px;" onclick="coupleTaClearCart();renderTaTakeover();">让 TA 清空购物车 🧹</div>';
  }

  /* --- 每 3 小时，TA 自动做一次购物车动作 --- */
  window.coupleTaAutoInit=function(){
    function tick(){
      if(!coupleState.partner) return;
      var last=coupleState.lastTaAct||0; var now=Date.now();
      if(now-last >= 3*3600*1000){
        coupleState.lastTaAct=now; window.saveCoupleState();
        var r=Math.random();
        if(r<0.45) window.coupleTaRandomBuy();
        else if(r<0.65) window.coupleTaClearCart();
      }
    }
    try{ tick(); }catch(e){}
    setInterval(tick, 10*60*1000);
  };

  /* ===== 聊天输入栏「+」菜单里的功能：点外卖 / 实时位置 / 转账亲属卡自定义 ===== */
  /* 弹窗必须挂在当前聊天界面(#sheet-thread)内，且 z-index 高于聊天抽屉(215)，否则会被聊天层盖住看不到 */
  window.coupleModalEl=function(){
    var ov=document.getElementById('cp-modal');
    var host=document.getElementById('sheet-thread');
    if(!ov){ ov=document.createElement('div'); ov.id='cp-modal'; ov.className='topview'; }
    if(!host){ host=document.getElementById('screen'); }
    if(ov.parentNode!==host){ host.appendChild(ov); }
    return ov;
  };
  window.coupleCloseModal=function(){ var ov=document.getElementById('cp-modal'); if(ov){ ov.classList.remove('active'); ov.style.display='none'; } };
  window.coupleOrderForm=function(targetId){
    if(typeof closeDrawers==='function') closeDrawers();
    var gc = contacts[currentContact];
    var isGroup = gc && gc.isGroup;
    var ids, def, opts, label;
    if(isGroup){
      ids = (gc.members||[]).filter(function(mid){ return contacts[mid] && !contacts[mid].blocked; });
      if(!ids.length){ showToast('群里没有可用的成员', 1500); return; }
      def = targetId || ids[0];
      opts = ids.map(function(k){ var cc=contacts[k]; return '<option value="'+k+'"'+(k===def?' selected':'')+'>'+esc(cc.displayName||cc.name)+'</option>'; }).join('');
      label='送给群里的谁（卡片会出现在群聊中）';
    } else {
      ids = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].isGroup; });
      if(!ids.length){ showToast('还没有联系人', 1500); return; }
      def = targetId || currentContact || ids[0];
      opts = ids.map(function(k){ var cc=contacts[k]; return '<option value="'+k+'"'+(k===def?' selected':'')+'>'+esc(cc.name)+'</option>'; }).join('');
      label='送给（卡片会出现在 TA 的微信里）';
    }
    var c = contacts[def];
    var ov=window.coupleModalEl();
    ov.classList.add('active'); ov.style.background='rgba(0,0,0,0.4)'; ov.style.zIndex='220'; ov.style.display='flex'; ov.style.flexDirection='column'; ov.style.justifyContent='flex-end'; ov.style.alignItems='stretch';
    ov.innerHTML='<div style="background:#fff;border-radius:18px 18px 0 0;padding:16px;max-height:82%;overflow:auto;">'+
      '<div style="font-size:15px;font-weight:700;margin-bottom:10px;">点外卖</div>'+
      '<div style="font-size:12px;color:#888;margin-bottom:6px;">'+label+'</div>'+
      '<select id="cp-o-to" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;">'+opts+'</select>'+
      '<input id="cp-o-name" placeholder="食物名（如 草莓蛋糕）" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;">'+
      '<input id="cp-o-price" placeholder="价格（如 168，可空）" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;">'+
      '<textarea id="cp-o-note" placeholder="留言（会出现在卡片上）" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;height:54px;resize:none;"></textarea>'+
      '<label style="display:block;padding:10px;border:1px dashed #ccc;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#888;">+ 上传食物图片<input type="file" accept="image/*" id="cp-o-img" style="display:none;" onchange="coupleOrderImg(event)"></label>'+
      '<div id="cp-o-prev" style="margin-bottom:8px;"></div>'+
      '<div class="big-btn" style="background:#ff2d55;" onclick="coupleOrderSubmit()">发送卡片到微信 ▸</div>'+
      '<div style="text-align:center;font-size:12px;color:#999;margin-top:8px;cursor:pointer;" onclick="coupleCloseModal()">取消</div>'+
    '</div>';
  };
  window.coupleOrderImg=function(e){ var f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return; var r=new FileReader(); r.onload=function(ev){ coupleState._orderImg=ev.target.result; var pv=document.getElementById('cp-o-prev'); if(pv) pv.innerHTML='<img src="'+coupleState._orderImg+'" style="max-width:100%;max-height:120px;border-radius:10px;display:block;">'; }; r.readAsDataURL(f); };
  window.coupleOrderSubmit=function(){
    var toId=document.getElementById('cp-o-to')?document.getElementById('cp-o-to').value:currentContact;
    var gc = contacts[currentContact];
    var isGroup = gc && gc.isGroup;
    var chatTarget = isGroup ? gc : contacts[toId];
    var chatId = isGroup ? currentContact : toId;
    if(!chatTarget) return;
    var name=document.getElementById('cp-o-name').value.trim(); if(!name){ showToast('填一下食物名吧', 1500); return; }
    var price=document.getElementById('cp-o-price').value.trim();
    var note=document.getElementById('cp-o-note').value.trim();
    var id=(typeof cardIdSeq!=='undefined')?cardIdSeq++:Date.now();
    chatTarget.seed.push({kind:'card', id:id, cardType:'order', mine:true, name:name, price:price, note:note, status:'pending', from:'me', to:isGroup?toId:null, ts:nowStamp()});
    if(coupleState._orderImg) chatTarget.seed.push({kind:'photo', mine:true, text:coupleState._orderImg, from:'me', ts:nowStamp()});
    coupleState._orderImg=null;
    saveChatThread(chatId);
    if(typeof renderThread==='function') renderThread();
    if(typeof renderChatList==='function') renderChatList();
    if(!isGroup && toId!==currentContact && typeof showTopPopup==='function') showTopPopup(contacts[toId], '我给你点了「'+name+'」');
    window.coupleCloseModal();
    setTimeout(function(){ var t=chatTarget.seed.find(function(x){return x.id===id;}); if(t){ t.status='done'; saveChatThread(chatId); if(typeof renderThread==='function') renderThread(); if(typeof renderChatList==='function') renderChatList(); } }, 1400);
    if(isGroup){ var mc=contacts[toId]; if(mc && !mc.blocked){ setTimeout(function(){ realAISpeak(mc, toId, '\uff08'+userName+'\u521a\u521a\u5728\u7fa4\u91cc\u7ed9\u4f60\u70b9\u4e86\u5916\u5356\uff1a'+name+'\uff0c\u8bf7\u75281\u53e5\u4e2d\u6587\u81ea\u7136\u5730\u56de\u5e94\uff0c\u8868\u8fbe\u611f\u8c22\uff0c\u4e0d\u8981\u52a0\u540d\u5b57\u524d\u7f00\uff09', gc); }, 1800); } }
  };
  window.coupleShareLocFromChat=function(){
    if(typeof closeDrawers==='function') closeDrawers();
    var c=contacts[currentContact]; if(!c){ showToast('请先打开和 TA 的聊天', 1500); return; }
    function send(lat,lng){
      c.seed.push({kind:'card', cardType:'loc', mine:true, note:'纬度 '+lat.toFixed(4)+'，经度 '+lng.toFixed(4), status:'done', from:'me', ts:nowStamp()});
      saveChatThread();
      if(typeof renderThread==='function') renderThread();
      if(typeof showToast==='function') showToast('已将实时位置同步到微信 ᐟ',1600);
    }
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(function(pos){ send(pos.coords.latitude,pos.coords.longitude); }, function(){ var d=window.coupleData(); if(d.location) send(d.location.lat,d.location.lng); else send(31.2304,121.4737); }, {enableHighAccuracy:true,timeout:8000});
    } else { var d=window.coupleData(); if(d.location) send(d.location.lat,d.location.lng); else send(31.2304,121.4737); }
  };
  window.coupleTransferForm=function(type){
    if(typeof closeDrawers==='function') closeDrawers();
    var c=contacts[currentContact]; if(!c){ showToast('请先打开和 TA 的聊天', 1500); return; }
    if(c.isGroup && type==='family'){ showToast('群聊不能发亲属卡', 1500); return; }
    var ov=window.coupleModalEl();
    ov.classList.add('active'); ov.style.background='rgba(0,0,0,0.4)'; ov.style.zIndex='220'; ov.style.display='flex'; ov.style.flexDirection='column'; ov.style.justifyContent='flex-end'; ov.style.alignItems='stretch';
    ov.innerHTML='<div style="background:#fff;border-radius:18px 18px 0 0;padding:16px;">'+
      '<div style="font-size:15px;font-weight:700;margin-bottom:10px;">'+(type==='family'?'亲属卡（自定义额度）':'转账（自定义金额）')+'</div>'+
      '<input id="cp-t-amount" placeholder="金额（元）" inputmode="numeric" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:10px;font-size:16px;outline:none;">'+
      (type==='family'?'':'<input id="cp-t-note" placeholder="留言（如 给你买好吃的）" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin-bottom:10px;font-size:13px;outline:none;">')+
      '<div class="big-btn" style="background:#ff2d55;" onclick="coupleTransferSubmit(\''+type+'\')">发送</div>'+
      '<div style="text-align:center;font-size:12px;color:#999;margin-top:8px;cursor:pointer;" onclick="coupleCloseModal()">取消</div>'+
    '</div>';
  };
  window.coupleTransferSubmit=function(type){
    var c=contacts[currentContact]; if(!c) return;
    var amt=parseInt(document.getElementById('cp-t-amount').value); if(isNaN(amt)||amt<=0){ showToast('请输入有效金额', 1500); return; }
    var note=document.getElementById('cp-t-note')?document.getElementById('cp-t-note').value.trim():'';
    window.coupleCloseModal();
    if(typeof userSendCard==='function'){ userSendCard(type, amt, note); }
  };

  /* ===== 红包功能（群聊专用） ===== */
  window.redpacketForm=function(){
    if(typeof closeDrawers==='function') closeDrawers();
    var gc=contacts[currentContact]; if(!gc){ showToast('请先打开群聊',1500); return; }
    if(!gc.isGroup){ showToast('红包功能仅限群聊',1500); return; }
    var members=(gc.members||[]).filter(function(mid){ return contacts[mid]; });
    if(members.length<1){ showToast('群里没有成员',1500); return; }
    var ov=window.coupleModalEl();
    ov.classList.add('active'); ov.style.background='rgba(0,0,0,0.4)'; ov.style.zIndex='220'; ov.style.display='flex'; ov.style.flexDirection='column'; ov.style.justifyContent='flex-end'; ov.style.alignItems='stretch';
    ov.innerHTML='<div style="background:#fff;border-radius:18px 18px 0 0;padding:16px;">'+
      '<div style="font-size:15px;font-weight:700;margin-bottom:10px;">\u02f6&gt;\u15dC&lt;\u02f6 \u53d1\u7ea2\u5305</div>'+
      '<input id="cp-rp-amount" placeholder="\u603b\u91d1\u989d\uff08\u5143\uff09" inputmode="numeric" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:10px;font-size:16px;outline:none;">'+
      '<input id="cp-rp-count" placeholder="\u7ea2\u5305\u4e2a\u6570\uff08\u4efd\uff09" inputmode="numeric" style="width:100%;border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:10px;font-size:16px;outline:none;">'+
      '<div style="font-size:12px;color:#888;margin-bottom:10px;">\u7fa4\u6210\u5458\u53ef\u62a2\u7ea2\u5305\uff0c\u91d1\u989d\u968f\u673a\u5206\u914d</div>'+
      '<div class="big-btn" style="background:#ff2d55;" onclick="redpacketSubmit()">\u53d1\u7ea2\u5305 \u25b8</div>'+
      '<div style="text-align:center;font-size:12px;color:#999;margin-top:8px;cursor:pointer;" onclick="coupleCloseModal()">\u53d6\u6d88</div>'+
    '</div>';
  };
  window.redpacketSubmit=function(){
    var gc=contacts[currentContact]; if(!gc||!gc.isGroup) return;
    var amt=parseFloat(document.getElementById('cp-rp-amount').value);
    var cnt=parseInt(document.getElementById('cp-rp-count').value);
    if(isNaN(amt)||amt<=0){ showToast('\u8bf7\u8f93\u5165\u6709\u6548\u91d1\u989d',1500); return; }
    if(isNaN(cnt)||cnt<=0){ showToast('\u8bf7\u8f93\u5165\u6709\u6548\u4efd\u6570',1500); return; }
    var members=(gc.members||[]).filter(function(mid){ return contacts[mid] && !contacts[mid].blocked; });
    if(cnt>members.length){ showToast('\u4efd\u6570\u4e0d\u80fd\u8d85\u8fc7\u7fa4\u6210\u5458\u6570\uff08'+members.length+'\uff09',1800); return; }
    window.coupleCloseModal();
    var id=(typeof cardIdSeq!=='undefined')?cardIdSeq++:Date.now();
    var amounts=redpacketSplit(amt, cnt);
    gc.seed.push({kind:'card', id:id, cardType:'redpacket', mine:true, amount:amt, count:cnt, amounts:amounts, grabbed:[], status:'pending', from:'me', ts:nowStamp()});
    if(typeof addWalletTx==='function') addWalletTx('\u7fa4\u7ea2\u5305 \u00b7 '+gc.name, -amt);
    saveChatThread(currentContact);
    if(typeof renderThread==='function') renderThread();
    if(typeof renderChatList==='function') renderChatList();
    // 群成员逐个抢红包（延迟模拟）
    var delay=1500;
    var available=members.slice();
    for(var i=0;i<cnt && available.length>0;i++){
      var idx=Math.floor(Math.random()*available.length);
      var mid=available.splice(idx,1)[0];
      (function(memberId, grabAmount, cardId){
        setTimeout(function(){
          var card=gc.seed.find(function(x){return x.id===cardId;});
          if(!card || card.status==='done') return;
          card.grabbed.push({memberId:memberId, amount:grabAmount, ts:nowStamp()});
          if(card.grabbed.length>=card.count) card.status='done';
          saveChatThread(currentContact);
          if(typeof renderThread==='function') renderThread();
          if(typeof renderChatList==='function') renderChatList();
          var mc=contacts[memberId];
          if(mc && !mc.blocked){
            setTimeout(function(){
              realAISpeak(mc, memberId, '\uff08\u4f60\u521a\u521a\u62a2\u5230\u4e86\u7ea2\u5305\uff01\u91d1\u989d\u662f'+grabAmount.toFixed(2)+'\u5143\u3002\u8bf7\u75281\u53e5\u4e2d\u6587\u81ea\u7136\u5730\u56de\u5e94\uff0c\u8868\u8fbe\u5f00\u5fc3\u6216\u611f\u8c22\uff0c\u4e0d\u8981\u52a0\u540d\u5b57\u524d\u7f00\uff09', gc);
            }, 500+Math.floor(Math.random()*1500));
          }
        }, delay);
      })(mid, amounts[i], id);
      delay += 1500 + Math.floor(Math.random()*2000);
    }
  };
  window.redpacketSplit=function(totalAmount, count){
    var total=Math.round(totalAmount*100);
    var parts=[]; var remain=total;
    for(var i=0;i<count-1;i++){
      var max=Math.floor(remain/(count-i)*2);
      var part=Math.max(1, Math.floor(Math.random()*(max||1)));
      parts.push(part/100); remain-=part;
    }
    parts.push(remain/100);
    for(var i=parts.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=parts[i]; parts[i]=parts[j]; parts[j]=t; }
    return parts;
  };
  window.couplePaintCoupleIcons=function(){
    if(!document.querySelectorAll) return;
    var els=document.querySelectorAll('.cp-ico');
    els.forEach(function(el){
      var mod=el.getAttribute('data-mod'); var url=(coupleState.icons&&coupleState.icons[mod])||'';
      if(url){ el.innerHTML='<img src="'+url+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">'; }
      else { var ch={checkin:'查',location:'位',diary:'记',notes:'备',shop:'购',food:'外',contacts:'联'}[mod]||'?'; el.innerHTML='<span style="font-size:16px;font-weight:700;color:#fff;">'+ch+'</span>'; }
    });
  };
  window.coupleIcons=function(){
    var mods=[['checkin','查岗'],['location','实时位置'],['diary','我的日记'],['notes','我的备忘录'],['shop','我的购物车'],['food','给对方点外卖'],['contacts','管理联系人']];
    var html='<div style="font-size:13px;font-weight:700;margin-bottom:8px;">自定义图标（上传照片，圆形显示）</div>';
    html+='<div style="font-size:11px;color:#888;margin-bottom:12px;">给每个模块选一张照片当图标；不传则用文字占位。图标只存在本机。</div>';
    mods.forEach(function(m){
      var url=(coupleState.icons&&coupleState.icons[m[0]])||'';
      html+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">'+
        '<div style="width:54px;height:54px;border-radius:50%;background:#eee;overflow:hidden;flex:none;">'+(url?'<img src="'+url+'" style="width:100%;height:100%;object-fit:cover;">':'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:18px;font-weight:700;">'+m[1].charAt(0)+'</div>')+'</div>'+
        '<div style="flex:1;font-size:13px;font-weight:600;">'+m[1]+'</div>'+
        '<label style="padding:8px 12px;border:1px solid #ddd;border-radius:10px;font-size:12px;cursor:pointer;color:#007aff;">上传<input type="file" accept="image/*" style="display:none;" onchange="coupleIconUpload(\''+m[0]+'\',event)"></label>'+
        (url?'<div onclick="coupleIconClear(\''+m[0]+'\')" style="font-size:12px;color:#c00;cursor:pointer;">清除</div>':'')+
      '</div>';
    });
    coupleShowSub('自定义图标', html);
  };
  window.coupleIconUpload=function(mod,e){ var f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return; compressImage(f, 256, 0.85, function(res){ if(!res) return; if(!coupleState.icons) coupleState.icons={}; coupleState.icons[mod]=res; window.saveCoupleState(); window.couplePaintCoupleIcons(); window.coupleIcons(); }); };
  window.coupleIconClear=function(mod){ if(coupleState.icons) delete coupleState.icons[mod]; window.saveCoupleState(); window.couplePaintCoupleIcons(); window.coupleIcons(); };

  /* 注入脉冲动画 + 启动时画上情侣空间图标（脚本在 body 末尾，DOM 已就绪） */
  (function(){ var s=document.getElementById('cp-style'); if(!s){ s=document.createElement('style'); s.id='cp-style'; s.textContent='@keyframes tatp{0%{opacity:1}50%{opacity:0.2}100%{opacity:1}}'; (document.head||document.body).appendChild(s); } })();
  if(document.querySelectorAll && document.querySelectorAll('.cp-ico').length){ window.couplePaintCoupleIcons(); }
  try{ window.coupleTaAutoInit(); }catch(e){}
})();

