
/* ==================== 梭哈 SUOHA GAME LOGIC ==================== */
var suohaState = (typeof suohaState !== 'undefined') ? suohaState : null;
var suohaGameRound = { stone:0, dice:0, cards:0, water:0 };
var suohaWaterState = null;

function suohaDefault(){
  return {
    wallet: 0,
    fastLoan: 0,
    fastLoanDue: null,
    bossLoan: 0,
    bossLoanDue: null,
    bossLoanInterest: 0,
    cooldown: false,
    cooldownUntil: null,
    cooldownReason: '',
    wins: 0, losses: 0, ties: 0,
    totalLoss: 0,
    workLast: 0,
    contactBorrowDate: {},
    contactDebts: {},
    bossWarningLast: 0
  };
}
if(!suohaState) suohaState = suohaDefault();

function suohaNow(){ return Date.now(); }
function suohaDays(d){ return d * 86400000; }
function suohaHours(h){ return h * 3600000; }

function suohaFmt(n){
  n = Number(n) || 0;
  return '\u00a5' + n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function suohaFmtShort(n){
  n = Number(n) || 0;
  return '\u00a5' + Math.round(n).toLocaleString('zh-CN');
}

function suohaGetWechat(){ return walletBalance; }
function suohaSetWechat(v){ walletBalance = v; updateWalletPreview(); }

function suohaToast(msg){
  var t = document.getElementById('suoha-toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.classList.remove('show'); }, 2500);
}

function suohaSetText(id, val){
  var el = document.getElementById(id);
  if(el) el.textContent = val;
}

function suohaInit(){
  if(!suohaState) suohaState = suohaDefault();
  suohaCheckCooldown();
  suohaCheckLoanOverdue();
  suohaCheckBossWarning();
  suohaUpdateAll();
  suohaShow('soul');
  setInterval(function(){
    suohaCheckCooldown();
    suohaCheckLoanOverdue();
    suohaCheckBossWarning();
    if(document.getElementById('sheet-suoha') && document.getElementById('sheet-suoha').classList.contains('open')){
      suohaUpdateAll();
    }
  }, 30000);
}
function initSuoha(){ suohaInit(); }

function suohaUpdateAll(){
  var wechat = suohaGetWechat();
  suohaSetText('suoha-wechat-balance', Number(wechat).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}));
  suohaSetText('suoha-header-wallet', suohaFmt(suohaState.wallet));
  suohaSetText('suoha-shop-wallet', suohaFmt(suohaState.wallet));

  var baseBet = 1000;
  suohaSetText('suoha-current-bet', suohaFmtShort(baseBet));

  suohaSetText('suoha-stat-wins', suohaState.wins);
  suohaSetText('suoha-stat-losses', suohaState.losses);
  suohaSetText('suoha-stat-ties', suohaState.ties);
  suohaSetText('suoha-total-loss', suohaFmtShort(suohaState.totalLoss));

  /* 极速贷 visibility */
  var loanSec = document.getElementById('suoha-loan-section');
  if(loanSec){
    if(wechat <= 0 && suohaState.fastLoan <= 0){ loanSec.classList.remove('suoha-hidden'); suohaSetText('suoha-loan-badge','可申请'); }
    else { loanSec.classList.add('suoha-hidden'); }
  }

  /* 极速借 visibility */
  var bossLoanSec = document.getElementById('suoha-bossloan-section');
  if(bossLoanSec){
    var bossBadge = document.getElementById('suoha-bossloan-badge');
    if(suohaState.bossLoan > 0){ bossBadge.textContent = '待还'; bossBadge.style.color = '#ba1a1a'; }
    else { bossBadge.textContent = '可借'; bossBadge.style.color = '#92400e'; }
  }

  /* Active loans */
  var loanStatus = document.getElementById('suoha-loan-status');
  var loanList = document.getElementById('suoha-loan-list');
  var hasLoan = false;
  var html = '';
  if(suohaState.fastLoan > 0){
    hasLoan = true;
    var rem = suohaState.fastLoanDue - suohaNow();
    var dStr = rem > 0 ? Math.floor(rem/suohaDays(1)) + ' 天 ' + Math.floor((rem%suohaDays(1))/suohaHours(1)) + ' 小时' : '已逾期';
    html += '<div class="suoha-loan-item"><div><div style="font-weight:600;color:#ba1a1a;">极速贷 ' + suohaFmt(suohaState.fastLoan) + '</div><div style="font-size:11px;color:#999;">' + dStr + '</div></div><button class="suoha-btn danger" style="width:auto;padding:6px 14px;" onclick="suohaRepayFastLoan()">还款</button></div>';
  }
  if(suohaState.bossLoan > 0){
    hasLoan = true;
    var totalBossDebt = suohaState.bossLoan + suohaState.bossLoanInterest;
    var remB = suohaState.bossLoanDue - suohaNow();
    var dStrB = remB > 0 ? Math.floor(remB/suohaDays(1)) + ' 天 ' + Math.floor((remB%suohaDays(1))/suohaHours(1)) + ' 小时' : '已逾期';
    html += '<div class="suoha-loan-item"><div><div style="font-weight:600;color:#92400e;">老板 ' + suohaFmt(totalBossDebt) + '</div><div style="font-size:11px;color:#999;">' + dStrB + '</div></div><button class="suoha-btn" style="width:auto;padding:6px 14px;border-color:#92400e;color:#92400e;" onclick="suohaRepayBossLoan()">还款</button></div>';
  }
  /* Contact debts */
  var contactDebtTotal = 0;
  Object.keys(suohaState.contactDebts || {}).forEach(function(k){
    var d = suohaState.contactDebts[k];
    if(d > 0){ contactDebtTotal += d; }
  });
  if(loanList) loanList.innerHTML = html;
  if(loanStatus){ if(hasLoan) loanStatus.classList.remove('suoha-hidden'); else loanStatus.classList.add('suoha-hidden'); }

  /* Repay list */
  var repayList = document.getElementById('suoha-repay-list');
  if(repayList){
    var rHtml = '';
    Object.keys(suohaState.contactDebts || {}).forEach(function(k){
      var d = suohaState.contactDebts[k];
      if(d > 0){
        var c = contacts[k];
        var nm = c ? c.name : k;
        rHtml += '<div class="suoha-loan-item"><div><div style="font-size:14px;">欠 ' + esc(nm) + ' ' + suohaFmt(d) + '</div></div><button class="suoha-btn primary" style="width:auto;padding:6px 14px;" onclick="suohaRepayContact(\'' + k + '\')">还</button></div>';
      }
    });
    if(!rHtml) rHtml = '<div style="font-size:12px;color:#999;text-align:center;padding:8px;">暂无欠款</div>';
    repayList.innerHTML = rHtml;
  }

  /* Cooldown */
  suohaCheckCooldown();
  var cdSec = document.getElementById('suoha-cooldown');
  if(cdSec){
    if(suohaState.cooldown){
      cdSec.classList.remove('suoha-hidden');
      if(suohaState.cooldownUntil){
        var rem = suohaState.cooldownUntil - suohaNow();
        if(rem > 0){
          var h = Math.floor(rem / suohaHours(1));
          var m = Math.floor((rem % suohaHours(1)) / 60000);
          suohaSetText('suoha-cooldown-text', '冷却中… 还剩 ' + h + ' 小时 ' + m + ' 分钟\n原因: ' + (suohaState.cooldownReason||''));
        } else {
          suohaState.cooldown = false; suohaState.cooldownUntil = null; suohaState.cooldownReason = '';
          saveState();
          cdSec.classList.add('suoha-hidden');
          suohaToast('冷却结束！可以梭哈了！');
        }
      }
    } else { cdSec.classList.add('suoha-hidden'); }
  }

  /* Work status */
  suohaSetText('suoha-work-status', '可搬砖');
}

function suohaShow(page){
  document.querySelectorAll('.suoha-page').forEach(function(p){ p.classList.remove('active'); });
  var target = document.getElementById('suoha-page-' + page);
  if(target) target.classList.add('active');
  document.querySelectorAll('.suoha-nav-item').forEach(function(n){ n.classList.remove('active'); });
  var navEls = document.querySelectorAll('#suoha-nav-' + page + ', #suoha-nav-' + page + '2');
  navEls.forEach(function(n){ n.classList.add('active'); });
  suohaUpdateAll();
}

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

