/* Couple Space shopping cart and food ordering */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
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
})();
