import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const diagnostics = fs.readFileSync('js/main/core/09-save-diagnostics.js', 'utf8');
const cloudSync = fs.readFileSync('js/main/core/08-cloud-sync.js', 'utf8');
const css = fs.readFileSync('css/modules/07-settings-plugins.css', 'utf8');

const requiredIndex = [
  'id="save-diagnostics-panel"',
  'id="save-diagnostics-grid"',
  'id="save-log-summary"',
  'id="save-log-list"',
  'onclick="saveDiagnosticsRefresh(true)"',
  'onclick="saveDiagnosticsClearLogs()"',
  'js/main/core/09-save-diagnostics.js?v=20260804-save-panel'
];

const requiredJs = [
  'function saveDiagnosticsCollect',
  'function saveDiagnosticsRender',
  'function saveDiagnosticsLog',
  'function saveDiagnosticsRefresh',
  'function saveDiagnosticsClearLogs',
  'window.saveDiagnosticsLog=saveDiagnosticsLog'
];

const requiredCloudHooks = [
  "saveDiagnosticsLog('cloud-upload-success'",
  "saveDiagnosticsLog('cloud-upload-failed'",
  "saveDiagnosticsLog('cloud-restore-success'",
  "saveDiagnosticsLog('cloud-restore-failed'",
  "saveDiagnosticsLog('cloud-autosave-failed'",
  "saveDiagnosticsLog('cloud-auth-ready'"
];

const requiredCss = [
  '.save-diagnostics-panel',
  '.save-diagnostics-grid',
  '.save-diagnostic-item',
  '.save-log-list',
  '.save-log-row'
];

function assertIncludes(label, haystack, needles) {
  const missing = needles.filter((needle) => !haystack.includes(needle));
  if (missing.length) {
    console.error(`${label} missing:\n${missing.join('\n')}`);
    process.exit(1);
  }
}

assertIncludes('index.html', index, requiredIndex);
assertIncludes('09-save-diagnostics.js', diagnostics, requiredJs);
assertIncludes('08-cloud-sync.js hooks', cloudSync, requiredCloudHooks);
assertIncludes('settings css', css, requiredCss);

console.log('PASS: save diagnostics panel and log statistics wiring verified');