/* ===== CONTACTS ===== */
function suohaGetTodayStr(){ return new Date().toDateString(); }
function suohaGetContactCap(id){
  var caps = { 'p1':2000, 'p2':1000, 'p3':500, 'p4':3000, 'p5':1500, 'tester1':1000 };
  return caps[id] || 1000;
}
function suohaGetContactLine(c){
  if(!c) return '拿去吧';
  var persona = c.persona || c.tone || '';
  var name = c.name || '联系人';
  /* Generate persona-based message */
  if(persona.indexOf('温柔') >= 0 || persona.indexOf('暖') >= 0) return name + '：少赌点啊，注意身体～';
  if(persona.indexOf('高冷') >= 0 || persona.indexOf('冷') >= 0) return name + '：哼，拿去。别说是我借的。';
  if(persona.indexOf('活泼') >= 0 || persona.indexOf('开朗') >= 0) return name + '：哈哈哈又来借钱啦！拿着花！';
  if(persona.indexOf('成熟') >= 0 || persona.indexOf('稳重') >= 0) return name + '：拿去，但记得还。做人要讲信用。';
  if(persona.indexOf('傲娇') >= 0 || persona.indexOf('傲') >= 0) return name + '：才、才不是因为担心你才借的！';
  if(persona.indexOf('腹黑') >= 0 || persona.indexOf('黑') >= 0) return name + '：呵，借你可以，但利息另算哦～';
  if(persona.indexOf(' shy') >= 0 || persona.indexOf('害羞') >= 0) return name + '：那个…这些你先用着吧…';
  /* Default messages */
  var defaults = [
    name + '：拿去拿去，别客气',
    name + '：这次先借你，下次记得还啊',
    name + '：又来？行吧，最后一次了',
    name + '：少赌点啊，注意身体',
    name + '：说啥呢，拿着'
  ];
  return defaults[Math.floor(Math.random()*defaults.length)];
}
function suohaOpenContacts(){
  var list = document.getElementById('suoha-contacts-list');
  var today = suohaGetTodayStr();
  var html = '';
  Object.keys(contacts).forEach(function(k){
    if(k === 'me' || k === 'tester1') {
      /* include tester1 but skip 'me' */
      if(k === 'me') return;
    }
    var c = contacts[k];
    if(!c || c.isGroup) return;
    var cap = suohaGetContactCap(k);
    var borrowedToday = (suohaState.contactBorrowDate[k] === today);
    var debt = suohaState.contactDebts[k] || 0;
    var canLend = !borrowedToday;
    var avHtml = c.avatar ? '<img src="'+c.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : (c.avatarColor||'#ccc');
    var avStyle = c.avatar ? '' : 'background:'+(c.avatarColor||'#ccc')+';';
    var line = suohaGetContactLine(c);
    html += '<div class="suoha-contact-row">' +
      '<div class="av" style="'+avStyle+'">'+(c.avatar?'':esc(c.name?c.name[0]:'?'))+'</div>' +
      '<div class="info">' +
        '<div class="n">' + esc(c.name||k) + '</div>' +
        '<div class="d">额度 ' + suohaFmtShort(cap) + (debt>0?' · 欠 '+suohaFmtShort(debt):'') + '</div>' +
        (borrowedToday ? '<div class="msg">今天已经借过了，明天 12 点刷新</div>' : '<div class="msg">"'+esc(line)+'"</div>') +
      '</div>' +
      (canLend ? '<button class="ok" onclick="suohaBorrowFromContact(\''+k+'\')">借</button>' : '<button class="dis" disabled>已借</button>') +
    '</div>';
  });
  if(!html) html = '<div style="text-align:center;padding:20px;color:#999;">没有可借的联系人</div>';
  list.innerHTML = html;
  document.getElementById('suoha-m-contacts').classList.add('open');
}
function suohaBorrowFromContact(k){
  var c = contacts[k];
  if(!c) return;
  var today = suohaGetTodayStr();
  if(suohaState.contactBorrowDate[k] === today){ suohaToast('今天已经借过了，明天 12 点刷新'); return; }
  var cap = suohaGetContactCap(k);
  var debt = suohaState.contactDebts[k] || 0;
  var remaining = cap - debt;
  if(remaining <= 0){ suohaToast(c.name + ' 额度用完了'); return; }
  var amt = Math.min(remaining, 2000);
  suohaState.contactBorrowDate[k] = today;
  suohaState.contactDebts[k] = (suohaState.contactDebts[k]||0) + amt;
  suohaSetWechat(suohaGetWechat() + amt);
  saveState();
  suohaUpdateAll();
  suohaCloseModal('suoha-m-contacts');
  suohaToast(suohaGetContactLine(c) + '\n转入 ' + suohaFmt(amt));
}
function suohaRepayContact(k){
  var debt = suohaState.contactDebts[k] || 0;
  if(debt <= 0) return;
  var total = suohaState.wallet + suohaGetWechat();
  if(total < debt){ suohaToast('余额不足，还差 ' + suohaFmt(debt - total)); return; }
  var fromWallet = Math.min(suohaState.wallet, debt);
  suohaState.wallet -= fromWallet;
  var remaining = debt - fromWallet;
  if(remaining > 0) suohaSetWechat(suohaGetWechat() - remaining);
  suohaState.contactDebts[k] = 0;
  saveState(); suohaUpdateAll();
  suohaToast('已还清 ' + esc(contacts[k]?contacts[k].name:k) + ' 的借款！');
}

