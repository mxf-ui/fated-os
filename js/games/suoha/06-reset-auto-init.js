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
