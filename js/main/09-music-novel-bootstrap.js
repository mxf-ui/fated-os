/* ============ MUSIC PLAYER (Enjoy 音乐) ============ */
// ============ MUSIC PLAYER (网易云一起听) ============
// 用 IndexedDB 存音频 Blob 和封面/背景/歌词，避免 localStorage 放不下大文件
var musicDB = null;
function musicOpenDB(cb){
  if(musicDB) return cb(musicDB);
  var req = indexedDB.open('FatedMusicDB',1);
  req.onupgradeneeded = function(e){
    var db = e.target.result;
    if(!db.objectStoreNames.contains('songs')) db.createObjectStore('songs',{keyPath:'id'});
    if(!db.objectStoreNames.contains('settings')) db.createObjectStore('settings',{keyPath:'key'});
  };
  req.onsuccess = function(e){ musicDB = e.target.result; cb(musicDB); };
  req.onerror = function(){ cb(null); };
}
function musicPutSong(song,cb){ musicOpenDB(function(db){ if(!db)return cb&&cb(); var tx=db.transaction('songs','readwrite'); tx.objectStore('songs').put(song); tx.oncomplete=function(){ cb&&cb(); }; tx.onerror=function(){ cb&&cb(); }; }); }
function musicDelSong(id,cb){ musicOpenDB(function(db){ if(!db)return cb&&cb(); var tx=db.transaction('songs','readwrite'); tx.objectStore('songs').delete(id); tx.oncomplete=function(){ cb&&cb(); }; }); }
function musicGetSongs(cb){ musicOpenDB(function(db){ if(!db)return cb([]); var tx=db.transaction('songs','readonly'); var req=tx.objectStore('songs').getAll(); req.onsuccess=function(e){ cb(e.target.result||[]); }; req.onerror=function(){ cb([]); }; }); }
function musicGetSetting(key,cb){ musicOpenDB(function(db){ if(!db)return cb(null); var tx=db.transaction('settings','readonly'); var req=tx.objectStore('settings').get(key); req.onsuccess=function(e){ cb(e.target.result?e.target.result.value:null); }; req.onerror=function(){ cb(null); }; }); }
function musicSetSetting(key,value,cb){ musicOpenDB(function(db){ if(!db)return cb&&cb(); var tx=db.transaction('settings','readwrite'); tx.objectStore('settings').put({key,value}); tx.oncomplete=function(){ cb&&cb(); }; }); }

var musicState = { songs:[], idx:0, playing:false, contact:'', bg:null, audio:null, currentBlobUrl:null, listeningDays:0, startDate:null };

function initMusicPlayer(){
  renderMusicCouple();
  if(!musicState.audio){
    var a = document.createElement('audio');
    a.onended = function(){ musicNext(); };
    a.ontimeupdate = function(){ updateMusicUI(); };
    a.onloadedmetadata = function(){ updateMusicUI(); };
    a.oncanplay = function(){ if(musicState.playing){ a.play().catch(function(){}); } };
    a.onerror = function(){ showToast('音频加载失败，请检查文件格式', 1500); musicState.playing=false; updateMusicUI(); };
    musicState.audio = a;
  }
  musicGetSongs(function(songs){
    musicState.songs = songs;
    musicGetSetting('bg',function(bg){ musicState.bg = bg; applyMusicBg(); });
    musicGetSetting('contact',function(c){
      if(c && contacts[c]) musicState.contact = c;
      musicGetSetting('startDate',function(d){
        musicState.startDate = d;
        renderMusicCouple();
        renderMusicPlaylist();
        updateMusicUI();
      });
    });
  });
}

function applyMusicBg(){
  var el = document.getElementById('music-bg');
  if(!el) return;
  if(musicState.bg){
    el.style.backgroundImage = 'url('+musicState.bg+')';
    el.classList.add('has-img');
  } else {
    el.style.backgroundImage = '';
    el.classList.remove('has-img');
  }
}