/* ===== TETRIS (搬砖) ===== */
var suohaTetris = { board:[], piece:null, next:null, lines:0, score:0, running:false, timer:null, dropInterval:800 };
var suohaTetrisShapes = [
  {s:[[1,1,1,1]], c:'#00f0f0'}, // I
  {s:[[1,1],[1,1]], c:'#f0f000'}, // O
  {s:[[0,1,0],[1,1,1]], c:'#a000f0'}, // T
  {s:[[0,1,1],[1,1,0]], c:'#00f000'}, // S
  {s:[[1,1,0],[0,1,1]], c:'#f00000'}, // Z
  {s:[[1,0,0],[1,1,1]], c:'#0000f0'}, // J
  {s:[[0,0,1],[1,1,1]], c:'#f0a000'}  // L
];
function suohaOpenTetris(){
  document.getElementById('suoha-m-tetris').classList.add('open');
  suohaStartTetris();
}
function suohaCloseTetris(){
  if(suohaTetris.timer){ clearInterval(suohaTetris.timer); suohaTetris.timer=null; }
  suohaTetris.running=false;
  suohaCloseModal('suoha-m-tetris');
}
function suohaStartTetris(){
  document.getElementById('suoha-tetris-result').classList.add('suoha-hidden');
  document.getElementById('suoha-tetris-start-btn').classList.add('suoha-hidden');
  suohaTetris.board = [];
  for(var r=0;r<20;r++){ suohaTetris.board.push(new Array(10).fill(null)); }
  suohaTetris.lines=0; suohaTetris.score=0; suohaTetris.running=true;
  suohaTetris.dropInterval=800;
  suohaTetris.piece = suohaTetrisNewPiece();
  suohaTetris.next = suohaTetrisNewPiece();
  suohaTetrisUpdateUI();
  suohaTetrisDraw();
  if(suohaTetris.timer) clearInterval(suohaTetris.timer);
  suohaTetris.timer = setInterval(suohaTetrisTick, suohaTetris.dropInterval);
}
function suohaTetrisNewPiece(){
  var idx = Math.floor(Math.random()*7);
  var sh = suohaTetrisShapes[idx];
  return { shape: sh.s.map(function(r){return r.slice();}), color: sh.c, x: 3, y: 0 };
}
function suohaTetrisCollide(shape, x, y){
  for(var r=0;r<shape.length;r++){
    for(var c=0;c<shape[r].length;c++){
      if(!shape[r][c]) continue;
      var nx=x+c, ny=y+r;
      if(nx<0||nx>=10||ny>=20) return true;
      if(ny>=0 && suohaTetris.board[ny][nx]) return true;
    }
  }
  return false;
}
function suohaTetrisMerge(){
  var p=suohaTetris.piece;
  for(var r=0;r<p.shape.length;r++){
    for(var c=0;c<p.shape[r].length;c++){
      if(p.shape[r][c] && p.y+r>=0) suohaTetris.board[p.y+r][p.x+c]=p.color;
    }
  }
}
function suohaTetrisClearLines(){
  var cleared=0;
  for(var r=19;r>=0;r--){
    var full=true;
    for(var c=0;c<10;c++){ if(!suohaTetris.board[r][c]){ full=false; break; } }
    if(full){
      suohaTetris.board.splice(r,1);
      suohaTetris.board.unshift(new Array(10).fill(null));
      cleared++; r++;
    }
  }
  if(cleared>0){
    suohaTetris.lines += cleared;
    suohaTetris.score += cleared*100;
    suohaTetrisUpdateUI();
    if(suohaTetris.lines >= 3){
      suohaTetrisWin();
    }
  }
}
function suohaTetrisWin(){
  suohaTetris.running=false;
  if(suohaTetris.timer){ clearInterval(suohaTetris.timer); suohaTetris.timer=null; }
  suohaSetWechat(suohaGetWechat() + 200);
  suohaState.workLast = suohaNow();
  saveState(); suohaUpdateAll();
  var el=document.getElementById('suoha-tetris-result');
  el.classList.remove('suoha-hidden');
  document.getElementById('suoha-tetris-result-text').textContent = '🎉 完美拼三行！赚了 ¥200！';
  document.getElementById('suoha-tetris-start-btn').classList.remove('suoha-hidden');
}
function suohaTetrisGameOver(){
  suohaTetris.running=false;
  if(suohaTetris.timer){ clearInterval(suohaTetris.timer); suohaTetris.timer=null; }
  var el=document.getElementById('suoha-tetris-result');
  el.classList.remove('suoha-hidden');
  document.getElementById('suoha-tetris-result-text').textContent = '💀 堆满了！消除 '+suohaTetris.lines+' 行，没赚到钱';
  document.getElementById('suoha-tetris-start-btn').classList.remove('suoha-hidden');
}
function suohaTetrisTick(){
  if(!suohaTetris.running) return;
  var p=suohaTetris.piece;
  if(!suohaTetrisCollide(p.shape, p.x, p.y+1)){
    p.y++;
  } else {
    suohaTetrisMerge();
    suohaTetrisClearLines();
    if(suohaTetris.running){
      suohaTetris.piece = suohaTetris.next;
      suohaTetris.next = suohaTetrisNewPiece();
      if(suohaTetrisCollide(suohaTetris.piece.shape, suohaTetris.piece.x, suohaTetris.piece.y)){
        suohaTetrisGameOver();
      }
    }
  }
  suohaTetrisDraw();
}
function suohaTetrisLeft(){ if(!suohaTetris.running) return; var p=suohaTetris.piece; if(!suohaTetrisCollide(p.shape,p.x-1,p.y)){ p.x--; suohaTetrisDraw(); } }
function suohaTetrisRight(){ if(!suohaTetris.running) return; var p=suohaTetris.piece; if(!suohaTetrisCollide(p.shape,p.x+1,p.y)){ p.x++; suohaTetrisDraw(); } }
function suohaTetrisDown(){ if(!suohaTetris.running) return; var p=suohaTetris.piece; if(!suohaTetrisCollide(p.shape,p.x,p.y+1)){ p.y++; } else { suohaTetrisMerge(); suohaTetrisClearLines(); if(suohaTetris.running){ suohaTetris.piece=suohaTetris.next; suohaTetris.next=suohaTetrisNewPiece(); if(suohaTetrisCollide(suohaTetris.piece.shape,suohaTetris.piece.x,suohaTetris.piece.y)) suohaTetrisGameOver(); } } suohaTetrisDraw(); }
function suohaTetrisRotate(){
  if(!suohaTetris.running) return;
  var p=suohaTetris.piece;
  var rows=p.shape.length, cols=p.shape[0].length;
  var rot=[];
  for(var c=0;c<cols;c++){ rot.push([]); for(var r=rows-1;r>=0;r--){ rot[c].push(p.shape[r][c]); } }
  if(!suohaTetrisCollide(rot,p.x,p.y)){ p.shape=rot; suohaTetrisDraw(); }
}
function suohaTetrisDraw(){
  var cv=document.getElementById('suoha-tetris-canvas'); if(!cv) return;
  var ctx=cv.getContext('2d');
  var cell=20;
  ctx.fillStyle='#111'; ctx.fillRect(0,0,cv.width,cv.height);
  // board
  for(var r=0;r<20;r++){
    for(var c=0;c<10;c++){
      if(suohaTetris.board[r][c]){
        ctx.fillStyle=suohaTetris.board[r][c];
        ctx.fillRect(c*cell,r*cell,cell-1,cell-1);
      }
    }
  }
  // piece
  if(suohaTetris.piece && suohaTetris.running){
    var p=suohaTetris.piece;
    ctx.fillStyle=p.color;
    for(var r=0;r<p.shape.length;r++){
      for(var c=0;c<p.shape[r].length;c++){
        if(p.shape[r][c]) ctx.fillRect((p.x+c)*cell,(p.y+r)*cell,cell-1,cell-1);
      }
    }
  }
  // next piece
  var nv=document.getElementById('suoha-tetris-next');
  if(nv){
    var nctx=nv.getContext('2d');
    nctx.fillStyle='#111'; nctx.fillRect(0,0,nv.width,nv.height);
    if(suohaTetris.next){
      var n=suohaTetris.next;
      nctx.fillStyle=n.color;
      var nc=20, ox=(nv.width-n.shape[0].length*nc)/2, oy=(nv.height-n.shape.length*nc)/2;
      for(var r=0;r<n.shape.length;r++){
        for(var c=0;c<n.shape[r].length;c++){
          if(n.shape[r][c]) nctx.fillRect(ox+c*nc,oy+r*nc,nc-1,nc-1);
        }
      }
    }
  }
}
function suohaTetrisUpdateUI(){
  var el=document.getElementById('suoha-tetris-lines');
  if(el) el.textContent='消除 '+suohaTetris.lines+' 行';
  var sc=document.getElementById('suoha-tetris-score');
  if(sc) sc.textContent=suohaTetris.score;
}
/* 键盘控制 */
document.addEventListener('keydown', function(e){
  if(!suohaTetris.running) return;
  var tetrisModal = document.getElementById('suoha-m-tetris');
  if(!tetrisModal || !tetrisModal.classList.contains('open')) return;
  switch(e.key){
    case 'ArrowLeft': e.preventDefault(); suohaTetrisLeft(); break;
    case 'ArrowRight': e.preventDefault(); suohaTetrisRight(); break;
    case 'ArrowDown': e.preventDefault(); suohaTetrisDown(); break;
    case 'ArrowUp': e.preventDefault(); suohaTetrisRotate(); break;
  }
});

/* ===== GAMES ===== */
function suohaCanPlay(){
  suohaCheckCooldown();
  if(suohaState.cooldown){ suohaToast('冷却中，无法梭哈 😤'); return false; }
  suohaCheckLoanOverdue();
  if(suohaState.cooldown){ suohaToast('借贷逾期，冷却中！'); suohaUpdateAll(); return false; }
  return true;
}
function suohaGetBet(game){ return 1000 + suohaGameRound[game] * 500; }
function suohaOpenGame(game){
  if(!suohaCanPlay()) return;
  if(suohaState.wallet <= 0){ suohaToast('钱包空空，先去提现'); suohaShow('soul'); return; }
  var bet = suohaGetBet(game);
  if(suohaState.wallet < bet){
    if(suohaState.wallet < 100){ suohaToast('余额不足 ¥100，无法开局'); return; }
    if(!confirm('余额 ' + suohaFmt(suohaState.wallet) + ' 不足底注 ' + suohaFmtShort(bet) + '，是否全押？')) return;
    suohaGameRound[game] = 0;
  }
  suohaGameRound[game] = suohaGameRound[game] || 0;
  document.getElementById('suoha-m-' + game).classList.add('open');
  var betEl = document.getElementById('suoha-' + game + '-bet');
  if(betEl) betEl.textContent = suohaFmtShort(suohaGetBet(game));
  if(game === 'stone') suohaResetStoneUI();
  if(game === 'dice') suohaResetDiceUI();
  if(game === 'cards') suohaResetCardsUI();
  if(game === 'water') suohaResetWaterUI();
}
function suohaCloseGame(game){
  document.getElementById('suoha-m-' + game).classList.remove('open');
  suohaUpdateAll();
}
function suohaNextRound(game){
  document.getElementById('suoha-' + game + '-result').classList.add('suoha-hidden');
  var bet = suohaGetBet(game);
  if(suohaState.wallet < bet){
    if(suohaState.wallet < 100){ suohaToast('余额不足，无法继续'); suohaCloseGame(game); return; }
    if(!confirm('余额 ' + suohaFmt(suohaState.wallet) + ' 不足 ' + suohaFmtShort(bet) + '，全押？')){ suohaCloseGame(game); return; }
  }
  suohaGameRound[game]++;
  var betEl = document.getElementById('suoha-' + game + '-bet');
  if(betEl) betEl.textContent = suohaFmtShort(suohaGetBet(game));
  suohaSetText('suoha-bet-round', '第 ' + (suohaGameRound[game] + 1) + ' 轮 · 每轮加码 ¥500');
  if(game === 'stone') suohaResetStoneUI();
  if(game === 'dice') suohaResetDiceUI();
  if(game === 'cards') suohaResetCardsUI();
  if(game === 'water') suohaResetWaterUI();
}
function suohaSettleGame(result, game){
  var bet = suohaGetBet(game);
  if(bet > suohaState.wallet) bet = suohaState.wallet;
  if(result === 'win'){
    suohaState.wallet += bet; suohaState.wins++; suohaShowResultModal('win', bet);
  } else if(result === 'lose'){
    suohaState.wallet -= bet; suohaState.losses++; suohaState.totalLoss += bet;
    suohaShowResultModal('lose', bet);
    /* Check 1M loss */
    if(suohaState.totalLoss >= 1000000 && !suohaState.cooldown){
      suohaState.cooldown = true;
      suohaState.cooldownUntil = suohaNow() + suohaHours(72);
      suohaState.cooldownReason = '累计亏损超 ¥1,000,000';
      suohaState.bossWarningLast = suohaNow();
      saveState();
      setTimeout(function(){
        suohaSetText('suoha-warning-text', '桀桀桀，亏了 100 万还想跑？给我老实冷却 72 小时吧！');
        document.getElementById('suoha-m-bosswarning').classList.add('open');
      }, 1500);
    }
  } else {
    suohaState.ties++; suohaShowResultModal('tie', 0);
  }
  saveState(); suohaUpdateAll();
}
function suohaShowResultModal(type, amount){
  var emoji, title, kkm, amt;
  if(type === 'win'){ emoji='🎉'; title='赢了！'; kkm='ヽ(>∀<☆)ノ'; amt='+'+suohaFmt(amount); }
  else if(type === 'lose'){ emoji='💸'; title='输了...'; kkm='(；´д｀)'; amt='-'+suohaFmt(amount); }
  else { emoji='🤝'; title='平局'; kkm='¯\\_(ツ)_/¯'; amt='±¥0.00'; }
  suohaSetText('suoha-result-emoji', emoji);
  suohaSetText('suoha-result-title', title);
  suohaSetText('suoha-result-kaomoji', kkm);
  suohaSetText('suoha-result-amount', amt);
  suohaSetText('suoha-result-wallet', '钱包余额 ' + suohaFmt(suohaState.wallet));
  document.getElementById('suoha-m-result').classList.add('open');
}

