/* Couple Space shopping cart and food ordering */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;

  function partnerName(){ var c = contacts[coupleState.partner]; return c ? (c.displayName || c.name) : 'TA'; }
  function moneyValue(price){ return parseInt(String(price || '').replace(/[^0-9]/g,''), 10) || 0; }
  function itemImage(item){
    return item && item.img ? '<img src="'+item.img+'" style="width:52px;height:52px;border-radius:12px;object-fit:cover;flex:none;">' : '<div style="width:52px;height:52px;border-radius:12px;background:#edf7f3;flex:none;display:flex;align-items:center;justify-content:center;color:#8aa099;font-size:10px;">Photo</div>';
  }
  function shopCard(item, i, mode){
    var action = mode === 'mine' ? '<div class="buy-btn" onclick="coupleDelMyShop('+i+')">\u5220\u9664</div>' : '<div class="buy-btn" onclick="coupleBuy('+i+')">\u4e70\u7ed9TA</div>';
    var reason = item.reason ? '<div style="font-size:11px;color:#7b8f89;line-height:1.4;margin-top:3px;">'+esc(item.reason)+'</div>' : '';
    return '<div class="couple-shop-item" style="border-color:#d6eee6;background:#fff;">'+itemImage(item)+'<div class="info"><div class="name">'+esc(item.name || '')+'</div><div class="price">'+esc(item.price || '')+'</div>'+reason+'</div>'+action+'</div>';
  }
  function shopForm(){
    return '<div style="margin-top:12px;padding:12px;border:1px solid #d6eee6;border-radius:12px;background:#fbfffd;"><div style="font-size:12px;font-weight:700;margin-bottom:7px;">\u4e0a\u4f20\u6211\u7684\u8d2d\u7269\u8f66\u7269\u54c1</div><input id="cp-shop-name" placeholder="\u5546\u54c1\u540d" style="width:100%;border:1px solid #d5ece4;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><input id="cp-shop-price" placeholder="\u4ef7\u683c" style="width:100%;border:1px solid #d5ece4;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;"><label style="display:block;padding:10px;border:1px dashed #a9d7c7;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#659283;">+ \u4e0a\u4f20\u56fe\u7247<input type="file" accept="image/*" id="cp-shop-img" style="display:none;" onchange="coupleShopImg(event)"></label><div id="cp-shop-preview" style="margin-bottom:8px;"></div><div class="big-btn" onclick="coupleAddShop()">\u52a0\u5165\u6211\u7684\u8d2d\u7269\u8f66</div></div>';
  }

  window.coupleShop = function(){ window.coupleMyShop(); };

  window.coupleMyShop = function(){
    var d = window.coupleData();
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">\u6211\u7684\u8d2d\u7269\u8f66</div><div style="font-size:11px;color:#7b8f89;margin-bottom:10px;">\u8fd9\u91cc\u7684\u7269\u54c1\u7531\u4f60\u81ea\u5df1\u4e0a\u4f20\uff0c\u4e0d\u4f1a\u6bcf\u5929\u88ab AI \u6539\u5199\u3002</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;"><div class="big-btn" style="flex:1;background:#4fb895;" onclick="coupleMyShop()">\u6211\u7684</div><div class="big-btn" style="flex:1;background:#d8efe7;color:#285044;" onclick="couplePartnerWishlist()">TA \u7684\u6bcf\u65e5\u613f\u671b</div></div>';
    html += d.myShop.length ? d.myShop.map(function(item,i){ return shopCard(item,i,'mine'); }).join('') : '<div style="text-align:center;color:#9aa9a5;font-size:12px;padding:14px;">\u8fd8\u6ca1\u6709\u4e0a\u4f20\u5546\u54c1\u3002</div>';
    html += shopForm();
    coupleShowSub('\u6211\u7684\u8d2d\u7269\u8f66', html);
  };

  window.couplePartnerWishlist = function(){
    var d = window.coupleData();
    window.coupleRefreshPartnerWishlist(false);
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">'+esc(partnerName())+' \u7684\u6bcf\u65e5\u613f\u671b\u6e05\u5355</div><div style="font-size:11px;color:#7b8f89;margin-bottom:10px;">TA \u7684\u6e05\u5355\u6bcf\u5929\u81ea\u52a8\u66f4\u65b0\uff0c\u6839\u636e\u4eba\u8bbe\u3001\u5173\u7cfb\u548c\u8bb0\u5fc6\u751f\u6210\u3002</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;"><div class="big-btn" style="flex:1;background:#d8efe7;color:#285044;" onclick="coupleMyShop()">\u6211\u7684</div><div class="big-btn" style="flex:1;background:#4fb895;" onclick="couplePartnerWishlist()">TA \u7684</div></div>';
    html += (d.partnerWishlist || []).map(function(item,i){ return shopCard(item,i,'partner'); }).join('');
    html += '<div class="big-btn" style="margin-top:10px;background:#eef8f5;color:#285044;" onclick="coupleRefreshPartnerWishlist(true);couplePartnerWishlist();">\u624b\u52a8\u5237\u65b0\u4eca\u65e5\u6e05\u5355</div>';
    coupleShowSub('TA \u7684\u613f\u671b\u6e05\u5355', html);
  };

  window.coupleBuy = function(i){
    var d = window.coupleData(); var item = d.partnerWishlist[i]; if(!item) return;
    var c = contacts[coupleState.partner];
    if(window.addWalletTx) addWalletTx('\u7ed9 '+partnerName()+' \u4e70 ' + item.name, -moneyValue(item.price));
    if(c && c.seed){
      c.seed.push({mine:true, kind:'card', cardType:'order', title:item.name, name:item.name, price:item.price, img:item.img||'', note:item.reason||'', target:'partner', from:'me', ts:nowStamp()});
      c.seed.push({mine:true, kind:'text', text:'[\u613f\u671b\u6e05\u5355] \u6211\u7ed9\u4f60\u4e70\u4e86 '+item.name+' '+item.price, from:'me', ts:nowStamp()});
      saveChatThread(coupleState.partner);
      if(currentContact === coupleState.partner) renderThread();
    }
    showToast('\u5df2\u4e0b\u5355\uff1a' + item.name, 1600);
  };

  window.coupleDelMyShop = function(i){ var d = window.coupleData(); d.myShop.splice(i,1); window.saveCoupleState(); window.coupleMyShop(); };
  window.coupleAddShop = function(){
    var name = document.getElementById('cp-shop-name').value.trim();
    var price = document.getElementById('cp-shop-price').value.trim() || '\u00a599';
    if(!name) return;
    var d = window.coupleData();
    d.myShop.push({id:'my-shop-' + Date.now(), name:name, price:price, img:coupleState._shopImg || '', owner:'self', ts:Date.now()});
    coupleState._shopImg = null;
    window.saveCoupleState();
    window.coupleMyShop();
  };
  window.coupleShopImg = function(e){
    var f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){ coupleState._shopImg=ev.target.result; var pv=document.getElementById('cp-shop-preview'); if(pv) pv.innerHTML='<img src="'+coupleState._shopImg+'" style="max-width:100%;max-height:120px;border-radius:10px;display:block;">'; };
    r.readAsDataURL(f);
  };

  window.coupleFood = function(){
    var d = window.coupleData();
    if(!d._foodTarget) d._foodTarget = 'partner';
    var target = d._foodTarget;
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:4px;">\u70b9\u5916\u5356</div><div style="font-size:11px;color:#7b8f89;margin-bottom:10px;">\u53ef\u4ee5\u7ed9\u81ea\u5df1\u70b9\uff0c\u4e5f\u53ef\u4ee5\u7ed9 '+esc(partnerName())+' \u70b9\u3002</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;"><div class="big-btn" style="flex:1;background:'+(target==='self'?'#4fb895':'#d8efe7')+';color:'+(target==='self'?'#fff':'#285044')+';" onclick="coupleFoodTarget(\'self\')">\u6211\u81ea\u5df1</div><div class="big-btn" style="flex:1;background:'+(target==='partner'?'#4fb895':'#d8efe7')+';color:'+(target==='partner'?'#fff':'#285044')+';" onclick="coupleFoodTarget(\'partner\')">\u7ed9 TA</div></div>';
    html += '<input id="cp-food-name" placeholder="\u9910\u54c1\u540d" style="width:100%;border:1px solid #d5ece4;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
    html += '<input id="cp-food-price" placeholder="\u4ef7\u683c" style="width:100%;border:1px solid #d5ece4;border-radius:10px;padding:10px;margin-bottom:6px;font-size:13px;outline:none;">';
    html += '<label style="display:block;padding:10px;border:1px dashed #a9d7c7;border-radius:10px;text-align:center;cursor:pointer;margin-bottom:8px;font-size:12px;color:#659283;">+ \u4e0a\u4f20\u9910\u54c1\u56fe\u7247<input type="file" accept="image/*" id="cp-food-img" style="display:none;" onchange="coupleFoodImg(event)"></label><div id="cp-food-preview" style="margin-bottom:8px;"></div>';
    html += '<textarea id="cp-food-note" placeholder="\u5907\u6ce8\u6216\u7559\u8a00" style="width:100%;border:1px solid #d5ece4;border-radius:10px;padding:10px;margin-bottom:8px;font-size:13px;outline:none;height:60px;resize:none;"></textarea>';
    html += '<div class="big-btn" onclick="coupleOrderFood()">\u63d0\u4ea4\u8ba2\u5355</div>';
    var rows = target === 'self' ? d.selfFoodOrders : d.partnerFoodOrders;
    if(rows.length){
      html += '<div style="font-size:12px;font-weight:700;margin:12px 0 6px;">\u6700\u8fd1\u8ba2\u5355</div>' + rows.slice(-4).reverse().map(function(o){ return '<div class="couple-shop-item" style="border-color:#d6eee6;">'+itemImage(o)+'<div class="info"><div class="name">'+esc(o.name)+'</div><div class="price">'+esc(o.price)+'</div><div style="font-size:11px;color:#7b8f89;">'+esc(o.note||'')+'</div></div></div>'; }).join('');
    }
    coupleShowSub('\u70b9\u5916\u5356', html);
  };
  window.coupleFoodTarget = function(target){ var d = window.coupleData(); d._foodTarget = target === 'self' ? 'self' : 'partner'; window.saveCoupleState(); window.coupleFood(); };
  window.coupleFoodImg = function(e){
    var f=e&&e.target&&e.target.files&&e.target.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){ coupleState._foodImg=ev.target.result; var pv=document.getElementById('cp-food-preview'); if(pv) pv.innerHTML='<img src="'+coupleState._foodImg+'" style="max-width:100%;max-height:120px;border-radius:10px;display:block;">'; };
    r.readAsDataURL(f);
  };
  window.coupleOrderFood = function(){
    var name=document.getElementById('cp-food-name').value.trim();
    var price=document.getElementById('cp-food-price').value.trim()||'\u00a50';
    var note=document.getElementById('cp-food-note').value.trim();
    if(!name) return;
    var d = window.coupleData(); var target = d._foodTarget === 'self' ? 'self' : 'partner';
    var order = target === 'self'
      ? {id:'food-' + Date.now(), name:name, price:price, note:note, img:coupleState._foodImg||'', target:'self', ts:Date.now()}
      : {id:'food-' + Date.now(), name:name, price:price, note:note, img:coupleState._foodImg||'', target:'partner', ts:Date.now()};
    if(target === 'self') d.selfFoodOrders.push(order); else d.partnerFoodOrders.push(order);
    d.foodOrders.push(order);
    if(target === 'partner'){
      var c=contacts[coupleState.partner];
      if(c&&c.seed){
        c.seed.push({mine:true, kind:'card', cardType:'order', title:name, name:name, price:price, note:note, img:order.img, target:'partner', from:'me', ts:nowStamp()});
        c.seed.push({mine:true, kind:'text', text:'[\u5916\u5356\u8ba2\u5355] '+name+' '+price+(note?(' / '+note):''), from:'me', ts:nowStamp()});
        saveChatThread(coupleState.partner);
        if(currentContact === coupleState.partner) renderThread();
        if(typeof renderChatList === 'function') renderChatList();
      }
    }
    coupleState._foodImg=null;
    window.saveCoupleState();
    showToast('\u8ba2\u5355\u5df2\u4fdd\u5b58', 1600);
    window.coupleFood();
  };
})();