function renderMusicCouple(){
  var uAv = document.getElementById('music-user-av');
  var pAv = document.getElementById('music-partner-av');
  var uName = document.getElementById('music-user-name');
  var pName = document.getElementById('music-partner-name');
  var meta = document.getElementById('music-couple-meta');
  if(uName) uName.textContent = (typeof userName!=='undefined' && userName) ? userName : '我';
  if(pName) pName.textContent = (musicState.contact && contacts[musicState.contact]) ? (contacts[musicState.contact].name||'TA') : '选择玩伴';
  if(uAv){
    if(typeof userAvatar!=='undefined' && userAvatar){ uAv.innerHTML = '<img src="'+esc(userAvatar)+'" alt="">'; }
    else { uAv.innerHTML = '<div style="width:100%;height:100%;">'+avatarHTML('','')+'</div>'; }
  }
  if(pAv){
    if(musicState.contact && contacts[musicState.contact]){
      var c = contacts[musicState.contact];
      if(c.avatar){ pAv.innerHTML = '<img src="'+esc(c.avatar)+'" alt="">'; }
      else { pAv.innerHTML = '<div style="width:100%;height:100%;">'+avatarHTML(c.tone, c.avatarColor)+'</div>'; }
    }
    else { pAv.innerHTML = '<div style="font-size:20px;opacity:.5;">?</div>'; }
  }
  var days = 0;
  if(musicState.startDate){
    days = Math.max(1, Math.floor((Date.now() - new Date(musicState.startDate).getTime()) / 86400000));
  }
  if(meta) meta.textContent = '相距很远很远，一起听了'+days+'天';
}

function renderMusicPlaylist(){
  var rows = document.getElementById('music-playlist-rows');
  if(!rows) return;
  if(musicState.songs.length===0){
    rows.innerHTML = '<div style="text-align:center;padding:20px 0;font-size:12px;opacity:.5;">暂无歌曲，点击下方导入</div>';
    return;
  }
  rows.innerHTML = musicState.songs.map(function(s,i){
    var cls = i===musicState.idx ? ' active' : '';
    return '<div class="row'+cls+'" onclick="musicSelect('+i+');toggleMusicPlaylist(false);"><div class="idx">'+(i+1)+'</div><div class="info"><div class="t">'+esc(s.title)+'</div><div class="a">'+esc(s.artist)+'</div></div></div>';
  }).join('');
}

function musicSelect(i){
  if(musicState.songs.length===0) return;
  musicState.idx = i;
  musicState.playing = true;
  updateMusicUI();
  renderMusicPlaylist();
  musicLoadCurrent(function(){
    if(musicState.audio && musicState.audio.src){
      musicState.audio.play().then(function(){
        updateMusicUI();
      }).catch(function(e){
        // iOS/Safari需要用户交互才能播放，显示提示
        showToast('点击播放按钮开始播放', 1500);
        musicState.playing = false;
        updateMusicUI();
      });
    }
  });
  if(musicState.contact) musicAIComment();
}

function musicLoadCurrent(cb){
  var s = musicState.songs[musicState.idx];
  if(!s) return cb&&cb();
  if(musicState.currentBlobUrl){ URL.revokeObjectURL(musicState.currentBlobUrl); musicState.currentBlobUrl = null; }
  musicGetSongs(function(songs){
    var full = songs.find(function(x){ return x.id===s.id; });
    if(full && full.audioBuffer){
      var blob = new Blob([full.audioBuffer], {type: s.mime || 'audio/mpeg'});
      musicState.currentBlobUrl = URL.createObjectURL(blob);
      musicState.audio.src = musicState.currentBlobUrl;
    } else {
      musicState.audio.removeAttribute('src');
    }
    if(cb) cb();
  });
}

function musicToggle(){
  if(musicState.songs.length===0){ openMusicMenu(); return; }
  if(!musicState.audio || !musicState.audio.src){
    musicSelect(musicState.idx);
    return;
  }
  if(musicState.playing){
    musicState.audio.pause();
    musicState.playing = false;
  } else {
    musicState.audio.play().then(function(){
      musicState.playing = true;
      updateMusicUI();
    }).catch(function(e){
      showToast('播放失败，请重新选择歌曲', 1500);
    });
    musicState.playing = true;
  }
  updateMusicUI();
}

