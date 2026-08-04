import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const bannedLiteral = ['test' + 'er1', '\u6d4b\u8bd5\u54581'];
const excludedDirs = new Set(['.git', 'work', 'node_modules', '.wrangler', '.cache']);
const excludedFiles = new Set([
  'tools/verify-clean-default-state.mjs',
  'js/main/core/05-persistence.js'
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excludedDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(html|js|css|mjs)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

for (const full of walk(root)) {
  const rel = path.relative(root, full).replace(/\\/g, '/');
  if (excludedFiles.has(rel)) continue;
  const text = fs.readFileSync(full, 'utf8');
  for (const token of bannedLiteral) {
    assert(!text.includes(token), rel + ' should not contain legacy default token ' + token);
  }
}

const persistence = fs.readFileSync('js/main/core/05-persistence.js', 'utf8');
assert(persistence.includes('FATED_LEGACY_DEFAULT_CONTACT_IDS'), 'persistence must define legacy default sanitizer ids');
assert(persistence.includes("'test'+'er1'"), 'legacy id should only exist split inside sanitizer');
assert(persistence.includes('fatedSanitizeLegacyDefaultCloudPayload'), 'cloud payload sanitizer must exist');
assert(persistence.includes('fatedSanitizeLegacyDefaultRuntimeState'), 'runtime sanitizer must exist');
assert(!persistence.includes('\u6d4b\u8bd5\u54581'), 'persistence sanitizer should not include tester display copy');

const profile = fs.readFileSync('js/main/02-passcode-profile.js', 'utf8');
assert(/const contacts\s*=\s*\{\s*\};/.test(profile), 'contacts should start empty');
assert(/let currentContact\s*=\s*'';/.test(profile), 'currentContact should start empty');

const indexed = fs.readFileSync('js/main/core/04-indexeddb.js', 'utf8');
assert(indexed.includes('fatedIsLegacyDefaultContactId(contactId)'), 'IndexedDB save should skip legacy default contacts');
assert(indexed.includes('fatedDBDeleteChat(row.id)'), 'IndexedDB load should delete legacy default chat rows');

const cloud = fs.readFileSync('js/main/core/08-cloud-sync.js', 'utf8');
assert(cloud.includes('fatedSanitizeLegacyDefaultCloudPayload(snapshot)'), 'cloud upload snapshot should be sanitized');
assert(cloud.includes('fatedSanitizeLegacyDefaultCloudPayload(payload)'), 'cloud restore payload should be sanitized');

console.log('clean default state and legacy sanitizer ok');
