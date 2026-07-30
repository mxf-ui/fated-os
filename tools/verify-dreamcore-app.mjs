import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const fail = (msg) => {
  console.error(msg);
  process.exitCode = 1;
};

const index = read('index.html');
const shell = read('js/main/01-system-shell.js');
const persistence = read('js/main/core/05-persistence.js');
const dream = read('js/dream/00-dreamcore.js');
const css = read('css/modules/10-dreamcore.css');
const systemCss = read('css/modules/06-system-shell.css');
const style = read('css/style.css');

[
  "id:'dream'",
  "name:'\\u96fe\\u7ec7\\u68a6\\u6838'",
  "openSheet('dream');initDreamCore();",
  'svgDream'
].forEach((needle) => {
  if (!shell.includes(needle)) fail('Home shell missing dream app registration: ' + needle);
});

[
  'id="sheet-dream"',
  'id="dream-save-slots"',
  'id="dream-world-input"',
  'id="dream-contact-list"',
  'id="dream-vortex"',
  'id="dream-choice-card"',
  'id="dream-chat"',
  'id="dream-result"'
].forEach((needle) => {
  if (!index.includes(needle)) fail('Dream sheet missing required UI node: ' + needle);
});

[
  'function initDreamCore',
  'function dreamDefault',
  'function dreamEnsureStateShape',
  'function dreamSaveWorld',
  'function dreamSelectSlot',
  'function dreamStartRun',
  'function dreamRenderVortex',
  'function dreamContactFirstMessage',
  'function dreamGenerateScene',
  'function dreamChooseCard',
  'function dreamCompleteRun',
  'function dreamCallAI'
].forEach((needle) => {
  if (!dream.includes(needle)) fail('Dream module missing behavior: ' + needle);
});

[
  '.dream-shell',
  '.dream-vortex',
  '.dream-choice-card',
  '.dream-save-burst',
  '@keyframes dreamVortexSpin',
  '@keyframes dreamSavePulse'
].forEach((needle) => {
  if (!css.includes(needle)) fail('Dream CSS missing visual system: ' + needle);
});

if (index.includes('class="sheet dream-shell" id="sheet-dream"')) fail('Dream sheet outer wrapper must keep only the global sheet class.');
if (!style.includes("10-dreamcore.css")) fail('css/style.css must import dream CSS module.');
if (!systemCss.includes('.d-board{ display:grid; grid-template-columns:repeat(3,72px);')) fail('Home app tiles must be proportionally smaller and fixed-size.');
if (!persistence.includes('dream: typeof dreamState')) fail('Persistence snapshot must include dream state.');
if (!persistence.includes('dreamEnsureStateShape')) fail('Persistence restore must normalize dream state.');
if (!dream.includes('dreamContactFirstMessage(function')) fail('Dungeon must force WeChat contact to speak before scene choices.');
if (!dream.includes("['S+','S','A','B','C']")) fail('Dream scoring must use the required ranks.');
if (/[\u{1F300}-\u{1FAFF}]/u.test(dream + css)) fail('Dream feature must not contain emoji glyphs.');

if (!process.exitCode) console.log('Dreamcore app verification passed.');
