import { readFileSync } from 'node:fs';

const takeover = readFileSync('js/couple/05-ta-phone-data.js', 'utf8');
const coupleState = readFileSync('js/couple/00-state.js', 'utf8');
const persistence = readFileSync('js/main/core/05-persistence.js', 'utf8');
const indexedDb = readFileSync('js/main/core/04-indexeddb.js', 'utf8');
const chatList = readFileSync('js/main/chat/03-lists-widgets.js', 'utf8');

function assertIncludes(source, needle, label){
  if(!source.includes(needle)) throw new Error(label + ' is missing ' + needle);
}
function assertMissing(source, needle, label){
  if(source.includes(needle)) throw new Error(label + ' must not contain ' + needle);
}

[
  'coupleTaTakeover',
  'coupleTaBuildPhoneSnapshot',
  'coupleTaActionQueue',
  'coupleTaSpeak',
  'coupleTaCallAI',
  'callRealAI',
  'speakWithTTS',
  'coupleTaHideContact',
  'coupleTaRestoreContact',
  'taDeletedByPartner',
  'saveChatThread',
  'saveState',
  'wechat',
  'diary',
  'notes',
  'wallet',
  'shop',
  'browse'
].forEach((needle) => assertIncludes(takeover, needle, 'TA takeover'));

[
  'taTakeoverHistory',
  'taDeletedContacts'
].forEach((needle) => assertIncludes(coupleState, needle, 'couple persistence'));

[
  'taDeletedByPartner',
  'taDeletedBy',
  'taDeletedAt',
  'taDeletedPrevBlocked'
].forEach((needle) => {
  assertIncludes(persistence, needle, 'core persistence');
  assertIncludes(indexedDb, needle, 'IndexedDB chat persistence');
});

assertIncludes(chatList, 'taDeletedByPartner', 'chat list filter');
assertMissing(takeover, 'delete contacts[', 'TA takeover hard delete');
assertMissing(takeover, 'fatedDBDeleteChat', 'TA takeover hard delete');

console.log('Couple TA takeover verification passed.');