function musicPrev(){
  if(musicState.songs.length===0) return;
  musicState.idx = (musicState.idx - 1 + musicState.songs.length) % musicState.songs.length;
  musicSelect(musicState.idx);
}

function musicNext(){
  if(musicState.songs.length===0) return;
  musicState.idx = (musicState.idx + 1) % musicState.songs.length;
  musicSelect(musicState.idx);
}

function musicSeek(e){
  if(!musicState.audio || !musicState.audio.duration) return;
  var rect = e.currentTarget.getBoundingClientRect();
  var pct = (e.clientX - rect.left) / rect.width;
  musicState.audio.currentTime = Math.max(0, Math.min(1, pct)) * musicState.audio.duration;
  updateMusicUI();
}

function formatMusicTime(sec){
  if(!isFinite(sec) || sec<0) return '0:00';
  var m = Math.floor(sec/60), s = Math.floor(sec%60);
  return m+':'+('0'+s).slice(-2);
}

function updateMusicUI(){
  var s = musicState.songs[musicState.idx];
  var empty = document.getElementById('music-empty');
  if(empty) empty.style.display = musicState.songs.length===0 ? 'flex' : 'none';
  if(!s){
    document.getElementById('music-title').textContent = '暂无歌曲';
    document.getElementById('music-artist').textContent = '导入本地音乐开始一起听';
    document.getElementById('music-fill').style.width = '0%';
    document.getElementById('music-cur').textContent = '0:00';
    document.getElementById('music-dur').textContent = '0:00';
    document.getElementById('music-disc-inner').style.backgroundImage = '';
    document.getElementById('music-lyrics').innerHTML = '<div class="line active">点击 ⋮ 导入本地音乐和歌词</div>';
    document.getElementById('music-disc').classList.remove('playing');
    var st = document.getElementById('music-status'); var st2 = document.getElementById('music-status2');
    if(st) st.textContent='准备一起听'; if(st2) st2.textContent='准备一起听';
    var btn = document.getElementById('music-play-btn'); if(btn) btn.innerHTML = '<div class="tri"></div>';
    return;
  }
  document.getElementById('music-title').textContent = s.title;
  document.getElementById('music-artist').textContent = s.artist;
  var disc = document.getElementById('music-disc');
  var inner = document.getElementById('music-disc-inner');
  if(inner) inner.style.backgroundImage = s.cover ? 'url('+s.cover+')' : '';
  if(disc) disc.classList.toggle('playing', musicState.playing);
  var cur=0, dur=0, pct=0;
  if(musicState.audio && musicState.audio.duration){
    cur = musicState.audio.currentTime||0; dur = musicState.audio.duration||0; pct = dur ? (cur/dur)*100 : 0;
  }
  document.getElementById('music-fill').style.width = pct+'%';
  document.getElementById('music-cur').textContent = formatMusicTime(cur);
  document.getElementById('music-dur').textContent = formatMusicTime(dur);
  var btn = document.getElementById('music-play-btn');
  if(btn){ btn.innerHTML = musicState.playing ? '<div class="pause-bars"><span></span><span></span></div>' : '<div class="tri"></div>'; }
  var st = document.getElementById('music-status'); var st2 = document.getElementById('music-status2');
  var statusText = musicState.playing ? '正在播放…' : '已暂停';
  if(st) st.textContent = statusText; if(st2) st2.textContent = statusText;
  updateMusicLyrics(cur);
}

function updateMusicLyrics(time){
  var s = musicState.songs[musicState.idx];
  var box = document.getElementById('music-lyrics');
  if(!box) return;
  if(!s || !s.lyrics || s.lyrics.length===0){
    box.innerHTML = '<div class="line active">一起听 · '+esc(s?s.title:'')+'</div>';
    return;
  }
  var idx = 0;
  for(var i=0;i<s.lyrics.length;i++){ if(s.lyrics[i].time <= time) idx = i; else break; }
  var line = s.lyrics[idx].text || '...';
  var next = s.lyrics[idx+1] ? s.lyrics[idx+1].text : '';
  box.innerHTML = '<div class="line">'+esc(next)+'</div><div class="line active">'+esc(line)+'</div>';
}

