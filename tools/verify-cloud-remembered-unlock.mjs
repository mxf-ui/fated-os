import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const cloud = readFileSync(join(root, 'js/main/core/08-cloud-sync.js'), 'utf8');
const index = readFileSync(join(root, 'index.html'), 'utf8');

assert(/function\s+cloudRememberKeyId\s*\(/.test(cloud), 'cloud sync must namespace remembered unlock keys by user id');
assert(/async function\s+cloudRememberUnlock\s*\(/.test(cloud), 'cloud sync must store a remembered unlock key after login/register');
assert(/async function\s+cloudLoadRememberedUnlock\s*\(/.test(cloud), 'cloud sync must load a remembered unlock key on boot');
assert(/function\s+cloudForgetRememberedUnlock\s*\(/.test(cloud), 'cloud sync must clear remembered unlock data on logout');
assert(/exportKey\('raw',\s*key\)/.test(cloud), 'remembered unlock must export the AES key, not store the password');
assert(/importKey\('raw'[\s\S]*\{name:'AES-GCM'\}/.test(cloud), 'remembered unlock must import the AES key for encryption/decryption');
assert(/cloudLoadRememberedUnlock\(me\.user\)/.test(cloud), 'cloudSyncInit must try remembered unlock after /api/auth/me');
assert(/cloudAutoSyncAfterUnlock\('remembered'\)/.test(cloud), 'remembered unlock must trigger cloud reconcile on boot');
assert(/cloudForgetRememberedUnlock\(\)/.test(cloud), 'logout path must forget remembered unlock');
assert(/08-cloud-sync\.js\?v=20260802-remembered-unlock/.test(index), 'index must cache-bust the cloud sync script');

console.log('Cloud remembered unlock behavior verified.');
