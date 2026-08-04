import fs from 'node:fs';
import assert from 'node:assert/strict';

const cloud = fs.readFileSync('js/main/core/08-cloud-sync.js', 'utf8');

assert(
  /function cloudCanUploadSnapshot\(/.test(cloud),
  'Expected a central cloudCanUploadSnapshot guard before cloud uploads.'
);

assert(
  /cloudCanUploadSnapshot\(snapshot,\s*opts\)/.test(cloud),
  'Expected cloudUploadSnapshot to consult cloudCanUploadSnapshot(snapshot, opts).'
);

assert(
  /opts\.manual\s*===\s*true/.test(cloud) && /return false;/.test(cloud),
  'Expected non-manual blank snapshots to be blocked.'
);

assert(
  /cloudAutoSyncAfterUnlock\('register'\)/.test(cloud),
  'Expected register flow to reconcile instead of blindly uploading a new blank save.'
);

assert(
  /No local save yet/.test(cloud),
  'Expected auto sync to skip uploading when neither local nor remote has user data.'
);

console.log('cloud blank upload guard structure ok');
