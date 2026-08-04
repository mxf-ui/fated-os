import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const persistence = read('js/main/core/05-persistence.js');
const cloud = read('js/main/core/08-cloud-sync.js');
const shell = read('js/main/01-system-shell.js');
const contact = read('js/main/chat/00-group-voice-api.js');
const syncApi = read('functions/api/sync.js');
const assetsApi = read('functions/api/assets.js');
const docs = read('SUPABASE_SETUP.md');

assert(/fatedDeletedTombstones/.test(persistence), 'persistence must define deleted tombstones');
assert(/deletedTombstones/.test(persistence), 'state snapshot must persist deletedTombstones');
assert(/function fatedMarkDeleted\(/.test(persistence), 'must expose fatedMarkDeleted');
assert(/function fatedClearDeleted\(/.test(persistence), 'must expose fatedClearDeleted');
assert(/function fatedIsDeleted\(/.test(persistence), 'must expose fatedIsDeleted');
assert(/deletedAt/.test(persistence), 'snapshots/assets must carry deletedAt');
assert(/applyContactsSnapshot[\s\S]*fatedIsDeleted\('contacts'/.test(persistence), 'contact restore must skip tombstoned contacts');
assert(/applyProfileAssets[\s\S]*fatedImageAssetDeleted/.test(persistence), 'profile assets must skip tombstoned images');
assert(/applyAppIconAssets[\s\S]*fatedImageAssetDeleted/.test(persistence), 'app icons must skip tombstoned images');
assert(/fatedDBSaveKV\('deletedTombstones'/.test(persistence), 'tombstones must be backed up to IndexedDB');
assert(/fatedDBLoadKV\('deletedTombstones'/.test(persistence), 'tombstones must load from IndexedDB');

assert(/removePlugin[\s\S]*fatedMarkDeleted\('plugins'/.test(shell), 'removePlugin must mark plugin tombstone');
assert(/addPlugin[\s\S]*fatedClearDeleted\('plugins'/.test(shell), 'addPlugin must clear plugin tombstone');
assert(/remountPluginsFromSavedState[\s\S]*fatedIsDeleted\('plugins'/.test(shell), 'plugin remount must honor tombstones');
assert(/resetIcon[\s\S]*fatedMarkDeleted\('images',\s*'appIcon:'/.test(shell), 'resetIcon must tombstone app icon images');
assert(/applyWallpaper[\s\S]*fatedMarkDeleted\('appearance'/.test(shell), 'wallpaper changes must tombstone replaced custom wallpapers');
assert(/data-wc-img[\s\S]*fatedClearDeleted\('images',\s*'widget:'/.test(shell), 'widget image upload must clear image tombstone');
assert(/deleteContact[\s\S]*fatedMarkDeleted\('contacts'/.test(contact), 'contact deletion must mark contact tombstone');

assert(/cloudCollectChats[\s\S]*deletedAt/.test(cloud), 'cloud chat rows must include deletedAt');
assert(/cloudApplyChats[\s\S]*fatedIsDeleted\('contacts'/.test(cloud), 'cloud chat restore must skip tombstoned contacts');
assert(/cloudMergeSnapshotPayloads[\s\S]*fatedMergeTombstones/.test(cloud), 'cloud merge must merge tombstones');
assert(/cloudMergeSnapshotPayloads[\s\S]*fatedApplyTombstonesToPayload/.test(cloud), 'cloud merge must filter payload by tombstones');
assert(!/cloudApi\('\/api\/(sync|assets)/.test(cloud), 'cloud sync must not call old D1/R2 sync/assets endpoints');

assert(/410/.test(syncApi) && /Supabase/.test(syncApi) && /D1 sync disabled/.test(syncApi), 'D1 sync endpoint must be disabled with 410');
assert(/410/.test(assetsApi) && /Supabase/.test(assetsApi) && /R2\/D1 asset storage disabled/.test(assetsApi), 'R2/D1 asset endpoint must be disabled with 410');
assert(!/ASSET_BUCKET|asset_objects|storage_type|snapshot_chunks|auth\.db\.prepare|bucket\.put/.test(syncApi + '\n' + assetsApi), 'disabled endpoints must not retain active D1/R2 code');
assert(/Supabase is the only/.test(docs), 'docs must state Supabase is the only cloud data path');

console.log('PASS: tombstones and Supabase-only cloud path verified');
