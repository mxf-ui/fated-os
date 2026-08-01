/* Couple Space state and persistence bootstrap */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;

  function arr(value){ return Array.isArray(value) ? value : []; }

  if(!coupleState.byPartner) coupleState.byPartner = {};
  try{
    var raw = localStorage.getItem('couple_state_v1');
    if(raw){
      var o = JSON.parse(raw);
      coupleState.partner = o.partner || coupleState.partner;
      coupleState.lockedApps = o.lockedApps || {};
      coupleState.byPartner = o.byPartner || {};
      coupleState.foodOrders = arr(o.foodOrders);
      coupleState.icons = o.icons || {};
      coupleState.hisPasscode = o.hisPasscode || '';
      coupleState.hisPassAttempts = o.hisPassAttempts || 0;
      coupleState.hisLocked = !!o.hisLocked;
      coupleState.partnerHistory = arr(o.partnerHistory);
      coupleState.lastCheckin = o.lastCheckin || 0;
      coupleState.jealousHistory = arr(o.jealousHistory);
      coupleState.taDeletedContacts = arr(o.taDeletedContacts);
      coupleState.taTakeoverHistory = arr(o.taTakeoverHistory);
    }
  }catch(e){}

  window.coupleData = function(){
    if(!coupleState.byPartner) coupleState.byPartner = {};
    var pid = coupleState.partner || '_';
    if(!coupleState.byPartner[pid]){
      coupleState.byPartner[pid] = {
        notes:[],
        diary:[],
        myShop:[],
        partnerWishlist:[],
        selfFoodOrders:[],
        partnerFoodOrders:[],
        foodOrders:[],
        diaryReplies:[],
        diaryFeelings:[],
        location:null,
        browseUser:[],
        taDeletedContacts:[],
        taTakeoverHistory:[]
      };
    }
    var d = coupleState.byPartner[pid];
    d.notes = arr(d.notes);
    d.diary = arr(d.diary);
    d.myShop = arr(d.myShop);
    d.partnerWishlist = arr(d.partnerWishlist);
    d.selfFoodOrders = arr(d.selfFoodOrders);
    d.partnerFoodOrders = arr(d.partnerFoodOrders);
    d.foodOrders = arr(d.foodOrders);
    d.diaryReplies = arr(d.diaryReplies);
    d.diaryFeelings = arr(d.diaryFeelings);
    d.browseUser = arr(d.browseUser);
    d.taDeletedContacts = arr(d.taDeletedContacts);
    d.taTakeoverHistory = arr(d.taTakeoverHistory);

    if(Array.isArray(d.shop) && d.shop.length && !d.partnerWishlist.length) d.partnerWishlist = d.shop.slice();
    d.shop = d.partnerWishlist;

    if(!d.checkin){
      d.checkin = { trust:82, reports:[], lastScan:0, moodMessages:[] };
    }
    if(!Array.isArray(d.checkin.reports)) d.checkin.reports = [];
    if(!Array.isArray(d.checkin.moodMessages)) d.checkin.moodMessages = [];
    if(typeof d.checkin.trust !== 'number') d.checkin.trust = 82;
    return d;
  };

  window.saveCoupleState = function(){
    var savedLocal = true;
    var savedCore = true;
    try{
      localStorage.setItem('couple_state_v1', JSON.stringify({
        partner:coupleState.partner,
        lockedApps:coupleState.lockedApps,
        byPartner:coupleState.byPartner,
        foodOrders:coupleState.foodOrders,
        icons:coupleState.icons,
        hisPasscode:coupleState.hisPasscode,
        hisPassAttempts:coupleState.hisPassAttempts,
        hisLocked:coupleState.hisLocked,
        partnerHistory:coupleState.partnerHistory || [],
        lastCheckin:coupleState.lastCheckin || 0,
        jealousHistory:coupleState.jealousHistory || [],
        taDeletedContacts:coupleState.taDeletedContacts || [],
        taTakeoverHistory:coupleState.taTakeoverHistory || []
      }));
    }catch(e){ savedLocal = false; }
    try{
      var booting = typeof isPersistenceBooting === 'function' && isPersistenceBooting();
      if(typeof isPersistenceBooting !== 'function' || !booting){
        if(typeof saveState === 'function') savedCore = saveState() !== false;
      }
    }catch(e){ savedCore = false; }
    return savedLocal && savedCore;
  };
})();