/* ---- STONE ---- */
var suohaStoneColors = [{name:'黄色',emoji:'🟡'},{name:'绿色',emoji:'🟢'},{name:'橙色',emoji:'🟠'},{name:'蓝色',emoji:'🔵'}];
function suohaResetStoneUI(){
  document.getElementById('suoha-stone-buttons').classList.remove('suoha-hidden');
  document.getElementById('suoha-stone-result').classList.add('suoha-hidden');
  suohaSetText('suoha-stone-hint', '选一个颜色，开石见真章');
}
function suohaPlayStone(choice){
  document.getElementById('suoha-stone-buttons').classList.add('suoha-hidden');
  var resultIdx = Math.floor(Math.random()*4);
  var win = (choice === resultIdx);
  var chosen = suohaStoneColors[choice], actual = suohaStoneColors[resultIdx];
  var emojiEl = document.getElementById('suoha-stone-result-emoji');
  emojiEl.textContent = actual.emoji;
  emojiEl.className = 'suoha-anim-pop';
  suohaSetText('suoha-stone-result-text', win ? '开对了！' : '开错了...');
  suohaSetText('suoha-stone-result-detail', '你选 ' + chosen.name + ' · 开出 ' + actual.name);
  document.getElementById('suoha-stone-result').classList.remove('suoha-hidden');
  suohaSettleGame(win ? 'win' : 'lose', 'stone');
}

/* ---- DICE ---- */
var suohaDiceFaces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
function suohaResetDiceUI(){
  document.getElementById('suoha-dice-buttons').classList.remove('suoha-hidden');
  document.getElementById('suoha-dice-display').classList.add('suoha-hidden');
  document.getElementById('suoha-dice-result').classList.add('suoha-hidden');
  suohaSetText('suoha-dice-hint', '猜大 (11-18) 还是小 (3-10)？');
}
function suohaPlayDice(bet){
  document.getElementById('suoha-dice-buttons').classList.add('suoha-hidden');
  var d1=Math.floor(Math.random()*6)+1, d2=Math.floor(Math.random()*6)+1, d3=Math.floor(Math.random()*6)+1;
  var sum=d1+d2+d3, result=sum>=11?'big':'small', win=(result===bet);
  var display=document.getElementById('suoha-dice-display');
  display.classList.remove('suoha-hidden');
  var d1El=document.getElementById('suoha-dice-1'), d2El=document.getElementById('suoha-dice-2'), d3El=document.getElementById('suoha-dice-3');
  d1El.className='suoha-dice suoha-anim-dice'; d2El.className='suoha-dice suoha-anim-dice'; d3El.className='suoha-dice suoha-anim-dice';
  d1El.textContent=suohaDiceFaces[d1-1]; d2El.textContent=suohaDiceFaces[d2-1]; d3El.textContent=suohaDiceFaces[d3-1];
  setTimeout(function(){
    document.getElementById('suoha-dice-result').classList.remove('suoha-hidden');
    suohaSetText('suoha-dice-result-text', win?'猜对了！':'猜错了...');
    suohaSetText('suoha-dice-result-detail', d1+' + '+d2+' + '+d3+' = '+sum+' ('+(result==='big'?'大':'小')+')');
    suohaSettleGame(win?'win':'lose', 'dice');
  }, 700);
}

/* ---- CARDS ---- */
var suohaCardDeck=[
  {name:'老虎',emoji:'🐯',type:'animal',power:100},
  {name:'羊',emoji:'🐑',type:'animal',power:40},
  {name:'兔子',emoji:'🐰',type:'animal',power:30},
  {name:'猪',emoji:'🐷',type:'animal',power:35},
  {name:'青草',emoji:'🌿',type:'food',power:10},
  {name:'胡萝卜',emoji:'🥕',type:'food',power:10},
  {name:'猪糠',emoji:'🌾',type:'food',power:10}
];
function suohaCompareCards(p,a){
  if(p.name===a.name) return 'tie';
  if(p.name==='老虎') return 'win';
  if(a.name==='老虎') return 'lose';
  if(p.name==='羊'&&a.name==='青草') return 'win';
  if(a.name==='羊'&&p.name==='青草') return 'lose';
  if(p.name==='兔子'&&a.name==='胡萝卜') return 'win';
  if(a.name==='兔子'&&p.name==='胡萝卜') return 'lose';
  if(p.name==='猪'&&a.name==='猪糠') return 'win';
  if(a.name==='猪'&&p.name==='猪糠') return 'lose';
  if(p.type==='animal'&&a.type==='food') return 'win';
  if(a.type==='animal'&&p.type==='food') return 'lose';
  if(p.type==='animal'&&a.type==='animal'){ if(p.power>a.power) return 'win'; if(p.power<a.power) return 'lose'; }
  return 'tie';
}
function suohaResetCardsUI(){
  document.getElementById('suoha-cards-display').classList.add('suoha-hidden');
  document.getElementById('suoha-cards-draw-btn').classList.remove('suoha-hidden');
  document.getElementById('suoha-cards-result').classList.add('suoha-hidden');
  suohaSetText('suoha-cards-hint', '动物吃食物，老虎吃一切，同卡平局');
}
function suohaPlayCards(){
  document.getElementById('suoha-cards-draw-btn').classList.add('suoha-hidden');
  var pc=suohaCardDeck[Math.floor(Math.random()*suohaCardDeck.length)];
  var ac=suohaCardDeck[Math.floor(Math.random()*suohaCardDeck.length)];
  var result=suohaCompareCards(pc,ac);
  document.getElementById('suoha-cards-display').classList.remove('suoha-hidden');
  var pEl=document.getElementById('suoha-card-player'), aEl=document.getElementById('suoha-card-ai');
  pEl.textContent=pc.emoji; aEl.textContent=ac.emoji;
  pEl.className='suoha-anim-card'; aEl.className='suoha-anim-card';
  pEl.style.fontSize='42px'; aEl.style.fontSize='42px';
  suohaSetText('suoha-card-player-name', pc.name);
  suohaSetText('suoha-card-ai-name', ac.name);
  setTimeout(function(){
    document.getElementById('suoha-cards-result').classList.remove('suoha-hidden');
    var msg, detail;
    if(result==='win'){ msg='你赢了！'; detail=pc.name+' 克 '+ac.name; }
    else if(result==='lose'){ msg='你输了...'; detail=ac.name+' 克 '+pc.name; }
    else { msg='平局'; detail=pc.name+' vs '+ac.name; }
    suohaSetText('suoha-cards-result-text', msg);
    suohaSetText('suoha-cards-result-detail', detail);
    suohaSettleGame(result, 'cards');
  }, 600);
}

/* ---- WATER ---- */
var suohaPlantStages=[{emoji:'🌰',name:'种子'},{emoji:'🌱',name:'发芽'},{emoji:'🌿',name:'幼苗'},{emoji:'🌷',name:'花苞'},{emoji:'🌺',name:'开花'}];
function suohaResetWaterUI(){
  document.getElementById('suoha-water-btn').classList.remove('suoha-hidden');
  document.getElementById('suoha-water-result').classList.add('suoha-hidden');
  document.getElementById('suoha-water-btn').disabled=false;
  suohaWaterState={player:0,ai:0,turn:'player',done:false};
  suohaUpdateWaterUI();
}
function suohaUpdateWaterUI(){
  if(!suohaWaterState) return;
  var p=suohaPlantStages[suohaWaterState.player], a=suohaPlantStages[suohaWaterState.ai];
  document.getElementById('suoha-plant-player').textContent=p.emoji;
  document.getElementById('suoha-plant-ai').textContent=a.emoji;
  suohaSetText('suoha-plant-player-stage', p.name);
  suohaSetText('suoha-plant-ai-stage', a.name);
  if(suohaWaterState.done) suohaSetText('suoha-water-turn','');
  else if(suohaWaterState.turn==='player') suohaSetText('suoha-water-turn','轮到你了');
  else suohaSetText('suoha-water-turn','老板浇水...');
}
function suohaWaterPlant(){
  if(!suohaWaterState||suohaWaterState.done||suohaWaterState.turn!=='player') return;
  var g=Math.random();
  if(g<0.65) suohaWaterState.player+=1;
  else if(g<0.88) suohaWaterState.player+=2;
  else suohaWaterState.player=Math.max(0,suohaWaterState.player-1);
  suohaWaterState.player=Math.min(4,suohaWaterState.player);
  suohaUpdateWaterUI();
  if(suohaWaterState.player>=4){
    suohaWaterState.done=true;
    document.getElementById('suoha-water-btn').disabled=true;
    setTimeout(function(){
      document.getElementById('suoha-water-result').classList.remove('suoha-hidden');
      suohaSetText('suoha-water-result-text','你的花开了！🎉');
      suohaSetText('suoha-water-result-detail','先开花者胜！');
      suohaSettleGame('win','water');
    },500);
    return;
  }
  suohaWaterState.turn='ai';
  document.getElementById('suoha-water-btn').disabled=true;
  suohaUpdateWaterUI();
  setTimeout(function(){
    var ag=Math.random();
    if(ag<0.65) suohaWaterState.ai+=1;
    else if(ag<0.88) suohaWaterState.ai+=2;
    else suohaWaterState.ai=Math.max(0,suohaWaterState.ai-1);
    suohaWaterState.ai=Math.min(4,suohaWaterState.ai);
    suohaUpdateWaterUI();
    if(suohaWaterState.ai>=4){
      suohaWaterState.done=true;
      setTimeout(function(){
        document.getElementById('suoha-water-result').classList.remove('suoha-hidden');
        suohaSetText('suoha-water-result-text','老板的花先开了...');
        suohaSetText('suoha-water-result-detail','下次快点浇水！');
        suohaSettleGame('lose','water');
      },500);
      return;
    }
    suohaWaterState.turn='player';
    document.getElementById('suoha-water-btn').disabled=false;
    suohaUpdateWaterUI();
  },1000);
}

