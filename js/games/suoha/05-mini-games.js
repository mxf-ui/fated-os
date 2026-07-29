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
