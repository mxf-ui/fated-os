import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'C:/Users/lenovo/Documents/Codex/2026-07-29/1/work/github-unzip/fated-os-main');
const assetApiPath = path.join(root, 'functions/api/assets.js');
const cloudPath = path.join(root, 'js/main/core/08-cloud-sync.js');
const migrationPath = path.join(root, 'migrations/0003_cloud_assets.sql');

const missing = [assetApiPath, migrationPath].filter(file => !existsSync(file));
if (missing.length) {
  console.error('Missing files:\n' + missing.map(file => path.relative(root, file)).join('\n'));
  process.exit(1);
}

const assetApi = readFileSync(assetApiPath, 'utf8');
const cloud = readFileSync(cloudPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');

const checks = [
  ['assets migration creates asset table', /CREATE TABLE IF NOT EXISTS asset_objects/.test(migration)],
  ['assets api requires user', /requireUser/.test(assetApi)],
  ['assets api checks usable R2 binding', /function getAssetBucket\(env\)/.test(assetApi) && /env && env\.ASSET_BUCKET/.test(assetApi) && /typeof bucket\.put === 'function'/.test(assetApi)],
  ['assets api supports post upload', /export async function onRequestPost/.test(assetApi)],
  ['assets api supports get download', /export async function onRequestGet/.test(assetApi)],
  ['assets api stores metadata', /INSERT INTO asset_objects/.test(assetApi)],
  ['cloud detects data urls', /function cloudIsDataUrl/.test(cloud)],
  ['cloud uploads data url assets', /async function cloudUploadDataUrlAsset/.test(cloud)],
  ['cloud normalizes snapshot assets', /async function cloudExternalizeSnapshotAssets/.test(cloud)],
  ['snapshot upload externalizes assets before encryption', /cloudExternalizeSnapshotAssets\(snapshot\)/.test(cloud)],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('Failed checks:\n' + failed.join('\n'));
  process.exit(1);
}
console.log('Cloud asset storage structure verified.');


