/* Couple Space state and persistence bootstrap */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;
  if(!coupleState.byPartner) coupleState.byPartner = {};
  try{ var raw=localStorage.getItem('couple_state_v1'); if(raw){ var o=JSON.parse(raw);
    coupleState.partner = o.partner||coupleState.partner;
    coupleState.lockedApps = o.lockedApps||{};
    coupleState.byPartner = o.byPartner||{};
    coupleState.foodOrders = o.foodOrders||[];
    coupleState.icons = o.icons||{};
    coupleState.hisPasscode = o.hisPasscode||'';
    coupleState.hisPassAttempts = o.hisPassAttempts||0;
    coupleState.hisLocked = o.hisLocked||false;
    coupleState.partnerHistory = o.partnerHistory||[];
    coupleState.lastCheckin = o.lastCheckin||0;
    coupleState.jealousHistory = o.jealousHistory||[];
  } }catch(e){}

  window.coupleData = function(){
    if(!coupleState.byPartner) coupleState.byPartner = {};
    var pid = coupleState.partner || '_';
    if(!coupleState.byPartner[pid]) coupleState.byPartner[pid] = { notes:[], diary:[], shop:[], foodOrders:[], location:null, browseUser:[] };
    return coupleState.byPartner[pid];
  };
  window.saveCoupleState = function(){
    try{ localStorage.setItem('couple_state_v1', JSON.stringify({partner:coupleState.partner, lockedApps:coupleState.lockedApps, byPartner:coupleState.byPartner, foodOrders:coupleState.foodOrders, icons:coupleState.icons, hisPasscode:coupleState.hisPasscode, hisPassAttempts:coupleState.hisPassAttempts, hisLocked:coupleState.hisLocked, partnerHistory:coupleState.partnerHistory||[], lastCheckin:coupleState.lastCheckin||0, jealousHistory:coupleState.jealousHistory||[]})); }catch(e){}
  };
})();
