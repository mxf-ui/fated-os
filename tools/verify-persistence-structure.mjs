import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const persistencePath = resolve(root, 'js/main/core/05-persistence.js');
const initPath = resolve(root, 'js/main/chat/06-call-persona-init.js');

const persistence = readFileSync(persistencePath, 'utf8');
const init = readFileSync(initPath, 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const saveStateMatch = persistence.match(/function saveState\(\)\{([\s\S]*?)\n\}/);
assert(saveStateMatch, 'Expected saveState() to exist.');
const saveStateBody = saveStateMatch[1];

const localSetMatch = saveStateBody.match(/localStorage\.setItem\('fated_state',\s*JSON\.stringify\(([\s\S]*?)\)\);/);
assert(localSetMatch, 'Expected fated_state to still be written to localStorage.');
const localPayload = localSetMatch[1];

const forbiddenLocalFields = [
  'userAvatar',
  'userCover',
  'chatBg',
  'momentsBg',
  'img:m.img',
  'avatar:c.avatar',
  'cover:c.cover',
  'fontConfig',
  'widgetCustom',
  'appIconImgs',
  'lockWp',
  'homeWp',
];

for (const field of forbiddenLocalFields) {
  assert(!localPayload.includes(field), `Expected localStorage fated_state payload to exclude large field: ${field}`);
}

for (const required of [
  "fatedDBSaveKV('fated_state_core_backup'",
  "fatedDBSaveKV('profileAssets'",
  "fatedDBSaveKV('momentsAssets'",
  "fatedDBSaveKV('contactAssets'",
  "fatedDBSaveKV('fontConfigAssets'",
]) {
  assert(persistence.includes(required), `Expected IndexedDB save for ${required}.`);
}

assert(persistence.includes('function applyStateSnapshot'), 'Expected reusable applyStateSnapshot().');
assert(persistence.includes('function loadStateBackupFromDB'), 'Expected IndexedDB core backup loader.');
assert(persistence.includes('function loadStateAssetsFromDB'), 'Expected IndexedDB asset loader.');
assert(init.includes('loadStateBackupFromDB'), 'Expected initApp() to load IndexedDB core backup.');
assert(init.includes('loadStateAssetsFromDB'), 'Expected initApp() to load IndexedDB asset data.');

assert(/var\s+persistenceBooting\s*=\s*true/.test(persistence), 'Expected persistenceBooting to start true.');
assert(/function\s+isPersistenceBooting\s*\(\)/.test(persistence), 'Expected isPersistenceBooting() helper.');
assert(/function\s+markPersistenceReady\s*\(\)/.test(persistence), 'Expected markPersistenceReady() helper.');
assert(/isPersistenceBooting\(\)/.test(saveStateBody), 'Expected saveState() to skip writes while boot restore is running.');
assert(/activePlugins\s*:\s*buildActivePluginsSnapshot\(\)/.test(persistence), 'Expected buildLightState() to persist active plugins.');
assert(/personaSeq\s*:\s*personaSeq/.test(persistence), 'Expected buildLightState() to persist personaSeq.');
assert(/function\s+syncPersonaSeqFromContacts\s*\(\)/.test(persistence), 'Expected syncPersonaSeqFromContacts() helper.');
assert(/syncPersonaSeqFromContacts\(\)/.test(persistence), 'Expected snapshots to recalculate personaSeq after contacts load.');

const shellPath = resolve(root, 'js/main/01-system-shell.js');
const shell = readFileSync(shellPath, 'utf8');
assert(/function addPlugin\(type,\s*opts\)/.test(shell), 'Expected addPlugin() to accept startup no-save options.');
assert(/!opts\.skipSave[\s\S]*saveState\(\)/.test(shell), 'Expected addPlugin() to save only for user actions.');
assert(/addPlugin\(t,\s*\{skipSave:true\}\)/.test(init), 'Expected startup plugin seed to avoid saving during restore.');
assert(/seedStartupPlugins\(\)[\s\S]*markPersistenceReady\(\)[\s\S]*saveState\(\)/.test(init), 'Expected initApp() to save only after IndexedDB restore and plugin remount.');
console.log('Persistence structure verified.');
