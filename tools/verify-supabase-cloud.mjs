import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exit(1);
  }
}

const html = read('index.html');
const cloud = read('js/main/core/08-cloud-sync.js');
const config = read('js/main/core/08a-supabase-config.js');
const sql = read('supabase_fated_cloud.sql');

assert(/@supabase\/supabase-js@2/.test(html), 'index.html must load Supabase SDK');
assert(/08a-supabase-config\.js\?v=20260802-supabase/.test(html), 'index.html must load Supabase config before cloud sync');
assert(/08-cloud-sync\.js\?v=20260802-supabase/.test(html), 'index.html must cache-bust Supabase cloud sync');
assert(/FATED_SUPABASE_CONFIG/.test(config), 'Supabase config file must expose FATED_SUPABASE_CONFIG');
assert(/function cloudSupabaseClient\(/.test(cloud), 'cloud sync must create Supabase client');
assert(/auth\.getSession\(/.test(cloud), 'cloud sync must read long-lived Supabase session');
assert(/auth\.signInWithPassword\(/.test(cloud), 'cloud sync must sign in through Supabase Auth');
assert(/auth\.signUp\(/.test(cloud), 'cloud sync must register through Supabase Auth');
assert(/redeem_fated_invite/.test(cloud), 'cloud sync must validate invite code through Supabase RPC');
assert(/from\('fated_snapshots'\)/.test(cloud), 'cloud sync must use fated_snapshots table');
assert(/storage\.from\(cfg\.assetBucket\)\.upload/.test(cloud), 'cloud sync must upload assets to Supabase Storage');
assert(!/cloudApi\('\/api\/(auth|sync|assets)/.test(cloud), 'cloud sync must not call old Cloudflare auth/sync/assets endpoints');
assert(/create table if not exists public\.fated_snapshots/.test(sql), 'SQL must create fated_snapshots');
assert(/create policy "fated snapshots own select"/.test(sql), 'SQL must protect snapshots with RLS');
assert(/insert into storage\.buckets/.test(sql), 'SQL must create Storage bucket');

console.log('PASS: Supabase cloud persistence wiring is present');
