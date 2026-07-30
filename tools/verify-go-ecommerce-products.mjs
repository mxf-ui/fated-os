import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
const fail = (msg) => {
  console.error(msg);
  process.exitCode = 1;
};

const state = read('js/games/go/00-state-init.js');
const live = read('js/games/go/02-live-danmaku.js');
const ecommerce = read('js/games/go/03-ecommerce.js');
const chat = read('js/main/chat/01-thread-render.js');
const css = read('css/modules/09-games.css');

if (!state.includes('currentProductId')) fail('GO state must persist the currently explained product id.');
if (!state.includes('goEnsureProductIds')) fail('GO state must normalize product ids for existing custom products.');

if (!live.includes('goRenderTalkingProductBadge()')) fail('Live stage must render the active product badge.');
if (!live.includes('goRenderProductShelf()')) fail('Live page must render the ecommerce product shelf below the stage.');

[
  'function goRenderProductShelf',
  'function goRenderTalkingProductBadge',
  'function goSelectProduct',
  'function goOpenProductSharePicker',
  'function goShareProductToWeChat',
  'function goEvaluatePitchFallback'
].forEach((needle) => {
  if (!ecommerce.includes(needle)) fail('Missing ecommerce helper: ' + needle);
});

if (!ecommerce.includes("cardType:'product'")) fail('Product sharing must create WeChat product cards.');
if (!ecommerce.includes('goState.currentProductId')) fail('Pitch/order flow must use the active product id.');
if (!ecommerce.includes('goTriggerOrders(active.id')) fail('Orders must target the product currently being explained.');
if (!ecommerce.includes('goOpenProductSharePicker') || !ecommerce.includes('active.id')) fail('No-order pitch feedback must offer WeChat sharing.');

if (!chat.includes("m.cardType==='product'")) fail('WeChat renderer must support product cards.');
if (!chat.includes('product-card-img')) fail('Product card renderer must include the custom product image.');

[
  '.go-product-shelf',
  '.go-product-shelf-card',
  '.go-live-product-badge',
  '.go-product-actions'
].forEach((needle) => {
  if (!css.includes(needle)) fail('Missing GO ecommerce CSS: ' + needle);
});

if (!process.exitCode) console.log('GO ecommerce product card verification passed.');
