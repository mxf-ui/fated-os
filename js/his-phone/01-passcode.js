/* ---------- 密码锁 ---------- */
function renderHisPasscode(){
  var ov=document.getElementById('screen-hisphone'); if(!ov) return;
  var c=contacts[coupleState.partner]; var taName=c?c.name:'TA';
  var entered=hisPhone.entered||'';
  if(hisPhone.locked){
    ov.innerHTML='<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;padding:24px;text-align:center;">'+
      '<div style="font-size:18px;font-weight:800;margin-bottom:10px;">iPhone 已停用</div>'+
      '<div style="font-size:13px;color:#aaa;line-height:1.6;margin-bottom:24px;">输错太多次，'+esc(taName)+' 把你锁了 😤<br>向 TA 认个错，他就放你进来。</div>'+
      '<div class="big-btn" style="background:#ff2d55;width:70%;" onclick="coupleAskHisUnlock()">向 TA 求解锁</div>'+
      '<div style="margin-top:14px;font-size:12px;color:#666;cursor:pointer;" onclick="closeHisPhone()">返回情侣空间</div>'+
    '</div>';
    return;
  }
  var dots=[0,1,2,3].map(function(i){ return '<div style="width:12px;height:12px;border-radius:50%;'+(i<entered.length?'background:#fff;':'border:1.5px solid #666;')+'"></div>'; }).join('');
  var keys=['1','2','3','4','5','6','7','8','9','','0','del'];
  var pad=keys.map(function(k){
    if(k==='') return '<div></div>';
    if(k==='del') return '<div onclick="hisPassKey(\'del\')" style="height:60px;display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;cursor:pointer;">⌫</div>';
    return '<div onclick="hisPassKey(\''+k+'\')" style="height:60px;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:500;color:#fff;cursor:pointer;border-radius:50%;">'+k+'</div>';
  }).join('');
  var err = (hisPhone.attempts>0)? '<div style="font-size:13px;color:#ff453a;margin-top:10px;height:16px;">密码错误，还剩 '+(5-hisPhone.attempts)+' 次机会</div>' : '<div style="font-size:13px;color:#ff453a;margin-top:10px;height:16px;"></div>';
  ov.innerHTML='<div style="height:100%;display:flex;flex-direction:column;align-items:center;background:#000;color:#fff;padding:36px 24px;">'+
    '<div style="font-size:15px;font-weight:700;margin-top:20px;">'+esc(taName)+' 的手机</div>'+
    '<div style="font-size:12px;color:#aaa;margin:6px 0 22px;">输入密码以查看</div>'+
    '<div style="display:flex;gap:18px;margin-bottom:8px;">'+dots+'</div>'+
    err+
    '<div style="width:100%;max-width:300px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 6px;margin-top:18px;">'+pad+'</div>'+
    '<div style="margin-top:22px;font-size:13px;color:#0a84ff;cursor:pointer;" onclick="coupleAskHisPasscode()">在微信问 TA 密码 ▸</div>'+
    '<div style="margin-top:14px;font-size:12px;color:#666;cursor:pointer;" onclick="closeHisPhone()">返回情侣空间</div>'+
  '</div>';
}
function hisPassKey(k){
  if(hisPhone.locked) return;
  if(k==='del'){ hisPhone.entered=(hisPhone.entered||'').slice(0,-1); renderHisPasscode(); return; }
  if((hisPhone.entered||'').length>=4) return;
  hisPhone.entered=(hisPhone.entered||'')+k;
  if(hisPhone.entered.length===4){ hisPassSubmit(); } else { renderHisPasscode(); }
}
function hisPassSubmit(){
  if(hisPhone.entered===hisPhone.pass){
    hisPhone.unlocked=true; hisPhone.entered=''; hisPhone.app='home'; renderHisPhone();
  } else {
    hisPhone.attempts++; coupleState.hisPassAttempts=hisPhone.attempts;
    if(hisPhone.attempts>=5){ hisPhone.locked=true; coupleState.hisLocked=true; }
    window.saveCoupleState(); hisPhone.entered=''; renderHisPasscode();
  }
}
/* 在微信问 TA，TA 把密码发到你们微信里 */
function coupleAskHisPasscode(){
  var c=contacts[coupleState.partner]; if(!c){ showToast('先去「管理联系人」设一个对象，TA 才存在哦', 1800); return; }
  closeHisPhone();
  c.seed.push({mine:false, kind:'text', text:'我的手机密码是 '+coupleState.hisPasscode+'，只准看一点点哦 😏', from:coupleState.partner, ts:nowStamp()});
  saveChatThread(coupleState.partner);
  if(currentContact===coupleState.partner) renderThread(); else if(typeof openThread==='function') openThread(coupleState.partner);
  showToast('TA 已在微信里把密码发给你了', 1800);
}
/* 向 TA 求解锁：TA 原谅你，重置次数 */
function coupleAskHisUnlock(){
  hisPhone.attempts=0; hisPhone.locked=false; coupleState.hisPassAttempts=0; coupleState.hisLocked=false; window.saveCoupleState(); hisPhone.entered=''; renderHisPasscode();
}
