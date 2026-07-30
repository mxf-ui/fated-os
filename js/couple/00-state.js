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
    var d = coupleState.byPartner[pid];
    if(!d.checkin){
      d.checkin = {
        mode:'soft',
        trust:82,
        reports:[],
        lastScan:0,
        pendingProof:false,
        proofRequests:[],
        moodMessages:[]
      };
    }
    if(!Array.isArray(d.checkin.reports)) d.checkin.reports = [];
    if(!Array.isArray(d.checkin.proofRequests)) d.checkin.proofRequests = [];
    if(!Array.isArray(d.checkin.moodMessages)) d.checkin.moodMessages = [];
    if(typeof d.checkin.trust !== 'number') d.checkin.trust = 82;
    if(!d.checkin.mode) d.checkin.mode = 'soft';
    return d;
  };
  window.saveCoupleState = function(){
    try{ localStorage.setItem('couple_state_v1', JSON.stringify({partner:coupleState.partner, lockedApps:coupleState.lockedApps, byPartner:coupleState.byPartner, foodOrders:coupleState.foodOrders, icons:coupleState.icons, hisPasscode:coupleState.hisPasscode, hisPassAttempts:coupleState.hisPassAttempts, hisLocked:coupleState.hisLocked, partnerHistory:coupleState.partnerHistory||[], lastCheckin:coupleState.lastCheckin||0, jealousHistory:coupleState.jealousHistory||[]})); }catch(e){}
  };
})();
