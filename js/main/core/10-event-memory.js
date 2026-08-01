/* ============ FATED GLOBAL EVENT MEMORY ============ */
var fatedEventState = (typeof fatedEventState !== 'undefined' && fatedEventState) ? fatedEventState : {version:1, events:[], contactSignals:{}};

function fatedEnsureEventState(){
  if(!fatedEventState || typeof fatedEventState !== 'object') fatedEventState = {version:1, events:[], contactSignals:{}};
  if(!Array.isArray(fatedEventState.events)) fatedEventState.events = [];
  if(!fatedEventState.contactSignals || typeof fatedEventState.contactSignals !== 'object') fatedEventState.contactSignals = {};
  if(!fatedEventState.version) fatedEventState.version = 1;
  return fatedEventState;
}
function fatedEventClip(text, max){
  return String(text == null ? '' : text).replace(/\s+/g, ' ').trim().slice(0, max || 220);
}
function fatedEventContactName(id){
  try{
    var c = contacts && contacts[id] ? contacts[id] : null;
    return c ? (c.displayName || c.name || id) : (id || '');
  }catch(e){ return id || ''; }
}
function fatedEventAppName(id){
  var map = {wechat:'WeChat', moments:'Moments', forum:'Forum', couple:'Couple Space', dream:'Dreamcore', nilflow:'NilFlow', go:'GO Live', novel:'Books', music:'Music', game:'Games', suoha:'Suoha', settings:'Settings'};
  return map[id] || id || 'app';
}
function fatedEventUpdateSignal(e){
  if(!e || !e.contactId) return;
  var st = fatedEnsureEventState();
  var id = e.contactId;
  var sig = st.contactSignals[id] || {contactId:id, name:fatedEventContactName(id), count:0, lastAt:0, apps:{}, topics:[], recent:[]};
  sig.name = fatedEventContactName(id) || sig.name || id;
  sig.count = (sig.count || 0) + 1;
  sig.lastAt = e.at || Date.now();
  if(e.app) sig.apps[e.app] = (sig.apps[e.app] || 0) + 1;
  var text = fatedEventClip(e.text || e.title || e.note || e.kind || '', 90);
  if(text){
    sig.recent.push({kind:e.kind, app:e.app || '', text:text, at:e.at || Date.now()});
    sig.recent = sig.recent.slice(-12);
    var keys = text.split(/[ ,.;:!?，。！？、/|]+/).filter(function(x){ return x && x.length >= 2 && x.length <= 16; }).slice(0, 4);
    keys.forEach(function(k){ if(sig.topics.indexOf(k) < 0) sig.topics.push(k); });
    sig.topics = sig.topics.slice(-16);
  }
  st.contactSignals[id] = sig;
}
function fatedLogEvent(kind, payload, opts){
  try{
    opts = opts || {};
    var st = fatedEnsureEventState();
    var p = payload || {};
    var e = {
      id:'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      kind:String(kind || 'event'),
      app:p.app || opts.app || '',
      contactId:p.contactId || p.fromId || p.toId || '',
      actor:p.actor || '',
      target:p.target || '',
      title:fatedEventClip(p.title || p.name || '', 120),
      text:fatedEventClip(p.text || p.note || p.content || '', 260),
      meta:p.meta && typeof p.meta === 'object' ? p.meta : null,
      at:p.at || Date.now()
    };
    st.events.push(e);
    if(st.events.length > 800) st.events = st.events.slice(-800);
    fatedEventUpdateSignal(e);
    if(typeof fatedDBSaveKV === 'function') fatedDBSaveKV('fated_event_state', st);
    if(opts.saveCore && typeof saveState === 'function' && (typeof isPersistenceBooting !== 'function' || !isPersistenceBooting())) saveState();
    return e;
  }catch(err){
    try{ console.warn('[Fated event memory] log failed', err); }catch(_e){}
    return null;
  }
}
function fatedEventLine(e){
  if(!e) return '';
  var app = e.app ? fatedEventAppName(e.app) : '';
  var who = e.contactId ? fatedEventContactName(e.contactId) : (e.actor || '');
  var body = e.text || e.title || e.kind;
  var prefix = [app, who].filter(Boolean).join(' / ');
  return (prefix ? prefix + ': ' : '') + e.kind + (body ? ' - ' + body : '');
}
function fatedContactMemoryContext(contactId){
  var st = fatedEnsureEventState();
  var sig = st.contactSignals && st.contactSignals[contactId];
  if(!sig) return '';
  var recent = (sig.recent || []).slice(-8).map(function(x){ return '- '+fatedEventLine({kind:x.kind, app:x.app, contactId:contactId, text:x.text}); }).join('\n');
  return [
    '[Cross-app relationship signals]',
    'contact: '+(sig.name || contactId),
    'interactionCount: '+(sig.count || 0),
    'topics: '+(sig.topics || []).slice(-10).join(', '),
    recent
  ].filter(Boolean).join('\n');
}
function fatedGlobalContextPrompt(contactId, opts){
  opts = opts || {};
  var st = fatedEnsureEventState();
  var limit = Math.max(4, Math.min(30, opts.limit || 16));
  var events = st.events.slice(-limit);
  if(contactId){
    var related = st.events.filter(function(e){ return e.contactId === contactId; }).slice(-8);
    var seen = {};
    events.concat(related).forEach(function(e){ seen[e.id] = e; });
    events = Object.keys(seen).map(function(k){ return seen[k]; }).sort(function(a,b){ return (a.at || 0) - (b.at || 0); }).slice(-limit);
  }
  var lines = events.map(function(e){ return '- '+fatedEventLine(e); }).filter(Boolean);
  var signal = contactId ? fatedContactMemoryContext(contactId) : '';
  if(!lines.length && !signal) return '';
  return [
    '[Fated OS cross-app memory]',
    'Use this as lived phone history and relationship context. React naturally to relevant facts, avoid repeating one topic, and never say you are using logs.',
    lines.join('\n'),
    signal
  ].filter(Boolean).join('\n');
}
function fatedRestoreEventState(saved){
  if(saved && typeof saved === 'object') fatedEventState = saved;
  return fatedEnsureEventState();
}
fatedEnsureEventState();
