/* Couple Space — 我查 TA 的手机（iOS 极简，带密码锁 + 微信同步）
 * 入口：coupleYouCheckHim()  （由查岗页「我查 TA 的手机」触发）
 * 特性：
 *  - 进入需 4 位密码（iOS 风格数字键盘）
 *  - 密码只有 TA 知道：在微信问 TA，TA 会把密码发到你们微信里
 *  - 连错 5 次锁定，需「向 TA 求解锁」
 *  - 每个 app 左上角都有返回键
 *  - 微信里「我」的聊天与你的微信完全同步（实时引用同一份聊天记录）
 */
var hisPhone = { open:false, app:'home', contact:null, date:null, contacts:null, unlocked:false, entered:'', attempts:0, locked:false, pass:'' };
var hisApps = [['wechat','微信','微'],['ins','Ins','I'],['x','X','X'],['contacts','电话薄','薄'],['tb','淘宝','淘'],['fit','健身','健'],['diary','日记','记'],['notes','备忘录','备'],['browse','浏览','浏']];

function closeHisPhone(){ var ov=document.getElementById('screen-hisphone'); if(ov) ov.classList.remove('active'); hisPhone.open=false; }

function coupleYouCheckHim(){
  var ov=document.getElementById('screen-hisphone');
  if(!ov){ ov=document.createElement('div'); ov.id='screen-hisphone'; ov.className='topview'; document.getElementById('screen').appendChild(ov); }
  ov.classList.add('active'); ov.style.background='#000'; ov.style.color='#fff'; ov.style.zIndex='80';
  hisPhone.date = ymdKey(new Date());
  if(!coupleState.hisPasscode){ coupleState.hisPasscode = String(1000+Math.floor(Math.random()*9000)); window.saveCoupleState(); }
  hisPhone.pass = coupleState.hisPasscode;
  hisPhone.attempts = coupleState.hisPassAttempts||0;
  hisPhone.locked = !!coupleState.hisLocked;
  hisPhone.unlocked = false; hisPhone.entered=''; hisPhone.app='home'; hisPhone.contact=null;
  hisPhone.contacts = buildHisContacts(hisPhone.date);
  renderHisPhone();
}

function renderHisPhone(){
  if(!hisPhone.unlocked){ renderHisPasscode(); return; }
  if(hisPhone.app==='home'){ renderHisHome(); }
  else { hisRenderApp(); }
}
