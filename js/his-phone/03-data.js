function buildHisContacts(date){
  var list=[{id:'me', name:userName||'你', pinned:true, kind:'you', synced:true}];
  for(var i=1;i<=7;i++) list.push({id:'col'+i, name:'同事'+i, kind:'col'});
  for(var j=1;j<=7;j++) list.push({id:'fri'+j, name:'朋友'+j, kind:'fri'});
  var rnd=dailySeed('his-contacts-'+date);
  list.forEach(function(c){
    c.number='1'+(38+Math.floor(rnd()*2))+'-'+(1000+Math.floor(rnd()*9000))+'-'+(1000+Math.floor(rnd()*9000));
    if(c.kind==='you'){ c.msgs = (coupleState.partner && contacts[coupleState.partner]) ? contacts[coupleState.partner].seed : []; }
    else { c.msgs=seedChat(date,c.name,hisColleagueMsgPool,false); }
  });
  return list;
}
function seedChat(date,name,pool,romantic){
  var rnd=dailySeed('chat-'+name+'-'+date); var n=4+Math.floor(rnd()*5); var arr=[];
  for(var k=0;k<n;k++){ arr.push({mine: romantic?(k%2===0):(k%2===1), text:pick(rnd,pool)}); }
  return arr;
}
