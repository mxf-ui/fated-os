/* Couple Space red packets, icon customization, and startup */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
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
})();
