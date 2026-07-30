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
  '.couple-action-row',
  '.couple-soft-tab',
  '.couple-feature-ideas'
];

const requiredFns = [
  'coupleEnsureCheckinState',
  'coupleRenderCheckinDashboard',
  'coupleStartCheckinScan',
  'coupleCheckinAskForProof',
  'coupleCheckinSendMoodMessage',
  'coupleCheckinSaveReport',
  'coupleCheckinTimelineHTML',
  'coupleCheckinMode'
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

console.log('Couple space redesign verification passed.');
