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
if (!dream.includes('function dreamTimeout')) fail('Dream AI calls need timeout fallback so the portal cannot spin forever.');
if (!dream.includes('dreamEnterRunView')) fail('Dream start must enter chat/run view immediately after starting.');
if (!dream.includes('function dreamApplyDocToWorld')) fail('Dream docs must auto-fill world config after txt/word import.');
if (!dream.includes('function dreamNewSlot')) fail('Dream save slots must support creating/resetting a slot.');
if (!dream.includes('function dreamDeleteSlot')) fail('Dream save slots must support deleting a slot.');
if (!dream.includes('function dreamBuildIdentityBrief')) fail('Dream run must brief user/contact identities before the main task.');
if (!dream.includes('function dreamTemplateCards')) fail('Dream card tasks must be derived from dungeon template settings.');
if (!dream.includes('function dreamShouldGenerateCards')) fail('Dream card tasks must wait for enough roleplay/chat progression.');
if (!dream.includes('dreamState.run.awaitingCards')) fail('Dream run state must track whether cards are currently unlocked.');
if (!index.includes('dreamNewSlot()')) fail('Dream setup UI must expose create/reset save slot.');
if (!index.includes('dreamDeleteSlot()')) fail('Dream setup UI must expose delete save slot.');
if (!dream.includes('function dreamPickSlotWallpaper')) fail('Dream save slots must support custom wallpaper upload.');
if (!dream.includes('function dreamPickSceneImage')) fail('Dream dungeon scenes must support custom image upload.');
if (!dream.includes('function dreamSendPlayerMessage')) fail('Dream run chat must allow user messages after contacts enter.');
if (!dream.includes('slot.wallpaper')) fail('Dream slot wallpaper must be persisted inside dream state.');
if (!dream.includes('slot.sceneImage')) fail('Dream scene image must be persisted inside dream state.');

[
  'function dreamApiReady',
  'function dreamBuildContactMemoryPrompt',
  'function dreamBuildRelationshipMemoryPrompt',
  'function dreamBuildRunLogPrompt',
  'function dreamBuildScriptMurderSystem',
  'function dreamBuildContactActionPrompt',
  'function dreamBuildNarratorPrompt',
  'function dreamAppendDreamMemory',
  'function dreamMarkApiFailure',
  "fetch('/api/chat'",
  'getWorldBookPrompt',
  'memory.summary',
  'seed.slice',
  'worldBooks',
  'script-murder',
  'no local fallback',
  'persona',
  'userPrompt',
  'tone'
].forEach((needle) => {
  if (!dream.includes(needle)) fail('Dream advanced AI roleplay missing: ' + needle);
});
if (dream.includes('\\u4f1a\\u5148\\u7528\\u672c\\u5730\\u4fdd\\u5e95\\u5267\\u60c5\\u542f\\u52a8')) fail('Dream API status must not promise local fallback story.');
if (/function dreamContactFirstMessage[\\s\\S]*?function dreamGenerateOpeningBrief/.test(dream) && /function dreamContactFirstMessage[\\s\\S]*?function dreamGenerateOpeningBrief/.exec(dream)[0].includes('dreamFallbackContact')) fail('Dream first contact message must not use local fallback persona text.');
if (/function dreamContactReact[\\s\\S]*?function dreamCompleteRun/.test(dream) && /function dreamContactReact[\\s\\S]*?function dreamCompleteRun/.exec(dream)[0].includes('dreamFallbackContact')) fail('Dream contact reactions must not use local fallback persona text.');
if (!index.includes('id="dream-file-input"')) fail('Dream sheet needs a hidden file input for wallpapers and scene images.');
if (!css.includes('.dream-slot-preview')) fail('Dream CSS must render save slot wallpaper previews.');
if (!css.includes('.dream-scene-image')) fail('Dream CSS must render uploaded dungeon scene images.');
if (!css.includes('@keyframes dreamSlotWake')) fail('Dream CSS must include a save-slot wake animation.');

[
  'id="dream-view-setup"',
  'id="dream-view-run"',
  'id="dream-doc-input"',
  'id="dream-world-name"',
  'id="dream-era-input"',
  'id="dream-rules-input"',
  'id="dream-npc-input"',
  'id="dream-factions-input"',
  'id="dream-resources-input"',
  'id="dream-rewards-input"',
  'id="dream-templates-input"'
].forEach((needle) => {
  if (!index.includes(needle)) fail('Dream V1 split-view/backend UI missing: ' + needle);
});

[
  'function dreamRenderView',
  'function dreamReadWorldForm',
  'function dreamPickWorldDoc',
  'function dreamBindDocInput',
  'function dreamToggleContactPermission',
  'function dreamUpdateContactRole',
  'function dreamOpenRunView',
  'function dreamBackToSetup',
  'worldConfig',
  'contactSettings',
  'rewardPool',
  'templateLibrary',
  'inventory'
].forEach((needle) => {
  if (!dream.includes(needle)) fail('Dream V1 behavior missing: ' + needle);
});

[
  '.dream-view',
  '.dream-view.active',
  '.dream-run-page',
  '.dream-world-grid',
  '.dream-field',
  '.dream-contact-role',
  '.dream-run-back',
  '.dream-progress-track',
  '.dream-inventory'
].forEach((needle) => {
  if (!css.includes(needle)) fail('Dream V1 CSS missing: ' + needle);
});

if (!dream.includes("['S+','S','A','B','C']")) fail('Dream scoring must use the required ranks.');
if (!css.includes('Dreamcore scroll fix')) fail('Dream sheet must include the scroll fix guard.');
if (!css.includes('#sheet-dream .dream-body{ flex:1 1 auto; min-height:0;')) fail('Dream setup view must be vertically scrollable.');
if (!css.includes('#sheet-dream .dream-run-page{ min-height:0; height:100%; overflow-y:auto;')) fail('Dream run view must be vertically scrollable.');
if (/[\u{1F300}-\u{1FAFF}]/u.test(dream + css)) fail('Dream feature must not contain emoji glyphs.');

if (!process.exitCode) console.log('Dreamcore app verification passed.');