/* ===== MODAL / RESET ===== */
function suohaCloseModal(id){ document.getElementById(id).classList.remove('open'); }
function suohaReset(){
  if(!confirm('确定重置全部梭哈数据？所有余额、贷款、战绩将清空。')) return;
  suohaState = suohaDefault();
  suohaGameRound = { stone:0, dice:0, cards:0, water:0 };
  saveState(); suohaUpdateAll(); suohaShow('soul');
  suohaToast('已重置');
}

/* ===== AUTO-INIT ===== */
(function(){
  /* ensure state exists after loadState */
  if(!suohaState) suohaState = suohaDefault();
  /* Run init after DOM ready */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(suohaInit, 100); });
  } else {
    setTimeout(suohaInit, 100);
  }
})();

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
    asmrProgress: 0,
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

/* ---- AI Call Helper ---- */
function goCallAI(prompt, systemPrompt, cb){
  var m = apiConfig.models[apiConfig.active];
  if(!m || !m.key){ cb(null); return; }
  var ep = normEp(m.endpoint, m.apiFormat);
  var msgs = [];
  if(systemPrompt) msgs.push({role:'system', content:systemPrompt});
  msgs.push({role:'user', content:prompt});
  fetch(ep, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+m.key},
    body:JSON.stringify({model:m.model, messages:msgs, stream:false, max_tokens:300})
  }).then(function(r){ return r.json(); }).then(function(d){
    var txt = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    cb(txt);
  }).catch(function(e){ cb(null); });
}

function goCallAIVision(prompt, imgB64, cb){
  var m = apiConfig.models[apiConfig.active];
  if(!m || !m.key){ cb(null); return; }
  var ep = normEp(m.endpoint, m.apiFormat);
  var body = {
    model: m.model,
    messages: [
      {role:'system', content:'You are an AI that analyzes screenshots.'},
      {role:'user', content:[
        {type:'text', text:prompt},
        {type:'image_url', image_url:{url:imgB64}}
      ]}
    ],
    stream:false, max_tokens:80
  };
  fetch(ep, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+m.key},
    body:JSON.stringify(body)
  }).then(function(r){ return r.json(); }).then(function(d){
    var txt = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    cb(txt);
  }).catch(function(e){ cb(null); });
}

