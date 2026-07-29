/* ---- E-commerce Live ---- */
function goRenderEcommerce(){
  var s = goState;
  return '<div class="go-card">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
    '<div class="go-label" style="margin:0;" id="go-order-label">\u8ba2\u5355 '+s.orders+'/15</div>'+
    '<div class="go-label" style="margin:0;">\u4ea7\u54c1 '+s.products.length+'</div></div>'+
    '<div class="go-progress"><div class="go-progress-bar" id="go-order-bar" style="width:'+(s.orders/15*100)+'%"></div></div>'+
    '</div>'+
    '<div class="go-card"><div class="go-label">\u5c0f\u9ec4\u8f66</div><div id="go-product-display"></div><button class="go-btn sm ghost" style="margin-top:8px;" onclick="goOpenCart()">\u7ba1\u7406\u4ea7\u54c1</button></div>'+
    '<div class="go-card"><div class="go-label">\u8bed\u97f3\u8bb2\u89e3</div><div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:10px;">\u70b9\u51fb\u6309\u94ae\u5f00\u59cb\u8bb2\u89e3\u4ea7\u54c1\uff0c\u7cfb\u7edf\u4f1a\u8bc4\u4f30\u8bb2\u89e3\u5e76\u89e6\u53d1\u89c2\u4f17\u4e0b\u5355\u3002</div>'+
    '<button class="go-btn primary" id="go-pitch-btn" onclick="goVoiceInput(\'ecommerce\')">\u5f00\u59cb\u8bed\u97f3\u8bb2\u89e3</button><div id="go-pitch-feedback" style="margin-top:10px;"></div></div>';
}
function goOpenCart(){ goRenderProductList(); goOpenModal('go-modal-cart'); }
function goRenderProductList(){
  var s = goState, list = document.getElementById('go-product-list');
  if(!list) return;
  if(s.products.length === 0){ list.innerHTML = '<div style="text-align:center;color:#888;font-size:13px;padding:12px;">\u6682\u65e0\u4ea7\u54c1\uff0c\u6dfb\u52a0\u4f60\u7684\u5e26\u8d27\u4ea7\u54c1</div>'; return; }
  list.innerHTML = s.products.map(function(p,i){
    var imgSt = p.img ? 'background-image:url('+p.img+')' : 'background:#f0f0f0';
    return '<div class="go-product-row"><div class="img" style="'+imgSt+'"></div><div class="info"><div class="n">'+esc(p.name)+'</div><div class="p">\u00a5'+esc(p.price)+'</div></div><button class="go-btn sm ghost" onclick="goRemoveProduct('+i+')">\u5220\u9664</button></div>';
  }).join('');
}
function goAddProduct(){
  var name = (document.getElementById('go-prod-name').value || '').trim();
  var price = (document.getElementById('go-prod-price').value || '').trim();
  if(!name){ goToast('\u8bf7\u8f93\u5165\u4ea7\u54c1\u540d\u79f0'); return; }
  if(!price){ goToast('\u8bf7\u8f93\u5165\u4ef7\u683c'); return; }
  goState.products.push({name:name, price:price, img:goProductImg});
  goProductImg = '';
  document.getElementById('go-prod-name').value = '';
  document.getElementById('go-prod-price').value = '';
  goToast('\u4ea7\u54c1\u5df2\u6dfb\u52a0');
  goRenderProductList();
  goUpdateProductDisplay();
  saveState();
}
function goRemoveProduct(idx){ goState.products.splice(idx,1); goRenderProductList(); goUpdateProductDisplay(); saveState(); }
function goUpdateProductDisplay(){
  var s = goState, d = document.getElementById('go-product-display');
  if(!d) return;
  if(s.products.length === 0){ d.innerHTML = '<div style="font-size:13px;color:#888;">\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u6dfb\u52a0\u4ea7\u54c1</div>'; return; }
  d.innerHTML = s.products.map(function(p){
    var imgSt = p.img ? 'background-image:url('+p.img+')' : 'background:#f0f0f0';
    return '<div class="go-product-row"><div class="img" style="'+imgSt+'"></div><div class="info"><div class="n">'+esc(p.name)+'</div><div class="p">\u00a5'+esc(p.price)+'</div></div></div>';
  }).join('');
}
function goUploadProductImg(){ goFileContext='product'; var fi=document.getElementById('go-file-input'); if(fi) fi.click(); }
function goCheckPitch(text){
  var s = goState;
  goToast('\u6b63\u5728\u8bc4\u4f30\u4f60\u7684\u8bb2\u89e3...');
  var prodInfo = s.products.length > 0 ? '\u4e3b\u64ad\u5728\u5356: '+s.products.map(function(p){return p.name+'(\u00a5'+p.price+')';}).join(', ') : '\u4e3b\u64ad\u8fd8\u6ca1\u6709\u4e0a\u67b6\u4ea7\u54c1';
  goCallAI('\u4e00\u4e2a\u5e26\u8d27\u4e3b\u64ad\u6b63\u5728\u8bb2\u89e3\u4ea7\u54c1\uff0c\u8bdd\u672f\u662f:"'+text+'"\u3002'+prodInfo+'\u3002\n\u8bf7\u8bc4\u5206 1-10\uff0c\u683c\u5f0f:\u5206\u6570|\u7b80\u77ed\u53cd\u9988\u3002', '\u4f60\u662f\u76f4\u64ad\u5e73\u53f0\u7684\u5185\u5bb9\u8bc4\u4f30\u5458\u3002', function(result){
    if(!result){ var sc = Math.floor(Math.random()*4+6); goToast('\u8bb2\u89e3\u8bc4\u5206: '+sc+'/10'); if(sc>=6) goTriggerOrders(); return; }
    var parts = result.split('|');
    var score = parseInt((parts[0]||'').replace(/[^0-9]/g,''),10) || 7;
    var fb = (parts[1] || '\u8bb2\u89e3\u4e0d\u9519').trim();
    goToast('\u8bc4\u5206 '+score+'/10 '+fb);
    var pf = document.getElementById('go-pitch-feedback');
    if(pf) pf.innerHTML = '<div class="go-card soft" style="padding:10px 14px;"><div style="font-size:13px;color:#555;">'+esc(fb)+'</div></div>';
    if(score >= 6) goTriggerOrders();
  });
}
function goTriggerOrders(){
  var s = goState;
  if(s.products.length === 0){ goToast('\u8bf7\u5148\u6dfb\u52a0\u4ea7\u54c1\u5230\u5c0f\u9ec4\u8f66'); return; }
  var count = Math.floor(Math.random()*3+1);
  for(var i=0;i<count;i++){
    (function(idx){ setTimeout(function(){
      if(!goState.isLive) return;
      goState.orders++;
      var prod = goState.products[Math.floor(Math.random()*goState.products.length)];
      goToast(prod.name+' \u88ab\u4e0b\u5355 ('+goState.orders+'/15)');
      var ol = document.getElementById('go-order-label'); if(ol) ol.textContent = '\u8ba2\u5355 '+goState.orders+'/15';
      var ob = document.getElementById('go-order-bar'); if(ob) ob.style.width = (goState.orders/15*100)+'%';
      saveState();
      if(goState.orders >= 15) goEndLive(true,1000);
    }, idx*1200); })(i);
  }
}