function parseLrc(text){
  var lines = (text||'').split(/\r?\n/);
  var out = [];
  var re = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  for(var i=0;i<lines.length;i++){
    var m = re.exec(lines[i].trim());
    if(m){
      var min = parseInt(m[1],10), sec = parseInt(m[2],10), ms = parseInt((m[3]||'0').padEnd(3,'0'),10);
      var time = min*60 + sec + ms/1000;
      var txt = m[4].trim();
      if(txt) out.push({time, text:txt});
    }
  }
  return out.sort(function(a,b){ return a.time-b.time; });
}

function musicTriggerImport(type){
  closeMusicMenu();
  var id = 'music-import-'+type;
  var el = document.getElementById(id);
  if(el){ el.value=''; el.click(); }
}

function musicImportAudio(input){
  var file = input.files && input.files[0];
  if(!file) return;
  showToast('正在导入《'+file.name+'》…', 1500);
  var reader = new FileReader();
  reader.onload = function(e){
    var buf = e.target.result;
    var parsed = parseMusicFilename(file.name);
    var song = { id:'song_'+Date.now()+'_'+Math.random().toString(36).slice(2,8), title:parsed.title, artist:parsed.artist, mime:file.type||'audio/mpeg', lyrics:[], cover:null, created:Date.now() };
    musicPutSong({id:song.id, title:song.title, artist:song.artist, mime:song.mime, lyrics:song.lyrics, cover:song.cover, created:song.created, audioBuffer:buf}, function(){
      musicState.songs.push(song);
      if(!musicState.startDate){
        musicState.startDate = new Date().toISOString();
        musicSetSetting('startDate', musicState.startDate);
      }
      musicState.idx = musicState.songs.length-1;
      musicState.playing = true;
      renderMusicPlaylist();
      renderMusicCouple();
      musicSelect(musicState.idx);
      showToast('已导入：'+song.title+'，点击播放', 2000);
    });
  };
  reader.onerror = function(){ showToast('文件读取失败', 1500); };
  reader.readAsArrayBuffer(file);
}

function parseMusicFilename(name){
  var base = name.replace(/\.[^.]+$/,'').trim();
  var m = base.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if(m){ return {title:m[2].trim(), artist:m[1].trim()}; }
  return {title:base||'未命名歌曲', artist:'未知歌手'};
}

function musicImportLrc(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var s = musicState.songs[musicState.idx];
  if(!s){ showToast('先选择或导入一首歌曲',2000); return; }
  var reader = new FileReader();
  reader.onload = function(e){
    var text = e.target.result;
    s.lyrics = parseLrc(text);
    musicPutSong({id:s.id, title:s.title, artist:s.artist, mime:s.mime, lyrics:s.lyrics, cover:s.cover, created:s.created}, function(){
      updateMusicUI();
      showToast('歌词已绑定到：'+s.title, 2000);
    });
  };
  reader.readAsText(file,'utf-8');
}

function musicImportBg(input){
  var file = input.files && input.files[0];
  if(!file) return;
  compressImage(file, 1280, 0.82, function(res){
    if(!res) return;
    musicState.bg = res;
    musicSetSetting('bg', res);
    applyMusicBg();
    showToast('背景已更换',1500);
  });
}

function musicImportCover(input){
  var file = input.files && input.files[0];
  if(!file) return;
  var s = musicState.songs[musicState.idx];
  if(!s){ showToast('先选择或导入一首歌曲',2000); return; }
  compressImage(file, 512, 0.85, function(res){
    if(!res) return;
    s.cover = res;
    musicPutSong({id:s.id, title:s.title, artist:s.artist, mime:s.mime, lyrics:s.lyrics, cover:s.cover, created:s.created}, function(){
      updateMusicUI();
      showToast('封面已更新',1500);
    });
  });
}

