/* Couple Space diary, notes, and location */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;

  function diaryReplyFor(entryId){
    var d = window.coupleData();
    return (d.diaryReplies || []).filter(function(x){ return x.entryId === entryId; }).slice(-1)[0] || null;
  }
  function diaryFeelingFor(entryId){
    var d = window.coupleData();
    return (d.diaryFeelings || []).filter(function(x){ return x.entryId === entryId; }).slice(-1)[0] || null;
  }
  function partnerName(){ var c = contacts[coupleState.partner]; return c ? (c.displayName || c.name) : 'TA'; }

  window.coupleViewDiary = function(){
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">\u6211\u7684\u65e5\u8bb0 \u00b7 '+esc(partnerName())+'</div>';
    html += '<div style="font-size:11px;color:#7b8f89;line-height:1.5;margin-bottom:8px;">\u65e5\u8bb0\u53ea\u7531\u4f60\u81ea\u5df1\u5199\u3002\u4fdd\u5b58\u540e\uff0cTA \u4f1a\u6309\u81ea\u5df1\u7684\u4eba\u8bbe\u548c\u8bb0\u5fc6\u7559\u4e0b\u4e00\u6bb5\u659c\u4f53\u56de\u590d\u3002</div>';
    html += '<textarea id="cp-diary-text" placeholder="\u5199\u4e0b\u4eca\u5929\u771f\u6b63\u60f3\u8bb0\u4f4f\u7684\u4e8b" style="width:100%;height:100px;border:1px solid #d5ece4;border-radius:12px;padding:10px;font-size:13px;outline:none;resize:none;background:#fbfffd;"></textarea>';
    html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleAddDiary()">\u4fdd\u5b58\u65e5\u8bb0</div>';
    html += '<div id="cp-diary-list" style="margin-top:12px;"></div>';
    coupleShowSub('\u6211\u7684\u65e5\u8bb0', html);
    window.renderDiaryList();
  };

  window.renderDiaryList = function(){
    var box = document.getElementById('cp-diary-list'); if(!box) return;
    var d = window.coupleData();
    if(!d.diary.length){
      box.innerHTML = '<div style="text-align:center;color:#9aa9a5;font-size:12px;padding:16px;">\u8fd8\u6ca1\u6709\u65e5\u8bb0\uff0c\u5148\u5199\u4e0b\u4e00\u6761\u3002</div>';
      return;
    }
    box.innerHTML = d.diary.slice().reverse().map(function(e, i){
      var ri = d.diary.length - 1 - i;
      if(!e.id) e.id = 'diary-' + (e.ts || Date.now()) + '-' + ri;
      var reply = diaryReplyFor(e.id);
      var feeling = diaryFeelingFor(e.id);
      var extra = '';
      if(reply){
        extra += '<div style="margin-top:10px;padding-top:9px;border-top:1px solid #e5f2ee;font-size:12px;color:#47635c;line-height:1.6;font-style:italic;white-space:pre-wrap;">'+esc(reply.text)+'</div>';
      }
      if(feeling){
        extra += '<div style="margin-top:6px;font-size:11px;color:#7f9690;line-height:1.5;font-style:italic;white-space:pre-wrap;">'+esc(feeling.text)+'</div>';
      }
      return '<div style="background:#fff;border:1px solid #dcefe9;border-radius:12px;padding:12px;margin-bottom:8px;box-shadow:0 8px 24px rgba(72,135,116,.07);"><div style="display:flex;justify-content:space-between;gap:8px;"><div style="font-size:11px;color:#8aa099;">'+esc(e.date || '')+'</div><div onclick="coupleDelDiary('+ri+')" style="font-size:11px;color:#d75f6a;cursor:pointer;">\u5220\u9664</div></div><div style="font-size:13px;color:#23342f;margin-top:4px;line-height:1.65;white-space:pre-wrap;">'+esc(e.text || '')+'</div>'+extra+'</div>';
    }).join('');
    window.saveCoupleState();
  };

  window.coupleAddDiary = function(){
    var t = document.getElementById('cp-diary-text'); if(!t) return;
    var v = t.value.trim(); if(!v) return;
    var d = window.coupleData();
    var entry = { id:'diary-' + Date.now(), date:ymdKey(new Date()), text:v, source:'user', ts:Date.now() };
    d.diary.push(entry);
    window.saveCoupleState();
    t.value = '';
    window.renderDiaryList();
    window.coupleDiaryAiReply(entry);
  };

  window.coupleDiaryAiReply = function(entry){
    var c = contacts[coupleState.partner];
    var d = window.coupleData();
    if(!entry || !entry.id) return;
    var recent = c && Array.isArray(c.seed) ? c.seed.slice(-14).map(function(m){
      var who = m.mine ? userName : (c.displayName || c.name || 'TA');
      return who + ': ' + (m.text || ('[' + (m.kind || 'message') + ']'));
    }).join('\n') : '';
    var persona = typeof getPersonaPrompt === 'function' ? getPersonaPrompt(coupleState.partner) : '';
    var world = typeof getWorldBookPrompt === 'function' ? getWorldBookPrompt(coupleState.partner) : '';
    var time = typeof nowContext === 'function' ? nowContext() : '';
    var prompt = [
      '\u4f60\u662f\u60c5\u4fa3\u7a7a\u95f4\u91cc\u7684 '+partnerName()+'\u3002',
      '\u8bf7\u5b8c\u5168\u9075\u5faa\u4eba\u8bbe\u3001\u4e16\u754c\u4e66\u3001\u4f60\u4eec\u7684\u8bb0\u5fc6\u548c\u5173\u7cfb\u72b6\u6001\u3002',
      '\u4f60\u4e0d\u8981\u4ee3\u66ff\u7528\u6237\u5199\u65e5\u8bb0\uff0c\u53ea\u80fd\u56de\u590d\u7528\u6237\u5df2\u7ecf\u5199\u4e0b\u7684\u5185\u5bb9\u3002',
      '\u8f93\u51fa JSON\uff1a{"reply":"\u4f60\u5199\u7ed9\u7528\u6237\u7684\u659c\u4f53\u56de\u590d","feeling":"\u4f60\u81ea\u5df1\u8bfb\u5b8c\u8fd9\u7bc7\u65e5\u8bb0\u540e\u7684\u611f\u53d7"}\u3002\u4e0d\u8981\u8868\u60c5\u7b26\u53f7\uff0c\u4e0d\u8981\u6b7b\u8bdd\u672f\u3002',
      persona,
      world,
      c && c.memory && c.memory.summary ? '\n[Memory]\n' + c.memory.summary : '',
      '\n[Recent Chat]\n' + recent,
      '\n[User Diary]\n' + entry.text
    ].join('\n');
    callRealAI([{role:'user', content:prompt}], persona + world + time, coupleState.partner, function(raw){
      var reply = '', feeling = '';
      try{
        var clean = String(raw || '').replace(/^\x60{3}json\s*/,'').replace(/\x60{3}$/,'');
        var data = JSON.parse(clean);
        reply = data.reply || '';
        feeling = data.feeling || '';
      }catch(e){
        reply = String(raw || '').trim();
      }
      if(!reply) reply = partnerName() + '\u8bfb\u5b8c\u540e\u5b89\u9759\u4e86\u4e00\u4f1a\u513f\uff0c\u628a\u8fd9\u4ef6\u4e8b\u8ba4\u771f\u6536\u8fdb\u5fc3\u91cc\u3002';
      if(!feeling) feeling = '\u6211\u7684\u611f\u53d7\uff1a\u60f3\u66f4\u8d34\u8fd1\u4f60\u4eca\u5929\u771f\u6b63\u5728\u610f\u7684\u90a3\u4e00\u90e8\u5206\u3002';
      d.diaryReplies.push({entryId:entry.id, text:reply.trim(), ts:Date.now(), partnerId:coupleState.partner});
      d.diaryFeelings.push({entryId:entry.id, text:feeling.trim(), ts:Date.now(), partnerId:coupleState.partner});
      window.saveCoupleState();
      window.renderDiaryList();
    });
  };

  window.coupleDelDiary = function(i){
    var d = window.coupleData();
    var removed = d.diary.splice(i,1)[0];
    if(removed && removed.id){
      d.diaryReplies = d.diaryReplies.filter(function(x){ return x.entryId !== removed.id; });
      d.diaryFeelings = d.diaryFeelings.filter(function(x){ return x.entryId !== removed.id; });
    }
    window.saveCoupleState();
    window.renderDiaryList();
  };

  window.coupleViewNotes = function(){
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">\u6211\u7684\u5907\u5fd8\u5f55</div>';
    html += '<div style="font-size:11px;color:#7b8f89;line-height:1.5;margin-bottom:8px;">\u5907\u5fd8\u5f55\u53ea\u80fd\u4f60\u81ea\u5df1\u5199\uff0cAI \u4e0d\u4f1a\u81ea\u52a8\u7f16\u9020\u5185\u5bb9\u3002</div>';
    html += '<textarea id="cp-note-text" placeholder="\u5199\u4e00\u6761\u81ea\u5df1\u8981\u8bb0\u4f4f\u7684\u4e8b" style="width:100%;height:80px;border:1px solid #d5ece4;border-radius:12px;padding:10px;font-size:13px;outline:none;resize:none;background:#fbfffd;"></textarea>';
    html += '<div class="big-btn" style="margin-top:8px;" onclick="coupleAddNote()">\u6dfb\u52a0\u5907\u5fd8</div>';
    html += '<div id="cp-note-list" style="margin-top:12px;"></div>';
    coupleShowSub('\u6211\u7684\u5907\u5fd8\u5f55', html);
    window.renderNoteList();
  };

  window.renderNoteList = function(){
    var box = document.getElementById('cp-note-list'); if(!box) return;
    var d = window.coupleData();
    if(!d.notes.length){ box.innerHTML = '<div style="text-align:center;color:#9aa9a5;font-size:12px;padding:16px;">\u8fd8\u6ca1\u6709\u5907\u5fd8\u5f55\u3002</div>'; return; }
    box.innerHTML = d.notes.slice().reverse().map(function(e,i){
      var ri = d.notes.length - 1 - i;
      return '<div style="background:#fff;border:1px solid #dcefe9;border-radius:12px;padding:12px;margin-bottom:8px;"><div style="display:flex;justify-content:space-between;"><div style="font-size:11px;color:#8aa099;">'+esc(e.date || '')+'</div><div onclick="coupleDelNote('+ri+')" style="font-size:11px;color:#d75f6a;cursor:pointer;">\u5220\u9664</div></div><div style="font-size:13px;color:#23342f;margin-top:4px;white-space:pre-wrap;line-height:1.6;">'+esc(e.text || '')+'</div></div>';
    }).join('');
  };
  window.coupleAddNote = function(){
    var t = document.getElementById('cp-note-text'); if(!t) return;
    var v = t.value.trim(); if(!v) return;
    var d = window.coupleData();
    d.notes.push({id:'note-' + Date.now(), date:ymdKey(new Date()), text:v, source:'user', ts:Date.now()});
    window.saveCoupleState(); t.value = ''; window.renderNoteList();
  };
  window.coupleDelNote = function(i){ var d = window.coupleData(); d.notes.splice(i,1); window.saveCoupleState(); window.renderNoteList(); };

  window.coupleLocation = function(){
    var html='<div style="text-align:center;padding:10px 4px;"><div style="font-size:14px;font-weight:700;margin-bottom:8px;">\u5b9e\u65f6\u4f4d\u7f6e</div>';
    html+='<div id="cp-loc-status" style="font-size:12px;color:#888;margin-bottom:10px;">\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u83b7\u53d6\u4f60\u7684\u4f4d\u7f6e\uff0c\u4e5f\u53ef\u4ee5\u624b\u52a8\u8f93\u5165\u3002</div>';
    html+='<div id="cp-loc-map" style="margin-bottom:10px;"></div>';
    html+='<div class="big-btn" onclick="coupleGetLoc()">\u83b7\u53d6\u6211\u7684\u4f4d\u7f6e</div>';
    html+='<div id="cp-loc-actions" style="margin-top:8px;"></div></div>';
    coupleShowSub('\u5b9e\u65f6\u4f4d\u7f6e', html);
    var d=window.coupleData(); if(d.location) window.renderLocationView(d.location.lat, d.location.lng);
  };
  window.coupleGetLoc = function(){
    var st=document.getElementById('cp-loc-status'); if(!navigator.geolocation){ window.coupleManualLoc(); return; }
    st.textContent='\u6b63\u5728\u8bf7\u6c42\u5b9a\u4f4d\u6743\u9650...';
    navigator.geolocation.getCurrentPosition(function(pos){ var la=pos.coords.latitude, ln=pos.coords.longitude, ac=pos.coords.accuracy; st.textContent='\u5b9a\u4f4d\u6210\u529f\uff0c\u7cbe\u5ea6\u7ea6 '+Math.round(ac)+' \u7c73'; window.coupleSetLoc(la,ln); },
      function(){ st.textContent='\u5b9a\u4f4d\u5931\u8d25\uff0c\u53ef\u624b\u52a8\u8f93\u5165\u3002'; window.coupleManualLoc(); }, {enableHighAccuracy:true,timeout:10000,maximumAge:0});
  };
  window.coupleManualLoc = function(){
    var st=document.getElementById('cp-loc-status'); if(!st) return;
    st.innerHTML='\u624b\u52a8\u8f93\u5165\u7ecf\u7eac\u5ea6\uff1a<br><input id="cp-lat" placeholder="lat" style="width:46%;border:1px solid #ddd;border-radius:8px;padding:8px;margin:6px 2% 0 0;font-size:12px;outline:none;"><input id="cp-lng" placeholder="lng" style="width:46%;border:1px solid #ddd;border-radius:8px;padding:8px;margin:6px 0 0 0;font-size:12px;outline:none;"><div class="big-btn" style="margin-top:8px;" onclick="coupleSetManual()">\u4f7f\u7528\u6b64\u4f4d\u7f6e</div>';
  };
  window.coupleSetManual = function(){
    var la=parseFloat(document.getElementById('cp-lat').value), ln=parseFloat(document.getElementById('cp-lng').value);
    if(isNaN(la)||isNaN(ln)){ alert('\u8bf7\u8f93\u5165\u6709\u6548\u7ecf\u7eac\u5ea6'); return; }
    var st=document.getElementById('cp-loc-status'); if(st) st.textContent='\u5df2\u624b\u52a8\u8bbe\u7f6e\u4f4d\u7f6e'; window.coupleSetLoc(la,ln);
  };
  window.coupleSetLoc = function(lat,lng){ var d=window.coupleData(); d.location={lat:lat,lng:lng,ts:Date.now()}; window.saveCoupleState(); window.renderLocationView(lat,lng); };
  window.renderLocationView = function(lat,lng){
    var mb=document.getElementById('cp-loc-map'); if(!mb) return; var dd=0.01; var bbox=(lng-dd)+','+(lat-dd)+','+(lng+dd)+','+(lat+dd);
    mb.innerHTML='<iframe width="100%" height="200" frameborder="0" style="border-radius:12px;" src="https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+lat+'%2C'+lng+'"></iframe><div style="font-size:11px;color:#888;margin-top:4px;">lat '+lat.toFixed(5)+' / lng '+lng.toFixed(5)+'</div>';
    var ac=document.getElementById('cp-loc-actions'); if(ac){ ac.innerHTML='<div class="big-btn" style="background:#4fb895;" onclick="coupleShareLocation('+lat+','+lng+')">\u5206\u4eab\u7ed9 '+esc(partnerName())+'</div>'; }
  };
  window.coupleShareLocation = function(lat,lng){
    var c=contacts[coupleState.partner]; if(c&&c.seed){ c.seed.push({mine:true,kind:'text',text:'[\u6211\u7684\u5b9e\u65f6\u4f4d\u7f6e] lat '+lat.toFixed(4)+', lng '+lng.toFixed(4),from:'me',ts:nowStamp()}); saveChatThread(coupleState.partner); if(currentContact===coupleState.partner) renderThread(); }
    showToast('\u5df2\u5206\u4eab\u4f4d\u7f6e', 1600);
  };
})();
