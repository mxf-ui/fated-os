import { readFileSync } from 'node:fs';

const state = readFileSync('js/couple/00-state.js', 'utf8');
const gen = readFileSync('js/couple/01-generated-data-contacts.js', 'utf8');
const diary = readFileSync('js/couple/02-diary-notes-location.js', 'utf8');
const shop = readFileSync('js/couple/03-shop-food.js', 'utf8');
const profile = readFileSync('js/main/chat/world/01-contact-profile.js', 'utf8');
const chatActions = readFileSync('js/main/chat/ai/05-user-message-actions.js', 'utf8');
const aiReply = readFileSync('js/main/chat/ai/02-real-ai-reply.js', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');
const persistence = readFileSync('js/main/core/05-persistence.js', 'utf8');
const indexedDb = readFileSync('js/main/core/04-indexeddb.js', 'utf8');
const cloudSync = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');

function assertIncludes(source, needle, label){
  if(!source.includes(needle)) throw new Error(label + ' is missing ' + needle);
}
function assertMissing(source, needle, label){
  if(source.includes(needle)) throw new Error(label + ' must not contain ' + needle);
}

[
  "myShop",
  "partnerWishlist",
  "selfFoodOrders",
  "partnerFoodOrders",
  "diaryReplies",
  "diaryFeelings"
].forEach((needle) => assertIncludes(state, needle, 'couple state schema'));

assertMissing(gen, 'd.diary.push', 'generated data must not write user diary');
assertMissing(gen, 'd.notes.push', 'generated data must not write user notes');
assertIncludes(gen, 'coupleRefreshPartnerWishlist', 'generated data should refresh partner wishlist');
assertIncludes(gen, 'coupleWishlistDailyKey', 'generated data should use daily wishlist key');

[
  "coupleDiaryAiReply",
  "callRealAI",
  "getPersonaPrompt",
  "getWorldBookPrompt",
  "diaryReplies",
  "diaryFeelings",
  "font-style:italic",
  "entryId",
  "source:'user'"
].forEach((needle) => assertIncludes(diary, needle, 'manual diary AI response'));
assertMissing(diary, '\u0041\u0049\u751f\u6210\u65e5\u8bb0', 'diary UI must not present AI-generated diary');

[
  "coupleMyShop",
  "couplePartnerWishlist",
  "coupleRefreshPartnerWishlist",
  "coupleFoodTarget",
  "target:'self'",
  "target:'partner'",
  "selfFoodOrders",
  "partnerFoodOrders",
  "cardType:'order'"
].forEach((needle) => assertIncludes(shop, needle, 'shopping and food split'));

[
  "userProfile",
  "userProfileUpdatedAt",
  "userProfileLastMsgCount"
].forEach((needle) => {
  assertIncludes(persistence, needle, 'profile persistence');
  assertIncludes(indexedDb, needle, 'profile IndexedDB');
  assertIncludes(cloudSync, needle, 'profile cloud sync');
});

[
  "coupleUserProfile",
  "maybeUpdateUserProfileAfter",
  "callRealAI",
  "getPersonaPrompt",
  "getWorldBookPrompt",
  "\u4eba\u7269\u4fa7\u5199"
].forEach((needle) => assertIncludes(chatActions + '\n' + aiReply + '\n' + profile + '\n' + indexHtml, needle, 'user profiling'));


[
  "typeof isPersistenceBooting !== 'function'",
  "var booting = typeof isPersistenceBooting === 'function' && isPersistenceBooting();",
  "var savedCore = true",
  "return savedLocal && savedCore"
].forEach((needle) => assertIncludes(state, needle, 'couple persistence regression fixes'));

[
  "d.partnerWishlist.splice(i,1)",
  "window.saveCoupleState();",
  "window.couplePartnerWishlist();",
  "coupleRefreshPartnerWishlist(true);couplePartnerWishlist();",
  "\\u624b\\u52a8\\u5237\\u65b0 TA \\u6e05\\u5355"
].forEach((needle) => assertIncludes(shop, needle, 'wishlist purchase and manual refresh'));
console.log('Couple personal data verification passed.');