function openMusicMenu(){
  var back = document.getElementById('music-menu-back');
  var menu = document.getElementById('music-menu');
  if(back) back.classList.add('show');
  if(menu) menu.classList.add('show');
}
function closeMusicMenu(){
  var back = document.getElementById('music-menu-back');
  var menu = document.getElementById('music-menu');
  if(back) back.classList.remove('show');
  if(menu) menu.classList.remove('show');
}
function musicOpenNetease(){
  closeMusicMenu();
  // 提示用户：网易云用于搜索歌曲，本地播放器仍可用
  showToast('正在打开网易云音乐网页…导入本地歌曲请用「导入本地音乐」', 2000);
  setTimeout(function(){ window.open('https://music.163.com/','_blank'); }, 500);
}
function toggleMusicPlaylist(show){
  var el = document.getElementById('music-playlist');
  if(!el) return;
  if(typeof show==='undefined') show = !el.classList.contains('show');
  el.classList.toggle('show', show);
}

function musicDeleteCurrent(){
  closeMusicMenu();
  if(musicState.songs.length===0) return;
  var s = musicState.songs[musicState.idx];
  if(musicState.audio){ musicState.audio.pause(); musicState.audio.removeAttribute('src'); }
  if(musicState.currentBlobUrl){ URL.revokeObjectURL(musicState.currentBlobUrl); musicState.currentBlobUrl=null; }
  musicState.playing = false;
  musicDelSong(s.id, function(){
    musicState.songs.splice(musicState.idx,1);
    if(musicState.idx >= musicState.songs.length) musicState.idx = Math.max(0, musicState.songs.length-1);
    renderMusicPlaylist();
    updateMusicUI();
    showToast('已删除《'+s.title+'》', 1500);
  });
}

function openMusicContact(){
  closeMusicMenu();
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup; });
  if(ids.length===0){ showToast('没有可选的联系人', 1500); return; }
  // 构建联系人选择浮层
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:300;display:flex;align-items:flex-end;justify-content:center;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:420px;padding:16px 16px calc(env(safe-area-inset-bottom) + 20px);max-height:70vh;overflow-y:auto;';
  var html = '<div style="font-size:15px;font-weight:800;margin-bottom:12px;text-align:center;">选择一起听歌的玩伴</div>';
  ids.forEach(function(k){
    var c = contacts[k];
    var sel = musicState.contact===k;
    html += '<div class="contact-row" onclick="musicPickContact(\''+k+'\')" style="cursor:pointer;padding:10px;border-radius:12px;'+(sel?'background:rgba(125,90,140,0.1);':'')+'">'+
      '<div class="av glass-strong" style="overflow:hidden;">'+contactAvatar(c)+'</div>'+
      '<div style="flex:1;"><div class="name">'+esc(c.name)+'</div><div class="habit">'+(sel?'已选择':'点击选择')+'</div></div>'+
      (sel?'<span style="color:var(--plum-deep);font-weight:800;">✓</span>':'')+
      '</div>';
  });
  html += '<div class="big-btn" style="margin-top:12px;" onclick="this.parentElement.parentElement.remove()">关闭</div>';
  sheet.innerHTML = html;
  overlay.appendChild(sheet);
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}
function musicPickContact(k){
  if(!contacts[k]) return;
  musicState.contact = k;
  musicSetSetting('contact', k);
  renderMusicCouple();
  // 移除选择浮层
  var overlay = document.querySelector('div[style*="z-index:300"]');
  if(overlay) overlay.remove();
  if(musicState.playing) musicAIComment();
  showToast('已选择「'+contacts[k].name+'」一起听歌', 1500);
}

function musicAIComment(){
  var s = musicState.songs[musicState.idx];
  var c = contacts[musicState.contact];
  if(!s || !c) return;
  var lines = [
    '这首《'+s.title+'》我也很喜欢。','这首歌的节奏感真棒。','一起听感觉真好',
    '这个歌手我超爱的！','好听，再放一遍吧。','这首歌让我想起你了。'
  ];
  var el = document.getElementById('novel-ai-msg');
  if(el){ el.textContent = c.name+'：'+lines[Math.floor(Math.random()*lines.length)]; el.style.opacity='1'; }
}

