/* Couple Space chat plus-menu actions */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
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
})();
