function renderHisHome(){
  var ov=document.getElementById('screen-hisphone'); if(!ov) return;
  var time=(window.nowTime?nowTime():'');
  var apps=hisApps.map(function(a){ return '<div onclick="hisOpenApp(\''+a[0]+'\')" style="text-align:center;cursor:pointer;"><div style="width:58px;height:58px;margin:0 auto;border-radius:14px;background:#1c1c1e;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff;">'+a[2]+'</div><div style="font-size:11px;margin-top:5px;color:#ddd;">'+a[1]+'</div></div>'; }).join('');
  ov.innerHTML='<div style="height:100%;display:flex;flex-direction:column;background:#000;color:#fff;">'+
    '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #222;"><div onclick="closeHisPhone()" style="cursor:pointer;font-size:18px;color:#fff;">‹</div><div style="font-size:14px;font-weight:700;">他的手机</div></div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 16px;font-size:12px;color:#aaa;"><span>'+time+'</span><span>🔋 100%</span></div>'+
    '<div style="flex:1;padding:20px 14px;overflow:auto;"><div style="text-align:center;font-size:13px;color:#aaa;margin-bottom:16px;">'+esc((contacts[coupleState.partner]?contacts[coupleState.partner].name:'TA'))+' 的手机</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px 0;">'+apps+'</div></div>'+
    '<div style="padding:10px;text-align:center;font-size:11px;color:#666;cursor:pointer;" onclick="closeHisPhone()">关闭 · 返回情侣空间</div>'+
  '</div>';
}
function hisOpenApp(app){ hisPhone.app=app; hisPhone.contact=null; renderHisPhone(); }
function hisBackHome(){ hisPhone.app='home'; hisPhone.contact=null; renderHisPhone(); }
function hisBar(title){ return '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid #222;background:#000;"><div onclick="hisBackHome()" style="cursor:pointer;font-size:20px;color:#fff;">‹</div><div style="font-size:14px;font-weight:700;color:#fff;">'+title+'</div></div>'; }
function hisFoot(){ return '<div style="margin-top:auto;padding:10px;text-align:center;font-size:11px;color:#666;cursor:pointer;" onclick="hisBackHome()">‹ 返回</div>'; }