/* ============ NOVEL READER (小土豆小说) ============ */
var novelState = { text:'', title:'', pages:[], pageIdx:0, contact:'', chatMsgs:[], progressTimer:null, charsPerPage:800 };

function renderNovelPick(){
  var box = document.getElementById('novel-contact-pick');
  if(!box) return;
  var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k!=='me'; });
  box.innerHTML = ids.map(function(k){
    var c = contacts[k];
    return '<div class="contact-row" onclick="novelPickContact(\''+k+'\')" style="cursor:pointer;"><div class="av glass-strong">'+contactAvatar(c)+'</div><div><div class="name">'+c.name+'</div><div class="habit">一起读小说</div></div><span id="novel-check-'+k+'" style="color:var(--plum-deep);font-weight:800;display:none;">✓</span></div>';
  }).join('');
}

function novelPickContact(k){
  novelState.contact = k;
  document.querySelectorAll('#novel-contact-pick span[id^=novel-check]').forEach(function(s){ s.style.display='none'; });
  var check = document.getElementById('novel-check-'+k);
  if(check) check.style.display='block';
  if(novelState.text) document.getElementById('novel-start-btn').style.display='block';
}

function importNovel(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    var raw = reader.result;
    novelState.text = raw;
    novelState.title = file.name.replace(/\.txt$/i,'');
    // Split into pages
    var pages = [];
    var i = 0;
    while(i < raw.length){
      var chunk = raw.substring(i, i + novelState.charsPerPage);
      // Try to break at a sentence end
      var lastPeriod = Math.max(chunk.lastIndexOf('。'), chunk.lastIndexOf('\n'), chunk.lastIndexOf('！'), chunk.lastIndexOf('？'));
      if(lastPeriod > novelState.charsPerPage * 0.5){
        chunk = chunk.substring(0, lastPeriod + 1);
        i += lastPeriod + 1;
      } else {
        i += novelState.charsPerPage;
      }
      pages.push(chunk.trim());
    }
    novelState.pages = pages;
    novelState.pageIdx = 0;
    // Show preview
    var preview = document.getElementById('novel-txt-preview');
    preview.style.display = 'block';
    preview.textContent = '✓ '+novelState.title+' — 共 '+pages.length+' 页，约 '+Math.round(raw.length/1000)+' 千字';
    if(novelState.contact) document.getElementById('novel-start-btn').style.display='block';
  };
  reader.readAsText(file, 'UTF-8');
}

function startReading(){
  if(!novelState.text || !novelState.contact) return;
  novelState.chatMsgs = [];
  document.getElementById('novel-import').style.display = 'none';
  document.getElementById('novel-reader').style.display = 'flex';
  renderNovelPage();
  // AI says hello
  var c = contacts[novelState.contact];
  novelAImsg(c.name+' 已加入阅读。我们来一起读《'+novelState.title+'》吧。');
  novelProgressLoop();
}

function renderNovelPage(){
  var pages = novelState.pages;
  var idx = novelState.pageIdx;
  if(idx >= pages.length) idx = pages.length - 1;
  if(idx < 0) idx = 0;
  var text = pages[idx] || '(空)';
  document.getElementById('novel-content').textContent = text;
  var pct = pages.length > 1 ? Math.round((idx+1)/pages.length*100) : 100;
  document.getElementById('novel-prog-text').textContent = '第 '+(idx+1)+' 页 / 共 '+pages.length+' 页';
  document.getElementById('novel-pct').textContent = pct+'%';
}

function novelNextPage(){
  if(novelState.pageIdx < novelState.pages.length - 1){
    novelState.pageIdx++;
    renderNovelPage();
    novelAImsg('翻到第 '+(novelState.pageIdx+1)+' 页了。');
  }
}

function novelPrevPage(){
  if(novelState.pageIdx > 0){
    novelState.pageIdx--;
    renderNovelPage();
    novelAImsg('回到第 '+(novelState.pageIdx+1)+' 页。');
  }
}

