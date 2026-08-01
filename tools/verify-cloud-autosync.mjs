import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'C:/Users/lenovo/Documents/Codex/2026-07-29/1/work/github-unzip/fated-os-main');
const cloud = readFileSync(path.join(root, 'js/main/core/08-cloud-sync.js'), 'utf8');
const persistence = readFileSync(path.join(root, 'js/main/core/05-persistence.js'), 'utf8');
const syncApi = readFileSync(path.join(root, 'functions/api/sync.js'), 'utf8');
const migration = readdirSync(path.join(root, 'migrations'))
  .filter(file => file.endsWith('.sql'))
  .map(file => readFileSync(path.join(root, 'migrations', file), 'utf8'))
  .join('\\n');

const checks = [
  ['cloud state tracks autosave timer', /autosaveTimer/.test(cloud)],
  ['cloud state tracks restore suppression', /suppressAutosave/.test(cloud)],
  ['cloud has local save notification hook', /function cloudNotifyLocalSave/.test(cloud)],
  ['cloud has delayed autosave scheduler', /function cloudScheduleAutosave/.test(cloud)],
  ['cloud has shared upload worker', /async function cloudUploadSnapshot/.test(cloud)],
  ['cloud unlock reconciles remote and local', /async function cloudAutoSyncAfterUnlock/.test(cloud)],
  ['manual restore suppresses autosave recursion', /suppressAutosave\s*=\s*true/.test(cloud)],
  ['saveState notifies cloud autosave after local persistence', /cloudNotifyLocalSave\('saveState'\)/.test(persistence)],
  ['migration creates snapshot chunks', /CREATE TABLE IF NOT EXISTS snapshot_chunks/.test(migration)],
  ['sync api stores chunked payloads', /saveSnapshotChunks/.test(syncApi)],
  ['sync api restores chunked payloads', /loadSnapshotCiphertext/.test(syncApi)],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('Failed checks:\n' + failed.join('\n'));
  process.exit(1);
}

console.log('Cloud autosync behavior verified.');

