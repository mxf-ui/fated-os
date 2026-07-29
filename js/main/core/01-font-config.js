/* ============ FONT & COLOR CONFIG ============ */
var fontConfig = { family:'', color:'#1a1a1a', customName:'', customDataUrl:'' };
function applyFontConfig(){
  try{
    var fam = fontConfig.family;
    if(fontConfig.customDataUrl && fontConfig.family==='__custom__'){
      // 自定义上传字体已在 loadState 时注册过；此处仅套用变量
      fam = "'FatedCustomFont', " + getComputedStyle(document.documentElement).getPropertyValue('--app-font');
    }
    document.documentElement.style.setProperty('--app-font', fam || "'Inter','Nunito',-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif");
    document.documentElement.style.setProperty('--app-text-color', fontConfig.color || '#1a1a1a');
    var prev = document.getElementById('cfg-font-preview');
    if(prev) prev.style.color = fontConfig.color || '#1a1a1a';
  }catch(e){}
}
function cfgInitFont(){
  var sel = document.getElementById('cfg-font-family');
  if(sel){
    sel.value = fontConfig.family || '';
    document.getElementById('cfg-font-name').textContent = fontConfig.customName ? ('已加载自定义字体：'+fontConfig.customName) : (fontConfig.family ? '当前：'+fontConfig.family : '当前：系统默认');
  }
  var col = document.getElementById('cfg-font-color');
  if(col) col.value = (fontConfig.color && /^#[0-9a-fA-F]{6}$/.test(fontConfig.color)) ? fontConfig.color : '#1a1a1a';
  cfgFontPreview();
}
function cfgFontPreview(){
  var fam = document.getElementById('cfg-font-family').value;
  var col = document.getElementById('cfg-font-color').value;
  if(fam==='__custom__'){ document.getElementById('cfg-font-upload').click(); }
  else {
    var famCss = fam || "'Inter','Nunito',-apple-system,sans-serif";
    document.documentElement.style.setProperty('--app-font', famCss);
  }
  document.documentElement.style.setProperty('--app-text-color', col);
  var prev = document.getElementById('cfg-font-preview');
  if(prev) prev.style.color = col;
}
function uploadFontFile(e){
  var file = e.target.files[0]; if(!file) return;
  var r = new FileReader();
  r.onload = function(){
    try{
      var ff = new FontFace('FatedCustomFont', 'url('+r.result+')');
      ff.load().then(function(loaded){
        document.fonts.add(loaded);
        fontConfig.family='__custom__';
        fontConfig.customName=file.name;
        fontConfig.customDataUrl=r.result;
        document.documentElement.style.setProperty('--app-font', "'FatedCustomFont', 'Inter',sans-serif");
        document.getElementById('cfg-font-name').textContent='已加载自定义字体：'+file.name;
        document.getElementById('cfg-font-family').value='__custom__';
        var prev=document.getElementById('cfg-font-preview'); if(prev) prev.style.fontFamily="'FatedCustomFont', sans-serif";
        showToast('字体已加载 ✓ 点保存生效', 1800, 'ok');
      }).catch(function(){ showToast('字体加载失败，请换一个 .ttf/.otf 文件', 2600, 'err'); });
    }catch(err){ showToast('当前浏览器不支持上传字体', 2600, 'err'); }
  };
  r.readAsDataURL(file);
}
function cfgSaveFont(){
  if(document.getElementById('cfg-font-family').value!=='__custom__'){
    // 若切换回非自定义，清掉自定义数据
    if(document.getElementById('cfg-font-family').value==='') fontConfig.customDataUrl='';
  }
  fontConfig.color = document.getElementById('cfg-font-color').value || '#1a1a1a';
  applyFontConfig();
  saveState();
  showToast('字体 & 颜色已保存 ✓', 1800, 'ok');
}

