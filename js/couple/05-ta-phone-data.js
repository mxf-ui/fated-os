/* Couple Space TA phone data and takeover */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
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
})();
