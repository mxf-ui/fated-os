/* ============ WALLET ============ */
function addWalletTx(title, amount){
  walletTx.unshift({ title, amount, d: nowTime() });
  walletBalance += amount;
  renderWallet();
  updateWalletPreview();
  saveState();
}
function renderWallet(){
  const bal = document.getElementById('wallet-balance');
  if(bal) bal.textContent = '¥ ' + walletBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const list = document.getElementById('wallet-tx-list');
  if(!list) return;
  if(!walletTx.length){ list.innerHTML='<div class="wallet-empty">还没有交易记录</div>'; return; }
  list.innerHTML = walletTx.map(t=>{
    const sign = t.amount>=0 ? '+' : '-';
    const cls = t.amount>=0 ? 'pos' : 'neg';
    return '<div class="tx-row"><div><div class="t">'+esc(t.title)+'</div><div class="d">'+t.d+'</div></div><div class="a '+cls+'">'+sign+Math.abs(t.amount).toFixed(2)+'</div></div>';
  }).join('');
}

