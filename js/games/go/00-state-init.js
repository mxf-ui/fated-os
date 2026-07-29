/* ==================== GO APP LOGIC ==================== */
var goState = null;
var goDanmakuTimer = null;
var goLiveTimer = null;
var goLiveSeconds = 0;
var goVoiceRec = null;
var goFileContext = '';
var goProductImg = '';
var goCameraStream = null;

function goDefault(){
  return {
    balance: 0,
    liveType: '',
    liveId: '',
    liveAvatar: '',
    liveBgCustom: '',
    livePartner: '',
    cameraOn: false,
    danmakuCat: 'auto',
    danmakuCustom: '',
    worldBookBind: '',
    products: [],
    orders: 0,
    isLive: false,
    qaQuestions: [],
    qaCurrent: 0,
    qaPartner: '',
    qaUsedQuestions: [],
    qaRoundSeed: '',
    asmrProgress: 0,
    liveEvents: [],
    partnerChat: [],
    history: []
  };
}

function goEnsureStateShape(){
  if(!goState) goState = goDefault();
  var d = goDefault();
  Object.keys(d).forEach(function(k){ if(typeof goState[k] === 'undefined') goState[k] = d[k]; });
  if(!Array.isArray(goState.products)) goState.products = [];
  if(!Array.isArray(goState.qaQuestions)) goState.qaQuestions = [];
  if(!Array.isArray(goState.qaUsedQuestions)) goState.qaUsedQuestions = [];
  if(!Array.isArray(goState.liveEvents)) goState.liveEvents = [];
  if(!Array.isArray(goState.partnerChat)) goState.partnerChat = [];
  if(!Array.isArray(goState.history)) goState.history = [];
  if(!goState.livePartner && goState.qaPartner) goState.livePartner = goState.qaPartner;
}

function goReadImageFile(file, maxWidth, quality, cb){
  if(typeof compressImage === 'function'){
    try{
      compressImage(file, maxWidth || 1200, quality || 0.82, function(res){ cb(res || null); });
      return;
    }catch(e){}
  }
  var reader = new FileReader();
  reader.onload = function(ev){ cb(ev.target.result); };
  reader.onerror = function(){ cb(null); };
  reader.readAsDataURL(file);
}

function initGo(){
  goEnsureStateShape();
  goRenderSetup();
  var fi = document.getElementById('go-file-input');
  if(fi && !fi._goBound){
    fi._goBound = true;
    fi.addEventListener('change', function(e){
      var file = e.target.files && e.target.files[0];
      if(!file) return;
      var ctx = goFileContext;
      goReadImageFile(file, ctx === 'background' ? 1400 : 900, ctx === 'background' ? 0.78 : 0.82, function(b64){
        if(!b64){ goToast('\u56fe\u7247\u8bfb\u53d6\u5931\u8d25'); return; }
        if(ctx === 'avatar'){
          goState.liveAvatar = b64;
          var av = document.getElementById('go-avatar-preview');
          if(av) av.style.backgroundImage = 'url('+b64+')';
          goToast('\u5934\u50cf\u5df2\u8bbe\u7f6e');
          saveState();
        } else if(ctx === 'background'){
          goState.liveBgCustom = b64;
          goToast('\u76f4\u64ad\u80cc\u666f\u5df2\u4e0a\u4f20');
          if(goState.isLive) goRenderLive(); else goRenderSetup();
          saveState();
        } else if(ctx === 'product'){
          goProductImg = b64;
          goToast('\u4ea7\u54c1\u56fe\u7247\u5df2\u4e0a\u4f20');
        } else if(ctx === 'game'){
          goAICheckGameResult(b64);
        }
        goFileContext = '';
      });
      e.target.value = '';
    });
  }
}

function goToast(msg){
  var t = document.getElementById('go-toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

function goCloseModal(id){ var m = document.getElementById(id); if(m) m.classList.remove('open'); }
function goOpenModal(id){ var m = document.getElementById(id); if(m) m.classList.add('open'); }
function goPickAvatar(){ goFileContext = 'avatar'; var fi = document.getElementById('go-file-input'); if(fi) fi.click(); }
function goPickBackground(){ goFileContext = 'background'; var fi = document.getElementById('go-file-input'); if(fi) fi.click(); }
