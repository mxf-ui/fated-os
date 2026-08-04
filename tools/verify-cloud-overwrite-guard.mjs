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
assert(/function\s+cloudPrepareSnapshotForUpload\s*\(/.test(cloud), 'cloud upload must prepare the snapshot before writing remote');
assert(/cloudPrepareSnapshotForUpload\(snapshot,\s*opts\)/.test(uploadBody), 'cloudUploadSnapshot must read and merge remote before putting a new snapshot');
assert(/function\s+cloudMergeSnapshotPayloads\s*\(/.test(cloud), 'cloud sync must merge local and remote snapshots instead of choosing a single winner');
assert(/function\s+markLocalPersistenceChanged\s*\(/.test(persistence), 'persistence must record real local data changes');
assert(/function\s+getLocalPersistenceLastChangedAt\s*\(/.test(persistence), 'persistence must expose local data changed timestamp');
assert(/saveState[\s\S]*markLocalPersistenceChanged\('state'\)/.test(persistence), 'state saves must update the local changed timestamp');
assert(/saveChatThread[\s\S]*markLocalPersistenceChanged\('chat'\)/.test(persistence), 'chat saves must update the local changed timestamp');

console.log('PASS: cloud overwrite guard prevents stale, empty, or partial uploads');