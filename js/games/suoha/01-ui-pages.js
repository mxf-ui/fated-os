/* ===== MONEY ===== */
function suohaClampWithdraw(){
  var input = document.getElementById('suoha-withdraw-input');
  var v = parseFloat(input.value) || 0;
  if(v > suohaGetWechat()) input.value = suohaGetWechat();
  if(v < 0) input.value = '';
}
function suohaQuickAmount(amt){
  var input = document.getElementById('suoha-withdraw-input');
  if(amt === -1) input.value = suohaGetWechat();
  else input.value = Math.min(amt, suohaGetWechat());
}
function suohaWithdraw(){
  var v = parseFloat(document.getElementById('suoha-withdraw-input').value) || 0;
  if(v <= 0){ suohaToast('请输入有效金额'); return; }
  if(v > suohaGetWechat()){ suohaToast('WeChat 余额不足'); return; }
  suohaSetWechat(suohaGetWechat() - v);
  suohaState.wallet += v;
  saveState();
  document.getElementById('suoha-withdraw-input').value = '';
  suohaUpdateAll();
  suohaToast('已提现 ' + suohaFmt(v));
}
function suohaCashOut(){
  if(suohaState.wallet <= 0){ suohaToast('梭哈钱包没有余额'); return; }
  var amt = suohaState.wallet;
  suohaSetWechat(suohaGetWechat() + amt);
  suohaState.wallet = 0;
  saveState();
  suohaUpdateAll();
  suohaToast('已提回 ' + suohaFmt(amt));
}
