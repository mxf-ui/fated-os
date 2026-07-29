/* ============ 导出聊天记录 ============ */
function exportChatHistory(contactId){
  var id = contactId || currentContact;
  var c = contacts[id]; if(!c) return;
  var msgs = c.seed || [];
  if(msgs.length===0){ showToast('没有聊天记录可导出', 1500); return; }
  var dateStr = new Date().toLocaleDateString('zh-CN').replace(/\//g,'-');
  var timeStr = new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
  /* 生成 HTML 格式的聊天记录 */
  var html = '<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8">';
  html += '<meta name="viewport" content="width=device-width,initial-scale=1.0">';
  html += '<title>聊天记录 - '+esc(c.name)+' - '+dateStr+'</title>';
  html += '<style>';
  html += '*{box-sizing:border-box;margin:0;padding:0;}';
  html += 'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f5;min-height:100vh;padding:20px;}';
  html += '.container{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);}';
  html += '.header{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:24px;text-align:center;}';
  html += '.header h1{font-size:20px;margin-bottom:4px;}';
  html += '.header p{font-size:13px;opacity:0.8;}';
  html += '.chat-body{padding:16px;}';
  html += '.msg{display:flex;margin:10px 0;gap:8px;}';
  html += '.msg.mine{flex-direction:row-reverse;}';
  html += '.av{width:36px;height:36px;border-radius:8px;flex:none;background:#e0e0e0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;}';
  html += '.bubble{max-width:70%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;word-break:break-word;}';
  html += '.bubble.mine{background:#95ec69;color:#000;border-radius:14px 14px 4px 14px;}';
  html += '.bubble.theirs{background:#f5f5f5;color:#000;border-radius:14px 14px 14px 4px;}';
  html += '.bubble img{max-width:180px;max-height:180px;border-radius:8px;display:block;}';
  html += '.sys{text-align:center;font-size:11px;color:#999;margin:8px 0;}';
  html += '.time{font-size:10px;color:#999;margin:2px 4px;}';
  html += '.msg.mine .time{text-align:right;}';
  html += '.footer{text-align:center;padding:16px;font-size:11px;color:#999;border-top:1px solid #eee;}';
  html += '</style></head><body>';
  html += '<div class="container">';
  html += '<div class="header"><h1>💬 与 '+esc(c.name)+' 的聊天记录</h1>';
  html += '<p>导出时间：'+dateStr+' '+timeStr+' · 共 '+msgs.length+' 条消息</p></div>';
  html += '<div class="chat-body">';
  msgs.forEach(function(m){
    if(m.kind==='typing') return; /* 跳过 typing 状态 */
    if(m.kind==='pat' || (!m.kind && !m.text)){ html += '<div class="sys">'+esc(m.text||'')+'</div>'; return; }
    if(m.kind==='pat'){ html += '<div class="sys">'+esc(m.text||'')+'</div>'; return; }
    var isMine = !!m.mine;
    var name = isMine ? (userName||'我') : c.name;
    var initial = (name||'?').charAt(0);
    var avColor = isMine ? '#667eea' : '#764ba2';
    var timeStr2 = m.ts ? new Date(m.ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '';
    html += '<div class="msg'+(isMine?' mine':'')+'">';
    html += '<div class="av" style="background:'+avColor+';">'+esc(initial)+'</div>';
    html += '<div><div class="bubble '+(isMine?'mine':'theirs')+'">';
    if(m.kind==='photo'){
      html += '<img src="'+m.text+'" alt="[图片]">';
    } else if(m.kind==='sticker'){
      if(m.stype==='image'){ html += '<img src="'+m.text+'" alt="[表情]" style="width:80px;height:80px;object-fit:cover;">'; }
      else { html += esc(m.text||''); }
    } else if(m.kind==='voice'){
      html += '🎤 语音消息 ('+(m.dur||3)+'″)';
    } else if(m.kind==='card'){
      if(m.cardType==='transfer') html += '💰 转账 ¥'+(m.amount||0)+'.00';
      else if(m.cardType==='family') html += '💳 亲属卡';
      else if(m.cardType==='gift') html += '🎁 礼物：'+esc(m.name||'');
      else if(m.cardType==='order') html += '🍔 外卖：'+esc(m.name||'');
      else if(m.cardType==='loc') html += '📍 实时位置';
      else html += '📋 卡片';
    } else {
      html += esc(m.text||'');
    }
    html += '</div>';
    if(timeStr2) html += '<div class="time">'+timeStr2+'</div>';
    html += '</div></div>';
  });
  html += '</div>';
  html += '<div class="footer">由 Fated OS 导出 · '+dateStr+' '+timeStr+'</div>';
  html += '</div></body></html>';
  /* 下载文件 */
  var blob = new Blob([html], {type:'text/html;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '聊天记录_'+c.name+'_'+dateStr+'.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  showToast('聊天记录已导出', 1500);
}

