function resetIdleTimer(){
  var c=contacts[currentContact];
  if(c.idleTimer) clearTimeout(c.idleTimer);
  c.idleTimer=setTimeout(function(){
    if(c.isGroup){ if(c.proactive===false) return; var m=c.members[Math.floor(Math.random()*c.members.length)]; var mc=contacts[m]; if(mc && mc.proactive!==false && canProactive(mc)){ incProactive(mc); realAISpeak(mc,m,null,c); maybeSummarizeAfter(currentContact); } }
    else { if(c.proactive!==false && canProactive(c)){ incProactive(c); realAISpeak(c,null,c.jealous?idleLines.jealous:idleLines.normal); maybeSummarizeAfter(currentContact); } }
  },IDLE_MS);
}
function triggerIdleDemo(){
  var c=contacts[currentContact];
  if(c.isGroup){ if(c.proactive===false) return; var m=c.members[Math.floor(Math.random()*c.members.length)]; var mc=contacts[m]; if(mc && mc.proactive!==false && canProactive(mc)){ incProactive(mc); realAISpeak(mc,m,null,c); maybeSummarizeAfter(currentContact); } }
  else { if(c.proactive!==false && canProactive(c)){ incProactive(c); realAISpeak(c,null,c.jealous?idleLines.jealous:idleLines.normal); maybeSummarizeAfter(currentContact); } }
}
function demoSendCard(type){ const c=contacts[currentContact]; if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; aiSendCard(type, m); } else aiSendCard(type); }
function demoSticker(){ const c=contacts[currentContact]; if(c.isGroup){ const m=c.members[Math.floor(Math.random()*c.members.length)]; aiSendStickerDemo(contacts[m], m); } else aiSendStickerDemo(c); }

