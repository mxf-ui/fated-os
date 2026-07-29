/* ==================== GO APP LOGIC ==================== */
var goState = null;
var goDanmakuTimer = null;
var goLiveTimer = null;
var goLiveSeconds = 0;
var goVoiceRec = null;
var goFileContext = '';
var goProductImg = '';

function goDefault(){
  return {
    balance: 0,
    liveType: '',
    liveId: '',
    liveAvatar: '',
    liveBg: 0,
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
    history: []
  };
}

function initGo(){
  if(!goState) goState = goDefault();
  goRenderSetup();
  // File input handler
  var fi = document.getElementById('go-file-input');
  if(fi && !fi._goBound){
    fi._goBound = true;
    fi.addEventListener('change', function(e){
      var file = e.target.files[0];
      if(!file) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        var b64 = ev.target.result;
        if(goFileContext === 'avatar'){
          goState.liveAvatar = b64;
          var av = document.getElementById('go-avatar-preview');
          if(av) av.style.backgroundImage = 'url('+b64+')';
          goToast('头像已设置');
          saveState();
        } else if(goFileContext === 'product'){
          goProductImg = b64;
          goToast('产品图片已上传');
        } else if(goFileContext === 'game'){
          goAICheckGameResult(b64);
        }
      };
      reader.readAsDataURL(file);
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

function goCloseModal(id){
  var m = document.getElementById(id);
  if(m) m.classList.remove('open');
}

function goOpenModal(id){
  var m = document.getElementById(id);
  if(m) m.classList.add('open');
}
