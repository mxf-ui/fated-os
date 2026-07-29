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
