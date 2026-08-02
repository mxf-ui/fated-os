import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const cloud = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');

assert(/function\s+cloudWaitForPersistenceReady\s*\(/.test(cloud), 'cloud sync must expose a persistence readiness wait helper');
assert(/async function cloudBuildLocalSnapshot\(\)\s*\{[\s\S]{0,220}await cloudWaitForPersistenceReady\(/.test(cloud), 'cloud snapshot building must wait until IndexedDB/local restore has finished');
assert(/async function cloudUploadSnapshot\(opts\)\s*\{[\s\S]{0,260}await cloudWaitForPersistenceReady\(/.test(cloud), 'cloud upload must wait for local persistence before encrypting');
assert(/async function cloudAutoSyncAfterUnlock\(reason\)\s*\{[\s\S]{0,260}await cloudWaitForPersistenceReady\(/.test(cloud), 'login unlock auto sync must wait for local persistence before comparing snapshots');
assert(/cloudSetStatus\('Local data is still loading/.test(cloud), 'user should see a clear status when sync is waiting for local data');

console.log('PASS: cloud sync waits for local persistence before upload/restore decisions');
