/* ---- E-commerce Live ---- */
function goRenderEcommerce(){
  var s = goState;
  return '<div class="go-card">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
    '<div class="go-label" style="margin:0;" id="go-order-label">订单 '+s.orders+'/15</div>'+
    '<div class="go-label" style="margin:0;">产品 '+s.products.length+'</div></div>'+
    '<div class="go-progress"><div class="go-progress-bar" id="go-order-bar" style="width:'+(s.orders/15*100)+'%"></div></div>'+
    '</div>'+
    '<div class="go-card">'+
    '<div class="go-label">小黄车</div>'+
    '<div id="go-product-display"></div>'+
    '<button class="go-btn sm ghost" style="margin-top:8px;" onclick="goOpenCart()">管理产品</button>'+
    '</div>'+
    '<div class="go-card">'+
    '<div class="go-label">语音讲解</div>'+
    '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:10px;">点击按钮开始讲解产品，AI会评判你的讲解并触发观众下单</div>'+
    '<button class="go-btn primary" id="go-pitch-btn" onclick="goVoiceInput(\'ecommerce\')">开始语音讲解</button>'+
    '<div id="go-pitch-feedback" style="margin-top:10px;"></div>'+
    '</div>';
}

function goOpenCart(){
  goRenderProductList();
  goOpenModal('go-modal-cart');
}
function goRenderProductList(){
  var s = goState;
  var list = document.getElementById('go-product-list');
  if(!list) return;
  if(s.products.length===0){
    list.innerHTML = '<div style="text-align:center;color:#888;font-size:13px;padding:12px;">暂无产品，添加你的带货产品</div>';
    return;
  }
  list.innerHTML = s.products.map(function(p,i){
    var imgSt = p.img ? 'background-image:url('+p.img+')' : 'background:#f0f0f0';
    return '<div class="go-product-row"><div class="img" style="'+imgSt+'"></div><div class="info"><div class="n">'+p.name+'</div><div class="p">¥'+p.price+'</div></div><button class="go-btn sm ghost" onclick="goRemoveProduct('+i+')">删除</button></div>';
  }).join('');
}
function goAddProduct(){
  var name = (document.getElementById('go-prod-name').value||'').trim();
  var price = (document.getElementById('go-prod-price').value||'').trim();
  if(!name){ goToast('请输入产品名称'); return; }
  if(!price){ goToast('请输入价格'); return; }
  goState.products.push({name:name, price:price, img:goProductImg});
  goProductImg = '';
  document.getElementById('go-prod-name').value = '';
  document.getElementById('go-prod-price').value = '';
  goToast('产品已添加');
  goRenderProductList();
  goUpdateProductDisplay();
  saveState();
}
function goRemoveProduct(idx){
  goState.products.splice(idx,1);
  goRenderProductList();
  goUpdateProductDisplay();
  saveState();
}
function goUpdateProductDisplay(){
  var s = goState;
  var d = document.getElementById('go-product-display');
  if(!d) return;
  if(s.products.length===0){ d.innerHTML = '<div style="font-size:13px;color:#888;">点击下方按钮添加产品</div>'; return; }
  d.innerHTML = s.products.map(function(p){
    var imgSt = p.img ? 'background-image:url('+p.img+')' : 'background:#f0f0f0';
    return '<div class="go-product-row"><div class="img" style="'+imgSt+'"></div><div class="info"><div class="n">'+p.name+'</div><div class="p">¥'+p.price+'</div></div></div>';
  }).join('');
}
function goUploadProductImg(){ goFileContext='product'; document.getElementById('go-file-input').click(); }

function goCheckPitch(text){
  var s = goState;
  goToast('AI正在评判你的讲解...');
  var prodInfo = s.products.length > 0 ? '主播在卖: '+s.products.map(function(p){return p.name+'(¥'+p.price+')';}).join(', ') : '主播还没有上架产品';
  goCallAI(
    '一个带货主播正在讲解产品，他说的话是: "'+text+'"。'+prodInfo+'。\n请评判讲解质量(1-10分)，格式: 分数|简短反馈。例如: 8|讲解很专业，产品卖点清晰。',
    '你是一个直播平台的内容审核AI。',
    function(result){
      if(!result){
        var sc = Math.floor(Math.random()*4+6);
        goToast('讲解评分: '+sc+'/10');
        if(sc>=6) goTriggerOrders();
        return;
      }
      var parts = result.split('|');
      var score = parseInt(parts[0].replace(/[^0-9]/g,''))||7;
      var fb = (parts[1]||'讲解不错').trim();
      goToast('评分 '+score+'/10 '+fb);
      var pf = document.getElementById('go-pitch-feedback');
      if(pf) pf.innerHTML = '<div class="go-card soft" style="padding:10px 14px;"><div style="font-size:13px;color:#555;">'+fb+'</div></div>';
      if(score>=6) goTriggerOrders();
    }
  );
}
function goTriggerOrders(){
  var s = goState;
  if(s.products.length===0){ goToast('请先添加产品到小黄车'); return; }
  var count = Math.floor(Math.random()*3+1);
  for(var i=0;i<count;i++){
    (function(idx){
      setTimeout(function(){
        if(!goState.isLive) return;
        goState.orders++;
        var prod = goState.products[Math.floor(Math.random()*goState.products.length)];
        goToast(prod.name+' 被下单! ('+goState.orders+'/15)');
        var ol = document.getElementById('go-order-label');
        if(ol) ol.textContent = '订单 '+goState.orders+'/15';
        var ob = document.getElementById('go-order-bar');
        if(ob) ob.style.width = (goState.orders/15*100)+'%';
        if(goState.orders>=15){ goEndLive(true,1000); }
      }, idx*1200);
    })(i);
  }
}
