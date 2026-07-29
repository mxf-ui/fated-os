import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const state = readFileSync(resolve(root, 'js/main/core/00-api-config-state.js'), 'utf8');
const ui = readFileSync(resolve(root, 'js/main/core/02-api-config-ui.js'), 'utf8');
const status = readFileSync(resolve(root, 'js/main/core/03-api-status-test.js'), 'utf8');
const chat = readFileSync(resolve(root, 'functions/api/chat.js'), 'utf8');
const groupVoice = readFileSync(resolve(root, 'js/main/chat/00-group-voice-api.js'), 'utf8');
const persistence = readFileSync(resolve(root, 'js/main/core/05-persistence.js'), 'utf8');
const modelProxyPath = resolve(root, 'functions/api/models.js');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="cfg-profile-select"'), 'Expected API settings to include profile selector.');
assert(html.includes('id="cfg-profile-name"'), 'Expected API settings to include profile name input.');
assert(html.includes('id="cfg-endpoint"'), 'Expected API settings to include unified endpoint input.');
assert(html.includes('id="cfg-key"'), 'Expected API settings to include unified key input.');
assert(html.includes('id="cfg-model"'), 'Expected API settings to include unified model input.');
assert(html.includes('onclick="cfgFetchModels()"'), 'Expected API settings to include fetch models action.');
assert(html.includes('id="cfg-temperature"'), 'Expected API settings to include temperature slider.');
assert(html.includes('id="cfg-stream-toggle"'), 'Expected API settings to include stream toggle.');
assert(!html.includes('设为主用') && !html.includes('设为副用'), 'Expected no primary/secondary API buttons.');

assert(state.includes('profiles:['), 'Expected apiConfig to define profiles array.');
assert(state.includes('activeProfileId'), 'Expected apiConfig to track activeProfileId.');
assert(state.includes('temperature'), 'Expected API profile temperature setting.');
assert(state.includes('stream'), 'Expected API profile stream setting.');

for (const fn of ['getActiveApiProfile', 'syncLegacyApiConfigFromProfile', 'cfgFetchModels', 'cfgRenderModelOptions', 'cfgDeleteProfile']) {
  assert(ui.includes(`function ${fn}`), `Expected ${fn}() in API config UI.`);
}

assert(existsSync(modelProxyPath), 'Expected Cloudflare model list proxy at functions/api/models.js.');
const modelProxy = readFileSync(modelProxyPath, 'utf8');
assert(modelProxy.includes('onRequestPost'), 'Expected /api/models POST handler.');
assert(modelProxy.includes('/models'), 'Expected model proxy to request provider model list endpoints.');
assert(modelProxy.includes('generativelanguage.googleapis.com'), 'Expected Gemini model list support.');
assert(modelProxy.includes('OpenAI-compatible'), 'Expected OpenAI-compatible model list support.');

assert(status.includes('temperature:m.temperature'), 'Expected API tests to use configured temperature.');
assert(chat.includes('temperature'), 'Expected chat proxy to accept temperature.');
assert(chat.includes('useStream'), 'Expected chat proxy to accept stream switch.');
assert(chat.includes('parseSseReply'), 'Expected chat proxy to aggregate SSE stream responses.');
assert(groupVoice.includes('temperature:(m?m.temperature:0.7)'), 'Expected real chat proxy calls to pass configured temperature.');
assert(groupVoice.includes('stream:(m?m.stream:false)'), 'Expected real chat proxy calls to pass configured stream setting.');
assert(groupVoice.includes('m.stream===true'), 'Expected real chat direct calls to fall back to proxy when stream is enabled.');
assert(persistence.includes('hasSavedProfiles'), 'Expected persistence to preserve or migrate API profiles.');
assert(persistence.includes('ensureApiProfiles'), 'Expected persistence to normalize API profiles after load.');

console.log('API config UI structure verified.');
