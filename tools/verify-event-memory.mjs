import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  ['index.html', 'js/main/core/10-event-memory.js'],
  ['js/main/core/05-persistence.js', 'fatedEventState'],
  ['js/main/core/05-persistence.js', 'fated_event_state'],
  ['js/main/chat/ai/03-context-prompt-search.js', 'fatedGlobalContextPrompt'],
  ['js/main/chat/ai/05-user-message-actions.js', 'wechat.message.user'],
  ['js/main/chat/ai/02-real-ai-reply.js', 'wechat.message.contact'],
  ['js/couple/02-diary-notes-location.js', 'couple.diary.add'],
  ['js/couple/02-diary-notes-location.js', 'couple.note.add'],
  ['js/couple/03-shop-food.js', 'couple.shop.add_self'],
  ['js/couple/03-shop-food.js', 'couple.food.order'],
  ['js/dream/00-dreamcore.js', 'dream.run.start'],
  ['js/dream/00-dreamcore.js', 'dream.card.choose'],
  ['js/dream/00-dreamcore.js', 'fatedGlobalContextPrompt'],
  ['js/nilflow/00-nilflow.js', 'nilflow.chat.user'],
  ['js/nilflow/00-nilflow.js', 'nilflow.post.create'],
  ['js/nilflow/00-nilflow.js', 'fatedGlobalContextPrompt'],
];

let failed = false;
for (const [file, needle] of checks) {
  const full = path.join(root, file);
  const text = fs.readFileSync(full, 'utf8');
  if (!text.includes(needle)) {
    failed = true;
    console.error(`missing ${needle} in ${file}`);
  }
}

if (failed) process.exit(1);
console.log(`event memory checks passed: ${checks.length}`);
