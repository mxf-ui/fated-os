/* ---- E-commerce Live ---- */
function goProductImgStyle(img){ return img ? 'background-image:url('+img+')' : 'background:linear-gradient(135deg,#edf8f1,#c9efd9)'; }
function goProductPriceLabel(price){ return '\u00a5' + esc(String(price || '0')); }
function goGetProductById(id){
  goEnsureProductIds();
  return goState.products.find(function(p){ return p.id === id; }) || null;
}
function goEnsureActiveProduct(){
  goEnsureProductIds();
  if(!goState.products.length){ goState.currentProductId = ''; return null; }
  var active = goGetProductById(goState.currentProductId);
  if(!active){ active = goState.products[0]; goState.currentProductId = active.id; }
  return active;
}
function goRenderEcommerce(){
  var s = goState;
  var active = goEnsureActiveProduct();
  return '<div class="go-card">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
    '<div class="go-label" style="margin:0;" id="go-order-label">\u8ba2\u5355 '+s.orders+'/15</div>'+
    '<div class="go-label" style="margin:0;">\u4ea7\u54c1 '+s.products.length+'</div></div>'+
    '<div class="go-progress"><div class="go-progress-bar" id="go-order-bar" style="width:'+(s.orders/15*100)+'%"></div></div>'+
    '</div>'+
    '<div class="go-card"><div class="go-label">\u5c0f\u9ec4\u8f66</div><div id="go-product-display"></div><button class="go-btn sm ghost" style="margin-top:8px;" onclick="goOpenCart()">\u7ba1\u7406\u4ea7\u54c1</button></div>'+
    '<div class="go-card"><div class="go-label">\u8bed\u97f3\u8bb2\u89e3</div><div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:10px;">'+(active?'\u5f53\u524d\u8bb2\u89e3\uff1a'+esc(active.name)+' \u00b7 '+goProductPriceLabel(active.price):'\u5148\u6dfb\u52a0\u4ea7\u54c1\uff0c\u518d\u5f00\u59cb\u8bb2\u89e3')+'</div>'+
    '<button class="go-btn primary" id="go-pitch-btn" onclick="goVoiceInput(\'ecommerce\')">\u5f00\u59cb\u8bed\u97f3\u8bb2\u89e3</button><div id="go-pitch-feedback" style="margin-top:10px;"></div></div>';
}
function goRenderProductShelf(){
  if(goState.liveType !== 'ecommerce') return '';
  goEnsureProductIds();
  if(!goState.products.length){
    return '<div class="go-product-shelf empty"><button class="go-btn sm primary" onclick="goOpenCart()">\u6dfb\u52a0\u5e26\u8d27\u4ea7\u54c1</button></div>';
  }
  return '<div class="go-product-shelf">'+goState.products.map(function(p){
    var active = p.id === goState.currentProductId ? ' active' : '';
    return '<div class="go-product-shelf-card'+active+'" onclick="goSelectProduct(\''+p.id+'\')"><div class="pic" style="'+goProductImgStyle(p.img)+'"></div><div class="meta"><b>'+esc(p.name)+'</b><small>'+goProductPriceLabel(p.price)+'</small></div><button class="talk" onclick="event.stopPropagation();goSelectProduct(\''+p.id+'\')">\u8bb2\u89e3</button><button class="share" onclick="event.stopPropagation();goOpenProductSharePicker(\''+p.id+'\')">WeChat</button></div>';
  }).join('')+'</div>';
}
function goRenderTalkingProductBadge(){
  if(!goState || goState.liveType !== 'ecommerce') return '';
  var p = goEnsureActiveProduct();
  if(!p) return '';
  return '<div class="go-live-product-badge"><div class="pic" style="'+goProductImgStyle(p.img)+'"></div><div><small>\u6b63\u5728\u8bb2\u89e3</small><b>'+esc(p.name)+'</b><span>'+goProductPriceLabel(p.price)+'</span></div></div>';
}
function goOpenCart(){ goEnsureProductIds(); goRenderProductList(); goOpenModal('go-modal-cart'); }
function goRenderProductList(){
  var s = goState, list = document.getElementById('go-product-list');
  if(!list) return;
  goEnsureProductIds();
  if(s.products.length === 0){ list.innerHTML = '<div style="text-align:center;color:#888;font-size:13px;padding:12px;">\u6682\u65e0\u4ea7\u54c1\uff0c\u6dfb\u52a0\u4f60\u7684\u5e26\u8d27\u4ea7\u54c1</div>'; return; }
  list.innerHTML = s.products.map(function(p,i){
    var active = p.id === s.currentProductId ? ' active' : '';
    return '<div class="go-product-row'+active+'"><div class="img" style="'+goProductImgStyle(p.img)+'"></div><div class="info"><div class="n">'+esc(p.name)+'</div><div class="p">'+goProductPriceLabel(p.price)+'</div></div><div class="go-product-actions"><button class="go-btn sm ghost" onclick="goSelectProduct(\''+p.id+'\')">\u8bb2\u89e3</button><button class="go-btn sm ghost" onclick="goOpenProductSharePicker(\''+p.id+'\')">WeChat</button><button class="go-btn sm ghost" onclick="goRemoveProduct('+i+')">\u5220\u9664</button></div></div>';
  }).join('');
}
function goAddProduct(){
  var name = (document.getElementById('go-prod-name').value || '').trim();
  var price = (document.getElementById('go-prod-price').value || '').trim();
  if(!name){ goToast('\u8bf7\u8f93\u5165\u4ea7\u54c1\u540d\u79f0'); return; }
  if(!price){ goToast('\u8bf7\u8f93\u5165\u4ef7\u683c'); return; }
  var p = {id:goNewProductId(), name:name, price:price, img:goProductImg};
  goState.products.push(p);
  goState.currentProductId = p.id;
  goProductImg = '';
  document.getElementById('go-prod-name').value = '';
  document.getElementById('go-prod-price').value = '';
  goToast('\u4ea7\u54c1\u5df2\u6dfb\u52a0\uff0c\u5df2\u8bbe\u4e3a\u5f53\u524d\u8bb2\u89e3');
  goRenderProductList();
  goUpdateProductDisplay();
  if(goState.isLive) goRenderLive();
  saveState();
}
function goRemoveProduct(idx){
  var removed = goState.products[idx];
  goState.products.splice(idx,1);
  if(removed && removed.id === goState.currentProductId) goState.currentProductId = '';
  goEnsureActiveProduct();
  goRenderProductList();
  goUpdateProductDisplay();
  if(goState.isLive) goRenderLive();
  saveState();
}
function goSelectProduct(id){
  var p = goGetProductById(id);
  if(!p){ goToast('\u4ea7\u54c1\u4e0d\u5b58\u5728'); return; }
  goState.currentProductId = p.id;
  goToast('\u6b63\u5728\u8bb2\u89e3\uff1a'+p.name);
  goRenderProductList();
  goUpdateProductDisplay();
  if(goState.isLive) goRenderLive();
  saveState();
}
function goUpdateProductDisplay(){
  var s = goState, d = document.getElementById('go-product-display');
  if(!d) return;
  goEnsureProductIds();
  if(s.products.length === 0){ d.innerHTML = '<div style="font-size:13px;color:#888;">\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u6dfb\u52a0\u4ea7\u54c1</div>'; return; }
  d.innerHTML = s.products.map(function(p){
    var active = p.id === s.currentProductId ? ' active' : '';
    return '<div class="go-product-row'+active+'" onclick="goSelectProduct(\''+p.id+'\')"><div class="img" style="'+goProductImgStyle(p.img)+'"></div><div class="info"><div class="n">'+esc(p.name)+'</div><div class="p">'+goProductPriceLabel(p.price)+'</div></div><button class="go-btn sm ghost" onclick="event.stopPropagation();goOpenProductSharePicker(\''+p.id+'\')">WeChat</button></div>';
  }).join('');
}
function goUploadProductImg(){ goFileContext='product'; var fi=document.getElementById('go-file-input'); if(fi) fi.click(); }
function goEvaluatePitchFallback(text, product){
  var t = String(text || '').toLowerCase();
  var name = String(product && product.name || '').toLowerCase();
  var hit = name && t.indexOf(name) !== -1;
  var words = ['\u4e0b\u5355','\u62cd','\u4e70','\u5238','\u798f\u5229','\u9650\u65f6','\u4f18\u60e0','\u6027\u4ef7\u6bd4','\u597d\u7528','\u63a8\u8350'];
  var score = hit ? 7 : 5;
  words.forEach(function(w){ if(t.indexOf(w) !== -1) score++; });
  if(t.length > 45) score++;
  if(score > 10) score = 10;
  return {score:score, shouldOrder:score >= 7, feedback:score >= 7 ? '\u8bb2\u89e3\u6709\u5356\u70b9\uff0c\u89c2\u4f17\u6709\u4e0b\u5355\u610f\u613f' : '\u5356\u70b9\u4e0d\u591f\u660e\u786e\uff0c\u53ef\u4ee5\u5148\u5206\u4eab\u7ed9 WeChat \u597d\u53cb\u79cd\u8349'};
}
function goParsePitchResult(result, text, product){
  if(!result) return goEvaluatePitchFallback(text, product);
  var parts = result.split('|');
  var score = parseInt((parts[0]||'').replace(/[^0-9]/g,''),10) || 6;
  var decision = (parts[1] || '').toLowerCase();
  var fb = (parts[2] || parts[1] || '\u8bb2\u89e3\u5df2\u5b8c\u6210').trim();
  return {score:score, shouldOrder:/yes|true|buy|order|\u4e0b\u5355|\u4f1a\u4e70/.test(decision) || score >= 7, feedback:fb};
}
function goCheckPitch(text){
  var s = goState;
  var active = goEnsureActiveProduct();
  if(!active){ goToast('\u8bf7\u5148\u6dfb\u52a0\u4ea7\u54c1\u5230\u5c0f\u9ec4\u8f66'); return; }
  goToast('\u6b63\u5728\u8bc4\u4f30\u4f60\u5bf9\u300c'+active.name+'\u300d\u7684\u8bb2\u89e3...');
  var prodInfo = '\u4e3b\u64ad\u6b63\u5728\u8bb2\u89e3: '+active.name+'(\u00a5'+active.price+')';
  goCallAI('\u5e26\u8d27\u4e3b\u64ad\u6b63\u5728\u8bb2\u89e3\u4ea7\u54c1\uff0c\u8bdd\u672f\u662f:"'+text+'"\u3002'+prodInfo+'\u3002\n\u8bf7\u5224\u65ad\u89c2\u4f17\u662f\u5426\u4f1a\u4e0b\u5355\uff0c\u8f93\u51fa\u683c\u5f0f:\u5206\u6570|yes/no|\u7b80\u77ed\u53cd\u9988\u3002', '\u4f60\u662f\u76f4\u64ad\u5e73\u53f0\u7684\u4e0b\u5355\u8f6c\u5316\u8bc4\u4f30\u5458\uff0c\u53ea\u8fd4\u56de\u6307\u5b9a\u683c\u5f0f\u3002', function(result){
    var judged = goParsePitchResult(result, text, active);
    goToast('\u8bc4\u5206 '+judged.score+'/10 '+judged.feedback);
    var pf = document.getElementById('go-pitch-feedback');
    if(pf) pf.innerHTML = '<div class="go-card soft go-pitch-result" style="padding:10px 14px;"><div style="font-size:13px;color:#555;line-height:1.5;">'+esc(judged.feedback)+'</div>'+(!judged.shouldOrder?'<button class="go-btn sm primary" style="margin-top:10px;" onclick="goOpenProductSharePicker(\''+active.id+'\')">\u5206\u4eab\u7ed9 WeChat \u8054\u7cfb\u4eba</button>':'')+'</div>';
    if(judged.shouldOrder) goTriggerOrders(active.id);
    else saveState();
  });
}
function goTriggerOrders(productId, fixedCount){
  var s = goState;
  var prod = goGetProductById(productId) || goEnsureActiveProduct();
  if(!prod){ goToast('\u8bf7\u5148\u6dfb\u52a0\u4ea7\u54c1\u5230\u5c0f\u9ec4\u8f66'); return; }
  goState.currentProductId = prod.id;
  var count = fixedCount || Math.floor(Math.random()*3+1);
  for(var i=0;i<count;i++){
    (function(idx){ setTimeout(function(){
      if(!goState.isLive) return;
      goState.orders++;
      goToast(prod.name+' \u88ab\u4e0b\u5355 ('+goState.orders+'/15)');
      goState.liveEvents = Array.isArray(goState.liveEvents) ? goState.liveEvents : [];
      goState.liveEvents.push({type:'order', productId:prod.id, productName:prod.name, at:Date.now()});
      var ol = document.getElementById('go-order-label'); if(ol) ol.textContent = '\u8ba2\u5355 '+goState.orders+'/15';
      var ob = document.getElementById('go-order-bar'); if(ob) ob.style.width = (goState.orders/15*100)+'%';
      saveState();
      if(goState.orders >= 15) goEndLive(true,1000);
    }, idx*1200); })(i);
  }
}
function goOpenProductSharePicker(productId){
  var p = goGetProductById(productId) || goEnsureActiveProduct();
  if(!p){ goToast('\u8bf7\u5148\u6dfb\u52a0\u4ea7\u54c1'); return; }
  goState.productShareTarget = p.id;
  var list = document.getElementById('go-partner-list');
  if(!list) return;
  var cs = typeof goWechatContactKeys === 'function' ? goWechatContactKeys() : [];
  if(cs.length === 0){ list.innerHTML = '<div style="text-align:center;color:#78a392;padding:12px;">\u6682\u65e0\u53ef\u5206\u4eab\u7684 WeChat \u8054\u7cfb\u4eba</div>'; }
  else {
    list.innerHTML = '<div class="go-share-head"><div class="pic" style="'+goProductImgStyle(p.img)+'"></div><div><b>'+esc(p.name)+'</b><small>'+goProductPriceLabel(p.price)+' \u00b7 \u9009\u62e9\u8054\u7cfb\u4eba\u53d1\u9001\u5361\u7247</small></div></div>' + cs.map(function(k){
      var c = contacts[k];
      return '<div class="go-buyer-row go-partner-row" style="cursor:pointer;" onclick="goShareProductToWeChat(\''+p.id+'\',\''+k+'\')"><div class="av" style="'+goContactAvatarStyle(k)+'"></div><div style="flex:1;"><div style="font-size:14px;font-weight:700;color:#17392d;">'+esc(c.name||'WeChat')+'</div><div style="font-size:11px;color:#78a392;margin-top:2px;">'+esc(c.wxid||k)+' \u00b7 WeChat \u804a\u5929\u5361\u7247</div></div><div class="go-link-dot"></div></div>';
    }).join('');
  }
  goOpenModal('go-modal-partner');
}
function goShareProductToWeChat(productId, contactId){
  var p = goGetProductById(productId);
  if(!p || typeof contacts === 'undefined' || !contacts[contactId]){ goToast('\u5206\u4eab\u5931\u8d25'); return; }
  var c = contacts[contactId];
  c.seed = Array.isArray(c.seed) ? c.seed : [];
  var id = (typeof cardIdSeq !== 'undefined' ? cardIdSeq++ : Date.now());
  c.seed.push({kind:'card', id:id, cardType:'product', mine:true, title:'\u76f4\u64ad\u63a8\u8350', name:p.name, price:p.price, img:p.img || '', note:'\u6211\u6b63\u5728\u76f4\u64ad\u8bb2\u89e3\u8fd9\u4e2a\uff0c\u5feb\u6765\u770b\u770b', status:'pending', from:'me', ts:nowStamp()});
  if(typeof saveChatThread === 'function') saveChatThread(contactId);
  if(typeof renderChatList === 'function') renderChatList();
  if(typeof currentContact !== 'undefined' && currentContact === contactId && typeof renderThread === 'function') renderThread();
  if(typeof notifyIncoming === 'function') notifyIncoming(c, '\u6536\u5230\u76f4\u64ad\u5546\u54c1\u5361\u7247');
  goCloseModal('go-modal-partner');
  goToast('\u5df2\u5206\u4eab\u7ed9 '+(c.name || 'WeChat'));
  setTimeout(function(){
    if(goState.isLive && goGetProductById(productId)){
      var sent = c.seed.find(function(m){ return m.kind === 'card' && m.id === id; });
      if(sent) sent.status = 'done';
      if(typeof saveChatThread === 'function') saveChatThread(contactId);
      if(typeof currentContact !== 'undefined' && currentContact === contactId && typeof renderThread === 'function') renderThread();
      goToast((c.name || 'WeChat')+' \u770b\u4e86\u5361\u7247\u540e\u4e0b\u5355\u4e86');
      goTriggerOrders(productId, 1);
    }
  }, 1800);
  saveState();
}
