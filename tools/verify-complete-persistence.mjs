import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const persistence = readFileSync('js/main/core/05-persistence.js', 'utf8');
const indexeddb = readFileSync('js/main/core/04-indexeddb.js', 'utf8');
const cloud = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');
const shell = readFileSync('js/main/01-system-shell.js', 'utf8');
const init = readFileSync('js/main/chat/06-call-persona-init.js', 'utf8');

assert(persistence.includes('function isPersistableContactId'), 'persistence must use a shared contact filter');
assert(!persistence.includes("k[0]==='p'||k[0]==='g'||k==='tester1'"), 'contacts/assets must not be restricted to p/g/tester1 only');
assert(persistence.includes('ensureRestoredContact'), 'restore must create missing contact shells');
assert(indexeddb.includes('ensureRestoredContact(row.id'), 'IndexedDB chat restore must not skip missing contacts');
assert(cloud.includes('ensureRestoredContact(row.id'), 'cloud chat restore must not skip missing contacts');
assert(cloud.includes('name:c.name'), 'cloud chat snapshot must include contact identity fields');
assert(cloud.includes('avatar:c.avatar'), 'cloud chat snapshot must include contact image fields');

assert(shell.includes("setAttribute('data-wc-img', type+':'+i)") && shell.includes('widgetCustom[wt].imgs[idx]'), 'each widget image slot must have an independent save key');
assert(shell.includes('restoreWidgetSlotImages'), 'plugin image restore must cover every slot');
assert(init.includes('syncRenderedContactRows()'), 'startup must render all restored contacts, not only p/g ids');

console.log('PASS: complete persistence behavior verified');
