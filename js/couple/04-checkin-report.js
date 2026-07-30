/* Couple Space check-in reports: light green iOS/INS redesign */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;

  var CN={
    noScan:'\u5c1a\u672a\u626b\u63cf',
    stable:'\u7a33\u5b9a',
    watch:'\u9700\u5173\u6ce8',
    high:'\u9ad8\u98ce\u9669',
    balance:'\u4f59\u989d ',
    walletMissing:'\u672a\u540c\u6b65\u94b1\u5305',
    noRecent:'\u6682\u65e0\u6700\u8fd1\u6d88\u606f',
    none:'\u65e0', you:'\u4f60', ta:'TA',
    checkin:'\u67e5\u5c97',
    trust:'\u5b89\u5168\u611f',
    last:'\u4e0a\u6b21 ',
    startScan:'\u5f00\u59cb\u67e5\u5c97\u626b\u63cf',
    moodTitle:'\u6e29\u67d4\u67e5\u5c97\u6d88\u606f',
    moodPlaceholder:'\u5199\u4e00\u53e5\u4f60\u60f3\u53d1\u7ed9 TA \u7684\u8bdd\u3002\u7559\u7a7a\u4f1a\u81ea\u52a8\u53d1\u9001\u6e29\u67d4\u7248\u672c\u3002',
    moodSend:'\u53d1\u9001\u5e76\u8ba9 TA \u6309\u4eba\u8bbe\u56de\u590d',
    viewPhone:'\u67e5\u770b TA \u624b\u673a',
    taCheckMe:'\u8ba9 TA \u67e5\u6211',
    timeline:'\u5386\u53f2\u62a5\u544a',
    noReport:'\u8fd8\u6ca1\u6709\u67e5\u5c97\u8bb0\u5f55\u3002\u70b9\u51fb\u201c\u5f00\u59cb\u626b\u63cf\u201d\u540e\uff0c\u8fd9\u91cc\u4f1a\u4fdd\u5b58\u6bcf\u6b21\u7ed3\u679c\u3002',
    bindFirst:'\u8bf7\u5148\u7ed1\u5b9a\u4e00\u4e2a WeChat \u8054\u7cfb\u4eba\u3002',
    scanSaved:'\u67e5\u5c97\u62a5\u544a\u5df2\u751f\u6210',
    bindContact:'\u8bf7\u5148\u7ed1\u5b9a\u8054\u7cfb\u4eba',
    sentMood:'\u5df2\u53d1\u9001\u6e29\u67d4\u67e5\u5c97\u6d88\u606f',
    reportTitle:'\u67e5\u5c97\u62a5\u544a',
    target:'\u5bf9\u8c61\uff1a',
    risk:'\u98ce\u9669\uff1a',
    result:'\u7ed3\u8bba\uff1a',
    phoneActivity:'\u624b\u673a\u6d3b\u52a8\uff1a',
    wallet:'\u94b1\u5305\uff1a',
    historyBind:'\u5386\u53f2\u7ed1\u5b9a\uff1a',
    sentReport:'\u62a5\u544a\u5df2\u53d1\u9001\u5230 WeChat',
    comprehensive:'\u7efc\u5408', browse:'\u6d4f\u89c8', notes:'\u5907\u5fd8', diary:'\u65e5\u8bb0', add:'\u6dfb\u52a0', addBrowse:'\u6dfb\u52a0\u4e00\u6761\u641c\u7d22\u8bb0\u5f55',
    signalIncluded:'\u4fe1\u53f7\u5df2\u7eb3\u5165\u67e5\u5c97\u62a5\u544a\u3002',
    together:'Together ', days:' days', switchPartner:'\u5207\u6362\u7ed1\u5b9a\u8054\u7cfb\u4eba',
    reports:'\u67e5\u5c97\u62a5\u544a', wish:'\u613f\u671b',
    checkBoard:'\u67e5\u5c97\u770b\u677f', checkBoardSub:'\u626b\u63cf\u5173\u7cfb\u4fe1\u53f7\uff0c\u751f\u6210\u53ef\u4fdd\u5b58\u62a5\u544a',
    liveLoc:'\u5b9e\u65f6\u4f4d\u7f6e', liveLocSub:'\u4f4d\u7f6e\u786e\u8ba4\u4e0e\u5b89\u5168\u611f\u4e92\u52a8',
    myDiary:'\u6211\u7684\u65e5\u8bb0', myDiarySub:'\u7531\u804a\u5929\u8bb0\u5fc6\u751f\u6210\u5173\u7cfb\u8bb0\u5f55',
    memo:'\u5907\u5fd8\u5f55', memoSub:'\u91cd\u8981\u8bdd\u9898\u548c\u627f\u8bfa\u6c89\u6dc0',
    wishCart:'\u613f\u671b\u8d2d\u7269\u8f66', wishCartSub:'\u793c\u7269\u3001\u4e0b\u5355\u548c WeChat \u5361\u7247',
    orderFood:'\u7ed9 TA \u70b9\u5916\u5356', orderFoodSub:'\u4e0a\u4f20\u56fe\u7247\u540e\u53d1\u9001\u771f\u5b9e\u5361\u7247',
    screenTime:'\u5c4f\u5e55\u65f6\u957f', screenTimeSub:'\u4eca\u65e5\u6d3b\u8dc3\u4e0e\u4f7f\u7528\u8282\u594f',
    contactManage:'\u8054\u7cfb\u4eba\u7ba1\u7406', contactManageSub:'\u5207\u6362\u5bf9\u8c61\u548c\u540c\u6b65\u4eba\u8bbe',
    customIcon:'\u81ea\u5b9a\u4e49\u56fe\u6807', customIconSub:'\u4fdd\u7559\u4f60\u7684\u539f\u6709\u7f8e\u5316\u63d2\u4ef6\u5165\u53e3'
  };

  function htmlEsc(v){
    if(typeof esc === 'function') return esc(String(v||''));
    return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function fmtTime(ts){ if(!ts) return CN.noScan; var d=new Date(ts); var p=function(n){return ('0'+n).slice(-2);}; return p(d.getMonth()+1)+'/'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()); }
  function todayKey(){ if(typeof ymdKey==='function') return ymdKey(new Date()); var d=new Date(); var p=function(n){return ('0'+n).slice(-2);}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  function contactName(id){ return contacts[id] ? (contacts[id].displayName || contacts[id].name || CN.ta) : CN.ta; }
  function partner(){ return contacts[coupleState.partner]; }
  function avatar(c){ if(c && typeof contactAvatar==='function') return contactAvatar(c); return '<span style="font-size:13px;font-weight:800;color:#3d9d68;">TA</span>'; }
  function riskLabel(risk){ return ({low:CN.stable,watch:CN.watch,high:CN.high})[risk] || CN.stable; }
  function riskClass(risk){ return risk==='high'?'couple-risk-high':(risk==='watch'?'couple-risk-watch':'couple-risk-low'); }
  function data(){ return (typeof coupleData==='function') ? coupleData() : {}; }

  window.coupleEnsureCheckinState=function(){
    var d=data();
    if(!d.checkin) d.checkin={trust:82,reports:[],lastScan:0,moodMessages:[]};
    if(!Array.isArray(d.checkin.reports)) d.checkin.reports=[];
    if(!Array.isArray(d.checkin.moodMessages)) d.checkin.moodMessages=[];
    if(typeof d.checkin.trust!=='number') d.checkin.trust=82;
    return d.checkin;
  };
  function persist(){ if(typeof saveCoupleState==='function') saveCoupleState(); if(typeof saveState==='function') saveState(); }

  function collectSignals(){
    var c=partner(); var seed=c&&Array.isArray(c.seed)?c.seed:[];
    var texts=seed.filter(function(m){ return (m.kind==='text'||!m.kind)&&m.text; });
    var mine=texts.filter(function(m){ return !!m.mine; });
    var fromTa=texts.filter(function(m){ return !m.mine; });
    var ids=Object.keys(contacts||{}).filter(function(k){ return k!=='me'&&!contacts[k].isGroup; });
    var otherIds=ids.filter(function(k){ return k!==coupleState.partner; });
    var otherTotal=0; otherIds.forEach(function(k){ var ct=contacts[k]; otherTotal+=ct&&ct.seed?ct.seed.length:0; });
    var history=(coupleState.partnerHistory||[]).filter(function(k){ return k!==coupleState.partner&&contacts[k]; });
    var d=data(); var browseCount=(d.browseUser||[]).length; try{ if(typeof genDailyBrowse==='function') browseCount+=genDailyBrowse(todayKey()).length; }catch(e){}
    var walletCount=(typeof walletTx!=='undefined'&&walletTx)?walletTx.length:0;
    var walletText=(typeof walletBalance==='number')?(CN.balance+walletBalance.toFixed(2)):CN.walletMissing;
    var screenMin=(typeof screenTimeData!=='undefined'&&screenTimeData)?Math.round((screenTimeData.todaySec||0)/60):0;
    var last=seed.length?seed[seed.length-1]:null;
    return {c:c,seed:seed,textCount:texts.length,mineCount:mine.length,partnerCount:fromTa.length,lastText:last&&last.text?String(last.text).slice(0,56):CN.noRecent,lastFrom:last?(last.mine?CN.you:CN.ta):CN.none,otherChatCount:otherTotal,otherContactCount:otherIds.length,rivals:history.map(contactName),browseCount:browseCount,walletCount:walletCount,walletText:walletText,screenMin:screenMin,notes:(d.notes||[]).length,diary:(d.diary||[]).length,shop:(d.shop||[]).length};
  }

  function buildEvidence(s){
    var ev=[];
    ev.push({label:'WeChat \u4e92\u52a8',value:s.partnerCount+' \u6761 TA \u56de\u590d',note:'\u6700\u8fd1\u4e00\u53e5\u6765\u81ea'+s.lastFrom+'\uff1a'+s.lastText});
    ev.push({label:'\u804a\u5929\u5bc6\u5ea6',value:s.textCount+' \u6761\u603b\u8bb0\u5f55',note:'\u4f60\u7684\u6d88\u606f '+s.mineCount+' \u6761\uff0cTA \u7684\u6d88\u606f '+s.partnerCount+' \u6761'});
    ev.push({label:'\u5173\u7cfb\u6392\u4ed6\u611f',value:s.rivals.length?'\u53d1\u73b0 '+s.rivals.length+' \u4e2a\u5386\u53f2\u7ed1\u5b9a':'\u5f53\u524d\u4e13\u6ce8',note:s.rivals.length?s.rivals.slice(0,3).join('\u3001'):'\u6ca1\u6709\u68c0\u6d4b\u5230\u5176\u4ed6\u60c5\u4fa3\u7a7a\u95f4\u7ed1\u5b9a'});
    ev.push({label:'\u624b\u673a\u6d3b\u52a8',value:s.screenMin+' \u5206\u949f',note:'\u4eca\u65e5\u5c4f\u5e55\u4f7f\u7528\u65f6\u957f\uff0c\u7ed3\u5408\u4f7f\u7528\u9891\u7387\u5224\u65ad\u5728\u7ebf\u72b6\u6001'});
    ev.push({label:'\u94b1\u5305\u4e0e\u751f\u6d3b',value:s.walletText,note:'\u6d41\u6c34 '+s.walletCount+' \u7b14\uff0c\u53ef\u7528\u4e8e\u5224\u65ad\u5916\u5356\u3001\u793c\u7269\u3001\u51fa\u884c\u60c5\u666f'});
    ev.push({label:'\u9690\u79c1\u75d5\u8ff9',value:s.browseCount+' \u6761\u6d4f\u89c8',note:'\u5907\u5fd8 '+s.notes+' \u6761\uff0c\u65e5\u8bb0 '+s.diary+' \u7bc7\uff0c\u8d2d\u7269\u8f66 '+s.shop+' \u4ef6'});
    return ev;
  }
  function scoreReport(s){
    var trust=0,risk='low',summary=[];
    trust+=s.partnerCount>=8?4:(s.partnerCount>=3?2:-2);
    if(s.rivals.length){ trust-=Math.min(12,s.rivals.length*5); summary.push('\u5386\u53f2\u7ed1\u5b9a\u8f83\u591a\uff0c\u5efa\u8bae\u628a\u5173\u7cfb\u8fb9\u754c\u505a\u6e05\u695a\u3002'); }
    if(s.otherChatCount>Math.max(16,s.textCount*1.6)){ trust-=6; summary.push('\u5176\u4ed6\u8054\u7cfb\u4eba\u6d3b\u8dc3\u5ea6\u504f\u9ad8\uff0c\u9002\u5408\u7528\u6e29\u548c\u65b9\u5f0f\u786e\u8ba4\u8fd1\u51b5\u3002'); }
    if(s.screenMin>180&&s.partnerCount<2){ trust-=5; summary.push('\u5728\u7ebf\u65f6\u95f4\u4e0d\u4f4e\uff0c\u4f46\u4e0e\u4f60\u7684\u4e92\u52a8\u504f\u5c11\u3002'); }
    if(s.shop||s.walletCount){ trust+=2; summary.push('\u751f\u6d3b\u75d5\u8ff9\u5b8c\u6574\uff0c\u53ef\u4ee5\u7528\u793c\u7269\u3001\u5916\u5356\u6216\u4f4d\u7f6e\u8bc1\u660e\u63a8\u8fdb\u4e92\u52a8\u3002'); }
    if(trust<=-8) risk='high'; else if(trust<=-3) risk='watch';
    if(!summary.length) summary.push('\u5173\u7cfb\u4fe1\u53f7\u7a33\u5b9a\uff0c\u9002\u5408\u7528\u8f7b\u91cf\u95ee\u5019\u4fdd\u6301\u4eb2\u5bc6\u611f\u3002');
    return {trustDelta:trust,risk:risk,summary:summary.join(' ')};
  }

  window.coupleCheckinSaveReport=function(report){ var st=window.coupleEnsureCheckinState(); st.reports.unshift(report); st.reports=st.reports.slice(0,20); st.lastScan=report.at; st.trust=clamp((st.trust||82)+(report.trustDelta||0),0,100); coupleState.lastCheckin=report.at; persist(); };
  window.coupleStartCheckinScan=function(){ var signals=collectSignals(); var scored=scoreReport(signals); var report={id:'cp-check-'+Date.now(),at:Date.now(),risk:scored.risk,trustDelta:scored.trustDelta,summary:scored.summary,evidence:buildEvidence(signals)}; window.coupleCheckinSaveReport(report); if(typeof showToast==='function') showToast(CN.scanSaved,1300); window.coupleRenderCheckinDashboard(); };

  function sendToPartner(text,prompt,after){
    var c=partner(); if(!c||!coupleState.partner){ if(typeof showToast==='function') showToast(CN.bindContact,1500); return; }
    if(!Array.isArray(c.seed)) c.seed=[]; c.seed.push({mine:true,kind:'text',text:text,from:'me',ts:typeof nowStamp==='function'?nowStamp():Date.now()});
    if(typeof saveChatThread==='function') saveChatThread(coupleState.partner);
    if(typeof renderThread==='function'&&currentContact===coupleState.partner) renderThread();
    if(after) after(c);
    if(typeof realAISpeak==='function') setTimeout(function(){ realAISpeak(c,coupleState.partner,prompt); },500);
    if(typeof openThread==='function') openThread(coupleState.partner);
  }
  window.coupleCheckinSendMoodMessage=function(){
    var box=document.getElementById('cp-checkin-mood-msg'); var st=window.coupleEnsureCheckinState();
    var text=box&&box.value.trim()?box.value.trim():'\u6211\u4e0d\u662f\u60f3\u63a7\u5236\u4f60\uff0c\u53ea\u662f\u6709\u70b9\u60f3\u4f60\u3002\u4f60\u73b0\u5728\u65b9\u4fbf\u544a\u8bc9\u6211\u5728\u505a\u4ec0\u4e48\u5417\uff1f';
    st.moodMessages.unshift({at:Date.now(),text:text}); persist();
    var prompt='\u4f60\u6b63\u5728\u548c\u604b\u4eba\u804a\u5929\u3002\u5bf9\u65b9\u7528\u6e29\u67d4\u4f46\u6709\u4e00\u70b9\u67e5\u5c97\u610f\u5473\u7684\u65b9\u5f0f\u8be2\u95ee\u4f60\u3002\u8bf7\u6309\u4f60\u7684\u4eba\u8bbe\u3001\u4f60\u4eec\u7684\u8bb0\u5fc6\u548c\u4e16\u754c\u4e66\u81ea\u7136\u56de\u5e94\uff0c\u4e0d\u80fd\u4eba\u673a\u611f\uff0c\u4e0d\u80fd\u51fa\u73b0AI\u81ea\u79f0\u3002';
    sendToPartner(text,prompt,function(){ if(typeof showToast==='function') showToast(CN.sentMood,1300); });
  };

  function evidenceHTML(items){ return '<div class="couple-check-grid">'+items.map(function(e){ return '<div class="couple-line-card couple-evidence-card"><div class="couple-evidence-label">'+htmlEsc(e.label)+'</div><div class="couple-evidence-value">'+htmlEsc(e.value)+'</div><div class="couple-evidence-note">'+htmlEsc(e.note)+'</div></div>'; }).join('')+'</div>'; }
  window.coupleCheckinTimelineHTML=function(){ var st=window.coupleEnsureCheckinState(); if(!st.reports.length) return '<div class="couple-line-card" style="padding:14px;"><div class="couple-evidence-label">'+CN.timeline+'</div><div class="couple-evidence-note" style="margin-top:6px;">'+CN.noReport+'</div></div>'; return '<div class="couple-line-card couple-timeline" style="padding:14px;"><div class="couple-evidence-label" style="margin-bottom:10px;">'+CN.timeline+'</div>'+st.reports.slice(0,5).map(function(r){ var delta=(r.trustDelta||0)>0?'+'+(r.trustDelta||0):String(r.trustDelta||0); return '<div class="couple-timeline-item"><div class="couple-timeline-title">'+fmtTime(r.at)+' ? <span class="'+riskClass(r.risk)+'">'+riskLabel(r.risk)+'</span> ? '+delta+'</div><div class="couple-timeline-text">'+htmlEsc(r.summary)+'</div></div>'; }).join('')+'</div>'; };

  window.coupleRenderCheckinDashboard=function(){
    var c=partner(); if(!c){ coupleShowSub(CN.checkin,'<div class="couple-check-wrap"><div class="couple-line-card" style="padding:18px;text-align:center;color:#789281;">'+CN.bindFirst+'</div></div>'); return; }
    var st=window.coupleEnsureCheckinState(); var signals=collectSignals(); var previewEvidence=st.reports[0]?st.reports[0].evidence:buildEvidence(signals); var trust=clamp(st.trust||82,0,100);
    var phoneAction=(typeof coupleYouCheckHim==='function'?'coupleYouCheckHim()':'coupleCheckPhone()'); var taAction=(typeof coupleTaTakeover==='function'?'coupleTaTakeover()':'coupleTaCheckYou()');
    var html='<div class="couple-check-wrap"><div class="couple-line-card couple-check-hero"><div class="couple-check-top"><div class="couple-check-avatar">'+avatar(c)+'</div><div style="min-width:0;flex:1;"><div class="couple-check-name">'+htmlEsc(c.name||CN.ta)+'</div><div class="couple-check-meta">'+CN.last+fmtTime(st.lastScan)+'</div></div><div class="couple-trust-ring" style="--trust:'+trust+'%;"><b>'+trust+'</b><span>'+CN.trust+'</span></div></div></div><div class="couple-action-row" style="grid-template-columns:1fr;"><div class="big-btn" onclick="coupleStartCheckinScan()">'+CN.startScan+'</div></div><div class="couple-line-card" style="padding:12px;margin-bottom:12px;"><div class="couple-evidence-label">'+CN.moodTitle+'</div><textarea id="cp-checkin-mood-msg" class="couple-check-input" placeholder="'+CN.moodPlaceholder+'"></textarea><div class="couple-action-row" style="grid-template-columns:1fr;margin-bottom:0;"><div class="big-btn" onclick="coupleCheckinSendMoodMessage()">'+CN.moodSend+'</div></div></div>'+evidenceHTML(previewEvidence)+'<div class="couple-action-row"><div class="big-btn secondary" onclick="'+phoneAction+'">'+CN.viewPhone+'</div><div class="big-btn secondary" onclick="'+taAction+'">'+CN.taCheckMe+'</div></div>'+window.coupleCheckinTimelineHTML()+'</div>';
    coupleShowSub(CN.checkin,html);
  };
  window.coupleCheckin=function(){ window.coupleRenderCheckinDashboard(); };

  window.coupleTaCheckYou=function(){ var c=partner(); var html='<div class="couple-check-wrap"><div class="couple-line-card" style="padding:14px;"><div class="couple-evidence-label">TA '+CN.checkin+'</div><div style="font-size:13px;line-height:1.7;color:#153528;white-space:pre-wrap;margin-top:8px;">'+htmlEsc(window.coupleTaReport())+'</div><div class="couple-action-row" style="grid-template-columns:1fr;margin-bottom:0;"><div class="big-btn" onclick="coupleTaSendReport()">'+CN.sentReport+'</div></div></div>'+evidenceHTML(buildEvidence(collectSignals()))+'</div>'; coupleShowSub((c?c.name:CN.ta)+' '+CN.checkin,html); };
  window.coupleTaReport=function(){ var s=collectSignals(); var scored=scoreReport(s); var lines=[]; lines.push(CN.reportTitle); lines.push(CN.target+contactName(coupleState.partner)); lines.push(CN.risk+riskLabel(scored.risk)); lines.push(CN.result+scored.summary); lines.push('WeChat\uff1a\u5171 '+s.textCount+' \u6761\uff0cTA \u56de\u590d '+s.partnerCount+' \u6761\u3002'); lines.push(CN.phoneActivity+'\u4eca\u65e5\u7ea6 '+s.screenMin+' \u5206\u949f\uff0c\u6d4f\u89c8 '+s.browseCount+' \u6761\u3002'); lines.push(CN.wallet+s.walletText+'\uff0c\u6d41\u6c34 '+s.walletCount+' \u7b14\u3002'); if(s.rivals.length) lines.push(CN.historyBind+s.rivals.join('\u3001')); return lines.join('\n'); };
  window.coupleTaSendReport=function(){ var c=partner(); if(!c){ if(typeof showToast==='function') showToast(CN.bindContact,1500); return; } if(!Array.isArray(c.seed)) c.seed=[]; c.seed.push({mine:false,kind:'text',text:'['+CN.reportTitle+']\n'+window.coupleTaReport(),from:coupleState.partner,ts:typeof nowStamp==='function'?nowStamp():Date.now()}); if(typeof saveChatThread==='function') saveChatThread(coupleState.partner); if(typeof renderThread==='function'&&currentContact===coupleState.partner) renderThread(); if(typeof notifyIncoming==='function') notifyIncoming(c,'['+CN.reportTitle+']'); if(typeof showToast==='function') showToast(CN.sentReport,1300); if(typeof openThread==='function') openThread(coupleState.partner); };
  window.coupleTaHTML=function(tab){ var s=collectSignals(); if(tab==='wechat') return evidenceHTML(buildEvidence(s)); if(tab==='browse') return '<div class="couple-line-card" style="padding:12px;"><div class="couple-evidence-label">'+CN.browse+'</div><input id="cp-browse-add" placeholder="'+CN.addBrowse+'" style="width:100%;box-sizing:border-box;border:1px solid rgba(57,126,89,.14);border-radius:14px;padding:10px;margin:8px 0;font-size:12px;outline:none;"><div class="couple-green-btn" onclick="coupleAddBrowse()" style="text-align:center;cursor:pointer;">'+CN.add+'</div></div>'; if(tab==='notes') return '<div class="couple-line-card" style="padding:12px;">'+CN.notes+' '+s.notes+' \u6761</div>'; if(tab==='diary') return '<div class="couple-line-card" style="padding:12px;">'+CN.diary+' '+s.diary+' \u7bc7</div>'; return '<div class="couple-line-card" style="padding:12px;">'+htmlEsc(tab)+' '+CN.signalIncluded+'</div>'; };
  window.coupleTaTab=function(tab){ var bar=document.getElementById('cp-ta-bar'); var tabs=[['wechat',CN.comprehensive],['browse',CN.browse],['notes',CN.notes],['diary',CN.diary]]; if(bar) bar.innerHTML=tabs.map(function(t){ var active=t[0]===tab; var style='flex:1;text-align:center;padding:9px 4px;border-radius:13px;font-size:11px;font-weight:780;cursor:pointer;'+(active?'color:#16462d;background:#fff;box-shadow:0 7px 18px rgba(42,100,65,0.09);':'color:#5c8770;'); return '<span style="'+style+'" onclick="coupleTaTab(\''+t[0]+'\')">'+t[1]+'</span>'; }).join(''); var box=document.getElementById('cp-ta-content'); if(box) box.innerHTML=window.coupleTaHTML(tab); };
  window.coupleAddBrowse=function(){ var i=document.getElementById('cp-browse-add'); if(!i) return; var v=i.value.trim(); if(!v) return; var d=data(); if(!d.browseUser) d.browseUser=[]; d.browseUser.push({text:v,date:todayKey()}); persist(); window.coupleTaTab('browse'); };
  window.genDailyBrowse=window.genDailyBrowse||function(date){ var pool=['\u60c5\u4fa3\u7ea6\u4f1a\u8def\u7ebf','\u600e\u4e48\u54c4\u604b\u4eba\u751f\u6c14','\u7eaa\u5ff5\u65e5\u793c\u7269\u63a8\u8350','\u9644\u8fd1\u9002\u5408\u804a\u5929\u7684\u5496\u5561\u5e97','\u665a\u5b89\u8bed\u97f3\u600e\u4e48\u8bf4\u81ea\u7136','\u60c5\u4fa3\u7a7a\u95f4\u9690\u79c1\u8bbe\u7f6e']; return pool.slice(0,5).map(function(text){return {text:text,date:date};}); };

  window.coupleRenderMainShell=function(){
    var root=document.getElementById('couple-main'); if(!root) return; root.classList.add('couple-shell-green');
    var c=partner(); var st=window.coupleEnsureCheckinState(); var days=Math.floor((Date.now()-new Date('2026-04-12').getTime())/86400000);
    root.innerHTML='<div class="couple-main-wrap"><div class="couple-hero-card"><div class="couple-pair"><div class="pair-av" id="couple-av-me">'+(typeof userAvatar!=='undefined'&&userAvatar?'<img src="'+userAvatar+'" style="width:100%;height:100%;object-fit:cover;">':'<span style="font-size:13px;font-weight:800;color:#3d9d68;">ME</span>')+'</div><div class="pair-link"></div><div class="pair-av" id="couple-av-partner">'+avatar(c)+'</div></div><div class="couple-hero-title" id="couple-names">'+htmlEsc((typeof userName!=='undefined'?userName:'You')+' & '+(c?c.name:'Partner'))+'</div><div class="couple-hero-sub" id="couple-days">'+CN.together+days+CN.days+' ? '+CN.trust+' '+(st.trust||82)+'</div><div class="couple-mini-stats"><div class="couple-mini-stat"><b>'+(st.reports||[]).length+'</b><span>'+CN.reports+'</span></div><div class="couple-mini-stat"><b>'+(data().diary||[]).length+'</b><span>'+CN.diary+'</span></div><div class="couple-mini-stat"><b>'+(data().shop||[]).length+'</b><span>'+CN.wish+'</span></div></div><div style="margin-top:12px;text-align:center;font-size:11px;color:#3d9d68;font-weight:760;cursor:pointer;" onclick="coupleSwitchPartner()">'+CN.switchPartner+'</div></div><div class="couple-grid-modern"><div class="couple-line-card" onclick="coupleCheckin()"><div class="couple-line-kicker">CHECK</div><div><div class="couple-line-title">'+CN.checkBoard+'</div><div class="couple-line-sub">'+CN.checkBoardSub+'</div></div></div><div class="couple-line-card" onclick="coupleLocation()"><div class="couple-line-kicker">LIVE</div><div><div class="couple-line-title">'+CN.liveLoc+'</div><div class="couple-line-sub">'+CN.liveLocSub+'</div></div></div><div class="couple-line-card" onclick="coupleViewDiary()"><div class="couple-line-kicker">DIARY</div><div><div class="couple-line-title">'+CN.myDiary+'</div><div class="couple-line-sub">'+CN.myDiarySub+'</div></div></div><div class="couple-line-card" onclick="coupleViewNotes()"><div class="couple-line-kicker">MEMO</div><div><div class="couple-line-title">'+CN.memo+'</div><div class="couple-line-sub">'+CN.memoSub+'</div></div></div><div class="couple-line-card" onclick="coupleShop()"><div class="couple-line-kicker">WISH</div><div><div class="couple-line-title">'+CN.wishCart+'</div><div class="couple-line-sub">'+CN.wishCartSub+'</div></div></div><div class="couple-line-card" onclick="coupleFood()"><div class="couple-line-kicker">FOOD</div><div><div class="couple-line-title">'+CN.orderFood+'</div><div class="couple-line-sub">'+CN.orderFoodSub+'</div></div></div><div class="couple-line-card" onclick="coupleScreenTime()"><div class="couple-line-kicker">SCREEN</div><div><div class="couple-line-title">'+CN.screenTime+'</div><div class="couple-line-sub">'+CN.screenTimeSub+'</div></div></div><div class="couple-line-card" onclick="coupleManageContacts()"><div class="couple-line-kicker">CONTACT</div><div><div class="couple-line-title">'+CN.contactManage+'</div><div class="couple-line-sub">'+CN.contactManageSub+'</div></div></div><div class="couple-line-card couple-wide-card" onclick="coupleIcons()"><div class="couple-line-kicker">STYLE</div><div><div class="couple-line-title">'+CN.customIcon+'</div><div class="couple-line-sub">'+CN.customIconSub+'</div></div></div></div></div>';
  };
})();
