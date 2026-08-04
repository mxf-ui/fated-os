import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const source = readFileSync('js/main/core/08-cloud-sync.js', 'utf8');

assert(/function\s+cloudMergeSnapshotPayloads\s*\(/.test(source), 'cloudMergeSnapshotPayloads must exist');
assert(/cloudPrepareSnapshotForUpload\(snapshot,\s*opts\)/.test(source), 'cloudUploadSnapshot must prepare and merge before upload');
assert(/cloudMergeSnapshotPayloads\(snapshot,\s*remotePayload/.test(source), 'upload preparation must merge remote data into local snapshot');
assert(/cloudAutoSyncAfterUnlock[\s\S]*cloudMergeSnapshotPayloads\(local,\s*remotePayload/.test(source), 'unlock sync must merge instead of only choosing local or remote');

const context = {
  console,
  window: { addEventListener() {}, FATED_SUPABASE_CONFIG: {} },
  document: { addEventListener() {}, getElementById() { return null; } },
  navigator: { userAgent: 'verify' },
  crypto: { getRandomValues(bytes) { return bytes; }, subtle: {} },
  atob(value) { return Buffer.from(value, 'base64').toString('binary'); },
  btoa(value) { return Buffer.from(value, 'binary').toString('base64'); },
  fatedSanitizeLegacyDefaultCloudPayload(payload) { return payload; },
};
vm.createContext(context);
vm.runInContext(source, context, { filename: '08-cloud-sync.js' });

const local = {
  schemaVersion: 2,
  savedAt: 2000,
  state: {
    apiConfig: { profiles: [{ id: 'local-api', key: 'local-key', model: 'gpt-local' }], activeProfileId: 'local-api' },
    contactsExtra: [
      { id: 'local-contact', name: 'Local', persona: 'local persona', worldBooks: ['local-wb'] },
      { id: 'shared', name: 'Shared Local', persona: 'new persona', wxid: 'shared' },
    ],
    worldBooks: { 'local-wb': { id: 'local-wb', name: 'Local WB', content: 'local lore' } },
    removedPlugins: ['old-plugin'],
    activePlugins: ['local-plugin'],
    moments: [{ id: 'local-moment', text: 'local' }],
  },
  assets: {
    contacts: [{ id: 'local-contact', avatar: 'local-avatar', cover: '' }],
    widgetCustom: { localPlugin: { img: 'local-plugin-img' } },
    appIconImgs: [{ id: 'local-app', img: 'local-app-img' }],
    lockWp: { img: 'local-lock' },
    homeWp: {},
    stickers: [{ type: 'image', value: 'local-sticker', tag: 'local' }],
  },
  chats: [
    { id: 'local-contact', seed: [{ ts: 1, text: 'local message', mine: true }] },
    { id: 'shared', persona: 'new persona', seed: [{ ts: 3, text: 'new message', mine: true }] },
  ],
};

const remote = {
  schemaVersion: 2,
  savedAt: 1000,
  state: {
    apiConfig: { profiles: [{ id: 'remote-api', key: 'remote-key', model: 'gpt-remote' }], activeProfileId: 'remote-api' },
    contactsExtra: [
      { id: 'remote-contact', name: 'Remote', persona: 'remote persona', worldBooks: ['remote-wb'] },
      { id: 'shared', name: 'Shared Remote', persona: 'old persona', cover: 'remote-cover' },
    ],
    worldBooks: { 'remote-wb': { id: 'remote-wb', name: 'Remote WB', content: 'remote lore' } },
    removedPlugins: ['remote-removed'],
    activePlugins: ['remote-plugin'],
    moments: [{ id: 'remote-moment', text: 'remote' }],
  },
  assets: {
    contacts: [{ id: 'remote-contact', avatar: 'remote-avatar', cover: 'remote-cover' }, { id: 'shared', avatar: 'shared-avatar' }],
    widgetCustom: { remotePlugin: { img: 'remote-plugin-img' } },
    appIconImgs: [{ id: 'remote-app', img: 'remote-app-img' }],
    lockWp: {},
    homeWp: { img: 'remote-home' },
    stickers: [{ type: 'image', value: 'remote-sticker', tag: 'remote' }],
  },
  chats: [
    { id: 'remote-contact', seed: [{ ts: 2, text: 'remote message', mine: false }] },
    { id: 'shared', cover: 'remote-cover', seed: [{ ts: 2, text: 'old message', mine: false }] },
  ],
};

const merged = context.cloudMergeSnapshotPayloads(local, remote, { preferLocal: true });

assert(merged !== local && merged !== remote, 'merge must return a cloned payload');
assert(merged.savedAt >= local.savedAt, 'merge must keep newest local save timestamp');
assert(merged.state.contactsExtra.some((c) => c.id === 'local-contact'), 'merge must preserve local-only contact');
assert(merged.state.contactsExtra.some((c) => c.id === 'remote-contact'), 'merge must preserve remote-only contact');
assert(merged.state.contactsExtra.find((c) => c.id === 'shared').persona === 'new persona', 'merge must prefer local contact edits for shared contacts');
assert(merged.chats.some((c) => c.id === 'local-contact'), 'merge must preserve local-only chat');
assert(merged.chats.some((c) => c.id === 'remote-contact'), 'merge must preserve remote-only chat');
assert(merged.chats.find((c) => c.id === 'shared').seed.length === 2, 'merge must union chat messages for shared contact');
assert(merged.assets.contacts.some((c) => c.id === 'remote-contact' && c.avatar === 'remote-avatar'), 'merge must preserve remote contact images');
assert(merged.assets.contacts.some((c) => c.id === 'local-contact' && c.avatar === 'local-avatar'), 'merge must preserve local contact images');
assert(merged.assets.widgetCustom.localPlugin && merged.assets.widgetCustom.remotePlugin, 'merge must union plugin/custom widget images');
assert(merged.assets.appIconImgs.some((i) => i.id === 'local-app') && merged.assets.appIconImgs.some((i) => i.id === 'remote-app'), 'merge must union app icon images');
assert(merged.assets.lockWp.img === 'local-lock', 'merge must preserve local lock wallpaper');
assert(merged.assets.homeWp.img === 'remote-home', 'merge must preserve remote home wallpaper when local is empty');
assert(merged.assets.stickers.some((s) => s.value === 'local-sticker') && merged.assets.stickers.some((s) => s.value === 'remote-sticker'), 'merge must union stickers');
assert(merged.state.worldBooks['local-wb'] && merged.state.worldBooks['remote-wb'], 'merge must union world books');
assert(merged.state.activePlugins.includes('local-plugin') && merged.state.activePlugins.includes('remote-plugin'), 'merge must union active plugins');
assert(merged.state.removedPlugins.includes('old-plugin') && merged.state.removedPlugins.includes('remote-removed'), 'merge must union removed plugins');
assert(merged.state.apiConfig.profiles.some((p) => p.id === 'local-api') && merged.state.apiConfig.profiles.some((p) => p.id === 'remote-api'), 'merge must preserve both API profiles');

console.log('PASS: cloud merge protection preserves local and remote user data');
