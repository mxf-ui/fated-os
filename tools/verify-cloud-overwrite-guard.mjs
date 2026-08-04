import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const cloud = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');
const persistence = readFileSync('js/main/core/05-persistence.js', 'utf8');
const buildMatch = cloud.match(/async function cloudBuildLocalSnapshot\(\)\s*\{([\s\S]*?)\n\}/);
const uploadMatch = cloud.match(/async function cloudUploadSnapshot\(opts\)\s*\{([\s\S]*?)\n\}/);

assert(buildMatch, 'cloudBuildLocalSnapshot must exist');
assert(uploadMatch, 'cloudUploadSnapshot must exist');
const buildBody = buildMatch[1];
const uploadBody = uploadMatch[1];

assert(/var\s+changedAt\s*=\s*\(typeof getLocalPersistenceLastChangedAt===['"]function['"]\)/.test(buildBody), 'cloud snapshots must use the real local data changed timestamp');
assert(/savedAt\s*:\s*changedAt/.test(buildBody), 'snapshot.savedAt must come from local data changes, not package time');
assert(!/saveState\s*\(/.test(buildBody), 'building a cloud snapshot must be read-only and must not call saveState');
assert(/function\s+cloudFindBlockingRemoteSnapshot\s*\(/.test(cloud), 'cloud upload must have a remote overwrite guard');
assert(/cloudFindBlockingRemoteSnapshot\(snapshot,\s*opts\)/.test(uploadBody), 'cloudUploadSnapshot must check remote before putting a new snapshot');
assert(/await\s+cloudRestoreSnapshotPayload\(blockingRemote\.payload\)/.test(uploadBody), 'autosave/login upload must restore blocking remote data instead of overwriting it');
assert(/function\s+markLocalPersistenceChanged\s*\(/.test(persistence), 'persistence must record real local data changes');
assert(/function\s+getLocalPersistenceLastChangedAt\s*\(/.test(persistence), 'persistence must expose local data changed timestamp');
assert(/saveState[\s\S]*markLocalPersistenceChanged\('state'\)/.test(persistence), 'state saves must update the local changed timestamp');
assert(/saveChatThread[\s\S]*markLocalPersistenceChanged\('chat'\)/.test(persistence), 'chat saves must update the local changed timestamp');

console.log('PASS: cloud overwrite guard prevents stale or empty uploads');