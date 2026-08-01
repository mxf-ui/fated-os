import { readFileSync } from 'node:fs';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const index = readFileSync('index.html', 'utf8');
const boot = readFileSync('js/main/00-boot-state.js', 'utf8');
const cloud = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');
const register = readFileSync('functions/api/auth/register.js', 'utf8');
const login = readFileSync('functions/api/auth/login.js', 'utf8');

assert(index.includes('id="cloud-entry-email"'), 'first entry gate must ask for account email');
assert(index.includes('id="cloud-entry-password"'), 'first entry gate must ask for account password');
assert(index.includes('id="cloud-entry-invite"'), 'first entry gate must ask for invite code');
assert(index.includes('cloudEntryLogin()'), 'entry gate must support login');
assert(index.includes('cloudEntryRegister()'), 'entry gate must support registration');

assert(!boot.includes("safeLS.getItem('invite_verified')"), 'old local invite-only gate must not unlock the site by itself');
assert(boot.includes('cloudShowEntryGate'), 'boot should leave entry control to cloud auth gate');

assert(cloud.includes('function cloudReadEntryInputs'), 'cloud sync needs dedicated first-open input reader');
assert(cloud.includes('inviteCode'), 'cloud auth payload must include inviteCode');
assert(cloud.includes('cloudBootAuthGate'), 'cloud sync must enforce the first-open auth gate');
assert(cloud.includes('cloudHideEntryGate'), 'cloud sync must hide the gate only after password unlock');
assert(cloud.includes("window.addEventListener('load'"), 'cloud auth gate must run on page load');

assert(register.includes('validateInviteCode'), 'registration API must validate invite code server-side');
assert(login.includes('validateInviteCode'), 'login API must validate invite code server-side');

console.log('PASS: cloud entry persistence gate verified');
