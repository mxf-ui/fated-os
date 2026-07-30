import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const fail = (message) => { console.error('[verify-nilflow] ' + message); process.exit(1); };

const index = read('index.html');
const shell = read('js/main/01-system-shell.js');
const persistence = read('js/main/core/05-persistence.js');
const style = read('css/style.css');

if (!existsSync(join(root, 'js/nilflow/00-nilflow.js'))) fail('Missing js/nilflow/00-nilflow.js');
if (!existsSync(join(root, 'css/modules/11-nilflow.css'))) fail('Missing css/modules/11-nilflow.css');

const nilflow = read('js/nilflow/00-nilflow.js');
const css = read('css/modules/11-nilflow.css');

['id="sheet-nilflow"','id="nilflow-root"','id="nilflow-avatar-input"','js/nilflow/00-nilflow.js'].forEach((needle) => {
  if (!index.includes(needle)) fail('index.html missing ' + needle);
});

['svgNilflow',"id:'nilflow'","name:'\\u533f\\u6d41'","openSheet('nilflow');initNilflow();"].forEach((needle) => {
  if (!shell.includes(needle)) fail('system shell missing ' + needle);
});

if (!style.includes("@import url('./modules/11-nilflow.css');")) fail('css/style.css missing nilflow import');
if (!persistence.includes('nilflow: typeof nilflowState')) fail('buildLightState must persist nilflow');
if (!persistence.includes('nilflowState=Object.assign(nilflowDefault(), s.nilflow)')) fail('applyStateSnapshot must restore nilflow');

[
  'function nilflowDefault','function nilflowEnsureStateShape','function initNilflow','function nilflowRender','function nilflowSetTab',
  'function nilflowStartMatch','function nilflowAcceptMatch','function nilflowRejectMatch','function nilflowSendMessage','function nilflowCreatePost',
  'function nilflowClearChats','function nilflowDeletePosts','function nilflowDeactivateAccount','function nilflowBlockUser','function nilflowReportUser',
  'function nilflowActiveApiProfile','function nilflowApiReady','function nilflowCallAI','function nilflowBuildChatMessages','function nilflowApplyRelationship',
  'function nilflowRetryReply','function nilflowToggleLikePost','function nilflowAddComment','function nilflowRenderComments',
  'persona:','worldview:','speakingStyle:','relationship:','memory:',"fetch('/api/chat'"
].forEach((needle) => {
  if (!nilflow.includes(needle)) fail('nilflow js missing ' + needle);
});

['.nilflow-shell','.nilflow-tabs','.nilflow-feed-card','.nilflow-match-strip','.nilflow-chat-panel','.nilflow-voice-panel','.nilflow-privacy-row','#nilflow-root{ height:100%; min-height:0; flex:1 1 auto; overflow:hidden;','#sheet-nilflow .sheet-body{ height:100%; min-height:0; display:flex; flex-direction:column;','.nilflow-comments','.nilflow-comment-box'].forEach((needle) => {
  if (!css.includes(needle)) fail('nilflow css missing ' + needle);
});

['WeChat','wechat','contacts','currentContact','worldBooks'].forEach((forbidden) => {
  if (nilflow.includes(forbidden)) fail('nilflow js must stay independent; forbidden reference: ' + forbidden);
});

if (nilflow.includes('function nilflowAutoReply')) fail('nilflow must not use local fake replies.');
if (nilflow.includes('已使用本地匿名回复')) fail('nilflow must not fallback to local fake replies.');

const emojiPattern = /[\u{1F300}-\u{1FAFF}]/u;
if (emojiPattern.test(nilflow) || emojiPattern.test(css)) fail('nilflow files must not contain emoji glyphs');

console.log('[verify-nilflow] ok');