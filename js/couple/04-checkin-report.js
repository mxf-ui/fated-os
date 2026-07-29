/* Couple Space check-in reports */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
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
})();
