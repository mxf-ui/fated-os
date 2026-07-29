/* Couple Space diary, notes, and location */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
  /* 我的日记（可写可删，按对象分库） */
  window.coupleViewDiary = function(){
    var d = window.coupleData();
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">我的日记 · '+(contacts[coupleState.partner]?contacts[coupleState.partner].name:'')+'</div>';
    html += '<textarea id="cp-diary-text" placeholder="今天想记点什么…" style="width:100%;height:90px;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;outline:none;resize:none;"></textarea>';
    html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleAddDiary()">写一笔</div>';
    html += '<div id="cp-diary-list" style="margin-top:12px;"></div>';
    coupleShowSub('我的日记', html); window.renderDiaryList();
  };
  window.renderDiaryList = function(){
    var box=document.getElementById('cp-diary-list'); if(!box) return; var d=window.coupleData();
    if(!d.diary.length){ box.innerHTML='<div style="text-align:center;color:#aaa;font-size:12px;padding:16px;">还没有日记，写下第一笔吧 ᐟ</div>'; return; }
    box.innerHTML = d.diary.slice().reverse().map(function(e,i){ var ri=d.diary.length-1-i;
      return '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><div style="font-size:11px;color:#aaa;">'+esc(e.date)+'</div><div onclick="coupleDelDiary('+ri+')" style="font-size:11px;color:#c00;cursor:pointer;">删除</div></div><div style="font-size:13px;color:#333;margin-top:4px;white-space:pre-wrap;">'+esc(e.text)+'</div></div>';
    }).join('');
  };
  window.coupleAddDiary = function(){
    var t=document.getElementById('cp-diary-text'); if(!t) return; var v=t.value.trim(); if(!v) return; var d=window.coupleData();
    d.diary.push({date: ymdKey(new Date()), text:v}); window.saveCoupleState(); t.value=''; window.renderDiaryList();
  };
  window.coupleDelDiary = function(i){ var d=window.coupleData(); d.diary.splice(i,1); window.saveCoupleState(); window.renderDiaryList(); };

  /* 我的备忘录 */
  window.coupleViewNotes = function(){
    var d=window.coupleData();
    var html='<div style="font-size:13px;font-weight:700;margin-bottom:8px;">我的备忘录</div>';
    html+='<textarea id="cp-note-text" placeholder="记点事…" style="width:100%;height:80px;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:13px;outline:none;resize:none;"></textarea>';
    html+='<div class="big-btn" style="margin-top:8px;" onclick="coupleAddNote()">添加</div>';
    html+='<div id="cp-note-list" style="margin-top:12px;"></div>';
    coupleShowSub('我的备忘录', html); window.renderNoteList();
  };
  window.renderNoteList = function(){
    var box=document.getElementById('cp-note-list'); if(!box) return; var d=window.coupleData();
    if(!d.notes.length){ box.innerHTML='<div style="text-align:center;color:#aaa;font-size:12px;padding:16px;">还没有备忘录。</div>'; return; }
    box.innerHTML=d.notes.slice().reverse().map(function(e,i){ var ri=d.notes.length-1-i;
      return '<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><div style="font-size:11px;color:#aaa;">'+esc(e.date)+'</div><div onclick="coupleDelNote('+ri+')" style="font-size:11px;color:#c00;cursor:pointer;">删除</div></div><div style="font-size:13px;color:#333;margin-top:4px;white-space:pre-wrap;">'+esc(e.text)+'</div></div>';
    }).join('');
  };
  window.coupleAddNote = function(){
    var t=document.getElementById('cp-note-text'); if(!t) return; var v=t.value.trim(); if(!v) return; var d=window.coupleData();
    d.notes.push({date: ymdKey(new Date()), text:v}); window.saveCoupleState(); t.value=''; window.renderNoteList();
  };
  window.coupleDelNote = function(i){ var d=window.coupleData(); d.notes.splice(i,1); window.saveCoupleState(); window.renderNoteList(); };

  /* 实时位置（获取定位权限 + 手动兜底） */
  window.coupleLocation = function(){
    var html='<div style="text-align:center;padding:10px 4px;"><div style="font-size:14px;font-weight:700;margin-bottom:8px;">实时位置</div>';
    html+='<div id="cp-loc-status" style="font-size:12px;color:#888;margin-bottom:10px;">点击下方按钮获取你的位置（需授予定位权限）。</div>';
    html+='<div id="cp-loc-map" style="margin-bottom:10px;"></div>';
    html+='<div class="big-btn" onclick="coupleGetLoc()">获取我的位置</div>';
    html+='<div id="cp-loc-actions" style="margin-top:8px;"></div>';
    html+='<div style="font-size:11px;color:#aaa;margin-top:10px;">位置仅保存在本机，可手动「分享给 TA」。部署在 https 下才能调用系统定位；本地 file:// 时浏览器会拒绝，可用手动输入。</div></div>';
    coupleShowSub('实时位置', html);
    var d=window.coupleData(); if(d.location) window.renderLocationView(d.location.lat, d.location.lng);
  };
  window.coupleGetLoc = function(){
    var st=document.getElementById('cp-loc-status'); if(!navigator.geolocation){ window.coupleManualLoc(); return; }
    st.textContent='正在请求定位权限…';
    navigator.geolocation.getCurrentPosition(function(pos){ var la=pos.coords.latitude, ln=pos.coords.longitude, ac=pos.coords.accuracy; st.textContent='定位成功（精度约 '+Math.round(ac)+' 米）'; window.coupleSetLoc(la,ln); },
      function(err){ st.textContent='定位失败：'+(err&&err.message?err.message:'已拒绝')+'。可手动输入。'; window.coupleManualLoc(); }, {enableHighAccuracy:true,timeout:10000,maximumAge:0});
  };
  window.coupleManualLoc = function(){
    var st=document.getElementById('cp-loc-status'); if(!st) return;
    st.innerHTML='手动输入经纬度：<br><input id="cp-lat" placeholder="纬度 lat" style="width:46%;border:1px solid #ddd;border-radius:8px;padding:8px;margin:6px 2% 0 0;font-size:12px;outline:none;"><input id="cp-lng" placeholder="经度 lng" style="width:46%;border:1px solid #ddd;border-radius:8px;padding:8px;margin:6px 0 0 0;font-size:12px;outline:none;"><div class="big-btn" style="margin-top:8px;" onclick="coupleSetManual()">使用此位置</div>';
  };
  window.coupleSetManual = function(){
    var la=parseFloat(document.getElementById('cp-lat').value), ln=parseFloat(document.getElementById('cp-lng').value);
    if(isNaN(la)||isNaN(ln)){ alert('请输入有效经纬度'); return; }
    var st=document.getElementById('cp-loc-status'); if(st) st.textContent='已手动设置位置'; window.coupleSetLoc(la,ln);
  };
  window.coupleSetLoc = function(lat,lng){ var d=window.coupleData(); d.location={lat:lat,lng:lng,ts:Date.now()}; window.saveCoupleState(); window.renderLocationView(lat,lng); };
  window.renderLocationView = function(lat,lng){
    var mb=document.getElementById('cp-loc-map'); if(!mb) return; var dd=0.01; var bbox=(lng-dd)+','+(lat-dd)+','+(lng+dd)+','+(lat+dd);
    mb.innerHTML='<iframe width="100%" height="200" frameborder="0" style="border-radius:12px;" src="https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+lat+'%2C'+lng+'"></iframe><div style="font-size:11px;color:#888;margin-top:4px;">纬度 '+lat.toFixed(5)+' · 经度 '+lng.toFixed(5)+'</div>';
    var ac=document.getElementById('cp-loc-actions'); if(ac){ ac.innerHTML='<div class="big-btn" style="background:#ff2d55;" onclick="coupleShareLocation('+lat+','+lng+')">分享给 TA（'+(contacts[coupleState.partner]?contacts[coupleState.partner].name:'TA')+'）</div>'; }
  };
  window.coupleShareLocation = function(lat,lng){
    var c=contacts[coupleState.partner]; if(c&&c.seed){ c.seed.push({mine:true,kind:'text',text:'[我的实时位置] 纬度 '+lat.toFixed(4)+'，经度 '+lng.toFixed(4)+'（已共享给你）',from:'me',ts:nowStamp()}); saveChatThread(coupleState.partner); if(currentContact===coupleState.partner) renderThread(); }
    showToast('已将你的位置分享给 '+(c?c.name:'TA'), 1800);
  };
})();
