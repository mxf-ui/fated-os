import { readFileSync } from 'node:fs';

const css = readFileSync('css/modules/08-experiences.css', 'utf8');
const state = readFileSync('js/couple/00-state.js', 'utf8');
const checkin = readFileSync('js/couple/04-checkin-report.js', 'utf8');
const index = readFileSync('index.html', 'utf8');

const requiredCss = [
  '.couple-shell-green',
  '.couple-hero-card',
  '.couple-line-card',
  '.couple-check-grid',
  '.couple-trust-ring',
  '.couple-timeline',
  '.couple-evidence-card',
  '.couple-action-row'
];

const requiredFns = [
  'coupleEnsureCheckinState',
  'coupleRenderCheckinDashboard',
  'coupleStartCheckinScan',
  'coupleCheckinSendMoodMessage',
  'coupleCheckinSaveReport',
  'coupleCheckinTimelineHTML'
];

function assertIncludes(source, needle, label){
  if(!source.includes(needle)) throw new Error(label + ' is missing ' + needle);
}

for(const selector of requiredCss) assertIncludes(css, selector, 'couple CSS');
for(const fn of requiredFns) assertIncludes(checkin, fn, 'check-in module');
assertIncludes(checkin, 'realAISpeak', 'check-in module');
assertIncludes(checkin, 'saveCoupleState', 'check-in module');
assertIncludes(checkin, 'checkin', 'check-in module');
assertIncludes(state, 'checkin', 'couple persistence');
assertIncludes(index, 'id="sheet-couple"', 'couple sheet');

const forbiddenCheckin = [
  'coupleCheckinAskForProof',
  'coupleCheckinMode',
  'featureIdeasHTML',
  'askLoc',
  'askPhoto',
  'askVoice',
  'couple-soft-tabs',
  'couple-soft-tab',
  'couple-feature-ideas',
  'modeLabel('
];
const forbiddenCss = [
  '.couple-soft-tabs',
  '.couple-soft-tab',
  '.couple-feature-ideas',
  '.couple-feature-idea'
];
const forbiddenState = [
  "mode:'soft'",
  'proofRequests',
  'pendingProof'
];

function assertMissing(source, needle, label){
  if(source.includes(needle)) throw new Error(label + ' still contains deleted item ' + needle);
}

for(const needle of forbiddenCheckin) assertMissing(checkin, needle, 'check-in module');
for(const needle of forbiddenCss) assertMissing(css, needle, 'couple CSS');
for(const needle of forbiddenState) assertMissing(state, needle, 'couple persistence');

console.log('Couple space redesign verification passed.');
