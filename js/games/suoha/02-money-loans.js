/* ===== BOSS ===== */
function suohaOpenBoss(){
  document.getElementById('suoha-m-boss').classList.add('open');
  document.getElementById('suoha-boss-main').classList.remove('suoha-hidden');
  document.getElementById('suoha-boss-actions').classList.remove('suoha-hidden');
  document.getElementById('suoha-boss-result').classList.add('suoha-hidden');
}
function suohaBossRespond(ready){
  document.getElementById('suoha-boss-main').classList.add('suoha-hidden');
  document.getElementById('suoha-boss-actions').classList.add('suoha-hidden');
  var result = document.getElementById('suoha-boss-result');
  var emoji = document.getElementById('suoha-boss-result-emoji');
  var text = document.getElementById('suoha-boss-result-text');
  var btn = document.getElementById('suoha-boss-result-btn');
  result.classList.remove('suoha-hidden');
  if(ready){
    emoji.textContent = 'ψ(｀∇´)ψ';
    text.textContent = '桀桀桀';
    btn.textContent = '进入梭哈小铺';
    btn.className = 'suoha-btn primary';
    btn.style.marginTop = '16px';
    btn.onclick = function(){
      suohaCloseModal('suoha-m-boss');
      if(suohaState.wallet <= 0){ suohaToast('钱包空空，先提点钱过来吧'); suohaShow('soul'); }
      else suohaShow('shop');
    };
  } else {
    emoji.textContent = 'ಠ︵ಠ凸';
    text.textContent = '怯场了吗？';
    btn.textContent = '关闭';
    btn.className = 'suoha-btn ghost';
    btn.style.marginTop = '16px';
    btn.onclick = function(){ suohaCloseModal('suoha-m-boss'); };
  }
}

/* ===== COOLDOWN ===== */
function suohaCheckCooldown(){
  if(suohaState.cooldown && suohaState.cooldownUntil && suohaNow() > suohaState.cooldownUntil){
    suohaState.cooldown = false; suohaState.cooldownUntil = null; suohaState.cooldownReason = '';
    saveState();
  }
}
function suohaCheckLoanOverdue(){
  if(suohaState.fastLoan > 0 && suohaState.fastLoanDue && suohaNow() > suohaState.fastLoanDue && !suohaState.cooldown){
    suohaState.cooldown = true; suohaState.cooldownUntil = suohaNow() + suohaHours(72); suohaState.cooldownReason = '极速贷逾期';
    saveState(); suohaToast('极速贷逾期！冷却 72 小时');
  }
  if(suohaState.bossLoan > 0 && suohaState.bossLoanDue && suohaNow() > suohaState.bossLoanDue && !suohaState.cooldown){
    suohaState.cooldown = true; suohaState.cooldownUntil = suohaNow() + suohaHours(72); suohaState.cooldownReason = '老板借贷逾期';
    saveState(); suohaToast('老板借贷逾期！冷却 72 小时');
  }
}
function suohaCheckBossWarning(){
  if(suohaState.cooldown && suohaState.cooldownReason && suohaState.cooldownReason.indexOf('累计亏损') >= 0){
    var elapsed = suohaNow() - (suohaState.bossWarningLast || 0);
    if(elapsed >= suohaHours(5)){
      suohaState.bossWarningLast = suohaNow();
      saveState();
      var warnings = [
        '桀桀桀，亏了这么多还敢来？老实待着吧。',
        '你以为跑得掉？每 5 小时我都会来提醒你。',
        '亏了 100 万还想翻本？做梦吧你。',
        '冷却期间好好反省，别再赌了。',
        '老板的眼睛盯着你呢，别想逃。'
      ];
      suohaSetText('suoha-warning-text', warnings[Math.floor(Math.random()*warnings.length)]);
      document.getElementById('suoha-m-bosswarning').classList.add('open');
    }
  }
}

/* ===== FAST LOAN (极速贷) ===== */
function suohaOpenLoan(){
  if(suohaState.fastLoan > 0){ suohaToast('已有极速贷未还清'); return; }
  if(suohaGetWechat() > 0){ suohaToast('WeChat 还有余额，无法借款'); return; }
  document.getElementById('suoha-m-loan').classList.add('open');
}
function suohaApplyLoan(){
  var v = parseFloat(document.getElementById('suoha-loan-input').value) || 0;
  if(v < 500){ suohaToast('最少借 ¥500'); return; }
  if(v > 5000){ suohaToast('最多借 ¥5,000'); return; }
  suohaState.fastLoan = v;
  suohaState.fastLoanDue = suohaNow() + suohaDays(3);
  suohaState.wallet += v;
  saveState();
  suohaCloseModal('suoha-m-loan');
  suohaUpdateAll();
  suohaToast('借款成功 ' + suohaFmt(v) + '，3 天还清！');
}
function suohaRepayFastLoan(){
  if(suohaState.fastLoan <= 0) return;
  var total = suohaState.wallet + suohaGetWechat();
  if(total < suohaState.fastLoan){ suohaToast('余额不足，还差 ' + suohaFmt(suohaState.fastLoan - total)); return; }
  var fromWallet = Math.min(suohaState.wallet, suohaState.fastLoan);
  suohaState.wallet -= fromWallet;
  var remaining = suohaState.fastLoan - fromWallet;
  if(remaining > 0) suohaSetWechat(suohaGetWechat() - remaining);
  suohaState.fastLoan = 0; suohaState.fastLoanDue = null;
  saveState(); suohaUpdateAll();
  suohaToast('极速贷已还清！');
}

/* ===== BOSS LOAN (极速借) ===== */
function suohaOpenBossLoan(){
  if(suohaState.bossLoan > 0){ suohaToast('已有老板借贷未还清'); return; }
  document.getElementById('suoha-m-bossloan').classList.add('open');
}
function suohaApplyBossLoan(){
  var v = parseFloat(document.getElementById('suoha-bossloan-input').value) || 0;
  if(v < 1000){ suohaToast('最少借 ¥1,000'); return; }
  if(v > 50000){ suohaToast('最多借 ¥50,000'); return; }
  suohaState.bossLoan = v;
  suohaState.bossLoanInterest = Math.round(v * 0.1 * 3);
  suohaState.bossLoanDue = suohaNow() + suohaDays(3);
  suohaState.wallet += v;
  saveState();
  suohaCloseModal('suoha-m-bossloan');
  suohaUpdateAll();
  suohaToast('老板借给你 ' + suohaFmt(v) + '，3 天后还 ' + suohaFmt(v + suohaState.bossLoanInterest));
}
function suohaRepayBossLoan(){
  if(suohaState.bossLoan <= 0) return;
  var totalDebt = suohaState.bossLoan + suohaState.bossLoanInterest;
  var total = suohaState.wallet + suohaGetWechat();
  if(total < totalDebt){ suohaToast('余额不足，还差 ' + suohaFmt(totalDebt - total)); return; }
  var fromWallet = Math.min(suohaState.wallet, totalDebt);
  suohaState.wallet -= fromWallet;
  var remaining = totalDebt - fromWallet;
  if(remaining > 0) suohaSetWechat(suohaGetWechat() - remaining);
  suohaState.bossLoan = 0; suohaState.bossLoanDue = null; suohaState.bossLoanInterest = 0;
  saveState(); suohaUpdateAll();
  suohaToast('老板的债已还清！');
}
