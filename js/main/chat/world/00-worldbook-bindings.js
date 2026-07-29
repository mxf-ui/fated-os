/* ============ WORLD BOOKS & CONTACT/GROUP PROFILE ============ */
function renderWorldBookChips(containerId, selectedIds){
  var el=document.getElementById(containerId); if(!el) return;
  var ids=Object.keys(worldBooks);
  if(ids.length===0){ el.innerHTML='<div style="font-size:12px;color:#999;">暂无世界书，可到设置里新建</div>'; return; }
  el.innerHTML=ids.map(function(k){
    var wb=worldBooks[k];
    var on=(selectedIds||[]).indexOf(k)>-1;
    return '<label class="persona-chip '+(on?'on':'')+'" style="cursor:pointer;"><input type="checkbox" class="wb-chk" value="'+k+'" '+(on?'checked':'')+' style="display:none;" onchange="this.parentNode.classList.toggle(\'on\',this.checked)">'+esc(wb.name)+'</label>';
  }).join('');
}
function getSelectedWorldBookIds(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' .wb-chk:checked')).map(function(c){ return c.value; });
}
function getWorldBookPrompt(contactId){
  var c=contacts[contactId]; if(!c) return '';
  var wbs=c.worldBooks||[];
  var texts=[];
  wbs.forEach(function(id){ if(worldBooks[id] && worldBooks[id].content) texts.push('【'+worldBooks[id].name+'】\n'+worldBooks[id].content); });
  if(texts.length===0) return '';
  return '\n\n[绑定世界书]\n'+texts.join('\n\n');
}

function pickProfileAvatar(){ contactAvatarInput.click(); }
function pickGroupAvatar(){ contactAvatarInput.click(); }

