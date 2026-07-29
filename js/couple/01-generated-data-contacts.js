/* Couple Space generated data and contact switching */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
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
})();
