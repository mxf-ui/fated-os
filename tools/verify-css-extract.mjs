import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = resolve(root, 'index.html');
const cssPath = resolve(root, 'css/style.css');

const expectedCssModules = [
  'modules/00-fonts.css',
  'modules/01-tokens.css',
  'modules/02-base.css',
  'modules/03-ios-components.css',
  'modules/04-icons-avatars.css',
  'modules/05-wechat.css',
  'modules/06-system-shell.css',
  'modules/07-settings-plugins.css',
  'modules/08-experiences.css',
  'modules/09-games.css',
];

const expectedMainJsFiles = [
  'main/00-boot-state.js',
  'main/01-system-shell.js',
  'main/02-passcode-profile.js',
  'main/core/00-api-config-state.js',
  'main/core/01-font-config.js',
  'main/core/02-api-config-ui.js',
  'main/core/03-api-status-test.js',
  'main/core/04-indexeddb.js',
  'main/core/05-persistence.js',
  'main/core/06-export-history.js',
  'main/core/07-wallet.js',
  'main/04-moments-social.js',
  'main/chat/00-group-voice-api.js',
  'main/chat/01-thread-render.js',
  'main/chat/world/00-worldbook-bindings.js',
  'main/chat/world/01-contact-profile.js',
  'main/chat/world/02-group-profile.js',
  'main/chat/world/03-worldbook-editor-import.js',
  'main/chat/03-lists-widgets.js',
  'main/chat/ai/00-widget-send-state.js',
  'main/chat/ai/01-message-prep-transcribe.js',
  'main/chat/ai/02-real-ai-reply.js',
  'main/chat/ai/03-context-prompt-search.js',
  'main/chat/ai/04-local-media-replies.js',
  'main/chat/ai/05-user-message-actions.js',
  'main/chat/ai/06-proactive-demos.js',
  'main/chat/05-drawers-stickers.js',
  'main/chat/06-call-persona-init.js',
  'main/06-forum.js',
  'main/07-game-space.js',
  'main/08-couple-space.js',
  'main/09-music-novel-bootstrap.js',
];

const expectedTailJsFiles = [
  'couple/00-state.js',
  'couple/01-generated-data-contacts.js',
  'couple/02-diary-notes-location.js',
  'couple/03-shop-food.js',
  'couple/04-checkin-report.js',
  'couple/05-ta-phone-data.js',
  'couple/06-chat-actions.js',
  'couple/07-redpacket-icons-bootstrap.js',
  'his-phone/00-state-entry.js',
  'his-phone/01-passcode.js',
  'his-phone/02-apps-chat.js',
  'his-phone/03-data.js',
  'games/suoha/00-state-init.js',
  'games/suoha/01-ui-pages.js',
  'games/suoha/02-money-loans.js',
  'games/suoha/03-contacts.js',
  'games/suoha/04-tetris.js',
  'games/suoha/05-mini-games.js',
  'games/suoha/06-reset-auto-init.js',
  'games/go/00-state-init.js',
  'games/go/01-ai-setup.js',
  'games/go/02-live-danmaku.js',
  'games/go/03-ecommerce.js',
  'games/go/04-game-couple-voice.js',
  'games/go/05-voice-end.js',
];

const html = readFileSync(htmlPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(existsSync(cssPath), 'Expected css/style.css to exist.');

const css = readFileSync(cssPath, 'utf8');
assert(
  html.includes('<link rel="stylesheet" href="css/style.css">'),
  'Expected index.html to link css/style.css.'
);

const head = html.slice(0, html.indexOf('</head>'));
assert(!/<style>\s*@import url\(/.test(head), 'Expected the document-level CSS block to be removed from <head>.');

let previousIndex = -1;
for (const modulePath of expectedCssModules) {
  const importLine = `@import url('./${modulePath}');`;
  const index = css.indexOf(importLine);
  assert(index >= 0, `Expected css/style.css to import ${modulePath}.`);
  assert(index > previousIndex, `Expected ${modulePath} to keep module import order.`);
  previousIndex = index;

  const absoluteModulePath = resolve(root, 'css', modulePath);
  assert(existsSync(absoluteModulePath), `Expected css/${modulePath} to exist.`);
  assert(readFileSync(absoluteModulePath, 'utf8').trim().length > 0, `Expected css/${modulePath} to be non-empty.`);
}

assert(!css.includes(':root{'), 'Expected design tokens to live in css/modules/01-tokens.css.');
assert(!css.includes('.phone{'), 'Expected phone layout CSS to live in css/modules/02-base.css.');

assert(!html.includes('<script src="js/main.js"></script>'), 'Expected js/main.js to be split into js/main/*.js.');
assert(!html.includes('<script src="js/couple-space.js"></script>'), 'Expected js/couple-space.js to be split into js/couple/*.js.');
assert(!html.includes('<script src="js/couple-check-phone.js"></script>'), 'Expected js/couple-check-phone.js to be split into js/his-phone/*.js.');
assert(!html.includes('<script src="js/games.js"></script>'), 'Expected js/games.js to be split into js/games/**/*.js.');

let previousScriptIndex = -1;
for (const jsFile of expectedMainJsFiles) {
  const scriptTag = `<script src="js/${jsFile}"></script>`;
  const index = html.indexOf(scriptTag);
  assert(index >= 0, `Expected index.html to load js/${jsFile}.`);
  assert(index > previousScriptIndex, `Expected js/${jsFile} to keep script load order.`);
  previousScriptIndex = index;

  const absoluteJsPath = resolve(root, 'js', jsFile);
  assert(existsSync(absoluteJsPath), `Expected js/${jsFile} to exist.`);
  assert(readFileSync(absoluteJsPath, 'utf8').trim().length > 0, `Expected js/${jsFile} to be non-empty.`);
}

const mammothTag = '<script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>';
const mammothIndex = html.indexOf(mammothTag);
assert(mammothIndex > previousScriptIndex, 'Expected external mammoth dependency to load after main modules.');
previousScriptIndex = mammothIndex;

for (const jsFile of expectedTailJsFiles) {
  const scriptTag = `<script src="js/${jsFile}"></script>`;
  const index = html.indexOf(scriptTag);
  assert(index >= 0, `Expected index.html to load js/${jsFile}.`);
  assert(index > previousScriptIndex, `Expected js/${jsFile} to keep script load order.`);
  previousScriptIndex = index;

  const absoluteJsPath = resolve(root, 'js', jsFile);
  assert(existsSync(absoluteJsPath), `Expected js/${jsFile} to exist.`);
  assert(readFileSync(absoluteJsPath, 'utf8').trim().length > 0, `Expected js/${jsFile} to be non-empty.`);
}

const inlineScriptMatches = html.match(/<script>\s*(?:\/\*|var |\(function|const |let |function )/g) || [];
assert(inlineScriptMatches.length === 0, 'Expected application scripts to be external files.');

console.log('CSS and JS extraction structure verified.');