function hisRenderApp(){
  var c=hisPhone.contacts, date=hisPhone.date;
  if(hisPhone.app==='wechat'){
    if(!hisPhone.contact){
      var list=c.slice().sort(function(a,b){return (b.pinned?1:0)-(a.pinned?1:0);}).map(function(ct){
        var last=ct.msgs.length?ct.msgs[ct.msgs.length-1].text||'[消息]':'';
        return '<div onclick="hisOpenChat(\''+ct.id+'\')" style="display:flex;gap:10px;align-items:center;padding:10px 14px;cursor:pointer;border-bottom:1px solid #161616;"><div style="width:42px;height:42px;border-radius:10px;background:#2a2a2c;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;">'+(ct.pinned?'💕':(ct.kind==='col'?'💼':'🙂'))+'</div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:#fff;">'+(ct.pinned?'我':esc(ct.name))+(ct.pinned?'（置顶）':'')+'</div><div style="font-size:11px;color:#999;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+esc(String(last).substring(0,22))+'</div></div></div>';
      }).join('');
      var ov=document.getElementById('screen-hisphone');
      ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('微信')+list+hisFoot()+'</div>';
    } else { hisRenderChat(); }
  }
  else if(hisPhone.app==='ins'||hisPhone.app==='x'){ var pool=hisPhone.app==='ins'?hisInsPool:hisXPool; var rnd=dailySeed(hisPhone.app+date); var posts=shuffle(pool,rnd).slice(0,5);
    var ov=document.getElementById('screen-hisphone');
    ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar(hisPhone.app==='ins'?'Ins':'X')+posts.map(function(p){return '<div style="padding:12px 14px;border-bottom:1px solid #161616;"><div style="font-size:12px;color:#bbb;">@'+(hisPhone.app==='ins'?'his_ins':'his_x')+' · 今天</div><div style="font-size:14px;margin-top:4px;white-space:pre-wrap;color:#fff;">'+esc(p)+'</div></div>';}).join('')+hisFoot()+'</div>';
  }
  else if(hisPhone.app==='contacts'){ var rows=c.map(function(ct){return '<div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #161616;"><div style="font-size:13px;font-weight:700;color:#fff;">'+(ct.pinned?'我':esc(ct.name))+'</div><div style="font-size:12px;color:#999;">'+ct.number+'</div></div>';}).join('');
    var ov=document.getElementById('screen-hisphone');
    ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('电话薄')+rows+hisFoot()+'</div>';
  }
  else if(hisPhone.app==='tb'){ var rnd=dailySeed('tb'+date); var items=shuffle(hisTaobaoPool,rnd).slice(0,5);
    var ov=document.getElementById('screen-hisphone');
    ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('淘宝 · 想给你买的')+items.map(function(it){var p=it.split(' ¥'); return '<div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #161616;"><div style="font-size:13px;color:#fff;">'+esc(p[0])+'</div><div style="font-size:12px;color:#ff6b81;">¥'+(p[1]||'')+'</div></div>';}).join('')+hisFoot()+'</div>';
  }
  else if(hisPhone.app==='fit'){ var rnd=dailySeed('fit'+date); var recs=shuffle(hisFitnessPool,rnd).slice(0,3);
    var ov=document.getElementById('screen-hisphone');
    ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('健身记录')+recs.map(function(r){return '<div style="padding:12px 14px;border-bottom:1px solid #161616;font-size:13px;color:#fff;">'+esc(r)+'</div>';}).join('')+hisFoot()+'</div>';
  }
  else if(hisPhone.app==='diary'){ var rnd=dailySeed('hdiary'+date); var ps=shuffle(hisDiaryPool,rnd).slice(0,3);
    var ov=document.getElementById('screen-hisphone');
    ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('他的日记')+ps.map(function(p){return '<div style="padding:12px 14px;border-bottom:1px solid #161616;font-size:13px;white-space:pre-wrap;color:#fff;">'+esc(p)+'</div>';}).join('')+hisFoot()+'</div>';
  }
  else if(hisPhone.app==='notes'){ var rnd=dailySeed('hnote'+date); var ps=shuffle(hisMemoPool,rnd).slice(0,4);
    var ov=document.getElementById('screen-hisphone');
    ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('他的备忘录')+ps.map(function(p){return '<div style="padding:12px 14px;border-bottom:1px solid #161616;font-size:13px;color:#fff;">'+esc(p)+'</div>';}).join('')+hisFoot()+'</div>';
  }
  else if(hisPhone.app==='browse'){ var rnd=dailySeed('hbrowse'+date); var ps=shuffle(hisBrowsePool,rnd).slice(0,5);
    var ov=document.getElementById('screen-hisphone');
    ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('浏览记录')+ps.map(function(p){return '<div style="padding:12px 14px;border-bottom:1px solid #161616;font-size:13px;color:#fff;">🔍 '+esc(p)+'</div>';}).join('')+hisFoot()+'</div>';
  }
  else { var ov=document.getElementById('screen-hisphone'); ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+hisBar('App')+'<div style="padding:20px;color:#999;">（该应用暂无内容）</div>'+hisFoot()+'</div>'; }
}
function hisOpenChat(cid){ hisPhone.contact=cid; renderHisPhone(); }
function hisRenderChat(){
  var ct=hisPhone.contacts.find(function(x){return x.id===hisPhone.contact;}); if(!ct){ hisPhone.contact=null; renderHisPhone(); return; }
  var ov=document.getElementById('screen-hisphone');
  var bubbles=ct.msgs.map(function(m){ var right = ct.synced ? (!m.mine) : m.mine; return '<div style="display:flex;justify-content:'+(right?'flex-end':'flex-start')+';margin:6px 12px;"><div style="max-width:72%;padding:8px 12px;border-radius:14px;font-size:13px;'+(right?'background:#0a84ff;color:#fff;':'background:#1c1c1e;color:#fff;')+'">'+esc(m.text||'')+'</div></div>'; }).join('');
  ov.innerHTML='<div style="height:100%;background:#000;color:#fff;display:flex;flex-direction:column;">'+
    hisBar(ct.pinned?'我':esc(ct.name))+
    '<div style="flex:1;overflow:auto;padding:8px 0;" id="his-chat-body">'+bubbles+'</div>'+
    '<div style="display:flex;gap:6px;padding:10px;border-top:1px solid #222;"><input id="his-msg" placeholder="发消息…" style="flex:1;border:1px solid #333;border-radius:18px;padding:8px 12px;background:#1c1c1e;color:#fff;outline:none;font-size:13px;"><div onclick="hisSend()" style="padding:8px 14px;background:#0a84ff;border-radius:18px;font-size:13px;cursor:pointer;">发送</div></div>'+
  '</div>';
  var body=document.getElementById('his-chat-body'); if(body) body.scrollTop=body.scrollHeight;
}
function hisSend(){
  var i=document.getElementById('his-msg'); if(!i) return; var v=i.value.trim(); if(!v) return;
  var ct=hisPhone.contacts.find(function(x){return x.id===hisPhone.contact;}); if(!ct) return;
  ct.msgs.push({mine:false, text:v, from:coupleState.partner}); i.value='';
  var body=document.getElementById('his-chat-body'); if(body) body.innerHTML+='<div style="display:flex;justify-content:flex-start;margin:6px 12px;"><div style="max-width:72%;padding:8px 12px;border-radius:14px;font-size:13px;background:#1c1c1e;color:#fff;">'+esc(v)+'</div></div>';
  if(ct.synced){ if(currentContact===coupleState.partner) renderThread(); return; } // 同步到你的微信，不自动替你回
  setTimeout(function(){
    var rnd=dailySeed('reply-'+ct.id+'-'+ct.msgs.length+'-'+hisPhone.date); var pool=ct.kind==='you'?hisYouPinnedPool:hisColleagueMsgPool; var rep=pick(rnd,pool);
    ct.msgs.push({mine:true,text:rep});
    var b=document.getElementById('his-chat-body'); if(b) b.innerHTML+='<div style="display:flex;justify-content:flex-end;margin:6px 12px;"><div style="max-width:72%;padding:8px 12px;border-radius:14px;font-size:13px;background:#0a84ff;color:#fff;">'+esc(rep)+'</div></div>'; if(b) b.scrollTop=b.scrollHeight;
  }, 700);
}
