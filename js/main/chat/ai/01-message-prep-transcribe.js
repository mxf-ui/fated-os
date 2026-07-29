// 把聊天历史转成可以发给大模型的多模态消息数组
function prepareMessages(contact, cb){
  var raw = [];
  // Skip initial greeting/intro messages from the seed (first 2 messages)
  var seed = contact.seed.length>2 ? contact.seed.slice(2) : contact.seed;
  seed.slice(-30).forEach(function(m){
    if(m.kind==='text'){
      raw.push({role:m.mine?'user':'assistant', content:m.text});
    } else if(m.kind==='photo'){
      if(m.mine && m.text && m.text.indexOf('data:image')===0){
        raw.push({role:'user', content:[{type:'text',text:'[User sent an image]'},{type:'image_url',url:m.text}]});
      } else if(!m.mine && m.text && m.text.indexOf('data:image')===0){
        raw.push({role:'assistant', content:[{type:'text',text:'[sent an image]'},{type:'image_url',url:m.text}]});
      } else {
        raw.push({role:m.mine?'user':'assistant', content:'[sent an image]'});
      }
    } else if(m.kind==='voice'){
      if(m.mine && m.audioUrl && apiConfig.activeModel==='gemini'){
        // Gemini 原生支持音频，直接内联
        raw.push({role:'user', content:[{type:'audio', url:m.audioUrl}]});
      } else if(m.mine && m.audioUrl){
        // 其它模型先标记，稍后转写
        raw.push({role:'user', content:'__VOICE__'+m.audioUrl});
      } else {
        raw.push({role:m.mine?'user':'assistant', content:'[Voice message]'});
      }
    }
  });
  // 转写需要识别的用户语音（OpenAI Whisper）
  var need = raw.filter(function(x){ return typeof x.content==='string' && x.content.indexOf('__VOICE__')===0; });
  if(need.length===0){ cb(raw); return; }
  var last = need[need.length-1];
  var audioUrl = last.content.replace('__VOICE__','');
  transcribeAudio(audioUrl, function(text){
    last.content = text ? ('[用户语音] '+text) : '[用户发送了语音消息]';
    cb(raw);
  });
}

// 调用代理服务器把语音转写成文字（需配置 OpenAI Key）
function transcribeAudio(url, cb){
  var m = apiConfig.models.chatgpt;
  if(!m || !m.key){ cb(''); return; }
  var ep = m.endpoint ? m.endpoint.replace('/v1/chat/completions','/v1/audio/transcriptions') : 'https://api.openai.com/v1/audio/transcriptions';
  fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audio:url, key:m.key, endpoint:ep})})
    .then(function(r){ if(!r.ok) throw new Error('not ok'); return r.json(); }).then(function(d){ cb(d.text||''); })
    .catch(function(){ cb(''); });
}

