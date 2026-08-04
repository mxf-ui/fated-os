import fs from 'node:fs';
import assert from 'node:assert/strict';

const files = [
  'index.html',
  'js/main/02-passcode-profile.js',
  'js/main/core/00-api-config-state.js',
  'js/main/chat/00-group-voice-api.js',
  'js/main/chat/01-thread-render.js',
  'js/main/chat/06-call-persona-init.js',
  'js/main/01-system-shell.js',
  'js/main/core/08-cloud-sync.js'
];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  assert(!src.includes('tester1'), `${file} should not include tester1 default data`);
  assert(!src.includes('测试员1'), `${file} should not include tester persona copy`);
}

const profile = fs.readFileSync('js/main/02-passcode-profile.js', 'utf8');
assert(/const contacts\s*=\s*\{\s*\};/.test(profile), 'contacts should start empty');
assert(/let currentContact\s*=\s*'';/.test(profile), 'currentContact should start empty');

const thread = fs.readFileSync('js/main/chat/01-thread-render.js', 'utf8');
assert(/function renderEmptyThread\(/.test(thread), 'thread renderer should support empty contact state');
assert(/if\(!id\s*\|\|\s*!contacts\[id\]\)/.test(thread), 'openThread should reject missing contacts');

console.log('clean default state structure ok');