function novelProgressLoop(){
  clearInterval(novelState.progressTimer);
  // Only fire occasionally, not every minute
  novelState.progressTimer=setInterval(function(){
    var pct=novelState.pages.length>1?Math.round((novelState.pageIdx+1)/novelState.pages.length*100):100;
    if(pct>0&&pct%25===0&&!novelState._lastProgressPct!==pct){
      novelState._lastProgressPct=pct;
      var c=contacts[novelState.contact];
      var sp='You are '+(c?c.name:'a companion')+' reading "'+novelState.title+'" at '+pct+'% progress. Comment naturally, 1 sentence in Chinese.';
      callRealAI([{role:'user',content:'[Progress: '+pct+'%]'}],sp,novelState.contact,function(reply){
        if(reply) novelAImsg(reply);
      });
    }
  },120000); // Every 2 minutes, only at 25/50/75%
}

function novelClick(e){
  var rect=e.currentTarget.getBoundingClientRect();
  var x=e.clientX-rect.left;
  var w=rect.width;
  if(x<w*0.3) novelPrevPage();
  else if(x>w*0.7) novelNextPage();
}

function novelAImsg(txt){
  novelState.chatMsgs.push({who:'ai', text:txt, ts:nowStamp()});
  var el = document.getElementById('novel-ai-msg');
  if(el){
    el.textContent = '💬 '+txt;
    el.style.opacity = '0';
    setTimeout(function(){ el.style.opacity = '1'; el.style.transition='opacity .3s'; }, 50);
  }
}

function novelSend(){
  var input=document.getElementById('novel-chat-input');
  var text=input.value.trim();
  if(!text) return;
  input.value='';
  novelState.chatMsgs.push({who:'me',text:text});
  // Build context from current page + reading progress
  var c=contacts[novelState.contact];
  var pct=novelState.pages.length>1?Math.round((novelState.pageIdx+1)/novelState.pages.length*100):100;
  var currentPageText=novelState.pages[novelState.pageIdx]||'';
  var systemPrompt='You are '+ (c?c.name:'a reading companion') +', reading the book "'+novelState.title+'" together with '+userName+'. The reader is currently at page '+(novelState.pageIdx+1)+' of '+novelState.pages.length+' ('+pct+'% progress). The current page content is:\n\n"'+currentPageText.substring(0,500)+'"\n\nRespond naturally to the reader\'s comment. Keep it 1-3 sentences in Chinese. Be insightful about the book content. Never prefix with your name.';
  var msgs=[{role:'user',content:text}];
  callRealAI(msgs,systemPrompt,novelState.contact,function(reply){
    novelAImsg(reply||'Continue reading...');
  });
}

function novelNextPage(){
  if(novelState.pageIdx<novelState.pages.length-1){
    novelState.pageIdx++;
    renderNovelPage();
    // AI comments on new page
    var c=contacts[novelState.contact];
    var currentPageText=novelState.pages[novelState.pageIdx]||'';
    var systemPrompt='You are '+(c?c.name:'a reading companion')+'. The reader just turned to page '+(novelState.pageIdx+1)+' of "'+novelState.title+'". Current page excerpt:\n\n"'+currentPageText.substring(0,400)+'"\n\nComment briefly on this part of the book. 1-2 sentences in Chinese. Never prefix with your name.';
    callRealAI([{role:'user',content:'[Turned to page '+(novelState.pageIdx+1)+']'}],systemPrompt,novelState.contact,function(reply){
      novelAImsg(reply||'Turning to the next page...');
    });
  }
}

function novelPrevPage(){
  if(novelState.pageIdx>0){
    novelState.pageIdx--;
    renderNovelPage();
  }
}

