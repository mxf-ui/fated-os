import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const assetApiPath = path.join(root, 'functions/api/assets.js');
const migrationPath = path.join(root, 'migrations/0003_cloud_assets.sql');
for (const file of [assetApiPath, migrationPath]) {
  if (!existsSync(file)) throw new Error('Missing ' + path.relative(root, file));
}
const assetApi = readFileSync(assetApiPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');
function assert(ok, msg){ if(!ok) throw new Error(msg); }
assert(/asset_data TEXT/.test(migration), 'asset migration must include D1 asset_data fallback column');
assert(/storage_type TEXT/.test(migration), 'asset migration must track storage_type');
assert(/ALTER TABLE asset_objects ADD COLUMN asset_data TEXT/.test(assetApi), 'asset API must migrate asset_data column at runtime');
assert(/const bucket = context\.env && context\.env\.ASSETS;/.test(assetApi), 'asset API should still prefer ASSETS binding');
assert(!/if \(!bucket\) return assetMissingResponse\(\);/.test(assetApi), 'asset API must not fail when R2 bucket is absent');
assert(/const storageType = bucket \? 'r2' : 'd1'/.test(assetApi) && /storageType/.test(assetApi), 'asset upload must report D1 fallback storage');
assert(/base64ToBytes\(row\.asset_data/.test(assetApi), 'asset download must read D1 fallback bytes');
console.log('Cloud asset D1 fallback verified.');
