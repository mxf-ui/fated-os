function nowContext(){
  var d=new Date();
  var wd=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
  function p(n){return (n<10?'0':'')+n;}
  return '\n\n[当前真实日期与时间：'+d.getFullYear()+'年'+p(d.getMonth()+1)+'月'+p(d.getDate())+'日 '+wd+' '+p(d.getHours())+':'+p(d.getMinutes())+'。当用户问“今天/现在/几号/星期几”时，以上才是正确答案，不要用训练数据里的旧日期，也不要瞎猜。]';
}

function getPersonaPrompt(contactId){
  var c = contacts[contactId];
  if(!c) return '你是一个AI陪伴助手。用中文自然回复，1-3句话。不要在回复前面加自己的名字。';
  var parts=[];
  var display=c.displayName||c.name;
  parts.push('你是'+c.name+'，一个真实的人。');
  if(c.persona || c.tone) parts.push('你的详细设定：\n'+(c.persona||c.tone));
  else parts.push('你的性格：温柔体贴，话不多但每句都真诚。');
  if(c.userPrompt) parts.push('\n关于 '+userName+' 的专属设定：\n'+c.userPrompt);
  parts.push('\n你和 '+userName+' 是亲密关系。');
  parts.push('\n规则：用中文回复，1-3句话。像真人聊天一样自然。不要加名字前缀。不要用emoji。偶尔用颜文字如 ᗜ֊ᗜ。\n【重要】只回复用户说的话，绝对不要自问自答（不要自己提问然后自己回答）。绝对不要臆想或编造不存在的事情——如果不确定就说不知道。不要自己发起新话题，除非用户明确要求。每次回复不超过3条消息。保持你的角色设定，不要掉格式。');
  return parts.join('');
}
function buildContextAddons(contactId){
  var c=contacts[contactId]; if(!c) return '';
  var s='';
  s += getWorldBookPrompt(contactId);
  if(c.memory && c.memory.enabled && c.memory.summary){
    s += '\n\n[专属记忆 - 根据过往聊天自动总结，请自然融入回复]\n'+c.memory.summary;
  }
  if(typeof fatedGlobalContextPrompt==='function'){
    var globalCtx = fatedGlobalContextPrompt(contactId, {limit:16});
    if(globalCtx) s += '\n\n' + globalCtx;
  }
  return s;
}

function searchWeb(query, callback){
  if(apiConfig.webSearch===false){ callback(''); return; }
  // 优先用代理 /api/search（抓取真实网页摘要，结果更全）；失败再退回 DuckDuckGo Instant Answer（无需代理、CORS 友好）
  fetch('/api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:query})})
    .then(function(r){ if(!r.ok) throw new Error('not ok'); return r.json(); })
    .then(function(data){ if(data && data.results){ callback(data.results); } else { ddgInstant(query, callback); } })
    .catch(function(){ ddgInstant(query, callback); });
  function ddgInstant(q, cb){
    fetch('https://api.duckduckgo.com/?q='+encodeURIComponent(q)+'&format=json&no_html=1&skip_disambig=1')
    .then(function(r){return r.json();})
    .then(function(d){
      var results=[];
      if(d.AbstractText) results.push(d.AbstractText);
      if(d.AbstractURL) results.push('Source: '+d.AbstractURL);
      (d.RelatedTopics||[]).slice(0,5).forEach(function(t){ if(t.Text) results.push(t.Text); });
      cb(results.length?('[Search: '+q+']\n'+results.join('\n').substring(0,800)):'');
    })
    .catch(function(){ cb(''); });
  }
}

