import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const index = read('index.html');
const css = read('css/modules/07-settings-plugins.css');
const cloud = read('js/main/core/08-cloud-sync.js');
const entryStart = index.indexOf('<div id="invite-screen"');
const entryEnd = index.indexOf('<div class="stage-note"');
const entryBlock = entryStart >= 0 && entryEnd > entryStart ? index.slice(entryStart, entryEnd) : '';
const cloudTop = cloud.slice(0, 9000);

function assert(condition, message){
  if(!condition) throw new Error(message);
}

assert(index.includes('<title>Fated OS</title>'), 'document title must be clean');
assert(entryBlock.includes('cloud-entry-email'), 'entry email input is missing');
assert(entryBlock.includes('cloud-entry-password'), 'entry password input is missing');
assert(entryBlock.includes('cloud-entry-invite'), 'entry invite input is missing');
assert(entryBlock.includes('cloud-entry-label'), 'entry labels are missing');
assert(!entryBlock.includes('????'), 'entry HTML still contains mojibake question marks');
assert(css.includes('#invite-screen.cloud-entry-gate'), 'entry CSS override must target invite-screen strongly');
assert(css.includes('display:flex!important'), 'entry CSS must force the gate to display as flex');
assert(css.includes('.cloud-entry-label'), 'entry label CSS is missing');
assert(!cloudTop.includes('????'), 'cloud sync entry messages still contain mojibake question marks');
assert(cloudTop.includes('EMAIL_PASSWORD_REQUIRED'), 'cloud sync clean message constants are missing');
console.log('entry gate markup, CSS, and cloud auth messages are clean');
