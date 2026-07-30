function imageGenEnsureConfig(){
  if(typeof apiConfig==='undefined') return null;
  apiConfig.imageGen = apiConfig.imageGen || {};
  var c = apiConfig.imageGen;
  if(typeof c.enabled !== 'boolean') c.enabled = false;
  if(!c.provider) c.provider = 'pollinations';
  if(!c.endpoint) c.endpoint = c.provider === 'pollinations' ? 'https://image.pollinations.ai' : '';
  if(c.key === undefined) c.key = '';
  if(!c.model) c.model = c.provider === 'pollinations' ? 'flux' : 'gpt-image-1';
  if(!c.size) c.size = 'portrait';
  if(!c.style) c.style = 'cinematic mobile illustration, soft green light, delicate details, clean composition, no text in image';
  if(c.negative === undefined) c.negative = 'low quality, blurry, watermark, extra text, distorted hands';
  if(c.lastPreview === undefined) c.lastPreview = '';
  return c;
}
function imageGenReady(){
  var c = imageGenEnsureConfig();
  if(!c || !c.enabled) return false;
  if(c.provider === 'pollinations') return true;
  return !!(c.endpoint && c.key && c.model);
}
function imageGenSizePreset(size){
  if(size === 'landscape') return {width:1280, height:768};
  if(size === 'square') return {width:1024, height:1024};
  return {width:768, height:1280};
}
function imageGenStripEmoji(text){
  return String(text || '').replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/\s+/g, ' ').trim();
}
function imageGenBuildPrompt(ctx){
  var c = imageGenEnsureConfig() || {};
  ctx = ctx || {};
  var parts = [];
  if(c.style) parts.push('global visual style: '+c.style);
  if(ctx.role) parts.push('subject or role: '+ctx.role);
  if(ctx.persona) parts.push('persona: '+ctx.persona);
  if(ctx.world) parts.push('world context: '+ctx.world);
  if(ctx.text) parts.push('scene content: '+ctx.text);
  parts.push('high quality mobile web illustration, atmospheric but clear, no visible text, no watermark');
  return imageGenStripEmoji(parts.join('\n')).slice(0, 1800);
}
function imageGenGenerate(ctx, cb){
  var c = imageGenEnsureConfig();
  if(!imageGenReady()){ if(cb) cb(null); return; }
  ctx = ctx || {};
  var body = {
    provider:c.provider,
    endpoint:c.endpoint,
    key:c.key,
    model:c.model,
    size:ctx.size || c.size,
    prompt:imageGenBuildPrompt(ctx),
    negative:c.negative || '',
    width:imageGenSizePreset(ctx.size || c.size).width,
    height:imageGenSizePreset(ctx.size || c.size).height
  };
  fetch('/api/image', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)})
    .then(function(r){ return r.json().then(function(d){ return {ok:r.ok, status:r.status, data:d}; }); })
    .then(function(res){
      if(!res.ok || !res.data || !res.data.url) throw new Error((res.data && res.data.error) || ('HTTP '+res.status));
      if(cb) cb(res.data);
    })
    .catch(function(e){ try{ console.warn('[imageGen]', e); }catch(_e){} if(cb) cb(null); });
}
function imageGenMaybeAttachChatIllustration(contact, chatTarget, chatId, fromId, reply){
  if(!contact || contact.imageGenEnabled !== true || !chatTarget || !Array.isArray(chatTarget.seed)) return;
  if(!imageGenReady()) return;
  imageGenGenerate({
    source:'wechat',
    text:reply,
    persona:(contact.persona || contact.tone || ''),
    world:(typeof getWorldBookPrompt === 'function' ? getWorldBookPrompt(fromId) : ''),
    role:(contact.displayName || contact.name || 'WeChat contact'),
    size:'portrait'
  }, function(res){
    if(!res || !res.url || !chatTarget || !Array.isArray(chatTarget.seed)) return;
    chatTarget.seed.push({mine:false, kind:'photo', text:res.url, from:fromId, ts:typeof nowStamp==='function'?nowStamp():Date.now(), generated:true});
    if(typeof renderThread === 'function') renderThread();
    if(typeof saveChatThread === 'function') saveChatThread(chatId);
    if(typeof saveState === 'function') saveState();
  });
}
