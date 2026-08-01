/* Couple Space generated data and contact switching */
(function(){
  if(typeof coupleState === 'undefined' || !coupleState) return;

  function cpText(value){ return String(value || '').trim(); }
  function cpName(id){ var c = contacts && contacts[id]; return c ? (c.displayName || c.name || 'TA') : 'TA'; }
  function cpPersonaText(c){ return [c && c.persona, c && c.tone, c && c.userPrompt, c && c.bio].filter(Boolean).join(' '); }

  window.coupleWishlistDailyKey = function(date){
    var d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };

  function wishlistTemplates(c){
    var p = cpPersonaText(c).toLowerCase();
    if(/coffee|cafe|\u5496\u5561|\u62ff\u94c1|\u751c/.test(p)) return [
      {name:'\u6d45\u70d8\u62ff\u94c1\u5957\u88c5', price:'\u00a5128', reason:'\u60f3\u628a\u4eca\u5929\u7684\u7ea6\u4f1a\u7559\u5728\u9999\u6c14\u91cc', img:''},
      {name:'\u73bb\u7483\u751c\u70b9\u76d8', price:'\u00a589', reason:'\u559c\u6b22\u628a\u5c0f\u4e8b\u53d8\u5f97\u6709\u4eea\u5f0f\u611f', img:''},
      {name:'\u624b\u5199\u4fbf\u7b7e\u672c', price:'\u00a536', reason:'\u60f3\u8bb0\u4f4f\u4f60\u8bf4\u8fc7\u7684\u8bdd', img:''}
    ];
    if(/dark|mystery|\u795e\u79d8|\u526f\u672c|\u9ed1/.test(p)) return [
      {name:'\u6697\u7eb9\u9999\u85b0\u8721\u70db', price:'\u00a5169', reason:'\u60f3\u628a\u591c\u665a\u6536\u8d77\u6765', img:''},
      {name:'\u94f6\u8272\u957f\u94fe', price:'\u00a5229', reason:'\u50cf\u4e00\u4e2a\u53ea\u6709\u4f60\u77e5\u9053\u7684\u6697\u53f7', img:''},
      {name:'\u9ed1\u8272\u76ae\u9762\u624b\u8d26', price:'\u00a599', reason:'\u60f3\u5199\u4e0b\u4e0d\u80fd\u5f53\u9762\u8bf4\u7684\u4e8b', img:''}
    ];
    return [
      {name:'\u8584\u8377\u7eff\u624b\u673a\u58f3', price:'\u00a568', reason:'\u60f3\u6362\u4e00\u70b9\u5e72\u51c0\u7684\u5fc3\u60c5', img:''},
      {name:'\u53cc\u4eba\u80f6\u7247\u76f8\u518c', price:'\u00a5129', reason:'\u7559\u4e00\u672c\u4e13\u5c5e\u6211\u4eec\u7684\u56de\u5fc6', img:''},
      {name:'\u7761\u524d\u9999\u6c14\u55b7\u96fe', price:'\u00a586', reason:'\u60f3\u8ba9\u4f60\u4e00\u6253\u5f00\u5c31\u60f3\u5230 TA', img:''}
    ];
  }

  window.coupleRefreshPartnerWishlist = function(force){
    var d = window.coupleData();
    var key = window.coupleWishlistDailyKey();
    if(!force && d.wishlistDailyKey === key && d.partnerWishlist.length) return d.partnerWishlist;
    var c = contacts[coupleState.partner] || {};
    var base = wishlistTemplates(c).map(function(item, i){
      return Object.assign({}, item, { id:'wish-' + key + '-' + i, date:key, owner:'partner', partnerId:coupleState.partner || '' });
    });
    d.partnerWishlist = base;
    d.shop = d.partnerWishlist;
    d.wishlistDailyKey = key;
    window.saveCoupleState();
    return d.partnerWishlist;
  };

  window.coupleGenData = function(){
    var d = window.coupleData();
    d.notes = Array.isArray(d.notes) ? d.notes : [];
    d.diary = Array.isArray(d.diary) ? d.diary : [];
    d.myShop = Array.isArray(d.myShop) ? d.myShop : [];
    d.selfFoodOrders = Array.isArray(d.selfFoodOrders) ? d.selfFoodOrders : [];
    d.partnerFoodOrders = Array.isArray(d.partnerFoodOrders) ? d.partnerFoodOrders : [];
    d.diaryReplies = Array.isArray(d.diaryReplies) ? d.diaryReplies : [];
    d.diaryFeelings = Array.isArray(d.diaryFeelings) ? d.diaryFeelings : [];
    window.coupleRefreshPartnerWishlist(false);
    window.saveCoupleState();
  };

  window.coupleManageContacts = function(){
    var ids = Object.keys(contacts).filter(function(k){ return !contacts[k].isGroup && k !== 'me'; });
    var html = '<div style="font-size:13px;font-weight:700;margin-bottom:6px;">\u5f53\u524d\u5bf9\u8c61\uff1a'+esc(cpName(coupleState.partner))+'</div>';
    html += '<div style="font-size:12px;color:#888;margin-bottom:10px;">\u70b9\u51fb\u5934\u50cf\u5207\u6362\u5bf9\u8c61\u3002\u65b0\u589e\u5bf9\u8c61\u8bf7\u5230\u901a\u8baf\u5f55\u65b0\u5efa AI \u4eba\u8bbe\u3002</div>';
    ids.forEach(function(k){
      var c = contacts[k]; var on = (k === coupleState.partner);
      html += '<div class="ios-section" style="margin:0 0 6px;cursor:pointer;'+(on?'background:#ecfff8;':'')+'" onclick="coupleSwitch(\''+k+'\')"><div class="ios-row"><div style="width:36px;height:36px;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;flex:none;">'+contactAvatar(c)+'</div><div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:700;">'+esc(c.displayName||c.name)+'</div><div style="font-size:11px;color:#888;">'+(on?'\u5f53\u524d\u5bf9\u8c61':'\u70b9\u51fb\u5207\u6362')+'</div></div></div></div>';
    });
    html += '<div class="big-btn" style="margin-top:8px;" onclick="openSheet(\'addpersona\')">+ \u65b0\u589e\u5bf9\u8c61</div>';
    coupleShowSub('\u7ba1\u7406\u8054\u7cfb\u4eba', html);
  };

  window.coupleSwitch = function(k){
    if(!coupleState.partnerHistory) coupleState.partnerHistory = [];
    if(coupleState.partner && coupleState.partnerHistory.indexOf(coupleState.partner) === -1) coupleState.partnerHistory.push(coupleState.partner);
    if(coupleState.partnerHistory.indexOf(k) === -1) coupleState.partnerHistory.push(k);
    coupleState.partner = k;
    window.coupleGenData();
    window.saveCoupleState();
    if(typeof saveState === 'function') saveState();
    updateCoupleHeader();
    window.coupleManageContacts();
  };
})();
