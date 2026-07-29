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
