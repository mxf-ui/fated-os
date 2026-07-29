import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'C:/Users/lenovo/Documents/Codex/2026-07-29/1/work/github-unzip/fated-os-main');
const requiredFiles = [
  'migrations/0001_cloud_sync.sql',
  'functions/api/_lib/auth.js',
  'functions/api/auth/register.js',
  'functions/api/auth/login.js',
  'functions/api/auth/logout.js',
  'functions/api/auth/me.js',
  'functions/api/sync.js',
  'js/main/core/08-cloud-sync.js',
];
const missing = requiredFiles.filter(file => !existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing files:\n' + missing.join('\n'));
  process.exit(1);
}

const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const cloudJs = readFileSync(path.join(root, 'js/main/core/08-cloud-sync.js'), 'utf8');
const authLib = readFileSync(path.join(root, 'functions/api/_lib/auth.js'), 'utf8');
const syncApi = readFileSync(path.join(root, 'functions/api/sync.js'), 'utf8');
const migration = readFileSync(path.join(root, 'migrations/0001_cloud_sync.sql'), 'utf8');

const checks = [
  ['index references cloud sync script', /src="js\/main\/core\/08-cloud-sync\.js"/.test(html)],
  ['settings row opens cloud sync sheet', /openSheet\('cloudsync'\)/.test(html)],
  ['cloud sync sheet exists', /id="sheet-cloudsync"/.test(html)],
  ['client derives encryption key', /function cloudDeriveKey/.test(cloudJs)],
  ['client encrypts cloud snapshot', /function cloudEncryptSnapshot/.test(cloudJs)],
  ['client can upload snapshot', /function cloudUploadNow/.test(cloudJs)],
  ['client can restore snapshot', /function cloudRestoreNow/.test(cloudJs)],
  ['server hashes passwords', /export async function hashPassword/.test(authLib)],
  ['server reads session cookie', /export async function requireUser/.test(authLib)],
  ['sync supports GET', /export async function onRequestGet/.test(syncApi)],
  ['sync supports PUT', /export async function onRequestPut/.test(syncApi)],
  ['migration creates users', /CREATE TABLE IF NOT EXISTS users/.test(migration)],
  ['migration creates sessions', /CREATE TABLE IF NOT EXISTS sessions/.test(migration)],
  ['migration creates snapshots', /CREATE TABLE IF NOT EXISTS snapshots/.test(migration)],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error('Failed checks:\n' + failed.join('\n'));
  process.exit(1);
}
console.log('Cloud sync structure verified.');