function novelCall(){
  if(!novelState.contact) return;
  var c = contacts[novelState.contact];
  // Set current contact and start call
  currentContact = novelState.contact;
  document.getElementById('call-name').textContent = c.name;
  document.getElementById('call-av').innerHTML = contactAvatar(c);
  document.getElementById('call-screen').classList.add('open');
  document.getElementById('call-status').textContent = '讨论《'+novelState.title+'》中…';
  var sp = document.getElementById('call-speak'); if(sp) sp.textContent='';
  var timer = document.getElementById('call-timer'); if(timer) timer.textContent='00:00';
  callSeconds = 0;
  if(callTimerInt) clearInterval(callTimerInt);
  callTimerInt = setInterval(function(){
    callSeconds++;
    var m = Math.floor(callSeconds/60);
    var s = callSeconds%60;
    var t = document.getElementById('call-timer');
    if(t) t.textContent = (m+'').padStart?('0'+m).slice(-2):('0'+m)+':'+(s+'').padStart?('0'+s).slice(-2):('0'+s);
  },1000);
  setTimeout(function(){
    var lines = ['你觉得这本小说怎么样？','我特别喜欢这一段的描写。','继续读吧，我在听。','这里的情节转折很精彩。'];
    novelAImsg(lines[Math.floor(Math.random()*lines.length)]);
    try{ speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(lines[0]); u.lang='zh-CN'; speechSynthesis.speak(u); }catch(e){}
  },1500);
}

function novelClick(e){
  var w = e.currentTarget.offsetWidth;
  if(e.clientX - e.currentTarget.getBoundingClientRect().left < w/3){
    novelPrevPage();
  } else if(e.clientX - e.currentTarget.getBoundingClientRect().left > w*2/3){
    novelNextPage();
  }
}
function closeNovel(){
  clearInterval(novelState.progressTimer);
  document.getElementById('sheet-novel').classList.remove('open');
  // Show import screen for next time
  setTimeout(function(){
    document.getElementById('novel-reader').style.display = 'none';
    document.getElementById('novel-import').style.display = 'flex';
  }, 400);
}

/* seed default icons so screens aren't empty on load (after all state is declared) */
renderDesktopIcons();
renderIconGrid();
renderPcKeypad();

/* ============ HOME PAGER (主屏左右分页 + 圆点指示器) ============ */
(function(){
  var pager = document.getElementById('home-pager');
  if(!pager) return;
  var dotsWrap = document.getElementById('page-dots');
  var pages = pager.querySelectorAll('.home-page');

  /* 渲染圆点 */
  function renderDots(){
    if(!dotsWrap) return;
    dotsWrap.innerHTML = '';
    for(var i=0; i<pages.length; i++){
      var d = document.createElement('div');
      d.className = 'page-dot' + (i===0 ? ' active' : '');
      (function(idx){ d.addEventListener('click', function(){
        pager.scrollTo({ left: idx * pager.offsetWidth, behavior: 'smooth' });
      }); })(i);
      dotsWrap.appendChild(d);
    }
  }

  /* 滚动时更新激活圆点 */
  var ticking = false;
  function updateDots(){
    var idx = Math.round(pager.scrollLeft / pager.offsetWidth);
    idx = Math.max(0, Math.min(idx, pages.length - 1));
    var dots = dotsWrap ? dotsWrap.querySelectorAll('.page-dot') : [];
    for(var i=0; i<dots.length; i++){
      dots[i].classList.toggle('active', i === idx);
    }
    ticking = false;
  }
  pager.addEventListener('scroll', function(){
    if(!ticking){ ticking = true; requestAnimationFrame(updateDots); }
  }, { passive: true });

  renderDots();

  /* 窗口尺寸变化时重新对齐当前页 */
  window.addEventListener('resize', function(){
    var idx = Math.round(pager.scrollLeft / pager.offsetWidth);
    pager.scrollTo({ left: idx * pager.offsetWidth });
  });
})();

/* ============ FIT PHONE TO VIEWPORT ============ */
/* 全屏模式：手机屏幕 = 整个网页，不再按 375x812 缩放。
   之前 fitPhone() 会把 .phone 缩小到 viewport 的 76%~90%，
   导致 iOS/Android 用户看到中间一小块"小手机"，四周留白。
   现在直接让 CSS 的 100vw×100dvh 生效，全屏铺满。 */
function fitPhone(){
  var phone=document.querySelector('.phone'); if(!phone) return;
  phone.style.transform='none';
  phone.style.transformOrigin='initial';
}
window.addEventListener('resize', fitPhone);
window.addEventListener('orientationchange', fitPhone);
fitPhone();

initApp();
