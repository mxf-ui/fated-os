import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const fail = (msg) => {
  console.error(msg);
  process.exitCode = 1;
};

const index = read('index.html');
const state = read('js/main/core/00-api-config-state.js');
const ui = read('js/main/core/02-api-config-ui.js');
const imageGenPath = 'js/main/core/09-image-generation.js';
const imageGen = existsSync(join(root, imageGenPath)) ? read(imageGenPath) : '';
const imageProxyPath = 'functions/api/image.js';
const imageProxy = existsSync(join(root, imageProxyPath)) ? read(imageProxyPath) : '';
const contactProfile = read('js/main/chat/world/01-contact-profile.js');
const persistence = read('js/main/core/05-persistence.js');
const chatAI = read('js/main/chat/ai/02-real-ai-reply.js');
const nilflow = read('js/nilflow/00-nilflow.js');
const dream = read('js/dream/00-dreamcore.js');

[
  'id="cfg-image-enabled"',
  'id="cfg-image-provider"',
  'id="cfg-image-endpoint"',
  'id="cfg-image-key"',
  'id="cfg-image-model"',
  'id="cfg-image-style"',
  'id="cfg-image-negative"',
  'id="cfg-image-preview"',
  'onclick="cfgTestImageGen()"'
].forEach((needle) => {
  if (!index.includes(needle)) fail('API settings missing image generation UI: ' + needle);
});

if (!index.includes('js/main/core/09-image-generation.js')) fail('index.html must load shared image generation helper.');
if (!state.includes('imageGen:{')) fail('apiConfig must include imageGen defaults.');
if (!ui.includes('function cfgEnsureImageGenShape')) fail('API config UI must normalize imageGen settings.');
if (!ui.includes('function cfgReadImageGenForm')) fail('API config UI must save imageGen settings.');
if (!ui.includes('function cfgTestImageGen')) fail('API config UI must test image generation.');
if (!existsSync(join(root, imageGenPath))) fail('Shared image generation helper is missing.');

[
  'function imageGenReady',
  'function imageGenGenerate',
  "fetch('/api/image'",
  'imageGenBuildPrompt',
  'imageGenMaybeAttachChatIllustration'
].forEach((needle) => {
  if (!imageGen.includes(needle)) fail('Shared image generation helper missing: ' + needle);
});

[
  'export async function onRequestPost',
  'pollinations',
  'images/generations',
  'image_url',
  'b64_json'
].forEach((needle) => {
  if (!imageProxy.includes(needle)) fail('Image proxy missing support: ' + needle);
});

if (!index.includes('id="cp-imagegen-toggle"')) fail('Contact profile must expose per-contact image generation toggle.');
if (!contactProfile.includes('cp-imagegen-toggle')) fail('Contact profile logic must read/write image generation toggle.');
if (!persistence.includes('imageGenEnabled')) fail('Contact snapshot must persist image generation toggle.');
if (!chatAI.includes('imageGenMaybeAttachChatIllustration')) fail('WeChat AI replies must trigger optional image illustrations.');

[
  'nilflowMaybeAutoPostImage',
  'nilflowMaybeAutoChatImage',
  'imageGenGenerate'
].forEach((needle) => {
  if (!nilflow.includes(needle)) fail('NilFlow missing image generation integration: ' + needle);
});

[
  'dreamMaybeAutoSceneImage',
  'imageGenGenerate',
  'sceneImage'
].forEach((needle) => {
  if (!dream.includes(needle)) fail('Dreamcore missing image generation integration: ' + needle);
});

if (!process.exitCode) console.log('Image generation integration verified.');
