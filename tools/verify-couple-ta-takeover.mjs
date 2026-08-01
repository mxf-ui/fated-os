import { readFileSync } from 'node:fs';

const takeover = readFileSync('js/couple/05-ta-phone-data.js', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');
const coupleState = readFileSync('js/couple/00-state.js', 'utf8');
const persistence = readFileSync('js/main/core/05-persistence.js', 'utf8');
const indexedDb = readFileSync('js/main/core/04-indexeddb.js', 'utf8');
const chatList = readFileSync('js/main/chat/03-lists-widgets.js', 'utf8');
const cloudSync = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');
const systemShell = readFileSync('js/main/01-system-shell.js', 'utf8');

function assertIncludes(source, needle, label){
  if(!source.includes(needle)) throw new Error(label + ' is missing ' + needle);
}
function assertMissing(source, needle, label){
  if(source.includes(needle)) throw new Error(label + ' must not contain ' + needle);
}

[
  'coupleTaTakeover',
  'coupleTaBuildPhoneSnapshot',
  'coupleTaBuildDesktopApps',
  'coupleTaBuildAppEvidence',
  'coupleTaActionQueue',
  'coupleTaSpeak',
  'coupleTaCallAI',
  'callRealAI',
  'getPersonaPrompt',
  'getWorldBookPrompt',
  'speakWithTTS',
  'coupleTaHideContact',
  'coupleTaRestoreContact',
  'manual_open_app',
  'taJealous',
  '\u4e0d\u8981\u6a21\u677f\u5316',
  '\u5403\u918b',
  '\u4eb2\u5c5e\u5361',
  '\u8f6c\u8d26',
  '\u4e0d\u80fd\u58f0\u79f0\u8bbf\u95ee\u771f\u5b9e\u624b\u673a',
  '\u7cfb\u7edf\u901a\u8baf\u5f55',
  'musicState',
  'novelState',
  'nilflowState',
  'dreamState',
  'goState',
  'forumState',
  'wechat',
  'moments',
  'forum',
  'music',
  'novel',
  'go',
  'nilflow',
  'dream',
  'diary',
  'notes',
  'wallet',
  'shop',
  'browse',
  'couple'
].forEach((needle) => assertIncludes(takeover, needle, 'TA takeover'));

[
  'js/couple/05-ta-phone-data.js',
  'js/main/09-music-novel-bootstrap.js',
  'js/dream/00-dreamcore.js',
  'js/nilflow/00-nilflow.js'
].forEach((needle) => assertIncludes(indexHtml, needle, 'split script load'));

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
  assertIncludes(cloudSync, needle, 'cloud chat sync');
});

assertIncludes(chatList, 'taDeletedByPartner', 'chat list filter');
[
  'openDesktopApp',
  'coupleCheckAppLocked',
  'coupleAppLockRemaining',
  'data-ta-app-id',
  'bypassLock',
  'TA_APP_LOCK_MS'
].forEach((needle) => assertIncludes(systemShell, needle, 'desktop lock gateway'));
assertMissing(systemShell, 'onclick="'+"a.action", 'desktop direct inline action');
[
  'coupleTaTopBanner',
  'coupleTaSetTopLine',
  'coupleTaLockApp',
  'coupleTaFindJealousSignal',
  'TA_APP_LOCK_MS',
  'lockUntil',
  '15分钟',
  '暧昧',
  'bypassLock',
  'coupleTaOpenRealApp'
].forEach((needle) => assertIncludes(takeover, needle, 'TA real takeover'));

assertMissing(takeover, 'delete contacts[', 'TA takeover hard delete');
assertMissing(takeover, 'fatedDBDeleteChat', 'TA takeover hard delete');

console.log('Couple TA takeover verification passed.');
