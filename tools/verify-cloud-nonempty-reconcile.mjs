import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const persistence = readFileSync('js/main/core/05-persistence.js', 'utf8');
const cloud = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');

assert(/var\s+localPersistenceHadSavedData\s*=\s*false/.test(persistence), 'persistence must track whether this boot restored real user data');
assert(/function\s+markLocalPersistenceHadSavedData\s*\(/.test(persistence), 'persistence must expose a marker for restored local data');
assert(/function\s+localPersistenceHasSavedData\s*\(/.test(persistence), 'persistence must expose local saved-data status');
assert(/markLocalPersistenceHadSavedData\(\)/.test(persistence), 'loadState/apply restore path must mark real saved data');
assert(/saveChatThread[\s\S]*cloudNotifyLocalSave[\s\S]*chat/.test(persistence), 'chat thread saves must schedule cloud autosave');
assert(/function\s+cloudLocalHasRealSave\s*\(/.test(cloud), 'cloud sync must distinguish default boot data from a real local save');
assert(/function\s+cloudShouldRestoreRemote\s*\(/.test(cloud), 'cloud sync must centralize restore-vs-upload decision');
assert(/function\s+cloudUserDataWeight\s*\(/.test(cloud), 'cloud sync must score real user data separately from default seed data');
assert(/remoteUserWeight>0\s*&&\s*localUserWeight===0/.test(cloud), 'remote real user data must win over local default shell data');
assert(/!cloudLocalHasRealSave\(\)\s*&&\s*remoteWeight\s*>\s*0/.test(cloud), 'existing cloud save must win when current browser has no real local save');
assert(/cloudShouldRestoreRemote\(local,\s*remotePayload,\s*remote\.snapshot\)/.test(cloud), 'auto sync must use protected reconciliation before uploading');

console.log('PASS: cloud reconciliation protects non-empty remote saves from empty local boots');