/* ---- Setup Page ---- */
function goRenderSetup(){
  var s = goState;
  var bal = document.getElementById('go-balance-display');
  if(bal) bal.textContent = '余额 ' + s.balance;
  var types = [
    {id:'ecommerce', t:'带货', s:'卖货赚佣金', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="8" cy="14" r="1" fill="#1a1a1a"/><circle cx="16" cy="14" r="1" fill="#1a1a1a"/></svg>'},
    {id:'game', t:'游戏', s:'战绩换奖励', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="7" width="20" height="11" rx="3"/><path d="M7 12h4M9 10v4" stroke-linecap="round"/><circle cx="16" cy="11" r="1" fill="#1a1a1a"/><circle cx="18" cy="14" r="1" fill="#1a1a1a"/></svg>'},
    {id:'couple', t:'情侣Q&A', s:'连麦答题', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/><path d="M9 11h6"/></svg>'},
    {id:'asmr', t:'ASMR', s:'语音助眠', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><path d="M3 12h2l2-6 4 14 3-10 2 6h5"/></svg>'},
    {id:'voice', t:'语音厅', s:'唱歌语音', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>'},
    {id:'beauty', t:'美妆', s:'美妆教程', ico:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="9" r="5"/><path d="M12 14v6M9 20h6"/></svg>'}
  ];
  var grid = document.getElementById('go-type-grid');
  if(grid) grid.innerHTML = types.map(function(tp){
    var sel = s.liveType === tp.id ? ' selected' : '';
    return '<div class="go-type-card'+sel+'" onclick="goSelectType(\''+tp.id+'\')">'+tp.ico+'<div class="t">'+tp.t+'</div><div class="s">'+tp.s+'</div></div>';
  }).join('');
  var cats = [
    {id:'auto', t:'自动混合'}, {id:'funny', t:'搞笑抽象'}, {id:'pro', t:'专业'},
    {id:'simp', t:'舔狗'}, {id:'hate', t:'黑粉'}, {id:'custom', t:'自定义'}
  ];
  var dmWrap = document.getElementById('go-dm-cats');
  if(dmWrap) dmWrap.innerHTML = cats.map(function(c){
    var sel = s.danmakuCat === c.id;
    var st = sel ? 'border:1.5px solid #1a1a1a;color:#1a1a1a;background:#fff;' : 'border:1px solid rgba(0,0,0,0.12);color:#888;background:transparent;';
    return '<button class="go-btn sm" style="'+st+'" onclick="goSelectDmCat(\''+c.id+'\')">'+c.t+'</button>';
  }).join('');
  var wbSel = document.getElementById('go-wb-bind');
  if(wbSel){
    var opts = '<option value="">不绑定</option>';
    if(typeof worldBooks !== 'undefined'){
      Object.keys(worldBooks).forEach(function(k){
        opts += '<option value="'+k+'"'+(s.worldBookBind===k?' selected':'')+'>'+worldBooks[k].name+'</option>';
      });
    }
    wbSel.innerHTML = opts;
  }
  var idEl = document.getElementById('go-live-id');
  if(idEl) idEl.value = s.liveId || '';
  var av = document.getElementById('go-avatar-preview');
  if(av){ av.style.backgroundImage = s.liveAvatar ? 'url('+s.liveAvatar+')' : ''; }
  var dmC = document.getElementById('go-dm-custom');
  if(dmC) dmC.value = s.danmakuCustom || '';
  // History
  var hist = document.getElementById('go-history-list');
  if(hist && s.history.length > 0){
    var typeNames = {ecommerce:'带货',game:'游戏',couple:'情侣Q&A',asmr:'ASMR',voice:'语音厅',beauty:'美妆'};
    hist.innerHTML = '<div class="go-label">直播记录</div>' + s.history.slice(-5).reverse().map(function(h){
      var d = new Date(h.time);
      var ts = (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes();
      return '<div class="go-card soft" style="padding:10px 14px;margin-bottom:6px;"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:#555;">'+typeNames[h.type]+' '+ts+'</span><span style="font-size:13px;font-weight:600;color:'+(h.success?'#1a8a3a':'#888')+';">'+(h.success?'+¥'+h.reward:'未完成')+'</span></div></div>';
    }).join('');
  } else if(hist){
    hist.innerHTML = '';
  }
}

function goSelectType(type){ goState.liveType = type; goRenderSetup(); }
function goSelectDmCat(cat){ goState.danmakuCat = cat; goRenderSetup(); }
function goPickAvatar(){ goFileContext = 'avatar'; document.getElementById('go-file-input').click(); }

/* ---- Start Live ---- */
function goStartLive(){
  var s = goState;
  s.liveId = (document.getElementById('go-live-id').value || '').trim();
  s.danmakuCustom = (document.getElementById('go-dm-custom').value || '').trim();
  s.worldBookBind = document.getElementById('go-wb-bind').value;
  if(!s.liveType){ goToast('请选择直播类型'); return; }
  if(!s.liveId){ goToast('请输入直播ID'); return; }
  s.isLive = true;
  s.liveStartTime = Date.now();
  goLiveSeconds = 0;
  s.orders = 0;
  s.asmrProgress = 0;
  s.qaCurrent = 0;
  s.qaQuestions = [];
  s.qaPartner = '';
  document.getElementById('go-page-setup').classList.remove('active');
  document.getElementById('go-page-live').classList.add('active');
  var tn = {ecommerce:'带货直播',game:'游戏直播',couple:'情侣Q&A',asmr:'ASMR直播',voice:'语音厅',beauty:'美妆直播'};
  document.getElementById('go-live-title').textContent = tn[s.liveType] || '直播中';
  if(goLiveTimer) clearInterval(goLiveTimer);
  goLiveTimer = setInterval(function(){
    goLiveSeconds++;
    var m = Math.floor(goLiveSeconds/60), sec = goLiveSeconds%60;
    var el = document.getElementById('go-live-timer');
    if(el) el.textContent = (m<10?'0':'')+m+':'+(sec<10?'0':'')+sec;
  }, 1000);
  goRenderLive();
  saveState();
}

/* ---- Render Live Page ---- */
function goRenderLive(){
  var s = goState;
  var c = document.getElementById('go-live-content');
  if(!c) return;
  var avHtml = s.liveAvatar
    ? '<div class="go-live-avatar go-avatar-float" style="background-image:url('+s.liveAvatar+')"></div>'
    : '<div class="go-live-avatar go-avatar-float" style="background:#444;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;">'+(s.liveId[0]||'G')+'</div>';
  var stage = '<div class="go-live-stage" id="go-live-stage">'+
    '<div class="go-live-bg" id="go-live-bg"></div>'+
    '<div class="go-live-type-badge">'+({ecommerce:'带货',game:'游戏',couple:'情侣Q&A',asmr:'ASMR',voice:'语音厅',beauty:'美妆'}[s.liveType]||'')+'</div>'+
    '<div class="go-live-viewers"><span id="go-viewer-count">'+Math.floor(Math.random()*200+80)+'</span> 观看</div>'+
    '<div class="go-live-overlay">'+avHtml+'<div class="go-live-id">'+s.liveId+'</div></div>'+
    '<div class="go-danmaku-area" id="go-danmaku-area"></div>'+
    '</div>';
  var bgHtml = '<div class="go-card" style="margin-top:12px;"><div class="go-label">直播背景</div><div class="go-bg-picker" id="go-bg-picker"></div></div>';
  var typeHtml = '';
  if(s.liveType==='ecommerce') typeHtml = goRenderEcommerce();
  else if(s.liveType==='game') typeHtml = goRenderGame();
  else if(s.liveType==='couple') typeHtml = goRenderCouple();
  else typeHtml = goRenderVoice(s.liveType);
  c.innerHTML = stage + bgHtml + typeHtml;
  var bgs = ['linear-gradient(135deg,#2a2a2a,#1a1a1a)','linear-gradient(135deg,#1a3a5a,#0d1f3a)','linear-gradient(135deg,#3a1a3a,#1a0d2a)','linear-gradient(135deg,#1a3a1a,#0d2a0d)','linear-gradient(135deg,#3a2a1a,#2a1a0d)'];
  var bp = document.getElementById('go-bg-picker');
  if(bp) bp.innerHTML = bgs.map(function(bg,i){
    return '<div class="go-bg-swatch'+(s.liveBg===i?' selected':'')+'" style="background:'+bg+'" onclick="goSwitchBg('+i+')"></div>';
  }).join('');
  goSwitchBg(s.liveBg);
  goStartDanmaku();
}

function goSwitchBg(idx){
  goState.liveBg = idx;
  var bgs = ['linear-gradient(135deg,#2a2a2a,#1a1a1a)','linear-gradient(135deg,#1a3a5a,#0d1f3a)','linear-gradient(135deg,#3a1a3a,#1a0d2a)','linear-gradient(135deg,#1a3a1a,#0d2a0d)','linear-gradient(135deg,#3a2a1a,#2a1a0d)'];
  var bg = document.getElementById('go-live-bg');
  if(bg) bg.style.background = bgs[idx]||bgs[0];
  document.querySelectorAll('.go-bg-swatch').forEach(function(sw,i){ sw.classList.toggle('selected', i===idx); });
}

/* ---- Danmaku ---- */
function goStartDanmaku(){
  goStopDanmaku();
  goDanmakuTimer = setInterval(function(){ goGenerateDanmaku(); }, 2800 + Math.random()*2500);
}
function goStopDanmaku(){
  if(goDanmakuTimer){ clearInterval(goDanmakuTimer); goDanmakuTimer = null; }
}
function goGenerateDanmaku(){
  var s = goState;
  var area = document.getElementById('go-danmaku-area');
  if(!area) return;
  var catMap = {
    auto:'自动混合风格，可以是搞笑的、专业的、或随意评论',
    funny:'搞笑抽象风格，用网络梗、无厘头的方式评论',
    pro:'专业风格，从专业角度分析评价',
    simp:'舔狗风格，疯狂夸赞主播',
    hate:'黑粉风格，故意挑刺找茬但不太过分',
    custom: s.danmakuCustom || '随意评论'
  };
  var typeMap = {ecommerce:'带货直播',game:'游戏直播',couple:'情侣Q&A直播',asmr:'ASMR直播',voice:'语音厅直播',beauty:'美妆直播'};
  var wbCtx = '';
  if(s.worldBookBind && typeof worldBooks!=='undefined' && worldBooks[s.worldBookBind]){
    wbCtx = '参考世界书: ' + (worldBooks[s.worldBookBind].content||'').substring(0,200);
  }
  var npcNames = ['游客'+Math.floor(Math.random()*9999),'路人甲','小可爱','吃瓜群众','大佬666','潜水员','路过的','粉丝'+Math.floor(Math.random()*99),'萌新','老粉'];
  var npcName = npcNames[Math.floor(Math.random()*npcNames.length)];
  var fbPool = ['主播好厉害','666','来了来了','哈哈哈哈','声音好好听','学习了','已下单','冲冲冲','太牛了','主播多大了','关注了','第一次来','好可爱','这操作我服了','主播加油','好专业','学到了','笑死','强无敌','冲鸭','主播好好看','我酸了','慕名而来','主播声音好甜','这也能行','绝了','主播棒棒','已三连','泪目了','主播好温柔'];
  goCallAI(
    '你正在观看一个'+typeMap[s.liveType]+'，主播ID是'+s.liveId+'。请用'+catMap[s.danmakuCat]+'发一条弹幕，不超过20字。'+wbCtx+'只输出弹幕内容。',
    '你是一个直播观众，用口语化方式发弹幕。',
    function(text){
      var dm = (text||'').replace(/\n/g,'').substring(0,30) || fbPool[Math.floor(Math.random()*fbPool.length)];
      var div = document.createElement('div');
      div.className = 'go-danmaku-item';
      div.textContent = npcName+': '+dm;
      area.appendChild(div);
      while(area.children.length>8) area.removeChild(area.firstChild);
      setTimeout(function(){ if(div.parentNode) div.remove(); }, 5000);
    }
  );
  var vc = document.getElementById('go-viewer-count');
  if(vc){
    var cur = parseInt(vc.textContent)||100;
    cur += Math.floor(Math.random()*8-3);
    if(cur<30) cur=30;
    vc.textContent = cur;
  }
}

/* ---- E-commerce Live ---- */
function goRenderEcommerce(){
  var s = goState;
  return '<div class="go-card">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
    '<div class="go-label" style="margin:0;" id="go-order-label">订单 '+s.orders+'/15</div>'+
    '<div class="go-label" style="margin:0;">产品 '+s.products.length+'</div></div>'+
    '<div class="go-progress"><div class="go-progress-bar" id="go-order-bar" style="width:'+(s.orders/15*100)+'%"></div></div>'+
    '</div>'+
    '<div class="go-card">'+
    '<div class="go-label">小黄车</div>'+
    '<div id="go-product-display"></div>'+
    '<button class="go-btn sm ghost" style="margin-top:8px;" onclick="goOpenCart()">管理产品</button>'+
    '</div>'+
    '<div class="go-card">'+
    '<div class="go-label">语音讲解</div>'+
    '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:10px;">点击按钮开始讲解产品，AI会评判你的讲解并触发观众下单</div>'+
    '<button class="go-btn primary" id="go-pitch-btn" onclick="goVoiceInput(\'ecommerce\')">开始语音讲解</button>'+
    '<div id="go-pitch-feedback" style="margin-top:10px;"></div>'+
    '</div>';
}

function goOpenCart(){
  goRenderProductList();
  goOpenModal('go-modal-cart');
}
function goRenderProductList(){
  var s = goState;
  var list = document.getElementById('go-product-list');
  if(!list) return;
  if(s.products.length===0){
    list.innerHTML = '<div style="text-align:center;color:#888;font-size:13px;padding:12px;">暂无产品，添加你的带货产品</div>';
    return;
  }
  list.innerHTML = s.products.map(function(p,i){
    var imgSt = p.img ? 'background-image:url('+p.img+')' : 'background:#f0f0f0';
    return '<div class="go-product-row"><div class="img" style="'+imgSt+'"></div><div class="info"><div class="n">'+p.name+'</div><div class="p">¥'+p.price+'</div></div><button class="go-btn sm ghost" onclick="goRemoveProduct('+i+')">删除</button></div>';
  }).join('');
}
function goAddProduct(){
  var name = (document.getElementById('go-prod-name').value||'').trim();
  var price = (document.getElementById('go-prod-price').value||'').trim();
  if(!name){ goToast('请输入产品名称'); return; }
  if(!price){ goToast('请输入价格'); return; }
  goState.products.push({name:name, price:price, img:goProductImg});
  goProductImg = '';
  document.getElementById('go-prod-name').value = '';
  document.getElementById('go-prod-price').value = '';
  goToast('产品已添加');
  goRenderProductList();
  goUpdateProductDisplay();
  saveState();
}
function goRemoveProduct(idx){
  goState.products.splice(idx,1);
  goRenderProductList();
  goUpdateProductDisplay();
  saveState();
}
function goUpdateProductDisplay(){
  var s = goState;
  var d = document.getElementById('go-product-display');
  if(!d) return;
  if(s.products.length===0){ d.innerHTML = '<div style="font-size:13px;color:#888;">点击下方按钮添加产品</div>'; return; }
  d.innerHTML = s.products.map(function(p){
    var imgSt = p.img ? 'background-image:url('+p.img+')' : 'background:#f0f0f0';
    return '<div class="go-product-row"><div class="img" style="'+imgSt+'"></div><div class="info"><div class="n">'+p.name+'</div><div class="p">¥'+p.price+'</div></div></div>';
  }).join('');
}
function goUploadProductImg(){ goFileContext='product'; document.getElementById('go-file-input').click(); }

function goCheckPitch(text){
  var s = goState;
  goToast('AI正在评判你的讲解...');
  var prodInfo = s.products.length > 0 ? '主播在卖: '+s.products.map(function(p){return p.name+'(¥'+p.price+')';}).join(', ') : '主播还没有上架产品';
  goCallAI(
    '一个带货主播正在讲解产品，他说的话是: "'+text+'"。'+prodInfo+'。\n请评判讲解质量(1-10分)，格式: 分数|简短反馈。例如: 8|讲解很专业，产品卖点清晰。',
    '你是一个直播平台的内容审核AI。',
    function(result){
      if(!result){
        var sc = Math.floor(Math.random()*4+6);
        goToast('讲解评分: '+sc+'/10');
        if(sc>=6) goTriggerOrders();
        return;
      }
      var parts = result.split('|');
      var score = parseInt(parts[0].replace(/[^0-9]/g,''))||7;
      var fb = (parts[1]||'讲解不错').trim();
      goToast('评分 '+score+'/10 '+fb);
      var pf = document.getElementById('go-pitch-feedback');
      if(pf) pf.innerHTML = '<div class="go-card soft" style="padding:10px 14px;"><div style="font-size:13px;color:#555;">'+fb+'</div></div>';
      if(score>=6) goTriggerOrders();
    }
  );
}
function goTriggerOrders(){
  var s = goState;
  if(s.products.length===0){ goToast('请先添加产品到小黄车'); return; }
  var count = Math.floor(Math.random()*3+1);
  for(var i=0;i<count;i++){
    (function(idx){
      setTimeout(function(){
        if(!goState.isLive) return;
        goState.orders++;
        var prod = goState.products[Math.floor(Math.random()*goState.products.length)];
        goToast(prod.name+' 被下单! ('+goState.orders+'/15)');
        var ol = document.getElementById('go-order-label');
        if(ol) ol.textContent = '订单 '+goState.orders+'/15';
        var ob = document.getElementById('go-order-bar');
        if(ob) ob.style.width = (goState.orders/15*100)+'%';
        if(goState.orders>=15){ goEndLive(true,1000); }
      }, idx*1200);
    })(i);
  }
}

/* ---- Game Live ---- */
function goRenderGame(){
  var games = [
    {name:'王者荣耀', color:'#1e3a5f', ico:'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L4 6v6c0 4 3 7 8 10 5-3 8-6 8-10V6l-8-4z"/></svg>'},
    {name:'第五人格', color:'#5f1e3a', ico:'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 10l2 2 4-4M8 16h8"/></svg>'},
    {name:'光遇', color:'#3a5f1e', ico:'<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>'}
  ];
  var gHtml = games.map(function(g){
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">'+
      '<div class="go-game-icon" style="background:'+g.color+';" onclick="goToast(\'去'+g.name+'打游戏吧，打完上传战绩截图\')">'+g.ico+'</div>'+
      '<div style="font-size:12px;font-weight:600;color:#1a1a1a;">'+g.name+'</div></div>';
  }).join('');
  return '<div class="go-card">'+
    '<div class="go-label">游戏直播</div>'+
    '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">选择游戏开始游玩，结束后上传战绩截图。AI将自动判定胜负，胜利奖励1000。</div>'+
    '<div class="go-game-launch">'+gHtml+'</div></div>'+
    '<div class="go-card"><div class="go-label">上传战绩截图</div>'+
    '<div id="go-game-upload" style="border:1.5px dashed rgba(0,0,0,0.15);border-radius:12px;padding:24px;text-align:center;cursor:pointer;" onclick="goUploadGameScreenshot()">'+
    '<div style="font-size:14px;color:#888;">点击上传战绩截图</div></div></div>';
}
function goUploadGameScreenshot(){ goFileContext='game'; document.getElementById('go-file-input').click(); }
function goAICheckGameResult(img){
  goToast('AI正在分析战绩...');
  var upload = document.getElementById('go-game-upload');
  if(upload){
    upload.innerHTML = '<div style="font-size:14px;color:#555;">AI分析中...</div>';
    upload.style.cursor = 'default';
  }
  goCallAIVision(
    '请分析这张游戏截图，判断是胜利还是失败。只回答"胜利"或"失败"。',
    img,
    function(text){
      if(!text){
        var win = Math.random()>0.4;
        goToast(win?'AI判定: 胜利! 奖励1000':'AI判定: 失败，再接再厉');
        if(win) goEndLive(true,1000);
        else if(upload) upload.innerHTML = '<div style="font-size:14px;color:#888;">AI判定失败，重新上传</div>';
        return;
      }
      var win = text.indexOf('胜')>=0||text.indexOf('赢')>=0||text.toLowerCase().indexOf('win')>=0||text.indexOf('victor')>=0;
      goToast(win?'AI判定: 胜利! 奖励1000':'AI判定: 失败，再接再厉');
      if(win) goEndLive(true,1000);
      else if(upload){ upload.style.cursor='pointer'; upload.innerHTML='<div style="font-size:14px;color:#888;">AI判定失败，点击重新上传</div>'; }
    }
  );
}

/* ---- Couple Q&A Live ---- */
function goRenderCouple(){
  var s = goState;
  var pName = s.qaPartner && contacts[s.qaPartner] ? contacts[s.qaPartner].name : '';
  if(!s.qaPartner){
    return '<div class="go-card"><div class="go-label">情侣Q&A</div>'+
      '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">选择一位WeChat联系人连麦，一起回答AI生成的20个问题</div>'+
      '<button class="go-btn primary" onclick="goOpenPartnerModal()">选择连麦对象</button></div>';
  }
  if(s.qaQuestions.length===0){
    return '<div class="go-card"><div class="go-label">情侣Q&A - 连麦: '+pName+'</div><div style="text-align:center;padding:20px;font-size:14px;color:#888;">正在生成问题...</div></div>';
  }
  if(s.qaCurrent>=s.qaQuestions.length){
    return '<div class="go-card" style="text-align:center;padding:24px;">'+
      '<div style="font-size:20px;font-weight:700;margin-bottom:8px;color:#1a1a1a;">答题完成</div>'+
      '<div style="font-size:14px;color:#888;margin-bottom:16px;">你们完成了'+s.qaQuestions.length+'道问题</div>'+
      '<button class="go-btn primary" onclick="goEndLive(true,1000)">领取奖励 ¥1000</button></div>';
  }
  var q = s.qaQuestions[s.qaCurrent];
  var prog = (s.qaCurrent/s.qaQuestions.length)*100;
  return '<div class="go-card">'+
    '<div class="go-label">Q'+(s.qaCurrent+1)+'/'+s.qaQuestions.length+' 连麦: '+pName+'</div>'+
    '<div class="go-progress"><div class="go-progress-bar" style="width:'+prog+'%"></div></div>'+
    '<div class="go-qa-card" style="margin-top:12px;"><div class="go-qa-q">'+q+'</div>'+
    '<input class="go-qa-input" id="go-qa-answer" placeholder="输入你的回答" onkeydown="if(event.key===\'Enter\')goAnswerQA()"></div>'+
    '<div id="go-qa-partner" style="margin-top:10px;"></div>'+
    '<button class="go-btn primary" style="margin-top:10px;" onclick="goAnswerQA()">提交回答</button></div>';
}
function goOpenPartnerModal(){
  var list = document.getElementById('go-partner-list');
  var cs = Object.keys(contacts).filter(function(k){ return k!=='me' && !contacts[k].blocked && !contacts[k].isGroup; });
  if(cs.length===0){ list.innerHTML = '<div style="text-align:center;color:#888;padding:12px;">暂无可用联系人</div>'; }
  else {
    list.innerHTML = cs.map(function(k){
      var c = contacts[k];
      var avSt = c.avatar ? 'background-image:url('+c.avatar+');background-size:cover;background-position:center;' : 'background:'+(c.avatarColor||'#999');
      return '<div class="go-buyer-row" style="cursor:pointer;" onclick="goSelectPartner(\''+k+'\')"><div class="av" style="'+avSt+'"></div><div style="flex:1;font-size:14px;font-weight:600;color:#1a1a1a;">'+c.name+'</div></div>';
    }).join('');
  }
  goOpenModal('go-modal-partner');
}
function goSelectPartner(id){
  goState.qaPartner = id;
  goCloseModal('go-modal-partner');
  goToast('已选择 '+contacts[id].name+' 连麦');
  goGenerateQA();
}
function goGenerateQA(){
  var s = goState;
  var pName = contacts[s.qaPartner] ? contacts[s.qaPartner].name : '对方';
  goCallAI(
    '请生成20个情侣Q&A问题，每行一个，问题要有趣、有深度，涵盖恋爱、生活、未来等方面。只输出问题，不要编号。',
    '你是一个情侣互动游戏AI。',
    function(text){
      if(!text){
        s.qaQuestions = ['如果用一道菜形容我们的关系，你觉得是什么？','你第一次见到我时心里在想什么？','如果我们可以穿越时空，你想回到哪一天？','你觉得我最大的优点是什么？','你最想和我一起去哪里旅行？','如果世界末日只能带一样东西，你带什么？','你觉得我们的默契度有多高？','最想对我说但一直没说出口的话是什么？','如果用一首歌形容我们，是哪首？','你觉得我什么时候最好看？','如果我们变成对方一天，你最想做什么？','你最珍惜和我的一张合照是哪张？','如果给我打分，你打几分？','你觉得我们最大的共同点是什么？','最想和我一起完成的事情是什么？','你觉得恋爱中最重要的品质是什么？','如果我们的故事写成书，书名叫什么？','你最怕我做什么？','你觉得我们会在一起多久？','此刻最想对我说什么？'];
      } else {
        s.qaQuestions = text.split('\n').map(function(l){ return l.replace(/^\d+[.、]\s*/,'').trim(); }).filter(function(l){ return l.length>0; }).slice(0,20);
        if(s.qaQuestions.length<5){
          s.qaQuestions = ['你觉得我怎么样？','最想和我做什么？','你觉得我们有默契吗？','最想对我说什么？','如果重来一次还会选择我吗？','你觉得我最大的魅力是什么？','最想和我去哪里？','你觉得我们之间最难忘的事是什么？'];
        }
      }
      goRenderLive();
      saveState();
    }
  );
  goRenderLive();
}
function goAnswerQA(){
  var s = goState;
  var inp = document.getElementById('go-qa-answer');
  if(!inp) return;
  var text = inp.value.trim();
  if(!text){ goToast('请输入回答'); return; }
  var pDiv = document.getElementById('go-qa-partner');
  if(pDiv) pDiv.innerHTML = '<div class="go-qa-card"><div class="go-label">你的回答</div><div class="go-qa-a">'+text+'</div></div>';
  var pName = contacts[s.qaPartner] ? contacts[s.qaPartner].name : '对方';
  var q = s.qaQuestions[s.qaCurrent];
  var btn = document.querySelector('#go-live-content .go-btn.primary');
  if(btn){ btn.style.display='none'; }
  goCallAI(
    '你现在是'+pName+'，正在和伴侣做情侣Q&A。问题是: "'+q+'"。对方的回答是: "'+text+'"。\n请以'+pName+'的身份回答这个问题，回答要自然、有个性、不超过50字。',
    '你是一个角色扮演AI，请代入角色回答。',
    function(result){
      if(!result) result = '我觉得这个问题很好，我的想法是...';
      if(pDiv) pDiv.innerHTML += '<div class="go-qa-card" style="margin-top:8px;"><div class="go-label">'+pName+'的回答</div><div class="go-qa-a">'+result+'</div></div>'+
        '<button class="go-btn primary" style="margin-top:8px;" onclick="goNextQA()">下一题</button>';
    }
  );
}
function goNextQA(){
  goState.qaCurrent++;
  goRenderLive();
  saveState();
}

/* ---- ASMR / Voice Hall / Beauty Live ---- */
function goRenderVoice(type){
  var s = goState;
  var tn = {asmr:'ASMR', voice:'语音厅', beauty:'美妆'};
  var desc = {
    asmr:'点击按钮开始你的ASMR表演，AI会作为听众与你互动。完成3次语音互动即可获得奖励。',
    voice:'点击按钮开始唱歌或语音聊天，AI会作为听众与你互动。完成3次语音互动即可获得奖励。',
    beauty:'点击按钮开始你的美妆教程讲解，AI会作为听众与你互动。完成3次语音互动即可获得奖励。'
  };
  var prog = s.asmrProgress;
  var need = 3;
  return '<div class="go-card">'+
    '<div class="go-label">'+tn[type]+'直播</div>'+
    '<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;">'+desc[type]+'</div>'+
    '<div class="go-progress"><div class="go-progress-bar" style="width:'+(prog/need*100)+'%"></div></div>'+
    '<div style="text-align:center;font-size:12px;color:#888;margin-top:6px;">'+prog+'/'+need+' 次语音互动</div>'+
    '<div style="text-align:center;margin-top:16px;">'+
    '<button class="go-btn primary" id="go-voice-btn" onclick="goVoiceInput(\''+type+'\')">'+(prog>=need?'已完成':'开始语音')+'</button></div>'+
    '<div id="go-voice-feedback" style="margin-top:12px;"></div></div>';
}
function goCompleteVoiceSession(text){
  var s = goState;
  var tn = {asmr:'ASMR', voice:'语音厅', beauty:'美妆'};
  var pm = {
    asmr:'一个ASMR主播正在表演，内容是: "'+text+'"。请以听众身份给出自然反应，不超过30字。',
    voice:'一个语音厅主播正在唱歌/说话，内容是: "'+text+'"。请以听众身份给出自然反应，不超过30字。',
    beauty:'一个美妆主播正在讲解，内容是: "'+text+'"。请以听众身份给出自然反应，不超过30字。'
  };
  goToast('AI正在倾听...');
  goCallAI(pm[s.liveType]||pm.voice, '你是一个直播听众。',
    function(result){
      if(!result) result = '主播好棒啊！';
      s.asmrProgress++;
      var fb = document.getElementById('go-voice-feedback');
      if(fb) fb.innerHTML = '<div class="go-qa-card"><div class="go-qa-a">'+result+'</div></div>';
      goToast('互动 '+s.asmrProgress+'/3');
      if(s.asmrProgress>=3){
        setTimeout(function(){ goEndLive(true,1000); }, 1500);
      } else {
        goRenderLive();
      }
      saveState();
    }
  );
}

/* ---- Voice Input ---- */
function goVoiceInput(ctx){
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ goToast('浏览器不支持语音输入'); return; }
  if(goVoiceRec){ goVoiceRec.stop(); goVoiceRec=null; return; }
  goVoiceRec = new SR();
  goVoiceRec.lang = 'zh-CN';
  goVoiceRec.continuous = false;
  goVoiceRec.interimResults = false;
  goVoiceRec.onstart = function(){
    goToast('正在录音... 再次点击停止');
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '停止录音'; btn.style.background = '#c0392b'; }
  };
  goVoiceRec.onresult = function(e){
    var text = e.results[0][0].transcript;
    goVoiceRec = null;
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '开始语音'; btn.style.background = ''; }
    if(ctx==='product'){
      var pn = document.getElementById('go-prod-name');
      if(pn) pn.value = text;
      goToast('识别: '+text);
    } else if(ctx==='ecommerce'){
      goCheckPitch(text);
    } else if(ctx==='asmr'||ctx==='voice'||ctx==='beauty'){
      goCompleteVoiceSession(text);
    }
  };
  goVoiceRec.onerror = function(){
    goVoiceRec = null;
    goToast('语音识别失败');
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '开始语音'; btn.style.background = ''; }
  };
  goVoiceRec.onend = function(){
    goVoiceRec = null;
    var btn = document.getElementById('go-pitch-btn') || document.getElementById('go-voice-btn');
    if(btn){ btn.textContent = '开始语音'; btn.style.background = ''; }
  };
  goVoiceRec.start();
}

/* ---- End Live ---- */
function goEndLive(success, reward){
  var s = goState;
  goStopDanmaku();
  if(goLiveTimer){ clearInterval(goLiveTimer); goLiveTimer=null; }
  if(success && reward>0){
    s.balance += reward;
    s.history.push({type:s.liveType, reward:reward, time:Date.now(), success:true});
    goToast('直播完成! 获得 ¥'+reward);
    if(typeof walletBalance!=='undefined'){ walletBalance += reward; }
  } else {
    s.history.push({type:s.liveType, reward:0, time:Date.now(), success:false});
    goToast('已结束直播');
  }
  s.isLive = false;
  document.getElementById('go-page-live').classList.remove('active');
  document.getElementById('go-page-setup').classList.add('active');
  goRenderSetup();
  saveState();
}

